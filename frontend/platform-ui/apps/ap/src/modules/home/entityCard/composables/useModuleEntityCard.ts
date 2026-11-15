import { ArrayUtils, isNullOrUndefined } from "@/utils";
import { ComputedRef, computed } from "vue";
import { useRouter } from "vue-router";
import { useUser } from "@/composables";
import * as Routing from "@/services/router/Routing";
import { useUserStore } from "@/stores/user";

/**
 * Module Entity Card (aka Suppliers).
 */
const useModuleEntityCard = () => {
  const router = useRouter();
  const { user } = useUser();
  const userStore = useUserStore();

  /**
   * Checks if the module required role is present in the given array.
   *
   * @param {string[]} roles - The array of roles to check.
   * @return {boolean} Returns true if the role is present, otherwise false.
   */
  const moduleEntityCardIsInArray = (roles: string[]): boolean => {
    // Validate
    if (isNullOrUndefined(roles)) {
      return false;
    }

    if (ArrayUtils.isEmpty(roles)) {
      return false;
    }

    return roles.includes("MODULE_SUPPLIERS");
  };

  /**
   * Holds if the user has access to the Entity module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleEntityCardIsAvailable: ComputedRef<boolean> = computed(() => {
    // Validate
    if (isNullOrUndefined(user.value)) {
      return false;
    }

    return moduleEntityCardIsInArray(user.value.roles);
  });

  /**
   * Holds if the user is in a route that belongs to the Plan module.
   *
   * @type {ComputedRef<boolean>}
   */
  const moduleEntityCardIsActive: ComputedRef<boolean> = computed(() => {
    return (
      router.currentRoute.value.name === Routing.home.entityCard.entityCard ||
      router.currentRoute.value.name ===
        Routing.home.entityCard.entityCardOverview
    );
  });

  /**
   * Navigates to the categorize section.
   *
   * @returns {void}
   */
  const moduleEntityCardOpen = (): void =>{
    userStore.setLastSectionVisitedbyUser('suppliers')
    Routing.home.entityCard.openEntityCard();
  }
    

  return {
    moduleEntityCardIsAvailable,
    moduleEntityCardIsActive,
    moduleEntityCardOpen,
    moduleEntityCardIsInArray
  };
};

export default useModuleEntityCard;
