<script setup lang="ts">
import { computed } from "vue";
import { RadioButton as KendoRadioButton } from "@progress/kendo-vue-inputs";
import type { RadioButtonSize, RadioButtonValue } from "./types";

defineOptions({
  name: "RadioButton",
});

const props = withDefaults(
  defineProps<{
    /**
     * Selected value of the radio group (`v-model`).
     * This option is checked when `modelValue === value`.
     */
    modelValue?: RadioButtonValue | null;
    /** Value emitted when this option is selected. */
    value: RadioButtonValue;
    name?: string;
    label?: string;
    ariaLabel?: string;
    disabled?: boolean;
    size?: RadioButtonSize;
  }>(),
  {
    modelValue: null,
    name: undefined,
    label: undefined,
    ariaLabel: undefined,
    disabled: false,
    size: "medium",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: RadioButtonValue];
  change: [value: RadioButtonValue];
}>();

const isChecked = computed(() => props.modelValue === props.value);

function onChange() {
  emit("update:modelValue", props.value);
  emit("change", props.value);
}
</script>

<template>
  <KendoRadioButton
    class="ds-radio-button"
    :checked="isChecked"
    :value="value"
    :name="name"
    :label="label"
    :disabled="disabled"
    :size="size"
    :aria-label="ariaLabel"
    @change="onChange"
  />
</template>
