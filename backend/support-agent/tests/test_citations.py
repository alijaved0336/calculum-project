from application.services.citations import (
    ViewerRedactionBuffer,
    hidden_rag_indices,
    merge_ranges,
    normalize_paren_timestamps,
    parse_cited_pages,
    parse_cited_ranges,
    redact_private_document_refs,
    strip_dangling_citation_artifacts,
    strip_stray_footnotes,
    strip_tagged_citation_wrappers,
)


def test_parse_bare_and_range_timestamps():
    ranges = parse_cited_ranges("intro [01:05] then [09:26–09:53] done")
    assert ranges == [(65000, 65000), (566000, 593000)]


def test_parse_handles_hyphen_and_hours():
    # HH:MM:SS with a plain hyphen separator.
    assert parse_cited_ranges("[1:00:00-1:00:05]") == [(3600000, 3605000)]


def test_parse_double_bracket_timestamps():
    # The model often wraps the prompt's [MM:SS–MM:SS] as [[1:01–1:06]].
    ranges = parse_cited_ranges("industry [[1:01–1:06]]. Groups [[5:08–5:13]].")
    assert ranges == [(61000, 66000), (308000, 313000)]


def test_merge_overlapping_and_touching():
    # [00:00-00:10] and [00:11-00:20] are within the 2s gap → one continuous range.
    merged = merge_ranges([(0, 10000), (11000, 20000)])
    assert merged == [(0, 20000)]


def test_merge_keeps_distinct_ranges():
    merged = merge_ranges([(0, 3000), (60000, 63000)])
    assert merged == [(0, 3000), (60000, 63000)]


def test_merge_sorts_first():
    merged = merge_ranges([(60000, 63000), (0, 3000)])
    assert merged == [(0, 3000), (60000, 63000)]


def test_merge_empty():
    assert merge_ranges([]) == []


def test_parse_cited_pages_bare_no_title():
    # The exact bug: the model cites a page without repeating the document title inline.
    assert parse_cited_pages("free up cash flow [p. 2–3].") == {2, 3}


def test_parse_cited_pages_with_title():
    assert parse_cited_pages("According to Concepts and Definitions, p. 2-3, this applies.") == {2, 3}


def test_parse_cited_pages_single_and_list():
    assert parse_cited_pages("see p. 1") == {1}
    assert parse_cited_pages("see pp. 1, 4") == {1, 4}


def test_parse_cited_pages_ignores_non_page_text():
    assert parse_cited_pages("no page citations here") == set()


def test_parse_cited_pages_ignores_words_ending_in_p():
    # A sentence ending in "app."/"setup."/"stop." followed by a number is prose, not a page
    # citation — matching it would attach a document the answer never cited.
    assert parse_cited_pages("Restart the app. 2 minutes later it reconnects.") == set()
    assert parse_cited_pages("Complete the setup. 2FA is required.") == set()
    assert parse_cited_pages("Then stop. 3 things remain.") == set()


def test_redact_mixed_docs_keeps_public_title():
    text = (
        "According to the Billing Guide, p. 3, fees apply. "
        "According to Internal Payroll Policy, p. 9, withhold tax."
    )
    hidden = [{"document_id": "d2", "title": "Internal Payroll Policy", "page_numbers": [9]}]
    visible = [{"document_id": "d1", "title": "Billing Guide", "page_numbers": [3]}]
    out = redact_private_document_refs(text, hidden, visible)
    assert "Internal Payroll Policy" not in out
    assert "Billing Guide" in out
    assert "p. 3" in out
    assert "p. 9" not in out
    assert "fees apply" in out
    assert "withhold tax" in out


def test_redact_according_to_long_title_without_page():
    text = "According to Internal Payroll Policy, withhold tax at source."
    hidden = [{"document_id": "d2", "title": "Internal Payroll Policy", "page_numbers": [9]}]
    out = redact_private_document_refs(text, hidden, [])
    assert "Internal Payroll Policy" not in out
    assert "withhold tax at source" in out


def test_redact_bare_page_unique_to_private():
    text = "You can free up cash flow [p. 2]."
    hidden = [{"document_id": "d2", "title": "Secret Runbook", "page_numbers": [2]}]
    visible = [{"document_id": "d1", "title": "Billing Guide", "page_numbers": [3]}]
    out = redact_private_document_refs(text, hidden, visible)
    assert "[p. 2]" not in out
    assert "p. 2" not in out
    assert "cash flow" in out


def test_redact_keeps_overlapping_page_cite():
    # Page 2 also belongs to a still-visible public doc — leave the bare cite.
    text = "See [p. 2] for details."
    hidden = [{"document_id": "d2", "title": "Secret Runbook", "page_numbers": [2]}]
    visible = [{"document_id": "d1", "title": "Billing Guide", "page_numbers": [2, 3]}]
    out = redact_private_document_refs(text, hidden, visible)
    assert "[p. 2]" in out


def test_redact_skips_short_title_without_page():
    text = "Follow this Guide when setting up."
    hidden = [{"document_id": "d2", "title": "Guide", "page_numbers": [1]}]
    out = redact_private_document_refs(text, hidden, [])
    assert "Guide" in out


def test_redact_strips_short_title_with_page():
    text = "According to Guide, p. 1, start here."
    hidden = [{"document_id": "d2", "title": "Guide", "page_numbers": [1]}]
    out = redact_private_document_refs(text, hidden, [])
    assert "Guide" not in out
    assert "start here" in out


def test_redact_empty_hidden_is_noop():
    text = "According to Billing Guide, p. 3, fees apply."
    assert redact_private_document_refs(text, [], [{"title": "Billing Guide"}]) == text


def test_redact_empty_text():
    assert redact_private_document_refs("", [{"title": "Secret Runbook"}], []) == ""


def test_redact_skips_empty_title():
    text = "See [p. 4] in the unnamed file."
    hidden = [{"document_id": "d2", "title": "", "page_numbers": [4]}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[p. 4]" not in out
    assert "unnamed file" in out


def test_redact_bracket_document_cite_keeps_timestamp():
    # The form the model actually emits: a timestamp and a document packed into one bracket.
    text = (
        'These rules can usually be overridden by a contract '
        '[23:50–24:05, Document "Concepts and Definitions" ]. '
        'Strict regulations carry penalties '
        '[Document "Concepts and Definitions" ]. '
        'Do not bring up rounding unless necessary '
        '[Document "Concepts and Definitions" ].'
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions", "page_numbers": [1]}]
    out = redact_private_document_refs(text, hidden, [])
    assert "Concepts and Definitions" not in out
    assert 'Document "' not in out
    assert "[Document" not in out
    assert "[23:50–24:05]" in out
    assert "overridden by a contract" in out
    assert "Strict regulations carry penalties" in out
    assert "rounding unless necessary" in out


def test_redact_bracket_document_cite_leaves_unrelated_timestamps():
    text = (
        "Regulatory terms can be activated within the platform [08:30–09:09]. "
        'See also [Document "Concepts and Definitions"].'
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[08:30–09:09]" in out
    assert "Concepts and Definitions" not in out
    assert "[Document" not in out


def test_redact_short_title_inside_document_bracket():
    # Short titles are still stripped when they appear as a [Document "…"] cite.
    text = 'Fees apply [Document "Guide"]. Follow this Guide when setting up.'
    hidden = [{"document_id": "d2", "title": "Guide"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[Document" not in out
    assert "Follow this Guide when setting up" in out


def test_strip_dangling_citation_artifacts_bare_of():
    # The exact production bug: a stray "[of]" left over with no citation data at all.
    text = "...even in different regions or product categories [of]. Next sentence [of]."
    out = strip_dangling_citation_artifacts(text)
    assert "[of]" not in out
    assert out == "...even in different regions or product categories. Next sentence."


def test_normalize_paren_timestamps_rewrites_to_brackets():
    # Production bug: the model drifts off the prompted "[MM:SS]" shape into a parenthesised
    # look-alike, which reconciliation (bracket-only) can't see at all.
    text = (
        "Used to justify extending payment terms across the portfolio (20:26–21:05). "
        "Also standardizes across parent suppliers (06:17–06:54), (16:03–16:40)."
    )
    out = normalize_paren_timestamps(text)
    assert "[20:26–21:05]" in out
    assert "[06:17–06:54]" in out
    assert "[16:03–16:40]" in out
    assert "(20:26–21:05)" not in out


def test_normalize_paren_timestamps_bare_single_timestamp():
    assert normalize_paren_timestamps("See (08:30) for details.") == "See [08:30] for details."


def test_normalize_paren_timestamps_leaves_ordinary_parens_alone():
    text = "This is a corporate initiative (not a hard rule) to align suppliers."
    assert normalize_paren_timestamps(text) == text


def test_normalize_paren_timestamps_empty_text():
    assert normalize_paren_timestamps("") == ""
    assert normalize_paren_timestamps(None) == ""


def test_strip_dangling_citation_artifacts_bare_dash():
    # Production bug: the model has no exact moment to cite for a claim and emits a bare
    # placeholder dash instead of omitting the citation entirely.
    text = (
        "This serves as a starting point [— ]. It can support your position [–]. "
        "This is the only relevant scenario [-]."
    )
    out = strip_dangling_citation_artifacts(text)
    assert "[— ]" not in out
    assert "[–]" not in out
    assert "[-]" not in out
    assert out == (
        "This serves as a starting point. It can support your position. "
        "This is the only relevant scenario."
    )


def test_strip_tagged_citation_wrappers_video_keeps_timestamp_drops_title():
    # Production bug: the model invents "<vid: Title — [MM:SS]>" instead of a bare timestamp.
    text = (
        "Without it, terms are hard to manage "
        "<vid: Supplier Entity Card: Opportunity & Corporate Tree Tab — [20:58–21:34]>. "
        "The platform aligns these into buckets <vid: Setup — [16:06–16:46]>."
    )
    out = strip_tagged_citation_wrappers(text)
    assert "Supplier Entity Card" not in out
    assert "<vid:" not in out
    assert "[20:58–21:34]" in out
    assert "[16:06–16:46]" in out


def test_strip_tagged_citation_wrappers_doc_always_dropped():
    # "<doc: — >" (no citation available) and "<doc: Title>" (a real title) must both vanish —
    # this tag shape is never vetted by the private-document redaction pass, so any title
    # surviving here risks leaking a hidden document.
    text = (
        "This can be adjusted in the platform setup <doc: — >. "
        "According to the setup guide <doc: Concepts and Definitions>, rounding applies."
    )
    out = strip_tagged_citation_wrappers(text)
    assert "<doc:" not in out
    assert "Concepts and Definitions" not in out
    assert "This can be adjusted in the platform setup." in out


def test_strip_tagged_citation_wrappers_mixed_adjacent_tags():
    text = "Aligns terms efficiently <vid: Setup — [16:06–16:46]><doc: — >."
    out = strip_tagged_citation_wrappers(text)
    assert out == "Aligns terms efficiently [16:06–16:46]."


def test_strip_tagged_citation_wrappers_empty_text():
    assert strip_tagged_citation_wrappers("") == ""
    assert strip_tagged_citation_wrappers(None) == ""


def test_strip_dangling_citation_artifacts_according_to_variants():
    assert strip_dangling_citation_artifacts("Strategy noted [According to].") == "Strategy noted."
    assert strip_dangling_citation_artifacts("Strategy noted [According to the].") == "Strategy noted."
    assert strip_dangling_citation_artifacts("Strategy noted [per].") == "Strategy noted."
    assert strip_dangling_citation_artifacts("Strategy noted [per the].") == "Strategy noted."


def test_strip_dangling_citation_artifacts_keeps_real_citations():
    text = 'See [16:03–17:15]. Also [p. 2]. Also [Document "Guide"]. Word "of" stays in prose.'
    out = strip_dangling_citation_artifacts(text)
    assert out == text


def test_strip_dangling_citation_artifacts_empty_text():
    assert strip_dangling_citation_artifacts("") == ""
    assert strip_dangling_citation_artifacts(None) == ""


def test_redact_leaves_no_dangling_of_after_title_stripped():
    # The model attributes a hidden doc as "[of <title>]" — stripping the title must not
    # leave a bare "[of]" behind.
    text = "This applies broadly [of Concepts and Definitions]. It still works elsewhere."
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions", "page_numbers": [1]}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[of]" not in out
    assert "Concepts and Definitions" not in out
    assert "This applies broadly" in out
    assert "It still works elsewhere" in out


def test_redact_leaves_no_dangling_according_to_after_title_stripped():
    text = "This is a negotiation tactic [According to Concepts and Definitions]."
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions", "page_numbers": [1]}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[According to]" not in out
    assert "Concepts and Definitions" not in out
    assert "This is a negotiation tactic" in out


def test_redact_drops_rag_index_footnote():
    # RAG labels chunks ``### [5] document Concepts and Definitions``. The model cites that
    # as a dangling ``[5]`` after we strip the title — drop it, keep video timestamps.
    # Without context_text (replay fallback), any bare [N] is stripped when a doc is hidden.
    text = (
        "Regulatory terms identify whether any regulations apply to the supplier [5]. "
        "Government recommendations can be overridden [5]. "
        "Activate strategies on the Buyer Standard Group tab [08:30–09:09]."
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[5]" not in out
    assert "Concepts and Definitions" not in out
    assert "[08:30–09:09]" in out
    assert "overridden" in out


def test_strip_stray_footnotes_bare_chunk_indices():
    # Production bug: the model copies the RAG chunk index (### [2] / ### [5]) instead of a
    # real citation, for a fully public answer with no hidden docs involved at all.
    text = (
        "It checks if a subsidiary already accepts longer terms [2][5]. "
        "It suggests aligning to the highest terms found [5]. "
        "See the overview [16:03–16:40]."
    )
    out = strip_stray_footnotes(text)
    assert "[2]" not in out
    assert "[5]" not in out
    assert "[16:03–16:40]" in out
    assert "It checks if a subsidiary already accepts longer terms" in out


def test_strip_stray_footnotes_keeps_timestamps_and_empty_text():
    assert strip_stray_footnotes("[08:30–09:09]") == "[08:30–09:09]"
    assert strip_stray_footnotes("") == ""
    assert strip_stray_footnotes(None) == ""


def test_redact_drops_bare_footnote_with_no_hidden_docs():
    # No hidden docs at all — footnote stripping must not depend on any privacy condition.
    text = "It suggests aligning to the highest terms found [5]. See [16:03–16:40]."
    out = redact_private_document_refs(text, [], [])
    assert out == text  # no-op: redact_private_document_refs itself is privacy-only …


def test_hidden_rag_indices_from_context():
    ctx = (
        "### [1] video Buyer Standards — [01:04–01:06]\n"
        "### [3] document Billing Guide — p. 3, 4\n"
        "### [5] document Concepts and Definitions — p. 1\n"
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    assert hidden_rag_indices(ctx, hidden) == {5}
    assert hidden_rag_indices(ctx, []) == set()
    assert hidden_rag_indices(None, hidden) == set()


def test_redact_drops_all_bare_footnotes_public_and_hidden():
    # A bare [N] is a stray RAG chunk index, never resolvable by any viewer — so it is dropped
    # unconditionally now, whether it labeled a public or a hidden document.
    text = (
        "Fees apply per the public policy [3]. "
        "Payroll withholding is internal [5]. "
        "See the walkthrough [08:30–09:09]."
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    visible = [{"document_id": "d1", "title": "Billing Guide", "page_numbers": [3]}]
    ctx = (
        "### [3] document Billing Guide — p. 3\n"
        "### [5] document Concepts and Definitions — p. 1\n"
    )
    out = redact_private_document_refs(text, hidden, visible, context_text=ctx)
    assert "[3]" not in out
    assert "[5]" not in out
    assert "[08:30–09:09]" in out
    assert "Fees apply" in out
    assert "Payroll withholding is internal" in out


def test_redact_selective_footnote_with_matching_context():
    text = (
        "Regulatory terms identify whether any regulations apply [5]. "
        "Activate strategies [08:30–09:09]."
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    ctx = "### [5] document Concepts and Definitions — p. 1\nregulations\n"
    out = redact_private_document_refs(text, hidden, [], context_text=ctx)
    assert "[5]" not in out
    assert "[08:30–09:09]" in out


def test_redact_drops_index_left_inside_document_bracket():
    # ``[5, Document "Title"]`` must not collapse to leftover ``[5]``.
    text = 'Penalties for non-compliance [5, Document "Concepts and Definitions"].'
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[5]" not in out
    assert "Concepts and Definitions" not in out
    assert "Penalties for non-compliance" in out


def test_redact_angle_bracket_title_leaves_no_wrappers():
    # Prompt example is ``According to <title>``; the model copies that wrapping.
    # Stripping only the words left ``According to the <> guide`` and a trailing ``<>``.
    text = (
        "According to the <Concepts and Definitions> guide, regulatory terms are part "
        "of broader negotiations where buyers should ensure that their target terms "
        "do not exceed strict regulations. It is also advised not to bring up "
        "harmonization groups or rounding concepts during discussions unless necessary "
        "[08:30–09:09] <Concepts and Definitions>."
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "Concepts and Definitions" not in out
    assert "<>" not in out
    assert "According to" not in out
    assert "[08:30–09:09]" in out
    assert "do not exceed strict regulations" in out
    assert "harmonization groups" in out


def test_redact_cleans_leftover_empty_angle_wrappers():
    # If a prior pass ate the title but left the prompt's ``<>`` wrappers.
    text = (
        "According to the <> guide, regulatory terms are part of broader negotiations. "
        "Do not bring up rounding unless necessary [08:30–09:09] <>."
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "<>" not in out
    assert "According to" not in out
    assert "[08:30–09:09]" in out
    assert "broader negotiations" in out


def test_redact_mixed_bracket_keeps_timestamp_without_leading_semicolon():
    # Model packs the title and timestamp as ``[<Title>; MM:SS–MM:SS]``. Stripping the
    # title must not leave ``[; 10:41–11:19]`` or a bare ``[;]``.
    text = (
        "Comparing companies in the same industry ensures the metric stays relevant; "
        "otherwise the number may not provide accurate insights "
        '[<Concepts and Definitions>; 10:41–11:19]. A large DSO can indicate longer terms.'
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "Concepts and Definitions" not in out
    assert "[;" not in out
    assert "[;]" not in out
    assert "[10:41–11:19]" in out
    assert "A large DSO can indicate longer terms" in out


def test_redact_cleans_already_stripped_semicolon_timestamp():
    text = (
        "otherwise, the number may not provide accurate insights [; 10:41–11:19]. "
        "A large DSO can indicate that suppliers accept longer terms [;]."
    )
    hidden = [{"document_id": "d2", "title": "Concepts and Definitions"}]
    out = redact_private_document_refs(text, hidden, [])
    assert "[;" not in out
    assert "[;]" not in out
    assert "[10:41–11:19]" in out


def test_redaction_buffer_streams_prose_before_private_cite():
    hidden = [{"document_id": "d2", "title": "Internal Payroll Policy"}]
    visible = [{"document_id": "d1", "title": "Billing Guide", "page_numbers": [3]}]
    buf = ViewerRedactionBuffer(hidden, visible)
    public = (
        "Days Sales Outstanding measures collection speed after a credit sale. "
        "According to the Billing Guide, p. 3, fees apply. "
        "It is used widely in supplier negotiations. "
    )
    early = ""
    for word in public.split(" "):
        early += buf.feed(word + " ")
    assert "fees apply" in early
    assert "Internal Payroll Policy" not in early

    private = "According to Internal Payroll Policy, p. 9, withhold tax. Done."
    streamed = early
    for word in private.split(" "):
        streamed += buf.feed(word + " ")
    streamed += buf.flush()
    assert "Internal Payroll Policy" not in streamed
    assert "p. 9" not in streamed
    assert "Billing Guide" in streamed
    assert "withhold tax" in streamed
