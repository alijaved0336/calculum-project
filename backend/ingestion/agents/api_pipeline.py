from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Callable
from domain.entities import FeedName
from domain.ports import ApiClientPort, RelationalStorePort
from agents.nodes import (
    parse_tenant, parse_spend_file_version, parse_spend,
    parse_supplier, parse_supplier_ultimate_parent,
    parse_buying_entity, parse_buying_entity_ultimate_parent,
)

_MAX_ERROR_SAMPLES = 5

logger = logging.getLogger(__name__)


@dataclass
class FeedStats:
    items_seen: int
    rows_written: int
    parse_failed: int
    upsert_failed: int
    parse_errors: list[str] = field(default_factory=list)
    upsert_errors: list[str] = field(default_factory=list)
    feed_error: str | None = None


_PARSERS: dict[FeedName, Callable[[dict], object]] = {
    FeedName.TENANTS: parse_tenant,
    FeedName.SPEND_FILE_VERSIONS: parse_spend_file_version,
    FeedName.SPENDS: parse_spend,
    FeedName.SUPPLIERS: parse_supplier,
    FeedName.SUPPLIER_ULTIMATE_PARENTS: parse_supplier_ultimate_parent,
    FeedName.BUYING_ENTITIES: parse_buying_entity,
    FeedName.BUYING_ENTITY_ULTIMATE_PARENTS: parse_buying_entity_ultimate_parent,
}

_PG_UPSERTS: dict[FeedName, str] = {
    FeedName.TENANTS: "upsert_tenant",
    FeedName.SPEND_FILE_VERSIONS: "upsert_spend_file_version",
    FeedName.SPENDS: "upsert_spend",
    FeedName.SUPPLIERS: "upsert_supplier",
    FeedName.SUPPLIER_ULTIMATE_PARENTS: "upsert_supplier_ultimate_parent",
    FeedName.BUYING_ENTITIES: "upsert_buying_entity",
    FeedName.BUYING_ENTITY_ULTIMATE_PARENTS: "upsert_buying_entity_ultimate_parent",
}

_PG_BATCH_UPSERTS: dict[FeedName, str] = {
    FeedName.TENANTS: "upsert_tenants_batch",
    FeedName.SPEND_FILE_VERSIONS: "upsert_spend_file_versions_batch",
    FeedName.SPENDS: "upsert_spends_batch",
    FeedName.SUPPLIERS: "upsert_suppliers_batch",
    FeedName.SUPPLIER_ULTIMATE_PARENTS: "upsert_supplier_ultimate_parents_batch",
    FeedName.BUYING_ENTITIES: "upsert_buying_entities_batch",
    FeedName.BUYING_ENTITY_ULTIMATE_PARENTS: "upsert_buying_entity_ultimate_parents_batch",
}

assert set(_PG_UPSERTS) == set(_PARSERS) == set(_PG_BATCH_UPSERTS), (
    f"_PG_UPSERTS, _PG_BATCH_UPSERTS and _PARSERS must cover the same feeds. "
    f"Missing in _PG_UPSERTS: {set(_PARSERS) - set(_PG_UPSERTS)}; "
    f"missing in _PG_BATCH_UPSERTS: {set(_PARSERS) - set(_PG_BATCH_UPSERTS)}"
)


async def run_feed_pipeline(
    feed: FeedName,
    api_client: ApiClientPort,
    pg_store: RelationalStorePort,
    updated_after: str | None = None,
    batch_size: int = 500,
) -> tuple[FeedStats, str | None]:
    parser = _PARSERS[feed]
    pg_upsert = getattr(pg_store, _PG_UPSERTS[feed])
    pg_batch_upsert = getattr(pg_store, _PG_BATCH_UPSERTS[feed])
    items_seen = 0
    rows_written = 0
    parse_failed = 0
    upsert_failed = 0
    parse_errors: list[str] = []
    upsert_errors: list[str] = []
    max_updated_at: str | None = None
    buffer: list = []

    async def _flush() -> None:
        nonlocal rows_written, upsert_failed
        if not buffer:
            return
        try:
            await pg_batch_upsert(buffer)
            rows_written += len(buffer)
        except Exception as exc:
            # The page transaction rolled back; retry row-by-row to land good
            # rows and isolate the bad one.
            logger.warning(
                "Page upsert for %s failed (%d rows); retrying row-by-row: %s",
                feed.value, len(buffer), exc,
            )
            for ent in buffer:
                try:
                    await pg_upsert(ent)
                    rows_written += 1
                except Exception as row_exc:
                    logger.error("Postgres upsert failed for %s: %s", feed.value, row_exc)
                    upsert_failed += 1
                    if len(upsert_errors) < _MAX_ERROR_SAMPLES:
                        upsert_errors.append(str(row_exc))
        finally:
            buffer.clear()

    async for raw_item in api_client.stream_feed(feed, updated_after=updated_after):
        items_seen += 1
        try:
            entity = parser(raw_item)
        except Exception as exc:
            logger.warning("Failed to parse %s item: %s", feed.value, exc)
            parse_failed += 1
            if len(parse_errors) < _MAX_ERROR_SAMPLES:
                parse_errors.append(str(exc))
            continue

        ts = getattr(entity, "ada_updated_at", None)
        if ts and (max_updated_at is None or ts > max_updated_at):
            max_updated_at = ts

        buffer.append(entity)
        if len(buffer) >= batch_size:
            await _flush()

    await _flush()

    logger.info("Feed %s complete: %d items → %d rows.", feed.value, items_seen, rows_written)
    return FeedStats(
        items_seen=items_seen,
        rows_written=rows_written,
        parse_failed=parse_failed,
        upsert_failed=upsert_failed,
        parse_errors=parse_errors,
        upsert_errors=upsert_errors,
    ), max_updated_at
