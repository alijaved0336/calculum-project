/**
 * Pure unique-values / column-filter helpers for CalculumGridGraphql.
 * GraphQL parent-data semantics for this grid only — not DS, not grid/shared.
 */

export type GraphqlGridColumnSearchQuery = {
  value?: string | null;
  isBlank?: boolean;
} | null | undefined;

export type GraphqlGridColumnFilterNode = {
  field?: string;
  filters?: GraphqlGridColumnFilterNode[];
  [key: string]: unknown;
};

export type GraphqlGridColumnFilters = {
  filters?: GraphqlGridColumnFilterNode[];
  [key: string]: unknown;
} | null | undefined;

export const UNIQUE_VALUES_LIST_ACTION_MAP = {
  browsing: "browse",
  editing: "edit",
  adding: "add",
} as const;

export const UNIQUE_VALUES_NULL_TARGET_OPERATIONS = [
  "agreed",
  "ptTargetList",
] as const;

/**
 * Determines whether the unique-values dataset must be treated as changed
 * (new search text, a search cleared to blank, or an explicit reset), which
 * forces a fresh fetch instead of reusing what's already loaded.
 */
export function getSearchChangeFlags(
  searchQuery: GraphqlGridColumnSearchQuery,
  resetData: boolean | undefined,
) {
  const searchQ = searchQuery ? searchQuery.value : null;
  const searchQIsBlank = !!(
    searchQuery &&
    searchQuery.isBlank &&
    !searchQuery.value
  );
  const changeDataColumns = !!(searchQ || searchQIsBlank || resetData);
  return { searchQ, changeDataColumns };
}

/**
 * AF-1: a genuine failure retries without filters; the intentional
 * race-condition-guard skip (`{ skipped: true }` from isProgramSfvConsistent)
 * must not retry.
 */
export function shouldFallBackToUnfilteredValues(
  response: { skipped?: boolean } | undefined,
): boolean {
  return response?.skipped !== true;
}

/**
 * Staleness check for unique-values search (Bug #18797).
 * `showValuesbycolumn` stamps `activeSearchQuery` synchronously (before any
 * await). Comparing a response's own captured `searchQuery` against it at
 * callback time identifies responses superseded by a newer keystroke.
 */
export function isStaleSearchResponse(
  searchQuery: GraphqlGridColumnSearchQuery,
  activeSearchQueryValue: string | null | undefined,
): boolean {
  return !!searchQuery && searchQuery.value !== activeSearchQueryValue;
}

/**
 * First-page / pagination merge for the unique-values dropdown (normal API).
 * The first page must always be shown as-is: recordsCount comes from a
 * separate COUNT request and can lag or mismatch the LIST response.
 */
export function resolveDataForColumns(
  currentDataForColumns: unknown[],
  fetchedPage: unknown[],
  recordsCount: number | null,
): { dataForColumns: unknown[]; remainItem: boolean } {
  const totalNow = currentDataForColumns.length;
  if (totalNow === 0) {
    return { dataForColumns: fetchedPage, remainItem: true };
  }
  if (totalNow < (recordsCount as number)) {
    return {
      dataForColumns: [...currentDataForColumns, ...fetchedPage],
      remainItem: true,
    };
  }
  return { dataForColumns: currentDataForColumns, remainItem: false };
}

/**
 * True when a column field appears anywhere in the (possibly nested) filter tree.
 */
export function isColumnFilterActive(
  fieldName: string,
  filters: GraphqlGridColumnFilters,
): boolean {
  if (!filters?.filters?.length) {
    return false;
  }

  function searchFiltersInStructure(
    filterArray: GraphqlGridColumnFilterNode[],
    targetField: string,
  ): boolean {
    for (const filter of filterArray) {
      if (filter.field === targetField) {
        return true;
      }
      if (filter.filters && Array.isArray(filter.filters)) {
        if (searchFiltersInStructure(filter.filters, targetField)) {
          return true;
        }
      }
    }
    return false;
  }

  return searchFiltersInStructure(filters.filters, fieldName);
}

export function stampColumnHeaderFilterClass(
  columns: { field?: string; headerClassName?: string }[],
  field: string | null,
  isActive: boolean,
) {
  if (field === null) {
    columns.forEach((config) => {
      config.headerClassName = "inactive";
    });
    return;
  }
  const changedColumn = columns.find((column) => column.field === field);
  if (changedColumn) {
    changedColumn.headerClassName = isActive ? "active" : "inactive";
  }
}

export function convertListUniqueValues(arr: unknown[], key: string) {
  return arr.map((item) => ({ [key]: item }));
}

export function uniqueValuesListAction(summaryOperation: string): string {
  return (
    UNIQUE_VALUES_LIST_ACTION_MAP[
      summaryOperation as keyof typeof UNIQUE_VALUES_LIST_ACTION_MAP
    ] ?? ""
  );
}

export function uniqueValuesTargetOperation(
  targetOperation: string | null | undefined,
): string | null {
  if (
    targetOperation &&
    !UNIQUE_VALUES_NULL_TARGET_OPERATIONS.includes(
      targetOperation as (typeof UNIQUE_VALUES_NULL_TARGET_OPERATIONS)[number],
    )
  ) {
    return targetOperation;
  }
  return null;
}

export function uniqueValuesActiveSpendFileVersion(
  section: string,
  spendFileVersionActiveId: unknown,
) {
  return section === "management" || section === "adminBackend"
    ? null
    : spendFileVersionActiveId;
}

export function needsUniqueValuesCountRefresh(
  recordsCount: number | null,
  columnSelected: string,
  column: string,
  changeDataColumns: boolean,
): boolean {
  return (
    recordsCount === null ||
    columnSelected !== column ||
    changeDataColumns
  );
}

export function shouldSkipUniqueValuesListFetch(
  fromRecord: number,
  dataForColumnsLength: number,
  columnSelected: string,
  column: string,
  changeDataColumns: boolean,
): boolean {
  const alreadyHasColumnData =
    fromRecord === 0 &&
    dataForColumnsLength > 0 &&
    columnSelected === column;
  return alreadyHasColumnData && !changeDataColumns;
}

export function assignUniqueValuesScopeUuids(
  params: Record<string, unknown>,
  section: string,
  entityUuid: string,
  groupUuid: string,
) {
  if (section === "adminBackend") {
    if (entityUuid) {
      params.companyUuid = entityUuid;
    }
    if (groupUuid) {
      params.groupUuid = groupUuid;
    }
    return;
  }
  if (entityUuid) {
    params.entityUuid = entityUuid;
  }
}

export interface GraphqlGridUniqueValuesParamInput {
  telerikFilter: string | null;
  column: string;
  cantRecords: number;
  fromRecord: number;
  countDatas: boolean;
  searchQuery?: GraphqlGridColumnSearchQuery;
  gridSearch: string;
  levelOfGrid: string;
  currencyRate: unknown;
  selectedProgramId: string | null | undefined;
  planId: string | null | undefined;
  phaseId: string | null | undefined;
  section: string;
  globalFilter: string | null;
  activeSpendFileVersion: unknown;
  targetOperation: string | null;
  summaryOperation: string;
  editList: boolean | undefined;
  companyType: string;
  entityUuid: string;
  groupUuid: string;
}

/**
 * Request fields for `homeStore.getUniqueData` (callbacks attached by the composable).
 */
export function buildGraphqlGridUniqueValuesParams(
  input: GraphqlGridUniqueValuesParamInput,
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    telerikFilter: input.telerikFilter,
    level: input.levelOfGrid,
    field: input.column,
    currencyRate: input.currencyRate,
    targetProgramUuid: input.selectedProgramId ?? null,
    targetPlanUuid: input.planId ?? null,
    targetPhaseUuid: input.phaseId ?? "all",
    section: input.section,
    globalFilter: input.globalFilter,
    activeSpendFileVersion: input.activeSpendFileVersion,
    targetOperation: input.targetOperation,
    summaryOperation: input.summaryOperation,
    fullDisabled: input.editList ? null : false,
    companyType: input.companyType,
    summaryAction: uniqueValuesListAction(input.summaryOperation),
  };

  assignUniqueValuesScopeUuids(
    params,
    input.section,
    input.entityUuid,
    input.groupUuid,
  );

  if (input.countDatas) {
    params.summaryOperation = "count";
  } else {
    params.first = input.cantRecords;
    params.after = input.fromRecord;
  }

  if (input.searchQuery) {
    params.searchingText = input.searchQuery.value;
  } else if (input.gridSearch) {
    params.searchingText = input.gridSearch;
  }

  return params;
}

export function unfilteredUniqueValuesFallbackParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...params,
    globalFilter: null,
    telerikFilter: null,
  };
}
