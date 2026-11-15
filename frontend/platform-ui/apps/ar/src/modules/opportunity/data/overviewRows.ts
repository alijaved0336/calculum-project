import type { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import type { GraphqlGridColumnOrGroup } from "@ada/design-system/components/graphql-grid/types";
import { visibleGraphqlGridFields } from "@ada/design-system/components/graphql-grid/types";
import { fetchGraphqlGridPage, type GraphqlGridPage, type GraphqlGridQueryConfig } from "@/utils/graphqlGridQuery";
import {
  isCustomDataPointField,
  type CustomAttributeGridFilter,
} from "@/utils/customAttributeColumns";

/**
 * The Opportunity overview's three-level list: sale lines, buyers and ultimate parents, one
 * GraphQL collection field per level (Ada.Ar.Api's `saleLineOverviewRows` / `buyerOverviewRows` /
 * `parentOverviewRows`). The AR twin of the monolith's
 * `collectionQueryProgramListSpends/Suppliers/Parents`, built on the same shared page fetcher the
 * Match grid uses — a level here is a query config, not another query builder.
 */
export type OverviewGridLevel = "saleLines" | "buyers" | "parents";

export interface SaleLineOverviewRow {
  saleLineId?: number;
  /** The buyer's party id — the field a party row's expansion filters by. */
  buyerId?: number;
  /** `buyerId` again, aliased (`partyId: buyerId`) so entity cells can open the buyer's Customer
   * Card - see SALE_LINE_PARTY_ID_SELECTION. */
  partyId?: number;
  buyerName?: string | null;
  /** The buyer's logo image URL, ready to use as-is — a companion to `buyerName`, not a column of
   * its own (see the field-dependency note near visibleOverviewRowFields below). */
  buyerLogoUrl?: string | null;
  parentName?: string | null;
  /** The parent organization's logo image URL, ready to use as-is — a companion to `parentName`,
   * not a column of its own (see the field-dependency note near visibleOverviewRowFields below). */
  parentLogoUrl?: string | null;
  supplierName?: string | null;
  /** The pipeline-assigned line name ("Sale 01…NN" per buyer) — line grain only. */
  alias?: string | null;
  countryCode?: string | null;
  regionName?: string | null;
  industryName?: string | null;
  isSme?: boolean | null;
  currency?: string | null;
  volume?: number | null;
  actualPaymentTerms?: number | null;
  contractualPaymentTermsWithCashDiscounts?: number | null;
  contractualPaymentTermsWithoutCashDiscounts?: number | null;
  cashDiscounts?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  aggregatedLinesCount?: number | null;
  winningStrategy?: string | null;
  recommendedTerm?: number | null;
  currentTerm?: number | null;
  expectedTerm?: number | null;
  cashFlowImpact?: number | null;
  expectedCashFlowImpact?: number | null;
  economicProfitImpact?: number | null;
  expectedEconomicProfitImpact?: number | null;
  probabilityScore?: number | null;
  probabilityTier?: string | null;
  cashFlowImpactTier?: string | null;
  /** The row's own nine-box cell (1-9), or null when either tier is missing (UC-OPP-17 A1) - the
   * same field NineBoxRowsGrid already filters this level's rows by. */
  nineBox?: number | null;
  waterfallBucketName?: string | null;
  noOpportunityReason?: string | null;
  isExcluded?: boolean;
  exclusionReason?: string | null;

  // Column-parity fields (Ada.Ar.Api's `saleLineOverviewRows`, widened to match the payables
  // calculated tables - see globalColumns.ts's "AB#column-parity" section for the columns these
  // back). Grouped the same way that section is.
  countryName?: string | null;
  /** The row's country flag image URL, ready to use as-is — a companion to `countryName`, not a
   * column of its own (see the field-dependency note near visibleOverviewRowFields below). */
  countryFlagUrl?: string | null;
  continent?: string | null;
  countryCreditRating?: string | null;
  supplierCountryCode?: string | null;
  supplierCountryName?: string | null;
  supplierRegionName?: string | null;
  supplierContinent?: string | null;
  salesTeam?: string | null;
  commodity?: string | null;
  originalCommodity?: string | null;
  internalId?: string | null;
  buyerOriginalName?: string | null;
  buyerExternalId?: string | null;
  buyerCleanCanonicalName?: string | null;
  buyerUrl?: string | null;
  buyerInvestVerteEsgScore?: string | null;
  buyerStockTicker?: string | null;
  parentIndustryNaics?: string | null;
  smeClassificationStatus?: string | null;
  estimatedCompanySize?: boolean | null;
  isCompanySizeFromParent?: boolean | null;
  annualRevenueIsEstimated?: boolean | null;
  isMinorityOwned?: boolean | null;
  isVeteranOwned?: boolean | null;
  isWomanOwned?: boolean | null;
  isPublic?: boolean | null;
  creditScore?: number | null;
  creditScoreSource?: string | null;
  dsoReference?: number | null;
  modelCashFlow?: number | null;
  targetPaymentTerms?: number | null;
  negotiationStatusCode?: number | null;
  negotiationStatusUpdatedAt?: string | null;
  termsWithCashDiscount?: number | null;
  termsWithoutCashDiscount?: number | null;
  agreedCashFlow?: number | null;
  newTermsCashDiscount?: number | null;
  agreedDateOfChange?: string | null;
  nextReviewDate?: string | null;
  effectiveDate?: string | null;
  modelPaymentTerms?: number | null;
  targetCashFlow?: number | null;
  afterTaxWacc?: number | null;
  preTaxWacc?: number | null;
  waccSource?: string | null;
  waccFromParent?: boolean | null;
  peerGroupStandard2Strategy?: number | null;
  buyerStandardStrategy?: number | null;
  industryRegionStandardStrategy?: number | null;
  buyerParentMinStrategy?: number | null;
  discountConversionStrategy?: number | null;
  regulatoryTermsEnforced?: boolean | null;
  buyerLeverage?: number | null;
  supplierLeverage?: number | null;
  buyerLeverageLevel?: string | null;
  supplierLeverageLevel?: string | null;
  usingWorkingCapitalFinance?: boolean | null;
  dataQuality?: number | null;
  year?: number | null;
  payOnTermsStrategyIsApplicable?: boolean | null;
  dpo?: number | null;
  dpoStrategy?: number | null;
  outstanding?: number | null;
  averageDaysToApproveInvoice?: number | null;
  dateOfLastTermNegotiation?: string | null;
  capturedCashDiscounts?: number | null;
  periodInMonths?: number | null;
  industryCode?: string | null;
  // AB#20905: strategy candidates, the company size band and the buyer's credit figures.
  payOnTermsStrategy?: number | null;
  regulatoryTermsStrategy?: number | null;
  clientStandardStrategy?: number | null;
  creditLimitMaxStrategy?: number | null;
  /** The policy term stated on the line (the party grain's field of the same name is the buyer's
   * strategy candidate instead). */
  buyerPolicyStrategy?: number | null;
  companySize?: string | null;
  creditLimit?: number | null;
  creditOutstanding?: number | null;
  creditOutstandingWithPastDue?: number | null;

  /**
   * Raw per-row custom-attribute values as fetched from GraphQL. toDisplayOverviewRow projects them
   * onto the `customDataPoint{ordinal}` fields the columns bind to.
   */
  customAttributes?: Array<{ ordinal: number; value: unknown; supplied: boolean }>;
  [field: `customDataPoint${number}`]: unknown;
}

export interface PartyOverviewRow {
  partyId?: number;
  name?: string | null;
  /** The row's own entity logo image URL, ready to use as-is — a companion to `name` (the
   * Buyers/Parents levels' own identity column), not a column of its own (see the field-dependency
   * note near visibleOverviewRowFields below). */
  logoUrl?: string | null;
  /** The ultimate parent's party id, when the row has one. */
  parentId?: number | null;
  /**
   * COUNTERPARTY or PARENT. Constant on the buyers level; on the parents level it tells a real
   * parent (expands into its child buyers) from a standalone buyer serving as its own ultimate
   * party (expands into its own lines).
   */
  role?: string;
  parentName?: string | null;
  /** The parent organization's logo image URL, ready to use as-is — a companion to `parentName`,
   * not a column of its own (see the field-dependency note near visibleOverviewRowFields below). */
  parentLogoUrl?: string | null;
  countryCode?: string | null;
  regionName?: string | null;
  industryName?: string | null;
  isSme?: boolean | null;
  currency?: string | null;
  dpo?: number | null;
  volume?: number | null;
  saleLineCount?: number | null;
  actualPaymentTermsAvg?: number | null;
  contractualPaymentTermsWithCashDiscountsAvg?: number | null;
  contractualPaymentTermsWithoutCashDiscountsAvg?: number | null;
  winningStrategy?: string | null;
  recommendedTerm?: number | null;
  currentTerm?: number | null;
  expectedTerm?: number | null;
  cashFlowImpact?: number | null;
  expectedCashFlowImpact?: number | null;
  economicProfitImpact?: number | null;
  expectedEconomicProfitImpact?: number | null;
  probabilityScore?: number | null;
  probabilityTier?: string | null;
  cashFlowImpactTier?: string | null;
  /** The row's own nine-box cell (1-9), or null when either tier is missing (UC-OPP-17 A1) - the
   * same field NineBoxRowsGrid already filters this level's rows by. */
  nineBox?: number | null;
  waterfallBucketName?: string | null;
  noOpportunityReason?: string | null;
  creditLimit?: number | null;
  creditOutstanding?: number | null;
  creditOutstandingWithPastDue?: number | null;
  isExcluded?: boolean;

  // Column-parity fields (Ada.Ar.Api's `buyerOverviewRows`/`parentOverviewRows`, widened to match
  // the payables calculated tables). See SaleLineOverviewRow's own column-parity block above for
  // the fields the two grains share (one globalColumns.ts export serves both there).
  countryName?: string | null;
  /** The row's country flag image URL, ready to use as-is — a companion to `countryName`, not a
   * column of its own (see the field-dependency note near visibleOverviewRowFields below). */
  countryFlagUrl?: string | null;
  continent?: string | null;
  countryCreditRating?: string | null;
  supplierCountryCode?: string | null;
  supplierCountryName?: string | null;
  supplierRegionName?: string | null;
  supplierContinent?: string | null;
  salesTeam?: string | null;
  commodity?: string | null;
  internalId?: string | null;
  originalName?: string | null;
  externalId?: string | null;
  cleanCanonicalName?: string | null;
  url?: string | null;
  investVerteEsgScore?: string | null;
  stockTicker?: string | null;
  bvdIdNumber?: string | null;
  idNumber?: string | null;
  typeOfIdNumber?: string | null;
  ultimateParentBvdId?: string | null;
  legalForm?: string | null;
  relationshipType?: string | null;
  parentIndustryNaics?: string | null;
  parentIndustryNaicsCode?: string | null;
  smeClassificationStatus?: string | null;
  estimatedCompanySize?: boolean | null;
  isCompanySizeFromParent?: boolean | null;
  annualRevenueIsEstimated?: boolean | null;
  isMinorityOwned?: boolean | null;
  isVeteranOwned?: boolean | null;
  isWomanOwned?: boolean | null;
  isPublic?: boolean | null;
  isPilot?: boolean | null;
  creditScore?: number | null;
  creditScoreSource?: string | null;
  dsoReference?: number | null;
  modeFinanceCreditScore?: string | null;
  creditInsured?: string | null;
  confidenceScore?: number | null;
  modelCashFlow?: number | null;
  targetPaymentTerms?: number | null;
  negotiationStatus?: string | null;
  negotiationStatusCode?: number | null;
  negotiationStatusUpdatedAt?: string | null;
  termsWithCashDiscount?: number | null;
  termsWithoutCashDiscount?: number | null;
  agreedCashFlow?: number | null;
  newTermsCashDiscount?: number | null;
  agreedDateOfChange?: string | null;
  nextReviewDate?: string | null;
  effectiveDate?: string | null;
  modelPaymentTerms?: number | null;
  targetCashFlow?: number | null;
  afterTaxWacc?: number | null;
  preTaxWacc?: number | null;
  waccSource?: string | null;
  peerGroupStandard2Strategy?: number | null;
  buyerStandardStrategy?: number | null;
  industryRegionStandardStrategy?: number | null;
  buyerParentMinStrategy?: number | null;
  discountConversionStrategy?: number | null;
  regulatoryTermsStrategy?: number | null;
  regulatoryTermsEnforced?: boolean | null;
  buyerLeverage?: number | null;
  supplierLeverage?: number | null;
  buyerLeverageLevel?: string | null;
  supplierLeverageLevel?: string | null;
  forecastVolume?: number | null;
  periodInDays?: number | null;
  periodInMonths?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  dateOfLastTermNegotiation?: string | null;
  cashDiscounts?: number | null;
  capturedCashDiscounts?: number | null;
  averageDaysToApproveInvoice?: number | null;
  industryCode?: string | null;
  // AB#20905. clientStandardStrategy / creditLimitMaxStrategy / buyerPolicyStrategy are buyer-level:
  // always null on a Parent row (a standalone buyer on the parents level still carries them).
  clientStandardStrategy?: number | null;
  creditLimitMaxStrategy?: number | null;
  buyerPolicyStrategy?: number | null;
  companySize?: string | null;
  /** Buyers behind the included lines: 1 for a buyer, its children for a parent. */
  buyerCount?: number | null;
  /** Distinct exclusion reasons joined by `|`, only when every line is excluded. */
  exclusionReasons?: string | null;
  /** "name - country" of each supplying entity, comma-joined. */
  supplierEntities?: string | null;

  /**
   * The party's custom-attribute values, ROLLED UP over its lines by the calculation — a text
   * attribute reads as its distinct values comma-joined rather than as one cell, and a family's row
   * aggregates every line under every child. Same shape as the line grain's so one renderer serves
   * both.
   */
  customAttributes?: Array<{ ordinal: number; value: unknown; supplied: boolean }>;
  [field: `customDataPoint${number}`]: unknown;
}

export type OverviewRow = SaleLineOverviewRow | PartyOverviewRow;

// The two party levels share one projection (and so one filter/sort input); the field itself
// carries the role predicate, which is why there is no `role` variable here to get wrong.
const QUERY_CONFIGS: Record<OverviewGridLevel, GraphqlGridQueryConfig> = {
  saleLines: {
    queryField: "saleLineOverviewRows",
    operationName: "SaleLineOverviewRows",
    filteredOperationName: "SaleLineOverviewRowsFiltered",
    filterInputType: "SaleLineOverviewRowFactFilterInput",
    sortInputType: "SaleLineOverviewRowFactSortInput",
    scopeVariables: { versionUuid: "UUID!", currencyRate: "Decimal" },
  },
  buyers: {
    queryField: "buyerOverviewRows",
    operationName: "BuyerOverviewRows",
    filteredOperationName: "BuyerOverviewRowsFiltered",
    filterInputType: "PartyOverviewRowFactFilterInput",
    sortInputType: "PartyOverviewRowFactSortInput",
    scopeVariables: { versionUuid: "UUID!", currencyRate: "Decimal" },
  },
  parents: {
    queryField: "parentOverviewRows",
    operationName: "ParentOverviewRows",
    filteredOperationName: "ParentOverviewRowsFiltered",
    filterInputType: "PartyOverviewRowFactFilterInput",
    sortInputType: "PartyOverviewRowFactSortInput",
    scopeVariables: { versionUuid: "UUID!", currencyRate: "Decimal" },
  },
};

/** Each level's stable row identity — the grid's dataItemKey and the selection's fallback field. */
export const OVERVIEW_ROW_KEYS: Record<OverviewGridLevel, string> = {
  saleLines: "saleLineId",
  buyers: "partyId",
  parents: "partyId",
};

/**
 * Grid columns with no backend field behind them, per grain: they render empty and must never
 * reach the GraphQL selection — an unknown field is a validation error that blanks the whole grid,
 * not a null column (Ada.Ar.Api's OverviewRowTypes binds its fields explicitly). Since AB#20905
 * only AB#18931's "Agreed" pair is left, now read through `termsWithoutCashDiscount` /
 * `agreedCashFlow` (null until Manage writes them): no grid lists these two names any more, the
 * set stays so the export and the selection keep refusing them should a saved layout still have
 * them. A field leaves its grain's set the day the backend exposes it.
 */
const AGREED_PLACEHOLDERS = ["paymentTermsAgreed", "cashFlowAgreed"];
export const CLIENT_ONLY_FIELDS: Record<OverviewGridLevel, ReadonlySet<string>> = {
  saleLines: new Set(AGREED_PLACEHOLDERS),
  buyers: new Set(AGREED_PLACEHOLDERS),
  parents: new Set(AGREED_PLACEHOLDERS),
};

/**
 * Fields the row types expose but the backend cannot filter by: they are missing from the
 * `*OverviewRowFactFilterInput` types (a column filter on one is a GraphQL validation error that
 * blanks the grid) and from the summary endpoint's OpportunityFilterFields (the footer totals 400).
 * Their columns stay neither sortable nor filterable. Target has no writer until WI 20657; the
 * Agreed pair is output-only (null until Manage writes it).
 */
const NOT_FILTERABLE = new Set([
  "targetPaymentTerms", "targetCashFlow", "termsWithoutCashDiscount", "agreedCashFlow",
]);
export const NOT_YET_SORTABLE_OR_FILTERABLE: Record<OverviewGridLevel, ReadonlySet<string>> = {
  saleLines: NOT_FILTERABLE,
  buyers: NOT_FILTERABLE,
  parents: NOT_FILTERABLE,
};

/**
 * Fields the backend filters by but deliberately will not sort by (missing from the
 * `*OverviewRowFactSortInput` types only): the leverage bands, whose names would sort High < Low <
 * Medium. Their columns keep their filter; sorting by band goes through the `buyerLeverage` /
 * `supplierLeverage` ratios instead.
 */
const FILTER_ONLY = new Set(["buyerLeverageLevel", "supplierLeverageLevel"]);
export const NOT_SORTABLE: Record<OverviewGridLevel, ReadonlySet<string>> = {
  saleLines: FILTER_ONLY,
  buyers: FILTER_ONLY,
  parents: FILTER_ONLY,
};

/**
 * Footer totals the parity document asks for but the summary endpoint does not compute (Ada-
 * Platform's OpportunitySummaryNatures 400s the WHOLE request over one field it does not know,
 * which would blank every other total too). Their columns keep no footer; once the backend totals
 * a field, removing it here is all it takes to show it. `cashFlowContribution` totals only with a
 * `waterfallStep` (Waterfall.vue leaves it out of the baseline's request).
 */
const TARGET_TOTALS = new Set(["targetPaymentTerms", "targetCashFlow"]);
export const TOTALS_NOT_YET_SUPPORTED: Record<OverviewGridLevel, ReadonlySet<string>> = {
  saleLines: TARGET_TOTALS,
  buyers: TARGET_TOTALS,
  parents: TARGET_TOTALS,
};

/**
 * The one row-level field every custom attribute's value arrives in.
 *
 * There is no per-ordinal field on either projection type, deliberately: a GraphQL schema whose shape
 * moved with what each tenant declared could not be cost-analysed or code-generated, so the values
 * travel as data in one list and the grid renders its cells from it. `title`/`dataType` are not asked
 * for here because the column headers already carry them (fetchCustomAttributes supplies those once
 * per version, not once per row).
 */
const CUSTOM_ATTRIBUTES_SELECTION = "customAttributes { ordinal value supplied }";

/**
 * AB#20356 landed the buyer/parent logo and country flag fields on both
 * `SaleLineOverviewRowFact` and `PartyOverviewRowFact` — each one an image URL with no column of
 * its own (see `buyerLogoUrl`/`parentLogoUrl`/`countryFlagUrl`/`logoUrl` on the row types above),
 * so it only rides along when the column that actually draws it is visible. Keyed by the trigger
 * field EntityLogoColumn.vue/CountryFlagColumn.vue read the companion off:
 * - `buyerName` (Sale Lines' Buying Entity column) needs that grain's own logo — the backend
 *   exposes it as plain `logoUrl` there too, so it's requested under an alias
 *   (`buyerLogoUrl: logoUrl`) to land on the row under the name EntityLogoColumn.vue's `buyerName`
 *   case reads.
 * - `parentName` (every level's Parent Organization column) needs `parentLogoUrl`, same name on
 *   both sides at every grain.
 * - `supplierName` (Sale Lines' Supplier column) needs `supplierLogoUrl` — line grain only, since
 *   `supplierName` isn't a field the party grain's projection has at all (its supplier columns
 *   below are rollups, not a single entity).
 * - `supplierCountryName` (every level's supplier-country column, itself a column-parity rollup at
 *   the party grain) needs `supplierCountryFlagUrl`, same name at every grain since AB#20480
 *   landed it on `PartyOverviewRowFact` too (null there when the party's lines span more than one
 *   selling country — a DISTINCT list has no single flag to draw).
 *
 * `logoUrl` (the `name` column's logo) and `countryFlagUrl` (the `countryName` column's flag) are
 * not in this list: see ALWAYS_REQUESTED_IMAGE_FIELDS below.
 */
const IMAGE_FIELD_DEPENDENCIES: { trigger: string; selection: string }[] = [
  // Logos
  { trigger: "buyerName", selection: "buyerLogoUrl: logoUrl" },
  { trigger: "parentName", selection: "parentLogoUrl" },
  { trigger: "supplierName", selection: "supplierLogoUrl" },
  // Flags
  { trigger: "supplierCountryName", selection: "supplierCountryFlagUrl" },
];

/**
 * Requested on every level whether or not their column is visible: clicking an entity cell opens
 * the Customer Card modal (useEntityLogoCustomerCard), whose header shows the row's own logo and
 * country flag, so the row must always carry them. Same field name at every grain.
 */
const ALWAYS_REQUESTED_IMAGE_FIELDS = ["logoUrl", "countryFlagUrl"];

/**
 * Same reason, but only on the party levels (Buyers/Parents) - the only rows carrying the
 * `partyId` that makes a cell open the modal: its header shows the party's original name and role.
 * Either can also be a visible column, so each is only added when not already selected.
 */
const ALWAYS_REQUESTED_PARTY_FIELDS = ["originalName", "role"];

/**
 * The line grain has no `partyId` of its own (`SaleLineOverviewRowFact` binds its fields
 * explicitly and never declares one), but its `buyerId` is that same party id - the very value a
 * party row's sub-list filters its lines by. Aliased so a line row's entity cells open its buyer's
 * Customer Card through the same `partyId` check the party levels use. Not the row KEY, though:
 * `saleLineId` stays that, since every line of one buyer shares this value.
 */
const SALE_LINE_PARTY_ID_SELECTION = "partyId: buyerId";

export function visibleOverviewRowFields(
  level: OverviewGridLevel,
  columns: GraphqlGridColumnOrGroup[],
): string[] {
  const key = OVERVIEW_ROW_KEYS[level];
  const visible = visibleGraphqlGridFields(columns, key)
    .filter((field) => !CLIENT_ONLY_FIELDS[level].has(field));

  // Any visible custom column swaps its own (nonexistent) field name for the single list selection
  // that actually carries its value — asked for once however many of the twenty are on screen.
  const fields = visible.filter((field) => !isCustomDataPointField(field));
  if (fields.length !== visible.length) {
    fields.push(CUSTOM_ATTRIBUTES_SELECTION);
  }

  // Each entity/country image rides along only when the column that draws it is visible — asking
  // for it unconditionally would cost every request a field most of them never render.
  for (const { trigger, selection } of IMAGE_FIELD_DEPENDENCIES) {
    if (visible.includes(trigger)) {
      fields.push(selection);
    }
  }
  fields.push(...ALWAYS_REQUESTED_IMAGE_FIELDS);
  if (level === "buyers" || level === "parents") {
    fields.push(...ALWAYS_REQUESTED_PARTY_FIELDS.filter((field) => !fields.includes(field)));
  } else {
    fields.push(SALE_LINE_PARTY_ID_SELECTION);
  }

  // The row key is not a visible column, but it is every row's identity (the grid's dataItemKey),
  // so it always rides along.
  return fields.includes(key) ? fields : [key, ...fields];
}

// Same treatment as apps/ar's Match toDisplaySaleMatchRow (and apps/ap's OverviewList.vue before
// it): the grid query returns these as the raw fraction (e.g. 0.05), not the percentage
// PercentColumn actually renders (e.g. 5). `newTermsCashDiscount` joined `cashDiscounts` here
// because it reuses the same `percentColumn` cell (see globalColumns.ts's own export) - it is
// G-485 null on every row today, so this is a no-op until its calculator lands, not a rescale of
// live data. A row missing one of these (either party level, or a level with no opportunity yet)
// simply passes through unchanged.
const PERCENT_FRACTION_FIELDS = ["cashDiscounts", "newTermsCashDiscount"] as const;

export function toDisplayOverviewRow<TRow extends OverviewRow>(row: TRow): TRow {
  // Always a copy, never the original — Apollo freezes its results, and the grid's expansion
  // writes `expanded`/`detailRows` onto the row; on a frozen original the write dies silently and
  // no row ever expands. The copy is this mapper's second job, same as Match's toDisplaySaleMatchRow.
  //
  // The custom attributes are projected onto the `customDataPoint{ordinal}` fields the columns name.
  // Only a SUPPLIED value is projected: an unsupplied declaration is left absent rather than shown as
  // some placeholder, so the cell renders exactly like any other blank one.
  const customDataPoints = Object.fromEntries(
    (row.customAttributes ?? [])
      .filter((attribute) => attribute.supplied)
      .map((attribute) => [`customDataPoint${attribute.ordinal}`, attribute.value]));

  const scaledPercents = Object.fromEntries(
    PERCENT_FRACTION_FIELDS
      .filter((field) => typeof (row as Record<string, unknown>)[field] === "number")
      .map((field) => [field, ((row as Record<string, unknown>)[field] as number) * 100]));

  return { ...row, ...customDataPoints, ...scaledPercents };
}

export interface FetchOverviewRowsOptions {
  skip?: number;
  take?: number;
  order?: Record<string, "ASC" | "DESC">[];
  where?: Record<string, unknown> | null;
  customFilters?: CustomAttributeGridFilter[];
  /** Scales every money field on each row from USD into the navbar's selected currency
   * (`useArCurrenciesStore.currency`) - 1 leaves them in USD. */
  currencyRate?: number;
}

export function fetchOverviewRows<TRow extends OverviewRow>(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  level: OverviewGridLevel,
  versionUuid: string,
  fields: string[],
  {
    skip = 0,
    take = 25,
    order = [{ volume: "DESC" }],
    where = null,
    customFilters = [],
    currencyRate = 1,
  }: FetchOverviewRowsOptions = {},
): Promise<GraphqlGridPage<TRow>> {
  return fetchGraphqlGridPage<TRow>(apolloClient, QUERY_CONFIGS[level], {
    scope: { versionUuid, currencyRate },
    fields,
    skip,
    take,
    order,
    where,
    // An argument of the FIELD, not of `where`: see CUSTOM_ATTRIBUTES_SELECTION for why a tenant's
    // attributes are never fields of the filter input. Omitted entirely when empty, so an unfiltered
    // page sends the document it always sent.
    fieldArguments: customFilters.length === 0
      ? []
      : [{
          name: "customFilters",
          type: "[CustomAttributeFilterInput!]",
          value: customFilters,
        }],
  });
}
