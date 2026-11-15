export type VerticalBarStack = boolean | { type: "100%" };

export type VerticalBarSeries = {
  /** Legend / series name. */
  name?: string;
  /**
   * Numeric values aligned with `categories` by index.
   * Use `null` to skip a category (sparse series for color-group layouts).
   */
  data: Array<number | null>;
  /** Column fill color. Defaults to brand accent when omitted. */
  color?: string;
  /**
   * Distance between categories as a fraction of bar width.
   * Set on the first series — Kendo applies it to all series.
   */
  gap?: number;
  /**
   * Distance between bars in one category as a fraction of bar width.
   * Set on the first series — Kendo applies it to all series.
   */
  spacing?: number;
  /**
   * Stack mode. Set on the first series — Kendo applies it to all series.
   * Pass `{ type: "100%" }` for 100% stacked columns.
   */
  stack?: VerticalBarStack;
};

export type VerticalBarChartProps = {
  /** Category labels (X-axis for column charts). */
  categories: string[];
  /** One or more column series. */
  series: VerticalBarSeries[];
  /**
   * Chart height (CSS length or px number). Default: `320`.
   */
  height?: string | number;
  /** Show the chart legend. Default: `true` when any series has a `name`. */
  legendVisible?: boolean;
  /** Show series tooltips. Default: `true`. */
  tooltipVisible?: boolean;
  /** Title along the category (X) axis. */
  categoryAxisTitle?: string;
  /** Title along the value (Y) axis, e.g. `"Days"`. */
  valueAxisTitle?: string;
  /** Custom formatter for value-axis tick labels. Default: `{0:N1}`. */
  valueAxisLabelsContent?: (e: { value: unknown }) => string;
  /**
   * Show numeric labels on columns.
   * Tall bars → white label inside; short bars → colored label above.
   * Default: `false`.
   */
  valueLabelsVisible?: boolean;
  /** Custom formatter for bar value labels (and hover tooltips). Default: `formatChartNumber`. */
  valueLabelsContent?: (value: number) => string;
  /**
   * Below this value, labels render above the column (outside).
   * Default: `35`.
   */
  valueLabelOutsideBelow?: number;
  /** Hide category axis labels (useful for unlabeled peer-group mocks). */
  categoryLabelsVisible?: boolean;
  /**
   * Round column tops with a 4px radius. Default: `true`.
   */
  roundedBars?: boolean;
  /**
   * Plot negative values as their absolute magnitude (still `min: 0`) and color
   * those bars red, while labels and tooltips show the original signed value.
   * Default: `false` — existing charts keep raw values and series colors.
   */
  signedNegativeValues?: boolean;
};
