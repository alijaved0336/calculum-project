import {
  ProgramDistributionProps,
  ProgramSpendInfo
} from '@/types';

//* To-Do create a common interface for all opportunity views */

export interface ItemSelectedInCharts {
  groupName: string,
  optionName: string,
  name: string,
  secondaryName: string | null | undefined
}

export interface AnalyzeProgramOverview {
  itemSelectedInCharts: ItemSelectedInCharts,
  expectedCashFlow: number | null,
  financingGroups: Array<Partial<FinancingGroup>>,
  harmonizationGroups: Array<Partial<HarmonizationGroup>>,
  isLoadingFinancingGroups: boolean,
  isLoadingHarmonizationGroups: boolean,
  isLoadingVcardInfo: boolean,
  isModalFullFinancingGListShowing: boolean,
  isModalFullHarmGListShowing: boolean,
  keyMetricsComponent: number,
  keyMetricsComponent2: number,
  forRenderkeyMetricsComponent: number,
  forRenderkeyMetricsComponent2: number,
  loading: boolean,
  paymentCycleDays: number | null,
  programName: string,
  programPaymentTerms: {
    contractual: number | null,
    current: number | null,
    expected: number | null,
    proposed: number | null,
    paymentCycleFloat: number | null,
    expectedFloat: number | null,
  },
  programPaymentTermsLoading: boolean,
  programPotentials: {
    cashFlowValue: number,
    savingsValue: number,
    colorCashFlow: string,
    colorSavings: string,
    cashFlow: string,
    savings: string,
    marginCashFlow: string,
    marginSavings: string
  },
  programPotentialsLoading: boolean,
  programSpendInfo: Partial<ProgramSpendInfo>,
  programSpendInfoLoading: boolean,
  showGraphicFullScreenChart1: boolean,
  showGraphicFullScreenChart2: boolean,
  vCardInfo: {
    economicProfit: number | null,
    economicProfitExpected: number | null,
    expectedCashFlow: number | null,
    potentialCashFlow: number | null,
    potentialSavings: number | null,
    vCardRebate: number | null,
    vCardRebateExpected: number | null,
    vCardRebateFull: number | null
  },
  programDistribution: ProgramDistributionProps,
  loadingProgramDistribution: boolean
}


export interface HomeAnalyzeProgramNineBoxes {
  allowsBoxes: boolean;
  box9key: number;
  boxesInfo: Array<any>;
  cloneName: string;
  createProgranBoolean: boolean;
  formErrorMessage: string;
  formHasError: boolean;
  gridKey: number;
  hasFinancing: boolean;
  hasHarmonization: boolean;
  isBoxesRecalculating: boolean;
  loading: boolean;
  loadingDataBoxes: boolean;
  loadingSelectAll: boolean;
  selectedBoxesArray: Array<any>;
  selectedLevel: string;
  selectedTabIndex: number;
  setDefault: boolean;
  showNewCloneNameModal: boolean;
  showTableInfoModal: boolean;
  showUserOptions: boolean;
  tableInfoModalObj: any;
  tabs: Array<any>;
  programInrecalculation: boolean;
  gridKeyFinancing: number;
  gridKeyVcard: number;
  gridKeySCF: number;
}


export interface AnalyzeProgramList {
  gridHeight: string;
  hasFinancing: boolean,
  hasHarmonization: boolean,
  keyLists: number;
  loading: boolean;
  programInrecalculation: boolean;
  showLists: boolean;
  showGrids?: boolean;
  showLoading: boolean;
  isSelectable?: boolean;
  selectedSpendFileVersion?: string | null;
  selectedItems?: any[];
}

export interface AnalyzeNewProgram4 {
  activateEdits: boolean;
  addFinancing: string;
  availableFilters: Array<any>;
  clickedOnSave: boolean;
  currentGroupObj: {
    baseRate: string;
    baseRateType: string;
    color: string;
    financingName: string;
    fundingSpread: string;
    name: string;
    financingRules: Array<any>;
  };
  currentlySelectedEditedFilterObj: {
    field: string;
    multi: Array<any>;
    filterRuleOneOperator: string;
    filterRuleOneValue: string;
    filterRuleCondition: string;
    filterRuleTwoOperator: string;
    filterRuleTwoValue: string;
    filterCategoryType: string;
  };
  continueWithRecalculationBoolean: boolean;
  continueWithRecalculationHarmonizationBoolean: boolean;
  dataProgram: Array<any>;
  deleteFinancingGroups: boolean;
  deleteHarmonizationGroups: boolean;
  displayModelForHarmonization: boolean;
  editFilterObj: {
    condition: string;
    field: string;
    multi: [] | null;
    filterOne: { operator: string; value: string } | null;
    filterTwo?: { operator: string; value: string } | null;
  };
  editedFinanceFilterObj: {
    condition: string;
    field: string;
    multi: [] | null;
    filterOne: { operator: string; value: string } | null;
    filterTwo?: { operator: string; value: string } | null;
  };
  financingGroups: Array<any>;
  finanKey: number;
  forEditFinancing: boolean;
  forEditHarmonization: boolean;
  gridColumns: Array<any>;
  gridColumnsParents: Array<any>;
  gridColumnsSuppliers: Array<any>;
  harmoKey: number;
  hasFinancing: boolean;
  isEditMode: boolean;
  isRuleFilterShowing: boolean;
  isSaveAndRecalculateModalShowing: boolean;
  isShowConfirmModalDelete: boolean;
  isShowConfirmProgramRecalculationShowing: boolean;
  labelLevel: string;
  levelFinancingFromGrid: string;
  levelHarmonizationFromGrid: string;
  list: Array<any>;
  listParents: Array<any>;
  listSuppliers: Array<any>;
  loading: boolean;
  loadingData: boolean;
  loadingExtraData: boolean;
  loadingParents: boolean;
  loadingSpends: boolean;
  loadingSuppliers: boolean;
  madeChangesInFilter: boolean;
  modalSpends: boolean;
  nameActiveProgram: string;
  redirectToSomewhereElseThanProgramOverview: boolean;
  selectAllSuppliers: boolean;
  selected: boolean;
  selectedItems: Array<any>;
  selectedSpendFileVersion: string;
  selectedTabDD: string;
  selectedTabIndex: number;
  selectedTabValue: string;
  showFinancingModal: boolean;
  showModalRecalculation: boolean;
  singleSpend: boolean;
  spendsActive: number;
  tabs: Array<any>;
  termsGroups: Array<any>;
  userMadeChangesInFinanceGroups: boolean;
  userMadeChangesInHarmonizationGroups: boolean;
  uuidSpendFromGrid: string;
  validateName: string;
}

export interface ProgramCFEdit {
  activateEdits: boolean;  
  dataProgram: Array<any>;  
  hasFinancing: boolean;
  hasHarmonization: boolean;
  labelLevel: string;
  levelFinancingFromGrid: string;
  levelHarmonizationFromGrid: string;
  list: Array<any>;
  listSuppliers: Array<any>;
  loading: boolean;
  madeChangesInFilter: boolean;
  modalSpends: boolean;
  nameActiveProgram: string;
  recalculatedNoRedirect: boolean;
  redirectToSomewhereElseThanProgramOverview: boolean;
  resethasFinancing: boolean;
  resethasHarmonization: boolean;
  selectAllSuppliers: boolean;
  selectedSpendFileVersion: string;
  selectedTab: string;
  showGrids: boolean;
  validateName: string;
  programInrecalculation: boolean;
  pendingRecalculation: boolean;
  keyList: number;
  isSelectable: boolean;
}

export interface Program {
  "@context": string;
  "@id": string;
  "@type": string;
  allowsBoxes: boolean;
  approvalTime: number;
  approvalTimeSource: string;
  automateFinancingInProcess: boolean;
  automateFinancingTerms: boolean;
  automateHarmonizationBasedOn: string;
  automateHarmonizationInProcess: boolean;
  automateHarmonizationMultiplier: number;
  automateHarmonizationNumGroups: number;
  automateHarmonizationRoundOn: string;
  automateHarmonizationTerms: boolean;
  bottomLeftChart: string;
  bottomRightChart: string;
  byExclusionRules: boolean;
  cashDiscountEnabled: boolean;
  configurationInProcess: boolean;
  created: string;
  createdBy: any;
  expectedCashFlow: number;
  expectedPaymentTerms: number;
  externalFinancingEnabled: boolean;
  harmonizationLevel: string;
  humanDate: string;
  inclusiveExclusiveRules: [];
  isActive: boolean;
  isBoxesRecalculating: boolean;
  isRecentlyCreated: boolean;
  lastCalculation: string;
  lastChange: string;
  marked: boolean;
  name: string;
  pendingRecalculation: boolean;
  plans: [];
  processingTotal: boolean;
  programTarget: string;
  queueMessages: [];
  recalculationInProgress: boolean;
  spendFileVersion: {
    "@id": string;
    "@type": string;
    version: number;
    name: string;
    created: string;
    updated: string;
    /**
     "createdBy": {
     "@id": "/api/users/dbb0952d-d9c3-480c-be0b-8c612c0a201f",
     "@type": "User",
     "email": "rolando+testsuperadmin@calculum.ai",
     "firstName": "Rolando",
     "lastName": "(Super Admin)",
     "created": "2023-08-08T18:13:01+00:00",
     "updated": "2023-10-03T23:11:11+00:00",
     "createdBy": {
     "@id": "/api/users/b666d622-1088-49b6-9f5e-f59a3edc3dbf",
     "@type": "User",
     "email": "joel+testnotadmin@calculum.ai",
     "firstName": "Joel",
     "lastName": "Not Admin",
     "created": "2023-01-13T15:30:51+00:00",
     "updated": "2024-01-08T16:30:19+00:00",
     "humanDate": "1 year from now"
     },
     "humanDate": "9 months from now"
     },
     }
     */
    createdBy: any;
    humanDate: string;
  };
  termHarmonizationEnabled: boolean;
  topLeftChart: string;
  topRightChart: string;
  updated: string;
  updatedBy: any;
}

export interface FinancingGroup {
  "@id": string;
  "@type": string;
  baseRate: number;
  baseRateType: string;
  color: string;
  financingName: string;
  financingRules: any[];
  fundingSpread: number;
  name: string;
  periodInMonths: number;
  priority: number;
  program: string;
  isAutoBaseRate?: boolean;
}

export interface HarmonizationGroup {
  "@id": string;
  "@type": string;
  cashDiscount: number;
  color: string;
  name: string;
  paymentTermsWithCashDiscountDays: number;
  paymentTermsWithoutCashDiscountDays: number;
  program: string;
}

export interface HomeAnalyzeProgramNineBoxesTable {
  currentTableSelected: any;
  currentTabSelected: string;
  selectedBoxesArray: Array<any>;
  selectedBoxesInfoSummary: any;
  selectedBoxesPercentage: {
    selectedBoxesPercentageActualPaymentTerms: string;
    selectedBoxesPercentageBuyers: string;
    selectedBoxesPercentageCashflow: string;
    selectedBoxesPercentageContractualPaymentTerms: string;
    selectedBoxesPercentageDiscounts: string;
    selectedBoxesPercentageEconomicProfit: string;
    selectedBoxesPercentageExpectedCashFlow: string;
    selectedBoxesPercentageExpectedPaymentTerms: string;
    selectedBoxesPercentageParents: string;
    selectedBoxesPercentagePaymentTermsOpportunity: string;
    selectedBoxesPercentageSpends: string;
    selectedBoxesPercentageSuppliers: string;
    selectedBoxesPercentageVolume: string;
  };
  selectedBoxesTotalBigNumber: {
    selectedBoxesTotalActualPaymentTermsBigNumber: string;
    selectedBoxesTotalBuyersBigNumber: string;
    selectedBoxesTotalCashflowBigNumber: string;
    selectedBoxesTotalContractualPaymentTermsBigNumber: string;
    selectedBoxesTotalDiscountsBigNumber: string;
    selectedBoxesTotalEconomicProfitBigNumber: string;
    selectedBoxesTotalExpectedCashFlowBigNumber: string;
    selectedBoxesTotalExpectedPaymentTermsBigNumber: string;
    selectedBoxesTotalParentsBigNumber: string;
    selectedBoxesTotalPaymentTermsOpportunityBigNumber: string;
    selectedBoxesTotalSpendsBigNumber: string;
    selectedBoxesTotalSuppliersBigNumber: string;
    selectedBoxesTotalVolumeBigNumber: string;
  };
  selectedBoxesTotal: {
    selectedBoxesNumbers: Array<any>;
    selectedBoxesTotalActualPaymentTerms: number;
    selectedBoxesTotalBuyers: number;
    selectedBoxesTotalCashflow: number;
    selectedBoxesTotalContractualPaymentTerms: number;
    selectedBoxesTotalDiscounts: number;
    selectedBoxesTotalEconomicProfit: number;
    selectedBoxesTotalExpectedCashFlow: number;
    selectedBoxesTotalExpectedPaymentTerms: number;
    selectedBoxesTotalParents: number;
    selectedBoxesTotalPaymentTermsOpportunity: number;
    selectedBoxesTotalSpends: number;
    selectedBoxesTotalSuppliers: number;
    selectedBoxesTotalVolume: number;
    selectedBoxesTotalContractualPaymentTermsNotWeighted: number;
    selectedBoxesTotalActualPaymentTermsNotWeighted: number;
    selectedBoxesTotalPaymentTermsOpportunityNotWeighted: number;
    selectedBoxesTotalExpectedPaymentTermsNotWeighted: number;
  };
  selectedBoxesStringValue: string;
  showZeroBoxSection: boolean;
  totalBoxesInfoSummary: any;
  totalBoxes: {
    totalActualPaymentTerms: number;
    totalBuyers: number;
    totalCashflow: number;
    totalContractualPaymentTerms: number;
    totalDiscounts: number;
    totalEconomicProfit: number;
    totalExpectedCashFlow: number;
    totalExpectedPaymentTerms: number;
    totalParents: number;
    totalPaymentTermsOpportunity: number;
    totalSpends: number;
    totalSuppliers: number;
    totalVolume: number;
  };
  totalBoxesBigNumber: {
    totalActualPaymentTermsBigNumber: string;
    totalBuyersBigNumber: string;
    totalCashflowBigNumber: string;
    totalContractualPaymentTermsBigNumber: string;
    totalDiscountsBigNumber: string;
    totalEconomicProfitBigNumber: string;
    totalExpectedCashFlowBigNumber: string;
    totalExpectedPaymentTermsBigNumber: string;
    totalParentsBigNumber: string;
    totalPaymentTermsOpportunityBigNumber: string;
    totalSpendsBigNumber: string;
    totalSuppliersBigNumber: string;
    totalVolumeBigNumber: string;
    totalWeightedActualPaymentTerms: number;
    totalWeightedContractualPaymentTerms: number;
    totalWeightedExpectedPaymentTerms: number;
    totalWeightedPaymentTermsOpportunity: number;
  };
  weightedCalculations: {
    selected: {
      selectedBoxesTotalExpectedPaymentTermsWeighted: number;
      selectedBoxesTotalPaymentTermsOpportunityWeighted: number;
      selectedBoxesTotalContractualPaymentTermsWeighted: number;
      selectedBoxesTotalActualPaymentTermsWeighted: number;
      totalVolumeWeight: number;
    };
    total: {
      totalWeightedContractualPaymentTerms: number;
      totalWeightedActualPaymentTerms: number;
      totalWeightedPaymentTermsOpportunity: number;
      totalWeightedExpectedPaymentTerms: number;
      totalVolumeWeight: number;
    };
  };
}


export interface HomeAnalyzeProgramNineBoxesTableVcard {
  currentTableSelected: any;
  currentTabSelected: string;
  selectedBoxesArray: Array<any>;
  selectedBoxesInfoSummary: any;
  selectedBoxesPercentage: {
    selectedBoxesPercentageEconomicProfit: string;
    selectedBoxesPercentageRebateCashFlow: string;

    selectedBoxesPercentageActualPaymentTerms: string;

    selectedBoxesPercentageCashflow: string;
    selectedBoxesPercentageContractualPaymentTerms: string;
    selectedBoxesPercentageDiscounts: string;

    selectedBoxesPercentageExpectedPaymentTerms: string;
    selectedBoxesPercentageParents: string;
    selectedBoxesPercentagePaymentTermsOpportunity: string;
    selectedBoxesPercentageSpends: string;
    selectedBoxesPercentageSuppliers: string;
    selectedBoxesPercentageVolume: string;
  };
  selectedBoxesTotalBigNumber: {
    selectedBoxesTotalEconomicProfitNumber: string;
    selectedBoxesTotalRebateCashFlowBigNumber: string;


    selectedBoxesTotalActualPaymentTermsBigNumber: string;

    selectedBoxesTotalCashflowBigNumber: string;
    selectedBoxesTotalContractualPaymentTermsBigNumber: string;
    selectedBoxesTotalDiscountsBigNumber: string;

    selectedBoxesTotalExpectedPaymentTermsBigNumber: string;
    selectedBoxesTotalParentsBigNumber: string;
    selectedBoxesTotalPaymentTermsOpportunityBigNumber: string;
    selectedBoxesTotalSpendsBigNumber: string;
    selectedBoxesTotalSuppliersBigNumber: string;
    selectedBoxesTotalVolumeBigNumber: string;
  };
  selectedBoxesTotal: {
    selectedBoxesTotalRebateCashFlow: number;
    selectedBoxesTotalEconomicProfit: number;

    selectedBoxesNumbers: Array<any>;
    selectedBoxesTotalActualPaymentTerms: number;

    selectedBoxesTotalCashflow: number;
    selectedBoxesTotalContractualPaymentTerms: number;
    selectedBoxesTotalDiscounts: number;

    selectedBoxesTotalExpectedPaymentTerms: number;
    selectedBoxesTotalParents: number;
    selectedBoxesTotalPaymentTermsOpportunity: number;
    selectedBoxesTotalSpends: number;
    selectedBoxesTotalSuppliers: number;
    selectedBoxesTotalVolume: number;
    selectedBoxesTotalContractualPaymentTermsNotWeighted: number;
    selectedBoxesTotalActualPaymentTermsNotWeighted: number;
    selectedBoxesTotalPaymentTermsOpportunityNotWeighted: number;
    selectedBoxesTotalExpectedPaymentTermsNotWeighted: number;
  };
  selectedBoxesStringValue: string;
  showZeroBoxSection: boolean;
  totalBoxesInfoSummary: any;
  totalBoxes: {
    totalEconomicProfit: number;
    totalRebateCashFlow: number;

    totalActualPaymentTerms: number;
    totalCashflow: number;
    totalContractualPaymentTerms: number;
    totalDiscounts: number;

    totalExpectedPaymentTerms: number;
    totalParents: number;
    totalPaymentTermsOpportunity: number;
    totalSpends: number;
    totalSuppliers: number;
    totalVolume: number;
  };
  totalBoxesBigNumber: {
    totalEconomicProfitBigNumber: string;
    totalRebateCashFlowBigNumber: string;

    totalActualPaymentTermsBigNumber: string;

    totalCashflowBigNumber: string;
    totalContractualPaymentTermsBigNumber: string;
    totalDiscountsBigNumber: string;

    totalExpectedPaymentTermsBigNumber: string;
    totalParentsBigNumber: string;
    totalPaymentTermsOpportunityBigNumber: string;
    totalSpendsBigNumber: string;
    totalSuppliersBigNumber: string;
    totalVolumeBigNumber: string;
    totalWeightedActualPaymentTerms: number;
    totalWeightedContractualPaymentTerms: number;
    totalWeightedExpectedPaymentTerms: number;
    totalWeightedPaymentTermsOpportunity: number;
  };
  weightedCalculations: {
    selected: {
      selectedBoxesTotalExpectedPaymentTermsWeighted: number;
      selectedBoxesTotalPaymentTermsOpportunityWeighted: number;
      selectedBoxesTotalContractualPaymentTermsWeighted: number;
      selectedBoxesTotalActualPaymentTermsWeighted: number;
      totalVolumeWeight: number;
    };
    total: {
      totalWeightedContractualPaymentTerms: number;
      totalWeightedActualPaymentTerms: number;
      totalWeightedPaymentTermsOpportunity: number;
      totalWeightedExpectedPaymentTerms: number;
      totalVolumeWeight: number;
    };
  };
}


export interface AnalyzeExternalFinancing {
  automate: boolean;
  baseRateTypeItems: Array<string>;
  baseRateTypes: Array<any>;
  colors: Array<string>;
  dragDropGroupIndex: number;
  dragToSpecificIndex: number;
  financeGroupIndex: number;
  groupFinanceRulesIndex: number;
  groups: /* FinancingGroup[] */ any[];
  groupsDeleted: Array<any>;
  groupsNumber: number;
  hasErrors: boolean;
  isGroupItemCurrentlyDragged: boolean;
  isModalShowing: boolean;
  isMouseHoveringOverDragIcon: boolean;
  lenGroups: number;
  loading: boolean;
  selectedDefaultColor: number;
}

export interface ProgramStep2 {
  availableFilters: Array<any>;
  currentSelectedFilter: string;
  currentGroupObj: {
    baseRate: string;
    baseRateType: string;
    color: string;
    financingName: string;
    fundingSpread: string;
    name: string;
    financingRules: Array<any>;
  };
  currentlySelectedEditedFilterObj: {
    field: string;
    filterCategoryType: string;
    filterRuleCondition: string;
    filterRuleOneOperator: string;
    filterRuleOneValue: string;
    filterRuleTwoOperator: string;
    filterRuleTwoValue: string;
    multi: Array<any>;
    values: Array<any>;
  };
  editFilterObj: {
    condition: string;
    field: string;
    multi: [] | null;
    filterOne: { operator: string; value: string } | null;
    filterTwo?: { operator: string; value: string } | null;
  };
  editedFinanceFilterObj: {
    condition: string;
    field: string;
    multi: [] | null;
    values: [] | null;
    filterOne: { operator: string; value: string } | null;
    filterTwo?: { operator: string; value: string } | null;
  };
  externalFinancingEnabled: boolean;
  filteredRuleArray: Array<any>;
  financingGroupsRules: Array<any>;
  groups: Array<any>;
  hasInputErrors: boolean;
  isEditMode: boolean;
  isRuleFilterShowing: boolean;
  keyFinancing: number;
  loading: boolean;
  programName: string;
  showLeaveModal: boolean;
}

export interface ProgramStep3 {
  automate: boolean;
  basedOn: string;
  groups: Array<any>;
  groupsNumber: number;
  harmonizationLevel: string;
  harmonizationLevelText: string;
  hasInputErrors: boolean;
  keyharmonizationGroups: number;
  loading: boolean;
  multiple: number;
  noChangesMadeToHarmonizationGroups: boolean;
  roundOn: string;
  showLeaveModal: boolean;
  termHarmonizationEnabled: boolean;
}

export interface HarmonizationView {
  activatAutomate: boolean;
  automate: boolean;
  basedOn: string;
  basedOnTypes: Array<any>;
  colors: Array<string>;
  editHarmonizationLevelTextValue: string;
  groups: Array<any>;
  groupsDeleted: Array<any>;
  groupsNumber: number;
  groupsNumberValues: Array<number>;
  hasErrors: boolean;
  harmonizationLevel: string;
  lenGroups: number;
  loading: boolean;
  multiple: number;
  multipleValues: Array<number>;
  rounding: "D" | "U" | "N";
  roundingTypes: Array<any>;
  selectedDefaultColor: number;
}

export interface ProgramEdit {
  addedGroups: Array<any>;
  changesIn: boolean;
  externalFinancingEnabled: boolean;
  groups: Array<any>;
  groupsDeleted: any;
  hasFinancing: boolean;
  hasFinancingInitial: boolean;
  hasInputErrors: boolean;
  initialGroups: Array<any>;
  isRuleFilterShowing: boolean;
  loading: boolean;
  showConfirmModal: boolean;
  showGroupsList: boolean;
  groupsForList: Array<any>;
  isShowConfirmModalDelete: boolean,
  showModalRecalculate: boolean,
  disabledSaveButton: boolean
}


export interface ListCFEditDataInterface {
  allChecked: boolean;
  applySelectedEntitiesBulkTargetButtonClicked: boolean;  
  columnsToExport: Array<any>;
  customHeaders: any;
  customHasData: boolean[];
  dataParents: Array<any>;
  dataSpends: Array<any>;
  dataSuppliers: Array<any>;
  displayModelForHarmonization: boolean;
  displayModelForMoveBetween: boolean;
  entityLevelTabSelected: number;
  filterForPatch: Array<any> | null;
  gridColumnsParents: Array<any>;
  gridColumnsSpends: Array<any>;
  gridColumnsSuppliers: Array<any>;
  gridHeight: string;
  hideEditColumnMenu: boolean;
  isModalForClearTargetBulkDisplaying: boolean;
  isModalForTargetBulkDisplaying: boolean;
  keyParents: number;
  keySpends: number;
  keySuppliers: number;
  levelGridFromGrid: string;
  levelHarmonizationFromGrid: string;
  loadExport: boolean;
  loadParents: boolean;
  loadSpends: boolean;
  loadSuppliers: boolean;
  modalConfirmTarget: boolean;
  modalPeerGroupStandard: boolean;
  modalSpends: boolean;
  modalSupplierStandard: boolean;
  modalTarget: boolean;
  myCurrentObjectForTargetBulkValues: { key: string, value: string, levelOfGrid: string },
  nameActiveProgram: string;
  selectedItems: Array<any>;
  setProgramInrecalculation: boolean;
  singleSpend: boolean;
  spendsActive: number;
  targetAmount: number;
  toExport: Array<any>;
  totalParents: number;
  totalSpends: number;
  totalSuppliers: number;
  totalsBycolumnsSpends: Array<any> | null;
  totalsBycolumnsSuppliers: Array<any> | null;
  totalsBycolumnsParents: Array<any> | null;
  showMultipleExportModal: boolean;
  suppliersForExport: Array<any>
  displayModelForManageTeam: boolean;
  displayModelForManageCommodity: boolean;
  displayModelForManageCustomColumn:boolean;
}

export interface vCardDataInterface {
  summary: {
    actual: number | null;
    contractualActual: number | null,
    vCardOpportunity: number | null;
    vCardGroupCumulativeFloat: number | null;
    vCardGroupRebate: number | null;
  },
  cashFlow: {
    vCardCashFlowGainFull: number | null;
    vCardCashFlowGain: number | null;
    vCardRebateFull: number | null;
    vCardRebate: number | null;
    vCardCashFlowEpFull: number | null;
    vCardCashFlowEp: number | null;
  },
  entities: {
    volume: number | null;
    spends: number | null;
    suppliers: number | null;
    parents: number | null;
  }
}
