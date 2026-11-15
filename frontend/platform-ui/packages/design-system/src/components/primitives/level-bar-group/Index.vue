<script setup lang="ts">
import { provide } from "vue";
import { LEVEL_BAR_GROUP_KEY } from "../level-bar/types";

defineOptions({
  name: "LevelBarGroup",
});

provide(LEVEL_BAR_GROUP_KEY, true);
</script>

<template>
  <div class="ds-level-bar-group">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.ds-level-bar-group {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: 8px;
  row-gap: 8px;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}
</style>
