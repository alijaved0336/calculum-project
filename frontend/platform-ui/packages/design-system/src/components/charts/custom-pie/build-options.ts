import {
  CHART_COLORS,
  CHART_FONT,
  PIE_DEFAULT_COLORS,
} from "../shared/constants";
import type { CustomPieSlice } from "./types";

export type BuildCustomPieOptionsInput = {
  data: CustomPieSlice[];
  tooltipVisible: boolean;
};

export type ResolvedPieSlice = CustomPieSlice & {
  color: string;
  percent: number;
};

export function resolvePieSlices(
  data: CustomPieSlice[],
): { slices: ResolvedPieSlice[]; total: number } {
  const total = data.reduce((acc, item) => acc + (Number(item.value) || 0), 0);

  const slices = data.map((item, index) => {
    const value = Number(item.value) || 0;
    return {
      category: item.category,
      value,
      color:
        item.color ??
        PIE_DEFAULT_COLORS[index % PIE_DEFAULT_COLORS.length] ??
        CHART_COLORS.defaultSeries,
      percent: total > 0 ? value / total : 0,
    };
  });

  return { slices, total };
}

/** Build Kendo Chart options for a pie chart (legend rendered in Vue). */
export function buildCustomPieOptions(
  input: BuildCustomPieOptionsInput,
): Record<string, unknown> {
  const { slices } = resolvePieSlices(input.data);

  return {
    transitions: false,
    series: [
      {
        type: "pie",
        // Kendo default pie padding is ~60px — eats the container. Zero it so
        // `size` ≈ actual pie diameter.
        padding: 0,
        overlay: { gradient: "none" },
        labels: { visible: false },
        data: slices.map((item) => ({
          category: item.category,
          value: item.value,
          color: item.color,
        })),
      },
    ],
    legend: { visible: false },
    tooltip: {
      visible: input.tooltipVisible,
      format: "{0}",
    },
    chartArea: {
      background: "transparent",
      margin: 0,
      padding: 0,
    },
    plotArea: {
      margin: 0,
      padding: 0,
    },
    seriesDefaults: {
      labels: {
        font: `500 12px ${CHART_FONT}`,
      },
    },
  };
}
