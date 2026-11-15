import * as colorsGroups from "@/utils/ColorsGroups";
import ArrayUtils from "./ArrayUtils";
import ColorsUtils from "./ColorsUtils";
import DateUtils from "./DateUtils";
import NumberUtils from "./NumberUtils";
import ObjectUtils from "./ObjectUtils";
import PaymentTermsStrategiesUtils from "@/modules/paymentTermsAndTermsStrategies/utils";
import StringUtils from "./StringUtils";
import IsSMEUtils from "./IsSMEUtils";
import * as FormatData from "./FormatData";
import * as RedirectSection from "./RedirectSection";
import queryRouters from "./queryRouters";

// Reexport utils from individual modules
export {
  ArrayUtils,
  ColorsUtils,
  DateUtils,
  NumberUtils,
  ObjectUtils,
  PaymentTermsStrategiesUtils,
  StringUtils,
  FormatData,
  queryRouters,
  IsSMEUtils,
  RedirectSection
};

/*** Consts ***/
export const MAX_TERMS_DAYS_CHARTS = 180;

export const EXCLUDED_EDNPOINTS = ["api/validate-invitation","api/injection","/api/validate-value-proposition-invitation","/api/send-external-invitations","/api/value_proposition/validate_invitations_value_proposition","/api/value_proposition/validate_invitations_externals_value_proposition","/api/create_invitations_externals_value_proposition","/api/invitation_value_propositions/","/api/value_proposition/ask_cuestions","/api/send_external_email","/api/value_proposition/invitations_value_proposition_get_data"]

export const NUMBER_OF_ACCEPTANCE_TYPES = 4;

export const ENTITY_TYPE = {
  SUPPLIER: "supplier",
  PARENT: "parent",
  SPEND_LINE: "spendLine"
} as const;

export const ENTITY_LEVEL = {
  SPEND_LINES: 0,
  SUPPLIERS: 1,
  ULTIMATE_PARENT: 2
} as const;

export const ENTITY_SPENDFILE_LEVEL_TYPE = {
  SPEND_LINE: "spend",
  SUPPLIER: "supplier",
  PARENT: "parent",
  SPEND_FILE: "spendFileVersion"
} as const;

export const NEGOTIATION_STATUS = {
  NEGOTIATED: "negotiated"
} as const;

export const ADA_ACADEMY_GLOSSARY_URL =
  "https://academy.hello-ada.com/glossary";

export const ADA_ACADEMY_URL = "https://academy.hello-ada.com";

/*** END Consts ***/

export const getUriLastPart = (uri: string) => {
  return uri.substring(uri.lastIndexOf("/") + 1);
};

export const stringLimit = (value: any, size: number) => {
  if (!value) return "";
  value = value.toString();

  if (value.length <= size) {
    return value;
  }
  return value.substr(0, size) + "...";
};

/**
 * Remove IRI
 * "/api/users/{iri_example}" -> "{iri_example}"
 *
 * @param {string} iri
 * @returns {string}
 */
export function removeIRI(iri: string | undefined | null): string {
  return StringUtils.removeIRI(iri);
}

export interface KeyPair {
  key: any;
  value: any;
  selected: boolean;
}

export interface FilterField {
  title: string;
  availableValues: Array<KeyPair>;
}

export function dateForWaterFall(date: string) {
  const createDate = Date.parse(date);
  const initialDate = Date.parse("2023-08-10");
  if (createDate >= initialDate) {
    return true;
  } else {
    return false;
  }
}

/**
 * Normalize bar size for horizontal bar charts given max days
 */
export function getBarSize(value: number, maxValue: number) {
  const newSize = (value * 100) / maxValue;
  return newSize > 100 ? 100 : newSize;
}

/**
 * Show only a maximum of given items per detail category
 *
 * @param items {string[]}
 * @param maxItems {number}
 */
export function formatDetailsItems({
  items,
  maxItems = 2
}: {
  items: string | string[] | null;
  maxItems: number;
}): string {
  // items is null
  if (!items) {
    return "N/A";
  }

  let parsedItems: string[];

  // items is string
  if (typeof items === "string") {
    // Get the list of items from the string
    parsedItems = items.split(", ");
  }
  // items is array
  else {
    // Get the list of items from the array
    parsedItems = items;
  }

  // No items to show
  if (parsedItems.length === 0) {
    return "N/A";
  } else if (parsedItems.length === 1) {
    // Show only the first item
    return parsedItems[0];
  } else if (parsedItems.length <= maxItems) {
    // Show all items
    return parsedItems.join(", ");
  } else {
    // Show only the first items and the number of remaining items (+X)
    return (
      parsedItems.slice(0, maxItems).join(", ") +
      " (+" +
      (parsedItems.length - maxItems).toString() +
      ")"
    );
  }
}

/**
 * Get classes for a rainbow pill given its index
 * There are four different colors
 *
 * @param index {number}
 */
export function getRainbowPillClasses(
  index: number,
  options?: {
    classesList: string[];
  }
): string {
  // Set default values
  const {
    classesList = [
      "bg-bluelight-100 text-bluelight-700",
      "bg-rose-200 text-rose-700",
      "bg-orange-100 text-orange-700",
      "bg-teal-100 text-teal-700"
    ]
  } = options || {};

  // Validate
  if (!index && index !== 0) {
    return "";
  }

  return classesList[index % classesList.length];
}

/**
 * Get level number given level name
 *
 * @param levelName {string}
 */
export function getLevelNumber(levelName?: string | null): number {
  // Validate level name
  if (!levelName) {
    return 0;
  }

  switch (levelName) {
    case "Very Low":
    case "Very Weak":
      return 1;

    case "Low":
    case "Weak":
      return 2;

    case "Medium":
      return 3;

    case "High":
    case "Strong":
      return 4;

    case "Very High":
    case "Very Strong":
      return 5;

    default:
      return 0;
  }
}

/**
 * Get level standard label given level name
 *
 * @param levelName {string}
 */
export function getLevelStandardLabel(levelName?: string | null): string {
  switch (levelName) {
    case "Very Weak Credit Rating":
      return "Very Weak";

    case "Weak Credit Rating":
      return "Weak";

    case "Medium Credit Rating":
      return "Medium";

    case "Strong Credit Rating":
      return "Strong";

    case "Very Strong Credit Rating":
      return "Very Strong";

    default:
      return "";
  }
}

/**
 * Get the level color given level number
 *
 * @param level {number}
 * @returns {string}
 */
export function getLevelColor(level?: number | null): string {
  switch (level) {
    case 1:
      return colorsGroups.veryLow;
    case 2:
      return colorsGroups.low;
    case 3:
      return colorsGroups.medium;
    case 4:
      return colorsGroups.high;
    case 5:
      return colorsGroups.veryHigh;
    default:
      return colorsGroups.noLevel;
  }
}

/**
 * Converts a string to null if it is empty, null, or undefined.
 *
 * @param {string | null | undefined} value - The string value to check.
 * @returns {string | null} - Returns the original string if it is not empty, otherwise null.
 */
export function stringEmptyNullOrUndefinedtoNull(value: string | null | undefined): string | null {
  return value && value.trim() !== '' ? value : null;
}

// *** Type Checks ***
/**
 * Checks if the given value is null or undefined.
 *
 * @param {unknown} value - The value to check for.
 * @return {boolean} Returns true if the value is null or undefined, false otherwise.
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value);
}

/**
 * Checks if the given value is null.
 *
 * @param {unknown} value - The value to check for.
 * @return {boolean} Returns true if the value is null, false otherwise.
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Checks if the given value is undefined.
 *
 * @param {unknown} value - The value to check for.
 * @return {boolean} Returns true if the value is undefined, false otherwise.
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isEmpty(value: string | any[] | undefined | null): boolean {
  // Inline array check to avoid ArrayUtils dependency (can be undefined during circular init)
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return StringUtils.isNullUndefinedOrEmpty(value);
}

// Export all role utilities
export * from './roleUtils';
export * from './sessionRoleUtils';
export * from './moduleRoleUtils';
export * from './featureRoleUtils';
// *** END Type Checks ***

// Export PDF export helpers
export * from './pdfExportHelpers';

// Export global filters utils
export {
  getFieldName,
  filtersAppliedGetFormattedLevel,
  getIconNameByLabel,
} from './globalFiltersUtils';