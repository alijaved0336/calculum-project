/**
 * Tests for useGraphqlGridSelection — row / header selection for CalculumGridGraphql.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  areGraphqlGridRowsAllSelected,
  GRAPHQL_GRID_SELECTED_FIELD,
  nextGraphqlGridShowMenuFilter,
  useGraphqlGridSelection,
  type GraphqlGridColumnMenuFilter,
  type GraphqlGridSelectableItem,
  type UseGraphqlGridSelectionOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridSelection";

function mountSelection(
  overrides: Partial<UseGraphqlGridSelectionOptions> = {},
) {
  const gridData = ref<GraphqlGridSelectableItem[]>([]);
  const section = ref("home");
  const listPeers = ref(false);
  const selectable = ref(true);
  const showOptions = ref(true);
  const selectableOrdering = ref(false);
  const showMenuFilter = ref<GraphqlGridColumnMenuFilter>(false);
  const emit = vi.fn();

  const options: UseGraphqlGridSelectionOptions = {
    gridData,
    section,
    listPeers,
    selectable,
    showOptions,
    selectableOrdering,
    showMenuFilter,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridSelection> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridSelection(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    gridData,
    section,
    listPeers,
    selectable,
    showOptions,
    selectableOrdering,
    showMenuFilter,
    emit,
    wrapper,
  };
}

describe("nextGraphqlGridShowMenuFilter", () => {
  it.each([
    ["ordering on, inactive", true, false, "columnMenuTemplate"],
    ["ordering on, active", true, true, "columnMenuTemplate"],
    ["ordering off, inactive", false, false, false],
    ["ordering off, active", false, true, "columnMenuTemplateActions"],
  ] as const)("%s", (_label, ordering, active, expected) => {
    expect(nextGraphqlGridShowMenuFilter(ordering, active)).toBe(expected);
  });
});

describe("areGraphqlGridRowsAllSelected", () => {
  it.each([
    ["not selectable", false, [{ selected: true }], false],
    ["selectable empty grid", true, [], true],
    [
      "all selected",
      true,
      [{ selected: true }, { selected: true }],
      true,
    ],
    [
      "one unselected",
      true,
      [{ selected: true }, { selected: false }],
      false,
    ],
    ["missing selected counts as selected", true, [{}], true],
  ] as const)("%s", (_label, selectable, rows, expected) => {
    expect(
      areGraphqlGridRowsAllSelected(
        selectable,
        rows as GraphqlGridSelectableItem[],
      ),
    ).toBe(expected);
  });
});

describe("useGraphqlGridSelection", () => {
  it.each([
    ["undefined event", undefined],
    ["empty event", {}],
    ["event without dataItem", { type: "click" }],
  ] as const)("ignores %s and does not emit", (_label, event) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { api, emit } = mountSelection();
    const before = api.allSelected.value;

    api.onSelectionChange(event as never);

    expect(emit).not.toHaveBeenCalled();
    expect(api.allSelected.value).toBe(before);
    expect(api.selectedItems.value).toBeUndefined();
    log.mockRestore();
  });

  it("skips analyze section without toggling the row or emitting", () => {
    const row: GraphqlGridSelectableItem = { selected: false, id: 1 };
    const { api, emit } = mountSelection({
      gridData: ref([row]),
      section: ref("analyze"),
    });

    api.onSelectionChange({ dataItem: row });

    expect(row.selected).toBe(false);
    expect(emit).not.toHaveBeenCalled();
    expect(api.allSelected.value).toBe(false);
  });

  it.each([
    ["listPeers", true],
    ["default selected array", false],
  ] as const)("selectRow payload: %s", (_label, listPeersValue) => {
    const row: GraphqlGridSelectableItem = { selected: false, id: 1 };
    const { api, emit } = mountSelection({
      gridData: ref([row]),
      listPeers: ref(listPeersValue),
    });

    api.onSelectionChange({ dataItem: row });

    expect(row.selected).toBe(true);
    expect(api.selectedField).toBe(GRAPHQL_GRID_SELECTED_FIELD);
    if (listPeersValue) {
      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith("selectRow", row, true);
    } else {
      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith("selectRow", [row]);
    }
  });

  it.each([
    ["check on", true],
    ["check off", false],
  ] as const)("header %s toggles allSelected and emits selectAllRow", (
    _label,
    checked,
  ) => {
    const rows: GraphqlGridSelectableItem[] = [
      { selected: false, id: 1 },
      { selected: false, id: 2 },
    ];
    const { api, emit } = mountSelection({ gridData: ref(rows) });

    api.onHeaderSelectionChange({
      event: { target: { checked } },
    });

    expect(api.allSelected.value).toBe(checked);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith("selectAllRow", rows, checked);
  });

  it("sets showMenuFilter from header check when showOptions is on", () => {
    const { api, showMenuFilter } = mountSelection();

    api.onHeaderSelectionChange({
      event: { target: { checked: true } },
    });

    expect(showMenuFilter.value).toBe("columnMenuTemplateActions");
  });

  it("keeps the filter menu when selectableOrdering is on", () => {
    const { api, showMenuFilter } = mountSelection({
      selectableOrdering: ref(true),
    });

    api.onHeaderSelectionChange({
      event: { target: { checked: true } },
    });

    expect(showMenuFilter.value).toBe("columnMenuTemplate");
  });

  it("does not change showMenuFilter when showOptions is off", () => {
    const { api, showMenuFilter } = mountSelection({
      showOptions: ref(false),
    });

    api.onHeaderSelectionChange({
      event: { target: { checked: true } },
    });

    expect(showMenuFilter.value).toBe(false);
  });

  it("forces showMenuFilter false for listPeers row selection", () => {
    const row: GraphqlGridSelectableItem = { selected: false, id: 1 };
    const { api, showMenuFilter } = mountSelection({
      gridData: ref([row]),
      listPeers: ref(true),
    });

    api.onSelectionChange({ dataItem: row });

    expect(showMenuFilter.value).toBe(false);
  });

  it("flips showMenuFilter with row selection when showOptions is on", () => {
    const row: GraphqlGridSelectableItem = { selected: false, id: 1 };
    const { api, showMenuFilter } = mountSelection({
      gridData: ref([row]),
    });

    api.onSelectionChange({ dataItem: row });
    expect(showMenuFilter.value).toBe("columnMenuTemplateActions");

    api.onSelectionChange({ dataItem: row });
    expect(row.selected).toBe(false);
    expect(api.allSelected.value).toBe(false);
    expect(showMenuFilter.value).toBe(false);
  });

  it("clears allSelected when gridData changes", async () => {
    const rows = ref<GraphqlGridSelectableItem[]>([{ selected: true, id: 1 }]);
    const { api } = mountSelection({ gridData: rows });

    api.allSelected.value = true;
    rows.value = [{ selected: false, id: 2 }];
    await nextTick();

    expect(api.allSelected.value).toBe(false);
  });

  it("areAllSelected follows selectable and row.selected", () => {
    const rows = ref<GraphqlGridSelectableItem[]>([
      { selected: true },
      { selected: true },
    ]);
    const selectable = ref(true);
    const { api } = mountSelection({ gridData: rows, selectable });

    expect(api.areAllSelected.value).toBe(true);

    rows.value[1].selected = false;
    expect(api.areAllSelected.value).toBe(false);

    selectable.value = false;
    expect(api.areAllSelected.value).toBe(false);
  });
});
