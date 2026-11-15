import { ComputedRef, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import * as Routing from "@/services/router/Routing";

/**
 * Module Company Settings (aka Setup).
 */
const useModuleCompanySettings = () => {
  const router = useRouter();
  const userStore = useUserStore();

  /**
   * Holds if the user has access to the Settings module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleCompanySettingsIsAvailable: ComputedRef<boolean> = computed(
    () => {
      return userStore.isAdmin;
    }
  );

  /**
   * Holds if the user is in a route that belongs to the Settings module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleCompanySettingsIsActive: ComputedRef<boolean> = computed(() => {
    return router.currentRoute.value.name === Routing.home.homeCompanySettings;
  });

  /**
   * Navigates to the categorize section.
   *
   * @returns {void}
   */
  const moduleCompanySettingsOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('settings')
    Routing.home.openHomeCompanySettings();
  }
    

  return {
    moduleCompanySettingsIsAvailable,
    moduleCompanySettingsIsActive,
    moduleCompanySettingsOpen
  };
};

export default useModuleCompanySettings;
