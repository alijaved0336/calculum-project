import {
  EntityCard,
  EntityType,
  NegotiationStatus,
  SpendLine,
  ValueName,
} from "@/types";
import type { CalculumTreeItem } from "@/modules/components/types";
/** Shared AdaBot narrative block. `option` is present on most strategies; omitted on regulatoryTerms / proposedTerms / peerGroupAvgStrategy. */
export interface AdaBotSection {
  sectionName: string | null;
  summary: string | null;
  option?: string | null;
  details: any;
}

export interface AdaBot {
  snapshot: AdaBotSection;
  regulatoryTerms: AdaBotSection;
  proposedTerms: AdaBotSection;
  payOnTermsStrategy: AdaBotSection;
  parentSupplierMaxStrategy: AdaBotSection;
  industryRegionStandardStrategy: AdaBotSection;
  supplierStandardStrategy: AdaBotSection;
  peerGroupAvgStrategy: AdaBotSection;
  buyerStandardStrategy: AdaBotSection;
}

export interface PaymentTermsOpportunityTermsAPIResponse {
  key: "contractualTerms" | "currentTerms" | "proposedTerms";
  terms: number;
  isCapped: boolean;
  paymentCycleFloat: number | null;
  extra: {
    harmonization: {
      details: any;
      key: string;
      terms: number;
    };
    targetTerms: {
      terms: number;
      key: string;
    };
  };
  infoCards: Array<{
    key: string;
    value: string;
  }>;
}

export type PaymentTermsOpportunityStrategiesInfoCardKeyAPIResponse =
  | "cashFlowOpportunity"
  | "changeInTerms"
  | "fundingCost"
  | "currentDiscount"
  | "groupAssigned"
  | "groupBehavior"
  | "regulationTerms"
  | "regulationModality"
  | "regulationCountrySource"
  | "harmonizationLevel"
  | "harmonizationRoundingRules";

export interface StrategyInfoCard {
  key: PaymentTermsOpportunityStrategiesInfoCardKeyAPIResponse;
  value: string | number;
  countries?: Array<{
    source: "supplier" | "buyer";
    countryName: string;
    countryFlagUrl: string;
  }>;
  [k: string]: any;
}

export interface PaymentTermsOpportunityStrategyExtra {
  details: any;
  key: string;
  terms: number;
  calculationMethod: "average" | "q3";
}

export interface PaymentTermsOpportunityStrategiesAPIResponse {
  details: any; // ? - Review
  extra: Partial<{
    supplierMaxStrategy: PaymentTermsOpportunityStrategyExtra | null;
    parentMaxStrategy: PaymentTermsOpportunityStrategyExtra | null;
    supplierStandardStrategy: PaymentTermsOpportunityStrategyExtra;
    scfStandardStrategy: PaymentTermsOpportunityStrategyExtra;
  }>;
  extraBelow: any[];
  infoCards: StrategyInfoCard[] | null;
  isAllowed: boolean;
  isApplicable: boolean;
  isLimit: boolean;
  isRegulated: boolean;
  isDisabledSource: "global" | "entity";
  isVisible: boolean;
  key:
    | "payOnTermsStrategy"
    | "parentSupplierMaxStrategy"
    | "industryRegionStandardStrategy"
    | "supplierStandardStrategy"
    | "financingStrategy"
    | "cashDiscountConversionStrategy"
    | "peerGroupAvgStrategy"
    | "buyerStandardStrategy"
    | "scfStandardStrategy"
    | "regulatoryTermsStrategy"
    | "harmonization";
  terms: number | null;
}

export interface PaymentTermsOpportunityAPIResponse {
  "@id_program": string;
  "@id_spend": string;
  "@id_supplier": string;
  haveVcard: boolean;
  isVcardApplied: boolean;
  isFullExcluded: boolean;
  strategies: PaymentTermsOpportunityStrategiesAPIResponse[];
  terms: PaymentTermsOpportunityTermsAPIResponse[];
}

/** Data point for chart series; null = gap in line */
export type PaymentTermsVolumeHistoryDataPoint = number | null;

/** API response for GET api/entity-card/entity/{uuid}/payment-terms-volume-history (Option B) – chart-only shape for BarLineChart */
export interface PaymentTermsVolumeHistoryAPIResponse {
  categories: string[];
  /** Display date per point for tooltip (e.g. "29 Sep 2024"); falls back to categories if omitted */
  dateLabels?: string[];
  series: {
    spendVolume: number[];
    avgDaysPaid: PaymentTermsVolumeHistoryDataPoint[];
    contractPaymentTerms: PaymentTermsVolumeHistoryDataPoint[];
    /** PT discount per period (e.g. 5 for 5%); used in tooltip */
    ptDiscount?: PaymentTermsVolumeHistoryDataPoint[];
  };
  meta?: {
    termsAxisMin?: number;
    termsAxisMax?: number;
    volumeAxisMin?: number;
    volumeAxisMax?: number;
    unitVolume?: string;
    currency?: string;
  };
}

/** One row of the table array in the payment-terms-volume-history API response (for ListHistorical) */
export interface PaymentTermsVolumeHistoryTableRow {
  contractualPaymentTerm?: number | null;
  averageDaysPaid?: number | null;
  contractualWithDiscount?: number | null;
  description?: string | null;
  dateOfAgreement?: string | null;
  effectiveDate?: string | null;
  spendFileSource?: string | null;
  source?: string | null; // 'spend_file' | 'user_input' | 'api'
  sourceReference?: string | null; // spend file version name or user email; null for api
  status?: string | null;
  spendVolume?: number | null;
  achievedCashFlow?: number | null;
}

/** Full API response for GET payment-terms-volume-history (includes table + chart data) */
export interface PaymentTermsVolumeHistoryRawAPIResponse
  extends PaymentTermsVolumeHistoryAPIResponse {
  referenceDate?: string;
  table?: PaymentTermsVolumeHistoryTableRow[];
  chart?: unknown[];
}

/**
 * @context: "/api/contexts/EntityCardSpendNewTerms"
 * @id: "/api/entity_card_spend_new_terms/bef2e96a-8897-4fbd-ba5f-6c67139f9c6f"
 * @type: "EntityCardSpendNewTerms"
 * agreedDateOfChange: string
 * cashDiscount: number
 * created: string
 * feedbackRating: number
 * humanDate: string
 * labels: string[]
 * negotiatedPotentialCashFlow: number
 * negotiatedPotentialSaving: number
 * nextReviewDate: string
 * program: {
 *   @id: string
 *   @type: string
 *   ...
 * }
 * programName: string
 * programProposedTerms: number
 * programTarget: string
 * spend: {
 *   created: string
 *   updated: string
 *   ...
 * }
 * termsWithCashDiscount: number
 * termsWithoutCashDiscount: number
 * updated: string
 */

export interface SpendNewTerms {
  "@id"?: string;
  agreedDateOfChange: string;
  cashDiscount: number;
  effectiveDate?: string; // Optional until backend persists it
  feedbackRating?: number | null; // Optional
  financingGroup: string | null;
  harmonizationGroup: string | null;
  labels?: Array<any> | null; // Optional
  negotiatedPotentialCashFlow: number | null;
  negotiationStatus?: string | null;
  nextReviewDate: string;
  phaseEndDate: string | null;
  phaseName: string | null;
  phaseNumber: number | null;
  planName: string | null;
  programEarlyPaymentTermRate: number | null;
  programId: string;
  programName: string | null;
  programProposedTerms: number | null;
  programTarget: string | null;
  spendId: string;
  spendNewTermsId?: string | null; // Optional
  termsWithCashDiscount: number;
  termsWithoutCashDiscount: number;
  vcardAccepted: boolean;
  additionalFeedback: string | null;
}

export interface SpendNewTermsApi extends SpendNewTerms {
  callbackSuccess: any;
  callbackError: any;
}

export interface DetailFinancialMetrics {
  entityType: string | null;
  financingStrategyMethod: string;
  fundingCosts: {
    entity: {
      baseRate: number;
      finalSpread: number;
      value: number;
    } | null;
    parent: {
      baseRate: number;
      finalSpread: number;
      value: number;
    } | null;
  } | null;
  leverage: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  leverageParent: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  returnOnAssets: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  returnOnAssetsParent: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  interestCoverage: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  interestCoverageParent: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  revenueGrowth: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  revenueGrowthParent: {
    value: number;
    description: string;
    color: string;
    valueToDisplay: any;
  };
  wacc: {
    afterTax: number | null;
    preTax: number | null;
    source: string;
  };
}

export interface ESG {
  "@id": string;
  entityType: string;
  rating: string;
  ratingLabel: string;
  sustainalytics: {
    overallScore: number;
    E: number;
    S: number;
    G: number;
  };
  refinitiv: {
    overallScore: number;
    E: number;
    S: number;
    G: number;
  };
  msci: {
    overallScore: string;
  };
  links: {
    report: string;
    esg: string;
    domain: string;
  };
  isFromParent: boolean;
  isMatchByDomain: boolean;
}

export interface EntityCardOverview {
  chartKey: number;
  selectedProgramUri: string;
  showTreeFamily: boolean;
  showTreeCardsAndTable: boolean;
  programTarget: string;
  loadingFlags: {
    spendsBySupplier: boolean;
  };
}

export interface RatingsAndMetrics {
  customRevenueY: string | number | null;
  customRevenueY1: string | number | null;
  showChartOptions: boolean;
  showIndustryDetails: boolean;
  loading: {
    countryRatingInfo: boolean;
    creditScore: boolean;
    detailFinancialMetrics: boolean;
    industryRatingInfo: boolean;
    parentCreditScore: boolean;
  };
  isLoadingESG: boolean;
  isLoadingFundingCost: boolean;
  selectedProgramUri: string | null;
  creditScore: {
    value: number;
    description: string;
    color: string;
    realValue: number;
    spScore: string;
    moodysScore: string;
    estimatedCredit: {
      moodysScore: string;
      spScore: string;
    };
  };
  parentCreditScore: {
    value: number;
    description: string;
    color: string;
    realValue: number;
    parentName: string;
    spScore: string;
    moodysScore: string;
    estimatedCredit: {
      moodysScore: string;
      spScore: string;
    };
  };
  dataDepth: {
    overallDataDepth: {
      value: number;
      description: string;
      color: string;
    };
    generalInfoDataDepth: {
      value: number;
      description: string;
      color: string;
    };
    paymentTermsDataDepth: {
      value: number;
      description: string;
      color: string;
    };
    financialMetricsDataDepth: {
      value: number;
      description: string;
      color: string;
    };
    isLoading: boolean;
    isModalShowing: boolean;
  };
  detailFinancialMetrics: DetailFinancialMetrics;
  country: {
    businessEnvironmentRisk: string;
    color: string;
    colorTitle: string;
    description: string;
    economicRisk: string;
    financingSystemRisk: string;
    fiscalPolicy: string;
    fitchRating: string;
    flagImgSrc: string;
    governmentStability: string;
    internationalTransactionsPolicy: string;
    isModalShowing: boolean;
    laborFlexibility: string;
    legalSystem: string;
    monetaryPolicy: string;
    moodysRating: string;
    name: string;
    overallReference: string;
    politicalRisk: string;
    regionalStability: string;
    socialStability: string;
    source: string;
    spRating: string;
    value: number;
  };
  industry: {
    active: boolean;
    industryName: string;
    cofaceScore: string;
    ehScore: string;
    atradiusScore: string;
    industryInfo: {
      active: boolean;
      industryDetails: string;
      forecast: string;
      description: string;
    };
  };
  esg: Partial<ESG>;
  isModalESGShowing: boolean;
  isModalEntityCreditRatingShowing: boolean;
  isModalDEIShowing: boolean;
  percentFundingCost: string;
  showInfoModal: boolean;
  strategyDSO: {
    isParentDSO: boolean;
    value: number | null;
  };
  // buyerLeverage: Values come from parent component
  buyerLeverage: {
    isLoading: boolean;
    isModalShowing: boolean;
  };
  isModalEntityWaccShowing: boolean;
  currentAdvancedTootlip: string;
}

export interface EntityCardNegotiation {
  isModalCreditRatingAndBuyerLeverageShowing: boolean;
  vCardInfo: {
    economicProfit: number | null;
    hasVCard: boolean | null;
    potentialSavings: number | null;
    vCardRebate: number | null;
    vCardRebateFull: number | null;
    equivalentDiscount: number | null;
  };
  spendDetails: {
    buyer: string | null;
    country: string | null;
    currency: string | null;
    ultimateParentCompanyName: string | null;
  };
  selectedProgramUri: string | null;
  // `tabs` is no longer stored on the reactive data — it is a computed projection of `tabsData`
  // in useNegotiationSpendTabs (single ordering authority), so it is not part of this shape.
  tabsData: EntityCard.TabsData[];
  loading: {
    isLoadingEntityDetails: boolean;
    isLoadingVcardInfo: boolean;
    loadingApi: boolean;
    patchGrid: boolean;
    potentialCashFlow: boolean;
    spendVolume: boolean;
  };

  potentialCashFlow: {
    realValue: number;
  };
  spend: {
    color: string;
    description: string;
    maxValue: number;
    realValue: number;
    currency: string;
    forecastVolume: number | null;
  };
  checkbox: {
    termHarmonization: boolean;
    externalFinancing: boolean;
  };
  allSpendsTab: boolean;
  belongtoProgram: boolean;
  displayModelForHarmonization: boolean;
  hideControls: boolean;
  inRecalculation: boolean;
  levelType: string;
  spendConfigurationUuid: string;
  spendUUID: string;
  isModalEntityCreditRatingShowing: boolean;
  keyTermsStrategies: number;
  buyerLeverage: {
    isLoading: boolean;
    isModalShowing: boolean;
  };
  listSpend: SpendLine[]; // ? - Spend Program Configs
  columnsGrid: Array<any>;
  keyGrid: number;
  showStrategies: boolean;
  isModalResultsShowing: boolean;
  feedbackRating: number | null;
  additionalFeedback: string;
  feedbackLabels: Array<any>;
  levelTypeForStrategies: string;
  showExistsTarget: boolean;
  showExistsTargetValue: string | null;
  showExistsAgreedValue: string | null;
  boxesSelected: Array<any>;
  supplierNParentBox: string;
  boxesSelectedFinancing: Array<any>;
  supplierNParentBoxSCF: string;
  boxesSelectedSCF: Array<any>;
  supplierNParentBoxFinancing: string;
  dataSpends: Array<any>;
  agreedCashFlow: number | null;
  pillLabelNumberBadgeKey: number;
  vcardTerms: number;
  opportunityTerms: number;
  paymentTermsDescriptions: Array<any> | null;
}

/** Grouped props for NegotiationSpendHeader */
export interface NegotiationHeaderLoading {
  isLoadingEntityCard: boolean;
  inRecalculation: boolean;
  loadingPatchGrid: boolean;
  programIsRecalculatingComputedValue: boolean;
  forecastProcess: boolean;
}

export interface NegotiationStatusPill {
  negotiationStatusPillColorClasses: string;
  negotiationStatusFormatted: string | undefined;
  negotiationStatusCodes: string;
  pillLabelNumberBadgeKey: number;
  validateBelongToAplan: boolean;
  negotiationStatus: NegotiationStatus | undefined;
  showAgreedOptionInSpendLevel: boolean;
  entityCardNegotiationSpendsSpendSelected: SpendLine | null;
}

export interface NegotiationPlanHeader {
  boxesSelected: (number | string)[];
  boxesSelectedFinancing: (number | string)[];
  boxesSelectedSCF: (number | string)[];
  isFinancingEnabledSCFProvider: boolean;
  isFinancingEnabled: boolean;
  keyTermsStrategies: number;
  modulePlanIsAvailable: boolean;
  setPlanName: string;
  showMoveBetween: boolean;
  planPhasesData: CalculumTreeItem[];
  planIcon: string;
}

/** Shared vCard flags for Opportunity extract children */
export interface NegotiationVCard {
  vCardEnabled: boolean | null;
  hasVCard: boolean | null;
}

export interface NegotiationCashFlowVCard extends NegotiationVCard {
  vCardInfo: EntityCardNegotiation["vCardInfo"];
}

export type NegotiationCashFlowLoading = Pick<
  EntityCardNegotiation["loading"],
  "potentialCashFlow" | "spendVolume" | "isLoadingVcardInfo"
>;

export interface NegotiationCashFlowDisplay {
  showExistsAgreedValue: string | null;
  showExistsTarget: boolean;
  showExistsTargetValue: string | null;
  potentialCashFlowComputed: string;
  spendVolumeComputed: string;
  showForecastVolume: boolean;
  foreCastComputedIfExists: boolean;
  forecastValueComputed: string;
  isForeCastPositiveValue: boolean;
  foreCastPercentageComputedBigNumbers: string;
}

export interface NegotiationForecastModal {
  programUuid: string;
  companyId: string;
  companyType: string;
  selectedTabIndex: number;
  spendFileVersionIdActive: string;
}

export interface NegotiationPtTargetModal {
  columnsGrid: any[];
  paymentTermsTargetModalInputValue: number | null;
}

export interface EntityCardOffering {
  chartKey: number;
  chartOthers: number;
  showGraphicFullScreen: boolean;
  selectedProgramUri: string | null;
  changedProgram: boolean;
  programTarget: string;
  tabs: Array<any>;
  selectedTabIndex: number;
  tabsData: Array<any>;
  loadTabs: boolean;
  showCashDiscountCheckbox: boolean;
  nameTab: string;
  loading: {
    userPrograms: boolean;
    potentialSaving: boolean;
    spend: boolean;
    creditScore: boolean;
    LoadedPaymentTermsOpportunity: boolean;
    getHarmonizationGroups: boolean;
    getFinancingGroups: boolean;
    LoadedSupplierSnapshot: boolean;
    LoadedSupplierFinancing: boolean;
    LoadedCashDiscount: boolean;
    LoadedPeerGroup: boolean;
    LoadedRegulatoryTerms: boolean;
    LoadedPayOnTermsStrategy: boolean;
    LoadedSupplierParentStrategy: boolean;
    LoadedSupplierGroupStrategy: boolean;
    LoadedDsoStrategy: boolean;
    programData: boolean;
    supplierDetail: boolean;
    patchData: boolean;
    patchGrid: boolean;
  };
  potentialSavings: {
    color: string;
    description: string;
    maxValue: number;
    realValue: number;
    currency: string;
    buyerLeverage: {
      color: string;
      description: string;
      value: number;
      valueToDisplay: any;
    };
    negotiation: {
      color: string;
      description: string;
      value: number;
    };
  };
  spend: {
    color: string;
    description: string;
    maxValue: number;
    realValue: number;
    currency: string;
    savingImpact: {
      color: string;
      description: string;
      value: number;
      valueToDisplay: any;
    };
  };
  creditScore: {
    color: string;
    description: string;
    value: number;
    realValue: number;
    spScore: string;
    dataDepth: {
      color: string;
      description: string;
      value: number;
    };
    frequency: {
      color: string;
      description: string;
      value: number;
    };
    estimatedCredit: {
      moodysScore: string;
      spScore: string;
    };
  };
  checkbox: {
    all: boolean;
    termHarmonization: boolean;
    externalFinancing: boolean;
    discount: boolean;
  };
  colorTypeOverview: string;
  percentageTypeOverview: string;
  titleTypeOverview: string;
  showmodal: boolean;
  reload: boolean;
  potentialSavingsText: string;
  buyerLeverageText: string;
  creditScoreText: string;
  dataDepthText: string;
  frequencyText: string;
  harmonizationText: string;
  esgTermsText: string;
  financingGroupValor: boolean;
  harmonizationGroupValor: boolean;
  harmonizationsGroups: Array<any>;
  financingsGroups: Array<any>;
  companyName: string;
  spendConfigurationUuid: string;
  belongtoProgram: boolean;
  inRecalculation: boolean;
  spendUUID: string;
  hasDynamicHarmonization: boolean;
  harmonizationGroup: string | null;
  nameHarmonization: string;
  colorHarmonization: string;
  financingGroup: string | null;
  nameFinancing: string;
  colorFinancing: string;
  expectedKey: number;
  supplierKey: number;
  funderKey: number;
  dataOffering: Array<any>;
  listSpend: Array<any>;
  columnsGrid: Array<any>;
  hasFinancing: boolean;
  hasHarmonization: boolean;
  selectedItems: Array<any>;
  gridHeight: string;
  allSpendsTab: boolean;
  hideControls: boolean;
  gridExpanded: boolean;
  keyGrid: number;
}
export interface CustomValuesData {
  key: string;
  label: string;
  value: string | null;
  columnNumber: number;
  columnType: "text" | "number" | "days" | "money";
}
export interface EntityCardCompanyDetails {
  showFullDescription: boolean;
  showFullDescriptionModal: boolean;
  chartKey: number;
  currency: string;
  characteristics: {
    companySizeDescription: string;
    region: string;
  };
  loading: {
    userPrograms: boolean;
    supplierDetail: boolean;
    industryCommodity: boolean;
    spendInformation: boolean;
    supplierOwnership: boolean;
    supplierDescription: boolean;
    locationForSupplier: boolean;
    customFields: boolean;
    procurementTeam: boolean;
    commodity: boolean;
    customColumn: boolean;
    industry: boolean;
    ultimateParent: boolean;
  };
  selectedProgram: null | string;
  showSMEModal: boolean;
  customFieldsData: any;
  customFieldsList: Array<{ key: string; label: string; value: string }>;
  supplierDetail: {
    idNumber: string;
    externalID: string;
    founded: string;
    type: string;
    buyingEntity: string;
    buyingCountry: string;
    procurementTeam: string;
    relationshipSince: string;
    country: string;
    idType: any;
    supplierName: string;
    supplierEthnicMinorityOwnedBusiness: string;
    supplierWomanOwnedBusiness: string;
    supplierVeteranOwnedBusiness: string;
    averageDaysToApproveInvoice: string;
    dateOfLastTermNegotiation: string;
  };
  industryCommodity: {
    industryName: string;
    industryNaics: string;
    industryIsic: string;
    commodity: string;
    unspsc: string;
  };
  supplierOwnership: {
    ownership: string;
    parentIndustry: string;
    ultimateParent: string;
  };
  supplierDescription: string;
  supplierLocation: {
    address: string;
    state: string;
    zipCode: string;
    latitude: number | null;
    longitude: number | null;
    phone: string;
    city: string;
    domain: string | null;
    phoneNumber: string;
  };
  customValuesData: CustomValuesData[];
}

/**
 * For Modal in Entity Card , when user
 * clicks on Add/Edit Results for the Agreed Terms
 */

export interface ModalResults {
  tabs: Array<any>;
  selectedTabIndex: number;
  tabsData: Array<any>;
  selectedProgramUri: string;
  spendConfigurationUuid: string;
  spendUUID: string;
  belongtoProgram: boolean;
  loading: {
    patchGrid: boolean;
  };
  isLoadingSpendNewTerms: boolean;
  isLoadingProgramData: boolean;
  spendNewTerms: {
    active: boolean;
    id: string | null;
    termsWithoutCashDiscount: number | null;
    termsWithCashDiscount: number | null;
    cashDiscount: number | null;
    agreedDateOfChange: string;
    effectiveDate: string;
    nextReviewDate: string;
    agreedDateOfChangeBox: string;
    dateOfLastTermNegotiation: string;
    effectiveDateBox: string | null;
    nextReviewDateBox: string | null;
    isFirstTry: boolean;
    harmonization: string | null;
    financing: string | null;
    programProposedTerms: number | null;
    termsWithCashDiscountChart: number | null;
    termsWithoutCashDiscountChart: number;
    cashDiscountChart: number | null;
    potentialCashflow: string | null;
    potentialSavings: string | null;
    negotiatedVsProposed: number | null;
    feedback: {
      id: string | null;
      allLabels: Array<any>;
    };
    vcardAccepted: boolean;
    scfAccepted: boolean;
  };
  currentStartDate: string;
  minStartDate: string;
  listSpend: Array<any>;
  columnsGrid: Array<any>;
  selectedItems: SpendLine[];
  retrieveAllSpends: number;
  allSpendsTab: boolean;
  keyGrid: number;
  currentViewIndex: number;
  inputInvalidWarningMessages: string[];
  newFeedbackRating: number;
  newFeedbackLabels: string[];
  newAdditionalFeedback: string;
  allChecked: boolean;
  filterForPatch: Array<any> | null;
}

// *** Category Compositions (Lovelace) ***

export interface BlsSeries {
  seriesId: string;
  seriesName: string;
}

export interface CostModelItem {
  bls: BlsSeries;
  item: string;
  description: string;
  estimatedCostPercent: number;
  pricingData?: CommodityPricingOutput;
}

export interface CostModel {
  direct: CostModelItem[];
  indirect: CostModelItem[];
  totalPercent: number;
  totalDirectPercent: number;
  totalIndirectPercent: number;
}

export type RiskSeverity = "Low" | "Medium" | "High" | "Critical";

export interface RiskProfile {
  riskType: string;
  severity: RiskSeverity;
  description: string;
  affectedInputs: string[];
  mitigationStrategy: string;
}

export interface MarketIntelligence {
  leadTimeTrends: string;
  supplyChainVolatility: string;
  commodityPricingForecast: string;
}

export interface NegotiationPushback {
  claim: string;
  supportingData: string;
  counterArgument: string;
}

export interface NegotiationRecommendation {
  action: string;
  rationale: string;
  estimatedImpact: string;
}

export interface NegotiationStrategy {
  pushbacks: NegotiationPushback[];
  recommendations: NegotiationRecommendation[];
}

export interface TimeSeriesDataChart {
  year: string;
  periodName: string;
}

export interface CategoryCompositionsResponse {
  hsCode: string;
  productName: string;
  productDescription: string;
  costModel: CostModel;
  riskProfile: RiskProfile[];
  marketIntelligence: MarketIntelligence;
  negotiationStrategy: NegotiationStrategy;
  aiSummary: Array<any>;
  seriesData: number[][] | null;
  categoriesData: TimeSeriesDataChart[];
}

// *** Commodity Pricing (Lovelace) ***

export interface CommodityPricingSourceData {
  dataSource: string;
  rawCurrentValue: number | null;
  rawPriorMonthValue: number | null;
  rawPriorYearValue: number | null;
  retrievedPeriod: string;
  responseStatus: string;
}

export interface CommodityPricingAnalysis {
  momDrivers: string;
  yoyDrivers: string;
  forwardOutlook: string;
}

export interface CommodityPricingOutput {
  seriesId: string;
  name: string;
  category: string;
  unit: string;
  baseYear: string;
  latestPeriod: string;
  ppiPrice: number;
  momChange: number;
  yoyChange: number;
  trendDirection: string;
  dataConfidence: string;
  sourceData: CommodityPricingSourceData;
  analysis: CommodityPricingAnalysis;
  disclaimer: string;
  estimatedCostPercent: number;
}

// *** Calculator ***

export type CalculationType = "none" | "vCard" | "scf";

export type CalculationTypeValue = { [T in CalculationType]: number | null };

export interface CalculatorValues {
  calculationType: CalculationType;
  priceChange: number;
  changeInTerms: number;
  supplierTaxRate: number;
  supplierWacc: number;
  spendVolume?: number;
  additionalFields:
    | Partial<{
        // VCard
        groupName: string;
        paymentCycleFloat: number;
        rebate: number;
        supplierCardCost: number;
      }>
    | Partial<{
        // SCF
        earliestDayPaid: number;
        financingRate: number;
        groupName: string;
        scfRate: number;
      }>
    | null;
}

export interface CalculatorInitialDataAPIResponse {
  data: {
    calculatorSavedValues: CalculatorValues | null;
    defaultTypes: Partial<{
      none: CalculatorValues;
      vCard: CalculatorValues;
      scf: CalculatorValues;
    }>;
  };
  success: boolean;
}

export interface CalculateDataAPIResponse {
  data: {
    emptyValues?: Partial<{
      taxRate: boolean;
      wacc: boolean;
    }>;
    changeInTerms: number;
    data: CalculateDataData;
    priceChange: number;
    success: boolean;
    charts: {
      paymentTermsImpact: ValueName[];
      economicProfit: ValueName[];
      cashFlow: ValueName[];
      priceImpact: ValueName[];
    };
  };
  forecastVolumeApplied: boolean;
  success: boolean;
}

export interface CalculateDataData {
  buyer: CalculateDataEntity;
  supplier: CalculateDataEntity;
}

export interface CalculateDataEntity {
  actualContractual: number;
  actualDaysPaidByBuyer: number;
  actualDaysPaymentReceivedSupplier: number;
  adjustedVolume: number;
  annualVolume: number;
  cashFlowImpact: number;
  changeInAfterTaxOperatingProfit: number;
  changeInTerms: number;
  changeInValueOfInvestedCapital: number;
  contractual: number;
  costImpact: number;
  currentAverage: number;
  economicProfit: number;
  economicProfitAsPercent: number;
  float: number;
  inventoryChange: number;
  modeledNewTerms: number;
  potentialDaysFinanced: number;
  priceChange: number;
  proposedAverage: number;
  rebate: number;
  supplierCost: number;
  taxRate: number;
  totalChangeInCapital: number;
  totalCostChange: number;
  wacc: number;
  forecastVolume?: number;
  newCalculatedSpendVolume?: number;
}

/**
 * Data interface for EntityCardCalculator
 */
export interface DataInterface {
  allSpendsTab: boolean;
  belongtoProgram: boolean;
  calculateTable: Array<any>;
  levelType: EntityType;
  loadingCalculation: boolean; // Calculate Data loading flag
  loadingMatrix: boolean;
  loadingSpends: boolean;
  selectedTabIndex: number;
  spendConfigurationUuid: string;
  spendProgramConfigs: EntityCard.SpendProgramConfigByProviderAPIResponse[];
  tabs: Array<any>;
  tabsData: Array<any>;
  showNewScenarioModalTitle: boolean;
  newScenarioModalTitle: string;
  showScenarios: boolean;
  scenariosByConfig: Array<any>;
  selectedScenario: string | null;
  someScenarioApiRequest: boolean;
  deletingScenario: boolean;
  forecastVolumeApplied: boolean;
}

/**
 * Interface for SCF Analysis Response
 * Represents the analysis data for Supply Chain Finance opportunities
 */

export interface SupplierImpactTable {
  data: Array<{
    name: string;
    current: number;
    target: number;
    withScf: number;
  }>;
}

export interface ScfAnalysisResponse {
  result: string;
  volume: number;
  buyerLeverageDescription: string;
  currentPaymentTerms: string;
  targetPaymentTerms: string | null;
  contractualActualTerms: number;
  buyerImpactCashFlow: number;
  buyerImpactEconomicProfit: number;
  dataToChart: Array<{
    name: string;
    post: number;
    text: string;
  }>;
  priority: string;
  scfValue: string;
  cashFlowImpact: string;
  costOfDebs: string;
  scfRate: string | null;
  supplierImpact: SupplierImpactTable;
  supplierImpactText: Array<any>;
  negotiationStatus: string;
  entityDetails: EntityCard.EntityDetails;
  industryDetails: {
    industryName: string;
    industryNaics: string;
    industryIsic: string[];
    commodity: string;
    unspsc: string;
  };
}
