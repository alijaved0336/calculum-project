<template>
<div class="card" :class=" addClass ? 'set-height shadow-none' : ''  ">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row">
      <div class="col-12 d-flex align-items-top">
        <h5 class="text-base font-bold">{{ showForecastVolume ? 'Spend (F) & Entities' : title }}
          <CalculumTooltipIcon :infoText="tooltipText" :advancedTooltipClass="advancedTooltipClass" :uniqueIdentifier="uniqueIdentifier" :keyPopOver="keyPopOver"></CalculumTooltipIcon>
        </h5>
      </div>
    </div>
    <div class="row">
      <div class="col-12 d-flex">
        <p class="mb-1 min-h-4 mx-auto text-gray-500 text-xs">{{ `${bigNumberTitle}${ showForecastVolume ? " (F)" : "" }` }}
          <CalculumTooltipIcon :info-text="bigNumberTitleTooltip"></CalculumTooltipIcon>
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
              <CalculumTooltipIcon :info-text="numberLeftTitleTooltip"></CalculumTooltipIcon></span></div>
          <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
            <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton) && numberLeftValue" :size="'sm'"></SkeletonRectangle><span class="mx-auto font-semibold text-gray-700 text-xl" v-else>{{ numberLeftValue }}</span>
          </div>
        </div>
      </div>
      <div class="col-xl-4 col-lg-4">
        <div class="row">
          <div class="col-12 d-flex min-h-8">
            <p class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs">{{ numberCenterTitle }}
              <CalculumTooltipIcon :info-text="numberCenterTitleTooltip"></CalculumTooltipIcon>
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
              <CalculumTooltipIcon :info-text="numberRightTitleTooltip"></CalculumTooltipIcon>
            </p>
          </div>
          <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
            <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton) && numberRightValue" :size="'sm'"></SkeletonRectangle><span class="mb-0 mx-auto font-semibold text-gray-700 text-xl" v-else>{{ numberRightValue }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import IconChartForecast from "@ada/design-system/assets/icons/iconChartForecast.vue";
import IconChartForecastDown from "@ada/design-system/assets/icons/iconChartForecastDown.vue";

export default defineComponent({
  name: "BigNumberThreeCols",
  components: {
    CalculumTooltipIcon,
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
    advancedTooltipClass: { type: Boolean, default: false },
    uniqueIdentifier: { type: String, default: "" },
    keyPopOver: { type: String, default: "" },
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
</style>
