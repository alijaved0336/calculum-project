"""The DEFAULT supplier email is a standardisation NOTICE, not a proposal.

Client spec: state the new term and a deadline, and stop. No justification, no
benchmarks, no hedging verbs, no feedback-seeking, no "extension of the payment
cycle". The case is held back for the reply, once the supplier has said what
they actually object to.

That is the STANDARD variant, and it is what these tests are about. Four other
variants exist (see `test_opening_email_templates.py`) and three of them are
deliberately written in wording banned here — which is why the rules that used
to sit in the system prompt as universal truths now sit either on the STANDARD
template, where they belong to one variant, or in the validator, where they
apply to all five.
"""
from __future__ import annotations

import pytest

from domain.entities.intent import Intent
from domain.services.brief_builder import brief_from
from domain.services.supplier_facts import extract_supplier_facts
from utils.prompts.brief import INTENT_PROFILES
from domain.services.opening_email import (
    build_opening_email_spec,
    validate_opening_email,
)
from domain.services.opening_email_templates import EmailTemplate, get_template
from utils.prompts.draft_opening_email_prompt import (
    _EMAIL_TONE_RULES,
    _email_data_block,
    build_draft_opening_email_prompt,
    customise_opening_email_system_prompt as CUSTOMISE,
    draft_opening_email_system_prompt as SYSTEM,
)


def _brief(target=90, opportunity=None, current=60, **supplier):
    payload = {
        "supplier": {
            "name": "Acme GmbH",
            "country": "Germany",
            "mainIndustryName": "Chemicals",
            "spendVolume": 40_000_000.0,
            "supplierFinancingRate": 0.11,
            "buyerLeverageLevel": "high",
            **supplier,
        },
        "target": {
            "targetPaymentTerms": target,
            "opportunityPaymentTerms": opportunity,
            "targetCashFlow": 1_000_000,
        },
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": current,
            "actualPaymentTerms": current,
        },
        "agreement": {"agreedTermsWithCashDiscounts": 45},
        "negotiationStrategy": {
            "peerGroupStandard": {"value": 120, "occurrences": 30},
            "industryRegionStandard": {"value": 110},
            "payOnTerms": {"value": 60},
        },
    }
    return brief_from(extract_supplier_facts(payload))


def _draft(body: str, subject: str = "Payment Terms Standardisation of 90 Days Effective by [MM, DD, YYYY]") -> str:
    """A minimally conforming default-variant draft, with `body` spliced in."""
    return (
        f"Subject: {subject}\n\n"
        "Dear Acme GmbH Team,\n\n"
        "As part of our ongoing standardisation of payment terms across our "
        "supplier base, we are updating your payment terms from 60 days to "
        "90 days.\n\n"
        f"{body}\n\n"
        "These updated terms will take effect by [MM, DD, YYYY]. Extra "
        "email.\n\n"
        "Kind Regards\nXXX\n[Company]"
    )


# ── It is a notice, not a request ──────────────────────────────────────────


def test_the_email_is_framed_as_a_standardisation_notice():
    standard = get_template(EmailTemplate.STANDARD)
    assert "notification that the payment terms are being standardised" in standard.purpose
    assert "not a request, a proposal or an invitation to discuss" in standard.purpose


def test_declarative_not_requesting():
    """The default variant unbans nothing: every hedging verb still fails it."""
    standard = get_template(EmailTemplate.STANDARD)
    assert standard.allowed_negotiation_phrases == frozenset()
    assert "No feedback request, no invitation to discuss" in " ".join(standard.notes)


def test_first_email_carries_no_justification():
    standard = get_template(EmailTemplate.STANDARD)
    assert standard.allowed_justification_phrases == frozenset()
    assert "benchmark, peer or market FIGURES" in SYSTEM


@pytest.mark.parametrize(
    "sentence",
    [
        "We would like to move to 90 days.",
        "We propose 90 days.",
        "We request 90 days.",
        "We hope you will accept 90 days.",
    ],
)
def test_hedging_verbs_are_rejected_in_the_default_variant(sentence):
    """The ban lives in the validator now — deterministic, and per variant."""
    violations = validate_opening_email(
        _draft(body=sentence), build_opening_email_spec(_brief(target=90).facts)
    )
    assert any(v.code == "negotiation_language" for v in violations), sentence


@pytest.mark.parametrize(
    "sentence",
    [
        "We are happy to discuss the 90 day term.",
        "We welcome your feedback on the 90 day term.",
        "The 90 day term is subject to your agreement.",
    ],
)
def test_feedback_seeking_is_rejected_in_the_default_variant(sentence):
    violations = validate_opening_email(
        _draft(body=sentence), build_opening_email_spec(_brief(target=90).facts)
    )
    assert any(v.code == "negotiation_language" for v in violations), sentence


def test_the_deadline_falls_back_to_the_placeholder_never_a_date():
    """With no date supplied there is no window either — the client's own
    [MM, DD, YYYY] stays for the negotiator to fill in. The 14-day default that
    used to fill it appears in none of their five references."""
    block = _email_data_block(_brief(), {})
    assert "NONE SUPPLIED" in block
    assert "[MM, DD, YYYY]" in block
    assert "14 days" not in block
    assert "the [MM, DD, YYYY] placeholder left" in SYSTEM
    assert "never a number of days, of your own" in SYSTEM


def test_the_model_never_works_a_date_out_for_itself():
    assert "calculate dates" in SYSTEM
    assert "infer missing dates" in SYSTEM


def test_the_contact_line_is_omitted_when_no_contact_was_approved():
    assert "Only include an administrative contact when provided" in SYSTEM
    assert "If not provided, omit the contact sentence" in SYSTEM
    assert "Never invent:" in SYSTEM


def test_firmness_stops_short_of_threats():
    """A notice is a stated change with a date, not a consequence — UNASKED.

    The ban used to be flat ("a consequence beyond the one the template's own
    wording states"), and it was read exactly as written: a negotiator who asked
    for "if they don't agree they may have to give us a discount" got an email
    without it, silently, because the model was told the consequence lost to
    NEVER INCLUDE. That is the negotiator's commercial decision to make and the
    model's only job was to write it down.

    So the rule is scoped rather than dropped. Unasked, a consequence is still
    one nobody authorised. Asked for, it is written — and never as a threat,
    which is the part no instruction unlocks and which the escalation check
    enforces in code besides.
    """
    # The DEFAULT prompt bans a consequence flat, and that is now correct
    # rather than over-broad: a turn where the negotiator asked for one never
    # reaches this prompt at all.
    assert "Add no consequence of your own" in SYSTEM
    assert "do not add a consequence" in SYSTEM
    assert "never a threat" in _EMAIL_TONE_RULES["assertive"]


def test_an_instructed_consequence_is_the_negotiators_to_ask_for():
    """The other half of the rule, in the prompt that handles the turn where
    they asked for one."""
    assert "but the negotiator's to instruct" in CUSTOMISE
    assert "a consequence of not agreeing" in CUSTOMISE
    assert "Unasked, write none of it" in CUSTOMISE
    assert "never sharpen it into a threat" in CUSTOMISE


def test_internal_data_stays_absolute_against_any_instruction():
    """Scoping the consequence rule must not scope the disclosure rules with it.
    A negotiator cannot unlock a benchmark figure by asking for one — and the
    customisation prompt is the one that has to say so, since it is the prompt
    reached by an instruction."""
    absolute = CUSTOMISE[CUSTOMISE.index("### Absolute"):CUSTOMISE.index("### Not yours")]
    assert "never, whoever asks" in absolute
    assert "benchmark, peer or market FIGURES" in absolute
    assert "spend figures or volumes" in absolute
    assert "no instruction unlocks" in absolute


# ── No evidence reaches this surface ───────────────────────────────────────


def test_the_email_profile_renders_no_arguments_at_all():
    """Withheld rather than shown-and-forbidden — a benchmark in the prompt is
    one the model will find a way to use."""
    profile = INTENT_PROFILES[Intent.DRAFT_OPENING_EMAIL]
    assert profile.arguments is None
    assert profile.facts is None
    assert profile.success_probability is False


def test_no_benchmark_figure_reaches_the_email_prompt():
    prompt = build_draft_opening_email_prompt(
        "draft the opening email", _brief().facts, {}, None, brief=_brief()
    )
    # The peer/industry benchmarks in the fixture both clear the 90-day ask, so
    # the old profile would have handed them straight to the drafter.
    assert "120" not in prompt
    assert "110" not in prompt
    assert "NEGOTIATION ARGUMENTS" not in prompt


def test_no_figure_beyond_the_spec_may_be_stated():
    assert "Use only values provided in EMAIL SPEC" in SYSTEM
    assert "add unsupported numbers" in SYSTEM


def test_the_payment_cycle_wording_is_banned_deterministically():
    """The client's own ban. It lives in the validator, not the prompt text, so
    a prompt rewrite cannot drop it."""
    from domain.services.opening_email import BANNED_PHRASES

    assert "extension of the payment cycle" in BANNED_PHRASES
    assert "cycle extension" in BANNED_PHRASES


# ── The numbers, which were already right ──────────────────────────────────


def test_current_and_new_term_are_both_in_the_block():
    block = _email_data_block(_brief(target=90, current=60), {})
    assert "Current agreed payment terms : 60 days" in block
    assert "New standard payment term    : 90 days" in block


def test_the_term_falls_back_to_the_target_when_no_opportunity_is_modelled():
    """Read `opportunity_term_days` directly and a user-set target with no
    modelled opportunity handed the drafter "None days"."""
    block = _email_data_block(_brief(target=90, opportunity=None), {})
    assert "None days" not in block
    assert "New standard payment term    : 90 days" in block


def test_the_modelled_opportunity_wins_when_present():
    block = _email_data_block(_brief(target=90, opportunity=105), {})
    assert "New standard payment term    : 105 days" in block


def test_the_signoff_block_is_placeholders_when_no_sender_is_known():
    block = _email_data_block(_brief(), {})
    assert "SIGN-OFF" in block
    assert "XXX" in block and "[Company]" in block
    # No title PLACEHOLDER: an unsupplied title is not a gap in the signature,
    # it is a line the signature does not have — the only [Title] left in the
    # block is the instruction not to write one.
    assert "NOT PROVIDED — keep the placeholder [Title]" not in block
    assert "The signature has no title line" in block
    assert "The sender is the BUYER, not the supplier" in block


def test_the_supplier_is_the_recipient_never_the_sender():
    """The supplier record is the most available company name in the prompt —
    the block says outright that it is the wrong one for the sign-off."""
    block = _email_data_block(_brief(), {})
    assert "RECIPIENT — the supplier this email is addressed TO" in block
    assert "Supplier company : Acme GmbH" in block
    assert "never use it as the" in block
    assert "The supplier is the recipient" in block
    # And with nobody named, the block says so rather than leaving a gap the
    # model fills with a plausible contact person.
    assert "NO CONTACT PERSON was supplied" in block


def test_the_system_prompt_bans_assumed_sender_identities_by_name():
    assert "Purchasing Team" in SYSTEM
    assert "Procurement Team" in SYSTEM
    assert "the supplier's name or legal entity" in SYSTEM
    assert "[Company] is the buyer's own company" in SYSTEM


def test_the_subject_line_is_handed_over_verbatim():
    block = _email_data_block(_brief(target=90), {})
    assert "Subject: Payment Terms Standardisation of 90 Days Effective by [MM, DD, YYYY]" in block


def test_prior_arrangements_block_is_gone():
    """There is no paragraph for it in the new format, so the data — and the
    elaborate "omit this section" instructions it needed — are both dropped."""
    block = _email_data_block(_brief(), {})
    assert "PRIOR ARRANGEMENTS" not in block
    assert "MUST BE OMITTED" not in block
    assert "45" not in block  # the previously-agreed figure


# ── Tone changes the register, never the format ────────────────────────────


@pytest.mark.parametrize(
    "label", ["The Value Creator", "Assertive", "Methodical"]
)
def test_no_tone_reintroduces_justification_or_softening(label):
    prompt = build_draft_opening_email_prompt(
        "draft the opening email",
        _brief().facts,
        {},
        {"label": label, "description": "d"},
        brief=_brief(),
    )
    lowered = prompt.lower()
    # The old presets' own words. "mutual benefit" survives only inside the
    # collaborative rule's ban list, so match the instruction that carried it.
    assert "use inclusive language" not in lowered
    assert "frame the term change as a long-term investment" not in lowered
    assert "lead with market evidence" not in lowered
    assert "sample size prominently" not in lowered


def test_collaborative_tone_stays_declarative():
    from utils.prompts.draft_opening_email_prompt import _EMAIL_TONE_RULES

    rule = _EMAIL_TONE_RULES["collaborative"]
    assert "never becomes a reason for the change" in rule
    # It no longer bans "we would like" outright — that is the collaborative
    # TEMPLATE's own wording. What it may not do is soften a template that
    # states its change declaratively.
    assert "Do not soften a declarative sentence the template states" in rule


def test_methodical_tone_no_longer_asks_for_benchmarks():
    from utils.prompts.draft_opening_email_prompt import _EMAIL_TONE_RULES

    rule = _EMAIL_TONE_RULES["methodical"]
    assert "Cite NO figure the EMAIL SPEC does not supply" in rule
