"""
Converts domain API entities into rich natural-language text blocks that
embed well for semantic search.

Each serialiser method returns a single string.  The semantic chunker
decides whether to split it further.
"""

from __future__ import annotations

from domain.entities import (
    Agreement,
    BuyingEntity,
    BuyingEntityUltimateParent,
    Spend,
    SpendFileVersion,
    Supplier,
    SupplierUltimateParent,
    Target,
    Tenant,
)


class EntitySerializer:
    # ── Public dispatch ───────────────────────────────────────────────────────

    def serialize(self, entity: object) -> str:
        if isinstance(entity, Spend):
            return self.spend(entity)
        if isinstance(entity, Supplier):
            return self.supplier(entity)
        if isinstance(entity, SupplierUltimateParent):
            return self.supplier_ultimate_parent(entity)
        if isinstance(entity, BuyingEntity):
            return self.buying_entity(entity)
        if isinstance(entity, BuyingEntityUltimateParent):
            return self.buying_entity_ultimate_parent(entity)
        if isinstance(entity, SpendFileVersion):
            return self.spend_file_version(entity)
        if isinstance(entity, Tenant):
            return self.tenant(entity)
        raise TypeError(f"No serialiser for {type(entity)}")

    # ── Entity serialisers ────────────────────────────────────────────────────

    def tenant(self, t: Tenant) -> str:
        return (
            f"Tenant: {t.name} (ID: {t.tenant_id})\n"
            f"Country: {t.country}\n"
            f"Last updated: {t.ada_updated_at}"
        )

    def spend_file_version(self, sfv: SpendFileVersion) -> str:
        return (
            f"Spend File Version: {sfv.name}\n"
            f"Tenant: {sfv.tenant_id or sfv.tenant_uuid}\n"
            f"Period: {sfv.start_date} to {sfv.end_date}\n"
            f"Total spend volume: ${sfv.spend_volume:,.2f} USD\n"
            f"Suppliers: {sfv.supplier_count} | Spend lines: {sfv.spend_count}\n"
            f"Last updated: {sfv.ada_updated_at}"
        )

    def spend(self, s: Spend) -> str:
        lines = [
            f"Spend Line: {s.alias}",
            f"Tenant: {s.tenant_id} | Spend file version: {s.spend_file_version_uuid}",
            f"Supplier ID: {s.supplier_uuid} | Buying entity ID: {s.buying_entity_uuid}",
            f"Volume: ${s.spend_volume:,.2f} USD (transaction currency: {s.transaction_currency})",
            f"Commodity: {s.commodity} | Procurement team: {s.procurement_team}",
            f"Negotiation status: {s.negotiation_status}",
            f"Program applied: {s.program_applied or 'None'} | "
            f"SCF active: {s.currently_on_scf} | vCard active: {s.currently_on_vcard}",
            f"Base rate: {s.base_rate:.4f} ({s.base_rate*100:.2f}%)",
        ]
        if s.scf_rate is not None:
            lines.append(f"SCF rate: {s.scf_rate:.4f} ({s.scf_rate*100:.2f}%)")
        lines += [
            f"Actual payment terms: {s.actual_payment_terms} days | "
            f"Term description: {s.term_description}",
            f"Contractual without cash discounts: {s.contractual_without_cash_discounts} days | "
            f"With cash discounts: {s.contractual_with_cash_discounts} days",
            f"Cash discount: {s.cash_discount_percentage}%",
            f"Last term negotiation: {s.last_term_negotiation or 'N/A'}",
            f"Aggregated lines count: {s.aggregated_lines_count}",
        ]
        if s.custom_data_points:
            cdp = " | ".join(f"{p.name}={p.value}" for p in s.custom_data_points)
            lines.append(f"Custom data: {cdp}")
        if s.target:
            lines.append(_target_text(s.target))
        if s.agreement:
            lines.append(_agreement_text(s.agreement, include_acceptance=True))
        if s.negotiation_strategy:
            lines.append(_strategy_text(s.negotiation_strategy))
        lines.append(f"Last updated: {s.ada_updated_at}")
        return "\n".join(lines)

    def supplier(self, s: Supplier) -> str:
        lines = [
            f"Supplier: {s.name} (received as: {s.received_name})",
            f"Tenant: {s.tenant_id} | SFV: {s.spend_file_version_uuid}",
        ]
        if s.ultimate_parent_uuid:
            lines.append(f"Ultimate parent ID: {s.ultimate_parent_uuid}")
        lines += _common_supplier_lines(s)
        if s.target:
            lines.append(_target_text(s.target))
        if s.agreement:
            lines.append(_agreement_text(s.agreement, include_acceptance=False))
        if s.negotiation_strategy:
            lines.append(_strategy_text(s.negotiation_strategy))
        lines.append(f"Last updated: {s.ada_updated_at}")
        return "\n".join(lines)

    def supplier_ultimate_parent(self, s: SupplierUltimateParent) -> str:
        lines = [
            f"Supplier Ultimate Parent: {s.name} (received as: {s.received_name})",
            f"Tenant: {s.tenant_id} | SFV: {s.spend_file_version_uuid}",
        ]
        lines += _common_supplier_lines(s)
        if s.target:
            lines.append(_target_text(s.target))
        if s.agreement:
            lines.append(_agreement_text(s.agreement, include_acceptance=False))
        if s.negotiation_strategy:
            lines.append(_strategy_text(s.negotiation_strategy))
        lines.append(f"Last updated: {s.ada_updated_at}")
        return "\n".join(lines)

    def buying_entity(self, b: BuyingEntity) -> str:
        lines = [
            f"Buying Entity: {b.name}",
            f"Country: {b.country}",
            f"Tenant: {b.tenant_id} | SFV: {b.spend_file_version_uuid}",
        ]
        if b.ultimate_parent_uuid:
            lines.append(f"Ultimate parent ID: {b.ultimate_parent_uuid}")
        lines.append(f"Last updated: {b.ada_updated_at}")
        return "\n".join(lines)

    def buying_entity_ultimate_parent(self, b: BuyingEntityUltimateParent) -> str:
        lines = [
            f"Buying Entity Ultimate Parent: {b.name}",
            f"Country: {b.country} | Address: {b.address}",
            f"Industry: {b.main_industry_name} (NAICS {b.main_industry_code})",
            f"Company size: {b.company_size} | External ID: {b.external_id}",
            f"Tenant: {b.tenant_id} | SFV: {b.spend_file_version_uuid}",
        ]
        if b.description:
            lines.insert(1, f"Description: {b.description}")
        if b.url:
            lines.append(f"Website: {b.url}")
        lines.append(f"Last updated: {b.ada_updated_at}")
        return "\n".join(lines)


# ── Private helpers ────────────────────────────────────────────────────────────

def _common_supplier_lines(s: Supplier | SupplierUltimateParent) -> list[str]:
    lines = [
        f"Country: {s.country} | Country rating: {s.country_rating}",
        f"Industry: {s.main_industry_name} (NAICS {s.main_industry_code})",
        f"Ownership: {s.ownership} | Company size: {s.company_size} | "
        f"Entity type: {s.entity_type}",
        f"External ID: {s.external_id} | Internal ID: {s.provided_internal_id}",
        f"Spend volume: ${s.spend_volume:,.2f} USD",
        f"Negotiation status: {s.negotiation_status} | "
        f"Program applied: {s.program_applied or 'None'}",
        f"Success probability: {s.success_probability} | "
        f"9-box position: {s.nine_box_term_extension}",
        f"Buyer leverage: {s.entity_buyer_leverage_level} | "
        f"Supplier leverage: {s.entity_supplier_leverage_level}",
        f"DSO: {s.dso} days",
        f"WACC pre-tax: {s.wacc_pre_tax*100:.2f}% | "
        f"WACC after-tax: {s.wacc_after_tax*100:.2f}% | "
        f"Supplier financing rate: {s.supplier_financing_rate*100:.2f}%",
        f"Cost of debt spread: {s.cost_of_debt_spread*100:.3f}%",
    ]
    if s.credit_rating:
        lines.append(
            f"Credit rating: {s.credit_rating} ({s.credit_rating_source or 'N/A'})"
        )
    if s.scf_rate is not None:
        lines.append(f"SCF rate (WAVG): {s.scf_rate*100:.2f}%")
    diversity = [
        flag
        for flag, active in [
            ("Ethnic minority owned", s.ethnic_minority_owned_business),
            ("Woman owned", s.woman_owned_business),
            ("Veteran owned", s.veteran_owned_business),
            ("SME", s.is_sme),
        ]
        if active
    ]
    if diversity:
        lines.append("Diversity flags: " + ", ".join(diversity))
    if s.stock_ticker:
        lines.append(f"Stock ticker: {s.stock_ticker}")
    if s.description:
        lines.insert(0, f"Description: {s.description}")
    return lines


def _target_text(t: Target) -> str:
    return (
        f"Target: opportunity={t.opportunity_payment_terms}d | "
        f"target={t.target_payment_terms}d | "
        f"cash flow=${t.target_cash_flow:,.2f}"
    )


def _agreement_text(a: Agreement, include_acceptance: bool) -> str:
    parts = [
        f"Agreement: {a.agreed_terms_without_cash_discounts}d (no discount) | "
        f"{a.agreed_terms_with_cash_discounts}d (with discount) | "
        f"{a.agreed_cash_discount_percentage}% cash discount"
    ]
    if include_acceptance:
        if a.scf_accepted is not None:
            parts.append(f"SCF accepted: {a.scf_accepted}")
        if a.vcard_accepted is not None:
            parts.append(f"vCard accepted: {a.vcard_accepted}")
    return " | ".join(parts)


def _strategy_text(ns: dict) -> str:
    entries = []
    for name, entry in ns.items():
        if not entry or entry.get("value") is None:
            continue
        flag = "✓" if entry.get("applied") else "–"
        entries.append(f"{name}={entry['value']}d({flag})")
    if not entries:
        return "Negotiation strategy: N/A"
    return "Strategies: " + " | ".join(entries)
