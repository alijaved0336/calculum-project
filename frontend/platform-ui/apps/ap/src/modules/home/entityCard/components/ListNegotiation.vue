<template>
<CalculumHarmonizationModal v-if="displayModelForHarmonization" @close="userRejectedHarmonization" @approve="userApprovedHarmonization" @cancel="userRejectedHarmonization"></CalculumHarmonizationModal>
<CalculumMoveBetweenModal v-if="displayModelForMoveBetween" @close="userRejectedMoveBetween" @approve="userApprovedMoveBetween" @cancel="userRejectedMoveBetween"></CalculumMoveBetweenModal>
<CalculumRemovePlanModal v-if="displayRemovePLan" :data="removePlanData" @close="userRejectedRemovePlan" @approve="userApprovedRemovePlan" @cancel="userRejectedRemovePlan"></CalculumRemovePlanModal>
<CalculumModal v-if="isModalForClearTargetBulkDisplaying" @close="() => isModalForClearTargetBulkDisplaying = false" :size="'md'" :showClose="true" :title="$t('global.confirm')">
  <template v-slot:modalContent>
    <div class="d-flex flex-column"><span>{{ $t('home.entityCard.modalDetails.changingOrClearingTarget') }}</span>
      <div class="d-flex align-items-center mt-4 mb-4"><span class="font-weight-600 mr-1">{{ $t('home.entityCard.modalDetails.note') }}</span><span>{{ $t('home.entityCard.modalDetails.programWillRecalculate') }}</span></div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => isModalForClearTargetBulkDisplaying = false" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
    <button class="btn btn-primary font-md" v-if="!applySelectedEntitiesBulkTargetButtonClicked" @click="applySelectedEntitiesBulkTargetChanges(true)" style="z-index: 1; width: fit-content">{{ $t('global.continue') }}</button>
    <button class="btn btn-primary font-md" v-else style="z-index: 1; width: fit-content;"><span class="spinner-border spinner-border-sm"></span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="modalTarget" @close="() => modalTarget = false" :size="'md'" :showClose="true" :title="$t('global.confirm')">
  <template v-slot:modalContent>
    <div class="d-flex flex-column"><span>{{ $t('home.entityCard.modalDetails.changingOrClearingTarget') }}</span>
      <div class="d-flex align-items-center mt-4 mb-4"><span class="font-weight-600 mr-1">{{ $t('home.entityCard.modalDetails.note') }}</span><span>{{ $t('home.entityCard.modalDetails.programWillRecalculate') }}</span></div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => modalTarget = false" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
    <button class="btn btn-primary font-md" v-if="!applySelectedEntitiesBulkTargetButtonClicked" @click="() => applySelectedEntitiesBulkTargetChanges(false)" style="z-index: 1; width: fit-content">{{ $t('global.continue') }}</button>
    <button class="btn btn-primary font-md" v-else style="z-index: 1; width: fit-content;"><span class="spinner-border spinner-border-sm"></span></button>
  </template>
</CalculumModal>
<div class="row p-0" v-if="(!inRecalculation && !patchGrid) || treeView">
  <CalculumLoading v-if="loadExport" :modal="true"></CalculumLoading>
  <div class="col-12 p-0" :class="{ 'bg-blur': (loadSpends) }">
    <CalculumGridGraphql :gridData="dataSpends" :gridColumns="gridColumnsSpends" :sortable="true" :enabledPagination="true" :allowExportExcel="false" :filterable="true" :total="totalSpends" :skip="filterSettings.paginationSpends.after" :take="filterSettings.paginationSpends.first" :defaultPageSize="filterSettings.paginationSpends.first" :filter="filterSettings.filterSpends" :sort="filterSettings.sortSpends" :showTabsLevels="false" :collectionQuery="'collectionQueryProgramListSpends'" :selectedProgramId="selectedProgramId" :editList="true" :selectable="isSelectable" :forListViewRelatedToPilot="true" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" :key="keySpends" :levelOfGrid="'spends'" :section="'program'" :allowExclude="false" :allowMoveBetween="true" :companyType="companyType" :entityUuid="entityUuid" :showOptions="showOptions" :targetOperation="'agreed'" :gridHeight="gridHeightComputed" :totalsBycolumns="totalsBycolumnsSpends" @dataChange="dataChange" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" @selectAllRow="selectAllRow" @selectRow="selectRow" @update-row-data-parent="$emit('change-data')" @grid-add-group="gridAddGroup" @show-harmonization-modal="getDataHarmonizationModal" @show-move-between-modal="getDataMoveBetweenModal" @show-remove-plan-modal="getRemovePlanModal" @negotiation-status-changed="negotiationStatusOnChanged" @show-target-modal="showModalTarget" @show-target-clear-modal="showModalTargetClear" :programInrecalculation="programInrecalculating" v-if="dataSpends"></CalculumGridGraphql>
  </div>
</div>
</template>

<script lang="ts">
import { ArrayUtils, NumberUtils, StringUtils, isNullOrUndefined } from "@/utils";
import { defaultSpendLinesSort } from "@/utils/EntityCardUtils";
import {
  entityColumnsGrid,
  entityColumnsTreeColumn
} from "../data/graphqlColums";
import { FilterChangeEvent } from "@/types/filterSettings";
import { NegotiationStatus } from "@/types";
import { onBeforeRouteLeave } from "vue-router";
import { reactive, toRefs, watch, onMounted, defineComponent, computed } from "vue";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { translate } from "@/utils/translation";
import { useEntityCardStore } from '@/stores/entityCard';
import { useUserStore } from '@/stores/user';
import { useNegotiationStatusStore } from '@/stores/negotiationStatus';
import { useAnalyzeStore } from '@/stores/analyze';
import * as cacheGrid from "@/utils/dataGridClear";
import * as graphqlUtils from "@/utils/graphqlUtils";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import CalculumHarmonizationModal from "@/modules/components/CalculumHarmonizationModal.vue";
import CalculumMoveBetweenModal from "@/modules/components/CalculumMoveBetweenModal.vue";
import { CalculumLoading } from '@ada/design-system'
import { useToast } from 'vue-toastification';
import useApolloClient from "@/services/graphql/useApolloClient";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import useSpendFile from "@/composables/useSpendFile";
import { useUser } from "@/composables";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import useCompany from "@/composables/useCompany"
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { useAppStore } from '@/stores/app';
import CalculumRemovePlanModal from "@/modules/components/CalculumRemovePlanModal.vue";
import { reformatColumnsData } from "@/modules/components/utils/utilsColumnsFilter";
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";
import * as HomeAPI from "@/modules/home/api";
import * as totalColumnsUtils from "@ada/design-system/utils/totalColumnsUtils";
import * as formatData from "@/utils/FormatData";
import { useGlobalFiltersStore } from '@/stores/globalFilters';

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
  name: "ListNegotiation",
  components: {
    CalculumGridGraphql,
    CalculumHarmonizationModal,
    CalculumLoading,
    CalculumModal,
    CalculumMoveBetweenModal,
    CalculumRemovePlanModal,
  },
  props: {
    selectedProgramId: { type: String, required: true },
    companyType: { type: String, required: true },
    entityUuid: { type: String, required: true },
    hasFinancing: { type: Boolean, required: true },
    hasHarmonization: { type: Boolean, required: true },
    programInrecalculating: { type: Boolean, required: false, default: false },
    isSelectable: { type: Boolean, required: false, default: true },
    inRecalculation: { type: Boolean, required: true, default: false },
    patchGrid: { type: Boolean, required: true, default: false },
    treeView: { type: Boolean, required: false, default: false },
    showOptions: { type: Boolean, required: false, default: false },    
    potentialTheme: { type: Boolean, required: false, default: false }
  },
  emits: ["change-data", "select-all-row", "select-row", "send-data-spends", "send-filters", 'remove-plan-suppliers'],
  setup(props, { emit }) {
    const entityCardStore = useEntityCardStore();
    const userStore = useUserStore();
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid);
    const payOnTermsIsAllowed = computed(() => userStore.getShowPayOnTerms);
    const analyzeStore = useAnalyzeStore();
    const negotiationStatusStore = useNegotiationStatusStore();
    const { useFeatureScfStrategy, isPilotAccount, useFeatureVirtualCard, useFeatureSupplierStandard, useFeaturePeerGroupStandard } = useUser();
    const { usevCardGroupsEnabled } = useCompany()
    const toast = useToast()
    const appStore = useAppStore();
    const globalFiltersStore = useGlobalFiltersStore();

    const { spendFileVersionActiveId } = useSpendFile();

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
        // Modal (selectable) grid: default to the largest page size (175) so all spends show
        // without paging; the entity-card grid keeps its small default.
        first: props.isSelectable ? 175 : 5,
        after: 0,
        skip: 0
      },
      filterSpends: [],
      // WI#18804: Spend Lines default to Spend Volume descending everywhere (the entity-card
      // grid used to default to alphabetical supplier order). The pilot entity-card grid keeps
      // its pilot rows on top, volume-desc within; the modal (selectable) grid stays pure
      // volume-desc so its row order matches the results-modal tabs. The user can re-sort.
      sortSpends: defaultSpendLinesSort(!props.isSelectable && isPilotAccount())
    };

    interface DataInterface {
      loadSpends: boolean;
      dataSpends: Array<any>;
      totalSpends: number;
      keySpends: number;
      gridColumnsSpends: Array<any>;
      gridHeight: string;
      loadExport: boolean;
      selectedItems: Array<any>;
      displayModelForHarmonization: boolean;
      displayModelForMoveBetween: boolean;
      displayRemovePLan: boolean;
      removePlanData: { entityName: string, planName: string, phaseName: string, key: string | number, value: string }
      levelHarmonizationFromGrid: string;
      levelGridFromGrid: string;
      modalTarget: boolean;
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
      loadExport: false,
      selectedItems: [],
      displayModelForHarmonization: false,
      displayModelForMoveBetween: false,
      displayRemovePLan: false,
      removePlanData: { entityName: '', planName: '', phaseName: '', key: '', value: '' },
      levelHarmonizationFromGrid: "",
      levelGridFromGrid: "",
      modalTarget: false,
      myCurrentObjectForTargetBulkValues: { key: '', value: '', levelOfGrid: '' },
      isModalForClearTargetBulkDisplaying: false,
      applySelectedEntitiesBulkTargetButtonClicked: false,
      totalsBycolumnsSpends: []
    });

    /** Start edition */

    function selectAllRow(rowData: any, checked: boolean) {
      // User toggled the header checkbox → update the selection intent.
      allSelectedIntent = checked;
      selectedUuids.clear();
      data.dataSpends.forEach((row: any) => { row.selected = checked; });
      data.selectedItems = checked ? [...data.dataSpends] : [];
      emit("select-all-row", rowData, data.selectedItems, checked);
    }

    function selectRow(rowData: any) {
      // User changed the individual selection → remember it by uuid so later re-fetches keep it.
      allSelectedIntent = false;
      selectedUuids.clear();
      (rowData ?? []).forEach((row: any) => { if (row?.uuid) selectedUuids.add(row.uuid); });
      data.selectedItems = rowData?.length > 0 ? rowData : [];
      emit("select-row", data.selectedItems);
    }

    function applySelectedEntitiesBulkTargetChanges(resetValues: boolean) {

      data.applySelectedEntitiesBulkTargetButtonClicked = true
      const changed = {
        key: "targetPaymentTerms",
        value: resetValues ? 'clear' : data.myCurrentObjectForTargetBulkValues.value
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, "targetPaymentTerms", data.myCurrentObjectForTargetBulkValues.levelOfGrid);
    }

    function showModalTargetClear(levelOfGrid: string) {
      data.levelGridFromGrid = levelOfGrid
      data.isModalForClearTargetBulkDisplaying = true
    }


    function showModalTarget(myTargetObject: { key: string, value: string, levelOfGrid: string }) {

      data.myCurrentObjectForTargetBulkValues = myTargetObject
      data.modalTarget = true;
    }



    function getDataHarmonizationModal(level: any, levelOfGrid: string) {
      data.displayModelForHarmonization = !data.displayModelForHarmonization;
      data.levelHarmonizationFromGrid = level;
      data.levelGridFromGrid = levelOfGrid;
    }

    function userRejectedHarmonization() {
      data.displayModelForHarmonization = !data.displayModelForHarmonization;
      data.levelHarmonizationFromGrid = "";
      data.levelGridFromGrid = "";
    }

    function userApprovedHarmonization() {
      data.displayModelForHarmonization = !data.displayModelForHarmonization;
      gridRemove("harmonizationGroup", data.levelGridFromGrid);
    }
    const removePlan = reactive({ key: '', value: '' })
    function getRemovePlanModal(levelOfGrid: string, emitParamsFromCalculumTreeSelect: any) {
      const params={
        levelGridFromGrid:levelOfGrid,
        selectedItems:data.selectedItems
      }
      emit('remove-plan-suppliers',params)
    }
    function userApprovedRemovePlan() {
      data.displayRemovePLan = !data.displayRemovePLan;
      gridRemovePlan("removeSpendToPhases", data.levelGridFromGrid);
    }
    function userRejectedRemovePlan() {
      data.displayRemovePLan = !data.displayRemovePLan;
      data.levelHarmonizationFromGrid = "";
      data.levelGridFromGrid = "";
    }
    function gridRemovePlan(type: string, levelOfGrid: string) {
      const changed = {
        key: type,
        value: removePlan.value
      };
      const params = { changed };
      // postByGroup(params, data.selectedItems, type, levelOfGrid);
    }
    const moveSpendToPhases = reactive({ key: '', value: '' })
    function getDataMoveBetweenModal(levelOfGrid: string, emitParamsFromCalculumTreeSelect: any) {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween;
      data.levelGridFromGrid = levelOfGrid;
      moveSpendToPhases.key = emitParamsFromCalculumTreeSelect.key
      moveSpendToPhases.value = emitParamsFromCalculumTreeSelect.value
    }
    function userApprovedMoveBetween() {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween;
      gridMovePhase("moveSpendToPhases", data.levelGridFromGrid);
    }
    function userRejectedMoveBetween() {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween;
      data.levelHarmonizationFromGrid = "";
      data.levelGridFromGrid = "";
    }
    function gridMovePhase(type: string, levelOfGrid: string) {
      const changed = {
        key: type,
        value: moveSpendToPhases.value
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, type, levelOfGrid);
    }
    function gridRemove(type: string, levelOfGrid: string) {
      const changed = {
        key: type,
        value: null
      };
      const params = { changed };
      postByGroup(params, data.selectedItems, type, levelOfGrid);
    }

    function gridAddGroup(
      idGroup: any,
      type: string,
      typeharmonization: string | null,
    ) {
      let value;
      let uuidGroup;

      if (typeharmonization) {
        value = typeharmonization;
      } else {
        if (idGroup) {
          uuidGroup = idGroup.split("/");
          value = uuidGroup[4];
        } else {
          value = null;
        }
      }

      const changed = {
        key: type,
        value: value
      }
      const params = { changed };
      postByGroup(params, data.selectedItems);
    }

    function postByGroup(
      getParams: any,
      items: any,
      type: string = "",
      levelOfGrid: string = "",

    ) {
      const uuids: Array<any> = [];
      items.forEach(function (item: any) {
        uuids.push(item.uuid);
      });
      const params = {
        program: props.selectedProgramId,
        changed: getParams.changed,
        uuids: uuids,
        level: "spends",
        callbackSuccess: (callbackSuccessData: any) => {
          // US-18713 AC-01: this is the other Target entry point (grid column menu ->
          // set/clear Target in bulk). postByGroup also carries harmonization, financing
          // and plan changes, so the token is bumped only for the Target key (AC-04).
          if (getParams.changed?.key === "targetPaymentTerms") {
            entityCardStore.bumpScfRefreshToken();
          }
          if (data.levelHarmonizationFromGrid !== "") {
            gridAddGroup(
              null,
              "harmonizationGroup",
              data.levelHarmonizationFromGrid
            );
            data.levelHarmonizationFromGrid = "";
            data.levelGridFromGrid = "";
          } else {
            negotiationStatusStore.setTrackingNumber(
              NumberUtils.getRandomInt()
            );
            // emit("change-data");
          }
        },
        callbackError: () => {
          data.loadExport = false;
          toast.error(translate.t('global.errorLoadingNegotiations'));
        }
      };
      analyzeStore.postProgramSpendConfigurationbyGroups(params);
    }

    function postGroupActionForModal(
      changed: object,
      uuids: string[],
      callbackSuccess?: () => void,
      callbackError?: () => void,
    ) {
      analyzeStore.postProgramSpendConfigurationbyGroups({
        program: props.selectedProgramId,
        changed,
        uuids,
        level: "spends",
        callbackSuccess: () => {
          negotiationStatusStore.setTrackingNumber(NumberUtils.getRandomInt());
          callbackSuccess?.();
        },
        callbackError: () => {
          callbackError?.();
        },
      });
    }

    function clearSelection() {
      data.dataSpends.forEach((item: any) => { item.selected = false; });
      data.selectedItems = [];
      emit("select-row", []);
    }

    function gridManageCommodity(
      value: string | null,
      uuids: string[],
      callbackSuccess?: () => void,
      callbackError?: () => void,
    ) {
      postGroupActionForModal({ key: "commodity", value }, uuids, callbackSuccess, callbackError);
    }

    function gridManageCustomColumn(
      columnNumber: number,
      value: string | null,
      uuids: string[],
      callbackSuccess?: () => void,
      callbackError?: () => void,
    ) {
      postGroupActionForModal({ key: "customColumn", columnNumber, value }, uuids, callbackSuccess, callbackError);
    }

    function gridManageTeam(
      teamIri: string | null,
      uuids: string[],
      callbackSuccess?: () => void,
      callbackError?: () => void,
    ) {
      const value = teamIri ? StringUtils.removeIRI(teamIri) : null;
      postGroupActionForModal({ key: "manageTeam", value }, uuids, callbackSuccess, callbackError);
    }

    // *** Negotiation Status ***

    /**
     * Handle the change in negotiation status for the list of spends.
     *
     * @param {NegotiationStatus} negotiationStatus - the new negotiation status
     * @return {void}
     */
    function negotiationStatusOnChanged(
      negotiationStatus: NegotiationStatus
    ): void {
      const spendsIds = data.selectedItems.map((item: any) => item.uuid);

      negotiationStatusAPIUpdateMultiple({
        negotiationStatus,
        spendsIds
      });
    }

    /**
     * Update the negotiation status of several spends using the API.
     * Route: POST - /api/entity-card/negotiation-status/update
     *
     * @param {Object} params - The parameters for the function.
     *   - {NegotiationStatus} status
     *   - {string} spendId
     *   - {targetSpendFileVersionUuid} targetSpendFileVersionUuid
     * @return {void}
     */
    function negotiationStatusAPIUpdateMultiple({
      negotiationStatus,
      spendsIds
    }: {
      negotiationStatus: NegotiationStatus;
      spendsIds: string[];
    }): void {
      try {
        // Validate
        if (ArrayUtils.isEmpty(spendsIds)) {
          throw new Error(
            "** Error in negotiationStatusAPIUpdate: spendsIds is empty"
          );
        }

        if (
          StringUtils.isNullUndefinedOrEmpty(spendFileVersionActiveId.value)
        ) {
          throw new Error(
            "** Error in negotiationStatusAPIUpdate: spendFileVersionIdActive is null, undefined or empty"
          );
        }

        const params = {
          spendsIds,
          negotiationStatus,
          spendFileVersionUuid: StringUtils.removeIRI(
            spendFileVersionActiveId.value
          ),
          level: "spend",
          callbackSuccess: (callbackSuccessData: {
            result: "success" | "failed" | "warning";
            subject: string;
            summary: {
              changesCount: number;
              changedCount: number;
              suppliersCount: number;
            };
          }) => {
            const { result, subject, summary } = callbackSuccessData;

            // API call failed
            if (result === "failed") {
              throw new Error(`API call failed. Message: ${subject}`);
            }

            // API call succeeded

            if (summary.changedCount === 0) {
              toast.warning("No changes were applied.");

              return;
            } else if (summary.changedCount === summary.changesCount) {
              toast.success("Your changes have been applied successfully.");
            } else {
              if (negotiationStatus === "contacted") {
                toast.warning("Only the spend lines with Planned status were updated to Contacted.");
              }
              //
              else {
                toast.warning("Only the spend lines with Contacted status were updated to Planned.");
              }
            }

            negotiationStatusStore.setTrackingNumber(NumberUtils.getRandomInt());
            // emit("change-data");
          }
        };

        negotiationStatusStore.negotiationStatusAPIUpdate(params);
      } catch (error) {
        if (import.meta.env.DEV)
          console.log("** Error in negotiationStatusAPIUpdate. ", error);
      }
    }

    // *** END Negotiation Status ***

    /** End edition */

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
        setColumnHidden(cols, 'entitySupplierStandard2Strategy');
        setColumnHidden(cols, 'entityPeerGroupStandard2Strategy');
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
      
      let columnsToParse = [];

      if ( props.isSelectable ) {
        columnsToParse = entityColumnsGrid
      } else {
        columnsToParse = entityColumnsTreeColumn
      }
      
      const columns: Array<any> = [];
      columnsToParse.forEach(function (config: any) {
        const newConfig = { ...config };
        columns.push(newConfig);
      });


      const gridCache = resetColumnsFlag ? [] : (entityCardStore.getEntityListNegotiation ?? []);
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

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }
      if (!payOnTermsIsAllowed.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'contractualPaymentTermsWithoutCashDiscounts');
      }
      entityCardStore.setEntityListNegotiation(resetColumns);

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

        entityCardStore.setEntityListNegotiation(data.gridColumnsSpends)
        fetchDataSpends();
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
        // Invalidate graphql cache
        // if (options?.invalidateCache) {
        //   await apolloClientResetStore();
        // }
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
      await fetchDataSpends()

    }

    //- get spends Data
    // Selection preservation: the modal grid defaults to "all selected", but re-fetches (sort,
    // filter, page/size, column change, recalc refresh) must keep the user's selection instead of
    // resetting it. We track the intent — all-selected, or a specific set of row uuids — and
    // re-apply it to each freshly-fetched dataset (works across the several initial-load fetches).
    let allSelectedIntent = true;
    const selectedUuids = new Set<string>();
    async function fetchDataSpends(callTotalsValues: boolean = false, withoutGlobalFilter: boolean = false) {
      if (props.selectedProgramId && spendFileVersionActiveId.value) {
        if (!isProgramSfvConsistent(props.selectedProgramId, spendFileVersionActiveId.value)) {
          return; // programs not loaded yet, watcher on getAllPrograms will retry
        }
      }
      try {
        let queryString = getSpendsData(filterSettings, withoutGlobalFilter);

        // Enabling loading
        data.loadSpends = true;
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.spends.edges.map((edge: any) => edge.node);

        const parsedData: Array<any> = [];

        nodes.forEach(function (data: any) {
          const datas = { ...data };
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
          datas.selected = allSelectedIntent || selectedUuids.has(datas.uuid)
          parsedData.push(datas);
        });
        data.dataSpends = reformatColumnsData("entityRegulatoryTermsStrategyModality",parsedData);        
        
        
        if (props.isSelectable) {
          // Re-apply the tracked selection intent to the freshly-fetched rows and re-emit it,
          // so the selection survives every re-fetch (and the several initial-load fetches).
          data.selectedItems = data.dataSpends.filter((row: any) => row.selected);
          if (allSelectedIntent) {
            emit("select-all-row", data.dataSpends, data.selectedItems, true)
          } else {
            emit("select-row", data.selectedItems)
          }
        }
        

        emit('send-filters', filterSettings.filterSpends)
        emit('send-data-spends', data.dataSpends)
        data.totalSpends = response.data.spends.totalCount;
        data.loadSpends = false;

        if (callTotalsValues) {
          data.totalsBycolumnsSpends = []
          callTotalDataByLevel()
        }

      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
        // AF-1: on a genuine failure, retry once against the unfiltered baseline
        // so the grid falls back to the full dataset instead of staying empty/stale.
        if (!withoutGlobalFilter) {
          await fetchDataSpends(callTotalsValues, true);
          return;
        }
        data.dataSpends = [];
        data.totalSpends = 0;
        data.totalsBycolumnsSpends = [];
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
      // Modal grid (selectable): keep a fixed height so a larger page size scrolls internally
      // instead of growing the modal past the viewport.
      if (props.isSelectable) {
        return '500px';
      }
      if (data.dataSpends && data.dataSpends.length < 5) {
        return '500px';
      }

      return 'auto';
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


    function getSpendsData(event: FilterChangeEvent, withoutGlobalFilter = false): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends
      );
      const setGlobalFilter = withoutGlobalFilter
        ? ""
        : graphqlUtils.convertGlobalFilterToGraphQL(globalFiltersStore.getFiltersApplied);

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
              ${setGlobalFilter}
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
      clearTimeout(pendingRequest);
      await fetchDataSpends(true);
    }

    // *** Watchers ***

    // Retry fetch once allPrograms is populated (covers the case where ListNegotiation
    // mounts before the analyze store has finished loading programs, causing
    // isProgramSfvConsistent to return false and fetchDataSpends to bail out early)
    watch(
      () => analyzeStore.getAllPrograms,
      (programs) => {
        if (programs && programs.length > 0 && props.selectedProgramId) {
          fetchDataSpends();
        }
      }
    );

    // Spends
    watch(
      () => data.gridColumnsSpends,
      () => {
        fetchDataSpends();
      },
      { deep: true }
    );

    /**
     * RACE CONDITION GUARD — watch(globalFiltersStore.getFiltersApplied)
     * See: docs/context/race-condition-company-change.md
     */
    watch(
      () => globalFiltersStore.getFiltersApplied,
      async () => {
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }
        filterSettings.paginationSpends = { first: filterSettings.paginationSpends.first, after: 0, skip: 0 };
        data.dataSpends = [];
        data.totalSpends = 0;
        data.totalsBycolumnsSpends = [];
        data.selectedItems = [];
        await fetchDataSpends(true);
      }
    );

    function resetDefaultColumns() {
      entityCardStore.setEntityListNegotiation(null)      
      data.gridColumnsSpends = getGridColumnsSpends(true)
      data.keySpends++
    }

    return {
      ...toRefs(data),
      dataChange,
      filterSettings,
      getDataHarmonizationModal,
      getDataMoveBetweenModal,
      getRemovePlanModal,
      gridAddGroup,
      negotiationStatusOnChanged,
      pageChangeHandler,
      resetDefaultColumns,
      selectAllRow,
      selectRow,
      showModalTarget,
      userApprovedHarmonization,
      userRejectedHarmonization,
      userRejectedMoveBetween,
      userApprovedMoveBetween,
      userApprovedRemovePlan,
      userRejectedRemovePlan,
      applySelectedEntitiesBulkTargetChanges,
      showModalTargetClear,
      gridHeightComputed,
      clearSelection,
      gridManageCommodity,
      gridManageCustomColumn,
      gridManageTeam,
    };
  }
});
</script>
<style scoped>
.widget {
  min-height: auto;
}
</style>
