import { ComputedRef, computed } from "vue";
import { ArrayUtils, isNullOrUndefined } from "@/utils";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import * as Routing from "@/services/router/Routing";
/**
 * Module Manage
 */
const useModuleManage = () => {
  const router = useRouter();
  const userStore = useUserStore();

  /**
   * Checks if the module required role is present in the given array of roles.
   *
   * @param {string[]} roles - The array of roles to check.
   * @return {boolean} Returns true if the role is present, otherwise false.
   */
  const moduleManageIsInArray = (roles: string[]): boolean => {
    // Validate
    if (isNullOrUndefined(roles)) {
      return false;
    }

    if (ArrayUtils.isEmpty(roles)) {
      return false;
    }

    return roles.includes("MODULE_MANAGE");
  };

  /**
   * Holds if the user has access to the Manage module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleManageIsAvailable: ComputedRef<boolean> = computed(() => {
    // Validate
    if (isNullOrUndefined(userStore.getUser)) {
      return false;
    }

    return moduleManageIsInArray(userStore.getUser.roles);
  });

  /**
   * Holds if the user is in a route that belongs to the Manage module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleManageIsActive: ComputedRef<boolean> = computed(() => {
    return (
      router.currentRoute.value.name ===
      Routing.home.manageModule.homeManageModule
    );
  });

  /**
   * Navigates to the manage module section.
   *
   * @returns {void}
   */
  const moduleManageOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('manage')
    Routing.home.manageModule.openHomeManageModule();
  }
    

  return {
    moduleManageIsActive,
    moduleManageIsAvailable,
    moduleManageIsInArray,
    moduleManageOpen
  };
};

export default useModuleManage;
