<template>
<div class="row">
  <div class="col-12">
    <CalculumLoading v-if="loadExport" block="block" withDescription="withDescription" :description="exportLoadingMessage"></CalculumLoading>
    <CalculumModal v-if="showLargeExportConfirm" :size="'md'" :title="$t('home.analyze.list.largeExportTitle')" :showClose="true" @close="cancelLargeExport">
      <template v-slot:modalContent>
        <p>{{ $t('home.analyze.list.largeExportWarning', { count: pendingExportCount.toLocaleString() }) }}</p>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="cancelLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.cancel') }}</span></button>
        <button class="btn btn-primary font-md" @click="confirmLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.continue') }}</span></button>
      </template>
    </CalculumModal>
    <div class="col-12 widget" :class="{  'bg-blur': (loadSpends), 'hidden-grid': levelOfGrid !== ENTITY_LEVEL.SPEND_LINES }">
      <CalculumLoading v-if="loadSpends" block="block"></CalculumLoading>
      <CalculumGridGraphql v-if="dataSpends" :gridData="dataSpends" :gridColumns="gridColumnsSpends" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="true" :selectedTabFromView="levelOfGrid" :collectionQuery="'collectionQueryProgramListSpends'" :selectedProgramId="selectedProgramId" :onlyShowActiveTab="true" :gridHeight="gridHeight" :key="keySpends" :levelOfGrid="'spends'" :section="'program'" :programInrecalculation="programInrecalculation" :totalsBycolumns="totalsBycolumnsSpends" @dataChange="dataChange" @pagechange="pageChangeHandler" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{  'bg-blur': (loadSuppliers), 'hidden-grid': levelOfGrid !== ENTITY_LEVEL.SUPPLIERS }">
      <CalculumLoading v-if="loadSuppliers" block="block"></CalculumLoading>
      <CalculumGridGraphql v-if="dataSuppliers" :gridData="dataSuppliers" :gridColumns="gridColumnsSuppliers" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalSuppliers" :skip="filterSettings.paginationSuppliers.after" :take="filterSettings.paginationSuppliers.first" :defaultPageSize="filterSettings.paginationSuppliers.first" :filter="filterSettings.filterSuppliers" :sort="filterSettings.sortSuppliers" :showTabsLevels="true" :selectedTabFromView="levelOfGrid" :isExpanded="true" :nameTemplateChild="'listSuppliersChildBoxes'" :collectionQuery="'collectionQueryProgramListSuppliers'" :rowColors="true" :selectedProgramId="selectedProgramId" :onlyShowActiveTab="true" :gridHeight="gridHeight" :key="keySuppliers" :levelOfGrid="'suppliers'" :section="'program'" :programInrecalculation="programInrecalculation" :typeOf9Boxes="typeOf9Boxes" :totalsBycolumns="totalsBycolumnsSuppliers" @dataChange="dataChange" @pagechange="pageChangeHandler" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{  'bg-blur': (loadParents), 'hidden-grid': levelOfGrid !== ENTITY_LEVEL.ULTIMATE_PARENT }">
      <CalculumLoading v-if="loadParents" block="block"></CalculumLoading>
      <CalculumGridGraphql v-if="dataParents" :gridData="dataParents" :gridColumns="gridColumnsParents" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalParents" :skip="filterSettings.paginationParents.after" :take="filterSettings.paginationParents.first" :defaultPageSize="filterSettings.paginationParents.first" :filter="filterSettings.filterParents" :sort="filterSettings.sortParents" :showTabsLevels="true" :selectedTabFromView="levelOfGrid" :isExpanded="true" :nameTemplateChild="'listParentsChildBoxes'" :collectionQuery="'collectionQueryProgramListParents'" :rowColors="true" :isForParent="true" :selectedProgramId="selectedProgramId" :onlyShowActiveTab="true" :gridHeight="gridHeight" :key="keyParents" :levelOfGrid="'parents'" :section="'program'" :programInrecalculation="programInrecalculation" :typeOf9Boxes="typeOf9Boxes" :totalsBycolumns="totalsBycolumnsParents" @dataChange="dataChange" @pagechange="pageChangeHandler" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
  </div>
</div>
</template>

<script lang='ts'>
import { reactive, toRefs, watch, ref, onMounted, defineComponent, ComputedRef, computed } from 'vue'
import CalculumGridGraphql from '@/modules/components/grid/CalculumGridGraphql.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { Grid } from '@progress/kendo-vue-grid'
import * as cacheGrid from '@/utils/dataGridClear'
import { SortDescriptor } from '@progress/kendo-data-query/dist/npm/sort-descriptor'
import { translate } from '@/utils/translation'
import { boxesSpendColumns, boxesSupplierColumns, boxesUltimateParentColumns, boxesSpendColumnsFinancing, boxesSupplierColumnsFinancing, boxesSupplierColumnsVcard, boxesUltimateParentColumnsFinancing, boxesUltimateParentColumnsVcard, boxesSpendColumnsVcard, boxesSpendColumnsFinancingSCF, boxesSupplierColumnsFinancingSCF,boxesUltimateParentColumnsFinancingSCF } from '../data/9boxesGraphQlColumns'
import * as graphqlUtils from '@/utils/graphqlUtils'
import { ENTITY_LEVEL } from '@/utils'
import { nodesEdges } from '../data/nodesEdges';
import { getYesOrNo, getStrategyModalityValue, convertFiltersToREST } from '@/utils/FormatData'
import { saveExcel } from '@progress/kendo-vue-excel-export'
import { onBeforeRouteLeave } from 'vue-router'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useHomeStore } from '@/stores/home'
import { FilterChangeEvent } from '@/types/filterSettings'
import useApolloClient from '@/services/graphql/useApolloClient'
import useSpendFile from "@/composables/useSpendFile";
import { useUser } from '@/composables'
import * as kendoChartRelated from '@/utils/kendoChartRelated'
import useCompany from "@/composables/useCompany"
import useSMEFeature from "@/composables/useSMEFeature"
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import * as HomeAPI from "@/modules/home/api";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import { useToast } from "vue-toastification";
import { useAnalyzeStore } from "@/stores/analyze";
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { ArrayUtils } from "@/utils";
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

export default defineComponent({
  name: 'ListsNineBoxes',
  components: {
    CalculumLoading,
    CalculumModal,
    CalculumGridGraphql,
    Grid
  },
  props: {
    selectedProgramId: { type: String, required: true },
    levelOfGrid: { type: Number, required: true },
    selectedBoxesArray: { type: Array, required: true },
    programInrecalculation: { type: Boolean, required: true },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false },
    typeOf9Boxes: { type: String, required: true },
  },
  setup(props) {

    const globalFiltersStore = useGlobalFiltersStore()
    const homeStore = useHomeStore()
    const analyzeStore = useAnalyzeStore();
    // Load custom data point (21-26) types so days columns format without decimals and aggregate
    // as weighted avg in the footer. Keyed to the active program.
    watch(() => props.selectedProgramId, (id) => {
      if (id) analyzeStore.loadCustomDataPointTypes(id)
    }, { immediate: true })
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
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

    const { usevCardGroupsEnabled } = useCompany()
    const { smeRelatedColumnsDisplayBasedOnSMEFeature } = useSMEFeature()
    const {
      useFeatureScfStrategy,
      isPilotAccount,
      useFeatureVirtualCard,
      useFeatureSupplierStandard,
      useFeaturePeerGroupStandard,
    } = useUser();
    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()


    const abortSuppliers = ref<AbortController | null>(null);
    const abortParents = ref<AbortController | null>(null);
    const abortSpends = ref<AbortController | null>(null);
    const {
      spendFileVersionActiveId,
      spendFileVersionActiveNameCustomDataPoints,
      spendFileVersionActiveCustomDataPointsHasData,
    } = useSpendFile()

    let dataSource = ref(null);
    let total = ref(0);
    let loader = ref(false);
    let pendingRequest: any;
    let currencyRate: number = useAppStore().getCurrencyAmount;
    let setTargetNineBoxes = props.selectedBoxesArray.length > 0 && props.selectedBoxesArray.length < 9 ? props.selectedBoxesArray.toString() : ''
    const hasVcard = setHasVcard()
    const hasTermExtension = setHasTermExtension()

    let field9boxesQuery = ''

    switch (props.typeOf9Boxes) {
      case 'cashFlow':
        field9boxesQuery = `targetNineBoxes: "${setTargetNineBoxes}"`
        break;
      case 'financing':
        field9boxesQuery = `targetNineBoxesFinancing: "${setTargetNineBoxes}"`
        break;
      case 'scf9Box':
        field9boxesQuery = `targetNineBoxesSCF: "${setTargetNineBoxes}"`
        break;
      case 'vcard':
        field9boxesQuery = `targetNineBoxesVCard: "${setTargetNineBoxes}"`
        break;
      default:
        break;
    }



    let setDisabled = false
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
          field: isPilotAccount() ? "isPilot" : 'entityName',
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
          field: isPilotAccount() ? "isPilot" : 'entityName',
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
          field: isPilotAccount() ? "isPilot" : 'entityName',
          dir: isPilotAccount() ? "desc" : "asc"
        }
      ]
    };


    const detailTemplateSupplier = ref('detailTemplateSupplier')
    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(globalFiltersStore.getFiltersApplied)

    const entityLevelTabSelected: ComputedRef<number> = computed<number>(
      () => homeStore.getEntityLevelTabSelected
    );

    interface DataInterface {
      loadSpends: boolean,
      loadSuppliers: boolean,
      loadParents: boolean,
      dataSpends: Array<any>,
      dataSuppliers: Array<any>,
      dataParents: Array<any>,
      totalSpends: number,
      totalSuppliers: number,
      totalParents: number,
      keySpends: number,
      keySuppliers: number,
      keyParents: number,
      gridColumnsSpends: Array<any>,
      gridColumnsSuppliers: Array<any>,
      gridColumnsParents: Array<any>,
      gridHeight: string,
      toExport: Array<any>,
      columnsToExport: Array<any>,
      customHeaders: any,
      customHasData: boolean[],
      totalsBycolumnsSpends: Array<any> | null,
      totalsBycolumnsSuppliers: Array<any> | null,
      totalsBycolumnsParents: Array<any> | null
      queryWatcher: any | null
    }

    const SUPPLIER_COLUMNS_BY_TYPE: Record<string, any[]> = {
      cashFlow: boxesSupplierColumns,
      financing: boxesSupplierColumnsFinancing,
      scf9Box: boxesSupplierColumnsFinancingSCF,
      vcard: boxesSupplierColumnsVcard,
    };

    const PARENT_COLUMNS_BY_TYPE: Record<string, any[]> = {
      cashFlow: boxesUltimateParentColumns,
      financing: boxesUltimateParentColumnsFinancing,
      scf9Box: boxesUltimateParentColumnsFinancingSCF,
      vcard: boxesUltimateParentColumnsVcard,
    };

    const SPEND_COLUMNS_BY_TYPE: Record<string, any[]> = {
      cashFlow: boxesSpendColumns,
      financing: boxesSpendColumnsFinancing,
      scf9Box: boxesSpendColumnsFinancingSCF,
      vcard: boxesSpendColumnsVcard,
    };

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
      keySpends: new Date().getUTCMilliseconds(),
      keySuppliers: new Date().getUTCMilliseconds(),
      keyParents: new Date().getUTCMilliseconds(),
      gridColumnsSpends: getGridColumnsSpends(),
      gridColumnsSuppliers: getGridColumnsSuppliers(),
      gridColumnsParents: getGridColumnsParents(),
      gridHeight: 'auto',
      toExport: [],
      columnsToExport: [],
      customHeaders: [],
      customHasData: [],
      totalsBycolumnsSpends: [],
      totalsBycolumnsSuppliers: [],
      totalsBycolumnsParents: [],
      queryWatcher: null
    })


    //** Reset grpahql cache **/

    const { apolloClientResetStore } = useApolloClient()


    window.onresize = () => {
      setGridHeight()
    }

    onBeforeRouteLeave((to) => {
      apolloClientResetStore()
    })

    function setGridHeight() {
      const getSubMain = document.getElementById('container-main-id')
      if (getSubMain) {
        if ((getSubMain.clientHeight - 115) < 350) {
          data.gridHeight = '350px'
        } else {
          data.gridHeight = (getSubMain.clientHeight - 115) + 'px'
        }
      }
    }

    function saveSupplierColumnsByType(type: string, cols: any[]): void {
      switch (type) {
        case 'cashFlow': analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierList(cols); break;
        case 'financing': analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancing(cols); break;
        case 'scf9Box': analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF(cols); break;
        case 'vcard': analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListVcard(cols); break;
      }
    }


    function getSupplierGridCache(type: string, flag: boolean): any[] {
      if (flag) return [];
      const map: Record<string, any[]> = {
        cashFlow: analyzeStore.getHomeAnalyzeProgramNineBoxesSupplierList,
        financing: analyzeStore.getHomeAnalyzeProgramNineBoxesSupplierListFinancing,
        scf9Box: analyzeStore.getHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF,
        vcard: analyzeStore.getHomeAnalyzeProgramNineBoxesSupplierListVcard,
      };
      return map[type] ?? [];
    }

    function getGridColumnsSuppliers(resetColumnsFlag: boolean = false): Array<any> {

      const toSetColumns = SUPPLIER_COLUMNS_BY_TYPE[props.typeOf9Boxes] ?? [];

      const columns: Array<any> = []
      toSetColumns.forEach(function (config: any) {
        const newConfig = { ...config}
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = getSupplierGridCache(props.typeOf9Boxes, resetColumnsFlag);

      /** 
       * If "gridCache" is not empty and different from default grid columns array
       */
      if (gridCache
        && gridCache.length
        && (JSON.stringify(columns)
          !== JSON.stringify(gridCache))) {
        // Update cached data
        resetColumns = cacheGrid.clearCache(columns, gridCache)

      } else {
        // Use cached data
        resetColumns = columns
      }

      const spendCountsTitle = translate.t('home.analyze.table.numberOfSpends');
      renameColumn(resetColumns, 'spendCounts', spendCountsTitle);



      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      resetColumns = cacheGrid.removeFinancingRelatedColumns(resetColumns, props.hasFinancing)
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(resetColumns, props.hasHarmonization)
      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy())
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value)
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value)
      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      saveSupplierColumnsByType(props.typeOf9Boxes, resetColumns);

      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }

      return resetColumns
    }

    function saveParentColumnsByType(type: string, cols: any[]): void {
      switch (type) {
        case 'cashFlow': analyzeStore.setHomeAnalyzeProgramNineBoxesParentList(cols); break;
        case 'financing': analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancing(cols); break;
        case 'scf9Box': analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancingSCF(cols); break;
        case 'vcard': analyzeStore.setHomeAnalyzeProgramNineBoxesParentListVcard(cols); break;
      }
    }

    function getParentGridCache(type: string, flag: boolean): any[] {
      if (flag) return [];
      const map: Record<string, any[]> = {
        cashFlow: analyzeStore.getHomeAnalyzeProgramNineBoxesParentList,
        financing: analyzeStore.getHomeAnalyzeProgramNineBoxesParentListFinancing,
        scf9Box: analyzeStore.getHomeAnalyzeProgramNineBoxesParentListFinancingSCF,
        vcard: analyzeStore.getHomeAnalyzeProgramNineBoxesParentListVcard,
      };
      return map[type] ?? [];
    }

    function getGridColumnsParents(resetColumnsFlag: boolean = false): Array<any> {

      const toSetColumns = PARENT_COLUMNS_BY_TYPE[props.typeOf9Boxes] ?? [];


      const columns: Array<any> = []
      toSetColumns.forEach(function (config: any) {
        const newConfig = { ...config}
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = getParentGridCache(props.typeOf9Boxes, resetColumnsFlag);



      /** 
       * If "gridCache" is not empty and different from default grid columns array
       */
      if (gridCache
        && gridCache.length
        && (JSON.stringify(columns)
          !== JSON.stringify(gridCache))) {
        // Update cached data
        resetColumns = cacheGrid.clearCache(columns, gridCache)
        // ? - Use an action instead
      } else {
        // Use cached data
        resetColumns = columns
      }

      renameColumn(resetColumns, 'entityName', translate.t('home.analyze.table.parentName'));
      renameColumn(resetColumns, 'supplierCounts', translate.t('home.analyze.table.numberOfSuppliers'));
      renameColumn(resetColumns, 'entitySupplierLeverageLevel', translate.t('home.analyze.table.parentLeverage'));
      renameColumn(resetColumns, 'entityName', translate.t('home.analyze.table.ultimateParentName'));

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      resetColumns = cacheGrid.removeFinancingRelatedColumns(resetColumns, props.hasFinancing)
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(resetColumns, props.hasHarmonization)
      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy())
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value)
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value)
      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      saveParentColumnsByType(props.typeOf9Boxes, resetColumns);

      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }

      return resetColumns
    }

    watch(() => props.hasFinancing, () => {
      data.gridColumnsSpends = getGridColumnsSpends()
      data.gridColumnsSuppliers = getGridColumnsSuppliers()
      data.gridColumnsParents = getGridColumnsParents()
      data.keySpends++
      data.keySuppliers++
      data.keyParents++
    })

    watch(hideAverageDaysPaid, () => {
      data.gridColumnsSpends = getGridColumnsSpends()
      data.gridColumnsSuppliers = getGridColumnsSuppliers()
      data.gridColumnsParents = getGridColumnsParents()
      data.keySpends++
      data.keySuppliers++
      data.keyParents++
    })

    watch(() => props.hasHarmonization, () => {
      data.gridColumnsSpends = getGridColumnsSpends()
      data.gridColumnsSuppliers = getGridColumnsSuppliers()
      data.gridColumnsParents = getGridColumnsParents()
      data.keySpends++
      data.keySuppliers++
      data.keyParents++
    })



    function getSpendGridCache(type: string, flag: boolean): any[] {
      if (flag) return [];
      const map: Record<string, any[]> = {
        cashFlow: analyzeStore.getHomeAnalyzeProgramNineBoxesSpendList,
        financing: analyzeStore.getHomeAnalyzeProgramNineBoxesSpendListFinancing,
        scf9Box: analyzeStore.getHomeAnalyzeProgramNineBoxesSpendListFinancingSCF,
        vcard: analyzeStore.getHomeAnalyzeProgramNineBoxesSpendListVcard,
      };
      return map[type] ?? [];
    }

    function saveSpendColumnsByType(type: string, cols: any[]): void {
      switch (type) {
        case 'cashFlow': analyzeStore.setHomeAnalyzeProgramNineBoxesSpendList(cols); break;
        case 'financing': analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancing(cols); break;
        case 'scf9Box': analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancingSCF(cols); break;
        case 'vcard': analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListVcard(cols); break;
      }
    }

    function getGridColumnsSpends(resetColumnsFlag: boolean = false): Array<any> {

      const toSetColumns = SPEND_COLUMNS_BY_TYPE[props.typeOf9Boxes] ?? [];

      const columns: Array<any> = []
      toSetColumns.forEach(function (config: any) {
        const newConfig = { ...config}
        columns.push(newConfig)
      })
      let resetColumns = []

      const gridCache = getSpendGridCache(props.typeOf9Boxes, resetColumnsFlag);

      /** 
       * If "gridCache" is defined and not empty and different from default grid columns array
       */
      if (gridCache
        && gridCache.length
        && (JSON.stringify(columns)
          !== JSON.stringify(gridCache))) {

        // Update cached data
        resetColumns = cacheGrid.clearCache(columns, gridCache)
      } else {
        // Use cached data
        resetColumns = columns
      }

      if (isPilotAccount()) {
        setCellTemplate(resetColumns, 'parentName', 'restrictModalEntitySpend');
      }


      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      resetColumns = cacheGrid.removeFinancingRelatedColumns(resetColumns, props.hasFinancing)
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(resetColumns, props.hasHarmonization)
      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy())
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value)
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value)
      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      saveSpendColumnsByType(props.typeOf9Boxes, resetColumns);

      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }

      return resetColumns
    }


    onMounted(async () => {
      abortSuppliers.value = null
      abortParents.value = null
      abortSpends.value = null
      getCustomHeaderTitles()
      setGridHeight()
    });

    async function loadGridsData() {
      resetExport();

      switch (entityLevelTabSelected.value) {
        case ENTITY_LEVEL.SPEND_LINES:
          fetchDataSpends(true);
          break;

        case ENTITY_LEVEL.SUPPLIERS:
          fetchDataSuppliers(true);
          break;

        case ENTITY_LEVEL.ULTIMATE_PARENT:
          fetchDataParents(true);
          break;

        default:
          getGridColumnsSpends();
      }

    }

    async function pageChangeHandler(event: any) {
      switch (props.levelOfGrid) {
        case ENTITY_LEVEL.SPEND_LINES:
          if (event.event.value) {
            filterSettings.paginationSpends = { first: event.event.value, after: 0, skip: 0 };
          } else {
            filterSettings.paginationSpends = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
          }
          await fetchDataSpends();
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          if (event.event.value) {
            filterSettings.paginationSuppliers = { first: event.event.value, after: 0, skip: 0 };
          } else {
            filterSettings.paginationSuppliers = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
          }
          await fetchDataSuppliers();
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          if (event.event.value) {
            filterSettings.paginationParents = { first: event.event.value, after: 0, skip: 0 };
          } else {
            filterSettings.paginationParents = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
          }
          await fetchDataParents();
          break;
        default:
          break;
      }
    }


    function setHasVcard() {
      if (props.typeOf9Boxes === 'vcard') {
        return true
      }

      return null
    }

    function setHasTermExtension() {
      if (props.typeOf9Boxes === 'cashFlow') {
        return true
      }
      return null
    }


    // Helper function to process ESG score validation
    function processESGScore(entityInvestVerteScore: any): string {
      const validateESG = [0, 1, 2, 3, 4, 100];
      let value = 0;
      if (validateESG.includes(parseInt(entityInvestVerteScore))) {
        value = parseInt(entityInvestVerteScore);
      } else {
        value = 404;
      }
      return translate.t('home.entityCard.rating.esgClassification.c' + value);
    }

    // Helper function to process active program data
    function processActiveProgram(activeProgram: any): string {
      if (activeProgram && activeProgram !== null) {
        const programs = activeProgram.split(',');
        if (programs.length > 1) {
          return translate.t('tableStatus.multiple');
        }
      }
      return translate.t('tableStatus.notAssigned');
    }

    // Helper function to process multiple values (financings, harmonizations)
    function processMultipleValues(value: any, translationKey: string): { text: string, colors?: string } {
      if (value) {
        const splitValues = value.split("|");
        if (splitValues.length > 1) {
          return { 
            text: translate.t(translationKey),
            colors: "rgba(44,54,69,.1)"
          };
        }
      }
      return { text: value || '-' };
    }

    // Helper function to process supplier data
    function processSupplierData(data: any): any {
      const datas = { ...data };
      
      // Basic data assignments
      datas.spendsAmount = data.spendCounts;
      datas.buyerCountry = data.buyerCountry ?? '-';
      datas.buyerRegion = data.buyerRegion ?? '-';
      datas.level = 'supplier';

      // Process boolean fields
      datas.entityEthnicMinorityOwnedBusiness = translate.t(
        getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
      );
      datas.entityWomanOwnedBusiness = translate.t(
        getYesOrNo(data.entityWomanOwnedBusiness)
      );
      datas.entityVeteranOwnedBusiness = translate.t(
        getYesOrNo(data.entityVeteranOwnedBusiness)
      );
      datas.isVCardApplied = translate.t(
        getYesOrNo(data.isVCardApplied)
      );

      // Process ESG score
      datas.entityInvestVerteScore = processESGScore(data.entityInvestVerteScore);

      // Process other fields
      datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality 
        ? getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) 
        : '-';
      datas.isActive = !!data.activeProgram;
      datas.activeProgram = processActiveProgram(data.activeProgram);

      // Process financings
      const financingData = processMultipleValues(data.financings, "tableStatus.multiple");
      datas.financings = financingData.text;
      if (financingData.colors) {
        datas.financingColors = financingData.colors;
      }

      // Process harmonizations
      const harmonizationData = processMultipleValues(data.harmonizations, "tableStatus.multiple");
      datas.harmonizations = harmonizationData.text;
      if (harmonizationData.colors) {
        datas.harmColors = harmonizationData.colors;
      }

      return datas;
    }

    //- get suppliers Data
    async function fetchDataSuppliers( callOthersGrid: boolean = false) {
      let queryString = getSupplierData(filterSettings);

      data.loadSuppliers = true
      try {
        if (abortSuppliers.value) {
          abortSuppliers.value.abort();
        }
        abortSuppliers.value = new AbortController()

        const response = await graphqlUtils.getCollectionData(queryString, abortSuppliers.value.signal)
        const nodes = response.data.suppliers.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = processSupplierData(data)
          parsedData.push(datas)
        })
        data.dataSuppliers = parsedData

        data.totalSuppliers = response.data.suppliers.totalCount;

        data.loadSuppliers = false

        if (callOthersGrid) {
          fetchDataSuppliers(false);
          fetchDataSpends(false);
        }



      }
      catch (error) {
        if (import.meta.env.DEV) console.error('** Error while data fetching.', error);

        data.loadSuppliers = false
      }
    }

    function getSupplierData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(data.gridColumnsSuppliers, nodesEdges)
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSuppliers);
      const graphqlOrderString = convertSortToGraphQL(event.sortSuppliers);
      const paginationString = `first: ${event.paginationSuppliers.first} ${event.paginationSuppliers.after ? `, after: "${btoa((event.paginationSuppliers.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryProgramListSuppliers"

      const graphqlQuery = `
          {
            suppliers: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              targetProgramUuid: "${props.selectedProgramId}",
              ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
              ${hasVcard !== null ? `isVCardApplied: ${hasVcard},` : ''}
              ${hasTermExtension !== null ? `isTermExtensionApplied: ${hasTermExtension},` : ''}
              order: {${graphqlOrderString}},
              currencyRate: ${currencyRate},
              fullDisabled: ${setDisabled},
              ${paginationString},
              ${setGlobalFilter || ''} 
              ${field9boxesQuery}
              ) {
              totalCount              
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

    // Helper function to process parent data
    function processParentData(data: any): any {
      const datas = { ...data };
      
      // Basic data assignments
      datas.buyerCountry = data.buyerCountry ?? '-';
      datas.buyerRegion = data.buyerRegion ?? '-';
      datas.suppliersAmount = data.entityType === 'supplier' ? '-' : data.supplierCounts > 0 ? data.supplierCounts : '-';
      datas.supplierCounts = data.supplierCounts > 0 ? data.supplierCounts : '-';
      datas.level = 'parent';

      // Process boolean fields
      datas.entityEthnicMinorityOwnedBusiness = translate.t(
        getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
      );
      datas.entityWomanOwnedBusiness = translate.t(
        getYesOrNo(data.entityWomanOwnedBusiness)
      );
      datas.entityVeteranOwnedBusiness = translate.t(
        getYesOrNo(data.entityVeteranOwnedBusiness)
      );
      datas.isVCardApplied = translate.t(
        getYesOrNo(data.isVCardApplied)
      );

      // Process ESG score
      datas.entityInvestVerteScore = processESGScore(data.entityInvestVerteScore);

      // Process other fields
      datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality 
        ? getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) 
        : '-';
      datas.isActive = !!data.activeProgram;
      datas.activeProgram = processActiveProgram(data.activeProgram);

      // Process financings
      const financingData = processMultipleValues(data.financings, "tableStatus.multiple");
      datas.financings = financingData.text;
      if (financingData.colors) {
        datas.financingColors = financingData.colors;
      }

      // Process harmonizations
      const harmonizationData = processMultipleValues(data.harmonizations, "tableStatus.multiple");
      datas.harmonizations = harmonizationData.text;
      if (harmonizationData.colors) {
        datas.harmColors = harmonizationData.colors;
      }

      return datas;
    }

    // Helper function to process spend data
    function processSpendData(data: any): any {
      const datas = { ...data };
      
      // Basic data assignments
      datas.buyerCountry = data.buyerCountry ?? '-';
      datas.buyerRegion = data.buyerRegion ?? '-';
      datas.level = 'supplier';

      // Process boolean fields
      datas.entityEthnicMinorityOwnedBusiness = translate.t(
        getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
      );
      datas.entityWomanOwnedBusiness = translate.t(
        getYesOrNo(data.entityWomanOwnedBusiness)
      );
      datas.entityVeteranOwnedBusiness = translate.t(
        getYesOrNo(data.entityVeteranOwnedBusiness)
      );
      datas.isVCardApplied = translate.t(
        getYesOrNo(data.isVCardApplied)
      );

      // Process ESG score
      datas.entityInvestVerteScore = processESGScore(data.entityInvestVerteScore);

      // Process other fields
      datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality 
        ? getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) 
        : '-';
      datas.isActive = !!data.activeProgram;
      datas.activeProgram = processActiveProgram(data.activeProgram);

      return datas;
    }

    //- get parents Data
    async function fetchDataParents(callOthersGrid: boolean = false) {

      data.loadParents = true

      try {
        let queryString = getParentsData(filterSettings);


        if (abortParents.value) {
          abortParents.value.abort();
        }
        abortParents.value = new AbortController()

        const response = await graphqlUtils.getCollectionData(queryString, abortParents.value.signal)
        const nodes = response.data.parents.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = processParentData(data)
          parsedData.push(datas)
        })
        data.dataParents = parsedData
        data.totalParents = response.data.parents.totalCount;

        data.loadParents = false
        if (callOthersGrid) {
          fetchDataSuppliers(false);
          fetchDataSpends(false);
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);

        data.loadParents = false
      }
    }

    function getParentsData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(data.gridColumnsParents, nodesEdges)
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterParents);
      const graphqlOrderString = convertSortToGraphQL(event.sortParents);
      const paginationString = `first: ${event.paginationParents.first} ${event.paginationParents.after ? `, after: "${btoa((event.paginationParents.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryProgramListParents"
      const graphqlQuery = `
          {
            parents: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              targetProgramUuid: "${props.selectedProgramId}",
              ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
              ${hasVcard !== null ? `isVCardApplied: ${hasVcard},` : ''}
              ${hasTermExtension !== null ? `isTermExtensionApplied: ${hasTermExtension},` : ''}
              order: {${graphqlOrderString}},
              currencyRate: ${currencyRate},
              fullDisabled: ${setDisabled},
              ${paginationString},
              ${setGlobalFilter || ''}
              ${field9boxesQuery}
              ) {
              totalCount              
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
    async function fetchDataSpends(callOthersGrid: boolean = false) {
      data.loadSpends = true

      try {
        let queryString = getSpendsData(filterSettings);


        if (abortSpends.value) {
          abortSpends.value.abort();
        }
        abortSpends.value = new AbortController()

        const response = await graphqlUtils.getCollectionData(queryString, abortSpends.value.signal)
        const nodes = response.data.spends.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = processSpendData(data)
          parsedData.push(datas)
        })
        data.dataSpends = parsedData
        data.totalSpends = response.data.spends.totalCount;

        data.loadSpends = false

        if (callOthersGrid) {
          fetchDataSuppliers(false);
          fetchDataParents(false);
        }



      }
      //
      catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);

        data.loadSpends = false
      }
    }

    //targetBoxes = [...n]
    function getSpendsData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSpends);
      const getEdges = graphqlUtils.getActiveColumns(data.gridColumnsSpends, nodesEdges)
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryProgramListSpends"
      const graphqlQuery = `
          {
            spends: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              targetProgramUuid: "${props.selectedProgramId}",
              ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
              ${hasVcard !== null ? `isVCardApplied: ${hasVcard},` : ''}
              ${hasTermExtension !== null ? `isTermExtensionApplied: ${hasTermExtension},` : ''}
              order: {${graphqlOrderString}},
              currencyRate: ${currencyRate},
              fullDisabled: ${setDisabled},
              ${paginationString},
              ${setGlobalFilter || ''}
              ${field9boxesQuery}
            ) {
              totalCount              
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


    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'entityName: \"asc\"'
      }
      return sort.map(descriptor => `${descriptor.field}: "${descriptor.dir}"`).join(', ');
    }

    async function dataChange(filter: any, sort: any) {
      switch (props.levelOfGrid) {
        case ENTITY_LEVEL.SPEND_LINES:
          filterSettings.paginationSpends = { first: filterSettings.paginationSpends.first, after: 0, skip: 0 };
          filterSettings.filterSpends = filter;
          filterSettings.sortSpends = sort;
          clearTimeout(pendingRequest);
          await fetchDataSpends();
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          filterSettings.paginationSuppliers = { first: filterSettings.paginationSuppliers.first, after: 0, skip: 0 };
          filterSettings.filterSuppliers = filter;
          filterSettings.sortSuppliers = sort;
          clearTimeout(pendingRequest);
          await fetchDataSuppliers();
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          filterSettings.paginationParents = { first: filterSettings.paginationParents.first, after: 0, skip: 0 };
          filterSettings.filterParents = filter;
          filterSettings.sortParents = sort;
          clearTimeout(pendingRequest);
          await fetchDataParents();
          break;
        default:
          break;
      }
    }


    // Helper function to get export filters based on type
    function getExportFiltersByType(typeOf9Boxes: string, baseFilters: any): any {
      switch (typeOf9Boxes) {
        case 'cashFlow':
          return { ...baseFilters, targetNineBoxes: setTargetNineBoxes };
        case 'financing':
          return { ...baseFilters, targetNineBoxesFinancing: setTargetNineBoxes };
        case 'scf9Box':
          return { ...baseFilters, targetNineBoxesSCF: setTargetNineBoxes };
        case 'vcard':
          return { ...baseFilters, targetNineBoxesVCard: setTargetNineBoxes };
        default:
          return { ...baseFilters, targetNineBoxes: setTargetNineBoxes };
      }
    }

    function getExportTotalForCollection(collection: any): number {
      if (collection === 'collectionQueryProgramListParents') return data.totalParents;
      if (collection === 'collectionQueryProgramListSuppliers') return data.totalSuppliers;
      if (collection === 'collectionQueryProgramListSpends') return data.totalSpends;
      return 0;
    }

    // Entry point bound to the grid's @exportCSV event. Resolves the columns
    // and filters for the active level and delegates the loading / large-export
    // UX to useGridExport.
    function exportCSV(collection: any) {
      let filters = undefined
      let title = ''
      let level = ''
      let columns: Array<any> = []

      if (collection === 'collectionQueryProgramListParents') {
        filters = filterSettings.filterParents
        columns = data.gridColumnsParents
        title = 'AnalyzeParents'
        level = 'parents'
      } else if (collection === 'collectionQueryProgramListSuppliers') {
        filters = filterSettings.filterSuppliers
        columns = data.gridColumnsSuppliers
        title = 'AnalyzeSuppliers'
        level = 'suppliers'
      } else if (collection === 'collectionQueryProgramListSpends') {
        filters = filterSettings.filterSpends
        columns = data.gridColumnsSpends
        title = 'AnalyzeSpends'
        level = 'spends'
      }

      const targetProgramUuid = props.selectedProgramId
      const currencyRate: number = useAppStore().getCurrencyAmount;

      const baseFilters = {
        telerikFilter: convertFiltersToREST(filters),
        targetProgramUuid,
        globalFilter: convertFiltersToREST(globalFiltersStore.getFiltersApplied),
        currencyRate
      };

      const filtersGrid = getExportFiltersByType(props.typeOf9Boxes, baseFilters);

      startExport(
        { level, title, columns, filtersGrid },
        getExportTotalForCollection(collection)
      );
    }

    // Helper function to set custom header columns by type
    function setCustomHeaderColumnsByType(typeOf9Boxes: string, columnsSpends: any[], columnsSuppliers: any[], columnsParents: any[]): void {
      switch (typeOf9Boxes) {
        case 'cashFlow':
          analyzeStore.setHomeAnalyzeProgramNineBoxesSpendList(columnsSpends);
          analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierList(columnsSuppliers);
          analyzeStore.setHomeAnalyzeProgramNineBoxesParentList(columnsParents);
          break;
        case 'financing':
          analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancing(columnsSpends);
          analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancing(columnsSuppliers);
          analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancing(columnsParents);
          break;
        case 'scf9Box':
          analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancingSCF(columnsSpends);
          analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF(columnsSuppliers);
          analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancingSCF(columnsParents);
          break;
        case 'vcard':
          analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListVcard(columnsSpends);
          analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListVcard(columnsSuppliers);
          analyzeStore.setHomeAnalyzeProgramNineBoxesParentListVcard(columnsParents);
          break;
        default:
          break;
      }
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
      setCustomHeaderColumnsByType(
        props.typeOf9Boxes,
        data.gridColumnsSpends,
        data.gridColumnsSuppliers,
        data.gridColumnsParents
      );

       
    }

    // Helper function to set grid columns by type for watchers
    function setGridColumnsByTypeForWatcher(typeOf9Boxes: string, columns: any[], level: string): void {
      switch (typeOf9Boxes) {
        case 'cashFlow':
          if (level === 'spends') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendList(columns);
          } else if (level === 'suppliers') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierList(columns);
          } else if (level === 'parents') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentList(columns);
          }
          break;
        case 'financing':
          if (level === 'spends') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancing(columns);
          } else if (level === 'suppliers') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancing(columns);
          } else if (level === 'parents') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancing(columns);
          }
          break;
        case 'scf9Box':
          if (level === 'spends') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancingSCF(columns);
          } else if (level === 'suppliers') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF(columns);
          } else if (level === 'parents') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancingSCF(columns);
          }
          break;
        case 'vcard':
          if (level === 'spends') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListVcard(columns);
          } else if (level === 'suppliers') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListVcard(columns);
          } else if (level === 'parents') {
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentListVcard(columns);
          }
          break;
      }
    }

    /* WATCHERS
     */
    // Spends
    watch(() => data.gridColumnsSpends, () => {
      if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
        setGridColumnsByTypeForWatcher(props.typeOf9Boxes, data.gridColumnsSpends, 'spends');
        fetchDataSpends();
      }
    }, { deep: true })

    // Suppliers
    watch(() => data.gridColumnsSuppliers, () => {
      if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
        setGridColumnsByTypeForWatcher(props.typeOf9Boxes, data.gridColumnsSuppliers, 'suppliers');
        fetchDataSuppliers();
      }
    }, { deep: true })

    // Parents
    watch(() => data.gridColumnsParents, () => {
      if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {
        setGridColumnsByTypeForWatcher(props.typeOf9Boxes, data.gridColumnsParents, 'parents');
        fetchDataParents();
      }
    }, { deep: true })

    watch(() => props.selectedBoxesArray, () => {
      setTargetNineBoxes = props.selectedBoxesArray.length > 0 && props.selectedBoxesArray.length <= 9 ? props.selectedBoxesArray.toString() : ''

      field9boxesQuery = ''

      switch (props.typeOf9Boxes) {
        case 'cashFlow':
          field9boxesQuery = `targetNineBoxes: "${setTargetNineBoxes}"`
          break;
        case 'financing':
          field9boxesQuery = `targetNineBoxesFinancing: "${setTargetNineBoxes}"`
          break;
        case 'scf9Box':
          field9boxesQuery = `targetNineBoxesSCF: "${setTargetNineBoxes}"`
          break;
        case 'vcard':
          field9boxesQuery = `targetNineBoxesVCard: "${setTargetNineBoxes}"`
          break;
        default:
          break;
      }


      loadGridsData()
    }, { deep: true })


    // Helper function to get active columns by level
    function getActiveColumnsByLevelHelper(level: string): Array<any> {
      switch (level) {
        case 'spends':
          return totalColumnsUtils.getActiveColumnsArray(data.gridColumnsSpends);
        case 'suppliers':
          return totalColumnsUtils.getActiveColumnsArray(data.gridColumnsSuppliers);
        case 'parents':
          return totalColumnsUtils.getActiveColumnsArray(data.gridColumnsParents);
        default:
          return [];
      }
    }

    function setColumnsSummary(level: string) {
      const getActiveColumnsByLevel = getActiveColumnsByLevelHelper(level);
      const getSummationColumns = totalColumnsUtils.getTotalFieldsSummation(getActiveColumnsByLevel, analyzeStore.customDataPointTypes);
      const getFieldsByTrueValue = totalColumnsUtils.getTotalFieldsCountByTrueValue(getActiveColumnsByLevel);
      const getFieldsByWeightedAvg = totalColumnsUtils.getTotalFieldsWeightedAvg(getActiveColumnsByLevel, analyzeStore.customDataPointTypes);




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
          level, field: '', currencyRate, targetProgramUuid: props.selectedProgramId ?? null, targetPlanUuid: null, targetPhaseUuid: null, section, globalFilter: convertFiltersToREST(
            globalFiltersStore.getFiltersApplied
          ), activeSpendFileVersion: spendFileVersionActiveId.value, targetOperation: null, summaryOperation: "summary", telerikFilter, summary: setColumnsSummary(level), fullDisabled: false
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

        if (!response.skipped) toast.error(translate.t("error.server500"));
        return null;
      }

      return response.data
    }



    // Helper function to reset columns by type
    function resetColumnsByType(typeOf9Boxes: string, level: string): void {
      if (level === 'spends') {
        switch (typeOf9Boxes) {
          case 'cashFlow':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendList([]);
            break;
          case 'financing':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancing([]);
            break;
          case 'scf9Box':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListFinancingSCF([]);
            break;
          case 'vcard':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSpendListVcard([]);
            break;
        }
        data.gridColumnsSpends = getGridColumnsSpends(true);
      } else if (level === 'suppliers') {
        switch (typeOf9Boxes) {
          case 'cashFlow':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierList([]);
            break;
          case 'financing':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancing([]);
            break;
          case 'scf9Box':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF([]);
            break;
          case 'vcard':
            analyzeStore.setHomeAnalyzeProgramNineBoxesSupplierListVcard([]);
            break;
        }
        data.gridColumnsSuppliers = getGridColumnsSuppliers(true);
      } else if (level === 'parents') {
        switch (typeOf9Boxes) {
          case 'cashFlow':
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentList([]);
            break;
          case 'financing':
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancing([]);
            break;
          case 'scf9Box':
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentListFinancingSCF([]);
            break;
          case 'vcard':
            analyzeStore.setHomeAnalyzeProgramNineBoxesParentListVcard([]);
            break;
        }
        data.gridColumnsParents = getGridColumnsParents(true);
      }
    }

    function resetDefaultColumns(levelofgrid: any) {
      resetColumnsByType(props.typeOf9Boxes, levelofgrid);
    }


    // Centralized data-fetch orchestration — handles first mount, refresh, and reactive changes.
    useConsistentFetch([loadGridsData], () => props.selectedProgramId, () => spendFileVersionActiveId.value);

    return {
      ...toRefs(data),
      dataChange,
      dataSource,
      detailTemplateSupplier,
      ENTITY_LEVEL,
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
      loadingData: false,
      pageChangeHandler,
      resetDefaultColumns,
      total,
    }
  }
})
</script>