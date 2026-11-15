/**
 * WI#19918 — the commodity-not-found state of the Supplier Entity Card.
 *
 * Mounts the real controller so the whole resolution path is exercised: Lovelace suggests an
 * HS code, the controller checks it against the platform's own reference list, and only a code
 * that is actually in that list gets selected.
 *
 * Before this story the controller fell back to `hsCodeOptions[0]` whenever the suggestion was
 * absent from the list, so every panel below it went on to analyse an unrelated commodity with
 * nothing on screen saying so. A suggestion that cannot be matched — and a supplier Lovelace
 * returns no code for at all, such as a services supplier — must now leave the selection empty
 * and say so, while still leaving the dropdown reachable for a manual pick.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const { getHsCodeReferences, getEntityCardIndustryCommodity, postLovelaceCommodityHsCode } =
  vi.hoisted(() => ({
    getHsCodeReferences: vi.fn(),
    getEntityCardIndustryCommodity: vi.fn(),
    postLovelaceCommodityHsCode: vi.fn(),
  }))

vi.mock('@/modules/home/entityCard/api', () => ({
  getHsCodeReferences,
  getEntityCardIndustryCommodity,
  postLovelaceCommodityHsCode,
}))

// The three tab bodies each run their own Lovelace flow on mount. Stubbing them keeps this spec
// on the controller's own decision, and lets us assert what `selectedHsCode` they were handed.
vi.mock('@/modules/home/entityCard/views/EntityCardSupplierInsights.vue', () => ({
  default: { props: ['selectedHsCode'], template: '<div class="stub-supplier-insights" />' },
}))
vi.mock('@/modules/home/entityCard/views/EntityCardCategoryInsights.vue', () => ({
  default: { props: ['selectedHsCode'], template: '<div class="stub-category-insights" />' },
}))
vi.mock('@/modules/home/entityCard/views/EntityCardMarketInsights.vue', () => ({
  default: { props: ['selectedHsCode'], template: '<div class="stub-market-insights" />' },
}))

// Nothing here navigates, and the real router pulls the whole route tree (which reaches
// components that evaluate NumberUtils at module scope and blow up on a circular import).
vi.mock('@/services/router', () => ({ default: { push: vi.fn() } }))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

const HS_CODES = [
  { code: '3923.50', description: 'Articles for the conveyance or packing of goods' },
  { code: '8501.10', description: 'Electric motors' },
]

const ENTITY_DETAILS = {
  supplierName: '3A Composites Mobility S.A.',
  supplierCountry: 'Poland',
  supplierCountryAlpha3Code: 'POL',
  buyerName: 'Test Carlos Co',
  buyerCountry: 'Spain',
}

const NOT_FOUND_KEY = 'home.entityCard.supplierInsights.commodityNotFoundMessage'

// Imported once here rather than inside the helper: this module graph takes ~10s to transform,
// and inside the first test that cost lands against the 10s per-test timeout.
const Controller = (
  await import('@/modules/home/entityCard/views/EntityCardSupplierController.vue')
).default

async function mountController(suggestedCode: string | null) {
  getHsCodeReferences.mockResolvedValue({ success: true, data: { 'hydra:member': HS_CODES } })
  getEntityCardIndustryCommodity.mockResolvedValue({
    success: true,
    data: { commodity: 'Plastic closures', industryName: 'Plastics' },
  })
  postLovelaceCommodityHsCode.mockResolvedValue({
    success: true,
    data: { output: { code: suggestedCode } },
  })

  const wrapper = mount(Controller, {
    props: { companyId: 'company-1', entityDetails: ENTITY_DETAILS },
    global: {
      plugins: [i18n],
      mocks: { $t: (key: string) => key },
      stubs: {
        TabStrip: { template: '<div />' },
        Skeleton: { template: '<div />' },
        SearchableDropdown: { template: '<div class="stub-dropdown" />' },
      },
    },
  })

  // onMounted -> fetchHsCodeOptions -> initLovelaceFlow, three awaits deep.
  await new Promise((resolve) => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()

  return wrapper
}

function notFoundBanner(wrapper: any) {
  return wrapper.findAll('.note-banner').filter((banner: any) => banner.text() === NOT_FOUND_KEY)
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('Supplier Entity Card — commodity not found (WI#19918)', () => {
  it('AC-01: selects the suggested commodity when it exists in the reference list', async () => {
    const wrapper = await mountController('3923.50')

    expect((wrapper.vm as any).selectedHsCode).toBe('3923.50')
    expect((wrapper.vm as any).commodityNotFound).toBe(false)
    expect(notFoundBanner(wrapper)).toHaveLength(0)
  })

  it('AC-02: selects nothing and shows the message when the suggestion is not in the list', async () => {
    const wrapper = await mountController('9999.99')

    expect((wrapper.vm as any).selectedHsCode).toBe('')
    expect((wrapper.vm as any).commodityNotFound).toBe(true)
    expect(notFoundBanner(wrapper)).toHaveLength(1)
  })

  it('AC-02: never falls back to the first option in the reference list', async () => {
    const wrapper = await mountController('9999.99')

    // The pre-story bug: hsCodeOptions[0] was selected, so an unrelated commodity was analysed.
    expect((wrapper.vm as any).selectedHsCode).not.toBe(HS_CODES[0].code)
  })

  it('AC-03: shows the same message when Lovelace returns no code at all', async () => {
    const wrapper = await mountController(null)

    expect((wrapper.vm as any).selectedHsCode).toBe('')
    expect((wrapper.vm as any).commodityNotFound).toBe(true)
    expect(notFoundBanner(wrapper)).toHaveLength(1)
  })

  it('AC-03: treats a missing code as not-found, not as a service error', async () => {
    const wrapper = await mountController(null)

    // someErrorInLovelace hides the dropdown and the tab bodies outright, which would leave
    // the user with no way to pick a commodity by hand.
    expect((wrapper.vm as any).someErrorInLovelace).toBe(false)
  })

  it('AC-04/AC-05: leaves the commodity dropdown reachable so the user can pick one', async () => {
    const wrapper = await mountController('9999.99')

    expect(wrapper.find('.stub-dropdown').exists()).toBe(true)
  })

  it('AC-06: hands the panels an empty commodity, so none of them request AI content', async () => {
    const wrapper = await mountController('9999.99')

    // Every panel guards its Lovelace calls on a falsy selectedHsCode, so an empty string is
    // what actually stops a guessed-commodity request from firing.
    expect(wrapper.find('.stub-supplier-insights').attributes('selectedhscode')).toBeUndefined()
    expect((wrapper.vm as any).selectedHsCode).toBeFalsy()
  })

  it('hides the message once a commodity is selected by hand', async () => {
    const wrapper = await mountController('9999.99')
    expect(notFoundBanner(wrapper)).toHaveLength(1)

    ;(wrapper.vm as any).selectedHsCode = '8501.10'
    await wrapper.vm.$nextTick()

    expect(notFoundBanner(wrapper)).toHaveLength(0)
  })
})
