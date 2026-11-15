<template>
<div class="card" :class=" addClass ? 'set-height shadow-none' : ''  ">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row">
      <div class="col-12 d-flex align-items-top">
        <h5 class="text-base font-bold">{{ title }}
          <CalculumTooltipIcon :infoText="tooltipText" :advancedTooltipClass="advancedTooltipClass" :uniqueIdentifier="uniqueIdentifier" :keyPopOver="keyPopOver" v-if="tooltipText.length > 0"></CalculumTooltipIcon>
        </h5>
      </div>
    </div>
    <div class="row d-flex justify-content-between align-items-center">
      <div class="col-6">
        <div class="col-12" v-for="(item, index) in listOfMainItems" :key="index + 'main' ">
          <div class="row">
            <div class="col-12 d-flex min-h-8"><span class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs">{{ item.title }}
                <CalculumTooltipIcon :info-text="item.tooltip"></CalculumTooltipIcon></span></div>
            <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
              <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton) && item.value" :size="'sm'"></SkeletonRectangle><span class="mx-auto font-semibold text-gray-700 text-xl" v-else>{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6" style="background-color: #f9fafb; border-radius: 0.375rem;">
        <div class="col-12" v-for="(item, index) in listOfSecondaryItems" :key="index">
          <div class="row">
            <div class="col-12 d-flex min-h-8"><span class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs">{{ item.title }}
                <CalculumTooltipIcon :info-text="item.tooltip"></CalculumTooltipIcon></span></div>
            <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
              <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton) && item.value" :size="'sm'"></SkeletonRectangle><span class="mx-auto font-semibold text-gray-700 text-xl" v-else>{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";

export default defineComponent({
  name: "BigNumberTwoIdenticalColsNew",
  components: {
    CalculumLoading,
    CalculumTooltipIcon,
    SkeletonRectangle,
  },
  props: {
    listOfMainItems: {
      type: Array as () => Array<{
        title: string;
        value: string;
        tooltip?: string;
      }>,
      default: () => [],
    },
    listOfSecondaryItems: {
      type: Array as () => Array<{
        title: string;
        value: string;
        tooltip?: string;
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
    showExpectedValues: { type: Boolean, default: false }
  },
});
</script>

<style lang="scss" scoped>
.set-height {
  min-height: 21.5rem !important;
}
</style>
