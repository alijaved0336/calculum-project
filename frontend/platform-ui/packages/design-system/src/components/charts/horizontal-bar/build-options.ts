import { createBarVisual } from "../shared/bar-visual";
import {
  CHART_COLORS,
  CHART_FONT,
  HORIZONTAL_BAR_AXIS_TITLE_CHROME_PX,
  HORIZONTAL_BAR_CATEGORY_ROW_PX,
  HORIZONTAL_BAR_CHROME_PX,
  HORIZONTAL_BAR_LEGEND_CHROME_PX,
  HORIZONTAL_BAR_VALUE_LABEL_GAP_PX,
  HORIZONTAL_BAR_VALUE_LABEL_ROOM_PX,
} from "../shared/constants";
import { formatChartNumber, truncateChartLabel } from "../shared/format";
import type { HorizontalBarSeries } from "./types";

export type BuildHorizontalBarOptionsInput = {
  categories: string[];
  series: HorizontalBarSeries[];
  legendVisible?: boolean;
  tooltipVisible: boolean;
  categoryAxisTitle?: string;
  categoryAxisTitleColor?: string;
  categoryAxisTitleFontWeight?: number;
  categoryAxisTitleFontSize?: number;
  valueAxisTitle?: string;
  valueLabelsVisible: boolean;
  valueLabelsContent?: (e: { value: unknown }) => string;
  valueAxisLabelsContent?: (e: { value: unknown }) => string;
  valueAxisLabelRotation?: number | "auto";
  valueAxisLabelColor?: string;
  valueAxisLabelFontWeight?: number;
  categoryLabelMaxLength?: number;
  roundedBars: boolean;
  showLegend: boolean;
};

export function resolveHorizontalBarHeight(input: {
  height?: string | number;
  categoryCount: number;
  hasCategoryAxisTitle: boolean;
  hasValueAxisTitle: boolean;
  showLegend: boolean;
}): string {
  if (input.height !== undefined) {
    return typeof input.height === "number"
      ? `${input.height}px`
      : input.height;
  }

  const rows = Math.max(input.categoryCount, 1);
  let chrome = HORIZONTAL_BAR_CHROME_PX;
  if (input.hasCategoryAxisTitle) {
    chrome += HORIZONTAL_BAR_AXIS_TITLE_CHROME_PX;
  }
  if (input.hasValueAxisTitle) {
    chrome += HORIZONTAL_BAR_AXIS_TITLE_CHROME_PX;
  }
  if (input.showLegend) {
    chrome += HORIZONTAL_BAR_LEGEND_CHROME_PX;
  }
  return `${rows * HORIZONTAL_BAR_CATEGORY_ROW_PX + chrome}px`;
}

function resolveSeriesStripeOverlay(item: HorizontalBarSeries) {
  if (item.stripeOverlay !== undefined) {
    return item.stripeOverlay;
  }
  if (!item.pattern) {
    return false;
  }
  // Map legacy `pattern` to the SVG overlay so rounded bars keep hatch.
  return {
    color: item.pattern.color,
    width: item.pattern.width,
    gap: item.pattern.gap,
  };
}

function dataPointValue(point: HorizontalBarSeries["data"][number]): number {
  return typeof point === "number" ? point : point.value;
}

/**
 * A negative value is plotted as its positive magnitude, colored red instead of the series
 * color, with the true (negative) value kept on `originalValue` for labels/tooltips to read
 * back - a bar extending left of the origin has nowhere for Kendo to put its outsideEnd label
 * and reads as a rendering bug next to an all-positive chart, so the sign is communicated by
 * color instead of by direction.
 */
function normalizeDataPoint(
  point: HorizontalBarSeries["data"][number],
): { value: number; color?: string; originalValue: number } {
  const originalValue = dataPointValue(point);
  const explicitColor = typeof point === "object" ? point.color : undefined;
  return {
    value: Math.abs(originalValue),
    color: originalValue < 0 ? CHART_COLORS.negative : explicitColor,
    originalValue,
  };
}

/** Reads the true (possibly negative) value back off a normalized data point for display. */
function resolveDisplayValue(e: { value: unknown; dataItem?: { originalValue?: number } }): unknown {
  return typeof e.dataItem?.originalValue === "number" ? e.dataItem.originalValue : e.value;
}

/** Build Kendo Chart options for a horizontal bar chart. */
export function buildHorizontalBarOptions(
  input: BuildHorizontalBarOptionsInput,
): Record<string, unknown> {
  const isStacked = input.series.some((item) => item.stack !== undefined);
  const hasStripeOverlay = input.series.some(
    (item) => item.stripeOverlay || item.pattern,
  );
  const needsCustomVisual =
    input.roundedBars || isStacked || hasStripeOverlay;

  const stackValue = isStacked
    ? input.series.find((s) => s.stack !== undefined)?.stack
    : undefined;
  const gapValue = input.series.find((s) => s.gap !== undefined)?.gap;
  const spacingValue = input.series.find(
    (s) => s.spacing !== undefined,
  )?.spacing;

  const series = input.series.map((item, index) => {
    const stripeOverlay = resolveSeriesStripeOverlay(item);
    const entry: Record<string, unknown> = {
      type: "bar",
      name: item.name,
      data: item.data.map(normalizeDataPoint),
      color:
        item.color ??
        item.pattern?.background ??
        CHART_COLORS.defaultSeries,
      overlay: { gradient: "none" },
    };

    if (needsCustomVisual) {
      entry.visual = createBarVisual({
        rounded: input.roundedBars,
        stackGap: isStacked,
        orientation: "horizontal",
        stripeOverlay,
      });
      // Kendo's default highlight is a white 0.2-opacity rect over the bar box.
      // On rounded/stripe custom visuals that reads as a leftover gray "active" cell.
      entry.highlight = { visible: false };
    } else if (item.pattern) {
      entry.pattern = item.pattern;
    }

    if (input.valueLabelsVisible) {
      const labelsContent =
        input.valueLabelsContent ?? ((e: { value: unknown }) => formatChartNumber(e.value, 1));
      entry.labels = {
        visible: true,
        position: "outsideEnd",
        background: "transparent",
        color: CHART_COLORS.axisLabel,
        font: `600 13px ${CHART_FONT}`,
        // A gap between the bar's end and its own number, the far-end twin of the gap the category
        // labels take. Without it the label sits flush against the fill and reads as part of the bar
        // rather than as its value. Left, because an outsideEnd label on a horizontal bar sits to the
        // bar's right. The plot area's own right margin has to carry this gap ON TOP OF its text
        // budget, or the longest bar's label is pushed off the canvas.
        margin: { left: HORIZONTAL_BAR_VALUE_LABEL_GAP_PX },
        content: (e: { value: unknown; dataItem?: { originalValue?: number } }) =>
          labelsContent({ value: resolveDisplayValue(e) }),
      };
    }

    if (index === 0) {
      if (stackValue !== undefined) {
        entry.stack = stackValue;
      }
      if (gapValue !== undefined) {
        entry.gap = gapValue;
      }
      if (spacingValue !== undefined) {
        entry.spacing = spacingValue;
      }
    }

    return entry;
  });

  const categoryAxis: Record<string, unknown> = {
    categories: input.categories,
    majorGridLines: {
      visible: true,
      color: CHART_COLORS.gridLine,
      width: 1,
    },
    majorTicks: { visible: false },
    line: { visible: true, color: CHART_COLORS.gridLine },
    labels: {
      color: CHART_COLORS.axisLabel,
      font: `600 13px ${CHART_FONT}`,
      // A gap between the category name and the axis line the bar grows from. Without it the name
      // touches the bar and the two read as one run of ink — the same complaint the value label on
      // the far end had, and the same fix on the other side. Note the axis TITLE below carries its
      // own margin and is easy to mistake for this one: the title is optional, so a chart with no
      // title had nothing separating its labels at all.
      margin: { right: HORIZONTAL_BAR_VALUE_LABEL_GAP_PX },
      content: (e: { value: unknown }) =>
        truncateChartLabel(e.value, input.categoryLabelMaxLength),
    },
  };

  if (input.categoryAxisTitle) {
    categoryAxis.title = {
      text: input.categoryAxisTitle,
      color: input.categoryAxisTitleColor ?? CHART_COLORS.axisTitle,
      font: `${input.categoryAxisTitleFontWeight ?? 400} ${input.categoryAxisTitleFontSize ?? 12}px ${CHART_FONT}`,
      margin: { right: 8 },
    };
  }

  const valueAxis: Record<string, unknown> = {
    min: 0,
    majorGridLines: { visible: false },
    minorGridLines: { visible: false },
    majorTicks: { visible: false },
    line: { visible: false },
    labels: {
      color: input.valueAxisLabelColor ?? CHART_COLORS.axisTitle,
      font: `${input.valueAxisLabelFontWeight ?? 500} 12px ${CHART_FONT}`,
      ...(input.valueAxisLabelsContent ? { content: input.valueAxisLabelsContent } : {}),
      ...(input.valueAxisLabelRotation !== undefined ? { rotation: input.valueAxisLabelRotation } : {}),
    },
  };

  if (input.valueAxisTitle) {
    valueAxis.title = {
      text: input.valueAxisTitle,
      color: CHART_COLORS.axisTitle,
      font: `400 12px ${CHART_FONT}`,
      margin: { top: 8 },
    };
  }

  return {
    transitions: false,
    series,
    categoryAxis,
    valueAxis,
    plotArea: {
      margin: {
        // The label's own gap PLUS its text budget: a bar at the axis maximum ends flush with the
        // plot edge, so its whole label lives out here. See the two constants' note.
        right: input.valueLabelsVisible
          ? HORIZONTAL_BAR_VALUE_LABEL_GAP_PX + HORIZONTAL_BAR_VALUE_LABEL_ROOM_PX
          : 8,
        left: 4,
        top: 4,
        bottom: 4,
      },
    },
    legend: {
      visible: input.showLegend,
      position: "bottom",
      orientation: "horizontal",
      align: "center",
      spacing: 24,
      padding: 8,
      labels: {
        color: CHART_COLORS.axisLabel,
        font: `500 13px ${CHART_FONT}`,
        margin: { left: 4, right: 8 },
      },
    },
    tooltip: {
      visible: input.tooltipVisible,
      format: "{0}",
    },
  };
}
