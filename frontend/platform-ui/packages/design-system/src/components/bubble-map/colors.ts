/**
 * Ported from apps/ap/src/utils/ColorsUtils.ts (teal[600]/[300], orange[500]/[300]) and the
 * hardcoded selected-blue literal in OverviewLocation.vue. Duplicated rather than imported
 * since ColorsUtils is local to the AP app, not reachable from a shared package.
 */
export const BUBBLE_MAP_COLORS = {
  supplier: "#0e9384",
  supplierHover: "#5fe9d0",
  buyer: "#ff4405",
  buyerHover: "#f7b27a",
  selected: "#0040c1",
} as const;
