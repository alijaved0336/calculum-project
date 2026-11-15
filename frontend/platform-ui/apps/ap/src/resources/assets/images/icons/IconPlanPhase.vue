<template>
  <svg :width="getSize.width" :height="getSize.height" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path
      d="M16 128h416c8.8 0 16-7.2 16-16V48c0-8.8-7.2-16-16-16H16C7.2 32 0 39.2 0 48v64c0 8.8 7.2 16 16 16zm480 80H80c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16v-64c0-8.8-7.2-16-16-16zm-64 176H16c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16v-64c0-8.8-7.2-16-16-16z"
       />
  </svg>


</template>
<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "IconPlanPhase",
  props: {
    sizeWidth: { type: String, default: "20" },
    sizeHeight: { type: String, default: "20" }
  },
  setup(props) {
    const getSize = computed(() => {
      return props.sizeWidth !== "20" && props.sizeHeight !== "20" ? { width: String(props.sizeWidth), height: String(props.sizeHeight) } : { width: "20", height: "20" }
    })
    return {
      getSize
    };
  }
});
</script>
