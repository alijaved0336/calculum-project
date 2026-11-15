from application.agent.section_stream import SectionSplitter


def _run(text: str, chunk_size: int) -> dict[int, str]:
    """Feed `text` through the splitter in fixed-size chunks; return {section: joined text}."""
    sp = SectionSplitter()
    acc: dict[int, str] = {}
    pieces: list[tuple[int, str]] = []
    for i in range(0, len(text), chunk_size):
        pieces.extend(sp.feed(text[i : i + chunk_size]))
    pieces.extend(sp.flush())
    for idx, t in pieces:
        acc[idx] = acc.get(idx, "") + t
    return acc


def test_splits_two_sections_single_chunk():
    out = _run("@@S1@@Answer one.@@S2@@Answer two.", 999)
    assert out == {0: "Answer one.", 1: "Answer two."}


def test_marker_split_across_chunks_any_size():
    text = "@@S1@@first part here@@S2@@second part here@@S3@@third"
    # every chunk size must yield the same per-section text (markers stripped)
    for size in (1, 2, 3, 5, 7, 999):
        assert _run(text, size) == {
            0: "first part here",
            1: "second part here",
            2: "third",
        }, f"chunk size {size}"


def test_text_before_first_marker_stays_in_section_zero():
    out = _run("preamble @@S1@@real answer", 4)
    assert out == {0: "preamble real answer"}


def test_no_markers_whole_answer_is_section_zero():
    # model forgot the markers → don't lose the answer; it all belongs to section 0
    out = _run("just a plain answer with no markers", 3)
    assert out == {0: "just a plain answer with no markers"}


def test_at_sign_that_is_not_a_marker_is_kept():
    out = _run("@@S1@@email a@b and prices $5 @ noon", 3)
    assert out == {0: "email a@b and prices $5 @ noon"}
