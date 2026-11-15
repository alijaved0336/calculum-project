<script setup lang="ts">
import { computed } from "vue";
import InlineSvg from "vue-inline-svg";
import BodyText from "../typography/body-text/Index.vue";
import { BOX_BADGE_ICON_URLS } from "./icons";
import type { BoxBadgeVariant } from "./types";

defineOptions({
  name: "BoxBadge",
});

const props = withDefaults(
  defineProps<{
    text: string;
    variant?: BoxBadgeVariant;
  }>(),
  {
    variant: "green-top-center",
  },
);

const iconSrc = computed(() => BOX_BADGE_ICON_URLS[props.variant]);
</script>

<template>
  <span class="ds-box-badge">
    <InlineSvg
      class="ds-box-badge__icon"
      :src="iconSrc"
      width="20"
      height="20"
      aria-hidden="true"
    />
    <BodyText
      class="ds-box-badge__text"
      variant="sm"
      weight="semibold"
      as="span"
    >
      {{ text }}
    </BodyText>
  </span>
</template>

<style scoped lang="scss">
.ds-box-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
  padding: 4px 6px;
  border-radius: var(--border-radius-2);
  background: var(--bg-surface);
  border: 1px solid var(--border-color-default);
  box-sizing: border-box;
  color: var(--color-text-1);

  &__icon {
    flex-shrink: 0;
    display: block;
  }

  &__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
