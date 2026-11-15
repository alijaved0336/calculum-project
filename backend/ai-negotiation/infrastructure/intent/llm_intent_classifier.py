from __future__ import annotations

import json
import logging
import re

from domain.entities.context import SupplierContext
from domain.entities.intent import EmailTemplate, Intent, IntentClassification
from domain.ports.intent_classifier_port import IntentClassifierPort
from domain.ports.llm_port import LLMPort
from utils.prompts.conversation_history import format_conversation_history
from utils.prompts.intent_classifier_prompt import intent_prompt
from utils.prompts.follow_up_suggestions_prompt import (
    get_fallback_follow_ups,
    strip_tone_follow_ups,
)

logger = logging.getLogger(__name__)


# Every field below is either a closed vocabulary or a single quoted string, so
# each can be read on its own without parsing the object around it. `reasoning`
# and `follow_ups` are deliberately absent: reasoning is the field that breaks
# the JSON in the first place and is only ever logged, and the follow-ups have
# their own per-intent fallbacks.
_SALVAGE_PATTERNS: dict[str, str] = {
    "summary_scope": r'"summary_scope"\s*:\s*"(summary|narrow)"',
    "summary_tier": r'"summary_tier"\s*:\s*"(small|medium|large)"',
    "intent": r'"intent"\s*:\s*"([a-z_]+)"',
    "confidence": r'"confidence"\s*:\s*([0-9.]+)',
    "response_mode": r'"response_mode"\s*:\s*"(quick|conversational|full)"',
    "response_language": r'"response_language"\s*:\s*(?:"([A-Za-z -]{1,30})"|null)',
    "resolved_question": r'"resolved_question"\s*:\s*"([^"\\]{0,500})"',
    # Salvaged because it decides whether a data question is answered about the
    # supplier or about the assistant — losing it answers "who are you?" with
    # supplier figures.
    "about_assistant": r'"about_assistant"\s*:\s*(true|false)',
    "email_template": (
        r'"email_template"\s*:\s*(?:"(standard|longer|collaborative|scf|senior_management)"|null)'
    ),
    "email_edit": r'"email_edit"\s*:\s*(true|false)',
    "email_changes": r'"email_changes"\s*:\s*(true|false)',
    # Salvaged because it decides whether a pushback turn prepares the likely
    # objections or asks the negotiator what the supplier said.
    "pushback_anticipate": r'"pushback_anticipate"\s*:\s*(true|false)',
}


def _salvage_fields(candidate: str) -> dict[str, object]:
    """The routing fields, read individually out of JSON that will not parse.

    Returns {} when even the intent cannot be found — there is nothing to act on
    then, and a guess would be worse than saying so.
    """
    salvaged: dict[str, object] = {}
    for field, pattern in _SALVAGE_PATTERNS.items():
        match = re.search(pattern, candidate)
        if match and match.lastindex:
            salvaged[field] = match.group(1)
    if "intent" not in salvaged:
        return {}
    if "confidence" in salvaged:
        try:
            salvaged["confidence"] = float(salvaged["confidence"])
        except ValueError:
            salvaged.pop("confidence")
    return salvaged


def _extract_last_json_object(text: str) -> str | None:
    """Return the last balanced ``{...}`` object in ``text``, or ``None``.

    Matches from the final ``}`` back to its opening ``{`` by brace depth, so
    it's robust to prose or earlier braces around the JSON (e.g. a reasoning
    model's leaked chain-of-thought that mentions the schema). The real answer's
    JSON is emitted last, so the last balanced object is the one we want.
    """
    end = text.rfind("}")
    if end == -1:
        return None
    depth = 0
    for i in range(end, -1, -1):
        ch = text[i]
        if ch == "}":
            depth += 1
        elif ch == "{":
            depth -= 1
            if depth == 0:
                return text[i : end + 1]
    return None


class LLMIntentClassifier(IntentClassifierPort):
    """Classifies messages into a :class:`Intent` using the LLM backend.

    The classification rules, intent definitions, output schema and few-shot
    examples all live in ``intent_prompt`` (the system prompt) — this adapter's
    job is just to call the LLM with it and turn the resulting JSON into a
    typed :class:`IntentClassification`.
    """

    def __init__(self, llm: LLMPort) -> None:
        self._llm = llm

    async def classify(
        self,
        message: str,
        context: SupplierContext | None = None,
        history: list[dict[str, str]] | None = None,
    ) -> IntentClassification:
        raw = await self._llm.complete(
            self._build_user_prompt(message, context, history),
            # Read per call, not at import, so the flag flips without a rebuild.
            system=intent_prompt,
            # Classification only needs the JSON verdict — disable the model's
            # chain-of-thought (it's pure latency here and its braces used to
            # corrupt JSON extraction), pin temperature for determinism, and cap
            # output so a runaway response can't blow the request timeout. Raised
            # 256 -> 384 for the follow-up suggestions, then -> 512 for
            # `resolved_question` (one rewritten sentence).
            enable_thinking=False,
            temperature=0.4,
            max_tokens=512,
            stream_to_client=False,
        )
        return self._parse(raw, message)

    # ── Prompt building ────────────────────────────────────────────────

    def _build_user_prompt(
        self,
        message: str,
        context: SupplierContext | None,
        history: list[dict[str, str]] | None = None,
    ) -> str:
        supplier_name = context.facts.supplier_name if context and context.facts else None
        current = f"[Supplier: {supplier_name}]\n{message}" if supplier_name else message

        # Two turns is still plenty of DEPTH — but the last one needs room. At a
        # flat 300 characters the classifier saw the opening line of the previous
        # answer and nothing else, so "explain each of these" had to be routed
        # without ever seeing what "these" were; whether that is a reshape of the
        # old answer (`meta_operation`) or a fresh question about the benchmarks
        # in it (`explain_recommendation`) is decided precisely by that content.
        # The older turn stays tight — it only has to place the topic.
        # 4 messages, not 2 — "turns" here are individual messages, so 2 showed
        # the classifier a single exchange. That is too short to carry an aspect
        # forward: by the third message of a definition thread the original
        # "what is the definition of X" had already scrolled out of view, and the
        # follow-up got resolved as a value lookup. 4 keeps two exchanges, at
        # ~1,800 characters worst case.
        history_block = format_conversation_history(
            history, max_turns=4, max_chars_per_turn=300, last_turn_chars=900
        )
        if not history_block:
            return current
        return f"{history_block}\n\n## Current message to classify\n{current}"

    # ── Response parsing ───────────────────────────────────────────────

    def _parse(self, raw: str, message: str = "") -> IntentClassification:
        candidate = _extract_last_json_object(raw or "")
        if candidate is None:
            logger.warning("Intent classifier returned no JSON: %r", raw)
            return self._unknown("Classifier returned an unparseable response.")

        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            # One bad character in a free-text field must not cost the whole
            # turn. The classifier writes `reasoning` as prose, and when it
            # quotes the rules it is reasoning about — («yes», «go ahead») — the
            # quotation marks land unescaped inside a JSON string and the object
            # stops parsing. Everything that actually routes the turn is a
            # closed-vocabulary scalar sitting right next to it, still perfectly
            # readable, and the alternative to reading it is UNKNOWN: the user
            # is told their message was unintelligible when it was understood.
            data = _salvage_fields(candidate)
            if not data:
                logger.warning("Intent classifier returned invalid JSON: %r", candidate)
                return self._unknown("Classifier returned invalid JSON.")
            logger.warning(
                "Intent classifier JSON was malformed; salvaged %s from it",
                sorted(data),
            )

        intent = self._coerce_intent(data.get("intent"))
        confidence = self._coerce_confidence(data.get("confidence"))
        reasoning = data.get("reasoning")
        group = data.get("group")
        agent = data.get("agent")
        response_mode = self._coerce_response_mode(data.get("response_mode"))
        summary_scope = self._coerce_summary_scope(data.get("summary_scope"))
        follow_ups = self._coerce_follow_ups(data.get("follow_ups"), intent)
        resolved_question = self._coerce_resolved_question(
            data.get("resolved_question"), message
        )
        response_language = self._coerce_language(data.get("response_language"))
        about_assistant = self._coerce_about_assistant(data.get("about_assistant"), intent)
        email_template = self._coerce_email_template(data.get("email_template"), intent)
        email_edit = self._coerce_email_edit(data.get("email_edit"), intent)
        email_changes = self._coerce_email_changes(data.get("email_changes"), intent)
        pushback_anticipate = self._coerce_pushback_anticipate(
            data.get("pushback_anticipate"), intent
        )

        return IntentClassification(
            intent=intent,
            confidence=confidence,
            low_confidence=bool(data.get("low_confidence", confidence < 0.60)),
            group=str(group) if group is not None else None,
            agent=str(agent) if agent is not None else None,
            reasoning=str(reasoning) if reasoning is not None else None,
            response_mode=response_mode,
            summary_scope=summary_scope,
            summary_tier=self._coerce_summary_tier(data.get("summary_tier")),
            follow_ups=follow_ups,
            resolved_question=resolved_question,
            response_language=response_language,
            email_template=email_template,
            email_edit=email_edit,
            email_changes=email_changes,
            pushback_anticipate=pushback_anticipate,
            about_assistant=about_assistant,
        )

    @staticmethod
    def _unknown(reasoning: str) -> IntentClassification:
        return IntentClassification(
            intent=Intent.UNKNOWN,
            confidence=0.0,
            low_confidence=True,
            reasoning=reasoning,
        )

    @staticmethod
    def _coerce_intent(value: object) -> Intent:
        try:
            return Intent(str(value).strip().lower())
        except ValueError:
            return Intent.UNKNOWN

    @staticmethod
    def _coerce_confidence(value: object) -> float:
        try:
            return max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _coerce_resolved_question(value: object, message: str = "") -> str | None:
        """The standalone rewrite, or None when there is nothing useful in it.

        Dropped in three cases, each of which would otherwise put words in the
        negotiator's mouth or waste prompt space:

        * not a string / empty — the field was absent or the model fumbled it;
        * longer than 500 characters — this rewrites ONE chat message, so a long
          one means the model started restating the conversation instead of
          resolving a pronoun, and that text is rendered downstream as the
          negotiator's intent;
        * the same as what the negotiator actually typed — the common case, and
          showing a message its own "resolved reading" is noise at best.
        """
        if not isinstance(value, str):
            return None
        resolved = value.strip()
        if not resolved or len(resolved) > 500:
            return None
        if resolved.casefold().rstrip(" .?!") == (message or "").strip().casefold().rstrip(" .?!"):
            return None
        return resolved

    @staticmethod
    def _coerce_language(value: object) -> str | None:
        """A language NAME, or None for the English default.

        Kept deliberately narrow — letters, spaces and hyphens, at most 30
        characters. This string is interpolated into an instruction telling the
        model what language to write in, so it is the one field of the
        classifier's JSON that most resembles an injection point; a language
        name never needs punctuation, and anything that does is not one.
        """
        if not isinstance(value, str):
            return None
        language = value.strip()
        if not language or len(language) > 30:
            return None
        if not all(char.isalpha() or char in " -" for char in language):
            return None
        if language.casefold() in {"english", "en", "none", "null", "default"}:
            return None
        return language

    @staticmethod
    def _coerce_about_assistant(value: object, intent: Intent) -> bool:
        """Whether a data question is about the assistant/Calculum, not the supplier.

        False on every other intent: a stray True would send a real supplier
        lookup down the introduction path.
        """
        if intent is not Intent.ANSWER_DATA_QUESTION:
            return False
        if isinstance(value, bool):
            return value
        return isinstance(value, str) and value.strip().lower() == "true"

    @staticmethod
    def _coerce_email_template(value: object, intent: Intent) -> str | None:
        """The approved email format named this turn; None when none was.

        Dropped off DRAFT_EMAIL, and an unrecognised name is None rather than a
        guess — None already means "keep the format of the email being edited".
        """
        if intent is not Intent.DRAFT_EMAIL or not isinstance(value, str):
            return None
        try:
            return EmailTemplate(value.strip().lower()).value
        except ValueError:
            return None

    @staticmethod
    def _coerce_email_edit(value: object, intent: Intent) -> bool:
        """Whether a DRAFT_EMAIL turn edits the previously drafted email."""
        if intent is not Intent.DRAFT_EMAIL:
            return False
        if isinstance(value, bool):
            return value
        return isinstance(value, str) and value.strip().lower() == "true"

    @staticmethod
    def _coerce_email_changes(value: object, intent: Intent) -> bool:
        """Whether a DRAFT_EMAIL turn asks for more than the approved email.

        Missing or unreadable is True: that sends the turn through the model,
        which can still apply a change — the unchanged template cannot.
        """
        if intent is not Intent.DRAFT_EMAIL:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, str) and value.strip().lower() in {"true", "false"}:
            return value.strip().lower() == "true"
        return True

    @staticmethod
    def _coerce_pushback_anticipate(value: object, intent: Intent) -> bool:
        """Whether a HANDLE_SUPPLIER_PUSHBACK turn prepares for objections not yet raised."""
        if intent is not Intent.HANDLE_SUPPLIER_PUSHBACK:
            return False
        if isinstance(value, bool):
            return value
        return isinstance(value, str) and value.strip().lower() == "true"

    @staticmethod
    def _coerce_response_mode(value: object) -> str:
        if isinstance(value, str) and value.strip().lower() in {"quick", "conversational", "full"}:
            return value.strip().lower()
        return "full"

    @staticmethod
    def _coerce_summary_tier(value: object) -> str:
        """``small`` only when the model said so; anything else — absent,
        invalid, or the retired ``medium`` — is the full ``large`` summary."""
        if isinstance(value, str) and value.strip().lower() == "small":
            return "small"
        return "large"

    @staticmethod
    def _coerce_summary_scope(value: object) -> str:
        """``narrow`` only when the model said so; anything else is the template."""
        if isinstance(value, str) and value.strip().lower() == "narrow":
            return "narrow"
        return "summary"

    def _coerce_follow_ups(self, value: object, intent: Intent) -> list[str] | None:
        if not isinstance(value, list):
            return None
        follow_ups = [str(item).strip() for item in value if isinstance(item, str) and item.strip()]
        # Require exactly 4 follow-ups; fall back to defaults if parsing fails
        if len(follow_ups) >= 4:
            # Deterministic backstop: never surface a tone suggestion (tone is a UI button).
            return strip_tone_follow_ups(follow_ups[:4], intent.value)
        logger.debug("Intent classifier: follow-ups incomplete (%d items), using fallback", len(follow_ups))
        return get_fallback_follow_ups(intent.value)
