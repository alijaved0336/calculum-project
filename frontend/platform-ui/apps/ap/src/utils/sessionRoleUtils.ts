/**
 * Session Role Utilities
 * Re-exported from @ada/auth — the shared, generic session-role source of truth.
 */
export {
  hasSessionRole,
  hasSuperAdminRole,
  hasCompanyAdminRole,
  hasUserRole,
  hasViewOnlyRole,
  hasDataUserRole,
  hasSalesUserRole,
  hasPartnerUserRole,
  getUserSessionRoles,
  hasAnySessionRoles,
  hasAdminPrivileges,
  hasElevatedPrivileges,
} from '@ada/auth';
