<template>
<div class="row w-100 card-view-plan mb-3 shadow-none">
  <div class="col-sm-12 col-md-12 col-lg-3 d-flex flex-column justify-content-between p-4">
    <div class="row">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }"></Skeleton>
    </div>
    <div class="div card-details">
      <div class="row card-details" v-for="i in 3">
        <div class="col-5 col-sm-5 col-md-5">
          <Skeleton class="skeletons-bg mt-2" :shape="'rectangle'" :style="{ width: '100%', height: '15px', borderRadius: '8px' }"></Skeleton>
        </div>
        <div class="col-2"></div>
        <div class="col-5 col-sm-5 col-md-5">
          <Skeleton class="skeletons-bg mt-2" :shape="'rectangle'" :style="{ width: '100%', height: '15px', borderRadius: '8px' }"></Skeleton>
        </div>
      </div>
    </div>
  </div>
  <div class="col-sm-12 col-md-12 col-lg-3 d-flex flex-column justify-content-between">
    <div class="div mt-3">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
    <div class="div mt-3">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">         </Skeleton>
    </div>
    <div class="div mt-3">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
  </div>
  <div class="col-sm-12 col-md-12 col-lg-2 d-flex flex-column justify-content-between p-4">
    <div class="div">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
    <div class="div mt-3">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
    <div class="div mt-3">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
  </div>
  <div class="col-sm-12 col-md-12 col-lg-2 d-flex flex-column justify-content-between p-4">
    <div class="div">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
    <div class="div mt-3">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
    <div class="div mt-3">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '80%', height: '10px', borderRadius: '58px' }"></Skeleton>
      <Skeleton class="skeletons-bg mt-3" :shape="'rectangle'" :style="{ width: '80%', height: '25px', borderRadius: '58px' }">   </Skeleton>
    </div>
  </div>
  <div class="col-sm-12 col-md-12 col-lg-2 d-flex flex-column">
    <div class="row mt-5"></div>
    <div class="row">
      <div class="col-12 d-flex align-items-center justify-content-center">
        <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '250px', height: '250px', borderRadius:  '8px' }"></Skeleton>
      </div>
    </div>
  </div>
</div>
<div class="row card-view-section-details w-100 d-flex align-items-center justify-content-center" v-if="hasAccordion">
  <div class="col-sm-12 col-md-12 col-lg-12 d-flex align-items-center justify-content-center">
    <div class="col-5 p-0"></div>
    <div class="col-2 p-0">
      <Skeleton class="skeletons-bg mt-4 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '15px', borderRadius:  '8px' }"></Skeleton>
    </div>
    <div class="col-5 p-0"></div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Card } from "@progress/kendo-vue-layout";
import { ArcGauge } from "@progress/kendo-vue-gauges";

export default defineComponent({
  name: "PhaseCardSkeleton",
  components: {
    ArcGauge,
    Card,
    Skeleton
  },
  props: {
    hasAccordion: {type: Boolean, default: false}
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
@media screen and (max-width: 990px) {
  .card-details{
    margin-top: 1rem;
  }
}

/** For card and skeletons */
.k-card.k-card-vertical.d-flex {
  display: flex;
  flex-direction: row;
}

.card-view-plan {
  min-height: 320px;
  box-sizing: border-box;
  width: 100%;
  background: #FFF;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  padding: 24px 10px;
  transition: all 0.3s ease;
  cursor: none;
}

.arc-values{
  min-width: 40px;
  max-width: 40px;
}

.card-view-section-details {
  width: 100%;
  background-color: #fff;
  border-radius: 8px;
  height: 60px;
  // display: flex;
  // align-items: center;
  // justify-self: center;
  // justify-content: center;
}
</style>
