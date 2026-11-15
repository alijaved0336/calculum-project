/**
 * Pure index lookup for a grid row by reference equality.
 */

export function findGridDataItemIndex<T>(
  gridData: readonly T[] | null | undefined,
  dataItem: T,
): number {
  if (!gridData || gridData.length === 0) {
    return -1;
  }
  return gridData.indexOf(dataItem);
}
