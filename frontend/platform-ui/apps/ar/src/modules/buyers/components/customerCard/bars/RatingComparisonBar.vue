<template>
<div class="d-flex align-items-center gap-3 rating-comparison-bar">
  <div class="rating-comparison-bar__label text-muted small">{{ label }}</div>
  <div class="rating-comparison-bar__track flex-grow-1">
    <div
      class="rating-comparison-bar__fill"
      :class="`rating-comparison-bar__fill--${variant}`"
      :style="{ width: `${clampedPercent}%` }"
    >
      <Tooltip v-if="valueTitle" :open-delay="50" :anchor-element="'target'" :position="'top'">
        <span class="rating-comparison-bar__value" :title="valueTitle">{{ displayValue }}</span>
      </Tooltip>
      <span v-else class="rating-comparison-bar__value">{{ displayValue }}</span>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * A single labelled, filled horizontal bar - the shape `CustomerCardRatingNMetrics` reuses across
 * every "compare a few values side by side" card (Credit Rating Comparison, Credit Limit vs
 * Outstandings): a fixed-width label on the left, a track on the right filled to `percent`, with
 * `displayValue` drawn inside the fill itself rather than past its edge. Generic on purpose - the
 * caller supplies the label/value/percent/variant for its own row, this component has no notion of
 * what any of them mean.
 */
import { computed } from 'vue'
import { Tooltip } from '@ada/design-system'

const props = withDefaults(
  defineProps<{
    label: string
    /** The text drawn inside the filled portion (e.g. a letter grade or a formatted amount) - not
     * necessarily related to `percent` itself, which only drives how far the fill extends. */
    displayValue: string
    /** How full the track is, 0-100. Values outside that range are clamped. */
    percent: number
    /** Selects the fill's shade - darker for the primary series in a comparison, lighter for the
     * ones it is being compared against. */
    variant?: 'primary' | 'secondary' | 'tertiary'
    /** Hover tooltip for `displayValue` (e.g. the full figure behind a compact amount) - none when
     * omitted. */
    valueTitle?: string
  }>(),
  { variant: 'primary', valueTitle: undefined },
)

const clampedPercent = computed(() => Math.min(100, Math.max(0, props.percent)))
</script>

<style scoped>
.rating-comparison-bar__label {
  width: 130px;
  flex-shrink: 0;
}

.rating-comparison-bar__track {
  background: var(--bg-surface-subtle-2);
  border-radius: var(--border-radius-2, 4px);
  height: 28px;
  overflow: hidden;
}

.rating-comparison-bar__fill {
  height: 100%;
  min-width: fit-content;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 10px;
  border-radius: var(--border-radius-2, 4px);
}

.rating-comparison-bar__fill--primary {
  background: var(--brand-600);
}

.rating-comparison-bar__fill--secondary {
  background: var(--brand-400);
}

.rating-comparison-bar__fill--tertiary {
  background: var(--brand-200);
}

.rating-comparison-bar__value {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--neutral-0);
}

.rating-comparison-bar__fill--tertiary .rating-comparison-bar__value {
  color: var(--neutral-800);
}
</style>
