"""The draft_opening_email node: spec in, validated email out.

The node is the only place where the check has teeth — it regenerates a draft
that broke the spec, and labels one that broke it twice rather than handing the
negotiator something that looks ready to send.
"""
from __future__ import annotations

from typing import Any

import pytest

from agents.nodes.draft_opening_email import make_draft_opening_email_node
from domain.services.context_builder import build_supplier_context
from domain.services.email_dictation import DictatedValues
from utils.prompts.email_dictation_prompt import DICTATION_PROMPT_HEADING

_GOOD = (
    "Subject: Payment Terms Standardisation of 75 Days Effective by [MM, DD, YYYY]\n\n"
    "Dear U.S. Foodservice,\n\n"
    "We are standardising our payment terms from 34 days to 75 days.\n\n"
    "These updated terms will take effect by [MM, DD, YYYY].\n\n"
    "Kind regards,\nXXX\n[Company]"
)

_BAD = (
    "Subject: Payment Terms Proposal\n\n"
    "Dear U.S. Foodservice,\n\n"
    "We would like to move to 75 days, effective 1 March, in line with industry "
    "practice. Please contact ap@invented-buyer.com.\n\n"
    "Kind regards,\n\nThe Purchasing Team"
)


class _ScriptedLLM:
    """Returns the next scripted draft per DRAFTING call, recording each.

    The node makes two kinds of call. First it reads the negotiator's request
    for dictated values (`domain.services.email_dictation`), then it drafts —
    and, when the draft fails validation, corrects. Those are different jobs
    with different prompts, so they are recorded separately: `calls` is the
    drafting/correction sequence every test here reasons about, and
    `dictation_calls` is the reading.

    Keeping the reading out of `calls` is not bookkeeping. A test that says
    "the retry prompt is calls[1]" is making a claim about the drafting
    sequence, and it should keep meaning that whatever helper calls the node
    makes around it.
    """

    def __init__(self, *drafts: str, dictated: str = "{}") -> None:
        self._drafts = list(drafts)
        self._dictated = dictated
        self.calls: list[dict[str, Any]] = []
        self.dictation_calls: list[dict[str, Any]] = []

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        if prompt.startswith(DICTATION_PROMPT_HEADING):
            self.dictation_calls.append({"prompt": prompt, **kwargs})
            return self._dictated
        self.calls.append({"prompt": prompt, **kwargs})
        return self._drafts[min(len(self.calls) - 1, len(self._drafts) - 1)]


def _payload(target=None, opportunity=76, current=34) -> dict[str, Any]:
    return {
        "supplier": {
            "name": "U.S. Foodservice", "uuid": "u1", "country": "US",
            "mainIndustryName": "Foodservice", "companySize": "LARGE",
            "spendVolume": 12852649.0,
        },
        "target": {"targetPaymentTerms": target, "opportunityPaymentTerms": opportunity},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": current,
            "actualPaymentTerms": current,
        },
        "agreement": {},
        "negotiationStrategy": {"industryRegionStandard": {"value": 40}},
    }


async def _run(llm, message="draft the opening email", user_name=None, **payload_kwargs):
    node = make_draft_opening_email_node(llm)
    return await node({
        "message": message,
        "user_name": user_name,
        "context": build_supplier_context(_payload(**payload_kwargs)),
    })


@pytest.mark.asyncio
async def test_a_clean_draft_is_returned_after_one_call():
    llm = _ScriptedLLM(_GOOD)
    result = await _run(llm)
    assert len(llm.calls) == 1
    assert result["response"].startswith("Subject: Payment Terms Standardisation")
    assert "errors" not in result


@pytest.mark.asyncio
async def test_nothing_is_streamed_so_a_rejected_draft_never_reaches_the_screen():
    llm = _ScriptedLLM(_GOOD)
    await _run(llm)
    assert llm.calls[0]["stream_to_client"] is False


@pytest.mark.asyncio
async def test_a_violating_draft_is_regenerated_with_the_violations_quoted_back():
    llm = _ScriptedLLM(_BAD, _GOOD)
    result = await _run(llm)

    assert len(llm.calls) == 2
    retry_prompt = llm.calls[1]["prompt"]
    # Every fault is named.
    assert "invented_date" in retry_prompt
    assert "unsupported_contact" in retry_prompt
    assert "negotiation_language" in retry_prompt
    assert "justification" in retry_prompt
    assert "invented_sender" in retry_prompt
    # It is a CORRECTION pass, not a second draft: the rejected email is in the
    # prompt to be fixed, and the drafting brief that would have the model start
    # over from the request is not.
    assert "THE DRAFT THAT WAS REJECTED" in retry_prompt
    assert _BAD.strip() in retry_prompt
    assert "REQUEST" not in retry_prompt
    # Both calls sample at the email path's one temperature, with reasoning on.
    assert llm.calls[0]["temperature"] == 0.2
    assert llm.calls[1]["temperature"] == 0.2
    assert llm.calls[0]["enable_thinking"] is False
    assert llm.calls[1]["enable_thinking"] is False
    # The good second draft is what comes back, unlabelled.
    assert "Check before sending" not in result["response"]
    assert "errors" not in result


@pytest.mark.asyncio
async def test_a_draft_that_fails_twice_is_recorded_but_never_labelled():
    llm = _ScriptedLLM(_BAD, _BAD)
    result = await _run(llm)

    assert len(llm.calls) == 2
    # The verdict is internal: logs and errors only, never the email text.
    assert "Check before sending" not in result["response"]
    assert "did not pass the email checks" not in result["response"]
    assert any("invented_date" in e for e in result["errors"])


@pytest.mark.asyncio
async def test_no_term_to_state_means_no_email_and_no_llm_call():
    llm = _ScriptedLLM(_GOOD)
    result = await _run(llm, target=None, opportunity=None)

    assert llm.calls == []
    assert "number of days to standardise to" in result["response"]
    assert result["errors"] == ["draft_opening_email: no proposed term"]


@pytest.mark.asyncio
async def test_the_negotiators_date_and_contact_reach_the_prompt_and_pass_validation():
    llm = _ScriptedLLM(
        "Subject: Payment Terms Standardisation of 75 Days Effective 1 March\n\n"
        "Dear U.S. Foodservice,\n\n"
        "We are changing your current payment terms of 34 days to a new standard "
        "term of 75 days.\n\n"
        "These updated terms will take effect by 1 March.\n\n"
        "For invoicing questions, contact ap@buyer.com.\n\nKind regards,\n"
        "XXX\n[Company]"
    )
    result = await _run(
        llm, message="effective 1 March, invoicing questions to ap@buyer.com"
    )

    assert len(llm.calls) == 1
    assert "Subject: Payment Terms Standardisation of — 75 Days Effective by 1 March" in llm.calls[0]["prompt"]
    assert "ap@buyer.com   (approved" in llm.calls[0]["prompt"]
    assert "errors" not in result
    assert result["source"]["Effective Date"]["value"] == "1 March"
    assert result["source"]["Administrative Contact"]["value"] == "ap@buyer.com"


@pytest.mark.asyncio
async def test_the_signoff_stays_placeholders_when_no_sender_is_known():
    llm = _ScriptedLLM(_GOOD)
    await _run(llm)
    prompt = llm.calls[0]["prompt"]
    assert "SIGN-OFF" in prompt
    # The name is not a field that might be filled in — it is stated as static.
    assert "Sender name    : XXX — ALWAYS." in prompt
    assert "Sender company : NOT PROVIDED — keep the placeholder [Company]" in prompt
    # The title is not a placeholder at all any more — the signature has no
    # title line unless the negotiator dictates one.
    assert "Sender title   : NONE. The signature has no title line" in prompt


@pytest.mark.asyncio
async def test_the_supplier_is_labelled_the_recipient_not_the_sender():
    llm = _ScriptedLLM(_GOOD)
    await _run(llm)
    prompt = llm.calls[0]["prompt"]
    assert "RECIPIENT — the supplier this email is addressed TO" in prompt
    assert "Supplier company : U.S. Foodservice" in prompt
    assert "never use it as the" in prompt


@pytest.mark.asyncio
async def test_the_signed_in_negotiator_never_reaches_the_signature():
    """The account that happens to be logged in does not sign a letter to a
    supplier. A draft that signs it is regenerated like any other invented
    sender."""
    llm = _ScriptedLLM(_GOOD.replace("XXX", "Jane Doe"), _GOOD)
    result = await _run(llm, user_name="Jane Doe")
    assert "Jane Doe" not in llm.calls[0]["prompt"]
    assert len(llm.calls) == 2
    assert "invented_sender" in llm.calls[1]["prompt"]
    assert "Jane Doe" not in result["response"]
    assert "XXX" in result["response"]


@pytest.mark.asyncio
async def test_signing_off_with_the_supplier_name_is_regenerated():
    llm = _ScriptedLLM(_GOOD.replace("[Company]", "U.S. Foodservice"), _GOOD)
    result = await _run(llm)
    assert len(llm.calls) == 2
    assert "supplier_name_as_sender" in llm.calls[1]["prompt"]
    assert result["response"].count("U.S. Foodservice") == 1  # the greeting only


@pytest.mark.asyncio
async def test_an_invented_team_signoff_is_regenerated():
    llm = _ScriptedLLM(_GOOD.replace("XXX\n[Company]", "The Purchasing Team"), _GOOD)
    result = await _run(llm)
    assert len(llm.calls) == 2
    assert "invented_sender" in llm.calls[1]["prompt"]
    assert "The Purchasing Team" not in result["response"]


@pytest.mark.asyncio
async def test_sources_say_plainly_when_nothing_was_supplied():
    result = await _run(_ScriptedLLM(_GOOD))
    assert "none supplied" in result["source"]["Effective Date"]["value"]
    assert "contact line omitted" in result["source"]["Administrative Contact"]["value"]


# ── Choosing a variant, and the one variant that can be vetoed ─────────────


@pytest.mark.asyncio
async def test_the_requested_variant_reaches_the_prompt():
    llm = _ScriptedLLM(_GOOD_LONGER)
    await _run(llm, message="write a longer email")
    prompt = llm.calls[0]["prompt"]
    assert "## EMAIL TEMPLATE — Longer notification" in prompt


# A conforming draft of the LONGER variant — the one the SCF request falls back
# to. Its subject line differs from `_GOOD`'s, which is the whole point: a draft
# in the wrong variant's format fails validation like any other bad draft.
_GOOD_LONGER = (
    "Subject: Notice of Payment Terms Standardization - Action Required "
    "by [MM, DD, YYYY]\n\n"
    "Dear U.S. Foodservice,\n\n"
    "We are standardising our payment terms from 34 days to 75 days.\n\n"
    "Please share your feedback on this proposed change by [MM, DD, YYYY].\n\n"
    "Kind regards,\nXXX\n[Company]"
)

_GOOD_SCF = _GOOD_LONGER.replace(
    "Notice of Payment Terms Standardization - Action Required by [MM, DD, YYYY]",
    "Notice of Payment Terms Standardization - Supply Chain Finance",
)


@pytest.mark.asyncio
async def test_the_scf_variant_is_drafted_when_the_programme_can_be_offered():
    llm = _ScriptedLLM(_GOOD_SCF)
    node = make_draft_opening_email_node(llm)
    payload = _payload()
    payload["supplier"]["scfRate"] = 0.04
    payload["supplier"]["supplierFinancingRate"] = 0.11
    await node({
        "message": "write a version with Supply Chain Finance",
        "context": build_supplier_context(payload),
        "scf_enabled": True,
    })
    assert "## EMAIL TEMPLATE — Version with Supply Chain Finance" in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_an_unofferable_scf_request_drops_the_paragraph_and_says_so():
    """The negotiator asked for the SCF email and gets the same notice without
    the early-payment paragraph. Told, not silently substituted — the two
    differ by one paragraph, which is exactly the kind of absence nobody spots.
    """
    llm = _ScriptedLLM(_GOOD_LONGER)
    result = await _run(llm, message="write a version with Supply Chain Finance")
    assert "## EMAIL TEMPLATE — Longer notification" in llm.calls[0]["prompt"]
    assert "Supply Chain Finance can't be offered to this supplier" in result["response"]
    assert result["response"].rstrip().endswith("[Company]")


@pytest.mark.asyncio
async def test_no_note_is_added_when_nothing_was_dropped():
    llm = _ScriptedLLM(_GOOD_LONGER)
    result = await _run(llm, message="write a longer email")
    assert result["response"].startswith("Subject:")


# ── "Make it stronger" returns an EMAIL, in the same format ────────────────


@pytest.mark.asyncio
async def test_a_follow_up_keeps_the_format_it_is_adjusting():
    """Asked to strengthen the longer notice, the node used to redraft the SHORT
    one — the format recovered from the previous draft is what stops that."""
    llm = _ScriptedLLM(_GOOD_LONGER)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "make email more stronger",
        "context": build_supplier_context(_payload()),
        "conversation_history": [
            {"role": "user", "content": "write a longer email"},
            {"role": "ai", "content": _GOOD_LONGER},
        ],
    })
    prompt = llm.calls[0]["prompt"]
    # It is an EDIT of the longer email on screen, not a redraft of any
    # reference: that email is the base, and the firmness rules still reach it.
    assert "THE EMAIL AS IT STANDS" in prompt
    assert _GOOD_LONGER.strip() in prompt
    assert "EMPHASIS — THE NEGOTIATOR ASKED FOR A STRONGER EMAIL" in prompt
    assert "You are EDITING, not composing" in llm.calls[0]["system"]


@pytest.mark.asyncio
async def test_a_follow_up_keeps_the_values_it_was_already_given():
    """The date was given one turn and the name the next; the name used to
    arrive with the date reverted to the relative window."""
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": 'I mean the sender name should be "Amaan"',
        "context": build_supplier_context(_payload()),
        "conversation_history": [
            {"role": "user", "content": "draft the email, effective 14-11-2027"},
            {"role": "ai", "content": _GOOD},
        ],
    })
    prompt = llm.calls[0]["prompt"]
    assert "14-11-2027" in prompt
    assert "Sender name    : Amaan" in prompt


@pytest.mark.asyncio
async def test_the_first_email_inherits_nothing_from_the_thread():
    """Before a draft exists there is nothing to adjust, and an earlier
    conversation is not a set of instructions about this email."""
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "draft the opening email",
        "context": build_supplier_context(_payload()),
        "conversation_history": [
            {"role": "user", "content": "what would 14-11-2027 look like as a deadline?"},
            {"role": "ai", "content": "That is about three months out."},
        ],
    })
    # The thread is still QUOTED to the model as conversation; what must not
    # happen is the date being resolved into the spec as an approved value.
    prompt = llm.calls[0]["prompt"]
    spec_block = prompt.split("## EMAIL SPEC")[1]
    assert "14-11-2027" not in spec_block


@pytest.mark.asyncio
async def test_off_template_wording_is_regenerated_but_never_labelled():
    """One retry against the reference; then the draft goes back clean, because
    prose that drifted is not a wrong fact in a supplier's inbox."""
    drifted = (
        "Subject: Payment Terms Standardisation of — 75 Days Effective by [MM, DD, YYYY]\n\n"
        "Dear U.S. Foodservice,\n\n"
        "Your payment terms are being updated to 75 days.\n\n"
        "Please update your records to reflect the new terms by [MM, DD, YYYY].\n\n"
        "Kind regards,\nXXX\n[Company]"
    )
    llm = _ScriptedLLM(drifted, drifted)
    result = await _run(llm)

    assert len(llm.calls) == 2
    assert "off_template" in llm.calls[1]["prompt"]
    assert "Check before sending" not in result["response"]
    assert "errors" not in result


@pytest.mark.asyncio
async def test_a_blocking_violation_is_logged_not_shown(caplog):
    caplog.set_level("ERROR")
    llm = _ScriptedLLM(_BAD, _BAD)
    result = await _run(llm)
    assert "Check before sending" not in result["response"]
    assert result["errors"]
    assert any("draft still invalid after retry" in r.getMessage() for r in caplog.records)


@pytest.mark.asyncio
async def test_a_stronger_request_returns_the_email_not_a_list_of_edits():
    """The reported failure was a bulleted list of suggested improvements in
    place of the email. Whatever else happens, the response is a draft."""
    llm = _ScriptedLLM(_GOOD)
    result = await _run(llm, message="make email more stronger")
    assert result["response"].startswith("Subject:")
    assert "Kind regards" in result["response"]


@pytest.mark.asyncio
async def test_escalation_the_negotiator_asked_for_is_named_above_the_draft():
    """One line, above a finished email — not a list of edits instead of one."""
    llm = _ScriptedLLM(_GOOD)
    result = await _run(
        llm,
        message="make it stronger, tell them this is non-negotiable with no exceptions",
    )
    assert "I've left out" in result["response"]
    assert '"no exceptions"' in result["response"]
    # The email is still there, in full, below the note.
    assert "Subject:" in result["response"]
    assert result["response"].rstrip().endswith("[Company]")


# ── The classifier picks the variant, the node uses it ─────────────────────
#
# Which of the five documents this is arrives on the state, named by the intent
# classifier on the turn it named the intent. The wording patterns stay behind
# it as the deterministic floor.


@pytest.mark.asyncio
async def test_the_classifiers_variant_reaches_the_prompt():
    """"Generate a detailed email" asks for the longer notice in words no
    pattern matches; the classifier is what makes it the longer notice."""
    llm = _ScriptedLLM(_GOOD_LONGER)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "generate a detailed email",
        "context": build_supplier_context(_payload()),
        "email_template": "longer",
    })
    assert "## EMAIL TEMPLATE — Longer notification" in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_an_unrecognised_variant_name_falls_back_rather_than_failing():
    """The field is a free string from a model. An unknown value means it named
    no variant — the request's own wording then decides, as it always did."""
    llm = _ScriptedLLM(_GOOD_LONGER)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "write a longer email",
        "context": build_supplier_context(_payload()),
        "email_template": "extremely_long",
    })
    assert "## EMAIL TEMPLATE — Longer notification" in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_no_classified_variant_leaves_the_previous_behaviour_untouched():
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "draft the opening email",
        "context": build_supplier_context(_payload()),
        "email_template": None,
    })
    assert "## EMAIL TEMPLATE — Standard notification" in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_the_classifiers_variant_does_not_reset_a_follow_ups_format():
    """"Make it stronger" names no format, so the classifier returns null and
    the longer email being adjusted stays the longer email."""
    llm = _ScriptedLLM(_GOOD_LONGER)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "make it stronger",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": [
            {"role": "user", "content": "write a longer email"},
            {"role": "ai", "content": _GOOD_LONGER},
        ],
    })
    prompt = llm.calls[0]["prompt"]
    assert "THE EMAIL AS IT STANDS" in prompt
    assert _GOOD_LONGER.strip() in prompt
    # The spec still resolves for the LONGER variant: its subject line is the tell.
    assert "Action Required by" in prompt.split("## EMAIL SPEC")[1]


# ── A follow-up alters the email on screen; a new request starts over ──────


def _thread(*drafts: str) -> list[dict[str, str]]:
    turns: list[dict[str, str]] = []
    for index, draft in enumerate(drafts):
        turns.append({"role": "user", "content": f"request {index}"})
        turns.append({"role": "ai", "content": draft})
    return turns


_EDITED = _GOOD.replace("Dear U.S. Foodservice,", "Dear Paul Bremer,").replace(
    "We are standardising", "In line with our treasury policy, we are standardising"
)


@pytest.mark.asyncio
async def test_a_value_change_edits_the_email_on_screen_not_the_reference():
    """"Address it to Paul" used to re-render the reference: the line the
    negotiator had added the turn before was gone from the result."""
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "address it to Paul Bremer",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "email_customisation": False,
        "conversation_history": _thread(_GOOD, _EDITED),
    })
    call = llm.calls[0]
    assert "You are EDITING, not composing" in call["system"]
    assert "THE EMAIL AS IT STANDS" in call["prompt"]
    assert "In line with our treasury policy" in call["prompt"]


@pytest.mark.asyncio
async def test_the_latest_email_is_the_one_edited():
    """Two rounds in, the second edit is on screen. Editing the first would
    throw the negotiator's previous change away."""
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "make it shorter",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": _thread(_GOOD, _EDITED),
    })
    base = llm.calls[0]["prompt"].split("THE EMAIL AS IT STANDS")[1].split("## EMAIL SPEC")[0]
    assert "Dear Paul Bremer," in base
    assert "Dear U.S. Foodservice," not in base


@pytest.mark.asyncio
async def test_the_notes_above_a_draft_are_not_part_of_the_email_edited():
    noted = (
        "Note: I couldn't tell where 45 days was meant to go, so the draft below "
        "uses the 75-day term.\n\n" + _GOOD
    )
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "make it shorter",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": _thread(noted),
    })
    base = llm.calls[0]["prompt"].split("THE EMAIL AS IT STANDS")[1].split("## EMAIL SPEC")[0]
    assert "Note: I couldn't tell" not in base
    assert _GOOD.strip() in base


@pytest.mark.asyncio
async def test_a_customised_email_that_matches_no_fingerprint_is_still_edited():
    """A rewritten subject line stops the variant fingerprints matching; the
    email is still the one on screen."""
    resubjected = _GOOD.replace(
        "Subject: Payment Terms Standardisation of — 75 Days Effective by [MM, DD, YYYY]",
        "Subject: Our new payment terms",
    )
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "sign it off as Jane Doe",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": _thread(resubjected),
    })
    assert "Subject: Our new payment terms" in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_naming_a_different_format_starts_a_new_email():
    llm = _ScriptedLLM(_GOOD_LONGER)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "now write the longer version",
        "context": build_supplier_context(_payload()),
        "email_template": "longer",
        "conversation_history": _thread(_EDITED),
    })
    call = llm.calls[0]
    assert "filling in an approved document" in call["system"]
    assert "## EMAIL TEMPLATE — Longer notification" in call["prompt"]
    assert "In line with our treasury policy" not in call["prompt"]


@pytest.mark.asyncio
async def test_asking_for_the_email_again_plainly_starts_over():
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "draft the opening email",
        "context": build_supplier_context(_payload()),
        "email_template": "standard",
        "email_customisation": False,
        "conversation_history": _thread(_EDITED),
    })
    assert "filling in an approved document" in llm.calls[0]["system"]
    assert "In line with our treasury policy" not in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_an_answer_about_the_email_is_not_the_email():
    """The assistant's last turn was prose about the draft; the draft before it
    is what "make it shorter" refers to."""
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "make it shorter",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": [
            *_thread(_EDITED),
            {"role": "user", "content": "is that too long?"},
            {"role": "ai", "content": "It is about the right length for a first notice."},
        ],
    })
    base = llm.calls[0]["prompt"].split("THE EMAIL AS IT STANDS")[1].split("## EMAIL SPEC")[0]
    assert "Dear Paul Bremer," in base
    assert "about the right length" not in base


# ── The thread reaches the model as chat messages, last five exchanges ─────


@pytest.mark.asyncio
async def test_the_drafting_call_carries_the_last_five_exchanges_as_messages():
    drafts = [_GOOD.replace("75 days", f"{60 + i} days") for i in range(7)]
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "make it shorter",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": _thread(*drafts),
    })
    history = llm.calls[0]["history"]
    assert len(history) == 10
    assert [m["role"] for m in history] == ["user", "assistant"] * 5
    assert history[0]["content"] == "request 2"  # the two oldest exchanges dropped
    assert history[-1]["content"] == drafts[-1]
    # The prompt itself carries no second, truncated copy of the thread.
    assert "## RECENT CONVERSATION" not in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_a_first_email_sends_no_history_messages():
    llm = _ScriptedLLM(_GOOD)
    await _run(llm)
    assert llm.calls[0]["history"] == []
    assert llm.calls[0]["enable_thinking"] is False
    assert llm.calls[0]["max_tokens"] == 4096


# ── A phrase after "our company" is not the company's name ────────────────


def test_a_lowercase_phrase_after_our_company_is_not_a_sender_company():
    """Live: "add a line saying this change follows our company treasury policy"
    signed the email "treasury policy", and the validator approved it because
    the spec had supplied the value."""
    from domain.services.opening_email import build_opening_email_spec

    context = build_supplier_context(_payload())
    spec = build_opening_email_spec(
        context.facts, "add a line saying this change follows our company treasury policy", None, None
    )
    assert spec.sender_company is None
    assert "[Company]" in spec.signoff_placeholders


def test_a_proper_noun_after_our_company_still_is():
    from domain.services.opening_email import build_opening_email_spec

    context = build_supplier_context(_payload())
    assert build_opening_email_spec(context.facts, "our company is Northwind Ltd", None, None).sender_company == "Northwind Ltd"
    assert build_opening_email_spec(context.facts, "our company: Acme", None, None).sender_company == "Acme"


# ── "Now write back to the supplier" undoes a contact named earlier ────────


def _spec_for(message: str, previous_messages=None, dictated=None):
    from domain.services.opening_email import build_opening_email_spec
    from domain.services.opening_email_templates import EmailTemplate

    return build_opening_email_spec(
        build_supplier_context(_payload()).facts, message, None, None,
        previous_template=EmailTemplate.STANDARD,
        previous_messages=previous_messages or [],
        dictated=dictated,
    )


# The reading is what carries a contact across turns: it is given the earlier
# requests as background and reports the name from them, which is how "ahmad"
# reached turn 3 live.
_INHERITED_AHMAD = DictatedValues(recipient_name="ahmad")


def test_an_earlier_contact_is_inherited_by_a_plain_follow_up():
    """The behaviour the reset must not break: "make it shorter" keeps Ahmad."""
    spec = _spec_for("make it shorter", ["write this mail to ahmad"], _INHERITED_AHMAD)
    assert spec.recipient_name == "ahmad"


def test_writing_back_to_the_supplier_drops_the_inherited_contact():
    """Live: turn 3 of draft / "to ahmad" / "now write back to the supplier"
    returned the identical email, still greeting Ahmad. The spec had inherited
    the name, so it commanded the greeting AND the validator required it."""
    spec = _spec_for(
        "now write back to the supplier", ["write this mail to ahmad"], _INHERITED_AHMAD
    )
    assert spec.recipient_name is None
    assert not spec.has_recipient
    assert spec.greeting_addressee == "U.S. Foodservice"


def test_the_supplier_greeting_is_then_what_the_validator_requires():
    """The other half of the lock: with Ahmad still on file, greeting the
    supplier was a `wrong_recipient` violation and the correction put him back."""
    from domain.services.opening_email import validate_opening_email

    spec = _spec_for(
        "now write back to the supplier", ["write this mail to ahmad"], _INHERITED_AHMAD
    )
    draft = _GOOD.replace("Dear U.S. Foodservice,", "Dear U.S. Foodservice Team,")
    assert [v.code for v in validate_opening_email(draft, spec)] == []


def test_the_readings_flag_resets_the_contact_too():
    """The dictation is the primary reader; the pattern above is its floor."""
    spec = _spec_for(
        "send this one to them instead", ["write this mail to ahmad"],
        DictatedValues(recipient_name="ahmad", address_supplier_directly=True),
    )
    assert spec.recipient_name is None


def test_the_reset_is_read_from_this_turn_only():
    """A revocation re-read out of the thread would never stop applying."""
    spec = _spec_for(
        "address it to Paul Bremer",
        ["now write back to the supplier", "write this mail to ahmad"],
        DictatedValues(recipient_name="Paul Bremer"),
    )
    assert spec.recipient_name == "Paul Bremer"


# ── An edit that changes nothing is never shipped in silence ──────────────


@pytest.mark.asyncio
async def test_an_unchanged_edit_is_retried_once():
    changed = _GOOD.replace("Dear U.S. Foodservice,", "Dear U.S. Foodservice Team,")
    llm = _ScriptedLLM(_GOOD, changed)
    node = make_draft_opening_email_node(llm)
    result = await node({
        "message": "make it warmer",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": _thread(_GOOD),
    })
    assert len(llm.calls) == 2
    assert "returned the email exactly as it already was" in llm.calls[1]["prompt"]
    assert "Note: I couldn't work out how to apply that" not in result["response"]
    assert "errors" not in result


@pytest.mark.asyncio
async def test_an_edit_unchanged_twice_says_so_above_the_draft():
    llm = _ScriptedLLM(_GOOD, _GOOD)
    node = make_draft_opening_email_node(llm)
    result = await node({
        "message": "make it warmer",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "conversation_history": _thread(_GOOD),
    })
    assert len(llm.calls) == 2
    assert result["response"].startswith("Note: I couldn't work out how to apply that")
    assert _GOOD.strip() in result["response"]
    assert any("unchanged twice" in e for e in result["errors"])


@pytest.mark.asyncio
async def test_a_first_draft_is_never_called_unchanged():
    """There is nothing to be unchanged from, so no retry and no note."""
    llm = _ScriptedLLM(_GOOD)
    result = await _run(llm)
    assert len(llm.calls) == 1
    assert "Note: I couldn't work out" not in result["response"]


@pytest.mark.asyncio
async def test_a_contradicting_resolved_reading_is_dropped_on_a_reset_turn():
    """Live: the classifier resolved "now write back to the supplier" as "write
    the opening email addressed to Ahmad" — the person that turn removed."""
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "now write back to the supplier",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "resolved_question": "write the opening email addressed to Ahmad",
        "conversation_history": _thread(_GOOD),
    })
    assert "addressed to Ahmad" not in llm.calls[0]["prompt"]


@pytest.mark.asyncio
async def test_a_resolved_reading_still_reaches_an_ordinary_edit():
    llm = _ScriptedLLM(_GOOD)
    node = make_draft_opening_email_node(llm)
    await node({
        "message": "yes",
        "context": build_supplier_context(_payload()),
        "email_template": None,
        "resolved_question": "yes — rewrite the opening email in German",
        "conversation_history": _thread(_GOOD),
    })
    assert "rewrite the opening email in German" in llm.calls[0]["prompt"]
