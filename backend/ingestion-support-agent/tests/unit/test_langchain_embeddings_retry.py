"""The sentence-embed client (used by the semantic chunker) must retry transient
transport errors (e.g. RemoteProtocolError 'Server disconnected') instead of failing
the whole ingestion job."""
import httpx
import pytest

from infrastructure.embedding.qwen_langchain_embeddings import QwenLangchainEmbeddings


class _OkResp:
    status_code = 200

    def raise_for_status(self):
        pass

    def json(self):
        return {"data": [{"index": 0, "embedding": [0.1, 0.2]}]}


def test_retries_transient_disconnect_then_succeeds(monkeypatch):
    monkeypatch.setattr("time.sleep", lambda *a, **k: None)  # no real backoff
    emb = QwenLangchainEmbeddings("http://embed", "key", "model", timeout=1)

    calls = {"n": 0}

    def fake_post(url, json=None, **kw):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.RemoteProtocolError("Server disconnected without sending a response.")
        return _OkResp()

    monkeypatch.setattr(emb._client, "post", fake_post)

    out = emb.embed_documents(["hello world"])
    assert out == [[0.1, 0.2]]
    assert calls["n"] == 2  # retried once, then succeeded


def test_raises_after_exhausting_retries(monkeypatch):
    monkeypatch.setattr("time.sleep", lambda *a, **k: None)
    emb = QwenLangchainEmbeddings("http://embed", "key", "model", timeout=1)
    monkeypatch.setattr(
        emb._client, "post",
        lambda *a, **k: (_ for _ in ()).throw(httpx.RemoteProtocolError("down")),
    )
    with pytest.raises(httpx.TransportError):
        emb.embed_documents(["x"])
