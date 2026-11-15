/**
 * Tests for useCalculatorForm — skip-apply while initial calculator data is loading.
 * Does not full-mount EntityCardCalculator.vue.
 */

import { describe, it, expect, vi } from "vitest";
import { reactive, ref } from "vue";

vi.mock("@/services/pinia/index", () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("@/modules/home/entityCard/api", () => ({}));
vi.mock("@/modules/home/analyze/api", () => ({}));
vi.mock("@/services/router/Routing", () => ({}));
vi.mock("@/stores/entityCard", () => ({ useEntityCardStore: vi.fn() }));

import useCalculatorForm, {
  type CalculatorFormCrossActions,
} from "@/modules/home/entityCard/composables/useCalculatorForm";
import type { DataInterface } from "@/modules/home/entityCard/types";

function makeData(): DataInterface {
  return reactive({
    tabsData: [],
    spendProgramConfigs: [],
    levelType: "supplier",
    selectedTabIndex: 0,
    allSpendsTab: false,
    tabs: [],
    spendConfigurationUuid: "",
    belongtoProgram: false,
    loadingCalculation: true,
    loadingMatrix: true,
    loadingSpends: true,
    calculateTable: [],
    showNewScenarioModalTitle: false,
    newScenarioModalTitle: "",
    showScenarios: false,
    scenariosByConfig: [],
    selectedScenario: null,
    someScenarioApiRequest: true,
    deletingScenario: false,
    forecastVolumeApplied: false,
  });
}

function setupForm(loading: boolean) {
  const callDatasAPIRead = vi.fn();
  const cross: CalculatorFormCrossActions = {
    callDatasAPIRead,
    applySelectedScenario: vi.fn(),
    calculatorSaveOnClick: vi.fn(),
  };

  const form = useCalculatorForm({
    data: makeData(),
    props: { potentialTheme: false, programUuid: "/api/programs/1" },
    translate: { t: (key: string) => key },
    calculateDataData: ref(null),
    calculatorDefaultTypes: ref(null),
    calculatorSavedValues: ref(null),
    calculatorValuesInitialDataIsLoading: ref(loading),
    userInputIsDirty: ref(false),
    cross,
  });

  return { form, callDatasAPIRead };
}

describe("useCalculatorForm — skip apply while initial data loading", () => {
  it("does not call callDatasAPIRead while initial data is loading", () => {
    const { form, callDatasAPIRead } = setupForm(true);

    form.calculatorApplyOnClick();

    expect(callDatasAPIRead).not.toHaveBeenCalled();
  });

  it("calls callDatasAPIRead after initial data has loaded", () => {
    const { form, callDatasAPIRead } = setupForm(false);

    form.calculatorApplyOnClick();

    expect(callDatasAPIRead).toHaveBeenCalledTimes(1);
  });
});
