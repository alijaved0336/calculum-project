import { ref } from "vue";
import * as Routing from "@/services/router/Routing";

export interface UseClientGridRecalculationModalOptions {
  /**
   * Optional override for tests; defaults to Analyze programs panel route.
   */
  openProgramsPanel?: () => void;
}

/**
 * Recalculation modal visibility + navigate home Analyze programs on hide.
 */
export function useClientGridRecalculationModal(
  options: UseClientGridRecalculationModalOptions = {},
) {
  const showModalRecalculation = ref(false);

  function showRecalculation() {
    showModalRecalculation.value = true;
  }

  function hideModalRecalculation() {
    showModalRecalculation.value = false;
    const openPanel =
      options.openProgramsPanel ??
      Routing.home.analyze.openHomeAnalyzeProgramsPanel;
    openPanel();
  }

  return {
    showModalRecalculation,
    showRecalculation,
    hideModalRecalculation,
  };
}
