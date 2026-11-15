<template>
<svg
  fill="none"
  width="30"
  height="30"
  viewBox="0 0 30 30"
  xmlns="http://www.w3.org/2000/svg"
>

  <polyline
    points="2,18 6,10 10,18 14,10 18,18 22,10 27,18"
    :style="`fill: none; stroke: ${color}; stroke-linecap: round; stroke-width: 2.5;`"
  />

</svg>



</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "IconChartStable",
  props: {
    color: {
      type: String,
      default: "currentColor",
    },
  },
});
</script>
