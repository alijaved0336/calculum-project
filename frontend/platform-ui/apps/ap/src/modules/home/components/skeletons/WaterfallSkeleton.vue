<template>
<div class="row">
  <div class="col-12">
    <div class="row mb-2 mt-2">
      <div class="d-flex gap-2 w-100">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '50%', height: '55px' }"></Skeleton>
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '50%', height: '55px' }"></Skeleton>
      </div>
      <div class="d-flex w-100 mt-4">
        <Card class="d-flex" :style="{'min-width': '350px', width: '100%', height: 'auto', gap: '0.5%' }">
          <Skeleton class="skeletons-bg skeleton-water-fall-1" :shape="'rectangle'" :style="{ width: '10%', height: '30px' }"></Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-2" :shape="'rectangle'" :style="{ width: '10%', height: '40px' }"></Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-3" :shape="'rectangle'" :style="{ width: '10%', height: '60px' }"></Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-4" :shape="'rectangle'" :style="{ width: '10%', height: '10px' }"></Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-5" :shape="'rectangle'" :style="{ width: '10%', height: '80px' }">               </Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-6" :shape="'rectangle'" :style="{ width: '10%', height: '40px' }">                               </Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-7" :shape="'rectangle'" :style="{ width: '10%', height: '60px' }"></Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-8" :shape="'rectangle'" :style="{ width: '10%', height: '25px' }"></Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-9" :shape="'rectangle'" :style="{ width: '10%', height: '45px' }"></Skeleton>
          <Skeleton class="skeletons-bg skeleton-water-fall-10" :shape="'rectangle'" :style="{ width: '10%', height: '420px' }"></Skeleton>
        </Card>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent } from 'vue'
import { Skeleton } from '@progress/kendo-vue-indicators';
import { Card } from '@progress/kendo-vue-layout';

export default defineComponent({
  name: 'WaterfallSkeleton',
  components: {
    Skeleton, Card
  }
})
</script>
<style lang="scss" scoped>

/** For card and skeletons */
.k-card.k-card-vertical.d-flex {
    display: flex;
    flex-direction: row;
}

</style>