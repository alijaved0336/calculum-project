<script setup lang="ts">
import { computed } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import BodyText from "../typography/body-text/Index.vue";
import { isCustomBadgeOutlineVariant, type CustomBadgeVariant } from "./types";

defineOptions({
  name: "CustomBadge",
});

const props = withDefaults(
  defineProps<{
    text: string;
    variant?: CustomBadgeVariant;
    /** Show a 6×6 status circle before the label. Ignored when `icon` resolves. */
    dot?: boolean;
    /** Asset name from design-system icons, e.g. `calendar`. Optional. */
    icon?: string;
  }>(),
  {
    variant: "info",
    dot: true,
    icon: undefined,
  },
);

const iconSrc = computed(() => {
  const name = props.icon?.trim();
  if (!name) {
    return "";
  }

  return resolveSvgAsset(name);
});

const showIcon = computed(() => Boolean(iconSrc.value));
const showDot = computed(() => props.dot && !showIcon.value);
const isOutline = computed(() => isCustomBadgeOutlineVariant(props.variant));
const textWeight = computed(() => {
  if (props.variant === "muted") {
    return "regular";
  }

  return isOutline.value ? "semibold" : "medium";
});
</script>

<template>
  <span
    class="ds-custom-badge"
    :class="`ds-custom-badge--${variant}`"
  >
    <InlineSvg
      v-if="showIcon"
      class="ds-custom-badge__icon"
      :src="iconSrc"
      width="16"
      height="16"
      aria-hidden="true"
    />
    <span
      v-else-if="showDot"
      class="ds-custom-badge__dot"
      aria-hidden="true"
    />
    <BodyText
      class="ds-custom-badge__text"
      variant="xs"
      :weight="textWeight"
      as="span"
    >
      {{ text }}
    </BodyText>
  </span>
</template>

<style scoped lang="scss">
.ds-custom-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  max-width: 100%;
  padding: 0.125rem 0.5rem;
  border-radius: 100vmax;
  box-sizing: border-box;

  &__dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
  }

  &__icon {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
    pointer-events: none;
  }

  &__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &--success {
    color: var(--green-700);
    background: var(--green-50);
  }

  &--warning,
  &--yellow {
    color: var(--yellow-700);
    background: var(--yellow-50);
  }

  &--danger,
  &--red {
    color: var(--red-700);
    background: var(--red-50);
  }

  &--veryLow {
    color: var(--neutral-700);
    background: var(--neutral-100);
  }

  &--veryHigh,
  &--blue {
    color: var(--blue-700);
    background: var(--blue-50);
  }

  &--orange {
    color: var(--orange-700);
    background: var(--orange-50);
  }

  &--info {
    color: var(--brand-700);
    background: var(--brand-50);
  }

  &--sme,
  &--potential,
  &--parent {
    padding: 2px 6px;
    border-radius: var(--border-radius-3);
  }

  &--sme {
    color: var(--blue-700);
    background: var(--blue-50);
  }

  &--potential {
    color: var(--neutral-600);
    background: var(--neutral-50);
  }

  &--parent {
    color: var(--yellow-600);
    background: var(--yellow-50);
  }

  &--muted {
    color: var(--color-text-2);
    background: var(--bg-surface-subtle-1);
  }

  &--agreed,
  &--contacted,
  &--analyzed,
  &--planned,
  &--missed,
  &--onHold {
    padding: 2px 6px;
    border-radius: var(--border-radius-2);
    background: var(--bg-surface);
    border: 1px solid var(--border-color-default);
  }

  &--agreed {
    color: var(--brand-600);
  }

  &--contacted {
    color: var(--green-600);
  }

  &--analyzed {
    color: var(--neutral-600);
  }

  &--planned {
    color: var(--blue-600);
  }

  &--missed {
    color: var(--red-600);
  }

  &--onHold {
    color: var(--yellow-600);
  }
}
</style>
