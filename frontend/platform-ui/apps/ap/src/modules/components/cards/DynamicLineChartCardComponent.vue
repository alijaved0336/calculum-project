<template>
<div class="card d-flex card--inner set-height shadow-none">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row d-flex justify-content-between align-items-stretch" style="flex: 1;">
      <div class="col-12 d-flex flex-column px-1 justify-content-start gap-4" v-if="listOfItems.length > 0">
        <div class="w-100" v-for="(item, index) in listOfItems" :key="index">
          <div class="w-100 d-flex align-items-end">
            <div class="d-flex w-14 justify-content-end horizontal-alignments-right" style="flex:0"><span class="mb-0 min-h-4 mt-auto text-left text-3xl font-semibold" style="line-height: 1em">{{ item.value }}</span></div>
            <div class="col d-flex flex-column horizontal-alignments-left gap-2">
              <div class="chart-line-title d-flex justify-content-between gap-4" style="color: #a5a5a5"><span class="font-semibold text-xs">{{ item.title }}</span><span class="font-semibold text-xs" v-if="item.note && item.note.length > 0">{{ item.note }}</span></div>
              <div class="chart-line-wrapper-n" :class="{['chart-line-wrapper-n--large']: item.isLarge }">
                <div class="chart-line-overlay-n" v-if="(showSkeleton || activeSkeleton) && item.title">
                  <SkeletonRectangle class="w-100" :size="'md'" style="height: 100% !important;"></SkeletonRectangle>
                </div>
                <div class="chart-line-n" v-else :style="{ width: `${item.percentage}%` }" :class="{[`chart-line-n--type-${item.type}`]: item.type }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="d-flex gap-4 w-100 justify-content-center align-items-center mt-8" v-if="isDisplayLabels">
        <div class="d-flex gap-2">
          <div class="color-box color-box--1"></div><span class="font-semibold text-xs">{{ $t('global.internalSource') }}</span>
        </div>
        <div class="d-flex gap-2">
          <div class="color-box color-box--2"></div><span class="font-semibold text-xs"> Internal Source (Supplier Sales Data)</span>
        </div>
        <div class="d-flex gap-2">
          <div class="color-box color-box--3"></div><span class="font-semibold text-xs">No Impact</span>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIconNew from "@/modules/components/CalculumTooltipIconNew.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";

export default defineComponent({
  name: "DynamicLineChartCardComponent",
  components: {
    CalculumLoading,
    CalculumTooltipIconNew,
    SkeletonRectangle,
  },
  props: {
    listOfItems: {
      type: Array as () => Array<{
        title: string;
        value: string;
        percentage: number;
        note?: string;
        type?: string;
        isLarge?: boolean;
      }>,
      default: () => [],
    },
    showSkeleton: { type: Boolean, default: false },
    activeSkeleton: { type: Boolean, default: false },
    addClass: { type: Boolean, default: false },
    showExpectedValues: { type: Boolean, default: false },
    isInnerCard: { type: Boolean, default: false },
    isDisplayLabels: { type: Boolean, default: false },
  },
});
</script>

<style lang="scss" scoped>
.color-box{
  width: 1rem;
  min-width: 1rem;
  aspect-ratio: 1/1;
  background-color: #ebecf0;
  border-radius: 0.25rem;
  overflow: hidden;

  &--1{
    background-color: #5266eb;
  }
  &--2{
    background-color: #17dfa1;
  }
  &--3{
    background-color: #351c75;
  }
}
.chart-line-wrapper-n{
  width: 100%;
  height: 1.5rem;
  display: flex;
  position: relative;
  background-color: #ebecf0;
  border-radius: 0.25rem;
  overflow: hidden;

  &--large{
    height: 2rem;
  }

  .chart-line-overlay-n{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;
  }
  .chart-line-n{
    z-index: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: end;
    color: #fff;
    background-color: #a3adea;
    border-radius: 0.25rem;
    overflow: hidden;

    &--type-1{
      background-color: #5266eb;
    }
    &--type-2{
      background-color: #17dfa1;
    }
    &--type-3{
      background-color: #351c75;
    }
  }
}
.set-height {
  min-height: auto !important;
  flex: 1;
}
.card{
    border: none;
    margin: 0;
    padding: 0;

    .card-body{
      padding:0;
    }
}
</style>
