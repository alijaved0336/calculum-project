export interface UserActionsInLogs {
  uuid: string;
  email: string;
  fullName: string;
}

/**
 * The 6 alert levels HomeNavbar's `showAlerts` emit carries, consumed by
 * `HomeBackend.vue` (which stores the raw number as `app.typeAlerts`) and
 * rendered by `HomeAlerts.vue` (`v-if="typeAlert === N"`). Named here so
 * the ~17 emit call sites read as intent instead of a bare integer — the
 * wire value for each level is unchanged.
 */
export const HOME_ALERT = {
  NONE: 0,
  NO_ACTIVE_SPEND_FILE: 1,
  SELECT_OTHER_COMPANY: 2,
  NOTHING_TO_SELECT: 3,
  FORBIDDEN: 4,
  PILOT_EXPIRED: 5,
} as const;
export type HomeAlertLevel = (typeof HOME_ALERT)[keyof typeof HOME_ALERT];

export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9'
];

export type CalculationMethod = 'min' | 'avg' | '3q' | 'max'

export type DistributionCharts =  'buyerLeverage'  | 'buyerCreditRating' | 'buyerCountry'

export type DistributionChartsPGS2 =  'buyerLeverage'  | 'buyerRegion' | 'buyerCountry' | 'supplierCountry' | 'supplierRegion'

export type ScopesForSupplierStandard = 'include' | 'only_if_no_match' | 'exclude'

export const DISTRIBUTION_CHART_OPTIONS: { value: DistributionCharts; label: string }[] = [
  { value: 'buyerLeverage',     label: 'Leverage (Buyer)' },
  { value: 'buyerCreditRating', label: 'Credit Rating (Buyer)' },
  { value: 'buyerCountry',      label: 'Country (Buyer)' },
]

export const DISTRIBUTION_CHART_OPTIONS_PGS2: { value: DistributionChartsPGS2; label: string }[] = [
  { value: 'buyerLeverage',     label: 'Leverage (Buyer)' },
  { value: 'buyerRegion',       label: 'Region (Buyer)' },
  { value: 'buyerCountry',      label: 'Country (Buyer)' },
  { value: 'supplierCountry', label: 'Country (Supplier)' },
  { value: 'supplierRegion', label: 'Region (Supplier)' },
  
]

export const VALUE_TO_USE_OPTIONS: { value: CalculationMethod; label: string }[] = [
  { value: 'min', label: 'Min' },
  { value: 'avg', label: 'Avg' },
  { value: '3q', label: '3Q' },
  { value: 'max', label: 'Max' },
]

export interface DataInterfaceCardsScroll {
  cards: Array<any>,
  collectionData: string,
  loadingData: boolean,
  loadMore: boolean,
  sortString: string,
  gridHeight: string
}


export interface PhaseAditionalInfo extends PlanPhase {
  number: number,
  period: number,
  startDate: string,
  endDate: string,
  phaseName: string,
  name: string,
  phaseNumber: number,
  spendVolume: number,
  spendVolumePercentage: number,
  spendCount: number,
  providerCount: number,
  parentCount: number,
  buyerCount: number,
  providerNegotiated: number,
  cashFlow: number,
  cashFlowPercentage: number,
  expectedCashFlow: number,
  vCardRebateOpportunity: number,
  vCardRebateOpportunityPercentage: number,
  vCardRebateExpected: number,
  vCardExpected: number,
  forecastVolume?: number | null,
  forecastVolumePercentage?: number | null
}


export interface DataInterfacePhase { 
  loadingPhaseInfo: boolean,
  phaseAditional: PhaseAditionalInfo,
  openCloseDetails: boolean,
  keyGaugebar: number,
  editPhaseName: boolean,
  newPhase: boolean
}

// Plan Overview HomePlanV2
export interface DataInterface {
  hasFinancing: boolean,
  hasHarmonization: boolean,
  refreshComponent: number,
  activeTab: string,
  cardHeight: string,
  currentSelectedChart: {
    chartTitle: string,
    xAxisTitle: string,
    yAxisTitle: string,
    dataSeries: Array<any>,
    categoriesData: Array<any>,
  },
  dataItems: Array<any>,
  dataTimeline: Array<any>,
  deletePhaseId: string,
  fullScreen: boolean,
  hasNullDates: boolean,
  hideTheTimeLineChart: boolean,
  isShowDeletePhaseConfirm: boolean,
  loading: boolean,
  loadingPhases: boolean,
  loadingTimelinechart: boolean,
  phases: Array<any>,
  phasesForPhaseCards: Array<any>,
  planMarked: boolean,
  selectedChartType: string,
  selectedTabIndex: number,
  tableKey: number,
  tabs: Array<any>,
  targetProgram: string,
  keyPhase: number,
  showNewPhase: boolean,
  planPhases: Array<any>,
  noRestPhases: Array<any>,  
  planData: {
    days: number,
    dimension: string,
    program: string,
    startDate: string,
    endDate: string,
    recomendStartDate: string,
    period: number,
    targetProgram: string,
    levelHarmonization: string,
    planName: string,
    programName: string
  },
  phasesHadChanges: Array<any>,
  showConfirmModal: boolean,
  loadingActionsPhases: boolean,
  dataForKendoChart: Array<any>,
  dataForKendoChartRebate: Array<any>,
  isBigNumber: boolean,
  loadingChartData: boolean,
  toggleShowMore: boolean,
  valueAxis: {
    min: number,
    max: number,
    majorUnit: number,
    labels: {
      template : string,
    }
  },
  programInrecalculation: boolean,
  pendingRecalculation: boolean,
  planStatus: {
    pendingRecalculation: boolean,
    planInrecalculation: boolean
  },
  waterFallOptions: Array<any>,
  waterFallSelectedOption: string,
  dataForWaterfall: Array<any>,
  loadingWaterFallData: boolean,
  waterFallDataSeries: Array<any>,
  waterFallCategoriesData: Array<any>,
  showIndividualPhase: boolean,  
  phaseToEdit: PhaseAditionalInfo | null,
  showPhaseToEdit: boolean,
  summaryPromises: Array<any>
}

// Home Company Settings
export interface HomeCompanySettings {
  currentTab: string;
  withChanges: boolean;
  showModal: boolean;
  tabtoChange: string;
  isAdmin: boolean;
  spendFileInrecalculation: boolean;
  key: number;
}


// Home Buyer Standard Settings
export interface HomeBuyerStandardSettings {
  availableFilters: Array<any>;
  buyerStandardGroupIndex: number;
  buyerStandardGroups: Array<any>;
  buyerStandardGroupsDeleted: Array<any>;
  currentSelectedObjForDeletingIndex: number;
  currentSelectedObjForDeletingObj: {
    color: string;
    buyerStandardName: string;
    paymentTerms: number;
    name: string;
    buyerStandardRules: Array<any>;
  };
  currentSelectedBuyerStandardGroup: {
    color: string;
    buyerStandardName: string;
    paymentTerms: number;
    name: string;
    buyerStandardRules: Array<any>;
  };
  changingInputField: boolean;
  dragDropGroupIndex: number;
  dragToSpecificIndex: number;
  editSelectedBuyerStandardGroup: {
    condition: string;
    field: string;
    multi: [] | null;
    filterOne: { operator: string; value: string } | null;
    filterTwo?: { operator: string; value: string } | null;
  };
  financingGroupsRules: Array<any>;
  buyerStandardNameMaxLength: number;
  groupBuyerStandardIndex: number;
  hasErrors: boolean;
  isEditMode: boolean;
  isGroupItemCurrentlyDragged: boolean;
  isMouseHoveringOverDragIcon: boolean;
  loadingBuyerStandardGroups: boolean;
  parsingGroups: boolean;
  selectedDefaultColor: number;
  showFilter: boolean;
  showConfirmModal: boolean;
  showDeleteConfirmation: boolean;
  isSavingGroups: boolean;
  hasPaymentTermsError: boolean;
  hasBuyerStandardNameError: boolean;
  isLoadingFilters: boolean;
  showModal: boolean;
  saveNContinue: any;
  loadingPatch: boolean;
  showMoreSettings: boolean;
  currentGroupIndex: number;
}



interface vCardProvider  {
  vCardProvider: string,
  selected: boolean,
  acceptanceTypes: [
    {
      id: string,
      vCardProvider: string,
      acceptanceType: string,
      enrollment: number,
      description: string,
      enrollmentPresentation: string,
      priority: number
    }
  ],
  acceptanceTypesTemplates: [
    {
      id: string,
      vCardProvider: string,
      acceptanceType: string,
      enrollment: number,
      description: string,
      enrollmentPresentation: string,
      priority: number
    }
  ]
}

export interface VcardInfo {
    company: string,
    vCardGroupsEnabled: boolean,
    vCardProvider: string | null,
    vCardAllowsTermsExtension: boolean,
    vCardDefaultEnrollment: number,
    vCardMinimumProbabilityOfSuccess: number
    vCardProviders: Array<any>,
    groups: Array<any>
}


// export interface HomeCardGroupsSettings {
//   availableFilters: Array<any>;
//   cardGroupIndex: number;
//   vCardGroupsInfo: VcardInfo | null;
//   cardGroups: Array<any>;
//   cardGroupsInitial: Array<any>;
//   vCardProvider: vCardProvider| null;
//   vCardProviderInitial: vCardProvider| null;
//   cardGroupsDeleted: Array<any>;
//   currentSelectedObjForDeletingIndex: number;
//   currentSelectedObjForDeletingObj: {
//     color: string;    
//     vCardGroupRules: Array<any>;
//   };
//   currentSelectedCardGroup: {
//     color: string;    
//     vCardGroupRules: Array<any>;
//   };
//   changingInputField: boolean;
//   dragDropGroupIndex: number;
//   dragToSpecificIndex: number;
//   editSelectedCardGroup: {
//     condition: string;
//     field: string;
//     multi: [] | null;
//     filterOne: { operator: string; value: string } | null;
//     filterTwo?: { operator: string; value: string } | null;
//   };
//   financingGroupsRules: Array<any>;
//   buyerStandardNameMaxLength: number;
//   groupCardSelectIndex: number;
//   hasErrors: boolean;
//   isEditMode: boolean;
//   isGroupItemCurrentlyDragged: boolean;
//   isMouseHoveringOverDragIcon: boolean;
//   loadingBuyerStandardGroups: boolean;
//   parsingGroups: boolean;
//   selectedDefaultColor: number;
//   showFilter: boolean;
//   showConfirmModal: boolean;
//   showDeleteConfirmation: boolean;
//   isSavingGroups: boolean;
//   hasPaymentTermsError: boolean;
//   hasBuyerStandardNameError: boolean;
//   isLoadingFilters: boolean;
//   showModal: boolean;
//   saveNContinue: any;
//   loadingPatch: boolean;
//   showMoreSettings: boolean;
//   currentGroupIndex: number;
//   dropdownOptions: Array<any>;
//   vCardProviderSelected: string;
//   vCardsGroupsEnabled: boolean;
//   vCardsGroupsEnabledInitial: boolean;
//   defaultEnrollment:  number | null;
//   defaultEnrollmentInitial: number | null;
//   defaultEnrollmentPresentation: string | null;
//   allowTermsExtension: boolean;
//   allowTermsExtensionInitial: boolean;
//   defaultEnrollmentError: string | null;
//   somethingIsChanged: boolean;
//   showErrorRules: boolean;
//   haveAcceptanceTypes: boolean;
  
// }

export interface HomeNavBar {
  searchCompany: string;
  searchSpendFile: string;
  companyList: Array<{
    "@id": string;
    "@type": string;
    name: string;
  }>;
  currency: string;
  currencyDate: string;
  currencyFrom: string;
  intervalDownCount: any;
  isLoadingChangeSpendFile: boolean;
  isLoadingMessages: boolean;
  isLoadingNotificationMarkAsRead: boolean;
  keyGlobalFilter: number;
  loading: boolean;
  notificationAmountNotes: Array<any>;
  notificationAmountOther: Array<any>;
  notificationClickedId: string;
  notLoadingCurrency: boolean;
  searchCurrency: string;
  searchQuery: string;
  selectedCompany: string;
  status403: boolean;
  status410: boolean;
  toggleCompanyDropdown: boolean;
  toggleCurrencyDropdown: boolean;
  toggleSpendFileDropdown: boolean;
  unreadNotifications: Array<any>;
  currentPage: number;
  hasMoreNotifications: boolean;
  isLoadingMoreNotifications: boolean;
  isLoadingInitialNotifications: boolean;
  totalUnreadNotificationsCount: number;
  isMarkingAsRead: boolean;
  isDeletingMessage: boolean;
  isMarkingAllAsRead: boolean;
}


export interface Plan {
  "@id"?: string;
  "@type"?: string;
  program?: {
    "@id"?: string;
    "@type"?: string;
    name?: string;
    programTarget?: string;
    harmonizationLevel?: string;
    created?: string;
    createdBy?: {
      "@id"?: string;
      "@type"?: string;
      firstName?: string;
      lastName?: string;
      created?: string;
      createdBy?: {
        "@id"?: string;
        "@type"?: string;
        firstName?: string;
        lastName?: string;
        created?: string;
        createdBy?: {
          "@id"?: string;
          "@type"?: string;
          firstName?: string;
          lastName?: string;
        };
      };
    };
  };
  title?: string;
  target?: string;
  amountType?: string;
  amount?: string;
  startDate?: string;
  endDate?: string;
  marked?: boolean;
  period?: number;
  automateSingleDimensionEnabled?: boolean;
  automateMultiDimensionEnabled?: boolean;
  automateMultiDimensionPhases?: number;
  dimensionType?: string;
  planPhases?: PlanPhase[];
  created?: string;
  createdBy?: {
    "@id"?: string;
    "@type"?: string;
    firstName?: string;
    lastName?: string;
    created?: string;
    createdBy?: {
      "@id"?: string;
      "@type"?: string;
      firstName?: string;
      lastName?: string;
      created?: string;
      createdBy?: {
        "@id"?: string;
        "@type"?: string;
        firstName?: string;
        lastName?: string;
      };
    };
  };
  programInrecalculation?: boolean;
  pendingRecalculation?: boolean;
}

interface PlanPhase {
  "@id"?: string;
  "@type"?: string;
  number?: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  isRest?: boolean;
  period?: number;
  created?: string;
  createdBy?: {
    "@id"?: string;
    "@type"?: string;
    firstName?: string;
    lastName?: string;
    created?: string;
    createdBy?: {
      "@id"?: string;
      "@type"?: string;
      firstName?: string;
      lastName?: string;
      created?: string;
      createdBy?: {
        "@id"?: string;
        "@type"?: string;
        firstName?: string;
        lastName?: string;
      };
    };
  };
}

export interface HomeManageTeam {
  amountOfUsers: number,
  dataFormEdit: any,
  deleteUserObj: any,
  email: string,
  findByName: string,
  firstName: string,
  formErrorMessage: string,
  formHasError: boolean,
  getCompanyUsers: Array<any>,
  isForRevoking: boolean,
  isNewUser: boolean,
  isUserAddOrEditFormShown: boolean,
  key: number,
  largeScreen: number,
  lastName: string,
  limitUsers: number,
  listUsersColumns: Array<any>
  loadingInviteUsers: boolean,
  loadingLimitUsersValue: boolean,
  loadingUsers: boolean,
  mediumScreen: number,
  pagable: Array<any>,
  pageSizeNumber: number,
  roles: any,
  showDeleteConfirmModal: boolean,
  showInviteUserSuccess: boolean,
  showRevokeAccessModal: boolean,
  smallScreen: number,
  typeOfFormShown: string,
  userID: string,
  userObj: any,
  users: Array<any>,
  widthScreen: number,
  XlargeScreen: number,
  showConfirmModalResetIdentityProvider: boolean;
  homeManageTeam: {
    id: string,
    company: string
  }
}