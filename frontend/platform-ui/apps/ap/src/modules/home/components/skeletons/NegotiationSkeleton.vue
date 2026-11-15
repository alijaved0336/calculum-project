<template>
<div class="row">
  <div class="col-xl-3">
    <div class="card shadow-none">
      <div class="card-body d-flex flex-column">
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-3">
    <div class="card shadow-none">
      <div class="card-body d-flex flex-column">
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-3">
    <div class="card shadow-none">
      <div class="card-body d-flex flex-column">
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-3">
    <div class="card shadow-none">
      <div class="card-body d-flex flex-column">
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '50%', height: '36px' }"></Skeleton>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '15%', height: '36px' }"></Skeleton>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<StrategiesSkeleton> </StrategiesSkeleton>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";
import StrategiesSkeleton from "@/modules/home/components/skeletons/StrategiesSkeleton.vue";
export default defineComponent({
  name: "NegotationSkeleton",
  components: {
    Skeleton,
    StrategiesSkeleton,
  },
  setup(props) {
    return {
      colors: [
        {
          to: 25,
          color: "#EAECF0"
        },
        {
          from: 25,
          to: 50,
          color: "#EAECF0"
        },
        {
          from: 50,
          to: 75,
          color: "#EAECF0"
        },
        {
          from: 75,
          color: "#EAECF0"
        }
      ]
    };
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

.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 250px;
}

.card-body {
  padding: 24px;
}



</style>
