import { Text } from "@progress/kendo-drawing";
import { createBarVisual } from "../shared/bar-visual";
import { CHART_COLORS, CHART_FONT } from "../shared/constants";
import { formatCompactChartNumber, truncateChartLabel } from "../shared/format";
import type { WaterfallDataPoint } from "./types";

export type BuildWaterfallOptionsInput = {
  data: WaterfallDataPoint[];
  tooltipVisible: boolean;
  categoryAxisTitle?: string;
  categoryAxisTitleColor?: string;
  categoryAxisTitleFontWeight?: number;
  categoryAxisTitleFontSize?: number;
  valueAxisTitle?: string;
  valueAxisTitleColor?: string;
  valueAxisTitleFontWeight?: number;
  valueAxisTitleFontSize?: number;
  valueLabelsVisible: boolean;
  valueLabelsContent?: (value: number) => string;
  categoryLabelsRotated: boolean;
  categoryLabelMaxLength?: number;
  valueAxisLabelsContent?: (e: { value: unknown }) => string;
  valueAxisLabelRotation?: number | "auto";
  valueAxisLabelColor?: string;
  valueAxisLabelFontWeight?: number;
  roundedBars: boolean;
  /** AB#20398/AB#20517: light grey for a positive step, blue for a negative one - the opposite of
   * the default negative/positive pairing below. Scoped to the caller's own "Potential Payment
   * Term (days)" view only - its sibling "Cash Flow Opportunity" view keeps the original colors,
   * per request. */
  invertColors?: boolean;
};

const WATERFALL_LABEL_COLOR = "#222222";

/** Resolve a bar's fill: an explicit per-point override, else total/negative/default. */
function resolveBarColor(
  point: { value?: number; dataItem?: WaterfallDataPoint },
  invertColors: boolean,
): string {
  const item = point.dataItem;
  if (item?.color) {
    return item.color;
  }
  if (item?.summary === "total") {
    return CHART_COLORS.total;
  }
  const isNegative = (point.value ?? 0) < 0;
  if (invertColors) {
    return isNegative ? CHART_COLORS.defaultSeries : CHART_COLORS.neutral;
  }
  return isNegative ? CHART_COLORS.negative : CHART_COLORS.defaultSeries;
}

/** A bar-center point for the value label, nudged clear of the bar's own end. */
function labelPoint(
  value: number,
  textLength: number,
  origin: { x: number; y: number },
  width: number,
): [number, number] {
  return [origin.x + (width / 2 - textLength * 2.7), origin.y + (value >= 0 ? -5 : 5)];
}

/** Kendo series label `visual` factory drawing a formatted number centered on each bar. */
function createWaterfallLabelVisual(formatValue: (value: number) => string) {
  return (e: {
    value?: number;
    rect: { origin: { x: number; y: number }; size: { width: number } };
  }) => {
    const value = e.value ?? 0;
    const text = value ? formatValue(value) : "0";
    const point = labelPoint(value, text.length, e.rect.origin, e.rect.size.width);
    return new Text(text, point, {
      font: `700 14px ${CHART_FONT}`,
      fill: { color: WATERFALL_LABEL_COLOR },
    });
  };
}

/** Build Kendo Chart options for a waterfall chart. */
export function buildWaterfallOptions(
  input: BuildWaterfallOptionsInput,
): Record<string, unknown> {
  const barVisual = createBarVisual({
    rounded: input.roundedBars,
    stackGap: false,
    orientation: "vertical",
    corners: "all",
    // AB#20904: a step far smaller than the axis scale (e.g. 17 next to 500k) still shows as a
    // thin line instead of vanishing.
    minVisibleSize: true,
  });

  const series: Record<string, unknown> = {
    type: "waterfall",
    data: input.data,
    field: "value",
    categoryField: "category",
    summaryField: "summary",
    color: (point: { value?: number; dataItem?: WaterfallDataPoint }) =>
      resolveBarColor(point, input.invertColors ?? false),
    gap: 0.5,
    line: { width: 0.9, color: "transparent" },
    // Always the custom visual (square corners when `roundedBars` is off) - Kendo's own one has no
    // minimum size, so a tiny step would vanish there too.
    visual: barVisual,
  };

  if (input.valueLabelsVisible) {
    series.labels = {
      visible: true,
      // AB#20519: 1 decimal, real rounding - same formatter the value axis and the Overview's
      // own cash-flow figure already use, so a bar's label never contradicts its own tooltip.
      visual: createWaterfallLabelVisual(input.valueLabelsContent ?? formatCompactChartNumber),
    };
  }

  const categoryAxis: Record<string, unknown> = {
    majorGridLines: { visible: false },
    labels: {
      rotation: input.categoryLabelsRotated ? "auto" : 0,
      margin: 10,
      color: CHART_COLORS.axisLabel,
      font: `700 14px ${CHART_FONT}`,
      content: (e: { value: unknown }) => truncateChartLabel(e.value, input.categoryLabelMaxLength),
    },
  };

  if (input.categoryAxisTitle) {
    categoryAxis.title = {
      text: input.categoryAxisTitle,
      color: input.categoryAxisTitleColor ?? CHART_COLORS.axisTitle,
      font: `${input.categoryAxisTitleFontWeight ?? 400} ${input.categoryAxisTitleFontSize ?? 12}px ${CHART_FONT}`,
      margin: { top: 4 },
    };
  }

  const valueAxis: Record<string, unknown> = {
    majorGridLines: { visible: false },
    crosshair: { visible: false },
    labels: {
      color: input.valueAxisLabelColor ?? CHART_COLORS.axisTitle,
      font: `${input.valueAxisLabelFontWeight ?? 600} 14px ${CHART_FONT}`,
      content: input.valueAxisLabelsContent ?? ((e: { value: unknown }) => formatCompactChartNumber(e.value)),
      ...(input.valueAxisLabelRotation !== undefined ? { rotation: input.valueAxisLabelRotation } : {}),
    },
  };

  if (input.valueAxisTitle) {
    valueAxis.title = {
      text: input.valueAxisTitle,
      position: "center",
      color: input.valueAxisTitleColor ?? CHART_COLORS.axisTitle,
      font: `${input.valueAxisTitleFontWeight ?? 400} ${input.valueAxisTitleFontSize ?? 12}px ${CHART_FONT}`,
      margin: { right: 8 },
    };
  }

  return {
    transitions: false,
    series: [series],
    categoryAxis,
    valueAxis,
    plotArea: {
      margin: { top: input.valueLabelsVisible ? 24 : 8, right: 8, left: 4, bottom: 4 },
    },
    legend: { visible: false },
    tooltip: {
      visible: input.tooltipVisible,
      format: "{0}",
    },
  };
}
