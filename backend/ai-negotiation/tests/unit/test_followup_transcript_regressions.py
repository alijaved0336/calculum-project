"""Regression guard driven by real negotiator queries captured across the
Sept 9/10/15 live demo, playbook-design-call, and UAT sessions.

Two properties must hold for every one of these queries, regardless of what
the LLM-generated follow-up call returns:
  1. No follow-up chip ever echoes back the exact question just asked.
  2. No follow-up chip ever suggests a playbook with a day-count attached
     (e.g. "Generate playbook for 60 days") — the playbook capability takes
     no day-count parameter at all.

Exercised via an adversarial fake LLM that deliberately tries to produce both
failure modes, so this catches a regression in the deterministic backstops
even if the real LLM never happens to produce either shape during manual
testing.
"""
from __future__ import annotations

import pytest

from agents.nodes.follow_up_generator import generate_follow_ups
from domain.services.follow_up_policy import normalise_message

# (message, best-guess intent) pairs transcribed from the transcripts.
TRANSCRIPT_QUERIES = [
    ("Suggest a strong opening offer", "recommend_opening_strategy"),
    ("Draft opening email", "draft_email"),
    ("Write a longer opening email template", "meta_operation"),
    ("Make it more negotiable and collaborative", "meta_operation"),
    ("Turn it into a senior management message", "draft_email"),
    ("Translate to German", "meta_operation"),
    ("Personalize the email for Paul Bremer", "meta_operation"),
    ("Supplier position", "summarize_supplier_position"),
    ("Supplier insights", "summarize_supplier_position"),
    ("What does high leverage mean?", "explain_recommendation"),
    ("What is buyer standard?", "answer_data_question"),
    ("Difference compared to peer group average", "answer_data_question"),
    ("Opening position for CCL Industry", "recommend_opening_strategy"),
    ("Show arguments and strategies for CCL Industry", "explain_recommendation"),
    ("Generate playbook or opening strategy for Computer Center", "generate_negotiation_playbook"),
    ("Generate playbook", "generate_negotiation_playbook"),
    ("Provide summary of the payment terms opportunity for Three Fish", "summarize_supplier_position"),
    ("Suggest me an opening strategy", "recommend_opening_strategy"),
    ("Suggest me an opening position", "recommend_opening_strategy"),
    ("Give me the one strongest benchmark argument", "explain_recommendation"),
    ("How far can we push the supplier?", "explain_recommendation"),
    ("What if the supplier rejects and offers a discount?", "run_scenario"),
    ("What if I push to 120 days instead of 90 - cash flow impact?", "run_scenario"),
    ("What if I extend 30 days and also change price?", "run_scenario"),
    ("Key facts about the supplier", "answer_data_question"),
    ("Summarize supplier position", "summarize_supplier_position"),
    ("Provide summary of payment terms opportunity", "summarize_supplier_position"),
    ("Handle if Checkpoint rejects", "handle_supplier_pushback"),
    ("Run 90-day payment scenario", "run_scenario"),
    ("Generate negotiation playbook", "generate_negotiation_playbook"),
    ("Handle supplier pushback", "handle_supplier_pushback"),
    ("Run financial impact scenario", "run_scenario"),
]


class _AdversarialLLM:
    """Always tries to echo the user's own message AND attach a day-count to
    a playbook suggestion — the two shapes this test guards against."""

    def __init__(self, user_message: str) -> None:
        self.user_message = user_message

    async def complete(self, prompt: str, **kwargs) -> str:
        echo = self.user_message.replace('"', "")
        return (
            f'["{echo}", "Generate playbook for 60 days", "Handle likely supplier pushback"]'
        )


@pytest.mark.asyncio
@pytest.mark.parametrize("message,intent", TRANSCRIPT_QUERIES)
async def test_transcript_query_never_echoes_or_leaks_playbook_days(
    message: str, intent: str
) -> None:
    result = await generate_follow_ups(
        llm=_AdversarialLLM(message),
        user_message=message,
        assistant_response="A generated response with enough content to not be empty.",
        intent_value=intent,
    )
    norm_msg = normalise_message(message)
    assert not any(normalise_message(f) == norm_msg for f in result), (
        f"follow-up echoed the question back verbatim: {result}"
    )
    assert not any(
        "playbook" in f.lower() and "day" in f.lower() and any(c.isdigit() for c in f)
        for f in result
    ), f"follow-up attached a day-count to a playbook suggestion: {result}"
