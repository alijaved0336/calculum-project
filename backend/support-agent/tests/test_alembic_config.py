"""Guards that this repo's Alembic lineage is ISOLATED from the other services that
migrate the same shared Postgres DB (AI Negotiation → alembic_version,
ingestion → ingestion_alembic_version). Ours must use its own version table and be a
fresh lineage root, so there is never a shared/conflicting head."""
import importlib.util
from pathlib import Path


def test_env_uses_isolated_version_table():
    env = Path("migrations/env.py").read_text()
    assert "support_alembic_version" in env  # own version table, not the default
    assert "version_table" in env


def test_first_migration_is_lineage_root():
    path = next(Path("migrations/versions").glob("0001_*.py"))
    spec = importlib.util.spec_from_file_location("m0001", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert mod.down_revision is None  # root — not chained onto another repo's revision
    assert mod.revision
