import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BuyerCard from '@/modules/buyers/components/BuyerCard.vue'

function mountCard(overrides: Partial<Record<string, unknown>> = {}, extraProps: Partial<Record<string, unknown>> = {}) {
  return mount(BuyerCard, {
    props: {
      buyer: {
        id: 7,
        name: 'Acme Corporation',
        originalName: 'Acme Corp',
        parentName: 'Acme Holdings',
        country: 'USA',
        volume: 777200,
        saleLineCount: 3,
        role: 'Counterparty',
        isSme: false,
        smeSource: null,
        creditRating: 'A',
        creditLimit: 50000,
        actualPaymentTermsAvg: 30,
        ...overrides,
      },
      ...extraProps,
    },
  })
}

describe('BuyerCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the Sales Volume metric with the selected currency\'s symbol (UC-UI-23)', () => {
    const view = mountCard()

    expect(view.text()).toContain('$777.2k')
  })

  it('opens the buyer on click, passing its own full row so a caller can seed a header with it', async () => {
    const view = mountCard()

    await view.find('.buyer-card').trigger('click')

    const emitted = view.emitted('open')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0][0]).toMatchObject({ id: 7, name: 'Acme Corporation' })
  })

  it('renders the name, legal name, parent, and the country/volume/sale-line metrics', () => {
    const view = mountCard()

    expect(view.text()).toContain('Acme Corporation')
    expect(view.text()).toContain('Acme Corp')
    expect(view.text()).toContain('Acme Holdings')
    expect(view.text()).toContain('USA')
    expect(view.text()).toContain('3')
  })

  it('never collapses a card for a buyer with no logo - the initials placeholder always renders (UC-UI-05 A1)', () => {
    const view = mountCard()

    expect(view.get('.supplier-card__logo-fallback').text()).toBe('AC')
  })

  it('shows the PARENT badge only when the buyer\'s own role is Parent', () => {
    const asCounterparty = mountCard({ role: 'Counterparty' })
    expect(asCounterparty.text()).not.toContain('PARENT')

    const asParent = mountCard({ role: 'Parent' })
    expect(asParent.text()).toContain('PARENT')
  })

  it('AB#20490: clamps a negative volume to zero rather than showing a negative Spend Volume', () => {
    const view = mountCard({ volume: -19780 })

    expect(view.text()).not.toContain('-')
    expect(view.text()).toContain('0')
  })

  it('AB#20490: still shows "—" for a null volume, not a clamped zero', () => {
    const view = mountCard({ volume: null })

    expect(view.text()).toContain('—')
  })

  it('shows no close button by default, and emits close with the buyer id when shown and clicked', async () => {
    const withoutClose = mountCard()
    expect(withoutClose.find('.supplier-card__close').exists()).toBe(false)

    const withClose = mountCard({}, { showClose: true })
    await withClose.get('.supplier-card__close').trigger('click')

    expect(withClose.emitted('close')).toEqual([[7]])
    // The close button stops propagation on SupplierCard's own root click - clicking it must not
    // also open the buyer.
    expect(withClose.emitted('open')).toBeUndefined()
  })
})
