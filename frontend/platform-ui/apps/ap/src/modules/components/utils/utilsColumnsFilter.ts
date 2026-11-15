export interface Filter {
  field: string;
  operator: string;
  value: any;
}

interface FilterGroup {
  logic: "and" | "or";
  filters: (Filter | FilterGroup)[];
}

export interface RootFilter {
  logic: "and" | "or";
  filters: FilterGroup[];
}

function buildFieldGroup(field: string, values: any[]): FilterGroup {
  return {
    logic: "or",
    filters: values.map((value) => ({
      field,
      operator: "eq",
      value,
    })),
  };
}

// Finds the index of the filter group whose first filter targets the given field
function findExistingFieldGroupIndex(
  filters: FilterGroup[],
  field: string,
): number {
  return filters.findIndex((filterGroup) => {
    const firstFilter = filterGroup.filters?.[0];
    return !!firstFilter && "field" in firstFilter && firstFilter.field === field;
  });
}

// Removes values from a field group; returns null when the group becomes empty
function removeValuesFromGroup(
  group: FilterGroup,
  field: string,
  values: any[],
): FilterGroup | null {
  const valuesToRemove = new Set(values);
  const remainingFilters = group.filters.filter((filter) => {
    if ("field" in filter && filter.field === field) {
      return !valuesToRemove.has(filter.value);
    }
    return true;
  });

  if (remainingFilters.length === 0) {
    return null;
  }

  if (remainingFilters.length === group.filters.length) {
    return group;
  }

  return { logic: "or", filters: remainingFilters };
}

export function createNewDescriptorFilterStructure(
  field: string,
  values: any[],
  existingFilters?: RootFilter,
  operation: "add" | "remove" = "add",
): RootFilter {
  // If there are no existing filters, create new structure
  if (!existingFilters?.filters?.length) {
    return transformFilterValues({
      logic: "and",
      filters: [buildFieldGroup(field, values)],
    });
  }

  const existingFieldGroupIndex = findExistingFieldGroupIndex(
    existingFilters.filters,
    field,
  );

  // Create copy of existing filters
  const newFilters = [...existingFilters.filters];

  if (operation === "add") {
    const newFieldGroup = buildFieldGroup(field, values);
    if (existingFieldGroupIndex === -1) {
      newFilters.push(newFieldGroup);
    } else {
      // Replace the entire field group with new values (overwrite instead of append)
      newFilters[existingFieldGroupIndex] = newFieldGroup;
    }
  } else if (operation === "remove" && existingFieldGroupIndex !== -1) {
    const updatedGroup = removeValuesFromGroup(
      newFilters[existingFieldGroupIndex],
      field,
      values,
    );

    if (updatedGroup === null) {
      // If no values remain in the field, remove the group completely
      newFilters.splice(existingFieldGroupIndex, 1);
    } else {
      newFilters[existingFieldGroupIndex] = updatedGroup;
    }
  }

  return transformFilterValues({
    logic: existingFilters.logic,
    filters: newFilters,
  });
}

export function cleanNewDescriptorFilterStructure(): RootFilter {
  return {
    logic: "and",
    filters: [],
  };
}

/**
 * Transforms filter values for entityRegulatoryTermsStrategyModality field
 * - "Government Recommendation" → "P"
 * - "Strict Regulations" → "0 E"
 * @param value - The value to transform
 * @returns The transformed value or the original value if no transformation is needed
 */
export function transformRegulatoryTermsValue(value: any): any {
  if (typeof value === "string") {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "government recommendation") {
      return "P";
    }
    if (lowerValue === "strict regulations") {
      return "E";
    }
  }
  return value;
}
/**
 * Transforms filter values for entityRegulatoryTermsStrategyModality field
 * - "P" → "Government Recommendation"
 * - "E" → "Strict Regulations"
 * @param value - The value to transform
 * @returns The transformed value or the original value if no transformation is needed
 */
export function transformRegulatoryTermsValueInverse(value: any): any {
  if (typeof value === "string") {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "p") {
      return "Government Recommendation";
    }
    if (lowerValue === "e") {
      return "Strict Regulations";
    }
  }
  return value;
}
/**
 * Recursively transforms filter values in a filter structure
 * @param filter - The filter or filter group to transform
 * @returns The transformed filter or filter group
 */
function transformFilterRecursively(
  filter: Filter | FilterGroup,
): Filter | FilterGroup {
  // If it's a simple filter (Filter)
  if ("field" in filter) {
    // Transform value if field is entityRegulatoryTermsStrategyModality
    if (filter.field === "entityRegulatoryTermsStrategyModality") {
      return {
        ...filter,
        value: transformRegulatoryTermsValue(filter.value),
      };
    }
    return filter;
  }
  // If it's a filter group (FilterGroup)
  else if ("filters" in filter) {
    return {
      ...filter,
      filters: filter.filters.map(transformFilterRecursively),
    };
  }
  return filter;
}

/**
 * Transforms filter values in a RootFilter structure
 * Specifically transforms entityRegulatoryTermsStrategyModality values:
 * - "Government Recommendation" → "P"
 * - "Strict Regulations" → "0 E"
 * @param filter - The RootFilter to transform
 * @returns The transformed RootFilter
 */
export function transformFilterValues(filter: RootFilter): RootFilter {
  if (!filter || !filter.filters || filter.filters.length === 0) {
    return filter;
  }

  return {
    ...filter,
    filters: filter.filters.map((filterGroup) =>
      transformFilterRecursively(filterGroup) as FilterGroup,
    ),
  };
}

/**
 * Function to remove a specific field from existing filters
 * @param {string} fieldName - Name of the field to remove
 * @param {RootFilter} existingFilters - Existing filters
 * @returns {RootFilter} - New filter object without the specified field
 */
export function removeFieldFromFilters(
  fieldName: string,
  existingFilters: RootFilter,
): RootFilter {
  // If there are no filters, return empty structure
  if (
    !existingFilters ||
    !existingFilters.filters ||
    existingFilters.filters.length === 0
  ) {
    return cleanNewDescriptorFilterStructure();
  }

  // Recursive function to remove the field from nested structure
  function removeFieldRecursively(
    filterArray: (Filter | FilterGroup)[],
  ): (Filter | FilterGroup)[] {
    const result: (Filter | FilterGroup)[] = [];

    for (const filter of filterArray) {
      // If it's a simple filter (Filter)
      if ("field" in filter) {
        // Only include if the field does NOT match the one we want to remove
        if (filter.field !== fieldName) {
          result.push(filter);
        }
      }
      // If it's a filter group (FilterGroup)
      else if ("filters" in filter) {
        // Process sub-filters recursively
        const processedSubFilters = removeFieldRecursively(filter.filters);

        // Only include the group if it has filters after processing
        if (processedSubFilters.length > 0) {
          result.push({
            logic: filter.logic,
            filters: processedSubFilters,
          });
        }
      }
    }

    return result;
  }

  // Process main filters
  const processedFilters = removeFieldRecursively(existingFilters.filters);

  // Convert simple filters to groups to maintain RootFilter structure
  const convertedFilters: FilterGroup[] = processedFilters.map((filter) => {
    if ("field" in filter) {
      // If it's a simple filter, convert it to a group
      return {
        logic: "and",
        filters: [filter],
      };
    } else {
      // If it's already a group, return it as is
      return filter;
    }
  });

  // Return new filter structure
  return {
    logic: existingFilters.logic,
    filters: convertedFilters,
  };
}

// Usage:
/*const result = createFilterStructure('entityName', [
  '3M Company',
  'Aarsleff Rail A/S',
  'Advantage Resources Inc.'
]);*/

/** This is only for multiplesCheckboxes */
export function getCheckedLabelsText(selector: string): string[] {
  // Get all checkboxes with the .checkToSelect class
  const checkboxes = Array.from(
    document.querySelectorAll(selector),
  ) as HTMLInputElement[];

  // Filter only those that are marked and get the corresponding label text
  const selectedTexts = checkboxes
    .filter((cb) => cb.checked)
    .map((cb) => {
      // Find the label associated with the checkbox (the one with for=checkbox.id)
      const label = document.querySelector(`label[for="${cb.id}"]`);
      return label?.textContent?.trim() || "";
    });

  return selectedTexts;
  // Optional: filter empty texts in case any do not have a label
  // return selectedTexts.filter(text => text.length > 0);
}

const REGULATORY_TERMS_STRICT_REGULATIONS_LABEL = "Strict Regulations";
const REGULATORY_TERMS_GOVERNMENT_RECOMMENDATION_LABEL = "Government Recommendation";

function applyRegulatoryTermsFilterCasing(item: any): void {
  const value = item.entityRegulatoryTermsStrategyModality.toLowerCase();

  if (value === REGULATORY_TERMS_STRICT_REGULATIONS_LABEL) {
    item.entityRegulatoryTermsStrategyModality = "e";
  }

  if (value === REGULATORY_TERMS_GOVERNMENT_RECOMMENDATION_LABEL) {
    item.entityRegulatoryTermsStrategyModality = "p";
  }
}

function applyRegulatoryTermsDisplayCasing(item: any): void {
  const value = item.entityRegulatoryTermsStrategyModality.toLowerCase();

  if (value === "e") {
    item.entityRegulatoryTermsStrategyModality = REGULATORY_TERMS_STRICT_REGULATIONS_LABEL;
  }

  if (value === "p") {
    item.entityRegulatoryTermsStrategyModality = REGULATORY_TERMS_GOVERNMENT_RECOMMENDATION_LABEL;
  }
}

function reformatRegulatoryTermsItem(item: any, toFilter: boolean): void {
  if (!item?.entityRegulatoryTermsStrategyModality) {
    return;
  }

  if (toFilter) {
    applyRegulatoryTermsFilterCasing(item);
  } else {
    applyRegulatoryTermsDisplayCasing(item);
  }
}

export function reformatColumnsData(
  column: string,
  data: any[],
  toFilter: boolean = false,
): any[] {
  if (column !== "entityRegulatoryTermsStrategyModality") {
    return data;
  }

  return data.map((item) => {
    reformatRegulatoryTermsItem(item, toFilter);
    return item;
  });
}
