<template>
  <!-- Modal - Clear all applied filters confirmation -->
  <CalculumModal
    v-if="isModalConfirmFiltersClearAllShowing"
    :size="'sm'"
    :show-close="true"
    :title="$t('global.confirm')"
    @close="setIsModalConfirmFiltersClearAllShowing(false)"
  >
    <template #modalContent>
      <p>{{ $t("globalFilters.modalConfirmFiltersClearAll") }}</p>
    </template>

    <template #modalButtons>
      <button
        class="btn outline-secondary-btn font-md"
        style="z-index: 1; width: fit-content"
        @click="setIsModalConfirmFiltersClearAllShowing(false)"
      >
        <span>{{ $t("global.cancel") }}</span>
      </button>
      <button
        class="btn btn-primary font-md"
        style="z-index: 1; width: fit-content"
        @click="filtersClearAll"
      >
        <span>{{ $t("global.clearAll") }}</span>
      </button>
    </template>
  </CalculumModal>

  <!-- Modal - Save applied filters as template -->

  <GlobalFiltersTemplatesModal
    v-if="globalFiltersTemplatesIsModalSaveShowing"
    v-model:new-template-name="filtersTemplatesNewTemplateName"
    :global-filters-templates-active="globalFiltersTemplatesActive"
    :global-filters-templates-save-option-selected="globalFiltersTemplatesSaveOptionSelected"
    @close="globalFiltersTemplatesIsModalSaveShowing = false"
    @save-option-change="globalFiltersTemplatesHandleSaveOptionChange"
    @save="globalFiltersTemplatesHandleClickSave"
  />

  <div class="filters-container">
    <span
      v-if="loadFilterData"
      class="spinner-border spinner-border-sm show-spinner"
    />
    <GlobalFiltersBar
      ref="globalFiltersBarRef"
      :load-filter-data="loadFilterData"
      :global-filters-saved-array="globalFiltersSavedArray"
      :global-filters-templates-titles="globalFiltersTemplatesTitles"
      :global-filters-templates-active="globalFiltersTemplatesActive"
      :global-filters-templates-active-is-dirty="globalFiltersTemplatesActiveIsDirty"
      :carousel-width="carouselWidth"
      :current-index="currentIndex"
      :items-for-show-carousel="itemsForShowCarousel"
      :offset="offset"
      :filters-applied-grouped-formatted="filtersAppliedGroupedFormatted"
      :global-filters-applied-fields-count="globalFiltersAppliedFieldsCount"
      :global-filters-dialog-is-showing="globalFiltersDialogIsShowing"
      :get-classes-by-level="getClassesByLevel"
      :filters-applied-get-formatted-level="filtersAppliedGetFormattedLevel"
      :get-field-name="getFieldName"
      @template-change-active="globalFiltersTemplatesHandleChangeActive"
      @prev-slide="prevSlide"
      @next-slide="nextSlide"
      @filter-remove="filtersRemove"
      @filter-group-set-dirty="globalFiltersRemoveFiltersFieldGroupSetTemplateAsDirty"
      @clear-all-click="setIsModalConfirmFiltersClearAllShowing(true)"
      @save-template-click="globalFiltersTemplatesShowSaveModal"
      @toggle-dialog-visibility="toggleGlobalFiltersDialogVisibility"
    />

    <!-- Global Filters Dialog -->
    <div
      :class="globalFiltersDialogIsShowing ? 'active' : 'inactive'"
      class="d-flex flex-column overflow-hidden options-container"
      data-testid="global-filters-dialog"
    >
      <!-- Loading -->
      <CalculumLoading
        v-if="loadFilterData"
        :modal="true"
        :style="'z-index: 2060;'"
      />

      <!-- Glass Container -->
      <div
        v-if="loadFilterData"
        :class="{ 'bg-blur': loadFilterData }"
        class="h-full w-full"
        style="z-index: 2040; position: absolute; backdrop-filter: blur(1px)"
      />
      <!-- END Glass Container -->

      <div class="d-flex align-items-center gap-3 pb-2 header-filter">
        <h2
          class="d-flex align-items-center mb-0 text-lg font-semibold cursor-pointer"
        >
          <CalculumChevronLeft
            class="mr-2"
            @click="globalFiltersDialogIsShowing = false"
          />
          <span @click="globalFiltersDialogIsShowing = false">
            {{ $t("global.filters.itself") }}
          </span>
        </h2>
      </div>

      <!-- Global Filters Dialog - Body -->

      <div class="d-flex grow py-2 overflow-hidden">
        <!-- Left side -->

        <GlobalFiltersCategoriesSidebar
          :global-filters-dialog-category-selected="globalFiltersDialogCategorySelected"
          :global-filters-applied-fields-count="globalFiltersAppliedFieldsCount"
          :load-filter-data="loadFilterData"
          :categories-formatted="categoriesFormatted"
          :module-plan-is-available="modulePlanIsAvailable"
          :v-card-enabled="vCardEnabled"
          @category-click="filterCategory"
        />

        <!-- Right side -->
        <div
          class="d-flex flex-column grow pr-3 right-side body-right-side show-scroll"
        >
          <template
            v-if="globalFiltersDialogCategorySelected !== 'savedFilters'"
          >
            <!-- No filters -->
            <div
              v-if="ArrayUtils.isEmpty(items)"
              class="d-flex p-5"
            >
              <span class="text-base font-semibold">
                {{ $t("global.globalFilters.noFiltersFound") }}
              </span>
            </div>

            <PanelBar
              v-if="!ArrayUtils.isEmpty(panelBarItemsFormatted)"
              :key="panelBarKey"
              :expanded="panelBarExpanded"
              :items="panelBarItemsFormatted"
              class="panel-bar"
              @select="panelBarItemOnSelect"
            >
              <template
                v-for="fieldName in panelBarSlotFieldNames"
                :key="fieldName"
                #[fieldName]="{ props }"
              >
                <GlobalFilterPanelBarItem
                  :item="props.item"
                  :get-levels="globalFiltersFieldsGetLevels"
                  :get-button-group-options="getButtonsGroupOptionsByField"
                  :is-clear-disabled="
                    (field) =>
                      !globalFiltersToBeAppliedIsFieldInFiltersToBeApplied(field)
                  "
                  @level-changed="
                    (key) =>
                      panelBarItemSetLevelSelected({
                        field: props.item.field,
                        level: key,
                      })
                  "
                  @clear-filter="
                    globalFiltersToBeAppliedRemoveFiltersGroupByField(
                      props.item.field,
                    )
                  "
                  @checkbox-item-changed="
                    (key) =>
                      panelBarItemsMCheckboxesItemSetChecked({
                        field: props.item.field,
                        key,
                      })
                  "
                  @all-items-checked-changed="
                    (isAllItemsChecked) =>
                      panelBarItemSetIsAllItemsChecked({
                        field: props.item.field,
                        isAllItemsChecked,
                      })
                  "
                  @radio-item-changed="
                    (key) =>
                      panelBarItemRadioItemSetChecked({
                        field: props.item.field,
                        key,
                      })
                  "
                  @tree-view-checked-changed="
                    (checkedItemKeys) =>
                      panelBarItemsTreeViewSetCheckedItems({
                        field: props.item.field,
                        checkedItemKeys,
                      })
                  "
                  @range-slider-include-exclude-null="
                    (e) => (rangeSliderIncludeExcludeNull = e)
                  "
                  @range-slider-min-max-changed="
                    (minMaxSelectedValues) =>
                      globalFiltersRangeSliderSetMinMaxSelectedValues({
                        field: props.item.field,
                        minMaxSelectedValues,
                      })
                  "
                />
              </template>
            </PanelBar>

            <!-- No Applied Filters -->
            <div
              v-else-if="globalFiltersDialogCategorySelected === 'active'"
              class="p-5"
            >
              <h6 class="text-base font-semibold">
                {{ $t("global.globalFilters.noAppliedFiltersTitle") }}
              </h6>
              <p>
                {{ $t("global.globalFilters.noAppliedFiltersBody") }}
              </p>
            </div>
          </template>

          <!-- Saved Templates -->

          <GlobalFiltersSavedList
            v-else
            :global-filters-templates-is-loading-templates="globalFiltersTemplatesIsLoadingTemplates"
            :global-filters-templates-filters-grouped="globalFiltersTemplatesFiltersGrouped"
            @change-active="(id) => globalFiltersTemplatesHandleChangeActive(null, id)"
            @delete="globalFiltersTemplatesAPIDelete"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="d-flex pt-2 footer-filter">
        <div class="d-flex row-100 justify-content-between">
          <!-- Left Side -->
          <div class="d-flex left-side footer-left-side">
            <div
              class="d-flex options-menu-filters"
              :class="
                globalFiltersDialogCategorySelected === 'savedFilters'
                  ? 'active'
                  : ''
              "
              @click="filterCategory('savedFilters')"
            >
              <div class="d-flex text-left cursor-pointer">
                <IconBookMark class="mr-2" />
                <span class="text-sm font-medium">
                  {{ $t("global.savedFilters") }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Side -->
          <div class="d-flex right-side footer-right-side">
            <button
              :disabled="filtersApplied.filters.length === 0"
              :class="globalFiltersAppliedFieldsCount <= 0 ? 'disabled' : ''"
              class="btn outline-secondary-btn font-md"
              style="z-index: 1; width: fit-content"
              type="button"
              @click="setIsModalConfirmFiltersClearAllShowing(true)"
            >
              {{ $t("global.clearAll") }}
            </button>

            <button
              :disabled="filtersToBeApplied.filters.length === 0"
              class="btn btn-primary font-md"
              style="z-index: 1; width: fit-content"
              @click="filtersApply"
            >
              {{ $t("global.showResults") }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- END Global Filters Dialog -->
  </div>
</template>

<script lang="ts">
/**
 * MainLayoutFilters – Global filters bar and dialog.
 *
 * Manages filter categories, panel bar items, templates, and applied filters.
 * Key areas: templates (save/load), filters applied (badges), panel bar (options per field).
 */
import {
  computed,
  ComputedRef,
  defineComponent,
  onMounted,
  onUnmounted,
  reactive,
  Ref,
  ref,
  toRefs,
  watch,
  WritableComputedRef,
} from "vue";

// Utils
import {
  ArrayUtils,
  isNullOrUndefined,
  ObjectUtils,
  StringUtils,
} from "@/utils";
import { isUndefined, set } from "lodash";

// Kendo
import {
  PanelBar,
  PanelBarSelectEventArguments,
} from "@progress/kendo-vue-layout";

// Types
import type { ButtonsGroupOptions } from "@/modules/components/types";
import type {
  Category,
  CategoryName,
  Field,
  Filter,
  FiltersApplied,
  FiltersAppliedFieldLevel,
  FiltersGrouped,
  FilterType,
  GlobalFiltersPanelBarItem,
  GlobalFiltersTemplate,
  KeyLabel,
  KeyValue,
  TargetView,
  UserSession,
  Section,
} from "@/types";
import {
  TARGET_VIEW_PARENTS,
  TARGET_VIEW_SPENDS,
  TARGET_VIEW_SUPPLIERS,
} from "@/types";

// Icons
import IconBookMark from "@/resources/assets/images/icons/IconBookMark.vue";

import {
  panelBarItemsCustomDataPointsDefault,
  panelBarItemsDefault,
} from "../data";
import {
  useGlobalFilters,
  useModulePlan,
  useProgram,
  useSpendFile,
  useUser,
} from "@/composables";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/stores/user";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useAnalyzeStore } from "@/stores/analyze";
import * as clickOutsideRelated from "@/utils/clickOutsideRelated";
import { convertFiltersToREST } from "@/utils/FormatData";
import CalculumChevronLeft from "@/modules/components/CalculumChevronLeft.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { useToast } from "vue-toastification";
import GlobalFilterPanelBarItem from "@/modules/globalFilters/components/GlobalFilterPanelBarItem.vue";
import useFiltersToBeApplied from "@/modules/globalFilters/composables/useFiltersToBeApplied";
import useGlobalFiltersItemSelection from "@/modules/globalFilters/composables/useGlobalFiltersItemSelection";
import useGlobalFiltersTemplates from "@/modules/globalFilters/composables/useGlobalFiltersTemplates";
import useGlobalFiltersCarousel from "@/modules/globalFilters/composables/useGlobalFiltersCarousel";
import buildPanelBarItems from "@/modules/globalFilters/composables/useGlobalFiltersPanelBarItems";
import GlobalFiltersBar from "@/modules/globalFilters/components/GlobalFiltersBar.vue";
import GlobalFiltersTemplatesModal from "@/modules/globalFilters/components/GlobalFiltersTemplatesModal.vue";
import GlobalFiltersCategoriesSidebar from "@/modules/globalFilters/components/GlobalFiltersCategoriesSidebar.vue";
import GlobalFiltersSavedList from "@/modules/globalFilters/components/GlobalFiltersSavedList.vue";
import { getAllPanelBarFieldNames } from "@/modules/globalFilters/config/panelBarItemFieldConfig";
import useSMEFeature from "@/composables/useSMEFeature";
import useCompany from "@/composables/useCompany";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";

//types
import { Data } from "../types";
import { useAppStore } from "@/stores/app";
import {
  addFilterLogError,
  filterItemsByAllCategory,
  filterItemsByCategory,
  formatMultipleCheckboxesValueLabel,
  getFieldName,
  filtersAppliedGetFormattedLevel,
  getIconNameByLabel,
  groupFiltersByField,
  isValidTargetLevel,
  mapBooleanArrayToItems,
  mapGroupedArrayToItems,
  mapNumberArrayToItems,
} from "@/utils/globalFiltersUtils";

export default defineComponent({
  name: "MainLayoutFilters",
  components: {
    CalculumChevronLeft,
    CalculumLoading,
    CalculumModal,
    GlobalFilterPanelBarItem,
    GlobalFiltersBar,
    GlobalFiltersCategoriesSidebar,
    GlobalFiltersSavedList,
    GlobalFiltersTemplatesModal,
    IconBookMark,
    PanelBar,
  },
  setup() {
    const userStore = useUserStore();
    const globalFiltersStore = useGlobalFiltersStore();
    const analyzeStore = useAnalyzeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const appStore = useAppStore();
    const { featureCreditRatingEnabled } = useFeatureCreditRating();
    const currencyRate: ComputedRef<number> = computed(
      () => appStore.getCurrencyAmount,
    );
    const { modulePlanIsAvailable } = useModulePlan();

    const data = reactive<Data>({
      computedDataPoints: 20,
      currentIndex: 0,
      filtersTemplatesNewTemplateName: "",
      filtersToBeApplied: ObjectUtils.cloneDeep(
        globalFiltersStore.getFiltersApplied,
      ), // cloned from store,
      globalFiltersTemplatesActiveIsDirty: false,
      globalFiltersTemplatesIsLoadingTemplates: false,
      globalFiltersTemplatesIsModalSaveShowing: false,
      globalFiltersTemplatesSaveOptionSelected: "update",
      isModalConfirmFiltersClearAllShowing: false,
      items: [],
      itemsForShowCarousel: false,
      loadFilterData: false,
      offset: 0,
      rangeSliderIncludeExcludeNull: false,
    });

    // Logged in user
    const {
      user,
      userIri,
      useFeatureVirtualCard,
      userPartnerRoleEnabled,
      useFeature9BoxesFinancing,
      useFeatureForecastVolume,
      getExternalFinancing

    } = useUser();
    const { featureSMEEnabled } = useSMEFeature();

    const {
      spendFileVersionActiveNameCustomDataPoints,
      spendFileVersionActiveCustomDataPointsHasData,
    } = useSpendFile();

    const { programSelectedId } = useProgram();

    const { usevCardGroupsEnabled } = useCompany();

    const vCardEnabled = computed((): boolean => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
    });

    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return featureSMEEnabled.value;
    });

    // *** Filters Applied ***

    const {
      getClassesByLevel,
      getCustomFieldName,
      globalFiltersApplied: filtersApplied,
      globalFiltersAppliedFieldGetMaxValue,
      globalFiltersAppliedFieldGetMinValue,
      globalFiltersAppliedFieldsCount,
      globalFiltersAppliedFilters: filtersAppliedFilters,
      globalFiltersAppliedGetFields,
      globalFiltersAppliedIsProgramIdRequired,
      globalFiltersAppliedRemoveFiltersFieldGroup,
      globalFiltersFieldsIsProgramSelectedRequired,
      globalFiltersGetFieldFormatted,
      globalFiltersIsValidAPIRead,
      hasCustomDataPoint,
      panelBarItemGetLevelSelected,
      panelBarItemGetTitleFormatted,
      panelBarItemOptionsAPIReadAll,
      panelBarItemsGetItem,
      panelBarKey,
    } = useGlobalFilters();

    /**
     * Remove filter from filters applied then set template as dirty
     */
    function globalFiltersRemoveFiltersFieldGroupSetTemplateAsDirty(
      field: Field,
    ) {
      globalFiltersAppliedRemoveFiltersFieldGroup(field);

      if (ArrayUtils.isEmpty(filtersApplied.value.filters)) {
        data.globalFiltersTemplatesActiveIsDirty = false;

        return;
      }

      data.globalFiltersTemplatesActiveIsDirty = true;
    }

    /**
     * Group filters by field (category)
     * e.g.: "companySize": "small, medium"
     */
    const filtersAppliedGrouped: ComputedRef<FiltersGrouped[]> = computed(
      () => {
        if (ArrayUtils.isEmpty(filtersAppliedFilters.value)) return [];
        return groupFiltersByField(filtersAppliedFilters.value);
      },
    );

    /**
     * Format groups joining values with comma and adding +2 if there's more than 1 item
     * e.g.: "companySize": "small, medium" -> "Company Size: Small ... +1"
     */
    const globalFiltersAppliedGroupedFormatted: ComputedRef<FiltersGrouped[]> =
      computed(() => {
        const result = filtersAppliedGrouped.value.map((g) => {
          // Validate
          if (
            StringUtils.isNullUndefinedOrEmpty(g.field) ||
            ArrayUtils.isEmpty(g.value)
          ) {
            if (import.meta.env.DEV)
              console.error(
                "** Error: Field or value not found in globalFiltersAppliedGroupedFormatted",
              );

            return;
          }

          let fieldFormatted = globalFiltersGetFieldFormatted({
            field: g.field,
            items: data.items,
          });

          // Format value: Commodity: Commodity 1 ... +2
          return {
            field: g.field,
            fieldLabel: fieldFormatted,
            level: g.level,
            value: g.value,
            valueLabel: filtersAppliedGetFilterValueLabel({
              field: g.field,
              items: data.items,
              value: g.value,
            }),
          };
        });

        // Remove undefined elements from array
        return result.filter((g) => g !== undefined) as FiltersGrouped[];
      });

    // *** END Filters Applied ***

    // *** Global Filters Dialog ***

    const globalFiltersDialogIsShowing = ref(false);

    /**
     * Toggle filters visibility
     */
    function toggleGlobalFiltersDialogVisibility() {      
      globalFiltersDialogIsShowing.value = !globalFiltersDialogIsShowing.value;

      if (globalFiltersDialogIsShowing.value) {
        //-If user open the dialog,always validate the planPhaseNames values and setit to the item
        extractPlanPhaseNamesValues("planPhaseNames");
      }
    }

    // *** END Global Filters Dialog ***

    // *** Global Filters Dialog - Categories ***
    // Left side of the filter panel displays a list of filter categories

    const categoriesNamesDefault: CategoryName[] = [
      "active",
      "industry",
      "buyer",
      "sizeAndRating",
      "geography",
      "dei",
      "planAndExecute",
      "opportunity",
      "spendVolumeAndPaymentTerms",
      "scfVcardDiscounting",
      "customFields",
      "all",
    ];

    const categories: Ref<Category[]> = ref([]);

    // Initialize categories
    if (ArrayUtils.isEmpty(categories.value)) {
      categories.value = categoriesNamesDefault.map((c) => {
        return {
          amountAplied: 0,
          enabled: true,
          name: c,
        };
      });
    }

    const categoriesFormatted = computed(() => {
      return categoriesFieldsWithActiveFiltersCount({
        categories: categories.value,
        items: data.items,
        filters: filtersApplied.value.filters,
      });
    });

    const globalFiltersDialogCategorySelected: Ref<CategoryName> = ref(
      ArrayUtils.isEmpty(filtersAppliedFilters.value) ? "all" : "active",
    );

    /**
     * Set selected filter category
     *
     * @param categoryName {CategoryName}
     * @returns void
     */
    function globalFiltersDialogCategoryOnClick(
      categoryName: CategoryName,
    ): void {
      // Set selected category
      globalFiltersDialogCategorySelected.value = categoryName;
    }

    /**
     * Count how many filters are applied for a given category.
     * Used to show badge counts on category tabs (e.g. "Industry (3)").
     */
    function countAppliedFiltersForCategory(
      category: Category,
      items: GlobalFiltersPanelBarItem[],
      filters: FiltersAppliedFieldLevel[],
    ): number {
      let count = 0;
      for (const i of items) {
        if (!i.categories.includes(category.name)) continue;
        if (ArrayUtils.isEmpty(filters)) continue;
        const filter = filters.find((f) => f.field === i.field);
        if (isUndefined(filter)) continue;
        if (ArrayUtils.isEmpty(filter.filters)) continue;
        count++;
      }
      return count;
    }

    /**
     * Get list of categories with active filters per category count.
     *
     * @param categories {Category[]}
     * @returns {Category[]}
     */
    function categoriesFieldsWithActiveFiltersCount({
      categories,
      items,
      filters,
    }: {
      categories: Category[];
      items: GlobalFiltersPanelBarItem[];
      filters: FiltersAppliedFieldLevel[];
    }): Category[] {
      if (ArrayUtils.isEmpty(categories)) return [];

      return categories.map((c) => ({
        ...c,
        amountAplied: countAppliedFiltersForCategory(c, items, filters),
      }));
    }

    // *** END Global Filters Dialog - Categories ***

    /**
     * Return true if item is checked in filters
     *
     * @param categoryName {string}
     * @param key {string}
     */
    function globalFiltersIsItemChecked({
      filters,
      field,
      key,
      level,
    }: {
      filters: FiltersAppliedFieldLevel[];
      field: Field;
      key: string;
      level: TargetView;
    }): boolean {
      // Validate
      if (!Array.isArray(data.filtersToBeApplied.filters)) {
        return false;
      }

      const f = filters.find((i) => i.field === field && i.level === level);

      if (isUndefined(f)) {
        return false;
      }

      const filter = f.filters.find((i) => i.value === key);

      return !isUndefined(filter);
    }

    // *** Global Filters - Panel Bar ***

    const panelBarExpanded: Ref<string[]> = ref([]);

    // Initialize panel bar items
    if (ArrayUtils.isEmpty(data.items)) {
      data.items = buildPanelBarItems({
        panelBarItemsDefault,
        panelBarItemsCustomDataPointsDefault,
        getTitleFormatted: panelBarItemGetTitleFormatted,
        isProgramSelectedRequired: globalFiltersFieldsIsProgramSelectedRequired,
        programSelectedId: programSelectedId.value,
        activeProgramDefaultId: user.value?.activeProgramDefaultId,
        spendFileVersionActiveNameCustomDataPoints:
          spendFileVersionActiveNameCustomDataPoints.value,
        spendFileVersionActiveCustomDataPointsHasData:
          spendFileVersionActiveCustomDataPointsHasData.value,
        getCustomFieldName,
      });
    }

    /**
     * Panel bar items filtered by selected category and feature flags.
     * "all" = all items; "active" = only fields with applied filters; else = category-specific.
     */
    const panelBarItemsFormatted = computed(() => {
      const category = globalFiltersDialogCategorySelected.value;
      const flags = {
        smeEnabled: smeFeatureEnabled.value,
        vCardEnabled: vCardEnabled.value,
        userPartnerEnabled:
          userPartnerRoleEnabled.value && useFeature9BoxesFinancing.value,
        creditRatingEnabled: featureCreditRatingEnabled.value,
        modulePlanAvailable: modulePlanIsAvailable.value,
        forecastEnabled: useFeatureForecastVolume.value,
        hideAverageDaysPaid: userStore.getHideAverageDaysPaid,
        financingEnabled: useFeature9BoxesFinancing.value && getExternalFinancing.value
      };

      if (category === "all") {
        return filterItemsByAllCategory(data.items, flags);
      }
      if (category === "active") {
        const fieldsApplied = globalFiltersAppliedGetFields();
        return data.items.filter((item) =>
          fieldsApplied.includes(item.field),
        );
      }
      if (category === "savedFilters") return [];

      return filterItemsByCategory(data.items, category, flags);
    });

    /** All PanelBar slot names (field-based), including the two dynamic customDataPoint ranges. */
    const panelBarSlotFieldNames = computed(() =>
      getAllPanelBarFieldNames(data.computedDataPoints),
    );

    /**
     * Handle selection of an item in the panel bar.
     *
     * @param ev {PanelBarSelectEventArguments}
     */
    async function panelBarItemOnSelect(
      ev: PanelBarSelectEventArguments,
    ): Promise<void> {
      panelBarExpanded.value = [...ev.expandedItems];

      // Only call API if expanded. It is opposite logic in this case.
      if (ev.target.expanded) {
        return;
      }

      const field = ev.target.field;

      await panelBarItemOptionsUpdate(field);
    }

    /** Map string array to panel bar items; adds iconName for entityCompanySize. */
    function mapStringArrayToItems(
      arr: unknown[],
      field: Field,
    ): { key: string; value: string; iconName?: string; checked: boolean }[] {
      return arr
        .map((i) => {
          if (i === null || typeof i !== "string") return null;
          if (field === "entityCompanySize") {
            return { key: i, value: i, iconName: getIconNameByLabel(i), checked: false };
          }
          return { key: i, value: i, checked: false };
        })
        .filter((i) => i !== null) as {
          key: string;
          value: string;
          iconName?: string;
          checked: boolean;
        }[];
    }

    /** Parse API array response into item.itemData.items (string/number/boolean/grouped). */
    function parseArrayResponseData(
      responseData: { value: unknown[] },
      item: GlobalFiltersPanelBarItem,
      field: Field,
    ): boolean {
      const supportedTypes = ["multipleCheckboxes", "radioBtn", "treeView"];
      if (!supportedTypes.includes(item.filterType)) {
        if (import.meta.env.DEV) console.error(`** Filter type not supported: ${item.filterType}`);
        return false;
      }
      if (isNullOrUndefined(item.itemData)) {
        item.itemData = { items: [] };
      }
      item.itemData.items = [];
      if (ArrayUtils.isEmpty(responseData.value)) return true;

      const first = responseData.value[0];
      if (typeof first === "string") {
        item.itemData.items = mapStringArrayToItems(responseData.value, field);
      } else if (typeof first === "number") {
        item.itemData.items = mapNumberArrayToItems(responseData.value);
      } else if (typeof first === "boolean") {
        item.itemData.items = mapBooleanArrayToItems(responseData.value);
      } else {
        return mapGroupedArrayToItems(responseData.value, item);
      }
      return true;
    }

    /** Parse API range response (min/max) into rangeSlider itemData and generate tick items. */
    function parseRangeResponseData(
      responseData: { value: { minValue: number; maxValue: number } },
      item: GlobalFiltersPanelBarItem,
      field: Field,
    ): boolean {
      if (isNullOrUndefined(item.itemData)) {
        item.itemData = { minValue: null, maxValue: null, items: [] };
      }
      const value = responseData.value;
      if (
        isNullOrUndefined(value?.minValue) ||
        isNullOrUndefined(value?.maxValue)
      ) {
        if (import.meta.env.DEV)
          console.error(
            "** responseData.value.minValue or responseData.value.maxValue is null or undefined. responseData.value:",
            value,
          );
        return false;
      }
      if (item.filterType !== "rangeSlider") {
        if (import.meta.env.DEV)
          console.log(
            `** (panelBarItemOptionsUpdate). ${field} field is not of type rangeSlider.`,
          );
        return false;
      }

      item.itemData.minValue = 0;
      item.itemData.minValueSelected = value.minValue;
      item.itemData.maxValue = value.maxValue;
      item.itemData.maxValueSelected = item.itemData.maxValue;

      const itemsCount = 5;
      const itemDataItemsKeys = ArrayUtils.range(0, item.itemData.maxValue, {
        itemsCount,
      });

      const formatKey = (num: number): KeyValue<number, string> => {
        const n = Number.isInteger(num) ? num : Math.round(num);
        const isMoneyCustomDataPoint =
          field.startsWith('customDataPoint') &&
          analyzeStore.customDataPointTypes[field] === 'money';
        const val =
          field === "volume" || field === "modelCashFlow" || field === "forecastVolume" || isMoneyCustomDataPoint
            ? StringUtils.formatBigNumbers(n)
            : n.toString();
        return { key: n, value: val };
      };

      item.itemData.items = itemDataItemsKeys.map(formatKey);
      return true;
    }

    /**
     * Get panel bar item data given field name
     */
    async function panelBarItemOptionsUpdate(field: Field): Promise<void> {
      if (StringUtils.isNullUndefinedOrEmpty(field)) return;

      const item = data.items.find((f) => f.field === field);
      if (isUndefined(item)) {
        if (import.meta.env.DEV) console.error("** Error: Field not found in panelBarItemOptionsAPIReadAll");
        return;
      }

      const isProgramSelectedRequired =
        globalFiltersFieldsIsProgramSelectedRequired(field);
      const shouldSkip =
        isProgramSelectedRequired &&
        isNullOrUndefined(programSelectedId.value) &&
        isNullOrUndefined(user.value?.activeProgramDefaultId);

      let responseData = null;
      if (shouldSkip) {
        if (import.meta.env.DEV)
          console.log(
            `** (setPanelBarData) Skipping ${field} because it requires a program to be selected and no program is selected`,
          );
      } else {
        item.isLoading = true;
        responseData = await panelBarItemOptionsAPIReadAll({
          field,
          filterType: item.filterType,
          levelSelected: item.levelSelected,
        });
      }
      item.isLoading = false;

      if (isNullOrUndefined(responseData)) return;
      if (field !== responseData.key) {
        if (import.meta.env.DEV)
          console.error(
            "** (panelBarItemOptionsUpdate). Field does not match responseData.key. field:",
            field,
            "/ responseData.key:",
            responseData.key,
          );
        return;
      }

      const parsed = Array.isArray(responseData.value)
        ? parseArrayResponseData(
            responseData as { value: unknown[] },
            item,
            field,
          )
        : parseRangeResponseData(
            responseData as { value: { minValue: number; maxValue: number } },
            item,
            field,
          );

      if (!parsed) return;
      panelBarItemsReset();
    }


    /**
     * Sets the minimum and maximum values for the range slider type filter.
     *
     * @param {field, minMaxSelectedValues} {Field, {start: number, end: number}}
     */
    function globalFiltersRangeSliderSetMinMaxSelectedValues({
      field,
      minMaxSelectedValues,
    }: {
      field: Field;
      minMaxSelectedValues: { start: number; end: number };
    }) {
      // Init
      let { start, end } = minMaxSelectedValues;

      // Validate
      if (ArrayUtils.isEmpty(data.items)) return;

      // Find Panel Bar Item
      data.items.forEach((i) => {
        // Validate
        if (i === undefined || i === null) {
          if (import.meta.env.DEV)
            console.log(
              "** Error: globalFiltersRangeSliderSetMinValue: i (GlobalFiltersPanelBarItem) is undefined",
            );

          return;
        }

        // Field not found. Skip
        if (i.field !== field) return;

        // Format minValueSelected and maxValueSelected as integers
        if (field === "modelPaymentTerms") {
          start = Math.round(start);
          end = Math.round(end);
        }

        // Validate
        if (isNullOrUndefined(i.itemData)) {
          if (import.meta.env.DEV)
            console.log(
              "** Error: globalFiltersRangeSliderSetMinValue: i.itemData is undefined",
            );

          i.itemData = {
            minValueSelected: start,
            maxValueSelected: end,
          };
        }

        // Set value
        i.itemData.minValueSelected = start;
        i.itemData.maxValueSelected = end;

        const filter = {
          field,
          operator: "gte",
          value: { min: start, max: end },
        } as const;

        setFiltersToBeAppliedAddFilter({ filter, filterType: "rangeSlider" });
      });
    }

    /** Create empty filter entry for a field/level (used when adding first filter for a field). */
    function createEmptyFilterEntry(
      field: Field,
      level: TargetView | string,
    ): FiltersAppliedFieldLevel {
      return { field, filters: [], level: level as TargetView, logic: "or" };
    }

    /** Append new field entry to filtersToBeApplied.filters. */
    function addFieldToFiltersToBeApplied(
      field: Field,
      level: TargetView | string,
    ): void {
      const entry = createEmptyFilterEntry(field, level);
      if (isNullOrUndefined(data.filtersToBeApplied.filters)) {
        data.filtersToBeApplied.filters = [entry];
      } else {
        data.filtersToBeApplied.filters.push(entry);
      }
    }

    /** Update level for existing field in filtersToBeApplied and clear its filter values. */
    function updateFieldLevelInFiltersToBeApplied(
      field: Field,
      level: TargetView | string,
    ): void {
      data.filtersToBeApplied.filters = data.filtersToBeApplied.filters.map(
        (f) => {
          if (f.field === field) {
            f.level = level as TargetView;
            f.filters = [];
          }
          return f;
        },
      );
    }

    /**
     * Sets the selected level.
     * Note: `level: TargetView | string` is a temp solution. It should be replaced by `level: TargetView`.
     *
     * @param {string} level - The level to be set.
     */
    async function panelBarItemSetLevelSelected({
      field,
      level,
    }: {
      field: Field;
      level: TargetView | string;
    }) {
      if (StringUtils.isNullUndefinedOrEmpty(field)) {
        if (import.meta.env.DEV)
          console.log(
            "** Error: panelBarItemSetLevelSelected: field is null or undefined",
          );
        return;
      }
      if (!isValidTargetLevel(level)) {
        if (import.meta.env.DEV)
          console.error(
            "** (panelBarItemSetLevelSelected) Level is not valid. level:",
            level,
          );
        return;
      }

      const item = data.items.find((i) => i.field === field);
      if (isUndefined(item)) {
        if (import.meta.env.DEV)
          console.log(
            "** Error: panelBarItemSetLevelSelected: item is undefined",
          );
        return;
      }
      if (item.levelSelected === level) return;

      item.levelSelected = level;
      await panelBarItemOptionsUpdate(field);

      if (ArrayUtils.isEmpty(data.filtersToBeApplied.filters)) {
        addFieldToFiltersToBeApplied(field, level);
        return;
      }

      const fieldInAppliedFilters = filtersToBeAppliedGetFilterField(field);
      if (isUndefined(fieldInAppliedFilters)) {
        addFieldToFiltersToBeApplied(field, level);
        return;
      }
      if (fieldInAppliedFilters.level === level) return;

      updateFieldLevelInFiltersToBeApplied(field, level);
    }

    // *** Filters to be applied ***

    const {
      filtersToBeAppliedSet,
      setFiltersToBeAppliedAddFilter,
      filtersToBeAppliedGetFilterField,
      globalFiltersToBeAppliedRemoveFiltersGroupByField,
      setFiltersToBeAppliedRemoveFilter,
      setFiltersToBeAppliedCleanEmptyFilters,
      globalFiltersToBeAppliedIsFieldInFiltersToBeApplied,
    } = useFiltersToBeApplied({
      filtersToBeApplied: data.filtersToBeApplied,
      getItems: () => data.items,
      getLevelSelected: (field) =>
        panelBarItemGetLevelSelected({ field, items: data.items }),
      hasCustomDataPoint,
      getCustomFieldName,
    });

    // *** END Filters to be applied ***

    // *** Global Filters - Panel Bar Item Selection ***

    const {
      panelBarItemsTreeViewSetCheckedItems,
      panelBarItemRadioItemSetChecked,
      panelBarItemsMCheckboxesItemSetChecked,
      panelBarItemSetIsAllItemsChecked,
    } = useGlobalFiltersItemSelection({
      getItems: () => data.items,
      getItemByField: panelBarItemsGetItem,
      setFiltersToBeAppliedAddFilter,
      setFiltersToBeAppliedRemoveFilter,
      globalFiltersToBeAppliedRemoveFiltersGroupByField,
    });

    // *** END Global Filters - Panel Bar Item Selection ***

    function extractPlanPhaseNamesValues(field: Field) {
      // Validate
      if (ArrayUtils.isEmpty(data.items)) {
        if (import.meta.env.DEV)
          console.log(
            "** Error in panelBarItemsTreeViewSetCheckedItems. data.items is empty",
          );
        return;
      }

      const item = panelBarItemsGetItem({ field, items: data.items });
      if (isUndefined(item)) {
        // Not found
        if (import.meta.env.DEV)
          console.log(
            "** Error in panelBarItemsTreeViewSetCheckedItems. item not found",
          );
        return;
      }

      const planPhaseNamesValues: any[] = [];
      if (
        filtersApplied.value.filters &&
        Array.isArray(filtersApplied.value.filters)
      ) {
        filtersApplied.value.filters.forEach(
          (filter: FiltersAppliedFieldLevel) => {
            if (filter.field === "planPhaseNames") {
              if (filter.filters && Array.isArray(filter.filters)) {
                filter.filters.forEach((nestedFilter) => {
                  if (
                    nestedFilter.field === "planPhaseNames" &&
                    nestedFilter.value
                  ) {
                    planPhaseNamesValues.push(nestedFilter.value.toString());
                  }
                });
              }
            }
          },
        );
      }
      //-Set the planPhaseNames values to the item
      panelBarItemsTreeViewSetCheckedItems({
        field,
        checkedItemKeys: planPhaseNamesValues,
      });
    }

    /**
     * Show the global filters dialog and a filter from the list of
     * applied filters given the field name.
     *
     * @param {string} field Field name
     * @param {Partial<{ isForced: boolean }>} options
     * @param {boolean} options.isForced Force remove
     * @returns {void}
     */
    function filtersRemove(field: string | undefined): void {
      //-If user open the dialog,always validate the planPhaseNames values and setit to the item
      extractPlanPhaseNamesValues("planPhaseNames");

      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(field)) {
        return;
      }

      // Open global filters dialog
      globalFiltersDialogIsShowing.value = true;

      // Select active filters category
      globalFiltersDialogCategoryOnClick("active");
    }

    /**
     * Apply filters
     */
    async function filtersApply(): Promise<void> {
      // Validate
      if (isNullOrUndefined(user.value)) {
        if (import.meta.env.DEV)
          console.log("** Error in filtersApply: user is null or undefined");

        return;
      }

      if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
        if (import.meta.env.DEV)
          console.log(
            "** Error in filtersApply: user.activeSpendFileVersion is null or undefined",
          );

        return;
      }

      // Enable loading
      data.loadFilterData = true;

      // Clean empty filters
      setFiltersToBeAppliedCleanEmptyFilters();
      // Validate
      if (ArrayUtils.isEmpty(data.filtersToBeApplied.filters)) {
        toast.error(translate.t("error.filtersNoFiltersSelected"));

        // Disable loading
        data.loadFilterData = false;

        return;
      }

      // Clone applied filters for avoiding unique reference
      let filtersToBeAppliedClone = ObjectUtils.cloneDeep(
        data.filtersToBeApplied,
      );

      let targetProgramUuid = null;
      let section: Section = "analyze";
      // Has filters to be applied fields related to program?
      if (
        user.value !== null &&
        globalFiltersAppliedIsProgramIdRequired(filtersToBeAppliedClone)
      ) {
        targetProgramUuid =
          programSelectedId.value ?? user.value.activeProgramDefaultId ?? null; // Ensure not undefined
        section = "program";
      }

      // Validate filters to be applied
      let isValid = await globalFiltersIsValidAPIRead({
        currencyRate: currencyRate.value, // cloned from store
        section,
        globalFilter:
          convertFiltersToREST(filtersToBeAppliedClone) ?? "", // ? - Check convertFiltersToREST return value type
        targetSpendFileVersionUuid: user.value.activeSpendFileVersion["@id"],
        targetProgramUuid,
      });

      // Not valid
      if (!isValid) {
        toast.error(translate.t("error.filtersNotValid"));

        // Disable loading
        data.loadFilterData = false;

        return;
      }

      // Valid
      globalFiltersStore.setFiltersApplied(filtersToBeAppliedClone);
      // Mark global filters active template as dirty
      data.globalFiltersTemplatesActiveIsDirty = true;

      // Close global filters dialog if visible
      globalFiltersDialogIsShowing.value = false;

      // Disable loading
      data.loadFilterData = false;
    }

    /**
     * Clear applied filters
     */
    function filtersClearAll() {
      // Validate
      if (ArrayUtils.isEmpty(data.filtersToBeApplied.filters)) {
        if (import.meta.env.DEV)
          console.log(
            "** Error: filtersClearAll: filtersToBeApplied.filters is empty",
          );
        return;
      }

      // Hide modal dialog if visible
      data.isModalConfirmFiltersClearAllShowing = false;

      // Set to default applied filters
      filtersAppliedFilters.value = [];

      globalFiltersDialogCategorySelected.value = "all";
    }

    /**
     * Set clear all modal visibility
     *
     * @param isShowing {boolean}
     */
    function setIsModalConfirmFiltersClearAllShowing(isShowing: boolean) {
      // Validate
      if (ArrayUtils.isEmpty(filtersApplied.value.filters)) {
        data.isModalConfirmFiltersClearAllShowing = false;
        toast.error(translate.t("error.filtersCanNotBeCleared"));

        return;
      }

      data.isModalConfirmFiltersClearAllShowing = isShowing;
    }

    /**
     * Get button group options based on field
     */
    /** Get ButtonGroup options (activeItemKey, classes) for level selector. */
    function panelBarItemButtonsGroupGetOptions(
      field: Field,
    ): Partial<ButtonsGroupOptions> {
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(field)) return {};

      const item = data.items.find((i) => i.field === field);

      // Validate
      if (isUndefined(item)) return {};

      const options = {
        activeItemKey: item.levelSelected,
        classesByKey: [
          {
            key: TARGET_VIEW_SUPPLIERS,
            value: getClassesByLevel(TARGET_VIEW_SUPPLIERS), // Not used
          },
          {
            key: TARGET_VIEW_PARENTS,
            value: getClassesByLevel(TARGET_VIEW_PARENTS), // Not used
          },
        ],
      };

      return options;
    }

    /** Sync checkbox/radio item checked state from filtersToBeApplied. */
    function resetCheckboxOrRadioItem(item: GlobalFiltersPanelBarItem): void {
      if (isUndefined(item.itemData?.items)) return;
      item.itemData!.items.forEach((j) => {
        j.checked = globalFiltersIsItemChecked({
          filters: data.filtersToBeApplied.filters,
          field: item.field,
          key: j.key,
          level: item.levelSelected,
        });
      });
    }

    /** Sync range slider min/max selected from filtersToBeApplied. */
    function resetRangeSliderItem(item: GlobalFiltersPanelBarItem): void {
      if (isUndefined(item.itemData?.items)) return;
      const itemData = item.itemData!;
      if (isNullOrUndefined(itemData.minValueSelected)) {
        itemData.minValueSelected = itemData.minValue;
      }
      if (isNullOrUndefined(itemData.maxValueSelected)) {
        itemData.maxValueSelected = itemData.maxValue;
      }
      const minValue = globalFiltersAppliedFieldGetMinValue({
        filters: filtersApplied.value.filters,
        field: item.field,
        level: item.levelSelected,
      });
      if (!isNullOrUndefined(minValue)) {
        itemData.minValueSelected = minValue;
      }
      const maxValue = globalFiltersAppliedFieldGetMaxValue({
        filters: filtersApplied.value.filters,
        field: item.field,
        level: item.levelSelected,
      });
      if (!isNullOrUndefined(maxValue)) {
        itemData.maxValueSelected = maxValue;
      }
    }

    /** Reset single panel bar item state based on filter type. */
    function resetPanelBarItemState(item: GlobalFiltersPanelBarItem): void {
      if (isNullOrUndefined(item.itemData)) return;
      if (item.filterType === "multipleCheckboxes" || item.filterType === "radioBtn") {
        resetCheckboxOrRadioItem(item);
      } else if (item.filterType === "rangeSlider") {
        resetRangeSliderItem(item);
      } else if (item.filterType !== "treeView" && import.meta.env.DEV) {
        console.log(
          "** Error in panelBarItemsReset. Unknown filter type:",
          item.filterType,
        );
      }
    }

    /**
     * Reset all data used for the panel bar to display filters options and their states
     *
     * @returns {void}
     */
    function panelBarItemsReset(): void {
      if (ArrayUtils.isEmpty(data.items)) {
        if (import.meta.env.DEV)
          console.log(
            "** (panelBarItemsReset) Skipping because data.items is empty",
          );
        return;
      }

      data.items = data.items.map((i: GlobalFiltersPanelBarItem) => {
        resetPanelBarItemState(i);
        clickHeaderFilter();
        return i;
      });

      data.items = data.items
        .map((i: GlobalFiltersPanelBarItem) => ({
          ...i,
          title: panelBarItemGetTitleFormatted({
            field: i.field,
            items: data.items,
          }),
        }))
        .sort((a, b) =>
          (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase()),
        );
    }

    /** Format radio button value for badge (e.g. true → "Yes"). */
    function formatRadioBtnValueLabel(
      field: Field,
      value: string[],
    ): string {
      const isTrue = value[0]?.toLowerCase() === "true" || value[0]?.toLowerCase() === "yes";

      return translate.t(
        `global.globalFilters.radioButtons.${field}.${isTrue ? "true" : "false"}`,
      );
    }

    /** Format tree view value for badge (e.g. planPhaseNames → "Plan 1 - Phase 1"). */
    function formatTreeViewValueLabel(
      field: Field,
      value: string[],
    ): string {
      if (field !== "planPhaseNames") return "";
      let [planName, phaseNumber] = value[0].split(" - ");
      if (phaseNumber === "10000") phaseNumber = "Rest";
      const formatted = `${planName} - Phase ${phaseNumber}`;
      return value.length === 1
        ? formatted
        : `${formatted}... +${value.length - 1}`;
    }

    /** Format range slider value for badge (e.g. "100 - 500" or formatted numbers). */
    function formatRangeSliderValueLabel(
      field: Field,
      value: string[],
    ): string {
      if (value.length === 1) return value[0];
      const isMoneyCustomDataPoint =
        field.startsWith('customDataPoint') &&
        analyzeStore.customDataPointTypes[field] === 'money';
      const formatVal = (v: string) =>
        field === "volume" || field === "modelCashFlow" || field === "forecastVolume" || isMoneyCustomDataPoint
          ? StringUtils.formatBigNumbers(Number(v))
          : v;
      return `${formatVal(value[0])} - ${formatVal(value[1])}`;
    }

    /**
     * Get value label for a filter badge given filter type and value
     *
     * @param type {FilterType}
     * @param value {string[]}
     */
    function filtersAppliedGetFilterValueLabel({
      field,
      value,
      items,
    }: {
      field: Field;
      value: string[];
      items: GlobalFiltersPanelBarItem[];
    }): string {
      if (ArrayUtils.isEmpty(value)) return "";

      const item = items.find((i) => i.field === field);
      if (isUndefined(item)) {
        if (import.meta.env.DEV)
          console.log(
            "** Error in filtersAppliedGetFilterValueLabel. Unknown field:",
            field,
          );
        return "";
      }

      const formatters: Record<string, () => string> = {
        radioBtn: () => formatRadioBtnValueLabel(field, value),
        multipleCheckboxes: () => formatMultipleCheckboxesValueLabel(value),
        treeView: () => formatTreeViewValueLabel(field, value),
        rangeSlider: () => formatRangeSliderValueLabel(field, value),
      };

      return formatters[item.filterType]?.() ?? "";
    }

    /**
     * Get list of levels available for a given field
     */
    function globalFiltersFieldsGetLevels(
      field: Field,
    ): KeyValue<TargetView, string>[] {
      // Validate
      if (StringUtils.isEmpty(field)) {
        return [];
      }

      const item = data.items.find((f) => f.field === field);

      if (isUndefined(item)) {
        return [];
      }

      // Validate
      if (ArrayUtils.isEmpty(item.levels)) {
        return [];
      }

      const levelsKeyValue = item.levels.map((level) => {
        let value = "";

        switch (level) {
          case TARGET_VIEW_SPENDS:
            value = translate.t("global.spendLine");
            break;

          case TARGET_VIEW_SUPPLIERS:
            value = translate.t("global.supplier");
            break;

          case TARGET_VIEW_PARENTS:
            value = translate.t("global.parent");
            break;

          default:
            if (import.meta.env.DEV) console.log("** Error: Unknown level");
            break;
        }

        return {
          key: level,
          value,
        };
      });

      return levelsKeyValue;
    }

    // *** END Filters Applied ***

    // *** Global Filters Templates ***

    const {
      globalFiltersSavedArray,
      globalFiltersSavedSelected,
      globalFiltersTemplatesActive,
      globalFiltersTemplatesTitles,
      globalFiltersTemplatesFiltersGrouped,
      globalFiltersTemplatesShowSaveModal,
      globalFiltersTemplatesHandleSaveOptionChange,
      globalFiltersTemplatesHandleClickSave,
      globalFiltersTemplatesActiveAPIUpdate,
      globalFiltersTemplatesAPIDelete,
      globalFiltersTemplatesHandleChangeActive,
      updateGlobalFiltersTemplatesActive,
    } = useGlobalFiltersTemplates({
      data,
      filtersApplied,
      filtersAppliedFilters,
      getCustomFieldName,
      filtersClearAll,
      toggleGlobalFiltersDialogVisibility,
      showCarouselForAppliedFilters: () =>
        showCarousel(globalFiltersAppliedGroupedFormatted.value.length),
    });

    // *** END Global Filters Templates ***

    const { globalFiltersBarRef, showCarousel, carouselWidth, prevSlide, nextSlide } =
      useGlobalFiltersCarousel({ data, globalFiltersSavedArray });

    // *** END GF Dialog ***

    /**
     * Handle click outside dialog
     *
     * @param e {Event}
     */
    function handleClickOutsideDialog(e: Event) {
      let result = clickOutsideRelated.handleClickOutsideDialog(
        e,
        globalFiltersDialogIsShowing.value,
      );
      if (typeof result === "boolean") {
        globalFiltersDialogIsShowing.value = result;
      }
    }

    // *** On mounted ***

    onMounted(() => {
      // Handle click outside dialog
      document.body.addEventListener("click", handleClickOutsideDialog);
    });

    // *** On Unmounted ***
    onUnmounted(() => {
      document.body.removeEventListener("click", handleClickOutsideDialog);
    });

    /** WATCH SECTION */

    // - Bug fix:
    // For resetting expanded state when category or program selected is changed.
    // Some items were keeping expanded state even with its content not showing.
    watch([globalFiltersDialogCategorySelected, programSelectedId], () => {
      panelBarExpanded.value = [];
    });



    watch(() => userStore.showGlobalFiltersPanel, () => {
      globalFiltersDialogIsShowing.value = !globalFiltersDialogIsShowing.value;
    }, { deep: true, immediate: false })


    // Reset panel bar items when dialog visibility changes
    watch(globalFiltersDialogIsShowing, () => {
      panelBarItemsReset();
    });

    /**
     * If the selected program is changed invalidate the cached fields related to program:
     * - Model Payment Terms
     * - Financing Groups
     */
    watch(programSelectedId, () => {
      data.items = data.items.map((i) => {
        if (i.field !== "modelPaymentTerms" && i.field !== "financings") {
          return i;
        }

        return {
          ...i,
          itemData: null,
        };
      });
    });

    // Update titles when the applied filters change.
    watch(filtersApplied, () => {
      data.items = data.items.map((i) => {
        return {
          ...i,
          title: panelBarItemGetTitleFormatted({
            field: i.field,
            items: data.items,
          }),
        };
      });
    });

    // Reset filters to be applied when dialog is closed.
    watch(globalFiltersDialogIsShowing, () => {
      if (globalFiltersDialogIsShowing.value) {
        return;
      }

      filtersToBeAppliedSet(filtersApplied.value as FiltersApplied);
    });

    watch(globalFiltersSavedSelected, () => {
      // Save to DB the new Active Saved filter Template
      globalFiltersTemplatesActiveAPIUpdate();
    });

    watch(globalFiltersAppliedGroupedFormatted, () => {
      showCarousel(globalFiltersAppliedGroupedFormatted.value.length);
      data.currentIndex = 0;
      data.offset = 0;
    });

    watch(filtersAppliedFilters, () => {
      globalFiltersDialogCategorySelected.value = ArrayUtils.isEmpty(
        filtersAppliedFilters.value,
      )
        ? "all"
        : "active";
    });

    watch(
      globalFiltersTemplatesActive,
      () => {
        updateGlobalFiltersTemplatesActive();
      },
      { immediate: true },
    );

    // Active template
    watch(filtersApplied, () => {
      // Validate
      if (globalFiltersTemplatesActive.value === null) {
        return;
      }

      if (filtersApplied.value.filters.length !== 0) {
        return;
      }

      // Unset selected global filters template if no filters are applied
      globalFiltersTemplatesActive.value = null;
    });

    // *** END Global Filters Templates (II) ***

    // *** Filters to be applied (II) ***

    watch(filtersApplied, () => {
      // Only update filtersToBeApplied if the dialog is not showing (to avoid overwriting pending changes)
      if (!globalFiltersDialogIsShowing.value) {
        data.filtersToBeApplied.filters = ObjectUtils.cloneDeep(
          filtersApplied.value.filters,
        );
        data.filtersToBeApplied.logic = ObjectUtils.cloneDeep(
          filtersApplied.value.logic,
        );
      }
    });

    // *** END Filters to be applied (II) ***

    // *** GF Dialog ***

    watch(filtersApplied, () => {
      // Only close global filters dialog if user actually applies filters via the "Show Results" button
      // We need to check if the dialog is currently showing and if filters were actually applied
      if (
        globalFiltersDialogIsShowing.value &&
        filtersApplied.value.filters.length > 0
      ) {
        globalFiltersDialogIsShowing.value = false;
      }
    });

    /** END WATCH SECTION */

    /**
     * Finds and clicks on elements with class 'header-filter'
     */
    function clickHeaderFilter() {
      try {
        // Find all elements with class 'header-filter'
        const headerFilterElements =
          document.querySelectorAll(".header-filter");

        if (headerFilterElements.length === 0) {
          if (import.meta.env.DEV)
            console.log('** No elements with class "header-filter" found');
          return;
        }

        if (import.meta.env.DEV)
          console.log(
            `Found ${headerFilterElements.length} elements with class "header-filter"`,
          );

        // Click on each element found
        headerFilterElements.forEach((element, index) => {
          // Trigger click event
          if (element instanceof HTMLElement) {
            element.click();
          } else {
            // Fallback for non-HTMLElement elements
            const clickEvent = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: globalThis as unknown as Window,
            });
            element.dispatchEvent(clickEvent);
          }
        });

        if (import.meta.env.DEV)
          console.log("** Successfully clicked on all header-filter elements");
      } catch (error) {
        if (import.meta.env.DEV)
          console.error("** Error clicking on header-filter elements:", error);
      }
    }

    return {
      ...toRefs(data),
      ArrayUtils,
      globalFiltersBarRef,
      carouselWidth,
      categoriesFormatted,
      filterCategory: globalFiltersDialogCategoryOnClick,
      filtersApplied,
      filtersAppliedGetFormattedLevel,
      filtersAppliedGroupedFormatted: globalFiltersAppliedGroupedFormatted,
      filtersApply,
      filtersClearAll,
      filtersRemove,
      getButtonsGroupOptionsByField: panelBarItemButtonsGroupGetOptions,
      getClassesByLevel,
      getFieldName,
      globalFiltersAppliedFieldsCount,
      globalFiltersDialogCategorySelected,
      globalFiltersDialogIsShowing,
      globalFiltersFieldsGetLevels,
      globalFiltersRangeSliderSetMinMaxSelectedValues,
      globalFiltersRemoveFiltersFieldGroupSetTemplateAsDirty,
      globalFiltersSavedArray,
      globalFiltersTemplatesActive,
      globalFiltersTemplatesAPIDelete,
      globalFiltersTemplatesFiltersGrouped,
      globalFiltersTemplatesHandleChangeActive,
      globalFiltersTemplatesHandleClickSave,
      globalFiltersTemplatesHandleSaveOptionChange,
      globalFiltersTemplatesShowSaveModal,
      globalFiltersTemplatesTitles,
      globalFiltersToBeAppliedIsFieldInFiltersToBeApplied,
      globalFiltersToBeAppliedRemoveFiltersGroupByField,
      nextSlide,
      panelBarExpanded,
      panelBarItemOnSelect,
      panelBarItemRadioItemSetChecked,
      panelBarItemSetIsAllItemsChecked,
      panelBarItemSetLevelSelected,
      panelBarItemsFormatted,
      panelBarItemsMCheckboxesItemSetChecked,
      panelBarItemsTreeViewSetCheckedItems,
      panelBarKey,
      panelBarSlotFieldNames,
      prevSlide,
      setIsModalConfirmFiltersClearAllShowing,
      StringUtils,
      toggleGlobalFiltersDialogVisibility,
      vCardEnabled,
      modulePlanIsAvailable
    };
  },
});
</script>

<style lang="scss">
/* !!! DO NOT USE 'SCOPED' !!! */
// ? - Use scoped styles
@import "src/resources/assets/styles/variables/colors";
@import "src/modules/globalFilters/globalFilterStyle.scss";
</style>
