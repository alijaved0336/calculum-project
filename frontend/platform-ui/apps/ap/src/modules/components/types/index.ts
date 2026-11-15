import { KeyValue } from "@/types";

/**
 * View-model for the add/edit user form (CreateEditUserForm.vue)
 */
export interface UserFormModel {
  email: string,
  emailError: string,
  formErrorMessage: string,
  formHasError: boolean,
  formTitle: string,
  hasAdminAccess: boolean,
  hasStandardAccess: boolean,
  loading: boolean,
  roles: {
    admin: boolean,
    standard: boolean,
  },
  rolesAdmin: boolean,
  showCreateTeamDialog: boolean,
  userHasAtLeastOneRole: boolean,
  userId: string,
  userRoles: {
    admin: boolean;
    partner: boolean;
    data: boolean;
  };
  key: number;
}

export interface ButtonsGroupOptions {
  activeItemKey: string;
  classesByKey: KeyValue[];
}

export interface CalculumTreeItem {
  id: string | number;
  label: string;
  level?: number;
  children?: CalculumTreeItem[];
}
export type ActionFromEditProgram =
  | "harmonizationGroup"
  | "moveBetween"
  | "vcardGroup"
  | "financingGroup"
  | "setTarget"
  | "updateStatus"
  | "includeExclude"
  | "exportPdf"
  | "manageTeam"
  | "commodity"
  | "customColumn"
  | "columnNumber"
  | "supplierIndustry"
  | "supplierCreditRating"
  | "supplierUltimateParent"
  | "supplierDso"
  | "supplierRevenueGrowth"
  | null;
