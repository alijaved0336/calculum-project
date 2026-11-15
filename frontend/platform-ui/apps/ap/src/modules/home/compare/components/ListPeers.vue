<template>
<div class="row no-gutters-row">
  <div class="col-6 d-flex">
    <div class="input-group input-search m-1">
      <input class="form-control" id="search" type="text" v-model="searchCompany" :placeholder="'Search by Peer'" @keyup.enter="setSearchText"/>
      <div class="input-group-icon" id="icon-search"><i class="fa-brands fa-sistrix cursor-pointer" @click="setSearchText"></i></div>
    </div>
  </div>
  <div class="col-6 d-flex reset-buton-section">
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="$emit('reset-peers')">{{ "Reset Peers" }} </button>
  </div>
</div>
<div class="row no-gutters-row">
  <CalculumLoading v-if="loadExport" :modal="true"></CalculumLoading>
  <div class="col-12" :class="{ 'bg-blur': (loadGridData) }">
    <CalculumGridGraphql :gridData="dataPeers" :gridColumns="gridColumns" :sortable="true" :enabledPagination="true" :allowExportExcel="false" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="false" :collectionQuery="'collectionQueryCompareCompanyLists'" :selectable="true" :key="keySpends" :levelOfGrid="'entities'" :section="'compareCompany'" :allowExclude="false" :gridHeight="gridHeight" :hideColumnSelector="true" :summaryOperation="'list'" :listPeers="true" :validateArrays="validateArrays" :compareList="true" :showToolbar="false" @dataChange="dataChange" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" @selectAllRow="selectAllRow" @selectRow="selectRow" @resetPeers="$emit('reset-peers')" v-if="dataPeers"></CalculumGridGraphql>
  </div>
</div>
<div class="row mt-2">
  <div class="col-12 badges-peers" ref="badgesPeersRef">
    <div class="d-flex justify-content-between mb-4"><span class="text-gray-500 text-sm font-normal mr-4">{{ $t('home.compare.selectedCompanies') }} ({{ sortItems.length }})</span>
      <button class="btn outline-secondary-btn btn-xs font-xs" v-if="sortItems.length > 0" style="z-index: 1; width: fit-content;" @click="cleanSelectedCompanies()">{{ "Clear all selected peers" }}           </button>
    </div>
    <div class="d-flex" :class="'selected-items-section-show'">
      <div class="d-flex flex-wrap">
        <div class="d-flex align-items-center mb-2" v-for="(company, index) in sortItems" :key="index">
          <div class="d-flex align-items-center justify-content-between badge_container mr-4" ref="badgeContainersRef">
            <div class="d-flex align-items-center">
              <Tooltip class="ellipsis" :open-delay="100" :anchor-element="'target'" :position="'top'">
                <div class="d-flex align-items-center"><span class="ml-1 ellipsis_p" :title="company.name"><span class="field_title mr-2" :title="company.name">{{ company.name }}</span></span></div>
              </Tooltip>
            </div>
            <iconClose class="remove_icon_badge_container ml-2" @click="removeCompanyFromGridAndArray(company.id)"> </iconClose>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { FilterChangeEvent } from "@/types/filterSettings";
import { Grid } from "@progress/kendo-vue-grid";
import { reactive, toRefs, watch, computed, ref, onMounted, defineComponent, nextTick } from "vue";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { useFinancingDataCompaniesStore } from "@/stores/financingDataCompanies";
import * as graphqlUtils from "@/utils/graphqlUtils";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import { CalculumLoading } from '@ada/design-system'
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import useApolloClient from "@/services/graphql/useApolloClient";
import { onBeforeRouteLeave } from "vue-router";
import { homeFinancingListCompanies } from "@/modules/home/views/data/homeFinancingListCompanies";
import { useI18n } from "vue-i18n";
import * as cacheGrid from "@/utils/dataGridClear";
import { ObjectUtils } from "@/utils";
import iconClose from '@/resources/assets/images/icons/iconClose.vue'


export default defineComponent({
  name: "ListPeers",
  components: {
    CalculumGridGraphql,
    CalculumLoading,
    Grid,
    GridSkeleton,
    iconClose
  },
  props: {
    comparePeersList: { type: Array, required: true },
  },
  emits: ["change-data", "select-all-row", "select-row", "validate-arrays", "send-selected-items", "reset-peers"],
  setup(props, { emit }) {
    const financingDataCompaniesStore = useFinancingDataCompaniesStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    let dataSource = ref(null);
    let total = ref(0);
    let loader = ref(false);

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
      columnsToExport: Array<any>;
      customHeaders: any;
      selectedItems: Array<any>;
      displayModelForHarmonization: boolean;
      levelHarmonizationFromGrid: string;
      levelGridFromGrid: string;
      modalTarget: boolean;
      targetAmount: number;
      initialItems: Array<any>;
      searchCompany: string,
      globalSearch: string,
      loadGridDataFirstCall: boolean,
      showDetails: boolean,
      showMore: boolean
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
      columnsToExport: [],
      customHeaders: [],
      selectedItems: [],
      displayModelForHarmonization: false,
      levelHarmonizationFromGrid: "",
      levelGridFromGrid: "",
      modalTarget: false,
      targetAmount: 0,
      initialItems: [],
      searchCompany: "",
      globalSearch: "",
      loadGridDataFirstCall: true,
      showDetails: false,
      showMore: false
    });

    const badgesPeersRef = ref<HTMLElement | null>(null);
    const badgeContainersRef = ref<HTMLElement[]>([]);


    const checkWidths = () => {
      if (badgesPeersRef.value) {
        const badgesPeersWidth = badgesPeersRef.value.offsetWidth;
        const totalBadgeContainersWidth = badgeContainersRef.value.reduce((total, badge) => {
          return total + badge.offsetWidth;
        }, 0);
        if (totalBadgeContainersWidth >= badgesPeersWidth) {
          data.showMore = true
          data.showDetails = false
        } else {
          data.showMore = false
          data.showDetails = true
        }
      }
    };


    /** Start edition */

    function selectAllRow(rowData: any, checked: boolean) {
      rowData.forEach(function (config: any) {
        const cloneData = ObjectUtils.cloneDeep(config)
        const cleanItem = cleanItemFn(cloneData)
        const index = data.dataPeers.findIndex(x => x.id === cleanItem.id);
        data.dataPeers[index].selected = checked;
        if (checked) {
          data.selectedItems.push(cleanItem);
        } else {
          data.selectedItems = []
        }
      });
      emit('send-selected-items', data.selectedItems);
    }

    function selectRow(itemData: any, checked: boolean) {
      const cloneData = ObjectUtils.cloneDeep(itemData)
      const cleanItem = cleanItemFn(cloneData)
      if (checked === false) {
        const index = data.selectedItems.findIndex(x => x.id === cleanItem.id);
        if (index > -1) {
          data.selectedItems.splice(index, 1);
        }
      } else {
        data.selectedItems.push(cleanItem);
      }
      emit('send-selected-items', data.selectedItems);
    }

    const validateArrays = computed(() => {
      const validate = JSON.stringify(data.selectedItems) === JSON.stringify(data.initialItems)
      emit('validate-arrays', validate)
      return validate
    })

    function cleanItemFn(itemData: any) {
      itemData.name = itemData.entityName
      delete itemData['@id'];
      delete itemData.entityCountryName;
      delete itemData.entityIndustryCode;
      delete itemData.entityIndustryName;
      delete itemData.entityName;
      delete itemData.selected;
      delete itemData.entityRegion;
      delete itemData.__typename;
      return itemData
    }


    // *** Apollo Client ***

    const { apolloClientResetStore } = useApolloClient();

    // *** END Apollo Client ***

    window.onresize = () => {
      setGridHeight();
    };

    onBeforeRouteLeave(async to => {
      await apolloClientResetStore()
      data.dataPeers = [];
      data.gridColumns = [];
      data.gridHeight = "auto";
      data.toExport = [];
      data.loadExport = false;
      data.columnsToExport = [];
      data.customHeaders = [];
    });

    function setGridHeight() {
      const getSubMain = document.getElementById("container-main-id");
      if (getSubMain) {
        if (getSubMain.clientHeight - 260 < 350) {
          data.gridHeight = "350px";
        } else {
          data.gridHeight = getSubMain.clientHeight - 360 + "px";
        }
      }
    }

    function getgridColumns(resetcolumnsFlag: boolean = false): Array<any> {

      const columns: Array<any> = [];
      homeFinancingListCompanies.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        columns.push(newConfig);
      });

      let resetcolumns = [];

      const gridCache = resetcolumnsFlag ? [] : financingDataCompaniesStore.getHomeFinancingListCompaniesPeers();
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

      const selectedColumn = resetcolumns.findIndex(
        (x: any) => x.field === "selected"
      );

      if (selectedColumn > -1) {
        resetcolumns.splice(selectedColumn, 1);
      }

      const entityName = resetcolumns.findIndex(
        (x: any) => x.field === "entityName"
      );

      if (entityName > -1) {
        resetcolumns[entityName].title = translate.t("home.analyze.table.companyName")
        resetcolumns[entityName].title = translate.t("home.analyze.table.companyName")
        resetcolumns[entityName].hidden = false
        resetcolumns[entityName].width = '400px'
      }


      const entityCountryName = resetcolumns.findIndex(
        (x: any) => x.field === "entityCountryName"
      );
      if (entityCountryName > -1) {
        resetcolumns[entityCountryName].title = translate.t("home.analyze.table.country")
      }

      const entityRegion = resetcolumns.findIndex(
        (x: any) => x.field === "entityRegion"
      );
      if (entityRegion > -1) {
        resetcolumns[entityRegion].hidden = false
        resetcolumns[entityRegion].cell = ''
        resetcolumns[entityRegion].width = '300px'
        resetcolumns[entityRegion].title = translate.t("home.analyze.table.region")
      }

      const entityContinent = resetcolumns.findIndex(
        (x: any) => x.field === "entityContinent"
      );
      if (entityContinent > -1) {
        resetcolumns[entityContinent].hidden = false
        resetcolumns[entityContinent].cell = ''
        resetcolumns[entityContinent].width = '300px'
        resetcolumns[entityContinent].title = translate.t("home.analyze.table.continent")
      }



      const entityIndustryName = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryName"
      );
      if (entityIndustryName > -1) {
        resetcolumns[entityIndustryName].hidden = false
        resetcolumns[entityIndustryName].width = '550px'
        resetcolumns[entityIndustryName].title = translate.t("global.industryNameNAICS4")
      }

      const entityIndustryCode = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryCode"
      );
      if (entityIndustryCode > -1) {
        resetcolumns[entityIndustryCode].hidden = false
        resetcolumns[entityIndustryCode].width = '150px'
      }

      const entityIndustryNameNaics2 = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryNameNaics2"
      );
      if (entityIndustryNameNaics2 > -1) {
        resetcolumns[entityIndustryNameNaics2].hidden = true
        resetcolumns[entityIndustryNameNaics2].width = '550px'
        resetcolumns[entityIndustryNameNaics2].title = translate.t("global.industryNameNAICS2")
      }

      const entityIndustryCodeNaics2 = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryCodeNaics2"
      );
      if (entityIndustryCodeNaics2 > -1) {
        resetcolumns[entityIndustryCodeNaics2].hidden = true
        resetcolumns[entityIndustryCodeNaics2].width = '150px'
      }

      const entityIndustryNameNaics3 = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryNameNaics3"
      );
      if (entityIndustryNameNaics3 > -1) {
        resetcolumns[entityIndustryNameNaics3].hidden = true
        resetcolumns[entityIndustryNameNaics3].width = '550px'
        resetcolumns[entityIndustryNameNaics3].title = translate.t("global.industryNameNAICS3")

      }

      const entityIndustryCodeNaics3 = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryCodeNaics3"
      );
      if (entityIndustryCodeNaics3 > -1) {
        resetcolumns[entityIndustryCodeNaics3].hidden = true
        resetcolumns[entityIndustryCodeNaics3].width = '150px'
      }

      financingDataCompaniesStore.setHomeFinancingListCompaniesPeers(resetcolumns);
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
      data.selectedItems = ObjectUtils.cloneDeep(props.comparePeersList);
      data.initialItems = ObjectUtils.cloneDeep(props.comparePeersList);
      setGridHeight();

      nextTick(() => {
        badgeContainersRef.value = Array.from(document.querySelectorAll('.badge_container'));
        checkWidths();
      });


      await loadGridsData();
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
      try {
        let queryString = getPeersData(filterSettings);

        // Enabling loading
        data.loadGridData = true;
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.company.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];

        nodes.forEach((node: any) => {
          const data = Object.assign({}, node);
          data["@id"] = node.id.replace("/compare_company_lists/", "/compare_companies/");
          data.id = node.id.replace("/compare_company_lists/", "/compare_companies/");
          data.selected = false;

          data.entityContinent = node.entityContinent
          data.entityIndustryCodeNaics2 = node.entityIndustryCode2
          data.entityIndustryNameNaics2 = node.entityIndustryName2

          data.entityIndustryCodeNaics3 = node.entityIndustryCode3
          data.entityIndustryNameNaics3 = node.entityIndustryName3


          parsedData.push(data);
        });
        data.dataPeers = parsedData;
        data.totalSpends = response.data.company.totalCount;
        updateTheSelectedValuesInArray()
        data.loadGridData = false;
        data.loadGridDataFirstCall = false
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.loadGridDataFirstCall = false
        data.loadGridData = false;
      }
    }

    function updateTheSelectedValuesInArray() {
      //Always after a graphql query we need to update the data.dataPeers for the grid
      data.dataPeers.forEach(function (config: any) {
        const getCompany = data.selectedItems.find((x: any) => x.id === config.id)
        if (getCompany) {
          config.selected = true
        } else {
          config.selected = false
        }
      });
    }

    function getNodeEdges() {
      return `
        id
        entityName
        entityCountryName
        entityRegion
        entityIndustryName
        entityIndustryCode        
        entityIndustryCode2
        entityIndustryName2
        entityIndustryCode3        
        entityIndustryName3
        entityContinent
        entityFlagUrl
        entityMediaPath       
        __typename
      `
    }

    function getPeersData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends
      );
      const nodeEdgesValues = getNodeEdges();
      const getEdges = nodeEdgesValues

      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after
          ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
          : ""
        }`;
      const collectionQuery = "collectionQueryCompareCompanyLists"
      const graphqlQuery = `
          {
            company: ${collectionQuery}(
              ${graphqlFilterString ? graphqlFilterString + "," : ""} 
              ${data.globalSearch ? data.globalSearch + "," : ""} 
              order: {${graphqlOrderString}},              
              ${paginationString},              
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
        return 'entityName: \"asc\"';
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
      await fetchdataPeers();
    }

    // *** Watchers ***

    // Spends
    watch(
      () => data.gridColumns,
      () => {
        financingDataCompaniesStore.setHomeFinancingListCompaniesPeers(data.gridColumns);
        fetchdataPeers();
      },
      { deep: true }
    );

    function resetDefaultColumns() {
      data.gridColumns = getgridColumns(true);
    }

    async function setSearchText() {
      filterSettings.paginationSpends = {
        first: 25,
        after: 0,
        skip: 0
      }

      const searchText = {
        searchingText: data.searchCompany
      }

      data.globalSearch = graphqlUtils.convertSearchTextToGraphQL(searchText)
      await loadGridsData();
    }

    function removeCompanyFromGridAndArray(item: any) {
      const index = data.selectedItems.findIndex(x => x.id === item);
      if (index > -1) {
        data.selectedItems.splice(index, 1);
      }
      updateTheSelectedValuesInArray()
      emit('send-selected-items', data.selectedItems);
    }

    function cleanSelectedCompanies() {
      data.selectedItems = [];
      updateTheSelectedValuesInArray()
      emit('send-selected-items', data.selectedItems);
    }

    const sortItems = computed(() => {
      const dataitem = ObjectUtils.cloneDeep(data.selectedItems)
      return dataitem.reverse()
    });


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
      selectAllRow,
      selectRow,
      validateArrays,
      setSearchText,
      removeCompanyFromGridAndArray,
      cleanSelectedCompanies,
      sortItems,
      badgesPeersRef,
      badgeContainersRef,
      checkWidths,
    };
  }
});
</script>
<style scoped>
.widget {
  min-height: auto;
}

.k-grid-header .k-checkbox {
  display: none !important;
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

.form-group input:not(:placeholder-shown)+span {
  left: 5px;
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
  max-height: 150px !important;
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
