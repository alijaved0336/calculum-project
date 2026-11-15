<script lang="ts">
import { defineComponent } from "vue";
import { NumberUtils } from "@/utils";
import { Skeleton } from "@progress/kendo-vue-indicators";

export default defineComponent({
  name: "SkeletonNTextLines",
  components: {
    Skeleton
  },
  props: {
    linesCount: { type: Number, required: true },
    linesWidth: { type: Number, default: -1 }
  },
  setup() {
    return {
      NumberUtils
    };
  }
});
</script>

<template>
  <Skeleton
    v-for="i in linesCount"
    :key="i"
    :shape="'rectangle'"
    :style="{
      // Get a random number between 30 and 80 if not provided
      width: `${
        linesWidth !== -1
          ? linesWidth
          : NumberUtils.getRandomInt({
              min: 30,
              max: 80
            })
      }%`,
      height: '20px',
      borderRadius: '8px',
      marginBlock: '8px'
    }"
    class="skeletons-bg"
  />
</template>
