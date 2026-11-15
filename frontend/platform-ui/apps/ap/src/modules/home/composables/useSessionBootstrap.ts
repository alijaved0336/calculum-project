import { onMounted, onUnmounted, Ref } from "vue";
import { isNullOrUndefined } from "@/utils";
import { checkNewSpendFileVersion } from "@/utils/CookieSessionsFns";
import { unloadTidio } from "@/utils/tidio";
import useFirebase from "@/composables/firebase/useFirebase";
import useSpendFileFirebase from "@/composables/firebase/useSpendFileFirebase";
import { useUserStore } from "@/stores/user";
import { useHomeStore } from "@/stores/home";
import { useEntityCardStore } from "@/stores/entityCard";
import { useAppStore } from "@/stores/app";
import { UserSession } from "@/types";
import { VcardInfo, HOME_ALERT, HomeAlertLevel, HomeNavBar } from "@/modules/home/types";

export interface SessionBootstrapDeps {
  user: Ref<any>;
  companyActiveId: Ref<any>;
  highlightedCompanyIndex: Ref<number>;
  highlightedSpendFileIndex: Ref<number>;
  setUserLanguage: (lang?: string) => void;
  validateSpendFilesActive: (fromWhoami?: boolean) => Promise<void>;
  updateSpendFileVersionList: () => void;
  subscribetoSpendFile: () => Promise<void>;
  subscribeToDefaultProgram: () => Promise<void>;
  loadCurrencies: () => Promise<void>;
  handleBeforeUnload: () => void;
  // Stays a thin orchestrator directly in HomeNavbar.vue — passed in as-is
  // since it's already defined by the time this composable is constructed.
  commonApiCalls: () => void;
  emit: (event: "showAlerts", level: HomeAlertLevel, show: boolean) => void;
}

/**
 * Session bootstrap: the login-vs-refresh branch in the main `onMounted`,
 * `getWhoAmI`/`firtCallsOrWhoAmI`/`getSessionInfo`, the Firebase session
 * kickoff (`setUserfirebase`), vCard groups, and the dropdown-closing
 * `menuPopup` document listener. Extracted verbatim from HomeNavbar.vue
 * (US-2, Sprint 116 refactor) — behavior-preserving, no logic change.
 *
 * The `document.body` click listener is added from two mutually-exclusive
 * branches (`firtCallsOrWhoAmI`'s fromlogin branch and `getWhoAmI`'s
 * success callback) and removed once on unmount — a known double-add risk
 * (sprint-doc Bug B4) preserved verbatim, not fixed here.
 *
 * The `onUnmounted` here only owns the Firebase-listener-ownership cleanup
 * (`fnUnsubscribeToSpendFiles`/`fnSetUnsubscribeProgram`) and the
 * `menuPopup` listener removal; the rest of the original single
 * `onUnmounted` (search timeouts, data resets, company-change-optimizer
 * cleanup) stays in HomeNavbar.vue, split across two independent
 * `onUnmounted` calls — Vue runs both in registration order and neither
 * depends on the other's cleanup.
 */
const useSessionBootstrap = (data: HomeNavBar, deps: SessionBootstrapDeps) => {
  const {
    user,
    companyActiveId,
    highlightedCompanyIndex,
    highlightedSpendFileIndex,
    setUserLanguage,
    validateSpendFilesActive,
    updateSpendFileVersionList,
    subscribetoSpendFile,
    subscribeToDefaultProgram,
    loadCurrencies,
    handleBeforeUnload,
    commonApiCalls,
    emit,
  } = deps;

  const userStore = useUserStore();
  const homeStore = useHomeStore();
  const entityCardStore = useEntityCardStore();
  const appStore = useAppStore();
  const { logoutFirebase, checkExpirationtoken, fnSetUnsubscribeProgram } = useFirebase();
  const { fnUnsubscribeToSpendFiles } = useSpendFileFirebase();

  function menuPopup(e: any) {
    // Close currency dropdown
    if (
      e.target.closest(".custom-currency-dropdown") ||
      e.target.closest(".custom-spendfile-dropdown")
    ) {
      return;
    }
    if (e.target.closest(".custom-currency-dropdown") === null) {
      data.toggleCurrencyDropdown = false;
      data.searchCurrency = "";
    }

    // Close company dropdown
    if (
      e.target.closest(".custom-company-dropdown") ||
      e.target.closest(".dropdown-options-navbar")
    ) {
      return;
    }
    if (e.target.closest(".custom-company-dropdown") === null) {
      data.toggleCompanyDropdown = false;
      data.searchCompany = "";
      highlightedCompanyIndex.value = -1;
    }

    // Close spend file dropdown
    if (
      e.target.closest(".custom-spendfile-dropdown") ||
      e.target.closest(".dropdown-options-navbar")
    ) {
      return;
    }
    if (e.target.closest(".custom-spendfile-dropdown") === null) {
      data.toggleSpendFileDropdown = false;
      data.searchSpendFile = "";
      highlightedSpendFileIndex.value = -1;
    }
  }

  function firtCallsOrWhoAmI() {
    const fromlogin = userStore.getFromLogin;

    if (fromlogin) {
      userStore.setFromLogin(false);
      // User logged in for the first time and the user store has the recent values
      commonApiCalls();
      document.body.addEventListener("click", menuPopup);
    } else {
      // User is logged in and refreshes user store, this action is when user REFRESH ADA
      getWhoAmI();
    }
  }

  function getWhoAmI(callApis: boolean = true) {
    const params = {
      callbackSuccess: (callbackSuccessData: UserSession) => {
        checkNewSpendFileVersion(callbackSuccessData);
        updateSpendFileVersionList();
        data.status403 = userStore.getError403;
        data.status410 = userStore.getError410;

        if (data.status403) {
          emit("showAlerts", HOME_ALERT.FORBIDDEN, true);
          userStore.setShowMenu(false);
        }

        if (data.status410) {
          emit("showAlerts", HOME_ALERT.PILOT_EXPIRED, true);
          userStore.setShowMenu(false);
        }
        commonApiCalls();
        /**
         * This api fn is called when user REFRESH ADA, so the user store is updated and now we can validate
         * if the selected spend file exists in the list for the dropdown
         * if not, it is necessary to do the patch with the new spend file
         */

        if (callApis) {
          validateSpendFilesActive(true);
        }

        document.body.addEventListener("click", menuPopup);
      },
      callbackError: () => {
        data.loading = false;
      },
    };
    userStore.whoAmI(params);
  }

  function getSessionInfo() {
    data.loading = true;
    const params = {
      callbackSuccess: (callbackSuccessData: any) => {
        userStore.setSourceAccount(callbackSuccessData.data.authenticationSource);
        homeStore.setIdpsToLogin(null);
        setUserfirebase("homenavbar refresh");
        validateSpendFilesActive();
      },
      callbackError: (errorResponse: any) => {
        if (import.meta.env.DEV) console.error("** getSessionInfo", errorResponse);
      },
    };
    userStore.getSessionInfo(params);
  }

  onMounted(async () => {
    fnSetUnsubscribeProgram();
    if (globalThis.location.pathname.includes("/home/entity_card/potential-suppliers/")) {
      if (import.meta.env.DEV) console.log("** User need go to suppliers and potential tabs");
      userStore.setLastSectionVisitedbyUser("suppliers");
    } else if (globalThis.location.pathname === "/home/home-dashboard") {
      userStore.setLastSectionVisitedbyUser("home");
      if (import.meta.env.DEV) console.log("User in dashboard");
    }

    //-To reset if an entity was previously opened
    entityCardStore.setIsModalEntityShowing(false);
    let defaultTab = {
      selected: 0,
    };
    entityCardStore.setSelectedTabIndexSpend(defaultTab.selected);
    entityCardStore.setHigherZIndexForEntityModal(false);

    const fromlogin = userStore.getFromLogin;

    // Initialize default currency values
    appStore.initializeDefaultCurrencies();

    /// if user comes from login page, call the usual api calls
    if (fromlogin) {
      //*Fn to validate if the selected spend file is active and in the list for the dropdown
      validateSpendFilesActive();
      getVCardGroups();
      setUserfirebase("homenavbar login");
    }
    //-- if user refreshes the page call the session info and then the usual api calls
    else {
      if (import.meta.env.DEV) console.log("** User refreshes the page, logout from firebase");
      await logoutFirebase();
      getSessionInfo();
    }

    await loadCurrencies();

    userStore.setShowSpendNoty(false);
    if (!isNullOrUndefined(user.value)) {
      setUserLanguage(user.value.language);
    }

    // Add beforeunload event listener to cleanup Tidio when browser tab is closed
    globalThis.addEventListener("beforeunload", handleBeforeUnload);
  });

  onUnmounted(() => {
    // Unload Tidio when HomeNavbar unmounts (e.g., navigating to admin pages)
    unloadTidio();
    // Cleanup beforeunload event listener
    globalThis.removeEventListener("beforeunload", handleBeforeUnload);
    // This component owns the spend-file and default-program listeners; leaving
    // them open on unmount orphaned them, and on re-mount nothing replaced them.
    fnUnsubscribeToSpendFiles();
    fnSetUnsubscribeProgram();
  });

  async function setUserfirebase(type: string) {
    // checkExpirationtoken now just guarantees a session exists (minting one
    // if needed), so the old manual token-fetch/login fallback is gone along
    // with the terminal `false` state it used to leave behind.
    const hasSession = await checkExpirationtoken(type);
    if (!hasSession) {
      if (import.meta.env.DEV) console.warn("** No Firebase session; realtime updates unavailable");
      return;
    }

    subscribetoSpendFile();
    subscribeToDefaultProgram();
  }

  function getVCardGroups() {
    const props = {
      company: companyActiveId.value,
      callbackSuccess: (callbackSuccessData: VcardInfo) => {
        /** For Groups
         *  saves the groups, if the array is not empty, in some views such as Program Edit List
         * when selecting companies, it will allow some bulk edit option regarding vCard
         *
         */
        homeStore.setVCardGroups(callbackSuccessData?.groups ?? []);
      },
      callbackError: () => {
        homeStore.setVCardGroups([]);
      },
    };
    homeStore.getInfoVcard(props);
  }

  onUnmounted(() => {
    document.body.removeEventListener("click", menuPopup);
  });

  return {
    firtCallsOrWhoAmI,
    getWhoAmI,
    getVCardGroups,
  };
};

export default useSessionBootstrap;
