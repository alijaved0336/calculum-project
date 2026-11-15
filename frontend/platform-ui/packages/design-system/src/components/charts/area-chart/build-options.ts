import { CHART_COLORS, CHART_FONT } from "../shared/constants";
import type { AreaChartSeries } from "./types";

export type BuildAreaChartOptionsInput = {
  categories: string[];
  series: AreaChartSeries[];
  categoryAxisTitle?: string;
  valueAxisTitle?: string;
  valueMajorUnit?: number;
  valueLabelsContent?: (e: { value: number }) => string;
  tooltipVisible: boolean;
  legendPosition: "top" | "bottom" | "left" | "right";
  showLegend: boolean;
};

/** Build Kendo Chart options for a multi-series area/line chart. */
export function buildAreaChartOptions(
  input: BuildAreaChartOptionsInput,
): Record<string, unknown> {
  const series = input.series.map((item) => ({
    type: item.type ?? "area",
    name: item.name,
    data: item.data,
    color: item.color ?? CHART_COLORS.defaultSeries,
    markers: { visible: false },
  }));

  const categoryAxis: Record<string, unknown> = {
    categories: input.categories,
    majorGridLines: { visible: false },
    majorTicks: { visible: false },
    line: { visible: true, color: CHART_COLORS.gridLine },
    labels: {
      color: CHART_COLORS.axisLabel,
      font: `500 12px ${CHART_FONT}`,
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
    majorGridLines: { visible: true, color: CHART_COLORS.gridLine, width: 1 },
    majorTicks: { visible: false },
    line: { visible: false },
    labels: {
      color: CHART_COLORS.axisLabel,
      font: `500 12px ${CHART_FONT}`,
      content: input.valueLabelsContent,
    },
  };

  if (input.valueMajorUnit !== undefined) {
    valueAxis.majorUnit = input.valueMajorUnit;
  }

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
      margin: { top: 8, right: 8, bottom: 4, left: 4 },
    },
    legend: {
      visible: input.showLegend,
      position: input.legendPosition,
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
