from __future__ import annotations
import logging
import uuid
from datetime import datetime, timedelta
from config import settings
from domain.entities import AdabotIngestionLogStatus, FeedName, SyncCursor
from domain.ports import AdabotIngestionLogStorePort, ApiClientPort, CursorStorePort, RelationalStorePort
from agents.api_pipeline import FeedStats, run_feed_pipeline

logger = logging.getLogger(__name__)

_FEED_ORDER = [
    FeedName.TENANTS, FeedName.SPEND_FILE_VERSIONS,
    FeedName.SUPPLIER_ULTIMATE_PARENTS, FeedName.SUPPLIERS,
    FeedName.BUYING_ENTITY_ULTIMATE_PARENTS, FeedName.BUYING_ENTITIES,
    FeedName.SPENDS,
]

def _exclusive_after(updated_after: str | None) -> str | None:
    """Calculum ``updatedAfter`` is inclusive (>=) and compares at second
    precision — sub-second bumps are ignored. Replay max-seen + 1s."""
    if updated_after is None:
        return None
    dt = datetime.fromisoformat(updated_after.replace("Z", "+00:00"))
    return (dt + timedelta(seconds=1)).isoformat()


def _sync_logs(
    results: dict[str, FeedStats], error_logs: dict[str, list[str]] | None = None
) -> dict:
    metrics = {
        feed: {
            "items_seen": stats.items_seen,
            "rows_written": stats.rows_written,
            "parse_failed": stats.parse_failed,
            "upsert_failed": stats.upsert_failed,
        }
        for feed, stats in results.items()
    }
    metrics["total"] = {
        key: sum(feed_metrics[key] for feed_metrics in metrics.values())
        for key in ("items_seen", "rows_written", "parse_failed", "upsert_failed")
    }
    error_logs = error_logs or {}
    return {
        "error_logs": {
            feed: error_logs.get(feed, []) for feed in [*results, *(f for f in error_logs if f not in results)]
        },
        "metrics": metrics,
    }


class ApiIngestionService:
    def __init__(
        self,
        api_client: ApiClientPort,
        pg_store: RelationalStorePort,
        cursor_store: CursorStorePort,
        adabot_ingestion_log_store: AdabotIngestionLogStorePort,
    ) -> None:
        self._api = api_client
        self._pg = pg_store
        self._cursors = cursor_store
        self._adabot_ingestion_logs = adabot_ingestion_log_store

    async def start_scheduled_sync_log(self) -> uuid.UUID:
        """Create the Processing lifecycle record for one scheduler trigger."""
        log_uuid = uuid.uuid4()
        await self._adabot_ingestion_logs.mark_adabot_ingestion_started(log_uuid)
        return log_uuid

    async def finish_scheduled_sync_log(
        self,
        log_uuid: uuid.UUID,
        results: dict[str, FeedStats],
        pipeline_error: str | None = None,
    ) -> None:
        """Persist the current terminal summary without changing the sync flow."""
        error_logs: dict[str, list[str]] = {}
        for feed, stats in results.items():
            feed_errors = [
                error for error in [stats.feed_error, *stats.parse_errors, *stats.upsert_errors] if error
            ]
            if feed_errors:
                error_logs[feed] = feed_errors
            elif stats.parse_failed or stats.upsert_failed:
                error_logs[feed] = [
                    f"{stats.parse_failed} parse and {stats.upsert_failed} upsert failures"
                ]
        if pipeline_error:
            error_logs["pipeline"] = [pipeline_error]
        await self._adabot_ingestion_logs.update_adabot_ingestion_tracking(
            log_uuid, AdabotIngestionLogStatus.COMPLETED, logs=_sync_logs(results, error_logs),
        )

    async def sync_all(self) -> dict[str, FeedStats]:
        results: dict[str, FeedStats] = {}
        for feed in _FEED_ORDER:
            cursor = await self._cursors.load(feed)
            after = _exclusive_after(cursor.updated_after)
            logger.info("Syncing feed %s (%s) …", feed.value,
                        "initial load" if after is None else f"delta from {after}")
            try:
                stats, max_ts = await run_feed_pipeline(
                    feed=feed, api_client=self._api,
                    pg_store=self._pg,
                    updated_after=after,
                    batch_size=settings.calculum_api_page_limit,
                )
            except Exception as exc:
                logger.error("Feed %s failed: %s", feed.value, exc, exc_info=True)
                results[feed.value] = FeedStats(items_seen=0, rows_written=0, parse_failed=0, upsert_failed=0, feed_error=str(exc))
                raise
            if max_ts:
                await self._cursors.save(SyncCursor(feed=feed, updated_after=max_ts))
            results[feed.value] = stats
        return results

    async def sync_feed(self, feed: FeedName) -> FeedStats:
        cursor = await self._cursors.load(feed)
        after = _exclusive_after(cursor.updated_after)
        stats, max_ts = await run_feed_pipeline(
            feed=feed, api_client=self._api,
            pg_store=self._pg,
            updated_after=after,
            batch_size=settings.calculum_api_page_limit,
        )
        if max_ts:
            await self._cursors.save(SyncCursor(feed=feed, updated_after=max_ts))
        return stats
