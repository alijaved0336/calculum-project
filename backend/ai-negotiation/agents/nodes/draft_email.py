from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.entities.intent import EmailTemplate
from domain.ports.llm_port import LLMPort
from utils.prompts.draft_email_prompt import (
    build_draft_email_prompt,
    draft_email_system_prompt,
    find_current_email,
    is_unchanged,
    template_values,
)
from utils.prompts.email_templates import fill_email_template

logger = logging.getLogger(__name__)


def make_draft_email_node(llm: LLMPort) -> NodeFn:
    """Build the `draft_email` node.

    Writes a new supplier email from the approved template the classifier named,
    or edits the latest email in the conversation (`email_edit`). The email being
    edited is found in code and handed to the prompt on its own; an edit that
    comes back unchanged is retried once.

    Not streamed: a retry would otherwise reach the client as a second email
    appended to the first. The API fake-streams the final draft instead.
    """

    async def draft_email_node(state: NegotiationState) -> dict[str, Any]:
        brief = state.get("brief")
        context = state.get("context")
        # The brief's facts carry this session's target/BATNA overrides.
        facts = brief.facts if brief is not None else getattr(context, "facts", None)
        if facts is None:
            return {
                "response": "I don't have supplier data loaded for this session yet, so I can't draft the email.",
                "errors": ["draft_email: missing supplier facts"],
            }

        history = state.get("conversation_history")
        # An edit with nothing to edit is a new email.
        current_email = find_current_email(history) if state.get("email_edit") else None
        template_value = state.get("email_template")

        # A new email with nothing asked on top IS the approved template. The
        # model, given one, pads it ("the longer version" read as "longer").
        if current_email is None and not state.get("email_changes") and not state.get("response_language"):
            template = EmailTemplate(template_value) if template_value else EmailTemplate.DEFAULT_PAYMENT_TERMS_STANDARDIZATION
            return {"response": fill_email_template(template, template_values(facts))}

        def prompt(retry_unchanged: bool) -> str:
            return build_draft_email_prompt(
                message=state.get("message", ""),
                facts=facts,
                template=EmailTemplate(template_value) if template_value else None,
                current_email=current_email,
                scf_offerable=brief.scf_offerable if brief is not None else bool(state.get("scf_enabled")),
                history=history,
                resolved_question=state.get("resolved_question"),
                response_language=state.get("response_language"),
                retry_unchanged=retry_unchanged,
                brief=brief,
            )

        async def generate(retry_unchanged: bool) -> str:
            text = await llm.complete(
                prompt(retry_unchanged),
                system=draft_email_system_prompt,
                temperature=0.4 if retry_unchanged else 0.3,
                stream_to_client=False,
            )
            return (text or "").strip()

        try:
            draft = await generate(retry_unchanged=False)
            if current_email is not None and is_unchanged(draft, current_email):
                logger.warning("draft_email: edit returned the email unchanged — retrying once")
                draft = await generate(retry_unchanged=True)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("draft_email: drafting failed")
            return {"response": None, "errors": [f"draft_email: {exc}"]}

        if not draft:
            return {"response": None, "errors": ["draft_email: empty draft"]}
        return {"response": draft}

    return draft_email_node
