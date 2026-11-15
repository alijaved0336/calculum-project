<template>
<ExclusionReasonModal></ExclusionReasonModal>
<MultipleSuppliersExportPDF v-if="showMultipleExportModal" :suppliers="suppliersForExport" :levelOfGrid="levelGridFromGrid" @close="closeMultipleExportModal" @export-complete="handleMultipleExportComplete"></MultipleSuppliersExportPDF>
<CalculumSpendsActiveModal @hide-modal="modalSpends = false, nameActiveProgram = ''" :nameActiveProgram="nameActiveProgram" :spendsActive="spendsActive" :singleSpend="singleSpend" v-if="modalSpends"></CalculumSpendsActiveModal>
<CalculumSetTargetEditProgram @hide-modal="modalTarget = false" @save-target="saveTarget" v-if="modalTarget"></CalculumSetTargetEditProgram>
<CalculumSetSuppliersStandard @hide-modal="modalSupplierStandard = false, levelGridFromGrid = ''" @save-data="saveSupplierStandard" v-if="modalSupplierStandard"></CalculumSetSuppliersStandard>
<CalculumSetPeerGroupStandard @hide-modal="modalPeerGroupStandard = false, levelGridFromGrid = ''" @save-data="savePeerGroupStandard" v-if="modalPeerGroupStandard"></CalculumSetPeerGroupStandard>
<CalculumConfirmTarget @hide-modal="modalConfirmTarget = false, targetAmount = 0, levelGridFromGrid = ''" @save-target="saveTargetAfterConfirm" v-if="modalConfirmTarget"></CalculumConfirmTarget>
<CalculumHarmonizationModal v-if="displayModelForHarmonization" @close="userRejectedHarmonization" @approve="userApprovedHarmonization" @cancel="userRejectedHarmonization" @clickedOutside=""></CalculumHarmonizationModal>
<CalculumMoveBetweenModal v-if="displayModelForMoveBetween" @close="userRejectedMoveBetween" @approve="userApprovedMoveBetween" @cancel="userRejectedMoveBetween"></CalculumMoveBetweenModal>
<CalculumManageTeamModal v-if="displayModelForManageTeam" @close="userRejectedManageTeam" @approve="userApprovedManageTeam" @cancel="userRejectedManageTeam"></CalculumManageTeamModal>
<CalculumManageCommodityModal v-if="displayModelForManageCommodity" @close="userRejectedManageCommodity" @approve="userApprovedManageCommodity" @cancel="userRejectedManageCommodity"></CalculumManageCommodityModal>
<CalculumManageCommodityModal v-if="displayModelForManageCustomColumn" @close="userRejectedManageCustomColumn" @approve="userApprovedManageCustomColumn" @cancel="userRejectedManageCustomColumn"></CalculumManageCommodityModal>
<CalculumModal v-if="isModalForClearTargetBulkDisplaying" @close="() => isModalForClearTargetBulkDisplaying = false" :size="'md'" :showClose="true" :title="$t('global.confirm')">
  <template v-slot:modalContent>
    <div class="d-flex flex-column"><span>{{ $t('home.entityCard.modalDetails.changingOrClearingTarget') }}</span>
      <div class="d-flex align-items-center mt-4 mb-4"><span class="font-weight-600 mr-1">{{ $t('home.entityCard.modalDetails.note') }} </span><span>{{ $t('home.entityCard.modalDetails.programWillRecalculate') }}</span></div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => isModalForClearTargetBulkDisplaying = false" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
    <button class="btn btn-primary font-md" v-if="!applySelectedEntitiesBulkTargetButtonClicked" @click="applySelectedEntitiesBulkTargetChanges(true)" style="z-index: 1; width: fit-content">{{ $t('global.continue') }} </button>
    <button class="btn btn-primary font-md" v-else style="z-index: 1; width: fit-content;"><span class="spinner-border spinner-border-sm">  </span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="isModalForTargetBulkDisplaying" @close="() => isModalForTargetBulkDisplaying = false" :size="'md'" :showClose="true" :title="$t('global.confirm')">
  <template v-slot:modalContent>
    <div class="d-flex flex-column"><span>{{ $t('home.entityCard.modalDetails.changingOrClearingTarget') }} </span>
      <div class="d-flex align-items-center mt-4 mb-4"><span class="font-weight-600 mr-1">{{ $t('home.entityCard.modalDetails.note') }} </span><span>{{ $t('home.entityCard.modalDetails.programWillRecalculate') }}</span></div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => isModalForTargetBulkDisplaying = false" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
    <button class="btn btn-primary font-md" v-if="!applySelectedEntitiesBulkTargetButtonClicked" @click="applySelectedEntitiesBulkTargetChanges(false)" style="z-index: 1; width: fit-content">{{ $t('global.continue') }} </button>
    <button class="btn btn-primary font-md" v-else style="z-index: 1; width: fit-content;"><span class="spinner-border spinner-border-sm">  </span></button>
  </template>
</CalculumModal>
<div class="row">
  <div class="col-12">
    <CalculumLoading v-if="loadingNewContent || exportOverlay" :modal="true" withDescription="withDescription" :description="exportLoadingMessage"></CalculumLoading>
    <CalculumModal v-if="showLargeExportConfirm" :size="'md'" :title="$t('home.analyze.list.largeExportTitle')" :showClose="true" @close="cancelLargeExport">
      <template v-slot:modalContent>
        <p>{{ $t('home.analyze.list.largeExportWarning', { count: pendingExportCount.toLocaleString() }) }}</p>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="cancelLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.cancel') }}</span></button>
        <button class="btn btn-primary font-md" @click="confirmLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.continue') }}</span></button>
      </template>
    </CalculumModal>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadSpends || loadExport), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SPEND_LINES }">
      <CalculumGridGraphql v-if="dataSpends" :handleEditProgramAction="true" @changeTabFromGrid="changeTabFromGrid" @dataChange="dataChange" @exportCSV="exportCSV" @grid-add-group="gridAddGroup" @grid-add-vgroup="gridAddVGroup" @grid-exclude="gridExclude" @grid-include-pilot="gridIncludePilot" @grid-remove="gridRemove" @negotiation-status-changed="negotiationStatusOnChanged" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" @selectAllRow="selectAllRow" @selectRow="selectRow" @show-harmonization-modal="getDataHarmonizationModal" @show-spend-modal="showSpendModal" @show-target-clear-modal="showModalTargetClear" @show-target-modal="showModalTarget" @update-row-data-parent="updaterowData" @show-move-between-modal="getDataMoveBetweenModal" @manage-team-move="manageTeamMove" @manage-team-remove="manageTeamRemove" @manage-commodity-move="manageCommodityMove" @manage-commodity-remove="manageCommodityRemove" @manage-custom-column-move="manageCustomColumnMove" @manage-custom-column-remove="manageCustomColumnRemove" @manage-supplier-industry-move="manageSupplierIndustryMove" @manage-supplier-credit-rating-move="manageSupplierCreditRatingMove" @manage-supplier-ultima-parent-move="manageSupplierUltimaParentMove" :allowExportExcel="false" :adjustPilotAccount="true" :collectionQuery="'collectionQueryProgramListSpends'" :companyType="companyType" :defaultPageSize="filterSettings.paginationSpends.first" :editList="true" :enabledPagination="true" :filter="filterSettings.filterSpends" :filterable="true" :gridColumns="gridColumnsSpendsComputed" :gridData="dataSpends" :gridHeight="gridHeight" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :hideEditColumnMenu="hideEditColumnMenu" :key="keySpends" :levelOfGrid="'spends'" :section="'program'" :selectable="isSelectable" :selectedProgramId="selectedProgramId" :selectedTabFromView="entityLevelTabSelected" :showTabsLevels="true" :skip="filterSettings.paginationSpends.after" :sort="filterSettings.sortSpends" :sortable="true" :take="filterSettings.paginationSpends.first" :programInrecalculation="programInrecalculation" :total="totalSpends" :loading="loadSpends" :totalsBycolumns="totalsBycolumnsSpends" :allowMoveBetween="true">   </CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadSuppliers || loadExport), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SUPPLIERS }">
      <CalculumGridGraphql v-if="dataSuppliers" :handleEditProgramAction="true" @changeTabFromGrid="changeTabFromGrid" @dataChange="dataChange" @exportCSV="exportCSV" @grid-add-group="gridAddGroup" @grid-add-vgroup="gridAddVGroup" @grid-exclude="gridExclude" @grid-include-pilot="gridIncludePilot" @grid-remove="gridRemove" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" @selectAllRow="selectAllRow" @selectRow="selectRow" @show-harmonization-modal="getDataHarmonizationModal" @show-spend-modal="showSpendModal" @show-target-clear-modal="showModalTargetClear" @show-target-modal="showModalTarget" @update-row-data-parent="updaterowData" @show-supplier-standard-modal="showSupplierStandardModal" @show-peer-group-standard-modal="showPeerGroupStandardModal" @show-move-between-modal="getDataMoveBetweenModal" @show-multiple-export-modal="requestNewContentApi" @manage-team-move="manageTeamMove" @manage-team-remove="manageTeamRemove" @manage-commodity-move="manageCommodityMove" @manage-commodity-remove="manageCommodityRemove" @manage-custom-column-move="manageCustomColumnMove" @manage-custom-column-remove="manageCustomColumnRemove" @manage-supplier-industry-move="manageSupplierIndustryMove" @manage-supplier-credit-rating-move="manageSupplierCreditRatingMove" @manage-supplier-ultima-parent-move="manageSupplierUltimaParentMove" :allowExportExcel="false" :adjustPilotAccount="true" :collectionQuery="'collectionQueryProgramListSuppliers'" :companyType="companyType" :defaultPageSize="filterSettings.paginationSuppliers.first" :editList="true" :enabledPagination="true" :filter="filterSettings.filterSuppliers" :filterable="true" :gridColumns="gridColumnsSuppliersComputed" :gridData="dataSuppliers" :gridHeight="gridHeight" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :hideEditColumnMenu="hideEditColumnMenu" :isExpanded="true" :key="keySuppliers" :levelOfGrid="'suppliers'" :nameTemplateChild="'detailTemplateSupplierAnalyzeEdit'" :rowColors="true" :section="'program'" :selectable="isSelectable" :selectedProgramId="selectedProgramId" :selectedTabFromView="entityLevelTabSelected" :showTabsLevels="true" :skip="filterSettings.paginationSuppliers.after" :sort="filterSettings.sortSuppliers" :sortable="true" :take="filterSettings.paginationSuppliers.first" :programInrecalculation="programInrecalculation" :total="totalSuppliers" :loading="loadSuppliers" :totalsBycolumns="totalsBycolumnsSuppliers" :allowMoveBetween="true"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadParents || loadExport), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.ULTIMATE_PARENT }">
      <CalculumGridGraphql v-if="dataParents" :handleEditProgramAction="true" @changeTabFromGrid="changeTabFromGrid" @dataChange="dataChange" @exportCSV="exportCSV" @grid-add-group="gridAddGroup" @grid-add-vgroup="gridAddVGroup" @grid-exclude="gridExclude" @grid-include-pilot="gridIncludePilot" @grid-remove="gridRemove" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" @selectAllRow="selectAllRow" @selectRow="selectRow" @show-harmonization-modal="getDataHarmonizationModal" @show-spend-modal="showSpendModal" @show-target-clear-modal="showModalTargetClear" @show-target-modal="showModalTarget" @update-row-data-parent="updaterowData" @show-move-between-modal="getDataMoveBetweenModal" @show-multiple-export-modal="requestNewContentApi" @manage-team-move="manageTeamMove" @manage-team-remove="manageTeamRemove" @manage-commodity-move="manageCommodityMove" @manage-commodity-remove="manageCommodityRemove" @manage-custom-column-move="manageCustomColumnMove" @manage-custom-column-remove="manageCustomColumnRemove" @manage-supplier-industry-move="manageSupplierIndustryMove" @manage-supplier-credit-rating-move="manageSupplierCreditRatingMove" @manage-supplier-ultima-parent-move="manageSupplierUltimaParentMove" :allowExportExcel="false" :adjustPilotAccount="true" :collectionQuery="'collectionQueryProgramListParents'" :companyType="companyType" :defaultPageSize="filterSettings.paginationParents.first" :editList="true" :enabledPagination="true" :filter="filterSettings.filterParents" :filterable="true" :gridColumns="gridColumnsParentsComputed" :gridData="dataParents" :gridHeight="gridHeight" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :hideEditColumnMenu="hideEditColumnMenu" :isExpanded="true" :isForParent="true" :key="keyParents" :levelOfGrid="'parents'" :nameTemplateChild="'detailTemplateParentAnalyzeEdit'" :rowColors="true" :section="'program'" :selectable="isSelectable" :selectedProgramId="selectedProgramId" :selectedTabFromView="entityLevelTabSelected" :showTabsLevels="true" :skip="filterSettings.paginationParents.after" :sort="filterSettings.sortParents" :sortable="true" :take="filterSettings.paginationParents.first" :programInrecalculation="programInrecalculation" :total="totalParents" :loading="loadParents" :totalsBycolumns="totalsBycolumnsParents" :allowMoveBetween="true"></CalculumGridGraphql>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  reactive,
  ref,
  toRefs,
  watch,
} from "vue";

import { ArrayUtils, ENTITY_LEVEL, NumberUtils, StringUtils } from "@/utils";
import {
  defaultProgramGridSpendEditColumn,
  defaultProgramGridSuppliersEditColumns,
  defaultProgramGridUltimateParentEditColumns,
} from "../data/graphqlColums";
import { FilterChangeEvent } from "@/types/filterSettings";
import { Grid } from "@progress/kendo-vue-grid";
import { NegotiationStatus } from "@/types";
import { nodesEdges } from "../data/nodesEdges";
import { onBeforeRouteLeave } from "vue-router";
import { saveExcel } from "@progress/kendo-vue-excel-export";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { translate } from "@/utils/translation";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useNegotiationStatusStore } from "@/stores/negotiationStatus";
import { useHomeStore } from "@/stores/home";
import { useUserStore } from "@/stores/user";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
import * as cacheGrid from "@/utils/dataGridClear";
import * as formatData from "@/utils/FormatData";
import * as graphqlUtils from "@/utils/graphqlUtils";
import { apolloClient } from "@/services/graphql/apolloClient";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import CalculumConfirmTarget from "@/modules/components/CalculumConfirmTarget.vue";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import CalculumHarmonizationModal from "@/modules/components/CalculumHarmonizationModal.vue";
import CalculumMoveBetweenModal from "@/modules/components/CalculumMoveBetweenModal.vue";
import CalculumManageTeamModal from "@/modules/components/CalculumManageTeamModal.vue";
import CalculumManageCommodityModal from "@/modules/components/CalculumManageCommodityModal.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumSetPeerGroupStandard from "@/modules/components/CalculumSetPeerGroupStandard.vue";
import CalculumSetSuppliersStandard from "@/modules/components/CalculumSetSuppliersStandard.vue";
import CalculumSetTargetEditProgram from "@/modules/components/CalculumSetTargetEditProgram.vue";
import CalculumSpendsActiveModal from "@/modules/components/CalculumSpendsActiveModal.vue";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import useSpendFile from "@/composables/useSpendFile";
import useUser from "@/services/user/composables/useUser";
import { ListCFEditDataInterface } from "@/modules/home/analyze/types/index";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import useCompany from "@/composables/useCompany";
import useSMEFeature from "@/composables/useSMEFeature";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import * as HomeAPI from "@/modules/home/api";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { useAnalyzeStore } from "@/stores/analyze";
import { useExclusionReasonStore } from "@/stores/exclusionReason";
import { useAppStore } from "@/stores/app";
import { useSubscribeStore } from "@/stores/subscribe";
import { useConsistentFetch } from "@/composables/useConsistentFetch";
import MultipleSuppliersExportPDF from "@/modules/home/entityCard/pdf/MultipleSuppliersExportPDF.vue";
import ExclusionReasonModal from "@/modules/components/ExclusionReasonModal.vue";
import { SupplierExportData } from "@/composables/useMultiplePDFExport";
import { useValuePropositionStore } from "@/stores/valueProposition";
import { useGridExport } from "@/modules/home/analyze/composables/useGridExport";

function applyColumnProp(columns: any[], field: string, prop: string, value: any): void {
  const idx = columns.findIndex((x: any) => x.field === field);
  if (idx > -1) {
    columns[idx][prop] = value;
  }
}

function renameColumn(cols: any[], field: string, title: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].title = title;
}

function showColumn(cols: any[], field: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].hidden = false;
}

function removeColumn(cols: any[], field: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols.splice(idx, 1);
}

function hideColumn(cols: any[], field: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].hidden = true;
}

export default defineComponent({
  name: "ListsCFEdit",
  components: {
    ExclusionReasonModal,
    CalculumConfirmTarget,
    CalculumGridGraphql,
    CalculumHarmonizationModal,
    CalculumLoading,
    CalculumModal,
    CalculumSetPeerGroupStandard,
    CalculumSetSuppliersStandard,
    CalculumSetTargetEditProgram,
    CalculumSpendsActiveModal,
    Grid,
    CalculumMoveBetweenModal,
    CalculumManageTeamModal,
    CalculumManageCommodityModal,
    MultipleSuppliersExportPDF,
  },
  props: {
    companyType: { type: String, required: false, default: null },
    hasFinancing: { type: Boolean, required: true },
    hasHarmonization: { type: Boolean, required: true },
    isSelectable: { type: Boolean, required: true, default: true },
    keyLists: { type: Number, required: true, default: 0 },
    programInrecalculation: { type: Boolean, required: true },
    selectedProgramId: { type: String, required: true },
    handleEditProgramAction: { type: Boolean, required: false, default: false },
  },
  emits: ["show-harmonization-modal", "update:selectedItems"],
  setup(props, { emit }) {
    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const userStore = useUserStore();
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid);
    const analyzeStore = useAnalyzeStore();
    const exclusionReasonStore = useExclusionReasonStore();
    // Load custom data point (21-26) types so days columns format without decimals and aggregate
    // as weighted avg in the footer. Keyed to the active program.
    watch(() => props.selectedProgramId, (id) => {
      if (id) analyzeStore.loadCustomDataPointTypes(id)
    }, { immediate: true })
    const negotiationStatusStore = useNegotiationStatusStore();
    const gridMenuActionsStore = useGridMenuActionsStore();
    const subscribeStore = useSubscribeStore();
    const toast = useToast();

    // Excel export UX (loading overlay kept until the workbook is actually
    // generated + large-dataset confirmation) — WI#17080. The overlay ref is
    // aliased to exportOverlay so it does not collide with data.loadExport,
    // which is reused as the mutation/bulk-action overlay in this view.
    const {
      loadExport: exportOverlay,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      startExport,
      confirmLargeExport,
      cancelLargeExport,
      resetExport,
    } = useGridExport({
      exportData: (params: any) => homeStore.exportData(params),
      saveExcel,
      t: translate.t,
      onError: (error) => {
        if (import.meta.env.DEV) console.error("Excel export generation failed", error);
        toast.error(translate.t("error.server500"));
      },
    });
    const {
      spendFileVersionActiveId,
      spendFileVersionActiveNameCustomDataPoints,
      spendFileVersionActiveCustomDataPointsHasData,
    } = useSpendFile();
    let dataSource = ref(null);
    let total = ref(0);
    let loader = ref(false);
    let pendingRequest: any;
    let currencyRate: number = useAppStore().getCurrencyAmount;

    const { usevCardGroupsEnabled } = useCompany();
    const { smeRelatedColumnsDisplayBasedOnSMEFeature } = useSMEFeature();
    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } =
      useFeatureCreditRating();
    const valuePropositionStore = useValuePropositionStore();
    const appStore = useAppStore();

    const {
      useFeatureScfStrategy,
      userIsSuperAdmin,
      isPilotAccount,
      useFeature9BoxesFinancing,
      useFeatureVirtualCard,
      useFeatureSupplierStandard,
      useFeaturePeerGroupStandard,
    } = useUser();

    let filterSettings: FilterChangeEvent = {
      //- Suppliers Grid Data
      paginationSuppliers: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterSuppliers: [],
      sortSuppliers: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc",
        },
      ],
      //- Parents Grid Data
      paginationParents: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterParents: [],
      sortParents: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc",
        },
      ],
      //- Spends
      paginationSpends: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterSpends: [],
      sortSpends: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc",
        },
      ],
    };

    const detailTemplateSupplier = ref("detailTemplateSupplier");

    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(
      globalFiltersStore.getFiltersApplied,
    );

    const data = reactive<ListCFEditDataInterface>({
      allChecked: false,
      applySelectedEntitiesBulkTargetButtonClicked: false,
      columnsToExport: [],
      customHeaders: [],
      customHasData: [],
      dataParents: [],
      dataSpends: [],
      dataSuppliers: [],
      displayModelForHarmonization: false,
      displayModelForMoveBetween: false,
      entityLevelTabSelected: homeStore.getEntityLevelTabSelected,
      filterForPatch: null,
      gridColumnsParents: getGridColumnsParents(),
      gridColumnsSpends: getGridColumnsSpends(),
      gridColumnsSuppliers: getGridColumnsSuppliers(),
      gridHeight: "auto",
      hideEditColumnMenu: false,
      isModalForClearTargetBulkDisplaying: false,
      isModalForTargetBulkDisplaying: false,
      keyParents: new Date().getUTCMilliseconds(),
      keySpends: new Date().getUTCMilliseconds(),
      keySuppliers: new Date().getUTCMilliseconds(),
      levelGridFromGrid: "",
      levelHarmonizationFromGrid: "",
      loadExport: false,
      loadParents: false,
      loadSpends: false,
      loadSuppliers: false,
      modalConfirmTarget: false,
      modalPeerGroupStandard: false,
      modalSpends: false,
      modalSupplierStandard: false,
      modalTarget: false,
      myCurrentObjectForTargetBulkValues: {
        key: "",
        value: "",
        levelOfGrid: "",
      },
      nameActiveProgram: "",
      selectedItems: [],
      setProgramInrecalculation: props.programInrecalculation,
      singleSpend: false,
      spendsActive: 0,
      targetAmount: 0,
      toExport: [],
      totalParents: 0,
      totalSpends: 0,
      totalSuppliers: 0,
      totalsBycolumnsSpends: [],
      totalsBycolumnsSuppliers: [],
      totalsBycolumnsParents: [],
      showMultipleExportModal: false,
      suppliersForExport: [],
      displayModelForManageTeam: false,
      displayModelForManageCommodity: false,
      displayModelForManageCustomColumn: false,
    });

    // Centralized data-fetch orchestration — handles first mount, refresh, and reactive changes.
    const consistentFetch = useConsistentFetch(
      [
        () => fetchDataSuppliers(true),
        () => fetchDataParents(true),
        () => fetchDataSpends(true),
      ],
      () => props.selectedProgramId,
      () => spendFileVersionActiveId.value,
    );

    // *** Entity ***

    const { entitySelectedTrackingNumber } = useEntity();

    // Update grids after entity change
    watch(entitySelectedTrackingNumber, () => {
      if (globalFiltersStore.getDisableWatchers) return;
      consistentFetch.triggerFetch();
    });

    // *** END Entity ***

    window.onresize = () => {
      setGridHeight();
    };

    onBeforeRouteLeave(async (to) => {
      await apolloClientResetStore();
      data.dataSpends = [];
      data.dataSuppliers = [];
      data.dataParents = [];

      data.gridColumnsSpends = [];
      data.gridColumnsSuppliers = [];
      data.gridColumnsParents = [];
    });

    function setGridHeight() {
      const getSubMain = document.getElementById("container-main-id");
      if (getSubMain) {
        if (getSubMain.clientHeight - 265 < 350) {
          data.gridHeight = "350px";
        } else {
          data.gridHeight = getSubMain.clientHeight - 265 + "px";
        }
      }
    }

    function applyPilotSettings(resetColumns: any[]): void {
      if (isPilotAccount()) {
        applyColumnProp(resetColumns, "parentName", "cell", "restrictModalEntitySupplier");
        if (userIsSuperAdmin.value) {
          applyColumnProp(resetColumns, "isPilot", "hidden", false);
        }
      } else if (userIsSuperAdmin.value) {
        const pilotIdx = resetColumns.findIndex((x: any) => x.field === "isPilot");
        if (pilotIdx > -1) resetColumns.splice(pilotIdx, 1);
      }
    }

    function getGridColumnsSuppliers(
      resetColumnsFlag: boolean = false,
    ): Array<any> {
      const columns: Array<any> = defaultProgramGridSuppliersEditColumns.map(
        (config: any) => ({ ...config }),
      );
      const gridCache = resetColumnsFlag
        ? []
        : homeStore.getHomeAnalyzeGridColumnsListSuppliersEdit;
      let resetColumns =
        gridCache?.length && JSON.stringify(columns) !== JSON.stringify(gridCache)
          ? cacheGrid.clearCache(columns, gridCache)
          : columns;

      applyPilotSettings(resetColumns);

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns);

      resetColumns = useFeatureVirtualCard.value && usevCardGroupsEnabled.value
        ? kendoChartRelated.showVCardColumnsRelated(resetColumns)
        : kendoChartRelated.removeVCardColumnsRelated(resetColumns);

      applyColumnProp(
        resetColumns, "spendCounts", "title",
        translate.t("home.analyze.table.numberOfSpends"),
      );
      applyColumnProp(resetColumns, "box", "hidden", true);
      applyColumnProp(resetColumns, "cashFlowImpactLabel", "hidden", true);
      applyColumnProp(resetColumns, "successProbabilityLabel", "hidden", true);

      resetColumns = cacheGrid.removeFinancingRelatedColumns(resetColumns, props.hasFinancing);
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(resetColumns, props.hasHarmonization);
      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy());
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value);
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value);

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns);
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns);
      resetColumns = cacheGrid.removePlanColumns(resetColumns);
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns);

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }
      homeStore.setHomeAnalyzeGridColumnsListSuppliersEdit(resetColumns);
      return resetColumns;
    }

    function getGridColumnsParents(
      resetColumnsFlag: boolean = false,
    ): Array<any> {
      const columns: Array<any> = [];
      defaultProgramGridUltimateParentEditColumns.forEach(function (
        config: any,
      ) {
        const newConfig = { ...config };
        columns.push(newConfig);
      });
      let resetColumns = [];
      const gridCache = resetColumnsFlag
        ? []
        : homeStore.getHomeAnalyzeGridColumnsListParentsEdit;
      /**
       * If "gridCache" is not empty and different from default grid columns array
       */
      if (
        gridCache &&
        gridCache.length &&
        JSON.stringify(columns) !== JSON.stringify(gridCache)
      ) {
        // Update cached data
        resetColumns = cacheGrid.clearCache(columns, gridCache);
        // ? - Use an action instead
      } else {
        // Use cached data
        resetColumns = columns;
      }
      if (userIsSuperAdmin.value && isPilotAccount()) {
        showColumn(resetColumns, 'isPilot');
      }

      if (userIsSuperAdmin.value && !isPilotAccount()) {
        removeColumn(resetColumns, 'isPilot');
      }

      /** Credit Rating Related */
      resetColumns =
        creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns);

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns =
          kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      renameColumn(resetColumns, 'entityName', translate.t('home.analyze.table.ultimateParentName'));
      renameColumn(resetColumns, 'supplierCounts', translate.t('home.analyze.table.numberOfSuppliers'));
      hideColumn(resetColumns, 'box');
      hideColumn(resetColumns, 'cashFlowImpactLabel');
      hideColumn(resetColumns, 'successProbabilityLabel');

      resetColumns = cacheGrid.removeFinancingRelatedColumns(
        resetColumns,
        props.hasFinancing,
      );
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(
        resetColumns,
        props.hasHarmonization,
      );
      resetColumns = cacheGrid.removescfGroupStandardStrategy(
        resetColumns,
        useFeatureScfStrategy(),
      );
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(
        resetColumns,
        useFeatureSupplierStandard.value,
      );
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(
        resetColumns,
        useFeaturePeerGroupStandard.value,
      );

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns);
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns);

      resetColumns = cacheGrid.removePlanColumns(resetColumns);
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }
      homeStore.setHomeAnalyzeGridColumnsListParentsEdit(resetColumns);
      return resetColumns;
    }



    function getGridColumnsSpends(resetColumnsFlag: boolean = false): any[] {
      const columns: Array<any> = [];

      defaultProgramGridSpendEditColumn.forEach(function (config: any) {
        const newConfig = { ...config };
        columns.push(newConfig);
      });
      let resetColumns = [];
      const gridCache = resetColumnsFlag
        ? []
        : homeStore.getHomeAnalyzeGridColumnsListSpendsEdit;

      /**
       * If "gridCache" is defined and not empty and different from default grid columns array
       */
      if (
        gridCache &&
        gridCache.length &&
        JSON.stringify(columns) !== JSON.stringify(gridCache)
      ) {
        // Update cached data
        resetColumns = cacheGrid.clearCache(columns, gridCache);
      } else {
        // Use cached data
        resetColumns = columns;
      }

      if (isPilotAccount()) {
        const parentName = resetColumns.findIndex(
          (x: any) => x.field === "parentName",
        );
        if (parentName > -1) {
          resetColumns[parentName].cell = "restrictModalEntitySpend";
        }
      }

      /** Credit Rating Related */
      resetColumns =
        creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns);

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns =
          kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      hideColumn(resetColumns, 'box');
      hideColumn(resetColumns, 'cashFlowImpactLabel');
      hideColumn(resetColumns, 'successProbabilityLabel');

      resetColumns = cacheGrid.removeFinancingRelatedColumns(
        resetColumns,
        props.hasFinancing,
      );
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(
        resetColumns,
        props.hasHarmonization,
      );
      resetColumns = cacheGrid.removescfGroupStandardStrategy(
        resetColumns,
        useFeatureScfStrategy(),
      );
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(
        resetColumns,
        useFeatureSupplierStandard.value,
      );
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(
        resetColumns,
        useFeaturePeerGroupStandard.value,
      );

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns);
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns);

      resetColumns = cacheGrid.removePlanColumns(resetColumns);
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }
      homeStore.setHomeAnalyzeGridColumnsListSpendsEdit(resetColumns);
      return resetColumns;
    }

    onMounted(async () => {
      getCustomHeaderTitles();
      setGridHeight();
      // Data loading is handled by useConsistentFetch (immediate watch).
    });

    async function loadGridsData(callTotalsValues: boolean = false) {
      data.loadExport = false;
      resetExport();

      switch (data.entityLevelTabSelected) {
        case ENTITY_LEVEL.SPEND_LINES:
          fetchDataSpends(callTotalsValues, true);
          break;

        case ENTITY_LEVEL.SUPPLIERS:
          fetchDataSuppliers(callTotalsValues, true);
          break;

        case ENTITY_LEVEL.ULTIMATE_PARENT:
          fetchDataParents(callTotalsValues, true);
          break;

        default:
          getGridColumnsSpends();
      }
    }

    /** Start Edition Fns */
    function getDataHarmonizationModal(level: any, levelOfGrid: string) {
      data.displayModelForHarmonization = !data.displayModelForHarmonization;
      data.levelHarmonizationFromGrid = level;
      data.levelGridFromGrid = levelOfGrid;
    }

    function userRejectedHarmonization() {
      data.displayModelForHarmonization = !data.displayModelForHarmonization;
      data.levelHarmonizationFromGrid = "";
      data.levelGridFromGrid = "";
    }

    function userApprovedHarmonization() {
      data.displayModelForHarmonization = !data.displayModelForHarmonization;
      gridAddGroup(
        null,
        "harmonizationGroup",
        data.levelHarmonizationFromGrid,
        data.levelGridFromGrid,
      );
    }

    function selectAllRow(rowData: any, checked: boolean) {
      data.allChecked = checked;
      if (data.entityLevelTabSelected === ENTITY_LEVEL.ULTIMATE_PARENT) {
        rowData.forEach(function (config: any) {
          const index = data.dataParents.findIndex(
            (x) => x.uuid === config.uuid,
          );
          data.dataParents[index].selected = checked;
          data.selectedItems.push(data.dataParents[index]);
        });
      }
      if (data.entityLevelTabSelected === ENTITY_LEVEL.SUPPLIERS) {
        rowData.forEach(function (config: any) {
          const index = data.dataSuppliers.findIndex(
            (x) => x.uuid === config.uuid,
          );
          data.dataSuppliers[index].selected = checked;
          data.selectedItems.push(data.dataSuppliers[index]);
        });
      }
      if (data.entityLevelTabSelected === ENTITY_LEVEL.SPEND_LINES) {
        rowData.forEach(function (config: any) {
          const index = data.dataSpends.findIndex(
            (x) => x.uuid === config.uuid,
          );
          data.dataSpends[index].selected = checked;
          data.selectedItems.push(data.dataSpends[index]);
        });
      }
      data.selectedItems = checked ? data.selectedItems : [];
      emit("update:selectedItems", data.selectedItems);
    }

    function selectRow(rowData: any) {
      data.allChecked = false;
      data.selectedItems = [];
      if (rowData.length > 0) {
        data.selectedItems = rowData;
      }
      emit("update:selectedItems", data.selectedItems);
    }

    function gridIncludePilot(action: boolean, levelOfGrid: string) {
      const changed = {
        key: "pilot",
        value: action,
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, "pilot", levelOfGrid);
    }

    // AB#20307: excluding (action === true) blocks on a reason - the popup resolves null if the
    // user cancels, in which case nothing is sent at all. Including needs no reason (it already
    // clears any existing one server-side).
    async function gridExclude(action: boolean, levelOfGrid: string) {
      const changed: Record<string, unknown> = {
        key: "disabled",
        value: action,
      };
      if (action) {
        const reason = await exclusionReasonStore.requestReason(
          props.selectedProgramId,
        );
        if (reason === null) return;
        changed.reason = reason;
      }
      const params = { changed };
      postByGroup(params, data.selectedItems, "disabled", levelOfGrid);
    }

    function gridAddVGroup(idGroup: string, levelOfGrid: string) {
      let value = idGroup ?? null;

      const changed = {
        key: "vCard",
        value: value,
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, "vCard", levelOfGrid);
    }

    function gridAddGroup(
      idGroup: any,
      type: string,
      typeharmonization: string | null,
      levelOfGrid: string,
    ) {
      let value;
      if (typeharmonization) {
        value = typeharmonization;
      } else {
        if (type === "financingGroup" && idGroup !== null) {
          value = StringUtils.removeIRI(idGroup);
        } else {
          value = null;
        }
      }

      const changed = {
        key: type,
        value: value,
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, type, levelOfGrid);
    }

    function gridRemove(type: string, levelOfGrid: string) {
      const changed = {
        key: type,
        value: null,
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, type, levelOfGrid);
    }

    async function postByGroup(
      getParams: any,
      items: any,
      type: string,
      levelOfGrid: string,
    ) {
      await apolloClientResetStore();
      if (!isResetting.value) {
        data.loadExport = true;
        //- type, for the reactivity
        let filters = {
          telerikFilter: formatData.convertFiltersToREST(data.filterForPatch),
          targetProgramUuid: props.selectedProgramId,
          globalFilter: formatData.convertFiltersToREST(
            globalFiltersStore.getFiltersApplied,
          ),
          currencyRate,
        };
        const uuids: Array<any> = [];
        items.forEach(function (item: any) {
          uuids.push(item.uuid);
        });
        const params = {
          program: props.selectedProgramId,
          changed: getParams.changed,
          uuids: data.allChecked ? null : uuids,
          filters,
          level: levelOfGrid,
          all: data.allChecked,
          callbackSuccess: () => {
            data.loadExport = false;
            data.levelHarmonizationFromGrid = "";
            data.levelGridFromGrid = "";
            data.selectedItems = [];
            data.keySpends++;
            data.keySuppliers++;
            data.keyParents++;
            loadGridsData(true);
          },
          callbackError: (callbackError: any) => {
            data.loadExport = false;
            if (callbackError.data.subject === "spendAlreadyInActiveProgram") {
              data.spendsActive = callbackError.data.records.length;
              data.singleSpend = false;
              data.modalSpends = true;
            } else {
              toast.error(translate.t("global.noty.errorUpdatingData"));
            }
            loadGridsData(false);
          },
        };
        if (uuids.length > 0)
          analyzeStore.postProgramSpendConfigurationbyGroups(params);
      }
    }

    // *** GraphQL ***

    async function updaterowData() {
      await apolloClientResetStore();
      if (!isResetting.value) {
        await loadGridsData();
      }
    }

    // *** END GraphQL ***

    function showSpendModal(nameProgram: any) {
      data.nameActiveProgram = nameProgram;
      data.modalSpends = true;
      data.singleSpend = true;
    }

    function saveTarget(target: number) {
      data.targetAmount = target;
      data.modalTarget = false;

      if (data.levelGridFromGrid === "spends") {
        saveTargetAfterConfirm();
      } else {
        data.modalConfirmTarget = true;
      }
    }

    function saveSupplierStandard(
      supplierStandard: number | null,
      thirdQuartile: number | null,
      maxValue: number | null,
      numberOfOccurrences: number | null,
    ) {
      data.modalSupplierStandard = false;
      const changed = {
        key: "supplierStandardCustom",
        value: {
          supplierStandard: supplierStandard,
          thirdQuartile: thirdQuartile,
          maxValue: maxValue,
          numberOfOccurrences: numberOfOccurrences,
        },
      };
      const params = { changed };
      postByGroup(
        params,
        data.selectedItems,
        "supplierStandardCustom",
        data.levelGridFromGrid,
      );
    }

    function savePeerGroupStandard(
      peerGroupStandard: number | null,
      thirdQuartile: number | null,
      maxValue: number | null,
      numberOfOccurrences: number | null,
    ) {
      data.modalPeerGroupStandard = false;
      const changed = {
        key: "peerGroupCustom",
        value: {
          peerGroupStandard: peerGroupStandard,
          thirdQuartile: thirdQuartile,
          maxValue: maxValue,
          numberOfOccurrences: numberOfOccurrences,
        },
      };
      const params = { changed };
      postByGroup(
        params,
        data.selectedItems,
        "supplierStandardCustom",
        data.levelGridFromGrid,
      );
    }

    function saveTargetAfterConfirm() {
      data.modalTarget = false;
      data.modalConfirmTarget = false;
      const changed = {
        key: "targetPaymentTerms",
        value: data.targetAmount,
      };
      const params = { changed };

      postByGroup(
        params,
        data.selectedItems,
        "targetPaymentTerms",
        data.levelGridFromGrid,
      );
      data.levelGridFromGrid = "";
      data.targetAmount = 0;
    }

    /**
     * shows the clear target confirmation
     */

    function showModalTargetClear(levelOfGrid: string) {
      data.levelGridFromGrid = levelOfGrid;
      data.isModalForClearTargetBulkDisplaying = true;
    }

    /**
     * shows the Tagget Modal for Bulk Values,
     * saves the myTargetObject for the api params
     */
    function showModalTarget(myTargetObject: {
      key: string;
      value: string;
      levelOfGrid: string;
    }) {
      data.myCurrentObjectForTargetBulkValues = myTargetObject;
      data.isModalForTargetBulkDisplaying = true;
    }

    function resetCheckedProperty(level: string) {
      if (level === "spends") {
        data.dataSpends.forEach((item: any) => {
          item.selected = false;
        });
        data.keySpends++;
      }
      if (level === "suppliers") {
        data.dataSuppliers.forEach((item: any) => {
          item.selected = false;
        });
        data.keySuppliers++;
      }
      if (level === "parents") {
        data.dataParents.forEach((item: any) => {
          item.selected = false;
        });

        data.keyParents++;
      }
    }

    /**
     * Sends the request to the API to set the target values for the entities selected in the grid. If the `resetValues` flag is true, the target is cleared for the selected entities. If the flag is false, the target is set to the value specified in `data.myCurrentObjectForTargetBulkValues`. The uuids of the selected entities are sent in the `uuids` property of the `params` object. The `callbackSuccess` and `callbackError` functions are called accordingly based on the response from the API. The `callbackSuccess` function resets the `data.selectedItems` array, sets `data.isModalForTargetBulkDisplaying` to false, and calls the `loadGridsData` function to reload the data in the grid. The `callbackError` function shows a notification with an error message and sets `data.isModalForTargetBulkDisplaying` to true and `data.applySelectedEntitiesBulkTargetButtonClicked` to false.
     */

    function applySelectedEntitiesBulkTargetChanges(resetValues: boolean) {
      // data.applySelectedEntitiesBulkTargetButtonClicked = true
      data.isModalForClearTargetBulkDisplaying = false;
      data.isModalForTargetBulkDisplaying = false;

      const changed = {
        key: "targetPaymentTerms",
        value: resetValues
          ? "clear"
          : data.myCurrentObjectForTargetBulkValues.value,
      };
      const params = { changed };

      const setLevelGridByAction = resetValues
        ? data.levelGridFromGrid
        : data.myCurrentObjectForTargetBulkValues.levelOfGrid;

      postByGroup(
        params,
        data.selectedItems,
        "targetPaymentTerms",
        setLevelGridByAction,
      );
    }

    function showSupplierStandardModal(level: string) {
      data.modalSupplierStandard = true;
      data.levelGridFromGrid = level;
    }

    function showPeerGroupStandardModal(level: string) {
      data.modalPeerGroupStandard = true;
      data.levelGridFromGrid = level;
    }

    /** End Edition Fns */
    async function pageChangeHandler(event: any) {
      data.selectedItems = [];
      switch (data.entityLevelTabSelected) {
        case ENTITY_LEVEL.SPEND_LINES:
          if (event.event.value) {
            filterSettings.paginationSpends = {
              first: event.event.value,
              after: 0,
              skip: 0,
            };
          } else {
            filterSettings.paginationSpends = {
              first: event.page.take,
              after: event.page.skip,
              skip: event.page.skip,
            };
          }
          await fetchDataSpends(false);
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          if (event.event.value) {
            filterSettings.paginationSuppliers = {
              first: event.event.value,
              after: 0,
              skip: 0,
            };
          } else {
            filterSettings.paginationSuppliers = {
              first: event.page.take,
              after: event.page.skip,
              skip: event.page.skip,
            };
          }
          await fetchDataSuppliers(false);
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          if (event.event.value) {
            filterSettings.paginationParents = {
              first: event.event.value,
              after: 0,
              skip: 0,
            };
          } else {
            filterSettings.paginationParents = {
              first: event.page.take,
              after: event.page.skip,
              skip: event.page.skip,
            };
          }
          await fetchDataParents(false);
          break;
        default:
          break;
      }
    }

    async function callTotalDataByLevel(level: string) {
      switch (level) {
        case "spends": {
          const totals = await fetchTotalsbyLevel(
            level,
            "program",
            filterSettings.filterSpends,
          );
          if (totals !== null) {
            data.totalsBycolumnsSpends = totals;
            data.totalSpends = totals.totalCount;
          }
          break;
        }

        case "suppliers": {
          const totals = await fetchTotalsbyLevel(
            level,
            "program",
            filterSettings.filterSuppliers,
          );
          if (totals !== null) {
            data.totalsBycolumnsSuppliers = totals;
            data.totalSuppliers = totals.totalCount;
          }
          break;
        }

        case "parents": {
          const totals = await fetchTotalsbyLevel(
            level,
            "program",
            filterSettings.filterParents,
          );
          if (totals !== null) {
            data.totalsBycolumnsParents = totals;
            data.totalParents = totals.totalCount;
          }
          break;
        }
        default:
          break;
      }
    }

    async function fetchDataSuppliers(
      callTotalsValues: boolean = false,
      callOthersGrid: boolean = false,
    ) {
      data.loadSuppliers = true;

      try {
        let queryString = getSupplierData(filterSettings);

        // Enable loading
        data.loadSuppliers = true;

        const response = await graphqlUtils.getCollectionData(queryString);

        const nodes = response.data.suppliers.edges.map(
          (edge: any) => edge.node,
        );

        const parsedData: Array<any> = [];

        nodes.forEach(function (data: any) {
          const datas = { ...data };
          datas.spendsAmount = data.spendCounts;
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";

          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness),
          );

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness),
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(data.isVCardApplied),
          );
          datas.level = "suppliers";

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness),
          );

          const validateESG = [0, 1, 2, 3, 4, 100];
          let value = 0;
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore);
          } else {
            value = 404;
          }
          datas.entityInvestVerteScore = translate.t(
            "home.entityCard.rating.esgClassification.c" + value,
          );
          datas.entityRegulatoryTermsStrategyModality =
            data.entityRegulatoryTermsStrategyModality
              ? formatData.getStrategyModalityValue(
                  data.entityRegulatoryTermsStrategyModality,
                )
              : "-";
          datas.isActive = !!data.activeProgram;
          datas.activeProgram = data.activeProgram
            ? data.activeProgram
            : translate.t("tableStatus.notAssigned");

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(",");
            if (programs.length > 1) {
              datas.activeProgram = translate.t("tableStatus.multiple");
            }
          } else {
            datas.activeProgram = translate.t("tableStatus.notAssigned");
          }

          /** For multiple values */
          if (data.financings) {
            const splitFinancing = data.financings.split("|");
            if (splitFinancing.length > 1) {
              datas.financings = translate.t("tableStatus.multiple");
              datas.financingColors = "rgba(44,54,69,.1)";
            }
          }

          if (data.harmonizations) {
            const splitHarmonizations = data.harmonizations.split("|");
            if (splitHarmonizations.length > 1) {
              datas.harmonizations = translate.t("tableStatus.multiple");
              datas.harmColors = "rgba(44,54,69,.1)";
            }
          }

          // AB#20307: backend only returns more than one '|'-joined reason when every spend in
          // this supplier is excluded (see AnalyzeSummaryManager::exclusion_reason) - same
          // "Multiple" substitution as financings/harmonizations above.
          if (data.exclusionReason) {
            const splitExclusionReason = data.exclusionReason.split("|");
            if (splitExclusionReason.length > 1) {
              datas.exclusionReason = translate.t("tableStatus.multiple");
            }
          }
          datas.selected = false;
          parsedData.push(datas);
        });
        data.dataSuppliers = parsedData;
        data.setProgramInrecalculation = false;

        if (callTotalsValues) {
          data.totalsBycolumnsSuppliers = null;
          callTotalDataByLevel("suppliers");
        }
        if (callOthersGrid) {
          fetchDataSpends(true);
          fetchDataParents(true);
        }
        data.loadSuppliers = false;
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.setProgramInrecalculation = false;
        data.loadSuppliers = false;
      }
    }

    function getSupplierData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsSuppliers,
        nodesEdges,
      );

      // Ensure disabled filter is included if store has a value
      const filterWithDisabled = ensureDisabledFilterIncluded(
        event.filterSuppliers,
      );

      const graphqlFilterString =
        graphqlUtils.convertFiltersToGraphQL(filterWithDisabled);
      const graphqlOrderString = convertSortToGraphQL(event.sortSuppliers);
      const paginationString = `first: ${event.paginationSuppliers.first} ${
        event.paginationSuppliers.after
          ? `, after: "${btoa(
              (event.paginationSuppliers.after - 1).toString(),
            )}"`
          : ""
      }`;
      const collectionQuery = "collectionQueryProgramListSuppliers";

      const graphqlQuery = `
        {
          suppliers: ${collectionQuery}(
            targetProgramUuid: "${props.selectedProgramId}",
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},            
            ${paginationString},
            ${setGlobalFilter ? setGlobalFilter : ""} 
            ) {
            edges {
              cursor 
              node {
                  ${getEdges}
              }              
            }
          }
        }
      `;
      return graphqlQuery;
    }

    //- get parents Data
    async function fetchDataParents(
      callTotalsValues: boolean = false,
      callOthersGrid: boolean = false,
    ) {
      // Enable loading
      data.loadParents = true;

      try {
        let queryString = getParentsData(filterSettings);
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.parents.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];
        nodes.forEach(function (data: any) {
          const datas = { ...data };
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";
          datas.countOfProviders =
            data.entityType === "suppliers"
              ? "-"
              : data.supplierCounts > 0
                ? data.supplierCounts
                : "-";
          datas.supplierCounts =
            data.supplierCounts > 0 ? data.supplierCounts : "-";
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness),
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(data.isVCardApplied),
          );
          datas.level = "parents";

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness),
          );

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness),
          );

          const validateESG = [0, 1, 2, 3, 4, 100];
          let value = 0;
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore);
          } else {
            value = 404;
          }
          datas.entityInvestVerteScore = translate.t(
            "home.entityCard.rating.esgClassification.c" + value,
          );
          datas.entityRegulatoryTermsStrategyModality =
            data.entityRegulatoryTermsStrategyModality
              ? formatData.getStrategyModalityValue(
                  data.entityRegulatoryTermsStrategyModality,
                )
              : "-";
          datas.isActive = !!data.activeProgram;

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(",");
            if (programs.length > 1) {
              datas.activeProgram = translate.t("tableStatus.multiple");
            }
          } else {
            datas.activeProgram = translate.t("tableStatus.notAssigned");
          }

          /** For multiple values */

          if (data.financings) {
            const splitFinancing = data.financings.split("|");
            if (splitFinancing.length > 1) {
              datas.financings = translate.t("tableStatus.multiple");
              datas.financingColors = "rgba(44,54,69,.1)";
            }
          }

          if (data.harmonizations) {
            const splitHarmonizations = data.harmonizations.split("|");
            if (splitHarmonizations.length > 1) {
              datas.harmonizations = translate.t("tableStatus.multiple");
              datas.harmColors = "rgba(44,54,69,.1)";
            }
          }

          // AB#20307: backend only returns more than one '|'-joined reason when every spend under
          // this parent is excluded (see AnalyzeSummaryManager::exclusion_reason) - same "Multiple"
          // substitution as financings/harmonizations above.
          if (data.exclusionReason) {
            const splitExclusionReason = data.exclusionReason.split("|");
            if (splitExclusionReason.length > 1) {
              datas.exclusionReason = translate.t("tableStatus.multiple");
            }
          }
          datas.selected = false;
          parsedData.push(datas);
        });
        data.dataParents = parsedData;
        data.setProgramInrecalculation = false;
        if (callTotalsValues) {
          data.totalsBycolumnsParents = null;
          callTotalDataByLevel("parents");
        }
        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataSpends(true);
        }

        // Disable loading
        data.loadParents = false;
      } catch (error) {
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.setProgramInrecalculation = false;

        // Disable loading
        data.loadParents = false;
      }
    }

    function getParentsData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsParents,
        nodesEdges,
      );

      // Ensure disabled filter is included if store has a value
      const filterWithDisabled = ensureDisabledFilterIncluded(
        event.filterParents,
      );

      const graphqlFilterString =
        graphqlUtils.convertFiltersToGraphQL(filterWithDisabled);
      const graphqlOrderString = convertSortToGraphQL(event.sortParents);
      const paginationString = `first: ${event.paginationParents.first} ${
        event.paginationParents.after
          ? `, after: "${btoa((event.paginationParents.after - 1).toString())}"`
          : ""
      }`;
      const collectionQuery = "collectionQueryProgramListParents";
      const graphqlQuery = `
        {
          parents: ${collectionQuery}(
            targetProgramUuid: "${props.selectedProgramId}",
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${setGlobalFilter ? setGlobalFilter : ""}
            ) {
            edges {
              cursor
              node {
                ${getEdges}
              }              
            }
          }
        }
      `;
      return graphqlQuery;
    }

    //- get spends Data
    async function fetchDataSpends(
      callTotalsValues: boolean = false,
      callOthersGrid: boolean = false,
    ) {
      data.loadSpends = true;

      try {
        data.loadSpends = true;
        let queryString = getSpendsData(filterSettings);

        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.spends.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];
        nodes.forEach(function (data: any) {
          const datas = { ...data };
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness),
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(data.isVCardApplied),
          );
          datas.level = "suppliers";

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness),
          );

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness),
          );

          const validateESG = [0, 1, 2, 3, 4, 100];
          let value = 0;
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore);
          } else {
            value = 404;
          }
          datas.entityInvestVerteScore = translate.t(
            "home.entityCard.rating.esgClassification.c" + value,
          );
          datas.entityRegulatoryTermsStrategyModality =
            data.entityRegulatoryTermsStrategyModality
              ? formatData.getStrategyModalityValue(
                  data.entityRegulatoryTermsStrategyModality,
                )
              : "-";
          datas.isActive = !!data.activeProgram;
          datas.activeProgram = data.activeProgram
            ? data.activeProgram
            : translate.t("tableStatus.notAssigned");

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(",");
            if (programs.length > 1) {
              datas.activeProgram = translate.t("tableStatus.multiple");
            }
          } else {
            datas.activeProgram = translate.t("tableStatus.notAssigned");
          }
          datas.selected = false;
          parsedData.push(datas);
        });
        data.setProgramInrecalculation = false;
        data.dataSpends = parsedData;

        if (callTotalsValues) {
          data.totalsBycolumnsSpends = null;
          callTotalDataByLevel("spends");
        }
        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataParents(true);
        }
        // Disable loading
        data.loadSpends = false;
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.setProgramInrecalculation = false;
        data.loadSpends = false;
      }
    }

    function getSpendsData(event: FilterChangeEvent): string {
      // Ensure disabled filter is included if store has a value
      const filterWithDisabled = ensureDisabledFilterIncluded(
        event.filterSpends,
      );

      const graphqlFilterString =
        graphqlUtils.convertFiltersToGraphQL(filterWithDisabled);
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsSpends,
        nodesEdges,
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${
        event.paginationSpends.after
          ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
          : ""
      }`;
      const collectionQuery = "collectionQueryProgramListSpends";
      const graphqlQuery = `
        {
          spends: ${collectionQuery}(
            targetProgramUuid: "${props.selectedProgramId}",
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${setGlobalFilter ? setGlobalFilter : ""} 
          ) {
            edges {
              cursor
              node {
                ${getEdges}
              }
            }
          }
        }
      `;
      return graphqlQuery;
    }

    function getCustomHeaderTitles() {
      
      // Bug#18966: pass the slots through untouched -- cleanCustomColumns maps title to
      // column by position, so filtering this array here shifted every later title.
      data.customHeaders = spendFileVersionActiveNameCustomDataPoints.value;
      data.customHasData = spendFileVersionActiveCustomDataPointsHasData.value;
      data.gridColumnsSpends = ArrayUtils.cleanCustomColumns(
        data.gridColumnsSpends,
        data.customHeaders,
        data.customHasData,
      );
      data.gridColumnsSuppliers = ArrayUtils.cleanCustomColumns(
        data.gridColumnsSuppliers,
        data.customHeaders,
        data.customHasData,
      );
      data.gridColumnsParents = ArrayUtils.cleanCustomColumns(
        data.gridColumnsParents,
        data.customHeaders,
        data.customHasData,
      );

      data.keySpends++;
      data.keySuppliers++;
      data.keyParents++;
      //SAVE THE CHANGED COLUMNS
      homeStore.setHomeAnalyzeGridColumnsListSpendsEdit(data.gridColumnsSpends);
      homeStore.setHomeAnalyzeGridColumnsListSuppliersEdit(
        data.gridColumnsSuppliers,
      );
      homeStore.setHomeAnalyzeGridColumnsListParentsEdit(
        data.gridColumnsParents,
      );
    }

    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'entityName: "asc"';
      }
      return sort
        .map((descriptor) => `${descriptor.field}: "${descriptor.dir}"`)
        .join(", ");
    }

    async function dataChange(filter: any, sort: any) {
      data.selectedItems = [];
      emit("update:selectedItems", data.selectedItems);

      // Ensure disabled filter is included if store has a value
      const filterWithDisabled = ensureDisabledFilterIncluded(filter);
      data.filterForPatch = filterWithDisabled;

      switch (data.entityLevelTabSelected) {
        case ENTITY_LEVEL.SPEND_LINES:
          filterSettings.paginationSpends = {
            first: filterSettings.paginationSpends.first,
            after: 0,
            skip: 0,
          };
          filterSettings.filterSpends = filterWithDisabled;
          filterSettings.sortSpends = sort;
          clearTimeout(pendingRequest);
          data.totalSpends = 0;
          await fetchDataSpends(true);
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          filterSettings.paginationSuppliers = {
            first: filterSettings.paginationSuppliers.first,
            after: 0,
            skip: 0,
          };
          filterSettings.filterSuppliers = filterWithDisabled;
          filterSettings.sortSuppliers = sort;
          clearTimeout(pendingRequest);
          data.totalSuppliers = 0;
          await fetchDataSuppliers(true);
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          filterSettings.paginationParents = {
            first: filterSettings.paginationParents.first,
            after: 0,
            skip: 0,
          };
          filterSettings.filterParents = filterWithDisabled;
          filterSettings.sortParents = sort;
          clearTimeout(pendingRequest);
          data.totalParents = 0;
          await fetchDataParents(true);
          break;
        default:
          break;
      }
    }

    async function changeTabFromGrid(indexTab: number) {
      resetSelected();
      data.entityLevelTabSelected = indexTab;
      homeStore.setEntityLevelTabSelected(indexTab);
    }

    function resetSelected() {
      data.selectedItems = [];
      emit("update:selectedItems", data.selectedItems);
      data.dataParents.forEach(function (config: any) {
        config.selected = false;
      });
      data.dataSuppliers.forEach(function (config: any) {
        config.selected = false;
      });
      data.dataSpends.forEach(function (config: any) {
        config.selected = false;
      });
      data.hideEditColumnMenu = !data.hideEditColumnMenu;
    }

    function resetDatabyLevel() {
      data.dataParents = [];
      data.dataSuppliers = [];
      data.dataSpends = [];
    }

    function getExportTotalForCollection(collection: any): number {
      if (collection === "collectionQueryProgramListParents")
        return data.totalParents;
      if (collection === "collectionQueryProgramListSuppliers")
        return data.totalSuppliers;
      if (collection === "collectionQueryProgramListSpends")
        return data.totalSpends;
      return 0;
    }

    // Entry point bound to the grid's @exportCSV event. Resolves the columns
    // and filters for the active level and delegates the loading / large-export
    // UX to useGridExport (WI#17080).
    function exportCSV(collection: any) {
      let filters = undefined;
      let title = "";
      let level = "";
      let columns: Array<any> = [];

      if (collection === "collectionQueryProgramListParents") {
        filters = filterSettings.filterParents;
        columns = data.gridColumnsParents;
        title = "AnalyzeParents";
        level = "parents";
      }
      if (collection === "collectionQueryProgramListSuppliers") {
        filters = filterSettings.filterSuppliers;
        columns = data.gridColumnsSuppliers;
        title = "AnalyzeSuppliers";
        level = "suppliers";
      }
      if (collection === "collectionQueryProgramListSpends") {
        filters = filterSettings.filterSpends;
        columns = data.gridColumnsSpends;
        title = "AnalyzeSpends";
        level = "spends";
      }

      const filtersGrid = {
        telerikFilter: formatData.convertFiltersToREST(filters),
        targetProgramUuid: props.selectedProgramId,
        globalFilter: formatData.convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        currencyRate: useAppStore().getCurrencyAmount,
      };

      startExport(
        { level, title, columns, filtersGrid },
        getExportTotalForCollection(collection),
      );
    }

    function setColumnsSummary(level: string) {
      let getActiveColumnsByLevel: Array<any> = [];

      switch (level) {
        case "spends":
          getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(
            data.gridColumnsSpends,
          );
          break;
        case "suppliers":
          getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(
            data.gridColumnsSuppliers,
          );
          break;
        case "parents":
          getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(
            data.gridColumnsParents,
          );
          break;
      }

      const getSummationColumns = totalColumnsUtils.getTotalFieldsSummation(
        getActiveColumnsByLevel,
        analyzeStore.customDataPointTypes,
      );

      const getFieldsByTrueValue =
        totalColumnsUtils.getTotalFieldsCountByTrueValue(
          getActiveColumnsByLevel,
        );

      const getFieldsByWeightedAvg =
        totalColumnsUtils.getTotalFieldsWeightedAvg(getActiveColumnsByLevel, analyzeStore.customDataPointTypes);

      const summaryFields = {
        sum: getSummationColumns,
        "avg.weighted.ceil": getFieldsByWeightedAvg,
        "count.true": getFieldsByTrueValue,
      };
      return summaryFields;
    }

    //- get suppliers Data
    async function fetchTotalsbyLevel(
      level: string,
      section: string,
      filtersApplied: any,
    ) {
      const telerikFilter = graphqlUtils.convertFiltersToREST(filtersApplied);

      const response = await HomeAPI.getUniqueData({
        level,
        field: "",
        currencyRate,
        targetProgramUuid: props.selectedProgramId ?? null,
        targetPlanUuid: null,
        targetPhaseUuid: null,
        section,
        globalFilter: formatData.convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        activeSpendFileVersion: spendFileVersionActiveId.value,
        targetOperation: null,
        summaryOperation: "summary",
        telerikFilter,
        summary: setColumnsSummary(level),
      });

      if (
        !response.success ||
        response.data === null ||
        response.data === undefined
      ) {
        if (import.meta.env.DEV)
          console.log(
            `** Error - Invalid response in panelBarItemOptionsAPIReadAll.`,
          );
        if (!response.skipped) toast.error(translate.t("error.server500"));
        return null;
      }

      return response.data;
    }

    // *** Watchers ***

    watch(
      () => props.keyLists,
      (newValue) => {
        data.setProgramInrecalculation = true;
        loadGridsData(true);
      },
      { deep: true },
    );

    watch(
      () => props.programInrecalculation,
      (newValue) => {
        data.setProgramInrecalculation = newValue;
      },
      { deep: true },
    );

    watch(hideAverageDaysPaid, () => {
      data.gridColumnsSpends = getGridColumnsSpends(true);
      data.gridColumnsSuppliers = getGridColumnsSuppliers(true);
      data.gridColumnsParents = getGridColumnsParents(true);
    });

    // Spends
    watch(
      () => data.gridColumnsSpends,
      () => {
        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
          homeStore.setHomeAnalyzeGridColumnsListSpendsEdit(
            data.gridColumnsSpends,
          );

          fetchDataSpends(true);
        }
      },
      { deep: true },
    );

    // Suppliers
    watch(
      () => data.gridColumnsSuppliers,
      () => {
        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
          homeStore.setHomeAnalyzeGridColumnsListSuppliersEdit(
            data.gridColumnsSuppliers,
          );

          fetchDataSuppliers(true);
        }
      },
      { deep: true },
    );

    // Parents
    watch(
      () => data.gridColumnsParents,
      () => {
        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
          homeStore.setHomeAnalyzeGridColumnsListParentsEdit(
            data.gridColumnsParents,
          );

          fetchDataParents(true);
        }
      },
      { deep: true },
    );

    watch(
      () => globalFiltersStore.getFiltersApplied,
      async (newValue) => {
        setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(newValue);
        data.dataSpends = [];
        data.dataSuppliers = [];
        data.dataParents = [];
        data.totalSpends = 0;
        data.totalSuppliers = 0;
        data.totalParents = 0;
        // Update grids
        await loadGridsData(true);
      },
    );

    // *** END Watchers ***

    const gridColumnsSpendsComputed = computed(() => {
      return data.gridColumnsSpends;
    });

    const gridColumnsSuppliersComputed = computed(() => {
      return data.gridColumnsSuppliers;
    });

    const gridColumnsParentsComputed = computed(() => {
      return data.gridColumnsParents;
    });

    function resetDefaultColumns(levelofgrid: any) {
      if (levelofgrid === "spend") {
        homeStore.setHomeAnalyzeGridColumnsListSpendsEdit(null);
        data.gridColumnsSpends = getGridColumnsSpends(true);
        data.keySpends++;
      }

      if (levelofgrid === "suppliers") {
        homeStore.setHomeAnalyzeGridColumnsListSuppliersEdit(null);
        data.gridColumnsSuppliers = getGridColumnsSuppliers(true);
        data.keySuppliers++;
      }

      if (levelofgrid === "parents") {
        homeStore.setHomeAnalyzeGridColumnsListParentsEdit(null);
        data.gridColumnsParents = getGridColumnsParents(true);
        data.keyParents++;
      }
    }

    // *** Negotiation Status ***

    /**
     * Handle the change in negotiation status for the list of spends.
     *
     * @param {NegotiationStatus} negotiationStatus - the new negotiation status
     * @return {void}
     */
    function negotiationStatusOnChanged(
      negotiationStatus: NegotiationStatus,
    ): void {
      const spendsIds = data.selectedItems.map((item: any) => item.uuid);

      negotiationStatusAPIUpdateMultiple({
        negotiationStatus,
        spendsIds,
      });
    }

    /**
     * Update the negotiation status of several spends using the API.
     * Route: POST - /api/entity-card/negotiation-status/update
     *
     * @param {Object} params - The parameters for the function.
     *   - {NegotiationStatus} status
     *   - {string} spendId
     *   - {targetSpendFileVersionUuid} targetSpendFileVersionUuid
     * @return {void}
     */
    function negotiationStatusAPIUpdateMultiple({
      negotiationStatus,
      spendsIds,
    }: {
      negotiationStatus: NegotiationStatus;
      spendsIds: string[];
    }): void {
      try {
        // Validate
        if (ArrayUtils.isEmpty(spendsIds)) {
          throw new Error(
            "** Error in negotiationStatusAPIUpdate: spendsIds is empty",
          );
        }

        if (
          StringUtils.isNullUndefinedOrEmpty(spendFileVersionActiveId.value)
        ) {
          throw new Error(
            "** Error in negotiationStatusAPIUpdate: spendFileVersionActiveId is null, undefined or empty",
          );
        }

        let filters = {
          telerikFilter: formatData.convertFiltersToREST(data.filterForPatch),
          targetProgramUuid: props.selectedProgramId,
          globalFilter: formatData.convertFiltersToREST(
            globalFiltersStore.getFiltersApplied,
          ),
          currencyRate,
        };

        const params = {
          spendsIds: data.allChecked ? null : spendsIds,
          negotiationStatus,
          spendFileVersionUuid: StringUtils.removeIRI(
            spendFileVersionActiveId.value,
          ),
          filters,
          all: data.allChecked,
          level: "spend",
          callbackSuccess: (callbackSuccessData: {
            result: "success" | "failed" | "warning";
            subject: string;
            summary: {
              changesCount: number;
              changedCount: number;
              suppliersCount: number;
            };
          }) => {
            const { result, subject, summary } = callbackSuccessData;

            // API call failed
            if (result === "failed") {
              throw new Error(`API call failed. Message: ${subject}`);
            }

            // API call succeeded

            if (summary.changedCount === 0) {
              toast.warning(translate.t("global.noty.noChangesWereApplied"));
              return;
            } else if (summary.changedCount === summary.changesCount) {
              toast.success(translate.t("global.noty.allChangesWereApplied"));
            } else {
              if (negotiationStatus === "contacted") {
                toast.warning(
                  translate.t("global.noty.someChangesWereApplied"),
                );
              }
              //
              else {
                toast.warning(
                  translate.t(
                    "global.noty.someChangesWereAppliedWithContacted",
                  ),
                );
              }
            }

            loadGridsData(true);
          },
        };

        negotiationStatusStore.negotiationStatusAPIUpdate(params);
      } catch (error) {
        if (import.meta.env.DEV)
          console.log("** Error in negotiationStatusAPIUpdate. ", error);
      }
    }
    const moveSpendToPhases = reactive({ key: "", value: "" });
    function getDataMoveBetweenModal(
      levelOfGrid: string,
      emitParamsFromCalculumTreeSelect: any,
    ) {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween;
      data.levelGridFromGrid = levelOfGrid;
      moveSpendToPhases.key = emitParamsFromCalculumTreeSelect.key;
      moveSpendToPhases.value = emitParamsFromCalculumTreeSelect.value;
    }
    function userApprovedMoveBetween() {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween;
      if (moveSpendToPhases.key === "removeSpendToPhases") {
        gridMovePhase(moveSpendToPhases.key, data.levelGridFromGrid);
      } else {
        gridMovePhase("moveSpendToPhases", data.levelGridFromGrid);
      }
    }
    function userRejectedMoveBetween() {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween;
      data.levelHarmonizationFromGrid = "";
      data.levelGridFromGrid = "";
    }
    function gridMovePhase(type: string, levelOfGrid: string) {
      const changed = {
        key: type,
        value: moveSpendToPhases.value,
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, type, levelOfGrid);
    }
    // *** END Negotiation Status ***

    const { apolloClientResetStore, isResetting } = useApolloClient();

    // *** Multiple Suppliers Export PDF ***
    const loadingNewContent = ref(false);

    function requestNewContentApi(levelOfGrid: string) {
      data.levelGridFromGrid = levelOfGrid;
      loadingNewContent.value = true;
      const params = {
        entities: buildSelectedItemsArray(),
        spendFileVersionUuid: spendFileVersionActiveId.value,
        activeProgramDefaultId: props.selectedProgramId,
        codeCurrency: appStore.getCurrencyTo,
        callbackSuccess: (callBackSucessData: any) => {
          loadingNewContent.value = false;
          openMultipleExportModal(callBackSucessData);
        },
        callbackError: () => {
          toast.error(translate.t("error.server500"));
          loadingNewContent.value = false;
        },
      };
      valuePropositionStore.requestNewContentToExportSupplierPDF(params);
    }

    function openMultipleExportModal(dataToExport: any) {
      try {
        if (
          !dataToExport ||
          !Array.isArray(dataToExport) ||
          dataToExport.length === 0
        ) {
          toast.error("Supplier data is not available");
          return;
        }

        // Convert to export format
        const suppliers: SupplierExportData[] = dataToExport.map(
          (supplier: any) => ({
            supplierUuid: String(supplier?.id ?? `demo-${Date.now()}`),
            supplierName: String(supplier?.supplierName ?? "Unknown Supplier"),
            dataSupplier: supplier,
          }),
        );

        data.suppliersForExport = suppliers;
        data.showMultipleExportModal = true;
      } catch (error: any) {
        console.error("Error in openMultipleExportModal:", error);
        toast.error(`Error loading data: ${error?.message || "Unknown error"}`);
      }
    }

    function closeMultipleExportModal() {
      data.showMultipleExportModal = false;
      data.levelGridFromGrid = "";
      data.suppliersForExport = [];
    }

    function handleMultipleExportComplete(result: any) {
      closeMultipleExportModal();
      toast.success(translate.t("Export completed successfully"));
    }

    /**
     * Transforma data.selectedItems en un arreglo con el formato requerido
     * @returns Array de objetos con { level: string, entityUuid: string }
     */
    function buildSelectedItemsArray(): Array<{
      level: string;
      entityUuid: string;
    }> {
      if (!data.selectedItems || data.selectedItems.length === 0) {
        return [];
      }

      const levelMap: Record<string, string> = {
        suppliers: "supplier",
        supplier: "supplier",
        parents: "parent",
        parent: "parent",
        spends: "spend",
        spend: "spend",
      };

      return data.selectedItems
        .map((item: any) => {
          const entityType = item.entityType || "";
          const normalizedLevel = levelMap[entityType] || entityType;

          return {
            level: normalizedLevel,
            entityUuid: item.uuid || "",
          };
        })
        .filter(
          (item: { level: string; entityUuid: string }) =>
            item.entityUuid !== "" && item.level !== "",
        );
    }

    /**
     * Ensures disabled filter is included in the filter object if store has a value
     * @param filter - The current filter object
     * @returns Filter object with disabled filter included if needed
     */
    function ensureDisabledFilterIncluded(filter: any): any {
      const disabledValue = gridMenuActionsStore.disabledFilterValue;

      // If no disabled filter value in store, return filter as-is
      if (disabledValue === null) {
        return filter;
      }

      // Ensure proper filter structure
      let currentFilter = makeDisableFilter(filter);

      // Check if disabled filter already exists
      const hasDisabledFilter = currentFilter.filters.some(
        (f: any) => f.field === "disabled",
      );

      // Add disabled filter if not present
      if (!hasDisabledFilter) {
        currentFilter.filters.push({
          field: "disabled",
          operator: "eq",
          value: disabledValue,
        });
      }

      return currentFilter;
    }

    /**
     * Apply or remove filter on disabled field to show/hide excluded items
     * This function is called by the watcher when disabledFilterValue changes in the store
     * @param value - "No" to hide excluded items, null to show all items
     */
    function applyDisabledFilter(value: string | null) {
      // Get current filter and remove any existing disabled filterdata.filterForPatch
      let currentFilter: any = makeDisableFilter(data.filterForPatch);

      // Remove existing disabled filter to avoid duplicates
      currentFilter.filters = currentFilter.filters.filter(
        (f: any) => f.field !== "disabled",
      );

      // Add new disabled filter if value is provided
      if (value !== null) {
        currentFilter.filters.push({
          field: "disabled",
          operator: "eq",
          value: value,
        });
      }

      // Apply filter (keep current sort)
      const currentSort =
        data.entityLevelTabSelected === ENTITY_LEVEL.SPEND_LINES
          ? filterSettings.sortSpends
          : data.entityLevelTabSelected === ENTITY_LEVEL.SUPPLIERS
            ? filterSettings.sortSuppliers
            : filterSettings.sortParents;

      // Note: dataChange will call ensureDisabledFilterIncluded,
      // but since we already added the filter here, it won't duplicate it
      dataChange(currentFilter, currentSort);
    }
    const makeDisableFilter = (filter: any) => {
      let currentFilter = filter || { logic: "and", filters: [] };
      // If filterForPatch is an array, convert to proper structure
      if (Array.isArray(currentFilter)) {
        currentFilter = { logic: "and", filters: [] };
      }
      // Ensure filters array exists
      if (!currentFilter.filters) {
        currentFilter.filters = [];
      }
      return currentFilter;
    };
    // Watch for disabled filter changes from store
    watch(
      () => gridMenuActionsStore.disabledFilterValue,
      (newValue) => {
        applyDisabledFilter(newValue);
      },
    );
    // Refresh grid data after spend file recalculation finishes (e.g. triggered by custom column bulk update).
    // Avoids the full spend-file context switch that HomeNavbar would otherwise perform.
    watch(
      () => subscribeStore.setRefeshSpendFiles,
      (newValue) => {
        if (newValue === "ready" && !globalFiltersStore.getDisableWatchers) {
          loadGridsData(true);
        }
      },
    );
    function userApprovedManageTeam() {
      data.displayModelForManageTeam = !data.displayModelForManageTeam;
      gridManageTeam("manageTeam", manageTeamData.levelOfGrid, null);
    }
    function userRejectedManageTeam() {
      data.displayModelForManageTeam = !data.displayModelForManageTeam;
      data.levelGridFromGrid = "";
    }
    const manageTeamData = reactive({
      param: null,
      levelOfGrid: "",
      uuid: null,
    });
    function manageTeamMove(param: any) {
      gridManageTeam("manageTeam", param.levelOfGrid, param);
    }
    function manageTeamRemove(param: any) {
      data.displayModelForManageTeam = true;
      manageTeamData.param = param.param;
      manageTeamData.levelOfGrid = param.levelOfGrid;
      manageTeamData.uuid = param.uuid;
    }
    function gridManageTeam(type: string, levelOfGrid: string, param: any) {
      let teamId = null;
      let uuids = null;
      if (param) {
        teamId = param.param?.["@id"] ?? null;
        const uuidInside = param["uuid"];
        if (teamId) {
          teamId = StringUtils.removeIRI(teamId);
        }
        if (uuidInside) {
          uuids = [{ uuid: uuidInside }];
        }
      }
      if (manageTeamData.uuid && param === null) {
        uuids = [{ uuid: manageTeamData.uuid }];
      }
      const changed = {
        key: type,
        value: teamId,
      };
      if (uuids) {
        // Single-row case: inline row edit or approved removal of a specific row
        postByGroup({ changed }, uuids, type, levelOfGrid);
      } else {
        // Toolbar bulk case: blur immediately + toast on success, no pre-reset of Apollo
        const successKey = teamId
          ? "home.entityCard.details.procurementTeamUpdated"
          : "home.entityCard.details.procurementTeamCleared";
        postGroupActionDirect(changed, levelOfGrid, successKey);
      }
    }

    function userApprovedManageCommodity() {
      data.displayModelForManageCommodity =
        !data.displayModelForManageCommodity;
      gridManageCommodity("commodity", manageCommodityData.levelOfGrid, null);
    }
    function userRejectedManageCommodity() {
      data.displayModelForManageCommodity =
        !data.displayModelForManageCommodity;
      data.levelGridFromGrid = "";
    }
    const manageCommodityData = reactive({
      param: null,
      levelOfGrid: "",
    });
    function manageCommodityMove(param: any) {
      gridManageCommodity("commodity", param.levelOfGrid, param);
    }
    function manageCommodityRemove(param: any) {
      data.displayModelForManageCommodity = true;
      manageCommodityData.param = param.param;
      manageCommodityData.levelOfGrid = param.levelOfGrid;
    }
    // Shared helper: calls postProgramSpendConfigurationbyGroups directly, without Apollo reset
    // or grid key increments, so the user stays on the current tab after the action.
    function postGroupActionDirect(
      changed: object,
      levelOfGrid: string,
      successKey: string,
    ) {
      const uuids: string[] = data.selectedItems.map((item: any) => item.uuid);
      if (uuids.length === 0 && !data.allChecked) return;
      data.loadExport = true;
      const filters = {
        telerikFilter: formatData.convertFiltersToREST(data.filterForPatch),
        targetProgramUuid: props.selectedProgramId,
        globalFilter: formatData.convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        currencyRate,
      };
      analyzeStore.postProgramSpendConfigurationbyGroups({
        program: props.selectedProgramId,
        changed,
        uuids: data.allChecked ? null : uuids,
        filters,
        level: levelOfGrid,
        all: data.allChecked,
        callbackSuccess: () => {
          data.loadExport = false;
          data.levelHarmonizationFromGrid = "";
          data.levelGridFromGrid = "";
          data.selectedItems = [];
          toast.success(translate.t(successKey));
          apolloClient.cache.reset();
          loadGridsData(true);
        },
        callbackError: () => {
          data.loadExport = false;
          toast.error(translate.t("global.noty.errorUpdatingData"));
        },
      });
    }

    function gridManageCommodity(
      type: string,
      levelOfGrid: string,
      param: any,
    ) {
      const changed = {
        key: type,
        value: param?.param ?? manageCommodityData.param ?? null,
      };
      postGroupActionDirect(
        changed,
        levelOfGrid,
        "home.entityCard.details.commodityUpdated",
      );
    }

    function manageSupplierIndustryMove(param: any) {
      postGroupActionDirect(
        { key: "supplierIndustry", value: param?.param ?? null },
        param.levelOfGrid,
        "global.noty.allChangesWereApplied",
      );
    }

    function manageSupplierCreditRatingMove(param: any) {
      postGroupActionDirect(
        { key: "supplierCreditRating", value: param?.param ?? null },
        param.levelOfGrid,
        "global.noty.allChangesWereApplied",
      );
    }

    function manageSupplierUltimaParentMove(param: any) {
      postGroupActionDirect(
        { key: "supplierUltimateParent", value: param?.param ?? null },
        param.levelOfGrid,
        "global.noty.allChangesWereApplied",
      );
    }


    const manageCustomColumnData = reactive({
      param: null as string | null,
      levelOfGrid: "",
      columnUuid: "",
    });
    function manageCustomColumnMove(param: any) {
      gridManageCustomColumn(param.levelOfGrid, param);
    }
    function manageCustomColumnRemove(param: any) {
      data.displayModelForManageCustomColumn = true;
      manageCustomColumnData.param = param.param;
      manageCustomColumnData.levelOfGrid = param.levelOfGrid;
      manageCustomColumnData.columnUuid = param.columnUuid;
    }
    function gridManageCustomColumn(levelOfGrid: string, param: any) {
      const changed = {
        key: "customColumn",
        columnNumber: param?.columnUuid ?? manageCustomColumnData.columnUuid,
        value: param?.param ?? null,
      };
      postGroupActionDirect(
        changed,
        levelOfGrid,
        "home.entityCard.details.customColumnUpdated",
      );
    }
    function userApprovedManageCustomColumn() {
      data.displayModelForManageCustomColumn =
        !data.displayModelForManageCustomColumn;
      gridManageCustomColumn(manageCustomColumnData.levelOfGrid, null);
    }
    function userRejectedManageCustomColumn() {
      data.displayModelForManageCustomColumn =
        !data.displayModelForManageCustomColumn;
    }

    return {
      ...toRefs(data),
      applySelectedEntitiesBulkTargetChanges,
      changeTabFromGrid,
      dataChange,
      dataSource,
      detailTemplateSupplier,
      ENTITY_LEVEL,
      exportCSV,
      exportOverlay,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      confirmLargeExport,
      cancelLargeExport,
      filterSettings,
      getDataHarmonizationModal,
      gridAddGroup,
      gridAddVGroup,
      gridColumnsParentsComputed,
      gridColumnsSpendsComputed,
      gridColumnsSuppliersComputed,
      gridExclude,
      gridIncludePilot,
      gridRemove,
      kendoChartRelated,
      loader,
      loadingData: false,
      negotiationStatusOnChanged,
      pageChangeHandler,
      resetDefaultColumns,
      savePeerGroupStandard,
      saveSupplierStandard,
      saveTarget,
      saveTargetAfterConfirm,
      selectAllRow,
      selectRow,
      showModalTarget,
      showModalTargetClear,
      showPeerGroupStandardModal,
      showSpendModal,
      showSupplierStandardModal,
      total,
      updaterowData,
      userApprovedHarmonization,
      userRejectedHarmonization,
      getDataMoveBetweenModal,
      userApprovedMoveBetween,
      userRejectedMoveBetween,
      isResetting,
      openMultipleExportModal,
      closeMultipleExportModal,
      handleMultipleExportComplete,
      requestNewContentApi,
      loadingNewContent,
      buildSelectedItemsArray,
      userApprovedManageTeam,
      userRejectedManageTeam,
      manageTeamRemove,
      manageTeamMove,
      manageCommodityRemove,
      manageCommodityMove,
      userApprovedManageCommodity,
      userRejectedManageCommodity,
      manageCustomColumnMove,
      manageCustomColumnRemove,
      userApprovedManageCustomColumn,
      userRejectedManageCustomColumn,
      manageSupplierIndustryMove,
      manageSupplierCreditRatingMove,
      manageSupplierUltimaParentMove,
    };
  },
});
</script>
