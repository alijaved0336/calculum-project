import { GRAPHQL_GRID_DEFAULT_PAGE_SIZES } from "./types";

export type GraphqlGridPagerItem = number | "ellipsis";
export type GraphqlGridPageSizeList = number[];

/** Figma pager shows three pages on each side of the ellipsis (`1 2 3 … 8 9 10`). */
const EDGE_COUNT = 3;

function range(from: number, to: number): number[] {
  if (to < from) {
    return [];
  }
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/**
 * Truncated page list: first/last groups plus a window around the current page.
 * `buttonCount` is accepted for the old Kendo pageable shape but the visible
 * edge size is capped so the Figma layout still holds.
 */
export function buildPagerItems(
  currentPage: number,
  totalPages: number,
  buttonCount = EDGE_COUNT,
): GraphqlGridPagerItem[] {
  if (totalPages <= 0) {
    return [];
  }
  if (totalPages === 1) {
    return [1];
  }

  const current = Math.min(Math.max(currentPage, 1), totalPages);
  const edgeCount = Math.min(EDGE_COUNT, Math.max(1, buttonCount));
  const compactLimit = edgeCount * 2 + 1;

  if (totalPages <= compactLimit) {
    return range(1, totalPages);
  }

  const startEdge = range(1, edgeCount);
  const endEdge = range(totalPages - edgeCount + 1, totalPages);

  if (current <= edgeCount || current >= totalPages - edgeCount + 1) {
    return [...startEdge, "ellipsis", ...endEdge];
  }

  const windowFrom = current - 1;
  const windowTo = current + 1;
  const items: GraphqlGridPagerItem[] = [1];

  if (windowFrom > 2) {
    items.push("ellipsis");
  }

  items.push(
    ...range(Math.max(windowFrom, 2), Math.min(windowTo, totalPages - 1)),
  );

  if (windowTo < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);
  return items;
}

export function pagerRangeLabel(skip: number, take: number, total: number): string {
  if (total <= 0) {
    return "0 - 0 of 0";
  }
  const pageSize = Math.max(1, take);
  const from = skip + 1;
  const to = Math.min(skip + pageSize, total);
  return `${from} - ${to} of ${total}`;
}

export function resolvePagerPageSizes(
  pageSizes: boolean | number[] | undefined,
): GraphqlGridPageSizeList {
  if (pageSizes === false) {
    return [];
  }
  if (Array.isArray(pageSizes) && pageSizes.length > 0) {
    return [...pageSizes];
  }
  return [...GRAPHQL_GRID_DEFAULT_PAGE_SIZES];
}
