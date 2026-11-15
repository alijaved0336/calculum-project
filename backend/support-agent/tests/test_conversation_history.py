from utils.conversation_history import format_conversation_history


def test_empty_history_returns_empty_string():
    assert format_conversation_history([]) == ""
    assert format_conversation_history(None) == ""


def test_renders_labeled_block_with_recent_turns():
    history = [
        {"role": "user", "content": "How do I enable SSO?"},
        {"role": "assistant", "content": "Go to Settings > SSO."},
    ]
    out = format_conversation_history(history)
    assert "RECENT CONVERSATION" in out
    assert "USER: How do I enable SSO?" in out
    assert "ASSISTANT: Go to Settings > SSO." in out


def test_keeps_only_last_n_turns():
    history = [{"role": "user", "content": f"q{i}"} for i in range(10)]
    out = format_conversation_history(history, max_turns=3)
    assert "q9" in out and "q8" in out and "q7" in out
    assert "q6" not in out


def test_truncates_long_turns():
    out = format_conversation_history(
        [{"role": "user", "content": "x" * 1000}], max_chars_per_turn=50
    )
    assert "x" * 50 in out
    assert "x" * 51 not in out
