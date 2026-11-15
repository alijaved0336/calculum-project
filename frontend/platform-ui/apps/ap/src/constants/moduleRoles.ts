/**
 * Module Role Constants
 * Access to specific application modules
 */

export const MODULE_ROLES = {
  ANALYZE: "MODULE_ANALYZE",
  /**
   * Receivables (AR). UC-ENT-12: application-level enablement, not a screen inside payables.
   *
   * It reaches the session for free, because User::getRoles() merges the active company's roles,
   * so it is read exactly like every other module role here. It replaced RECEIVABLES_FEATURE, a
   * hardcoded list of company uuids that could only be changed by deploying the bundle.
   */
  AR: "MODULE_AR",
  COMPARE: "MODULE_COMPARE",
  MANAGE: "MODULE_MANAGE",
  MATCH: "MODULE_MATCH",
  OPPORTUNITY: "MODULE_OPPORTUNITY",
  PLAN: "MODULE_PLAN",
  SUPPLIERS: "MODULE_SUPPLIERS",
} as const;

// Type-safe access to module role values
export type ModuleRoleValue = typeof MODULE_ROLES[keyof typeof MODULE_ROLES];

// Individual module role constants for easier imports
export const MODULE_ANALYZE = MODULE_ROLES.ANALYZE;
export const MODULE_AR = MODULE_ROLES.AR;
export const MODULE_COMPARE = MODULE_ROLES.COMPARE;
export const MODULE_MANAGE = MODULE_ROLES.MANAGE;
export const MODULE_MATCH = MODULE_ROLES.MATCH;
export const MODULE_OPPORTUNITY = MODULE_ROLES.OPPORTUNITY;
export const MODULE_PLAN = MODULE_ROLES.PLAN;
export const MODULE_SUPPLIERS = MODULE_ROLES.SUPPLIERS;
