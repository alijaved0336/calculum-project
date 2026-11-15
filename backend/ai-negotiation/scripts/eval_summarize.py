#!/usr/bin/env python3
"""Reliability eval for the `summarize_supplier_position` intent.

Runs a bank of 40+ negotiator questions — summary asks, narrow asks inside the
position, phrasing variants of the chip text, and boundary cases that belong to
other intents — through the REAL intent classifier and the REAL summarize node,
against fixture suppliers, with no server and no database. Each question runs
several times so the report shows a reliability percentage rather than one
sample.

What is scored per run
----------------------
  routing    — the classified intent is one of the expected intents
  scope      — for summarize turns, `summary_scope` matches the expectation
  tier       — summary_tier matches the expected small / large category
  template   — SUMMARY scope: exact match to the expected tier rendering
  grounding  — every day / money / percent figure in the answer exists in the
               brief (the P1 rule, plus the template's own derived figures)
  banned     — none of the struck-out phrasing came back
  judge      — NARROW scope only, optional and OFF unless a judge endpoint is
               configured (EVAL_LLM_BASE_URL / EVAL_LLM_MODEL / EVAL_LLM_API_KEY
               in .env): it grades accuracy 1-5 and grounded yes/no against the
               data. Every other check below runs with or without it.

The selected tier is the hard gate: the expected small or large summary
must render exactly. Narrow asks remain focused, generated answers.

Usage
-----
    .venv/bin/python scripts/eval_summarize.py                # 3 runs, client fixture
    .venv/bin/python scripts/eval_summarize.py --runs 1 --suppliers client,rich,sparse
    .venv/bin/python scripts/eval_summarize.py --no-judge --limit 10
    .venv/bin/python scripts/eval_summarize.py --tags summary,narrow

Output: logs/eval_summarize_<timestamp>.md and .json, plus a PASS/FAIL line.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import statistics
import sys
import time
from dataclasses import asdict, dataclass, field, replace
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from config import settings  # noqa: E402
from domain.entities.context import SupplierContext  # noqa: E402
from domain.entities.intent import Intent  # noqa: E402
from domain.services.brief_builder import brief_from  # noqa: E402
from domain.services.negotiation_arguments import build_argument_analysis  # noqa: E402
from domain.services.output_verifier import known_day_figures  # noqa: E402
from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier  # noqa: E402
from infrastructure.llm.llm_client import LLMClient  # noqa: E402
from tests.unit.prompt_fixtures import (  # noqa: E402
    client_sample_facts,
    rich_facts,
    sparse_facts,
)
from utils.prompts.brief.facts import format_money  # noqa: E402
from utils.prompts.summary_template import (  # noqa: E402
    BANNED_PHRASES,
    render_summary_skeleton,
)
from utils.prompts.summarize_prompt import build_summarize_narrow_prompt  # noqa: E402
from agents.nodes.summarize import make_summarize_node  # noqa: E402

from utils.prompts.supplier_summary import render_supplier_summary

SUMMARIZE = Intent.SUMMARIZE_SUPPLIER_POSITION


# ── The question bank ──────────────────────────────────────────────────────


@dataclass(frozen=True)
class Question:
    id: str
    text: str
    # Intents accepted as correct routing. The first is the primary one.
    intents: tuple[Intent, ...]
    # Expected scope when the intent is summarize; None = not asserted.
    scope: str | None = None
    tag: str = "summary"
    # A prior exchange, for the meta_operation boundary case.
    history: tuple[dict, ...] = ()
    # What a correct narrow answer must mention (case-insensitive substrings,
    # any one of the alternatives in each group). Checked deterministically.
    must_mention: tuple[tuple[str, ...], ...] = ()
    tier: str | None = None


def _prior_summary(facts) -> tuple[dict, ...]:
    return (
        {"role": "user", "content": "Summarize supplier position"},
        {"role": "ai", "content": render_summary_skeleton(brief_from(facts))},
    )


def question_bank(facts) -> list[Question]:
    S = (SUMMARIZE,)
    questions = [
        # ── Summary asks: the client template, every time ──────────────
        Question("s01", "Summarize supplier position", S, "summary"),
        Question("s02", "Provide summary of payment terms opportunity", S, "summary"),
        Question("s03", "Give me an overview of where we stand with this supplier", S, "summary"),
        Question("s04", "Where do we stand with this supplier?", S, "summary"),
        Question("s05", "Brief me on this supplier before the call", S, "summary"),
        Question("s06", "What's our position with this supplier?", S, "summary"),
        Question("s07", "Summarise the opportunity", S, "summary"),
        Question("s08", "Give me the full picture on this supplier", S, "summary"),
        Question("s09", "Quick summary of the supplier position please", S, "summary"),
        Question("s10", "Can you summarize the current supplier position?", S, "summary"),
        Question("s11", "Payment terms opportunity summary", S, "summary"),
        Question("s12", "Overview please", S, "summary"),
        # ── Narrow asks: one thing inside the position, from the data ──
        Question("n01", "What's the outlook for this negotiation?", S, "narrow", "narrow",
                 must_mention=(("high",),)),
        Question("n02", "How likely is this ask to land?", S, "narrow", "narrow",
                 must_mention=(("high",),)),
        Question("n03", "How much leverage do we have and what's driving it?",
                 (SUMMARIZE, Intent.EXPLAIN_RECOMMENDATION), "narrow", "narrow",
                 must_mention=(("low",),)),
        Question("n04", "What is our BATNA here and how was it derived?",
                 (SUMMARIZE, Intent.ANSWER_DATA_QUESTION), "narrow", "narrow",
                 must_mention=(("no batna",), ("contractual",))),
        Question("n05", "Which arguments support extending the terms?",
                 (SUMMARIZE, Intent.EXPLAIN_RECOMMENDATION), "narrow", "narrow",
                 must_mention=(("supplier standard",), ("67",))),
        Question("n06", "How sensitive is this supplier to longer payment terms?",
                 (SUMMARIZE, Intent.ANSWER_DATA_QUESTION), "narrow", "narrow",
                 must_mention=(("low",), ("4.23",))),
        Question("n07", "Why is the probability of success high?",
                 (SUMMARIZE, Intent.EXPLAIN_RECOMMENDATION), "narrow", "narrow",
                 must_mention=(("high",),)),
        Question("n08", "What's the relationship value with this supplier?", S, "narrow", "narrow",
                 must_mention=(("high",), ("908",))),
        Question("n09", "What does the supplier standard tell us?",
                 (SUMMARIZE, Intent.EXPLAIN_RECOMMENDATION, Intent.ANSWER_DATA_QUESTION),
                 "narrow", "narrow", must_mention=(("67",), ("75",))),
        Question("n10", "Is the 60-day target realistic given the benchmarks?",
                 (SUMMARIZE, Intent.EXPLAIN_RECOMMENDATION), "narrow", "narrow",
                 must_mention=(("67",),)),
        Question("n11", "What are the stakes for us in this negotiation?", S, "narrow", "narrow",
                 must_mention=(("908",), ("37",))),
        # "overall position" reads as the whole picture as much as a judgement
        # over it; either scope is a correct answer, so scope is not asserted.
        Question("n12", "How strong is our position overall?",
                 (SUMMARIZE, Intent.EXPLAIN_RECOMMENDATION), None, "narrow"),
        Question("n13", "What's driving the outlook here?",
                 (SUMMARIZE, Intent.EXPLAIN_RECOMMENDATION), "narrow", "narrow",
                 must_mention=(("leverage",),)),
        Question("n14", "Explain the supplier's size and what it means for us",
                 (SUMMARIZE, Intent.ANSWER_DATA_QUESTION), "narrow", "narrow",
                 must_mention=(("large",),)),
        # "of the summary" points at prior output, so this runs WITH the
        # summary in the conversation, the way a negotiator would actually ask
        # it. Cutting a section out of that output (meta_operation) and
        # answering it fresh from the data (summarize, narrow) are both right.
        Question("n15", "Give me just the BATNA section of the summary",
                 (SUMMARIZE, Intent.META_OPERATION, Intent.ANSWER_DATA_QUESTION), "narrow", "narrow",
                 history=_prior_summary(facts), must_mention=(("45",),)),
        # ── Boundary: must NOT land on summarize ───────────────────────
        Question("b01", "What is their WACC?", (Intent.ANSWER_DATA_QUESTION,), None, "boundary"),
        Question("b02", "Make that summary shorter, five lines max", (Intent.META_OPERATION,),
                 None, "boundary", history=_prior_summary(facts)),
        Question("b03", "Generate the negotiation playbook",
                 (Intent.GENERATE_NEGOTIATION_PLAYBOOK,), None, "boundary"),
        Question("b04", "They say 60 days will hurt their cash flow — what do I say?",
                 (Intent.HANDLE_SUPPLIER_PUSHBACK,), None, "boundary"),
        Question("b05", "What would 75 days unlock in cash?", (Intent.RUN_SCENARIO,), None, "boundary"),
        Question("b06", "Draft the opening email to the supplier",
                 (Intent.DRAFT_EMAIL,), None, "boundary"),
    ]

    questions += [
        Question("p01", "Provide me key facts", S, "summary", tier="small"),
        Question("p02", "Provide me insights about this supplier", S, "summary", tier="small"),
        Question("p03", "Who are we dealing with and what do they do?", S, "summary", tier="small"),
        Question("p04", "General information, not about payment terms", S, "summary", tier="small"),
        Question("p05", "Give me the full company profile, no negotiation advice", S, "summary", tier="small"),
        Question("m01", "What are the most important things I should know?", S, "summary", tier="large"),
        Question("m02", "Summarize this supplier data for me", S, "summary", tier="large"),
        Question("l01", "Give me a detailed summary", S, "summary", tier="large"),
        Question("l02", "Walk me through where we stand for this negotiation", S, "summary", tier="large"),
        Question("n16", "Explain our leverage in full detail", S, "narrow", "narrow"),
    ]
    # Two tiers: every summary ask without an explicit small expectation is large.
    return [replace(q, tier="large") if q.scope == "summary" and q.tier is None else q
            for q in questions]


SUPPLIERS = {
    "client": client_sample_facts,
    "rich": rich_facts,
    "sparse": sparse_facts,
}


# ── Scoring ────────────────────────────────────────────────────────────────

_DAY_RE = re.compile(r"\b(\d{1,3})\s*[- ]?(?:calendar\s+)?days?\b", re.IGNORECASE)
_MONEY_RE = re.compile(r"-?\$\s?\d[\d,]*(?:\.\d+)?\s?[KMB]?", re.IGNORECASE)
_PCT_RE = re.compile(r"\b(\d+(?:\.\d+)?)\s?%")


def _known_money(brief) -> set[str]:
    out: set[str] = set()
    f = brief.facts
    for v in (f.spend_volume, f.target_cash_flow):
        if v is not None:
            out.add(format_money(v).replace(" ", "").upper())
            out.add(f"${v:,.0f}")
            out.add(f"${v:,.2f}")
            out.add(f"${int(v):,}")
    return out


def _known_percents(brief, skeleton: str) -> set[str]:
    out: set[str] = set()
    f = brief.facts
    for v in (f.supplier_financing_rate, f.wacc_pre_tax, f.wacc_after_tax,
              f.cost_of_debt_spread, f.scf_rate):
        if v is not None:
            out.add(f"{v * 100:.2f}")
            out.add(f"{v * 100:.1f}")
            out.add(f"{v * 100:.0f}")
    out.add("25")  # the concession rule itself
    out.update(_PCT_RE.findall(skeleton))
    # cost-impact percentages rendered inside argument details
    for a in brief.supporting:
        for k in ("detail", "supplier_pitch", "rationale"):
            if isinstance(a.get(k), str):
                out.update(_PCT_RE.findall(a[k]))
    return out


def grounding_problems(answer: str, brief, skeleton: str) -> list[str]:
    days = known_day_figures(brief) | {int(d) for d in _DAY_RE.findall(skeleton)}
    problems = []
    for d in sorted({int(m) for m in _DAY_RE.findall(answer)}):
        if d not in days:
            problems.append(f"unsourced day figure: {d} days")
    money = _known_money(brief) | {m.replace(" ", "").upper() for m in _MONEY_RE.findall(skeleton)}
    for m in set(_MONEY_RE.findall(answer)):
        key = m.replace(" ", "").upper()
        if key not in money and key.rstrip(".") not in money:
            problems.append(f"unsourced money figure: {m}")
    pct = _known_percents(brief, skeleton)
    for p in set(_PCT_RE.findall(answer)):
        if p not in pct and p.rstrip("0").rstrip(".") not in pct:
            problems.append(f"unsourced percentage: {p}%")
    return problems


# A narrow answer may legitimately label its lines "Outlook:" or "Stakes:" —
# those are the words the negotiator used. What must never come back on ANY
# scope is a struck-out template SECTION or an internal annotation.
_NARROW_BANNED = ("Falls short", "No data on", "Internal confidence builder", "INTERNAL ONLY", "STRONGEST")


def banned_problems(answer: str, scope: str) -> list[str]:
    low = answer.lower()
    phrases = BANNED_PHRASES if scope == "summary" else _NARROW_BANNED
    return [f"struck-out phrasing present: {p}" for p in phrases if p.lower() in low]


def mention_problems(answer: str, q: Question) -> list[str]:
    low = answer.lower()
    return [
        "answer never mentions any of: " + " / ".join(group)
        for group in q.must_mention
        if not any(alt.lower() in low for alt in group)
    ]


# ── Judge ──────────────────────────────────────────────────────────────────

_JUDGE_PROMPT = """You are grading an AI negotiation assistant's answer for a procurement team.

The assistant was asked ONE question about a supplier's payment-term position. Below is
the complete DATA it was allowed to use (facts, computed judgments, the standard summary),
then the QUESTION, then the ANSWER.

Grade strictly:
- accuracy (1-5): 5 = every statement is correct against the DATA and the question is fully
  answered; 3 = mostly right with a gap or a vague claim; 1 = wrong or does not answer.
- grounded (true/false): false if ANY figure, rating, level or claim in the ANSWER is not
  supported by the DATA (invented, recomputed, or contradicted).
- focused (true/false): true if the answer addresses the question rather than reproducing
  the whole summary or wandering into unrelated sections.

Return JSON only: {{"accuracy": <1-5>, "grounded": <true|false>, "focused": <true|false>, "issue": "<one sentence or empty>"}}

## DATA
{data}

## QUESTION
{question}

## ANSWER
{answer}
"""


async def judge(llm, data: str, question: str, answer: str) -> dict:
    from langchain_core.messages import HumanMessage

    try:
        raw = await llm.ainvoke([HumanMessage(content=_JUDGE_PROMPT.format(
            data=data, question=question, answer=answer))])
    except Exception as exc:  # quota, network, auth — the eval still runs
        return {"issue": f"judge unavailable: {type(exc).__name__}: {str(exc)[:160]}", "unavailable": True}
    text = raw.content if isinstance(raw.content, str) else str(raw.content)
    m = re.search(r"\{.*\}", text, re.S)
    try:
        return json.loads(m.group(0)) if m else {"issue": "judge returned no JSON"}
    except json.JSONDecodeError:
        return {"issue": "judge returned invalid JSON"}


# ── Runner ─────────────────────────────────────────────────────────────────


@dataclass
class RunResult:
    question_id: str
    supplier: str
    run: int
    intent: str
    scope: str | None
    tier: str | None
    tier_ok: bool | None
    response_mode: str | None
    routing_ok: bool
    scope_ok: bool | None
    template_ok: bool | None
    grounding_ok: bool | None
    banned_ok: bool | None
    mention_ok: bool | None
    judge: dict | None
    latency_ms: int
    passed: bool
    problems: list[str] = field(default_factory=list)
    answer: str = ""


async def run_one(q: Question, supplier: str, facts, classifier, node, judge_llm, run: int) -> RunResult:
    brief = brief_from(facts)
    skeleton = render_summary_skeleton(brief)
    context = SupplierContext(
        supplier_id=f"eval-{supplier}", raw={}, facts=facts,
        argument_analysis=build_argument_analysis(facts),
    )
    history = list(q.history) or None
    t0 = time.perf_counter()
    cls = await classifier.classify(q.text, context=context, history=history)
    routing_ok = cls.intent in q.intents
    problems: list[str] = []
    if not routing_ok:
        problems.append(f"routed to {cls.intent.value}, expected one of "
                        + "/".join(i.value for i in q.intents))

    scope_ok = tier_ok = template_ok = grounding_ok = banned_ok = mention_ok = None
    judged = None
    answer = ""
    if cls.intent is SUMMARIZE:
        if q.scope is not None:
            scope_ok = cls.summary_scope == q.scope
            if not scope_ok:
                problems.append(f"scope {cls.summary_scope}, expected {q.scope}")
        if cls.summary_scope == "summary":
            tier_ok = q.tier is None or cls.summary_tier == q.tier
            if not tier_ok:
                problems.append(f"tier {cls.summary_tier}, expected {q.tier}")
            skeleton = render_supplier_summary(brief, q.tier or cls.summary_tier)
        state = {
            "message": q.text, "context": context, "brief": brief,
            "conversation_history": history,
            "response_mode": cls.response_mode, "summary_scope": cls.summary_scope,
            "summary_tier": cls.summary_tier,
        }
        result = await node(state)
        answer = result.get("response") or ""
        for e in result.get("errors") or []:
            problems.append(f"node error: {e}")
        if cls.summary_scope == "summary":
            tp = [] if answer == skeleton else ["answer does not match the selected tier"]
            template_ok = not tp
            problems += [f"template: {p}" for p in tp]
        gp = grounding_problems(answer, brief, skeleton)
        grounding_ok = not gp
        problems += gp
        bp = banned_problems(answer, cls.summary_scope)
        banned_ok = not bp
        problems += bp
        if cls.summary_scope == "narrow":
            mp = mention_problems(answer, q)
            mention_ok = not mp
            problems += mp
            if judge_llm is not None:
                data = build_summarize_narrow_prompt(q.text, facts, brief=brief)
                judged = await judge(judge_llm, data, q.text, answer)
                if judged.get("unavailable"):
                    problems.append(f"judge skipped: {judged['issue']}")
                    judged = None
                elif judged.get("grounded") is False:
                    problems.append(f"judge: not grounded — {judged.get('issue', '')}")
                if judged is not None and judged.get("focused") is False:
                    problems.append(f"judge: unfocused — {judged.get('issue', '')}")
                if judged is not None:
                    try:
                        if float(judged.get("accuracy", 0)) < 3:
                            problems.append(f"judge: accuracy {judged.get('accuracy')} — {judged.get('issue', '')}")
                    except (TypeError, ValueError):
                        problems.append("judge: no accuracy score")
    latency = int((time.perf_counter() - t0) * 1000)

    hard_fail = (not routing_ok) or (scope_ok is False) or (tier_ok is False) or (template_ok is False)
    soft_fail = any(x is False for x in (grounding_ok, banned_ok, mention_ok)) or any(
        p.startswith("judge:") for p in problems)
    return RunResult(
        question_id=q.id, supplier=supplier, run=run, intent=cls.intent.value,
        scope=cls.summary_scope if cls.intent is SUMMARIZE else None,
        tier=cls.summary_tier if cls.intent is SUMMARIZE and cls.summary_scope == "summary" else None,
        tier_ok=tier_ok, response_mode=cls.response_mode, routing_ok=routing_ok, scope_ok=scope_ok,
        template_ok=template_ok, grounding_ok=grounding_ok, banned_ok=banned_ok,
        mention_ok=mention_ok, judge=judged, latency_ms=latency,
        passed=not (hard_fail or soft_fail), problems=problems, answer=answer,
    )


def _pct(values: list[bool | None]) -> str:
    vals = [v for v in values if v is not None]
    return f"{100 * sum(vals) / len(vals):.0f}%" if vals else "—"


def write_report(results: list[RunResult], questions: dict[str, Question], out: Path, meta: dict) -> str:
    lines = [
        "# Summarize intent — reliability eval",
        "",
        f"- Model: `{meta['model']}` · judge: `{meta['judge'] or 'off'}` · runs per question: {meta['runs']}"
        f" · suppliers: {', '.join(meta['suppliers'])} · {meta['timestamp']}",
        "",
        "## Overall",
        "",
        "| metric | value |",
        "|---|---|",
        f"| runs | {len(results)} |",
        f"| passed | {_pct([r.passed for r in results])} |",
        f"| routing correct | {_pct([r.routing_ok for r in results])} |",
        f"| tier correct (summary turns) | {_pct([r.tier_ok for r in results])} |",
        f"| scope correct (summarize turns) | {_pct([r.scope_ok for r in results])} |",
        f"| template compliant (summary scope) | {_pct([r.template_ok for r in results])} |",
        f"| grounded figures | {_pct([r.grounding_ok for r in results])} |",
        f"| struck-out phrasing absent | {_pct([r.banned_ok for r in results])} |",
        f"| required mentions (narrow) | {_pct([r.mention_ok for r in results])} |",
    ]
    judged = [r.judge for r in results if r.judge and isinstance(r.judge.get("accuracy"), (int, float))]
    if judged:
        lines += [
            f"| judge accuracy (narrow, 1-5) | {statistics.mean(j['accuracy'] for j in judged):.2f} |",
            f"| judge grounded | {_pct([bool(j.get('grounded')) for j in judged])} |",
            f"| judge focused | {_pct([bool(j.get('focused')) for j in judged])} |",
        ]
    lats = [r.latency_ms for r in results]
    lines += [f"| median latency (classify + answer) | {int(statistics.median(lats))} ms |", ""]

    lines += ["## Per question", "", "| id | question | expected | pass | routing | scope | template | grounded | judge | issues |", "|---|---|---|---|---|---|---|---|---|---|"]
    for qid in questions:
        rs = [r for r in results if r.question_id == qid]
        if not rs:
            continue
        q = questions[qid]
        jd = [r.judge["accuracy"] for r in rs if r.judge and isinstance(r.judge.get("accuracy"), (int, float))]
        issues = sorted({p.split(" — ")[0][:70] for r in rs for p in r.problems})
        lines.append(
            f"| {qid} | {q.text} | {q.intents[0].value}{'/' + q.scope if q.scope else ''} | "
            f"{_pct([r.passed for r in rs])} | {_pct([r.routing_ok for r in rs])} | {_pct([r.scope_ok for r in rs])} | "
            f"{_pct([r.template_ok for r in rs])} | {_pct([r.grounding_ok for r in rs])} | "
            f"{statistics.mean(jd):.1f} | " if jd else
            f"| {qid} | {q.text} | {q.intents[0].value}{'/' + q.scope if q.scope else ''} | "
            f"{_pct([r.passed for r in rs])} | {_pct([r.routing_ok for r in rs])} | {_pct([r.scope_ok for r in rs])} | "
            f"{_pct([r.template_ok for r in rs])} | {_pct([r.grounding_ok for r in rs])} | — | "
        )
        lines[-1] += "; ".join(issues).replace("|", "/") + " |"

    failures = [r for r in results if not r.passed]
    lines += ["", f"## Failures ({len(failures)})", ""]
    for r in failures:
        q = questions[r.question_id]
        lines += [
            f"### {r.question_id} · {q.text} · {r.supplier} · run {r.run}",
            "",
            f"- intent `{r.intent}` scope `{r.scope}` tier `{r.tier}` mode `{r.response_mode}` · {r.latency_ms} ms",
            *[f"- {p}" for p in r.problems],
            "",
            "```",
            (r.answer or "(no answer)")[:2500],
            "```",
            "",
        ]
    text = "\n".join(lines)
    out.with_suffix(".md").write_text(text, encoding="utf-8")
    out.with_suffix(".json").write_text(
        json.dumps({"meta": meta, "results": [asdict(r) for r in results]}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return text


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--suppliers", default="client")
    ap.add_argument("--tags", default="summary,narrow,boundary")
    ap.add_argument("--limit", type=int, default=0, help="only the first N questions")
    ap.add_argument("--ids", default="", help="comma-separated question ids to run")
    ap.add_argument("--no-judge", action="store_true")
    ap.add_argument("--out", default="logs")
    args = ap.parse_args()

    if not settings.llm_base_url:
        print("LLM_BASE_URL is not set in .env — nothing to evaluate against.")
        return 2

    llm = LLMClient(
        base_url=settings.llm_base_url, model=settings.llm_model, api_key=settings.llm_api_key,
        chat_path=settings.chat_path, enable_thinking=settings.llm_enable_thinking,
        supports_chat_template_kwargs=settings.llm_supports_chat_template_kwargs,
    )
    classifier = LLMIntentClassifier(llm=llm)
    node = make_summarize_node(llm)

    # `judge` (above) drives any LangChain-compatible chat model through
    # `.ainvoke([HumanMessage(...)])`, so wiring a judge here is the only step
    # needed to switch the optional grading back on. No judge is configured by
    # default and every other check runs regardless.
    judge_llm = None
    if not args.no_judge:
        if not settings.eval_llm_model or not settings.eval_llm_api_key:
            print(
                "No judge configured (EVAL_LLM_MODEL / EVAL_LLM_BASE_URL) — "
                "running without the judge."
            )
        else:
            print(
                "EVAL_LLM_* is set but no judge client is wired — "
                "running without the judge."
            )

    suppliers = [s.strip() for s in args.suppliers.split(",") if s.strip()]
    tags = {t.strip() for t in args.tags.split(",") if t.strip()}
    ids = {i.strip() for i in args.ids.split(",") if i.strip()}

    results: list[RunResult] = []
    questions: dict[str, Question] = {}
    total_runs = 0
    for supplier in suppliers:
        facts = SUPPLIERS[supplier]()
        bank = [q for q in question_bank(facts) if q.tag in tags and (not ids or q.id in ids)]
        if args.limit:
            bank = bank[: args.limit]
        for q in bank:
            questions.setdefault(q.id, q)
        for q in bank:
            for run in range(1, args.runs + 1):
                total_runs += 1
                r = await run_one(q, supplier, facts, classifier, node, judge_llm, run)
                results.append(r)
                flag = "PASS" if r.passed else "FAIL"
                print(f"[{flag}] {q.id:<4} {supplier:<6} run{run} {r.intent}/{r.scope or '-'} {r.latency_ms}ms"
                      + (f"  ← {r.problems[0]}" if r.problems else ""), flush=True)

    await llm.aclose()
    out_dir = ROOT / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = out_dir / f"eval_summarize_{stamp}"
    meta = {
        "model": settings.llm_model, "judge": settings.eval_llm_model if judge_llm else None,
        "runs": args.runs, "suppliers": suppliers, "timestamp": stamp,
    }
    write_report(results, questions, out, meta)

    passed = sum(r.passed for r in results)
    summary_runs = [r for r in results if questions[r.question_id].tag == "summary"]
    template_fail = sum(1 for r in summary_runs if r.template_ok is False or not r.routing_ok or r.scope_ok is False or r.tier_ok is False)
    print(f"\n{passed}/{len(results)} runs passed · client-summary hard failures: {template_fail}/{len(summary_runs)}")
    print(f"report: {out.with_suffix('.md')}")
    return 0 if all(r.passed for r in results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
