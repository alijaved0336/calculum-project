export interface CreateCompanyAdmin {
  accountsReceivablesMillions: number;
  accountType: string;
  annualSalesRevenueMillions: number;
  annualSpendMillions: number;
  averagePaymentTermsWithCustomersDays: string;
  averagePaymentTermsWithSuppliersDays: string;
  averageTimeApproveInvoicesReceivedFromSuppliersDays: string;
  companyAddress: string;
  companyCity: string;
  companyCountry: string;
  companyDomain: string;
  companyIdentificationType: string;
  companyIdentificationValue: string;
  companyLogoUrl: string;
  companyName: string;
  companyZipCode: string;
  currency: string;
  dataAccountTypes: Array<any>;
  dataCountriesTypeById: Array<any>;
  excludeForPeerGroupClustering: boolean;
  allowedDomains: string;
  excludeForSupplierStandardClustering: boolean;
  formErrorMessage: string;
  formHasError: boolean;
  language: string;
  limitUser: number;
  loadingDataCountries: boolean;
  maxUsersAllowed: number;
  messageError: string;
  minUsersAllowed: number;
  newIndustry: string;
  newTeam: string;
  paymentTermDays: number;
  revenuePercentage: number;
  showCreateTeamDialog: boolean;
  spinnerValidation: boolean;
  teams: Array<any>;
  wacc: number;
  taxRate: number;
  minActivityLimit: number;
  maxActivityLimit: number;
  inactivityDays: number | null;  
  errorAapplyPasswordPolicy: boolean;
  allowedMimeTypes:  Array<any>;

}

export interface Users {
  limitUsers: number;
  externalUsers: number;
}

type FileCalculationStatus = "calculation_claimed" | "recalculating" | "ready" | "error";

export interface SCFFileRefAPIResponse {
  "@id": string;
  "@type": string;
  name: string;
  source: string;
  status: FileCalculationStatus;
}


export interface ClustersDataInterface {
  badgeStatus: string | null;
  columns: Array<any>;
  currentClusterTypeLastDate: string | null;
  currentClusterTypeLastVersion: string | null;
  generatingCluster: boolean;
  gridData: Array<any>;
  keyGrids: number;
  limitNumberOfCompanies: number;
  loadClusterData: boolean;
  loadExport: boolean;
  pendingClusterGenerate: boolean;
  selectedYears: number;
  statusNotReady: boolean;
  totalCount: number;
}

export interface AdminUploadData {
  clickedOnChangeSpendFileStatusButton: boolean;
  companySelectedId: string;
  currentDataObject: any;
  currentStatusIsPublic: boolean;
  deleteSpendFileValue: boolean;
  emisFileErrorMessage: string;
  emisFiles: Array<any>;
  emisToDelete: string;
  files: Array<any>;
  filesEMIS: Array<any>;
  forEMISFileModal: boolean;
  gridEMISColumns: Array<any>;
  isShowLevelOfAccessModalShowing: boolean;
  isShowLevelOfAccessStatusChangeModalShowing: boolean;
  limitAccessForSpendFile: string;
  loadingData: boolean;
  selectedFileIdForDelete: string; // full IRI
  selectFileEmis: string;
  showConfirmDeleteModal: boolean;
  showModalForUploadedFile: boolean;
  spendFileErrorMessage: string;
  spendFiles: Array<any>;
  versionToDelete: string;
  syncronizeSupplierNotes: boolean;
  syncronizeKeepHistoricalData: boolean;
  syncronizeTargets: boolean;
  syncronizeAgreements: boolean;
  syncronizeSupplierStandard: boolean;
  syncronizePeerGroupStandard: boolean;
  syncronizePlanPhase: boolean;
  syncronizeNegotiationStatus: boolean;
  syncronizeChangeRequests: boolean;
  keyReactive: number;
  spendfileToSyncronize: string | null;
  showingConfirmModal: boolean,
  keyGrid: number,
  showMatchingFields: boolean
}

export interface HomeManageTeam {
  amountOfUsers: number,
  companyNameValue: string,
  dataFormEdit: any,
  dataTeam: Array<any>,
  deleteUserObj: any,
  deletingUser: boolean,
  email: string,
  findByName: string,
  firstName: string,
  formErrorMessage: string,
  formHasError: boolean,
  gridHeight: string,
  invitationToken: string,
  isAdmin: boolean,
  isForRevoking: boolean,
  isNewUser: boolean,
  isUserAddOrEditFormShown: boolean,
  key: number,
  largeScreen: number,
  lastName: string,
  limitUsers: number,
  listUsersColumns: Array<any>,
  loadingInviteUsers: boolean,
  loadingLimitUsersValue: boolean,
  loadingUsers: boolean,
  mediumScreen: number,
  newTeam: string,
  pagable: Array<any>,
  pageSizeNumber: number,
  roles: any,
  showCreateTeamDialog: boolean,
  showDeleteConfirmModal: boolean,
  showConfirmModalResetIdentityProvider: boolean,
  showInviteUserSuccess: boolean,
  showRevokeAccessModal: boolean,
  smallScreen: number,
  team: string,
  tokenExpiration: string,
  typeOfFormShown: string,
  userID: string,
  userInputSearch: string,
  userObj: any,
  users: Array<any>,
  widthScreen: number,
  XlargeScreen: number,
}

/** UI Groups Admin - form and list types */
export type UiGroupFormMode = 'create' | 'edit';

/** Payload emitted by UIGroupFormCard on submit for parent validation and API calls */
export interface UiGroupFormPayload {
  groupName: string;
  primaryColor: string;
  limitUser: number;
  allowedDomains: string;
  checkingDomains: string[];
  file: File | null;
  nameIsEmpty: boolean;
  fileSizeTooBig: boolean;
  removeAdaCalculumReferences: boolean;
}

export interface CompanyForFilter {
  name: string;
  uuid: string;
  selected: boolean;
}

export interface UiGroup {
  '@id': string;
  name: string;
  primaryColor?: string;
  companies?: Array<{ '@id': string; name: string }>;
  created?: string;
  maxNumberOfUsers?: number;
  allowedDomains?: string | string[];
  companiesCount?: number;
  companyNames?: string;
  removeAdaCalculumReferences?: boolean;
}
