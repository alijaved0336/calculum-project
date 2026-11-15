import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'
import type { GraphqlGridColumn, GraphqlGridColumnOrGroup } from '@ada/design-system/components/graphql-grid/types'
import { fetchGraphqlGridPage, type GraphqlGridPage, type GraphqlGridQueryConfig } from '@/utils/graphqlGridQuery'
import { waterfallSaleLineOverviewColumns } from './overviewColumns'
import { visibleOverviewRowFields, type SaleLineOverviewRow } from './overviewRows'
import type { CustomAttributeGridFilter } from '@/utils/customAttributeColumns'

/**
 * UC-UI-15/UC-API-18's drill-in row: the same sale-line surface the Opportunity List tab shows
 * (`SaleLineOverviewRow`), plus the three fields that only mean something once a waterfall STEP has
 * been chosen. All three are resolved server-side after paging and are therefore neither filterable
 * nor sortable (see `waterfallSaleLineColumns` below) - same as the monolith's own Cash Flow
 * Contribution column.
 */
export interface WaterfallSaleLineRow extends SaleLineOverviewRow {
  /** Where this line's cascade stood BEFORE the selected step ran. */
  previousTerm: number | null
  /** Where this line's cascade stands AFTER the selected step - differs from `previousTerm` on
   * every row of this list, since that difference is what put the line in it. */
  stepTerm: number | null
  /** This line's share of the step's cash bar - see `WaterfallSaleLineRowType.cashFlowContribution`
   * on the server for the rounding/residue caveats. */
  cashFlowContribution: number | null
}

/**
 * `waterfallSaleLineRows` (UC-API-18) - same filter/sort input types as `saleLineOverviewRows`
 * (it is the same underlying row, unprojected), scoped by `versionUuid` and the selected
 * `step`/`fullDisabled` rather than by `versionUuid` alone.
 */
const WATERFALL_SALE_LINE_ROWS_QUERY_CONFIG: GraphqlGridQueryConfig = {
  queryField: 'waterfallSaleLineRows',
  operationName: 'WaterfallSaleLineRows',
  filteredOperationName: 'WaterfallSaleLineRowsFiltered',
  filterInputType: 'SaleLineOverviewRowFactFilterInput',
  sortInputType: 'SaleLineOverviewRowFactSortInput',
  scopeVariables: {
    versionUuid: 'UUID!',
    step: 'String!',
    currencyRate: 'Decimal',
    fullDisabled: 'Boolean',
  },
}

export interface FetchWaterfallSaleLineRowsOptions {
  skip?: number
  take?: number
  order?: Record<string, 'ASC' | 'DESC'>[]
  where?: Record<string, unknown> | null
  /** Custom attribute filters - an argument of the field, never of `where` (see overviewRows.ts). */
  customFilters?: CustomAttributeGridFilter[]
  currencyRate?: number
  /** `false` (the default) excludes lines the analyst marked excluded, same default the chart
   * itself charts against - a caller that charts with one value and drills in with another would
   * describe two different populations (see the server field's own caveat). */
  fullDisabled?: boolean
}

/**
 * UC-UI-15's drill-in grid: every sale line the selected `step` actually moved (or, for
 * `step: "total"`, every line the whole cascade moved between its actual and target terms).
 */
export function fetchWaterfallSaleLineRows(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  versionUuid: string,
  step: string,
  fields: string[],
  {
    skip = 0,
    take = 50,
    order = [],
    where = null,
    customFilters = [],
    currencyRate = 1,
    fullDisabled = false,
  }: FetchWaterfallSaleLineRowsOptions = {},
): Promise<GraphqlGridPage<WaterfallSaleLineRow>> {
  return fetchGraphqlGridPage<WaterfallSaleLineRow>(apolloClient, WATERFALL_SALE_LINE_ROWS_QUERY_CONFIG, {
    scope: { versionUuid, step, currencyRate, fullDisabled },
    fields,
    skip,
    take,
    order,
    where,
    // Omitted when empty, so an unfiltered page sends the document it always sent.
    fieldArguments: customFilters.length === 0
      ? []
      : [{ name: 'customFilters', type: '[CustomAttributeFilterInput!]', value: customFilters }],
  })
}

/** The GraphQL field selection for this grid's currently-visible columns - the same helper the
 * List tab's `saleLines` level already uses (`visibleOverviewRowFields` is generic over any
 * `OverviewRow`-shaped level), since this row IS that one plus its step-only fields. */
export const visibleWaterfallSaleLineFields = (columns: GraphqlGridColumnOrGroup[]): string[] =>
  visibleOverviewRowFields('saleLines', columns)

/**
 * The drill-in's own column list (column parity, 2026-10-02: AP's Waterfall grid). It keeps
 * `cashFlowContribution` as "Cash Flow - Contribution", neither sortable nor filterable since
 * UC-API-18 resolves it per row after paging; `previousTerm`/`stepTerm` are still on the row but
 * no longer shown (decision: the intermediate step is not a column).
 */
export const waterfallSaleLineColumns = (): GraphqlGridColumn[] => waterfallSaleLineOverviewColumns()
