import type { NavigationGuard } from 'vue-router'
import { useSession, authLogin } from '@ada/auth'

/**
 * Re-validates the session against the backend on every entry to a guarded route.
 * Navbar's onMounted check only runs once per app load (it doesn't remount when
 * navigating between dashboard/match), so this is what catches a session that
 * expires while the SPA stays open — hence the fresh `fetchSession()` call
 * instead of trusting the cached `isAuthenticated` ref.
 */
export const requireActiveSession: NavigationGuard = async (_to, _from, next) => {
  const { fetchSession } = useSession()

  if (await fetchSession()) {
    next()
    return
  }

  await authLogin()
}
