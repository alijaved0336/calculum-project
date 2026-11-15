from __future__ import annotations
from pathlib import Path

from domain.ports.document_loader import DocumentLoaderPort

from .docx import LangChainDocxLoaderAdapter
from .legacy_doc import LangChainDocLoaderAdapter
from .pdf import LangChainPDFLoaderAdapter
from .transcript import TranscriptLoaderAdapter
from .txt import LangChainTxtLoaderAdapter

_transcript_loader = TranscriptLoaderAdapter()
_txt_loader = LangChainTxtLoaderAdapter()

# Single registry for both media types. Video transcripts (timestamped) and general
# documents (PDF/DOCX/TXT) flow through the same pipeline; the source is tagged via
# `chunk_source` at ingest time, not by which loader ran.
_REGISTRY: dict[str, DocumentLoaderPort] = {
    # general documents
    ".pdf": LangChainPDFLoaderAdapter(),
    ".docx": LangChainDocxLoaderAdapter(),
    ".doc": LangChainDocLoaderAdapter(),
    ".txt": _txt_loader,
    ".md": _txt_loader,
    # video transcripts (timestamped)
    ".vtt": _transcript_loader,
    ".srt": _transcript_loader,
    ".json": _transcript_loader,
}


def create_loader(file_path: Path) -> DocumentLoaderPort:
    """Return the correct DocumentLoaderPort for *file_path* based on its extension."""
    ext = file_path.suffix.lower()
    loader = _REGISTRY.get(ext)
    if loader is None:
        raise ValueError(f"Unsupported file extension {ext!r}. Supported: {sorted(_REGISTRY)}")
    return loader
