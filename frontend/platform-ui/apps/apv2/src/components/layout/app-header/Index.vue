<template>
  <div class="app-header">
    <!-- Workspace / search / actions — wire DS header pieces when available -->
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AppHeader" });
</script>

<style lang="scss" scoped>
.app-header {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.5rem;
}
</style>
