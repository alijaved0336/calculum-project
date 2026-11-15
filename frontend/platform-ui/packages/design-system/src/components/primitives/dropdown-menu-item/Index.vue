<script setup lang="ts">
import { computed } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "@ada/design-system/utils/svgAssets";
import BodyText from "../typography/body-text/Index.vue";
import { RadioButton } from "../kendo-inputs/radio-button";
import { CheckBox } from "../kendo-inputs/check-box";
import { ToggleSwitch } from "../kendo-inputs/toggle-switch";
import type {
  DropdownMenuItemStart,
  DropdownMenuItemTrailing,
} from "./types";

defineOptions({
  name: "DropdownMenuItem",
});

const props = withDefaults(
  defineProps<{
    /** Primary label (required unless default slot provides text). */
    label?: string;
    /** Left adornment — mutually exclusive variants. */
    start?: DropdownMenuItemStart;
    /**
     * Source for the start adornment:
     * - `image` — image URL
     * - `logo` — design-system SVG asset name (e.g. `logo-calculum`)
     */
    startSrc?: string;
    /** Alt text when `start` is `image`. */
    startAlt?: string;
    /** Right adornment — mutually exclusive variants. */
    trailing?: DropdownMenuItemTrailing;
    /**
     * Selected / on state for check, checkbox, radio, and switch.
     * Bind with `v-model:selected`.
     */
    selected?: boolean;
    disabled?: boolean;
    /** Force active/hover styling (e.g. keyboard focus). */
    active?: boolean;
    /** Radio group name when `trailing="radio"`. */
    radioName?: string;
    /** Value for the radio option when `trailing="radio"`. */
    radioValue?: string | number;
  }>(),
  {
    label: undefined,
    start: "none",
    startSrc: undefined,
    startAlt: "",
    trailing: "none",
    selected: false,
    disabled: false,
    active: false,
    radioName: undefined,
    radioValue: undefined,
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
  "update:selected": [value: boolean];
}>();

const checkSrc = computed(() => resolveSvgAsset("check"));
const chevronSrc = computed(() => resolveSvgAsset("chevron-right"));

const logoSrc = computed(() => {
  const name = props.startSrc?.trim();
  return name ? resolveSvgAsset(name) : "";
});

const interactiveTrailing = computed(
  () =>
    props.trailing === "radio" ||
    props.trailing === "switch" ||
    props.trailing === "checkbox",
);

const rootTag = computed(() => (interactiveTrailing.value ? "div" : "button"));

const showStartImage = computed(
  () => props.start === "image" && Boolean(props.startSrc),
);
const showStartLogo = computed(
  () => props.start === "logo" && Boolean(logoSrc.value),
);
const showCheck = computed(() => props.trailing === "check" && props.selected);
const showCheckbox = computed(() => props.trailing === "checkbox");
const showRadio = computed(() => props.trailing === "radio");
const showSwitch = computed(() => props.trailing === "switch");
const showChevron = computed(() => props.trailing === "chevron");

const radioModel = computed(() =>
  props.selected ? (props.radioValue ?? "on") : null,
);

function onRowClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault();
    return;
  }

  if (props.trailing === "switch" || props.trailing === "checkbox") {
    emit("update:selected", !props.selected);
  }

  emit("click", event);
  if (props.trailing === "check" || props.trailing === "radio") {
    emit("update:selected", true);
  }
}

function onToggleUpdate(next: boolean) {
  if (!props.disabled) {
    emit("update:selected", next);
  }
}

function onRadioUpdate() {
  if (!props.disabled) {
    emit("update:selected", true);
  }
}

/** Interactive controls keep the click; chevron lets the row handle it. */
function onTrailingAreaClick(event: MouseEvent) {
  if (!showChevron.value) {
    event.stopPropagation();
  }
}
</script>

<template>
  <component
    :is="rootTag"
    class="ds-dropdown-menu-item"
    :class="{
      'is-selected': selected,
      'is-active': active,
      'is-disabled': disabled,
    }"
    role="option"
    :type="rootTag === 'button' ? 'button' : undefined"
    :aria-selected="selected || undefined"
    :aria-disabled="disabled || undefined"
    :disabled="rootTag === 'button' ? disabled : undefined"
    :tabindex="rootTag === 'div' && !disabled ? 0 : undefined"
    @click="onRowClick"
  >
    <span
      v-if="showStartImage || showStartLogo || $slots.start"
      class="ds-dropdown-menu-item__start"
      :class="{
        'ds-dropdown-menu-item__start--image': showStartImage,
        'ds-dropdown-menu-item__start--logo': showStartLogo,
      }"
      aria-hidden="true"
    >
      <slot name="start">
        <img
          v-if="showStartImage"
          :src="startSrc"
          :alt="startAlt"
          class="ds-dropdown-menu-item__start-media"
        >
        <InlineSvg
          v-else-if="showStartLogo"
          class="ds-dropdown-menu-item__start-media"
          :src="logoSrc"
          width="28"
          height="28"
        />
      </slot>
    </span>

    <span class="ds-dropdown-menu-item__label">
      <slot>
        <BodyText
          variant="sm"
          :weight="selected ? 'semibold' : 'medium'"
          as="span"
        >
          {{ label }}
        </BodyText>
      </slot>
    </span>

    <span
      v-if="
        showCheck ||
          showCheckbox ||
          showRadio ||
          showSwitch ||
          showChevron ||
          $slots.trailing
      "
      class="ds-dropdown-menu-item__trailing"
      @click="onTrailingAreaClick"
    >
      <slot name="trailing">
        <InlineSvg
          v-if="showCheck"
          class="ds-dropdown-menu-item__check"
          :src="checkSrc"
          width="16"
          height="16"
          aria-hidden="true"
        />
        <CheckBox
          v-else-if="showCheckbox"
          :model-value="selected"
          :aria-label="label || startAlt || 'option'"
          :disabled="disabled"
          size="small"
          @update:model-value="onToggleUpdate"
        />
        <RadioButton
          v-else-if="showRadio"
          :model-value="radioModel"
          :value="radioValue ?? 'on'"
          :name="radioName"
          :aria-label="label || startAlt || 'option'"
          :disabled="disabled"
          size="small"
          @update:model-value="onRadioUpdate"
        />
        <ToggleSwitch
          v-else-if="showSwitch"
          :model-value="selected"
          :disabled="disabled"
          size="small"
          @update:model-value="onToggleUpdate"
        />
        <InlineSvg
          v-else-if="showChevron"
          class="ds-dropdown-menu-item__chevron"
          :src="chevronSrc"
          width="16"
          height="16"
          aria-hidden="true"
        />
      </slot>
    </span>
  </component>
</template>

<style lang="scss" scoped>
.ds-dropdown-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 0.5rem 0.625rem;
  border: 1px solid transparent;
  border-radius: var(--border-radius-2);
  background: transparent;
  color: var(--color-text-1);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &.is-selected,
  &.is-active {
    background: var(--bg-surface-subtle-2);
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__start {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    &--image .ds-dropdown-menu-item__start-media {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: var(--border-radius-2);
      object-fit: cover;
    }

    &--logo .ds-dropdown-menu-item__start-media {
      width: 1.75rem;
      height: 1.75rem;
      color: var(--color-text-1);
    }
  }

  &__label {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__trailing {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    margin-left: auto;
  }

  &__check {
    color: var(--color-primary, #5b5fc7);
  }

  &__chevron {
    color: var(--color-text-2, var(--color-text-1));
  }
}
</style>
