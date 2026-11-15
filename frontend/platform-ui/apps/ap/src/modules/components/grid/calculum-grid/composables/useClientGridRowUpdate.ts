import type { Ref } from "vue";

export type ClientGridRowUpdateEmit = (
  event: "update-row-data-parent" | "update-row-data-notes",
  ...args: unknown[]
) => void;

export interface UseClientGridRowUpdateOptions {
  /** Parent-owned column-menu visibility; cleared before parent update. */
  showMenuFilter: Ref<boolean | string>;
  emit: ClientGridRowUpdateEmit;
}

/**
 * Row data update toward parent for CalculumGrid.
 * Clears column-menu filter chrome then emits.
 */
export function useClientGridRowUpdate(
  options: UseClientGridRowUpdateOptions,
) {
  function updaterowData(records: unknown, type: unknown) {
    options.showMenuFilter.value = false;
    options.emit("update-row-data-parent", records, type);
  }

  function updateRowDataNotes(records: unknown, type: unknown) {
    options.showMenuFilter.value = false;
    options.emit("update-row-data-notes", records, type);
  }

  return {
    updaterowData,
    updateRowDataNotes,
  };
}
