/**
 * Tests for useCalculatorApi — teaser short-circuit and skip calculate-data while loading.
 * Store HTTP stays on entityCard; this composable only wraps it.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { computed, reactive, ref } from "vue";

vi.mock("@/services/pinia/index", () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("@/modules/home/entityCard/api", () => ({}));
vi.mock("@/modules/home/analyze/api", () => ({}));
vi.mock("@/services/router/Routing", () => ({}));
vi.mock("@/stores/entityCard", () => ({ useEntityCardStore: vi.fn() }));

import { useEntityCardStore } from "@/stores/entityCard";
import useCalculatorApi from "@/modules/home/entityCard/composables/useCalculatorApi";
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
    spendConfigurationUuid: "config-1",
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

describe("useCalculatorApi", () => {
  let postGetCalculateData: ReturnType<typeof vi.fn>;
  let calculatorGetInitialData: ReturnType<typeof vi.fn>;
  let postSpendsBySupplierAndButProgram: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postGetCalculateData = vi.fn();
    calculatorGetInitialData = vi.fn();
    postSpendsBySupplierAndButProgram = vi.fn();
    vi.mocked(useEntityCardStore).mockReturnValue({
      postGetCalculateData,
      calculatorGetInitialData,
      postSpendsBySupplierAndButProgram,
    } as any);
  });

  function setup(options: {
    feature: boolean;
    loading: boolean;
    potentialTheme?: boolean;
    programUuid?: string;
  }) {
    const data = makeData();
    const cross: CalculatorFormCrossActions = {
      callDatasAPIRead: vi.fn(),
      applySelectedScenario: vi.fn(),
      calculatorSaveOnClick: vi.fn(),
    };
    const form = useCalculatorForm({
      data,
      props: {
        potentialTheme: options.potentialTheme ?? false,
        programUuid: options.programUuid ?? "/api/programs/1",
      },
      translate: { t: (key: string) => key },
      calculateDataData: ref(null),
      calculatorDefaultTypes: ref(null),
      calculatorSavedValues: ref(null),
      calculatorValuesInitialDataIsLoading: ref(options.loading),
      userInputIsDirty: ref(false),
      cross,
    });

    const initManualModeDefaults = vi.fn();
    const postSpends = vi.fn();

    const api = useCalculatorApi({
      data,
      props: {
        companyId: "company-1",
        potentialTheme: options.potentialTheme ?? false,
        programUuid: options.programUuid ?? "/api/programs/1",
      },
      translate: { t: (key: string) => key },
      calculateDataData: ref(null),
      calculatorDefaultTypes: ref(null),
      calculatorSavedValues: ref(null),
      calculatorValuesInitialDataIsLoading: ref(options.loading),
      getCurrency: () => "USD",
      getCurrencyRate: () => 1,
      useFeaturePaymentTermsvsPrice: ref(options.feature),
      tabsDataTabSelected: computed(() => null),
      spendVolumeCurrentFrozen: form.spendVolumeCurrentFrozen,
      form,
      onInitialDataLoaded: vi.fn(),
      initManualModeDefaults,
      postSpendsBySupplierAndButProgram: postSpends,
    });

    return { api, initManualModeDefaults, postSpends };
  }

  it("initCalls does not start API when the feature flag is off (teaser)", () => {
    const { api, initManualModeDefaults, postSpends } = setup({
      feature: false,
      loading: true,
    });

    api.initCalls();

    expect(initManualModeDefaults).not.toHaveBeenCalled();
    expect(postSpends).not.toHaveBeenCalled();
    expect(calculatorGetInitialData).not.toHaveBeenCalled();
    expect(postGetCalculateData).not.toHaveBeenCalled();
  });

  it("initCalls uses manual defaults in manual input mode when the feature is on", () => {
    const { api, initManualModeDefaults, postSpends } = setup({
      feature: true,
      loading: true,
      potentialTheme: true,
      programUuid: "",
    });

    api.initCalls();

    expect(initManualModeDefaults).toHaveBeenCalledTimes(1);
    expect(postSpends).not.toHaveBeenCalled();
  });

  it("initCalls loads spend tabs for a standard supplier when the feature is on", () => {
    const { api, initManualModeDefaults, postSpends } = setup({
      feature: true,
      loading: true,
    });

    api.initCalls();

    expect(postSpends).toHaveBeenCalledTimes(1);
    expect(initManualModeDefaults).not.toHaveBeenCalled();
  });

  it("getCalculateDataAPIRead does not call the store while initial data is loading", () => {
    const { api } = setup({ feature: true, loading: true });

    api.getCalculateDataAPIRead();

    expect(postGetCalculateData).not.toHaveBeenCalled();
  });

  it("callDatasAPIRead does not call the store when the feature flag is off", () => {
    const { api } = setup({ feature: false, loading: false });

    api.callDatasAPIRead();

    expect(postGetCalculateData).not.toHaveBeenCalled();
  });
});
