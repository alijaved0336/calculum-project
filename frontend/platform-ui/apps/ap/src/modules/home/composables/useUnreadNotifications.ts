import { computed, watch } from "vue";
import { removeIRI } from "@/utils";
import { useUser } from "@/composables";
import { useNotificationsStore } from "@/stores/notifications";
import { NotificationType } from "@/modules/home/HomeTypes";
import { NOTIFICATIONS_ITEMS_PER_PAGE } from "@/modules/home/constants";
import {
  getDisplayContentFromNotification,
  getPreviewTextFromContent,
  isDisplayContentArray,
  contentToNormalizedSegments,
  contentHasHighlightSpans as contentHasHighlightSpansCheck,
  sanitizeMentionContent,
  segmentsTruncateToLength,
} from "@/utils/ContentEditableUtils";
import { HomeNavBar } from "@/modules/home/types";

// Notification display content: use shared utils (commentContent ?? comment_content ?? message).
// Module-scope, not inside the composable — these are pure functions of their `notification`
// argument with no closure dependency on composable state, so keeping them inside would just
// recreate 7 function objects on every useUnreadNotifications() call for no benefit.
function getNotificationDisplayContent(notification: any) {
  return getDisplayContentFromNotification(notification);
}

function getNotificationPreviewText(notification: any, maxLen: number = 50): string {
  return getPreviewTextFromContent(getDisplayContentFromNotification(notification), maxLen);
}

function getNotificationContentIsArray(notification: any): boolean {
  return isDisplayContentArray(getDisplayContentFromNotification(notification));
}

function getNotificationContentSegments(notification: any) {
  return contentToNormalizedSegments(getDisplayContentFromNotification(notification));
}

function getNotificationContentHasHighlightSpans(notification: any): boolean {
  const content = getDisplayContentFromNotification(notification);
  return typeof content === "string" && contentHasHighlightSpansCheck(content);
}

function getNotificationSanitizedContentHtml(notification: any): string {
  const content = getDisplayContentFromNotification(notification);
  return typeof content === "string" ? sanitizeMentionContent(content) : "";
}

function getNotificationContentSegmentsPreview(notification: any, maxLen: number = 50) {
  return segmentsTruncateToLength(
    contentToNormalizedSegments(getDisplayContentFromNotification(notification)),
    maxLen,
  );
}

/**
 * Unread-notifications panel: fetching, pagination, mark-as-read/delete,
 * and the local<->store unread-count sync. Extracted verbatim from
 * HomeNavbar.vue (US-2, Sprint 116 refactor) — behavior-preserving, no
 * logic change, including the 3-write-site count sync (kept as-is; making
 * the store the single source of truth is a follow-up, not part of this
 * extraction).
 *
 * `data` is the same shared `HomeNavBar` reactive object HomeNavbar.vue
 * still owns; this composable only reads/writes its notifications slice.
 * `getSpendFileVersionActiveId` is a getter rather than a Ref because the
 * spend-file switcher (which owns that ref) is constructed later in
 * HomeNavbar.vue's setup() — see the "bridge"/getter wiring note in
 * docs/context/change-homenavbar-refactor.md.
 */
const useUnreadNotifications = (
  data: HomeNavBar,
  getSpendFileVersionActiveId: () => string,
) => {
  const { userId, userIri } = useUser();
  const notificationsStore = useNotificationsStore();

  function getNotificationAmount(typeOfNotification?: string) {
    const params = {
      userId: userId.value,
      typeOfNotification: typeOfNotification,
      spendFileVersionUuid: removeIRI(getSpendFileVersionActiveId()),
      callbackSuccess: (callbackSuccessData: any) => {
        if (typeOfNotification === "notes") {
          data.notificationAmountNotes = callbackSuccessData;
        } else {
          data.notificationAmountOther = callbackSuccessData;
        }
      },
      callbackError: () => {
        data.loading = false;
      },
    };

    notificationsStore.getNotificationAmount(params);
  }

  const dataNotificationMessages = computed(() => {
    let otherNotification = notificationsStore.getMessages;

    if (!otherNotification || otherNotification.length === 0) {
      return [];
    }

    // Combine the two arrays
    let combinedNotifications = [...otherNotification];

    // Sort the combined array by the 'created' date in descending order
    combinedNotifications.sort((a, b) => {
      const dateA = new Date(a.created);
      const dateB = new Date(b.created);

      // Compare the dates in descending order
      return dateB.getTime() - dateA.getTime();
    });

    return combinedNotifications;
  });

  const existMessagesPendingToRead = computed(() => {
    return data.totalUnreadNotificationsCount > 0;
  });

  const totalUnreadNotifications = computed(() => {
    return data.totalUnreadNotificationsCount;
  });

  const notificationsLastMessagesPendingRead = computed(() =>
    dataNotificationMessages?.value?.filter((item: any) => !item.read),
  );

  // Watch the store's total unread count and sync with local count
  watch(
    () => {
      if (notificationsStore.getTotalUnreadCount !== undefined) {
        return notificationsStore.getTotalUnreadCount;
      }
      return 0;
    },
    (newCount) => {
      data.totalUnreadNotificationsCount = newCount;
    },
    { immediate: true },
  );

  // Watch the store's unread messages count and sync with local unread notifications length
  watch(
    () => {
      if (notificationsStore.getUnreadMessagesCount !== undefined) {
        return notificationsStore.getUnreadMessagesCount;
      }
      return 0;
    },
    (newCount) => {
      // If the store count is different from local array length, update store with local count
      // This ensures the store reflects the actual state of unread notifications
      if (
        data.unreadNotifications.length !== newCount &&
        typeof notificationsStore.setUnreadMessagesCount === "function"
      ) {
        notificationsStore.setUnreadMessagesCount(data.unreadNotifications.length);
      }
    },
    { immediate: true },
  );

  // Watch for message read notifications from details page
  watch(
    () => {
      if (notificationsStore.getMessageReadNotification !== undefined) {
        return notificationsStore.getMessageReadNotification;
      }
      return null;
    },
    (notification) => {
      if (notification?.messageId) {
        // Find and remove the message from unread notifications
        const messageIndex = data.unreadNotifications.findIndex(
          (msg: any) => msg["@id"] === notification.messageId,
        );

        if (messageIndex > -1) {
          // Remove the message from the unread list
          data.unreadNotifications.splice(messageIndex, 1);

          // Update counters
          if (data.totalUnreadNotificationsCount > 0) {
            data.totalUnreadNotificationsCount--;
            // Also update the store's count
            if (typeof notificationsStore.setTotalUnreadCount === "function") {
              notificationsStore.setTotalUnreadCount(data.totalUnreadNotificationsCount);
            }
          }

          if (typeof notificationsStore.setUnreadMessagesCount === "function") {
            notificationsStore.setUnreadMessagesCount(data.unreadNotifications.length);
          }
        }
      }
    },
    { immediate: false, deep: true },
  );

  function updateLastAccessToMessages() {
    if (import.meta.env.DEV) {
      console.log("** updateLastAccessToMessages - userId:", userId.value);
      console.log("** updateLastAccessToMessages - userIri:", userIri.value);
    }

    // Use userId for API calls that expect the UUID
    const params = {
      userId: userId.value,
      callbackSuccess: (response: any) => {
        // Success callback if needed
      },
      callbackError: (error: any) => {
        // Error callback if needed
      },
    };

    notificationsStore.postNotificationsMessagesLastAccess(params);
  }

  function getExistsMessagesPendingToRead() {
    // Use userId for API calls that expect the UUID
    const params = {
      userId: userId.value,
      callbackSuccess: (response: any) => {
        // Success callback if needed
      },
      callbackError: (error: any) => {
        // Error callback if needed
      },
    };

    notificationsStore.getNotificationsMessagesPendingToRead(params);
  }

  function getMessages(typeNotification: string) {
    data.isLoadingMessages = true;

    const params = {
      userId: userId.value,
      typeOfNotification: typeNotification,
      spendFileVersionUuid: removeIRI(getSpendFileVersionActiveId()),
      callbackSuccess: (response: any) => {
        updateLastAccessToMessages();
        getExistsMessagesPendingToRead();
        data.isLoadingMessages = false;
      },
      callbackError: () => {
        data.isLoadingMessages = false;
        data.loading = false;
      },
    };

    notificationsStore.getNotificationsMessages(params);
  }

  function getUnreadNotifications(page: number = 1, append: boolean = false) {
    if (page === 1) {
      data.isLoadingInitialNotifications = true;
      data.unreadNotifications = [];
    } else {
      data.isLoadingMoreNotifications = true;
    }

    const params = {
      userId: userId.value,
      page: page,
      itemsPerPage: NOTIFICATIONS_ITEMS_PER_PAGE, // Using constant from constants file
      spendFileVersionUuid: getSpendFileVersionActiveId(),
      callbackSuccess: (response: any) => {
        const notifications = response["hydra:member"] || [];
        const totalItems = response["hydra:totalItems"] || 0;
        const hydraView = response["hydra:view"] || {};

        // Extract current page from hydra:view or use the requested page
        let currentPage = page;
        if (hydraView["@id"]) {
          const urlParams = new URLSearchParams(hydraView["@id"].split("?")[1]);
          currentPage = Number.parseInt(urlParams.get("page") || page.toString());
        }

        if (append) {
          data.unreadNotifications = [...data.unreadNotifications, ...notifications];
        } else {
          data.unreadNotifications = notifications;
          // Update local notification counter using total items
          if (page === 1) {
            data.totalUnreadNotificationsCount = totalItems;
            // Also update the store's count so both components stay in sync
            if (typeof notificationsStore.setTotalUnreadCount === "function") {
              notificationsStore.setTotalUnreadCount(totalItems);
            }
          }
        }

        // Update store with current unread messages count
        if (typeof notificationsStore.setUnreadMessagesCount === "function") {
          notificationsStore.setUnreadMessagesCount(data.unreadNotifications.length);
        }

        data.currentPage = currentPage;
        const totalPages = Math.ceil(totalItems / NOTIFICATIONS_ITEMS_PER_PAGE);
        data.hasMoreNotifications = currentPage < totalPages;

        data.isLoadingInitialNotifications = false;
        data.isLoadingMoreNotifications = false;
      },
      callbackError: () => {
        if (import.meta.env.DEV) console.log("** getUnreadNotifications error");
        data.isLoadingInitialNotifications = false;
        data.isLoadingMoreNotifications = false;
        data.loading = false;
      },
    };

    notificationsStore.fetchUnreadNotifications(params);
  }

  /** Clears the scroll-throttle timer on unmount (HomeNavbar.vue's onUnmounted). */
  function cleanupScrollThrottle() {
    if (scrollThrottleTimer) {
      clearTimeout(scrollThrottleTimer);
      scrollThrottleTimer = null;
    }
  }

  function loadMoreNotifications() {
    // Prevent multiple calls when already loading or no more notifications
    if (data.isLoadingMoreNotifications) {
      return;
    }

    if (!data.hasMoreNotifications) {
      return;
    }

    getUnreadNotifications(data.currentPage + 1, true);
  }

  // Throttle function to limit scroll event frequency
  let scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  function onNotificationsScroll(event: any) {
    // Throttle scroll events to prevent excessive calls
    if (scrollThrottleTimer) {
      return;
    }

    scrollThrottleTimer = globalThis.setTimeout(() => {
      scrollThrottleTimer = null;
    }, 50); // Throttle to 50ms for better responsiveness

    const target = event.target;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Load more notifications when user is near the bottom
    // Only if there are more notifications available and not currently loading
    if (distanceFromBottom < 200 && data.hasMoreNotifications && !data.isLoadingMoreNotifications) {
      if (import.meta.env.DEV) console.log("** Near bottom, calling loadMoreNotifications");
      loadMoreNotifications();
    } else if (distanceFromBottom < 200 && !data.hasMoreNotifications) {
      if (import.meta.env.DEV) console.log("** Near bottom but no more notifications available");
    } else if (distanceFromBottom < 200 && data.isLoadingMoreNotifications) {
      if (import.meta.env.DEV) console.log("** Near bottom but already loading more notifications");
    }
  }

  function onClickMarkAsReadAllMessages() {
    data.isMarkingAllAsRead = true;

    notificationsStore
      .markAllNotificationsAsRead(userId.value)
      .then((response: any) => {
        if (response.success) {
          // Reset local counter
          data.totalUnreadNotificationsCount = 0;
          // Also update the store's count
          if (typeof notificationsStore.setTotalUnreadCount === "function") {
            notificationsStore.setTotalUnreadCount(0);
          }
          // Clear displayed notifications
          data.unreadNotifications = [];
          // Update store with new unread count
          if (typeof notificationsStore.setUnreadMessagesCount === "function") {
            notificationsStore.setUnreadMessagesCount(0);
          }
          getMessages("message");
        }
        data.isMarkingAllAsRead = false;
      })
      .catch((error: any) => {
        console.error("Error marking all notifications as read:", error);
        data.isMarkingAllAsRead = false;
        data.loading = false;
      });
  }

  /**
   * Shared tail of mark-as-read/delete: fades the row out, then actually
   * removes it from the local list and re-syncs the store's unread count.
   * ~50 byte-identical lines that used to be duplicated between
   * onClickNotificationMarkAsRead and onClickNotificationDelete.
   */
  function removeNotificationLocally(iri: string) {
    const notificationIndex = data.unreadNotifications.findIndex(
      (notification: any) => notification["@id"] === iri,
    );

    if (notificationIndex === -1) {
      return;
    }

    const notificationElement = document.querySelector(`[data-notification-id='${iri}']`);
    if (notificationElement) {
      notificationElement.classList.add("notification-fade-out");

      // Remove from list after animation completes
      setTimeout(() => {
        data.unreadNotifications = data.unreadNotifications.filter(
          (notification: any) => notification["@id"] !== iri,
        );
        if (typeof notificationsStore.setUnreadMessagesCount === "function") {
          notificationsStore.setUnreadMessagesCount(data.unreadNotifications.length);
        }
      }, 500); // Match CSS animation duration
    } else {
      // Fallback: remove immediately if element not found
      data.unreadNotifications = data.unreadNotifications.filter(
        (notification: any) => notification["@id"] !== iri,
      );
      if (typeof notificationsStore.setUnreadMessagesCount === "function") {
        notificationsStore.setUnreadMessagesCount(data.unreadNotifications.length);
      }
    }
  }

  function onClickNotificationMarkAsRead(item: any, type: string) {
    if (!item) {
      return;
    }

    const iri = item["@id"];
    const uuid = removeIRI(iri);

    data.notificationClickedId = iri;
    data.isLoadingNotificationMarkAsRead = true;
    const params = {
      notificationId: uuid,
      callbackSuccess: () => {
        if (type === NotificationType.MESSAGE) {
          // Decrease unread counter
          if (data.totalUnreadNotificationsCount > 0) {
            data.totalUnreadNotificationsCount--;
            // Also update the store's count
            if (
              typeof notificationsStore.setTotalUnreadCount === "function" &&
              notificationsStore.getTotalUnreadCount !== undefined
            ) {
              const currentCount = notificationsStore.getTotalUnreadCount || 0;
              notificationsStore.setTotalUnreadCount(Math.max(0, currentCount - 1));
            }
          }

          removeNotificationLocally(iri);

          // Update messages without navigating
          getMessages("message");
        }

        data.notificationClickedId = "";
        data.isLoadingNotificationMarkAsRead = false;
      },
      callbackError: () => {
        data.notificationClickedId = "";
        data.isLoadingNotificationMarkAsRead = false;
        data.loading = false;
      },
    };
    notificationsStore.postNotificationsMarkAsRead(params);
  }

  function onClickNotificationDelete(item: any) {
    if (!item) {
      return;
    }

    const iri = item["@id"];
    const uuid = removeIRI(iri);

    data.notificationClickedId = iri;
    data.isDeletingMessage = true;

    notificationsStore
      .deleteSingleNotification(uuid)
      .then(() => {
        // Decrease unread counter
        if (data.totalUnreadNotificationsCount > 0) {
          data.totalUnreadNotificationsCount--;
          // Also update the store's count
          if (
            typeof notificationsStore.setTotalUnreadCount === "function" &&
            notificationsStore.getTotalUnreadCount !== undefined
          ) {
            const currentCount = notificationsStore.getTotalUnreadCount || 0;
            notificationsStore.setTotalUnreadCount(Math.max(0, currentCount - 1));
          }
        }

        removeNotificationLocally(iri);

        // Update messages without navigating
        getMessages("message");

        data.notificationClickedId = "";
        data.isDeletingMessage = false;
      })
      .catch(() => {
        data.notificationClickedId = "";
        data.isDeletingMessage = false;
        data.loading = false;
      });
  }

  function onClickNotificationsDropdown() {
    // Check if we need to reload notifications
    // Only reload if total count is 0
    if (data.totalUnreadNotificationsCount === 0) {
      // Reset to first page and reload
      data.currentPage = 1;
      data.hasMoreNotifications = true;
      getUnreadNotifications(1, false);
    }
  }

  function onClickRefreshNotifications() {
    // Force refresh by resetting to first page and reloading
    data.currentPage = 1;
    data.hasMoreNotifications = true;
    getUnreadNotifications(1, false);
  }

  return {
    getNotificationAmount,
    dataNotificationMessages,
    existMessagesPendingToRead,
    totalUnreadNotifications,
    notificationsLastMessagesPendingRead,
    updateLastAccessToMessages,
    getExistsMessagesPendingToRead,
    getMessages,
    getUnreadNotifications,
    loadMoreNotifications,
    onNotificationsScroll,
    cleanupScrollThrottle,
    onClickMarkAsReadAllMessages,
    onClickNotificationMarkAsRead,
    onClickNotificationDelete,
    getNotificationDisplayContent,
    getNotificationPreviewText,
    getNotificationContentIsArray,
    getNotificationContentSegments,
    getNotificationContentHasHighlightSpans,
    getNotificationSanitizedContentHtml,
    getNotificationContentSegmentsPreview,
    onClickNotificationsDropdown,
    onClickRefreshNotifications,
  };
};

export default useUnreadNotifications;
