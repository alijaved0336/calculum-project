<template>
<svg fill="currentColor" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <line id="primary" x1="3.75" y1="15" x2="26.25" y2="15" :style="`fill: none; stroke: ${color}; stroke-linecap: round; stroke-width: 2.5;`"></line>
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
