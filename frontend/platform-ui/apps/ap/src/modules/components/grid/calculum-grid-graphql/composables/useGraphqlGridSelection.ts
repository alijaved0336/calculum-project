import {
  computed,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";

/** Kendo `selected-field` name used by this GraphQL grid. */
export const GRAPHQL_GRID_SELECTED_FIELD = "selected";

export type GraphqlGridColumnMenuFilter =
  | false
  | "columnMenuTemplate"
  | "columnMenuTemplateActions";

export type GraphqlGridSelectableItem = {
  selected?: boolean;
  [key: string]: unknown;
};

export type GraphqlGridSelectionEmit = (
  event: "selectRow" | "selectAllRow",
  ...args: unknown[]
) => void;

export interface GraphqlGridHeaderSelectionEvent {
  event: { target: { checked: boolean } };
}

export interface GraphqlGridRowSelectionEvent {
  dataItem?: GraphqlGridSelectableItem;
  type?: unknown;
  target?: { tagName?: string; id?: string };
}

export interface UseGraphqlGridSelectionOptions {
  gridData: MaybeRefOrGetter<GraphqlGridSelectableItem[]>;
  section: MaybeRefOrGetter<string>;
  listPeers: MaybeRefOrGetter<boolean>;
  selectable: MaybeRefOrGetter<boolean>;
  showOptions: MaybeRefOrGetter<boolean>;
  selectableOrdering: MaybeRefOrGetter<boolean>;
  /** Shared with column menus / columns computed — parent owns the ref. */
  showMenuFilter: Ref<GraphqlGridColumnMenuFilter>;
  emit: GraphqlGridSelectionEmit;
}

/**
 * Next column-menu template after a header or row selection change.
 * `selectableOrdering` always keeps the filter menu; otherwise the actions
 * menu appears only while a selection is active.
 */
export function nextGraphqlGridShowMenuFilter(
  selectableOrdering: boolean,
  selectionActive: boolean,
): GraphqlGridColumnMenuFilter {
  if (selectableOrdering) {
    return "columnMenuTemplate";
  }
  return selectionActive ? "columnMenuTemplateActions" : false;
}

/**
 * Header checkbox state: every row is selected, or the grid is empty.
 * Matches the SFC's `!some(selected === false)` check.
 */
export function areGraphqlGridRowsAllSelected(
  selectable: boolean,
  gridData: GraphqlGridSelectableItem[],
): boolean {
  if (!selectable) {
    return false;
  }
  return !gridData.some((i) => i.selected === false);
}

/**
 * Row / header selection for CalculumGridGraphql.
 * Screen flags (`listPeers`, `section`, …) stay here — not a domain util.
 */
export function useGraphqlGridSelection(
  options: UseGraphqlGridSelectionOptions,
) {
  const selectedItems = ref<GraphqlGridSelectableItem[] | undefined>();
  const allSelected = ref(false);

  const areAllSelected = computed(() =>
    areGraphqlGridRowsAllSelected(
      toValue(options.selectable),
      toValue(options.gridData),
    ),
  );

  function applyShowMenuFilter(selectionActive: boolean) {
    if (!toValue(options.showOptions)) {
      return;
    }
    options.showMenuFilter.value = nextGraphqlGridShowMenuFilter(
      toValue(options.selectableOrdering),
      selectionActive,
    );
  }

  function onHeaderSelectionChange(event: GraphqlGridHeaderSelectionEvent) {
    const checked = event.event.target.checked;

    applyShowMenuFilter(checked);
    allSelected.value = checked;
    options.emit("selectAllRow", toValue(options.gridData), checked);
  }

  function onSelectionChange(event?: GraphqlGridRowSelectionEvent) {
    if (!event?.dataItem) {
      if (import.meta.env.DEV) {
        console.log("Grid selection event ignored - no dataItem available", {
          hasEvent: !!event,
          hasDataItem: !!event?.dataItem,
          gridDataLength: toValue(options.gridData)?.length || 0,
          eventType: event?.type,
          eventTarget: event?.target?.tagName,
          eventTargetId: event?.target?.id,
        });
      }
      return;
    }

    if (toValue(options.section) === "analyze") {
      return;
    }

    event.dataItem[GRAPHQL_GRID_SELECTED_FIELD] =
      !event.dataItem[GRAPHQL_GRID_SELECTED_FIELD];

    const itemsAdded = toValue(options.gridData).filter(
      (x) => x.selected === true,
    );

    if (itemsAdded.length > 0) {
      selectedItems.value = itemsAdded;
      allSelected.value = true;
    } else {
      selectedItems.value = [];
      allSelected.value = false;
    }

    applyShowMenuFilter(allSelected.value);

    if (toValue(options.listPeers)) {
      options.showMenuFilter.value = false;
      options.emit(
        "selectRow",
        event.dataItem,
        event.dataItem.selected,
      );
    } else {
      options.emit("selectRow", selectedItems.value);
    }
  }

  watch(
    () => toValue(options.gridData),
    () => {
      allSelected.value = false;
    },
    { deep: true },
  );

  return {
    selectedField: GRAPHQL_GRID_SELECTED_FIELD,
    selectedItems,
    allSelected,
    areAllSelected,
    onHeaderSelectionChange,
    onSelectionChange,
  };
}
