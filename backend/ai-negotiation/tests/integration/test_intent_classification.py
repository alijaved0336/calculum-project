"""Classifier-only intent regression set.

Guards against the failure mode raised in review: trimming the classifier
prompt's few-shot examples regressing misclassification on *near-neighbour*
intents (e.g. ``meta_operation`` vs ``summarize_supplier_position`` /
``handle_supplier_pushback``, ``answer_data_question`` vs ``out_of_scope``).

This is an *offline* test in the sense that matters here: it exercises only the
intent classifier in isolation — no server, no WebSocket, no auth, no agent
nodes — and asserts on the classified ``Intent`` alone. It does make a real LLM
call per case (the classifier *is* an LLM), so it's parked under
``tests/integration`` and skips cleanly when no LLM backend is configured.

The classifier runs at ``temperature=0`` (see ``LLMIntentClassifier.classify``),
so results are stable enough to assert on directly.

Run it::

    .venv/bin/pytest tests/integration/test_intent_classification.py -v
"""
from __future__ import annotations

from dataclasses import dataclass, field

import pytest
import pytest_asyncio

from config import settings
from domain.entities.intent import Intent
from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier
from infrastructure.llm.llm_client import LLMClient
from utils.prompts.conversation_history import ConversationTurn

# A live LLM backend is required; skip the whole module when it isn't wired
# (CI without creds, local dev offline) rather than failing spuriously.
pytestmark = pytest.mark.skipif(
    not settings.llm_base_url,
    reason="No LLM backend configured (settings.llm_base_url empty); skipping live classifier regression.",
)

# A short prior exchange so the meta_operation cases have real output to refer
# back to — "make it shorter" only means meta_operation when something exists
# to shorten. Mirrors how the graph passes `conversation_history`.
_PLAYBOOK_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "Generate a full negotiation playbook for this supplier."},
    {
        "role": "ai",
        "content": (
            "# Negotiation Playbook\n"
            "## Objectives — push from 30 to 62 days.\n"
            "## Leverage — high; spend concentration on our side.\n"
            "## Likely objections — margin erosion, currency volatility.\n"
            "## Concessions — volume guarantee, SCF as a fallback."
        ),
    },
]


# Prior turns for the follow-up cases. A follow-up is classified on what it
# asks for ONCE the back-reference is resolved — not on the fact that it points
# backwards, which is what used to funnel these into `meta_operation` (a node
# that cannot look anything up and would have answered them from the transcript).
_DEFINITION_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "what is the definition of supplier standard"},
    {
        "role": "ai",
        "content": (
            "Supplier Standard is the payment term this supplier has agreed with "
            "its other customers — their own observed standard."
        ),
    },
]

_PROFILE_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "provide the general details of this supplier, nothing about payment terms"},
    {
        "role": "ai",
        "content": (
            "**Supplier**: Acme Industrial GmbH, Germany, Manufacturing, large. "
            "Credit BBB / country AA.\n"
            "**Outlook**: success probability high; buyer leverage high; spend $12.40M.\n"
            "**Arguments**: Buyer Standard 80 days; Existing Relationship "
            "Precedent 76 days; Peer Group Standard 60 days; Industry Region Standard 40 days."
        ),
    },
]

_LEVERAGE_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "what's our leverage here?"},
    {"role": "ai", "content": "Buyer leverage is high; the posture is buyer-favored."},
]


# The reported transcript. A negotiator asked for a German email, got English,
# said so, and got English again — then said "good" and was introduced to the
# assistant from scratch. Routing is only part of that story, but it is the part
# that decides WHO the assistant thinks is talking to it.
_ENGLISH_EMAIL = (
    "Subject: Payment Terms Standardisation of 75 Days Effective by [MM, DD, YYYY]\n\n"
    "Dear U.S. Foodservice, Inc,\n\nAs part of our ongoing standardisation of "
    "payment terms across our supplier base, we are updating the terms for your "
    "account.\n\nWe are standardising our payment terms from 34 days to 75 days."
)

_WRONG_LANGUAGE_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "draft an email in German"},
    {"role": "ai", "content": _ENGLISH_EMAIL},
]

_FALSE_CLAIM_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "was that in german language?"},
    {"role": "ai", "content": "Yes, the draft email was provided in German language."},
]

_PUSHBACK_PREP_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "prepare potential pushbacks from this supplier"},
    {
        "role": "ai",
        "content": (
            "U.S. Foodservice, Inc is extending from 34 to 75 days; these are the objections to prepare for.\n\n"
            '**1. "This will hurt our cash flow."**\n'
            "* **Why to expect it:** a 41-day extension delays their cash.\n"
            '* **Say:** "For your organization, the cost impact is minimal."'
        ),
    },
]

_OFFER_HISTORY: list[ConversationTurn] = [
    {"role": "user", "content": "what does extending to 60 days unlock?"},
    {
        "role": "ai",
        "content": (
            "Extending to 60 days would free up working capital. "
            "Would you like me to run the 60-day scenario now?"
        ),
    },
]


@dataclass(frozen=True)
class Case:
    id: str
    message: str
    expected: Intent
    history: list[ConversationTurn] | None = field(default=None)
    # Asserted only when set. `response_mode` decides how long the answer runs,
    # and it used to key on the GRAMMAR of the question: anything answerable
    # with yes/no came back "quick", which caps the reply at 2-3 sentences. A
    # negotiator asking "can we still negotiate longer terms?" got one sentence
    # with no reasoning. Judgement questions are conversational however they are
    # phrased; only a bare lookup or an explicit "briefly" is quick.
    mode: str | None = field(default=None)
    # Substrings the standalone rewrite must contain. Asserted on meaning rather
    # than an exact string: the rewrite is generated prose, so pinning it
    # verbatim would fail on wording that is perfectly correct. What matters is
    # that the back-reference was actually resolved to the right subject.
    resolved_mentions: list[str] | None = field(default=None)
    summary_tier: str | None = None
    summary_scope: str | None = None
    # Asserted only when set: whether a pushback turn prepares for objections
    # not yet raised rather than answering one that was.
    pushback_anticipate: bool | None = None


# Weighted toward the near-neighbour boundaries the review flagged; a spine of
# unambiguous cases keeps the common intents honest too.
CASES: list[Case] = [
    # ── near-neighbour boundaries (the crux of the regression) ──────────────
    Case("meta_shorter_vs_summarize", "Can you make it shorter? Max 10 lines.", Intent.META_OPERATION, _PLAYBOOK_HISTORY),
    Case("meta_expand_vs_pushback", "Expand the objections part.", Intent.META_OPERATION, _PLAYBOOK_HISTORY),
    Case("meta_bullets", "Put that in bullet points.", Intent.META_OPERATION, _PLAYBOOK_HISTORY),
    Case("meta_recall", "Summarize everything we've discussed so far.", Intent.META_OPERATION, _PLAYBOOK_HISTORY),
    Case("data_wacc_vs_oos", "What is the WACC for this supplier?", Intent.ANSWER_DATA_QUESTION),
    Case("data_scf_rate", "What's the SCF rate and how does it compare to their financing rate?", Intent.ANSWER_DATA_QUESTION),
    Case("data_walkaway_vs_scenario", "What should be our walkaway term position for this supplier?", Intent.ANSWER_DATA_QUESTION),
    Case("data_fallback_term", "What is our fallback payment term days for this supplier?", Intent.ANSWER_DATA_QUESTION),
    Case("benchmark_selection_vs_data", "Should I use the industry benchmark or the supplier standard?", Intent.EXPLAIN_RECOMMENDATION),
    # The "Recommend negotiation arguments." chip (offered after a playbook or an
    # opportunity summary) was classified summarize_supplier_position and came
    # back as a large supplier briefing instead of the ranked arguments.
    Case("recommend_arguments_vs_summary", "Recommend negotiation arguments.", Intent.EXPLAIN_RECOMMENDATION),
    Case("recommend_arguments_after_playbook", "Recommend negotiation arguments.", Intent.EXPLAIN_RECOMMENDATION, _PLAYBOOK_HISTORY),
    Case("additional_arguments_vs_summary", "Show additional arguments to optimize payment terms.", Intent.EXPLAIN_RECOMMENDATION),
    # A negotiator asking what they MAY say went to handle_supplier_pushback —
    # the catch-all objection intent — which framed their own question as the
    # supplier's objection and answered it with a canned refusal. The disclosure
    # rules live on the arguments, so the question belongs to explain_recommendation.
    Case("disclosure_permission_vs_pushback", "Can I tell the supplier that they already accept 75-day terms from other customers?", Intent.EXPLAIN_RECOMMENDATION, mode="conversational"),
    Case("disclosure_permission_vs_oos", "Is it safe to say their peers all pay on 60-day terms?", Intent.EXPLAIN_RECOMMENDATION, mode="conversational"),
    # ── response_mode: judgement vs lookup, not yes/no grammar ──────────────
    # Each of these is answerable with one word and needs the reasoning anyway.
    Case("mode_judgement_can_we", "Can you check whether we can still negotiate longer terms?", Intent.EXPLAIN_RECOMMENDATION, mode="conversational"),
    Case("mode_judgement_should_i", "Should I lead with the relationship precedent?", Intent.EXPLAIN_RECOMMENDATION, mode="conversational"),
    Case("mode_judgement_is_x", "Is our position strong enough to hold at 75 days?", Intent.EXPLAIN_RECOMMENDATION, mode="conversational"),
    # The mode rule has to hold whichever intent wins — it decides how long the
    # answer runs, not what kind of answer it is. This one lands on
    # answer_data_question and must still come back with its reasoning.
    Case("mode_judgement_across_intents", "Does their DSO give us any leverage here?", Intent.ANSWER_DATA_QUESTION, mode="conversational"),
    # The other side of the line — these must stay short.
    Case("mode_bare_lookup_stays_quick", "What is their WACC?", Intent.ANSWER_DATA_QUESTION, mode="quick"),
    Case("mode_explicit_brevity_stays_quick", "Briefly — what's our walkaway?", Intent.ANSWER_DATA_QUESTION, mode="quick"),
    # ── scope: the boundary is the SUPPLIER, not the words "payment terms" ──
    # out_of_scope was defined as "not about THIS supplier's payment terms", so
    # a question about the supplier's own profile got refused outright — the
    # negotiator asked for general information about the supplier and was told
    # to rephrase it as a payment-term question. The assistant holds the whole
    # supplier profile; only a different subject is out of scope.
    Case("general_info_not_terms_vs_oos", "Provide me general information about this supplier not related to payment terms.", Intent.SUMMARIZE_SUPPLIER_POSITION),
    Case("profile_who_are_they_vs_oos", "Tell me about this supplier — who are we dealing with?", Intent.SUMMARIZE_SUPPLIER_POSITION),
    Case("profile_attribute_vs_oos", "What industry are they in and how big is the company?", Intent.ANSWER_DATA_QUESTION),
    Case("profile_rating_vs_oos", "What's their credit rating?", Intent.ANSWER_DATA_QUESTION, mode="quick"),
    # The negative side of the same line must still hold.
    Case("oos_cross_supplier_vs_scenario", "What's our total working capital opportunity across all suppliers?", Intent.OUT_OF_SCOPE),
    Case("oos_unrelated_macro", "What do you make of the central bank's rate decision this quarter?", Intent.OUT_OF_SCOPE),
    Case("pushback_not_data", "What's our leverage here — should we push hard?", Intent.SUMMARIZE_SUPPLIER_POSITION),
    # ── follow-ups: classified on the RESOLVED question ─────────────────────
    # Each of these is meaningless on its own. The classifier resolves the
    # back-reference to route the turn, and now writes that resolution into
    # `resolved_question` so the answering node does not redo it from a shorter
    # view of the thread — which is where "what's ITS difference vs peer group
    # standard" came back comparing peer group to the CURRENT TERM.
    Case("followup_pronoun_needs_data", "what's its difference compared to peer group standard",
         Intent.ANSWER_DATA_QUESTION, _DEFINITION_HISTORY, mode="conversational",
         resolved_mentions=["supplier standard", "peer group"]),
    Case("followup_explain_these_needs_arguments", "explain each of these along with useful benchmarks i can use",
         Intent.EXPLAIN_RECOMMENDATION, _PROFILE_HISTORY, mode="conversational"),
    Case("followup_bare_why", "why?", Intent.EXPLAIN_RECOMMENDATION, _LEVERAGE_HISTORY,
         mode="conversational", resolved_mentions=["leverage"]),
    # Reshaping prior output still belongs to meta_operation — the other side of
    # the same line, and the one that must NOT move.
    Case("meta_reshape_still_meta", "put that in bullet points", Intent.META_OPERATION, _PLAYBOOK_HISTORY),
    # ── who is the complaint about: us, or the supplier? ────────────────────
    # This is the one that must never regress. "are you insane its not german
    # its english" was routed to handle_supplier_pushback, which answered the
    # negotiator's complaint about a broken draft with advice on apologising to
    # a supplier who was never part of the conversation.
    Case("complaint_about_assistant_not_supplier", "are you insane its not german its english",
         Intent.META_OPERATION, _FALSE_CLAIM_HISTORY),
    Case("still_wrong_language_is_a_redo", "seriously ? its still not in german language",
         Intent.META_OPERATION, _WRONG_LANGUAGE_HISTORY),
    # The supplier side of the same line still holds.
    Case("relayed_supplier_objection_stays_pushback",
         "they came back saying our terms will kill their margin — what do I say?",
         Intent.HANDLE_SUPPLIER_PUSHBACK, pushback_anticipate=False),
    # ── preparing for objections: pushback, never the whole playbook ────────
    # "Prepare potential pushbacks" — the product's own follow-up chip — was
    # classified generate_negotiation_playbook, because the playbook was the only
    # intent that mentioned objection handling. The negotiator asked for the
    # objections and got the whole document.
    Case("prepare_pushbacks_not_playbook", "prepare potential pushbacks",
         Intent.HANDLE_SUPPLIER_PUSHBACK, _OFFER_HISTORY, pushback_anticipate=True),
    Case("prepare_pushbacks_chip_after_playbook", "Prepare potential push backs.",
         Intent.HANDLE_SUPPLIER_PUSHBACK, _PLAYBOOK_HISTORY, pushback_anticipate=True),
    Case("expected_objections_not_playbook", "What objections should I expect from them?",
         Intent.HANDLE_SUPPLIER_PUSHBACK, pushback_anticipate=True),
    # Follow-ups to a list of prepared pushbacks went to meta_operation, which
    # can only rework the transcript and sent the same list back every time.
    Case("more_pushbacks_followup", "didn't you find any other pusbacks",
         Intent.HANDLE_SUPPLIER_PUSHBACK, _PUSHBACK_PREP_HISTORY, pushback_anticipate=True),
    Case("scan_whole_supplier_followup", "scan the whole supplier and give me the potential pushbacks",
         Intent.HANDLE_SUPPLIER_PUSHBACK, _PUSHBACK_PREP_HISTORY, pushback_anticipate=True),
    Case("which_pushback_most_likely", "which of these is most likely?",
         Intent.HANDLE_SUPPLIER_PUSHBACK, _PUSHBACK_PREP_HISTORY, pushback_anticipate=True),
    Case("named_hypothetical_objection_is_reactive", "What if they say it hurts their cash flow?",
         Intent.HANDLE_SUPPLIER_PUSHBACK, pushback_anticipate=False),
    # ── a question ABOUT a previous answer ──────────────────────────────────
    Case("question_about_prior_output", "was that in german language?",
         Intent.META_OPERATION, _WRONG_LANGUAGE_HISTORY),
    # ── a bare affirmation is classified on the OFFER it accepts ────────────
    Case("bare_yes_takes_the_offer", "yes", Intent.RUN_SCENARIO, _OFFER_HISTORY,
         resolved_mentions=["60"]),
    # ── an acknowledgement mid-thread is not an instruction ─────────────────
    Case("ack_good_is_not_a_reshape", "good", Intent.GREETING, _WRONG_LANGUAGE_HISTORY),
    Case("ack_thanks_is_not_a_reshape", "thanks, that helps", Intent.GREETING, _PLAYBOOK_HISTORY),
    # ── unambiguous spine ───────────────────────────────────────────────────
    Case("pushback_margin", "They keep saying our terms will kill their margin — what do I say?", Intent.HANDLE_SUPPLIER_PUSHBACK),
    Case("counter_offer", "They came back with 45 days — should we take it?", Intent.EVALUATE_COUNTER_OFFER),
    Case("scenario_extend", "What's the cash impact if we extend by 16 days?", Intent.RUN_SCENARIO),
    # ── economic profit: a price-for-terms trade-off is still a scenario ─────
    # The near neighbour is evaluate_counter_offer, and the line between them
    # is what is being ASKED, not who named the number: "is this financially
    # worth it" is arithmetic (run_scenario, then the economic-profit
    # calculator), "should we take it / what do I say" is a negotiation call.
    # The supplier having named a price does not move the first one.
    Case("ep_price_for_terms_worth_it", "Supplier wants 1% more for 90 days. Is it worth it?", Intent.RUN_SCENARIO),
    Case("ep_extend_and_accept_increase", "What if we extend 30 days and accept a 2% price increase?", Intent.RUN_SCENARIO),
    Case("ep_break_even", "How much can price increase before 90 days stops being worth it?", Intent.RUN_SCENARIO),
    Case("ep_compare_scenarios", "Compare 75 days at the current price with 90 days at +1%.", Intent.RUN_SCENARIO),
    Case("ep_compensating_discount", "What discount would compensate us if they stay at 60 days?", Intent.RUN_SCENARIO),
    Case("ep_discount_no_extension", "What if they give us a 1% discount but refuse to extend payment terms?", Intent.RUN_SCENARIO),
    # The existing working-capital question must NOT be dragged along with
    # them: it is the same intent, and the extraction step keeps it on the
    # unlock calculator.
    Case("ep_plain_unlock_still_scenario", "How much cash flow do I unlock at 90 days?", Intent.RUN_SCENARIO),
    # The other side of the line, which must not move.
    Case("ep_counter_offer_decision_stays_counter", "They came back with 45 days and a 1% increase - what should I say?", Intent.EVALUATE_COUNTER_OFFER),
    Case("explain_rating", "Why 62 days and not 75?", Intent.EXPLAIN_RECOMMENDATION),
    Case("playbook_full", "Generate a full negotiation guide for this supplier.", Intent.GENERATE_NEGOTIATION_PLAYBOOK),
    Case("scf_reframe", "Should we bring SCF into this negotiation?", Intent.REFRAME_WITH_FINANCING),
    Case("override", "Just go with 75 days, ignore the benchmark.", Intent.APPLY_OVERRIDE),
    Case("summarize", "What do we know about this supplier?", Intent.SUMMARIZE_SUPPLIER_POSITION),
    Case("supplier_insights", "Give me supplier insights", Intent.SUMMARIZE_SUPPLIER_POSITION),
    Case("supplier_stats", "Give me supplier stats", Intent.SUMMARIZE_SUPPLIER_POSITION),
    Case("greeting", "hi", Intent.GREETING),
    Case("intro_who_are_you", "who are you?", Intent.ANSWER_DATA_QUESTION),
    Case("intro_about_yourself", "tell me about yourself", Intent.ANSWER_DATA_QUESTION),
    Case("intro_what_can_you_do", "hi, what can you help me with?", Intent.ANSWER_DATA_QUESTION),
    Case("intro_about_calculum", "tell me about calculum", Intent.ANSWER_DATA_QUESTION),
    Case("intro_them_is_the_supplier", "tell me about them", Intent.SUMMARIZE_SUPPLIER_POSITION),
]


SUMMARY_CASES = [
    Case("summary_key_facts", "Provide me key facts", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="small", summary_scope="summary"),
    Case("summary_insights", "Provide me insights about this supplier", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="small", summary_scope="summary"),
    Case("summary_no_terms", "General information, not about payment terms", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="small", summary_scope="summary"),
    Case("summary_important", "What are the most important things I should know about this supplier?", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="large", summary_scope="summary"),
    Case("summary_data_default", "Summarize this supplier data for me", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="large", summary_scope="summary"),
    Case("summary_standing", "Where do we stand?", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="large", summary_scope="summary"),
    Case("summary_position", "Summarize the supplier position", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="large", summary_scope="summary"),
    Case("summary_detailed", "Give me a detailed summary", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="large", summary_scope="summary"),
    Case("summary_full_profile", "Give me a full company profile, not negotiation advice", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_tier="small", summary_scope="summary"),
    Case("summary_narrow_detailed", "Explain our leverage in full detail", Intent.SUMMARIZE_SUPPLIER_POSITION, summary_scope="narrow"),
]


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def classifier() -> LLMIntentClassifier:
    """One classifier for the whole module, built inside the session loop.

    Mirrors production (a single cached client per process) and avoids the
    cross-loop reuse — a function-scoped loop tearing down a client created in
    another — that surfaces as "Event loop is closed".
    """
    llm = LLMClient(
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        chat_path=settings.chat_path,
        enable_thinking=settings.llm_enable_thinking,
    )
    try:
        yield LLMIntentClassifier(llm=llm)
    finally:
        await llm.aclose()


@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("case", CASES, ids=lambda c: c.id)
async def test_intent_classification(case: Case, classifier: LLMIntentClassifier) -> None:
    result = await classifier.classify(case.message, history=case.history)
    assert result.intent == case.expected, (
        f"[{case.id}] {case.message!r}\n"
        f"  expected {case.expected.value}, got {result.intent.value} "
        f"(confidence={result.confidence:.2f}; reasoning={result.reasoning!r})"
    )
    if case.summary_tier is not None:
        assert result.summary_tier == case.summary_tier
    if case.summary_scope is not None:
        assert result.summary_scope == case.summary_scope
    if case.pushback_anticipate is not None:
        assert result.pushback_anticipate is case.pushback_anticipate, (
            f"[{case.id}] {case.message!r}\n"
            f"  expected pushback_anticipate {case.pushback_anticipate}, got "
            f"{result.pushback_anticipate} (reasoning={result.reasoning!r})"
        )
    if case.mode is not None:
        assert result.response_mode == case.mode, (
            f"[{case.id}] {case.message!r}\n"
            f"  expected response_mode {case.mode}, got {result.response_mode} "
            f"(reasoning={result.reasoning!r})"
        )
    # Follow-ups are no longer generated at classification time — the
    # classifier only runs before the response exists, so it can't ground
    # suggestions in what was actually said. They're generated afterwards,
    # grounded in the real response, by `generate_follow_ups`
    # (see tests/unit/test_follow_up_generator.py).
    assert result.follow_ups is None, (
        f"[{case.id}] follow_ups should be None from the classifier now; got {result.follow_ups}"
    )


@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("case", SUMMARY_CASES, ids=lambda c: c.id)
async def test_summary_category(case: Case, classifier: LLMIntentClassifier) -> None:
    result = await classifier.classify(case.message, history=case.history)
    assert result.intent == case.expected, result.reasoning
    assert result.summary_scope == case.summary_scope, result.reasoning
    if case.summary_tier is not None:
        assert result.summary_tier == case.summary_tier, result.reasoning
