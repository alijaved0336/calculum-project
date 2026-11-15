import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

vi.mock('@ada/design-system', () => ({
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CustomTabs: {
    name: 'CustomTabs',
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="tabs" :data-active="modelValue" :data-tabs="items.map((i) => i.label).join()" />',
  },
}))

// The Overview child is the whole screen and has its own suite; here it only needs to be present.
vi.mock('@/modules/opportunity/views/OpportunityOverview.vue', () => ({
  default: { name: 'Overview', template: '<div class="overview-stub" />' },
}))

// The list pulls in the Apollo client and the grid machinery at import time; the home only needs
// to prove the List tab renders it.
vi.mock('@/modules/opportunity/components/OverviewList.vue', () => ({
  default: { name: 'OverviewList', template: '<div class="overview-list-stub" />' },
}))

// Waterfall (master's own tab, merged alongside List) has its own suite; here it only needs to
// be present, same treatment as Overview above.
vi.mock('@/modules/opportunity/views/Waterfall.vue', () => ({
  default: { name: 'Waterfall', template: '<div class="waterfall-stub" />' },
}))

// Nine-Box (master's own tab too, merged alongside List and Waterfall) has its own suite; here it
// only needs to be present, same treatment as Waterfall above.
vi.mock('@/modules/opportunity/views/NineBoxOverview.vue', () => ({
  default: { name: 'NineBoxOverview', template: '<div class="nine-box-stub" />' },
}))

import OpportunityHome from '@/modules/opportunity/views/OpportunityHome.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: { arOpportunity: { tabs: { overview: 'Overview', list: 'List', nineBox: 'Nine-Box', waterfall: 'Waterfall' } } },
  },
})

describe('OpportunityHome', () => {
  it('offers the four section tabs and starts on Overview', () => {
    const wrapper = mount(OpportunityHome, { global: { plugins: [i18n] } })

    // Same order as AP's own HomeOpportunity.vue tab strip - see OpportunityHome.vue's own comment.
    expect(wrapper.find('.tabs').attributes('data-tabs')).toBe('Overview,Nine-Box,Waterfall,List')
    expect(wrapper.find('.tabs').attributes('data-active')).toBe('Overview')
    expect(wrapper.find('.overview-stub').exists()).toBe(true)
  })

  it('switches to the List tab, which carries the three-level list', async () => {
    const wrapper = mount(OpportunityHome, { global: { plugins: [i18n] } })

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'OpportunityList')

    expect(wrapper.find('.overview-stub').exists()).toBe(false)
    expect(wrapper.find('.overview-list-stub').exists()).toBe(true)
  })
})
