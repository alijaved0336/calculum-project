from __future__ import annotations

import dataclasses
import logging
import re
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.entities.intent import Intent, IntentClassification
from domain.ports.intent_classifier_port import IntentClassifierPort
from utils.prompts.draft_email_prompt import is_email
from utils.prompts.pushback_prompt import is_pushback_prep_answer

logger = logging.getLogger(__name__)

# A message opening like this asks ABOUT the last output ("was that email in
# English?") rather than asking for it to change.
_QUESTION_START = re.compile(
    r"^\s*(was|were|is|are|did|does|do|has|have|had|why|what|which|who|where|when|how (many|much|long))\b",
    re.IGNORECASE,
)


# "Prepare potential pushbacks" and its paraphrases: a pushback/objection noun
# with a cue that the objections have not been raised yet.
# Typos included ("pusbacks", "pushbaks"): the negotiator types fast.
_PUSHBACK_NOUN = re.compile(
    r"\b(pu(?:s|sh|hs)[\s-]?ba(?:ck|k)s?|objections?)\b", re.IGNORECASE
)
_ANTICIPATE_CUE = re.compile(
    r"\b(prepare|prep|ready|anticipate[sd]?|expect(ed)?|likely|potential|possible|"
    r"probable|might|could|may|foresee|upcoming|common|typical|"
    r"other|others|more|else|additional|all|whole|every|scan)\b",
    re.IGNORECASE,
)
# Something the supplier actually did — a relayed objection, not a prepared one.
_RELAYED = re.compile(
    r"\b(said|says|saying|told|tells|claims?|claimed|argued|raised|rejected|refused|"
    r"refuses|replied|responded|came back|pushed back|pushing back|objected)\b",
    re.IGNORECASE,
)
# The whole document named outright stays the playbook.
_PLAYBOOK_NAMED = re.compile(r"\b(play\s?book|battle\s?card|negotiation plan)\b", re.IGNORECASE)

# The intents an anticipatory pushback ask was observed to land on instead:
# the playbook (it carries an objections section) and its briefing neighbours.
_ANTICIPATE_MISROUTES = frozenset({
    Intent.GENERATE_NEGOTIATION_PLAYBOOK,
    Intent.SUMMARIZE_SUPPLIER_POSITION,
    Intent.RECOMMEND_OPENING_STRATEGY,
    Intent.HANDLE_SUPPLIER_PUSHBACK,
})


def is_anticipated_pushback_request(message: str) -> bool:
    """Whether the message asks to prepare for objections the supplier has not raised."""
    text = message or ""
    return (
        bool(_PUSHBACK_NOUN.search(text))
        and bool(_ANTICIPATE_CUE.search(text))
        and not _RELAYED.search(text)
        and not _PLAYBOOK_NAMED.search(text)
    )


def _route_anticipated_pushback(
    result: IntentClassification, message: str
) -> IntentClassification:
    """Send "prepare potential pushbacks" to the pushback node, in anticipate mode.

    The classifier filed this — the product's own follow-up chip — under the
    playbook, because the playbook is the only intent that mentions objection
    handling and the pushback intent used to require a relayed objection. The
    negotiator asked for one section and got the whole document. Upgrading is
    one-way: a turn the classifier already put on pushback in anticipate mode is
    left alone, and nothing outside the neighbouring intents is touched.
    """
    if result.intent not in _ANTICIPATE_MISROUTES or not is_anticipated_pushback_request(message):
        return result
    if result.intent is Intent.HANDLE_SUPPLIER_PUSHBACK and result.pushback_anticipate:
        return result
    return dataclasses.replace(
        result, intent=Intent.HANDLE_SUPPLIER_PUSHBACK, pushback_anticipate=True
    )


# The SUPPLIER, as the subject of something it said or did: "our supplier says",
# "they claim", "their CFO told us", "the vendor keeps pushing back". The
# subject has to sit right before the verb, so "what does the supplier standard
# say?" (the subject is a benchmark) and "why do you say 75?" do not match.
_SUPPLIER_SAID = re.compile(
    r"\b(?:supplier|vendor|counterpart|counterparty|they|their\s+\w+)\s+"
    r"(?:(?:has|have|had|just|keeps?|kept|is|are|was|were|also|now|still|even)\s+)*"
    r"(?:says?|said|saying|claims?|claimed|claiming|told|tells|argues?|argued|arguing|"
    r"insists?|insisted|insisting|states?|stated|maintains?|maintained|"
    r"pushed back|pushing back|push back|refused|refuses|rejected|rejects|"
    r"objected|objects|replied|responded|came back)\b",
    re.IGNORECASE,
)
# The negotiator asking what THEY may say — explain_recommendation's
# disclosure-permission questions, which are not a reply to the supplier.
_DISCLOSURE_QUESTION = re.compile(
    r"\b(?:can|could|may|should)\s+(?:i|we)\s+(?:tell|say|claim|mention|reference|cite|reveal|share)\b"
    r"|\b(?:is it|would it be)\s+(?:safe|ok|okay|fine|wise)\s+to\b"
    r"|\bam i allowed to\b",
    re.IGNORECASE,
)


def relays_supplier_objection(message: str) -> bool:
    """Whether the message reports something the supplier said or did."""
    text = message or ""
    return bool(_SUPPLIER_SAID.search(text)) and not _DISCLOSURE_QUESTION.search(text)


def _route_relayed_objection(
    result: IntentClassification, message: str
) -> IntentClassification:
    """Send a relayed supplier objection to the pushback node.

    "Our supplier says they dominate the market and we need them more than they
    need us. What counter-arguments can I use?" was filed under
    explain_recommendation: "what arguments can I use" matches its
    recommending-arguments rule. That surface ranks the case for the target
    rather than answering the objection, and it quoted internal figures (the
    spend) as things to "remind them" of. Once the supplier has actually said
    something and the negotiator wants a reply, it is pushback — the rule the
    classifier prompt already states under DISCLOSURE PERMISSION.
    """
    if result.intent is not Intent.EXPLAIN_RECOMMENDATION or not relays_supplier_objection(message):
        return result
    return dataclasses.replace(
        result, intent=Intent.HANDLE_SUPPLIER_PUSHBACK, pushback_anticipate=False
    )


# A follow-up that RESHAPES the pushback answer already on screen — the one kind
# meta_operation is right for.
_RESHAPE = re.compile(
    r"\b(shorter|shorten|longer|condense|bullets?|table|format|translate|rephrase|"
    r"reword|tl;?dr)\b|^\s*(was|were)\b",
    re.IGNORECASE,
)


def _continue_pushback_prep(
    result: IntentClassification, message: str, history: list[dict[str, str]] | None
) -> IntentClassification:
    """Keep a pushback-preparation conversation on the pushback node.

    After a list of potential pushbacks, "didn't you find any others?" or
    "bro i am asking just answer that" reads to the classifier as a complaint
    about the last answer, so it went to meta_operation — which can only rework
    the transcript, and so sent the same list back again. Anything but a reshape
    of that answer goes back to the node that holds the supplier's data.
    """
    if result.intent is not Intent.META_OPERATION or _RESHAPE.search(message or ""):
        return result
    # The last TWO replies: a "no, that's the complete set" answer carries no
    # objection headings, and the insisting message after it still belongs here.
    replies = [turn for turn in reversed(history or []) if turn.get("role") != "user"][:2]
    if not any(is_pushback_prep_answer(turn.get("content")) for turn in replies):
        return result
    return dataclasses.replace(
        result, intent=Intent.HANDLE_SUPPLIER_PUSHBACK, pushback_anticipate=True
    )


def _continue_email_edit(
    result: IntentClassification, message: str, history: list[dict[str, str]] | None
) -> IntentClassification:
    """Keep an email conversation on the email.

    Right after a drafted email, "not good, try again" or "redo it" is a request
    to change that email. The classifier sometimes files it under
    meta_operation, which rewrites text with none of the email's rules — so a
    meta_operation turn whose last assistant reply was an email, and which is
    not a question about it, is an email edit.
    """
    if result.intent is not Intent.META_OPERATION or _QUESTION_START.match(message):
        return result
    last_reply = next((turn for turn in reversed(history or []) if turn.get("role") != "user"), None)
    if last_reply is None or not is_email(last_reply.get("content")):
        return result
    return dataclasses.replace(result, intent=Intent.DRAFT_EMAIL, email_edit=True, email_changes=True, email_template=None
    )


def _print_intent(
    message: str, result: IntentClassification, history: list[dict[str, str]] | None
) -> None:
    """The console block per turn: what was detected and where the turn goes.

    For a summarize turn it names the summary type the node will render
    (small / large), or ``narrow`` when one topic is answered instead.
    """
    lines = [
        f"[intent] message            : {message!r}",
        f"[intent] intent             : {result.intent.value}",
        f"[intent] confidence         : {result.confidence:.2f} (low_confidence={result.low_confidence})",
        f"[intent] response_mode      : {result.response_mode}",
        f"[intent] reasoning          : {result.reasoning}",
        f"[intent] resolved_question  : {result.resolved_question}",
        f"[intent] response_language  : {result.response_language}",
        f"[intent] history_messages   : {len(history or [])}",
    ]
    if result.intent is Intent.SUMMARIZE_SUPPLIER_POSITION:
        summary_type = result.summary_tier if result.summary_scope == "summary" else "narrow (tier ignored)"
        lines += [
            f"[intent] summary_scope      : {result.summary_scope}",
            f"[intent] summary_tier       : {result.summary_tier}",
            f"[intent] SUMMARY TYPE       : {summary_type.upper()}",
        ]
    if result.intent is Intent.HANDLE_SUPPLIER_PUSHBACK:
        lines.append(f"[intent] pushback_anticipate: {result.pushback_anticipate}")
    if result.intent is Intent.DRAFT_EMAIL:
        lines.append(
            f"[intent] email              : template={result.email_template} "
            f"edit={result.email_edit} changes={result.email_changes}"
        )
    if result.about_assistant:
        lines.append("[intent] about_assistant    : True")
    lines.append(f"[intent] follow_ups         : {result.follow_ups}")
    print("\n".join(lines), flush=True)


def make_intent_classifier_node(classifier: IntentClassifierPort) -> NodeFn:
    """Build the intent-classifier graph node.

    The node is the first step in the graph: it reads the user's ``message``
    (and any available supplier ``context``), classifies it via the injected
    :class:`IntentClassifierPort`, and writes the result back into the state.

    A factory is used so the node depends only on the port abstraction while the
    concrete classifier is supplied at wiring time.
    """

    async def intent_classifier_node(
        state: NegotiationState,
    ) -> dict[str, Any]:
        message = state.get("message", "")
        context = state.get("context")

        if not message:
            logger.warning("intent_classifier: empty message in state")
            return {
                "intent": Intent.UNKNOWN,
                "intent_confidence": 0.0,
                "intent_low_confidence": True,
                "intent_group": None,
                "intent_agent": None,
                "intent_reasoning": "No message provided.",
                "email_template": None,
                "email_edit": False,
                "email_changes": False,
                "pushback_anticipate": False,
                "about_assistant": False,
            }

        try:
            result = await classifier.classify(message, context=context, history=state.get("conversation_history"))
        except Exception as exc:
            logger.exception("intent_classifier: classification failed")
            return {
                "intent": Intent.UNKNOWN,
                "intent_confidence": 0.0,
                "intent_low_confidence": True,
                "intent_group": None,
                "intent_agent": None,
                "intent_reasoning": "Classification failed.",
                "email_template": None,
                "email_edit": False,
                "email_changes": False,
                "pushback_anticipate": False,
                "about_assistant": False,
                "errors": [f"intent_classifier: {exc}"],
            }

        result = _continue_email_edit(result, message, state.get("conversation_history"))
        result = _continue_pushback_prep(result, message, state.get("conversation_history"))
        result = _route_anticipated_pushback(result, message)
        result = _route_relayed_objection(result, message)

        _print_intent(message, result, state.get("conversation_history"))
        return {
            "intent": result.intent,
            "intent_confidence": result.confidence,
            "intent_low_confidence": result.low_confidence,
            "intent_group": result.group,
            "intent_agent": result.agent,
            "intent_reasoning": result.reasoning,
            "response_mode": result.response_mode,
            "summary_scope": result.summary_scope,
            "summary_tier": result.summary_tier,
            "follow_ups": result.follow_ups,
            "resolved_question": result.resolved_question,
            "response_language": result.response_language,
            "email_template": result.email_template,
            "email_edit": result.email_edit,
            "email_changes": result.email_changes,
            "pushback_anticipate": result.pushback_anticipate,
            # Written every turn so a "who are you?" never leaks into the next
            # data question and answers it about the assistant.
            "about_assistant": result.about_assistant,
        }

    return intent_classifier_node
