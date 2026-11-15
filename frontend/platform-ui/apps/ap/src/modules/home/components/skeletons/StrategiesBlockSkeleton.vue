<template>
<div class="col-12 bg-white d-flex flex-column">
  <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '25%', height: '16px', borderRadius:  '8px' }"></Skeleton>
  <div class="row mt-3 mb-3" v-for="i in numberOfRows">
    <div class="col-12 d-flex flex-column">
      <div class="d-flex align-items-center">
        <div class="value">
          <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '16px', borderRadius:  '8px' }"></Skeleton>
        </div>
        <div class="col-11 d-flex flex-column">
          <div class="row">
            <div class="col">
              <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '25%', height: '16px', borderRadius:  '8px' }"></Skeleton>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '16px', borderRadius:  '8px' }"></Skeleton>
            </div>
          </div>
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
  name: "StrategiesBlockSkeleton",
  components: {
    Skeleton,
  },
  props: {
    numberOfRows: { type: Number, required: false, default: 3 },
  },
  setup(props) {
    return {
        props
    }
    
  }
});

</script>

<style scoped>
  .value{
    width: 50px;
  }
</style>