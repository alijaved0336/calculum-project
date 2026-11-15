<template>
<div class="col-12 p-4">
  <div class="row">
    <div class="col-12 d-flex">
      <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '40px', height: '40px', borderRadius:  '8px' }"></Skeleton>
      <div class="d-flex flex-column col-6">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '16px', borderRadius:  '8px' }"></Skeleton>
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '10px', borderRadius:  '8px' }">           </Skeleton>
      </div>
    </div>
  </div>
  <div class="row mt-3">
    <div class="col-12 d-flex align-items-center justify-content-between">
      <div class="col-6 d-flex align-items-center m-0">
        <div class="col-1 m-0 p-1">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius:  '8px' }"></Skeleton>
        </div>
        <div class="col-1 m-0 p-1">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius:  '8px' }"></Skeleton>
        </div>
        <div class="col-1 m-0 p-1">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius:  '8px' }"></Skeleton>
        </div>
        <div class="col-1 m-0 p-1">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius:  '8px' }"></Skeleton>
        </div>
        <div class="col-1 m-0 p-1">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius:  '8px' }">   </Skeleton>
        </div>
      </div>
      <div class="d-flex justify-content-end">
        <div class="col-2">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '30px', borderRadius:  '8px' }"></Skeleton>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";

export default defineComponent({
  name: "HeaderSkeleton",
  components: {
    Skeleton,
  },
  setup(props) {
    
  }
});

</script>