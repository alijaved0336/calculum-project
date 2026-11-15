import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { useContextStore } from '@/stores/context'
import { useCustomerCardModalStore } from '@/stores/customerCardModal'

const fetchCompanies = vi.fn()
vi.mock('@/api', () => ({
  fetchCompanies: (...args: unknown[]) => fetchCompanies(...args),
}))

const fetchBuyers = vi.fn()
vi.mock('@/modules/buyers/api/fetchBuyers', () => ({
  fetchBuyers: (...args: unknown[]) => fetchBuyers(...args),
}))

const fetchRecentBuyers = vi.fn()
const markBuyerRecent = vi.fn()
const deleteRecentBuyer = vi.fn()
vi.mock('@/modules/buyers/api/recentBuyers', () => ({
  fetchRecentBuyers: (...args: unknown[]) => fetchRecentBuyers(...args),
  markBuyerRecent: (...args: unknown[]) => markBuyerRecent(...args),
  deleteRecentBuyer: (...args: unknown[]) => deleteRecentBuyer(...args),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLayout: {
    emits: ['load-more-entities'],
    template: `
      <div>
        <slot name="slotTop" />
        <div id="container-main-id">
          <slot name="slotContent" />
        </div>
        <button type="button" class="load-more-trigger" @click="$emit('load-more-entities')" />
      </div>
    `,
  },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  DisplayText: { template: '<span><slot /></span>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge">{{ text }}</span>' },
  BodyText: { template: '<span><slot /></span>' },
  // UC-UI-21: pulled in transitively by BuyerGrid -> BuyerCreditRating and by BuyerGrid's own
  // credit-limit cell, which this file renders for real (BuyerGrid is not mocked here).
  TooltipButton: { props: ['text'], template: '<span class="tooltip-button-stub">{{ text }}</span>' },
  CustomTabs: {
    props: ['items', 'modelValue', 'appearance', 'contained'],
    emits: ['update:modelValue'],
    template: `
      <div>
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          @click="$emit('update:modelValue', item.id)"
        >{{ item.label }}</button>
      </div>
    `,
  },
  SearchableDropdown: {
    props: ['items', 'modelValue', 'placeholder', 'showSearch'],
    emits: ['update:modelValue'],
    template: `
      <select class="sort-dropdown" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
        <option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    `,
  },
  SupplierCard: {
    props: ['name', 'legalName', 'logoFallback', 'countryName', 'types', 'smeTitle', 'metrics', 'parentsValue', 'showClose'],
    emits: ['click', 'close'],
    template: `
      <article class="supplier-card-stub" @click="$emit('click', $event)">
        {{ name }}
        <button v-if="showClose" type="button" class="supplier-card-stub-close" @click.stop="$emit('close', $event)" />
      </article>
    `,
  },
}))

// The real Kendo Grid needs a full DOM layout engine jsdom does not provide; a template stub
// that renders one row per item is enough to prove BuyersView wires rows/columns through to it.
vi.mock('@progress/kendo-vue-grid', () => ({
  Grid: {
    props: ['dataItems', 'columns'],
    emits: ['rowclick'],
    template: `
      <div class="grid-stub">
        <div
          v-for="item in dataItems"
          :key="item.id"
          class="grid-row"
          @click="$emit('rowclick', { dataItem: item })"
        >{{ item.companyName }} / {{ item.parentName }}</div>
      </div>
    `,
  },
}))

import BuyersView from '@/modules/buyers/views/BuyersView.vue'

const buyer = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  role: 'Counterparty',
  resolution: 'Resolved',
  lifecycle: 'Actual',
  sourceRowNumber: 1,
  companyName: 'Acme Corporation',
  country: 'USA',
  industry: '541',
  ultimateParentId: null,
  internalId: null,
  annualRevenue: null,
  creditLimit: 50000,
  actualPaymentTermsAvg: 30,
  contractualPaymentTermsWithCashDiscountsAvg: null,
  contractualPaymentTermsWithoutCashDiscountsAvg: null,
  creditRating: 'A',
  ...overrides,
})

const buyerCard = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  role: 'Counterparty',
  resolution: 'Resolved',
  lifecycle: 'Actual',
  name: 'Acme Corporation',
  originalName: 'Acme CorporationUSA',
  url: null,
  volume: 1000,
  forecastVolume: null,
  negotiationStatus: null,
  negotiationStatusCode: null,
  parentId: null,
  parentName: null,
  saleLineCount: 1,
  country: 'USA',
  industry: '541',
  isSme: false,
  smeSource: null,
  isPilot: false,
  creditLimit: 50000,
  creditRating: 'A',
  actualPaymentTermsAvg: 30,
  contractualPaymentTermsWithCashDiscountsAvg: null,
  contractualPaymentTermsWithoutCashDiscountsAvg: null,
  ...overrides,
})

const messages = {
  en: {
    arBuyers: {
      title: 'Buyers',
      noVersion: 'Select a sale file version to see its buyers.',
      errorLoad: 'The buyer roster could not be loaded.',
      empty: 'No buyers to show yet.',
      emptySearch: 'No buyers match your search.',
      loadMoreHint: 'Scroll down or click to load more buyers',
      allLoaded: 'All buyers have been loaded',
      view: { grid: 'Grid', card: 'Card' },
      recent: { title: 'Recently Viewed', all: 'Companies' },
      sort: {
        label: 'Sort by',
        nameAsc: 'Name A-Z',
        nameDesc: 'Name Z-A',
        recentlyViewed: 'Recently Viewed',
        volumeAsc: 'Volume: Lowest to Highest',
        volumeDesc: 'Volume: Highest to Lowest',
      },
      table: {
        name: 'Name',
        country: 'Country',
        industry: 'Industry',
        parent: 'Parent',
        creditRating: 'Credit rating',
        creditLimit: 'Credit limit',
        paymentTerms: 'Payment terms',
        tooltips: {
          creditRatingDisclaimer: "Credit rating is estimated from the parent company's profile and is not an independent assessment of this entity.",
          creditLimitDisclaimer: 'Credit limit is informational only and should not be relied on for a risk or credit decision.',
        },
      },
    },
  },
}

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(BuyersView, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe('BuyersView (UC-UI-05)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // The card pipeline now preloads eagerly on mount regardless of which tab is active (same as
    // grid's own `rows` already did before this change), so every test that mounts the view needs
    // this to resolve to something harmless unless it cares about the card roster specifically.
    fetchBuyers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })
    fetchRecentBuyers.mockResolvedValue({ items: [] })
    markBuyerRecent.mockResolvedValue(undefined)
    deleteRecentBuyer.mockResolvedValue(undefined)
  })

  afterEach(() => {
    fetchCompanies.mockReset()
    fetchBuyers.mockReset()
    fetchRecentBuyers.mockReset()
    markBuyerRecent.mockReset()
    deleteRecentBuyer.mockReset()
  })

  it('asks the analyst to select a version rather than fetching anything, when none is selected', async () => {
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Select a sale file version to see its buyers.')
    expect(fetchCompanies).not.toHaveBeenCalled()

    view.unmount()
  })

  // The grid presentation is hidden for now (BuyersView.vue forces context.buyersView to 'card'
  // on every mount - see the regression test for that below) - its own fetch/render/stale-guard
  // behavior below is unreachable through the UI until it comes back, so these are skipped rather
  // than deleted.
  it.skip('fetches the roster for the selected version and shows only Counterparty rows in the grid by default', async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([
      buyer({ id: 1, companyName: 'Acme Corporation' }),
      buyer({ id: 2, companyName: 'Fabrikam Parent', role: 'Parent' }),
    ])

    const view = mountView()
    await flushPromises()

    expect(fetchCompanies).toHaveBeenCalledWith(73)
    expect(view.text()).toContain('Acme Corporation')
    expect(view.text()).not.toContain('Fabrikam Parent')
    expect(view.find('.no-data').exists()).toBe(false)

    view.unmount()
  })

  it.skip("resolves a buyer's parent name from the roster's own Parent-role rows (UC-API-06)", async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([
      buyer({ id: 1, companyName: 'Acme Corporation', ultimateParentId: 2 }),
      buyer({ id: 2, companyName: 'Fabrikam Parent', role: 'Parent', ultimateParentId: null }),
    ])

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Fabrikam Parent')

    view.unmount()
  })

  it('shows the empty state when the version has no buyers', async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('No buyers to show yet.')

    view.unmount()
  })

  it.skip('shows a load error without crashing when the roster request fails', async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockRejectedValue(new Error('network down'))

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('The buyer roster could not be loaded.')

    view.unmount()
  })

  it.skip('discards a stale request that fails after a newer one already succeeded, rather than showing a load error for a version the analyst already left', async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')

    let rejectFirst: (reason: unknown) => void = () => {}
    fetchCompanies.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject }))

    const view = mountView()
    await flushPromises()

    context.setVersion(74, 'v-74')
    fetchCompanies.mockResolvedValueOnce([buyer({ id: 2, companyName: 'Fresher Buyer' })])
    await flushPromises()

    // The stale version-73 request finally fails after version 74's already succeeded.
    rejectFirst(new Error('network down'))
    await flushPromises()

    expect(view.text()).toContain('Fresher Buyer')
    expect(view.text()).not.toContain('The buyer roster could not be loaded.')

    view.unmount()
  })

  it('opens the Customer Card modal for the buyer that was clicked, rather than navigating', async () => {
    const context = useContextStore()
    const modal = useCustomerCardModalStore()
    context.setVersion(73, 'v-73')
    fetchBuyers.mockResolvedValue({ items: [buyerCard({ id: 42, name: 'Acme Corporation' })], page: 1, pageSize: 20, total: 1 })

    const view = mountView()
    await flushPromises()

    await view.get('.supplier-card-stub').trigger('click')

    expect(modal.isOpen).toBe(true)
    expect(modal.versionId).toBe(73)
    expect(modal.buyerId).toBe(42)

    view.unmount()
  })

  /**
   * Regression: the grid/card toggle is hidden for now (the grid presentation isn't shown at
   * all), so `context.buyersView` must always read 'card' - including overriding whatever a
   * previous session left persisted (`context.ts`'s own doc explains `buyersView` survives a
   * reload).
   */
  it('always shows the card layout, overriding a persisted grid selection from a previous session (UC-UI-05 Notes)', async () => {
    const context = useContextStore()
    context.setBuyersView('grid') // simulates a stale persisted selection from before this change
    context.setVersion(73, 'v-73')
    fetchBuyers.mockResolvedValue({ items: [buyerCard({ id: 1, name: 'Acme Corporation' })], page: 1, pageSize: 20, total: 1 })

    const view = mountView()
    await flushPromises()

    expect(context.buyersView).toBe('card')
    expect(view.find('.grid-stub').exists()).toBe(false)
    expect(view.text()).toContain('Acme Corporation')

    view.unmount()
  })

  it("re-fetches the card view's roster when the selected version changes, guarding against a stale response overwriting a fresher one", async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')

    let resolveFirst: (value: unknown) => void = () => {}
    fetchBuyers.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))

    const view = mountView()
    await flushPromises()

    context.setVersion(74, 'v-74')
    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 2, name: 'Fresher Buyer' })], page: 1, pageSize: 20, total: 1 })
    await flushPromises()

    // The stale version-73 request finally resolves after version 74's already has.
    resolveFirst({ items: [buyerCard({ id: 1, name: 'Stale Buyer' })], page: 1, pageSize: 20, total: 1 })
    await flushPromises()

    expect(view.text()).toContain('Fresher Buyer')
    expect(view.text()).not.toContain('Stale Buyer')

    view.unmount()
  })

  it('requests the default first page (page 1, pageSize 20, no search) on mount, regardless of which tab is active', async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])

    const view = mountView()
    await flushPromises()

    expect(fetchBuyers).toHaveBeenCalledWith('v-73', { search: undefined, page: 1, pageSize: 20, sort: 'nameAsc', currencyRate: 1 })

    view.unmount()
  })

  it('shows the searched roster in the card view, replacing rather than appending, on a navbar search submit', async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])

    const view = mountView()
    await flushPromises()

    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 9, name: 'Fabrikam Buyer' })], page: 1, pageSize: 20, total: 1 })
    context.setBuyersView('card')
    context.submitBuyersSearch('acme')
    await flushPromises()

    expect(fetchBuyers).toHaveBeenLastCalledWith('v-73', { search: 'acme', page: 1, pageSize: 20, sort: 'nameAsc', currencyRate: 1 })
    expect(view.text()).toContain('Fabrikam Buyer')

    view.unmount()
  })

  it('appends the next page when scrolled to the bottom, requesting the page after the previous response\'s own `page`', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])

    // total: 21 against page 1 of 20 (1 * 20 < 21) says a further page exists.
    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 1, name: 'Buyer 1' })], page: 1, pageSize: 20, total: 21 })

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Buyer 1')
    expect(view.text()).not.toContain('Buyer 2')

    // page 2 of 20 against the same total (2 * 20 >= 21) says this is the last page.
    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 2, name: 'Buyer 2' })], page: 2, pageSize: 20, total: 21 })
    await view.get('.load-more-trigger').trigger('click')
    await flushPromises()

    expect(fetchBuyers).toHaveBeenLastCalledWith('v-73', { search: undefined, page: 2, pageSize: 20, sort: 'nameAsc', currencyRate: 1 })
    // Appended, not replaced - both pages' buyers are on screen together.
    expect(view.text()).toContain('Buyer 1')
    expect(view.text()).toContain('Buyer 2')

    view.unmount()
  })

  it('defaults to nameAsc and restarts the roster from a fresh first page when the sort changes', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 1, name: 'Buyer 1' })], page: 1, pageSize: 20, total: 21 })

    const view = mountView()
    await flushPromises()
    expect(fetchBuyers).toHaveBeenLastCalledWith('v-73', { search: undefined, page: 1, pageSize: 20, sort: 'nameAsc', currencyRate: 1 })

    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 2, name: 'Buyer 2' })], page: 1, pageSize: 20, total: 1 })
    await view.get('.sort-dropdown').setValue('volumeDesc')
    await flushPromises()

    // A fresh first page under the new sort - `page: 1` again, not the previous page's `page + 1`,
    // and the old page's own buyer is gone rather than appended to.
    expect(fetchBuyers).toHaveBeenLastCalledWith('v-73', { search: undefined, page: 1, pageSize: 20, sort: 'volumeDesc', currencyRate: 1 })
    expect(view.text()).toContain('Buyer 2')
    expect(view.text()).not.toContain('Buyer 1')

    view.unmount()
  })

  it('keeps the active search term when the sort changes', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })

    const view = mountView()
    await flushPromises()
    context.submitBuyersSearch('acme')
    await flushPromises()

    await view.get('.sort-dropdown').setValue('nameDesc')
    await flushPromises()

    expect(fetchBuyers).toHaveBeenLastCalledWith('v-73', { search: 'acme', page: 1, pageSize: 20, sort: 'nameDesc', currencyRate: 1 })

    view.unmount()
  })

  it('offers the load-more control from the first page on, so a roster that never scrolls can still continue (#20412)', async () => {
    // `.cards-container`'s forced min-height is gone, so a first page that fits inside its
    // container fires no `load-more-entities` - nothing scrolls. The two cases are complementary
    // rather than a gap: a roster tall enough to overflow arms the scroll, and one that isn't
    // leaves this control on screen with no scrolling needed to reach it.
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 1, name: 'Buyer 1' })], page: 1, pageSize: 20, total: 21 })

    const view = mountView()
    await flushPromises()

    expect(view.find('.load-more-hint').exists()).toBe(true)
    expect(view.find('.all-loaded-hint').exists()).toBe(false)

    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 2, name: 'Buyer 2' })], page: 2, pageSize: 20, total: 21 })
    await view.get('.load-more-hint').trigger('click')
    await flushPromises()

    expect(fetchBuyers).toHaveBeenLastCalledWith('v-73', { search: undefined, page: 2, pageSize: 20, sort: 'nameAsc', currencyRate: 1 })
    expect(view.text()).toContain('Buyer 2')

    // Nothing left to ask for: the control gives way to the "all loaded" line rather than
    // inviting a request that would answer nothing.
    expect(view.find('.load-more-hint').exists()).toBe(false)
    expect(view.find('.all-loaded-hint').exists()).toBe(true)

    view.unmount()
  })

  it('stops paginating once page*pageSize reaches total, even for a full page, rather than inferring it from the page length', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    // A FULL 20-item page whose total is exactly 20 (1 * 20 >= 20) - proves "no more" is read
    // from page*pageSize against total, not guessed from items.length reaching the page size.
    const fullPage = Array.from({ length: 20 }, (_, i) => buyerCard({ id: i + 1, name: `Buyer ${i + 1}` }))
    fetchBuyers.mockResolvedValueOnce({ items: fullPage, page: 1, pageSize: 20, total: 20 })

    const view = mountView()
    await flushPromises()
    expect(fetchBuyers).toHaveBeenCalledTimes(1)

    await view.get('.load-more-trigger').trigger('click')
    await flushPromises()

    expect(fetchBuyers).toHaveBeenCalledTimes(1)

    view.unmount()
  })

  it('ignores load-more-entities while showing the grid view - infinite scroll is card-only', async () => {
    const context = useContextStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    // total: 2 against a full page of 1 (1 * 20 < 2) so a further page genuinely exists - without
    // the explicit setBuyersView('grid') below, onLoadMore would also skip this via its
    // `!cardHasMore` guard, which is a different code path than the one this test names.
    fetchBuyers.mockResolvedValueOnce({ items: [buyerCard({ id: 1, name: 'Acme Corporation' })], page: 1, pageSize: 20, total: 2 })

    const view = mountView()
    await flushPromises()
    expect(fetchBuyers).toHaveBeenCalledTimes(1)

    // BuyersView.vue only forces 'card' once, on mount - the grid/card toggle itself is hidden for
    // now, but the store method still exists, so this reaches onLoadMore's own view guard directly.
    context.setBuyersView('grid')
    await view.get('.load-more-trigger').trigger('click')
    await flushPromises()

    expect(fetchBuyers).toHaveBeenCalledTimes(1)

    view.unmount()
  })

  it("shows the card view's own empty state, independent of the grid roster", async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([buyer({ id: 1, companyName: 'Acme Corporation' })])
    fetchBuyers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('No buyers to show yet.')

    view.unmount()
  })

  it("shows a load error for the card view's own roster without touching grid's state", async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockRejectedValue(new Error('network down'))

    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('The buyer roster could not be loaded.')

    view.unmount()
  })

  it('shows the Recently Viewed section when there are recent buyers, hidden when there are none', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })
    fetchRecentBuyers.mockResolvedValue({ items: [buyerCard({ id: 9, name: 'Recently Viewed Buyer' })] })

    const view = mountView()
    await flushPromises()

    expect(fetchRecentBuyers).toHaveBeenCalledWith('v-73', 1, 'nameAsc')
    expect(view.text()).toContain('Recently Viewed')
    expect(view.text()).toContain('Recently Viewed Buyer')

    view.unmount()
  })

  it('re-fetches the Recently Viewed shelf under the newly selected sort (#20412)', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })
    fetchRecentBuyers.mockResolvedValue({ items: [buyerCard({ id: 9, name: 'Recently Viewed Buyer' })] })

    const view = mountView()
    await flushPromises()
    expect(fetchRecentBuyers).toHaveBeenLastCalledWith('v-73', 1, 'nameAsc')

    await view.get('.sort-dropdown').setValue('nameDesc')
    await flushPromises()

    // The shelf sits directly above the roster, so the sort control has to reach both - and the
    // ordering is the endpoint's, not a comparator here, so honouring it costs a round trip.
    expect(fetchRecentBuyers).toHaveBeenLastCalledWith('v-73', 1, 'nameDesc')
    expect(fetchRecentBuyers).toHaveBeenCalledTimes(2)

    view.unmount()
  })

  it('collapses and expands the Recently Viewed shelf without refetching it', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })
    fetchRecentBuyers.mockResolvedValue({ items: [buyerCard({ id: 9, name: 'Recently Viewed Buyer' })] })

    const view = mountView()
    await flushPromises()
    expect(view.get('.recent-buyers-toggle').attributes('aria-expanded')).toBe('true')
    expect(view.text()).toContain('Recently Viewed Buyer')

    await view.get('.recent-buyers-toggle').trigger('click')

    expect(view.get('.recent-buyers-toggle').attributes('aria-expanded')).toBe('false')
    // Collapsed, not removed - the card is still in the DOM (v-show), just hidden, so re-expanding
    // needs no new fetch.
    expect(view.find('.supplier-card-stub').isVisible()).toBe(false)
    expect(fetchRecentBuyers).toHaveBeenCalledTimes(1)

    await view.get('.recent-buyers-toggle').trigger('click')

    expect(view.get('.recent-buyers-toggle').attributes('aria-expanded')).toBe('true')
    expect(view.find('.supplier-card-stub').isVisible()).toBe(true)
    expect(fetchRecentBuyers).toHaveBeenCalledTimes(1)

    view.unmount()
  })

  it('removes a buyer from the Recently Viewed list when its card is closed', async () => {
    const context = useContextStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    fetchBuyers.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })
    fetchRecentBuyers.mockResolvedValue({ items: [buyerCard({ id: 9, name: 'Recently Viewed Buyer' })] })

    const view = mountView()
    await flushPromises()
    expect(view.text()).toContain('Recently Viewed Buyer')

    await view.get('.supplier-card-stub-close').trigger('click')
    await flushPromises()

    expect(deleteRecentBuyer).toHaveBeenCalledWith('v-73', 9)
    expect(view.text()).not.toContain('Recently Viewed Buyer')

    view.unmount()
  })

  it('marks a buyer as recently viewed when its card is opened', async () => {
    const context = useContextStore()
    const modal = useCustomerCardModalStore()
    context.setVersion(73, 'v-73')
    fetchBuyers.mockResolvedValue({ items: [buyerCard({ id: 42, name: 'Acme Corporation' })], page: 1, pageSize: 20, total: 1 })

    const view = mountView()
    await flushPromises()

    await view.get('.supplier-card-stub').trigger('click')
    await flushPromises()

    expect(markBuyerRecent).toHaveBeenCalledWith('v-73', 42)
    expect(modal.versionId).toBe(73)
    expect(modal.buyerId).toBe(42)

    view.unmount()
  })

  it('seeds the modal with the clicked card\'s own full row, so its header shows before any tab has fetched anything', async () => {
    const context = useContextStore()
    const modal = useCustomerCardModalStore()
    context.setBuyersView('card')
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([])
    const clickedBuyer = buyerCard({ id: 9, name: 'Fabrikam Buyer', role: 'Parent' })
    fetchBuyers.mockResolvedValueOnce({
      items: [clickedBuyer],
      page: 1,
      pageSize: 20,
      total: 1,
    })

    const view = mountView()
    await flushPromises()

    await view.get('.supplier-card-stub').trigger('click')

    expect(modal.buyerId).toBe(9)
    // The whole row, not just name/role - so a future header (or any other consumer) can read
    // anything this row carries, not only the two fields it happens to need today.
    expect(modal.initialBuyer).toEqual(clickedBuyer)

    view.unmount()
  })

  // The grid presentation is hidden for now (see the skipped grid tests above) - this covers a
  // path (a click with no seed data to offer) that only the grid ever exercised.
  it.skip('opens the Customer Card modal with no seed when the row came from the grid, which carries no such data', async () => {
    const context = useContextStore()
    const modal = useCustomerCardModalStore()
    context.setVersion(73, 'v-73')
    fetchCompanies.mockResolvedValue([buyer({ id: 42, companyName: 'Acme Corporation' })])

    const view = mountView()
    await flushPromises()

    await view.get('.grid-row').trigger('click')

    expect(modal.initialBuyer).toBeNull()

    view.unmount()
  })
})
