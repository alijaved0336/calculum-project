/**
 * Tests for useCalculatorSpendTabs — tab select updates index and resets
 * scenario fields on the shared shell `data` (by reference).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { reactive } from "vue";

vi.mock("@/services/pinia/index", () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("@/modules/home/entityCard/api", () => ({}));
vi.mock("@/modules/home/analyze/api", () => ({}));
vi.mock("@/services/router/Routing", () => ({}));
vi.mock("@/stores/entityCard", () => ({ useEntityCardStore: vi.fn() }));

import { useEntityCardStore } from "@/stores/entityCard";
import useCalculatorSpendTabs from "@/modules/home/entityCard/composables/useCalculatorSpendTabs";
import type { DataInterface } from "@/modules/home/entityCard/types";

function makeData(): DataInterface {
  return reactive({
    tabsData: [
      {
        id: "0",
        alias: "All spends",
        uuid: "cfg-all",
        spendUUID: "spend-all",
        disabled: false,
      },
      {
        id: "1",
        alias: "Spend line",
        uuid: "cfg-1",
        spendUUID: "spend-1",
        disabled: false,
      },
    ],
    spendProgramConfigs: [],
    levelType: "supplier",
    selectedTabIndex: 0,
    allSpendsTab: true,
    tabs: [],
    spendConfigurationUuid: "cfg-all",
    belongtoProgram: true,
    loadingCalculation: false,
    loadingMatrix: false,
    loadingSpends: false,
    calculateTable: [],
    showNewScenarioModalTitle: false,
    newScenarioModalTitle: "",
    showScenarios: true,
    scenariosByConfig: [{ "@id": "scenario-1", name: "Scenario 1" }],
    selectedScenario: "scenario-1",
    someScenarioApiRequest: false,
    deletingScenario: false,
    forecastVolumeApplied: false,
  }) as DataInterface;
}

describe("useCalculatorSpendTabs", () => {
  beforeEach(() => {
    vi.mocked(useEntityCardStore).mockReturnValue({
      postSpendsBySupplierAndButProgram: vi.fn(),
    } as any);
  });

  it("on tab select, updates selectedTabIndex and clears scenario list state on data", () => {
    const data = makeData();
    const spendTabs = useCalculatorSpendTabs({
      data,
      props: {
        companyId: "company-1",
        companyType: "supplier",
        programUuid: "/api/programs/1",
      },
      translate: { t: (key: string) => key },
    });

    spendTabs.entityCardNegotiationTabsOnTabSelect({
      selected: 1,
    } as any);

    expect(data.selectedTabIndex).toBe(1);
    expect(data.scenariosByConfig).toEqual([]);
    expect(data.someScenarioApiRequest).toBe(true);
    expect(data.selectedScenario).toBeNull();
  });

  it("tabsDataTabSelected follows selectedTabIndex on the shared data object", () => {
    const data = makeData();
    const spendTabs = useCalculatorSpendTabs({
      data,
      props: {
        companyId: "company-1",
        companyType: "supplier",
        programUuid: "/api/programs/1",
      },
      translate: { t: (key: string) => key },
    });

    expect(spendTabs.tabsDataTabSelected.value?.spendUUID).toBe("spend-all");

    data.selectedTabIndex = 1;

    expect(spendTabs.tabsDataTabSelected.value?.spendUUID).toBe("spend-1");
  });
});
