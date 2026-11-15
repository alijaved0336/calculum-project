import {
  Field,
  FilterType,
  FiltersApplied,
  FiltersAppliedFieldLevel,
  GlobalFiltersPanelBarItem,
  GlobalFiltersPanelBarItemOptions,
  KeyValue,
  Section,
  TargetView,
} from "@/types";

import { computed, WritableComputedRef, ref, ComputedRef } from "vue";

// Utils
import {
  ArrayUtils,
  isNullOrUndefined,
  isUndefined,
  NumberUtils,
  ObjectUtils,
  StringUtils,
} from "@/utils";

import { getClassesByLevel } from "@/utils/globalFiltersUtils";
import { ApiResponse } from "@/services/api/response";
import { useI18n } from "vue-i18n";
import { useProgram, useSpendFile, useUser, useCompany } from "@/composables";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useHomeStore } from "@/stores/home";
import * as GlobalFiltersAPI from "@/modules/globalFilters/api";
import useSMEFeature from "@/composables/useSMEFeature";
import { useAppStore } from '@/stores/app';
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";

/**
 * Get item data from panel bar items given field name
 */
function panelBarItemsGetItem({
  field,
  items,
}: {
  field: Field;
  items: (GlobalFiltersPanelBarItem | undefined)[];
}): undefined | GlobalFiltersPanelBarItem {
  // Validate
  if (StringUtils.isNullUndefinedOrEmpty(field)) return;

  // Search for field in filters to be applied
  return items.find((f) => !isNullOrUndefined(f) && f.field === field);
}

/**
 * Get selected level for a given panel bar item given field name.
 *
 * @param field
 * @returns {TargetView | undefined}
 */
function panelBarItemGetLevelSelected({
  field,
  items,
}: {
  field: Field;
  items: GlobalFiltersPanelBarItem[];
}): TargetView | undefined {
  // Search for field in fields
  const item = items.find((f) => f.field === field);

  // Not found
  if (isUndefined(item)) {
    if (import.meta.env.DEV)
      console.error(
        "** (panelBarItemGetLevelSelected) Field not found for field:",
        field,
      );

    return;
  }

  // Get default level
  return item.levelSelected;
}

/**
 * Determine if a field requires a program to be selected.
 * If not, the user can apply a related filter without selecting a program.
 *
 * @param field {Field}
 * @returns {boolean}
 */
function globalFiltersFieldsIsProgramSelectedRequired(field: Field): boolean {
  // Validate
  if (StringUtils.isEmpty(field)) {
    return false;
  }

  switch (field) {
    case "financings":
    case "modelCashFlow":
    case "modelPaymentTerms":
    case "isVCardApplied":
    case "programApplied":
    case "box":
    case "vCardBox":
    case "financialBox":
    case "scfBox":
    case "actualPaymentTerms":
    case "currencyCode":
    case "entityCompanySize":
      return true;

    default:
      return false;
  }
}

/**
 * checks if the field name includes 'customDataPoint'
 * by checking if it contains 'customDataPoint'
 * return true if it does, false if it doesn't
 */
function hasCustomDataPoint(field: Field): boolean {
  return field.includes("customDataPoint");
}

/**
 * Global Filters Composable
 */
const useGlobalFilters = () => {
  const globalFiltersStore = useGlobalFiltersStore();
  const homeStore = useHomeStore();

  const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

  const appStore = useAppStore();
  const currencyRate: ComputedRef<number> = computed(() => appStore.getCurrencyAmount);

  const {
    user,
    useFeatureVirtualCard,
    userPartnerRoleEnabled,
    useFeature9BoxesFinancing,
    useFeatureForecastVolume,
    getExternalFinancing
  } = useUser();

  const { usevCardGroupsEnabled } = useCompany();

  const { spendFileVersionActiveId } = useSpendFile();

  const { programSelectedId } = useProgram();

  const { featureSMEEnabled } = useSMEFeature();

  const { featureCreditRatingEnabled } = useFeatureCreditRating();

  const vCardEnabled = computed((): boolean => {
    return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
  });

  const globalFiltersApplied = computed({
    get: () => {
      // Defensive check for store initialization
      if (!globalFiltersStore) {
        return {
          logic: "and" as const,
          filters: [],
        };
      }

      /**
       * RACE CONDITION GUARD — globalFiltersApplied getter
       *
       * During a company change, cleanupBeforeCompanyChange() resets filtersApplied to []
       * while selectedProgramId (route) and activeSpendFileVersion (user session) may still
       * belong to different companies. Returning an empty filter object prevents any computed
       * value that depends on this from cascading reactive updates that trigger API calls with
       * mismatched context → HTTP 500.
       *
       * See: docs/context/race-condition-company-change.md
       */
      if (globalFiltersStore.getDisableWatchers) {
        return {
          logic: "and" as const,
          filters: [],
        };
      }

      try {
        const filtersApplied = globalFiltersStore.getFiltersApplied;
        // Enforce not null AND proper structure
        if (
          isNullOrUndefined(filtersApplied) ||
          !Array.isArray(filtersApplied.filters)
        ) {
          return {
            logic: "and",
            filters: [],
          };
        }

        return filtersApplied;
      } catch (error) {
        return {
          logic: "and" as const,
          filters: [],
        };
      }
    },
    set(newGlobalFiltersApplied: FiltersApplied) {
      // Defensive check for store initialization
      if (!globalFiltersStore) {
        return;
      }

      try {
        /**
         * RACE CONDITION GUARD — globalFiltersApplied setter
         *
         * Prevents any incoming filter update from being written to the store while
         * a company change is in progress. This blocks the cascade of reactive updates
         * that would otherwise trigger API calls with mismatched selectedProgramId and
         * activeSpendFileVersion → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }

        // Prevent pass by reference
        let f = ObjectUtils.cloneDeep(newGlobalFiltersApplied);

        // Set to default if value is not valid
        if (isNullOrUndefined(f)) {
          f = {
            logic: "and" as const,
            filters: [],
          };
        }

        if (isNullOrUndefined(f.filters)) {
          f.filters = [];
        }

        // Update global applied filters
        globalFiltersStore.setFiltersApplied(f);
      } catch (error) {
        console.error("Error setting globalFiltersStore filters:", error);
      }
    },
  });

  /**
   * Get list of applied filters from store
   */
  const globalFiltersAppliedFilters: WritableComputedRef<
    FiltersAppliedFieldLevel[]
  > = computed({
    get: () => {
      // Defensive check for store initialization
      if (!globalFiltersStore) {
        return [];
      }

      try {
        /**
         * RACE CONDITION GUARD — globalFiltersAppliedFilters getter
         *
         * Returning [] during a company change prevents any component that reads this
         * computed from triggering data loads with partially-updated context (new program,
         * old spend file version or vice versa) → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return [];
        }

        // Validate
        if (ArrayUtils.isEmpty(globalFiltersApplied.value.filters)) return [];
        //* Validate if vcard is disabled to remove financings and vCardGroupName fields in filters
        if (!vCardEnabled.value) {
          globalFiltersApplied.value.filters =
            globalFiltersApplied.value.filters.filter(
              (item: any) =>
                item.field !== "vCardGroupName" &&
                item.field !== "isVCardApplied" &&
                item.field !== "vCardBox",
            );
        }
        //* Validate if sme feature is disabled to remove issme field in filters
        if (!featureSMEEnabled.value) {
          globalFiltersApplied.value.filters =
            globalFiltersApplied.value.filters.filter(
              (item: any) => item.field !== "isSME",
            );
        }
        
        //- Same rules as ninebox
        const userPartnerEnabled = userPartnerRoleEnabled.value && useFeature9BoxesFinancing.value        
        if (!userPartnerEnabled) {
          globalFiltersApplied.value.filters =
            globalFiltersApplied.value.filters.filter(
              (item: any) => item.field !== "financialBox"
            );
        }
        
        //- Same rules as ninebox
        const financingEnabled = useFeature9BoxesFinancing.value && getExternalFinancing.value        
        if (!financingEnabled) {
          globalFiltersApplied.value.filters =
            globalFiltersApplied.value.filters.filter(
              (item: any) => item.field !== "financings" && item.field !== "scfBox",
            );
        }

          //* Validate if is
        if (!featureSMEEnabled.value) {
          globalFiltersApplied.value.filters =
            globalFiltersApplied.value.filters.filter(
              (item: any) => item.field !== "isSME",
            );
        }


        if (!useFeatureForecastVolume.value) {
          globalFiltersApplied.value.filters =
            globalFiltersApplied.value.filters.filter(
              (item: any) => item.field !== "forecastVolume",
            );
        }

        /** if featureCreditRatingEnabled is disabled hide the field entityStockPerformanceMarketIndex */
        if (!featureCreditRatingEnabled.value) {
          globalFiltersApplied.value.filters =
            globalFiltersApplied.value.filters.filter(
              (item: any) => item.field !== "entityStockPerformanceMarketIndex",
            );
        }

        return globalFiltersApplied.value.filters;
      } catch (error) {
        console.error("Error accessing globalFiltersAppliedFilters:", error);
        return [];
      }
    },
    set: (newFilters: FiltersAppliedFieldLevel[]) => {
      // Defensive check for store initialization
      if (!globalFiltersStore) {
        console.warn(
          "GlobalFiltersStore not initialized, cannot set filters array",
        );
        return;
      }

      try {
        /**
         * RACE CONDITION GUARD — globalFiltersAppliedFilters setter
         *
         * Prevents any filter array write during a company change, blocking the cascade
         * that would otherwise cause API calls with mismatched selectedProgramId and
         * activeSpendFileVersion → HTTP 500.
         *
         * See: docs/context/race-condition-company-change.md
         */
        if (globalFiltersStore.getDisableWatchers) {
          return;
        }

        globalFiltersApplied.value = {
          logic: "and",
          filters: [...newFilters], // Prevent pass by reference
        };
      } catch (error) {
        console.error("Error setting globalFiltersAppliedFilters:", error);
      }
    },
  });

  /**
   * Get count of filters applied
   */
  const globalFiltersAppliedFieldsCount = computed(
    () => globalFiltersApplied.value?.filters?.length ?? 0,
  );

  /**
   * Get fields in filters applied.
   *
   * @returns {Field[]}
   */
  function globalFiltersAppliedGetFields(): Field[] {
    // Validate
    if (ArrayUtils.isEmpty(globalFiltersApplied.value.filters)) {
      return [];
    }

    const fields: Field[] = globalFiltersApplied.value.filters.map(
      (f) => f.field,
    );

    return fields;
  }

  /**
   * Get field name formatted.
   * e.g. "modelCashFlow" -> "Cash Flow Opportunity"
   * e.g. "companySize" -> "Company size"
   *
   * @param field
   * @returns {string}
   */
  function globalFiltersGetFieldFormatted({
    field,
    items,
  }: {
    field: Field;
    items: GlobalFiltersPanelBarItem[];
  }): string {
    let name = "";
    if (field.includes("customDataPoint")) {
      // Search for title in panel bar item with field provided
      name = items.find((f) => f.field === field)?.title ?? field;

      // If title is not empty and has suffix already, ignore suffix
      if (!StringUtils.isNullUndefinedOrEmpty(name) && name.includes("(")) {
        name = name.split("(")[0];
      }
    } else {
      name = translate.te(`global.globalFilters.${field}`)
        ? translate.t(`global.globalFilters.${field}`)
        : field;
    }

    return name;
  }

  /**
   * Get the filters applied count per field. If the field is not found, return -1.
   *
   * @param field {Field}
   * @returns {number}
   */
  function globalFiltersAppliedCountPerField(field: Field): number {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(field)) {
      return -1;
    }

    // Defensive check for undefined filters
    if (!globalFiltersApplied.value?.filters) {
      return -1;
    }

    // Search for field
    const f = globalFiltersApplied.value.filters.find((f) => f.field === field);

    // Validate
    if (isUndefined(f)) {
      return -1;
    }

    return f.filters.length;
  }

  /**
   * Remove filter from filters applied
   */
  function globalFiltersAppliedRemoveFiltersFieldGroup(field: Field) {
    // Validate
    if (StringUtils.isEmpty(field)) {
      if (import.meta.env.DEV)
        console.log(
          "** Error in globalFiltersRemoveFiltersFieldGroup: fieldName is empty",
        );
      return;
    }

    if (ArrayUtils.isEmpty(globalFiltersApplied.value.filters)) {
      if (import.meta.env.DEV)
        console.log(
          "** Error in globalFiltersRemoveFiltersFieldGroup: filters is empty",
        );
      return;
    }

    // Search in applied filters for the given field
    const index = globalFiltersApplied.value.filters.findIndex(
      (filter) => filter.field === field,
    );

    // Not found
    if (index === -1) {
      if (import.meta.env.DEV)
        console.log(
          "** Error in globalFiltersRemoveFiltersFieldGroup. Field not found",
          field,
        );
      return;
    }

    // Remove
    const newFilters = globalFiltersApplied.value.filters.filter(
      (_, i) => i !== index,
    );

    globalFiltersApplied.value = {
      filters: newFilters,
      logic: globalFiltersApplied.value.logic as "and" | "or",
    };
  }

  /**
   * Get if program id is required by any field given a set of filters.
   *
   * @param f - Filters
   */
  function globalFiltersAppliedIsProgramIdRequired(f: FiltersApplied): boolean {
    // Validate
    if (ArrayUtils.isEmpty(f.filters)) {
      if (import.meta.env.DEV)
        console.log(
          `** Error in filtersToBeAppliedIsProgramIdRequired: filters is empty.`,
        );
      return false;
    }

    // Search in f for these fields: modelPaymentTerms, volume, financings, modelCashFlow.
    // If found, return true
    if (
      f.filters.findIndex((f) =>
        globalFiltersFieldsIsProgramSelectedRequired(f.field),
      ) !== -1
    ) {
      return true;
    }

    return false;
  }

  /**
   * Retrieves the minimum value of a field from the applied filters
   *
   * @param field
   * @param filters
   * @param level
   * @returns {number | null}
   */
  function globalFiltersAppliedFieldGetMinValue({
    field,
    filters,
    level,
  }: {
    field: Field;
    filters: FiltersAppliedFieldLevel[];
    level: TargetView;
  }): number | null {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(field)) {
      if (import.meta.env.DEV)
        console.error(
          `** Error in globalFiltersAppliedFieldGetMinValueSelected: field is empty.`,
        );
      return null;
    }

    const f = filters.find((f) => f.field === field && f.level === level);

    // Not found
    if (isUndefined(f)) {
      return null;
    }

    const filter = f.filters.find((i) => i.operator === "gte");

    if (isUndefined(filter)) {
      return null;
    }

    if (typeof filter.value !== "number") {
      if (import.meta.env.DEV)
        console.error(
          `** Error in globalFiltersAppliedFieldGetMinValueSelected: filter.value is not number.`,
        );
      return null;
    }

    return filter.value;
  }

  /**
   * Retrieves the maximun value of a field from the applied filters
   *
   * @param field
   * @param filters
   * @param level
   * @returns {number | null}
   */
  function globalFiltersAppliedFieldGetMaxValue({
    field,
    filters,
    level,
  }: {
    field: Field;
    filters: FiltersAppliedFieldLevel[];
    level: TargetView;
  }): number | null {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(field)) {
      if (import.meta.env.DEV)
        console.error(
          `** Error in globalFiltersAppliedFieldGetMinValueSelected: field is empty.`,
        );
      return null;
    }

    const f = filters.find((f) => f.field === field && f.level === level);

    // Not found
    if (isUndefined(f)) {
      return null;
    }

    const filter = f.filters.find((i) => i.operator === "lte");

    if (isUndefined(filter)) {
      return null;
    }

    if (typeof filter.value !== "number") {
      if (import.meta.env.DEV)
        console.error(
          `** Error in globalFiltersAppliedFieldGetMinValueSelected: filter.value is not number.`,
        );
      return null;
    }

    return filter.value;
  }

  // *** Global Filters Panel Bar ***

  const panelBarKey = ref(NumberUtils.getRandomInt());  

  /**
   * Get selected level for a given panel bar item given field name.
   *
   * @param field
   * @returns {TargetView | undefined}
   */
  function panelBarItemGetTitleFormatted({
    field,
    items,
  }: {
    field: Field;
    items: GlobalFiltersPanelBarItem[];
  }): string {
    let title = globalFiltersGetFieldFormatted({
      field,
      items,
    });

    // Search for field in fields
    const item = items.find((f) => f.field === field);

    // Not found
    if (isUndefined(item)) {
      if (import.meta.env.DEV)
        console.error(
          "** (panelBarItemGetTitleFormatted) Field not found for field:",
          field,
        );

      return title;
    }

    // Filters of range type does not have a suffix
    if (item.filterType === "rangeSlider") {
      return title;
    }

    // Title Suffix
    // Title shows the number of filters applied for this field
    let titleSuffix = "";

    const filtersCount = globalFiltersAppliedCountPerField(field);

    if (filtersCount > -1) {
      titleSuffix = `(${filtersCount}/-)`;
    }

    if (
      !isNullOrUndefined(item.itemData) &&
      !isNullOrUndefined(item.itemData.items) &&
      !ArrayUtils.isEmpty(item.itemData.items)
    ) {
      if (filtersCount > -1) {
        titleSuffix = `(${filtersCount}/${item.itemData.items.length})`;
      } else {
        titleSuffix = `(0/${item.itemData.items.length})`;
      }
    }

    if (!StringUtils.isEmpty(titleSuffix)) {
      return `${title} ${titleSuffix}`;
    }

    return title;
  }

  // *** Global Filters - Panel Bar - Custom Data Points ***

  /**
   * find the obj in the array of customColumnns and return the field property
   * first checks the saved values from the Pinia store
   * else checks the response Array from the api
   */
  function getCustomFieldName(field: Field): string {
    return translate.te(`global.globalFilters.${field}`)
      ? translate.t(`global.globalFilters.${field}`)
      : "";
  }

  /**
   * ? - Transform to not have to not depend on field to select type of call
   *
   * Get all filter options for given field from API.
   *
   * @param field {Field}
   */
  async function panelBarItemOptionsAPIReadAll({
    field,
    filterType, // ? - Not used for now
    levelSelected,
  }: {
    field: Field;
    filterType: FilterType;
    levelSelected: TargetView;
  }): Promise<GlobalFiltersPanelBarItemOptions | undefined> {
    // Validate
    if (isUndefined(levelSelected)) {
      if (import.meta.env.DEV)
        console.error(
          "** (panelBarItemOptionsAPIReadAll): levelSelected is undefined for field:",
          field,
        );

      return;
    }

    let response: ApiResponse | undefined;

    switch (field) {
      //
      // Program / Range
      //
      case "modelPaymentTerms":
      case "modelCashFlow":
      case "actualPaymentTerms":
        response = await GlobalFiltersAPI.fieldAPIRead({
          currencyRate: currencyRate.value,
          field,
          operation: "range",
          section: "program",
          targetProgramUuid: programSelectedId.value,
          targetSpendFileVersionUuid: spendFileVersionActiveId.value,
          targetView: levelSelected,
        });

        break;
      //
      // Program / List
      //
      case "financings":
      case "isVCardApplied":
      case "programApplied":
      case "currencyCode":
      case "entityCompanySize":
      case "box":
      case "vCardBox":
      case "financialBox":
      case "scfBox":
        response = await GlobalFiltersAPI.fieldAPIRead({
          currencyRate: currencyRate.value,
          field,
          operation: "list",
          section: "program",
          targetProgramUuid: programSelectedId.value,
          targetSpendFileVersionUuid: spendFileVersionActiveId.value,
          targetView: levelSelected,
        });

        break;
      //
      // Analyze / Range
      //
      case "volume":
      case "forecastVolume":
      case "contractualPaymentTermsWithCashDiscounts":
      case "contractualPaymentTermsWithoutCashDiscounts":
        response = await GlobalFiltersAPI.fieldAPIRead({
          currencyRate: currencyRate.value,
          field,
          operation: "range",
          section: "analyze",
          targetSpendFileVersionUuid: spendFileVersionActiveId.value,
          targetView: levelSelected,
        });

        break;
      //
      // Analyze / List
      //
      case "isSME":
        response = await GlobalFiltersAPI.fieldAPIRead({
          currencyRate: currencyRate.value,
          field,
          operation: "list",
          section: "analyze",
          targetSpendFileVersionUuid: spendFileVersionActiveId.value,
          targetView: levelSelected,
        });

        break;
      //
      // Analyze / Groups
      //
      case "planPhaseNames":
        // Validate
        if (isNullOrUndefined(user.value)) {
          if (import.meta.env.DEV)
            console.error(
              "** Error in panelBarItemOptionsAPIReadAll. user is not valid. user:",
              user,
            );

          return;
        }

        if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
          if (import.meta.env.DEV)
            console.error(
              "** Error in panelBarItemOptionsAPIReadAll. user.activeSpendFileVersion is not valid. user:",
              user,
            );

          return;
        }

        response = await GlobalFiltersAPI.fieldAPIRead({
          currencyRate: currencyRate.value,
          field,
          operation: "groups",
          section: "analyze",
          targetSpendFileVersionUuid: spendFileVersionActiveId.value,
          targetView: levelSelected,
        });

        break;

      default: {
        //
        // Custom Columns in the spend file
        //
        if (hasCustomDataPoint(field)) {
          // Validate
          if (isNullOrUndefined(user.value)) {
            if (import.meta.env.DEV)
              console.error(
                "** Error in panelBarItemOptionsAPIReadAll. user is not valid. user:",
                user,
              );

            return;
          }

          const colNum = parseInt(field.replace('customDataPoint', ''), 10);
          const isNumericColumn = colNum >= 21 && colNum <= 26;

          response = await GlobalFiltersAPI.fieldAPIRead({
            currencyRate: currencyRate.value,
            field,
            operation: isNumericColumn ? "range" : "list",
            section: isNumericColumn ? "program" : "analyze",
            targetProgramUuid: isNumericColumn ? programSelectedId.value : undefined,
            targetSpendFileVersionUuid: spendFileVersionActiveId.value,
            targetView: levelSelected,
          });

          break;
        }
        //
        // Analyze / List
        //
        response = await GlobalFiltersAPI.fieldAPIRead({
          currencyRate: currencyRate.value,
          field,
          operation: "list",
          section: "analyze",
          targetSpendFileVersionUuid: spendFileVersionActiveId.value,
          targetView: levelSelected,
        });

        break;
      }
    }

    // Validate response
    if (
      !response.success ||
      response.data === null ||
      response.data === undefined
    ) {
      if (import.meta.env.DEV)
        console.log(
          `** Error - Invalid response in panelBarItemOptionsAPIReadAll.`,
        );

      return;
    }

    return response.data;
  }

  interface TestFilter {
    entitiesCount: number;
    parentsCount: number;
    rowsCount: number;
    spendsCount: number;
  }

  /**
   * Checks if the global filters for API read are valid.
   *
   * @param {Object} params - The parameters for the function.
   *   - {number} currencyRate - The currency rate.
   *   - {Section} section - The section.
   *   - {string} globalFilter - The global filter.
   *   - {string} [programActiveId] - The active program ID.
   *   - {string} [targetSpendFileVersionUuid] - The spendfileversion UUID in the Store browser
   * @return {Promise<boolean>} A promise that resolves to a boolean indicating if the filters are valid.
   */
  async function globalFiltersIsValidAPIRead(params: {
    currencyRate: number;
    section: Section;
    globalFilter: string;
    targetSpendFileVersionUuid: string | null;
    targetProgramUuid?: string | null;
  }): Promise<boolean> {
    try {
      const callbackSuccessData = await new Promise<TestFilter>(
        (resolve, reject) => {
          homeStore.validateGlobalFilters({
            ...params,
            callbackSuccess: resolve,
            callbackError: reject,
          });
        },
      );

      // Filter is valid
      if (callbackSuccessData.rowsCount > 0) return true;
    } catch (error) {
      if (import.meta.env.DEV)
        console.log("** Error in globalFiltersIsValidAPIRead. ", error);
    }

    // Filter is invalid
    return false;
  }

  return {
    getClassesByLevel,
    getCustomFieldName,
    globalFiltersApplied,
    globalFiltersAppliedCountPerField,
    globalFiltersAppliedFieldGetMaxValue,
    globalFiltersAppliedFieldGetMinValue,
    globalFiltersAppliedFieldsCount,
    globalFiltersAppliedFilters,
    globalFiltersAppliedGetFields,
    globalFiltersAppliedIsProgramIdRequired,
    globalFiltersAppliedRemoveFiltersFieldGroup,
    globalFiltersFieldsIsProgramSelectedRequired,
    globalFiltersGetFieldFormatted,
    globalFiltersIsValidAPIRead,
    hasCustomDataPoint,
    panelBarItemGetLevelSelected,
    panelBarItemGetTitleFormatted,
    panelBarItemOptionsAPIReadAll,
    panelBarItemsGetItem,
    panelBarKey
  };
};

export default useGlobalFilters;
