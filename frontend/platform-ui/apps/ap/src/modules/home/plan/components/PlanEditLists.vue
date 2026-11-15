<template>
<div class="row">
  <div class="col-12">
    <CalculumLoading v-if="loadExport" :modal="true"></CalculumLoading>
    <div class="col-12" :class="{ 'bg-blur': (loadSpends), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SPEND_LINES }">
      <CalculumLoading v-if="loadSpends" :modal="true"></CalculumLoading>
      <CalculumGridGraphql v-if="dataSpends" :gridData="dataSpends" :gridColumns="planSpendEditComputed" :sortable="true" :enabledPagination="true" :allowExportExcel="false" :editList="true" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="true" forListViewRelatedToPilot="forListViewRelatedToPilot" :selectedTabFromView="entityLevelTabSelected" :collectionQuery="'collectionQueryPlanListSpends'" :planId="planId" :phaseId="phaseId" :selectable="!isRest" :selectableOrdering="true" :gridHeight="gridHeight" :key="keySpends" :levelOfGrid="'spends'" :section="'plan'" :targetOperation="phaseId ? 'editing' : 'adding'" :totalsBycolumns="totalsBycolumnsSpends" :loading="loadSpends" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @selectAllRow="selectAllRow" @selectRow="selectRow" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12" :class="{ 'bg-blur': (loadSuppliers), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SUPPLIERS }">
      <CalculumLoading v-if="loadSuppliers" :modal="true"></CalculumLoading>
      <CalculumGridGraphql v-if="dataSuppliers" :gridData="dataSuppliers" :gridColumns="gridColumnsSuppliers" :sortable="true" :enabledPagination="true" :allowExportExcel="false" :editList="true" :filterable="true" :total="totalSuppliers" :skip="filterSettings.paginationSuppliers.after" :take="filterSettings.paginationSuppliers.first" :defaultPageSize="filterSettings.paginationSuppliers.first" :filter="filterSettings.filterSuppliers" :sort="filterSettings.sortSuppliers" :showTabsLevels="true" forListViewRelatedToPilot="forListViewRelatedToPilot" :selectedTabFromView="entityLevelTabSelected" :isExpanded="true" :nameTemplateChild="'detailPlanSuppliersGraphql'" :collectionQuery="'collectionQueryPlanListSuppliers'" :rowColors="true" :planId="planId" :phaseId="phaseId" :selectable="!isRest" :selectableOrdering="true" :gridHeight="gridHeight" :key="keySuppliers" :levelOfGrid="'suppliers'" :section="'plan'" :targetOperation="phaseId ? 'editing' : 'adding'" :totalsBycolumns="totalsBycolumnsSuppliers" :loading="loadSuppliers" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @selectAllRow="selectAllRow" @selectRow="selectRow" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12" :class="{ 'bg-blur': (loadParents), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.ULTIMATE_PARENT }">
      <CalculumLoading v-if="loadParents" :modal="true"></CalculumLoading>
      <CalculumGridGraphql v-if="dataParents" :gridData="dataParents" :gridColumns="gridColumnsParents" :sortable="true" :enabledPagination="true" :allowExportExcel="false" :editList="true" :filterable="true" :total="totalParents" :skip="filterSettings.paginationParents.after" :take="filterSettings.paginationParents.first" :defaultPageSize="filterSettings.paginationParents.first" :filter="filterSettings.filterParents" :sort="filterSettings.sortParents" :showTabsLevels="true" forListViewRelatedToPilot="forListViewRelatedToPilot" :selectedTabFromView="entityLevelTabSelected" :isExpanded="true" :nameTemplateChild="'detailPlanParentsGridGraphql'" :collectionQuery="'collectionQueryPlanListParents'" :rowColors="true" :isForParent="true" :planId="planId" :phaseId="phaseId" :selectable="!isRest" :selectableOrdering="true" :gridHeight="gridHeight" :key="keyParents" :levelOfGrid="'parents'" :section="'plan'" :targetOperation="phaseId ? 'editing' : 'adding'" :totalsBycolumns="totalsBycolumnsParents" :loading="loadParents" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @selectAllRow="selectAllRow" @selectRow="selectRow" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
  </div>
</div>
</template>

<script lang='ts'>
import { reactive, toRefs, watch, ref, onMounted, defineComponent, computed } from 'vue'

import { ArrayUtils, ENTITY_LEVEL } from '@/utils'
import { Grid } from '@progress/kendo-vue-grid'
import { nodesEdges } from '../data/nodesEdges';
import { onBeforeRouteLeave } from 'vue-router'
import { planSpendEditColumns, planSupplierEditColumns, planUltimateParentColumns } from '../data/graphqlColumns'
import { SortDescriptor } from '@progress/kendo-data-query/dist/npm/sort-descriptor'
import { translate } from '@/utils/translation'

import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useHomeStore } from '@/stores/home'
import { useUserStore } from '@/stores/user'
import { useAnalyzeStore } from '@/stores/analyze';
import * as cacheGrid from '@/utils/dataGridClear'
import * as formatData from '@/utils/FormatData'
import * as graphqlUtils from '@/utils/graphqlUtils'
import CalculumGridGraphql from '@/modules/components/grid/CalculumGridGraphql.vue'
import { CalculumLoading } from '@ada/design-system'
import { FilterChangeEvent } from '@/types/filterSettings'
import useEntity from '@/modules/home/entityCard/composables/useEntity'
import useUser from "@/services/user/composables/useUser";
import useSpendFile from "@/composables/useSpendFile";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import useCompany from "@/composables/useCompany"
import useSMEFeature from "@/composables/useSMEFeature";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import * as HomeAPI from "@/modules/home/api";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import { useToast } from 'vue-toastification'
import useApolloClient from "@/services/graphql/useApolloClient";
import { useAppStore } from '@/stores/app';

function renameColumn(cols: any[], field: string, title: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].title = title;
}
function setCellTemplate(cols: any[], field: string, cell: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].cell = cell;
}

export default defineComponent({
  name: 'PlanEditLists',
  components: {
    CalculumLoading,
    CalculumGridGraphql,
    Grid
  },
  props: {
    planId: { type: String, required: true },
    phaseId: { type: String, required: true },
    isRest: { type: Boolean, default: false },
    noWidgetClass: { type: Boolean, default: false },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false }
  },
  emits: ['send-arrays-with-data'],
  setup(props, { emit }) {
    const globalFiltersStore = useGlobalFiltersStore()
    const homeStore = useHomeStore()
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
    const analyzeStore = useAnalyzeStore();
    const toast = useToast()
    const {
      spendFileVersionActiveId,
      spendFileVersionActiveNameCustomDataPoints,
      spendFileVersionActiveCustomDataPointsHasData,
    } = useSpendFile()

    const { usevCardGroupsEnabled } = useCompany()
    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()


    const { smeRelatedColumnsDisplayBasedOnSMEFeature } = useSMEFeature()

    const { useFeatureScfStrategy, isPilotAccount, useFeature9BoxesFinancing, useFeatureVirtualCard, useFeatureSupplierStandard, useFeaturePeerGroupStandard } = useUser();

    const { apolloClientResetStore, isResetting } = useApolloClient();

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

    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(globalFiltersStore.getFiltersApplied)

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
      loadExport: boolean,
      columnsToExport: Array<any>,
      customHeaders: any,
      customHasData: boolean[],
      selectedItems: Array<any>,
      allChecked: boolean
      entityLevelTabSelected: number,
      currentRemoved: Array<any>,
      initialSelectedItems: Array<any>,
      newItems: Array<any>,
      withChanges: boolean,
      totalRows: number,
      filterForPatch: Array<any> | null,
      totalsBycolumnsSpends: Array<any> | null,
      totalsBycolumnsSuppliers: Array<any> | null,
      totalsBycolumnsParents: Array<any> | null

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
      keySpends: new Date().getUTCMilliseconds(),
      keySuppliers: new Date().getUTCMilliseconds(),
      keyParents: new Date().getUTCMilliseconds(),
      gridColumnsSpends: getGridColumnsSpends(),
      gridColumnsSuppliers: getGridColumnsSuppliers(),
      gridColumnsParents: getGridColumnsParents(),
      gridHeight: 'auto',
      toExport: [],
      loadExport: false,
      columnsToExport: [],
      customHeaders: [],
      customHasData: [],
      selectedItems: [],
      allChecked: false,
      entityLevelTabSelected: homeStore.getEntityLevelTabSelected,
      currentRemoved: [],
      initialSelectedItems: [],
      newItems: [],
      withChanges: false,
      totalRows: 0,
      filterForPatch: null,
      totalsBycolumnsSpends: [],
      totalsBycolumnsSuppliers: [],
      totalsBycolumnsParents: []
    })


    window.onresize = () => {
      setGridHeight()
    }

    onBeforeRouteLeave(async (to) => {
      await apolloClientResetStore();
      data.dataSpends = [];
      data.dataSuppliers = [];
      data.dataParents = [];

      data.gridColumnsSpends = [];
      data.gridColumnsSuppliers = [];
      data.gridColumnsParents = [];
    })

    function setGridHeight() {
      const getSubMain = document.getElementById('container-main-id')
      if (getSubMain) {
        if ((getSubMain.clientHeight - 195) < 350) {
          data.gridHeight = '350px'
        } else {
          data.gridHeight = (getSubMain.clientHeight - 195) + 'px'
        }
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


      data.keySpends++
      data.keySuppliers++
      data.keyParents++
      //SAVE THE CHANGED COLUMNS
      homeStore.setHomePlanColumnOrderSpendsCF(data.gridColumnsSpends);
      homeStore.setHomePlanPhaseColumnOrderSuppliersCF(data.gridColumnsSuppliers)
      homeStore.setHomePlanPhaseColumnOrderParentsCF(data.gridColumnsParents)
    }


    function getGridColumnsSuppliers(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = []
      planSupplierEditColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomePlanPhaseColumnOrderSuppliersCFEdit
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

      if (isPilotAccount()) {
        setCellTemplate(resetColumns, 'parentName', 'restrictModalEntitySupplier');
      }

      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      renameColumn(resetColumns, 'spendCounts', translate.t('home.analyze.table.numberOfSpends'));

      const disabledColumn = resetColumns.findIndex((x: any) => x.field === 'disabled')
      if (disabledColumn > -1) {
        resetColumns.splice(disabledColumn, 1)
      }

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
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }
      homeStore.setHomePlanPhaseColumnOrderSuppliersCFEdit(resetColumns)

      return resetColumns
    }


    function getGridColumnsParents(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = []
      planUltimateParentColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomePlanPhaseColumnOrderParentsCFEdit

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
      const indexSpend = resetColumns.findIndex((x: any) => x.field === 'entityName')
      if (indexSpend >= 0) {
        resetColumns[indexSpend].title = translate.t('home.analyze.table.parentName')
      }

      const entitySupplierLeverageLevel = resetColumns.findIndex((x: any) => x.field === 'entitySupplierLeverageLevel')
      if (entitySupplierLeverageLevel >= 0) {
        resetColumns[entitySupplierLeverageLevel].title = translate.t('home.analyze.table.parentLeverage')
        // resetColumns[entitySupplierLeverageLevel].field = "entityParentLeverageLevel"      
      }

      const disabledColumn = resetColumns.findIndex((x: any) => x.field === 'disabled')
      if (disabledColumn > -1) {
        resetColumns.splice(disabledColumn, 1)
      }


      resetColumns = cacheGrid.removescfGroupStandardStrategy(resetColumns, useFeatureScfStrategy())
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(resetColumns, useFeatureSupplierStandard.value)
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(resetColumns, useFeaturePeerGroupStandard.value)

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      if (!props.hasFinancing || !useFeature9BoxesFinancing.value) {
        resetColumns = cacheGrid.remove9boxFinancingColumns(resetColumns)
      }

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)


      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }
      homeStore.setHomePlanPhaseColumnOrderParentsCFEdit(resetColumns)

      return resetColumns
    }

    function getGridColumnsSpends(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = []
      planSpendEditColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomePlanColumnOrderSpendsCFEdit
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

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)


      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }

      const indexSpend = resetColumns.findIndex((x: any) => x.field === 'spendCounts')
      if (indexSpend >= 0) {
        resetColumns[indexSpend].title = translate.t('home.analyze.table.alias')
        resetColumns[indexSpend].field = 'spendAlias'
      }

      const indexSpend2 = resetColumns.findIndex((x: any) => x.field === 'supplierCounts')
      if (indexSpend2 > -1) {
        resetColumns.splice(indexSpend2, 1)
      }

      const disabledColumn = resetColumns.findIndex((x: any) => x.field === 'disabled')
      if (disabledColumn > -1) {
        resetColumns.splice(disabledColumn, 1)
      }

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
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }
      homeStore.setHomePlanColumnOrderSpendsCFEdit(resetColumns)
      return resetColumns
    }

    watch(hideAverageDaysPaid, () => {
      data.gridColumnsSpends = getGridColumnsSpends(true)
      data.gridColumnsSuppliers = getGridColumnsSuppliers(true)
      data.gridColumnsParents = getGridColumnsParents(true)
    })

    onMounted(async () => {
      getCustomHeaderTitles();
      setGridHeight();
      await loadGridsData(true);
    });

    /** Start edition */

    function selectAllRow(rowData: any, checked: boolean) {
      data.selectedItems = []
      data.allChecked = checked
      if (data.entityLevelTabSelected === ENTITY_LEVEL.ULTIMATE_PARENT) {
        rowData.forEach(function (config: any) {
          const index = data.dataParents.findIndex(x => x.uuid === config.uuid)
          data.dataParents[index].selected = checked
          data.selectedItems.push(data.dataParents[index])
        })
      }
      if (data.entityLevelTabSelected === ENTITY_LEVEL.SUPPLIERS) {
        rowData.forEach(function (config: any) {
          const index = data.dataSuppliers.findIndex(x => x.uuid === config.uuid)
          data.dataSuppliers[index].selected = checked
          data.selectedItems.push(data.dataSuppliers[index])
        })
      }
      if (data.entityLevelTabSelected === ENTITY_LEVEL.SPEND_LINES) {
        rowData.forEach(function (config: any) {
          const index = data.dataSpends.findIndex(x => x.uuid === config.uuid)
          data.dataSpends[index].selected = checked
          data.selectedItems.push(data.dataSpends[index])
        })
      }
      data.selectedItems = checked ? data.selectedItems : []
      validateNewAndRemovedItems()
    }

    function selectRow(rowData: any) {
      data.allChecked = false
      data.selectedItems = []
      if (rowData.length > 0) {
        data.selectedItems = rowData
      }

      validateNewAndRemovedItems()
    }

    function validateNewAndRemovedItems() {
      data.newItems = []
      data.currentRemoved = []
      data.withChanges = false

      //* Validate if the selected items are already selected
      data.selectedItems.forEach(function (item) {
        const indexSupplier = data.initialSelectedItems.findIndex(
          (x) => x.uuid === item.uuid
        )
        if (indexSupplier < 0) {
          data.newItems.push(item.uuid)
        }
      })

      //If inittialitems arent in selectedItems, so they are removed
      data.initialSelectedItems.forEach(function (item) {
        const indexSupplier = data.selectedItems.findIndex(
          (x) => x.uuid === item.uuid
        )
        if (indexSupplier < 0) {
          data.currentRemoved.push(item.uuid)
        }
      })

      if (data.newItems.length > 0 || data.currentRemoved.length > 0) {
        data.withChanges = true
      }
      emit('send-arrays-with-data', data.newItems, data.currentRemoved, data.withChanges, data.selectedItems, data.entityLevelTabSelected, data.filterForPatch, data.allChecked)
    }

    /** End edition */

    const { entitySelectedTrackingNumber } = useEntity()

    // Update grids after entity change
    watch(entitySelectedTrackingNumber, () => {
      if (import.meta.env.DEV) console.log("** entitySelectedTrackingNumber", entitySelectedTrackingNumber.value)
      setTimeout(function () {
        loadGridsData(true)
      }, 2000)
    })

    async function loadGridsData(
      callTotalsValues: boolean = false,
    ) {
      data.loadExport = false;
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


    async function pageChangeHandler(event: any) {
      switch (data.entityLevelTabSelected) {
        case ENTITY_LEVEL.SPEND_LINES:
          if (event.event.value) {
            filterSettings.paginationSpends = { first: event.event.value, after: 0, skip: 0 };
          } else {
            filterSettings.paginationSpends = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
          }
          await fetchDataSpends(false);
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          if (event.event.value) {
            filterSettings.paginationSuppliers = { first: event.event.value, after: 0, skip: 0 };
          } else {
            filterSettings.paginationSuppliers = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
          }
          await fetchDataSuppliers(false);
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          if (event.event.value) {
            filterSettings.paginationParents = { first: event.event.value, after: 0, skip: 0 };
          } else {
            filterSettings.paginationParents = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
          }
          await fetchDataParents(false);
          break;
        default:
          break;
      }
    }

    //- get suppliers Data
    async function fetchDataSuppliers(callTotalsValues: boolean = false, callOthersGrid: boolean = false) {

      data.loadSuppliers = true;

      if (callTotalsValues) {
        const totals = await fetchTotalsbyLevel("suppliers", "plan", filterSettings.filterSuppliers)
        if (totals !== null) {
          data.totalsBycolumnsSuppliers = totals
        }
      }


      try {
        let queryString = getSupplierData(filterSettings);

        data.loadSuppliers = true

        const response = await graphqlUtils.getCollectionData(queryString)
        let nodes = response.data.suppliers.edges.map((edge: any) => edge.node);
        if (isPilotAccount()) {
          nodes = ArrayUtils.filterNodesByIsPilot(nodes)

        }
        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)
          datas.spendsAmount = data.spendCounts
          datas.buyerCountry = data.buyerCountry ?? '-'
          datas.buyerRegion = data.buyerRegion ?? '-'

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
          const validateESG = [0, 1, 2, 3, 4, 100]
          let value = 0
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore)
          } else {
            value = 404
          }
          datas.entityInvestVerteScore = translate.t('home.entityCard.rating.esgClassification.c' + value)
          datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality ? formatData.getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) : '-'
          datas.isActive = !!data.activeProgram
          datas.activeProgram = data.activeProgram ? data.activeProgram : translate.t('tableStatus.notAssigned')
          datas.selected = data.selected === null ? false : data.selected
          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(',')
            if (programs.length > 1) {
              datas.activeProgram = translate.t('tableStatus.multiple')
            }
          } else {
            datas.activeProgram = translate.t('tableStatus.notAssigned')
          }
          /** For multiple values */

          if (data.phases) {
            if (data.phases === '10000') {
              datas.phases = translate.t("global.rest")
            } else {
              const splitPhases = data.phases.split(',')
              if (splitPhases.length > 1) {
                datas.phases = translate.t("tableStatus.multiple")
              }
            }
          }

          if (data.financings) {
            const splitFinancing = data.financings.split("|");
            if (splitFinancing.length > 1) {
              datas.financings = translate.t("tableStatus.multiple")
              datas.financingColors = "rgba(44,54,69,.1)"
            }
          }

          if (data.harmonizations) {
            const splitHarmonizations = data.harmonizations.split("|");
            if (splitHarmonizations.length > 1) {
              datas.harmonizations = translate.t("tableStatus.multiple")
              datas.harmColors = "rgba(44,54,69,.1)"
            }
          }

          parsedData.push(datas)
        })
        data.dataSuppliers = parsedData

        if (data.entityLevelTabSelected === 1) {
          data.initialSelectedItems = data.dataSuppliers.filter(
            (x) => x.selected === true
          )
          emit('send-arrays-with-data', [], [], false, data.initialSelectedItems, data.entityLevelTabSelected, data.filterForPatch, data.allChecked)
        }

        data.totalRows = data.totalSuppliers
        if (callTotalsValues) {
          data.totalsBycolumnsSuppliers = null
          callTotalDataByLevel('suppliers')
        }
        if (callOthersGrid) {
          fetchDataSpends(true);
          fetchDataParents(true);
        }
        data.loadSuppliers = false;
      }
      //
      catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);
      }
      //
      finally {
        data.loadSuppliers = false
      }
    }

    function getSupplierData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(data.gridColumnsSuppliers, nodesEdges)
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSuppliers);
      const graphqlOrderString = convertSortToGraphQL(event.sortSuppliers);
      const paginationString = `first: ${event.paginationSuppliers.first} ${event.paginationSuppliers.after ? `, after: "${btoa((event.paginationSuppliers.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryProgramListSuppliers"
      const listAction = props.phaseId ? "edit" : "add"
      const graphqlQuery = `
        {
          suppliers: ${collectionQuery}(
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            targetPlanUuid: "${props.planId}",
            targetPhaseUuid: "${props.phaseId ?? 'all'}",
            ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${setGlobalFilter ? setGlobalFilter : ''} 
            action: "${listAction}"
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
        const response = await graphqlUtils.getCollectionData(queryString)
        let nodes = response.data.parents.edges.map((edge: any) => edge.node);
        if (isPilotAccount()) {
          nodes = ArrayUtils.filterNodesByIsPilot(nodes)

        }
        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)
          datas.buyerCountry = data.buyerCountry ?? '-'
          datas.buyerRegion = data.buyerRegion ?? '-'
          datas.suppliersAmount = data.entityType === 'suppliers' ? '-' : data.supplierCounts > 0 ? data.supplierCounts : '-'
          datas.supplierCounts = data.supplierCounts > 0 ? data.supplierCounts : '-'
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
          const validateESG = [0, 1, 2, 3, 4, 100]
          let value = 0
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore)
          } else {
            value = 404
          }
          datas.entityInvestVerteScore = translate.t('home.entityCard.rating.esgClassification.c' + value)
          datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality ? formatData.getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) : '-'
          datas.isActive = !!data.activeProgram
          datas.selected = data.selected === null ? false : data.selected

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(',')
            if (programs.length > 1) {
              datas.activeProgram = translate.t('tableStatus.multiple')
            }
          } else {
            datas.activeProgram = translate.t('tableStatus.notAssigned')
          }
          /** For multiple values */

          if (data.phases) {
            if (data.phases === '10000') {
              datas.phases = translate.t("global.rest")
            } else {
              const splitPhases = data.phases.split(',')
              if (splitPhases.length > 1) {
                datas.phases = translate.t("tableStatus.multiple")
              }
            }
          }

          if (data.financings) {
            const splitFinancing = data.financings.split("|");
            if (splitFinancing.length > 1) {
              datas.financings = translate.t("tableStatus.multiple")
              datas.financingColors = "rgba(44,54,69,.1)"
            }
          }

          if (data.harmonizations) {
            const splitHarmonizations = data.harmonizations.split("|");
            if (splitHarmonizations.length > 1) {
              datas.harmonizations = translate.t("tableStatus.multiple")
              datas.harmColors = "rgba(44,54,69,.1)"
            }
          }

          parsedData.push(datas)
        })
        data.dataParents = parsedData

        if (data.entityLevelTabSelected === 2) {
          data.initialSelectedItems = data.dataParents.filter(
            (x) => x.selected === true
          )
          emit('send-arrays-with-data', [], [], false, data.initialSelectedItems, data.entityLevelTabSelected, data.filterForPatch, data.allChecked)
        }
        data.totalRows = data.totalParents
        if (callTotalsValues) {
          data.totalsBycolumnsParents = null
          callTotalDataByLevel('parents')
        }

        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataSpends(true);
        }

        data.loadParents = false;
      }
      //
      catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);
      }
      //
      finally {
        data.loadParents = false
      }
    }

    function getParentsData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(data.gridColumnsParents, nodesEdges)
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterParents);
      const graphqlOrderString = convertSortToGraphQL(event.sortParents);
      const paginationString = `first: ${event.paginationParents.first} ${event.paginationParents.after ? `, after: "${btoa((event.paginationParents.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryProgramListParents"
      const listAction = props.phaseId ? "edit" : "add"
      const graphqlQuery = `
        {
          parents: ${collectionQuery}(
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            targetPlanUuid: "${props.planId}",
            targetPhaseUuid: "${props.phaseId ?? 'all'}",    
            ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${setGlobalFilter ? setGlobalFilter : ''}
            action: "${listAction}"
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

      data.loadSpends = true

      try {
        let queryString = getSpendsData(filterSettings);
        const response = await graphqlUtils.getCollectionData(queryString)
        let nodes = response.data.spends.edges.map((edge: any) => edge.node);

        if (isPilotAccount()) {
          nodes = ArrayUtils.filterNodesByIsPilot(nodes)

        }
        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)
          datas.buyerCountry = data.buyerCountry ?? '-'
          datas.buyerRegion = data.buyerRegion ?? '-'
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
          const validateESG = [0, 1, 2, 3, 4, 100]
          let value = 0
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore)
          } else {
            value = 404
          }
          datas.entityInvestVerteScore = translate.t('home.entityCard.rating.esgClassification.c' + value)
          datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality ? formatData.getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) : '-'
          datas.isActive = !!data.activeProgram
          datas.activeProgram = data.activeProgram ? data.activeProgram : translate.t('tableStatus.notAssigned')
          datas.selected = data.selected === null ? false : data.selected

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(',')
            if (programs.length > 1) {
              datas.activeProgram = translate.t('tableStatus.multiple')
            }
          } else {
            datas.activeProgram = translate.t('tableStatus.notAssigned')
          }

          if (data.phases) {
            if (data.phases === '10000') {
              datas.phases = translate.t("global.rest")
            } else {
              const splitPhases = data.phases.split(',')
              if (splitPhases.length > 1) {
                datas.phases = translate.t("tableStatus.multiple")
              }
            }
          }
          parsedData.push(datas)
        })
        data.dataSpends = parsedData
        if (data.entityLevelTabSelected === 0) {
          data.initialSelectedItems = data.dataSpends.filter(
            (x) => x.selected === true
          )
          emit('send-arrays-with-data', [], [], false, data.initialSelectedItems, data.entityLevelTabSelected, data.filterForPatch, data.allChecked)
        }

        data.totalRows = data.totalSpends
        if (callTotalsValues) {
          data.totalsBycolumnsSpends = null
          callTotalDataByLevel('spends')
        }

        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataParents(true);
        }
        data.loadSpends = false;
      }
      //
      catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);
      }
      //
      finally {
        data.loadSpends = false
      }
    }

    function getSpendsData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSpends);
      const getEdges = graphqlUtils.getActiveColumns(data.gridColumnsSpends, nodesEdges)
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryProgramListSpends"
      const listAction = props.phaseId ? "edit" : "add"
      const graphqlQuery = `
        {
          spends: ${collectionQuery}(
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            targetPlanUuid: "${props.planId}",
            targetPhaseUuid: "${props.phaseId}",
            ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
            order: {${graphqlOrderString}},
            currencyRate: ${currencyRate},
            ${paginationString},
            ${setGlobalFilter ? setGlobalFilter : ''} 
            action: "${listAction}"
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

    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'entityName: \"asc\"'
      }
      return sort.map(descriptor => `${descriptor.field}: "${descriptor.dir}"`).join(', ');
    }

    async function dataChange(filter: any, sort: any) {
      data.filterForPatch = filter
      switch (data.entityLevelTabSelected) {
        case ENTITY_LEVEL.SPEND_LINES:
          filterSettings.paginationSpends = { first: filterSettings.paginationSpends.first, after: 0, skip: 0 };
          filterSettings.filterSpends = filter;
          filterSettings.sortSpends = sort;
          clearTimeout(pendingRequest);
          data.totalSpends = 0
          await fetchDataSpends(true);
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          filterSettings.paginationSuppliers = { first: filterSettings.paginationSuppliers.first, after: 0, skip: 0 };
          filterSettings.filterSuppliers = filter;
          filterSettings.sortSuppliers = sort;
          clearTimeout(pendingRequest);
          data.totalSuppliers = 0
          await fetchDataSuppliers(true);
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          filterSettings.paginationParents = { first: filterSettings.paginationParents.first, after: 0, skip: 0 };
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
      data.entityLevelTabSelected = indexTab
      homeStore.setEntityLevelTabSelected(indexTab);
      resetSelected()

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



      let listAction = props.phaseId ? "edit" : "add"


      const telerikFilter = graphqlUtils.convertFiltersToREST(
        filtersApplied
      );

      const response = await HomeAPI.getUniqueData(
        {
          level, field: '', currencyRate, targetProgramUuid: null, targetPlanUuid: props.planId ?? null, targetPhaseUuid: props.phaseId ?? null, section, globalFilter: formatData.convertFiltersToREST(
            globalFiltersStore.getFiltersApplied
          ), activeSpendFileVersion: spendFileVersionActiveId.value, targetOperation: null, summaryOperation: "summary", telerikFilter, summary: setColumnsSummary(level), fullDisabled: false, summaryAction: listAction
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

        toast.error(translate.t('global.errorLoadingPlanEditLists'));
        return null;
      }

      return response.data
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


    function resetSelected() {
      data.selectedItems = []
      data.initialSelectedItems = []
      data.currentRemoved = []
      data.newItems = []
      data.withChanges = false
      emit('send-arrays-with-data', [], [], false, [], data.entityLevelTabSelected, data.filterForPatch, data.allChecked)
    }

    /* WATCHERS
      */

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
        setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(newValue);

        data.dataSpends = [];
        data.dataSuppliers = [];
        data.dataParents = [];

        // Update grids
        await loadGridsData(true);
      }
    );

    const planSpendEditComputed = computed(() => {
      return data.gridColumnsSpends
    })

    const planSuppliersEditComputed = computed(() => {
      return data.gridColumnsSuppliers
    })

    const planParentsEditComputed = computed(() => {
      return data.gridColumnsParents
    })


    function resetDefaultColumns(levelofgrid: any) {
      if (levelofgrid === 'spends') {
        homeStore.setHomePlanColumnOrderSpendsCF(null)
        data.gridColumnsSpends = getGridColumnsSpends(true)
        data.keySpends++
      }

      if (levelofgrid === 'suppliers') {
        homeStore.setHomePlanPhaseColumnOrderSuppliersCF(null)
        data.gridColumnsSuppliers = getGridColumnsSuppliers(true)
        data.keySuppliers++
      }

      if (levelofgrid === 'parents') {
        homeStore.setHomePlanPhaseColumnOrderParentsCF(null)
        data.gridColumnsParents = getGridColumnsParents(true)
      }
    }

    return {
      ...toRefs(data),
      changeTabFromGrid,
      dataChange,
      dataSource,
      ENTITY_LEVEL,
      filterSettings,
      kendoChartRelated,
      loader,
      loadingData: false,
      pageChangeHandler,
      planParentsEditComputed,
      planSpendEditComputed,
      planSuppliersEditComputed,
      resetDefaultColumns,
      selectAllRow,
      selectRow,
      total,
      isResetting,
    }
  }
})
</script>