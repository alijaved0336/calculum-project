import { createI18n } from "vue-i18n";
import { StringUtils, isNullOrUndefined } from "@/utils";
import { messages, defaultLocale } from "@ada/design-system/locales/index";
import * as colorsGroups from "@/utils/ColorsGroups";
import { useUserStore } from "@/stores/user";
import { useAppStore } from "@/stores/app";

const i18n = createI18n({
  messages,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true
});

export const translate = i18n.global;

// Function to get currency rate from Pinia store
export const getCurrencyRate = (): number => {
  try {
    const appStore = useAppStore();
    return appStore.getCurrencyAmount;
  } catch (error) {
    return 1; // fallback
  }
};

/**
 * Returns a string representation of a number with a specified number of decimal places.
 *
 * @param {string | number} num - The number to be formatted. If a number is provided, it will be converted to a string.
 * @param {number} [maximumFractionDigits=2] - The maximum number of decimal places to include in the formatted string. Default is 2.
 * @return {string} - The formatted number as a string.
 */
export const getNumberWithDecimals = (
  num: string | number | null | undefined,
  maximumFractionDigits = 2
): string => {

  if (isNullOrUndefined(num)) {
    num = 0
  }

  // If number is of type string number, convert it to a string
  if (typeof num === "number") {
    num = num.toString();
  }

  const options = {
    maximumFractionDigits: maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  };

  // Get user currency formatting preference
  const userStore = useUserStore();
  let finalFormatting = userStore.getUserNumberFormatting === 'undefined-undefined' ? "en-US" : userStore.getUserNumberFormatting

  return new Intl.NumberFormat(finalFormatting, options).format(
    parseFloat(num)
  );
};


export const converToPercentage = (number: number, digits: number = 2) => {
  if (isNaN(number)) {
    return '0%'
  }

  return `${(number * 100).toFixed(digits)}%`;
};


export const getFormattingInfoForGoogleChart = () => {
  // Add description for hard coded values
  const decimalSymbol = getNumberWithDecimals("111.11", 2)[3];
  const groupingSymbol = getNumberWithDecimals("11111.11", 2)[2];
  return { decimalSymbol, groupingSymbol };
};

export const getMonthDayAndYear = (date: string): string => {
  if (!date) return "N/A";
  
  let mDate: Date;
  
  // Si es string en formato YYYY-MM-DD, crear fecha local sin problemas de zona horaria
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    mDate = new Date(year, month - 1, day); // month es 0-indexed
  } else {
    mDate = new Date(date);
  }
  
  return !isNaN(mDate.getTime()) ? mDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).replace(/\//g, ".") : "N/A";
};

/**
 * Formats an ISO or date string as a human-readable relative time for activity feeds
 * (e.g. "Now", "5m ago", "18h ago", "3d ago", or a short absolute date after 7 days).
 *
 * @param dateString - ISO date string or any parseable date. Pass null/undefined for empty.
 * @returns Formatted string, or empty string if input is empty, or raw string on parse error.
 */
export function formatActivityRelativeDate(dateString: string | null | undefined): string {
  if (dateString == null || dateString === '') return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

export function getLevelBasedOnColor(color: string) {
  if (color === colorsGroups.low) {
    return 1;
  } else if (color === colorsGroups.medium) {
    return 2;
  } else if (color === colorsGroups.veryHigh) {
    return 3;
  } else {
    return 0;
  }
}

export function levelColorByLevel(level: number) {
  switch (level) {
    // Level 1 of 3
    case 1:
      return colorsGroups.low;
    case 2:
      return colorsGroups.medium;
    case 3:
      return colorsGroups.high;
    default:
      return colorsGroups.noLevel;
  }
}

export function levelByGradeLevelText(gradeLevelText: string): number {
  switch (gradeLevelText) {
    case "Low":
      return 1;
    case "Medium":
      return 2;
    case "High":
      return 3;
    default:
      return 0;
  }
}

export function getColorForTheLevelDashes(value: any) {
  if (value <= 0 && value <= 30) {
    return colorsGroups.low; // limited
  } else if (value > 30 && value <= 60) {
    return colorsGroups.medium; // adequete
  } else if ((value >= 61 && value <= 100) || value >= 100) {
    return colorsGroups.veryHigh; // substantial
  } else {
    return colorsGroups.noLevel;
  }
}

export const convertDateToPlanformat = (dateString: string): string => {
  const date = new Date(dateString);
  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: true
  };
  const timeFormatter = new Intl.DateTimeFormat("en-US", optionsTime);
  const time = timeFormatter.format(date);
  const optionsDate: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  };
  const dateFormatter = new Intl.DateTimeFormat("en-US", optionsDate);
  const formattedDate = dateFormatter.format(date).replace(/\//g, ".");
  return `${time}, ${formattedDate}`;
};

export const getMonthDay = (datetoconvert: string): string => {
  const date = new Date(datetoconvert);

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric"
  };
  const formattedDate = date.toLocaleDateString("en-US", options);
  return formattedDate;
};

export const getISODate = (date: string): string => {
  if (date) {
    const splitDate = date.split("T");
    if (splitDate.length > 0) {
      return new Date(splitDate[0]).toISOString().split("T")[0];
    } else {
      return new Date(date).toISOString().split("T")[0];
    }
  } else {
    return "";
  }
};

export const getDate = (date: string): string => {
  return new Date(date)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
    .toUpperCase();
};

/**
 * Converts an ISO date string to US date format (MM/DD/YYYY).
 * @param dateString - The ISO date string (e.g., "2022-12-31T00:00:00+00:00")
 * @returns The formatted date string in MM/DD/YYYY format, or "" if the date is invalid
 * @example
 * formatISODateToUS("2022-12-31T00:00:00+00:00") // Returns "12/31/2022"
 * formatISODateToUS("2022-01-01T00:00:00+00:00") // Returns "01/01/2022"
 */
export const formatISODateToUS = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  
  let mDate: Date;
  
  // Extract date part (YYYY-MM-DD) from ISO string to avoid timezone issues
  // Handles formats like "2022-01-01T00:00:00+00:00" or "2022-01-01"
  const dateRegex = /^(\d{4}-\d{2}-\d{2})/;
  const dateMatch = dateRegex.exec(dateString);
  
  if (dateMatch) {
    // Create date locally without timezone conversion
    const [year, month, day] = dateMatch[1].split('-').map(Number);
    mDate = new Date(year, month - 1, day); // month is 0-indexed
  } else {
    // Fallback to standard Date parsing if format doesn't match
    mDate = new Date(dateString);
  }
  
  if (isNaN(mDate.getTime())) {
    return "";
  }
  
  return mDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
};

/**
 * Converts a given money amount to a currency format based on the current currency rate.
 * @param moneyAmount The amount of money to convert to currency format.
 * @returns The money amount in currency format.
 */
export const changeToCurrency = (moneyAmount: number): number => {
  // Try to convert the money amount to a number
  // ? - Check if this is necessary
  moneyAmount = Number(moneyAmount);

  // Check if the money amount is a number
  // if (isNaN(moneyAmount)) {
  //   return null;
  // }

  if (moneyAmount.toFixed(2) === "-0.00") {
    moneyAmount = 0;
  }

  return moneyAmount * getCurrencyRate();
};

export const proposedTerms = (proposed: number): any => {
  return proposed * 1.0;
};

export const changeToUSD = (moneyAmount: number): any => {
  return moneyAmount / getCurrencyRate();
};

export const getYesOrNo = (value: boolean): string => {
  if (value !== true && value !== false) {
    return "-";
  }
  return value ? "global.yes" : "global.no";
};


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
 * Map a numeric confidence score (0-100) to its label
 * Ranges mirror the back-end MatchOverviewManager::calculateConfidenceScoreLabel()
 * Used by the grids, which receive the raw score instead of the label
 */
export const toConfidenceScoreLabel = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return "na";
  }
  if (score <= 20) {
    return "veryLow";
  }
  if (score <= 40) {
    return "low";
  }
  if (score <= 60) {
    return "med";
  }
  if (score <= 80) {
    return "high";
  }
  return "veryhigh";
};

/**
 * Translate confidence score label from API to display format
 * Accepts label string from API (veryLow, low, med, high, veryhigh, na)
 * Returns [label, percentage, color] array
 */
export const setConfidenceScore = (label: string | null | undefined) => {
  if (!label || label === 'na') {
    return ["na", "100%", "rgb(171, 175, 181)"];
  }
  
  switch (label) {
    case 'veryLow':
      return ["veryLow", "20%", "rgb(0, 0, 0)"];
    case 'low':
      return ["low", "40%", "rgb(255, 44, 79)"];
    case 'med':
      return ["med", "60%", "rgb(244, 180, 0)"];
    case 'high':
      return ["high", "80%", "rgb(46, 157, 88)"];
    case 'veryhigh':
      return ["veryhigh", "100%", "rgb(60, 134, 245)"];
    default:
      return ["na", "100%", "rgb(171, 175, 181)"];
  }
};

export const getCreditValues = (value: string): any => {
  if (value === "Very Weak") {
    return ["20", "rgb(255, 44, 79)"];
  }
  if (value === "Weak") {
    return ["40", "#FF2C4F"];
  }
  if (value === "Medium") {
    return ["60", "rgb(244, 180, 0)"];
  }
  if (value === "Strong") {
    return ["80", "#3C86F5"];
  }
  if (value === "Very Strong") {
    return ["100", "#2E9D58"];
  }
  if (value === "N/A") {
    return [null, null];
  }
};

export function getBackgroundColor(index: number): string {
  const groupColors = [
    colorsGroups.firstGroup,
    colorsGroups.secondGroup,
    colorsGroups.thirdGroup,
    colorsGroups.fourthGroup,
  ];
  // Modulo operation to loop back after reaching the last color
  return groupColors[index % groupColors.length];
}

export const colorText = (value: string) => {
  if (value === colorsGroups.firstGroup) {
    return colorsGroups.fontFirstGroup;
  }
  if (value === colorsGroups.secondGroup) {
    return colorsGroups.fontSecondGroup;
  }
  if (value === colorsGroups.thirdGroup) {
    return colorsGroups.fontThirdGroup;
  }
  if (value === colorsGroups.fourthGroup) {
    return colorsGroups.fontFourthGroup;
  }

  return "#000000";
};

export const getMaxPercentChart = (value: number, maxValue: number): string => {
  const width = (value / maxValue) * 100;
  return width.toString();
};

export const getRange = (value: string, typeProgram: string): string => {
  if (typeProgram === "potentialCashFlow") {
    return getNumberWithDecimals(value, 0);
  } else {
    return getNumberWithDecimals((parseFloat(value) * 100).toString(), 2) + "%";
  }
};

/**
 * Format a number to add the sign
 */
export function formatNumberWithSign(value: number): string | null {
  // Validate
  if (isNullOrUndefined(value)) {
    return null;
  }

  // Add sign
  switch (Math.sign(value)) {
    case 1:
      return `+${value}`;
    case -1:
      return value.toString();
    case 0:
      return "0";
    default:
      return null;
  }
}

/**
 * Format number as percentage
 * example: 0.1 -> 10%
 *
 * @param {number | null} value
 * @return {string}
 */
export function formatPercentage(
  value?: number | null,
  options?: Partial<{
    minimumFractionDigits: number;
    lang: string;
  }>
): string {
  return StringUtils.formatPercentage(value, options);
}

export const closeMenuOptions = (): any => {
  const dots = document.getElementById("closeoptions");
  if (dots) {
    dots.click();
  }
};

export const closeProgramOptions = (): any => {
  const options = document.getElementById("program-dropdown-options");
  if (options) {
    options.click();
  }
};

export const closeMetricOptions = (): any => {
  const options = document.getElementById("metric-dropdown-options");
  if (options) {
    options.click();
  }
};

export const closeAvailableOptions = (): any => {
  const options = document.getElementById("available-dropdown-options");
  if (options) {
    options.click();
  }
};

/**
 * Format a true, false or null value as "yes", "no" or "N/A"
 * example: true -> "yes"
 *
 * @param {boolean | null} value
 * @return {string}
 */
export function formatBooleanOrNull(
  value: boolean | null | undefined,
  options?: Partial<{ yes: string; no: string; notAvailable: string }>
): string {
  // Set default values
  const { yes = "Yes", no = "No", notAvailable = "N/A" } = options || {};

  if (value === true) {
    return yes;
  }

  if (value === false) {
    return no;
  }

  return notAvailable;
}

export const getStrategyModalityValue = (modality: any) => {
  if (modality) {
    if (modality.toLowerCase() === "p") {
      return translate.t("global.enforcedPromotedTerms.p");
    }
    if (modality.toLowerCase() === "e") {
      return translate.t("global.enforcedPromotedTerms.e");
    } else {
      return translate.t("global.enforcedPromotedTerms.promotedAndEnforced");
    }
  } else {
    return "-";
  }
};

/**
 * Maps the regulatory country source sent by the backend to its display label.
 * The backend value is "supplier" | "buyer" | "both" at spend level, and at
 * supplier/parent level it can be a comma-joined distinct set (e.g. "buyer,supplier").
 * Any value that involves more than one source ("both" or a comma-joined value)
 * is collapsed to "Mixed".
 */
export const getRegulationCountrySourceValue = (source: any): string => {
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

export const convertFiltersToREST = (
  filter: any | undefined
): string | null => {
  if (filter) {
    return `${JSON.stringify(filter).replace(/"/g, '"')}`;
  } else {
    return null;
  }
};

const MONTH_NAMES = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December"
} as const;

export const getMonthName = (currentMonth: number): string => {
  return MONTH_NAMES[currentMonth as keyof typeof MONTH_NAMES] || " ";
};

const HOUR_MAP = {
  1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6",
  7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12",
  13: "1", 14: "2", 15: "3", 16: "4", 17: "5", 18: "6",
  19: "7", 20: "8", 21: "9", 22: "10", 23: "11", 24: "12"
} as const;

export const getCurrentHour = (currentHour: number): string => {
  return HOUR_MAP[currentHour as keyof typeof HOUR_MAP] || " ";
};
/**
 * Extracts and parses the numeric value from a string
 * @param value - String with the value (e.g.: "< EUR 50,000,000.0 ")
 * @returns Object with numeric value, operator, currency and unit
 */
export function parseValueSMEString(value: string, showUnit: boolean = false): {
  number: number;
  operator: string;
  currency: string;
  unit: string;
  originalString: string;
  resultString: string;
} {
  // Trim the string
  const cleanValue = value.trim();

  // Detect operators (>, <, >=, <=, =)
  const operatorRegex = /^([<>]=?|=)/;
  const operatorMatch = operatorRegex.exec(cleanValue);
  const operator = operatorMatch ? operatorMatch[1] : '';

  // Remove operator to process the rest
  const valueWithoutOperator = cleanValue.replace(/^[<>]=?=?\s*/, '');

  // Detect currency (EUR, USD, GBP, etc.)
  const currencyRegex = /^([A-Z]{2,4})\s+/;
  const currencyMatch = currencyRegex.exec(valueWithoutOperator);
  const currency = currencyMatch ? currencyMatch[1] : '';

  // Remove currency to process the rest
  const valueWithoutCurrency = currency
    ? valueWithoutOperator.replace(/^[A-Z]{2,4}\s+/, '')
    : valueWithoutOperator;

  // Extract the number (may contain commas, dots and spaces)
  const numberRegex = /([\d,.]+)/;
  const numberMatch = numberRegex.exec(valueWithoutCurrency);

  if (!numberMatch) {
    throw new Error(`Could not extract number from: ${value}`);
  }

  const numberString = numberMatch[1];
  // Clean the number (remove commas and convert to float)
  const cleanNumberString = numberString.replaceAll(',', '');
  const number = Number.parseFloat(cleanNumberString);

  // Extract unit by removing the number part from the string
  const numberEndIndex = valueWithoutCurrency.indexOf(numberString) + numberString.length;
  const unit = valueWithoutCurrency.slice(numberEndIndex).trim();
  
  // Build the result string
  const parts: string[] = [];
    
  if (operator) parts.push(operator);
  if (currency) parts.push(currency);
  parts.push(StringUtils.formatBigNumbers(number));
  if (unit && showUnit) parts.push(unit);
  
  const resultString = parts.join(' ').trim();
  return {
      number,
      operator,
      currency,
      unit,
      originalString: cleanValue,
      resultString
  };
}