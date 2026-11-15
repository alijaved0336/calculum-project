/**
 * Kendo series types relevant to this chart. `SeriesType` itself isn't part of
 * `@progress/kendo-charts`'s public export surface, so this is a narrower
 * local union — extend it if a new series type is needed.
 */
export type AreaChartSeriesType =
  | "area"
  | "line"
  | "column"
  | "bar"
  | "verticalArea"
  | "verticalLine"
  | "scatterLine";

export type AreaChartSeries = {
  /** Legend / tooltip name for this series. */
  name?: string;
  /** Kendo series type. Default: `"area"`. */
  type?: AreaChartSeriesType;
  /** Numeric values aligned with `categories` by index. `null` leaves a gap. */
  data: Array<number | null>;
  /** Series fill/line color. */
  color?: string;
};

export type AreaChartProps = {
  /** Category labels (X-axis). */
  categories: string[];
  /** One or more series, rendered in the given order. */
  series: AreaChartSeries[];
  /** Title along the category (X) axis. */
  categoryAxisTitle?: string;
  /** Title along the value (Y) axis. */
  valueAxisTitle?: string;
  /** Fixed step between value-axis labels/gridlines. Omit to let Kendo auto-calculate. */
  valueMajorUnit?: number;
  /** Custom formatter for value-axis labels, e.g. `(e) => \`${e.value / 1000}k\`` */
  valueLabelsContent?: (e: { value: number }) => string;
  /** Show the chart legend. Default: `true`. */
  legendVisible?: boolean;
  /** Legend position. Default: `"bottom"`. */
  legendPosition?: "top" | "bottom" | "left" | "right";
  /** Show series tooltips. Default: `true`. */
  tooltipVisible?: boolean;
  /** Chart height (CSS length or px number). Default: `"300px"`. */
  height?: string | number;
};
