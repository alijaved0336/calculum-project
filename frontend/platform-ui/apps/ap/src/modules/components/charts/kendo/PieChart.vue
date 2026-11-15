<template>
<Chart :key="chartKey" :style="{ height: setHeight ? setHeight : '', width: '100%' }" @seriesclick="handleSliceClick($event)">
  <ChartTitle :text="chartTitle"></ChartTitle>
  <ChartArea :height="fromValueProposition ? 390 : 430" :margin="{ top: 0, bottom: 0 }"> </ChartArea>
  <ChartSeries>
    <ChartSeriesItem :type="'pie'" :data-items="pieDataComputed" :colorField="'pieSliceColor'" :field="'value'" :category-field="'category'" :labels="{ visible: true, content: labelContent, position: 'outsideEnd', font: '11px Arial' }" :radius="80"></ChartSeriesItem>
  </ChartSeries>
  <ChartLegend v-if="showLegendBottom" :position="'bottom'" :visible="showLegendBottom"></ChartLegend>
</Chart>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, computed, ref } from "vue";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import {
  ChartArea,
  Chart,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  ChartTitle,
  ChartTooltip
} from "@progress/kendo-vue-charts";
import { useI18n } from "vue-i18n";
import { StringUtils, ColorsUtils } from "@/utils";
import { chartsGetItemColorMatch } from "../../utils/utilsCharts";

export default defineComponent({
  name: "PieChart",
  components: {
    ChartArea,
    Chart,
    ChartLegend,
    ChartSeries,
    ChartSeriesItem,
    ChartTitle,
    ChartTooltip
  },
  props: {
    chartTitle: { type: String, default: "" },
    dataPieSeries: { type: Array, required: true },
    dataPieCategories: { type: Array, required: true },
    isBigNumber: { type: Boolean, default: false },
    showLegendBottom: { type: Boolean, default: false },
    showLegendLabels: { type: Boolean, required: false, default: true },
    fromValueProposition: { type: Boolean, default: false },
    setHeight: { type: String, required: false, default: '' }
  },
  emits: ['on-event-click'],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    interface PieChar {
      pieArrayData: Array<any>;
      selectedSliceIndex: number | null;
    }

    const pieData = reactive<PieChar>({
      pieArrayData: [],
      selectedSliceIndex: null
    });

    // Key para forzar re-renderizado del gráfico cuando cambia la selección
    const chartKey = computed(() => {
      return `pie-chart-${pieData.selectedSliceIndex}`
    });

    /**
     * Maneja el evento de clic en un slice del gráfico
     */
    function handleSliceClick(event: any) {
      const clickedIndex = event.point.index
      
      if (pieData.selectedSliceIndex === clickedIndex) {
        pieData.selectedSliceIndex = null
      } else {
        pieData.selectedSliceIndex = clickedIndex
      }
      
      emit('on-event-click', pieData.selectedSliceIndex !== null ? event.category : null)
    }

    interface PieDataItem {
      category: string;
      value: number;
      pieSliceColor: string;
    }

    const getSliceColor = (category: string | undefined, index: number, isSelected: boolean): string => {
      if (isSelected) {
        return colorsGroups.supplierStandard;
      }

      const kendoReturn = kendoChartRelated.getColor(index + 1) || colorsGroups.chartFirstGroup
      if (!category) return kendoReturn;

      // Specific color for SME
      if (category && category.startsWith("SME")) {
        return ColorsUtils.sme;
      }
      // Specific color for match and value proposition (delegated to charts utils)
      const matchedColor = category ? chartsGetItemColorMatch(category) : '';
      return matchedColor || kendoReturn;
    };

    const calculatePercentage = (value: number, total: number): number => {
      if (total <= 0) return 0;
      if (props.showLegendLabels) return value;
      return Math.round((value / total) * 10000) / 10000;
    };

    const processSingleSeries = (): PieDataItem[] => {
      if (!props.dataPieCategories?.length || !props.dataPieSeries?.length) return [];
      return [{
        category: String(props.dataPieCategories[0]),
        value: Number(props.dataPieSeries[0]),
        pieSliceColor: pieData.selectedSliceIndex === 0 ? colorsGroups.supplierStandard : colorsGroups.chartFirstGroup
      }];
    };

    const processMultipleSeries = (): PieDataItem[] => {
      if (!props.dataPieCategories?.length || !props.dataPieSeries?.length) return [];
      
      // Create array of {value, originalIndex} to maintain category mapping after sort
      const indexedValues = props.dataPieSeries.map((value, index) => ({
        value: Number(value),
        originalIndex: index
      }));
      
      // Sort descending by value
      indexedValues.sort((a, b) => b.value - a.value);
      
      const topTen = indexedValues.slice(0, 10);
      const restValues = indexedValues.slice(10);
      
      const totalTen = topTen.reduce((sum, item) => sum + item.value, 0);
      const totalRest = restValues.reduce((sum, item) => sum + item.value, 0);
      const total = totalTen + totalRest;

      // Process top 10 items
      const combinedArray = topTen.map((item, index) => ({
        category: String(props.dataPieCategories[item.originalIndex]),
        value: calculatePercentage(item.value, total),
        pieSliceColor: getSliceColor(String(props.dataPieCategories[item.originalIndex]), index, pieData.selectedSliceIndex === index)
      }));

      // Add "Rest" category if needed
      if (totalRest > 0) {
        const restIndex = combinedArray.length;
        combinedArray.push({
          category: String(translate.t("global.rest")),
          value: calculatePercentage(totalRest, total),
          pieSliceColor: pieData.selectedSliceIndex === restIndex ? colorsGroups.supplierStandard : colorsGroups.restColor
        });
      }

      // Fix rounding errors
      if (props.showLegendLabels === false) {
        const totalPercentage = combinedArray.reduce((sum, item) => sum + item.value, 0);
        const fixTotals = 1 - totalPercentage;
        if (combinedArray.length > 0) {
          combinedArray[0].value += fixTotals;
        }
      }

      return combinedArray;
    };

    const pieDataComputed = computed(() => {
      try {
        return props.dataPieSeries.length === 1 
          ? processSingleSeries() 
          : processMultipleSeries();
      } catch (error) {
        console.error("Error processing pie chart data:", error);
        return [];
      }
    });

    /**
     * Generates the label content for the given data item.
     *
     * @param {any} e - The data item.
     * @return {string} The formatted label content.
     */
    function labelContent(e: any): string {
      
      const valueAsNumber = props.showLegendLabels ? e.percentage : e.dataItem.value      
      const numberFormattedPercent = props.dataPieSeries.length === 1 ? StringUtils.formatPercentage(1) : StringUtils.formatPercentage(valueAsNumber);
      const valueFormatted = props.showLegendLabels ? StringUtils.formatBigNumbers(e.dataItem.value) : e.dataItem.value

      if (props.showLegendLabels) {
        return `${valueFormatted} (${numberFormattedPercent})`;
      } else {
        return `${numberFormattedPercent}`;
      }
    }
    return {
      ...toRefs(pieData),
      chartKey,
      handleSliceClick,
      labelContent,
      pieDataComputed
    };
  }
});
</script>

<style lang="scss" scoped>
// Pointer cursor for clickable slices
:deep(.k-chart) {
  .k-chart-surface {
    path {
      cursor: pointer;
    }
  }
}
</style>
