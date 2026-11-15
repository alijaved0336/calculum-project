"""
End-to-end pipeline smoke test using dummy data.

Runs ONE supplier feed item through the full pipeline:
  transform → upsert to Postgres → verify

Usage:
    uv run python scripts/test_pipeline.py

Requirements: PostgreSQL must be running (docker-compose up -d)
"""

import asyncio
import time

# ── Dummy ultimate parent (must be inserted before supplier due to FK) ─────────
DUMMY_SUPPLIER_ULTIMATE_PARENT_ITEM = {
    "context": {
        "tenantId": "acme-corps",
        "spendFileVersionUuid": "b7c1c0a4-4d3a-4f8e-ab12-9c7e2d3f00110",
    },
    "supplierUltimateParent": {
        "uuid": "p9q1a2b3-4c5d-6e7f-8901-abcdef012345si",
        "name": "Globex Logistics Group GmbH",
        "receivedName": "GLOBEX LOG GROUP GMBH",
        "description": "Pan-European freight & 3PL provider focused on automotive supply chains.",
        "address": "Hafenstraße 12, 20097 Hamburg, Germany",
        "phoneNumber": "+49 40 1234 5678",
        "ownership": "Private",
        "stockTicker": None,
        "entityType": "UltimateParent",
        "country": "Germany",
        "countryRating": "AAA",
        "creditRating": "BBB+",
        "creditRatingSource": "Internal",
        "mainIndustryCode": "488510",
        "mainIndustryName": "Freight Transportation Arrangement",
        "url": "https://globex-logistics.example",
        "companySize": "Large",
        "externalId": "DUNS-528391740",
        "providedInternalId": "ACME-SUP-7842-P",
        "costOfDebtSpread": 0.0095,
        "waccPreTax": 0.085,
        "waccAfterTax": 0.072,
        "supplierFinancingRate": 0.062,
        "scfRate": 0.0500,
        "ethnicMinorityOwnedBusiness": False,
        "womanOwnedBusiness": False,
        "veteranOwnedBusiness": False,
        "spendVolume": 18750000.00,
        "negotiationStatus": "agreed",
        "programApplied": "SCF",
        "successProbability": "High",
        "nineBoxTermExtension": 1,
        "entityBuyerLeverageLevel": "High",
        "entitySupplierLeverageLevel": "Medium",
        "isSme": False,
        "smeSource": None,
        "dso": 52,
        "updatedAt": "2026-04-28T10:00:00Z",
    },
    "target": {
        "opportunityPaymentTerms": 58,
        "targetPaymentTerms": 85,
        "targetCashFlow": 91200.00,
    },
    "agreement": {
        "agreedTermsWithoutCashDiscounts": 86,
        "agreedTermsWithCashDiscounts": 70,
        "agreedCashDiscountPercentage": 1.6,
    },
    "negotiationStrategy": {
        "payOnTerms": {"value": 41, "applied": False},
        "parentOrSupplierMax": {"value": 90, "applied": True},
        "industryRegionStandard": {"value": 60, "applied": True},
        "buyerStandard": {
            "value": 75, "applied": True,
            "group": {"description": "EU manufacturing buyer standard", "limitType": "high", "value": 75},
        },
        "supplierStandard": {"value": 47, "applied": False, "occurrences": 84, "avg": 48.1, "q3": 53},
        "peerGroupStandard": {"value": 55, "applied": True, "occurrences": 142, "avg": 56.5, "q3": 62},
        "regulatoryTerm": {
            "value": 60, "applied": True,
            "group": {"enforced": True, "limitType": "high", "value": 60},
        },
        "scfPeerStandard": {"value": 70, "applied": True},
        "harmonization": {"value": 75, "applied": True},
        "scfCostPositive": {"value": 52, "applied": True},
        "vCard": {"value": 42, "applied": False},
        "cashDiscountConversion": {"value": 36, "applied": False},
    },
}

# ── Dummy supplier (references ultimate parent UUID above) ─────────────────────
DUMMY_SUPPLIER_ITEM = {
    "context": {
        "tenantId": "acme-corps",
        "spendFileVersionUuid": "b7c1c0a4-4d3a-4f8e-ab12-9c7e2d3f00110",
    },
    "supplier": {
        "uuid": "c2d5e7f9-1a2b-4c3d-9e8f-0a1b2c3d4e5u8",
        "ultimateParentUuid": "p9q1a2b3-4c5d-6e7f-8901-abcdef012345si",
        "name": "Globex Logistics GmbH",
        "receivedName": "GLOBEX LOG GMBH",
        "description": "Pan-European freight & 3PL provider focused on automotive supply chains.",
        "address": "Hafenstraße 12, 20097 Hamburg, Germany",
        "phoneNumber": "+49 40 1234 5678",
        "ownership": "Private",
        "stockTicker": None,
        "entityType": "Actual",
        "country": "Germany",
        "countryRating": "AAA",
        "creditRating": "BBB+",
        "creditRatingSource": "Internal",
        "mainIndustryCode": "488510",
        "mainIndustryName": "Freight Transportation Arrangement",
        "url": "https://globex-logistics.example",
        "companySize": "Large",
        "externalId": "DUNS-528391740",
        "providedInternalId": "ACME-SUP-7842",
        "costOfDebtSpread": 0.0095,
        "waccPreTax": 0.085,
        "waccAfterTax": 0.072,
        "supplierFinancingRate": 0.062,
        "scfRate": 0.0500,
        "ethnicMinorityOwnedBusiness": False,
        "womanOwnedBusiness": False,
        "veteranOwnedBusiness": False,
        "spendVolume": 18750000.00,
        "negotiationStatus": "agreed",
        "programApplied": "SCF",
        "successProbability": "High",
        "nineBoxTermExtension": 1,
        "entityBuyerLeverageLevel": "High",
        "entitySupplierLeverageLevel": "Medium",
        "isSme": False,
        "smeSource": None,
        "dso": 52,
        "updatedAt": "2026-04-28T10:00:00Z",
    },
    "target": {
        "opportunityPaymentTerms": 58,
        "targetPaymentTerms": 85,
        "targetCashFlow": 91200.00,
    },
    "agreement": {
        "agreedTermsWithoutCashDiscounts": 86,
        "agreedTermsWithCashDiscounts": 70,
        "agreedCashDiscountPercentage": 1.6,
    },
    "negotiationStrategy": {
        "payOnTerms": {"value": 41, "applied": False},
        "parentOrSupplierMax": {"value": 90, "applied": True},
        "industryRegionStandard": {"value": 60, "applied": True},
        "buyerStandard": {
            "value": 75, "applied": True,
            "group": {"description": "EU manufacturing buyer standard", "limitType": "high", "value": 75},
        },
        "supplierStandard": {"value": 47, "applied": False, "occurrences": 84, "avg": 48.1, "q3": 53},
        "peerGroupStandard": {"value": 55, "applied": True, "occurrences": 142, "avg": 56.5, "q3": 62},
        "regulatoryTerm": {
            "value": 60, "applied": True,
            "group": {"enforced": True, "limitType": "high", "value": 60},
        },
        "scfPeerStandard": {"value": 70, "applied": True},
        "harmonization": {"value": 75, "applied": True},
        "scfCostPositive": {"value": 52, "applied": True},
        "vCard": {"value": 42, "applied": False},
        "cashDiscountConversion": {"value": 36, "applied": False},
    },
}


async def main() -> None:
    from config import settings
    from infrastructure.postgres import PostgresAdapter
    from agents.nodes.transform import parse_supplier, parse_supplier_ultimate_parent

    total_start = time.perf_counter()

    print("=" * 60)
    print("  Calculum Ingestion — Pipeline Smoke Test")
    print("=" * 60)

    # ── Step 1: connect PostgreSQL + ensure tables ─────────────────
    print("\n[1/3] Connecting to PostgreSQL …")
    pg = PostgresAdapter(settings.postgres_dsn)
    await pg.connect()
    print("      OK")

    # ── Step 2: upsert to Postgres ────────────────────────────────
    print("\n[2/3] Upserting dummy data to PostgreSQL …")

    # ultimate parent must exist before supplier (FK constraint)
    parent = parse_supplier_ultimate_parent(DUMMY_SUPPLIER_ULTIMATE_PARENT_ITEM)
    await pg.upsert_supplier_ultimate_parent(parent)
    print(f"      Ultimate parent : {parent.name} ({parent.uuid})")

    supplier = parse_supplier(DUMMY_SUPPLIER_ITEM)
    await pg.upsert_supplier(supplier)
    print(f"      Supplier        : {supplier.name} ({supplier.uuid})")

    # ── Step 3: verify ────────────────────────────────────────────
    print("\n[3/3] Verifying …")
    parent_row = await pg.fetchrow(
        "SELECT uuid, name FROM supplier_ultimate_parents WHERE uuid = $1",
        parent.uuid,
    )
    supplier_row = await pg.fetchrow(
        "SELECT uuid, name, tenant_id, negotiation_status FROM suppliers WHERE uuid = $1",
        supplier.uuid,
    )

    if parent_row:
        print(f"      [supplier_ultimate_parents] uuid={parent_row['uuid']}  name={parent_row['name']}")
    else:
        print("      [supplier_ultimate_parents] No row found.")

    if supplier_row:
        print(f"      [suppliers] uuid={supplier_row['uuid']}  name={supplier_row['name']}  "
              f"tenant={supplier_row['tenant_id']}  status={supplier_row['negotiation_status']}")
    else:
        print("      [suppliers] No row found.")

    await pg.close()

    total_elapsed = time.perf_counter() - total_start
    print(f"\n✓ Smoke test complete.  Total time: {total_elapsed:.2f}s\n")


if __name__ == "__main__":
    asyncio.run(main())
