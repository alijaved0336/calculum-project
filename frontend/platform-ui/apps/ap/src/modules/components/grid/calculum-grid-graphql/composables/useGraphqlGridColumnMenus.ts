import { computed, reactive, ref, toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { filterGroupByField } from "@progress/kendo-vue-grid";
import { convertFiltersToREST } from "@/utils/FormatData";
import * as graphqlUtils from "@/utils/graphqlUtils";
import { reformatColumnsData } from "@/modules/components/utils/utilsColumnsFilter";
import { useAppStore } from "@/stores/app";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useHomeStore } from "@/stores/home";
import type { GraphqlGridColumn } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridColumnCache";
import type { GraphqlGridColumnMenuFilter } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridSelection";
import {
  buildGraphqlGridUniqueValuesParams,
  convertListUniqueValues,
  getSearchChangeFlags,
  isColumnFilterActive,
  isStaleSearchResponse,
  needsUniqueValuesCountRefresh,
  resolveDataForColumns,
  shouldFallBackToUnfilteredValues,
  shouldSkipUniqueValuesListFetch,
  stampColumnHeaderFilterClass,
  uniqueValuesActiveSpendFileVersion,
  uniqueValuesTargetOperation,
  unfilteredUniqueValuesFallbackParams,
  type GraphqlGridColumnFilters,
  type GraphqlGridColumnSearchQuery,
} from "@/modules/components/grid/calculum-grid-graphql/composables/graphqlGridColumnMenuHelpers";

export type GraphqlGridColumnMenusEmit = (
  event:
    | "grid-include-pilot"
    | "grid-exclude"
    | "grid-approach"
    | "grid-remove"
    | "show-target-modal"
    | "show-target-clear-modal"
    | "show-supplier-standard-modal"
    | "show-peer-group-standard-modal"
    | "grid-add-vgroup"
    | "grid-add-group"
    | "show-harmonization-modal"
    | "show-move-between-modal"
    | "show-remove-plan-modal"
    | "grid-match-remove"
    | "negotiation-status-changed",
  ...args: unknown[]
) => void;

export type GraphqlGridShowValuesByColumnPayload = {
  column: string;
  cantRecords: number;
  fromRecord: number;
  searchQuery?: GraphqlGridColumnSearchQuery;
  resetData?: boolean;
};

export interface UseGraphqlGridColumnMenusOptions {
  section: MaybeRefOrGetter<string>;
  levelOfGrid: MaybeRefOrGetter<string>;
  forClustersUniqueValuesApi: MaybeRefOrGetter<boolean>;
  summaryOperation: MaybeRefOrGetter<string>;
  clusterCollectionName: MaybeRefOrGetter<string | null>;
  targetOperation: MaybeRefOrGetter<string | null>;
  companyType: MaybeRefOrGetter<string>;
  editList: MaybeRefOrGetter<boolean | undefined>;
  selectedProgramId: MaybeRefOrGetter<string | null | undefined>;
  planId: MaybeRefOrGetter<string | null | undefined>;
  phaseId: MaybeRefOrGetter<string | null | undefined>;
  entityUuid: MaybeRefOrGetter<string>;
  groupUuid: MaybeRefOrGetter<string>;
  search: MaybeRefOrGetter<string>;
  filterToGrid: MaybeRefOrGetter<unknown>;
  defaultColumns: Ref<GraphqlGridColumn[]>;
  allSelected: Ref<boolean>;
  /** Shared with selection / column cache — parent owns the ref. */
  showMenuFilter: Ref<GraphqlGridColumnMenuFilter>;
  /** Shared footer-loading flag; unique-values callbacks clear it. */
  loadData: Ref<boolean>;
  spendFileVersionActiveId: MaybeRefOrGetter<unknown>;
  emit: GraphqlGridColumnMenusEmit;
}

/**
 * Column-menu application behavior for CalculumGridGraphql:
 * unique-values fetch, header active class, and menu action emits.
 * Menu SFCs stay in the facade; this does not own Kendo skip/take/sort/filter.
 */
export function useGraphqlGridColumnMenus(
  options: UseGraphqlGridColumnMenusOptions,
) {
  const homeStore = useHomeStore();
  const appStore = useAppStore();
  const globalFiltersStore = useGlobalFiltersStore();

  const dataForColumns = ref<unknown[]>([]);
  const loadingItems = ref(false);
  const remainItem = ref(true);
  const activeSearchQuery = ref<string | null | undefined>(null);
  const forRecordsCount = reactive({
    recordsCount: null as number | null,
    columnSelected: "",
    columnOld: "",
  });

  const setdataForColumns = computed(() => {
    if (dataForColumns.value.length > 0) {
      return reformatColumnsData(
        forRecordsCount.columnSelected,
        dataForColumns.value,
        false,
      );
    }
    return dataForColumns.value;
  });

  function closeColumnMenu() {
    options.showMenuFilter.value = false;
  }

  function clearSelectionAndMenu() {
    options.allSelected.value = false;
    closeColumnMenu();
  }

  function sendColumnFiltered(
    filters: GraphqlGridColumnFilters | null,
    columnFiltered: { field: string } | null,
  ) {
    if (filters !== null && columnFiltered) {
      let isColumnActive: unknown = filterGroupByField(
        columnFiltered.field,
        filters,
      );

      if (isColumnActive === null) {
        isColumnActive = isColumnFilterActive(columnFiltered.field, filters);
      }

      stampColumnHeaderFilterClass(
        options.defaultColumns.value,
        columnFiltered.field,
        !!isColumnActive,
      );
      return;
    }

    stampColumnHeaderFilterClass(options.defaultColumns.value, null, false);
  }

  function gridIncludePilot(action: unknown) {
    closeColumnMenu();
    options.emit("grid-include-pilot", action, toValue(options.levelOfGrid));
  }

  function gridExclude(action: unknown) {
    closeColumnMenu();
    options.emit("grid-exclude", action, toValue(options.levelOfGrid));
  }

  function gridApproach(action: unknown) {
    clearSelectionAndMenu();
    options.emit("grid-approach", action);
  }

  function gridRemoveGroup(type: unknown) {
    clearSelectionAndMenu();
    options.emit("grid-remove", type, toValue(options.levelOfGrid));
  }

  function showTargetModal(myTargetObject: Record<string, unknown>) {
    options.emit("show-target-modal", {
      ...myTargetObject,
      levelOfGrid: toValue(options.levelOfGrid),
    });
  }

  function showTargetClearModal() {
    options.emit("show-target-clear-modal", toValue(options.levelOfGrid));
  }

  function showSupplierStandardModal() {
    options.emit(
      "show-supplier-standard-modal",
      toValue(options.levelOfGrid),
    );
  }

  function showPeerGroupStandardModal() {
    options.emit(
      "show-peer-group-standard-modal",
      toValue(options.levelOfGrid),
    );
  }

  function gridAddVGroup(groupId: unknown) {
    clearSelectionAndMenu();
    options.emit("grid-add-vgroup", groupId, toValue(options.levelOfGrid));
  }

  function gridAddGroup(
    groupId: unknown,
    type: unknown,
    typeharmonization?: unknown,
  ) {
    clearSelectionAndMenu();
    options.emit(
      "grid-add-group",
      groupId,
      type,
      typeharmonization,
      toValue(options.levelOfGrid),
    );
  }

  function closeHarmonizationModal(level: unknown) {
    options.emit(
      "show-harmonization-modal",
      level,
      toValue(options.levelOfGrid),
    );
  }

  function closeMoveBetweenModal(emitParamsFromCalculumTreeSelect: unknown) {
    options.emit(
      "show-move-between-modal",
      toValue(options.levelOfGrid),
      emitParamsFromCalculumTreeSelect,
    );
  }

  function closeRemovePlanModal(emitParamsFromCalculumTreeSelect: unknown) {
    options.emit(
      "show-remove-plan-modal",
      toValue(options.levelOfGrid),
      emitParamsFromCalculumTreeSelect,
    );
  }

  function gridMatchRemove() {
    options.emit("grid-match-remove");
  }

  function negotiationStatusOnChanged(negotiationStatus: unknown) {
    clearSelectionAndMenu();
    options.emit("negotiation-status-changed", negotiationStatus);
  }

  function mapUniqueValuesPayload(callbackSuccessData: unknown) {
    if (toValue(options.summaryOperation) === "list") {
      const listed = callbackSuccessData as { value: unknown[]; key: string };
      return convertListUniqueValues(listed.value, listed.key);
    }
    return callbackSuccessData;
  }

  function settleUniqueValuesLoad() {
    options.loadData.value = false;
    loadingItems.value = false;
  }

  const sendValuesToFilterColumn = (pos: unknown[], type: string) => {
    if (type === "normal") {
      const result = resolveDataForColumns(
        dataForColumns.value,
        pos,
        forRecordsCount.recordsCount,
      );
      dataForColumns.value = result.dataForColumns;
      if (!result.remainItem) {
        remainItem.value = false;
      }
      return;
    }
    dataForColumns.value = [];
    dataForColumns.value = pos;
  };

  const clusterParamsCall = (column: string) => ({
    collection: toValue(options.clusterCollectionName),
    field: column,
    callbackSuccess: (callbackSuccessData: {
      value?: unknown[];
      key?: string;
    }) => {
      sendValuesToFilterColumn(
        mapUniqueValuesPayload(callbackSuccessData) as unknown[],
        "cluster",
      );
      settleUniqueValuesLoad();
    },
    callbackError: () => {
      settleUniqueValuesLoad();
    },
  });

  const normalParamsCall = (
    column: string,
    cantRecords: number,
    fromRecord: number,
    countDatas = false,
    searchQuery: GraphqlGridColumnSearchQuery = null,
  ) => {
    loadingItems.value = true;

    const handleUniqueDataSuccess = (callbackSuccessData: {
      totalCount?: number;
      value?: unknown[];
      key?: string;
    }) => {
      if (isStaleSearchResponse(searchQuery, activeSearchQuery.value)) {
        return;
      }
      if (searchQuery && fromRecord === 0) {
        dataForColumns.value = [];
      }
      if (countDatas) {
        forRecordsCount.recordsCount = callbackSuccessData.totalCount ?? null;
        forRecordsCount.columnOld = forRecordsCount.columnSelected;
        forRecordsCount.columnSelected = column;
      } else {
        sendValuesToFilterColumn(
          mapUniqueValuesPayload(callbackSuccessData) as unknown[],
          "normal",
        );
        settleUniqueValuesLoad();
      }
    };

    const params = buildGraphqlGridUniqueValuesParams({
      telerikFilter: graphqlUtils.convertFiltersToREST(
        toValue(options.filterToGrid),
      ),
      column,
      cantRecords,
      fromRecord,
      countDatas,
      searchQuery,
      gridSearch: toValue(options.search),
      levelOfGrid: toValue(options.levelOfGrid),
      currencyRate: appStore.getCurrencyAmount,
      selectedProgramId: toValue(options.selectedProgramId),
      planId: toValue(options.planId),
      phaseId: toValue(options.phaseId),
      section: toValue(options.section),
      globalFilter: convertFiltersToREST(globalFiltersStore.getFiltersApplied),
      activeSpendFileVersion: uniqueValuesActiveSpendFileVersion(
        toValue(options.section),
        toValue(options.spendFileVersionActiveId),
      ),
      targetOperation: uniqueValuesTargetOperation(
        toValue(options.targetOperation),
      ),
      summaryOperation: toValue(options.summaryOperation),
      editList: toValue(options.editList),
      companyType: toValue(options.companyType),
      entityUuid: toValue(options.entityUuid),
      groupUuid: toValue(options.groupUuid),
    });

    params.callbackSuccess = handleUniqueDataSuccess;
    params.callbackError = (response: { skipped?: boolean } | undefined) => {
      settleUniqueValuesLoad();
      if (!shouldFallBackToUnfilteredValues(response)) {
        return;
      }
      homeStore.getUniqueData({
        ...unfilteredUniqueValuesFallbackParams(params),
        callbackSuccess: handleUniqueDataSuccess,
        callbackError: () => {
          settleUniqueValuesLoad();
        },
      });
    };

    return params;
  };

  async function refreshRecordsCountForColumn(
    column: string,
    cantRecords: number,
    fromRecord: number,
    searchQuery: GraphqlGridColumnSearchQuery,
    searchQ: string | null | undefined,
    changeDataColumns: boolean,
    cantDatasParams: Record<string, unknown>,
  ) {
    if (
      !needsUniqueValuesCountRefresh(
        forRecordsCount.recordsCount,
        forRecordsCount.columnSelected,
        column,
        changeDataColumns,
      )
    ) {
      return;
    }
    let params = cantDatasParams;
    if (searchQ) {
      params = normalParamsCall(
        column,
        cantRecords,
        fromRecord,
        true,
        searchQuery,
      );
    } else {
      dataForColumns.value = [];
    }
    await homeStore.getUniqueData(params);
  }

  async function loadRemainingItemsForColumn(
    column: string,
    fromRecord: number,
    resetData: boolean | undefined,
    changeDataColumns: boolean,
    params: Record<string, unknown>,
  ) {
    if (fromRecord === 0) {
      remainItem.value = true;
    }
    if (remainItem.value !== true) {
      return;
    }
    if (
      shouldSkipUniqueValuesListFetch(
        fromRecord,
        dataForColumns.value.length,
        forRecordsCount.columnSelected,
        column,
        changeDataColumns,
      )
    ) {
      return;
    }
    if (resetData) {
      dataForColumns.value.length = 0;
    }
    await homeStore.getUniqueData(params);
  }

  async function showValuesbycolumn(
    showData: GraphqlGridShowValuesByColumnPayload,
  ) {
    const { column, cantRecords, fromRecord, searchQuery, resetData } =
      showData;
    if (searchQuery) {
      activeSearchQuery.value = searchQuery.value;
    }

    if (toValue(options.forClustersUniqueValuesApi)) {
      homeStore.getClustersUniqueData(clusterParamsCall(column));
      return;
    }

    const params = normalParamsCall(
      column,
      cantRecords,
      fromRecord,
      false,
      searchQuery,
    );
    const cantDatasParams = normalParamsCall(column, 20, 0, true);
    const { searchQ, changeDataColumns } = getSearchChangeFlags(
      searchQuery,
      resetData,
    );

    await refreshRecordsCountForColumn(
      column,
      cantRecords,
      fromRecord,
      searchQuery,
      searchQ,
      changeDataColumns,
      cantDatasParams,
    );
    await loadRemainingItemsForColumn(
      column,
      fromRecord,
      resetData,
      changeDataColumns,
      params,
    );
  }

  return {
    dataForColumns,
    loadingItems,
    remainItem,
    forRecordsCount,
    setdataForColumns,
    sendColumnFiltered,
    showValuesbycolumn,
    gridIncludePilot,
    gridExclude,
    gridApproach,
    gridRemoveGroup,
    showTargetModal,
    showTargetClearModal,
    showSupplierStandardModal,
    showPeerGroupStandardModal,
    gridAddVGroup,
    gridAddGroup,
    closeHarmonizationModal,
    closeMoveBetweenModal,
    closeRemovePlanModal,
    gridMatchRemove,
    negotiationStatusOnChanged,
  };
}
