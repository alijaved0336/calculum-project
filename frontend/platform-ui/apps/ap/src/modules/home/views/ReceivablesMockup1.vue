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
          <MetricsComponentNew3 :section="'analyze'" :key="keyMetricsComponent">
            <template v-slot:slotHeader>
              <div class="row w-100 d-flex justify-content-between p-5">
                <div class="text-base font-bold">Chart  </div>
              </div>
            </template>
          </MetricsComponentNew3>
        </div>
      </div>
    </div>
  </template>
</CalculumFullScreen>
<div class="d-flex flex-column" v-if="currentTab === 'Overview'">
  <div class="row">
    <div class="col col-12 col-md-6 col-lg-6 col-xl-3 first-gauge-card">
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
          <BarsWrapperNew class="mb-2" :mainValue="35" :extraValue="0" :contractualValue="35" :title="'Lowest Payment Term'" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'contractual'"></BarsWrapperNew>
          <BarsWrapperNew class="mb-2" :mainValue="78" :extraValue="82" :title="'Average Payment Terms'" :contractualValue="78" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'contractual'"></BarsWrapperNew>
          <BarsWrapperNew class="mb-2" :mainValue="95" :extraValue="95" :contractualValue="95" :title="'Highest Payment Term'" :activeSkeleton="false" :showSkeleton="programPaymentTermsLoading" :type="'contractual'"></BarsWrapperNew>
        </div>
      </div>
    </div>
    <div class="col col-12 col-md-6 col-lg-6 col-xl-3">
      <div class="card home-card-height shadow-none">
        <div class="card-body d-flex flex-column justify-content-between pb-0">
          <div class="col-12 d-flex align-items-top mb-4">
            <div class="text-base font-bold">Sales - Top 80% Distribution</div>
          </div>
          <Chart class="sales-distribution-chart">
            <ChartTooltip :visible="true"></ChartTooltip>
            <ChartLegend :position="'bottom'"></ChartLegend>
            <ChartCategoryAxis>
              <ChartCategoryAxisItem :categories="spendVolumeCategories" :title="{ text: 'Sales Volume' }"></ChartCategoryAxisItem>
            </ChartCategoryAxis>
            <ChartValueAxis>
              <ChartValueAxisItem :title="{ text: 'Number of Buyers' }" :major-unit="1000" :labels="{ content: yAxisLabelsContent }"></ChartValueAxisItem>
            </ChartValueAxis>
            <ChartSeries>
              <ChartSeriesItem :name="'Sales 1.1b / Buyers 5,727'" :type="'area'" :data-items="suppliersSeriesSecondary" :color="'#a4aeeb'"></ChartSeriesItem>
              <ChartSeriesItem :name="'Sales 2.3b / Buyers 343'" :type="'area'" :data-items="suppliersSeriesPrimary" :color="'#5266eb'"></ChartSeriesItem>
            </ChartSeries>
          </Chart>
        </div>
      </div>
    </div>
    <div class="col col-12 col-md-6 col-lg-6 col-xl-3">
      <BigNumberTwoIdenticalColsNew :title="'Distribution'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfMainItems="[{ title: 'Buyer  Industries', value: '27', tooltip: '' }, { title: 'Buyer Countries', value: '22', tooltip: '' }, { title: 'Buyer Categories', value: '87', tooltip: '' }]" :listOfSecondaryItems="[{ title: 'Suppliers', value: '8', tooltip: '' }, { title: 'Supplier Countries', value: '6', tooltip: '' }, { title: 'Currencies', value: '3', tooltip: '' }]"></BigNumberTwoIdenticalColsNew>
    </div>
    <div class="col col-12 col-md-6 col-lg-6 col-xl-3">
      <BigNumberTwoColsNew :title="'Sales & Entities'" :big-number-title="'Sales Volume'" :big-number-value="'1.3b'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[{ title: 'Parents', value: '225', tooltip: '' }, { title: 'Buyers', value: '293', tooltip: '' }, { title: 'Sales Lines', value: '400', tooltip: '' }]"></BigNumberTwoColsNew>
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
      <MetricsComponentNew3 class="w-100" :section="'analyze'" :key="keyMetricsComponent">
        <template v-slot:slotHeader>
          <div class="row w-100 d-flex justify-content-between p-5">
            <div class="text-base font-bold">Chart</div>
            <p class="btn-extension" @click="isFullScreenSecondaryChart = true">
              <button class="btn btn-simple btn-icon link link--icon"><em class="fa-solid fa-up-right-and-down-left-from-center text-sm"></em></button>
            </p>
          </div>
        </template>
      </MetricsComponentNew3>
    </div>
  </div>
  <div class="row mt-3">
    <div class="w-100 col-md-12">
      <OverviewLocationNew :data="countriesMap" :metric-selected="metricSelectionMetricSelected" :from-value-proposition="false"></OverviewLocationNew>
    </div>
  </div>
  <div class="overlay-vp-editor" v-if="editionMode">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
      <div class="d-flex gap-2">
        <div class="icon-subcomponent" @click="showModal" :title="'Edit Content'"><i class="fa-solid fa-pencil text-sm" :title="'Edit Content'"></i></div>
        <div class="icon-subcomponent" @click="onOverlayAction('delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
        <div class="icon-subcomponent" v-if="objData.visibility" :title="'Hide Content'" @click="onOverlayAction('showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"></i></div>
        <div class="icon-subcomponent" v-if="!objData.visibility" :title="'Show Content'" @click="onOverlayAction('showOrHide')"><i class="fa-solid fa-eye text-base" :title="'Show Content'"></i></div>
      </div>
    </Tooltip>
  </div>
</div>
</template>
<script lang='ts'>
import { onBeforeRouteLeave } from 'vue-router'
import { toRefs, reactive, computed, onMounted, defineComponent, watch, ComputedRef, ref } from 'vue'
import { translate } from '@/utils/translation'
import { useHomeStore } from '@/stores/home'
import { useAppStore } from '@/stores/app'
import { useNegotiationStatusStore } from '@/stores/negotiationStatus'
import { usePlanStore } from '@/stores/plan'
import { useNotificationsStore } from '@/stores/notifications'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useEntityCardStore } from '@/stores/entityCard'
import { useOverviewStore } from '@/stores/overview'
import { CalculumLayout } from '@ada/design-system'

//- Utils
import { StringUtils, NumberUtils } from '@/utils'
import { getNumberWithDecimals } from '@/utils/FormatData';
import useEntity from '@/modules/home/entityCard/composables/useEntity'

//- Interfaces
import { DataInterface, recentNotification } from '@/types/homeView';
import { Match, ProgramSpendInfo } from '@/types';
import HomeProgramStatusDropdown from '@/modules/home/components/HomeProgramStatusDropdown.vue'
import * as formatData from '@/utils/FormatData'

//- Components
import GeneralGaugeBar from '@/modules/components/GeneralGaugeBar.vue'
import PlanSummary from '@/modules/home/components/PlanSummary.vue'
import BigNumberTwoColsNew from '@/modules/components/cards/BigNumberTwoColsNew.vue'
import BigNumberTwoIdenticalColsNew from '@/modules/components/cards/BigNumberTwoIdenticalColsNew.vue'
import StatusesCardsScroll from '@/modules/home/manageModule/components/StatusesCardsScroll.vue'
import NoDataAvailable from '@/modules/components/NoDataAvailable.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import NotesScroll from '@/modules/home/components/NotesScroll.vue'
import RecentNotification from '@/modules/home/components/RecentNotification.vue'
import SkeletonScrollCards from '@/modules/home/components/skeletons/SkeletonScrollCards.vue'
import OverviewLocationNew from '@/modules/home/overview/components/OverviewLocationNew.vue';
import MetricsComponentNew from '@/modules/components/metrics/MetricsComponentsNew.vue';
import MetricsComponentNew3 from '@/modules/components/metrics/MetricsComponentsNew3.vue';
import { CalculumFullScreen } from "@ada/design-system";
import BarsWrapperNew from '@/modules/components/BarsWrapperNew.vue';
import SwitcherBase from '@/modules/components/switcher/SwitcherBase.vue'



// Kendo
import { Skeleton } from '@progress/kendo-vue-indicators';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import {
  Chart,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartTooltip,
  ChartLegend,
} from '@progress/kendo-vue-charts';

/** Composables */
import useFirebase from "@/composables/firebase/useFirebase";
import useSpendFile from "@/composables/useSpendFile";
import useProgramList from "@/composables/useProgramList";
import { useUser, useModulePlan } from "@/composables";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { shouldShowErrorToasts } from "@/utils/axios";
import { useUserStore } from '@/stores/user'
import { useSubscribeStore } from '@/stores/subscribe'


export default defineComponent({
  name: 'ReceivablesMockup1',
  components: { SwitcherBase, CalculumLayout, GeneralGaugeBar, HomeProgramStatusDropdown, BigNumberTwoIdenticalColsNew, BigNumberTwoColsNew, StatusesCardsScroll, NoDataAvailable, CalculumTooltipIcon, PlanSummary, CalculumModal, Skeleton, NotesScroll, RecentNotification, SkeletonScrollCards, OverviewLocationNew, Tooltip, MetricsComponentNew, MetricsComponentNew3, CalculumFullScreen, BarsWrapperNew, Chart, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem, ChartValueAxis, ChartValueAxisItem, ChartTooltip, ChartLegend },
  props: {
    resetStorage: { type: String, default: '0', requied: false },
    editionMode: { type: Boolean, required: false, default: false }
  },
  emits: ['change-content'],
  setup(props, { emit }) {
    const homeStore = useHomeStore()
    const appStore = useAppStore()
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()
    const entityCardStore = useEntityCardStore()
    const overviewStore = useOverviewStore()
    const subscribeStore = useSubscribeStore()
    const planStore = usePlanStore()
    const notificationsStore = useNotificationsStore()
    const negotiationStatusStore = useNegotiationStatusStore()
    const toast = useToast();
    const { spendFileVersionActiveId, showOpportunityExpectedOpportunity } = useSpendFile()
    const { setSelectedProgramValues, setProgramsToDropdown } = useProgramList()
    const { entitySelectedTrackingNumber } = useEntity()
    const { user, userId, userIri, useFeatureEntityCardNewsletter } = useUser();
    const { apolloClientResetStore, isResetting } = useApolloClient();
    const userStore = useUserStore()

    let setGlobalFilter = formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied)

    const currentTab = ref('Overview')
    const currentLocationTab = ref('Geography')
    const isFullScreenFirstChart = ref(false);
    const isFullScreenSecondaryChart = ref(false);
    const spendVolumeCategories = ref(['2.3b', '2.1b', '1.9b', '1.7b', '1.5b', '1.3b', '1.1b', '0.9b', '0.7b', '0.5b', '0.3b', '0.1b']);
    const suppliersSeriesPrimary = ref([6200, 5650, 4600, 3200, null, null, null, null, null, null, null, null]);
    const suppliersSeriesSecondary = ref([6200, 5650, 4600, 3200, 2200, 1700, 1200, 1050, 900, 750, 600, 450]);
    const yAxisLabelsContent = (e: { value: number }) => {
      if (e.value === 0) {
        return '0';
      }

      if (Math.abs(e.value) >= 1000) {
        return `${Math.round(e.value / 1000)}k`;
      }

      return `${e.value}`;
    };
    const metricSelectionMetricSelected = ref<Match.Metric>('spendVolume')
    const matchData = ref<Match.MatchAPIResponse | null>(null)
    const countriesMap: ComputedRef<Match.CountriesMap> = computed(() => ({
      suppliers: matchData.value?.countriesMap?.suppliers ?? [],
      buyers: matchData.value?.countriesMap?.buyers ?? []
    }))
    const objData = reactive({ visibility: true })

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
      programPaymentTermsLoading: true
    })


    const {
      modulePlanIsAvailable,
    } = useModulePlan();


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
            data.programPaymentTermsLoading = false
            data.loadingPrograms = false
            return
          }

          data.dropdownProgramValues = setProgramsToDropdown(response)

          if (data.dropdownProgramValues.programsList && data.dropdownProgramValues.programsList.length >= 2) {
            data.homeDashboardWithPrograms = true //to add a extra class to the dashboard
            data.keyLayout++
          }

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

    async function getOverviewMapData() {
      try {
        const response = await new Promise<Match.MatchAPIResponse>((resolve, reject) => {
          overviewStore.matchDataAPIReadAll({
            spendVersion: spendFileVersionActiveId.value,
            callbackSuccess: resolve,
            callbackError: reject
          })
        })

        matchData.value = response
      } catch (error) {
        matchData.value = null
      }
    }

    async function onSelect(e: any) {
      await apolloClientResetStore();
      if (!isResetting.value) {
        data.selectedTabIndex = e;
        homeStore.setEntityLevelTabSelected(data.selectedTabIndex);
        data.keyScroll++;
      }
    }


    /** Fn to emit */

    async function changeProgram(programID: any) {
      const programInList = data.dropdownProgramValues.programsList.find(
        (x: any) => StringUtils.removeIRI(x['@id']) === StringUtils.removeIRI(programID)
      );

      if (!programInList) return;

      data.programValues.selectedProgramId = StringUtils.removeIRI(programID);
      entityCardStore.setSelectedProgram(data.programValues.selectedProgramId);
      

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
      data.programPaymentTermsLoading = true
      data.programPaymentTerms = { contractual: null, current: null, expected: null, proposed: null, paymentCycleFloat: 0, expectedFloat: null }
      getProgramPaymentTerms()
      getOverviewMapData()
    }


    /** Computed */

    const blockProgramOptions = computed(() => {
      return data.programValues.recalculationInProgress || data.programValues.pendingRecalculation
    })

    const labelForRecalculatingStatus = computed(() => {
      if (data.programValues.recalculationInProgress) {
        return translate.t('global.programInrecalculation')
      }
      if (data.programValues.pendingRecalculation) {
        return translate.t('global.pendingRecalculation')
      }
      return null
    })

    const contractualValueComputed = computed(() => {
      return typeof data.programPaymentTerms?.contractual === 'number' ? Number(data.programPaymentTerms.contractual) : null
    })

    const actualValueComputed = computed(() => {
      return typeof data.programPaymentTerms?.current === 'number' ? Number(data.programPaymentTerms.current) : null
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
      getOverviewMapData()
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

    const dataNotificationMessages: ComputedRef<recentNotification | null> = computed(() => {
      let otherNotification = notificationsStore.getMessages

      if (!otherNotification || otherNotification.length === 0) {
        return null
      }

      const getReleaseNotification = otherNotification.filter((item: any) => item.originType === "NEW_RELEASE_ADA_PLATFORM")

      if (getReleaseNotification) {
        return getReleaseNotification[0]
      }

      return null
    });


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

    function showModal() {
      emit('change-content', objData, null, 'edit')
    }

    function onOverlayAction(action: 'delete' | 'showOrHide') {
      if (action === 'showOrHide') {
        objData.visibility = !objData.visibility
      }
      emit('change-content', objData, null, action)
    }

    return {
      ...toRefs(data),
      StringUtils,
      getNumberWithDecimals,
      onSelect,
      changeProgram,
      blockProgramOptions,
      labelForRecalculatingStatus,
      dataNotificationMessages,
      isResetting,
      formatData,
      currentTab,
      currentLocationTab,
      changeTab,
      useFeatureEntityCardNewsletter,
      modulePlanIsAvailable,
      spendVolumeCategories,
      suppliersSeriesPrimary,
      suppliersSeriesSecondary,
      yAxisLabelsContent,
      metricSelectionMetricSelected,
      countriesMap,
      contractualValueComputed,
      actualValueComputed,
      getPaymentCycleFloatValue,
      getExpectedFloat,
      showOpportunityExpectedOpportunity,
      isFullScreenFirstChart,
      isFullScreenSecondaryChart,
      objData,
      showModal,
      onOverlayAction
    }
  }

})
</script>

<style lang='scss' scoped>

@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

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
    padding: 1.25rem;
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

.sales-distribution-chart {
  height: 19rem;
}

.btn {
  font-size: 14px !important;
}

</style>
