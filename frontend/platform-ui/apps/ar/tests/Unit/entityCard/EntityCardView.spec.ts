import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchCustomerCard = vi.fn()
const fetchVersionStatus = vi.fn()
const fetchCorporateTree = vi.fn()

vi.mock('@/api', () => ({
  fetchCustomerCard: (...args: unknown[]) => fetchCustomerCard(...args),
  fetchVersionStatus: (...args: unknown[]) => fetchVersionStatus(...args),
  fetchCorporateTree: (...args: unknown[]) => fetchCorporateTree(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

const selectEntityCardTab = vi.fn()
vi.mock('@/modules/entityCard/EntityCardRouting', () => ({
  entityCard: 'EntityCard',
  openEntityCard: vi.fn(),
  selectEntityCardTab: (...args: unknown[]) => selectEntityCardTab(...args),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  ContentBox: { template: '<div><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  // Pulled in transitively by EntityCardCompanyDetailsTab -> BuyerCreditRating, which this file
  // does not mock directly (it is a real apps/ar component, exercised in its own spec).
  CustomBadge: { props: ['text'], template: '<span>{{ text }}</span>' },
  // UC-UI-21: also pulled in transitively by BuyerCreditRating and directly by EntityCardView's
  // own summary-strip disclaimer props below.
  TooltipButton: { props: ['text'], template: '<span class="tooltip-button-stub">{{ text }}</span>' },
  BigNumberThreeCols: {
    props: [
      'title', 'bigNumberTitle', 'bigNumberValue',
      'numberLeftTitle', 'numberLeftValue', 'numberLeftTitleTooltip',
      'numberCenterTitle', 'numberCenterValue', 'numberCenterTitleTooltip',
      'numberRightTitle', 'numberRightValue',
    ],
    template: `<div class="big-number-three-cols">
      <div class="title">{{ title }}</div>
      <div class="big"><span class="big-title">{{ bigNumberTitle }}</span><span class="big-value">{{ bigNumberValue }}</span></div>
      <div class="left"><span class="left-title">{{ numberLeftTitle }}</span><span class="left-value">{{ numberLeftValue }}</span><span class="left-tooltip">{{ numberLeftTitleTooltip }}</span></div>
      <div class="center"><span class="center-title">{{ numberCenterTitle }}</span><span class="center-value">{{ numberCenterValue }}</span><span class="center-tooltip">{{ numberCenterTitleTooltip }}</span></div>
      <div class="right"><span class="right-title">{{ numberRightTitle }}</span><span class="right-value">{{ numberRightValue }}</span></div>
    </div>`,
  },
}))

// The Opportunity tab's own rendering (not-calculated/computed states, the four panels, the
// strategy list) is EntityCardOpportunityTab.spec.ts's job - this file's job is the shell around
// it (loading/not-found/error, the summary strip, tab switching, the load guards), so the tab is
// stubbed to a marker asserting only that the shell forwards the right props.
vi.mock('@/modules/entityCard/components/tabs/EntityCardOpportunityTab.vue', () => ({
  default: {
    props: ['card', 'versionId'],
    template: '<div class="opportunity-tab-stub">{{ card.strategyBreakdown?.length }}/{{ versionId }}</div>',
  },
}))

import { HttpError } from '@/api/http'
import EntityCardView from '@/modules/entityCard/views/EntityCardView.vue'
import type { CustomerCardResponse } from '@/api'

const CREDIT_RATING_DISCLAIMER =
  "Credit rating is estimated from the parent company's profile and is not an independent assessment of this entity."
const CREDIT_LIMIT_DISCLAIMER =
  'Credit limit is informational only and should not be relied on for a risk or credit decision.'

const messages = {
  en: {
    arBuyers: {
      table: {
        tooltips: {
          creditRatingDisclaimer: CREDIT_RATING_DISCLAIMER,
          creditLimitDisclaimer: CREDIT_LIMIT_DISCLAIMER,
        },
      },
    },
    arEntityCard: {
      title: 'Entity Card',
      notFound: 'This buyer could not be found for this sale file version.',
      loadError: 'Could not load the entity card. Try again.',
      summary: {
        salesVolume: 'Sales Volume',
        creditLimit: 'Credit Limit',
        creditRating: 'Credit Rating',
        parent: 'Parent',
      },
      tabs: {
        opportunity: 'Opportunity',
        corporateTree: 'Corporate Tree',
        companyDetails: 'Company Details',
      },
      opportunity: {
        notCalculated: 'This version\'s opportunity data has not been calculated yet. Status: {status}.',
        computed: '{count} strategy result(s) computed for this buyer.',
      },
      corporateTree: {
        loadError: 'Could not load the corporate tree. Try again.',
        currentBuyer: 'Current buyer',
      },
      companyDetails: {
        sections: {
          profile: 'Company Profile',
          ratingsAndMetrics: 'Ratings and Metrics',
          creditRating: 'Credit Rating',
          industryRisk: 'Industry Risk',
          leverage: 'Leverage',
        },
        fields: {
          country: 'Country',
          industry: 'Industry',
          legalForm: 'Legal form',
          isPublic: 'Public company',
          internalId: 'Internal ID',
          parent: 'Parent',
          creditLimit: 'Credit limit',
          companySize: 'Company size',
          estimatedCompanySize: 'Estimated size',
          isCompanySizeFromParent: 'Size attributed to parent',
          annualRevenue: 'Annual revenue',
          annualRevenueIsEstimated: 'Revenue is estimated',
          employeesCount: 'Employees',
          creditRating: 'Credit rating',
          creditScore: 'Credit score',
          creditScoreSource: 'Credit score source',
          industryRisk: 'Industry risk',
          buyerLeverage: 'Buyer leverage',
          supplierLeverage: 'Supplier leverage',
        },
        yesNo: { true: 'Yes', false: 'No' },
      },
    },
    arMatch: {
      progress: { notAvailable: 'Not available' },
      status: { ready: 'Ready', calculating: 'Calculating' },
      roles: { all: 'All', counterparty: 'Counterparty', parent: 'Parent', self: 'Own entity' },
    },
  },
}

function mountView(props: { versionId?: string; buyerId?: string; tab?: string } = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(EntityCardView, {
    props: { versionId: '73', buyerId: '36', ...props },
    global: { plugins: [i18n] },
  })
}

function card(overrides: Partial<CustomerCardResponse> = {}): CustomerCardResponse {
  return {
    id: 36,
    role: 'Counterparty',
    resolution: 'Enriched',
    lifecycle: 'Actual',
    companyName: 'Acme Corp',
    country: 'USA',
    industry: null,
    legalForm: null,
    isPublic: null,
    internalId: null,
    companySizeId: null,
    estimatedCompanySize: null,
    isCompanySizeFromParent: null,
    annualRevenue: null,
    annualRevenueIsEstimated: null,
    employeesCount: null,
    volume: 1_300_000_000,
    actualPaymentTermsAvg: null,
    contractualPaymentTermsWithCashDiscountsAvg: null,
    contractualPaymentTermsWithoutCashDiscountsAvg: null,
    dpo: null,
    dpoSource: null,
    dpoStrategy: null,
    dpoStrategyByParent: null,
    dpoReference: null,
    saleFileVersionId: 73,
    creditScore: null,
    creditScoreReferenceId: null,
    creditScoreSource: null,
    creditRating: 'BBB',
    strategyBreakdown: null,
    currentTerm: null,
    recommendedTerm: null,
    cashFlowImpact: null,
    economicProfitImpact: null,
    economicProfitBuyerImpact: null,
    winningStrategy: null,
    noOpportunityReason: null,
    probabilityTier: null,
    cashFlowImpactTier: null,
    nineBoxCell: null,
    probabilityScore: null,
    probabilityScoreBreakdown: null,
    creditLimit: 850_000,
    parentId: 12,
    parentName: 'Acme Holdings',
    ...overrides,
  }
}

describe('EntityCardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    fetchCustomerCard.mockReset()
    selectEntityCardTab.mockReset()
  })

  it('shows a loading state while the card is in flight', async () => {
    fetchCustomerCard.mockImplementation(() => new Promise(() => {}))
    const view = mountView()
    await flushPromises()

    expect(view.find('.loading').exists()).toBe(true)
  })

  it('treats a malformed route segment as not-found without asking the API (same guard as the Customer Card)', async () => {
    const view = mountView({ buyerId: 'abc' })
    await flushPromises()

    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
    expect(fetchCustomerCard).not.toHaveBeenCalled()
  })

  it('shows the not-found state on a 404', async () => {
    fetchCustomerCard.mockRejectedValue(new HttpError(404, '/buyers/36', ''))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('shows a load error on any other failure', async () => {
    fetchCustomerCard.mockRejectedValue(new HttpError(500, '/buyers/36', ''))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Could not load the entity card. Try again.')
  })

  it('renders the summary strip with sales volume, credit rating, credit limit and parent at a glance (UC-UI-06 basic flow step 2, G-479)', async () => {
    fetchCustomerCard.mockResolvedValue(
      card({ volume: 1_300_000_000, creditRating: 'BBB', creditLimit: 850_000, parentName: 'Acme Holdings' }),
    )
    const view = mountView()
    await flushPromises()

    const strip = view.find('.big-number-three-cols')
    expect(strip.find('.big-title').text()).toBe('Sales Volume')
    expect(strip.find('.big-value').text()).toBe('$1.3b')
    expect(strip.find('.left-value').text()).toBe('$850k')
    expect(strip.text()).toContain('BBB')
    expect(strip.find('.right-value').text()).toBe('Acme Holdings')
  })

  it('shows "Not available" for credit limit, credit rating and parent when the card has none, rather than "$0" or blank', async () => {
    fetchCustomerCard.mockResolvedValue(
      card({ creditLimit: null, creditRating: null, parentId: null, parentName: null }),
    )
    const view = mountView()
    await flushPromises()

    const strip = view.find('.big-number-three-cols')
    expect(strip.find('.left-value').text()).toBe('Not available')
    expect(strip.find('.center-value').text()).toBe('Not available')
    expect(strip.find('.right-value').text()).toBe('Not available')
  })

  it('carries the credit-limit and credit-rating disclaimers on the summary strip (UC-UI-21 FR-1/FR-2)', async () => {
    fetchCustomerCard.mockResolvedValue(card({ creditRating: 'BBB', creditLimit: 850_000 }))
    const view = mountView()
    await flushPromises()

    const strip = view.find('.big-number-three-cols')
    expect(strip.find('.left-tooltip').text()).toBe(CREDIT_LIMIT_DISCLAIMER)
    expect(strip.find('.center-tooltip').text()).toBe(CREDIT_RATING_DISCLAIMER)
  })

  it('carries no summary-strip disclaimer for a figure that is not on record (UC-UI-21 AF-1)', async () => {
    fetchCustomerCard.mockResolvedValue(card({ creditLimit: null, creditRating: null }))
    const view = mountView()
    await flushPromises()

    const strip = view.find('.big-number-three-cols')
    expect(strip.find('.left-tooltip').text()).toBe('')
    expect(strip.find('.center-tooltip').text()).toBe('')
  })

  it('selects the Opportunity tab by default (UC-UI-06 basic flow step 3)', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    const view = mountView()
    await flushPromises()

    const active = view.findAll('.tabs-row button.active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toContain('Opportunity')
  })

  it('forwards the full card and the numeric version id to the Opportunity tab', async () => {
    fetchCustomerCard.mockResolvedValue(card({ strategyBreakdown: [] }))
    const view = mountView()
    await flushPromises()

    expect(view.find('.opportunity-tab-stub').text()).toBe('0/73')
  })

  it('switches to the Corporate Tree tab on click and asks the router to record it', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    const view = mountView()
    await flushPromises()

    const corporateTreeTab = view.findAll('.tabs-row button').find((btn) => btn.text().includes('Corporate Tree'))
    await corporateTreeTab?.trigger('click')

    expect(selectEntityCardTab).toHaveBeenCalledWith(73, 36, 'corporate-tree')
  })

  it('renders the Corporate Tree tab once the route names it, without refetching the card', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    fetchCorporateTree.mockResolvedValue({
      buyerId: 36,
      nodes: [{ id: 36, companyName: 'Acme Corp', role: 'Counterparty', resolution: 'Enriched', isRequestedBuyer: true }],
      edges: [],
      cycles: [],
      partial: false,
      truncated: false,
    })
    const view = mountView()
    await flushPromises()
    expect(fetchCustomerCard).toHaveBeenCalledTimes(1)

    await view.setProps({ tab: 'corporate-tree' })
    await flushPromises()

    expect(fetchCorporateTree).toHaveBeenCalledWith(73, 36, 1)
    expect(view.find('.corporate-tree-node').exists()).toBe(true)
    expect(fetchCustomerCard).toHaveBeenCalledTimes(1)
  })

  it('renders the Company Details tab once the route names it, passing the loaded card straight through (UI-09)', async () => {
    fetchCustomerCard.mockResolvedValue(card({ country: 'USA', creditRating: 'BBB' }))
    const view = mountView({ tab: 'company-details' })
    await flushPromises()

    expect(view.text()).toContain('USA')
    expect(view.text()).toContain('BBB')
    expect(fetchCustomerCard).toHaveBeenCalledTimes(1)
  })

  it('shows the real credit limit and parent on the summary strip once the card carries them (G-479, frontend half)', async () => {
    fetchCustomerCard.mockResolvedValue(card({ creditLimit: 250_000, parentName: 'Acme Holdings' }))
    const view = mountView()
    await flushPromises()

    const strip = view.find('.big-number-three-cols')
    expect(strip.find('.left-value').text()).toBe('$250k')
    expect(strip.find('.right-value').text()).toBe('Acme Holdings')
  })

  it('shows "Not available" for credit limit and parent when the card carries neither, rather than blank', async () => {
    fetchCustomerCard.mockResolvedValue(card({ creditLimit: null, parentName: null }))
    const view = mountView()
    await flushPromises()

    const strip = view.find('.big-number-three-cols')
    expect(strip.find('.left-value').text()).toBe('Not available')
    expect(strip.find('.right-value').text()).toBe('Not available')
  })

  it('reloads the card when the route moves to a different buyer', async () => {
    fetchCustomerCard.mockResolvedValueOnce(card({ companyName: 'Acme Corp' }))
    const view = mountView()
    await flushPromises()
    expect(view.text()).toContain('Acme Corp')

    fetchCustomerCard.mockResolvedValueOnce(card({ companyName: 'Globex Corp' }))
    await view.setProps({ buyerId: '99' })
    await flushPromises()

    expect(fetchCustomerCard).toHaveBeenCalledTimes(2)
    expect(fetchCustomerCard).toHaveBeenLastCalledWith(73, 99, 1)
    expect(view.text()).toContain('Globex Corp')
  })

  it('discards a slower response once a newer navigation has already landed (stale-load guard)', async () => {
    let resolveFirst: (value: CustomerCardResponse) => void = () => {}
    fetchCustomerCard.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    const view = mountView()
    await flushPromises()

    fetchCustomerCard.mockResolvedValueOnce(card({ companyName: 'Globex Corp' }))
    await view.setProps({ buyerId: '99' })
    await flushPromises()
    expect(view.text()).toContain('Globex Corp')

    resolveFirst(card({ companyName: 'Acme Corp' }))
    await flushPromises()

    expect(view.text()).toContain('Globex Corp')
    expect(view.text()).not.toContain('Acme Corp')
  })
})
