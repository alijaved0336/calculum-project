export type WaterfallDataPoint = {
  /** Category label (X axis). */
  category: string;
  /** Signed delta for this bar. Omit only for the running-total bar (`summary: "total"`). */
  value?: number;
  /** Explicit color override for this bar. Defaults: negative value → red, total bar → slate, else brand accent. */
  color?: string;
  /**
   * Marks this point as the chart's running-total bar, drawn from zero instead of stacking on the
   * previous bar. Kendo reads this via `summaryField` and requires the literal string `"total"`.
   */
  summary?: "total";
};

export type WaterfallChartProps = {
  /** Ordered bars, including the trailing running-total bar if one is wanted. */
  data: WaterfallDataPoint[];
  /** Chart height (CSS length or px number). Default: `320`. */
  height?: string | number;
  /** Show series tooltips. Default: `true`. */
  tooltipVisible?: boolean;
  /** Title along the category (X) axis. */
  categoryAxisTitle?: string;
  /** Color of the category (X) axis title. Defaults to a light gray. */
  categoryAxisTitleColor?: string;
  /** Font weight of the category (X) axis title. Default: `400`. */
  categoryAxisTitleFontWeight?: number;
  /** Font size (px) of the category (X) axis title. Default: `12`. */
  categoryAxisTitleFontSize?: number;
  /** Title along the value (Y) axis. */
  valueAxisTitle?: string;
  /** Color of the value (Y) axis title. Defaults to a light gray. */
  valueAxisTitleColor?: string;
  /** Font weight of the value (Y) axis title. Default: `400`. */
  valueAxisTitleFontWeight?: number;
  /** Font size (px) of the value (Y) axis title. Default: `12`. */
  valueAxisTitleFontSize?: number;
  /** Show compact numeric labels centered on each bar. Default: `true`. */
  valueLabelsVisible?: boolean;
  /** Custom formatter for the bar-center value labels. Defaults to a compact ("k"/"m") number. */
  valueLabelsContent?: (value: number) => string;
  /** Rotate category (X) axis labels — `true` for `"auto"`, `false` for `0`. Default: `true`. */
  categoryLabelsRotated?: boolean;
  /** Truncate category labels longer than this (ellipsis). */
  categoryLabelMaxLength?: number;
  /** Custom formatter for the value (Y) axis tick labels. Defaults to a compact ("k"/"m") number. */
  valueAxisLabelsContent?: (e: { value: unknown }) => string;
  /** Rotate value (Y) axis tick labels (degrees, or `"auto"`). */
  valueAxisLabelRotation?: number | "auto";
  /** Color of the value (Y) axis tick labels. Defaults to a light gray. */
  valueAxisLabelColor?: string;
  /** Font weight of the value (Y) axis tick labels. Default: `600`. */
  valueAxisLabelFontWeight?: number;
  /** Round bar corners. Default: `true`. */
  roundedBars?: boolean;
};

export type WaterfallBarClickPayload = {
  /** The clicked bar's category. */
  category: string;
  /** Index of the clicked bar within `data`. */
  index: number;
  /** Whether the clicked bar is the running-total bar. */
  isSummary: boolean;
};
