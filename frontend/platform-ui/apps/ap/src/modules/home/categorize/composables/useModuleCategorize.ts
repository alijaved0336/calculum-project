import { ComputedRef, computed } from "vue";
import { ArrayUtils, isNullOrUndefined } from "@/utils";
import { useRouter } from "vue-router";
import { UserRoles } from "@/types";
import { useUser } from "@/composables";
import * as Routing from "@/services/router/Routing";
import { useUserStore } from "@/stores/user";

/**
 * Module Categorize (aka Analyze).
 */
const useModuleCategorize = () => {
  const router = useRouter();
  const { user } = useUser();
  const userStore = useUserStore();

  /**
   * Checks if the module required role is present in the given array.
   *
   * @param {string[]} roles - The array of roles to check.
   * @return {boolean} Returns true if the role is present, otherwise false.
   */
  const moduleCategorizeIsInArray = (roles: UserRoles[]): boolean => {
    // Validate
    if (isNullOrUndefined(roles)) {
      return false;
    }

    if (ArrayUtils.isEmpty(roles)) {
      return false;
    }

    return roles.includes("MODULE_ANALYZE");
  };

  /**
   * Holds if the user has access to the Analyze module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleCategorizeIsAvailable: ComputedRef<boolean> = computed(() => {
    // Validate
    if (isNullOrUndefined(user.value)) {
      if (import.meta.env.DEV) console.log("** (moduleAnalyzeIsAvailable) Error: User is null or undefined")
      return false
    }

    if (isNullOrUndefined(user.value.roles)) {
      if (import.meta.env.DEV) console.log("** (moduleAnalyzeIsAvailable) Error: User.roles is null or undefined")
      return false
    }

    return moduleCategorizeIsInArray(user.value.roles);
  });

  /**
   * Holds if the user is in a route that belongs to the Analyze module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleCategorizeIsActive: ComputedRef<boolean> = computed(() => {
    return router.currentRoute.value.name === Routing.home.homeCategorize;
  });

  /**
   * Navigates to the categorize section.
   *
   * @returns {void}
   */
  const moduleCategorizeOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('analyze')
    Routing.home.categorize.openHomeCategorize();
  };

  return {
    moduleCategorizeIsActive,
    moduleCategorizeIsAvailable,
    moduleCategorizeIsInArray,
    moduleCategorizeOpen
  };
};

export default useModuleCategorize;
