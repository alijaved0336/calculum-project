/**
 * Tests for useGraphqlGridColumnCache — visibility, reorder, selectable
 * prepend, and column-menu name stamping for CalculumGridGraphql.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { GRAPHQL_GRID_SELECTED_FIELD } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridSelection";
import {
  applyGraphqlGridColumnReorder,
  applyGraphqlGridColumnVisibility,
  buildGraphqlGridColumns,
  GRAPHQL_GRID_COLUMN_MENU_TEMPLATE,
  GRAPHQL_GRID_SELECTABLE_HEADER_CLASS,
  graphqlGridSelectableColumnMenu,
  graphqlGridSelectableHeaderClassName,
  stampGraphqlGridColumnMenus,
  useGraphqlGridColumnCache,
  type GraphqlGridColumn,
  type UseGraphqlGridColumnCacheOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridColumnCache";

function mountColumnCache(
  overrides: Partial<UseGraphqlGridColumnCacheOptions> = {},
) {
  const gridColumns = ref<GraphqlGridColumn[]>([
    { field: "name", title: "Name" },
    { field: "spend", title: "Spend" },
  ]);
  const childrenColumns = ref(false);
  const hideMenuColumns = ref(false);
  const filter = ref<unknown>({});
  const selectable = ref(false);
  const areAllSelected = ref(false);
  const showMenuFilter = ref<"columnMenuTemplate" | false>(false);
  const listPeers = ref(false);
  const matchList = ref(false);
  const selectableOrdering = ref(false);
  const handleEditProgramAction = ref(false);
  const section = ref("home");
  const levelOfGrid = ref("spends");
  const emit = vi.fn();

  const options: UseGraphqlGridColumnCacheOptions = {
    gridColumns,
    childrenColumns,
    hideMenuColumns,
    filter,
    selectable,
    areAllSelected,
    showMenuFilter,
    listPeers,
    matchList,
    selectableOrdering,
    handleEditProgramAction,
    section,
    levelOfGrid,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridColumnCache> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridColumnCache(options);
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
    filter,
    selectable,
    areAllSelected,
    showMenuFilter,
    listPeers,
    matchList,
    selectableOrdering,
    handleEditProgramAction,
    section,
    levelOfGrid,
    emit,
    wrapper,
  };
}

describe("stampGraphqlGridColumnMenus", () => {
  it("does not set a menu on group parents; stamps filterable children", () => {
    const parent: GraphqlGridColumn = {
      title: "Spend group",
      children: [
        { field: "amount", title: "Amount", filterable: true },
        { field: "currency", title: "Currency", filterable: false },
      ],
    };
    const leaf: GraphqlGridColumn = { field: "name", title: "Name" };

    stampGraphqlGridColumnMenus([parent, leaf]);

    expect(parent.columnMenu).toBe(false);
    expect(parent.children?.[0].columnMenu).toBe(
      GRAPHQL_GRID_COLUMN_MENU_TEMPLATE,
    );
    expect(parent.children?.[1].columnMenu).toBe(false);
    expect(leaf.columnMenu).toBe(GRAPHQL_GRID_COLUMN_MENU_TEMPLATE);
  });

  it("stamps a leaf with filterable false as no menu", () => {
    const leaf: GraphqlGridColumn = {
      field: "locked",
      title: "Locked",
      filterable: false,
    };

    stampGraphqlGridColumnMenus([leaf]);

    expect(leaf.columnMenu).toBe(false);
  });
});

describe("applyGraphqlGridColumnReorder", () => {
  it("without childrenColumns, copies reorder metadata by field", () => {
    const columns: GraphqlGridColumn[] = [
      { field: "name", title: "Name", orderIndex: 0 },
      { field: "spend", title: "Spend", orderIndex: 1 },
    ];

    applyGraphqlGridColumnReorder(
      columns,
      [
        {
          field: "spend",
          id: "spend-id",
          orderIndex: 0,
          editable: false,
          isAccessible: false,
        },
        {
          field: "name",
          id: "name-id",
          orderIndex: 1,
          editable: true,
          isAccessible: true,
        },
      ],
      false,
    );

    expect(columns[0]).toMatchObject({
      field: "name",
      id: "name-id",
      orderIndex: 1,
      editable: true,
      isAccessible: true,
    });
    expect(columns[1]).toMatchObject({
      field: "spend",
      id: "spend-id",
      orderIndex: 0,
      editable: false,
      isAccessible: false,
    });
  });

  it("without childrenColumns, assigns fallback ids when field is missing", () => {
    const columns: GraphqlGridColumn[] = [
      { field: "name", title: "Name" },
      { field: "hiddenCol", title: "Hidden" },
    ];

    applyGraphqlGridColumnReorder(
      columns,
      [{ field: "name", id: "name-id", orderIndex: 0 }],
      false,
    );

    expect(columns[0].id).toBe("name-id");
    expect(columns[1].id).toBe("_2_column");
    expect(columns[1].orderIndex).toBe(2);
    expect(columns[1].editable).toBe(true);
    expect(columns[1].isAccessible).toBe(true);
  });

  it("with childrenColumns, copies child reorder metadata under the matching parent title", () => {
    const columns: GraphqlGridColumn[] = [
      {
        title: "Spend group",
        children: [
          { field: "amount", title: "Amount", orderIndex: 0 },
          { field: "currency", title: "Currency", orderIndex: 1 },
        ],
      },
    ];

    applyGraphqlGridColumnReorder(
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
    const columns: GraphqlGridColumn[] = [
      {
        title: "Spend group",
        children: [{ field: "amount", title: "Amount" }],
      },
    ];

    applyGraphqlGridColumnReorder(
      columns,
      [{ title: "Spend group", children: [] }],
      true,
    );

    expect(columns[0].children?.[0].id).toBe("_2_column");
    expect(columns[0].children?.[0].orderIndex).toBe(2);
  });
});

describe("applyGraphqlGridColumnVisibility", () => {
  it("matches visibility by field and title so duplicate fields stay independent", () => {
    const columns: GraphqlGridColumn[] = [
      { field: "spend", title: "Spend A", hidden: false },
      { field: "spend", title: "Spend B", hidden: false },
    ];

    applyGraphqlGridColumnVisibility(
      columns,
      [
        { field: "spend", title: "Spend A", hidden: true },
        { field: "spend", title: "Spend B", hidden: false },
      ],
      false,
    );

    expect(columns[0].hidden).toBe(true);
    expect(columns[1].hidden).toBe(false);
  });

  it("does not change hidden when field+title do not match", () => {
    const columns: GraphqlGridColumn[] = [
      { field: "name", title: "Name", hidden: false },
    ];

    applyGraphqlGridColumnVisibility(
      columns,
      [{ field: "name", title: "Other", hidden: true }],
      false,
    );

    expect(columns[0].hidden).toBe(false);
  });

  it("with childrenColumns, matches child visibility by field and title", () => {
    const columns: GraphqlGridColumn[] = [
      {
        title: "Spend group",
        children: [
          { field: "amount", title: "Amount", hidden: false },
          { field: "amount", title: "Amount (PY)", hidden: false },
        ],
      },
    ];

    applyGraphqlGridColumnVisibility(
      columns,
      [
        { field: "amount", title: "Amount", hidden: true },
        { field: "amount", title: "Amount (PY)", hidden: false },
      ],
      true,
    );

    expect(columns[0].children?.[0].hidden).toBe(true);
    expect(columns[0].children?.[1].hidden).toBe(false);
  });
});

describe("graphqlGridSelectableHeaderClassName", () => {
  it.each([
    ["listPeers", true, false, false, GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.compare],
    ["match list", false, false, true, GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.match],
    ["default", false, false, false, GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.default],
    ["ordering", false, true, false, GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.ordering],
  ] as const)(
    "%s",
    (_label, listPeers, selectableOrdering, matchList, expected) => {
      expect(
        graphqlGridSelectableHeaderClassName({
          listPeers,
          selectableOrdering,
          matchList,
        }),
      ).toBe(expected);
    },
  );
});

describe("graphqlGridSelectableColumnMenu", () => {
  it.each([
    ["listPeers keeps showMenuFilter", true, "home", false, "columnMenuTemplate"],
    ["plan section hides menu", false, "plan", false, false],
    ["edit-program action hides menu", false, "home", true, false],
    ["home keeps showMenuFilter", false, "home", false, "columnMenuTemplate"],
  ] as const)("%s", (_label, listPeers, section, handleEdit, expected) => {
    expect(
      graphqlGridSelectableColumnMenu("columnMenuTemplate", {
        listPeers,
        section,
        handleEditProgramAction: handleEdit,
      }),
    ).toBe(expected);
  });
});

describe("buildGraphqlGridColumns", () => {
  const dataColumns: GraphqlGridColumn[] = [
    { field: "name", title: "Name" },
  ];

  it("returns columnsToShow when not selectable", () => {
    expect(
      buildGraphqlGridColumns(dataColumns, {
        selectable: false,
        areAllSelected: false,
        showMenuFilter: false,
        listPeers: false,
        matchList: false,
        selectableOrdering: false,
        handleEditProgramAction: false,
        section: "home",
      }),
    ).toBe(dataColumns);
  });

  it("prepends a locked selected column when selectable", () => {
    const result = buildGraphqlGridColumns(dataColumns, {
      selectable: true,
      areAllSelected: true,
      showMenuFilter: "columnMenuTemplate",
      listPeers: false,
      matchList: false,
      selectableOrdering: false,
      handleEditProgramAction: false,
      section: "home",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      field: GRAPHQL_GRID_SELECTED_FIELD,
      title: "Edit",
      width: "75px",
      resizable: false,
      headerSelectionValue: true,
      filter: "boolean",
      columnMenu: "columnMenuTemplate",
      locked: true,
      headerClassName: GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.default,
    });
    expect(result[1]).toBe(dataColumns[0]);
  });
});

describe("useGraphqlGridColumnCache", () => {
  it("on mount, stamps menus on default columns but not on group parents", async () => {
    const parent: GraphqlGridColumn = {
      title: "Spend group",
      children: [{ field: "amount", title: "Amount" }],
    };
    const { api } = mountColumnCache({
      gridColumns: ref([parent]),
    });

    await nextTick();

    expect(api.defaultColumns.value[0].columnMenu).toBe(false);
    expect(api.defaultColumns.value[0].children?.[0].columnMenu).toBe(
      GRAPHQL_GRID_COLUMN_MENU_TEMPLATE,
    );
  });

  it("does not stamp menus on mount when hideMenuColumns is true", async () => {
    const leaf: GraphqlGridColumn = { field: "name", title: "Name" };
    const { api } = mountColumnCache({
      gridColumns: ref([leaf]),
      hideMenuColumns: ref(true),
    });

    await nextTick();

    expect(api.defaultColumns.value[0].columnMenu).toBeUndefined();
  });

  it("prepends the locked selected column in the columns computed", () => {
    const { api } = mountColumnCache({
      selectable: ref(true),
      areAllSelected: ref(true),
    });

    expect(api.columns.value[0]).toMatchObject({
      field: GRAPHQL_GRID_SELECTED_FIELD,
      locked: true,
      headerClassName: GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.default,
    });
  });

  it("onColumnReorder without childrenColumns updates cache by field", () => {
    const { api } = mountColumnCache();

    api.onColumnReorder({
      columns: [
        {
          field: "spend",
          id: "spend-id",
          orderIndex: 0,
          editable: true,
          isAccessible: true,
        },
        {
          field: "name",
          id: "name-id",
          orderIndex: 1,
          editable: true,
          isAccessible: true,
        },
      ],
    });

    expect(api.columnsToShow.value[0].id).toBe("name-id");
    expect(api.columnsToShow.value[0].orderIndex).toBe(1);
    expect(api.columnsToShow.value[1].id).toBe("spend-id");
  });

  it("onColumnReorder with childrenColumns updates child cache", () => {
    const grouped: GraphqlGridColumn[] = [
      {
        title: "Spend group",
        children: [{ field: "amount", title: "Amount", orderIndex: 0 }],
      },
    ];
    const { api } = mountColumnCache({
      gridColumns: ref(grouped),
      childrenColumns: ref(true),
    });

    api.onColumnReorder({
      columns: [
        {
          title: "Spend group",
          children: [
            {
              field: "amount",
              id: "amt-id",
              orderIndex: 2,
              editable: false,
              isAccessible: true,
            },
          ],
        },
      ],
    });

    expect(api.columnsToShow.value[0].children?.[0]).toMatchObject({
      id: "amt-id",
      orderIndex: 2,
      editable: false,
    });
  });

  it("onSubmitColumnsMenu matches by field+title and emits callbackOnSubmit", () => {
    const { api, emit } = mountColumnCache({
      gridColumns: ref([
        { field: "spend", title: "Spend A", hidden: false },
        { field: "spend", title: "Spend B", hidden: false },
      ]),
    });
    const state = [
      { field: "spend", title: "Spend A", hidden: true },
      { field: "spend", title: "Spend B", hidden: false },
    ];

    api.onSubmitColumnsMenu(state);

    expect(api.columnsToShow.value[0].hidden).toBe(true);
    expect(api.columnsToShow.value[1].hidden).toBe(false);
    expect(emit).toHaveBeenCalledWith("callbackOnSubmit", state);
  });

  it("resetDefaultColumns emits reset-default-columns with levelOfGrid", () => {
    const { api, emit } = mountColumnCache({
      levelOfGrid: ref("suppliers"),
    });

    api.resetDefaultColumns();

    expect(emit).toHaveBeenCalledWith("reset-default-columns", "suppliers");
  });

  it("bumps filter-driven column keys when filter changes", async () => {
    const { api, filter } = mountColumnCache();
    const before = {
      exclude: api.excludeColumnKey.value,
      harm: api.harmonizationColumnKey.value,
      fin: api.financingColumnKey.value,
    };

    filter.value = { filters: [{ field: "name" }], logic: "and" };
    await nextTick();

    expect(api.excludeColumnKey.value).toBe(before.exclude + 1);
    expect(api.harmonizationColumnKey.value).toBe(before.harm + 1);
    expect(api.financingColumnKey.value).toBe(before.fin + 1);
  });
});
