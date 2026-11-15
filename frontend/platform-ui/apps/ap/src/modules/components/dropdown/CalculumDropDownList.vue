<template>
  <KendoDropDownList
    v-if="!isLoading"
    :data-items="dataList"
    :text-field="'value'"
    :data-item-key="'key'"
    :value="currentOptionSelected"
    :style="'border-radius: 0.5rem !important;'"
    @change="optionSelectedOnChange"
  />
  <div v-else>
    <SkeletonRectangle
      v-if="isLoading"
      :size="'sm'"
      :width-percent-as-string="dropdownWidth"
    />
  </div>
</template>
<script lang="ts">
import { KeyValue } from "@/types";

import { defineComponent, PropType } from "vue";
import { DropDownList } from "@progress/kendo-vue-dropdowns";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";

export default defineComponent({
  name: "CalculumDropDownList",
  components: {
    KendoDropDownList: DropDownList,
    SkeletonRectangle,
  },
  props: {
    disabled: { type: Boolean, default: false },
    currentOptionSelected: {
      type: Object as PropType<
        KeyValue<string, number> | KeyValue<string, string>
      >,
      default: null,
    },
    dataList: {
      type: Array as PropType<
        Array<KeyValue<string, number> | KeyValue<string, string>>
      >,
      required: true,
    },
    dropdownWidth: { type: String, default: "100%" },
    id: { type: [Number, String], required: true },
    label: { type: String, required: false, default: null },
    skeletonShowing: { type: Boolean, default: false },
    tooltipEnabled: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
  },
  emits: ["selected-item"],
  setup(props, { emit }) {
    function optionSelectedOnChange(e: {
      value: KeyValue<string, number> | KeyValue<string, string>;
    }) {
      emit("selected-item", e.value);
    }

    return {
      optionSelectedOnChange,
    };
  },
});
</script>
