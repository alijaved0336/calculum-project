from utils.prompts.meta_prompt import build_meta_prompt


def test_meta_prompt_operates_on_conversation_only():
    history = "## RECENT CONVERSATION\n\nUSER: how do I set up SSO?\nASSISTANT: Go to Settings > SSO and…"
    system, user = build_meta_prompt("summarize your previous message", history)
    # system frames it as operating on the prior conversation, not the KB
    low = system.lower()
    assert "conversation" in low and ("previous" in low or "prior" in low)
    # user embeds the full history + the request
    assert "Go to Settings > SSO" in user
    assert "summarize your previous message" in user
