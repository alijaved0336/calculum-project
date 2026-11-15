/** Shared chart tokens — keep fonts concrete (CSS vars break Kendo text metrics). */
export const CHART_FONT = "Inter, system-ui, sans-serif";

export const CHART_COLORS = {
  defaultSeries: "#6366F1", // --brand-500
  axisTitle: "#98A2B3",
  axisLabel: "#475467",
  gridLine: "#EAECF0",
  /** Bar fill for a negative value rendered as a positive-length bar (see horizontal-bar/build-options.ts). */
  negative: "#EF4444", // --red-500
  /** Running-total/summary bar fill (see waterfall-chart/build-options.ts). */
  total: "#4A5578", // $color-coolgray-600
  /** AB#20517: light grey, same value AP uses for its own waterfall's neutral bar color. */
  neutral: "#98A2B3", // --gray-400
} as const;

/** Default palette for pie / donut slices when a slice has no `color`. */
export const PIE_DEFAULT_COLORS = [
  "#6366F1", // indigo
  "#3B82F6", // blue
  "#A855F7", // purple
  "#22C55E", // green
  "#EF4444", // red
  "#EAB308", // yellow
  "#06B6D4", // cyan
  "#F97316", // orange
] as const;

/**
 * Room the plot area gives up on the right for a bar's own value label, in px.
 *
 * The two are separate on purpose and the plot margin is their SUM: the GAP keeps the number off the
 * bar's fill, the ROOM is the text's width budget, and a bar whose value equals the axis maximum
 * reaches the plot edge and needs BOTH — that is the case where the label is drawn entirely inside
 * this margin. Adding the gap without widening the margin is what clips the longest bar's label,
 * which is a defect that has already happened once.
 */
export const HORIZONTAL_BAR_VALUE_LABEL_GAP_PX = 8;
export const HORIZONTAL_BAR_VALUE_LABEL_ROOM_PX = 52;

/** Horizontal bar row budgeting (auto height). */
export const HORIZONTAL_BAR_CATEGORY_ROW_PX = 44;
export const HORIZONTAL_BAR_CHROME_PX = 72;
export const HORIZONTAL_BAR_AXIS_TITLE_CHROME_PX = 28;
export const HORIZONTAL_BAR_LEGEND_CHROME_PX = 28;

/** Bar shape. */
export const BAR_CORNER_RADIUS_PX = 4;
/** Gap between stacked segments (px), split as inset on each side. */
export const STACK_SEGMENT_GAP_PX = 1;
/** Thinnest a non-zero bar is drawn (px) when a chart opts into it, so a tiny value next to much
 * larger ones still shows as a line instead of vanishing. */
export const BAR_MIN_VISIBLE_PX = 2;

/**
 * Diagonal stripe overlay drawn inside the bar SVG (45°, 5px on / 4px off).
 * White at 10% so series color stays dominant underneath.
 */
export const BAR_STRIPE_OVERLAY = {
  color: "rgba(255, 255, 255, 0.1)",
  width: 5,
  gap: 4,
} as const;
