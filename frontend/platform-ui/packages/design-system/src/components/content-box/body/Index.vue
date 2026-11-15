<script setup lang="ts">
defineOptions({
  name: "ContentBoxBody",
});

const props = defineProps<{
  isTransparent?: boolean;
}>();
</script>

<template>
  <div
    class="content-box__body"
    :class="{ 'content-box__body--transparent': isTransparent }"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.content-box__body {
  width: 100%;
  // A plain flex item (the browser default `flex: 0 1 auto`) sizes to its own content and ignores
  // extra height a parent `ContentBox` was stretched/grown to (h-100, flex-grow-1) by its own
  // caller - the outer shell would grow but this, the actual visible bordered surface, would not,
  // leaving sibling cards in the same row visibly mismatched despite the outer shell matching.
  flex: 1 1 auto;
  background: var(--bg-surface);
  border-radius: var(--border-radius-2);
  overflow: hidden;
  border: 1px solid var(--border-color-default);
  padding: 1rem;

  &--transparent {
    background: transparent;
    border: none;
    padding: 0;
  }
}
</style>
