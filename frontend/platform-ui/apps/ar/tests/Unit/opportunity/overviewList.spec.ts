import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

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

vi.mock('@ada/design-system', () => ({
  ContentBox: { template: '<div><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  CustomTabs: {
    name: 'CustomTabs',
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="tabs" :data-active="modelValue" :data-tabs="items.map((i) => i.label).join()" />',
  },
}))

// Export UI is covered by GridExportStatus.spec.ts and the *Export specs; here it is just not mounted.
vi.mock('@/components/GridExportStatus.vue', () => ({
  default: { name: 'GridExportStatus', template: '<span />' },
}))

vi.mock('@ada/design-system/components/graphql-grid/Index.vue', () => ({
  default: {
    name: 'GraphqlGrid',
    props: [
      'items', 'total', 'skip', 'take', 'sort', 'filter', 'loading', 'dataItemKey', 'columns',
      'columnSelectorDefaultColumns', 'totalsByColumns', 'loadingTotals', 'analyzeStore',
    ],
    emits: ['datastatechange', 'update:columns'],
    template: '<div class="grid" :data-total="total" :data-key="dataItemKey" />',
  },
}))

import OverviewList from '@/modules/opportunity/components/OverviewList.vue'
import { useContextStore } from '@/stores/context'
import { useCustomAttributesStore } from '@/stores/customAttributes'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      arOpportunity: {
        list: {
          tabs: { saleLines: 'Sales Lines', buyers: 'Buying Entities', parents: 'Ultimate Parents' },
          clearChartFilter: 'Clear chart filter',
        },
      },
    },
  },
})

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

function lastQuery() {
  const [, config, options] = fetchGraphqlGridPage.mock.lastCall! as unknown as [
    unknown,
    { queryField: string },
    { fields: string[]; where: Record<string, unknown> | null; skip: number },
  ]
  return { config, options }
}

function mountList(props: Record<string, unknown> = {}) {
  return mount(OverviewList, { props, global: { plugins: [i18n] } })
}

describe('OverviewList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchGraphqlGridPage.mockReset()
    fetchGraphqlGridPage.mockResolvedValue({ items: [], total: 0 })
    fetchFilterSummary.mockReset()
    fetchFilterSummary.mockResolvedValue({
      sum: {}, weightedCeilingAverage: {}, weightedAverage: {}, countTrue: {}, totalCount: 0,
    })
    useContextStore().setVersion(7, VERSION)
  })

  it('starts on the sale-line level and offers the three tabs', async () => {
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.find('.tabs').attributes('data-tabs')).toBe('Sales Lines,Buying Entities,Ultimate Parents')
    expect(wrapper.find('.tabs').attributes('data-active')).toBe('saleLines')

    expect(lastQuery().config.queryField).toBe('saleLineOverviewRows')
    // The Agreed pair renders as columns but never travels in the selection.
    expect(lastQuery().options.fields).not.toContain('paymentTermsAgreed')
    expect(wrapper.find('.grid').attributes('data-key')).toBe('saleLineId')
  })

  it('switches levels: each tab is its own collection query and row key', async () => {
    const wrapper = mountList()
    await flushPromises()

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises()
    expect(lastQuery().config.queryField).toBe('buyerOverviewRows')
    expect(wrapper.find('.grid').attributes('data-key')).toBe('partyId')

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'parents')
    await flushPromises()
    expect(lastQuery().config.queryField).toBe('parentOverviewRows')
  })

  it('discards a stale page that resolves after a newer tab switch already applied', async () => {
    // Regression for thread 129873: loadPage() had no staleness guard, so the slower of two
    // in-flight requests could land last and overwrite the newer tab's items/total/loading.
    let resolveFirst: (value: unknown) => void = () => {}
    fetchGraphqlGridPage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )

    const wrapper = mountList()
    await flushPromises() // sale-line request issued and still pending

    fetchGraphqlGridPage.mockResolvedValueOnce({ items: [{ partyId: 1 }], total: 1 })
    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises() // buyer request issued and resolves immediately

    expect(wrapper.find('.grid').attributes('data-total')).toBe('1')

    // The stale sale-line request resolves last.
    resolveFirst({ items: [{ saleLineId: 1 }, { saleLineId: 2 }], total: 2 })
    await flushPromises()

    // Still the buyer tab's total, not overwritten by the late sale-line response.
    expect(wrapper.find('.grid').attributes('data-total')).toBe('1')
  })

  it('does not leave loading stuck on true when the version is cleared mid-fetch', async () => {
    // Regression for thread 129902: the !versionUuid early return in loadPage() started calling
    // start() (to invalidate an in-flight request for the previous version) but never reset
    // `loading` itself, so a version cleared while a fetch is pending left the grid spinning
    // forever - the invalidated request's own finally is skipped once it's stale.
    let resolveFirst: (value: unknown) => void = () => {}
    fetchGraphqlGridPage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )

    const wrapper = mountList()
    await flushPromises() // request issued and still pending
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('loading')).toBe(true)

    useContextStore().clearFile()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('loading')).toBe(false)

    // The stale request resolving afterwards must not flip it back on either.
    resolveFirst({ items: [{ saleLineId: 1 }], total: 1 })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('loading')).toBe(false)
  })

  it('maps a chart click onto each level\'s own field for the dimension', async () => {
    const wrapper = mountList({
      chartSelection: { dimension: 'buyer', value: 'Pagero Inc', label: 'Buying Entity: Pagero Inc' },
    })
    await flushPromises()

    // The buyer dimension is buyerName at the line grain... ANDed with the line grain's own
    // permanent AB#20367 exclusion of negative-volume lines.
    expect(lastQuery().options.where).toEqual({
      and: [{ and: [{ buyerName: { eq: 'Pagero Inc' } }] }, { and: [{ volume: { gte: 0 } }] }],
    })

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises()
    // ...and the row's own name at the party grains.
    expect(lastQuery().options.where).toEqual({ and: [{ name: { eq: 'Pagero Inc' } }] })
  })

  it('narrows only the line level for a supplier-entity click', async () => {
    const wrapper = mountList({
      chartSelection: { dimension: 'supplier', value: 'Selling GmbH', label: 'Supplier Entity: Selling GmbH' },
    })
    await flushPromises()

    expect(lastQuery().options.where).toEqual({
      and: [{ and: [{ supplierName: { eq: 'Selling GmbH' } }] }, { and: [{ volume: { gte: 0 } }] }],
    })

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises()
    // A party row aggregates lines across selling entities: there is no column this could honestly
    // filter, so the level shows everything rather than a silently wrong subset.
    expect(lastQuery().options.where).toBeNull()
    // The chip still names the active selection the line level is honoring.
    expect(wrapper.find('.chart-filter-chip').text()).toContain('Supplier Entity: Selling GmbH')
  })

  it('resets to the first page when the chart selection changes', async () => {
    const wrapper = mountList()
    await flushPromises()

    // The analyst is on page 3 when the click lands.
    await wrapper.findComponent({ name: 'GraphqlGrid' }).vm.$emit('datastatechange', { skip: 50, take: 25, sort: [], filter: undefined })
    await flushPromises()
    expect(lastQuery().options.skip).toBe(50)

    await wrapper.setProps({
      chartSelection: { dimension: 'region', value: 'Europe', label: 'Region: Europe' },
    })
    await flushPromises()

    expect(lastQuery().options.skip).toBe(0)
    expect(lastQuery().options.where).toEqual({
      and: [{ and: [{ regionName: { eq: 'Europe' } }] }, { and: [{ volume: { gte: 0 } }] }],
    })
  })

  it('permanently excludes negative-volume lines from Sale Lines - grid and totals both, no chart selection needed', async () => {
    const wrapper = mountList()
    await flushPromises()

    expect(lastQuery().options.where).toEqual({ and: [{ volume: { gte: 0 } }] })
    expect(fetchFilterSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          telerikFilter: JSON.stringify({ logic: 'and', filters: [{ field: 'volume', operator: 'gte', value: 0 }] }),
        }),
      }),
    )

    // Buyers/Parents aggregate every line into one SUM - there is no per-line value this could
    // apply to, so neither grain carries it.
    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises()
    expect(lastQuery().options.where).toBeNull()
  })

  it('requests a level exactly once per tab switch, not twice', async () => {
    // Regression for thread 129657: onLevelChange used to also call loadPage() explicitly on top
    // of the watch(columns, ...) it triggers by restoring the level's own column snapshot.
    const wrapper = mountList()
    await flushPromises()
    fetchGraphqlGridPage.mockClear()

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises()

    expect(fetchGraphqlGridPage).toHaveBeenCalledTimes(1)
  })

  it('unfreezes Apollo rows so the grid can write onto them', async () => {
    // Apollo freezes its results; a frozen row silently swallows any later write Kendo's own
    // grid internals make onto it. toDisplayOverviewRow always hands back a fresh copy.
    fetchGraphqlGridPage.mockResolvedValue({ items: [Object.freeze({ saleLineId: 1 })], total: 1 })
    const wrapper = mountList()
    await flushPromises()

    const gridItems = wrapper.findComponent({ name: 'GraphqlGrid' }).props('items') as Record<string, unknown>[]
    expect(gridItems).toHaveLength(1)
    expect(Object.isFrozen(gridItems[0])).toBe(false)
  })

  it('applies live custom-attribute definitions onto the column-selector Reset snapshot', async () => {
    // Regression for threads 129658/129676: without this, the column selector's Reset button
    // blanked the tenant-provided custom-attribute titles back to the generic customDataPointN
    // placeholders. Custom attributes are flat columns here (not a grouped header - grouping
    // them would silently strip this grid's footer totals, see overviewColumns.ts), so no group
    // wrapper to unwrap first.
    const wrapper = mountList()
    await flushPromises()

    useCustomAttributesStore().definitions = [
      { ordinal: 1, title: 'Region Code', dataType: 'text', aggregation: 'list', hasData: true },
    ]
    await flushPromises()

    const defaultColumns = wrapper.findComponent({ name: 'GraphqlGrid' }).props('columnSelectorDefaultColumns') as {
      field: string; title: string
    }[]
    const customColumn = defaultColumns.find((column) => column.field === 'customDataPoint1')

    expect(customColumn?.title).toBe('Region Code')
  })

  it('resets take/sort/filter alongside skip on a version change, not just skip', async () => {
    // Regression for thread 129679: leaving take/sort/filter at the PREVIOUS version's values
    // requested the new version with stale settings while the rebuilt LevelState recorded fresh
    // (mismatched) ones.
    const wrapper = mountList()
    await flushPromises()

    await wrapper.findComponent({ name: 'GraphqlGrid' }).vm.$emit('datastatechange', {
      skip: 50,
      take: 100,
      sort: [{ field: 'buyerName', dir: 'asc' }],
      filter: { logic: 'and', filters: [{ field: 'buyerName', operator: 'eq', value: 'Acme' }] },
    })
    await flushPromises()
    expect(lastQuery().options.skip).toBe(50)

    useContextStore().setVersion(8, '2764d345-a429-5818-b7d4-44f5c5382237')
    await flushPromises()

    expect(lastQuery().options.skip).toBe(0)
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('take')).toBe(25)
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('sort')).toEqual([{ field: 'volume', dir: 'desc' }])
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('filter')).toBeUndefined()
  })

  it('fetches footer totals per level and remaps the response onto the dotted-key shape', async () => {
    fetchFilterSummary.mockResolvedValue({
      sum: { volume: 100 },
      weightedCeilingAverage: { actualPaymentTerms: 30 },
      weightedAverage: {},
      countTrue: {},
      totalCount: 5,
    })

    const wrapper = mountList()
    await flushPromises()

    expect(fetchFilterSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: expect.objectContaining({ level: 'sales' }),
      }),
    )
    expect(wrapper.findComponent({ name: 'GraphqlGrid' }).props('totalsByColumns')).toEqual({
      sum: { volume: 100 },
      'avg.weighted.ceil': { actualPaymentTerms: 30 },
      'avg.weighted': {},
      'count.true': {},
      totalCount: 5,
    })

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises()
    expect(fetchFilterSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        endpoint: expect.objectContaining({ level: 'buyers' }),
      }),
    )

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'parents')
    await flushPromises()
    expect(fetchFilterSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        endpoint: expect.objectContaining({ level: 'parents' }),
      }),
    )
  })

  it('shows the selection as a chip whose removal asks the screen to clear it', async () => {
    const wrapper = mountList({
      chartSelection: { dimension: 'region', value: 'Europe', label: 'Region: Europe' },
    })
    await flushPromises()

    expect(wrapper.find('.chart-filter-chip').text()).toContain('Region: Europe')

    await wrapper.find('.chart-filter-chip__remove').trigger('click')
    expect(wrapper.emitted('clear-chart-selection')).toHaveLength(1)
  })
})
