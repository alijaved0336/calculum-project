<template>
  <div class="blank-layout">
    <slot />
  </div>
</template>

<script setup lang="ts">
/** Full-viewport layout without app chrome (404, standalone screens). */
defineOptions({ name: "BlankLayout" });
</script>

<style lang="scss" scoped>
.blank-layout {
  height: 100%;
  background: var(--bg-page);
  color: var(--color-text-1);
}
</style>
