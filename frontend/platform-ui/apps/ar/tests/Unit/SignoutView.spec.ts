import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authLogout = vi.fn()
const clearSession = vi.fn()

vi.mock('@ada/auth', () => ({
  authLogout: (...args: unknown[]) => authLogout(...args),
  useSession: () => ({ clearSession }),
}))

const clearContext = vi.fn()
vi.mock('@/stores/context', () => ({
  useContextStore: () => ({ clear: clearContext }),
}))

const clearArCurrentUser = vi.fn()
vi.mock('@/stores/arCurrentUser', () => ({
  useArCurrentUserStore: () => ({ clear: clearArCurrentUser }),
}))

const clearLayout = vi.fn()
vi.mock('@/stores/layout', () => ({
  useLayoutStore: () => ({ clear: clearLayout }),
}))

const clearCustomAttributes = vi.fn()
vi.mock('@/stores/customAttributes', () => ({
  useCustomAttributesStore: () => ({ clear: clearCustomAttributes }),
}))

const clearArCurrencies = vi.fn()
vi.mock('@/stores/arCurrencies', () => ({
  useArCurrenciesStore: () => ({ clear: clearArCurrencies }),
}))

const clearOverviewChartSelection = vi.fn()
vi.mock('@/stores/overviewChartSelection', () => ({
  useOverviewChartSelectionStore: () => ({ clear: clearOverviewChartSelection }),
}))

const clearGridColumnPreferences = vi.fn()
vi.mock('@/stores/gridColumnPreferences', () => ({
  useGridColumnPreferencesStore: () => ({ clear: clearGridColumnPreferences }),
}))

const closeCustomerCardModal = vi.fn()
vi.mock('@/stores/customerCardModal', () => ({
  useCustomerCardModalStore: () => ({ close: closeCustomerCardModal }),
}))

const clearOpportunityGridLevel = vi.fn()
vi.mock('@/stores/opportunityGridLevel', () => ({
  useOpportunityGridLevelStore: () => ({ clear: clearOpportunityGridLevel }),
}))

const replace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
}))

import SignoutView from '@/views/SignoutView.vue'

/**
 * UC-ENT-09's landing page, and the regression that earns it a test of its own.
 *
 * `/signout` is the `post_logout_redirect_uri` B2C sends the browser back to. It also used to START
 * the sign-out, on mount — so B2C returned the browser to the route that immediately sent it back
 * to B2C, the second time with no cookies left to build an `id_token_hint` from. B2C answered
 * **AADB2C90272** and signing out ended on an identity-provider error page.
 *
 * The assertion that matters is a negative one, which is unusual enough to say why it is worth
 * having: nothing in the suite would notice the call coming back, and it came back once already.
 */
describe('SignoutView', () => {
  beforeEach(() => {
    authLogout.mockReset()
    clearSession.mockReset()
    clearContext.mockReset()
    clearArCurrentUser.mockReset()
    clearLayout.mockReset()
    clearCustomAttributes.mockReset()
    clearArCurrencies.mockReset()
    clearOverviewChartSelection.mockReset()
    clearGridColumnPreferences.mockReset()
    closeCustomerCardModal.mockReset()
    clearOpportunityGridLevel.mockReset()
    replace.mockReset()
  })

  it('does not start a sign-out, because this is where one ends', async () => {
    mount(SignoutView)
    await flushPromises()

    expect(authLogout).not.toHaveBeenCalled()
  })

  /**
   * Every AR store gets cleared here, not just `context` - several persist to `secureStorage`
   * (overviewChartSelection, gridColumnPreferences, arCurrencies) or otherwise hold data scoped
   * to the session that just ended, and any of them left standing is readable by the next sign-in
   * on this same browser.
   */
  it('clears what the next sign-in on this browser would otherwise inherit', async () => {
    mount(SignoutView)
    await flushPromises()

    // The session ref and the active company, both in memory. A document navigation would have
    // taken them anyway; what this covers is the same browser signing in again without a reload.
    expect(clearSession).toHaveBeenCalledOnce()
    expect(clearContext).toHaveBeenCalledOnce()

    // Every other AR store, including the ones that persist across a reload.
    expect(clearArCurrentUser).toHaveBeenCalledOnce()
    expect(clearLayout).toHaveBeenCalledOnce()
    expect(clearCustomAttributes).toHaveBeenCalledOnce()
    expect(clearArCurrencies).toHaveBeenCalledOnce()
    expect(clearOverviewChartSelection).toHaveBeenCalledOnce()
    expect(clearGridColumnPreferences).toHaveBeenCalledOnce()
    // Its own equivalent of `clear()` - see the store's own doc: closing it resets every field.
    expect(closeCustomerCardModal).toHaveBeenCalledOnce()
    expect(clearOpportunityGridLevel).toHaveBeenCalledOnce()
  })

  it('moves on to the guarded route rather than sitting on "Signing out…" forever', async () => {
    mount(SignoutView)
    await flushPromises()

    // Payables finishes its own sign-out view the same way (`Routing.openMain()`): `Main` is behind
    // the auth guard, which finds no session and sends the browser to sign in.
    expect(replace).toHaveBeenCalledWith({ name: 'Main' })

    // `replace`, never `push`: this route is a waypoint in a redirect chain, and leaving it in the
    // history means Back lands on it and starts the chain again.
    expect(replace).toHaveBeenCalledOnce()
  })
})
