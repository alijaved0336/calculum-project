<template>
  <div class="process-progress" :class="{ 'process-progress--frozen': frozen }">
    <span class="process-progress__pct">{{ pctLabel }}</span>
    <div class="process-progress__track">
      <div class="process-progress__fill" :style="{ width: fillWidth }"></div>
    </div>
    <span v-if="stageLabel" class="process-progress__stage">{{ stageLabel }}</span>
  </div>
</template>

<script lang="ts">
import { computed, PropType } from "vue";

/**
 * Whole-pipeline progress bar bound to `progress.global` of the Firebase
 * spendFileVersion contract (WI#18023). Rendering rules:
 * - progress may be undefined (no live data yet / deploy mid-run) → em dash;
 * - the bar freezes (grey) on error/cancel — the parent hides the ETA by
 *   passing `frozen`;
 * - the stage fraction always comes from the doc (never hardcoded).
 */
export default {
  name: "ProcessProgressBar",
  props: {
    progress: { type: Number as PropType<number | null>, default: null },
    stageName: { type: String as PropType<string | null>, default: null },
    stageIndex: { type: Number as PropType<number | null>, default: null },
    stageCount: { type: Number as PropType<number | null>, default: null },
    frozen: { type: Boolean, default: false }
  },
  setup(props: {
    progress: number | null;
    stageName: string | null;
    stageIndex: number | null;
    stageCount: number | null;
    frozen: boolean;
  }) {
    const pctLabel = computed(() =>
      props.progress === null ? "—" : `${props.progress.toFixed(1)}%`
    );

    const fillWidth = computed(() =>
      props.progress === null ? "0%" : `${Math.min(props.progress, 100)}%`
    );

    const stageLabel = computed(() => {
      if (!props.stageName) return null;
      if (props.stageIndex === null || !props.stageCount) return props.stageName;
      return `${props.stageName} (${props.stageIndex + 1}/${props.stageCount})`;
    });

    return { pctLabel, fillWidth, stageLabel };
  }
};
</script>

<style scoped>
.process-progress {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
}
.process-progress__pct {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  min-width: 3.4rem;
  text-align: right;
  font-size: 0.85rem;
}
.process-progress__track {
  flex: 1;
  height: 8px;
  border-radius: 5px;
  background: #e4e9f1;
  overflow: hidden;
}
.process-progress__fill {
  height: 100%;
  border-radius: 5px;
  background: var(--bs-primary, #2458c5);
  min-width: 4px;
  transition: width 0.6s ease;
}
.process-progress--frozen .process-progress__fill {
  background: #7d8ba0;
}
.process-progress__stage {
  font-size: 0.8rem;
  white-space: nowrap;
  color: #5d6c81;
}
</style>
