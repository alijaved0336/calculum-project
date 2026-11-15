export interface CatalogType {
  id: string | number;
  label: string;
  children: Omit<ContentTypes, "contents">[];
}
export interface ContentTypes {
  type:
    | "image"
    | "introduction"
    | "spendVolume"
    | "yourValueProposition"
    | "subtitle"
    | "industry"
    | "match"
    | "spendVolumeDistributed"
    | "sustancialAmount"
    | "lowHangingFruits"
    | "text"
    | "analyzedSupplierName"
    | "analyzedSupplier";
  title:
    | "Image"
    | "Introduction"
    | "Executive Summary"
    | "Experience in your Industry"
    | "Subtitle"
    | "Industry Summary"
    | "Identify and Match Suppliers"
    | "Spend Distribution"
    | "Calculating your Opportunity"
    | "9 Box Analysis"
    | "Text"
    | "Analyzed Supplier";
  icon?: "fa-image" | "fa-file-alt" | "fa-chart-line" | "fa-edit";
  contents:
    | ImageType
    | IntroductionType
    | SubtitleType
    | YourValuePropositionType
    | SpendVolumeType
    | IndustryType
    | MatchType
    | SpendVolumeDistributedType
    | SustancialAmountType
    | LowHangingFruitsType
    | AnalyzedSupplierType;
}

export interface YourValuePropositionType {
  id: string;
  type: string;
  visibility: boolean;
  title: string;
  leftTitle: string;
  rightTitle: string;
  middleTitle: string;
  leftText: string;
  rightText: string;
  middleText: string;
}

export interface SubtitleType {
  id: string;
  type: string;
  text: string;
  visibility: boolean;
}

export interface ImageType {
  id: string;
  type: string;
  image: string;
  visibility: boolean;
}
export interface IntroductionType {
  id: string;
  type: string;
  visibility: boolean;
  text: string;
  companyName: string;
  sign: string;
  creator: string;
  director: string;
  uiGroup: string;
  logo: string;
}
export interface SpendVolumeType {
  id: string;
  type: string;
  visibility: boolean;
  text: string;
  spendVolume: GeneralBoxType;
  matchRate: GeneralBoxType;
  supplier: {
    title: string;
    valueData: string;
    confidenceScore: string;
    level: string;
    options: { id: string; label: string }[];
  };
  opportunity: {
    cashFlowTitle: string;
    cashFlow: string;
    opportunityTitle: string;
    opportunity: string;
  };
}
export interface IndustryType {
  id: string;
  type: string;
  visibility: boolean;
  textLeft: string;
  textRight: string;
  companyName: string;
  industryName: string;
  industrySpendVolume: string;
}
export interface MatchType {
  id: string;
  type: string;  
  visibility: boolean;
  dataRecieved: DataRecieved;
  confidenceScore: DataRecieved;
  charts: MatchChart;
}
export interface SpendVolumeDistributedType {
  id: string;
  type: string;
  textFirst: string;
  visibility: boolean;
  charts: SpendVolumeDistributedCharts;
}
export interface SustancialAmountType {
  id: string;
  type: string;
  textFirst: string;
  textLast: string;
  visibility: boolean;
  paymenTermsDays: PaymentTerms;
  cashFlowOpportunity: CashFlowOpportunity;
  charts: SustancialAmountCharts;
}
export interface LowHangingFruitsType {
  id: string;
  type: string;
  text: string;
  visibility: boolean;
  cashFlowOpportunity: CfOppLowHangingFruits;
  nineBox: NineBoxLowHangingFruits;
}

export interface AnalyzedSupplierType {
  id: string;
  type: string;
  textFirst: string;
  textSecond: string;
  logo: string;
  supplierName: string;
  paymentTermOpp: {
    dayOne: {
      data: string;
      title: string;
    };
    dayTwo: {
      data: string;
      title: string;
    };
  };
  companyDetails: {
    url: string;
    phone: string;
    country: string;
  };
  spendVolume: {
    data: string;
    title: string;
  };
  creditRating: {
    title: string;
    gradeLevelText: string;
    letterGrade: string;
    level: number;
  };
  supplierCostFinancing: {
    title: string;
    valuePercent: string;
    baseRate: GeneralBoxType;
    costOfDebt: GeneralBoxType;
  };
  yourLeverage: GeneralBoxType;
  visibility: boolean;
  cashFOpp: GeneralBoxType;
  standard: {
    supplier: AnalyzedSupplierStandard;
    peerGroup: AnalyzedSupplierStandard;
  };
  paymentTerms: {
    terms: AnalyzedSupplierPaymentTerms[];
    strategies: AnalyzedSupplierPaymentTermsStrategies[];
  };
  onSCF?: boolean;
}

export interface Sections {
  id: string;
  tabTitle: string;
  visibility: boolean;
  contents: ContentTypes["contents"][];
}

export interface JsonDataInterface {
  id: string;
  currency: string;
  companyLogo: string;
  partnerLogo: string;
  name: string;
  isPublic: boolean;
  sections: Sections[];
}

export const defaultJsonDataDemo: JsonDataInterface = {
  id: "",
  currency: "",
  companyLogo: "",
  partnerLogo: "",
  name: "",
  isPublic: true,
  sections: [],
};

export interface ReasonKeyPair {
  reason: string;
  amount: number;
}
export interface ReasonsInterface {
  numberOfSuppliers: Array<ReasonKeyPair>;
  numberOfSpends: Array<ReasonKeyPair>;
  spendVolume: Array<ReasonKeyPair>;
}

export interface DataRecieved {
  title: string;
  valueData: string;
  text: string;
}

export interface GeneralBoxType {
  title: string;
  data: string;
}

// This is for Chart in Match
export interface MatchChart {
  horizontals: HorizontalsBarMatch;
  maps: MapsBarMatch;
  pies: PiesBarMatch;
}

export interface HorizontalsBarMatch {
  excludedBarChart: ReasonsInterface;
  dataReceived: ChartTricolorMatch;
}
export interface MapsBarMatch {
  overviewMap: CountriesMap;
}
export interface PiesBarMatch {
  matchedUnmatched: CurrentSelectedChart;
  includeExclude: CurrentSelectedChart;
}
export interface CountriesMap {
  suppliers: MapChartInterface[];
  buyers: MapChartInterface[];
}
export interface ChartTricolorMatch {
  showPercentage: boolean;
  infos: Info[];
}

export interface Info {
  key: string;
  value: number;
  percentage: number;
  total: number;
}
export interface MapChartInterface {
  supplierOrBuyerCount: number;
  spendCount: number;
  volume: string;
  country: string;
  geoLat: number;
  geoLon: number;
}

// This is for Chart in SpendVolumeDistributed
export interface SpendVolumeDistributedCharts {
  horizontals: HorizontalsBarSpendVolumeDistributed;
  pies: PiesBarSpendVolumeDistributed;
}

export interface PiesBarSpendVolumeDistributed {
  perBuyerLeverage: CurrentSelectedChart;
  perSupplierSize: CurrentSelectedChart;
  perCommodity?: CurrentSelectedChart;
  perSupplierCountry?: CurrentSelectedChart;
}

export interface HorizontalsBarSpendVolumeDistributed {
  perCreditRating: CurrentSelectedChart;
  perSmeRegion: CurrentSelectedChart;
}

export interface ResultApiChart {
  value: number | string;
  name: string;
}
export interface CurrentSelectedChart {
  chartTitle: string;
  dataSeries: any[];
  categoriesData: any[];
}

// This is for Sustancial Amount
export interface PaymentTerms {
  currentAvgPaymentTerms: number;
  paymentCycleFloat: number;
  proposedAvgPaymentTerms: number;
  contractualAvgPaymentTerms: number;
  expectedFloat: number;
  expectedAvgPaymentTerms: number;
  increasingPaymentTerms: ResultApiChart;
}

export interface CashFlowOpportunity {
  title: string;
  valueData: string;
  analysis: Analysis;
}

export interface Analysis {
  title: string;
  spendVolume: ResultApiChart;
  numberSuppliers: ResultApiChart;
  numberParents: ResultApiChart;
}

export interface SustancialAmountCharts {
  vertical: VerticalBarSustancialAmount;
}
export interface VerticalBarSustancialAmount {
  perOptimizacion: SustancialAmountWaterfallChart;
}
export interface SustancialAmountWaterfallChart {
  chartTitle: string;
  dataValues: any[];
}

// This is for Low Hanging Fruits
export interface CfOppLowHangingFruits extends CashFlowOpportunity {
  total: ResultApiChart;
}
export interface NineBoxLowHangingFruits {
  boxesInfo: BoxesInfo[];
  title: string;
  boxTitle: string;
  typeOf9Boxes: string;
}

export interface BoxesInfo {
  box: number;
  spends: number;
  suppliers: number;
  buyers: number;
  parents: number;
  volume: number;
  cashFlow: number;
  discounts: number;
  expectedCashFlow: number;
  expectedPaymentTerms: number;
  actualPaymentTerms: number;
  contractualPaymentTerms: number;
  paymentTermsOpportunity: number;
  expectedPaymentTermsAndVolume: number;
  actualPaymentTermsAndVolume: number;
  contractualPaymentTermsAndVolume: number;
  paymentTermsOpportunityAndVolume: number;
  selected?: boolean;
}

/* This is for Analyzed Supplier*/
export interface AnalyzedSupplierStandard {
  value: AnalyzedSupplierStandarValue;
  cfOpp: GeneralBoxType;
  paymentTermsChange: GeneralBoxType;
  numberOfOccurrences: GeneralBoxType;
}

interface AnalyzedSupplierStandarValue {
  key: string;
  terms: number;
  details: AnalyzedSupplierDetails;
  calculationMethod: string;
  usedStrategy?: boolean;
}
interface AnalyzedSupplierDetails {
  average: number;
  third_quartile: number;
}
interface AnalyzedSupplierPaymentTerms {
  key: string;
  terms?: number | null;
  extra?: Extra;
  infoCards?: InfoCard[];
  paymentCycleFloat?: number;
  isCapped?: boolean;
  active: boolean;
}

interface AnalyzedSupplierPaymentTermsStrategies {
  key: string;
  terms: number;
  isAllowed: boolean;
  isApplicable: boolean;
  isDisabledSource?: "entity" | "global";
  isLimit?: boolean;
  infoCards: InfoCards[];
  extra?:
    | { supplierStandardStrategy: AnalyzedSupplierStandarValue }
    | { peerGroupAvgStrategy: AnalyzedSupplierStandarValue }
    | ExtraStrategies;
  extraBelow?: any[];
  active: boolean;
}

interface InfoCard {
  key: string;
  value: number | string;
}

interface Extra {
  contractualTerms?: ContractualTerms;
  currentTerms?: ContractualTerms;
  harmonization?: Harmonization;
}

interface Harmonization {
  key: string;
  terms: number;
  details: Details;
}

interface Details {
  type: string;
  level: string;
}

interface ContractualTerms {
  key: string;
  terms: number;
}

interface InfoCards {
  key: string;
  value: number | string;
  groupAssigned?: string | null;
  groupBehavior?: string;
  harmonizationLevel?: string;
  harmonizationRoundingRules?: string;
  fundingCost?: number;
  financingRate?: number;
  mainRegion?: string;
  mainIndustry?: string;
  numberOfOccurrences?: number;
}

interface StrategyDetails {
  average?: number;
  third_quartile?: number;
}

interface ExtraStrategy {
  key: string;
  terms: number;
  details: StrategyDetails | null;
  calculationMethod?: string;
}

interface ExtraStrategies {
  [key: string]: ExtraStrategy;
  industryGroupStrategy: ExtraStrategy;
  regionGroupStrategy: ExtraStrategy;
}

export interface SupplierListType {
  remainingItems: boolean;
  loadingRemainingItems: boolean;
  searchQuery: string | null;
  from: number;
  suppliers: any[];
  searchEntitySuppliers: any[];
  notRecently: boolean;
  loadingCards: boolean;
}

export interface PropsSelectedSupplier {
  supplier: string;
  country: string;
  uuid: string;
}

/*Traking*/
export interface TrackingProp {
  vpIdentity: string
  vpEmail: string
  vpSectioName: string;
  duration?:number
}
