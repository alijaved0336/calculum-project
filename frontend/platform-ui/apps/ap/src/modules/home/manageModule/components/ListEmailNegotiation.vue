<template>
<div class="row">
  <div class="col-12" :class="{'bg-blur': (loadSpends)}">
    <CalculumGridGraphql :gridData="dataSpends" :gridColumns="gridColumnsSpends" :gridHeight="'auto'" :sortable="true" :enabledPagination="true" :allowExportExcel="false" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="false" :collectionQuery="'collectionQueryEmailNegotiationLists'" :selectedProgramId="selectedProgramId" :editList="false" :selectable="false" :key="keySpends" :levelOfGrid="'spends'" :section="'emailNegotiation'" :allowExclude="false" @dataChange="dataChange" @pagechange="pageChangeHandler"></CalculumGridGraphql>
  </div>
</div>
</template>

<script lang="ts">
import { reactive, toRefs, watch, ref, onMounted, defineComponent } from "vue";

import { FilterChangeEvent } from "@/types/filterSettings";
import { onBeforeRouteLeave } from "vue-router";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { translate } from "@/utils/translation";
import * as graphqlUtils from "@/utils/graphqlUtils";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import useApolloClient from "@/services/graphql/useApolloClient";
import useSpendFile from "@/composables/useSpendFile";
import { columnsEmailNegotiations } from "../data";
import { ArrayUtils, isNullOrUndefined } from "@/utils";
import { useAppStore } from "@/stores/app";
import { useConsistentFetch } from '@/composables/useConsistentFetch';

  export default defineComponent({
    name: 'ListEmailNegotiation',
    components: {
      CalculumGridGraphql,
      GridSkeleton
    },
    props: {
      selectedProgramId: { type: String, required: true, default: null },
      planSelectedId: { type: String, required: true, default: null }
    },
    emits: ['change-data', 'select-all-row', 'select-row'],
    setup(props, { emit }) {
      
      const {
        spendFileVersionActiveId
      } = useSpendFile()
  
      let dataSource = ref(null);
      let total = ref(0);
      let loader = ref(false);
      let pendingRequest: any;
      let currencyRate: number = useAppStore().getCurrencyAmount;
            
      let filterSettings: FilterChangeEvent = {
      paginationSuppliers: {
        first: 25,
        after: 0,
        skip: 0
      },
      filterSuppliers: [],
      sortSuppliers: [
        {
          field: 'entityName',
          dir: 'asc'
        }
      ],
      paginationParents: {
        first: 25,
        after: 0,
        skip: 0
      },
      filterParents: [],
      sortParents: [
        {
          field: 'entityName',
          dir: 'asc'
        }
      ],
      paginationSpends: {
        first: 25,
        after: 0,
        skip: 0
      },
      filterSpends: [],
      sortSpends: [
        {
          field: 'planName',
          dir: 'asc'
        }
      ]
    };  
      
      interface DataInterface {
        loadSpends: boolean,
        dataSpends: Array<any>,
        totalSpends: number,        
        keySpends: number,
        gridColumnsSpends: Array<any>,
        gridHeight: string,
        toExport: Array<any>,
        loadExport: boolean,
        columnsToExport: Array<any>,
        customHeaders: any,
        selectedItems: Array<any>,
        displayModelForHarmonization: boolean,
        levelHarmonizationFromGrid: string
        levelGridFromGrid: string,
        modalTarget: boolean,
        targetAmount: number
      }
  
      const data = reactive<DataInterface>({
        loadSpends: false,
        dataSpends: [],
        totalSpends: 0,
        keySpends: new Date().getUTCMilliseconds(),
        gridColumnsSpends: columnsEmailNegotiations,
        gridHeight: 'auto',
        toExport: [],
        loadExport: false,
        columnsToExport: [],
        customHeaders: [],
        selectedItems: [],
        displayModelForHarmonization: false,
        levelHarmonizationFromGrid: '',
        levelGridFromGrid: '',
        modalTarget: false,
        targetAmount: 0
      })


      // *** Apollo Client ***
  
      const { apolloClientResetStore } = useApolloClient()
  
      // *** END Apollo Client ***
  
      window.onresize = () => {
        setGridHeight()
      }
  
      onBeforeRouteLeave(async (to) => {
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
       
  
      // ? - Move to common util file
      async function loadGridsData(options?: Partial<{
        invalidateCache: boolean;
      }>) {
        try {
          // Invalidate graphql cache
          if (options?.invalidateCache) {
            await apolloClientResetStore()
          }
          data.loadExport = false
          await fetchDataSpends();
          
        } catch (error) {
          if (import.meta.env.DEV) console.error('** (loadGridsData)', error);
        }
      }
  
      onMounted(async () => {
        setGridHeight()
        // Data loading is handled by useConsistentFetch (immediate watch).
      });
  
      async function pageChangeHandler(event: any) {
        if (event.event.value) {
          filterSettings.paginationSpends = { first: event.event.value, after: 0, skip: 0 };
        } else {
          filterSettings.paginationSpends = { first: event.page.take, after: event.page.skip, skip: event.page.skip };
        }
        await fetchDataSpends();
      } 

      function convertSortToGraphQL(sort: SortDescriptor[]): string {
        if (sort.length === 0) {
          return 'planName: \"asc\"';
        }
        return sort
          .map(descriptor => `${descriptor.field}: "${descriptor.dir}"`)
          .join(", ");
      }
      
      //- get spends Data
      async function fetchDataSpends() {
        try {
          let queryString = getSpendsData(filterSettings);
        
          // Enabling loading
          data.loadSpends = true    
          const response = await graphqlUtils.getCollectionData(queryString)  
          const nodes = response.data.spends.edges.map((edge: any) => edge.node);
          data.dataSpends = nodes;  
          data.totalSpends = response.data.spends.totalCount;  
          data.loadSpends = false
        }
        // 
        catch (error) {
          if (import.meta.env.DEV) console.error('Data fetching failed:', error);  
          data.loadSpends = false
        }
      }
  
      function getSpendsData(event: FilterChangeEvent): string {
        const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(event.filterSpends);
        const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"` : ''}`;
        const graphqlOrderString = convertSortToGraphQL(event.sortSpends);

        const queryString = `
          {
            spends: collectionQueryEmailNegotiationLists(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}"
              targetProgramUuid: "${props.selectedProgramId}"
              order: {${graphqlOrderString}},
              ${graphqlFilterString ? graphqlFilterString + ',' : ''}
              ${paginationString},              
              ${
                !isNullOrUndefined(props.planSelectedId)
                  ? 'targetPlanUuid: "' + props.planSelectedId + '"'
                  : ""
              }              
              currencyRate: ${currencyRate}
            ) {
              totalCount
              edges {
                cursor
                node {
                  contactAttempts
                  countryName
                  emailNegotiationUuid
                  emailStatus
                  phaseName
                  planName
                  recipientEmail
                  recipientName
                  resolutionType
                  sentDate
                  spendLines
                  supplierName
                }
                __typename
              }
              __typename
            }
          }
      `;        
        return queryString      
      }
  
      async function dataChange(filter: any, sort: any) {
        filterSettings.paginationSpends = { first: filterSettings.paginationSpends.first, after: 0, skip: 0 };
        filterSettings.filterSpends = filter;
        filterSettings.sortSpends = sort;
        clearTimeout(pendingRequest);
        await fetchDataSpends();        
      }
  
      // *** Watchers ***
  
     
      useConsistentFetch([fetchDataSpends], () => props.selectedProgramId, () => spendFileVersionActiveId.value);

      return {
        ...toRefs(data),
        ArrayUtils,
        dataChange,
        dataSource,
        filterSettings,
        loader,
        loadingData: false,
        pageChangeHandler,
        total
      }
    }
  })
  </script>
