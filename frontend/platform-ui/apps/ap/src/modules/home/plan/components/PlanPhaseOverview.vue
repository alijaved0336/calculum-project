<template>
<div class="d-flex flex-column">
  <CalculumLoading v-if="loadingPhaseInfo" block="block"></CalculumLoading>
  <PhaseCardSkeleton v-if="loadingPhaseInfo" :hasAccordion="!isSummary"></PhaseCardSkeleton>
  <div class="card-view-plan" v-if="!loadingPhaseInfo" :style="'border-left: solid 17px '+ getColor(phaseData)" :class="!isSummary ? ' cursor-pointer forced-pointer' : ''">
    <div class="d-flex flex-wrap gap-content flex-wrap">
      <div class="summary-col d-flex flex-column" @click="changeTabForSelectedPhase()">
        <div class="d-flex flex-column"><span class="text-header-400" v-if="isSummary">{{ $t('home.plan.planPhaseSingleDimension.allPhases') }}
            <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="'plan-summary-phase'" :keyPopOver="'planSummaryPhase'">        </CalculumTooltipIcon></span>
          <Tooltip class="d-flex flex-column" :open-delay="100" :anchor-element="'target'" position="top"><span class="text-gray-600 text-xs font-semibold" v-if="!phaseData.isRest && !isSummary" :title="phaseData.name">{{ 'Phase ' + phaseData.number }}
              <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="'plan-phase-'+phaseAditional.number" :keyPopOver="'planPhase'"></CalculumTooltipIcon></span></Tooltip><span class="text-gray-700 text-3xl font-semibold title-phase" v-if="!phaseData.isRest" :title="phaseData.name">{{  isSummary ? 'Summary' : phaseData.name }}</span><span class="text-gray-700 text-3xl font-semibold title-phase" v-else>{{ $t('home.plan.planPhase.rest') }}</span>
        </div>
        <div class="flex row-100">
          <div class="d-flex flex-wrap mb-1">
            <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 row-100"><span class="text-gray-500 text-sm font-normal mr-2">{{ $t('home.plan.programToPlan1.period') }}:</span></div>
            <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 text-right"><span class="text-gray-700 text-sm font-semibold">{{ phaseAditional.period }}</span></div>
          </div>
          <div class="d-flex flex-wrap mb-1">
            <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 row-100"><span class="text-gray-500 text-sm font-normal mr-2">{{ $t('home.plan.planPhase.startDate') }}:</span></div>
            <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 text-right"><span class="text-gray-700 text-sm font-semibold">{{ getMonthDayAndYear(phaseAditional.startDate) }}</span></div>
          </div>
          <div class="d-flex flex-wrap mb-1">
            <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 row-100"><span class="text-gray-500 text-sm font-normal mr-2">{{ $t('home.plan.planPhase.endDate') }}:</span></div>
            <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6 text-right"><span class="text-gray-700 text-sm font-semibold">{{ getMonthDayAndYear(phaseAditional.endDate) }} </span></div>
          </div>
        </div>
      </div>
      <div class="detail-columns d-flex flex-wrap justify-content-between" :class="!isSummary ? 'details-width-71' : 'details-width-73' " @click="changeTabForSelectedPhase()">
        <div class="d-flex flex-column detail-column">
          <div class="d-flex flex-column first-detail-section">
            <div class="d-flex"><span class="text-gray-600 text-sm font-semibold">{{ $t('global.cashFlowOpportunity') }}</span></div>
            <div class="d-flex align-items-baseline" :class="!isSummary ? 'mb-1' : ' '">
              <Skeleton class="skeletons-bg mt-2 text-center" v-if="programInrecalculating" :shape="'rectangle'" :style="{ width: '60%', height: '36px', borderRadius:  '58px' }"></Skeleton><span class="text-gray-700 text-2xl font-bold mr-1" v-if="!programInrecalculating">{{ StringUtils.formatBigNumbers(phaseAditional.cashFlow ?? 0) }}</span><span class="text-gray-500 text-sm font-normal" v-if="!isSummary && !programInrecalculating">({{ getBarValue()  }}%)</span>
            </div>
            <div class="d-flex" v-if="!isSummary && !programInrecalculating">
              <HomeBarLevel :widthContainer="'90%'" :size-result="getBarValue()" :key="'bar1'+keyGaugebar"></HomeBarLevel>
            </div>
            <div class="d-flex mb-2 align-items-baseline" v-if="showOpportunityExpectedOpportunity === 'OPPORTUNITY_AND_EXPECTED'" :class="!isSummary ? 'mt-1' : 'mt-0'"><span class="text-gray-500 text-sm font-normal">{{ $t("global.expected") }}</span>
              <Skeleton class="skeletons-bg mt-1 text-center ml-1" v-if="programInrecalculating" :shape="'rectangle'" :style="{ width: '30%', height: '26px', borderRadius:  '58px' }">           </Skeleton><span class="text-gray-700 text-sm font-semibold ml-1 expected-cash-flow" v-if="!programInrecalculating">{{ StringUtils.formatBigNumbers(phaseAditional.expectedCashFlow ?? 0) }}</span>
            </div>
          </div>
          <div class="d-flex flex-column first-detail-section" v-if="vCardEnabled">
            <div class="d-flex"><span class="text-gray-600 text-sm font-semibold">{{ $t('global.rebatesOpportunity') }}</span></div>
            <div class="d-flex align-items-baseline" :class="!isSummary ? 'mb-1' : ' '">
              <Skeleton class="skeletons-bg mt-2 text-center" v-if="programInrecalculating" :shape="'rectangle'" :style="{ width: '60%', height: '36px', borderRadius:  '58px' }"></Skeleton><span class="text-gray-700 text-2xl font-bold mr-1" v-if="!programInrecalculating">{{ StringUtils.formatBigNumbers(phaseAditional.vCardRebateOpportunity ?? 0) }}</span><span class="text-gray-500 text-sm font-normal" v-if="!isSummary && !programInrecalculating">({{ getBarValueExpected() }}%)</span>
            </div>
            <div class="d-flex" v-if="!isSummary && !programInrecalculating">
              <HomeBarLevel :widthContainer="'90%'" :size-result="getBarValueExpected()" :key="'bar2'+keyGaugebar"></HomeBarLevel>
            </div>
            <div class="d-flex mb-2 align-items-baseline" v-if="showOpportunityExpectedOpportunity === 'OPPORTUNITY_AND_EXPECTED'" :class="!isSummary ? 'mt-1' : 'mt-0'"><span class="text-gray-500 text-sm font-normal">{{ $t("global.expected") }}</span>
              <Skeleton class="skeletons-bg mt-1 text-center ml-1" v-if="programInrecalculating" :shape="'rectangle'" :style="{ width: '30%', height: '26px', borderRadius:  '58px' }">           </Skeleton><span class="text-gray-700 text-sm font-semibold ml-1 expected-cash-flow" v-if="!programInrecalculating">{{ StringUtils.formatBigNumbers(phaseAditional.vCardExpected ?? 0) }}</span>
            </div>
          </div>
          <div class="d-flex flex-column align-items-baseline"><span class="text-gray-600 text-sm font-semibold">{{ `${$t('home.entityCard.negotiation.spend')}${showForecastVolume ? " (F)" : ""}`}}</span>
            <div class="d-flex">
              <div class="d-flex align-items-baseline"><span class="text-gray-700 text-2xl font-bold mr-1">{{ showForecastVolume ? forecastValueComputed : spendVolumeComputed }} </span><span class="text-gray-500 text-sm font-normal" v-if="!isSummary">({{ computedPercentage }}%)</span></div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column detail-column">
          <div class="d-flex"><span class="text-gray-600 text-sm font-semibold">{{ $t('home.plan.programToPlan2.entities')  }}</span></div>
          <div class="d-flex">
            <div class="row row-100" style="width: 100%;">
              <div class="col-3 d-flex flex-column row-100"><span class="text-gray-700 text-4xl font-bold">{{ getNumberWithDecimals(phaseAditional.parentCount, 0) }}</span><span class="text-gray-500 text-sm font-normal">{{ $t('global.parents')  }}</span></div>
              <div class="col-2 d-flex flex-column row-100"><span class="mt-2">&nbsp;</span></div>
              <div class="col-3 d-flex flex-column row-100"><span class="text-gray-700 text-4xl font-bold">{{ getNumberWithDecimals(phaseAditional.providerCount, 0) }}</span><span class="text-gray-500 text-sm font-normal">{{ $t('global.suppliers')  }}            </span></div>
              <div class="col-3 d-flex flex-column row-100"><span class="mt-2">&nbsp;</span></div>
            </div>
          </div>
          <div class="d-flex">
            <div class="row row-100" style="width: 100%;">
              <div class="col-3 d-flex flex-column row-100"><span class="text-gray-700 text-4xl font-bold">{{ getNumberWithDecimals(phaseAditional.spendCount, 0) }}</span><span class="text-gray-500 text-sm font-normal">{{ $t('global.spends')  }}    </span></div>
              <div class="col-2 d-flex flex-column row-100"><span class="mt-2">&nbsp;</span></div>
              <div class="col-5 d-flex flex-column row-100"><span class="text-gray-700 text-4xl font-bold">{{ getNumberWithDecimals(phaseAditional.buyerCount, 0) }}</span><span class="text-gray-500 text-sm font-normal"> {{ $t('home.categorize.other.buyers') }}</span></div>
              <div class="col-1 d-flex flex-column row-100"><span class="mt-2">&nbsp;</span></div>
            </div>
          </div>
        </div>
        <div class="d-flex execution-columns cursor-pointer">
          <div class="d-flex flex-column execution-column"><span class="text-gray-700 text-base font-bold">{{ $t('home.plan.execution') }}</span><span class="text-gray-700 text-xs font-normal mb-3">{{ $t('home.plan.negotiatedSuppliers') }} </span>
            <SemiGaugebar :result="phaseAditional.providerNegotiated ?? 0" :target="phaseAditional.providerCount ?? 0" :key="keyGaugebar"></SemiGaugebar>
          </div>
        </div>
      </div>
      <div class="options-col" v-if="!isSummary && !programInrecalculating">
        <PlanPhaseOptions v-if="!isSummary && !blockPlanOptions" @remove="deletePhase" @editPhaseName="editPhaseName = !editPhaseName" @editPhase="showModalEdit" :phaseNumber="phaseData.number" :newPhase="newPhase" :restPhase="phaseData.isRest"></PlanPhaseOptions>
      </div>
    </div>
  </div>
  <div class="card-view-section-details" :class="{ 'show-details-section' :  openCloseDetails}" v-if="!isSummary">
    <HomeAccordionSingle :title="$t('home.plan.filterCategories.countries')" :items="phaseData.countries.map((item: any) => item.label)" v-if="notEmptyDataArray(phaseData.countries)"></HomeAccordionSingle>
    <HomeAccordionSingle :title="$t('home.plan.filterCategories.industries')" :items="phaseData.industries.map((item: any) => item.label)" v-if="notEmptyDataArray(phaseData.industries)"></HomeAccordionSingle>
    <HomeAccordionSingle :title="$t('home.plan.filterCategories.harmonizationGroups')" :items="phaseData.harmGroups.map((item: any) => item.name)" v-if="notEmptyDataArray(phaseData.harmGroups)"></HomeAccordionSingle>
    <HomeAccordionSingle :title="$t('home.plan.filterCategories.financingGroups')" :items="phaseData.finGroups.map((item: any) => item.name)" v-if="notEmptyDataArray(phaseData.finGroups)"></HomeAccordionSingle>
  </div>
  <div class="open-close-details" v-if="!programInrecalculating && !isSummary && (notEmptyDataArray(phaseData.countries) || notEmptyDataArray(phaseData.industries) || notEmptyDataArray(phaseData.harmGroups) || notEmptyDataArray(phaseData.finGroups))"><span class="text-span-500" @click="openCloseDetails = !openCloseDetails" :class="openCloseDetails ? 'details-opened' : 'details-closed'">{{ openCloseDetails ? $t('home.plan.planPhase.lessFullDetails') : $t('home.plan.planPhase.seeFullDetails') }}       </span></div>
</div>
</template>
<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, ref, computed } from 'vue'

import { StringUtils, NumberUtils } from "@/utils";
import { useI18n } from 'vue-i18n'
import { usePlanStore } from '@/stores/plan'
import { CalculumLoading } from '@ada/design-system'
import HomeAccordionSingle from '@/modules/home/components/HomeAccordionSingle.vue'
import HomeBarLevel from '@/modules/home/components/HomeBarLevel.vue'
import HomeLevelChart from '@/modules/home/components/HomeLevelChart.vue'
import PlanPhaseOptions from '@/modules/home/plan/components/PlanPhaseOptions.vue'
import SemiGaugebar from '@/modules/home/components/SemiGaugebar.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { Skeleton } from "@progress/kendo-vue-indicators";
import * as colorsGroups from '@/utils/ColorsGroups'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useSpendFile, useUser } from "@/composables"

import { getNumberWithDecimals, getMonthDayAndYear } from '@/utils/FormatData';
import { calculateForecastValues } from '@/utils/ForecastUtils';
import { DataInterfacePhase } from '../../types'
import PhaseCardSkeleton from '@/modules/home/components/skeletons/PhaseCardSkeleton.vue'
import IconChartForecast from "@ada/design-system/assets/icons/iconChartForecast.vue";
import IconChartForecastDown from "@ada/design-system/assets/icons/iconChartForecastDown.vue";


export default defineComponent({
  name: 'PlanPhaseOverview',
  components: {
    CalculumLoading,
    CalculumTooltipIcon,
    HomeAccordionSingle,
    HomeBarLevel,
    HomeLevelChart,
    PlanPhaseOptions,
    SemiGaugebar,
    Skeleton,
    Tooltip,
    PhaseCardSkeleton,
    IconChartForecast,
    IconChartForecastDown
  },
  props: {    
    phaseData: { type: Object, required: true },
    planId: { type: String, required: true },    
    programInrecalculating: { type: Boolean, required: false , default: false},
    blockPlanOptions: { type: Boolean, required: false , default: false},
    vCardEnabled: { type: Boolean, required: false, default: false},
    globalFilter: { type: String, required: false, default: '' },
    currencyRate: { type: Number, default: 0 },
    isSummary: { type: Boolean, required: false, default: false},
    phaseNumber: { type: Number, required: false, default: 0 },
  },
  emits: [
    'cancelFromHomePlan',
    'deletePhase',
    'getphaseData',
    'getPlanPhases',
    'selectPhaseTab',
    'reload-phases',
    'popover-advanced-tooltip',
    'showPhases',
    'showEditPhase',
    'send-data'
  ],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const planStore = usePlanStore()
    
    const { useFeatureForecastVolume } = useUser()

    const {
      spendFileVersionActiveId,
      showOpportunityExpectedOpportunity
    } = useSpendFile()

    const setphaseid =  ref(!props.isSummary ? StringUtils.removeIRI(props.phaseData['@id']) : null)

    onMounted(() => {
      getPlanPhaseSummary()
    })



    function getPlanPhaseSummary() {

      const currencyRate = props.currencyRate
      

      const filters = {
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        targetPlanUuid: props.planId,
        globalFilter: props.globalFilter,
        currencyRate,
        fullDisabled: false,
        targetPhaseUuid: setphaseid.value
      }


        const params = {
          filters,
          callbackSuccess: (callbackSuccessData: any) => {
            data.phaseAditional = callbackSuccessData                        
            data.loadingPhaseInfo = false
            data.keyGaugebar++

            if (!props.isSummary){
              emit('send-data',callbackSuccessData)
            } else {
              emit('showPhases',callbackSuccessData)
            }
            
          },
          callbackError: () => {
            data.loadingPhaseInfo = false
          }
        }
        if (!props.isSummary){
          planStore.getPlanPhaseSummary(params)
        } else {
          planStore.getPlanSummary(params)
        }
        
        }
    
    
    const data = reactive<DataInterfacePhase>({
      loadingPhaseInfo: true,
      phaseAditional: {
        number: 0,
        period: 0,
        startDate: '',
        endDate: '',
        phaseName: '',
        phaseNumber: 0,
        spendVolume: 0,
        spendVolumePercentage: 0,
        spendCount: 0,
        providerCount: 0,
        parentCount: 0,
        buyerCount: 0,
        providerNegotiated: 0,
        cashFlow: 0,
        cashFlowPercentage: 0,
        expectedCashFlow: 0,
        vCardRebateOpportunity: 0,
        vCardRebateOpportunityPercentage: 0,
        vCardRebateExpected: 0,
        vCardExpected: 0,        
        name: '',
        forecastVolume: null,
        forecastVolumePercentage: null
      },
      openCloseDetails: false,
      keyGaugebar: NumberUtils.getRandomInt(),
      editPhaseName: false,
      newPhase: false
      
    })

    
    function getBarValue() {
      return data.phaseAditional.cashFlowPercentage ? Math.round(data.phaseAditional.cashFlowPercentage)  : 0
    }

    function getBarValueExpected() {
      return data.phaseAditional.vCardRebateOpportunityPercentage ? Math.round(data.phaseAditional.vCardRebateOpportunityPercentage)  : 0
    }

    function getColor(info: any) {
      if (info.name && info.name.toLowerCase() === 'rest') {
        return colorsGroups.restColor;
      }      

      if (props.isSummary) {
        return colorsGroups.totalWaterfall;
      }

      const colors = [
        colorsGroups.chartFirstGroup,
        colorsGroups.chartSecondGroup,
        colorsGroups.chartThirdGroup,
        colorsGroups.chartFourthGroup,
        colorsGroups.chartFifthGroup
      ];

      // Calculate the index of the color based on the phase number
      let colorIndex = (info.number - 1) % (colors.length + 1);

      // Handle the case when colorIndex is -1 (numberVal is 0)
      if (colorIndex === -1) {
        colorIndex = colors.length;
      }

      // Return the color from the colors array based on the calculated index
      return colors[colorIndex];
    }


    function changeTabForSelectedPhase() {      
      if (props.phaseNumber === 0) {
        return
      }
      emit('selectPhaseTab', props.phaseData.id)
    }

    
    function notEmptyDataArray(data: any) {
      if (Array.isArray(data)) {
        if (data.length > 0) {
          return true
        } else {
          return false
        }
      } else {
        if (data) {
          return true
        } else {
          return false
        }
      }
    }


    function deletePhase() {
      emit('deletePhase', setphaseid.value)      
    }

    function showModalEdit(){
      emit('showEditPhase',props.phaseData)

    }
    const spendVolumeComputed = computed(() => {
      return StringUtils.formatBigNumbers(data.phaseAditional.spendVolume ?? 0)
    })

    //-Forecast values
    const forecastValues = computed(() => {
      return calculateForecastValues(data.phaseAditional.spendVolume, data.phaseAditional.forecastVolume);
    });

    const foreCastComputedIfExists = computed(() => forecastValues.value.foreCastComputedIfExists);
    const forecastValueComputed = computed(() => forecastValues.value.forecastValueComputed);    
    const isForeCastPositiveValue = computed(() => forecastValues.value.isForeCastPositiveValue);
    const foreCastPercentageComputedBigNumbers = computed(() => forecastValues.value.foreCastPercentageComputedBigNumbers);

    //- Validate the role and the value to show the forecast
    const showForecastVolume = computed(() => {
      return useFeatureForecastVolume.value && foreCastComputedIfExists.value
    })

    const computedPercentage = computed(() => {
      if (showForecastVolume.value) {
        return Math.round(data.phaseAditional.forecastVolumePercentage ?? 0)
      } else {
        return  data.phaseAditional.spendVolumePercentage ?  Math.round(data.phaseAditional.spendVolumePercentage) : 0
      }

    })


    return {
      ...toRefs(data),
      getNumberWithDecimals,
      getBarValue,
      getBarValueExpected,
      notEmptyDataArray,
      changeTabForSelectedPhase,
      getColor,
      getMonthDayAndYear,
      StringUtils,
      deletePhase,
      showModalEdit,
      showOpportunityExpectedOpportunity,
      spendVolumeComputed,
      showForecastVolume,
      isForeCastPositiveValue,
      foreCastPercentageComputedBigNumbers,
      forecastValueComputed,
      computedPercentage
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";



.card-view-plan {
  box-sizing: border-box;
  width: 100%;
  background: $color-grayblue-50;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  padding: 24px 0px 24px 0px;  
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 25px 25px rgba(0, 0, 0, 0.1);
  }
}

.summary-col {
  width: 25%;
  padding: 0px 0px 0px 24px;
  justify-content: space-between;
}

.detail-columns {
  padding: 16px;
  background: $color-nav-background;
  border-radius: 8px;
}

.details-width-71 {
  width: 71%;
}

.details-width-73 {
  width: 73%;
}

.options-col {
  width: 1%;
  text-align: center;
}

.detail-column {
  width: 36%;
}

.execution-columns {
  width: 26%;
}


.first-detail-section {
  min-height: 85px !important;    
}

.execution-column {
  align-items: center;
  padding: 10px 0px;
  width: 100%;
  background: $color-gray-light;
  border-radius: 8px;
}

.card-view-section-details {
  width: 100%;
  display: none;
}

.show-details-section {
  display: block;
  height: auto;
}

.justify-content-flex-end {
  justify-content: flex-end;
}


@media (max-width: 992px) {

  .summary-col {
    width: 50%;
  }

  .detail-columns {
    width: 100%;
  }

  .detail-column {
    width: 33%;
  }

  .execution-columns {
    width: 33%;
  }

  .options-col {
    width: 1%;
  }
}

@media (max-width: 768px) {

  .summary-col {
    width: 100%;
  }

  .detail-columns {
    width: 100%;
  }

  .detail-column {
    width: 100%;
  }

  .execution-columns {
    width: 100%;
  }

  .options-col {
    width: 1%;
  }
}

@media (max-width: 576px) {

  .summary-col {
    width: 100%;
  }

  .detail-columns {
    width: 100%;
  }

  .detail-column {
    width: 100%;
  }

  .execution-columns {
    width: 100%;
  }

  .options-col {
    width: 1%;
  }
}


.gap-content {
  gap: 1% !important;
}

.forced-pointer * {
  cursor: pointer !important;
}
</style>
