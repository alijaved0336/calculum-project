<script setup lang="ts">
import { computed } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";

defineOptions({
  name: "NoDataAvailable",
});

const props = withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    /** Asset name from design-system icons, e.g. `sidebar-analyze` */
    icon?: string;
  }>(),
  {
    title: "No Data Available",
    message: "",
  },
);

const iconSrc = computed(() => (props.icon ? resolveSvgAsset(props.icon) : ""));
</script>

<template>
  <div class="no-data-available">
    <div
      v-if="icon || $slots.icon"
      class="no-data-available__icon"
      aria-hidden="true"
    >
      <slot name="icon">
        <InlineSvg
          v-if="iconSrc"
          :src="iconSrc"
          width="24"
          height="24"
        />
      </slot>
    </div>
    <span
      v-if="title"
      class="no-data-available__title"
    >
      {{ title }}
    </span>
    <span
      v-if="message"
      class="no-data-available__message"
    >
      {{ message }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.no-data-available {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: var(--bg-surface-subtle-2);
    border-radius: var(--border-radius-2);
    color: var(--color-text-3);
  }

  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-1);
  }

  &__message {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-3);
  }
}
</style>
