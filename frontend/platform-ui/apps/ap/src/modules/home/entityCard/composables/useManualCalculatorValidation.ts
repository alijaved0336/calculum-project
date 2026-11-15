/**
 * Pure validation helpers for the Payment Terms vs Price Calculator's
 * manual-input mode (potential suppliers with no spend data).
 */

export const MANUAL_CALCULATOR_DEFAULTS = {
  supplierWacc: 0.09,
  supplierTaxRate: 0.35,
  contractualPaymentTerms: 0,
  changeInTerms: 0,
  priceChange: 0,
} as const;

export type ManualCalculatorFieldKey = keyof typeof MANUAL_CALCULATOR_DEFAULTS;

export type ManualCalculatorFieldValues = Record<ManualCalculatorFieldKey, number | null | undefined>;

export type ManualCalculatorFieldErrors = Record<ManualCalculatorFieldKey, boolean>;

export function isManualFieldInvalid(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

export function validateManualCalculatorFields(
  values: ManualCalculatorFieldValues,
): { valid: boolean; errors: ManualCalculatorFieldErrors } {
  const errors = Object.fromEntries(
    (Object.keys(MANUAL_CALCULATOR_DEFAULTS) as ManualCalculatorFieldKey[]).map(
      (field) => [field, isManualFieldInvalid(values[field])],
    ),
  ) as ManualCalculatorFieldErrors;

  const valid = !Object.values(errors).some(Boolean);

  return { valid, errors };
}

export function createManualCalculatorFieldErrors(value = false): ManualCalculatorFieldErrors {
  return {
    supplierWacc: value,
    supplierTaxRate: value,
    contractualPaymentTerms: value,
    changeInTerms: value,
    priceChange: value,
  };
}
