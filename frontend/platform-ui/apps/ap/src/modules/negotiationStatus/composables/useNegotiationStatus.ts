import { WritableComputedRef, computed } from "vue";

import { NegotiationStatus } from "@/types";
import { StringUtils } from "@/utils";
import { useI18n } from "vue-i18n";
import { useNegotiationStatusStore } from "@/stores/negotiationStatus";

/**
 * Get status pills color classes
 *
 * @param {NegotiationStatus} status
 * @returns {string}
 */
function negotiationStatusGetPillColorClasses(
  status: NegotiationStatus | undefined | string
): string {
  // Validate
  if (status === undefined || status === null || status === "") {
    if (import.meta.env.DEV) console.log("** Error in negotiationStatusGetPillColorClasses: status is undefined")
    return ""
  }

  if (StringUtils.isEmpty(status)) {
    if (import.meta.env.DEV) console.log("** Error in negotiationStatusGetPillColorClasses: status is empty")
    return ""
  }

  const baseClasses = "font-medium text-white-0";

  switch (status) {
    case "analyzed":
      return `${baseClasses} bg-graycool-500`;

    case "onHold":
      return `${baseClasses} bg-warning-500`;

    case "planned":
      return `${baseClasses} bg-bluelight-500`;

    case "contacted":
      return `${baseClasses} bg-teal-500`;

    case "agreed":
      return `${baseClasses} bg-violet-200`;

    case "agreedExtended":
      return `${baseClasses} bg-violet-600`;

    default:
      if (import.meta.env.DEV) console.log("** Error in negotiationStatusGetPillColorClasses. Unknown status: ", status)
      return `${baseClasses} bg-gray-100`
  }
}

const useNegotiationStatus = () => {
  const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
  const negotiationStatusStore = useNegotiationStatusStore();

  const negotiationStatusTrackingNumber: WritableComputedRef<number> = computed(
    {
      get: () => negotiationStatusStore.getTrackingNumber(),
      set(newTrackingNumber: number) {
        negotiationStatusStore.setTrackingNumber(newTrackingNumber);
      }
    }
  );

  /**
   * Get status translated
   *
   * @param {NegotiationStatus} status
   * @returns {string}
   */
  function negotiationStatusGetStatusTranslated(
    status: NegotiationStatus | undefined | string
  ): string {
    // Validate
    if (status === undefined || status === null || status === "") {
      return "";
    }

    if (StringUtils.isEmpty(status)) {
      return "";
    }

    return translate.t(`global.negotiationStatusStatuses.${status}`);
  }

  /**
   * Get statuses translated. Also called "statusCodes".
   *
   * @param {string} statuses
   * @returns {string}
   */
  function negotiationStatusGetStatusesTranslated(statuses: string): string {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(statuses)) {
      return "";
    }

    return statuses
      .split(",")
      .map(i => {
        return translate.t(`global.negotiationStatusStatuses.${i}`);
      })
      .join(", ");
  }

  return {
    negotiationStatusGetPillColorClasses,
    negotiationStatusGetStatusesTranslated,
    negotiationStatusGetStatusTranslated,
    negotiationStatusTrackingNumber
  };
};

export default useNegotiationStatus;
