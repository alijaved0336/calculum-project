import { computed, ComputedRef } from "vue";

import { GlobalFiltersSaved } from "@/types";

// Utils
import { isNullOrUndefined } from "@/utils";

import { useUser } from "@/composables";

/**
 * Global Filters Saved  Composable
 */
const useGlobalFiltersSaved = () => {
  const { user } = useUser();

  const globalFiltersSavedSelected = computed(() => {
    return user.value?.selectedGlobalFiltersSaved ?? null;
  });

  /**
   * Get global filters templates for the current user
   */
  const globalFiltersSavedArray: ComputedRef<GlobalFiltersSaved[] | undefined> =
    computed(() => {
      return user.value?.globalFiltersSavedArray ?? [];
    });

  /**
   * Set active global filters template.
   * Save to store and to DB.
   *
   * @param template {GlobalFiltersSaved | null}
   */
  function globalFiltersSavedSetSelected(template: GlobalFiltersSaved | null) {
    if (isNullOrUndefined(user.value)) {
      return;
    }

    // Update global filters saved array in user
    user.value = {
      ...user.value,
      selectedGlobalFiltersSaved: template,
    };
  }

  return {
    globalFiltersSavedSelected,
    globalFiltersSavedArray,
    globalFiltersSavedSetSelected,
  };
};

export default useGlobalFiltersSaved;
