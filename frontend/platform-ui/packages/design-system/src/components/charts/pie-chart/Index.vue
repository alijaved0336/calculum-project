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
import { buildPieChartOptions } from "./build-options";
import type { PieChartItem, PieChartLabelArgs, PieChartSliceClickPayload } from "./types";

defineOptions({
  name: "PieChart",
});

const props = withDefaults(
  defineProps<{
    /** Slices to render (`category` + `value`, optional `color`). */
    items: PieChartItem[];
    /** Show the value/percentage label on each slice. Default: `true`. */
    labelsVisible?: boolean;
    /** Custom slice label formatter. Defaults to showing value and percentage, e.g. `"120 (35%)"`. */
    labelContent?: (e: PieChartLabelArgs) => string;
    /** Show the chart legend. Default: `true`. */
    legendVisible?: boolean;
    /** Show slice tooltips. Default: `true`. */
    tooltipVisible?: boolean;
    /** Chart height (CSS length or px number). Default: `"300px"`. */
    height?: string | number;
  }>(),
  {
    labelsVisible: true,
    labelContent: undefined,
    legendVisible: true,
    tooltipVisible: true,
    height: "300px",
  },
);

const emit = defineEmits<{
  "slice-click": [payload: PieChartSliceClickPayload];
}>();

const rootEl = ref<HTMLElement | null>(null);
const surfaceEl = ref<HTMLElement | null>(null);
const tip = reactive(emptyChartTooltip(CHART_COLORS.defaultSeries));

const chartStyle = computed(() => ({
  width: "100%",
  height: typeof props.height === "number" ? `${props.height}px` : props.height,
}));

const chartOptions = computed(() =>
  buildPieChartOptions({
    items: props.items,
    legendVisible: props.legendVisible,
    tooltipVisible: props.tooltipVisible,
    labelsVisible: props.labelsVisible,
    labelContent: props.labelContent,
  }),
);

function hideTip() {
  tip.visible = false;
}

function onShowTooltip(raw: unknown) {
  const args = raw as KendoShowTooltipArgs;
  if (!props.tooltipVisible || !rootEl.value) {
    return;
  }

  const point = args.point;
  const docPoint = args.anchor?.point;
  if (!point || !docPoint) {
    hideTip();
    return;
  }

  const formatted =
    typeof point.formatValue === "function" && args.format
      ? point.formatValue(args.format)
      : formatChartNumber(point.value);

  const local = documentPointToHost(rootEl.value, {
    left: docPoint.left ?? docPoint.x,
    top: docPoint.top ?? docPoint.y,
  });

  tip.title = String(point.category ?? "");
  tip.value = formatted;
  tip.accent =
    point.options?.color ?? point.series?.color ?? CHART_COLORS.defaultSeries;
  tip.left = local.left;
  tip.top = local.top;
  tip.visible = true;
}

function onSeriesClick(raw: unknown) {
  // @progress/kendo-charts' own Point drawing element never carries an `index` property
  // (confirmed against the raw event payload) - same class of bug already fixed in
  // waterfall-chart/Index.vue's own onSeriesClick, and the same fix: resolve the position from
  // `category` against the exact array `items` was built from.
  const args = raw as { category?: unknown };
  const category = String(args.category ?? "");
  emit("slice-click", {
    category,
    index: props.items.findIndex((item) => item.category === category),
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
    class="ds-pie-chart k-chart k-widget"
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
.ds-pie-chart {
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
