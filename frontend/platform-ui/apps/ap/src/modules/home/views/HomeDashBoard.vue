<template>
  <CalculumModal
    v-if="showModalPlanSummary"
    :size="'xl'"
    :show-close="true"
    :title="$t('home.homePage.planSummary')"
    @close="showModalPlanSummary = false"
  >
    <template #modalContent>
      <PlanSummary
        :key="keyPlansummary"
        :summary-data="planSummary"
        :show-skeleton="false"
        :active-skeleton="false"
      />
    </template>
  </CalculumModal>

  <CalculumLayout
    :key="keyLayout"
    :container-class="'home-dashboard'"
    :extra-container-class="homeDashboardWithPrograms ? 'home-dashboard-with-programs' : undefined"
  >
    <template #slotTop>
      <div class="row">
        <div class="col-12 d-flex align-items-center" :class="{'justify-content-between': useFeatureEntityCardNewsletter || showWorkingCapitalTab, 'justify-content-end': !useFeatureEntityCardNewsletter && !showWorkingCapitalTab}">
          <div
            v-if="useFeatureEntityCardNewsletter || showWorkingCapitalTab"
            class="d-flex align-items-center ml-2"
          >
            <a
              v-for="(tab, index) in tabs"
              :key="tab.key"
              class="btn font-md text-capitalize custom-padding-btn"
              :class="[
                currentTab === tab.key ? 'btn-clear' : 'btn-clean',
                index > 0 ? 'rounded-tbl-none' : '',
                index < tabs.length - 1 ? 'rounded-tbr-none' : '',
              ]"
              @click="changeTab(tab.key)"
            >{{ $t(tab.label) }}</a>
          </div>

          <div class="d-flex align-items-center">
            <span class="header-title text-2xl font-semibold">{{ `${username}'s Dashboard` }}</span>
          </div>
        </div>
      </div>
      <div
        v-if="currentTab === 'Dashboard'"
        class="row"
      >
        <div class="col-8"></div>
        <div class="col-4">
          <div class="d-flex home-dashboard-aligment-dropdown">
            <HomeProgramStatusDropdown
              :key="'program-dropdown-' + key"
              class="mr-2"
              :list-options="dropdownProgramValues.programsList"
              :selected-program-uri="programValues.selectedProgramId"
              :width-dropdown-percent="'60%'"
              @select-program-dropdown="changeProgram"
            />
          </div>
        </div>
      </div>
    </template>
    <template #slotContent>
      <div class="sub-main-sections">
        <!-- Top sections regarding the program -->
        <KeepAlive>
          <EntityCardNews
            v-if="currentTab === 'News'"
            :entity-name="''"
            :module-name="'homeDashboard'"
          />
        </KeepAlive>
        <WorkingCapitalDashboard v-if="currentTab === 'WorkingCapital'" />
        <div
          v-if="currentTab === 'Dashboard'"
          class="d-flex flex-column"
        >
          <div class="row">
            <div class="col col-sm-12 col-md-6 col-lg-6 col-xl-3 first-gauge-card">
              <div class="card home-card-height shadow-none">
                <div class="card-body d-flex flex-column justify-content-between">
                  <div class="d-flex flex-column">
                    <h5 class="text-base font-bold gauge-title">{{ $t('home.homePage.paymentTermsProgress') }}
                      <CalculumTooltipIcon
                        :info-text="$t('global.paymentTermsProgressTooltip')"
                        :advanced-tooltip-class="false"
                        :options="{ placement: 'right', trigger: 'hover', container: 'body', offset: '0, 8', boundary: 'viewport', fallbackPlacements: ['right', 'bottom', 'top', 'left'] }"
                      />
                    </h5>
                    <GeneralGaugeBar
                      :key="keyGauge1"
                      :result="Number(StringUtils.formatBigNumbers(agreedInfo.start))"
                      :target="StringUtils.formatBigNumbers(agreedInfo.end)"
                      :percentage="agreedInfo.percentage"
                      :middle-number="StringUtils.formatBigNumbers(agreedInfo.agreed, {minimumFractionDigits: 0, maximumFractionDigits: 0})"
                      :show-skeleton="loadingGaugeInfoPaymentTerms"
                      :active-skeleton="programValues.recalculationInProgress"
                      :start-title="$t('global.contractual')"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="col col-sm-12 col-md-6 col-lg-6 col-xl-3">
              <div class="card home-card-height shadow-none">
                <div class="card-body d-flex flex-column justify-content-between">
                  <div class="d-flex flex-column">
                    <h5 class="text-base font-bold gauge-title">{{ $t('home.homePage.cashFlowAchieved') }}
                      <CalculumTooltipIcon
                        :info-text="$t('global.cashFlowAchievedTooltipHome')"
                        :advanced-tooltip-class="false"
                      />
                    </h5>
                    <GeneralGaugeBar
                      :key="keyGauge2"
                      :result="0"
                      :target="StringUtils.formatBigNumbers(cashFlowAchieved.end)"
                      :percentage="cashFlowAchieved.percentage"
                      :middle-number="StringUtils.formatBigNumbers(cashFlowAchieved.agreed)"
                      :show-skeleton="loadingGaugeInfocashFlowAchieved"
                      :active-skeleton="programValues.recalculationInProgress"
                      :start-title="$t('global.initial')"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="col col-sm-12 col-md-6 col-lg-6 col-xl-3">
              <div class="card home-card-height shadow-none">
                <div class="card-body d-flex flex-column justify-content-between">
                  <div class="d-flex flex-column">
                    <h5 class="text-base font-bold gauge-title">{{ $t('home.homePage.numbersOfSuppliersNegotiated') }}
                      <CalculumTooltipIcon
                        :info-text="$t('global.numbersofSuppliersNegotiatedTooltip')"
                        :advanced-tooltip-class="false"
                      />
                    </h5>
                    <GeneralGaugeBar
                      :key="keyGauge3"
                      :result="0"
                      :target="getNumberWithDecimals(suppliersNegotiated.end, 0)"
                      :percentage="suppliersNegotiated.percentage"
                      :middle-number="StringUtils.formatBigNumbers(suppliersNegotiated.negotiated, {minimumFractionDigits: 0, maximumFractionDigits: 0})"
                      :show-skeleton="loadingGaugesuppliersNegotiated"
                      :active-skeleton="false"
                      :start-title="$t('global.initial')"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="col col-sm-12 col-md-6 col-lg-6 col-xl-3">
              <BigNumberThreeCols
                :title="$t('home.analyze.analyzeProgramOverview.spendEntities')"
                :tooltip-text="$t('home.analyze.analyzeProgramOverview.spendEntitiesTooltip')"
                :big-number-title="$t('home.analyze.analyzeProgramOverview.spendVolume')"
                :big-number-value="programSpendInfo ? (programSpendInfo.totalSpend ? StringUtils.formatBigNumbers(programSpendInfo.totalSpend) : '0') : '0'"
                :number-left-title="$t('global.ultimateParents')"
                :number-left-value="getNumberWithDecimals(programSpendInfo?.ultimateParentCount, 0) ?? 0"
                :number-center-title="$t('global.defaultEntities')"
                :number-center-value="getNumberWithDecimals(programSpendInfo?.supplierCount, 0) ?? 0"
                :number-right-title="$t('home.analyze.table.alias')"
                :number-right-value="getNumberWithDecimals(programSpendInfo?.spendCount, 0) ?? 0"
                :is-loading="loadingSuppliersNegotiated"
                :show-skeleton="loadingSuppliersNegotiated"
                :advanced-tooltip-class="true"
                :unique-identifier="'program-spend-n-entities'"
                :key-pop-over="'programSpendNEntities'"
                :add-class="true"
              />
            </div>
          </div>

          <!-- Middle sections -->
          <div class="row">
            <!-- Plan summary -->
            <div
              v-if="modulePlanIsAvailable"
              class="col col-sm-12 col-md-12 col-lg-6 col-xl-8"
            >
              <div class="card card-home-plan show-scroll shadow-none">
                <div class="card-body d-flex flex-column">
                  <h5 class="text-base font-bold mb-2 home-title-section">{{ $t('home.homePage.planSummary') }}
                    <CalculumTooltipIcon
                        :info-text="$t('global.planSummaryTooltip')"
                        :advanced-tooltip-class="false"
                        :unique-identifier="'plan-summary-home'"
                        :key-pop-over="'planSummaryHome'"
                    />
                    <p
                      v-if="planSummary && planSummary.length > 1"
                      class="btn-extension"
                      @click="showModalPlanSummary = true"
                    >
                      <button class="btn btn-simple btn-icon link link--icon">
                        <i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i>
                      </button>
                    </p>
                  </h5>
                  <PlanSummary
                    :key="keyPlansummary"
                    :summary-data="planSummary"
                    :show-skeleton="loadingPlanSummary"
                    :active-skeleton="programValues.recalculationInProgress"
                  />
                </div>
              </div>
            </div>

            <!-- Notifications card -->
            <div class="col col-sm-12 col-md-12 col-lg-6" :class="{ 'col-xl-4': modulePlanIsAvailable, 'col-xl-8': !modulePlanIsAvailable }">
              <div class="card card-home-plan shadow-none card-home-plan-no-scroll">
                <div class="d-flex flex-column">
                  <h5 class="text-base font-bold mb-2 home-title-section">{{ $t('home.homePage.recentNotifications') }}
                    <CalculumTooltipIcon
                      :info-text="$t('global.recentNotificationsTooltip')"
                      :advanced-tooltip-class="false"
                      :unique-identifier="'recent-notifications-home'"
                      :key-pop-over="'recentNotificationsHome'"
                    />
                  </h5>
                  <RecentNotification :notification="dataNotificationMessages" />
                </div>
              </div>
            </div>
          </div>

          <!-- 3 scroll sections at bottom section -->
          <div class="row">
            <div class="col col-sm-12 col-md-12 col-lg-6 col-xl-4">

              <!-- Top opportunities regarding the program -->
              <div class="card shadow-none">
                <div class="card-body d-flex flex-column">
                  <h5 class="text-base font-bold mb-2 home-title-section">{{ $t('home.homePage.topOpportunities') }}
                    <CalculumTooltipIcon
                      :info-text="$t('global.topOpportunitiesTooltip')"
                      :advanced-tooltip-class="false"
                      :unique-identifier="'top-opportunities-home'"
                      :key-pop-over="'topOpportunitiesHome'"
                    />
                  </h5>
                  <div
                    v-if="loadingPrograms"
                    class="d flex flex-column w-100"
                  >
                    <SkeletonScrollCards />
                  </div>

                  <div
                    v-else-if="programValues.recalculationInProgress && !loadingPrograms || programValues.selectedProgramId === null"
                    class="d-flex"
                  >
                    <NoDataAvailable :icon="'icon-categorize'" :message="programValues.selectedProgramId ? $t('home.homePage.topOpportunitiesProgramRecalculating') : $t('home.homePage.topOpportunitiesProgramNone')" />
                  </div>

                  <div
                    v-else
                    class="d-flex flex-column"
                  >
                    <StatusesCardsScroll
                      :key="keyScroll"
                      :hide-agreed-terms="true"
                      :levelof-grid="selectedTabIndex"
                      :search-value="''"
                      :selected-program-id="programValues.selectedProgramId"
                      :negotiation-status="''"
                      :set-sorting="'targetDesc'"
                      :show-teams="false"
                      :show-tabs="true"
                      @select-tab="onSelect"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent changes regarding the program -->
            <div class="col col-sm-12 col-md-12 col-lg-6 col-xl-4">
              <div class="card shadow-none">
                <div class="card-body d-flex flex-column">
                  <h5 class="text-base font-bold mb-2 home-title-section">{{ $t('home.homePage.recentChanges') }}
                    <CalculumTooltipIcon
                      :info-text="$t('global.recentChangesTooltip')"
                      :advanced-tooltip-class="false"
                      :unique-identifier="'recent-changes-home'"
                      :key-pop-over="'recentChangesHome'"
                    />
                  </h5>

                  <div
                    v-if="loadingPrograms"
                    class="d flex flex-column w-100"
                  >
                    <SkeletonScrollCards />
                  </div>

                  <div
                    v-else-if="programValues.recalculationInProgress && !loadingPrograms || programValues.selectedProgramId === null"
                    class="d-flex"
                  >
                    <NoDataAvailable :icon="'icon-categorize'" :message="programValues.selectedProgramId ? $t('home.homePage.topOpportunitiesProgramRecalculating') : $t('home.homePage.topOpportunitiesProgramNone')" />
                  </div>

                  <div
                    v-else
                    class="d-flex flex-column"
                  >
                    <StatusesCardsScroll
                      :key="keyScrollRecentchanges"
                      :levelof-grid="1"
                      :search-value="''"
                      :selected-program-id="programValues.selectedProgramId"
                      :negotiation-status="''"
                      :set-sorting="'negotiationStatusUpdatedAt'"
                      :show-teams="false"
                      :show-extra-data="true"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes scroll -->
            <div class="col col-sm-12 col-md-12 col-lg-6 col-xl-4">
              <div class="card shadow-none">
                <div class="card-body d-flex flex-column">
                  <h5 class="text-base font-bold mb-2 home-title-section">{{ $t('home.homePage.recentNotes') }}
                    <CalculumTooltipIcon
                      :info-text="$t('global.recentNotesTooltip')"
                      :advanced-tooltip-class="false"
                      :unique-identifier="'recent-notes-home'"
                      :key-pop-over="'recentNotesHome'"
                    />
                  </h5>
                  <div
                    v-if="areNotesLoading"
                    class="d flex flex-column w-100"
                  >
                    <SkeletonScrollCards />
                  </div>
                  <div
                    v-else
                    class="d-flex w-100"
                  >
                    <NotesScroll :summary-data="notesSummary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </CalculumLayout>
</template>
<script lang='ts'>
import { onBeforeRouteLeave } from 'vue-router'
import { toRefs, reactive, computed, onMounted, defineComponent, watch, watchEffect, ComputedRef, ref } from 'vue'
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
import { StringUtils } from '@/utils'
import useEntity from '@/modules/home/entityCard/composables/useEntity'

//- Interfaces
import { DataInterface, recentNotification } from '@/types/homeView';
import { ProgramSpendInfo } from '@/types';
import HomeProgramStatusDropdown from '@/modules/home/components/HomeProgramStatusDropdown.vue'
import { convertFiltersToREST,getNumberWithDecimals } from '@/utils/FormatData'
import { getCashFlowAchieved } from '@/modules/home/views/cashFlowAchieved'

//- Components
import GeneralGaugeBar from '@/modules/components/GeneralGaugeBar.vue'
import PlanSummary from '@/modules/home/components/PlanSummary.vue'
import BigNumberThreeCols from '@/modules/components/cards/BigNumberThreeCols.vue'
import StatusesCardsScroll from '@/modules/home/manageModule/components/StatusesCardsScroll.vue'
import NoDataAvailable from '@/modules/components/NoDataAvailable.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import WorkingCapitalDashboard from '@/modules/home/workingCapital/views/WorkingCapitalDashboard.vue'
import NotesScroll from '@/modules/home/components/NotesScroll.vue'
import RecentNotification from '@/modules/home/components/RecentNotification.vue'
import SkeletonScrollCards from '@/modules/home/components/skeletons/SkeletonScrollCards.vue'
import EntityCardNews from "@/modules/home/entityCard/views/EntityCardNews.vue";



// Kendo


/** Composables */
import useFirebase from "@/composables/firebase/useFirebase";
import useSpendFile from "@/composables/useSpendFile";
import useProgramList from "@/composables/useProgramList";
import { useUser, useModulePlan, useCompany } from "@/composables";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { shouldShowErrorToasts } from "@/utils/axios";
import { useUserStore } from '@/stores/user'
import { useSubscribeStore } from '@/stores/subscribe'
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: 'HomeDashBoard',
  components: { CalculumLayout, GeneralGaugeBar, HomeProgramStatusDropdown, BigNumberThreeCols, StatusesCardsScroll, NoDataAvailable, CalculumTooltipIcon, PlanSummary, CalculumModal, NotesScroll, RecentNotification, SkeletonScrollCards, EntityCardNews, WorkingCapitalDashboard },
  props: {
    resetStorage: { type: String, default: '0', requied: false }
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
    const { spendFileVersionActiveId, spendFileVersionActive } = useSpendFile()
    const { setSelectedProgramValues, setProgramsToDropdown } = useProgramList()
    const { entitySelectedTrackingNumber } = useEntity()
    const { user, userId, userIri, useFeatureEntityCardNewsletter } = useUser();
    const { apolloClientResetStore, isResetting } = useApolloClient();
    const userStore = useUserStore()
    const { companyActiveSpendFileVersions } = useCompany()

    let setGlobalFilter = convertFiltersToREST(globalFiltersStore.getFiltersApplied)

    // Initialize from the store, not a hardcoded default: HomeBackend.vue's
    // v-if="!getGlobalLoading" unmounts/remounts this whole view on every
    // platform-level currency/spend-file switch, which would otherwise reset a
    // plain ref('Dashboard') and silently kick the user out of whichever tab
    // they were on. homeStore.currentDashboardTab survives that remount.
    const currentTab = ref(homeStore.getCurrentDashboardTab)

    // Coarse pre-check: is there at least one other spend-file-version entry for this
    // company besides the active one? Kept alongside the backend-authoritative flag
    // below (ANDed) rather than replaced by it.
    //
    // Backend-authoritative: WorkingCapitalComparisonService::resolveBaseCandidates(),
    // hydrated on every /me call (see Back-End's UserDataProvider) — accounts for
    // cross-file eligibility and visibility, which the coarse check above can't. Treat
    // "not confirmed empty" (undefined — an older cached session predating this field)
    // as "not empty" for this half of the check.
    const showWorkingCapitalTab = computed(() =>
      companyActiveSpendFileVersions.value.length >= 2
      && spendFileVersionActive.value?.workingCapitalEmpty !== true
    )

    // Catches both a live eligibility change and a stale persisted 'WorkingCapital'
    // tab surviving the spend-file-switch remount (HomeBackend.vue's loading gate) —
    // watchEffect runs immediately, so no separate { immediate: true } is needed.
    watchEffect(() => {
      if (!showWorkingCapitalTab.value && currentTab.value === 'WorkingCapital') {
        changeTab('Dashboard')
      }
    })

    // Single source of truth for the tab bar. Position-based rounding (squared
    // where two visible tabs sit adjacent, rounded only at the outer edges of
    // whichever tabs are actually showing) replaces three near-duplicate <a>
    // blocks that each manually cross-referenced the OTHER tabs' visibility flags.
    const tabs = computed(() => (
      [
        { key: 'Dashboard', label: 'home.homePage.tabs.dashboard', visible: true },
        { key: 'WorkingCapital', label: 'home.homePage.tabs.achievement', visible: showWorkingCapitalTab.value },
        { key: 'News', label: 'home.homePage.tabs.news', visible: useFeatureEntityCardNewsletter.value },

      ].filter(tab => tab.visible)
    ))

    const { t: translate } = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const data = reactive<DataInterface>({
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
            toast.error(translate('error.server500'))
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
              Object.assign(data.cashFlowAchieved, getCashFlowAchieved(response.statusesInfo ?? []))
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
            toast.error(translate('error.server500'))
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
            toast.error(translate('error.server500'))
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
    }


    /** Computed */

    const blockProgramOptions = computed(() => {
      return data.programValues.recalculationInProgress || data.programValues.pendingRecalculation
    })

    const labelForRecalculatingStatus = computed(() => {
      if (data.programValues.recalculationInProgress) {
        return translate('global.programInrecalculation')
      }
      if (data.programValues.pendingRecalculation) {
        return translate('global.pendingRecalculation')
      }
      return null
    })


    watch(entitySelectedTrackingNumber, async () => {
      await apolloClientResetStore();
      if (!isResetting.value) {
        reactiveFnsByProgram();
        data.keyScroll++;
        data.keyScrollRecentchanges++;
      }
    });

    watch(
      () => subscribeStore.refreshPrograms,
      async (newValue, oldValue) => {
        if (newValue === 'ready') {
          await apolloClientResetStore();
          initialCalls()
        }
      }
    );


    onMounted(() => {
      userStore.setLastSectionVisitedbyUser('home')
      initialCalls()

      if (props.resetStorage !== '0') {
        clearAllVuex()
      }

      setBrowserTitlebyTab()
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
      const filters = globalFiltersStore.getFiltersApplied;
      return convertFiltersToREST(filters);
    });

    watch(globalFiltersData, (newValue) => {
      /**
       * RACE CONDITION GUARD — watch(globalFiltersData)
       *
       * cleanupBeforeCompanyChange() resets filtersApplied to [] before the company
       * API calls complete. This triggers this watcher while selectedProgramId and
       * activeSpendFileVersion may still belong to different companies.
       *
       * Calling reactiveFnsByProgram() during this window fires API calls with mismatched
       * context → HTTP 500.
       *
       * See: docs/context/race-condition-company-change.md
       */
      if (globalFiltersStore.getDisableWatchers) {
        return;
      }
      setGlobalFilter = newValue;
      reactiveFnsByProgram();
      data.keyScroll++;
      data.keyScrollRecentchanges++;
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
      homeStore.setCurrentDashboardTab(tab)
      setBrowserTitlebyTab()
    }

    function setBrowserTitlebyTab() {


      let title = 'Home'

      switch(currentTab.value) {

        case 'Dashboard':
          title+= " - Dashboard"
          break;

        case 'News':
          title+= " - News"
          break;

        case 'WorkingCapital':
          title+= " - Working Capital Improvement"
          break;

          default:
          break;

      }

      document.title = title

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
      currentTab,
      changeTab,
      useFeatureEntityCardNewsletter,
      modulePlanIsAvailable,
      showWorkingCapitalTab,
      tabs,
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

</style>
