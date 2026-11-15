import { computed, ComputedRef, ref, Ref } from "vue";
import { EntityCard } from "@/types";
import type { NegotiationPtTargetModal } from "@/modules/home/entityCard/types";
import {
  ArrayUtils,
  isNullOrUndefined,
  isUndefined,
  NumberUtils,
  StringUtils,
} from "@/utils";
import { useEntityCardStore } from "@/stores/entityCard";
import { useAppStore } from "@/stores/app";
import { useToast } from "vue-toastification";
import type { GridColumnProps } from "@progress/kendo-vue-grid";

export interface UseNegotiationPaymentTermsTargetProps {
  companyId: string;
  companyType: string;
  programUuid: string;
}

export interface UseNegotiationPaymentTermsTargetOptions {
  props: Readonly<UseNegotiationPaymentTermsTargetProps>;
  selectedTabIndex: Ref<number>;
  spendFileVersionIdActive: ComputedRef<string>;
  spendProgramConfigs: Ref<
    EntityCard.SpendProgramConfigByProviderAPIResponse[]
  >;
  tabsDataTabSelected: ComputedRef<EntityCard.TabsData | null>;
  loadingApi: Ref<boolean>;
  columnsGrid: Ref<GridColumnProps[]>;
}

const useNegotiationPaymentTermsTarget = (
  options: UseNegotiationPaymentTermsTargetOptions,
) => {
  const {
    props,
    selectedTabIndex,
    spendFileVersionIdActive,
    spendProgramConfigs,
    tabsDataTabSelected,
    loadingApi,
    columnsGrid,
  } = options;

  const entityCardStore = useEntityCardStore();
  const toast = useToast();
  let currencyRate: number = useAppStore().getCurrencyAmount;

  const paymentTermsTargetModalIsShowing = ref(false);
  const paymentTermsTargetModalInputValue: Ref<number | null> = ref(null);
  const paymentTermsTargetModalGridSelectedRowsSpendLines: Ref<any[]> = ref([]);

  // Util to track an upd of the target payment terms
  const paymentTermsTargetTrackingNumber = ref(NumberUtils.getRandomInt());

  /**
   * Handles the click event of the chart line button shortcut.
   *
   * @param {string} chartName - The name of the chart.
   * @return {void}
   */
  function handleChartLineBtnShortcutClick(chartName: string): void {
    // Validate
    if (StringUtils.isEmpty(chartName)) return;

    // Show target payment terms modal
    if (chartName === "proposedTerms" || chartName === "targetTerms") {
      paymentTermsTargetModalIsShowing.value = true;
    }
  }

  // paymentTermsHandleInputValueChange
  function paymentTermsModalHandleInputValueChange(value: number) {
    paymentTermsTargetModalInputValue.value = value;
  }

  /**
   * Handle the change of selected rows in the payment terms modal.
   *
   * @param {SpendLine[]} selectedRowsValue - The selected rows.
   */
  function paymentTermsModalHandleGridRowSelectionChange(
    selectedRowsValue: any[],
  ) {
    paymentTermsTargetModalGridSelectedRowsSpendLines.value = [
      ...selectedRowsValue,
    ];
  }

  /**
   * Handle the click event of the save button in the payment terms modal.
   *
   * @return {void}
   */
  function paymentTermsModalHandleSaveButtonClicked(allChecked: boolean): void {
    paymentTermsTargetAPIUpdate(allChecked);
  }

  /**
   * Handle the click event of the save button in the payment terms modal.
   *
   * @return {void}
   */
  function paymentTermsModalHandleClearButtonClicked(
    allChecked: boolean,
  ): void {
    paymentTermsTargetAPIUpdate(allChecked);
  }

  /**
   * Handles the click event of the close button in the payment terms target modal.
   * Resets the input value, clears the selected spend line IDs in the grid if there are multiple spend program configurations,
   * and closes the modal.
   *
   * @return {void} This function does not return anything.
   */
  function paymentTermsTargetModalHandleCloseButtonClicked(): void {
    // Close modal
    paymentTermsTargetModalIsShowing.value = false;
  }

  /**
   * Updates the payment terms target via the API.
   *
   * @return {void}
   */
  function paymentTermsTargetAPIUpdate(allChecked: boolean): void {
    const programId = props.programUuid;

    // Target value
    const value = paymentTermsTargetModalInputValue.value;

    // Selected spend lines IDs
    let uuids: string[] = [];

    // There's only one spend line available
    if (spendProgramConfigs.value.length === 1) {
      uuids = [spendProgramConfigs.value[0].spendUUID];
    }
    // Multiple spend lines available
    // Spend line tabs selected
    else if (
      selectedTabIndex.value > 0 &&
      !isNullOrUndefined(tabsDataTabSelected.value)
    ) {
      uuids = [tabsDataTabSelected.value.spendUUID];
    }
    // Spend line tabs not selected
    else {
      uuids = paymentTermsTargetModalGridSelectedRowsSpendLines.value.map(
        (x: any) => x.spendUUID,
      );
    }

    // Program is required
    if (isNullOrUndefined(programId)) {
      return;
    }

    // IDs are required
    if (ArrayUtils.isEmpty(uuids)) {
      return;
    }

    // Target value is required. null or number
    if (isUndefined(value)) {
      return;
    }

    const changed = {
      key: "targetPaymentTerms",
      value,
    };

    const filters: {
      targetSpendFileVersionUuid: string;
      targetProgramUuid: string;
      currencyRate: number;
    } = {
      targetSpendFileVersionUuid: spendFileVersionIdActive.value,
      targetProgramUuid: StringUtils.removeIRI(programId),
      currencyRate,
    };

    const level: "spends" | "suppliers" | "parents" = "spends";

    if (allChecked) {
      uuids = [];
    }

    // Enable loading
    loadingApi.value = true;
    const params = {
      all: allChecked,
      filters,
      changed,
      uuids,
      level,
      entity: props.companyId,
      entityType: props.companyType,
      callbackSuccess: (callbackSuccessData: {
        result: string; // "success"
        changes: {
          programUuid: string;
          key: "targetPaymentTerms";
          value: string;
          uuids: string[];
          level: "spends" | "suppliers" | "parents";
        };
        recalculationInProgress: boolean;
        summary: {
          asConfigUuids: string[];
          processingTime: number;
          affectedCount: number;
          affectedConfigs: string[];
        };
      }) => {
        toast.success("The payment terms target was successfully updated");
        // US-18713 AC-01: saving a Target raised no signal at all, only this toast, so
        // the SCF tab had no way to learn its figures were stale.
        entityCardStore.bumpScfRefreshToken();
        paymentTermsTargetModalIsShowing.value = false;
        // Disable loading
        loadingApi.value = false;
      },
      callbackError: () => {
        toast.error("There was an error updating the payment terms target");
        // Disable loading
        loadingApi.value = false;
      },
    };
    entityCardStore.paymentTermsTargetAPIUpdate(params);
  }

  const ptTargetModal = computed<NegotiationPtTargetModal>(() => ({
    columnsGrid: columnsGrid.value,
    paymentTermsTargetModalInputValue:
      paymentTermsTargetModalInputValue.value,
  }));

  return {
    paymentTermsTargetModalIsShowing,
    paymentTermsTargetModalInputValue,
    paymentTermsTargetTrackingNumber,
    ptTargetModal,
    handleChartLineBtnShortcutClick,
    paymentTermsModalHandleInputValueChange,
    paymentTermsModalHandleGridRowSelectionChange,
    paymentTermsModalHandleSaveButtonClicked,
    paymentTermsModalHandleClearButtonClicked,
    paymentTermsTargetModalHandleCloseButtonClicked,
    paymentTermsTargetAPIUpdate,
  };
};

export default useNegotiationPaymentTermsTarget;
