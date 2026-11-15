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
import {
  buildHorizontalBarOptions,
  resolveHorizontalBarHeight,
} from "./build-options";
import type { HorizontalBarClickPayload, HorizontalBarSeries } from "./types";

defineOptions({
  name: "HorizontalBarChart",
});

const props = withDefaults(
  defineProps<{
    /** Category labels (Y-axis for horizontal bars). */
    categories: string[];
    /** One or more bar series (`data` aligned with `categories`). */
    series: HorizontalBarSeries[];
    /**
     * Optional fixed height (CSS length or px number).
     * When omitted, height scales with `categories.length`.
     */
    height?: string | number;
    /**
     * Show legend. When omitted, legend is shown if any series has a `name`.
     */
    legendVisible?: boolean;
    /** Show series tooltips. Default: `true`. */
    tooltipVisible?: boolean;
    /** Title along the category (Y) axis. */
    categoryAxisTitle?: string;
    /** Color of the category (Y) axis title. Defaults to a light gray. */
    categoryAxisTitleColor?: string;
    /** Font weight of the category (Y) axis title (e.g. `400`, `600`, `700`). Default: `400`. */
    categoryAxisTitleFontWeight?: number;
    /** Font size (px) of the category (Y) axis title. Default: `12`. */
    categoryAxisTitleFontSize?: number;
    /** Title along the value (X) axis. */
    valueAxisTitle?: string;
    /** Show numeric labels at the end of each bar. */
    valueLabelsVisible?: boolean;
    /** Custom formatter for the bar-end value labels. Defaults to a locale-formatted number. */
    valueLabelsContent?: (e: { value: unknown }) => string;
    /** Custom formatter for the value (X) axis tick labels. */
    valueAxisLabelsContent?: (e: { value: unknown }) => string;
    /** Rotate value (X) axis tick labels (degrees, or `"auto"`). */
    valueAxisLabelRotation?: number | "auto";
    /** Color of the value (X) axis tick labels. Defaults to a light gray. */
    valueAxisLabelColor?: string;
    /** Font weight of the value (X) axis tick labels (e.g. `400`, `600`, `700`). Default: `500`. */
    valueAxisLabelFontWeight?: number;
    /** Truncate category labels longer than this (ellipsis). */
    categoryLabelMaxLength?: number;
    /** Round bar corners with a 4px radius. Default: `true`. */
    roundedBars?: boolean;
  }>(),
  {
    height: undefined,
    legendVisible: undefined,
    tooltipVisible: true,
    categoryAxisTitle: undefined,
    categoryAxisTitleColor: undefined,
    categoryAxisTitleFontWeight: undefined,
    categoryAxisTitleFontSize: undefined,
    valueAxisTitle: undefined,
    valueLabelsVisible: false,
    valueLabelsContent: undefined,
    valueAxisLabelsContent: undefined,
    valueAxisLabelRotation: undefined,
    valueAxisLabelColor: undefined,
    valueAxisLabelFontWeight: undefined,
    categoryLabelMaxLength: undefined,
    roundedBars: true,
  },
);

const emit = defineEmits<{
  "bar-click": [payload: HorizontalBarClickPayload];
}>();

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
  height: resolveHorizontalBarHeight({
    height: props.height,
    categoryCount: props.categories.length,
    hasCategoryAxisTitle: Boolean(props.categoryAxisTitle),
    hasValueAxisTitle: Boolean(props.valueAxisTitle),
    showLegend: showLegend.value,
  }),
}));

const chartOptions = computed(() =>
  buildHorizontalBarOptions({
    categories: props.categories,
    series: props.series,
    legendVisible: props.legendVisible,
    tooltipVisible: props.tooltipVisible,
    categoryAxisTitle: props.categoryAxisTitle,
    categoryAxisTitleColor: props.categoryAxisTitleColor,
    categoryAxisTitleFontWeight: props.categoryAxisTitleFontWeight,
    categoryAxisTitleFontSize: props.categoryAxisTitleFontSize,
    valueAxisTitle: props.valueAxisTitle,
    valueLabelsVisible: props.valueLabelsVisible,
    valueLabelsContent: props.valueLabelsContent,
    valueAxisLabelsContent: props.valueAxisLabelsContent,
    valueAxisLabelRotation: props.valueAxisLabelRotation,
    valueAxisLabelColor: props.valueAxisLabelColor,
    valueAxisLabelFontWeight: props.valueAxisLabelFontWeight,
    categoryLabelMaxLength: props.categoryLabelMaxLength,
    roundedBars: props.roundedBars,
    showLegend: showLegend.value,
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
  // `point.value` is the plotted magnitude (see build-options.ts's normalizeDataPoint) - the
  // true, possibly-negative value lives on dataItem.originalValue instead.
  const originalValue = point.dataItem?.originalValue;
  const formatted =
    typeof originalValue === "number"
      ? formatChartNumber(originalValue)
      : typeof point.formatValue === "function" && args.format
        ? point.formatValue(args.format)
        : formatChartNumber(point.value);

  const local = documentPointToHost(rootEl.value, {
    left: docPoint.left ?? docPoint.x,
    top: docPoint.top ?? docPoint.y,
  });

  tip.title = seriesName ? `${category} · ${seriesName}` : category;
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

function onSeriesClick(raw: unknown) {
  // @progress/kendo-charts' own Point/Bar drawing element never carries an `index` property
  // (confirmed against the raw event payload) - same class of bug already fixed in
  // waterfall-chart/Index.vue's own onSeriesClick, and the same fix: resolve the position from
  // `category` against the exact array `:categories` was built from, since that's guaranteed to be
  // in the same order `displayed.value[index]` (OverviewMetricsCard.vue) expects.
  const args = raw as { category?: unknown };
  const category = String(args.category ?? "");
  emit("bar-click", {
    category,
    index: props.categories.indexOf(category),
  });
}

const { handleMouseLeave } = useKendoChart(surfaceEl, chartOptions, {
  onShowTooltip,
  onHideTooltip: hideTip,
  onSeriesClick,
});
</script>

<template>
  <div
    ref="rootEl"
    class="ds-horizontal-bar-chart k-chart k-widget"
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
.ds-horizontal-bar-chart {
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
