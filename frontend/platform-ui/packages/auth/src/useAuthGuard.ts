import type { Router } from 'vue-router'
import { authLogin } from './auth'

/**
 * Installs a global navigation guard that redirects unauthenticated users to
 * the backend login endpoint. The caller provides `checkAuth` — an async
 * function that returns true when a valid session exists.
 *
 * Routes can set `meta.public = true` to bypass the guard.
 */
export function installAuthGuard(
  router: Router,
  checkAuth: () => Promise<boolean>,
  getIdps?: () => string | null | undefined,
): void {
  router.beforeEach(async (to, _from, next) => {
    if (to.meta?.public) {
      next()
      return
    }

    const authenticated = await checkAuth()
    if (!authenticated) {
      await authLogin(getIdps?.())
      return
    }

    next()
  })
}
