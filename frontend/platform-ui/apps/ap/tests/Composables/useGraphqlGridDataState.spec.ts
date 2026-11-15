/**
 * Tests for useGraphqlGridDataState — GraphQL / parent-refetch skip-take-sort-filter.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  createEmptyGraphqlGridFilter,
  createGraphqlGridPageable,
  DEFAULT_GRAPHQL_GRID_PAGE_SIZES,
  initialGraphqlGridFilter,
  isGraphqlGridFilterApplied,
  useGraphqlGridDataState,
  type UseGraphqlGridDataStateOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridDataState";

function mountDataState(
  overrides: Partial<UseGraphqlGridDataStateOptions> = {},
) {
  const skip = ref(0);
  const take = ref(25);
  const filter = ref<unknown>([]);
  const defaultPageSize = ref(25);
  const pagingSizeCustomArray = ref<unknown[] | null>(null);
  const emit = vi.fn();

  const options: UseGraphqlGridDataStateOptions = {
    skip,
    take,
    filter,
    defaultPageSize,
    pagingSizeCustomArray,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridDataState> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridDataState(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    skip,
    take,
    filter,
    defaultPageSize,
    pagingSizeCustomArray,
    emit,
    wrapper,
  };
}

describe("createEmptyGraphqlGridFilter", () => {
  it("returns a new empty CompositeFilterDescriptor each call", () => {
    const first = createEmptyGraphqlGridFilter();
    const second = createEmptyGraphqlGridFilter();

    expect(first).toEqual({ filters: [], logic: "and" });
    expect(first).not.toBe(second);
  });
});

describe("isGraphqlGridFilterApplied", () => {
  it.each([
    ["undefined", undefined, false],
    ["null", null, false],
    ["empty object", {}, false],
    ["filters missing", { logic: "and" }, false],
    ["filters empty", { filters: [], logic: "and" }, false],
    ["filters not an array", { filters: "x" }, false],
    ["one clause", { filters: [{ field: "name" }], logic: "and" }, true],
    ["several clauses", { filters: [{}, {}], logic: "or" }, true],
  ] as const)("%s → %s", (_label, filter, expected) => {
    expect(isGraphqlGridFilterApplied(filter)).toBe(expected);
  });
});

describe("initialGraphqlGridFilter", () => {
  it.each([
    ["undefined", undefined, {}],
    ["null", null, {}],
    ["empty array", [], {}],
    ["empty object (no length)", {}, {}],
    ["non-empty array", [{ field: "name" }], [{ field: "name" }]],
  ] as const)("%s", (_label, filter, expected) => {
    expect(initialGraphqlGridFilter(filter)).toEqual(expected);
  });

  it("keeps the same array reference when length > 0", () => {
    const source = [{ field: "spend" }];
    expect(initialGraphqlGridFilter(source)).toBe(source);
  });
});

describe("createGraphqlGridPageable", () => {
  it("uses default page sizes when the custom array is omitted or null", () => {
    expect(createGraphqlGridPageable(25)).toEqual({
      buttonCount: 5,
      info: true,
      type: "numeric",
      pageSize: 25,
      pageSizes: [...DEFAULT_GRAPHQL_GRID_PAGE_SIZES],
      previousNext: true,
    });
    expect(createGraphqlGridPageable(10, null)).toMatchObject({
      pageSize: 10,
      pageSizes: [...DEFAULT_GRAPHQL_GRID_PAGE_SIZES],
    });
  });

  it("uses the custom page-size array when provided", () => {
    expect(createGraphqlGridPageable(50, [5, 50, 100])).toEqual({
      buttonCount: 5,
      info: true,
      type: "numeric",
      pageSize: 50,
      pageSizes: [5, 50, 100],
      previousNext: true,
    });
  });
});

describe("useGraphqlGridDataState", () => {
  it("initializes take from props and skip at 0 until the skip watch fires", () => {
    const { api } = mountDataState({ take: ref(40) });

    expect(api.takeToFilter.value).toBe(40);
    expect(api.skipToFilter.value).toBe(0);
    expect(api.sort.value).toEqual([]);
  });

  it("sets the working filter from props on mount", () => {
    const filter = ref([{ field: "entityName" }]);
    const { api } = mountDataState({ filter });

    expect(api.filterToGrid.value).toEqual([{ field: "entityName" }]);
    expect(api.isFilterApplied.value).toBe(false);
  });

  it("treats a CompositeFilterDescriptor with clauses as applied", () => {
    const { api } = mountDataState();
    api.filterToGrid.value = {
      filters: [{ field: "name", operator: "eq", value: "a" }],
      logic: "and",
    };

    expect(api.isFilterApplied.value).toBe(true);
  });

  it("dataStateChange applies skip/take/sort/filter and emits dataChange", () => {
    const { api, emit } = mountDataState();
    const nextFilter = { filters: [{ field: "x" }], logic: "and" };
    const nextSort = [{ field: "x", dir: "asc" }];

    api.dataStateChange({
      data: { take: 50, skip: 100, sort: nextSort, filter: nextFilter },
    });

    expect(api.takeToFilter.value).toBe(50);
    expect(api.skipToFilter.value).toBe(100);
    expect(api.sort.value).toEqual(nextSort);
    expect(api.filterToGrid.value).toEqual(nextFilter);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith("dataChange", nextFilter, nextSort);
  });

  it("pageChange forwards the Kendo event as pagechange", () => {
    const { api, emit } = mountDataState();
    const event = { page: { skip: 25, take: 25 } };

    api.pageChange(event);

    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith("pagechange", event);
  });

  it("clearFilters resets filter+sort and emits dataChange with the empty shape", () => {
    const { api, emit } = mountDataState();
    api.filterToGrid.value = { filters: [{ field: "x" }], logic: "and" };
    api.sort.value = [{ field: "x", dir: "desc" }];

    api.clearFilters();

    expect(api.filterToGrid.value).toEqual({ filters: [], logic: "and" });
    expect(api.sort.value).toEqual([]);
    expect(api.isFilterApplied.value).toBe(false);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(
      "dataChange",
      { filters: [], logic: "and" },
      [],
    );
  });

  it("syncs skip and take from props", async () => {
    const skip = ref(0);
    const take = ref(25);
    const { api } = mountDataState({ skip, take });

    skip.value = 75;
    take.value = 50;
    await nextTick();

    expect(api.skipToFilter.value).toBe(75);
    expect(api.takeToFilter.value).toBe(50);
  });

  it("rebuilds pageable when defaultPageSize changes", async () => {
    const defaultPageSize = ref(25);
    const pagingSizeCustomArray = ref<unknown[] | null>([10, 20]);
    const { api } = mountDataState({ defaultPageSize, pagingSizeCustomArray });

    expect(api.pageable.value.pageSize).toBe(25);
    expect(api.pageable.value.pageSizes).toEqual([10, 20]);

    defaultPageSize.value = 100;
    await nextTick();

    expect(api.pageable.value).toEqual({
      buttonCount: 5,
      info: true,
      type: "numeric",
      pageSize: 100,
      pageSizes: [10, 20],
      previousNext: true,
    });
  });

  it("resetDataState clears filter, sort, skip, and take", () => {
    const { api } = mountDataState();
    api.filterToGrid.value = { filters: [{ field: "x" }], logic: "and" };
    api.sort.value = [{ field: "x", dir: "asc" }];
    api.skipToFilter.value = 40;
    api.takeToFilter.value = 50;

    api.resetDataState();

    expect(api.filterToGrid.value).toEqual({});
    expect(api.sort.value).toEqual([]);
    expect(api.skipToFilter.value).toBe(0);
    expect(api.takeToFilter.value).toBe(0);
  });
});
