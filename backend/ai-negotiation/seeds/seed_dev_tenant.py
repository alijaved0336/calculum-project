"""Seed the local-dev tenant (coding-cops-1bsi1) with Jabil Vietnam supplier data.

Run with:
    python -m seeds.seed_dev_tenant
"""
import asyncio
import uuid
from datetime import date, datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url
from infrastructure.postgres.models import Tenant
from infrastructure.postgres.models.buying_entity import BuyingEntity
from infrastructure.postgres.models.spend import Spend
from infrastructure.postgres.models.spend_file_version import SpendFileVersion
from infrastructure.postgres.models.supplier import Supplier
from infrastructure.postgres.models.supplier_ultimate_parent import SupplierUltimateParent

# ── Fixed IDs (match what the frontend sends) ─────────────────────────────────
TENANT_UUID        = uuid.UUID("b1510000-c0de-4000-8000-c0d100c0de00")
TENANT_ID          = "coding-cops-1bsi1"
SUPPLIER_UUID      = uuid.UUID("67c736b9-75cc-415e-8c8d-23867047b3a5")
SPEND_VERSION_UUID = uuid.UUID("90911899-d22b-4d0a-be95-0816c71d287a")
PARENT_UUID        = uuid.uuid4()
BUYING_ENTITY_UUID = uuid.uuid4()

NOW = datetime(2026, 7, 21, 10, 24, 58, tzinfo=timezone.utc)

# negotiation_strategy as stored in the DB — keys map to the strategy JSON
# from the frontend payload (terms block + strategies block).
NEGOTIATION_STRATEGY = {
    "contractualTerms": {
        "value": 65,
        "key": "contractualTerms",
        "terms": 65,
        "extra": {
            "contractualTerms": {"key": "contractualTerms", "terms": 65},
            "currentTerms":     {"key": "currentTerms",     "terms": 69},
        },
        "infoCards": [
            {"key": "contractualWithoutCashDiscount", "value": 65},
            {"key": "contractualWithCashDiscount",    "value": 57},
            {"key": "contractualDiscount",            "value": 2.2257},
        ],
    },
    "currentTerms": {"value": 69, "key": "currentTerms", "terms": 69},
    "proposedTerms": {
        "value": 95,
        "key": "proposedTerms",
        "terms": 95,
        "paymentCycleFloat": 0,
        "isCapped": False,
        "extra": {
            "harmonization": {
                "key": "harmonization",
                "terms": 95,
                "details": {"type": "dynamic", "level": "spend"},
            }
        },
        "infoCards": [
            {"key": "cashFlowOpportunity", "value": 3864492.7},
            {"key": "changeInTerms",       "value": 30},
            {"key": "applicableStrategies","value": 1},
        ],
    },
    "agreedNewTerms": {"value": None, "key": "agreedNewTerms", "terms": None},
    "parentSupplierMaxStrategy": {
        "value": 85,
        "key": "parentSupplierMaxStrategy",
        "terms": 85,
        "isAllowed": True,
        "isApplicable": True,
        "isVisible": True,
        "extra": {
            "supplierMaxStrategy": {"key": "supplierMaxStrategy", "terms": 85, "details": {"spends": 18}},
            "parentMaxStrategy":   {"key": "parentMaxStrategy",   "terms": 85, "details": {"spends": 41, "suppliers": 8}},
        },
        "infoCards": [
            {"key": "cashFlowOpportunity", "value": 2391055.1},
            {"key": "changeInTerms",       "value": 20},
        ],
    },
    "harmonization": {
        "value": 90,
        "key": "harmonization",
        "terms": 90,
        "isAllowed": True,
        "isApplicable": True,
        "isVisible": True,
        "infoCards": [
            {"key": "cashFlowOpportunity",        "value": 3138259.8},
            {"key": "changeInTerms",               "value": 25},
            {"key": "harmonizationLevel",          "value": "spend"},
            {"key": "harmonizationRoundingRules",  "value": "N"},
        ],
        "extraBelow": [],
    },
    "peerGroupAvgStrategy": {
        "value": 60,
        "key": "peerGroupAvgStrategy",
        "terms": 60,
        "isAllowed": True,
        "isApplicable": False,
        "isVisible": True,
        "isDisabledSource": "global",
        "extra": {
            "peerGroupAvgStrategy": {
                "key": "peerGroupAvgStrategy",
                "terms": 60,
                "details": {"average": 60, "third_quartile": 79},
                "calculationMethod": "average",
            }
        },
        "infoCards": [
            {"key": "cashFlowOpportunity",    "value": -1344968.5},
            {"key": "changeInTerms",          "value": -5},
            {"key": "numberOfOccurrences",    "value": 177},
        ],
    },
    "industryRegionStandardStrategy": {
        "value": 61,
        "key": "industryRegionStandardStrategy",
        "terms": 61,
        "isAllowed": True,
        "isApplicable": False,
        "isVisible": True,
        "isDisabledSource": "global",
        "extra": {
            "industryRegionStandardStrategy": {
                "key": "industryRegionStandardStrategy",
                "terms": 61,
                "calculationMethod": "average",
                "details": {"spends": 119, "min": 0, "third_quartile": 87, "max": 95, "average": 61},
            },
            "industryGroupStrategy": {
                "key": "industryGroupStrategy",
                "terms": 56,
                "calculationMethod": "average",
                "details": {"spends": 369, "min": 0, "third_quartile": 85, "max": 95, "average": 56},
            },
            "regionGroupStrategy": {
                "key": "regionGroupStrategy",
                "terms": 57,
                "calculationMethod": "average",
                "details": {"spends": 422, "min": 0, "third_quartile": 85, "max": 100, "average": 57},
            },
        },
        "infoCards": [
            {"key": "cashFlowOpportunity", "value": -1195527.5},
            {"key": "changeInTerms",       "value": -4},
            {"key": "mainRegion",          "value": "Southeast Asia"},
            {"key": "mainIndustry",        "value": "Semiconductor and Other Electronic Component Manufacturing"},
        ],
    },
}


async def seed() -> None:
    engine = create_async_engine(sqlalchemy_asyncpg_url(settings.postgres_dsn))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():

            # 1. Tenant
            await session.execute(
                pg_insert(Tenant).values(
                    uuid=TENANT_UUID,
                    tenant_id=TENANT_ID,
                    name="Coding Cops",
                    country="US",
                    ada_updated_at=NOW,
                ).on_conflict_do_nothing(index_elements=["uuid"])
            )

            # 2. Spend file version (matches spendfileVersion from frontend)
            await session.execute(
                pg_insert(SpendFileVersion).values(
                    uuid=SPEND_VERSION_UUID,
                    tenant_uuid=TENANT_UUID,
                    tenant_id=TENANT_ID,
                    name="FY2026 Active",
                    start_date=date(2026, 1, 1),
                    end_date=date(2026, 12, 31),
                    spend_volume=54545943.80,
                    supplier_count=1,
                    spend_count=18,
                    ada_updated_at=NOW,
                ).on_conflict_do_nothing(index_elements=["uuid"])
            )

            # 3. Ultimate parent — Jabil Inc.
            await session.execute(
                pg_insert(SupplierUltimateParent).values(
                    uuid=PARENT_UUID,
                    tenant_id=TENANT_ID,
                    spend_file_version_uuid=SPEND_VERSION_UUID,
                    name="Jabil Inc.",
                    country="US",
                    spend_volume=54545943.80,
                    negotiation_status="analyzed",
                    ada_updated_at=NOW,
                ).on_conflict_do_nothing(index_elements=["uuid"])
            )

            # 4. Supplier — Jabil Vietnam
            await session.execute(
                pg_insert(Supplier).values(
                    uuid=SUPPLIER_UUID,
                    tenant_id=TENANT_ID,
                    spend_file_version_uuid=SPEND_VERSION_UUID,
                    ultimate_parent_uuid=PARENT_UUID,
                    name="JABIL VIETNAM COMPANY LIMITED",
                    received_name="Jabil Vietnam Co., Ltd.",
                    country="Vietnam",
                    url="www.jabil.com",
                    main_industry_name="Semiconductor and Other Electronic Component Manufacturing",
                    is_sme=False,
                    sme_source="vietnam",
                    spend_volume=54545943.80,
                    negotiation_status="analyzed",
                    dso=69,
                    # target from proposedTerms (95 days) → opportunityPaymentTerms
                    target_opportunity_payment_terms=95,
                    target_payment_terms=85,
                    target_cash_flow=3864492.70,
                    # contractual terms without/with cash discount
                    agreed_terms_without_cash_discounts=65,
                    agreed_terms_with_cash_discounts=57,
                    agreed_cash_discount_percentage=2.225711,
                    negotiation_strategy=NEGOTIATION_STRATEGY,
                    ada_updated_at=NOW,
                ).on_conflict_do_nothing(index_elements=["uuid"])
            )

            # 5. Buying entity (required FK for spend rows)
            await session.execute(
                pg_insert(BuyingEntity).values(
                    uuid=BUYING_ENTITY_UUID,
                    tenant_id=TENANT_ID,
                    spend_file_version_uuid=SPEND_VERSION_UUID,
                    name="Buyer 1 - United States",
                    country="US",
                    ada_updated_at=NOW,
                ).on_conflict_do_nothing(index_elements=["uuid"])
            )

            # 6. Spend lines (18 aggregated lines; we seed representative ones
            #    covering the weighted-average current terms and the max opportunity)
            spend_lines = [
                # line with the highest opportunity (drives maxTargetOpportunityPaymentTerms)
                dict(
                    spend_uuid=uuid.uuid4(),
                    spend_file_version_uuid=SPEND_VERSION_UUID,
                    supplier_uuid=SUPPLIER_UUID,
                    buying_entity_uuid=BUYING_ENTITY_UUID,
                    tenant_id=TENANT_ID,
                    alias="VN-001",
                    spend_volume=20000000.00,
                    transaction_currency="USD",
                    procurement_team="Electronics",
                    currently_on_scf=False,
                    currently_on_vcard=False,
                    base_rate=0.05,
                    actual_payment_terms=69,
                    aggregated_lines_count=8,
                    negotiation_status="analyzed",
                    target_opportunity_payment_terms=95,
                    target_payment_terms=85,
                    target_cash_flow=2000000.00,
                    ada_updated_at=NOW,
                ),
                # remaining spend volume, same current terms
                dict(
                    spend_uuid=uuid.uuid4(),
                    spend_file_version_uuid=SPEND_VERSION_UUID,
                    supplier_uuid=SUPPLIER_UUID,
                    buying_entity_uuid=BUYING_ENTITY_UUID,
                    tenant_id=TENANT_ID,
                    alias="VN-002",
                    spend_volume=34545943.80,
                    transaction_currency="USD",
                    procurement_team="Electronics",
                    currently_on_scf=False,
                    currently_on_vcard=False,
                    base_rate=0.05,
                    actual_payment_terms=69,
                    aggregated_lines_count=10,
                    negotiation_status="analyzed",
                    target_opportunity_payment_terms=90,
                    target_payment_terms=85,
                    target_cash_flow=1864492.70,
                    ada_updated_at=NOW,
                ),
            ]
            for line in spend_lines:
                await session.execute(
                    pg_insert(Spend).values(**line).on_conflict_do_nothing(index_elements=["spend_uuid"])
                )

    await engine.dispose()
    print(f"Seeded:")
    print(f"  Tenant:            {TENANT_ID} ({TENANT_UUID})")
    print(f"  SpendFileVersion:  {SPEND_VERSION_UUID}")
    print(f"  UltimateParent:    Jabil Inc. ({PARENT_UUID})")
    print(f"  Supplier:          JABIL VIETNAM COMPANY LIMITED ({SUPPLIER_UUID})")
    print(f"  BuyingEntity:      Buyer 1 - United States ({BUYING_ENTITY_UUID})")
    print(f"  Spend lines:       2 (VN-001, VN-002)")


if __name__ == "__main__":
    asyncio.run(seed())
