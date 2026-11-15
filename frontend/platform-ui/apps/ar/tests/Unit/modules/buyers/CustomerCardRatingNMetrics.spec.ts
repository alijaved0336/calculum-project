import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import type { BuyerRatingsMetricsResponse } from '@/api'

const fetchBuyerRatingsMetrics = vi.fn()
vi.mock('@/api', () => ({
  fetchBuyerRatingsMetrics: (...args: unknown[]) => fetchBuyerRatingsMetrics(...args),
}))

vi.mock('@ada/design-system', () => ({
  BodyText: { template: '<span><slot /></span>' },
  DisplayText: { template: '<span><slot /></span>' },
  ContentBox: { template: '<div class="content-box-stub"><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div class="content-box-body-stub"><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  Skeleton: { template: '<div class="skeleton-stub" />' },
  Tooltip: { template: '<div class="tooltip-stub"><slot /></div>' },
  TooltipButton: { props: ['text'], template: '<span class="tooltip-button-stub" />' },
}))

import { TooltipButton } from '@ada/design-system'
import CustomerCardRatingNMetrics from '@/modules/buyers/components/customerCard/CustomerCardRatingNMetrics.vue'

const CREDIT_RATING_DISCLAIMER =
  "Credit rating is estimated from the parent company's profile and is not an independent assessment of this entity."
const CREDIT_LIMIT_DISCLAIMER =
  'Credit limit is informational only and should not be relied on for a risk or credit decision.'
import RatingComparisonBar from '@/modules/buyers/components/customerCard/bars/RatingComparisonBar.vue'
import { useContextStore } from '@/stores/context'

const VERSION_UUID = '01a034b7-3356-7e5a-89d1-295d587d6346'

function ratingsMetrics(overrides: Partial<BuyerRatingsMetricsResponse> = {}): BuyerRatingsMetricsResponse {
  return {
    id: 1516,
    role: 'Counterparty',
    creditScore: {
      score: 55,
      referenceId: 46,
      source: 'internal',
      rating: 'BBB-',
      description: null,
      level: null,
    },
    probabilityOfDefault: 0.0022,
    industryRiskScore: null,
    industryRiskFlag: null,
    countryRisk: { score: 8, flag: true },
    buyerLeverage: 0.000007226417830969772,
    supplierLeverage: 0.0000069410574669559936,
    brandValueReferenceId: null,
    brandLevel: null,
    brandPaymentTermsFactor: null,
    creditLimitOutsanding: { limitMax: null, usage: null, outstanding: null, outstandingWithPastDue: null },
    exposure: { totalSales: null, outstanding: null, outstandingToSalesRatio: null, parentTotalSales: null, parentOutstanding: null, parentOutstandingToSalesRatio: null },
    overallDataDepth: { valueToDisplay: 96, description: 'Substantial', color: '#0F9D58' },
    generalInfoDataDepth: { valueToDisplay: 100, description: 'Substantial', color: '#0F9D58' },
    financialMetricsDataDepth: { valueToDisplay: 78.94, description: 'Substantial', color: '#0F9D58' },
    paymentTermsDataDepth: { valueToDisplay: 100, description: 'Substantial', color: '#0F9D58' },
    countryRating: {
      countryName: 'United States',
      creditScore: 95,
      source: 'external',
      creditScoreBand: { description: 'Very Strong Credit Rating', color: '#0F9D58' },
      spRating: 'AA+',
      moodysRating: 'Aa1',
      fitchRating: null,
      flagUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg',
      countryInfo: null,
      countryAmBestInfo: null,
    },
    financialMetrics: {
      financingStrategyMethod: 'fr',
      fundingCosts: { entity: null, parent: null },
      wacc: { maxValue: 10, source: null, preTax: { value: null, description: 'Low', color: '#0F9D58' }, afterTax: { value: 0.09, description: 'High', color: '#FF2C4F' } },
      returnOnAssets: null,
      leverage: null,
      interestCoverage: null,
      revenueGrowth: null,
      revenueGrowthSource: null,
      customRevenueY: null,
      customRevenueY1: null,
      dsoStrategy: { terms: 48, byParent: false },
    },
    industryRating: {
      industryName: 'Semiconductor and Other Electronic Component Manufacturing',
      assessment: 0.5,
      assessmentBand: { description: 'Medium', color: '#F4B400' },
      maxValue: 0.75,
      atradiusScore: 'Poor',
      industryInfo: {
        performanceForecast: { forecast: 'Poor', description: 'Below its long-term trend.' },
        industryDetails: 'Semiconductor and Other Electronic Component Manufacturing',
        performance: 'The industry suffered from supply chain disruptions.',
      },
    },
    supplierLeverageLevel: null,
    marketShareLevel: null,
    switchingCostLevel: null,
    ...overrides,
  }
}

const messages = {
  en: {
    arCustomerCard: {
      notFound: 'This buyer could not be found for this sale file version.',
      loadError: 'Could not load the customer card. Try again.',
      notAvailable: '—',
      ratingsAndMetrics: {
        sections: {
          companyCreditRating: 'Company Credit Rating',
          creditRatingComparison: 'Credit Rating Comparison',
          countryRating: 'Country Rating',
          industryRisk: 'Industry Risk',
          buyerFinancialMetrics: 'Buyer Financial Metrics',
          exposure: 'Exposure',
          creditLimit: 'Credit Limit',
          creditLimitVsOutstandings: 'Credit Limit vs Outstandings',
          supplierLeverage: 'Supplier Leverage',
          buyerLeverage: 'Buyer Leverage',
          buyerFinancingRate: 'Buyer Financing Rate',
        },
        fields: {
          ratingDescription: 'Rating Description',
          probabilityOfDefault: 'Probability of Default',
          source: 'Source',
          parent: 'Parent',
          company: 'Company',
          similarBuyers: 'Similar Buyers',
          totalSales: 'Total Sales',
          dpoDays: 'DPO (days)',
          revenueGrowth: 'Revenue Growth',
          outstandings: 'Outstandings',
          percentOfOutstandingsSales: '% of Outstandings/Sales',
          limit: 'Limit',
          percentUsed: '% Used',
          outstandingsWithoutPastDues: 'Outstandings without Past dues',
          creditInsurance: 'Credit Insurance',
          insured: 'Insured',
          marketShare: 'Market Share',
          switchingCost: 'Switching Cost',
          percentOfTotalSales: '% of Total Sales',
          baseRate: 'Base Rate',
          costOfDebt: 'Cost of Debt (Credit Spread)',
        },
        sources: { internal: 'Internal', external: 'External' },
        tooltips: {
          companyCreditRating: '',
          creditRatingComparison: '',
          ratingDescription: '',
          probabilityOfDefault: '',
          buyerFinancialMetrics: '',
          exposure: '',
          supplierLeverage: '',
          buyerLeverage: '',
          buyerFinancingRate: '',
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
    home: {
      entityCard: {
        details: {
          estimatedSource: 'Estimated',
        },
      },
    },
  },
}

function mountTab(props: { versionId: string; buyerId: string } = { versionId: '73', buyerId: '42' }) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(CustomerCardRatingNMetrics, {
    props,
    global: { plugins: [i18n] },
  })
}

describe('CustomerCardRatingNMetrics', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useContextStore().setVersion(73, VERSION_UUID)
    fetchBuyerRatingsMetrics.mockReset()
  })

  it('shows its own loading state before the fetch resolves', () => {
    fetchBuyerRatingsMetrics.mockImplementation(() => new Promise(() => {}))

    const view = mountTab()

    expect(view.find('.skeleton-stub').exists()).toBe(true)
  })

  it('shows the not-found state for a malformed buyer id, without ever calling the API', async () => {
    const view = mountTab({ versionId: '73', buyerId: 'abc' })
    await flushPromises()

    expect(fetchBuyerRatingsMetrics).not.toHaveBeenCalled()
    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('shows a load error on failure', async () => {
    fetchBuyerRatingsMetrics.mockRejectedValue(new Error('boom'))

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('Could not load the customer card. Try again.')
  })

  it('fetches the ratings-metrics endpoint scoped to the active version uuid and the given buyer id', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    mountTab({ versionId: '73', buyerId: '42' })
    await flushPromises()

    expect(fetchBuyerRatingsMetrics).toHaveBeenCalledWith(VERSION_UUID, 42, 1)
  })

  it('renders every section title, real and still-dummy alike', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('Company Credit Rating')
    expect(view.text()).toContain('Country Rating')
    expect(view.text()).toContain('Industry Risk')
    expect(view.text()).toContain('Buyer Financial Metrics')
    expect(view.text()).toContain('Exposure')
    expect(view.text()).toContain('Credit Limit')
    expect(view.text()).toContain('Credit Limit vs Outstandings')
    expect(view.text()).toContain('Supplier Leverage')
    expect(view.text()).toContain('Buyer Leverage')
    expect(view.text()).toContain('Buyer Financing Rate')
  })

  it('renders the real company credit rating grade and probability of default', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('BBB-')
    expect(view.text()).toContain('0.22%')
  })

  it('carries the credit-rating disclaimer alongside the existing derivation tooltip (UC-UI-21 FR-1)', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    const disclaimers = view.findAllComponents(TooltipButton).map((c) => c.props('text'))
    expect(disclaimers).toContain(CREDIT_RATING_DISCLAIMER)
  })

  it('shows a bare Estimated note, with no "Source:" label, when the credit score source is internal', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({ creditScore: { ...ratingsMetrics().creditScore, source: 'internal' } }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('Estimated')
    expect(view.text()).not.toContain('Source:')
  })

  it('shows no Estimated note when the credit score source is external', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({ creditScore: { ...ratingsMetrics().creditScore, source: 'external' } }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.text()).not.toContain('Estimated')
  })

  it('shows the country rating\'s own Estimated note independently of the company one', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        creditScore: { ...ratingsMetrics().creditScore, source: 'external' },
        countryRating: { ...ratingsMetrics().countryRating, source: 'Internal' },
      }),
    )

    const view = mountTab()
    await flushPromises()

    const countryCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Country Rating'))
    expect(countryCard?.text()).toContain('Estimated')
  })

  it("shows the level of the company's own credit reference row in the Rating Description slot", async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        creditScore: {
          ...ratingsMetrics().creditScore,
          level: 'Adequate Credit Rating',
          description: 'Lovelace reasoning text.',
        },
      }),
    )

    const view = mountTab()
    await flushPromises()

    const companyCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Company Credit Rating'))
    expect(companyCard?.text()).toContain('Adequate Credit Rating')
    expect(companyCard?.text()).not.toContain('Lovelace reasoning text.')
    expect(companyCard?.text()).not.toContain('Very Strong Credit Rating')
  })

  it("falls back to not-available, never the country's band, when the company has no level", async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    const companyCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Company Credit Rating'))
    expect(companyCard?.text()).toContain('—')
    expect(companyCard?.text()).not.toContain('Very Strong Credit Rating')
  })

  it('renders the real country rating grade (preferring S&P) and description', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('United States')
    expect(view.text()).toContain('AA+')
    expect(view.text()).toContain('Very Strong Credit Rating')
  })

  it('falls back to Moody\'s, then Fitch, when S&P has no rating', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        countryRating: {
          ...ratingsMetrics().countryRating,
          spRating: null,
          moodysRating: null,
          fitchRating: 'AA',
        },
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('AA')
  })

  it('renders the real DPO and revenue growth once loaded', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        financialMetrics: {
          ...ratingsMetrics().financialMetrics,
          revenueGrowth: 3.4,
        },
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('48')
    expect(view.text()).toContain('3.4%')
  })

  it('renders the real Industry Risk industry name and assessment band', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('Semiconductor and Other Electronic Component Manufacturing')
    expect(view.text()).toContain('Medium')
  })

  it('hides Industry Risk\'s Source - this response has no source field for it', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    const industryCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Industry Risk'))
    expect(industryCard).toBeDefined()
    expect(industryCard?.text()).not.toContain('Source')
  })

  it('falls back to not-available for Industry Risk when industryRating is absent', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics({ industryRating: null }))

    const view = mountTab()
    await flushPromises()

    expect(view.text()).not.toContain('Semiconductor')
    const industryCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Industry Risk'))
    expect(industryCard?.text()).toContain('—')
  })

  it('renders Exposure from the exposure key, each stat with its own parent figure', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        creditLimitOutsanding: { limitMax: null, usage: null, outstanding: 11000, outstandingWithPastDue: null },
        exposure: {
          totalSales: 362688.96,
          outstanding: 90600,
          outstandingToSalesRatio: 0.25,
          parentTotalSales: 730200,
          parentOutstanding: 146000,
          parentOutstandingToSalesRatio: 0.2,
        },
      }),
    )

    const view = mountTab()
    await flushPromises()

    const exposureCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Exposure'))
    const text = exposureCard?.text() ?? ''
    expect(text).toContain('362.7k')
    expect(text).toContain('90.6k')
    expect(text).not.toContain('11k') // creditLimitOutsanding.outstanding excludes past dues - not read here
    expect(text).toContain('25.00%')
    expect(text).toContain('Parent: $730.2k')
    expect(text).toContain('Parent: $146k')
    expect(text).toContain('Parent: 20.00%')
  })

  it('hides Credit Insurance - no backing field at all', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    expect(view.text()).not.toContain('Credit Insurance')
  })

  it('reads em dash (not-available), not a bare dash, for Credit Limit fields when the response leaves them null', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    const creditLimitCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Credit Limit') && !el.text().includes('vs Outstandings'))
    expect(creditLimitCard?.text()).toContain('—')
    // "Source" has no backing field at all, so the card hides it rather than reading a bare dash.
    expect(creditLimitCard?.text()).not.toContain('Source')
  })

  it('renders the real Credit Limit figure and formats it compactly', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({ creditLimitOutsanding: { ...ratingsMetrics().creditLimitOutsanding, limitMax: 96200 } }),
    )

    const view = mountTab()
    await flushPromises()

    const creditLimitCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Credit Limit') && !el.text().includes('vs Outstandings'))
    expect(creditLimitCard?.text()).toContain('$96.2k')
  })

  it('renders the real % Used from creditUsage', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({ creditLimitOutsanding: { ...ratingsMetrics().creditLimitOutsanding, usage: 0.002 } }),
    )

    const view = mountTab()
    await flushPromises()

    const creditLimitCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Credit Limit') && !el.text().includes('vs Outstandings'))
    expect(creditLimitCard?.text()).toContain('0.20%')
  })

  it('carries the credit-limit disclaimer on this card when there is a real limit (UC-UI-21 FR-2)', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({ creditLimitOutsanding: { ...ratingsMetrics().creditLimitOutsanding, limitMax: 96200 } }),
    )

    const view = mountTab()
    await flushPromises()

    const disclaimers = view.findAllComponents(TooltipButton).map((c) => c.props('text'))
    expect(disclaimers).toContain(CREDIT_LIMIT_DISCLAIMER)
  })

  it('carries no credit-limit disclaimer when there is no limit on record (UC-UI-21 AF-1)', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())
    const view = mountTab()
    await flushPromises()

    const disclaimers = view.findAllComponents(TooltipButton).map((c) => c.props('text'))
    expect(disclaimers).not.toContain(CREDIT_LIMIT_DISCLAIMER)
  })

  it('carries the credit-limit disclaimer on the vs-Outstandings comparison too, the same limit figure shown there (UC-UI-21 FR-2)', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({ creditLimitOutsanding: { limitMax: 100000, usage: null, outstanding: 50000, outstandingWithPastDue: 25000 } }),
    )

    const view = mountTab()
    await flushPromises()

    const disclaimers = view.findAllComponents(TooltipButton).map((c) => c.props('text'))
    expect(disclaimers).toContain(CREDIT_LIMIT_DISCLAIMER)
    // Both cards read the disclaimer when the limit is real - not just the "Credit Limit" card.
    expect(disclaimers.filter((text) => text === CREDIT_LIMIT_DISCLAIMER)).toHaveLength(2)
  })

  it('fills each Credit Limit vs Outstandings bar relative to the credit limit, Outstandings from exposure.outstanding', async () => {
    const base = ratingsMetrics()
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        // creditLimitOutsanding.outstanding (11000, no past dues) must NOT feed the Outstandings bar.
        creditLimitOutsanding: { limitMax: 100000, usage: null, outstanding: 11000, outstandingWithPastDue: 25000 },
        exposure: { ...base.exposure, outstanding: 50000 },
      }),
    )

    const view = mountTab()
    await flushPromises()

    const bars = view.findAllComponents(RatingComparisonBar)
    expect(bars[0].props('displayValue')).toBe('$100k')
    expect(bars[0].props('percent')).toBe(100)
    expect(bars[1].props('displayValue')).toBe('$50k')
    expect(bars[1].props('percent')).toBe(50)
    expect(bars[2].props('displayValue')).toBe('$25k')
    expect(bars[2].props('percent')).toBe(25)
  })

  it('clamps a Credit Limit vs Outstandings bar to 100% when the outstanding figure exceeds the limit', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        creditLimitOutsanding: { limitMax: 100000, usage: null, outstanding: null, outstandingWithPastDue: null },
        exposure: { ...ratingsMetrics().exposure, outstanding: 148000 },
      }),
    )

    const view = mountTab()
    await flushPromises()

    const bars = view.findAllComponents(RatingComparisonBar)
    expect(bars[1].props('percent')).toBe(100)
  })

  it('renders Buyer Financing Rate from fundingCosts.entity', async () => {
    const base = ratingsMetrics()
    fetchBuyerRatingsMetrics.mockResolvedValue(
      ratingsMetrics({
        financialMetrics: {
          ...base.financialMetrics,
          fundingCosts: {
            entity: { value: 0.0578, maxValue: 10, description: 'Low', color: '#0F9D58', baseRate: 0.0512, finalSpread: 0.0064, details: [] },
            parent: null,
          },
        },
      }),
    )

    const view = mountTab()
    await flushPromises()

    const financingCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Buyer Financing Rate'))
    expect(financingCard?.text()).toContain('5.78%')
    expect(financingCard?.text()).toContain('5.12%')
    expect(financingCard?.text()).toContain('0.64%')
  })

  it('shows not-available for Buyer Financing Rate when fundingCosts.entity is null', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    const financingCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Buyer Financing Rate'))
    expect(financingCard?.text()).toContain('—')
    expect(financingCard?.text()).not.toContain('5.78%')
  })

  it('shows the backend buyerLeverageLevel band as the Buyer Leverage level', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics({ buyerLeverage: 0.0007, buyerLeverageLevel: 'High' }))

    const view = mountTab()
    await flushPromises()

    const buyerCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Buyer Leverage') && !el.text().includes('Supplier'))
    expect(buyerCard?.text()).toContain('High')
    expect(buyerCard?.text()).toContain('0.07%')
  })

  it('shows the real Buyer Leverage percentage while dashing its level when buyerLeverageLevel is absent', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics({ buyerLeverage: 0.0007, supplierLeverage: 0.0035 }))

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('0.07%')
    // supplierLeverage's raw fraction is never shown - Market Share/Switching Cost render only
    // the backend's band (see the dedicated tests below), and Buyer Leverage has no band field.
    expect(view.text()).not.toContain('0.35%')

    const buyerCard = view.findAll('.content-box-stub').find((el) => el.text().includes('Buyer Leverage') && !el.text().includes('Supplier'))
    expect(buyerCard?.text()).toContain('-')
  })

  it('shows Market Share and Switching Cost as bands in the Supplier Leverage card', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics({ marketShareLevel: 'High', switchingCostLevel: 'Medium' }))

    const view = mountTab()
    await flushPromises()

    expect(view.get('.rating-market-share').text()).toContain('Market Share')
    expect(view.get('.rating-market-share').text()).toContain('High')
    expect(view.get('.rating-switching-cost').text()).toContain('Switching Cost')
    expect(view.get('.rating-switching-cost').text()).toContain('Medium')
    expect(view.text()).not.toContain('Category Criticality Factor')
  })

  it('shows the empty marker, never a default Medium, when step 59 has not run (A1)', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics({ marketShareLevel: null, switchingCostLevel: null }))

    const view = mountTab()
    await flushPromises()

    expect(view.get('.rating-market-share').text()).not.toContain('Medium')
    expect(view.get('.rating-market-share').text()).toContain('-')
    expect(view.get('.rating-switching-cost').text()).not.toContain('Medium')
    expect(view.get('.rating-switching-cost').text()).toContain('-')
  })

  it('no longer shows the DSO-09 volume ratio under the Market Share label', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics({ supplierLeverage: 0.25, marketShareLevel: 'Low' }))

    const view = mountTab()
    await flushPromises()

    expect(view.get('.rating-market-share').text()).not.toContain('25')
  })

  it('still renders one comparison bar per Credit Limit vs Outstandings row', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValue(ratingsMetrics())

    const view = mountTab()
    await flushPromises()

    expect(view.findAll('.rating-comparison-bar').length).toBe(3)
  })

  it('reloads when the buyer id prop changes', async () => {
    fetchBuyerRatingsMetrics.mockResolvedValueOnce(ratingsMetrics())
    const view = mountTab({ versionId: '73', buyerId: '42' })
    await flushPromises()
    expect(fetchBuyerRatingsMetrics).toHaveBeenCalledTimes(1)

    fetchBuyerRatingsMetrics.mockResolvedValueOnce(ratingsMetrics({ id: 99 }))
    await view.setProps({ buyerId: '99' })
    await flushPromises()

    expect(fetchBuyerRatingsMetrics).toHaveBeenCalledTimes(2)
    expect(fetchBuyerRatingsMetrics).toHaveBeenLastCalledWith(VERSION_UUID, 99, 1)
  })
})
