import { computed, toValue, type MaybeRefOrGetter } from "vue";

/** Kendo `expand-field` name used by this GraphQL grid. */
export const GRAPHQL_GRID_EXPAND_FIELD = "expanded";

export type GraphqlGridExpandableItem = {
  expanded?: boolean;
  [key: string]: unknown;
};

export interface GraphqlGridExpandChangeEvent {
  dataItem: GraphqlGridExpandableItem;
  value: boolean;
  target: { $props: { expandField: string } };
}

export interface UseGraphqlGridExpandOptions {
  isExpanded: MaybeRefOrGetter<boolean | undefined>;
  nameTemplateChild: MaybeRefOrGetter<string | undefined>;
}

/**
 * Kendo expand-field binding: the field name when expand is on, otherwise undefined.
 */
export function graphqlGridExpandField(
  isExpanded: boolean | undefined,
): typeof GRAPHQL_GRID_EXPAND_FIELD | undefined {
  return isExpanded ? GRAPHQL_GRID_EXPAND_FIELD : undefined;
}

/**
 * Kendo detail template name when expand is on, otherwise undefined.
 * Empty string is preserved (matches the SFC default for `nameTemplateChild`).
 */
export function graphqlGridDetailName(
  isExpanded: boolean | undefined,
  nameTemplateChild: string | undefined,
): string | undefined {
  return isExpanded ? nameTemplateChild : undefined;
}

/**
 * Expand / detail mechanism for CalculumGridGraphql.
 * Named detail slots stay in the facade; this only binds expand-field / detail
 * name and writes `expanded` on the row.
 */
export function useGraphqlGridExpand(options: UseGraphqlGridExpandOptions) {
  const expandField = computed(() =>
    graphqlGridExpandField(toValue(options.isExpanded)),
  );

  const detailName = computed(() =>
    graphqlGridDetailName(
      toValue(options.isExpanded),
      toValue(options.nameTemplateChild),
    ),
  );

  function expandChange(event: GraphqlGridExpandChangeEvent) {
    event.dataItem[event.target.$props.expandField] = event.value;
  }

  return {
    expandField,
    detailName,
    expandChange,
  };
}
