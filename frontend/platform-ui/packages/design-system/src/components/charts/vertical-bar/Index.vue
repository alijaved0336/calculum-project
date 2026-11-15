<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import "hammerjs";
import {
  ChartHoverTooltip,
  CHART_COLORS,
  documentPointToHost,
  emptyChartTooltip,
  formatChartNumber,
  useKendoChart,
  type KendoShowTooltipArgs,
} from "../shared";
import { buildVerticalBarOptions } from "./build-options";
import type { VerticalBarSeries } from "./types";

defineOptions({
  name: "VerticalBarChart",
});

const props = withDefaults(
  defineProps<{
    /** Category labels (X-axis for column charts). */
    categories: string[];
    /** One or more column series. */
    series: VerticalBarSeries[];
    /** Chart height (CSS length or px number). Default: `320`. */
    height?: string | number;
    /** Show the chart legend. Default: auto when any series has a `name`. */
    legendVisible?: boolean;
    /** Show series tooltips. Default: `true`. */
    tooltipVisible?: boolean;
    /** Title along the category (X) axis. */
    categoryAxisTitle?: string;
    /** Title along the value (Y) axis, e.g. `"Days"`. */
    valueAxisTitle?: string;
    /** Custom formatter for value-axis tick labels. Default: `{0:N1}`. */
    valueAxisLabelsContent?: (e: { value: unknown }) => string;
    /** Show numeric labels on columns. Default: `false`. */
    valueLabelsVisible?: boolean;
    /** Custom formatter for bar labels and tooltips. Default: `formatChartNumber`. */
    valueLabelsContent?: (value: number) => string;
    /**
     * Below this value, labels render above the column.
     * Default: `35`.
     */
    valueLabelOutsideBelow?: number;
    /** Show category axis labels. Default: `true`. */
    categoryLabelsVisible?: boolean;
    /** Truncate category labels longer than this (ellipsis). */
    categoryLabelMaxLength?: number;
    /** Round column tops with a 4px radius. Default: `true`. */
    roundedBars?: boolean;
    /**
     * Plot negatives as absolute magnitude (red) and show the signed value in
     * labels/tooltips. Default: `false`.
     */
    signedNegativeValues?: boolean;
  }>(),
  {
    height: 320,
    legendVisible: undefined,
    tooltipVisible: true,
    categoryAxisTitle: undefined,
    valueAxisTitle: undefined,
    valueAxisLabelsContent: undefined,
    valueLabelsVisible: false,
    valueLabelsContent: undefined,
    valueLabelOutsideBelow: 35,
    categoryLabelsVisible: true,
    categoryLabelMaxLength: undefined,
    roundedBars: true,
    signedNegativeValues: false,
  },
);

const rootEl = ref<HTMLElement | null>(null);
const surfaceEl = ref<HTMLElement | null>(null);
const tip = reactive(emptyChartTooltip(CHART_COLORS.defaultSeries));

const showLegend = computed(() => {
  if (props.legendVisible !== undefined) {
    return props.legendVisible;
  }
  return props.series.some((item) => Boolean(item.name?.trim()));
});

const chartStyle = computed(() => ({
  width: "100%",
  height:
    typeof props.height === "number" ? `${props.height}px` : props.height,
}));

const chartOptions = computed(() =>
  buildVerticalBarOptions({
    categories: props.categories,
    series: props.series,
    tooltipVisible: props.tooltipVisible,
    categoryAxisTitle: props.categoryAxisTitle,
    valueAxisTitle: props.valueAxisTitle,
    valueAxisLabelsContent: props.valueAxisLabelsContent,
    valueLabelsVisible: props.valueLabelsVisible,
    valueLabelsContent: props.valueLabelsContent,
    valueLabelOutsideBelow: props.valueLabelOutsideBelow,
    categoryLabelsVisible: props.categoryLabelsVisible,
    categoryLabelMaxLength: props.categoryLabelMaxLength,
    roundedBars: props.roundedBars,
    showLegend: showLegend.value,
    signedNegativeValues: props.signedNegativeValues,
  }),
);

function hideTip() {
  tip.visible = false;
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

  const category = String(point.category ?? "");
  const seriesName = point.series?.name?.trim();
  // When signedNegativeValues is on, `point.value` is the plotted magnitude
  // (see build-options.ts's normalizeDataPoint) - the true, possibly-negative
  // value lives on dataItem.originalValue instead.
  const originalValue = point.dataItem?.originalValue;
  const numericValue =
    props.signedNegativeValues && typeof originalValue === "number"
      ? originalValue
      : point.value;
  const formatted = props.valueLabelsContent
    ? props.valueLabelsContent(Number(numericValue))
    : props.signedNegativeValues && typeof originalValue === "number"
      ? formatChartNumber(originalValue)
      : typeof point.formatValue === "function" && args.format
        ? point.formatValue(args.format)
        : formatChartNumber(point.value);

  const local = documentPointToHost(rootEl.value, {
    left: docPoint.left ?? docPoint.x,
    top: docPoint.top ?? docPoint.y,
  });

  tip.title = seriesName
    ? category
      ? `${category} · ${seriesName}`
      : seriesName
    : category;
  tip.value = formatted;
  tip.accent =
    point.dataItem?.color ??
    point.options?.color ??
    point.series?.color ??
    CHART_COLORS.defaultSeries;
  tip.left = local.left;
  tip.top = local.top;
  tip.visible = true;
}

const { handleMouseLeave } = useKendoChart(surfaceEl, chartOptions, {
  onShowTooltip,
  onHideTooltip: hideTip,
});
</script>

<template>
  <div
    ref="rootEl"
    class="ds-vertical-bar-chart k-chart k-widget"
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
</template>

<style lang="scss" scoped>
.ds-vertical-bar-chart {
  width: 100%;
  min-height: 1px;
  position: relative;
}

.k-chart-surface {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
