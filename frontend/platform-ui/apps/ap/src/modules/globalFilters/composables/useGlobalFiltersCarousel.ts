import { computed, ComputedRef, ref } from "vue";

import { ArrayUtils, isNullOrUndefined } from "@/utils";
import type GlobalFiltersBar from "@/modules/globalFilters/components/GlobalFiltersBar.vue";
import type { Data } from "@/modules/globalFilters/types";
import type { GlobalFiltersSaved } from "@/types";

const CAROUSEL_SLIDE_OFFSET_PX = 300;
const CAROUSEL_ITEM_WIDTH_PX = 250;
const CAROUSEL_WIDTH_PERCENT_NO_TEMPLATES = 88;
const CAROUSEL_WIDTH_PERCENT_WITH_TEMPLATES = 80;

interface UseGlobalFiltersCarouselOptions {
  /** The shell's whole `data` reactive object, mutated in place. */
  data: Data;
  globalFiltersSavedArray: ComputedRef<GlobalFiltersSaved[] | undefined>;
}

/**
 * Owns the applied-filter-pills carousel: show/hide-arrows measurement, slide left/right, and
 * the badge-container width (which depends on whether the saved-templates dropdown is also
 * showing). Extracted verbatim from MainLayoutFilters.vue - see
 * docs/context/change-mainlayoutfilters-refactor.md for the extraction notes, including why
 * `globalFiltersBarRef` (a template ref to the `<GlobalFiltersBar>` instance) lives here rather
 * than a plain DOM ref.
 */
const useGlobalFiltersCarousel = (options: UseGlobalFiltersCarouselOptions) => {
  const { data, globalFiltersSavedArray } = options;

  const globalFiltersBarRef = ref<InstanceType<typeof GlobalFiltersBar> | null>(
    null,
  );

  /** Toggle carousel visibility for applied filters badges (show when many items). */
  function showCarousel(numberOfitems: number) {
    data.itemsForShowCarousel = false;
    if (globalFiltersBarRef.value?.carouselItemsContainer) {
      const widthItems = numberOfitems * CAROUSEL_ITEM_WIDTH_PX;
      const widthContainer =
        globalFiltersBarRef.value.carouselItemsContainer.clientWidth;

      if (widthItems > widthContainer) {
        data.itemsForShowCarousel = true;
      } else {
        data.itemsForShowCarousel = false;
      }
    }
  }

  const carouselWidth = computed(() => {
    if (
      isNullOrUndefined(globalFiltersSavedArray.value) ||
      ArrayUtils.isEmpty(globalFiltersSavedArray.value)
    ) {
      return CAROUSEL_WIDTH_PERCENT_NO_TEMPLATES;
    }

    return CAROUSEL_WIDTH_PERCENT_WITH_TEMPLATES;
  });

  function prevSlide() {
    if (data.currentIndex > 0) {
      data.currentIndex--;
      data.offset += CAROUSEL_SLIDE_OFFSET_PX;
    }
  }

  function nextSlide() {
    data.currentIndex++;
    data.offset -= CAROUSEL_SLIDE_OFFSET_PX;
  }

  return {
    globalFiltersBarRef,
    showCarousel,
    carouselWidth,
    prevSlide,
    nextSlide,
  };
};

export default useGlobalFiltersCarousel;
