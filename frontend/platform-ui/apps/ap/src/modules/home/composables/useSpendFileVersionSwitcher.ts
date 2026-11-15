import { ref, watch, computed, ComputedRef, Ref } from "vue";
import { useToast } from "vue-toastification";
import { ArrayUtils, StringUtils, isNullOrUndefined, removeIRI } from "@/utils";
import { checkNewSpendFileVersion } from "@/utils/CookieSessionsFns";
import { memoryMonitor } from "@/utils/memoryMonitor";
import useFirebase from "@/composables/firebase/useFirebase";
import useSpendFileFirebase from "@/composables/firebase/useSpendFileFirebase";
import { SUBSCRIPTION_KEYS, closeSubscription } from "@/composables/firebase/firebaseSession";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useEntityCardStore } from "@/stores/entityCard";
import { useUserStore } from "@/stores/user";
import { useCompareStore } from "@/stores/compare";
import { useSubscribeStore } from "@/stores/subscribe";
import { usePlanStore } from "@/stores/plan";
import { useAnalyzeStore } from "@/stores/analyze";
import { UserSession, UserSessionCompanySpendFilesVersion, UserSessionActiveCompanySpendFileVersion } from "@/types";
import { HomeNavBar, HOME_ALERT, HomeAlertLevel } from "@/modules/home/types";

interface SpendFileVersionsFormatted extends UserSessionCompanySpendFilesVersion {
  nameFormatted: string;
}

export interface SpendFileVersionSwitcherDeps {
  userIri: Ref<any>;
  programSelectedDefaultId: Ref<any>;
  spendFileVersionActive: Ref<any>;
  cleanValues: () => void;
  getUnreadNotifications: (page?: number, append?: boolean) => void;
  getNotificationAmount: (typeOfNotification?: string) => void;
  emit: (event: "showAlerts", level: HomeAlertLevel, show: boolean) => void;
  bridge: SpendFileVersionSwitcherBridge;
}

export interface SpendFileVersionSwitcherBridge {
  // From useCurrencySwitcher, constructed after this composable (to keep
  // its own watchers' original registration position) — see
  // docs/context/change-homenavbar-refactor.md.
  getMaxDateSpend?: (
    actionFromUser: boolean,
    spendFileVersionUuid: string,
    onComplete?: () => void,
  ) => any;
  goToHomeDashboard?: () => void;
  // All 3 still live directly in HomeNavbar.vue (session-bootstrap territory,
  // extracted in the next step) — same reason.
  commonApiCalls?: () => void;
  getWhoAmI?: (callApis?: boolean) => void;
  firtCallsOrWhoAmI?: () => void;
  getVCardGroups?: () => void;
}

/**
 * Spend-file-version subscription, validation, the dropdown's selection
 * flow, and `changeCurrentSpendFileVersion` — the single most
 * business-critical function in HomeNavbar.vue. Extracted verbatim (US-2,
 * Sprint 116 refactor) — behavior-preserving, no logic change.
 *
 * `changeCurrentSpendFileVersion`'s statement order is intentionally
 * untouched: same-version guard → `setDisableWatchers(true)` + 5s safety
 * timer → store resets incl. `closeSubscription(SUBSCRIPTION_KEYS.plan)` →
 * `globalThis.gc()` → `goToHomeDashboard()` → PATCH, whose callbackSuccess
 * and callbackError both re-enable watchers. See
 * docs/context/race-condition-company-change.md — this is that contract's
 * other half (company-change is useCompanySwitcher).
 *
 * `filterSpendfiles`'s case-sensitive `/@calculum\.ai$/` regex (vs. the
 * case-insensitive `userIsCalculumUser` used elsewhere) is a known bug
 * (sprint-doc Bug B7) — preserved verbatim, not fixed here.
 */
const useSpendFileVersionSwitcher = (
  data: HomeNavBar,
  companyActiveSpendFileVersions: Ref<any>,
  user: Ref<any>,
  deps: SpendFileVersionSwitcherDeps,
) => {
  const {
    userIri,
    programSelectedDefaultId,
    spendFileVersionActive,
    cleanValues,
    getUnreadNotifications,
    getNotificationAmount,
    emit,
    bridge,
  } = deps;

  const toast = useToast();
  const memoryMonitorInstance = memoryMonitor;
  const globalFiltersStore = useGlobalFiltersStore();
  const entityCardStore = useEntityCardStore();
  const userStore = useUserStore();
  const compareStore = useCompareStore();
  const subscribeStore = useSubscribeStore();
  const planStore = usePlanStore();
  const analyzeStore = useAnalyzeStore();
  const { subscribeToPrograms, fnSetUnsubscribeProgram } = useFirebase();
  const { fnUnsubscribeToSpendFiles, subscribeToSpendFiles } = useSpendFileFirebase();

  const spendFileVersionActiveId = ref(
    isNullOrUndefined(spendFileVersionActive.value)
      ? ""
      : spendFileVersionActive.value["@id"],
  );

  let isSubscribingToSpendFile = false;

  // The store's authFirestoreUser is no longer a precondition here: it was a
  // stale, persisted value that could block a subscription forever once it
  // went false. The composables now establish the session themselves and
  // bail out on their own if they cannot (WI#19104).
  async function subscribetoSpendFile() {
    if (isSubscribingToSpendFile) return;
    isSubscribingToSpendFile = true;
    try {
      fnUnsubscribeToSpendFiles();
      await subscribeToSpendFiles([removeIRI(spendFileVersionActiveId.value)]);
    } finally {
      isSubscribingToSpendFile = false;
    }
  }

  async function subscribeToDefaultProgram() {
    fnSetUnsubscribeProgram();
    await subscribeToPrograms([removeIRI(programSelectedDefaultId.value)]);
  }

  // ? - What if there is no active spend file version?
  watch(spendFileVersionActive, (newSpendFileVersion) => {
    if (!isNullOrUndefined(newSpendFileVersion)) {
      spendFileVersionActiveId.value = newSpendFileVersion["@id"];
    }
  });

  // Watch for spend file version changes to refresh notifications
  watch(spendFileVersionActiveId, (newSpendFileVersionId, oldSpendFileVersionId) => {
    // Only refresh if the spend file actually changed and we have a valid new ID
    if (newSpendFileVersionId && newSpendFileVersionId !== oldSpendFileVersionId) {
      // Refresh unread notifications for the new spend file
      getUnreadNotifications(1, false);
      // Also refresh notification count
      getNotificationAmount();
      subscribetoSpendFile();
    }
  });

  watch(programSelectedDefaultId, (newprogramSelectedDefaultId, oldprogramSelectedDefaultId) => {
    // Only refresh if the spend file actually changed and we have a valid new ID
    if (newprogramSelectedDefaultId && newprogramSelectedDefaultId !== oldprogramSelectedDefaultId) {
      // Refresh unread notifications for the new spend file
      subscribeToDefaultProgram();
    }
  });

  function filterSpendfiles() {
    // Filter out private spend files for users without @calculum.ai email
    const filteredFiles = companyActiveSpendFileVersions.value.filter((file: any) => {
      const isPrivate = !file.isPublic;
      // Case-sensitive on purpose here (vs. the case-insensitive userIsCalculumUser
      // used elsewhere) — a known, tracked bug (sprint-doc Bug B7), preserved
      // verbatim; this is only a regex-to-endsWith syntax swap, same comparison.
      const isCalculumUser = Boolean(user.value?.email?.endsWith("@calculum.ai"));

      // Exclude private files if the user is not from calculum.ai
      if (isPrivate && !isCalculumUser) {
        return false;
      }
      return true;
    });

    return filteredFiles;
  }

  async function validateSpendFilesActive(fromWhoami: boolean = false) {
    if (ArrayUtils.isEmpty(companyActiveSpendFileVersions.value)) {
      //show alert and disable menu
      emit("showAlerts", HOME_ALERT.SELECT_OTHER_COMPANY, true);
      userStore.setShowMenu(false);
      data.loading = false;

      bridge.getWhoAmI?.(false);

      return;
    }
    const filteredFiles = filterSpendfiles();

    //* Validate if the current spendfile exists in the filtered spendfiles
    const validateSpendfile = filteredFiles.find(
      (x: any) => x["@id"] === spendFileVersionActiveId.value,
    );

    //* If not exists, change the active spendfile to the last one available
    if (!validateSpendfile) {
      data.loading = true;
      changeCurrentSpendFileVersion(filteredFiles[filteredFiles.length - 1]["@id"], false);
      bridge.getVCardGroups?.();
    } else if (!fromWhoami) {
      //* If exists, call the apis
      //* fromWhoami is used to avoid a loop
      bridge.firtCallsOrWhoAmI?.();
    }
  }

  const spendFileVersionsFormatted: ComputedRef<SpendFileVersionsFormatted[]> = computed(() => {
    // Validate input
    if (ArrayUtils.isEmpty(companyActiveSpendFileVersions.value)) {
      return [];
    }

    const filteredFiles = filterSpendfiles();
    // Format the remaining items
    const sfvFormatted = filteredFiles.map((s: any) => {
      return {
        ...s,
        nameFormatted: `${s.name} (Ver. ${s.version})`,
      };
    });

    // Sort the results ascending by the formatted name
    return ArrayUtils.sortAscBy(sfvFormatted, ["nameFormatted"]);
  });

  function updateSpendFileVersionList() {
    // No company or spend files
    if (!isNullOrUndefined(companyActiveSpendFileVersions.value)) {
      return;
    }

    userStore.setShowMenu(false);

    data.loading = false;
  }

  /**
   * Change the active spend file.
   *
   * @param {string} spendFileVersion - The new spend file version.
   */
  function changeCurrentSpendFileVersion(spendFileVersion: string, actionFromUser: boolean) {
    // Guard: if the version hasn't changed, skip the full "change file" flow
    // (avoids redundant store cleanup, navigation, and PATCH to /api/users/{id})
    if (spendFileVersion === userStore.getUser?.activeSpendFileVersion?.["@id"]) {
      if (actionFromUser) {
        bridge.getMaxDateSpend?.(actionFromUser, spendFileVersion);
      } else {
        data.loading = true;
        bridge.commonApiCalls?.();
      }
      return;
    }

    // Disable watchers before any store mutation to prevent stale GraphQL queries
    // (same race condition as company change: old programUuid + new spendFileVersionUuid)
    globalFiltersStore.setDisableWatchers(true);

    // Safety fallback: re-enable watchers after 5s in case any error path skips re-enabling
    setTimeout(() => {
      if (globalFiltersStore.getDisableWatchers) {
        if (import.meta.env.DEV) console.warn("⚠️ Safety fallback: re-enabling watchers after spend file change timeout");
        globalFiltersStore.setDisableWatchers(false);
      }
    }, 5000);

    // Verify memory before the change
    const memoryStats = memoryMonitorInstance.getMemoryStats();
    if (import.meta.env.DEV && memoryStats) console.log("** Memory before change spend file:", memoryStats);

    // Aggressive cleanup of the store to free memory
    entityCardStore.setSelectedProgram(null);
    userStore.setError403(false);
    userStore.setError410(false);
    userStore.setShowSpendNoty(false);
    compareStore.setAddededCompanies([]);
    subscribeStore.setLastStatusDate(null);

    planStore.setDefaultPlan(null);
    subscribeStore.setLastStatusPlanSubscribe(null);
    // Nulling the store slot alone dropped the handle without ever calling it,
    // leaking the plan listener across spend-file changes.
    closeSubscription(SUBSCRIPTION_KEYS.plan);
    subscribeStore.setPlanSubscribe(null);
    subscribeStore.setSupplierStandardClusterStatus("");
    subscribeStore.setAllowActionsInModules(true);
    subscribeStore.setLastStatusSpendFileSubscribe(null);
    subscribeStore.setSetRefeshSpendFiles(null);
    analyzeStore.setFinancingsGroupsbyProgram([]);
    analyzeStore.setHarmonizationsGroupsbyProgram([]);
    analyzeStore.setHasFinancing(false);
    analyzeStore.setHasHarmonization(false);
    analyzeStore.setGroups([]);
    analyzeStore.setFinancing([]);
    fnSetUnsubscribeProgram();

    //-When user changes the spendfile

    // Force garbage collection if available
    if (globalThis.gc) {
      globalThis.gc();
    }

    bridge.goToHomeDashboard?.();

    if (!spendFileVersion) {
      return;
    }

    data.isLoadingChangeSpendFile = true;

    data.loading = true;

    const params = {
      obj: { activeSpendFileVersion: spendFileVersion },
      user: userIri.value,
      callbackSuccess: (callbackSuccessData: UserSession) => {
        data.isLoadingChangeSpendFile = false;

        userStore.setShowMenu(true);

        emit("showAlerts", HOME_ALERT.NONE, false);

        // Update the user store
        userStore.setActualUser(callbackSuccessData);
        checkNewSpendFileVersion(callbackSuccessData);

        // Re-enable watchers now that the new spend file context is established
        globalFiltersStore.setDisableWatchers(false);

        // Verify memory after the change
        const memoryAfterStats = memoryMonitorInstance.getMemoryStats();
        if (import.meta.env.DEV && memoryAfterStats) console.log("** Memory after change spend file:", memoryAfterStats);

        //If user change the spendfile from the dropdown
        if (actionFromUser) {
          bridge.getMaxDateSpend?.(actionFromUser, spendFileVersion);
        } else {
          //if the change spend file is forced due to the current spend file is not in the available options
          data.loading = true; //to hide the section
          bridge.commonApiCalls?.(); //To call the api and then show the current section, and avoid call the whoami
        }
      },
      callbackError: () => {
        // Re-enable watchers on error path
        globalFiltersStore.setDisableWatchers(false);
        data.isLoadingChangeSpendFile = false;
        data.loading = false;
      },
    };

    userStore.changeActualFile(params);
  }

  watch(
    spendFileVersionsFormatted,
    () => {
      if (
        !ArrayUtils.isEmpty(spendFileVersionsFormatted.value) &&
        !StringUtils.isEmpty(spendFileVersionActiveId.value)
      ) {
        emit("showAlerts", HOME_ALERT.NONE, false);

        userStore.setShowMenu(true);
      }
      // There are spend files but no one is active
      else if (
        !ArrayUtils.isEmpty(spendFileVersionsFormatted.value) &&
        StringUtils.isEmpty(spendFileVersionActiveId.value)
      ) {
        emit("showAlerts", HOME_ALERT.NO_ACTIVE_SPEND_FILE, true);
        userStore.setShowMenu(false);
        toast.error("There is no active Spendfile selected.");
      }
      // There are no spend files. No active spend file. One company
      else if (
        ArrayUtils.isEmpty(spendFileVersionsFormatted.value) &&
        StringUtils.isEmpty(spendFileVersionActiveId.value) &&
        data.companyList.length <= 1
      ) {
        userStore.setShowMenu(false);

        emit("showAlerts", HOME_ALERT.NOTHING_TO_SELECT, true);
      }
      // There are no spend files. No active spend file. There is at least one company
      else if (
        ArrayUtils.isEmpty(spendFileVersionsFormatted.value) &&
        StringUtils.isEmpty(spendFileVersionActiveId.value) &&
        data.companyList.length > 0
      ) {
        userStore.setShowMenu(false);

        emit("showAlerts", HOME_ALERT.SELECT_OTHER_COMPANY, true);
      }
      //
      else {
        userStore.setShowMenu(false);

        emit("showAlerts", HOME_ALERT.NOTHING_TO_SELECT, true);
      }
    },
    { immediate: true },
  );

  /**
   * Select a spend file from the dropdown
   */
  function selectSpendFile(version: any) {
    userStore.setPendingNewSpendFileVersion(null);
    spendFileVersionActiveId.value = version["@id"];
    data.toggleSpendFileDropdown = false;
    cleanValues();
    changeCurrentSpendFileVersion(version["@id"], true);
  }

  const pendingNewSpendFileVersion = computed(() => userStore.getPendingNewSpendFileVersion);

  function onBannerLoad(version: UserSessionActiveCompanySpendFileVersion) {
    userStore.setPendingNewSpendFileVersion(null);
    changeCurrentSpendFileVersion(version["@id"], true);
  }

  function onBannerDismiss() {
    userStore.setPendingNewSpendFileVersion(null);
  }

  return {
    spendFileVersionActiveId,
    spendFileVersionsFormatted,
    subscribetoSpendFile,
    subscribeToDefaultProgram,
    validateSpendFilesActive,
    updateSpendFileVersionList,
    changeCurrentSpendFileVersion,
    selectSpendFile,
    pendingNewSpendFileVersion,
    onBannerLoad,
    onBannerDismiss,
  };
};

export default useSpendFileVersionSwitcher;
