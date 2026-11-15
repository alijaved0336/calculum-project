import {
  computed,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import {
  CLIENT_GRID_SELECTED_FIELD,
  type ClientGridColumnMenuFilter,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridSelection";

export const CLIENT_GRID_COLUMN_MENU_TEMPLATE = "columnMenuTemplate";

export const CLIENT_GRID_SELECTABLE_HEADER_CLASS = {
  compare: "filter-options-compare",
  match: "filter-match-options",
  default: "filter-options",
} as const;

export type ClientGridColumn = {
  field?: string;
  title?: string;
  children?: ClientGridColumn[];
  columnMenu?: ClientGridColumnMenuFilter;
  filterable?: boolean;
  sortable?: boolean;
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

export interface ClientGridColumnReorderEvent {
  columns: ClientGridColumn[];
}

export type ClientGridColumnCacheEmit = (
  event: "reset-default-columns",
  ...args: unknown[]
) => void;

export interface UseClientGridColumnCacheOptions {
  gridColumns: MaybeRefOrGetter<ClientGridColumn[]>;
  childrenColumns: MaybeRefOrGetter<boolean>;
  hideMenuColumns: MaybeRefOrGetter<boolean>;
  selectable: MaybeRefOrGetter<boolean>;
  areAllSelected: MaybeRefOrGetter<boolean>;
  showMenuFilter: MaybeRefOrGetter<ClientGridColumnMenuFilter>;
  compareList: MaybeRefOrGetter<boolean>;
  matchList: MaybeRefOrGetter<boolean>;
  selectableOrdering: MaybeRefOrGetter<boolean>;
  levelOfGrid: MaybeRefOrGetter<string>;
  emit: ClientGridColumnCacheEmit;
}

/**
 * Stamp Kendo `columnMenu` names from `sortable` (client grid behavior).
 */
export function stampClientGridColumnMenus(columns: ClientGridColumn[]) {
  for (const row of columns) {
    row.columnMenu = (row.sortable ?? true)
      ? CLIENT_GRID_COLUMN_MENU_TEMPLATE
      : false;
  }
}

/**
 * Copy Kendo reorder ids onto the cached columns.
 * With `childrenColumns`, only grouped children are updated (match parent by title).
 * Without it, match by field.
 */
export function applyClientGridColumnReorder(
  columnsToShow: ClientGridColumn[],
  reorderedColumns: ClientGridColumn[],
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

/**
 * Apply column-selector visibility. Match by field only (client grid behavior).
 */
export function applyClientGridColumnVisibility(
  columnsToShow: ClientGridColumn[],
  columnsState: ClientGridColumn[],
  childrenColumns: boolean,
) {
  if (childrenColumns) {
    columnsToShow
      .filter((column) => column.children)
      .forEach((column) => {
        column.children?.forEach((columnChild) => {
          const state = columnsState.filter(
            (item) => item.field === columnChild.field,
          );
          if (state.length > 0) {
            columnChild.hidden = state[0].hidden;
          }
        });
      });
    return;
  }

  columnsToShow.forEach((column) => {
    const state = columnsState.filter((item) => item.field === column.field);
    if (state.length > 0) {
      column.hidden = state[0].hidden;
    }
  });
}

/**
 * Selectable-column header class. `compareList` keeps an empty class
 * (legacy `addClass` was always false).
 */
export function clientGridSelectableHeaderClassName(context: {
  compareList: boolean;
  selectableOrdering: boolean;
  matchList: boolean;
}): string {
  if (context.compareList) {
    return "";
  }
  if (context.selectableOrdering) {
    return "";
  }
  if (context.matchList) {
    return CLIENT_GRID_SELECTABLE_HEADER_CLASS.match;
  }
  return CLIENT_GRID_SELECTABLE_HEADER_CLASS.default;
}

export function buildClientGridColumns(
  columnsToShow: ClientGridColumn[],
  options: {
    selectable: boolean;
    areAllSelected: boolean;
    showMenuFilter: ClientGridColumnMenuFilter;
    compareList: boolean;
    matchList: boolean;
    selectableOrdering: boolean;
  },
): ClientGridColumn[] {
  if (!options.selectable) {
    return columnsToShow;
  }

  return [
    {
      field: CLIENT_GRID_SELECTED_FIELD,
      title: "Edit",
      width: "75px",
      resizable: false,
      headerSelectionValue: options.areAllSelected,
      filter: "boolean",
      columnMenu: options.showMenuFilter,
      locked: true,
      headerClassName: clientGridSelectableHeaderClassName({
        compareList: options.compareList,
        selectableOrdering: options.selectableOrdering,
        matchList: options.matchList,
      }),
    },
    ...columnsToShow,
  ];
}

/**
 * Column visibility, reorder cache, default-columns reset, and column-menu
 * name stamping for CalculumGrid.
 * Screen flags stay an options bag — not a domain column util.
 * No GraphQL unique-values remount keys.
 */
export function useClientGridColumnCache(
  options: UseClientGridColumnCacheOptions,
) {
  let keyCounter = 0;
  const getNextKey = () => {
    keyCounter++;
    return keyCounter;
  };

  const initialColumns = toValue(options.gridColumns);
  const defaultColumns = ref<ClientGridColumn[]>(initialColumns);
  const columnsToShow = ref<ClientGridColumn[]>(initialColumns);
  const chooseColumnsKey = ref(getNextKey());

  function addNewTemplate() {
    stampClientGridColumnMenus(defaultColumns.value);
  }

  const columns = computed(() =>
    buildClientGridColumns(columnsToShow.value, {
      selectable: toValue(options.selectable),
      areAllSelected: toValue(options.areAllSelected),
      showMenuFilter: toValue(options.showMenuFilter),
      compareList: toValue(options.compareList),
      matchList: toValue(options.matchList),
      selectableOrdering: toValue(options.selectableOrdering),
    }),
  );

  function onColumnReorder(event: ClientGridColumnReorderEvent) {
    applyClientGridColumnReorder(
      columnsToShow.value,
      event.columns,
      toValue(options.childrenColumns),
    );
  }

  function onSubmitColumnsMenu(columnsState: ClientGridColumn[]) {
    applyClientGridColumnVisibility(
      columnsToShow.value,
      columnsState,
      toValue(options.childrenColumns),
    );
  }

  function resetDefaultColumns() {
    options.emit("reset-default-columns", toValue(options.levelOfGrid));
  }

  onMounted(() => {
    if (!toValue(options.childrenColumns) && !toValue(options.hideMenuColumns)) {
      addNewTemplate();
    }
  });

  watch(
    () => toValue(options.gridColumns),
    (nextColumns) => {
      columnsToShow.value = nextColumns;
      chooseColumnsKey.value = getNextKey();
    },
    { deep: true },
  );

  return {
    defaultColumns,
    columnsToShow,
    columns,
    chooseColumnsKey,
    onColumnReorder,
    onSubmitColumnsMenu,
    resetDefaultColumns,
  };
}
