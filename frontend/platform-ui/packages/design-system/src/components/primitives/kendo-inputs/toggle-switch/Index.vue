<script setup lang="ts">
import { computed } from "vue";
import { Switch as KendoSwitch } from "@progress/kendo-vue-inputs";
import type { ToggleSwitchRounded, ToggleSwitchSize } from "./types";

defineOptions({
  name: "ToggleSwitch",
});

const props = withDefaults(
  defineProps<{
    /** Controlled on state (`v-model`). */
    modelValue?: boolean;
    disabled?: boolean;
    size?: ToggleSwitchSize;
    /** Track + thumb corner radius (`trackRounded` / `thumbRounded` in Kendo). */
    rounded?: ToggleSwitchRounded;
    /**
     * Label shown when on (maps to Kendo `onLabel`).
     * Named `labelOn` so `v-bind` / Storybook do not treat it as an event listener.
     */
    labelOn?: string;
    /** Label shown when off (maps to Kendo `offLabel`). */
    labelOff?: string;
  }>(),
  {
    modelValue: false,
    disabled: false,
    size: "small",
    rounded: "full",
    labelOn: "",
    labelOff: "",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  change: [value: boolean];
}>();

/** Bootstrap theme hides labels via `display: none` — enable only when text is set. */
const isLabeled = computed(
  () => Boolean(props.labelOn?.trim()) || Boolean(props.labelOff?.trim()),
);

/**
 * Pass Kendo label props via object bind so Vue does not treat `onLabel`
 * as an event listener attribute.
 */
const kendoLabelProps = computed(() => ({
  onLabel: props.labelOn,
  offLabel: props.labelOff,
}));

/** Kendo's Switch still fires `change` on click while `disabled`; a disabled switch must not toggle. */
function onChange(event: { value?: boolean }) {
  if (props.disabled) return;
  const next = Boolean(event?.value);
  emit("update:modelValue", next);
  emit("change", next);
}
</script>

<template>
  <KendoSwitch
    :class="[
      'ds-toggle-switch',
      { 'ds-toggle-switch--labeled': isLabeled },
    ]"
    v-bind="kendoLabelProps"
    :checked="modelValue"
    :disabled="disabled"
    :size="size"
    :track-rounded="rounded"
    :thumb-rounded="rounded"
    @change="onChange"
  />
</template>

<style lang="scss" scoped>
/*
 * Kendo Bootstrap theme sets `.k-switch-label-* { display: none }` by design.
 * Show labels when the DS wrapper has non-empty labelOn / labelOff.
 */
.ds-toggle-switch--labeled {
  min-width: 3.75rem;

  :deep(.k-switch-track) {
    min-width: 3.75rem;
  }

  :deep(.k-switch-label-on),
  :deep(.k-switch-label-off) {
    display: block;
    font-size: 0.6875rem;
    line-height: 1;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    max-width: calc(100% - 1.75rem);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :deep(.k-switch-label-on) {
    left: 0.35rem;
    color: #fff;
  }

  :deep(.k-switch-label-off) {
    right: 0.35rem;
    color: var(--color-text-2, #6c757d);
  }
}
</style>
