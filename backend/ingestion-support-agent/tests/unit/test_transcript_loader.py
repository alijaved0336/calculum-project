from infrastructure.document_loader.factory import create_loader


def test_transcript_loader_pages_have_timestamps(tmp_path):
    p = tmp_path / "t.vtt"
    p.write_text("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello\n", encoding="utf-8")
    pages = list(create_loader(p).load(p))
    assert pages
    assert pages[0].content == "Hello"
    assert pages[0].metadata["start_ms"] == 1000
    assert pages[0].metadata["end_ms"] == 3000


def test_transcript_loader_multiple_cues(tmp_path):
    p = tmp_path / "t.srt"
    p.write_text(
        "1\n00:00:01,000 --> 00:00:02,000\nOne\n\n2\n00:00:02,000 --> 00:00:04,000\nTwo\n",
        encoding="utf-8",
    )
    pages = list(create_loader(p).load(p))
    assert [pg.content for pg in pages] == ["One", "Two"]
    assert pages[1].metadata["end_ms"] == 4000
