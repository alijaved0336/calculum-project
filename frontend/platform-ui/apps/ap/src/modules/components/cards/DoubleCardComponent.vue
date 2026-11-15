<template>
<div class="card d-flex" :class="{'set-height shadow-none': addClass,'card--inner': isInnerCard}">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row">
      <div class="col-12 d-flex align-items-top">
        <h5 class="text-base font-bold d-flex gap-2" style="min-height: 1.5em;"><span>{{ title }}</span>
          <CalculumTooltipIconNew :infoText="tooltipText" :advancedTooltipClass="advancedTooltipClass" :uniqueIdentifier="uniqueIdentifier" :keyPopOver="keyPopOver" v-if="tooltipText.length > 0"></CalculumTooltipIconNew>
        </h5>
      </div>
    </div>
    <div class="row d-flex justify-content-between align-items-stretch p-2" style="background-color: #f9fafb; border-radius: 0.375rem; flex: 1;">
      <div class="d-flex flex-column h-100 justify-content-center" style="background-color: #fff; border-radius: 0.375rem;" :class="listOfSecondaryItems.length > 0 ? 'col-6' : 'col-12'">
        <div class="d-flex" v-if="bigNumberTitle.length > 0">
          <p class="mb-1 min-h-4 mx-auto text-gray-500 text-xs text-center">{{ bigNumberTitle }}
            <template v-if="bigNumberTitleTooltip.length > 0">
              <CalculumTooltipIconNew :info-text="bigNumberTitleTooltip"></CalculumTooltipIconNew>
            </template>
          </p>
        </div>
        <div class="d-flex horizontal-aligments-center">
          <SkeletonRectangle v-if="showSkeleton || activeSkeleton" size="lg"></SkeletonRectangle>
          <p class="mb-0 mx-auto font-semibold text-gray-700 text-5xl" v-else>{{ bigNumberValue }}</p>
        </div>
      </div>
      <div class="col-6 d-flex flex-column justify-content-center" v-if="listOfSecondaryItems.length > 0">
        <div class="w-100" v-for="(item, index) in listOfSecondaryItems" :key="index">
          <div class="row">
            <div class="col-12 d-flex min-h-8"><span class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs text-center">{{ item.title }}
                <CalculumTooltipIconNew :info-text="item.tooltip"></CalculumTooltipIconNew></span></div>
            <div class="col-12 d-flex min-h-9 horizontal-aligments-center">
              <SkeletonRectangle class="mt-1" v-if="(showSkeleton || activeSkeleton) && item.value" :size="'sm'"></SkeletonRectangle><span class="mx-auto font-semibold text-gray-700 text-xl" v-else :class="item.isBigValue ? 'text-5xl' : 'text-xl'">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row mt-2" v-if="footer1Text.length > 0 || footer2Text.length > 0">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex justify-content-center" v-if="footer1Text.length > 0 && bigNumberValue" :class="listOfSecondaryItems.length > 0 ? 'col-6' : 'col-12'"><span class="text-gray-500 text-xs">{{ footer1Text }}</span></div>
        <div class="col-6 d-flex justify-content-center" v-if="footer2Text.length > 0 && listOfSecondaryItems.length > 0"><span class="text-gray-500 text-xs">{{ footer2Text }}</span></div>
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
  name: "DoubleCardComponent",
  components: {
    CalculumLoading,
    CalculumTooltipIconNew,
    SkeletonRectangle,
  },
  props: {
    bigNumberTitle: { type: String, default: "" },
    bigNumberTitleTooltip: { type: String, default: "" },
    bigNumberValue: { type: String, default: "" },
    listOfSecondaryItems: {
      type: Array as () => Array<{
        title: string;
        value: string;
        isBigValue?: boolean;
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
    showExpectedValues: { type: Boolean, default: false },
    isInnerCard: { type: Boolean, default: false },
    footer1Text: { type: String, default: "" },
    footer2Text: { type: String, default: "" },
  },
});
</script>

<style lang="scss" scoped>
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
