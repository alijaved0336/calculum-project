import { messages, defaultLocale } from "@ada/design-system/locales/index";
import { createI18n } from "vue-i18n";
const i18n = createI18n({
  messages,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true
});
export const translate = i18n.global;

export const computeLevelClass = (ruleObj: any): string => {
  if (ruleObj.level === null || ruleObj.level === undefined) {
    return "";
  } else if (ruleObj.level.toLowerCase() === "spend") {
    return "pink-category-level";
  } else if (
    ruleObj.level.toLowerCase() === "supplier" ||
    ruleObj.level.toLowerCase() === "provider"
  ) {
    return "blue-category-level";
  } else if (ruleObj.level.toLowerCase() === "parent") {
    return "indigo-category-level";
  } else {
    return "";
  }
};
/**
 * Validate name for custom field
 * @param ruleObj \
 * @param availableFilters
 * @returns
 */
export const getNameForCategory = (
  ruleObj: any,
  availableFilters: Array<any>
): string => {
  let keyField = availableFilters[ruleObj.field];
  if (keyField?.title) {
      return translate.t("home.analyze.rules." + keyField.title)
  } else {
    return showTitle(ruleObj);
  }
};

export const getCustomFieldName = (ruleObj: any): string => {
  if (ruleObj.field && ruleObj.field.length > 0) {
    return ruleObj.field.replace(/_/g, " ");
  } else {
    return "";
  }
};

export const showTitle = (ruleObj: any): string => {
  let values = "";
  if (ruleObj.field.length > 0) {
    values += `${ruleObj.field.replace(/_/g, " ")} : `;
  }
  return values;
};

export const computeLevel = (ruleObj: any): string => {
  if (ruleObj.level && ruleObj.level.length > 0) {
    const level = ruleObj.level.toLowerCase();

    switch (level) {
      case "supplier":
      case "provider":
        return "Supplier";
      case "spend":
      case "parent":
        return level.charAt(0).toUpperCase() + level.slice(1);
      default:
        return "";
    }
  }
  return "";
};



export const showValues = (ruleObj: any): string => {

  let valuesString = "";

  if (ruleObj.values) {
    valuesString = ruleObj.values.join(", ");
  }

  if (ruleObj.filterOne) {
    if (ruleObj.filterOne.operator) {
      valuesString += ` ${translate.t(
        `home.analyze.${ruleObj.filterOne.operator}`
      )} `;
    }
    if (ruleObj.filterOne.value) {
      valuesString += `"${ruleObj.filterOne.value}"`;
    }
  }

  if (ruleObj.condition && !ruleObj.top) {
    valuesString += ` ${ruleObj.condition.toLowerCase()} `;
  }

  if (ruleObj.filterTwo) {
    if (ruleObj.filterTwo.operator) {
      valuesString += ` ${translate.t(
        `home.analyze.${ruleObj.filterTwo.operator}`
      )} `;
    }
    if (ruleObj.filterTwo.value) {
      valuesString += `"${ruleObj.filterTwo.value}"`;
    }
  }

  if (ruleObj.top) {
    valuesString += getTopRankValue(ruleObj.top.type, ruleObj.top.value);
  }

  return valuesString;
};

export const getTopRankValue = (top: string, val: number): string => {
  if (top === "topN") {
    return translate.t(`home.analyze.topRankValues.${top}`) + " " + val;
  } else if (top === "topP") {
    return translate.t(`home.analyze.topRankValues.${top}`) + " " + val;
  } else {
    return " " + val;
  }
};
