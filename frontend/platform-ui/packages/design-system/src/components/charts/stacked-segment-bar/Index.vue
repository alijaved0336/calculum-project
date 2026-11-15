<template>
  <div class="d-flex stacked-height mb-4">
    <div
      v-for="segment in segments"
      :key="segment.key"
      class="pl-2 pb-1 d-flex align-items-end text-white cursor-pointer"
      data-toggle="tooltip"
      data-placement="top"
      :title="segment.value.toString()"
      :style="`background-color: ${segment.color}; width: ${segment.percentage}%`"
      @click="$emit('segment-click', segment.key)"
    >
      <!-- Show value if segment width is above the threshold -->
      <span v-if="segment.percentage > minPercentToShowValue" class="ml-1">
        {{ segment.value }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StackedSegmentBarItem } from "./types";

defineOptions({
  name: "StackedSegmentBar",
});

withDefaults(
  defineProps<{
    segments: StackedSegmentBarItem[];
    minPercentToShowValue?: number;
  }>(),
  {
    minPercentToShowValue: 4,
  },
);

defineEmits<{
  "segment-click": [key: string];
}>();
</script>
<style lang="css" scoped>
 .stacked-height {
    min-height: 4rem;
}

.ml-1 {
  margin-left: 0.25rem !important;
}

.pb-1 {
    padding-bottom: 0.25rem !important;
}

.pl-2 {
    padding-left: 0.25rem !important;
}

</style>
