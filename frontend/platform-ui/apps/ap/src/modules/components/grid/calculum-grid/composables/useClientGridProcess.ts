import { process } from "@progress/kendo-data-query";
import {
  computed,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";

export interface ClientGridDataState {
  take?: number;
  skip?: number;
  sort?: unknown[];
  filter?: unknown;
}

export type ClientGridProcessEmit = (
  event: "dataChange" | "send-pagination-size",
  ...args: unknown[]
) => void;

export interface UseClientGridProcessOptions {
  gridData: MaybeRefOrGetter<unknown[] | null | undefined>;
  defaultPageSize: MaybeRefOrGetter<number>;
  emit: ClientGridProcessEmit;
  /**
   * Selection-coupling refs shared with useClientGridSelection (parent wires both).
   * dataStateChange updates them to match prior inline behavior.
   */
  filterSelected?: Ref<boolean>;
  filterData?: Ref<unknown>;
  selectedItems?: Ref<unknown>;
}

/** Empty CompositeFilterDescriptor used when the user clears all grid filters. */
export function createEmptyClientGridFilter() {
  return {
    filters: [] as unknown[],
    logic: "and" as const,
  };
}

/**
 * True when the working filter has at least one clause.
 * Matches the SFC's `filter.value?.filters?.length > 0` check.
 */
export function isClientGridFilterApplied(filter: unknown): boolean {
  if (!filter || typeof filter !== "object") {
    return false;
  }
  const filters = (filter as { filters?: unknown }).filters;
  return Array.isArray(filters) && filters.length > 0;
}

/**
 * Client-side Kendo `process()` data-state for CalculumGrid.
 * Owns skip/take/sort/filter and `dataResult`; does not parent-refetch.
 */
export function useClientGridProcess(options: UseClientGridProcessOptions) {
  const dataResult = ref<{ data: unknown[]; total: number }>({
    data: [],
    total: 0,
  });
  const skip = ref(0);
  const take = ref(toValue(options.defaultPageSize));
  const sort = ref<unknown[]>([]);
  const filter = ref<unknown>();
  const defaultGroupFilter = ref(createEmptyClientGridFilter());

  const isFilterApplied = computed(() =>
    isClientGridFilterApplied(filter.value),
  );

  function gridRows(): unknown[] {
    return toValue(options.gridData) ?? [];
  }

  function currentDataState(): ClientGridDataState {
    return {
      skip: skip.value,
      take: take.value,
      sort: sort.value,
      filter: filter.value,
    };
  }

  function createAppState(dataState: ClientGridDataState) {
    take.value = dataState.take;
    skip.value = dataState.skip;
    sort.value = dataState.sort;
    filter.value = dataState.filter;
  }

  function reprocess(dataState: ClientGridDataState = currentDataState()) {
    dataResult.value = process(gridRows(), dataState);
  }

  function clearFilters() {
    const reset = createEmptyClientGridFilter();
    filter.value = reset;
    sort.value = [];

    dataResult.value = process(gridRows(), {
      sort: sort.value,
      filter: filter.value,
    });
  }

  function dataStateChange(event: { data: ClientGridDataState }) {
    createAppState(event.data);

    options.emit("dataChange", event.data.filter, event.data.sort);

    // This is only to get filtered data
    if ((event.data?.filter as { logic?: unknown } | undefined)?.logic) {
      dataResult.value = process(gridRows(), {
        sort: event.data.sort,
        filter: event.data.filter,
      });

      if (options.filterData) {
        options.filterData.value = dataResult.value.data;
      }
      if (options.filterSelected) {
        options.filterSelected.value = true;
      }
      dataResult.value = process(gridRows(), {
        skip: event.data.skip,
        take: event.data.take,
        sort: event.data.sort,
        filter: event.data.filter,
      });
    } else {
      dataResult.value = process(gridRows(), {
        skip: event.data.skip,
        take: event.data.take,
        sort: event.data.sort,
      });
      if (options.selectedItems) {
        options.selectedItems.value = null;
      }
      if (options.filterData) {
        options.filterData.value = null;
      }
      if (options.filterSelected) {
        options.filterSelected.value = false;
      }
    }
    options.emit("send-pagination-size", event.data.take);
  }

  /** Used by column-menu filter changes that update `filter` then re-process. */
  function setFilterAndReprocess(nextFilter: unknown) {
    filter.value = nextFilter;
    reprocess();
  }

  onMounted(() => {
    reprocess();
  });

  watch(
    () => toValue(options.gridData),
    () => {
      reprocess();
    },
    { deep: true },
  );

  return {
    dataResult,
    skip,
    take,
    sort,
    filter,
    defaultGroupFilter,
    isFilterApplied,
    createAppState,
    dataStateChange,
    clearFilters,
    reprocess,
    setFilterAndReprocess,
  };
}
