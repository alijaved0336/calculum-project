from fastapi.testclient import TestClient

import api.routes.threads as threads_mod
from api.deps.auth import current_user
from api.main import app
from domain.entities.user import User


class _FakeChatStore:
    def __init__(self):
        self.threads = {
            "t1": {"thread_id": "t1", "user_uuid": "u1", "title": "SSO", "message_count": 2,
                   "created_at": "2026-01-01T00:00:00", "updated_at": "2026-01-02T00:00:00"},
            "t2": {"thread_id": "t2", "user_uuid": "someone-else", "title": "theirs"},
        }
        self.messages = {"t1": [
            {"message_id": "m1", "thread_id": "t1", "role": "user", "content": "how?",
             "metadata": {}, "created_at": "2026-01-01T00:00:00"},
            {"message_id": "m2", "thread_id": "t1", "role": "assistant", "content": "like this",
             "metadata": {"resolved": True}, "created_at": "2026-01-01T00:00:01"},
        ]}
        self.deleted = []
        self.renamed = []
        self.created = []

    async def create_thread(self, user_uuid, title):
        tid = f"new{len(self.created) + 1}"
        self.created.append({"user_uuid": user_uuid, "title": title})
        row = {"thread_id": tid, "user_uuid": user_uuid, "title": title,
               "created_at": "2026-02-01T00:00:00", "updated_at": "2026-02-01T00:00:00"}
        self.threads[tid] = row
        return row

    async def list_threads(self, user_uuid, page, page_size):
        mine = [t for t in self.threads.values() if t["user_uuid"] == user_uuid]
        return mine, len(mine)

    async def get_thread(self, thread_id):
        return self.threads.get(thread_id)

    async def get_messages(self, thread_id, limit=200):
        return self.messages.get(thread_id, [])

    async def rename_thread(self, thread_id, title):
        self.renamed.append((thread_id, title))
        self.threads[thread_id]["title"] = title
        return True

    async def delete_thread(self, thread_id):
        self.deleted.append(thread_id)
        return True


class _FakeDocStore:
    """Current DB visibility for cited docs (source of truth for citation gating)."""
    def __init__(self, flags=None):
        self.flags = flags or {}

    async def public_flags(self, ids):
        return {i: self.flags[i] for i in ids if i in self.flags}


def _install(monkeypatch, user_id="u1", role=None, doc_flags=None):
    store = _FakeChatStore()
    monkeypatch.setattr(threads_mod, "get_chat_store", lambda: store)
    monkeypatch.setattr(threads_mod, "get_document_store", lambda: _FakeDocStore(doc_flags))
    app.dependency_overrides[current_user] = lambda: User(id=user_id, email="x@y.com", role=role)
    return store


class _Signer:
    def sign(self, gcs_object):
        return f"https://fresh/{gcs_object}"


def _append_gated_turn(store):
    """A persisted assistant turn carrying a private-doc citation + a titled clip — the
    two things replay must gate on role (private doc hidden, inline refs stripped) for non-admins."""
    store.messages["t1"].append({
        "message_id": "m3", "thread_id": "t1", "role": "assistant",
        "content": (
            "According to Public Guide, p. 1, do this. "
            "According to Private Runbook, p. 2, secret. "
            "According to Was Public, p. 3, old."
        ),
        "metadata": {
            "video_clips": [{"video_id": "v1", "title": "Secret Onboarding", "start_ms": 1000,
                             "end_ms": 3000, "gcs_object": "videos/v1.mp4"}],
            "document_sources": [
                {"document_id": "dpub", "title": "Public Guide", "page_numbers": [1], "is_public": True},
                {"document_id": "dpriv", "title": "Private Runbook", "page_numbers": [2], "is_public": False},
                # snapshot says public, but the doc has since been made private (DB says False)
                {"document_id": "dstale", "title": "Was Public", "page_numbers": [3], "is_public": True},
            ],
        },
        "created_at": "2026-01-01T00:00:02",
    })


def teardown_function():
    app.dependency_overrides.clear()


def test_create_thread_with_title(monkeypatch):
    store = _install(monkeypatch)
    r = TestClient(app).post("/support/threads", json={"title": "Billing help"})
    assert r.status_code == 201
    body = r.json()
    assert body["thread_id"] and body["title"] == "Billing help"
    assert body["message_count"] == 0
    assert store.created == [{"user_uuid": "u1", "title": "Billing help"}]


def test_create_thread_defaults_title(monkeypatch):
    store = _install(monkeypatch)
    r = TestClient(app).post("/support/threads", json={})
    assert r.status_code == 201
    assert r.json()["title"] == "New chat"
    assert store.created[0]["title"] == "New chat"


def test_create_thread_requires_auth(monkeypatch):
    monkeypatch.setattr(threads_mod, "get_chat_store", lambda: _FakeChatStore())
    r = TestClient(app).post("/support/threads", json={"title": "x"})
    assert r.status_code == 401


def test_list_threads_returns_only_mine(monkeypatch):
    _install(monkeypatch)
    r = TestClient(app).get("/support/threads")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["thread_id"] == "t1"
    assert body["items"][0]["message_count"] == 2


def test_get_messages_returns_turns(monkeypatch):
    _install(monkeypatch)
    r = TestClient(app).get("/support/threads/t1/messages")
    assert r.status_code == 200
    body = r.json()
    assert [m["role"] for m in body["messages"]] == ["user", "assistant"]
    assert body["messages"][1]["metadata"]["resolved"] is True


def test_get_messages_foreign_thread_is_404(monkeypatch):
    _install(monkeypatch)  # user u1 asking for t2 (owned by someone-else)
    r = TestClient(app).get("/support/threads/t2/messages")
    assert r.status_code == 404


def test_get_messages_resigns_stored_clip_records(monkeypatch):
    store = _install(monkeypatch)
    # a persisted assistant turn carries a DURABLE clip record (gcs_object, no url)
    store.messages["t1"].append({
        "message_id": "m3", "thread_id": "t1", "role": "assistant", "content": "watch this",
        "metadata": {"video_clips": [{"video_id": "v1", "title": "T", "start_ms": 1000,
                                       "end_ms": 3000, "gcs_object": "videos/v1.mp4"}]},
        "created_at": "2026-01-01T00:00:02",
    })

    class _Signer:
        def sign(self, gcs_object):
            return f"https://fresh/{gcs_object}"

    monkeypatch.setattr(threads_mod, "get_signed_url", lambda: _Signer())

    r = TestClient(app).get("/support/threads/t1/messages")
    assert r.status_code == 200
    clip = r.json()["messages"][-1]["metadata"]["video_clips"][0]
    assert clip["video_url"] == "https://fresh/videos/v1.mp4"   # re-signed on read
    assert "gcs_object" not in clip


def _append_sectioned_turn(store):
    """A persisted assistant turn in the SECTIONED format — replay must re-sign clips and
    gate docs (and strip private inline refs) within EACH section."""
    store.messages["t1"].append({
        "message_id": "m4", "thread_id": "t1", "role": "assistant",
        "content": (
            "According to Public Guide, filters stack. "
            "According to Private Runbook, tones are firm."
        ),
        "metadata": {"sections": [
            {"topic": "filters", "text": "According to Public Guide, filters stack.",
             "video_clips": [{"video_id": "v1", "title": "Filters clip", "start_ms": 0,
                              "end_ms": 2000, "gcs_object": "videos/v1.mp4"}],
             "document_sources": [{"document_id": "dpub", "title": "Public Guide", "is_public": True}]},
            {"topic": "tones", "text": "According to Private Runbook, tones are firm.",
             "video_clips": [{"video_id": "v2", "title": "Tones clip", "start_ms": 0,
                              "end_ms": 4000, "gcs_object": "videos/v2.mp4"}],
             "document_sources": [{"document_id": "dpriv", "title": "Private Runbook", "is_public": False}]},
        ]},
        "created_at": "2026-01-01T00:00:03",
    })


def test_replay_sectioned_resigns_clips_and_gates_docs_per_section(monkeypatch):
    store = _install(monkeypatch, role="user", doc_flags={"dpub": True, "dpriv": False})
    _append_sectioned_turn(store)
    monkeypatch.setattr(threads_mod, "get_signed_url", lambda: _Signer())

    r = TestClient(app).get("/support/threads/t1/messages")
    assert r.status_code == 200
    sections = r.json()["messages"][-1]["metadata"]["sections"]
    # each section's clip is freshly signed; the video name is shown to everyone
    assert sections[0]["video_clips"][0]["video_url"] == "https://fresh/videos/v1.mp4"
    assert sections[1]["video_clips"][0]["video_url"] == "https://fresh/videos/v2.mp4"
    assert [s["video_clips"][0]["title"] for s in sections] == ["Filters clip", "Tones clip"]
    # per-section doc gating: public shown, private withheld
    assert [d["document_id"] for d in sections[0]["document_sources"]] == ["dpub"]
    assert sections[1]["document_sources"] == []
    assert "Public Guide" in sections[0]["text"]
    assert "Private Runbook" not in sections[1]["text"]
    assert "tones are firm" in sections[1]["text"]
    assert "Private Runbook" not in r.json()["messages"][-1]["content"]


_CURRENT = {"dpub": True, "dpriv": False, "dstale": False}  # DB truth: only dpub public now


def test_replay_hides_private_doc_for_non_admin(monkeypatch):
    store = _install(monkeypatch, role="user", doc_flags=_CURRENT)   # ordinary end user
    _append_gated_turn(store)
    monkeypatch.setattr(threads_mod, "get_signed_url", lambda: _Signer())

    r = TestClient(app).get("/support/threads/t1/messages")
    assert r.status_code == 200
    meta = r.json()["messages"][-1]["metadata"]
    # only the currently-public doc is shown; dpriv AND dstale (public in the snapshot but
    # private now) are both withheld — current visibility governs, not the stored flag
    assert [d["document_id"] for d in meta["document_sources"]] == ["dpub"]
    # clip re-signed and the video name is shown to everyone (no longer withheld)
    clip = meta["video_clips"][0]
    assert clip["video_url"] == "https://fresh/videos/v1.mp4"
    assert clip["title"] == "Secret Onboarding"
    body = r.json()["messages"][-1]["content"]
    assert "Public Guide" in body
    assert "Private Runbook" not in body
    assert "Was Public" not in body  # snapshot said public; DB now private
    assert "secret" in body and "old" in body


def test_replay_shows_private_doc_and_clip_title_for_admin(monkeypatch):
    store = _install(monkeypatch, role="global_platform_admin", doc_flags=_CURRENT)
    _append_gated_turn(store)
    monkeypatch.setattr(threads_mod, "get_signed_url", lambda: _Signer())

    r = TestClient(app).get("/support/threads/t1/messages")
    assert r.status_code == 200
    meta = r.json()["messages"][-1]["metadata"]
    assert {d["document_id"] for d in meta["document_sources"]} == {"dpub", "dpriv", "dstale"}
    # flags refreshed to current DB truth even for the admin view
    flags = {d["document_id"]: d["is_public"] for d in meta["document_sources"]}
    assert flags == {"dpub": True, "dpriv": False, "dstale": False}
    assert meta["video_clips"][0]["title"] == "Secret Onboarding"
    body = r.json()["messages"][-1]["content"]
    assert "Private Runbook" in body and "Was Public" in body and "Public Guide" in body


def test_rename_thread(monkeypatch):
    store = _install(monkeypatch)
    r = TestClient(app).patch("/support/threads/t1", json={"title": "SSO setup"})
    assert r.status_code == 200
    assert store.renamed == [("t1", "SSO setup")]
    assert r.json()["title"] == "SSO setup"


def test_delete_thread(monkeypatch):
    store = _install(monkeypatch)
    r = TestClient(app).delete("/support/threads/t1")
    assert r.status_code == 200
    assert r.json() == {"deleted": True, "thread_id": "t1"}
    assert store.deleted == ["t1"]


def test_delete_foreign_thread_is_404(monkeypatch):
    store = _install(monkeypatch)
    r = TestClient(app).delete("/support/threads/t2")
    assert r.status_code == 404
    assert store.deleted == []


def test_threads_require_auth(monkeypatch):
    store = _FakeChatStore()
    monkeypatch.setattr(threads_mod, "get_chat_store", lambda: store)
    # no auth override → missing bearer → 401
    r = TestClient(app).get("/support/threads")
    assert r.status_code == 401
