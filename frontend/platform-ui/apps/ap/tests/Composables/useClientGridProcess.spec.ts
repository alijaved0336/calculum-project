/**
 * Tests for useClientGridProcess — local Kendo process() skip/take/sort/filter.
 * Does not mount CalculumGrid.vue.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  createEmptyClientGridFilter,
  isClientGridFilterApplied,
  useClientGridProcess,
  type UseClientGridProcessOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridProcess";

function mountProcess(overrides: Partial<UseClientGridProcessOptions> = {}) {
  const gridData = ref([
    { id: 1, name: "a" },
    { id: 2, name: "b" },
    { id: 3, name: "c" },
    { id: 4, name: "d" },
  ]);
  const defaultPageSize = ref(2);
  const emit = vi.fn();
  const filterSelected = ref(false);
  const filterData = ref<unknown>(null);
  const selectedItems = ref<unknown>(null);

  const options: UseClientGridProcessOptions = {
    gridData,
    defaultPageSize,
    emit,
    filterSelected,
    filterData,
    selectedItems,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridProcess> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useClientGridProcess(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    gridData,
    defaultPageSize,
    emit,
    filterSelected,
    filterData,
    selectedItems,
    wrapper,
  };
}

describe("createEmptyClientGridFilter", () => {
  it("returns a new empty CompositeFilterDescriptor each call", () => {
    const first = createEmptyClientGridFilter();
    const second = createEmptyClientGridFilter();

    expect(first).toEqual({ filters: [], logic: "and" });
    expect(first).not.toBe(second);
  });
});

describe("isClientGridFilterApplied", () => {
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
    expect(isClientGridFilterApplied(filter)).toBe(expected);
  });
});

describe("useClientGridProcess", () => {
  it("initializes take from defaultPageSize and processes on mount", () => {
    const { api } = mountProcess({ defaultPageSize: ref(2) });

    expect(api.take.value).toBe(2);
    expect(api.skip.value).toBe(0);
    expect(api.sort.value).toEqual([]);
    expect(api.dataResult.value.total).toBe(4);
    expect(api.dataResult.value.data).toHaveLength(2);
    expect(api.dataResult.value.data.map((r: { id: number }) => r.id)).toEqual([
      1, 2,
    ]);
  });

  it.each([
    {
      label: "skip/take pages",
      state: { skip: 2, take: 2, sort: [], filter: undefined },
      ids: [3, 4],
      total: 4,
    },
    {
      label: "sort desc by name",
      state: {
        skip: 0,
        take: 4,
        sort: [{ field: "name", dir: "desc" }],
        filter: undefined,
      },
      ids: [4, 3, 2, 1],
      total: 4,
    },
    {
      label: "filter by name eq",
      state: {
        skip: 0,
        take: 10,
        sort: [],
        filter: {
          logic: "and",
          filters: [{ field: "name", operator: "eq", value: "b" }],
        },
      },
      ids: [2],
      total: 1,
    },
  ] as const)("process $label", ({ state, ids, total }) => {
    const { api } = mountProcess({ defaultPageSize: ref(10) });

    api.dataStateChange({ data: { ...state } });

    expect(api.dataResult.value.total).toBe(total);
    expect(api.dataResult.value.data.map((r: { id: number }) => r.id)).toEqual([
      ...ids,
    ]);
  });

  it("dataStateChange emits dataChange then send-pagination-size", () => {
    const { api, emit } = mountProcess();
    const nextFilter = {
      filters: [{ field: "name", operator: "eq", value: "a" }],
      logic: "and",
    };
    const nextSort = [{ field: "name", dir: "asc" }];

    api.dataStateChange({
      data: { take: 2, skip: 0, sort: nextSort, filter: nextFilter },
    });

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      "dataChange",
      "send-pagination-size",
    ]);
    expect(emit).toHaveBeenNthCalledWith(1, "dataChange", nextFilter, nextSort);
    expect(emit).toHaveBeenNthCalledWith(2, "send-pagination-size", 2);
  });

  it("dataStateChange with filter.logic sets filterSelected and filterData", () => {
    const { api, filterSelected, filterData, selectedItems } = mountProcess();
    const nextFilter = {
      logic: "and",
      filters: [{ field: "name", operator: "eq", value: "a" }],
    };

    api.dataStateChange({
      data: { take: 10, skip: 0, sort: [], filter: nextFilter },
    });

    expect(filterSelected.value).toBe(true);
    expect(filterData.value).toEqual([{ id: 1, name: "a" }]);
    expect(api.dataResult.value.data).toEqual([{ id: 1, name: "a" }]);
    expect(selectedItems.value).toBeNull();
  });

  it("dataStateChange without filter.logic clears selection filter refs", () => {
    const { api, filterSelected, filterData, selectedItems } = mountProcess();
    filterSelected.value = true;
    filterData.value = [{ id: 1 }];
    selectedItems.value = [{ id: 1 }];

    api.dataStateChange({
      data: { take: 2, skip: 0, sort: [], filter: {} },
    });

    expect(filterSelected.value).toBe(false);
    expect(filterData.value).toBeNull();
    expect(selectedItems.value).toBeNull();
  });

  it("clearFilters resets filter+sort with empty shape and reprocesses without emit", () => {
    const { api, emit } = mountProcess();
    api.filter.value = {
      filters: [{ field: "name", operator: "eq", value: "a" }],
      logic: "and",
    };
    api.sort.value = [{ field: "name", dir: "desc" }];
    emit.mockClear();

    api.clearFilters();

    expect(api.filter.value).toEqual({ filters: [], logic: "and" });
    expect(api.sort.value).toEqual([]);
    expect(api.isFilterApplied.value).toBe(false);
    expect(api.dataResult.value.total).toBe(4);
    expect(emit).not.toHaveBeenCalled();
  });

  it("isFilterApplied tracks CompositeFilterDescriptor clauses", () => {
    const { api } = mountProcess();

    expect(api.isFilterApplied.value).toBe(false);

    api.filter.value = {
      filters: [{ field: "name", operator: "eq", value: "a" }],
      logic: "and",
    };
    expect(api.isFilterApplied.value).toBe(true);
  });

  it("reprocesses when gridData changes", async () => {
    const { api, gridData } = mountProcess({ defaultPageSize: ref(10) });

    gridData.value = [
      { id: 10, name: "x" },
      { id: 11, name: "y" },
    ];
    await nextTick();

    expect(api.dataResult.value.total).toBe(2);
    expect(api.dataResult.value.data.map((r: { id: number }) => r.id)).toEqual([
      10, 11,
    ]);
  });

  it("setFilterAndReprocess updates filter and dataResult", () => {
    const { api } = mountProcess({ defaultPageSize: ref(10) });
    const nextFilter = {
      logic: "and",
      filters: [{ field: "name", operator: "eq", value: "c" }],
    };

    api.setFilterAndReprocess(nextFilter);

    expect(api.filter.value).toEqual(nextFilter);
    expect(api.dataResult.value.data).toEqual([{ id: 3, name: "c" }]);
  });
});
