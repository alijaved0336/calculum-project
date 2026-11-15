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
import { buildAreaChartOptions } from "./build-options";
import type { AreaChartSeries } from "./types";

defineOptions({
  name: "AreaChart",
});

const props = withDefaults(
  defineProps<{
    /** Category labels (X-axis). */
    categories: string[];
    /** One or more series, rendered in the given order. */
    series: AreaChartSeries[];
    /** Title along the category (X) axis. */
    categoryAxisTitle?: string;
    /** Title along the value (Y) axis. */
    valueAxisTitle?: string;
    /** Fixed step between value-axis labels/gridlines. Omit to let Kendo auto-calculate. */
    valueMajorUnit?: number;
    /** Custom formatter for value-axis labels, e.g. `(e) => \`${e.value / 1000}k\`` */
    valueLabelsContent?: (e: { value: number }) => string;
    /** Show the chart legend. Default: `true`. */
    legendVisible?: boolean;
    /** Legend position. Default: `"bottom"`. */
    legendPosition?: "top" | "bottom" | "left" | "right";
    /** Show series tooltips. Default: `true`. */
    tooltipVisible?: boolean;
    /** Chart height (CSS length or px number). Default: `"300px"`. */
    height?: string | number;
  }>(),
  {
    categoryAxisTitle: undefined,
    valueAxisTitle: undefined,
    valueMajorUnit: undefined,
    valueLabelsContent: undefined,
    legendVisible: true,
    legendPosition: "bottom",
    tooltipVisible: true,
    height: "300px",
  },
);

const rootEl = ref<HTMLElement | null>(null);
const surfaceEl = ref<HTMLElement | null>(null);
const tip = reactive(emptyChartTooltip(CHART_COLORS.defaultSeries));

const chartStyle = computed(() => ({
  width: "100%",
  height: typeof props.height === "number" ? `${props.height}px` : props.height,
}));

const chartOptions = computed(() =>
  buildAreaChartOptions({
    categories: props.categories,
    series: props.series,
    categoryAxisTitle: props.categoryAxisTitle,
    valueAxisTitle: props.valueAxisTitle,
    valueMajorUnit: props.valueMajorUnit,
    valueLabelsContent: props.valueLabelsContent,
    tooltipVisible: props.tooltipVisible,
    legendPosition: props.legendPosition,
    showLegend: props.legendVisible,
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
  const formatted =
    typeof point.formatValue === "function" && args.format
      ? point.formatValue(args.format)
      : formatChartNumber(point.value);

  const local = documentPointToHost(rootEl.value, {
    left: docPoint.left ?? docPoint.x,
    top: docPoint.top ?? docPoint.y,
  });

  tip.title = seriesName ? `${category} · ${seriesName}` : category;
  tip.value = formatted;
  tip.accent =
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
    class="ds-area-chart k-chart k-widget"
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
.ds-area-chart {
  width: 100%;
  min-height: 1px;
  position: relative;
  flex-shrink: 0;
}

.k-chart-surface {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
