import type {
  CategoryName,
  Field,
  FiltersApplied,
  FiltersAppliedFieldLevel,
  FiltersGrouped,
  GlobalFiltersPanelBarItem,
  TargetView,
} from "@/types";
import {
  TARGET_VIEW_LEVELS,
  TARGET_VIEW_PARENTS,
  TARGET_VIEW_SPENDS,
  TARGET_VIEW_SUPPLIERS,
} from "@/types";

/**
 * Global filters display utilities.
 *
 * These helpers are used by MainLayoutFilters and related components to format
 * filter labels, levels, and icon names for the global filters UI (e.g. Company Size,
 * filters applied badges).
 */

// Re-exported so this module stays the single import surface for global-filter helpers.
// They live in their own leaf module because components need them without the `@/types` graph.
export {
  GLOBAL_FILTER_EMPTY_VALUE,
  sortEmptyValueFirst,
} from "@/utils/globalFilterEmptyValue";

export type FilterCategoryFlags = {
  smeEnabled: boolean;
  vCardEnabled: boolean;
  userPartnerEnabled: boolean;
  creditRatingEnabled?: boolean;
  modulePlanAvailable: boolean;
  forecastEnabled?: boolean;
  hideAverageDaysPaid?: boolean;
  financingEnabled?: boolean;
};

/**
 * Filters panel bar items by feature flags for the "All" category view.
 * Excludes items whose features are disabled (SME, vCard, user partner, credit rating, plan phases).
 *
 * @param items - Panel bar items to filter
 * @param flags - Feature flags controlling which filter categories are available
 * @returns Filtered items visible in the "All" category
 *
 * @example
 * const items = [...]; // panel bar items
 * const flags = { smeEnabled: true, vCardEnabled: false, userPartnerEnabled: true, modulePlanAvailable: true };
 * const visible = filterItemsByAllCategory(items, flags);
 * // Items with vCard fields (vCardGroupName, isVCardApplied, vCardBox) are excluded
 */
export function filterItemsByAllCategory(
  items: GlobalFiltersPanelBarItem[],
  flags: FilterCategoryFlags,
): GlobalFiltersPanelBarItem[] {
  let result = flags.smeEnabled
    ? items
    : items.filter((item) => item.field !== "isSME");
  result = flags.vCardEnabled
    ? result
    : result.filter(
        (item) =>
          item.field !== "vCardGroupName" &&
          item.field !== "isVCardApplied" &&
          item.field !== "vCardBox",
      );

  result = flags.userPartnerEnabled
    ? result
    : result.filter(
        (item) =>
          item.field !== "financialBox" 
      );

  result = flags.financingEnabled
    ? result
    : result.filter(
        (item) =>
          item.field !== "financings" &&
          item.field !== "scfBox",
      );

  if (flags.creditRatingEnabled === false) {
    result = result.filter(
      (item) => item.field !== "entityStockPerformanceMarketIndex",
    );
  }

  if (flags.forecastEnabled === false) {
    result = result.filter(
      (item) => item.field !== "forecastVolume",
    );
  }

  if (!flags.modulePlanAvailable) {
    result = result.filter((item) => item.field !== "planPhaseNames");
  }
  if (flags.hideAverageDaysPaid) {
    result = result.filter((item) => item.field !== "actualPaymentTerms");
  }
  return result;
}

function filterScfVcardDiscounting(
  result: GlobalFiltersPanelBarItem[],
  flags: FilterCategoryFlags,
): GlobalFiltersPanelBarItem[] {
  if (!flags.vCardEnabled) {
    result = result.filter(
      (item) =>
        item.field !== "vCardGroupName" && item.field !== "isVCardApplied",
    );
  }
  if (!flags.userPartnerEnabled) {
    result = result.filter(
      (item) =>
        item.field !== "financialBox" 
    );
  }

  if (!flags.financingEnabled) {
    result = result.filter(
      (item) =>
        item.field !== "financings" &&
        item.field !== "scfBox"
    );
  }

  return result;
}

/**
 * Filters panel bar items by category name and feature flags.
 * Applies category-specific rules (e.g. sizeAndRating, scfVcardDiscounting, opportunity).
 *
 * @param items - Panel bar items to filter
 * @param category - Category name (e.g. "sizeAndRating", "scfVcardDiscounting", "opportunity")
 * @param flags - Feature flags controlling which filter fields are available
 * @returns Filtered items for the given category
 *
 * @example
 * const items = [...]; // panel bar items
 * const flags = { smeEnabled: true, vCardEnabled: true, userPartnerEnabled: false, modulePlanAvailable: true };
 * const sizeItems = filterItemsByCategory(items, "sizeAndRating", flags);
 * const scfItems = filterItemsByCategory(items, "scfVcardDiscounting", flags);
 */
export function filterItemsByCategory(
  items: GlobalFiltersPanelBarItem[],
  category: CategoryName,
  flags: FilterCategoryFlags,
): GlobalFiltersPanelBarItem[] {
  let result = items.filter((item) => item.categories.includes(category));
  if (!flags.modulePlanAvailable) {
    result = result.filter((item) => item.field !== "planPhaseNames");
  }
  if (category === "sizeAndRating" && !flags.smeEnabled) {
    return result.filter((item) => item.field !== "isSME");
  }
  if (category === "scfVcardDiscounting") {
    return filterScfVcardDiscounting(result, flags);
  }
  if (category === "opportunity") {
    if (!flags.userPartnerEnabled) {
      result = result.filter(
        (item) =>
          item.field !== "financialBox"
      );
    }

    if (!flags.financingEnabled) {
      result = result.filter(
        (item) =>
          item.field !== "financings" &&
          item.field !== "scfBox",
      );
    }

    if (!flags.vCardEnabled) {
      result = result.filter((item) => item.field !== "vCardBox");
    }
    return result;
  }
  if (category === "sizeAndRating" && flags.creditRatingEnabled === false) {
    return result.filter(
      (item) => item.field !== "entityStockPerformanceMarketIndex",
    );
  }

  if (flags.forecastEnabled === false) {
    result = result.filter(
      (item) => item.field !== "forecastVolume",
    );
  }
  if (flags.hideAverageDaysPaid) {
    result = result.filter((item) => item.field !== "actualPaymentTerms");
  }
  return result;
}

/**
 * Maps an array of numbers to checkbox/radio item format.
 * Skips null and non-number values.
 *
 * @param arr - Array of values (numbers, null, or other types)
 * @returns Array of items with key, value, and checked: false
 *
 * @example
 * mapNumberArrayToItems([1, 2, 3]);        // [{ key: 1, value: 1, checked: false }, ...]
 * mapNumberArrayToItems([1, null, "x", 2]); // [{ key: 1, value: 1, checked: false }, { key: 2, value: 2, checked: false }]
 */
export function mapNumberArrayToItems(
  arr: unknown[],
): { key: number; value: number; checked: boolean }[] {
  return arr
    .map((i) => {
      if (i === null || typeof i !== "number") return null;
      return { key: i, value: i, checked: false };
    })
    .filter((i) => i !== null) as {
    key: number;
    value: number;
    checked: boolean;
  }[];
}

/**
 * Maps an array of booleans to checkbox item format.
 * Skips null and non-boolean values. Checked state mirrors the boolean value.
 *
 * @param arr - Array of values (booleans, null, or other types)
 * @returns Array of items with key (string), value (boolean), and checked (same as value)
 *
 * @example
 * mapBooleanArrayToItems([true, false]);     // [{ key: "true", value: true, checked: true }, { key: "false", value: false, checked: false }]
 * mapBooleanArrayToItems([true, null, "x"]); // [{ key: "true", value: true, checked: true }]
 */
export function mapBooleanArrayToItems(
  arr: unknown[],
): { key: string; value: boolean; checked: boolean }[] {
  return arr
    .map((i) => {
      if (i === null || typeof i !== "boolean") return null;
      return { key: i.toString(), value: i, checked: i };
    })
    .filter((i) => i !== null) as {
    key: string;
    value: boolean;
    checked: boolean;
  }[];
}

/**
 * Maps a grouped array (objects with value and items) to panel bar item format.
 * Mutates item.itemData.items in place. Returns false if any element is invalid.
 *
 * @param arr - Array of objects with { value: string, items: unknown[] }
 * @param item - Panel bar item whose itemData.items will be populated
 * @returns true if all elements are valid and mapping succeeded, false otherwise
 *
 * @example
 * const item = { itemData: { items: [] }, field: "region", ... };
 * const arr = [{ value: "EMEA", items: ["UK", "DE"] }, { value: "APAC", items: ["JP"] }];
 * mapGroupedArrayToItems(arr, item); // true, item.itemData.items = [{ key: "EMEA", value: arr[0] }, { key: "APAC", value: arr[1] }]
 * mapGroupedArrayToItems([null, { value: "x", items: [] }], item); // false
 */
export function mapGroupedArrayToItems(
  arr: unknown[],
  item: GlobalFiltersPanelBarItem,
): boolean {
  const items: { key: string; value: unknown }[] = [];
  for (const i of arr) {
    if (i === null || typeof i === "string") return false;
    if (
      !("value" in (i as object)) ||
      !("items" in (i as object)) ||
      typeof (i as { value: string }).value !== "string"
    ) {
      if (import.meta.env.DEV) console.error("** Error in setFieldsForItems. i is not valid. i:", i);
      return false;
    }
    items.push({ key: (i as { value: string }).value, value: i });
  }
  (item.itemData!.items as { key: string; value: unknown }[]) = items;
  return true;
}

/**
 * Type guard to check if a string is a valid target view level (spends, suppliers, parents).
 * Excludes "potentials" from valid levels.
 *
 * @param level - String to validate
 * @returns true if level is "spends", "suppliers", or "parents"
 *
 * @example
 * isValidTargetLevel("spends");   // true
 * isValidTargetLevel("suppliers"); // true
 * isValidTargetLevel("potentials"); // false
 * isValidTargetLevel("unknown");   // false
 */
export function isValidTargetLevel(level: string): level is TargetView {
  return (TARGET_VIEW_LEVELS as readonly string[]).includes(level);
}

/**
 * Logs a filter-related message in debug mode.
 * No-op when import.meta.env.DEV is false.
 *
 * @param msg - Log message
 * @param value - Optional value to log (e.g. invalid filter value)
 *
 * @example
 * addFilterLogError("Invalid filter value", rawValue);
 * addFilterLogError("Missing required field");
 */
export function addFilterLogError(msg: string, value?: unknown): void {
  if (import.meta.env.DEV) console.log(msg, value ?? "");
}

/**
 * Formats an array of selected checkbox values for display in filter badges.
 * Truncates first value if > 10 chars; appends "+N" for additional values.
 *
 * @param value - Array of selected value strings
 * @returns Formatted label (e.g. "Option A", "VeryLongNa... +2")
 *
 * @example
 * formatMultipleCheckboxesValueLabel(["Small"]);           // "Small"
 * formatMultipleCheckboxesValueLabel(["Small", "Medium"]); // "Small... +1"
 * formatMultipleCheckboxesValueLabel(["VeryLongOptionName", "B", "C"]); // "VeryLongOp... +2"
 */
export function formatMultipleCheckboxesValueLabel(value: string[]): string {
  const valueFormatted =
    value[0].length > 10 ? value[0].substring(0, 10) : value[0];
  return value.length === 1
    ? valueFormatted
    : `${valueFormatted}... +${value.length - 1}`;
}

/**
 * True when the given applied-filters object holds at least one active filter.
 *
 * Mirrors the `getFiltersApplied.filters.length === 0` guard used across the
 * grids and TreeCards, so notices and banners share one definition of "a global
 * filter is active" instead of each component re-deriving it.
 *
 * @param filtersApplied - Applied filters from the global filters store
 * @returns true when at least one filter is applied
 *
 * @example
 * hasActiveGlobalFilter({ filters: [], logic: "and" });                    // false
 * hasActiveGlobalFilter({ filters: [buyerCountryGroup], logic: "and" });   // true
 * hasActiveGlobalFilter(undefined);                                        // false
 */
export function hasActiveGlobalFilter(
  filtersApplied: FiltersApplied | undefined | null,
): boolean {
  return (filtersApplied?.filters?.length ?? 0) > 0;
}

/**
 * Builds the per-field labels that identify the active global filter in notices
 * and banners, e.g. `["Buying Entity Country: United Kin... +1"]`.
 *
 * Field naming follows the filters-applied badges: `fieldLabel` wins when present
 * (custom data points set it), otherwise the caller-supplied translation of the
 * raw field name is used. Values reuse {@link formatMultipleCheckboxesValueLabel}
 * so a notice reads exactly like its badge.
 *
 * Groups with no values are skipped — a field can sit in `filtersApplied` with an
 * empty `filters` array while the user is still composing it in the panel.
 *
 * @param filtersApplied - Applied filters from the global filters store
 * @param translateField - Resolves a raw field name to its display title
 * @returns One label per active field, in the order the filters were applied
 *
 * @example
 * const t = (field) => field === "buyerCountry" ? "Buying Entity Country" : field;
 * getActiveGlobalFilterLabels(filtersApplied, t);
 * // ["Buying Entity Country: United Kin... +1"]
 *
 * @example
 * getActiveGlobalFilterLabels({ filters: [], logic: "and" }, t);  // []
 */
export function getActiveGlobalFilterLabels(
  filtersApplied: FiltersApplied | undefined | null,
  translateField: (field: string) => string,
): string[] {
  return getActiveGlobalFilterChips(filtersApplied, translateField).map(
    (chip) => `${chip.fieldLabel}: ${chip.valueLabel}`,
  );
}

/** One applied-filter pill: the badge data the filters bar renders per field. */
export type ActiveGlobalFilterChip = {
  field: Field;
  fieldLabel: string;
  level: TargetView;
  valueLabel: string;
};

/**
 * Same data the filters-applied badges of MainLayoutFilters render, but derived
 * from the store alone so a notice can show real pills without the panel-bar
 * items (which only MainLayoutFilters holds).
 *
 * Field naming and value formatting match the bar: `fieldLabel` wins when present
 * (custom data points set it), values go through
 * {@link formatMultipleCheckboxesValueLabel}. Groups with no values are skipped —
 * a field can sit in `filtersApplied` with an empty `filters` array while the user
 * is still composing it in the panel.
 *
 * @param filtersApplied - Applied filters from the global filters store
 * @param translateField - Resolves a raw field name to its display title
 * @returns One chip per active field, in the order the filters were applied
 *
 * @example
 * getActiveGlobalFilterChips(filtersApplied, t);
 * // [{ field: "buyerCountry", fieldLabel: "Buying Entity Country",
 * //    level: "suppliers", valueLabel: "United Kin... +1" }]
 */
export function getActiveGlobalFilterChips(
  filtersApplied: FiltersApplied | undefined | null,
  translateField: (field: string) => string,
): ActiveGlobalFilterChip[] {
  if (!hasActiveGlobalFilter(filtersApplied)) {
    return [];
  }

  return (filtersApplied as FiltersApplied).filters.reduce<
    ActiveGlobalFilterChip[]
  >((chips, group) => {
    const values = (group.filters ?? [])
      .map((filter) => String(filter.value))
      .filter((value) => value !== "");

    if (values.length === 0) {
      return chips;
    }

    chips.push({
      field: group.field,
      fieldLabel: group.fieldLabel ?? translateField(String(group.field)),
      level: group.level,
      valueLabel: formatMultipleCheckboxesValueLabel(values),
    });

    return chips;
  }, []);
}

/**
 * Returns field name with colon suffix for display in filter badges.
 *
 * @param field - Field name or undefined
 * @returns "fieldName:" or empty string if field is undefined
 *
 * @example
 * getFieldName("companySize");  // "companySize:"
 * getFieldName(undefined);     // ""
 */
export function getFieldName(field: string | undefined): string {
  return field ? `${field}:` : "";
}

/**
 * Returns short level code for filter badges (SL, S, P).
 *
 * @param level - Target view level (spends, suppliers, parents) or undefined/null
 * @returns "SL" for spends, "S" for suppliers, "P" for parents, "" otherwise
 *
 * @example
 * filtersAppliedGetFormattedLevel("spends");    // "SL"
 * filtersAppliedGetFormattedLevel("suppliers"); // "S"
 * filtersAppliedGetFormattedLevel("parents");   // "P"
 * filtersAppliedGetFormattedLevel(null);        // ""
 */
export function filtersAppliedGetFormattedLevel(
  level: TargetView | undefined | null,
): string {
  switch (level) {
    case TARGET_VIEW_SPENDS:
      return "SL";

    case TARGET_VIEW_SUPPLIERS:
      return "S";

    case TARGET_VIEW_PARENTS:
      return "P";

    default:
      return "";
  }
}

/**
 * Returns the level-chip color classes used by the filters-applied badges.
 *
 * @param level - Target view level (spends, suppliers, parents)
 * @returns Tailwind classes for the level chip
 *
 * @example
 * getClassesByLevel("suppliers"); // "bg-bluelight-100 text-bluelight-700"
 * getClassesByLevel("spends");    // "bg-gray-200"
 */
export function getClassesByLevel(level: TargetView): string {
  switch (level) {
    case "spends":
      return "bg-gray-200";

    case "suppliers":
      return "bg-bluelight-100 text-bluelight-700";

    case "parents":
      return "bg-indigo-200 text-indigo-700";

    default:
      // Validate
      if (import.meta.env.DEV)
        console.error("** (getClassesByLevel) Level not found. level:", level);

      return "bg-gray-200";
  }
}

/**
 * Returns icon component name for a given Company Size label.
 * Used in option cards (e.g. global filters Company Size).
 *
 * @param label - Company size label (e.g. "Emerging", "Small", "Large")
 * @returns Icon component name (e.g. "IconEmerging", "IconCorporation") or "" if unknown
 *
 * @example
 * getIconNameByLabel("Emerging");   // "IconEmerging"
 * getIconNameByLabel("Large");      // "IconCorporation"
 * getIconNameByLabel("Unknown");    // ""
 * getIconNameByLabel(undefined);    // ""
 */
export function getIconNameByLabel(label: string | undefined): string {
  if (label === undefined) {
    return "";
  }

  switch (label) {
    // *** Company Size ***

    case "Emerging":
      return "IconEmerging";

    case "Small":
      return "IconSmEnterprise";

    case "Midsize Small":
      return "IconMidMarketEnterprise";

    case "Midsize Medium":
      return "IconMedEnterprise";

    case "Midsize Large":
      return "IconLargeEnterprise";

    case "Large":
      return "IconCorporation";

    default:
      return "";
  }
}

/** Skip filter values that are empty (used when grouping filters by field). */
export function shouldSkipFilterValue(f: {
  field: Field;
  value: string | number;
}): boolean {
  return (
    (f.field as string) === "" ||
    (typeof f.value === "string" && f.value === "")
  );
}

/** Add a filter value to the matching group, or create a new group if none exists. */
export function addFilterValueToGroup(
  groups: FiltersGrouped[],
  field: Field,
  value: string | number,
  level: TargetView,
): void {
  if (typeof value !== "number" && typeof value !== "string") {
    if (import.meta.env.DEV)
      console.error("** Error: Unknown value type in globalFiltersTemplatesFiltersGrouped");
    return;
  }
  const valueStr = typeof value === "number" ? value.toString() : value;
  const group = groups.find((g) => g.field === field);
  if (group === undefined) {
    groups.push({ field, level, value: [valueStr] });
  } else {
    group.value.push(valueStr);
  }
}

/** Group flat filters by field and level into FiltersGrouped[]. */
export function groupFiltersByField(
  filters: FiltersAppliedFieldLevel[],
): FiltersGrouped[] {
  const result: FiltersGrouped[] = [];
  for (const filtersByField of filters) {
    for (const f of filtersByField.filters) {
      if (shouldSkipFilterValue(f)) continue;
      addFilterValueToGroup(result, f.field, f.value, filtersByField.level);
    }
  }
  return result;
}
