<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import "hammerjs";
import {
  ChartHoverTooltip,
  CHART_COLORS,
  documentPointToHost,
  emptyChartTooltip,
  formatChartNumber,
  formatChartPercent,
  useKendoChart,
  type KendoShowTooltipArgs,
} from "../shared";
import {
  buildCustomPieOptions,
  resolvePieSlices,
} from "./build-options";
import type { CustomPieSlice } from "./types";

defineOptions({
  name: "CustomPieChart",
});

const props = withDefaults(
  defineProps<{
    /** Pie slices (`category` + `value`, optional `color`). */
    data: CustomPieSlice[];
    /**
     * Chart box size (CSS length or px number). Default: `168`.
     * With pie `padding: 0` this is effectively the pie diameter.
     */
    size?: string | number;
    /** Show hover tooltips. Default: `true`. */
    tooltipVisible?: boolean;
    /** Show the side legend (Total + rows). Default: `true`. */
    legendVisible?: boolean;
    /** Label above the total number. Default: `"Total"`. */
    totalLabel?: string;
    /** Show `(xx.xx%)` next to each legend value. Default: `true`. */
    showPercentages?: boolean;
  }>(),
  {
    size: 168,
    tooltipVisible: true,
    legendVisible: true,
    totalLabel: "Total",
    showPercentages: true,
  },
);

const rootEl = ref<HTMLElement | null>(null);
const surfaceEl = ref<HTMLElement | null>(null);
const tip = reactive(emptyChartTooltip(CHART_COLORS.defaultSeries));

const resolved = computed(() => resolvePieSlices(props.data));

const chartStyle = computed(() => {
  const size =
    typeof props.size === "number" ? `${props.size}px` : props.size;
  return {
    width: size,
    height: size,
  };
});

const chartOptions = computed(() =>
  buildCustomPieOptions({
    data: props.data,
    tooltipVisible: props.tooltipVisible,
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
  const value = Number(point.value);
  const slice = resolved.value.slices.find((s) => s.category === category);
  const percent = slice?.percent ?? 0;
  const formattedValue = formatChartNumber(value);
  const formattedPercent = formatChartPercent(percent);

  const local = documentPointToHost(rootEl.value, {
    left: docPoint.left ?? docPoint.x,
    top: docPoint.top ?? docPoint.y,
  });

  tip.title = "";
  tip.value = props.showPercentages
    ? `${category}: ${formattedValue} (${formattedPercent})`
    : `${category}: ${formattedValue}`;
  tip.accent =
    point.options?.color ??
    slice?.color ??
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
    class="ds-custom-pie-chart"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="ds-custom-pie-chart__plot k-chart k-widget"
      :style="chartStyle"
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

    <div
      v-if="legendVisible"
      class="ds-custom-pie-chart__legend"
    >
      <div class="ds-custom-pie-chart__total">
        <div class="ds-custom-pie-chart__total-label">
          {{ totalLabel }}
        </div>
        <div class="ds-custom-pie-chart__total-value">
          {{ formatChartNumber(resolved.total) }}
        </div>
      </div>

      <ul class="ds-custom-pie-chart__legend-list">
        <li
          v-for="slice in resolved.slices"
          :key="slice.category"
          class="ds-custom-pie-chart__legend-item"
        >
          <span
            class="ds-custom-pie-chart__legend-swatch"
            :style="{ background: slice.color }"
          />
          <span class="ds-custom-pie-chart__legend-label">
            {{ slice.category }}
          </span>
          <span class="ds-custom-pie-chart__legend-metrics">
            <span class="ds-custom-pie-chart__legend-value">
              {{ formatChartNumber(slice.value) }}
            </span>
            <span
              v-if="showPercentages"
              class="ds-custom-pie-chart__legend-percent"
            >
              ({{ formatChartPercent(slice.percent) }})
            </span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ds-custom-pie-chart {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem 2rem;
  font-family: var(--font-family-base);
  color: var(--color-text-primary, #101828);
}

.ds-custom-pie-chart__plot {
  position: relative;
  flex-shrink: 0;
  min-height: 1px;
}

.k-chart-surface {
  position: relative;
  width: 100%;
  height: 100%;
}

.ds-custom-pie-chart__legend {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 12rem;
}

.ds-custom-pie-chart__total-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #667085);
  line-height: 1.25;
}

.ds-custom-pie-chart__total-value {
  margin-top: 0.125rem;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary, #101828);
}

.ds-custom-pie-chart__legend-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ds-custom-pie-chart__legend-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.35;
}

.ds-custom-pie-chart__legend-swatch {
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.3rem;
  border-radius: 999px;
  align-self: start;
}

.ds-custom-pie-chart__legend-label {
  color: var(--color-text-secondary, #667085);
  font-weight: 500;
}

.ds-custom-pie-chart__legend-metrics {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  white-space: nowrap;
}

.ds-custom-pie-chart__legend-value {
  font-weight: 700;
  color: var(--color-text-primary, #101828);
}

.ds-custom-pie-chart__legend-percent {
  font-weight: 500;
  color: var(--color-text-secondary, #667085);
}
</style>
