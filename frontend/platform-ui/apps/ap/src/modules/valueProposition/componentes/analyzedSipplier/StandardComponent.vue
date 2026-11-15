<template>
<div class="row">
  <div class="col-md-12 mb-3">
    <div class="right-boxes-container-chart" :class="isExportingToPdf ? 'pdf-export-mode-to-info-cards' : ''">
      <ChartQuartileComponent :objData="value"></ChartQuartileComponent>
    </div>
  </div>
</div>
<div class="row d-flex" :class="isExportingToPdf ? 'mt-2' : ''">
  <div class="col-md-4 pr-2 d-flex flex-column">
    <div class="right-boxes-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode-to-info-cards' : ''">
      <InfoStandardBoxComponent :objData="cfOpp"></InfoStandardBoxComponent>
    </div>
  </div>
  <div class="col-md-4 pr-2 d-flex flex-column">
    <div class="right-boxes-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode-to-info-cards' : ''">
      <InfoStandardBoxComponent :objData="paymentTermsChange"></InfoStandardBoxComponent>
    </div>
  </div>
  <div class="col-md-4 d-flex flex-column">
    <div class="right-boxes-container flex-grow-1" :class="isExportingToPdf ? 'pdf-export-mode-to-info-cards' : ''">
      <InfoStandardBoxComponent :objData="numberOfOccurrences"></InfoStandardBoxComponent>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive, toRefs } from 'vue'
import InfoStandardBoxComponent from './boxes/InfoStandardBoxComponent.vue';
import { AnalyzedSupplierStandard } from '../../types';
import { ObjectUtils } from '@/utils';
import ChartQuartileComponent from './ChartQuartileComponent.vue';

export default defineComponent({
    name: 'StandardComponent',
    components: {
        InfoStandardBoxComponent,
        ChartQuartileComponent
    },
    props: {
        objData: { type: Object as PropType<AnalyzedSupplierStandard>, required: true },
        isExportingToPdf: { type: Boolean, required: false, default: false }
    },
    setup(props) {
        const data=reactive({
            value: ObjectUtils.cloneDeep(props.objData),
            cfOpp: props.objData.cfOpp,
            paymentTermsChange: props.objData.paymentTermsChange,
            numberOfOccurrences: props.objData.numberOfOccurrences
        })
        return {
            ...toRefs(data)        }
    }
})
</script>

<style scoped>
.right-boxes-container {
    background-color: #fff;
    padding: 10px 5px 1px 5px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}
.right-boxes-container-chart {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}
</style>