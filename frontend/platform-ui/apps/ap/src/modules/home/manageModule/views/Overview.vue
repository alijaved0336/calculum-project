<template>
<TeaserView v-if="showTeaserViewForManageModule" teaser="manageTeaser"> </TeaserView>
<div v-if="recalculationInProgress" class="row">
  <div class="col-12 col-sm-12 col-md-7 col-lg-7 col-xl-7">
    <div class="no-info-section">
      <div class="d-flex flex-column row-100">
        <div class="d-flex flex-column"><span class="text-gray-600 text-base font-semibold MB-2">{{ $t('home.manageModule.calculationTitle') }}</span><span class="text-gray-600 text-xs font-normal">{{ $t('home.manageModule.calculationText') }}</span></div>
        <div class="row mt-4">
          <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="goToAllPrograms"><span>{{ $t('home.manageModule.backToPrograms') }}</span></button>
        </div>
      </div>
    </div>
  </div>
</div>
<div v-if="!existsPrograms && !showTeaserViewForManageModule" class="row" >
  <div class="col-12 col-sm-12 col-md-7 col-lg-7 col-xl-7">
    <div class="no-info-section">
      <div class="d-flex flex-column row-100">
        <div class="d-flex flex-column"><span class="text-gray-600 text-base font-semibold MB-2">{{ $t('home.manageModule.noprogramTitle') }}</span><span class="text-gray-600 text-xs font-normal">{{ $t('home.manageModule.noprogramText') }}        </span></div>
      </div>
    </div>
  </div>
</div>
<div v-if="existsPrograms && !recalculationInProgress && !showTeaserViewForManageModule" class="bars-section gap-4" >
  <div class="bar-gauge-chart">
    <CalculumLoading v-if="loadingGaugeInfo && !showTeaserViewForManageModule" block="block"></CalculumLoading>
    <div class="card">
      <div class="card-body" :class="addBgBlurClass">
        <div class="d-flex flex-column">               <span class="text-base font-bold mb-6"> {{ $t('global.paymentTermsD') }}   </span>
          <StatusGaugeBar :key="paymentTermsComponentKey" :result="agreedInfo.start" :target="agreedInfo.end" :percentage="agreedInfo.percentage" :middle-number="agreedInfo.agreed" ></StatusGaugeBar>
        </div>
      </div>
    </div>
  </div>
  <div class="bar-stacked">
    <div class="row">
      <CalculumLoading v-if="loadingStackedBarInfo" block="block"></CalculumLoading>
      <div v-if="showCashFlowCharts" :class="screenWidth1440 || !vCardEnabled ? 'col-12' : 'col-6'">
        <div class="card" :class="addBgBlurClassStackedSection">
          <div class="card-body card-body-fit-charts">
            <div class="d-flex mb-2 justify-content-between">
              <div class="col-8 d-flex vertical-aligments-center row-100">              <span class="text-base font-bold mr-2">{{ $t('global.cashFlow') }}</span><span class="text-sm font-medium text-gray-500 mr-2">{{ $t('global.total') }} </span><span class="text-sm font-semibold text-gray-700">{{ StringUtils.formatBigNumbers(totalTargetCashFlow) }}</span></div>
              <div v-if="screenWidth1440 && vCardEnabled" class="col-4 d-flex row-100">
                <CalculumDropdownOptions :selected-chart="currentOption" :list-options="options" :width-dropdown-percent="'100%'" @select-metric-dropdown="changeOption"></CalculumDropdownOptions>
              </div>
            </div>
            <HomeStackedBar :key="'cashFlowInfo-' + key" :class="'mb-4'" :infos="cashFlowInfo"  />
            <HomeStackedBar :key="'statusesInfo-' + key" :infos="statusesInfo" :heigth-class="'min-h-10'"  :show-percentage="true" />
          </div>
        </div>
      </div>
      <div v-if="showRebateCharts && vCardEnabled" :class="screenWidth1440 || !vCardEnabled ? 'col-12' : 'col-6'">
        <div class="card" :class="addBgBlurClassStackedSection">
          <div class="card-body card-body-fit-charts">
            <div class="d-flex mb-2 justify-content-between">
              <div class="d-flex vertical-aligments-center row-100">              <span class="text-base font-bold mr-2">{{ $t('global.rebate') }}</span>
                <div v-if="!showSkeleton" class="d-flex"><span class="text-sm font-medium text-gray-500 mr-2">{{ $t('global.total') }} </span><span class="text-sm font-semibold text-gray-700">{{ StringUtils.formatBigNumbers(totalTargetRebate) }}</span></div>
                <div v-if="showSkeleton" class="d-flex">
                  <SkeletonRectangle class="mb-2" :size="'sm'" />
                </div>
              </div>
              <div v-if="screenWidth1440 && vCardEnabled" class="col-4 d-flex row-100">
                <CalculumDropdownOptions :selected-chart="currentOption" :list-options="options" :width-dropdown-percent="'100%'" @select-metric-dropdown="changeOption" />
              </div>
            </div>
            <SkeletonRectangle v-if="showSkeleton" class="mb-4" :size="'lg'" :width-percent-as-string="'100%'" />
            <SkeletonRectangle v-if="showSkeleton" :size="'lg'" :width-percent-as-string="'100%'" />
            <HomeStackedBar v-if="!showSkeleton" :key="'rebateInfo-' + key" :class="'mb-4'" :infos="rebateInfo" :target="'rebate'" />
            <HomeStackedBar v-if="!showSkeleton" :key="'statusesRebateInfo-' + key" :infos="statusesRebateInfo" :heigth-class="'min-h-10'" :show-percentage="true" />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div v-if="existsPrograms && !recalculationInProgress && !showTeaserViewForManageModule" class="row" >
  <div class="col-12 d-flex align-items-center justify-content-between mt-4 mb-2">
    <div class="d-flex">
      <TabStrip class="ml-2 mb-2" :class="addBgBlurloadingCardsNumbers" :selected="selectedTabIndex" :tabs="tabs" @select="onSelect"></TabStrip>
    </div>
    <div class="d-flex align-items-center" :class="addBgBlurloadingCardsNumbers">
      <div class="d-flex mr-1">
        <div class="input-group input-search">
          <input id="search" class="form-control" type="text" v-model="searchQuery" :placeholder="labelSearchLevel" @keyup.enter="setQuery" />
          <div class="input-group-icon" id="icon-search"><i class="fa-brands fa-sistrix"></i></div>
        </div>
      </div>
      <div class="filter-popup-wrapper cursor-pointer gap-3 mr-1" @click.self="openFilterPopup"><span class="text-sm" @click="openFilterPopup">{{ $t('global.filters.itself') }}</span>
        <svg class="mt-1" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" @click="openFilterPopup">
          <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"></path>
        </svg>
        <div class="filter-popup-backdrop" v-if="showFilterPopup" @click="cancelFilters"></div>
        <div class="filter-popup" v-if="showFilterPopup">
          <div class="filter-popup-header mb-2"><span class="text-base font-bold">{{ $t('global.filterBy') }}</span></div>
          <div class="filter-popup-body">
            <div class="filter-popup-row">
              <SearchableDropdown v-model="stagingTeam" :items="teamOptions" label="Team" placeholder="Select team" :show-clear-option="true" />
            </div>
            <div class="filter-popup-row">
              <SearchableDropdown v-model="stagingPhase" :items="phaseOptions" label="Plan/Phase" placeholder="Select phase" :show-clear-option="true" />
            </div>
            <div class="filter-popup-row">
              <SearchableDropdown v-model="stagingCountry" :items="countryOptions.filter((x: any) => x.label !== '')" label="Country" placeholder="Select country" :show-clear-option="true" />
            </div>
            <div class="filter-popup-row">
              <SearchableDropdown v-model="stagingCommodity" :items="commodityOptions" label="Commodity" placeholder="Select commodity" :show-clear-option="true" />
            </div>
          </div>
          <div class="filter-popup-footer">
            <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: max-content" @click="cancelFilters">Cancel</button>
            <button class="btn btn-primary font-md" style="z-index: 1; width: max-content" @click="applyFilters">Apply filters</button>
          </div>
        </div>
      </div>
      <div class="filter-dropdown">
        <SearchableDropdown :model-value="currentSortedOption" :items="sortOptions" placeholder="Select..." :show-clear-option="false" :show-search="false" @update:model-value="onSortOptionSelect"></SearchableDropdown>
      </div>
    </div>
  </div>
  <div class="col-12 mb-2" v-if="hasActiveFilters">
    <div class="active-filters-bar"><span class="filters-bar-label">{{ $t('global.globalFilters.active') }}</span>
      <div class="filter-chips">
        <div v-if="searchValue" class="chip"  @click="clearSearchFromChip">
          <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="`Search: '${searchValue}'`">Search: "{{ searchValue }}"</span></Tooltip>
          <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </div>
        <div v-if="selectedTeam" class="chip" @click="clearSearchFromChipbyField('selectedTeam')">
          <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="`Team: ${selectedTeamLabel}`">Team: {{ selectedTeamLabel }}</span></Tooltip>
          <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </div>
        <div v-if="selectedPhase" class="chip" @click="clearSearchFromChipbyField('selectedPhase')">
          <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="`Phase/Plan: ${selectedPhaseLabel}`">Phase/Plan: {{ selectedPhaseLabel }}</span></Tooltip>
          <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </div>
        <div v-if="selectedCountry" class="chip" @click="clearSearchFromChipbyField('selectedCountry')">
          <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="`Country: ${selectedCountryLabel}`">Country: {{ selectedCountryLabel }}</span></Tooltip>
          <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </div>
        <div v-if="selectedCommodity" class="chip" @click="clearSearchFromChipbyField('selectedCommodity')">
          <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="`Commodity: ${selectedCommodityLabel}`">Commodity: {{ selectedCommodityLabel }}</span></Tooltip>
          <svg class="chip-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </div>
      </div>
      <button class="clear-all-chips" @click="clearAllOverviewFilters(true)">{{ $t('global.clearAll') }}</button>
    </div>
  </div>
  <div class="col-12 mt-1">
    <div class="row" :class="addBgBlurloadingCardsNumbers">
      <div class="col-2 d-flex flex-column">
        <StatusesCards v-if="statusesCardsInfo[0]" :key="'analyzed-numbers-' + key" :info="statusesCardsInfo[0]" :level-of-grid="tabs[selectedTabIndex].level" :is-vcard-enabled="vCardEnabled"></StatusesCards>
      </div>
      <div class="col-2 d-flex flex-column">
        <StatusesCards v-if="statusesCardsInfo[1]" :key="'onhold-numbers-' + key" :info="statusesCardsInfo[1]" :level-of-grid="tabs[selectedTabIndex].level" :is-vcard-enabled="vCardEnabled"></StatusesCards>
      </div>
      <div class="col-2 d-flex flex-column">
        <StatusesCards v-if="statusesCardsInfo[2]" :key="'planned-numbers-' + key" :info="statusesCardsInfo[2]" :level-of-grid="tabs[selectedTabIndex].level" :is-vcard-enabled="vCardEnabled"></StatusesCards>
      </div>
      <div class="col-2 d-flex flex-column">
        <StatusesCards v-if="statusesCardsInfo[3]" :key="'contacted-numbers-' + key" :info="statusesCardsInfo[3]" :level-of-grid="tabs[selectedTabIndex].level" :is-vcard-enabled="vCardEnabled"></StatusesCards>
      </div>
      <div class="col-2 d-flex flex-column">
        <StatusesCards v-if="statusesCardsInfo[4]" :key="'agreed-numbers-' + key" :info="statusesCardsInfo[4]" :negotiation-status="'agreed'" :level-of-grid="tabs[selectedTabIndex].level" :is-vcard-enabled="vCardEnabled"></StatusesCards>
      </div>
      <div class="col-2 d-flex flex-column">
        <StatusesCards v-if="statusesCardsInfo[5]" :key="'agreedextended-numbers-' + key" :info="statusesCardsInfo[5]" :negotiation-status="'agreedExtended'" :level-of-grid="tabs[selectedTabIndex].level" :is-vcard-enabled="vCardEnabled"></StatusesCards>
      </div>
    </div>
  </div>
  
  <div class="col-12 mt-1">
    <div v-if="!statuseswithRecords" class="row pl-6 mt-4" ><span class="text-base font-normal text-gray-400">{{ $t('home.manageModule.noResultsGeneral') }}</span></div>
    <div v-if="statuseswithRecords && !loadingCardsNumbers" class="row" >
      <div v-for="(status, index) in columnOrder" v-if="programSelectedId && !loadingPrograms" :key="status" class="col-2 d-flex flex-column" :class="{ 'kanban-col-droppable': isDragging, 'kanban-col-active-target': hoveredColumnStatus === status }" @dragenter="hoveredColumnStatus = status">
        <StatusesCardsScroll :ref="(el: any) => setColumnRef(status, el)" :key="status + keyScrolls" :levelof-grid="selectedTabIndex" :search-value="searchValue" :selected-program-id="programSelectedId" :negotiation-status="status" :status-code="getStatusCode(status)" :set-sorting="currentSortedOption" :selected-team="selectedTeam" :selected-phase="selectedPhase" :selected-country="selectedCountry" :selected-commodity="selectedCommodity" :is-draggable="true" :filters-to-apply="filtersToApply" :refresh-after-recalculating="keyRenderComponent" @set-record-status="(val: boolean) => setRecordStatus(status, val)" @card-moved="onCardMoved" @drag-start="isDragging = true" @drag-end="onDragEnd" @send:telerik-filter="setTelerikFilters"></StatusesCardsScroll>
      </div>
    </div>
  </div>
</div>
<KanbanGlobalWarningDialog :show="dnd.showGlobalWarning.value" :spend-line-count="dnd.pendingMove.value?.card?.spendCounts ?? dnd.pendingMove.value?.card?.supplierCounts ?? 0" @continue="dnd.onGlobalWarningContinue" @cancel="dnd.onGlobalWarningCancel"></KanbanGlobalWarningDialog>
<CalculumModalConfirmAction v-if="dnd.showTier2Confirm.value === 'tier2A'" :action-description="$t('home.manageModule.dragAndDrop.tier2AWarning')" @confirm-action="dnd.onTier2Continue" @hide-modal="dnd.onTier2Cancel"></CalculumModalConfirmAction>
<CalculumModalConfirmAction v-if="dnd.showTier2Confirm.value === 'tier2B'" :action-description="$t('home.manageModule.dragAndDrop.tier2BWarning')" @confirm-action="dnd.onTier2Continue" @hide-modal="dnd.onTier2Cancel"></CalculumModalConfirmAction>
<KanbanPlanModal :show="dnd.showPlanModal.value" :entity-name="dnd.pendingMove.value?.card?.entityName ?? ''" :spend-file-version-uuid="spendFileVersionActiveId" @confirm="dnd.onPlanModalConfirm" @cancel="dnd.onPlanModalCancel"></KanbanPlanModal>
<KanbanAgreedTermsModal :show="dnd.showAgreedTermsModal.value" :entity-name="dnd.pendingMove.value?.card?.entityName ?? ''" :onSCF="dnd.pendingMove.value?.card?.onSCF ?? null" :scfAccepted="dnd.pendingMove.value?.card?.scfAccepted ?? null" :modelPaymentTerms="dnd.pendingMove.value?.card?.modelPaymentTerms ?? null" @confirm="dnd.onAgreedTermsModalConfirm" @cancel="dnd.onAgreedTermsModalCancel"></KanbanAgreedTermsModal>
<KanbanFilterScopeDialog :show="dnd.showFilterScopeDialog.value" @confirm="dnd.onFilterScopeConfirm" @cancel="dnd.onFilterScopeCancel"></KanbanFilterScopeDialog>
</template>

<script lang="ts">
import { toRefs, reactive, computed, defineComponent, ref, watch, onMounted, onBeforeUnmount } from "vue";

import { DataInterface, setTabs, filterStrings, filterOptions, Filters } from "../types";
import { NumberUtils, StringUtils } from "@/utils";
import { onBeforeRouteLeave } from "vue-router";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";
import { useProgram, useSpendFile, useUser } from "@/composables";
import { useUserStore } from "@/stores/user";
import { useAppStore } from '@/stores/app';
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useAnalyzeStore } from '@/stores/analyze';
import { useHomeStore } from '@/stores/home';
import { usePlanStore } from '@/stores/plan';
import { useEntityCardStore } from '@/stores/entityCard';
import * as formatData from "@/utils/FormatData";
import * as Routing from "@/services/router/Routing";
import { CalculumLoading, SearchableDropdown } from '@ada/design-system'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import HomeStackedBar from "@/modules/home/components/HomeStackedBar.vue";
import { useToast } from "vue-toastification";
import StatusesCards from "../components/StatusesCards.vue";
import StatusesCardsScroll from "../components/StatusesCardsScroll.vue";
import StatusGaugeBar from "../components/StatusGaugeBar.vue";
import TeaserView from "@/modules/components/teaser/TeaserView.vue";
import CalculumDropdownOptions from '@/modules/home/components/CalculumDropdownOptions.vue'
import useCompany from "@/composables/useCompany";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import useApolloClient from "@/services/graphql/useApolloClient";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import { useKanbanDragAndDrop } from "../composables/useKanbanDragAndDrop";
import KanbanGlobalWarningDialog from "../components/KanbanGlobalWarningDialog.vue";
import KanbanFilterScopeDialog from "../components/KanbanFilterScopeDialog.vue";
import KanbanPlanModal from "../components/KanbanPlanModal.vue";
import KanbanAgreedTermsModal from "../components/KanbanAgreedTermsModal.vue";
import CalculumModalConfirmAction from "@/modules/components/CalculumModalConfirmAction.vue";



export default defineComponent({
  name: "OverviewView",
  components: {
    CalculumLoading,
    HomeStackedBar,
    StatusesCards,
    StatusesCardsScroll,
    StatusGaugeBar,
    TabStrip,
    TeaserView,
    CalculumDropdownOptions,
    SkeletonRectangle,
    SearchableDropdown,
    Tooltip,
    KanbanGlobalWarningDialog,
    KanbanFilterScopeDialog,
    KanbanPlanModal,
    KanbanAgreedTermsModal,
    CalculumModalConfirmAction
  },
  props: {
    currentTabTracker: { type: Number, default: 0 },
    showSkeleton: { type: Boolean, default: false },
    refreshAfterRecalculating: { type: Number, default: 0 }
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore();
    const analyzeStore = useAnalyzeStore();
    const entityCardStore = useEntityCardStore();
    const homeStore = useHomeStore();
    const userStore = useUserStore();
    const appStore = useAppStore();
    const planStore = usePlanStore();
    const { entitySelectedTrackingNumber, refreshAfterUpdateStatusKanbanTracking } = useEntity();

     const telerikFilters = ref<Filters>({
      filters: [],
      logic: "and"
    });
    
    const { companyActiveTeams } = useCompany();

    function openGlobalFilters() {
      userStore.setShowGlobalFiltersPanel(NumberUtils.getRandomInt());
    }

    const keyRenderComponent = ref(NumberUtils.getRandomInt());

    const toast = useToast();

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const { spendFileVersionActiveId } = useSpendFile();

    const { usevCardGroupsEnabled } = useCompany();

    const { useModuleManage, useFeatureVirtualCard, userIsSuperAdmin, userIsAdmin } = useUser();

    const { apolloClientResetStore, isResetting } = useApolloClient();

    const showTeaserViewForManageModule = computed(() => {
      return useModuleManage.value === false;
    })

    const isSuperAdmin = computed(() => {
      return userIsSuperAdmin.value || userIsAdmin.value
    })


    const showFilterPopup = ref(false);
    const stagingTeam = ref('');
    const stagingPhase = ref('');
    const stagingCountry = ref('');
    const stagingCommodity = ref('');



    const data = reactive<DataInterface>({
      loadingPrograms: false,
      allPrograms: [],
      programTarget: "cashFlow",
      selectedProgramUri: "",
      rebateInfo: [],
      statusesRebateInfo: [],
      cashFlowInfo: [],
      statusesInfo: [],
      selectedTabIndex: 0,
      tabs: setTabs,
      statusesCardsInfo: [],
      filterOptions: filterStrings,
      currentSortedOption: "targetDesc",
      sortyByTableDisplaying: false,
      searchValue: "",
      key: new Date().getUTCMilliseconds(),
      keyScrolls: new Date().getUTCMilliseconds(),
      searchQuery: "",
      recordsForAnalyzed: true,
      recordsForPlanned: true,
      recordsForContacted: true,
      recordsForAgreed: true,
      recordsForOnHold: true,
      recordsForAgreedExtended: true,
      agreedInfo: {
        start: 0,
        end: 0,
        agreed: 0,
        percentage: 0
      },
      levelOfGrid: "",
      totalTargetCashFlow: 0,
      totalTargetRebate: 0,
      loadingGaugeInfo: true,
      loadingStackedBarInfo: true,
      loadingCardsNumbers: true,
      existsPrograms: true,
      recalculationInProgress: false,
      labelSearchLevel: "",
      screenWidth1440: false,
      options: getOptionsAvailable(),
      currentOption: 'cashFlow',
      selectedTeam: '',
      selectedPhase: '',
      selectedCountry: '',
      selectedCommodity: '',
      filtersToApply: {
        selectedTeam: '',
        selectedPhase: '',
        selectedCountry: '',
        selectedCommodity: ''
      }
    });

    const columnOrder = ref<string[]>([
      'analyzed', 'onHold', 'planned', 'contacted', 'agreed', 'agreedExtended'
    ])

    const statusCodes: Record<string, string> = {
      analyzed: '100',
      onHold: '150',
      planned: '200',
      contacted: '300',
      agreed: '400',
      agreedExtended: '500'
    }

    function getStatusCode(status: string): string {
      return statusCodes[status]
    }

    function setRecordStatus(status: string, value: boolean) {
      const key = `recordsFor${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof typeof data
      ;(data as any)[key] = value
    }

    const isDragging = ref(false)
    const hoveredColumnStatus = ref<string | null>(null)

    function onDragEnd() {
      isDragging.value = false
      hoveredColumnStatus.value = null
    }

    const columnRefs: Record<string, any> = {}
    function setColumnRef(status: string, el: any) {
      columnRefs[status] = el
    }

    const teamOptions = computed(() =>
      (companyActiveTeams.value ?? []).map(team => ({
        value: team.name,
        label: team.name,
      }))
    );

    const phasesList = ref<Array<{ value: string; label: string }>>([]);
    const loadingPhases = ref(false);
    const phaseOptions = computed(() => phasesList.value);

    function fetchPhaseOptions() {
      loadingPhases.value = true;
      planStore.getAllPlans({
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (plans: any[]) => {
          phasesList.value = plans.flatMap(plan =>
            (plan.planPhases ?? []).map((phase: any) => {
              const phaseName = phase.name ?? `Phase: ${phase.number}`;
              return {
                value: StringUtils.removeIRI(phase['@id']),
                label: `${plan.title} - ${phaseName}`,
              };
            })
          );
          loadingPhases.value = false;
        },
        callbackError: () => {
          loadingPhases.value = false;
        },
      });
    }

    const countriesList = ref<Array<{ value: string; label: string }>>([]);
    const loadingCountries = ref(false);
    const countryOptions = computed(() => countriesList.value);

    function getCountries() {
      loadingCountries.value = true;
      appStore.fetchCountries(
        (fetchedData: any[]) => {
          countriesList.value = fetchedData.map((c: { '@id': string; localizedName: string }) => ({
            value: c.localizedName,
            label: c.localizedName,
          }));
          loadingCountries.value = false;
        },
        () => {
          loadingCountries.value = false;
        }
      );
    }

    const commoditiesList = ref<Array<{ value: string; label: string }>>([]);
    const loadingCommodities = ref(false);
    const commodityOptions = computed(() => commoditiesList.value);

    function fetchCommodities() {
      if (!programSelectedId.value) return;
      loadingCommodities.value = true;
      analyzeStore.getProgramCommodityValues({
        programId: programSelectedId.value,
        page: 1,
        callbackSuccess: (responseData: any) => {
          const values: string[] = Array.isArray(responseData.values) ? responseData.values : [];
          commoditiesList.value = values.map(v => ({ value: v, label: v }));
          loadingCommodities.value = false;
        },
        callbackError: () => {
          loadingCommodities.value = false;
        },
      });
    }

    const hasActiveFilters = computed(() => {
      setTrueStatusesRecords();
      return !!(data.selectedTeam || data.selectedPhase || data.selectedCountry || data.selectedCommodity || data.searchValue)
    })

    const selectedTeamLabel = computed(() => {
      setTrueStatusesRecords();
      return teamOptions.value.find(o => o.value === data.selectedTeam)?.label ?? ''
    });

    const selectedPhaseLabel = computed(() => {
      setTrueStatusesRecords();
      return phaseOptions.value.find(o => o.value === data.selectedPhase)?.label ?? ''
    });

    const selectedCountryLabel = computed(() => {
      setTrueStatusesRecords();
      return countryOptions.value.find(o => o.value === data.selectedCountry)?.label ?? ''
  });

    const selectedCommodityLabel = computed(() => {
      setTrueStatusesRecords();
      return commodityOptions.value.find(o => o.value === data.selectedCommodity)?.label ?? ''      
    });

    function clearSearchFromChip() {
      data.searchQuery = '';
      setTrueStatusesRecords();
      setQuery()
    }

    function clearSearchFromChipbyField(field: string) {

      switch(field){
        
        case 'selectedTeam':
          data.selectedTeam = '';
          stagingTeam.value = '';
          break;

        case 'selectedPhase':
          data.selectedPhase = '';
          stagingPhase.value = '';
          break;

        case 'selectedCountry':
          data.selectedCountry = '';
          stagingCountry.value = '';
          break;

        case 'selectedCommodity':
          data.selectedCommodity = '';
          stagingCommodity.value = ''
          break;

      }
      setTrueStatusesRecords()
      setFilters()
      
    }

    function clearAllOverviewFilters(clearAll: boolean = false) {
      
      if (clearAll) {
        data.selectedTeam = '';
        data.selectedPhase = '';
        data.selectedCountry = '';
        data.selectedCommodity = '';
        data.searchQuery = '';

        stagingTeam.value = '';
        stagingPhase.value = '';
        stagingCountry.value = '';
        stagingCommodity.value = '';
      }
      setTrueStatusesRecords();
      setFilters()      
      setQuery()
    }

    
    function openFilterPopup() {
      stagingTeam.value = data.selectedTeam;
      stagingPhase.value = data.selectedPhase;
      stagingCountry.value = data.selectedCountry;
      stagingCommodity.value = data.selectedCommodity;
      showFilterPopup.value = true;
    }

    function applyFilters() {
      data.selectedTeam = stagingTeam.value;
      data.selectedPhase = stagingPhase.value;
      data.selectedCountry = stagingCountry.value;
      data.selectedCommodity = stagingCommodity.value;
      setFilters()      
      showFilterPopup.value = false;
    }


    function setFilters() {
      data.filtersToApply = {
        selectedTeam: data.selectedTeam,
        selectedPhase: data.selectedPhase,
        selectedCountry: data.selectedCountry,
        selectedCommodity: data.selectedCommodity
      }
      setTrueStatusesRecords();
    }

    function cancelFilters() {
      showFilterPopup.value = false;
    }

    let setGlobalFilter = formatData.convertFiltersToREST(
      globalFiltersStore.getFiltersApplied
    );

    onMounted(() => {
      setClassBasedOnWidth();
      getCountries();
      fetchCommodities();
      fetchPhaseOptions();
      window.addEventListener('resize', setClassBasedOnWidth);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', setClassBasedOnWidth);
    });



    function getOptionsAvailable() {
      return [
        { title: translate.t('global.cashFlow'), value: 'cashFlow'},
        { title: translate.t('global.rebate'), value: 'rebate'}
      ]
    }

    // *** Programs ***

    const { programSelectedId, programs } = useProgram();

    // *** END Programs ***

    const dnd = useKanbanDragAndDrop({
      programSelectedId,
      spendFileVersionActiveId,
      getColumnRef: (status: string) => columnRefs[status],
      isAnyFilterActive: () => globalFiltersStore.getFiltersApplied.filters.length > 0 || hasActiveFilters.value,
      telerikFilters,
    })

    function onCardMoved({ card, fromStatus, toStatus }: { card: any; fromStatus: string; toStatus: string }) {
      dnd.handleCardMoved({ card, fromStatus: fromStatus as any, toStatus: toStatus as any, levelofGrid: data.selectedTabIndex })
    }

    // *** Payment Terms ***

    const paymentTermsComponentKey = ref(NumberUtils.getRandomInt());

    watch(
      () => props.currentTabTracker,
      () => {
        if (showTeaserViewForManageModule.value) return
        paymentTermsComponentKey.value = NumberUtils.getRandomInt();
      }
    );

    // *** END Payment Terms ***

    const statuseswithRecords = computed(() => {
      if (
        data.recordsForAnalyzed ||
        data.recordsForPlanned ||
        data.recordsForContacted ||
        data.recordsForAgreed ||
        data.recordsForOnHold ||
        data.recordsForAgreedExtended
      ) {
        return true;
      }
      return false;
    });

    function setTrueStatusesRecords() {
      data.recordsForAnalyzed = true;
      data.recordsForPlanned = true;
      data.recordsForContacted = true;
      data.recordsForAgreed = true;
      data.recordsForOnHold = true;
      data.recordsForAgreedExtended = true;
    }

    async function onSelect(e: any) {
      if (showTeaserViewForManageModule.value) return;
      clearAllOverviewFilters()
      await apolloClientResetStore();
      if (!isResetting.value) {
        setTrueStatusesRecords();
        data.selectedTabIndex = e.selected;
        homeStore.setEntityLevelTabSelected(data.selectedTabIndex);
        data.loadingCardsNumbers = true;
        getStatusCardsNumber();
      }
    }

    async function setQuery() {
      if (showTeaserViewForManageModule.value) return;
      if (data.searchValue === data.searchQuery) {
        return;
      }

      await apolloClientResetStore();
      if (!isResetting.value) {
        setTrueStatusesRecords();
        data.searchValue = data.searchQuery;
      }
    }

    const clickedOnSortByTableArrow = ref(false);

    function changeChartOptionsState() {
      if (showTeaserViewForManageModule.value) return
      clickedOnSortByTableArrow.value = !clickedOnSortByTableArrow.value;
    }

    const sortOptions = filterOptions;

    async function onSortOptionSelect(value: string) {
      if (showTeaserViewForManageModule.value) return;
      if (data.currentSortedOption === value) return;
      await apolloClientResetStore();
      if (!isResetting.value) {
        setTrueStatusesRecords();
        data.currentSortedOption = value;
      }
    }

    function toggleSortByArrow() {
      if (showTeaserViewForManageModule.value) return
      clickedOnSortByTableArrow.value = !clickedOnSortByTableArrow.value;
    }

    /** API Calls */

    function getInfo(type: "stats_info" | "stats_agreed") {
      if (showTeaserViewForManageModule.value) return
      const params = {
        programId: programSelectedId.value,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        type: type,
        callbackSuccess: (response: any) => {
          if (type === 'stats_agreed') {
            data.loadingGaugeInfo = false;
            data.agreedInfo = response.agreedInfo;
          }
          //
          else {
            /** For rebate charts */
            if (response.rebateInfo && response.statusesRebateInfo) {

              data.rebateInfo = response.rebateInfo;
              data.statusesRebateInfo = response.statusesRebateInfo;

              data.totalTargetRebate =
                response.rebateInfo[0].value +
                response.rebateInfo[1].value;
            }

            /** For cash flow charts */

            data.cashFlowInfo = response.cashFlowInfo;
            data.statusesInfo = response.statusesInfo;

            data.totalTargetCashFlow =
              response.cashFlowInfo[0].value +
              response.cashFlowInfo[1].value +
              response.cashFlowInfo[2].value;

            data.loadingStackedBarInfo = false;

            getStatusCardsNumber();
          }

          data.loadingPrograms = false;
        },
        callbackError: () => {
          data.loadingGaugeInfo = false;

          data.loadingStackedBarInfo = false;
          toast.error(translate.t('error.server500'));
        }
      };

      analyzeStore.getStatsAgreed(params);
    }

    function getStatusCardsNumber() {
      if (showTeaserViewForManageModule.value) return
      setValuesbyLevel();
      const params = {
        programId: programSelectedId.value,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        levelOfGrid: data.levelOfGrid,
        callbackSuccess: (response: any) => {
          setInfoNumbers(response);
        },
        callbackError: () => {
          data.loadingCardsNumbers = false;
          toast.error(translate.t('error.server500'));
        }
      };

      analyzeStore.getStatusCardsNumber(params);
    }

    function setInfoNumbers(response: any) {
      if (showTeaserViewForManageModule.value) return
      data.statusesCardsInfo = [];

      let row = 0;

      for (const [clave, valor] of Object.entries(response)) {        
        if (clave !== 'all_agreed') {        
          let parseData = {
            key: `${clave}`,
            value: StringUtils.formatBigNumbers(data.statusesInfo[row].value),
            valueRebate: data.statusesRebateInfo.length > 0 && !StringUtils.isNullUndefinedOrEmpty(data.statusesRebateInfo[row]) ? StringUtils.formatBigNumbers(data.statusesRebateInfo[row].value) : 0,
            number: valor
          };
          row = row + 1;
          data.statusesCardsInfo.push(parseData);
        }
      }

      data.loadingCardsNumbers = false;

      data.key++;
    }

    /** Extra fns */

    function goToAllPrograms() {

      entityCardStore.setSelectedProgram(null);

      analyzeStore.setHarmonizationsGroupsbyProgram([]);

      analyzeStore.setFinancingsGroupsbyProgram([]);

      Routing.home.analyze.openHomeAnalyzeProgramsPanel();
    }

    function setValuesbyLevel() {
      if (showTeaserViewForManageModule.value) return
      switch (data.selectedTabIndex) {
        // AB#18795: the Spend Lines tab lists one card per spend line, so its column headers
        // must be counted at spend level too. Sharing the "suppliers" case with tab 1 made the
        // header report how many suppliers those cards belong to (2) instead of how many spend
        // lines the column actually holds (4). The search box still searches by supplier name.
        case 0:
          data.levelOfGrid = "spends";
          data.labelSearchLevel = translate.t("home.components.navbar.search");
          break;
        case 1:
          data.levelOfGrid = "suppliers";
          data.labelSearchLevel = translate.t("home.components.navbar.search");
          break;
        case 2:
          data.levelOfGrid = "parents";
          data.labelSearchLevel = translate.t(
            "home.components.navbar.searchParent"
          );
          break;

        default:
          break;
      }
    }

    /** Vue Fns */

    function initialCalls(keepSorting: boolean) {
      if (showTeaserViewForManageModule.value) return
      if (!keepSorting) {
        data.currentSortedOption = 'targetDesc';
      }

      data.selectedTabIndex = homeStore.getEntityLevelTabSelected;

      setValuesbyLevel();
    }

    function reactiveFns() {
      if (showTeaserViewForManageModule.value) return
      getInfo("stats_agreed");
      getInfo("stats_info");
    }

    initialCalls(false);

    watch(
      programSelectedId,
      () => {
        if (showTeaserViewForManageModule.value) return
        setTrueStatusesRecords();

        data.loadingGaugeInfo = true;

        data.loadingStackedBarInfo = true;

        data.loadingCardsNumbers = true;

        data.searchValue = "";

        // Get the actual recalculation status from the selected program
        if (programs.value && programSelectedId.value) {
          const selectedProgram = programs.value.find(p => p.id === programSelectedId.value);
          data.recalculationInProgress = selectedProgram ? selectedProgram.recalculationInProgress : false;
        } else {
          data.recalculationInProgress = false;
        }

        reactiveFns();
      },
      { immediate: true }
    );

    watch(programSelectedId, () => {
      fetchCommodities();
    });

    watch(spendFileVersionActiveId, () => {
      fetchPhaseOptions();
    });

    // Watch for changes in global filters using Pinia store
    watch(() => globalFiltersStore.getFiltersApplied, (newValue, oldValue) => {
      /**
       * RACE CONDITION GUARD — watch(getFiltersApplied)
       *
       * cleanupBeforeCompanyChange() resets filtersApplied to [] before the company
       * API calls complete. This triggers this watcher while selectedProgramId and
       * activeSpendFileVersion may still belong to different companies.
       *
       * Calling reactiveFns() during this window fires API calls with mismatched
       * context → HTTP 500.
       *
       * See: docs/context/race-condition-company-change.md
       */
      if (globalFiltersStore.getDisableWatchers) {
        return;
      }

      setGlobalFilter = formatData.convertFiltersToREST(newValue);
      reactiveFns();
    }, { deep: true, immediate: false });


    //- This reload is for the endpoint that does not change the program status
    watch(entitySelectedTrackingNumber,  async () => {            
      setTrueStatusesRecords()
      reactiveFns();
      data.keyScrolls++
    });
    
    

    watch(refreshAfterUpdateStatusKanbanTracking,  async () => {
      reactiveFns();
    });

    watch(() => props.refreshAfterRecalculating, () => {
      setTrueStatusesRecords()
      reactiveFns();
      keyRenderComponent.value = NumberUtils.getRandomInt()      
    });

    // Watch for changes in programs to update recalculation status
    watch(programs, () => {
      if (programs.value && programSelectedId.value) {
        const selectedProgram = programs.value.find(p => p.id === programSelectedId.value);
        data.recalculationInProgress = selectedProgram ? selectedProgram.recalculationInProgress : false;
      }
    }, { deep: true });

    onBeforeRouteLeave(async (to) => {
      await apolloClientResetStore();
    });


    const addBgBlurClass = computed(() => {
      return data.loadingGaugeInfo === true ? 'bg-blur' : '';
    })

    const addBgBlurClassStackedSection = computed(() => {
      return data.loadingStackedBarInfo === true ? 'bg-blur' : '';
    })

    const addBgBlurloadingCardsNumbers = computed(() => {
      return data.loadingCardsNumbers === true ? 'bg-blur' : '';
    })


    /**
     * To determine the charts to show
     */

    function setClassBasedOnWidth() {
      const screenW = window.innerWidth;
      if (screenW <= 1440) {
        data.screenWidth1440 = true
      } else {
        data.screenWidth1440 = false
      }
    }

    const showRebateCharts = computed(() => {
      if (!data.screenWidth1440) {
        return true
      }
      else if (data.screenWidth1440 && data.currentOption === 'rebate') {
        return true
      }
      return false
    })

    const showCashFlowCharts = computed(() => {
      if (!data.screenWidth1440) {
        return true
      }
      else if (data.screenWidth1440 && data.currentOption === 'cashFlow') {
        return true
      }
      return false
    })

    function changeOption(option: string) {
      data.currentOption = option
    }

    const vCardEnabled = computed((): boolean => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
    });

   
    function setTelerikFilters(filters: any) {
      telerikFilters.value = filters      
    }


    return {
      ...toRefs(data),
      changeChartOptionsState,
      clickedOnSortByTableArrow,
      formatData,
      goToAllPrograms,
      onSelect,
      paymentTermsComponentKey,
      programSelectedId,
      Routing,
      setQuery,
      showTeaserViewForManageModule,      
      statuseswithRecords,
      toggleSortByArrow,
      addBgBlurClass,
      addBgBlurClassStackedSection,
      addBgBlurloadingCardsNumbers,
      showRebateCharts,
      showCashFlowCharts,
      changeOption,
      vCardEnabled,
      isSuperAdmin,
      isResetting,
      StringUtils,
      teamOptions,
      phaseOptions,
      countryOptions,
      commodityOptions,
      sortOptions,
      onSortOptionSelect,
      openGlobalFilters,
      hasActiveFilters,
      selectedTeamLabel,
      selectedPhaseLabel,
      selectedCountryLabel,
      selectedCommodityLabel,
      clearAllOverviewFilters,
      clearSearchFromChip,
      columnOrder,
      statusCodes,
      getStatusCode,
      setRecordStatus,
      onCardMoved,
      isDragging,
      hoveredColumnStatus,
      setColumnRef,
      onDragEnd,
      dnd,
      spendFileVersionActiveId,
      showFilterPopup,
      stagingTeam,
      stagingPhase,
      stagingCountry,
      stagingCommodity,
      openFilterPopup,
      applyFilters,
      cancelFilters,
      clearSearchFromChipbyField,
      setTelerikFilters,
      keyRenderComponent
    };
  }
});
</script>
<style scoped lang="scss">
@import '@/resources/assets/styles/variables/_colors.scss';

.bars-section {
  display: flex;
  width: 100%;
  gap: 0.5%;
}

.bar-stacked {
  width: 100%;
}

.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 1px;
  min-height: 280px;

  &:hover {
    border: 1px solid #eaecf0;
    border-radius: 8px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 1664px) {
    min-height: 290px;
  }
}

.options_table {
  width: 265px;
}

.filter-dropdown {
  width: 250px;
  flex-shrink: 0;

  @media screen and (max-width: 1280px) {
   width: fit-content;
  }

}

.filter-popup-wrapper {
  position: relative;    
  align-self: center;
  background: #ffffff;
  padding: 0rem 0.45rem;    
  display: flex;
  border: 1px solid #D0D5DD;
  box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  height: 40px;

  
  .filter-popup-btn {
    height: 38px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
  }
}

.filter-popup-wrapper:hover {
  background: #FFFFFF;
  color: #000000;
  border: 1px solid #000000;
}

.filter-popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.filter-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: -50px;
  z-index: 100;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  min-width: 300px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid #eaecf0;

  .filter-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;    

    svg {
      color: #667085;
    }
  }

  .filter-popup-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .filter-popup-row {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .filter-popup-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #667085;
    }
  }

  .filter-popup-footer {
    display: flex;
    gap: 10px;
    margin-top: 24px;

    .filter-apply-btn,
    .filter-cancel-btn {
      flex: 1;
    }
  }
}

.custom-filter-btn-wrapper {
  display: flex;
  align-items: flex-end;
  flex-shrink: 0;
  padding-bottom: 1px;
  height: 50px;

  .custom-filter-btn {
    white-space: nowrap;
    height: 38px;
  }
}

.active-filters-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.375rem 0.5rem;
  background: #f9fafb;
  border: 1px solid #eaecf0;
  border-radius: 8px;

  .filters-bar-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #667085;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .filter-chips {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 3px 5px;
    // background: $color-gray-50;
    border: 1px solid var(--gray-neutral-300, #d2d6db);
    border-radius: 20px;
    font-size: 0.8125rem;
    font-weight: 500;
    // color: #ff2c4f;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s ease;

    // &:hover {
    //   background: #fff0f2;
    // }

    span {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip-close {
      width: 13px;
      height: 13px;
      flex-shrink: 0;
      opacity: 0.6;
      transition: opacity 0.15s ease;
    }

    &:hover .chip-close {
      opacity: 1;
    }
  }

  .clear-all-chips {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #667085;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
    padding: 0.2rem 0.375rem;
    border-radius: 4px;
    transition: color 0.15s ease;

    &:hover {
      color: #ff2c4f;
    }
  }
}

.kanban-col-droppable {
  border: 2px dashed #d0d5dd;
  border-radius: 8px;
  background-color: rgba(249, 250, 251, 0.6);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.kanban-col-active-target {
  border-color: $color-primary-300;
  background-color: rgba(255, 223, 228, 0.35);
}

.btn-custom-h {
  height: 42px !important;
  border: 1px solid #ced4da !important;
}
</style>