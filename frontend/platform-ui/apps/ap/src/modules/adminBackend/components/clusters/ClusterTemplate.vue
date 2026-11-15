<template>
  <div class="page-content-overflow2">
    <section class="page-content">
      <div class="row p-2">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <span
            v-if="statusNotReadyComputed"
            class="px-2 py-1 rounded-xl truncate ml-auto text-capitalize recalc-status-pill"
            :class="statusClass"
            >{{ badgeStatusComputed }}</span
          >
        </div>
      </div>
      <div class="row p-2">
        <div class="col-12">
          <div class="row">
            <div class="col-xl-3 col-lg-12 col-sm-12 d-flex flex-column">
              <span class="text-gray-600 text-base font-semibold">{{
                $t("adminBackend.adminClusters.minimumCompanies")
              }}</span>
              <div class="form-group m-0">
                <label for="limitNumberOfCompanies">
                  <input
                    id="limitNumberOfCompanies"
                    v-model="limitNumberOfCompanies"
                    class="form-control"
                    :class="
                      hasInputErrorsLimitNumberOfCompanies
                        ? 'input-red-border'
                        : ''
                    "
                    type="number"
                    name="limitNumberOfCompanies"
                    min="3"
                    max="100"
                    :placeholder="$t('adminBackend.adminClusters.minAmount')"
                  />
                </label>
              </div>
              <span
                v-if="hasInputErrorsLimitNumberOfCompanies"
                class="error"
                >{{ $t("adminBackend.adminClusters.invalidInput") }}
              </span>
            </div>
            <div class="col-xl-3 col-lg-12 col-sm-12 d-flex flex-column">
              <span class="text-gray-600 text-base font-semibold">{{
                $t("adminBackend.adminClusters.period")
              }}</span>
              <div class="form-group m-0">
                <label for="selectedYears">
                  <input
                    id="selectedYears"
                    v-model="selectedYears"
                    class="form-control"
                    :class="
                      hasInputErrorsSelectedYears ? 'input-red-border' : ''
                    "
                    type="number"
                    name="selectedYears"
                    min="1"
                    max="10"
                    :placeholder="$t('adminBackend.adminClusters.years')"
                  />
                </label>
              </div>
              <span
                v-if="hasInputErrorsSelectedYears"
                class="error"
                >{{ $t("adminBackend.adminClusters.invalidInput") }}
              </span>
            </div>
            <div class="col-xl-3 col-lg-12 col-sm-12 d-flex flex-column">
              <span class="text-gray-600 text-base font-semibold"
                >{{ $t("adminBackend.adminClusters.actualVersion") }}
                {{ currectVersionComputed }}</span
              >
              <div class="form-group m-0">
                <label for="currentClusterTypeLastDate">
                  <input
                    id="currentClusterTypeLastDate"
                    v-model="currentClusterTypeLastDate"
                    class="form-control"
                    type="datetime-local"
                    name="currentClusterTypeLastDate"
                    :disabled="true"
                  /><span>{{ $t("adminBackend.adminClusters.date") }}</span>
                </label>
              </div>
            </div>
            <div
              class="col-xl-3 col-lg-12 col-sm-12 d-flex flex-column align-items-center justify-content-center"
            >
              <button
                id="generate-cluster-btn"
                class="btn btn-primary font-md d-flex align-items-center"
                :disabled="hasInputErrors || generatingCluster"
                @click="generateCluster()"
              >
                <span>{{
                  $t("adminBackend.adminClusters.generateCluster")
                }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="row p-2">
        <CalculumLoading
          v-if="loadExport"
          :modal="false"
        ></CalculumLoading>
        <div
          id="cluster-grid-container"
          class="col-12"
          :class="{ 'bg-blur': loadClusterData }"
        >
          <CalculumGridGraphql
            :key="keyGrids"
            :grid-data="gridData"
            :grid-columns="getCurrentClusterTypeColumns"
            :sortable="true"
            :hide-column-selector="true"
            :disable-blur-efect="true"
            :enabled-pagination="true"
            :allow-export-excel="true"
            :children-columns="false"
            :show-toolbar="true"
            :filterable="false"
            :total="totalCountComputed"
            :skip="filterSettings.paginationSpends.after"
            :take="filterSettings.paginationSpends.first"
            :default-page-size="filterSettings.paginationSpends.first"
            :filter="filterSettings.filterSpends"
            :sort="filterSettings.sortSpends"
            :show-tabs-levels="false"
            :collection-query="'collectionQueryPeerGroupClusters'"
            :selectable="false"
            selectable-ordering="selectableOrdering"
            :for-clusters-unique-values-api="true"
            :cluster-collection-name="collectionNameForQuery"
            :reordering-columns="false"
            @data-change="dataChange"
            @pagechange="pageChangeHandler"
            @reset-default-columns="getCurrentClusterTypeColumns"
            @exportCSV="exportClusterExcel"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { clusterColumnsPeerGroup } from "@/modules/adminBackend/data/clusters/peerGroupStandard/graphqlColumns";
import { clusterColumnsSupplierStandard } from "@/modules/adminBackend/data/clusters/supplierStandard/graphqlColumns";
import { ClustersDataInterface } from "@/modules/adminBackend/types/index";
import { FilterChangeEvent } from "@/types/filterSettings";
import { onBeforeRouteLeave } from "vue-router";
import {
  reactive,
  toRefs,
  onMounted,
  defineComponent,
  computed,
  watch,
  nextTick,
} from "vue";
import { saveExcel } from "@progress/kendo-vue-excel-export";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { translate } from "@/utils/translation";
import { useHomeStore } from '@/stores/home';
import { useAdminBackendStore } from '@/stores/adminBackend'
import { useFinancingDataCompaniesStore } from '@/stores/financingDataCompanies'
import { useSubscribeStore } from '@/stores/subscribe'
import * as cacheGrid from "@/utils/dataGridClear";
import * as clustersRelated from "@/utils/clustersRelated";
import * as globalColumns from "@ada/design-system/data/globalColumns";
import * as graphqlUtils from "@/utils/graphqlUtils";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import { CalculumLoading } from '@ada/design-system'
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";

export default defineComponent({
  name: "Clusters",
  components: {
    CalculumGridGraphql,
    CalculumLoading,
  },
  props: {
    clusterType: { type: String, required: true },
  },
  setup(props, { emit }) {
    const homeStore = useHomeStore();
    const adminBackendStore = useAdminBackendStore();
    const financingDataCompaniesStore = useFinancingDataCompaniesStore();
    const subscribeStore = useSubscribeStore();
    let pendingRequest: any;
    let filterSettings: FilterChangeEvent = {
      //- Suppliers Grid Data
      paginationSuppliers: {
        first: 10,
        after: 0,
        skip: 0,
      },
      filterSuppliers: [],
      sortSuppliers: [
        {
          field: "clusterId",
          dir: "asc",
        },
      ],
      //- Parents Grid Data
      paginationParents: {
        first: 10,
        after: 0,
        skip: 0,
      },
      filterParents: [],
      sortParents: [
        {
          field: "clusterId",
          dir: "asc",
        },
      ],
      //- Spends
      paginationSpends: {
        first: 10,
        after: 0,
        skip: 0,
      },
      filterSpends: [],
      sortSpends: [
        {
          field: "clusterId",
          dir: "asc",
        },
      ],
    };
    //let filterSettings = createFilterSettings();
    const clustersData = reactive<ClustersDataInterface>({
      badgeStatus: clustersRelated.getSpecificClusterStatus(
        props.clusterType,
      ),
      columns: getGridColumns(),
      gridData: [],
      keyGrids: new Date().getUTCMilliseconds(),
      limitNumberOfCompanies: 3,
      loadClusterData: true,
      loadExport: false,
      currentClusterTypeLastDate: clustersRelated.getSpecificClusterLastDate(
        props.clusterType,
      ),
      currentClusterTypeLastVersion:
        clustersRelated.getSpecificClusterLastVersion(props.clusterType)?.toString() || null,
      pendingClusterGenerate: false,
      selectedYears: 5,
      statusNotReady: false,
      totalCount: 0,
      generatingCluster: true,
    });

    const toast = useToast();

    watch(
      () => props.clusterType,
      async () => {  
      // if cluster type changed
      await getClusterInfo();
         
      },
    );

    const { apolloClientResetStore } = useApolloClient();

    onBeforeRouteLeave((to) => {
      //apolloClientResetStore();
      adminBackendStore.setAdminClustersColumnOrder([]);
    });

    const collectionNameForQuery = computed(() => {
      return kendoChartRelated.getClusterType(props.clusterType);
    });

    const getCurrentClusterTypeColumns = computed(() => {
      switch (props.clusterType) {
        case "supplierStandard":
          return clusterColumnsSupplierStandard;
        case "peerGroup":
          return clusterColumnsPeerGroup;
        default:
          return [];
      }
    });

    function resetDefaultColumn() {
      adminBackendStore.setAdminClustersColumnOrder(null);
      clustersData.columns = getGridColumns();
      clustersData.keyGrids++;
    }

    function getGridColumns() {
      const columns: Array<any> = [];
      columns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        columns.push(newConfig);
      });

      let resetColumns = [];
      const gridCache = adminBackendStore.getAdminClustersColumnOrder;
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
      } else {
        // Use cached data
        resetColumns = columns;
      }
      adminBackendStore.setAdminClustersColumnOrder(resetColumns);
      return resetColumns;
    }

    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'clusterId: "asc"';
      }
      return sort
        .map((descriptor) => `${descriptor.field}: "${descriptor.dir}"`)
        .join(", ");
    }

    async function dataChange(filter: any, sort: any) {
      filterSettings.paginationSpends = {
        first: filterSettings.paginationSpends.first,
        after: 0,
        skip: 0,
      };
      filterSettings.filterSpends = filter;
      filterSettings.sortSpends = sort;
      clearTimeout(pendingRequest);
      await fetchPeerClusterData();
      //clustersData.keyGrids++;
    }

    async function pageChangeHandler(event: any) {
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
      await fetchPeerClusterData();
    }

    function getData(event: FilterChangeEvent): string {
      const getEdges = clustersRelated.getClusterNodeEdges(props.clusterType);
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends,
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${
        event.paginationSpends.after
          ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
          : ""
      }`;
     
      const collectionQuery = clustersRelated.getCollectionNameForQuery(
        props.clusterType,
      );

      const lastVersion = clustersRelated.getSpecificClusterLastVersion(
        props.clusterType,
      );

      const graphqlQuery = `
        {
          clusters: ${collectionQuery}(
            order: { ${graphqlOrderString} }
            ${paginationString ? `${paginationString},` : ""}
            clusterVersion: ${Number(lastVersion)}
            ${graphqlFilterString ? `${graphqlFilterString},` : ""}
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

    async function fetchPeerClusterData() {
      let queryString = getData(filterSettings);
      clustersData.loadClusterData = true;

      try {
        const response = await graphqlUtils.getCollectionData(queryString);

        // Check if the response structure is as expected
        if (!response.data) {
          throw new Error("response.data is undefined");
        }
        if (!response.data.clusters) {
          throw new Error("response.data.spends is undefined");
        }
        if (!response.data.clusters.edges) {
          throw new Error("response.data.spends.edges is undefined");
        }

        // Process the nodes
        const nodes = response.data.clusters.edges.map((edge: any) => {
          if (!edge.node) {
            throw new Error("edge.node is undefined");
          }
          return edge.node;
        });

        const parsedData: Array<any> = [];
        nodes.forEach((node: any) => {
          const parsedNode = { ...node };
          parsedData.push(parsedNode);
        });

        clustersData.loadClusterData = false;
        clustersData.totalCount = response.data.clusters.totalCount;
        clustersData.gridData = parsedData;
      } catch (error) {
        if (import.meta.env.DEV) console.error("Error fetching data:", error);
        clustersData.loadClusterData = false;
      }
    }

    async function handleLoadGridData() {
      await apolloClientResetStore();
      await loadGridData();
      
    }

    function generateCluster() {
      clustersData.generatingCluster = true;
      const generateClusterProps = {
        minCompanies: clustersData.limitNumberOfCompanies,
        maxPeriod: clustersData.selectedYears,
        clusterType: props.clusterType,
        callbackSuccess: () => {
          const toast = useToast();
          toast.success(translate.t('adminBackend.adminClusters.noty.success.clusterPendingRequest'));
        },
        callbackError: () => {
          clustersData.generatingCluster = false;
        },
      };

      adminBackendStore.generateCluster(generateClusterProps);
    }

    async function loadGridData() {
      try {
        await fetchPeerClusterData();
      } catch (error) {
        if (import.meta.env.DEV) console.error("**** loadGridData error: ", error);
      }
    }

    const totalCountComputed = computed(() => {
      return clustersData.totalCount;
    });

    onMounted(async () => {
      // Handle synchronous or asynchronous cluster version and status fetching
      clustersData.currentClusterTypeLastVersion =
        clustersRelated.getSpecificClusterLastVersion(props.clusterType)?.toString() || null;
      clustersData.badgeStatus = clustersRelated.getSpecificClusterStatus(
        props.clusterType,
      );

      

      if (
        clustersData.badgeStatus === "pending" ||
        clustersData.badgeStatus === "calculating"
      ) {
        clustersData.statusNotReady = true;
        
      }

      // Await the getClusterInfo async function
      try {
        await getClusterInfo();
      } catch (error) {
        console.error("Error fetching cluster info on mounted:", error);
      }
    });

    function exportClusterExcel() {
      const params = {
        clusterType: props.clusterType,
        callbackSuccess: (callbackSuccessData: any) => {
          clustersData.loadExport = false;

          let newDataArray: any = [];
          callbackSuccessData.forEach((element: any) => {
            delete element["_id"];
            element.companies = element?.companies
              ? element?.companies.join(",")
              : "";
            element.terms = element?.terms ? element.terms.join(",") : "";

            element.clusterId = translate.t(
              `adminBackend.adminClusters.clusterIdTextConversion.type${element.clusterId}`,
            );

            newDataArray.push(element);
          });

          const title =
            "Cluster Data - " + clustersData.currentClusterTypeLastVersion;

          let currentColumns = getCurrentClusterTypeColumns.value;
          saveExcel({
            data: newDataArray,
            fileName: title,
            columns: [...currentColumns, ...globalColumns.clusterTerms],
            filterable: true,
          });
        },
        callbackError: () => {
          clustersData.loadExport = false;
        },
      };
      homeStore.exportClusterData(params);
    }

    function getClusterInfo(): Promise<void> {
      return new Promise((resolve, reject) => {
        const params = {
          callbackSuccess: (callbackSuccessData: any) => {
            try {
              
              // get last cluster date
              clustersData.currentClusterTypeLastDate =
                clustersRelated.getClusterLastDate(
                  props.clusterType,
                  callbackSuccessData,
                );
              // get last cluster version
              clustersData.currentClusterTypeLastVersion =
                clustersRelated.getClusterLastVersion(
                  props.clusterType,
                  callbackSuccessData,
                );

              clustersRelated.saveTheSpecificClusterVersion(
                props.clusterType,
                callbackSuccessData,
              );
              clustersData.generatingCluster = clustersRelated.getClusterStatus(
                props.clusterType,
                callbackSuccessData,
              );


            clustersRelated.updateStatusClusters(callbackSuccessData)


              handleLoadGridData();

              // Resolve the promise once everything is done
              resolve();
            } catch (error) {
              reject(error); // Reject the promise in case of error
            }
          },
          callbackError: () => {
            reject(new Error("Error while fetching cluster info")); // Reject the promise on error
          },
        };

        // Dispatch the action
        financingDataCompaniesStore.getClusterIdForNotificationStatus(params);
      });
    }

   
    watch(
      () => {
        switch (props.clusterType) {
          case "supplierStandard":
            return subscribeStore.getSupplierStandardClusterStatus;
          case "peerGroup":
            return subscribeStore.getPeerStandardClusterStatus;
          default:
            return null;
        }
      },
      (newValue) => {

        switch (newValue) {
          case "pending":
            clustersData.pendingClusterGenerate = true;
            toast.info(translate.t("adminBackend.adminClusters.noty.success.clusterPending"));
            clustersData.statusNotReady = true;
            clustersData.badgeStatus = "pending";
            break;
          case "calculating":
            toast.info(translate.t("adminBackend.adminClusters.noty.success.clusterCalculating"));
            clustersData.statusNotReady = true;
            clustersData.badgeStatus = "calculating";
            break;
          case "ready":
            toast.success(translate.t("adminBackend.adminClusters.noty.success.clusterGenerated"));
            clustersData.statusNotReady = false;
            clustersData.badgeStatus = "ready";
            clustersData.currentClusterTypeLastVersion =
              clustersRelated.getSpecificClusterLastVersion(
                props.clusterType,
              )?.toString() || null;
            (async () => {
              try {
                await getClusterInfo();
              } catch (error) {
                if (import.meta.env.DEV) console.log(error);
              }
              clustersData.generatingCluster = false;
            })();
            break;
          default:
            break;
        }
      },
    );

    /**
     * returns the current version of the cluster
     */
    const currectVersionComputed = computed(() => {
      return clustersData.currentClusterTypeLastVersion;
    });

    /**
     * for the style of the badge while the clsuter is pending or calculating
     */
    const statusClass = computed(() => {
      if (clustersData.badgeStatus === "pending") {
        return "pending-recalculation";
      } else if (clustersData.badgeStatus === "calculating") {
        return "recalculating-in-progress";
      } else {
        return "";
      }
    });

    /**
     * return the status of the cluster, text
     */
    const badgeStatusComputed = computed(() => {
      return clustersData.badgeStatus;
    });

    /**
     * return the status of the cluster, boolean
     */
    const statusNotReadyComputed = computed(() => {
      return clustersData.statusNotReady;
    });

    /**
     * Input validation
     */
    const hasInputErrorsLimitNumberOfCompanies = computed(() => {
      if (
        clustersData.limitNumberOfCompanies < 1 ||
        clustersData.limitNumberOfCompanies > 500
      ) {
        return true;
      }
      return false;
    });

    /**
     * Input validation
     */
    const hasInputErrorsSelectedYears = computed(() => {
      if (clustersData.selectedYears < 1 || clustersData.selectedYears > 10) {
        return true;
      }
      return false;
    });

    /**
     * Input validation checks if contains errors
     */
    const hasInputErrors = computed(() => {
      if (clustersData.selectedYears < 1 || clustersData.selectedYears > 10) {
        return true;
      }

      if (
        clustersData.limitNumberOfCompanies < 1 ||
        clustersData.limitNumberOfCompanies > 500
      ) {
        return true;
      }
      return false;
    });

    return {
      ...toRefs(clustersData),
      badgeStatusComputed,
      clusterColumnsPeerGroup,
      clusterColumnsSupplierStandard,
      collectionNameForQuery,
      currectVersionComputed,
      dataChange,
      exportClusterExcel,
      filterSettings,
      generateCluster,
      getCurrentClusterTypeColumns,      
      hasInputErrors,
      hasInputErrorsLimitNumberOfCompanies,
      hasInputErrorsSelectedYears,
      loadGridData,
      pageChangeHandler,
      resetDefaultColumn,
      statusClass,
      statusNotReadyComputed,
      totalCountComputed,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

span.error {
  color: $color-error-500;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}

@media screen and (min-width: 1200px) and (max-width: 1280px) {
  #generate-cluster-btn {
    font-size: 0.875rem;
  }
}
</style>
