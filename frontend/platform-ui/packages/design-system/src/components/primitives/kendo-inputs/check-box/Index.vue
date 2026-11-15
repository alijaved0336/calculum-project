<script setup lang="ts">
import { computed } from "vue";
import { Checkbox as KendoCheckbox } from "@progress/kendo-vue-inputs";
import type { CheckBoxRounded, CheckBoxSize } from "./types";

defineOptions({
  name: "CheckBox",
});

const props = withDefaults(
  defineProps<{
    /** Controlled checked state (`v-model`). */
    modelValue?: boolean | null;
    label?: string;
    /** Accessible name when used without a visible label. */
    ariaLabel?: string;
    /**
     * Id(s) of the element(s) that describe this checkbox (e.g. surrounding hint/legal text) -
     * Kendo's own `ariaDescribedBy` prop, which lands the attribute on the actual `<input>`.
     * Passing plain `aria-describedby` on `<CheckBox>` instead falls through onto Kendo's own
     * wrapper `<span>` (this component's root element), not the input - `aria-describedby` there
     * is never read by a screen reader when the input itself receives focus.
     */
    ariaDescribedby?: string;
    disabled?: boolean;
    size?: CheckBoxSize;
    /** Corner radius (`rounded` in Kendo). */
    rounded?: CheckBoxRounded;
    indeterminate?: boolean;
  }>(),
  {
    modelValue: false,
    label: undefined,
    ariaLabel: undefined,
    ariaDescribedby: undefined,
    disabled: false,
    size: "medium",
    rounded: "medium",
    indeterminate: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  change: [value: boolean];
}>();

const checked = computed(() =>
  props.indeterminate ? null : Boolean(props.modelValue),
);

function onChange(event: { value?: boolean | null }) {
  const next = Boolean(event?.value);
  emit("update:modelValue", next);
  emit("change", next);
}
</script>

<template>
  <KendoCheckbox
    class="ds-check-box"
    :checked="(checked as boolean | undefined)"
    :label="label"
    :disabled="disabled"
    :size="size"
    :rounded="rounded"
    :aria-label="ariaLabel"
    :aria-described-by="ariaDescribedby"
    @change="onChange"
  />
</template>
