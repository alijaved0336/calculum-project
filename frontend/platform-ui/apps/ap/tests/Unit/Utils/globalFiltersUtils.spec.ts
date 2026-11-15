/**
 * Unit tests for globalFiltersUtils
 */

import { describe, it, expect } from "vitest";
import {
  GLOBAL_FILTER_EMPTY_VALUE,
  addFilterLogError,
  filterItemsByAllCategory,
  filterItemsByCategory,
  filtersAppliedGetFormattedLevel,
  formatMultipleCheckboxesValueLabel,
  getActiveGlobalFilterLabels,
  getFieldName,
  getIconNameByLabel,
  hasActiveGlobalFilter,
  isValidTargetLevel,
  mapBooleanArrayToItems,
  mapGroupedArrayToItems,
  mapNumberArrayToItems,
  sortEmptyValueFirst,
} from "@/utils/globalFiltersUtils";
import type { GlobalFiltersPanelBarItem } from "@/types";

function createMockItem(
  field: string,
  categories: string[],
): GlobalFiltersPanelBarItem {
  return {
    field: field as any,
    categories: categories as any,
    isLoading: false,
    expanded: false,
    levelSelected: "spends",
    levelSelectedDefault: "spends",
  } as GlobalFiltersPanelBarItem;
}

describe("globalFiltersUtils", () => {
  describe("getFieldName", () => {
    it("should return field with colon suffix for non-empty string", () => {
      expect(getFieldName("currency")).toBe("currency:");
      expect(getFieldName("commodity")).toBe("commodity:");
      expect(getFieldName("SME")).toBe("SME:");
    });

    it("should return empty string for undefined", () => {
      expect(getFieldName(undefined)).toBe("");
    });

    it("should return empty string for empty string", () => {
      expect(getFieldName("")).toBe("");
    });
  });

  describe("filtersAppliedGetFormattedLevel", () => {
    it("should return SL for spends", () => {
      expect(filtersAppliedGetFormattedLevel("spends")).toBe("SL");
    });

    it("should return S for suppliers", () => {
      expect(filtersAppliedGetFormattedLevel("suppliers")).toBe("S");
    });

    it("should return P for parents", () => {
      expect(filtersAppliedGetFormattedLevel("parents")).toBe("P");
    });

    it("should return empty string for undefined", () => {
      expect(filtersAppliedGetFormattedLevel(undefined)).toBe("");
    });

    it("should return empty string for null", () => {
      expect(filtersAppliedGetFormattedLevel(null)).toBe("");
    });

    it("should return empty string for unknown level", () => {
      expect(filtersAppliedGetFormattedLevel("potentials" as any)).toBe("");
    });
  });

  describe("getIconNameByLabel", () => {
    it("should return correct icon for Company Size labels", () => {
      expect(getIconNameByLabel("Emerging")).toBe("IconEmerging");
      expect(getIconNameByLabel("Small")).toBe("IconSmEnterprise");
      expect(getIconNameByLabel("Midsize Small")).toBe("IconMidMarketEnterprise");
      expect(getIconNameByLabel("Midsize Medium")).toBe("IconMedEnterprise");
      expect(getIconNameByLabel("Midsize Large")).toBe("IconLargeEnterprise");
      expect(getIconNameByLabel("Large")).toBe("IconCorporation");
    });

    it("should return empty string for undefined", () => {
      expect(getIconNameByLabel(undefined)).toBe("");
    });

    it("should return empty string for unknown label", () => {
      expect(getIconNameByLabel("Unknown")).toBe("");
      expect(getIconNameByLabel("")).toBe("");
    });
  });

  describe("filterItemsByAllCategory", () => {
    const allFlags = {
      smeEnabled: true,
      vCardEnabled: true,
      userPartnerEnabled: true,
      creditRatingEnabled: true,
      modulePlanAvailable: true,
    };

    it("should return all items when all flags enabled", () => {
      const items = [
        createMockItem("currency", ["all"]),
        createMockItem("isSME", ["all"]),
      ];
      expect(filterItemsByAllCategory(items, allFlags)).toHaveLength(2);
    });

    it("should filter out isSME when smeEnabled is false", () => {
      const items = [
        createMockItem("currency", ["all"]),
        createMockItem("isSME", ["all"]),
      ];
      const result = filterItemsByAllCategory(items, {
        ...allFlags,
        smeEnabled: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("currency");
    });

    it("should filter out vCard fields when vCardEnabled is false", () => {
      const items = [
        createMockItem("currency", ["all"]),
        createMockItem("vCardGroupName", ["all"]),
      ];
      const result = filterItemsByAllCategory(items, {
        ...allFlags,
        vCardEnabled: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("currency");
    });

    it("should filter out planPhaseNames when modulePlanAvailable is false", () => {
      const items = [
        createMockItem("currency", ["all"]),
        createMockItem("planPhaseNames", ["all"]),
      ];
      const result = filterItemsByAllCategory(items, {
        ...allFlags,
        modulePlanAvailable: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("currency");
    });

    it("should filter out actualPaymentTerms when hideAverageDaysPaid is true", () => {
      const items = [
        createMockItem("currency", ["all"]),
        createMockItem("actualPaymentTerms", ["all"]),
      ];
      const result = filterItemsByAllCategory(items, {
        ...allFlags,
        hideAverageDaysPaid: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("currency");
    });

    it("should keep actualPaymentTerms when hideAverageDaysPaid is false", () => {
      const items = [
        createMockItem("currency", ["all"]),
        createMockItem("actualPaymentTerms", ["all"]),
      ];
      const result = filterItemsByAllCategory(items, {
        ...allFlags,
        hideAverageDaysPaid: false,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("filterItemsByCategory", () => {
    const flags = {
      smeEnabled: true,
      vCardEnabled: true,
      userPartnerEnabled: true,
      creditRatingEnabled: true,
      modulePlanAvailable: true,
    };

    it("should filter items by category", () => {
      const items = [
        createMockItem("currency", ["sizeAndRating"]),
        createMockItem("commodity", ["commodity"]),
      ];
      const result = filterItemsByCategory(items, "sizeAndRating", flags);
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("currency");
    });

    it("should filter out isSME for sizeAndRating when smeEnabled is false", () => {
      const items = [
        createMockItem("currency", ["sizeAndRating"]),
        createMockItem("isSME", ["sizeAndRating"]),
      ];
      const result = filterItemsByCategory(items, "sizeAndRating", {
        ...flags,
        smeEnabled: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("currency");
    });

    it("should filter out actualPaymentTerms when hideAverageDaysPaid is true", () => {
      const items = [
        createMockItem("currency", ["spendVolumeAndPaymentTerms"]),
        createMockItem("actualPaymentTerms", ["spendVolumeAndPaymentTerms"]),
      ];
      const result = filterItemsByCategory(items, "spendVolumeAndPaymentTerms", {
        ...flags,
        hideAverageDaysPaid: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("currency");
    });

    it("should keep actualPaymentTerms when hideAverageDaysPaid is false", () => {
      const items = [
        createMockItem("currency", ["spendVolumeAndPaymentTerms"]),
        createMockItem("actualPaymentTerms", ["spendVolumeAndPaymentTerms"]),
      ];
      const result = filterItemsByCategory(items, "spendVolumeAndPaymentTerms", {
        ...flags,
        hideAverageDaysPaid: false,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("mapNumberArrayToItems", () => {
    it("should map number array to items", () => {
      const result = mapNumberArrayToItems([1, 2, 3]);
      expect(result).toEqual([
        { key: 1, value: 1, checked: false },
        { key: 2, value: 2, checked: false },
        { key: 3, value: 3, checked: false },
      ]);
    });

    it("should filter out null and non-number values", () => {
      const result = mapNumberArrayToItems([1, null, "str", 2, undefined]);
      expect(result).toEqual([
        { key: 1, value: 1, checked: false },
        { key: 2, value: 2, checked: false },
      ]);
    });

    it("should return empty array for empty input", () => {
      expect(mapNumberArrayToItems([])).toEqual([]);
    });

    // The box fields (box, scfBox, financialBox, vCardBox) keep discarding the marker by
    // design — they have no "no value" option. Pinned so the empty-option work on the text
    // filters is not later "completed" by making the numeric mapper pass it through too.
    it("should discard the null marker sent by the box fields", () => {
      const result = mapNumberArrayToItems([1, 2, 3, GLOBAL_FILTER_EMPTY_VALUE]);
      expect(result).toEqual([
        { key: 1, value: 1, checked: false },
        { key: 2, value: 2, checked: false },
        { key: 3, value: 3, checked: false },
      ]);
    });
  });

  describe("sortEmptyValueFirst", () => {
    it("should move the null marker to the front, keeping the rest in order", () => {
      const items = [
        { key: 30, value: 30, checked: false },
        { key: 60, value: 60, checked: false },
        {
          key: GLOBAL_FILTER_EMPTY_VALUE,
          value: GLOBAL_FILTER_EMPTY_VALUE,
          checked: false,
        },
        { key: 90, value: 90, checked: false },
      ];

      expect(sortEmptyValueFirst(items)).toEqual([
        {
          key: GLOBAL_FILTER_EMPTY_VALUE,
          value: GLOBAL_FILTER_EMPTY_VALUE,
          checked: false,
        },
        { key: 30, value: 30, checked: false },
        { key: 60, value: 60, checked: false },
        { key: 90, value: 90, checked: false },
      ]);
    });
  });

  describe("mapBooleanArrayToItems", () => {
    it("should map boolean array to items", () => {
      const result = mapBooleanArrayToItems([true, false]);
      expect(result).toEqual([
        { key: "true", value: true, checked: true },
        { key: "false", value: false, checked: false },
      ]);
    });

    it("should filter out null and non-boolean values", () => {
      const result = mapBooleanArrayToItems([true, null, "str", false]);
      expect(result).toEqual([
        { key: "true", value: true, checked: true },
        { key: "false", value: false, checked: false },
      ]);
    });
  });

  describe("mapGroupedArrayToItems", () => {
    it("should map valid grouped array to item", () => {
      const item = createMockItem("field", ["all"]);
      item.itemData = { items: [] };
      const arr = [
        { value: "Group1", items: ["a", "b"] },
        { value: "Group2", items: ["c"] },
      ];
      const result = mapGroupedArrayToItems(arr, item);
      expect(result).toBe(true);
      const items = item.itemData?.items ?? [];
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        key: "Group1",
        value: arr[0],
      });
    });

    it("should return false for invalid items in array", () => {
      const item = createMockItem("field", ["all"]);
      item.itemData = { items: [] };
      const arr = [null, { value: "x", items: [] }];
      const result = mapGroupedArrayToItems(arr, item);
      expect(result).toBe(false);
    });

    it("should return false when item has invalid structure", () => {
      const item = createMockItem("field", ["all"]);
      item.itemData = { items: [] };
      const arr = [{ value: 123, items: [] }]; // value is number, not string
      const result = mapGroupedArrayToItems(arr, item);
      expect(result).toBe(false);
    });
  });

  describe("isValidTargetLevel", () => {
    it("should return true for valid levels", () => {
      expect(isValidTargetLevel("spends")).toBe(true);
      expect(isValidTargetLevel("suppliers")).toBe(true);
      expect(isValidTargetLevel("parents")).toBe(true);
    });

    it("should return false for invalid levels", () => {
      expect(isValidTargetLevel("potentials")).toBe(false);
      expect(isValidTargetLevel("")).toBe(false);
      expect(isValidTargetLevel("unknown")).toBe(false);
    });
  });

  describe("addFilterLogError", () => {
    it("should not throw when called", () => {
      expect(() => addFilterLogError("test")).not.toThrow();
      expect(() => addFilterLogError("test", "value")).not.toThrow();
    });
  });

  describe("formatMultipleCheckboxesValueLabel", () => {
    it("should return single value as-is when length <= 10", () => {
      expect(formatMultipleCheckboxesValueLabel(["short"])).toBe("short");
    });

    it("should truncate long single value to 10 chars", () => {
      expect(formatMultipleCheckboxesValueLabel(["verylongvalue"])).toBe(
        "verylongva",
      );
    });

    it("should add suffix for multiple values", () => {
      expect(formatMultipleCheckboxesValueLabel(["a", "b", "c"])).toBe(
        "a... +2",
      );
    });

    it("should truncate and add suffix for multiple long values", () => {
      expect(
        formatMultipleCheckboxesValueLabel(["verylongvalue", "b"]),
      ).toBe("verylongva... +1");
    });
  });
  describe("hasActiveGlobalFilter", () => {
    it("should be false for an empty, null or undefined filter set", () => {
      expect(hasActiveGlobalFilter({ filters: [], logic: "and" } as any)).toBe(false);
      expect(hasActiveGlobalFilter(null)).toBe(false);
      expect(hasActiveGlobalFilter(undefined)).toBe(false);
    });

    it("should be true when at least one field group is applied", () => {
      const filtersApplied = {
        filters: [{ field: "buyerCountry", filters: [], level: "spends", logic: "or" }],
        logic: "and",
      } as any;

      expect(hasActiveGlobalFilter(filtersApplied)).toBe(true);
    });
  });

  describe("getActiveGlobalFilterLabels", () => {
    const translateField = (field: string) =>
      field === "buyerCountry" ? "Buyer Country" : field;

    it("should return no labels when no filter is applied", () => {
      expect(
        getActiveGlobalFilterLabels({ filters: [], logic: "and" } as any, translateField),
      ).toEqual([]);
    });

    it("should label a single value with the translated field title", () => {
      const filtersApplied = {
        filters: [
          {
            field: "buyerCountry",
            level: "spends",
            logic: "or",
            filters: [{ field: "buyerCountry", operator: "eq", value: "France" }],
          },
        ],
        logic: "and",
      } as any;

      expect(getActiveGlobalFilterLabels(filtersApplied, translateField)).toEqual([
        "Buyer Country: France",
      ]);
    });

    it("should summarise extra values like the filters-applied badge", () => {
      const filtersApplied = {
        filters: [
          {
            field: "buyerCountry",
            level: "spends",
            logic: "or",
            filters: [
              { field: "buyerCountry", operator: "eq", value: "United Kingdom" },
              { field: "buyerCountry", operator: "eq", value: "France" },
            ],
          },
        ],
        logic: "and",
      } as any;

      expect(getActiveGlobalFilterLabels(filtersApplied, translateField)).toEqual([
        "Buyer Country: United Kin... +1",
      ]);
    });

    it("should prefer fieldLabel and skip groups with no values", () => {
      const filtersApplied = {
        filters: [
          {
            field: "customDataPoint1",
            fieldLabel: "Region Code",
            level: "spends",
            logic: "or",
            filters: [{ field: "customDataPoint1", operator: "eq", value: "EMEA" }],
          },
          { field: "buyerCountry", level: "spends", logic: "or", filters: [] },
        ],
        logic: "and",
      } as any;

      expect(getActiveGlobalFilterLabels(filtersApplied, translateField)).toEqual([
        "Region Code: EMEA",
      ]);
    });
  });
});
