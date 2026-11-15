<template>
<div class="d-flex w-100">
  <div class="card d-flex flex-column gap-2 w-100">
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '30%', height: '12px', borderRadius:'8px' }"></Skeleton>
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '60%', height: '12px', borderRadius:'8px' }"></Skeleton>
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '60%', height: '12px', borderRadius:'8px' }"></Skeleton>
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '60%', height: '12px', borderRadius:'8px' }">   </Skeleton>
  </div>
</div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";

export default defineComponent({
  name: "SkeletonScrollCards",
  components: {
    Skeleton
  },  
  setup() {
    
  }
});
</script>
<style lang="scss" scoped>

.card {
  min-height: 100px !important;
  max-height: 100px !important;
}

</style>
