import type { SaleLineCustomAttributeValue, SaleLineDetailDto } from '@/api'
import { formatDate, formatDateTime, formatNumber } from '@/modules/match/utils/format'
import { formatMoney } from '@/utils/moneyFormatting'
import { humanizeInputKey } from './strategyInputs'

/**
 * How one `SaleLineDetailDto` field's value is shaped, which decides which shared formatter
 * renders it. Not derived from the field's TypeScript type at runtime (there is no such
 * reflection) - each field below is assigned its kind by hand, once, alongside the group it
 * belongs to.
 *
 * `'money'` is its own kind, distinct from `'number'` (UC-UI-23): this view is a generic field
 * dump over the whole DTO, and a plain `'number'` covers everything from an id to a day count to a
 * WACC percentage - routing all of it through the money formatter would put a currency symbol on
 * fields that are not money, which the story's AC#4 forbids. Each field below was classified by
 * its own name/domain meaning, cross-checked against `packages/design-system/src/data/
 * globalColumns.ts`'s own `moneyTemplate` cell assignments where an equivalent field exists there
 * (`volume`, `forecastVolume`, `capturedCashDiscounts`) - the rest (the impact/EP family, the
 * vCard transaction-size/volume fields) are money by their own name and have no globalColumns
 * counterpart to check against directly.
 */
type SaleLineFieldKind = 'number' | 'money' | 'text' | 'boolean' | 'date' | 'dateTime'

interface SaleLineFieldDef {
  key: keyof SaleLineDetailDto
  kind: SaleLineFieldKind
}

interface SaleLineFieldGroup {
  /** i18n key for the section heading (`arSaleLine.sections.<group>`). */
  titleKey: string
  fields: SaleLineFieldDef[]
}

/**
 * Every mapped field of `SaleLineDetailDto` (57 `SaleLine` fields + 18 enrichment fields),
 * grouped for the line detail view exactly as UC-UI-13 asks: identity and dates, volume and
 * terms, negotiation, WACC and credit, virtual card, then the enrichment block. `customAttributes`
 * is deliberately absent - it renders separately, in declaration order, keyed by its own
 * `ordinal`/`title` rather than a group here.
 *
 * The five structurally-always-null fields (`buyerName`/`buyerCountry`/`supplierEntityName`/
 * `supplierEntityCountry`/`invoiceCurrency` - see their own doc comment on
 * `SaleLineDetailDto`) sit in the identity group like any other field, on purpose: Global
 * Constraint says render what the response carries, and hiding or annotating them would be this
 * view deciding they are less real than the rest of the row.
 */
export const SALE_LINE_FIELD_GROUPS: SaleLineFieldGroup[] = [
  {
    titleKey: 'arSaleLine.sections.identity',
    fields: [
      { key: 'id', kind: 'number' },
      { key: 'saleFileVersionId', kind: 'number' },
      { key: 'companyId', kind: 'number' },
      { key: 'buyerId', kind: 'number' },
      { key: 'supplierId', kind: 'number' },
      { key: 'currencyId', kind: 'number' },
      { key: 'salesTeam', kind: 'text' },
      { key: 'startDate', kind: 'date' },
      { key: 'endDate', kind: 'date' },
      { key: 'year', kind: 'number' },
      { key: 'periodInMonths', kind: 'number' },
      { key: 'commodity', kind: 'text' },
      { key: 'originalCommodity', kind: 'text' },
      { key: 'internalId', kind: 'text' },
      { key: 'aggregatedLinesCount', kind: 'number' },
      { key: 'alias', kind: 'text' },
      { key: 'buyerName', kind: 'text' },
      { key: 'buyerCountry', kind: 'text' },
      { key: 'supplierEntityName', kind: 'text' },
      { key: 'supplierEntityCountry', kind: 'text' },
      { key: 'invoiceCurrency', kind: 'text' },
    ],
  },
  {
    titleKey: 'arSaleLine.sections.volumeTerms',
    fields: [
      { key: 'volume', kind: 'money' },
      { key: 'forecastVolume', kind: 'money' },
      { key: 'actualPaymentTerms', kind: 'number' },
      { key: 'contractualActual', kind: 'number' },
      { key: 'contractualPaymentTermsWithCashDiscounts', kind: 'number' },
      { key: 'contractualPaymentTermsWithoutCashDiscounts', kind: 'number' },
      { key: 'buyerPaymentTermPolicy', kind: 'number' },
      // cashDiscounts is a rate/fraction (globalColumns.ts's own `cashDiscounts` export uses
      // `percentColumn`, not `moneyTemplate`), not a dollar amount - capturedCashDiscounts IS
      // money there (`moneyTemplate`) despite the similar name.
      { key: 'cashDiscounts', kind: 'number' },
      { key: 'capturedCashDiscounts', kind: 'money' },
      { key: 'averageDaysToApproveInvoice', kind: 'number' },
      { key: 'usingWorkingCapitalFinance', kind: 'boolean' },
    ],
  },
  {
    titleKey: 'arSaleLine.sections.negotiation',
    fields: [
      { key: 'dateOfLastTermNegotiation', kind: 'date' },
      { key: 'reason', kind: 'text' },
      { key: 'reasonManuallySetAt', kind: 'dateTime' },
      { key: 'targetPaymentTerms', kind: 'number' },
      { key: 'negotiationStatus', kind: 'text' },
      { key: 'negotiationStatusCode', kind: 'number' },
      { key: 'negotiationStatusUpdatedAt', kind: 'dateTime' },
      { key: 'isPilot', kind: 'boolean' },
    ],
  },
  {
    titleKey: 'arSaleLine.sections.wacc',
    fields: [
      { key: 'afterTaxWacc', kind: 'number' },
      { key: 'preTaxWacc', kind: 'number' },
      { key: 'waccSource', kind: 'text' },
      { key: 'waccFromParent', kind: 'boolean' },
      { key: 'creditScore', kind: 'number' },
      { key: 'dataQuality', kind: 'number' },
    ],
  },
  {
    titleKey: 'arSaleLine.sections.virtualCard',
    fields: [
      { key: 'vCardAverageTransactionSize', kind: 'money' },
      { key: 'vCardNumberOfPayments', kind: 'number' },
      { key: 'vCardNumberOfInvoices', kind: 'number' },
      { key: 'vCardIsAlreadyInUse', kind: 'boolean' },
      { key: 'vCardVolume', kind: 'money' },
      { key: 'vCardAcceptanceType', kind: 'text' },
      { key: 'vCardProvider', kind: 'text' },
      { key: 'vCardPaymentMethod', kind: 'text' },
      { key: 'vCardLargestTransactionSize', kind: 'money' },
      { key: 'vCardIndirectSpend', kind: 'boolean' },
    ],
  },
  {
    // SaleLineEnrichment: null exactly when the calculation has not reached this line yet, never
    // an error - every field here is nullable on the DTO for that reason, and this group renders
    // the same whether it is entirely null or entirely populated.
    titleKey: 'arSaleLine.sections.enrichment',
    fields: [
      { key: 'calculatedPaymentTerms', kind: 'number' },
      { key: 'calculatedPaymentTermsSource', kind: 'text' },
      { key: 'weightedPaymentTerms', kind: 'number' },
      { key: 'effectiveCashDiscountRate', kind: 'number' },
      // Sits beside financingRate (a rate, below) rather than the impact/EP money family above -
      // treated as a rate/cost-of-funding percentage rather than a dollar figure, the same
      // judgment call financingRate itself represents; flagged here rather than guessed silently
      // (see this story's designNotes for the open question, not verified against a backend DTO
      // doc from this frontend-only worktree).
      { key: 'fundingCost', kind: 'number' },
      { key: 'winningStrategy', kind: 'text' },
      { key: 'recommendedTerm', kind: 'number' },
      { key: 'currentTerm', kind: 'number' },
      { key: 'expectedTerm', kind: 'number' },
      { key: 'cashFlowImpact', kind: 'money' },
      { key: 'economicProfitImpact', kind: 'money' },
      { key: 'economicProfitBuyerImpact', kind: 'money' },
      { key: 'expectedCashFlowImpact', kind: 'money' },
      { key: 'expectedEconomicProfitImpact', kind: 'money' },
      { key: 'expectedEconomicProfitBuyerImpact', kind: 'money' },
      { key: 'financingRate', kind: 'number' },
    ],
  },
  {
    // UC-UI-26 FR2: this line's own Market Share/Switching Cost bands get their own section
    // rather than disappearing into the calculation-results block above. Band only - the
    // backend's own Low/Medium/High string, never re-banded here (G-746).
    titleKey: 'arSaleLine.sections.marketPosition',
    fields: [
      { key: 'marketShareLevel', kind: 'text' },
      { key: 'switchingCostLevel', kind: 'text' },
    ],
  },
]

/**
 * i18n key for every field above (`arSaleLine.fields.<key>`) - a lookup table, not a computed
 * pattern, so a translator can rename a key's locale string without also renaming the field.
 *
 * Deliberately `Partial`: {@link resolveSaleLineFieldLabel} falls back to a humanized label for
 * any key missing here. That covers a narrower gap than it might look like - a field that is
 * already in one of {@link SALE_LINE_FIELD_GROUPS}'s lists but has no entry here yet (the
 * maintenance slip of wiring up a field without also adding its translation). It is NOT
 * protection for a brand-new `SaleLineDetailDto` field on its own: what renders on this view is
 * driven entirely by `SALE_LINE_FIELD_GROUPS`, a hand-written list, so a field absent from every
 * group there is not rendered at all, labelled or not. That is a known limit of a hand-maintained
 * list on a provisional screen, not something this fallback closes.
 */
const SALE_LINE_FIELD_LABEL_KEYS: Partial<Record<keyof SaleLineDetailDto, string>> = {
  id: 'arSaleLine.fields.id',
  saleFileVersionId: 'arSaleLine.fields.saleFileVersionId',
  companyId: 'arSaleLine.fields.companyId',
  buyerId: 'arSaleLine.fields.buyerId',
  supplierId: 'arSaleLine.fields.supplierId',
  currencyId: 'arSaleLine.fields.currencyId',
  salesTeam: 'arSaleLine.fields.salesTeam',
  startDate: 'arSaleLine.fields.startDate',
  endDate: 'arSaleLine.fields.endDate',
  year: 'arSaleLine.fields.year',
  periodInMonths: 'arSaleLine.fields.periodInMonths',
  commodity: 'arSaleLine.fields.commodity',
  originalCommodity: 'arSaleLine.fields.originalCommodity',
  internalId: 'arSaleLine.fields.internalId',
  aggregatedLinesCount: 'arSaleLine.fields.aggregatedLinesCount',
  alias: 'arSaleLine.fields.alias',
  buyerName: 'arSaleLine.fields.buyerName',
  buyerCountry: 'arSaleLine.fields.buyerCountry',
  supplierEntityName: 'arSaleLine.fields.supplierEntityName',
  supplierEntityCountry: 'arSaleLine.fields.supplierEntityCountry',
  invoiceCurrency: 'arSaleLine.fields.invoiceCurrency',
  volume: 'arSaleLine.fields.volume',
  forecastVolume: 'arSaleLine.fields.forecastVolume',
  actualPaymentTerms: 'arSaleLine.fields.actualPaymentTerms',
  contractualActual: 'arSaleLine.fields.contractualActual',
  contractualPaymentTermsWithCashDiscounts: 'arSaleLine.fields.contractualPaymentTermsWithCashDiscounts',
  contractualPaymentTermsWithoutCashDiscounts: 'arSaleLine.fields.contractualPaymentTermsWithoutCashDiscounts',
  buyerPaymentTermPolicy: 'arSaleLine.fields.buyerPaymentTermPolicy',
  cashDiscounts: 'arSaleLine.fields.cashDiscounts',
  capturedCashDiscounts: 'arSaleLine.fields.capturedCashDiscounts',
  averageDaysToApproveInvoice: 'arSaleLine.fields.averageDaysToApproveInvoice',
  usingWorkingCapitalFinance: 'arSaleLine.fields.usingWorkingCapitalFinance',
  dateOfLastTermNegotiation: 'arSaleLine.fields.dateOfLastTermNegotiation',
  reason: 'arSaleLine.fields.reason',
  reasonManuallySetAt: 'arSaleLine.fields.reasonManuallySetAt',
  targetPaymentTerms: 'arSaleLine.fields.targetPaymentTerms',
  negotiationStatus: 'arSaleLine.fields.negotiationStatus',
  negotiationStatusCode: 'arSaleLine.fields.negotiationStatusCode',
  negotiationStatusUpdatedAt: 'arSaleLine.fields.negotiationStatusUpdatedAt',
  isPilot: 'arSaleLine.fields.isPilot',
  afterTaxWacc: 'arSaleLine.fields.afterTaxWacc',
  preTaxWacc: 'arSaleLine.fields.preTaxWacc',
  waccSource: 'arSaleLine.fields.waccSource',
  waccFromParent: 'arSaleLine.fields.waccFromParent',
  creditScore: 'arSaleLine.fields.creditScore',
  dataQuality: 'arSaleLine.fields.dataQuality',
  vCardAverageTransactionSize: 'arSaleLine.fields.vCardAverageTransactionSize',
  vCardNumberOfPayments: 'arSaleLine.fields.vCardNumberOfPayments',
  vCardNumberOfInvoices: 'arSaleLine.fields.vCardNumberOfInvoices',
  vCardIsAlreadyInUse: 'arSaleLine.fields.vCardIsAlreadyInUse',
  vCardVolume: 'arSaleLine.fields.vCardVolume',
  vCardAcceptanceType: 'arSaleLine.fields.vCardAcceptanceType',
  vCardProvider: 'arSaleLine.fields.vCardProvider',
  vCardPaymentMethod: 'arSaleLine.fields.vCardPaymentMethod',
  vCardLargestTransactionSize: 'arSaleLine.fields.vCardLargestTransactionSize',
  vCardIndirectSpend: 'arSaleLine.fields.vCardIndirectSpend',
  calculatedPaymentTerms: 'arSaleLine.fields.calculatedPaymentTerms',
  calculatedPaymentTermsSource: 'arSaleLine.fields.calculatedPaymentTermsSource',
  weightedPaymentTerms: 'arSaleLine.fields.weightedPaymentTerms',
  effectiveCashDiscountRate: 'arSaleLine.fields.effectiveCashDiscountRate',
  fundingCost: 'arSaleLine.fields.fundingCost',
  winningStrategy: 'arSaleLine.fields.winningStrategy',
  recommendedTerm: 'arSaleLine.fields.recommendedTerm',
  currentTerm: 'arSaleLine.fields.currentTerm',
  expectedTerm: 'arSaleLine.fields.expectedTerm',
  cashFlowImpact: 'arSaleLine.fields.cashFlowImpact',
  economicProfitImpact: 'arSaleLine.fields.economicProfitImpact',
  economicProfitBuyerImpact: 'arSaleLine.fields.economicProfitBuyerImpact',
  expectedCashFlowImpact: 'arSaleLine.fields.expectedCashFlowImpact',
  expectedEconomicProfitImpact: 'arSaleLine.fields.expectedEconomicProfitImpact',
  expectedEconomicProfitBuyerImpact: 'arSaleLine.fields.expectedEconomicProfitBuyerImpact',
  financingRate: 'arSaleLine.fields.financingRate',
  marketShareLevel: 'arSaleLine.fields.marketShareLevel',
  switchingCostLevel: 'arSaleLine.fields.switchingCostLevel',
}

/**
 * A field's label: its translated locale string when {@link SALE_LINE_FIELD_LABEL_KEYS} has an
 * entry for it, or the key itself humanized (`humanizeInputKey`, the same camelCase splitter the
 * strategy `inputs` rows already use) when it does not. The function itself has no notion of
 * groups - the map-miss fallback tested here is the general contract; whether a given key ever
 * reaches this function at all is decided by `SALE_LINE_FIELD_GROUPS` (see that lookup table's own
 * comment above).
 */
export function resolveSaleLineFieldLabel(key: string, translate: (labelKey: string) => string): string {
  const labelKey = SALE_LINE_FIELD_LABEL_KEYS[key as keyof SaleLineDetailDto]
  return labelKey ? translate(labelKey) : humanizeInputKey(key)
}

function formatSaleLineFieldValue(
  kind: SaleLineFieldKind,
  value: unknown,
  translate: (labelKey: string) => string,
  currencySymbol: string,
): string {
  switch (kind) {
    case 'number':
      return formatNumber(value as number | null | undefined)
    case 'money':
      return formatMoney(value as number | null | undefined, currencySymbol)
    case 'date':
      return formatDate(value as string | null | undefined)
    case 'dateTime':
      return formatDateTime(value as string | null | undefined)
    case 'boolean':
      return value === null || value === undefined
        ? translate('arSaleLine.notAvailable')
        : translate(`arSaleLine.yesNo.${value as boolean}`)
    case 'text':
    default:
      return (value as string | null | undefined) ?? translate('arSaleLine.notAvailable')
  }
}

/** One field, ready to render: its raw key (for a `:key` binding), its label and its formatted
 * value - the same shape `StrategyInputRow` gives a strategy's own inputs. */
export interface SaleLineFieldRow {
  key: string
  label: string
  value: string
}

/** Turns one group's field defs into ordered, labelled, formatted rows against a loaded line.
 * `currencySymbol` (UC-UI-23) is only ever consulted for a `'money'`-kind field - every other kind
 * ignores it, so a caller need not special-case anything to pass its own
 * `useArCurrenciesStore().selectedCurrencySymbol` through unconditionally. */
export function deriveSaleLineFieldRows(
  line: SaleLineDetailDto,
  fields: SaleLineFieldDef[],
  translate: (labelKey: string) => string,
  currencySymbol: string,
): SaleLineFieldRow[] {
  return fields.map((field) => ({
    key: field.key,
    label: resolveSaleLineFieldLabel(field.key, translate),
    value: formatSaleLineFieldValue(field.kind, line[field.key], translate, currencySymbol),
  }))
}

/**
 * One custom attribute value, ready to render, in the declaration order `customAttributes`
 * already carries (UC-MOD-08) - never re-sorted here.
 *
 * `title` comes straight off the backend's own declaration, not a label map: unlike the fixed
 * `SaleLineDetailDto` fields above, a tenant's custom attributes are open vocabulary by
 * definition, so there is no fixed key for a lookup table to key on.
 */
export function deriveCustomAttributeRows(
  attributes: SaleLineCustomAttributeValue[],
  translate: (labelKey: string) => string,
): SaleLineFieldRow[] {
  return attributes.map((attribute) => ({
    key: String(attribute.ordinal),
    label: attribute.title,
    value: formatCustomAttributeValue(attribute, translate),
  }))
}

function formatCustomAttributeValue(
  attribute: SaleLineCustomAttributeValue,
  translate: (labelKey: string) => string,
): string {
  if (!attribute.supplied || attribute.value === null || attribute.value === undefined) {
    return translate('arSaleLine.notSupplied')
  }
  // Mirrors deriveInputRows' own formatInputValue: an object/array value renders as JSON rather
  // than the useless "[object Object]", everything else as its plain string form.
  if (typeof attribute.value === 'object') {
    return JSON.stringify(attribute.value)
  }
  return String(attribute.value)
}
