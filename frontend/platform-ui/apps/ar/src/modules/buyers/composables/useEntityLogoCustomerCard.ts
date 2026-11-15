/**
 * Makes every design-system `EntityLogoColumn` cell whose row carries a `partyId` (the Opportunity
 * Overview's Buyers/Parents levels, the nine-box and waterfall-bucket drill-downs...) open that
 * party's Customer Card modal. Provided once from `App.vue`, next to `CustomerCardModal` itself,
 * rather than wired into each grid: the cell sits inside `GraphqlGrid`'s own slot templates with no
 * event path back to whichever screen hosts it (see design-system's `entityLogoClick.ts`).
 */
import { provide } from 'vue'
import { ENTITY_LOGO_CLICK_KEY } from '@ada/design-system/components/grid/custom-columns/entityLogoClick'
import type { PartyRole } from '@/api'
import type { PartyOverviewRow, SaleLineOverviewRow } from '@/modules/opportunity/data/overviewRows'
import { useContextStore } from '@/stores/context'
import type { CustomerCardIdentity } from '@/stores/customerCardModal'
import { useOpenCustomerCard } from './useOpenCustomerCard'

/** The overview projections spell roles upper-case (`COUNTERPARTY`/`PARENT`); `BuyerCardRow` uses
 * the REST roster's own `PartyRole` casing. */
function toPartyRole(role: string | undefined): PartyRole {
  switch (role?.toUpperCase()) {
    case 'PARENT':
      return 'Parent'
    case 'SELF':
      return 'Self'
    default:
      return 'Counterparty'
  }
}

/** Same idea as `CustomerCardCorporateTreeTab.toCustomerCardIdentity`: seeds the modal's header
 * from the row already on hand. `resolution`/`lifecycle`/`creditRating` have no source on an
 * overview row and are left at their "unknown" default rather than guessed at. */
export function partyRowToCustomerCardIdentity(
  row: PartyOverviewRow & Pick<SaleLineOverviewRow, 'buyerName'> & { partyId: number },
): CustomerCardIdentity {
  return {
    id: row.partyId,
    // A sale-line row has no `role` - it always opens its buyer, a Counterparty (toPartyRole's
    // default).
    role: toPartyRole(row.role),
    resolution: '',
    lifecycle: '',
    // A sale-line row names its buyer `buyerName`; the party levels use `name`.
    name: row.name ?? row.buyerName ?? null,
    originalName: row.originalName ?? null,
    url: row.url ?? null,
    volume: row.volume ?? null,
    forecastVolume: row.forecastVolume ?? null,
    negotiationStatus: row.negotiationStatus ?? null,
    negotiationStatusCode: row.negotiationStatusCode ?? null,
    parentId: row.parentId ?? null,
    parentName: row.parentName ?? null,
    saleLineCount: row.saleLineCount ?? 0,
    // The country's name, not its code - `CustomerCardHeader` renders it as-is.
    country: row.countryName ?? null,
    industry: row.industryName ?? null,
    isSme: row.isSme ?? null,
    smeSource: null,
    isPilot: row.isPilot ?? false,
    creditLimit: row.creditLimit ?? null,
    creditRating: null,
    actualPaymentTermsAvg: row.actualPaymentTermsAvg ?? null,
    contractualPaymentTermsWithCashDiscountsAvg: row.contractualPaymentTermsWithCashDiscountsAvg ?? null,
    contractualPaymentTermsWithoutCashDiscountsAvg: row.contractualPaymentTermsWithoutCashDiscountsAvg ?? null,
    countryFlagUrl: row.countryFlagUrl ?? null,
    logoUrl: row.logoUrl ?? null,
  }
}

export function useEntityLogoCustomerCard(): void {
  const context = useContextStore()
  const { openCustomerCard } = useOpenCustomerCard()

  provide(ENTITY_LOGO_CLICK_KEY, (dataItem) => {
    const row = dataItem as PartyOverviewRow & Pick<SaleLineOverviewRow, 'buyerName'>
    if (!context.saleFileVersionId || typeof row.partyId !== 'number') {
      return
    }
    // On a sale-line row `partyId` is the line's buyer (`partyId: buyerId`), so the visit is
    // recorded against that buyer - the card actually opened.
    openCustomerCard(context.saleFileVersionId, row.partyId, {
      initialBuyer: partyRowToCustomerCardIdentity({ ...row, partyId: row.partyId }),
    })
  })
}
