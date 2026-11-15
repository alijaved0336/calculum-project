import pytest

from application.agent.smalltalk import detect_smalltalk, smalltalk_reply


@pytest.mark.parametrize(
    "text,expected",
    [
        ("hi", "greeting"),
        ("Hello!", "greeting"),
        ("hey there", "greeting"),
        ("Good morning", "greeting"),
        ("how are you?", "greeting"),
        ("hey, how's it going", "greeting"),
        ("thanks", "thanks"),
        ("Thank you so much!", "thanks"),
        ("ty", "thanks"),
        ("bye", "goodbye"),
        ("goodbye", "goodbye"),
        ("see you later", "goodbye"),
        # Real product questions must NOT be treated as small talk:
        ("how do I reset my password?", None),
        ("can I do this later?", None),
        ("hello, how do I configure SSO for my team?", None),  # long → real question
        ("what are the billing tiers", None),
        ("", None),
    ],
)
def test_detect_smalltalk(text, expected):
    assert detect_smalltalk(text) == expected


def test_replies_are_friendly_and_nonempty():
    for category in ("greeting", "thanks", "goodbye"):
        reply = smalltalk_reply(category)
        assert isinstance(reply, str) and reply.strip()
    # greeting reply nudges the user toward asking a product question
    assert "ask" in smalltalk_reply("greeting").lower()
