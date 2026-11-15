import {
  flattenGraphqlGridColumns,
  type GraphqlGridColumnOrGroup,
} from '@ada/design-system/components/graphql-grid/types'
import type { GridExportColumn, GridExportRequest } from '@/api/gridExport'
import { CLIENT_ONLY_FIELDS } from '@/modules/opportunity/data/overviewRows'
import { isCustomDataPointField } from '@/utils/customAttributeColumns'

// Client-only columns (AB#18931's "Agreed" pair, plus the column-parity ones the backend does not
// expose yet) have no GraphQL field behind them. The server validates every requested column
// against a whitelist of GraphQL names and answers 400 for an unknown one, so they must never be
// sent. The set is per grain; a grid that does not say which one gets every grain's, which can
// only leave a column out, never send an unknown one.
const ANY_GRAIN_CLIENT_ONLY_FIELDS: ReadonlySet<string> = new Set(
  Object.values(CLIENT_ONLY_FIELDS).flatMap((fields) => [...fields]),
)

/**
 * The columns an export carries: the grid's visible columns, in display order, each under its GraphQL
 * field name (a grid column's `field` IS that name - the display alias a cell renders is never a
 * column key). Hidden columns, client-only columns and the tenant's custom-attribute columns are left
 * out; custom attributes are not scalar fields of the row, so the server cannot export them.
 */
export function toExportColumns(
  columns: GraphqlGridColumnOrGroup[],
  clientOnlyFields: ReadonlySet<string> = ANY_GRAIN_CLIENT_ONLY_FIELDS,
): GridExportColumn[] {
  return flattenGraphqlGridColumns(columns)
    .filter((column) => column.hidden !== true)
    .filter((column) => !clientOnlyFields.has(column.field) && !isCustomDataPointField(column.field))
    .map((column) => ({
      field: column.field,
      title: typeof column.title === 'string' && column.title ? column.title : column.field,
      hidden: false,
    }))
}

interface BuildExportRequestOptions {
  /** The variables the grid's last page was fetched with (`GraphqlGridPage.variables`). */
  variables: Record<string, unknown> | null | undefined
  columns: GraphqlGridColumnOrGroup[]
  /** The download's name without extension. */
  fileName: string
  /** The grid grain's client-only fields (`CLIENT_ONLY_FIELDS[level]`); every grain's by default. */
  clientOnlyFields?: ReadonlySet<string>
}

/**
 * The export request for a grid: its last query variables (so the file holds exactly the rows the
 * grid is showing the filter and sort of) plus its current columns. Null before the grid has fetched
 * a page, or when it has no exportable column - there is nothing to export yet.
 */
export function buildGridExportRequest({ variables, columns, fileName, clientOnlyFields }: BuildExportRequestOptions): GridExportRequest | null {
  const exportColumns = toExportColumns(columns, clientOnlyFields)
  if (!variables || typeof variables.versionUuid !== 'string' || exportColumns.length === 0) {
    return null
  }

  return {
    versionUuid: variables.versionUuid,
    where: variables.where ?? null,
    order: variables.order ?? null,
    customFilters: variables.customFilters ?? null,
    customSorts: variables.customSorts ?? null,
    currencyRate: typeof variables.currencyRate === 'number' ? variables.currencyRate : 1,
    ...(typeof variables.step === 'string' ? { step: variables.step } : {}),
    columns: exportColumns,
    fileName,
  }
}
