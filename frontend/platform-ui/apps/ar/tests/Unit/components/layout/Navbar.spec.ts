import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchSession = vi.fn()
const authLogin = vi.fn()
vi.mock('@ada/auth', () => ({
  useSession: () => ({
    isAuthenticated: { value: true },
    fetchSession: (...args: unknown[]) => fetchSession(...args),
    session: { value: { email: 'user@calculum.ai', idps: 'b2c', authenticationSource: 'b2c', sessionExpiresAt: 0 } },
  }),
  authLogin: (...args: unknown[]) => authLogin(...args),
}))

vi.mock('@ada/design-system', () => ({
  SearchableDropdown: {
    props: ['modelValue', 'label', 'items', 'disabled', 'placeholder', 'searchPlaceholder'],
    template: '<div />',
  },
  TextInput: {
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}))

vi.mock('@/components/UserMenu.vue', () => ({ default: { template: '<div />' } }))

// Mocked rather than left real, the same way `BuyersView.spec.ts` mocks `MatchRouting`: the real
// module imports `@/router`, which eagerly imports every route's own view component (MatchHome,
// MatchView, ...) and, transitively, every `@ada/design-system` component any of them use - far
// more than this spec has any reason to also mock just to exercise Navbar's own search-submit
// wiring.
const openBuyers = vi.fn()
vi.mock('@/modules/buyers/BuyersRouting', () => ({
  buyers: 'Buyers',
  openBuyers: (...args: unknown[]) => openBuyers(...args),
}))

const fetchSwitchableCompanies = vi.fn()
const switchActiveCompany = vi.fn()
const fetchSaleFilesByCompany = vi.fn()
const fetchCustomAttributes = vi.fn()
const fetchCurrencies = vi.fn()
const fetchCurrencyConversionRate = vi.fn()
vi.mock('@/api', () => ({
  fetchSwitchableCompanies: (...args: unknown[]) => fetchSwitchableCompanies(...args),
  switchActiveCompany: (...args: unknown[]) => switchActiveCompany(...args),
  fetchSaleFilesByCompany: (...args: unknown[]) => fetchSaleFilesByCompany(...args),
  fetchCustomAttributes: (...args: unknown[]) => fetchCustomAttributes(...args),
  fetchCurrencies: (...args: unknown[]) => fetchCurrencies(...args),
  fetchCurrencyConversionRate: (...args: unknown[]) => fetchCurrencyConversionRate(...args),
}))

import Navbar from '@/components/layout/Navbar.vue'
import { useLayoutStore } from '@/stores/layout'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'

let mounted: ReturnType<typeof mount>[] = []

function mountNavbar() {
  const wrapper = mount(Navbar, { global: { mocks: { $t: (key: string) => key } } })
  mounted.push(wrapper)
  return wrapper
}

/**
 * Regression for thread 129654: `setSessionValidated(true)` moved out of `onMounted` into
 * `loadSpendFiles`, which only runs on the "found an active company" path - every OTHER
 * terminating path of the bootstrap flow must still open the gate, or LayoutView is stuck
 * showing a loading state forever.
 */
describe('Navbar session-validated gate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchSession.mockReset()
    authLogin.mockReset()
    fetchSwitchableCompanies.mockReset()
    switchActiveCompany.mockReset()
    fetchSaleFilesByCompany.mockReset()
    fetchCustomAttributes.mockReset()
    fetchCurrencies.mockReset()
    fetchCurrencies.mockResolvedValue([])
  })

  afterEach(() => {
    for (const wrapper of mounted) {
      wrapper.unmount()
    }
    mounted = []
  })

  it('opens the gate on the happy path (an active company with a version)', async () => {
    fetchSwitchableCompanies.mockResolvedValue({
      companies: [{ uuid: 'c-1', name: 'Contoso' }],
      activeCompanyUuid: 'c-1',
    })
    fetchSaleFilesByCompany.mockResolvedValue([])

    mountNavbar()
    await flushPromises()

    expect(useLayoutStore().isSessionValidated).toBe(true)
  })

  it('still opens the gate when there is no active company to select', async () => {
    fetchSwitchableCompanies.mockResolvedValue({ companies: [], activeCompanyUuid: null })

    mountNavbar()
    await flushPromises()

    expect(useLayoutStore().isSessionValidated).toBe(true)
  })
})

/**
 * Selecting a currency drives its own conversion request (`/api/currency-rate`), which must behave
 * exactly like the company/spend-file switches already do: the session-validated gate closes
 * before the request and reopens after it regardless of outcome (a `finally`, not only the
 * success path), and a failed/refused request must leave both the selection and the rate
 * untouched rather than reverting to a default or partially applying.
 */
describe('Navbar currency selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchSwitchableCompanies.mockResolvedValue({ companies: [], activeCompanyUuid: null })
    fetchCurrencies.mockReset()
    fetchCurrencies.mockResolvedValue([])
    fetchCurrencyConversionRate.mockReset()
  })

  afterEach(() => {
    for (const wrapper of mounted) {
      wrapper.unmount()
    }
    mounted = []
  })

  it('closes the session-validated gate for the request and reopens it on success', async () => {
    fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })
    const view = mountNavbar()
    await flushPromises()
    const layoutStore = useLayoutStore()
    expect(layoutStore.isSessionValidated).toBe(true)

    const selecting = (view.vm as unknown as { selectCurrency(code: string): Promise<void> }).selectCurrency('EUR')
    expect(layoutStore.isSessionValidated).toBe(false)
    await selecting

    expect(layoutStore.isSessionValidated).toBe(true)
    expect(useArCurrenciesStore().selectedCurrency).toBe('EUR')
    expect(useArCurrenciesStore().currency).toBe(0.93225)
  })

  it('reopens the gate even when the conversion request fails, and applies no store change', async () => {
    fetchCurrencyConversionRate.mockRejectedValue(new Error('not found'))
    const view = mountNavbar()
    await flushPromises()
    const layoutStore = useLayoutStore()

    await (view.vm as unknown as { selectCurrency(code: string): Promise<void> }).selectCurrency('EUR')

    expect(layoutStore.isSessionValidated).toBe(true)
    expect(useArCurrenciesStore().selectedCurrency).toBe('USD')
    expect(useArCurrenciesStore().currency).toBe(1)
  })
})

/**
 * The label above the Sales File dropdown carries the selected version's covered period,
 * matching AP's own "MM/DD/YYYY - MM/DD/YYYY" label above its Spend File dropdown.
 */
describe('Navbar sale-file date range label', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchCustomAttributes.mockReset()
    fetchCustomAttributes.mockResolvedValue(undefined)
    fetchCurrencies.mockReset()
    fetchCurrencies.mockResolvedValue([])
  })

  afterEach(() => {
    for (const wrapper of mounted) {
      wrapper.unmount()
    }
    mounted = []
  })

  it('shows the selected version\'s period as MM/DD/YYYY - MM/DD/YYYY', async () => {
    fetchSwitchableCompanies.mockResolvedValue({
      companies: [{ uuid: 'c-1', name: 'Contoso' }],
      activeCompanyUuid: 'c-1',
    })
    fetchSaleFilesByCompany.mockResolvedValue([
      {
        id: 1,
        uuid: 'v-1',
        version: 1,
        saleFileId: 10,
        saleFileUuid: 'sf-1',
        saleFileName: 'Contoso Sales',
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-12-31',
      },
    ])

    const view = mountNavbar()
    await flushPromises()

    expect(view.get('label.label-topbar').text()).toContain('01/01/2024 - 12/31/2024')
  })

  it('shows no date range when the selected version has none', async () => {
    fetchSwitchableCompanies.mockResolvedValue({
      companies: [{ uuid: 'c-1', name: 'Contoso' }],
      activeCompanyUuid: 'c-1',
    })
    fetchSaleFilesByCompany.mockResolvedValue([
      {
        id: 1,
        uuid: 'v-1',
        version: 1,
        saleFileId: 10,
        saleFileUuid: 'sf-1',
        saleFileName: 'Contoso Sales',
        periodStartDate: null,
        periodEndDate: null,
      },
    ])

    const view = mountNavbar()
    await flushPromises()

    expect(view.get('label.label-topbar').findAll('span')).toHaveLength(1)
  })
})

describe('Navbar buyer search (UC-UI-05)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchSwitchableCompanies.mockResolvedValue({ companies: [], activeCompanyUuid: null })
    openBuyers.mockReset()
    fetchCurrencies.mockReset()
    fetchCurrencies.mockResolvedValue([])
  })

  afterEach(() => {
    for (const wrapper of mounted) {
      wrapper.unmount()
    }
    mounted = []
  })

  it('submits the typed term to /buyers, card view, on Enter', async () => {
    const context = useContextStore()
    context.setBuyersView('grid')

    const view = mountNavbar()
    await flushPromises()

    await view.get('input').setValue('acme')
    await view.get('.buyer-search').trigger('keydown', { key: 'Enter' })

    expect(context.buyersSearchQuery).toBe('acme')
    expect(context.buyersView).toBe('card')
    expect(openBuyers).toHaveBeenCalledTimes(1)
  })

  it('bumps the search nonce again on a second Enter with the same term, so an already-open /buyers re-runs its search', async () => {
    const context = useContextStore()

    const view = mountNavbar()
    await flushPromises()

    await view.get('input').setValue('acme')
    await view.get('.buyer-search').trigger('keydown', { key: 'Enter' })
    const firstNonce = context.buyersSearchNonce

    await view.get('.buyer-search').trigger('keydown', { key: 'Enter' })

    expect(context.buyersSearchNonce).toBe(firstNonce + 1)
    expect(openBuyers).toHaveBeenCalledTimes(2)
  })

  it('still submits (an empty term) on Enter with an empty search box, rather than being a no-op', async () => {
    const context = useContextStore()

    const view = mountNavbar()
    await flushPromises()

    await view.get('.buyer-search').trigger('keydown', { key: 'Enter' })

    expect(context.buyersSearchQuery).toBe('')
    expect(context.buyersView).toBe('card')
    expect(openBuyers).toHaveBeenCalledTimes(1)
  })

  it('re-submits (and re-fetches) an emptied search box on Enter, after a prior term was searched', async () => {
    const context = useContextStore()

    const view = mountNavbar()
    await flushPromises()

    await view.get('input').setValue('acme')
    await view.get('.buyer-search').trigger('keydown', { key: 'Enter' })
    const nonceAfterSearch = context.buyersSearchNonce

    await view.get('input').setValue('')
    await view.get('.buyer-search').trigger('keydown', { key: 'Enter' })

    expect(context.buyersSearchQuery).toBe('')
    expect(context.buyersSearchNonce).toBe(nonceAfterSearch + 1)
    expect(openBuyers).toHaveBeenCalledTimes(2)
  })

  it('clears the store search term and bumps the nonce when the clear button is clicked, so an already-open /buyers re-runs its search unfiltered', async () => {
    const context = useContextStore()

    const view = mountNavbar()
    await flushPromises()

    await view.get('input').setValue('acme')
    await view.get('.buyer-search').trigger('keydown', { key: 'Enter' })
    const nonceAfterSearch = context.buyersSearchNonce

    await view.get('.buyer-search-clear').trigger('click')

    expect(context.buyersSearchQuery).toBe('')
    expect(context.buyersSearchNonce).toBe(nonceAfterSearch + 1)
  })
})
