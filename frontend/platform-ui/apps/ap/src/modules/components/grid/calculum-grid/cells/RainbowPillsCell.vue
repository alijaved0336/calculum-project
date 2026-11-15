<script setup lang="ts">
/**
 * Presentational rainbow-pill badge cell for CalculumGrid.
 */
defineOptions({ name: "RainbowPillsCell" });

defineProps<{
  classes: string;
  pillLabel: string;
}>();
</script>

<template>
  <div class="h-10 d-flex justify-content-center align-items-center">
    <p
      :class="classes"
      class="mb-0 w-75 rounded-3xl text-center font-medium"
    >
      {{ pillLabel }}
    </p>
  </div>
</template>
