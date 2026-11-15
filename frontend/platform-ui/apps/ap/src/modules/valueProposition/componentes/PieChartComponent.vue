<template>
<div class="d-flex-flex-column justify-content-between align-items-center title-pie">
  <h1 class="mb-1 font-bold text-base mb-6"><span class="text-gray-700 text-xl cursor-pointer truncate-title font-semibold">{{ title }}</span></h1>
  <div class="text-left" v-if="totalShow !== ''"><span class="mr-2">{{ `${$t("global.total")} Analyzed` }}:</span><span class="font-bold">{{ totalShowComputed }}</span></div>
</div>
<div class="row">
  <div class="col-md-12">
    <PieChart :chartTitle="objData.chartTitle" :dataPieSeries="dataPieSeriesBarCleanedValues" :dataPieCategories="dataPieCategoriesCleanedValues" :isBigNumber="objData.isBigNumber" :showLegendBottom="objData.showLegendBottom" :setHeight="objData.setHeight" :fromValueProposition="objData.fromValueProposition" :showLegendLabels="objData.showLegendLabels"></PieChart>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs } from 'vue';
import PieChart from "@/modules/components/charts/kendo/PieChart.vue";
import { StringUtils } from '@/utils';
export default defineComponent({
  name: 'PieChartComponent',
  components: {
    PieChart
  },
  props: {
    chartTitleBar: { type: String, default: "" },
    dataPieSeriesBar: { type: Array, required: true },
    dataPieCategoriesBar: { type: Array, required: true },
    isBigNumberBar: { type: Boolean, default: false },
    showLegendBottomBar: { type: Boolean, default: false },
    setHeightBar: { type: String, required: false, default: '' },
    title: { type: String, required: true, default: '' },
    fromValueProposition: { type: Boolean, default: false },
    showLegendLabels: { type: Boolean, required: false, default: true },
    totalShow: { type: String, required: true, default: '' }
  },
  setup(props) {
    const data = reactive({
      objData: {
        chartTitle: props.chartTitleBar,
        dataPieSeries: props.dataPieSeriesBar,
        dataPieCategories: props.dataPieCategoriesBar,
        isBigNumber: props.isBigNumberBar,
        showLegendBottom: props.showLegendBottomBar,
        fromValueProposition: props.fromValueProposition,
        showLegendLabels: props.showLegendLabels,
        setHeight: props.setHeightBar
      }
    })
    const dataPieCategoriesCleanedValues = computed(() => {
      return props.dataPieCategoriesBar.map(v => !v ? "Empty" : v);
  });
  const dataPieSeriesBarCleanedValues = computed(() => {
      return props.dataPieSeriesBar.map(v => v === null ? "" : v);
  });
    const totalShowComputed = computed(() => {
      if (props.totalShow) {
        const result = data.objData.dataPieSeries.reduce((a: any, b) => a + b, 0)
        const stringU = StringUtils.formatBigNumbers(Number(result));
        return stringU
      }
      return props.totalShow
    })
    return {
      ...toRefs(data), totalShowComputed, dataPieCategoriesCleanedValues, dataPieSeriesBarCleanedValues
    };
  },
});
</script>
<style scoped>

.title-pie {
    height: 60px;
}

</style>