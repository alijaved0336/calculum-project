import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const fetchGraphqlGridPage = vi.fn()
const fetchFilterSummary = vi.fn()

vi.mock('@/utils/graphqlGridQuery', () => ({
  fetchGraphqlGridPage: (...args: unknown[]) => fetchGraphqlGridPage(...args),
}))

vi.mock('@/services/graphql/apolloClient', () => ({
  apolloClient: {},
}))

vi.mock('@/api', () => ({
  fetchFilterSummary: (...args: unknown[]) => fetchFilterSummary(...args),
}))

// Export UI is covered by GridExportStatus.spec.ts and the *Export specs; here it is just not mounted.
vi.mock('@/components/GridExportStatus.vue', () => ({
  default: { name: 'GridExportStatus', template: '<span />' },
}))

vi.mock('@ada/design-system/components/graphql-grid/Index.vue', () => ({
  default: {
    name: 'GraphqlGrid',
    props: [
      'items', 'total', 'skip', 'take', 'sort', 'loading', 'pageable', 'dataItemKey', 'columns',
      'columnSelectorDefaultColumns', 'totalsByColumns', 'loadingTotals', 'analyzeStore', 'filter',
    ],
    template: '<div class="grid" :data-total="total" :data-key="dataItemKey" />',
  },
}))

import NineBoxRowsGrid from '@/modules/opportunity/components/NineBoxRowsGrid.vue'
import { useGridColumnPreferencesStore } from '@/stores/gridColumnPreferences'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

function lastQuery() {
  const [, config, options] = fetchGraphqlGridPage.mock.lastCall! as unknown as [
    unknown,
    { queryField: string },
    {
      where: Record<string, unknown> | null
      skip: number
      fieldArguments: { name: string; value: unknown }[]
    },
  ]
  return { config, options }
}

function lastSummaryRequest() {
  const [request] = fetchFilterSummary.mock.lastCall! as unknown as [
    { endpoint: { level: string }; filters: { telerikFilter: string } },
  ]
  return { endpoint: request.endpoint, telerikFilter: JSON.parse(request.filters.telerikFilter) }
}

function mountGrid(props: Record<string, unknown> = {}) {
  return mount(NineBoxRowsGrid, {
    props: { versionUuid: VERSION, level: 'buyers', selectedBoxes: [1], ...props },
    global: { plugins: [createI18n({ legacy: false, locale: 'en', messages: { en: {} } })] },
  })
}

describe('NineBoxRowsGrid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchGraphqlGridPage.mockReset()
    fetchGraphqlGridPage.mockResolvedValue({ items: [], total: 0 })
    fetchFilterSummary.mockReset()
    fetchFilterSummary.mockResolvedValue({
      sum: {}, weightedCeilingAverage: {}, weightedAverage: {}, countTrue: {}, totalCount: 0,
    })
  })

  it('AB#20411: with nothing selected, fetches every row at the level instead of showing none', async () => {
    // Used to skip the fetch entirely and force an empty grid - AP's own screen shows every row at
    // the level until the user actually narrows it down by clicking a box.
    fetchGraphqlGridPage.mockResolvedValue({ items: [{ partyId: 1 }, { partyId: 2 }], total: 2 })
    const wrapper = mountGrid({ selectedBoxes: [] })
    await flushPromises()

    expect(wrapper.find('.grid').attributes('data-total')).toBe('2')
    expect(lastQuery().options.where).toBeNull()
    expect(fetchFilterSummary).toHaveBeenCalledOnce()
    expect(lastSummaryRequest().telerikFilter).toEqual({ logic: 'and', filters: [] })
  })

  it("AB#20611: shows the pager's item totals and page sizes, same as the List tab", async () => {
    const wrapper = mountGrid()
    await flushPromises()

    // GraphqlGrid hides its "X - Y of Z" block unless `info` is on.
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('pageable')).toMatchObject({
      info: true,
      pageSizes: [10, 25, 50, 100, 150],
    })
  })

  it('queries the level\'s own collection field, filtered to the selected box numbers', async () => {
    const wrapper = mountGrid({ level: 'buyers', selectedBoxes: [1, 4, 7] })
    await flushPromises()

    expect(lastQuery().config.queryField).toBe('buyerOverviewRows')
    expect(lastQuery().options.where).toEqual({ nineBox: { in: [1, 4, 7] } })
    expect(wrapper.find('.grid').attributes('data-key')).toBe('partyId')
  })

  it('re-queries the sale-line level under its own collection field and row key', async () => {
    mountGrid({ level: 'saleLines', selectedBoxes: [2] })
    await flushPromises()

    expect(lastQuery().config.queryField).toBe('saleLineOverviewRows')
    expect(lastQuery().options.where).toEqual({ nineBox: { in: [2] } })
  })

  it('re-queries and resets to page 1 when the selection changes', async () => {
    const wrapper = mountGrid({ selectedBoxes: [1] })
    await flushPromises()
    fetchGraphqlGridPage.mockClear()

    await wrapper.setProps({ selectedBoxes: [1, 2] })
    await flushPromises()

    expect(fetchGraphqlGridPage).toHaveBeenCalledTimes(1)
    expect(lastQuery().options.where).toEqual({ nineBox: { in: [1, 2] } })
    expect(lastQuery().options.skip).toBe(0)
  })

  it("restores its own column customisation per level, not the List tab's (own column list since column parity)", async () => {
    const preferences = useGridColumnPreferencesStore()
    // The List tab's snapshot no longer applies here...
    preferences.setColumns('opportunity-overview-v2-buyers', [{ field: 'salesTeam', title: 'Sales Team', hidden: true }])
    // ...this grid's own does.
    preferences.setColumns('opportunity-nine-box-v2-buyers', [
      { field: 'volume', title: 'Volume', hidden: true },
    ])

    const wrapper = mountGrid({ level: 'buyers' })
    await flushPromises()

    const columns = wrapper.findComponent({ name: 'GraphqlGrid' }).props('columns') as { field: string; hidden?: boolean }[]
    const volumeColumn = columns.find((column) => column.field === 'volume')
    expect(volumeColumn?.hidden).toBe(true)
    expect(columns.find((column) => column.field === 'salesTeam')?.hidden).toBe(false)
    // Every other factory column is untouched by that one cached override.
    expect(columns.length).toBeGreaterThan(1)
  })

  it('fetches footer totals as an OR of eq leaves per box - the backend has no "in" operator here', async () => {
    const wrapper = mountGrid({ level: 'buyers', selectedBoxes: [1, 4, 7] })
    await flushPromises()

    const { endpoint, telerikFilter } = lastSummaryRequest()
    expect(endpoint.level).toBe('buyers')
    expect(telerikFilter).toEqual({
      logic: 'or',
      filters: [
        { field: 'nineBox', operator: 'eq', value: 1 },
        { field: 'nineBox', operator: 'eq', value: 4 },
        { field: 'nineBox', operator: 'eq', value: 7 },
      ],
    })
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('totalsByColumns')).toEqual({
      sum: {}, 'avg.weighted.ceil': {}, 'avg.weighted': {}, 'count.true': {}, totalCount: 0,
    })
  })

  it("queries totals under the sale-line level's own summary route segment ('sales', not 'saleLines')", async () => {
    mountGrid({ level: 'saleLines', selectedBoxes: [2] })
    await flushPromises()

    expect(lastSummaryRequest().endpoint.level).toBe('sales')
  })

  it('re-fetches totals, once, when the selection changes', async () => {
    const wrapper = mountGrid({ selectedBoxes: [1] })
    await flushPromises()
    fetchFilterSummary.mockClear()

    await wrapper.setProps({ selectedBoxes: [1, 2] })
    await flushPromises()

    expect(fetchFilterSummary).toHaveBeenCalledTimes(1)
    expect(lastSummaryRequest().telerikFilter).toEqual({
      logic: 'or',
      filters: [
        { field: 'nineBox', operator: 'eq', value: 1 },
        { field: 'nineBox', operator: 'eq', value: 2 },
      ],
    })
  })

  it('re-fetches totals exactly once (not twice) on a level switch, despite that also replacing columns', async () => {
    const wrapper = mountGrid({ level: 'buyers' })
    await flushPromises()
    fetchFilterSummary.mockClear()

    await wrapper.setProps({ level: 'parents' })
    await flushPromises()

    expect(fetchFilterSummary).toHaveBeenCalledTimes(1)
    expect(lastSummaryRequest().endpoint.level).toBe('parents')
  })

  it('in unranked mode, queries nineBox: { eq: null } even with no boxes selected', async () => {
    mountGrid({ unranked: true, selectedBoxes: [] })
    await flushPromises()

    expect(lastQuery().options.where).toEqual({ nineBox: { eq: null } })
  })

  it('unranked mode ignores selectedBoxes entirely', async () => {
    mountGrid({ unranked: true, selectedBoxes: [1, 2, 3] })
    await flushPromises()

    expect(lastQuery().options.where).toEqual({ nineBox: { eq: null } })
  })

  it("unranked mode's footer totals use an isnull telerikFilter, ignoring selectedBoxes just like the rows query does", async () => {
    mountGrid({ unranked: true, selectedBoxes: [1, 2, 3] })
    await flushPromises()

    expect(lastSummaryRequest().telerikFilter).toEqual({
      logic: 'and',
      filters: [{ field: 'nineBox', operator: 'isnull' }],
    })
  })

  it('re-queries under the new level when the level changes', async () => {
    const wrapper = mountGrid({ level: 'buyers' })
    await flushPromises()

    await wrapper.setProps({ level: 'parents' })
    await flushPromises()

    expect(lastQuery().config.queryField).toBe('parentOverviewRows')
  })

  it('discards a stale page that resolves after a newer selection change already applied', async () => {
    // Same regression shape overviewList.spec.ts guards on its own tab switch: loadPage() must
    // not let a slower response overwrite what a newer selection change already loaded.
    let resolveFirst: (value: unknown) => void = () => {}
    fetchGraphqlGridPage.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    fetchGraphqlGridPage.mockResolvedValueOnce({ items: [], total: 2 })

    const wrapper = mountGrid({ selectedBoxes: [1] })
    await flushPromises()

    // The newer (selectedBoxes: [2]) request resolves first.
    await wrapper.setProps({ selectedBoxes: [2] })
    await flushPromises()
    expect(wrapper.find('.grid').attributes('data-total')).toBe('2')

    // The first, slower request finally resolves - it must not overwrite the newer result.
    resolveFirst({ items: [{ partyId: 1, name: 'First' }], total: 999 })
    await flushPromises()

    expect(wrapper.find('.grid').attributes('data-total')).toBe('2')
  })

  it('discards a stale page that resolves after the selection was cleared to empty', async () => {
    // AB#20411: selectedBoxes going to [] is a real fetch now (every row, where: null), not an
    // early return - same race as the test above, discarded the same way, by the newer request's
    // own isStale() check.
    let resolveFirst: (value: unknown) => void = () => {}
    fetchGraphqlGridPage.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))

    const wrapper = mountGrid({ selectedBoxes: [1] })
    await flushPromises()

    // Deselect down to nothing while that first request is still in flight.
    await wrapper.setProps({ selectedBoxes: [] })
    await flushPromises()
    expect(wrapper.find('.grid').attributes('data-total')).toBe('0')

    // The first, slower request finally resolves - it must not overwrite the reset.
    resolveFirst({ items: [{ partyId: 1, name: 'First' }], total: 999 })
    await flushPromises()

    expect(wrapper.find('.grid').attributes('data-total')).toBe('0')
  })

  describe('AB#21102: column filters', () => {
    const NAME_FILTER = {
      logic: 'and' as const,
      filters: [{ field: 'name', operator: 'contains', value: 'HP' }],
    }

    async function applyFilter(wrapper: ReturnType<typeof mountGrid>, filter: unknown, skip = 0) {
      wrapper.findComponent({ name: 'GraphqlGrid' }).vm.$emit('datastatechange', {
        skip, take: 25, sort: [{ field: 'volume', dir: 'desc' }], filter,
      })
      await flushPromises()
    }

    it('ANDs the column filter with the selected boxes in the where', async () => {
      const wrapper = mountGrid({ selectedBoxes: [2, 5, 3] })
      await flushPromises()

      await applyFilter(wrapper, NAME_FILTER)

      expect(lastQuery().options.where).toEqual({
        and: [
          { nineBox: { in: [2, 5, 3] } },
          { and: [{ name: { contains: 'HP' } }] },
        ],
      })
      expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('filter')).toEqual(NAME_FILTER)
    })

    it('sends the column filter alone with nothing selected, and with the Unranked narrowing', async () => {
      const all = mountGrid({ selectedBoxes: [] })
      await flushPromises()
      await applyFilter(all, NAME_FILTER)
      expect(lastQuery().options.where).toEqual({ and: [{ name: { contains: 'HP' } }] })

      const unranked = mountGrid({ unranked: true })
      await flushPromises()
      await applyFilter(unranked, NAME_FILTER)
      expect(lastQuery().options.where).toEqual({
        and: [{ nineBox: { eq: null } }, { and: [{ name: { contains: 'HP' } }] }],
      })
    })

    it('narrows the footer totals by the same filter, and goes back to page 1', async () => {
      const wrapper = mountGrid({ selectedBoxes: [1] })
      await flushPromises()
      fetchFilterSummary.mockClear()

      await applyFilter(wrapper, NAME_FILTER, 50)

      expect(lastQuery().options.skip).toBe(0)
      expect(fetchFilterSummary).toHaveBeenCalledOnce()
      expect(lastSummaryRequest().telerikFilter).toEqual({
        logic: 'and',
        filters: [
          { logic: 'or', filters: [{ field: 'nineBox', operator: 'eq', value: 1 }] },
          NAME_FILTER,
        ],
      })
    })

    it('keeps paging without re-fetching totals while the filter is unchanged', async () => {
      const wrapper = mountGrid()
      await flushPromises()
      await applyFilter(wrapper, NAME_FILTER)
      fetchFilterSummary.mockClear()

      await applyFilter(wrapper, NAME_FILTER, 25)

      expect(lastQuery().options.skip).toBe(25)
      expect(fetchFilterSummary).not.toHaveBeenCalled()
    })

    it('sends a custom attribute filter as customFilters, never in the where', async () => {
      const wrapper = mountGrid({ selectedBoxes: [1] })
      await flushPromises()

      await applyFilter(wrapper, {
        logic: 'and',
        filters: [{ field: 'customDataPoint1', operator: 'contains', value: 'x' }],
      })

      expect(lastQuery().options.where).toEqual({ nineBox: { in: [1] } })
      expect(lastQuery().options.fieldArguments.map((argument) => argument.name)).toEqual(['customFilters'])
      expect(lastSummaryRequest().telerikFilter).toEqual({
        logic: 'or', filters: [{ field: 'nineBox', operator: 'eq', value: 1 }],
      })
    })

    it('drops the filter on a level switch - the next level has its own fields', async () => {
      const wrapper = mountGrid({ level: 'buyers', selectedBoxes: [1] })
      await flushPromises()
      await applyFilter(wrapper, NAME_FILTER)

      await wrapper.setProps({ level: 'saleLines' })
      await flushPromises()

      expect(lastQuery().options.where).toEqual({ nineBox: { in: [1] } })
      expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('filter')).toBeUndefined()
    })
  })
})
