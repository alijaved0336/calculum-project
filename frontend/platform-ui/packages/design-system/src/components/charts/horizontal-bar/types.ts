export type HorizontalBarStack = boolean | { type: "100%" };

/**
 * @deprecated Prefer `stripeOverlay` — diagonal hatch drawn inside the bar SVG
 * on top of the series color. Kept for older Storybook samples / Kendo-native
 * hatch when custom visuals are not used.
 */
export type HorizontalBarPattern = {
  type: "diagonalStripes";
  /** Stripe color. */
  color?: string;
  /** Fill behind stripes. */
  background?: string;
  /** Stripe line width. */
  width?: number;
  /** Gap between stripes. */
  gap?: number;
};

/** A bar's value, or `{ value, color }` to override the series color for that one bar. */
export type HorizontalBarDataPoint = number | { value: number; color?: string };

export type HorizontalBarSeries = {
  /** Legend / series name. */
  name?: string;
  /** Values aligned with `categories` by index. Pass `{ value, color }` to color individual bars (e.g. to highlight a selection). */
  data: HorizontalBarDataPoint[];
  /** Bar fill color. Defaults to brand accent when omitted. */
  color?: string;
  /**
   * Diagonal stripe overlay on top of the bar fill (SVG `<pattern>`, 45°).
   * Defaults: white @ 50%, 5px stripe / 4px gap. Pass an object to override.
   */
  stripeOverlay?: boolean | {
    color?: string;
    width?: number;
    gap?: number;
  };
  /**
   * @deprecated Prefer `stripeOverlay`. Legacy Kendo hatch; with custom visuals
   * (rounded / stacked / stripeOverlay) it is mapped to an SVG overlay.
   */
  pattern?: HorizontalBarPattern;
  /**
   * Distance between categories as a fraction of bar width.
   * Set on the first series — Kendo applies it to all series.
   * @see https://www.telerik.com/kendo-vue-ui/components/charts/bar#gap-and-spacing
   */
  gap?: number;
  /**
   * Distance between bars in one category as a fraction of bar width.
   * Set on the first series — Kendo applies it to all series.
   */
  spacing?: number;
  /**
   * Stack mode. Set on the first series — Kendo applies it to all series.
   * Pass `{ type: "100%" }` for 100% stacked bars.
   */
  stack?: HorizontalBarStack;
};

export type HorizontalBarChartProps = {
  /** Category labels (Y-axis for bar charts). */
  categories: string[];
  /** One or more bar series. */
  series: HorizontalBarSeries[];
  /**
   * Optional fixed height (CSS length or px number).
   * When omitted, height scales with `categories.length`.
   */
  height?: string | number;
  /** Show the chart legend. Default: `true` when any series has a `name`. */
  legendVisible?: boolean;
  /** Show series tooltips. Default: `true`. */
  tooltipVisible?: boolean;
  /** Title along the category (Y) axis, e.g. "Active users". */
  categoryAxisTitle?: string;
  /** Color of the category (Y) axis title. Defaults to a light gray. */
  categoryAxisTitleColor?: string;
  /** Font weight of the category (Y) axis title (e.g. `400`, `600`, `700`). Default: `400`. */
  categoryAxisTitleFontWeight?: number;
  /** Font size (px) of the category (Y) axis title. Default: `12`. */
  categoryAxisTitleFontSize?: number;
  /** Title along the value (X) axis, e.g. "Month". */
  valueAxisTitle?: string;
  /** Show numeric labels at the end of each bar. Default: `false`. */
  valueLabelsVisible?: boolean;
  /** Custom formatter for the bar-end value labels. Defaults to locale-formatted number. */
  valueLabelsContent?: (e: { value: number }) => string;
  /** Custom formatter for the value (X) axis tick labels. */
  valueAxisLabelsContent?: (e: { value: number }) => string;
  /** Rotate value (X) axis tick labels (degrees, or `"auto"`). */
  valueAxisLabelRotation?: number | "auto";
  /** Color of the value (X) axis tick labels. Defaults to a light gray. */
  valueAxisLabelColor?: string;
  /** Font weight of the value (X) axis tick labels (e.g. `400`, `600`, `700`). Default: `500`. */
  valueAxisLabelFontWeight?: number;
  /**
   * Truncate category labels longer than this (ellipsis).
   * Omit for full labels.
   */
  categoryLabelMaxLength?: number;
  /**
   * Round bar corners with a fixed 4px radius (~matches 12px-tall bars).
   * Default: `true`.
   */
  roundedBars?: boolean;
};

export type HorizontalBarClickPayload = {
  /** The clicked bar's category. */
  category: string;
  /** Index of the clicked bar within `categories`. */
  index: number;
};
