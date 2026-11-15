export const ROLE_ADMIN = 'ROLE_ADMIN'
export const ROLE_COMPANY_ADMIN = 'ROLE_COMPANY_ADMIN'
export const ROLE_SALES = 'ROLE_SALES'
export const ROLE_DATA = 'ROLE_DATA'
export const FEATURE_DOWNLOAD_EXCEL = 'FEATURE_DOWNLOAD_EXCEL'
export const FEATURE_DOWNLOAD_EXCEL_MATCH = 'FEATURE_DOWNLOAD_EXCEL_MATCH'

/**
 * Whether the session's effective roles allow an Excel export gated by `feature`. The same rule the
 * server enforces: a super admin always may; otherwise a company admin whose company holds the
 * feature, unless the user is also an internal SALES / DATA user. A UI convenience only.
 * `roles` absent (a backend that does not report them) means no.
 */
export function canExport(roles: readonly string[] | null | undefined, feature: string): boolean {
  if (!roles) {
    return false
  }
  if (roles.includes(ROLE_ADMIN)) {
    return true
  }
  if (roles.includes(ROLE_SALES) || roles.includes(ROLE_DATA)) {
    return false
  }
  return roles.includes(ROLE_COMPANY_ADMIN) && roles.includes(feature)
}
