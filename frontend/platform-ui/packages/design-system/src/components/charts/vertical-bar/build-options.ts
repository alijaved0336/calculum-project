import { createBarVisual } from "../shared/bar-visual";
import {
  CHART_COLORS,
  CHART_FONT,
} from "../shared/constants";
import { formatChartNumber, truncateChartLabel } from "../shared/format";
import type { VerticalBarSeries } from "./types";

export type BuildVerticalBarOptionsInput = {
  categories: string[];
  series: VerticalBarSeries[];
  tooltipVisible: boolean;
  categoryAxisTitle?: string;
  valueAxisTitle?: string;
  valueAxisLabelsContent?: (e: { value: unknown }) => string;
  valueLabelsVisible: boolean;
  valueLabelsContent?: (value: number) => string;
  valueLabelOutsideBelow: number;
  categoryLabelsVisible: boolean;
  categoryLabelMaxLength?: number;
  roundedBars: boolean;
  showLegend: boolean;
  signedNegativeValues?: boolean;
};

function hasMultiSegmentStacks(series: VerticalBarSeries[]): boolean {
  const length = Math.max(0, ...series.map((item) => item.data.length));
  for (let index = 0; index < length; index += 1) {
    let count = 0;
    for (const item of series) {
      const value = item.data[index];
      if (value !== null && value !== undefined && Number(value) !== 0) {
        count += 1;
      }
    }
    if (count > 1) {
      return true;
    }
  }
  return false;
}

function formatBarValue(
  input: BuildVerticalBarOptionsInput,
  value: number,
): string {
  return input.valueLabelsContent?.(value) ?? formatChartNumber(value);
}

/**
 * A negative value is plotted as its positive magnitude, colored red instead of the series
 * color, with the true (negative) value kept on `originalValue` for labels/tooltips to read
 * back - a bar extending below the origin has nowhere for Kendo to put its outsideEnd label
 * and `min: 0` clips it, so the sign is communicated by color instead of by direction.
 */
function normalizeDataPoint(value: number): {
  value: number;
  color?: string;
  originalValue: number;
} {
  return {
    value: Math.abs(value),
    color: value < 0 ? CHART_COLORS.negative : undefined,
    originalValue: value,
  };
}

/** Build Kendo Chart options for a vertical column chart. */
export function buildVerticalBarOptions(
  input: BuildVerticalBarOptionsInput,
): Record<string, unknown> {
  const isStacked = input.series.some((item) => item.stack !== undefined);
  // Peer-group mocks use stack + sparse nulls (one value per category).
  // Only apply 1px segment gaps when a category actually has 2+ segments.
  const stackGap = isStacked && hasMultiSegmentStacks(input.series);
  const needsCustomVisual = input.roundedBars || isStacked;
  const barVisual = needsCustomVisual
    ? createBarVisual({
        rounded: input.roundedBars,
        stackGap,
        orientation: "vertical",
        corners: "value-end",
      })
    : null;

  const stackValue = isStacked
    ? input.series.find((s) => s.stack !== undefined)?.stack
    : undefined;
  const gapValue = input.series.find((s) => s.gap !== undefined)?.gap;
  const spacingValue = input.series.find(
    (s) => s.spacing !== undefined,
  )?.spacing;

  const series = input.series.map((item, index) => {
    const seriesColor = item.color ?? CHART_COLORS.defaultSeries;
    const entry: Record<string, unknown> = {
      type: "column",
      name: item.name,
      color: seriesColor,
      overlay: { gradient: "none" },
      // Avoid treating `null` as 0 in stacked layouts (draws 1px stripes of
      // later series colors on top of earlier bars — peer-group stories).
      missingValues: "gap",
    };

    if (barVisual) {
      entry.visual = barVisual;
    }

    if (input.signedNegativeValues) {
      entry.data = item.data.map((value) => {
        if (value === null || value === undefined) {
          return null;
        }
        const normalized = normalizeDataPoint(value);
        if (!input.valueLabelsVisible) {
          return normalized;
        }
        const labelColor = normalized.color ?? seriesColor;
        const outside = normalized.value < input.valueLabelOutsideBelow;
        return {
          ...normalized,
          labels: {
            visible: true,
            position: outside ? "outsideEnd" : "insideEnd",
            background: "transparent",
            color: outside ? labelColor : "#FFFFFF",
            font: `600 12px ${CHART_FONT}`,
            content: () => formatBarValue(input, normalized.originalValue),
          },
        };
      });
    } else if (input.valueLabelsVisible) {
      entry.data = item.data.map((value) => {
        if (value === null || value === undefined) {
          return null;
        }
        const outside = value < input.valueLabelOutsideBelow;
        return {
          value,
          labels: {
            visible: true,
            position: outside ? "outsideEnd" : "insideEnd",
            background: "transparent",
            color: outside ? seriesColor : "#FFFFFF",
            font: `600 12px ${CHART_FONT}`,
            content: () => formatBarValue(input, value),
          },
        };
      });
    } else {
      entry.data = item.data;
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
    majorGridLines: { visible: false },
    majorTicks: { visible: false },
    line: { visible: false },
    labels: {
      visible: input.categoryLabelsVisible,
      color: CHART_COLORS.axisLabel,
      font: `500 12px ${CHART_FONT}`,
      content: (e: { value: unknown }) =>
        truncateChartLabel(e.value, input.categoryLabelMaxLength),
    },
  };

  if (input.categoryAxisTitle) {
    categoryAxis.title = {
      text: input.categoryAxisTitle,
      color: CHART_COLORS.axisTitle,
      font: `400 12px ${CHART_FONT}`,
      margin: { top: 8 },
    };
  }

  const valueAxis: Record<string, unknown> = {
    min: 0,
    majorGridLines: {
      visible: true,
      color: CHART_COLORS.gridLine,
      width: 1,
    },
    minorGridLines: { visible: false },
    majorTicks: { visible: false },
    line: { visible: false },
    labels: {
      color: CHART_COLORS.axisTitle,
      font: `500 12px ${CHART_FONT}`,
      ...(input.valueAxisLabelsContent
        ? { content: input.valueAxisLabelsContent }
        : { format: "{0:N1}" }),
    },
  };

  if (input.valueAxisTitle) {
    valueAxis.title = {
      text: input.valueAxisTitle,
      color: CHART_COLORS.axisTitle,
      font: `400 12px ${CHART_FONT}`,
      margin: { right: 8 },
    };
  }

  return {
    transitions: false,
    series,
    categoryAxis,
    valueAxis,
    plotArea: {
      margin: {
        top: input.valueLabelsVisible ? 24 : 8,
        right: 8,
        left: 4,
        bottom: 4,
      },
    },
    legend: {
      visible: input.showLegend,
      position: "bottom",
      orientation: "horizontal",
      align: "start",
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
