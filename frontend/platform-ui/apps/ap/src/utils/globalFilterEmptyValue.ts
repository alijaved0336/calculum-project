/**
 * The global-filter "no value" marker, and the ordering rule that puts it first.
 *
 * Deliberately a leaf module with no imports. `globalFiltersUtils` pulls in the `@/types`
 * barrel, and components that only need the marker should not have to drag that graph in
 * with it — mounting one in isolation would hit an import cycle. `globalFiltersUtils`
 * re-exports both names, so existing call sites are unaffected.
 */

/**
 * Null marker the back end substitutes for NULL in every global-filter option list.
 *
 * Mirrors `AdaDataTypeBaseAttribute::DB_NULL_VALUE_REPLACER`. It travels back to the API
 * unchanged as the filter `key`, where `TelerikFilter` turns an `eq` on it into `IS NULL` —
 * so it must never be translated or rewritten on the way out, only on the way to the screen.
 */
export const GLOBAL_FILTER_EMPTY_VALUE = "-(empty)-";

/**
 * Returns the options with the {@link GLOBAL_FILTER_EMPTY_VALUE} marker moved to the front.
 *
 * The API orders option lists ASC and Postgres sorts NULLs last, so the marker always
 * arrives last. AB#20086 asks for it first instead, where it reads as "no value" rather
 * than as a stray entry after the real data. Every other option keeps its API order, and
 * the input array is left untouched.
 *
 * @param items - Checkbox/radio options as built by the `map*ArrayToItems` helpers
 * @returns A new array, marker first when present
 *
 * @example
 * sortEmptyValueFirst([{ value: 30 }, { value: "-(empty)-" }]);
 * // [{ value: "-(empty)-" }, { value: 30 }]
 */
export function sortEmptyValueFirst<T extends { value?: unknown }>(
  items: T[],
): T[] {
  const empty = items.filter((i) => i?.value === GLOBAL_FILTER_EMPTY_VALUE);
  if (empty.length === 0) return items;
  return [
    ...empty,
    ...items.filter((i) => i?.value !== GLOBAL_FILTER_EMPTY_VALUE),
  ];
}
