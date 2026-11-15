<template>
  <div class="d-flex flex-column" :class="valueSize !== 'xl' ? 'gap-2' : ''">
    <!-- BigNumber Title -->
    <span class="min-h-4 mt-auto text-center text-xs" :class="topLabelColor">
      {{ label }}
      <CalculumTooltipIcon
        v-if="labelTooltip && labelTooltip.length > 0"
        :info-text="labelTooltip"
      />
    </span>
    <div
      class="d-flex text-center justify-content-center align-items-end"
      :class="'min-height-' + minHeight"
    >
      <!-- Value -->
      <SkeletonRectangle
        v-if="isLoading || programIsRecalculating"
        size="lg"
      />
      <span
        v-else
        class="mx-auto font-bold mt-1"
        :class="[topLabelColor || 'text-gray-700', valueClassName]"
      >
        {{ value }}
      </span>
    </div>

    <div
      v-if="equivalentDiscount && !programIsRecalculating"
      class="d-flex text-center justify-content-center equivalent-value"
      :class="'min-height-' + minHeight">

      <Tooltip         
        :open-delay="100"
        :anchor-element="'target'"
        :position="'top'"
      >
        <span class="font-semibold" :title="$t('global.equivalentDiscountTooltip')">{{ $t('global.equivalentDiscount', { value: equivalentDiscount }) }}</span>
        
      </Tooltip>
    </div>  
  </div>  
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import {Tooltip} from "@progress/kendo-vue-tooltip";


export default defineComponent({
  name: "BigValueLabelOnTop",
  components: { CalculumTooltipIcon, SkeletonRectangle, Tooltip },
  props: {
    isLoading: { type: Boolean, default: false },
    label: { type: String, default: "" },
    labelTooltip: { type: String, default: "" },
    minHeight: {type: Number, default: 11},
    topLabelColor: {type: String, required: false, default: "text-gray-700"},
    value: { type: String, default: "" },
    valueSize: {
      type: String,
      default: "xl",
      validator: (val: string) =>
        ["xl", "2xl", "3xl", "4xl", "5xl"].includes(val),
    },
    equivalentDiscount: { type: String, required: false, default: null },
    programIsRecalculating: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    return {
      valueClassName: computed(() => {
        // Validate
        if (!["xl", "2xl", "3xl", "4xl", "5xl"].includes(props.valueSize)) {
          return "text-xl";
        }

        return `text-${props.valueSize}`;
      }),
    };
  },
});
</script>

