import { translate } from "./translate";

export { translate };
export { default as StringUtils } from "./StringUtils";

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// Ported from apps/ap/src/utils/FormatData.ts (getNumberWithDecimals). AP's original reads a
// per-user locale preference from its own Pinia user store (useUserStore().getUserNumberFormatting),
// which design-system can't depend on - it isn't tied to any single app's stores. Callers that need
// that per-user preference pass it in as `locale`; it defaults to "en-US" like every other formatter
// already in this package.
export function getNumberWithDecimals(
  num: string | number | null | undefined,
  maximumFractionDigits = 2,
  locale = "en-US",
): string {
  if (isNullOrUndefined(num)) {
    num = 0;
  }

  if (typeof num === "number") {
    num = num.toString();
  }

  const options = {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, options).format(parseFloat(num));
}

// Ported from apps/ap/src/utils/gridCellRelated.ts (checkPropValue).
export function checkPropValue(value: unknown): boolean {
  return !!value && value !== "-";
}

// Ported from apps/ap/src/utils/FormatData.ts (getRegulationCountrySourceValue).
// Maps the regulatory country source sent by the backend to its display label.
// The backend value is "supplier" | "buyer" | "both" at spend level, and at
// supplier/parent level it can be a comma-joined distinct set (e.g. "buyer,supplier").
// Any value that involves more than one source ("both" or a comma-joined value)
// is collapsed to "Mixed".
export const getRegulationCountrySourceValue = (source: unknown): string => {
  if (typeof source !== "string" || source.trim() === "") {
    return "-";
  }
  const normalized = source.toLowerCase();
  if (normalized === "both" || normalized.includes(",")) {
    return translate.t("global.regulationCountrySource.mixed");
  }
  if (normalized === "supplier") {
    return translate.t("global.regulationCountrySource.supplier");
  }
  if (normalized === "buyer") {
    return translate.t("global.regulationCountrySource.buyer");
  }
  return "-";
};

export const MAX_TERMS_DAYS_CHARTS = 180;

export function getBarSize(value: number, maxValue: number) {
  const newSize = (value * 100) / maxValue;
  return newSize > 100 ? 100 : newSize;
}

export const setQuality = (level: number | null) => {
  if (level === null) {
    return ["na", "100%", "#ABAFB5"];
  }
  if (level <= 0.3) {
    return ["limited", "33%", "rgb(255, 44, 79)"];
  }
  if (level >= 0.31 && level <= 0.6) {
    return ["adequate", "66%", "rgb(244, 180, 0)"];
  }
  return ["substantial", "100%", "rgb(46, 157, 88)"];
};

/**
 * Translate confidence score label from API to display format
 * Accepts label string from API (veryLow, low, med, high, veryhigh, na)
 * Returns [label, percentage, color] array
 */
export const setConfidenceScore = (label: string | null | undefined) => {
  if (!label || label === "na") {
    return ["na", "100%", "rgb(171, 175, 181)"];
  }

  switch (label) {
    case "veryLow":
      return ["veryLow", "20%", "rgb(0, 0, 0)"];
    case "low":
      return ["low", "40%", "rgb(255, 44, 79)"];
    case "med":
      return ["med", "60%", "rgb(244, 180, 0)"];
    case "high":
      return ["high", "80%", "rgb(46, 157, 88)"];
    case "veryhigh":
      return ["veryhigh", "100%", "rgb(60, 134, 245)"];
    default:
      return ["na", "100%", "rgb(171, 175, 181)"];
  }
};
