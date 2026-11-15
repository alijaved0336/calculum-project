<template>
<div class="row">
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
      <CalculumGridGraphql v-if="dataSpends" :gridData="dataSpends" :gridColumns="gridColumnsSpends" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="true" :selectedTabFromView="entityLevelTabSelected" :collectionQuery="'collectionQueryAnalyzeListSpends'" :totalsBycolumns="totalsBycolumnsSpends" :gridHeight="gridHeight" :key="keySpends" :levelOfGrid="'spends'" :section="'analyze'" :loading="loadSpends" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @update-row-data-parent="updaterowData" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadSuppliers), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.SUPPLIERS }">
      <CalculumGridGraphql v-if="dataSuppliers" :gridData="dataSuppliers" :gridColumns="gridColumnsSuppliers" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalSuppliers" :skip="filterSettings.paginationSuppliers.after" :take="filterSettings.paginationSuppliers.first" :defaultPageSize="filterSettings.paginationSuppliers.first" :filter="filterSettings.filterSuppliers" :sort="filterSettings.sortSuppliers" :showTabsLevels="true" :selectedTabFromView="entityLevelTabSelected" :isExpanded="true" :nameTemplateChild="'detailTemplateSupplier'" :collectionQuery="'collectionQueryAnalyzeListSuppliers'" :rowColors="true" :totalsBycolumns="totalsBycolumnsSuppliers" :gridHeight="gridHeight" :key="keySuppliers" :levelOfGrid="'suppliers'" :section="'analyze'" :loading="loadSuppliers" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
    <div class="col-12 widget" :class="{ 'bg-blur': (loadParents), 'hidden-grid': entityLevelTabSelected !== ENTITY_LEVEL.ULTIMATE_PARENT }">
      <CalculumGridGraphql v-if="dataParents" :gridData="dataParents" :gridColumns="gridColumnsParents" :sortable="true" :enabledPagination="true" :allowExportExcel="true" :filterable="true" :total="totalParents" :skip="filterSettings.paginationParents.after" :take="filterSettings.paginationParents.first" :defaultPageSize="filterSettings.paginationParents.first" :filter="filterSettings.filterParents" :sort="filterSettings.sortParents" :showTabsLevels="true" :selectedTabFromView="entityLevelTabSelected" :isExpanded="true" :nameTemplateChild="'detailTemplateParent'" :collectionQuery="'collectionQueryAnalyzeListParents'" :rowColors="true" :isForParent="true" :gridHeight="gridHeight" :key="keyParents" :levelOfGrid="'parents'" :section="'analyze'" :totalsBycolumns="totalsBycolumnsParents" :loading="loadParents" @dataChange="dataChange" @pagechange="pageChangeHandler" @changeTabFromGrid="changeTabFromGrid" @exportCSV="exportCSV" @resetDefaultColumns="resetDefaultColumns"></CalculumGridGraphql>
    </div>
  </div>
</div>
</template>

<script lang='ts'>
import { reactive, toRefs, computed, watch, ref, ComputedRef, onMounted, defineComponent } from 'vue'

import { categorizeEdges } from '../data/categorizeEdges';
import { defaultColumns } from '../data/graphqlColums'
import { ENTITY_LEVEL } from '@/utils'
import { Grid } from '@progress/kendo-vue-grid'
import { onBeforeRouteLeave } from 'vue-router'
import { saveExcel } from '@progress/kendo-vue-excel-export'
import { SortDescriptor } from '@progress/kendo-data-query/dist/npm/sort-descriptor'
import { translate } from '@/utils/translation'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useHomeStore } from '@/stores/home'
import { useUserStore } from '@/stores/user'
import * as cacheGrid from '@/utils/dataGridClear'
import * as formatData from '@/utils/FormatData'
import * as graphqlUtils from '@/utils/graphqlUtils'
import CalculumGridGraphql from '@/modules/components/grid/CalculumGridGraphql.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import { useGridExport } from '@/modules/home/analyze/composables/useGridExport'

import useProgram from '@/modules/home/analyze/composables/useProgram';
import useUser from '@/services/user/composables/useUser';
import { FilterChangeEvent } from '@/types/filterSettings'
import useSMEFeature from "@/composables/useSMEFeature";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import * as HomeAPI from "@/modules/home/api";
import useSpendFile from "@/composables/useSpendFile";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { useAppStore } from '@/stores/app';

export default defineComponent({
  name: 'CategorizeList',
  components: {
    CalculumLoading,
    CalculumModal,
    CalculumGridGraphql,
    Grid
  },
  props: {
    fullScreen: { type: Boolean, default: false }
  },
  setup(props) {
    const globalFiltersStore = useGlobalFiltersStore()
    const homeStore = useHomeStore()
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
    const toast = useToast()
    const { user, isPilotAccount } = useUser()
    const { smeRelatedColumnsDisplayBasedOnSMEFeature } = useSMEFeature()
    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()
    const { spendFileVersionActiveId } = useSpendFile();
    const { apolloClientResetStore, isResetting } = useApolloClient();
    const appStore = useAppStore();

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
    let currencyRate: number = appStore.getCurrencyAmount;

    // *** Filters ***
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

    // *** END Fitlers ***

    const detailTemplateSupplier = ref('detailTemplateSupplier')
    const entityLevelTabSelected: ComputedRef<number> = computed<number>(() => (homeStore.getEntityLevelTabSelected))

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
      tabSelected: number,
      keySpends: number,
      keySuppliers: number,
      keyParents: number,
      gridColumnsSpends: Array<any>,
      gridColumnsSuppliers: Array<any>,
      gridColumnsParents: Array<any>,
      gridHeight: string,
      toExport: Array<any>,
      columnsToExport: Array<any>,
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
      tabSelected: homeStore.getEntityLevelTabSelected,
      keySpends: new Date().getUTCMilliseconds(),
      keySuppliers: new Date().getUTCMilliseconds(),
      keyParents: new Date().getUTCMilliseconds(),
      gridColumnsSpends: getGridColumnsSpends(),
      gridColumnsSuppliers: getGridColumnsSuppliers(),
      gridColumnsParents: getGridColumnsParents(),
      gridHeight: 'auto',
      toExport: [],
      columnsToExport: [],
      totalsBycolumnsSpends: [],
      totalsBycolumnsSuppliers: [],
      totalsBycolumnsParents: []
    })


    window.onresize = () => {
      setGridHeight()
    }

    onBeforeRouteLeave((to) => {
      apolloClientResetStore()
      data.dataSpends = [];
      data.dataSuppliers = [];
      data.dataParents = [];

      data.gridColumnsSpends = [];
      data.gridColumnsSuppliers = [];
      data.gridColumnsParents = [];
    })

    function setGridHeight() {
      if (props.fullScreen) {
        const getSubMain = document.getElementById('the-full-screen')
        if (getSubMain) {
          if ((getSubMain.clientHeight - 115) < 350) {
            data.gridHeight = '350px'
          } else {
            data.gridHeight = (getSubMain.clientHeight - 115) + 'px'
          }
        }
      } else {
        const getSubMain = document.getElementById('container-main-id')
        if (getSubMain) {
          data.gridHeight = (getSubMain.clientHeight - 76) + 'px'
        }
      }
    }

    function getGridColumnsSuppliers(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = []
      defaultColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomeCategorizeGridColumnsSuppliers
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
        const parentName = resetColumns.findIndex(
          (x: any) => x.field === "parentName"
        )
        if (parentName > -1) {
          resetColumns[parentName].cell = 'restrictModalEntitySupplier'
        }
      }
      const indexSpend = resetColumns.findIndex((x: any) => x.field === 'supplierCounts')
      if (indexSpend > -1) {
        resetColumns.splice(indexSpend, 1)
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)


      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)
      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }
      homeStore.setHomeCategorizeGridColumnsSuppliers(resetColumns)
      return resetColumns
    }

    function getGridColumnsParents(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = []
      defaultColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomeCategorizeGridColumnsParents
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
      const indexSpend = resetColumns.findIndex((x: any) => x.field === 'entityName')
      if (indexSpend >= 0) {
        resetColumns[indexSpend].title = translate.t('home.analyze.table.parentName')
      }

      const indexSpend2 = resetColumns.findIndex((x: any) => x.field === 'parentName')

      if (indexSpend2 > -1) {
        resetColumns.splice(indexSpend2, 1)
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)
      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }
      homeStore.setHomeCategorizeGridColumnsParents(resetColumns)

      return resetColumns
    }

    function getGridColumnsSpends(resetColumnsFlag: boolean = false): Array<any> {
      const columns: Array<any> = []
      defaultColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config)
        columns.push(newConfig)
      })
      let resetColumns = []
      const gridCache = resetColumnsFlag ? [] : homeStore.getHomeCategorizeGridColumnsSpends
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
        const parentName = resetColumns.findIndex(
          (x: any) => x.field === "parentName"
        )
        if (parentName > -1) {
          resetColumns[parentName].cell = 'restrictModalEntitySpend'
        }
      }

      const indexSpend = resetColumns.findIndex((x: any) => x.field === 'spendCounts')
      if (indexSpend >= 0) {
        resetColumns[indexSpend].title = translate.t('home.analyze.table.alias')
        resetColumns[indexSpend].field = 'spendAlias'
        resetColumns[indexSpend].cell = 'aliasTemplate'
      }

      const indexSpend2 = resetColumns.findIndex((x: any) => x.field === 'supplierCounts')
      if (indexSpend2 > -1) {
        resetColumns.splice(indexSpend2, 1)
      }

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      /** Credit Rating Related */
      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms')
      }
      homeStore.setHomeCategorizeGridColumnsSpends(resetColumns)
      return resetColumns
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
      setGridHeight();
      await loadGridsData(true);
    });


    async function pageChangeHandler(event: any) {
      switch (data.tabSelected) {
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
      // Enable loading
      data.loadSuppliers = true

      try {
        let queryString = getSupplierData(filterSettings);
        const response = await graphqlUtils.getCollectionData(queryString)
        const nodes = response.data.suppliers.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = []
        nodes.forEach(function (data: any) {
          // Clone data
          const datas = Object.assign({}, data)

          //for buyer region and buyer country
          datas.buyerRegion = data.buyerRegion ?? '-'
          datas.buyerCountry = data.buyerCountry ?? '-'
          datas.spendsAmount = data.spendCounts
          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
          );
          datas.level = 'supplier'
          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness)
          );
          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness)
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

          if (data.agreedDateOfChange) {
            let splitDate = data.agreedDateOfChange.split(',')

            if (splitDate.length > 1) {
              datas.agreedDateOfChange = translate.t('tableStatus.multiple')
            }
          }

          if (data.nextReviewDate) {
            let splitDate = data.nextReviewDate.split(',')

            if (splitDate.length > 1) {
              datas.nextReviewDate = translate.t('tableStatus.multiple')
            }
          }

          parsedData.push(datas)
        })

        data.dataSuppliers = parsedData

        if (callTotalsValues) {
          data.totalsBycolumnsSuppliers = []
          callTotalDataByLevel('suppliers')
        }
        if (callOthersGrid) {
          fetchDataSpends(true);
          fetchDataParents(true);
        }

        data.loadSuppliers = false
      }
      //
      catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);

        data.loadSuppliers = false
      }
    }


    // *** Program ***
    const { programSelectedId } = useProgram();

    function getSupplierData(event: FilterChangeEvent): string {
      const getCategorizeEdges = graphqlUtils.getActiveColumns(data.gridColumnsSuppliers, categorizeEdges)
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSuppliers);
      const graphqlOrderString = convertSortToGraphQL(event.sortSuppliers);
      const paginationString = `first: ${event.paginationSuppliers.first} ${event.paginationSuppliers.after ? `, after: "${btoa((event.paginationSuppliers.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryAnalyzeListSuppliers"
      const graphqlQuery = `
        {
          suppliers: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              targetProgramUuid: "${programSelectedId.value ? programSelectedId.value : user.value?.activeProgramDefaultId !== undefined ? user.value?.activeProgramDefaultId : ''}",
              ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
              order: {${graphqlOrderString}}, 
              ${paginationString},
              currencyRate: ${currencyRate},
              ${setGlobalFilter ? setGlobalFilter : ''} 
            ) {
            edges {
              cursor
              node {
                ${getCategorizeEdges}
              }
              
            }
          }
        }
      `;
      return graphqlQuery;
    }

    //- get parents Data
    async function fetchDataParents(callTotalsValues: boolean = false, callOthersGrid: boolean = false) {

      data.loadParents = true

      try {
        let queryString = getParentsData(filterSettings);
        const response = await graphqlUtils.getCollectionData(queryString)

        const nodes = response.data.parents.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []

        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data)
          //for buyer region and buyer country
          datas.buyerRegion = data.buyerRegion ?? '-'
          datas.buyerCountry = data.buyerCountry ?? '-'
          datas.suppliersAmount = data.entityType === 'supplier' ? '-' : data.supplierCounts > 0 ? data.supplierCounts : '-'
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

          datas.level = 'parent'
          const validateESG = [0, 1, 2, 3, 4, 100]
          let value = 0
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore)
          } else {
            value = 404
          }
          datas.entityInvestVerteScore = translate.t('home.entityCard.rating.esgClassification.c' + value)
          datas.entityRegulatoryTermsStrategyModality = data.entityRegulatoryTermsStrategyModality ? formatData.getStrategyModalityValue(data.entityRegulatoryTermsStrategyModality) : '-'

          /** For multiple values */
          if (data.agreedDateOfChange) {
            let splitDate = data.agreedDateOfChange.split(',')
            if (splitDate.length > 1) {
              datas.agreedDateOfChange = translate.t('tableStatus.multiple')
            }
          }
          if (data.nextReviewDate) {
            let splitDate = data.nextReviewDate.split(',')
            if (splitDate.length > 1) {
              datas.nextReviewDate = translate.t('tableStatus.multiple')
            }
          }

          parsedData.push(datas)
        })

        data.dataParents = parsedData

        if (callTotalsValues) {
          data.totalsBycolumnsParents = []
          callTotalDataByLevel('parents')
        }

        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataSpends(true);
        }

        data.loadParents = false
      } catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);

        data.loadParents = false
      }
    }

    function getParentsData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterParents);
      const getCategorizeEdges = graphqlUtils.getActiveColumns(data.gridColumnsParents, categorizeEdges)
      const graphqlOrderString = convertSortToGraphQL(event.sortParents);
      const paginationString = `first: ${event.paginationParents.first} ${event.paginationParents.after ? `, after: "${btoa((event.paginationParents.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryAnalyzeListParents"
      const graphqlQuery = `
        {
          parents: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              targetProgramUuid: "${programSelectedId.value ? programSelectedId.value : user.value?.activeProgramDefaultId !== undefined ? user.value?.activeProgramDefaultId : ''}",
              ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
              order: {${graphqlOrderString}}, 
              ${paginationString}
              currencyRate: ${currencyRate},
              ${setGlobalFilter ? setGlobalFilter : ''} 
            ) {
            edges {
              cursor
              node {
                ${getCategorizeEdges}
              }
              
            }
          }
        }
      `;
      return graphqlQuery;
    }

    //- get spends Data
    async function fetchDataSpends(callTotalsValues: boolean = false, callOthersGrid: boolean = false) {
      // Enable loading      
      data.loadSpends = true;

      try {
        let queryString = getSpendsData(filterSettings);
        const response = await graphqlUtils.getCollectionData(queryString);

        const nodes = response.data.spends.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = []

        nodes.forEach(function (data: any) {
          // Clone data
          const datas = Object.assign({}, data)

          //for buyer region and buyer country

          datas.buyerRegion = data.buyerRegion ?? '-'

          datas.buyerCountry = data.buyerCountry ?? '-'

          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness)
          );

          datas.level = 'supplier'

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness)
          );
          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness)
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

          parsedData.push(datas)
        })

        data.dataSpends = parsedData

        if (callTotalsValues) {
          data.totalsBycolumnsSpends = []
          callTotalDataByLevel('spends')
        }

        if (callOthersGrid) {
          fetchDataSuppliers(true);
          fetchDataParents(true);
        }

        // Disable loading
        data.loadSpends = false
      }
      //
      catch (error) {
        if (import.meta.env.DEV) console.error('Data fetching failed:', error);

        // Disable loading
        data.loadSpends = false
      }
    }

    function getSpendsData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSpends);
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const getCategorizeEdges = graphqlUtils.getActiveColumns(data.gridColumnsSpends, categorizeEdges)
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"` : ''}`;
      const collectionQuery = "collectionQueryAnalyzeListSpends"
      const graphqlQuery = `
        {
          spends: ${collectionQuery}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              targetProgramUuid: "${programSelectedId.value ? programSelectedId.value : user.value?.activeProgramDefaultId !== undefined ? user.value?.activeProgramDefaultId : ''}",
              ${graphqlFilterString ? graphqlFilterString + ',' : ''} 
              order: {${graphqlOrderString}}, 
              ${paginationString},
              currencyRate: ${currencyRate},
              ${setGlobalFilter ? setGlobalFilter : ''} 
            ) {
            edges {
              cursor
              node {
                ${getCategorizeEdges}
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
      switch (data.tabSelected) {
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
      data.tabSelected = indexTab
      homeStore.setEntityLevelTabSelected(indexTab)
      switch (data.tabSelected) {
        case ENTITY_LEVEL.SPEND_LINES:
          clearTimeout(pendingRequest);
          filterSettings.paginationSpends = { first: filterSettings.paginationSpends.first, after: 0, skip: 0 };
          //if (data.dataSpends.length === 0){
          await fetchDataSpends();
          data.keySpends++
          //}                    
          break;
        case ENTITY_LEVEL.SUPPLIERS:
          clearTimeout(pendingRequest);
          filterSettings.paginationSuppliers = { first: filterSettings.paginationSuppliers.first, after: 0, skip: 0 };
          //if (data.dataSuppliers.length === 0){
          await fetchDataSuppliers();
          data.keySuppliers++
          //}          
          //data.keySuppliers++
          break;
        case ENTITY_LEVEL.ULTIMATE_PARENT:
          clearTimeout(pendingRequest);
          filterSettings.paginationParents = { first: filterSettings.paginationParents.first, after: 0, skip: 0 };
          //if (data.dataParents.length === 0){
          await fetchDataParents();
          data.keyParents++
          //}          
          //data.keyParents++
          break;
        default:
          break;
      }

    }

    function updaterowData(recordsGet: any) {
      const indexSpend = data.dataSpends.findIndex(x => x.uuid === recordsGet.uuid)
      data.dataSpends[indexSpend].spendAlias = recordsGet.alias
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

      const getSummationColumns = totalColumnsUtils.getTotalFieldsSummation(getActiveColumnsByLevel)

      const getFieldsByTrueValue = totalColumnsUtils.getTotalFieldsCountByTrueValue(getActiveColumnsByLevel)

      const getFieldsByWeightedAvg = totalColumnsUtils.getTotalFieldsWeightedAvg(getActiveColumnsByLevel)




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
          level, field: '', currencyRate, targetProgramUuid: null, targetPlanUuid: null, targetPhaseUuid: null, section, globalFilter: formatData.convertFiltersToREST(
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

        toast.error(translate.t("error.server500"));
        return null;
      }

      return response.data
    }


    async function callTotalDataByLevel(level: string) {
      switch (level) {
        case 'spends': {
          const totals = await fetchTotalsbyLevel(level, "analyze", filterSettings.filterSpends)
          if (totals !== null) {
            data.totalsBycolumnsSpends = totals
            data.totalSpends = totals.totalCount
          }
          break;
        }

        case 'suppliers': {
          const totals = await fetchTotalsbyLevel(level, "analyze", filterSettings.filterSuppliers)
          if (totals !== null) {
            data.totalsBycolumnsSuppliers = totals
            data.totalSuppliers = totals.totalCount
          }
          break;
        }

        case 'parents': {
          const totals = await fetchTotalsbyLevel(level, "analyze", filterSettings.filterParents)
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

    function getExportTotalForCollection(collection: any): number {
      if (collection === 'collectionQueryAnalyzeListParents') return data.totalParents;
      if (collection === 'collectionQueryAnalyzeListSuppliers') return data.totalSuppliers;
      if (collection === 'collectionQueryAnalyzeListSpends') return data.totalSpends;
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

      if (collection === 'collectionQueryAnalyzeListParents') {
        filters = filterSettings.filterParents
        columns = data.gridColumnsParents
        title = 'AnalyzeParents'
        level = 'parents'
      }
      if (collection === 'collectionQueryAnalyzeListSuppliers') {
        filters = filterSettings.filterSuppliers
        columns = data.gridColumnsSuppliers
        title = 'AnalyzeSuppliers'
        level = 'suppliers'
      }
      if (collection === 'collectionQueryAnalyzeListSpends') {
        filters = filterSettings.filterSpends
        columns = data.gridColumnsSpends
        title = 'AnalyzeSpends'
        level = 'spends'
      }

      const filtersGrid = {
        telerikFilter: formatData.convertFiltersToREST(filters),
        globalFilter: formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied),
        currencyRate: appStore.getCurrencyAmount,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value
      }

      startExport(
        { level, title, columns, filtersGrid, section: 'analyze' },
        getExportTotalForCollection(collection)
      )
    }


    /* WATCHERS
     */
    // Spends

    // Spends
    watch(hideAverageDaysPaid, () => {
      data.gridColumnsSpends = getGridColumnsSpends(true)
      data.gridColumnsSuppliers = getGridColumnsSuppliers(true)
      data.gridColumnsParents = getGridColumnsParents(true)
    })

    watch(
      () => data.gridColumnsSpends,
      () => {
        if (!data.loadSpends && !data.loadSuppliers && !data.loadParents) {

          homeStore.setHomeCategorizeGridColumnsSpends(
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
          homeStore.setHomeCategorizeGridColumnsSuppliers(
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
          homeStore.setHomeCategorizeGridColumnsParents(
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
    function resetDefaultColumns(levelofgrid: any) {
      if (levelofgrid === 'spends') {
        homeStore.setHomeCategorizeGridColumnsSpends(null)
        data.gridColumnsSpends = getGridColumnsSpends(true)
      }

      if (levelofgrid === 'suppliers') {
        homeStore.setHomeCategorizeGridColumnsSuppliers(null)
        data.gridColumnsSuppliers = getGridColumnsSuppliers(true)
      }

      if (levelofgrid === 'parents') {
        homeStore.setHomeCategorizeGridColumnsParents(null)
        data.gridColumnsParents = getGridColumnsParents(true)
      }
    }

    return {
      ...toRefs(data),
      dataSource,
      loadingData: false,
      detailTemplateSupplier,
      total,
      loader,
      pageChangeHandler,
      filterSettings,
      dataChange,
      entityLevelTabSelected,
      changeTabFromGrid,
      ENTITY_LEVEL,
      updaterowData,
      exportCSV,
      loadExport,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      confirmLargeExport,
      cancelLargeExport,
      resetDefaultColumns,
      isResetting,
    }
  }
})
</script>