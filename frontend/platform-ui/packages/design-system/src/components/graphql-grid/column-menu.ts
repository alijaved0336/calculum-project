import type { ComputedRef, InjectionKey } from "vue";
import type { CompositeFilterDescriptor, FilterDescriptor } from "@progress/kendo-data-query";
import type {
  GraphqlGridColumnFilterType,
  GraphqlGridFilterDescriptor,
  GraphqlGridSortDescriptor,
} from "./types";

export type GraphqlGridFilterOperatorOption = {
  label: string;
  operator: string;
  needsValue: boolean;
};

export const GRAPHQL_GRID_FILTER_OPERATORS: Record<
  GraphqlGridColumnFilterType,
  GraphqlGridFilterOperatorOption[]
> = {
  text: [
    { label: "Contains", operator: "contains", needsValue: true },
    { label: "Equals", operator: "eq", needsValue: true },
    { label: "Starts with", operator: "startswith", needsValue: true },
    { label: "Ends with", operator: "endswith", needsValue: true },
    { label: "Is empty", operator: "isempty", needsValue: false },
    { label: "Is not empty", operator: "isnotempty", needsValue: false },
    { label: "Is null", operator: "isnull", needsValue: false },
    { label: "Is not null", operator: "isnotnull", needsValue: false },
  ],
  numeric: [
    { label: "Equals", operator: "eq", needsValue: true },
    { label: "Not equal", operator: "neq", needsValue: true },
    { label: "Greater than", operator: "gt", needsValue: true },
    { label: "Greater or equal", operator: "gte", needsValue: true },
    { label: "Less than", operator: "lt", needsValue: true },
    { label: "Less or equal", operator: "lte", needsValue: true },
  ],
  boolean: [
    { label: "Equals", operator: "eq", needsValue: true },
    { label: "Not equal", operator: "neq", needsValue: true },
  ],
  date: [
    { label: "Equals", operator: "eq", needsValue: true },
    { label: "After or equal", operator: "gte", needsValue: true },
    { label: "Before or equal", operator: "lte", needsValue: true },
  ],
};

export const GRAPHQL_GRID_BOOLEAN_FILTER_VALUES = ["True", "False"] as const;

export type GraphqlGridColumnMenuContext = {
  sort: ComputedRef<GraphqlGridSortDescriptor[]>;
  filter: ComputedRef<GraphqlGridFilterDescriptor | undefined>;
  isColumnSortable: (field: string) => boolean;
  allowUnsort: ComputedRef<boolean>;
  sortMode: ComputedRef<"single" | "multiple">;
  columnFilterType: (field: string) => GraphqlGridColumnFilterType;

  /**
   * The operators this column's menu may offer, or undefined for its filter type's full list.
   *
   * Exists so a column whose values the backend can only be asked about in certain ways does not
   * offer the others: a menu entry the caller cannot honour is a filter that either fails or is
   * silently dropped, and both are worse than not being there. The per-ordinal custom-attribute
   * filters are the case that needed it — their vocabulary has `contains` and `eq` but no
   * `startswith` or `endswith`.
   */
  columnFilterOperators: (field: string) => string[] | undefined;
  /** Header tooltip for `field`; empty/absent means no tooltip. */
  columnCustomTooltip: (field: string) => string | undefined;
  applySort: (field: string, dir: "asc" | "desc") => void;
  applyFilter: (field: string, operator: string, value: unknown) => void;
  clearFilter: (field: string) => void;
};

export const GRAPHQL_GRID_COLUMN_MENU_KEY: InjectionKey<GraphqlGridColumnMenuContext> =
  Symbol("graphqlGridColumnMenu");

function isComposite(
  value: FilterDescriptor | CompositeFilterDescriptor,
): value is CompositeFilterDescriptor {
  return Boolean(
    value &&
      typeof value === "object" &&
      "filters" in value &&
      Array.isArray(value.filters),
  );
}

export function findFieldFilter(
  filter: GraphqlGridFilterDescriptor | undefined,
  field: string,
): FilterDescriptor | undefined {
  if (!filter) {
    return undefined;
  }

  for (const item of filter.filters) {
    if (isComposite(item)) {
      const nested = findFieldFilter(item, field);
      if (nested) {
        return nested;
      }
      continue;
    }
    if (item.field === field) {
      return item;
    }
  }

  return undefined;
}

export function removeFieldFilter(
  filter: GraphqlGridFilterDescriptor | undefined,
  field: string,
): GraphqlGridFilterDescriptor | undefined {
  if (!filter) {
    return undefined;
  }

  const nextFilters: Array<FilterDescriptor | CompositeFilterDescriptor> = [];
  for (const item of filter.filters) {
    if (isComposite(item)) {
      const nested = removeFieldFilter(item, field);
      if (nested) {
        nextFilters.push(nested);
      }
      continue;
    }
    if (item.field !== field) {
      nextFilters.push(item);
    }
  }

  if (nextFilters.length === 0) {
    return undefined;
  }

  return { logic: filter.logic, filters: nextFilters };
}

export function upsertFieldFilter(
  filter: GraphqlGridFilterDescriptor | undefined,
  next: FilterDescriptor,
): GraphqlGridFilterDescriptor {
  const withoutField = removeFieldFilter(filter, String(next.field ?? ""));
  const base: GraphqlGridFilterDescriptor = withoutField ?? {
    logic: "and",
    filters: [],
  };

  return {
    logic: base.logic,
    filters: [...base.filters, next],
  };
}
