<template>
  <CalculumModal v-if="showModalConfirm" :size="'lg'" :title="$t('home.overview.deleteConfirmTitle')" :show-close="true" @close="showModalConfirm = false">
    <template #modalContent>
      <p>{{ $t('home.overview.deleteConfirmBody') }}</p>
    </template>
    <template #modalButtons>
      <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="showModalConfirm = false">
        <span>{{ $t('button.cancel') }}</span>
      </button>
      <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="confirmDelete">
        <span>{{ $t('global.deleteAndRecalculate') }}</span>
      </button>
    </template>
  </CalculumModal>
  <CalculumModal v-if="showModalLessSpends" :size="'lg'" :title="$t('home.overview.selectAllUnavailableTitle')" :show-close="true" @close="showModalLessSpends = false">
    <template #modalContent>
      <p>{{ $t('home.overview.selectAllUnavailableBody') }}</p>
    </template>
    <template #modalButtons>
      <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="showModalLessSpends = false">
        <span>{{ $t('button.ok') }}</span>
      </button>
    </template>
  </CalculumModal>
  <CalculumModal v-if="showAsyncMessage" :size="'lg'" :title="$t('home.overview.selectAllUnavailableTitle')" :show-close="true" @close="showAsyncMessage = false">
    <template #modalContent>
      <p>{{ $t('home.overview.selectAllUnavailableBody') }}</p>
    </template>
    <template #modalButtons>
      <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="showModalLessSpends = false">
        <span>{{ $t('button.ok') }}</span>
      </button>
    </template>
  </CalculumModal>
  <CalculumLoading v-if="loadExport" block="block" with-description="withDescription" :description="exportLoadingMessage"></CalculumLoading>
  <CalculumModal v-if="showLargeExportConfirm" :size="'md'" :title="$t('home.analyze.list.largeExportTitle')" :show-close="true" @close="cancelLargeExport">
    <template #modalContent>
      <p>{{ $t('home.analyze.list.largeExportWarning', { count: pendingExportCount.toLocaleString() }) }}</p>
    </template>
    <template #modalButtons>
      <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelLargeExport">
        <span>{{ $t('global.cancel') }}</span>
      </button>
      <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="confirmLargeExport">
        <span>{{ $t('global.continue') }}</span>
      </button>
    </template>
  </CalculumModal>
  <div class="card">
    <div class="card-body" :class="{ 'bg-blur': loadList }">
      <CalculumGridGraphql
        :key="keyList"
        :grid-data="dataList"
        :grid-columns="filteredGridColumns"
        :sortable="true"
        :enabled-pagination="true"
        :allow-export-excel="true"
        :filterable="true"
        :total="totalList"
        :skip="filterSettings.paginationSuppliers.after"
        :take="filterSettings.paginationSuppliers.first"
        :default-page-size="filterSettings.paginationSuppliers.first"
        :filter="filterSettings.filterSuppliers"
        :sort="filterSettings.sortSuppliers"
        :is-expanded="true"
        :collection-query="'collectionQueryMatchLists'"
        :row-colors="true"
        :grid-height="gridHeight"
        :section="section"
        :selectable="onEdit"
        :children-columns="true"
        :totals-bycolumns="totalsBycolumns"
        :loading="loadList"
        :is-for-match-view="true"
        @data-change="dataChange"
        @pagechange="pageChangeHandler"
        @reset-default-columns="resetDefaultColumns"
        @callback-on-submit="onColumnsSubmit"
        @select-all-row="selectAllRow"
        @select-row="selectRow"
        @exportCSV="exportCSV"
        @grid-match-remove="gridMatchRemove"
        @match-edit-list="editMode"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { matchColumnsGrid } from '../data/graphqlColumns'
import { fontIcons } from '@/resources/assets/assets'
import { reactive, toRefs, computed, onMounted, watch, defineComponent, ref, PropType } from 'vue'
import { setConfidenceScore, toConfidenceScoreLabel, convertFiltersToREST } from '@/utils/FormatData'
import { useI18n } from 'vue-i18n'
import { useOverviewStore } from '@/stores/overview'
import { useHomeStore } from '@/stores/home'
import * as cacheGrid from '@/utils/dataGridClear'
import * as Routing from '@/services/router/Routing'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { FilterChangeEvent } from '@/types/filterSettings'
import { SortDescriptor } from '@progress/kendo-data-query/dist/npm/sort-descriptor'
import CalculumGridGraphql from '@/modules/components/grid/CalculumGridGraphql.vue'
import * as graphqlUtils from '@/utils/graphqlUtils'
import { useToast } from 'vue-toastification'
import { nodesEdgesMatch } from '../data/nodeEdges'
import { saveExcel } from '@progress/kendo-vue-excel-export'
import useApolloClient from '@/services/graphql/useApolloClient'
import { onBeforeRouteLeave } from 'vue-router'
import { removeDuplicateLines } from '@/utils/StringUtils'
import { ObjectUtils } from '@/utils'
import * as HomeAPI from "@/modules/home/api";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useEntityCardStore } from '@/stores/entityCard'
import { useAnalyzeStore } from '@/stores/analyze'
import { useGridExport } from '@/modules/home/analyze/composables/useGridExport'
import type { ItemSelectedInCharts } from '@/modules/home/analyze/types'

export default defineComponent({
  name: 'MatchOverviewList',
  components: {
    CalculumLoading,
    CalculumModal,
    CalculumGridGraphql,
  },
  props: {
    spendFileVersionActiveId: { type: String, required: true, default: '' },
    itemSelectedInCharts: {
      type: Object as PropType<ItemSelectedInCharts>,
      required: false,
      default: () => ({
        groupName: '',
        optionName: '',
        name: '',
        secondaryName: ''
      })
    },
  },
  emits: ['reset-edit'],
  setup(props, { emit }) {
    const overviewStore = useOverviewStore()
    const homeStore = useHomeStore()
    const entityCardStore = useEntityCardStore()
    const analyzeStore = useAnalyzeStore()

    watch(
      () => entityCardStore.selectedProgram,
      (programId) => {
        if (programId) analyzeStore.loadCustomDataPointTypes(programId)
      },
      { immediate: true }
    )
    const toast = useToast()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
    const payOnTermsIsAllowed = computed(() => userStore.getShowPayOnTerms)

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
        if (import.meta.env.DEV) console.error('Excel export generation failed', error);
        toast.error(translate.t('error.server500'))
      },
    })

    interface DataInterface {
      loadList: boolean,
      dataList: Array<any>,
      totalList: number,
      totalsBycolumns: any[] | null
      keyList: number,
      gridColumns: Array<any>,
      gridHeight: string,
      toExport: Array<any>,
      level: string,
      columnsToExport: Array<any>,
      customHeaders: any,
      queryWatcher: any | null
      showAsyncMessage: boolean
      showModalConfirm: boolean
      showModalLessSpends: boolean
      onEdit: boolean
      selectedItems: Array<any>
      initialLengthData: number
      matchList: Array<any>
      noMatchList: Array<any>
      section: string
    }
    const data = reactive<DataInterface>({
      loadList: true,
      dataList: [],
      totalList: 0,
      totalsBycolumns: null,
      keyList: new Date().getUTCMilliseconds(),
      gridColumns: getGridColumns(),
      gridHeight: 'auto',
      toExport: [],
      level: 'spends',
      columnsToExport: [],
      customHeaders: [],
      queryWatcher: null,
      showAsyncMessage: false,
      showModalConfirm: false,
      showModalLessSpends: false,
      onEdit: false,
      selectedItems: [],
      initialLengthData: 0,
      matchList: [],
      noMatchList: [],
      section: 'match'
    })
    const { apolloClientResetStore } = useApolloClient()
    onBeforeRouteLeave((to) => {
      apolloClientResetStore()
    })
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
          field: "status",
          dir: "asc"
        },
        {
          field: "name",
          dir: "desc"
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
          field: "",
          dir: "desc"
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
          field: "name",
          dir: "asc"
        }
      ]
    };
    let currencyRate: number = useAppStore().getCurrencyAmount;
    let pendingRequest: any;
    async function dataChange(filter: any, sort: any) {
      filterSettings.paginationSuppliers = { first: filterSettings.paginationSuppliers.first, after: 0, skip: 0 };
      filterSettings.filterSuppliers = filter;
      filterSettings.sortSuppliers = sort;
      clearTimeout(pendingRequest);
      await fetchData();
    }
    const abortMultipleRequestbyBox = ref<AbortController | null>(null);

    // Charts filter refs
    const chartsFilter = ref<any | []>([]);
    const chartsFilterGraphQL = ref<string | "">("");

    const statusName = (name: string): string => {
      console.log(`home.overview.list.${name.toLowerCase()}`)
      return translate.t('home.overview.list.' + name.toLowerCase())
    }
    //- get Data
    async function fetchData() {
      let queryString = getData(filterSettings);
      data.loadList = true
      try {

        if (abortMultipleRequestbyBox.value) {
          abortMultipleRequestbyBox.value.abort();
        }
        abortMultipleRequestbyBox.value = new AbortController()
        const response = await graphqlUtils.getCollectionData(queryString, abortMultipleRequestbyBox.value.signal)
        const nodes = response.data.suppliers.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []
        nodes.forEach(function (record: any) {
          const newRecord = { ...record }
          // The grid query returns the raw numeric score, not the label the
          // REST overview endpoint exposes, so map it before formatting
          const confidence = setConfidenceScore(toConfidenceScoreLabel(record.confidenceScore))
          newRecord.actualPaymentTerms = record.capturedCashDiscounts ?? parseFloat(record.actualPaymentTerms ?? 0)
          newRecord.capturedCashDiscounts = parseFloat(record.capturedCashDiscounts ?? 0)
          newRecord.originalCity = record.originalCity ?? '-'
          newRecord.cashDiscounts = record.cashDiscounts ? (record.cashDiscounts * 100) : '-'
          newRecord.commodities = record.commodity ?? '-'
          newRecord.confidenceScore = confidence[0] === 'na' ? '-' : translate.t('home.overview.' + confidence[0])
          newRecord.confidenceScoreColor = confidence[2]
          newRecord.contractualPaymentTermsWithCashDiscounts = parseFloat(record.contractualPaymentTermsWithCashDiscounts ?? 0)
          newRecord.contractualPaymentTermsWithoutCashDiscounts = parseFloat(record.contractualPaymentTermsWithoutCashDiscounts ?? 0)
          newRecord.customColumnOne = record.customDataPoint1 ?? '-'
          newRecord.customColumnThree = record.customDataPoint3 ?? '-'
          newRecord.customColumnTwo = record.customDataPoint2 ?? '-'
          newRecord.originalParentCompanyName = record.originalParentCompanyName ?? '-'
          newRecord.matched = record.matched === 'yes' ? translate.t('global.yes') : translate.t('global.no')
          newRecord.originalActualPaymentTerms = parseFloat(record.originalActualPaymentTerms ?? 0)
          newRecord.originalCapturedCashDiscounts = parseFloat(record.originalCapturedCashDiscounts ?? 0)
          newRecord.originalCashDiscounts = record.originalCashDiscounts ? (record.originalCashDiscounts * 100) : '-'
          newRecord.originalCommodity = record.originalCommodity ?? '-'
          newRecord.originalContractualWith = parseFloat(record.originalContractualWith ?? 0)
          newRecord.originalContractualWithout = parseFloat(record.originalContractualWithout ?? 0)
          newRecord.originalVolume = parseFloat(record.originalVolume ?? 0).toFixed(1)
          newRecord.selected = false
          newRecord.volume = parseFloat(record.volume ?? 0).toFixed(1)
          newRecord.status = record.status ? statusName(record.status) : '-'
          parsedData.push(newRecord)
        })
        data.dataList = parsedData
        data.loadList = false
        void callTotalData()
      }
      catch (error: any) {
        if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return
        if (import.meta.env.DEV) console.error('** Error while data fetching.', error);
        data.loadList = false
      }
    }
    const callTotalData = async () => {
      const totals = await fetchTotal(data.level, data.section, filterSettings.filterSuppliers)
      if (totals !== null) {
        data.totalsBycolumns = totals
        data.totalList = totals.totalCount
      }
    }
    const fetchTotal = async (level: string, section: string, filtersApplied: any) => {
      const telerikFilter = graphqlUtils.convertFiltersToREST(filtersApplied)
      const chartsFilterToRest = graphqlUtils.convertFiltersToREST(chartsFilter.value)
      const response = await HomeAPI.getUniqueData({
        level,
        field: '',
        currencyRate,
        targetProgramUuid: null,
        targetPlanUuid: null,
        targetPhaseUuid: null,
        section,
        globalFilter: null,
        activeSpendFileVersion: props.spendFileVersionActiveId,
        targetOperation: null,
        summaryOperation: "summary",
        telerikFilter,
        summary: setColumnsSummary(),
        fullDisabled: false,
        chartsFilter: chartsFilterToRest
      })
      if (!response.success || response.data === null || response.data === undefined) {
        if (import.meta.env.DEV) console.log(`** Error - Invalid response in panelBarItemOptionsAPIReadAll.`);
        toast.error(translate.t("error.server500"));
        return null;
      }
      return response.data
    }
    const setColumnsSummary = () => {
      let getActiveColumnsByLevel: Array<any> = [];
      const columns = data.gridColumns[0].children.concat(data.gridColumns[1].children)
      getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(columns);
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
    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'name: \"asc\"'
      }
      return sort.map(descriptor => `${descriptor.field}: "${descriptor.dir}"`).join(', ');
    }
    function getData(event: FilterChangeEvent): string {
      const columns = data.gridColumns[0].children.concat(data.gridColumns[1].children)
      const getEdges = removeDuplicateLines(graphqlUtils.getActiveColumns(columns, nodesEdgesMatch), true)
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSuppliers);
      const graphqlOrderString = convertSortToGraphQL(event.sortSuppliers);
      const paginationString = `first: ${event.paginationSuppliers.first} ${event.paginationSuppliers.after ? `, after: "${btoa((event.paginationSuppliers.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryMatchLists"
      const graphqlQuery = `
          {
            suppliers: ${collectionQuery}(
              targetSpendFileVersionUuid: "${props.spendFileVersionActiveId}",
              currencyRate: ${currencyRate},
              ${graphqlFilterString ? graphqlFilterString + ',' : ''}
              ${chartsFilterGraphQL.value ? chartsFilterGraphQL.value + ',' : ''}
              order: {${graphqlOrderString}},
              ${paginationString},
              ) {
              pageInfo {
                startCursor
                endCursor
                hasNextPage
              }
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
    async function pageChangeHandler(event: any) {
      if (event.event.value) {
        filterSettings.paginationSuppliers = { first: event.event.value, after: 0, skip: 0 };
      } else {
        filterSettings.paginationSuppliers = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
      }
      await fetchData();
    }
    onMounted(() => {
      abortMultipleRequestbyBox.value = null
      setGridHeight()
      loadGridsData()
    })

    window.onresize = () => {
      setGridHeight()
    }

    function setGridHeight() {
      const getSubMain = document.getElementById('container-main-id')
      if (getSubMain) {
        data.gridHeight = (getSubMain.clientHeight - 95) + 'px'
      }
    }

    const editModeComputed = computed(() => {
      return data.onEdit
    })

    watch(() => editModeComputed.value, () => {
      if (editModeComputed.value) {
        data.keyList = new Date().getUTCMilliseconds()
      }
    })

    function getGridColumns(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = []
      matchColumnsGrid.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        columns.push(newConfig)
      })
      let resetcolumns = []
      const gridCache = resetColumnsFlag ? [] : homeStore.getMatchColumnsLists
      if (gridCache
        && gridCache.length && (JSON.stringify(columns) !== JSON.stringify(gridCache))) {
        resetcolumns = cacheGrid.clearCacheChilds(columns, gridCache)
      } else {
        resetcolumns = columns
      }
      resetcolumns = modifyResetColumnsField(resetcolumns, ["contractualPaymentTermsWithCashDiscounts", "cashDiscounts"], false)
      homeStore.setMatchColumnsLists(resetcolumns)
      return resetcolumns
    }

    const filteredGridColumns = computed(() => {
      const shouldHideADP = hideAverageDaysPaid.value
      const shouldHidePayOnTerms = !payOnTermsIsAllowed.value
      if (!shouldHideADP && !shouldHidePayOnTerms) return data.gridColumns
      return data.gridColumns.map((col: any) => {
        if (Array.isArray(col.children)) {
          return {
            ...col,
            children: col.children.filter((child: any) => {
              if (shouldHideADP && child.field === 'actualPaymentTerms') return false
              if (shouldHidePayOnTerms && child.field === 'contractualPaymentTermsWithoutCashDiscounts') return false
              return true
            })
          }
        }
        return col
      })
    })

    watch(() => data.gridColumns, () => {
      homeStore.setMatchColumnsLists(data.gridColumns)
      fetchData()
    })

    function selectRow(rowData: any) {
      data.selectedItems = [];
      if (rowData.length > 0) {
        data.selectedItems = rowData;
      }
      gridAllSelected()
    }

    function modifyResetColumnsField(data: any[], fieldsToModify: string[], newValue: boolean): any[] {
      const newData = ObjectUtils.cloneDeep(data)

      function modifyRecursive(items: any[]) {
        for (const item of items) {
          if (fieldsToModify.includes(item.field)) {
            item.hidden = newValue;
          }

          if (item.children && Array.isArray(item.children)) {
            modifyRecursive(item.children);
          }
        }
      }

      modifyRecursive(newData);
      return newData;
    }




    function selectAllRow(rowData: any, checked: boolean) {
      rowData.forEach(function (config: any) {
        const index = data.dataList.findIndex(x => x.uuid === config.uuid)
        const element = data.dataList[index]
        element.selected = checked
        data.selectedItems.push(element);
      })
      data.selectedItems = checked ? data.selectedItems : [];
      gridAllSelected()
    }

    function gridAllSelected() {
      if (Number(data.initialLengthData - data.selectedItems.length) < 1) {
        data.showModalLessSpends = true
      }
    }

    function gridMatchRemove() {
      if (Number(data.initialLengthData - data.selectedItems.length) < 1) {
        data.showModalLessSpends = true
      } else {
        data.showModalConfirm = true
      }

    }

    function confirmDelete() {
      data.matchList = []
      data.noMatchList = []
      data.showModalConfirm = false
      data.selectedItems.forEach(function (item: any) {
        if (item.matched === 'Yes') {
          data.matchList.push(item.uuid)
        } else {
          data.noMatchList.push(item.uuid)
        }
      })
      deleteSpendbySpendFile()
    }

    function getWhoAmI() {
      const params = {
        callbackSuccess: () => {
          userStore.setShowMenu(false);
          Routing.home.openHome();
        },
        callbackError: () => {
          data.loadList = false;
          emit("reset-edit");
        }
      };

      userStore.whoAmI(params);
    }

    function deleteSpendbySpendFile() {
      data.loadList = true
      const params = {
        spendFileVersion: props.spendFileVersionActiveId,
        match: data.matchList,
        noMatch: data.noMatchList,
        callbackSuccess: (callbackSuccessData: any) => {
          if (callbackSuccessData.inProcess) {
            getWhoAmI()
          } else {
            data.loadList = false
            emit('reset-edit')
          }
        },
        callbackError: () => {
          toast.error(translate.t('error.server500'))
          emit('reset-edit')
        }
      }
      overviewStore.deleteSpendbySpendFile(params)
    }

    function editMode() {
      data.onEdit = !data.onEdit
    }


    function resetDefaultColumns() {
      homeStore.setMatchColumnsLists(null)
      data.gridColumns = getGridColumns(true)
    }

    function onColumnsSubmit(flattenedColumns: any[]) {
      // Reconstruct the nested structure when childrenColumns is true
      const reconstructedColumns = data.gridColumns.map((parentColumn: any) => {
        const updatedParent = { ...parentColumn }

        if (updatedParent.children && Array.isArray(updatedParent.children)) {
          updatedParent.children = updatedParent.children.map((childColumn: any) => {
            // Find the matching flattened column (title format: "child (parent)")
            const expectedTitle = `${childColumn.title} (${parentColumn.title})`
            const flatColumn = flattenedColumns.find((col: any) => col.title === expectedTitle)

            if (flatColumn) {
              return { ...childColumn, hidden: flatColumn.hidden }
            }
            return childColumn
          })
        }

        return updatedParent
      })

      data.gridColumns = reconstructedColumns
    }
    function exportCSV(collection: any) {
      let filters = undefined
      let title = ''
      // Export what the grid actually renders (filteredGridColumns), so columns hidden by permissions
      // (Average Days Paid / Pay on Terms) are not exported either.
      data.columnsToExport = filteredGridColumns.value
      if (collection === 'collectionQueryMatchLists') {
        filters = filterSettings.filterSuppliers
        title = 'Match_List'
      }
      const filtersGrid = {
        telerikFilter: convertFiltersToREST(filters),
        globalFilter: null,
        currencyRate,
        targetSpendFileVersionUuid: props.spendFileVersionActiveId
      }
      startExport(
        {
          level: data.level,
          title,
          columns: data.columnsToExport,
          filtersGrid,
          section: data.section
        },
        data.totalList
      )
    }
    async function loadGridsData() {
      resetExport();
      fetchData();
    }

    /**
     * Watch for changes in itemSelectedInCharts prop
     * Apply filters when chart selection changes
     * Uses the same approach as ListsByChartsValue.vue
     */
    watch(
      () => props.itemSelectedInCharts,
      async () => {
        await apolloClientResetStore();
        chartsFilter.value = graphqlUtils.createKendoFilterFromChartSelection(props.itemSelectedInCharts);
        chartsFilterGraphQL.value = graphqlUtils.convertFiltersChartsToGraphQL(chartsFilter.value);
        filterSettings.paginationSuppliers = { first: filterSettings.paginationSuppliers.first, after: 0, skip: 0 };
        fetchData();
      },
      { deep: true }
    );

    return {
      ...toRefs(data),
      filteredGridColumns,
      confirmDelete,
      editMode,
      editModeComputed,
      fontIcons,
      gridMatchRemove,
      resetDefaultColumns,
      onColumnsSubmit,
      selectAllRow,
      selectRow,
      filterSettings,
      dataChange,
      pageChangeHandler,
      exportCSV,
      loadExport,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      confirmLargeExport,
      cancelLargeExport,
    }
  }
})
</script>

<style lang="scss" scoped>
@use "src/resources/assets/styles/variables/colors" as *;
@use "sass:map";

table {
  .circle {
    min-width: 40px;
    height: 40px;
    -moz-border-radius: 50%;
    -webkit-border-radius: 50%;
    border-radius: 50%;
    background: map.get($colors, "gray-300");
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .clear-row {
    background-color: map.get($colors, "gray-100");
    max-width: 1rem;
    border-color: map.get($colors, "gray-100");
    padding: 0;
    width: 1.5rem;
  }

  .supplier-name {
    width: 15rem;
  }

  &.table-custom {
    width: 150%;
  }

  td {
    text-align: center;
    vertical-align: middle;
  }

  th {
    position: relative;
    vertical-align: inherit;

    .header-title {
      position: absolute;
      background-color: map.get($colors, "gray-100");
      border: none;
      top: -2rem;
      padding: 0;
      font-size: 1rem;
      left: 0;
      width: max-content;
    }

    & .categorize-column-header-options {
      justify-content: center;
    }

    &.reject {
      width: 4rem;

      .categorize-column-header-options {
        img {
          display: none !important;
        }
      }
    }
  }

  tr {
    td {
      border-top: 1px solid map.get($colors, "gray-100") !important;
    }
  }
}

table.table-custom tbody tr:hover,
table.table-custom.table-striped tbody tr:nth-of-type(odd):hover {
  background-color: initial !important;
}

.card {
  padding: 0;
  margin-bottom: 0;
  min-height: 1px;
}
</style>
