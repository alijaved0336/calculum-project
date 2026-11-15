/**
 * Module Role Utilities
 * Helper functions for working with module roles (access to specific application modules)
 */

import { MODULE_ROLES, type ModuleRoleValue } from '@/constants';

/**
 * Check if a user has a specific module role
 * @param userRoles - Array of user roles
 * @param moduleRole - The module role to check for
 * @returns boolean indicating if the user has the module role
 */
export function hasModuleRole(
  userRoles: string[],
  moduleRole: ModuleRoleValue
): boolean {
  return userRoles.includes(moduleRole);
}

/**
 * Check if a user has the analyze module role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the analyze module role
 */
export function hasAnalyzeModuleRole(userRoles: string[]): boolean {
  return hasModuleRole(userRoles, MODULE_ROLES.ANALYZE);
}

/**
 * Check if a user has the compare module role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the compare module role
 */
export function hasCompareModuleRole(userRoles: string[]): boolean {
  return hasModuleRole(userRoles, MODULE_ROLES.COMPARE);
}

/**
 * Check if a user has the manage module role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the manage module role
 */
export function hasManageModuleRole(userRoles: string[]): boolean {
  return hasModuleRole(userRoles, MODULE_ROLES.MANAGE);
}

/**
 * Check if a user has the match module role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the match module role
 */
export function hasMatchModuleRole(userRoles: string[]): boolean {
  return hasModuleRole(userRoles, MODULE_ROLES.MATCH);
}

/**
 * Check if a user has the opportunity module role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the opportunity module role
 */
export function hasOpportunityModuleRole(userRoles: string[]): boolean {
  return hasModuleRole(userRoles, MODULE_ROLES.OPPORTUNITY);
}

/**
 * Check if a user has the plan module role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the plan module role
 */
export function hasPlanModuleRole(userRoles: string[]): boolean {
  return hasModuleRole(userRoles, MODULE_ROLES.PLAN);
}

/**
 * Check if a user has the suppliers module role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the suppliers module role
 */
export function hasSuppliersModuleRole(userRoles: string[]): boolean {
  return hasModuleRole(userRoles, MODULE_ROLES.SUPPLIERS);
}

/**
 * Get all module roles from user roles
 * @param userRoles - Array of user roles
 * @returns Array of module roles the user has
 */
export function getUserModuleRoles(userRoles: string[]): ModuleRoleValue[] {
  return userRoles.filter(role => 
    Object.values(MODULE_ROLES).includes(role as ModuleRoleValue)
  ) as ModuleRoleValue[];
}

/**
 * Check if user has any module roles
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has any module roles
 */
export function hasAnyModuleRoles(userRoles: string[]): boolean {
  return getUserModuleRoles(userRoles).length > 0;
}

/**
 * Check if user has access to core modules (analyze, manage, plan)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has access to core modules
 */
export function hasCoreModuleAccess(userRoles: string[]): boolean {
  return hasAnalyzeModuleRole(userRoles) || 
         hasManageModuleRole(userRoles) || 
         hasPlanModuleRole(userRoles);
}

/**
 * Check if user has access to advanced modules (compare, match, opportunity)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has access to advanced modules
 */
export function hasAdvancedModuleAccess(userRoles: string[]): boolean {
  return hasCompareModuleRole(userRoles) || 
         hasMatchModuleRole(userRoles) || 
         hasOpportunityModuleRole(userRoles);
}

/**
 * Check if user has access to supplier management modules
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has access to supplier management
 */
export function hasSupplierManagementAccess(userRoles: string[]): boolean {
  return hasSuppliersModuleRole(userRoles) || hasManageModuleRole(userRoles);
}

/**
 * Get required modules for a specific feature
 * @param feature - The feature name
 * @returns Array of required module roles
 */
export function getRequiredModulesForFeature(feature: string): ModuleRoleValue[] {
  const moduleRequirements: Record<string, ModuleRoleValue[]> = {
    'data-analysis': [MODULE_ROLES.ANALYZE],
    'supplier-management': [MODULE_ROLES.SUPPLIERS, MODULE_ROLES.MANAGE],
    'strategic-planning': [MODULE_ROLES.PLAN, MODULE_ROLES.ANALYZE],
    'comparison-tools': [MODULE_ROLES.COMPARE, MODULE_ROLES.ANALYZE],
    'opportunity-tracking': [MODULE_ROLES.OPPORTUNITY, MODULE_ROLES.ANALYZE],
  };

  return moduleRequirements[feature] || [];
}

/**
 * Check if user has access to a specific feature based on module requirements
 * @param userRoles - Array of user roles
 * @param feature - The feature name
 * @returns boolean indicating if the user has access to the feature
 */
export function hasFeatureAccessByModules(userRoles: string[], feature: string): boolean {
  const requiredModules = getRequiredModulesForFeature(feature);
  return requiredModules.every(module => hasModuleRole(userRoles, module));
}
