"""generate → verify → revise once → ship labelled (Phase 2, §3.4/§6.3).

The contract every drafting node now shares, so none of them grows its own
version of it again.
"""
from __future__ import annotations

import pytest

from agents.verified_generation import generate_verified, verification_errors
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.brief_builder import brief_from


def _facts() -> SupplierFacts:
    return SupplierFacts(
        supplier_name="Acme", country="DE", industry="Manufacturing", company_size="large",
        target_term_days=90, current_term_days=60, batna_term_days=None,
        benchmark_term_days=None, regulatory_max_term_days=None,
        strategy_benchmarks=[
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=95),
        ],
    )


_BRIEF = brief_from(_facts())

_GOOD = "We are asking for 90 days."
_BAD = "We are asking for 47 days."


class _Scripted:
    """Returns each scripted draft in turn, recording the prompts it saw."""

    def __init__(self, *drafts: str) -> None:
        self._drafts = list(drafts)
        self.prompts: list[str] = []

    async def __call__(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self._drafts.pop(0)


@pytest.mark.asyncio
async def test_a_clean_draft_is_returned_after_one_call():
    generate = _Scripted(_GOOD)
    text, violations = await generate_verified(
        node="t", prompt="P", brief=_BRIEF, generate=generate
    )
    assert text == _GOOD
    assert violations == []
    assert len(generate.prompts) == 1


@pytest.mark.asyncio
async def test_a_failing_draft_is_regenerated_with_the_failure_quoted_back():
    generate = _Scripted(_BAD, _GOOD)
    text, violations = await generate_verified(
        node="t", prompt="P", brief=_BRIEF, generate=generate
    )
    assert text == _GOOD
    assert violations == []
    assert len(generate.prompts) == 2
    # The retry carries the original prompt plus the specific failure — the
    # model already had the rules and broke them; what it lacks is which line.
    assert generate.prompts[1].startswith("P")
    assert "47 days" in generate.prompts[1]
    assert "REGENERATE" in generate.prompts[1]


@pytest.mark.asyncio
async def test_a_draft_that_fails_twice_still_ships_and_ships_clean():
    """Client, 2026-08-25: the verdict is internal — never stamped on the text.

    The failure banner reached a client playbook on three false positives, and
    a false alarm at the bottom of a prep document makes the document look
    broken rather than making the negotiator careful. `violations` still comes
    back for the logs and the node's `errors`.
    """
    generate = _Scripted(_BAD, _BAD)
    text, violations = await generate_verified(
        node="t", prompt="P", brief=_BRIEF, generate=generate
    )
    assert len(generate.prompts) == 2
    assert violations                      # reported to the caller
    assert text == _BAD                    # and nothing added to the document
    assert "Check before using" not in text


@pytest.mark.asyncio
async def test_revise_false_reports_without_paying_for_a_second_call():
    """The conversational setting: latency costs more than a revision pass."""
    generate = _Scripted(_BAD)
    text, violations = await generate_verified(
        node="t", prompt="P", brief=_BRIEF, generate=generate, revise=False
    )
    assert len(generate.prompts) == 1
    assert violations
    assert text == _BAD
    assert "Check before using" not in text


@pytest.mark.asyncio
async def test_revise_false_returns_a_clean_draft_untouched():
    generate = _Scripted(_GOOD)
    text, violations = await generate_verified(
        node="t", prompt="P", brief=_BRIEF, generate=generate, revise=False
    )
    assert text == _GOOD and violations == []


@pytest.mark.asyncio
async def test_an_initial_draft_is_verified_rather_than_regenerated():
    """The playbook has its own structural retry first.

    Without this the helper would call the model again and silently double
    every playbook request.
    """
    generate = _Scripted(_GOOD)   # would be used only if it regenerated
    text, violations = await generate_verified(
        node="t", prompt="P", brief=_BRIEF, generate=generate, initial=_GOOD
    )
    assert text == _GOOD and violations == []
    assert generate.prompts == []


@pytest.mark.asyncio
async def test_postprocess_runs_before_verification_on_every_attempt():
    """What gets checked has to be what ships."""
    seen: list[str] = []

    def postprocess(text: str) -> str:
        seen.append(text)
        return text.replace("47", "90")

    generate = _Scripted(_BAD)
    text, violations = await generate_verified(
        node="t", prompt="P", brief=_BRIEF, generate=generate, postprocess=postprocess,
    )
    assert seen == [_BAD]
    assert violations == []
    assert "90 days" in text


@pytest.mark.asyncio
async def test_no_brief_means_nothing_to_verify_against():
    generate = _Scripted("anything at all")
    text, violations = await generate_verified(
        node="t", prompt="P", brief=None, generate=generate
    )
    assert text == "anything at all" and violations == []


def test_the_errors_fragment_is_empty_on_a_pass():
    assert verification_errors("t", []) == {}


def test_the_errors_fragment_names_the_node():
    from domain.services.output_verifier import verify_output

    violations = verify_output(_BAD, _BRIEF).violations
    fragment = verification_errors("playbook", violations)
    assert fragment["errors"] and fragment["errors"][0].startswith("playbook: ")
