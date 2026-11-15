import { ArrayUtils, isNullOrUndefined } from "@/utils";
import type {
  CategoryName,
  Field,
  FilterType,
  GlobalFiltersPanelBarItem,
  TargetView,
} from "@/types";

interface PanelBarItemDefault {
  field: Field;
  levels: TargetView[];
  levelSelectedDefault: TargetView;
  categories: CategoryName[];
  filterType: FilterType;
}

interface BuildPanelBarItemsOptions {
  panelBarItemsDefault: PanelBarItemDefault[];
  panelBarItemsCustomDataPointsDefault: PanelBarItemDefault[];
  getTitleFormatted: (params: {
    field: Field;
    items: GlobalFiltersPanelBarItem[];
  }) => string;
  isProgramSelectedRequired: (field: Field) => boolean;
  programSelectedId: string | null | undefined;
  activeProgramDefaultId: string | null | undefined;
  spendFileVersionActiveNameCustomDataPoints: (string | undefined)[];
  spendFileVersionActiveCustomDataPointsHasData: boolean[];
  getCustomFieldName: (field: Field) => string;
}

/**
 * Builds the initial panel bar item list: the static defaults (with formatted titles, filtered
 * to drop program-scoped fields when no program is selected) plus any configured custom data
 * point columns (Bug#18966 slot/title rules). Pure - the caller decides when to call it (only
 * when `data.items` starts empty) and assigns the result. Extracted verbatim from
 * MainLayoutFilters.vue's "Initialize panel bar items" block - see
 * docs/context/change-mainlayoutfilters-refactor.md for the extraction notes.
 */
function buildPanelBarItems(
  options: BuildPanelBarItemsOptions,
): GlobalFiltersPanelBarItem[] {
  const {
    panelBarItemsDefault,
    panelBarItemsCustomDataPointsDefault,
    getTitleFormatted,
    isProgramSelectedRequired,
    programSelectedId,
    activeProgramDefaultId,
    spendFileVersionActiveNameCustomDataPoints,
    spendFileVersionActiveCustomDataPointsHasData,
    getCustomFieldName,
  } = options;

  // Default
  let items: GlobalFiltersPanelBarItem[] = panelBarItemsDefault.map((i, idx) => {
    return {
      ...i,
      content: i.field,
      expanded: false,
      levelSelected: i.levelSelectedDefault,
      isLoading: false,
      order: idx,
    };
  });

  // Update titles
  items = items.map((i) => {
    return {
      ...i,
      title: getTitleFormatted({
        field: i.field,
        items,
      }),
    };
  });

  // Filter out items that require a program to be selected and no one is.
  items = items.filter((i) => {
    const programSelectedRequired = isProgramSelectedRequired(i.field);

    // If panel bar item requires a program to be selected and no program is selected, skip
    if (
      programSelectedRequired &&
      isNullOrUndefined(programSelectedId) &&
      isNullOrUndefined(activeProgramDefaultId)
    ) {
      if (import.meta.env.DEV)
        console.warn(
          `** (setPanelBarData) Skipping ${i.field} because it requires a program to be selected and no program is selected`,
        );

      return false;
    }

    return true;
  });

  // Custom Data Points
  if (!ArrayUtils.isEmpty(spendFileVersionActiveNameCustomDataPoints)) {
    const itemsCustomDataPoints = panelBarItemsCustomDataPointsDefault
      .map((item, idx) => {
        // Bug#18966: read the slot off the field instead of trusting the array position, and
        // take the title the spend file configured for it (the backend resolves an untitled
        // slot to "Custom Column N", so there is always a title for slots 1-26).
        const slot = ArrayUtils.customDataPointSlot(item.field) ?? idx + 1;
        const configuredTitle = spendFileVersionActiveNameCustomDataPoints[slot - 1];
        return {
          ...item,
          content: item.field,
          expanded: false,
          isLoading: false,
          levelSelected: item.levelSelectedDefault,
          title: configuredTitle ?? getCustomFieldName(item.field),
          order: items.length + idx,
          slot,
        };
      })
      // Bug#18966: a slot is offered when it carries spend data, or when it has a real title
      // even with no data. Untitled and empty slots are dropped. This used to look for the word
      // "custom" in the title, which hid every filled-but-untitled column (4-20) and kept every
      // empty numeric one (21-26).
      .filter((item) => {
        if (spendFileVersionActiveCustomDataPointsHasData[item.slot - 1] === true) {
          return true;
        }
        const configuredTitle =
          spendFileVersionActiveNameCustomDataPoints[item.slot - 1];
        return (
          configuredTitle !== undefined &&
          configuredTitle !== `Custom Column ${item.slot}`
        );
      })
      .map(({ slot, ...item }) => item);
    items = items.concat(itemsCustomDataPoints);
  }

  return items;
}

export default buildPanelBarItems;
