import { defineStore } from "pinia";
import { secureStorage } from "@/services/pinia/index";
import * as App from "@/services/app/api/index";

// Types
interface CountryInfo {
  "@id": string;
  "@type": string;
  code: string;
  alpha3Code: string;
  localizedName: string;
}

interface CurrencyInfo {
  "@id": string;
  "@type": string;
  code: string;
  localizedName: string;
}

interface AppState {
  countries: CountryInfo[] | null;
  currencies: CurrencyInfo[] | null;
  isIdle: boolean;
  timeInactivity: string;
  automaticLogout: boolean;
  currencyFrom: string;
  currencyTo: string;
  currencyAmount: number;
  currencyDate: string;
  // AC-05/EF-1 — set when the last currency-rate fetch failed, so dashboards
  // (e.g. Working Capital) can show a "conversion unavailable" notice.
  currencyConversionUnavailable: boolean;
}

export const useAppStore = defineStore("app", {
  state: (): AppState => ({
    countries: null,
    currencies: null,
    isIdle: false,
    timeInactivity: "",
    automaticLogout: false,
    currencyFrom: "USD",
    currencyTo: "USD",
    currencyAmount: 1,
    currencyDate: "",
    currencyConversionUnavailable: false,
  }),

  getters: {
    getCountries: (state): CountryInfo[] => {
      return state.countries !== null && state.countries.length > 0
        ? state.countries
        : [];
    },
    getCurrencies: (state): string[] => {
      return state.currencies !== null && state.currencies !== undefined && state.currencies.length > 0
        ? state.currencies.map((c) => c.code)
        : [];
    },
    getCurrencieswithId: (state): any => {
      return state.currencies !== null && state.currencies !== undefined && state.currencies.length > 0
        ? state.currencies
        : [];
    },
    getIsIdle: (state): boolean => state.isIdle,
    getTimeInactivity: (state): string => state.timeInactivity,
    getInactivityBoolean: (state): boolean => state.automaticLogout,
    getCurrencyFrom: (state): string => state.currencyFrom,
    getCurrencyTo: (state): string => {
      // Ensure we always have a default value
      return state.currencyTo || "USD";
    },
    getCurrencyAmount: (state): number => state.currencyAmount,
    getCurrencyDate: (state): string => state.currencyDate,
    getCurrencyConversionUnavailable: (state): boolean => state.currencyConversionUnavailable,

    getAppVersion: (): string => {
      return `Version: ${process.env.PACKAGE_VERSION} - ${process.env.PACKAGE_VERSION_DATE}`;
    },
    getOnlyAppVersion: (): string => {
      return process.env.PACKAGE_VERSION || "";
    },
    getOnlyReleaseDate: (): string => {
      return process.env.PACKAGE_VERSION_DATE || "";
    },
  },

  actions: {
    setCountries(countries: any[] | null) {
      if (!countries) {
        this.countries = null;
        return;
      }
      const mappedData = countries.map((country) => ({
        "@id": country["@id"],
        "@type": country["@type"],
        code: country.code,
        alpha3Code: country.alpha3Code,
        localizedName: country.localizedName || "",
      }));
      mappedData.sort((a, b) => a.localizedName.localeCompare(b.localizedName));
      this.countries = mappedData;
    },
    setCurrencies(currencies: CurrencyInfo[]) {
      this.currencies = currencies;
    },

    // Initialize default currency values
    initializeDefaultCurrencies() {
      if (!this.currencyFrom || this.currencyFrom.trim() === '') {
        this.currencyFrom = "USD";
      }
      if (!this.currencyTo || this.currencyTo.trim() === '') {
        this.currencyTo = "USD";
      }
      if (this.currencyAmount === 0 || this.currencyAmount === null || this.currencyAmount === undefined) {
        this.currencyAmount = 1;
      }
    },

    // --- Refactored fetchCountries and helpers ---
    async fetchCountries(
      callbackSuccess?: (countries: CountryInfo[]) => void,
      callbackError?: (error: any) => void,
    ) {
      if (this.countries && this.countries.length > 0) {
        this._handleSuccess(this.countries, callbackSuccess);
        return;
      }
      try {
        const response = await App.getCountries();
        this._processCountriesResponse(
          response,
          callbackSuccess,
          callbackError,
        );
      } catch (error) {
        this._handleError(error, callbackError);
      }
    },
    _handleSuccess(
      data: CountryInfo[],
      callback?: (data: CountryInfo[]) => void,
    ) {
      if (callback) callback(data);
    },
    _handleSuccessCurrencies(
      data: CurrencyInfo[],
      callback?: (data: CurrencyInfo[]) => void,
    ) {
      if (callback) callback(data);
    },
    _handleError(error: any, callback?: (error: any) => void) {
      if (callback) callback(error);
    },
    _processCountriesResponse(
      response: any,
      callbackSuccess?: (countries: CountryInfo[]) => void,
      callbackError?: (error: any) => void,
    ) {
      if (response.success) {
        const apiData = response.data["hydra:member"];
        if (apiData && apiData.length > 0) {
          this.setCountries(apiData);
          this._handleSuccess(this.countries!, callbackSuccess);
        } else {
          this.setCountries([]);
          this._handleSuccess([], callbackSuccess);
        }
      } else {
        this._handleError(response, callbackError);
      }
    },
    // --- End refactor ---

    async getIndustries(
      callbackSuccess?: (industries: any[], hasMore?: boolean) => void,
      callbackError?: (error: any) => void,
      params?: { name?: string; page?: number },
    ) {
      try {
        const response = await App.getIndustries(params);
        if (response.success) {
          const items = response.data["hydra:member"] ?? [];
          const hasMore = !!response.data["hydra:view"]?.["hydra:next"];
          if (callbackSuccess) callbackSuccess(items, hasMore);
        } else if (callbackError) callbackError(response);
      } catch (error) {
        if (callbackError) callbackError(error);
      }
    },

    async fetchCurrencies(
      callbackSuccess?: (currencies: CurrencyInfo[]) => void,
      callbackError?: (error: any) => void,
    ) {
      if (this.currencies && this.currencies.length > 0) {
        this._handleSuccessCurrencies(this.currencies, callbackSuccess);
        return;
      }
      try {
        const response = await App.getCurrencies();
        this._processCurrenciesResponse(
          response,
          callbackSuccess,
          callbackError,
        );
      } catch (error) {
        this._handleError(error, callbackError);
      }
    },

    // Force reload currencies from API (ignoring cache)
    async forceFetchCurrencies(
      callbackSuccess?: (currencies: CurrencyInfo[]) => void,
      callbackError?: (error: any) => void,
    ) {
      try {
        if (import.meta.env.DEV) console.log('** Force fetching currencies from API...');
        const response = await App.getCurrencies();
        this._processCurrenciesResponse(
          response,
          callbackSuccess,
          callbackError,
        );
      } catch (error) {
        this._handleError(error, callbackError);
      }
    },
    _processCurrenciesResponse(
      response: any,
      callbackSuccess?: (currencies: CurrencyInfo[]) => void,
      callbackError?: (error: any) => void,
    ) {
      if (response.success) {
        const apiData = response.data["hydra:member"];
        if (apiData && apiData.length > 0) {
          this.setCurrencies(apiData);
          this.initializeDefaultCurrencies(); // Initialize default values
          this._handleSuccessCurrencies(this.currencies!, callbackSuccess);
        } else {
          this.setCurrencies([]);
          this.initializeDefaultCurrencies(); // Initialize default values
          this._handleSuccessCurrencies([], callbackSuccess);
        }
      } else {
        this._handleError(response, callbackError);
      }
    },

    async fetchCountryCompanyIdTypes(
      countryId: string,
      callbackSuccess?: (data: any) => void,
      callbackError?: (error: any) => void,
    ) {
      try {
        const response = await App.getCountryCompanyIdTypes(countryId);
        if (response.success) {
          if (callbackSuccess) {
            callbackSuccess(response.data["hydra:member"]);
          }
        } else {
          if (callbackError) {
            callbackError(response);
          }
        }
      } catch (error) {
        if (callbackError) {
          callbackError(error);
        }
      }
    },
    async fetchCountryCurrencies(
      countryId: string,
      callbackSuccess?: () => void,
      callbackError?: (error: any) => void,
    ) {
      try {
        const response = await App.getCountryCurrencies(countryId);
        if (response.success) {
          if (callbackSuccess) {
            callbackSuccess();
          }
        } else {
          if (callbackError) {
            callbackError(response);
          }
        }
      } catch (error) {
        if (callbackError) {
          callbackError(error);
        }
      }
    },
    clearStore() {
      this.countries = null;
      this.currencies = null;
    },
    setIsIdle(isIdleBoolean: boolean) {
      this.isIdle = isIdleBoolean;
    },
    setTimeInactivity(timeInactivity: string) {
      this.timeInactivity = timeInactivity;
    },
    setAutomaticLogout(automaticLogout: boolean) {
      this.automaticLogout = automaticLogout;
    },
    setCurrencyFrom(currency: string) {
      this.currencyFrom = currency;
    },
    setCurrencyTo(currency: string) {
      this.currencyTo = currency;
    },
    setCurrencyAmount(currency: number) {
      this.currencyAmount = currency;
    },
    setCurrencyDate(currency: string) {
      this.currencyDate = currency;
    },
    setCurrencyConversionUnavailable(unavailable: boolean) {
      this.currencyConversionUnavailable = unavailable;
    },
  },
  persist: {
    storage: secureStorage,
    key: "ada-app",
  },
});

export type { CountryInfo, CurrencyInfo };
