import { ComputedRef, computed } from "vue";
import { ArrayUtils, isNullOrUndefined } from "@/utils";
import { useRouter } from "vue-router";
import { useUser } from "@/composables";
import * as Routing from "@/services/router/Routing";
import { useUserStore } from "@/stores/user";
/**
 * Module Plan
 */
const useModulePlan = () => {
  const router = useRouter();
  const { user } = useUser();
  const userStore = useUserStore();

  /**
   * Checks if the module required role is present in the given array of roles.
   *
   * @param {string[]} roles - The array of roles to check.
   * @return {boolean} Returns true if the role is present, otherwise false.
   */
  const modulePlanIsInArray = (roles: string[]): boolean => {
    // Validate
    if (isNullOrUndefined(roles)) {
      return false;
    }

    if (ArrayUtils.isEmpty(roles)) {
      return false;
    }

    return roles.includes("MODULE_PLAN");
  };

  /**
   * Holds if the user has access to the Plan module.
   *
   * @type {ComputedRef<boolean>}
   */
  const modulePlanIsAvailable: ComputedRef<boolean> = computed(() => {
    // ? - Plan availability was tied to analyze availability

    // Validate
    if (isNullOrUndefined(user.value)) {
      if (import.meta.env.DEV) console.log("** (modulePlanIsAvailable) Error: User is null or undefined")
      return false
    }

    return modulePlanIsInArray(user.value.roles);
  });

  /**
   * Holds if the user is in a route that belongs to the Plan module.
   *
   * @type {ComputedRef<boolean>}
   */
  const modulePlanIsActive: ComputedRef<boolean> = computed(() => {
    return (      
      router.currentRoute.value.name === Routing.home.plan.homePlanAllPlans ||
      router.currentRoute.value.name ===
        Routing.home.analyze.homeAnalyzeProgramToPlan1 ||
      router.currentRoute.value.name === Routing.home.plan.homeHomePlanV2
    );
  });

  /**
   * Navigates to the categorize section.
   *
   * @returns {void}
   */
  const modulePlanOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('plan')
    Routing.home.plan.openHomePlanAllPlans();
  }

  return {
    modulePlanIsActive,
    modulePlanIsAvailable,
    modulePlanIsInArray,
    modulePlanOpen
  };
};

export default useModulePlan;
