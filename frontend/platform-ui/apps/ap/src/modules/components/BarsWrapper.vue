<template>
<BarsComponent :mainValue="mainValueComputed" :extraValue="extraValueComputed" :contractualValue="contractualValue" :maxValue="MAX_TERMS_DAYS_CHARTS.toString()" :showSkeleton="isLoading" :title="title" :tooltipText="tooltipText" :activeSkeleton="activeSkeletonComputed" :type="type"></BarsComponent>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { MAX_TERMS_DAYS_CHARTS } from "@/utils";
import BarsComponent from "@/modules/components/BarsComponent.vue";

export default defineComponent({
  name: "BarsWrapper",
  components: {
    BarsComponent
  },
  props: {
    extraValue: { type: Number, required: false, default: null },
    mainValue: { type: Number, required: false, default: null },    
    contractualValue: { type: Number, required: false, default: null },    
    activeSkeleton: { type: Boolean, required: false, default: false },
    showSkeleton: { type: Boolean, required: false, default: false },
    title: { type: String, required: false, default: "" },
    tooltipText: { type: String, required: false, default: "" },
    type: { type: String, required: false, default: "" }

    
  },
  setup(props) {


    const activeSkeletonComputed = computed(() => {
      return props.activeSkeleton;
    })

    const extraValueComputed = computed(() => {
      return props.extraValue;
    });

    const mainValueComputed = computed(() => {
      return props.mainValue;
    });
    const isLoading = computed(() => {
      return props.showSkeleton;
    });

    
    return {
      activeSkeletonComputed,
      extraValueComputed,
      mainValueComputed,    
      isLoading,
      MAX_TERMS_DAYS_CHARTS,
    };
  },
});
</script>
