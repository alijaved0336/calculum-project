import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

const fetchVersionStatus = vi.fn()

vi.mock('@/api', () => ({
  fetchVersionStatus: (...args: unknown[]) => fetchVersionStatus(...args),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLoadingAr: { template: '<div class="loading" />' },
}))

// This spec is about the tab's own STATE SELECTION (not-calculated vs. no-opportunity vs.
// calculated-with-a-winner) - each panel's own rendering is its own component's spec. Mocked by
// the '@/' alias, which resolves the same regardless of which file does the importing - a
// relative path here would resolve against this spec file's own location, not the SUT's. Paths
// spelled out literally (not built from a shared const) because vi.mock is hoisted above every
// other statement in the file, including a const it would otherwise read from.
vi.mock('@/modules/entityCard/components/opportunity/PaymentTermsCard.vue', () => ({
  default: { template: '<div class="payment-terms-card" />' },
}))
vi.mock('@/modules/entityCard/components/opportunity/SupplierImpactCard.vue', () => ({
  default: { template: '<div class="supplier-impact-card" />' },
}))
vi.mock('@/modules/entityCard/components/opportunity/OpportunityAssessmentPanel.vue', () => ({
  default: { template: '<div class="assessment-panel" />' },
}))
vi.mock('@/modules/entityCard/components/opportunity/StrategyBenchmarksChart.vue', () => ({
  default: { template: '<div class="benchmarks-chart" />' },
}))
vi.mock('@/modules/entityCard/components/opportunity/StrategyList.vue', () => ({
  default: { template: '<div class="strategy-list" />' },
}))

import EntityCardOpportunityTab from '@/modules/entityCard/components/tabs/EntityCardOpportunityTab.vue'
import type { CustomerCardResponse } from '@/api'

const messages = {
  en: {
    arEntityCard: {
      opportunity: {
        notCalculated: "This version's opportunity data has not been calculated yet. Status: {status}.",
        noOpportunity: { title: 'No opportunity identified' },
      },
    },
    arMatch: {
      progress: { notAvailable: 'Not available' },
      status: { ready: 'Ready', calculating: 'Calculating' },
    },
  },
}

function mountTab(card: CustomerCardResponse, versionId = 73) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(EntityCardOpportunityTab, {
    props: { card, versionId },
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
    country: null,
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
    volume: null,
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

describe('EntityCardOpportunityTab', () => {
  afterEach(() => {
    fetchVersionStatus.mockReset()
  })

  it('names the version status when the opportunity chain has not run (UC-UI-06 A1)', async () => {
    fetchVersionStatus.mockResolvedValue({
      saleFileVersionId: 73,
      status: 'calculating',
      isError: false,
      statusDescription: null,
      currentStep: null,
      totalSteps: null,
      currentStepName: null,
      parsedAt: null,
      dateLastRecalculated: null,
    })
    const tab = mountTab(card({ strategyBreakdown: null }))
    await flushPromises()

    expect(tab.text()).toContain('has not been calculated yet')
    expect(tab.text()).toContain('Calculating')
    expect(tab.find('.payment-terms-card').exists()).toBe(false)
  })

  it('renders every panel once the chain has produced a (possibly empty) breakdown', async () => {
    const tab = mountTab(card({ strategyBreakdown: [] }))
    await flushPromises()

    expect(fetchVersionStatus).not.toHaveBeenCalled()
    expect(tab.find('.payment-terms-card').exists()).toBe(true)
    expect(tab.find('.supplier-impact-card').exists()).toBe(true)
    expect(tab.find('.assessment-panel').exists()).toBe(true)
    expect(tab.find('.benchmarks-chart').exists()).toBe(true)
    expect(tab.find('.strategy-list').exists()).toBe(true)
  })

  it('shows the no-opportunity notice with the reason when no strategy won (UC-UI-07 A1)', async () => {
    const tab = mountTab(card({ strategyBreakdown: [], winningStrategy: null, noOpportunityReason: 'Credit-constrained' }))
    await flushPromises()

    expect(tab.text()).toContain('No opportunity identified')
    expect(tab.text()).toContain('Credit-constrained')
  })

  it('does not show the no-opportunity notice once a strategy has won', async () => {
    const tab = mountTab(
      card({ strategyBreakdown: [], winningStrategy: 'BuyerStandardStrategy', noOpportunityReason: null }),
    )
    await flushPromises()

    expect(tab.text()).not.toContain('No opportunity identified')
  })

  it('does not show the no-opportunity notice while there is simply no reason to give yet', async () => {
    const tab = mountTab(card({ strategyBreakdown: [], winningStrategy: null, noOpportunityReason: null }))
    await flushPromises()

    expect(tab.text()).not.toContain('No opportunity identified')
  })

  /**
   * Found by code review: watching `() => [props.card.strategyBreakdown, props.versionId]`
   * constructs a fresh array on every getter re-run, and a fresh array never `===` the previous
   * one - so the watcher fires whenever `props.card` is replaced with a NEW object at all, even
   * when strategyBreakdown/versionId's own values are unchanged, duplicating the
   * fetchVersionStatus call. Verified against a real Vue watch in isolation before fixing: the
   * multi-source array form (`watch([() => a, () => b], cb)`) does per-source comparison instead
   * and does not fire in this case.
   */
  it('does not re-poll the version status when the parent hands down a new card object with the same strategyBreakdown/versionId', async () => {
    fetchVersionStatus.mockResolvedValue({
      saleFileVersionId: 73,
      status: 'calculating',
      isError: false,
      statusDescription: null,
      currentStep: null,
      totalSteps: null,
      currentStepName: null,
      parsedAt: null,
      dateLastRecalculated: null,
    })
    const tab = mountTab(card({ strategyBreakdown: null }))
    await flushPromises()
    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)

    // A brand-new card object, same strategyBreakdown (null) and same versionId - simulates the
    // parent re-fetching and landing an equivalent result, not a genuine state change.
    await tab.setProps({ card: card({ strategyBreakdown: null }), versionId: 73 })
    await flushPromises()

    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)
  })
})
