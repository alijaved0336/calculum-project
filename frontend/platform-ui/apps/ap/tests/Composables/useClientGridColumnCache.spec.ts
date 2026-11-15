/**
 * Tests for useClientGridColumnCache — visibility, reorder, selectable
 * prepend, and column-menu name stamping for CalculumGrid.
 * Does not mount CalculumGrid.vue (DistinctValues spec documents why).
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { CLIENT_GRID_SELECTED_FIELD } from "@/modules/components/grid/calculum-grid/composables/useClientGridSelection";
import {
  applyClientGridColumnReorder,
  applyClientGridColumnVisibility,
  buildClientGridColumns,
  CLIENT_GRID_COLUMN_MENU_TEMPLATE,
  CLIENT_GRID_SELECTABLE_HEADER_CLASS,
  clientGridSelectableHeaderClassName,
  stampClientGridColumnMenus,
  useClientGridColumnCache,
  type ClientGridColumn,
  type UseClientGridColumnCacheOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridColumnCache";

function mountColumnCache(
  overrides: Partial<UseClientGridColumnCacheOptions> = {},
) {
  const gridColumns = ref<ClientGridColumn[]>([
    { field: "name", title: "Name" },
    { field: "spend", title: "Spend" },
  ]);
  const childrenColumns = ref(false);
  const hideMenuColumns = ref(false);
  const selectable = ref(false);
  const areAllSelected = ref(false);
  const showMenuFilter = ref<"columnMenuTemplate" | false>(false);
  const compareList = ref(false);
  const matchList = ref(false);
  const selectableOrdering = ref(false);
  const levelOfGrid = ref("spends");
  const emit = vi.fn();

  const options: UseClientGridColumnCacheOptions = {
    gridColumns,
    childrenColumns,
    hideMenuColumns,
    selectable,
    areAllSelected,
    showMenuFilter,
    compareList,
    matchList,
    selectableOrdering,
    levelOfGrid,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridColumnCache> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useClientGridColumnCache(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    gridColumns,
    childrenColumns,
    hideMenuColumns,
    selectable,
    areAllSelected,
    showMenuFilter,
    compareList,
    matchList,
    selectableOrdering,
    levelOfGrid,
    emit,
    wrapper,
  };
}

describe("stampClientGridColumnMenus", () => {
  it("stamps sortable leaves with columnMenuTemplate", () => {
    const leaf: ClientGridColumn = { field: "name", title: "Name" };
    const locked: ClientGridColumn = {
      field: "locked",
      title: "Locked",
      sortable: false,
    };

    stampClientGridColumnMenus([leaf, locked]);

    expect(leaf.columnMenu).toBe(CLIENT_GRID_COLUMN_MENU_TEMPLATE);
    expect(locked.columnMenu).toBe(false);
  });
});

describe("applyClientGridColumnReorder", () => {
  it("copies reorder metadata by field when childrenColumns is false", () => {
    const columns: ClientGridColumn[] = [
      { field: "name", title: "Name" },
      { field: "spend", title: "Spend" },
    ];

    applyClientGridColumnReorder(
      columns,
      [
        {
          field: "spend",
          id: "spend-id",
          orderIndex: 0,
          editable: false,
          isAccessible: true,
        },
        {
          field: "name",
          id: "name-id",
          orderIndex: 1,
          editable: true,
          isAccessible: false,
        },
      ],
      false,
    );

    expect(columns[0]).toMatchObject({
      field: "name",
      id: "name-id",
      orderIndex: 1,
      editable: true,
      isAccessible: false,
    });
    expect(columns[1]).toMatchObject({
      field: "spend",
      id: "spend-id",
      orderIndex: 0,
      editable: false,
      isAccessible: true,
    });
  });

  it("with childrenColumns, updates children matched by parent title", () => {
    const columns: ClientGridColumn[] = [
      {
        title: "Spend group",
        children: [
          { field: "amount", title: "Amount" },
          { field: "currency", title: "Currency" },
        ],
      },
    ];

    applyClientGridColumnReorder(
      columns,
      [
        {
          title: "Spend group",
          children: [
            {
              field: "currency",
              id: "cur-id",
              orderIndex: 0,
              editable: false,
              isAccessible: true,
            },
            {
              field: "amount",
              id: "amt-id",
              orderIndex: 1,
              editable: true,
              isAccessible: false,
            },
          ],
        },
      ],
      true,
    );

    expect(columns[0].children?.[0]).toMatchObject({
      field: "amount",
      id: "amt-id",
      orderIndex: 1,
      editable: true,
      isAccessible: false,
    });
    expect(columns[0].children?.[1]).toMatchObject({
      field: "currency",
      id: "cur-id",
      orderIndex: 0,
      editable: false,
      isAccessible: true,
    });
  });

  it("with childrenColumns, assigns fallback ids when a child field is missing", () => {
    const columns: ClientGridColumn[] = [
      {
        title: "Spend group",
        children: [{ field: "amount", title: "Amount" }],
      },
    ];

    applyClientGridColumnReorder(
      columns,
      [{ title: "Spend group", children: [] }],
      true,
    );

    expect(columns[0].children?.[0].id).toBe("_2_column");
    expect(columns[0].children?.[0].orderIndex).toBe(2);
  });
});

describe("applyClientGridColumnVisibility", () => {
  it("matches visibility by field only", () => {
    const columns: ClientGridColumn[] = [
      { field: "spend", title: "Spend A", hidden: false },
      { field: "name", title: "Name", hidden: false },
    ];

    applyClientGridColumnVisibility(
      columns,
      [
        { field: "spend", title: "Other title", hidden: true },
        { field: "name", title: "Name", hidden: false },
      ],
      false,
    );

    expect(columns[0].hidden).toBe(true);
    expect(columns[1].hidden).toBe(false);
  });

  it("with childrenColumns, updates child hidden by field", () => {
    const columns: ClientGridColumn[] = [
      {
        title: "Group",
        children: [
          { field: "amount", title: "Amount", hidden: false },
          { field: "currency", title: "Currency", hidden: false },
        ],
      },
    ];

    applyClientGridColumnVisibility(
      columns,
      [{ field: "amount", hidden: true }],
      true,
    );

    expect(columns[0].children?.[0].hidden).toBe(true);
    expect(columns[0].children?.[1].hidden).toBe(false);
  });
});

describe("clientGridSelectableHeaderClassName", () => {
  it.each([
    ["compareList", { compareList: true, selectableOrdering: false, matchList: false }, ""],
    [
      "matchList",
      { compareList: false, selectableOrdering: false, matchList: true },
      CLIENT_GRID_SELECTABLE_HEADER_CLASS.match,
    ],
    [
      "default",
      { compareList: false, selectableOrdering: false, matchList: false },
      CLIENT_GRID_SELECTABLE_HEADER_CLASS.default,
    ],
    [
      "selectableOrdering",
      { compareList: false, selectableOrdering: true, matchList: false },
      "",
    ],
  ] as const)("%s", (_label, context, expected) => {
    expect(clientGridSelectableHeaderClassName(context)).toBe(expected);
  });
});

describe("buildClientGridColumns", () => {
  it("returns columnsToShow when not selectable", () => {
    const columns: ClientGridColumn[] = [{ field: "name" }];
    expect(
      buildClientGridColumns(columns, {
        selectable: false,
        areAllSelected: false,
        showMenuFilter: false,
        compareList: false,
        matchList: false,
        selectableOrdering: false,
      }),
    ).toBe(columns);
  });

  it("prepends selected column when selectable", () => {
    const columns: ClientGridColumn[] = [{ field: "name" }];
    const result = buildClientGridColumns(columns, {
      selectable: true,
      areAllSelected: true,
      showMenuFilter: CLIENT_GRID_COLUMN_MENU_TEMPLATE,
      compareList: false,
      matchList: true,
      selectableOrdering: false,
    });

    expect(result[0]).toMatchObject({
      field: CLIENT_GRID_SELECTED_FIELD,
      title: "Edit",
      headerSelectionValue: true,
      columnMenu: CLIENT_GRID_COLUMN_MENU_TEMPLATE,
      headerClassName: CLIENT_GRID_SELECTABLE_HEADER_CLASS.match,
      locked: true,
    });
    expect(result.slice(1)).toEqual(columns);
  });
});

describe("useClientGridColumnCache", () => {
  it("updates columnsToShow and chooseColumnsKey when gridColumns change", async () => {
    const { api, gridColumns } = mountColumnCache();
    const previousKey = api.chooseColumnsKey.value;

    gridColumns.value = [{ field: "next", title: "Next" }];
    await nextTick();

    expect(api.columnsToShow.value).toEqual([{ field: "next", title: "Next" }]);
    expect(api.chooseColumnsKey.value).not.toBe(previousKey);
  });

  it("resetDefaultColumns emits levelOfGrid", () => {
    const { api, emit, levelOfGrid } = mountColumnCache();
    levelOfGrid.value = "suppliers";

    api.resetDefaultColumns();

    expect(emit).toHaveBeenCalledWith("reset-default-columns", "suppliers");
  });

  it("onSubmitColumnsMenu applies visibility without emitting", () => {
    const { api, emit } = mountColumnCache();

    api.onSubmitColumnsMenu([{ field: "name", hidden: true }]);

    expect(api.columnsToShow.value[0].hidden).toBe(true);
    expect(emit).not.toHaveBeenCalled();
  });

  it("stamps menus on mount when menus are shown and not childrenColumns", () => {
    const gridColumns = ref<ClientGridColumn[]>([
      { field: "name", title: "Name" },
      { field: "locked", title: "Locked", sortable: false },
    ]);
    const { api } = mountColumnCache({
      gridColumns,
      hideMenuColumns: ref(false),
      childrenColumns: ref(false),
    });

    expect(api.defaultColumns.value[0].columnMenu).toBe(
      CLIENT_GRID_COLUMN_MENU_TEMPLATE,
    );
    expect(api.defaultColumns.value[1].columnMenu).toBe(false);
  });
});
