import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchLines = vi.fn()
vi.mock('@/modules/match/api', () => ({
  fetchLines: (...args: unknown[]) => fetchLines(...args),
}))

// Same stub shape as BuyerLinesGrid.spec.ts's own: a `slot`, keyed by the column's `cell` name,
// renders the real custom cell templates the way Kendo's real Grid would.
vi.mock('@progress/kendo-vue-grid', () => ({
  Grid: {
    props: ['dataItems', 'columns', 'pageable', 'total', 'skip', 'take'],
    emits: ['pagechange'],
    template: `
      <div class="grid-stub">
        <div v-for="(item, index) in dataItems" :key="index" class="grid-row">
          <template v-for="column in columns" :key="column.field">
            <slot v-if="column.cell" :name="column.cell" :props="{ dataItem: item }" />
            <span v-else class="grid-cell">{{ item[column.field] }}</span>
          </template>
        </div>
      </div>
    `,
  },
}))

vi.mock('@ada/design-system', () => ({
  CalculumLoadingAr: { template: '<div class="loading" />' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge">{{ text }}</span>' },
}))

import MatchesTab from '@/modules/match/components/MatchesTab.vue'

const messages = {
  en: {
    arMatch: {
      empty: 'No lines',
      table: {
        row: 'Row', buyer: 'Buyer', supplier: 'Supplier', currency: 'Currency', team: 'Team',
        volume: 'Volume', terms: 'Terms', contractual: 'Contractual', year: 'Year',
        commodity: 'Commodity', internalId: 'Internal ID',
      },
    },
  },
}

function mountTab(versionId = 73) {
  setActivePinia(createPinia())
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(MatchesTab, {
    props: { versionId },
    global: { plugins: [i18n] },
  })
}

describe('MatchesTab', () => {
  beforeEach(() => {
    fetchLines.mockReset()
  })

  it("renders the volume column with the selected currency's symbol (UC-UI-23)", async () => {
    fetchLines.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 25,
      lines: [{ sourceRowNumber: 1, buyer: 'Acme', supplier: 'Beta', currency: 'USD', volume: 45000 }],
    })

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('$45,000')
  })

  it("renders the volume column with the ROW's OWN currency symbol, not the globally selected display currency (PR 14881 review)", async () => {
    // The store defaults selectedCurrency to USD, unchanged here - this line's own `currency` is
    // EUR, and its `volume` is that EUR amount, unconverted (see `SaleLineRow`'s own doc). Prefixing
    // it with the globally selected symbol ('$') would mislabel a EUR figure as if it were USD.
    fetchLines.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 25,
      lines: [{ sourceRowNumber: 1, buyer: 'Acme', supplier: 'Beta', currency: 'EUR', volume: 45000 }],
    })

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('€45,000')
    expect(view.text()).not.toContain('$45,000')
  })

  it('renders "—" for a null volume, with no symbol prefix (AC#7)', async () => {
    fetchLines.mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 25,
      lines: [{ sourceRowNumber: 1, buyer: 'Acme', supplier: 'Beta', currency: 'USD', volume: null }],
    })

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('—')
    expect(view.text()).not.toContain('$—')
  })
})
