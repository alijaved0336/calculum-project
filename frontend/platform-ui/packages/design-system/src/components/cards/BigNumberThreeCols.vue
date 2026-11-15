<template>
<div class="d-flex flex-column justify-content-between h-100" :class="addClass ? 'set-height' : ''">
    <div class="row">
      <div v-if="title" class="col-12 d-flex align-items-center justify-content-center">
        <span class="text-base font-bold me-2">{{ showForecastVolume ? 'Spend (F) & Entities' : title }}</span>
        <TooltipButton :text="tooltipText"></TooltipButton>
      </div>
    </div>
    <div class="row">
      <div class="col-12 d-flex">
        <p class="mb-1 min-h-4 mx-auto text-gray-500 text-xs">{{ `${bigNumberTitle}${ showForecastVolume ? " (F)" : "" }` }}
          <TooltipButton :text="bigNumberTitleTooltip"></TooltipButton>
        </p>
      </div>
      <div class="col-12 d-flex min-h-11 horizontal-aligments-center">
        <SkeletonRectangle v-if="showSkeleton || activeSkeleton" size="lg"></SkeletonRectangle>
        <div class="d-flex flex-colum gap-2" v-else><span class="mb-0 mx-auto font-semibold text-gray-700 text-5xl">{{ showForecastVolume ? forecastValueComputed : bigNumberValue }}        </span>
          <div class="d-flex forecast-icon-wrapper gap-1 align-volume-items" v-if="showForecastVolume">
            <IconChartForecast v-if="isForeCastPositiveValue" :color="'#15b79e'"></IconChartForecast>
            <IconChartForecastDown v-if="!isForeCastPositiveValue" :color="'#ff2c4f'"></IconChartForecastDown><span class="text-3xl font-medium" id="foreCastComputed" :class="isForeCastPositiveValue ? 'text-forecast' : 'text-forecast-warning' "> {{ `${foreCastPercentageComputedBigNumbers}%` }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-xl-4 col-lg-4">
        <div class="row">
          <div class="col-12 d-flex min-h-8"><span class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs">{{ numberLeftTitle }}
              <TooltipButton :text="numberLeftTitleTooltip"></TooltipButton></span></div>
          <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
            <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton) && numberLeftValue" :size="'sm'"></SkeletonRectangle><span class="mx-auto font-semibold text-gray-700 text-xl" v-else>{{ numberLeftValue }}</span>
          </div>
        </div>
      </div>
      <div class="col-xl-4 col-lg-4">
        <div class="row">
          <div class="col-12 d-flex min-h-8">
            <p class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs">{{ numberCenterTitle }}
              <TooltipButton :text="numberCenterTitleTooltip"></TooltipButton>
            </p>
          </div>
          <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
            <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton || showExpectedValues) && numberCenterValue" :size="'sm'"></SkeletonRectangle><span class="mb-0 mx-auto font-semibold text-gray-700 text-xl" v-else>{{ numberCenterValue }}</span>
          </div>
        </div>
      </div>
      <div class="col-xl-4 col-lg-4">
        <div class="row">
          <div class="col-12 d-flex min-h-8">
            <p class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs">{{ numberRightTitle }}
              <TooltipButton :text="numberRightTitleTooltip"></TooltipButton>
            </p>
          </div>
          <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
            <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton) && numberRightValue" :size="'sm'"></SkeletonRectangle><span class="mb-0 mx-auto font-semibold text-gray-700 text-xl" v-else>{{ numberRightValue }}</span>
          </div>
        </div>
      </div>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import TooltipButton from "../primitives/tooltip-button/Index.vue";
import SkeletonRectangle from "../skeletons/SkeletonRectangle.vue";
import IconChartForecast from "../../assets/icons/iconChartForecast.vue";
import IconChartForecastDown from "../../assets/icons/iconChartForecastDown.vue";

export default defineComponent({
  name: "BigNumberThreeCols",
  components: {
    TooltipButton,
    SkeletonRectangle,
    IconChartForecast,
    IconChartForecastDown
  },
  props: {
    bigNumberTitle: { type: String, default: "" },
    bigNumberTitleTooltip: { type: String, default: "" },
    bigNumberValue: { type: String, default: "" },
    numberCenterTitle: { type: String, default: "" },
    numberCenterTitleTooltip: { type: String, default: "" },
    numberCenterValue: { type: String, default: "" },
    numberLeftTitle: { type: String, default: "" },
    numberLeftTitleTooltip: { type: String, default: "" },
    numberLeftValue: { type: String, default: "" },
    numberRightTitle: { type: String, default: "" },
    numberRightTitleTooltip: { type: String, default: "" },
    numberRightValue: { type: String, default: "" },
    title: { type: String, default: "" },
    tooltipText: { type: String, default: "" },
    showSkeleton: { type: Boolean, default: false },
    activeSkeleton: { type: Boolean, default: false },
    addClass: { type: Boolean, default: false },
    showExpectedValues: { type: Boolean, default: false },
    isForeCastPositiveValue: { type: Boolean, default: false, required: false },
    showForecastVolume: { type: Boolean, default: false, required: false },
    foreCastPercentageComputedBigNumbers: { type: String, default: "", required: false },
    forecastValueComputed: { type: String, default: "", required: false },
  },
});
</script>

<style lang="scss" scoped>
.set-height {
  min-height: 21.5rem !important;
}

// min-h-N utilities on a 0.25rem scale (Bootstrap has no numbered min-height scale).
.min-h-4 {
  min-height: 1rem;
}

.min-h-8 {
  min-height: 2rem;
}

.min-h-9 {
  min-height: 2.25rem;
}

.min-h-11 {
  min-height: 2.75rem;
}

.horizontal-aligments-center {
  justify-content: center;
}

.align-volume-items {
  align-items: center;
}
</style>
