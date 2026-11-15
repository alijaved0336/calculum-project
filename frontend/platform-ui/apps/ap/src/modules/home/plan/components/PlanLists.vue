<template>
<div class="row">
  <div class="col-12">
    <CalculumLoading v-if="loadExport" :modal="true" with-description="withDescription" :description="exportLoadingMessage"></CalculumLoading>
    <CalculumModal v-if="showLargeExportConfirm" :size="'md'" :title="$t('home.analyze.list.largeExportTitle')" :show-close="true" @close="cancelLargeExport">
      <template #modalContent>
        <p>{{ $t('home.analyze.list.largeExportWarning', { count: pendingExportCount.toLocaleString() }) }}</p>
      </template>
      <template #modalButtons>
        <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelLargeExport"><span>{{ $t('global.cancel') }}</span></button>
        <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="confirmLargeExport"><span>{{ $t('global.continue') }}</span></button>
      </template>
    </CalculumModal>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadSpends), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SPEND_LINES }">
      <CalculumGridGraphql v-if="dataSpends" :key="keySpends" :grid-data="dataSpends" :grid-columns="gridColumnsSpendsComputed" :sortable="true" :enabled-pagination="true" :allow-export-excel="true" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :default-page-size="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :show-tabs-levels="true" :selected-tab-from-view="entityLevelTabSelected" :collection-query="'collectionQueryPlanListSpends'" :plan-id="planId" :phase-id="phaseId" :grid-height="gridHeight" :level-of-grid="'spends'" :section="'plan'" :target-operation="'browsing'" :program-inrecalculation="programInrecalculating" :totals-bycolumns="totalsBycolumnsSpends" :loading="loadSpends" @data-change="dataChange" @pagechange="pageChangeHandler" @change-tab-from-grid="changeTabFromGrid" @export-c-s-v="exportCSV" @reset-default-columns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadSuppliers), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SUPPLIERS }">
      <CalculumGridGraphql v-if="dataSuppliers" :key="keySuppliers" :grid-data="dataSuppliers" :grid-columns="gridColumnsSuppliersComputed" :sortable="true" :enabled-pagination="true" :allow-export-excel="true" :filterable="true" :total="totalSuppliers" :skip="filterSettings.paginationSuppliers.after" :take="filterSettings.paginationSuppliers.first" :default-page-size="filterSettings.paginationSuppliers.first" :filter="filterSettings.filterSuppliers" :sort="filterSettings.sortSuppliers" :show-tabs-levels="true" :selected-tab-from-view="entityLevelTabSelected" :is-expanded="true" :name-template-child="'detailPlanSuppliersGraphql'" :collection-query="'collectionQueryPlanListSuppliers'" :row-colors="true" :plan-id="planId" :phase-id="phaseId" :grid-height="gridHeight" :level-of-grid="'suppliers'" :section="'plan'" :overview-plan-list="true" :target-operation="'browsing'" :program-inrecalculation="programInrecalculating" :totals-bycolumns="totalsBycolumnsSuppliers" :loading="loadSuppliers" @data-change="dataChange" @pagechange="pageChangeHandler" @change-tab-from-grid="changeTabFromGrid" @export-c-s-v="exportCSV" @reset-default-columns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadParents), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.ULTIMATE_PARENT }">
      <CalculumGridGraphql v-if="dataParents" :key="keyParents" :grid-data="dataParents" :grid-columns="gridColumnsParentsComputed" :sortable="true" :enabled-pagination="true" :allow-export-excel="true" :filterable="true" :total="totalParents" :skip="filterSettings.paginationParents.after" :take="filterSettings.paginationParents.first" :default-page-size="filterSettings.paginationParents.first" :filter="filterSettings.filterParents" :sort="filterSettings.sortParents" :show-tabs-levels="true" :selected-tab-from-view="entityLevelTabSelected" :is-expanded="true" :name-template-child="'detailPlanParentsGridGraphql'" :collection-query="'collectionQueryPlanListParents'" :row-colors="true" :is-for-parent="true" :plan-id="planId" :phase-id="phaseId" :grid-height="gridHeight" :level-of-grid="'parents'" :section="'plan'" :overview-plan-list="true" :target-operation="'browsing'" :program-inrecalculation="programInrecalculating" :totals-bycolumns="totalsBycolumnsParents" :loading="loadParents" @data-change="dataChange" @pagechange="pageChangeHandler" @change-tab-from-grid="changeTabFromGrid" @export-c-s-v="exportCSV" @reset-default-columns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import {
  reactive,
  toRefs,
  computed,
  watch,
  ref,
  ComputedRef,
  onMounted,
  defineComponent
} from "vue";

import { Grid } from "@progress/kendo-vue-grid";
import { viewNodesEdges } from "../data/nodesEdges";
import { onBeforeRouteLeave } from "vue-router";
import {
  planSpendColumns,
  planSupplierColumns,
  planUltimateParentColumns
} from "../data/graphqlColumns";
import { saveExcel } from "@progress/kendo-vue-excel-export";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { translate } from "@/utils/translation";

import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useHomeStore } from '@/stores/home';
import * as cacheGrid from "@/utils/dataGridClear";
import * as formatData from "@/utils/FormatData";
import * as graphqlUtils from "@/utils/graphqlUtils";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { useGridExport } from "@/modules/home/analyze/composables/useGridExport";
import { FilterChangeEvent } from "@/types/filterSettings";
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import useUser from "@/services/user/composables/useUser";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import useCompany from "@/composables/useCompany"
import useSMEFeature from "@/composables/useSMEFeature";
import useSpendFile from "@/composables/useSpendFile";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import * as HomeAPI from "@/modules/home/api";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { ENTITY_LEVEL, ArrayUtils } from "@/utils";
import { useAppStore } from '@/stores/app';
import { useAnalyzeStore } from '@/stores/analyze';

function convertSortToGraphQL(sort: SortDescriptor[]): string {
  if (sort.length === 0) {
    return 'entityName: "asc"';
  }
  return sort
    .map(descriptor => `${descriptor.field}: "${descriptor.dir}"`)
    .join(", ");
}

/** Shared normalization for supplier/parent/spend collection rows (GraphQL node -> grid row). */
function applyDiversityAndVCardFlags(datas: any, data: any): void {
  datas.entityEthnicMinorityOwnedBusiness = translate.t(
    formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
  );
  datas.entityWomanOwnedBusiness = translate.t(
    formatData.getYesOrNo(data.entityWomanOwnedBusiness)
  );
  datas.entityVeteranOwnedBusiness = translate.t(
    formatData.getYesOrNo(data.entityVeteranOwnedBusiness)
  );
  datas.isVCardApplied = translate.t(
    formatData.getYesOrNo(data.isVCardApplied)
  );
}

function applyEsgScore(datas: any, data: any): void {
  const validateESG = [0, 1, 2, 3, 4, 100];
  const score = Number.parseInt(data.entityInvestVerteScore);
  const value = validateESG.includes(score) ? score : 404;
  datas.entityInvestVerteScore = translate.t(
    "home.entityCard.rating.esgClassification.c" + value
  );
}

function applyRegulatoryTermsModality(datas: any, data: any): void {
  datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality
    ? formatData.getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality)
    : "-";
}

/** `datas` starts as a copy of `data`, so `datas.activeProgram` already equals `data.activeProgram`
 * before this runs; only the "falsy" and "multiple programs" cases need to override it. */
function applyActiveProgramStatus(datas: any, data: any): void {
  datas.isActive = !!data.activeProgram;
  if (data.activeProgram && data.activeProgram !== null) {
    const programs = data.activeProgram.split(",");
    if (programs.length > 1) {
      datas.activeProgram = translate.t("tableStatus.multiple");
    }
  } else {
    datas.activeProgram = translate.t("tableStatus.notAssigned");
  }
}

function applyPhasesLabel(datas: any, data: any): void {
  if (!data.phases) return;
  if (data.phases === "10000") {
    datas.phases = translate.t("global.rest");
    return;
  }
  const splitPhases = data.phases.split(",");
  if (splitPhases.length > 1) {
    datas.phases = translate.t("tableStatus.multiple");
  }
}

function applyFinancingsLabel(datas: any, data: any): void {
  if (!data.financings) return;
  const splitFinancing = data.financings.split("|");
  if (splitFinancing.length > 1) {
    datas.financings = translate.t("tableStatus.multiple");
    datas.financingColors = "rgba(44,54,69,.1)";
  }
}

function applyHarmonizationsLabel(datas: any, data: any): void {
  if (!data.harmonizations) return;
  const splitHarmonizations = data.harmonizations.split("|");
  if (splitHarmonizations.length > 1) {
    datas.harmonizations = translate.t("tableStatus.multiple");
    datas.harmColors = "rgba(44,54,69,.1)";
  }
}

function computeSuppliersAmount(data: any): string | number {
  if (data.entityType === "supplier") return "-";
  return data.supplierCounts > 0 ? data.supplierCounts : "-";
}

export default defineComponent({
  name: "PlanLists",
  components: {
    CalculumGridGraphql,
    CalculumLoading,
    CalculumModal,
    Grid,
    GridSkeleton
  },
  props: {
    planId: { type: String, required: true },
    phaseId: { type: String, required: true },
    targetProgram: { type: String, required: true },
    programInrecalculating: { type: Boolean, required: false, default: false },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false }
  },
  setup(props) {

    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const analyzeStore = useAnalyzeStore();
    const toast = useToast();
    const { spendFileVersionActiveId,
      spendFileVersionActiveNameCustomDataPoints,
      spendFileVersionActiveCustomDataPointsHasData,
    } = useSpendFile();
    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()


    const { usevCardGroupsEnabled } = useCompany()
    const { smeRelatedColumnsDisplayBasedOnSMEFeature } = useSMEFeature()
    const { useFeatureScfStrategy, isPilotAccount, useFeature9BoxesFinancing, useFeatureVirtualCard, useFeatureSupplierStandard, useFeaturePeerGroupStandard } = useUser();
    const { apolloClientResetStore, isResetting } = useApolloClient();

    const {
      loadExport,
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
      onError: error => {
        if (import.meta.env.DEV) console.error("Excel export generation failed", error);
        toast.error(translate.t("error.server500"));
      },
    });

    let dataSource = ref(null);
    let total = ref(0);
    let loader = ref(false);
    let pendingRequest: any;
    let currencyRate: number = useAppStore().getCurrencyAmount;

    let filterSettings: FilterChangeEvent = {
      //- Suppliers Grid Data
      paginationSuppliers: {
        first: 25,
        after: 0,
        skip: 0
      },
      filterSuppliers: [],
      sortSuppliers: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc"
        }
      ],
      //- Parents Grid Data
      paginationParents: {
        first: 25,
        after: 0,
        skip: 0
      },
      filterParents: [],
      sortParents: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc"
        }
      ],
      //- Spends
      paginationSpends: {
        first: 25,
        after: 0,
        skip: 0
      },
      filterSpends: [],
      sortSpends: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc"
        }
      ]
    };

    const detailTemplateSupplier = ref("detailTemplateSupplier");

    const entityLevelTabSelected: ComputedRef<number> = computed<number>(
      () => homeStore.getEntityLevelTabSelected
    );

    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(
      globalFiltersStore.getFiltersApplied
    );

    interface DataInterface {
      loadSpends: boolean;
      loadSuppliers: boolean;
      loadParents: boolean;
      dataSpends: Array<any>;
      dataSuppliers: Array<any>;
      dataParents: Array<any>;
      totalSpends: number;
      totalSuppliers: number;
      totalParents: number;
      tabSelected: number;
      keySpends: number;
      keySuppliers: number;
      keyParents: number;
      gridColumnsSpends: Array<any>;
      gridColumnsSuppliers: Array<any>;
      gridColumnsParents: Array<any>;
      gridHeight: string;
      toExport: Array<any>;
      columnsToExport: Array<any>;
      customHeaders: any;
      customHasData: boolean[];
      totalsBycolumnsSpends: Array<any> | null;
      totalsBycolumnsSuppliers: Array<any> | null;
      totalsBycolumnsParents: Array<any> | null;
    }

    const data = reactive<DataInterface>({
      loadSpends: false,
      loadSuppliers: false,
      loadParents: false,
      dataSpends: [],
      dataSuppliers: [],
      dataParents: [],
      totalSpends: 0,
      totalSuppliers: 0,
      totalParents: 0,
      tabSelected: homeStore.getEntityLevelTabSelected,
      keySpends: new Date().getUTCMilliseconds(),
      keySuppliers: new Date().getUTCMilliseconds(),
      keyParents: new Date().getUTCMilliseconds(),
      gridColumnsSpends: getGridColumnsSpends(),
      gridColumnsSuppliers: getGridColumnsSuppliers(),
      gridColumnsParents: getGridColumnsParents(),
      gridHeight: "auto",
      toExport: [],
      columnsToExport: [],
      customHeaders: [],
      customHasData: [],
      totalsBycolumnsSpends: [],
      totalsBycolumnsSuppliers: [],
      totalsBycolumnsParents: []
    });

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
        if (getSubMain.clientHeight - 115 < 350) {
          data.gridHeight = "350px";
        } else {
          data.gridHeight = getSubMain.clientHeight - 115 + "px";
        }
      }
    }

    function buildBaseSupplierColumns(): Array<any> {
      const columns: Array<any> = [];
      planSupplierColumns.forEach(function (config: any) {
        columns.push({ ...config });
      });
      return columns;
    }

    function resolveCachedSupplierColumns(columns: Array<any>, resetColumnsFlag: boolean): Array<any> {
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomePlanPhaseColumnOrderSuppliersCF;
      const isCacheStale =
        gridCache && gridCache.length && JSON.stringify(columns) !== JSON.stringify(gridCache);
      return isCacheStale ? cacheGrid.clearCache(columns, gridCache) : columns;
    }

    function applyPilotAccountCellForSuppliers(resetColumns: Array<any>): void {
      if (!isPilotAccount()) return;
      const parentName = resetColumns.findIndex((x: any) => x.field === "parentName");
      if (parentName > -1) {
        resetColumns[parentName].cell = 'restrictModalEntitySupplier';
      }
    }

    function applySpendCountsTitle(resetColumns: Array<any>, spendCountsIndex: number): void {
      if (spendCountsIndex <= -1) return;
      resetColumns[spendCountsIndex].title = translate.t("home.analyze.table.numberOfSpends");
    }

    function getGridColumnsSuppliers(resetColumnsFlag: boolean = false): Array<any> {
      const columns = buildBaseSupplierColumns();
      let resetColumns = resolveCachedSupplierColumns(columns, resetColumnsFlag);
      const spendCounts = resetColumns.findIndex(
        (x: any) => x.field === "spendCounts"
      );

      applyPilotAccountCellForSuppliers(resetColumns);

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      resetColumns = useFeatureVirtualCard.value && usevCardGroupsEnabled.value
        ? kendoChartRelated.showVCardColumnsRelated(resetColumns)
        : kendoChartRelated.removeVCardColumnsRelated(resetColumns);

      applySpendCountsTitle(resetColumns, spendCounts);

      resetColumns = cacheGrid.removeFinancingRelatedColumns(
        resetColumns,
        props.hasFinancing
      );
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(
        resetColumns,
        props.hasHarmonization
      );
      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy())
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value)
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value)

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns)
      }
      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      homeStore.setHomePlanPhaseColumnOrderSuppliersCF(resetColumns);
      return resetColumns;
    }

    function buildBaseParentColumns(): Array<any> {
      const columns: Array<any> = [];
      planUltimateParentColumns.forEach(function (config: any) {
        columns.push({ ...config });
      });
      return columns;
    }

    function resolveCachedParentColumns(columns: Array<any>, resetColumnsFlag: boolean): Array<any> {
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomePlanPhaseColumnOrderParentsCF;
      const isCacheStale =
        gridCache && gridCache.length && JSON.stringify(columns) !== JSON.stringify(gridCache);
      return isCacheStale ? cacheGrid.clearCache(columns, gridCache) : columns;
    }

    function getGridColumnsParents(resetColumnsFlag: boolean = false): Array<any> {
      const columns = buildBaseParentColumns();
      let resetColumns = resolveCachedParentColumns(columns, resetColumnsFlag);

      renameColumnTitleByField(resetColumns, 'entitySupplierLeverageLevel', translate.t("home.analyze.table.parentLeverage"));
      renameColumnTitleByField(resetColumns, 'entityName', translate.t("home.analyze.table.ultimateParentName"));
      renameColumnTitleByField(resetColumns, 'supplierCounts', translate.t("home.analyze.table.numberOfSuppliers"));

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      resetColumns = useFeatureVirtualCard.value && usevCardGroupsEnabled.value
        ? kendoChartRelated.showVCardColumnsRelated(resetColumns)
        : kendoChartRelated.removeVCardColumnsRelated(resetColumns);

      resetColumns = cacheGrid.removeFinancingRelatedColumns(
        resetColumns,
        props.hasFinancing
      );
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(
        resetColumns,
        props.hasHarmonization
      );
      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy())
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value)
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value)

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns)
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      homeStore.setHomePlanPhaseColumnOrderParentsCF(resetColumns);
      return resetColumns;
    }

    function buildBaseSpendColumns(): Array<any> {
      const columns: Array<any> = [];
      planSpendColumns.forEach(function (config: any) {
        columns.push({ ...config });
      });
      return columns;
    }

    /** Reuses the cached column order unless it's stale/empty/different from the default columns. */
    function resolveCachedSpendColumns(columns: Array<any>, resetColumnsFlag: boolean): Array<any> {
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomePlanColumnOrderSpendsCF;
      const isCacheStale =
        gridCache && gridCache.length && JSON.stringify(columns) !== JSON.stringify(gridCache);
      return isCacheStale ? cacheGrid.clearCache(columns, gridCache) : columns;
    }

    function applyPilotAccountCellForSpends(resetColumns: Array<any>): void {
      if (!isPilotAccount()) return;
      const parentName = resetColumns.findIndex((x: any) => x.field === "parentName");
      if (parentName > -1) {
        resetColumns[parentName].cell = 'restrictModalEntitySpend';
      }
    }

    function renameColumnTitleByField(resetColumns: Array<any>, field: string, title: string): void {
      const index = resetColumns.findIndex((x: any) => x.field === field);
      if (index > -1) {
        resetColumns[index].title = title;
      }
    }

    function getGridColumnsSpends(resetColumnsFlag: boolean = false): Array<any> {
      const columns = buildBaseSpendColumns();
      let resetColumns = resolveCachedSpendColumns(columns, resetColumnsFlag);

      applyPilotAccountCellForSpends(resetColumns);

      resetColumns = useFeatureVirtualCard.value && usevCardGroupsEnabled.value
        ? kendoChartRelated.showVCardColumnsRelated(resetColumns)
        : kendoChartRelated.removeVCardColumnsRelated(resetColumns);

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      resetColumns = cacheGrid.removeFinancingRelatedColumns(
        resetColumns,
        props.hasFinancing
      );
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(
        resetColumns,
        props.hasHarmonization
      );
      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy())
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value)
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value)

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns)
      }

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      homeStore.setHomePlanColumnOrderSpendsCF(resetColumns);
      return resetColumns;
    }

    async function loadGridsData(
      callTotalsValues: boolean = false,
    ) {
      resetExport();

      switch (entityLevelTabSelected.value) {
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

    onMounted(async () => {
      getCustomHeaderTitles();
      setGridHeight();
      // Load custom data point types (number/days/money) so cell/footer format by type before fetching totals.
      if (props.targetProgram) await analyzeStore.loadCustomDataPointTypes(props.targetProgram);
      await loadGridsData(true);
    });;


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

      data.keySpends++
      data.keySuppliers++
      data.keyParents++
      //SAVE THE CHANGED COLUMNS
      homeStore.setHomePlanColumnOrderSpendsCF(data.gridColumnsSpends);
      homeStore.setHomePlanPhaseColumnOrderSuppliersCF(data.gridColumnsSuppliers);
      homeStore.setHomePlanPhaseColumnOrderParentsCF(data.gridColumnsParents);
    }

    async function pageChangeHandler(event: any) {
      switch (data.tabSelected) {
        case ENTITY_LEVEL.SPEND_LINES:
          if (event.event.value) {
            filterSettings.paginationSpends = {
              first: event.event.value,
              after: 0,
              skip: 0
            };
          } else {
            filterSettings.paginationSpends = {
              first: event.page.take,
              after: event.page.skip,
              skip: event.page.skip
            };
          }
          await fetchDataSpends(false);
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          if (event.event.value) {
            filterSettings.paginationSuppliers = {
              first: event.event.value,
              after: 0,
              skip: 0
            };
          } else {
            filterSettings.paginationSuppliers = {
              first: event.page.take,
              after: event.page.skip,
              skip: event.page.skip
            };
          }
          await fetchDataSuppliers(false);
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          if (event.event.value) {
            filterSettings.paginationParents = {
              first: event.event.value,
              after: 0,
              skip: 0
            };
          } else {
            filterSettings.paginationParents = {
              first: event.page.take,
              after: event.page.skip,
              skip: event.page.skip
            };
          }
          await fetchDataParents(false);
          break;
        default:
          break;
      }
    }

    //- get suppliers Data
    async function fetchDataSuppliers(callTotalsValues: boolean = false, callOthersGrid: boolean = false, withoutGlobalFilter: boolean = false) {

      data.loadSuppliers = true;

      try {
        let queryString = getSupplierData(filterSettings, withoutGlobalFilter);
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.suppliers.edges.map(
          (edge: any) => edge.node
        );

        const parsedData: Array<any> = [];
        nodes.forEach(function (data: any) {
          const datas = { ...data };
          datas.spendsAmount = data.spendCounts;
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";
          datas.level = "supplier";

          applyDiversityAndVCardFlags(datas, data);
          applyEsgScore(datas, data);
          applyRegulatoryTermsModality(datas, data);
          applyActiveProgramStatus(datas, data);
          applyPhasesLabel(datas, data);
          applyFinancingsLabel(datas, data);
          applyHarmonizationsLabel(datas, data);

          parsedData.push(datas);
        });
        data.dataSuppliers = parsedData;

        if (callTotalsValues) {
          data.totalsBycolumnsSuppliers = []
          await callTotalDataByLevel('suppliers')
        }
        if (callOthersGrid) {
          await fetchDataSpends(true);
          await fetchDataParents(true);
        }

        data.loadSuppliers = false


      } catch (error) {
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        // AF-1: on a genuine failure, retry once against the unfiltered baseline
        // so the grid falls back to the full dataset instead of staying empty/stale.
        if (!withoutGlobalFilter) {
          await fetchDataSuppliers(callTotalsValues, callOthersGrid, true);
          return;
        }
        data.dataSuppliers = [];
      } finally {
        data.loadSuppliers = false;
      }
    }

    function getSupplierData(event: FilterChangeEvent, withoutGlobalFilter = false): string {
      const activeGlobalFilter = withoutGlobalFilter ? "" : setGlobalFilter;
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsSuppliers,
        viewNodesEdges
      );
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSuppliers
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortSuppliers);
      const paginationString = `first: ${event.paginationSuppliers.first} ${event.paginationSuppliers.after
          ? `, after: "${btoa(
            (event.paginationSuppliers.after - 1).toString()
          )}"`
          : ""
        }`;
      const collectionQuery = "collectionQueryProgramListSuppliers";
      const graphqlQuery = `
        {
          suppliers: ${collectionQuery}(
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            targetPlanUuid: "${props.planId}",
            targetPhaseUuid: "${props.phaseId ?? "all"}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${activeGlobalFilter || ""}
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
    async function fetchDataParents(callTotalsValues: boolean = false, callOthersGrid: boolean = false) {

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
          datas.suppliersAmount = computeSuppliersAmount(data);
          datas.supplierCounts = data.supplierCounts > 0 ? data.supplierCounts : "-";
          datas.level = "parent";

          applyDiversityAndVCardFlags(datas, data);
          applyEsgScore(datas, data);
          applyRegulatoryTermsModality(datas, data);
          applyActiveProgramStatus(datas, data);
          applyPhasesLabel(datas, data);
          applyFinancingsLabel(datas, data);
          applyHarmonizationsLabel(datas, data);

          parsedData.push(datas);
        });
        data.dataParents = parsedData;
        if (callTotalsValues) {
          data.totalsBycolumnsParents = []
          await callTotalDataByLevel('parents')
        }

        if (callOthersGrid) {
          await fetchDataSuppliers(true);
          await fetchDataSpends(true);
        }

        data.loadParents = false;
      } catch (error) {
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
      } finally {
        data.loadParents = false;
      }
    }

    function getParentsData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsParents,
        viewNodesEdges
      );
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterParents
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortParents);
      const paginationString = `first: ${event.paginationParents.first} ${event.paginationParents.after
          ? `, after: "${btoa((event.paginationParents.after - 1).toString())}"`
          : ""
        }`;
      const collectionQuery = "collectionQueryProgramListParents";
      const graphqlQuery = `
        {
          parents: ${collectionQuery}(
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            targetPlanUuid: "${props.planId}",
            targetPhaseUuid: "${props.phaseId ?? "all"}",    
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${setGlobalFilter || ""}
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
    async function fetchDataSpends(callTotalsValues: boolean = false, callOthersGrid: boolean = false) {
      data.loadSpends = true;

      try {
        let queryString = getSpendsData(filterSettings);
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.spends.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];
        nodes.forEach(function (data: any) {
          const datas = { ...data };
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";
          datas.level = "supplier";

          applyDiversityAndVCardFlags(datas, data);
          applyEsgScore(datas, data);
          applyRegulatoryTermsModality(datas, data);
          applyActiveProgramStatus(datas, data);
          applyPhasesLabel(datas, data);

          parsedData.push(datas);
        });
        data.dataSpends = parsedData;
        if (callTotalsValues) {
          data.totalsBycolumnsSpends = []
          await callTotalDataByLevel('spends')
        }

        if (callOthersGrid) {
          await fetchDataSuppliers(true);
          await fetchDataParents(true);
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        toast.error(translate.t("error.dataFetchFailed"));
        data.dataSpends = [];
      } finally {
        data.loadSpends = false;
      }
    }

    function getSpendsData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends
      );
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsSpends,
        viewNodesEdges
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after
          ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
          : ""
        }`;
      const collectionQuery = "collectionQueryProgramListSpends";
      const graphqlQuery = `
        {
          spends: ${collectionQuery}(
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            targetPlanUuid: "${props.planId}",
            targetPhaseUuid: "${props.phaseId ?? "all"}",       
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${setGlobalFilter || ""}
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

    async function dataChange(filter: any, sort: any) {
      try {
        switch (data.tabSelected) {
          case ENTITY_LEVEL.SPEND_LINES:
            filterSettings.paginationSpends = {
              first: filterSettings.paginationSpends.first,
              after: 0,
              skip: 0
            };
            filterSettings.filterSpends = filter;
            filterSettings.sortSpends = sort;
            clearTimeout(pendingRequest);
            data.totalSpends = 0;
            await fetchDataSpends(true);
            break;
          case ENTITY_LEVEL.SUPPLIERS:
            filterSettings.paginationSuppliers = {
              first: filterSettings.paginationSuppliers.first,
              after: 0,
              skip: 0
            };
            filterSettings.filterSuppliers = filter;
            filterSettings.sortSuppliers = sort;
            clearTimeout(pendingRequest);
            data.totalSuppliers = 0;
            await fetchDataSuppliers(true);
            break;
          case ENTITY_LEVEL.ULTIMATE_PARENT:
            filterSettings.paginationParents = {
              first: filterSettings.paginationParents.first,
              after: 0,
              skip: 0
            };
            filterSettings.filterParents = filter;
            filterSettings.sortParents = sort;
            clearTimeout(pendingRequest);
            data.totalParents = 0;
            await fetchDataParents(true);
            break;
          default:
            break;
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Error updating data:", error);
        toast.error(translate.t("error.dataUpdateFailed"));
      }
    }

    async function changeTabFromGrid(indexTab: number) {
      try {
        data.tabSelected = indexTab;
        homeStore.setEntityLevelTabSelected(indexTab);

        // Fetch data for the selected tab
        switch (indexTab) {
          case ENTITY_LEVEL.SPEND_LINES:
            await fetchDataSpends(true);
            break;
          case ENTITY_LEVEL.SUPPLIERS:
            await fetchDataSuppliers(true);
            break;
          case ENTITY_LEVEL.ULTIMATE_PARENT:
            await fetchDataParents(true);
            break;
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Error changing tab:", error);
        toast.error(translate.t("error.tabChangeFailed"));
      }
    }

    function getExportTotalForCollection(collection: any): number {
      if (collection === "collectionQueryPlanListParents") return data.totalParents;
      if (collection === "collectionQueryPlanListSuppliers") return data.totalSuppliers;
      if (collection === "collectionQueryPlanListSpends") return data.totalSpends;
      return 0;
    }

    function exportCSV(collection: any) {
      let filters = undefined;
      let title = "";
      let level = "";
      let columns: Array<any> = [];

      if (collection === "collectionQueryPlanListParents") {
        filters = filterSettings.filterParents;
        columns = data.gridColumnsParents;
        title = "PlanParents";
        level = "parents";
      } else if (collection === "collectionQueryPlanListSuppliers") {
        filters = filterSettings.filterSuppliers;
        columns = data.gridColumnsSuppliers;
        title = "PlanSuppliers";
        level = "suppliers";
      } else if (collection === "collectionQueryPlanListSpends") {
        filters = filterSettings.filterSpends;
        columns = data.gridColumnsSpends;
        title = "PlanSpends";
        level = "spends";
      }

      const filtersGrid = {
        telerikFilter: formatData.convertFiltersToREST(filters),
        targetPlanUuid: props.planId,
        targetPhaseUuid: props.phaseId,
        globalFilter: formatData.convertFiltersToREST(
          globalFiltersStore.getFiltersApplied
        ),
        currencyRate: useAppStore().getCurrencyAmount,
        fullDisabled: false
      };

      startExport(
        { level, title, columns, filtersGrid, section: "plan" },
        getExportTotalForCollection(collection)
      );
    }


    function setColumnsSummary(level: string) {

      let getActiveColumnsByLevel: Array<any> = [];

      switch (level) {
        case 'spends':
          getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(
            data.gridColumnsSpends
          );
          break;
        case 'suppliers':
          getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(
            data.gridColumnsSuppliers
          );
          break;
        case 'parents':
          getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(
            data.gridColumnsParents
          );
          break;
      }

      const getSummationColumns = totalColumnsUtils.getTotalFieldsSummation(getActiveColumnsByLevel, analyzeStore.customDataPointTypes)

      const getFieldsByTrueValue = totalColumnsUtils.getTotalFieldsCountByTrueValue(getActiveColumnsByLevel)

      const getFieldsByWeightedAvg = totalColumnsUtils.getTotalFieldsWeightedAvg(getActiveColumnsByLevel, analyzeStore.customDataPointTypes)




      const summaryFields = {
        'sum': getSummationColumns,
        'avg.weighted.ceil': getFieldsByWeightedAvg,
        'count.true': getFieldsByTrueValue
      }
      return summaryFields
    }


    async function callTotalDataByLevel(level: string) {
      switch (level) {
        case 'spends': {
          const totals = await fetchTotalsbyLevel(level, "plan", filterSettings.filterSpends)
          if (totals !== null) {
            data.totalsBycolumnsSpends = totals
            data.totalSpends = totals.totalCount
          }
          break;
        }

        case 'suppliers': {
          const totals = await fetchTotalsbyLevel(level, "plan", filterSettings.filterSuppliers)
          if (totals !== null) {
            data.totalsBycolumnsSuppliers = totals
            data.totalSuppliers = totals.totalCount
          }
          break;
        }

        case 'parents': {
          const totals = await fetchTotalsbyLevel(level, "plan", filterSettings.filterParents)
          if (totals !== null) {
            data.totalsBycolumnsParents = totals
            data.totalParents = totals.totalCount
          }
          break;
        }
        default:
          break;
      }

    }

    //- get suppliers Data
    async function fetchTotalsbyLevel(
      level: string,
      section: string,
      filtersApplied: any
    ) {

      const telerikFilter = graphqlUtils.convertFiltersToREST(
        filtersApplied
      );

      const response = await HomeAPI.getUniqueData(
        {
          level, field: '', currencyRate, targetProgramUuid: null, targetPlanUuid: props.planId ?? null, targetPhaseUuid: props.phaseId ?? null, section, globalFilter: formatData.convertFiltersToREST(
            globalFiltersStore.getFiltersApplied
          ), activeSpendFileVersion: spendFileVersionActiveId.value, targetOperation: null, summaryOperation: "summary", telerikFilter, summary: setColumnsSummary(level), fullDisabled: false, summaryAction: "browse"
        })

      if (
        !response.success ||
        response.data === null ||
        response.data === undefined
      ) {
        if (import.meta.env.DEV)
          console.log(
            `** Error - Invalid response in panelBarItemOptionsAPIReadAll.`
          );

        toast.error(translate.t('global.errorRetrievingData'));
        return null;
      }

      return response.data
    }

    // *** WATCHERS ***

    // Spends
    watch(
      () => data.gridColumnsSpends,
      () => {
        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {

          homeStore.setHomePlanColumnOrderSpendsCF(
            data.gridColumnsSpends
          );

          fetchDataSpends(true);
        }


      },
      { deep: true }
    );




    // Suppliers
    watch(
      () => data.gridColumnsSuppliers,
      () => {
        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
          homeStore.setHomePlanPhaseColumnOrderSuppliersCF(
            data.gridColumnsSuppliers
          );

          fetchDataSuppliers(true);
        }
      },
      { deep: true }
    );


    // Parents
    watch(
      () => data.gridColumnsParents,
      () => {

        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
          homeStore.setHomePlanPhaseColumnOrderParentsCF(
            data.gridColumnsParents
          );

          fetchDataParents(true);
        }
      },
      { deep: true }
    );

    watch(
      () => globalFiltersStore.getFiltersApplied,
      async newValue => {
        /**
         * RACE CONDITION GUARD — watch(getFiltersApplied)
         *
         * cleanupBeforeCompanyChange() resets filtersApplied to [] before the company
         * API calls complete. This triggers this watcher while selectedProgramId and
         * activeSpendFileVersion may still belong to different companies.
         *
         * Firing GraphQL queries during this window sends a program UUID that does not
         * match the active spend file version → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }

        setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(newValue);

        data.dataSpends = [];
        data.dataSuppliers = [];
        data.dataParents = [];
        data.totalSpends = 0
        data.totalSuppliers = 0
        data.totalParents = 0
        // Update grids
        await loadGridsData(true);
      }
    );

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
      if (levelofgrid === "spends") {
        homeStore.setHomePlanColumnOrderSpendsCF(null);
        data.gridColumnsSpends = getGridColumnsSpends(true);
        data.keySpends++;
      }

      if (levelofgrid === "suppliers") {
        homeStore.setHomePlanPhaseColumnOrderSuppliersCF(null);
        data.gridColumnsSuppliers = getGridColumnsSuppliers(true)
        data.keySuppliers++;
      }

      if (levelofgrid === "parents") {
        homeStore.setHomePlanPhaseColumnOrderParentsCF(null);
        data.gridColumnsParents = getGridColumnsParents(true)
        data.keyParents++;
      }
    }

    return {
      ...toRefs(data),
      changeTabFromGrid,
      dataChange,
      dataSource,
      detailTemplateSupplier,
      ENTITY_LEVEL,
      entityLevelTabSelected,
      exportCSV,
      filterSettings,
      gridColumnsParentsComputed,
      gridColumnsSpendsComputed,
      gridColumnsSuppliersComputed,
      kendoChartRelated,
      loader,
      loadingData: false,
      pageChangeHandler,
      resetDefaultColumns,
      total,
      isResetting,
      loadExport,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      confirmLargeExport,
      cancelLargeExport,
    };
  }
});
</script>
