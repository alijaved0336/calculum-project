import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const fetchGraphqlGridPage = vi.fn()
const fetchFilterSummary = vi.fn()

vi.mock('@/utils/graphqlGridQuery', () => ({
  fetchGraphqlGridPage: (...args: unknown[]) => fetchGraphqlGridPage(...args),
}))
vi.mock('@/services/graphql/apolloClient', () => ({ apolloClient: { clearStore: vi.fn() } }))
vi.mock('@/api', () => ({
  fetchFilterSummary: (...args: unknown[]) => fetchFilterSummary(...args),
}))
vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }))
vi.mock('@ada/design-system/components/graphql-grid/Index.vue', () => ({
  default: {
    name: 'GraphqlGrid',
    props: [
      'items', 'total', 'skip', 'take', 'sort', 'filter', 'loading', 'pageable', 'height', 'columns',
      'columnSelectorDefaultColumns', 'totalsByColumns', 'loadingTotals', 'analyzeStore',
    ],
    emits: ['datastatechange'],
    template: '<div class="grid" />',
  },
}))

import ListMatch from '@/modules/match/components/ListMatch.vue'
import { useContextStore } from '@/stores/context'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

type SummaryCall = {
  endpoint: { section: string; level: string; operation: string }
  filters: { targetSaleFileVersionUuid: string; fullDisabled: boolean; telerikFilter: string }
  summary: { sum: string[]; 'avg.weighted.ceil': string[] }
}
const lastSummary = () => (fetchFilterSummary.mock.lastCall as unknown as [SummaryCall])[0]

function mountList(props: Record<string, unknown> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false })
  return mount(ListMatch, { props, global: { plugins: [i18n] } })
}

describe('ListMatch footer totals (column parity, like AP)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchGraphqlGridPage.mockReset().mockResolvedValue({ items: [], total: 0 })
    fetchFilterSummary.mockReset().mockResolvedValue({
      sum: { volume: 900 }, 'avg.weighted.ceil': { actualPaymentTerms: 41 }, 'count.true': {}, totalCount: 7,
    })
  })

  it("asks the Match summary for Sales Volume and the three payment terms, and hands the answer to the grid's footer", async () => {
    useContextStore().setVersion(73, VERSION)
    const wrapper = mountList()
    await flushPromises()

    const call = lastSummary()
    expect(call.endpoint).toMatchObject({ section: 'match', level: 'sales', operation: 'summary' })
    expect(call.filters.targetSaleFileVersionUuid).toBe(VERSION)
    expect(call.summary.sum).toEqual(['volume'])
    expect([...call.summary['avg.weighted.ceil']].sort()).toEqual([
      'actualPaymentTerms', 'contractualPaymentTermsWithoutCashDiscounts',
    ])
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('totalsByColumns')).toMatchObject({
      sum: { volume: 900 }, totalCount: 7,
    })
  })

  it('totals every row the grid lists, excluded lines included (fullDisabled)', async () => {
    useContextStore().setVersion(73, VERSION)
    mountList()
    await flushPromises()

    expect(lastSummary().filters.fullDisabled).toBe(true)
  })

  it('narrows the totals with the chart drill-down, like the rows', async () => {
    useContextStore().setVersion(73, VERSION)
    const chartFilter = { logic: 'and', filters: [{ field: 'isMatched', operator: 'eq', value: true }] }
    mountList({ chartFilter })
    await flushPromises()

    expect(JSON.parse(lastSummary().filters.telerikFilter)).toEqual(chartFilter)
  })

  it('shows no totals when the summary fails, rather than rejecting unhandled', async () => {
    fetchFilterSummary.mockReset().mockRejectedValue(new Error('summary failed'))
    useContextStore().setVersion(73, VERSION)
    const wrapper = mountList()
    await flushPromises()

    const grid = wrapper.findComponent({ name: 'GraphqlGrid' })
    expect(grid.props('totalsByColumns')).toBeUndefined()
    expect(grid.props('loadingTotals')).toBe(false)
  })

  it('asks for no totals without a version', async () => {
    mountList()
    await flushPromises()

    expect(fetchFilterSummary).not.toHaveBeenCalled()
  })
})
