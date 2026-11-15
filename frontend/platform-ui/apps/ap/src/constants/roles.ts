/**
 * All Roles Combined
 * This file combines all role types for cases where you need to manage them together
 */

import { SESSION_ROLES, type SessionRoleValue } from './sessionRoles';
import { MODULE_ROLES, type ModuleRoleValue } from './moduleRoles';
import { FEATURE_ROLES, type FeatureRoleValue } from './featureRoles';

// Combine all roles into one object
export const ALL_ROLES = {
  ...SESSION_ROLES,
  ...MODULE_ROLES,
  ...FEATURE_ROLES,
} as const;

// Combined type for all roles
export type RoleValue = typeof ALL_ROLES[keyof typeof ALL_ROLES];

// Re-export all role types for convenience
export type { SessionRoleValue, ModuleRoleValue, FeatureRoleValue };

// Re-export all role constants for convenience
export { SESSION_ROLES, MODULE_ROLES, FEATURE_ROLES };

// Utility function to check if a role is any valid role
export function isValidRole(role: string): role is RoleValue {
  return Object.values(ALL_ROLES).includes(role as RoleValue);
}

// Utility function to get role type
export function getRoleType(role: RoleValue): 'session' | 'module' | 'feature' {
  if (Object.values(SESSION_ROLES).includes(role as SessionRoleValue)) {
    return 'session';
  }
  if (Object.values(MODULE_ROLES).includes(role as ModuleRoleValue)) {
    return 'module';
  }
  if (Object.values(FEATURE_ROLES).includes(role as FeatureRoleValue)) {
    return 'feature';
  }
  return 'feature'; // fallback
}
