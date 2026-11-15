import { ComputedRef, computed } from "vue";
import { isNullOrUndefined } from "@/utils";
import { useRouter } from "vue-router";
import { UserRoles } from "@/types";
import { useUser } from "@/composables";
import * as Routing from "@/services/router/Routing";
import { useUserStore } from "@/stores/user";

/**
 * Module Program (aka Opportunity).
 */
const useModuleProgram = () => {
  const router = useRouter();
  const { user } = useUser();
  const userStore = useUserStore();

  /**
   * Checks if the module required role is present in the given array.
   *
   * @param {string[]} roles - The array of roles to check.
   * @return {boolean} Returns true if the role is present, otherwise false.
   */
  const moduleProgramIsInArray = (roles: UserRoles[]): boolean => {
    return roles.includes("MODULE_OPPORTUNITY");
  };

  /**
   * Holds if the user has access to the Program module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleProgramIsAvailable: ComputedRef<boolean> = computed(() => {
    // Validate
    if (isNullOrUndefined(user.value)) {
      if (import.meta.env.DEV) console.log("** (moduleProgramIsAvailable) Error: User is null or undefined")
      return false
    }
    
    return moduleProgramIsInArray(user.value.roles);
  });

  /**
   * Holds if the user is in a route that belongs to the Program module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleProgramIsActive: ComputedRef<boolean> = computed(() => {
    return (
      router.currentRoute.value.name ===
        Routing.home.analyze.homeAnalyzeProgramsPanel ||      
      router.currentRoute.value.name ===
        Routing.home.analyze.homeAnalyzeProgramOverview
    );
  });

  /**
   * Navigates to the categorize section.
   *
   * @returns {void}
   */
  const moduleProgramOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('opportunity')
    Routing.home.analyze.openHomeAnalyzeProgramsPanel();
  }

  return {
    moduleProgramIsActive,
    moduleProgramIsAvailable,
    moduleProgramIsInArray,
    moduleProgramOpen
  };
};

export default useModuleProgram;
