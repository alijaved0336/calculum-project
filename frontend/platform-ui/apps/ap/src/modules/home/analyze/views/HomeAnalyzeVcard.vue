<template>
<div class="row">
  <div class="col-xl-3 col-lg-3 card-analyze__overview">
    <div class="card">
      <div class="card-body d-flex flex-column">
        <div class="row mb-2">
          <div class="col-12 col-lg-12"><span class="mb-0 text-base font-bold">{{ $t('global.paymentTermsD') }}
              <CalculumTooltipIcon :infoText="$t('global.averageTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'program-payment-terms'" :keyPopOver="'programPaymentTerms'"></CalculumTooltipIcon></span></div>
        </div>
        <BarsWrapper class="mb-2" v-if="!isLoading" :mainValue="(contractualValueComputed ? contractualValueComputed : actualValueComputed) ?? undefined" :extraValue="actualValueComputed ?? undefined" :contractualValue="contractualValueComputed ?? undefined" :title="$t('global.contractual')" :tooltipText="$t('global.contractualPaymentTermsTooltip')" :showSkeleton="isLoading" :type="'contractual'"></BarsWrapper>
        <BarsWrapper class="mb-2" :mainValue="vCardDataInterface?.summary?.vCardOpportunity?.toString() ?? null" :extraValue="vCardDataInterface?.summary?.vCardGroupCumulativeFloat?.toString() ?? ''" :title="$t('global.opportunity')" :tooltipText="$t('global.paymentTermsOpportunityTooltip')" :showSkeleton="isLoading" :activeSkeleton="false" :type="'opportunity'"> </BarsWrapper>
        <div class="row mb-2 mt-10">
          <div class="col-12 col-lg-12 mt-1">
            <h5 class="mb-0 text-base font-bold">{{ $t('home.analyze.vCard.avgRebate') }} (%)</h5>
            <div class="row">
              <div class="col-12 col-lg-12">
                <div class="d-flex" v-if="isLoading || programValues.recalculationInProgress">
                  <SkeletonRectangle :size="'sm'"></SkeletonRectangle>
                </div>
                <div class="mt-1 mx-auto font-semibold text-gray-700 text-xl" v-else>{{ getNumberWithDecimals(vCardDataInterface?.summary?.vCardGroupRebate ?? 0, 2) }} %</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-6 col-lg-6 card-analyze__overview">
    <div class="card">
      <div class="card-body container-data-flex">
        <div class="d-flex container-cols-cf-rebate">
          <div class="col-xl-8 col-lg-8 cash-flow-border d-flex">
            <div class="col-xl-6 col-lg-6">
              <OpportunityExpectedValues :showSkeleton="isLoading" :activeSkeleton="false" :title="$t('global.cashFlow')" :titleTooltip="$t('global.cashFlowVcardTooltip')" :opportunity="vCardDataInterface?.cashFlow?.vCardCashFlowGainFull ? StringUtils.formatBigNumbers(vCardDataInterface?.cashFlow?.vCardCashFlowGainFull) : undefined" :expected="vCardDataInterface?.cashFlow?.vCardCashFlowGain ? StringUtils.formatBigNumbers(vCardDataInterface?.cashFlow?.vCardCashFlowGain) : undefined" :type="'vCard-cashFlow'"></OpportunityExpectedValues>
            </div>
            <div class="col-xl-6 col-lg-6">
              <OpportunityExpectedValues :showSkeleton="isLoading" :activeSkeleton="false" :title="$t('home.analyze.vCard.rebate')" :titleTooltip="$t('home.analyze.vCard.rebateTooltip')" :opportunity="vCardDataInterface?.cashFlow?.vCardRebateFull ? StringUtils.formatBigNumbers(vCardDataInterface?.cashFlow?.vCardRebateFull) : undefined" :expected="vCardDataInterface?.cashFlow?.vCardRebate ? StringUtils.formatBigNumbers(vCardDataInterface?.cashFlow?.vCardRebate) : undefined"  :type="'vCard-rebate'"></OpportunityExpectedValues>
            </div>
          </div>
          <div class="col-xl-4 col-lg-4 cash-flow-no-border">
            <OpportunityExpectedValues :showSkeleton="isLoading" :activeSkeleton="false" :title="$t('home.entityCard.calculator.economicProfit')" :titleTooltip="$t('home.entityCard.calculator.impactOfPaymentTermsonEconomicProfitVcardTooltip')" :opportunity="vCardDataInterface?.cashFlow?.vCardCashFlowEpFull ? StringUtils.formatBigNumbers(vCardDataInterface?.cashFlow?.vCardCashFlowEpFull) : undefined" :expected="vCardDataInterface?.cashFlow?.vCardCashFlowEp ? StringUtils.formatBigNumbers(vCardDataInterface?.cashFlow?.vCardCashFlowEp) : undefined" :type="'vCard-economicProfit'">   </OpportunityExpectedValues>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-3 col-lg-3 card-analyze__overview spend-info-custom-title">
    <BigNumberThreeCols :title="$t('home.analyze.analyzeProgramOverview.spendEntities')" :tooltipText="$t('home.analyze.analyzeProgramOverview.spendEntitiesTooltip')" :big-number-title="$t('home.analyze.analyzeProgramOverview.spendVolume')" :big-number-value="vCardDataInterface?.entities?.volume ? StringUtils.formatBigNumbers(vCardDataInterface?.entities?.volume) : undefined" :number-left-title="$t('global.ultimateParents')" :number-left-value="getNumberWithDecimals(vCardDataInterface?.entities?.parents, 0) ?? 0" :number-center-title="$t('global.defaultEntities')" :number-center-value="getNumberWithDecimals(vCardDataInterface?.entities?.suppliers, 0) ?? 0" :number-right-title="$t('home.analyze.table.alias')" :number-right-value="getNumberWithDecimals(vCardDataInterface?.entities?.spends, 0) ?? 0" :showSkeleton="isLoading" :activeSkeleton="false" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'"></BigNumberThreeCols>
  </div>
</div>
<div class="row">
  <div class="col-xl-6">
    <MetricsComponent :section="'vCardPrimary'" :programIDForAPI="selectedProgramId" :key="keyMetricsComponent" :programInrecalculation="programValues.recalculationInProgress" :forRenderKeyComponent="forRenderkeyMetricsComponent" @itemSelected="onItemSelected">   </MetricsComponent>
  </div>
  <div class="col-xl-6">
    <MetricsComponent :section="'vCardSecondary'" :programIDForAPI="selectedProgramId" :key="keyMetricsComponent2" :programInrecalculation="programValues.recalculationInProgress" :forRenderKeyComponent="forRenderkeyMetricsComponent2" @itemSelected="onItemSelected">   </MetricsComponent>
  </div>
</div>
<div class="row">
  <div class="col-12">
    <ChartsLists :selectedProgramId="selectedProgramId" :programData="programData" :inRecalculation="programValues.recalculationInProgress" :itemSelectedInCharts="itemSelectedInCharts" :vcardEnabled="true"></ChartsLists>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, reactive, toRefs, computed, onMounted, ref, ComputedRef } from 'vue'
import { Program, vCardDataInterface } from '../types';
import {
  MAX_TERMS_DAYS_CHARTS,
  StringUtils,
  NumberUtils
} from '@/utils'
import { converToPercentage, getNumberWithDecimals, convertFiltersToREST } from '@/utils/FormatData';
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import BigNumberThreeCols from '@/modules/components/cards/BigNumberThreeCols.vue'
import OpportunityExpectedValues from '@/modules/components/OpportunityExpectedValues.vue'
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import MetricsComponent from '@/modules/components/metrics/MetricsComponents.vue'
import BarsWrapper from '@/modules/components/BarsWrapper.vue'
import ChartsLists from '@/modules/home/analyze/components/list/ChartsLists.vue';
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import useSpendFile from "@/composables/useSpendFile";
import type { PropType } from 'vue';
import { ProgramSelectedAndStatus } from '@/types';
import { useAppStore } from '@/stores/app'

export default defineComponent({
  name: 'HomeAnalyzeVcard',
  components: {
    BigNumberThreeCols,
    CalculumTooltipIcon,
    BarsWrapper,
    MetricsComponent,
    OpportunityExpectedValues,
    SkeletonRectangle,
    ChartsLists,
  },
  props: {
    selectedProgramId: { type: String, required: true },
    programValues: { type: Object as PropType<ProgramSelectedAndStatus>, required: true },
    programData: { type: Object as PropType<Program>, required: true }
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()    
    
    interface vCardInterface {
      isLoading: boolean,
      keyMetricsComponent: number,
      keyMetricsComponent2: number,
      vCardDataInterface: vCardDataInterface | null,
      itemSelectedInCharts: {
        groupName: string,
        optionName: string,
        name: string,
        secondaryName: string | null | undefined
      }
      forRenderkeyMetricsComponent: number,
      forRenderkeyMetricsComponent2: number,
    }

    const data = reactive<vCardInterface>({
      isLoading: true,
      keyMetricsComponent: NumberUtils.getRandomInt(),
      keyMetricsComponent2: NumberUtils.getRandomInt(),
      forRenderkeyMetricsComponent: NumberUtils.getRandomInt(),
      forRenderkeyMetricsComponent2: NumberUtils.getRandomInt(),
      vCardDataInterface: null,
      itemSelectedInCharts: {
        groupName: '',
        optionName: '',
        name: '',
        secondaryName: null
      }
    })

    const globalFilters = ref(globalFiltersStore.getFiltersApplied)
    const filtersAppliedFormattedREST: ComputedRef<string | null> = computed(() => {
      return convertFiltersToREST(globalFilters.value)
    })
    const currencyNumberVal = useAppStore().getCurrencyAmount

    const {
      spendFileVersionActiveId
    } = useSpendFile()


    onMounted(() => {
      getCardsData()
    })


    const actualValueComputed = computed(() => {
      return data.vCardDataInterface?.summary?.actual ? Number(data.vCardDataInterface?.summary?.actual) : null
    })

    const contractualValueComputed = computed(() => {
      return data.vCardDataInterface?.summary?.contractualActual ? Number(data.vCardDataInterface?.summary?.contractualActual) : null
    })

    const contractualAndCurrentValues = computed(() => {

      return getDifferenceBetweenActualAndContractual.value < 0 ? [Number(data.vCardDataInterface?.summary?.actual ?? 0), Number(data.vCardDataInterface?.summary?.contractualActual ?? 0),] : []
    })

    const getDifferenceBetweenActualAndContractual = computed(() => {
      return NumberUtils.differenceBetweenTwoNumbers(Number(data.vCardDataInterface?.summary?.actual ?? 0), Number(data.vCardDataInterface?.summary?.contractualActual ?? 0))

    })

    function getCardsData() {
      data.isLoading = true
      const params = {
        filters: {
          targetSpendFileVersionUuid: spendFileVersionActiveId.value,
          targetProgramUuid: props.selectedProgramId,
          globalFilter: filtersAppliedFormattedREST.value,
          currencyRate: currencyNumberVal,
          fullDisabled: false
        },
        callbackSuccess: (callbackSuccessData: any) => {
          data.isLoading = false
          data.vCardDataInterface = callbackSuccessData
        },
        callbackError: () => {
          data.isLoading = false
        }
      }
      analyzeStore.getCardsDataVcardOpportunity(params)
    }

    /**
     * Handle item selected in charts (from MetricsComponent)
     * This is used to highlight the selected item in the ChartsLists component
     * 
     * @param groupName - The group name (e.g., 'Payment Terms')
     * @param optionName - The option name (e.g., 'Contractual')
     * @param name - The item name (e.g., 'Net 30')
     * @param secondaryName - Optional secondary name for the item
     */
    function onItemSelected(groupName: string, optionName: string, name: string, section: string | null | undefined) {
      if(section === 'vCardSecondary') {
        data.forRenderkeyMetricsComponent++
      }else{
        data.forRenderkeyMetricsComponent2++
      }
      data.itemSelectedInCharts = {
        groupName: groupName,
        optionName: optionName,
        name: name,
        secondaryName: null
      }      
    }

    return {
      ...toRefs(data),
      actualValueComputed,
      contractualAndCurrentValues,
      contractualValueComputed,
      converToPercentage,
      getDifferenceBetweenActualAndContractual,
      getNumberWithDecimals,
      MAX_TERMS_DAYS_CHARTS,
      StringUtils,
      onItemSelected
    }
  }



})
</script>

<style lang="scss" scoped>
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 270px;

  .card-body {
    padding: 20px;
  }
}

// Set the height of all cards at the top to the same value
.row>[class*="col-"]:has(> .card) {
  display: flex;
}

.row>[class*="col-"]:has(> .card)>.card {
  width: 100%;
}

.container-cols-cf-rebate {
  border-radius: 8px;
  padding: 2px !important;
  background: #f2f4f7 !important;

}


.cash-flow-border {
  border: 1px solid #eaecf0;
  border-radius: 8px;
  padding: 16px 8px !important;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  background: #ffffff;

  @media screen and (max-width: 1200px) {
    padding: 32px 8px !important;
  }


}

.cash-flow-no-border {
  padding: 16px 8px !important;

  @media screen and (max-width: 1200px) {
    padding: 32px 8px !important;
  }

}

.rebate-border {
  border-radius: 8px;
  padding: 16px !important;
  background: #f2f4f7 !important;
}

// .container-data-flex {
//   align-content: center;

// }</style>