from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from domain.ports.kb_document_store import KBDocumentStorePort
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url
from infrastructure.postgres.kb_document import KBDocumentMixin

logger = logging.getLogger(__name__)


class PostgresAdapter(KBDocumentMixin, KBDocumentStorePort):
    """Async Postgres engine + kb_documents tracking (video-support ingestion only)."""

    def __init__(
        self,
        dsn: str,
        pool_size: int = 10,
        max_overflow: int = 0,
        echo: bool = False,
        connect_timeout: float = 10.0,
    ) -> None:
        self._dsn = dsn
        self._pool_size = pool_size
        self._max_overflow = max_overflow
        self._echo = echo
        self._connect_timeout = connect_timeout
        self._engine: AsyncEngine | None = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    async def connect(self) -> None:
        url = sqlalchemy_asyncpg_url(self._dsn)
        self._engine = create_async_engine(
            url,
            echo=self._echo,
            pool_size=self._pool_size,
            max_overflow=self._max_overflow,
            pool_pre_ping=True,
            connect_args={"timeout": self._connect_timeout},
        )
        self._session_factory = async_sessionmaker(self._engine, expire_on_commit=False)
        logger.info("PostgreSQL SQLAlchemy async engine ready.")

    async def close(self) -> None:
        if self._engine:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None
            logger.info("PostgreSQL engine disposed.")

    @property
    def engine(self) -> AsyncEngine:
        return self._ensure_engine()

    def _ensure_engine(self) -> AsyncEngine:
        if self._engine is None:
            raise RuntimeError("PostgresAdapter: call connect() before use.")
        return self._engine

    def sessionmaker(self) -> async_sessionmaker[AsyncSession]:
        if self._session_factory is None:
            raise RuntimeError("PostgresAdapter: call connect() before use.")
        return self._session_factory

    async def execute(self, query: str, *args) -> None:
        async with self._ensure_engine().begin() as conn:
            await conn.exec_driver_sql(query, args)

    async def fetch(self, query: str, *args) -> list:
        async with self._ensure_engine().connect() as conn:
            result = await conn.exec_driver_sql(query, args)
            return result.mappings().all()

    async def fetchrow(self, query: str, *args):
        async with self._ensure_engine().connect() as conn:
            result = await conn.exec_driver_sql(query, args)
            return result.mappings().first()
