<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
      <div class="col-lg-12">
        <Editor v-model="textToEditorFirst" :tools="basicTools" :default-content="textToEditorFirst" :content-style="{ height: '25vh' }" @change="onEditorChangeFirst"></Editor>
      </div>
    </div>
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons-edition">
        <button class="btn outline-secondary-btn font-md text-capitalize modal-btn" @click="cancelEdition">{{ $t('global.cancel') }}        </button>
        <button class="btn btn-primary font-md text-capitalize modal-btn" @click="saveText">{{ $t('global.save') }}</button>
      </div>
    </div>
  </div>
</div>
<div class="content-editor mb-4" v-if="objData.visibility || editionMode">
  <div class="row mb-3 d-flex">
    <div class="col-md-7 d-flex">
      <div class="row flex-grow-1">
        <div class="col-md-12">
          <div class="chart-container">
            <HorizontalBarComponent :chartTitle="objData.charts.horizontals.perCreditRating.chartTitle" :dataSeriesBar="objData.charts.horizontals.perCreditRating.dataSeries" :dataCategoriesBar="objData.charts.horizontals.perCreditRating.categoriesData" :isBigNumberBar="true" :show-more-btn="false" title="Spend Volume per Credit Rating" yAxisTitle="Credit Rating" xAxisTitle="Spend Volume" :totalShow="''"></HorizontalBarComponent>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-5 d-flex">
      <div class="detailed-text-container flex-grow-1">
        <div v-html="textToEditorFirst"></div>
      </div>
    </div>
  </div>
  <div class="row mb-3 d-flex">
    <div class="col-md-7 d-flex">
      <div class="row flex-grow-1">
        <div class="col-md-12">
          <div class="chart-container">
            <HorizontalBarComponent :chartTitle="objData.charts.horizontals.perSmeRegion.chartTitle" :dataSeriesBar="objData.charts.horizontals.perSmeRegion.dataSeries" :dataCategoriesBar="objData.charts.horizontals.perSmeRegion.categoriesData" :isBigNumberBar="true" :show-more-btn="false" title="SMEs per Region" yAxisTitle="Buyer Region" xAxisTitle="Number of SMEs" :totalShow="''"></HorizontalBarComponent>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-5 d-flex">
      <div class="chart-container flex-grow-1">
        <PieChartComponent chartTitleBar="" :dataPieSeriesBar="objData.charts.pies.perBuyerLeverage.dataSeries" :dataPieCategoriesBar="objData.charts.pies.perBuyerLeverage.categoriesData" :isBigNumberBar="true" :showLegendBottomBar="true" :setHeightBar="'350px'" title="Your Buyer Leverage / Materiality" :totalShow="''" :showLegendLabels="false"></PieChartComponent>
      </div>
    </div>
  </div>
  <div class="row mb-3 d-flex">
    <div class="col-md-6 d-flex">
      <div class="chart-container flex-grow-1">
        <PieChartComponent chartTitleBar="" :dataPieSeriesBar="objData.charts.pies.perSupplierSize.dataSeries" :dataPieCategoriesBar="objData.charts.pies.perSupplierSize.categoriesData" :isBigNumberBar="true" :showLegendBottomBar="true" :setHeightBar="'430px'" title="Supplier Company Size" :totalShow="''" :fromValueProposition="true" :showLegendLabels="false"></PieChartComponent>
      </div>
    </div>
    <div class="col-md-6 d-flex">
      <div class="chart-container flex-grow-1">
        <PieChartComponent v-if="objData.charts.pies.perSupplierCountry" chartTitleBar="" :dataPieSeriesBar="objData.charts.pies.perSupplierCountry.dataSeries" :dataPieCategoriesBar="objData.charts.pies.perSupplierCountry.categoriesData" :isBigNumberBar="true" :showLegendBottomBar="true" :setHeightBar="'430px'" title="Spend Volume Distribution per Supplier Country" :totalShow="''" :fromValueProposition="true" :showLegendLabels="false"></PieChartComponent>
        <PieChartComponent v-if="objData.charts.pies.perCommodity" chartTitleBar="" :dataPieSeriesBar="objData.charts.pies.perCommodity.dataSeries" :dataPieCategoriesBar="objData.charts.pies.perCommodity.categoriesData" :isBigNumberBar="true" :showLegendBottomBar="true" :setHeightBar="'430px'" title="Category / Commodity" :totalShow="''" :fromValueProposition="true" :showLegendLabels="false"></PieChartComponent>
      </div>
    </div>
  </div>
  <div class="overlay-vp-editor" v-if="editionMode">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
      <div class="d-flex gap-2">
        <div class="icon-subcomponent" @click="showModal" :title="'Edit Content'"><i class="fa-solid fa-pencil text-sm" :title="'Edit Content'"></i></div>
        <div class="icon-subcomponent" @click="$emit('change-content', objData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
        <div class="icon-subcomponent" v-if="objData.visibility" :title="'Hide Content'" @click="$emit('change-content', objData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"> </i></div>
        <div class="icon-subcomponent" v-if="!objData.visibility" :title="'Show Content'" @click="$emit('change-content', objData, null, 'showOrHide')"> <i class="fa-solid fa-eye text-base" :title="'Show Content'"></i></div>
      </div>
    </Tooltip>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive, ref, toRefs } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { Editor } from '@progress/kendo-vue-editor';
import { ObjectUtils } from '@/utils';
import { basicTools } from '../data/editor';
import DataDisplayComponent from './DataDisplayComponent.vue';
import HorizontalBarComponent from './HorizontalBarComponent.vue';
import PieChartComponent from './PieChartComponent.vue';
import PieChart from "@/modules/components/charts/kendo/PieChart.vue";
import { SpendVolumeDistributedType } from '../types';
export default defineComponent({
    name: 'SpendVolumeDistributed',
    components: {
        Editor, Tooltip, DataDisplayComponent, HorizontalBarComponent, PieChart,PieChartComponent
    },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<SpendVolumeDistributedType>, required: true },
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        interface DataInterface {
            showModalEdit: boolean,
            objData: SpendVolumeDistributedType
            objDataInitial: SpendVolumeDistributedType
        }
        const data: DataInterface = reactive<DataInterface>({
            showModalEdit: false,
            objData: ObjectUtils.cloneDeep(props.objectContent),
            objDataInitial: ObjectUtils.cloneDeep(props.objectContent)
        })
        const textDefaultToShowFirst = ref(props.objectContent.textFirst)
        const textToEditorFirst = ref(ObjectUtils.cloneDeep(textDefaultToShowFirst.value))
        const onEditorChangeFirst = (event: any) => {
            textToEditorFirst.value = event.html;
        };
        const showModal = () => {
            data.showModalEdit = true
        }
        const saveText = () => {
            data.objData.textFirst = textToEditorFirst.value
            emit('change-content', data.objData, { obj: data.objData }, 'spendVolumeDistributed')
            data.showModalEdit = false
        }
        function cancelEdition() {
            data.showModalEdit = false
            textToEditorFirst.value = ObjectUtils.cloneDeep(textDefaultToShowFirst.value)
        }

        return { ...toRefs(data), showModal, cancelEdition, saveText, textToEditorFirst, onEditorChangeFirst, basicTools }
    }
})
</script>

<style scoped lang="scss">
.detailed-text-container {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}


.chart-container {
    background-color: #fff;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
    min-height: 550px;
}

</style>