/**
 * Tests for useClientGridSelection — row / header selection for CalculumGrid.
 * Does not mount CalculumGrid.vue.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  areClientGridRowsAllSelected,
  CLIENT_GRID_ADMIN_UPLOAD_SPEND_FILES,
  CLIENT_GRID_SELECTED_FIELD,
  nextClientGridShowMenuFilter,
  useClientGridSelection,
  type ClientGridColumnMenuFilter,
  type ClientGridDataResult,
  type ClientGridSelectableItem,
  type UseClientGridSelectionOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridSelection";

function mountSelection(
  overrides: Partial<UseClientGridSelectionOptions> = {},
) {
  const gridData = ref<ClientGridSelectableItem[]>([]);
  const dataResult = ref<ClientGridDataResult>({ data: [], total: 0 });
  const filterSelected = ref(false);
  const filterData = ref<unknown>(null);
  const compareList = ref(false);
  const editList = ref(false);
  const forCompareAddCompany = ref(false);
  const forAdminDataChange = ref(false);
  const forLastPaymentTermsCheck = ref(false);
  const selectable = ref(true);
  const selectableOrdering = ref(false);
  const matchList = ref(false);
  const columnsLocalName = ref("");
  const showMenuFilter = ref<ClientGridColumnMenuFilter>(false);
  const emit = vi.fn();

  const options: UseClientGridSelectionOptions = {
    gridData,
    dataResult,
    filterSelected,
    filterData,
    compareList,
    editList,
    forCompareAddCompany,
    forAdminDataChange,
    forLastPaymentTermsCheck,
    selectable,
    selectableOrdering,
    matchList,
    columnsLocalName,
    showMenuFilter,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridSelection> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useClientGridSelection(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    gridData: options.gridData as typeof gridData,
    dataResult: options.dataResult as typeof dataResult,
    filterSelected: options.filterSelected,
    filterData: options.filterData,
    compareList: options.compareList as typeof compareList,
    editList: options.editList as typeof editList,
    forCompareAddCompany:
      options.forCompareAddCompany as typeof forCompareAddCompany,
    forAdminDataChange: options.forAdminDataChange as typeof forAdminDataChange,
    forLastPaymentTermsCheck:
      options.forLastPaymentTermsCheck as typeof forLastPaymentTermsCheck,
    selectable: options.selectable as typeof selectable,
    selectableOrdering: options.selectableOrdering as typeof selectableOrdering,
    matchList: options.matchList as typeof matchList,
    columnsLocalName: options.columnsLocalName as typeof columnsLocalName,
    showMenuFilter: options.showMenuFilter,
    emit: options.emit as typeof emit,
    wrapper,
  };
}

describe("nextClientGridShowMenuFilter", () => {
  it.each([
    ["ordering on, inactive", true, false, "columnMenuTemplate"],
    ["ordering on, active", true, true, "columnMenuTemplate"],
    ["ordering off, inactive", false, false, false],
    ["ordering off, active", false, true, "columnMenuTemplateActions"],
  ] as const)("%s", (_label, ordering, active, expected) => {
    expect(nextClientGridShowMenuFilter(ordering, active)).toBe(expected);
  });
});

describe("areClientGridRowsAllSelected", () => {
  it.each([
    ["not selectable", false, [{ selected: true }], false],
    ["selectable empty page", true, [], true],
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
      areClientGridRowsAllSelected(
        selectable,
        rows as ClientGridSelectableItem[],
      ),
    ).toBe(expected);
  });
});

describe("useClientGridSelection header flag matrix", () => {
  it.each([
    {
      label: "compareList emits page data and forces menu false",
      flags: { compareList: true },
      checked: true,
      expectEmit: (rows: ClientGridSelectableItem[]) =>
        ["selectAllRow", rows, true] as const,
      expectMenu: false as ClientGridColumnMenuFilter,
      expectAllSelected: false,
    },
    {
      label: "default emits full gridData",
      flags: {},
      checked: true,
      expectEmit: (rows: ClientGridSelectableItem[], grid: ClientGridSelectableItem[]) =>
        ["selectAllRow", grid, true] as const,
      expectMenu: "columnMenuTemplateActions" as ClientGridColumnMenuFilter,
      expectAllSelected: true,
    },
    {
      label: "filterSelected emits filterData",
      flags: { filterSelected: true },
      checked: false,
      expectEmit: (
        _rows: ClientGridSelectableItem[],
        _grid: ClientGridSelectableItem[],
        filtered: unknown,
      ) => ["selectAllRow", filtered, false] as const,
      expectMenu: false as ClientGridColumnMenuFilter,
      expectAllSelected: false,
    },
    {
      label: "matchList clears menu to empty string",
      flags: { matchList: true },
      checked: true,
      expectEmit: (rows: ClientGridSelectableItem[], grid: ClientGridSelectableItem[]) =>
        ["selectAllRow", grid, true] as const,
      expectMenu: "" as ClientGridColumnMenuFilter,
      expectAllSelected: true,
    },
    {
      label: "AdminUploadSpendFiles menu override",
      flags: { columnsLocalName: CLIENT_GRID_ADMIN_UPLOAD_SPEND_FILES },
      checked: true,
      expectEmit: (rows: ClientGridSelectableItem[], grid: ClientGridSelectableItem[]) =>
        ["selectAllRow", grid, true] as const,
      expectMenu:
        "columnMenuActionsAdminConsoleSpendFile" as ClientGridColumnMenuFilter,
      expectAllSelected: true,
    },
    {
      label: "selectableOrdering keeps filter menu",
      flags: { selectableOrdering: true },
      checked: true,
      expectEmit: (rows: ClientGridSelectableItem[], grid: ClientGridSelectableItem[]) =>
        ["selectAllRow", grid, true] as const,
      expectMenu: "columnMenuTemplate" as ClientGridColumnMenuFilter,
      expectAllSelected: true,
    },
  ])("$label", ({ flags, checked, expectEmit, expectMenu, expectAllSelected }) => {
    const pageRows: ClientGridSelectableItem[] = [
      { selected: false, id: 1 },
      { selected: false, id: 2 },
    ];
    const grid: ClientGridSelectableItem[] = [
      ...pageRows,
      { selected: false, id: 3 },
    ];
    const filtered = [{ id: "f" }];

    const { api, emit, showMenuFilter, dataResult, filterSelected, filterData } =
      mountSelection({
        gridData: ref(grid),
        dataResult: ref({ data: [...pageRows], total: 2 }),
        filterSelected: ref(!!flags.filterSelected),
        filterData: ref(filtered),
        compareList: ref(!!flags.compareList),
        matchList: ref(!!flags.matchList),
        selectableOrdering: ref(!!flags.selectableOrdering),
        columnsLocalName: ref(flags.columnsLocalName ?? ""),
      });

    api.onHeaderSelectionChange({
      event: { target: { checked } },
    });

    const expectedArgs = expectEmit(
      dataResult.value.data,
      grid,
      filtered,
    );
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(...expectedArgs);
    expect(showMenuFilter.value).toBe(expectMenu);
    expect(api.allSelected.value).toBe(expectAllSelected);
    expect(dataResult.value.data.every((r) => r.selected === checked)).toBe(
      true,
    );
    expect(filterSelected.value).toBe(!!flags.filterSelected);
    void filterData;
  });

  it.each([
    {
      label: "forCompareAddCompany without last-payment-terms emits true",
      flags: { forCompareAddCompany: true },
      expectEmit: () => ["selectAllRow", true] as const,
    },
    {
      label: "forAdminDataChange emits gridData",
      flags: { forAdminDataChange: true },
      expectEmit: (grid: ClientGridSelectableItem[]) =>
        ["selectAllRow", grid, true] as const,
    },
    {
      label: "forCompareAddCompany + last-payment-terms emits check-only-one",
      flags: {
        forCompareAddCompany: true,
        forLastPaymentTermsCheck: true,
      },
      expectEmit: () => ["check-only-one"] as const,
    },
  ])("$label when filterSelected is false", ({ flags, expectEmit }) => {
    const grid: ClientGridSelectableItem[] = [{ selected: false }];
    const { api, emit } = mountSelection({
      forCompareAddCompany: ref(!!flags.forCompareAddCompany),
      forAdminDataChange: ref(!!flags.forAdminDataChange),
      forLastPaymentTermsCheck: ref(!!flags.forLastPaymentTermsCheck),
      filterSelected: ref(false),
      gridData: ref(grid),
      dataResult: ref({ data: [{ selected: false }], total: 1 }),
    });

    api.onHeaderSelectionChange({
      event: { target: { checked: true } },
    });

    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(...expectEmit(grid));
  });
});

describe("useClientGridSelection row flag matrix", () => {
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

  it.each([
    {
      label: "compareList emits dataItem only",
      flags: { compareList: true },
      row: { selected: false, id: 1 } as ClientGridSelectableItem,
      afterSelected: false,
      expectEmit: (row: ClientGridSelectableItem) =>
        ["selectRow", row] as const,
      expectMenu: false as ClientGridColumnMenuFilter,
    },
    {
      label: "editList toggles and emits selected array",
      flags: { editList: true },
      row: { selected: false, id: 1 } as ClientGridSelectableItem,
      afterSelected: true,
      expectEmit: (row: ClientGridSelectableItem) =>
        ["selectRow", [row]] as const,
      expectMenu: "columnMenuTemplateActions" as ClientGridColumnMenuFilter,
    },
    {
      label: "forCompareAddCompany emits row + next checked",
      flags: { forCompareAddCompany: true },
      row: { selected: false, id: 1 } as ClientGridSelectableItem,
      afterSelected: false,
      expectEmit: (row: ClientGridSelectableItem) =>
        ["selectRow", row, true] as const,
      expectMenu: false as ClientGridColumnMenuFilter,
    },
    {
      label: "forAdminDataChange deselect emits row + false",
      flags: { forAdminDataChange: true },
      row: { selected: true, id: 1 } as ClientGridSelectableItem,
      afterSelected: true,
      expectEmit: (row: ClientGridSelectableItem) =>
        ["selectRow", row, false] as const,
      expectMenu: false as ClientGridColumnMenuFilter,
    },
    {
      label: "@id row emits id + next selected",
      flags: {},
      row: { selected: false, "@id": "iri/1" } as ClientGridSelectableItem,
      afterSelected: false,
      expectEmit: () => ["selectRow", "iri/1", true] as const,
      expectMenu: false as ClientGridColumnMenuFilter,
    },
    {
      label: "default toggles and emits selected array with empty menu",
      flags: {},
      row: { selected: false, id: 1 } as ClientGridSelectableItem,
      afterSelected: true,
      expectEmit: (row: ClientGridSelectableItem) =>
        ["selectRow", [row]] as const,
      expectMenu: "" as ClientGridColumnMenuFilter,
    },
    {
      label: "AdminUploadSpendFiles default row menu override",
      flags: { columnsLocalName: CLIENT_GRID_ADMIN_UPLOAD_SPEND_FILES },
      row: { selected: false, id: 1 } as ClientGridSelectableItem,
      afterSelected: true,
      expectEmit: (row: ClientGridSelectableItem) =>
        ["selectRow", [row]] as const,
      expectMenu:
        "columnMenuActionsAdminConsoleSpendFile" as ClientGridColumnMenuFilter,
    },
  ])("$label", ({ flags, row, afterSelected, expectEmit, expectMenu }) => {
    const { api, emit, showMenuFilter } = mountSelection({
      gridData: ref([row]),
      dataResult: ref({ data: [row], total: 1 }),
      compareList: ref(!!flags.compareList),
      editList: ref(!!flags.editList),
      forCompareAddCompany: ref(!!flags.forCompareAddCompany),
      forAdminDataChange: ref(!!flags.forAdminDataChange),
      columnsLocalName: ref(flags.columnsLocalName ?? ""),
    });

    api.onSelectionChange({ dataItem: row });

    expect(row.selected).toBe(afterSelected);
    expect(api.selectedField).toBe(CLIENT_GRID_SELECTED_FIELD);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(...expectEmit(row));
    expect(showMenuFilter.value).toBe(expectMenu);
  });

  it("flips showMenuFilter off when editList deselects last row", () => {
    const row: ClientGridSelectableItem = { selected: true, id: 1 };
    const { api, showMenuFilter } = mountSelection({
      gridData: ref([row]),
      editList: ref(true),
    });

    api.onSelectionChange({ dataItem: row });

    expect(row.selected).toBe(false);
    expect(api.allSelected.value).toBe(false);
    expect(showMenuFilter.value).toBe(false);
  });

  it("areAllSelected follows selectable and page row.selected", () => {
    const rows = ref<ClientGridSelectableItem[]>([
      { selected: true },
      { selected: true },
    ]);
    const selectable = ref(true);
    const { api } = mountSelection({
      dataResult: ref({ data: rows.value, total: 2 }),
      selectable,
    });

    expect(api.areAllSelected.value).toBe(true);

    rows.value[1].selected = false;
    expect(api.areAllSelected.value).toBe(false);

    selectable.value = false;
    expect(api.areAllSelected.value).toBe(false);
  });
});
