<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
    </div>
    <div class="row mt-2">
      <div class="col-12">
        <Editor v-model="textToEditor" :tools="basicTools" :default-content="textToEditor" :content-style="{ height: '40vh' }" @change="onEditorChange"></Editor>
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
    <div class="col-md-12 d-flex">
      <div class="row flex-grow-1">
        <div class="col-md-12 mb-3">
          <div class="detailed-text-container">
            <HomeStackedBar :infos="objData.charts.horizontals.dataReceived.infos" :heigthClass="'min-h-16'" :key="'statusesInfo-' + NumberUtils.getRandomInt()" :showPercentage="false"></HomeStackedBar>
          </div>
        </div>
        <div class="col-md-12">
          <div class="detailed-text-container">
            <InfoBoxComponent class="mb-3" :data-received="objData.dataRecieved"></InfoBoxComponent>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row mb-3">
    <div class="col-md-6">
      <div class="chart-container">
        <PieChartComponent chartTitleBar="" :dataPieSeriesBar="objData.charts.pies.matchedUnmatched.dataSeries" :dataPieCategoriesBar="objData.charts.pies.matchedUnmatched.categoriesData" :isBigNumberBar="true" :showLegendBottomBar="true" :setHeightBar="'350px'" title="Matched vs Unmatched Data" :totalShow="'501'"></PieChartComponent>
      </div>
    </div>
    <div class="col-md-6">
      <div class="chart-container">
        <PieChartComponent chartTitleBar="" :dataPieSeriesBar="objData.charts.pies.includeExclude.dataSeries" :dataPieCategoriesBar="objData.charts.pies.includeExclude.categoriesData" :isBigNumberBar="true" :showLegendBottomBar="true" :setHeightBar="'350px'" title="Included vs Excluded Data" :totalShow="'100'"></PieChartComponent>
      </div>
    </div>
  </div>
  <div class="row mb-3" v-if="reasonForExclusionEntities.length > 0">
    <div class="col-md-12">
      <div class="chart-container">
        <DataDisplayComponent v-if="reasonForExclusionEntities.length > 0" :reasonForExclusionEntities="reasonForExclusionEntities" :reasonForExclusionEntitiesTracker="reasonForExclusionEntitiesTracker" :metricSelectionMetricSelected="metricSelectionMetricSelected" :isBigNumber="true" title="Excluded Data" :totalShow="'900'"></DataDisplayComponent>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-12">
      <OverviewLocation :data="countriesMap" :metric-selected="metricSelectionMetricSelected" :from-value-proposition="true"></OverviewLocation>
    </div>
  </div>
  <div class="overlay-vp-editor" v-if="editionMode">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
      <div class="d-flex gap-2">
        <div class="icon-subcomponent" @click="$emit('change-content', objData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
        <div class="icon-subcomponent" v-if="objData.visibility" :title="'Hide Content'" @click="$emit('change-content', objData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"> </i></div>
        <div class="icon-subcomponent" v-if="!objData.visibility" :title="'Show Content'" @click="$emit('change-content', objData, null, 'showOrHide')"> <i class="fa-solid fa-eye text-base" :title="'Show Content'"></i></div>
      </div>
    </Tooltip>
  </div>
</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, PropType, reactive, ref, toRefs } from 'vue'
import { Editor } from '@progress/kendo-vue-editor';
import { NumberUtils, ObjectUtils, ArrayUtils, isNullOrUndefined } from '@/utils';
import { basicTools } from '../data/editor';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { MatchType } from '../types';
import { Match } from '@/types';
import InfoBoxComponent from './InfoBoxComponent.vue';
import PieChartComponent from './PieChartComponent.vue';
import DataDisplayComponent from './DataDisplayComponent.vue';
import OverviewLocation from '@/modules/home/overview/components/OverviewLocation.vue';
import { reasonForExclusionEntitiesUtils } from '../../components/utils/utilsCharts';
import PieChart from "@/modules/components/charts/kendo/PieChart.vue";
import HomeStackedBar from './HomeStackedBar.vue';
export default defineComponent({
    name: 'MatchComponent',
    components: {
        Editor, PieChartComponent, DataDisplayComponent, OverviewLocation,
        Tooltip, InfoBoxComponent, PieChart, HomeStackedBar
    },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<MatchType>, required: true },
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        interface DataInterface {
            showModalEdit: boolean,
            objData: MatchType
            objDataInitial: MatchType
        }

        const data: DataInterface = reactive<DataInterface>({
            showModalEdit: false,
            objData: ObjectUtils.cloneDeep(props.objectContent),
            objDataInitial: ObjectUtils.cloneDeep(props.objectContent)
        })

        const textDefaultToShow = ref('') //-ref<string>(props.objectContent.text)
        const textToEditor = ref(ObjectUtils.cloneDeep(textDefaultToShow.value))
        const onEditorChange = (event: any) => {
            textToEditor.value = event.html;
        };
        const showModal = () => {
            data.showModalEdit = true
        }
        const saveText = () => {
            //- Todo
            // data.objData.text = textToEditor.value
            // emit('change-content', data.objData, { obj: data.objData }, 'match')
            data.showModalEdit = false
        }
        function cancelEdition() {
            data.showModalEdit = false
            textToEditor.value = ObjectUtils.cloneDeep(textDefaultToShow.value)
        }
        const metricSelectionMetricSelected = ref<Match.Metric>("spendVolume");
        const reasonForExclusionEntities = reasonForExclusionEntitiesUtils(metricSelectionMetricSelected.value, data.objData.charts.horizontals.excludedBarChart)
        const reasonForExclusionEntitiesTracker = ref(NumberUtils.getRandomInt());
        const countriesMap: ComputedRef<Match.CountriesMap> = computed(() => {
            // Validate
            if (
                isNullOrUndefined(data.objData.charts) ||
                isNullOrUndefined(data.objData.charts.maps.overviewMap)
            ) {
                return {
                    suppliers: [],
                    buyers: [],
                };
            }

            return data.objData.charts.maps.overviewMap;
        });
        const reasons = reasonForExclusionEntities.map((item: { reason: any; }) => item.reason);
        const amounts = reasonForExclusionEntities.map((item: { amount: any; }) => item.amount);
        return {
            ...toRefs(data), showModal, cancelEdition, saveText, textToEditor, onEditorChange, basicTools, ArrayUtils, NumberUtils, FormData, reasonForExclusionEntities, reasonForExclusionEntitiesTracker, metricSelectionMetricSelected, countriesMap, reasons, amounts
        }
    }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.detailed-text-container {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
}

.detailed-text-container-overflow {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    line-height: 1.6;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: 464px;

    &::-webkit-scrollbar {
        width: 0.6rem;
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background-color: $scrollbar-thumb !important;

        &:hover {
            cursor: pointer;
        }
    }
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