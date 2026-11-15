import { ComputedRef, WritableComputedRef, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";

import { ArrayUtils, isNullOrUndefined, ObjectUtils, StringUtils } from "@/utils";
import { groupFiltersByField } from "@/utils/globalFiltersUtils";
import { useUser } from "@/composables";
import { useUserStore } from "@/stores/user";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import useGlobalFiltersSaved from "@/modules/globalFilters/composables/useGlobalFiltersSaved";
import type { RadioButtonChangeEvent } from "@progress/kendo-vue-inputs";
import type { Data } from "@/modules/globalFilters/types";
import type {
  Field,
  FiltersApplied,
  FiltersAppliedFieldLevel,
  FiltersGrouped,
  GlobalFiltersTemplate,
  KeyLabel,
  UserSession,
} from "@/types";
import { TARGET_VIEW_SPENDS } from "@/types";

interface UseGlobalFiltersTemplatesOptions {
  /** The shell's whole `data` reactive object, mutated in place (same pattern as
   * useEntityPrograms.ts from the EntityCardOverview refactor). */
  data: Data;
  filtersApplied: ComputedRef<FiltersApplied | { logic: string; filters: never[] }>;
  filtersAppliedFilters: ComputedRef<FiltersAppliedFieldLevel[]>;
  getCustomFieldName: (field: Field) => string;
  filtersClearAll: () => void;
  toggleGlobalFiltersDialogVisibility: () => void;
  /** Bound to `showCarousel(globalFiltersAppliedGroupedFormatted.value.length)` in the shell. */
  showCarouselForAppliedFilters: () => void;
}

/**
 * Owns saved-templates CRUD (create/update/delete/change-active) and the active-template
 * computed. Extracted verbatim from MainLayoutFilters.vue's "Global Filters Templates" +
 * "Global Filters Templates (II)" blocks - see
 * docs/context/change-mainlayoutfilters-refactor.md for the extraction notes, including which
 * parts of those two (loosely-marked, mixed-concern) blocks stayed in the shell.
 */
const useGlobalFiltersTemplates = (options: UseGlobalFiltersTemplatesOptions) => {
  const {
    data,
    filtersApplied,
    filtersAppliedFilters,
    getCustomFieldName,
    filtersClearAll,
    toggleGlobalFiltersDialogVisibility,
    showCarouselForAppliedFilters,
  } = options;

  const { user, userIri } = useUser();
  const userStore = useUserStore();
  const globalFiltersStore = useGlobalFiltersStore();
  const toast = useToast();
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });

  const {
    globalFiltersSavedArray,
    globalFiltersSavedSelected,
    globalFiltersSavedSetSelected,
  } = useGlobalFiltersSaved();

  /**
   * Active global filters template
   */
  const globalFiltersTemplatesActive: WritableComputedRef<GlobalFiltersTemplate | null> =
    computed({
      get: () => user.value?.selectedGlobalFiltersSaved ?? null,
      set(template: GlobalFiltersTemplate | null) {
        globalFiltersSavedSetSelected(template);
      },
    });

  /**
   * Get global filters templates for the current user
   */
  const globalFiltersTemplatesTitles = computed(() => {
    // Validate
    if (isNullOrUndefined(globalFiltersSavedArray.value)) {
      return [];
    }

    const titles: KeyLabel[] = globalFiltersSavedArray.value.map((item) => {
      return {
        key: item["@id"],
        label: item.title,
      };
    });

    return titles;
  });

  /** Get human-readable label for a filter group field (e.g. modelCashFlow -> "Model Cash Flow"). */
  function getTemplateGroupFieldLabel(g: FiltersGrouped): string {
    switch (g.field) {
      case "modelCashFlow":
        return translate.t("global.globalFilters.modelCashFlow");
      case "modelPaymentTerms":
        return translate.t("global.globalFilters.modelPaymentTerms");
      default:
        if (g.field.includes("vcardGroup")) return "Vcard Groups";
        if (g.field.includes("customDataPoint"))
          return g.fieldLabel ?? getCustomFieldName(g.field);
        if (g.field.includes("isSME")) return "SME";
        if (g.field.includes("isVCardApplied ")) return "Vcard";
        return StringUtils.transformFromCamelCaseToReadable(g.field);
    }
  }

  /** Format grouped filters with field labels, level labels, and joined value strings. */
  function formatTemplateFiltersGrouped(
    groupedFilters: FiltersGrouped[],
  ): FiltersGrouped[] {
    const result: FiltersGrouped[] = [];
    for (const g of groupedFilters) {
      if (g.field === undefined || g.value === undefined) continue;
      const fieldFormatted = getTemplateGroupFieldLabel(g);
      let levelFormatted = "";
      if (g.level != null && !StringUtils.isEmpty(g.level)) {
        levelFormatted = g.level === TARGET_VIEW_SPENDS ? "spend line" : g.level;
      }
      if (g.value.length === 0) continue;
      const valueLabel = g.value.length === 1 ? g.value[0] : g.value.join(", ");
      result.push({
        field: g.field,
        fieldLabel: fieldFormatted,
        level: g.level,
        levelLabel: levelFormatted,
        value: g.value,
        valueLabel: valueLabel,
      });
    }
    return result;
  }

  /**
   * Group filters by field (category)
   * e.g.: "companySize": "small, medium"
   */
  const globalFiltersTemplatesFiltersGrouped = computed(() => {
    if (ArrayUtils.isEmpty(globalFiltersSavedArray.value)) return [];

    const result: { title: string; id: string; filters: FiltersGrouped[] }[] = [];

    for (const template of globalFiltersSavedArray.value!) {
      if (isNullOrUndefined(template.filters)) continue;
      if (ArrayUtils.isEmpty(template.filters.filters)) continue;

      const groupedFilters = groupFiltersByField(template.filters.filters);
      const formatted = formatTemplateFiltersGrouped(groupedFilters);
      result.push({
        title: template.title,
        filters: formatted,
        id: template["@id"],
      });
    }
    return result;
  });

  /**
   * Show global filters templates save modal
   */
  function globalFiltersTemplatesShowSaveModal() {
    // Validate. No changes to be saved
    if (
      !(
        data.globalFiltersTemplatesActiveIsDirty ||
        isNullOrUndefined(globalFiltersTemplatesActive.value) ||
        StringUtils.isEmpty(globalFiltersTemplatesActive.value?.title) ||
        StringUtils.isEmpty(globalFiltersTemplatesActive.value?.["@id"])
      )
    ) {
      return;
    }

    // Show modal
    data.globalFiltersTemplatesIsModalSaveShowing = true;
  }

  /**
   * Handle save option change in global filters templates dialog
   */
  function globalFiltersTemplatesHandleSaveOptionChange(e: RadioButtonChangeEvent) {
    const value = e.value;

    // Validate
    if (value !== "new" && value !== "update") {
      return;
    }

    data.globalFiltersTemplatesSaveOptionSelected = value;
  }

  /** Company id required by templatesAPICreate - "" for a guest user, else the active company's IRI. */
  function resolveTemplateCreateCompanyId(): string | null {
    if (user.value === null) {
      return "";
    }
    return user.value.activeCompany ? user.value.activeCompany["@id"] : null;
  }

  /** callbackSuccess for templatesAPICreate: adds the new template to the user session and resets the save modal. */
  function onTemplateCreateSuccess(callbackSuccessData: GlobalFiltersTemplate) {
    const userVal = user.value;
    if (userVal === null) return;

    // Update global filters templates in user
    const u: UserSession = ObjectUtils.cloneDeep(userVal);

    if (import.meta.env.DEV)
      console.log("Update global filters templates in user", u);

    u.globalFiltersSavedArray = u.globalFiltersSavedArray ?? [];

    // Add created template to list
    u.globalFiltersSavedArray.push(callbackSuccessData);

    // Save to store
    userStore.setActualUser(u);

    // Set created template as active
    globalFiltersTemplatesActive.value = callbackSuccessData;

    // There is no changes to apply
    data.globalFiltersTemplatesActiveIsDirty = false;

    // Clear new template name
    data.filtersTemplatesNewTemplateName = "";

    // Set save option to update
    data.globalFiltersTemplatesSaveOptionSelected = "update";

    // Close global filters dialog if visible
    data.globalFiltersTemplatesIsModalSaveShowing = false;

    // Disable loading
    data.loadFilterData = false;

    showCarouselForAppliedFilters();
  }

  /**
   * Save new filters template
   */
  function templatesAPICreate() {
    // Validate
    // There should be at least one filter applied
    if (ArrayUtils.isEmpty(filtersAppliedFilters.value)) {
      return;
    }

    // Company id is required
    const companyId = resolveTemplateCreateCompanyId();

    if (isNullOrUndefined(companyId)) {
      return;
    }

    // Template name is required
    const title = data.filtersTemplatesNewTemplateName;

    if (StringUtils.isEmpty(title)) {
      return;
    }

    // Filters is required
    const filters = filtersApplied.value;

    if (isNullOrUndefined(filters)) {
      return;
    }

    // Filters template name is required
    if (StringUtils.isEmpty(data.filtersTemplatesNewTemplateName)) {
      toast.error(translate.t("globalFilters.errorTemplateNameRequired"));

      return;
    }

    // Enable loading
    data.loadFilterData = true;

    const params = {
      userId: user.value === null ? null : userIri.value,
      companyId,
      title,
      filters: filters as FiltersApplied,
      callbackSuccess: onTemplateCreateSuccess,
      callbackError: () => {
        toast.error(translate.t("globalFilters.errorTemplateSave"));

        // Disable loading
        data.loadFilterData = false;
      },
    };
    globalFiltersStore.templatesAPICreate(params);
  }

  /** callbackSuccess for templatesAPIUpdate: replaces the template in the user session and resets the save modal. */
  function onTemplateUpdateSuccess(callbackSuccessData: GlobalFiltersTemplate) {
    const userVal = user.value;
    if (userVal === null) return;

    // Get a copy of user
    const u: UserSession = ObjectUtils.cloneDeep(userVal);

    // Search template in user and update it
    u.globalFiltersSavedArray = u.globalFiltersSavedArray.map(
      (template: GlobalFiltersTemplate) => {
        if (template["@id"] === callbackSuccessData["@id"]) {
          return callbackSuccessData;
        }
        return template;
      },
    );

    // update the user object
    userStore.setActualUser(u);

    // Set updated template as active
    globalFiltersTemplatesActive.value = callbackSuccessData;

    // Clean changes tracker
    // There is no changes to apply
    data.globalFiltersTemplatesActiveIsDirty = false;

    // Modal - Clear new template name
    data.filtersTemplatesNewTemplateName = "";

    // Modal - Set save option to update
    data.globalFiltersTemplatesSaveOptionSelected = "update";

    // Modal - Close global filters dialog if visible
    data.globalFiltersTemplatesIsModalSaveShowing = false;

    // Disable loading
    data.loadFilterData = false;
  }

  /**
   * Update global filters template PATCH
   */
  function templatesAPIUpdate() {
    // There should be at least one filter applied
    if (ArrayUtils.isEmpty(filtersAppliedFilters.value)) {
      return;
    }

    // Active template id is required
    if (isNullOrUndefined(globalFiltersTemplatesActive.value)) {
      return;
    }

    const templateId = globalFiltersTemplatesActive.value!["@id"];

    if (StringUtils.isEmpty(templateId)) {
      toast.error(translate.t("globalFilters.errorTemplateNotSelected"));

      return;
    }

    // Enable loading
    data.loadFilterData = true;

    const params = {
      id: StringUtils.removeIRI(globalFiltersTemplatesActive.value!["@id"]),
      filters: ObjectUtils.cloneDeep(filtersApplied.value) as FiltersApplied,
      callbackSuccess: onTemplateUpdateSuccess,
      callbackError: () => {
        toast.error(translate.t("globalFilters.errorTemplateSave"));

        // Disable loading
        data.loadFilterData = false;
      },
    };
    globalFiltersStore.templatesAPIUpdate(params);
  }

  /**
   * Handle click save
   */
  function globalFiltersTemplatesHandleClickSave() {
    data.globalFiltersTemplatesIsModalSaveShowing = false;

    // If there is an active template
    if (
      !isNullOrUndefined(globalFiltersTemplatesActive.value) &&
      data.globalFiltersTemplatesSaveOptionSelected === "update"
    ) {
      // Update global filters template
      templatesAPIUpdate();
    }

    // There is no active template
    else {
      // Validate
      if (isNullOrUndefined(globalFiltersSavedArray.value)) {
        return;
      }

      // Validate if a template with same name already exists
      if (
        !StringUtils.isEmpty(data.filtersTemplatesNewTemplateName) &&
        globalFiltersSavedArray.value!.some(
          (t) => t.title === data.filtersTemplatesNewTemplateName,
        )
      ) {
        toast.error(translate.t("globalFilters.errorTemplateNameExists"));

        return;
      }

      // Create new global filters template
      templatesAPICreate();
    }
  }

  /**
   * Update active template selection in backend (PATCH).
   * Called when user selects/deselects a template from dropdown.
   */
  function globalFiltersTemplatesActiveAPIUpdate() {
    let id: string | null = null;

    // Parse template id
    if (!isNullOrUndefined(globalFiltersTemplatesActive.value)) {
      id = StringUtils.removeIRI(globalFiltersTemplatesActive.value!["@id"]);
    }

    // Enable loading
    data.loadFilterData = true;

    const params = {
      id,
      callbackSuccess: () => {
        // Active template was unset
        if (isNullOrUndefined(id)) {
          toast.success(translate.t("globalFilters.successTemplateChangeActiveUnset"));
        }

        // Active template was set
        else {
          toast.success(translate.t("globalFilters.successTemplateChangeActive"));
        }

        // Disable loading
        data.loadFilterData = false;
      },
      callbackError: () => {
        toast.error(translate.t("globalFilters.errorTemplateSave"));

        // Disable loading
        data.loadFilterData = false;
      },
    };
    globalFiltersStore.globalFiltersTemplatesActiveAPIUpdate(params);
  }

  /**
   * Resolve which saved template id the DELETE call should target given the requested
   * `id_template`, unsetting the active template (and clearing applied filters) first if the
   * template being deleted is the active one - or if it's the only template left, regardless.
   */
  function resolveTemplateIdToDelete(id_template: string): string {
    let templateId = "";

    // If there's only one template, unset active template if set
    if (globalFiltersSavedArray.value!.length === 1) {
      templateId = globalFiltersSavedArray.value![0]["@id"];

      // If the only available template is the active one
      if (
        globalFiltersTemplatesActive.value !== null &&
        templateId === globalFiltersTemplatesActive.value!["@id"]
      ) {
        // Unset it and save to store
        globalFiltersTemplatesActive.value = null;
      }

      filtersClearAll();
    }

    // If there are many
    else {
      globalFiltersSavedArray.value!.forEach((template: GlobalFiltersTemplate) => {
        // Go next
        if (template["@id"] !== id_template) {
          return;
        }

        // Found
        templateId = template["@id"];
      });

      // If the found template is the active one
      if (
        !isNullOrUndefined(globalFiltersTemplatesActive.value) &&
        templateId === globalFiltersTemplatesActive.value!["@id"]
      ) {
        // Unset it and save to store and to DB
        globalFiltersTemplatesActive.value = null;

        filtersClearAll();
      }
    }

    return templateId;
  }

  /** callbackSuccess for templatesAPIDelete: removes the deleted template from the user session. */
  function onTemplateDeleteSuccess(templateId: string) {
    toast.success(translate.t("globalFilters.successTemplateDelete"));

    const userVal = user.value;
    if (userVal === null) return;

    // Remove template from user session
    const u: UserSession = ObjectUtils.cloneDeep(userVal);

    u.globalFiltersSavedArray = u.globalFiltersSavedArray.filter(
      (template: GlobalFiltersTemplate) => template["@id"] !== templateId,
    );

    // Save updated user to store
    userStore.setActualUser(u);

    // Disable loading
    data.loadFilterData = false;
  }

  /**
   * Delete a saved template (DELETE).
   * Clears applied filters if deleting the only template.
   */
  function globalFiltersTemplatesAPIDelete(id_template: string) {
    // Validate

    // Template title is required
    // There should be at least one template available

    if (
      StringUtils.isEmpty(id_template) ||
      isNullOrUndefined(globalFiltersSavedArray.value) ||
      ArrayUtils.isEmpty(globalFiltersSavedArray.value)
    ) {
      toast.error(translate.t("globalFilters.errorTemplateDeleteInvalid"));
      return;
    }

    const templateId = resolveTemplateIdToDelete(id_template);

    // Validate
    if (StringUtils.isEmpty(templateId)) {
      toast.error(translate.t("globalFilters.errorTemplateDelete"));

      return;
    }

    // Enable loading
    data.loadFilterData = true;

    const params = {
      id: StringUtils.removeIRI(templateId),
      callbackSuccess: () => onTemplateDeleteSuccess(templateId),
      callbackError: () => {
        toast.error(translate.t("globalFilters.errorTemplateDelete"));
        // Disable loading
        data.loadFilterData = false;
      },
    };
    globalFiltersStore.templatesAPIDelete(params);
  }

  /** Extract selected template ID from event (select change) or from explicit templateId param. */
  function getSelectedTemplateIdFromPayload(
    payload: Event | null,
    templateId: string,
  ): string | null {
    if (payload) {
      const target = (payload.target as HTMLSelectElement) ?? null;
      if (isNullOrUndefined(target)) {
        if (import.meta.env.DEV)
          console.error(
            "** Error in globalFiltersTemplatesHandleChangeActive: target is undefined",
          );
        return null;
      }
      return target.value;
    }
    if (isNullOrUndefined(templateId)) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in globalFiltersTemplatesHandleChangeActive: template_id is undefined",
        );
      return null;
    }
    return templateId;
  }

  /**
   * Update global applied filters when active template changes
   *
   * @param payload {Event}
   */
  function globalFiltersTemplatesHandleChangeActive(
    payload: Event | null,
    template_id: string = "",
  ) {
    const selectedOptionValue = getSelectedTemplateIdFromPayload(payload, template_id);
    if (selectedOptionValue === null) return;

    if (isNullOrUndefined(globalFiltersSavedArray.value)) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in globalFiltersTemplatesHandleChangeActive: globalFiltersSaved.value is undefined",
        );
      return;
    }

    const isAlreadyActive =
      globalFiltersTemplatesActive.value !== null &&
      globalFiltersTemplatesActive.value!["@id"] === selectedOptionValue;
    if (isAlreadyActive) {
      if (import.meta.env.DEV)
        console.error(
          "** Error in globalFiltersTemplatesHandleChangeActive: the selected template is already active",
        );
      toggleGlobalFiltersDialogVisibility();
      return;
    }

    if (selectedOptionValue === "") {
      filtersClearAll();
      return;
    }

    const template = globalFiltersSavedArray.value!.find(
      (t) => t["@id"] === selectedOptionValue,
    );
    if (template) globalFiltersTemplatesActive.value = template;
  }

  /** Sync applied filters + filtersToBeApplied from the newly-active template. */
  function updateGlobalFiltersTemplatesActive() {
    // Validate
    if (globalFiltersTemplatesActive.value === null) {
      return;
    }

    // Search for active template
    globalFiltersSavedArray.value!.forEach((template) => {
      if (template.title !== globalFiltersTemplatesActive.value?.title) {
        return;
      }

      // Found

      // Set applied filters
      globalFiltersStore.setFiltersApplied(ObjectUtils.cloneDeep(template.filters));

      // Set filters to be applied
      data.filtersToBeApplied.filters = ObjectUtils.cloneDeep(
        filtersAppliedFilters.value,
      );

      data.globalFiltersTemplatesActiveIsDirty = false;
    });
  }

  return {
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
  };
};

export default useGlobalFiltersTemplates;
