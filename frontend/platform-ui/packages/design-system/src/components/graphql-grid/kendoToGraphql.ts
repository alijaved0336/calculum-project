import type { CompositeFilterDescriptor, FilterDescriptor } from "@progress/kendo-data-query";
import type { GraphqlGridFilterDescriptor, GraphqlGridSortDescriptor } from "./types";

// Maps Kendo's column-menu filter operators to HotChocolate's *OperationFilterInput operator
// names (StringOperationFilterInput / ComparableOperationFilterInput / BooleanOperationFilterInput)
// - the same operator names across every Ada backend's GraphQL schema, so this default is safe to
// share across any GraphqlGrid-backed grid rather than redefine per grid. Callers with a
// non-standard schema can still pass their own map to kendoFilterToGraphqlWhere.
export const KENDO_OPERATOR_TO_GRAPHQL: Record<string, string> = {
  eq: "eq",
  neq: "neq",
  contains: "contains",
  doesnotcontain: "ncontains",
  startswith: "startsWith",
  endswith: "endsWith",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
};

function isCompositeFilter(
  descriptor: FilterDescriptor | CompositeFilterDescriptor,
): descriptor is CompositeFilterDescriptor {
  return "filters" in descriptor;
}

function toGraphqlWhereLeaf(
  descriptor: FilterDescriptor,
  operatorMap: Record<string, string>,
): Record<string, unknown> | null {
  const operator = operatorMap[String(descriptor.operator)];
  if (!operator || typeof descriptor.field !== "string") return null;
  return { [descriptor.field]: { [operator]: descriptor.value } };
}

// Converts a Kendo CompositeFilterDescriptor (as produced by GraphqlGrid's column-menu filter, or
// a caller's own out-of-band filter) into the `where` object a HotChocolate *FilterInput expects.
// Returns null for an absent/empty filter so callers can omit `where` entirely rather than send a
// vacuous `{ and: [] }`.
export function kendoFilterToGraphqlWhere(
  filter: CompositeFilterDescriptor | undefined,
  operatorMap: Record<string, string> = KENDO_OPERATOR_TO_GRAPHQL,
): Record<string, unknown> | null {
  if (!filter?.filters.length) return null;

  const clauses = filter.filters
    .map((descriptor) =>
      isCompositeFilter(descriptor)
        ? kendoFilterToGraphqlWhere(descriptor, operatorMap)
        : toGraphqlWhereLeaf(descriptor, operatorMap),
    )
    .filter((clause): clause is Record<string, unknown> => clause !== null);

  if (!clauses.length) return null;
  return { [filter.logic === "or" ? "or" : "and"]: clauses };
}

// Converts Kendo's own sort descriptors into the `[{ field: "ASC" | "DESC" }]` shape a
// HotChocolate *SortInput expects.
export function kendoSortToGraphqlOrder(
  sort: GraphqlGridSortDescriptor[],
): Record<string, "ASC" | "DESC">[] {
  return sort.map((descriptor) => ({ [descriptor.field]: descriptor.dir === "desc" ? "DESC" : "ASC" }));
}

/**
 * Splits a Kendo filter in two by field, so predicates a `where` cannot express are handled
 * separately instead of being sent into it.
 *
 * <b>Why a split rather than a translation.</b> Some columns are not fields of the backend's filter
 * input at all — Ada's per-tenant custom attributes are deliberately not, because a schema whose
 * shape depended on what each tenant declared could not be cost-analysed or code-generated. Those
 * columns travel as arguments of the list field instead, which means the caller needs the two halves
 * apart before it builds anything.
 *
 * Returns both halves as composite filters carrying the ORIGINAL logic, and undefined for a half
 * with nothing in it. Nested composites are split recursively, and a nested group that ends up empty
 * on one side is dropped from that side rather than left as a vacuous `and: []`.
 *
 * <b>One caveat the caller owns:</b> a top-level `or` whose branches straddle the split cannot be
 * honoured by ANDing the halves back together, because "A or B" is not "A and B". Ada's grids build
 * one condition per column and AND them, so the case does not arise; a caller that can produce it
 * has to refuse rather than approximate.
 */
export function partitionFilterDescriptor(
  filter: CompositeFilterDescriptor | undefined,
  belongsToSecond: (field: string) => boolean,
): {
  first: GraphqlGridFilterDescriptor | undefined;
  second: GraphqlGridFilterDescriptor | undefined;
} {
  if (!filter?.filters.length) {
    return { first: undefined, second: undefined };
  }

  const firstClauses: (FilterDescriptor | CompositeFilterDescriptor)[] = [];
  const secondClauses: (FilterDescriptor | CompositeFilterDescriptor)[] = [];

  for (const descriptor of filter.filters) {
    if (isCompositeFilter(descriptor)) {
      const nested = partitionFilterDescriptor(descriptor, belongsToSecond);
      if (nested.first) firstClauses.push(nested.first);
      if (nested.second) secondClauses.push(nested.second);
      continue;
    }

    const field = typeof descriptor.field === "string" ? descriptor.field : "";
    (belongsToSecond(field) ? secondClauses : firstClauses).push(descriptor);
  }

  const logic = filter.logic === "or" ? "or" : "and";
  return {
    first: firstClauses.length ? { logic, filters: firstClauses } : undefined,
    second: secondClauses.length ? { logic, filters: secondClauses } : undefined,
  };
}

/** Every leaf descriptor of a composite filter, nested groups flattened. For a caller translating
 * them one at a time into something that is not a `where`. */
export function flattenFilterDescriptors(
  filter: CompositeFilterDescriptor | undefined,
): FilterDescriptor[] {
  if (!filter?.filters.length) {
    return [];
  }

  return filter.filters.flatMap((descriptor) =>
    isCompositeFilter(descriptor)
      ? flattenFilterDescriptors(descriptor)
      : [descriptor]);
}

// ANDs two composite filters together - either half can be absent/empty, so an empty composite is
// treated the same as undefined rather than being wrapped into a vacuous "and" that would still
// pass kendoFilterToGraphqlWhere's own `!filter?.filters.length` guard as a truthy-but-empty
// object. Useful for combining a grid's own column filter with an out-of-band filter (e.g. a
// chart-segment drill-down) before converting the result to a GraphQL `where`.
export function combineFilterDescriptors(
  a: GraphqlGridFilterDescriptor | undefined,
  b: GraphqlGridFilterDescriptor | undefined,
): GraphqlGridFilterDescriptor | undefined {
  const clauses = [a, b].filter((f): f is GraphqlGridFilterDescriptor => !!f?.filters?.length);
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { logic: "and", filters: clauses };
}
