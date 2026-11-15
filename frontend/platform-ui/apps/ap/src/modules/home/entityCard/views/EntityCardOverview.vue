<template>
<CalculumLoading v-if="loadingNewContent || logsActivityLoading" :modal="true"></CalculumLoading>
<EntityCardReqChanges v-if="isReqChangesModalOpen" @close="closeReqChangesModal" :supplierId="companyId" :spendFileVersion="spendFileVersionActiveIri"></EntityCardReqChanges>
<EntityExportPDF v-if="showExportPDFModal" :supplierName="supplierName" :dataSupplier="dataSupplier" @close="showExportPDFModal = false"></EntityExportPDF>
<CalculumLayout :containerClass="'entity-sections'" :forPotentialTheme="potentialTheme" :containerId="'header-entitycard'" :showFooter="noFooterDisplay" :customWidth="showAgentPanel ? '80%' : '100%'" :customWidthActivity="showAgentPanel ? '20%' : '0%'">
  <template v-slot:slotTop>
    <div class="row mb-3" v-if="!loading">
      <div class="col-12 d-flex">
        <div class="col-11" :style="'gap: 9px;'">
          <div class="d-flex name-entity gap-3">
            <div class="align-items-center"><img v-if="!ImagesErrorBoolean" :src="logoUrlFromBucketS3" @error="imagesError" style="height: 40px; width: auto; max-width: 120px;" loading="lazy"/>
              <div class="circle" v-else><span class="text-base font-semibold font-weight-bold">{{ letterOfDomain }}</span></div>
            </div>
            <div class="d-flex flex-column">
              <Tooltip :anchor-element="'target'" :position="'top'">
                <div class="text-2xl font-medium" :title="supplierName" :class="{'text-gray-700' : !potentialTheme, 'potential-theme-font': potentialTheme}">{{ supplierName }} </div>
                <div v-if="companyType !== 'parent'" class="text-xs font-normal" :title="originalSupplierName" :class="{'text-gray-500' : !potentialTheme, 'potential-theme-font': potentialTheme}">{{`${$t('home.entityCard.receivedName')} ${originalSupplierName}`}}</div>
              </Tooltip>
              <!-- US-17561 AC-05/AC-06: identify the active filter and let the user clear it -->
              <GlobalFilterNotice class="mt-2" :message="$t('globalFilters.notice.entityCard')" show-filter-labels show-remove @remove="onRemoveGlobalFilter" />
            </div>
            <div class="align-items-center">
              <Tooltip :anchor-element="'target'" :position="'top'">
                <div class="flag-country-entity-card my-auto mr-1" :style="`background-image: url('${ entityDetails.supplierCountryFlagUrl }') !important;`" :title="entityDetails.supplierCountry"></div>
              </Tooltip>
            </div>
            <PillLabelNumberBadge v-if="companyType != 'supplier'" :label="companyTypeFormatted" :label-classes="companyType+'-type'"></PillLabelNumberBadge>
            <div class="div" v-if="smeFeatureEnabled && isSME">
              <Tooltip :anchor-element="'target'" :position="'top'">
                <smeBadge class="sme-badge-icon medium" :class="{ 'ml-2': companyType === 'supplier' }" :title=" $t(`global.smeSource.tooltip${smeSource}`) "></smeBadge>
              </Tooltip>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-end">
          <CalculumClose class="cursor-pointer" :has-id="true" :for-potential-theme="potentialTheme" @click="$emit('close')"></CalculumClose>
        </div>
      </div>
    </div>
    <ParentNote :companyType="companyType??'supplier'" :loading="loading" @navigate-corporate-tree="changeButton('EntityCardCorporateTree')">       </ParentNote>
    <div class="row" v-if="loading">
      <div class="d-flex justify-content-end">
        <CalculumClose class="cursor-pointer" :has-id="true" :for-potential-theme="potentialTheme" @click="$emit('close')"></CalculumClose>
      </div>
      <HeaderSkeleton></HeaderSkeleton>
    </div>
    <div class="row" v-if="!loading">
      <div class="col-12 d-flex align-items-center justify-content-between mb-1 flex-nowrap">
        <EntityCardTabBar :tabs="visibleTopMenuTabs" :potentialTheme="potentialTheme"></EntityCardTabBar>
        <div class="d-flex align-items-center p-0 m-0 flex-nowrap">
          <div class="d-flex align-items-center p-0 m-0 flex-nowrap">
            <div class="d-flex text-sm mr-2 badge-for-recalculating-status" v-if="blockProgramOptions && !loading"><span class="px-2 py-1 rounded-xl truncate ml-auto mr-2 recalc-status-pill" :class="pendingRecalculation ? 'pending-recalculation' : 'recalculating-in-progress'">{{ labelForRecalculatingStatus }}         </span></div>
            <HomeProgramStatusDropdown v-if="!loading" :listOptions="currentPrograms" :selectedProgramUri="StringUtils.removeIRI(selectedProgramUri)" :programTarget="programTarget ?? ''" @select-program-dropdown="selectProgram"></HomeProgramStatusDropdown>
          </div>
          <div class="col-1 d-flex align-items-center">
            <div id="open-entity-agent" class="d-flex flex-column container-activity-icon cursor-pointer" @click="toggleAgentPanel">
              <div class="icon-activity cursor-pointer" :class="{ 'active': showAgentPanel }"><span class="icon-activity-badge-wrapper">
                <Tooltip :anchor-element="'target'" :position="'top'">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewbox="0 0 24 24" fill="none" :title="'Agent'">
                    <path d="M3 5C3 3.34315 4.34315 2 6 2H18C19.6569 2 21 3.34315 21 5V15C21 16.6569 19.6569 18 18 18H9L5 22V18H6C4.34315 18 3 16.6569 3 15V5Z" stroke="#98a2b3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
                  </svg><span class="activity-unread-badge" v-if="activityLogsUnreadCount > 0">{{ activityLogsUnreadCount > 99 ? '99+' : activityLogsUnreadCount }}</span>
                  </Tooltip>
                </span></div>
            </div>
            <div class="d-flex icon-container"><a class="d-flex border-none" id="options-btn" @click="() => showOptionsMenu = !showOptionsMenu" :style="{ 'color' : potentialTheme ? '#fff' : '#667085' }">
                <iconEllipsisVertical class="three-dots-icon my-auto"></iconEllipsisVertical></a>
              <div class="dropdown-container" id="options-menu" v-if="showOptionsMenu">
                <ul class="d-flex flex-column menu-items-list">
                  <li class="menu-item pointer" @click="openReqChangesModal" data-testid="entity-card-request-change-menu-item"><span class="d-flex text-gray-500 container-svg-and-text">
                      <iconPencil class="menu-icon mr-2 fill-current"></iconPencil><span>{{ $t('home.entityCard.reqDataChanges.reqAChange') }}</span></span></li>
                  <li class="menu-item pointer" v-if="programTarget === 'cashFlow' && !disabledProgram && (companyType !== 'supplier' || useFeatureDownloadPdfEntity)" @click="openExportPDFModal" data-testid="entity-card-download-pdf-menu-item"><span class="d-flex text-gray-500 container-svg-and-text">
                      <iconPDF class="menu-icon mr-2 fill-current"></iconPDF><span>Download PDF</span></span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections p-3 rounded-lg mt-4" :class="loading ? potentialTheme ? 'bg-potential' : 'bg-white' : 'bg-gray'">
      <div class="row" v-if="loading">
        <div class="col-12">
          <NegotiationSkeleton></NegotiationSkeleton>
        </div>
      </div>
      <KeepAlive>
        <component v-if="!loading" @change-data="handleRefreshTabs" @redirectToSpendEvent="redirectToNavigation" @close="$emit('close')" @changeTab="changeButton" :companyId="companyId" :companyType="companyType" :country="country" :creditData="creditData" :disabledProgram="disabledProgram" :entityCharacteristics="entityCharacteristics" :entityDetails="entityDetails" :fromDifferentSupplier="fromDifferentSupplier" :is="effectiveSelectedButton" :isLoadingEntityCard="loading" :key="effectiveSelectedButton + keyComponent" :overviewTabEventUUID="selectedSpendFileEmitUUID" :programData="programData" :programUuid="selectedProgramUri" :programTarget="programTarget" :retrieveAllSpends="retrieveAllSpends" :spendAlias="spendAlias" :programIsRecalculating="programInrecalculation" :programIsPendingRecalculation="pendingRecalculation" :hasFinancing="hasFinancing" :smeRelated="{isSME : isSME, smeSource : smeSource}" :hasHarmonization="hasHarmonization" :isSuperAdmin="userIsSuperAdmin" :useFeatureCreditRating="useFeatureCreditRating" :entityName="supplierName" :moduleName="'entityCard'" :logoUrlFromBucketS3="logoUrlFromBucketS3" :potentialTheme="potentialTheme"> </component>
      </KeepAlive>
    </div>
  </template>
  <template v-slot:activityContent>
    <div v-if="showAgentPanel" class="side-panel">
      <div class="side-panel-header">
        <div class="side-panel-tabs">
          <button type="button" class="side-panel-tab" :class="{ active: activityPanelActiveTab === 'activity' }" @click="activityPanelActiveTab = 'activity'">Activity</button>
          <button v-if="showNegotiationAgent" type="button" class="side-panel-tab" :class="{ active: activityPanelActiveTab === 'agent' }" @click="activityPanelActiveTab = 'agent'">Agent</button>
        </div>
        <div v-if="activityPanelActiveTab === 'agent' && showNegotiationAgent" class="side-panel-agent-actions">
          <button class="side-panel-agent-action" title="New chat" @click="agentPanelRef?.newChat()">
            <svg class="ico" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
          </button>
          <button
            class="side-panel-agent-action"
            :class="{ active: agentPanelRef?.historyOpen }"
            title="Past negotiation strategies"
            @click="agentPanelRef?.toggleHistory()"
          >
            <svg class="ico" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3" />
              <path d="M8 5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
          </button>
          <button class="side-panel-agent-action" title="Copy conversation" @click="agentPanelRef?.copyConversation()">
            <svg v-if="agentPanelRef?.copied" class="ico" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else class="ico" viewBox="0 0 16 16" fill="none">
              <rect x="5.5" y="2.5" width="8" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3" />
              <path d="M10.5 11.5v.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.5A1.5 1.5 0 0 1 4 4h.5" stroke="currentColor" stroke-width="1.3" />
            </svg>
          </button>
        </div>
        <button class="side-panel-close" @click="showAgentPanel = false" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="side-panel-content">
        <KeepAlive>
          <ActivityPanel
            v-if="activityPanelActiveTab === 'activity' || !showNegotiationAgent"
            :standalone="false"
            :entityName="supplierName"
            :entityLevel="companyType"
            :activities="logsByEntity"
            :mentionableUsers="mentionableUsers"
            :has-more="activityLogsHasNextPage"
            :loading-more="activityLogsLoading"
            :totalItems="totalItems"
            @refresh="handleRefreshActivity"
            @load-more="loadMoreLogs"
            @submit-comment="handleSubmitComment"
          ></ActivityPanel>
          <ChatAgentPanel
            v-else-if="showNegotiationAgent"
            ref="agentPanelRef"
            class="side-panel-agent"
            :supplierId="companyId"
            :entityName="supplierName"
            :entityLevel="companyType ?? 'supplier'"
          />
        </KeepAlive>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  toRefs,
  watch,
} from "vue";

import { getMediaUrl } from "@/services/media/mediaActions";
import { ImageType } from "@/services/media/mediaTypes";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useI18n } from "vue-i18n";
import { useAnalyzeStore } from '@/stores/analyze';
import { useAppStore } from '@/stores/app';
import { useEntityCardStore } from '@/stores/entityCard'
import { useSubscribeStore } from '@/stores/subscribe';
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import GlobalFilterNotice from '@/modules/globalFilters/components/GlobalFilterNotice.vue';
import * as formatData from "@/utils/FormatData";
import {
  getInitial,
  formatCompanyType as formatCompanyTypeUtil,
  shouldBlockProgramOptions as shouldBlockOptions,
  isFinancingFeatureEnabled as checkFinancingEnabled
} from "@/utils/EntityCardUtils";
import { CalculumLayout, CalculumLoading } from '@ada/design-system'
import EntityCardCalculator from "@/modules/home/entityCard/views/EntityCardCalculator.vue";
import EntityCardCompanyDetails from "@/modules/home/entityCard/views/EntityCardCompanyDetails.vue";
import EntityCardCorporateTree from "@/modules/home/entityCard/views/EntityCardCorporateTreeTab.vue";
import EntityCardNegotiation from "@/modules/home/entityCard/views/EntityCardNegotiation.vue";
import ChatAgentPanel from "@/modules/home/entityCard/components/ChatAgentPanel.vue";
import EntityCardRatingsAndMetrics from "@/modules/home/entityCard/views/EntityCardRatingsAndMetrics.vue";
import EntityCardReqChanges from "@/modules/home/entityCard/components/EntityCardReqChanges.vue";
import HeaderSkeleton from "@/modules/home/components/skeletons/HeaderSkeleton.vue";
import HomeProgramStatusDropdown from "@/modules/home/components/HomeProgramStatusDropdown.vue";
import iconEllipsisVertical from "@/resources/assets/images/icons/iconEllipsisVertical.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import NegotiationSkeleton from "@/modules/home/components/skeletons/NegotiationSkeleton.vue";
import CalculumClose from "@/modules/components/CalculumClose.vue";
import PillLabelNumberBadge from "@/modules/components/PillLabelNumberBadge.vue";
import smeBadge from "@/resources/assets/images/icons/smeBadge.vue";
import useUser from "@/services/user/composables/useUser";
import { useToast } from 'vue-toastification';
import EntityExportPDF from "@/modules/home/entityCard/pdf/EntityExportPDF.vue";
import EntityCardFinancing from "@/modules/home/entityCard/views/EntityCardFinancing.vue";
import EntityCardNews from "@/modules/home/entityCard/views/EntityCardNews.vue";
import EntityCardSupplierController from "@/modules/home/entityCard/views/EntityCardSupplierController.vue";
import useApolloClient from "@/services/graphql/useApolloClient";
import { useValuePropositionStore } from '@/stores/valueProposition'
import iconPDF from "@/resources/assets/images/icons/iconPDF.vue";
import ActivityPanel from "@/modules/home/entityCard/components/ActivityPanel.vue";
import ParentNote from "@/modules/home/entityCard/components/ParentNote.vue";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import useEntityCardTitle from "@/modules/home/entityCard/composables/useEntityCardTitle";
import useEntityActivityLogs from "@/modules/home/entityCard/composables/useEntityActivityLogs";
import useEntityPrograms from "@/modules/home/entityCard/composables/useEntityPrograms";
import useTopMenuTabs from "@/modules/home/entityCard/composables/useTopMenuTabs";
import EntityCardTabBar from "@/modules/home/entityCard/components/EntityCardTabBar.vue";

// Types
import { EntityCard } from "@/types";

// Utils
import { StringUtils, IsSMEUtils } from "@/utils";
import useNegotiationStatus from "@/modules/negotiationStatus/composables/useNegotiationStatus";
import { useSpendFile, useProgram } from "@/composables";

import ReceivablesMockup3 from '@/modules/home/views/ReceivablesMockup3.vue'
import ReceivablesMockup4 from '@/modules/home/views/ReceivablesMockup4.vue'
import ReceivablesMockup5 from '@/modules/home/views/ReceivablesMockup5.vue'

export default defineComponent({
  name: "EntityCardTopMenu",
  components: {
    CalculumLayout,
    GlobalFilterNotice,
    CalculumClose,
    CalculumLoading,
    EntityCardCalculator,
    EntityCardCompanyDetails,
    EntityCardCorporateTree,
    EntityCardNegotiation,
    ChatAgentPanel,
    EntityCardRatingsAndMetrics,
    EntityCardReqChanges,
    HeaderSkeleton,
    HomeProgramStatusDropdown,
    iconEllipsisVertical,
    iconPencil,
    NegotiationSkeleton,
    PillLabelNumberBadge,
    smeBadge,
    Tooltip,
    EntityExportPDF,
    iconPDF,
    EntityCardFinancing,
    EntityCardNews,
    ActivityPanel,
    ParentNote,
    ReceivablesMockup3,
    ReceivablesMockup4,
    ReceivablesMockup5,
    EntityCardSupplierController,
    EntityCardTabBar,
  },
  props: {
    companyId: { type: String, required: true },
    country: { type: String, default: "" },
    fromDifferentSupplier: { type: String, required: false, default: "" },
    noFooterDisplay: { type: Boolean, required: false, default: true },
    potentialTheme: { type: Boolean, required: false },
    spendAlias: { type: String, required: false, default: null },
  },
  emits: ["close"],
  setup(props) {
    const analyzeStore = useAnalyzeStore();
    const entityCardStore = useEntityCardStore();
    const subscribeStore = useSubscribeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const valuePropositionStore = useValuePropositionStore()
    const appStore = useAppStore()
    const itemsPerPageGlobal = ref(20);
    

    const { useFeatureSME, useFeatureCreditRating, useFeature9BoxesFinancing, useFeatureEntityCardNewsletter, userIsSuperAdmin, useFeatureSupplierInsights, useFeatureDownloadPdfEntity, useAiBotNegotiation } = useUser();

    // The whole calculum-ui integration is production-only; see .env's committed default.
    const calculumAgentEnabled = import.meta.env.VITE_ENABLE_CALCULUM_AGENT === "true";

    // The negotiation agent is shown only to super admins of companies with the AI Bot Negotiation feature.
    const showNegotiationAgent = computed(() => calculumAgentEnabled && useAiBotNegotiation.value && userIsSuperAdmin.value);

    // req changes modal bool
    const isReqChangesModalOpen = ref(false);



    const { apolloClientResetStore } = useApolloClient();



    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return useFeatureSME.value;
    })


    // *** END Notes ***

    // *** Req Changes ***

    // when user clicks on the svg icon, modal opens
    const openReqChangesModal = () => {
      data.showOptionsMenu = false;
      isReqChangesModalOpen.value = true;
    };

    // when user click close, modal closes
    const closeReqChangesModal = () => {
      isReqChangesModalOpen.value = false;
    };

    // *** END Req Changes ***

    interface EntityCardTopMenu {
      apiPrograms: any[];
      creditData: any[];
      currentPrograms: any[];
      disabledProgram: boolean;
      hasSCF: boolean;
      entityCharacteristics: EntityCharacteristics;
      entityDetails: Partial<EntityCard.EntityDetails>;
      hasFinancing: boolean;
      hasHarmonization: boolean;
      ImagesErrorBoolean: boolean;
      keyComponent: number;
      loading: boolean;
      originalSupplierName: string;
      pendingRecalculation: boolean;
      programData: any;
      programInrecalculation: boolean;
      programTarget: string | null;
      retrieveAllSpends: any[];
      selectedButton: EntityCard.EntityCardPage;
      selectedProgramUri: string | null;
      selectedSpendFileEmitUUID: string;
      showOptionsMenu: boolean;
      supplierDomain: string;
      supplierLogoUrl: string;
      supplierName: string;
      isSME: boolean;
      smeSource: string | null;
      showExportPDFModal: boolean;
      dataSupplier: any | null,
      loadingNewContent: boolean;
      showAgentPanel: boolean;
      activityPanelActiveTab: 'activity' | 'agent';
    }

    interface EntityCharacteristics {
      creditScore: {
        color: string;
        description: string;
        value: number;
      };
      buyerLeverage: {
        color: string;
        description: string;
        value: number;
      };
      supplierLeverage: {
        color: string;
        description: string;
        value: number;
      };
      brandingScore: {
        color: string;
        description: string;
        value: number;
      };
      frequency: {
        color: string;
        description: string;
        value: number;
      };
      companySizeDescription: string;
      country: string;
      region: string;
      sector: string;
      industry: string;
      commodity: string;
      dataDepth: {
        color: string;
        description: string;
        value: number;
      };
      esg: {
        color: string;
        description: string;
        value: number;
      };
      dei: {
        color: string;
        description: string;
        value: number;
      };
      countryRating: {
        color: string;
        description: string;
        value: number;
      };
    }

    function createEmptyEntityCharacteristics(): EntityCharacteristics {
      return {
        creditScore: { color: "", description: "", value: 0 },
        buyerLeverage: { color: "", description: "", value: 0 },
        supplierLeverage: { color: "", description: "", value: 0 },
        brandingScore: { color: "", description: "", value: 0 },
        frequency: { color: "", description: "", value: 0 },
        companySizeDescription: "",
        country: "",
        region: "",
        sector: "",
        industry: "",
        commodity: "",
        dataDepth: { color: "", description: "", value: 0 },
        esg: { color: "", description: "", value: 0 },
        dei: { color: "", description: "", value: 0 },
        countryRating: { color: "", description: "", value: 0 },
      };
    }

    /**
     * The subset of EntityCardTopMenu shared by the initial reactive() shape and
     * resetState(). hasSCF, showExportPDFModal, dataSupplier, loadingNewContent and
     * keyComponent are deliberately NOT part of this shape — resetState never reset
     * them either, so folding them in here would change resetState's behaviour.
     */
    function createResettableEntityCardState() {
      return {
        apiPrograms: [] as any[],
        creditData: [] as any[],
        currentPrograms: [] as any[],
        disabledProgram: false,
        entityCharacteristics: createEmptyEntityCharacteristics(),
        entityDetails: {} as Partial<EntityCard.EntityDetails>,
        ImagesErrorBoolean: false,
        loading: true,
        originalSupplierName: "",
        pendingRecalculation: false,
        programData: {} as any,
        programInrecalculation: false,
        programTarget: "" as string | null,
        retrieveAllSpends: [] as any[],
        selectedButton: "EntityCardNegotiation" as EntityCard.EntityCardPage,
        selectedProgramUri: null as string | null,
        selectedSpendFileEmitUUID: "",
        showOptionsMenu: false,
        supplierDomain: "",
        supplierLogoUrl: "",
        supplierName: "",
        hasFinancing: false,
        hasHarmonization: false,
        isSME: false,
        smeSource: "default" as string | null,
      };
    }

    const data = reactive<EntityCardTopMenu>({
      ...createResettableEntityCardState(),
      hasSCF: false,
      keyComponent: new Date().getUTCMilliseconds(),
      selectedButton: initializeTab(),
      showExportPDFModal: false,
      dataSupplier: null,
      loadingNewContent: false,
      showAgentPanel: false,
      activityPanelActiveTab: 'activity',
    });

    // Activity content is visible when the unified side panel is open and its
    // Activity tab is selected (there's no longer a separate Activity panel/icon).
    const showActivityPanel = computed(() => data.showAgentPanel && data.activityPanelActiveTab === 'activity');

    const {
      logsByEntity,
      mentionableUsers,
      activityLogsLoading,
      activityLogsHasNextPage,
      activityLogsUnreadCount,
      activityPanelMarkedAsReadOnce,
      logsActivityLoading,
      totalItems,
      getMentionableUsers,
      getLogsByEntity,
      loadMoreLogs,
      markLogsAsRead,
      handleRefreshActivity,
      handleSubmitComment,
    } = useEntityActivityLogs({
      companyId: () => props.companyId,
      itemsPerPage: () => itemsPerPageGlobal.value,
      isActivityPanelOpen: () => showActivityPanel.value,
      activePanelTab: () => data.activityPanelActiveTab,
    });

    const { setBrowserTitlebyTab } = useEntityCardTitle();
    // Template ref on <ChatAgentPanel>, which re-exposes CalculumApp's own defineExpose()
    // API — lets the "Agent" tab header (New chat / History / Copy / Full screen) drive the
    // widget's chat actions directly instead of duplicating that logic here.
    const agentPanelRef = ref<InstanceType<typeof ChatAgentPanel> | null>(null);


     function initializeTab() {
      return "EntityCardNegotiation";      
    }

    
    function changeTabOverview() {
      data.selectedButton = "EntityCardNegotiation";      
      setBrowserTitlebyTab(data.selectedButton)
    }


    function changeTabRatingNMetrics() {
      data.selectedButton = "EntityCardRatingsAndMetrics";      
      setBrowserTitlebyTab(data.selectedButton)
    }

    const { spendFileVersionActiveIri, spendFileVersionActiveId } = useSpendFile();
    const { programSelectedId } = useProgram();

    const logoUrlFromBucketS3 = computed(() => {
      if (data.supplierLogoUrl) {
        imagesError(false);
        return getMediaUrl(data.supplierLogoUrl, ImageType.MEDIA);
      } else {
        imagesError(true);
        return undefined; // Return undefined instead of null to match img src type expectations
      }
    });

    const letterOfDomain = computed(() => {
      return getInitial(data.supplierName);
    });

    // *** Company type ***

    const companyType = computed(() => {
      return data.entityDetails.companyType;
    });

    const companyTypeFormatted = computed(() => {
      return formatCompanyTypeUtil(companyType.value);
    });


    async function handleRefreshTabs() {
      await apolloClientResetStore()
      changeData();
    }

    const globalFiltersStore = useGlobalFiltersStore();

    /**
     * US-17561 AC-06: clearing the filter from the entity card notice drops every
     * applied global filter and reloads the card through the same path the tabs
     * use, so every metric and grid comes back on the full dataset.
     */
    async function onRemoveGlobalFilter() {
      // The reload is NOT called here: clearing the store mutates filtersApplied, which
      // the watcher below picks up and refreshes through the very same path. Calling it
      // here too would reload the tabs twice on one click.
      globalFiltersStore.setFiltersApplied({ filters: [], logic: 'and' })
    }

    /**
     * US-17587 AC-06: when the filter CHANGES while a card is open, the card must update
     * too. The supplier list, the internal spend grid (ListNegotiation) and the corporate
     * tree each watch the store themselves, but the card header and the opportunity charts
     * had no watcher, so their metrics kept showing the previous filter's figures until
     * the card was reopened (Bug#18535).
     *
     * Also serves AC-07 (revert on clear) for the "Remove filter" link above.
     *
     * RACE CONDITION GUARD: cleanupBeforeCompanyChange() resets filtersApplied to []
     * before the company API calls complete, which would fire this watcher with
     * selectedProgramId / activeSpendFileVersion still belonging to the previous company.
     * Same guard and shape as ListNegotiation's watcher.
     * See docs/context/race-condition-company-change.md.
     */
    watch(
      () => globalFiltersStore.getFiltersApplied,
      async () => {
        if (globalFiltersStore.getDisableWatchers) {
          return
        }
        // handleRefreshTabs() is NOT enough here: it only clears the Apollo cache and sets
        // selectedTabIndex to 0 (already 0 most of the time), while the tab itself lives in
        // <KeepAlive> keyed by selectedButton + keyComponent. Without bumping the key the tab
        // is never remounted, so its REST calls (/spends, cashflow-or-savings-overview,
        // spend-thousands-overview, payment-terms-volume-history, calculator) keep the figures
        // of the previous filter - most visibly when the filter is REMOVED from inside the card.
        // Reload the same way selectProgram() and the props watcher already do.
        await apolloClientResetStore()
        getEntityDetails(false)
        data.keyComponent++
      }
    )

    /**
     * Change active tab
     */
    function changeButton(page: EntityCard.EntityCardPage) {
      // Change active tab
      data.selectedButton = page;
      setBrowserTitlebyTab(data.selectedButton)
    }

    function imagesError(e: any) {
      data.ImagesErrorBoolean = e;
    }

    function redirectToNavigation(
      uuid: string,
      stayInTheSameOverview: boolean,
    ) {
      const myUuid = stayInTheSameOverview ? uuid : props.fromDifferentSupplier;

        data.selectedSpendFileEmitUUID = myUuid;
        data.selectedButton = "EntityCardNegotiation";
        changeData();

    }

    const { getUserSupplierPrograms, selectProgram, retrieveProgramData } = useEntityPrograms({
      data,
      companyId: () => props.companyId,
      getCreditScore: () => getCreditScore(),
    });

    function postAddNewRecentEntityCard() {
      const params = {
        companyId: props.companyId,
        targetSpendFileVersionUuid: spendFileVersionActiveIri.value,
        callbackSuccess: () => {},
        callbackError: () => {},
      };
      entityCardStore.postAddNewRecentEntityCard(params);
    }

    // *** Entity Details ***

    const { negotiationStatusGetStatusesTranslated } = useNegotiationStatus();

    /**
     * Get entity details from API
     * Route: GET /api/entity-card/entity/{id}/detail
     *
     * @returns {void}
     */
    function getEntityDetails(initialLoading: boolean = true): void {
      // Enable Loading
      data.loading = initialLoading;

      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: EntityCard.EntityDetails) => {
          // Negotiation Status
          callbackSuccessData.negotiationStatusCodes =
            negotiationStatusGetStatusesTranslated(
              callbackSuccessData.negotiationStatusCodes,
            );

          // Save response data
          data.entityDetails = callbackSuccessData;

          // Save supplier name
          if (callbackSuccessData.supplierName !== null) {
            data.supplierName = callbackSuccessData.supplierName;
          }

          // Save supplier domain
          if (callbackSuccessData.supplierDomain !== null) {
            data.supplierDomain = callbackSuccessData.supplierDomain;
          }

          // Save supplier logo url
          if (callbackSuccessData.supplierLogoUrl !== null) {
            data.supplierLogoUrl = callbackSuccessData.supplierLogoUrl;
            imagesError(false);
          }

          // Save original supplier name
          if (callbackSuccessData.originalSupplierName !== null) {
            data.originalSupplierName =
              callbackSuccessData.originalSupplierName || "";
          }

          data.isSME = callbackSuccessData.isSME;
          data.smeSource =  IsSMEUtils.generateSMESourceKey(callbackSuccessData?.smeSource)

          if (initialLoading) {
            getUserSupplierPrograms();
            // Get entity characteristics
            getEntityCharacteristics();
          } else {
            retrieveAllSpends(true);
          }


        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV)
            console.error("** Error in getEntityDetails", callbackErrorData);

          // Disable Loading
          if (data.loading) data.loading = false;
        },
      };

      entityCardStore.getEntityCardSupplierDetail(params);
    }



    // *** END Entity Details ***

    const { entitySelectedTrackingNumber } = useEntity();

    //- This reload is for the endpoint that does not change the program status
    watch(entitySelectedTrackingNumber,  async () => {
      await apolloClientResetStore();
      analyzeStore.setHarmonizationsGroupsbyProgram([]);
      analyzeStore.setFinancingsGroupsbyProgram([]);
      getEntityDetails(false);
    });

    //- This reload is when some api change the program status.
    //  immediate: seed the recalc flags from the current store value on mount, so the pill
    //  shows even when the card is opened while a recalculation is already in progress
    //  (the watcher would otherwise only react to later transitions).
    watch(
      () => subscribeStore.refreshPrograms,
      async (newValue, oldValue) => {
        switch (newValue) {
          case "calculationPending":
            data.programInrecalculation = true;
            data.pendingRecalculation = true;
            break;
          case "updating":
          case "recalculating":
            data.programInrecalculation = true;
            data.pendingRecalculation = false;
            break;
          case "ready":
            // On the immediate (mount) invocation oldValue is undefined: only seed
            // state, never trigger the reload — there's no transition to react to yet.
            if (oldValue === undefined) break;
            await apolloClientResetStore();
            analyzeStore.setHarmonizationsGroupsbyProgram([]);
            analyzeStore.setFinancingsGroupsbyProgram([]);
            getEntityDetails(false);
            break;
          default:
            break;
        }
      },
      { immediate: true },
    );

    /** To subscribe to the notifications by uuid program */

    function getCreditScore() {

      if (!useFeatureCreditRating.value) {
        retrieveAllSpends();
        return
      }

      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          let retrieveColors = formatData.getCreditValues(
            callbackSuccessData?.supplier?.adaScoreDescription ?? '',
          );
          callbackSuccessData.supplier.percentPie = retrieveColors[0];
          callbackSuccessData.supplier.colorPie = retrieveColors[1];

          if (callbackSuccessData.parent) {
            retrieveColors = formatData.getCreditValues(
              callbackSuccessData?.parent?.adaScoreDescription ?? '',
            );
            callbackSuccessData.parent.percentPie = retrieveColors[0];
            callbackSuccessData.parent.colorPie = retrieveColors[1];
          }
          data.creditData = callbackSuccessData;
          retrieveAllSpends();
        },
        callbackError: (callbackErrorData: any) => {
          retrieveAllSpends();
        },
      };

      entityCardStore.getCreditScoreChart(params);
    }

    /**
     * Retrieve characteristics from server
     */
    function getEntityCharacteristics(): void {
      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          data.entityCharacteristics = callbackSuccessData.characteristics;
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV)
            console.error(
              "** Error in getEntityCharacteristics",
              callbackErrorData,
            );
        },
      };

      entityCardStore.getCharacteristics(params);
    }

    function retrieveAllSpends(resetProgramData: boolean = false) {
      if (data.selectedProgramUri !== null) {
        const params = {
          companyId: props.companyId,
          programId: data.selectedProgramUri,
          callbackSuccess: (callbackSuccessData: any) => {
            data.retrieveAllSpends = callbackSuccessData;

            // Disable loading
            data.loading = false;
            if (resetProgramData) {
              data.programInrecalculation = false;
              data.pendingRecalculation = false;
            }
          },
          callbackError: (callbackErrorData: any) => {
            if (import.meta.env.DEV)
              console.error("** Error in retrieveAllSpends", callbackErrorData);
            // Disable loading
            data.loading = false;
          },
        };

        entityCardStore.getSpendsBySupplier(params);
      }
      // There's no program selected
      else {
        // Disable loading
        data.loading = false;
      }
    }


    // Add reset function to clean up state
    function resetState() {
      Object.assign(data, createResettableEntityCardState());
      refreshLogsSection()
    }


    function refreshLogsSection() {
      data.showAgentPanel = false;
      data.activityPanelActiveTab = 'activity';
      activityPanelMarkedAsReadOnce.value = false;
      getLogsByEntity();
      mentionableUsers.value = [];
      getMentionableUsers();
    }

    // Props watcher with improved cleanup
    watch(props, async () => {
      // Let the IA assistant know it's about to be torn down before the
      // forced remount below destroys it without patching its props.
      entityCardStore.triggerAssistantExit();

      // Reset state before updating with new data
      resetState();

      // Cancel any pending requests and reset cache
      await apolloClientResetStore();

      // Update with new data
      await getEntityDetails();
      postAddNewRecentEntityCard();

      // Force component refresh
      data.keyComponent = new Date().getUTCMilliseconds();
    });

    // Watch for fromDifferentSupplier changes
    watch(() => props.fromDifferentSupplier, () => {
      if (props.fromDifferentSupplier) {
        resetState();
        redirectToNavigation(
          props.fromDifferentSupplier,
          false,
        );
      }
    });

    // *** END Negotiation Status ***

    // *** Setup ***

    postAddNewRecentEntityCard();

    // Populate supplier data
    getEntityDetails();


    // *** END Setup ***

    /**
     * onMounted
     */
    onMounted(() => {
      getLogsByEntity();
      getMentionableUsers();
      const options = document.querySelectorAll(".page-content");

      for (const element of options) {
        element.classList.remove("container-padding");
      }

      //for options menu
      document.body.addEventListener("click", menuPopup);
      setBrowserTitlebyTab(data.selectedButton)
    });

    /**
     * controls the menu pop when clicked outside
     */
    function menuPopup(e: any) {
      if (
        e.target.closest("#options-btn") ||
        e.target.closest("#options-menu")
      ) {
        return;
      }

      if (e.target.closest("#options-menu") !== null) {
        data.showOptionsMenu = true;
      }

      if (e.target.closest("#options-menu") === null) {
        data.showOptionsMenu = false;
      }
    }

    const setTitleForsupplier = computed(() => {
      return 'Supplier Insights'
    })


    async function changeData() {
      await apolloClientResetStore()
    }

    /**
     * onUnmounted
     */
    onUnmounted(() => {
      document.body.addEventListener("click", menuPopup);
    });

    const labelForRecalculatingStatus = computed(() => {
      if (data.programInrecalculation) {
        return translate.t("global.programInrecalculation");
      }
      if (data.pendingRecalculation) {
        return translate.t("global.pendingRecalculation");
      }
      return null;
    });

    const blockProgramOptions = computed(() => {
      return shouldBlockOptions(data.programInrecalculation, data.pendingRecalculation);
    });

    // Supplier Insights tab: allow only if user has feature role
    const effectiveSelectedButton = computed<EntityCard.EntityCardPage>(() => {
      if (
        (data.selectedButton as any) === 'EntityCardSupplierController' &&
        !useFeatureSupplierInsights.value
      ) {
        return 'EntityCardNegotiation' as EntityCard.EntityCardPage;
      }
      return data.selectedButton as EntityCard.EntityCardPage;
    });

    const isFinancingEnabled = computed(() => {
      return checkFinancingEnabled(
        data.hasFinancing,
        useFeature9BoxesFinancing.value
      );
    })

    /**
     * Tab descriptors for the top menu tab bar. Centralizes what used to be
     * 9 near-identical hardcoded <a> tags in the template.
     */
    const { visibleTopMenuTabs } = useTopMenuTabs({
      state: () => ({
        programTarget: data.programTarget,
        disabledProgram: data.disabledProgram,
        useFeatureSupplierInsights: useFeatureSupplierInsights.value,
        isFinancingEnabled: isFinancingEnabled.value,
        hasSCF: data.hasSCF,
        potentialTheme: !!props.potentialTheme,
        useFeatureEntityCardNewsletter: useFeatureEntityCardNewsletter.value,
        userIsSuperAdmin: userIsSuperAdmin.value,
        allowShowTabOptionsReceivablesMockup4: false,
        selectedButton: data.selectedButton,
      }),
      translate,
      setTitleForsupplier,
      handlers: {
        changeButton,
        changeTabOverview,
        changeTabRatingNMetrics,
      },
    });

    //-Request data export to pdf

    function requestNewContentApi() {


      const dataToExport = {
        level: companyType.value,
        entityUuid: props.companyId
      }

      data.loadingNewContent = true
      const params = {
          entities: [dataToExport],
          spendFileVersionUuid: spendFileVersionActiveId.value,
          activeProgramDefaultId: programSelectedId.value,
          codeCurrency: appStore.getCurrencyTo,
          callbackSuccess: (callBackSucessData: any) => {
            data.dataSupplier = callBackSucessData[0]
            data.showExportPDFModal = true
            data.loadingNewContent = false
          },
          callbackError: () => {
            toast.error(translate.t('error.server500'));
            data.dataSupplier = null
            data.showExportPDFModal = false
            data.loadingNewContent = false
          }
      }
      valuePropositionStore.requestNewContentToExportSupplierPDF(params)
    }

    function openExportPDFModal() {
      data.showOptionsMenu = false;
      requestNewContentApi();
    }

    // Side panel handlers

    function toggleAgentPanel() {
      data.showAgentPanel = !data.showAgentPanel;
    }

    return {
      ...toRefs(data),
      agentPanelRef,
      blockProgramOptions,
      changeButton,
      changeData,
      effectiveSelectedButton,
      userIsSuperAdmin,
      calculumAgentEnabled,
      showNegotiationAgent,
      useFeatureSupplierInsights,
      useFeatureDownloadPdfEntity,
      closeReqChangesModal,
      companyType,
      companyTypeFormatted,
      handleRefreshTabs,
      onRemoveGlobalFilter,
      imagesError,
      isReqChangesModalOpen,
      labelForRecalculatingStatus,
      letterOfDomain,
      logoUrlFromBucketS3,
      menuPopup,
      openReqChangesModal,
      redirectToNavigation,
      selectProgram,
      smeFeatureEnabled,
      spendFileVersionActiveIri,
      StringUtils,
      useFeatureCreditRating,
      useFeatureEntityCardNewsletter,
      requestNewContentApi,
      isFinancingEnabled,
      openExportPDFModal,
      showActivityPanel,
      toggleAgentPanel,
      handleRefreshActivity,
      handleSubmitComment,
      getLogsByEntity,
      loadMoreLogs,
      logsByEntity,
      mentionableUsers,
      activityLogsLoading,
      activityLogsHasNextPage,
      activityLogsUnreadCount,
      logsActivityLoading,
      totalItems,
      changeTabOverview,
      changeTabRatingNMetrics,      
      setTitleForsupplier,      
      visibleTopMenuTabs,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/_colors";
@import "src/resources/assets/styles/utils/_borders.scss";

.notes-button {
  & * {
    transition: all 0.3s ease;
  }

  &:hover {
    border: none;

    & * {
      text-decoration: none;
      color: $color-primary-700;
    }
  }
}

.btn.btn-entity-card-top-menu {
  display: flex;
  align-items: center;
  background-color: $basewhite;
  border-color: $gray300;
  border-right-style: solid;
  gap: 8px;
  justify-content: center;
  padding: 10px 16px;
  width: fit-content;
}

.new-terms-is-active {
  fill: $color-red;
  width: 12px !important;
  height: auto;
  border-radius: 5px;
  margin-right: 5px;
}

.circle {
  width: 40px;
  height: 40px;
  -moz-border-radius: 50%;
  -webkit-border-radius: 50%;
  border-radius: 50%;
  background: $color-gray-300;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    color: white !important;
  }

  span {
    color: white;
  }
}

.circle-green {
  left: 40%;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: $color-green-600;
}

.circle-orange {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: $color-yellow-700;
}

.container-steady {
  padding-inline: 25px !important;
}

.pill-badge {
  max-width: 20ch;
  border: 1px solid transparent;
}

//
// Responsive
//
@media only screen and (max-width: 1500px) {
  .container-steady {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }
}

option.program-active {
  background: $color-gray-light;
  background-image: url("@/resources/assets/images/icons/checklist.svg");
  background-size: 20px 20px;
  background-repeat: no-repeat;
  background-position: 98% 50%;
}

#options-menu {
  z-index: 1041;
  position: absolute;
  width: max-content;
  left: -10rem;
  top: 2.5rem;

  .container-svg-and-text:hover {
    cursor: pointer;

    span {
      color: $color-primary-500;
    }

    svg {
      fill: $color-primary-500 !important;

      path {
        fill: $color-primary-500 !important;
      }
    }

    .menu-icon {
      color: $color-primary-500;

      svg {
        fill: $color-primary-500 !important;

        path {
          fill: $color-primary-500 !important;
        }
      }
    }
  }
}

// Three dots icon
.three-dots-icon {
  max-height: 16px;

  &.potential-icon {
    &:hover {
      fill: $color-primary-500;
    }
  }

  &.default-icon {
    &:hover {
      fill: $color-primary-500;
    }
  }
}

.options-menu-btn {
  max-width: 40px;
  background-color: transparent;
  border: none;
}

// Overriding the default style of the dropdown menu
.fix-menu {
  position: absolute; // Add this line
  margin-top: 0;
  // right: 0; // You can uncomment this line if you want it aligned to the right
  top: 40px;
}

.dropdown-container {
  position: relative;
  top: 40px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 1rem;
  border-radius: 8px;
  width: fit-content;
  border: 1px solid #eaecf0;

  .menu-items-list {
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .menu-item {
    margin: 0;
    padding: 0;
  }

  .menu-icon {
    width: 20px !important;
    height: 20px !important;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 20px !important;
      height: 20px !important;
      display: block;
    }
  }
}

.align-items-baseline {
  align-items: baseline;
  gap: 9px;
}

.notes-btn-container {
  cursor: pointer;

  &:hover {
    .notes-count {
      color: #fff;
      background-color: $color-primary-500;
    }

    .notes-container-svg {
      background-color: $color-brand-light;
    }
  }
}

.notes-count {
  width: 21px;
  height: 21px;
  font-size: 0.5rem;
  font-weight: 600;
  position: relative;
  top: -12px;
  left: -15px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-primary-600;
  color: #fff;
}

.loading-container {
  width: 90vw;
}

.bg-potential {
  background-color: $color-gray-700;
}

.potential-theme-font {
  color: #fff;
}

#offset-left {
  position: relative;
  left: -25px;
}

.bg-white {
  background-color: #fff;
}

.bg-gray {
  background-color: $color-gray-100;
}

.flag-country-entity-card {
  width: 35.8px;
  height: 35.8px;
  display: inline-block !important;
  border-radius: 50%;
  border: 1px solid $color-gray-400;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: cover !important;
}


.container-activity-icon {
  align-items: center;
}

.icon-activity {
  background: $color-white;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  padding: 3px;

  &.active {
    background: $color-primary-100;
  }

  &:hover {
    background: $color-primary-100;
  }
}

.icon-activity-badge-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.activity-unread-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: $color-primary-500;
  color: #fff;
  font-size: 8px;
  font-weight: 600;
  border-radius: 9px;
  line-height: 1;
}

#supplier-insights-tab .badge-beta {
  background-color: $color-purple-600;
  color: #fff !important;
  font-size: 9px;
  font-weight: 600;
  border-radius: 4px;
  padding: 2px 5px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  vertical-align: middle;
  line-height: 1;
}

// Unified Activity / Agent side panel
.side-panel {
  display: flex;
  flex-direction: column;
  height: calc(125vh);
  background-color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media screen and (max-width: 1600px) {
    height: calc(125vh - 5vh);
  }

  @media screen and (max-width: 1350px) {
    height: calc(125vh - 15vh);
  }
}

.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $color-gray-200;
  background-color: #ffffff;
  flex-shrink: 0;
}

.side-panel-tabs {
  display: flex;
  gap: 4px;
}

.side-panel-tab {
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: $color-gray-500;
  cursor: pointer;
  transition: all 0.15s ease;

  &.active {
    color: $color-gray-900;
    background-color: $color-gray-100;
    font-weight: 600;
  }

  &:hover:not(.active) {
    color: $color-gray-700;
    background-color: $color-gray-50;
  }
}

.side-panel-agent-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  margin-right: 8px;
}

.side-panel-agent-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: $color-gray-500;
  cursor: pointer;
  transition: all 0.15s ease;

  .ico {
    width: 15px;
    height: 15px;
  }

  &.active {
    color: #4338ca; // darker than the background tint on purpose — #6366f1 fails WCAG AA contrast here
    background-color: rgba(99, 102, 241, 0.1);
  }

  &:hover:not(.active) {
    color: $color-gray-700;
    background-color: $color-gray-50;
  }
}

.side-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  border-radius: 6px;
  color: $color-gray-500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: $color-gray-100;
    color: $color-gray-700;
  }
}

.side-panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.side-panel-agent {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

</style>
