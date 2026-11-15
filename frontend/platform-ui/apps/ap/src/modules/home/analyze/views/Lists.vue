<template>
<div class="row w-100">
  <div class="col-12">
    <CalculumLoading v-if="loadExport" :modal="true" withDescription="withDescription" :description="exportLoadingMessage"></CalculumLoading>
    <CalculumModal v-if="showLargeExportConfirm" :size="'md'" :title="$t('home.analyze.list.largeExportTitle')" :showClose="true" @close="cancelLargeExport">
      <template v-slot:modalContent>
        <p>{{ $t('home.analyze.list.largeExportWarning', { count: pendingExportCount.toLocaleString() }) }}</p>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="cancelLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.cancel') }}</span></button>
        <button class="btn btn-primary font-md" @click="confirmLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.continue') }}</span></button>
      </template>
    </CalculumModal>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadSpends), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SPEND_LINES }">
      <CalculumGridGraphql v-if="dataSpends" :gridData="dataSpends" :gridColumns="spendsColumnsComputed" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="true" :selectedTabFromView="entityLevelTabSelected" :collectionQuery="'collectionQueryProgramListSpends'" :selectedProgramId="selectedProgramId" :gridHeight="gridHeight" :key="keySpends" :levelOfGrid="'spends'" :section="'program'" :programInrecalculation="setProgramInrecalculation" :loading="loadSpends" :totalsBycolumns="totalsBycolumnsSpends" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadSuppliers), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SUPPLIERS }">
      <CalculumGridGraphql v-if="dataSuppliers" :gridData="dataSuppliers" :gridColumns="suppliersColumnsComputed" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalSuppliers" :skip="filterSettings.paginationSuppliers.after" :take="filterSettings.paginationSuppliers.first" :defaultPageSize="filterSettings.paginationSuppliers.first" :filter="filterSettings.filterSuppliers" :sort="filterSettings.sortSuppliers" :showTabsLevels="true" :selectedTabFromView="entityLevelTabSelected" :isExpanded="true" :nameTemplateChild="'detailTemplateSupplierAnalyze'" :collectionQuery="'collectionQueryProgramListSuppliers'" :rowColors="true" :selectedProgramId="selectedProgramId" :gridHeight="gridHeight" :key="keySuppliers" :levelOfGrid="'suppliers'" :section="'program'" :programInrecalculation="setProgramInrecalculation" :loading="loadSuppliers" :totalsBycolumns="totalsBycolumnsSuppliers" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadParents), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.ULTIMATE_PARENT }">
      <CalculumGridGraphql v-if="dataParents" :gridData="dataParents" :gridColumns="parentsColumnsComputed" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalParents" :skip="filterSettings.paginationParents.after" :take="filterSettings.paginationParents.first" :defaultPageSize="filterSettings.paginationParents.first" :filter="filterSettings.filterParents" :sort="filterSettings.sortParents" :showTabsLevels="true" :selectedTabFromView="entityLevelTabSelected" :isExpanded="true" :nameTemplateChild="'detailTemplateParentAnalyze'" :collectionQuery="'collectionQueryProgramListParents'" :rowColors="true" :isForParent="true" :selectedProgramId="selectedProgramId" :gridHeight="gridHeight" :key="keyParents" :levelOfGrid="'parents'" :section="'program'" :programInrecalculation="setProgramInrecalculation" :loading="loadParents" :totalsBycolumns="totalsBycolumnsParents" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
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
  defineComponent,
  nextTick,
  inject
} from "vue";

import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { Grid } from "@progress/kendo-vue-grid";
import * as cacheGrid from "@/utils/dataGridClear";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { translate } from "@/utils/translation";
import {
  defaultProgramGridSpendsColumns,
  defaultProgramGridSuppliersColumns,
  defaultProgramGridUltimateParentColumns
} from "../data/graphqlColums";
import * as graphqlUtils from "@/utils/graphqlUtils";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import { ENTITY_LEVEL, ArrayUtils } from "@/utils";
import { nodesEdges } from "../data/nodesEdges";
import * as formatData from "@/utils/FormatData";
import { saveExcel } from "@progress/kendo-vue-excel-export";
import { onBeforeRouteLeave } from "vue-router";
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import useApolloClient from "@/services/graphql/useApolloClient";
import { FilterChangeEvent } from "@/types/filterSettings";
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import useUser from "@/services/user/composables/useUser";
import useSpendFile from "@/composables/useSpendFile";
import * as kendoChartRelated from '@/utils/kendoChartRelated';
import useCompany from "@/composables/useCompany"
import useSMEFeature from "@/composables/useSMEFeature";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import * as HomeAPI from "@/modules/home/api";
import { useToast } from 'vue-toastification';
import { useAnalyzeStore } from "@/stores/analyze";
import { useHomeStore } from '@/stores/home';
import { useAppStore } from '@/stores/app';
import { useUserStore } from '@/stores/user';
import { useConsistentFetch } from '@/composables/useConsistentFetch';
import { useGridExport } from "@/modules/home/analyze/composables/useGridExport";

function renameColumn(cols: any[], field: string, title: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].title = title;
}
function setCellTemplate(cols: any[], field: string, cell: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].cell = cell;
}

function resolveColumns(columns: any[], gridCache: any[]): any[] {
  if (gridCache && gridCache.length && JSON.stringify(columns) !== JSON.stringify(gridCache)) {
    return cacheGrid.clearCache(columns, gridCache);
  }
  return columns;
}

export default defineComponent({
  name: "AnalyzeLists",
  components: {
    CalculumLoading,
    CalculumModal,
    CalculumGridGraphql,
    Grid,
    GridSkeleton
  },
  props: {
    selectedProgramId: { type: String, required: true },
    keyLists: { type: Number, required: true, default: 0 },
    programInrecalculation: { type: Boolean, required: true },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false },
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore();
    const analyzeStore = useAnalyzeStore();
    const homeStore = useHomeStore();
    const userStore = useUserStore();
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid);
    const payOnTermsIsAllowed = computed(() => userStore.getShowPayOnTerms);
    const { useFeatureScfStrategy, isPilotAccount, useFeature9BoxesFinancing, useFeatureVirtualCard, userIsAdmin, useFeatureSupplierStandard, useFeaturePeerGroupStandard } = useUser();
    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()
    const { usevCardGroupsEnabled } = useCompany()
    const { smeRelatedColumnsDisplayBasedOnSMEFeature } = useSMEFeature()
    const { spendFileVersionActiveId,
      spendFileVersionActiveNameCustomDataPoints,
      spendFileVersionActiveCustomDataPointsHasData,
    } = useSpendFile();
    const toast = useToast();

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
    let setDisabled = false;

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
      setProgramInrecalculation: boolean;
      volumesSum: number;
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
      setProgramInrecalculation: props.programInrecalculation,
      volumesSum: 0,
      totalsBycolumnsSpends: [],
      totalsBycolumnsSuppliers: [],
      totalsBycolumnsParents: []
    });

    // *** Apollo Client ***

    const { apolloClientResetStore } = useApolloClient();

    // *** END Apollo Client ***

    window.onresize = () => {
      setGridHeight();
    };

    onBeforeRouteLeave(async to => {
      await apolloClientResetStore()

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


    function getGridColumnsSuppliers(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = [];
      defaultProgramGridSuppliersColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        columns.push(newConfig);
      });

      
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomeAnalyzeGridColumnsListSupplier;
      let resetColumns = resolveColumns(columns, gridCache);

      const spendCountsTitle = translate.t('home.analyze.table.numberOfSpends');
      renameColumn(resetColumns, 'spendCounts', spendCountsTitle);

      if (isPilotAccount()) {
        setCellTemplate(resetColumns, 'parentName', 'restrictModalEntitySupplier');
      }

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      if (!userIsAdmin.value) {
        resetColumns = kendoChartRelated.removeColumnsforNonAdmins(resetColumns);
      }


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

      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns)
      }

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }

      if (!payOnTermsIsAllowed.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'contractualPaymentTermsWithoutCashDiscounts');
      }

      homeStore.setHomeAnalyzeGridColumnsListSupplier(resetColumns);
      return resetColumns;
    }

    function getGridColumnsParents(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = [];
      defaultProgramGridUltimateParentColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        columns.push(newConfig);
      });
      let resetColumns = [];
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomeAnalyzeGridColumnsListParentCF;
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

      const entityName = resetColumns.findIndex(
        (x: any) => x.field === "entityName"
      );
      if (entityName > -1) {
        resetColumns[entityName].title = translate.t(
          "home.analyze.table.ultimateParentName"
        );
      }

      const entitySupplierLeverageLevel = resetColumns.findIndex(
        (x: any) => x.field === "entitySupplierLeverageLevel"
      );
      if (entitySupplierLeverageLevel >= 0) {
        resetColumns[entitySupplierLeverageLevel].title = translate.t(
          "home.analyze.table.parentLeverage"
        );
      }

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      if (!userIsAdmin.value) {
        resetColumns = kendoChartRelated.removeColumnsforNonAdmins(resetColumns);
      }

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

      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)


      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns)
      }

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }

      if (!payOnTermsIsAllowed.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'contractualPaymentTermsWithoutCashDiscounts');
      }

      homeStore.setHomeAnalyzeGridColumnsListParentCF(resetColumns);

      return resetColumns;
    }

    function getGridColumnsSpends(resetColumnsFlag: any = false): Array<any> {
      const columns: Array<any> = [];

      defaultProgramGridSpendsColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        columns.push(newConfig);
      });
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomeAnalyzeGridColumnsList;
      let resetColumns = resolveColumns(columns, gridCache);

      if (isPilotAccount()) {
        setCellTemplate(resetColumns, 'parentName', 'restrictModalEntitySpend');
      }

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      if (!userIsAdmin.value) {
        resetColumns = kendoChartRelated.removeColumnsforNonAdmins(resetColumns);
      }

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

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }

      if (!payOnTermsIsAllowed.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'contractualPaymentTermsWithoutCashDiscounts');
      }

      homeStore.setHomeAnalyzeGridColumnsList(resetColumns);
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
    });

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
          level, field: '', currencyRate, targetProgramUuid: props.selectedProgramId ?? null, targetPlanUuid: null, targetPhaseUuid: null, section, globalFilter: formatData.convertFiltersToREST(
            globalFiltersStore.getFiltersApplied
          ), activeSpendFileVersion: spendFileVersionActiveId.value, targetOperation: null, summaryOperation: "summary", telerikFilter, summary: setColumnsSummary(level), fullDisabled: false
        })

      if (
        !response.success ||
        response.data === null ||
        response.data === undefined
      ) {
        if (import.meta.env.DEV)
          console.log(`** Error - Invalid response in panelBarItemOptionsAPIReadAll.`);

        if (!response.skipped) toast.error(translate.t("error.server500"));
        return null;
      }

      return response.data
    }


    async function callTotalDataByLevel(level: string) {
      switch (level) {
        case 'spends': {
          const totals = await fetchTotalsbyLevel(level, "program", filterSettings.filterSpends)
          if (totals !== null) {
            data.totalsBycolumnsSpends = totals
            data.totalSpends = totals.totalCount
          }
          break;
        }

        case 'suppliers': {
          const totals = await fetchTotalsbyLevel(level, "program", filterSettings.filterSuppliers)
          if (totals !== null) {
            data.totalsBycolumnsSuppliers = totals
            data.totalSuppliers = totals.totalCount
          }
          break;
        }

        case 'parents': {
          const totals = await fetchTotalsbyLevel(level, "program", filterSettings.filterParents)
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

    async function fetchDataSuppliers(callTotalsValues: boolean = false, callOthersGrid: boolean = false, withoutGlobalFilter: boolean = false) {

      data.loadSuppliers = true;

      try {

        let queryString = getSupplierData(filterSettings, withoutGlobalFilter);
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.suppliers.edges.map(
          (edge: any) => edge.node
        );

        const parsedData: Array<any> = [];

        data.volumesSum = 0

        nodes.forEach(function (dataElement: any) {
          const datas = Object.assign({}, dataElement);
          datas.spendsAmount = dataElement.spendCounts;
          datas.buyerCountry = dataElement.buyerCountry ?? "-";
          datas.buyerRegion = dataElement.buyerRegion ?? "-";


          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(dataElement.entityEthnicMinorityOwnedBusiness)
          );

          datas.level = "supplier";
          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(dataElement.entityWomanOwnedBusiness)
          );

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(dataElement.entityVeteranOwnedBusiness)
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(dataElement.isVCardApplied)
          );
          const validateESG = [0, 1, 2, 3, 4, 100];

          let value = 0;

          if (validateESG.includes(parseInt(dataElement.entityInvestVerteScore))) {
            value = parseInt(dataElement.entityInvestVerteScore);
          } else {
            value = 404;
          }

          datas.entityInvestVerteScore = translate.t(
            "home.entityCard.rating.esgClassification.c" + value
          );

          datas.entityRegulatoryTermsStrategyModality = dataElement.entityRegulatoryTermsStrategyModality
            ? formatData.getStrategyModalityValue(
              dataElement.entityRegulatoryTermsStrategyModality
            )
            : "-";

          datas.isActive = !!dataElement.activeProgram;

          datas.activeProgram = dataElement.activeProgram
            ? dataElement.activeProgram
            : translate.t("tableStatus.notAssigned");

          if (dataElement.activeProgram && dataElement.activeProgram !== null) {
            const programs = dataElement.activeProgram.split(",");
            if (programs.length > 1) {
              datas.activeProgram = translate.t("tableStatus.multiple");
            }
          } else {
            datas.activeProgram = translate.t("tableStatus.notAssigned");
          }

          /** For multiple values */
          if (dataElement.financings) {
            const splitFinancing = dataElement.financings.split("|");
            if (splitFinancing.length > 1) {
              datas.financings = translate.t("tableStatus.multiple");
              datas.financingColors = "rgba(44,54,69,.1)";
            }
          }

          if (dataElement.harmonizations) {
            const splitHarmonizations = dataElement.harmonizations.split("|");
            if (splitHarmonizations.length > 1) {
              datas.harmonizations = translate.t("tableStatus.multiple");
              datas.harmColors = "rgba(44,54,69,.1)";
            }
          }

          parsedData.push(datas);
        });
        data.setProgramInrecalculation = false;

        data.dataSuppliers = parsedData;
        if (callTotalsValues) {
          data.totalsBycolumnsSuppliers = []
          callTotalDataByLevel('suppliers')
        }
        if (callOthersGrid) {
          fetchDataSpends(true);
          fetchDataParents(true);
        }
        data.loadSuppliers = false;
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);

        // AF-1: on a genuine failure, retry once against the unfiltered baseline
        // so the grid falls back to the full dataset instead of staying empty/stale.
        if (!withoutGlobalFilter) {
          await fetchDataSuppliers(callTotalsValues, callOthersGrid, true);
          return;
        }

        data.setProgramInrecalculation = false;
        data.loadSuppliers = false;
        data.dataSuppliers = [];
      }
    }
    function getSupplierData(event: FilterChangeEvent, withoutGlobalFilter = false): string {

      const activeGlobalFilter = withoutGlobalFilter ? "" : setGlobalFilter;
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsSuppliers,
        nodesEdges
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
            targetProgramUuid: "${props.selectedProgramId}",
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            fullDisabled: ${setDisabled},
            ${paginationString},
            ${activeGlobalFilter ? activeGlobalFilter : ""}
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
          const datas = Object.assign({}, data);
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";
          datas.suppliersAmount =
            data.entityType === "supplier"
              ? "-"
              : data.supplierCounts > 0
                ? data.supplierCounts
                : "-";
          datas.supplierCounts =
            data.supplierCounts > 0 ? data.supplierCounts : "-";
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
          );

          datas.level = "parent";

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness)
          );

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness)
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(data.isVCardApplied)
          );
          const validateESG = [0, 1, 2, 3, 4, 100];

          let value = 0;

          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore);
          } else {
            value = 404;
          }

          datas.entityInvestVerteScore = translate.t(
            "home.entityCard.rating.esgClassification.c" + value
          );

          datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality
            ? formatData.getStrategyModalityValue(
              data.entityRegulatoryTermsStrategyModality
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

          parsedData.push(datas);
        });

        data.setProgramInrecalculation = false;

        data.dataParents = parsedData;

        if (callTotalsValues) {
          data.totalsBycolumnsParents = []
          callTotalDataByLevel('parents')
        }

        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataSpends(true);
        }

        data.loadParents = false;
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.setProgramInrecalculation = false;
        data.loadParents = false;
      }
    }

    function getParentsData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsParents,
        nodesEdges
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
            targetProgramUuid: "${props.selectedProgramId}",
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            fullDisabled: ${setDisabled},
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
    async function fetchDataSpends(callTotalsValues: boolean = false, callOthersGrid: boolean = false) {
      data.loadSpends = true;

      try {
        let queryString = getSpendsData(filterSettings);
        // Enabling loading
        data.loadSpends = true;

        const response = await graphqlUtils.getCollectionData(queryString);

        const nodes = response.data.spends.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];

        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data);
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
          );

          datas.level = "supplier";

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness)
          );

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness)
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(data.isVCardApplied)
          );
          const validateESG = [0, 1, 2, 3, 4, 100];

          let value = 0;

          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore);
          } else {
            value = 404;
          }

          datas.entityInvestVerteScore = translate.t(
            "home.entityCard.rating.esgClassification.c" + value
          );

          datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality
            ? formatData.getStrategyModalityValue(
              data.entityRegulatoryTermsStrategyModality
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
          parsedData.push(datas);
        });

        data.setProgramInrecalculation = false;

        data.dataSpends = parsedData;

        if (callTotalsValues) {
          data.totalsBycolumnsSpends = []
          callTotalDataByLevel('spends')
        }

        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataParents(true);
        }
        data.loadSpends = false;

      } catch (error) {
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.setProgramInrecalculation = false;
        data.loadSpends = false;
      }
    }

    function getSpendsData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends
      );
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsSpends,
        nodesEdges
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
            targetProgramUuid: "${props.selectedProgramId}",
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            fullDisabled: ${setDisabled},
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
      homeStore.setHomeAnalyzeGridColumnsList(data.gridColumnsSpends);

      homeStore.setHomeAnalyzeGridColumnsListSupplier(data.gridColumnsSuppliers);

      homeStore.setHomeAnalyzeGridColumnsListParentCF(data.gridColumnsParents);
   
    }

    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'entityName: \"asc\"';
      }
      return sort
        .map(descriptor => `${descriptor.field}: "${descriptor.dir}"`)
        .join(", ");
    }

    async function dataChange(filter: any, sort: any) {
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
          data.totalSpends = 0
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
          data.totalSuppliers = 0
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
          data.totalParents = 0
          await fetchDataParents(true);
          break;
        default:
          break;
      }
    }

    async function changeTabFromGrid(indexTab: number) {
      data.tabSelected = -1; // oculta todos los tabs
      await nextTick();      // espera a que se oculte
      setTimeout(() => {
        data.tabSelected = indexTab;
        homeStore.setEntityLevelTabSelected(indexTab);
      }, 10); // delay corto pero suficiente
    }

    function getExportTotalForCollection(collection: any): number {
      if (collection === "collectionQueryProgramListParents") return data.totalParents;
      if (collection === "collectionQueryProgramListSuppliers") return data.totalSuppliers;
      if (collection === "collectionQueryProgramListSpends") return data.totalSpends;
      return 0;
    }

    // Entry point bound to the grid's @exportCSV event. Resolves the columns
    // and filters for the active level and delegates the loading / large-export
    // UX to useGridExport.
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
          globalFiltersStore.getFiltersApplied
        ),
        currencyRate: useAppStore().getCurrencyAmount,
        fullDisabled: false
      };

      startExport(
        { level, title, columns, filtersGrid },
        getExportTotalForCollection(collection)
      );
    }

    // *** Watchers ***

    // Load column types (number/days/money) for custom data points 21-26 whenever the program changes.
    watch(
      () => props.selectedProgramId,
      (programId) => {
        if (programId) analyzeStore.loadCustomDataPointTypes(programId);
      },
      { immediate: true }
    );

    // Centralized data-fetch orchestration — handles first mount, refresh, and reactive changes.
    const consistentFetch = useConsistentFetch([() => fetchDataSuppliers(true), () => fetchDataParents(true), () => fetchDataSpends(true)], () => props.selectedProgramId, () => spendFileVersionActiveId.value);

    // keyLists increments on parent re-mount — force a re-fetch through the
    // centralized guard so disableWatchers / consistency checks still apply.
    watch(
      () => props.keyLists,
      () => {
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }
        data.setProgramInrecalculation = true;
        consistentFetch.triggerFetch();
      },
      { deep: true }
    );

    watch(
      () => props.programInrecalculation,
      newValue => {
        data.setProgramInrecalculation = newValue;
      },
      { deep: true }
    );

    // Spends
    watch(
      () => data.gridColumnsSpends,
      () => {
        /**
         * RACE CONDITION GUARD — watch(gridColumnsSpends)
         *
         * getCustomHeaderTitles() (called in onMounted) can set gridColumnsSpends while
         * a company change is in progress. Without this guard, fetchDataSpends() fires
         * with mismatched targetProgramUuid / activeSpendFileVersion → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }

        homeStore.setHomeAnalyzeGridColumnsList(
          data.gridColumnsSpends
        );

        // Only fetch data if no other grid is currently loading AND programs are
        // available.  On initial mount useConsistentFetch handles the first fetch;
        // firing here before programs are loaded would send a premature request
        // whose (possibly empty) Apollo-cached response could shadow the real one.
        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents
            && analyzeStore.getAllPrograms?.length > 0) {
          fetchDataSpends(true);
        }


      },
      { deep: true }
    );


    // Suppliers
    watch(
      () => data.gridColumnsSuppliers,
      () => {
        /**
         * RACE CONDITION GUARD — watch(gridColumnsSuppliers)
         *
         * Same as gridColumnsSpends: column initialization during a company change
         * can trigger fetchDataSuppliers() with mismatched context → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }

        homeStore.setHomeAnalyzeGridColumnsListSupplier(
          data.gridColumnsSuppliers
        );

        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents
            && analyzeStore.getAllPrograms?.length > 0) {
          fetchDataSuppliers(true);
        }
      },
      { deep: true }
    );


    // Parents
    watch(
      () => data.gridColumnsParents,
      () => {
        /**
         * RACE CONDITION GUARD — watch(gridColumnsParents)
         *
         * Same as gridColumnsSpends: column initialization during a company change
         * can trigger fetchDataParents() with mismatched context → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }

        homeStore.setHomeAnalyzeGridColumnsListParentCF(
          data.gridColumnsParents
        );

        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents
            && analyzeStore.getAllPrograms?.length > 0) {
          fetchDataParents(true);
        }
      },
      { deep: true }
    );

    watch(
      () => globalFiltersStore.getFiltersApplied,
      async newValue => {
        // Skip if watchers are disabled
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

    watch(
      () => props.hasFinancing,
      () => {
        data.gridColumnsSpends = getGridColumnsSpends();
        data.gridColumnsSuppliers = getGridColumnsSuppliers();
        data.gridColumnsParents = getGridColumnsParents();
        getCustomHeaderTitles();
      }
    );

    watch(hideAverageDaysPaid, () => {
      data.gridColumnsSpends = getGridColumnsSpends();
      data.gridColumnsSuppliers = getGridColumnsSuppliers();
      data.gridColumnsParents = getGridColumnsParents();
      getCustomHeaderTitles();
    });

    watch(payOnTermsIsAllowed, () => {
      data.gridColumnsSpends = getGridColumnsSpends();
      data.gridColumnsSuppliers = getGridColumnsSuppliers();
      data.gridColumnsParents = getGridColumnsParents();
      getCustomHeaderTitles();
    });

    watch(
      () => props.programInrecalculation,
      () => {
        data.gridColumnsSpends = getGridColumnsSpends();
        data.gridColumnsSuppliers = getGridColumnsSuppliers();
        data.gridColumnsParents = getGridColumnsParents();        
        getCustomHeaderTitles();
      }
    );

    const spendsColumnsComputed = computed(() => {
      return data.gridColumnsSpends;
    });

    const suppliersColumnsComputed = computed(() => {
      return data.gridColumnsSuppliers;
    });

    const parentsColumnsComputed = computed(() => {
      return data.gridColumnsParents;
    });


    function resetDefaultColumns(levelofgrid: any) {
      if (levelofgrid === "spends") {
        homeStore.setHomeAnalyzeGridColumnsList(null);
        data.gridColumnsSpends = getGridColumnsSpends(true)
        data.keySpends++;
      }

      if (levelofgrid === "suppliers") {
        homeStore.setHomeAnalyzeGridColumnsListSupplier(null);
        data.gridColumnsSuppliers = getGridColumnsSuppliers(true)
        data.keySuppliers++;
      }

      if (levelofgrid === "parents") {
        homeStore.setHomeAnalyzeGridColumnsListParentCF(null);
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
      loadExport,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      confirmLargeExport,
      cancelLargeExport,
      filterSettings,
      kendoChartRelated,
      loader,
      loadingData: false, // ? - ??
      pageChangeHandler,
      parentsColumnsComputed,      
      resetDefaultColumns,
      spendsColumnsComputed,
      suppliersColumnsComputed,
      total,
      useFeatureVirtualCard,
    };
  }
});
</script>