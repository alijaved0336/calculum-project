<template>
<svg fill="currentColor" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <polyline id="primary" points="26.25 7.5 17.5 16.25 13.75 12.5 3.75 22.5" :style="`fill: none; stroke: ${color}; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.5;`"></polyline>
  <polyline id="secondary" points="26.25 12.5 26.25 7.5 21.25 7.5" :style="`fill: none; stroke: ${color}; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.5;`"></polyline>
</svg>

</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "IconChartForecast",
  props: {
    color: {
      type: String,
      default: "currentColor",
    },
  },
});
</script>
