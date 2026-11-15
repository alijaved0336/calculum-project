import uuid

from application.services.media_deleter import cascade_delete_media


class _FakeVectorStore:
    def __init__(self):
        self.deleted = []

    async def delete_by_file(self, file_uuid):
        self.deleted.append(file_uuid)


def _make(order):
    """Return (vector_store, gcs_delete, delete_row) that append to a shared order list."""
    vs = _FakeVectorStore()

    def gcs_delete(obj):
        order.append(("gcs", obj))
        return True

    async def delete_row(uid):
        order.append(("row", uid))
        return True

    # wrap vector_store.delete_by_file to record order too
    orig = vs.delete_by_file

    async def tracked(file_uuid):
        order.append(("qdrant", file_uuid))
        await orig(file_uuid)

    vs.delete_by_file = tracked
    return vs, gcs_delete, delete_row


async def test_video_cascade_order_and_transcript_included():
    uid = uuid.uuid4()
    doc = {"metadata": {"gcs_object": f"videos/{uid}.mp4",
                        "transcript_gcs_object": f"transcripts/{uid}.vtt"}}
    order = []
    vs, gcs_delete, delete_row = _make(order)

    result = await cascade_delete_media(
        uid, doc, vector_store=vs, gcs_delete=gcs_delete, delete_row=delete_row
    )

    # Qdrant first, then both GCS blobs (video + transcript), then the PG row LAST.
    assert order[0] == ("qdrant", str(uid))
    assert ("gcs", f"videos/{uid}.mp4") in order
    assert ("gcs", f"transcripts/{uid}.vtt") in order
    assert order[-1] == ("row", uid)
    assert set(result["gcs_objects_deleted"]) == {f"videos/{uid}.mp4", f"transcripts/{uid}.vtt"}


async def test_document_cascade_deletes_only_its_file():
    uid = uuid.uuid4()
    doc = {"metadata": {"gcs_object": f"documents/{uid}.pdf"}}
    order = []
    vs, gcs_delete, delete_row = _make(order)

    result = await cascade_delete_media(
        uid, doc, vector_store=vs, gcs_delete=gcs_delete, delete_row=delete_row
    )
    assert result["gcs_objects_deleted"] == [f"documents/{uid}.pdf"]
    assert order[0] == ("qdrant", str(uid)) and order[-1] == ("row", uid)


async def test_no_gcs_object_still_purges_qdrant_and_row():
    uid = uuid.uuid4()
    order = []
    vs, gcs_delete, delete_row = _make(order)

    result = await cascade_delete_media(
        uid, {"metadata": {}}, vector_store=vs, gcs_delete=gcs_delete, delete_row=delete_row
    )
    assert result["gcs_objects_deleted"] == []
    assert order == [("qdrant", str(uid)), ("row", uid)]
