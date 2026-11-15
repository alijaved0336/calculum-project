<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { placeTooltipInHost, type ChartTooltipContent } from "./tooltip";

defineOptions({
  name: "ChartHoverTooltip",
});

const props = defineProps<{
  tip: ChartTooltipContent;
}>();

const elRef = ref<HTMLElement | null>(null);
const left = ref(0);
const top = ref(0);
/** Avoid a one-frame flash outside the host before clamp runs. */
const positioned = ref(false);

async function reposition() {
  const el = elRef.value;
  if (!el || !props.tip.visible) {
    return;
  }

  // First show only: seed at the anchor (opacity stays 0 until --ready).
  // While already visible, keep --ready and update left/top in place.
  if (!positioned.value) {
    left.value = props.tip.left;
    top.value = props.tip.top;
  }
  await nextTick();

  const host = el.offsetParent as HTMLElement | null;
  if (!host) {
    positioned.value = true;
    return;
  }

  const placed = placeTooltipInHost(
    { width: host.clientWidth, height: host.clientHeight },
    { left: props.tip.left, top: props.tip.top },
    { width: el.offsetWidth, height: el.offsetHeight },
  );
  left.value = placed.left;
  top.value = placed.top;
  positioned.value = true;
}

watch(
  () =>
    [
      props.tip.visible,
      props.tip.left,
      props.tip.top,
      props.tip.title,
      props.tip.value,
    ] as const,
  ([visible]) => {
    if (visible) {
      void reposition();
    } else {
      positioned.value = false;
    }
  },
);
</script>

<template>
  <div
    ref="elRef"
    v-show="tip.visible"
    class="ds-chart-hover-tooltip"
    :class="{ 'ds-chart-hover-tooltip--ready': positioned }"
    :style="{ left: `${left}px`, top: `${top}px` }"
    role="tooltip"
  >
    <span
      class="ds-chart-hover-tooltip__swatch"
      :style="{ background: tip.accent }"
    />
    <div class="ds-chart-hover-tooltip__body">
      <div
        v-if="tip.title"
        class="ds-chart-hover-tooltip__title"
      >
        {{ tip.title }}
      </div>
      <div class="ds-chart-hover-tooltip__value">
        {{ tip.value }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ds-chart-hover-tooltip {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: min(16rem, calc(100% - 1rem));
  padding: 0.375rem 0.5rem;
  border-radius: var(--border-radius-default);
  background: var(--bg-tooltip);
  color: var(--color-text-tooltip);
  font-family: var(--font-family-base);
  font-size: 0.75rem;
  line-height: 1.35;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
  opacity: 0;

  &--ready {
    opacity: 1;
  }
}

.ds-chart-hover-tooltip__swatch {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.2rem;
  border-radius: 999px;
}

.ds-chart-hover-tooltip__title {
  font-weight: 500;
  opacity: 0.9;
}

.ds-chart-hover-tooltip__value {
  font-weight: 600;
}
</style>
