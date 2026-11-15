/**
 * Unit tests for Payment Terms vs Price calculator domain helpers.
 * Table-tests empty, null, boundary, manual vs standard, vCard vs scf vs neither.
 */

import { describe, it, expect } from "vitest";
import {
  BUYER_CHANGE_IN_TERMS_MIN_MAX,
  BUYER_PRICE_CHANGE_MAX,
  BUYER_PRICE_CHANGE_MIN,
  buildAdditionalFields,
  buildCalculateDataParams,
  buildCalculateTableParams,
  buildCalculatorSaveParams,
  buildManualOrStandardScope,
  buildScfAdditionalFields,
  buildVCardAdditionalFields,
  clampMin,
  clampNumber,
  hasBuyerEmptyValues,
  isBuyerTaxRateEmpty,
  isBuyerWaccEmpty,
  isManualInputMode,
  mapCalculatorChartRows,
  shouldShowSpendVolumeForm,
  shouldShowTabsInfo,
  shouldRunCalculatorNetworkCalls,
  shouldSkipCalculatorActionWhileInitialDataLoading,
  SUPPLIER_TAX_RATE_MIN_MAX,
  type CalculatorAdditionalFieldValues,
} from "@/modules/home/entityCard/utils/calculatorUtils";

const additionalFieldValues: CalculatorAdditionalFieldValues = {
  vCard: {
    groupName: "v-group",
    paymentCycleFloat: 3,
    rebate: 0.02,
    supplierCardCost: 0.01,
  },
  scf: {
    earliestDayPaid: 15,
    financingRate: 0.05,
    groupName: "s-group",
    scfRate: 0.03,
  },
};

describe("calculatorUtils — isManualInputMode", () => {
  it.each([
    { potentialTheme: true, programUuid: "", expected: true, title: "potential with empty program" },
    { potentialTheme: true, programUuid: null, expected: true, title: "potential with null program" },
    { potentialTheme: true, programUuid: undefined, expected: true, title: "potential with undefined program" },
    { potentialTheme: false, programUuid: "", expected: false, title: "standard with empty program" },
    { potentialTheme: false, programUuid: "/api/programs/123", expected: false, title: "standard with program" },
    { potentialTheme: true, programUuid: "/api/programs/123", expected: false, title: "potential AF-1 with program" },
  ])("$title", ({ potentialTheme, programUuid, expected }) => {
    expect(isManualInputMode(potentialTheme, programUuid)).toBe(expected);
  });
});

describe("calculatorUtils — shouldShowSpendVolumeForm", () => {
  it.each([
    { potentialTheme: true, expected: true, title: "potential (manual or AF-1)" },
    { potentialTheme: false, expected: false, title: "standard supplier" },
  ])("$title", ({ potentialTheme, expected }) => {
    expect(shouldShowSpendVolumeForm(potentialTheme)).toBe(expected);
  });
});

describe("calculatorUtils — empty-value gates", () => {
  describe("hasBuyerEmptyValues", () => {
    it.each([
      { emptyValues: null, expected: false, title: "null" },
      { emptyValues: undefined, expected: false, title: "undefined" },
      { emptyValues: {}, expected: false, title: "empty object" },
      { emptyValues: { taxRate: true }, expected: true, title: "taxRate flag" },
      { emptyValues: { wacc: true, taxRate: false }, expected: true, title: "populated object" },
    ])("$title", ({ emptyValues, expected }) => {
      expect(hasBuyerEmptyValues(emptyValues)).toBe(expected);
    });
  });

  describe("isBuyerTaxRateEmpty / isBuyerWaccEmpty", () => {
    it("treats missing emptyValues as empty tax and wacc (matches shell)", () => {
      expect(isBuyerTaxRateEmpty(null)).toBe(true);
      expect(isBuyerTaxRateEmpty(undefined)).toBe(true);
      expect(isBuyerWaccEmpty(null)).toBe(true);
      expect(isBuyerWaccEmpty(undefined)).toBe(true);
    });

    it("is empty when the flag is missing on the object", () => {
      expect(isBuyerTaxRateEmpty({})).toBe(true);
      expect(isBuyerWaccEmpty({})).toBe(true);
    });

    it("is not empty when the flag is present (including false)", () => {
      expect(isBuyerTaxRateEmpty({ taxRate: false })).toBe(false);
      expect(isBuyerTaxRateEmpty({ taxRate: true })).toBe(false);
      expect(isBuyerWaccEmpty({ wacc: false })).toBe(false);
      expect(isBuyerWaccEmpty({ wacc: true })).toBe(false);
    });
  });
});

describe("calculatorUtils — shouldShowTabsInfo", () => {
  const shown = {
    isManualInputMode: false,
    calculatorValuesInitialDataIsLoading: false,
    loadingCalculation: false,
    loadingSpends: false,
    buyerHasEmptyValues: true,
  };

  it("is true only when not manual, not loading, and buyer has empty values", () => {
    expect(shouldShowTabsInfo(shown)).toBe(true);
  });

  it.each([
    { patch: { isManualInputMode: true }, title: "manual mode" },
    { patch: { calculatorValuesInitialDataIsLoading: true }, title: "initial data loading" },
    { patch: { loadingCalculation: true }, title: "calculation loading" },
    { patch: { loadingSpends: true }, title: "spends loading" },
    { patch: { buyerHasEmptyValues: false }, title: "no empty values" },
  ])("is false when $title", ({ patch }) => {
    expect(shouldShowTabsInfo({ ...shown, ...patch })).toBe(false);
  });
});

describe("calculatorUtils — clamps", () => {
  it.each([
    { value: -400, min: -365, max: 365, expected: -365, title: "below min" },
    { value: 400, min: -365, max: 365, expected: 365, title: "above max" },
    { value: 0, min: -365, max: 365, expected: 0, title: "inside range" },
    { value: -365, min: -365, max: 365, expected: -365, title: "at min boundary" },
    { value: 365, min: -365, max: 365, expected: 365, title: "at max boundary" },
    { value: -1.1, min: BUYER_PRICE_CHANGE_MIN, max: BUYER_PRICE_CHANGE_MAX, expected: -1, title: "price change below min" },
    { value: 1.1, min: BUYER_PRICE_CHANGE_MIN, max: BUYER_PRICE_CHANGE_MAX, expected: 1, title: "price change above max" },
    { value: -0.01, min: SUPPLIER_TAX_RATE_MIN_MAX.min, max: SUPPLIER_TAX_RATE_MIN_MAX.max, expected: 0, title: "tax rate below 0" },
  ])("$title", ({ value, min, max, expected }) => {
    expect(clampNumber(value, min, max)).toBe(expected);
  });

  it("clampMin only applies a floor", () => {
    expect(clampMin(-1, 0)).toBe(0);
    expect(clampMin(0, 0)).toBe(0);
    expect(clampMin(12, 0)).toBe(12);
  });

  it("exports the NumericTextBox bounds used by the shell (unchanged)", () => {
    expect(BUYER_CHANGE_IN_TERMS_MIN_MAX).toEqual({ min: -365, max: 365 });
    expect(BUYER_PRICE_CHANGE_MIN).toBe(-1);
    expect(BUYER_PRICE_CHANGE_MAX).toBe(1);
    expect(SUPPLIER_TAX_RATE_MIN_MAX).toEqual({ min: 0, max: 1 });
  });
});

describe("calculatorUtils — additionalFields (vCard groupName mismatch)", () => {
  it("table and save vCard include groupName; data vCard omits groupName", () => {
    const table = buildAdditionalFields("vCard", additionalFieldValues, "table");
    const save = buildAdditionalFields("vCard", additionalFieldValues, "save");
    const data = buildAdditionalFields("vCard", additionalFieldValues, "data");

    expect(table).toEqual({
      groupName: "v-group",
      paymentCycleFloat: 3,
      rebate: 0.02,
      supplierCardCost: 0.01,
    });
    expect(save).toEqual(table);
    expect(data).toEqual({
      paymentCycleFloat: 3,
      rebate: 0.02,
      supplierCardCost: 0.01,
    });
    expect(data).not.toHaveProperty("groupName");
  });

  it("table and save scf include groupName; data scf omits groupName", () => {
    const table = buildAdditionalFields("scf", additionalFieldValues, "table");
    const save = buildAdditionalFields("scf", additionalFieldValues, "save");
    const data = buildAdditionalFields("scf", additionalFieldValues, "data");

    expect(table).toEqual({
      earliestDayPaid: 15,
      financingRate: 0.05,
      groupName: "s-group",
      scfRate: 0.03,
    });
    expect(save).toEqual(table);
    expect(data).toEqual({
      earliestDayPaid: 15,
      financingRate: 0.05,
      scfRate: 0.03,
    });
    expect(data).not.toHaveProperty("groupName");
  });

  it("returns null for none / unknown calculation type", () => {
    expect(buildAdditionalFields("none", additionalFieldValues, "table")).toBeNull();
    expect(buildAdditionalFields("none", additionalFieldValues, "data")).toBeNull();
    expect(buildAdditionalFields("none", additionalFieldValues, "save")).toBeNull();
    expect(buildAdditionalFields("", additionalFieldValues, "table")).toBeNull();
  });

  it("buildVCardAdditionalFields / buildScfAdditionalFields honor includeGroupName", () => {
    expect(
      buildVCardAdditionalFields(additionalFieldValues.vCard, true),
    ).toHaveProperty("groupName", "v-group");
    expect(
      buildVCardAdditionalFields(additionalFieldValues.vCard, false),
    ).not.toHaveProperty("groupName");
    expect(
      buildScfAdditionalFields(additionalFieldValues.scf, true),
    ).toHaveProperty("groupName", "s-group");
    expect(
      buildScfAdditionalFields(additionalFieldValues.scf, false),
    ).not.toHaveProperty("groupName");
  });
});

describe("calculatorUtils — payload builders", () => {
  const shared = {
    additionalFieldValues,
    currency: "USD",
    currencyRate: 1,
    level: "supplier" as const,
    supplierTaxRate: 0.35,
    supplierUUID: "company-1",
    supplierWacc: 0.09,
    contractualPaymentTerms: 45,
    configUUID: "config-1",
    programUUID: "program-1",
    spendVolumeChange: 0 as number | null | undefined,
  };

  it("buildManualOrStandardScope uses contractualPaymentTerms in manual mode", () => {
    expect(
      buildManualOrStandardScope({
        isManualInputMode: true,
        contractualPaymentTerms: 45,
        configUUID: "config-1",
        programUUID: "program-1",
      }),
    ).toEqual({ contractualPaymentTerms: 45 });
  });

  it("buildManualOrStandardScope uses configUUID + programUUID in standard mode", () => {
    expect(
      buildManualOrStandardScope({
        isManualInputMode: false,
        contractualPaymentTerms: 45,
        configUUID: "config-1",
        programUUID: "program-1",
      }),
    ).toEqual({ configUUID: "config-1", programUUID: "program-1" });
  });

  it("table payload is type table, includes vCard groupName, omits changeInTerms/priceChange", () => {
    const params = buildCalculateTableParams({
      ...shared,
      calculationType: "vCard",
      isManualInputMode: false,
    });

    expect(params.type).toBe("table");
    expect(params).not.toHaveProperty("changeInTerms");
    expect(params).not.toHaveProperty("priceChange");
    expect(params.additionalFields).toHaveProperty("groupName", "v-group");
    expect(params.configUUID).toBe("config-1");
    expect(params.programUUID).toBe("program-1");
    expect(params).not.toHaveProperty("spendVolume");
  });

  it("data payload is type data, omits vCard groupName, includes changeInTerms/priceChange", () => {
    const params = buildCalculateDataParams({
      ...shared,
      calculationType: "vCard",
      changeInTerms: 10,
      priceChange: 0.02,
      isManualInputMode: false,
    });

    expect(params.type).toBe("data");
    expect(params.changeInTerms).toBe(10);
    expect(params.priceChange).toBe(0.02);
    expect(params.additionalFields).not.toHaveProperty("groupName");
    expect(params).not.toHaveProperty("spendVolume");
  });

  it("manual table/data payloads send contractualPaymentTerms and omit config/program", () => {
    const table = buildCalculateTableParams({
      ...shared,
      calculationType: "none",
      isManualInputMode: true,
    });
    const data = buildCalculateDataParams({
      ...shared,
      calculationType: "none",
      changeInTerms: 0,
      priceChange: 0,
      isManualInputMode: true,
    });

    expect(table).toEqual(
      expect.objectContaining({
        contractualPaymentTerms: 45,
        additionalFields: null,
        type: "table",
      }),
    );
    expect(table).not.toHaveProperty("configUUID");
    expect(table).not.toHaveProperty("programUUID");
    expect(data).toEqual(
      expect.objectContaining({
        contractualPaymentTerms: 45,
        additionalFields: null,
        type: "data",
      }),
    );
    expect(data).not.toHaveProperty("configUUID");
    expect(data).not.toHaveProperty("programUUID");
  });

  it.each([
    { spendVolumeChange: 1500, included: true, title: "nonzero change" },
    { spendVolumeChange: -750, included: true, title: "negative change" },
    { spendVolumeChange: 0, included: false, title: "default 0" },
    { spendVolumeChange: null, included: false, title: "null" },
    { spendVolumeChange: undefined, included: false, title: "undefined" },
  ])("spendVolume $title", ({ spendVolumeChange, included }) => {
    const table = buildCalculateTableParams({
      ...shared,
      calculationType: "none",
      isManualInputMode: false,
      spendVolumeChange,
    });
    const data = buildCalculateDataParams({
      ...shared,
      calculationType: "none",
      changeInTerms: 0,
      priceChange: 0,
      isManualInputMode: false,
      spendVolumeChange,
    });

    if (included) {
      expect(table).toHaveProperty("spendVolume", spendVolumeChange);
      expect(data).toHaveProperty("spendVolume", spendVolumeChange);
    } else {
      expect(table).not.toHaveProperty("spendVolume");
      expect(data).not.toHaveProperty("spendVolume");
    }
  });

  it("save payload nested calculatorValues includes vCard groupName", () => {
    const params = buildCalculatorSaveParams({
      additionalFieldValues,
      calculationType: "vCard",
      changeInTerms: 5,
      priceChange: 0.01,
      supplierTaxRate: 0.35,
      supplierWacc: 0.09,
      spendVolumeChange: 0,
      supplierUUID: "company-1",
      configUUID: "config-1",
      programUUID: "program-1",
      level: "supplier",
      name: "Scenario A",
      scenarioId: null,
    });

    expect(params.calculatorValues.additionalFields).toHaveProperty(
      "groupName",
      "v-group",
    );
    expect(params.calculatorValues).not.toHaveProperty("spendVolume");
    expect(params.name).toBe("Scenario A");
  });

  it("save payload includes spendVolume only when changed", () => {
    const withVolume = buildCalculatorSaveParams({
      additionalFieldValues,
      calculationType: "none",
      changeInTerms: 0,
      priceChange: 0,
      supplierTaxRate: 0.35,
      supplierWacc: 0.09,
      spendVolumeChange: 200,
      supplierUUID: "company-1",
      configUUID: "config-1",
      programUUID: "program-1",
      level: "supplier",
      name: "",
      scenarioId: "scenario-1",
    });

    expect(withVolume.calculatorValues).toHaveProperty("spendVolume", 200);
  });
});

describe("calculatorUtils — mapCalculatorChartRows", () => {
  it.each([
    { rows: null, title: "null" },
    { rows: undefined, title: "undefined" },
    { rows: [], title: "empty array" },
  ])("returns empty axes for $title", ({ rows }) => {
    expect(mapCalculatorChartRows(rows)).toEqual({ xAxis: [], yAxis: [] });
  });

  it("maps value to xAxis and raw name to yAxis (no i18n)", () => {
    expect(
      mapCalculatorChartRows([
        { value: "10", name: "buyer" },
        { value: "20", name: "supplier" },
      ]),
    ).toEqual({
      xAxis: [10, 20],
      yAxis: ["buyer", "supplier"],
    });
  });
});

describe("calculatorUtils — skip apply/save/calculate-data while initial data loading", () => {
  it.each([
    { loading: true, expected: true, title: "skips while loading" },
    { loading: false, expected: false, title: "does not skip after load" },
  ])("$title", ({ loading, expected }) => {
    expect(shouldSkipCalculatorActionWhileInitialDataLoading(loading)).toBe(
      expected,
    );
  });
});

describe("calculatorUtils — teaser feature-flag network gate", () => {
  it.each([
    { flag: true, expected: true, title: "runs API when feature is on" },
    { flag: false, expected: false, title: "skips API when teaser" },
  ])("$title", ({ flag, expected }) => {
    expect(shouldRunCalculatorNetworkCalls(flag)).toBe(expected);
  });
});
