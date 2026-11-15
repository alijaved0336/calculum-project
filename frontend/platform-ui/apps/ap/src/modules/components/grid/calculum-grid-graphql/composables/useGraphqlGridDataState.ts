import {
  computed,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";

/** Kendo pager sizes used when the parent does not pass `pagingSizeCustomArray`. */
export const DEFAULT_GRAPHQL_GRID_PAGE_SIZES = [
  10, 25, 50, 100, 150, 175,
] as const;

export interface GraphqlGridPageable {
  buttonCount: number;
  info: boolean;
  type: string;
  pageSize: number;
  pageSizes: number[];
  previousNext: boolean;
}

export interface GraphqlGridDataState {
  take?: number;
  skip?: number;
  sort?: unknown[];
  filter?: unknown;
}

export type GraphqlGridDataStateEmit = (
  event: "dataChange" | "pagechange",
  ...args: unknown[]
) => void;

export interface UseGraphqlGridDataStateOptions {
  skip: MaybeRefOrGetter<number>;
  take: MaybeRefOrGetter<number>;
  filter: MaybeRefOrGetter<unknown>;
  defaultPageSize: MaybeRefOrGetter<number>;
  pagingSizeCustomArray: MaybeRefOrGetter<unknown[] | null | undefined>;
  emit: GraphqlGridDataStateEmit;
}

/** Empty CompositeFilterDescriptor used when the user clears all grid filters. */
export function createEmptyGraphqlGridFilter() {
  return {
    filters: [] as unknown[],
    logic: "and" as const,
  };
}

/**
 * True when the grid's working filter has at least one clause.
 * Parent-refetch grids do not `process()` locally; this only drives chrome (toolbar, clear).
 */
export function isGraphqlGridFilterApplied(filter: unknown): boolean {
  if (!filter || typeof filter !== "object") {
    return false;
  }
  const filters = (filter as { filters?: unknown }).filters;
  return Array.isArray(filters) && filters.length > 0;
}

/**
 * Initial working filter: keep a non-empty array from props, otherwise `{}`.
 * Matches the SFC's `props.filter && props.filter.length > 0` check.
 */
export function initialGraphqlGridFilter(filter: unknown): unknown {
  return filter && (filter as { length?: number }).length > 0 ? filter : {};
}

export function createGraphqlGridPageable(
  defaultPageSize: number,
  pagingSizeCustomArray?: unknown[] | null,
): GraphqlGridPageable {
  return {
    buttonCount: 5,
    info: true,
    type: "numeric",
    pageSize: defaultPageSize,
    pageSizes: (pagingSizeCustomArray as number[] | null | undefined) ?? [
      ...DEFAULT_GRAPHQL_GRID_PAGE_SIZES,
    ],
    previousNext: true,
  };
}

/**
 * GraphQL / parent-refetch data-state for CalculumGridGraphql.
 * The grid does not `process()` locally; skip/take/sort/filter changes emit so the parent refetches.
 */
export function useGraphqlGridDataState(options: UseGraphqlGridDataStateOptions) {
  const skipToFilter = ref(0);
  const takeToFilter = ref(toValue(options.take));
  const sort = ref<unknown[]>([]);
  const filterToGrid = ref<unknown>();
  const pageable = ref(
    createGraphqlGridPageable(
      toValue(options.defaultPageSize),
      toValue(options.pagingSizeCustomArray),
    ),
  );

  const isFilterApplied = computed(() =>
    isGraphqlGridFilterApplied(filterToGrid.value),
  );

  function createAppState(dataState: GraphqlGridDataState) {
    takeToFilter.value = dataState.take;
    skipToFilter.value = dataState.skip;
    sort.value = dataState.sort;
    filterToGrid.value = dataState.filter;
  }

  function dataStateChange(event: { data: GraphqlGridDataState }) {
    createAppState(event.data);
    options.emit("dataChange", event.data.filter, event.data.sort);
  }

  function pageChange(event: unknown) {
    options.emit("pagechange", event);
  }

  function clearFilters() {
    const reset = createEmptyGraphqlGridFilter();
    filterToGrid.value = reset;
    sort.value = [];
    options.emit("dataChange", reset, []);
  }

  function resetDataState() {
    filterToGrid.value = {};
    sort.value = [];
    skipToFilter.value = 0;
    takeToFilter.value = 0;
  }

  onMounted(() => {
    filterToGrid.value = initialGraphqlGridFilter(toValue(options.filter));
  });

  watch(
    () => toValue(options.skip),
    (skip) => {
      skipToFilter.value = skip;
    },
    { deep: true },
  );

  watch(
    () => toValue(options.take),
    (take) => {
      takeToFilter.value = take;
    },
    { deep: true },
  );

  watch(
    () => toValue(options.defaultPageSize),
    () => {
      pageable.value = createGraphqlGridPageable(
        toValue(options.defaultPageSize),
        toValue(options.pagingSizeCustomArray),
      );
    },
    { deep: true },
  );

  return {
    skipToFilter,
    takeToFilter,
    sort,
    filterToGrid,
    pageable,
    isFilterApplied,
    dataStateChange,
    pageChange,
    clearFilters,
    resetDataState,
  };
}
