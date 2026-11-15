import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

// The real Kendo Grid needs a full DOM layout engine jsdom does not provide. This stub is
// richer than BuyersView.spec.ts's own (which only needs rowclick): it also invokes the
// row-render prop and emits sortchange, so BuyerGrid's own onSortChange/rowRender get exercised
// the way the real Grid would exercise them.
vi.mock('@progress/kendo-vue-grid', () => ({
  Grid: {
    props: ['dataItems', 'columns', 'rowRender'],
    emits: ['sortchange', 'rowclick'],
    template: `
      <div class="grid-stub">
        <div
          v-for="item in dataItems"
          :key="item.id"
          class="grid-row"
          @click="$emit('rowclick', { dataItem: item })"
        >
          <span class="row-name">{{ item.companyName }}</span>
          <span class="credit-rating-cell"><slot name="creditRating" :props="{ dataItem: item }" /></span>
          <span class="credit-limit-cell"><slot name="creditLimit" :props="{ dataItem: item }" /></span>
        </div>
        <div class="row-render-output" v-html="renderedRow" />
        <button type="button" class="sort-button" @click="$emit('sortchange', { sort: [{ field: 'country', dir: 'desc' }] })">sort</button>
      </div>
    `,
    computed: {
      renderedRow() {
        if (!this.dataItems.length || !this.rowRender) return ''
        const vnode = this.rowRender(h, { props: { class: 'k-table-row' } }, [])
        return `class="${vnode.props.class}"`
      },
    },
  },
}))

import { TooltipButton } from '@ada/design-system'
import BuyerGrid from '@/modules/buyers/components/BuyerGrid.vue'

const CREDIT_LIMIT_DISCLAIMER =
  'Credit limit is informational only and should not be relied on for a risk or credit decision.'

const messages = {
  en: {
    arBuyers: {
      table: {
        name: 'Name',
        country: 'Country',
        industry: 'Industry',
        parent: 'Parent',
        creditRating: 'Credit rating',
        creditLimit: 'Credit limit',
        paymentTerms: 'Payment terms',
        tooltips: { creditLimitDisclaimer: CREDIT_LIMIT_DISCLAIMER },
      },
    },
  },
}

function mountGrid(rows?: Array<Record<string, unknown>>) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(BuyerGrid, {
    props: {
      rows: rows ?? [
        { id: 1, companyName: 'Beta Co', country: 'USA', industry: '541', parentName: null, creditRating: 'A', creditLimit: 1000, actualPaymentTermsAvg: 30 },
        { id: 2, companyName: 'Acme Corporation', country: 'USA', industry: '541', parentName: null, creditRating: 'B', creditLimit: 2000, actualPaymentTermsAvg: 45 },
      ],
    },
    global: { plugins: [i18n] },
  })
}

describe('BuyerGrid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it("renders the credit limit with the selected currency's symbol (UC-UI-23), payment terms unaffected", () => {
    const view = mountGrid()

    const creditLimits = view.findAll('.credit-limit-cell').map((cell) => cell.text())
    expect(creditLimits.some((text) => text.includes('$1,000'))).toBe(true)
    expect(creditLimits.some((text) => text.includes('$2,000'))).toBe(true)
  })

  it('sorts by company name ascending by default', () => {
    const view = mountGrid()

    const names = view.findAll('.row-name').map((row) => row.text())
    expect(names).toEqual(['Acme Corporation', 'Beta Co'])
  })

  it('re-sorts when the analyst changes the sort column (onSortChange is a real Kendo callback, not dead code)', async () => {
    const view = mountGrid()
    const initialOrder = view.findAll('.row-name').map((row) => row.text())

    await view.find('.sort-button').trigger('click')

    // Both rows share country 'USA', so orderBy has no tiebreak to preserve - the row order
    // is expected to change from the default name-ascending view once onSortChange actually
    // re-runs orderBy under the new sort descriptor, rather than silently no-oping.
    const sortedOrder = view.findAll('.row-name').map((row) => row.text())
    expect(sortedOrder).not.toEqual(initialOrder)
  })

  it('marks every row clickable via rowRender, appending to whatever class Kendo already set', () => {
    const view = mountGrid()

    expect(view.find('.row-render-output').html()).toContain('k-table-row buyer-row--clickable')
  })

  it('opens the buyer whose row was clicked', async () => {
    const view = mountGrid()

    // Default sort is by companyName ascending, so 'Acme Corporation' (id 2) renders first,
    // ahead of 'Beta Co' (id 1).
    await view.find('.grid-row').trigger('click')

    expect(view.emitted('open')).toEqual([[2]])
  })

  it('does not open the buyer when the credit-limit disclaimer trigger is clicked (UC-UI-21, row-click bubbling)', async () => {
    const view = mountGrid()

    await view.find('.credit-limit-cell button').trigger('click')

    expect(view.emitted('open')).toBeUndefined()
  })

  it('does not open the buyer when the credit-rating disclaimer trigger is clicked (UC-UI-21, row-click bubbling)', async () => {
    const view = mountGrid()

    await view.find('.credit-rating-cell button').trigger('click')

    expect(view.emitted('open')).toBeUndefined()
  })

  it('carries the credit-limit disclaimer alongside a real limit (UC-UI-21 FR-2)', () => {
    const view = mountGrid()

    const creditLimitDisclaimers = view
      .findAll('.credit-limit-cell')
      .flatMap((cell) => cell.findAllComponents(TooltipButton))
    expect(creditLimitDisclaimers).toHaveLength(2)
    creditLimitDisclaimers.forEach((disclaimer) => expect(disclaimer.props('text')).toBe(CREDIT_LIMIT_DISCLAIMER))
  })

  it('renders no credit-limit disclaimer when there is no limit on record, independent of credit rating (UC-UI-21 AF-1)', () => {
    const view = mountGrid([
      { id: 1, companyName: 'Beta Co', country: 'USA', industry: '541', parentName: null, creditRating: 'A', creditLimit: null, actualPaymentTermsAvg: 30 },
    ])

    expect(view.find('.credit-limit-cell').findComponent(TooltipButton).exists()).toBe(false)
    expect(view.find('.credit-limit-cell').text()).toBe('—')
    // The rating disclaimer is unaffected - it caveats a different, still-present field.
    expect(view.find('.credit-rating-cell').findComponent(TooltipButton).exists()).toBe(true)
  })
})
