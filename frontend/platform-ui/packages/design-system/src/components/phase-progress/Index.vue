<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BodyText from "../primitives/typography/body-text/Index.vue";
import CustomButton from "../primitives/custom-button/Index.vue";
import type { PhaseProgressItem, PhaseProgressProps } from "./types";

defineOptions({
  name: "PhaseProgress",
});

const PHASE_BAR_WIDTH_PX = 4;
const PHASE_BAR_GAP_PX = 2;
const PHASE_BAR_PERIOD_PX = PHASE_BAR_WIDTH_PX + PHASE_BAR_GAP_PX;

const props = withDefaults(defineProps<PhaseProgressProps>(), {
  phases: () => [],
  disabled: false,
  openLabel: "Open",
});

const emit = defineEmits<{
  "update:activePhaseId": [id: string | number];
  select: [phase: PhaseProgressItem, event: MouseEvent];
}>();

const rootRef = ref<HTMLElement | null>(null);
let trackObserver: ResizeObserver | null = null;

function syncTrackTiles() {
  const root = rootRef.value;
  if (!root) {
    return;
  }

  root.querySelectorAll<HTMLElement>(".phase-progress__track").forEach((track) => {
    const width = track.getBoundingClientRect().width;
    const tiles =
      width <= 0 ? 0 : Math.floor((width + 1e-3) / PHASE_BAR_PERIOD_PX);
    track.style.setProperty("--phase-tiles", String(tiles));
  });
}

const phaseAccent = computed(() => {
  if (!props.phases.length) {
    return "var(--accent)";
  }

  const active =
    props.activePhaseId === undefined
      ? props.phases[0]
      : (props.phases.find((phase) => phase.id === props.activePhaseId) ??
        props.phases[0]);

  return active.color || "var(--accent)";
});

function formatIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function phaseFill(phase: PhaseProgressItem): string {
  const raw = Number(phase.progress ?? 0);
  const clamped = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
  return `${clamped}%`;
}

function selectPhase(phase: PhaseProgressItem, event: MouseEvent) {
  if (props.disabled) {
    return;
  }
  emit("update:activePhaseId", phase.id);
  emit("select", phase, event);
}

function onOpenClick(phase: PhaseProgressItem, event: MouseEvent) {
  event.stopPropagation();
  selectPhase(phase, event);
}

onMounted(() => {
  if (typeof ResizeObserver === "undefined") {
    return;
  }

  trackObserver = new ResizeObserver(() => {
    syncTrackTiles();
  });

  if (rootRef.value) {
    trackObserver.observe(rootRef.value);
  }

  syncTrackTiles();
});

onBeforeUnmount(() => {
  trackObserver?.disconnect();
  trackObserver = null;
});

watch(
  () => props.phases.length,
  () => {
    requestAnimationFrame(syncTrackTiles);
  },
);
</script>

<template>
  <div
    ref="rootRef"
    class="phase-progress"
    :class="{ 'phase-progress--disabled': disabled }"
    :style="{
      '--phase-accent': phaseAccent,
      '--phase-bar-period': `${PHASE_BAR_PERIOD_PX}px`,
    }"
    :aria-disabled="disabled || undefined"
  >
    <div
      v-for="(phase, index) in phases"
      :key="phase.id"
      class="phase-progress__phase"
      @click="selectPhase(phase, $event)"
    >
      <CustomButton
        class="phase-progress__open"
        variant="plain"
        :show-label="false"
        icon="external-link"
        :text="openLabel"
        :disabled="disabled"
        @click="onOpenClick(phase, $event)"
      />

      <div class="phase-progress__header">
        <BodyText
          class="phase-progress__index"
          variant="xs"
          weight="regular"
          as="span"
        >
          {{ formatIndex(index) }}
        </BodyText>
        <BodyText
          class="phase-progress__name"
          variant="xs"
          weight="semibold"
          as="span"
          :title="phase.name"
        >
          {{ phase.name }}
        </BodyText>
      </div>

      <div class="phase-progress__track" aria-hidden="true">
        <div
          class="phase-progress__bars"
          :style="{ '--phase-fill': phaseFill(phase) }"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@ada/design-system/styles/disabled-state.scss" as *;

.phase-progress {
  --phase-accent: var(--accent);

  display: flex;
  flex-direction: row;
  width: 100%;
  min-width: 0;

  &--disabled {
    @include ds-disabled-state;

    &,
    & * {
      @include ds-disabled-interaction;
    }
  }

  &__phase {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 0;
    gap: 0.5rem;
    padding: 0 1px 0 3px;
    box-sizing: border-box;
    outline: 2px solid transparent;
    border-radius: 4px;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 2px;
      background: var(--phase-accent);
      border-radius: 100vmax;
    }
  }

  &__open {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.15s ease;

    &:disabled {
      visibility: hidden;
    }
  }

  &__header {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding-inline: 3px;
  }

  &__index {
    display: block;
    color: var(--color-text-4);
  }

  &__name {
    display: block;
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-1);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__track {
    --phase-bar-cap: 4px;

    flex-shrink: 0;
    width: 100%;
    height: 1.25rem;
    margin-top: auto;
    overflow: hidden;
  }

  &__bars {
    height: 100%;
    /* Until measured: full width (may clip). Then only complete 4px + 2px tiles. */
    width: 100%;
    width: calc(var(--phase-tiles) * var(--phase-bar-period));
    max-width: 100%;
    background-image: linear-gradient(
      to right,
      var(--phase-accent) var(--phase-fill, 0%),
      var(--neutral-200) var(--phase-fill, 0%)
    );
    /* 4px capsules + 2px gap; circular caps that do not stretch with rem */
    mask-image: radial-gradient(
        circle closest-side at 2px 2px,
        #000 100%,
        transparent
      ),
      radial-gradient(circle closest-side at 2px 2px, #000 100%, transparent),
      linear-gradient(to right, #000 4px, transparent 4px);
    -webkit-mask-image: radial-gradient(
        circle closest-side at 2px 2px,
        #000 100%,
        transparent
      ),
      radial-gradient(circle closest-side at 2px 2px, #000 100%, transparent),
      linear-gradient(to right, #000 4px, transparent 4px);
    mask-size:
      var(--phase-bar-period) var(--phase-bar-cap),
      var(--phase-bar-period) var(--phase-bar-cap),
      var(--phase-bar-period) calc(100% - var(--phase-bar-cap));
    -webkit-mask-size:
      var(--phase-bar-period) var(--phase-bar-cap),
      var(--phase-bar-period) var(--phase-bar-cap),
      var(--phase-bar-period) calc(100% - var(--phase-bar-cap));
    mask-position:
      0 0,
      0 100%,
      0 2px;
    -webkit-mask-position:
      0 0,
      0 100%,
      0 2px;
    mask-repeat: repeat-x;
    -webkit-mask-repeat: repeat-x;
  }

  &:not(.phase-progress--disabled) {
    .phase-progress__phase {
      cursor: pointer;
    }

    .phase-progress__phase:hover {
      background-color: var(--bg-surface-subtle-1);
      outline-color: var(--bg-surface-subtle-1);
    }

    .phase-progress__phase:hover .phase-progress__open,
    .phase-progress__open:focus-visible {
      opacity: 1;
    }
  }
}
</style>
