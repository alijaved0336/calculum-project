/**
 * Tests for useFiltersToBeApplied - the pure reducer over `filtersToBeApplied` extracted from
 * MainLayoutFilters.vue (WI 19547, US-1 Phase B, AC-04). No mounting - the composable only
 * mutates a plain object, so it's exercised directly.
 */

import { describe, it, expect, vi } from "vitest";

// The composable imports ArrayUtils/ObjectUtils/StringUtils from the "@/utils" barrel, which
// eagerly imports FormatData.ts -> the user store -> the API layer -> the app's main router
// (@/services/router), which eagerly imports every route's page component. That eventually
// circles back into "@/utils" for NumberUtils before the barrel finishes its own evaluation,
// throwing when this module is the first thing to trigger it (i.e. in a standalone composable
// test, not behind a full component mount that happens to warm the barrel first). Stub the
// router itself - the actual common choke point - rather than chasing each path into it.
vi.mock("@/services/router", () => ({ default: { push: vi.fn(), back: vi.fn() } }));

import useFiltersToBeApplied from "@/modules/globalFilters/composables/useFiltersToBeApplied";
import type { Field, FiltersApplied, GlobalFiltersPanelBarItem } from "@/types";

function makeComposable(
  overrides: Partial<{
    filtersToBeApplied: FiltersApplied;
    getItems: () => GlobalFiltersPanelBarItem[];
    getLevelSelected: (field: Field) => string | undefined;
    hasCustomDataPoint: (field: Field) => boolean;
    getCustomFieldName: (field: Field) => string;
  }> = {},
) {
  const filtersToBeApplied: FiltersApplied =
    overrides.filtersToBeApplied ?? { filters: [], logic: "and" };

  const composable = useFiltersToBeApplied({
    filtersToBeApplied,
    getItems: overrides.getItems ?? (() => []),
    getLevelSelected: overrides.getLevelSelected ?? (() => "suppliers"),
    hasCustomDataPoint: overrides.hasCustomDataPoint ?? (() => false),
    getCustomFieldName: overrides.getCustomFieldName ?? (() => "Custom Field"),
  });

  return { filtersToBeApplied, ...composable };
}

describe("useFiltersToBeApplied", () => {
  describe("filtersToBeAppliedSet", () => {
    it("replaces filters and logic in place (mutating the passed-in filtersToBeApplied)", () => {
      const { filtersToBeApplied, filtersToBeAppliedSet } = makeComposable();
      const original = filtersToBeApplied;

      filtersToBeAppliedSet({
        filters: [
          { field: "commodity", filters: [], level: "suppliers", logic: "or" },
        ],
        logic: "or",
      });

      expect(filtersToBeApplied).toBe(original); // same reference, mutated in place
      expect(filtersToBeApplied.filters).toHaveLength(1);
      expect(filtersToBeApplied.logic).toBe("or");
    });

    it("deep clones the input (mutating the source afterwards does not affect state)", () => {
      const { filtersToBeApplied, filtersToBeAppliedSet } = makeComposable();
      const source: FiltersApplied = {
        filters: [
          { field: "commodity", filters: [], level: "suppliers", logic: "or" },
        ],
        logic: "and",
      };

      filtersToBeAppliedSet(source);
      source.filters[0].level = "parents";

      expect(filtersToBeApplied.filters[0].level).toBe("suppliers");
    });
  });

  describe("setFiltersToBeAppliedAddFilter - validation", () => {
    it("does nothing when the filter is missing field/operator/value", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable();

      setFiltersToBeAppliedAddFilter({
        filter: { field: "" as Field, operator: "eq", value: "" },
        filterType: "radioBtn",
      });

      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("does nothing when the field has no selected level", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({ getLevelSelected: () => undefined });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "commodity", operator: "eq", value: "steel" },
        filterType: "radioBtn",
      });

      expect(filtersToBeApplied.filters).toHaveLength(0);
    });
  });

  describe("setFiltersToBeAppliedAddFilter - first filter (filtersToBeApplied starts empty)", () => {
    it("adds a radioBtn filter with 'or' logic", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable();

      setFiltersToBeAppliedAddFilter({
        filter: { field: "isSME", operator: "eq", value: "yes" },
        filterType: "radioBtn",
      });

      expect(filtersToBeApplied.filters).toEqual([
        {
          field: "isSME",
          filters: [{ field: "isSME", operator: "eq", value: "yes" }],
          level: "suppliers",
          logic: "or",
        },
      ]);
    });

    it("rejects a radioBtn filter with a non string/number value", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable();

      setFiltersToBeAppliedAddFilter({
        filter: {
          field: "isSME",
          operator: "eq",
          value: { min: 1, max: 2 },
        },
        filterType: "radioBtn",
      });

      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("adds a multipleCheckboxes filter", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable();

      setFiltersToBeAppliedAddFilter({
        filter: { field: "commodity", operator: "eq", value: "steel" },
        filterType: "multipleCheckboxes",
      });

      expect(filtersToBeApplied.filters[0].field).toBe("commodity");
      expect(filtersToBeApplied.filters[0].logic).toBe("or");
    });

    it("rejects a multipleCheckboxes filter with a range value", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable();

      setFiltersToBeAppliedAddFilter({
        filter: { field: "commodity", operator: "eq", value: { min: 1, max: 2 } },
        filterType: "multipleCheckboxes",
      });

      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("adds a rangeSlider filter as gte + lte, with 'and' logic", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable();

      setFiltersToBeAppliedAddFilter({
        filter: {
          field: "volume",
          operator: "gte",
          value: { min: 10, max: 90 },
        },
        filterType: "rangeSlider",
      });

      expect(filtersToBeApplied.filters).toEqual([
        {
          field: "volume",
          filters: [
            { field: "volume", operator: "gte", value: 10 },
            { field: "volume", operator: "lte", value: 90 },
          ],
          level: "suppliers",
          logic: "and",
        },
      ]);
    });

    it("rejects a rangeSlider filter with a single value", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable();

      setFiltersToBeAppliedAddFilter({
        filter: { field: "volume", operator: "gte", value: "not-a-range" },
        filterType: "rangeSlider",
      });

      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("sets fieldLabel from the matching item's title when the field is a custom data point", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({
          hasCustomDataPoint: (field) => field === "customDataPoint1",
          getItems: () => [
            { field: "customDataPoint1", title: "Region Manager" } as GlobalFiltersPanelBarItem,
          ],
        });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "customDataPoint1", operator: "eq", value: "north" },
        filterType: "multipleCheckboxes",
      });

      expect(filtersToBeApplied.filters[0]).toMatchObject({
        field: "customDataPoint1",
        fieldLabel: "Region Manager",
      });
    });

    it("falls back to getCustomFieldName when the item has no title", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({
          hasCustomDataPoint: () => true,
          getItems: () => [],
          getCustomFieldName: () => "Custom 1",
        });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "customDataPoint1", operator: "eq", value: "north" },
        filterType: "multipleCheckboxes",
      });

      expect(filtersToBeApplied.filters[0]).toMatchObject({
        fieldLabel: "Custom 1",
      });
    });
  });

  describe("setFiltersToBeAppliedAddFilter - new field (filtersToBeApplied already has other fields)", () => {
    function seeded(): FiltersApplied {
      return {
        filters: [
          {
            field: "commodity",
            filters: [{ field: "commodity", operator: "eq", value: "steel" }],
            level: "suppliers",
            logic: "or",
          },
        ],
        logic: "and",
      };
    }

    it("pushes a new field entry for radioBtn/multipleCheckboxes", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({ filtersToBeApplied: seeded() });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "isSME", operator: "eq", value: "yes" },
        filterType: "radioBtn",
      });

      expect(filtersToBeApplied.filters).toHaveLength(2);
      expect(filtersToBeApplied.filters[1].field).toBe("isSME");
    });

    it("rejects a new radioBtn field with an invalid value", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({ filtersToBeApplied: seeded() });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "isSME", operator: "eq", value: { min: 1, max: 2 } },
        filterType: "radioBtn",
      });

      expect(filtersToBeApplied.filters).toHaveLength(1);
    });

    it("pushes a new field entry for rangeSlider", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({ filtersToBeApplied: seeded() });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "volume", operator: "gte", value: { min: 5, max: 50 } },
        filterType: "rangeSlider",
      });

      expect(filtersToBeApplied.filters).toHaveLength(2);
      expect(filtersToBeApplied.filters[1].filters).toEqual([
        { field: "volume", operator: "gte", value: 5 },
        { field: "volume", operator: "lte", value: 50 },
      ]);
    });

    it("rejects a new rangeSlider field with a non-range value", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({ filtersToBeApplied: seeded() });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "volume", operator: "gte", value: "nope" },
        filterType: "rangeSlider",
      });

      expect(filtersToBeApplied.filters).toHaveLength(1);
    });
  });

  describe("setFiltersToBeAppliedAddFilter - existing field", () => {
    it("rangeSlider: inserts gte/lte when absent, then updates them on a second call", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "volume", filters: [], level: "suppliers", logic: "and" },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "volume", operator: "gte", value: { min: 10, max: 90 } },
        filterType: "rangeSlider",
      });
      expect(filtersToBeApplied.filters[0].filters).toEqual([
        { field: "volume", operator: "gte", value: 10 },
        { field: "volume", operator: "lte", value: 90 },
      ]);

      setFiltersToBeAppliedAddFilter({
        filter: { field: "volume", operator: "gte", value: { min: 20, max: 80 } },
        filterType: "rangeSlider",
      });
      expect(filtersToBeApplied.filters[0].filters).toEqual([
        { field: "volume", operator: "gte", value: 20 },
        { field: "volume", operator: "lte", value: 80 },
      ]);
    });

    it("radioBtn: clears the field's other values before setting the new one", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              {
                field: "isSME",
                filters: [{ field: "isSME", operator: "eq", value: "no" }],
                level: "suppliers",
                logic: "or",
              },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "isSME", operator: "eq", value: "yes" },
        filterType: "radioBtn",
      });

      expect(filtersToBeApplied.filters[0].filters).toEqual([
        { field: "isSME", operator: "eq", value: "yes" },
      ]);
    });

    it("multipleCheckboxes: adds another value alongside the existing one (no clearing)", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              {
                field: "commodity",
                filters: [{ field: "commodity", operator: "eq", value: "steel" }],
                level: "suppliers",
                logic: "or",
              },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "commodity", operator: "eq", value: "aluminum" },
        filterType: "multipleCheckboxes",
      });

      expect(filtersToBeApplied.filters[0].filters).toEqual([
        { field: "commodity", operator: "eq", value: "steel" },
        { field: "commodity", operator: "eq", value: "aluminum" },
      ]);
    });

    it("multipleCheckboxes: does not duplicate a value that is already there", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              {
                field: "commodity",
                filters: [{ field: "commodity", operator: "eq", value: "steel" }],
                level: "suppliers",
                logic: "or",
              },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "commodity", operator: "eq", value: "steel" },
        filterType: "multipleCheckboxes",
      });

      expect(filtersToBeApplied.filters[0].filters).toHaveLength(1);
    });

    it("logs an error and makes no changes for an unknown filterType", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { filtersToBeApplied, setFiltersToBeAppliedAddFilter } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "commodity", filters: [], level: "suppliers", logic: "or" },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedAddFilter({
        filter: { field: "commodity", operator: "eq", value: "steel" },
        filterType: "unknownType" as never,
      });

      expect(filtersToBeApplied.filters[0].filters).toHaveLength(0);
      consoleSpy.mockRestore();
    });
  });

  describe("filtersToBeAppliedGetFilterField", () => {
    it("returns undefined for an empty field", () => {
      const { filtersToBeAppliedGetFilterField } = makeComposable();
      expect(filtersToBeAppliedGetFilterField("" as Field)).toBeUndefined();
    });

    it("returns undefined when the field isn't present", () => {
      const { filtersToBeAppliedGetFilterField } = makeComposable();
      expect(filtersToBeAppliedGetFilterField("commodity")).toBeUndefined();
    });

    it("returns a deep clone of the matching field group", () => {
      const seededFilters: FiltersApplied = {
        filters: [
          {
            field: "commodity",
            filters: [{ field: "commodity", operator: "eq", value: "steel" }],
            level: "suppliers",
            logic: "or",
          },
        ],
        logic: "and",
      };
      const { filtersToBeApplied, filtersToBeAppliedGetFilterField } =
        makeComposable({ filtersToBeApplied: seededFilters });

      const result = filtersToBeAppliedGetFilterField("commodity");
      expect(result).toEqual(seededFilters.filters[0]);

      result!.level = "parents";
      expect(filtersToBeApplied.filters[0].level).toBe("suppliers");
    });
  });

  describe("globalFiltersToBeAppliedRemoveFiltersGroupByField", () => {
    it("does nothing for an empty field", () => {
      const { filtersToBeApplied, globalFiltersToBeAppliedRemoveFiltersGroupByField } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "commodity", filters: [], level: "suppliers", logic: "or" },
            ],
            logic: "and",
          },
        });

      globalFiltersToBeAppliedRemoveFiltersGroupByField("" as Field);
      expect(filtersToBeApplied.filters).toHaveLength(1);
    });

    it("does nothing when filtersToBeApplied.filters is empty", () => {
      const { filtersToBeApplied, globalFiltersToBeAppliedRemoveFiltersGroupByField } =
        makeComposable();
      globalFiltersToBeAppliedRemoveFiltersGroupByField("commodity");
      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("does nothing when the field is not found", () => {
      const { filtersToBeApplied, globalFiltersToBeAppliedRemoveFiltersGroupByField } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "commodity", filters: [], level: "suppliers", logic: "or" },
            ],
            logic: "and",
          },
        });

      globalFiltersToBeAppliedRemoveFiltersGroupByField("isSME");
      expect(filtersToBeApplied.filters).toHaveLength(1);
    });

    it("removes the whole field group when found", () => {
      const { filtersToBeApplied, globalFiltersToBeAppliedRemoveFiltersGroupByField } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "commodity", filters: [], level: "suppliers", logic: "or" },
              { field: "isSME", filters: [], level: "suppliers", logic: "or" },
            ],
            logic: "and",
          },
        });

      globalFiltersToBeAppliedRemoveFiltersGroupByField("commodity");
      expect(filtersToBeApplied.filters).toEqual([
        { field: "isSME", filters: [], level: "suppliers", logic: "or" },
      ]);
    });
  });

  describe("setFiltersToBeAppliedRemoveFilter", () => {
    function seededWithTwoValues(): FiltersApplied {
      return {
        filters: [
          {
            field: "commodity",
            filters: [
              { field: "commodity", operator: "eq", value: "steel" },
              { field: "commodity", operator: "eq", value: "aluminum" },
            ],
            level: "suppliers",
            logic: "or",
          },
        ],
        logic: "and",
      };
    }

    it("does nothing when field/operator/value is empty", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedRemoveFilter } =
        makeComposable({ filtersToBeApplied: seededWithTwoValues() });

      setFiltersToBeAppliedRemoveFilter({ field: "" as Field, operator: "eq", value: "steel" });
      setFiltersToBeAppliedRemoveFilter({ field: "commodity", operator: "", value: "steel" });
      setFiltersToBeAppliedRemoveFilter({ field: "commodity", operator: "eq", value: "" });

      expect(filtersToBeApplied.filters[0].filters).toHaveLength(2);
    });

    it("does nothing when filtersToBeApplied.filters is empty", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedRemoveFilter } =
        makeComposable();

      setFiltersToBeAppliedRemoveFilter({ field: "commodity", operator: "eq", value: "steel" });
      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("removes one value and keeps the group when other values remain", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedRemoveFilter } =
        makeComposable({ filtersToBeApplied: seededWithTwoValues() });

      setFiltersToBeAppliedRemoveFilter({ field: "commodity", operator: "eq", value: "steel" });

      expect(filtersToBeApplied.filters).toHaveLength(1);
      expect(filtersToBeApplied.filters[0].filters).toEqual([
        { field: "commodity", operator: "eq", value: "aluminum" },
      ]);
    });

    it("removes the whole field group when its last value is removed", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedRemoveFilter } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              {
                field: "commodity",
                filters: [{ field: "commodity", operator: "eq", value: "steel" }],
                level: "suppliers",
                logic: "or",
              },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedRemoveFilter({ field: "commodity", operator: "eq", value: "steel" });

      expect(filtersToBeApplied.filters).toHaveLength(0);
    });
  });

  describe("setFiltersToBeAppliedCleanEmptyFilters", () => {
    it("does nothing when filtersToBeApplied.filters is empty", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedCleanEmptyFilters } =
        makeComposable();
      setFiltersToBeAppliedCleanEmptyFilters();
      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("removes an empty field group", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedCleanEmptyFilters } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "commodity", filters: [], level: "suppliers", logic: "or" },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedCleanEmptyFilters();
      expect(filtersToBeApplied.filters).toHaveLength(0);
    });

    it("keeps a non-empty field group", () => {
      const { filtersToBeApplied, setFiltersToBeAppliedCleanEmptyFilters } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              {
                field: "commodity",
                filters: [{ field: "commodity", operator: "eq", value: "steel" }],
                level: "suppliers",
                logic: "or",
              },
            ],
            logic: "and",
          },
        });

      setFiltersToBeAppliedCleanEmptyFilters();
      expect(filtersToBeApplied.filters).toHaveLength(1);
    });
  });

  describe("globalFiltersToBeAppliedIsFieldInFiltersToBeApplied", () => {
    it("returns false for an empty field", () => {
      const { globalFiltersToBeAppliedIsFieldInFiltersToBeApplied } =
        makeComposable();
      expect(
        globalFiltersToBeAppliedIsFieldInFiltersToBeApplied("" as Field),
      ).toBe(false);
    });

    it("returns false when filtersToBeApplied.filters is empty", () => {
      const { globalFiltersToBeAppliedIsFieldInFiltersToBeApplied } =
        makeComposable();
      expect(
        globalFiltersToBeAppliedIsFieldInFiltersToBeApplied("commodity"),
      ).toBe(false);
    });

    it("returns false when the field is not present", () => {
      const { globalFiltersToBeAppliedIsFieldInFiltersToBeApplied } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "isSME", filters: [], level: "suppliers", logic: "or" },
            ],
            logic: "and",
          },
        });
      expect(
        globalFiltersToBeAppliedIsFieldInFiltersToBeApplied("commodity"),
      ).toBe(false);
    });

    it("returns true when the field is present", () => {
      const { globalFiltersToBeAppliedIsFieldInFiltersToBeApplied } =
        makeComposable({
          filtersToBeApplied: {
            filters: [
              { field: "commodity", filters: [], level: "suppliers", logic: "or" },
            ],
            logic: "and",
          },
        });
      expect(
        globalFiltersToBeAppliedIsFieldInFiltersToBeApplied("commodity"),
      ).toBe(true);
    });
  });
});
