import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const fetchGraphqlGridPage = vi.fn()
const fetchFilterSummary = vi.fn()

vi.mock('@/utils/graphqlGridQuery', () => ({
  fetchGraphqlGridPage: (...args: unknown[]) => fetchGraphqlGridPage(...args),
}))
vi.mock('@/services/graphql/apolloClient', () => ({ apolloClient: {} }))
vi.mock('@/api', () => ({
  fetchFilterSummary: (...args: unknown[]) => fetchFilterSummary(...args),
}))
vi.mock('@ada/design-system/components/graphql-grid/Index.vue', () => ({
  default: {
    name: 'GraphqlGrid',
    props: [
      'items', 'total', 'skip', 'take', 'sort', 'loading', 'dataItemKey', 'columns',
      'columnSelectorDefaultColumns', 'totalsByColumns', 'loadingTotals', 'analyzeStore',
    ],
    template: '<div class="grid" />',
  },
}))

import OpportunityListBuyers from '@/modules/buyers/components/customerCard/OpportunityListBuyers.vue'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

type SummaryRequest = {
  endpoint: { level: string }
  filters: { telerikFilter: string; targetSaleFileVersionUuid: string }
  summary: { sum: string[]; weightedCeilingAverage: string[]; weightedAverage: string[] }
}
const lastSummaryRequest = () => (fetchFilterSummary.mock.lastCall! as unknown as [SummaryRequest])[0]

describe('OpportunityListBuyers footer totals (column parity)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchGraphqlGridPage.mockReset()
    fetchGraphqlGridPage.mockResolvedValue({ items: [], total: 0 })
    fetchFilterSummary.mockReset()
    fetchFilterSummary.mockResolvedValue({
      sum: { volume: 1200 }, weightedCeilingAverage: { actualPaymentTerms: 45 }, weightedAverage: {}, countTrue: {}, totalCount: 3,
    })
  })

  it("totals a buyer's own lines, with the same buyerId narrowing as its rows", async () => {
    const wrapper = mount(OpportunityListBuyers, { props: { versionUuid: VERSION, buyerId: '42', role: 'Counterparty' } })
    await flushPromises()

    const request = lastSummaryRequest()
    expect(request.endpoint.level).toBe('sales')
    expect(request.filters.targetSaleFileVersionUuid).toBe(VERSION)
    expect(JSON.parse(request.filters.telerikFilter)).toEqual({
      logic: 'and', filters: [{ field: 'buyerId', operator: 'eq', value: 42 }],
    })
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('totalsByColumns')).toMatchObject({
      sum: { volume: 1200 }, 'avg.weighted.ceil': { actualPaymentTerms: 45 }, totalCount: 3,
    })
  })

  it("totals a parent's whole family by parentId", async () => {
    mount(OpportunityListBuyers, { props: { versionUuid: VERSION, buyerId: '7', role: 'Parent' } })
    await flushPromises()

    expect(JSON.parse(lastSummaryRequest().filters.telerikFilter).filters[0]).toEqual({ field: 'parentId', operator: 'eq', value: 7 })
  })

  it('asks only for the parity document\'s totals among the visible columns', async () => {
    mount(OpportunityListBuyers, { props: { versionUuid: VERSION, buyerId: '42', role: 'Counterparty' } })
    await flushPromises()

    const { summary } = lastSummaryRequest()
    expect([...summary.sum].sort()).toEqual(['cashFlowImpact', 'volume'])
    expect([...summary.weightedCeilingAverage].sort()).toEqual([
      'actualPaymentTerms', 'contractualPaymentTermsWithoutCashDiscounts', 'recommendedTerm',
    ])
    expect(summary.weightedAverage).toEqual([])
  })

  it('does not ask for totals without a version or with a malformed buyer id', async () => {
    mount(OpportunityListBuyers, { props: { versionUuid: null, buyerId: '42', role: 'Counterparty' } })
    mount(OpportunityListBuyers, { props: { versionUuid: VERSION, buyerId: 'not-a-number', role: 'Counterparty' } })
    await flushPromises()

    expect(fetchFilterSummary).not.toHaveBeenCalled()
  })
})
