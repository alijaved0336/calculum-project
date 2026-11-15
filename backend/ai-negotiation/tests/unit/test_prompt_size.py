"""Assembled prompts must not silently regrow (§5).

The prompt got to 46,286 characters one addition at a time, and every single
addition looked reasonable on its own. A ceiling per intent is what makes the
next one a decision instead of an accident.

These are CEILINGS, not targets. Raising one is fine — but it has to be done
deliberately, in a diff someone reads, with the reason in the commit.
"""
from __future__ import annotations

import pytest

from tests.unit.prompt_fixtures import build_all_prompts, rich_facts

# Measured against a fully-populated supplier — every bucket filled, every
# assessment usable — so these are the worst case, not the typical one.
#
# Set roughly 15% above the current measurement: enough headroom for ordinary
# wording changes, tight enough that a whole new block trips it.
_CEILINGS = {
    # Raised 18,000 -> 21,500 on 2026-08-25: section 5 became a decided-in-code
    # block ("## OBJECTIONS", `domain.services.objections`) the same way section
    # 3 did, carrying the client's fixed objection set with a pre-written
    # counter and a usage limit for each. It is the single largest block in the
    # prompt and it replaces free-form prose the model used to invent — the
    # trade the whole playbook has been making deliberately. Partly offset:
    # Objections no longer appears in the APPROVED PLAYS block at all.
    "negotiation_guide": 21_500,
    # Raised 14,000 -> 15,500 on 2026-09-09: the prompt now carries
    # `## BENCHMARK EVIDENCE` — each supporting benchmark's day figure,
    # occurrence count and per-source market-evidence wording (see
    # `utils.prompts.opening_strategy_prompt`). The client's reviewed opening
    # strategy states those figures in section 1 ("already accepting on average
    # 67 days from other customers and 79 days from the top quartile"), and the
    # averages and quartiles reached no prompt below LEVEL_FULL facts, so the
    # sentence could not be written at all. Partly offset: sections 4 and 5 are
    # gone from the system prompt, which this ceiling does not measure.
    "opening_strategy": 15_500,
    "evaluate_counter_offer": 14_000,
    "explain_recommendation": 13_500,
    "pushback": 13_500,
    # Was 11,500 while it carried the full facts block, every argument bucket
    # and the posture judgments. Since 2026-09-14 it carries the rendered
    # client template and nothing else (`utils.prompts.summary_template`).
    "summarize": 3_000,
    # Was 9,822 while it carried the argument block its own system prompt told
    # it not to use. It is a factual-lookup surface; it has no business being
    # anywhere near the drafting surfaces.
    "answer_data_question": 4_500,
    "reframe_with_scf": 3_000,
    "scenario": 1_500,
    # The economic-profit scenario (2026-09-18). Larger than the plain
    # scenario prompt because it carries a per-scenario breakdown (both legs,
    # the net, the working-capital swing), the break-even, and the narrow
    # term-evidence block that keeps the financial answer and the negotiation
    # answer apart. Still one of the smallest prompts here: a comparison
    # renders two of those blocks, and this ceiling leaves room for it.
    "economic_profit": 2_500,
    "meta_operation": 1_000,
}


@pytest.fixture(scope="module")
def prompts() -> dict[str, str]:
    return build_all_prompts(rich_facts())


@pytest.mark.parametrize("intent", sorted(_CEILINGS))
def test_the_assembled_prompt_stays_under_its_ceiling(intent, prompts):
    size = len(prompts[intent])
    assert size <= _CEILINGS[intent], (
        f"{intent} is {size} chars, over its {_CEILINGS[intent]} ceiling. "
        "If the growth is intended, raise the ceiling in this file and say why."
    )


def test_every_rendered_intent_has_a_ceiling(prompts):
    """A new intent must not slip in unmeasured."""
    assert set(prompts) == set(_CEILINGS)


# The SYSTEM prompt is measured separately because `build_all_prompts` renders
# user turns only — and the playbook's system prompt is the larger half (20,847
# vs 15,254). It grew to 23,278 unwatched precisely because nothing looked at it.
_PLAYBOOK_SYSTEM_CEILING = 21_500


def test_the_playbook_system_prompt_stays_under_its_ceiling():
    from utils.prompts.negotiation_guide_prompt import negotiation_guide_system_prompt

    size = len(negotiation_guide_system_prompt)
    assert size <= _PLAYBOOK_SYSTEM_CEILING, (
        f"playbook system prompt is {size} chars, over its "
        f"{_PLAYBOOK_SYSTEM_CEILING} ceiling. It is 84% six section specs; if a "
        "rule is already enforced in code, cut the prose instead of raising this."
    )


def test_the_playbook_total_is_what_the_client_actually_sees():
    """System + user, the figure the plan tracks against its 46,286 baseline."""
    from utils.prompts.negotiation_guide_prompt import negotiation_guide_system_prompt
    from tests.unit.prompt_fixtures import build_all_prompts, rich_facts

    total = len(negotiation_guide_system_prompt) + len(
        build_all_prompts(rich_facts())["negotiation_guide"]
    )
    # 43,000 as of 2026-08-25, still under the 46,286 baseline. Three sections
    # became decided-in-code blocks this month — BATNA (3), Objections (5) and
    # Concessions (6) — and each one trades free-form prose the model used to
    # invent for content the engine hands it. The blocks are why the USER turn
    # grew; the SYSTEM prompt shrank in the same change, because a rendered
    # block needs a shorter spec than an open brief does.
    assert total <= 43_000, f"playbook total is {total} chars (baseline was 46,286)"


def test_the_data_question_no_longer_carries_the_argument_block(prompts):
    """The C-1 contradiction: told to answer factually, handed the pitch set.

    Its system prompt opens with "pure information retrieval: no negotiation
    strategy, recommendation, or suggested wording is expected".
    """
    prompt = prompts["answer_data_question"]
    assert "## NEGOTIATION ARGUMENTS" not in prompt
    assert "USE TO JUSTIFY THE ASK" not in prompt
    # ...but the facts stay, success probability among them: "how likely is
    # this to land?" is a data question like any other.
    assert "## FACTS" in prompt
