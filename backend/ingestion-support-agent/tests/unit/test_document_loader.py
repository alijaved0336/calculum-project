from pathlib import Path

import pytest

from infrastructure.document_loader.factory import create_loader


def test_txt_loader_pages_have_no_timestamps(tmp_path):
    p = tmp_path / "d.txt"
    p.write_text("hello world\nsecond line here")
    pages = list(create_loader(p).load(p))
    assert pages and "hello world" in pages[0].content
    # documents carry page_number, never transcript timestamps
    assert "start_ms" not in pages[0].metadata and "end_ms" not in pages[0].metadata
    assert pages[0].metadata.get("page_number") == 1


def test_factory_maps_document_and_transcript_extensions():
    from infrastructure.document_loader.docx import LangChainDocxLoaderAdapter
    from infrastructure.document_loader.pdf import LangChainPDFLoaderAdapter
    from infrastructure.document_loader.transcript import TranscriptLoaderAdapter

    assert isinstance(create_loader(Path("a.pdf")), LangChainPDFLoaderAdapter)
    assert isinstance(create_loader(Path("a.docx")), LangChainDocxLoaderAdapter)
    # .md routes to the same loader as .txt
    assert type(create_loader(Path("a.md"))) is type(create_loader(Path("a.txt")))
    # transcript loaders still resolve
    assert isinstance(create_loader(Path("a.vtt")), TranscriptLoaderAdapter)
    assert isinstance(create_loader(Path("a.json")), TranscriptLoaderAdapter)


def test_unsupported_extension_raises():
    with pytest.raises(ValueError):
        create_loader(Path("a.xyz"))
