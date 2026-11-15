import { filterGroupByField } from "@progress/kendo-vue-grid";
import { toValue, type MaybeRefOrGetter } from "vue";

export type ClientGridFilterColumn = {
  field?: string;
  headerClassName?: string;
  [key: string]: unknown;
};

export interface UseClientGridFilterChangeOptions {
  columns: MaybeRefOrGetter<ClientGridFilterColumn[]>;
  setFilterAndReprocess: (filter: unknown) => void;
}

/**
 * Column-menu filter change: toggles header active class then reprocesses.
 */
export function useClientGridFilterChange(
  options: UseClientGridFilterChangeOptions,
) {
  function onFilterChange(event: {
    event: { field: string };
    filter: unknown;
  }) {
    const isColumnActive = filterGroupByField(
      event.event.field,
      event.filter,
    );
    const columns = toValue(options.columns);
    const changedColumn = columns.find(
      (column) => column.field === event.event.field,
    );

    if (changedColumn) {
      changedColumn.headerClassName = isColumnActive ? "active" : "";
    }

    options.setFilterAndReprocess(event.filter);
  }

  return {
    onFilterChange,
  };
}
