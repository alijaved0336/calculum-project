<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import {
  RangeSlider as KendoRangeSlider,
  SliderLabel,
} from "@progress/kendo-vue-inputs";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import {
  RANGE_SLIDER_DEFAULT_STEP,
  RANGE_SLIDER_DEFAULT_TICK_COUNT,
  type RangeSliderFormatValue,
  type RangeSliderValue,
} from "./types";

defineOptions({
  name: "RangeSlider",
});

const props = withDefaults(
  defineProps<{
    /** Controlled range (`v-model`). */
    modelValue?: RangeSliderValue;
    min: number;
    max: number;
    step?: number;
    disabled?: boolean;
    vertical?: boolean;
    /**
     * Number of equally spaced scale marks, including min and max.
     * Labels are rounded to integers (`5` → 0, 25, 50, 75, 100).
     * `0` hides labels. Ignored when `ticks` is set.
     */
    tickCount?: number;
    /** Explicit label positions. Overrides `tickCount`. */
    ticks?: number[];
    /** Formats thumb tooltips and scale labels. */
    formatValue?: RangeSliderFormatValue;
    id?: string;
  }>(),
  {
    modelValue: undefined,
    step: RANGE_SLIDER_DEFAULT_STEP,
    disabled: false,
    vertical: false,
    tickCount: RANGE_SLIDER_DEFAULT_TICK_COUNT,
    ticks: undefined,
    formatValue: undefined,
    id: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: RangeSliderValue];
  change: [value: RangeSliderValue];
}>();

const rootRef = ref<HTMLElement | null>(null);
const innerValue = ref<RangeSliderValue | null>(null);
const activeHandle = ref<"start" | "end" | null>(null);
const dragging = ref(false);

const resolvedStep = computed(() => {
  const step = props.step;
  return !step || step <= 0 || Number.isNaN(step)
    ? RANGE_SLIDER_DEFAULT_STEP
    : step;
});

/** Kendo snaps keyboard via `rangeReducer`, but drag payload is raw — snap here. */
function snapRange(value: RangeSliderValue): RangeSliderValue {
  const { min, max } = props;
  const step = resolvedStep.value;
  const decimals = String(step).split(".")[1]?.length ?? 0;

  const snap = (raw: number) => {
    if (raw <= min) return min;
    if (raw >= max) return max;
    const next = min + Math.round((raw - min) / step) * step;
    return Math.min(max, Math.max(min, Number(next.toFixed(decimals))));
  };

  const start = snap(value.start);
  const end = snap(value.end);
  return start <= end ? { start, end } : { start: end, end: start };
}

function formatTick(value: number): string {
  return props.formatValue?.(value) ?? String(value);
}

const currentValue = computed(() =>
  snapRange(
    props.modelValue ??
      innerValue.value ?? { start: props.min, end: props.max },
  ),
);

const resolvedTicks = computed(() => {
  if (props.ticks?.length) {
    return [
      ...new Set(
        props.ticks.map((tick) =>
          Math.min(props.max, Math.max(props.min, tick)),
        ),
      ),
    ].sort((a, b) => a - b);
  }

  const count = props.tickCount ?? 0;
  if (count < 1) return [];
  if (count === 1) return [props.min];

  return Array.from({ length: count }, (_, index) => {
    const raw = props.min + ((props.max - props.min) * index) / (count - 1);
    if (index === 0) return props.min;
    if (index === count - 1) return props.max;
    return raw;
  });
});

type HandleNode = HTMLElement & { titleExpando?: string };

function dragHandles(): HandleNode[] {
  return [...(rootRef.value?.querySelectorAll<HandleNode>(".k-draghandle") ?? [])];
}

function handleFromEvent(event: Event): HandleNode | null {
  const el = event.target;
  if (!(el instanceof Element)) return null;
  const handle = el.closest(".k-draghandle");
  if (handle instanceof HTMLElement && rootRef.value?.contains(handle)) {
    return handle as HandleNode;
  }
  return null;
}

function whichHandle(handle: HandleNode): "start" | "end" {
  const handles = dragHandles();
  return handle === handles.at(-1) && handles.length > 1 ? "end" : "start";
}

/**
 * Re-query the live thumb after Kendo patches DOM. `currentValue` is a
 * dependency so the Tooltip `targetElement` does not keep a detached node.
 */
const tooltipTarget = computed(() => {
  void currentValue.value;
  const which = activeHandle.value;
  if (!which || props.disabled) return undefined;
  const handles = dragHandles();
  return which === "end" ? handles.at(-1) : handles[0];
});

const tooltipOpen = computed(
  () => Boolean(tooltipTarget.value) && !props.disabled,
);

function isDragHandle(target: HTMLElement) {
  return !props.disabled && Boolean(target.classList?.contains("k-draghandle"));
}

/** Kendo resets handle `title` to the localized "Drag" string on every render. */
async function syncHandleTitles() {
  await nextTick();
  const values = [currentValue.value.start, currentValue.value.end];
  dragHandles().forEach((handle, index) => {
    const raw = values[index] ?? Number(handle.getAttribute("aria-valuenow"));
    if (Number.isNaN(raw)) return;
    const title = formatTick(raw);
    handle.title = title;
    handle.titleExpando = title;
  });
}

function onChange(event: { value?: RangeSliderValue }) {
  if (props.disabled || !event?.value) return;
  const next = snapRange(event.value);
  innerValue.value = next;
  emit("update:modelValue", next);
  emit("change", next);
}

function onPointerOver(event: PointerEvent) {
  if (props.disabled) return;
  const handle = handleFromEvent(event);
  if (handle) activeHandle.value = whichHandle(handle);
}

function onPointerOut(event: PointerEvent) {
  if (dragging.value) return;
  const related = event.relatedTarget;
  if (
    related instanceof Element &&
    (related.closest(".k-draghandle") || related.closest(".k-tooltip"))
  ) {
    return;
  }
  activeHandle.value = null;
}

function onPointerUp() {
  dragging.value = false;
  if (!rootRef.value?.querySelector(".k-draghandle:hover")) {
    activeHandle.value = null;
  }
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled) return;
  const handle = handleFromEvent(event);
  if (!handle) return;
  activeHandle.value = whichHandle(handle);
  dragging.value = true;
  window.addEventListener("pointerup", onPointerUp, { once: true });
}

watch(currentValue, syncHandleTitles, {
  deep: true,
  flush: "post",
  immediate: true,
});
watch(() => props.formatValue, syncHandleTitles);

onUnmounted(() => {
  window.removeEventListener("pointerup", onPointerUp);
});
</script>

<template>
  <div
    ref="rootRef"
    class="ds-range-slider"
    :class="{
      'ds-range-slider--vertical': vertical,
      'ds-range-slider--disabled': disabled,
    }"
    @pointerover="onPointerOver"
    @pointerout="onPointerOut"
    @pointerdown="onPointerDown"
  >
    <Tooltip
      :filter="isDragHandle"
      :open="tooltipOpen"
      :target-element="tooltipTarget"
      :parent-title="false"
      :open-delay="0"
      :show-callout="false"
      :update-interval="50"
      class-name="ds-range-slider-tooltip-host"
      tooltip-class-name="ds-range-slider-tooltip"
      anchor-element="target"
      position="top"
    >
      <KendoRangeSlider
        :id="id"
        :value="currentValue"
        :min="min"
        :max="max"
        :step="resolvedStep"
        :disabled="disabled"
        :vertical="vertical"
        @change="onChange"
      >
        <SliderLabel
          v-for="(tick, index) in resolvedTicks"
          :key="`${tick}-${index}`"
          :position="tick"
        >
          {{ formatTick(Math.round(tick)) }}
        </SliderLabel>
      </KendoRangeSlider>
    </Tooltip>
    <div
      v-if="disabled"
      class="ds-range-slider__blocker"
      aria-hidden="true"
    />
  </div>
</template>

<style lang="scss" scoped>
.ds-range-slider {
  position: relative;
  width: 100%;
  overflow: visible;

  > :deep(div) {
    width: 100%;
  }

  :deep(.k-slider) {
    width: 100%;
  }

  &--vertical {
    width: max-content;
    min-width: 4.5rem;
    height: 16rem;

    > :deep(div) {
      width: auto;
      height: 100%;
    }

    :deep(.k-slider) {
      width: auto !important;
      height: 100% !important;
      min-height: 16rem;
    }
  }

  &--disabled {
    cursor: not-allowed;
  }

  &__blocker {
    position: absolute;
    inset: 0;
    z-index: 2;
    cursor: not-allowed;
  }
}
</style>
