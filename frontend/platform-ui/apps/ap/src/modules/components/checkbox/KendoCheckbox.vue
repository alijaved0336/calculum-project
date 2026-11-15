<template>
  <Checkbox
    :default-checked="defaultChecked"
    :label="labelText"
    :disabled="disabled"
    @change="$emit('change', $event)"
  />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Checkbox } from "@progress/kendo-vue-inputs";

export default defineComponent({
  name: "KendoCheckbox",
  components: {
    Checkbox,
  },
  props: {
    defaultChecked: { type: Boolean, required: false, default: false },
    labelText: { type: String, required: false, default: "" },
    disabled: { type: Boolean, required: false, default: false },
  },
  emits: ["change"],
  setup(props, { emit }) {
    return {};
  },
});
</script>
