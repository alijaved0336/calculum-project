/**
 * Pure domain helpers for the Payment Terms vs Price calculator.
 * No Pinia, axios, or i18n — shell / later composables own stores, HTTP, and translate.
 */

import { shouldIncludeSpendVolumeInPayload } from "@/modules/home/entityCard/composables/useSpendVolumeCalculator";
import type {
  CalculationType,
  CalculatorValues,
} from "@/modules/home/entityCard/types";
import type { EntityType, ValueName, XAxisYAxis } from "@/types";

//
// Manual input / spend-volume gates
//

function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isManualInputMode(
  potentialTheme: boolean,
  programUuid: string | null | undefined,
): boolean {
  return (
    potentialTheme === true &&
    (programUuid === null || programUuid === undefined || programUuid === "")
  );
}

/** Spend Volume mini-form is gated by potentialTheme alone (manual and AF-1). */
export function shouldShowSpendVolumeForm(potentialTheme: boolean): boolean {
  return potentialTheme === true;
}

//
// Empty-value / tabs-info gates
//

export function hasBuyerEmptyValues(
  emptyValues: unknown,
): boolean {
  return (
    !isNullOrUndefined(emptyValues) &&
    Object.keys(emptyValues as object).length > 0
  );
}

export function isBuyerTaxRateEmpty(
  emptyValues: { taxRate?: unknown } | null | undefined,
): boolean {
  return isNullOrUndefined(emptyValues?.taxRate);
}

export function isBuyerWaccEmpty(
  emptyValues: { wacc?: unknown } | null | undefined,
): boolean {
  return isNullOrUndefined(emptyValues?.wacc);
}

export function shouldShowTabsInfo(flags: {
  isManualInputMode: boolean;
  calculatorValuesInitialDataIsLoading: boolean;
  loadingCalculation: boolean;
  loadingSpends: boolean;
  buyerHasEmptyValues: boolean;
}): boolean {
  return (
    !flags.isManualInputMode &&
    !flags.calculatorValuesInitialDataIsLoading &&
    !flags.loadingCalculation &&
    !flags.loadingSpends &&
    flags.buyerHasEmptyValues
  );
}

/**
 * Apply / save / calculate-data must not run while GET initial values is in flight.
 */
export function shouldSkipCalculatorActionWhileInitialDataLoading(
  calculatorValuesInitialDataIsLoading: boolean,
): boolean {
  return calculatorValuesInitialDataIsLoading === true;
}

/**
 * Feature flag off → TeaserView; skip calculator HTTP (initCalls / callDatasAPIRead).
 */
export function shouldRunCalculatorNetworkCalls(
  useFeaturePaymentTermsvsPrice: boolean,
): boolean {
  return useFeaturePaymentTermsvsPrice === true;
}

//
// Clamps / min-max (NumericTextBox bounds stay these same numbers)
//

export const BUYER_CHANGE_IN_TERMS_MIN_MAX = {
  min: -365,
  max: 365,
} as const;

export const BUYER_PRICE_CHANGE_MIN = -1;
export const BUYER_PRICE_CHANGE_MAX = 1;

export const SUPPLIER_TAX_RATE_MIN_MAX = {
  min: 0,
  max: 1,
} as const;

export const SUPPLIER_WACC_MIN_MAX = {
  min: 0,
  max: 1,
} as const;

export const VCARD_PAYMENT_CYCLE_FLOAT_MIN_MAX = {
  min: 0,
} as const;

export const VCARD_REBATE_MIN_MAX = {
  min: 0,
  max: 1,
} as const;

export const VCARD_SUPPLIER_CARD_COST_MIN_MAX = {
  min: 0,
  max: 1,
} as const;

export const SCF_EARLIEST_DAY_PAID_MIN_MAX = {
  min: 0,
} as const;

export const SCF_FINANCING_RATE_MIN_MAX = {
  min: 0,
  max: 1,
} as const;

export const SCF_RATE_MIN_MAX = {
  min: 0,
  max: 1,
} as const;

export function clampNumber(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

export function clampMin(value: number, min: number): number {
  if (value < min) {
    return min;
  }

  return value;
}

//
// Additional fields
//
// Table + save vCard/scf include groupName. Calculate-data vCard/scf omit it.
// That mismatch is intentional to preserve today's payloads — do not unify.
//

export type CalculatorVCardFieldValues = {
  groupName: string | null;
  paymentCycleFloat: number | null;
  rebate: number | null;
  supplierCardCost: number | null;
};

export type CalculatorScfFieldValues = {
  earliestDayPaid: number | null;
  financingRate: number | null;
  groupName: string | null;
  scfRate: number | null;
};

export type CalculatorAdditionalFieldValues = {
  vCard: CalculatorVCardFieldValues;
  scf: CalculatorScfFieldValues;
};

export type AdditionalFieldsKind = "data" | "table" | "save";

export type VCardAdditionalFieldsWithGroupName = CalculatorVCardFieldValues;
export type VCardAdditionalFieldsWithoutGroupName = Omit<
  CalculatorVCardFieldValues,
  "groupName"
>;
export type ScfAdditionalFieldsWithGroupName = CalculatorScfFieldValues;
export type ScfAdditionalFieldsWithoutGroupName = Omit<
  CalculatorScfFieldValues,
  "groupName"
>;

export type CalculatorAdditionalFieldsResult =
  | VCardAdditionalFieldsWithGroupName
  | VCardAdditionalFieldsWithoutGroupName
  | ScfAdditionalFieldsWithGroupName
  | ScfAdditionalFieldsWithoutGroupName
  | null;

export function buildVCardAdditionalFields(
  values: CalculatorVCardFieldValues,
  includeGroupName: boolean,
): VCardAdditionalFieldsWithGroupName | VCardAdditionalFieldsWithoutGroupName {
  if (includeGroupName) {
    return {
      groupName: values.groupName,
      paymentCycleFloat: values.paymentCycleFloat,
      rebate: values.rebate,
      supplierCardCost: values.supplierCardCost,
    };
  }

  return {
    paymentCycleFloat: values.paymentCycleFloat,
    rebate: values.rebate,
    supplierCardCost: values.supplierCardCost,
  };
}

export function buildScfAdditionalFields(
  values: CalculatorScfFieldValues,
  includeGroupName: boolean,
): ScfAdditionalFieldsWithGroupName | ScfAdditionalFieldsWithoutGroupName {
  if (includeGroupName) {
    return {
      earliestDayPaid: values.earliestDayPaid,
      financingRate: values.financingRate,
      groupName: values.groupName,
      scfRate: values.scfRate,
    };
  }

  return {
    earliestDayPaid: values.earliestDayPaid,
    financingRate: values.financingRate,
    scfRate: values.scfRate,
  };
}

/**
 * Per-type additionalFields. `kind: "data"` omits groupName; `"table"` and `"save"` include it.
 */
export function buildAdditionalFields(
  calculationType: string,
  values: CalculatorAdditionalFieldValues,
  kind: AdditionalFieldsKind,
): CalculatorAdditionalFieldsResult {
  const includeGroupName = kind !== "data";

  if (calculationType === "vCard") {
    return buildVCardAdditionalFields(values.vCard, includeGroupName);
  }

  if (calculationType === "scf") {
    return buildScfAdditionalFields(values.scf, includeGroupName);
  }

  return null;
}

//
// Payload builders — preserve each call site's current shape
//

export type ManualOrStandardScope =
  | { contractualPaymentTerms: number }
  | { configUUID: string; programUUID: string | undefined };

export function buildManualOrStandardScope(input: {
  isManualInputMode: boolean;
  contractualPaymentTerms: number;
  configUUID: string;
  programUUID: string | undefined;
}): ManualOrStandardScope {
  if (input.isManualInputMode) {
    return { contractualPaymentTerms: input.contractualPaymentTerms };
  }

  return { configUUID: input.configUUID, programUUID: input.programUUID };
}

export function withSpendVolumeIfChanged<T extends object>(
  params: T,
  spendVolumeChange: number | null | undefined,
): T & { spendVolume?: number } {
  if (!shouldIncludeSpendVolumeInPayload(spendVolumeChange)) {
    return params;
  }

  return { ...params, spendVolume: spendVolumeChange! };
}

export type BuildCalculateTableParamsInput = {
  additionalFieldValues: CalculatorAdditionalFieldValues;
  calculationType: string;
  currency: string;
  currencyRate: number;
  level: EntityType;
  supplierTaxRate: number;
  supplierUUID: string;
  supplierWacc: number;
  isManualInputMode: boolean;
  contractualPaymentTerms: number;
  configUUID: string;
  programUUID: string | undefined;
  spendVolumeChange: number | null | undefined;
};

export type CalculateTableParams = {
  additionalFields: CalculatorAdditionalFieldsResult;
  calculationType: string;
  configUUID?: string;
  contractualPaymentTerms?: number;
  currency: string;
  currencyRate: number;
  level: EntityType;
  programUUID?: string;
  spendVolume?: number;
  supplierTaxRate: number;
  supplierUUID: string;
  supplierWacc: number;
  type: string;
};

export function buildCalculateTableParams(
  input: BuildCalculateTableParamsInput,
): CalculateTableParams {
  const scope = buildManualOrStandardScope(input);

  return withSpendVolumeIfChanged(
    {
      additionalFields: buildAdditionalFields(
        input.calculationType,
        input.additionalFieldValues,
        "table",
      ),
      calculationType: input.calculationType,
      currency: input.currency,
      currencyRate: input.currencyRate,
      level: input.level,
      supplierTaxRate: input.supplierTaxRate,
      supplierUUID: input.supplierUUID,
      supplierWacc: input.supplierWacc,
      type: "table",
      ...scope,
    },
    input.spendVolumeChange,
  );
}

export type BuildCalculateDataParamsInput = {
  additionalFieldValues: CalculatorAdditionalFieldValues;
  calculationType: CalculationType;
  changeInTerms: number;
  currency: string;
  currencyRate: number;
  level: EntityType;
  priceChange: number;
  supplierTaxRate: number;
  supplierUUID: string;
  supplierWacc: number;
  isManualInputMode: boolean;
  contractualPaymentTerms: number;
  configUUID: string;
  programUUID: string | undefined;
  spendVolumeChange: number | null | undefined;
};

export type CalculateDataParams = {
  additionalFields: CalculatorAdditionalFieldsResult;
  calculationType: CalculationType;
  changeInTerms: number;
  configUUID?: string;
  contractualPaymentTerms?: number;
  currency: string;
  currencyRate: number;
  level: EntityType;
  priceChange: number;
  programUUID?: string;
  spendVolume?: number;
  supplierTaxRate: number;
  supplierUUID: string;
  supplierWacc: number;
  type: string;
};

export function buildCalculateDataParams(
  input: BuildCalculateDataParamsInput,
): CalculateDataParams {
  const scope = buildManualOrStandardScope(input);

  return withSpendVolumeIfChanged(
    {
      additionalFields: buildAdditionalFields(
        input.calculationType,
        input.additionalFieldValues,
        "data",
      ),
      calculationType: input.calculationType,
      changeInTerms: input.changeInTerms,
      currency: input.currency,
      currencyRate: input.currencyRate,
      level: input.level,
      priceChange: input.priceChange,
      supplierTaxRate: input.supplierTaxRate,
      supplierUUID: input.supplierUUID,
      supplierWacc: input.supplierWacc,
      type: "data",
      ...scope,
    },
    input.spendVolumeChange,
  );
}

export type BuildCalculatorSaveParamsInput = {
  additionalFieldValues: CalculatorAdditionalFieldValues;
  calculationType: CalculationType;
  changeInTerms: number;
  priceChange: number;
  supplierTaxRate: number;
  supplierWacc: number;
  spendVolumeChange: number | null | undefined;
  supplierUUID: string;
  configUUID: string;
  programUUID: string;
  level: EntityType;
  name: string;
  scenarioId: string | null;
};

export type CalculatorSaveParams = {
  configUUID: string;
  level: EntityType;
  programUUID: string;
  supplierUUID: string;
  name: string;
  scenarioId: string | null;
  calculatorValues: Omit<CalculatorValues, "additionalFields"> & {
    additionalFields: CalculatorAdditionalFieldsResult;
  };
};

export function buildCalculatorSaveParams(
  input: BuildCalculatorSaveParamsInput,
): CalculatorSaveParams {
  const calculatorValues = withSpendVolumeIfChanged(
    {
      additionalFields: buildAdditionalFields(
        input.calculationType,
        input.additionalFieldValues,
        "save",
      ),
      calculationType: input.calculationType,
      changeInTerms: input.changeInTerms,
      priceChange: input.priceChange,
      supplierTaxRate: input.supplierTaxRate,
      supplierWacc: input.supplierWacc,
    },
    input.spendVolumeChange,
  );

  return {
    supplierUUID: input.supplierUUID,
    configUUID: input.configUUID,
    programUUID: input.programUUID,
    level: input.level,
    name: input.name,
    scenarioId: input.scenarioId,
    calculatorValues,
  };
}

//
// Chart mapping — raw names; shell / composable applies translate.t
//

export function mapCalculatorChartRows(
  rows: ValueName[] | null | undefined,
): XAxisYAxis {
  if (
    isNullOrUndefined(rows) ||
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return {
      xAxis: [],
      yAxis: [],
    };
  }

  return {
    xAxis: rows.map((item) => Number(item.value)),
    yAxis: rows.map((item) => item.name),
  };
}
