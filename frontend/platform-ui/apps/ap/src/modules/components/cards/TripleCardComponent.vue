<template>
<div class="card d-flex set-height shadow-none">
  <div class="row">
    <div class="col-6 d-flex flex-column justify-content-between">
      <div class="row">
        <div class="col-12 d-flex align-items-top justify-content-start">
          <div class="text-base font-bold d-flex gap-2 mb-2" style="min-height: 1.5em;"><span>{{ title1 }}</span>
            <CalculumTooltipIconNew :infoText="tooltipText1" v-if="tooltipText1.length > 0 && title1.length > 0"></CalculumTooltipIconNew>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-6 position-relative d-flex align-items-center">
          <div class="row d-flex justify-content-between align-items-stretch p-2 flex-column gap-2 w-100 h-100">
            <div class="d-flex flex-column justify-content-center">
              <div class="d-flex gap-2 align-items-center justify-content-center p-1" v-if="firstItemTitle.length > 0">
                <p class="mb-0 min-h-4 text-gray-500 text-xs text-center">{{ firstItemTitle }}</p>
                <template v-if="firstItemTooltip.length > 0 && firstItemTitle.length > 0">
                  <CalculumTooltipIconNew :info-text="firstItemTooltip"></CalculumTooltipIconNew>
                </template>
              </div>
            </div>
            <div class="d-flex flex-column justify-content-center horizontal-alignments-center">
              <div class="d-flex" v-if="firstItemMain.length > 0">
                <SkeletonRectangle v-if="showSkeleton || activeSkeleton" size="lg"></SkeletonRectangle>
                <p class="mb-0 mx-auto font-semibold text-gray-700 text-5xl" v-else>{{ firstItemMain }}</p>
              </div>
            </div>
            <div class="d-flex flex-column justify-content-center horizontal-aligments-center">
              <div class="d-flex" v-if="firstItemConclusion.length > 0">
                <p class="mb-1 min-h-4 mx-auto text-gray-500 text-xs text-center">{{ firstItemConclusion }}</p>
              </div>
            </div>
          </div>
          <div class="d-flex position-absolute" style="right: 10px; z-index: 1;" v-if="!isSuccess">
            <p class="mb-1 min-h-4 mx-auto text-5xl text-center">→</p>
          </div>
        </div>
        <div class="col-6">
          <div class="row d-flex justify-content-between align-items-stretch p-2 flex-column gap-2 w-100 h-100" :style="{ backgroundColor: !isSuccess ? '#eeeeee' : '' }" style="border-radius: 0.5rem;">
            <div class="d-flex flex-column justify-content-center">
              <div class="d-flex gap-2 align-items-center justify-content-center" v-if="secondItemTitle.length > 0">
                <p class="mb-0 min-h-4 text-gray-500 text-xs text-center p-1">{{ secondItemTitle }}</p>
                <template v-if="secondItemTooltip.length > 0 && secondItemTitle.length > 0">
                  <CalculumTooltipIconNew :info-text="secondItemTooltip"></CalculumTooltipIconNew>
                </template>
              </div>
            </div>
            <div class="d-flex flex-column justify-content-center horizontal-alignments-center">
              <div class="d-flex" v-if="secondItemMain.length > 0">
                <SkeletonRectangle v-if="showSkeleton || activeSkeleton" size="lg"></SkeletonRectangle>
                <p class="mb-0 mx-auto font-semibold text-gray-700 text-5xl" v-else>{{ secondItemMain }}</p>
              </div>
            </div>
            <div class="d-flex flex-column justify-content-center horizontal-aligments-center">
              <div class="d-flex" v-if="secondItemConclusion.length > 0">
                <p class="mb-1 min-h-4 mx-auto text-gray-500 text-xs text-center">{{ secondItemConclusion }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-6 d-flex flex-column justify-content-between">
      <div class="row">
        <div class="col-12 d-flex align-items-top justify-content-center">
          <div class="text-base font-bold d-flex gap-2 mb-2" style="min-height: 1.5em;"><span>{{ title2 }}</span>
            <CalculumTooltipIconNew :infoText="tooltipText2" v-if="tooltipText2.length > 0 && title2.length > 0"></CalculumTooltipIconNew>
          </div>
        </div>
      </div>
      <div class="row h-100" v-if="thirdItemMain.length > 0">
        <div class="col-12 position-relative d-flex align-items-center">
          <div class="row d-flex justify-content-between align-items-stretch p-2 flex-column gap-2 w-100" :style="{ backgroundColor: isSuccess ? '#fff' : '', border: isSuccess ? '1px solid #eaecf0' : '' }" style="border-radius: 0.5rem; ">
            <div class="d-flex flex-column h-100 justify-content-center">
              <div class="d-flex gap-2 align-items-center justify-content-center mb-2" v-if="thirdItemTitle.length > 0">
                <p class="mb-0 min-h-4 text-gray-500 text-xs text-center p-1">{{ thirdItemTitle }}</p>
                <template v-if="thirdItemTooltip.length > 0 && thirdItemTitle.length > 0">
                  <CalculumTooltipIconNew :info-text="thirdItemTooltip"></CalculumTooltipIconNew>
                </template>
              </div>
            </div>
            <div class="d-flex h-100 justify-content-center horizontal-alignments-center gap-4 align-items-center">
              <div class="d-flex flex-column h-100 justify-content-center horizontal-alignments-center">
                <div class="d-flex" v-if="firstItemMain.length > 0">
                  <SkeletonRectangle v-if="showSkeleton || activeSkeleton" size="lg"></SkeletonRectangle>
                  <p class="mb-0 mx-auto font-semibold text-gray-700 text-5xl" v-else>{{ thirdItemMain }}</p>
                </div>
              </div>
              <div class="d-flex">
                <button class="button button--base font-semibold" v-if="!isSuccess" @click="handleCalculatorClick">Calculator</button>
                <div class="like-image-wrapper" v-if="isSuccess"><img class="like-image" src="@/resources/assets/images/like.png" alt="Like"/></div>
              </div>
            </div>
            <div class="d-flex flex-column h-100 justify-content-center horizontal-aligments-center">
              <div class="d-flex" v-if="thirdItemConclusion.length > 0">
                <p class="mb-1 min-h-4 mx-auto text-gray-500 text-xs text-center">{{ thirdItemConclusion }}</p>
              </div>
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
import CalculumTooltipIconNew from "@/modules/components/CalculumTooltipIconNew.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";

export default defineComponent({
  name: "TripleCardComponent",
  components: {
    CalculumLoading,
    CalculumTooltipIconNew,
    SkeletonRectangle,
  },
  props: {
    isSuccess: { type: Boolean, default: false },
    title1: { type: String, default: "" },
    tooltipText1: { type: String, default: "" },
    title2: { type: String, default: "" },
    tooltipText2: { type: String, default: "" },
    firstItemTitle: { type: String, default: "" },
    firstItemTooltip: { type: String, default: "" },
    firstItemMain: { type: String, default: "" },
    firstItemConclusion: { type: String, default: "" },
    secondItemTitle: { type: String, default: "" },
    secondItemTooltip: { type: String, default: "" },
    secondItemMain: { type: String, default: "" },
    secondItemConclusion: { type: String, default: "" },
    thirdItemTitle: { type: String, default: "" },
    thirdItemTooltip: { type: String, default: "" },
    thirdItemMain: { type: String, default: "" },
    thirdItemConclusion: { type: String, default: "" },
    advancedTooltipClass: { type: Boolean, default: false },
    uniqueIdentifier: { type: String, default: "" },
    keyPopOver: { type: String, default: "" },
    showSkeleton: { type: Boolean, default: false },
    activeSkeleton: { type: Boolean, default: false },
    addClass: { type: Boolean, default: false },
    showExpectedValues: { type: Boolean, default: false },
    isInnerCard: { type: Boolean, default: false },
  },
  emits: ["calculator-click"],
  setup(props, { emit }) {
    const handleCalculatorClick = () => {
      emit("calculator-click");
    };

    return {
      handleCalculatorClick,
    };
  },
});
</script>

<style lang="scss" scoped>
.button{

  &--base{
    border-radius: 0.5rem;
    overflow: hidden;
    color: #fff;
    background: #adb6f6;
    padding: 0.5rem 1rem;
    border: none;
    font-size: 1.125rem;
    transition: all 0.3s ease;

    &:hover{
      background: #5266eb;
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
background-color: transparent;
}

.like-image-wrapper{
  width: 4rem;
  min-width: 4rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 100vmax;
  overflow: hidden;

  .like-image{
    width: 100%;
    height: auto;
  }
}
</style>
