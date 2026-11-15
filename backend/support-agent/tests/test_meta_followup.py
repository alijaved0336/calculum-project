import pytest

from application.agent.meta_followup import is_meta_followup


@pytest.mark.parametrize(
    "text",
    [
        "Please summarize the above message.",
        "Remove a specific part from the above message.",
        "Rewrite the previous message.",
        "shorten that",
        "rewrite it",
        "translate the above to Spanish",
        "make it shorter",
        "can you rephrase your last response?",
        "summarize the previous answer",
        "tl;dr of the above",
    ],
)
def test_detects_conversational_meta_requests(text):
    assert is_meta_followup(text) is True


@pytest.mark.parametrize(
    "text",
    [
        "how do I set up SSO?",
        "summarize the onboarding video",          # transform verb but about KB content, not prior turn
        "what is that feature",                     # 'that' but no transform verb
        "how do I set it up",                       # 'it' but no transform verb
        "what are the billing tiers?",
        "rewrite the SSO configuration file on my server so it uses port 8443 instead",  # long, about a file
        "",
    ],
)
def test_ignores_real_kb_questions(text):
    assert is_meta_followup(text) is False
