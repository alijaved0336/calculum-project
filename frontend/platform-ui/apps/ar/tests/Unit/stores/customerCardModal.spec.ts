import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  DEFAULT_MODAL_WIDTH_PERCENT,
  useCustomerCardModalStore,
  type CustomerCardIdentity,
} from '@/stores/customerCardModal'

function buyerIdentity(overrides: Partial<CustomerCardIdentity> = {}): CustomerCardIdentity {
  return {
    id: 42,
    role: 'Counterparty',
    resolution: 'Resolved',
    lifecycle: 'Actual',
    name: 'Fabrikam Buyer',
    originalName: null,
    url: null,
    volume: null,
    forecastVolume: null,
    negotiationStatus: null,
    negotiationStatusCode: null,
    parentId: null,
    parentName: null,
    saleLineCount: 0,
    country: null,
    countryFlagUrl: null,
    industry: null,
    isSme: null,
    smeSource: null,
    isPilot: false,
    creditLimit: null,
    creditRating: null,
    actualPaymentTermsAvg: null,
    contractualPaymentTermsWithCashDiscountsAvg: null,
    contractualPaymentTermsWithoutCashDiscountsAvg: null,
    ...overrides,
  }
}

describe('the AR Customer Card modal store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is closed until a caller opens it', () => {
    const store = useCustomerCardModalStore()

    expect(store.isOpen).toBe(false)
    expect(store.versionId).toBeNull()
    expect(store.buyerId).toBeNull()
  })

  it('opens with the given version and buyer ids', () => {
    const store = useCustomerCardModalStore()

    store.open(73, 42)

    expect(store.isOpen).toBe(true)
    expect(store.versionId).toBe(73)
    expect(store.buyerId).toBe(42)
  })

  it('closes back to no selection', () => {
    const store = useCustomerCardModalStore()
    store.open(73, 42)

    store.close()

    expect(store.isOpen).toBe(false)
    expect(store.versionId).toBeNull()
    expect(store.buyerId).toBeNull()
  })

  it('opening again with a different buyer replaces the previous selection', () => {
    const store = useCustomerCardModalStore()
    store.open(73, 42)

    store.open(73, 99)

    expect(store.buyerId).toBe(99)
  })

  it('defaults to the standard width when a caller does not ask for a specific one', () => {
    const store = useCustomerCardModalStore()

    store.open(73, 42)

    expect(store.widthPercent).toBe(DEFAULT_MODAL_WIDTH_PERCENT)
  })

  it('uses the width a caller asks for', () => {
    const store = useCustomerCardModalStore()

    store.open(73, 42, { widthPercent: 60 })

    expect(store.widthPercent).toBe(60)
  })

  it('clamps an out-of-range width instead of producing an invisible or overflowing modal', () => {
    const store = useCustomerCardModalStore()

    store.open(73, 42, { widthPercent: 0 })
    expect(store.widthPercent).toBe(1)

    store.open(73, 42, { widthPercent: 250 })
    expect(store.widthPercent).toBe(100)
  })

  it('resets the width back to the default on close, so a narrow caller does not leak into the next one', () => {
    const store = useCustomerCardModalStore()
    store.open(73, 42, { widthPercent: 60 })

    store.close()

    expect(store.widthPercent).toBe(DEFAULT_MODAL_WIDTH_PERCENT)
  })

  it('has no seed until a caller provides one', () => {
    const store = useCustomerCardModalStore()

    store.open(73, 42)

    expect(store.initialBuyer).toBeNull()
  })

  it('holds the caller\'s full buyer row, not just a trimmed-down copy of it', () => {
    const store = useCustomerCardModalStore()
    const identity = buyerIdentity({ name: 'Fabrikam Buyer', role: 'Parent', volume: 10468.787052 })

    store.open(73, 42, { initialBuyer: identity })

    expect(store.initialBuyer).toEqual(identity)
  })

  it('clears the seed on close, so a later caller with no seed of its own does not inherit one', () => {
    const store = useCustomerCardModalStore()
    store.open(73, 42, { initialBuyer: buyerIdentity() })

    store.close()

    expect(store.initialBuyer).toBeNull()
  })
})
