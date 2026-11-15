import { ArrayUtils, isNullOrUndefined } from "@/utils";
import { ComputedRef, computed } from "vue";
import { useRouter } from "vue-router";
import { UserRoles } from "@/types";
import { useUserStore } from "@/stores/user";
import * as Routing from "@/services/router/Routing";
/**
 * Module Compare
 */
const useModuleCompare = () => {
  const router = useRouter();
  const userStore = useUserStore();

  /**
   * Checks if the module required role is present in the given array.
   *
   * @param {string[]} roles - The array of roles to check.
   * @return {boolean} Returns true if the role is present, otherwise false.
   */
  const moduleCompareIsInArray = (roles: UserRoles[]): boolean => {
    // Validate
    if (isNullOrUndefined(roles)) {
      return false;
    }

    if (ArrayUtils.isEmpty(roles)) {
      return false;
    }

    return roles.includes("MODULE_COMPARE");
  };

  /**
   * Holds if the user has access to the Compare module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleCompareIsAvailable: ComputedRef<boolean> = computed(() => {
    // Validate
    if (isNullOrUndefined(userStore.getUser)) {
      return false;
    }

    return moduleCompareIsInArray(userStore.getUser.roles);
  });

  /**
   * Holds if the user is in a route that belongs to the Compare module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleCompareIsActive: ComputedRef<boolean> = computed(() => {
    return (
      router.currentRoute.value.name === Routing.home.compare.homeCompare ||
      router.currentRoute.value.name === Routing.home.homeCompareBar ||
      router.currentRoute.value.name === Routing.home.homeCompareLine ||
      router.currentRoute.value.name === Routing.home.homeComparePotential
    );
  });

  /**
   * Navigates to the section.
   *
   * @returns {void}
   */
  const moduleCompareOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('compare')
    Routing.home.compare.openHomeCompare();
  }

  return {
    moduleCompareIsActive,
    moduleCompareIsAvailable,
    moduleCompareIsInArray,
    moduleCompareOpen
  };
};

export default useModuleCompare;
