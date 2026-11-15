<script setup lang="ts">
import { Input as KendoInput } from "@progress/kendo-vue-inputs";
import type {
  TextInputFillMode,
  TextInputRounded,
  TextInputSize,
} from "./types";

defineOptions({
  name: "TextInput",
});

withDefaults(
  defineProps<{
    modelValue?: string | number | null;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    size?: TextInputSize;
    fillMode?: TextInputFillMode;
    rounded?: TextInputRounded;
    type?: string;
    name?: string;
    id?: string;
  }>(),
  {
    modelValue: "",
    placeholder: undefined,
    label: undefined,
    disabled: false,
    size: "medium",
    fillMode: "outline",
    rounded: "medium",
    type: "text",
    name: undefined,
    id: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
}>();

/** Kendo emits `update:modelValue` on both input and change — forward for controlled v-model. */
function onUpdateModelValue(value: string | number | null | undefined) {
  emit("update:modelValue", String(value ?? ""));
}

function onChange(event: {
  value?: string | number | null;
  target?: { value?: string };
}) {
  emit("change", String(event?.value ?? event?.target?.value ?? ""));
}
</script>

<template>
  <KendoInput
    class="ds-text-input"
    :model-value="modelValue ?? ''"
    :placeholder="placeholder"
    :label="label"
    :disabled="disabled"
    :size="size"
    :fill-mode="fillMode"
    :rounded="rounded"
    :type="type"
    :name="name"
    :id="id"
    @update:model-value="onUpdateModelValue"
    @change="onChange"
  />
</template>
