<script setup lang="ts">
import {
  computed,
  h,
  onMounted,
  ref,
  useSlots,
  watch,
  type VNode,
} from "vue";
import { ArcGauge as KendoArcGauge } from "@progress/kendo-vue-gauges";
import { CHART_COLORS } from "../shared";
import {
  ARC_GAUGE_ASPECT_RATIO,
  ARC_GAUGE_DEFAULT_SIZE,
} from "./constants";
import {
  clampToScale,
  gaugePlotValue as toPlotValue,
  mergeArcScale,
  parseSizePx,
  resolveActiveColor,
  scaleBounds,
} from "./scale";
import type { ArcGaugeProps } from "./types";
import { useArcGaugeDecoratePass } from "./useDecoratePass";

defineOptions({
  name: "ArcGauge",
});

const props = withDefaults(defineProps<ArcGaugeProps>(), {
  color: CHART_COLORS.defaultSeries,
  colors: undefined,
  opacity: undefined,
  scale: undefined,
  transitions: true,
  size: ARC_GAUGE_DEFAULT_SIZE,
  showCenterValue: true,
  centerSuffix: "%",
  centerCaption: undefined,
  centerMetric: undefined,
  stripeOverlay: true,
  dottedTrack: true,
});

const slots = useSlots();
const rootEl = ref<HTMLElement | null>(null);

const mergedScale = computed(() => mergeArcScale(props.scale));

const bounds = computed(() => scaleBounds(mergedScale.value));

const clampedValue = computed(() =>
  clampToScale(props.value, bounds.value.min, bounds.value.max),
);

const gaugePlotValue = computed(() =>
  toPlotValue(clampedValue.value, bounds.value.min, bounds.value.max),
);

const activeColor = computed(() =>
  resolveActiveColor(
    clampedValue.value,
    props.color ?? CHART_COLORS.defaultSeries,
    props.colors,
    bounds.value.min,
    bounds.value.max,
  ),
);

const sizePx = computed(() =>
  parseSizePx(props.size, ARC_GAUGE_DEFAULT_SIZE),
);

const plotStyle = computed(() => ({
  width: `${sizePx.value}px`,
  aspectRatio: String(ARC_GAUGE_ASPECT_RATIO),
}));

const { scheduleDecoratePassNextTick } = useArcGaugeDecoratePass(
  rootEl,
  () => ({
    color: activeColor.value,
    stripeOverlay: props.stripeOverlay,
    value: clampedValue.value,
    min: bounds.value.min,
    max: bounds.value.max,
  }),
);

onMounted(() => scheduleDecoratePassNextTick());

watch(
  () =>
    [
      props.value,
      props.color,
      props.colors,
      props.stripeOverlay,
      props.size,
      props.scale,
      props.transitions,
    ] as const,
  () => scheduleDecoratePassNextTick(),
);

/**
 * Kendo `centerRender` render-fn signature:
 * `(h, defaultRendering, props, listeners, defaultSlots)`.
 * Styles live in scoped CSS (+ `:deep`) — Kendo may mount the label outside.
 */
function defaultCenterRender(
  createElement: typeof h,
  _defaultRendering: unknown,
  _centerProps: { value?: number; color?: string },
): VNode {
  const value = clampedValue.value;
  const children: VNode[] = [];

  if (props.centerCaption) {
    children.push(
      createElement(
        "div",
        { class: "ds-arc-gauge__center-caption" },
        String(props.centerCaption),
      ),
    );
  }

  children.push(
    createElement(
      "div",
      { class: "ds-arc-gauge__center-value" },
      `${value}${props.centerSuffix}`,
    ),
  );

  if (props.centerMetric !== undefined && props.centerMetric !== "") {
    children.push(
      createElement(
        "div",
        { class: "ds-arc-gauge__center-metric" },
        String(props.centerMetric),
      ),
    );
  }

  return createElement("div", { class: "ds-arc-gauge__center" }, children);
}

function slotCenterRender(
  _createElement: typeof h,
  _defaultRendering: unknown,
  _centerProps: { value?: number; color?: string },
): VNode | VNode[] | undefined {
  return slots.center?.({
    value: clampedValue.value,
    color: String(activeColor.value),
  }) as VNode | VNode[] | undefined;
}

const centerRender = computed(() => {
  if (slots.center) {
    return slotCenterRender;
  }
  if (props.showCenterValue) {
    return defaultCenterRender;
  }
  return undefined;
});
</script>

<template>
  <div
    ref="rootEl"
    class="ds-arc-gauge"
  >
    <div
      class="ds-arc-gauge__plot"
      :style="plotStyle"
    >
      <div class="ds-arc-gauge__square">
        <div
          v-if="dottedTrack"
          class="ds-arc-gauge__overlay"
          aria-hidden="true"
        >
          <div class="ds-arc-gauge__overlay-inner" />
        </div>
        <KendoArcGauge
          class="ds-arc-gauge__gauge"
          :value="gaugePlotValue"
          :color="color"
          :colors="colors"
          :opacity="opacity"
          :scale="mergedScale"
          :transitions="transitions"
          :center-render="centerRender"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ds-arc-gauge {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 300px;
  font-family: var(--font-family-base);
  color: var(--color-text-1);
  overflow: visible;
}

.ds-arc-gauge__plot {
  position: relative;
  flex-shrink: 0;
  padding: 10px 10px 0;
  box-sizing: content-box;
  overflow: hidden;
}

.ds-arc-gauge__square {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ds-arc-gauge__overlay {
  position: absolute;
  z-index: -1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: none;

  &-inner {
    position: relative;
    top: -3%;
    width: 77%;
    aspect-ratio: 1 / 0.54;
    border-top-left-radius: 100vmax;
    border-top-right-radius: 100vmax;
    border: 3px dotted var(--color-text-4);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 3px), 0 calc(100% - 3px));
  }
}

.ds-arc-gauge__gauge {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ds-arc-gauge :deep(svg),
.ds-arc-gauge :deep(.k-gauge),
.ds-arc-gauge :deep(.k-arcgauge) {
  overflow: visible !important;
}

.ds-arc-gauge :deep(.k-arcgauge-label) {
  z-index: 1;
  pointer-events: none;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
}

.ds-arc-gauge__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  text-align: center;
  line-height: 1.2;
}

/* BodyText `sm` — :deep for Kendo-mounted center */
.ds-arc-gauge__center-caption,
.ds-arc-gauge :deep(.ds-arc-gauge__center-caption) {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.43em;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--color-text-4);
}

/* DisplayText `lg` */
.ds-arc-gauge__center-value,
.ds-arc-gauge :deep(.ds-arc-gauge__center-value) {
  margin: 0 !important;
  font-size: 48px !important;
  line-height: 60px !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-1);
}

/* BodyText `sm` */
.ds-arc-gauge__center-metric,
.ds-arc-gauge :deep(.ds-arc-gauge__center-metric) {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.43em;
  font-weight: 500;
  letter-spacing: -0.03em;
  color: var(--color-text-4);
  font-variant-numeric: tabular-nums;
}
</style>
