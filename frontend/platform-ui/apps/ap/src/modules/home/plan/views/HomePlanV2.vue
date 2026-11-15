<template>
<CalculumLoading v-if="loadingActionsPhases" :modal="true"> </CalculumLoading>
<CalculumLayout :containerClass="'plan-sections'" :containerId="'header-match'">
  <template v-slot:slotTop>
    <CalculumModal :size="'md'" :showClose="true" :title="$t('home.plan.programToPlan2.confirmDeleteTitle')" @close="closeDeletePhaseConfirm()" v-if="isShowDeletePhaseConfirm">
      <template v-slot:modalContent>
        <p>{{ $t('home.plan.programToPlan2.confirmDeleteText') }}</p>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="closeDeletePhaseConfirm()" style="z-index: 1; width: fit-content"><span>{{ $t('button.cancel') }}</span></button>
        <button class="btn btn-primary font-md" @click="deleteSelectedPhase()" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.delete') }}      </span></button>
      </template>
    </CalculumModal>
    <div class="row">
      <div class="col-12 col-sm-12 col-md-8 col-lg-8 col-xl-8">
        <div class="row">
          <div class="col-12 col-sm-12 col-md-12 col-lg-12 col-xl-12 mb-2 d-flex">
            <div class="d-flex align-items-center" v-if="!loadingPhases"><a class="btn btn-clean font-md text-capitalize custom-padding-btn mr-2 all-programs-btn" v-if="showAllPlansButton" @click="goToHomePlans">{{ $t('home.plan.allPlans') }}</a></div>
            <div class="d-flex align-items-center" v-if="!loadingPhases && phasesForPhaseCards.length > 0"><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none" @click="changeTab('phases')" :class="{ 'active': activeTab === 'phases' }">{{ $t('home.analyze.analyzeProgramOverview.overviewButton') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none" @click="changeTab('list')" :class="{ 'active': activeTab === 'list' }">{{ $t('home.analyze.analyzeProgramOverview.listButton') }}          </a></div>
            <div class="d-flex align-items-center" v-if="!loadingPhases">
              <Tooltip :open-delay="10" :anchor-element="'target'" :position="'bottom'">
                <div class="new-plan ml-2 cursor-pointer" @click="createPhase" :class="{'program-recalculating disabled' : programInrecalculation }" :title="blockPlanOptions ? $t('global.planOptions.notAvailable') : $t('global.planOptions.addPhase') ">
                  <div class="d-flex">
                    <div class="circle-plus-icon-plan cursor-pointer"><i class="fa-solid fa-plus text-sm" aria-hidden="true"></i></div><span class="ml-2 cursor-pointer" :class="{ 'program-recalulating' : setGlobalRecalculationFlag}">{{ $t('home.plan.programToPlan2.addPhaseButton') }}</span>
                  </div>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-12 col-md-4 col-lg-4 col-xl-4 mb-2">
        <div class="d-flex justify-content-flex-end align-items-center">
          <div class="d-flex flex-column mr-4" v-if="!loadingPhases">
            <div class="d-flex flex-column"><span class="text-gray-700 text-2xl font-medium name-author cursor-pointer">{{ planData.planName }}</span>
              <div class="d-flex"><span class="icon-svg icon-analyze-black mr-2"></span><span class="text-gray-600 text-sm font-normal name-author cursor-pointer">{{ planData.programName }}          </span></div>
            </div>
          </div>
          <div class="d-inline-flex align-items-center">
            <PlanOptions :planId="planId" :planName="planData.planName" :isMarked="planMarked" :programRecalulating="setGlobalRecalculationFlag" @mark-card="markCard" @unsusbcribePlan="fnUnsubscribeToPlans()" @subscribePlan="commonFns(true)"></PlanOptions>
          </div>
        </div>
      </div>
    </div>
    <div class="d-flex flex-column" v-if="!loadingPhases && phasesForPhaseCards.length > 0">
      <TabStrip :selected="selectedTabIndex" :tabs="tabs" @select="onSelect"></TabStrip>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row d-flex flex-column mb-3" v-if="!loadingPhases && planPhases.length <= 0">
        <div class="col-12 col-sm-12 col-md-7 col-lg-7 col-xl-7">
          <div class="no-info-section">
            <div class="d-flex flex-column row-100">
              <div class="d-flex flex-column" v-if="!loadingPhases"><span class="text-gray-600 text-base font-semibold mb-2">{{ $t('home.plan.programToPlan2.startConfigureTitle') }}</span><span class="text-gray-600 text-xs font-normal">{{ $t('home.plan.programToPlan2.startConfigureText') }}              </span></div>
              <div class="row mt-4">
                <div class="col-12 col-sm-12 col-md-12 col-lg-12 col-xl-6 mb-2">
                  <Tooltip :open-delay="10" :anchor-element="'target'" :position="'bottom'">
                    <button class="btn btn-primary" @click="createPhase()" :title="blockPlanOptions ? $t('global.planOptions.notAvailable') : $t('global.planOptions.addPhase')" :disabled="blockPlanOptions">{{ $t('home.plan.programToPlan2.addPhaseButtonEmpty') }}      </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row-mt-3" v-if="loadingPhases || planStatus.planInrecalculation">
        <div class="col-12">
          <div class="d-flex flex-column">
            <PhaseCardSkeleton></PhaseCardSkeleton>
          </div>
        </div>
      </div>
      <div class="row mt-3" v-if="!loadingPhases && planPhases.length > 0 && !planStatus.planInrecalculation">
        <div class="col-12">
          <div class="d-flex flex-column" v-if="!loadingPhases && activeTab === 'phases' && selectedTabIndex === 0">
            <PlanPhaseOverview :phaseData="[]" :planId="planId" :programInrecalculating="setGlobalRecalculationFlag" :blockPlanOptions="blockPlanOptions" :vCardEnabled="vCardEnabled" :globalFilter="globalFilterComputed" :currencyRate="currencyRate" :isSummary="true" :summaryData="[]" :phaseNumber="0" @showPhases="showPhases"></PlanPhaseOverview>
            <div class="row mt-4">
              <div class="col-12 col-sm-12 col-md-12 col-lg-12 col-xl-12" :class="!setGlobalRecalculationFlag ? 'custom-height-chart' : ''">
                <div class="card border-radius-8 chart-card" :style="{ 'height': getCardHeight() }">
                  <div class="d-flex flex-column"><span class="text-base font-semibold text-gray-700 mb-2 ml-2" id="custom-margin-title">{{ $t('global.selectChart') }}
                      <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="'plan-select-charts'" :keyPopOver="'planSelectCharts'"></CalculumTooltipIcon></span>
                    <div class="row">
                      <div class="div" v-if="setGlobalRecalculationFlag" :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '55px', borderRadius: '8px' }"></Skeleton>
                      </div>
                      <div class="div" v-else :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="selectPlanChart('timeline')" :class="selectedChartType === 'timeline' ? 'bg-gray-50' : 'bg-white'">
                          <iconCheckCircleFill class="check-svg-small mr-3" v-if="selectedChartType === 'timeline'"></iconCheckCircleFill>
                          <div class="unselected-circle-small mr-3 cursor-pointer" v-if="selectedChartType !== 'timeline'"></div>
                          <div class="d-flex flex-column">
                            <div class="d-flex align-items-center"><span class="text-sm font-medium text-gray-700 cursor-pointer">{{ $t('global.timeline') }}
                                <CalculumTooltipIcon :infoText="$t('global.timelineTooltipDefault')"></CalculumTooltipIcon></span></div>
                          </div>
                        </div>
                      </div>
                      <div class="div" v-if="setGlobalRecalculationFlag" :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '55px', borderRadius: '8px' }"></Skeleton>
                      </div>
                      <div class="div" v-else="!setGlobalRecalculationFlag" :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="selectPlanChart('waterfall')" :class="selectedChartType === 'waterfall' ? 'bg-gray-50' : 'bg-white'">
                          <iconCheckCircleFill class="check-svg-small mr-3" v-if="selectedChartType === 'waterfall'"></iconCheckCircleFill>
                          <div class="unselected-circle-small mr-3 cursor-pointer" v-if="selectedChartType !== 'waterfall'"></div>
                          <div class="d-flex flex-column">
                            <div class="d-flex align-items-center"><span class="text-sm font-medium text-gray-700 cursor-pointer">{{ $t('global.paymentTermsOpportunity') }}
                                <CalculumTooltipIcon :infoText="$t('global.paymentTermsOpportunityWaterFallTooltip')">         </CalculumTooltipIcon></span></div>
                          </div>
                        </div>
                      </div>
                      <div class="div" v-if="setGlobalRecalculationFlag" :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '55px', borderRadius: '8px' }"></Skeleton>
                      </div>
                      <div class="div" v-else="!setGlobalRecalculationFlag" :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="selectPlanChart('cashFlow')" :class="selectedChartType === 'cashFlow' ? 'bg-gray-50' : 'bg-white'">
                          <iconCheckCircleFill class="check-svg-small mr-3" v-if="selectedChartType === 'cashFlow'"></iconCheckCircleFill>
                          <div class="unselected-circle-small mr-3 cursor-pointer" v-if="selectedChartType !== 'cashFlow'"></div>
                          <div class="d-flex flex-column">
                            <div class="d-flex align-items-center"><span class="text-sm font-medium text-gray-700 cursor-pointer">{{ $t('global.cashFlowOpportunity') }}
                                <CalculumTooltipIcon :infoText="$t('global.cashFlowOpportunityTooltip')"></CalculumTooltipIcon></span></div>
                          </div>
                        </div>
                      </div>
                      <div class="div" v-if="setGlobalRecalculationFlag && vCardEnabled" :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '55px', borderRadius: '8px' }"></Skeleton>
                      </div>
                      <div class="div" v-else-if="!setGlobalRecalculationFlag && vCardEnabled" :class="vCardEnabled ? 'col-3' : 'col-4'">
                        <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="selectPlanChart('rebate')" :class="selectedChartType === 'rebate' ? 'bg-gray-50' : 'bg-white'">
                          <iconCheckCircleFill class="check-svg-small mr-3" v-if="selectedChartType === 'rebate'"></iconCheckCircleFill>
                          <div class="unselected-circle-small mr-3 cursor-pointer" v-if="selectedChartType !== 'rebate'"></div>
                          <div class="d-flex flex-column">
                            <div class="d-flex align-items-center"><span class="text-sm font-medium text-gray-700 cursor-pointer">{{ $t('global.rebate') }}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row" v-if="!setGlobalRecalculationFlag">
                      <div class="col-xl-12 col-lg-12 chart-col">
                        <div class="col-6 my-4" v-if="selectedChartType === 'waterfall'">
                          <CalculumDropdownOptions :selectedChart="waterFallSelectedOption" :listOptions="waterFallOptions" :widthDropdownPercent="'50%'" @selectMetricDropdown="changeWaterFallOption"></CalculumDropdownOptions>
                        </div>
                        <div class="d-flex flex-column align-items-center mt-2 p-2" v-if="!loadingChartData && (!hasDataForCharts || hasNullDatesComputed)">
                          <h3 class="text-center">{{ $t('home.compare.charts.noDataAvailableForYear') }}</h3>
                          <p>{{ $t('home.compare.charts.noDataAvailableForChart') }}</p>
                        </div>
                        <HorizontalBarChart v-if="selectedChartType === 'cashFlow' && !loadingChartData && dataHasMoreThanTenValues && !hasNullDatesComputed" @showDetails="getChartHeightDetails" chartTitle="" :xAxisTitle="currentSelectedChart.xAxisTitle" :yAxisTitle="currentSelectedChart.yAxisTitle" :dataFirstSeries="dataSeries" :categoriesData="dataCategories" :isBigNumber="dataIsBigNumber" :chartType="selectedChartType" :forPhasesChart="true" @on-event-click="onDataEventClick"></HorizontalBarChart>
                        <WaterfallChart v-if="selectedChartType === 'cashFlow' && !loadingChartData && !dataHasMoreThanTenValues && !hasNullDatesComputed" :chartTitle="$t('global.cashFlow')" :dataValues="dataValuesForWaterfallChart" :isBigNumber="dataIsBigNumber" :xAxisTitle="$t('home.plan.phases')" :yAxisTitle="$t('global.cashFlowAmount')" @on-event-click="onDataEventClick"></WaterfallChart>
                        <Skeleton class="skeletons-bg" v-if="selectedChartType === 'waterfall' && loadingWaterFallData" :shape="'rectangle'" :style="{ width: '100%', height: '55px', borderRadius: '8px' }"></Skeleton>
                        <WaterfallChart v-if="selectedChartType === 'waterfall' && !loadingChartData && !dataHasMoreThanTenValues && !hasNullDatesComputed && !loadingWaterFallData && hasDataForCharts" :chartTitle="$t('home.entityCard.overview.paymentTerms')" :dataValues="dataForWaterfall" :isBigNumber="dataIsBigNumber" :xAxisTitle="$t('home.plan.phases')" :yAxisTitle="$t('home.entityCard.overview.paymentTerms')" :fromWaterFall="true" @on-event-click="onDataEventClick"></WaterfallChart>
                        <HorizontalBarChart v-if="selectedChartType === 'waterfall' && !loadingChartData && dataHasMoreThanTenValues && !hasNullDatesComputed && !loadingWaterFallData && hasDataForCharts" @showDetails="getChartHeightDetails" chartTitle="" :xAxisTitle="$t('home.entityCard.overview.paymentTerms')" :yAxisTitle="$t('home.plan.phases')" :dataFirstSeries="dataSeriesWaterfall" :categoriesData="dataCategoriesWaterfall" :isBigNumber="dataIsBigNumber" :chartType="selectedChartType" :forPhasesChart="true" @on-event-click="onDataEventClick"></HorizontalBarChart>
                        <WaterfallChart v-if="selectedChartType === 'rebate' && !loadingChartData && !hasNullDatesComputed" :chartTitle="$t('global.rebate')" :dataValues="dataValuesForWaterfallChartRebate" :isBigNumber="dataIsBigNumber" :xAxisTitle="$t('home.plan.phases')" :yAxisTitle="$t('global.rebateAmount')" @on-event-click="onDataEventClick"></WaterfallChart>
                        <RangeBarChart v-if="selectedChartType === 'timeline' && !loadingChartData && !hasNullDatesComputed" :dataValues="dataValuesForRangeBarChart" :forDateRanges="true" :forPlanPhases="true" :showLegend="true" :xAxisTitle="$t('global.time')" :valueAxisObj="valueAxisComputed" :key="refreshComponent" @on-event-click="onDataEventClick" @showDetails="getChartHeightDetails"></RangeBarChart>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="d-flex flex-column show-all-phases" v-if="!loadingPhases && activeTab === 'phases'">
            <PlanPhaseOverview class="mb-4" v-if="showIndividualPhase" v-for="phase in phasesForPhaseCards" :phaseData="phase" :planId="planId" :programInrecalculating="setGlobalRecalculationFlag" :blockPlanOptions="blockPlanOptions" :vCardEnabled="vCardEnabled" :globalFilter="globalFilterComputed" :currencyRate="currencyRate" :key="phase.number + keyPhase" :phaseNumber="phase.number" @selectPhaseTab="selectPhaseTab" @deletePhase="deletePhase" @showEditPhase="showEditPhase" @send-data="getPromises"></PlanPhaseOverview>
          </div>
          <div class="d-flex flex-column" v-if="!loadingPhases && activeTab === 'list'">
            <PlanTable :planId="planId" :targetProgram="planData.program" :phaseId="removeIRI(setPhaseForList)" :key="tableKey" :programInrecalculating="setGlobalRecalculationFlag" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" v-model:fullScreen="fullScreen">  </PlanTable>
          </div>
          <div class="d-flex flex-column mb-3" v-if="!loadingPhases && activeTab === 'phases' && selectedTabIndex > 0">
            <PlanTable :planId="planId" :targetProgram="planData.program" :phaseId="removeIRI(phasesForPhaseCards[0]['@id'])" :key="tableKey" :programInrecalculating="setGlobalRecalculationFlag" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" v-model:fullScreen="fullScreen"></PlanTable>
          </div>
        </div>
      </div>
    </div>
    <div class="row container-form mb-3">
      <PlanPhase v-if="showPhaseToEdit && phaseToEdit" :name="phaseToEdit?.name" :newPhase="false" :forSummaryCardTooltip="false" :planId="removeIRI(planId)" :plan-phase-id="removeIRI(phaseToEdit['@id'])" :number="phaseToEdit?.number" :input-start-date="phaseToEdit?.startDate" :input-end-date="phaseToEdit?.endDate" :upgradeable="true" :min-date="planData.startDate" :max-date="planData.endDate" :plan-data="phaseToEdit" :haveChanges="phasesHadChanges.includes(phaseToEdit['@id'])" :showConfirmModal="phasesHadChanges.includes(phaseToEdit['@id']) && showConfirmModal" :period="phaseToEdit?.period" :phaseAditional="phaseToEdit?.number" :key="phaseToEdit?.number? phaseToEdit.number + keyPhase : keyPhase" :programInrecalculating="setGlobalRecalculationFlag" :blockPlanOptions="blockPlanOptions" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :vCardEnabled="vCardEnabled" :planStartDate="planData.startDate" :planEndDate="planData.endDate" :planPeriod="planData.period" @closePhase="deletePhase" @closeModal="closeModal"></PlanPhase>
      <PlanPhase v-if="showNewPhase" :planId="planId" :newPhase="true" :number="1" :upgradeable="true" :min-date="planData.startDate" :max-date="planData.endDate" :plan-data="{}" :recomend-start-date="planData.recomendStartDate" :phasesCount="noRestPhases.length" :targetProgram="planData.targetProgram" :period="0" :key="keyPhase" :programInrecalculating="setGlobalRecalculationFlag" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :vCardEnabled="vCardEnabled" :planStartDate="planData.startDate" :planEndDate="planData.endDate" :planPeriod="planData.period" @closeModal="closeModal"></PlanPhase>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { DataInterface, PhaseAditionalInfo } from '../../types'
import { reactive, toRefs, defineComponent, onMounted, computed, watch, ref, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { removeIRI } from "@/utils";
import { TabStrip } from '@progress/kendo-vue-layout'
import { useI18n } from 'vue-i18n'

import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { usePlanStore } from '@/stores/plan'
import { useSubscribeStore } from '@/stores/subscribe'
import * as formatData from '@/utils/FormatData'
import * as kendoChartRelated from '@/utils/kendoChartRelated'
import * as Routing from '@/services/router/Routing'
import AddIcon from '@/modules/components/icons/IconAdd.vue'
import { CalculumLayout, CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import HorizontalBarChart from '@/modules/components/charts/kendo/HorizontalBarChart.vue'
import iconCheckCircleFill from '@/resources/assets/images/icons/checkDefault.vue'
import DateUtils from '@/utils/DateUtils'
import PlanOptions from '@/modules/home/plan/components/PlanOptions.vue'
import PlanPhase from '@/modules/home/plan/components/PlanPhase.vue'
import PlanTable from '@/modules/home/plan/components/PlanTable.vue'
import WaterfallChart from '@/modules/components/charts/kendo/WaterfallChart.vue'
import RangeBarChart from '@/modules/components/charts/kendo/RangeBarChart.vue'
import useEntity from '@/modules/home/entityCard/composables/useEntity'
import useUser from '@/services/user/composables/useUser';
import { useEntityCardStore } from '@/stores/entityCard'
import useFirebase from "@/composables/firebase/useFirebase";
import usePlanFirebase from "@/composables/firebase/usePlanFirebase";
import PhaseCardSkeleton from '@/modules/home/components/skeletons/PhaseCardSkeleton.vue'
import { Skeleton } from '@progress/kendo-vue-indicators'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import useCompany from "@/composables/useCompany";
import CalculumDropdownOptions from '@/modules/home/components/CalculumDropdownOptions.vue'
import { useToast } from "vue-toastification";
/** new components */
import PlanPhaseOverview from '@/modules/home/plan/components/PlanPhaseOverview.vue'
import useSpendFile from "@/composables/useSpendFile";
import { useAppStore } from '@/stores/app';
import useApolloClient from "@/services/graphql/useApolloClient";

interface PhaseData extends PhaseAditionalInfo {
  '@id': string;
}

interface TabStripSelectEventArguments {
  selected: number;
}

export default defineComponent({
  name: 'HomePlanV2',
  components: {
    AddIcon,
    CalculumLayout,
    CalculumLoading,
    CalculumModal,
    CalculumTooltipIcon,
    HorizontalBarChart,
    iconCheckCircleFill,
    PhaseCardSkeleton,
    PlanOptions,
    PlanPhase,
    PlanTable,
    RangeBarChart,
    TabStrip,
    WaterfallChart,
    Skeleton,
    Tooltip,
    CalculumDropdownOptions,
    PlanPhaseOverview
  },
  props: {
    planId: { type: String, required: true },
    phaseIdList: { type: String, required: false, default: '' }    
  },
  setup(props) {

    const route = useRoute()
    /** phaseIdList from URL query (when navigating from list/tab) or from props */
    const phaseIdList = computed(() => {
      const fromQuery = route.query?.phaseIdList
      if (fromQuery != null && fromQuery !== '') {
        return Array.isArray(fromQuery) ? fromQuery[0] : String(fromQuery)
      }
      return props.phaseIdList ?? ''
    })

    const { apolloClientResetStore } = useApolloClient();

    const globalFiltersStore = useGlobalFiltersStore()
    const planStore = usePlanStore()
    const toast = useToast()
    const entityCardStore = useEntityCardStore()
    const subscribeStore = useSubscribeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    let currencyRate: number = useAppStore().getCurrencyAmount;
    const setGlobalFilter = ref(formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied))
    //firebase
    const { fnUnsubscribeToPlans, subscribeToPlans } = usePlanFirebase();
    const { usevCardGroupsEnabled } = useCompany();

    const { useFeatureVirtualCard } = useUser();

    const {
      spendFileVersionActiveId
    } = useSpendFile()

    const setPhaseForList = ref(null)

    const showAllPlansButton = ref(false)

    
    const data = reactive<DataInterface>({
      hasFinancing: false,
      hasHarmonization: false,
      refreshComponent: new Date().getUTCMilliseconds(),
      valueAxis: {
        min: 0,
        max: 0,
        majorUnit: 60 * 60 * 1000,
        labels: {
          template: "#= kendo.toString(new Date(value), 'HH:mm') #"
        }
      },
      dataItems: [],
      activeTab: 'phases',
      cardHeight: "650px",
      dataTimeline: [],
      deletePhaseId: '',
      fullScreen: false,
      hasNullDates: false,
      hideTheTimeLineChart: false,
      isShowDeletePhaseConfirm: false,
      loading: false,
      loadingPhases: true,
      loadingTimelinechart: false,
      phases: [],
      phasesForPhaseCards: [],
      planMarked: false,
      selectedChartType: 'timeline',
      selectedTabIndex: 0,
      tableKey: new Date().getUTCMilliseconds(),
      tabs: [],
      targetProgram: '',
      currentSelectedChart: {
        chartTitle: '',
        xAxisTitle: '',
        yAxisTitle: '',
        dataSeries: [],
        categoriesData: []
      },
      keyPhase: new Date().getUTCMilliseconds(),
      showNewPhase: false,
      planPhases: [],
      noRestPhases: [],      
      planData: {
        days: 0,
        dimension: 'single',
        program: '',
        startDate: '',
        endDate: '',
        recomendStartDate: '',
        period: 0,
        targetProgram: '',
        levelHarmonization: '',
        planName: '',
        programName: ''
      },
      phasesHadChanges: [],
      showConfirmModal: false,
      loadingActionsPhases: false,
      dataForKendoChart: [],
      dataForKendoChartRebate: [],
      isBigNumber: false,
      loadingChartData: true,
      toggleShowMore: false,
      programInrecalculation: false,
      pendingRecalculation: false,
      planStatus: {
        pendingRecalculation: false,
        planInrecalculation: false
      },
      waterFallOptions: [
        { title: translate.t('home.plan.waterfall.onlyPlan'), value: 'onlyPlan'},
        { title: translate.t('home.plan.waterfall.getAll'), value: 'getAll'}
      ],
      waterFallSelectedOption: 'onlyPlan',
      dataForWaterfall: [],
      loadingWaterFallData: false,
      waterFallDataSeries: [],
      waterFallCategoriesData: [],
      showIndividualPhase: false,      
      phaseToEdit: null as PhaseData | null,
      showPhaseToEdit: false,
      summaryPromises: []
    })


    const { entitySelectedTrackingNumber } = useEntity()
    watch(entitySelectedTrackingNumber, () => {
      getPlan()
    })


    function getPlan() {
      data.loading = true
      data.loadingPhases = true
      data.loadingTimelinechart = true
      data.showPhaseToEdit = false
      data.phaseToEdit = null
      data.loadingChartData = true
      data.summaryPromises = []
      data.dataForKendoChart = []
      data.dataForKendoChartRebate = []
      data.dataItems = []

      const params = {
        planId: "/api/plans/" + props.planId,
        callbackSuccess: (callbackSuccessData: any) => {

          data.planMarked = callbackSuccessData.marked
          data.targetProgram = callbackSuccessData.program.programTarget
          data.planData.planName = callbackSuccessData.title
          data.planData.dimension = callbackSuccessData.dimensionType
          data.planData.startDate = callbackSuccessData.startDate.substring(0, 10)
          data.planData.recomendStartDate = callbackSuccessData.startDate.substring(0, 10)
          data.planData.endDate = callbackSuccessData.endDate.substring(0, 10)
          data.planData.program = removeIRI(callbackSuccessData.program['@id'])
          data.planData.programName = callbackSuccessData.program.name
          data.planData.targetProgram = callbackSuccessData.program.programTarget
          data.planData.levelHarmonization = callbackSuccessData.program.harmonizationLevel
          data.pendingRecalculation = callbackSuccessData.program.pendingRecalculation
          data.programInrecalculation = callbackSuccessData.program.recalculationInProgress
          data.hasFinancing = callbackSuccessData?.program?.externalFinancingEnabled ?? false
          data.hasHarmonization = callbackSuccessData?.program?.termHarmonizationEnabled ?? false
          data.planData.period = callbackSuccessData.period
          entityCardStore.setSelectedProgram(removeIRI(data.planData.program))
          data.tableKey++
          data.loading = false
          getPlanPhases()          

        },
        callbackError: () => {
          toast.error(translate.t('global.errorUpdatingPlan'));
        }
      }
      planStore.getPlan(params)
    }

    /**
     * change to corresponding tab when user clicks on the phase bar
     */
    function onDataEventClick(dataSeriesObj: any) {
      const { tabs } = data; // Assuming data is available in the scope
      // Find the index of the tab with the matching title
      const index = tabs.findIndex((tab: any) => tab.title === dataSeriesObj.category);
      // Call onSelect if a matching tab is found
      if (index !== -1) {
        onSelect({
          selected: index
        });
      }
      // No need for an else block if nothing needs to be done in the other case
    }

    function selectPhaseTab(phaseId: string) {
      const phaseNumberIndex = data.planPhases.findIndex((phase: any) => phase.id === phaseId)      
      if (phaseNumberIndex >=  0) {
        onSelect({
          selected: phaseNumberIndex + 1
        })
      }
      else {
        toast.error(translate.t('global.errorGettingPlanPhase'));
        onSelect({
          selected: 0
        })
      }
    }


    function showPhases() {
      data.showIndividualPhase = true      
    }

    function showEditPhase(phase: any) {
      data.phaseToEdit = phase
      data.showPhaseToEdit = true
    }

    function closeModal() {
      data.showPhaseToEdit = false
      data.phaseToEdit = null
      data.showNewPhase = false
    }

    function getPlanPhases() {
      data.phasesForPhaseCards = []
      data.loading = true
      const params = {
        planId: "/api/plans/" + props.planId,
        callbackSuccess: (callbackSuccessData: any) => {
          data.planPhases = callbackSuccessData.sort((a: any, b: any) => a.number - b.number)
          data.phasesForPhaseCards = data.planPhases
          data.noRestPhases = data.planPhases.filter((x: any) => x.isRest === false)
          data.loading = false


          data.tabs = []
          /**
           * Set the first available tab
           */

          data.tabs.push({
            title: translate.t('home.plan.allPhases'),
            contentClassName: 'classContentHide',
          })


          if (data.selectedTabIndex > 0) {
            const selectedTab = {
              selected: data.selectedTabIndex
            }
            onSelect(selectedTab)
          }
          data.loadingPhases = false
          data.loadingTimelinechart = false



          if (data.phasesForPhaseCards.length > 0) getWaterFallPlan()

          let numberTabDefault = 0
          let counterTab = 0

          data.planPhases.forEach((phase: any) => {

            const newTab = {
              title: setTabsPhaseNames(phase, true),
              contentClassName: 'classContentHide',
            }

            if (phaseIdList.value && phaseIdList.value === phase.id) {
              numberTabDefault = counterTab
            }
            counterTab = counterTab + 1
            data.tabs.push(newTab)

          })

          if (phaseIdList.value) {
            // phaseIdList exists when the user opens the phase from home Plan - List tab                        
            const selectedTab = {
              selected: numberTabDefault
            }
            onSelect(selectedTab)

          }
          

        },
        callbackError: () => {
          data.loadingPhases = false
          data.loadingTimelinechart = false
          data.loadingChartData = false
        }
      }

      planStore.getPlanPhases(params)
    }

    function getChartHeightDetails(myHeight: string) {
      data.cardHeight = myHeight
    }


    /**
     * Check if there are null dates in any of the phases
     */
    const hasNullDatesComputed = computed(() => {
      return data.hasNullDates
    })


    function setColumnNames(title: string, phase: number): string {

      switch (title) {
        case 'initial':
          return 'Contractual'
        case 'final':
          return 'Subtotal'
        default:
          return title
      }

    }

    function getWaterFallPlan(): void {

      const filtersWaterfall = {
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        targetPlanUuid: props.planId,
        globalFilter: setGlobalFilter.value,
        currencyRate,
        fullDisabled: false
      }

      data.loadingWaterFallData = true

      const params = {
        filters: filtersWaterfall,
        onlyPlan: data.waterFallSelectedOption === 'getAll' ? false : true,
        callbackSuccess: (callbackSuccessData: any) => {

          const parsedData: Array<any> = []

          Object.values(callbackSuccessData.byTerms).forEach(function (config: any, index: any) {
            const newConfig = Object.assign({}, config)
            if (config.itemTitle === 'final') {
              return
            }

            newConfig.phaseName = setColumnNames(config.itemTitle, config.phaseNumber ?? null)
            newConfig.value = config.amount
            newConfig.number = config.index + 1
            parsedData.push(newConfig)
          })

          data.dataForWaterfall = parsedData

          data.loadingWaterFallData = false


          data.waterFallDataSeries = data.dataForWaterfall.map((item: any) => item.value)
          data.waterFallCategoriesData = data.dataForWaterfall.map((item: any) => item.phaseName)
        },

        callbackError: () => {
          data.loadingWaterFallData = false

        }
      }
      planStore.getWaterFallPlan(params)
    }

    function setTabsPhaseNames(phase: any, forTabs: boolean = false) {
      if (phase.number === 0) {
        return forTabs ? translate.t('home.plan.allPhases') : 'Total'
      }
      else if (phase.isRest) {
        return translate.t('global.rest')
      } else if (phase.phaseName) {
        return phase.phaseName
      } else if (phase.name) {
        return phase.name
      } else {
        return forTabs ? translate.t('global.phase') + " " + phase.number : translate.t('global.phase') + " " + phase.phaseNumber
      }
    }


    function setTabsPhaseNamesWaterfall(phase: any) {

      if (phase.isRest) {
        return translate.t('global.rest')
      } else if (phase.phaseName) {
        return phase.phaseName
      } else {
        return translate.t('global.phase') + " " + phase.phaseNumber
      }
    }

    function getDataForTimelineChart() {

      /**
       * Now manually is necessary add the totals
       */
      data.dataItems.push({
        id: 0,
        phase: 'Total',
        from: new Date(data.planData.startDate + ' 00:00:00').getTime(),
        to: new Date(data.planData.endDate + ' 00:00:00').getTime(),
        myDate: new Date(data.planData.startDate + ' 00:00:00'),
        category: "Phases 0"
      })


      data.valueAxis.min = new Date(data.planData.startDate).getTime()
      data.valueAxis.max = new Date(data.planData.endDate).getTime()


      data.summaryPromises.forEach(function (phase: any, index: any) {
        data.dataItems.push({
          id: index + 1,
          phase: setTabsPhaseNames(phase),
          from: new Date(phase.startDate + ' 00:00:00').getTime(),
          to: new Date(phase.endDate + ' 00:00:00').getTime(),
          myDate: new Date(phase.startDate + ' 00:00:00'),
          category: "Phases " + (index + 1)
        })
      })
    }


    function getCardHeight() {

      if (setGlobalRecalculationFlag.value) {
        return '10px'
      }

      if (data.hasNullDates) {
        return "500px";
      } else {
        if (data.selectedChartType === 'cashFlow' && !dataHasMoreThanTenValues.value) {
          return '600px'
        }
        else if (data.selectedChartType === 'cashFlow' && dataHasMoreThanTenValues.value) {
          const cardHeight = data.cardHeight
          const numericHeight = parseInt(cardHeight, 10)
          const newHeight = (numericHeight + 174) + 'px'
          return newHeight
        } else if (data.selectedChartType === 'timeline' && data.dataItems.length > 0) {
          const cardHeight = data.cardHeight
          const numericHeight = parseInt(cardHeight, 10)
          const newHeight = (numericHeight + 184) + 'px'
          return newHeight

        }
      }
    }


    /** Computed */



    /**
     * returns the data for the waterfall chart
     */
    const dataValuesForWaterfallChart = computed(() => {

      return data.dataForKendoChart
    })


    const dataValuesForWaterfallChartRebate = computed(() => {

      return data.dataForKendoChartRebate
    })
    /**
     * determines if the data series has more than 10 items
     */
    const dataHasMoreThanTenValues = computed(() => {

      switch (data.selectedChartType) {
        case 'cashFlow':
          return data.currentSelectedChart.dataSeries.length > 10
        case 'waterfall':
          return data.waterFallDataSeries.length > 10
        default:
          return false
      }

    })

    const hasDataForCharts = computed(() => {
      switch (data.selectedChartType) {
        case 'cashFlow':
          return data.currentSelectedChart.dataSeries.length > 0
        case 'waterfall':
          return data.waterFallDataSeries.length > 0
        default:
          return true
      }
    })

    /**
     * computed dataIsBigNumber for formatting the values in big number format in the bar chart
     */
    const dataIsBigNumber = computed(() => {
      return data.isBigNumber
    })

    /**
     * computed dataSeries for the x axis or pie chart values
     */
    const dataSeries = computed(() => {
      const series = [...data.currentSelectedChart.dataSeries];
      const seriesTotal = series.reduce((accumulator: any, currentValue: any) => accumulator + currentValue, 0);
      return [seriesTotal, ...series];
    })


    const dataSeriesWaterfall = computed(() => {
      const series = [...data.waterFallDataSeries];
      const waterfallTotal = series.reduce((accumulator: any, currentValue: any) => accumulator + currentValue, 0);
      return [waterfallTotal, ...series];
    })

    /**
     * computed dataCategories for the y axis or the label of the pie chart
     */
    const dataCategories = computed(() => {
      return ['Total', ...data.currentSelectedChart.categoriesData];
    })

    const dataCategoriesWaterfall = computed(() => {
      return ['Subtotal', ...data.waterFallCategoriesData];
    })

    /**
     * determines if the chart needs to convert 
     * values to big numbers format
     * @param chartType string
     */
    function isBigNumberCalculate() {
      let needsBigNumber = false
      data.currentSelectedChart.dataSeries.forEach((item: any) => {
        if (item > 1000) {
          needsBigNumber = true
        }
      })

      return needsBigNumber

    }

    /**
     * structures the data for the kendo charts
     */

    /** Only for waterfall CashFlow */
    function getDataValuesForKendoCharts(callbackSuccessData: any) {

      const parsedData: Array<any> = []
      Object.values(callbackSuccessData)
        .sort((a: any, b: any) => a.phaseNumber - b.phaseNumber)
        .forEach(function (config: any, index: any) {
          const newConfig = Object.assign({}, config)
          newConfig.phaseName = setTabsPhaseNamesWaterfall(config)
          newConfig.value = config.cashFlow
          parsedData.push(newConfig)
        })

      data.dataForKendoChart = parsedData
      /** Only for waterfall Rebate */

      const parsedDataRebate: Array<any> = []
      Object.values(callbackSuccessData)
        .sort((a: any, b: any) => a.phaseNumber - b.phaseNumber)
        .forEach(function (config: any, index: any) {
          const newConfig = Object.assign({}, config)
          newConfig.phaseName = setTabsPhaseNamesWaterfall(config)
          newConfig.value = config.vCardRebateOpportunity
          parsedDataRebate.push(newConfig)
        })
      data.dataForKendoChartRebate = parsedDataRebate

      /** Only for horizontal */

      data.currentSelectedChart.dataSeries = data.dataForKendoChart.map((item: any) => item.value)
      data.currentSelectedChart.categoriesData = data.dataForKendoChart.map((item: any) => item.phaseName)
      data.currentSelectedChart.chartTitle = 'cashFlow'
      data.currentSelectedChart.xAxisTitle = 'Cash Flow'
      data.currentSelectedChart.yAxisTitle = translate.t('global.phaseName')
      data.isBigNumber = isBigNumberCalculate()
      data.loadingChartData = false
    }


    function markCard() {
      data.loading = true
      const params = {
        planId: "/api/plans/" + props.planId,
        marked: !data.planMarked,
        callbackSuccess: (plan: any) => {
          toast.success(translate.t('global.successUpdatingPlan'));
          data.planMarked = plan.marked
          data.loading = false
        },
        callbackError: () => {
          toast.error(translate.t('global.errorUpdatingPlan'));
          data.loading = false
        }
      }
      planStore.patchPlanMarkedStatus(params)
    }



    function selectPhaseCardsForPhaseClickTab(value: TabStripSelectEventArguments): void {
      const isOverflow = value.selected >= 10000
      data.selectedTabIndex = isOverflow ? data.planPhases.length : value.selected
      if (value.selected === 0 && data.activeTab === 'phases') {
        data.phasesForPhaseCards = data.planPhases
      } else if (value.selected > 0 && data.activeTab === 'phases') {
        const phaseIndex = isOverflow ? data.planPhases.length - 1 : value.selected - 1
        data.phasesForPhaseCards = [data.planPhases[phaseIndex]]
      }
    }

    function updatePhaseCardsForPhasesTab(selected: number): void {
      if (selected === 0 && data.activeTab === 'phases') {
        data.phasesForPhaseCards = data.planPhases
      } else if (selected > 0 && data.activeTab === 'phases') {
        data.phasesForPhaseCards = [data.planPhases[selected - 1]]
      }
    }

    function updatePhaseForListTab(selected: number): void {
      if (selected === 0 && data.activeTab === 'list') {
        setPhaseForList.value = null
        data.tableKey++
      } else if (selected > 0 && data.activeTab === 'list') {
        setPhaseForList.value = data.phasesForPhaseCards[selected - 1]['@id']
        data.tableKey++
      }
    }

    function selectTab(value: TabStripSelectEventArguments): void {
      data.selectedTabIndex = value.selected
      updatePhaseCardsForPhasesTab(value.selected)
      updatePhaseForListTab(value.selected)
    }

    function onSelect(e: TabStripSelectEventArguments | number): void {
      const value = typeof e === 'number' ? { selected: e } : e;
      const phaseClick = false;

      if (phaseClick) {
        selectPhaseCardsForPhaseClickTab(value)
      } else {
        selectTab(value)
      }

      if (data.activeTab === 'phases') {
        data.showIndividualPhase = true
      }

    }

    function changeTab(e: any) {
      data.activeTab = e
      data.selectedTabIndex = 0
      data.phasesForPhaseCards = data.planPhases
      if (data.activeTab === 'list') {
        setPhaseForList.value = null
        data.tableKey++
      }
      setBrowserTitlebyTab()
    }


    function setBrowserTitlebyTab() {

      let title = 'Plan - '

      switch(data.activeTab) {

        case 'phases':
          title+= translate.t('home.analyze.analyzeProgramOverview.overviewButton')
          break;

        case 'list':
          title+= translate.t('home.analyze.analyzeProgramOverview.listButton')
          break;
        
          default:
          break;

      }
      document.title = title

    }



    function deleteSelectedPhase() {
      data.tabs = []
      data.isShowDeletePhaseConfirm = false
      data.loadingActionsPhases = true
      data.loadingPhases = true
      data.phasesForPhaseCards = []
      const params = {
        planPhaseId: data.deletePhaseId,
        callbackSuccess: () => {
          data.loadingActionsPhases = false
          data.selectedTabIndex = 0
          data.loadingPhases = false
          toast.success(translate.t('global.successUpdatingPlan'));
          data.refreshComponent++
        },
        callbackError: (response: any) => {
          data.isShowDeletePhaseConfirm = false
          data.loadingActionsPhases = true
          data.loadingPhases = false
          toast.error(translate.t('global.errorUpdatingPlan'));
          data.loading = false
        }
      }
      planStore.deletePlanPhase(params)
    }

    function closeDeletePhaseConfirm() {
      data.isShowDeletePhaseConfirm = false
    }

    function deletePhase(phaseId: any) {
      if (phaseId === 'newPhase') {
        data.showNewPhase = false
      } else {
        data.deletePhaseId = phaseId
        data.isShowDeletePhaseConfirm = true
      }
    }



    function createPhase() {
      if (!programIsRecalculating.value) {
        data.showNewPhase = true
        data.keyPhase++
      }

    }


    function selectPlanChart(tabSelected: string): void {
      data.selectedChartType = tabSelected
    }

    watch(() => data.planPhases, (newValue: any, oldValue: any) => {
      if (data.planPhases.length) {
        data.planData.recomendStartDate =
          DateUtils.formatYYYYMMDD(DateUtils.addDays(data.planPhases[data.planPhases.length - 1].endDate, 2))
      }
    })



    
    watch(
      () => subscribeStore.setRefeshPlans,
      async (newValue) => {
        data.showPhaseToEdit = false
        data.phaseToEdit = null
        data.showNewPhase = false

        switch (newValue) {
          case "updatingPending":
            data.planStatus.pendingRecalculation = true;
            data.planStatus.planInrecalculation = false;
            break;

          case "updating":
            data.planStatus.pendingRecalculation = false;
            data.planStatus.planInrecalculation = true;
            break;

          //The final state and refresh all and show all the values
          case "ready":
            // Cache reset MUST complete before refetching, or the refetch can be
            // served from the stale cache and show pre-edit numbers.
            await apolloClientResetStore()
            data.planStatus.pendingRecalculation = false;
            data.planStatus.planInrecalculation = false;
            getPlan()
            break;

          default:
            break;
        }
      },
    );

    watch(
      () => subscribeStore.refreshPrograms,
      (newValue) => {
        switch (newValue) {
          case 'calculationPending':
            data.programInrecalculation = false
            data.pendingRecalculation = true
            break;
          case 'recalculating':
            data.programInrecalculation = true
            data.pendingRecalculation = false
            break;
          case 'ready':
            data.programInrecalculation = true
            data.pendingRecalculation = false
            getPlan()
            break;
          default:
            break;
        }
      }
    )

    watch(
      () => globalFiltersStore.getFiltersApplied,
      (newValue) => {
        setGlobalFilter.value = formatData.convertFiltersToREST(newValue)        
        getPlan()        
      }
    )

    function goToHomePlans() {
      planStore.setDefaultPlan(null)
      Routing.home.plan.openHomePlanAllPlans()
    }

    /**
     * On Mounted
     */
    onMounted(() => {      
      getAllPlans()
      setBrowserTitlebyTab()
    })

    function getAllPlans() {
      

      const globalParams = {
        spendFileVersion: spendFileVersionActiveId.value,
        callbackError: () => {          
          showAllPlansButton.value = false
        }
      }

      

      const params1 = {
        marked: false,
        callbackSuccess: (callbackSuccessData: any) => {
          const plan = callbackSuccessData.find((x: any) => x['@id'] === '/api/plans/' + props.planId)          
          if (plan) {            
            planStore.setDefaultPlan(props.planId)            
            commonFns()           
          } else {
            goToHomePlans()
            return
          }

          if (callbackSuccessData.length > 1) {
            showAllPlansButton.value = true
          }
        }
      }

      planStore.getAllPlans({ ...globalParams, ...params1 })
    }   

    function commonFns(initialCalls: boolean = true) {
      //When the plan is loading, unsubscribe to the previous plan and suscribe to the new one
      if (initialCalls) {        
        fnUnsubscribeToPlans()
        subscribeToPlans([removeIRI(props.planId)])
      }

      if (!props.planId) {
        goToHomePlans()
        return
      }
      planStore.setDefaultPlan(props.planId)

      // setFilters()
      getPlan()
    }

    onUnmounted(() => {
      fnUnsubscribeToPlans()      
    })


    /**
     * values for range bar
     */
    const dataValuesForRangeBarChart = computed(() => {
      return data.dataItems
    })

    /**
     * value axis for range bar options
     */
    const valueAxisComputed = computed(() => {
      return data.valueAxis
    })


    /**
     * program in recalculation state
     */
    const programIsRecalculating = computed(() => {
      return data.programInrecalculation
    })


    const blockPlanOptions = computed(() => {
      if (data.programInrecalculation || data.pendingRecalculation) {
        return true
      }
      return false
    })


    const blockProgramOptions = computed(() => {
      if (
        data.planStatus.planInrecalculation ||
        data.planStatus.pendingRecalculation
      ) {
        return true;
      }
      return false;
    });




    const setGlobalRecalculationFlag = computed(() => {
      return false
      // return data.pendingRecalculation || data.programInrecalculation || data.planStatus.pendingRecalculation || data.planStatus.planInrecalculation
    })


    const vCardEnabled = computed((): boolean => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
    });

    function changeWaterFallOption(newMetric: string) {
      data.waterFallSelectedOption = newMetric
      getWaterFallPlan()

    }

    function getPromises(response: any) {

      data.summaryPromises.push(response)
      if (data.summaryPromises.length === data.phasesForPhaseCards.length) {
        data.summaryPromises = data.summaryPromises.sort((a: any, b: any) => a.phaseNumber - b.phaseNumber)
        getDataForTimelineChart()
        getDataValuesForKendoCharts(data.summaryPromises)
      }

    }

    const globalFilterComputed = computed(() => {
      return setGlobalFilter.value === null ? undefined : setGlobalFilter.value;      
    });

    return {
      ...toRefs(data),
      changeTab,
      blockPlanOptions,
      closeDeletePhaseConfirm,
      createPhase,
      dataCategories,
      dataHasMoreThanTenValues,
      dataIsBigNumber,
      dataSeries,
      dataValuesForRangeBarChart,
      dataValuesForWaterfallChart,
      deletePhase,
      deleteSelectedPhase,
      formatData,
      getCardHeight,
      getChartHeightDetails,
      hasDataForCharts,
      hasNullDatesComputed,
      kendoChartRelated,
      markCard,
      onDataEventClick,
      onSelect,
      programIsRecalculating,
      removeIRI,
      selectPhaseTab,
      selectPlanChart,
      valueAxisComputed,
      goToHomePlans,
      blockProgramOptions,
      setGlobalRecalculationFlag,
      vCardEnabled,
      dataValuesForWaterfallChartRebate,
      changeWaterFallOption,
      fnUnsubscribeToPlans,
      commonFns,
      dataSeriesWaterfall,
      dataCategoriesWaterfall,
      currencyRate,      
      showPhases,
      showEditPhase,
      closeModal,
      setPhaseForList,
      getPromises,
      globalFilterComputed,
      showAllPlansButton,
      setGlobalFilter 
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";

// ? - What is this for?
@import "src/resources/assets/styles/utils/_borders.scss";


.custom-font-1 {
  font-size: 1em;
}

.custom_weight {
  font-weight: 500 !important;
}

.custom-font-2 {
  font-size: 1em;
}


.custom-svg-containter {
  svg {
    width: 100%;
  }
}

.custom_span {
  width: 100%;
}

.execution-column {
  align-items: center;
  padding: 1em;
  width: 100%;
  height: 22em;
  background: $color-gray-light;
  border-radius: 8px;
}

.custom_height {
  height: 100%;
}

.custom_card {
  position: relative;
  background: #fff;
  border: 1px solid $color-gray-200;
  border-radius: .5rem;
  box-shadow: 0 1px 5px $shadow;
  padding: $margin__bootstrap;
  margin-bottom: $margin__bootstrap*2;
  min-height: 22.5rem;
  flex-flow: column nowrap;
  transition: all 0.3s ease;
}


.custom-container-height {
  height: 300px;
}

.chart-container {
  background: #fff;
  height: 22rem;
  padding: 1em;
}

.y-axis-title {
  transform: rotate(-90deg);
}

.big-number {
  font-size: 3.5rem;
  white-space: nowrap;
  font-weight: bold;
}

.chart_container {

  svg>g:nth-child(2)>rect:last-child {
    stroke: none;
  }
}

.custom_select_for_chart {
  width: 300px;
}


.custom-margin-top {
  margin-top: 5em;
}

.custom-gap {
  gap: 50px;
}

.circle-legend {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.custom_timeline {
  border: none;
  outline: none;
  // min-height: 250px;
  height: auto;
  margin: 1em;

  div[dir="ltr"] {
    height: 850px !important;
    /* Your styles here */
  }
}

// .custom_timeline>div>div>div>div:nth-child(2) {
//   min-height: 500px !important;
// }

.icon_info {
  width: 12px;
  height: 12px;
}

div.google-visualization-tooltip {
  span {
    color: #fff;
  }
}

.gray-background {
  background: $gray-modern-50;
}

.justify-content-flex-end {
  justify-content: flex-end;
}

span.icon-svg.icon-analyze-black {
  width: 16px;
  height: 20px;
}

.selected-chart-container {
  border-radius: 0.5rem;
  border: 1px solid $color-gray-200;
  padding: 1em;
  height: 100%;
}


.blur::before {
  background: inherit;
  filter: blur(10px);
}

.blur {
  width: 100%;
  height: 120px;
  text-align: center;
  position: relative;
  z-index: 1;
  top: -200px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.00) 0%, #FFF 35.42%);

  .blur span {
    position: relative;
    backdrop-filter: none;
  }
}

.hide-details-container {
  width: 100%;
  text-align: center;
  position: relative;
  top: -64px;
  backdrop-filter: none;

}

.show-details {
  color: var(--gray-500, #667085);
  font-size: 0.875rem;
  font-weight: 400;
}

.icons {
  width: .75rem;
}

.down {
  transform: rotate(0deg);
}

.up {
  transform: rotate(180deg);
}

.card {
  min-height: 10rem;
}

.custom-height-chart {
  min-height: 10rem !important;
}

.chart-col {
  padding: 0 !important
}

.chart-card {
  padding: 24px !important;
}

* {
  box-sizing: border-box;
}


.show-all-phases {
  position: relative;
}
</style>