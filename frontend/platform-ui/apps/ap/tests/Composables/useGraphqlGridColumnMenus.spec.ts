/**
 * Tests for useGraphqlGridColumnMenus — unique-values fetch orchestration,
 * header active class, and column-menu action emits for CalculumGridGraphql.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";

const { homeStore, appStore, globalFiltersStore } = vi.hoisted(() => ({
  homeStore: {
    getUniqueData: vi.fn(async () => undefined),
    getClustersUniqueData: vi.fn(),
  },
  appStore: { getCurrencyAmount: 1 },
  globalFiltersStore: { getFiltersApplied: null as unknown },
}));

vi.mock("@/stores/home", () => ({ useHomeStore: () => homeStore }));
vi.mock("@/stores/app", () => ({ useAppStore: () => appStore }));
vi.mock("@/stores/globalFilters", () => ({
  useGlobalFiltersStore: () => globalFiltersStore,
}));
vi.mock("@/utils/graphqlUtils", () => ({
  convertFiltersToREST: (filter: unknown) =>
    filter ? JSON.stringify(filter) : null,
}));

import {
  useGraphqlGridColumnMenus,
  type UseGraphqlGridColumnMenusOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridColumnMenus";
import { isColumnFilterActive } from "@/modules/components/grid/calculum-grid-graphql/composables/graphqlGridColumnMenuHelpers";
import type { GraphqlGridColumn } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridColumnCache";
import type { GraphqlGridColumnMenuFilter } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridSelection";

function mountColumnMenus(
  overrides: Partial<UseGraphqlGridColumnMenusOptions> = {},
) {
  const section = ref("analyze");
  const levelOfGrid = ref("spends");
  const forClustersUniqueValuesApi = ref(false);
  const summaryOperation = ref("unique");
  const clusterCollectionName = ref<string | null>("clusters");
  const targetOperation = ref<string | null>(null);
  const companyType = ref("");
  const editList = ref<boolean | undefined>(false);
  const selectedProgramId = ref<string | null>("program-1");
  const planId = ref<string | null>(null);
  const phaseId = ref<string | null>("all");
  const entityUuid = ref("");
  const groupUuid = ref("");
  const search = ref("");
  const filterToGrid = ref<unknown>({});
  const defaultColumns = ref<GraphqlGridColumn[]>([
    { field: "name", title: "Name", headerClassName: "inactive" },
    { field: "spend", title: "Spend", headerClassName: "inactive" },
  ]);
  const allSelected = ref(true);
  const showMenuFilter = ref<GraphqlGridColumnMenuFilter>(
    "columnMenuTemplateActions",
  );
  const loadData = ref(true);
  const spendFileVersionActiveId = ref("sfv-1");
  const emit = vi.fn();

  const options: UseGraphqlGridColumnMenusOptions = {
    section,
    levelOfGrid,
    forClustersUniqueValuesApi,
    summaryOperation,
    clusterCollectionName,
    targetOperation,
    companyType,
    editList,
    selectedProgramId,
    planId,
    phaseId,
    entityUuid,
    groupUuid,
    search,
    filterToGrid,
    defaultColumns,
    allSelected,
    showMenuFilter,
    loadData,
    spendFileVersionActiveId,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridColumnMenus> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridColumnMenus(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    defaultColumns,
    allSelected,
    showMenuFilter,
    loadData,
    forClustersUniqueValuesApi,
    filterToGrid,
    emit,
    wrapper,
  };
}

describe("isColumnFilterActive", () => {
  it.each([
    ["no filters object", undefined, false],
    ["empty filters", { filters: [] }, false],
    ["direct field match", { filters: [{ field: "name" }] }, true],
    [
      "nested field match",
      { filters: [{ filters: [{ field: "name" }] }] },
      true,
    ],
    ["other field only", { filters: [{ field: "spend" }] }, false],
  ] as const)("%s", (_label, filters, expected) => {
    expect(isColumnFilterActive("name", filters)).toBe(expected);
  });
});

describe("sendColumnFiltered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stamps the matching column header active when a filter is present", () => {
    const { api, defaultColumns } = mountColumnMenus();
    api.sendColumnFiltered(
      { filters: [{ field: "name" }] },
      { field: "name" },
    );
    expect(defaultColumns.value[0].headerClassName).toBe("active");
    expect(defaultColumns.value[1].headerClassName).toBe("inactive");
  });

  it("stamps the matching column header inactive when the field has no filter", () => {
    const { api, defaultColumns } = mountColumnMenus();
    api.sendColumnFiltered(
      { filters: [{ field: "spend" }] },
      { field: "name" },
    );
    expect(defaultColumns.value[0].headerClassName).toBe("inactive");
  });

  it("resets every column to inactive when filters are cleared", () => {
    const { api, defaultColumns } = mountColumnMenus();
    defaultColumns.value[0].headerClassName = "active";
    api.sendColumnFiltered(null, null);
    expect(defaultColumns.value.every((col) => col.headerClassName === "inactive")).toBe(
      true,
    );
  });
});

describe("column-menu action emits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards grid-exclude with levelOfGrid and closes the menu", () => {
    const { api, emit, showMenuFilter, allSelected } = mountColumnMenus();
    api.gridExclude("exclude");
    expect(emit).toHaveBeenCalledWith("grid-exclude", "exclude", "spends");
    expect(showMenuFilter.value).toBe(false);
    expect(allSelected.value).toBe(true);
  });

  it("forwards grid-approach without levelOfGrid and clears selection", () => {
    const { api, emit, showMenuFilter, allSelected } = mountColumnMenus();
    api.gridApproach("approach");
    expect(emit).toHaveBeenCalledWith("grid-approach", "approach");
    expect(showMenuFilter.value).toBe(false);
    expect(allSelected.value).toBe(false);
  });

  it("forwards grid-add-group with typeharmonization and levelOfGrid", () => {
    const { api, emit, showMenuFilter, allSelected } = mountColumnMenus();
    api.gridAddGroup("g1", "harmonization", "type-a");
    expect(emit).toHaveBeenCalledWith(
      "grid-add-group",
      "g1",
      "harmonization",
      "type-a",
      "spends",
    );
    expect(showMenuFilter.value).toBe(false);
    expect(allSelected.value).toBe(false);
  });

  it("forwards include-pilot, remove-group, add-vgroup, and match-remove", () => {
    const { api, emit } = mountColumnMenus();
    api.gridIncludePilot("pilot");
    api.gridRemoveGroup("group");
    api.gridAddVGroup("vg1");
    api.gridMatchRemove();
    expect(emit).toHaveBeenCalledWith("grid-include-pilot", "pilot", "spends");
    expect(emit).toHaveBeenCalledWith("grid-remove", "group", "spends");
    expect(emit).toHaveBeenCalledWith("grid-add-vgroup", "vg1", "spends");
    expect(emit).toHaveBeenCalledWith("grid-match-remove");
  });

  it("forwards target and standard-modal events with levelOfGrid", () => {
    const { api, emit } = mountColumnMenus();
    api.showTargetModal({ key: "k", value: 1 });
    api.showTargetClearModal();
    api.showSupplierStandardModal();
    api.showPeerGroupStandardModal();
    api.closeHarmonizationModal("level-1");
    api.closeMoveBetweenModal({ id: 2 });
    api.closeRemovePlanModal({ id: 3 });
    api.negotiationStatusOnChanged("Pending");
    expect(emit).toHaveBeenCalledWith("show-target-modal", {
      key: "k",
      value: 1,
      levelOfGrid: "spends",
    });
    expect(emit).toHaveBeenCalledWith("show-target-clear-modal", "spends");
    expect(emit).toHaveBeenCalledWith("show-supplier-standard-modal", "spends");
    expect(emit).toHaveBeenCalledWith(
      "show-peer-group-standard-modal",
      "spends",
    );
    expect(emit).toHaveBeenCalledWith(
      "show-harmonization-modal",
      "level-1",
      "spends",
    );
    expect(emit).toHaveBeenCalledWith("show-move-between-modal", "spends", {
      id: 2,
    });
    expect(emit).toHaveBeenCalledWith("show-remove-plan-modal", "spends", {
      id: 3,
    });
    expect(emit).toHaveBeenCalledWith("negotiation-status-changed", "Pending");
  });
});

describe("showValuesbycolumn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    homeStore.getUniqueData.mockImplementation(async () => undefined);
    homeStore.getClustersUniqueData.mockImplementation(() => undefined);
  });

  it("uses the cluster unique-values API and does not call getUniqueData", async () => {
    const { api, forClustersUniqueValuesApi } = mountColumnMenus();
    forClustersUniqueValuesApi.value = true;
    await api.showValuesbycolumn({
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
    });
    expect(homeStore.getClustersUniqueData).toHaveBeenCalledTimes(1);
    expect(homeStore.getClustersUniqueData.mock.calls[0][0]).toMatchObject({
      collection: "clusters",
      field: "name",
    });
    expect(homeStore.getUniqueData).not.toHaveBeenCalled();
  });

  it("loads COUNT then LIST for the normal unique-values API", async () => {
    await mountColumnMenus().api.showValuesbycolumn({
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
    });
    expect(homeStore.getUniqueData).toHaveBeenCalledTimes(2);
    expect(homeStore.getUniqueData.mock.calls[0][0].summaryOperation).toBe(
      "count",
    );
    expect(homeStore.getUniqueData.mock.calls[1][0]).toMatchObject({
      field: "name",
      first: 20,
      after: 0,
      level: "spends",
      section: "analyze",
    });
  });

  it("retries without filters on a genuine LIST failure (AF-1)", async () => {
    homeStore.getUniqueData.mockImplementation(async (params: Record<string, unknown>) => {
      if (
        params.summaryOperation !== "count" &&
        params.telerikFilter != null &&
        params.callbackError
      ) {
        (params.callbackError as (response?: { skipped?: boolean }) => void)({
          success: false,
        } as { skipped?: boolean });
      }
    });
    await mountColumnMenus().api.showValuesbycolumn({
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
    });
    const fallbackCall = homeStore.getUniqueData.mock.calls.find(
      (call) =>
        call[0].globalFilter === null &&
        call[0].telerikFilter === null &&
        call[0].summaryOperation !== "count",
    );
    expect(fallbackCall).toBeTruthy();
  });

  it("does not retry when the LIST failure is the skipped race-condition guard", async () => {
    homeStore.getUniqueData.mockImplementation(async (params: Record<string, unknown>) => {
      if (params.summaryOperation !== "count" && params.callbackError) {
        (params.callbackError as (response?: { skipped?: boolean }) => void)({
          skipped: true,
        });
      }
    });
    await mountColumnMenus().api.showValuesbycolumn({
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
    });
    const fallbackCalls = homeStore.getUniqueData.mock.calls.filter(
      (call) =>
        call[0].globalFilter === null &&
        call[0].telerikFilter === null &&
        call[0].field === "name" &&
        call[0].callbackSuccess &&
        call[0].summaryOperation !== "count",
    );
    // Initial COUNT + LIST only; skipped LIST must not enqueue a third unfiltered retry.
    expect(homeStore.getUniqueData).toHaveBeenCalledTimes(2);
    expect(fallbackCalls).toHaveLength(0);
  });

  it("discards a stale search LIST response after a newer keystroke", async () => {
    const listCallbacks: Array<(data: unknown[]) => void> = [];
    homeStore.getUniqueData.mockImplementation(async (params: Record<string, unknown>) => {
      if (params.summaryOperation !== "count" && params.callbackSuccess) {
        listCallbacks.push(params.callbackSuccess as (data: unknown[]) => void);
      }
    });
    const { api } = mountColumnMenus();
    await api.showValuesbycolumn({
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
      searchQuery: { value: "s" },
    });
    await api.showValuesbycolumn({
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
      searchQuery: { value: "suh" },
    });
    listCallbacks[0](["stale-match"]);
    expect(api.dataForColumns.value).not.toEqual(["stale-match"]);
    listCallbacks[1](["suh-match"]);
    expect(api.dataForColumns.value).toEqual(["suh-match"]);
  });

  it("shows the first LIST page even when COUNT is still 0", async () => {
    homeStore.getUniqueData.mockImplementation(async (params: Record<string, unknown>) => {
      if (params.summaryOperation === "count") {
        (params.callbackSuccess as (data: { totalCount: number }) => void)({
          totalCount: 0,
        });
        return;
      }
      (params.callbackSuccess as (data: unknown[]) => void)(["Acme Corp"]);
    });
    const { api } = mountColumnMenus();
    await api.showValuesbycolumn({
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
    });
    expect(api.dataForColumns.value).toEqual(["Acme Corp"]);
    expect(api.remainItem.value).toBe(true);
  });
});
