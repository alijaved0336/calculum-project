from __future__ import annotations

import logging
from decimal import Decimal, InvalidOperation
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.services.brief_builder import build_negotiation_brief
from domain.entities.economic_profit import (
    ECONOMIC_PROFIT_CALC_TYPES,
    EconomicProfitScenarioSpec,
)
from domain.entities.scenario import ScenarioCalculation, ScenarioRequest
from domain.ports.llm_port import LLMPort
from domain.services.economic_profit import parse_price_change
from domain.services.scenario_calculator import (
    run_economic_profit_scenarios,
    run_scenario_calculation,
)
from domain.services.scf_policy import apply_scf_prompt_policy
from utils.constants import collect_rag_source, format_source_label
from utils.json_extract import extract_first_json_object
from utils.prompts.response_mode import get_format_instruction
from utils.prompts.scenario_prompt import (
    ECONOMIC_PROFIT_INTERPRETATION_HEADING,
    build_economic_profit_response_prompt,
    build_multi_term_response_prompt,
    build_scenario_extraction_prompt,
    build_scenario_response_prompt,
    collect_economic_profit_sources,
    collect_scenario_sources,
    economic_profit_response_system_prompt,
    render_economic_profit_answer,
    scenario_extraction_system_prompt,
    scenario_response_system_prompt,
)
from utils.prompts.brief.rules import strip_rank_tags

logger = logging.getLogger(__name__)

_RULE = "-" * 88

_VALID_CALC_TYPES = {
    "extension",
    "term_impact",
    "delta",
    "threshold",
    "ramp",
    "formula_explain",
    "multi_term_impact",
    "clarify",
    "unsupported",
    *ECONOMIC_PROFIT_CALC_TYPES,
}

# User-facing reason for an unparseable/invalid extraction result. Must not
# reference internal mechanics (parsing, JSON, extraction) — see
# utils.prompts.security_guidance.
_UNSUPPORTED_REASON = (
    "This assistant couldn't map that message to a supported payment-term "
    "scenario calculation. Try rephrasing it as a specific what-if about an "
    "extension, a comparison between two terms, or a cash target."
)




def _as_number(value: object) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_price_change(value: object) -> Decimal | None:
    """See :func:`domain.services.economic_profit.parse_price_change` - the one
    reading shared with the counter-offer node. Logged here when it had to
    normalise, because that means the extraction step slipped."""
    price = parse_price_change(value)
    if price is not None and value is not None:
        try:
            if abs(Decimal(str(value))) >= 1:
                logger.warning(
                    "scenario: price_change %r looks like percentage points - "
                    "normalised to %s", value, price,
                )
        except (InvalidOperation, TypeError, ValueError):
            pass
    return price


def _as_days(value: object) -> int | None:
    """A stated payment term as whole days. Nobody negotiates half a day."""
    days = _as_number(value)
    return None if days is None else int(round(days))


def _as_money(value: object) -> Decimal | None:
    """A stated annual spend as Decimal, built from the string form.

    ``Decimal(12000000.0)`` is exact here but ``Decimal(0.1)`` is not, and this
    figure goes straight into money arithmetic - so it takes the same route
    every other extracted number takes.
    """
    if value is None or isinstance(value, bool):
        return None
    try:
        spend = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return spend if spend.is_finite() else None


def _parse_scenarios(raw: object) -> list[EconomicProfitScenarioSpec]:
    """The `scenarios` array of an economic-profit extraction result."""
    if not isinstance(raw, list):
        return []
    specs: list[EconomicProfitScenarioSpec] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        label = entry.get("label")
        specs.append(
            EconomicProfitScenarioSpec(
                label=str(label).strip() if label else None,
                target_term_days=_as_number(entry.get("target_term_days")),
                extension_days=_as_number(entry.get("extension_days")),
                price_change=_as_price_change(entry.get("price_change")),
                # The baseline, but ONLY where the negotiator stated their own.
                # Absent (the normal case) the supplier's facts are used - see
                # `domain.services.scenario_calculator._ep_resolve_baseline`.
                current_term_days=_as_days(entry.get("current_term_days")),
                annual_spend=_as_money(entry.get("annual_spend")),
            )
        )
    return specs


def _compose_economic_profit_answer(
    analysis, draft: str, response_language: str | None
) -> str:
    """The calculation sections, then the model's interpretation of them.

    The arithmetic is laid out in code (`render_economic_profit_answer`) and
    the model writes only the judgment that follows it, so the inputs and the
    two legs the negotiator needs in order to check the scenario cannot be
    summarised away by a drafting call.

    A requested output language is the one exception: the sections have to be
    translated, which only the model can do, so there it writes the whole
    answer from the same rendering - one source of the shape either way. And a
    failed calculation has no sections at all; the draft explains what is
    missing.
    """
    sections = render_economic_profit_answer(analysis)
    if not sections or response_language:
        return draft
    body = _strip_restated_sections(draft)
    return f"{sections}\n\n{body}" if body else sections


def _strip_restated_sections(draft: str) -> str:
    """Keep only the model's own sections, from **Interpretation** onward.

    The model is told to START at **Interpretation** - the calculation
    sections above it are authored in code and sent verbatim. So anything it
    emits BEFORE that heading is drift and is dropped, whichever kind it is:
    a restated copy of the figures (printed twice, worse than either alone,
    and the copy is the one that may have drifted), OR - rarer, and the reason
    this cut is unconditional rather than gated on a calc heading - a
    regurgitated system-prompt block. The FORMATTING guardrail leaked to a
    negotiator this way, in front of the interpretation, where the old
    calc-heading gate did not catch it. A draft that never wrote the heading
    is left untouched rather than blanked.
    """
    _head, marker, tail = draft.partition(ECONOMIC_PROFIT_INTERPRETATION_HEADING)
    return f"{marker}{tail}".strip() if marker else draft.strip()


def _room_to_move_override(
    message: str, facts, request: ScenarioRequest
) -> ScenarioRequest:
    """``How far can we push?`` with no number → cash impact at the known target.

    Extraction often marks these unsupported/qualitative; the classifier already
    routes them to run_scenario, so run the target term_impact instead of
    deflecting.
    """
    msg = (message or "").casefold()
    cues = (
        "how far can we push",
        "how far can we go",
        "how much room",
        "how far to push",
        "what's the stretch",
        "what is the stretch",
        "whats the stretch",
    )
    if not any(c in msg for c in cues):
        return request
    if (
        request.calc_type == "term_impact"
        and request.target_term_days is not None
    ):
        return request
    if request.calc_type in (
        "extension",
        "delta",
        "multi_term_impact",
        "ramp",
        "threshold",
    ):
        return request
    target = facts.target_term_days
    if target is None:
        return request
    return ScenarioRequest(
        calc_type="term_impact",
        target_term_days=float(target),
        reasoning=(
            "Room-to-move ask with no number - cash impact at the known "
            f"target term ({int(target)} days)."
        ),
    )


def _parse_request(raw: str) -> ScenarioRequest:
    data = extract_first_json_object(raw)
    if data is None:
        logger.warning("scenario: extraction returned no valid JSON: %r", raw)
        return ScenarioRequest(calc_type="unsupported", reasoning=_UNSUPPORTED_REASON)

    calc_type = str(data.get("calc_type") or "unsupported").strip().lower()
    if calc_type not in _VALID_CALC_TYPES:
        calc_type = "unsupported"

    raw_term_list = data.get("term_list") or []
    term_list = [v for t in raw_term_list if (v := _as_number(t)) is not None]

    return ScenarioRequest(
        calc_type=calc_type,
        extension_days=_as_number(data.get("extension_days")),
        target_term_days=_as_number(data.get("target_term_days")),
        term_a=_as_number(data.get("term_a")),
        term_b=_as_number(data.get("term_b")),
        target_amount=_as_number(data.get("target_amount")),
        ramp_months=_as_number(data.get("ramp_months")),
        term_list=term_list,
        scenarios=_parse_scenarios(data.get("scenarios")),
        reasoning=data.get("reasoning"),
        assumptions=data.get("assumptions") or None,
    )


def _build_clarify_message(facts, request) -> str:
    """Deterministic clarifying question for an ambiguous bare "N-day scenario".

    A bare number (e.g. "Run 10-day scenario") could mean *extend the term by N
    days* or *set the term to N days* — opposite directions in a term-extension
    negotiation. Rather than guess, spell out both readings with concrete
    numbers and ask which one to run. Built here (not by the response LLM) so the
    wording and the arithmetic are exact.
    """
    raw_n = request.target_term_days if request.target_term_days is not None else request.extension_days
    if raw_n is None:
        return (
            "Quick check so I model the right thing: by that scenario, do you mean "
            "extending the current term by a number of days, or moving to a specific "
            "new term? Tell me which and the number of days, and I'll run it."
        )

    n = int(raw_n)
    current = facts.current_term_days
    # 0 is the upstream sentinel for "no contractual term recorded" — never a
    # real baseline, so it must not be woven into the clarify wording as one.
    if current == 0:
        current = None
    if current is not None:
        extend_opt = f"extend the term by {n} days ({current} → {current + n} days)"
        delta = current - n
        if delta > 0:
            term_opt = f"set the term to {n} days (a {delta}-day reduction from today's {current})"
        elif delta < 0:
            term_opt = f"set the term to {n} days (a {abs(delta)}-day extension from today's {current})"
        else:
            term_opt = f"set the term to {n} days (unchanged from today)"
    else:
        extend_opt = f"extend the current term by {n} days"
        term_opt = f"set the term to {n} days"

    return (
        f'Quick check so I model the right thing: by a "{n}-day scenario" do you mean '
        f"**{extend_opt}**, or **{term_opt}**? Let me know which and I'll run it."
    )


def make_scenario_node(llm: LLMPort) -> NodeFn:
    """Build the `run_scenario` node.

    Two LLM calls bracket one deterministic calculation, so the model never
    does the arithmetic itself:

      1. Extraction — turn the negotiator's free-text question into a
         structured :class:`ScenarioRequest` (which calculation, with what
         numbers), resolving named terms ("our target", "the BATNA")
         against `context.facts`.
      2. Calculation — `run_scenario_calculation` (pure, deterministic)
         produces a :class:`ScenarioCalculation`.
      3. Response — phrase the already-computed result in prose. The model
         is told never to recompute or "correct" the numbers.

    The same `domain.services.scenario_calculator` functions are intended to
    be reused by `evaluate_counter_offer` and `handle_supplier_pushback` once
    those nodes are built, so the financial model stays consistent across
    intents.

    Two calculators sit behind step 2, and the extracted calc_type picks
    between them:

      * the working-capital unlock (`run_scenario_calculation`) for everything
        about payment terms alone, and
      * buyer economic profit (`run_economic_profit_scenarios`) when a
        supplier PRICE change is in play as well, or when the negotiator asks
        what a term move is financially worth. That branch also owns the
        reverse questions — the break-even price and the discount that
        compensates for terms the supplier refuses.
    """

    async def scenario_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("scenario: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't run a scenario calculation."
                ),
                "errors": ["scenario: missing context/facts"],
            }

        facts = context.facts
        message = state.get("message", "")
        # The turn's brief, built ONCE by the route from the resolved context
        # (overrides applied, SCF stripped where the turn disallows it). Rebuilt
        # here only for a direct invocation that never went through the route —
        # from the CONTEXT, so the bundles it already resolved are reused rather
        # than recomputed from bare facts.
        brief = state.get("brief") or build_negotiation_brief(
            context, scf_enabled=state.get("scf_enabled", False)
        )

        history = state.get("conversation_history")
        rag_context = state.get("rag_context")
        extraction_prompt = build_scenario_extraction_prompt(message, facts, history)

        try:
            raw = await llm.complete(
                extraction_prompt,
                system=scenario_extraction_system_prompt,
                temperature=0,
                # Pure JSON extraction feeding deterministic calc — no chain-of-thought.
                enable_thinking=False,
                stream_to_client=False,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("scenario: extraction failed")
            return {"response": None, "errors": [f"scenario: {exc}"]}

        request = _parse_request(raw)
        request = _room_to_move_override(message, facts, request)

        # ── Clarify branch ───────────────────────────────────────────────
        # An ambiguous bare "N-day scenario": ask which reading to run instead
        # of guessing. Deterministic message, no calculation, no response LLM.
        if request.calc_type == "clarify":
            clarify = _build_clarify_message(facts, request)
            return {"response": clarify}

        # ── Economic-profit branch ───────────────────────────────────────
        # A price-and-terms trade-off (or a reverse question about one). Same
        # shape as every other branch here — deterministic calculation first,
        # the model wording it afterwards — but against the buyer economic
        # profit model rather than the working-capital unlock.
        if request.calc_type in ECONOMIC_PROFIT_CALC_TYPES:
            analysis = run_economic_profit_scenarios(facts, request)

            response_prompt = build_economic_profit_response_prompt(
                message, facts, analysis, history, rag_context,
                prompt_instructions=state.get("prompt_instructions"),
                brief=brief,
            )
            response_prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

            try:
                draft = await llm.complete(
                    response_prompt,
                    system=apply_scf_prompt_policy(
                        economic_profit_response_system_prompt,
                        brief,
                        state.get("scf_enabled", False),
                    ),
                    # Pin low, do not inherit the backend's default sampling
                    # temperature: unpinned, a high server default made this
                    # prose call regurgitate its own FORMATTING system prompt
                    # into the answer on staging (rare, sampling-driven, so it
                    # never reproduced locally). Same value as the email draft.
                    temperature=0.2,
                    stream_to_client=False,
                )
            except Exception as exc:  # pragma: no cover - defensive
                logger.exception("scenario: economic-profit response drafting failed")
                return {"response": None, "errors": [f"scenario: {exc}"]}

            sources = collect_economic_profit_sources(facts, analysis)
            sources.update(collect_rag_source(rag_context))
            return {
                "response": _compose_economic_profit_answer(
                    analysis, strip_rank_tags(draft), state.get("response_language")
                ),
                "source": sources,
            }

        # ── Multi-term branch ────────────────────────────────────────────
        if request.calc_type == "multi_term_impact" and request.term_list:
            multi_results = []
            for term in sorted(request.term_list):
                term_req = ScenarioRequest(calc_type="term_impact", target_term_days=term)
                multi_results.append((term, run_scenario_calculation(facts, term_req)))

            response_prompt = build_multi_term_response_prompt(
                message, facts, multi_results, history, rag_context,
                prompt_instructions=state.get("prompt_instructions"),
                brief=brief,
            )
            response_prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

            try:
                draft = await llm.complete(response_prompt, system=apply_scf_prompt_policy(scenario_response_system_prompt, brief, state.get("scf_enabled", False)), temperature=0.2, stream_to_client=True)
            except Exception as exc:
                logger.exception("scenario: multi-term response drafting failed")
                return {"response": None, "errors": [f"scenario: {exc}"]}

            sources = {
                format_source_label("formula"): {"path": "calculated", "value": multi_results[0][1].formula}
            }
            for term, calc in multi_results:
                sources[f"{int(term)}-Day Term Impact"] = {"path": "calculated", "value": calc.value}
            sources.update(collect_rag_source(rag_context))
            return {"response": strip_rank_tags(draft), "source": sources}

        # ── Single-term branch ───────────────────────────────────────────
        calculation: ScenarioCalculation = run_scenario_calculation(facts, request)

        response_prompt = build_scenario_response_prompt(
            message, facts, calculation, history, rag_context,
            prompt_instructions=state.get("prompt_instructions"),
            brief=brief,
        )
        response_prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

        try:
            draft = await llm.complete(response_prompt, system=apply_scf_prompt_policy(scenario_response_system_prompt, brief, state.get("scf_enabled", False)), temperature=0.2, stream_to_client=False)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("scenario: response drafting failed")
            return {"response": None, "errors": [f"scenario: {exc}"]}

        sources = collect_scenario_sources(facts, calculation)
        sources.update(collect_rag_source(rag_context))

        return {"response": strip_rank_tags(draft), "source": sources}

    return scenario_node
