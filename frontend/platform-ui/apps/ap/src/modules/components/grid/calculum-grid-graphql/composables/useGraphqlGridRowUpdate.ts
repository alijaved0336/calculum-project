import type { Ref } from "vue";

export type GraphqlGridRowUpdateEmit = (
  event: "update-row-data-parent",
  ...args: unknown[]
) => void;

export interface UseGraphqlGridRowUpdateOptions {
  /** Parent-owned column-menu visibility; cleared before parent update. */
  showMenuFilter: Ref<boolean | string>;
  emit: GraphqlGridRowUpdateEmit;
}

/**
 * Row data update toward parent for CalculumGridGraphql.
 * Clears column-menu filter chrome then emits.
 */
export function useGraphqlGridRowUpdate(
  options: UseGraphqlGridRowUpdateOptions,
) {
  function updaterowData(records: unknown, type: unknown) {
    options.showMenuFilter.value = false;
    options.emit("update-row-data-parent", records, type);
  }

  return {
    updaterowData,
  };
}
