<template>
<div class="row">
  <div class="col-6">
    <div class="col-12 rounded-corners">
      <div class="col-12 bg-white d-flex flex-column">
        <div class="row mt-3"> </div>
        <div class="row mt-3"> </div>
      </div>
      <StrategiesBlockSkeleton :numberOfRows="4"></StrategiesBlockSkeleton>
      <div class="col-12 bg-white d-flex flex-column">
        <div class="row mt-3"> </div>
        <div class="row mt-3"> </div>
      </div>
    </div>
  </div>
  <div class="col-6">
    <div class="col-12 rounded-corners h-100">
      <AdabotSkeleton></AdabotSkeleton>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";
import AdabotSkeleton from "@/modules/home/components/skeletons/AdabotSkeleton.vue";
import StrategiesBlockSkeleton from "@/modules/home/components/skeletons/StrategiesBlockSkeleton.vue";
export default defineComponent({
  name: "StrategiesSkeleton",
  components: {
    AdabotSkeleton,
    Skeleton,
    StrategiesBlockSkeleton
  },
  setup(props) {
    return {
        props
    }
  }
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";

/** For card and skeletons */
.k-card.k-card-vertical.d-flex {
  display: flex;
  flex-direction: row;
}
.row > [class*="col-"]:has(> .card) {
  display: flex;
}

.row > [class*="col-"]:has(> .card) > .card {
  width: 100%;
}

.rounded-corners {
  border-radius: 8px;
  background-color: #fff;
 
}

</style>
