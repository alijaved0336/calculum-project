<template>
<ModalFullHarmGList v-if="isModalFullHarmGListShowing" @close="isModalFullHarmGListShowing = false" @go-to-program-edit-tab="goToProgramEditTab" :data="harmonizationGroups" :isAdminUser="isAdminUser"></ModalFullHarmGList>
<ModalFullFinancingGList v-if="isModalFullFinancingGListShowing" @close="isModalFullFinancingGListShowing = false" @go-to-program-edit-tab="goToProgramEditTab" :data="financingGroups" :isAdminUser="isAdminUser"></ModalFullFinancingGList>
<div class="row">
  <div class="col-xl-9 col-lg-9">
    <div class="row">
      <div class="col-xl-4 col-lg-4 card-analyze__overview">
        <div class="card">
          <div class="card-body d-flex flex-column">
            <div class="row mb-2">
              <div class="col-12 col-lg-12">
                <div class="d-flex align-items-center justify-content-between">
                  <h5 class="mb-0 text-base font-bold">{{ $t('global.paymentTermsD') }}
                    <CalculumTooltipIcon :infoText="$t('global.averageTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'program-payment-terms'" :keyPopOver="'programPaymentTerms'"></CalculumTooltipIcon>
                  </h5>
                  <Tooltip v-if="checkFinancingGroups" :anchor-element="'target'" :position="'top'">
                    <div class="btn-financing-container" v-if="checkFinancingGroups">
                      <button class="mb-2 rounded-xl border-0 h-6 font-medium text-gray-400 bg-gray-100" :title="$t('global.financingSCFProgramOverviewTooltip')" @click="isAdminUser && goToProgramEditTab('financing')">{{ $t('global.financing') }}</button>
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>
            <BarsWrapper class="mb-2" v-if="!programPaymentTermsLoading" :mainValue="(contractualValueComputed ? contractualValueComputed : actualValueComputed) ?? undefined" :extraValue="actualValueComputed ?? undefined" :contractualValue="contractualValueComputed ?? undefined" :title="$t('global.contractual')" :tooltipText="$t('global.contractualPaymentTermsTooltip')" :showSkeleton="programPaymentTermsLoading" :type="'contractual'"></BarsWrapper>
            <BarsWrapper class="mb-2" :mainValue="typeof programPaymentTerms.proposed === 'number' ? programPaymentTerms.proposed : undefined" :extraValue="typeof getPaymentCycleFloatValue === 'number' ? getPaymentCycleFloatValue : undefined" :title="$t('global.opportunity')" :tooltipText=" $t('global.paymentTermsOpportunityTooltip')" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'opportunity'"></BarsWrapper>
            <BarsWrapper class="mb-2" v-if="showOpportunityExpectedOpportunity === 'OPPORTUNITY_AND_EXPECTED'" :mainValue="typeof programPaymentTerms.expected === 'number' ? programPaymentTerms.expected : undefined" :extraValue="typeof getExpectedFloat === 'number' ? getExpectedFloat : undefined" :title="$t('global.expected')" :tooltipText="$t('global.expectedPaymentTermsTooltip')" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'expected'"></BarsWrapper>
          </div>
        </div>
      </div>
      <div class="col-xl-8 col-lg-8 card-analyze__overview">
        <div class="card">
          <div class="card-body">
            <div class="d-flex container-cols-cf-rebate">
              <div :class="`${vCardEnabled ? 'col-xl-8 col-lg-8':'col-xl-6 col-lg-6'} cash-flow-border d-flex`">
                <div :class="vCardEnabled ? 'col-xl-6':'col-xl-12'">
                  <OpportunityExpectedValues :showSkeleton="isLoadingVcardInfo" :activeSkeleton="false" :title="$t('global.cashFlow')" :titleTooltip="$t('global.cashFlowVcardTooltip')" :opportunity="vCardInfo?.potentialCashFlow ? StringUtils.formatBigNumbers(vCardInfo?.potentialCashFlow) : undefined" :expected="vCardInfo.expectedCashFlow ? StringUtils.formatBigNumbers(vCardInfo?.expectedCashFlow) : undefined" :type="'cashFlow'"></OpportunityExpectedValues>
                </div>
                <div class="col-xl-6" v-if="vCardEnabled">
                  <OpportunityExpectedValues :showSkeleton="isLoadingVcardInfo" :activeSkeleton="false" :titleTooltip="$t('home.analyze.vCard.rebateTooltip')" :title="$t('home.analyze.vCard.rebate')" :opportunity="vCardInfo?.vCardRebateFull ? StringUtils.formatBigNumbers(vCardInfo?.vCardRebateFull) : undefined" :expected="vCardInfo.vCardRebateExpected ? StringUtils.formatBigNumbers(vCardInfo?.vCardRebateExpected) : undefined" :type="'rebate'"></OpportunityExpectedValues>
                </div>
              </div>
              <div :class="`${vCardEnabled ? 'col-xl-4 col-lg-4':'col-xl-6 col-lg-6'} cash-flow-no-border`">
                <OpportunityExpectedValues :showSkeleton="isLoadingVcardInfo" :activeSkeleton="false" :titleTooltip="$t('home.entityCard.calculator.impactOfPaymentTermsonEconomicProfitVcardTooltip')" :title="$t('home.analyze.vCard.economicProfit')" :opportunity="vCardInfo?.economicProfit ? StringUtils.formatBigNumbers(vCardInfo?.economicProfit) : undefined" :expected="vCardInfo.economicProfitExpected ? StringUtils.formatBigNumbers(vCardInfo?.economicProfitExpected) : undefined" :type="'economicProfit'"></OpportunityExpectedValues>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-3 col-lg-3">
    <div class="row">
      <div class="col-xl-12 col-lg-12">
        <div class="card-analyze__overview spend-info-custom-title">
          <BigNumberThreeCols :title="$t('home.analyze.analyzeProgramOverview.spendEntities')" :tooltipText="$t('home.analyze.analyzeProgramOverview.spendEntitiesTooltip')" :big-number-title="$t('home.analyze.analyzeProgramOverview.spendVolume')" :big-number-value="programSpendInfo?.totalSpend ? StringUtils.formatBigNumbers(programSpendInfo.totalSpend) : undefined" :number-left-title="$t('global.ultimateParents')" :number-left-value="getNumberWithDecimals(programSpendInfo?.ultimateParentCount ?? 0, 0) ?? 0" :number-center-title="$t('global.defaultEntities')" :number-center-value="getNumberWithDecimals(programSpendInfo?.supplierCount ?? 0, 0) ?? 0" :number-right-title="$t('home.analyze.table.alias')" :number-right-value="getNumberWithDecimals(programSpendInfo?.spendCount ?? 0, 0) ?? 0" :showSkeleton="programSpendInfoLoading" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :isForeCastPositiveValue="isForeCastPositiveValue" :showForecastVolume="showForecastVolume" :foreCastPercentageComputedBigNumbers="foreCastPercentageComputedBigNumbers" :forecastValueComputed="forecastValueComputed">                </BigNumberThreeCols>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row metrics-distribution-row" v-if="programSpendInfoLoading">
  <div class="card w-100">
    <div class="card-body">
      <div class="row metrics-inner-row">
        <div class="col-xl-6 col-lg-6 metrics-col gap-2 flex-column">
          <div class="d-flex">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
          </div>
          <div class="d-flex flex-column">
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '95%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '85%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '75%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '50%', height: '55px' }"></Skeleton>
          </div>
        </div>
        <div class="col-xl-6 col-lg-6 metrics-col gap-2 flex-column">
          <div class="d-flex">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
          </div>
          <div class="d-flex flex-column">
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '95%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '85%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '75%', height: '55px' }"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '50%', height: '55px' }">             </Skeleton>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<!--Print the real MetricsComponent when the spendvolume is loaded-->
<div class="row metrics-distribution-row" v-if="!programSpendInfoLoading">
  <div :class="showProgramDistributionComponent ? 'col-xl-9 col-lg-9' : 'col-xl-12'">
    <div class="row metrics-inner-row">
      <div class="col-xl-6 col-lg-6 metrics-col">
        <MetricsComponent :section="'program'" :programIDForAPI="selectedProgramId" :key="keyMetricsComponent" :forRenderKeyComponent="forRenderkeyMetricsComponent" :programInrecalculation="programValues.recalculationInProgress" :showForecastVolume="showForecastVolume" @itemSelected="onItemSelected"> </MetricsComponent>
      </div>
      <div class="col-xl-6 col-lg-6 metrics-col">
        <MetricsComponent :section="'programSecondary'" :programIDForAPI="selectedProgramId" :key="keyMetricsComponent2" :forRenderKeyComponent="forRenderkeyMetricsComponent2" :programInrecalculation="programValues.recalculationInProgress" :showForecastVolume="showForecastVolume" @itemSelected="onItemSelected"></MetricsComponent>
      </div>
    </div>
  </div>
  <div class="col-xl-3 col-lg-3 distribution-col" v-if="showProgramDistributionComponent">
    <div class="card distribution-card">
      <div class="card-body">
        <div class="row">
          <div class="col-12 col-lg-12">
            <h5 class="mb-0 text-base font-bold">{{ $t('home.analyze.analyzeProgramOverview.programDistribution.programDistribution') }}
              <CalculumTooltipIcon :infoText="$t('global.programDistributionTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'program-distribution'" :keyPopOver="'programDistribution'"></CalculumTooltipIcon>
            </h5>
          </div>
        </div>
        <div class="row">
          <div class="col-12 col-lg-12">
            <ProgramDistribution id="programDistributionOpportunityOverviewId" :spend-volume="programDistribution.spendVolume" :cash-flow="programDistribution.cashFlow" :count-suppliers="programDistribution.countSuppliers" :economic-profit="programDistribution.economicProfit" :loading="loadingProgramDistribution" :hasFinancing="financingGroups.length > 0"></ProgramDistribution>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col-12">
    <ChartsLists :selectedProgramId="selectedProgramId" :programData="programData" :inRecalculation="programValues.recalculationInProgress" :itemSelectedInCharts="itemSelectedInCharts"></ChartsLists>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, computed, nextTick, watch } from 'vue'

// Utils
import {
  MAX_TERMS_DAYS_CHARTS,
  StringUtils,
  getRainbowPillClasses,
  NumberUtils
} from '@/utils'

import { calculateForecastValues } from '@/utils/ForecastUtils';

import { FinancingGroup, Program, AnalyzeProgramOverview } from '../types';
import { formatPercentage, getNumberWithDecimals } from '@/utils/FormatData';
import { ProgramDistributionResponse, ProgramSpendInfo , ProgramSelectedAndStatus } from '@/types';
import { Skeleton } from '@progress/kendo-vue-indicators';
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router';
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import BigNumberThreeCols from '@/modules/components/cards/BigNumberThreeCols.vue'
import CalculumBigNumber from '@/modules/components/charts/CalculumBigNumber.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import MetricsComponent from '@/modules/components/metrics/MetricsComponents.vue'
import ModalFullFinancingGList from '../components/modals/ModalFullFinancingGList.vue'
import ModalFullHarmGList from '../components/modals/ModalFullHarmGList.vue'
import OpportunityExpectedValues from '@/modules/components/OpportunityExpectedValues.vue'
import BarsWrapper from '@/modules/components/BarsWrapper.vue'
// Types
import type { PropType } from 'vue';
import useCompany from "@/composables/useCompany"
import useGroupsbyProgram from "@/composables/useGroupsbyProgram";
import useSpendFile from "@/composables/useSpendFile";
import useUser from "@/services/user/composables/useUser";

import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import ProgramDistribution from "@/modules/home/analyze/components/ProgramDistribution.vue";
import { useUserStore } from '@/stores/user'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import ChartsLists from '@/modules/home/analyze/components/list/ChartsLists.vue';


export default defineComponent({
  name: 'ProgramOverview',
  components: {
    ProgramDistribution,
    BigNumberThreeCols,
    CalculumBigNumber,
    CalculumTooltipIcon,
    BarsWrapper,
    MetricsComponent,
    ModalFullFinancingGList,
    ModalFullHarmGList,
    OpportunityExpectedValues,
    Skeleton,
    SkeletonRectangle,
    Tooltip,
    ChartsLists
  },
  props: {
    programData: { type: Object as PropType<Program>, required: true },
    selectedProgramId: { type: String, required: true },
    programValues: { type: Object as PropType<ProgramSelectedAndStatus>, required: true }
  },
  setup(props) {
      const globalFiltersStore = useGlobalFiltersStore()
      const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
      const analyzeStore = useAnalyzeStore()
    /** Firebase utils */

    const { storeHarmonizationByProgram, storeFinancingByProgram } = useGroupsbyProgram()
    

    const userStore = useUserStore();
    const { useFeatureVirtualCard, useFeature9BoxesFinancing, useFeatureForecastVolume } = useUser();
    const userIsSuperAdmin = userStore.isSuperAdmin;
    const userIsAdmin = userStore.isAdmin;
    const router = useRouter();

    const { usevCardGroupsEnabled } = useCompany()
    const {
      spendFileVersionActiveId,
      showOpportunityExpectedOpportunity
    } = useSpendFile()


    const isAdminUser = computed(() => {
      return userIsSuperAdmin || userIsAdmin
    })

    
    const data = reactive<AnalyzeProgramOverview>({
      expectedCashFlow: null,
      financingGroups: [],
      harmonizationGroups: [],
      isLoadingFinancingGroups: true,
      isLoadingHarmonizationGroups: true,
      isLoadingVcardInfo: true,
      isModalFullFinancingGListShowing: false,
      isModalFullHarmGListShowing: false,
      keyMetricsComponent: NumberUtils.getRandomInt(),
      keyMetricsComponent2: NumberUtils.getRandomInt(),
      forRenderkeyMetricsComponent: NumberUtils.getRandomInt(),
      forRenderkeyMetricsComponent2: NumberUtils.getRandomInt(),
      loading: true,
      paymentCycleDays: userStore.getPaymentCycleDays,
      programName: '',
      programPaymentTerms: {
        contractual: null,
        current: null,
        expected: null,
        proposed: null,
        paymentCycleFloat: 0,
        expectedFloat: null
      },
      programPaymentTermsLoading: true,
      programPotentials: {
        cashFlowValue: 0,
        savingsValue: 0,
        colorCashFlow: '',
        colorSavings: '',
        cashFlow: '0%',
        savings: '0%',
        marginCashFlow: '0%',
        marginSavings: '0%'
      },
      programPotentialsLoading: true,
      programSpendInfo: {},
      programSpendInfoLoading: true,
      showGraphicFullScreenChart1: false,
      showGraphicFullScreenChart2: false,
      vCardInfo: {
        economicProfit: null,
        economicProfitExpected: null,
        expectedCashFlow: null,
        potentialCashFlow: null,
        potentialSavings: null,
        vCardRebate: null,
        vCardRebateExpected: null,
        vCardRebateFull: null
      },
      programDistribution: {
        spendVolume: {
          termExtScf: 0,
          vcard: 0,
          excluded: 0,
          termExtScfTotal: 0,
          vcardTotal: 0,
          excludedTotal: 0
        },
        countSuppliers: {
          termExtScf: 0,
          vcard: 0,
          excluded: 0,
          termExtScfTotal: 0,
          vcardTotal: 0,
          excludedTotal: 0
        },
        cashFlow: {
          termExtScf: 0,
          vcard: 0,
          excluded: 0,
          termExtScfTotal: 0,
          vcardTotal: 0,
          excludedTotal: 0
        },
        economicProfit: {
          termExtScf: 0,
          vcard: 0,
          excluded: 0,
          termExtScfTotal: 0,
          vcardTotal: 0,
          excludedTotal: 0
        }
      },
      loadingProgramDistribution: true,
      itemSelectedInCharts: {
        groupName: '',
        optionName: '',
        name: '',
        secondaryName: ''
      }
      

    });



    /**
     * checks if virtual card is enabled
     */
    const vCardEnabled = computed(() => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value
    })
    const classFromVcard = computed(() => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value ? 'col-xl-3' : 'col-xl-4'
    })
    const checkFinancingGroups = computed(() => {
      return useFeature9BoxesFinancing.value && data.financingGroups && data.financingGroups.length > 0
    })
    /**
   * Get program data from API
   * Route: GET - /api/programs/{id}
   *
   * @return {void}
   */
    function getProgram(): void {
      data.programName = props.programData.name
      analyzeStore.setHasFinancing(props.programData.externalFinancingEnabled)
      analyzeStore.setHasHarmonization(props.programData.termHarmonizationEnabled)
    }

    analyzeStore.setIncludeExclude([])
    analyzeStore.setByExclusionRules(true)

    let setGlobalFilter = formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied)

    // TODO: Add watcher for global filters when watch import issue is resolved

    /**
     * Go to the given tab in program edition section
     *
     * @param tab { "harmonization" | "financing" }
     * @param options { isFromModal: boolean }
     */
    function goToProgramEditTab(tab: "harmonization" | "financing", options?: Partial<{ isFromModal: boolean }>) {
      // Close modal if open
      if (options?.isFromModal) {
        data.isModalFullHarmGListShowing = false
      }

      router.push({
        name: Routing.home.homeCompanySettings,
        query: {          
          selectedTab: tab,
          section: tab === 'harmonization' ? 'harmonizationGroups' : 'financingGroups',
        }
      });
    }



    // *** Financing Groups ***

    /**
     * Retrieves the financing groups.
     *
     * @returns {void}
     */
    async function getFinancingGroups(): Promise<void> {
      try {
        // Enable loading
        data.isLoadingFinancingGroups = true

        const params = {
          programId: props.selectedProgramId,
          callbackSuccess: (callbackSuccessData: FinancingGroup[]) => {
            const groups = callbackSuccessData.map((g) => {
              const name = g.name.split(',')[0]
              const baseRate =   g.isAutoBaseRate === true ? 'Base' : formatPercentage(g.baseRate / 100)
              const fundingSpread = formatPercentage(g.fundingSpread / 100)

              return {
                ...g,
                name: `${name}, ${baseRate}, ${fundingSpread}`
              }
            })

            data.financingGroups = groups;
            storeFinancingByProgram(props.selectedProgramId, data.financingGroups)
            analyzeStore.setFinancing(data.financingGroups)
            // Disable loading
            data.isLoadingFinancingGroups = false;
          },
          callbackError: () => {
            if (import.meta.env.DEV) console.log('** (getFinancingGroups) callbackError')

            // Disable loading
            data.isLoadingFinancingGroups = false
          }
        }

        await analyzeStore.getFinancingGroups(params)
      } catch (error) {
        if (import.meta.env.DEV) console.log('** (getFinancingGroups)', error)
      }
      finally {
        data.isLoadingFinancingGroups = false

      }
    }

    // *** END Financing Groups ***

    // *** Harmonization Groups ***

    // *** Payment Terms ***

    /**
     * Get program payment terms
     */
    function getProgramPaymentTerms() {
      // Enable loading
      const params = {
        programId: props.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          // Current
          data.programPaymentTerms.current = Math.round(response.currentAvgPaymentTerms)

          // Proposed
          data.programPaymentTerms.proposed = Math.round(response.proposedAvgPaymentTerms)

          // Contractual
          data.programPaymentTerms.contractual = response.contractualAvgPaymentTerms !== null ? Math.round(response.contractualAvgPaymentTerms) : response.contractualAvgPaymentTerms


          // Expected Payment Terms (Only for programs with NineBoxes enabled)
          data.programPaymentTerms.expected = response.expectedAvgPaymentTerms ?? null

          data.programPaymentTerms.paymentCycleFloat = response.paymentCycleFloat ?? 0

          data.programPaymentTerms.expectedFloat = response.expectedFloat ?? null

          // Disable loading
          data.programPaymentTermsLoading = false
        },
        callbackError: () => {


          // Disable loading
          data.programPaymentTermsLoading = false
        }
      }
      analyzeStore.getProgramPaymentTerms(params)
    }

    /**
     * Get program potential cash flow and savings
     */
    function getProgramPotentials() {
      const params = {
        programId: props.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {  // ? - Add type

          // Potential Cash Flow
          const potentialCashFlow = response.potentialCashFlow
          data.programPotentials.cashFlowValue = potentialCashFlow
          data.expectedCashFlow = response.expectedCashFlow ?? null

          // ? - Add description
          if (potentialCashFlow > 0) {
            data.programPotentials.colorCashFlow = '#2E9D58'
            data.programPotentials.marginCashFlow = '0%'
          }

          if (potentialCashFlow < 0) {
            data.programPotentials.colorCashFlow = '#FF2C4F'
          }

          if (potentialCashFlow === 0) {
            data.programPotentials.marginCashFlow = '0%'
            data.programPotentials.colorCashFlow = '#E9EAEC'
          }

          // Potential Savings
          const potentialSavings = response.potentialSavings
          data.programPotentials.savingsValue = potentialSavings

          if (potentialSavings > 0) {
            data.programPotentials.colorSavings = '#2E9D58'
            data.programPotentials.marginSavings = '0%'
          }
          if (potentialSavings < 0) {
            data.programPotentials.colorSavings = '#FF2C4F'
          }

          // ? - Add description
          if (potentialCashFlow >= potentialSavings) {
            data.programPotentials.cashFlow = '100%'
            const savingsResult = Math.round((potentialSavings * 100) / potentialCashFlow)
            data.programPotentials.savings = savingsResult + '%'
            if (potentialSavings < 0) {
              data.programPotentials.marginSavings = (100 - savingsResult) + '%'
            }
          } else {
            data.programPotentials.savings = '100%'
            const cashFlowResult = Math.round((potentialCashFlow * 100) / potentialSavings)
            data.programPotentials.cashFlow = cashFlowResult + '%'
            if (potentialCashFlow < 0) {
              data.programPotentials.marginCashFlow = (100 - cashFlowResult) + '%'
            }
          }


          // vcard related
          data.vCardInfo.economicProfit = response.economicProfit ?? null
          data.vCardInfo.economicProfitExpected = response.economicProfitExpected ?? null
          data.vCardInfo.expectedCashFlow = response.expectedCashFlow ?? null
          data.vCardInfo.potentialCashFlow = response.potentialCashFlow ?? null
          data.vCardInfo.vCardRebateExpected = response.vCardRebateExpected ?? null
          data.vCardInfo.vCardRebateFull = response.vCardRebateFull ?? null
          data.isLoadingVcardInfo = false

          // Disable loading
          data.programPotentialsLoading = false
          data.isLoadingVcardInfo = false
        },
        callbackError: () => {
          // Disable loading
          data.programPotentialsLoading = false
          data.isLoadingVcardInfo = false
        }
      }

      analyzeStore.getProgramPotentialsPost(params)
    }

    /**
     * Get program spend info
     */
    function getProgramSpendInfo() {
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(props.selectedProgramId)) {
        if (import.meta.env.DEV) console.log('** (getProgramSpendInfo) selectedProgramId is null or undefined');
        return;
      }

      if (StringUtils.isNullUndefinedOrEmpty(setGlobalFilter)) {
        if (import.meta.env.DEV) console.log('** (getProgramSpendInfo) setGlobalFilter is null or undefined');
        return;
      }

      
      
      const params = {
        programId: props.selectedProgramId,
        globalFilter: setGlobalFilter,
        fullDisabled: false,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        callbackSuccess: (response: ProgramSpendInfo) => {
  
          data.programSpendInfo = response          

          // Disable loading
          data.programSpendInfoLoading = false
        },
        callbackError: () => {
          // Disable loading
          data.programSpendInfoLoading = false
        }
      }
      analyzeStore.getProgramSpendInfo(params)
    }


    /**
   * Get program description
   */
    function getPercentage(part: number, total: number,name:string): number {      
      if (part || part !== 0 && total !== 0) {    
        const percentage=(part / total) * 100
        return name.includes('countSuppliers') ? Math.round(percentage) : Number(percentage.toFixed(0))
      }
      return 0
    }

    const mapData = (source: any,name:string, config: {
      totalKey: string,
      termExtKey: string,
      vcardKey: string,
      excludeKey: string
    }) => {
      const total = source[config.totalKey] ?? 0;      
      const safeValue = (value: number | null): number => value ? Number(Math.round(value * 100) / 100) : 0;      
      return {
        termExtScf: getPercentage(source[config.termExtKey], total,name),
        vcard: getPercentage(source[config.vcardKey], total,name),
        excluded: getPercentage(source[config.excludeKey], total,name),
        termExtScfTotal: safeValue(source[config.termExtKey]),
        vcardTotal: safeValue(source[config.vcardKey]),
        excludedTotal: safeValue(source[config.excludeKey])
      };
    };
    const showProgramDistributionComponent = computed(() => {
      const { termExtScfTotal, vcardTotal, excludedTotal } = data.programDistribution.spendVolume;
      return ((termExtScfTotal > 0 && vcardTotal > 0) || (vcardTotal > 0 && excludedTotal > 0) || (termExtScfTotal > 0 && excludedTotal > 0));
    });
    function getProgramDistribution() {
      
      data.loadingProgramDistribution = true
      // Enable loading
      const params = {
        programId: props.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          const dataResponse: ProgramDistributionResponse = response as ProgramDistributionResponse
          data.programDistribution.spendVolume = mapData(dataResponse.spendVolume,'spendVolume', {
            totalKey: 'totalVolume',
            termExtKey: 'volumeTermExtension',
            vcardKey: 'volumeVcard',
            excludeKey: 'excludeVolume'
          });

          data.programDistribution.countSuppliers = mapData(dataResponse.countSuppliers,'countSuppliers', {
            totalKey: 'totalSuppliers',
            termExtKey: 'SuppliersTermExtension',
            vcardKey: 'SuppliersVcard',
            excludeKey: 'excludeSuppliers'
          });

          data.programDistribution.cashFlow = mapData(dataResponse.cashFlow,'cashFlow', {
            totalKey: 'totalCashFlow',
            termExtKey: 'cashFlowTermExtension',
            vcardKey: 'cashFlowVcard',
            excludeKey: 'excludeCashFlow'
          });

          data.programDistribution.economicProfit = mapData(dataResponse.economicProfit,'economicProfit', {
            totalKey: 'totalEconomicProfit',
            termExtKey: 'economicProfitTermExtension',
            vcardKey: 'economicProfitVcard',
            excludeKey: 'excludeEconomicProfit'
          });
          // Disable loading
          data.loadingProgramDistribution = false

        },
        callbackError: () => {

          // Disable loading
          data.loadingProgramDistribution = false
        }
      }
      analyzeStore.getProgramDistribution(params)
    }

    function getInitProgramAPI() {
      data.programPaymentTermsLoading = true
      data.programPotentialsLoading = true
      data.programSpendInfoLoading = true

      getProgram()
      getFinancingGroups()
      getProgramSpendInfo()
      getProgramPotentials()
      getProgramPaymentTerms()
      getProgramDistribution()
    }

    // Function to sync chart heights with program distribution
    const syncChartHeights = () => {
      nextTick(() => {
        const distributionCard = document.querySelector('.program-distribution-fixed-height') as HTMLElement;
        if (distributionCard) {
          const height = distributionCard.offsetHeight;
          document.documentElement.style.setProperty('--program-distribution-height', `${height}px`);
        }
      });
    }

    onMounted(() => {
      getInitProgramAPI()

      // Sync chart heights after mount
      syncChartHeights();
    })

    // Watch for changes in program distribution loading state
    watch(() => data.loadingProgramDistribution, (newVal) => {
      if (!newVal) {
        syncChartHeights();
      }
    })



    /**
     * checks if payment cycle float is greater than zero and not null
     */
    const paymentCycleFloatIsGreaterThanZero = computed(() => {
      return data.programPaymentTerms?.paymentCycleFloat !== null && data.programPaymentTerms?.paymentCycleFloat > 0
    })


    /**
     * Get payment cycle float
     */
    const getPaymentCycleFloatValue = computed(() => {
      return data.programPaymentTerms?.paymentCycleFloat
    })



    const getExpectedFloat = computed(() => {
      return data.programPaymentTerms?.expectedFloat
    })


    const getDifferenceBetweenActualAndContractual = computed(() => {
      return NumberUtils.differenceBetweenTwoNumbers(
        data.programPaymentTerms.current ?? 0, data.programPaymentTerms.contractual ?? 0,)
    })


    const contractualValueComputed = computed(() => {
      return data?.programPaymentTerms?.contractual ? Number(data.programPaymentTerms.contractual) : null
    })

    const actualValueComputed = computed(() => {
      return data?.programPaymentTerms?.current ? Number(data.programPaymentTerms.current) : null
    })


    function onItemSelected(groupName: string, optionName: string, name: string, section: string | null | undefined) {
      if(section === 'programSecondary') {
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

    //-Forecast values
    const forecastValues = computed(() => {
      return calculateForecastValues(data.programSpendInfo.totalSpend, data.programSpendInfo.forecastVolume);
    });

    const foreCastComputedIfExists = computed(() => forecastValues.value.foreCastComputedIfExists);
    const forecastValueComputed = computed(() => forecastValues.value.forecastValueComputed);    
    const isForeCastPositiveValue = computed(() => forecastValues.value.isForeCastPositiveValue);
    const foreCastPercentageComputedBigNumbers = computed(() => forecastValues.value.foreCastPercentageComputedBigNumbers);

    //- Validate the role and the value to show the forecast
    const showForecastVolume = computed(() => {
      return useFeatureForecastVolume.value && foreCastComputedIfExists.value
    })

    return {
      ...toRefs(data),
      actualValueComputed,
      contractualValueComputed,
      formatData,
      getDifferenceBetweenActualAndContractual,
      getFinancingGroups,
      getInitProgramAPI,
      getNumberWithDecimals,
      getPaymentCycleFloatValue,
      getProgramPaymentTerms,
      getProgramSpendInfo,
      getRainbowPillClasses,
      goToProgramEditTab,
      MAX_TERMS_DAYS_CHARTS,
      paymentCycleFloatIsGreaterThanZero,
      StringUtils,
      vCardEnabled,
      getExpectedFloat,
      classFromVcard,
      showProgramDistributionComponent,
      showOpportunityExpectedOpportunity,
      isAdminUser,
      useFeature9BoxesFinancing,
      onItemSelected,
      checkFinancingGroups,
      foreCastComputedIfExists,
      forecastValueComputed,      
      isForeCastPositiveValue,
      foreCastPercentageComputedBigNumbers,
      showForecastVolume
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

// Top cards row - Equal height for all 3 top cards
.row:first-child {
  > .col-xl-9,
  > .col-xl-3 {
    display: flex;
    
    > .row {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      
      > .col-xl-4,
      > .col-xl-8,
      > .col-xl-12 {
        display: flex;
        
        .card-analyze__overview,
        .card {
          display: flex;
          flex: 1;
          flex-direction: column;
          
          .card-body {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
        }
        
        // Center content vertically for Spend & Entities card
        .spend-info-custom-title {
          .card-body {
            justify-content: center;
          }
        }
      }
    }
  }
}


// Program Distribution - Maintains its own height based on content
.program-distribution-fixed-height {
  height: fit-content !important;
  min-height: auto !important;
  
  .card-body {
    height: auto;
    padding: 20px;
  }
}

.container-cols-cf-rebate {
  border-radius: 8px;
  padding: 2px !important;
  background: #F9FAFB !important;
  border: 1px solid #f2f4f7;
}

.cash-flow-border {
  border: 1px solid #f2f4f7;
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

@media screen and (max-width: 1920px) {
  .expected-value {
    font-size: 14px;
  }
}

@media screen and (max-width: 1440px) {
  .expected-value {
    font-size: 12px;
  }
}

.add-groups-disabled {
  color: #344054  !important;
  background-color: #f2f4f7 !important;
}

.btn-financing-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  width: fit-content;
  
  button {
    width: 100%;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
}

// Metrics and Distribution equal height layout
.metrics-distribution-row {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  
  > div {
    display: flex;
    flex-direction: column;
  }
}

.metrics-inner-row {
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  align-items: stretch;
}

.metrics-col {
  display: flex;
  
  :deep(.card-metrics) {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  }
}

.distribution-col {
  display: flex;
}

.distribution-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

</style>
