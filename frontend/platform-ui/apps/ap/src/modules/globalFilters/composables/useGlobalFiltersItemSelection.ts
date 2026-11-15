import { isUndefined } from "lodash";

import { ArrayUtils, isNullOrUndefined } from "@/utils";
import type { Field, GlobalFiltersPanelBarItem } from "@/types";

type AppliedFilterType = "radioBtn" | "multipleCheckboxes";

interface AddFilterParams {
  filter: { field: Field; operator: "eq"; value: string };
  filterType: AppliedFilterType;
}

interface RemoveFilterParams {
  field: Field;
  operator: string;
  value: string;
}

interface UseGlobalFiltersItemSelectionOptions {
  /** `() => data.items` - a getter, since `data.items` gets reassigned elsewhere in the shell. */
  getItems: () => GlobalFiltersPanelBarItem[];
  getItemByField: (params: {
    field: Field;
    items: GlobalFiltersPanelBarItem[];
  }) => GlobalFiltersPanelBarItem | undefined;
  setFiltersToBeAppliedAddFilter: (params: AddFilterParams) => void;
  setFiltersToBeAppliedRemoveFilter: (params: RemoveFilterParams) => void;
  globalFiltersToBeAppliedRemoveFiltersGroupByField: (field: Field) => void;
}

/**
 * Owns the "which items are checked/selected" mutations for the PanelBar's checkbox, radio and
 * tree-view filter types. Extracted verbatim from MainLayoutFilters.vue's "Global Filters -
 * Panel Bar" block - see docs/context/change-mainlayoutfilters-refactor.md for the extraction
 * notes, including the radio/checkbox merge this was built around.
 */
const useGlobalFiltersItemSelection = (
  options: UseGlobalFiltersItemSelectionOptions,
) => {
  const {
    getItems,
    getItemByField,
    setFiltersToBeAppliedAddFilter,
    setFiltersToBeAppliedRemoveFilter,
    globalFiltersToBeAppliedRemoveFiltersGroupByField,
  } = options;

  /**
   * Set checked status for an item part of a TreeView component given field and key.
   *
   * @param categoryName {string}
   * @param key {string}
   */
  function panelBarItemsTreeViewSetCheckedItems({
    field,
    checkedItemKeys,
  }: {
    field: Field;
    checkedItemKeys: string[];
  }): void {
    // Validate
    if (ArrayUtils.isEmpty(getItems())) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in panelBarItemsTreeViewSetCheckedItems. data.items is empty",
        );
      return;
    }

    if (import.meta.env.DEV)
      console.log("** panelBarItemsTreeViewSetCheckedItems", field);

    const item = getItemByField({ field, items: getItems() });

    if (isUndefined(item)) {
      // Not found
      if (import.meta.env.DEV)
        console.error(
          "** Error in panelBarItemsTreeViewSetCheckedItems. item not found",
        );
      return;
    }

    // Found

    /**
     * Update list of checked items keys
     *
     * e.g.:
     * items: [
              {
                key: "Plan 1",
                value: {
                  value: "Plan 1",
                  items: [
                    { key: "Plan 1 - 1", value: "Phase 1 - Start with numbers" },
                    { key: "Plan 1 - 2", value: "Phase 2 - Start with letters" },
                  ],
                }
              },
              {
                key: "Plan 2",
                value: {
                  value: "Plan 2",
                  items: [
                    { key: "Plan 2 - 1", value: "Phase 1 - Start with A" },
                    { key: "Plan 2 - 2", value: "Phase 2 - Start with B" },
                  ]
                }
              }
            ]

            ->
      * checkedItemsKeys: ["Plan 1 - 1", "Plan 1 - 2", "Plan 2 - 1"]
    */

    if (item.field !== field) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in panelBarItemsTreeViewSetCheckedItems. item.field !== field",
        );
      return;
    }

    // Validate
    if (isNullOrUndefined(item.itemData)) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in panelBarItemsTreeViewSetCheckedItems. item.itemData is empty",
        );

      item.itemData = {
        checkedItemsKeys: [],
      };
    }

    if (isNullOrUndefined(item.itemData.checkedItemsKeys)) {
      item.itemData.checkedItemsKeys = [];
    }

    // Update list of checked items keys
    item.itemData.checkedItemsKeys = checkedItemKeys;

    // Sync checked status for all items with filters to be applied

    // Clean field
    globalFiltersToBeAppliedRemoveFiltersGroupByField(field);

    // Add filters to filters to be applied
    item.itemData.checkedItemsKeys.forEach((key) => {
      const filter = {
        field,
        operator: "eq" as const,
        value: key,
      };

      setFiltersToBeAppliedAddFilter({
        filter,
        filterType: "multipleCheckboxes",
      });
    });
  }

  /**
   * Shared toggle logic for radio and checkbox panel bar items - they differ only in the
   * `filterType` passed to setFiltersToBeAppliedAddFilter and in their DEV log/error text.
   */
  function setItemChecked({
    field,
    key,
    filterType,
    logContext,
  }: {
    field: Field;
    key: string;
    filterType: AppliedFilterType;
    logContext: string;
  }): void {
    // Validate
    if (ArrayUtils.isEmpty(getItems())) {
      if (import.meta.env.DEV)
        console.error(`** Error in ${logContext}. data.items is empty`);

      return;
    }

    // Find Panel Bar Item
    const i = getItems().find((i) => i.field === field);

    if (isUndefined(i)) {
      if (import.meta.env.DEV)
        console.error(`** (${logContext}) item not found. i:`, i);

      return;
    }

    if (isNullOrUndefined(i.itemData) || isNullOrUndefined(i.itemData.items)) {
      if (import.meta.env.DEV)
        console.error(
          `** (${logContext}) i.itemData or i.itemData.items is not valid. i:`,
          i,
        );

      // Init
      i.itemData = {
        isAllItemsChecked: false,
        items: [],
      };

      return;
    }

    // Find item with key
    i.itemData.items.forEach((j) => {
      // Validate
      if (j.key === undefined) {
        return;
      }

      // If not found, continue with next item
      if (j.key !== key) {
        return;
      }

      // Toggle checked status for the found item
      // Validate
      if (!("checked" in j)) {
        if (import.meta.env.DEV)
          console.error(`** Error in ${logContext}. j.checked is not valid. j:`, j);

        return;
      }

      j.checked = !j.checked;

      // Checkbox was checked
      if (j.checked) {
        // Add filter to applied filters

        const filter = {
          field,
          operator: "eq" as const,
          value: key,
        };

        if (filterType === "radioBtn" && import.meta.env.DEV)
          console.log("** setFiltersToBeAppliedAddFilter", field, key);

        setFiltersToBeAppliedAddFilter({ filter, filterType });
      }
      // Checkbox was unchecked
      else {
        // Remove filter from applied filters
        setFiltersToBeAppliedRemoveFilter({
          field,
          operator: "eq",
          value: key,
        });
      }
    });
  }

  function panelBarItemRadioItemSetChecked({
    field,
    key,
  }: {
    field: Field;
    key: string;
  }): void {
    setItemChecked({
      field,
      key,
      filterType: "radioBtn",
      logContext: "panelBarItemRadioItemSetChecked",
    });
  }

  /**
   * Set checked status for an item part of a MultipleCheckboxes component given field and key.
   *
   * @param field {Field}
   * @param key {string}
   * @returns {void}
   */
  function panelBarItemsMCheckboxesItemSetChecked({
    field,
    key,
  }: {
    field: Field;
    key: string;
  }): void {
    setItemChecked({
      field,
      key,
      filterType: "multipleCheckboxes",
      logContext: "panelBarItemsMCheckboxesItemSetChecked",
    });
  }

  /**
   * Set checked status for all items in a given panel bar item given field name
   *
   * @param {field, isAllItemsChecked} {Field, boolean}
   */
  function panelBarItemSetIsAllItemsChecked({
    field,
    isAllItemsChecked,
  }: {
    field: Field;
    isAllItemsChecked: boolean;
  }): void {
    const items = getItems();

    // Validate
    if (items === undefined) {
      if (import.meta.env.DEV)
        console.error(
          `** Error in panelBarItemSetIsAllItemsChecked: data.items is undefined.`,
        );
      return;
    }

    if (ArrayUtils.isEmpty(items)) {
      if (import.meta.env.DEV)
        console.error(
          `** Error in panelBarItemSetIsAllItemsChecked: data.items is empty.`,
        );
      return;
    }

    // Find Panel Bar Item
    const i = items.find((i) => i.field === field);

    if (isUndefined(i)) {
      if (import.meta.env.DEV)
        console.error(
          "** (panelBarItemsItemSetIsAllItemsChecked) item not found. i:",
          i,
        );

      return;
    }

    // Validate
    if (isNullOrUndefined(i.itemData) || isNullOrUndefined(i.itemData.items)) {
      if (import.meta.env.DEV)
        console.log(
          "** Error in panelBarItemSetIsAllItemsChecked: i.itemData or i.itemData.items is not valid. i:",
          i,
        );

      // Init
      i.itemData = {
        isAllItemsChecked: false,
        items: [],
      };

      return;
    }

    if (ArrayUtils.isEmpty(i.itemData.items)) {
      if (import.meta.env.DEV)
        console.log(
          "** Error in panelBarItemSetIsAllItemsChecked: i.itemData.items is empty",
        );

      return;
    }

    // Set isAllItemsChecked
    i.itemData.isAllItemsChecked = isAllItemsChecked;

    // Set property to all items
    i.itemData.items.forEach((j) => {
      // Validate
      if (!("checked" in j)) {
        return;
      }

      j.checked = isAllItemsChecked;

      // Checkbox was checked
      if (j.checked) {
        // Add filter to applied filters

        const filter = {
          field,
          operator: "eq" as const,
          value: j.key,
        };

        setFiltersToBeAppliedAddFilter({
          filter,
          filterType: "multipleCheckboxes",
        });
      }
      // Checkbox was unchecked
      else {
        // Remove filter from applied filters
        // Validate
        if (typeof j.key !== "string") {
          return;
        }

        setFiltersToBeAppliedRemoveFilter({
          field,
          operator: "eq",
          value: j.key,
        });
      }
    });
  }

  return {
    panelBarItemsTreeViewSetCheckedItems,
    panelBarItemRadioItemSetChecked,
    panelBarItemsMCheckboxesItemSetChecked,
    panelBarItemSetIsAllItemsChecked,
  };
};

export default useGlobalFiltersItemSelection;
