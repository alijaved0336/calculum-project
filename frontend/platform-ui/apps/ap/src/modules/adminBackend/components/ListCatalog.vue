<template>
<div class="page-content-overflow2">
  <section class="page-content-top"></section>
  <section class="page-content">
    <div class="row">
      <div class="col-12">
        <div class="card ml-4" style="min-height: auto; height: auto">
          <div class="card-body">
            <div class="row">
              <div class="col-6 d-flex flex-column">
                <div class="input-group input-search m-1">
                  <input class="form-control" id="search" type="text" v-model="searchCompany" :placeholder="'Search by Supplier Name'" @keyup.enter="setSearchText"/>
                  <div class="input-group-icon" id="icon-search"><i class="fa-brands fa-sistrix cursor-pointer" @click="setSearchText"></i></div>
                </div><span class="error text-left errors-days" v-if="showErrorText">{{ $t('global.errorTextSearch') }}</span>
              </div>
              <CalculumLoading v-if="loadExport || loadGridData" :modal="true"></CalculumLoading>
              <div class="col-12" :class="{'bg-blur': (loadGridData)}">
                <CalculumGridGraphql :gridData="dataPeers" :gridColumns="gridColumns" :sortable="true" :enabledPagination="true" :allowExportExcel="allowExportCSV" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="false" :collectionQuery="'collectionQueryManagementCatalogLists'" :selectable="false" :key="keySpends" :levelOfGrid="'catalog'" :section="'adminBackend'" :allowExclude="false" :gridHeight="gridHeight" :hideColumnSelector="true" :summaryOperation="'list'" :listPeers="true" :compareList="true" :disableBlurEfect="true" :totalsBycolumns="totalsBycolumnsSpends" @dataChange="dataChange" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" @exportCSV="exportCSV" v-if="dataPeers"></CalculumGridGraphql>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { FilterChangeEvent } from "@/types/filterSettings";
import { Grid } from "@progress/kendo-vue-grid";
import { reactive, toRefs, watch, ref, onMounted, defineComponent, computed } from "vue";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useHomeStore } from '@/stores/home';
import * as graphqlUtils from "@/utils/graphqlUtils";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import { CalculumLoading } from '@ada/design-system'
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import useApolloClient from "@/services/graphql/useApolloClient";
import { onBeforeRouteLeave } from "vue-router";
import { adminConsoleSpendColumns } from "../data/columns";
import * as cacheGrid from "@/utils/dataGridClear";
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import * as formatData from "@/utils/FormatData";
import { saveExcel } from "@progress/kendo-vue-excel-export";
import { useToast } from "vue-toastification";
import { useI18n } from 'vue-i18n'
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import * as HomeAPI from "@/modules/home/api";
import { useAppStore } from '@/stores/app';
import { useUserStore } from '@/stores/user';

const EXPORT_ALLOWED_EMAILS = new Set([
  'amir@calculum.ai',
  'carlos@calculum.ai',
  'oliver@calculum.ai',
  'joel@calculum.ai',
]);

export default defineComponent({
  name: "ListCatalog",
  components: {
    CalculumGridGraphql,
    CalculumLoading,
    Grid,
    GridSkeleton,
    iconClose
  },
  setup() {
    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()
    let dataSource = ref(null);
    let total = ref(0);
    let loader = ref(false);
    const appStore = useAppStore();
    const userStore = useUserStore();
    let currencyRate: number = appStore.getCurrencyAmount;

    const abortMultipleRequestbySearch = ref<AbortController | null>(null);

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
          field: "",
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
          field: "entityName",
          dir: "asc"
        }
      ]
    };

    interface DataInterface {
      loadGridData: boolean;
      dataPeers: Array<any>;
      totalSpends: number;
      keySpends: number;
      gridColumns: Array<any>;
      gridHeight: string;
      toExport: Array<any>;
      loadExport: boolean;
      searchCompany: string,
      globalSearch: string,
      loadGridDataFirstCall: boolean,
      fieldsGlobalSearch: Array<any>,
      showErrorText: boolean,
      allowExportCSV: boolean,
      totalsBycolumnsSpends: Array<any> | null;

    }

    const data = reactive<DataInterface>({
      loadGridData: false,
      dataPeers: [],
      totalSpends: 0,
      keySpends: new Date().getUTCMilliseconds(),
      gridColumns: getgridColumns(),
      gridHeight: "auto",
      toExport: [],
      loadExport: false,
      searchCompany: "",
      globalSearch: "",
      loadGridDataFirstCall: true,
      fieldsGlobalSearch: ["entityName", "entityCountryName", "entityIndustryName"],
      showErrorText: false,
      allowExportCSV: false,
      totalsBycolumnsSpends: null
    });

    /** Start edition */



    // *** Apollo Client ***

    const { apolloClientResetStore } = useApolloClient();

    // *** END Apollo Client ***

    window.onresize = () => {
      setGridHeight();
    };

    onBeforeRouteLeave(async () => {
      await apolloClientResetStore();
    });

    function setGridHeight() {
      const getSubMain = document.getElementById("container-main-id");
      if (getSubMain) {
        if (getSubMain.clientHeight - 260 < 350) {
          data.gridHeight = "350px";
        } else {
          data.gridHeight = getSubMain.clientHeight - 260 + "px";
        }
      }
    }

    function getgridColumns(resetcolumnsFlag: boolean = false): Array<any> {

      const columns: Array<any> = [];
      adminConsoleSpendColumns.forEach(function (config: any) {
        const newConfig = { ...config };
        columns.push(newConfig);
      });

      let resetcolumns = [];

      const gridCache = resetcolumnsFlag ? [] : homeStore.getAdminConsoleCatalogColumns;
      if (
        gridCache &&
        gridCache.length &&
        JSON.stringify(columns) !==
        JSON.stringify(gridCache)
      ) {
        resetcolumns = cacheGrid.clearCache(
          columns,
          gridCache
        );
      } else {
        resetcolumns = columns;

      }

      resetcolumns.forEach((node: any) => {
        node.hidden = false
      });


      homeStore.setAdminConsoleCatalogColumns(resetcolumns);

      return resetcolumns;
    }

    // ? - Move to common util file
    async function loadGridsData(
      options?: Partial<{
        invalidateCache: boolean;
      }>
    ) {
      try {
        // Invalidate graphql cache
        if (options?.invalidateCache) {
          await apolloClientResetStore();
        }
        data.loadExport = false;
        await fetchdataPeers();
      } catch (error) {
        if (import.meta.env.DEV) console.error("** (loadGridsData)", error);
      }
    }

    onMounted(async () => {
      abortMultipleRequestbySearch.value = null
      setGridHeight();
    });

    async function pageChangeHandler(event: any) {
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
      await fetchdataPeers()
    }

    //- get spends Data
    async function fetchdataPeers() {

      if (data.searchCompany === "") {
        return null
      }
      let queryString = getPeersData(filterSettings);

      try {

        if (abortMultipleRequestbySearch.value) {
          abortMultipleRequestbySearch.value.abort();
          await apolloClientResetStore();
        }
        abortMultipleRequestbySearch.value = new AbortController()

        // Enabling loading
        data.loadGridData = true;
        const response = await graphqlUtils.getCollectionData(queryString, abortMultipleRequestbySearch.value.signal);
        const nodes = response.data.company.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];

        nodes.forEach((node: any) => {
          const data = { ...node };

          parsedData.push(data);
        });
        data.dataPeers = parsedData;

        callTotalDataByLevel('catalog')

        data.loadGridData = false;
        data.loadGridDataFirstCall = false
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.loadGridDataFirstCall = false
        data.loadGridData = false;
      }
    }

    const getSummationColumns = ref<any[]>([])
    const getFieldsByWeightedAvg = ref<any[]>([])


    function setColumnsSummary() {

      let getActiveColumnsByLevel: Array<any> = [];

      getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(data.gridColumns)
      getSummationColumns.value = totalColumnsUtils.getTotalFieldsSummation(getActiveColumnsByLevel)
      getFieldsByWeightedAvg.value = totalColumnsUtils.getTotalFieldsWeightedAvg(getActiveColumnsByLevel)

      const summaryFields = {
        'sum': getSummationColumns.value,
        'avg.weighted.ceil': getFieldsByWeightedAvg.value
      }
      return summaryFields
    }

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
          ), activeSpendFileVersion: null, targetOperation: null, summaryOperation: "summary", telerikFilter, summary: setColumnsSummary(), fullDisabled: false, searchingText: formatData.convertFiltersToREST(getSearchText()) ?? ""
        })

      if (
        !response.success ||
        response.data === null ||
        response.data === undefined
      ) {
        if (import.meta.env.DEV) console.log(`** Error - Invalid response in panelBarItemOptionsAPIReadAll.`);

        toast.error(translate.t("error.server500"));
        return null;
      }

      return response.data
    }


    async function callTotalDataByLevel(level: string) {

      const totals = await fetchTotalsbyLevel(level, "adminBackend", filterSettings.filterSpends)
      if (totals !== null) {
        data.totalsBycolumnsSpends = totals
        data.totalSpends = totals.totalCount
        const userEmail = userStore.getUser?.email?.toLowerCase() ?? ''
        data.allowExportCSV = totals.totalCount > 0 && EXPORT_ALLOWED_EMAILS.has(userEmail)
      }

    }


    function getNodeEdges() {

      return `
      entityType
      entityUuid  
      entityMediaPath
      parentUuid      
      entityCreditScore
      entityFlagUrl
      buyerFlagUrl
      spendAlias
      uuid
    `

    }

    function getPeersData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends
      );
      const nodeEdgesValues = getNodeEdges();

      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumns,
        nodeEdgesValues
      );

      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after
          ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
          : ""
        }`;
      const collectionQuery = "collectionQueryManagementCatalogLists"
      const graphqlQuery = `
          {
            company: ${collectionQuery}(
              ${graphqlFilterString ? graphqlFilterString + "," : ""} 
              ${data.globalSearch ? data.globalSearch + "," : ""} 
              order: {${graphqlOrderString}},              
              ${paginationString},              
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

    const showXlsExport = computed(() => {

      if (data.totalSpends === 0) {
        return false
      }

      return data.totalSpends < 4000
    })


    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'entityName: "asc"';
      }
      return sort
        .map(descriptor => `${descriptor.field}: "${descriptor.dir}"`)
        .join(", ");
    }

    async function dataChange(filter: any, sort: any) {
      filterSettings.paginationSpends = {
        first: filterSettings.paginationSpends.first,
        after: 0,
        skip: 0
      };
      filterSettings.filterSpends = filter;
      filterSettings.sortSpends = sort;
      data.totalSpends = 0
      await fetchdataPeers();
    }

    // *** Watchers ***

    // Spends
    watch(
      () => data.gridColumns,
      () => {

        if (!data.loadGridData) {
          homeStore.setAdminConsoleCatalogColumns(data.gridColumns);
          fetchdataPeers();
        }

      },
      { deep: true }
    );

    function resetDefaultColumns() {
      homeStore.setAdminConsoleCatalogColumns(null);
      data.gridColumns = getgridColumns(true)
      data.keySpends++;
    }

    async function setSearchText() {

      if (data.searchCompany === "") {
        data.dataPeers = []
        data.totalSpends = 0
        data.loadGridData = false;
        return
      }


      if (data.searchCompany && (data.searchCompany.length < 2 || data.searchCompany.length > 255)) {
        data.showErrorText = true
        return
      } else {
        data.showErrorText = false
      }

      filterSettings.paginationSpends = {
        first: 25,
        after: 0,
        skip: 0
      }

      data.globalSearch = graphqlUtils.convertSearchTextToGraphQL(getSearchText())
      await loadGridsData();
    }


    function getSearchText() {
      return {
        searchingText: data.searchCompany
      }
    }


    function exportCSV() {


      if (data.totalSpends > 5000) {
        toast.error(translate.t('adminBackend.adminClusters.noty.error.limitExportSpendsCatalog'));
        return
      }

      data.loadExport = true;
      let filters = filterSettings.filterSpends;
      let title = "spends-data";


      let currencyRate: number = appStore.getCurrencyAmount;
      let filters_grid = {
        telerikFilter: formatData.convertFiltersToREST(filters),
        globalFilter: formatData.convertFiltersToREST(
          globalFiltersStore.getFiltersApplied
        ),
        currencyRate,
        searchText: formatData.convertFiltersToREST(getSearchText())
      };


      const params = {
        level: "catalog",
        filters_grid,
        section: "adminBackend",

        callbackSuccess: async (callbackSuccessData: any) => {
          data.loadExport = false;



          const totalRowFooter = await totalColumnsUtils.getTotalFieldsFooter(
            data.totalsBycolumnsSpends ?? [],
            data.gridColumns,
            callbackSuccessData,
            getSummationColumns.value,
            getFieldsByWeightedAvg.value,
            []
          );

          /**
           * Add a "new" row with the totals
           * 
           */
          const finalDatawithtotals = [...callbackSuccessData, totalRowFooter];

          saveExcel({
            data: finalDatawithtotals,
            fileName: title,
            columns: data.gridColumns,
            filterable: true
          });
        },

        callbackError: () => {
          data.loadExport = false;
        }
      };

      homeStore.exportData(params);
    }



    return {
      ...toRefs(data),
      dataChange,
      dataSource,
      filterSettings,
      loader,
      loadingData: false, // ? - ??
      pageChangeHandler,
      resetDefaultColumns,
      total,
      setSearchText,
      exportCSV,
      showXlsExport
    };
  }
});
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

span.error {
  margin-top: 5px;
  color: $color-error-500;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}


.widget {
  min-height: auto;
}

.k-grid-header .k-checkbox {
  display: none !important;
}


.form-group input:not(:placeholder-shown)+span {
  left: 1.75rem;
}

#search-company {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  width: 40%;
  height: 40px;
  background: #f2f4f7;
  border: 1px solid #d0d5dd;
  box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
  border-radius: 8px;
  flex: none;
  order: 1;
  align-self: stretch;
  flex-grow: 0;
  padding-left: 2.2rem;
}


.selected-items-section {
  width: 100%;
  height: 80px;
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 5px;
  position: relative;
}


.selected-items-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  pointer-events: none;
  /* Esto asegura que el pseudo-elemento no interfiera con la interacción de los elementos dentro del contenedor */
}

.selected-items-section-show {
  width: 100%;
  height: 150px !important;
  overflow-y: auto !important;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 5px;
}

.reset-buton-section {
  justify-content: end;
  align-items: center;
}
</style>
