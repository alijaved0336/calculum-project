import { reactive, toRefs, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import { useEntityCardStore } from "@/stores/entityCard";
import { buildCommentSegments } from "@/utils/ContentEditableUtils";

interface UseEntityActivityLogsOptions {
  companyId: () => string;
  itemsPerPage: () => number;
  isActivityPanelOpen: () => boolean;
  activePanelTab: () => "activity" | "agent";
}

interface EntityActivityLogsState {
  logsByEntity: any[];
  mentionableUsers: any[];
  activityLogsLoading: boolean;
  activityLogsNextPage: number;
  activityLogsHasNextPage: boolean;
  activityLogsUnreadCount: number;
  activityPanelMarkedAsReadOnce: boolean;
  logsActivityLoading: boolean;
  totalItems: number;
}

const useEntityActivityLogs = (options: UseEntityActivityLogsOptions) => {
  const entityCardStore = useEntityCardStore();
  const toast = useToast();
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });

  const state = reactive<EntityActivityLogsState>({
    logsByEntity: [],
    mentionableUsers: [],
    activityLogsLoading: false,
    activityLogsNextPage: 2,
    activityLogsHasNextPage: false,
    activityLogsUnreadCount: 0,
    activityPanelMarkedAsReadOnce: false,
    logsActivityLoading: false,
    totalItems: 0,
  });

  function getMentionableUsers() {
    const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : v);
    const params = {
      supplierId: options.companyId(),
      callbackSuccess: (response: any) => {
        let raw: any[];
        if (Array.isArray(response)) {
          raw = response;
        } else if (Array.isArray(response?.data)) {
          raw = response.data;
        } else if (response && typeof response === "object") {
          raw = Object.values(response);
        } else {
          raw = [];
        }
        const list = Array.isArray(raw) ? raw : [];
        state.mentionableUsers = list.map((u: any) => ({
          ...u,
          email: trimStr(u.email),
          firstName: trimStr(u.firstName ?? u.first_name),
          lastName: trimStr(u.lastName ?? u.last_name),
        }));
      },
      callbackError: () => {
        state.mentionableUsers = [];
      },
    };
    entityCardStore.getMentionableUsers(params);
  }

  function getLogsByEntity(isFromRefresh: boolean = false) {
    if (!isFromRefresh) {
      state.logsByEntity = [];
    }

    state.logsActivityLoading = isFromRefresh;

    state.activityLogsNextPage = 1;
    state.activityLogsHasNextPage = false;
    state.activityLogsLoading = false;

    entityCardStore.getLogsByEntity({
      supplierId: options.companyId(),
      page: 1,
      itemsPerPage: options.itemsPerPage(),
      callbackSuccess: (response: any) => {
        const items = response?.items ?? [];
        state.logsByEntity = items;
        state.activityLogsNextPage = 2;
        state.activityLogsHasNextPage = response?.pagination?.hasNextPage === true;
        state.activityLogsUnreadCount = response?.notifications?.summary.unread ?? 0;
        state.logsActivityLoading = false;
        state.totalItems = response?.pagination?.totalItems ?? 0;
      },
      callbackError: () => {
        state.logsByEntity = [];
      },
    });
  }

  function loadMoreLogs() {
    if (!state.activityLogsHasNextPage || state.activityLogsLoading) return;
    state.activityLogsLoading = true;
    const page = state.activityLogsNextPage;

    entityCardStore.getLogsByEntity({
      supplierId: options.companyId(),
      page,
      itemsPerPage: options.itemsPerPage(),
      callbackSuccess: (response: any) => {
        const items = response?.items ?? [];
        state.logsByEntity = [...state.logsByEntity, ...items];
        state.activityLogsNextPage = page + 1;
        state.activityLogsHasNextPage = response?.pagination?.hasNextPage === true;
        state.activityLogsUnreadCount = response?.notifications?.summary.unread ?? 0;
        state.activityLogsLoading = false;
        markLogsAsRead(page, options.itemsPerPage());
      },
      callbackError: () => {
        state.activityLogsLoading = false;
      },
    });
  }

  function markLogsAsRead(page: number = 1, itemsPerPage: number = options.itemsPerPage()) {
    if (state.activityLogsUnreadCount === 0) return;

    entityCardStore.markLogsAsRead({
      supplierId: options.companyId(),
      page: page,
      itemsPerPage: itemsPerPage,
      callbackSuccess: (response: any) => {
        state.activityLogsUnreadCount = response?.notifications?.summary.unread ?? 0;
      },
      callbackError: () => {},
    });
  }

  function handleRefreshActivity() {
    getLogsByEntity(true);
  }

  function handleSubmitComment(payload: { comment: string; mentionUserIds: string[] }) {
    const { comment, mentionUserIds } = payload;
    state.logsActivityLoading = true;

    const commentSegments = buildCommentSegments(
      comment,
      mentionUserIds ?? [],
      state.mentionableUsers ?? [],
    );

    entityCardStore.postSpendNote({
      spendId: options.companyId(),
      title: "",
      comment: commentSegments,
      marked: false,
      callbackSuccess: () => {
        toast.success(translate.t("global.commentSaved"));
        handleRefreshActivity();
      },
      callbackError: () => {
        toast.error(translate.t("global.errorSavingComment"));
        state.logsActivityLoading = false;
      },
    });
  }

  /**
   * First time the Activity panel is opened: mark logs as read once.
   */
  watch(
    () => [options.isActivityPanelOpen(), options.activePanelTab()] as const,
    ([isOpen, activeTab]) => {
      if (isOpen && activeTab === "activity" && !state.activityPanelMarkedAsReadOnce) {
        state.activityPanelMarkedAsReadOnce = true;
        markLogsAsRead(1, options.itemsPerPage());
      }
    },
  );

  /** Reset "marked as read" flag when changing entity so we mark once per entity. */
  watch(options.companyId, () => {
    state.activityPanelMarkedAsReadOnce = false;
  });

  return {
    ...toRefs(state),
    getMentionableUsers,
    getLogsByEntity,
    loadMoreLogs,
    markLogsAsRead,
    handleRefreshActivity,
    handleSubmitComment,
  };
};

export default useEntityActivityLogs;
