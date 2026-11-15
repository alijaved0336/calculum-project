<!--
Layout:
```
-- bar --
```
-->
<template>
<div class="row mx-0 w-100">
  <div class="col px-0 wrapper rounded-lg" :style="`background-color: ${bgColor}`" :class="barWrapperBgColorClass">
    <div class="line rounded-lg first-chartline" :style="style" :class="[barBgColorClass]"></div>
  </div>
</div>
</template>
<script lang="ts">
import { computed, defineComponent } from "vue";
import { getBarSize } from "@/utils";

// import * as colorsGroups from '@/utils/ColorsGroups'

export default defineComponent({
  name: "ChartHorizontalSingleBarNew",
  props: {
    barBgColorClass: {
      type: String,
      required: false,
      default: "bg-primary-50",
    },
    barWrapperBgColorClass: { type: String, required: false, default: "" },
    bgColor: { type: String, required: false, default: "#EBECF0" },
    lineColor: { type: String, required: false, default: "#ff2c4f" },
    maxValue: { type: String, required: false, default: "0" },
    percentage: { type: Number, required: false, default: 0 },
    value: { type: Number, required: false, default: 0 },

  },
  setup(props) {

    return {
      getBarSize,
      // Computed styles
      style: computed(() => {
        if (!props.percentage) {
          // Try to convert value and maxValue type to number
          const valueNumber = Number(props.value);
          const maxValueNumber = Number(props.maxValue);

          // If value is not a number
          if (isNaN(valueNumber) || isNaN(maxValueNumber)) {
            return `width: 0%; background-color: ${props.lineColor};`;
          }

          // If barBgColorClass is empty
          if (props.lineColor && !props.barBgColorClass) {
            return `width: ${getBarSize(valueNumber, maxValueNumber)}%; background-color: ${props.lineColor};`;
          }

          // If barBgColorClass is not empty
          return `width: ${getBarSize(valueNumber, maxValueNumber)}%;`;
        }

        return `width: ${props.percentage}%; background-color: ${props.lineColor};`;
      })

    };
  },
});
</script>
<style scoped lang="scss">
.wrapper {
  height: 2rem;
  contain: content;
  position: relative;

  .line {
    height: 100%;
  }
}

.first-chartline {
  position: absolute;
  z-index: 999;
}
</style>
