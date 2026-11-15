import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { StringUtils, RedirectSection } from "@/utils";
import { memoryMonitor } from "@/utils/memoryMonitor";
import { useAppStore } from "@/stores/app";
import { useHomeStore } from "@/stores/home";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useAnalyzeStore } from "@/stores/analyze";
import { useUserStore } from "@/stores/user";
import { HomeNavBar } from "@/modules/home/types";

/**
 * Currency selection, currency-rate switching, and the navigate-home /
 * reset-transient-state routine shared with company and spend-file
 * switching (`goToHomeDashboard`, `getMaxDateSpend`).
 *
 * Extracted verbatim from HomeNavbar.vue (US-2, Sprint 116 refactor) —
 * behavior-preserving, no logic change. `data` is the same shared
 * `HomeNavBar` reactive object HomeNavbar.vue still owns; this composable
 * only reads/writes the currency-related slice of it
 * (currency/currencyFrom/currencyDate/loading/toggleCurrencyDropdown/
 * notLoadingCurrency/searchCurrency), matching what these functions did
 * before extraction.
 */
const useCurrencySwitcher = (data: HomeNavBar) => {
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
  const appStore = useAppStore();
  const homeStore = useHomeStore();
  const globalFiltersStore = useGlobalFiltersStore();
  const analyzeStore = useAnalyzeStore();
  const userStore = useUserStore();
  const memoryMonitorInstance = memoryMonitor;

  const currencyList = computed(() => {
    const currencies = appStore.getCurrencies;
    return currencies || []; // Return empty array if currencies is undefined
  });

  // Watch for currency changes to ensure proper reactivity
  watch(
    currencyList,
    (newCurrencies) => {
      // Set notLoadingCurrency to true when currencies are available
      if (newCurrencies && newCurrencies.length > 0) {
        data.notLoadingCurrency = true;
      }
    },
    { immediate: true },
  );

  // Watch for app store initialization and load currencies if needed
  // Watch for notLoadingCurrency to ensure proper UI state
  watch(
    () => data.notLoadingCurrency,
    (newValue) => {
      if (import.meta.env.DEV) console.log("** notLoadingCurrency changed:", newValue);
    },
    { immediate: true },
  );

  /**
   * Curreny most used list.
   */
  const currencyMostUsedListComputed = computed(() => {
    return ["USD", "EUR", "CHF", "CNY", "JPY", "GBP"];
  });

  /**
   * Currency filter list. Returns a list of filtered currencies or a string if no matches are found.
   *  Default returns all items.
   */
  const currencyFilteredList = computed(() => {
    const searchTerm = data.searchCurrency.trim().toLowerCase();

    // Only keep string values using reduce for strict typing
    const allStrings = currencyList.value.reduce((acc: string[], c: any) => {
      if (typeof c === "string") acc.push(c);
      return acc;
    }, []);

    if (searchTerm === "") {
      return allStrings;
    } else {
      const filteredList = allStrings.filter((currency: string) =>
        currency.toLowerCase().includes(searchTerm),
      );

      return filteredList.length === 0
        ? [translate.t("home.components.navbar.topMenu.noResultsFound") as string]
        : filteredList;
    }
  });

  function goToHomeDashboard() {
    data.loading = false;
    globalFiltersStore.setValuesByColumn({
      spends: [],
      suppliers: [],
      parents: [],
      potentials: [],
    });
    analyzeStore.setFinancingsGroupsbyProgram([]);
    analyzeStore.setHarmonizationsGroupsbyProgram([]);

    if (userStore.getGuardURI) {
      userStore.setLastSectionVisitedbyUser(null);
      userStore.setGuardURI(null);
    }

    RedirectSection.sectionTogo();
  }

  function changeCurrencyRate(currencyTo: string, onComplete?: () => void) {
    // Set parameters for conversion request
    data.loading = true;
    const params = {
      currencyTo: currencyTo,
      date: data.currencyDate,
      callbackSuccess: (callbackSuccessData: { result: number }) => {
        // Commit currency amount and target currency to the store
        appStore.setCurrencyAmount(callbackSuccessData.result);
        appStore.setCurrencyTo(currencyTo);
        // AC-05/EF-1 — the rate fetch just succeeded, so clear any prior notice.
        appStore.setCurrencyConversionUnavailable(false);

        // Check memory after change
        memoryMonitorInstance.getMemoryStats();

        // Reload the page if needed
        if (import.meta.env.DEV) console.log("Not reloading the page");
        goToHomeDashboard();

        // Re-enable watchers after navigation is initiated — must come after
        // goToHomeDashboard() so that old components cannot fire stale requests
        onComplete?.();
      },
      callbackError: () => {
        data.loading = false;
        // AC-05/EF-1 — surface "conversion unavailable" to any dashboard
        // watching this flag (e.g. Working Capital) instead of failing silently.
        appStore.setCurrencyConversionUnavailable(true);
        // Re-enable watchers even on error to prevent them from staying disabled
        onComplete?.();
      },
    };
    // Dispatch the currency change action
    homeStore.changeCurrency(params);
  }

  function getMaxDateSpend(
    actionFromUser: boolean,
    spendFileVersionUuid: string,
    onComplete?: () => void,
  ): any {
    try {
      // Validate
      if (StringUtils.isEmpty(spendFileVersionUuid)) {
        throw new Error("Spend file version not found");
      }

      const selectedSpendFileVersion = StringUtils.removeIRI(spendFileVersionUuid);

      const params = {
        selectedSpendFileVersion,
        callbackSuccess: (callbackSuccessData: any) => {
          appStore.setCurrencyDate(callbackSuccessData.endDate);
          data.currencyDate = callbackSuccessData.endDate;

          changeCurrencyRate(data.currency, onComplete);
        },
      };

      homeStore.getMaxDateSpendFileVersion(params);
    } catch (error) {
      data.loading = false;
      // Re-enable watchers even on a synchronous throw, otherwise the guard
      // stays stuck until the safety timeout fires.
      onComplete?.();
      if (import.meta.env.DEV)
        console.error("** Error getting max date spend file version: ", error);
    }
  }

  /**
   * changes to selected currency from the list
   */
  function changeCurrencyStore(currencyTo: string) {
    data.toggleCurrencyDropdown = false;
    data.loading = true;

    // Check memory before change
    const memoryStats = memoryMonitorInstance.getMemoryStats();
    if (import.meta.env.DEV && memoryStats) console.log("** Memory before currency change:", memoryStats);

    // same currency selected
    if (data.currency === currencyTo) {
      data.loading = false;
      if (import.meta.env.DEV) console.log("Same Currency selected.");
      return;
    }

    //If currencyTo is not valid, stop execution
    if (!currencyTo) {
      data.loading = false;
      if (import.meta.env.DEV) console.log("Currency to is not valid.");
      return;
    }

    // Check if currencyFrom and currencyTo are identical (case-insensitive)
    if (data.currencyFrom.toLowerCase() === currencyTo.toLowerCase()) {
      if (import.meta.env.DEV) console.log("Same currency, no API call");
      appStore.setCurrencyAmount(1);
      appStore.setCurrencyTo(currencyTo);
      // AC-05/EF-1 — clear any stale "conversion unavailable" notice: no
      // conversion was attempted here, so there's nothing to be unavailable.
      appStore.setCurrencyConversionUnavailable(false);
      if (import.meta.env.DEV) console.log("** Not reloading the page");

      //-to allow reactivity in variables
      setTimeout(() => {
        goToHomeDashboard();
      }, 1000);
    }
    // Handle case where no valid currency result is found
    else if (currencyTo === "No results found.") {
      data.loading = false;
      if (import.meta.env.DEV) console.log("No valid currency found.");
      return;
    } else {
      changeCurrencyRate(currencyTo);
    }
  }

  async function loadCurrencies() {
    try {
      const currentCurrencies = appStore.getCurrencies;
      if (currentCurrencies.length === 0) {
        await appStore.forceFetchCurrencies(
          () => {
            data.notLoadingCurrency = true;
          },
          (error: any) => {
            if (import.meta.env.DEV) console.error("** Error force loading currencies:", error);
            data.notLoadingCurrency = true;
          },
        );
      } else {
        await appStore.fetchCurrencies(
          () => {
            data.notLoadingCurrency = true;
          },
          (error: any) => {
            if (import.meta.env.DEV) console.error("** Error loading currencies:", error);
            data.notLoadingCurrency = true;
          },
        );
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("** Exception loading currencies:", error);
    }
  }

  return {
    currencyList,
    currencyMostUsedListComputed,
    currencyFilteredList,
    goToHomeDashboard,
    getMaxDateSpend,
    changeCurrencyRate,
    changeCurrencyStore,
    loadCurrencies,
  };
};

export default useCurrencySwitcher;
