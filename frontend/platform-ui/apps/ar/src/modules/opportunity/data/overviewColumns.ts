import { getActivePinia } from "pinia";
import * as globalColumns from "@ada/design-system/data/globalColumns";
import type { GraphqlGridColumn } from "@ada/design-system/components/graphql-grid/types";
import { useContextStore } from "@/stores/context";
import { customAttributeColumns } from "@/utils/customAttributeColumns";
import { translate } from "@/utils/translation";
import {
  CLIENT_ONLY_FIELDS,
  NOT_SORTABLE,
  NOT_YET_SORTABLE_OR_FILTERABLE,
  TOTALS_NOT_YET_SUPPORTED,
  type OverviewGridLevel,
} from "./overviewRows";

/**
 * The column lists of every AR Opportunity-family grid, aligned with AP (column parity, AR Column
 * Parity of 2026-10-02): Opportunity's List (also the Overview drill-down), the 9 Boxes grid, the
 * Waterfall drill-in and the Entity Card's line list. Each grid has its own ordered list
 * (`COLUMN_LISTS` below: field + visible by default), and every list reads its columns from one
 * catalog (`catalogColumn`), so a column looks the same in every grid that shows it.
 *
 * Columns come from design-system's shared globalColumns exports; the AR wording lives in
 * `arOpportunity.list.gridColumns.*` and overrides each export's title here, so AP's own titles
 * are untouched. A field the backend does not expose (overviewRows.ts's CLIENT_ONLY_FIELDS) still
 * gets its column, hidden, empty, and neither sortable, filterable nor totalled. One the backend
 * exposes but cannot sort or filter by (NOT_YET_SORTABLE_OR_FILTERABLE: Target, Agreed) is shown as
 * normal, just not sortable or filterable; one it filters but will not sort by (NOT_SORTABLE: the
 * leverage bands) keeps its filter. Since AB#20905 every other column is backed end to end.
 *
 * Kept flat, never grouped: kendo-vue-grid hangs the tab when grouped headers and footerCell
 * coexist, which is also why custom attributes come from `customAttributeColumns()` (flat).
 *
 * Footer totals follow the parity document too (`FOOTERS` below): only those fields keep a
 * footerCell, whatever their globalColumns export carries. They come from the Opportunity summary
 * endpoint (G-395, see OverviewList.vue's fetchTotals), which also needs the field listed in
 * packages/design-system/src/utils/totalColumnsUtils.ts. A total the backend cannot compute yet
 * (overviewRows.ts's TOTALS_NOT_YET_SUPPORTED: Target) keeps no footer until it can. Agreed is
 * output-only, so it has none either.
 */

type Column = GraphqlGridColumn;

/** A grid's list: each field once, in display order, with whether it is visible by default. */
type ColumnList = ReadonlyArray<readonly [field: string, visible: boolean]>;

const t = (key: string, params?: Record<string, unknown>) =>
  params ? translate.t(key, params) : translate.t(key);
const title = (key: string) => t(`arOpportunity.list.gridColumns.${key}`);

const from = (column: unknown[], overrides: Partial<Column> = {}): Column => ({
  ...(column[0] as Column),
  ...overrides,
});

/** A strategy-candidate column (days, numeric filter), shaped like the strategies globalColumns
 * already exports. */
const strategy = (field: string, width: string, columnTitle: string): Column =>
  from(globalColumns.opportunityBuyerParentMinStrategy, { field, width, title: columnTitle });

/** A free-text column (left-aligned, text filter), shaped like Sales Team. */
const text = (field: string, width: string, columnTitle: string): Column =>
  from(globalColumns.opportunitySalesTeam, { field, width, title: columnTitle });

/** "{Client's Name} Standard (Strategy)": the signed-in company's own name, when there is one. */
function clientStandardTitle(): string {
  const companyName = getActivePinia() ? useContextStore().companyName : null;
  return companyName
    ? t("arOpportunity.list.gridColumns.clientStandardStrategy", { client: companyName })
    : title("clientStandardStrategyFallback");
}

/** The fields that total in the footer, and how (Sum, or the volume-weighted day average). */
const SUM = "TotalsBycolumnsSum";
const AVG_DAYS = "TotalsBycolumnsAvgWeightedCeil";
const FOOTERS: Readonly<Record<string, string>> = {
  volume: SUM,
  saleLineCount: SUM,
  cashFlowImpact: SUM,
  outstanding: SUM,
  contractualPaymentTermsWithoutCashDiscounts: AVG_DAYS,
  contractualPaymentTermsWithoutCashDiscountsAvg: AVG_DAYS,
  actualPaymentTerms: AVG_DAYS,
  actualPaymentTermsAvg: AVG_DAYS,
  contractualPaymentTermsWithCashDiscounts: AVG_DAYS,
  contractualPaymentTermsWithCashDiscountsAvg: AVG_DAYS,
  recommendedTerm: AVG_DAYS,
  cashFlowContribution: SUM,
  buyerCount: SUM,
  // Waiting on the backend (TOTALS_NOT_YET_SUPPORTED).
  targetPaymentTerms: AVG_DAYS,
  targetCashFlow: SUM,
};

/**
 * Every column a list can name, built for one level. `name`/identity columns are the only ones
 * whose field differs between grains (the line's `buyerName` is the party's `name`).
 */
function catalogColumn(level: OverviewGridLevel, field: string): Column | undefined {
  switch (field) {
    // Identity
    case "isExcluded": return from(globalColumns.isExcluded, { width: "120px", title: title("excluded") });
    case "exclusionReason": return from(globalColumns.exclusionReason, { width: "240px", title: title("exclusionReason") });
    case "exclusionReasons": return from(globalColumns.exclusionReason, { field, width: "240px", title: title("exclusionReason") });
    case "buyerName": return from(globalColumns.buyerNameAR, { width: "220px", cell: "entityLogoTemplate", title: title("buyerName") });
    case "name": return level === "parents"
      ? from(globalColumns.opportunityParentPartyName, { cell: "entityLogoTemplate", title: title("parents") })
      : from(globalColumns.opportunityBuyerPartyName, { cell: "entityLogoTemplate", title: title("buyerName") });
    case "buyerOriginalName": return from(globalColumns.opportunityBuyerOriginalName, { title: title("receivedBuyerName") });
    case "originalName": return from(globalColumns.opportunityOriginalName, { title: title("receivedBuyerName") });
    case "internalId": return from(globalColumns.opportunityInternalId, { title: title("internalId") });
    case "alias": return from(globalColumns.opportunitySaleLineAlias, { title: title("salesAlias") });
    case "saleLineCount": return from(globalColumns.opportunitySaleLineCount, { title: title("numberOfSalesLines") });
    case "buyerCount": return from(globalColumns.opportunitySaleLineCount, { field, width: "150px", title: title("numberOfBuyers") });
    case "parentName": return from(globalColumns.opportunityParentOrganizationName, { title: title("parents") });

    // Volume & payment terms
    case "volume": return from(globalColumns.volume, { title: title("salesVolume") });
    case "contractualPaymentTermsWithoutCashDiscounts":
      return from(globalColumns.contractualPaymentTermsWithoutCashDiscounts, { width: "200px", title: title("contractualPaymentTerms") });
    case "contractualPaymentTermsWithoutCashDiscountsAvg":
      return from(globalColumns.opportunityContractualPaymentTermsWithoutCashDiscountsAvg, { title: title("contractualPaymentTerms") });
    case "actualPaymentTerms": return from(globalColumns.actualPaymentTerms, { width: "200px", title: title("averageDaysPaid") });
    case "actualPaymentTermsAvg": return from(globalColumns.opportunityActualPaymentTermsAvg, { width: "200px", title: title("averageDaysPaid") });
    case "contractualPaymentTermsWithCashDiscounts":
      return from(globalColumns.contractualPaymentTermsWithCashDiscounts, { width: "240px", title: title("contractualWithDiscount") });
    case "contractualPaymentTermsWithCashDiscountsAvg":
      return from(globalColumns.opportunityContractualPaymentTermsWithCashDiscountsAvg, { width: "240px", title: title("contractualWithDiscount") });
    case "cashDiscounts": return from(globalColumns.cashDiscounts, { title: title("cashDiscount") });
    case "capturedCashDiscounts": return from(globalColumns.capturedCashDiscounts, { title: title("capturedCashDiscount") });

    // Opportunity
    case "nineBox": return from(globalColumns.opportunityNineBox);
    case "economicProfitImpact": return from(globalColumns.opportunityEconomicProfitImpact, { title: title("economicProfitImpact") });
    case "probabilityTier": return from(globalColumns.opportunityProbabilityTier, { title: title("probabilityOfSuccess") });
    case "cashFlowImpactTier": return from(globalColumns.opportunityCashFlowImpactTier, { title: title("supplierImpactCashFlow") });
    case "recommendedTerm": return from(globalColumns.opportunityRecommendedTerm, { width: "200px", title: title("paymentTermsOpportunity") });
    case "targetPaymentTerms": return from(globalColumns.opportunityTargetPaymentTerms, { width: "200px", title: title("paymentTermsTarget") });
    case "cashFlowImpact": return from(globalColumns.opportunityCashFlowImpact, { title: title("cashFlowOpportunity") });
    // Resolved per row after paging (UC-API-18), so no filter input has it: the menu is opted out,
    // not just untyped (see normalizeGraphqlGridColumns for why `filter: undefined` is not enough).
    case "cashFlowContribution":
      return from(globalColumns.cashFlowContributionOnSelection, { width: "200px", filter: undefined, columnMenu: false, title: title("cashFlowContribution") });
    case "targetCashFlow": return from(globalColumns.modelCashFlowTarget, { width: "180px", footerCell: undefined, title: title("cashFlowTarget") });
    // AB#20905: Agreed is read through the backend's own names; output-only, null until Manage writes it.
    case "termsWithoutCashDiscount":
      return from(globalColumns.opportunityPaymentTermsAgreed, { field, width: "200px", title: title("paymentTermsAgreed") });
    case "agreedCashFlow": return from(globalColumns.opportunityCashFlowAgreed, { field, title: title("cashFlowAgreed") });

    // Outstanding & credit
    case "outstanding": return from(globalColumns.outstanding, { title: title("outstanding") });
    case "creditOutstanding": return from(globalColumns.opportunityCreditOutstanding, { title: title("creditOutstanding") });
    case "creditOutstandingWithPastDue":
      return from(globalColumns.opportunityCreditOutstandingWithPastDue, { width: "240px", title: title("creditOutstandingWithPastDue") });
    case "creditLimit": return from(globalColumns.opportunityCreditLimit, { title: title("creditLimit") });
    case "creditRating": return from(globalColumns.opportunityCreditRating);
    case "creditScoreSource": return from(globalColumns.creditScoreSource, { title: title("creditRatingEstimated") });
    case "countryCreditRating": return from(globalColumns.countryCreditRating, { title: title("countryRating") });

    // Strategies
    case "payOnTermsStrategy": return strategy(field, "180px", title("payOnTermsStrategy"));
    case "buyerParentMinStrategy": return from(globalColumns.opportunityBuyerParentMinStrategy, { width: "200px", title: title("buyerParentMinStrategy") });
    case "industryRegionStandardStrategy":
      return from(globalColumns.opportunityIndustryRegionStandardStrategy, { width: "220px", title: title("industryRegionStandardStrategy") });
    case "buyerStandardStrategy": return from(globalColumns.buyerStandardStrategy, { width: "200px", title: title("buyerStandardStrategy") });
    case "peerGroupStandard2Strategy":
      return from(globalColumns.opportunityPeerGroupStandard2Strategy, { width: "220px", title: title("peerGroupStandardStrategy") });
    case "clientStandardStrategy": return strategy(field, "220px", clientStandardTitle());
    case "buyerPolicyStrategy": return strategy(field, "180px", title("buyerPolicyStrategy"));
    case "creditLimitMaxStrategy": return strategy(field, "200px", title("creditLimitMaxStrategy"));
    case "regulatoryTermsStrategy":
      return from(globalColumns.opportunityRegulatoryTermsStrategy, { width: "200px", title: title("regulatoryTermsStrategy") });
    // AB#20905: Regulation Type is the `regulatoryTermsEnforced` flag, worded like AP (Strict / Recommendation).
    case "regulatoryTermsEnforced": return from(globalColumns.opportunityRegulatoryTermsEnforced, {
      width: "200px", cell: "regulationTypeTemplate", title: title("regulationType"),
    });

    // Company profile
    case "supplierName":
      return from(globalColumns.supplierName, { width: "220px", cell: "entityLogoTemplate", title: title("supplyingEntities") });
    case "supplierEntities": return text(field, "260px", title("supplyingEntities"));
    case "salesTeam": return from(globalColumns.opportunitySalesTeam, { title: title("salesTeam") });
    case "companySize": return text(field, "160px", title("companySize"));
    case "isSme": return from(globalColumns.opportunityIsSme, { title: title("sme") });
    case "smeClassificationStatus": return from(globalColumns.opportunitySmeClassificationStatus, { width: "200px", title: title("smeRegulationSource") });
    case "buyerLeverageLevel": return from(globalColumns.opportunityBuyerLeverageLevel, { title: title("buyerLeverage") });
    case "supplierLeverageLevel": return from(globalColumns.opportunitySupplierLeverageLevel, { title: title("supplierLeverage") });
    case "industryName": return from(globalColumns.opportunityIndustryName, { title: title("industryName") });
    case "industryCode": return text(field, "180px", title("industryNaics4"));
    case "commodity": return from(globalColumns.commodity, { title: title("commodity") });
    case "currency": return from(globalColumns.macthCurrency, { width: "140px", title: title("invoiceCurrency") });
    case "negotiationStatus": return from(globalColumns.negotiationStatus, { title: title("negotiationStatus") });

    // Geography (AB#20339: the flag sits on the full country name)
    case "countryName": return from(globalColumns.opportunityCountryNameFull, { cell: "countryFlagTemplate", title: title("countryBuyer") });
    case "regionName": return from(globalColumns.opportunityRegionName, { title: title("regionBuyer") });
    case "continent": return from(globalColumns.opportunityContinent, { title: title("continentBuyer") });
    case "supplierCountryName": return from(globalColumns.opportunitySupplierCountryName, { title: title("countrySupplyingEntity") });
    case "supplierRegionName": return from(globalColumns.opportunitySupplierRegionName, { width: "220px", title: title("regionSupplyingEntity") });
    case "supplierContinent": return from(globalColumns.opportunitySupplierContinent, { width: "220px", title: title("continentSupplyingEntity") });
    default: return undefined;
  }
}

/** Each grid's own list, in the order and default visibility of the parity document, under the
 * backend's GraphQL names (AB#20905: Agreed, Regulation Type, NAICS 4 and Supplying Entities read
 * `termsWithoutCashDiscount`/`agreedCashFlow`, `regulatoryTermsEnforced`, `industryCode` and
 * `supplierEntities`). Pay on Terms is a line-grain column only: a party's equivalent is its
 * Contractual Payment Terms average, which these lists already show. */
const COLUMN_LISTS = {
  OPPORTUNITY_saleLines: [
    ['buyerName', true],
    ['buyerOriginalName', false], ['internalId', false], ['alias', true], ['parentName', true],
    ['volume', true], ['contractualPaymentTermsWithoutCashDiscounts', true],
    ['actualPaymentTerms', true], ['contractualPaymentTermsWithCashDiscounts', false],
    ['cashDiscounts', false], ['capturedCashDiscounts', false], ['nineBox', true],
    ['economicProfitImpact', true], ['probabilityTier', true], ['recommendedTerm', true],
    ['targetPaymentTerms', false], ['cashFlowImpact', true], ['targetCashFlow', false],
    ['termsWithoutCashDiscount', false], ['agreedCashFlow', false], ['outstanding', false],
    ['creditOutstanding', false], ['creditOutstandingWithPastDue', false],
    ['payOnTermsStrategy', false], ['buyerParentMinStrategy', true],
    ['industryRegionStandardStrategy', true], ['buyerStandardStrategy', true],
    ['peerGroupStandard2Strategy', true], ['clientStandardStrategy', false],
    ['buyerPolicyStrategy', false], ['creditLimitMaxStrategy', false],
    ['regulatoryTermsStrategy', false], ['regulatoryTermsEnforced', false], ['supplierName', true],
    ['salesTeam', true], ['companySize', false], ['isSme', false],
    ['smeClassificationStatus', false], ['buyerLeverageLevel', true],
    ['supplierLeverageLevel', false], ['countryName', true], ['regionName', false],
    ['continent', false], ['supplierCountryName', false], ['supplierRegionName', false],
    ['supplierContinent', false], ['industryName', true], ['industryCode', false],
    ['commodity', true], ['countryCreditRating', false], ['creditRating', true],
    ['creditLimit', false], ['creditScoreSource', false], ['currency', false],
    ['customDataPoints', false], ['cashFlowImpactTier', true], ['negotiationStatus', false],
    ['isExcluded', false], ['exclusionReason', false],
  ],
  OPPORTUNITY_buyers: [
    ['name', true], ['originalName', false],
    ['internalId', false], ['saleLineCount', true], ['parentName', true], ['volume', true],
    ['contractualPaymentTermsWithoutCashDiscountsAvg', true], ['actualPaymentTermsAvg', true],
    ['contractualPaymentTermsWithCashDiscountsAvg', false], ['cashDiscounts', false],
    ['capturedCashDiscounts', false], ['nineBox', true], ['economicProfitImpact', true],
    ['probabilityTier', true], ['recommendedTerm', true], ['targetPaymentTerms', false],
    ['cashFlowImpact', true], ['targetCashFlow', false], ['termsWithoutCashDiscount', false],
    ['agreedCashFlow', false], ['outstanding', false], ['creditOutstanding', false],
    ['creditOutstandingWithPastDue', false],
    ['buyerParentMinStrategy', true], ['industryRegionStandardStrategy', true],
    ['buyerStandardStrategy', true], ['peerGroupStandard2Strategy', true],
    ['clientStandardStrategy', false], ['buyerPolicyStrategy', false],
    ['creditLimitMaxStrategy', false], ['regulatoryTermsStrategy', true],
    ['regulatoryTermsEnforced', false], ['supplierEntities', false], ['salesTeam', true],
    ['companySize', false], ['isSme', false], ['smeClassificationStatus', false],
    ['buyerLeverageLevel', true], ['supplierLeverageLevel', false], ['countryName', true],
    ['regionName', false], ['continent', false], ['supplierCountryName', false],
    ['supplierRegionName', false], ['supplierContinent', false], ['industryName', true],
    ['industryCode', false], ['commodity', true], ['countryCreditRating', false],
    ['creditRating', true], ['creditLimit', true], ['creditScoreSource', false],
    ['currency', false], ['customDataPoints', false], ['cashFlowImpactTier', true],
    ['negotiationStatus', false], ['isExcluded', false], ['exclusionReasons', false],
  ],
  OPPORTUNITY_parents: [
    ['name', true], ['buyerCount', false],
    ['volume', true], ['contractualPaymentTermsWithoutCashDiscountsAvg', true],
    ['actualPaymentTermsAvg', true], ['contractualPaymentTermsWithCashDiscountsAvg', false],
    ['cashDiscounts', false], ['capturedCashDiscounts', false], ['nineBox', true],
    ['economicProfitImpact', true], ['probabilityTier', true], ['recommendedTerm', true],
    ['targetPaymentTerms', false], ['cashFlowImpact', true], ['targetCashFlow', false],
    ['termsWithoutCashDiscount', false], ['agreedCashFlow', false], ['outstanding', false],
    ['creditOutstanding', false], ['creditOutstandingWithPastDue', false],
    ['buyerParentMinStrategy', true],
    ['industryRegionStandardStrategy', true], ['buyerStandardStrategy', true],
    ['peerGroupStandard2Strategy', true], ['clientStandardStrategy', false],
    ['buyerPolicyStrategy', false], ['creditLimitMaxStrategy', false],
    ['regulatoryTermsStrategy', true], ['regulatoryTermsEnforced', false], ['supplierEntities', false],
    ['salesTeam', true], ['companySize', false], ['isSme', false],
    ['smeClassificationStatus', false], ['buyerLeverageLevel', true],
    ['supplierLeverageLevel', false], ['countryName', true], ['regionName', false],
    ['continent', false], ['supplierCountryName', false], ['supplierRegionName', false],
    ['supplierContinent', false], ['industryName', true], ['industryCode', false],
    ['commodity', true], ['countryCreditRating', false], ['creditScoreSource', false],
    ['creditRating', true], ['creditLimit', true], ['currency', false],
    ['customDataPoints', false], ['cashFlowImpactTier', true], ['negotiationStatus', false],
    ['isExcluded', false], ['exclusionReasons', false],
  ],
  NINE_BOX_saleLines: [
    ['buyerName', true], ['buyerOriginalName', false], ['internalId', false], ['alias', true],
    ['nineBox', true], ['cashFlowImpactTier', true], ['probabilityTier', true],
    ['parentName', true], ['volume', true], ['contractualPaymentTermsWithoutCashDiscounts', true],
    ['actualPaymentTerms', true], ['contractualPaymentTermsWithCashDiscounts', false],
    ['cashDiscounts', false], ['capturedCashDiscounts', false], ['recommendedTerm', true],
    ['targetPaymentTerms', false], ['cashFlowImpact', true], ['targetCashFlow', false],
    ['termsWithoutCashDiscount', false], ['agreedCashFlow', false], ['supplierName', true],
    ['salesTeam', true], ['companySize', false], ['isSme', false],
    ['smeClassificationStatus', false], ['buyerLeverageLevel', true],
    ['supplierLeverageLevel', false], ['countryName', true], ['regionName', false],
    ['continent', false], ['supplierCountryName', false], ['supplierRegionName', false],
    ['supplierContinent', false], ['industryName', true], ['industryCode', false],
    ['commodity', true], ['creditRating', true], ['creditLimit', false],
    ['creditScoreSource', false], ['currency', false], ['customDataPoints', false],
    ['negotiationStatus', false],
  ],
  NINE_BOX_buyers: [
    ['name', true], ['originalName', false], ['internalId', false], ['saleLineCount', true],
    ['nineBox', true], ['cashFlowImpactTier', true], ['probabilityTier', true],
    ['parentName', true], ['volume', true],
    ['contractualPaymentTermsWithoutCashDiscountsAvg', true], ['actualPaymentTermsAvg', true],
    ['contractualPaymentTermsWithCashDiscountsAvg', false], ['cashDiscounts', false],
    ['capturedCashDiscounts', false], ['recommendedTerm', true], ['targetPaymentTerms', false],
    ['cashFlowImpact', true], ['targetCashFlow', false], ['termsWithoutCashDiscount', false],
    ['agreedCashFlow', false], ['supplierEntities', false], ['salesTeam', true],
    ['companySize', false], ['isSme', false], ['smeClassificationStatus', false],
    ['buyerLeverageLevel', true], ['supplierLeverageLevel', false], ['countryName', true],
    ['regionName', false], ['continent', false], ['supplierCountryName', false],
    ['supplierRegionName', false], ['supplierContinent', false], ['industryName', true],
    ['industryCode', false], ['commodity', true], ['creditRating', true], ['creditLimit', true],
    ['creditScoreSource', false], ['currency', false], ['customDataPoints', false],
    ['negotiationStatus', false],
  ],
  NINE_BOX_parents: [
    ['name', true], ['buyerCount', false], ['nineBox', true], ['cashFlowImpactTier', true],
    ['probabilityTier', true], ['volume', true],
    ['contractualPaymentTermsWithoutCashDiscountsAvg', true], ['actualPaymentTermsAvg', true],
    ['contractualPaymentTermsWithCashDiscountsAvg', false], ['cashDiscounts', false],
    ['capturedCashDiscounts', false], ['recommendedTerm', true], ['targetPaymentTerms', false],
    ['cashFlowImpact', true], ['targetCashFlow', false], ['termsWithoutCashDiscount', false],
    ['agreedCashFlow', false], ['supplierEntities', false], ['salesTeam', true],
    ['companySize', false], ['isSme', false], ['smeClassificationStatus', false],
    ['buyerLeverageLevel', true], ['supplierLeverageLevel', false], ['countryName', true],
    ['regionName', false], ['continent', false], ['supplierCountryName', false],
    ['supplierRegionName', false], ['supplierContinent', false], ['industryName', true],
    ['industryCode', false], ['commodity', true], ['creditScoreSource', false],
    ['creditRating', true], ['creditLimit', true], ['currency', false],
    ['customDataPoints', false], ['negotiationStatus', false],
  ],
  WATERFALL_saleLines: [
    ['buyerName', true], ['buyerOriginalName', false], ['internalId', false], ['alias', true],
    ['parentName', true], ['volume', true], ['contractualPaymentTermsWithoutCashDiscounts', true],
    ['actualPaymentTerms', true], ['contractualPaymentTermsWithCashDiscounts', false],
    ['cashDiscounts', false], ['capturedCashDiscounts', false], ['recommendedTerm', true],
    ['targetPaymentTerms', false], ['cashFlowContribution', true], ['cashFlowImpact', true],
    ['targetCashFlow', false], ['termsWithoutCashDiscount', false], ['agreedCashFlow', false],
    ['buyerParentMinStrategy', true], ['industryRegionStandardStrategy', true],
    ['buyerStandardStrategy', true], ['peerGroupStandard2Strategy', true],
    ['clientStandardStrategy', false], ['buyerPolicyStrategy', false],
    ['creditLimitMaxStrategy', false], ['regulatoryTermsStrategy', false],
    ['regulatoryTermsEnforced', false], ['supplierName', true], ['salesTeam', true], ['companySize', false],
    ['isSme', false], ['smeClassificationStatus', false], ['buyerLeverageLevel', true],
    ['supplierLeverageLevel', false], ['countryName', true], ['regionName', false],
    ['continent', false], ['supplierCountryName', false], ['supplierRegionName', false],
    ['supplierContinent', false], ['industryName', true], ['industryCode', false],
    ['commodity', true], ['countryCreditRating', false], ['creditRating', true],
    ['creditLimit', false], ['creditScoreSource', false], ['currency', false],
    ['customDataPoints', false], ['nineBox', true], ['cashFlowImpactTier', true],
    ['probabilityTier', true], ['negotiationStatus', false],
  ],
  ENTITY_CARD_saleLines: [
    ['buyerName', true],
    ['buyerOriginalName', false], ['internalId', false], ['alias', true], ['parentName', true],
    ['volume', true], ['contractualPaymentTermsWithoutCashDiscounts', true],
    ['actualPaymentTerms', true], ['recommendedTerm', true], ['targetPaymentTerms', false],
    ['contractualPaymentTermsWithCashDiscounts', false], ['cashDiscounts', false],
    ['capturedCashDiscounts', false], ['nineBox', true], ['economicProfitImpact', true],
    ['cashFlowImpact', true], ['targetCashFlow', false], ['termsWithoutCashDiscount', false],
    ['agreedCashFlow', false], ['buyerParentMinStrategy', true],
    ['industryRegionStandardStrategy', true], ['buyerStandardStrategy', true],
    ['peerGroupStandard2Strategy', true], ['clientStandardStrategy', false],
    ['buyerPolicyStrategy', false], ['creditLimitMaxStrategy', false],
    ['regulatoryTermsStrategy', false], ['regulatoryTermsEnforced', false], ['supplierName', true],
    ['salesTeam', true], ['countryName', true], ['industryName', true],
    ['supplierCountryName', false], ['commodity', true], ['currency', false],
    ['negotiationStatus', false], ['isExcluded', false], ['exclusionReason', false],
  ],
} as const satisfies Record<string, ColumnList>;

/** Stands for the twenty custom attribute columns, which keep their own data-driven visibility. */
const CUSTOM_DATA_POINTS = "customDataPoints";

function buildColumns(level: OverviewGridLevel, list: ColumnList): Column[] {
  const clientOnly = CLIENT_ONLY_FIELDS[level];
  return list.flatMap(([field, visible]): Column[] => {
    if (field === CUSTOM_DATA_POINTS) return customAttributeColumns();
    const column = catalogColumn(level, field);
    if (!column) throw new Error(`overviewColumns: no catalog column for "${field}" on ${level}`);
    if (clientOnly.has(field)) {
      return [{ ...column, hidden: true, sortable: false, filter: undefined, columnMenu: false, footerCell: undefined }];
    }
    // `columnMenu: false`, not just `filter: undefined`: Kendo falls back to a text filter when
    // `filter` is absent, and a filter on one of these fields fails the whole query.
    const notSortable = NOT_YET_SORTABLE_OR_FILTERABLE[level].has(field)
      ? { sortable: false, filter: undefined, columnMenu: false }
      : NOT_SORTABLE[level].has(field) ? { sortable: false } : {};
    const footerCell = TOTALS_NOT_YET_SUPPORTED[level].has(field) ? undefined : FOOTERS[field];
    return [{ ...column, ...notSortable, hidden: !visible, footerCell }];
  });
}

// Opportunity › List (also the Overview's drill-down list).
export const saleLineOverviewColumns = (): Column[] => buildColumns("saleLines", COLUMN_LISTS.OPPORTUNITY_saleLines);
export const buyerOverviewColumns = (): Column[] => buildColumns("buyers", COLUMN_LISTS.OPPORTUNITY_buyers);
export const parentOverviewColumns = (): Column[] => buildColumns("parents", COLUMN_LISTS.OPPORTUNITY_parents);

// 9 Boxes › Buyer Prioritization.
export const saleLineNineBoxColumns = (): Column[] => buildColumns("saleLines", COLUMN_LISTS.NINE_BOX_saleLines);
export const buyerNineBoxColumns = (): Column[] => buildColumns("buyers", COLUMN_LISTS.NINE_BOX_buyers);
export const parentNineBoxColumns = (): Column[] => buildColumns("parents", COLUMN_LISTS.NINE_BOX_parents);

// Waterfall drill-in (sale lines only).
export const waterfallSaleLineOverviewColumns = (): Column[] => buildColumns("saleLines", COLUMN_LISTS.WATERFALL_saleLines);

// Entity Card › Opportunity (the Customer Card's line list).
export const entityCardSaleLineColumns = (): Column[] => buildColumns("saleLines", COLUMN_LISTS.ENTITY_CARD_saleLines);
