from __future__ import annotations
from pathlib import Path
from domain.entities.ingestion import Page
from domain.ports.document_loader import DocumentLoaderPort
from .utils import split_pseudo_pages

class LangChainDocLoaderAdapter(DocumentLoaderPort):
    """Load legacy .doc files with Unstructured – synthesizes pseudo-pages."""

    def load(self, file_path: Path) -> list[Page]:
        from langchain_community.document_loaders import UnstructuredWordDocumentLoader

        docs = UnstructuredWordDocumentLoader(str(file_path), mode="elements").load()
        full_text = "\n\n".join(d.page_content for d in docs)
        return split_pseudo_pages(full_text, str(file_path), {})

    def supported_extensions(self) -> set[str]:
        return {".doc"}
