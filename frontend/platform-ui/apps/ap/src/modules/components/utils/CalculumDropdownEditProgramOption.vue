<template>
<CalculumModalConfirmAction v-if="showConfirmAllSpendModal" :actionDescription="$t('home.entityCard.details.confirmAllSpendChange')" @confirm-action="confirmAllSpendAction" @hide-modal="cancelAllSpendAction"></CalculumModalConfirmAction>
<CalculumManageCommodityModal v-if="showConfirmCommodityModal" :type="pendingCommodityAction?.type ?? 'delete'" @close="cancelCommodityAction" @approve="confirmCommodityAction" @cancel="cancelCommodityAction"></CalculumManageCommodityModal>
<CalculumManageCommodityModal v-if="showConfirmCustomColumnModal" :type="pendingCustomColumnAction?.type ?? 'delete'" :titleOverride="$t('home.analyze.customColumn.title')" :renameOverride="$t('home.analyze.customColumn.rename')" :removeOverride="$t('home.analyze.customColumn.remove')" @close="cancelCustomColumnAction" @approve="confirmCustomColumnAction" @cancel="cancelCustomColumnAction"></CalculumManageCommodityModal>
<div class="dropdown-op-container" ref="dropdownContainer">
  <div class="custom-spendfile-dropdown" v-for="option in optionsFilter" :key="getOptionId(option)" :class="{ 'dropdown-active': toggleDropdown(getOptionId(option)) }" :id="'dropdown-edit-program-option-'+getOptionId(option)">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
      <div class="dropdown-selected cursor-pointer" @click="toggleDropdownFn(getOptionId(option))"><span :title="option.text">{{ option.text }}</span><i class="fa-solid fa-chevron-down dropdown-arrow" v-if="option.btn"></i></div>
    </Tooltip>
    <Popup :anchor="'dropdown-edit-program-option-'+getOptionId(option)" :show="toggleDropdown(getOptionId(option))" popup-class="custom-dropdown-popup">
      <div class="custom-currency-dropdown d-flex flex-column">
        <div class="d-flex flex-column custom-currency-dropdown-all-currencies cursor-pointer">
          <HarmonizationAction v-if="option.keyId === 'harmonizationGroup'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></HarmonizationAction>
          <VcardAction v-if="option.keyId === 'vcardGroup'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></VcardAction>
          <FinancingAction v-if="option.keyId === 'financingGroup'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></FinancingAction>
          <SetTargetAction v-if="option.keyId === 'setTarget'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></SetTargetAction>
          <IncludeExcludeAction v-if="option.keyId === 'includeExclude'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></IncludeExcludeAction>
          <MovePhasesAction v-if="option.keyId === 'moveBetween'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></MovePhasesAction>
          <ExportPDFAction v-if="option.keyId === 'exportPdf'" :option="(option.keyId as ActionFromEditProgram)" :entityLevelTabSelected="levelOfGrid" @call-action="callStoreMenuAction"></ExportPDFAction>
          <ManageTeamAction v-if="option.keyId === 'manageTeam'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></ManageTeamAction>
          <ManageCommodityAction v-if="option.keyId === 'commodity' && toggleDropdown(getOptionId(option))" :key="commodityActionKey" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction" @request-confirm="handleCommodityConfirmRequest" :selectedProgramId="selectedProgramId"></ManageCommodityAction>
          <UpdateStatusAction v-if="option.keyId === 'updateStatus'" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></UpdateStatusAction>
          <ManageIndustryAction v-if="option.keyId === 'supplierIndustry' && toggleDropdown(getOptionId(option))" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></ManageIndustryAction>
          <ManageCreditRatingAction v-if="option.keyId === 'supplierCreditRating' && toggleDropdown(getOptionId(option))" :option="(option.keyId as ActionFromEditProgram)" @call-action="callStoreMenuAction"></ManageCreditRatingAction>
          <ManageUltimateParentAction v-if="option.keyId === 'supplierUltimateParent' && toggleDropdown(getOptionId(option))" :option="(option.keyId as ActionFromEditProgram)" :selectedProgramId="selectedProgramId" @call-action="callStoreMenuAction"></ManageUltimateParentAction>
          <ManageCustomColumnAction v-if="openCustomColumn(option) && toggleDropdown(getOptionId(option))" :option="(option.keyId as ActionFromEditProgram)" :selectedProgramId="selectedProgramId" :columnUuid="option.columnUuid!" :columnName="option.text" :columnType="option.columnType ?? 'text'" @call-action="callStoreMenuAction" @request-confirm="(action) => handleCustomColumnConfirmRequest(action, option.columnUuid!)"></ManageCustomColumnAction>
        </div>
      </div>
    </Popup>
  </div>
</div>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  toRefs,
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
import { useHomeStore } from "@/stores/home";
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import HarmonizationAction from "@/modules/components/grid/menuActions/HarmonizationAction.vue";
import VcardAction from "@/modules/components/grid/menuActions/VcardAction.vue";
import FinancingAction from "@/modules/components/grid/menuActions/FinancingAction.vue";
import SetTargetAction from "@/modules/components/grid/menuActions/SetTargetAction.vue";
import IncludeExcludeAction from "@/modules/components/grid/menuActions/IncludeExcludeAction.vue";
import MovePhasesAction from "@/modules/components/grid/menuActions/MovePhasesAction.vue";
import ExportPDFAction from "@/modules/components/grid/menuActions/ExportPDFAction.vue";
import ManageTeamAction from "@/modules/components/grid/menuActions/ManageTeamAction.vue";
import ManageCommodityAction from "@/modules/components/grid/menuActions/ManageCommodityAction.vue";
import ManageIndustryAction from "@/modules/components/grid/menuActions/ManageIndustryAction.vue";
import ManageCreditRatingAction from "@/modules/components/grid/menuActions/ManageCreditRatingAction.vue";
import ManageUltimateParentAction from "@/modules/components/grid/menuActions/ManageUltimateParentAction.vue";
import CalculumManageCommodityModal from "@/modules/components/CalculumManageCommodityModal.vue";
import CalculumModalConfirmAction from "@/modules/components/CalculumModalConfirmAction.vue";
import { useConfirmAllSpendModal, ACTIONS_REQUIRING_CONFIRMATION } from "@/composables/useConfirmAllSpendModal";
import ManageCustomColumnAction from "@/modules/components/grid/menuActions/ManageCustomColumnAction.vue";
import UpdateStatusAction from "@/modules/components/grid/menuActions/UpdateStatusAction.vue";
import { Popup } from "@progress/kendo-vue-popup";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useAnalyzeStore } from "@/stores/analyze";
import useCompany from "@/composables/useCompany";
import { ENTITY_LEVEL } from "@/utils";
import useUser from "@/services/user/composables/useUser";
interface OptionDropdown {
  keyId: ActionFromEditProgram;
  text: string;
  btn: boolean;
  selectedProgramId?: string | null;
  isCustomColumn?: boolean;
  columnUuid?: string;
  columnType?: "text" | "number" | "days" | "money";
}
interface DataDropdown {
  optionsDropdown: OptionDropdown[];
  selectedOptionId: string | null;
}
function openCustomColumn(option: OptionDropdown): boolean {
  return option.isCustomColumn === true;
}

// Returns a unique ID per option: prefixed columnUuid for custom columns, keyId for static ones
function getOptionId(option: OptionDropdown): string {
  if (option.isCustomColumn && option.columnUuid) {
    return `cc_${option.columnUuid}`;
  }
  return (option.keyId as string) ?? "";
}

export default defineComponent({
  name: "CalculumDropdownEditProgramOption",
  components: {
    iconTrash,
    HarmonizationAction,
    VcardAction,
    FinancingAction,
    SetTargetAction,
    IncludeExcludeAction,
    MovePhasesAction,
    ExportPDFAction,
    ManageTeamAction,
    ManageCommodityAction,
    ManageIndustryAction,
    ManageCreditRatingAction,
    ManageUltimateParentAction,
    ManageCustomColumnAction,
    CalculumManageCommodityModal,
    CalculumModalConfirmAction,
    UpdateStatusAction,
    Popup,
    Tooltip,
  },
  props: {
    hasHarmonization: { type: Boolean, required: false, default: false },
    hasFinancing: { type: Boolean, required: false, default: false },
    selectedProgramId: { type: String, required: true },
  },
  setup(props) {
    const gridMenuActionsStore = useGridMenuActionsStore();
    const homeStore = useHomeStore();
    const { usevCardGroupsEnabled } = useCompany();
    const { useFeatureVirtualCard, useFeatureDownloadPdfEntity, userIsSuperAdmin, userDataRoleEnabled } = useUser();
    const dropdownContainer = ref<HTMLElement | null>(null);
    const analyzeStore = useAnalyzeStore();
    const isHarmonization = computed(
      () => analyzeStore.getAllGroups.length > 0 && props.hasHarmonization,
    );
    const isFinancing = computed(
      () => analyzeStore.getAllFinancing.length > 0 && props.hasFinancing,
    );

    const hasVcard = computed(() => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
    });

    // Get selected tab from store
    const entityLevelTabSelected = computed(
      () => homeStore.getEntityLevelTabSelected,
    );
    const data = reactive<DataDropdown>({
      optionsDropdown: [
        { keyId: "vcardGroup", text: "VCard Groups", btn: true },
        { keyId: "setTarget", text: "Set Target", btn: true },
        { keyId: "financingGroup", text: "Financing Groups", btn: true },
        {
          keyId: "harmonizationGroup",
          text: "Harmonization Groups",
          btn: true,
        },
        { keyId: "updateStatus", text: "Update Status", btn: true },
        { keyId: "includeExclude", text: "Include / Exclude", btn: true },
        { keyId: "moveBetween", text: "Plan/Phases", btn: true },
        { keyId: "exportPdf", text: "Export to PDF", btn: true },
        { keyId: "manageTeam", text: "Procurement Team", btn: true },
        {
          keyId: "commodity",
          text: "Commodity",
          btn: true,
          selectedProgramId: props.selectedProgramId,
        },
        { keyId: "supplierIndustry", text: "Industry", btn: true },
        { keyId: "supplierCreditRating", text: "Credit Rating", btn: true },
        { keyId: "supplierUltimateParent", text: "Ultimate Parent", btn: true },
      ],
      selectedOptionId: null,
    });

    function toggleDropdownFn(id: string) {
      data.selectedOptionId = data.selectedOptionId === id ? null : id;
    }

    const toggleDropdown = computed(() => {
      return (id: string) => data.selectedOptionId === id;
    });

    const entityLevelToLevelOfGrid: Record<number, string> = {
      0: "spends",
      1: "suppliers",
      2: "parents",
    };
    const levelOfGrid = computed(() => {
      return entityLevelToLevelOfGrid[entityLevelTabSelected.value] ?? "spends";
    });
    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) => {
      const newPayload = { ...payload, isEmit, levelOfGrid: levelOfGrid.value };
      if (ACTIONS_REQUIRING_CONFIRMATION.has(keyId)) {
        data.selectedOptionId = null;
        requestConfirmation(() => {
          gridMenuActionsStore.changeAction(keyId, newPayload);
        });
        return;
      }
      gridMenuActionsStore.changeAction(keyId, newPayload);
      data.selectedOptionId = null;
    };

    // Handle click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        dropdownContainer.value &&
        !dropdownContainer.value.contains(target)
      ) {
        // Don't close when clicking inside a teleported Kendo popup
        if (target.closest?.(".custom-dropdown-popup")) return;
        data.selectedOptionId = null;
      }
    };
    const addCustomColumns = () => {
      analyzeStore.getProgramCustomColumns({
        programId: props.selectedProgramId,
        callbackSuccess: (callbackSuccessData: any) => {
          const resultData = callbackSuccessData.columns;
          const columns = Array.isArray(resultData) ? resultData : [];
          columns.forEach((col: any) => {
            data.optionsDropdown.push({
              keyId: "customColumn" as ActionFromEditProgram,
              text: col.name,
              btn: true,
              isCustomColumn: true,
              columnUuid: col.columnNumber,
              columnType: col.type ?? "text",
            });
          });
        },
        callbackError: () => {},
      });
    };
    onMounted(() => {
      document.addEventListener("click", handleClickOutside);
      addCustomColumns();
      if (props.hasHarmonization && analyzeStore.getAllGroups.length === 0) {
        analyzeStore.getProgramTermGroups({
          programId: props.selectedProgramId,
          callbackSuccess: (data: any) => analyzeStore.setGroups(data),
          callbackError: () => {},
        });
      }
      if (props.hasFinancing && analyzeStore.getAllFinancing.length === 0) {
        analyzeStore.getFinancingGroups({
          programId: props.selectedProgramId,
          callbackSuccess: (data: any) => analyzeStore.setFinancing(data),
          callbackError: () => {},
        });
      }
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleClickOutside);
    });
    const optionsFilter = computed(() => {
      let options = data.optionsDropdown;
      if (
        String(entityLevelTabSelected.value) ===
        String(ENTITY_LEVEL.SPEND_LINES)
      ) {
        options = options.filter((option) => option.keyId !== "exportPdf");
        options = options.filter((option) => option.keyId !== "supplierCreditRating");
      }
      // AB#19545 / AC-05. The supplier tab's PDF export hits the same gated endpoint as the
      // supplier card, so hide it when the company lacks the feature. Ultimate Parent is unaffected.
      if (
        String(entityLevelTabSelected.value) === String(ENTITY_LEVEL.SUPPLIERS) &&
        !useFeatureDownloadPdfEntity.value
      ) {
        options = options.filter((option) => option.keyId !== "exportPdf");
      }
      if (
        String(entityLevelTabSelected.value) !==
        String(ENTITY_LEVEL.SPEND_LINES)
      ) {
        options = options.filter((option) => option.keyId !== "updateStatus");
      }
      if (
        String(entityLevelTabSelected.value) ===
        String(ENTITY_LEVEL.ULTIMATE_PARENT)
      ) {
        options = options.filter(
          (option) => option.keyId !== "supplierUltimateParent",
        );
      }
      if (!isHarmonization.value) {
        options = options.filter(
          (option) => option.keyId !== "harmonizationGroup",
        );
      }
      if (!isFinancing.value) {
        options = options.filter((option) => option.keyId !== "financingGroup");
      }
      if (!hasVcard.value) {
        options = options.filter((option) => option.keyId !== "vcardGroup");
      }
      if (!userIsSuperAdmin.value) {
        options = options.filter(
          (option) =>
            option.keyId !== "supplierIndustry" &&
            option.keyId !== "supplierCreditRating" &&
            option.keyId !== "supplierUltimateParent",
        );
      }
      // AB#20307/FR-08: excluding/including (and, via the reason-required popup this now opens,
      // setting the exclusion reason) is restricted to Super Admin and Data Team - a new
      // restriction (includeExclude had no role gate here before this). The Reason *column* itself
      // stays visible to everyone (FR-09); only this toolbar action is hidden.
      if (!(userIsSuperAdmin.value || userDataRoleEnabled.value)) {
        options = options.filter((option) => option.keyId !== "includeExclude");
      }
      return options;
    });
    const { showConfirmAllSpendModal, confirmAllSpendAction, cancelAllSpendAction, requestConfirmation } = useConfirmAllSpendModal();

    const showConfirmCommodityModal = ref(false);
    const pendingCommodityAction = ref<{
      valueOld: string | null;
      valueNew: string | null;
      type: "edit" | "delete";
    } | null>(null);
    const commodityActionKey = ref(0);

    function handleCommodityConfirmRequest(action: {
      valueOld: string | null;
      valueNew: string | null;
      type: "edit" | "delete";
    }) {
      pendingCommodityAction.value = action;
      data.selectedOptionId = null;
      showConfirmCommodityModal.value = true;
    }

    function confirmCommodityAction() {
      showConfirmCommodityModal.value = false;
      if (!pendingCommodityAction.value) return;
      const { valueOld, valueNew } = pendingCommodityAction.value;
      pendingCommodityAction.value = null;
      analyzeStore.renameSpendFieldValue({
        programId: props.selectedProgramId,
        previousValue: valueOld,
        newValue: valueNew,
        callbackSuccess: () => {
          commodityActionKey.value++;
        },
        callbackError: (err: any) => {
          if (import.meta.env.DEV) console.error("confirmCommodityAction error:", err);
        },
      });
    }

    function cancelCommodityAction() {
      showConfirmCommodityModal.value = false;
      pendingCommodityAction.value = null;
      data.selectedOptionId = "commodity";
    }

    const showConfirmCustomColumnModal = ref(false);
    const pendingCustomColumnAction = ref<{
      valueOld: string | null;
      valueNew: string | null;
      type: "edit" | "delete";
      columnUuid: string;
      optionId: string;
    } | null>(null);

    function handleCustomColumnConfirmRequest(
      action: {
        valueOld: string | null;
        valueNew: string | null;
        type: "edit" | "delete";
      },
      columnUuid: string,
    ) {
      const optionId = `cc_${columnUuid}`;
      pendingCustomColumnAction.value = { ...action, columnUuid, optionId };
      data.selectedOptionId = null;
      showConfirmCustomColumnModal.value = true;
    }

    function confirmCustomColumnAction() {
      showConfirmCustomColumnModal.value = false;
      if (!pendingCustomColumnAction.value) return;
      const { valueOld, valueNew, columnUuid } =
        pendingCustomColumnAction.value;
      pendingCustomColumnAction.value = null;
      analyzeStore.renameCustomColumnValue({
        programId: props.selectedProgramId,
        columnNumber: columnUuid,
        previousValue: valueOld,
        newValue: valueNew,
        callbackSuccess: () => {},
        callbackError: (err: any) => {
          if (import.meta.env.DEV) console.error("confirmCustomColumnAction error:", err);
        },
      });
    }

    function cancelCustomColumnAction() {
      showConfirmCustomColumnModal.value = false;
      if (pendingCustomColumnAction.value) {
        data.selectedOptionId = pendingCustomColumnAction.value.optionId;
      }
      pendingCustomColumnAction.value = null;
    }

    return {
      ...toRefs(data),
      toggleDropdownFn,
      toggleDropdown,
      callStoreMenuAction,
      dropdownContainer,
      entityLevelTabSelected,
      optionsFilter,
      levelOfGrid,
      openCustomColumn,
      getOptionId,
      showConfirmAllSpendModal,
      confirmAllSpendAction,
      cancelAllSpendAction,
      showConfirmCommodityModal,
      pendingCommodityAction,
      commodityActionKey,
      handleCommodityConfirmRequest,
      confirmCommodityAction,
      cancelCommodityAction,
      showConfirmCustomColumnModal,
      pendingCustomColumnAction,
      handleCustomColumnConfirmRequest,
      confirmCustomColumnAction,
      cancelCustomColumnAction,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";

.dropdown-op-container {
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.custom-spendfile-dropdown {
  position: relative;
  cursor: pointer;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  background: white;
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
  min-width: 80px;

  &:hover {
    border-color: #667085;
  }

  &.dropdown-active {
    border: 1px solid $color-primary-300;
    box-shadow: 0px 0px 0px 4px #ffdfe4;
  }

  .dropdown-selected {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0.75rem;
    background: white;
    border-radius: 0.375rem;

    span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      color: #495057;
      font-weight: 400;
    }

    .dropdown-arrow {
      transition: transform 0.2s ease;
      margin-left: 8px;
      color: #6c757d;
      font-size: 0.75rem;
    }
  }
  &.dropdown-active .dropdown-arrow {
    transform: rotate(180deg);
  }
}
.currency-div {
  margin-top: 1.5rem;
}
.custom-currency-dropdown {
  background: #fff;
  border-radius: 8px;
  color: #000;
  border: 1px solid $color-gray-200;
  box-shadow:
    0px 4px 6px -2px rgba(16, 24, 40, 0.03),
    0px 12px 16px -4px rgba(16, 24, 40, 0.08);
  padding: 0.5rem;

  .all-currencies-container {
    width: 200px;

    .custom-currency-dropdown-all-currencies {
      overflow-y: scroll;
      background: #fff;
      max-height: 20vh;
    }
  }
}
.currency-item-container {
  padding: 10px 14px;
  border-radius: 8px;

  span {
    font-size: 14px;
  }

  &:hover {
    background: $color-gray-100;

    .check-svg {
      color: $color-primary-500;
    }
  }
}
</style>
