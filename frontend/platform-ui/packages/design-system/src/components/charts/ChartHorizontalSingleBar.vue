<!--
Layout:
```
-- bar --
```
-->
<template>
<div class="row mx-0 w-100">
  <div class="col px-0 wrapper rounded-bars" :style="`background-color: ${bgColor}`" :class="barWrapperBgColorClass">
    <div class="line rounded-bars first-chartline" :style="style" :class="[barBgColorClass]"></div>
  </div>
</div>
</template>
<script lang="ts">
import { computed, defineComponent } from "vue";
import { getBarSize } from "../../utils";

export default defineComponent({
  name: "ChartHorizontalSingleBar",
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
          if (props.lineColor) {
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
  height: 16px;
  contain: content;
  position: relative;

  .line {
    height: 100%;
    // Diagonal stripes as a translucent white overlay, so they tint whatever fill color the bar
    // gets (inline lineColor or a bg-* class) without needing a per-color stripe shade.
    background-image: repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08) 0 6px,
      transparent 6px 12px
    );
  }
}

.first-chartline {
  position: absolute;
  z-index: 999;
}

.rounded-bars {
  border-radius: 4px;
}

</style>
