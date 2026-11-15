<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
</script>

<template>
  <div class="card shadow-none">
    <div class="card-body d-flex flex-column">
      <div class="row mb-3">
        <div class="col-12 col-lg-12">
          <Skeleton
            class="skeletons-bg mt-2 text-center"
            :shape="'rectangle'"
            :style="{ width: '50%', height: '36px' }"
          ></Skeleton>
        </div>
      </div>
      <div class="row">
        <div class="col-12 col-lg-12">
          <Skeleton
            class="skeletons-bg mt-2 text-center"
            :shape="'rectangle'"
            :style="{ width: '15%', height: '36px' }"
          ></Skeleton>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-12 col-lg-12">
          <Skeleton
            class="skeletons-bg mt-2 text-center"
            :shape="'rectangle'"
            :style="{ width: '50%', height: '36px' }"
          ></Skeleton>
        </div>
      </div>
      <div class="row">
        <div class="col-12 col-lg-12">
          <Skeleton
            class="skeletons-bg mt-2 text-center"
            :shape="'rectangle'"
            :style="{ width: '15%', height: '36px' }"
          ></Skeleton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 240px;
  width: 100%;
}

.card-body {
  padding: 24px;
}
</style>
