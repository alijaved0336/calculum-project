import uuid

import pytest

pytestmark = pytest.mark.integration


async def test_chat_store_round_trip(chat_store):
    user = uuid.uuid4()

    # create thread
    thread = await chat_store.create_thread(user, title="How do I set up SSO?")
    tid = thread["thread_id"]
    assert thread["title"] == "How do I set up SSO?"

    # save a user + an assistant message (assistant carries JSONB metadata)
    await chat_store.save_message(tid, "user", "How do I set up SSO?")
    meta = {"video_clips": [{"video_id": "v1"}], "document_sources": [], "resolved": True}
    await chat_store.save_message(tid, "assistant", "Go to Settings > SSO.", metadata=meta)

    # get_recent_messages returns oldest-first, capped
    recent = await chat_store.get_recent_messages(tid, limit=1)
    assert len(recent) == 1 and recent[0]["role"] == "assistant"
    recent2 = await chat_store.get_recent_messages(tid, limit=10)
    assert [m["role"] for m in recent2] == ["user", "assistant"]  # oldest-first

    # full history, chronological, metadata JSONB round-trips as a dict
    msgs = await chat_store.get_messages(tid)
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert msgs[1]["metadata"]["resolved"] is True
    assert msgs[1]["metadata"]["video_clips"][0]["video_id"] == "v1"

    # list_threads: this user's thread, message_count == 2, reflects recency bump
    threads, total = await chat_store.list_threads(user, page=1, page_size=10)
    assert total == 1 and threads[0]["thread_id"] == tid
    assert threads[0]["message_count"] == 2
    assert threads[0]["updated_at"] >= thread["updated_at"]  # bumped on save

    # a different user sees nothing
    _, other_total = await chat_store.list_threads(uuid.uuid4(), page=1, page_size=10)
    assert other_total == 0

    # rename
    assert await chat_store.rename_thread(tid, "SSO setup") is True
    assert (await chat_store.get_thread(tid))["title"] == "SSO setup"

    # delete cascades to messages
    assert await chat_store.delete_thread(tid) is True
    assert await chat_store.get_thread(tid) is None
    assert await chat_store.get_messages(tid) == []


async def test_delete_missing_thread_returns_false(chat_store):
    assert await chat_store.delete_thread(uuid.uuid4()) is False
