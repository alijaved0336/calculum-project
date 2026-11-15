import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BuyerLogo from '@/modules/buyers/components/BuyerLogo.vue'

describe('BuyerLogo', () => {
  it('renders the buyer\'s initials as the neutral placeholder (UC-UI-05 A1)', () => {
    const view = mount(BuyerLogo, { props: { name: 'Acme Corporation' } })

    expect(view.text()).toBe('AC')
  })

  it('never collapses or leaves a hole for a buyer with no name at all', () => {
    const view = mount(BuyerLogo, { props: { name: null } })

    expect(view.find('.buyer-logo').exists()).toBe(true)
    expect(view.text()).toBe('')
  })

  it('carries the full name as a title, for a name too long to show in two letters', () => {
    const view = mount(BuyerLogo, { props: { name: 'Global Retail Group' } })

    expect(view.get('.buyer-logo').attributes('title')).toBe('Global Retail Group')
  })
})
