from __future__ import annotations
import logging
import re
from domain.entities.ingestion import Chunk, ChunkType, Page
from domain.ports.chunking import ChunkerPort
from infrastructure.chunking.utils import link_sequential, stable_chunk_id, merge_small_chunks

logger = logging.getLogger(__name__)


class IngestionChunkerAdapter(ChunkerPort):

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 100,
        strategy: str = "recursive",
        semantic_breakpoint_percentile: int = 85,
        langchain_embeddings=None,
        length_function=None,
        min_chunk_size: int = 20,
        transcript_chunk_ms: int = 40_000,
        transcript_overlap_cues: int = 1,
    ) -> None:
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._strategy = strategy
        self._min_chunk_size = min_chunk_size
        self._length_function = length_function
        self._transcript_chunk_ms = transcript_chunk_ms
        self._transcript_overlap_cues = transcript_overlap_cues
        kwargs = {"length_function": length_function} if length_function else {}
        self._table_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size, chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""],
            **kwargs,
        )
        self._narrative_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size, chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", " ", ""],
            keep_separator="end",
            **kwargs,
        )

        self._semantic_splitter = None
        if strategy == "hybrid":
            if langchain_embeddings is None:
                raise ValueError("langchain_embeddings required for strategy='hybrid'")
            from langchain_experimental.text_splitter import SemanticChunker
            self._semantic_splitter = SemanticChunker(
                embeddings=langchain_embeddings,
                breakpoint_threshold_type="percentile",
                breakpoint_threshold_amount=semantic_breakpoint_percentile,
            )

    def chunk_pages(self, pages: list[Page], file_id: str) -> list[Chunk]:
        """Chunk a group of buffered pages as one unit so small/sparse pages are
        merged up to ``chunk_size`` instead of becoming one tiny chunk each.
        Resulting chunks carry the page numbers of every page that contributed."""
        if not pages:
            return []
        # Transcript pages carry per-cue timing. Pack whole cues into chunks so each
        # chunk's start_ms/end_ms exactly brackets the cues it contains — never concat
        # into a blob and re-split, which would desync the span from the text.
        if all("start_ms" in p.metadata and "end_ms" in p.metadata for p in pages):
            return self._chunk_cues(pages, file_id)
        combined_metadata = {**pages[0].metadata}
        # For transcript pages each carries a cue time span; a chunk built from a
        # group of cues spans from the earliest start to the latest end so the
        # video clip covers the whole answer, not just the first cue.
        starts = [p.metadata["start_ms"] for p in pages if "start_ms" in p.metadata]
        ends = [p.metadata["end_ms"] for p in pages if "end_ms" in p.metadata]
        if starts and ends:
            combined_metadata["start_ms"] = min(starts)
            combined_metadata["end_ms"] = max(ends)
        combined = Page(
            page_number=pages[0].page_number,
            content="\n\n".join(p.content for p in pages),
            has_table=any(p.has_table for p in pages),
            source_file=pages[0].source_file,
            metadata=combined_metadata,
        )
        page_numbers = [p.page_number for p in pages]
        chunks = self._chunk_page(combined, file_id, page_numbers)
        link_sequential(chunks)
        return chunks

    def _chunk_cues(self, pages: list[Page], file_id: str) -> list[Chunk]:
        """Pack whole transcript cues into chunks bounded by a wall-clock window
        (``transcript_chunk_ms``) or the token cap (``chunk_size``), whichever comes
        first, with a whole-cue overlap between neighbours. Each chunk's start_ms/end_ms
        is the exact min/max over its cues, so a retrieved clip's span is both accurate
        (matches the text) and tight (~window seconds, not the whole group)."""
        measure = self._length_function or len
        buckets: list[list[Page]] = []
        bucket: list[Page] = []
        bucket_text = ""
        for page in pages:
            candidate = f"{bucket_text} {page.content}".strip() if bucket_text else page.content
            # Flush when adding this cue would exceed either budget, but never before the
            # bucket holds enough text to stand on its own (min_chunk_size).
            span_ms = page.metadata["end_ms"] - bucket[0].metadata["start_ms"] if bucket else 0
            over_budget = span_ms > self._transcript_chunk_ms or measure(candidate) > self.chunk_size
            if bucket and over_budget and measure(bucket_text) >= self._min_chunk_size:
                buckets.append(bucket)
                bucket = self._overlap_seed(bucket)  # seed next chunk with trailing cue(s)
                bucket_text = " ".join(p.content for p in bucket)
            bucket.append(page)
            bucket_text = f"{bucket_text} {page.content}".strip() if bucket_text else page.content
        if bucket:
            buckets.append(bucket)

        # Fold a too-small trailing bucket into the previous one. Its overlap cues are the
        # same Page objects as the previous bucket's tail, so union by identity to avoid
        # duplicating a cue; spans then recombine via the min/max in _build_cue_chunk.
        if len(buckets) >= 2 and measure(" ".join(p.content for p in buckets[-1])) < self._min_chunk_size:
            tail = buckets.pop()
            seen = {id(p) for p in buckets[-1]}
            buckets[-1].extend(p for p in tail if id(p) not in seen)

        chunks = [self._build_cue_chunk(b, file_id) for b in buckets]
        link_sequential(chunks)
        return chunks

    def _overlap_seed(self, bucket: list[Page]) -> list[Page]:
        """The last ``transcript_overlap_cues`` cues of ``bucket`` to carry into the next
        chunk (never the whole bucket, so forward progress is guaranteed)."""
        n = min(self._transcript_overlap_cues, len(bucket) - 1)
        return bucket[-n:] if n > 0 else []

    def _build_cue_chunk(self, bucket: list[Page], file_id: str) -> Chunk:
        text = " ".join(p.content for p in bucket)
        page_numbers = [p.page_number for p in bucket]
        metadata = {
            **bucket[0].metadata,
            "start_ms": min(p.metadata["start_ms"] for p in bucket),
            "end_ms": max(p.metadata["end_ms"] for p in bucket),
        }
        return Chunk(
            id=stable_chunk_id(file_id, page_numbers, text),
            text=text, page_numbers=page_numbers,
            chunk_type=ChunkType.HYBRID, file_id=file_id, metadata=metadata,
        )

    def _chunk_page(self, page: Page, file_id: str, page_numbers: list[int]) -> list[Chunk]:
        if page.has_table:
            logger.info("chunker.table_detected pages=%s", page_numbers)
            return self._split_recursive(page, file_id, page_numbers, self._table_splitter, ChunkType.RECURSIVE)

        if self._strategy == "hybrid":
            return self._split_semantic(page, file_id, page_numbers)

        return self._split_recursive(page, file_id, page_numbers, self._narrative_splitter, ChunkType.RECURSIVE)

    def _split_recursive(self, page: Page, file_id: str, page_numbers: list[int], splitter, chunk_type: ChunkType) -> list[Chunk]:
        from langchain_core.documents import Document
        content = page.content
        if not page.has_table:
            content = content.replace('\r\n', '\n').replace('\r', '\n')
            content = re.sub(r'(?<![.!?\n])\n(?!\n)', ' ', content)
        doc = Document(page_content=content, metadata={})
        result: list[Chunk] = []
        for split_doc in splitter.split_documents([doc]):
            text = split_doc.page_content.strip()
            if not text:
                continue
            result.append(Chunk(
                id=stable_chunk_id(file_id, page_numbers, text),
                text=text, page_numbers=page_numbers,
                chunk_type=chunk_type, file_id=file_id, metadata={**page.metadata},
            ))
        return merge_small_chunks(result, self._min_chunk_size, self._length_function)

    def _split_semantic(self, page: Page, file_id: str, page_numbers: list[int]) -> list[Chunk]:
        texts = self._semantic_splitter.split_text(page.content)
        result: list[Chunk] = []
        for text in texts:
            text = text.strip()
            if not text:
                continue
            result.append(Chunk(
                id=stable_chunk_id(file_id, page_numbers, text),
                text=text, page_numbers=page_numbers,
                chunk_type=ChunkType.HYBRID, file_id=file_id, metadata={**page.metadata},
            ))
        return merge_small_chunks(result, self._min_chunk_size, self._length_function)
