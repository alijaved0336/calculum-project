import { toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { filterGroupByField } from "@progress/kendo-vue-grid";
import type { ClientGridColumn } from "@/modules/components/grid/calculum-grid/composables/useClientGridColumnCache";
import type { ClientGridColumnMenuFilter } from "@/modules/components/grid/calculum-grid/composables/useClientGridSelection";

export type ClientGridColumnFilters = {
  filters?: unknown[];
  [key: string]: unknown;
} | null;

export type ClientGridColumnMenusEmit = (
  event:
    | "grid-exclude"
    | "grid-approach"
    | "grid-remove"
    | "grid-add-group"
    | "show-harmonization-modal"
    | "show-target-modal"
    | "grid-match-remove"
    | "negotiation-status-changed",
  ...args: unknown[]
) => void;

export interface UseClientGridColumnMenusOptions {
  childrenColumns: MaybeRefOrGetter<boolean>;
  columnsToShow: Ref<ClientGridColumn[]>;
  defaultColumns: Ref<ClientGridColumn[]>;
  allSelected: Ref<boolean>;
  /** Shared with selection / column cache — parent owns the ref. */
  showMenuFilter: Ref<ClientGridColumnMenuFilter>;
  levelOfGrid: MaybeRefOrGetter<string>;
  emit: ClientGridColumnMenusEmit;
}

/**
 * Find a leaf column by field. With `childrenColumns`, search grouped children
 * on `columnsToShow`; otherwise search `defaultColumns`.
 */
export function findClientGridColumnByField(
  columnsToShow: ClientGridColumn[],
  defaultColumns: ClientGridColumn[],
  childrenColumns: boolean,
  field: string,
): ClientGridColumn | undefined {
  if (childrenColumns) {
    for (const column of columnsToShow.filter((x) => x.children)) {
      const found = column.children?.find((child) => child.field === field);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  return defaultColumns.find((column) => column.field === field);
}

/**
 * Stamp header active/inactive for a filtered field, or clear all to inactive
 * when `field` is null.
 */
export function stampClientGridColumnHeaderFilterClass(
  columnsToShow: ClientGridColumn[],
  defaultColumns: ClientGridColumn[],
  childrenColumns: boolean,
  field: string | null,
  isActive: boolean,
) {
  if (field === null) {
    if (childrenColumns) {
      columnsToShow
        .filter((x) => x.children)
        .forEach((column) => {
          column.children?.forEach((columnChildren) => {
            columnChildren.headerClassName = "inactive";
          });
        });
    } else {
      defaultColumns.forEach((config) => {
        config.headerClassName = "inactive";
      });
    }
    return;
  }

  const changedColumn = findClientGridColumnByField(
    columnsToShow,
    defaultColumns,
    childrenColumns,
    field,
  );
  if (changedColumn) {
    changedColumn.headerClassName = isActive ? "active" : "inactive";
  }
}

/**
 * Thin column-menu helpers for CalculumGrid: header filter active class and
 * menu action emits. Local ColumnMenu stays on the facade; no unique-values API.
 */
export function useClientGridColumnMenus(
  options: UseClientGridColumnMenusOptions,
) {
  function closeColumnMenu() {
    options.showMenuFilter.value = false;
  }

  function clearSelectionAndMenu() {
    options.allSelected.value = false;
    closeColumnMenu();
  }

  function sendColumnFiltered(
    filters: ClientGridColumnFilters,
    columnFiltered: { field: string } | null,
  ) {
    if (filters !== null && columnFiltered) {
      const isColumnActive = filterGroupByField(
        columnFiltered.field,
        filters,
      );
      stampClientGridColumnHeaderFilterClass(
        options.columnsToShow.value,
        options.defaultColumns.value,
        toValue(options.childrenColumns),
        columnFiltered.field,
        !!isColumnActive,
      );
      return;
    }

    stampClientGridColumnHeaderFilterClass(
      options.columnsToShow.value,
      options.defaultColumns.value,
      toValue(options.childrenColumns),
      null,
      false,
    );
  }

  function gridExclude(action: unknown) {
    clearSelectionAndMenu();
    options.emit("grid-exclude", action);
  }

  function gridApproach(action: unknown) {
    clearSelectionAndMenu();
    options.emit("grid-approach", action);
  }

  function gridRemoveGroup(type: unknown) {
    clearSelectionAndMenu();
    options.emit("grid-remove", type);
  }

  function gridAddGroup(
    groupId: unknown,
    type: unknown,
    typeharmonization?: unknown,
  ) {
    clearSelectionAndMenu();
    options.emit("grid-add-group", groupId, type, typeharmonization);
  }

  function closeHarmonizationModal(
    level: unknown,
    uuids?: unknown,
    entityType?: unknown,
  ) {
    options.emit("show-harmonization-modal", level, uuids, entityType);
  }

  function gridMatchRemove() {
    options.emit("grid-match-remove");
  }

  function showTargetModal(_levelOfGrid?: unknown) {
    options.emit("show-target-modal", toValue(options.levelOfGrid));
  }

  function negotiationStatusOnChanged(negotiationStatus: unknown) {
    clearSelectionAndMenu();
    options.emit("negotiation-status-changed", negotiationStatus);
  }

  return {
    sendColumnFiltered,
    gridExclude,
    gridApproach,
    gridRemoveGroup,
    gridAddGroup,
    closeHarmonizationModal,
    gridMatchRemove,
    showTargetModal,
    negotiationStatusOnChanged,
  };
}
