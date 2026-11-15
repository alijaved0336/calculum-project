"""The five approved email formats, and the rules each one carries.

The point of these tests is one property: **the client's own reference email,
resolved for a real supplier, must pass validation**. Three of the five are
written in wording the standard notice bans outright — "we would like to request
the following payment terms", "industry standards", "cash flow", "working
capital" — so a single global rule set would have regenerated every one of them
back into the short notice, and the negotiator clicking "Write longer email"
would have received the same short email a third time with no way to tell why.

The carve-outs are per template and named phrase by phrase, so the other half of
each test matters just as much: the wording one variant unlocks is still
rejected in the four that did not ask for it.
"""
from __future__ import annotations

import pytest

from domain.services.brief_builder import brief_from
from domain.services.opening_email import (
    build_opening_email_spec,
    validate_opening_email,
)
from domain.services.opening_email_templates import (
    DeadlineKind,
    EmailEmphasis,
    EmailTemplate,
    all_templates,
    build_subject_line,
    coerce_email_template,
    get_template,
    infer_template_from_text,
    is_modification_request,
    match_email_template,
    select_email_emphasis,
    select_email_template,
)
from domain.services.supplier_facts import extract_supplier_facts
from utils.prompts.draft_opening_email_prompt import (
    _template_block,
    build_draft_opening_email_prompt,
)


def _facts(target=90, current=60):
    payload = {
        "supplier": {
            "name": "Acme GmbH",
            "country": "Germany",
            "mainIndustryName": "Chemicals",
            "spendVolume": 40_000_000.0,
            "supplierFinancingRate": 0.11,
        },
        "target": {"targetPaymentTerms": target, "targetCashFlow": 1_000_000},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": current,
            "actualPaymentTerms": current,
        },
        "negotiationStrategy": {
            "peerGroupStandard": {"value": 120, "occurrences": 30},
            "industryRegionStandard": {"value": 110},
        },
    }
    return extract_supplier_facts(payload)


def _spec(message: str = "draft the opening email", **kwargs):
    return build_opening_email_spec(_facts(), message, **kwargs)


# ── The negotiator picks the variant by asking for it ──────────────────────


@pytest.mark.parametrize(
    "message, expected",
    [
        ("draft the opening email", EmailTemplate.STANDARD),
        ("send them an email about the new terms", EmailTemplate.STANDARD),
        ("Write longer email", EmailTemplate.LONGER),
        ("can you make it longer", EmailTemplate.LONGER),
        ("write a more detailed version", EmailTemplate.LONGER),
        ("Write more negotiable collaborative version", EmailTemplate.COLLABORATIVE),
        ("write another email version with a more negotiable, collaborative tone",
         EmailTemplate.COLLABORATIVE),
        ("soften it a bit", EmailTemplate.COLLABORATIVE),
        ("Write version with Supply Chain Finance", EmailTemplate.SCF),
        ("write another email version with SCF", EmailTemplate.SCF),
        ("add the early payment option", EmailTemplate.SCF),
        ("Formal message from senior management", EmailTemplate.SENIOR_MANAGEMENT),
        ("suggest a formal message from senior management about the term initiative",
         EmailTemplate.SENIOR_MANAGEMENT),
    ],
)
def test_the_variant_is_read_from_the_request(message, expected):
    assert select_email_template(message) is expected


def test_a_named_document_beats_a_shape_adjective():
    """"A longer email with SCF" is the SCF email, not the longer one."""
    assert select_email_template("write a longer email with SCF") is EmailTemplate.SCF


def test_an_operator_instruction_never_picks_the_variant():
    """A standing rule sets policy for every email. Letting the word "longer"
    in one silently re-shape a specific request is an override nobody can see
    from the draft."""
    spec = build_opening_email_spec(
        _facts(),
        "draft the opening email",
        prompt_instructions=["Always write a longer, more collaborative email."],
    )
    assert spec.template is EmailTemplate.STANDARD


# ── The reference emails, resolved, are sendable ───────────────────────────
#
# Each of these is the client's reference for that variant with the placeholders
# filled from the spec: supplier Acme GmbH, current 60 days, new 90 days, no
# date supplied (so the relative 14-day window), no contact and no sender.

_RESOLVED_STANDARD = """\
Subject: Payment Terms Standardisation of  90 Days Effective by [MM, DD, YYYY]

Dear Acme GmbH Team,

As part of our ongoing standardisation of payment terms across our supplier base, we are formally notifying you of an update to your payment terms.

We are changing your current payment terms of 60 days to a new standard term of 90 days. We value our partnership and want to ensure a smooth transition. These updated terms will take effect by [MM, DD, YYYY].

Thank you for your attention to this matter.

Kind Regards
XXX
[Company]"""

_RESOLVED_LONGER = """\
Subject: Notice of Payment Terms Standardization - Action Required by [MM, DD, YYYY]

Dear Acme GmbH Team,

I trust this email finds you well.

I am writing to inform you about [Company]'s initiative on the standardization of payment terms. To better align with our internal processes and industry standards, we are standardizing payment terms to 90 days for all suppliers.

We value our partnership and want to ensure a smooth transition. Please share your feedback on this proposed change by [MM, DD, YYYY]. If we don't hear from you by this date, we will assume you are in agreement and proceed with implementing the new payment terms.

Should you have any questions or require further clarification, please do not hesitate to reach out to us directly by responding to this email.

We look forward to your prompt response.

Kind Regards
XXX
[Company]"""

_RESOLVED_COLLABORATIVE = """\
Subject: Standardizing Payment Terms

Dear Acme GmbH Team,

I trust this email finds you well.

As you know, [Company] is focused on investing in the growth of our business to deliver exceptional customer value. This includes significant investments in end-to-end supply chain solutions and technologies.

To support these investments and continue our growth trajectory, we must constantly drive innovation and efficiency throughout our supply chain.

Following extensive analysis, our leadership team has determined that adjusting our overall payment terms is essential to meet industry standards and remain competitive. We value our business relationship with you and look forward to continuing to work together.

We understand that payment terms are essential to both parties, and we are willing to negotiate a mutually beneficial payment arrangement. Also, we would like to request the following payment terms:

Payment Terms: 90 days
Due Date: [MM, DD, YYYY]

These payment terms are fair and reasonable to be aligned to the industry and other peers in the market. We value our ongoing cooperation with your firm and look forward to your feedback at your earliest convenience.

Sincerely,
XXX
[Company]"""

_RESOLVED_SCF = """\
Subject: Notice of Payment Terms Standardization - Supply Chain Finance

Dear Acme GmbH Team,

I am writing to inform you about [Company]'s initiative on the standardization of payment terms. To better align with our internal processes and industry standards, we are standardizing payment terms to 90 days for all suppliers.

We value our partnership and want to ensure a smooth transition. Please share your feedback on this proposed change by [MM, DD, YYYY]. If we don't hear from you by this date, we will assume you are in agreement and proceed with implementing the new payment terms.

We understand that this transition may pose challenges for some suppliers. In line with our commitment to supporting you, we have partnered with a third-party provider to offer early payment options, enhancing your cash flow while adapting to the new terms seamlessly.

Should you have any questions or require further clarification, please do not hesitate to reach out to us directly by responding to this email. Thank you for your attention to this matter, and I look forward to your prompt response.

Best regards,
XXX
[Company]"""

_RESOLVED_SENIOR = """\
Dear Valued Supplier Partner,

At [Company], we are continuously evaluating our operational strategies to ensure sustainable, long-term growth and competitiveness in our industry. As part of this effort, our executive leadership team has launched a company-wide strategic initiative focused on optimizing our working capital and streamlining financial operations across our entire supply chain.

A critical component of this strategy involves standardizing and extending our payment terms across our global supplier base. Enhancing our financial flexibility strengthens our market position, directly enables continued investment in growth, and reinforces our ability to build stronger, more resilient partnerships with key suppliers like you over the long term.

Because this initiative is driven directly by top management, alignment on payment terms is a mandatory requirement for all our active vendors and suppliers. These discussions are an essential part of our broader company objectives, and full participation in this process is required to maintain a forward-looking business relationship.

Our dedicated Category Manager will lead these discussions with your team to review our target terms and establish an implementation plan.

We deeply appreciate your continued partnership and active support as we execute this critical strategic milestone together.

Sincerely,
XXX
[Company]"""

_RESOLVED: dict[EmailTemplate, tuple[str, str]] = {
    EmailTemplate.STANDARD: ("draft the opening email", _RESOLVED_STANDARD),
    EmailTemplate.LONGER: ("write a longer email", _RESOLVED_LONGER),
    EmailTemplate.COLLABORATIVE: (
        "write a more negotiable, collaborative version",
        _RESOLVED_COLLABORATIVE,
    ),
    EmailTemplate.SCF: ("write a version with Supply Chain Finance", _RESOLVED_SCF),
    EmailTemplate.SENIOR_MANAGEMENT: (
        "suggest a formal message from senior management",
        _RESOLVED_SENIOR,
    ),
}


# The CLIENT'S five reference emails. Deliberately not `list(EmailTemplate)`:
# CUSTOM is a sixth variant but not a sixth reference — it is the standard
# notice with the negotiator free to change any of it, so it has no approved
# wording of its own to check a draft against, and the property these tests
# assert ("the reference passes, prose of the model's own does not") is exactly
# the property it does not have. It gets its own tests below.
_CLIENT_TEMPLATES = list(_RESOLVED)


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_the_clients_own_reference_email_passes_validation(template):
    message, draft = _RESOLVED[template]
    spec = _spec(message)
    assert spec.template is template
    assert validate_opening_email(draft, spec) == []


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_prose_of_the_models_own_is_caught_in_every_variant(template):
    """The other half of the property above: the reference passes, and wording
    that is not the reference does not — in all five, not just the short one."""
    message, draft = _RESOLVED[template]
    spec = _spec(message)
    padded = draft.replace(
        "\n\nKind Regards", "\n\nWe trust this arrangement will serve us both well "
        "as our partnership continues to grow.\n\nKind Regards"
    ).replace(
        "\n\nSincerely", "\n\nWe trust this arrangement will serve us both well "
        "as our partnership continues to grow.\n\nSincerely"
    ).replace(
        "\n\nBest regards", "\n\nWe trust this arrangement will serve us both well "
        "as our partnership continues to grow.\n\nBest regards"
    )
    assert padded != draft, "the sentence was not actually added"
    codes = [v.code for v in validate_opening_email(padded, spec)]
    assert "off_template" in codes


@pytest.mark.parametrize(
    "template, draft",
    [
        (t, _RESOLVED[t][1])
        for t in _CLIENT_TEMPLATES
        if t is not EmailTemplate.STANDARD
    ],
)
def test_the_other_variants_would_all_fail_the_default_rules(template, draft):
    """The carve-outs are doing real work: every one of these is rejected when
    validated as the standard notice."""
    assert validate_opening_email(draft, _spec("draft the opening email")) != []


# ── A carve-out belongs to its own variant and nowhere else ────────────────


def test_requesting_language_is_unlocked_only_by_the_collaborative_variant():
    sentence = "we would like to request the following payment terms"
    for template, (message, _) in _RESOLVED.items():
        codes = {
            v.code
            for v in validate_opening_email(
                _RESOLVED[template][1].replace(
                    "Thank you for your attention to this matter.", sentence
                )
                if template is EmailTemplate.STANDARD
                else _RESOLVED[template][1] + f"\n\n{sentence}",
                _spec(message),
            )
        }
        expected = template is not EmailTemplate.COLLABORATIVE
        assert ("negotiation_language" in codes) is expected, template


def test_supply_chain_finance_is_unlocked_only_by_the_scf_variant():
    for template, (message, draft) in _RESOLVED.items():
        codes = {
            v.code
            for v in validate_opening_email(
                draft + "\n\nWe also offer Supply Chain Finance.", _spec(message)
            )
        }
        expected = template is not EmailTemplate.SCF
        assert ("justification" in codes) is expected, template


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_no_variant_ever_unlocks_a_figure(template):
    """The carve-outs are qualitative phrases. A benchmark number is not a
    phrase, and nothing here lifts the check that catches it."""
    message, draft = _RESOLVED[template]
    codes = {
        v.code
        for v in validate_opening_email(
            draft + "\n\nYour peers in the market are at 120 days.", _spec(message)
        )
    }
    assert "term_mismatch" in codes


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_no_variant_ever_unlocks_an_invented_date(template):
    message, draft = _RESOLVED[template]
    codes = {
        v.code
        for v in validate_opening_email(
            draft.replace("Dear", "Effective 1 March 2027.\n\nDear", 1), _spec(message)
        )
    }
    assert "invented_date" in codes


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_no_variant_ever_unlocks_an_invented_sender(template):
    message, draft = _RESOLVED[template]
    codes = {
        v.code
        for v in validate_opening_email(
            draft.replace("XXX", "The Procurement Team"), _spec(message)
        )
    }
    assert "invented_sender" in codes


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_the_payment_cycle_wording_is_banned_in_every_variant(template):
    message, draft = _RESOLVED[template]
    codes = {
        v.code
        for v in validate_opening_email(
            draft + "\n\nThis is an extension of the payment cycle.", _spec(message)
        )
    }
    assert "banned_phrase" in codes


# ── The senior-management message states no numbers at all ─────────────────


def test_the_senior_management_message_needs_no_subject_line():
    spec = _spec("formal message from senior management")
    assert spec.subject_line == ""
    assert validate_opening_email(_RESOLVED_SENIOR, spec) == []


def test_a_day_figure_in_the_senior_management_message_is_always_stray():
    """It announces the initiative; the Category Manager takes the numbers."""
    spec = _spec("formal message from senior management")
    assert spec.allowed_day_figures == frozenset()
    violations = validate_opening_email(
        _RESOLVED_SENIOR.replace(
            "our target terms", "our target terms of 90 days"
        ),
        spec,
    )
    assert any(v.code == "term_mismatch" for v in violations)


def test_the_senior_management_message_needs_no_target_term_on_file():
    """Every other variant states the new term, so a supplier with no target
    blocks. This one does not state it, so it does not block."""
    payload_facts = _facts(target=None)
    spec = build_opening_email_spec(
        payload_facts, "formal message from senior management"
    )
    assert spec.proposed_term_days is None
    assert spec.template_spec.requires_term_figure is False


# ── SCF is the one variant with a veto ─────────────────────────────────────


def test_the_scf_variant_drops_to_the_longer_notice_when_scf_is_not_offerable():
    spec = build_opening_email_spec(
        _facts(), "write a version with Supply Chain Finance", scf_offerable=False
    )
    assert spec.template is EmailTemplate.LONGER
    assert spec.requested_template is EmailTemplate.SCF
    assert spec.scf_downgraded is True


def test_the_downgraded_variant_no_longer_permits_the_scf_paragraph():
    spec = build_opening_email_spec(
        _facts(), "write a version with Supply Chain Finance", scf_offerable=False
    )
    violations = validate_opening_email(_RESOLVED_SCF, spec)
    assert any(v.code == "justification" for v in violations)


def test_an_offerable_scf_request_keeps_the_scf_variant():
    spec = build_opening_email_spec(
        _facts(), "write a version with Supply Chain Finance", scf_offerable=True
    )
    assert spec.template is EmailTemplate.SCF
    assert spec.scf_downgraded is False


def test_only_the_scf_request_is_ever_downgraded():
    for message in ("draft the opening email", "write a longer email"):
        spec = build_opening_email_spec(_facts(), message, scf_offerable=False)
        assert spec.requested_template is None
        assert spec.scf_downgraded is False


# ── Subject lines come from the references, not from one pattern ───────────


def test_the_built_subject_is_the_references_own_subject_line():
    """Fed the client's own placeholders as values, each variant must build the
    subject line printed in its reference.

    This is the check that was missing. The standard variant — the default, the
    one drafted unless another is asked for — built "Payment Terms
    Standardisation — 90 Days Effective <date>" against a reference reading
    "Payment Terms Standardisation of — 60 Days Effective by [MM, DD, YYYY]".
    Two missing words, on every default email, and a negotiator quoting the
    template back was told they had dictated a custom subject.
    """
    for template in EmailTemplate:
        reference_subject = next(
            (
                line[len("Subject:"):].strip()
                for line in get_template(template).reference.splitlines()
                if line.lower().startswith("subject:")
            ),
            "",
        )
        built = build_subject_line(
            template,
            proposed_term_days=60,
            effective_date="[MM, DD, YYYY]",
            window_days=14,
            buyer_name="[Buyer Name]",
        )
        if not reference_subject:
            assert built == "", f"{template.value} builds a subject its reference has none of"
            continue
        # A prefix, not equality: the standard reference carries BOTH endings
        # ("Effective by [MM, DD, YYYY] in 14 Days") because their document
        # shows both, and a real email states one of them.
        assert reference_subject.startswith(built), (
            f"{template.value}: built {built!r}, reference says {reference_subject!r}"
        )


def test_each_variant_has_its_references_subject_line():
    assert _spec("draft the opening email").subject_line == (
        "Payment Terms Standardisation of 90 Days Effective by [MM, DD, YYYY]"
    )
    assert _spec("write a longer email").subject_line == (
        "Notice of Payment Terms Standardization - Action Required by [MM, DD, YYYY]"
    )
    assert _spec("write a collaborative version").subject_line == (
        "Standardizing Payment Terms"
    )
    assert _spec("write a version with SCF").subject_line == (
        "Notice of Payment Terms Standardization - Supply Chain Finance"
    )
    assert _spec("formal message from senior management").subject_line == ""


def test_a_supplied_date_reaches_the_subject_of_the_variants_that_carry_one():
    assert "1 March 2027" in _spec(
        "draft the opening email, effective 1 March 2027"
    ).subject_line
    assert "1 March 2027" in _spec(
        "write a longer email, effective 1 March 2027"
    ).subject_line


def test_the_collaborative_subject_never_carries_a_placeholder():
    """A "[Company]" in the subject would satisfy the sign-off placeholder check
    without anything ever reaching the signature."""
    assert "[" not in _spec("write a collaborative version").subject_line
    assert build_subject_line(
        EmailTemplate.COLLABORATIVE, 90, None, 14, buyer_name="Northwind Retail"
    ) == "Standardizing Payment Terms - Northwind Retail"


# ── The deadline means something different in each variant ─────────────────


@pytest.mark.parametrize(
    "message, fragment",
    [
        ("draft the opening email", "will take effect by [MM, DD, YYYY]"),
        ("write a longer email", "share your feedback on this proposed change by [MM, DD, YYYY]"),
        ("write a collaborative version", "Due Date: [MM, DD, YYYY]"),
        ("write a version with SCF", "share your feedback on this proposed change by [MM, DD, YYYY]"),
    ],
)
def test_the_deadline_is_worded_for_its_variant(message, fragment):
    """With nothing supplied, each variant keeps its own reference sentence and
    the client's own date placeholder in it — not a 14-day window this code made
    up and stated to the supplier as fact."""
    assert fragment in _spec(message).deadline_instruction


@pytest.mark.parametrize(
    "message, fragment",
    [
        ("draft the opening email, effective in 45 days", "will take effect within 45 days"),
        ("write a longer email, effective in 45 days", "share your feedback on this proposed change within 45 days"),
        ("write a collaborative version, effective in 45 days", "Due Date: within 45 days"),
        ("write a version with SCF, effective in 45 days", "share your feedback on this proposed change within 45 days"),
    ],
)
def test_a_window_the_negotiator_asked_for_is_worded_relatively(message, fragment):
    """The relative wording still exists — for the negotiator who asks for it."""
    assert fragment in _spec(message).deadline_instruction


def test_the_senior_management_message_has_no_deadline_at_all():
    spec = _spec("formal message from senior management")
    assert spec.template_spec.deadline_kind is DeadlineKind.NONE
    assert spec.deadline_instruction == ""


def test_a_supplied_date_is_reproduced_in_the_deadline_wording():
    spec = _spec("write a longer email, they must respond by 1 March 2027")
    assert "1 March 2027" in spec.deadline_instruction


# ── The reference reaches the model ────────────────────────────────────────


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_the_reference_email_is_shown_to_the_drafter_in_full(template):
    """Described in prose, five variants come back as one email with different
    adjectives. Shown, they come back as five documents."""
    message, _ = _RESOLVED[template]
    block = _template_block(_spec(message))
    reference = get_template(template).reference
    assert reference in block
    assert get_template(template).label in block
    assert f"about {get_template(template).word_cap} words" in block


def test_the_reference_never_carries_a_real_customer_name():
    """The client's copy names a live supplier. Left in, it sits in the prompt
    next to an instruction to write a supplier email."""
    for template in all_templates():
        assert "Adp" not in template.reference


def test_the_prompt_carries_the_variant_and_its_placeholder_mapping():
    prompt = build_draft_opening_email_prompt(
        "write a longer email", _facts(), {}, None, brief=brief_from(_facts())
    )
    assert "## EMAIL TEMPLATE — Longer notification" in prompt
    assert "I trust this email finds you well." in prompt


def test_no_benchmark_figure_reaches_any_variant():
    """The email profile withholds the arguments; the template does not put
    them back."""
    for message, _ in _RESOLVED.values():
        prompt = build_draft_opening_email_prompt(
            message, _facts(), {}, None, brief=brief_from(_facts())
        )
        assert "120" not in prompt, message
        assert "110" not in prompt, message


# ── The buttons and the selector must not drift apart ──────────────────────


def test_every_email_follow_up_button_selects_a_distinct_variant():
    """The follow-ups after an email ARE the other four formats. A click sends
    its own label back as the message, so the wording is an interface between
    two files: reword a button without checking the selector and the negotiator
    gets the standard notice again with no way to tell why."""
    from utils.prompts.follow_up_suggestions_prompt import get_fallback_follow_ups

    buttons = get_fallback_follow_ups("draft_opening_email")
    selected = [select_email_template(b) for b in buttons]
    assert selected == [
        EmailTemplate.LONGER,
        EmailTemplate.COLLABORATIVE,
        EmailTemplate.SCF,
        EmailTemplate.SENIOR_MANAGEMENT,
    ]


def test_the_scf_button_is_dropped_where_the_programme_cannot_be_offered():
    from utils.prompts.follow_up_suggestions_prompt import (
        get_fallback_follow_ups,
        strip_scf_follow_ups,
    )

    buttons = get_fallback_follow_ups("draft_opening_email")
    kept = strip_scf_follow_ups(buttons, scf_offerable=False, intent_value="draft_opening_email")
    assert EmailTemplate.SCF not in [select_email_template(b) for b in kept]
    # Three, not four. The negotiator is only ever shown THREE follow-ups —
    # `generate_follow_ups` caps at `valid[:3]` and every backstop routes
    # through `_backfill`, which caps at 3. The four-entry list this pulls from
    # is a POOL, not a display count, so dropping the SCF chip leaves the full
    # three and nothing needs backfilling. Asserting 4 here demanded a backfill
    # that would have shown one more button on email turns than on every other
    # intent.
    assert len(kept) == 3


def test_no_email_follow_up_mentions_tone():
    """Tone is a UI button. A follow-up naming it is always wrong — and the
    collaborative variant is a FORMAT, which is why its label says "version"."""
    from utils.prompts.follow_up_suggestions_prompt import get_fallback_follow_ups

    for button in get_fallback_follow_ups("draft_opening_email"):
        assert "tone" not in button.lower(), button


# ── Emphasis: the same email, read harder ──────────────────────────────────
#
# From a real transcript. "make email more stronger" matched no format selector,
# fell through to STANDARD, and returned the identical email the negotiator had
# just asked to change — so the request looked ignored, because it was.


@pytest.mark.parametrize(
    "message",
    [
        "make email more stronger",
        "make it stronger",
        "write a strong email to the supplier",
        "can you make this firmer",
        "more direct please",
        "I need a more assertive version",
        "make it tougher",
        "strongly-worded version",
    ],
)
def test_a_request_to_harden_the_email_is_recognised(message):
    assert select_email_emphasis(message) is EmailEmphasis.FIRM


@pytest.mark.parametrize(
    "message",
    ["draft the opening email", "write a longer email", "add Supply Chain Finance"],
)
def test_an_ordinary_request_carries_no_emphasis(message):
    assert select_email_emphasis(message) is EmailEmphasis.STANDARD


def test_emphasis_is_a_separate_axis_from_the_format():
    """"A stronger longer email" is the longer variant, read harder — not a
    choice between the two."""
    spec = _spec("write a stronger longer email")
    assert spec.template is EmailTemplate.LONGER
    assert spec.is_firm is True


def test_the_firm_rules_reach_the_drafter():
    block = _template_block(_spec("make it stronger"))
    assert "EMPHASIS — THE NEGOTIATOR ASKED FOR A STRONGER EMAIL" in block
    assert "Cut the cushioning entirely" in block
    # Firmness by subtraction, and the budget tightens to match.
    assert "A strong email is one that has had things REMOVED." in block
    assert f"Target about {int(get_template(EmailTemplate.STANDARD).word_cap * 0.75)} words" in block


def test_an_ordinary_request_gets_no_emphasis_block():
    assert "EMPHASIS —" not in _template_block(_spec("draft the opening email"))


def test_firmness_never_licenses_a_threat():
    """The whole reason emphasis is bounded: asked to strengthen an email the
    model reached for "we require strict compliance" and "there will be no
    exceptions or negotiations"."""
    spec = _spec("make it stronger")
    assert spec.is_firm is True
    draft = _RESOLVED_STANDARD.replace(
        "Thank you for your attention to this matter.",
        "We require strict compliance. There will be no exceptions.",
    )
    assert any(v.code == "escalation" for v in validate_opening_email(draft, spec))


# ── A follow-up keeps the format it is adjusting ───────────────────────────


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_a_drafted_email_is_recognisable_as_its_own_variant(template):
    """Which email a follow-up is adjusting is recovered from the email itself —
    nothing else in the turn knows."""
    assert infer_template_from_text(_RESOLVED[template][1]) is template


def test_stronger_keeps_the_variant_it_was_asked_about():
    """Asked to strengthen the longer notice, the drafter used to return the
    SHORT one: a format change nobody asked for, as the answer to a question
    about register."""
    spec = build_opening_email_spec(
        _facts(), "make it stronger", previous_template=EmailTemplate.LONGER
    )
    assert spec.template is EmailTemplate.LONGER
    assert spec.is_firm is True


def test_a_named_format_still_beats_the_previous_one():
    spec = build_opening_email_spec(
        _facts(),
        "actually write a version with Supply Chain Finance",
        previous_template=EmailTemplate.LONGER,
    )
    assert spec.template is EmailTemplate.SCF


def test_a_fresh_request_does_not_inherit_a_stale_format():
    """Only an ADJUSTMENT inherits. "Draft the opening email" is a new request,
    and a format that outlives the request that chose it is a bug."""
    spec = build_opening_email_spec(
        _facts(), "draft the opening email", previous_template=EmailTemplate.SCF
    )
    assert spec.template is EmailTemplate.STANDARD


@pytest.mark.parametrize(
    "message, adjusts",
    [
        ("make it stronger", True),
        ("rewrite it", True),
        ("shorten it", True),
        ("make the email shorter", True),
        ("draft the opening email", False),
        ("write an email about the new terms", False),
    ],
)
def test_only_an_adjustment_carries_the_format_forward(message, adjusts):
    assert is_modification_request(message) is adjusts


# ── The classifier names the variant ───────────────────────────────────────
#
# The wording patterns above match STRINGS. The intent classifier reads MEANING
# on the same turn it decides the intent, and it is the signal that wins —
# "generate a detailed email" is the longer notice, and no pattern list over
# five documents will ever hold every way of asking for one.


@pytest.mark.parametrize("template", _CLIENT_TEMPLATES)
def test_the_classifier_chooses_the_variant(template):
    spec = build_opening_email_spec(
        _facts(), "generate a detailed email", classified_template=template
    )
    assert spec.template is template


def test_the_classifier_reaches_a_variant_the_patterns_do_not_match():
    """The whole point. "Generate a detailed email" matches no selector — it is
    not "more detail", not "detailed version" — so it used to come back as the
    short notice."""
    message = "generate a detailed email"
    assert select_email_template(message) is EmailTemplate.STANDARD
    spec = build_opening_email_spec(
        _facts(), message, classified_template=EmailTemplate.LONGER
    )
    assert spec.template is EmailTemplate.LONGER


def test_the_classifier_beats_the_wording_patterns():
    """It reads negation and exception; a regex over five documents cannot.
    "Keep the senior management letter" contains "friendl"-free wording, but
    "friendlier" alone would have selected the collaborative variant."""
    spec = build_opening_email_spec(
        _facts(),
        "make it friendlier but keep the senior management letter",
        classified_template=EmailTemplate.SENIOR_MANAGEMENT,
    )
    assert spec.template is EmailTemplate.SENIOR_MANAGEMENT


def test_the_patterns_still_decide_when_the_classifier_named_nothing():
    """The deterministic floor: a direct call, a non-email turn, or JSON that
    had to be salvaged all arrive with no classified template."""
    spec = build_opening_email_spec(
        _facts(), "write a version with Supply Chain Finance", classified_template=None
    )
    assert spec.template is EmailTemplate.SCF


def test_a_classified_standard_never_undoes_the_inherited_format():
    """"Make it shorter" names no format. A classifier answering STANDARD there
    — its default when nothing was named — would hand back the short notice in
    place of the longer email being adjusted."""
    spec = build_opening_email_spec(
        _facts(),
        "make it shorter",
        previous_template=EmailTemplate.LONGER,
        classified_template=EmailTemplate.STANDARD,
    )
    assert spec.template is EmailTemplate.LONGER


def test_a_classified_variant_still_switches_the_format_of_a_follow_up():
    """The guard above is narrow: it only protects the DEFAULT. A negotiator who
    asks for a different document mid-thread gets that document."""
    spec = build_opening_email_spec(
        _facts(),
        "rewrite it as a message from senior management",
        previous_template=EmailTemplate.LONGER,
        classified_template=EmailTemplate.SENIOR_MANAGEMENT,
    )
    assert spec.template is EmailTemplate.SENIOR_MANAGEMENT


def test_a_classified_standard_holds_on_a_fresh_request():
    spec = build_opening_email_spec(
        _facts(),
        "generate me an opening email",
        classified_template=EmailTemplate.STANDARD,
    )
    assert spec.template is EmailTemplate.STANDARD


def test_the_scf_veto_outranks_the_classifier():
    """The one veto. The classifier decides WHICH document; whether the SCF
    programme may be offered at all is not its call."""
    spec = build_opening_email_spec(
        _facts(),
        "generate an email offering early payment",
        classified_template=EmailTemplate.SCF,
        scf_offerable=False,
    )
    assert spec.template is EmailTemplate.LONGER
    assert spec.scf_downgraded is True


@pytest.mark.parametrize(
    "value, expected",
    [
        ("standard", EmailTemplate.STANDARD),
        ("longer", EmailTemplate.LONGER),
        ("collaborative", EmailTemplate.COLLABORATIVE),
        ("scf", EmailTemplate.SCF),
        ("senior_management", EmailTemplate.SENIOR_MANAGEMENT),
        ("  SCF  ", EmailTemplate.SCF),
        (EmailTemplate.LONGER, EmailTemplate.LONGER),
        # Anything else means the classifier named no variant — which the
        # drafter already handles — never a crash on the email path.
        ("short", None),
        ("", None),
        (None, None),
        (7, None),
    ],
)
def test_a_classifier_supplied_name_is_coerced_not_trusted(value, expected):
    assert coerce_email_template(value) is expected


# ── Their own escalation wording is refused OUT LOUD ───────────────────────


def test_escalation_the_negotiator_asked_for_is_quoted_back():
    """Silently dropping it is indistinguishable from not having understood."""
    spec = _spec(
        "make it stronger — say this is non-negotiable and no exceptions will be made"
    )
    assert spec.is_firm is True
    assert "not negotiable" in spec.refused_instructions or (
        "non-negotiable" in spec.refused_instructions
    )
    assert "no exceptions" in spec.refused_instructions


def test_an_ordinary_firm_request_refuses_nothing():
    assert _spec("make it stronger").refused_instructions == ()


def test_calling_something_non_negotiable_is_not_a_request_for_the_negotiable_email():
    """"tell them this is non-negotiable" contains "negotiab" and used to select
    the COLLABORATIVE variant — a request to harden the email answered with the
    one document that offers to negotiate."""
    spec = _spec("make it stronger, tell them this is non-negotiable")
    assert spec.template is EmailTemplate.STANDARD
    assert spec.is_firm is True
    # The positive phrasings still select it.
    for message in (
        "write a more negotiable version",
        "write another email version with a more negotiable, collaborative tone",
        "we are willing to negotiate — say so",
    ):
        assert select_email_template(message) is EmailTemplate.COLLABORATIVE, message


# ── The negotiator's own email ─────────────────────────────────────────────


def test_custom_is_never_selected_by_wording_alone():
    """It is chosen by NAME — the classifier, or a click on the menu — never by
    a pattern. Nothing a negotiator types about content should silently switch
    them out of an approved reference into a free-form email."""
    for message in (
        "draft the opening email",
        "write a custom email",
        "write my own email",
        "make it longer",
    ):
        assert match_email_template(message) is not EmailTemplate.CUSTOM
        assert select_email_template(message) is not EmailTemplate.CUSTOM


def test_custom_is_the_standard_notice_underneath():
    """Anything the negotiator does not specify falls back to the default, not
    to prose of the model's own — so the reference IS the standard one."""
    assert get_template(EmailTemplate.CUSTOM).reference == get_template(
        EmailTemplate.STANDARD
    ).reference


def test_the_standard_reference_is_a_valid_custom_email():
    """The floor of the fallback: give a custom email no instructions at all and
    the standard notice comes back — and passes."""
    spec = _spec(_RESOLVED[EmailTemplate.STANDARD][0], classified_template=EmailTemplate.CUSTOM)
    assert spec.template is EmailTemplate.CUSTOM
    assert validate_opening_email(_RESOLVED[EmailTemplate.STANDARD][1], spec) == []


def test_custom_lets_the_negotiator_write_their_own_sentences():
    """The one check that lifts. Prose that is not in any reference is an
    `off_template` violation in all five client variants and is allowed here —
    that is what "change anything you want" means."""
    draft = _RESOLVED[EmailTemplate.STANDARD][1].replace(
        "\n\nKind Regards",
        "\n\nWe will follow up with your account manager next week to walk "
        "through the transition.\n\nKind Regards",
    )
    as_standard = _spec(_RESOLVED[EmailTemplate.STANDARD][0])
    assert "off_template" in [v.code for v in validate_opening_email(draft, as_standard)]

    as_custom = _spec(
        _RESOLVED[EmailTemplate.STANDARD][0], classified_template=EmailTemplate.CUSTOM
    )
    assert validate_opening_email(draft, as_custom) == []


def test_custom_does_not_unlock_invented_values_or_threats():
    """Their freedom is over WORDING. A date nobody supplied, a contact nobody
    supplied and a threat the buyer never authorised are the spec's rules, not
    the template's, and they hold here exactly as everywhere else."""
    spec = _spec(
        _RESOLVED[EmailTemplate.STANDARD][0], classified_template=EmailTemplate.CUSTOM
    )
    draft = _RESOLVED[EmailTemplate.STANDARD][1].replace(
        "These updated terms will take effect by [MM, DD, YYYY]",
        "These updated terms will take effect by March 14, 2027. Queries to "
        "ap-team@buyer.example. Failure to comply will be escalated.",
    )
    codes = {v.code for v in validate_opening_email(draft, spec)}
    assert "invented_date" in codes
    assert "unsupported_contact" in codes
    assert "escalation" in codes
