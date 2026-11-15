<template>
<CalculumFullScreen v-if="isFullScreenFirstChart" @closeFullScreen="isFullScreenFirstChart = false" :title="''">
  <template v-slot:fullScreenContent>
    <div class="col-12">
      <div class="row">
        <div class="col">
          <MetricsComponentNew :section="'analyze'" :key="keyMetricsComponent">
            <template v-slot:slotHeader>
              <div class="row w-100 d-flex justify-content-between p-5">
                <div class="text-base font-bold">Chart</div>
              </div>
            </template>
          </MetricsComponentNew>
        </div>
      </div>
    </div>
  </template>
</CalculumFullScreen>
<CalculumFullScreen v-if="isFullScreenSecondaryChart" @closeFullScreen="isFullScreenSecondaryChart = false" :title="''">
  <template v-slot:fullScreenContent>
    <div class="col-12">
      <div class="row">
        <div class="col">
          <MetricsComponentNew2 :section="'analyze'" :key="keyMetricsComponent">
            <template v-slot:slotHeader>
              <div class="row w-100 d-flex justify-content-between p-5">
                <div class="text-base font-bold">Chart</div>
              </div>
            </template>
          </MetricsComponentNew2>
        </div>
      </div>
    </div>
  </template>
</CalculumFullScreen>
<div class="row">
  <div class="col-12">
    <div class="col-12" v-if="mockupTabIndex === 0">
      <div class="row row--1">
        <div class="col-sm-12 col-md-6 col-lg-3">
          <div class="card home-card-height shadow-none">
            <div class="card-body d-flex flex-column justify-content-between">
              <div class="row mb-2">
                <div class="col-12 col-lg-12">
                  <div class="d-flex align-items-center justify-content-between">
                    <h5 class="mb-0 text-base font-bold">{{ $t('global.paymentTermsD') }}
                      <CalculumTooltipIcon :infoText="$t('global.averageTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'program-payment-terms'" :keyPopOver="'programPaymentTerms'"></CalculumTooltipIcon>
                    </h5>
                  </div>
                </div>
              </div>
              <BarsWrapperNew class="mb-2" :mainValue="78" :extraValue="82" :contractualValue="78" :title="$t('global.contractual')" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'contractual'"></BarsWrapperNew>
              <BarsWrapperNew class="mb-2" :mainValue="44" :extraValue="undefined" :title="$t('global.opportunity')" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'opportunity'"></BarsWrapperNew>
              <BarsWrapperNew class="mb-2" v-if="showOpportunityExpectedOpportunity === 'OPPORTUNITY_AND_EXPECTED'" :mainValue="56" :extraValue="typeof getExpectedFloat === 'number' ? getExpectedFloat : undefined" :title="$t('global.expected')" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'expected'"></BarsWrapperNew>
            </div>
          </div>
        </div>
        <div class="col-lg-6 col-md-12 card-wrapper--triple-box">
          <div class="card shadow-none card--auto-height card--triple-box">
            <div class="card-body">
              <div class="row d-flex container-cols-cf-rebate">
                <div class="col-md-8 col-12 d-flex flex-wrap cash-flow-border">
                  <div class="col-sm-6 col-12">
                    <OpportunityExpectedValues :showSkeleton="isLoadingVcardInfo" :activeSkeleton="false" :title="$t('global.cashFlow')" :titleTooltip="$t('global.cashFlowVcardTooltip')" :opportunity="'130.3m'" :expected="'89.0m'" :type="'cashFlow'"></OpportunityExpectedValues>
                  </div>
                  <div class="col-sm-6 col-12 secondary-box">
                    <OpportunityExpectedValues :showSkeleton="isLoadingVcardInfo" :activeSkeleton="false" :title="'P&L Impact'" :titleTooltip="'some text'" :opportunity="'-454.6k'" :expected="'-764.1k'" :type="'cashFlow'"></OpportunityExpectedValues>
                  </div>
                </div>
                <div class="col-md-4 col-12 cash-flow-no-border">
                  <OpportunityExpectedValues :showSkeleton="isLoadingVcardInfo" :activeSkeleton="false" :titleTooltip="$t('home.entityCard.calculator.impactOfPaymentTermsonEconomicProfitVcardTooltip')" :title="$t('home.analyze.vCard.economicProfit')" :opportunity="'15.1m'" :expected="'10.3m'" :type="'economicProfit'"></OpportunityExpectedValues>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-sm-12 col-md-6 col-lg-3">
          <BigNumberThreeCols :title="'Sales & Entities'" :tooltipText="$t('home.analyze.analyzeProgramOverview.spendEntitiesTooltip')" :big-number-title="'Sales Volume'" :big-number-value="'1.3b'" :number-left-title="$t('global.ultimateParents')" :number-left-value="'225'" :number-center-title="'Buyers'" :number-center-value="'293'" :number-right-title="'Sales Lines'" :number-right-value="'400'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true"></BigNumberThreeCols>
        </div>
      </div>
      <div class="row align-items-stretch">
        <div class="col-12 col-xl-6 d-flex">
          <MetricsComponentNew class="w-100" :section="'analyze'" :key="keyMetricsComponent">
            <template v-slot:slotHeader>
              <div class="row w-100 d-flex justify-content-between p-5">
                <div class="text-base font-bold">Chart</div>
                <p class="btn-extension" @click="isFullScreenFirstChart = true">
                  <button class="btn btn-simple btn-icon link link--icon"><em class="fa-solid fa-up-right-and-down-left-from-center text-sm"></em></button>
                </p>
              </div>
            </template>
          </MetricsComponentNew>
        </div>
        <div class="col-12 col-xl-6 d-flex">
          <MetricsComponentNew2 class="w-100" :section="'analyze'" :key="keyMetricsComponent">
            <template v-slot:slotHeader>
              <div class="row w-100 d-flex justify-content-between p-5">
                <div class="text-base font-bold">Chart</div>
                <p class="btn-extension" @click="isFullScreenSecondaryChart = true">
                  <button class="btn btn-simple btn-icon link link--icon"><em class="fa-solid fa-up-right-and-down-left-from-center text-sm"></em></button>
                </p>
              </div>
            </template>
          </MetricsComponentNew2>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <ChartsListsNew v-if="programData" :selectedProgramId="programValues.selectedProgramId" :programData="programData" :inRecalculation="programValues.recalculationInProgress" :itemSelectedInCharts="itemSelectedInCharts" @itemSelected="onItemSelected"></ChartsListsNew>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
<script lang='ts'>
import { onBeforeRouteLeave } from 'vue-router'
import { toRefs, reactive, computed, onMounted, defineComponent, watch, ref } from 'vue'
import { translate } from '@/utils/translation'
import { useHomeStore } from '@/stores/home'
import { useAppStore } from '@/stores/app'
import { useNegotiationStatusStore } from '@/stores/negotiationStatus'
import { usePlanStore } from '@/stores/plan'
import { useNotificationsStore } from '@/stores/notifications'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useEntityCardStore } from '@/stores/entityCard'
import { CalculumLayout } from '@ada/design-system'

//- Utils
import { StringUtils, NumberUtils } from '@/utils'
import { getNumberWithDecimals } from '@/utils/FormatData';
import useEntity from '@/modules/home/entityCard/composables/useEntity'

//- Interfaces
import { DataInterface } from '@/types/homeView';
import { ProgramSpendInfo } from '@/types';
import { Program } from '@/modules/home/analyze/types';
import HomeProgramStatusDropdown from '@/modules/home/components/HomeProgramStatusDropdown.vue'
import * as formatData from '@/utils/FormatData'

//- Components
import BigNumberThreeCols from '@/modules/components/cards/BigNumberThreeCols.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import MetricsComponentNew from '@/modules/components/metrics/MetricsComponentsNew.vue';
import MetricsComponentNew2 from '@/modules/components/metrics/MetricsComponentsNew2.vue';
import OpportunityExpectedValues from '@/modules/components/OpportunityExpectedValues.vue';
import { CalculumFullScreen } from "@ada/design-system";
import SwitcherBase from '@/modules/components/switcher/SwitcherBase.vue'

/** Composables */
import useFirebase from "@/composables/firebase/useFirebase";
import useSpendFile from "@/composables/useSpendFile";
import useProgramList from "@/composables/useProgramList";
import { useUser } from "@/composables";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { shouldShowErrorToasts } from "@/utils/axios";
import { useUserStore } from '@/stores/user'
import { useSubscribeStore } from '@/stores/subscribe'
import ChartsListsNew from '@/modules/home/analyze/components/list/ChartsListsNew.vue';
import BarsWrapperNew from '@/modules/components/BarsWrapperNew.vue';
import { TabStrip } from '@progress/kendo-vue-layout';


export default defineComponent({
  name: 'ReceivablesMockup2',
  components: { SwitcherBase, CalculumLayout, HomeProgramStatusDropdown, BigNumberThreeCols, CalculumTooltipIcon, MetricsComponentNew, MetricsComponentNew2, OpportunityExpectedValues, ChartsListsNew, BarsWrapperNew, CalculumFullScreen, TabStrip },
  props: {
    resetStorage: { type: String, default: '0', requied: false },
    editionMode: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const homeStore = useHomeStore()
    const appStore = useAppStore()
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()
    const entityCardStore = useEntityCardStore()
    const subscribeStore = useSubscribeStore()
    const planStore = usePlanStore()
    const notificationsStore = useNotificationsStore()
    const negotiationStatusStore = useNegotiationStatusStore()
    const toast = useToast();
    const { subscribeToPrograms } = useFirebase();
    const { spendFileVersionActiveId, showOpportunityExpectedOpportunity } = useSpendFile()
    const { setSelectedProgramValues, setProgramsToDropdown } = useProgramList()
    const { entitySelectedTrackingNumber } = useEntity()
    const { user, userId, userIri, useFeatureEntityCardNewsletter } = useUser();
    const { apolloClientResetStore, isResetting } = useApolloClient();
    const userStore = useUserStore()

    let setGlobalFilter = formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied)

    const currentTab = ref('Overview')

    const mockupTabs = [
      { title: 'Summary' },
      { title: 'Prioritization' },
      { title: 'Waterfall' }
    ]
    const mockupTabIndex = ref(0)

    function onSelectMockupTab(e: any) {
      mockupTabIndex.value = e.selected
    }

    const receivablesTabs = [
      { title: 'Overview' },
      { title: 'Receivable Finance' },
      { title: 'Early Payment Discount' },
      { title: 'List' }
    ]

    const selectedTabIndex = computed(() => {
      const index = receivablesTabs.findIndex((tab) => tab.title === currentTab.value)
      return index >= 0 ? index : 0
    })

    function onSelectTab(e: any) {
      const selectedTab = receivablesTabs[e.selected]
      if (selectedTab) {
        currentTab.value = selectedTab.title
      }
    }

    const isLoadingVcardInfo = ref(true)
    const isFullScreenFirstChart = ref(false);
    const isFullScreenSecondaryChart = ref(false);

    const programData = ref<Program | null>(null)
    const vCardInfo = reactive({
      economicProfit: null as number | null,
      economicProfitExpected: null as number | null,
      expectedCashFlow: null as number | null,
      potentialCashFlow: null as number | null,
      vCardRebateExpected: null as number | null,
      vCardRebateFull: null as number | null
    })

    interface additionalInterface {
      keyMetricsComponent: number
      programPaymentTerms: {
        contractual: number | null
        current: number | null
        expected: number | null
        proposed: number | null
        paymentCycleFloat: number
        expectedFloat: number | null
      }
      programPaymentTermsLoading: boolean
      itemSelectedInCharts: {
        groupName: string
        optionName: string
        name: string
        secondaryName: string | null
      }
    }

    const data = reactive<DataInterface & additionalInterface>({
      username: user.value?.firstName,
      loadingPrograms: false,
      selectedProgramUri: '',
      statusesInfo: [],
      selectedTabIndex: homeStore.getEntityLevelTabSelected,
      key: new Date().getUTCMilliseconds(),
      keyGauge1: new Date().getUTCMilliseconds(),
      keyGauge2: new Date().getUTCMilliseconds(),
      keyGauge3: new Date().getUTCMilliseconds(),
      keyScroll: new Date().getUTCMilliseconds(),
      keyScrollRecentchanges: new Date().getUTCMilliseconds(),
      agreedInfo: {
        start: 0,
        end: 0,
        agreed: 0,
        percentage: 0
      },
      suppliersNegotiated: {
        start: 0,
        end: 0,
        negotiated: 0,
        percentage: 0
      },
      cashFlowAchieved: {
        start: 0,
        end: 0,
        agreed: 0,
        percentage: 0
      },
      loadingGaugeInfoPaymentTerms: true,
      loadingGaugeInfocashFlowAchieved: true,
      loadingStackedBarInfo: true,
      programValues: {
        recalculationInProgress: true,
        pendingRecalculation: true,
        selectedProgramId: null,
        isBoxesRecalculating: null
      },
      dropdownProgramValues: {
        programsList: null
      },
      loadingGaugesuppliersNegotiated: true,
      programSpendInfo: {},
      loadingSuppliersNegotiated: true,
      planSummary: [],
      loadingPlanSummary: true,
      keyPlansummary: new Date().getUTCMilliseconds(),
      showModalPlanSummary: false,
      areNotesLoading: true,
      notesSummary: [],
      homeDashboardWithPrograms: false,
      keyLayout: new Date().getUTCMilliseconds(),
      keyMetricsComponent: NumberUtils.getRandomInt(),
      programPaymentTerms: {
        contractual: null,
        current: null,
        expected: null,
        proposed: null,
        paymentCycleFloat: 0,
        expectedFloat: null
      },
      programPaymentTermsLoading: true,
      itemSelectedInCharts: {
        groupName: '',
        optionName: '',
        name: '',
        secondaryName: null
      }
    })



    /** Api Calls */

    function getNotes() {
      const params = {
        userID: userId.value,
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (callbackSuccessData: any) => {
          data.notesSummary = callbackSuccessData.filter((item: any) => item.createdBy['@id'] !== userIri.value)
          data.areNotesLoading = false
        },
        callbackError: (callbackErrorData: any) => {
          data.areNotesLoading = false
        }
      }
      notificationsStore.getUserNotes(params)
    }

    function getAllPrograms() {
      data.loadingPrograms = true
      const params = {
        scope: 'all',
        marked: null,
        firstName: null,
        lastName: null,
        recalculationInProgress: false,
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (response: any) => {

          data.programValues = setSelectedProgramValues(response)
          if (StringUtils.isNullUndefinedOrEmpty(data.programValues.selectedProgramId)) {

            data.loadingGaugeInfoPaymentTerms = false
            data.loadingGaugeInfocashFlowAchieved = false
            data.loadingGaugesuppliersNegotiated = false
            data.loadingSuppliersNegotiated = false
            data.loadingPlanSummary = false
            isLoadingVcardInfo.value = false
            data.loadingPrograms = false
            return
          }

          data.dropdownProgramValues = setProgramsToDropdown(response)

          const selectedProgram = response.find((p: any) =>
            StringUtils.removeIRI(p['@id']) === StringUtils.removeIRI(data.programValues.selectedProgramId)
          )
          if (selectedProgram) {
            programData.value = selectedProgram
          }

          if (data.dropdownProgramValues.programsList && data.dropdownProgramValues.programsList.length >= 2) {
            data.homeDashboardWithPrograms = true //to add a extra class to the dashboard
            data.keyLayout++
          }

          subscribeToPrograms([StringUtils.removeIRI(data.programValues.selectedProgramId)])

          data.key++
          reactiveFnsByProgram()
          data.loadingPrograms = false
        },
        callbackError: () => {
          data.loadingPrograms = false
          if (shouldShowErrorToasts()) {
            toast.error(translate.t('error.server500'))
          }
        }
      }
      analyzeStore.fetchAllPrograms(params)
    }

    function getInfo(type: string) {
      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        type: type,
        callbackSuccess: (response: any) => {

          switch (type) {

            case 'stats_agreed':
              data.agreedInfo = response.agreedInfo
              data.loadingGaugeInfoPaymentTerms = false
              data.keyGauge1++
              break;

            case 'stats_info':
              data.cashFlowAchieved.end = response.statusesInfo[3].total
              data.cashFlowAchieved.agreed = response.statusesInfo[3].value
              data.cashFlowAchieved.percentage = response.statusesInfo[3].percentage
              data.loadingGaugeInfocashFlowAchieved = false
              data.keyGauge2++
              break;

            case 'stats_suppliers_negotiated':

              data.suppliersNegotiated = response.suppliersNegotiated
              data.loadingGaugesuppliersNegotiated = false
              data.keyGauge3++
              break;

            default:
              data.key++
              break;
          }

        },
        callbackError: () => {
          data.loadingGaugeInfoPaymentTerms = false
          data.loadingStackedBarInfo = false
          if (shouldShowErrorToasts()) {
            toast.error(translate.t('error.server500'))
          }
        }
      }
      analyzeStore.getStatsAgreed(params)
    }


    function getPlansSummary() {
      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          data.planSummary = response
          data.loadingPlanSummary = false
          data.keyPlansummary++
        },
        callbackError: () => {
          data.loadingGaugeInfoPaymentTerms = false
          data.loadingStackedBarInfo = false
          if (shouldShowErrorToasts()) {
            toast.error(translate.t('error.server500'))
          }
        }
      }
      planStore.getPlansSummaryByProgram(params)
    }

    function getProgramSpendInfo() {

      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(data.programValues.selectedProgramId)) {
        if (import.meta.env.DEV) console.log('** (getProgramSpendInfo) selectedProgramId is null or undefined');
        return;
      }

      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        fullDisabled: false,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        callbackSuccess: (response: ProgramSpendInfo) => {
          data.programSpendInfo = response
          data.loadingSuppliersNegotiated = false
          data.key++
        },
        callbackError: () => {
          // Disable loading
          // data.programSpendInfoLoading = false
        }
      }
      analyzeStore.getProgramSpendInfo(params)
    }


    async function changeProgram(programID: any) {
      const programInList = data.dropdownProgramValues.programsList.find(
        (x: any) => StringUtils.removeIRI(x['@id']) === StringUtils.removeIRI(programID)
      );

      if (!programInList) return;

      data.programValues.selectedProgramId = StringUtils.removeIRI(programID);
      // data.programValues.recalculationInProgress = programInList.recalculationInProgress;
      // data.programValues.pendingRecalculation = programInList.pendingRecalculation;
      programData.value = programInList || null
      entityCardStore.setSelectedProgram(data.programValues.selectedProgramId);
      subscribeToPrograms([data.programValues.selectedProgramId]);

      await apolloClientResetStore();
      if (!isResetting.value) {
        reactiveFnsByProgram();
        data.keyScroll++;
        data.keyScrollRecentchanges++;
      }
    }

    function reactiveFnsByProgram() {

      /** Reset all values */

      data.agreedInfo.start = 0
      data.agreedInfo.end = 0
      data.agreedInfo.agreed = 0
      data.agreedInfo.percentage = 0

      data.suppliersNegotiated.start = 0
      data.suppliersNegotiated.end = 0
      data.suppliersNegotiated.negotiated = 0
      data.suppliersNegotiated.percentage = 0


      data.cashFlowAchieved.start = 0
      data.cashFlowAchieved.end = 0
      data.cashFlowAchieved.agreed = 0
      data.cashFlowAchieved.percentage = 0

      data.programSpendInfo = {}

      vCardInfo.economicProfit = null
      vCardInfo.economicProfitExpected = null
      vCardInfo.expectedCashFlow = null
      vCardInfo.potentialCashFlow = null
      vCardInfo.vCardRebateExpected = null
      vCardInfo.vCardRebateFull = null

      isLoadingVcardInfo.value = true

      data.keyGauge1++
      data.keyGauge2++
      data.keyGauge3++
      data.key++
      data.planSummary = []

      /** Reset all to true */

      data.loadingGaugeInfoPaymentTerms = true
      data.loadingGaugeInfocashFlowAchieved = true
      data.loadingGaugesuppliersNegotiated = true
      data.loadingPlanSummary = true
      data.loadingSuppliersNegotiated = true

      getInfo('stats_agreed')
      getInfo('stats_info')
      getInfo('stats_suppliers_negotiated')
      getPlansSummary()
      getProgramSpendInfo()
      getProgramPotentials()
      data.programPaymentTermsLoading = true
      data.programPaymentTerms = { contractual: null, current: null, expected: null, proposed: null, paymentCycleFloat: 0, expectedFloat: null }
      getProgramPaymentTerms()
    }

    function getProgramPotentials() {
      isLoadingVcardInfo.value = true

      if (StringUtils.isNullUndefinedOrEmpty(data.programValues.selectedProgramId)) {
        isLoadingVcardInfo.value = false
        return
      }

      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          vCardInfo.economicProfit = response.economicProfit ?? null
          vCardInfo.economicProfitExpected = response.economicProfitExpected ?? null
          vCardInfo.expectedCashFlow = response.expectedCashFlow ?? null
          vCardInfo.potentialCashFlow = response.potentialCashFlow ?? null
          vCardInfo.vCardRebateExpected = response.vCardRebateExpected ?? null
          vCardInfo.vCardRebateFull = response.vCardRebateFull ?? null
          isLoadingVcardInfo.value = false
        },
        callbackError: () => {
          isLoadingVcardInfo.value = false
        }
      }

      analyzeStore.getProgramPotentialsPost(params)
    }


    /** Computed */

    const contractualValueComputed = computed(() => {
      return data.programPaymentTerms?.contractual ? Number(data.programPaymentTerms.contractual) : null
    })

    const actualValueComputed = computed(() => {
      return data.programPaymentTerms?.current ? Number(data.programPaymentTerms.current) : null
    })

    const getPaymentCycleFloatValue = computed(() => {
      return data.programPaymentTerms?.paymentCycleFloat
    })

    const getExpectedFloat = computed(() => {
      return data.programPaymentTerms?.expectedFloat
    })

    function getProgramPaymentTerms() {
      if (StringUtils.isNullUndefinedOrEmpty(data.programValues.selectedProgramId)) return
      const params = {
        programId: data.programValues.selectedProgramId,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          data.programPaymentTerms.current = Math.round(response.currentAvgPaymentTerms)
          data.programPaymentTerms.proposed = Math.round(response.proposedAvgPaymentTerms)
          data.programPaymentTerms.contractual = response.contractualAvgPaymentTerms !== null ? Math.round(response.contractualAvgPaymentTerms) : null
          data.programPaymentTerms.expected = response.expectedAvgPaymentTerms ?? null
          data.programPaymentTerms.paymentCycleFloat = response.paymentCycleFloat ?? 0
          data.programPaymentTerms.expectedFloat = response.expectedFloat ?? null
          data.programPaymentTermsLoading = false
        },
        callbackError: () => {
          data.programPaymentTermsLoading = false
        }
      }
      analyzeStore.getProgramPaymentTerms(params)
    }

    watch(
      () => subscribeStore.refreshPrograms,
      (newValue) => {

        switch (newValue) {
          //The final state and refresh all and show all the values
          case "ready":
            initialCalls()
            break;

          default:
            break;
        }
      },
    );


    onMounted(() => {
      userStore.setLastSectionVisitedbyUser('home')
      initialCalls()

      if (props.resetStorage !== '0') {
        clearAllVuex()
      }
    })

    onBeforeRouteLeave(async (to) => {
      await apolloClientResetStore();
    })

    function initialCalls() {
      data.loadingPrograms = true
      data.areNotesLoading = true
      getAllPrograms()
      getNotes()
    }

    watch(entitySelectedTrackingNumber, async () => {
      await apolloClientResetStore();
      if (!isResetting.value) {
        reactiveFnsByProgram();
        data.keyScroll++;
        data.keyScrollRecentchanges++;
      }
    });

    watch(() => props.resetStorage, () => {
      //-Because now, always will overwrite from API whoamin
      if (props.resetStorage !== '0') {
        clearAllVuex()
      }
    }, { deep: true })

    watch(
      () => negotiationStatusStore.getRefresNotes,
      (newValue) => {
        getNotes()
      }
    )

    const globalFiltersData = computed(() => {
      if (globalFiltersStore.getDisableWatchers) {
        return null;
      }
      const filters = globalFiltersStore.getFiltersApplied;
      return formatData.convertFiltersToREST(filters);
    });

    watch(globalFiltersData, (newValue) => {
      if (newValue !== null) {
        setGlobalFilter = newValue;
        reactiveFnsByProgram();
        data.keyScroll++;
        data.keyScrollRecentchanges++;
        if (data.keyMetricsComponent !== undefined) data.keyMetricsComponent++;
      }
    }, { flush: 'post' });

    watch(
      () => appStore.getCurrencyAmount,
      (newValue) => {
        setTimeout(function () {
          reactiveFnsByProgram()
          data.keyScroll++
          data.keyScrollRecentchanges++
        }, 100)
      }
    )

    function clearAllVuex() {
      globalFiltersStore.setValuesByColumn({
        spends: [],
        suppliers: [],
        parents: [],
        potentials: []
      })
      analyzeStore.setFinancingsGroupsbyProgram([])
      analyzeStore.setHarmonizationsGroupsbyProgram([])
    }

    function changeTab(tab: string) {
      currentTab.value = tab
    }

    return {
      ...toRefs(data),
      StringUtils,
      getNumberWithDecimals,
      changeProgram,
      currentTab,
      mockupTabs,
      mockupTabIndex,
      onSelectMockupTab,
      receivablesTabs,
      selectedTabIndex,
      onSelectTab,
      changeTab,
      useFeatureEntityCardNewsletter,
      vCardInfo,
      isLoadingVcardInfo,
      isFullScreenFirstChart,
      isFullScreenSecondaryChart,
      programData,
      onItemSelected,
      contractualValueComputed,
      actualValueComputed,
      getPaymentCycleFloatValue,
      getExpectedFloat,
      showOpportunityExpectedOpportunity
    }

    function onItemSelected(groupName: string, optionName: string, name: string) {
      data.itemSelectedInCharts = {
        groupName,
        optionName,
        name,
        secondaryName: null
      }
    }
  }

})
</script>

<style lang='scss' scoped>

@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

.secondary-box{
  @media screen and (max-width: 576px) {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #eceef0;
  }
}
.card--auto-height{
    height: auto;
    min-height: auto;
    max-height: none;
}
.card-wrapper--triple-box{
  @media screen and (max-width: 991px) {
    order: 1;
  }
}
.card--triple-box{
  height: calc(100% - 2rem);
  .card-body{
    display: flex;
    align-items: center;
    width: 100%;
    &>div{
      width: 100%;
    }
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
.home-card-height {
  min-height: 21.5rem !important;
  max-height: 21.5rem !important;
}

.card-home-plan {
  min-height: 264px !important;
  max-height: 264px !important;
  overflow: hidden;
  overflow-y: auto;

  &-no-scroll {
    overflow-y: hidden;
  }
}

.title-dashboard {
  align-items: end;
  width: 20%;
}

.gauge-title {
  min-height: 50px;
  margin-bottom: 2rem;
  position: relative;
  overflow: visible;
}

@media (max-width: 1600px) {
  .card-body {
    flex: 1 1 auto;
    min-height: 1px;
    padding: 1rem;
  }
}

@media (max-width: 1400px) {
  .card-body {
    flex: 1 1 auto;
    min-height: 1px;
    padding: 0.5rem;
  }
}

.home-dashboard-aligment {
  align-items: end;
}

.home-dashboard-aligment-dropdown {
  justify-content: end;
}

.btn {
  font-size: 14px !important;
}

</style>
