from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import date, datetime
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from domain.entities.api_entities import (
    BuyingEntity,
    BuyingEntityUltimateParent,
    Spend,
    SpendFileVersion,
    Supplier,
    SupplierUltimateParent,
    Tenant,
)
from domain.ports.adabot_ingestion_log_store import AdabotIngestionLogStorePort
from domain.ports.kb_document_store import KBDocumentStorePort
from infrastructure.postgres.adabot_ingestion_log import AdabotIngestionLogMixin
from domain.ports.relational_store import RelationalStorePort
from infrastructure.postgres.kb_document import KBDocumentMixin
from infrastructure.postgres import models as orm
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _ts(s: str | None) -> datetime | None:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _d(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


def _custom_data_json(items: list) -> list[dict[str, Any]]:
    return [asdict(i) for i in items]


# ── row builders ────────────────────────────────────────────────────────────────
# Pure functions: entity → column dict. Shared by the single and batch upsert
# paths; the dict is turned into an INSERT ... ON CONFLICT DO UPDATE by
# PostgresAdapter._upsert_rows (single multi-row statement per page).


def _tenant_row(e: Tenant) -> dict[str, Any]:
    return {
        "uuid": e.uuid,
        "tenant_id": e.tenant_id,
        "name": e.name,
        "country": e.country,
        "ada_updated_at": _ts(e.ada_updated_at),
    }


def _spend_file_version_row(e: SpendFileVersion) -> dict[str, Any]:
    return {
        "uuid": e.uuid,
        "tenant_uuid": e.tenant_uuid,
        "tenant_id": e.tenant_id,
        "name": e.name,
        "start_date": _d(e.start_date),
        "end_date": _d(e.end_date),
        "spend_volume": e.spend_volume,
        "supplier_count": e.supplier_count,
        "spend_count": e.spend_count,
        "ada_updated_at": _ts(e.ada_updated_at),
    }


def _supplier_ultimate_parent_row(e: SupplierUltimateParent) -> dict[str, Any]:
    t = e.target
    ag = e.agreement
    ex = _ts(e.ada_updated_at)
    row = {
        "uuid": e.uuid,
        "tenant_id": e.tenant_id,
        "spend_file_version_uuid": e.spend_file_version_uuid,
        "name": e.name,
        "received_name": e.received_name,
        "description": e.description,
        "address": e.address,
        "phone_number": e.phone_number,
        "ownership": e.ownership,
        "stock_ticker": e.stock_ticker,
        "entity_type": e.entity_type,
        "country": e.country,
        "country_rating": e.country_rating,
        "credit_rating": e.credit_rating,
        "credit_rating_source": e.credit_rating_source,
        "main_industry_code": e.main_industry_code,
        "main_industry_name": e.main_industry_name,
        "url": e.url,
        "company_size": e.company_size,
        "external_id": e.external_id,
        "provided_internal_id": e.provided_internal_id,
        "cost_of_debt_spread": e.cost_of_debt_spread,
        "wacc_pre_tax": e.wacc_pre_tax,
        "wacc_after_tax": e.wacc_after_tax,
        "supplier_financing_rate": e.supplier_financing_rate,
        "scf_rate": e.scf_rate,
        "ethnic_minority_owned_business": e.ethnic_minority_owned_business,
        "woman_owned_business": e.woman_owned_business,
        "veteran_owned_business": e.veteran_owned_business,
        "spend_volume": e.spend_volume,
        "negotiation_status": e.negotiation_status,
        "program_applied": e.program_applied,
        "success_probability": e.success_probability,
        "nine_box_term_extension": e.nine_box_term_extension,
        "entity_buyer_leverage_level": e.entity_buyer_leverage_level,
        "entity_supplier_leverage_level": e.entity_supplier_leverage_level,
        "is_sme": e.is_sme,
        "sme_source": e.sme_source,
        "dso": e.dso,
        "target_opportunity_payment_terms": t.opportunity_payment_terms if t else None,
        "target_payment_terms": t.target_payment_terms if t else None,
        "target_cash_flow": t.target_cash_flow if t else None,
        "agreed_terms_without_cash_discounts": ag.agreed_terms_without_cash_discounts if ag else None,
        "agreed_terms_with_cash_discounts": ag.agreed_terms_with_cash_discounts if ag else None,
        "agreed_cash_discount_percentage": ag.agreed_cash_discount_percentage if ag else None,
        "negotiation_strategy": e.negotiation_strategy,
        "ada_updated_at": ex,
    }
    return row


def _supplier_row(e: Supplier) -> dict[str, Any]:
    t = e.target
    ag = e.agreement
    ex = _ts(e.ada_updated_at)
    row = {
        "uuid": e.uuid,
        "ultimate_parent_uuid": e.ultimate_parent_uuid,
        "tenant_id": e.tenant_id,
        "spend_file_version_uuid": e.spend_file_version_uuid,
        "name": e.name,
        "received_name": e.received_name,
        "description": e.description,
        "address": e.address,
        "phone_number": e.phone_number,
        "ownership": e.ownership,
        "stock_ticker": e.stock_ticker,
        "entity_type": e.entity_type,
        "country": e.country,
        "country_rating": e.country_rating,
        "credit_rating": e.credit_rating,
        "credit_rating_source": e.credit_rating_source,
        "main_industry_code": e.main_industry_code,
        "main_industry_name": e.main_industry_name,
        "url": e.url,
        "company_size": e.company_size,
        "external_id": e.external_id,
        "provided_internal_id": e.provided_internal_id,
        "cost_of_debt_spread": e.cost_of_debt_spread,
        "wacc_pre_tax": e.wacc_pre_tax,
        "wacc_after_tax": e.wacc_after_tax,
        "supplier_financing_rate": e.supplier_financing_rate,
        "scf_rate": e.scf_rate,
        "ethnic_minority_owned_business": e.ethnic_minority_owned_business,
        "woman_owned_business": e.woman_owned_business,
        "veteran_owned_business": e.veteran_owned_business,
        "spend_volume": e.spend_volume,
        "negotiation_status": e.negotiation_status,
        "program_applied": e.program_applied,
        "success_probability": e.success_probability,
        "nine_box_term_extension": e.nine_box_term_extension,
        "entity_buyer_leverage_level": e.entity_buyer_leverage_level,
        "entity_supplier_leverage_level": e.entity_supplier_leverage_level,
        "is_sme": e.is_sme,
        "sme_source": e.sme_source,
        "dso": e.dso,
        "target_opportunity_payment_terms": t.opportunity_payment_terms if t else None,
        "target_payment_terms": t.target_payment_terms if t else None,
        "target_cash_flow": t.target_cash_flow if t else None,
        "agreed_terms_without_cash_discounts": ag.agreed_terms_without_cash_discounts if ag else None,
        "agreed_terms_with_cash_discounts": ag.agreed_terms_with_cash_discounts if ag else None,
        "agreed_cash_discount_percentage": ag.agreed_cash_discount_percentage if ag else None,
        "negotiation_strategy": e.negotiation_strategy,
        "ada_updated_at": ex,
    }
    return row


def _buying_entity_ultimate_parent_row(e: BuyingEntityUltimateParent) -> dict[str, Any]:
    ex = _ts(e.ada_updated_at)
    row = {
        "uuid": e.uuid,
        "tenant_id": e.tenant_id,
        "spend_file_version_uuid": e.spend_file_version_uuid,
        "name": e.name,
        "description": e.description,
        "address": e.address,
        "country": e.country,
        "main_industry_code": e.main_industry_code,
        "main_industry_name": e.main_industry_name,
        "url": e.url,
        "company_size": e.company_size,
        "external_id": e.external_id,
        "ada_updated_at": ex,
    }
    return row


def _buying_entity_row(e: BuyingEntity) -> dict[str, Any]:
    return {
        "uuid": e.uuid,
        "ultimate_parent_uuid": e.ultimate_parent_uuid,
        "tenant_id": e.tenant_id,
        "spend_file_version_uuid": e.spend_file_version_uuid,
        "name": e.name,
        "country": e.country,
        "ada_updated_at": _ts(e.ada_updated_at),
    }


def _spend_row(e: Spend) -> dict[str, Any]:
    t = e.target
    ag = e.agreement
    ex = _ts(e.ada_updated_at)
    row = {
        "spend_uuid": e.spend_uuid,
        "spend_file_version_uuid": e.spend_file_version_uuid,
        "supplier_uuid": e.supplier_uuid,
        "buying_entity_uuid": e.buying_entity_uuid,
        "tenant_id": e.tenant_id,
        "alias": e.alias,
        "spend_volume": e.spend_volume,
        "transaction_currency": e.transaction_currency,
        "procurement_team": e.procurement_team,
        "commodity": e.commodity,
        "hs_code": e.hs_code,
        "hs_description": e.hs_description,
        "currently_on_scf": e.currently_on_scf,
        "currently_on_vcard": e.currently_on_vcard,
        "program_applied": e.program_applied,
        "base_rate": e.base_rate,
        "scf_rate": e.scf_rate,
        "actual_payment_terms": e.actual_payment_terms,
        "term_description": e.term_description,
        "contractual_without_cash_discounts": e.contractual_without_cash_discounts,
        "contractual_with_cash_discounts": e.contractual_with_cash_discounts,
        "cash_discount_percentage": e.cash_discount_percentage,
        "last_term_negotiation": _d(e.last_term_negotiation),
        "aggregated_lines_count": e.aggregated_lines_count,
        "negotiation_status": e.negotiation_status,
        "custom_data_points": _custom_data_json(e.custom_data_points),
        "target_opportunity_payment_terms": t.opportunity_payment_terms if t else None,
        "target_payment_terms": t.target_payment_terms if t else None,
        "target_cash_flow": t.target_cash_flow if t else None,
        "agreed_terms_without_cash_discounts": ag.agreed_terms_without_cash_discounts if ag else None,
        "agreed_terms_with_cash_discounts": ag.agreed_terms_with_cash_discounts if ag else None,
        "agreed_cash_discount_percentage": ag.agreed_cash_discount_percentage if ag else None,
        "scf_accepted": ag.scf_accepted if ag else None,
        "vcard_accepted": ag.vcard_accepted if ag else None,
        "negotiation_strategy": e.negotiation_strategy,
        "ada_updated_at": ex,
    }
    return row


# Max bind parameters per statement is 32767 (asyncpg/PG protocol). Stay well
# under it so a wide table at a large page size still fits in one round-trip.
_MAX_BIND_PARAMS = 32000


def _is_foreign_key_error(exc: IntegrityError) -> bool:
    return getattr(exc.orig, "sqlstate", None) == "23503"


def _missing_relationship_key(exc: IntegrityError) -> str | None:
    return {
        "suppliers_ultimate_parent_uuid_fkey": "ultimate_parent_uuid",
        "spend_file_versions_tenant_uuid_fkey": "tenant_uuid",
        "spends_spend_file_version_uuid_fkey": "spend_file_version_uuid",
        "spends_supplier_uuid_fkey": "supplier_uuid",
        "spends_buying_entity_uuid_fkey": "buying_entity_uuid",
    }.get(getattr(exc.orig, "constraint_name", None))


# ── adapter ───────────────────────────────────────────────────────────────────


class PostgresAdapter(
    AdabotIngestionLogMixin,
    KBDocumentMixin,
    RelationalStorePort,
    KBDocumentStorePort,
    AdabotIngestionLogStorePort,
):
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

    # ── upserts ───────────────────────────────────────────────────────────────

    async def _upsert_rows(self, model, index_elements: list, rows: list[dict]) -> None:
        """
        Upsert all rows with as few round-trips as possible: one multi-row
        INSERT ... ON CONFLICT DO UPDATE per chunk, all chunks in one transaction.

        - Dedupes within the batch by primary key (last wins) — Postgres rejects
          the same conflict target appearing twice in one statement.
        - Splits into chunks so the bind-parameter count stays under the protocol
          limit; one page of a wide table normally fits in a single chunk.
        """
        if not rows:
            return
        pk_names = [c.name for c in index_elements]
        deduped = {tuple(r[n] for n in pk_names): r for r in rows}
        rows = list(deduped.values())
        update_cols = [k for k in rows[0] if k not in pk_names]
        max_rows = max(1, _MAX_BIND_PARAMS // len(rows[0]))

        async with self._ensure_engine().begin() as conn:
            for i in range(0, len(rows), max_rows):
                chunk = rows[i : i + max_rows]
                stmt = pg_insert(model).values(chunk)
                stmt = stmt.on_conflict_do_update(
                    index_elements=index_elements,
                    set_={c: getattr(stmt.excluded, c) for c in update_cols},
                )
                await conn.execute(stmt)

    async def _upsert_with_missing_relationships(
        self, model, index_elements: list, row: dict[str, Any]
    ) -> None:
        cleared: set[str] = set()
        while True:
            try:
                await self._upsert_rows(model, index_elements, [row])
                return
            except IntegrityError as exc:
                key = _missing_relationship_key(exc) if _is_foreign_key_error(exc) else None
                if key is None or key in cleared:
                    raise
                row[key] = None
                cleared.add(key)

    async def upsert_tenant(self, e: Tenant) -> None:
        await self._upsert_rows(orm.Tenant, [orm.Tenant.uuid], [_tenant_row(e)])

    async def upsert_tenants_batch(self, entities: list[Tenant]) -> None:
        await self._upsert_rows(orm.Tenant, [orm.Tenant.uuid], [_tenant_row(e) for e in entities])

    async def upsert_spend_file_version(self, e: SpendFileVersion) -> None:
        row = _spend_file_version_row(e)
        await self._upsert_with_missing_relationships(
            orm.SpendFileVersion, [orm.SpendFileVersion.uuid], row
        )

    async def upsert_spend_file_versions_batch(self, entities: list[SpendFileVersion]) -> None:
        await self._upsert_rows(
            orm.SpendFileVersion, [orm.SpendFileVersion.uuid],
            [_spend_file_version_row(e) for e in entities],
        )

    async def upsert_supplier_ultimate_parent(self, e: SupplierUltimateParent) -> None:
        await self._upsert_rows(
            orm.SupplierUltimateParent, [orm.SupplierUltimateParent.uuid],
            [_supplier_ultimate_parent_row(e)],
        )

    async def upsert_supplier_ultimate_parents_batch(self, entities: list[SupplierUltimateParent]) -> None:
        await self._upsert_rows(
            orm.SupplierUltimateParent, [orm.SupplierUltimateParent.uuid],
            [_supplier_ultimate_parent_row(e) for e in entities],
        )

    async def upsert_supplier(self, e: Supplier) -> None:
        row = _supplier_row(e)
        await self._upsert_with_missing_relationships(orm.Supplier, [orm.Supplier.uuid], row)

    async def upsert_suppliers_batch(self, entities: list[Supplier]) -> None:
        await self._upsert_rows(orm.Supplier, [orm.Supplier.uuid], [_supplier_row(e) for e in entities])

    async def upsert_buying_entity_ultimate_parent(self, e: BuyingEntityUltimateParent) -> None:
        await self._upsert_rows(
            orm.BuyingEntityUltimateParent, [orm.BuyingEntityUltimateParent.uuid],
            [_buying_entity_ultimate_parent_row(e)],
        )

    async def upsert_buying_entity_ultimate_parents_batch(self, entities: list[BuyingEntityUltimateParent]) -> None:
        await self._upsert_rows(
            orm.BuyingEntityUltimateParent, [orm.BuyingEntityUltimateParent.uuid],
            [_buying_entity_ultimate_parent_row(e) for e in entities],
        )

    async def upsert_buying_entity(self, e: BuyingEntity) -> None:
        await self._upsert_rows(orm.BuyingEntity, [orm.BuyingEntity.uuid], [_buying_entity_row(e)])

    async def upsert_buying_entities_batch(self, entities: list[BuyingEntity]) -> None:
        await self._upsert_rows(
            orm.BuyingEntity, [orm.BuyingEntity.uuid],
            [_buying_entity_row(e) for e in entities],
        )

    async def upsert_spend(self, e: Spend) -> None:
        row = _spend_row(e)
        await self._upsert_with_missing_relationships(orm.Spend, [orm.Spend.spend_uuid], row)

    async def upsert_spends_batch(self, entities: list[Spend]) -> None:
        await self._upsert_rows(orm.Spend, [orm.Spend.spend_uuid], [_spend_row(e) for e in entities])
