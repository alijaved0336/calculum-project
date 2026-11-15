<script setup lang="ts">
import { computed, ref } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import BodyText from "../typography/body-text/Index.vue";
import DropdownPanel from "../dropdown-panel/Index.vue";
import DropdownMenuItem from "../dropdown-menu-item/Index.vue";
import type { CustomSelectValue } from "./types";

defineOptions({
  name: "CustomSelect",
});

const props = withDefaults(
  defineProps<{
    /** Selected value (`v-model`). */
    modelValue?: CustomSelectValue | null;
    /** Options list (primitive strings). */
    dataItems: CustomSelectValue[];
    /** Compact field label above the value, e.g. "Select Value". */
    label: string;
    /** Placeholder when nothing is selected (not shown as a list option). */
    defaultItem?: string;
    /** Optional hint under the field. */
    hint?: string;
    disabled?: boolean;
    /**
     * Exact panel width (`280`, `"280px"`, `"18rem"`, …), forwarded to `DropdownPanel`.
     * Takes precedence over the default trigger-width match - use it under a zoomed host
     * (`html { zoom }`, as both apps apply): `DropdownPanel`'s default match measures the
     * trigger with `getBoundingClientRect()`, which already reports the zoomed size, so
     * writing that same number back as the panel's own CSS width applies the zoom a second
     * time and renders it too narrow. A plain CSS length here never goes through that
     * measurement, so it renders at the size it says under any zoom level.
     */
    panelWidth?: string | number;
  }>(),
  {
    modelValue: null,
    defaultItem: "Select…",
    hint: undefined,
    disabled: false,
    panelWidth: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: CustomSelectValue];
  /** Fires only when the selected value actually changes. */
  change: [value: CustomSelectValue];
}>();

const open = ref(false);
const chevronSrc = computed(() => resolveSvgAsset("icon-arrow-down"));

const hasSelection = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    return false;
  }
  return props.dataItems.includes(props.modelValue);
});

const displayValue = computed(() =>
  hasSelection.value ? props.modelValue! : props.defaultItem,
);

function choose(next: CustomSelectValue) {
  if (props.disabled || next === props.defaultItem) {
    return;
  }

  const changed = next !== props.modelValue;
  if (changed) {
    emit("update:modelValue", next);
    emit("change", next);
  }
  open.value = false;
}
</script>

<template>
  <div
    class="ds-custom-select"
    :class="{ 'ds-custom-select--disabled': disabled }"
  >
    <DropdownPanel
      v-model:open="open"
      align="start"
      match-trigger-width
      :panel-width="panelWidth"
      :disabled="disabled"
    >
      <template #trigger="{ toggle, open: isOpen, disabled: isDisabled }">
        <button
          type="button"
          class="ds-custom-select__trigger"
          :class="{ 'ds-custom-select__trigger--open': isOpen }"
          :disabled="isDisabled"
          :aria-expanded="isOpen"
          aria-haspopup="listbox"
          @click="toggle"
        >
          <span class="ds-custom-select__value-box">
            <BodyText
              class="ds-custom-select__label"
              variant="xxs"
              weight="medium"
              as="span"
            >
              {{ label }}
            </BodyText>
            <BodyText
              class="ds-custom-select__value"
              :class="{
                'ds-custom-select__value--placeholder': !hasSelection,
              }"
              variant="sm"
              :weight="hasSelection ? 'semibold' : 'medium'"
              as="span"
            >
              {{ displayValue }}
            </BodyText>
          </span>
          <span
            class="ds-custom-select__chevron"
            :class="{ 'ds-custom-select__chevron--open': isOpen }"
          >
            <InlineSvg
              :src="chevronSrc"
              width="16"
              height="16"
              aria-hidden="true"
            />
          </span>
        </button>
      </template>

      <ul
        class="ds-dropdown-surface__list"
        role="listbox"
        :aria-label="label"
      >
        <li
          v-for="item in dataItems"
          :key="item"
        >
          <DropdownMenuItem
            :label="item"
            trailing="check"
            :selected="item === modelValue"
            @click="choose(item)"
          />
        </li>
      </ul>
    </DropdownPanel>

    <BodyText
      v-if="hint"
      class="ds-custom-select__hint"
      variant="xxs"
      weight="medium"
      as="p"
    >
      {{ hint }}
    </BodyText>
  </div>
</template>

<style lang="scss" scoped>
.ds-custom-select {
  position: relative;
  display: block;
  width: 100%;
  min-width: 14.375rem;
  max-width: 100%;
  font-family: var(--font-family-base);

  :deep(.ds-dropdown-panel) {
    display: block;
    width: 100%;
  }

  :deep(.ds-dropdown-panel__trigger) {
    display: block;
    width: 100%;
  }

  &__trigger {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    padding: 0.5rem 0.875rem;
    border: 1px solid var(--border-color-default-2);
    border-radius: var(--border-radius-default);
    background: var(--bg-surface);
    color: var(--color-text-1);
    box-shadow: none;
    text-align: left;
    cursor: pointer;
    transition: var(--transition-default);

    &:focus,
    &:focus-visible {
      border-color: var(--focus-ring);
      outline: 1px solid var(--focus-ring);
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__value-box {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    min-width: 0;
    text-align: left;
    padding-right: 0.5rem;
  }

  &__label {
    display: block;
    color: var(--color-text-2);
  }

  &__value {
    display: block;
    color: var(--color-text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;

    &--placeholder {
      color: var(--color-text-2);
    }
  }

  &__chevron {
    display: inline-flex;
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    color: var(--color-text-3);
    transition: transform 0.2s ease;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__hint {
    margin: 0.375rem 0 0;
    color: var(--color-text-3);
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
