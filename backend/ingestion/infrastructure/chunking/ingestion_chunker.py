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
    ) -> None:
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        self.chunk_size = chunk_size
        self._strategy = strategy
        self._min_chunk_size = min_chunk_size
        self._length_function = length_function
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
        combined = Page(
            page_number=pages[0].page_number,
            content="\n\n".join(p.content for p in pages),
            has_table=any(p.has_table for p in pages),
            source_file=pages[0].source_file,
            metadata={**pages[0].metadata},
        )
        page_numbers = [p.page_number for p in pages]
        chunks = self._chunk_page(combined, file_id, page_numbers)
        link_sequential(chunks)
        return chunks

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
