<template>
<div class="card home-card-height shadow-none" :class=" addClass ? 'set-height shadow-none' : ''  ">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row">
      <div class="col-12 d-flex align-items-top">
        <h5 class="text-base font-bold">{{ title }}
          <TooltipButton :text="tooltipText"></TooltipButton>
        </h5>
      </div>
    </div>
    <div class="row d-flex justify-content-between align-items-center w-100">
      <div class="col-6 d-flex flex-column align-items-start">
        <span class="mb-1 min-h-4 text-gray-500 text-xs">{{ bigNumberTitle }}
          <TooltipButton :text="bigNumberTitleTooltip"></TooltipButton>
        </span>
        <div class="col-12 d-flex min-h-11 horizontal-aligments-center">
          <SkeletonRectangle v-if="showSkeleton || activeSkeleton" size="lg"></SkeletonRectangle>
          <p class="mb-0 font-semibold text-gray-700 text-5xl" v-else>{{ bigNumberValue }}</p>
        </div>
      </div>
      <div class="col-6" style="background-color: #f9fafb; border-radius: 0.375rem;">
        <div class="col-12" v-for="(item, index) in listOfSecondaryItems" :key="index">
          <div class="row">
            <div class="col-12 d-flex min-h-8"><span class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs">{{ item.title }}
                <TooltipButton :text="item.tooltip"></TooltipButton></span></div>
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
import TooltipButton from "../primitives/tooltip-button/Index.vue";
import SkeletonRectangle from "../skeletons/SkeletonRectangle.vue";

export default defineComponent({
  name: "BigNumberTwoCol",
  components: {
    TooltipButton,
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
// .set-height {
//   min-height: 21.5rem !important;
// }



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

.card-body {
    flex: 1 1 auto;
    min-height: 1px;
    padding: 1.25rem;
}

</style>
