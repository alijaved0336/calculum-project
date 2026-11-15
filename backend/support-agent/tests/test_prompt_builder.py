from domain.entities.rag_context import RAGContext
from utils.prompts.sectioned_answer_prompt import SECTIONED_SYSTEM_PROMPT
from utils.prompts.support_answer_prompt import SYSTEM_PROMPT, build_answer_prompt


def test_prompt_has_grounding_rules_and_embeds_context():
    ctx = RAGContext(
        context_text="### [1] video Auth — [00:01–00:03]\nGo to Settings > SSO",
        source_ids=["c1"],
        chunk_count=1,
        query="how?",
    )
    system, user = build_answer_prompt("How do I set up SSO?", ctx)

    assert "only" in system.lower()
    assert "[MM:SS–MM:SS]" in system
    assert "cannot answer" in system.lower()
    assert "document" in system.lower() and "title" in system.lower()  # doc attribution instruction
    assert "Go to Settings > SSO" in user
    assert "How do I set up SSO?" in user


def test_prompt_includes_conversation_history_when_provided():
    ctx = RAGContext(
        context_text="### [1] video Auth — [00:01–00:03]\nSSO steps",
        source_ids=["c1"], chunk_count=1, query="q",
    )
    _, user = build_answer_prompt(
        "and after that?", ctx,
        conversation_history="## RECENT CONVERSATION\n\nUSER: how do I enable SSO?",
    )
    assert "RECENT CONVERSATION" in user
    assert "how do I enable SSO?" in user
    assert "and after that?" in user


def test_prompt_omits_history_when_empty():
    ctx = RAGContext(context_text="ctx", source_ids=[], chunk_count=1, query="q")
    _, user = build_answer_prompt("Q", ctx)
    assert "RECENT CONVERSATION" not in user


def test_system_prompt_forbids_invented_citation_shapes():
    # Guards against the production bug: the model inventing "<vid: ...>"/"<doc: ...>" tags or
    # placeholder dashes ("[—]") instead of the one true "[MM:SS–MM:SS]" citation shape.
    for prompt in (SYSTEM_PROMPT, SECTIONED_SYSTEM_PROMPT):
        assert "<vid:" in prompt
        assert "<doc:" in prompt
        assert "placeholder" in prompt.lower()
        assert "no citation" in prompt.lower() or "NO citation" in prompt
