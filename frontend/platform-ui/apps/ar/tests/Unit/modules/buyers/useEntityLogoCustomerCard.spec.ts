import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ENTITY_LOGO_CLICK_KEY, type EntityLogoClickHandler } from '@ada/design-system/components/grid/custom-columns/entityLogoClick'
import { useContextStore } from '@/stores/context'
import { useCustomerCardModalStore } from '@/stores/customerCardModal'
import { useEntityLogoCustomerCard } from '@/modules/buyers/composables/useEntityLogoCustomerCard'

const markBuyerRecent = vi.fn()
vi.mock('@/modules/buyers/api/recentBuyers', () => ({
  markBuyerRecent: (...args: unknown[]) => markBuyerRecent(...args),
}))

const VERSION_UUID = '1653c234-9318-4707-a6c3-33f4b427126c'

/** Mounts a provider (what App.vue does) around a child that grabs the injected handler - the same
 * handler EntityLogoColumn calls. */
function mountHandler(): EntityLogoClickHandler {
  let handler: EntityLogoClickHandler | null = null
  const Child = defineComponent({
    setup() {
      handler = inject(ENTITY_LOGO_CLICK_KEY, null)
      return () => null
    },
  })
  mount(defineComponent({
    setup() {
      useEntityLogoCustomerCard()
      return () => h(Child)
    },
  }))
  if (!handler) {
    throw new Error('no handler provided')
  }
  return handler
}

describe('useEntityLogoCustomerCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useContextStore().setVersion(73, VERSION_UUID)
    markBuyerRecent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    markBuyerRecent.mockReset()
  })

  it('opens a party row\'s Customer Card and records it as recently viewed', () => {
    const handler = mountHandler()

    handler({ partyId: 42, name: 'Acme', role: 'COUNTERPARTY' }, 'name')

    const modal = useCustomerCardModalStore()
    expect(modal.versionId).toBe(73)
    expect(modal.buyerId).toBe(42)
    expect(modal.initialBuyer?.name).toBe('Acme')
    expect(markBuyerRecent).toHaveBeenCalledWith(VERSION_UUID, 42)
  })

  it('opens and records the line\'s BUYER for a sale-line row', () => {
    const handler = mountHandler()

    // A sale-line row's partyId is its buyerId (`partyId: buyerId`), named by buyerName.
    handler({ saleLineId: 900, partyId: 42, buyerId: 42, buyerName: 'Acme' }, 'supplierName')

    const modal = useCustomerCardModalStore()
    expect(modal.buyerId).toBe(42)
    expect(modal.initialBuyer?.name).toBe('Acme')
    expect(modal.initialBuyer?.role).toBe('Counterparty')
    expect(markBuyerRecent).toHaveBeenCalledWith(VERSION_UUID, 42)
  })

  it('does nothing for a row without a partyId', () => {
    const handler = mountHandler()

    handler({ saleLineId: 900 }, 'buyerName')

    expect(useCustomerCardModalStore().isOpen).toBe(false)
    expect(markBuyerRecent).not.toHaveBeenCalled()
  })
})
