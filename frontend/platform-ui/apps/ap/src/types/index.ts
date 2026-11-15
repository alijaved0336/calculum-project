export type { ManageTab } from "@/modules/home/manageModule/types";

export interface KeyLabel<J = string, K = string> {
  key: J;
  label: K;
}

export interface KeyValue<J = string, K = string> {
  key: J;
  value: K;
}

export interface ValueName {
  value: string;
  name: string;
}

// *** Charts ***
export interface XAxisYAxis {
  xAxis: number[];
  yAxis: string[];
}

export type EntityType =
  | "spend"
  | "supplier"
  | "parent"
  | "potential"
  | "potential-supplier"
  | "pilot"
  | "potential-parent";

export type TargetView = "spends" | "suppliers" | "parents" | "potentials";

/** Valid target view levels for global filters (excludes "potentials") */
export const TARGET_VIEW_SPENDS = "spends" as const;
export const TARGET_VIEW_SUPPLIERS = "suppliers" as const;
export const TARGET_VIEW_PARENTS = "parents" as const;
export const TARGET_VIEW_LEVELS: readonly TargetView[] = [
  TARGET_VIEW_SPENDS,
  TARGET_VIEW_SUPPLIERS,
  TARGET_VIEW_PARENTS,
];

// *** Dropdown ***

export interface DropdownOption {
  key: string | number; // Add 'key' to the interface
  value?: string | number;
  isActive?: boolean;
  isSelected?: boolean;
}

// *** END Dropdown ***

// *** Company ***

// ? - Some types might have changed since the WHOAMI update

interface CountryInterface {
  id: string;
  code: string;
  "@id": string;
  "@type": string;
  alpha3Code: string;
  localizedName: string;
}
interface CurrencyInterface {
  id: string;
  code: string;
  "@id": string;
  "@type": string;
}
export interface Company {
  "@id": string;
  "@type": string;
  accountsReceivablesMillions: number;
  address: string;
  annualSalesRevenueMillions: number;
  annualSpendMillions: number;
  averagePaymentTerms: number;
  averagePaymentTermsWithCustomers: string;
  averagePaymentTermsWithCustomersDays: number;
  averagePaymentTermsWithSuppliers: string;
  averagePaymentTermsWithSuppliersDays: number;
  averageTimeApproveInvoicesReceivedFromSuppliersDays: number;
  city: string;
  companyIndustryRelations: any; // OR string[] | CompanyIndustryRelation[];
  domain: string;
  financingStrategyMethod: string;
  identificationValue: string;
  initialSetupCompleted: boolean;
  logo: any;
  name: string;
  numberFormat: string;
  paymentCycleDays: number;
  zipCode: string;
  country: CountryInterface;
  currency: CurrencyInterface;
  identificationType: {
    "@id": string;
    "@type": string;
    id: number;
    value: string;
  };
  teams: {
    "@id": string;
    "@type": string;
    name: string;
  }[];
  uiGroup: {
    "@id": string;
    "@type": string;
    name: string;
    primaryColor: string;
    logoPath: string;
  };
  //
  // Pending to review:
  //
  // analyzePrograms: any; // Program[];
  // averageTimeApproveInvoicesReceivedFromSuppliersDays: number | null;
  // buyerStandardGroups: BuyerStandardGroup[];
  companyActivities: CompanyActivity[];
  // companyEnhancingFiles: CompanyEnhancingFile[];
  // companyFiles: CompanyFile[];
  // compareCompanies: any[]; // CompareCompany[];
  // compareCompaniesFiles: any[]; // CompareCompanyFile[];
  // precalculatedData: any[];
  // scfFileRef: any;
  // team: string | null;
  // userCompanies: UserCompany[];
}

export interface CompanyActivity {
  title: string | null;
  message: string | null;
  type: string | null;
  originType: string | null;
  referencedClass: string | null;
  referencedId: string | null;
  company: Company | null;
}

export interface CompanyAPIPlatformResponse {
  "@id": string;
  "@type": string;
  teams: {
    "@id": string;
    "@type": string;
    name: string;
    company: string;
  }[];
  spendFiles: string[];
  buyerStandardGroups: any[]; // Assuming this can be any type
  companyEnhancingFiles: any[]; // Assuming this can be any type
  initialSetupCompleted: boolean;
  annualSalesRevenueMillions: string;
  annualSpendMillions: string;
  accountsReceivablesMillions: string;
  averagePaymentTermsWithCustomersDays: number;
  paymentCycleDays: number;
  averageTimeApproveInvoicesReceivedFromSuppliersDays: number;
  financingStrategyMethod: string;
  hideAverageDaysPaid?: boolean;
  wacc: number;
  roles: UserRoles[];
  name: string;
  identificationType: {
    "@id": string;
    "@type": string;
    id: number;
    value: string;
  };
  identificationValue: string;
  address: string;
  country: {
    "@id": string;
    "@type": string;
    code: string;
    alpha3Code: string;
    region: string;
    translatedName: string;
    flagUrl: string;
    localizedName: string;
  };
  city: string;
  zipCode: string;
  domain: string;
  currency: {
    "@id": string;
    "@type": string;
    code: string;
  };
  logo: {
    "@id": string;
    "@type": string;
    originalFileName: string;
    mimeType: string;
    publicUrl: string;
  };
  averagePaymentTerms: number;
  industry: string;
  pilotTimeExpires: string | null;
  potentialSupplierRequestLimit: number | null;
  potentialSupplierCount: number | null;
  /** WI#18362. Whether this client company has genuine platform usage. */
  activeClient: boolean;
  /** WI#18362. 'auto' = recomputed from active external users, 'manual' = pinned by a Super Admin. */
  activeClientMode: "auto" | "manual";
}

export interface CompanySettingsCompaniesGridData
  extends CompanyAPIPlatformResponse {
  actions: boolean;
  /** WI#19987. Grid-only: the Set Auto button was pressed and is waiting for Save. */
  activeClientResetPending?: boolean;
  downloadExcelIsAvailable: boolean;
  feature9BoxesFinancing: boolean;
  featureCreditRating: boolean;
  featureEmailNegotiationsIsAvailable: boolean;
  featurePaymentTermsvsPrice: boolean;
  featurePilotAccountIsAvailable: boolean;
  featureSME: boolean,
  featureValueProposition: boolean,
  featureVCardIsAvailable: boolean;
  matchDowloadExcelIsAvailable: boolean;
  moduleAnalyzeIsAvailable: boolean;
  /** UC-ENT-12. The receivables application is enabled for this company. */
  moduleArIsAvailable: boolean;
  moduleCompareIsAvailable: boolean;
  moduleEntityCardIsAvailable: boolean;
  moduleManageIsAvailable: boolean;
  moduleOverviewIsAvailable: boolean;
  modulePlanIsAvailable: boolean;
  moduleProgramIsAvailable: boolean;
  scfStandardStrategy: boolean;
  featureLeverageDistribution: boolean;
  featureEntityCardNewsletter: boolean;
  featureKeepHistoricalData: boolean;
  featureSupplierStandard: boolean;
  featurePeerGroupStandard: boolean;
  featureSupportBot: boolean;
  featureSupplierInsightsIsAvailable: boolean;
  featureForecastVolumeIsAvailable: boolean;
  featurePotentialSuppliersIsAvailable: boolean;
  potentialSupplierRequestLimit: number | null;
  potentialSupplierCount: number | null;
  featureAiBotNegotiation: boolean;
  featureDynamicFilteredSummariesIsAvailable: boolean;
}

// *** END Company ***

// *** User Session ***

export interface UserSession {
  "@context": string;
  "@id": string;
  "@type": string;
  activeCompany: UserSessionActiveCompany | null;
  activeProgramExternalFinancingEnabled: boolean,
  activeDaysLast30?: number | null;
  activeProgramDefaultId: string | null; // e.g. "6bb8f427-eeb0-4706-98a5-552aba9c2cdc";
  activeSpendFileVersion: UserSessionActiveSpendFileVersion | null;
  availableCompanies: UserSessionAvailableCompany[];
  azureId: string;
  decimalFormatting: string;
  dialCode: string;
  dialIsoCode: string;
  email: string;
  firstName: string;
  globalFiltersSavedArray: GlobalFiltersTemplate[];
  isAnnouncementCompleted: boolean;
  isSuperAdmin: boolean;
  jobTitle: string;
  language: string;
  created?: string;
  createdAt?: string;
  lastFeedbackSurveyAt?: string | null;
  lastFeedbackSurveyResponse?: string | null;
  lastActivity: string;
  lastName: string;
  pageSize: number;
  phoneNumber: string;
  roles: UserRoles[];
  selectedGlobalFiltersSaved: GlobalFiltersTemplate | null;
  signUpPending: boolean;
  timezone: string;
  userNotificationSetting: UserSessionUserNotificationSetting[];
  viewedNotificationsMessageDate: string;
  isAdaWelcomeVideo: boolean;
  lastActiveSpendFileVersion: UserSessionLastActiveSpendFileVersion | null;
}

export interface UserSessionActiveCompany {
  "@id": string;
  "@type": string;
  accountsReceivablesMillions: string;
  address: string;
  annualSalesRevenueMillions: string;
  annualSpendMillions: string;
  averagePaymentTerms: number;
  averagePaymentTermsWithCustomersDays: number;
  averageTimeApproveInvoicesReceivedFromSuppliersDays: number;
  city: string;
  country: {
    "@id": string;
    "@type": string;
    alpha3Code: string;
    code: string;
  };
  currency: {
    "@id": string;
    "@type": string;
    code: string;
  };
  compareCompany: any;
  domain: string;
  financingStrategyMethod: string;
  hideAverageDaysPaid?: boolean;
  identificationType: {
    "@id": string;
    "@type": string;
    id: number;
    value: string;
  };
  identificationValue: string;
  logo: UserSessionLogo;
  name: string;
  paymentCycleDays: number;
  spendFileVersions: UserSessionActiveCompanySpendFileVersion[];
  teams: UserSessionActiveCompanyTeam[] | null;
  uiGroup: {
    "@id": string;
    "@type": string;
    name: string;
    primaryColor: string;
    logoPath: string;
    removeAdaCalculumReferences: boolean;
    allowedDomains?: string[] | string | null;
  };
  zipCode: string;
  pilotTimeExpire: string | null;
  vCardGroupsEnabled: boolean,
  allowedDomains: string | null;
  taxRate?: number;
  wacc?: number;
  tenantId: string;
  creditRating?: string;
  ultimateParentName?: string;
  potentialSupplierRequestLimit?: number | null
}

export interface UserSessionAvailableCompany {
  "@id": string;
  "@type": string;
  name: string;
}

// All media use similar structure
export interface UserSessionLogo {
  "@id": string;
  "@type": string;
  mimeType: string;
  originalFileName: string;
  publicUrl: string;
}

export interface UserSessionLastActiveSpendFileVersion {
  id: number;
  uuid: string;
  name: string;
}

export interface UserSessionActiveCompanySpendFileVersion {
  "@id": string;
  "@type": string;
  name: string;
  status: string;
  version: string;
  isPublic: boolean;
}

export interface UserSessionActiveCompanyTeam {
  "@id": string;
  "@type": string;
  name: string;
}

export interface UserSessionActiveCompanyCommodity {
  "@id": string;
  "@type": string;
  name: string;
}


interface BuyerEntity { 
  '@id': string,  
  name: string
}

export interface PotentialSupplierRequest {
  '@id': string
  name: string
  company: Company
  spendFileName: string
  spendFileVersion: SpendFile.SpendFileVersion  
  country: CountryInterface
  buyer: BuyerEntity
  currency: CurrencyInterface
  created: string  
  status: 'pending' | 'solved' | 'rejected',
  createdBy: {
      "@id": string;
      "@type": string;
      email: string;
      firstName: string;
      lastName: string;
      updated: string;
    },
  commodity: Array<string>,
  estimateAvgPaymentTerms: number,
  estimatedAnnualSpendVolume: number
}


export interface UserSessionActiveSpendFileVersion {
  "@id": string;
  "@type": string;
  automaticRecalculation: boolean;
  hasDefaultPrograms: boolean;
  isProcessedWithNoErrors: boolean;
  name: string;
  nameCustomDataPoints: string[];
  /**
   * Bug#18966: whether each custom data point slot carries spend data, same slot order as
   * nameCustomDataPoints. Optional because older cached sessions predate the field.
   */
  customDataPointsHasData?: boolean[];
  pendingRecalculation: boolean;
  processing: boolean;
  status: SpendFile.SpendFileVersionStatus;
  statusDescription: string;
  version: number;
  plansAmount: number;
  programsAmount: number;
  isPublic: boolean;
  showOpportunityExpectedOpportunity: typeOfOpportunityVisibility;
  strategiesVisibility: typeOfSupplierStrategyVisibility
  initialDate: string;
  finalDate: string;
  newsConfig?: NewsConfig | null;
  hideAverageDaysPaid?: boolean;
  hasContractualPaymentTerms?: boolean;
  payOnTermsStrategyAllowed?: boolean;
  workingCapitalMinDays?: number;
  workingCapitalEmpty?: boolean;
  /**
   * WI#18968: the Low/Medium/High limits of each 9-box, keyed by box type. Absent until the
   * version has been recalculated once. WI#19582 lets the user replace them from Setup.
   */
  nineBoxThresholds?: NineBoxThresholds | null;
}

/** WI#18968: med is the box lower limit (Low -> Medium), high the upper one (Medium -> High). */
export interface NineBoxThresholdLimits {
  high: number;
  med: number;
}

/**
 * WI#19582: what each box actually stores - the pair the platform worked out, the pair the Company
 * Admin typed, and the portfolio total the first of the two came out of. The table never reads this
 * directly: which of the two pairs wins is resolved server-side into `nineBoxThresholdsActive`.
 */
export interface NineBoxThresholdEntry {
  calculated?: NineBoxThresholdLimits;
  user?: NineBoxThresholdLimits;
  total?: number;
}

export type NineBoxThresholds = Partial<Record<NineBoxType, NineBoxThresholdEntry>>;

/**
 * WI#19582: the pair that classifies each box right now, already resolved.
 *
 * `source` marks the value as the user's or the platform's, and `hasCalculated` says whether there
 * is a platform pair behind an override - which is what decides whether "Reset to default" has
 * anywhere to go back to.
 */
export interface NineBoxThresholdActive extends NineBoxThresholdLimits {
  source: "manual" | "calculated";
  hasCalculated: boolean;
}

export type NineBoxThresholdsActive = Partial<Record<NineBoxType, NineBoxThresholdActive>>;

export type NineBoxType = "cashFlow" | "scf" | "economicProfit" | "vCard";

/**
 * WI#19582: what the Setup card sends when the user asks for one 9-box's limits to be replaced.
 * One mode per button, and the card never offers more than one of the three at a time:
 *
 *   "manual"      carries the two amounts the user typed; from then on they are what classifies
 *   "reset"       "Reset to default" - drops the override so the platform's pair takes over again
 *   "recalculate" drops the platform's pair so it is worked out again from the portfolio
 *
 * The typed amounts are in the currency the screen is showing, so `currencyRate` travels with them -
 * the same rate the table was painted with, which is what makes "type 15000, refresh, read 15000"
 * hold.
 */
export interface NineBoxThresholdRequest {
  programUuid: string;
  boxType: NineBoxType;
  mode: "recalculate" | "manual" | "reset";
  high?: number;
  med?: number;
  currencyRate: number;
}

/**
 * AB#86ak0mkx0: one row (High or Medium) of the Buyer Leverage Limits card. `percent`/`amount` are
 * the spend file's current values (fractions, e.g. 0.05 = 5%); `defaultPercent`/`defaultAmount` are
 * the owning Company's current values, shown as "Default $X" whether or not this row is overridden.
 * `isDefault` is true when the two match exactly.
 */
export interface BuyerLeverageLevelLimits {
  percent: number | null;
  amount: number | null;
  defaultPercent: number;
  defaultAmount: number;
  isDefault: boolean;
}

/** AB#86ak0mkx0: GET /api/spend_file_versions/{uuid}/buyer_leverage_limits response. */
export interface BuyerLeverageLimits {
  high: BuyerLeverageLevelLimits;
  medium: BuyerLeverageLevelLimits;
  lastChangedBy: string | null;
  lastChangedAt: string | null;
}

/** AB#86ak0mkx0: POST /api/spend_file_versions/{uuid}/buyer_leverage_limits body - fractions, not %. */
export interface BuyerLeverageLimitsRequest {
  medium: { percent: number; amount: number };
  high: { percent: number; amount: number };
}

export interface UserSessionCompanySpendFilesVersion {
  "@id": string;
  "@type": string;
  name: string;
  status: string;
  version: number;
  isPublic: boolean;
  pendingRecalculation: boolean;
}

export interface UserSessionUserNotificationSetting {
  "@id": string;
  "@type": string;
  enabledToEmail: boolean;
  enabledToPlatform: boolean;
  id: number;
  notificationType: string;
}


export interface UserCompanySpendFiles {
  spendFiles: Array<any>;
}

export interface UserCompanyEMISFiles {
  emisFiles: Array<any>;
}

import { SESSION_ROLES, MODULE_ROLES, FEATURE_ROLES } from "@/constants";

export type SuperAdminRole = typeof SESSION_ROLES.SUPER_ADMIN;
export type CompanyAdminRole = typeof SESSION_ROLES.COMPANY_ADMIN;
export type UserRole = typeof SESSION_ROLES.USER;
export type ViewOnlyRole = typeof SESSION_ROLES.VIEW_ONLY;
export type DataUserRole = typeof SESSION_ROLES.DATA_USER;
export type SalesUserRole = typeof SESSION_ROLES.SALES_USER;
export type PartnerUserRole = typeof SESSION_ROLES.PARTNER_USER;

export type UserSessionRole =
  | SuperAdminRole
  | CompanyAdminRole
  | UserRole
  | ViewOnlyRole
  | DataUserRole
  | SalesUserRole
  | PartnerUserRole;

export type AnalyzeModuleRole = typeof MODULE_ROLES.ANALYZE;
/** UC-ENT-12. Receivables enablement for the company, not a screen inside payables. */
export type ArModuleRole = typeof MODULE_ROLES.AR;
export type CompareModuleRole = typeof MODULE_ROLES.COMPARE;
export type ManageModuleRole = typeof MODULE_ROLES.MANAGE;
export type MatchModuleRole = typeof MODULE_ROLES.MATCH;
export type OpportunityModuleRole = typeof MODULE_ROLES.OPPORTUNITY;
export type PlanModuleRole = typeof MODULE_ROLES.PLAN;
export type SuppliersModuleRole = typeof MODULE_ROLES.SUPPLIERS;

export type UserSessionModuleRole =
  | AnalyzeModuleRole
  | ArModuleRole
  | CompareModuleRole
  | ManageModuleRole
  | MatchModuleRole
  | OpportunityModuleRole
  | PlanModuleRole
  | SuppliersModuleRole;

export type DownloadExcelMatchFeatureRole = typeof FEATURE_ROLES.DOWNLOAD_EXCEL_MATCH;
export type DownloadExcelFeatureRole = typeof FEATURE_ROLES.DOWNLOAD_EXCEL;
export type DownloadPdfEntityFeatureRole = typeof FEATURE_ROLES.DOWNLOAD_PDF_ENTITY;
export type EmailNegotiationsFeatureRole = typeof FEATURE_ROLES.EMAIL_NEGOTIATIONS;
export type ScfStrategyFeatureRole = typeof FEATURE_ROLES.SCF_STRATEGY;
export type NineBoxesFinancingFeatureRole = typeof FEATURE_ROLES.NINE_BOXES_FINANCING;
export type PilotFeatureRole = typeof FEATURE_ROLES.PILOT;
export type VirtualCardFeatureRole = typeof FEATURE_ROLES.VIRTUAL_CARD;
export type PaymentTermsVsPriceFeatureRole = typeof FEATURE_ROLES.PAYMENT_TERMS_VS_PRICE;
export type SMEFeatureRole = typeof FEATURE_ROLES.SME;
export type CreditRatingFeatureRole = typeof FEATURE_ROLES.CREDIT_RATING;
export type ValuePropositionFeatureRole = typeof FEATURE_ROLES.VALUE_PROPOSITION;
export type LeverageDistributionFeatureRole = typeof FEATURE_ROLES.LEVERAGE_DISTRIBUTION;
export type EntityCardNewsletterFeatureRole = typeof FEATURE_ROLES.ENTITY_CARD_NEWSLETTER;
export type KeepHistoricalDataFeatureRole = typeof FEATURE_ROLES.KEEP_HISTORICAL_DATA;
export type SupplierStandardFeatureRole = typeof FEATURE_ROLES.SUPPLIER_STANDARD;
export type PeerGroupStandardFeatureRole = typeof FEATURE_ROLES.PEER_GROUP_STANDARD;
export type SupplierInsightsFeatureRole = typeof FEATURE_ROLES.SUPPLIER_INSIGHTS;
export type SupportBotFeatureRole = typeof FEATURE_ROLES.SUPPORT_BOT;
export type ForecastVolumeFeatureRole = typeof FEATURE_ROLES.FORECAST_VOLUME;
export type PotentialSuppliersFeatureRole = typeof FEATURE_ROLES.POTENTIAL_SUPPLIERS;
export type AiBotNegotiationFeatureRole = typeof FEATURE_ROLES.AI_BOT_NEGOTIATION;
export type DynamicFilteredSummariesFeatureRole = typeof FEATURE_ROLES.DYNAMIC_FILTERED_SUMMARIES;
export type UserSessionFeatureRole =
  | DownloadExcelMatchFeatureRole
  | DownloadExcelFeatureRole
  | DownloadPdfEntityFeatureRole
  | EmailNegotiationsFeatureRole
  | ScfStrategyFeatureRole
  | NineBoxesFinancingFeatureRole
  | PilotFeatureRole
  | VirtualCardFeatureRole
  | PaymentTermsVsPriceFeatureRole
  | SMEFeatureRole
  | CreditRatingFeatureRole
  | ValuePropositionFeatureRole
  | LeverageDistributionFeatureRole
  | EntityCardNewsletterFeatureRole
  | KeepHistoricalDataFeatureRole
  | SupplierStandardFeatureRole
  | PeerGroupStandardFeatureRole
  | SupplierInsightsFeatureRole
  | SupportBotFeatureRole
  | ForecastVolumeFeatureRole
  | PotentialSuppliersFeatureRole
  | AiBotNegotiationFeatureRole
  | DynamicFilteredSummariesFeatureRole;

export type UserRoles =
  | UserSessionRole
  | UserSessionModuleRole
  | UserSessionFeatureRole;

// *** END User Session ***



export type typeOfOpportunityVisibility = | 'ONLY_OPPORTUNITY' | 'OPPORTUNITY_AND_EXPECTED'

export type typeOfSupplierStrategyVisibility = | 'ONLY_LARGEST' | 'APPLICABLE' | 'ALL'


// *** Spend File / Spend File Version ***

export namespace SpendFile {
  export interface SpendFile {
    "@id": string;
    "@type": string;
    company: Company;
    name: string;
    versions: SpendFile.SpendFileVersion[];
    processing: boolean; // ? Check this prop if belongs to SpendFile or only to spendFileVersion
    created: string;
    updated: string;
    createdBy: {
      "@id": string;
      "@type": string;
      email: string;
      firstName: string;
      lastName: string;
      updated: string;
    };
    updatedBy: {
      "@id": string;
      "@type": string;
      email: string;
      firstName: string;
      lastName: string;
      created: string;
      updated: string;
      createdBy: {
        "@id": string;
        "@type": string;
        email: string;
        firstName: string;
        lastName: string;
        created: string;
        updated: string;
      };
    };
    humanDate: string;
  }

  // ? - Some types might have changed since the WHOAMI update
  export type SpendFileVersionStatus =
    | "recalculateClaimed"
    | "deleteClaimed"
    | "ready"
    | "processing"
    | "calculating"
    | "reCalculating"
    | "errorProcessing"
    | "errorCalculating"
    | "errorReCalculating"
    | "outdated";
  //
  // ? - Pending to review
  // | "loaded"
  // | "updateClaimed"
  // | "updating"
  // | "errorUpdating";

  export interface SpendFileVersion {
    "@id": string;
    "@type": string;
    automaticRecalculation: boolean;
    buyerCount: number;
    companyName: string;
    created: string;
    finalDate: string;
    hasDefaultPrograms: boolean;
    humanDate: string;
    initialDate: string;
    isProcessedWithNoErrors: boolean;
    media: null;
    mediaUuid: string | null;
    nameCustomDataPoint1: string;
    nameCustomDataPoint10: string;
    nameCustomDataPoint2: string;
    nameCustomDataPoint3: string;
    nameCustomDataPoint4: string;
    nameCustomDataPoint5: string;
    nameCustomDataPoint6: string;
    nameCustomDataPoint7: string;
    nameCustomDataPoint8: string;
    nameCustomDataPoint9: string;
    nameCustomDataPoints: string[];
    notMatchCount: number;
    notMatchCountWithAggregations: number;
    pendingRecalculation: boolean;
    processing: boolean;
    providerCount: number;
    providerPotentialCount: number;
    recalculationDate: string | null;
    spendCount: number;
    spendCountWithAggregations: number;
    spendFile: SpendFile;
    spendFileName: string;
    spendVolume: string;
    status: SpendFileVersionStatus;
    statusDescription: string;
    ultimateParentCount: number;
    ultimateParentPotentialCount: number;
    updated: string;
    uuid: string;
    version: number;
    createdBy: {
      "@id": string;
      "@type": string;
      email: string;
      firstName: string;
      lastName: string;
      updated: string;
    };
    statisticsSettings: {
      groupName: string;
      optionName: string;
      chartType: string;
    };
    updatedBy: {
      "@id": string;
      "@type": string;
      email: string;
      firstName: string;
      lastName: string;
      created: string;
      updated: string;
      createdBy: {
        "@id": string;
        "@type": string;
        email: string;
        firstName: string;
        lastName: string;
        created: string;
        updated: string;
      };
    };
    name?: string;
  }

  export interface SpendFileVersionByCompany {
    automaticRecalculation: boolean;
    buyerCount: number;
    companyName: string;
    created: string;
    finalDate: string;
    initialDate: string;
    isPublic: boolean;
    mediaUuid: string | null;
    pendingRecalculateReasons: string | null;
    pendingRecalculation: boolean;
    providerCount: number;
    providerPotentialCount: number;
    recalculationDate: string | null;
    spendCount: number;
    spendFileName: string;
    spendVolume: string;
    status: SpendFileVersionStatus;
    statusDescription: string;
    ultimateParentCount: number;
    ultimateParentPotentialCount: number;
    uuid: string;
    version: number;
    spendFileVersionNotes:string
  }

  export interface SpendFileVersionByCompanyGridDataItem
    extends SpendFileVersionByCompany {
    statusRecalculation: string;
    selected: boolean;
    nameCustomDataPoints: any[];
  }
}

// *** END Spend File / Spend File Version ***
// ? aka interface Spend
export interface SpendLine {
  activeProgram: string;
  actualPaymentTerms: number;
  alias: string;
  alpha3Code: string;
  averageDaysToApproveInvoice: number;
  box: string | null;
  financial_box: string | null;
  scfBox: string | null;
  buyerDomain: string;
  buyerIconUrl: string;
  buyerLeverage: string;
  buyerName: string;
  buyerUuid: string;
  buyerWacc: string;
  capturedCashDiscounts: number | null;
  cashDiscounts: number | null;
  cashFlowImpactLabel: string | null;
  commodity: string;
  onSCF: boolean | null;
  scfAccepted: boolean | null;
  scaleUsingFinancing: string | null;
  companySize: string;
  configUuid: string;
  continent: string;
  contractualPaymentTermsWithCashDiscounts: number | null;
  contractualPaymentTermsWithoutCashDiscounts: number;
  countryCreditRating: string;
  creditScore: string;
  creditScoreSource: string;
  currency: string;
  customDataPoint1: string | null;
  customDataPoint10: string | null;
  customDataPoint2: string | null;
  customDataPoint3: string | null;
  customDataPoint4: string | null;
  customDataPoint5: string | null;
  customDataPoint6: string | null;
  customDataPoint7: string | null;
  customDataPoint8: string | null;
  customDataPoint9: string | null;
  customDataPoint11: string | null;
  customDataPoint12: string | null;
  customDataPoint13: string | null;
  customDataPoint14: string | null;
  customDataPoint15: string | null;
  customDataPoint16: string | null;
  customDataPoint17: string | null;
  customDataPoint18: string | null;
  customDataPoint19: string | null;
  customDataPoint20: string | null;
  customDataPoint21: number | null;
  customDataPoint22: number | null;
  customDataPoint23: number | null;
  customDataPoint24: number | null;
  customDataPoint25: number | null;
  customDataPoint26: number | null;
  dateOfLastTermNegotiation: string;
  disabled: boolean;
  endDate: string;
  ethnicMinorityOwnedBusiness: boolean;
  externalId: string;
  financingColor: string | null;
  financingGroup: string | null;
  financingName: string | null;
  flagUrl: string;
  fundingCost: number;
  harmonizationColor: string | null;
  harmonizationGroup: string | null;
  harmonizationLevel: string;
  harmonizationName: string | null;
  hasDynamicHarmonization: boolean;
  idNumber: string;
  industry: string;
  industryNAICS: string;
  investVerteScore: number;
  isActive: boolean;
  isic: string | null;
  leverage: number;
  modelCashFlow: string;
  modelPaymentTerms: number;
  moodysScore: string;
  nameProgramActive: string;
  negotiationComplexity: string;
  negotiationId: string; // Agreed Terms entity ID
  negotiationStatus: NegotiationStatus;
  negotiationStatusCode: number; // Not used yet
  negotiationStatusString: string;
  newAgreedDateOfChange: string;
  newCashDiscounts: number;
  newNextReviewDate: string;
  newTermsWithCashDiscount: number;
  newTermsWithoutCashDiscount: number;
  originalSupplierName: string;
  outstanding: string;
  parentCompanyName: string;
  periodInMonths: number;
  programUuid: string;
  providerDomain: string;
  providerIconUrl: string;
  providerName: string;
  providerParentDomain: string;
  providerParentIconUrl: string;
  providerParentName: string;
  providerParentUuid: string;
  providerUuid: string;
  region: string;
  selected: boolean;
  spend_volume: number;
  spendFileInternalID: string;
  spendUUID: string;
  spScore: string;
  startDate: string;
  successProbabilityLabel: string | null;
  team: string;
  typeID: string;
  uuid: string;
  veteranOwnedBusiness: boolean;
  volume: string;
  wacc: number;
  womanOwnedBusiness: boolean;
  provider: {
    "@id": string;
    uuid: string;
    name: string;
    domain: string;
    iconUrl: string;
  };
  providerParent: {
    "@id": string;
    uuid: string;
    name: string;
    domain: string;
    iconUrl: string;
  };
  buyer: {
    "@id": string;
    uuid: string;
    name: string;
    domain: string;
    iconUrl: string;
  };
  planName: string | null;
  planPhase: string | null;
  planStatus: string | null;
}

export type NegotiationStatus =
  | "analyzed"
  | "planned"
  | "contacted"
  | "agreed" // "agreed" and "agreedNotExtended" are the same
  | "agreedExtended"
  | "onHold";

// *** Global Filters ***

export type FilterType =
  | "multipleCheckboxes"
  | "treeView"
  | "rangeSlider"
  | "radioBtn";

export type Operation = "unique" | "list" | "range" | "groups";

export type Section = "analyze" | "program" | "plan" | "spend";

export type Field =
  | "actualPaymentTerms"
  | "buyerName"
  | "cashDiscounts"
  | "commodity"
  | "contractualPaymentTermsWithCashDiscounts"
  | "contractualPaymentTermsWithoutCashDiscounts"
  | "customDataPoint1"
  | "customDataPoint10"
  | "customDataPoint2"
  | "customDataPoint3"
  | "customDataPoint4"
  | "customDataPoint5"
  | "customDataPoint6"
  | "customDataPoint7"
  | "customDataPoint8"
  | "customDataPoint9"
  | "entityCompanySize" // Supplier Size
  | "entityCountryName" // Supplier Country
  | "buyerCountry"
  | "buyerRegion"
  | "entityIndustryName"
  | "isSME" // SME related
  | "dei"
  | "entityRegion" // Supplier Region
  | "financings" // Financing Groups
  | "modelCashFlow" // Cash Flow Opportunity
  | "modelPaymentTerms" // Payment Terms Opportunity
  | "planPhaseNames" // Plan - Phases
  | "teamName" // Procurement Team
  | "volume" // Spend Volume
  | "isVCardApplied"
  | "vCardGroupName"
  | "entityWomanOwnedBusiness"
  | "entityEthnicMinorityOwnedBusiness"
  | "entityVeteranOwnedBusiness"
  | "programApplied"
  | "currencyCode"
  | "box"
  | "vCardBox"
  | "financialBox"
  | "scfBox"
  | "customDataPoint11"
  | "customDataPoint12"
  | "customDataPoint13"
  | "customDataPoint14"
  | "customDataPoint15"
  | "customDataPoint16"
  | "customDataPoint17"
  | "customDataPoint18"
  | "customDataPoint19"
  | "customDataPoint20"
  | "customDataPoint21"
  | "customDataPoint22"
  | "customDataPoint23"
  | "customDataPoint24"
  | "customDataPoint25"
  | "customDataPoint26"
  | "entityStockPerformanceMarketIndex"
  | "forecastVolume"
  ; // VCard Group

export interface GlobalFiltersPanelBarItem extends PanelBarItemProps {
  isLoading: boolean;
  itemData?: Partial<{
    items: any[];
    minValue: number | null;
    maxValue: number | null;
    value: number | null;
    minValueSelected: number | null;
    maxValueSelected: number | null;
    isAllItemsChecked?: boolean;
    checkedItemsKeys: string[];
  }> | null;
  expanded: boolean;
  levelSelected: TargetView;
  levelSelectedDefault: TargetView;
  field: Field; // e.g.: "currency"
  levels: TargetView[]; // e.g.: ["parent", "supplier"]
  categories: CategoryName[]; // e.g.: ["commodity", "country"]
  filterType: FilterType;
  order: number;
}

export interface GlobalFiltersPanelBarItemItemData {
  name: Field;
  levels: TargetView[]; // e.g.: ["parent", "supplier"]
  levelDefault: TargetView;
  levelSelected: TargetView;
  isAllItemsChecked?: boolean;
  data?: MultipleCheckboxesCheckboxItem[];
  value?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  categories: CategoryName[]; // e.g.: ["commodity", "country"]
  filterType: FilterType;
  order: number;
}

export type GlobalFiltersPanelBarItemOptions = KeyValue<
  Field,
  | string[]
  | {
  value: string;
  items: string[] | { value: string; items: KeyValue<string, string>[] }[];
}[]
  | { minValue: number; maxValue: number }
>;

export interface MultipleCheckboxesCheckboxItem extends CheckboxItem {
  isSearchInputAvailable?: boolean;
  iconName?: string;
}

export interface CheckboxItem {
  checked: boolean;
  value: string; // label
  key: string;
}

export interface Category {
  name: CategoryName;
  enabled: boolean;
  amountAplied: number | null;
}

export type CategoryName =
  | "active"
  | "all"
  | "buyer"
  | "customFields"
  | "scfVcardDiscounting"
  | "geography"
  | "industry"
  | "opportunity"
  | "planAndExecute"
  | "savedFilters"
  | "sizeAndRating"
  | "spendVolumeAndPaymentTerms"
  | "dei"
  ;

export interface FiltersAPIParam {
  globalFilter: string | null;
  currencyRate: number | null;
  targetSpendFileVersionUuid: string | null;
  targetProgramUuid?: string | null;
  targetEntityType?: EntityType | null;
}

export interface FiltersGrouped {
  field: Field;
  fieldLabel?: string;
  level: TargetView;
  levelLabel?: string;
  value: string[];
  valueLabel?: string;
}

export interface FiltersApplied {
  filters: FiltersAppliedFieldLevel[];
  logic: "or" | "and"; // ? Use real logic operators
}

export interface FiltersAppliedFieldLevel {
  field: Field;
  fieldLabel?: string /** for the customDataPoints related fields, used for the title property for PanelBar and Badge Container of the saved filter field*/
  ;
  filters: Filter[];
  level: TargetView;
  logic: "or" | "and";
}

export interface Filter {
  field: Field;
  operator: "eq" | "gte" | "lte" | "contains";
  value: string | number;
}

// *** Global Filters Saved ***

export interface GlobalFiltersSaved {
  "@id": string;
  "@type": string;
  title: string;
  filters: FiltersApplied;
}

export interface FiltersApplied {
  filters: FiltersAppliedFieldLevel[];
  logic: "or" | "and"; // ? Use real logic operators
}

// export interface GlobalFiltersFieldsByLevelData {
//   spend: {
//     [key: FieldName]: { key: string; value: string }[] | null;
//   };
//   supplier: {
//     [key: FieldName]: { key: string; value: string }[] | null;
//   };
//   parent: {
//     [key: FieldName]: { key: string; value: string }[] | null;
//   };
// }

export interface GlobalFiltersTemplate {
  "@id": string;
  "@type": string;
  title: string;
  filters: FiltersApplied;
}

// *** END Global Filters Templates ***

// *** Payment Terms ***

/**
 * the proposedTerrms are spltting into opportunity and target
 */
export type PaymentTermKey =
  | "contractualTerms"
  | "currentTerms"
  | "proposedTerms"
  | "agreedNewTerms";

// *** END Payment Terms ***

// *** Payment Terms Strategies ***

export type PaymentTermsStrategyKey =
  | "buyerStandardStrategy"
  | "cashDiscountConversionStrategy"
  | "financingStrategy"
  | "industryRegionStandardStrategy"
  | "payOnTermsStrategy"
  | "peerGroupAvgStrategy"
  | "parentSupplierMaxStrategy"
  | "supplierStandardStrategy";

// *** END Payment Terms Strategies ***

// *** Financing Group ***

export interface FinancingGroup {
  "@id": string;
  baseRate: number;
  baseRatePresentation: string;
  baseRateType: string;
  color: string;
  financingName: string;
  financingRules: string[];
  fundingSpread: number;
  fundingSpreadPresentation: string;
  name: string;
  periodInMonths: number;
  priority: number;
  uuid: string;
}

// *** END Financing Group ***

// *** Analyze ***

// !! Work in progress
export namespace Analyze {
  export interface SpendsByProgramAndProviderAPIResponse {
    activeProgram: null | string;
    actualPaymentTerms: number;
    alias: string;
    alpha3Code: string;
    averageDaysToApproveInvoice: number;
    baseRate: number;
    box: string;
    buyerDomain: string;
    buyerIconUrl: string;
    buyerLeverage: string;
    buyerName: string;
    buyers: any;
    buyerUuid: string;
    buyerWacc: string;
    capturedCashDiscounts: number;
    cashDiscounts: number;
    cashFlowImpactLabel: string;
    commodity: string;
    onSCF: boolean | null;
    scfAccepted: boolean | null;
    scaleUsingFinancing: string | null;
    companySize: string;
    continent: string;
    contractualActual: number;
    contractualPaymentTermsWithCashDiscounts: number;
    contractualPaymentTermsWithoutCashDiscounts: number;
    countryCreditRating: string;
    countryName: string;
    creditScore: string;
    creditScoreSource: string;
    currency: string;
    customDataPoint1: null;
    customDataPoint2: null;
    customDataPoint3: null;
    disabled: boolean;
    endDate: string;
    entityNegotiationStatus: string;
    ethnicMinorityOwnedBusiness: boolean;
    externalId: string;
    finalSpread: string;
    financingColor: null;
    financingGroup: null;
    financingName: null;
    flagUrl: string;
    fundingCost: number;
    harmonizationColor: null;
    harmonizationGroup: null;
    harmonizationLevel: string;
    harmonizationName: null;
    hasDynamicHarmonization: boolean;
    idNumber: string;
    industry: string;
    industryNAICS: string;
    investVerteScore: number;
    isic: null;
    leverage: number;
    modelCashFlow: string;
    modelPaymentTerms: number;
    moodysScore: string;
    negotiationComplexity: string;
    negotiationId: null;
    negotiationStatus: string;
    negotiationStatusCode: number;
    newAgreedDateOfChange: null;
    newCashDiscounts: null;
    newNextReviewDate: null;
    newTermsWithCashDiscount: null;
    newTermsWithoutCashDiscount: null;
    originalSupplierName: string;
    outstanding: string;
    parentCompanyName: string;
    parentNegotiationStatus: string;
    periodInMonths: number;
    providerDomain: string;
    providerIconUrl: string;
    providerName: string;
    providerParentDomain: string;
    providerParentIconUrl: null;
    providerParentName: string;
    providerParents: any;
    providerParentUuid: string;
    providers: any;
    providerUuid: string;
    region: string;
    regulatoryTermsStrategy: null;
    regulatoryTermsStrategyModality: null;
    spendFileInternalID: string;
    spendUUID: string;
    spScore: string;
    startDate: string;
    successProbabilityLabel: string;
    targetOpportunity: number;
    team: string;
    typeID: string;
    uuid: string;
    veteranOwnedBusiness: boolean;
    volume: string;
    womanOwnedBusiness: boolean;
    dateOfLastTermNegotiation: {
      date: string;
      timezone_type: number;
      timezone: string;
    };
  }

  // *** Waterfall ***

  export interface AnalyzeWaterfall {
    collectionQueryName: string;
    columnsToExport: Array<any>;
    currencyRate: number;
    currentSelectedChart: string;
    dataForGrid: Array<any>;
    defaultCardHeight: string;
    gridColumns: Array<any>;
    hasFinancing: boolean;
    hasHarmonization: boolean;
    gridHeight: string;
    isActive: boolean;
    keyRefresh: number;
    levelOfGrid: number;
    list: Array<any>;
    loadExport: boolean;
    loadingGridData: boolean;
    loadingPotentialCashFlowWaterfallData: boolean;
    loadingPotentialPaymentTemsWaterfallData: boolean;
    pendingRequest: any | null;
    setDisabled: boolean;
    strategyCategorySelected: string | null;
    textForChart: string | null;
    textSizeForXAxis: string;
    totalNumberOfEntities: number;
    waterfallDataPotentialCashFlow: WaterfallDataByCashFlow[];
    waterfallDataPotentialPaymentTerms: Array<any>;
    programInrecalculation: boolean;
    showLoading: boolean;
    customHeaders: Array<any>;   
  }

  export interface WaterfallDataAPIResponse {
    byTerms: any[];
    byCashFlow: WaterfallDataByCashFlow[];
    original: {
      [key: string]: number;
    };
  }

  export interface WaterfallDataByCashFlow {
    period:
      | string
      | "payOnTerms"
      | "parentSupplierMax"
      | "industryRegionStandard"
      | "supplierStandard"
      | "peerGroupStandard"
      | "harmonization";
    strategy: string; // Related to period
    amount: number;
  }

  // *** END Waterfall ***
}

// *** END Analyze ***

// *** Entity Card ***

export namespace EntityCard {
  export type EntityCardPage =
    | "EntityCardNegotiation"
    | "EntityCardOffering"
    | "EntityCardCorporateTree"
    | "EntityCardCompanyDetails"
    | "EntityCardRatingsAndMetrics"
    | "EntityCardCalculator"
    | "EntityCardFinancing"
    | "EntityCardNews"
    | "EntityCardSupplierInsights"
    | "ReceivablesMockup3"
    | "ReceivablesMockup4"
    | "ReceivablesMockup5"
    | "EntityCardSupplierController";

  /** GENERAL VIEW OF ALL CARDS */
  export interface EntityCardData {
    apiFilteredOptions: Array<any>;
    filterOptions: Array<any>;
    currentSortedOption: string;
    loadingRecentSuppliers: boolean;
    searchQuery: string | null;
    filteredAppliedOptions: Array<any>;
    sortyByTableDisplaying: boolean;
    searchEntitySuppliers: Array<any>;
    suppliers: Array<any>;
    recentSuppliers: Array<any>;
    notRecently: boolean;
    userId: string;
    actualSpendFile: string;
    from: number;
    remainingItems: boolean;
    loadingRemainingItems: boolean;
    availableFilters: Array<any>;
    appliedFilterOptions: Array<any>;
    appliedFilter: Array<any>;
    sortedSelected: string;
  }

  export interface EntityCardAPIResponse {
    alpha3Code: string;
    buyers: string;
    companyType: EntityType;
    countryflagUrl: string;
    countryName: string;
    domain: string;
    isPilot: boolean;
    isSME: boolean;
    logoUrl: string;
    name: string;
    negotiationStatus: NegotiationStatus;
    negotiationStatusCodes: string; // NegotiationStatus as comma separated values in a string
    originalName: string;
    originalSupplierName: string,
    parentName: string;
    providersAmount: number;
    smeSource: string;
    spendsAmount: number;
    uuid: string;
    volume: number;
    onSCF?: boolean | null;
    scfAccepted?: boolean | null;
    scaleUsingFinancing?: string | null;
    receivedSupplierName?: string;
    // Potential-supplier approval state. null for anything that cannot be pending: parents carry
    // the flag on their children, real suppliers never need approving.
    isApprovedAndReadyToPublish?: boolean | null;
  }

  export interface EntityCardEntitiesCards {
    filterOptions: Array<any>;
    currentSortedOption: string;
    loadingRecentSuppliers: boolean;
    searchQuery: string | null;
    sortyByTableDisplaying: boolean;
    searchEntitySuppliers: any[];
    suppliers: any[];
    recentSuppliers: EntityCardAPIResponse[];
    notRecently: boolean;
    from: number;
    remainingItems: boolean;
    loadingRemainingItems: boolean;
    appliedFilterOptions: Array<any>;
    sortedSelected: string;
    calculumlayoutkey: number;
    selectedEntityObj: EntityCard.SelectedEntityObj;
    isEntityModalShowing: boolean;
    isEntityDropDownForDefaultAndPotentialShowing: boolean;
    entityCardType: EntityType;
    loadingCards: boolean;
  }

  export interface EntityDetails {
    buyerCountries: any;
    smeSource: string;
    averageDaysToApproveInvoice: number;
    buyerCountry: string;
    buyerName: string;
    bvdIdNumber: string;
    companyType: EntityType;
    countries: string[];
    currencies: string[];
    dateOfLastTermNegotiation: string;
    denominatorScore: number;
    denominatorScoreLabel: string;
    denominatorSimilarity: number;
    employees: number;
    externalId: string;
    foundedYear: number;
    idNumber: string;
    idType: string;
    negotiationStatus: NegotiationStatus;
    negotiationStatusCodes: string;
    originalSupplierName: string;
    phoneNumber: string;
    relationSince: string;
    supplierCountry: string;
    supplierCountryAlpha3Code: string;
    supplierCountryFlagUrl: string;
    supplierDomain: string;
    supplierEthnicMinorityOwnedBusiness: boolean;
    supplierLogoUrl: string;
    supplierName: string;
    supplierVeteranOwnedBusiness: boolean;
    supplierWomanOwnedBusiness: boolean;
    team: string;
    ultimateParentCompanyName: string;
    isSME: boolean;
  }

  export interface SelectedEntityObj {
    companyId: string;
    companyTypeForTheme?: string | null;
    country?: string;
    domain?: string;
    fromDifferentSupplier?: string | null;
    negotiationStatus: string | null;
    selectedTabIndex?: number;
    spendAlias?: number | null;
    spendVolume: string | null; // number??
  }

  export interface TreeCards {
    companyId: string;
    programId: string;
    programTarget: string;
    loading: boolean;
    toggleFilteredSpends: boolean;
    isGlobalFilterEmpty: boolean;
  }

  /*
  cashDiscountEnabled: boolean | null;
  cashDiscounts: string | null;
  contractualPaymentTermsWithCashDiscounts: number | null;
  contractualPaymentTermsWithoutCashDiscounts: number | null;
  hasResults: string | null;
  model_payment_terms: number | null;
  spend_volume: number | null;
  team: string | null;
  */
  export interface SpendProgramConfigByProviderAPIResponse {
    alias: string | null;
    approach: string | null;
    approachSupplierSavings: string | null;
    disabled: boolean;
    financingColor: string | null;
    financingGroup: string | null;
    financingName: string | null;
    harmonizationGroup: string | null;
    harmonizationLevel: string;
    hasDynamicHarmonization: boolean | null;
    negotiationId: string;
    spendUUID: string;
    uuid: string;
    cashDiscountEnabled: boolean; // ?
    cashDiscounts: string | null; // ?
    contractualPaymentTermsWithCashDiscounts: number | null; // ?
    contractualPaymentTermsWithoutCashDiscounts: number | null; // ?
    model_payment_terms: number | null; // ?
    spend_volume: number | null; // ?
    team: string | null; // ?
    onSCF?: boolean | null; // SCF feature
    scfAccepted?: boolean | null; // SCF feature
    scaleUsingFinancing?: string | null;
  }

  // TabsData extends SpendProgramConfig adding a new property called id
  export interface TabsData extends SpendProgramConfigByProviderAPIResponse {
    id: string;
    hasResults: string | null;
  }

  export interface FinancingGroupAPIResponse {
    "@id": string;
    name: string;
    color: string;
  }
}

// *** END Entity Card ***

// *** Match Data ***

export namespace Match {
  export interface Match {
    dataQuality: DataQuality;
    lineChart: LineChart;
    matchedPieChart: MatchedPieChart;
    includedPieChart: IncludedPieChart;
    excludedBarChart: ExcludedBarChartItem[];
    countriesMap: CountriesMap;
  }

  export type Metric = "numberOfSuppliers" | "numberOfSpends" | "spendVolume";

  export interface DataQuality {
    quality: number | null;
    confidenceScore: number | null;
    confidenceScoreLabel: string;
  }

  export interface LineChart {
    numberOfSuppliers: KeyValue<string, number>[] | null;
    numberOfSpends: KeyValue<string, number>[] | null;
    spendVolume: KeyValue<string, number>[] | null;
  }

  export interface MatchedPieChart {
    numberOfSuppliers: KeyValue<string, number>[];
    numberOfSpends: KeyValue<string, number>[];
    spendVolume: KeyValue<string, number>[];
  }

  export interface IncludedPieChart {
    numberOfSuppliers: KeyValue<string, number>[];
    numberOfSpends: KeyValue<string, number>[];
    spendVolume: KeyValue<string, number>[];
  }

  export interface ExcludedBarChartItem {
    reason: string;
    amount: number;
  }

  export interface CountriesMap {
    suppliers: CountriesMapItem[];
    buyers: CountriesMapItem[];
  }

  export interface CountriesMapItem {
    supplierOrBuyerCount: number;
    spendCount: number;
    volume: string;
    country: string;
    geoLat: number;
    geoLon: number;
  }

  export interface MatchAPIResponse {
    dataQuality: any;
    lineChart: {
      numberOfSuppliers: any;
      numberOfSpends: any;
      spendVolume: any;
    };
    matchedPieChart: {
      numberOfSuppliers: any;
      numberOfSpends: any;
      spendVolume: any;
    };
    includedPieChart: {
      numberOfSuppliers: any;
      numberOfSpends: any;
      spendVolume: any;
    };
    excludedBarChart: {
      numberOfSuppliers: Array<{ reason: string; amount: number; }>,
      numberOfSpends: Array<{ reason: string; amount: number; }>,
      spendVolume: Array<{ reason: string; amount: number; }>,

    },
    countriesMap: {
      suppliers: {
        supplierOrBuyerCount: number;
        spendCount: number;
        volume: string;
        country: string;
        geoLat: number;
        geoLon: number;
      }[];
      buyers: {
        supplierOrBuyerCount: number;
        spendCount: number;
        volume: string;
        country: string;
        geoLat: number;
        geoLon: number;
      }[];
    };
    result: string;
  }
}

// *** END Match Data ***

// ** Pop Over Data Type **

export interface PopoverData {
  key: string;
  title: string;
  body: string;
  linkto: string;
  btnText: string;
  steps: {
    attachTo?: {
      element: string;
      on: "bottom" | "top" | "left" | "right";
    };
    buttons: {
      action?: () => void;
      actionText: "back" | "next" | "complete" | "linkTo";
      classes?: string;
      text: string;
      linkTo?: string;
    }[];
    linkto?: string;
    text: string;
    title: string;
    titleClass?: string;
  }[];
}

// ** END Pop Over Data Type **

/** Start program dropdown */

export interface ProgramSelectedAndStatus {
  recalculationInProgress: any;
  selectedProgramId: any;
  pendingRecalculation: any;
  isBoxesRecalculating: any;
}

export interface ProgramDropdownValues {
  programsList: any;
}

export interface ProgramSpendInfo {
  supplierCount: number;
  spendCount: number;
  groupCount: number;
  totalSpend: number;
  ultimateParentCount: number;
  forecastVolume?: number | null
}

/** end program dropdown */

/** Program Distribution   */
export interface ProgramDistributionSpendVolume {
  totalVolume: number
  volumeVcard: number
  volumeTermExtension: number
  excludeVolume: number
}

export interface ProgramDistributionCountSuppliers {
  totalSuppliers: number
  SuppliersVcard: number
  SuppliersTermExtension: number
  excludeSuppliers: number
}

export interface ProgramDistributionCashFlow {
  totalCashFlow: number
  cashFlowVcard: number
  cashFlowTermExtension: number
  excludeCashFlow: number
}

export interface ProgramDistributionEconomicProfit {
  totalEconomicProfit: number
  economicProfitVcard: number
  economicProfitTermExtension: number
  excludeEconomicProfit: number
}

export interface ProgramDistributionResponse {
  spendVolume: ProgramDistributionSpendVolume
  countSuppliers: ProgramDistributionCountSuppliers
  cashFlow: ProgramDistributionCashFlow
  economicProfit: ProgramDistributionEconomicProfit
}
export interface ProgramDistributionBarTricolorProps {
  termExtScf: number,
  vcard: number,
  excluded: number,
  termExtScfTotal: number,
  vcardTotal: number,
  excludedTotal: number
}
export interface ProgramDistributionProps {
  spendVolume: ProgramDistributionBarTricolorProps
  countSuppliers: ProgramDistributionBarTricolorProps
  cashFlow: ProgramDistributionBarTricolorProps
  economicProfit: ProgramDistributionBarTricolorProps
}

/** end Program Distribution   */

// *** GNews API ***

export interface GNewsSource {
  name: string;
  url: string;
}

export interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: GNewsSource;
}

export interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

export interface GNewsSearchParams {
  query: string;
  lang?: string;
  country?: string;
  max?: number;
  page?: number;
  from?: string;
  to?: string;
}

export type GNewsErrorCode = 401 | 403 | 429 | 500;

export interface GNewsError {
  code: GNewsErrorCode;
  message: string;
}

// =====================================
// News Configuration Types
// =====================================

/**
 * Default terms available for selection in News configuration
 */
export const NEWS_CONFIG_DEFAULT_TERMS = [
  'Cash Flow',
  'Supply Chain',
  'Supply Chain Finance',
  'SCF',
  'Financing',
  'Procurement'
] as const;

/**
 * Default entity identifiers for Supplier News
 */
export const NEWS_CONFIG_DEFAULT_ENTITIES = [
  'Supplier Name',
  'Parent Name'
] as const;

/**
 * Maximum character limit for query string
 */
export const NEWS_CONFIG_MAX_QUERY_LENGTH = 200;

/**
 * Characters reserved for one company name in the Entity Card query. Setup cannot
 * know the supplier and parent names the query will carry at request time, so the
 * counter budgets this much per name against NEWS_CONFIG_MAX_QUERY_LENGTH.
 *
 * 42 is the 95th percentile of company name length, measured over 90,438 rows in
 * spend_parsed_company (p50 21, p90 35, p99 61, max 180).
 *
 * Note how tight this leaves Entity Card: with both names selected the terms get
 * NEWS_CONFIG_MAX_QUERY_LENGTH - (2 * 42 + 15) = 101 characters, and the six default
 * terms already spend 98 of them. Raising this further would make the default
 * configuration invalid.
 *
 * Must stay equal to SpendFileNewsConfig::ENTITY_NAME_ALLOWANCE in the back end,
 * otherwise the API would reject a configuration this screen showed as valid.
 */
export const NEWS_CONFIG_ENTITY_NAME_ALLOWANCE = 42;

/**
 * Minimum years back for news search
 */
export const NEWS_CONFIG_MIN_YEARS_BACK = 1;

/**
 * Maximum years back for news search
 */
export const NEWS_CONFIG_MAX_YEARS_BACK = 10;

/**
 * Default years back for news search (used in 'from' parameter)
 */
export const NEWS_CONFIG_DEFAULT_YEARS_BACK = 3;

/**
 * General News configuration section
 */
export interface NewsConfigGeneralNews {
  keywords: string;
  selectedTerms: string[];
  additionalTerms: string;
}

/**
 * Supplier News configuration section
 */
export interface NewsConfigSupplierNews {
  selectedEntities: string[];
  selectedTerms: string[];
  additionalTerms: string;
}

/**
 * Complete News configuration object
 * Configuration is stored at SpendFile level
 */
export interface NewsConfig {
  id?: number;
  generalNews: NewsConfigGeneralNews;
  supplierNews: NewsConfigSupplierNews;
  newsSearchYearsBack?: number;
}

/**
 * News configuration API response
 */
export interface NewsConfigResponse {
  success: boolean;
  data?: NewsConfig;
  error?: string;
  validationErrors?: string[];
  message?: string;
}

/**
 * News configuration defaults response
 */
export interface NewsConfigDefaultsResponse {
  success: boolean;
  data?: NewsConfig;
  constants?: {
    defaultTerms: string[];
    defaultEntities: string[];
    maxQueryLength: number;
    defaultYearsBack: number;
  };
}

// *** END GNews API ***

// *** Admin Backend ***

import type {PanelBarItemProps} from "@progress/kendo-vue-layout";
export type { SCFFileRefAPIResponse } from "@/modules/adminBackend/types";

// *** END Admin Backend ***
