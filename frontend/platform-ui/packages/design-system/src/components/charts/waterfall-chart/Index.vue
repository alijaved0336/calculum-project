<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import "hammerjs";
import {
  ChartHoverTooltip,
  CHART_COLORS,
  documentPointToHost,
  emptyChartTooltip,
  useKendoChart,
  type KendoShowTooltipArgs,
} from "../shared";
import { CustomChartLegend, type ChartLegendItem } from "../legend";
import { buildWaterfallOptions } from "./build-options";
import type { WaterfallBarClickPayload, WaterfallDataPoint } from "./types";

defineOptions({
  name: "WaterfallChart",
});

const props = withDefaults(
  defineProps<{
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
    /** Font weight of the category (X) axis title (e.g. `400`, `600`, `700`). Default: `400`. */
    categoryAxisTitleFontWeight?: number;
    /** Font size (px) of the category (X) axis title. Default: `12`. */
    categoryAxisTitleFontSize?: number;
    /** Title along the value (Y) axis. */
    valueAxisTitle?: string;
    /** Color of the value (Y) axis title. Defaults to a light gray. */
    valueAxisTitleColor?: string;
    /** Font weight of the value (Y) axis title (e.g. `400`, `600`, `700`). Default: `400`. */
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
    /** Font weight of the value (Y) axis tick labels (e.g. `400`, `600`, `700`). Default: `600`. */
    valueAxisLabelFontWeight?: number;
    /** Round bar corners. Default: `true`. */
    roundedBars?: boolean;
    /** Swap the positive/negative bar colors (grey for positive, blue for negative). Default: `false`
     * (blue for positive, red for negative). */
    invertColors?: boolean;
    /** AB#20517: the legend swatches to render, in display order - the caller resolves its own
     * text and colors (a source-based legend has no fixed positive/negative/total shape the way
     * AB#20420's original version did), this component only draws them. Omitted (the default)
     * renders no legend at all. */
    legendItems?: ChartLegendItem[];
  }>(),
  {
    height: 320,
    tooltipVisible: true,
    categoryAxisTitle: undefined,
    categoryAxisTitleColor: undefined,
    categoryAxisTitleFontWeight: undefined,
    categoryAxisTitleFontSize: undefined,
    valueAxisTitle: undefined,
    valueAxisTitleColor: undefined,
    valueAxisTitleFontWeight: undefined,
    valueAxisTitleFontSize: undefined,
    valueLabelsVisible: true,
    valueLabelsContent: undefined,
    categoryLabelsRotated: true,
    categoryLabelMaxLength: undefined,
    valueAxisLabelsContent: undefined,
    valueAxisLabelRotation: undefined,
    valueAxisLabelColor: undefined,
    valueAxisLabelFontWeight: undefined,
    roundedBars: true,
    invertColors: false,
    legendItems: undefined,
  },
);

const emit = defineEmits<{
  "bar-click": [payload: WaterfallBarClickPayload];
}>();

const rootEl = ref<HTMLElement | null>(null);
const surfaceEl = ref<HTMLElement | null>(null);
const tip = reactive(emptyChartTooltip(CHART_COLORS.defaultSeries));

const chartStyle = computed(() => ({
  width: "100%",
  height: typeof props.height === "number" ? `${props.height}px` : props.height,
}));

const legendItems = computed<ChartLegendItem[]>(() => props.legendItems ?? []);

const chartOptions = computed(() =>
  buildWaterfallOptions({
    data: props.data,
    tooltipVisible: props.tooltipVisible,
    categoryAxisTitle: props.categoryAxisTitle,
    categoryAxisTitleColor: props.categoryAxisTitleColor,
    categoryAxisTitleFontWeight: props.categoryAxisTitleFontWeight,
    categoryAxisTitleFontSize: props.categoryAxisTitleFontSize,
    valueAxisTitle: props.valueAxisTitle,
    valueAxisTitleColor: props.valueAxisTitleColor,
    valueAxisTitleFontWeight: props.valueAxisTitleFontWeight,
    valueAxisTitleFontSize: props.valueAxisTitleFontSize,
    valueLabelsVisible: props.valueLabelsVisible,
    valueLabelsContent: props.valueLabelsContent,
    categoryLabelsRotated: props.categoryLabelsRotated,
    categoryLabelMaxLength: props.categoryLabelMaxLength,
    valueAxisLabelsContent: props.valueAxisLabelsContent,
    valueAxisLabelRotation: props.valueAxisLabelRotation,
    valueAxisLabelColor: props.valueAxisLabelColor,
    valueAxisLabelFontWeight: props.valueAxisLabelFontWeight,
    roundedBars: props.roundedBars,
    invertColors: props.invertColors,
  }),
);

function hideTip() {
  tip.visible = false;
}

/**
 * A near-zero delta reads as a range instead of a flat number — a bar close enough to zero that
 * one decimal would round it to "0.0" still needs to say which side of zero it is on.
 */
function formatTooltipValue(value: number): string {
  if (value > -0.1 && value < 0.1) {
    return value >= 0 ? "< 0.1" : "> -0.1";
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function onShowTooltip(raw: unknown) {
  const args = raw as KendoShowTooltipArgs;
  if (!props.tooltipVisible || args.crosshair || !rootEl.value) {
    return;
  }

  const point = args.point;
  const docPoint = args.anchor?.point;
  if (!point || !docPoint) {
    hideTip();
    return;
  }

  const local = documentPointToHost(rootEl.value, {
    left: docPoint.left ?? docPoint.x,
    top: docPoint.top ?? docPoint.y,
  });

  tip.title = String(point.category ?? "");
  tip.value = formatTooltipValue(Number(point.value ?? 0));
  tip.accent = point.options?.color ?? point.series?.color ?? CHART_COLORS.defaultSeries;
  tip.left = local.left;
  tip.top = local.top;
  tip.visible = true;
}

function onSeriesClick(raw: unknown) {
  const args = raw as { category?: unknown; dataItem?: WaterfallDataPoint };
  const category = String(args.category ?? "");
  // @progress/kendo-charts never sets an `index` on a waterfall point (unlike the classic
  // kendo.chart widget AP's own inline chart uses) - `point.index` is always undefined here.
  // `point.dataItem` isn't a reliable reference back into `props.data` either (confirmed live:
  // the waterfall series' own point-building rebinds it rather than reusing `series.data[i]` as
  // categorical-chart.js's generic path does) - `indexOf(dataItem)` always came back -1. Kendo DOES
  // resolve `category` from this series' own `categoryField` off the exact same `props.data`
  // though, so matching on it is what actually identifies which bar was clicked.
  const index = props.data.findIndex((point) => point.category === category);
  // `args.dataItem` isn't a reliable reference into `props.data` either (see the comment above) -
  // `isSummary` must come from the same trusted source `index` was just resolved from, not from
  // dataItem's own (possibly rebound) `summary` field.
  emit("bar-click", {
    category,
    index,
    isSummary: props.data[index]?.summary === "total",
  });
}

const { handleMouseLeave } = useKendoChart(surfaceEl, chartOptions, {
  onShowTooltip,
  onHideTooltip: hideTip,
  onSeriesClick,
});
</script>

<template>
  <div class="ds-waterfall-chart-wrapper">
    <div
      ref="rootEl"
      class="ds-waterfall-chart k-chart k-widget"
      :style="chartStyle"
      @mouseleave="handleMouseLeave"
    >
      <div
        ref="surfaceEl"
        class="k-chart-surface"
      />
      <ChartHoverTooltip
        v-if="tooltipVisible"
        :tip="tip"
      />
    </div>
    <CustomChartLegend
      v-if="legendItems.length > 0"
      class="ds-waterfall-chart__legend"
      :legend-items="legendItems"
    />
  </div>
</template>

<style lang="scss" scoped>
.ds-waterfall-chart {
  width: 100%;
  min-height: 1px;
  position: relative;
}

.ds-waterfall-chart__legend {
  margin-top: 0.5rem;
}

.k-chart-surface {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
