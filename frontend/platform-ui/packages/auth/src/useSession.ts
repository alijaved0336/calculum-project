import { ref, readonly } from 'vue'
import { getAuthBaseUrl } from './auth'

export interface AuthSessionInfo {
  email: string
  idps: string
  authenticationSource: string

  /**
   * Unix time in **seconds**, not milliseconds.
   *
   * The AR API emits seconds, which is what the payables backend has always emitted; a development
   * stub in the AR API used to emit milliseconds and was corrected when the real endpoint shipped
   * (gap G-48 in Ada-Platform). Worth stating on the type because the two are indistinguishable at
   * a glance and a keep-alive reading the wrong one renews either constantly or never.
   */
  sessionExpiresAt: number

  /**
   * The application modules the caller holds at their active company, unprefixed and lowercase —
   * `['buyers', 'match', 'opportunity', 'setup']`.
   *
   * **Optional on purpose.** This package is shared with payables, whose `/api/session/info` does
   * not return the field, so a required property would break another team's application at compile
   * time for a value it never sends. Read it as "absent means this backend does not report
   * modules", never as "the caller holds none": hiding navigation on an absent field would blank
   * the menu for every payables user.
   *
   * Supplied by the AR API since UC-ENT-15. It is a convenience for the UI — showing only what the
   * caller can reach instead of offering a link into a 403 — and **not** an authorization decision.
   * Entitlement is enforced per request on the server, which is what makes a revocation take effect
   * on the next call rather than at the next sign-in.
   */
  modules?: string[]

  /**
   * The receivables company this session is scoped to, or absent on a backend that does not report
   * one.
   *
   * **Optional for the same reason `modules` is**: payables shares this package and its
   * `/api/session/info` does not send the field. Absent means "this backend does not report an
   * active company", never "the caller has none".
   *
   * Supplied by the AR API since UC-ENT-19, and it exists because a receivables user can now hold
   * more than one company and move between them. The company picker preselects this rather than a
   * uuid the browser remembered: the two could not disagree while a user had one company, and with
   * two the disagreement is invisible — the control renders one company while every request is
   * scoped to another. It reports; the session is what decides, and every request is scoped on the
   * server.
   */
  activeCompanyUuid?: string

  /**
   * The caller's effective roles for the active company, sorted and deduplicated: membership roles
   * (`ROLE_COMPANY_ADMIN`), the user's own internal roles (`ROLE_SALES`, `ROLE_DATA`), the company's
   * keys (`MODULE_*`, `FEATURE_*`), `ROLE_USER`, and `ROLE_ADMIN` for a super admin.
   *
   * Optional because not every session reports it (the payables session does not). Consumers must
   * fail closed: absent is read as no roles, which is what the AR store does for the export
   * visibility. A UI convenience only; the server enforces permissions on every request.
   */
  roles?: string[]
}

const session = ref<AuthSessionInfo | null>(null)
const isAuthenticated = ref(false)
const isLoading = ref(false)

/**
 * Core session reader shared across apps: validates the backend's
 * HttpOnly auth-session cookie via GET /api/session/info and exposes
 * the resulting AuthSession info reactively. No module/feature roles here —
 * those are app-specific and layered on top by each app.
 */
export function useSession() {
  async function fetchSession(): Promise<boolean> {
    isLoading.value = true
    try {
      const response = await fetch(`${getAuthBaseUrl()}/api/session/info`, {
        credentials: 'include',
      })
      if (!response.ok) {
        session.value = null
        isAuthenticated.value = false
        return false
      }
      session.value = await response.json()
      isAuthenticated.value = true
      return true
    } catch {
      session.value = null
      isAuthenticated.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  function clearSession(): void {
    session.value = null
    isAuthenticated.value = false
  }

  return {
    session: readonly(session),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    fetchSession,
    clearSession,
  }
}
