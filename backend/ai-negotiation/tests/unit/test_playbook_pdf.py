"""Playbook PDF matches the in-app preview: markdown, badges, one page."""
from __future__ import annotations

from api.schemas.negotiation import PlaybookSectionPayload, SavePlaybookRequest
from utils.playbook_pdf import (
    _flag_emoji_to_iso,
    _inline_html,
    _with_flag_images,
    build_playbook_html,
)

try:
    from weasyprint import HTML
except (ModuleNotFoundError, OSError):  # pragma: no cover
    HTML = None


def _sample_body() -> SavePlaybookRequest:
    return SavePlaybookRequest(
        title="Negotiation Playbook",
        subtitle='Term Extension · "U.S. Foodservice, Inc" (US United States)',
        supplier_name="U.S. Foodservice, Inc",
        country_code="US",
        footer="Drafted from supplier facts, spend lines, and approved plays.",
        raw="",
        sections=[
            PlaybookSectionPayload(
                index=1,
                title="Opening Position",
                subtitle="Data-justified first ask",
                summary=(
                    "Open at **80 days**, supported by the established precedent "
                    "within our own relationship, with the objective of settling at "
                    "**75 days**. This target sits just inside that precedent, so "
                    "conceding from the anchor to the target is planned, defensible "
                    "movement — not an arbitrary number."
                ),
                bullets=[],
            ),
            PlaybookSectionPayload(
                index=2,
                title="Target Outcome",
                subtitle="Intended landing zone",
                summary="Land at the relationship precedent, with room to concede from the open.",
                bullets=[
                    "**Contractual Terms**: **34** days",
                    "**Opportunity**: **75** days",
                    "**BATNA**: **60** days",
                ],
            ),
            PlaybookSectionPayload(
                index=3,
                title="BATNA",
                subtitle="Best Alternative To a Negotiated Agreement",
                summary="Moderate strength given comparable suppliers in this category.",
                bullets=[
                    "**Strength**: Moderate — balanced leverage.",
                    "**Primary alternative**: Steer future sourcing toward better-term suppliers.",
                    "**Why**: Mid-tier spend with a workable current term.",
                    "**Risks**: Relationship strain if we walk abruptly.",
                    "**Recommendation**: Negotiate to the floor, then execute.",
                    "**Confidence**: Medium — alternatives are not named in the brief.",
                ],
            ),
            PlaybookSectionPayload(
                index=4,
                title="Key Arguments",
                subtitle="What to put on the table",
                summary="Lead with the relationship precedent; keep internal cash-flow off the table.",
                bullets=[
                    "**Parent / Supplier Max — 80 days**",
                    '*How to pitch:* "Align to the term already proven on this account."',
                    "**Industry Region Standard — 35 days**",
                    '*How to pitch:* "The proposed terms match broader industry practice."',
                    "**Cost Impact — 0.77% of spend**",
                    '*How to pitch:* "A limited cost relative to the overall relationship."',
                    "**Client-Supplier Relationship — High strength**",
                    '*How to pitch:* "Aligning terms supports continued collaboration."',
                ],
            ),
            PlaybookSectionPayload(
                index=5,
                title="Objections",
                subtitle="Likely pushback and counters",
                summary="Expect cash-flow and working-capital pushback. Do not trade the floor.",
                bullets=[
                    "**Cash flow**: Counter with the proven 75-day precedent.",
                    "**Working capital**: Offer a staged move, never below the BATNA.",
                ],
            ),
            PlaybookSectionPayload(
                index=6,
                title="Concessions",
                subtitle="Planned give-and-take",
                summary="Concede only in planned 5-day steps from the open to the target.",
                bullets=[
                    "Step 1 — hold **80 days** through the first round.",
                    "Step 2 — move to **75 days** if they bring a concrete constraint.",
                    "Do not go below **60 days**.",
                ],
            ),
        ],
    )


def test_inline_html_renders_markdown_bold():
    html = _inline_html("Open at **80 days**, settle at **75 days**.")
    assert "**" not in html
    assert "<strong>80 days</strong>" in html
    assert "<strong>75 days</strong>" in html


def test_inline_html_renders_target_outcome_labels():
    closed = _inline_html("**Contractual Terms**: 60 days")
    assert "**" not in closed
    assert "<strong>Contractual Terms</strong>:" in closed

    split_number = _inline_html("**Opportunity**: **75** days")
    assert "**" not in split_number
    assert "<strong>Opportunity</strong>:" in split_number
    assert "<strong>75 days</strong>" in split_number

    unclosed = _inline_html("**Opportunity: 75 days")
    assert "**" not in unclosed
    assert "<strong>Opportunity:</strong>" in unclosed


def test_inline_html_renders_italic():
    html = _inline_html('*How to pitch:* "hello"')
    assert html.startswith("<strong>How to pitch:</strong>")
    assert _inline_html('**How to pitch**: "hello"').startswith(
        "<strong>How to pitch</strong>:"
    )
    peeled = _inline_html(
        "**Cost Impact — 0.77% of spend — internal only, do not say this to the supplier**"
    )
    assert peeled.startswith("<strong>Cost Impact — 0.77% of spend</strong>")
    assert "internal only" in peeled
    assert not peeled.endswith("</strong>")
    assert "*" not in html.replace("</em>", "").replace("<em>", "")
    # Hyphenated argument titles must still get a bold label (Client-Supplier).
    csr = _inline_html("Client-Supplier Relationship — $112.77M spend")
    assert csr.startswith("<strong>Client-Supplier Relationship —</strong>")


def test_inline_html_bolds_step_offer_labels():
    html = _inline_html(
        'Step 1 — Offer: "If moving to Net 75 immediately creates a roadblock."'
    )
    assert html.startswith("<strong>Step 1 — Offer:</strong>")
    assert "<strong>Net 75</strong>" in html
    html = _inline_html(
        'Step 2 — Offer: "Where alignment cannot be achieved immediately."'
    )
    assert html.startswith("<strong>Step 2 — Offer:</strong>")
    dashed = _inline_html("Step 1 — hold **80 days** through the first round.")
    assert dashed.startswith("<strong>Step 1 —</strong>")
    assert "<strong>80 days</strong>" in dashed


def test_inline_html_formats_percents_net_terms_and_quartiles():
    percent = _inline_html("Cost impact is only 2% of invoice value.")
    assert "<strong>2.00%</strong>" in percent

    bold_percent = _inline_html("**Cost Impact - 2% of invoice value.**")
    assert "<strong>Cost Impact - 2.00% of invoice value.</strong>" in bold_percent

    net = _inline_html("mandated a standard policy of Net 120 across vendors.")
    assert "<strong>Net 120</strong>" in net

    quartile = _inline_html(
        "79 days from its top-quartile customers and the 3rd quartile bar."
    )
    assert "<strong>top-quartile</strong>" in quartile
    assert "<strong>3rd quartile</strong>" in quartile


def test_html_uses_preview_card_layout():
    html = build_playbook_html(_sample_body())
    assert 'class="playbook-card-index"' in html
    assert '--section-accent' in html
    assert '<td class="playbook-card"' in html
    assert "<strong>80 days</strong>" in html
    assert "<strong>Contractual Terms</strong>:" in html
    assert "<strong>34 days</strong>" in html
    assert "**" not in html


def test_flag_emoji_maps_to_iso_for_any_country():
    assert _flag_emoji_to_iso("🇮🇹") == "IT"
    assert _flag_emoji_to_iso("🇮🇪") == "IE"
    assert _flag_emoji_to_iso("🇺🇸") == "US"
    assert _flag_emoji_to_iso("🇩🇪") == "DE"


def test_subtitle_replaces_any_flag_emoji_with_image_or_code():
    # WeasyPrint cannot paint emoji fonts; every ISO flag becomes an <img> (or ISO chip).
    for emoji, iso in (("🇮🇹", "IT"), ("🇮🇪", "IE"), ("🇯🇵", "JP")):
        html = _with_flag_images(f'Term Extension · "Acme" ({emoji} Country)')
        assert emoji not in html
        assert iso in html
        assert 'class="playbook-flag"' in html or 'class="playbook-flag-code"' in html


def test_playbook_html_has_no_subtitle():
    """Playbooks no longer render document or section subtitles."""
    body = _sample_body().model_copy(
        update={
            "subtitle": 'Term Extension · "ENI Sustainable Mobility S.P.A." (Italy 🇮🇹)',
        }
    )
    html = build_playbook_html(body)
    assert "playbook-subtitle" not in html
    assert "playbook-card-subtitle" not in html
    assert "Intended landing zone" not in html
    assert "Data-justified first ask" not in html


def test_playbook_pdf_fits_one_page():
    if HTML is None:
        return
    document = HTML(string=build_playbook_html(_sample_body())).render()
    assert len(document.pages) == 1, f"expected 1 page, got {len(document.pages)}"


def test_playbook_pdf_does_not_overflow_the_page():
    if HTML is None:
        return
    document = HTML(string=build_playbook_html(_sample_body())).render()
    page = document.pages[0]
    page_right = page.width

    def walk(box, acc):
        right = box.position_x + box.width
        acc.append(right)
        for child in getattr(box, "children", []) or []:
            walk(child, acc)

    rights: list[float] = []
    walk(page._page_box, rights)
    assert max(rights) <= page_right + 0.5, (
        f"content extends to {max(rights):.1f}, page width {page_right:.1f}"
    )
