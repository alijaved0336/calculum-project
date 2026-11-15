import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { TooltipButton } from '@ada/design-system'
import BuyerCreditRating from '@/modules/buyers/components/BuyerCreditRating.vue'

const CREDIT_RATING_DISCLAIMER =
  "Credit rating is estimated from the parent company's profile and is not an independent assessment of this entity."

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      arBuyers: { table: { tooltips: { creditRatingDisclaimer: CREDIT_RATING_DISCLAIMER } } },
    },
  },
})

function mountRating(rating: string | null) {
  return mount(BuyerCreditRating, { props: { rating }, global: { plugins: [i18n] } })
}

describe('BuyerCreditRating', () => {
  it('shows the rating as a badge when the strategy chain has produced one', () => {
    const view = mountRating('A')

    expect(view.text()).toBe('A')
  })

  it('falls back to an em-dash, matching every other "not available" value on this screen', () => {
    const view = mountRating(null)

    expect(view.text()).toBe('—')
  })

  it('carries the credit-rating disclaimer alongside the badge (UC-UI-21 FR-1)', () => {
    const view = mountRating('A')

    expect(view.findComponent(TooltipButton).props('text')).toBe(CREDIT_RATING_DISCLAIMER)
  })

  it('renders no disclaimer when there is no rating to caveat (UC-UI-21 AF-1)', () => {
    const view = mountRating(null)

    expect(view.findComponent(TooltipButton).exists()).toBe(false)
  })
})
