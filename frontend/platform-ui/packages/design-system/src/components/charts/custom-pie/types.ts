export type CustomPieSlice = {
  /** Legend / tooltip label. */
  category: string;
  /** Numeric value (share of the whole). */
  value: number;
  /** Optional slice color. Falls back to the shared pie palette. */
  color?: string;
};

export type CustomPieChartProps = {
  /** Pie slices (`category` + `value`, optional `color`). */
  data: CustomPieSlice[];
  /**
   * Chart box size (CSS length or px number). Default: `168`.
   * With zero pie padding this matches the rendered diameter.
   */
  size?: string | number;
  /** Show hover tooltips. Default: `true`. */
  tooltipVisible?: boolean;
  /** Show the side legend (Total + rows). Default: `true`. */
  legendVisible?: boolean;
  /** Label above the total number. Default: `"Total"`. */
  totalLabel?: string;
  /** Show `(xx.xx%)` next to each legend value. Default: `true`. */
  showPercentages?: boolean;
};
