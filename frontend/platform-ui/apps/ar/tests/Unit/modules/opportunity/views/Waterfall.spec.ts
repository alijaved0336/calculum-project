import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { useContextStore } from '@/stores/context'
import { useCustomAttributesStore } from '@/stores/customAttributes'
import { fetchFilterSummary, fetchOpportunityWaterfallChart } from '@/api'
import { fetchWaterfallSaleLineRows } from '@/modules/opportunity/data/waterfallSaleLineRows'
import { fetchOverviewRows } from '@/modules/opportunity/data/overviewRows'
import { HttpError, SessionExpiredError } from '@/api/http'

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchOpportunityWaterfallChart: vi.fn(),
  fetchFilterSummary: vi.fn(),
}))

vi.mock('@/modules/opportunity/data/waterfallSaleLineRows', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchWaterfallSaleLineRows: vi.fn(),
}))

vi.mock('@/modules/opportunity/data/overviewRows', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchOverviewRows: vi.fn(),
}))

vi.mock('@ada/design-system', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ContentBox: { template: '<div class="content-box"><slot name="header-title" /><slot name="header-controls" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  BodyText: { template: '<span><slot /></span>' },
  NoDataAvailable: { props: ['title', 'message'], template: '<div class="no-data">{{ title }}</div>' },
  // The design-system chart itself is that package's own concern - stubbed here to a button per
  // bar (Waterfall.vue's own `strategyChartData`, one per surviving backend bar plus the trailing
  // running-total point) so a click can be simulated without pulling in Kendo's real chart
  // rendering.
  WaterfallChart: {
    props: ['data'],
    emits: ['bar-click'],
    template: `
      <div class="waterfall-chart-stub">
        <button
          v-for="(item, i) in data"
          :key="i"
          type="button"
          :class="'bar-' + i"
          @click="$emit('bar-click', { category: item.category, index: i, isSummary: !!item.summary })"
        >{{ item.category }}</button>
      </div>
    `,
  },
}))

// Same minimal stub NineBoxRowsGrid.spec.ts uses for this same component, imported by its own
// direct file path (not the @ada/design-system barrel above) - rendering `items` is all these
// tests need; the real column set (`waterfallSaleLineColumns()`) is exercised for real, unmocked.
vi.mock('@ada/design-system/components/graphql-grid/Index.vue', () => ({
  default: {
    name: 'GraphqlGrid',
    props: ['items', 'total', 'take', 'skip', 'sort', 'sortable', 'loading', 'pageable', 'columnMenu', 'columns', 'dataItemKey', 'filter', 'columnSelectorDefaultColumns'],
    emits: ['datastatechange'],
    template: `
      <div class="grid-stub">
        <div v-for="(row, i) in items" :key="i" class="grid-row">{{ row.saleLineId }}</div>
        <button
          type="button"
          class="sort-step-term-btn"
          @click="$emit('datastatechange', { skip: 0, take: 25, sort: [{ field: 'stepTerm', dir: 'asc' }] })"
        >sort by stepTerm</button>
      </div>
    `,
  },
}))

import Waterfall from '@/modules/opportunity/views/Waterfall.vue'

const messages = {
  en: {
    arOpportunity: {
      waterfall: {
        title: 'Waterfall',
        subtitle: 'Select a strategy to show more details below',
        yAxisTitle: 'Cash flow opportunity',
        noVersion: 'Select a sale file version',
        noVersionHint: 'Pick a version from the navigation bar to see its waterfall.',
        loadError: 'The waterfall could not be loaded',
        serverError: 'The server answered with status {status}.',
        networkError: 'Could not reach the server. Try again.',
        unitToggle: {
          days: 'Potential Payment Term (days)',
          daysHint: 'Optimization of Payment Terms based on Strategy',
          cashFlow: 'Cash Flow Opportunity',
          cashFlowHint: 'Optimization of Cash Flow based on Strategy',
        },
        strategy: {
          chartTitle: 'Potential Cash Flow based on Strategies',
          chartTitleDays: 'Potential Payment Terms Optimization based on Strategies',
          xAxisTitle: 'Strategy',
          categories: {
            actual: 'Actual',
            payOnTerms: 'Pay on Terms',
            buyerStandard: 'Buyer Standard',
            peerGroupStandard: 'Peer Group Standard',
            creditLimitMax: 'Credit Limit Max',
            buyerPolicy: 'Buyer Policy',
            buyerParentMin: 'Buyer/Parent Min',
            industryRegion: 'Industry-Region',
            clientStandard: 'Client Standard',
            regulatoryTerms: 'Regulatory Terms',
            target: 'Target',
            total: 'Total',
          },
          columns: {
            previousTerm: 'Term Before This Step',
            stepTerm: 'Term After This Step',
            cashFlowContribution: 'Cash Flow Contribution',
          },
        },
      },
    },
  },
}

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(Waterfall, { global: { plugins: [i18n] } })
}

const versionUuid = '11111111-1111-4111-8111-111111111111'

const CHART_RESPONSE = {
  original: {},
  byCashFlow: [
    { period: 'payOnTerms', amount: 2_200_000 },
    { period: 'buyerStandard', amount: 132_200 },
    { period: 'peerGroupStandard', amount: 326_400 },
  ],
  byTerms: [
    { period: 'actual', amount: 45 },
    { period: 'buyerStandard', amount: -12 },
    { period: 'peerGroupStandard', amount: -18 },
  ],
}

describe('Waterfall', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchOpportunityWaterfallChart).mockReset().mockResolvedValue(CHART_RESPONSE as any)
    vi.mocked(fetchWaterfallSaleLineRows).mockReset().mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchOverviewRows).mockReset().mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchFilterSummary).mockReset().mockResolvedValue({
      sum: { volume: 10 }, weightedCeilingAverage: {}, weightedAverage: {}, countTrue: {}, totalCount: 2,
    })
  })

  type SummaryCall = { endpoint: { section: string; level: string }; filters: { waterfallStep?: string }; summary: { sum: string[] } }
  const lastSummary = () => (vi.mocked(fetchFilterSummary).mock.lastCall as unknown as [SummaryCall])[0]

  it('#21145: shows only the custom columns the version named, and re-applies when the schema reloads', async () => {
    useContextStore().setVersion(73, versionUuid)
    const customAttributes = useCustomAttributesStore()
    customAttributes.definitions = [{ ordinal: 2, title: 'Region', dataType: 'text', aggregation: 'list', hasData: true }]

    const view = mountView()
    await flushPromises()
    const grid = () => view.findComponent({ name: 'GraphqlGrid' })
    const shownCustom = (columns: { field: string; hidden?: boolean; title?: string }[]) =>
      columns.filter((column) => column.field.startsWith('customDataPoint') && !column.hidden)

    expect(shownCustom(grid().props('columns'))).toEqual([expect.objectContaining({ field: 'customDataPoint2', title: 'Region' })])
    expect(shownCustom(grid().props('columnSelectorDefaultColumns'))).toHaveLength(1)

    customAttributes.definitions = []
    await flushPromises()
    expect(shownCustom(grid().props('columns'))).toEqual([])

    view.unmount()
  })

  it('column parity: totals the drill-in through the Opportunity summary, narrowed to the selected step', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()

    expect(lastSummary().endpoint).toMatchObject({ section: 'opportunity', level: 'sales' })
    expect(lastSummary().filters.waterfallStep).toBe('total')
    expect(lastSummary().summary.sum).toEqual(expect.arrayContaining(['volume', 'cashFlowImpact', 'cashFlowContribution']))

    await view.find('.bar-1').trigger('click')
    await flushPromises()
    expect(lastSummary().filters.waterfallStep).toBe('buyerStandard')

    view.unmount()
  })

  it('column parity: the Avg. Days Paid (DSO) baseline totals every line, so it sends no step', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()
    await view.find('[role="radio"]').trigger('click')
    await flushPromises()
    await view.find('.bar-0').trigger('click')
    await flushPromises()

    expect(lastSummary().filters).not.toHaveProperty('waterfallStep')
    // AB#20905: Cash Flow - Contribution only totals with a step - asked without one, the summary
    // would 400 every other total too.
    expect(lastSummary().summary.sum).toContain('volume')
    expect(lastSummary().summary.sum).not.toContain('cashFlowContribution')

    view.unmount()
  })

  it('asks the analyst to pick a version rather than showing the strategy breakdown for none', async () => {
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Select a sale file version')
    expect(view.find('.waterfall-chart-stub').exists()).toBe(false)
    expect(fetchOpportunityWaterfallChart).not.toHaveBeenCalled()

    view.unmount()
  })

  it('renders one bar per surviving bar plus the trailing total bar, once a version is active', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()

    const bars = view.findAll('.waterfall-chart-stub button')
    // Default unit is cashFlow - see Waterfall.vue's own `strategyUnit` ref.
    expect(bars.map((bar) => bar.text())).toEqual([
      'Pay on Terms',
      'Buyer Standard',
      'Peer Group Standard',
      'Total',
    ])

    expect(fetchOpportunityWaterfallChart).toHaveBeenCalledWith(versionUuid, 1)

    view.unmount()
  })

  it('opens on the "total" drill-in by default - the screen never starts with nothing selected', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Total')
    expect(fetchWaterfallSaleLineRows).toHaveBeenCalledWith(
      expect.anything(),
      versionUuid,
      'total',
      expect.anything(),
      expect.anything(),
    )

    view.unmount()
  })

  it("AB#20611: shows the pager's item totals and page sizes under the drill-in grid, same as the List tab", async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()

    // GraphqlGrid hides its "X - Y of Z" block unless `info` is on - AB#20065 had dropped it.
    expect(view.findComponent({ name: 'GraphqlGrid' }).props('pageable')).toMatchObject({
      info: true,
      pageSizes: [10, 25, 50, 100, 150],
    })

    view.unmount()
  })

  it('switches the chart heading along with the value axis when the unit toggle changes', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()

    // cashFlow is the default unit.
    expect(view.text()).toContain('Potential Cash Flow based on Strategies')
    expect(view.text()).not.toContain('Potential Payment Terms Optimization based on Strategies')

    await view.find('[role="radio"]').trigger('click')
    await flushPromises()

    expect(view.text()).toContain('Potential Payment Terms Optimization based on Strategies')
    expect(view.text()).not.toContain('Potential Cash Flow based on Strategies')
    // byTerms opens with the "actual" baseline bar, byCashFlow does not.
    expect(view.findAll('.waterfall-chart-stub button').map((b) => b.text())).toEqual([
      'Actual',
      'Buyer Standard',
      'Peer Group Standard',
      'Total',
    ])

    view.unmount()
  })

  it('opens the full unfiltered sale-line list for the Avg. Days Paid (DSO) baseline bar', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchOverviewRows).mockResolvedValue({
      items: [{ saleLineId: 501, name: 'Acme' }],
      total: 1,
    } as any)

    const view = mountView()
    await flushPromises()
    // Switch to days so the Actual bar (index 0) is on screen.
    await view.find('[role="radio"]').trigger('click')
    await flushPromises()
    vi.mocked(fetchWaterfallSaleLineRows).mockClear()

    await view.find('.bar-0').trigger('click')
    await flushPromises()

    // The backend's waterfallSaleLineRows step enum has no baseline value - this bar drills in
    // through the same unfiltered saleLineOverviewRows query the List tab uses instead.
    expect(fetchWaterfallSaleLineRows).not.toHaveBeenCalled()
    expect(fetchOverviewRows).toHaveBeenCalledWith(
      expect.anything(), 'saleLines', versionUuid, expect.anything(), expect.anything(),
    )
    const [, , , fields] = vi.mocked(fetchOverviewRows).mock.calls[0]
    expect(fields).not.toContain('previousTerm')
    expect(fields).not.toContain('stepTerm')
    expect(fields).not.toContain('cashFlowContribution')
    expect(view.findAll('.grid-row').map((r) => r.text())).toEqual(['501'])

    view.unmount()
  })

  it('AB#20517: strips step-only fields from the sort sent for the baseline drill-in query', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchOverviewRows).mockResolvedValue({
      items: [{ saleLineId: 501, name: 'Acme' }],
      total: 1,
    } as any)

    const view = mountView()
    await flushPromises()
    await view.find('[role="radio"]').trigger('click')
    await flushPromises()
    await view.find('.bar-0').trigger('click')
    await flushPromises()
    vi.mocked(fetchOverviewRows).mockClear()

    // saleLineOverviewRows has no previousTerm/stepTerm/cashFlowContribution to sort by (same
    // reason those fields are dropped from the request above) - sorting the baseline drill-in by
    // one of them must not forward it, or the query fails the same way an unfiltered field list
    // would have.
    await view.find('.sort-step-term-btn').trigger('click')
    await flushPromises()

    const [, , , , options] = vi.mocked(fetchOverviewRows).mock.calls[0]
    expect((options as { order: unknown[] }).order).toEqual([])

    view.unmount()
  })

  it('re-selects the baseline bar after another bar was picked, re-fetching its unfiltered list', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchOverviewRows).mockResolvedValue({
      items: [{ saleLineId: 501, name: 'Acme' }],
      total: 1,
    } as any)

    const view = mountView()
    await flushPromises()
    await view.find('[role="radio"]').trigger('click')
    await flushPromises()

    await view.find('.bar-1').trigger('click')
    await flushPromises()
    vi.mocked(fetchOverviewRows).mockClear()

    await view.find('.bar-0').trigger('click')
    await flushPromises()

    expect(fetchOverviewRows).toHaveBeenCalledTimes(1)
    expect(view.findAll('.grid-row').map((r) => r.text())).toEqual(['501'])

    view.unmount()
  })

  it('opens the sale-line grid for a strategy bar, with the List tab\'s own columns', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchWaterfallSaleLineRows).mockResolvedValue({
      items: [{ saleLineId: 501, name: 'Acme' }],
      total: 1,
    } as any)

    const view = mountView()
    await flushPromises()

    // index 1 = Buyer Standard, per CHART_RESPONSE.byCashFlow.
    await view.find('.bar-1').trigger('click')
    await flushPromises()

    expect(view.text()).toContain('Buyer Standard')
    expect(view.findAll('.grid-row').map((r) => r.text())).toEqual(['501'])
    expect(fetchWaterfallSaleLineRows).toHaveBeenLastCalledWith(
      expect.anything(),
      versionUuid,
      'buyerStandard',
      expect.anything(),
      expect.anything(),
    )
    // AP's own grid area has no "Close" affordance - a new bar click just redraws it.
    expect(view.findAll('button').some((b) => b.text() === 'Close')).toBe(false)

    const columns = view.findComponent({ name: 'GraphqlGrid' }).props('columns') as Array<{ field?: string }>
    expect(columns.some((column) => column.field === 'cashFlowImpact')).toBe(true)
    expect(columns.some((column) => column.field === 'cashFlowContribution')).toBe(true)

    view.unmount()
  })

  it('selects the "total" drill-in when the trailing running-total bar is clicked', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()
    await view.find('.bar-1').trigger('click')
    await flushPromises()
    vi.mocked(fetchWaterfallSaleLineRows).mockClear()

    // Last bar is the trailing "total" point (isSummary: true, per the stub above).
    const bars = view.findAll('.waterfall-chart-stub button')
    await bars[bars.length - 1].trigger('click')
    await flushPromises()

    expect(fetchWaterfallSaleLineRows).toHaveBeenCalledWith(
      expect.anything(), versionUuid, 'total', expect.anything(), expect.anything(),
    )

    view.unmount()
  })

  it('resets the selection to "total" and refetches when the active version changes', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()
    await view.find('.bar-1').trigger('click')
    await flushPromises()
    expect(view.text()).toContain('Buyer Standard')

    const otherUuid = '22222222-2222-4222-8222-222222222222'
    vi.mocked(fetchOpportunityWaterfallChart).mockClear()
    useContextStore().setVersion(74, otherUuid)
    await flushPromises()

    expect(view.text()).toContain('Total')
    expect(fetchOpportunityWaterfallChart).toHaveBeenCalledWith(otherUuid, 1)

    view.unmount()
  })

  it('toggles the check-circle indicator between the two unit options on click', async () => {
    useContextStore().setVersion(73, versionUuid)

    const view = mountView()
    await flushPromises()

    const options = view.findAll('[role="radio"]')
    // cashFlow is the default unit - see Waterfall.vue's own `strategyUnit` ref.
    expect(options[1].attributes('aria-checked')).toBe('true')
    expect(options[0].attributes('aria-checked')).toBe('false')

    await options[0].trigger('click')

    expect(options[0].attributes('aria-checked')).toBe('true')
    expect(options[1].attributes('aria-checked')).toBe('false')

    view.unmount()
  })

  it('shows a load failure rather than a stale or fake-zero chart when the chart request fails', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchOpportunityWaterfallChart).mockRejectedValue(new HttpError(500, '/x', ''))

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('The waterfall could not be loaded')
    // Neither the stale/previous chart nor a lone zero-value "Total" bar (AB#column-parity with
    // NineBoxOverview.vue's own "load failure rather than an empty grid" convention).
    expect(view.find('.waterfall-chart-stub').exists()).toBe(false)

    view.unmount()
  })

  it('holds the empty chart state on a session expiry rather than flashing an error', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchOpportunityWaterfallChart).mockRejectedValue(new SessionExpiredError('/api/x'))

    const view = mountView()
    await flushPromises()

    expect(view.text()).not.toContain('could not be loaded')

    view.unmount()
  })

  it('does not keep the previous step\'s rows on screen when a drill-in page fails to load', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchWaterfallSaleLineRows).mockResolvedValue({
      items: [{ saleLineId: 501, name: 'Acme' }],
      total: 1,
    } as any)

    const view = mountView()
    await flushPromises()
    await view.find('.bar-1').trigger('click')
    await flushPromises()
    expect(view.findAll('.grid-row').map((r) => r.text())).toEqual(['501'])

    vi.mocked(fetchWaterfallSaleLineRows).mockRejectedValue(new HttpError(500, '/x', ''))
    await view.find('.bar-2').trigger('click')
    await flushPromises()

    // Buyer Standard's row must not still be showing under the newly-selected Peer Group
    // Standard label.
    expect(view.findAll('.grid-row')).toHaveLength(0)

    view.unmount()
  })

  it('retries a failed step when its bar is clicked again, rather than staying stuck empty', async () => {
    useContextStore().setVersion(73, versionUuid)
    vi.mocked(fetchWaterfallSaleLineRows).mockRejectedValue(new HttpError(500, '/x', ''))

    const view = mountView()
    await flushPromises()
    await view.find('.bar-1').trigger('click')
    await flushPromises()
    expect(view.findAll('.grid-row')).toHaveLength(0)

    vi.mocked(fetchWaterfallSaleLineRows).mockResolvedValue({
      items: [{ saleLineId: 501, name: 'Acme' }],
      total: 1,
    } as any)
    vi.mocked(fetchWaterfallSaleLineRows).mockClear()

    // Same bar again - selectStrategy()'s early-return must not swallow this, since the step's
    // last load failed.
    await view.find('.bar-1').trigger('click')
    await flushPromises()

    expect(fetchWaterfallSaleLineRows).toHaveBeenCalledTimes(1)
    expect(view.findAll('.grid-row').map((r) => r.text())).toEqual(['501'])

    view.unmount()
  })

  describe('AB#21102: drill-in column filters', () => {
    const BUYER_FILTER = {
      logic: 'and' as const,
      filters: [{ field: 'buyerName', operator: 'contains', value: 'HP' }],
    }

    async function applyFilter(view: ReturnType<typeof mountView>, filter: unknown, skip = 0) {
      view.findComponent({ name: 'GraphqlGrid' }).vm.$emit('datastatechange', {
        skip, take: 25, sort: [{ field: 'volume', dir: 'desc' }], filter,
      })
      await flushPromises()
    }

    type DrillInOptions = { where: unknown; customFilters: unknown[]; skip: number }
    const lastStepOptions = () =>
      (vi.mocked(fetchWaterfallSaleLineRows).mock.lastCall as unknown as [unknown, unknown, unknown, unknown, DrillInOptions])[4]

    it("sends the column filter as the step query's where, back on page 1, and totals by it", async () => {
      useContextStore().setVersion(73, versionUuid)
      const view = mountView()
      await flushPromises()
      vi.mocked(fetchFilterSummary).mockClear()

      await applyFilter(view, BUYER_FILTER, 50)

      expect(lastStepOptions()).toMatchObject({
        where: { and: [{ buyerName: { contains: 'HP' } }] },
        customFilters: [],
        skip: 0,
      })
      expect(view.findComponent({ name: 'GraphqlGrid' }).props('filter')).toEqual(BUYER_FILTER)
      expect(fetchFilterSummary).toHaveBeenCalledOnce()
      const filters = (vi.mocked(fetchFilterSummary).mock.lastCall as unknown as [{ filters: { telerikFilter: string } }])[0].filters
      expect(JSON.parse(filters.telerikFilter)).toEqual(BUYER_FILTER)

      view.unmount()
    })

    it('keeps the filter on the baseline drill-in too', async () => {
      useContextStore().setVersion(73, versionUuid)
      const view = mountView()
      await flushPromises()
      await applyFilter(view, BUYER_FILTER)
      await view.find('[role="radio"]').trigger('click')
      await flushPromises()
      await view.find('.bar-0').trigger('click')
      await flushPromises()

      const options = vi.mocked(fetchOverviewRows).mock.lastCall![4]
      expect(options).toMatchObject({ where: { and: [{ buyerName: { contains: 'HP' } }] } })

      view.unmount()
    })

    it('sends a custom attribute filter as customFilters, never in the where or the totals', async () => {
      useContextStore().setVersion(73, versionUuid)
      const view = mountView()
      await flushPromises()

      await applyFilter(view, {
        logic: 'and',
        filters: [{ field: 'customDataPoint1', operator: 'contains', value: 'x' }],
      })

      expect(lastStepOptions().where).toBeNull()
      expect(lastStepOptions().customFilters).toHaveLength(1)
      const filters = (vi.mocked(fetchFilterSummary).mock.lastCall as unknown as [{ filters: { telerikFilter: string } }])[0].filters
      expect(JSON.parse(filters.telerikFilter)).toEqual({ logic: 'and', filters: [] })

      view.unmount()
    })
  })
})
