import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchSession = vi.fn()
const authLogin = vi.fn()
vi.mock('@ada/auth', () => ({
  useSession: () => ({
    isAuthenticated: { value: false },
    fetchSession: (...args: unknown[]) => fetchSession(...args),
    session: { value: null },
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
    template: '<input />',
  },
}))

vi.mock('@/components/UserMenu.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/modules/buyers/BuyersRouting', () => ({ buyers: 'Buyers', openBuyers: vi.fn() }))

const fetchSwitchableCompanies = vi.fn()
const fetchCurrencies = vi.fn()
vi.mock('@/api', () => ({
  fetchSwitchableCompanies: (...args: unknown[]) => fetchSwitchableCompanies(...args),
  switchActiveCompany: vi.fn(),
  fetchSaleFilesByCompany: vi.fn(),
  fetchCustomAttributes: vi.fn(),
  fetchCurrencies: (...args: unknown[]) => fetchCurrencies(...args),
}))

import Navbar from '@/components/layout/Navbar.vue'
import { useArCurrenciesStore } from '@/stores/arCurrencies'

/**
 * The currency catalog is a static, session-independent lookup - it must load even on the path
 * where the session check fails and `onMounted` bails out into `authLogin()` before ever reaching
 * `arCurrentUserStore.setUser`/`picker.load()`. Regression for the bug report where an unrelated
 * hiccup earlier in `onMounted` left the currency dropdown's options permanently empty because
 * `loadCurrencies()` used to sit behind that same gate.
 */
describe('Navbar currency catalog independence from the auth/session gate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchSession.mockReset()
    authLogin.mockReset()
    fetchSwitchableCompanies.mockReset()
    fetchCurrencies.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('still loads the currency catalog when the session check fails and the app redirects to sign in', async () => {
    fetchSession.mockResolvedValue(false)
    authLogin.mockResolvedValue(undefined)
    fetchCurrencies.mockResolvedValue([{ code: 'USD', name: 'US Dollar' }])

    const wrapper = mount(Navbar, { global: { mocks: { $t: (key: string) => key } } })
    await flushPromises()

    expect(fetchCurrencies).toHaveBeenCalledTimes(1)
    expect(useArCurrenciesStore().currencies).toEqual([{ code: 'USD', name: 'US Dollar' }])

    wrapper.unmount()
  })
})
