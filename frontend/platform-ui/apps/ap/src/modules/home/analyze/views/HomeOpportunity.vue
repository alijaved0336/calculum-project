<template>
<CalculumLayout :containerClass="'program-section'" :containerId="'program-header-menu'">
  <template v-slot:slotTop>
    <div class="row" v-if="!showContent">
      <div class="col-3 d-flex justify-content-between">
        <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '40%', height: '50px', borderRadius: '8px' }"></Skeleton>
        <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '15%', height: '50px', borderRadius: '8px' }"></Skeleton>
        <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '15%', height: '50px', borderRadius: '8px' }"></Skeleton>
        <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '15%', height: '50px', borderRadius: '8px' }"></Skeleton>
        <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '15%', height: '50px', borderRadius: '8px' }"></Skeleton>
      </div>
      <div class="col-12">
        <div class="row">
          <div class="col-3">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '320px' }"> </Skeleton>
          </div>
          <div class="col-3">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '320px' }"> </Skeleton>
          </div>
          <div class="col-3">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '320px' }"> </Skeleton>
          </div>
          <div class="col-3">
            <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '320px' }"></Skeleton>
          </div>
        </div>
      </div>
    </div>
    <div class="row" v-if="showContent">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex"><a class="btn btn-clean font-md text-capitalize custom-padding-btn mr-2 all-programs-btn" id="allProgramsTab" v-if="dropdownProgramValues.programsList && dropdownProgramValues.programsList.length > 1" @click="goToAllPrograms">{{ $t('global.goToAllPrograms') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none" id="program_overview" :class="currentTab === 'ProgramOverview' || currentTab === 'ReceivablesMockup2' ? 'active' : 'btn-clean'" @click="changeTabOverview()">{{ $t('home.analyze.analyzeProgramOverview.overviewButton') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none rounded-tbl-none custom-fit-btn" id="ninebox_cf" :class="currentTab === 'NineBoxesCF' ? 'active' : 'btn-clean'" @click="changeTab('NineBoxesCF')">{{ setTitleForsupplier }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none rounded-tbr-none" id="program_waterfall" :class="currentTab === 'HomeAnalyzeWaterfall' ? 'active' : 'btn-clean'" @click="changeTab('HomeAnalyzeWaterfall')">{{ $t('home.analyze.analyzeProgramOverview.waterfallButton') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none rounded-tbr-none" id="program_vcard" v-if="vCardEnabled" :class="currentTab === 'HomeAnalyzeVcard' ? 'active' : 'btn-clean'" @click="changeTab('HomeAnalyzeVcard')">{{ $t('home.homeCompanySettings.cardGroups.cardGroupsTitleTab') }}</a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none" id="program_list" :class="currentTab === 'HomeAnalyzeProgramList' ? 'active' : 'btn-clean'" @click="changeTab('HomeAnalyzeProgramList')">{{ $t('home.analyze.analyzeProgramOverview.listButton') }}</a></div>
        <div class="d-flex">
          <HomeProgramStatusDropdown class="mr-6" v-if="!loadingAllPrograms && !loadingSelectedProgram" :listOptions="dropdownProgramValues.programsList" :selectedProgramUri="programValues.selectedProgramId" :widthDropdownPercent="'100%'" :key="keyDropdown" @select-program-dropdown="redirectToSelectedProgram"></HomeProgramStatusDropdown>
          <button class="custom-dropdown edit-btn font-md ml-2" v-if="isAdminUser && currentTab === 'HomeAnalyzeProgramList'" @click="toggleEditMode">{{ textEditMode }}</button>
          <AnalyzeProgramOptions v-if="!spendFileInrecalculation" @change-status="changeActiveStatus" @close-menu-options="keyOptionsProgram++" :program-name="program?.name ?? ''" :selected-program-id="programValues.selectedProgramId" :plans="program?.plans ?? []" :isActive="program?.isActive ?? false" :program-target="program?.programTarget ?? ''" :spendFileVersion="spendFileVersionActiveId" :isBadgeShowing="programOptionsIsBadgeShowing ?? false" :blockProgramOptions="blockProgramOptions" :key="keyOptionsProgram" :programDetails="program ?? undefined"></AnalyzeProgramOptions>
        </div>
      </div>
    </div>
    <div class="row mt-4" v-if="currentTab === 'NineBoxesFinancing' && showTeaserView">
      <div class="col-12 d-flex justify-content-end">
        <Locked></Locked>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections mt-4">
      <KeepAlive>
        <component v-if="showContent" :is="currentTab" :showTeaserView="showTeaserView" :current-tab="currentTab" :selectedProgramId="selectedProgramId" :program-data="program" :force-reload="forceReload" :key="currentTab + keyTabsViews" :inRecalculation="false" :programValues="programValues" :vCardEnabled="vCardEnabled" :editMode="editModeToggle" @change-tab="changeTab"></component>
      </KeepAlive>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">

import { defineComponent, reactive, toRefs, computed, watch, onMounted } from 'vue'

import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useSubscribeStore } from '@/stores/subscribe'
import * as formatData from '@/utils/FormatData'
import { useEntityCardStore } from '@/stores/entityCard'
import * as Routing from '@/services/router/Routing'
import { onBeforeRouteLeave, useRouter } from "vue-router";
import Locked from "@/modules/components/teaser/Locked.vue";
//** Common components */

import { CalculumLayout } from '@ada/design-system'
import HomeProgramStatusDropdown from "@/modules/home/components/HomeProgramStatusDropdown.vue";
import AnalyzeProgramOptions from "@/modules/home/analyze/components/AnalyzeProgramOptions.vue";
import { Skeleton } from "@progress/kendo-vue-indicators";
import { useToast } from "vue-toastification";

//** Compsables */

import useUser from "@/services/user/composables/useUser";
import useSpendFile from "@/composables/useSpendFile";
import useProgramList from "@/composables/useProgramList";
import useCompany from "@/composables/useCompany";
import useApolloClient from "@/services/graphql/useApolloClient";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import { useAnalyzeStore } from "@/stores/analyze";

/** Utils */

import {
  isNullOrUndefined,
  StringUtils,
  dateForWaterFall,
  NumberUtils,
} from "@/utils";
/** Interfaces */

import { Program } from "../types";
import { ProgramSelectedAndStatus, ProgramDropdownValues } from "@/types";



//** Tabs views */

import ProgramOverview from '@/modules/home/analyze/views/HomeAnalyzeProgramOverview.vue'
import HomeAnalyzeProgramList from '@/modules/home/analyze/views/HomeAnalyzeProgramList.vue'
import NineBoxesCF from '@/modules/home/analyze/views/NineBoxesCF.vue'
import NineBoxesFinancing from '@/modules/home/analyze/views/NineBoxesFinancing.vue'
import HomeAnalyzeWaterfall from '@/modules/home/analyze/views/HomeAnalyzeWaterfall.vue'
import HomeAnalyzeVcard from '@/modules/home/analyze/views/HomeAnalyzeVcard.vue'
import ReceivablesMockup2 from '@/modules/home/views/ReceivablesMockup2.vue'


export default defineComponent({
  name: 'HomeOpportunity',
  components: {
    AnalyzeProgramOptions,
    CalculumLayout,    
    HomeAnalyzeProgramList,
    HomeAnalyzeWaterfall,
    HomeProgramStatusDropdown,
    Locked,
    NineBoxesCF,
    NineBoxesFinancing,
    ProgramOverview,
    Skeleton,
    HomeAnalyzeVcard,
    ReceivablesMockup2
  },
  props: {
    onListTab: { type: Boolean, required: false },
    programTarget: { type: String, required: true },
    selectedProgramId: { type: String, required: true },
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore();
    const entityCardStore = useEntityCardStore();
    const subscribeStore = useSubscribeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const router = useRouter();
    const toast = useToast();    

    const { usevCardGroupsEnabled } = useCompany();    

    
    const {
      user,
      useFeature9BoxesFinancing,
      useFeatureVirtualCard,
      userPartnerRoleEnabled,
      userIsAdmin,
      userIsSuperAdmin,
      isPilotAccount
    } = useUser();

    const { spendFileVersionActiveId } = useSpendFile();
    const isAdminUser = computed(() => {
      //- Super admin
      if (userIsSuperAdmin.value) {
        return true
      }

      //- Pilot account
      if (isPilotAccount()) { 
        return false
      }

      //- Admin
      return userIsSuperAdmin.value || userIsAdmin.value
    })
    const { setProgramsToDropdown } = useProgramList();

    let setGlobalFilter = formatData.convertFiltersToREST(
      globalFiltersStore.getFiltersApplied,
    );

    const { apolloClientResetStore, isResetting } = useApolloClient();

    interface Data {
      loadingSelectedProgram: boolean;
      loadingAllPrograms: boolean;
      programValues: ProgramSelectedAndStatus;
      dropdownProgramValues: ProgramDropdownValues;
      currentTab: string;
      showWaterFallTab: boolean;
      program: Program | null;
      keyOptionsProgram: number;
      keyDropdown: number;
      keyTabsViews: number;
      spendsActive: number;
      showModaltoEdit: boolean;
      forceReload: boolean;
      isRefreshing: boolean; // Add this to track refresh state
      lastRefreshStatus: string | null; // Track the last refresh status to prevent duplicate calls,
      spendFileInrecalculation: boolean;
      editModeToggle: boolean;
    }

    const data = reactive<Data>({
      loadingSelectedProgram: true,
      loadingAllPrograms: true,
      programValues: {
        recalculationInProgress: true,
        pendingRecalculation: true,
        selectedProgramId: null,
        isBoxesRecalculating: null
      },
      dropdownProgramValues: {
        programsList: null,
      },
      currentTab: initializeTab(),
      showWaterFallTab: false,
      program: null,
      keyOptionsProgram: NumberUtils.getRandomInt(),
      keyDropdown: NumberUtils.getRandomInt(),
      keyTabsViews: NumberUtils.getRandomInt(),
      spendsActive: 0,
      showModaltoEdit: false,
      forceReload: false,
      isRefreshing: false, // Initialize the refresh tracking
      lastRefreshStatus: null, // Track the last refresh status to prevent duplicate calls
      spendFileInrecalculation: false,
      editModeToggle: false
    });

    function initializeTab() {
      return "ProgramOverview";      
    }



    const textEditMode=computed(()=>{
      return data.editModeToggle ? translate.t("home.overview.exitEditMode") : translate.t("home.overview.editMode");
    })
    const toggleEditMode=()=>{
      data.editModeToggle = !data.editModeToggle;
    }
    // shows the available programs
    function getAllPrograms() {
      const params = {
        scope: "all",
        marked: null,
        firstName: null,
        lastName: null,
        recalculationInProgress: false,
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (response: any) => {
          data.dropdownProgramValues = setProgramsToDropdown(response);
          data.loadingAllPrograms = false;
        },
        callbackError: () => {
          data.loadingAllPrograms = false;
        },
      };
      analyzeStore.fetchAllPrograms(params);
    }

    /**
     * Get program data from API
     * Route: GET - /api/programs/{id}
     *
     * @return {void}
     */
    function getProgram(callAllApis: boolean = true): void {
      // Enable loading      
      const params = {
        programId: props.selectedProgramId,
        globalFilter: setGlobalFilter,
        callbackSuccess: (callbackSuccessData: Program) => {
          
          data.programValues.recalculationInProgress =
            callbackSuccessData.recalculationInProgress;
          
            data.programValues.pendingRecalculation =
            callbackSuccessData.pendingRecalculation;          

          data.programValues.isBoxesRecalculating =
            callbackSuccessData.isBoxesRecalculating;

          data.program = callbackSuccessData;

          const dateSplit = callbackSuccessData.created.split("T"); // ? - Use util from DateUtils
          data.showWaterFallTab = dateForWaterFall(dateSplit[0]);

          if (callAllApis) {
            getAllPrograms();
          }
          data.loadingSelectedProgram = false;
          data.keyTabsViews++;
          // Clear the refresh state when program data is successfully loaded
          data.isRefreshing = false;
        },
        callbackError: () => {
          data.loadingSelectedProgram = false;
          // Clear the refresh state on error as well
          data.isRefreshing = false;
        },
      };
      analyzeStore.getProgram(params);
    }

    async function getInitProgramAPI(getAllPrograms: boolean = false) {
      // Prevent multiple simultaneous refreshes
      if (data.isRefreshing) {
        return;
      }
      
      data.isRefreshing = true;
      
      try {
        await apolloClientResetStore();
        if (!isResetting.value) {
          entityCardStore.setSelectedProgram(
            StringUtils.removeIRI(props.selectedProgramId),
          );
          data.programValues.selectedProgramId = StringUtils.removeIRI(
            props.selectedProgramId,
          );
          
          getProgram(getAllPrograms);
          data.keyDropdown++;
        }
      } finally {
        // Reset the refresh flag after a short delay to allow for async operations
        setTimeout(() => {
          data.isRefreshing = false;
        }, 1000);
      }
    }

    onMounted(() => {
      getInitProgramAPI(true);
      data.spendFileInrecalculation = !subscribeStore.getAllowActionsInModules    
      setBrowserTitlebyTab()  
    });

    watch(
      () => subscribeStore.getAllowActionsInModules,
      (newValue) => {        
        data.spendFileInrecalculation = !newValue
      }
    )

    /** Computed */

    /**
     * if partner role is enabled and useFeature9BoxesFinancing is false, then show the teaser,
     * if partner role is enabled and useFeature9BoxesFinancing is true, then show the 9BoxFinancing view
     */
    const showTeaserView = computed(() => {
      return (
        userPartnerRoleEnabled.value &&
        useFeature9BoxesFinancing.value === false
      );
    });

    const programOptionsIsBadgeShowing = computed(() => {
      return (
        programIsPendingRecalculation.value &&
        user.value &&
        user.value.email.includes("@calculum.ai")
      );
    });

    const blockProgramOptions = computed(() => {
      if (
        data.programValues.recalculationInProgress ||
        data.programValues.pendingRecalculation ||
        data.programValues.isBoxesRecalculating
      ) {
        return true;
      }
      return false;
    });

    const labelForRecalculatingStatus = computed(() => {
      if (data.programValues.recalculationInProgress ||
        data.programValues.isBoxesRecalculating) {
        return translate.t("global.programInrecalculation");
      }
      if (data.programValues.pendingRecalculation) {
        return translate.t("global.pendingRecalculation");
      }
      return null;
    });

    const programIsPendingRecalculation = computed(() => {
      // Validate
      if (isNullOrUndefined(data.program)) {
        return false;
      }

      return data.program.pendingRecalculation;
    });

    const showContent = computed(() => {
      if (!data.loadingAllPrograms && !data.loadingSelectedProgram) {
        return true;
      }

      return false;
    });

    const vCardEnabled = computed((): boolean => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
    });

    /**
     * tab show if at least the user has a partner role
     */
    const verifyPartnerRole = computed(() => {
      return userPartnerRoleEnabled.value;
    });

    /** Watcher */

    watch(props, () => {
      // Only refresh if not already refreshing
      if (!data.isRefreshing) {
        getInitProgramAPI();
      }
    });

    watch(
      () => globalFiltersStore.getFiltersApplied,
      (newValue) => {
        /**
         * RACE CONDITION GUARD — watch(getFiltersApplied)
         *
         * cleanupBeforeCompanyChange() resets filtersApplied to [] before the company
         * API calls complete. This triggers this watcher while selectedProgramId (route)
         * and activeSpendFileVersion (user session) may still belong to different companies.
         *
         * Calling getInitProgramAPI() here would fire a request with a program UUID that
         * does not match the active spend file version → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }
        setGlobalFilter = formatData.convertFiltersToREST(newValue);
        // Only refresh if not already refreshing
        if (!data.isRefreshing) {
          getInitProgramAPI();
        }
      },
    );


    const { entitySelectedTrackingNumber } = useEntity();
    watch(entitySelectedTrackingNumber, () => {
      data.forceReload = true;
      // Only refresh if not already refreshing
      if (!data.isRefreshing) {        
        getInitProgramAPI();
      }
    });

    watch(
      () => subscribeStore.refreshPrograms,
      (newValue) => {
        // Prevent duplicate processing of the same status
        if (data.lastRefreshStatus === newValue) {
          return;
        }
        
        data.lastRefreshStatus = newValue;

        switch (newValue) {
          case "calculationPending":
            data.programValues.pendingRecalculation = true;
            data.programValues.recalculationInProgress = false;
            data.programValues.isBoxesRecalculating = false;
            break;

          case "recalculating":
          case "updating":
            data.programValues.pendingRecalculation = false;
            data.programValues.recalculationInProgress = true;
            data.programValues.isBoxesRecalculating = true;
            break;

          //This is the "intermediate" state ready, but still hiding the expected values
          case "calculationReady":
            data.programValues.pendingRecalculation = false;
            data.programValues.recalculationInProgress = false;
            data.programValues.isBoxesRecalculating = true;            
            // Only refresh if not already refreshing and not in a loading state
            if (!data.isRefreshing && !data.loadingSelectedProgram) {
              getInitProgramAPI();
            }
            break;

          case "estimationPending":
          case "estimating":
            data.programValues.pendingRecalculation = false;
            data.programValues.recalculationInProgress = false;
            data.programValues.isBoxesRecalculating = true;
            break;

          //The final state and refresh all and show all the values
          case "ready":
            data.programValues.pendingRecalculation = false;
            data.programValues.recalculationInProgress = true;
            data.programValues.isBoxesRecalculating = true;
            getInitProgramAPI();
            break;

          default:
            break;
        }
      },
    );


    watch(
      () => subscribeStore.refresh9boxes,
      (newValue) => {
        switch (newValue) {
          case "pending":
            data.programValues.isBoxesRecalculating = true;
            break;
          case "recalculating":
            data.programValues.isBoxesRecalculating = true;
            break;
          case "ready":
            data.programValues.isBoxesRecalculating = true;
            // Only refresh if not already refreshing and not in a loading state
            if (!data.isRefreshing && !data.loadingSelectedProgram) {
              getInitProgramAPI();
            }
            break;
          default:
            break;
        }
      },
    );

    /** To subscribe to the notifications by uuid program */
    function goToAllPrograms() {
      // Reset Stores related to the default program
      entityCardStore.setSelectedProgram(null);
      analyzeStore.setHarmonizationsGroupsbyProgram([]);
      analyzeStore.setFinancingsGroupsbyProgram([]);

      Routing.home.analyze.openHomeAnalyzeProgramsPanel();
    }

    function changeActiveStatus(status: any) {
      formatData.closeMenuOptions();
      //   data.loadingSelectedProgram = true

      const changed = {
        key: "activeProgram",
        value: status,
      };
      const params = {
        program: props.selectedProgramId,
        changed: changed,
        uuids: [],
        callbackSuccess: (callbackSuccessData: any) => {
          if (status) {
            toast.success(translate.t('home.analyze.alertActiveNow'))
          } else {
            toast.success(translate.t('home.analyze.alertInactiveNow'))
          }
          data.loadingSelectedProgram = false;
          getInitProgramAPI(true);
        },
        callbackError: (callbackErrorData: any) => {
          data.loadingSelectedProgram = false;

          if (
            callbackErrorData.data.subject === "spendAlreadyInActiveProgram"
          ) {
            data.spendsActive = callbackErrorData.data.records.length;
            data.showModaltoEdit = true;
          } else {
            toast.error(translate.t('home.analyze.' + callbackErrorData.data.subject))
          }
        },
      };
      analyzeStore.postProgramSpendConfigurationbyGroups(params);
    }

    function redirectToSelectedProgram(program: any) {

      apolloClientResetStore()
      setTimeout(() => {

        router.push({
          name: Routing.home.analyze.homeAnalyzeProgramOverview,
          query: {
            selectedProgramId: StringUtils.removeIRI(program)
          }
        });


      }, 500);
    }

    onBeforeRouteLeave(async (to) => {      
      apolloClientResetStore();
    });

    function changeTabOverview() {
      data.currentTab = "ProgramOverview";      
      setBrowserTitlebyTab()
    }

    function changeTab(tab: any) {
      data.currentTab = tab;
      setBrowserTitlebyTab()
    }

    
    const setTitleForsupplier = computed(() => {
      return translate.t('home.analyze.analyzeProgramOverview.nineBoxesButtonTab')
    })


    // Set page title
    

    function setBrowserTitlebyTab() {


      let title = 'Opportunity'

      switch(data.currentTab) {

        case 'ProgramOverview':
        case 'ReceivablesMockup2':
          title+= " - Overview"
          break;

        case 'NineBoxesCF':
          title+= ' - '+translate.t('home.analyze.analyzeProgramOverview.nineBoxesButtonTab')          
          break;

        case 'HomeAnalyzeWaterfall':
          title+= " - "+translate.t("home.analyze.analyzeProgramOverview.waterfallButton")
          break;

        case 'HomeAnalyzeVcard':
          title+= " - "+translate.t("home.homeCompanySettings.cardGroups.cardGroupsTitleTab")
          break;

        case 'HomeAnalyzeProgramList':
          title+= " - "+translate.t("home.analyze.analyzeProgramOverview.listButton")
          break;
        
        default:
          break;

      }

      document.title = title

    }
          

    return {
      ...toRefs(data),
      blockProgramOptions,
      changeActiveStatus,
      changeTab,
      formatData,
      getInitProgramAPI,
      goToAllPrograms,      
      labelForRecalculatingStatus,
      programOptionsIsBadgeShowing,
      redirectToSelectedProgram,
      showContent,
      showTeaserView,
      setProgramsToDropdown,
      spendFileVersionActiveId,
      StringUtils,
      useFeatureVirtualCard,
      vCardEnabled,
      verifyPartnerRole,
      textEditMode,
      toggleEditMode,isAdminUser, changeTabOverview, setTitleForsupplier
    }
  }
})
</script>

<style lang="scss" scoped>
/*** Header ***/
.custom-fit-btn {
  min-width: 100px !important;
}

.all-programs-btn {
  min-width: 170px !important;
}

.skeleton-loadings {
  align-items: center;
}
.edit-btn {
  width: 100% !important;
  padding: 12px !important;
}
</style>
