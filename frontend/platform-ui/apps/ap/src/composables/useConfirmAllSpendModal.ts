import { ref } from "vue";
import type { ActionFromEditProgram } from "@/modules/components/types";

export const ACTIONS_REQUIRING_CONFIRMATION = new Set<ActionFromEditProgram>([
  "manageTeam",
  "commodity",
  "supplierIndustry",
  "supplierCreditRating",
  "supplierUltimateParent",
  "supplierDso",
  "supplierRevenueGrowth",
  "customColumn",
]);

export function useConfirmAllSpendModal() {
  const showConfirmAllSpendModal = ref(false);
  const pendingAllSpendAction = ref<(() => void) | null>(null);

  function confirmAllSpendAction() {
    showConfirmAllSpendModal.value = false;
    pendingAllSpendAction.value?.();
    pendingAllSpendAction.value = null;
  }

  function cancelAllSpendAction() {
    showConfirmAllSpendModal.value = false;
    pendingAllSpendAction.value = null;
  }

  function requestConfirmation(action: () => void) {
    pendingAllSpendAction.value = action;
    showConfirmAllSpendModal.value = true;
  }

  return {
    showConfirmAllSpendModal,
    pendingAllSpendAction,
    confirmAllSpendAction,
    cancelAllSpendAction,
    requestConfirmation,
  };
}
