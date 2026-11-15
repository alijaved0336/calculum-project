"""Continuity of the supplier email across turns: find the email, edit it, never
return it unchanged, and keep "try again" after an email on the email."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

from agents.nodes.draft_email import make_draft_email_node
from agents.nodes.intent_classifier import make_intent_classifier_node
from domain.entities.intent import Intent, IntentClassification
from utils.prompts.draft_email_prompt import find_current_email

FACTS = SimpleNamespace(supplier_name="JABIL VIETNAM", current_term_days=30, target_term_days=60)
EMAIL_1 = "Subject: Payment Terms\n\nDear JABIL VIETNAM Team,\n\nFirst draft.\n\nKind regards,\n[Sender Name]"
EMAIL_2 = "Subject: Payment Terms\n\nDear JABIL VIETNAM Team,\n\nSecond draft.\n\nKind regards,\nJane Doe"


class FakeLLM:
    def __init__(self, *outputs: str) -> None:
        self.outputs = list(outputs)
        self.prompts: list[str] = []

    async def complete(self, prompt: str, **_: object) -> str:
        self.prompts.append(prompt)
        return self.outputs.pop(0)


def _run_node(llm: FakeLLM, **state: object) -> dict:
    node = make_draft_email_node(llm)
    return asyncio.run(node({"context": SimpleNamespace(facts=FACTS), **state}))


def test_the_current_email_is_the_latest_one_even_with_turns_in_between():
    history = [
        {"role": "user", "content": "draft the email"},
        {"role": "ai", "content": EMAIL_1},
        {"role": "user", "content": "sign as Jane"},
        {"role": "ai", "content": EMAIL_2},
        {"role": "user", "content": "what is their WACC?"},
        {"role": "ai", "content": "Their WACC is 8%."},
    ]
    assert find_current_email(history) == EMAIL_2
    assert find_current_email(history[:1]) is None


def test_an_edit_hands_the_current_email_to_the_prompt():
    llm = FakeLLM("Subject: Payment Terms\n\nDear team,\n\nReworded.")
    history = [{"role": "user", "content": "draft"}, {"role": "ai", "content": EMAIL_1}]
    out = _run_node(llm, message="rephrase it", email_edit=True, conversation_history=history)
    assert out["response"].endswith("Reworded.")
    assert "## CURRENT EMAIL" in llm.prompts[0] and "First draft." in llm.prompts[0]
    assert "## TEMPLATE" not in llm.prompts[0]


def test_earlier_email_versions_are_hidden_from_the_prompt():
    llm = FakeLLM("Subject: Payment Terms\n\nDear team,\n\nThird draft.")
    history = [
        {"role": "user", "content": "draft"},
        {"role": "ai", "content": EMAIL_1},
        {"role": "user", "content": "sign as Jane"},
        {"role": "ai", "content": EMAIL_2},
    ]
    _run_node(llm, message="rephrase it", email_edit=True, conversation_history=history)
    assert "First draft." not in llm.prompts[0]
    assert llm.prompts[0].count("Second draft.") == 1


def test_an_unchanged_edit_is_retried_once():
    llm = FakeLLM(EMAIL_1, "Subject: Payment Terms\n\nDear team,\n\nNew wording.")
    history = [{"role": "user", "content": "draft"}, {"role": "ai", "content": EMAIL_1}]
    out = _run_node(llm, message="rephrase it", email_edit=True, conversation_history=history)
    assert len(llm.prompts) == 2
    assert "returned the CURRENT EMAIL unchanged" in llm.prompts[1]
    assert out["response"].endswith("New wording.")


def test_a_new_email_with_no_changes_is_the_template_without_a_model_call():
    llm = FakeLLM()
    out = _run_node(llm, message="the longer version", email_template="longer",
                    email_changes=False, conversation_history=[])
    assert llm.prompts == []
    assert out["response"].startswith("Subject: Notice of Payment Terms Standardization")
    assert "JABIL VIETNAM" in out["response"] and "60 days" in out["response"]


def test_a_new_email_with_changes_goes_through_the_model():
    llm = FakeLLM("Subject: New\n\nBody signed Jane")
    out = _run_node(llm, message="draft it and sign as Jane", email_changes=True, conversation_history=[])
    assert len(llm.prompts) == 1 and out["response"].endswith("signed Jane")


def test_an_edit_with_no_email_in_the_thread_writes_a_new_one():
    llm = FakeLLM("Subject: New\n\nBody")
    _run_node(llm, message="make it shorter", email_edit=True, email_changes=True, conversation_history=[])
    assert "## CURRENT EMAIL" not in llm.prompts[0]
    assert "Write a NEW email" in llm.prompts[0] and "60 days" in llm.prompts[0]


def test_a_named_template_on_an_edit_moves_the_email_onto_it():
    llm = FakeLLM("Subject: Executive Notice\n\nBody")
    history = [{"role": "user", "content": "draft"}, {"role": "ai", "content": EMAIL_1}]
    _run_node(llm, message="switch to the senior management version", email_edit=True,
              email_template="senior_management", conversation_history=history)
    assert "## CURRENT EMAIL" in llm.prompts[0]
    assert "Executive Notice" in llm.prompts[0]


def _brief():
    from domain.services.brief_builder import build_negotiation_brief
    from domain.services.context_builder import build_supplier_context

    payload = {
        "supplier": {
            "name": "U.S. Foodservice", "uuid": "u1", "country": "US",
            "mainIndustryName": "Foodservice", "companySize": "LARGE",
            "spendVolume": 12852649.0,
        },
        "target": {"targetPaymentTerms": 60, "opportunityPaymentTerms": None},
        "spend": {"contractualPaymentTermsWithoutCashDiscount": 34, "actualPaymentTerms": 34},
        "agreement": {},
        "negotiationStrategy": {
            "industryRegionStandard": {"value": 30},
            "peerGroupStandard": {"value": 75},
        },
    }
    return build_negotiation_brief(build_supplier_context(payload), scf_enabled=False)


def test_the_prompt_carries_supplier_facts_and_argument_buckets():
    brief = _brief()
    assert brief is not None
    llm = FakeLLM("Subject: New\n\nBody")
    _run_node(llm, message="draft it and add why", email_changes=True,
              conversation_history=[], brief=brief)
    prompt = llm.prompts[0]
    assert "## FACTS" in prompt and "## NEGOTIATION ARGUMENTS" in prompt
    assert "BACKGROUND for the email" in prompt
    assert "Peer Group Standard" in prompt
    # Non-supporting benchmarks appear by name only, and the BATNA figure never.
    floor = brief.batna_floor
    assert floor is not None
    assert f"BATNA {floor}" not in prompt and f"{floor} days" not in prompt
    assert "STATE THE FIGURE" not in prompt


def test_a_parent_max_value_is_in_the_prompt_under_the_name_the_negotiator_uses():
    from domain.services.brief_builder import build_negotiation_brief
    from domain.services.context_builder import build_supplier_context
    from utils.prompts.draft_email_prompt import draft_email_system_prompt

    payload = {
        "supplier": {"name": "U.S. Foodservice, Inc", "uuid": "u1", "country": "US",
                     "mainIndustryName": "Foodservice", "companySize": "LARGE"},
        "target": {"targetPaymentTerms": 75, "opportunityPaymentTerms": None},
        "spend": {"contractualPaymentTermsWithoutCashDiscount": 34, "actualPaymentTerms": 34},
        "agreement": {},
        "negotiationStrategy": {"parentOrSupplierMax": {"value": 80}},
    }
    brief = build_negotiation_brief(build_supplier_context(payload), scf_enabled=False)
    llm = FakeLLM("Subject: New\n\nBody")
    _run_node(llm, message="also mention the value of the parent supplier max", email_changes=True,
              conversation_history=[], brief=brief)
    prompt = llm.prompts[0]
    assert "Parent / Supplier Max — 80 days" in prompt
    assert "Also called: Parent Or Supplier Max" in prompt
    assert "explicitly asks for that value" in draft_email_system_prompt


def test_no_brief_keeps_the_prompt_to_supplier_data():
    llm = FakeLLM("Subject: New\n\nBody")
    _run_node(llm, message="draft it and sign as Jane", email_changes=True, conversation_history=[])
    assert "## NEGOTIATION ARGUMENTS" not in llm.prompts[0]


class FakeClassifier:
    def __init__(self, intent: Intent) -> None:
        self.intent = intent

    async def classify(self, *_: object, **__: object) -> IntentClassification:
        return IntentClassification(intent=self.intent, confidence=0.9)


def _classify(intent: Intent, message: str, last_reply: str) -> dict:
    node = make_intent_classifier_node(FakeClassifier(intent))
    history = [{"role": "user", "content": "draft"}, {"role": "ai", "content": last_reply}]
    return asyncio.run(node({"message": message, "conversation_history": history}))


def test_try_again_after_an_email_stays_on_the_email():
    out = _classify(Intent.META_OPERATION, "not good, try again", EMAIL_1)
    assert out["intent"] is Intent.DRAFT_EMAIL and out["email_edit"] is True and out["email_changes"] is True


def test_a_question_about_the_email_stays_meta_operation():
    out = _classify(Intent.META_OPERATION, "was that email in English?", EMAIL_1)
    assert out["intent"] is Intent.META_OPERATION


def test_meta_operation_after_a_non_email_reply_is_untouched():
    out = _classify(Intent.META_OPERATION, "make it shorter", "Here is the supplier summary.")
    assert out["intent"] is Intent.META_OPERATION
