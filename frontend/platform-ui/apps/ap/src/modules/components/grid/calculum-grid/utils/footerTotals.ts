import { process } from "@progress/kendo-data-query";
import { isClientGridFilterApplied } from "@/modules/components/grid/calculum-grid/composables/useClientGridProcess";

/**
 * Rows the footer totals add up (WI#20545, opt-in). With `followsFilter` they are the
 * rows the current filter leaves, across every page, computed from the live grid data
 * so a refreshed list keeps them current. Without it, or with no filter applied, the
 * whole list — which is what every grid did before.
 */
export function resolveFooterDataSet<T>(
  gridData: T[],
  filter: unknown,
  followsFilter: boolean,
): T[] {
  if (!followsFilter || !isClientGridFilterApplied(filter)) {
    return gridData;
  }
  return process(gridData, { filter: filter as never }).data as T[];
}

type FooterColumn = {
  field?: string;
  footerWeightField?: string;
  children?: FooterColumn[];
  [key: string]: unknown;
};

/**
 * The field a column's weighted-average total weights by (`footerWeightField`), also
 * inside grouped columns. Undefined when the column sets none, so every existing grid
 * keeps weighting by spend_volume / volume.
 */
export function findFooterWeightField(
  columns: readonly unknown[] | null | undefined,
  field: string,
): string | undefined {
  for (const column of (columns ?? []) as readonly FooterColumn[]) {
    if (column.field === field && column.footerWeightField) {
      return column.footerWeightField;
    }
    const nested = findFooterWeightField(column.children, field);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}
