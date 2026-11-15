from __future__ import annotations
from pathlib import Path
from domain.ports.document_loader import DocumentLoaderPort
from .pdf import LangChainPDFLoaderAdapter
from .docx import LangChainDocxLoaderAdapter
from .legacy_doc import LangChainDocLoaderAdapter
from .txt import LangChainTxtLoaderAdapter

_REGISTRY: dict[str, DocumentLoaderPort] = {
    ".pdf": LangChainPDFLoaderAdapter(),
    ".docx": LangChainDocxLoaderAdapter(),
    ".doc": LangChainDocLoaderAdapter(),
    ".txt": LangChainTxtLoaderAdapter(),
}

def create_loader(file_path: Path) -> DocumentLoaderPort:
    """Return the correct DocumentLoaderPort for *file_path* based on its extension."""
    ext = file_path.suffix.lower()
    loader = _REGISTRY.get(ext)
    if loader is None:
        raise ValueError(f"Unsupported file extension {ext!r}. Supported: {sorted(_REGISTRY)}")
    return loader
