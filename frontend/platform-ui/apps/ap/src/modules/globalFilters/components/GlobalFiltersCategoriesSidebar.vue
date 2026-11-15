<template>
  <div class="left-side mr-2 body-left-side show-scroll">
    <!-- All filters category -->
    <div
      class="mb-1 options-menu-filters"
      :class="globalFiltersDialogCategorySelected === 'all' ? 'active' : ''"
      @click="$emit('category-click', 'all')"
    >
      <div class="row align-items-center">
        <div
          class="col-2 text-center row-100"
          :class="{ 'cursor-pointer': !loadFilterData }"
        >
          <IconCheckListSolid
            width="20"
            height="20"
          />
        </div>

        <div
          class="col-8 text-left row-100"
          :class="{ 'cursor-pointer': !loadFilterData }"
        >
          <span class="text-lg font-medium">
            {{ $t("global.globalFilters.all") }}
          </span>
        </div>

        <div
          v-if="globalFiltersAppliedFieldsCount > 0"
          class="col-2 text-left row-100"
          :class="{ 'cursor-pointer': !loadFilterData }"
        >
          <span class="text-sm font-medium number-filter-category">
            {{ globalFiltersAppliedFieldsCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- Active filters category -->

    <div
      class="mb-1 options-menu-filters"
      :class="
        globalFiltersDialogCategorySelected === 'active' ? 'active' : ''
      "
      @click="() => $emit('category-click', 'active')"
    >
      <div class="row align-items-center">
        <div
          class="col-2 text-center row-100"
          :class="{ 'cursor-pointer': !loadFilterData }"
        >
          <active />
        </div>

        <div
          class="col-8 text-left row-100"
          :class="{ 'cursor-pointer': !loadFilterData }"
        >
          <span class="text-lg font-medium">{{
            $t("global.globalFilters.active")
          }}</span>
        </div>

        <div
          v-if="globalFiltersAppliedFieldsCount > 0"
          class="col-2 text-left row-100"
          :class="{ 'cursor-pointer': !loadFilterData }"
        >
          <span class="text-sm font-medium number-filter-category">{{
            globalFiltersAppliedFieldsCount
          }}</span>
        </div>
      </div>
    </div>

    <!-- Separator -->
    <div class="border-bottom mb-1 bg-gray-200" />

    <!-- Categories -->

    <h6 class="text-sm text-gray-400 font-medium px-2.5 my-2">
      {{ $t("global.categories") }}
    </h6>

    <div
      v-for="category in categoriesFormatted"
      :key="category.name"
      class="d-flex"
    >
      <div
        v-if="
          category.enabled &&
          category.name !== 'active' &&
          category.name !== 'all'
        "
        class="mb-1 options-menu-filters"
        :class="
          globalFiltersDialogCategorySelected === category.name
            ? 'active'
            : ''
        "
        @click="$emit('category-click', category.name)"
      >
        <div class="row">
          <!-- Category icon -->
          <div
            class="col-2 text-center row-100"
            :class="{ 'cursor-pointer': !loadFilterData }"
          >
            <!-- ? - Evaluate if we can use a dynamic component. Check out DEI component -->
            <industry v-if="category.name === 'industry'" />
            <IconBuildingLgSm
              v-if="category.name === 'buyer'"
              width="20"
              height="20"
            />
            <sizeAndRating v-if="category.name === 'sizeAndRating'" />
            <iconDei v-if="category.name === 'dei'" />
            <geography v-if="category.name === 'geography'" />
            <planAndExecute v-if="category.name === 'planAndExecute'" />
            <opportunity v-if="category.name === 'opportunity'" />
            <spendVolume
              v-if="category.name === 'spendVolumeAndPaymentTerms'"
            />
            <IconSCFGlobalFilters
              v-if="category.name === 'scfVcardDiscounting'"
            />
            <IconCustomFields v-if="category.name === 'customFields'" />
          </div>

          <!-- Category name -->
          <div
            class="col-8 text-left row-100"
            :class="{ 'cursor-pointer': !loadFilterData }"
          >
            <span
              v-if="category.name === 'planAndExecute'"
              class="text-lg font-medium"
            >
              {{
                modulePlanIsAvailable
                  ? $t("global.globalFilters." + category.name)
                  : $t("global.globalFilters.planAndExecuteNotAvailable")
              }}
            </span>

            <span
              v-else-if="category.name === 'scfVcardDiscounting'"
              class="text-lg font-medium"
            >
              {{
                vCardEnabled
                  ? $t("global.globalFilters." + category.name)
                  : $t("global.globalFilters.scfDiscounting")
              }}
            </span>

            <span
              v-else
              class="text-lg font-medium"
            >
              {{ $t("global.globalFilters." + category.name) }}
            </span>
          </div>

          <!-- Amount of fields with applied filters -->
          <div
            v-if="category.amountAplied !== null && category.amountAplied > 0"
            class="col-2 text-left row-100"
            :class="{ 'cursor-pointer': !loadFilterData }"
          >
            <span class="text-sm font-medium number-filter-category">
              {{ category.amountAplied }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

import active from "@/modules/components/icons/IconStar.vue";
import geography from "@/modules/components/icons/IconGlobe.vue";
import IconBuildingLgSm from "@/resources/assets/images/icons/IconBuildingLgSm.vue";
import IconCheckListSolid from "@/resources/assets/images/icons/IconCheckListSolid.vue";
import IconCustomFields from "@/modules/components/icons/IconCustomFields.vue";
import industry from "@/modules/components/icons/IconIndustry.vue";
import opportunity from "@/modules/components/icons/IconGoal.vue";
import planAndExecute from "@/modules/components/icons/IconFlag.vue";
import IconSCFGlobalFilters from "@/modules/components/icons/IconSCFGlobalFilters.vue";
import sizeAndRating from "@/modules/components/icons/IconBarChart.vue";
import iconDei from "@/resources/assets/images/icons/iconDei.vue";
import spendVolume from "@/modules/components/icons/IconWallet.vue";
import type { Category, CategoryName } from "@/types";

/**
 * The global-filters dialog's category sidebar (all/active + the dynamic category list).
 * Extracted verbatim from MainLayoutFilters.vue's "Left side" block inside "Global Filters
 * Dialog - Body". The footer's "Saved Filters" toggle button is a DOM sibling of this sidebar
 * one level up (inside a separate Footer div, not nested inside this one) - it stayed in the
 * shell rather than being merged in here, since a single component can't render into two
 * disjoint places in the parent's DOM tree. See
 * docs/context/change-mainlayoutfilters-refactor.md for the extraction notes.
 */
export default defineComponent({
  name: "GlobalFiltersCategoriesSidebar",
  components: {
    active,
    geography,
    IconBuildingLgSm,
    IconCheckListSolid,
    IconCustomFields,
    industry,
    opportunity,
    planAndExecute,
    IconSCFGlobalFilters,
    sizeAndRating,
    iconDei,
    spendVolume,
  },
  props: {
    globalFiltersDialogCategorySelected: {
      type: String as PropType<CategoryName>,
      required: true,
    },
    globalFiltersAppliedFieldsCount: { type: Number, required: true },
    loadFilterData: { type: Boolean, required: true },
    categoriesFormatted: {
      type: Array as PropType<Category[]>,
      required: true,
    },
    modulePlanIsAvailable: { type: Boolean, required: true },
    vCardEnabled: { type: Boolean, required: true },
  },
  emits: ["category-click"],
});
</script>
