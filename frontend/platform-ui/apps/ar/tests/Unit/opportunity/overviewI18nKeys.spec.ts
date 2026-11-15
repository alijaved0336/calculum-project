import { describe, expect, it } from 'vitest'
import en from '@ada/design-system/locales/languages/en.json'
import es from '@ada/design-system/locales/languages/es.json'

/**
 * Every key the Opportunity Overview renders, resolved against BOTH real locale files.
 *
 * This exists because of what AP does today. Its own charts read
 * `global.metricsNew.{groupName}`, that object defines three of the names the endpoint returns, and
 * the screen renders `Global.MetricsNew.ContractualPaymentTerms` verbatim to the user — a missing
 * key is not an error in vue-i18n, it is the key itself as text. A component test with a stubbed
 * `t()` cannot catch that, and neither can a test that reads the same list the component reads: this
 * one names the keys independently, so adding a measure without translating it fails here.
 */

type Dictionary = Record<string, unknown>

const MEASURES = [
  'actualPaymentTerms',
  'contractualPaymentTerms',
  'proposedPaymentTerms',
  'volume',
  'cashFlowOpportunity',
  'buyers',
  'smeCount',
]

/**
 * Every grouping the served menu offers, and nothing else: the list the backend's own dimension
 * dictionary declares (see `OpportunityOverviewController.Dimensions`). A label left behind for a
 * grouping the menu stopped offering is dead weight; one MISSING for a grouping it does offer is a
 * raw key like `continent` on a user's dropdown, which is the failure this file exists to catch.
 */
const DIMENSIONS = [
  'region', 'country', 'countryName', 'industry', 'buyer', 'supplier', 'currency', 'waterfallBucket',
  'salesTeam', 'commodity', 'supplierCountry', 'supplierRegion',
]

/** Keys owned by this screen, spelled out rather than derived. */
const OWN_KEYS = [
  'arOpportunity.tabs.overview',
  'arOpportunity.tabs.list',
  'arOpportunity.cards.paymentTermsTitle',
  'arOpportunity.cards.paymentTermsTooltip',
  'arOpportunity.cards.avgDaysPaidCaption',
  'arOpportunity.cards.paymentFloatCaption',
  'arOpportunity.cards.salesTitle',
  'arOpportunity.cards.periodLabel',
  'arOpportunity.cards.salesTooltip',
  'arOpportunity.cards.salesVolume',
  'arOpportunity.cards.buyers',
  'arOpportunity.cards.salesLines',
  'arOpportunity.cards.opportunitySummaryTitle',
  'arOpportunity.cards.cashFlowTooltip',
  'arOpportunity.cards.economicProfitTooltip',
  'arOpportunity.cards.plImpactTitle',
  'arOpportunity.cards.plImpactTooltip',
  'arOpportunity.cards.scfButton',
  'arOpportunity.charts.paymentTermsTitle',
  'arOpportunity.charts.salesTitle',
  'arOpportunity.charts.selectDimension',
  'arOpportunity.charts.topN',
  'arOpportunity.empty.noVersion',
  'arOpportunity.empty.loadError',
  'arOpportunity.empty.forbidden',
  ...MEASURES.map((id) => `arOpportunity.measure.${id}`),
  ...DIMENSIONS.map((id) => `arOpportunity.dimension.${id}`),
  // The chart cards' "Select Metric" options — AP's "Per X" phrasing.
  ...DIMENSIONS.map((id) => `arOpportunity.chartMetric.${id}`),
  // The three-level list: its tabs, its column groups and every column title.
  'arOpportunity.list.tabs.saleLines',
  'arOpportunity.list.tabs.buyers',
  'arOpportunity.list.tabs.parents',
  'arOpportunity.list.groups.entity',
  'arOpportunity.list.groups.values',
  'arOpportunity.list.clearChartFilter',
  ...[
    'alias',
    'buyingEntity',
    'parentOrganization',
    'ultimateParent',
    'supplier',
    'region',
    'country',
    'industry',
    'currency',
    'sme',
    'salesVolume',
    'salesLines',
    'averageDaysPaid',
    'contractualPaymentTerms',
    'contractualWithCashDiscounts',
    'cashDiscounts',
    'aggregatedLines',
    'dpo',
    'proposedPaymentTerms',
    'currentPaymentTerms',
    'expectedPaymentTerms',
    'paymentTermsAgreed',
    'cashFlowOpportunity',
    'expectedCashFlow',
    'cashFlowAgreed',
    'economicProfit',
    'expectedEconomicProfit',
    'successProbability',
    'probabilityTier',
    'cashFlowTier',
    'waterfallCategory',
    'winningStrategy',
    'noOpportunityReason',
    'creditLimit',
    'creditOutstanding',
    'creditPastDue',
    'excluded',
    'exclusionReason',
    // AB#column-parity: the 149 fields the backend added to reach column parity with the
    // payables calculated tables (see globalColumns.ts's own "AB#column-parity" section).
    'countryName',
    'countryCodeBuyer',
    'countryBuyer',
    'continent',
    'supplierCountryCode',
    'supplierCountryName',
    'supplierRegionName',
    'supplierContinent',
    'salesTeam',
    'originalCommodity',
    'internalId',
    'originalName',
    'buyerExternalId',
    'externalId',
    'buyerCleanCanonicalName',
    'cleanCanonicalName',
    'buyerUrl',
    'url',
    'buyerInvestVerteEsgScore',
    'investVerteEsgScore',
    'buyerStockTicker',
    'stockTicker',
    'bvdIdNumber',
    'idNumber',
    'typeOfIdNumber',
    'ultimateParentBvdId',
    'legalForm',
    'relationshipType',
    'parentIndustryNaics',
    'parentIndustryNaicsCode',
    'smeClassificationStatus',
    'estimatedCompanySize',
    'isCompanySizeFromParent',
    'annualRevenueIsEstimated',
    'isMinorityOwned',
    'isVeteranOwned',
    'isWomanOwned',
    'isPublic',
    'creditScore',
    'dsoReference',
    'modeFinanceCreditScore',
    'creditInsured',
    'modelCashFlow',
    'targetPaymentTerms',
    'negotiationStatusCode',
    'negotiationStatusUpdatedAt',
    'negotiationStatus',
    'negotiatedCashFlow',
    'periodInDays',
    'afterTaxWacc',
    'preTaxWacc',
    'waccSource',
    'waccFromParent',
    'peerGroupStandard2Strategy',
    'industryRegionStandardStrategy',
    'buyerParentMinStrategy',
    'regulatoryTermsStrategy',
    'regulatoryTermsEnforced',
    'buyerLeverage',
    'supplierLeverage',
    'buyerLeverageLevel',
    'supplierLeverageLevel',
    'usingWorkingCapitalFinance',
    'dataQuality',
    'year',
    'payOnTermsStrategyIsApplicable',
    'lineDpo',
    'dpoStrategy',
  ].map((id) => `arOpportunity.list.columns.${id}`),
]

/**
 * Keys this screen borrows from elsewhere in the dictionary. Asserted too, because a key that is
 * safe to reuse today is one somebody else can rename tomorrow — and the failure would show up on
 * this screen, not on theirs.
 */
const BORROWED_KEYS = [
  'global.contractual',
  'global.opportunity',
  'global.expected',
  'global.cashFlow',
  'global.ultimateParents',
  'global.notAvailable',
  // The chart cards' two dropdown labels — AP's own, reused verbatim for parity.
  'global.selectValue',
  'global.selectMetric',
  'home.analyze.vCard.economicProfit',
  'home.components.menu.opportunity',
]

function resolve(dictionary: Dictionary, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, segment) =>
      node !== null && typeof node === 'object' ? (node as Dictionary)[segment] : undefined,
    dictionary,
  )
}

describe.each([
  ['en', en as Dictionary],
  ['es', es as Dictionary],
])('Opportunity Overview i18n (%s)', (_language, dictionary) => {
  it.each([...OWN_KEYS, ...BORROWED_KEYS])('resolves %s to a non-empty string', (key) => {
    const value = resolve(dictionary, key)

    expect(typeof value).toBe('string')
    expect((value as string).trim().length).toBeGreaterThan(0)
  })
})

describe('Opportunity Overview i18n placeholders', () => {
  it.each([
    ['arOpportunity.charts.topN', '{count}'],
    ['arOpportunity.cards.periodLabel', '{range}'],
  ])('%s keeps its %s placeholder in both languages', (key, placeholder) => {
    // A translation that drops the interpolation renders a sentence missing its subject rather than
    // failing, which is the kind of defect that ships.
    for (const dictionary of [en as Dictionary, es as Dictionary]) {
      expect(resolve(dictionary, key)).toContain(placeholder)
    }
  })
})
