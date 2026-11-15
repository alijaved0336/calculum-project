<script setup lang="ts">
import { TextArea as KendoTextArea } from "@progress/kendo-vue-inputs";
import type {
  TextAreaFillMode,
  TextAreaRounded,
  TextAreaSize,
} from "./types";

defineOptions({
  name: "TextArea",
});

withDefaults(
  defineProps<{
    modelValue?: string | null;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    size?: TextAreaSize;
    fillMode?: TextAreaFillMode;
    rounded?: TextAreaRounded;
    name?: string;
    id?: string;
  }>(),
  {
    modelValue: "",
    placeholder: undefined,
    disabled: false,
    rows: 3,
    size: "medium",
    fillMode: "outline",
    rounded: "medium",
    name: undefined,
    id: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
}>();

/** Kendo emits `update:modelValue` on both input and change — forward for controlled v-model. */
function onUpdateModelValue(
  value: string | number | string[] | null | undefined,
) {
  const next = Array.isArray(value) ? value.join("") : value;
  emit("update:modelValue", String(next ?? ""));
}

function onChange(event: { value?: string | number | null }) {
  emit("change", String(event?.value ?? ""));
}
</script>

<template>
  <KendoTextArea
    class="ds-text-area"
    :model-value="modelValue ?? ''"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows"
    :size="size"
    :fill-mode="fillMode"
    :rounded="rounded"
    :name="name"
    :id="id"
    @update:model-value="onUpdateModelValue"
    @change="onChange"
  />
</template>
