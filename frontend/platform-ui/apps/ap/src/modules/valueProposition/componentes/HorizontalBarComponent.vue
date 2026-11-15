<template>
<div class="d-flex-flex-column justify-content-between align-items-center mb-12">
  <h1 class="mb-1 font-bold text-base mb-6"><span class="text-gray-700 text-2xl cursor-pointer truncate-title font-semibold">{{ title }}</span></h1>
  <div class="text-left" v-if="totalShow !==''"><span class="mr-2">{{ `${$t("global.total")} Analyzed` }}:</span><span class="font-bold">{{ totalShow }}</span></div>
</div>
<div class="row">
  <div class="col-lg-12">
    <HorizontalBarChart :chartTitle="objData.chartTitle" :dataFirstSeries="objData.dataSeries" :categoriesData="objData.categoriesData" :isBigNumber="objData.isBigNumber" :xAxisTitle="objData.xAxisTitle" :yAxisTitle="objData.yAxisTitle" :chartType="''" :show-more-btn="objData.showMoreBtn"></HorizontalBarChart>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs } from 'vue';
import HorizontalBarChart from "@/modules/components/charts/kendo/HorizontalBarChart.vue";
export default defineComponent({
  name: 'HorizontalBarComponent',
  components: {
    HorizontalBarChart
  },
  props: {
    chartTitleBar: { type: String, default: "" },
    dataSeriesBar: { type: Array, required: true },
    dataCategoriesBar: { type: Array, required: true },
    isBigNumberBar: { type: Boolean, default: false },
    showMoreBtn: { type: Boolean, default: false },
    title: { type: String, required: true, default: '' },
    xAxisTitle: { type: String, required: false, default: '' },
    yAxisTitle: { type: String, required: false, default: '' },
    totalShow: { type: String, required: true, default: '' }
  },
  setup(props) {
    const data = reactive({
      objData: {
        chartTitle: props.chartTitleBar,
        dataSeries: props.dataSeriesBar,
        categoriesData: props.dataCategoriesBar,
        isBigNumber: props.isBigNumberBar,
        showMoreBtn: props.showMoreBtn,
        xAxisTitle: props.xAxisTitle,
        yAxisTitle: props.yAxisTitle,
      }
    }
    )
    return {
      ...toRefs(data),
    };
  },
});
</script>

<style scoped lang="scss"></style>