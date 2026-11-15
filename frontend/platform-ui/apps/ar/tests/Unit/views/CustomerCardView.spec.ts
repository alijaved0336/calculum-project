import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchCustomerCard = vi.fn()
const fetchBuyerCompanyDetails = vi.fn()
const fetchBuyerCorporateTree = vi.fn()
const fetchBuyerRatingsMetrics = vi.fn()
const fetchBuyerOpportunity = vi.fn()
vi.mock('@/api', () => ({
  fetchCustomerCard: (...args: unknown[]) => fetchCustomerCard(...args),
  fetchBuyerCompanyDetails: (...args: unknown[]) => fetchBuyerCompanyDetails(...args),
  fetchBuyerCorporateTree: (...args: unknown[]) => fetchBuyerCorporateTree(...args),
  fetchBuyerRatingsMetrics: (...args: unknown[]) => fetchBuyerRatingsMetrics(...args),
  fetchBuyerOpportunity: (...args: unknown[]) => fetchBuyerOpportunity(...args),
}))

vi.mock('@/modules/buyers/components/customerCard/StrategyResultsPanel.vue', () => ({
  default: {
    props: ['strategyBreakdown', 'winningStrategy'],
    template: '<div class="strategy-results-stub" />',
  },
}))

vi.mock('@/modules/buyers/components/customerCard/BuyerLinesGrid.vue', () => ({
  default: {
    props: ['versionId', 'buyerId'],
    template: '<div class="buyer-lines-grid-stub" />',
  },
}))

// A Counterparty's Opportunity tab mounts this GraphQL-backed grid - stubbed so a tree fallback
// resolving to a Counterparty doesn't send real Apollo requests from a unit test.
vi.mock('@/modules/buyers/components/customerCard/OpportunityListBuyers.vue', () => ({
  default: {
    template: '<div class="opportunity-list-buyers-stub" />',
  },
}))

vi.mock('@ada/design-system', () => ({
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  ContentBox: { template: '<div class="content-box"><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  Skeleton: { template: '<div class="skeleton-stub" />' },
  TooltipButton: { props: ['text', 'position'], template: '<span class="tooltip-button-stub" />' },
  Tooltip: { template: '<div class="tooltip-stub"><slot /></div>' },
  LocationMap: { props: ['apiKey', 'latitude', 'longitude'], template: '<div class="location-map-stub" />' },
  CustomBadge: { props: ['text', 'variant', 'dot'], template: '<span class="custom-badge-stub">{{ text }}</span>' },
  CustomButton: { props: ['text', 'variant'], template: '<button class="custom-button-stub">{{ text }}</button>' },
  ToggleSwitch: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" class="toggle-switch-stub" :checked="modelValue" />' },
  BarsWrapper: { props: ['title', 'mainValue', 'contractualValue', 'extraValue', 'type'], template: '<div class="bars-wrapper-stub">{{ title }}: {{ mainValue }}</div>' },
  LevelBar: { props: ['level', 'segments', 'label'], template: '<div class="level-bar-stub">{{ level }}</div>' },
  BodyText: { template: '<span><slot /></span>' },
  DisplayText: { template: '<span><slot /></span>' },
  StringUtils: class {
    static isNullUndefinedOrEmpty(value: unknown): boolean {
      return value === '' || value === null || value === undefined
    }
  },
  CustomTabs: {
    props: ['items', 'modelValue', 'appearance', 'contained'],
    emits: ['update:modelValue'],
    template: `
      <div class="tabs-stub">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          @click="$emit('update:modelValue', item.id)"
        >{{ item.label }}</button>
      </div>
    `,
  },
}))

import CustomerCardView from '@/modules/match/views/CustomerCardView.vue'
import CustomerCardOpportunityTab from '@/modules/buyers/components/customerCard/CustomerCardOpportunityTab.vue'
import { useContextStore } from '@/stores/context'
import { HttpError } from '@/api/http'
import type { BuyerOpportunityResponse, CustomerCardResponse } from '@/api'
import type { CustomerCardIdentity } from '@/stores/customerCardModal'

// Fingerprint for "the Opportunity tab rendered its real data" below is header.parentName - the
// same value ('Automatic Data Processing, Inc') the tab's own mockup used to hardcode, now read
// off the fetch instead.
function opportunity(overrides: Partial<BuyerOpportunityResponse> = {}): BuyerOpportunityResponse {
  return {
    id: 42,
    role: 'Counterparty',
    header: {
      creditLimit: 96200,
      parentUploadedCreditLimit: 345700,
      creditInsured: '0.9',
      salesMateriality: null,
      totalSales: 730200,
      parentTotalSales: 1400000,
      supplierEntities: 'Texas A&M Canada',
      currencyCode: 'USD',
      creditRating: 'AA-',
      parentName: 'Automatic Data Processing, Inc',
    },
    paymentTerms: {
      currentTerm: 60, recommendedTerm: 45, outstanding: 120000, projectedOutstanding: 90000,
      pastDueDays: null, pastDueOutstanding: null, projectedPastDueDays: null, projectedPastDueOutstanding: null,
      actualPaymentTermsAvg: 72, contractualPaymentTermsWithoutCashDiscountsAvg: 60,
      contractualPaymentTermsWithCashDiscountsAvg: null, cashDiscounts: null,
    },
    supplierImpact: { cashFlowImpact: 30000, economicProfitImpact: 2000 },
    probabilityOfSuccess: {
      priority: 'High',
      probabilityScore: 224,
      probabilityTier: 'High',
      cashFlowImpactTier: 'Medium',
      termsDecreaseTier: null,
      supplierLeverage: null,
      buyerLeverage: null,
      economicProfitImpactTier: null,
      insightsCount: null,
      insightsTier: null,
    },
    terms: [
      { key: 'contractualTerms', terms: 60, extra: null },
      { key: 'currentTerms', terms: 72, extra: null },
      { key: 'proposedTerms', terms: 45, extra: null },
    ],
    strategies: [
      { key: 'CounterPartyStandard2', terms: 57, extra: null },
      { key: 'PeerGroupStandard2', terms: 53, extra: null },
      { key: 'BuyerOrParentMin', terms: 50, extra: null },
      { key: 'IndustryRegionGroup', terms: 51, extra: null },
      { key: 'BuyersRegulatory', terms: 60, extra: null },
      { key: 'CreditLimitMax', terms: 52, extra: null },
    ],
    ...overrides,
  }
}

function card(overrides: Partial<CustomerCardResponse> = {}): CustomerCardResponse {
  return {
    id: 42,
    role: 'Counterparty',
    resolution: 'Resolved',
    lifecycle: 'Actual',
    companyName: 'Caterpillar Inc',
    country: 'Spain',
    industry: '541',
    legalForm: null,
    isPublic: null,
    internalId: null,
    companySizeId: null,
    estimatedCompanySize: null,
    isCompanySizeFromParent: null,
    annualRevenue: null,
    annualRevenueIsEstimated: null,
    employeesCount: null,
    volume: 777200,
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
    creditRating: null,
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
    creditLimit: null,
    parentId: null,
    parentName: null,
    ...overrides,
  }
}

const messages = {
  en: {
    arMatch: {
      roles: { parent: 'Parent', counterparty: 'Counterparty', self: 'Self' },
      table: { country: 'Country', industry: 'Industry', revenue: 'Revenue' },
    },
    arCustomerCard: {
      title: 'Customer Card',
      back: 'Back to Companies',
      notFound: 'This buyer could not be found for this sale file version.',
      loadError: 'Could not load the customer card. Try again.',
      notAvailable: '—',
      yesNo: { true: 'Yes', false: 'No' },
      tabs: {
        opportunity: 'Opportunity',
        corporateTree: 'Corporate Tree',
        companyDetails: 'Company Details',
        ratingsAndMetrics: 'Ratings & Metrics',
      },
      corporateTree: {
        columns: { parents: 'Buyer Ultimate Parents', buyers: 'Buyer Entities', subsidiaries: 'Sales Lines' },
      },
      sections: {
        identity: 'Identity',
        size: 'Size and revenue',
        volumeTerms: 'Volume and payment terms',
        dpo: 'Days payable outstanding',
      },
      fields: {
        resolution: 'Resolution',
        lifecycle: 'Lifecycle',
        legalForm: 'Legal form',
        isPublic: 'Public company',
        internalId: 'Internal ID',
        companySize: 'Company size',
        estimatedCompanySize: 'Estimated size',
        isCompanySizeFromParent: 'Size attributed to parent',
        annualRevenueIsEstimated: 'Revenue is estimated',
        employeesCount: 'Employees',
        volume: 'Volume',
        actualPaymentTermsAvg: 'Actual payment terms (avg)',
        contractualPaymentTermsWithCashDiscountsAvg: 'Contractual terms with cash discount (avg)',
        contractualPaymentTermsWithoutCashDiscountsAvg: 'Contractual terms without cash discount (avg)',
        dpo: 'DPO',
        dpoSource: 'DPO source',
        dpoStrategy: 'DPO strategy',
        dpoStrategyByParent: 'DPO attributed to parent',
        dpoReference: 'Reference DPO',
      },
      companyDetails: {
        sections: {
          description: 'Description',
          relationship: 'Relationship',
          location: 'Location',
          identification: 'Identification',
          customFieldsValues: 'Custom fields values',
        },
        fields: {
          country: 'Country',
          industry: 'Industry',
          commodity: 'Commodity(ies)',
          ultimateParent: 'Ultimate parent',
          ownership: 'Ownership',
          url: 'URL',
          buyingEntities: 'Buying Entities',
          buyingCountries: 'Buying Country(ies)',
          procurementTeam: 'Procurement Team(s)',
          relationshipSince: 'Relationship Since',
          dateOfLastTermNegotiation: 'Date of Last Term Negotiation',
          address: 'Address',
          phoneNumber: 'Phone Number',
          taxId: 'Tax ID',
          spendFileInternalId: 'Spend File Internal ID',
        },
        tooltips: {
          country: 'The country where the buyer is headquartered.',
          industry: 'The NAICS industry description of which the buyer operates within.',
          commodity: 'The commodities that the buyer purchases from the supplier as provided in the spend data.',
          ultimateParent: 'The ultimate parent company that owns or controls the buyer.',
          ownership: 'The ownership structure of the company (e.g., Public, Private, Government).',
          url: 'The official website domain of the company.',
        },
        noCustomAttributes: 'This buyer has no custom attributes.',
      },
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
          percentOfTotalSales: '% of Total Sales',
          baseRate: 'Base Rate',
          costOfDebt: 'Cost of Debt (Credit Spread)',
        },
        sources: { internal: 'Internal', external: 'External' },
        tooltips: {
          companyCreditRating: 'Company credit rating tooltip.',
          creditRatingComparison: 'Credit rating comparison tooltip.',
          ratingDescription: 'Rating description tooltip.',
          probabilityOfDefault: 'Probability of default tooltip.',
          buyerFinancialMetrics: 'Buyer financial metrics tooltip.',
          exposure: 'Exposure tooltip.',
          supplierLeverage: 'Supplier leverage tooltip.',
          buyerLeverage: 'Buyer leverage tooltip.',
          buyerFinancingRate: 'Buyer financing rate tooltip.',
        },
      },
    },
    arEntityCard: {
      corporateTree: {
        loadError: 'Could not load the corporate tree. Try again.',
        truncated: 'The tree stopped at a depth or size limit; more of the group structure may exist beyond what is shown.',
        cyclesDetected: '{count} ownership cycle(s) found in the data; the walk stopped where each was found rather than looping.',
        currentBuyer: 'Current buyer',
      },
    },
    home: {
      entityCard: {
        details: {
          estimatedSource: 'Estimated',
        },
        companyDetails: {
          general: {
            smeCardTitle: 'Small and Medium-Sized Enterprise (SME)',
            notSmeCardTitle: 'Not a Small and Medium-Sized Enterprise (NOT-SME)',
            source: 'Source',
          },
          sources: {
            sweden: {
              name: 'Sweden',
              cardDescription: 'This classification case is for Sweden.',
              cardLimits: [
                { label: 'Revenue ', value: '< EUR 50.0m' },
                { label: 'Assets ', value: '< EUR 43.0m' },
                { label: 'Employees ', value: '< 250' },
              ],
              card: '<div>This classification case is for Sweden.</div>',
            },
            notSME: {
              name: 'Default',
              cardDescription: "The company's data does not match the SME criteria.",
              cardLimits: [
                { label: 'Revenue ', value: '< USD 55.0m' },
                { label: 'Assets', value: '< USD 47.3m' },
                { label: 'Employees', value: '< 250' },
              ],
              card: "<div>The company's data does not match the SME criteria.</div>",
            },
          },
        },
      },
    },
  },
}

function buyerIdentity(overrides: Partial<CustomerCardIdentity> = {}): CustomerCardIdentity {
  return {
    id: 42,
    role: 'Counterparty',
    resolution: 'Resolved',
    lifecycle: 'Actual',
    name: 'Caterpillar Inc',
    originalName: null,
    url: null,
    volume: null,
    forecastVolume: null,
    negotiationStatus: null,
    negotiationStatusCode: null,
    parentId: null,
    parentName: null,
    saleLineCount: 0,
    country: null,
    countryFlagUrl: null,
    industry: null,
    isSme: null,
    smeSource: null,
    isPilot: false,
    creditLimit: null,
    creditRating: null,
    actualPaymentTermsAvg: null,
    contractualPaymentTermsWithCashDiscountsAvg: null,
    contractualPaymentTermsWithoutCashDiscountsAvg: null,
    ...overrides,
  }
}

const seededBuyer = buyerIdentity({ name: 'Caterpillar Inc', role: 'Parent' })

const VERSION_UUID = '1653c234-9318-4707-a6c3-33f4b427126c'

function mountView(
  props: { versionId: string; buyerId: string; initialBuyer?: CustomerCardIdentity } = { versionId: '73', buyerId: '42' },
  options: { seedVersion?: boolean } = {},
) {
  // Company Details and Ratings & Metrics fetch via context.saleFileVersionUuid, not the
  // versionId prop (see useBuyerCompanyDetails/useBuyerRatingsMetrics's own doc) - a version has
  // to be active for either tab to reach its real content instead of "not found". A caller that
  // needs to control the version itself (a specific uuid, or none yet, for the header's own
  // direct-navigation fetch below) passes `seedVersion: false` to skip this default.
  if (options.seedVersion ?? true) {
    useContextStore().setVersion(73, VERSION_UUID)
  }
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(CustomerCardView, {
    props,
    global: { plugins: [i18n] },
  })
}

describe('CustomerCardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // A "not called" assertion (the header's own fallback fetch, seeded vs. not) needs a clean
    // call history - without this, an earlier test's call to the same mock survives and this one
    // fails on leftover state that has nothing to do with what it is testing.
    vi.clearAllMocks()
    // clearAllMocks keeps implementations: an earlier test's resolved tree would otherwise feed
    // the view's own sales-lines fallback in every later test.
    fetchBuyerCorporateTree.mockReset()
  })

  it('shows the seeded buyer name and role above the tabs immediately, before any tab has fetched anything', () => {
    fetchCustomerCard.mockImplementation(() => new Promise(() => {}))

    const view = mountView({
      versionId: '73',
      buyerId: '42',
      initialBuyer: seededBuyer,
    })

    expect(view.text()).toContain('Caterpillar Inc')
    expect(view.text()).toContain('Parent')
  })

  it('fetches and shows the entity name when reached by direct navigation (no seed)', async () => {
    useContextStore().setVersion(73, 'version-uuid')
    fetchBuyerCompanyDetails.mockResolvedValue({
      companyName: 'Caterpillar Inc', originalName: 'CATERPILLAR INC.', role: 'Parent',
      countryName: 'United States', countryFlagUrl: null, logoUrl: null,
    })
    fetchBuyerOpportunity.mockReturnValue(new Promise(() => {}))

    const view = mountView({ versionId: '73', buyerId: '42' }, { seedVersion: false })
    await flushPromises()

    expect(fetchBuyerCompanyDetails).toHaveBeenCalledWith('version-uuid', 42)
    expect(view.text()).toContain('Caterpillar Inc')
  })

  it('does not fetch Company Details for the header when a caller seeded it', async () => {
    useContextStore().setVersion(73, 'version-uuid')
    fetchBuyerOpportunity.mockReturnValue(new Promise(() => {}))

    mountView({ versionId: '73', buyerId: '42', initialBuyer: seededBuyer })
    await flushPromises()

    expect(fetchBuyerCompanyDetails).not.toHaveBeenCalled()
  })

  it('shows the name once the navbar sets the version uuid after first paint', async () => {
    fetchBuyerCompanyDetails.mockResolvedValue({
      companyName: 'Caterpillar Inc', originalName: null, role: 'Parent',
      countryName: null, countryFlagUrl: null, logoUrl: null,
    })
    fetchBuyerOpportunity.mockReturnValue(new Promise(() => {}))

    const view = mountView({ versionId: '73', buyerId: '42' }, { seedVersion: false })
    await flushPromises()
    expect(view.text()).not.toContain('Caterpillar Inc')

    useContextStore().setVersion(73, 'version-uuid')
    await flushPromises()

    expect(view.text()).toContain('Caterpillar Inc')
  })

  it('renders the seeded name, never the fallback fetch, once a seed arrives after an unseeded mount', async () => {
    // Regression pin for `useBuyerCompanyDetails`'s `isEnabled() === false` branch: a caller can
    // seed `initialBuyer` after the view has already mounted unseeded and started its own fallback
    // fetch (e.g. the Buyers roster finishing its own load just after this view opened). The
    // fallback fetch is left unresolved here on purpose, so the assertion below only passes if the
    // seed wins outright rather than racing whatever the fallback eventually resolves to.
    let resolveFallback: (value: unknown) => void = () => {}
    fetchBuyerCompanyDetails.mockReturnValue(new Promise((resolve) => { resolveFallback = resolve }))
    fetchBuyerOpportunity.mockReturnValue(new Promise(() => {}))

    const view = mountView({ versionId: '73', buyerId: '42' })
    await flushPromises()
    expect(view.text()).not.toContain('Caterpillar Inc')

    await view.setProps({ versionId: '73', buyerId: '42', initialBuyer: seededBuyer })
    await flushPromises()

    // The fallback fetch resolves only after the seed has already arrived - if `headerCard` ever
    // preferred the fallback over `initialBuyer`, this would render 'Fallback Co' instead.
    resolveFallback({
      companyName: 'Fallback Co', originalName: null, role: 'Counterparty',
      countryName: null, countryFlagUrl: null, logoUrl: null,
    })
    await flushPromises()

    expect(view.text()).toContain('Caterpillar Inc')
    expect(view.text()).not.toContain('Fallback Co')
  })

  it('renders no header, and does not throw, when the fallback fetch 404s', async () => {
    useContextStore().setVersion(73, 'version-uuid')
    fetchBuyerCompanyDetails.mockRejectedValue(new HttpError(404, '/api/buyers/version-uuid/42/company-details', 'Not Found'))
    fetchBuyerOpportunity.mockReturnValue(new Promise(() => {}))

    const view = mountView({ versionId: '73', buyerId: '42' })
    await flushPromises()

    expect(view.find('.customer-card-header-logo').exists()).toBe(false)
  })

  describe('sales lines fallback (opened from a grid cell or a direct URL)', () => {
    const saleLine = { saleLineId: 501 }
    function treeWithRequestedNode() {
      return {
        buyerId: 42,
        nodes: [
          { id: 7, role: 'Parent', isRequestedBuyer: false, salesLines: [], companyDetails: null },
          {
            id: 42,
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [saleLine],
            salesLinesTruncated: false,
            companyDetails: { parentId: 7 },
          },
        ],
        edges: [], cycles: [], partial: false, truncated: false,
      }
    }

    it('fetches the corporate tree and hands the requested node\'s sales lines, role and parent to the Opportunity tab when the seed carries none', async () => {
      fetchBuyerOpportunity.mockReturnValue(new Promise(() => {}))
      fetchBuyerCorporateTree.mockResolvedValue(treeWithRequestedNode())

      // A grid row's seed: identity only, no `salesLines` key at all.
      const view = mountView({ versionId: '73', buyerId: '42', initialBuyer: buyerIdentity({ role: undefined as never, parentId: null }) })
      await flushPromises()

      expect(fetchBuyerCorporateTree).toHaveBeenCalledWith(VERSION_UUID, 42, expect.anything())
      const tab = view.findComponent(CustomerCardOpportunityTab)
      expect(tab.props('salesLines')).toEqual([saleLine])
      expect(tab.props('role')).toBe('Counterparty')
      expect(tab.props('parentId')).toBe(7)
    })

    it('does not fetch the corporate tree when the seed already carries sales lines, even an empty list', async () => {
      fetchBuyerOpportunity.mockReturnValue(new Promise(() => {}))

      const view = mountView({ versionId: '73', buyerId: '42', initialBuyer: buyerIdentity({ salesLines: [] }) })
      await flushPromises()

      expect(fetchBuyerCorporateTree).not.toHaveBeenCalled()
      expect(view.findComponent(CustomerCardOpportunityTab).props('salesLines')).toEqual([])
    })
  })

  it('defaults to the Opportunity tab', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    fetchBuyerOpportunity.mockResolvedValue(opportunity())

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Automatic Data Processing, Inc')
  })

  it('switches to Company Details and shows its own sections instead of the Opportunity content', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    fetchBuyerOpportunity.mockResolvedValue(opportunity())
    fetchBuyerCompanyDetails.mockResolvedValue({ customAttributes: [], creditRating: null, isSme: null, smeSource: null })

    const view = mountView()
    await flushPromises()

    // Switching tabs mounts a fresh tab component, which fetches its own copy independently -
    // its content only appears once THAT fetch resolves, not synchronously on the click.
    await view.get('button:nth-of-type(3)').trigger('click')
    await flushPromises()

    expect(view.text()).not.toContain('Automatic Data Processing, Inc')
    expect(view.findAll('.content-box').length).toBeGreaterThan(0)
  })

  it('switches to Corporate Tree and shows that buyer\'s tree', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    fetchBuyerCorporateTree.mockResolvedValue({
      buyerId: 42,
      nodes: [
        {
          id: 42,
          companyName: 'Acme',
          role: 'Self',
          resolution: 'Enriched',
          isRequestedBuyer: true,
          volume: 0,
          paymentTerms: null,
          paymentTermsOpportunity: null,
          cashFlow: 0,
          country: null,
          salesLines: [],
          salesLinesTruncated: false,
        },
      ],
      edges: [],
      cycles: [],
      partial: false,
      truncated: false,
    })

    const view = mountView()
    await flushPromises()

    await view.get('button:nth-of-type(2)').trigger('click')
    await flushPromises()

    expect(view.find('.corporate-tree-node').exists()).toBe(true)
  })

  it('switches to Ratings & Metrics and shows its content instead of the Opportunity content', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    fetchBuyerOpportunity.mockResolvedValue(opportunity())
    fetchBuyerRatingsMetrics.mockResolvedValue({
      id: 42,
      role: 'Counterparty',
      creditScore: {
        score: 55,
        referenceId: 46,
        source: 'internal',
        rating: 'BBB-',
        description: null,
      },
      probabilityOfDefault: 0.0022,
      industryRiskScore: null,
      industryRiskFlag: null,
      countryRisk: { score: 8, flag: true },
      buyerLeverage: 0.0000072,
      supplierLeverage: 0.0000069,
      brandValueReferenceId: null,
      brandLevel: null,
      brandPaymentTermsFactor: null,
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
        flagUrl: null,
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
    })

    const view = mountView()
    await flushPromises()

    await view.get('button:nth-of-type(4)').trigger('click')
    await flushPromises()

    expect(view.text()).not.toContain('Automatic Data Processing, Inc')
    expect(view.text()).toContain('Company Credit Rating')
    expect(view.text()).toContain('BBB-')
  })

  it('resets to the Opportunity tab when navigating to a different buyer', async () => {
    fetchCustomerCard.mockResolvedValue(card())
    fetchBuyerOpportunity.mockResolvedValue(opportunity())
    fetchBuyerCompanyDetails.mockResolvedValue({ customAttributes: [], creditRating: null, isSme: null, smeSource: null })

    const view = mountView()
    await flushPromises()
    await view.get('button:nth-of-type(3)').trigger('click')
    await flushPromises()
    expect(view.findAll('.content-box').length).toBeGreaterThan(0)

    fetchCustomerCard.mockResolvedValue(card({ id: 99 }))
    await view.setProps({ buyerId: '99' })
    await flushPromises()

    expect(view.text()).toContain('Automatic Data Processing, Inc')
  })

  it('shows the tab bar immediately, before any tab\'s own fetch has resolved', () => {
    fetchCustomerCard.mockImplementation(() => new Promise(() => {}))

    const view = mountView()

    expect(view.find('.tabs-stub').exists()).toBe(true)
  })

  it('shows the Opportunity tab\'s own loading state independently of the tab bar', () => {
    fetchBuyerOpportunity.mockImplementation(() => new Promise(() => {}))

    const view = mountView()

    expect(view.find('.skeleton-stub').exists()).toBe(true)
  })
})
