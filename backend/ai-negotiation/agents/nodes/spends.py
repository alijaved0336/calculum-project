from __future__ import annotations

import json
import logging
import re
import uuid as _uuid
from typing import Any

from sqlalchemy import text

from agents.state import NegotiationState, NodeFn
from domain.entities.intent import Intent
from domain.ports.llm_port import LLMPort
from infrastructure.database.connection import AsyncSessionFactory
from utils.prompts.response_mode import get_format_instruction
from utils.prompts.spends_prompt import (
    SPENDS_ANSWER_SYSTEM_PROMPT,
    SPENDS_SQL_SYSTEM_PROMPT,
    build_spends_answer_prompt,
    build_spends_sql_prompt,
)

logger = logging.getLogger(__name__)

# When the negotiator asks to see individual spend lines we only surface them if
# there are at most this many — otherwise there are too many to dump at once.
MAX_LISTED_SPENDS = 3

# Hard safety cap on any single result set fed back to the LLM, so a broad
# GROUP BY can never blow up the formatting context.
_AGGREGATE_ROW_CAP = 25

# Tokens that must never appear in a generated query — anything mutating, a
# statement separator, a comment marker, or an attempt to reach outside `spends`.
_FORBIDDEN_SQL = re.compile(
    r"(;|--|/\*|\*/|\b(?:insert|update|delete|drop|alter|truncate|create|grant|"
    r"revoke|merge|call|copy|into|join|union|intersect|except|pg_|information_schema)\b)",
    re.IGNORECASE,
)

# An equality-style predicate on `alias` with a single-quoted literal, e.g.
# `alias ILIKE '098'` or `alias = 'Spend 02'`. Only equality forms are rewritten
# (see _normalize_alias_predicates); negations and IN-lists are left untouched.
_ALIAS_PREDICATE = re.compile(
    r"\balias\s*(?:=|(?:i?like))\s*'([^']*)'",
    re.IGNORECASE,
)

# The digits inside an alias literal, ignoring any prefix/padding the negotiator
# (or the model) did or did not write.
_ALIAS_DIGITS = re.compile(r"\d+")


def _normalize_alias_predicates(sql: str) -> str:
    """Rewrite `alias = '<x>'` predicates to match on the spend NUMBER alone.

    Spend aliases are stored as ``Spend <zero-padded number>`` ("Spend 098"),
    but a negotiator asks about "spend 098" — or "spend 98" — so the model's
    literal may carry no prefix and the wrong padding. A verbatim comparison
    then returns nothing and the empty result is misread as a mistyped alias.

    Both sides are reduced to their digits and compared with leading zeros
    ignored, so "098", "98", "Spend 98" and "Spend 098" all find `Spend 098`.
    This is unambiguous because the comparison only ever runs INSIDE the
    supplier/tenant-scoped subquery, and within one supplier the aliases use a
    single padding width — the globally distinct `Spend 1`/`Spend 01`/
    `Spend 001` lines never share a supplier.

    A literal with no digits (a genuinely textual alias) is left alone.
    """

    def rewrite(match: re.Match[str]) -> str:
        digits = "".join(_ALIAS_DIGITS.findall(match.group(1)))
        if not digits:
            return match.group(0)
        # Anchored so '98' cannot also match 'Spend 980'; `0*` on both the
        # pattern and the stored value makes padding irrelevant.
        number = digits.lstrip("0") or "0"
        return f"regexp_replace(alias, '\\D', '', 'g') ~ '^0*{number}$'"

    return _ALIAS_PREDICATE.sub(rewrite, sql)


def _extract_last_json_object(raw: str) -> dict | None:
    """Return the last balanced ``{...}`` object parsed from ``raw``, or None."""
    end = raw.rfind("}")
    if end == -1:
        return None
    depth = 0
    for i in range(end, -1, -1):
        if raw[i] == "}":
            depth += 1
        elif raw[i] == "{":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(raw[i : end + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _validate_and_scope_sql(raw_sql: str, kind: str) -> str | None:
    """Validate the model's SQL and force supplier/tenant scoping in code.

    Returns the safe, scoped SQL (with ``:supplier_uuid`` / ``:tenant_id`` bind
    params) or ``None`` if the query is unsafe/unsupported.

    Scoping is NOT trusted to the model: whatever ``WHERE`` it wrote, the
    `spends` reference is rewritten to a subquery pre-filtered to this supplier
    and tenant, so an injected predicate can only ever narrow within — never
    across — the negotiator's own supplier.
    """
    sql = (raw_sql or "").strip().rstrip(";").strip()
    if not sql:
        return None

    lowered = sql.lower()
    # Read-only single SELECT only.
    if not lowered.startswith("select"):
        return None
    if _FORBIDDEN_SQL.search(sql):
        return None
    # Exactly one table reference, and it must be `spends`.
    from_matches = re.findall(r"\bfrom\s+([a-zA-Z_][\w]*)", lowered)
    if len(from_matches) != 1 or from_matches[0] != "spends":
        return None

    # Alias lookups are normalised in code, not left to the prompt: the model
    # has no reliable way to know this supplier's alias prefix or padding.
    sql = _normalize_alias_predicates(sql)

    scoped_source = (
        "(SELECT * FROM spends WHERE supplier_uuid = :supplier_uuid "
        "AND tenant_id = :tenant_id) AS spends"
    )
    scoped_sql = re.sub(r"\bfrom\s+spends\b", f"FROM {scoped_source}", sql, count=1, flags=re.IGNORECASE)

    if kind == "aggregate" and " limit " not in f" {lowered} ":
        scoped_sql = f"{scoped_sql} LIMIT {_AGGREGATE_ROW_CAP}"
    return scoped_sql


async def _fetch(session, sql: str, params: dict) -> list[dict[str, Any]]:
    result = await session.execute(text(sql), params)
    return [dict(m) for m in result.mappings().all()]


def make_spends_node(llm: LLMPort) -> NodeFn:
    """Build the `answer_spends_question` node.

    Answers questions from the detailed `spends` table by generating a scoped,
    read-only SQL query on demand, running it, and phrasing the small result.
    Row-level spend data is transient (this turn only) and is never persisted
    into supplier context — keeping it out of the context window.
    """

    async def spends_node(state: NegotiationState) -> dict[str, Any]:
        supplier_id = state.get("supplier_id") or ""
        tenant_id = state.get("tenant_id") or ""
        message = state.get("message", "")
        history = state.get("conversation_history")

        if not supplier_id or not tenant_id:
            logger.warning("spends: missing supplier_id/tenant_id in state")
            return {
                "response": (
                    "I don't have this supplier loaded for the session yet, so I "
                    "can't look up their spend data right now."
                ),
                "errors": ["spends: missing supplier_id/tenant_id"],
            }
        try:
            supplier_uuid = _uuid.UUID(supplier_id)
        except (ValueError, AttributeError):
            logger.warning("spends: supplier_id is not a valid uuid: %r", supplier_id)
            return {"response": "I can't look up spend data for this supplier right now."}

        # 1) Negotiator question -> scoped read-only SQL.
        try:
            raw = await llm.complete(
                build_spends_sql_prompt(message, history),
                system=SPENDS_SQL_SYSTEM_PROMPT,
                enable_thinking=False,
                temperature=0,
                max_tokens=400,
                stream_to_client=False,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("spends: SQL generation failed")
            return {"response": None, "errors": [f"spends: {exc}"]}

        parsed = _extract_last_json_object(raw or "")
        kind = (parsed or {}).get("kind")
        scoped_sql = _validate_and_scope_sql((parsed or {}).get("sql", ""), kind) if parsed else None

        if not parsed or kind == "none" or scoped_sql is None:
            logger.info("spends: no runnable query (kind=%s)", kind)
            return {
                "response": (
                    "I can answer questions about this supplier's spend records — "
                    "things like total spend, spend by commodity or team, payment "
                    "terms, or which lines are on SCF. Which spend detail would you "
                    "like?"
                )
            }

        params = {"supplier_uuid": supplier_uuid, "tenant_id": tenant_id}
        logger.info("spends: running kind=%s sql=%s", kind, scoped_sql)
        try:
            async with AsyncSessionFactory() as session:
                if kind == "rows":
                    count_rows = await _fetch(
                        session, f"SELECT COUNT(*) AS n FROM ({scoped_sql}) AS _cnt", params
                    )
                    total = int(count_rows[0]["n"]) if count_rows else 0
                    if total > MAX_LISTED_SPENDS:
                        # Too many to dump — tell the negotiator how many there are.
                        return {
                            "response": (
                                f"There are {total} spend lines matching that for this "
                                "supplier — too many to show all at once. Tell me which "
                                "one you want (e.g. by commodity, alias, or procurement "
                                "team), or ask for a specific figure like total spend or "
                                "average payment terms."
                            )
                        }
                    # total may be 0 — an empty result is itself a valid answer
                    # (e.g. "no spend line meets that threshold"); it is phrased below.
                    rows: list[dict[str, Any]] = (
                        await _fetch(session, f"{scoped_sql} LIMIT {MAX_LISTED_SPENDS}", params)
                        if total > 0
                        else []
                    )
                else:  # aggregate
                    rows = await _fetch(session, scoped_sql, params)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("spends: query execution failed")
            return {"response": None, "errors": [f"spends: {exc}"]}

        # 2) Phrase the result — INCLUDING an empty one. A query that ran and
        # returned nothing is the real answer to a threshold / yes-no question
        # ("no spend line supports N days"), not automatically a mistyped lookup,
        # so hand the (possibly empty) result to the answer model and let it
        # phrase it in the context of the question. Streamed like other nodes.
        prompt = build_spends_answer_prompt(message, rows, history)
        prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"
        try:
            draft = await llm.complete(
                prompt, system=SPENDS_ANSWER_SYSTEM_PROMPT, stream_to_client=True
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("spends: answer formatting failed")
            return {"response": None, "errors": [f"spends: {exc}"]}

        return {"response": draft, "source": None}

    return spends_node


# Node-name constant the graph routes on.
SPENDS_NODE = Intent.ANSWER_SPENDS_QUESTION.value
