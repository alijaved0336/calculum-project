import { ArrayUtils, isNullOrUndefined } from "@/utils";
import { ComputedRef, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import * as Routing from "@/services/router/Routing";
/**
 * Module Overview (aka Match)
 */
const useModuleOverview = () => {
  const router = useRouter();
  const userStore = useUserStore();

  /**
   * Checks if the module overview required role is present in the given array of roles.
   *
   * @param {string[]} roles - The array of roles to check.
   * @return {boolean} Returns true if the role is present, otherwise false.
   */
  const moduleOverviewIsInArray = (roles: string[]): boolean => {
    // Validate
    if (isNullOrUndefined(roles)) {
      return false;
    }

    if (ArrayUtils.isEmpty(roles)) {
      return false;
    }

    return roles.includes("MODULE_MATCH");
  };

  /**
   * Holds if the user has access to the Entity module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleOverviewIsAvailable: ComputedRef<boolean> = computed(() => {
    // Validate
    if (isNullOrUndefined(userStore.getUser)) {
      return false;
    }

    if (!moduleOverviewIsInArray(userStore.getUser.roles)) {
      return false;
    }

    return true;
  });

  /**
   * Holds if the user is in a route that belongs to the Plan module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleOverviewIsActive: ComputedRef<boolean> = computed(() => {
    return (
      router.currentRoute.value.name === Routing.home.overview.homeOverview ||
      router.currentRoute.value.name === Routing.home.homeOverviewLine
    );
  });

  /**
   * Navigates to the categorize section.
   *
   * @returns {void}
   */
  const moduleOverviewOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('match')
    Routing.home.overview.openHomeOverview();
  }
    

  return {
    moduleOverviewIsActive,
    moduleOverviewIsAvailable,
    moduleOverviewIsInArray,
    moduleOverviewOpen
  };
};

export default useModuleOverview;
