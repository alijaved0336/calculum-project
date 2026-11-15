/**
 * Tests for useCalculatorScenarios — skip save while initial data is loading.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { reactive, ref } from "vue";

vi.mock("@/services/pinia/index", () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("@/modules/home/entityCard/api", () => ({}));
vi.mock("@/modules/home/analyze/api", () => ({}));
vi.mock("@/services/router/Routing", () => ({}));
vi.mock("@/stores/entityCard", () => ({ useEntityCardStore: vi.fn() }));

import { useEntityCardStore } from "@/stores/entityCard";
import useCalculatorForm, {
  type CalculatorFormCrossActions,
} from "@/modules/home/entityCard/composables/useCalculatorForm";
import useCalculatorScenarios from "@/modules/home/entityCard/composables/useCalculatorScenarios";
import type { DataInterface } from "@/modules/home/entityCard/types";

function makeData(): DataInterface {
  return reactive({
    tabsData: [],
    spendProgramConfigs: [],
    levelType: "supplier",
    selectedTabIndex: 0,
    allSpendsTab: false,
    tabs: [],
    spendConfigurationUuid: "config-1",
    belongtoProgram: false,
    loadingCalculation: false,
    loadingMatrix: false,
    loadingSpends: false,
    calculateTable: [],
    showNewScenarioModalTitle: false,
    newScenarioModalTitle: "",
    showScenarios: false,
    scenariosByConfig: [],
    selectedScenario: null,
    someScenarioApiRequest: false,
    deletingScenario: false,
    forecastVolumeApplied: false,
  });
}

describe("useCalculatorScenarios — skip save while initial data loading", () => {
  let calculatorSaveData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    calculatorSaveData = vi.fn();
    vi.mocked(useEntityCardStore).mockReturnValue({
      calculatorSaveData,
      calculatorSaveNewScenario: vi.fn(),
      calculatorUpdateScenario: vi.fn(),
      getScenariosByConfig: vi.fn(),
      deleteScenario: vi.fn(),
    } as any);
  });

  it("does not call calculatorSaveData while initial data is loading", () => {
    const data = makeData();
    const cross: CalculatorFormCrossActions = {
      callDatasAPIRead: vi.fn(),
      applySelectedScenario: vi.fn(),
      calculatorSaveOnClick: vi.fn(),
    };
    const form = useCalculatorForm({
      data,
      props: { potentialTheme: false, programUuid: "/api/programs/1" },
      translate: { t: (key: string) => key },
      calculateDataData: ref(null),
      calculatorDefaultTypes: ref(null),
      calculatorSavedValues: ref(null),
      calculatorValuesInitialDataIsLoading: ref(true),
      userInputIsDirty: ref(false),
      cross,
    });

    const scenarios = useCalculatorScenarios({
      data,
      props: { companyId: "company-1", programUuid: "/api/programs/1" },
      translate: { t: (key: string) => key },
      toast: { success: vi.fn(), error: vi.fn() },
      calculateDataData: ref(null),
      calculatorValuesInitialDataIsLoading: ref(true),
      calculatorValuesIsSaving: ref(false),
      userInputIsDirty: ref(false),
      form,
    });

    scenarios.calculatorSaveOnClick();

    expect(calculatorSaveData).not.toHaveBeenCalled();
  });
});
