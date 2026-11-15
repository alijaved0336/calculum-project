/**
 * Modal / refresh / notification event forwards for CalculumGridGraphql.
 */

export type GraphqlGridModalEmit = (
  event:
    | "showHarmonizationModal"
    | "resetApprovedValue"
    | "refresh-companies"
    | "show-spend-modal"
    | "showNotyError",
  ...args: unknown[]
) => void;

export interface UseGraphqlGridModalEmitsOptions {
  emit: GraphqlGridModalEmit;
}

export function useGraphqlGridModalEmits(
  options: UseGraphqlGridModalEmitsOptions,
) {
  function showHarmonizationModal() {
    options.emit("showHarmonizationModal");
  }

  function resetApprovedValue() {
    options.emit("resetApprovedValue");
  }

  function refreshCompanies() {
    options.emit("refresh-companies");
  }

  function showSpendModal(nameProgram: unknown) {
    options.emit("show-spend-modal", nameProgram);
  }

  function showNotyError() {
    options.emit("showNotyError");
  }

  return {
    showHarmonizationModal,
    resetApprovedValue,
    refreshCompanies,
    showSpendModal,
    showNotyError,
  };
}
