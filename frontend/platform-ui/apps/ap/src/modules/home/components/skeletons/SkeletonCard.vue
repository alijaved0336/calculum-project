<template>
<div class="col-12 col-sm-12 col-md-6 col-lg-4 col-xl-3 mb-4 w-100">
  <div class="card-v2 d-flex flex-column justify-content-between">
    <div class="d-flex flex-column justify-content-between" style="width: 100%;">
      <div class="d-flex flex-column">
        <div class="d-flex justify-content-center mb-16" style="width: 100%;">
          <div class="col-1"></div>
          <div class="col-10 w-100">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '24px', borderRadius:'8px' }"></Skeleton>
          </div>
          <div class="col-1"></div>
        </div>
        <div class="d-flex justify-content-center row-100" v-for="n in numberOfRowForTopSection" :key="n">
          <Skeleton class="skeletons-bg mb-3" :shape="'rectangle'" :style="{ width: '60%', height: '14px', borderRadius:'8px' }"></Skeleton>
        </div>
        <div class="row mt-3"></div>
        <div class="d-flex row-100">
          <hr class="vector"/>
        </div>
        <div class="d-flex flex-column justify-content-between body-card align-items-center mt-2">
          <Skeleton class="skeletons-bg mb-3" :shape="'rectangle'" :style="{ width: '100%', height: '14px', borderRadius:'8px' }"></Skeleton>
          <Skeleton class="skeletons-bg mb-3" :shape="'rectangle'" :style="{ width: '90%', height: '14px', borderRadius:'8px' }"></Skeleton>
          <Skeleton class="skeletons-bg mb-3" :shape="'rectangle'" :style="{ width: '90%', height: '14px', borderRadius:'8px' }"></Skeleton>
          <Skeleton class="skeletons-bg mb-3" :shape="'rectangle'" :style="{ width: '90%', height: '14px', borderRadius:'8px' }"></Skeleton>
          <Skeleton class="skeletons-bg mb-3" :shape="'rectangle'" :style="{ width: '90%', height: '14px', borderRadius:'8px' }"></Skeleton>
        </div>
      </div>
    </div>
    <div class="d-flex row-100">
      <div class="col-sm-12 col-md-6 col-lg-6 d-flex align-items-center justify-content-center">
        <Skeleton class="skeletons-bg mb-1" :shape="'rectangle'" :style="{ width: '100%', height: '48px', borderRadius:'8px' }"></Skeleton>
      </div>
      <div class="col-sm-12 col-md-6 col-lg-6 d-flex align-items-center justify-content-center">
        <Skeleton class="skeletons-bg mb-1" :shape="'rectangle'" :style="{ width: '100%', height: '48px',    borderRadius:'8px' }"></Skeleton>
      </div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { Skeleton } from "@progress/kendo-vue-indicators";



export default defineComponent({
  name: "SkeletonCard",
  components: {
    Skeleton
  },
  props: {
    numberOfRowForTopSection: {type: Number, required: false, default: 1}
  },
  setup(props) {
    
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

.card-v2 {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;  
  width: 100%;
  min-height: 410px;
  max-height: 410px;
  background: #FFFFFF;
  border: 1px solid #EAECF0;
  box-shadow: 0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06);
  border-radius: 8px;
  padding: 24px;

  @media (min-width: 1200px) and (max-width: 1313px) {
    min-height: 460px;
    max-height: 460px;
    padding: 16px;
  }
}
.body-card {
  padding: 0px 24px;
  width: 100%;
}


.vector {
  width: 100%;
  height: 0px;
  border: 1px solid #EAECF0;
  flex: none;
  order: 1;
  align-self: stretch;
  flex-grow: 0;
}
</style>
