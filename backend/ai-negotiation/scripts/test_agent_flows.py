#!/usr/bin/env python3
"""End-to-end conversation-flow tester for the negotiation assistant.

Runs multi-turn "flows" against the live API the same way a real negotiator
would: login → start a session → open the chat WebSocket → send a sequence of
messages. Every flow is centred on one primary intent and ends with one or more
``meta_operation`` turns that reference earlier output — so the run exercises
both the intent classifier AND whether the assistant carries context forward.

Each flow gets its OWN session (isolated history). Within a flow the turns
share one WebSocket, so prior turns accumulate as context.

What it checks
--------------
1. Intent routing — classified intent vs expected set; mismatches flagged.
2. Context retention — turns marked "context-dependent" are spotlighted in the
   report. Most have a cheap automated heuristic ("shorter", "nonempty",
   "mentions_number"); all must also be read manually.

Counter-offer flows (11–17) stress-test ``evaluate_counter_offer`` in depth:
  11 — days-only counter, above BATNA (counter_push_days)
  12 — supplier accepts our days + price premium → counter_with_scf
  13 — supplier accepts our days + large premium → counter_reject_premium
  14 — supplier accepts our days + ramp (counter_push_days on ramp)
  15 — supplier accepts our days + cash discount → counter_with_scf
  16 — counter below current term (reject)
  17 — non-financial condition (non_financial_flag)
  18 — multi-round escalation arc (four counter turns in one session)

Output
------
- Markdown report → logs/agent_flow_test_<ts>.md
- JSON dump       → logs/agent_flow_test_<ts>.json
- PASS/FAIL summary to stdout.

Usage
-----
    .venv/bin/python scripts/test_agent_flows.py \\
        --base-url http://localhost:8000 \\
        --email global@calculum.com --user-id ce1921c0-0da6-446b-9929-066255d0738b \\
        --supplier-id 00005658-ca89-4f78-97c1-3321cfd69d93 \\
        --tenant-id ai-bot-1-11h93

All flags can also be supplied via env vars: BASE_URL, TEST_EMAIL,
TEST_PASSWORD, USER_ID, SUPPLIER_ID, TENANT_ID.

Auth: the script signs a JWT locally using the service's own jwt_secret —
no external auth service call is needed.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

try:
    import httpx
    import websockets
except ImportError as exc:  # pragma: no cover - dependency guard
    sys.stderr.write(
        f"Missing dependency: {exc}. Run this with the project venv, e.g.\n"
        "    .venv/bin/python scripts/test_agent_flows.py\n"
    )
    raise SystemExit(1)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from infrastructure.auth.jwt_handler import sign_auth_token  # noqa: E402


# ── Flow definitions ──────────────────────────────────────────────────────────

@dataclass
class Turn:
    """One user message in a flow.

    ``expect`` lists every intent we'd accept as correct for this message.
    ``context`` marks turns whose correctness depends on earlier turns — those
    get spotlighted in the report. ``check`` is an optional cheap heuristic
    over (this_response, prior_responses).
    """

    text: str
    expect: list[str]
    note: str = ""
    context: bool = False
    check: str | None = None  # name of a heuristic in CHECKS


@dataclass
class Flow:
    name: str
    focus: str
    tone: str
    turns: list[Turn]


# ── Heuristics ────────────────────────────────────────────────────────────────

def _check_shorter(resp: str, priors: list[str]) -> tuple[bool, str]:
    last = next((p for p in reversed(priors) if p.strip()), "")
    if not last:
        return True, "no prior output to compare"
    ok = len(resp) < len(last)
    return ok, f"{len(resp)} chars vs prior {len(last)} chars"


def _check_nonempty(resp: str, priors: list[str]) -> tuple[bool, str]:
    ok = len(resp.strip()) > 0
    return ok, f"{len(resp)} chars"


def _check_mentions_number(resp: str, priors: list[str]) -> tuple[bool, str]:
    """Response must contain at least one numeric figure — confirms financial recall."""
    ok = bool(re.search(r"\d[\d,\.]*", resp))
    return ok, "contains number" if ok else "no numeric figure found"


CHECKS = {
    "shorter": _check_shorter,
    "nonempty": _check_nonempty,
    "mentions_number": _check_mentions_number,
}


# ── Intent aliases ────────────────────────────────────────────────────────────

SUMMARIZE = "summarize_supplier_position"
OPENING   = "recommend_opening_strategy"
SCENARIO  = "run_scenario"
EXPLAIN   = "explain_recommendation"
PLAYBOOK  = "generate_negotiation_playbook"
PUSHBACK  = "handle_supplier_pushback"
COUNTER   = "evaluate_counter_offer"
REFRAME   = "reframe_with_financing"
DATA      = "answer_data_question"
OVERRIDE  = "apply_override"
META      = "meta_operation"
GREETING  = "greeting"
UNCLEAR   = "unclear"
OOS       = "out_of_scope"


# ── Flows ─────────────────────────────────────────────────────────────────────

FLOWS: list[Flow] = [

    # ── 1: Supplier briefing → summarize → meta-reshape ──────────────────────
    Flow(
        name="Supplier briefing",
        focus=SUMMARIZE,
        tone="methodical",
        turns=[
            Turn(
                "Hi, quick question — is the supplier data loaded for this session?",
                [GREETING, SUMMARIZE],
                "warm-up / data check",
            ),
            Turn(
                "Give me a full rundown on where we stand with this supplier — "
                "who they are, our exposure, leverage, and overall risk.",
                [SUMMARIZE],
                "primary intent — full briefing",
            ),
            Turn(
                "How much real leverage do we have here, and what's driving it?",
                [SUMMARIZE, DATA, EXPLAIN],
                "follow-up on leverage",
            ),
            Turn(
                "What does their payment track record actually look like?",
                [DATA, SUMMARIZE],
                "track-record factual follow-up",
            ),
            Turn(
                "Compress everything you just said into a tight executive summary — "
                "three sentences max.",
                [META],
                "reshape prior briefing",
                context=True, check="shorter",
            ),
            Turn(
                "Now pull out just the leverage and risk points as a bulleted list.",
                [META],
                "extract subset from compressed summary",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 2: Opening strategy → anchor framing → meta compression ──────────────
    Flow(
        name="Opening strategy",
        focus=OPENING,
        tone="assertive",
        turns=[
            Turn(
                "How should I open this payment terms conversation with the supplier?",
                [OPENING],
                "primary intent",
            ),
            Turn(
                "What number should I anchor with, and why that one specifically?",
                [OPENING, DATA],
                "anchor follow-up",
            ),
            Turn(
                "Should I lead with the benchmark straight away, or hold it as a "
                "supporting argument later?",
                [OPENING, EXPLAIN],
                "sequencing question",
            ),
            Turn(
                "Give me the first two sentences I'd actually say to open the meeting.",
                [META, OPENING],
                "produce opening lines from prior strategy",
                context=True, check="nonempty",
            ),
            Turn(
                "Those are too soft — make them more assertive.",
                [META],
                "retone the opening lines",
                context=True, check="nonempty",
            ),
            Turn(
                "Condense the whole strategy into a TL;DR — one sentence.",
                [META],
                "maximum compression",
                context=True, check="shorter",
            ),
        ],
    ),

    # ── 3: Scenario calculator → multiple what-ifs → cross-turn recall ────────
    Flow(
        name="Term-change scenarios",
        focus=SCENARIO,
        tone="methodical",
        turns=[
            Turn(
                "If we push this supplier to 75 days, how much working capital do we unlock?",
                [SCENARIO],
                "scenario A — single term",
            ),
            Turn(
                "What about 90 days?",
                [SCENARIO],
                "scenario B — follow-on term",
                context=True,
            ),
            Turn(
                "And if we can only get 60 days — what's the delta between 60 and 75?",
                [SCENARIO],
                "scenario C — delta comparison",
                context=True,
            ),
            Turn(
                "Show me the cash unlock at 45, 60, 75, and 90 days all in one table.",
                [SCENARIO],
                "multi-term scenario",
            ),
            Turn(
                "What's the minimum extension needed to hit the business case target?",
                [SCENARIO],
                "threshold calculation",
            ),
            Turn(
                "Of the scenarios we ran, which one actually clears the target figure?",
                [META, SCENARIO],
                "recall and compare prior results",
                context=True, check="mentions_number",
            ),
            Turn(
                "Summarize all the scenarios we just ran side by side.",
                [META],
                "full synthesis of prior turns",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 4: Explain recommendation → drill-down → simplify ────────────────────
    Flow(
        name="Explain the recommendation",
        focus=EXPLAIN,
        tone="methodical",
        turns=[
            Turn(
                "Why is the system targeting this specific term and not something higher?",
                [EXPLAIN],
                "primary intent",
            ),
            Turn(
                "What's driving the success-probability rating — is it leverage, risk, or something else?",
                [EXPLAIN, DATA],
                "drill into probability",
            ),
            Turn(
                "I don't really follow the leverage assessment — walk me through the logic.",
                [EXPLAIN],
                "leverage reasoning",
            ),
            Turn(
                "Can you explain all of that as if I'm presenting to a CFO who hasn't read the data?",
                [META],
                "reframe for CFO audience",
                context=True, check="nonempty",
            ),
            Turn(
                "Shrink that down to two sentences.",
                [META],
                "maximum compression",
                context=True, check="shorter",
            ),
            Turn(
                "What have we covered in this conversation so far?",
                [META],
                "full conversation recall",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 5: Full negotiation playbook → section extraction → reshaping ─────────
    Flow(
        name="Negotiation playbook",
        focus=PLAYBOOK,
        tone="assertive",
        turns=[
            Turn(
                "Prepare me fully for this negotiation — I want the complete playbook.",
                [PLAYBOOK],
                "primary intent — full doc",
            ),
            Turn(
                "The objections section feels thin — expand it with more scenarios.",
                [META],
                "expand a section from prior output",
                context=True, check="nonempty",
            ),
            Turn(
                "What's our absolute walk-away position according to what you just built?",
                [META, DATA],
                "recall a specific figure from the playbook",
                context=True, check="mentions_number",
            ),
            Turn(
                "Remove the risk section and tighten the whole thing up.",
                [META],
                "restructure and shorten prior doc",
                context=True, check="shorter",
            ),
            Turn(
                "Rewrite the opening section with a more collaborative, less confrontational tone.",
                [META],
                "retone a specific section",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 7: Supplier pushback → multiple objections → synthesize ──────────────
    Flow(
        name="Supplier pushback",
        focus=PUSHBACK,
        tone="assertive",
        turns=[
            Turn(
                "The supplier says our terms will put serious strain on their day-to-day "
                "cash flow — what do I say?",
                [PUSHBACK],
                "objection #1 — cash flow",
            ),
            Turn(
                "They followed up claiming their competitors don't face terms anything "
                "like this from us.",
                [PUSHBACK],
                "objection #2 — competitive comparison",
                context=True,
            ),
            Turn(
                "Now they're suggesting we're damaging the relationship and they may have "
                "to review their commitment to us.",
                [PUSHBACK],
                "objection #3 — relationship threat",
                context=True,
            ),
            Turn(
                "Combine all three rebuttals into one single coherent response I can send "
                "back to them today.",
                [META],
                "synthesize all rebuttals",
                context=True, check="nonempty",
            ),
            Turn(
                "The last part sounds a bit aggressive — soften it without backing down.",
                [META],
                "retone prior combined response",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 8: Counter-offer (days only, above floor) → push days ────────────────
    Flow(
        name="Counter-offer: days only",
        focus=COUNTER,
        tone="methodical",
        turns=[
            Turn(
                "The supplier came back with 50 days. We were asking for 62. "
                "Should we accept that?",
                [COUNTER],
                "counter #1 — days above floor, below target",
            ),
            Turn(
                "What are we actually giving up in cash terms by settling at 50 instead of 62?",
                [COUNTER, SCENARIO],
                "financial impact of conceding 12 days",
                context=True, check="mentions_number",
            ),
            Turn(
                "What should I counter with — go back to 62, or offer something in the middle?",
                [COUNTER, OPENING],
                "recommended counter position",
                context=True, check="nonempty",
            ),
            Turn(
                "Draft a single sentence I can send them as my counter.",
                [META],
                "produce counter-message from prior recommendation",
                context=True, check="nonempty",
            ),
            Turn(
                "Remind me — what was the cash gap figure you calculated earlier?",
                [META],
                "recall financial figure from turn 2",
                context=True, check="mentions_number",
            ),
        ],
    ),

    # ── 9: Reframe with supply chain financing ────────────────────────────────
    Flow(
        name="Reframe with financing",
        focus=REFRAME,
        tone="collaborative",
        turns=[
            Turn(
                "How do I position supply chain finance as part of this negotiation?",
                [REFRAME],
                "primary intent",
            ),
            Turn(
                "What's our SCF rate for this supplier specifically?",
                [DATA],
                "factual rate lookup",
            ),
            Turn(
                "Is our SCF rate actually competitive compared to what they'd pay to borrow on their own?",
                [REFRAME, DATA, EXPLAIN],
                "rate comparison question",
            ),
            Turn(
                "Turn the SCF pitch into three punchy talking points I can use in the meeting.",
                [META],
                "reshape prior explanation into talking points",
                context=True, check="nonempty",
            ),
            Turn(
                "Make those less technical — my contact on their side is a commercial director, not a treasurer.",
                [META],
                "simplify language in prior talking points",
                context=True, check="nonempty",
            ),
            Turn(
                "Shorten to two bullets max.",
                [META],
                "further compression",
                context=True, check="shorter",
            ),
        ],
    ),

    # ── 10: Data lookups + edge intents + full-session recall ─────────────────
    Flow(
        name="Data, override & edge cases",
        focus=DATA,
        tone="methodical",
        turns=[
            Turn(
                "What's this supplier's DSO and credit rating?",
                [DATA],
                "factual lookup — two figures",
            ),
            Turn(
                "And their WACC? I want to understand their cost of capital.",
                [DATA],
                "follow-up factual lookup",
            ),
            Turn(
                "Just go with 75 days — ignore whatever the benchmark says.",
                [OVERRIDE],
                "manual override",
            ),
            Turn(
                "asdfjkl; ??? !!!",
                [UNCLEAR],
                "garbled input — edge case",
            ),
            Turn(
                "What do you think about bitcoin as a treasury asset?",
                [OOS],
                "completely off-topic — edge case",
            ),
            Turn(
                "Summarize everything we've covered in this conversation so far.",
                [META],
                "full-session recall — strong context test",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 11: Counter-offer — accept days + price premium → counter_with_scf ────
    Flow(
        name="Counter-offer: price premium",
        focus=COUNTER,
        tone="methodical",
        turns=[
            Turn(
                "The supplier came back and said they're happy to accept our 62-day "
                "terms, but they need a 1% increase on all invoice amounts going forward.",
                [COUNTER],
                "accept days + 1% price premium",
            ),
            Turn(
                "Does the working capital gain still make sense once we factor in the "
                "annual cost of that 1%?",
                [COUNTER, EXPLAIN],
                "net benefit check",
                context=True, check="mentions_number",
            ),
            Turn(
                "What's the implied annualised cost of the premium they're asking for?",
                [META, DATA],
                "recall implied rate from prior calculation",
                context=True, check="mentions_number",
            ),
            Turn(
                "You suggested SCF might be a better lever here — explain why and what "
                "I'd actually say to them.",
                [COUNTER, REFRAME],
                "SCF as alternative to premium — recall prior recommendation",
                context=True, check="nonempty",
            ),
            Turn(
                "Give me the one or two sentences I'd use to transition from the premium "
                "conversation into the SCF offer.",
                [META],
                "produce transition wording from prior SCF explanation",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 12: Counter-offer — accept days + large premium → counter_reject_premium
    Flow(
        name="Counter-offer: premium wipes benefit",
        focus=COUNTER,
        tone="assertive",
        turns=[
            Turn(
                "Supplier just sent over their response: they'll accept 62 days but only "
                "if we agree to a 15% uplift across our entire annual spend with them.",
                [COUNTER],
                "accept days + 15% premium — should wipe the unlock",
            ),
            Turn(
                "That seems absurd — does the working capital gain even survive a 15% "
                "price increase?",
                [COUNTER, EXPLAIN],
                "net benefit reality check",
                context=True, check="mentions_number",
            ),
            Turn(
                "How do I shut down the premium condition without walking away from the "
                "62-day conversation entirely?",
                [PUSHBACK, META],
                "rejection strategy for the condition",
                context=True, check="nonempty",
            ),
            Turn(
                "Draft a firm but professional one-paragraph response I can send them today.",
                [META],
                "produce response from prior strategy",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 13: Counter-offer — accept days + ramp → counter_push_days ───────────
    Flow(
        name="Counter-offer: phased ramp",
        focus=COUNTER,
        tone="methodical",
        turns=[
            Turn(
                "Good news — they agreed to 62 days. Bad news: they say they need to "
                "phase it in over 9 months rather than switching immediately.",
                [COUNTER],
                "accept days + 9-month ramp",
            ),
            Turn(
                "What does that ramp actually cost us? I want a number.",
                [META, SCENARIO],
                "recall ramp cost from prior calculation",
                context=True, check="mentions_number",
            ),
            Turn(
                "Is there a case for just accepting the ramp, or should we push back?",
                [COUNTER, EXPLAIN],
                "ramp trade-off assessment",
                context=True, check="nonempty",
            ),
            Turn(
                "If I push back on the ramp, what's a reasonable counter-proposal on "
                "the phase-in period?",
                [COUNTER, OPENING],
                "recommended ramp counter",
                context=True, check="nonempty",
            ),
            Turn(
                "Summarise the ramp-vs-immediate trade-off in two sentences.",
                [META],
                "compress prior ramp analysis",
                context=True, check="shorter",
            ),
        ],
    ),

    # ── 14: Counter-offer — accept days + cash discount → counter_with_scf ───
    Flow(
        name="Counter-offer: cash discount offer",
        focus=COUNTER,
        tone="methodical",
        turns=[
            Turn(
                "The supplier said they're okay with 62 days, but they'd like a 1.5% "
                "discount off invoices any time we pay within 10 days.",
                [COUNTER],
                "accept days + 1.5% cash discount if pay in 10d",
            ),
            Turn(
                "What does that implied discount rate actually work out to on an "
                "annualised basis?",
                [META, DATA],
                "recall implied APR from prior calculation",
                context=True, check="mentions_number",
            ),
            Turn(
                "Is that a better or worse deal for the supplier than what our SCF "
                "programme would offer them?",
                [COUNTER, REFRAME],
                "discount vs SCF comparison",
                context=True, check="nonempty",
            ),
            Turn(
                "So should I just offer them SCF instead of agreeing to the discount?",
                [COUNTER, REFRAME],
                "SCF as counter to discount",
                context=True, check="nonempty",
            ),
            Turn(
                "Give me the exact thing I'd say to pivot from their discount request "
                "into the SCF conversation.",
                [META],
                "produce pivot wording from prior SCF recommendation",
                context=True, check="nonempty",
            ),
        ],
    ),

    # ── 15: Counter-offer — below current term → reject ──────────────────────
    Flow(
        name="Counter-offer: going backwards",
        focus=COUNTER,
        tone="assertive",
        turns=[
            Turn(
                "The supplier just countered asking us to go back to 28 days. "
                "We're currently on 30 days net.",
                [COUNTER],
                "counter below current term — should trigger reject zone",
            ),
            Turn(
                "So they want us to get worse terms than we already have — how do I "
                "shut that down without torching the relationship?",
                [PUSHBACK, META],
                "rejection framing",
                context=True, check="nonempty",
            ),
            Turn(
                "What should I actually say to them in response?",
                [META],
                "produce response wording",
                context=True, check="nonempty",
            ),
            Turn(
                "How far is their ask from our target in both days and cash terms?",
                [META, SCENARIO],
                "recall the gap figures from turn 1 analysis",
                context=True, check="mentions_number",
            ),
        ],
    ),

    # ── 16: Counter-offer — non-financial condition ───────────────────────────
    Flow(
        name="Counter-offer: non-financial condition",
        focus=COUNTER,
        tone="methodical",
        turns=[
            Turn(
                "The supplier said they'll accept 62 days if we commit to a minimum of "
                "$5 million in orders from them next year.",
                [COUNTER],
                "accept days + non-financial volume commitment",
            ),
            Turn(
                "That's a volume guarantee — how should I think about that trade-off?",
                [COUNTER, EXPLAIN],
                "flag non-financial condition for judgment",
                context=True, check="nonempty",
            ),
            Turn(
                "If we can't commit to the volume, what are our options from here?",
                [META, OPENING],
                "fallback options",
                context=True, check="nonempty",
            ),
            Turn(
                "What would happen to the cash position if we ended up only doing $3M "
                "instead of $5M with them?",
                [SCENARIO],
                "scenario on reduced spend",
            ),
        ],
    ),

    # ── 17: Counter-offer — multi-round escalation arc ───────────────────────
    Flow(
        name="Counter-offer: multi-round negotiation arc",
        focus=COUNTER,
        tone="assertive",
        turns=[
            Turn(
                "First counter from the supplier: they said no to 62 days and came back "
                "with 40 days instead.",
                [COUNTER],
                "round 1 — 40d counter, far below target",
            ),
            Turn(
                "We rejected that. They came back with 55 days — no conditions attached.",
                [COUNTER],
                "round 2 — 55d, above floor, still below target",
                context=True,
            ),
            Turn(
                "We pushed again. They're now at 58 days with a 0.5% discount if we pay "
                "within 15 days.",
                [COUNTER],
                "round 3 — 58d + cash discount condition",
                context=True,
            ),
            Turn(
                "How has this negotiation progressed across all three rounds? Are we "
                "getting close enough to wrap this up?",
                [META],
                "progress recap across all counter-offer turns",
                context=True, check="nonempty",
            ),
            Turn(
                "What's the single best move right now to close this deal?",
                [META, OPENING],
                "strategic closing recommendation",
                context=True, check="nonempty",
            ),
            Turn(
                "Give me a one-line verdict I can share with my manager.",
                [META],
                "executive summary of the negotiation status",
                context=True, check="shorter",
            ),
        ],
    ),
]


# ── HTTP / WS plumbing ────────────────────────────────────────────────────────

@dataclass
class Config:
    base_url: str
    ws_base: str
    email: str
    password: str
    user_id: str
    supplier_id: str
    tenant_id: str
    recv_timeout: float = 300.0


async def login(client: httpx.AsyncClient, cfg: Config) -> str:
    return sign_auth_token(
        email=cfg.email,
        scope="negotiation",
        user_id=cfg.user_id,
        role="global_platform_admin",
        tenant_id=cfg.tenant_id,
    )


async def start_session(client: httpx.AsyncClient, cfg: Config, auth_token: str) -> str:
    r = await client.post(
        f"{cfg.base_url}/session/start",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"supplier_id": cfg.supplier_id, "tenant_id": cfg.tenant_id, "user_id": cfg.user_id},
    )
    r.raise_for_status()
    data = r.json()
    session_id = data.get("session_id") or data.get("sessionId")
    if not session_id:
        raise RuntimeError(f"session/start returned unexpected payload: {data}")
    return session_id


@dataclass
class TurnResult:
    text: str
    expect: list[str]
    note: str
    context: bool
    intent: str | None = None
    confidence: float | None = None
    reasoning: str | None = None
    response_mode: str | None = None
    response: str = ""
    is_playbook: bool | None = None
    error: str | None = None
    intent_ok: bool = False
    check_name: str | None = None
    check_ok: bool | None = None
    check_detail: str = ""
    duration_s: float = 0.0


async def _drain(ws, timeout: float = 0.4) -> None:
    """Swallow trailing frames so they don't leak into the next turn."""
    while True:
        try:
            await asyncio.wait_for(ws.recv(), timeout=timeout)
        except (asyncio.TimeoutError, Exception):
            return


async def send_turn(ws, message: str, tone: str, recv_timeout: float) -> TurnResult:
    res = TurnResult(text=message, expect=[], note="", context=False)
    started = time.monotonic()
    await ws.send(json.dumps({"message": message, "thread_tone": tone}))

    tokens: list[str] = []
    deadline = time.monotonic() + recv_timeout
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            res.error = "timeout waiting for response"
            break
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError:
            res.error = "timeout waiting for response"
            break
        except websockets.ConnectionClosed as exc:
            res.error = f"connection closed: {exc}"
            break

        try:
            evt = json.loads(raw)
        except json.JSONDecodeError:
            continue

        etype = evt.get("type")
        if etype == "intent":
            d = evt.get("data")
            if d:
                res.intent = d.get("intent")
                res.confidence = d.get("confidence")
                res.reasoning = d.get("reasoning")
                res.response_mode = d.get("response_mode")
        elif etype == "token":
            tokens.append(evt.get("data") or "")
        elif etype == "done":
            d = evt.get("data") or {}
            res.is_playbook = d.get("is_playbook")
            break
        elif etype == "error":
            res.error = evt.get("data")
            break

    res.response = "".join(tokens)
    res.duration_s = round(time.monotonic() - started, 2)
    await _drain(ws)
    return res


async def run_flow(client: httpx.AsyncClient, cfg: Config, auth_token: str, flow: Flow) -> list[TurnResult]:
    session_id = await start_session(client, cfg, auth_token)
    url = f"{cfg.ws_base}/{session_id}/negotiation/chat?token={auth_token}"

    results: list[TurnResult] = []
    prior_responses: list[str] = []

    async with websockets.connect(url, ping_interval=None, max_size=8 * 1024 * 1024) as ws:
        for turn in flow.turns:
            res = await send_turn(ws, turn.text, flow.tone, cfg.recv_timeout)
            res.expect = turn.expect
            res.note = turn.note
            res.context = turn.context
            res.intent_ok = res.intent in turn.expect if res.intent else False

            if turn.check and not res.error:
                fn = CHECKS.get(turn.check)
                if fn:
                    ok, detail = fn(res.response, prior_responses)
                    res.check_name = turn.check
                    res.check_ok = ok
                    res.check_detail = detail

            results.append(res)
            prior_responses.append(res.response)

            status = "OK " if res.intent_ok else "XX "
            if res.error:
                status = "ER "
            print(
                f"    {status}[{res.intent or 'none':<28}] "
                f"exp={','.join(turn.expect):<44} "
                f"{res.duration_s:>5.1f}s  {turn.text[:50]!r}"
            )

    return results


# ── Reporting ─────────────────────────────────────────────────────────────────

def _md_escape(text: str) -> str:
    return text.replace("\r", "")


def write_reports(
    cfg: Config,
    all_results: list[tuple[Flow, list[TurnResult]]],
    out_dir: Path,
) -> tuple[Path, Path]:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    md_path = out_dir / f"agent_flow_test_{ts}.md"
    json_path = out_dir / f"agent_flow_test_{ts}.json"

    total = sum(len(r) for _, r in all_results)
    intent_pass = sum(1 for _, rs in all_results for r in rs if r.intent_ok)
    errors = sum(1 for _, rs in all_results for r in rs if r.error)
    ctx_turns = [r for _, rs in all_results for r in rs if r.context]
    ctx_checks = [r for r in ctx_turns if r.check_ok is not None]
    ctx_check_pass = sum(1 for r in ctx_checks if r.check_ok)

    # Counter-offer specific stats
    counter_flows = [(f, rs) for f, rs in all_results if COUNTER in (f.focus, *[t for r in rs for t in r.expect])]
    counter_turns = [r for _, rs in all_results for r in rs if COUNTER in r.expect]
    counter_pass = sum(1 for r in counter_turns if r.intent_ok)

    lines: list[str] = []
    lines.append("# Negotiation Assistant — Conversation Flow Test")
    lines.append("")
    lines.append(f"- Run: {datetime.now(timezone.utc).isoformat()}")
    lines.append(f"- Base URL: `{cfg.base_url}`  |  Supplier: `{cfg.supplier_id}`  |  Tenant: `{cfg.tenant_id}`")
    lines.append(f"- Turns: **{total}** across **{len(all_results)}** flows")
    lines.append(f"- Intent routing PASS: **{intent_pass}/{total}**")
    lines.append(
        f"- Context heuristic PASS: **{ctx_check_pass}/{len(ctx_checks)}** "
        f"(context-dependent turns: {len(ctx_turns)})"
    )
    lines.append(f"- `evaluate_counter_offer` routing PASS: **{counter_pass}/{len(counter_turns)}**")
    lines.append(f"- Errors: **{errors}**")
    lines.append("")
    lines.append(
        "> Intent routing and numeric-recall heuristics are checked automatically.  \n"
        "> **Context retention and counter-offer quality must be read manually** —  \n"
        "> check every 🔎 turn below and confirm the reply actually used earlier context."
    )
    lines.append("")

    # Summary table
    lines.append("## Summary")
    lines.append("")
    lines.append("| # | Flow | Focus | Turns | Intent ✓ | Context ✓ | Errors |")
    lines.append("|---|------|-------|------:|---------:|----------:|-------:|")
    for i, (flow, rs) in enumerate(all_results, 1):
        ok = sum(1 for r in rs if r.intent_ok)
        ctx_ok = sum(1 for r in rs if r.context and r.check_ok is True)
        ctx_total = sum(1 for r in rs if r.context and r.check_ok is not None)
        err = sum(1 for r in rs if r.error)
        lines.append(
            f"| {i} | {flow.name} | `{flow.focus}` | {len(rs)} "
            f"| {ok}/{len(rs)} | {ctx_ok}/{ctx_total} | {err} |"
        )
    lines.append("")

    # Counter-offer scenario index
    counter_flow_indices = [i for i, (f, _) in enumerate(all_results, 1) if "counter" in f.name.lower()]
    if counter_flow_indices:
        lines.append("## Counter-Offer Scenario Coverage")
        lines.append("")
        lines.append("| Flow # | Scenario | Expected Verdict |")
        lines.append("|-------:|----------|-----------------|")
        _SCENARIO_VERDICTS = {
            "Counter-offer: days only":                   "counter_push_days (50d, above floor)",
            "Counter-offer: price premium":               "counter_with_scf (1% premium > scf_rate)",
            "Counter-offer: premium wipes benefit":       "counter_reject_premium (15% wipes unlock)",
            "Counter-offer: phased ramp":                 "counter_push_days (shorten the ramp)",
            "Counter-offer: cash discount offer":         "counter_with_scf (discount APR > scf_rate)",
            "Counter-offer: going backwards":             "reject (below current term)",
            "Counter-offer: non-financial condition":     "non_financial_flag (volume commitment)",
            "Counter-offer: multi-round negotiation arc": "escalating across 3 rounds",
        }
        for i, (flow, _) in enumerate(all_results, 1):
            verdict = _SCENARIO_VERDICTS.get(flow.name)
            if verdict:
                lines.append(f"| {i} | {flow.name} | {verdict} |")
        lines.append("")

    # Per-flow detail
    for i, (flow, rs) in enumerate(all_results, 1):
        lines.append(f"## {i}. {flow.name}  ·  tone=`{flow.tone}`")
        lines.append("")
        for j, r in enumerate(rs, 1):
            badge = "✅" if r.intent_ok else "❌"
            if r.error:
                badge = "🟥"
            ctx = " 🔎 **CONTEXT CHECK**" if r.context else ""
            lines.append(f"### {i}.{j} {badge}{ctx} — {r.note}")
            lines.append("")
            lines.append(f"**User:** {_md_escape(r.text)}")
            lines.append("")
            lines.append(
                f"- Expected: `{', '.join(r.expect)}`  |  "
                f"Got: `{r.intent}` (conf={r.confidence}, mode={r.response_mode})  |  "
                f"{'PASS' if r.intent_ok else 'FAIL'}"
            )
            if r.reasoning:
                lines.append(f"- Classifier reasoning: {r.reasoning}")
            if r.check_name:
                lines.append(
                    f"- Heuristic `{r.check_name}`: "
                    f"{'PASS' if r.check_ok else 'FAIL'} ({r.check_detail})"
                )
            if r.error:
                lines.append(f"- ⚠️ Error: {r.error}")
            lines.append(f"- Latency: {r.duration_s}s")
            lines.append("")
            lines.append("**Assistant:**")
            lines.append("")
            body = _md_escape(r.response).strip() or "_(empty response)_"
            lines.append("```")
            lines.append(body)
            lines.append("```")
            lines.append("")

    md_path.write_text("\n".join(lines), encoding="utf-8")

    payload = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "config": {
            "base_url": cfg.base_url,
            "supplier_id": cfg.supplier_id,
            "tenant_id": cfg.tenant_id,
        },
        "summary": {
            "turns": total,
            "intent_pass": intent_pass,
            "errors": errors,
            "context_turns": len(ctx_turns),
            "context_check_pass": ctx_check_pass,
            "context_checks": len(ctx_checks),
            "counter_offer_turns": len(counter_turns),
            "counter_offer_pass": counter_pass,
        },
        "flows": [
            {
                "name": flow.name,
                "focus": flow.focus,
                "tone": flow.tone,
                "turns": [
                    {
                        "text": r.text,
                        "expect": r.expect,
                        "note": r.note,
                        "context_dependent": r.context,
                        "intent": r.intent,
                        "confidence": r.confidence,
                        "response_mode": r.response_mode,
                        "reasoning": r.reasoning,
                        "intent_ok": r.intent_ok,
                        "check": r.check_name,
                        "check_ok": r.check_ok,
                        "check_detail": r.check_detail,
                        "error": r.error,
                        "duration_s": r.duration_s,
                        "response": r.response,
                    }
                    for r in rs
                ],
            }
            for flow, rs in all_results
        ],
    }
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return md_path, json_path


# ── Entry point ───────────────────────────────────────────────────────────────

def parse_args() -> Config:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--base-url", default=os.environ.get("BASE_URL", "http://localhost:8000"))
    p.add_argument("--email", default=os.environ.get("TEST_EMAIL", "global@calculum.com"))
    p.add_argument("--password", default=os.environ.get("TEST_PASSWORD", "12345678"))
    p.add_argument("--user-id", default=os.environ.get("USER_ID", "ce1921c0-0da6-446b-9929-066255d0738b"))
    p.add_argument(
        "--supplier-id",
        default=os.environ.get("SUPPLIER_ID", "00005658-ca89-4f78-97c1-3321cfd69d93"),
    )
    p.add_argument("--tenant-id", default=os.environ.get("TENANT_ID", "ai-bot-1-11h93"))
    p.add_argument(
        "--recv-timeout",
        type=float,
        default=float(os.environ.get("RECV_TIMEOUT", "300")),
    )
    p.add_argument(
        "--only",
        type=int,
        default=None,
        help="Run only flow N (1-based) for a quick smoke test. "
             "E.g. --only 11 to test just the price-premium counter-offer flow.",
    )
    p.add_argument(
        "--counter-only",
        action="store_true",
        default=False,
        help="Run only the evaluate_counter_offer flows (11–18) for focused testing.",
    )
    args = p.parse_args()

    base = args.base_url.rstrip("/")
    ws_base = base.replace("https://", "wss://").replace("http://", "ws://")
    cfg = Config(
        base_url=base,
        ws_base=ws_base,
        email=args.email,
        password=args.password,
        user_id=args.user_id,
        supplier_id=args.supplier_id,
        tenant_id=args.tenant_id,
        recv_timeout=args.recv_timeout,
    )
    cfg._only = args.only  # type: ignore[attr-defined]
    cfg._counter_only = args.counter_only  # type: ignore[attr-defined]
    return cfg


async def main_async(cfg: Config) -> int:
    out_dir = Path("logs")
    out_dir.mkdir(parents=True, exist_ok=True)

    flows = FLOWS
    only = getattr(cfg, "_only", None)
    counter_only = getattr(cfg, "_counter_only", False)

    if only is not None:
        if not (1 <= only <= len(FLOWS)):
            print(f"--only must be 1..{len(FLOWS)}", file=sys.stderr)
            return 2
        flows = [FLOWS[only - 1]]
    elif counter_only:
        # Counter-offer flows start at index 10 (flows 11–18, 0-indexed 10–17)
        flows = [f for f in FLOWS if "counter" in f.name.lower() or f.focus == COUNTER]
        print(f"→ Running {len(flows)} counter-offer flow(s) only\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"→ Logging in as {cfg.email} @ {cfg.base_url}")
        try:
            auth_token = await login(client, cfg)
        except Exception as exc:
            print(f"Login failed: {exc}", file=sys.stderr)
            return 1
        print("  ✓ token acquired\n")

        all_results: list[tuple[Flow, list[TurnResult]]] = []
        for idx, flow in enumerate(flows, 1):
            print(f"Flow {idx}/{len(flows)}: {flow.name}  (focus={flow.focus}, tone={flow.tone})")
            try:
                results = await run_flow(client, cfg, auth_token, flow)
            except Exception as exc:
                print(f"  !! flow crashed: {exc}", file=sys.stderr)
                results = [
                    TurnResult(
                        text=t.text, expect=t.expect, note=t.note,
                        context=t.context, error=str(exc),
                    )
                    for t in flow.turns
                ]
            all_results.append((flow, results))
            print()

    md_path, json_path = write_reports(cfg, all_results, out_dir)

    total = sum(len(r) for _, r in all_results)
    intent_pass = sum(1 for _, rs in all_results for r in rs if r.intent_ok)
    errors = sum(1 for _, rs in all_results for r in rs if r.error)
    print("=" * 70)
    print(f"Intent routing: {intent_pass}/{total} passed   |   errors: {errors}")
    print(f"Markdown report: {md_path}")
    print(f"JSON report:     {json_path}")
    print("Read every 🔎 CONTEXT CHECK turn in the report to verify context retention.")
    print("For counter-offer flows, also verify the verdict and SCF recommendation match the scenario.")
    return 0 if errors == 0 else 1


def main() -> None:
    cfg = parse_args()
    try:
        raise SystemExit(asyncio.run(main_async(cfg)))
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        raise SystemExit(130)


if __name__ == "__main__":
    main()
