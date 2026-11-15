import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

// The session the server reports. Per company: the export permissions are resolved for the
// session's ACTIVE company, so a switch changes them.
const COMPANY_A_SESSION = {
  email: 'user@calculum.ai', idps: 'b2c', authenticationSource: 'b2c', sessionExpiresAt: 0,
  roles: ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'FEATURE_DOWNLOAD_EXCEL'],
}
const COMPANY_B_SESSION = { ...COMPANY_A_SESSION, roles: ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'FEATURE_DOWNLOAD_EXCEL_MATCH'] }

const session = ref<Record<string, unknown> | null>(null)
const fetchSession = vi.fn()
vi.mock('@ada/auth', () => ({
  useSession: () => ({
    isAuthenticated: { value: true },
    fetchSession: (...args: unknown[]) => fetchSession(...args),
    session,
  }),
  authLogin: vi.fn(),
}))

// The transport is the boundary: the real `@/api` functions run and end here.
const get = vi.fn()
const put = vi.fn()
vi.mock('@/api/http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  get: (...args: unknown[]) => get(...args),
  put: (...args: unknown[]) => put(...args),
}))

vi.mock('@/components/UserMenu.vue', () => ({ default: { template: '<div />' } }))
// Same reason Navbar.spec.ts gives: the real module imports `@/router` and every route's view.
vi.mock('@/modules/buyers/BuyersRouting', () => ({ buyers: 'Buyers', openBuyers: vi.fn() }))

import Navbar from '@/components/layout/Navbar.vue'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'

const stubs = {
  SearchableDropdown: {
    name: 'SearchableDropdown',
    props: ['modelValue', 'label', 'items', 'disabled', 'placeholder', 'searchPlaceholder'],
    emits: ['update:modelValue'],
    template: '<div />',
  },
  TextInput: { props: ['modelValue', 'placeholder'], template: '<input />' },
}

function answerRoutes(path: string) {
  if (path === '/api/session/companies') {
    return Promise.resolve({
      companies: [{ uuid: 'c-a', name: 'Company A' }, { uuid: 'c-b', name: 'Company B' }],
      activeCompanyUuid: 'c-a',
    })
  }
  if (path.endsWith('/sale-file-versions')) {
    return Promise.resolve({ versions: [], nextCursor: null })
  }
  return Promise.resolve([])
}

let mounted: ReturnType<typeof mount>[] = []

async function mountNavbar() {
  const wrapper = mount(Navbar, { global: { stubs, mocks: { $t: (key: string) => key } } })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

async function switchTo(wrapper: Awaited<ReturnType<typeof mountNavbar>>, uuid: string) {
  wrapper.findAllComponents({ name: 'SearchableDropdown' })[0].vm.$emit('update:modelValue', uuid)
  await flushPromises()
}

const saleFilesCallOrder = (companyUuid: string) =>
  get.mock.invocationCallOrder[
    get.mock.calls.findIndex(([path]) => path === `/api/companies/${companyUuid}/sale-file-versions`)
  ]

describe('Navbar company switch re-reads the session', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    session.value = { ...COMPANY_A_SESSION }
    get.mockReset().mockImplementation(answerRoutes)
    put.mockReset().mockResolvedValue(undefined)
    fetchSession.mockReset().mockImplementation(async () => {
      session.value = { ...COMPANY_B_SESSION }
      return true
    })
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('takes the new company\'s export permissions before the screen reloads for it', async () => {
    const wrapper = await mountNavbar()
    const user = useArCurrentUserStore()
    expect(fetchSession).not.toHaveBeenCalled() // the mount reads the already-validated session
    expect(user.canExportLists).toBe(true)
    expect(user.canExportMatch).toBe(false)

    await switchTo(wrapper, 'c-b')

    expect(put).toHaveBeenCalledWith('/api/session/active-company', { companyUuid: 'c-b' })
    expect(fetchSession).toHaveBeenCalledOnce()
    expect(user.canExportLists).toBe(false)
    expect(user.canExportMatch).toBe(true)
    // Re-read after the switch landed and before the new company's data was fetched.
    expect(fetchSession.mock.invocationCallOrder[0]).toBeGreaterThan(put.mock.invocationCallOrder[0])
    expect(fetchSession.mock.invocationCallOrder[0]).toBeLessThan(saleFilesCallOrder('c-b'))
  })

  it('keeps the current user, and still reloads, when the re-read fails', async () => {
    fetchSession.mockImplementation(async () => {
      session.value = null
      return false
    })
    const wrapper = await mountNavbar()

    await switchTo(wrapper, 'c-b')

    expect(useArCurrentUserStore().user).toMatchObject(COMPANY_A_SESSION)
    expect(saleFilesCallOrder('c-b')).toBeDefined()
  })

  it('does not re-read the session when the server refuses the switch', async () => {
    put.mockRejectedValue(Object.assign(new Error('refused'), { status: 403 }))
    const wrapper = await mountNavbar()

    await switchTo(wrapper, 'c-b')

    expect(fetchSession).not.toHaveBeenCalled()
    expect(useArCurrentUserStore().canExportLists).toBe(true)
  })
})
