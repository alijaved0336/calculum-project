import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

vi.mock('@ada/design-system', () => ({
  BigNumberTwoCol: {
    props: ['bigNumberTitle', 'bigNumberValue', 'listOfSecondaryItems'],
    template: `<div>
      <span class="main">{{ bigNumberTitle }}: {{ bigNumberValue }}</span>
      <span v-for="item in listOfSecondaryItems" :key="item.title" class="secondary">{{ item.title }}: {{ item.value }}</span>
    </div>`,
  },
}))

import PaymentTermsCard from '@/modules/entityCard/components/opportunity/PaymentTermsCard.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      arEntityCard: {
        opportunity: {
          days: '{count} day | {count} days',
          paymentTerms: {
            title: 'Payment Terms',
            recommended: 'Recommended Term',
            contractual: 'Contractual Term',
            actual: 'Actual Term',
            current: 'Valuation Baseline',
          },
        },
      },
    },
  },
})

function mountCard(props: {
  contractualTerm: number | null
  actualTerm: number | null
  recommendedTerm: number | null
  currentTerm: number | null
}) {
  return mount(PaymentTermsCard, { props, global: { plugins: [i18n] } })
}

describe('PaymentTermsCard', () => {
  it('headlines the recommended term and lists contractual/actual as the comparison (AC-01)', () => {
    const card = mountCard({ contractualTerm: 45, actualTerm: 42, recommendedTerm: 30, currentTerm: 42 })

    expect(card.find('.main').text()).toBe('Recommended Term: 30 days')
    expect(card.text()).toContain('Contractual Term: 45 days')
    expect(card.text()).toContain('Actual Term: 42 days')
  })

  it('renders "—" for a term not yet calculated rather than a broken layout (AC-06)', () => {
    const card = mountCard({ contractualTerm: null, actualTerm: null, recommendedTerm: null, currentTerm: null })

    expect(card.find('.main').text()).toBe('Recommended Term: —')
  })

  /** Found by code review: cashFlowImpact/economicProfitImpact beside this card are computed
   * from currentTerm, which is not always equal to contractualTerm or actualTerm - showing it
   * lets the two panels' numbers reconcile instead of silently disagreeing on the baseline. */
  it('shows the valuation baseline term the cash flow figures beside it are actually computed from', () => {
    const card = mountCard({ contractualTerm: 45, actualTerm: 42, recommendedTerm: 30, currentTerm: 40 })

    expect(card.text()).toContain('Valuation Baseline: 40 days')
  })
})
