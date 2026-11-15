import { computed, toValue, type MaybeRefOrGetter } from "vue";

/** Kendo `expand-field` name used by this client grid. */
export const CLIENT_GRID_EXPAND_FIELD = "expanded";

export type ClientGridExpandableItem = {
  expanded?: boolean;
  [key: string]: unknown;
};

export interface ClientGridExpandChangeEvent {
  dataItem: ClientGridExpandableItem;
  value: boolean;
  target: { $props: { expandField: string } };
}

export interface UseClientGridExpandOptions {
  isExpanded: MaybeRefOrGetter<boolean | undefined>;
  nameTemplateChild: MaybeRefOrGetter<string | undefined>;
}

/**
 * Kendo expand-field binding: the field name when expand is on, otherwise undefined.
 */
export function clientGridExpandField(
  isExpanded: boolean | undefined,
): typeof CLIENT_GRID_EXPAND_FIELD | undefined {
  return isExpanded ? CLIENT_GRID_EXPAND_FIELD : undefined;
}

/**
 * Kendo detail template name when expand is on, otherwise undefined.
 * Empty string is preserved (matches the SFC default for `nameTemplateChild`).
 */
export function clientGridDetailName(
  isExpanded: boolean | undefined,
  nameTemplateChild: string | undefined,
): string | undefined {
  return isExpanded ? nameTemplateChild : undefined;
}

/**
 * Expand / detail mechanism for CalculumGrid.
 * Named detail slots stay in the facade; this only binds expand-field / detail
 * name and writes `expanded` on the row.
 *
 * Near-identical to useGraphqlGridExpand — optional shared helper later, not this PR.
 */
export function useClientGridExpand(options: UseClientGridExpandOptions) {
  const expandField = computed(() =>
    clientGridExpandField(toValue(options.isExpanded)),
  );

  const detailName = computed(() =>
    clientGridDetailName(
      toValue(options.isExpanded),
      toValue(options.nameTemplateChild),
    ),
  );

  function expandChange(event: ClientGridExpandChangeEvent) {
    event.dataItem[event.target.$props.expandField] = event.value;
  }

  return {
    expandField,
    detailName,
    expandChange,
  };
}
