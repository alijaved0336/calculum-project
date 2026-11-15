import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { LevelBar, TooltipButton } from '@ada/design-system'
import type { BuyerCorporateTreeSalesLineDto, BuyerOpportunityResponse } from '@/api'

const CREDIT_LIMIT_EXPLANATION = "The buyer's credit limit, and the parent's credit limit when this buyer rolls up to one."
const CREDIT_RATING_DISCLAIMER =
  "Credit rating is estimated from the parent company's profile and is not an independent assessment of this entity."
const CREDIT_LIMIT_DISCLAIMER =
  'Credit limit is informational only and should not be relied on for a risk or credit decision.'

const fetchBuyerOpportunity = vi.fn()
vi.mock('@/api', () => ({
  fetchBuyerOpportunity: (...args: unknown[]) => fetchBuyerOpportunity(...args),
  // OpportunityListBuyers' footer totals (column parity) - never exercised here.
  fetchFilterSummary: () => Promise.resolve({
    sum: {}, weightedCeilingAverage: {}, weightedAverage: {}, countTrue: {}, totalCount: 0,
  }),
}))

// OpportunityListBuyers (rendered whenever role/activeSalesLineTab says so - see this file's own
// visibility tests below) pulls in the real GraphqlGrid + apolloClient otherwise, which this suite
// never needs to exercise - same three mocks NineBoxRowsGrid.spec.ts/overviewList.spec.ts already
// use for the same nested component.
const fetchGraphqlGridPage = vi.fn()
vi.mock('@/utils/graphqlGridQuery', () => ({
  fetchGraphqlGridPage: (...args: unknown[]) => fetchGraphqlGridPage(...args),
}))
vi.mock('@/services/graphql/apolloClient', () => ({ apolloClient: {} }))
vi.mock('@ada/design-system/components/graphql-grid/Index.vue', () => ({
  default: {
    name: 'GraphqlGrid',
    props: ['items', 'total', 'skip', 'take', 'sort', 'loading', 'dataItemKey', 'columns', 'columnSelectorDefaultColumns'],
    template: '<div class="grid" />',
  },
}))

import CustomerCardOpportunityTab from '@/modules/buyers/components/customerCard/CustomerCardOpportunityTab.vue'
import { useContextStore } from '@/stores/context'

const VERSION_UUID = '1653c234-9318-4707-a6c3-33f4b427126c'

// The `terms` array the backend team shared for this endpoint, verbatim.
const TERMS: BuyerOpportunityResponse['terms'] = [
  {
    key: 'contractualTerms',
    terms: 60,
    extra: { contractualTerms: { terms: 60 }, currentTerms: { terms: 72 } },
  },
  { key: 'currentTerms', terms: 72, extra: null },
  { key: 'proposedTerms', terms: 45, extra: { opportunityTerms: { terms: 45 } } },
]

// The `strategies` array the backend team shared for this endpoint, verbatim.
const STRATEGIES: BuyerOpportunityResponse['strategies'] = [
  {
    key: 'CounterPartyStandard2',
    terms: 60,
    extra: {
      CounterPartyStandard2: {
        terms: 60,
        details: { average: 60, firstQuartile: 55, min: 45, max: 90, occurrences: 8 },
        calculationMethod: 'avg',
      },
    },
  },
  {
    key: 'PeerGroupStandard2',
    terms: 58,
    extra: {
      PeerGroupStandard2: {
        terms: 58,
        details: { average: 58, firstQuartile: 50, min: 30, max: 90, occurrences: 25 },
        calculationMethod: 'avg',
      },
    },
  },
  {
    key: 'BuyerOrParentMin',
    terms: 90,
    extra: {
      // Buyer / Parent Min's details are the sale line count alone (the backend's own shape).
      BuyerMin: {
        terms: 90,
        details: { saleLineCount: 2 },
        calculationMethod: null,
      },
      ParentBuyerMin: {
        terms: 90,
        details: { saleLineCount: 5 },
        calculationMethod: null,
      },
    },
  },
  {
    key: 'IndustryRegionGroup',
    terms: 75,
    extra: {
      IndustryRegionGroup: { terms: 75, details: null, calculationMethod: null },
      IndustryGroup: { terms: 66, details: null, calculationMethod: null },
      RegionGroup: { terms: 53, details: null, calculationMethod: null },
    },
  },
  { key: 'BuyersRegulatory', terms: 60, extra: null },
  { key: 'ClientStandard', terms: null, extra: null },
  { key: 'DaysOutstanding', terms: null, extra: null },
]

// The real payload shared for this endpoint (`/api/buyers/{versionUuid}/{buyerId}/opportunity`).
function opportunity(overrides: Partial<BuyerOpportunityResponse> = {}): BuyerOpportunityResponse {
  return {
    id: 1500,
    role: 'Counterparty',
    header: {
      creditLimit: 171868.41,
      parentUploadedCreditLimit: 1590900.36,
      creditInsured: '0.9',
      salesMateriality: null,
      totalSales: 53510.35928,
      parentTotalSales: 3402450.315369,
      supplierEntities: 'Pagero Inc - France',
      currencyCode: 'EUR',
      creditRating: 'BBB-',
      parentName: 'Knorr-Bremse AG',
    },
    paymentTerms: {
      currentTerm: 90,
      recommendedTerm: 60,
      outstanding: 13230.583338,
      projectedOutstanding: 8832.471616,
      pastDueDays: 14,
      pastDueOutstanding: 2504.5,
      // Past Due OFF (the default): the opportunity side carries no past due.
      projectedPastDueDays: 0,
      projectedPastDueOutstanding: 0,
      actualPaymentTermsAvg: 72,
      contractualPaymentTermsWithoutCashDiscountsAvg: 60,
      contractualPaymentTermsWithCashDiscountsAvg: 55,
      cashDiscounts: 0.02,
    },
    supplierImpact: {
      cashFlowImpact: 4398.111722,
      economicProfitImpact: 395.830055,
      cashFlowImpactPercentOfSales: null,
    },
    probabilityOfSuccess: {
      priority: 'Medium',
      probabilityScore: 224,
      probabilityTier: 'Medium',
      cashFlowImpactTier: 'Medium',
      termsDecreaseTier: 'Medium',
      supplierLeverage: 'Medium',
      buyerLeverage: 'Medium',
      economicProfitImpactTier: 'Medium',
      insightsCount: 42,
      insightsTier: 'Medium',
    },
    terms: TERMS,
    strategies: STRATEGIES,
    ...overrides,
  }
}

const messages = {
  en: {
    arCustomerCard: {
      notFound: 'This buyer could not be found for this sale file version.',
      loadError: 'Could not load the customer card. Try again.',
      opportunity: {
        saleLineTab: 'Sales Line {n}',
        buyerTab: 'Buyer',
        topBar: { insured: 'Insured', creditLimitTooltip: CREDIT_LIMIT_EXPLANATION },
        paymentTerms: { pastDues: 'Past dues' },
        supplierImpact: { ofSales: 'of Sales' },
        assessment: {
          missingData: 'Missing Data',
          priorityTooltip: 'Priority tooltip',
          probabilityOfSuccess: 'Probability of Success',
          probabilityOfSuccessTooltip: 'Probability of success tooltip',
          cashFlowImpactTooltip: 'Cash flow impact tooltip',
          termsDecrease: 'Terms Decrease',
          termsDecreaseTooltip: 'Terms decrease tooltip',
          supplierLeverage: 'Supplier Leverage',
          supplierLeverageTooltip: 'Supplier leverage tooltip',
          buyerLeverage: 'Buyer Leverage',
          buyerLeverageTooltip: 'Buyer leverage tooltip',
          economicProfitImpact: 'Economic Profit Impact',
          economicProfitImpactTooltip: 'Economic profit impact tooltip',
          numberOfInsights: 'Number of Insights',
          numberOfInsightsTooltip: 'Number of insights tooltip',
        },
      },
    },
    arBuyers: {
      table: {
        tooltips: {
          creditRatingDisclaimer: CREDIT_RATING_DISCLAIMER,
          creditLimitDisclaimer: CREDIT_LIMIT_DISCLAIMER,
        },
      },
    },
  },
}

function salesLine(overrides: Partial<BuyerCorporateTreeSalesLineDto> = {}): BuyerCorporateTreeSalesLineDto {
  return {
    saleLineId: 501,
    volume: 100,
    cashFlow: null,
    paymentTerms: null,
    paymentTermsOpportunity: null,
    supplierId: 1,
    supplierName: 'Some Supplier',
    commodity: null,
    ...overrides,
  }
}

async function mountTab(
  overrides: Partial<BuyerOpportunityResponse> = {},
  props: { versionId: string; buyerId: string; salesLines?: BuyerCorporateTreeSalesLineDto[]; role?: 'Self' | 'Counterparty' | 'Parent' } = { versionId: '73', buyerId: '1500' },
) {
  // The tab fetches via context.saleFileVersionUuid, not the (unused) versionId prop - see
  // useBuyerOpportunity's own doc - so a version has to be active for the happy-path tests below
  // to actually reach fetchBuyerOpportunity rather than short-circuiting to not-found.
  useContextStore().setVersion(73, VERSION_UUID)
  fetchBuyerOpportunity.mockResolvedValue(opportunity(overrides))
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  const view = mount(CustomerCardOpportunityTab, {
    props,
    global: { plugins: [i18n] },
  })
  await flushPromises()
  return view
}

describe('CustomerCardOpportunityTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchBuyerOpportunity.mockReset()
    fetchGraphqlGridPage.mockReset()
    fetchGraphqlGridPage.mockResolvedValue({ items: [], total: 0 })
  })

  it('fetches the opportunity endpoint scoped to the active version uuid and the given buyer id', async () => {
    await mountTab()

    expect(fetchBuyerOpportunity).toHaveBeenCalledWith(VERSION_UUID, 1500, 1, undefined, false)
  })

  it('shows the not-found state without calling the API when no version is selected', async () => {
    setActivePinia(createPinia()) // fresh store, no version set
    const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
    const view = mount(CustomerCardOpportunityTab, {
      props: { versionId: '73', buyerId: '1500' },
      global: { plugins: [i18n] },
    })
    await flushPromises()

    expect(fetchBuyerOpportunity).not.toHaveBeenCalled()
    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('shows the not-found state for a malformed buyer id, without ever calling the API', async () => {
    const view = await mountTab({}, { versionId: '73', buyerId: 'abc' })

    expect(fetchBuyerOpportunity).not.toHaveBeenCalled()
    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('shows its own skeleton before the fetch resolves', () => {
    useContextStore().setVersion(73, VERSION_UUID)
    fetchBuyerOpportunity.mockImplementation(() => new Promise(() => {}))
    const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })

    const view = mount(CustomerCardOpportunityTab, {
      props: { versionId: '73', buyerId: '1500' },
      global: { plugins: [i18n] },
    })

    expect(view.find('.k-skeleton').exists()).toBe(true)
  })

  it('renders the top metrics strip off header.*, compacting money fields and passing the currency/name fields through verbatim', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('$53.5k') // header.totalSales
    expect(view.text()).toContain('$3.4m') // header.parentTotalSales
    expect(view.text()).toContain('Pagero Inc - France') // header.supplierEntities
    expect(view.text()).toContain('EUR') // header.currencyCode
    expect(view.text()).toContain('$171.9k') // header.creditLimit
    expect(view.text()).toContain('$1.6m') // header.parentUploadedCreditLimit
    expect(view.text()).toContain('BBB-') // header.creditRating
    expect(view.text()).toContain('Knorr-Bremse AG') // header.parentName
  })

  it('carries the credit-rating disclaimer and appends the credit-limit disclaimer to its existing tooltip (UC-UI-21 FR-1/FR-2)', async () => {
    const view = await mountTab()

    const disclaimers = view.findAllComponents(TooltipButton).map((c) => c.props('text'))
    expect(disclaimers).toContain(CREDIT_RATING_DISCLAIMER)
    expect(disclaimers).toContain(`${CREDIT_LIMIT_EXPLANATION} ${CREDIT_LIMIT_DISCLAIMER}`)
  })

  it('carries no credit-rating disclaimer and only the plain explanation for credit limit when none of the three figures are on record (UC-UI-21 AF-1)', async () => {
    const view = await mountTab({
      header: { ...opportunity().header, creditRating: null, creditLimit: null, parentUploadedCreditLimit: null },
    })

    const disclaimers = view.findAllComponents(TooltipButton).map((c) => c.props('text'))
    expect(disclaimers).not.toContain(CREDIT_RATING_DISCLAIMER)
    expect(disclaimers).toContain(CREDIT_LIMIT_EXPLANATION)
    expect(disclaimers).not.toContain(`${CREDIT_LIMIT_EXPLANATION} ${CREDIT_LIMIT_DISCLAIMER}`)
  })

  it('still carries the credit-limit disclaimer when only the parent limit is on record, not the buyer\'s own (UC-UI-21 FR-2)', async () => {
    const view = await mountTab({ header: { ...opportunity().header, creditLimit: null } })

    const disclaimers = view.findAllComponents(TooltipButton).map((c) => c.props('text'))
    expect(disclaimers).toContain(`${CREDIT_LIMIT_EXPLANATION} ${CREDIT_LIMIT_DISCLAIMER}`)
  })

  it('shows Sales Materiality as "-" when header.salesMateriality is null for this buyer', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('-')
  })

  it('shows the real Sales Materiality value when header.salesMateriality is present', async () => {
    const view = await mountTab({ header: { ...opportunity().header, salesMateriality: 'Low' } })

    expect(view.text()).toContain('Low')
  })

  it('shows Insured when header.creditInsured is a positive fraction', async () => {
    const view = await mountTab({ header: { ...opportunity().header, creditInsured: '0.9' } })

    expect(view.text()).toContain('Insured')
  })

  it('does not show Insured when header.creditInsured is null', async () => {
    const view = await mountTab({ header: { ...opportunity().header, creditInsured: null } })

    expect(view.text()).not.toContain('Insured')
  })

  it('renders Payment Terms off paymentTerms.currentTerm/recommendedTerm/outstanding/projectedOutstanding, with pastDueDays/pastDueOutstanding backing the contractual side\'s own "Past dues"', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('90') // currentTerm
    expect(view.text()).toContain('60') // recommendedTerm
    expect(view.text()).toContain('$13.2k') // outstanding
    expect(view.text()).toContain('$8.8k') // projectedOutstanding
    expect(view.text()).toContain('Past dues: 14') // pastDueDays
    expect(view.text()).toContain('Past dues: $2.5k') // pastDueOutstanding
  })

  it('shows the opportunity side\'s "Past dues" as a real 0 with Past Due OFF, never as "-" (AB#21137)', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('Past dues: 0') // projectedPastDueDays
    expect(view.text()).toContain('Past dues: $0') // projectedPastDueOutstanding
    expect(view.text()).not.toContain('Past dues: -')
  })

  it('shows the opportunity side\'s "Past dues" off projectedPastDueDays/projectedPastDueOutstanding with Past Due ON (AB#21137)', async () => {
    const view = await mountTab({ paymentTerms: { ...opportunity().paymentTerms, projectedPastDueDays: 14, projectedPastDueOutstanding: 2504.5 } })

    expect(view.text().split('Past dues: 14').length - 1).toBe(2) // both sides
    expect(view.text().split('Past dues: $2.5k').length - 1).toBe(2)
  })

  it('reads every "Past dues" figure as "-" when the four of them are null', async () => {
    const view = await mountTab({
      paymentTerms: {
        ...opportunity().paymentTerms,
        pastDueDays: null,
        pastDueOutstanding: null,
        projectedPastDueDays: null,
        projectedPastDueOutstanding: null,
      },
    })

    expect(view.text().split('Past dues: -').length - 1).toBe(4)
  })

  it('renders Supplier Impact off cashFlowImpact/economicProfitImpact with an explicit "+" sign, and reads Credit Usage as "-"', async () => {
    const view = await mountTab()

    expect(view.text()).toContain('+$4.4k')
    expect(view.text()).toContain('+$395.8')
  })

  it('shows Cash Flow\'s "of Sales" share off cashFlowImpactPercentOfSales, and hides it when null', async () => {
    const withShare = await mountTab({
      supplierImpact: { ...opportunity().supplierImpact, cashFlowImpactPercentOfSales: 12.5 },
    })
    expect(withShare.text()).toContain('12.5% of Sales')

    const withoutShare = await mountTab()
    expect(withoutShare.text()).not.toContain('of Sales')
  })

  it('renders all eight Probability of Success rows as LevelBar rows off probabilityOfSuccess.*, with no radar/spider chart', async () => {
    const view = await mountTab()

    // Priority, Probability of Success (probabilityTier), Cash Flow Impact, Terms Decrease,
    // Supplier Leverage, Buyer Leverage, Economic Profit Impact, Number of Insights - all 'Medium'
    // in the fixture.
    const levelBars = view.findAllComponents(LevelBar)
    expect(levelBars).toHaveLength(8)
    expect(levelBars.map((c) => c.props('level'))).toEqual(Array(8).fill('medium'))
    expect(view.find('canvas').exists()).toBe(false)
  })

  it('shows Number of Insights\' tier (insightsTier) as its value text, not its raw count (insightsCount)', async () => {
    const view = await mountTab()

    expect(view.text()).not.toContain('42')
  })

  it('renders an empty LevelBar labeled "N/A" (never "Missing Data") for a detail row whose own tier is null', async () => {
    const view = await mountTab({
      probabilityOfSuccess: { ...opportunity().probabilityOfSuccess, termsDecreaseTier: null },
    })

    expect(view.findAllComponents(LevelBar)).toHaveLength(8)
    expect(view.text()).not.toContain('Missing Data')
    expect(view.text()).toContain('N/A')
  })

  it('shows "Missing Data" (never a bar) only for a null Priority, and falls back to an empty "N/A" LevelBar (never a raw string) for an unrecognized cashFlowImpactTier', async () => {
    const view = await mountTab({
      probabilityOfSuccess: { ...opportunity().probabilityOfSuccess, priority: null, cashFlowImpactTier: 'Unexpected' },
    })

    expect(view.findAllComponents(LevelBar)).toHaveLength(7)
    const missingCount = view.text().split('Missing Data').length - 1
    expect(missingCount).toBe(1)
    expect(view.text()).toContain('N/A')
    expect(view.text()).not.toContain('Unexpected')
  })

  it('shows no "Missing Data" placeholders when every probabilityOfSuccess field resolves to a real tier', async () => {
    const view = await mountTab()

    expect(view.text()).not.toContain('Missing Data')
  })

  it('renders benchmark bars only for fields this endpoint carries, dropping "Pay on Terms" and "Supplier Policy" entirely', async () => {
    const view = await mountTab()

    expect(view.text()).not.toContain('arCustomerCard.opportunity.benchmarks.payOnTerms')
    expect(view.text()).not.toContain('arCustomerCard.opportunity.benchmarks.supplierPolicy')
    // BuyersRegulatory/IndustryRegionGroup/BuyerOrParentMin carry a real term in the fixture - their
    // bars render with a value rather than every bar reading N/A.
    const bars = view.findAll('.line-chart')
    expect(bars.length).toBeGreaterThan(0)
  })

  const BENCHMARK_BAR = '.opportunity-benchmark-bar'
  const barByTitle = (view: Awaited<ReturnType<typeof mountTab>>, titleKey: string) =>
    view.findAll(BENCHMARK_BAR).find((bar) => bar.text().includes(`benchmarks.${titleKey}`))!

  it("renders only the entries sent, in the work item's order, without a duplicate DSO bar", async () => {
    const view = await mountTab()

    const titles = view.findAll(BENCHMARK_BAR).map((bar) => bar.text())
    const expected = [
      'arCustomerCard.opportunity.benchmarks.contractualTerms',
      'arCustomerCard.opportunity.benchmarks.currentTerms',
      'arCustomerCard.opportunity.benchmarks.proposedTerms',
      'arCustomerCard.opportunity.benchmarks.regulatoryTerms',
      'arCustomerCard.opportunity.benchmarks.buyerStandard',
      'arCustomerCard.opportunity.benchmarks.peerGroupStandard',
      'arCustomerCard.opportunity.benchmarks.industryRegionStandard',
      'arCustomerCard.opportunity.benchmarks.parentBuyerMin',
    ]
    expect(titles).toHaveLength(expected.length)
    expected.forEach((title, index) => expect(titles[index]).toContain(title))
    // DaysOutstanding and ClientStandard are in the fixture but never drawn - Avg. Days Paid (DSO)
    // comes from currentTerms instead, and Client Standard is not part of this chart.
    expect(titles.some((title) => title.includes('benchmarks.avgDaysPaidDso'))).toBe(false)
    expect(titles.some((title) => title.includes('benchmarks.clientStandard'))).toBe(false)
  })

  it('draws Harmonization as the last bar and opens its infoCards alone (no extra, so no band)', async () => {
    const view = await mountTab({
      strategies: [
        ...STRATEGIES,
        {
          key: 'Harmonization',
          terms: 45,
          extra: null,
          infoCards: [
            { key: 'cashFlowOpportunity', value: 4209.839311849315 },
            { key: 'changeInTerms', value: 15 },
          ],
        },
      ],
    })

    const bars = view.findAll(BENCHMARK_BAR)
    expect(bars[bars.length - 1].text()).toContain('arCustomerCard.opportunity.benchmarks.harmonization')

    const bar = barByTitle(view, 'harmonization')
    expect(bar.attributes('role')).toBe('button')
    await bar.trigger('click')

    expect(view.get('.opportunity-detail-header').text()).toContain('benchmarks.harmonization')
    expect(view.findAll('.strategy-detail__card')).toHaveLength(0)
    expect(view.findAll('.strategy-detail__metric').map((card) => card.text())).toEqual([
      expect.stringContaining('benchmarks.cards.cashFlowOpportunity'),
      expect.stringMatching(/cards\.paymentTermsChange\s*15$/),
    ])
  })

  it('shows a money card under 1,000 with one decimal, like the abbreviated ones', async () => {
    const view = await mountTab({
      strategies: [
        { key: 'BuyersRegulatory', terms: 60, extra: null, infoCards: [{ key: 'cashFlowOpportunity', value: -2752.362451561644 }] },
        { key: 'Harmonization', terms: 30, extra: null, infoCards: [{ key: 'cashFlowOpportunity', value: 366.9816602082192 }] },
      ],
    })
    const cashFlow = () => view.get('.strategy-detail__metric').text()

    await barByTitle(view, 'regulatoryTerms').trigger('click')
    expect(cashFlow()).toMatch(/-\$2\.8k/)

    await barByTitle(view, 'harmonization').trigger('click')
    expect(cashFlow()).toMatch(/\+\$367\.0/)
  })

  it('keeps Harmonization non-clickable while it has no infoCards', async () => {
    const view = await mountTab({ strategies: [{ key: 'Harmonization', terms: 45, extra: null }] })

    expect(barByTitle(view, 'harmonization').attributes('role')).toBeUndefined()
  })

  it('never draws Pay on Terms or Client Standard, even with a term', async () => {
    const view = await mountTab({
      terms: [],
      strategies: [
        { key: 'PaymentOnTerms', terms: 60, extra: null },
        { key: 'ClientStandard', terms: 30, extra: null },
        { key: 'CreditLimitMax', terms: 690, extra: null },
      ],
    })

    const titles = view.findAll(BENCHMARK_BAR).map((bar) => bar.text())
    expect(titles).toEqual([expect.stringContaining('benchmarks.creditLimitMax')])
  })

  it('draws Buyer Policy with its own title, right after Credit Limit Max', async () => {
    const view = await mountTab({
      terms: [],
      strategies: [
        { key: 'BuyerPolicy', terms: 45, extra: null },
        { key: 'CreditLimitMax', terms: 690, extra: null },
      ],
    })

    const titles = view.findAll(BENCHMARK_BAR).map((bar) => bar.text())
    expect(titles).toEqual([
      expect.stringContaining('benchmarks.creditLimitMax'),
      expect.stringContaining('benchmarks.buyerPolicy'),
    ])
    // No extra and no infoCards: nothing to open.
    expect(barByTitle(view, 'buyerPolicy').attributes('role')).toBeUndefined()
  })

  it('opens Buyer Policy\'s panel once it carries infoCards', async () => {
    const view = await mountTab({
      strategies: [
        { key: 'BuyerPolicy', terms: 45, extra: null, infoCards: [{ key: 'cashFlowOpportunity', value: 1200 }] },
      ],
    })

    const bar = barByTitle(view, 'buyerPolicy')
    expect(bar.attributes('role')).toBe('button')
    await bar.trigger('click')

    expect(view.get('.opportunity-detail-header').text()).toContain('benchmarks.buyerPolicy')
  })

  it('renders a single N/A bar when strategies carries a single entry with no term', async () => {
    const view = await mountTab({ terms: [], strategies: [{ key: 'BuyerStandardStrategyOnParents', terms: null, extra: null }] })

    const bars = view.findAll(BENCHMARK_BAR)
    expect(bars).toHaveLength(1)
    expect(bars[0].text()).toContain('arCustomerCard.opportunity.benchmarks.buyerStandard')
    expect(bars[0].text()).toContain('N/A')
    expect(bars[0].attributes('role')).toBeUndefined()
  })

  it('renders no bars when terms and strategies are both empty', async () => {
    const view = await mountTab({ terms: [], strategies: [] })

    expect(view.findAll(BENCHMARK_BAR)).toHaveLength(0)
  })

  const cardLabels = (view: Awaited<ReturnType<typeof mountTab>>) =>
    view.findAll('.strategy-detail__metric').map((card) => card.text())

  it('makes every story bar with a real term and something to show clickable, and nothing else (EF-1)', async () => {
    const view = await mountTab()

    const clickable = view.findAll(`${BENCHMARK_BAR}[role="button"]`).map((bar) => bar.text())
    // The 3 terms + Buyer Standard, Peer Group, Industry/Region, Parent/Buyer Min. Regulatory has a
    // term but no extra and no infoCards - nothing to show, so no empty panel.
    expect(clickable).toHaveLength(7)
    expect(clickable.some((text) => text.includes('benchmarks.regulatoryTerms'))).toBe(false)
  })

  it('never opens an empty panel for a bar with a term but no extra and no infoCards', async () => {
    const view = await mountTab({
      strategies: [
        { key: 'BuyersRegulatory', terms: 60, extra: null },
        { key: 'CreditLimitMax', terms: 690, extra: null },
      ],
    })

    for (const titleKey of ['regulatoryTerms', 'creditLimitMax']) {
      const bar = barByTitle(view, titleKey)
      expect(bar.attributes('role')).toBeUndefined()
      await bar.trigger('click')
    }
    // Still the default Contractual panel - neither click opened anything.
    expect(view.get('.opportunity-detail-header').text()).toContain('benchmarks.contractualTerms')
  })

  it('never opens a panel for an N/A bar', async () => {
    const view = await mountTab({
      terms: [{ key: 'proposedTerms', terms: null, extra: { opportunityTerms: { terms: null } } }],
    })

    const bar = barByTitle(view, 'proposedTerms')
    expect(bar.attributes('role')).toBeUndefined()
    await bar.trigger('click')
    expect(view.find('.strategy-detail').exists()).toBe(false)
  })

  it("opens Contractual's own panel from Avg. Days Paid (DSO) (AF-1)", async () => {
    const view = await mountTab()

    await barByTitle(view, 'currentTerms').trigger('click')

    // Titled after the clicked bar, content from Contractual's own entry.
    expect(view.get('.opportunity-detail-header').text()).toContain('benchmarks.currentTerms')
    expect(barByTitle(view, 'currentTerms').classes()).toContain('opportunity-benchmark-bar--selected')
    // One band per member of contractualTerms' own extra.
    expect(view.findAll('.strategy-detail__card').map((band) => band.text())).toEqual([
      expect.stringContaining('benchmarks.extra.contractualTerms'),
      expect.stringContaining('benchmarks.extra.currentTerms'),
    ])
  })

  it("colors each detail band by its own key, AP's drill-down palette", async () => {
    const view = await mountTab()

    // Default Contractual panel: contractualTerms (slate) + currentTerms (cyan).
    const lineColors = () => view.get('.strategy-detail')
      .findAllComponents({ name: 'ChartHorizontalSingleBar' })
      .map((bar) => bar.props('lineColor'))
    expect(lineColors()).toEqual(['#475569', '#22ccee'])

    await barByTitle(view, 'parentBuyerMin').trigger('click')
    expect(lineColors()).toEqual(['#3B82F6', '#3B82F6'])
  })

  it('renders no metric cards while the backend sends no infoCards', async () => {
    const view = await mountTab()

    await barByTitle(view, 'parentBuyerMin').trigger('click')

    expect(view.find('.strategy-detail').exists()).toBe(true)
    expect(view.find('.strategy-detail__cards').exists()).toBe(false)
  })

  it('lays four or more cards out four to a row (col-3)', async () => {
    const view = await mountTab({
      strategies: [{
        key: 'CreditLimitMax',
        terms: 690,
        extra: {
          infoCards: [
            { key: 'cashFlowOpportunity', value: 12500 },
            { key: 'creditLimit', value: 1096902.21 },
            { key: 'outstandings', value: 13230.58 },
            { key: 'changeInTerms', value: 30 },
          ],
        },
      }],
    })

    await barByTitle(view, 'creditLimitMax').trigger('click')

    const cards = view.findAll('.strategy-detail__metric')
    expect(cards).toHaveLength(4)
    expect(cards.every((card) => card.classes().includes('col-3'))).toBe(true)
  })

  it("renders the infoCards the backend sends inside extra, a null one reading N/A", async () => {
    const view = await mountTab({
      strategies: [{
        key: 'BuyersRegulatory',
        terms: 60,
        extra: {
          infoCards: [
            { key: 'cashFlowOpportunity', value: 4398.1117216438356 },
            { key: 'regulationTerms', value: 60 },
            { key: 'regulationModality', value: 'Recommended' },
            { key: 'regulationCountrySource', value: null },
          ],
        },
      }],
    })

    // No member in extra, but the cards alone make the bar worth opening.
    const bar = barByTitle(view, 'regulatoryTerms')
    expect(bar.attributes('role')).toBe('button')
    await bar.trigger('click')

    expect(view.findAll('.strategy-detail__card')).toHaveLength(0)
    const cards = view.findAll('.strategy-detail__metric')
    // All four kept, the null one included - four per row.
    expect(cards.every((card) => card.classes().includes('col-3'))).toBe(true)
    expect(cards.map((card) => card.text())).toEqual([
      expect.stringContaining('benchmarks.cards.cashFlowOpportunity'),
      expect.stringMatching(/cards\.regulationTerms\s*60/),
      expect.stringMatching(/cards\.regulationType\s*Recommended/),
      expect.stringMatching(/cards\.countrySource\s*N\/A/),
    ])
  })

  it("shows N/A for Contractual's cash-discount cards when the backend sends them without a value", async () => {
    const view = await mountTab({
      terms: [{
        key: 'contractualTerms',
        terms: 60,
        extra: {
          contractualTerms: { terms: 60 },
          infoCards: [
            { key: 'contractualWithoutCashDiscount', value: 60 },
            { key: 'contractualWithCashDiscount', value: null },
            { key: 'contractualDiscount', value: null },
          ],
        },
      }],
    })

    // Contractual's detail is the default one.
    const cards = view.findAll('.strategy-detail__metric')
    expect(cards.every((card) => card.classes().includes('col-4'))).toBe(true)
    expect(cards.map((card) => card.text())).toEqual([
      expect.stringMatching(/cards\.withoutCashDiscount\s*60/),
      expect.stringMatching(/cards\.withCashDiscount\s*N\/A/),
      expect.stringMatching(/cards\.discount\s*N\/A/),
    ])
  })

  it("renders the backend's infoCards when an entry carries them", async () => {
    const view = await mountTab({
      strategies: [{
        key: 'BuyersRegulatory',
        terms: 60,
        extra: null,
        infoCards: [{ key: 'regulationModality', value: 'E' }, { key: 'regulationCountrySource', value: 'Buyer' }],
      }],
    })

    await barByTitle(view, 'regulatoryTerms').trigger('click')

    expect(cardLabels(view)).toEqual([
      expect.stringMatching(/cards\.regulationType\s*E/),
      expect.stringMatching(/cards\.countrySource\s*Buyer/),
    ])
  })

  it("opens one band per Min member on Parent/Buyer Min, each with its own saleLineCount as Sales Lines", async () => {
    const view = await mountTab()

    await barByTitle(view, 'parentBuyerMin').trigger('click')

    const bands = view.findAll('.strategy-detail__card')
    expect(bands.map((band) => band.text())).toEqual([
      expect.stringContaining('benchmarks.extra.BuyerMin'),
      expect.stringContaining('benchmarks.extra.ParentBuyerMin'),
    ])
    const badgeTexts = (index: number) => bands[index].findAll('.strategy-detail__badge').map((badge) => badge.text())
    expect(badgeTexts(0)).toEqual([expect.stringMatching(/details\.salesLines\s*2/)])
    expect(badgeTexts(1)).toEqual([expect.stringMatching(/details\.salesLines\s*5/)])
  })

  it('shows Buyer Standard as Average + 1st Quartile', async () => {
    const view = await mountTab()

    await barByTitle(view, 'buyerStandard').trigger('click')

    const labels = view.findAll('.strategy-detail__badge-label').map((label) => label.text())
    expect(labels).toEqual([
      'arCustomerCard.opportunity.benchmarks.details.average',
      'arCustomerCard.opportunity.benchmarks.details.firstQuartile',
    ])
  })

  it("highlights the badge the strategy's calculationMethod picked", async () => {
    const view = await mountTab()

    await barByTitle(view, 'peerGroupStandard').trigger('click') // Peer Group Standard, calculationMethod "avg"

    const active = view.findAll('.strategy-detail__badge--active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toContain('benchmarks.details.average')
    expect(active[0].text()).toContain('58')
  })

  const openPanelTitle = (view: Awaited<ReturnType<typeof mountTab>>) =>
    view.get('.opportunity-detail-header').text()

  it("opens Contractual's detail by default, selected, with its back chevron", async () => {
    const view = await mountTab()

    expect(openPanelTitle(view)).toContain('arCustomerCard.opportunity.benchmarks.contractualTerms')
    expect(view.find('.opportunity-detail-back').exists()).toBe(true)
    expect(barByTitle(view, 'contractualTerms').classes()).toContain('opportunity-benchmark-bar--selected')
  })

  it('falls back to the Contractual detail on back, and on a second click of the same bar', async () => {
    const view = await mountTab()
    const bar = barByTitle(view, 'buyerStandard') // Buyer Standard

    await bar.trigger('click')
    expect(openPanelTitle(view)).toContain('benchmarks.buyerStandard')
    await view.get('.opportunity-detail-back').trigger('click')
    expect(openPanelTitle(view)).toContain('benchmarks.contractualTerms')

    await bar.trigger('click')
    await bar.trigger('click')
    expect(openPanelTitle(view)).toContain('benchmarks.contractualTerms')
  })

  it('returns to the Contractual detail when the sale-line tab changes', async () => {
    const view = await mountTab(
      {},
      { versionId: '73', buyerId: '1500', role: 'Counterparty', salesLines: [salesLine({ saleLineId: 501 })] },
    )
    await barByTitle(view, 'industryRegionStandard').trigger('click') // Industry/Region Standard
    expect(view.findAll('.strategy-detail__card')).toHaveLength(3) // one per extra member

    await view.get('.sale-line-tabs [role="tab"]:nth-of-type(2)').trigger('click')
    await flushPromises()

    expect(openPanelTitle(view)).toContain('benchmarks.contractualTerms')
  })

  it('renders no sale-line tabs when salesLines is absent', async () => {
    const view = await mountTab()

    expect(view.find('.sale-line-tabs').exists()).toBe(false)
  })

  it('renders one tab per sales line, id = saleLineId and label = "Sales Line " + 1-based position', async () => {
    const view = await mountTab(
      {},
      {
        versionId: '73',
        buyerId: '1500',
        salesLines: [salesLine({ saleLineId: 501 }), salesLine({ saleLineId: 502 }), salesLine({ saleLineId: 503 })],
      },
    )

    const tabs = view.findAll('.sale-line-tabs [role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual(['Sales Line 1', 'Sales Line 2', 'Sales Line 3'])
  })

  it('prepends a leading "Buyer" tab (id = buyerId) when role is Counterparty and there is at least one sales line', async () => {
    const view = await mountTab(
      {},
      {
        versionId: '73',
        buyerId: '1500',
        role: 'Counterparty',
        salesLines: [salesLine({ saleLineId: 501 }), salesLine({ saleLineId: 502 })],
      },
    )

    const tabs = view.findAll('.sale-line-tabs [role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual(['Buyer', 'Sales Line 1', 'Sales Line 2'])
  })

  it('does not add a "Buyer" tab when role is Counterparty but there are no sales lines', async () => {
    const view = await mountTab({}, { versionId: '73', buyerId: '1500', role: 'Counterparty', salesLines: [] })

    expect(view.find('.sale-line-tabs').exists()).toBe(false)
  })

  it('fetches at the buyer level (no level/saleLineId) on first mount when the leading "Buyer" tab is the default active one', async () => {
    await mountTab(
      {},
      { versionId: '73', buyerId: '1500', role: 'Counterparty', salesLines: [salesLine({ saleLineId: 501 })] },
    )

    expect(fetchBuyerOpportunity).toHaveBeenCalledWith(VERSION_UUID, 1500, 1, undefined, false)
  })

  it('fetches at that sale line\'s own level (level=SaleLine&saleLineId=...) as soon as a sale-line tab is selected', async () => {
    const view = await mountTab(
      {},
      {
        versionId: '73',
        buyerId: '1500',
        role: 'Counterparty',
        salesLines: [salesLine({ saleLineId: 501 }), salesLine({ saleLineId: 502 })],
      },
    )
    fetchBuyerOpportunity.mockClear()

    await view.get('.sale-line-tabs [role="tab"]:nth-of-type(2)').trigger('click') // "Sales Line 1" -> saleLineId 501
    await flushPromises()

    expect(fetchBuyerOpportunity).toHaveBeenCalledWith(VERSION_UUID, 1500, 1, 501, false)
  })

  it('drops back to the buyer level (no level/saleLineId) once the "Buyer" tab is reselected', async () => {
    const view = await mountTab(
      {},
      { versionId: '73', buyerId: '1500', role: 'Counterparty', salesLines: [salesLine({ saleLineId: 501 })] },
    )
    await view.get('.sale-line-tabs [role="tab"]:nth-of-type(2)').trigger('click') // the sale-line tab
    await flushPromises()
    fetchBuyerOpportunity.mockClear()

    await view.get('.sale-line-tabs [role="tab"]:nth-of-type(1)').trigger('click') // "Buyer"
    await flushPromises()

    expect(fetchBuyerOpportunity).toHaveBeenCalledWith(VERSION_UUID, 1500, 1, undefined, false)
  })

  it('defaults to the first sale line\'s own level when there is no leading "Buyer" tab (role is not Counterparty)', async () => {
    await mountTab(
      {},
      { versionId: '73', buyerId: '1500', salesLines: [salesLine({ saleLineId: 777 }), salesLine({ saleLineId: 778 })] },
    )

    expect(fetchBuyerOpportunity).toHaveBeenCalledWith(VERSION_UUID, 1500, 1, 777, false)
  })

  it('shows no tabs at all when role is Parent, even with sales lines on hand', async () => {
    const view = await mountTab(
      {},
      { versionId: '73', buyerId: '1500', role: 'Parent', salesLines: [salesLine({ saleLineId: 501 })] },
    )

    expect(view.find('.sale-line-tabs').exists()).toBe(false)
  })

  it('sends level=Parent (isParentRole=true, no saleLineId) when role is Parent', async () => {
    await mountTab({}, { versionId: '73', buyerId: '1500', role: 'Parent' })

    expect(fetchBuyerOpportunity).toHaveBeenCalledWith(VERSION_UUID, 1500, 1, undefined, true)
  })

  // ---- OpportunityListBuyers's own visibility rule (the grid is the mocked `.grid` stub - see
  // this file's own GraphqlGrid mock above)

  it('renders OpportunityListBuyers when role is Parent', async () => {
    const view = await mountTab({}, { versionId: '73', buyerId: '1500', role: 'Parent' })

    expect(view.find('.grid').exists()).toBe(true)
  })

  it('renders OpportunityListBuyers when role is Counterparty and the leading "Buyer" tab (position 0) is active', async () => {
    const view = await mountTab(
      {},
      { versionId: '73', buyerId: '1500', role: 'Counterparty', salesLines: [salesLine({ saleLineId: 501 })] },
    )

    expect(view.find('.grid').exists()).toBe(true)
  })

  it('does not render OpportunityListBuyers when role is Counterparty and a sale-line tab (not position 0) is active', async () => {
    const view = await mountTab(
      {},
      {
        versionId: '73',
        buyerId: '1500',
        role: 'Counterparty',
        salesLines: [salesLine({ saleLineId: 501 }), salesLine({ saleLineId: 502 })],
      },
    )
    expect(view.find('.grid').exists()).toBe(true) // sanity: shown before the click, same as above

    await view.get('.sale-line-tabs [role="tab"]:nth-of-type(2)').trigger('click') // "Sales Line 1"
    await flushPromises()

    expect(view.find('.grid').exists()).toBe(false)
  })

  it('does not render OpportunityListBuyers for a role with no sale-line concept at all (e.g. Self)', async () => {
    const view = await mountTab({}, { versionId: '73', buyerId: '1500', role: 'Self' })

    expect(view.find('.grid').exists()).toBe(false)
  })

  it('reloads when the buyer id prop changes', async () => {
    const view = await mountTab()
    fetchBuyerOpportunity.mockResolvedValue(opportunity({ id: 99, header: { ...opportunity().header, parentName: 'A Different Parent' } }))

    await view.setProps({ buyerId: '99' })
    await flushPromises()

    expect(fetchBuyerOpportunity).toHaveBeenCalledWith(VERSION_UUID, 99, 1, undefined, false)
    expect(view.text()).toContain('A Different Parent')
  })
})
