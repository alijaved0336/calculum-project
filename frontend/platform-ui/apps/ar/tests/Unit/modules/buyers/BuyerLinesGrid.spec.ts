import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchBuyerLines = vi.fn()
vi.mock('@/api', () => ({
  fetchBuyerLines: (...args: unknown[]) => fetchBuyerLines(...args),
}))

const openSaleLineDetail = vi.fn()
vi.mock('@/modules/match/MatchRouting', () => ({
  openSaleLineDetail: (...args: unknown[]) => openSaleLineDetail(...args),
}))

// Same stub shape as VersionErrorsView.spec.ts's own (a `slot`, keyed by the column's `cell`
// name, renders custom cell templates the way the real Grid would) - extended with a pager
// button so `onPageChange` gets exercised by an actual `pagechange` event rather than called
// directly, which is what would let a real wiring mistake between the event and the handler
// slip past this test. The row itself emits `rowclick` with the row's own dataItem, the same
// shape Kendo's real `GridRowClickEvent` carries, so `onRowClick` gets exercised the same way.
vi.mock('@progress/kendo-vue-grid', () => ({
  Grid: {
    props: ['dataItems', 'columns', 'total', 'skip', 'take'],
    emits: ['pagechange', 'rowclick'],
    template: `
      <div class="grid-stub">
        <div v-for="column in columns" :key="column.field" class="grid-column-title">{{ column.title }}</div>
        <div
          v-for="(item, index) in dataItems"
          :key="index"
          class="grid-row"
          @click="$emit('rowclick', { dataItem: item })"
        >
          <template v-for="column in columns" :key="column.field">
            <slot v-if="column.cell" :name="column.cell" :props="{ dataItem: item }" />
            <span v-else class="grid-cell">{{ item[column.field] }}</span>
          </template>
        </div>
        <button
          type="button"
          class="pager-button"
          @click="$emit('pagechange', { page: { skip: 50, take: 25 } })"
        >page</button>
      </div>
    `,
  },
}))

vi.mock('@ada/design-system', () => ({
  CalculumLoadingAr: { template: '<div class="loading" />' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  ContentBox: { template: '<div><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge" :class="variant">{{ text }}</span>' },
}))

import BuyerLinesGrid from '@/modules/buyers/components/customerCard/BuyerLinesGrid.vue'
import type { LinesPageResponse, SaleLineRow } from '@/api'

const messages = {
  en: {
    arCustomerCard: {
      lines: {
        title: 'Sales lines',
        provisional: 'Provisional',
        empty: 'This buyer has no sales lines.',
        loadError: 'Could not load this buyer’s sales lines. Try again.',
        table: {
          id: 'ID',
          year: 'Year',
          period: 'Period (m)',
          startDate: 'Start date',
          endDate: 'End date',
          volume: 'Volume',
          currency: 'Currency',
          actualTerm: 'Actual term',
          contractualTerm: 'Contractual term',
        },
      },
    },
  },
}

function mountGrid(versionId = 73, buyerId = 10) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(BuyerLinesGrid, {
    props: { versionId, buyerId },
    global: { plugins: [i18n] },
  })
}

const line: SaleLineRow = {
  id: 1,
  sourceRowNumber: 5,
  buyer: 'Acme Corp',
  supplier: 'Beta Supplies',
  currency: 'USD',
  salesTeam: 'Team A',
  volume: 12345,
  actualPaymentTerms: 30,
  contractualPaymentTermsWithoutCashDiscounts: 45,
  contractualPaymentTermsWithCashDiscounts: 40,
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  year: 2024,
  periodInMonths: 1,
  commodity: null,
  internalId: null,
}

function pageWith(lines: SaleLineRow[], total: number, page = 1, pageSize = 25): LinesPageResponse {
  return { total, page, pageSize, lines }
}

describe('BuyerLinesGrid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it("renders the volume column with the selected currency's symbol (UC-UI-23)", async () => {
    fetchBuyerLines.mockResolvedValue(pageWith([line], 1))

    const view = mountGrid(73, 10)
    await flushPromises()

    expect(view.text()).toContain('$12,345')
  })

  it("renders the volume column with the ROW's OWN currency symbol, not the globally selected display currency (PR 14881 review)", async () => {
    // The store defaults selectedCurrency to USD, unchanged here - this line's own `currency` is
    // EUR, and its `volume` is that EUR amount, unconverted. Prefixing it with the globally
    // selected symbol ('$') would mislabel a EUR figure as if it were USD.
    fetchBuyerLines.mockResolvedValue(pageWith([{ ...line, currency: 'EUR' }], 1))

    const view = mountGrid(73, 10)
    await flushPromises()

    expect(view.text()).toContain('€12,345')
    expect(view.text()).not.toContain('$12,345')
  })

  it('requests page 1 on mount', async () => {
    fetchBuyerLines.mockResolvedValue(pageWith([line], 1))

    mountGrid(73, 10)
    await flushPromises()

    expect(fetchBuyerLines).toHaveBeenCalledWith(73, 10, 1, 25)
  })

  it('requests the page a pager event asks for, not the page it started on', async () => {
    fetchBuyerLines.mockResolvedValue(pageWith([line], 1))
    const grid = mountGrid(73, 10)
    await flushPromises()

    // The stub's pager button emits `{ page: { skip: 50, take: 25 } }`. With the confirmed
    // page-1 state (skip 0, size 25) still in effect, `pageRequestFromGridEvent` resolves that
    // to page 3 at the same size - see `paging.ts`'s own doc for why the arithmetic is what it
    // is. Written out by hand here rather than re-derived from the component, so a bug in that
    // arithmetic cannot also hide itself from this assertion.
    await grid.find('.pager-button').trigger('click')
    await flushPromises()

    expect(fetchBuyerLines).toHaveBeenLastCalledWith(73, 10, 3, 25)
  })

  it('renders the empty state, not a bare grid, when the buyer has no lines at all', async () => {
    fetchBuyerLines.mockResolvedValue(pageWith([], 0))

    const grid = mountGrid()
    await flushPromises()

    expect(grid.find('.no-data').text()).toBe('This buyer has no sales lines.')
    expect(grid.find('.grid-stub').exists()).toBe(false)
  })

  // The defect this pair exists for: a rejected request leaves `page` on its initial zero total,
  // so before the error branch existed a failed load rendered "This buyer has no sales lines" - a
  // claim about the data produced by failing to read it. Asserting the empty copy is ABSENT is the
  // half that would have caught it; asserting the error copy is present is the half that pins the
  // replacement.
  it('renders the error state, not the empty state, when the request fails', async () => {
    fetchBuyerLines.mockRejectedValue(new Error('boom'))

    const grid = mountGrid()
    await flushPromises()

    expect(grid.find('.no-data').text()).toBe('Could not load this buyer’s sales lines. Try again.')
    expect(grid.text()).not.toContain('This buyer has no sales lines.')
    expect(grid.find('.grid-stub').exists()).toBe(false)
  })

  it('renders the id column plus the eight required columns, and no strategy figure in any cell', async () => {
    fetchBuyerLines.mockResolvedValue(pageWith([line], 1))

    const grid = mountGrid()
    await flushPromises()

    const titles = grid.findAll('.grid-column-title').map((node) => node.text())
    expect(titles).toEqual([
      'ID',
      'Year',
      'Period (m)',
      'Start date',
      'End date',
      'Volume',
      'Currency',
      'Actual term',
      'Contractual term',
    ])

    // SaleLineRow carries no strategy field at all - this pins that fact against a future
    // column added here by mistake, rather than trusting the type to keep enforcing it.
    const rowText = grid.find('.grid-row').text()
    expect(rowText).not.toMatch(/strateg/i)
    expect(rowText).not.toContain('BuyerStandardStrategy')
  })

  it('shows the provisional marker in the header', async () => {
    fetchBuyerLines.mockResolvedValue(pageWith([line], 1))

    const grid = mountGrid()
    await flushPromises()

    expect(grid.text()).toContain('Provisional')
  })

  it('opens the line detail for the clicked row, scoped to this version and buyer', async () => {
    fetchBuyerLines.mockResolvedValue(pageWith([line], 1))

    const grid = mountGrid(73, 10)
    await flushPromises()

    await grid.find('.grid-row').trigger('click')

    expect(openSaleLineDetail).toHaveBeenCalledWith(73, 10, 1)
  })
})
