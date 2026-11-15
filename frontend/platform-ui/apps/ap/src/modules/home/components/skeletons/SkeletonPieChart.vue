<template>
  <Skeleton
    class="mb-2"
    :shape="'circle'"
    :style="{
      width: '200px',
      height: '200px',
      'margin-inline': 'auto'
    }"
  />

  <div class="d-flex justify-content-center align-items-center gap-2">
    <Skeleton
      class="skeletons-bg"
      :shape="'rectangle'"
      :style="{
        width: '10px',
        height: '5px'
      }"
    />

    <Skeleton
      class="skeletons-bg"
      :shape="'text'"
      :style="{
        width: '50px'
      }"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";

export default defineComponent({
  name: "SkeletonPieChart",
  components: {
    Skeleton
  }
});
</script>
