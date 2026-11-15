/**
 * Ported from apps/ap/src/utils/ColorsGroups.ts (via apps/ar/src/utils/chartColors.ts) and the
 * literal colorAxis/backgroundColor/defaultColor/datalessRegionColor GeoChart.vue always applied
 * regardless of what a caller's `options` prop asked for (`...props.options` immediately
 * overwritten by an explicit `colorAxis` assignment right after, in both the AP original and the
 * AR port). Baked in here rather than exposed as a prop, matching that existing behavior exactly
 * — and BubbleMap's own precedent of owning its palette rather than taking it from a caller.
 */
export const GEO_CHART_COLORS = {
  /** Sequential scale a country's fill interpolates across, low value to high. */
  colorAxis: ["#2e90fa", "#36BFFA", "#FF4405", "#FFB524", "#0E9384"],
  background: "#fcfcfd",
  /** A country with data but zero/negative value — practically unreachable given the chart's own
   * inputs, kept for parity with the original's explicit default. */
  default: "#98A2B3",
  /** A country the served data has no row for at all. */
  dataless: "#eaecf0",
  /** Selection outline/drop-shadow color for a clicked region. */
  selection: "#0040C1",
} as const;
