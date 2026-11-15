<template>
<div class="card d-flex" :class="{'set-height shadow-none': addClass,'card--inner': isInnerCard}">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row mb-8">
      <div class="col-12 d-flex align-items-top">
        <h5 class="text-base font-bold d-flex gap-2" style="min-height: 1.5em;"><span>{{ title }}</span>
          <CalculumTooltipIconNew :infoText="tooltipText" v-if="tooltipText.length > 0"></CalculumTooltipIconNew>
        </h5>
      </div>
    </div>
    <div class="row d-flex justify-content-between align-items-stretch" style="flex: 1;">
      <div class="col-12 d-flex flex-column px-1 justify-content-start gap-4" v-if="listOfItems.length > 0">
        <div class="w-100" v-for="(item, index) in listOfItems" :key="index">
          <div class="row d-flex align-items-center">
            <div class="col-4 d-flex"><span class="mb-0 min-h-4 mt-auto text-left text-base font-semibold">{{ item.title }}</span></div>
            <div class="col-8 d-flex min-h-9 horizontal-aligments-center">
              <div class="chart-line-wrapper-n">
                <div class="chart-line-overlay-n" v-if="(showSkeleton || activeSkeleton) && item.textLabel">
                  <SkeletonRectangle class="w-100" :size="'md'" style="height: 32px !important;"></SkeletonRectangle>
                </div>
                <div class="chart-line-n" v-else :style="{ width: `${item.percentage}%` }" :class="{'chart-line-n--accent': item.isAccentColor}"><span class="mx-2 font-semibold text-base">{{ item.textLabel }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row mt-2" v-if="footerText.length > 0">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex justify-content-center gap-2 align-items-center ml-auto"><span class="text-gray-500 text-xs">{{ footerText }}</span>
          <CalculumTooltipIconNew :infoText="footerTooltip" v-if="footerTooltip.length > 0"></CalculumTooltipIconNew>
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
  name: "LineChartCardComponent",
  components: {
    CalculumLoading,
    CalculumTooltipIconNew,
    SkeletonRectangle,
  },
  props: {
    listOfItems: {
      type: Array as () => Array<{
        title: string;
        textLabel: string;
        percentage: number;
        isAccentColor?: boolean;
      }>,
      default: () => [],
    },
    title: { type: String, default: "" },
    tooltipText: { type: String, default: "" },
    advancedTooltipClass: { type: Boolean, default: false },
    uniqueIdentifier: { type: String, default: "" },
    keyPopOver: { type: String, default: "" },
    showSkeleton: { type: Boolean, default: false },
    activeSkeleton: { type: Boolean, default: false },
    addClass: { type: Boolean, default: false },
    showExpectedValues: { type: Boolean, default: false },
    isInnerCard: { type: Boolean, default: false },
    footerText: { type: String, default: "" },
    footerTooltip: { type: String, default: "" },
  },
});
</script>

<style lang="scss" scoped>
.chart-line-wrapper-n{
  width: 100%;
  height: 2rem;
  display: flex;
  position: relative;
  background-color: #ebecf0;
  border-radius: 0.25rem;
  overflow: hidden;

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

    &--accent{
      background-color: #5266eb;
    }
  }
}
.set-height {
  min-height: auto !important;
  flex: 1;
}
.card{
  &--inner {
    border: none;
    margin: 0;
    padding: 0;

    .card-body{
      padding-inline:0;
    }
  }
}
</style>
