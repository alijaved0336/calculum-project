import { Field } from "@/types";

export type PanelBarItemBodyType =
  | "multipleCheckboxes"
  | "radioButtonSelection"
  | "rangeSlider"
  | "treeView"
  | "cardsOption";

export interface PanelBarItemFieldConfig {
  body: PanelBarItemBodyType;
  id?: string;
  isBoxFilter?: boolean;
  /** Adds the ArrayUtils.hasOneValueAndIsEmpty check on top of the plain isEmpty guard. */
  strictEmptyGuard?: boolean;
  /** Adds the ArrayUtils.hasEmptyValues check (customDataPoint1-20 only). */
  excludeEmptyValues?: boolean;
  /** Only meaningful for body: "rangeSlider" - renders the header's "Clear" button. */
  showClearButton?: boolean;
}

const RADIO_BUTTON_SELECTION_FIELDS: Field[] = [
  "isSME",
  "isVCardApplied",
  "entityWomanOwnedBusiness",
  "entityEthnicMinorityOwnedBusiness",
  "entityVeteranOwnedBusiness",
];

const RANGE_SLIDER_FIELDS_WITHOUT_CLEAR_BUTTON: Field[] = [
  "contractualPaymentTermsWithoutCashDiscounts",
  "contractualPaymentTermsWithCashDiscounts",
  "actualPaymentTerms",
  "modelCashFlow",
  "volume",
  "forecastVolume",
];

const MULTIPLE_CHECKBOXES_STRICT_GUARD_FIELDS: Partial<
  Record<Field, { id: string; isBoxFilter?: boolean }>
> = {
  programApplied: { id: "programAppliedGlobalFilterCheckBoxesId" },
  currencyCode: { id: "currencyCodeCheckBoxesId" },
  box: { id: "boxCheckBoxesId", isBoxFilter: true },
  scfBox: { id: "scfBoxCheckBoxesId", isBoxFilter: true },
  financialBox: { id: "financialBoxCheckBoxesId", isBoxFilter: true },
  vCardBox: { id: "vCardBoxCheckBoxesId", isBoxFilter: true },
};

const CUSTOM_DATA_POINT_PATTERN = /^customDataPoint(\d+)$/;

/**
 * Resolves which body component (and which guard/clear-button variant of it) a given
 * global-filters field renders inside the PanelBar. Mirrors the per-field differences that
 * existed across the 33 near-identical `<template #field>` slots before they were collapsed
 * into GlobalFilterPanelBarItem.vue - see docs/context/change-mainlayoutfilters-panelbaritem-refactor.md.
 */
export function getPanelBarItemFieldConfig(field: Field): PanelBarItemFieldConfig {
  if (field === "entityCompanySize") {
    return { body: "cardsOption" };
  }

  if (field === "planPhaseNames") {
    return { body: "treeView" };
  }

  if (RADIO_BUTTON_SELECTION_FIELDS.includes(field)) {
    return { body: "radioButtonSelection" };
  }

  const customDataPointMatch = CUSTOM_DATA_POINT_PATTERN.exec(field);
  if (customDataPointMatch) {
    const pointNumber = Number(customDataPointMatch[1]);
    return pointNumber >= 21
      ? { body: "rangeSlider", showClearButton: true }
      : { body: "multipleCheckboxes", excludeEmptyValues: true };
  }

  if (field === "modelPaymentTerms") {
    return { body: "rangeSlider", showClearButton: true };
  }

  if (RANGE_SLIDER_FIELDS_WITHOUT_CLEAR_BUTTON.includes(field)) {
    return { body: "rangeSlider", showClearButton: false };
  }

  const strictGuardConfig = MULTIPLE_CHECKBOXES_STRICT_GUARD_FIELDS[field];
  if (strictGuardConfig) {
    return { body: "multipleCheckboxes", strictEmptyGuard: true, ...strictGuardConfig };
  }

  return { body: "multipleCheckboxes" };
}

const STATIC_PANEL_BAR_FIELDS: Field[] = [
  "commodity",
  "entityIndustryName",
  "buyerName",
  "entityRegion",
  "entityCountryName",
  "buyerCountry",
  "buyerRegion",
  "entityStockPerformanceMarketIndex",
  "teamName",
  "financings",
  "vCardGroupName",
  "cashDiscounts",
  "entityCompanySize",
  "isSME",
  "isVCardApplied",
  "entityWomanOwnedBusiness",
  "entityEthnicMinorityOwnedBusiness",
  "entityVeteranOwnedBusiness",
  "planPhaseNames",
  "modelPaymentTerms",
  "contractualPaymentTermsWithoutCashDiscounts",
  "contractualPaymentTermsWithCashDiscounts",
  "actualPaymentTerms",
  "modelCashFlow",
  "volume",
  "forecastVolume",
  "programApplied",
  "currencyCode",
  "box",
  "scfBox",
  "financialBox",
  "vCardBox",
];

const CUSTOM_DATA_POINT_RANGE_SLIDER_NUMBERS = [21, 22, 23, 24, 25, 26];

/**
 * Every field the PanelBar needs a named slot for: the 32 static fields plus the two dynamic
 * customDataPoint ranges (1..computedDataPoints as MultipleCheckboxes, 21..26 as RangeSliderKendo -
 * matches the two `v-for` slot blocks this replaces).
 */
export function getAllPanelBarFieldNames(computedDataPoints: number): Field[] {
  // Capped at 20: slots 21-26 are always the fixed range-slider fields below,
  // never MultipleCheckboxes - see getPanelBarItemFieldConfig's own `>= 21` split.
  const customDataPointFields = Array.from(
    { length: Math.min(computedDataPoints, 20) },
    (_, index) => `customDataPoint${index + 1}` as Field,
  );

  const customDataPointRangeSliderFields = CUSTOM_DATA_POINT_RANGE_SLIDER_NUMBERS.map(
    (n) => `customDataPoint${n}` as Field,
  );

  return [
    ...STATIC_PANEL_BAR_FIELDS,
    ...customDataPointFields,
    ...customDataPointRangeSliderFields,
  ];
}
