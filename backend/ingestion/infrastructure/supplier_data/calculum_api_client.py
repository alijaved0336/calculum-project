"""
Calculum API async client.

Features:
  - Transparent cursor-based pagination via stream_feed()
  - Exponential-backoff retry on 429 / 5xx via tenacity
  - Per-request timeout
  - Rate-limit header awareness (logs X-RateLimit-Remaining)
"""

from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import settings
from domain.entities import FeedName
from domain.ports import ApiClientPort

logger = logging.getLogger(__name__)

# Map FeedName enum → API path segment
_FEED_PATH: dict[FeedName, str] = {
    FeedName.TENANTS: "tenants",
    FeedName.SPEND_FILE_VERSIONS: "spend-file-versions",
    FeedName.SPENDS: "spends",
    FeedName.SUPPLIERS: "suppliers",
    FeedName.SUPPLIER_ULTIMATE_PARENTS: "supplier-ultimate-parents",
    FeedName.BUYING_ENTITIES: "buying-entities",
    FeedName.BUYING_ENTITY_ULTIMATE_PARENTS: "buying-entity-ultimate-parents",
}


class CalculumApiClient(ApiClientPort):
    def __init__(self) -> None:
        self._base_url = settings.calculum_api_url.rstrip("/")
        self._headers = {
            "X-API-Key": settings.calculum_api_key,
            "Accept": "application/json",
        }
        self._timeout = httpx.Timeout(
            connect=10.0,
            read=settings.calculum_api_timeout,
            write=10.0,
            pool=5.0,
        )
        self._page_limit = settings.calculum_api_page_limit

    # ── Feed streaming ────────────────────────────────────────────────────────

    async def stream_feed(
        self,
        feed: FeedName,
        updated_after: str | None = None,
    ) -> AsyncIterator[dict]:
        """
        Async-iterate over every raw item dict in a feed, paginating
        transparently until nextCursor is null.
        """
        path = _FEED_PATH[feed]
        cursor: str | None = None
        page = 0

        async with self._make_client() as client:
            while True:
                params: dict = {"limit": self._page_limit}
                if cursor:
                    params["cursor"] = cursor
                if updated_after:
                    params["updatedAfter"] = updated_after

                data = await self._get_with_retry(
                    client, f"/{path}", params
                )
                items: list[dict] = data.get("data", [])
                pagination: dict = data.get("pagination", {})
                page += 1

                logger.debug(
                    "Feed %s page %d: %d items", feed.value, page, len(items)
                )
                for item in items:
                    yield item

                next_cursor = pagination.get("nextCursor")
                if not next_cursor or not items or next_cursor == cursor:
                    break
                cursor = next_cursor

    # ── HTTP internals ────────────────────────────────────────────────────────

    def _make_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._base_url,
            headers=self._headers,
            timeout=self._timeout,
        )

    @retry(
        retry=retry_if_exception_type(
            (httpx.TransportError, httpx.TimeoutException)
        ),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        stop=stop_after_attempt(settings.calculum_api_max_retries),
        reraise=True,
    )
    async def _get_with_retry(
        self,
        client: httpx.AsyncClient,
        path: str,
        params: dict,
    ) -> dict:
        response = await client.get(path, params=params)

        remaining = response.headers.get("X-RateLimit-Remaining")
        if remaining and int(remaining) < 10:
            logger.warning("Rate limit low: %s requests remaining.", remaining)

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 5))
            logger.warning("Rate limited. Waiting %ds …", retry_after)
            await asyncio.sleep(retry_after)
            raise httpx.TransportError("Rate limited — retrying")

        response.raise_for_status()
        return response.json()
