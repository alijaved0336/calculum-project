<template>
<div class="row">
  <div class="col col-6">
    <div class="card home-card-height shadow-none d-flex flex-row col-12">
      <div class="col col-6 d-flex">
        <div class="col col-12 px-0">
          <div class="card d-flex card--inner set-height shadow-none">
            <div class="card-body d-flex flex-column justify-content-between px-0 rating">
              <div class="row mb-4">
                <div class="col-12 d-flex align-items-top">
                  <h5 class="text-base font-bold d-flex gap-2" style="min-height: 1.5em;"><span>Company Credit Rating</span>
                    <CalculumTooltipIconNew :infoText="'Company Credit Rating'"></CalculumTooltipIconNew>
                  </h5>
                </div>
              </div>
              <div class="row d-flex justify-content-between align-items-stretch" style="flex: 1;">
                <div class="col-4 d-flex flex-column px-1 justify-content-start gap-2">
                  <div class="rating__big-box">
                    <p class="mb-0 mx-auto font-semibold text-5xl">AA-</p>
                  </div>
                </div>
                <div class="col-8 d-flex flex-column px-1 justify-content-start gap-2">
                  <div class="rating__content-list">
                    <div class="rating__content-item">
                      <div class="rating__content-item-header">
                        <div class="text-sm d-flex text-gray-500"><span>Rating Description</span></div>
                        <CalculumTooltipIconNew :infoText="'Company Credit Rating'"></CalculumTooltipIconNew>
                      </div>
                      <div class="rating__content-item-main">
                        <p class="text-3xl font-semibold mb-0" style="color:#17dfa1">Very Strong</p>
                      </div>
                    </div>
                    <div class="rating__content-item">
                      <div class="rating__content-item-header">
                        <div class="text-sm d-flex text-gray-500"><span>Probability of Default</span></div>
                        <CalculumTooltipIconNew :infoText="'Company Credit Rating'"></CalculumTooltipIconNew>
                      </div>
                      <div class="rating__content-item-main">
                        <p class="text-3xl font-semibold mb-0">0.12%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row mt-5">
                <div class="col-3 rating__footer-item">
                  <div class="rating__footer-item-header">
                    <div class="text-sm d-flex text-gray-500"><span>Source</span></div>
                  </div>
                  <div class="rating__footer-item-main">
                    <div class="text-left text-base font-semibold"><span>Parent</span></div>
                  </div>
                </div>
                <div class="col-6 rating__footer-item">
                  <div class="rating__footer-item-header">
                    <div class="text-sm d-flex text-gray-500"><span>Parent</span></div>
                  </div>
                  <div class="rating__footer-item-main">
                    <div class="text-left text-base font-semibold"><span>Automatic Data Pro...</span></div>
                  </div>
                </div>
                <div class="col-3 d-flex justify-content-between">
                  <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs">Show Details</span>
                    <CalculumTooltipIconNew :infoText="'footer Tooltip'"></CalculumTooltipIconNew>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col col-6 d-flex">
        <div class="col col-12">
          <LineChartCardComponent :isInnerCard="true" :title="'Credit Rating Comparison'" :tooltipText="'tooltip Text'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfItems="[{ title: 'Company', textLabel: 'AA-', percentage: 95, isAccentColor: true },{ title: 'Similar Buyers', textLabel: 'AA', percentage: 90 },{ title: 'Total Sales ', textLabel: 'BBB', percentage: 80 }]" :footerText="'Show details'" :footerTooltip="'footer Tooltip'"></LineChartCardComponent>
        </div>
      </div>
    </div>
  </div>
  <div class="col col--1-5">
    <div class="col col-12 px-0">
      <div class="card home-card-height set-height shadow-none">
        <div class="card-body d-flex flex-column justify-content-between px-2 rating">
          <div class="row">
            <div class="col-12 d-flex align-items-top">
              <h5 class="text-base font-bold d-flex gap-2 mb-0" style="min-height: 1.5em;"><span>Country Rating</span></h5>
            </div>
          </div>
          <div class="row mb-4">
            <div class="col-12 d-flex justify-content-start align-items-center gap-2">
              <div class="country-image-wrapper country-image-wrapper--small"><img :src="entityDetails.supplierCountryFlagUrl" :alt="entityDetails.supplierCountry"/></div>
              <div class="text-sm d-flex text-gray-500"><span>{{ entityDetails.supplierCountry }}</span></div>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="d-flex flex-column px-1 justify-content-center gap-2">
              <div class="rating__big-box rating__big-box--transparent">
                <p class="mb-0 mx-auto font-semibold text-5xl">AA+</p>
              </div>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="d-flex flex-column px-1 justify-content-start gap-2">
              <div class="rating__content-list">
                <div class="rating__content-item">
                  <div class="rating__content-item-main">
                    <p class="text-3xl font-semibold mb-0" style="color:#d8d8d8">Very Strong</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-5">
            <div class="col-6 rating__footer-item">
              <div class="rating__footer-item-header">
                <div class="text-sm d-flex text-gray-500"><span>Source</span></div>
              </div>
              <div class="rating__footer-item-main">
                <div class="text-left text-base font-semibold"><span>External</span></div>
              </div>
            </div>
            <div class="col-6 d-flex justify-content-between">
              <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs">Show Details</span>
                <CalculumTooltipIconNew :infoText="'footer Tooltip'"></CalculumTooltipIconNew>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col col--1-5">
    <div class="col col-12 px-0">
      <div class="card home-card-height set-height shadow-none">
        <div class="card-body d-flex flex-column justify-content-between px-2 rating">
          <div class="row">
            <div class="col-12 d-flex align-items-top">
              <h5 class="text-base font-bold d-flex gap-2 mb-0" style="min-height: 1.5em;"><span>Industry Risk</span></h5>
            </div>
          </div>
          <div class="row mb-4">
            <div class="col-12 d-flex justify-content-start align-items-center gap-2">
              <div class="text-sm d-flex text-gray-500"><span>Management Service</span></div>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="d-flex flex-column px-1 justify-content-center gap-2">
              <div class="rating__big-box rating__big-box--transparent">
                <p class="mb-0 mx-auto font-semibold text-5xl">Low</p>
              </div>
            </div>
          </div>
          <div class="row d-flex justify-content-center align-items-center">
            <div class="d-flex flex-column px-1 justify-content-start gap-2">
              <div class="rating__content-list">
                <div class="rating__content-item">
                  <div class="rating__content-item-main">
                    <p class="text-3xl font-semibold mb-0" style="color:#d8d8d8">Low Risk</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-5">
            <div class="col-6 rating__footer-item">
              <div class="rating__footer-item-header">
                <div class="text-sm d-flex text-gray-500"><span>Source</span></div>
              </div>
              <div class="rating__footer-item-main">
                <div class="text-left text-base font-semibold"><span>External</span></div>
              </div>
            </div>
            <div class="col-6 d-flex justify-content-between">
              <div class="d-flex justify-content-center gap-2 align-items-center"><span class="text-gray-500 text-xs">Show Details</span>
                <CalculumTooltipIconNew :infoText="'footer Tooltip'"></CalculumTooltipIconNew>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col col-12 col-md-6 col-lg-6 col-xl-3 d-flex">
    <DoubleCardComponent :title="'Buyer Financial Metrics'" :tooltipText="'tooltip Text'" :big-number-title="'DPO (days)'" :big-number-value="'67'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[{ title: 'Revenue Growth', value: '2.23%', isBigValue: true, tooltip: '' }]"></DoubleCardComponent>
  </div>
</div>
<div class="row">
  <div class="col col--4-5">
    <div class="card home-card-height shadow-none d-flex flex-row col-12">
      <div class="col-8 d-flex">
        <DoubleCardComponent :isInnerCard="true" :title="'Exposure'" :tooltipText="'tooltip Text'" :big-number-title="'Total Sales'" :big-number-value="'730.2k'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[{ title: 'Outstandings', value: '148.0k', isBigValue: true, tooltip: '' }]" :footer1Text="'Parent: 1.4m'" :footer2Text="'Parent: 345.7k'"></DoubleCardComponent>
      </div>
      <div class="col-4 d-flex">
        <DoubleCardComponent :isInnerCard="true" :title="' '" :tooltipText="''" :big-number-title="'% of Outstandings/Sales'" :big-number-value="'0.01%'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[]" :footer1Text="'Parent: 0.04%'"></DoubleCardComponent>
      </div>
    </div>
  </div>
  <div class="col col--7-5">
    <div class="card home-card-height shadow-none d-flex flex-row col-12">
      <div class="col col--04 d-flex">
        <DoubleCardComponent :isInnerCard="true" :title="'Credit Limit'" :tooltipText="''" :big-number-title="'Limit'" :big-number-value="'96.2k'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[{ title: '% Used', value: '0.2%', isBigValue: true, tooltip: '' }]" :footer1Text="'Source: Ada'"></DoubleCardComponent>
      </div>
      <div class="col col--04 d-flex">
        <LineChartCardComponent :isInnerCard="true" :title="'Credit Limit vs Outstandings'" :tooltipText="''" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfItems="[{ title: 'Credit Limit', textLabel: '96.2k', percentage: 70, isAccentColor: true },{ title: 'Outstandings', textLabel: '148.0k', percentage: 90 },{ title: 'Outstandings without Past dues', textLabel: '120.0k', percentage: 80 }]" :footerText="''" :footerTooltip="''"></LineChartCardComponent>
      </div>
      <div class="col col--02 d-flex">
        <div class="card card--auto-height card--inner shadow-none d-flex flex-row col-12">
          <div class="col col-12 d-flex justify-content-center align-items-center gap-2 flex-column"><span class="text-xs font-semibold">Credit Insurance</span>
            <div class="d-flex justify-content-center align-items-center gap-2">
              <div class="insured-image-wrapper"><img class="insured-image" src="@/resources/assets/images/Insured.png" alt="Canada Flag"/></div><span class="text-base font-semibold">Insured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col col-12 col-md-6 col-lg-3 d-flex">
    <DoubleCardComponent :title="'Supplier Leverage'" :tooltipText="'tooltip Text'" :big-number-title="''" :big-number-value="'Low'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[{ title: 'Market Share', value: 'Low', isBigValue: false, tooltip: '' }, { title: 'Category Criticality Factor', value: 'Med', isBigValue: false, tooltip: '' }]"></DoubleCardComponent>
  </div>
  <div class="col col-12 col-md-6 col-lg-3 d-flex">
    <DoubleCardComponent :title="'Buyer Leverage'" :tooltipText="'tooltip Text'" :big-number-title="''" :big-number-value="'Low'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[{ title: '% of Total Sales', value: '0.07%', tooltip: '' }]"></DoubleCardComponent>
  </div>
  <div class="col col-12 col-md-6 col-lg-3 d-flex">
    <DoubleCardComponent :title="'Buyer Financing Rate'" :tooltipText="'tooltip Text'" :big-number-title="''" :big-number-value="'5.78%'" :is-loading="loadingSuppliersNegotiated" :showSkeleton="loadingSuppliersNegotiated" :advancedTooltipClass="true" :uniqueIdentifier="'program-spend-n-entities'" :keyPopOver="'programSpendNEntities'" :addClass="true" :listOfSecondaryItems="[{ title: 'Base Rate', value: '5.12%', tooltip: '' }, { title: 'Cost of Debt (Credit Spread)', value: '0.64%', tooltip: '' }]"></DoubleCardComponent>
  </div>
</div>
</template>
<script lang='ts'>
import { onBeforeRouteLeave } from 'vue-router'
import { toRefs, reactive, computed, onMounted, onUnmounted, defineComponent, watch, ComputedRef, ref } from 'vue'
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
import { CalculumLayout, CalculumLoading } from '@ada/design-system'

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
import DoubleCardComponent from '@/modules/components/cards/DoubleCardComponent.vue'
import LineChartCardComponent from '@/modules/components/cards/LineChartCardComponent.vue'
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
import CalculumTooltipIconNew from "@/modules/components/CalculumTooltipIconNew.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";


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
import * as clickOutsideRelated from '@/utils/clickOutsideRelated'
import iconEllipsisVertical from '@/resources/assets/images/icons/iconEllipsisVertical.vue'


export default defineComponent({
  name: 'ReceivablesMockup5',
  components: { CalculumLayout, GeneralGaugeBar, HomeProgramStatusDropdown, BigNumberTwoIdenticalColsNew,LineChartCardComponent, DoubleCardComponent, StatusesCardsScroll, NoDataAvailable, CalculumTooltipIcon, PlanSummary, CalculumModal, Skeleton, NotesScroll, RecentNotification, SkeletonScrollCards, OverviewLocationNew, Tooltip, MetricsComponentNew, MetricsComponentNew3, CalculumFullScreen, BarsWrapperNew, Chart, ChartSeries, ChartSeriesItem, ChartCategoryAxis, ChartCategoryAxisItem, ChartValueAxis, ChartValueAxisItem, ChartTooltip, ChartLegend, iconEllipsisVertical, CalculumLoading, CalculumTooltipIconNew, SkeletonRectangle, },
  props: {
    resetStorage: { type: String, default: '0', requied: false },
    editionMode: { type: Boolean, required: false, default: false },
    entityDetails: { type: Object, required: true },
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
    const { subscribeToPrograms } = useFirebase();
    const { spendFileVersionActiveId, showOpportunityExpectedOpportunity } = useSpendFile()
    const { setSelectedProgramValues, setProgramsToDropdown } = useProgramList()
    const { entitySelectedTrackingNumber } = useEntity()
    const { user, userId, userIri, useFeatureEntityCardNewsletter } = useUser();
    const { apolloClientResetStore, isResetting } = useApolloClient();
    const userStore = useUserStore()

    let setGlobalFilter = formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied)

    const currentTab = ref('Ratings & Metrics')
    const showOptions = ref(false)
    const isBadgeShowing = ref(false)
    const mockMenuOptions = ref([
      { id: 'view-details', label: 'View details' },
      { id: 'export-csv', label: 'Export CSV' },
      { id: 'share', label: 'Share report' },
      { id: 'archive', label: 'Archive' }
    ])
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
      // data.programValues.recalculationInProgress = programInList.recalculationInProgress;
      // data.programValues.pendingRecalculation = programInList.pendingRecalculation;
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

    function onMockOptionClick(item: { id: string; label: string }) {
      showOptions.value = false
    }

    function handleClick(e: MouseEvent) {
      const clickedInside = clickOutsideRelated.menuPopup(e, '.three-dots-icon', '#options-menu')

      if (clickedInside !== undefined) {
        showOptions.value = clickedInside
      }
    }

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
      document.body.addEventListener('click', handleClick)

      if (props.resetStorage !== '0') {
        clearAllVuex()
      }
    })

    onUnmounted(() => {
      document.body.removeEventListener('click', handleClick)
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
      showOptions,
      isBadgeShowing,
      mockMenuOptions,
      onMockOptionClick,
      changeTab,
      useFeatureEntityCardNewsletter,
      modulePlanIsAvailable,
      yAxisLabelsContent,
      metricSelectionMetricSelected,
      countriesMap,
      contractualValueComputed,
      actualValueComputed,
      getPaymentCycleFloatValue,
      getExpectedFloat,
      showOpportunityExpectedOpportunity,
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

.rating{

  &__big-box{
    width: 100%;
    height: 100%;
    border-radius: 0.5rem;
    background: #f2f4f7;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;

    &--transparent{
      background:transparent;
    }

  }

  &__content-list{
    display: flex;
    flex-direction: column;
    gap:1rem;
    padding-left: 20px;
  }

  &__content-item {
    display: flex;
    flex-direction: column;
    gap:0.25rem;

    &-header{
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1px;
    }
  }

  &__footer-item{
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

  }
}

.insured-image-wrapper{
  width: 2rem;
  min-width: 2rem;
  aspect-ratio: 1/1;
  position: relative;

  .insured-image{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.col{
  &.col--1-5{
    flex: 0 0 12.5%;
    max-width: 12.5%;
  }
  &.col--4-5{
    flex: 0 0 37.5%;
    max-width: 37.5%;
  }
  &.col--7-5{
    flex: 0 0 62.5%;
    max-width: 62.5%;
  }
  &.col--04{
    flex: 0 0 40%;
    max-width: 40%;
  }
  &.col--02{
    flex: 0 0 20%;
    max-width: 20%;
  }
}
.company-image-wrapper,
.country-image-wrapper{
  width: 1.875rem;
  min-width: 1.875rem;
  aspect-ratio: 1/1;
  border-radius: 100vmax;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow:  0 0 0 1px #666;

  &--small{
    width: 1.25rem;
    min-width: 1.25rem;
  }

  img{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.company-image-wrapper{
  width: 3rem;
  min-width: 3rem;
}
.card{
  &.card--auto-height{
    height: auto !important;
    min-height: auto !important;
  }
  &.card--inner{
    border: none;
    box-shadow: none;
    margin: 0;
    min-height: auto !important;
    padding: 0;
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

.options-menu-wrapper {
  position: relative;

  .three-dots-icon {
    max-height: 16px;
  }

  #options-menu.fix-menu {
    position: absolute;
    top: 2rem;
    right: 0;
    min-width: 220px;
    background: $color-white;
    border-radius: 4px;
    z-index: 20;
    padding: 0.25rem 0;
    border: 1px solid $color-gray-300;
  }

  .options-menu-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .options-menu-item {
    padding: 0.5rem 0.875rem;

    &:hover {
      background: $color-gray-100;
    }
  }
}

.sales-distribution-chart {
  height: 19rem;
}

.btn {
  font-size: 14px !important;
}

</style>
