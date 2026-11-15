import { watch, Ref } from "vue";
import { isNullOrUndefined, StringUtils } from "@/utils";
import { isUndefined } from "lodash";
import { checkNewSpendFileVersion } from "@/utils/CookieSessionsFns";
import { UserSession } from "@/types";
import { useUserStore } from "@/stores/user";
import { HomeNavBar, HOME_ALERT, HomeAlertLevel } from "@/modules/home/types";

export interface CompanySwitcherDeps {
  cleanupBeforeCompanyChange: () => void;
  cleanupAfterCompanyChange: () => void;
  checkMemoryLeaks: () => { hasLeak: boolean; [key: string]: any };
  verifyGridConfigurations: () => any;
  cleanValues: () => void;
  emit: (event: "showAlerts", level: HomeAlertLevel, show: boolean) => void;
  // `getMaxDateSpend` (useCurrencySwitcher) and `updateSpendFileVersionList`
  // (the not-yet-extracted spend-file switcher) are both read through the
  // shared bridge rather than as direct deps: useCompanySwitcher is
  // constructed before useCurrencySwitcher in HomeNavbar.vue's setup() (to
  // keep the companyActive watcher's original registration position), so a
  // direct reference would be used before it's assigned. See
  // docs/context/change-homenavbar-refactor.md.
  bridge: {
    getMaxDateSpend?: (
      actionFromUser: boolean,
      spendFileVersionUuid: string,
      onComplete?: () => void,
    ) => any;
    updateSpendFileVersionList?: () => void;
  };
}

/**
 * Company selection and `changeCompany` — the POST /api/user/set_active_company
 * flow. Extracted verbatim from HomeNavbar.vue (US-2, Sprint 116 refactor) —
 * behavior-preserving, no logic change, including the known bug where
 * `changeCompany` validates its `companySelectedId` parameter but then
 * builds the request from `data.selectedCompany` (tracked separately as
 * sprint-doc Bug B7 — not fixed here).
 */
const useCompanySwitcher = (
  data: HomeNavBar,
  companyActive: Ref<any>,
  user: Ref<any>,
  deps: CompanySwitcherDeps,
) => {
  const userStore = useUserStore();
  const {
    cleanupBeforeCompanyChange,
    cleanupAfterCompanyChange,
    checkMemoryLeaks,
    verifyGridConfigurations,
    cleanValues,
    emit,
    bridge,
  } = deps;

  // If active company data changed, update local data
  watch(companyActive, () => {
    if (isNullOrUndefined(companyActive.value)) {
      return;
    }

    // Search for the selected company
    const c = data.companyList.find((company) => {
      return (
        !isNullOrUndefined(companyActive.value) &&
        company["@id"] === companyActive.value["@id"]
      );
    });

    if (isUndefined(c)) {
      if (import.meta.env.DEV) console.log("** Company not found");
      return;
    }

    // Only update company name, we don't need compareCompany information here
    c.name = companyActive.value.name;
  });

  /**
   * Changes the company based on the provided companyId.
   * Route: POST /api/user/set_active_company
   * {selectedCompany: string}
   *
   * @param {string} companySelectedId
   */
  function changeCompany(companySelectedId: string, actionFromUser: any) {
    try {
      // Enable loading
      data.loading = true;
      userStore.setPendingNewSpendFileVersion(null);

      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(companySelectedId)) {
        throw new Error("Invalid company ID");
      }

      cleanupBeforeCompanyChange();

      const params = {
        selectedCompany: data.selectedCompany,
        callbackSuccess: () => {
          // Call whoAmI
          const params = {
            callbackSuccess: (callbackSuccessData: UserSession) => {
              checkNewSpendFileVersion(callbackSuccessData);
              bridge.updateSpendFileVersionList?.();

              if (
                isNullOrUndefined(user.value)
                // || isNullOrUndefined(user.value.activeSpendFileVersion)
                // || user.value.activeSpendFileVersion.status !== 'ready'
              ) {
                cleanupAfterCompanyChange();
                data.loading = false;
                return;
              }

              emit("showAlerts", HOME_ALERT.NONE, false);
              if (user.value.activeSpendFileVersion?.["@id"]) {
                // Pass cleanupAfterCompanyChange as onComplete so it fires only after
                // goToHomeDashboard() — prevents stale watchers from firing during the
                // async getMaxDateSpend → changeCurrencyRate → goToHomeDashboard chain.
                bridge.getMaxDateSpend?.(actionFromUser, user.value.activeSpendFileVersion["@id"], cleanupAfterCompanyChange);
              } else {
                // No spend file version: run cleanup immediately
                cleanupAfterCompanyChange();
              }

              // Check for memory leaks
              const leakCheck = checkMemoryLeaks();
              if (leakCheck.hasLeak) {
                if (import.meta.env.DEV) console.warn("⚠︝ Possible memory leak detected:", leakCheck);
              }

              // Verify that grid configurations are preserved
              const configCheck = verifyGridConfigurations();
              if (import.meta.env.DEV) console.log("🔝 Configuration verification:", configCheck);

              // Disable loading
              data.loading = false;
            },
            callbackError: () => {
              cleanupAfterCompanyChange();
              data.loading = false;
            },
          };

          userStore.whoAmI(params);
        },
        callbackError: () => {
          cleanupAfterCompanyChange();
          data.loading = false;
        },
      };

      userStore.postUserCompany(params);
    } catch (error) {
      cleanupAfterCompanyChange();
      data.loading = false;
      if (import.meta.env.DEV) console.error("** (changeCompany)", error);
    }
  }

  /**
   * Select a company from the dropdown
   */
  function selectCompany(company: any) {
    data.toggleCompanyDropdown = false;
    data.selectedCompany = company["@id"];
    cleanValues();
    changeCompany(company["@id"], true);
  }

  return {
    changeCompany,
    selectCompany,
  };
};

export default useCompanySwitcher;
