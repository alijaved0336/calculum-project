<script setup lang="ts">
import BodyText from "../primitives/typography/body-text/Index.vue";
import { CheckBox } from "../primitives/kendo-inputs/check-box";
import type { StatusCardItem, StatusCardVariant } from "./types";

defineOptions({
  name: "StatusCard",
});

const props = withDefaults(
  defineProps<{
    /** Large index shown in the top-left badge. */
    index: string | number;
    /** Color theme for the accent / selected surface. */
    variant?: StatusCardVariant;
    /** Selection state (`v-model`). */
    modelValue?: boolean;
    /** Label / value rows shown in the card body. */
    items?: StatusCardItem[];
    disabled?: boolean;
  }>(),
  {
    variant: "success",
    modelValue: false,
    items: () => [],
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  change: [value: boolean];
}>();

function onCheckboxUpdate(value: boolean) {
  if (props.disabled) {
    return;
  }
  emit("update:modelValue", value);
  emit("change", value);
}
</script>

<template>
  <!-- Whole card is the label so the hit area is the full card. -->
  <label
    class="status-card"
    :class="[
      `status-card--${variant}`,
      {
        'status-card--checked': modelValue,
        'status-card--disabled': disabled,
      },
    ]"
  >
    <div class="status-card__accent-line"></div>
    <div class="status-card__header">
      <span class="status-card__index">
        <BodyText
          variant="lg"
          weight="bold"
          as="span"
        >
          {{ index }}
        </BodyText>
      </span>

      <CheckBox
        class="status-card__checkbox"
        :model-value="modelValue"
        :disabled="disabled"
        :aria-label="`Select card ${index}`"
        @update:model-value="onCheckboxUpdate"
      />
    </div>

    <div
      v-if="items.length > 0"
      class="status-card__rows"
    >
      <div
        v-for="(item, rowIndex) in items"
        :key="`${item.label}-${rowIndex}`"
        class="status-card__row"
      >
        <BodyText
          class="status-card__label"
          variant="xs"
          weight="regular"
          as="span"
        >
          {{ item.label }}
        </BodyText>
        <BodyText
          class="status-card__value"
          variant="xs"
          weight="semibold"
          as="span"
        >
          {{ item.value }}
        </BodyText>
      </div>
    </div>

    <div
      v-if="$slots.default"
      class="status-card__body"
    >
      <slot />
    </div>
  </label>
</template>

<style lang="scss" scoped>
.status-card {
  --status-card-accent: var(--green-500);
  --status-card-key: var(--green-600);
  --status-card-value: var(--green-700);
  --status-card-index-border: var(--green-200);
  --status-card-bg-checked: var(--green-50);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  width: 100%;
  min-width: 0;
  padding: 1.25rem 1rem 1rem;
  border: 1px dashed var(--border-color-default);
  border-top: none;
  border-radius: var(--border-radius-default);
  background-color: var(--bg-surface);
  background-image: repeating-linear-gradient(
    -45deg,
    var(--bg-surface) 0,
    var(--bg-surface) 3px,
    hsl(from var(--neutral-border) h s l / 10%) 3px,
    hsl(from var(--neutral-border) h s l / 10%) 8px
  );
  color: var(--color-text-1);
  cursor: pointer;
  transition: var(--transition-default);
  overflow: hidden;

  &:hover {
    border-color: var(--status-card-accent);
  }

  &__accent-line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: var(--status-card-accent);
  }

  &--warning {
    --status-card-accent: var(--yellow-500);
    --status-card-key: var(--yellow-600);
    --status-card-value: var(--yellow-700);
    --status-card-index-border: var(--yellow-200);
    --status-card-bg-checked: var(--yellow-50);
  }

  &--danger {
    --status-card-accent: var(--red-500);
    --status-card-key: var(--red-600);
    --status-card-value: var(--red-700);
    --status-card-index-border: var(--red-200);
    --status-card-bg-checked: var(--red-50);
  }

  &--success {
    --status-card-accent: var(--green-500);
    --status-card-key: var(--green-600);
    --status-card-value: var(--green-700);
    --status-card-index-border: var(--green-200);
    --status-card-bg-checked: var(--green-50);
  }

  &--checked {
    border: 1px solid var(--status-card-accent);
    border-top: none;
    background-color: var(--status-card-bg-checked);
    background-image: none;

    .status-card__index {
      border-color: var(--status-card-index-border);
      color: var(--status-card-value);
    }

    .status-card__label {
      color: var(--status-card-key);
    }

    .status-card__value {
      color: var(--status-card-value);
    }
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  &__index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5rem;
    min-height: 2.5rem;
    padding-inline: 0.75rem;
    border: 1px solid var(--border-color-default);
    border-radius: var(--border-radius-default);
    background: var(--bg-surface);
    color: var(--color-text-1);
    line-height: 1;
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
  }

  &__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__label {
    margin: 0;
    color: var(--color-text-3);
    min-width: 0;
  }

  &__value {
    margin: 0;
    color: var(--color-text-2);
    text-align: right;
    flex-shrink: 0;
  }

  &__body {
    min-width: 0;
  }
}
</style>
