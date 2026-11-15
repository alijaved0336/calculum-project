import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import type { NineBoxCellRow } from '@/api'

const fetchSaleFiles = vi.fn()
const fetchNineBoxTermsReduction = vi.fn()
vi.mock('@/api', () => ({
  fetchSaleFiles: (...args: unknown[]) => fetchSaleFiles(...args),
  fetchNineBoxTermsReduction: (...args: unknown[]) => fetchNineBoxTermsReduction(...args),
}))

// The box-filtered grid AND the Unranked section are both NineBoxRowsGrid instances now - this
// stub surfaces the props NineBoxOverview passes each one, so both can be asserted on here without
// mounting a real GraphqlGrid (which needs a DOM layout engine jsdom does not provide).
vi.mock('@/modules/opportunity/components/NineBoxRowsGrid.vue', () => ({
  default: {
    // Object-form props (with `unranked` typed Boolean), not the bare array form: NineBoxOverview
    // passes `unranked` as a bare attribute (`<NineBoxRowsGrid ... unranked />`), and only a typed
    // Boolean prop casts that to `true` - the array form would receive the literal (falsy) `''`.
    props: {
      versionUuid: String,
      level: String,
      selectedBoxes: { type: Array, default: () => [] },
      unranked: { type: Boolean, default: false },
    },
    template: `<div class="nine-box-rows-grid-stub" :class="{ 'nine-box-rows-grid-stub--unranked': unranked }" :data-version-uuid="versionUuid" :data-level="level" :data-selected="selectedBoxes.join(',')" />`,
  },
}))

// CustomTabs is stubbed the same way OpportunityHome.spec.ts stubs it - the real component needs
// more than this suite's plain jsdom mount provides, and a plain button-per-item template is all
// these tests need to drive a level change.
vi.mock('@ada/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ada/design-system')>()
  return {
    ...actual,
    CustomTabs: {
      props: ['items', 'modelValue'],
      emits: ['update:modelValue'],
      template: `
        <div class="level-tabs">
          <button v-for="item in items" :key="item.id" type="button" :class="'level-tab-' + item.id" @click="$emit('update:modelValue', item.id)">{{ item.label }}</button>
        </div>
      `,
    },
  }
})

import { HttpError, SessionExpiredError } from '@/api/http'
import NineBoxOverview from '@/modules/opportunity/views/NineBoxOverview.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      global: {
        low: 'Low',
        high: 'High',
        selection: 'Selection',
        total: 'Total',
        selectOneOrMore: 'Click on one or multiple boxes to view the corresponding details.',
      },
      arOpportunity: {
        list: {
          tabs: { saleLines: 'Sales Lines', buyers: 'Buyer Entities', parents: 'Buyer Ultimate Parents' },
        },
        nineBox: {
          loadError: 'The nine-box could not be loaded',
          noVersionTitle: 'No sale file yet',
          noVersionMessage: 'Upload and parse a sale file to see buyer prioritization.',
          probabilityAxis: 'Probability of Success',
          cashFlowImpactAxis: 'Cash Flow Impact',
          typeTermsReduction: 'Terms Reduction',
          title: '9 Boxes - {type}',
          unrankedTitle: 'Unranked buyers ({count})',
          unrankedMessage: 'Missing a probability or cash-flow-impact tier, so they cannot be placed on the grid.',
          serverError: 'The server answered with status {status}.',
          networkError: 'Could not reach the server. Try again.',
          summary: {
            buyers: 'Buyers',
            saleLines: 'Sales Lines',
            parents: 'Parents',
            volume: 'Sales Volume',
            cashFlowOpportunity: 'Cash Flow Opportunity',
            expectedCashFlow: 'Expected Cash Flow',
            contractualPaymentTerms: 'Contractual Payment Terms',
            avgDaysPaid: 'Avg. Days Paid',
            paymentTermsOpportunity: 'Payment Terms Opportunity',
            expectedPaymentTerms: 'Expected Payment Terms',
            economicProfitImpact: 'Expected Economic Profit',
          },
        },
      },
    },
  },
})

function mountView() {
  return mount(NineBoxOverview, { global: { plugins: [i18n] } })
}

// AB#20419: the tier text ("High prob. / High impact") no longer renders on the card, so tests
// that need one specific cell find it by its own fixed badge number instead - 1 is High/High
// (top-right), 9 is Low/Low (bottom-left), same fixed positions this file's own tests already
// relied on via the tier text.
function findCellByBadge(cells: DOMWrapper<Element>[], badge: number) {
  return cells.find((cell) => cell.find('.nine-box-card__badge').text() === String(badge))
}

function summaryRow(overrides: Partial<NineBoxCellRow> & { nineBox: number | null }): NineBoxCellRow {
  return {
    probabilityTier: 'High',
    cashFlowImpactTier: 'High',
    nineBoxCell: 'High/High',
    priority: 'High',
    buyerCount: 0,
    saleLineCount: 0,
    volume: null,
    totalValue: null,
    expectedTotalValue: null,
    economicProfitImpact: null,
    ...overrides,
  }
}

const ONE_FILE = [{ id: 1, uuid: 'f1', name: 'A', companyId: 1, versions: [{ id: 10, uuid: 'v10', version: 1 }] }]

describe('NineBoxOverview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchSaleFiles.mockReset()
    fetchNineBoxTermsReduction.mockReset()
    fetchNineBoxTermsReduction.mockResolvedValue([])
  })

  it('shows an empty state when there are no sale files yet, without fetching the nine-box summary', async () => {
    fetchSaleFiles.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('No sale file yet')
    expect(fetchNineBoxTermsReduction).not.toHaveBeenCalled()
  })

  it('resolves the newest version by id across every file, and renders its nine cells at the default (buyers) level', async () => {
    fetchSaleFiles.mockResolvedValue([
      { id: 1, uuid: 'f1', name: 'File A', companyId: 1, versions: [{ id: 21, uuid: 'v21', version: 1 }] },
      { id: 2, uuid: 'f2', name: 'File B', companyId: 1, versions: [{ id: 10, uuid: 'v10', version: 3 }, { id: 11, uuid: 'v11', version: 2 }] },
    ])

    const wrapper = mountView()
    await flushPromises()

    // id 21 (File A) is the newest, even though File B's own version counter (3) is higher -
    // `id` is what a cross-file comparison has to use, not `version`, a per-file counter. 'buyers'
    // is the default level, the same spelling both the endpoint and the grid use.
    expect(fetchNineBoxTermsReduction).toHaveBeenCalledWith('v21', 'buyers', 1)
    expect(wrapper.findAll('.nine-box-card')).toHaveLength(9)
  })

  it('shows AP\'s own "9 Boxes {type}" title, but hides the type select while it has only one option', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('9 Boxes - Terms Reduction')
    // A dropdown with a single, unchangeable option shouldn't render at all - the title above
    // already names the (only) type. See NineBoxOverview.vue's own header comment for why.
    expect(wrapper.find('.nine-box-type-select').exists()).toBe(false)
  })

  it('resolves the newest version by id, not by the per-file version counter (thread 129889)', async () => {
    fetchSaleFiles.mockResolvedValue([
      // File B: re-uploaded twice already, so its OWN counter reaches 3 - but its last touch
      // (id 7) happened before File A's only upload (id 8).
      {
        id: 1, uuid: 'f1', name: 'File B', companyId: 1,
        versions: [
          { id: 5, uuid: 'v5', version: 1 },
          { id: 6, uuid: 'v6', version: 2 },
          { id: 7, uuid: 'v7', version: 3 },
        ],
      },
      { id: 2, uuid: 'f2', name: 'File A', companyId: 1, versions: [{ id: 8, uuid: 'v8', version: 1 }] },
    ])

    const wrapper = mountView()
    await flushPromises()

    // id 8 (File A's only upload) is the truly most recent action, even though its own version
    // number (1) is lower than File B's (3) - comparing `version` across files would have picked
    // File B's id 7 instead.
    expect(fetchNineBoxTermsReduction).toHaveBeenCalledWith('v8', 'buyers', 1)
  })

  it("places the backend's own buyer count/values in the correct cell, badge showing the box's own fixed position number (not a count)", async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([
      summaryRow({
        nineBox: 1,
        probabilityTier: 'High',
        cashFlowImpactTier: 'High',
        buyerCount: 27,
        volume: 900000,
        totalValue: 548297.27,
        expectedTotalValue: 509916.46,
      }),
    ])

    const wrapper = mountView()
    await flushPromises()

    const cells = wrapper.findAll('.nine-box-card')
    // High/High is AP's own box 1 (top-right, the strongest cell) - the badge is that fixed
    // number, matching AP's real screen, not this cell's buyer count (27).
    const highHigh = findCellByBadge(cells, 1)
    expect(highHigh?.text()).toContain('27')
    expect(highHigh?.text()).toContain('Cash Flow Opportunity')
    expect(highHigh?.text()).toContain('Sales Volume')
    expect(highHigh?.text()).toContain('Buyers')
    // Cash Flow Opportunity / Sales Volume are money figures - the selected currency's symbol
    // (UC-UI-23), the Buyers count is not.
    expect(highHigh?.text()).toContain('$548.3k')
    expect(highHigh?.text()).toContain('$900k')
    // No "Expected" row on the card itself (UC-UI-04's expected figure lives only in the summary
    // table) - this is AP's own real screen layout, per the reference screenshot.
    expect(highHigh?.text()).not.toContain('Expected')
  })

  it('shows a dash for every card row (not a 0) for a cell the backend has no row for - the badge still shows the box number', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    const cells = wrapper.findAll('.nine-box-card')
    const highHigh = findCellByBadge(cells, 1)
    const rowValues = highHigh?.findAll('.nine-box-card__row-value').map((row) => row.text())
    expect(rowValues).toEqual(['-', '-', '-'])
  })

  it("empty boxes (0 buyers) render muted and not-clickable, and clicking one does not select it - AP's own `boxInfo.volume === 0` criterion, AR's analog is buyer count", async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([
      summaryRow({ nineBox: 1, probabilityTier: 'High', cashFlowImpactTier: 'High', buyerCount: 3 }),
      // Low/Low (box 9) has no summary row at all - buyerCount reads as 0, same as an explicit one.
    ])

    const wrapper = mountView()
    await flushPromises()

    const cells = wrapper.findAll('.nine-box-card')
    const lowLow = findCellByBadge(cells, 9)!
    expect(lowLow.classes()).toContain('nine-box-card--muted')
    expect(lowLow.classes()).toContain('nine-box-card--not-clickable')

    await lowLow.trigger('click')

    // Still just the auto-selected default (box 1) - the empty box's click never toggled anything.
    const gridStub = wrapper.find('.nine-box-rows-grid-stub:not(.nine-box-rows-grid-stub--unranked)')
    expect(gridStub.attributes('data-selected')).toBe('1')
  })

  // Unranked section temporarily disabled in NineBoxOverview.vue (per request) - re-enable this
  // test alongside it.
  it.skip('shows the Unranked count from the backend summary\'s own null-nineBox row, and passes it to a NineBoxRowsGrid in unranked mode', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([
      summaryRow({ nineBox: null, probabilityTier: null, cashFlowImpactTier: null, buyerCount: 85 }),
    ])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Unranked buyers (85)')
    const unrankedGrid = wrapper.find('.nine-box-rows-grid-stub--unranked')
    expect(unrankedGrid.exists()).toBe(true)
    expect(unrankedGrid.attributes('data-level')).toBe('buyers')
  })

  // Unranked section temporarily disabled in NineBoxOverview.vue (per request) - re-enable this
  // test alongside it.
  it.skip('does not render the Unranked section when the backend reports no unranked buyers', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Unranked buyers')
    expect(wrapper.find('.nine-box-rows-grid-stub--unranked').exists()).toBe(false)
  })

  it('auto-selects the first non-empty box on load, feeding it to the box-filtered grid below', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([
      summaryRow({ nineBox: 1, probabilityTier: 'High', cashFlowImpactTier: 'High', buyerCount: 3 }),
    ])

    const wrapper = mountView()
    await flushPromises()

    // High/High is position index 2 (top-right) - AP's box 1. Only the box-filtered grid (not the
    // Unranked one, absent here) carries a selection.
    const grids = wrapper.findAll('.nine-box-rows-grid-stub:not(.nine-box-rows-grid-stub--unranked)')
    expect(grids).toHaveLength(1)
    expect(grids[0].attributes('data-selected')).toBe('1')
  })

  it('AB#20854: picks the default by box number, not grid position - box 1 when it has buyers, else the next non-empty one, never the top-left box 7 first', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    const box7 = summaryRow({ nineBox: 7, probabilityTier: 'High', cashFlowImpactTier: 'Low', buyerCount: 161 })
    const box4 = summaryRow({ nineBox: 4, probabilityTier: 'High', cashFlowImpactTier: 'Medium', buyerCount: 13 })
    const box2 = summaryRow({ nineBox: 2, probabilityTier: 'Medium', cashFlowImpactTier: 'High', buyerCount: 5 })
    const box1 = summaryRow({ nineBox: 1, probabilityTier: 'High', cashFlowImpactTier: 'High', buyerCount: 1 })
    const selectedGrid = (wrapper: ReturnType<typeof mountView>) =>
      wrapper.find('.nine-box-rows-grid-stub:not(.nine-box-rows-grid-stub--unranked)').attributes('data-selected')

    fetchNineBoxTermsReduction.mockResolvedValue([box7, box4, box1, box2])
    const withBox1 = mountView()
    await flushPromises()
    expect(selectedGrid(withBox1)).toBe('1')

    fetchNineBoxTermsReduction.mockResolvedValue([box7, box4, box2])
    const withoutBox1 = mountView()
    await flushPromises()
    expect(selectedGrid(withoutBox1)).toBe('2')
  })

  it('multi-selects boxes: clicking a second cell adds it without deselecting the first, clicking a selected one again removes only that one', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)
    fetchNineBoxTermsReduction.mockResolvedValue([
      summaryRow({ nineBox: 1, probabilityTier: 'High', cashFlowImpactTier: 'High', buyerCount: 3 }),
      summaryRow({ nineBox: 9, probabilityTier: 'Low', cashFlowImpactTier: 'Low', buyerCount: 2 }),
    ])

    const wrapper = mountView()
    await flushPromises()
    // The default selection (High/High, box 1) already applies here - clicking Low/Low (box 9)
    // must ADD to it, not replace it.

    const cells = wrapper.findAll('.nine-box-card')
    const lowLow = findCellByBadge(cells, 9)!
    await lowLow.trigger('click')

    const gridStub = wrapper.find('.nine-box-rows-grid-stub:not(.nine-box-rows-grid-stub--unranked)')
    expect(gridStub.attributes('data-selected')).toBe('1,9')
    expect(lowLow.classes()).toContain('nine-box-card--selected')

    const highHigh = findCellByBadge(cells, 1)!
    await highHigh.trigger('click')

    expect(wrapper.find('.nine-box-rows-grid-stub:not(.nine-box-rows-grid-stub--unranked)').attributes('data-selected')).toBe('9')
    expect(highHigh.classes()).not.toContain('nine-box-card--selected')
  })

  it('switching the level tab re-fetches the nine-box summary at that level and passes it to both grids', async () => {
    fetchSaleFiles.mockResolvedValue(ONE_FILE)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('.level-tab-parents').trigger('click')
    await flushPromises()

    // The grid's own level id ('parents') is shared as-is; the endpoint's own 'sales'/'buyers'/
    // 'parents' spelling only differs from the grid's at the sale-lines level, not this one.
    expect(fetchNineBoxTermsReduction).toHaveBeenLastCalledWith('v10', 'parents', 1)
    expect(wrapper.find('.nine-box-rows-grid-stub:not(.nine-box-rows-grid-stub--unranked)').attributes('data-level')).toBe('parents')
  })

  it('shows a load failure rather than an empty grid', async () => {
    fetchSaleFiles.mockRejectedValue(new HttpError(500, '/x', ''))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('could not be loaded')
  })

  it('holds its loading state on a session expiry rather than flashing an error', async () => {
    fetchSaleFiles.mockRejectedValue(new SessionExpiredError('/api/sale-files'))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('could not be loaded')
  })
})
