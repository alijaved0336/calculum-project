""""Prepare potential pushbacks" goes to the pushback node, in anticipate mode.

The product's own follow-up chip ("Prepare potential push backs.") was filed
under generate_negotiation_playbook: the playbook was the only intent that
mentioned objection handling, and handle_supplier_pushback required an objection
the supplier had actually raised. The negotiator asked for one section and got
the whole document. Routed to the pushback node as it stood, it would have been
asked what the supplier said instead.

Anticipate mode answers it from the objections engine — the same objections and
counters as the playbook's Objections section — plus the knowledge-base
objections this supplier's data points to. It answers the MESSAGE: a negotiator
who asked "didn't you find any others?" three times got the same two objections
three times, and "bro i am asking just answer that" went to meta_operation and
got them a fourth.
"""
from __future__ import annotations

import asyncio
import dataclasses
from types import SimpleNamespace

import pytest

from agents.nodes.intent_classifier import (
    is_anticipated_pushback_request,
    make_intent_classifier_node,
)
from agents.nodes.pushback import make_pushback_node
from domain.entities.intent import Intent, IntentClassification
from domain.services.brief_builder import brief_from
from domain.services.objection_scan import scan_likely_objections
from domain.services.objections import build_objection_plan
from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier
from tests.unit.prompt_fixtures import rich_facts
from tests.unit.pushback_kb_fixture import fixture_kb
from utils.prompts.pushback_prompt import (
    SCANNED_OBJECTIONS_HEADING,
    anticipated_pushback_system_prompt,
    build_anticipated_pushback_prompt,
    scanned_objections_block,
)


# ── recognising the request ────────────────────────────────────────────────


@pytest.mark.parametrize("message", [
    "prepare potential pushbacks",
    "Prepare potential push backs.",
    "What objections should I expect?",
    "what are their likely push-backs",
    "help me prepare for their objections",
    "didn't you find any other pusbacks",
    "scan the whole supplier and give me the potential pushbacks",
])
def test_anticipatory_asks_are_recognised(message):
    assert is_anticipated_pushback_request(message)


@pytest.mark.parametrize("message", [
    # Relayed — the supplier already said it.
    "they pushed back on 90 days, what objections could come next?",
    "the supplier said it hurts their cash flow, what might I answer to that objection",
    # The whole document named.
    "generate a playbook with potential objections",
    # No cue that the objections are still to come.
    "expand the objections part",
    # Not about objections at all.
    "prepare me",
])
def test_other_asks_are_not(message):
    assert not is_anticipated_pushback_request(message)


# ── the classifier node backstop ───────────────────────────────────────────


class FakeClassifier:
    def __init__(self, result: IntentClassification) -> None:
        self.result = result

    async def classify(self, *_: object, **__: object) -> IntentClassification:
        return self.result


def _classify(message: str, intent: Intent, **fields: object) -> dict:
    result = IntentClassification(intent=intent, confidence=0.9, **fields)
    node = make_intent_classifier_node(FakeClassifier(result))
    return asyncio.run(node({"message": message, "conversation_history": []}))


def test_a_playbook_misroute_is_sent_to_pushback_in_anticipate_mode():
    out = _classify("prepare potential pushbacks", Intent.GENERATE_NEGOTIATION_PLAYBOOK)
    assert out["intent"] is Intent.HANDLE_SUPPLIER_PUSHBACK
    assert out["pushback_anticipate"] is True


def test_a_pushback_classification_gets_the_anticipate_flag():
    out = _classify("Prepare potential push backs.", Intent.HANDLE_SUPPLIER_PUSHBACK)
    assert out["intent"] is Intent.HANDLE_SUPPLIER_PUSHBACK
    assert out["pushback_anticipate"] is True


def test_a_named_playbook_stays_the_playbook():
    out = _classify("generate a playbook with potential objections", Intent.GENERATE_NEGOTIATION_PLAYBOOK)
    assert out["intent"] is Intent.GENERATE_NEGOTIATION_PLAYBOOK
    assert out["pushback_anticipate"] is False


def test_a_relayed_objection_stays_reactive():
    out = _classify("they say our terms will kill their margin", Intent.HANDLE_SUPPLIER_PUSHBACK)
    assert out["intent"] is Intent.HANDLE_SUPPLIER_PUSHBACK
    assert out["pushback_anticipate"] is False


@pytest.mark.parametrize("intent", [Intent.META_OPERATION, Intent.DRAFT_EMAIL])
def test_unrelated_intents_are_left_alone(intent):
    out = _classify("make the potential pushbacks section shorter", intent)
    assert out["intent"] is intent


# ── a follow-up to prepared pushbacks stays on the pushback node ────────────

_PREP_ANSWER = (
    'U.S. Foodservice, Inc is extending from 34 to 75 days.\n\n'
    '**1. "This will hurt our cash flow."**\n'
    '* **Why to expect it:** a 41-day extension delays their cash.\n'
    '* **Say:** "For your organization, the cost impact is minimal."'
)


def _classify_after(message: str, intent: Intent, last_reply: str) -> dict:
    node = make_intent_classifier_node(FakeClassifier(IntentClassification(intent=intent, confidence=0.9)))
    history = [{"role": "user", "content": "prepare potential pushbacks"}, {"role": "ai", "content": last_reply}]
    return asyncio.run(node({"message": message, "conversation_history": history}))


@pytest.mark.parametrize("message", [
    "bro i am asking just answer that",
    "you gave me the same list again",
    "is there anything else?",
])
def test_insisting_after_prepared_pushbacks_goes_back_to_pushback(message):
    out = _classify_after(message, Intent.META_OPERATION, _PREP_ANSWER)
    assert out["intent"] is Intent.HANDLE_SUPPLIER_PUSHBACK
    assert out["pushback_anticipate"] is True


@pytest.mark.parametrize("message", ["make it shorter", "put that in a table", "was that in German?"])
def test_reshaping_prepared_pushbacks_stays_meta_operation(message):
    out = _classify_after(message, Intent.META_OPERATION, _PREP_ANSWER)
    assert out["intent"] is Intent.META_OPERATION


def test_insisting_after_a_no_more_answer_still_goes_to_pushback():
    history = [
        {"role": "user", "content": "prepare potential pushbacks"},
        {"role": "ai", "content": _PREP_ANSWER},
        {"role": "user", "content": "didn't you find any other pusbacks"},
        {"role": "ai", "content": "No — those are all the pushbacks this supplier's data points to."},
    ]
    node = make_intent_classifier_node(FakeClassifier(IntentClassification(intent=Intent.META_OPERATION, confidence=0.9)))
    out = asyncio.run(node({"message": "bro i am asking just answer that", "conversation_history": history}))
    assert out["intent"] is Intent.HANDLE_SUPPLIER_PUSHBACK


def test_meta_operation_after_another_answer_is_untouched():
    out = _classify_after("bro i am asking just answer that", Intent.META_OPERATION, "Here is the supplier summary.")
    assert out["intent"] is Intent.META_OPERATION


# ── the data scan ──────────────────────────────────────────────────────────


def _analysis(**overrides):
    base = dict(
        payment_reliability=None,
        cost_impact=None,
        financial_sensitivity=SimpleNamespace(level="low"),
        leverage=SimpleNamespace(posture="buyer_favored"),
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _quiet_facts(**kw):
    """A supplier with no signal at all: small extension, no DSO, strong ratings."""
    facts = dataclasses.replace(
        rich_facts(), current_term_days=60, target_term_days=75, dso=None,
        industry="Consulting", credit_rating="A", country_rating="AA", is_sme=False,
    )
    return dataclasses.replace(facts, **kw)


def _keys(facts, **analysis):
    return [o.kb_key for o in scan_likely_objections(facts, _analysis(**analysis))]


def test_no_signal_means_no_scanned_objection():
    assert _keys(_quiet_facts()) == []


def test_each_signal_opens_its_objection():
    assert _keys(_quiet_facts(), payment_reliability=SimpleNamespace(
        status="behind_terms", actual_payment_days=50, pay_on_terms_term_days=34)) == ["late_payments"]
    assert _keys(_quiet_facts(), cost_impact=SimpleNamespace(
        status="material", cost_impact_percent=3.1)) == ["erosion_of_margins"]
    assert _keys(_quiet_facts(dso=40)) == ["dso"]
    assert _keys(_quiet_facts(credit_rating="BB+")) == ["bank_covenant"]
    assert _keys(_quiet_facts(is_sme=True)) == ["inventory"]
    assert _keys(_quiet_facts(), leverage=SimpleNamespace(posture="supplier_favored")) == [
        "supplier_market_share", "alternative_customer"]
    assert _keys(_quiet_facts(current_term_days=34)) == ["reciprocity_demand"]
    assert _keys(_quiet_facts(industry="Food Distribution")) == ["raw_material_volatility", "inventory"]
    assert _keys(_quiet_facts(country_rating="B")) == ["currency_effect"]


def test_bbb_is_not_a_weak_rating():
    assert _keys(_quiet_facts(credit_rating="BBB-")) == []


def test_one_entry_per_category_even_with_two_signals():
    keys = _keys(_quiet_facts(is_sme=True, industry="Food Distribution"))
    assert keys.count("inventory") == 1


def test_scanned_scripts_fill_the_term_and_drop_scf_when_not_offerable():
    scan = scan_likely_objections(_quiet_facts(dso=40), _analysis())
    block = scanned_objections_block(scan, 75, kb=fixture_kb(), scf_offerable=False)
    assert block.startswith(SCANNED_OBJECTIONS_HEADING)
    assert "[Proposed Term]" not in block and "days days" not in block
    assert "75 days" in block
    assert "(SCF)" not in block
    assert "(SCF)" in scanned_objections_block(scan, 75, kb=fixture_kb(), scf_offerable=True)


# ── parsing the classifier's JSON ──────────────────────────────────────────


def test_the_flag_is_parsed_on_pushback_only():
    classifier = LLMIntentClassifier(llm=None)
    on = classifier._parse(
        '{"intent": "handle_supplier_pushback", "confidence": 0.9, "pushback_anticipate": true}',
        "prepare potential pushbacks",
    )
    off = classifier._parse(
        '{"intent": "generate_negotiation_playbook", "confidence": 0.9, "pushback_anticipate": true}',
        "generate playbook",
    )
    broken = classifier._parse(
        '{"intent": "handle_supplier_pushback", "reasoning": "a "quoted" rule", "pushback_anticipate": true}',
        "prepare potential pushbacks",
    )
    assert on.pushback_anticipate is True
    assert off.pushback_anticipate is False
    assert broken.pushback_anticipate is True


# ── the prompt ─────────────────────────────────────────────────────────────


def test_the_prompt_carries_the_playbook_objections_word_for_word():
    brief = brief_from(rich_facts())
    prompt = build_anticipated_pushback_prompt("prepare potential pushbacks", brief)
    plan = build_objection_plan(brief.facts)
    assert plan
    for objection in plan.objections:
        assert objection.supplier_line in prompt
        # EVERY counter: an objection answered from several angles loses most
        # of its answer if the block prints only the first one.
        for counter in objection.counters:
            assert counter in prompt


def test_the_prompt_never_asks_what_the_supplier_said():
    own_instructions = anticipated_pushback_system_prompt.split("\n---\n")[0]
    assert "never ask what they said" in own_instructions
    assert "clarifying question" not in own_instructions


def test_the_prompt_answers_the_message_rather_than_reprinting_a_list():
    own_instructions = anticipated_pushback_system_prompt.split("\n---\n")[0]
    assert "Asking for MORE" in own_instructions
    assert "complete set" in own_instructions
    # The old closed-list wording is what made "any others?" unanswerable.
    assert "COMPLETE list" not in own_instructions
    assert "Nothing else" not in own_instructions


def test_coverage_is_worked_out_in_code_from_the_conversation():
    facts = dataclasses.replace(rich_facts(), industry="Food Distribution")
    brief = brief_from(facts)
    first = build_anticipated_pushback_prompt("prepare potential pushbacks", brief, kb=fixture_kb())
    assert "Nothing has been covered yet" in first
    assert "[ALREADY COVERED" not in first

    # An earlier answer that gave every objection, headings copied word for word.
    plan = build_objection_plan(brief.facts)
    headings = [o.supplier_line for o in plan.objections]
    block = first.split(SCANNED_OBJECTIONS_HEADING, 1)[1]
    headings += [
        line.split('"', 1)[1].rsplit('"', 1)[0]
        for line in block.splitlines()
        if line.startswith("Supplier line (the heading")
    ]
    answer = "\n".join(
        f'**{n}. "{h}"**\n* **Why to expect it:** x\n* **Say:** "y"'
        for n, h in enumerate(headings, 1)
    )
    history = [{"role": "user", "content": "prepare potential pushbacks"}, {"role": "ai", "content": answer}]
    again = build_anticipated_pushback_prompt(
        "didn't you find any other pusbacks", brief, history, kb=fixture_kb()
    )
    assert "There are NO more to add" in again
    assert "## CHECKED — NO PUSHBACK SIGNAL" in again

    # Asked a second time: the verdict was already given, so say it briefly.
    history += [
        {"role": "user", "content": "didn't you find any other pusbacks"},
        {"role": "ai", "content": "No — those are all the pushbacks this supplier's data points to."},
    ]
    third = build_anticipated_pushback_prompt(
        "bro i am asking just answer that", brief, history, kb=fixture_kb()
    )
    assert "you ALREADY told them there are no more" in third


def test_a_partly_covered_conversation_counts_what_is_left():
    facts = dataclasses.replace(rich_facts(), industry="Food Distribution")
    brief = brief_from(facts)
    first_line = build_objection_plan(brief.facts).objections[0].supplier_line
    answer = f'**1. "{first_line}"**\n* **Why to expect it:** x\n* **Say:** "y"'
    history = [{"role": "user", "content": "prepare potential pushbacks"}, {"role": "ai", "content": answer}]
    prompt = build_anticipated_pushback_prompt("any others?", brief, history, kb=fixture_kb())
    assert "Already given in this conversation: 1" in prompt
    assert prompt.count("[ALREADY COVERED IN THIS CONVERSATION]") == 1


def test_the_prompt_carries_the_scanned_objections():
    facts = dataclasses.replace(rich_facts(), industry="Food Distribution")
    prompt = build_anticipated_pushback_prompt(
        "any other pushbacks?", brief_from(facts), kb=fixture_kb()
    )
    assert SCANNED_OBJECTIONS_HEADING in prompt
    assert "Raw Material Volatility" in prompt


def test_without_the_knowledge_base_only_the_approved_objections_remain():
    facts = dataclasses.replace(rich_facts(), industry="Food Distribution")
    prompt = build_anticipated_pushback_prompt("any other pushbacks?", brief_from(facts))
    assert SCANNED_OBJECTIONS_HEADING not in prompt
    assert "## APPROVED OBJECTIONS" in prompt


def test_the_regulatory_counter_names_the_term():
    facts = dataclasses.replace(
        rich_facts(), regulatory_max_term_days=30, regulatory_enforced=False, regulatory_applied=False,
    )
    counter = next(o.counters[0] for o in build_objection_plan(facts).objections if o.key == "regulatory")
    assert "30-day term for this market" in counter


def test_the_prompt_carries_no_argument_sequence():
    brief = brief_from(rich_facts())
    prompt = build_anticipated_pushback_prompt("prepare potential pushbacks", brief)
    assert "Argument sequence" not in prompt


def test_the_prompt_carries_the_requested_language():
    brief = brief_from(rich_facts())
    prompt = build_anticipated_pushback_prompt(
        "prepare potential pushbacks", brief, response_language="German"
    )
    assert "German" in prompt


# ── the node ───────────────────────────────────────────────────────────────


class FakeLLM:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str | None]] = []

    async def complete(self, prompt: str, system: str | None = None, **_: object) -> str:
        self.calls.append((prompt, system))
        return "Here are the objections to prepare for."


def test_anticipate_mode_answers_with_the_prepared_objections():
    facts = rich_facts()
    llm = FakeLLM()
    node = make_pushback_node(llm)
    out = asyncio.run(node({
        "message": "prepare potential pushbacks",
        "context": SimpleNamespace(facts=facts),
        "brief": brief_from(facts),
        "pushback_anticipate": True,
    }))
    # The objection extraction runs on every turn; it names nothing here, so
    # the turn stays anticipatory.
    assert len(llm.calls) == 2
    prompt, system = llm.calls[1]
    assert system.startswith(anticipated_pushback_system_prompt)
    assert "## APPROVED OBJECTIONS" in prompt
    assert out["response"] == "Here are the objections to prepare for."


def test_relayed_mode_still_classifies_the_objection():
    facts = rich_facts()
    llm = FakeLLM()
    node = make_pushback_node(llm)
    asyncio.run(node({
        "message": "they say our terms will kill their margin",
        "context": SimpleNamespace(facts=facts),
        "brief": brief_from(facts),
    }))
    assert len(llm.calls) == 2
    assert "## APPROVED OBJECTIONS" not in llm.calls[1][0]
