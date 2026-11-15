import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

vi.mock('@ada/design-system', () => ({
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CustomTabs: {
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
    template: `
      <div class="tabs">
        <button v-for="item in items" :key="item.id" type="button" :class="'tab-' + item.id" @click="$emit('update:modelValue', item.id)">
          {{ item.label }}
        </button>
      </div>
    `,
  },
}))

// Renamed to OpportunityOverview.vue once the List tab landed alongside this one (see
// tests/Unit/opportunity/opportunityHome.spec.ts's own header comment for why it's stubbed).
vi.mock('@/modules/opportunity/views/OpportunityOverview.vue', () => ({
  default: { name: 'Overview', template: '<div class="overview-stub">Overview</div>' },
}))

vi.mock('@/modules/opportunity/views/NineBoxOverview.vue', () => ({
  default: { name: 'NineBoxOverview', template: '<div class="nine-box-stub">Buyer Prioritization</div>' },
}))

vi.mock('@/modules/opportunity/views/Waterfall.vue', () => ({
  default: { name: 'Waterfall', template: '<div class="waterfall-stub">Waterfall</div>' },
}))

// Pulls in the Apollo client and the grid machinery at import time; this suite only needs the
// other two tabs' switching behaviour, not the list itself.
vi.mock('@/modules/opportunity/components/OverviewList.vue', () => ({
  default: { name: 'OverviewList', template: '<div class="overview-list-stub" />' },
}))

import OpportunityHome from '@/modules/opportunity/views/OpportunityHome.vue'

const messages = {
  en: { arOpportunity: { tabs: { overview: 'Overview', list: 'List', nineBox: 'Buyer Prioritization', waterfall: 'Waterfall' } } },
}

function mountHome() {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(OpportunityHome, { global: { plugins: [i18n] } })
}

/**
 * UC-UI-03 (Waterfall) and UC-UI-04 (Nine-Box) each land as their own tab beside UI-01's
 * Overview, on the same `CustomTabs` + `KeepAlive`/`component :is` switcher `MatchHome.vue`
 * already established for this app.
 */
describe('OpportunityHome', () => {
  it('opens on the Overview tab', () => {
    const view = mountHome()

    expect(view.find('.overview-stub').exists()).toBe(true)
    expect(view.find('.waterfall-stub').exists()).toBe(false)
  })

  it('switches to the Waterfall tab without losing the Overview tab as an option', async () => {
    const view = mountHome()

    await view.find('.tab-Waterfall').trigger('click')

    expect(view.find('.waterfall-stub').exists()).toBe(true)
    expect(view.find('.overview-stub').exists()).toBe(false)
    expect(view.find('.tab-Overview').exists()).toBe(true)
  })

  it('switches to the Nine-Box tab without losing the other tabs as options', async () => {
    const view = mountHome()

    await view.find('.tab-NineBoxOverview').trigger('click')

    expect(view.find('.nine-box-stub').exists()).toBe(true)
    expect(view.find('.overview-stub').exists()).toBe(false)
    expect(view.find('.tab-Overview').exists()).toBe(true)
    expect(view.find('.tab-Waterfall').exists()).toBe(true)
  })
})
