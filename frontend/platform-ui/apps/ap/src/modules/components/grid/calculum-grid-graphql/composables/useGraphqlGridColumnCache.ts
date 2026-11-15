import {
  computed,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import {
  GRAPHQL_GRID_SELECTED_FIELD,
  type GraphqlGridColumnMenuFilter,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridSelection";

export const GRAPHQL_GRID_COLUMN_MENU_TEMPLATE = "columnMenuTemplate";

export const GRAPHQL_GRID_SELECTABLE_HEADER_CLASS = {
  compare: "filter-options-compare",
  match: "filter-match-options",
  default: "filter-options",
  ordering: "some-class",
} as const;

export type GraphqlGridColumn = {
  field?: string;
  title?: string;
  children?: GraphqlGridColumn[];
  columnMenu?: GraphqlGridColumnMenuFilter;
  filterable?: boolean;
  hidden?: boolean;
  id?: string;
  orderIndex?: number;
  editable?: boolean;
  isAccessible?: boolean;
  headerClassName?: string;
  width?: string;
  resizable?: boolean;
  locked?: boolean;
  headerSelectionValue?: boolean;
  filter?: string;
  [key: string]: unknown;
};

export interface GraphqlGridColumnReorderEvent {
  columns: GraphqlGridColumn[];
}

export type GraphqlGridColumnCacheEmit = (
  event: "callbackOnSubmit" | "reset-default-columns",
  ...args: unknown[]
) => void;

export interface GraphqlGridColumnScreenContext {
  listPeers: boolean;
  matchList: boolean;
  selectableOrdering: boolean;
  handleEditProgramAction: boolean;
  section: string;
}

export interface UseGraphqlGridColumnCacheOptions {
  gridColumns: MaybeRefOrGetter<GraphqlGridColumn[]>;
  childrenColumns: MaybeRefOrGetter<boolean>;
  hideMenuColumns: MaybeRefOrGetter<boolean>;
  filter: MaybeRefOrGetter<unknown>;
  selectable: MaybeRefOrGetter<boolean>;
  areAllSelected: MaybeRefOrGetter<boolean>;
  showMenuFilter: MaybeRefOrGetter<GraphqlGridColumnMenuFilter>;
  listPeers: MaybeRefOrGetter<boolean>;
  matchList: MaybeRefOrGetter<boolean>;
  selectableOrdering: MaybeRefOrGetter<boolean>;
  handleEditProgramAction: MaybeRefOrGetter<boolean>;
  section: MaybeRefOrGetter<string>;
  levelOfGrid: MaybeRefOrGetter<string>;
  emit: GraphqlGridColumnCacheEmit;
}

function columnMenuForField(filterable: boolean | undefined) {
  return filterable === false ? false : GRAPHQL_GRID_COLUMN_MENU_TEMPLATE;
}

/**
 * Stamp Kendo `columnMenu` names. Group parents stay without a menu;
 * only leaf / child data fields get `columnMenuTemplate` when filterable.
 */
export function stampGraphqlGridColumnMenus(columns: GraphqlGridColumn[]) {
  for (const row of columns) {
    if (row.children && Array.isArray(row.children)) {
      row.columnMenu = false;
      row.children.forEach((child) => {
        child.columnMenu = columnMenuForField(child.filterable);
      });
    } else {
      row.columnMenu = columnMenuForField(row.filterable);
    }
  }
}

/**
 * Copy Kendo reorder ids onto the cached columns.
 * With `childrenColumns`, only grouped children are updated (match parent by title).
 * Without it, match by field.
 */
export function applyGraphqlGridColumnReorder(
  columnsToShow: GraphqlGridColumn[],
  reorderedColumns: GraphqlGridColumn[],
  childrenColumns: boolean,
) {
  let optionsLength = reorderedColumns.length;

  if (childrenColumns) {
    columnsToShow
      .filter((column) => column.children)
      .forEach((column) => {
        const indexParentReorder = reorderedColumns.findIndex(
          (item) => item.title === column.title,
        );
        const childreorder =
          indexParentReorder > -1
            ? reorderedColumns[indexParentReorder].children
            : [];
        if (childreorder) {
          column.children?.forEach((columnChild) => {
            const indexSpend = childreorder.findIndex(
              (item) => item.field === columnChild.field,
            );
            if (indexSpend > -1) {
              const source = childreorder[indexSpend];
              columnChild.id = source.id;
              columnChild.orderIndex = source.orderIndex;
              columnChild.editable = source.editable;
              columnChild.isAccessible = source.isAccessible;
            } else {
              optionsLength++;
              columnChild.id = "_" + optionsLength + "_column";
              columnChild.orderIndex = optionsLength;
              columnChild.editable = true;
              columnChild.isAccessible = true;
            }
          });
        }
      });
    return;
  }

  for (const row of columnsToShow) {
    const indexSpend = reorderedColumns.findIndex(
      (item) => item.field === row.field,
    );
    if (indexSpend > -1) {
      const source = reorderedColumns[indexSpend];
      row.id = source.id;
      row.orderIndex = source.orderIndex;
      row.editable = source.editable;
      row.isAccessible = source.isAccessible;
    } else {
      optionsLength++;
      row.id = "_" + optionsLength + "_column";
      row.orderIndex = optionsLength;
      row.editable = true;
      row.isAccessible = true;
    }
  }
}

function findColumnState(
  columnsState: GraphqlGridColumn[],
  column: GraphqlGridColumn,
) {
  return columnsState.find(
    (item) => item.field === column.field && item.title === column.title,
  );
}

/**
 * Apply column-selector visibility. Match by field **and** title so duplicate
 * fields with different titles stay independent.
 */
export function applyGraphqlGridColumnVisibility(
  columnsToShow: GraphqlGridColumn[],
  columnsState: GraphqlGridColumn[],
  childrenColumns: boolean,
) {
  if (childrenColumns) {
    columnsToShow
      .filter((column) => column.children)
      .forEach((column) => {
        column.children?.forEach((columnChild) => {
          const state = findColumnState(columnsState, columnChild);
          if (state) {
            columnChild.hidden = state.hidden;
          }
        });
      });
    return;
  }

  columnsToShow.forEach((column) => {
    const state = findColumnState(columnsState, column);
    if (state) {
      column.hidden = state.hidden;
    }
  });
}

export function graphqlGridSelectableHeaderClassName(
  context: Pick<
    GraphqlGridColumnScreenContext,
    "listPeers" | "selectableOrdering" | "matchList"
  >,
): string {
  if (context.listPeers) {
    return GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.compare;
  }
  if (context.selectableOrdering) {
    return GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.ordering;
  }
  if (context.matchList) {
    return GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.match;
  }
  return GRAPHQL_GRID_SELECTABLE_HEADER_CLASS.default;
}

export function graphqlGridSelectableColumnMenu(
  showMenuFilter: GraphqlGridColumnMenuFilter,
  context: Pick<
    GraphqlGridColumnScreenContext,
    "listPeers" | "section" | "handleEditProgramAction"
  >,
): GraphqlGridColumnMenuFilter {
  if (context.listPeers) {
    return showMenuFilter;
  }
  const menuFilterPlan = context.section !== "plan";
  if (menuFilterPlan && !context.handleEditProgramAction) {
    return showMenuFilter;
  }
  return false;
}

export function buildGraphqlGridColumns(
  columnsToShow: GraphqlGridColumn[],
  options: {
    selectable: boolean;
    areAllSelected: boolean;
    showMenuFilter: GraphqlGridColumnMenuFilter;
    listPeers: boolean;
    matchList: boolean;
    selectableOrdering: boolean;
    handleEditProgramAction: boolean;
    section: string;
  },
): GraphqlGridColumn[] {
  if (!options.selectable) {
    return columnsToShow;
  }

  return [
    {
      field: GRAPHQL_GRID_SELECTED_FIELD,
      title: "Edit",
      width: "75px",
      resizable: false,
      headerSelectionValue: options.areAllSelected,
      filter: "boolean",
      columnMenu: graphqlGridSelectableColumnMenu(options.showMenuFilter, {
        listPeers: options.listPeers,
        section: options.section,
        handleEditProgramAction: options.handleEditProgramAction,
      }),
      locked: true,
      headerClassName: graphqlGridSelectableHeaderClassName({
        listPeers: options.listPeers,
        selectableOrdering: options.selectableOrdering,
        matchList: options.matchList,
      }),
    },
    ...columnsToShow,
  ];
}

/**
 * Column visibility, reorder cache, default-columns reset, and column-menu
 * name stamping for CalculumGridGraphql.
 * Screen flags stay an options bag — not a domain column util.
 */
export function useGraphqlGridColumnCache(
  options: UseGraphqlGridColumnCacheOptions,
) {
  let keyCounter = 0;
  const getNextKey = () => {
    keyCounter++;
    return keyCounter;
  };

  const defaultColumns = ref<GraphqlGridColumn[]>(
    toValue(options.gridColumns),
  );
  const columnsToShow = ref<GraphqlGridColumn[]>(
    toValue(options.gridColumns),
  );
  const keyGrid = ref(getNextKey());
  const chooseColumnsKey = ref(getNextKey());
  const excludeColumnKey = ref(getNextKey());
  const harmonizationColumnKey = ref(getNextKey());
  const financingColumnKey = ref(getNextKey());

  function addNewTemplate() {
    stampGraphqlGridColumnMenus(defaultColumns.value);
  }

  const columns = computed(() =>
    buildGraphqlGridColumns(columnsToShow.value, {
      selectable: toValue(options.selectable),
      areAllSelected: toValue(options.areAllSelected),
      showMenuFilter: toValue(options.showMenuFilter),
      listPeers: toValue(options.listPeers),
      matchList: toValue(options.matchList),
      selectableOrdering: toValue(options.selectableOrdering),
      handleEditProgramAction: toValue(options.handleEditProgramAction),
      section: toValue(options.section),
    }),
  );

  function onColumnReorder(event: GraphqlGridColumnReorderEvent) {
    applyGraphqlGridColumnReorder(
      columnsToShow.value,
      event.columns,
      toValue(options.childrenColumns),
    );
  }

  function onSubmitColumnsMenu(columnsState: GraphqlGridColumn[]) {
    applyGraphqlGridColumnVisibility(
      columnsToShow.value,
      columnsState,
      toValue(options.childrenColumns),
    );
    options.emit("callbackOnSubmit", columnsState);
  }

  function resetDefaultColumns() {
    options.emit("reset-default-columns", toValue(options.levelOfGrid));
  }

  onMounted(() => {
    if (!toValue(options.hideMenuColumns)) {
      addNewTemplate();
    }
  });

  watch(
    () => toValue(options.filter),
    () => {
      excludeColumnKey.value++;
      harmonizationColumnKey.value++;
      financingColumnKey.value++;
    },
    { deep: true },
  );

  watch(
    () => toValue(options.gridColumns),
    (nextColumns) => {
      columnsToShow.value = nextColumns;
      chooseColumnsKey.value = getNextKey();
      if (!toValue(options.hideMenuColumns)) {
        addNewTemplate();
      }
    },
    { deep: true },
  );

  return {
    defaultColumns,
    columnsToShow,
    columns,
    keyGrid,
    chooseColumnsKey,
    excludeColumnKey,
    harmonizationColumnKey,
    financingColumnKey,
    onColumnReorder,
    onSubmitColumnsMenu,
    resetDefaultColumns,
  };
}
