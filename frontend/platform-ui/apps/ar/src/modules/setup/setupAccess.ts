/**
 * AB#20702: Setup's tab list and access rule. Kept apart from `SetupRouting` (which pulls in the
 * router) so `SetupView` and the sidebar can read them without an import cycle back into the
 * router that registers `SetupView`.
 */
import { ROLE_ADMIN, ROLE_COMPANY_ADMIN } from '@/utils/exportPermission'
import type { SetupTabId } from './composables/useSetupSections'

/** FR-02: the three Setup tabs, in display order; the first is the default. */
export const SETUP_TABS: SetupTabId[] = ['payment-terms', 'client-standard', 'cash-flow']

/** The session roles that open Setup: a super admin, or an admin of the active company. */
const SETUP_ROLES = new Set([ROLE_ADMIN, ROLE_COMPANY_ADMIN])

/**
 * FR-01 / EF-1: Setup is for administrators, as the AR session's effective roles report them
 * (`/api/session/info`). A session that reports no roles shows nothing, never everything. A UI
 * convenience only; the API enforces it per request.
 */
export const hasSetupAccess = (roles: readonly string[] | undefined): boolean =>
  roles?.some((role) => SETUP_ROLES.has(role)) ?? false
