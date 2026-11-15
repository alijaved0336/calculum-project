<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <slot name="header" />
    </header>
    <aside class="app-shell__navigation">
      <slot name="navigation" />
    </aside>
    <main class="app-shell__content">
      <div class="app-shell__content-inner">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * Authenticated chrome:
 * ┌─────────── header ───────────┐
 * │ navigation │ content         │
 * └────────────┴─────────────────┘
 */
defineOptions({ name: "AppShellLayout" });
</script>

<style lang="scss" scoped>
.app-shell {
  display: grid;
  grid-template-areas:
    "header header"
    "navigation content";
  grid-template-columns: max-content minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  padding: 0.5rem;
  gap: 0.5rem;
  box-sizing: border-box;
  background: var(--bg-page);
  color: var(--color-text-1);

  &__header {
    grid-area: header;
    min-width: 0;
  }

  &__navigation {
    grid-area: navigation;
    min-height: 0;
    height: 100%;
  }

  &__content {
    grid-area: content;
    min-width: 0;
    min-height: 0;
    border: 1px solid var(--border-color-default);
    border-radius: var(--border-radius-default);
    background: var(--bg-surface);
    overflow: hidden;
  }

  &__content-inner {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
}
</style>
