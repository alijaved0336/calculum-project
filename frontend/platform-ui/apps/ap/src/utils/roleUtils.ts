/**
 * General Role Utilities
 * Helper functions for working with all types of roles together
 */

import { ALL_ROLES, type RoleValue } from '@/constants';
import { getUserSessionRoles } from './sessionRoleUtils';
import { getUserModuleRoles } from './moduleRoleUtils';
import { getUserFeatureRoles } from './featureRoleUtils';

/**
 * Check if a user has a specific role (any type)
 * @param userRoles - Array of user roles
 * @param role - The role to check for
 * @returns boolean indicating if the user has the role
 */
export function hasRole(
  userRoles: string[],
  role: RoleValue
): boolean {
  return userRoles.includes(role);
}

/**
 * Get all roles from user roles (typed)
 * @param userRoles - Array of user roles
 * @returns Array of all typed roles the user has
 */
export function getUserRoles(userRoles: string[]): RoleValue[] {
  return userRoles.filter(role => 
    Object.values(ALL_ROLES).includes(role as RoleValue)
  ) as RoleValue[];
}

/**
 * Check if user has any roles at all
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has any roles
 */
export function hasAnyRoles(userRoles: string[]): boolean {
  return getUserRoles(userRoles).length > 0;
}

/**
 * Get a comprehensive summary of all user roles
 * @param userRoles - Array of user roles
 * @returns Object containing all role types the user has
 */
export function getUserRoleSummary(userRoles: string[]) {
  return {
    sessionRoles: getUserSessionRoles(userRoles),
    moduleRoles: getUserModuleRoles(userRoles),
    featureRoles: getUserFeatureRoles(userRoles),
    allRoles: getUserRoles(userRoles),
  };
}

/**
 * Check if user has a minimum set of required roles
 * @param userRoles - Array of user roles
 * @param requiredRoles - Array of required roles
 * @returns boolean indicating if the user has all required roles
 */
export function hasRequiredRoles(userRoles: string[], requiredRoles: RoleValue[]): boolean {
  return requiredRoles.every(role => hasRole(userRoles, role));
}

/**
 * Check if user has at least one role from a set of options
 * @param userRoles - Array of user roles
 * @param optionRoles - Array of option roles
 * @returns boolean indicating if the user has at least one option role
 */
export function hasAnyOfRoles(userRoles: string[], optionRoles: RoleValue[]): boolean {
  return optionRoles.some(role => hasRole(userRoles, role));
}

/**
 * Get role type (session, module, or feature)
 * @param role - The role to check
 * @returns string indicating the role type
 */
export function getRoleType(role: RoleValue): 'session' | 'module' | 'feature' {
  const sessionRoles = getUserSessionRoles([role]);
  if (sessionRoles.length > 0) return 'session';
  
  const moduleRoles = getUserModuleRoles([role]);
  if (moduleRoles.length > 0) return 'module';
  
  return 'feature';
}

/**
 * Check if a role is any valid role
 * @param role - The role string to validate
 * @returns boolean indicating if the role is valid
 */
export function isValidRole(role: string): role is RoleValue {
  return Object.values(ALL_ROLES).includes(role as RoleValue);
}

/**
 * Get roles by type from user roles
 * @param userRoles - Array of user roles
 * @param roleType - The type of roles to get
 * @returns Array of roles of the specified type
 */
export function getRolesByType(userRoles: string[], roleType: 'session' | 'module' | 'feature'): RoleValue[] {
  switch (roleType) {
    case 'session':
      return getUserSessionRoles(userRoles);
    case 'module':
      return getUserModuleRoles(userRoles);
    case 'feature':
      return getUserFeatureRoles(userRoles);
    default:
      return [];
  }
}

/**
 * Check if user has roles from multiple categories
 * @param userRoles - Array of user roles
 * @param categories - Array of role categories to check
 * @returns boolean indicating if the user has roles from all specified categories
 */
export function hasRolesFromCategories(userRoles: string[], categories: ('session' | 'module' | 'feature')[]): boolean {
  return categories.every(category => {
    const rolesOfType = getRolesByType(userRoles, category);
    return rolesOfType.length > 0;
  });
}

/**
 * Get role count by type
 * @param userRoles - Array of user roles
 * @returns Object containing counts for each role type
 */
export function getRoleCountByType(userRoles: string[]) {
  return {
    session: getUserSessionRoles(userRoles).length,
    module: getUserModuleRoles(userRoles).length,
    feature: getUserFeatureRoles(userRoles).length,
    total: getUserRoles(userRoles).length,
  };
}

/**
 * Check if user has a balanced role distribution
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has a balanced role distribution
 */
export function hasBalancedRoleDistribution(userRoles: string[]): boolean {
  const counts = getRoleCountByType(userRoles);
  // Consider balanced if user has at least one role from each major category
  return counts.session > 0 && counts.module > 0 && counts.feature > 0;
}
