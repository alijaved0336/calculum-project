<template>
  <!-- Filters Bar -->
  <div
    class="d-flex justify-content-between align-content-center px-2 min-h-10 w-100 bg-gray-50 topbar-filters"
  >
    <!-- Glass Container -->
    <div
      v-if="loadFilterData"
      :class="{ 'bg-blur': loadFilterData }"
      class="h-full w-full"
      style="z-index: 98; position: absolute; backdrop-filter: blur(1px)"
    />
    <!-- END Glass Container -->

    <!-- Left side -->

    <div
      v-if="!ArrayUtils.isEmpty(globalFiltersSavedArray)"
      class="d-flex align-items-center template-options-container"
    >
      <!-- Filters Templates Selector -->

      <select
        v-if="!ArrayUtils.isEmpty(globalFiltersSavedArray)"
        id="selectedGFTemplate"
        class="mr-2 min-h-7 max-w-100 text-truncate text-sm border-0 bg-transparent custom-select"
        name="selectedGFTemplate"
        @change="$emit('template-change-active', $event)"
      >
        <!-- Default option -->

        <option value="">
          {{ $t("globalFilters.noTemplateSelected") }}
        </option>

        <!-- Available templates -->

        <option
          v-for="({ key, label }, index) in globalFiltersTemplatesTitles"
          :key="index"
          :value="key"
          :selected="
            globalFiltersTemplatesActive &&
            key === globalFiltersTemplatesActive['@id']
              ? true
              : undefined
          "
        >
          {{ label }}
        </option>
      </select>
    </div>

    <!-- Filters applied pills e.g.: "Currency: EUR" -->

    <div
      class="d-flex align-items-center badge-container"
      :style="`--w: ${carouselWidth}%;`"
    >
      <!-- Carousel / Left Button -->

      <button
        v-if="currentIndex !== 0 && itemsForShowCarousel"
        class="nav-button nav-button-global-filters"
        :disabled="currentIndex === 0"
        @click="$emit('prev-slide')"
      >
        <svg
          width="20"
          height="20"
          viewbox="0 0 20 20"
          fill="none"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M16.1435 8.68619H5.7182L10.2729 4.13152C10.6369 3.76752 10.6369 3.17019 10.2729 2.80619C10.0985 2.63142 9.86175 2.5332 9.61487 2.5332C9.36799 2.5332 9.13125 2.63142 8.95687 2.80619L2.8062 8.95686C2.4422 9.32086 2.4422 9.90886 2.8062 10.2729L8.95687 16.4235C9.32087 16.7875 9.90887 16.7875 10.2729 16.4235C10.6369 16.0595 10.6369 15.4715 10.2729 15.1075L5.7182 10.5529H16.1435C16.6569 10.5529 17.0769 10.1329 17.0769 9.61952C17.0769 9.10619 16.6569 8.68619 16.1435 8.68619Z"
            fill="#667085"
          />
        </svg>
      </button>

      <!-- Carousel Main Container -->

      <div
        ref="carouselItemsContainer"
        class="carousel-overflow"
      >
        <div class="carousel-container">
          <div
            class="carousel-track"
            :style="{ transform: `translateX(${offset}px)` }"
          >
            <!-- Filters applied pills e.g.: "Currency: EUR" -->

            <div
              v-for="{
                field,
                fieldLabel,
                level,
                valueLabel,
              } in filtersAppliedGroupedFormatted"
              :key="field"
              class="d-flex align-items-center justify-content-center gap-1 filter-applied-badge"
            >
              <div
                class="d-flex align-items-center mr-1 text-nowrap text-sm"
                @click="$emit('filter-remove', field)"
              >
                <div
                  :class="getClassesByLevel(level)"
                  class="d-flex align-items-center justify-content-center mr-1 w-4 h-4 rounded-lg"
                >
                  <span class="mx-auto text-xxxs font-semibold">
                    {{ filtersAppliedGetFormattedLevel(level) }}
                  </span>
                </div>
                <span class="mr-1 text-capitalize">
                  {{ getFieldName(fieldLabel) }}
                </span>
                <span class="text-capitalize font-medium">
                  {{ valueLabel }}
                </span>
              </div>

              <svg
                class="fill-current"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill=""
                @click="$emit('filter-group-set-dirty', field)"
              >
                <path
                  d="M1 8C1 4.13437 4.13437 1 8 1C11.8656 1 15 4.13437 15 8C15 11.8656 11.8656 15 8 15C4.13437 15 1 11.8656 1 8ZM10.5844 12L12 10.5844L9.41562 8L12 5.41563L10.5844 4L8 6.58437L5.41563 4L4 5.41563L6.58437 8L4 10.5844L5.41563 12L8 9.41562L10.5844 12Z"
                  fill=""
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Carousel / Right Button -->

      <button
        v-if="
          currentIndex !== filtersAppliedGroupedFormatted.length - 1 &&
          itemsForShowCarousel
        "
        class="nav-button nav-button-global-filters"
        :disabled="currentIndex === filtersAppliedGroupedFormatted.length - 1"
        @click="$emit('next-slide')"
      >
        <svg
          width="20"
          height="20"
          viewbox="0 0 20 20"
          fill="none"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M3.85646 8.68619H14.2818L9.72713 4.13152C9.36313 3.76752 9.36313 3.17019 9.72713 2.80619C9.90151 2.63142 10.1382 2.5332 10.3851 2.5332C10.632 2.5332 10.8688 2.63142 11.0431 2.80619L17.1938 8.95686C17.5578 9.32086 17.5578 9.90886 17.1938 10.2729L11.0431 16.4235C10.6791 16.7875 10.0911 16.7875 9.72713 16.4235C9.36313 16.0595 9.36313 15.4715 9.72713 15.1075L14.2818 10.5529H3.85646C3.34313 10.5529 2.92313 10.1329 2.92313 9.61952C2.92313 9.10619 3.34313 8.68619 3.85646 8.68619Z"
            fill="#667085"
          />
        </svg>
      </button>
    </div>
    <!-- END Filters applied pills e.g.: "Currency: EUR" -->

    <!-- Right side -->
    <div class="d-flex align-items-center buttons-container gap-1">
      <!-- Clear All applied filters-->
      <button
        v-if="globalFiltersAppliedFieldsCount > 0"
        id="higher-z-index-btn"
        type="button"
        class="px-2 border bg-white rounded text-sm btn-white-space"
        @click="$emit('clear-all-click')"
      >
        {{ $t("global.clearAll") }}
      </button>
      <!-- END Clear All applied filters-->

      <!-- Save Template -->
      <button
        v-if="globalFiltersAppliedFieldsCount > 0"
        :class="{
          'bg-primary-500 text-white': globalFiltersTemplatesActiveIsDirty,
        }"
        :disabled="!globalFiltersTemplatesActiveIsDirty"
        class="px-2 border rounded text-sm btn-white-space"
        type="button"
        @click="$emit('save-template-click')"
      >
        {{ $t("global.save") }}
      </button>
      <!-- END Save Template -->

      <!-- Filter icon -->
      <div class="mr-1 icon-filter-div">
        <div
          class="filter-icon-container"
          :class="globalFiltersDialogIsShowing ? 'active' : ''"
          @click="$emit('toggle-dialog-visibility')"
        >
          <!-- Number badge -->
          <div
            v-if="globalFiltersAppliedFieldsCount > 0"
            class="filters-count"
          >
            <span class="text-xxxs font-medium">{{
              globalFiltersAppliedFieldsCount
            }}</span>
          </div>
          <!-- Icon -->
          <IconFilter2 />
        </div>
      </div>
    </div>
  </div>
  <!-- END Filters Bar -->
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from "vue";

import IconFilter2 from "@/resources/assets/images/icons/IconFilter2.vue";
import { ArrayUtils } from "@/utils";
import type {
  FiltersGrouped,
  GlobalFiltersSaved,
  GlobalFiltersTemplate,
  KeyLabel,
  TargetView,
} from "@/types";

/**
 * The global-filters topbar: saved-template selector, the applied-filter-pills carousel, and
 * the clear-all/save-template/toggle-dialog buttons. Extracted verbatim from
 * MainLayoutFilters.vue's "Filters Bar" block - see
 * docs/context/change-mainlayoutfilters-refactor.md for the extraction notes, including why
 * `carouselItemsContainer` is exposed rather than owned by the parent.
 */
export default defineComponent({
  name: "GlobalFiltersBar",
  components: { IconFilter2 },
  props: {
    loadFilterData: { type: Boolean, required: true },
    globalFiltersSavedArray: {
      type: Array as PropType<GlobalFiltersSaved[] | undefined>,
      required: false,
      default: undefined,
    },
    globalFiltersTemplatesTitles: {
      type: Array as PropType<KeyLabel[]>,
      required: true,
    },
    globalFiltersTemplatesActive: {
      type: Object as PropType<GlobalFiltersTemplate | null>,
      required: true,
    },
    globalFiltersTemplatesActiveIsDirty: { type: Boolean, required: true },
    carouselWidth: { type: Number, required: true },
    currentIndex: { type: Number, required: true },
    itemsForShowCarousel: { type: Boolean, required: true },
    offset: { type: Number, required: true },
    filtersAppliedGroupedFormatted: {
      type: Array as PropType<FiltersGrouped[]>,
      required: true,
    },
    globalFiltersAppliedFieldsCount: { type: Number, required: true },
    globalFiltersDialogIsShowing: { type: Boolean, required: true },
    getClassesByLevel: {
      type: Function as PropType<(level: TargetView) => string>,
      required: true,
    },
    filtersAppliedGetFormattedLevel: {
      type: Function as PropType<
        (level: TargetView | undefined | null) => string
      >,
      required: true,
    },
    getFieldName: {
      type: Function as PropType<(fieldLabel: string | undefined) => string>,
      required: true,
    },
  },
  emits: [
    "template-change-active",
    "prev-slide",
    "next-slide",
    "filter-remove",
    "filter-group-set-dirty",
    "clear-all-click",
    "save-template-click",
    "toggle-dialog-visibility",
  ],
  setup(_props, { expose }) {
    const carouselItemsContainer = ref<HTMLElement | null>(null);

    expose({ carouselItemsContainer });

    return { ArrayUtils, carouselItemsContainer };
  },
});
</script>
