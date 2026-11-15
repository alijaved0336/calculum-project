from __future__ import annotations
import shutil
from pathlib import Path

from domain.ports.storage import StoragePort


class LocalStorage(StoragePort):
    """Filesystem-backed storage; persists documents under *base_dir*."""

    def __init__(self, base_dir: str) -> None:
        self._base = Path(base_dir)

    def upload(self, key: str, data: bytes, content_type: str | None = None) -> None:
        # content_type is intentionally dropped: the filesystem stores no object
        # metadata, so type is re-derived from the key's suffix on read (cf. GCS).
        path = self._base / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def download(self, key: str) -> bytes:
        return (self._base / key).read_bytes()

    def delete(self, file_id: str) -> int:
        count = 0
        for path in self._base.glob(file_id):
            if path.is_file():
                path.unlink(missing_ok=True)
                count += 1
            elif path.is_dir():  # keys like "<uuid>/<filename>" store objects under a dir
                count += sum(1 for p in path.rglob("*") if p.is_file())
                shutil.rmtree(path, ignore_errors=True)
        return count
