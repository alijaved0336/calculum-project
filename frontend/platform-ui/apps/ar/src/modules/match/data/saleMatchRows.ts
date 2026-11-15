import type { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import type { GraphqlGridColumnOrGroup } from "@ada/design-system/components/graphql-grid/types";
import { visibleGraphqlGridFields } from "@ada/design-system/components/graphql-grid/types";
import { fetchGraphqlGridPage, type GraphqlGridPage, type GraphqlGridQueryConfig } from "@/utils/graphqlGridQuery";
import { setConfidenceScore, toConfidenceScoreLabel } from "@/utils/confidenceScore";
import type { CustomAttributeGridFilter } from "@/utils/customAttributeColumns";

export interface SaleMatchRow {
  sourceRowNumber?: number;
  isMatched?: boolean;
  isExcluded?: boolean;
  exclusionReason?: string | null;
  noMatchReason?: string | null;
  buyerNameAR?: string | null;
  buyerCountryCode?: string | null;
  volume?: number | null;
  actualPaymentTerms?: number | null;
  originalBuyerName?: string | null;
  // Raw numeric score as fetched from GraphQL; toDisplaySaleMatchRow overwrites it with the
  // translated label the grid actually displays, mirroring apps/ap's OverviewList.vue.
  confidenceScore?: number | string | null;
  confidenceScoreColor?: string;
  aggregatedLinesCount?: number;
  parentCompanyName?: string | null;
  commodity?: string | null;
  contractualPaymentTermsWithoutCashDiscounts?: number | null;
  contractualPaymentTermsWithCashDiscounts?: number | null;
  // Raw fraction as fetched from GraphQL (e.g. 0.05); toDisplaySaleMatchRow scales it to the
  // percentage PercentColumn actually renders (e.g. 5), mirroring apps/ap's OverviewList.vue.
  cashDiscounts?: number | null;
  // Raw per-row custom-attribute values as fetched from GraphQL (see CUSTOM_ATTRIBUTES_SELECTION
  // below); toDisplaySaleMatchRow projects these onto customDataPoint{ordinal} for display, the
  // field names graphqlColumns.ts's "Custom Attributes" columns actually bind to.
  customAttributes?: Array<{ ordinal: number; value: unknown; supplied: boolean }>;
  [field: `customDataPoint${number}`]: unknown;
}

// Ada.Ar.Api's `saleMatchRows` field, scoped to one spend file version.
const SALE_MATCH_ROWS_QUERY_CONFIG: GraphqlGridQueryConfig = {
  queryField: "saleMatchRows",
  operationName: "SaleMatchRows",
  filteredOperationName: "SaleMatchRowsFiltered",
  filterInputType: "SaleMatchRowFactFilterInput",
  sortInputType: "SaleMatchRowFactSortInput",
  scopeVariables: { versionUuid: "UUID!", currencyRate: "Decimal" },
};

const CUSTOM_DATA_POINT_FIELD = /^customDataPoint\d+$/;

// Ada-Platform's saleMatchRows query has no static customDataPointN field - every tenant-defined
// custom attribute rides on one row-level list field instead (see CustomAttributeValueType),
// specifically so the GraphQL schema's own cost analysis never changes shape as tenants add or
// remove attributes. `title`/`dataType`/`aggregation` aren't requested here since
// fetchCustomAttributes already carries those per ordinal - only the per-row value is needed.
const CUSTOM_ATTRIBUTES_SELECTION = "customAttributes { ordinal value supplied }";

// Swaps any visible customDataPointN column's (nonexistent) own field name for the single
// customAttributes selection that actually carries its value - see CUSTOM_ATTRIBUTES_SELECTION.
function toGraphqlSelectionFields(fields: string[]): string[] {
  const staticFields = fields.filter((field) => !CUSTOM_DATA_POINT_FIELD.test(field));
  const hasCustomDataPoint = staticFields.length !== fields.length;
  return hasCustomDataPoint ? [...staticFields, CUSTOM_ATTRIBUTES_SELECTION] : staticFields;
}

export function visibleSaleMatchRowFields(columns: GraphqlGridColumnOrGroup[]): string[] {
  return visibleGraphqlGridFields(columns, "sourceRowNumber");
}

export function fetchSaleMatchRows(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  versionUuid: string,
  fields: string[],
  skip = 0,
  take = 50,
  order: Record<string, "ASC" | "DESC">[] = [{ sourceRowNumber: "ASC" }],
  where: Record<string, unknown> | null = null,
  customFilters: CustomAttributeGridFilter[] = [],
  // Scales every money field on each row (volume, ...) from USD into the navbar's selected
  // currency (`useArCurrenciesStore.currency`) - 1 leaves them in USD.
  currencyRate = 1,
): Promise<GraphqlGridPage<SaleMatchRow>> {
  return fetchGraphqlGridPage<SaleMatchRow>(apolloClient, SALE_MATCH_ROWS_QUERY_CONFIG, {
    scope: { versionUuid, currencyRate },
    fields: toGraphqlSelectionFields(fields),
    skip,
    take,
    order,
    where,
    // Omitted entirely when empty, so an unfiltered page sends the document it always sent.
    fieldArguments: customFilters.length === 0
      ? []
      : [{
          name: "customFilters",
          type: "[CustomAttributeFilterInput!]",
          value: customFilters,
        }],
  });
}

// Same treatment as apps/ap's OverviewList.vue for this field (see its fetchData): the grid query
// returns the raw numeric score, not the label the label/color mapping needs, so it's mapped here
// before display - "na" is rendered as "-", everything else through the shared
// home.overview.<label> translation keys.
export function toDisplaySaleMatchRow(row: SaleMatchRow, t: (key: string) => string): SaleMatchRow {
  const confidence = setConfidenceScore(toConfidenceScoreLabel(typeof row.confidenceScore === "number" ? row.confidenceScore : null));
  // Only a supplied value is projected - an unsupplied declaration (see CustomAttributeValueType's
  // own doc comment) is left absent rather than shown as some other placeholder, so the column
  // renders it exactly like any other blank cell.
  const customDataPoints = Object.fromEntries(
    (row.customAttributes ?? [])
      .filter((attribute) => attribute.supplied)
      .map((attribute) => [`customDataPoint${attribute.ordinal}`, attribute.value]),
  );
  return {
    ...row,
    ...customDataPoints,
    confidenceScore: confidence[0] === "na" ? "-" : t(`home.overview.${confidence[0]}`),
    confidenceScoreColor: confidence[2],
    cashDiscounts: typeof row.cashDiscounts === "number" ? row.cashDiscounts * 100 : row.cashDiscounts,
  };
}
