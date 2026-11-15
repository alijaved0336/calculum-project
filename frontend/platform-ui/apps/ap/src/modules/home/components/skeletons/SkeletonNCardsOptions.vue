<script lang="ts">
import { defineComponent } from "vue";
import { NumberUtils } from "@/utils";
import { Skeleton } from "@progress/kendo-vue-indicators";

export default defineComponent({
  name: "SkeletonNCardsOptions",
  components: {
    Skeleton
  },
  props: {
    numberOfCards: { type: Number, required: true }
  },
  setup() {
    return {
      NumberUtils
    };
  }
});
</script>

<template>
  <div class="d-flex gap-4 justify-content-center">
    <Skeleton
      v-for="i in numberOfCards"
      :key="i"
      :shape="'rectangle'"
      :style="{
        // Get a random number between 30 and 80
        width: `100px`,
        height: '100px',
        borderRadius: '8px',
        marginBlock: '8px'
      }"
      class="skeletons-bg"
    />
  </div>
</template>
