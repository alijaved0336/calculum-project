import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useUser } from "@/composables";

/**
 * Literal returned by `useUser().getPilotTimeExpire()` (via the internal
 * `pilotStatus()` helper in `services/user/composables/useUser.ts`) once a
 * pilot account's trial window has elapsed. Extracted here so the two
 * places that compared against it don't each hardcode the same string.
 */
export const PILOT_EXPIRED_LABEL = "Pilot Expired: Upgrade for Full Access";

/**
 * Pilot-account gating for the navbar: whether the current pilot's trial
 * has expired (and should disable most of the navbar), the human-readable
 * time-limit label to show, and whether a pilot account is in use at all.
 *
 * Extracted verbatim from `HomeNavbar.vue` (US-2, Sprint 116 refactor) —
 * behavior-preserving, no logic change.
 */
const usePilotAccount = () => {
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
  const { isPilotAccount, getPilotTimeExpire, userIsSuperAdmin } = useUser();

  const isPilotCompanyBeingUsed = computed(() => {
    return isPilotAccount();
  });

  const disableElementPilotIsExpired = computed(() => {
    if (isPilotAccount()) {
      if (userIsSuperAdmin.value) {
        return false;
      }
      const timeLimitValue = getPilotTimeExpire();
      return timeLimitValue === PILOT_EXPIRED_LABEL;
    }

    return false;
  });

  /**
   * returns the pilot account's limit value
   */
  const getLimitTime = computed(() => {
    const timeLimitValue = getPilotTimeExpire();
    return timeLimitValue === PILOT_EXPIRED_LABEL
      ? translate.t("global.pilotExpired")
      : timeLimitValue;
  });

  return {
    disableElementPilotIsExpired,
    getLimitTime,
    isPilotCompanyBeingUsed,
  };
};

export default usePilotAccount;
