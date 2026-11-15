import { FiltersApplied, GlobalFiltersPanelBarItem } from "@/types";

export interface Data {
    computedDataPoints: number,
    currentIndex: number,
    filtersTemplatesNewTemplateName: string,
    filtersToBeApplied: FiltersApplied,
    globalFiltersTemplatesActiveIsDirty: boolean,
    globalFiltersTemplatesIsLoadingTemplates: boolean,
    globalFiltersTemplatesIsModalSaveShowing: boolean,
    globalFiltersTemplatesSaveOptionSelected: "update" | "new",
    isModalConfirmFiltersClearAllShowing: boolean,
    items: GlobalFiltersPanelBarItem[],
    itemsForShowCarousel: boolean,
    loadFilterData: boolean,
    offset: number,
    rangeSliderIncludeExcludeNull: boolean,
  }