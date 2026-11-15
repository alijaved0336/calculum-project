/**
 * Tests for useGlobalFiltersItemSelection - the checkbox/radio/tree-view item-selection
 * mutations extracted from MainLayoutFilters.vue (WI 19547, US-1 Phase B, AC-04).
 */

import { describe, it, expect, vi } from "vitest";

// See useFiltersToBeApplied.spec.ts for why this is needed: the composable imports ArrayUtils/
// isNullOrUndefined from the "@/utils" barrel, which eagerly loads the app's main router (and
// every page component) through an unrelated chain, crashing standalone composable tests.
vi.mock("@/services/router", () => ({ default: { push: vi.fn(), back: vi.fn() } }));

import useGlobalFiltersItemSelection from "@/modules/globalFilters/composables/useGlobalFiltersItemSelection";
import type { GlobalFiltersPanelBarItem } from "@/types";

function makeItem(overrides: Partial<GlobalFiltersPanelBarItem> = {}): GlobalFiltersPanelBarItem {
  return {
    field: "commodity",
    itemData: {
      isAllItemsChecked: false,
      items: [
        { key: "steel", value: "steel", checked: false },
        { key: "aluminum", value: "aluminum", checked: false },
      ],
    },
    ...overrides,
  } as GlobalFiltersPanelBarItem;
}

function makeComposable(items: GlobalFiltersPanelBarItem[]) {
  const setFiltersToBeAppliedAddFilter = vi.fn();
  const setFiltersToBeAppliedRemoveFilter = vi.fn();
  const globalFiltersToBeAppliedRemoveFiltersGroupByField = vi.fn();

  const composable = useGlobalFiltersItemSelection({
    getItems: () => items,
    getItemByField: ({ field, items }) => items.find((i) => i.field === field),
    setFiltersToBeAppliedAddFilter,
    setFiltersToBeAppliedRemoveFilter,
    globalFiltersToBeAppliedRemoveFiltersGroupByField,
  });

  return {
    ...composable,
    setFiltersToBeAppliedAddFilter,
    setFiltersToBeAppliedRemoveFilter,
    globalFiltersToBeAppliedRemoveFiltersGroupByField,
  };
}

describe("useGlobalFiltersItemSelection", () => {
  describe("panelBarItemsTreeViewSetCheckedItems", () => {
    it("does nothing when data.items is empty", () => {
      const { panelBarItemsTreeViewSetCheckedItems, setFiltersToBeAppliedAddFilter } =
        makeComposable([]);

      panelBarItemsTreeViewSetCheckedItems({
        field: "planPhaseNames",
        checkedItemKeys: ["Plan 1 - 1"],
      });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("does nothing when the field's item isn't found", () => {
      const items = [makeItem({ field: "commodity" })];
      const { panelBarItemsTreeViewSetCheckedItems, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemsTreeViewSetCheckedItems({
        field: "planPhaseNames",
        checkedItemKeys: ["Plan 1 - 1"],
      });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("clears the field group then adds one filter per checked key", () => {
      const items = [
        makeItem({
          field: "planPhaseNames",
          itemData: { checkedItemsKeys: [] } as never,
        }),
      ];
      const {
        panelBarItemsTreeViewSetCheckedItems,
        setFiltersToBeAppliedAddFilter,
        globalFiltersToBeAppliedRemoveFiltersGroupByField,
      } = makeComposable(items);

      panelBarItemsTreeViewSetCheckedItems({
        field: "planPhaseNames",
        checkedItemKeys: ["Plan 1 - 1", "Plan 1 - 2"],
      });

      expect(globalFiltersToBeAppliedRemoveFiltersGroupByField).toHaveBeenCalledWith(
        "planPhaseNames",
      );
      expect(setFiltersToBeAppliedAddFilter).toHaveBeenCalledTimes(2);
      expect(setFiltersToBeAppliedAddFilter).toHaveBeenCalledWith({
        filter: { field: "planPhaseNames", operator: "eq", value: "Plan 1 - 1" },
        filterType: "multipleCheckboxes",
      });
      expect(items[0].itemData!.checkedItemsKeys).toEqual(["Plan 1 - 1", "Plan 1 - 2"]);
    });

    it("initializes a missing itemData instead of bailing out (no early return)", () => {
      const items = [makeItem({ field: "planPhaseNames", itemData: undefined })];
      const { panelBarItemsTreeViewSetCheckedItems, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemsTreeViewSetCheckedItems({
        field: "planPhaseNames",
        checkedItemKeys: ["Plan 2 - 1"],
      });

      expect(items[0].itemData!.checkedItemsKeys).toEqual(["Plan 2 - 1"]);
      expect(setFiltersToBeAppliedAddFilter).toHaveBeenCalledTimes(1);
    });
  });

  describe("panelBarItemRadioItemSetChecked / panelBarItemsMCheckboxesItemSetChecked", () => {
    it("does nothing when data.items is empty", () => {
      const { panelBarItemRadioItemSetChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable([]);

      panelBarItemRadioItemSetChecked({ field: "isSME", key: "yes" });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("does nothing when the field's item isn't found", () => {
      const items = [makeItem({ field: "commodity" })];
      const { panelBarItemRadioItemSetChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemRadioItemSetChecked({ field: "isSME", key: "yes" });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("initializes itemData and returns early when it's missing", () => {
      const items = [makeItem({ field: "isSME", itemData: undefined })];
      const { panelBarItemRadioItemSetChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemRadioItemSetChecked({ field: "isSME", key: "yes" });

      expect(items[0].itemData).toEqual({ isAllItemsChecked: false, items: [] });
      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("does nothing when the key isn't among the item's options", () => {
      const items = [makeItem({ field: "commodity" })];
      const { panelBarItemsMCheckboxesItemSetChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemsMCheckboxesItemSetChecked({ field: "commodity", key: "copper" });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("radioBtn: checking a value adds it with filterType radioBtn", () => {
      const items = [makeItem({ field: "isSME" })];
      const { panelBarItemRadioItemSetChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemRadioItemSetChecked({ field: "isSME", key: "steel" });

      expect(items[0].itemData!.items![0].checked).toBe(true);
      expect(setFiltersToBeAppliedAddFilter).toHaveBeenCalledWith({
        filter: { field: "isSME", operator: "eq", value: "steel" },
        filterType: "radioBtn",
      });
    });

    it("multipleCheckboxes: checking a value adds it with filterType multipleCheckboxes", () => {
      const items = [makeItem({ field: "commodity" })];
      const { panelBarItemsMCheckboxesItemSetChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemsMCheckboxesItemSetChecked({ field: "commodity", key: "steel" });

      expect(setFiltersToBeAppliedAddFilter).toHaveBeenCalledWith({
        filter: { field: "commodity", operator: "eq", value: "steel" },
        filterType: "multipleCheckboxes",
      });
    });

    it("unchecking a value (toggling back) removes it", () => {
      const items = [
        makeItem({
          field: "commodity",
          itemData: {
            isAllItemsChecked: false,
            items: [{ key: "steel", value: "steel", checked: true }],
          },
        }),
      ];
      const { panelBarItemsMCheckboxesItemSetChecked, setFiltersToBeAppliedRemoveFilter } =
        makeComposable(items);

      panelBarItemsMCheckboxesItemSetChecked({ field: "commodity", key: "steel" });

      expect(items[0].itemData!.items![0].checked).toBe(false);
      expect(setFiltersToBeAppliedRemoveFilter).toHaveBeenCalledWith({
        field: "commodity",
        operator: "eq",
        value: "steel",
      });
    });

    it("skips an item that has no 'checked' property", () => {
      const items = [
        makeItem({
          field: "commodity",
          itemData: {
            isAllItemsChecked: false,
            items: [{ key: "steel", value: "steel" } as never],
          },
        }),
      ];
      const { panelBarItemsMCheckboxesItemSetChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemsMCheckboxesItemSetChecked({ field: "commodity", key: "steel" });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });
  });

  describe("panelBarItemSetIsAllItemsChecked", () => {
    it("does nothing when data.items is empty", () => {
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable([]);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: true });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("does nothing when the field's item isn't found", () => {
      const items = [makeItem({ field: "isSME" })];
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: true });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("initializes itemData and returns early when it's missing", () => {
      const items = [makeItem({ field: "commodity", itemData: undefined })];
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: true });

      expect(items[0].itemData).toEqual({ isAllItemsChecked: false, items: [] });
      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("does nothing when itemData.items is empty", () => {
      const items = [
        makeItem({ field: "commodity", itemData: { isAllItemsChecked: false, items: [] } }),
      ];
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: true });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });

    it("checks every item and adds a filter for each when isAllItemsChecked is true", () => {
      const items = [makeItem({ field: "commodity" })];
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: true });

      expect(items[0].itemData!.isAllItemsChecked).toBe(true);
      expect(items[0].itemData!.items!.every((i: any) => i.checked)).toBe(true);
      expect(setFiltersToBeAppliedAddFilter).toHaveBeenCalledTimes(2);
    });

    it("unchecks every item and removes a filter for each string key when false", () => {
      const items = [
        makeItem({
          field: "commodity",
          itemData: {
            isAllItemsChecked: true,
            items: [
              { key: "steel", value: "steel", checked: true },
              { key: "aluminum", value: "aluminum", checked: true },
            ],
          },
        }),
      ];
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedRemoveFilter } =
        makeComposable(items);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: false });

      expect(items[0].itemData!.items!.every((i: any) => !i.checked)).toBe(true);
      expect(setFiltersToBeAppliedRemoveFilter).toHaveBeenCalledTimes(2);
    });

    it("skips removal for a non-string key when unchecking", () => {
      const items = [
        makeItem({
          field: "commodity",
          itemData: {
            isAllItemsChecked: true,
            items: [{ key: 42, value: 42, checked: true } as never],
          },
        }),
      ];
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedRemoveFilter } =
        makeComposable(items);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: false });

      expect(setFiltersToBeAppliedRemoveFilter).not.toHaveBeenCalled();
    });

    it("skips an item that has no 'checked' property", () => {
      const items = [
        makeItem({
          field: "commodity",
          itemData: {
            isAllItemsChecked: false,
            items: [{ key: "steel", value: "steel" } as never],
          },
        }),
      ];
      const { panelBarItemSetIsAllItemsChecked, setFiltersToBeAppliedAddFilter } =
        makeComposable(items);

      panelBarItemSetIsAllItemsChecked({ field: "commodity", isAllItemsChecked: true });

      expect(setFiltersToBeAppliedAddFilter).not.toHaveBeenCalled();
    });
  });
});
