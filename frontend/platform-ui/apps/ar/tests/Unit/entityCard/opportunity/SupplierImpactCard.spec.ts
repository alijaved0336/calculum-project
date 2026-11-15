import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@ada/design-system', () => ({
  BigNumberTwoCol: {
    props: ['bigNumberTitle', 'bigNumberValue', 'listOfSecondaryItems'],
    template: `<div>
      <span class="main">{{ bigNumberTitle }}: {{ bigNumberValue }}</span>
      <span v-for="item in listOfSecondaryItems" :key="item.title" class="secondary">{{ item.title }}: {{ item.value }}</span>
    </div>`,
  },
}))

import SupplierImpactCard from '@/modules/entityCard/components/opportunity/SupplierImpactCard.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      arEntityCard: {
        opportunity: {
          supplierImpact: { title: 'Supplier Impact', cashFlow: 'Cash Flow Opportunity', economicProfit: 'Economic Profit', plImpact: 'P&L Impact' },
        },
      },
    },
  },
})

describe('SupplierImpactCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('headlines Cash Flow Opportunity and lists Economic Profit / P&L Impact (AC-02)', () => {
    const card = mount(SupplierImpactCard, {
      props: { cashFlowImpact: 18_500, economicProfitImpact: 4_200, economicProfitBuyerImpact: 900 },
      global: { plugins: [i18n] },
    })

    expect(card.find('.main').text()).toBe('Cash Flow Opportunity: $18,500')
    expect(card.text()).toContain('Economic Profit: $4,200')
    expect(card.text()).toContain('P&L Impact: $900')
  })

  it('places the symbol after the minus sign for a negative figure, never "$-4,200"', () => {
    const card = mount(SupplierImpactCard, {
      props: { cashFlowImpact: -4_200, economicProfitImpact: -900, economicProfitBuyerImpact: null },
      global: { plugins: [i18n] },
    })

    expect(card.find('.main').text()).toBe('Cash Flow Opportunity: -$4,200')
    expect(card.text()).toContain('Economic Profit: -$900')
  })

  it('renders "—" for P&L Impact, which is always null today (G-372), rather than $0', () => {
    const card = mount(SupplierImpactCard, {
      props: { cashFlowImpact: 18_500, economicProfitImpact: 4_200, economicProfitBuyerImpact: null },
      global: { plugins: [i18n] },
    })

    expect(card.text()).toContain('P&L Impact: —')
  })
})
