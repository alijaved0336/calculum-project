import { isUndefined } from "lodash";

import { ArrayUtils, isNullOrUndefined, ObjectUtils, StringUtils } from "@/utils";
import { addFilterLogError } from "@/utils/globalFiltersUtils";
import type {
  Field,
  Filter,
  FiltersApplied,
  FiltersAppliedFieldLevel,
  FilterType,
  GlobalFiltersPanelBarItem,
  TargetView,
} from "@/types";

type FilterValue = string | number | { min: number; max: number };

type AddFilterContext = {
  field: Field;
  operator: "eq" | "gte" | "lte";
  value: FilterValue;
  levelSelected: string;
  fieldLabel: string | undefined;
};

interface UseFiltersToBeAppliedOptions {
  /** `data.filtersToBeApplied` from the shell - mutated in place, never reassigned wholesale. */
  filtersToBeApplied: FiltersApplied;
  /** `() => data.items` - a getter, since `data.items` gets reassigned elsewhere in the shell. */
  getItems: () => GlobalFiltersPanelBarItem[];
  getLevelSelected: (field: Field) => TargetView | string | undefined;
  hasCustomDataPoint: (field: Field) => boolean;
  getCustomFieldName: (field: Field) => string;
}

/**
 * Owns `filtersToBeApplied` mutation logic: add/remove a single filter value, remove a whole
 * field group, clean up empty groups, and read back field/index lookups. Extracted verbatim from
 * MainLayoutFilters.vue's "Filters to be applied" block - see
 * docs/context/change-mainlayoutfilters-refactor.md for the extraction notes.
 */
const useFiltersToBeApplied = (options: UseFiltersToBeAppliedOptions) => {
  const {
    filtersToBeApplied,
    getItems,
    getLevelSelected,
    hasCustomDataPoint,
    getCustomFieldName,
  } = options;

  /**
   * Set filters to be applied
   *
   * @param {FiltersApplied} filters
   * @returns {void}
   */
  function filtersToBeAppliedSet(filters: FiltersApplied): void {
    const cloned = ObjectUtils.cloneDeep(filters);
    filtersToBeApplied.filters = cloned.filters;
    filtersToBeApplied.logic = cloned.logic;
  }

  /** Type guard: value is string or number (for radio/checkbox filters). */
  function isValidSingleValue(value: FilterValue): value is string | number {
    return typeof value === "string" || typeof value === "number";
  }

  /** Type guard: value is range object { min, max } (for range slider). */
  function isValidRangeValue(
    value: FilterValue,
  ): value is { min: number; max: number } {
    return (
      typeof value === "object" &&
      value !== null &&
      "min" in value &&
      "max" in value
    );
  }

  /** Clear all filter values for a field (keeps the field entry). */
  function clearExistingFiltersForField(field: Field): void {
    const idx = filtersToBeApplied.filters.findIndex((f) => f.field === field);
    if (idx !== -1) filtersToBeApplied.filters[idx].filters = [];
  }

  /** Add single-value filter (eq) to filtersToBeApplied. */
  function pushSingleValueFilter(
    ctx: AddFilterContext,
    value: string | number,
  ): void {
    const { field, fieldLabel, operator, levelSelected } = ctx;
    const entry = isUndefined(fieldLabel)
      ? {
          field,
          filters: [{ field, operator, value }],
          level: levelSelected as TargetView,
          logic: "or" as const,
        }
      : {
          fieldLabel,
          field,
          filters: [{ field, operator, value }],
          level: levelSelected as TargetView,
          logic: "or" as const,
        };
    filtersToBeApplied.filters.push(entry);
  }

  /** Add range filter (gte + lte) to filtersToBeApplied. */
  function pushRangeFilter(ctx: AddFilterContext): void {
    const { field, value, levelSelected } = ctx;
    if (!isValidRangeValue(value)) return;
    filtersToBeApplied.filters.push({
      field,
      filters: [
        { field, operator: "gte" as const, value: value.min },
        { field, operator: "lte" as const, value: value.max },
      ],
      level: levelSelected as TargetView,
      logic: "and",
    });
  }

  /** Add first filter when filtersToBeApplied is empty (radio/checkbox/rangeSlider). */
  function addFirstFilter(ctx: AddFilterContext, filterType: FilterType): boolean {
    filtersToBeApplied.filters = [];
    if (filterType === "radioBtn") {
      if (!isValidSingleValue(ctx.value)) {
        addFilterLogError(
          "** Error in setFiltersToBeAppliedAddFilter: value is not a string or a number",
        );
        return false;
      }
      clearExistingFiltersForField(ctx.field);
      pushSingleValueFilter(ctx, ctx.value);
      return true;
    }
    if (filterType === "multipleCheckboxes") {
      if (!isValidSingleValue(ctx.value)) {
        addFilterLogError(
          "** Error in setFiltersToBeAppliedAddFilter: value is not a string or a number",
        );
        return false;
      }
      pushSingleValueFilter(ctx, ctx.value);
      return true;
    }
    if (filterType === "rangeSlider") {
      if (!isValidRangeValue(ctx.value)) {
        addFilterLogError(
          "** Error in setFiltersToBeAppliedAddFilter: Uknown value type.",
          ctx.value,
        );
        return false;
      }
      pushRangeFilter(ctx);
      return true;
    }
    return false;
  }

  /** Add filter for a new field (field not yet in filtersToBeApplied). */
  function addNewFieldFilter(
    ctx: AddFilterContext,
    filterType: FilterType,
  ): boolean {
    if (filterType === "radioBtn" || filterType === "multipleCheckboxes") {
      if (!isValidSingleValue(ctx.value)) {
        addFilterLogError(
          "** Error in setFiltersToBeAppliedAddFilter: value is not a string or a number",
        );
        return false;
      }
      pushSingleValueFilter(ctx, ctx.value);
      return true;
    }
    if (filterType === "rangeSlider") {
      if (!isValidRangeValue(ctx.value)) {
        addFilterLogError(
          "** Error in setFiltersToBeAppliedAddFilter: value is not a valid object. value:",
          ctx.value,
        );
        return false;
      }
      pushRangeFilter(ctx);
      return true;
    }
    return false;
  }

  /**
   * Get filter from filters to be applied
   *
   * @param {Filter} filter - The filter to be added
   * @returns {void}
   */
  function filtersToBeAppliedGetFilterIdx({
    field,
    operator,
    value,
  }: Partial<Filter>): number {
    // Validate
    if (
      StringUtils.isNullUndefinedOrEmpty(field) ||
      StringUtils.isNullUndefinedOrEmpty(operator)
    )
      return -1;

    // Value is an string and empty
    if (typeof value === "string" && StringUtils.isEmpty(value)) return -1;

    const fieldIdx = filtersToBeAppliedGetFilterFieldIdx(field);

    // Field not found
    if (fieldIdx === -1) return -1;

    // Search for field in filters to be applied
    let idx = -1;

    // Search only by field and operator
    if (value === undefined) {
      idx = filtersToBeApplied.filters[fieldIdx].filters.findIndex(
        (f) => f.field === field && f.operator === operator,
      );

      return idx;
    }

    // Search by field, operator and value
    idx = filtersToBeApplied.filters[fieldIdx].filters.findIndex(
      (f) => f.field === field && f.operator === operator && f.value === value,
    );

    return idx;
  }

  /** Update gte/lte values for existing range slider field. */
  function updateRangeSliderFilter(
    ctx: AddFilterContext,
    fieldIdx: number,
  ): void {
    if (!isValidRangeValue(ctx.value)) {
      addFilterLogError(
        `** Error in setFiltersToBeAppliedAddFilter: value is not a valid object. value: ${JSON.stringify(ctx.value)}`,
      );
      return;
    }
    const filters = filtersToBeApplied.filters[fieldIdx].filters;
    const idxGte = filtersToBeAppliedGetFilterIdx({
      field: ctx.field,
      operator: "gte",
    });
    if (idxGte === -1) {
      filters.push({
        field: ctx.field,
        operator: "gte",
        value: ctx.value.min,
      });
    } else {
      filters[idxGte].value = ctx.value.min;
    }
    const idxLte = filtersToBeAppliedGetFilterIdx({
      field: ctx.field,
      operator: "lte",
    });
    if (idxLte === -1) {
      filters.push({
        field: ctx.field,
        operator: "lte",
        value: ctx.value.max,
      });
    } else {
      filters[idxLte].value = ctx.value.max;
    }
  }

  /** Add single-value filter to existing field entry (radio/checkbox). */
  function updateSingleValueFilter(
    ctx: AddFilterContext,
    fieldIdx: number,
  ): void {
    if (!isValidSingleValue(ctx.value)) {
      addFilterLogError("** Error: Uknown filter value", ctx.value);
      return;
    }

    const filterIdx = filtersToBeAppliedGetFilterIdx({
      field: ctx.field,
      operator: "eq",
      value: ctx.value,
    });

    if (filterIdx !== -1) {
      addFilterLogError(
        "** setFiltersToBeAppliedAddFilter. filter is already there.",
      );
      return;
    }
    filtersToBeApplied.filters[fieldIdx].filters.push({
      field: ctx.field,
      operator: ctx.operator,
      value: ctx.value,
    });
  }

  /**
   * Add filter to applied filters
   *
   * @param {Filter} filter - The filter to be added
   * @returns {void}
   */
  function setFiltersToBeAppliedAddFilter({
    filter,
    filterType,
  }: {
    filter: {
      field: Field;
      operator: "eq" | "gte" | "lte";
      value: FilterValue;
    };
    filterType: FilterType;
  }): void {
    const { field, operator, value } = filter || {};

    if (
      isNullOrUndefined(value) ||
      StringUtils.isNullUndefinedOrEmpty(field) ||
      StringUtils.isNullUndefinedOrEmpty(operator)
    ) {
      addFilterLogError(
        "** Error: setFiltersToBeAppliedAddFilter: filter is null or undefined",
      );
      return;
    }
    const levelSelected = getLevelSelected(field);
    if (isUndefined(levelSelected)) {
      if (import.meta.env.DEV)
        console.error(
          "** (setFiltersToBeAppliedAddFilter) levelSelected is undefined",
        );
      return;
    }
    const fieldLabel = hasCustomDataPoint(field)
      ? getItems().find((i) => i.field === field)?.title ??
        getCustomFieldName(field)
      : undefined;

    const ctx: AddFilterContext = {
      field,
      operator,
      value,
      levelSelected,
      fieldLabel,
    };

    if (ArrayUtils.isEmpty(filtersToBeApplied.filters)) {
      addFirstFilter(ctx, filterType);
      return;
    }
    const fieldIdx = filtersToBeAppliedGetFilterFieldIdx(field);

    if (fieldIdx === -1) {
      addNewFieldFilter(ctx, filterType);
      return;
    }
    if (filterType === "rangeSlider") {
      updateRangeSliderFilter(ctx, fieldIdx);
      return;
    }
    if (filterType === "radioBtn") {
      clearExistingFiltersForField(ctx.field);
      updateSingleValueFilter(ctx, fieldIdx);
      return;
    }
    if (filterType === "multipleCheckboxes") {
      updateSingleValueFilter(ctx, fieldIdx);
      return;
    }
    addFilterLogError(
      `** Error in "setFiltersToBeAppliedAddFilter": Unknown filter type: ${filterType}`,
    );
  }

  /**
   * Get filter from filters to be applied given a field name
   *
   * @param {Field} field
   * @returns {void}
   */
  function filtersToBeAppliedGetFilterField(
    field: Field,
  ): FiltersAppliedFieldLevel | undefined {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(field)) return;

    // Search for field in filters to be applied
    const f = filtersToBeApplied.filters.find((f) => f.field === field);

    if (isUndefined(f)) {
      return;
    }

    return ObjectUtils.cloneDeep(f);
  }

  /**
   * Get filter from filters to be applied
   *
   * @param {Field} field
   * @returns {void}
   */
  function filtersToBeAppliedGetFilterFieldIdx(field: Field): number {
    // Validate
    if (StringUtils.isEmpty(field)) return -1;

    // Search for field in filters to be applied
    return filtersToBeApplied.filters.findIndex((f) => f.field === field);
  }

  /**
   * Remove filter from filters to be applied
   */
  function globalFiltersToBeAppliedRemoveFiltersGroupByField(field: Field) {
    // Validate
    if (StringUtils.isEmpty(field)) {
      if (import.meta.env.DEV)
        console.warn(
          `** Warning in globalFiltersToBeAppliedRemoveFiltersGroupByField: Invalid parameters. field: ${field}`,
        );
      return;
    }

    if (ArrayUtils.isEmpty(filtersToBeApplied.filters)) {
      if (import.meta.env.DEV)
        console.warn(
          `** Warning in globalFiltersToBeAppliedRemoveFiltersGroupByField: Invalid parameters. data.filtersToBeApplied.filters: ${filtersToBeApplied.filters}`,
        );
      return;
    }

    // Search in applied filters for the given field
    const fieldIdx = filtersToBeApplied.filters.findIndex(
      (f) => f.field === field,
    );

    // Not found
    if (fieldIdx === -1) {
      return;
    }

    // Remove filter
    filtersToBeApplied.filters.splice(fieldIdx, 1);
  }

  /**
   * Remove filter from filters to be applied
   *
   * @param {field: Field, operator: string, value: string} filter - The filter to be removed
   * @returns {void}
   */
  function setFiltersToBeAppliedRemoveFilter({
    field,
    operator,
    value,
  }: {
    field: Field;
    operator: string;
    value: string;
  }): void {
    // Validate
    if (StringUtils.isEmpty(field)) {
      if (import.meta.env.DEV)
        console.log(`** Error in setFiltersToBeAppliedRemoveFilter: field is empty.`);
      return;
    }

    if (StringUtils.isEmpty(operator)) {
      if (import.meta.env.DEV)
        console.log(
          `** Error in setFiltersToBeAppliedRemoveFilter: operator is empty.`,
        );
      return;
    }

    if (StringUtils.isEmpty(value)) {
      if (import.meta.env.DEV)
        console.log(`** Error in setFiltersToBeAppliedRemoveFilter: value is empty.`);
      return;
    }

    // Validate filters to be applied
    if (ArrayUtils.isEmpty(filtersToBeApplied.filters)) {
      if (import.meta.env.DEV)
        console.log(
          `** Error in setFiltersToBeAppliedRemoveFilter: data.filtersToBeApplied.filters is empty.`,
        );
      return;
    }

    // Search in applied filters fields
    filtersToBeApplied.filters.forEach((f: FiltersAppliedFieldLevel, idx) => {
      if (f.field !== field) {
        return;
      }

      // Field group found

      // Search in field group of applied filters
      const filterIdx = f.filters.findIndex(
        (filter: Filter) => filter.value === value,
      );

      if (filterIdx === -1) {
        return;
      }

      // Filter found

      // Remove value from field group
      f.filters.splice(filterIdx, 1);

      // Is field group empty?
      if (!ArrayUtils.isEmpty(f.filters)) {
        return;
      }

      // Remove field group from applied filters
      filtersToBeApplied.filters.splice(idx, 1);
    });
  }

  /**
   * Clean empty filters from filters to be applied
   *
   * @returns {void}
   */
  function setFiltersToBeAppliedCleanEmptyFilters(): void {
    // Validate
    if (ArrayUtils.isEmpty(filtersToBeApplied.filters)) {
      if (import.meta.env.DEV)
        console.log(
          `** Error in setFiltersToBeAppliedCleanEmptyFilters: data.filtersToBeApplied.filters is empty.`,
        );
      return;
    }

    // Remove empty field groups (rebuild instead of splicing while iterating,
    // which would skip the group right after each one removed)
    filtersToBeApplied.filters = filtersToBeApplied.filters.filter(
      (f: FiltersAppliedFieldLevel) => !ArrayUtils.isEmpty(f.filters),
    );
  }

  /**
   * Is field in filters to be applied
   *
   * @param {Field} field
   * @returns {boolean}
   */
  function globalFiltersToBeAppliedIsFieldInFiltersToBeApplied(
    field: Field,
  ): boolean {
    // Validate
    if (
      StringUtils.isEmpty(field) ||
      ArrayUtils.isEmpty(filtersToBeApplied.filters)
    ) {
      return false;
    }

    // Search in applied filters for the given field
    const fieldInFiltersIdx = filtersToBeApplied.filters.findIndex(
      (f) => f.field === field,
    );

    // Field not found
    if (fieldInFiltersIdx === -1) {
      return false;
    }

    // Field found
    return true;
  }

  return {
    filtersToBeAppliedSet,
    setFiltersToBeAppliedAddFilter,
    filtersToBeAppliedGetFilterField,
    globalFiltersToBeAppliedRemoveFiltersGroupByField,
    setFiltersToBeAppliedRemoveFilter,
    setFiltersToBeAppliedCleanEmptyFilters,
    globalFiltersToBeAppliedIsFieldInFiltersToBeApplied,
  };
};

export default useFiltersToBeApplied;
