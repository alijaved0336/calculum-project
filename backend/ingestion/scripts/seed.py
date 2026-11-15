"""
Database seed script — inserts coherent sample data across all 7 tables.

Data model:
  Tenant:  Acme Corp
  SpendFileVersion: Q1 2026
  SupplierUltimateParents: TechVision Global Inc, NovaBuild Materials AG
  Suppliers: TechVision NA LLC, TechVision Europe GmbH, NovaBuild UK Ltd
  BuyingEntityUltimateParent: Acme Manufacturing Group
  BuyingEntities: Acme Procurement US, Acme Procurement Europe
  Spends: 3 line items linking suppliers to buying entities

Usage:
    uv run python scripts/seed.py
    uv run python scripts/seed.py --reset   # truncate all tables first
"""

import asyncio
import sys

from domain.entities.api_entities import (
    Agreement,
    BuyingEntity,
    BuyingEntityUltimateParent,
    CustomDataPoint,
    Spend,
    SpendFileVersion,
    Supplier,
    SupplierUltimateParent,
    Target,
    Tenant,
)

# ── IDs (fixed so re-runs are idempotent) ─────────────────────────────────────

TENANT_UUID        = "tn-acme-0001-0000-0000-000000000001"
SFV_UUID           = "sfv-q12026-000-0000-0000-000000000001"

SUP_UP_TECHVISION  = "sup-up-techvis-0000-0000-000000000001"
SUP_UP_NOVABUILD   = "sup-up-novabld-0000-0000-000000000002"

SUP_TECHVISION_NA  = "sup-techvis-na-00-0000-000000000001"
SUP_TECHVISION_EU  = "sup-techvis-eu-00-0000-000000000002"
SUP_NOVABUILD_UK   = "sup-novabld-uk-00-0000-000000000003"

BE_UP_ACME         = "be-up-acme-0001-0000-0000-000000000001"

BE_ACME_US         = "be-acme-us-00001-0000-000000000001"
BE_ACME_EU         = "be-acme-eu-00001-0000-000000000002"

SPEND_IT_HW        = "spd-it-hw-000001-0000-000000000001"
SPEND_SW_LIC       = "spd-sw-lic-00001-0000-000000000002"
SPEND_MATERIALS    = "spd-materials-01-0000-000000000003"

TENANT_ID          = "acme-corp"
UPDATED_AT         = "2026-04-30T08:00:00Z"


# ── Negotiation strategy shared by tech suppliers ─────────────────────────────

_TECH_STRATEGY = {
    "payOnTerms": {"value": 30, "applied": False},
    "parentOrSupplierMax": {"value": 90, "applied": True},
    "industryRegionStandard": {"value": 60, "applied": True},
    "buyerStandard": {
        "value": 75, "applied": True,
        "group": {"description": "NA tech buyer standard", "limitType": "high", "value": 75},
    },
    "supplierStandard": {"value": 45, "applied": False, "occurrences": 72, "avg": 47.2, "q3": 51},
    "peerGroupStandard": {"value": 60, "applied": True, "occurrences": 130, "avg": 61.5, "q3": 68},
    "regulatoryTerm": {
        "value": 60, "applied": True,
        "group": {"enforced": True, "limitType": "high", "value": 60},
    },
    "scfPeerStandard": {"value": 75, "applied": True},
    "harmonization": {"value": 75, "applied": True},
    "scfCostPositive": {"value": 55, "applied": True},
    "vCard": {"value": 40, "applied": False},
    "cashDiscountConversion": {"value": 35, "applied": False},
}

_MATERIALS_STRATEGY = {
    "payOnTerms": {"value": 30, "applied": False},
    "parentOrSupplierMax": {"value": 60, "applied": True},
    "industryRegionStandard": {"value": 45, "applied": True},
    "buyerStandard": {
        "value": 60, "applied": True,
        "group": {"description": "UK construction buyer standard", "limitType": "high", "value": 60},
    },
    "supplierStandard": {"value": 38, "applied": False, "occurrences": 55, "avg": 40.0, "q3": 45},
    "peerGroupStandard": {"value": 50, "applied": True, "occurrences": 88, "avg": 52.0, "q3": 58},
    "regulatoryTerm": {"value": 30, "applied": False},
    "scfPeerStandard": {"value": 60, "applied": False},
    "harmonization": {"value": 60, "applied": True},
    "scfCostPositive": {"value": 45, "applied": False},
    "vCard": {"value": 35, "applied": False},
    "cashDiscountConversion": {"value": 28, "applied": True},
}


# ── Seed data ─────────────────────────────────────────────────────────────────

TENANT = Tenant(
    uuid=TENANT_UUID,
    tenant_id=TENANT_ID,
    name="Acme Corporation",
    country="United States",
    ada_updated_at=UPDATED_AT,
)

SPEND_FILE_VERSION = SpendFileVersion(
    uuid=SFV_UUID,
    tenant_uuid=TENANT_UUID,
    tenant_id=TENANT_ID,
    name="Q1 2026 Spend File",
    start_date="2026-01-01",
    end_date="2026-03-31",
    spend_volume=5150000.00,  # sum of all 3 spends below
    supplier_count=3,
    spend_count=3,
    ada_updated_at=UPDATED_AT,
)

# ── Supplier ultimate parents ──────────────────────────────────────────────────

SUP_UP_TECHVISION_OBJ = SupplierUltimateParent(
    uuid=SUP_UP_TECHVISION,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="TechVision Global Inc.",
    received_name="TECHVISION GLOBAL INC",
    description="Global provider of enterprise IT hardware and software solutions.",
    address="One Infinite Loop, Cupertino, CA 95014, USA",
    phone_number="+1 408 555 0100",
    ownership="Public",
    stock_ticker="TVGN",
    entity_type="UltimateParent",
    country="United States",
    country_rating="AAA",
    credit_rating="A+",
    credit_rating_source="S&P",
    main_industry_code="541512",
    main_industry_name="Computer Systems Design Services",
    url="https://techvision-global.example",
    company_size="Large",
    external_id="DUNS-112233445",
    provided_internal_id="ACME-SUP-TV-P01",
    cost_of_debt_spread=0.007500,
    wacc_pre_tax=0.092000,
    wacc_after_tax=0.078000,
    supplier_financing_rate=0.055000,
    scf_rate=0.048000,
    ethnic_minority_owned_business=False,
    woman_owned_business=False,
    veteran_owned_business=False,
    spend_volume=4200000.00,
    negotiation_status="agreed",
    program_applied="SCF",
    success_probability="High",
    nine_box_term_extension=2,
    entity_buyer_leverage_level="High",
    entity_supplier_leverage_level="Medium",
    is_sme=False,
    sme_source=None,
    dso=48,
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=60, target_payment_terms=90, target_cash_flow=125000.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=90,
        agreed_terms_with_cash_discounts=75,
        agreed_cash_discount_percentage=1.75,
    ),
    negotiation_strategy=_TECH_STRATEGY,
)

SUP_UP_NOVABUILD_OBJ = SupplierUltimateParent(
    uuid=SUP_UP_NOVABUILD,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="NovaBuild Materials AG",
    received_name="NOVABUILD MATERIALS AG",
    description="European leader in sustainable construction materials and components.",
    address="Bahnhofplatz 4, 8001 Zurich, Switzerland",
    phone_number="+41 44 555 0200",
    ownership="Private",
    stock_ticker=None,
    entity_type="UltimateParent",
    country="Switzerland",
    country_rating="AAA",
    credit_rating="BBB",
    credit_rating_source="Moody's",
    main_industry_code="327390",
    main_industry_name="Other Concrete Product Manufacturing",
    url="https://novabuild-materials.example",
    company_size="Medium",
    external_id="DUNS-998877665",
    provided_internal_id="ACME-SUP-NB-P01",
    cost_of_debt_spread=0.012000,
    wacc_pre_tax=0.074000,
    wacc_after_tax=0.062000,
    supplier_financing_rate=0.068000,
    scf_rate=None,
    ethnic_minority_owned_business=False,
    woman_owned_business=True,
    veteran_owned_business=False,
    spend_volume=950000.00,
    negotiation_status="in_negotiation",
    program_applied=None,
    success_probability="Medium",
    nine_box_term_extension=1,
    entity_buyer_leverage_level="Medium",
    entity_supplier_leverage_level="Medium",
    is_sme=True,
    sme_source="EU SME Register",
    dso=38,
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=45, target_payment_terms=60, target_cash_flow=28500.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=None,
        agreed_terms_with_cash_discounts=None,
        agreed_cash_discount_percentage=None,
    ),
    negotiation_strategy=_MATERIALS_STRATEGY,
)

# ── Suppliers ──────────────────────────────────────────────────────────────────

SUP_TECHVISION_NA_OBJ = Supplier(
    uuid=SUP_TECHVISION_NA,
    ultimate_parent_uuid=SUP_UP_TECHVISION,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="TechVision North America LLC",
    received_name="TECHVISION NA LLC",
    description="US operating entity for TechVision Global — hardware sales and support.",
    address="500 Oracle Pkwy, Redwood City, CA 94065, USA",
    phone_number="+1 650 555 0110",
    ownership="Public",
    stock_ticker="TVGN",
    entity_type="Actual",
    country="United States",
    country_rating="AAA",
    credit_rating="A+",
    credit_rating_source="S&P",
    main_industry_code="541512",
    main_industry_name="Computer Systems Design Services",
    url="https://techvision-na.example",
    company_size="Large",
    external_id="DUNS-112233446",
    provided_internal_id="ACME-SUP-TV-001",
    cost_of_debt_spread=0.007500,
    wacc_pre_tax=0.092000,
    wacc_after_tax=0.078000,
    supplier_financing_rate=0.055000,
    scf_rate=0.048000,
    ethnic_minority_owned_business=False,
    woman_owned_business=False,
    veteran_owned_business=False,
    spend_volume=2400000.00,
    negotiation_status="agreed",
    program_applied="SCF",
    success_probability="High",
    nine_box_term_extension=2,
    entity_buyer_leverage_level="High",
    entity_supplier_leverage_level="Low",
    is_sme=False,
    sme_source=None,
    dso=45,
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=60, target_payment_terms=90, target_cash_flow=72000.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=90,
        agreed_terms_with_cash_discounts=75,
        agreed_cash_discount_percentage=1.75,
    ),
    negotiation_strategy=_TECH_STRATEGY,
)

SUP_TECHVISION_EU_OBJ = Supplier(
    uuid=SUP_TECHVISION_EU,
    ultimate_parent_uuid=SUP_UP_TECHVISION,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="TechVision Europe GmbH",
    received_name="TECHVISION EUROPE GMBH",
    description="EU operating entity for TechVision Global — software licences and cloud.",
    address="Maximilianstraße 35, 80539 Munich, Germany",
    phone_number="+49 89 555 0120",
    ownership="Public",
    stock_ticker="TVGN",
    entity_type="Actual",
    country="Germany",
    country_rating="AAA",
    credit_rating="A+",
    credit_rating_source="S&P",
    main_industry_code="541512",
    main_industry_name="Computer Systems Design Services",
    url="https://techvision-eu.example",
    company_size="Large",
    external_id="DUNS-112233447",
    provided_internal_id="ACME-SUP-TV-002",
    cost_of_debt_spread=0.007500,
    wacc_pre_tax=0.089000,
    wacc_after_tax=0.076000,
    supplier_financing_rate=0.052000,
    scf_rate=0.045000,
    ethnic_minority_owned_business=False,
    woman_owned_business=False,
    veteran_owned_business=False,
    spend_volume=1800000.00,
    negotiation_status="agreed",
    program_applied="SCF",
    success_probability="High",
    nine_box_term_extension=2,
    entity_buyer_leverage_level="High",
    entity_supplier_leverage_level="Low",
    is_sme=False,
    sme_source=None,
    dso=42,
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=60, target_payment_terms=90, target_cash_flow=54000.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=90,
        agreed_terms_with_cash_discounts=75,
        agreed_cash_discount_percentage=1.75,
    ),
    negotiation_strategy=_TECH_STRATEGY,
)

SUP_NOVABUILD_UK_OBJ = Supplier(
    uuid=SUP_NOVABUILD_UK,
    ultimate_parent_uuid=SUP_UP_NOVABUILD,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="NovaBuild UK Ltd",
    received_name="NOVABUILD UK LTD",
    description="UK distribution arm of NovaBuild Materials AG.",
    address="12 Canary Wharf, London E14 5AB, UK",
    phone_number="+44 20 555 0130",
    ownership="Private",
    stock_ticker=None,
    entity_type="Actual",
    country="United Kingdom",
    country_rating="AA",
    credit_rating="BBB",
    credit_rating_source="Moody's",
    main_industry_code="327390",
    main_industry_name="Other Concrete Product Manufacturing",
    url="https://novabuild-uk.example",
    company_size="Medium",
    external_id="DUNS-998877666",
    provided_internal_id="ACME-SUP-NB-001",
    cost_of_debt_spread=0.013000,
    wacc_pre_tax=0.076000,
    wacc_after_tax=0.064000,
    supplier_financing_rate=0.070000,
    scf_rate=None,
    ethnic_minority_owned_business=False,
    woman_owned_business=True,
    veteran_owned_business=False,
    spend_volume=950000.00,
    negotiation_status="in_negotiation",
    program_applied=None,
    success_probability="Medium",
    nine_box_term_extension=1,
    entity_buyer_leverage_level="Medium",
    entity_supplier_leverage_level="Medium",
    is_sme=True,
    sme_source="Companies House SME",
    dso=35,
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=45, target_payment_terms=60, target_cash_flow=28500.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=None,
        agreed_terms_with_cash_discounts=None,
        agreed_cash_discount_percentage=None,
    ),
    negotiation_strategy=_MATERIALS_STRATEGY,
)

# ── Buying entity ultimate parent ─────────────────────────────────────────────

BE_UP_ACME_OBJ = BuyingEntityUltimateParent(
    uuid=BE_UP_ACME,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="Acme Manufacturing Group",
    description="Global manufacturing and procurement holding entity.",
    address="1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
    country="United States",
    main_industry_code="332999",
    main_industry_name="All Other Miscellaneous Fabricated Metal Product Manufacturing",
    url="https://acme-manufacturing.example",
    company_size="Large",
    external_id="DUNS-000111222",
    ada_updated_at=UPDATED_AT,
)

# ── Buying entities ───────────────────────────────────────────────────────────

BE_ACME_US_OBJ = BuyingEntity(
    uuid=BE_ACME_US,
    ultimate_parent_uuid=BE_UP_ACME,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="Acme Procurement US",
    country="United States",
    ada_updated_at=UPDATED_AT,
)

BE_ACME_EU_OBJ = BuyingEntity(
    uuid=BE_ACME_EU,
    ultimate_parent_uuid=BE_UP_ACME,
    tenant_id=TENANT_ID,
    spend_file_version_uuid=SFV_UUID,
    name="Acme Procurement Europe",
    country="Germany",
    ada_updated_at=UPDATED_AT,
)

# ── Spends ────────────────────────────────────────────────────────────────────

SPEND_IT_HW_OBJ = Spend(
    spend_uuid=SPEND_IT_HW,
    spend_file_version_uuid=SFV_UUID,
    supplier_uuid=SUP_TECHVISION_NA,
    buying_entity_uuid=BE_ACME_US,
    tenant_id=TENANT_ID,
    alias="TechVision NA — IT Hardware Q1",
    spend_volume=2400000.00,
    transaction_currency="USD",
    procurement_team="IT Procurement",
    commodity="IT Hardware",
    hs_code="8471.30",
    hs_description="Portable automatic data-processing machines",
    currently_on_scf=True,
    currently_on_vcard=False,
    program_applied="SCF",
    base_rate=0.048000,
    scf_rate=0.048000,
    actual_payment_terms=60,
    term_description="Net 60",
    contractual_without_cash_discounts=60,
    contractual_with_cash_discounts=10,
    cash_discount_percentage=1.75,
    last_term_negotiation="2025-12-15",
    aggregated_lines_count=42,
    negotiation_status="agreed",
    custom_data_points=[
        CustomDataPoint(name="CostCenter", value="CC-IT-001"),
        CustomDataPoint(name="PO Reference", value="PO-2026-IT-00145"),
    ],
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=60, target_payment_terms=90, target_cash_flow=72000.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=90,
        agreed_terms_with_cash_discounts=75,
        agreed_cash_discount_percentage=1.75,
        scf_accepted=True,
        vcard_accepted=False,
    ),
    negotiation_strategy=_TECH_STRATEGY,
)

SPEND_SW_LIC_OBJ = Spend(
    spend_uuid=SPEND_SW_LIC,
    spend_file_version_uuid=SFV_UUID,
    supplier_uuid=SUP_TECHVISION_EU,
    buying_entity_uuid=BE_ACME_EU,
    tenant_id=TENANT_ID,
    alias="TechVision EU — Software Licences Q1",
    spend_volume=1800000.00,
    transaction_currency="EUR",
    procurement_team="IT Procurement",
    commodity="Software Licences",
    hs_code=None,
    hs_description=None,
    currently_on_scf=True,
    currently_on_vcard=False,
    program_applied="SCF",
    base_rate=0.045000,
    scf_rate=0.045000,
    actual_payment_terms=60,
    term_description="Net 60",
    contractual_without_cash_discounts=60,
    contractual_with_cash_discounts=10,
    cash_discount_percentage=1.75,
    last_term_negotiation="2025-12-15",
    aggregated_lines_count=18,
    negotiation_status="agreed",
    custom_data_points=[
        CustomDataPoint(name="CostCenter", value="CC-IT-002"),
        CustomDataPoint(name="PO Reference", value="PO-2026-IT-00146"),
    ],
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=60, target_payment_terms=90, target_cash_flow=54000.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=90,
        agreed_terms_with_cash_discounts=75,
        agreed_cash_discount_percentage=1.75,
        scf_accepted=True,
        vcard_accepted=False,
    ),
    negotiation_strategy=_TECH_STRATEGY,
)

SPEND_MATERIALS_OBJ = Spend(
    spend_uuid=SPEND_MATERIALS,
    spend_file_version_uuid=SFV_UUID,
    supplier_uuid=SUP_NOVABUILD_UK,
    buying_entity_uuid=BE_ACME_US,
    tenant_id=TENANT_ID,
    alias="NovaBuild UK — Construction Materials Q1",
    spend_volume=950000.00,
    transaction_currency="GBP",
    procurement_team="Facilities Procurement",
    commodity="Construction Materials",
    hs_code="3816.00",
    hs_description="Refractory cements, mortars, concretes and similar compositions",
    currently_on_scf=False,
    currently_on_vcard=False,
    program_applied=None,
    base_rate=0.068000,
    scf_rate=None,
    actual_payment_terms=30,
    term_description="Net 30",
    contractual_without_cash_discounts=30,
    contractual_with_cash_discounts=14,
    cash_discount_percentage=2.00,
    last_term_negotiation="2025-10-01",
    aggregated_lines_count=9,
    negotiation_status="in_negotiation",
    custom_data_points=[
        CustomDataPoint(name="CostCenter", value="CC-FAC-003"),
        CustomDataPoint(name="Project", value="Warehouse Expansion 2026"),
    ],
    ada_updated_at=UPDATED_AT,
    target=Target(opportunity_payment_terms=45, target_payment_terms=60, target_cash_flow=28500.00),
    agreement=Agreement(
        agreed_terms_without_cash_discounts=None,
        agreed_terms_with_cash_discounts=None,
        agreed_cash_discount_percentage=None,
        scf_accepted=False,
        vcard_accepted=False,
    ),
    negotiation_strategy=_MATERIALS_STRATEGY,
)


# ── Runner ────────────────────────────────────────────────────────────────────

async def seed(reset: bool = False) -> None:
    from config import settings
    from infrastructure.postgres import PostgresAdapter

    print("=" * 62)
    print("  Calculum — Database Seed")
    print("=" * 62)

    pg = PostgresAdapter(
        settings.postgres_dsn,
        pool_size=settings.postgres_pool_size,
        max_overflow=settings.postgres_max_overflow,
        echo=settings.debug,
    )
    await pg.connect()

    if reset:
        print("\n[0/9] Truncating all tables …")
        await pg.execute("""
            TRUNCATE TABLE spends, buying_entities, buying_entity_ultimate_parents,
                           suppliers, supplier_ultimate_parents,
                           spend_file_versions, tenants
            RESTART IDENTITY CASCADE
        """)
        print("      Done.")

    print("\n[1/9] Tenant …")
    await pg.upsert_tenant(TENANT)
    print(f"      {TENANT.name} ({TENANT.uuid})")

    print("\n[2/9] Spend file version …")
    await pg.upsert_spend_file_version(SPEND_FILE_VERSION)
    print(f"      {SPEND_FILE_VERSION.name} ({SPEND_FILE_VERSION.uuid})")

    print("\n[3/9] Supplier ultimate parents …")
    await pg.upsert_supplier_ultimate_parent(SUP_UP_TECHVISION_OBJ)
    print(f"      {SUP_UP_TECHVISION_OBJ.name} ({SUP_UP_TECHVISION_OBJ.uuid})")
    await pg.upsert_supplier_ultimate_parent(SUP_UP_NOVABUILD_OBJ)
    print(f"      {SUP_UP_NOVABUILD_OBJ.name} ({SUP_UP_NOVABUILD_OBJ.uuid})")

    print("\n[4/9] Suppliers …")
    await pg.upsert_supplier(SUP_TECHVISION_NA_OBJ)
    print(f"      {SUP_TECHVISION_NA_OBJ.name} ({SUP_TECHVISION_NA_OBJ.uuid})")
    await pg.upsert_supplier(SUP_TECHVISION_EU_OBJ)
    print(f"      {SUP_TECHVISION_EU_OBJ.name} ({SUP_TECHVISION_EU_OBJ.uuid})")
    await pg.upsert_supplier(SUP_NOVABUILD_UK_OBJ)
    print(f"      {SUP_NOVABUILD_UK_OBJ.name} ({SUP_NOVABUILD_UK_OBJ.uuid})")

    print("\n[5/9] Buying entity ultimate parent …")
    await pg.upsert_buying_entity_ultimate_parent(BE_UP_ACME_OBJ)
    print(f"      {BE_UP_ACME_OBJ.name} ({BE_UP_ACME_OBJ.uuid})")

    print("\n[6/9] Buying entities …")
    await pg.upsert_buying_entity(BE_ACME_US_OBJ)
    print(f"      {BE_ACME_US_OBJ.name} ({BE_ACME_US_OBJ.uuid})")
    await pg.upsert_buying_entity(BE_ACME_EU_OBJ)
    print(f"      {BE_ACME_EU_OBJ.name} ({BE_ACME_EU_OBJ.uuid})")

    print("\n[7/9] Spends …")
    await pg.upsert_spend(SPEND_IT_HW_OBJ)
    print(f"      {SPEND_IT_HW_OBJ.alias} ({SPEND_IT_HW_OBJ.spend_uuid})")
    await pg.upsert_spend(SPEND_SW_LIC_OBJ)
    print(f"      {SPEND_SW_LIC_OBJ.alias} ({SPEND_SW_LIC_OBJ.spend_uuid})")
    await pg.upsert_spend(SPEND_MATERIALS_OBJ)
    print(f"      {SPEND_MATERIALS_OBJ.alias} ({SPEND_MATERIALS_OBJ.spend_uuid})")

    print("\n[8/9] Verifying row counts …")
    counts = await pg.fetch("""
        SELECT 'tenants'                        AS tbl, COUNT(*) FROM tenants
        UNION ALL
        SELECT 'spend_file_versions',                   COUNT(*) FROM spend_file_versions
        UNION ALL
        SELECT 'supplier_ultimate_parents',             COUNT(*) FROM supplier_ultimate_parents
        UNION ALL
        SELECT 'suppliers',                             COUNT(*) FROM suppliers
        UNION ALL
        SELECT 'buying_entity_ultimate_parents',        COUNT(*) FROM buying_entity_ultimate_parents
        UNION ALL
        SELECT 'buying_entities',                       COUNT(*) FROM buying_entities
        UNION ALL
        SELECT 'spends',                                COUNT(*) FROM spends
    """)
    for row in counts:
        print(f"      {row['tbl']:<38} {row['count']:>3} row(s)")

    await pg.close()
    print("\n✓ Seed complete.\n")


if __name__ == "__main__":
    asyncio.run(seed(reset="--reset" in sys.argv))
