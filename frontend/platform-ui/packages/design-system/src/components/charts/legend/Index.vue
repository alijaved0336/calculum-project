<template>
  <div class="d-flex align-items-center justify-content-center gap-3">
    <div
      v-for="item in legendItems"
      :key="item.text"
      class="d-flex align-items-center custom-gap"
    >
      <div class="rounded-0 square-legend" :style="{ backgroundColor: item.color }"></div>
      <span class="legend-text">{{ item.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChartLegendItem } from "./types";

defineOptions({
  name: "CustomChartLegend",
});

defineProps<{ legendItems: ChartLegendItem[] }>();
</script>

<style scoped lang="scss">
@import "../../../styles/variables/colors";

.custom-gap {
  gap: 0.5rem;
}

.square-legend {
  width: 15px;
  height: 15px;
}

.legend-text {
  color: $color-gray-600;
  font-weight: 400;
  font-size: 0.875rem;
}
</style>
