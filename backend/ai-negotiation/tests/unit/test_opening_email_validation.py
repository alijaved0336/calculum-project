"""The opening email is decided in code and checked in code.

Nothing in this email may originate with the model: not the effective date,
not the administrative contact, not a day-figure, not a reason. These tests
cover both halves of that — the spec that resolves what may be said, and the
validator that reads the finished draft back.
"""
from __future__ import annotations

import pytest

from domain.services.opening_email import (
    blocking_violations,
    SIGN_OFF_NAME_PLACEHOLDER,
    SIGN_OFF_PLACEHOLDERS,
    build_opening_email_spec,
    format_spec_requirements,
    format_violations,
    strip_model_commentary,
    validate_opening_email,
)
from domain.services.supplier_facts import extract_supplier_facts


def _facts(target=90, opportunity=None, current=60):
    return extract_supplier_facts({
        "supplier": {"name": "Acme GmbH", "country": "Germany"},
        "target": {
            "targetPaymentTerms": target,
            "opportunityPaymentTerms": opportunity,
        },
        "spend": {
            # Current term = CONTRACTUAL. `actualPaymentTerms` is carried
            # alongside at the same value (a supplier we pay on terms), but it
            # is the contractual key the baseline now reads.
            "contractualPaymentTermsWithoutCashDiscount": current,
            "actualPaymentTerms": current,
        },
    })


def _spec(message="", instructions=None, **kwargs):
    return build_opening_email_spec(_facts(**kwargs), message, instructions)


def _email(
    subject="Payment Terms Standardisation of 90 Days Effective by [MM, DD, YYYY]",
    body=(
        "Dear Acme GmbH,\n\n"
        "We are standardising our payment terms from 60 days to 90 days.\n\n"
        "These updated terms will take effect by [MM, DD, YYYY].\n\n"
        "Kind regards,\nXXX\n[Company]"
    ),
):
    return f"Subject: {subject}\n\n{body}"


# ── The spec takes; it never makes ────────────────────────────────────────


def test_terms_come_straight_from_the_facts():
    spec = _spec(current=60, target=90)
    assert spec.current_term_days == 60
    assert spec.proposed_term_days == 90


def test_the_modelled_opportunity_is_the_ask_when_present():
    assert _spec(target=90, opportunity=105).proposed_term_days == 105


def test_the_negotiator_can_name_the_term_and_it_is_taken_verbatim():
    assert _spec("standardise them to 45 days").proposed_term_days == 45


def test_a_deadline_phrase_is_never_read_as_the_payment_term():
    """"within 14 days" is the confirmation window, not a 14-day term."""
    assert _spec("draft it, confirmation within 14 days").proposed_term_days == 90


def test_no_date_is_invented_when_none_was_supplied():
    """And no window either. There used to be a 14-day default, stated to the
    supplier as fact; the client's references print a placeholder instead."""
    spec = _spec("draft the opening email")
    assert spec.effective_date is None
    assert spec.has_effective_date is False
    assert spec.effective_window_days is None
    assert spec.deadline_is_placeholder
    assert spec.subject_line == (
        "Payment Terms Standardisation of 90 Days Effective by [MM, DD, YYYY]"
    )
    assert spec.deadline_instruction == (
        "These updated terms will take effect by [MM, DD, YYYY]."
    )


@pytest.mark.parametrize(
    "written",
    ["effective 1 March", "effective March 1", "effective 2026-03-01", "effective 01/03/2026"],
)
def test_a_negotiator_supplied_date_is_carried_through(written):
    spec = _spec(written)
    assert spec.has_effective_date
    assert spec.subject_line.startswith("Payment Terms Standardisation of 90 Days Effective ")


@pytest.mark.parametrize(
    "written",
    [
        "effective 19 Sept 2026",
        "effective 19, sept, 2026",
        "effective 19-Sep-2026",
        "effective Sept 19, 2026",
        "effective Sep-19-2026",
        "effective 19th September 2026",
    ],
)
def test_a_date_is_read_however_the_negotiator_punctuated_it(written):
    """A date typed with commas or hyphens is the same instruction as one typed with spaces.

    It used not to be: only whitespace separated the parts, so "19, sept, 2026"
    resolved to NO date, the spec fell back to the relative window, and the
    email announced "within 14 days" to a negotiator who had just written a
    calendar date.
    """
    spec = _spec(written)
    assert spec.has_effective_date
    assert "2026" in spec.subject_line


def test_a_day_figure_before_a_month_name_is_not_a_date():
    """The separator is one punctuation mark, so "14 days, September" stays two things."""
    spec = _spec("takes effect within 14 days, September at the latest")
    assert spec.effective_date == "September"


# ── The subject line the negotiator dictated ──────────────────────────────


def test_a_dictated_subject_is_used_verbatim():
    spec = _spec('please keep this subject "Payment Terms Standardisation of— 90 Days"')
    assert spec.subject_line == "Payment Terms Standardisation of— 90 Days"
    assert spec.subject_is_dictated


def test_a_labelled_subject_is_used_verbatim():
    spec = _spec("Subject: Notice of Payment Terms Change\nkeep the rest as it is")
    assert spec.subject_line == "Notice of Payment Terms Change"


def test_a_dictated_subject_carries_its_own_date_into_the_email():
    """The whole point of the request: the date they typed reaches the deadline sentence."""
    spec = _spec('keep this subject "Payment Terms Standardisation of — 90 Days Effective by 19, sept, 2026"')
    assert spec.effective_date == "19, sept, 2026"
    assert "19, sept, 2026" in spec.deadline_instruction


def test_a_figure_in_a_dictated_subject_is_not_stray():
    spec = _spec('use the subject "Payment Terms Standardisation of — 30 Days Notice"')
    draft = _email(
        subject=spec.subject_line,
        body=(
            "Dear Acme GmbH,\n\n"
            "We are standardising our payment terms from 60 days to 90 days.\n\n"
            "These updated terms will take effect by [MM, DD, YYYY].\n\n"
            "Kind regards,\nXXX\n[Company]"
        ),
    )
    assert validate_opening_email(draft, spec) == []
    assert spec.unplaced_day_figures == ()


def test_the_built_subject_still_stands_when_nobody_dictated_one():
    spec = _spec("write the opening email, and make it firm — this is not subject to debate")
    assert spec.subject_is_dictated is False
    assert spec.subject_line == (
        "Payment Terms Standardisation of — 90 Days Effective by [MM, DD, YYYY]"
    )


def test_no_contact_is_invented_when_none_was_supplied():
    spec = _spec("draft the opening email")
    assert spec.admin_contact is None
    assert spec.approved_contacts == frozenset()


def test_a_negotiator_supplied_contact_is_approved():
    spec = _spec("point them at ap@buyer.com for invoicing questions")
    assert spec.admin_contact == "ap@buyer.com"


def test_an_operator_instruction_can_supply_the_contact():
    spec = _spec("draft it", ["Always give AP as accounts.payable@buyer.com"])
    assert spec.admin_contact == "accounts.payable@buyer.com"


# ── A clean draft passes ──────────────────────────────────────────────────


def test_a_conforming_draft_has_no_violations():
    assert validate_opening_email(_email(), _spec()) == []


def test_a_conforming_draft_with_an_approved_date_and_contact_passes():
    spec = _spec("effective 1 March, invoicing questions to ap@buyer.com")
    draft = _email(
        subject=spec.subject_line,
        body=(
            "Dear Acme GmbH,\n\n"
            "We are changing your current payment terms of 60 days to a new "
            "standard term of 90 days.\n\n"
            "These updated terms will take effect by 1 March.\n\n"
            "For administrative points such as updating your systems, contact "
            "ap@buyer.com.\n\nKind regards,\nXXX\n[Company]"
        ),
    )
    assert validate_opening_email(draft, spec) == []


def test_an_approved_date_may_be_reformatted():
    """"2026-03-01" written back as "1 March 2026" is the same date, not a new one."""
    spec = _spec("effective 2026-03-01")
    draft = _email(
        subject=spec.subject_line,
        body="Dear Acme GmbH,\n\nWe are changing your current payment terms of 60 days "
        "to a new standard term of 90 days. These updated terms will take effect by "
        "1 March 2026.\n\nKind regards,\nXXX\n[Company]",
    )
    assert [v.code for v in validate_opening_email(draft, spec)] == []


# ── …and every way of going beyond the spec is caught ─────────────────────


def _codes(draft, spec):
    return {v.code for v in validate_opening_email(draft, spec)}


def test_an_invented_calendar_date_is_rejected():
    spec = _spec()
    draft = _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days, effective 1 March.\n\nKind regards,",
    )
    assert "invented_date" in _codes(draft, spec)


def test_a_bare_month_is_an_invented_date_too():
    spec = _spec()
    draft = _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days from March.\n\nKind regards,",
    )
    assert "invented_date" in _codes(draft, spec)


def test_a_date_other_than_the_approved_one_is_rejected():
    spec = _spec("effective 1 March")
    draft = _email(
        subject=spec.subject_line,
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days, effective 1 April.\n\nKind regards,",
    )
    assert "invented_date" in _codes(draft, spec)


def test_a_missing_deadline_is_rejected():
    spec = _spec()
    draft = _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days.\n\nKind regards,",
    )
    assert "missing_effective_date" in _codes(draft, spec)


def test_an_approved_date_that_never_made_it_into_the_draft_is_rejected():
    spec = _spec("effective 1 March")
    draft = _email(
        subject=spec.subject_line,
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days.\n\nKind regards,",
    )
    assert "missing_effective_date" in _codes(draft, spec)


def test_an_invented_contact_address_is_rejected():
    spec = _spec()
    draft = _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days. These updated terms will take effect by [MM, DD, YYYY]. For questions contact "
        "accounts.payable@acme-buyer.com.\n\nKind regards,",
    )
    assert "unsupported_contact" in _codes(draft, spec)


def test_a_contact_other_than_the_approved_one_is_rejected():
    spec = _spec("invoicing questions to ap@buyer.com")
    draft = _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days. These updated terms will take effect by [MM, DD, YYYY]. Contact "
        "someone.else@buyer.com.\n\nKind regards,",
    )
    assert "unsupported_contact" in _codes(draft, spec)


def test_a_term_that_does_not_match_the_facts_is_rejected():
    spec = _spec(target=90)
    draft = _email(
        subject="Payment Terms Standardisation of 75 Days Effective in 14 Days",
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 75 days, by [MM, DD, YYYY].\n\nKind regards,",
    )
    assert "term_mismatch" in _codes(draft, spec)


def test_a_stray_day_figure_is_rejected():
    """A "30-day transition" nobody authorised is a commitment to the supplier."""
    spec = _spec()
    draft = _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days, by [MM, DD, YYYY], after a 30 day "
        "transition.\n\nKind regards,",
    )
    assert "term_mismatch" in _codes(draft, spec)


@pytest.mark.parametrize(
    "sentence",
    [
        "We would like to move to 90 days.",
        "We propose 90 days.",
        "We request 90 days.",
        "We hope you will accept 90 days.",
        "We invite you to confirm 90 days.",
        "We are happy to discuss.",
        "Let us know your thoughts.",
    ],
)
def test_negotiation_language_is_rejected(sentence):
    spec = _spec()
    draft = _email(
        body=f"Dear Acme GmbH,\n\n{sentence} From 60 days to 90 days, within 14 days "
        "of the date of this email.\n\nKind regards,",
    )
    assert "negotiation_language" in _codes(draft, spec)


@pytest.mark.parametrize(
    "sentence",
    [
        "This is in line with industry practice.",
        "Our benchmark data supports 90 days.",
        "This reflects our peer group standard.",
        "This improves our working capital position.",
        "Given our annual spend with you, the change is modest.",
    ],
)
def test_justification_is_rejected(sentence):
    spec = _spec()
    draft = _email(
        body=f"Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        f"to 90 days. These updated terms will take effect by [MM, DD, YYYY]. {sentence}\n\n"
        "Kind regards,",
    )
    assert "justification" in _codes(draft, spec)


def test_a_reworded_subject_is_rejected():
    spec = _spec()
    draft = _email(subject="Payment Terms Proposal — For Your Consideration")
    assert "subject_mismatch" in _codes(draft, spec)


def test_a_missing_subject_is_rejected():
    spec = _spec()
    assert "subject_mismatch" in _codes("Dear Acme GmbH, ...", spec)


def test_subject_case_and_dash_style_are_not_the_point():
    spec = _spec()
    draft = _email(subject="payment terms standardisation of 90 days effective by [mm, dd, yyyy]")
    assert "subject_mismatch" not in _codes(draft, spec)


def test_an_empty_draft_is_rejected():
    assert [v.code for v in validate_opening_email("", _spec())] == ["empty_draft"]


def test_bracketed_placeholders_are_not_read_as_content():
    """"XXX" is a placeholder for the negotiator, not an invented contact."""
    spec = _spec()
    draft = _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days. These updated terms will take effect by [MM, DD, YYYY].\n\nKind regards,\n"
        "XXX\n[Company]",
    )
    assert validate_opening_email(draft, spec) == []


# ── The sign-off: placeholders unless someone supplied a sender ───────────


def _signed(signature: str) -> str:
    return _email(
        body="Dear Acme GmbH,\n\nWe are standardising our payment terms from 60 days "
        "to 90 days. These updated terms will take effect by [MM, DD, YYYY].\n\n"
        f"Kind regards,\n{signature}",
    )


def test_no_sender_is_invented_when_none_was_supplied():
    spec = _spec("draft the opening email")
    assert spec.approved_sender_lines == ()
    assert spec.has_sender is False


@pytest.mark.parametrize(
    "signature",
    [
        "The Purchasing Team",
        "Procurement Team",
        "Finance Team",
        "The Accounts Payable Department",
        "Supply Chain Team",
    ],
)
def test_an_assumed_team_identity_in_the_signoff_is_rejected(signature):
    assert "invented_sender" in _codes(_signed(signature), _spec())


def test_an_invented_person_in_the_signoff_is_rejected():
    spec = _spec()
    codes = _codes(_signed("Jane Doe\nHead of Procurement\nAcme Buying Ltd"), spec)
    assert "invented_sender" in codes


def test_dropping_the_placeholders_is_rejected_even_with_nothing_after_the_closing():
    spec = _spec()
    assert "missing_signoff_placeholder" in _codes(_signed(""), spec)


def test_a_partial_placeholder_block_is_rejected():
    spec = _spec()
    assert "missing_signoff_placeholder" in _codes(_signed("XXX"), spec)


def test_the_placeholder_block_passes():
    spec = _spec()
    assert validate_opening_email(_signed("XXX\n[Company]"), spec) == []


def test_the_signed_in_negotiators_name_never_signs_the_email():
    """Whoever is logged in is who is USING the assistant, not who is signing a
    letter to a supplier. The name line is XXX in every email."""
    spec = build_opening_email_spec(_facts(), "draft it", None, "Jane Doe")
    assert spec.sender_name is None
    assert spec.approved_sender_lines == ()
    assert validate_opening_email(_signed("XXX\n[Company]"), spec) == []
    assert "invented_sender" in _codes(_signed("Jane Doe\n[Company]"), spec)


@pytest.mark.parametrize(
    "message",
    [
        # A delivery method, not a person.
        "send it by email",
        "the notice is sent by post",
        # Nobody in particular.
        "the email is sent by us",
        "sent by our team",
    ],
)
def test_a_loose_sender_phrase_that_names_nobody_still_signs_XXX(message):
    """The looser patterns buy a real name, not any word after "by"."""
    spec = build_opening_email_spec(_facts(), message, None, "Jane Doe")
    assert spec.sender_name is None
    assert SIGN_OFF_NAME_PLACEHOLDER in spec.signoff_placeholders


def test_the_supplier_is_never_resolved_as_the_sender_name():
    """The most available organisation name in the request is the one name the
    signature can never carry — the loose patterns reach it, so they are told."""
    spec = build_opening_email_spec(
        _facts(), "we got an email sent by Acme GmbH", None, "Jane Doe"
    )
    assert spec.sender_name is None


def test_a_labelled_name_outranks_a_described_one():
    spec = _spec("sender name: Ahmed, and it was sent by Jane Doe")
    assert spec.sender_name == "Ahmed"


def test_a_dictated_sender_and_receiver_in_one_sentence_are_both_resolved():
    """Two fields in one sentence. The recipient capture runs to the end of the
    clause, so without a cut the greeting swallowed the sender's name AND the
    sender never reached its own resolver."""
    spec = _spec("the receiver is Pieter de Vries and the sender is Sadoon")
    assert spec.recipient_name == "Pieter de Vries"
    assert spec.sender_name == "Sadoon"


@pytest.mark.parametrize(
    "message",
    [
        "the receiver name is Pieter de Vries",
        "the receiver is Pieter de Vries",
        "receiver: Pieter de Vries",
        "recipient name is Pieter de Vries",
        "addressee: Pieter de Vries",
        "for the attention of Pieter de Vries",
    ],
)
def test_the_everyday_word_for_the_recipient_is_understood(message):
    """"receiver" is what negotiators type. Knowing only "recipient" and
    "contact" meant the greeting kept naming the company."""
    spec = build_opening_email_spec(_facts(), message, None, None)
    assert spec.recipient_name == "Pieter de Vries"
    assert spec.greeting_addressee == "Pieter de Vries"


def test_a_display_name_that_is_really_an_email_address_is_not_a_signature():
    spec = build_opening_email_spec(_facts(), "draft it", None, "jane.doe@buyer.com")
    assert spec.approved_sender_lines == ()


def test_a_dictated_signoff_splits_the_name_from_the_title():
    """"sign it off as Jane Doe, Head of Procurement" is a name then a title,
    in signature order."""
    spec = _spec("sign it off as Jane Doe, Head of Procurement")
    assert spec.sender_name == "Jane Doe"
    assert spec.sender_title == "Head of Procurement"
    assert spec.approved_sender_lines == ("Jane Doe", "Head of Procurement")
    assert validate_opening_email(
        _signed("Jane Doe\nHead of Procurement\n[Company]"), spec
    ) == []
    assert "invented_sender" in _codes(
        _signed("Bob Smith\nHead of Procurement\n[Company]"), spec
    )


def test_a_sender_other_than_the_approved_one_is_still_rejected():
    spec = build_opening_email_spec(_facts(), "draft it", None, "Jane Doe")
    assert "invented_sender" in _codes(_signed("John Smith\n[Company]"), spec)


# ── The name line: XXX unless the negotiator wrote a name ─────────────────
#
# One source, and only one: the negotiator writing it out. What the XXX default
# exists to stop is a name nobody chose — the signed-in display name signing a
# letter to a supplier because it happened to be the account in front of the
# assistant. A name typed into the request is the opposite of that.


@pytest.mark.parametrize(
    "message, user_name",
    [
        ("draft it", None),
        ("draft it", "Jane Doe"),
        # A name in the request that is not being offered as the SENDER's. It is
        # the person the email is addressed TO.
        ("my contact is CEO Starbucks Paul Bremer", "Jane Doe"),
        # Talking about the name is not supplying one.
        ("the sender name should be obvious", "Jane Doe"),
    ],
)
def test_the_signature_name_is_never_taken_from_who_is_logged_in(message, user_name):
    spec = build_opening_email_spec(_facts(), message, None, user_name)
    assert spec.sender_name is None
    assert SIGN_OFF_NAME_PLACEHOLDER in spec.signoff_placeholders
    assert not any(
        "jane doe" in line.casefold() or "bob smith" in line.casefold()
        for line in spec.approved_sender_lines
    )


@pytest.mark.parametrize(
    "message",
    [
        "sender name: Ahmed",
        "sender name Ahmed",
        "write a very strong email by the sender name Ahmed",
        "my name is Ahmed",
        "sign it off as Ahmed",
        # Said as a description of the email rather than as a field. This is
        # how it is actually typed, and it used to name nobody: the draft came
        # back signed XXX with nothing saying why.
        "write an email sent by Ahmed for extending payment terms",
        "the email is sent by Ahmed",
        "the email should be signed by Ahmed",
        "sender is Ahmed",
        "the sender is Ahmed",
        "sender: Ahmed",
    ],
)
def test_a_name_the_negotiator_wrote_out_is_the_one_that_signs(message):
    spec = build_opening_email_spec(_facts(), message, None, "Jane Doe")
    assert spec.sender_name == "Ahmed"
    assert "Ahmed" in spec.approved_sender_lines
    # Supplied, so it no longer needs its placeholder — and the draft may sign it.
    assert SIGN_OFF_NAME_PLACEHOLDER not in spec.signoff_placeholders
    assert validate_opening_email(_signed("Ahmed\n[Company]"), spec) == []


@pytest.mark.parametrize(
    "message",
    [
        'use the name as "Amaan"',
        'the sender name should be "Amaan"',
        "the sender name should be Amaan",
        "use the name as Amaan",
        'sender name: "Amaan"',
    ],
)
def test_the_name_is_read_however_the_instruction_was_phrased(message):
    """Quotation marks and "should be" are how the instruction is actually typed.

    Both used to miss: the capture could not see past a quote, and "should" was
    treated as the start of the next clause, so the most explicit phrasing there
    is — the name in quotation marks — resolved to nobody.
    """
    assert build_opening_email_spec(_facts(), message, None, "Jane Doe").sender_name == "Amaan"


def test_a_dictated_name_stops_at_the_next_clause():
    """"sender name Ahmed with date effective 10-10-2026" is the name "Ahmed"."""
    spec = _spec("write a strong email by the sender name Ahmed with date effective 10-10-2026")
    assert spec.sender_name == "Ahmed"
    assert spec.effective_date == "10-10-2026"


def test_the_name_placeholder_is_the_clients_own_XXX():
    """Their five reference emails sign XXX. The signature the assistant
    produces is the signature they already send."""
    assert SIGN_OFF_NAME_PLACEHOLDER == "XXX"
    assert SIGN_OFF_PLACEHOLDERS[0] == "XXX"


def test_a_signature_that_keeps_XXX_passes_and_one_that_replaces_it_does_not():
    """With nobody named, XXX is the signature and a name is an invented sender."""
    spec = build_opening_email_spec(_facts(), "draft it", None, "Jane Doe")
    assert validate_opening_email(_signed("XXX\n[Company]"), spec) == []
    codes = _codes(_signed("Jane Doe\n[Company]"), spec)
    assert "invented_sender" in codes
    assert "missing_signoff_placeholder" in codes


def test_the_drafter_is_told_the_name_is_static_not_missing():
    """"NOT PROVIDED" reads as a gap waiting to be filled, which is how a name
    gets written into it."""
    from domain.services.brief_builder import brief_from
    from utils.prompts.draft_opening_email_prompt import _email_data_block

    facts = _facts()
    block = _email_data_block(
        brief_from(facts), {}, build_opening_email_spec(facts, "draft it", None, "Jane Doe")
    )
    assert "Sender name    : XXX — ALWAYS." in block
    assert "Sender name    : NOT PROVIDED" not in block


# ── The sender company is not the supplier's ──────────────────────────────


def test_the_supplier_name_is_never_the_sender_company():
    """The most available organisation name in the prompt is the one company
    the sign-off can never be."""
    spec = _spec()
    assert spec.sender_company is None
    assert "supplier_name_as_sender" in _codes(
        _signed("XXX\nAcme GmbH"), spec
    )


def test_the_supplier_name_is_rejected_even_without_its_legal_form():
    spec = _spec()
    assert "supplier_name_as_sender" in _codes(
        _signed("XXX\nAcme"), spec
    )


def test_the_supplier_name_is_rejected_even_when_a_sender_name_exists():
    spec = build_opening_email_spec(_facts(), "draft it", None, "Jane Doe")
    assert "supplier_name_as_sender" in _codes(
        _signed("Jane Doe\nAcme GmbH"), spec
    )


def test_an_explicit_sender_company_is_used_and_drops_its_placeholder():
    spec = _spec("sender company: Northwind Retail")
    assert spec.sender_company == "Northwind Retail"
    assert spec.signoff_placeholders == ("XXX",)
    assert validate_opening_email(
        _signed("XXX\nNorthwind Retail"), spec
    ) == []


def test_a_buyer_that_really_shares_the_suppliers_name_may_be_stated():
    """The escape hatch: it is only banned because nobody supplied it."""
    spec = _spec("sender company: Acme GmbH")
    assert "supplier_name_as_sender" not in _codes(
        _signed("XXX\nAcme GmbH"), spec
    )


def test_a_dictated_signoff_splits_name_title_and_company():
    spec = _spec("sign it off as Jane Doe, Head of Procurement, Northwind Ltd")
    assert (spec.sender_name, spec.sender_title, spec.sender_company) == (
        "Jane Doe", "Head of Procurement", "Northwind Ltd",
    )
    # Name and company supplied, so no placeholder is left to keep — and the
    # title is not a placeholder any more, it is a line only a dictated title
    # puts there.
    assert spec.signoff_placeholders == ()
    assert "Jane Doe" in spec.approved_sender_lines


def test_only_the_unsupplied_fields_keep_placeholders():
    """Name and company are placeholders until someone supplies them. The title
    has none: unsupplied, the signature simply has no title line."""
    spec = _spec("sender company: Northwind Retail, title: Head of Procurement")
    assert spec.signoff_placeholders == ("XXX",)
    assert validate_opening_email(
        _signed("XXX\nNorthwind Retail\nHead of Procurement"), spec
    ) == []


def test_the_name_placeholder_is_required_when_everything_but_the_name_was_supplied():
    spec = build_opening_email_spec(
        _facts(),
        "sender company: Northwind Retail, title: Head of Procurement",
        None,
        "Jane Doe",
    )
    assert "XXX" in spec.signoff_placeholders
    assert "missing_signoff_placeholder" in _codes(
        _signed("Jane Doe\nNorthwind Retail\nHead of Procurement"), spec
    )


def test_a_team_identity_is_rejected_even_when_a_real_sender_exists():
    """"Kind regards, Jane Doe, The Procurement Team" is still a team nobody signed."""
    spec = build_opening_email_spec(_facts(), "draft it", None, "Jane Doe")
    assert "invented_sender" in _codes(_signed("Jane Doe\nThe Procurement Team"), spec)


# ── What the model is told when it fails ──────────────────────────────────


def test_the_feedback_names_the_rule_and_restates_the_approved_values():
    """The two halves of what a failed draft is told: WHICH rules it broke, and
    the full set of values it may use instead. Both go into the correction
    prompt (`build_email_correction_prompt`) — the rules so the model knows what
    to change, the values so it never has to supply one of its own."""
    spec = _spec()
    draft = _email(
        body="Dear Acme GmbH,\n\nWe would like to move to 90 days, effective 1 March.\n\n"
        "Kind regards,",
    )
    violations = validate_opening_email(draft, spec)

    named = format_violations(violations)
    assert "invented_date" in named
    assert "negotiation_language" in named

    permitted = format_spec_requirements(spec)
    assert "no calendar date, month name or year" in permitted
    assert "omit the contact sentence entirely" in permitted

# ── Who the email greets ───────────────────────────────────────────────────
#
# From a real transcript. "my contact is CEO Starbucks Paul Bremer" was answered
# with "the provided data does not contain information regarding the CEO of
# Starbucks Coffee CO" — the assistant reading a value being HANDED to it as a
# question it could not answer. There was no field for a contact person, so the
# sentence had nowhere to land.


def test_a_named_contact_is_lifted_from_the_negotiators_words():
    """The transcript verbatim, against the supplier it was written for. The
    phrase carries a title, the company already on file, and the name."""
    facts = extract_supplier_facts({
        "supplier": {"name": "Starbucks Coffee CO", "country": "US"},
        "target": {"targetPaymentTerms": 90},
        "spend": {"contractualPaymentTermsWithoutCashDiscount": 28},
    })
    spec = build_opening_email_spec(facts, "my contact is CEO Starbucks Paul Bremer")
    assert spec.recipient_name == "Paul Bremer"
    assert spec.recipient_title == "CEO"
    assert spec.has_recipient is True


def test_naming_a_ceo_contact_is_not_a_request_for_the_executive_message():
    """"CEO" in a contact phrase used to select the senior-management variant —
    a different document, sent over senior management's name, because the
    negotiator mentioned a job title."""
    from domain.services.opening_email_templates import EmailTemplate

    spec = _spec("my contact is CEO Paul Bremer")
    assert spec.template is EmailTemplate.STANDARD
    assert _spec("suggest a message from the CEO").template is (
        EmailTemplate.SENIOR_MANAGEMENT
    )


@pytest.mark.parametrize(
    "message",
    [
        "my contact is Paul Bremer",
        "our contact is Paul Bremer",
        "the recipient is Paul Bremer",
        "address it to Paul Bremer",
        "address the email to Paul Bremer",
        "send it to Paul Bremer",
        "recipient: Paul Bremer",
    ],
)
def test_the_contact_is_recognised_however_it_is_phrased(message):
    assert _spec(message).recipient_name == "Paul Bremer"


def test_the_suppliers_own_name_is_dropped_from_the_contact_phrase():
    """"CEO Starbucks Paul Bremer" carries a title, a company we already hold,
    and the name. Only the name is new."""
    assert _spec("my contact is Paul Bremer, Acme GmbH").recipient_name == "Paul Bremer"


def test_no_contact_person_means_no_contact_person():
    spec = _spec("draft the opening email")
    assert spec.recipient_name is None
    assert spec.greeting_addressee == "Acme GmbH"


def _greeted(name: str) -> str:
    return _email(
        body=(
            f"Dear {name},\n\n"
            "We are standardising our payment terms from 60 days to 90 days.\n\n"
            "These updated terms will take effect by [MM, DD, YYYY].\n\n"
            "Kind regards,\nXXX\n[Company]"
        )
    )


@pytest.mark.parametrize("greeting", ["Paul Bremer", "Mr Bremer", "Paul"])
def test_the_greeting_addresses_the_named_contact(greeting):
    """Matched word by word: the form of address is the model's business, WHO
    is addressed is not. Regenerating over "Mr Bremer" would cost a round-trip
    and teach it nothing."""
    spec = _spec("my contact is CEO Paul Bremer")
    assert validate_opening_email(_greeted(greeting), spec) == []


def test_greeting_someone_else_than_the_named_contact_is_rejected():
    spec = _spec("my contact is Paul Bremer")
    violations = validate_opening_email(_greeted("Ms Schmidt"), spec)
    assert any(v.code == "wrong_recipient" for v in violations)


def test_an_invented_contact_person_is_rejected():
    """The sign-off has been guarded against an invented sender since a draft
    signed itself "The Purchasing Team". This is the same failure at the top of
    the email, and it reaches a real inbox."""
    violations = validate_opening_email(_greeted("Mr Johnson"), _spec(""))
    assert any(v.code == "invented_recipient" for v in violations)


@pytest.mark.parametrize(
    "greeting",
    ["Acme GmbH Team", "Acme", "Supplier", "Valued Supplier Partner", "Sir or Madam"],
)
def test_addressing_the_company_or_nobody_is_always_fine(greeting):
    assert validate_opening_email(_greeted(greeting), _spec("")) == []


def test_a_recipient_address_is_not_reprinted_as_our_own_contact():
    """"send it to paul@…" says who the email GOES to. The administrative
    contact is the buyer's own address, printed for the supplier to write to."""
    assert _spec("send it to paul.bremer@acme.example").admin_contact is None


# ── Firm is not the same as threatening ────────────────────────────────────


@pytest.mark.parametrize(
    "sentence",
    [
        "There will be no exceptions or negotiations regarding this change.",
        "We require strict compliance with this new standard.",
        "This change is non-negotiable.",
        "Failure to comply will be escalated.",
        "We will suspend new orders until this is agreed.",
    ],
)
def test_a_strong_email_never_becomes_a_threatening_one(sentence):
    """Asked for a "strong" email a real draft answered with "We require strict
    compliance … There will be no exceptions or negotiations" — a consequence
    the buyer never authorised, to a supplier who had said nothing yet."""
    violations = validate_opening_email(_email() + f"\n\n{sentence}", _spec(""))
    assert any(v.code == "escalation" for v in violations)


@pytest.mark.parametrize(
    "message",
    [
        "draft the opening email",
        "write a longer email",
        "write a collaborative version",
        "formal message from senior management",
    ],
)
def test_no_template_unlocks_a_threat(message):
    spec = _spec(message)
    violations = validate_opening_email(
        _email() + "\n\nThis change is non-negotiable.", spec
    )
    assert any(v.code == "escalation" for v in violations)


# ── The model's own commentary never reaches the negotiator ────────────────


def test_a_preamble_reporting_what_the_model_did_is_cut():
    """Real draft, headed "Recipient changed to Paul Bremer, CEO, Starbucks
    Coffee CO." — the model narrating its own work above the email the
    negotiator copies into their mail client."""
    spec = _spec("my contact is Paul Bremer")
    body = _greeted("Paul Bremer")
    noisy = f"Recipient changed to Paul Bremer, CEO, Acme GmbH.\n\n{body}"
    assert strip_model_commentary(noisy, spec) == body
    assert validate_opening_email(strip_model_commentary(noisy, spec), spec) == []


def test_a_closing_offer_to_revise_is_cut():
    spec = _spec("")
    body = _email()
    noisy = f"{body}\n\nLet me know if you would like a different register."
    assert strip_model_commentary(noisy, spec) == body


def test_a_clean_draft_is_returned_untouched():
    assert strip_model_commentary(_email(), _spec("")) == _email()


def test_a_stray_title_placeholder_is_cut_from_the_signature():
    """The signature has no title line. `[Title]` sat under every email for
    months, so a model still writes it — cut, not failed on: it is a leftover
    bracket, and regenerating over one buys a second draft with the same line."""
    spec = _spec("")
    with_title = f"{_email()}\n[Title]"
    assert strip_model_commentary(with_title, spec) == _email()


def test_the_title_placeholder_is_cut_from_a_draft_with_no_recognisable_start():
    """The bracket goes even where the commentary strip fails open."""
    odd = "Sehr geehrte Damen und Herren,\n\nWir stellen um.\n\nXXX\n[Company]\n[Title]"
    assert strip_model_commentary(odd, _spec("")) == odd.replace("\n[Title]", "")


def test_a_dictated_title_still_signs_the_email():
    """Removing the placeholder removed a slot nobody asked for, not the
    negotiator's own instruction."""
    spec = _spec("sender company: Northwind Retail, title: Head of Procurement")
    assert spec.sender_title == "Head of Procurement"
    assert "Head of Procurement" in spec.approved_sender_lines
    assert validate_opening_email(
        _signed("XXX\nNorthwind Retail\nHead of Procurement"), spec
    ) == []


def test_no_reference_email_shows_a_title_line():
    """The senior-management reference was the last one carrying it, and the
    drafter copies what the reference shows."""
    from domain.services.opening_email_templates import EmailTemplate, get_template

    for template in EmailTemplate:
        assert "[Title]" not in get_template(template).reference


def test_nothing_is_cut_from_a_draft_with_no_recognisable_start():
    """Fail-open: a draft this module cannot parse is passed through whole
    rather than trimmed on a guess."""
    odd = "Sehr geehrte Damen und Herren,\n\nWir stellen um.\n\nMit freundlichen Grüßen"
    assert strip_model_commentary(odd, _spec("")) == odd


# ── What the negotiator said on an earlier turn ───────────────────────────
#
# From a real transcript, three turns of it. They gave the date on one turn and
# corrected the sign-off name on the next; the name was applied and the date
# reverted to "within 14 days", because the spec was resolved from that turn's
# message and nothing else.


def _pasted_draft(subject, deadline):
    return (
        f"Subject:{subject}\n\nDear Acme GmbH,\n\n"
        "We are changing your current payment terms of 60 days to a new standard "
        f"term of 90 days. These updated terms will take effect {deadline}.\n\n"
        "Kind Regards\n\nXXX\n\n[Company]\n"
    )


def test_a_value_given_on_an_earlier_turn_survives_the_next_one():
    first = 'use the name as "Amaan" and effective date should be 14-11-2027'
    second = 'I mean the sender name should be "Amaan"\n' + _pasted_draft(
        "Payment Terms Standardisation of — 90 Days Effective in 14 Days",
        "by [MM, DD, YYYY]",
    )
    spec = build_opening_email_spec(
        _facts(), second, None, "Jane Doe", previous_messages=[first]
    )
    assert spec.sender_name == "Amaan"
    assert spec.effective_date == "14-11-2027"


def test_this_turn_outranks_an_earlier_one():
    spec = build_opening_email_spec(
        _facts(),
        "actually make it effective 1 March 2027",
        None,
        "Jane Doe",
        previous_messages=["effective 14-11-2027, sender name: Amaan"],
    )
    assert spec.effective_date == "1 March 2027"
    # …and what this turn did not mention is still carried.
    assert spec.sender_name == "Amaan"


def test_a_draft_pasted_back_is_read_after_the_negotiators_own_words():
    """The paste is the email being complained about, not the instruction."""
    message = "the date should be 1 March 2027\n" + _pasted_draft(
        "Payment Terms Standardisation of — 90 Days Effective 14-11-2027",
        "by 14-11-2027",
    )
    spec = build_opening_email_spec(_facts(), message, None, "Jane Doe")
    assert spec.effective_date == "1 March 2027"
    # The date in the paste is still approved text — the draft may repeat it
    # without being regenerated for inventing it.
    assert any("14-11-2027" in d for d in spec.approved_date_text)


def test_a_pasted_subject_is_not_a_dictated_one():
    message = "the sender name should be Amaan\n" + _pasted_draft(
        "Payment Terms Standardisation of — 90 Days Effective in 14 Days",
        "by [MM, DD, YYYY]",
    )
    spec = build_opening_email_spec(_facts(), message, None, "Jane Doe")
    assert spec.subject_is_dictated is False


def test_a_day_figure_inside_a_pasted_draft_is_not_reported_as_unplaced():
    message = "the sender name should be Amaan\n" + _pasted_draft(
        "Payment Terms Standardisation of — 90 Days Effective in 30 Days",
        "within 30 days of the date of this email",
    )
    spec = build_opening_email_spec(_facts(), message, None, "Jane Doe")
    assert spec.unplaced_day_figures == ()


def test_an_instruction_typed_under_a_pasted_draft_is_still_read():
    """They paste the draft and then say what is wrong with it, below."""
    message = _pasted_draft(
        "Payment Terms Standardisation of — 90 Days Effective in 14 Days",
        "by [MM, DD, YYYY]",
    ) + '\nI mean the sender name should be "Amaan"'
    spec = build_opening_email_spec(_facts(), message, None, "Jane Doe")
    assert spec.sender_name == "Amaan"


def test_nothing_is_inherited_when_the_caller_passes_nothing():
    """The node passes the thread only once an email exists to adjust."""
    spec = build_opening_email_spec(_facts(), "draft the opening email", None, "Jane Doe")
    assert spec.effective_date is None
    assert spec.sender_name is None


# ── The body is the client's wording ──────────────────────────────────────
#
# The five reference emails are the client's approved text. "Follow its shape
# and register" is what the prompt used to ask for, and shape is not wording:
# what came back was fluent prose that resembled the reference and reproduced
# almost none of it.


def _reference_draft(spec, body):
    return f"Subject: {spec.subject_line}\n\nDear Acme GmbH,\n\n{body}\n\nKind Regards\nXXX\n[Company]"


_REFERENCE_BODY = (
    "As part of our ongoing standardisation of payment terms across our supplier "
    "base, we are formally notifying you of an update to your payment terms.\n\n"
    "We are changing your current payment terms of 60 days to a new standard term "
    "of 90 days. We value our partnership and want to ensure a smooth transition. "
    "These updated terms will take effect by [MM, DD, YYYY].\n\n"
    "Thank you for your attention to this matter."
)


def test_the_clients_own_wording_passes():
    spec = _spec()
    assert validate_opening_email(_reference_draft(spec, _REFERENCE_BODY), spec) == []


def test_sentences_the_model_wrote_itself_are_caught():
    """Real drift, from a real draft: two sentences nobody approved."""
    spec = _spec()
    body = (
        "Your payment terms are being updated to 90 days.\n\n"
        "As part of our ongoing standardisation of payment terms across our "
        "supplier base, we are formally notifying you of this change. We are "
        "changing your current payment terms of 60 days to the new standard term "
        "of 90 days. These updated terms will take effect within 14 days of the "
        "date of this email.\n\n"
        "Please update your records to reflect the new terms."
    )
    violation = next(
        v for v in validate_opening_email(_reference_draft(spec, body), spec)
        if v.code == "off_template"
    )
    assert "Your payment terms are being updated to 90 days." in violation.detail
    assert "Please update your records to reflect the new terms." in violation.detail
    # …and the sentences it DID take from the reference are not reported.
    assert "formally notifying you of this change" not in violation.detail


def test_a_shortened_reference_sentence_is_still_the_reference():
    """A firm email is the reference with the cushioning cut, not new prose."""
    spec = _spec("make it stronger")
    body = (
        "As part of our ongoing standardisation of payment terms across our "
        "supplier base, we are formally notifying you of an update to your "
        "payment terms.\n\n"
        "We are changing your current payment terms of 60 days to a new standard "
        "term of 90 days. These updated terms will take effect within 14 days of "
        "the date of this email.\n\nThank you."
    )
    assert "off_template" not in _codes(_reference_draft(spec, body), spec)


def test_asking_for_wording_of_their_own_releases_the_reference():
    """The one thing that unlocks it — and only for the turn that asked."""
    spec = _spec("mention that we have been a customer for ten years")
    assert spec.content_directed
    body = _REFERENCE_BODY + "\n\nWe have been a customer of yours for ten years."
    assert "off_template" not in _codes(_reference_draft(spec, body), spec)

    unasked = _spec("draft the opening email")
    assert unasked.content_directed is False
    assert "off_template" in _codes(_reference_draft(unasked, body), unasked)


@pytest.mark.parametrize(
    "message",
    [
        "add a line about the transition support",
        "don't say we value the partnership",
        "please mention our new AP system",
        "leave out the thanks",
        "reword the second paragraph",
    ],
)
def test_content_instructions_are_recognised(message):
    assert _spec(message).content_directed


@pytest.mark.parametrize(
    "message",
    [
        "draft the opening email",
        "make it stronger",
        'the sender name should be "Amaan"',
        "effective 14-11-2027",
        "write a longer email",
    ],
)
def test_a_value_or_a_register_is_not_a_content_instruction(message):
    assert _spec(message).content_directed is False


def test_a_translated_draft_is_not_checked_against_an_english_reference():
    spec = build_opening_email_spec(_facts(), "write it in German", language="German")
    body = (
        "Im Rahmen unserer laufenden Standardisierung der Zahlungsbedingungen "
        "informieren wir Sie hiermit ueber eine Aenderung. Die neuen Bedingungen "
        "von 90 Tagen treten innerhalb von 14 Tagen in Kraft."
    )
    assert "off_template" not in _codes(_reference_draft(spec, body), spec)


def test_off_template_never_labels_a_draft():
    """It buys a regeneration and nothing else: an email that is right except
    for its register is not one the negotiator should be warned about."""
    spec = _spec()
    violations = validate_opening_email(
        _reference_draft(spec, "Please update your records to reflect the new terms."),
        spec,
    )
    assert [v.code for v in violations if v.code == "off_template"] == ["off_template"]
    assert "off_template" not in [v.code for v in blocking_violations(violations)]


# ── Asking for a different subject ────────────────────────────────────────
#
# Reported: "when i ask to change the subject it doesn't do that". Only two
# shapes were recognised — a quoted subject and a "Subject:" label — so every
# plain-English way of asking was read as no instruction at all.


@pytest.mark.parametrize(
    "message, expected",
    [
        ("change the subject to Payment Terms Notice", "Payment Terms Notice"),
        ("change the subject line to Payment Terms Notice", "Payment Terms Notice"),
        ("make the subject Payment Terms Notice", "Payment Terms Notice"),
        ("use the subject Payment Terms Notice", "Payment Terms Notice"),
        ("keep the subject as Payment Terms Notice", "Payment Terms Notice"),
        ("the subject should be Payment Terms Notice", "Payment Terms Notice"),
        ("set subject: Payment Terms Notice", "Payment Terms Notice"),
        ('change the subject to "Payment Terms Notice"', "Payment Terms Notice"),
    ],
)
def test_a_subject_change_is_read_however_it_is_asked(message, expected):
    spec = _spec(message)
    assert spec.subject_line == expected
    assert spec.subject_is_dictated


def test_a_trailing_instruction_is_not_part_of_the_subject():
    spec = _spec("change the subject to Payment Terms Notice and make it firmer")
    assert spec.subject_line == "Payment Terms Notice"
    assert spec.is_firm


@pytest.mark.parametrize(
    "message",
    [
        # Talking about the subject without supplying one.
        "keep the subject as it is",
        "make the subject shorter",
        # The banned phrase, which a looser pattern would read as a subject.
        "tell them this is not subject to negotiation",
        "the change is subject to your agreement",
    ],
)
def test_talking_about_the_subject_is_not_dictating_one(message):
    assert _spec(message).subject_is_dictated is False


def test_changing_the_subject_keeps_the_variant_being_adjusted():
    """A part-edit is an adjustment: it must not silently return the default
    email in place of the one on screen."""
    from domain.services.opening_email_templates import EmailTemplate

    spec = build_opening_email_spec(
        _facts(),
        "change the subject to Payment Terms Notice",
        previous_template=EmailTemplate.LONGER,
    )
    assert spec.template is EmailTemplate.LONGER


# ── No date supplied means no deadline invented ───────────────────────────
#
# There used to be a DEFAULT_EFFECTIVE_WINDOW_DAYS = 14: with no date, the email
# told the supplier the change took effect "within 14 days of the date of this
# email". That number is in none of the client's five references — their wording
# is "These updated terms will take effect by [MM, DD, YYYY]" — so every email
# sent without a date carried a deadline nobody had approved.


def test_with_nothing_supplied_the_deadline_stays_the_clients_placeholder():
    spec = _spec("draft an email")
    assert spec.deadline_is_placeholder
    assert spec.subject_line.endswith("Effective by [MM, DD, YYYY]")
    assert spec.deadline_instruction == (
        "These updated terms will take effect by [MM, DD, YYYY]."
    )
    assert validate_opening_email(_reference_draft(spec, _REFERENCE_BODY), spec) == []


def test_no_window_is_invented_to_fill_the_gap():
    spec = _spec("draft an email")
    assert spec.effective_window_days is None
    assert spec.has_effective_window is False
    # …and 14 is not a figure the email may state any more.
    assert 14 not in spec.allowed_day_figures


def test_a_draft_that_invents_a_window_is_rejected():
    spec = _spec("draft an email")
    body = (
        "As part of our ongoing standardisation of payment terms across our "
        "supplier base, we are formally notifying you of an update to your "
        "payment terms.\n\n"
        "We are changing your current payment terms of 60 days to a new standard "
        "term of 90 days. These updated terms will take effect within 14 days of "
        "the date of this email."
    )
    codes = _codes(_reference_draft(spec, body), spec)
    assert "missing_effective_date" in codes  # the placeholder never survived
    assert "term_mismatch" in codes           # and 14 is a figure nobody supplied


def test_a_supplied_date_replaces_the_placeholder():
    spec = _spec("draft an email, effective 14-11-2027")
    assert spec.deadline_is_placeholder is False
    assert spec.subject_line.endswith("Effective by 14-11-2027")
    assert "[MM, DD, YYYY]" not in spec.deadline_instruction


def test_a_window_the_negotiator_asked_for_is_still_honoured():
    """The relative wording did not go away — only the default that nobody asked
    for. "in 45 days" is information the negotiator supplied."""
    spec = _spec("draft an email, effective in 45 days")
    assert spec.effective_window_days == 45
    assert spec.deadline_is_placeholder is False
    assert "within 45 days" in spec.deadline_instruction
    assert 45 in spec.allowed_day_figures


def test_the_placeholder_must_reach_the_body_not_just_the_subject():
    """The subject carries the deadline too, and a subject alone is not the
    sentence the supplier acts on."""
    spec = _spec("draft an email")
    body = (
        "As part of our ongoing standardisation of payment terms across our "
        "supplier base, we are formally notifying you of an update to your "
        "payment terms.\n\n"
        "We are changing your current payment terms of 60 days to a new standard "
        "term of 90 days."
    )
    assert "missing_effective_date" in _codes(_reference_draft(spec, body), spec)
