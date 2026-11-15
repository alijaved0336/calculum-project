/**
 * True when any grid row has `selected === true` (compare-list clear button).
 */

export type SelectableGridItem = {
  selected?: boolean;
  [key: string]: unknown;
};

export function hasSelectedGridItems(
  gridData: readonly SelectableGridItem[] | null | undefined,
): boolean {
  if (!gridData || gridData.length === 0) {
    return false;
  }
  return gridData.some((x) => x.selected === true);
}
