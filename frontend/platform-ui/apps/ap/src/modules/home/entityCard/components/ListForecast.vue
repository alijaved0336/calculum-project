<template>
<div class="row p-0" v-if="(!inRecalculation && !patchGrid) || treeView">
  <CalculumLoading v-if="loadExport" :modal="true"></CalculumLoading>
  <div class="col-12 p-0" :class="{ 'bg-blur': (loadSpends) }">
    <CalculumGrid :allowExportExcel="false" :editList="true" :enabledPagination="true" :entityCard="true" :gridColumns="gridColumnsSpends" :gridData="dataSpends" :gridHeight="gridHeightComputed" :headerscontrollers="false" :key="keySpends" :reorderingColumns="true" :rowColors="true" :selectable="true" :selectableOrdering="true" :defaultPageSize="defaultPageSize" :targetOperation="'forecast'" @value-changed="valueChanged" @selectAllRow="selectAllRow" @selectRow="selectRow" @sendPaginationSize="pagechange" @reset-default-columns="resetDefaultColumns">   </CalculumGrid>
  </div>
</div>
</template>

<script lang="ts">
import { isNullOrUndefined } from "@/utils";
import {  
  foreCastGridColumns
} from "../data/graphqlColums";
import { FilterChangeEvent } from "@/types/filterSettings";
import { Grid } from "@progress/kendo-vue-grid";
import { onBeforeRouteLeave } from "vue-router";
import { reactive, toRefs, watch, ref, onMounted, defineComponent, computed } from "vue";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { translate } from "@/utils/translation";
import { useEntityCardStore } from '@/stores/entityCard';
import { useUserStore } from '@/stores/user';
import { useAnalyzeStore } from '@/stores/analyze';
import * as cacheGrid from "@/utils/dataGridClear";
import * as graphqlUtils from "@/utils/graphqlUtils";
import { CalculumLoading } from '@ada/design-system'
import CalculumSetTargetEditProgram from "@/modules/components/CalculumSetTargetEditProgram.vue";
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import { useToast } from 'vue-toastification';
import useApolloClient from "@/services/graphql/useApolloClient";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import useSpendFile from "@/composables/useSpendFile";
import { useUser } from "@/composables";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import useCompany from "@/composables/useCompany"
import { useAppStore } from '@/stores/app';
import { reformatColumnsData } from "@/modules/components/utils/utilsColumnsFilter";
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";
import * as HomeAPI from "@/modules/home/api";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import * as formatData from "@/utils/FormatData";
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'

function renameColumn(cols: any[], field: string, title: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].title = title;
}
function setCellTemplate(cols: any[], field: string, cell: string): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].cell = cell;
}
function setColumnHidden(cols: any[], field: string, hidden: boolean = true): void {
  const idx = cols.findIndex((x: any) => x.field === field);
  if (idx > -1) cols[idx].hidden = hidden;
}

export default defineComponent({
  name: "ListForecast",
  components: {    
    CalculumLoading,
    CalculumSetTargetEditProgram,
    Grid,
    GridSkeleton,    
    CalculumGrid
  },
  props: {
    selectedProgramId: { type: String, required: true },
    companyType: { type: String, required: true },
    entityUuid: { type: String, required: true },
    hasFinancing: { type: Boolean, required: true },
    hasHarmonization: { type: Boolean, required: true },
    programInrecalculating: { type: Boolean, required: false, default: false },
    isSelectable: { type: Boolean, required: false, default: true },
    selectedTabIndex: { type: Number, required: true, default: 0 },
    allSpendsTab: { type: Boolean, required: true, default: false },
    inRecalculation: { type: Boolean, required: true, default: false },
    patchGrid: { type: Boolean, required: true, default: false },
    treeView: { type: Boolean, required: false, default: false },
    showOptions: { type: Boolean, required: false, default: false },
    isForeCast: { type: Boolean, required: false, default: false },
    forecastVolume: { type: Number, required: false, default: 0 },
    potentialTheme: { type: Boolean, required: false, default: false }
  },
  emits: ["change-data", "select-all-row", "select-row", "send-data-spends", "send-filters", 'remove-plan-suppliers',"send-forecast"],
  setup(props, { emit }) {
    const entityCardStore = useEntityCardStore();
    const userStore = useUserStore();
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid);
    const payOnTermsIsAllowed = computed(() => userStore.getShowPayOnTerms);
    const analyzeStore = useAnalyzeStore();
    const { useFeatureScfStrategy, isPilotAccount, useFeatureVirtualCard, useFeatureSupplierStandard, useFeaturePeerGroupStandard } = useUser();
    const { usevCardGroupsEnabled } = useCompany()
    const toast = useToast()
    const appStore = useAppStore();
    const globalFiltersStore = useGlobalFiltersStore();

    const { spendFileVersionActiveId } = useSpendFile();
    const defaultPageSize = ref(5)

    let dataSource = ref(null);
    let total = ref(0);
    let loader = ref(false);
    let pendingRequest: any;
    let currencyRate: number = appStore.getCurrencyAmount;
    let setDisabled = false;

    let filterSettings: FilterChangeEvent = {
      //- Suppliers Grid Data
      paginationSuppliers: {
        first: 5,
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
        first: 5,
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
        first: 500,
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

    interface DataInterface {
      loadSpends: boolean;
      dataSpends: Array<any>;
      totalSpends: number;
      keySpends: number;
      gridColumnsSpends: Array<any>;
      gridHeight: string;
      toExport: Array<any>;
      loadExport: boolean;
      columnsToExport: Array<any>;
      customHeaders: any;
      selectedItems: Array<any>;
      displayModelForHarmonization: boolean;
      displayModelForMoveBetween: boolean;
      displayRemovePLan: boolean;
      removePlanData: { entityName: string, planName: string, phaseName: string, key: string | number, value: string }
      levelHarmonizationFromGrid: string;
      levelGridFromGrid: string;
      modalTarget: boolean;
      targetAmount: number;
      myCurrentObjectForTargetBulkValues: { key: string, value: string, levelOfGrid: string },
      isModalForClearTargetBulkDisplaying: boolean,
      applySelectedEntitiesBulkTargetButtonClicked: boolean,
      totalsBycolumnsSpends: any
    }

    const data = reactive<DataInterface>({
      loadSpends: false,
      dataSpends: [],
      totalSpends: 0,
      keySpends: new Date().getUTCMilliseconds(),
      gridColumnsSpends: getGridColumnsSpends(),
      gridHeight: "auto",
      toExport: [],
      loadExport: false,
      columnsToExport: [],
      customHeaders: [],
      selectedItems: [],
      displayModelForHarmonization: false,
      displayModelForMoveBetween: false,
      displayRemovePLan: false,
      removePlanData: { entityName: '', planName: '', phaseName: '', key: '', value: '' },
      levelHarmonizationFromGrid: "",
      levelGridFromGrid: "",
      modalTarget: false,
      targetAmount: 0,
      myCurrentObjectForTargetBulkValues: { key: '', value: '', levelOfGrid: '' },
      isModalForClearTargetBulkDisplaying: false,
      applySelectedEntitiesBulkTargetButtonClicked: false,
      totalsBycolumnsSpends: []
    });

    /** Start edition */

    function selectAllRow(rowData: any, checked: boolean) {

      rowData.forEach(function (config: any) {
        const index = data.dataSpends.findIndex(x => x.uuid === config.uuid);
        data.dataSpends[index].selected = checked;
        data.selectedItems.push(data.dataSpends[index]);
      });
      data.selectedItems = []
      data.selectedItems = checked ? data.selectedItems : [];
      emit("select-all-row", rowData, data.selectedItems, checked);
    }

    function selectRow(rowData: any) {
      data.selectedItems = [];
      if (rowData.length > 0) {
        data.selectedItems = rowData;
      }

      emit("select-row", data.selectedItems);
    }


    // *** Entity ***
    const { entitySelectedTrackingNumber } = useEntity();

    // Update grids after entity change
    watch(entitySelectedTrackingNumber, () => {      
      loadGridsData({ invalidateCache: true });
    });

    // *** END Entity ***

    // *** Apollo Client ***

    const { apolloClientResetStore } = useApolloClient();

    // *** END Apollo Client ***

    window.onresize = () => {
      setGridHeight();
    };

    onBeforeRouteLeave(async to => {
      apolloClientResetStore()
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

    function applyStrategyColumnsFromCache(cols: any[], gridCache: any): void {
      if (isNullOrUndefined(gridCache)) {
        if (props.selectedProgramId === "" || props.selectedProgramId === null || props.selectedProgramId === undefined) {
          const modalPaymentTerms = cols.findIndex((x: any) => x.field === "modalPaymentTerms");
          //change field to actualPaymentTerms
          if (modalPaymentTerms > -1) {
            cols.splice(modalPaymentTerms, 1);
          }
        } else {
          //get index of cashDiscounts
          const cashDiscounts = cols.findIndex((x: any) => x.field === "cashDiscounts");
          //now add the three fields after the index of cashDiscounts
          if (cashDiscounts > -1) {
            let newFields = [
              {
                // AB#19950: Opportunity and Target merged into one column. modelPaymentTerms is
                // the backend's coalesce(target_payment_terms, model_payment_terms).
                field: "modelPaymentTerms",
                title: translate.t("home.analyze.table.paymentTermsOpportunity"),
                width: "150px",
                allowHide: true,
                hidden: false,
                filter: "numeric",
                resizable: true,
                cell: "decimalsTemplate"
              },
              {
                field: "modelCashFlow",
                title: translate.t("home.analyze.table.potentialCashFlow"),
                width: "150px",
                allowHide: true,
                hidden: false,
                filter: "numeric",
                resizable: true,
                className: "text-right",
                cell: "moneyTemplate"
              }
            ];
            cols.splice(cashDiscounts + 1, 0, ...newFields);
          }
        }
        setColumnHidden(cols, 'entitySupplierParentGroupMaxStrategy');
        setColumnHidden(cols, 'entityIndustryRegionStandardStrategy');
        setColumnHidden(cols, 'entitySupplierStandardStrategy');
        setColumnHidden(cols, 'entityPeerGroupAverageStrategy');
        setColumnHidden(cols, 'scfGroupStandardStrategy');
        setColumnHidden(cols, 'financingStrategy');
        setColumnHidden(cols, 'discountConversionStrategy');
        setColumnHidden(cols, 'buyerStandardStrategy');
        setColumnHidden(cols, 'entityRegulatoryTermsStrategy');
        setColumnHidden(cols, 'entityRegulatoryTermsStrategyModality');
        setColumnHidden(cols, 'buyerCountrySupplier');
        setColumnHidden(cols, 'currencyCode', false);
      }
    }
    function applyCompanyTypeColumns(cols: any[]): void {
      if (props.companyType === "supplier") {
        const spendCountsTitle = translate.t("home.analyze.table.numberOfSpends");
        renameColumn(cols, 'spendCounts', spendCountsTitle);
      }
      if (props.companyType === "parent") {
        renameColumn(cols, 'entityName', translate.t("home.analyze.table.supplierName"));
        renameColumn(cols, 'entitySupplierLeverageLevel', translate.t("home.analyze.table.parentLeverage"));
        renameColumn(cols, 'spendCounts', translate.t("home.analyze.table.numberOfSuppliers"));
        const entityOriginalName = cols.findIndex((x: any) => x.field === "entityOriginalName");
        if (entityOriginalName > -1) { cols.splice(entityOriginalName, 1); }
        const entityExternalId = cols.findIndex((x: any) => x.field === "entityExternalId");
        if (entityExternalId > -1) { cols.splice(entityExternalId, 1); }
        const parentName = cols.findIndex((x: any) => x.field === "parentName");
        if (parentName > -1) { cols.splice(parentName, 1); }
      }
    }
    function getGridColumnsSpends(resetColumnsFlag: boolean = false): Array<any> {
      
      let columnsToParse = foreCastGridColumns      
      
      const columns: Array<any> = [];
      columnsToParse.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);

        if  (props.companyType === "parent" && props.isForeCast && (newConfig.field === "modelPaymentTerms" || newConfig.field === "termsWithoutCashDiscount") ) {
          newConfig.width = '225px'
        }

        if  (props.companyType === "parent" && props.isForeCast && newConfig.field === "contractualPaymentTermsWithoutCashDiscounts"  ) {
          newConfig.width = '240px'
        }

        if  (props.companyType === "parent" && props.isForeCast && newConfig.field === "forecastVolume" ) {
          newConfig.width = '175px'          
        }

        if  (props.companyType !== "parent" && props.isForeCast && (newConfig.field === "parentName" || newConfig.field === "buyerName")) {
          newConfig.width = '205px'
        }

        if  (props.companyType !== "parent" && props.isForeCast && newConfig.field === "forecastVolume" ) {
          newConfig.width = '195px'          
        }

        //- Replace the custom columns and footer cells

        if (newConfig.field === 'modelPaymentTerms') {
          newConfig.cell = 'decimalsTemplate'
          newConfig.footerCell = 'weightAvgRoundSummaryNoneDecimalsTemplate'
        }

        if (newConfig.field === 'contractualPaymentTermsWithoutCashDiscounts') {
          newConfig.cell = 'decimalsTemplate'
          newConfig.footerCell = 'weightAvgRoundSummaryNoneDecimalsTemplate'
        }

        if (newConfig.field === 'termsWithoutCashDiscount') {
          newConfig.cell = 'moneyTemplateRound'
          newConfig.footerCell = 'weightAvgRoundSummaryNoneDecimalsTemplate'
        }

        if (newConfig.field === 'volume') {
          newConfig.cell = 'moneyTemplate'
          newConfig.footerCell = 'moneyRoundSummaryTemplate'
          newConfig.footerClassName = 'text-right'
        }

        if (newConfig.field === 'forecastVolume') {
          newConfig.cell = 'moneyTemplate'
          newConfig.footerCell = 'moneyRoundSummaryTemplate'
          newConfig.footerClassName = 'text-right'
        }

        if (newConfig.field === 'forecastValue') {          
          newConfig.footerCell = 'moneyRoundSummaryTemplate'
          newConfig.footerClassName = 'text-right'
        }

        columns.push(newConfig);
      });


      const gridCache = (!resetColumnsFlag && props.isForeCast) ? (entityCardStore.getEntityListforecast ?? []) : [];
      let resetColumns = (gridCache.length && JSON.stringify(columns) !== JSON.stringify(gridCache))
        ? cacheGrid.clearCache(columns, gridCache)
        : columns;

      setColumnHidden(resetColumns, 'programApplied');

      if (isPilotAccount()) {
        setCellTemplate(resetColumns, 'parentName', 'restrictModalEntitySupplier');
      }

      if (useFeatureVirtualCard.value && usevCardGroupsEnabled.value) {
        resetColumns = kendoChartRelated.showVCardColumnsRelated(resetColumns);
      } else {
        resetColumns = kendoChartRelated.removeVCardColumnsRelated(resetColumns);
      }


      applyStrategyColumnsFromCache(resetColumns, gridCache);


      //* Reset some values or delete from array

      const capturedCashDiscount = resetColumns.findIndex(
        (x: any) => x.field === "capturedCashDiscount"
      );

      if (capturedCashDiscount > -1) {
        resetColumns.splice(capturedCashDiscount, 1);
      }

      renameColumn(resetColumns, 'financings', translate.t('home.analyze.table.earlyPaymentRateColumn'));

      applyCompanyTypeColumns(resetColumns);

      const disabledColumn = resetColumns.findIndex(
        (x: any) => x.field === "disabled"
      );
      if (disabledColumn > -1) {
        resetColumns.splice(disabledColumn, 1);
      }

      resetColumns = cacheGrid.removeFinancingRelatedColumns(
        resetColumns,
        props.hasFinancing
      );
      resetColumns = cacheGrid.removeHarmonizationRelatedColumns(
        resetColumns,
        props.hasHarmonization
      );
      if (props.isSelectable) {
        resetColumns = cacheGrid.removescfGroupStandardStrategy(
          resetColumns,
          useFeatureScfStrategy()
        );
        resetColumns = cacheGrid.removeSupplierStandard2Strategy(
          resetColumns,
          useFeatureSupplierStandard.value
        );
        resetColumns = cacheGrid.removePeerGroupStandard2Strategy(
          resetColumns,
          useFeaturePeerGroupStandard.value
        );
      }

      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }
      if (!payOnTermsIsAllowed.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'contractualPaymentTermsWithoutCashDiscounts');
      }
      entityCardStore.setEntityListforecast(resetColumns);

      return resetColumns;
    }

    watch(hideAverageDaysPaid, () => {
      data.gridColumnsSpends = getGridColumnsSpends(true);
    });

    watch(payOnTermsIsAllowed, () => {
      data.gridColumnsSpends = getGridColumnsSpends(true);
    });

    watch(
      () => data.gridColumnsSpends,
      () => {
        entityCardStore.setEntityListforecast(data.gridColumnsSpends)                
      },
      { deep: true }
    );

    // ? - Move to common util file
    async function loadGridsData(
      options?: Partial<{
        invalidateCache: boolean;
      }>
    ) {
      try {        
        data.loadExport = false;
        await fetchDataSpends(true);
      } catch (error) {
        if (import.meta.env.DEV) console.error("** (loadGridsData)", error);
      }
    }

    onMounted(async () => {
      setGridHeight();
      await loadGridsData();
    });

    //- get spends Data
    async function fetchDataSpends(callTotalsValues: boolean = false) {
      if (props.selectedProgramId && spendFileVersionActiveId.value) {
        if (!isProgramSfvConsistent(props.selectedProgramId, spendFileVersionActiveId.value)) {
          return; // programs not loaded yet, watcher on getAllPrograms will retry
        }
      }
      try {
        let queryString = getSpendsData(filterSettings);

        // Enabling loading
        data.loadSpends = true;
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.spends.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];

        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data);
          datas.level = "supplier";
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
          datas.selected = true
          parsedData.push(datas);
        });
        data.dataSpends = reformatColumnsData("entityRegulatoryTermsStrategyModality",parsedData);        
        
        
        if (props.isSelectable) {
          data.dataSpends.forEach(function (datas: any) {
            data.selectedItems.push(datas)
          })
          emit("select-all-row", data.dataSpends, data.selectedItems, true)
        }
        

        emit('send-filters', filterSettings.filterSpends)
        emit('send-data-spends', data.dataSpends)
        data.totalSpends = response.data.spends.totalCount;
        data.loadSpends = false;

        if (callTotalsValues && props.isForeCast) {
          data.totalsBycolumnsSpends = []
          callTotalDataByLevel()
        }

      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        data.loadSpends = false;
      }
    }


      async function callTotalDataByLevel() {
        const totals = await fetchTotalsbyLevel("spends", "program", filterSettings.filterSpends)
        if (totals !== null) {
          data.totalsBycolumnsSpends = totals
          data.totalSpends = totals.totalCount
        }
      
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
          level, field: '', currencyRate, targetProgramUuid: props.selectedProgramId ?? null, targetPlanUuid: null, targetPhaseUuid: null, section, globalFilter: formatData.convertFiltersToREST(
            globalFiltersStore.getFiltersApplied
          ), activeSpendFileVersion: spendFileVersionActiveId.value, targetOperation: null, summaryOperation: "summary", telerikFilter, summary: setColumnsSummary(), fullDisabled: false, companyType: props.companyType, entityUuid: props.entityUuid
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


     function setColumnsSummary() {
      let getActiveColumnsByLevel: Array<any> = [];
      getActiveColumnsByLevel = totalColumnsUtils.getActiveColumnsArray(
        data.gridColumnsSpends
      );
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


    const gridHeightComputed = computed(() => {
      if (defaultPageSize.value === 5) {
        return 'auto';
      } 

      return '600px';
    });

    function getNodeEdges() {
      if (props.selectedProgramId) {
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
        harmonizations
        harmColors
        hasDynamic
        harmonizationLevels
        financings
        financingColors
        negotiationStatusCodes
        configUuid
        vCardColor
        isPilot\n
    `;
      } else {
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
        negotiationStatusCodes
        isPilot\n
      `;
      }
    }


    function getSpendsData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends
      );

      const isPotential = props.potentialTheme ? 'targetEntityType: "potential"' : "";
      const nodeEdgesValues = getNodeEdges();
      const getEdges = graphqlUtils.getActiveColumns(
        data.gridColumnsSpends,
        nodeEdgesValues
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after
        ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
        : ""
        }`;
      const collectionQuery = props.selectedProgramId
        ? "collectionQueryProgramListSpends"
        : "collectionQueryAnalyzeListSpends";
      const filterbyEntity =
        props.companyType === "supplier" || props.companyType === "potential-supplier"
          ? `entityUuid: "${props.entityUuid}"`
          : `parentUuid: "${props.entityUuid}"`;
      const graphqlQuery = `
          {
            spends: ${collectionQuery}(
              ${props.selectedProgramId
          ? `targetProgramUuid: "${props.selectedProgramId}", fullDisabled: ${setDisabled},`
          : ""
        }
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              ${graphqlFilterString ? graphqlFilterString + "," : ""}
              order: {${graphqlOrderString}},
              currencyRate: ${currencyRate},
              ${filterbyEntity}
              ${paginationString},
              ${isPotential}
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

    watch(
      () => analyzeStore.getAllPrograms,
      (programs) => {
        if (programs && programs.length > 0 && props.selectedProgramId) {
          fetchDataSpends();
        }
      }
    );

    function resetDefaultColumns() {

      console.log("** resetDefaultColumns")
      entityCardStore.setEntityListforecast(null)      
      data.gridColumnsSpends = getGridColumnsSpends(true)
      data.keySpends++
    }

    //* Forecast methods


    function valueChanged(objValues: any) {
      data.dataSpends = data.dataSpends.map((item: any) => {
        if (item.uuid === objValues.uuid) {
          const newValueCalculated = objValues.forecastValue;
          item.forecastValue = newValueCalculated
          item.forecastVolume = Number.isNaN(newValueCalculated) ? 0 : Math.round((newValueCalculated + item.volume) * 10) / 10;
        }
        return item;
      });
      updateSummary()
    }

    watch (
      () => props.forecastVolume,
      (newValue) => {
        data.dataSpends = data.dataSpends.map((item: any) => {

          if (item.selected === true) {
            if (newValue === null) {
              item.forecastValue = null;
              item.forecastVolume = null;
            } else {
              const isValidVolume = item.volume != null && item.volume !== 0;
              const isValidPercentage = newValue !== 0;

              if (!isValidVolume || !isValidPercentage) {
                item.forecastValue = 0;
                item.forecastVolume = 0;
              } else {
                const newValueCalculated = Math.round((item.volume * newValue) / 100 * 10) / 10;
                item.forecastValue = newValueCalculated;
                item.forecastVolume = Number.isNaN(newValueCalculated) ? 0 : Math.round((newValueCalculated + item.volume) * 10) / 10;
              }
            }
          }
          return item;          
        });
        // data.keySpends++
        updateSummary()        
      }
    );

    function updateSummary() {
      if (data.totalsBycolumnsSpends?.sum) {
        const summedValues = data.dataSpends.reduce(
          (acc: any, item: any) => ({
            forecastValue: (acc.forecastValue || 0) + (item.forecastValue || 0),
            forecastVolume: (acc.forecastVolume || 0) + (item.forecastVolume || 0)
          }),
          { forecastValue: 0, forecastVolume: 0 }
        );
        data.totalsBycolumnsSpends.sum.forecastValue = Math.round(summedValues.forecastValue * 10) / 10;
        data.totalsBycolumnsSpends.sum.forecastVolume = Math.round(summedValues.forecastVolume * 10) / 10;
        emit('send-forecast',data.totalsBycolumnsSpends.sum.forecastVolume)
      }
    }

    function pagechange(e: any) {
      defaultPageSize.value = e
    }

    return {
      ...toRefs(data),      
      dataSource,
      filterSettings,
      kendoChartRelated,
      loader,      
      resetDefaultColumns,
      selectAllRow,
      selectRow,      
      total,
      gridHeightComputed,
      valueChanged,
      defaultPageSize,
      pagechange
    };
  }
});
</script>
<style scoped>
.widget {
  min-height: auto;
}
</style>
