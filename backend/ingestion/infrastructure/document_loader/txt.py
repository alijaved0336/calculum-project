from __future__ import annotations
from pathlib import Path
from domain.entities.ingestion import Page
from domain.ports.document_loader import DocumentLoaderPort

class LangChainTxtLoaderAdapter(DocumentLoaderPort):
    """Load plain-text files with TextLoader — synthesizes pseudo-pages."""

    def load(self, file_path: Path) -> list[Page]:
        from langchain_community.document_loaders import TextLoader

        docs = TextLoader(str(file_path), autodetect_encoding=True).load()
        full_text = "\n\n".join(d.page_content for d in docs)
        return [Page(
            page_number=1,
            content=full_text,
            has_table=False,
            source_file=str(file_path),
            metadata={"page_number": 1},
        )]

    def supported_extensions(self) -> set[str]:
        return {".txt"}
