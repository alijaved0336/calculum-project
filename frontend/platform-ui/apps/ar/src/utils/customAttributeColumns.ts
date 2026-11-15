import {
  isGraphqlGridColumnGroup,
  type GraphqlGridColumn,
  type GraphqlGridColumnOrGroup,
} from "@ada/design-system/components/graphql-grid/types";
import * as globalColumns from "@ada/design-system/data/globalColumns";
import type { CustomAttributeDefinition } from "@/api";

/**
 * The grid side of a tenant's custom attributes, shared by every AR grid that shows them.
 *
 * <b>Static columns, dynamic titles.</b> A grid declares twenty `customDataPointN` columns up front
 * and the tenant's schema fills in their titles and decides which are worth showing. The alternative
 * — building columns from the declarations — would make the column set change shape between renders,
 * which is what the Kendo parentIndex cycle bug came from (see matchGridColumnCycle.spec.ts).
 */

/** The grid field a declaration's ordinal addresses. The ordinal is the only identity the API speaks;
 * which physical slot holds it is the server's business. */
export function customDataPointField(ordinal: number): string {
  return `customDataPoint${ordinal}`;
}

/** Whether a grid column's field is one of the tenant's custom attributes rather than a schema
 * field — the test the filter split is driven by. */
export function isCustomDataPointField(field: string): boolean {
  return /^customDataPoint\d+$/.test(field);
}

/**
 * The operators a per-ordinal filter accepts, as the column menu should offer them.
 *
 * The text menu's full list minus `startswith` and `endswith`, which the ordinal vocabulary has no
 * equivalent for. Offering an operator nothing can honour is the same defect as a dropdown entry
 * that answers 400, so the refusal belongs in the menu rather than in the response.
 */
export const CUSTOM_ATTRIBUTE_FILTER_OPERATORS = [
  "contains", "eq", "isempty", "isnotempty", "isnull", "isnotnull",
];

/** The twenty static columns, ready to be grouped under one header. Ordinals 21-26 exist on the
 * backend as numeric attributes and are not offered yet. */
function customDataPointColumns(): GraphqlGridColumn[] {
  return ([
    ...globalColumns.customDataPoint1,
    ...globalColumns.customDataPoint2,
    ...globalColumns.customDataPoint3,
    ...globalColumns.customDataPoint4,
    ...globalColumns.customDataPoint5,
    ...globalColumns.customDataPoint6,
    ...globalColumns.customDataPoint7,
    ...globalColumns.customDataPoint8,
    ...globalColumns.customDataPoint9,
    ...globalColumns.customDataPoint10,
    ...globalColumns.customDataPoint11,
    ...globalColumns.customDataPoint12,
    ...globalColumns.customDataPoint13,
    ...globalColumns.customDataPoint14,
    ...globalColumns.customDataPoint15,
    ...globalColumns.customDataPoint16,
    ...globalColumns.customDataPoint17,
    ...globalColumns.customDataPoint18,
    ...globalColumns.customDataPoint19,
    ...globalColumns.customDataPoint20,
  ] as GraphqlGridColumn[]).map((column) => ({
    ...column,
    // Filterable, but NOT through the GraphQL `where`: these are not fields of any filter input, so
    // their predicates leave the filter before one is built and travel as the list field's own
    // per-ordinal argument. See partitionFilterDescriptor and each grid's own data layer.
    filterOperators: CUSTOM_ATTRIBUTE_FILTER_OPERATORS,
  }));
}

/** One "Custom Attributes" group of twenty columns, titled by the caller because each screen names
 * it in its own i18n namespace. */
export function customAttributeColumnGroup(title: string): GraphqlGridColumnOrGroup {
  return {
    title,
    resizable: false,
    // The GROUP header has nothing of its own to sort or filter by; its children each carry their own.
    columnMenu: false,
    children: customDataPointColumns(),
  };
}

/**
 * The same twenty columns as customAttributeColumnGroup, flat rather than grouped - the flat
 * grids (Opportunity, 9 Boxes, Waterfall, Entity Card) keep no group headers at all. It was first
 * done to keep their footer totals alive: GraphqlGrid used to strip every footer from a grouped
 * grid (WI#18884). It no longer has to (see visibleGraphqlGridColumns in graphql-grid/types.ts),
 * so this is now only about those grids staying flat.
 *
 * GraphqlGridColumnSelector already flattens groups down to individual checkboxes for its own
 * list (see its own `leafColumns`), so this loses nothing there - only the native 2-level
 * "Custom Attributes" header band in the live grid, in exchange for a totals footer that isn't
 * one visible custom attribute away from silently disappearing.
 */
export function customAttributeColumns(): GraphqlGridColumn[] {
  return customDataPointColumns();
}

function applyDefinition(
  column: GraphqlGridColumn, definition: CustomAttributeDefinition,
): GraphqlGridColumn {
  return {
    ...column,
    title: definition.title,
    // Only shown by default once the tenant has actually filled it in for this version — an
    // attribute declared but never supplied stays hidden until the user opts in via the column
    // selector, same as any other optional column.
    hidden: !definition.hasData,
  };
}

/** #21145: a column the tenant never named goes back to its static title, hidden. */
function unnamedColumn(column: GraphqlGridColumn): GraphqlGridColumn {
  const title = customDataPointColumns().find((candidate) => candidate.field === column.field)?.title;
  return { ...column, title: title ?? column.title, hidden: true };
}

function mapLeaves(
  columns: GraphqlGridColumnOrGroup[],
  map: (column: GraphqlGridColumn) => GraphqlGridColumn,
): GraphqlGridColumnOrGroup[] {
  return columns.map((column) =>
    isGraphqlGridColumnGroup(column)
      ? { ...column, children: column.children.map(map) }
      : map(column));
}

/**
 * Applies the backend's per-version schema onto a grid's static custom columns.
 *
 * A definition with no matching column (an ordinal beyond the twenty a grid declares) is silently
 * skipped. A column with no matching definition has no custom name - the backend never declares an
 * unnamed Custom Data Point - so it is hidden under its static title (#21145), which also drops a
 * title and visibility the previous version's schema had given it.
 */
export function applyCustomAttributeDefinitions(
  columns: GraphqlGridColumnOrGroup[],
  definitions: CustomAttributeDefinition[],
): GraphqlGridColumnOrGroup[] {
  const definitionByField = new Map(
    definitions.map((definition) => [customDataPointField(definition.ordinal), definition]));

  return mapLeaves(columns, (column) => {
    const definition = definitionByField.get(column.field);
    if (definition) return applyDefinition(column, definition);
    return isCustomDataPointField(column.field) ? unnamedColumn(column) : column;
  });
}

/**
 * Hides the unnamed custom columns again after a saved column preference was merged in, so a
 * snapshot taken while one was shown does not bring it back (#21145). Named columns keep the
 * analyst's saved choice.
 */
export function hideUnnamedCustomAttributes(
  columns: GraphqlGridColumnOrGroup[],
  definitions: CustomAttributeDefinition[],
): GraphqlGridColumnOrGroup[] {
  const named = new Set(definitions.map((definition) => customDataPointField(definition.ordinal)));
  return mapLeaves(columns, (column) =>
    isCustomDataPointField(column.field) && !named.has(column.field) ? { ...column, hidden: true } : column);
}

/**
 * The operators a per-ordinal filter accepts, keyed by the Kendo operator that maps to it.
 *
 * NARROWER than the schema-field vocabulary in two ways that matter, which is why this map exists
 * rather than reusing KENDO_OPERATOR_TO_GRAPHQL: the backend spells not-equals `ne` where a
 * *OperationFilterInput spells it `neq`, and it has no `startswith`/`endswith` at all. The column
 * menu is narrowed to these same operators (see graphqlColumns.ts), so an unmapped one cannot be
 * produced by the UI — and if one ever arrives anyway it is refused rather than dropped, because a
 * filter silently ignored is a grid showing more rows than the user asked for.
 */
const KENDO_OPERATOR_TO_ORDINAL: Record<string, string> = {
  contains: "contains",
  eq: "eq",
  neq: "ne",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  isnull: "isnull",
  isnotnull: "isnotnull",
  // Kendo's "is empty" over a text column asks the same question the backend's isnull does: a
  // supplied blank is stored as the empty string and its IsBlank predicate covers both.
  isempty: "isnull",
  isnotempty: "isnotnull",
};

export interface CustomAttributeGridFilter {
  ordinal: number;
  op: string;
  value?: string | null;
}

/**
 * Turns the custom-attribute half of a grid filter into the field's own `customFilters` argument.
 *
 * The ordinal comes from the column's field name, which is the only place it appears on this side —
 * `customDataPoint12` is column 12, and the server resolves that to the tenant's declaration or
 * refuses with a 400 naming what it does declare.
 */
export function toCustomAttributeFilters(
  // Kendo types `field` as `string | Function` — a function descriptor is meaningless here, and the
  // guard below treats it as an unnamed column rather than pretending it could be one.
  descriptors: { field?: string | Function; operator?: unknown; value?: unknown }[],
): CustomAttributeGridFilter[] {
  return descriptors.map((descriptor) => {
    const field = typeof descriptor.field === "string" ? descriptor.field : "";
    const ordinal = Number(field.replace("customDataPoint", ""));
    const op = KENDO_OPERATOR_TO_ORDINAL[String(descriptor.operator)];

    if (!Number.isInteger(ordinal) || op === undefined) {
      throw new Error(
        `Cannot filter ${field || "an unnamed column"} by '${String(descriptor.operator)}': `
        + `a custom attribute accepts ${Object.keys(KENDO_OPERATOR_TO_ORDINAL).join(", ")}.`);
    }

    return { ordinal, op, value: toFilterValueString(descriptor.value, field) };
  });
}

/**
 * A value-less operator sends none: the server's isnull/isnotnull ignore it, and sending an empty
 * string instead would read as "equals blank" to anyone reading the request.
 *
 * Rejects a non-primitive value explicitly rather than letting `String()` silently stringify it to
 * `"[object Object]"` — Kendo's own filter descriptors never carry one for a custom attribute (text/
 * number/boolean/date, same as `CUSTOM_ATTRIBUTE_FILTER_OPERATORS` above), so seeing one here means
 * something upstream is already wrong and should fail loudly instead of sending a nonsense value.
 */
function toFilterValueString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  throw new Error(`Cannot filter ${field || "an unnamed column"} by a non-primitive value.`);
}

