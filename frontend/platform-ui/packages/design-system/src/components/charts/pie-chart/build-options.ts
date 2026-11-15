import { CHART_COLORS, CHART_FONT, PIE_DEFAULT_COLORS } from "../shared/constants";
import { formatChartNumber } from "../shared/format";
import type { PieChartItem, PieChartLabelArgs } from "./types";

export type BuildPieChartOptionsInput = {
  items: PieChartItem[];
  legendVisible: boolean;
  tooltipVisible: boolean;
  labelsVisible: boolean;
  labelContent?: (e: PieChartLabelArgs) => string;
};

/**
 * Space reserved around the pie for its outside labels, in px.
 *
 * Kendo's own leader-line distance is 35; a label line is ~16px tall on the 12px font this component
 * sets, and the text itself extends horizontally past the line's end. 56 covers the line plus the
 * line height with a little slack, which is what stops the top label being cut off by the canvas.
 */
const PIE_LABEL_PADDING_PX = 56;

function defaultLabelContent(e: PieChartLabelArgs): string {
  const percentage = (e.percentage * 100).toFixed(1);
  return `${formatChartNumber(e.value)} (${percentage}%)`;
}

/** Build Kendo Chart options for a pie chart. */
export function buildPieChartOptions(
  input: BuildPieChartOptionsInput,
): Record<string, unknown> {
  // PieChartItem's own contract promises the Kendo theme palette when `color` is omitted, but
  // Kendo's `colorField` lookup renders a point with no fill at all (not a palette color) when
  // the field is undefined on that data item - so every item needs a concrete color before it
  // reaches the series, same fallback custom-pie/build-options.ts already uses.
  const data = input.items.map((item, index) => ({
    ...item,
    color: item.color ?? PIE_DEFAULT_COLORS[index % PIE_DEFAULT_COLORS.length] ?? CHART_COLORS.defaultSeries,
  }));

  return {
    transitions: false,
    series: [
      {
        type: "pie",
        data,
        field: "value",
        categoryField: "category",
        colorField: "color",
        // Room for the labels, which Kendo draws OUTSIDE the pie on leader lines. Padding shrinks the
        // circle instead of the canvas, so the topmost and bottommost labels have somewhere to go;
        // without it they are laid out past the canvas edge and clipped — the slice count decides
        // which one loses, so it looks intermittent rather than systematic. Sized for a label at the
        // default leader distance plus its own line height.
        padding: input.labelsVisible ? PIE_LABEL_PADDING_PX : 8,
        labels: {
          visible: input.labelsVisible,
          background: "transparent",
          color: CHART_COLORS.axisLabel,
          font: `600 12px ${CHART_FONT}`,
          content: input.labelContent ?? defaultLabelContent,
        },
      },
    ],
    legend: {
      visible: input.legendVisible,
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
