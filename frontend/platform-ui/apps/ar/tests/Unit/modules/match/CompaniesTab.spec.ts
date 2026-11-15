import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchCompanies = vi.fn()
vi.mock('@/api', () => ({
  fetchCompanies: (...args: unknown[]) => fetchCompanies(...args),
}))

vi.mock('@/modules/match/MatchRouting', () => ({
  match: 'Match',
  customerCard: 'CustomerCard',
  openCustomerCard: vi.fn(),
}))

vi.mock('@progress/kendo-vue-grid', () => ({
  Grid: {
    props: ['dataItems', 'columns', 'sortable', 'sort', 'rowRender'],
    emits: ['sortchange', 'rowclick'],
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

vi.mock('@progress/kendo-data-query', () => ({
  orderBy: (rows: unknown[]) => rows,
}))

vi.mock('@ada/design-system', () => ({
  BodyText: { template: '<span><slot /></span>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge">{{ text }}</span>' },
}))

import CompaniesTab from '@/modules/match/components/CompaniesTab.vue'

const messages = {
  en: {
    arMatch: {
      empty: 'No companies',
      roles: { all: 'All', counterparty: 'Counterparty', parent: 'Parent', self: 'Self' },
      table: {
        role: 'Role', resolution: 'Resolution', lifecycle: 'Lifecycle', row: 'Row', name: 'Name',
        country: 'Country', industry: 'Industry', revenue: 'Revenue', internalId: 'Internal ID',
      },
    },
  },
}

function mountTab(versionId = 73) {
  setActivePinia(createPinia())
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(CompaniesTab, {
    props: { versionId },
    global: { plugins: [i18n] },
  })
}

describe('CompaniesTab', () => {
  beforeEach(() => {
    fetchCompanies.mockReset()
  })

  it("renders the revenue column with the selected currency's symbol (UC-UI-23)", async () => {
    fetchCompanies.mockResolvedValue([
      { sourceRowNumber: 1, role: 'Counterparty', resolution: 'Enriched', lifecycle: 'Actual', companyName: 'Acme', annualRevenue: 12_000_000 },
    ])

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('$12,000,000')
  })

  it('renders "—" for a null revenue, with no symbol prefix (AC#7)', async () => {
    fetchCompanies.mockResolvedValue([
      { sourceRowNumber: 1, role: 'Counterparty', resolution: 'Enriched', lifecycle: 'Actual', companyName: 'Acme', annualRevenue: null },
    ])

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('—')
    expect(view.text()).not.toContain('$—')
  })
})
