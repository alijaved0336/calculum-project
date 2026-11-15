import {
  computed,
  ref,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";

/** Kendo `selected-field` name used by the client CalculumGrid. */
export const CLIENT_GRID_SELECTED_FIELD = "selected";

export const CLIENT_GRID_ADMIN_UPLOAD_SPEND_FILES = "AdminUploadSpendFiles";

export type ClientGridColumnMenuFilter =
  | false
  | ""
  | "columnMenuTemplate"
  | "columnMenuTemplateActions"
  | "columnMenuActionsAdminConsoleSpendFile";

export type ClientGridSelectableItem = {
  selected?: boolean;
  "@id"?: unknown;
  [key: string]: unknown;
};

export type ClientGridSelectionEmit = (
  event: "selectRow" | "selectAllRow" | "check-only-one",
  ...args: unknown[]
) => void;

export interface ClientGridHeaderSelectionEvent {
  event: { target: { checked: boolean } };
}

export interface ClientGridRowSelectionEvent {
  dataItem?: ClientGridSelectableItem;
  type?: unknown;
  target?: { tagName?: string; id?: string };
}

export interface ClientGridDataResult {
  data: ClientGridSelectableItem[];
  total: number;
}

export interface UseClientGridSelectionOptions {
  gridData: MaybeRefOrGetter<ClientGridSelectableItem[] | null | undefined>;
  /** Page / processed rows — header select mutates `.data` in place. */
  dataResult: MaybeRefOrGetter<ClientGridDataResult>;
  filterSelected: Ref<boolean>;
  filterData: Ref<unknown>;
  compareList: MaybeRefOrGetter<boolean>;
  editList: MaybeRefOrGetter<boolean | undefined>;
  forCompareAddCompany: MaybeRefOrGetter<boolean | undefined>;
  forAdminDataChange: MaybeRefOrGetter<boolean | undefined>;
  forLastPaymentTermsCheck: MaybeRefOrGetter<boolean | undefined>;
  selectable: MaybeRefOrGetter<boolean>;
  selectableOrdering: MaybeRefOrGetter<boolean>;
  matchList: MaybeRefOrGetter<boolean>;
  columnsLocalName: MaybeRefOrGetter<string>;
  /** Shared with column menus / columns computed — parent owns the ref. */
  showMenuFilter: Ref<ClientGridColumnMenuFilter>;
  emit: ClientGridSelectionEmit;
}

/**
 * Next column-menu template after a header or row selection change.
 * `selectableOrdering` always keeps the filter menu; otherwise the actions
 * menu appears only while a selection is active.
 */
export function nextClientGridShowMenuFilter(
  selectableOrdering: boolean,
  selectionActive: boolean,
): ClientGridColumnMenuFilter {
  if (selectableOrdering) {
    return "columnMenuTemplate";
  }
  return selectionActive ? "columnMenuTemplateActions" : false;
}

/**
 * Header checkbox state: every row on the current page is selected, or empty.
 * True when no row has `selected === false` (empty page counts as all selected).
 */
export function areClientGridRowsAllSelected(
  selectable: boolean,
  pageRows: ClientGridSelectableItem[],
): boolean {
  if (!selectable) {
    return false;
  }
  return !pageRows.some((item) => item.selected === false);
}

/**
 * Row / header selection for CalculumGrid (client process mode).
 * Screen flags stay here — not a domain util. Do not import GraphQL selection.
 */
export function useClientGridSelection(
  options: UseClientGridSelectionOptions,
) {
  const selectedItems = ref<ClientGridSelectableItem[] | null | undefined>();
  const allSelected = ref(false);

  const areAllSelected = computed(() =>
    areClientGridRowsAllSelected(
      toValue(options.selectable),
      toValue(options.dataResult).data,
    ),
  );

  function onHeaderSelectionChange(event: ClientGridHeaderSelectionEvent) {
    const checked = event.event.target.checked;

    options.showMenuFilter.value = nextClientGridShowMenuFilter(
      toValue(options.selectableOrdering),
      checked,
    );

    if (toValue(options.matchList)) {
      options.showMenuFilter.value = "";
    }

    if (toValue(options.columnsLocalName) === CLIENT_GRID_ADMIN_UPLOAD_SPEND_FILES) {
      options.showMenuFilter.value =
        "columnMenuActionsAdminConsoleSpendFile";
    }

    const dataResult = toValue(options.dataResult);
    dataResult.data = dataResult.data.map((item) => {
      return { ...item, selected: checked };
    });

    if (toValue(options.compareList)) {
      options.showMenuFilter.value = false;
      options.emit("selectAllRow", dataResult.data, checked);
      return;
    }

    allSelected.value = checked;

    if (options.filterSelected.value) {
      options.emit("selectAllRow", options.filterData.value, checked);
      return;
    }

    if (
      toValue(options.forCompareAddCompany) &&
      !toValue(options.forLastPaymentTermsCheck)
    ) {
      options.emit("selectAllRow", true);
    } else if (toValue(options.forAdminDataChange)) {
      options.emit("selectAllRow", toValue(options.gridData), checked);
    } else if (
      toValue(options.forCompareAddCompany) &&
      toValue(options.forLastPaymentTermsCheck)
    ) {
      options.emit("check-only-one");
    } else {
      options.emit("selectAllRow", toValue(options.gridData), checked);
    }
  }

  function onSelectionChange(event?: ClientGridRowSelectionEvent) {
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

    if (toValue(options.compareList)) {
      options.emit("selectRow", event.dataItem);
    } else if (toValue(options.editList)) {
      event.dataItem[CLIENT_GRID_SELECTED_FIELD] =
        !event.dataItem[CLIENT_GRID_SELECTED_FIELD];
      const itemsAdded = (toValue(options.gridData) ?? []).filter(
        (x) => x.selected === true,
      );

      if (itemsAdded.length > 0) {
        selectedItems.value = itemsAdded;
        allSelected.value = true;
      } else {
        selectedItems.value = [];
        allSelected.value = false;
      }

      options.showMenuFilter.value = nextClientGridShowMenuFilter(
        toValue(options.selectableOrdering),
        allSelected.value,
      );

      options.emit("selectRow", selectedItems.value);
    } else if (
      toValue(options.forCompareAddCompany) ||
      toValue(options.forAdminDataChange)
    ) {
      if (event.dataItem.selected) {
        options.emit("selectRow", event.dataItem, false);
      } else {
        options.emit("selectRow", event.dataItem, true);
      }
    } else if (event.dataItem?.["@id"]) {
      options.emit(
        "selectRow",
        event.dataItem["@id"],
        !event.dataItem[CLIENT_GRID_SELECTED_FIELD],
      );
    } else if (event.dataItem) {
      event.dataItem[CLIENT_GRID_SELECTED_FIELD] =
        !event.dataItem[CLIENT_GRID_SELECTED_FIELD];
      const itemsAdded = (toValue(options.gridData) ?? []).filter(
        (x) => x.selected === true,
      );
      if (itemsAdded.length > 0) {
        selectedItems.value = itemsAdded;
        options.showMenuFilter.value = "";
        allSelected.value = true;
      } else {
        options.showMenuFilter.value = false;
        selectedItems.value = [];
        allSelected.value = false;
      }

      if (
        toValue(options.columnsLocalName) === CLIENT_GRID_ADMIN_UPLOAD_SPEND_FILES
      ) {
        options.showMenuFilter.value =
          "columnMenuActionsAdminConsoleSpendFile";
      }
      options.emit("selectRow", selectedItems.value);
    }
  }

  return {
    selectedField: CLIENT_GRID_SELECTED_FIELD,
    selectedItems,
    allSelected,
    areAllSelected,
    onHeaderSelectionChange,
    onSelectionChange,
  };
}
