<template>
  <div class="signout">
    <p>Signing out…</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '@ada/auth'
import { useContextStore } from '@/stores/context'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'
import { useLayoutStore } from '@/stores/layout'
import { useCustomAttributesStore } from '@/stores/customAttributes'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { useOverviewChartSelectionStore } from '@/stores/overviewChartSelection'
import { useGridColumnPreferencesStore } from '@/stores/gridColumnPreferences'
import { useCustomerCardModalStore } from '@/stores/customerCardModal'
import { useOpportunityGridLevelStore } from '@/stores/opportunityGridLevel'

/**
 * Where B2C sends the browser back once it has ended its own session, and NOTHING ELSE (UC-ENT-09).
 *
 * <b>It used to start the sign-out as well, and that was the defect.</b> A click routed here, this
 * view called `authLogout()` on mount, the API revoked and redirected to B2C, and B2C returned the
 * browser to this same route — which mounted the view again and called `authLogout()` a second time.
 * By then both cookies were gone, so the API had no `id_token_hint` to send and B2C refused the
 * request with <b>AADB2C90272</b>. Signing out ended on an identity-provider error page, every time.
 *
 * The trigger now lives on the control the user clicks (`UserMenu`), which is how payables has
 * always had it: its `/signout` view cleans up locally and moves on, and its sign-out link navigates
 * to the API directly. One route cannot be both the thing that starts a redirect chain and the place
 * that chain comes back to.
 */
const router = useRouter()

onMounted(async () => {
  const { clearSession } = useSession()
  clearSession()

  // Cleared on the way BACK now rather than on the way out, which is where it was always going to
  // matter: `authLogout` is a document navigation, so nothing in memory survives the trip to B2C
  // anyway. What this covers is the same browser signing in again afterwards without a reload.
  //
  // EVERY app store gets cleared here, not just `context` - several persist to `secureStorage`
  // (overviewChartSelection, gridColumnPreferences, arCurrencies' selectedCurrency) or otherwise
  // hold data scoped to the tenant/session that just ended (arCurrentUser, customAttributes'
  // schema, arCurrencies' FX rate), and any of them left standing is readable by the next sign-in
  // on this same browser. `customerCardModal.close()` is this store's own equivalent of `clear()`
  // (see its own doc) - a modal left open across accounts would reference a version/buyer id that
  // no longer means anything.
  useContextStore().clear()
  useArCurrentUserStore().clear()
  useLayoutStore().clear()
  useCustomAttributesStore().clear()
  useArCurrenciesStore().clear()
  useOverviewChartSelectionStore().clear()
  useGridColumnPreferencesStore().clear()
  useCustomerCardModalStore().close()
  useOpportunityGridLevelStore().clear()

  // Onward, the way payables does it (`Logout.vue` finishes with `Routing.openMain()`). `Main` is
  // behind the auth guard, which finds no session and sends the browser to sign in — so a sign-out
  // ends on the sign-in screen rather than on a page that says "Signing out…" forever.
  //
  // `replace` rather than `push`: this route is a waypoint in a redirect chain, and leaving it in
  // the history means Back lands on it and starts the chain again.
  //
  // The B2C session has already been ended by the time the browser gets here, so the guard's
  // `authLogin()` reaches a real sign-in prompt rather than being answered silently — which is the
  // difference between this and the payables behaviour raised as AB#19487.
  await router.replace({ name: 'Main' })
})
</script>
