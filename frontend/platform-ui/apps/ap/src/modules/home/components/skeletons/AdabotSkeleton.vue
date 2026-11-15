<template>
<div class="row h-100">
  <div class="col-12 d-flex flex-column bg-white justify-content-between">
    <div class="row m-1">
      <div class="col-12 bg-white d-flex flex-column">
        <div class="row mt-3"> </div>
        <div class="row mt-3"> </div>
      </div>
      <div class="col-12">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '16px', borderRadius:  '8px' }"></Skeleton>
      </div>
    </div>
    <div class="row m-1">
      <div class="col-12 bg-white d-flex flex-column">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '16px', borderRadius:  '8px' }">       </Skeleton>
      </div>
    </div>
    <div class="row m-1">
      <div class="col-12 bg-white d-flex flex-column">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '25%', height: '16px', borderRadius:  '8px' }">       </Skeleton>
      </div>
    </div>
    <div class="row m-1" v-for="i in 3">
      <div class="col-12 bg-white d-flex flex-column">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius:  '8px' }">       </Skeleton>
      </div>
    </div>
    <div class="row m-1">
      <div class="col-12 bg-white d-flex flex-column">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '10px', borderRadius:  '8px' }"></Skeleton>
      </div>
    </div>
    <div class="row m-1" v-for="i in 2">
      <div class="col-12 bg-white d-flex flex-column">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius:  '8px' }">       </Skeleton>
      </div>
    </div>
    <div class="row m-1" v-for="i in 3">
      <div class="col-12 bg-white">
        <div class="col-8 offset-2">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '10px', borderRadius:  '8px' }"></Skeleton>
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
  name: "AdabotSkeleton",
  components: {
    Skeleton,
  },
  setup(props) {
    
  }
});

</script>