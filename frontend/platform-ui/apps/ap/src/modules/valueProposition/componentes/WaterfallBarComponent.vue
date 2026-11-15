<template>
<div class="d-flex-flex-column justify-content-between align-items-center mb-12">
  <h1 class="mb-1 font-bold text-base mb-6"><span class="text-gray-700 text-2xl cursor-pointer truncate-title font-semibold">{{ objData.title }}</span></h1>
  <div class="text-left" v-if="objData.totalShow !== ''"><span class="mr-2">{{ `${$t("global.total")} Analyzed` }}:</span><span class="font-bold">{{ objData.totalShow }}</span></div>
</div>
<div class="row">
  <div class="col-lg-12">
    <WaterfallChart :dataValues="parsedData" :xAxisTitle="objData.xAxisTitle" :fromWaterFall="true" :rotationXAxisLabel="objData.rotationXAxisLabel" :showLegends="showLegends"></WaterfallChart>
  </div>
</div>
</template>

<script lang="ts">
import WaterfallChart from '@/modules/components/charts/kendo/WaterfallChart.vue';
import { computed, defineComponent, reactive, toRefs } from 'vue';


interface WaterfallItem {
  index: number;
  value: number;
  amount: number;
  number: number;
  itemTitle: string;
  phaseName: string;
}
export default defineComponent({
  name: 'WaterfallBarComponent',
  components: {
    WaterfallChart
  },
  props: {
    chartTitleBar: { type: String, default: "" },
    dataValues: { type: Array, required: true },
    isBigNumberBar: { type: Boolean, default: false },
    title: { type: String, required: true, default: '' },
    xAxisTitle: { type: String, required: false, default: '' },
    yAxisTitle: { type: String, required: false, default: '' },
    rotationXAxisLabel: { type: Boolean, required: false, default: true },
    totalShow: { type: String, required: true, default: '' },
    showLegends: { type: Boolean, required: false, default: true }
  },
  setup(props) {
    const data = reactive({
      objData: {
        chartTitle: props.chartTitleBar,
        dataValues: props.dataValues,
        isBigNumber: props.isBigNumberBar,
        xAxisTitle: props.xAxisTitle,
        yAxisTitle: props.yAxisTitle,
        totalShow: props.totalShow,
        title: props.title,
        rotationXAxisLabel: props.rotationXAxisLabel,
      }
    })


    function processPhaseNames(items: WaterfallItem[]): WaterfallItem[] {
      return items.map(item => {
        const newPhaseName = item.phaseName.replaceAll(' ', '\n'); // If you want just replace in the first space change replaceAll to replace
        return { ...item, phaseName: newPhaseName };
      });
    }
    const parsedData = computed(() => {
      return processPhaseNames(data.objData.dataValues as WaterfallItem[])
    })
    return {
      ...toRefs(data), parsedData
    };
  },
});
</script>

<style scoped lang="scss"></style>