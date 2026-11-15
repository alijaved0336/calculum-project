import { useUser } from "@/composables";
import { computed, ComputedRef } from "vue";

/**
 * Feature Email Negotiations
 */
const useEmailNegotiations = () => {
  const { userSessionRoles } = useUser();

  /**
   * Holds if the user has access to the Email Negotiations feature.
   *
   * @param roles {UserRoles}
   * @returns {boolean}
   */
  const featureIsAvailable: ComputedRef<boolean> = computed(() => {
    const featureIsAvailable = userSessionRoles.value.includes(
      "FEATURE_EMAIL_NEGOTIATIONS"
    );

    return featureIsAvailable;
  });

  return {
    featureIsAvailable
  };
};

export default useEmailNegotiations;
