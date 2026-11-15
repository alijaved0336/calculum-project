<script setup lang="ts">
import { computed, inject, useSlots } from "vue";
import BodyText from "../typography/body-text/Index.vue";
import {
  LEVEL_BAR_GROUP_KEY,
  LEVEL_BAR_SEGMENT_COUNT,
  clampLevelBarSegments,
  getLevelBarFilledCount,
  type LevelBarLevel,
} from "./types";

defineOptions({
  name: "LevelBar",
});

const props = withDefaults(
  defineProps<{
    /**
     * Fill color + fill ratio: `low` (1/3 / red), `medium` (2/3 / yellow),
     * `high` (all / green). Absolute filled count depends on `segments`.
     * Pass `null` explicitly (as opposed to leaving it unset, which defaults
     * to `medium`) to render an empty, colorless bar - no level to plot.
     */
    level?: LevelBarLevel | null;
    /** Total horizontal bar cells. Clamped to a finite integer ≥ 1. */
    segments?: number;
    /** Text-only label string. Ignored when the `#label` slot is provided. */
    label?: string;
  }>(),
  {
    level: "medium",
    segments: LEVEL_BAR_SEGMENT_COUNT,
    label: "",
  },
);

const slots = useSlots();
const inGroup = inject(LEVEL_BAR_GROUP_KEY, false);

const showLabel = computed(
  () => Boolean(slots.label) || Boolean(props.label.trim()),
);

const segmentCount = computed(() => clampLevelBarSegments(props.segments));

const filledCount = computed(() =>
  getLevelBarFilledCount(props.level, segmentCount.value),
);

const segmentIndexes = computed(() =>
  Array.from({ length: segmentCount.value }, (_, index) => index + 1),
);
</script>

<template>
  <div
    class="ds-level-bar"
    :class="[
      level ? `ds-level-bar--${level}` : 'ds-level-bar--empty',
      {
        'ds-level-bar--with-label': showLabel && !inGroup,
        'ds-level-bar--aligned': inGroup,
      },
    ]"
  >
    <div
      v-if="showLabel"
      class="ds-level-bar__label"
    >
      <slot name="label">
        <BodyText
          variant="sm"
          weight="bold"
          as="span"
        >
          {{ label }}
        </BodyText>
      </slot>
    </div>
    <div
      class="ds-level-bar__track"
      role="img"
      :aria-label="level ? `${level} level` : 'no level data'"
    >
      <span
        v-for="index in segmentIndexes"
        :key="index"
        class="ds-level-bar__segment"
        :class="{ 'ds-level-bar__segment--filled': index <= filledCount }"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
/* Match charts/shared BAR_STRIPE_OVERLAY: −45°, width 5px, gap 4px. */
$stripe-width: 5px;
$stripe-gap: 4px;
$stripe-color: rgba(255, 255, 255, 0.1);
$stripe-period: $stripe-width + $stripe-gap;

.ds-level-bar {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;

  &--with-label {
    gap: 8px;
  }

  &--aligned {
    display: contents;
  }

  &--low {
    --level-bar-fill: var(--red-600);
  }

  &--medium {
    --level-bar-fill: var(--yellow-500);
  }

  &--high {
    --level-bar-fill: var(--green-500);
  }

  &__label {
    flex-shrink: 0;
    color: var(--color-text-1);
  }

  &--aligned &__label {
    grid-column: 1;
  }

  &__track {
    display: flex;
    flex: 1;
    min-width: 0;
    width: 100%;
    gap: 2px;
    height: 16px;
  }

  &--aligned &__track {
    grid-column: 2;
  }

  &__segment {
    flex: 1;
    min-width: 0;
    height: 16px;
    border-radius: 4px;
    background-color: var(--neutral-200);
    box-sizing: border-box;

    &--filled {
      background-color: var(--level-bar-fill);
      background-image: repeating-linear-gradient(
        -45deg,
        $stripe-color 0,
        $stripe-color $stripe-width,
        transparent $stripe-width,
        transparent $stripe-period
      );
    }
  }
}
</style>
