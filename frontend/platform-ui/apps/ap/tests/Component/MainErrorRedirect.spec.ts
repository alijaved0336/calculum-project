import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Hoisted: `vi.mock` factories run before the module body, so the spy has to exist by then.
const { openErrorScreen } = vi.hoisted(() => ({ openErrorScreen: vi.fn() }))

vi.mock('@/services/router/Routing', () => ({ auth: { openErrorScreen } }))
vi.mock('@/utils/CookieSessionsFns', () => ({
  getFlowToLogout: vi.fn(),
  getSessionInfo: vi.fn(),
  authLogin: vi.fn(),
}))
vi.mock('@ada/design-system', () => ({ CalculumLoading: { template: '<div />' } }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({}) }))
vi.mock('@/stores/home', () => ({ useHomeStore: () => ({ setGlobalLoading: vi.fn() }) }))

import Main from '@/modules/main/Main.vue'

/**
 * The other way onto the error screen (G-350, AB#19509).
 *
 * `Main.vue` reads B2C's `error` and `error_description` off the query string and hands them to the
 * error screen, so <code>/?error=x&error_description=&lt;chosen text&gt;</code> put chosen words on a
 * real sign-in page without the crafted link ever naming <code>/message/</code> — a URL shaped like a
 * genuine B2C callback, which is the more convincing of the two links to be able to send. Closing
 * the route alone would have left this open.
 */
async function mountWithSearch(search: string) {
  setActivePinia(createPinia())
  vi.stubGlobal('location', { search, href: '/' })

  const wrapper = mount(Main)
  await flushPromises()

  return wrapper
}

describe('Main, arriving with a provider error in the query string', () => {
  beforeEach(() => {
    openErrorScreen.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("forwards B2C's code and none of the prose around it", async () => {
    await mountWithSearch(
      '?error=server_error&error_description=AADB2C90079%3A+Clients+must+send+a+client_secret',
    )

    expect(openErrorScreen).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: 'error', message: 'error-login', errorb2c: 'AADB2C90079' }),
    )
  })

  it('forwards nothing at all when the description is only prose', async () => {
    const hostile = 'Your account is locked, call +1-555-0100 to restore access'

    await mountWithSearch(`?error=x&error_description=${encodeURIComponent(hostile)}`)

    expect(openErrorScreen).toHaveBeenCalledOnce()

    const params = openErrorScreen.mock.calls[0][0]
    expect(JSON.stringify(params)).not.toContain('555-0100')
    expect(params.errorb2c).toBeNull()
  })

  it('falls back to the OAuth error name when there is no description', async () => {
    await mountWithSearch('?error=access_denied')

    expect(openErrorScreen).toHaveBeenCalledWith(
      expect.objectContaining({ errorb2c: 'access_denied' }),
    )
  })
})
