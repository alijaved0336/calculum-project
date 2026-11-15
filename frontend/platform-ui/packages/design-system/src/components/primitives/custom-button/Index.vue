<script setup lang="ts">
import { computed } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import BodyText from "../typography/body-text/Index.vue";
import {
  CUSTOM_BUTTON_DEFAULT_ICON,
  CUSTOM_BUTTON_ICON_SIZE_PX,
  type CustomButtonIconPosition,
  type CustomButtonSize,
  type CustomButtonVariant,
} from "./types";

defineOptions({
  name: "CustomButton",
});

const props = withDefaults(
  defineProps<{
    /** Always required. Visible label, or `title`/`aria-label` when `showLabel` is false. */
    text: string;
    variant?: CustomButtonVariant;
    /** Asset name from design-system icons, e.g. `edit`. Optional. */
    icon?: string;
    /** Visual icon placement. DOM order stays icon-then-label. */
    iconPosition?: CustomButtonIconPosition;
    /**
     * Show the text label.
     * When `false`, only the icon is shown (`text` is used for a11y).
     * If `icon` is missing or unresolved in that case, `settings` is used.
     */
    showLabel?: boolean;
    /** Padding / gap / icon scale. Default `xs` matches prior default chrome. */
    size?: CustomButtonSize;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    text: "Text",
    variant: "default",
    iconPosition: "start",
    showLabel: true,
    size: "xs",
    disabled: false,
    type: "button",
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const iconSrc = computed(() => {
  const name = props.icon?.trim();
  if (name) {
    const resolved = resolveSvgAsset(name);
    if (resolved) {
      return resolved;
    }
  }

  if (!props.showLabel) {
    return resolveSvgAsset(CUSTOM_BUTTON_DEFAULT_ICON);
  }

  return "";
});

const showIcon = computed(() => Boolean(iconSrc.value));
const isIconOnly = computed(() => !props.showLabel);
const iconSizePx = computed(() => CUSTOM_BUTTON_ICON_SIZE_PX[props.size]);
</script>

<template>
  <button
    :type="type"
    class="custom-button"
    :class="[
      `custom-button--${variant}`,
      `custom-button--${size}`,
      {
        'custom-button--icon-only': isIconOnly,
        'custom-button--icon-end': iconPosition === 'end',
      },
    ]"
    :disabled="disabled"
    :title="isIconOnly ? text : undefined"
    :aria-label="isIconOnly ? text : undefined"
    @click="emit('click', $event)"
  >
    <InlineSvg
      v-if="showIcon"
      class="custom-button__icon"
      :src="iconSrc"
      :width="iconSizePx"
      :height="iconSizePx"
      aria-hidden="true"
    />
    <BodyText
      v-if="showLabel"
      class="custom-button__label"
      variant="sm"
      weight="semibold"
      as="span"
    >
      {{ text }}
    </BodyText>
  </button>
</template>

<style lang="scss" scoped>
.custom-button {
  --cb-padding: 6px 10px;
  --cb-gap: 6px;
  --cb-icon-size: 16px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--cb-gap);
  margin: 0;
  border: none;
  background: transparent;
  white-space: nowrap;
  cursor: pointer;
  transition: var(--transition-default);
  color: var(--color-text-1);
  min-width: 2rem;
  min-height: 2rem;
  padding: var(--cb-padding);

  &__icon {
    width: var(--cb-icon-size);
    height: var(--cb-icon-size);
    aspect-ratio: 1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transition: var(--transition-default);
  }

  &__label {
    display: inline-flex;
    align-items: center;
    height: 1rem;
  }

  &--xxs {
    --cb-padding: 2px 6px;
    --cb-gap: 4px;
    --cb-icon-size: 12px;
    /* Below the default 2rem clamp so xxs stays visually smaller than xs. */
    min-width: auto;
    min-height: auto;
  }

  &--xs {
    --cb-padding: 6px 10px;
    --cb-gap: 6px;
    --cb-icon-size: 16px;
  }

  &--s {
    --cb-padding: 8px 12px;
    --cb-gap: 6px;
    --cb-icon-size: 20px;
  }

  &--md {
    --cb-padding: 10px 14px;
    --cb-gap: 6px;
    --cb-icon-size: 20px;
  }

  &--lg {
    --cb-padding: 10px 16px;
    --cb-gap: 8px;
    --cb-icon-size: 20px;
  }

  &--xl {
    --cb-padding: 12px 18px;
    --cb-gap: 8px;
    --cb-icon-size: 20px;
  }

  &--default {
    border: 1px solid var(--border-color-default-2);
    border-radius: var(--border-radius-2);
    background: var(--bg-surface);

    .custom-button__icon {
      color: var(--color-text-interactive-button-default);
    }

    &:hover:not(:disabled) {
      background: var(--bg-page);

      .custom-button__icon {
        color: var(--color-text-interactive-button-hover);
      }
    }
  }

  &--accent {
    border: 1px solid transparent;
    border-radius: var(--border-radius-2);
    background: var(--accent);
    color: var(--neutral-0);

    &:hover:not(:disabled) {
      background: var(--accent-2);
    }
  }

  &--plain {
    --cb-padding: 0;
    background: transparent;
    min-width: auto;
    min-height: auto;

    .custom-button__icon {
      color: var(--color-text-interactive-button-default);
    }

    .custom-button__label {
      height: auto;
    }

    &:hover:not(:disabled) {
      .custom-button__icon {
        color: var(--color-text-interactive-button-hover);
      }
    }
  }

  &--icon-end {
    flex-direction: row-reverse;
  }

  &--icon-only {
    min-width: 2rem;
    min-height: 2rem;

    &.custom-button--xxs {
      --cb-padding: 4px;
      min-width: 1.25rem;
      min-height: 1.25rem;
    }

    &.custom-button--xs {
      --cb-padding: 8px;
    }

    &.custom-button--s {
      --cb-padding: 8px;
    }

    &.custom-button--md {
      --cb-padding: 10px;
    }

    &.custom-button--lg {
      --cb-padding: 12px;
    }

    &.custom-button--xl {
      --cb-padding: 14px;
    }

    &.custom-button--plain {
      --cb-padding: 0;
      min-width: auto;
      min-height: auto;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
}
</style>
