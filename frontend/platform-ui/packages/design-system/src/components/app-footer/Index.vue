<script setup lang="ts">
defineOptions({
  name: "AppFooter",
});
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <slot />
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.app-footer {
  width: 100%;
  color: var(--color-text-4);
}

.app-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding-inline: 0.5rem;
  padding-block: 1rem;
  gap: 0.75rem; /* 12px */
}
</style>
