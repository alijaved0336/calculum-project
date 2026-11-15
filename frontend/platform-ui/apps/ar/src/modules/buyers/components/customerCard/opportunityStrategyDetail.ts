import type {
  OpportunityExtraInfoCards,
  OpportunityInfoCard,
  OpportunityStrategyCalculationMethod,
  OpportunityStrategyDetails,
  OpportunityStrategyExtraKey,
  OpportunityTermExtraKey,
} from '@/api'

/** One drill-down member - a strategy's extra (figures + method) or a term's (just `terms`). */
export interface DetailExtraMember {
  terms: number | null
  details?: OpportunityStrategyDetails | null
  calculationMethod?: OpportunityStrategyCalculationMethod | null
}

export type DetailExtraKey = OpportunityStrategyExtraKey | OpportunityTermExtraKey

/** Either `strategies[].extra` or `terms[].extra`, whichever bar was clicked - its members, plus
 * the entry's own `infoCards` list riding alongside them. */
export type DetailExtraMap = Partial<Record<DetailExtraKey, DetailExtraMember>> & OpportunityExtraInfoCards

/** The entry behind a bar: its own term plus its extra, if any. */
export interface BenchmarkEntry {
  key: string
  terms: number | null
  extra: DetailExtraMap | null
  /** The panel's cards, if the backend ever sends them on the entry itself rather than inside
   * `extra` - `extra.infoCards` wins when both are present. */
  infoCards?: OpportunityInfoCard[] | null
}

/** Which right-hand panel a bar opens - one per distinct panel (Avg. Days Paid (DSO) shares
 * `contractual`'s). */
export type BenchmarkPanelKey =
  | 'contractual'
  | 'opportunity'
  | 'target'
  | 'regulatory'
  | 'buyerStandard'
  | 'peerGroupStandard'
  | 'creditLimitMax'
  | 'buyerPolicy'
  | 'industryRegionStandard'
  | 'parentBuyerMin'
  | 'harmonization'

export type PanelBadgeKey = keyof OpportunityStrategyDetails | 'salesLines'

export interface PanelBadge {
  key: PanelBadgeKey
  value: number | null
  active: boolean
}

/** One band: a titled term bar with its badges underneath. `titleKey` resolves under
 * `arCustomerCard.opportunity.benchmarks.extra.*`. */
export interface PanelBand {
  titleKey: string
  terms: number | null
  badges: PanelBadge[]
}

export type PanelCardFormat = 'signedMoney' | 'money' | 'days' | 'percent' | 'count' | 'text'

/** One metric card. `key` resolves under `arCustomerCard.opportunity.benchmarks.cards.*`. */
export interface PanelCard {
  key: string
  /** Null when the backend sent the card without a value - still rendered, reading "N/A". */
  value: number | string | null
  format: PanelCardFormat
}

export interface BenchmarkPanel {
  bands: PanelBand[]
  cards: PanelCard[]
}

/** `calculationMethod` -> the `details` field it picked. The backend only ever sends its wire
 * vocabulary (`MetricsExtensions.ToWireString`: `min`/`avg`/`1q`/`3q`/`max`); the `details` field
 * names themselves and `q1` are accepted too, so a spelling drift still highlights the right badge.
 * `3q` has no `details` counterpart (the endpoint only carries the first quartile), and
 * `occurrences` is a count, never a calculation method - neither highlights anything. */
export const METHOD_TO_DETAIL_KEY: Record<OpportunityStrategyCalculationMethod | string, keyof OpportunityStrategyDetails | undefined> = {
  avg: 'average',
  average: 'average',
  '1q': 'firstQuartile',
  q1: 'firstQuartile',
  firstQuartile: 'firstQuartile',
  min: 'min',
  max: 'max',
  saleLineCount: 'saleLineCount'
}

function byValueDesc(a: PanelBadge, b: PanelBadge): number {
  if (a.value == null) return b.value == null ? 0 : 1
  if (b.value == null) return -1
  return b.value - a.value
}

/** The given `details` figures as badges, highest value first (nulls last); the one
 * `calculationMethod` picked is `active`. */
export function toDetailBadges(
  member: DetailExtraMember | undefined,
  keys: (keyof OpportunityStrategyDetails)[],
): PanelBadge[] {
  const activeKey = member?.calculationMethod ? METHOD_TO_DETAIL_KEY[member.calculationMethod] : undefined
  return keys
    .map((key) => ({ key, value: member?.details?.[key] ?? null, active: key === activeKey }))
    .sort(byValueDesc)
}

/** Which badges a panel's bands carry, per the work item - applied to every `extra` member alike. */
/** The backend's own `details.saleLineCount` - the sale lines behind the member's term (ADA's
 * `spends`; for Parent Min, the parent family's lines). */
function salesLinesBadge(member: DetailExtraMember): PanelBadge {
  return { key: 'salesLines', value: member.details?.saleLineCount ?? null, active: false }
}

function badgesFor(panelKey: BenchmarkPanelKey, member: DetailExtraMember): PanelBadge[] {
  switch (panelKey) {
    case 'buyerStandard':
    case 'peerGroupStandard':
      return toDetailBadges(member, ['average', 'firstQuartile'])
    case 'industryRegionStandard':
      // Sales Lines sorts with the term figures, highest first.
      return [
        salesLinesBadge(member),
        ...toDetailBadges(member, ['min', 'firstQuartile', 'max', 'average']),
      ].sort(byValueDesc)
    case 'parentBuyerMin':
      // The backend sends Buyer / Parent Min's details as the sale line count alone; any other
      // figure it may add later sorts in with it, highest first.
      return [
        salesLinesBadge(member),
        ...toDetailBadges(member, ['average', 'firstQuartile', 'min', 'max']),
      ].sort(byValueDesc)
    default:
      return []
  }
}

/** One band per member the backend actually sent in `extra`, in its own order - `infoCards` rides
 * in the same object but is the panel's cards, never a band. A badge whose figure did not come
 * back is left out rather than shown empty. */
function bandsFrom(panelKey: BenchmarkPanelKey, extra: DetailExtraMap | null): PanelBand[] {
  if (!extra) return []
  const { infoCards: _cards, ...members } = extra
  return (Object.entries(members) as [DetailExtraKey, DetailExtraMember | undefined][])
    .filter((entry): entry is [DetailExtraKey, DetailExtraMember] => entry[1] != null)
    .map(([key, member]) => ({
      titleKey: key,
      terms: member.terms,
      badges: badgesFor(panelKey, member).filter((badge) => badge.value != null),
    }))
}

/** ADA's own `infoCards[]` keys -> this panel's card keys, where the two differ. */
const INFO_CARD_KEY_ALIASES: Record<string, string> = {
  contractualWithoutCashDiscount: 'withoutCashDiscount',
  contractualWithCashDiscount: 'withCashDiscount',
  contractualDiscount: 'discount',
  changeInTerms: 'paymentTermsChange',
  regulationModality: 'regulationType',
  regulationCountrySource: 'countrySource',
}

const CARD_FORMATS: Record<string, PanelCardFormat> = {
  cashFlowOpportunity: 'signedMoney',
  paymentTermsChange: 'days',
  creditLimit: 'money',
  outstandings: 'money',
  discount: 'percent',
  regulationType: 'text',
  countrySource: 'text',
  mainRegion: 'text',
  mainIndustry: 'text',
  withoutCashDiscount: 'days',
  withCashDiscount: 'days',
  regulationTerms: 'days',
}

/** The backend's `infoCards[]`, as sent - key aliased onto this panel's own labels, format picked
 * by key (a plain number for any key not listed). */
export function fromInfoCards(infoCards: OpportunityInfoCard[]): PanelCard[] {
  // Every card the backend sends is kept, a null (or empty) value included - it reads "N/A".
  return infoCards.map((card) => {
    const key = INFO_CARD_KEY_ALIASES[card.key] ?? card.key
    const value = card.value === '' ? null : card.value
    return { key, value, format: CARD_FORMATS[key] ?? 'count' }
  })
}

/**
 * The right-hand panel for one bar.
 *  - Bands: one per member the backend sent in `extra` (Contractual's two, Industry/Region's three,
 *    ...), each carrying the work item's badges for this panel.
 *  - Cards: only the backend's own `infoCards[]` (inside `extra`, or on the entry itself), as
 *    sent - none until the endpoint carries them.
 */
export function buildBenchmarkPanel(panelKey: BenchmarkPanelKey, entry: BenchmarkEntry): BenchmarkPanel {
  const infoCards = entry.extra?.infoCards ?? entry.infoCards
  return {
    bands: panelKey === 'target' && !entry.extra ? targetBands(entry) : bandsFrom(panelKey, entry.extra),
    cards: infoCards ? fromInfoCards(infoCards) : [],
  }
}

/** AB#20657: the backend lists `targetTerms` the way ADA does - only when a Target exists, with
 * no `extra` and no cards - so its panel's one band is the entry's own term. */
function targetBands(entry: BenchmarkEntry): PanelBand[] {
  return entry.terms == null ? [] : [{ titleKey: 'targetTerms', terms: entry.terms, badges: [] }]
}
