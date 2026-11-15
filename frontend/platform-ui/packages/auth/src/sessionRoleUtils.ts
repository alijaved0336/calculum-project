/**
 * Session Role Utilities
 * Helper functions for working with session roles (user authentication and basic permissions)
 */

import { SESSION_ROLES, type SessionRoleValue } from './constants/sessionRoles';

/**
 * Check if a user has a specific session role
 * @param userRoles - Array of user roles
 * @param sessionRole - The session role to check for
 * @returns boolean indicating if the user has the session role
 */
export function hasSessionRole(
  userRoles: string[],
  sessionRole: SessionRoleValue
): boolean {
  return userRoles.includes(sessionRole);
}

/**
 * Check if a user has the super admin role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the super admin role
 */
export function hasSuperAdminRole(userRoles: string[]): boolean {
  return hasSessionRole(userRoles, SESSION_ROLES.SUPER_ADMIN);
}

/**
 * Check if a user has the company admin role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the company admin role
 */
export function hasCompanyAdminRole(userRoles: string[]): boolean {
  return hasSessionRole(userRoles, SESSION_ROLES.COMPANY_ADMIN);
}

/**
 * Check if a user has the user role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the user role
 */
export function hasUserRole(userRoles: string[]): boolean {
  return hasSessionRole(userRoles, SESSION_ROLES.USER);
}

/**
 * Check if a user has the view only role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the view only role
 */
export function hasViewOnlyRole(userRoles: string[]): boolean {
  return hasSessionRole(userRoles, SESSION_ROLES.VIEW_ONLY);
}

/**
 * Check if a user has the data user role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the data user role
 */
export function hasDataUserRole(userRoles: string[]): boolean {
  return hasSessionRole(userRoles, SESSION_ROLES.DATA_USER);
}

/**
 * Check if a user has the sales user role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the sales user role
 */
export function hasSalesUserRole(userRoles: string[]): boolean {
  return hasSessionRole(userRoles, SESSION_ROLES.SALES_USER);
}

/**
 * Check if a user has the partner user role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the partner user role
 */
export function hasPartnerUserRole(userRoles: string[]): boolean {
  return hasSessionRole(userRoles, SESSION_ROLES.PARTNER_USER);
}

/**
 * Get all session roles from user roles
 * @param userRoles - Array of user roles
 * @returns Array of session roles the user has
 */
export function getUserSessionRoles(userRoles: string[]): SessionRoleValue[] {
  return userRoles.filter(role =>
    Object.values(SESSION_ROLES).includes(role as SessionRoleValue)
  ) as SessionRoleValue[];
}

/**
 * Check if user has any session roles
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has any session roles
 */
export function hasAnySessionRoles(userRoles: string[]): boolean {
  return getUserSessionRoles(userRoles).length > 0;
}

/**
 * Check if user has admin privileges (super admin or company admin)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has admin privileges
 */
export function hasAdminPrivileges(userRoles: string[]): boolean {
  return hasSuperAdminRole(userRoles) || hasCompanyAdminRole(userRoles);
}

/**
 * Check if user has elevated privileges (any role above basic user)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has elevated privileges
 */
export function hasElevatedPrivileges(userRoles: string[]): boolean {
  return hasSuperAdminRole(userRoles) ||
         hasCompanyAdminRole(userRoles) ||
         hasDataUserRole(userRoles) ||
         hasSalesUserRole(userRoles) ||
         hasPartnerUserRole(userRoles);
}
