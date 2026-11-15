import { translate } from "@/utils/translation";

export type ManageTab = "Overview" | "EmailNegotiations";

export interface CardsByStatus {
  entitySelected: any | null;
}

export interface Filter {
  field: string;
  operator: string;
  value: string | boolean;
}

// Definir una interfaz para la estructura completa de los filtros
export interface Filters {
  filters: {
    logic: string;
    filters: Filter[];
  }[];
  logic: string;
}

export interface DataInterfaceCardsScroll {
  cards: Array<any>;
  collectionData: string;
  loadingData: boolean;
  loadMore: boolean;
  sortString: string;
  gridHeight: string;
  selectedTabIndex: number;
  tabs: Array<any>
}

export interface DataInterface {
  loadingPrograms: boolean;
  allPrograms: Array<any>;
  programTarget: string;
  selectedProgramUri: string;
  rebateInfo: Array<any>;
  statusesRebateInfo: Array<any>;
  cashFlowInfo: Array<any>;
  statusesInfo: Array<any>;
  selectedTabIndex: number;
  tabs: Array<any>;
  statusesCardsInfo: Array<any>;
  filterOptions: Array<any>;
  currentSortedOption: string;
  sortyByTableDisplaying: boolean;
  searchValue: string;
  key: number;
  keyScrolls: number;
  searchQuery: string;
  recordsForAnalyzed: boolean;
  recordsForPlanned: boolean;
  recordsForContacted: boolean;
  recordsForAgreed: boolean;
  recordsForOnHold: boolean;
  recordsForAgreedExtended: boolean;
  agreedInfo: {
    start: number;
    end: number;
    agreed: number;
    percentage: number;
  };
  levelOfGrid: string;
  totalTargetCashFlow: number;
  totalTargetRebate: number;
  loadingGaugeInfo: boolean;
  loadingStackedBarInfo: boolean;
  loadingCardsNumbers: boolean;
  existsPrograms: boolean;
  recalculationInProgress: boolean;
  labelSearchLevel: string;
  screenWidth1440: boolean;
  options: any;
  currentOption: string;
  selectedTeam: string;
  selectedPhase: string;
  selectedCountry: string;
  selectedCommodity: string;
  filtersToApply: {
    selectedTeam: string | null;
    selectedPhase: string | null;
    selectedCountry: string | null;
    selectedCommodity: string | null;
  }
}

export const setTabs = [
  {
    title: translate.t("global.spendLine") + "s",
    level: translate.t("global.spendLine"),
    contentClassName: "classContentHide"
  },
  {
    title: translate.t("global.supplier") + "s",
    level: translate.t("global.supplier"),
    contentClassName: "classContentHide"
  },
  {
    title: translate.t("global.ultimateParent"),
    level: translate.t("global.ultimateParent"),
    contentClassName: "classContentHide"
  }
];

export const filterStrings = [
  translate.t("global.filters.nameAsc"),
  translate.t("global.filters.nameDesc"),
  translate.t("global.filters.targetLowestToHighest"),
  translate.t("global.filters.targetHighestLowestTo")
];

export const filterOptions = [
  { value: 'nameAsc',    label: translate.t("global.filters.nameAsc") },
  { value: 'nameDesc',   label: translate.t("global.filters.nameDesc") },
  { value: 'targetAsc',  label: translate.t("global.filters.targetLowestToHighest") },
  { value: 'targetDesc', label: translate.t("global.filters.targetHighestLowestTo") },
];
