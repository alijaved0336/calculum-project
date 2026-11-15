/**
 * Session Role Constants
 * User authentication and basic permission roles
 */

export const SESSION_ROLES = {
  SUPER_ADMIN: "ROLE_ADMIN",
  COMPANY_ADMIN: "ROLE_COMPANY_ADMIN",
  USER: "ROLE_USER",
  VIEW_ONLY: "ROLE_VIEW",
  DATA_USER: "ROLE_DATA",
  SALES_USER: "ROLE_SALES",
  PARTNER_USER: "ROLE_PARTNER",
} as const;

// Type-safe access to session role values
export type SessionRoleValue = typeof SESSION_ROLES[keyof typeof SESSION_ROLES];

// Individual session role constants for easier imports
export const ROLE_ADMIN = SESSION_ROLES.SUPER_ADMIN;
export const ROLE_COMPANY_ADMIN = SESSION_ROLES.COMPANY_ADMIN;
export const ROLE_USER = SESSION_ROLES.USER;
export const ROLE_VIEW = SESSION_ROLES.VIEW_ONLY;
export const ROLE_DATA = SESSION_ROLES.DATA_USER;
export const ROLE_SALES = SESSION_ROLES.SALES_USER;
export const ROLE_PARTNER = SESSION_ROLES.PARTNER_USER;
