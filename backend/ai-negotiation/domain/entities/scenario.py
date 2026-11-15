from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from domain.entities.economic_profit import EconomicProfitScenarioSpec


@dataclass(frozen=True)
class ScenarioCalculation:
    """Result of a deterministic working-capital calculation.

    Produced by :mod:`domain.services.scenario_calculator` and handed to the
    response-drafting LLM call as a fait accompli — the LLM phrases this
    result in prose but never recomputes or second-guesses ``value``.

    ``inputs`` lists every figure the calculation used (so the response can
    cite them and `collect_scenario_sources` can trace them back to the
    supplier payload). ``notes`` carries caveats — e.g. a missing baseline
    that prevented the calculation, or a comparison against the upstream
    ``target_cash_flow`` figure.
    """

    calc_type: str
    value: float | None
    inputs: dict[str, Any] = field(default_factory=dict)
    formula: str = ""
    notes: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ScenarioRequest:
    """Parameters extracted from the user's message by the scenario node's
    extraction step.

    Exactly one calc_type-specific group of fields is expected to be
    populated per request; the rest stay ``None``. ``unsupported`` means the
    extraction step couldn't map the message to a supported calculation.
    """

    calc_type: str  # "extension" | "term_impact" | "delta" | "threshold" | "ramp" | "formula_explain" | "multi_term_impact" | "economic_profit" | "economic_profit_compare" | "break_even_price" | "compensating_price_change" | "clarify" | "unsupported"
    extension_days: float | None = None
    target_term_days: float | None = None
    term_a: float | None = None
    term_b: float | None = None
    target_amount: float | None = None
    ramp_months: float | None = None
    term_list: list[float] = field(default_factory=list)  # for multi_term_impact
    # The economic-profit calc types carry their parameters here instead of in
    # the flat fields above, because those calculations take a term AND a price
    # per scenario and several of them take more than one scenario (a
    # comparison, a sensitivity sweep). One list keeps a two-scenario
    # comparison from having to be flattened into term_a/term_b/price_a/price_b
    # — see `domain.entities.economic_profit.EconomicProfitScenarioSpec`.
    scenarios: list[EconomicProfitScenarioSpec] = field(default_factory=list)
    reasoning: str | None = None
    assumptions: str | None = None
