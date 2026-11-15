"""
APScheduler-backed scheduler for the full sync pipeline.

Feeds run in dependency order: each group starts only after the previous group
finishes. Feeds within a group run in parallel.

    Group 1: tenants, spend_file_versions
    Group 2: supplier_ultimate_parents, buying_entity_ultimate_parents
    Group 3: suppliers, buying_entities
    Group 4: spends

The entire pipeline repeats on a single interval (SYNC_INTERVAL_MINUTES, default 3 h).
Lifecycle is managed by FastAPI's lifespan (start on startup, stop on shutdown).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from agents.api_pipeline import FeedStats
from config import settings
from domain.entities import FeedName

logger = logging.getLogger(__name__)

_FEED_GROUPS: list[list[FeedName]] = [
    [FeedName.TENANTS],
    [FeedName.SPEND_FILE_VERSIONS],
    [FeedName.SUPPLIER_ULTIMATE_PARENTS, FeedName.BUYING_ENTITY_ULTIMATE_PARENTS],
    [FeedName.SUPPLIERS, FeedName.BUYING_ENTITIES],
    [FeedName.SPENDS],
]

def _log_summary(stats: dict[str, FeedStats]) -> None:
    col = 32
    total = FeedStats(
        items_seen=sum(s.items_seen for s in stats.values()),
        rows_written=sum(s.rows_written for s in stats.values()),
        parse_failed=sum(s.parse_failed for s in stats.values()),
        upsert_failed=sum(s.upsert_failed for s in stats.values()),
    )
    sep = "=" * 70
    lines = [sep]
    for feed_name, s in stats.items():
        lines.append(
            f"  {feed_name:<{col}}  {s.items_seen:>6} items  "
            f"{s.rows_written:>6} written  "
            f"{s.parse_failed:>5} skipped  "
            f"{s.upsert_failed:>5} failed"
        )
    lines.append("  " + "-" * (col + 46))
    lines.append(
        f"  {'Total':<{col}}  {total.items_seen:>6} items  "
        f"{total.rows_written:>6} written  "
        f"{total.parse_failed:>5} skipped  "
        f"{total.upsert_failed:>5} failed"
    )
    lines.append(sep)

    failure_lines: list[str] = []
    for feed_name, s in stats.items():
        if not (s.feed_error or s.parse_errors or s.upsert_errors):
            continue
        failure_lines.append(f"\n  {feed_name}")
        if s.feed_error:
            failure_lines.append(f"    Feed error: {s.feed_error}")
        if s.parse_errors:
            shown = len(s.parse_errors)
            total = s.parse_failed
            failure_lines.append(f"    Parse errors ({shown} of {total} shown):")
            for i, msg in enumerate(s.parse_errors, 1):
                failure_lines.append(f"      [{i}] {msg}")
        if s.upsert_errors:
            shown = len(s.upsert_errors)
            total = s.upsert_failed
            failure_lines.append(f"    Upsert errors ({shown} of {total} shown):")
            for i, msg in enumerate(s.upsert_errors, 1):
                failure_lines.append(f"      [{i}] {msg}")

    if failure_lines:
        lines.append("Failures:" + "\n".join(failure_lines))
        lines.append(sep)

    logger.info("Sync pipeline complete.\n%s", "\n".join(lines))


def build_scheduler(api_ingestion_service):
    """
    Build (but don't start) the scheduler.
    Call .start() in the FastAPI lifespan startup.
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.interval import IntervalTrigger

    if not settings.calculum_api_url:
        logger.warning(
            "CALCULUM_API_URL is not set — scheduler disabled. "
            "Set it in .env to enable automatic delta pulls."
        )
        return AsyncIOScheduler()

    async def _run_pipeline() -> None:
        logger.info("Sync pipeline starting.")
        all_stats: dict[str, FeedStats] = {}
        log_uuid = await api_ingestion_service.start_scheduled_sync_log()
        try:
            for group in _FEED_GROUPS:
                feed_names = [f.value for f in group]
                logger.info("Syncing group: %s", feed_names)
                results = await asyncio.gather(
                    *[api_ingestion_service.sync_feed(f) for f in group],
                    return_exceptions=True,
                )
                for feed, result in zip(group, results):
                    if isinstance(result, Exception):
                        logger.error("Feed %s error: %s", feed.value, result, exc_info=result)
                        all_stats[feed.value] = FeedStats(items_seen=0, rows_written=0, parse_failed=0, upsert_failed=0, feed_error=str(result))
                    else:
                        all_stats[feed.value] = result

            await api_ingestion_service.finish_scheduled_sync_log(log_uuid, all_stats)
            _log_summary(all_stats)
        except BaseException as exc:
            await asyncio.shield(
                api_ingestion_service.finish_scheduled_sync_log(
                    log_uuid, all_stats, str(exc) or "Run cancelled before completion."
                )
            )
            _log_summary(all_stats)
            raise

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _run_pipeline,
        trigger=IntervalTrigger(minutes=settings.sync_interval_minutes),
        id="sync_pipeline",
        name=f"Full sync pipeline (every {settings.sync_interval_minutes} min)",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(timezone.utc),
    )
    logger.info(
        "Sync pipeline scheduled every %d min (%.1fh), starting immediately.",
        settings.sync_interval_minutes,
        settings.sync_interval_minutes / 60,
    )

    return scheduler
