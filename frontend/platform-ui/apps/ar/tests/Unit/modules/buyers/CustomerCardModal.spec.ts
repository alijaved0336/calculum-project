import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_MODAL_WIDTH_PERCENT, useCustomerCardModalStore } from '@/stores/customerCardModal'

vi.mock('@/modules/match/views/CustomerCardView.vue', () => ({
  __esModule: true,
  default: {
    name: 'CustomerCardViewStub',
    props: ['versionId', 'buyerId'],
    template: '<div class="customer-card-view-stub">{{ versionId }}/{{ buyerId }}</div>',
  },
}))

import CustomerCardModal from '@/modules/buyers/components/customerCard/CustomerCardModal.vue'

const messages = {
  en: {
    button: {
      close: 'Close',
    },
  },
}

// CalculumModal renders its overlay/content through <Teleport to="body">, so none of it is a
// descendant of the mounted wrapper's own root element - it lands as a real sibling under jsdom's
// document.body instead. wrapper.find() only searches wrapper.element's own subtree, so every
// query below goes through this body-scoped DOMWrapper instead.
const body = new DOMWrapper(document.body)

let wrapper: ReturnType<typeof mount> | null = null

function mountModal() {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  wrapper = mount(CustomerCardModal, { global: { plugins: [i18n] } })
  return wrapper
}

describe('CustomerCardModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    // Teleport moves its content to the real document.body regardless of this wrapper's own
    // attachment - left un-unmounted, it would leak into whichever test runs next.
    wrapper?.unmount()
    wrapper = null
  })

  it('renders nothing while the modal store has no selection', () => {
    mountModal()

    expect(body.find('.calculum-modal-overlay').exists()).toBe(false)
  })

  it('renders the Customer Card for the open version/buyer once the store opens', async () => {
    const modal = useCustomerCardModalStore()
    modal.open(73, 42)

    mountModal()
    // The real component (`defineAsyncComponent`, so its module resolves the cycle-avoiding way -
    // see CustomerCardModal.vue's own doc) needs a flush, not just a tick, to appear.
    await flushPromises()

    expect(body.get('.customer-card-view-stub').text()).toBe('73/42')
  })

  it('applies the default width when the caller did not ask for a specific one', () => {
    const modal = useCustomerCardModalStore()
    modal.open(73, 42)

    mountModal()

    expect(body.get('.calculum-modal-content').attributes('style')).toContain(
      `width: ${DEFAULT_MODAL_WIDTH_PERCENT}%`,
    )
  })

  it('applies the width the caller asked for', () => {
    const modal = useCustomerCardModalStore()
    modal.open(73, 42, { widthPercent: 60 })

    mountModal()

    expect(body.get('.calculum-modal-content').attributes('style')).toContain('width: 60%')
  })

  it('closes the store when the close button is clicked', async () => {
    const modal = useCustomerCardModalStore()
    modal.open(73, 42)

    mountModal()
    await body.get('.calculum-modal-close').trigger('click')

    expect(modal.isOpen).toBe(false)
  })

  it('closes the store when clicking the overlay backdrop, but not the content itself', async () => {
    const modal = useCustomerCardModalStore()
    modal.open(73, 42)

    mountModal()
    await body.get('.calculum-modal-content').trigger('click')
    expect(modal.isOpen).toBe(true)

    await body.get('.calculum-modal-overlay').trigger('click')
    expect(modal.isOpen).toBe(false)
  })
})
