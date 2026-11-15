<script setup lang="ts">
import { useSlots } from "vue";

defineOptions({
  name: "ContentBox",
});

const slots = useSlots();

const hasHeaderControls = () => Boolean(slots["header-controls"]);
const hasHeaderTitle = () => Boolean(slots["header-title"]);

const hasFooter = () => Boolean(slots.footer);
</script>

<template>
  <div class="content-box">
    <header :class="hasHeaderTitle() ? 'content-box__header' : ''">
      <div class="content-box__header-title">
        <slot name="header-title" />
      </div>
      <div
        v-if="hasHeaderControls()"
        class="content-box__header-controls"
      >
        <slot name="header-controls" />
      </div>
    </header>

    <slot />

    <footer
      v-if="hasFooter()"
      class="content-box__footer"
    >
      <slot name="footer" />
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.content-box {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  background: var(--bg-surface-subtle-2);
  overflow: hidden;
  padding: 0.25rem;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
  }

  &__header-title {
    min-width: 0;
    flex: 1;
  }

  &__header-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__footer {
    width: 100%;
    padding: 0.5rem 1rem;
  }
}
</style>
