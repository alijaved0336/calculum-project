import asyncio

import pytest

from infrastructure.session.progress_broker import ProgressBroker


@pytest.mark.asyncio
async def test_replays_buffer_then_terminates():
    b = ProgressBroker()
    b.publish("v1", {"status": "processing"})
    b.publish("v1", {"status": "uploading"})
    b.publish("v1", {"status": "uploaded"}, terminal=True)  # all published BEFORE subscribe
    got = [e async for e in b.subscribe("v1")]
    assert [e["status"] for e in got] == ["processing", "uploading", "uploaded"]


@pytest.mark.asyncio
async def test_two_subscribers_both_receive():
    b = ProgressBroker()
    b.publish("v1", {"status": "done"}, terminal=True)
    a = [e async for e in b.subscribe("v1")]
    c = [e async for e in b.subscribe("v1")]
    assert a == c == [{"status": "done"}]


@pytest.mark.asyncio
async def test_live_events_after_subscribe():
    b = ProgressBroker()
    received = []

    async def consume():
        async for e in b.subscribe("v2"):
            received.append(e["status"])

    task = asyncio.create_task(consume())
    await asyncio.sleep(0)  # let the subscriber attach
    b.publish("v2", {"status": "processing"})
    b.publish("v2", {"status": "uploaded"}, terminal=True)
    await asyncio.wait_for(task, timeout=1)
    assert received == ["processing", "uploaded"]


@pytest.mark.asyncio
async def test_unknown_stream_yields_nothing_when_closed():
    b = ProgressBroker()
    b.publish("v3", {"status": "uploaded"}, terminal=True)
    first = [e async for e in b.subscribe("v3")]
    assert first == [{"status": "uploaded"}]
