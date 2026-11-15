<template>
<Tooltip :anchor-element="'target'" :position="'top'">
  <div class="progress min-h-10">
    <div class="progress-bar first-bar border-start-charts border-end-charts" :style="{ width: `${firstSection}%` }" role="progressbar" :aria-valuenow="firstSection" aria-valuemin="0" :aria-valuemax="firstSection" ref="firstSectionBar" :title="`${firstSectionTotalHover}  (${firstSection}%)`"><span class="text-sm font-semibold value-label" :title="`${firstSectionTotalHover}  (${firstSection}%)`" :class="firstSection > 10 ? 'ml-2' : ''"> {{ firstSection }}%</span></div>
    <div class="progress-bar border-start-charts bg-teal-600" :style="{ width: `${secondSection}%` }" role="progressbar" :aria-valuenow="secondSection" :aria-valuemin="firstSection" :aria-valuemax="secondSection" ref="secondSectionBar" :title="`${secondSectionTotalHover}  (${secondSection}%)`"><span class="text-sm font-semibold value-label" :title="`${secondSectionTotalHover}  (${secondSection}%)`" :class="secondSection > 10 ? 'ml-2' : ''">{{ secondSection }}%</span></div>
    <div class="progress-bar border-start-charts border-end-charts bg-gray-700" :style="{ width: `${thirdSection}%` }" role="progressbar" :aria-valuenow="thirdSection" :aria-valuemin="secondSection" aria-valuemax="100" ref="thirdSectionBar" :title="`${thirdSectionTotalHover}  (${thirdSection}%)`">     <span class="text-sm font-semibold value-label" :title="`${thirdSectionTotalHover}  (${thirdSection}%)`" :class="thirdSection > 10 ? 'ml-2' : ''">{{ thirdSection }}%</span></div>
  </div>
</Tooltip>
<!-- Container for the numbers below the bar-->
<div class="mt-0 d-flex" style="position: relative; height: 30px;">
  <!-- Number below the start of the first section (red)-->
  <div :class="firstColumnClass" v-if="firstSection !== 0"><span class="text-sm font-bold value-label first-bar-value-label">{{ firstSectionTotalValue }}</span></div>
  <!-- Number below the start of the second section (green)-->
  <div :class="secondColumnClass" v-if="secondSection !== 0"><span class="text-sm font-bold value-label second-bar-value-label">{{ secondSectionTotalValue }}</span></div>
  <div :class="thirdColumnClass" v-if="thirdSection !== 0"><span class="text-sm font-bold value-label third-bar-value-label">{{ thirdSectionTotalValue }}</span></div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, watch, ref, nextTick } from 'vue';
import * as formatData from "@/utils/FormatData";
import { StringUtils } from "@/utils";
import { Tooltip } from '@progress/kendo-vue-tooltip';


export default defineComponent({
  name: 'BarsTricolor',
  components: { Tooltip },
  props: {
    name: { type: String, default: 'economicProfit' }, // "economicProfit"|"cashFlow"|"countSuppliers"|"spendVolume"
    firstSection: { type: Number, default: 0 },
    secondSection: { type: Number, default: 0 },
    thirdSection: { type: Number, default: 0 },
    firstSectionTotal: { type: Number, default: 0 },
    secondSectionTotal: { type: Number, default: 0 },
    thirdSectionTotal: { type: Number, default: 0 },
    decimals: { type: Number, default: 1 },
  },
  setup(props: any) {


    const firstSectionBar = ref<HTMLElement | null>(null);
    const secondSectionBar = ref<HTMLElement | null>(null);
    const thirdSectionBar = ref<HTMLElement | null>(null);

    const firstSectionBarWidth = ref(false);
    const secondSectionBarWidth = ref(false);
    const thirdSectionBarWidth = ref(false);

    const formatTotal = (value: number) =>
      props.name !== 'countSuppliers'
        ? StringUtils.formatBigNumbers(value)
        : formatData.getNumberWithDecimals(value, 0)

    const firstSectionTotalValue = computed(() => formatTotal(props.firstSectionTotal))
    const secondSectionTotalValue = computed(() => formatTotal(props.secondSectionTotal))
    const thirdSectionTotalValue = computed(() => formatTotal(props.thirdSectionTotal))

    const firstSectionTotalHover = computed(() => formatData.getNumberWithDecimals(props.firstSectionTotal, props.decimals))
    const secondSectionTotalHover = computed(() => formatData.getNumberWithDecimals(props.secondSectionTotal, props.decimals))
    const thirdSectionTotalHover = computed(() => formatData.getNumberWithDecimals(props.thirdSectionTotal, props.decimals))
    
    // Count visible items to determine column class
    const visibleItemsCount = computed(() => {
      let count = 0;
      if (props.firstSection !== 0) count++;
      if (props.secondSection !== 0) count++;
      if (props.thirdSection !== 0) count++;
      return count;
    });
    
    // Get column class for first item based on visible items count
    const firstColumnClass = computed(() => {
      const count = visibleItemsCount.value;
      if (count === 1) return 'col-12 text-center';
      if (count === 2) return 'col-6 text-left';
      if (count === 3) return 'col-4 text-left';
      return 'col-4 text-left'; // default
    });
    
    // Get column class for second item based on visible items count
    const secondColumnClass = computed(() => {
      const count = visibleItemsCount.value;
      if (count === 1) return 'col-12 text-center';
      if (count === 2) return 'col-6 text-right';
      if (count === 3) return 'col-4 text-center';
      return 'col-4 text-center'; // default
    });
    
    // Get column class for third item based on visible items count
    const thirdColumnClass = computed(() => {
      const count = visibleItemsCount.value;
      if (count === 1) return 'col-12 text-center';
      if (count === 2) return 'col-6 text-right';
      if (count === 3) return 'col-4 text-right';
      return 'col-4 text-right'; // default
    });
    
    // Update widths calculation to consider both percentage and formatted total values
    const updateWidthsWithValues = () => {
      // Use the computed values to calculate required width
      const firstSectionPercentageText = `${props.firstSection}%`;
      const secondSectionPercentageText = `${props.secondSection}%`;
      const thirdSectionPercentageText = `${props.thirdSection}%`;
      
      const firstSectionFormattedValue = firstSectionTotalValue.value;
      const secondSectionFormattedValue = secondSectionTotalValue.value;
      const thirdSectionFormattedValue = thirdSectionTotalValue.value;
      
      // Consider the maximum length between percentage and formatted value
      const firstSectionMaxTextLength = Math.max(
        firstSectionPercentageText.length,
        firstSectionFormattedValue.toString().length
      );
      const secondSectionMaxTextLength = Math.max(
        secondSectionPercentageText.length,
        secondSectionFormattedValue.toString().length
      );
      const thirdSectionMaxTextLength = Math.max(
        thirdSectionPercentageText.length,
        thirdSectionFormattedValue.toString().length
      );
      
      // Minimum width threshold for text visibility (in pixels)
      const MIN_TEXT_WIDTH = 50;
      // Extra margin for padding and spacing (ml-2 = margin-left)
      const PADDING_MARGIN = 20;

      const firstSectionBarWidthValue = firstSectionBar.value?.getBoundingClientRect().width || 0;
      const secondSectionBarWidthValue = secondSectionBar.value?.getBoundingClientRect().width || 0;
      const thirdSectionBarWidthValue = thirdSectionBar.value?.getBoundingClientRect().width || 0;
      
      // Estimate text width: ~8-10px per character for typical font
      const firstSectionRequiredWidth = Math.max(
        firstSectionMaxTextLength * 10 + PADDING_MARGIN,
        MIN_TEXT_WIDTH
      );
      const secondSectionRequiredWidth = Math.max(
        secondSectionMaxTextLength * 10 + PADDING_MARGIN,
        MIN_TEXT_WIDTH
      );
      const thirdSectionRequiredWidth = Math.max(
        thirdSectionMaxTextLength * 10 + PADDING_MARGIN,
        MIN_TEXT_WIDTH
      );
      
      // Show text only if available width is greater than required width
      firstSectionBarWidth.value = firstSectionBarWidthValue > firstSectionRequiredWidth;
      secondSectionBarWidth.value = secondSectionBarWidthValue > secondSectionRequiredWidth;
      thirdSectionBarWidth.value = thirdSectionBarWidthValue > thirdSectionRequiredWidth;
    };

    const updateWidths = () => {
      // Wait for computed values to be available
      nextTick(() => {
        updateWidthsWithValues();
      });
    };

    onMounted(() => {
      nextTick(() => updateWidths()); // Wait for the DOM to update
    });
   
    watch(
      () => [firstSectionBar.value, secondSectionBar.value, thirdSectionBar.value],
      () => {
        nextTick(() => updateWidths());
      },
      { deep: true }
    );


    watch(
      () => props,
      () => {
        setTimeout(() => {
          updateWidths()

        }, 500)
      },
      { deep: true },
    );

    window.onresize = () => {
      updateWidths()
    };




    return {
      firstSectionBar,
      secondSectionBar,
      thirdSectionBar,
      firstSectionBarWidth,
      secondSectionBarWidth,
      thirdSectionBarWidth,
      firstSectionTotalValue,
      secondSectionTotalValue,
      thirdSectionTotalValue,
      firstSectionTotalHover,
      secondSectionTotalHover,
      thirdSectionTotalHover,
      firstColumnClass,
      secondColumnClass,
      thirdColumnClass
    }
  }
})


// </script>
<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.progress-bar {
  transition: width 0.3s ease;
  text-align: start;
}

.value-label {
  width: fit-content;
}


.first-bar {
  background-color: $color-blue-dark-800;
}

.first-bar-value-label {
  width: fit-content;
  color: $color-blue-dark-800;
}
.second-bar-value-label {
  color: $color-teal-600;
}
.third-bar-value-label {
  color: $color-gray-700;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

</style>
