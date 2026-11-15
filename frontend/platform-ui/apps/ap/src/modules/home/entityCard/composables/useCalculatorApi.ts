import { ComputedRef, Ref, watch } from "vue";
import type {
  CalculateDataAPIResponse,
  CalculatorInitialDataAPIResponse,
  CalculatorValues,
  DataInterface,
} from "@/modules/home/entityCard/types";
import type { CalculatorFormApi } from "@/modules/home/entityCard/composables/useCalculatorForm";
import {
  buildCalculateDataParams,
  buildCalculateTableParams,
  shouldRunCalculatorNetworkCalls,
  shouldSkipCalculatorActionWhileInitialDataLoading,
} from "@/modules/home/entityCard/utils/calculatorUtils";
import { useEntityCardStore } from "@/stores/entityCard";
import { EntityCard, EntityType } from "@/types";
import { isNullOrUndefined, StringUtils } from "@/utils";

export interface UseCalculatorApiProps {
  companyId: string;
  potentialTheme: boolean;
  programUuid: string;
}

export interface UseCalculatorApiOptions {
  data: DataInterface;
  props: Readonly<UseCalculatorApiProps>;
  translate: { t: (key: string) => string };
  calculateDataData: Ref<CalculateDataAPIResponse["data"] | null>;
  calculatorDefaultTypes: Ref<
    CalculatorInitialDataAPIResponse["data"]["defaultTypes"] | null
  >;
  calculatorSavedValues: Ref<CalculatorValues | null>;
  calculatorValuesInitialDataIsLoading: Ref<boolean>;
  getCurrency: () => string;
  getCurrencyRate: () => number;
  useFeaturePaymentTermsvsPrice: Ref<boolean> | ComputedRef<boolean>;
  tabsDataTabSelected: ComputedRef<EntityCard.TabsData | null>;
  spendVolumeCurrentFrozen: Ref<number | null>;
  form: CalculatorFormApi;
  onInitialDataLoaded: () => void;
  initManualModeDefaults: () => void;
  postSpendsBySupplierAndButProgram: () => void;
}

const useCalculatorApi = (options: UseCalculatorApiOptions) => {
  const {
    data,
    props,
    translate,
    calculateDataData,
    calculatorDefaultTypes,
    calculatorSavedValues,
    calculatorValuesInitialDataIsLoading,
    getCurrency,
    getCurrencyRate,
    useFeaturePaymentTermsvsPrice,
    tabsDataTabSelected,
    spendVolumeCurrentFrozen,
    form,
    onInitialDataLoaded,
    initManualModeDefaults,
    postSpendsBySupplierAndButProgram,
  } = options;

  const entityCardStore = useEntityCardStore();

  function getCalculateTableAPIRead() {
    try {
      if (isNullOrUndefined(form.supplierTaxRateInput.value)) {
        throw new Error("Tax Rate is missing.");
      }

      if (isNullOrUndefined(form.supplierWaccInput.value)) {
        throw new Error(
          `WACC is missing. wacc: ${form.supplierWaccInput.value}`,
        );
      }

      const pIri = props.programUuid;

      if (
        !form.isManualInputMode.value &&
        StringUtils.isNullUndefinedOrEmpty(pIri)
      ) {
        throw new Error(`Program id is missing. programUuid: ${pIri}`);
      }

      const programUUID = form.isManualInputMode.value
        ? undefined
        : StringUtils.removeIRI(pIri);

      if (
        StringUtils.isNullUndefinedOrEmpty(
          form.calculationTypeDropdownOptionSelectedKey.value,
        )
      ) {
        throw new Error(
          `Calculation type is missing. calculationType: ${form.calculationTypeDropdownOptionSelectedKey.value}`,
        );
      }

      data.loadingMatrix = true;

      const params = buildCalculateTableParams({
        additionalFieldValues: form.getAdditionalFieldValues(),
        calculationType: form.calculationTypeDropdownOptionSelectedKey.value,
        currency: getCurrency(),
        currencyRate: getCurrencyRate(),
        level: data.levelType,
        supplierTaxRate: form.supplierTaxRateInput.value ?? 0,
        supplierUUID: props.companyId,
        supplierWacc: form.supplierWaccInput.value ?? 0,
        isManualInputMode: form.isManualInputMode.value,
        contractualPaymentTerms:
          form.manualContractualPaymentTermsInput.value ?? 0,
        configUUID: data.spendConfigurationUuid,
        programUUID,
        spendVolumeChange: form.spendVolumeChangeInput.value,
      });

      entityCardStore.postGetCalculateData({
        ...params,
        callbackSuccess: (callbackSuccessData: {
          data: any;
          success: boolean;
        }) => {
          if (callbackSuccessData.data.emptyValues) {
            data.calculateTable = [];
          } else {
            data.calculateTable = callbackSuccessData.data;
          }

          data.loadingMatrix = false;
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error("** (getCalculateTable)", callbackErrorData);
          }

          data.loadingMatrix = false;
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("** (getCalculateTable)", error);
      }

      data.loadingMatrix = false;
    }
  }

  function calculatorGetInitialDataAPIRead() {
    const pIri = props.programUuid;

    if (StringUtils.isNullUndefinedOrEmpty(pIri)) {
      if (import.meta.env.DEV) {
        console.error(
          "** (calculatorGetInitialData) Program id is missing. programUuid:",
          pIri,
        );
      }

      return;
    }

    const programUUID = StringUtils.removeIRI(pIri);

    calculatorValuesInitialDataIsLoading.value = true;

    const params: {
      supplierUUID: string;
      configUUID: string;
      programUUID: string;
      level: EntityType;
    } = {
      supplierUUID: props.companyId,
      configUUID: data.spendConfigurationUuid,
      programUUID,
      level: data.levelType,
    };

    entityCardStore.calculatorGetInitialData({
      ...params,
      callbackSuccess: (
        callbackSuccessData: CalculatorInitialDataAPIResponse,
      ) => {
        calculatorDefaultTypes.value =
          callbackSuccessData.data?.defaultTypes ?? null;

        calculatorSavedValues.value =
          callbackSuccessData.data?.calculatorSavedValues ?? null;

        calculatorValuesInitialDataIsLoading.value = false;

        onInitialDataLoaded();
      },
      callbackError: (callbackErrorData: any) => {
        if (import.meta.env.DEV) {
          console.error("** (calculatorGetInitialData)", callbackErrorData);
        }

        calculatorValuesInitialDataIsLoading.value = false;
      },
    });
  }

  function getCalculateDataAPIRead() {
    try {
      if (
        shouldSkipCalculatorActionWhileInitialDataLoading(
          calculatorValuesInitialDataIsLoading.value,
        )
      ) {
        if (import.meta.env.DEV) {
          console.log(
            "Skipping API call - calculator still loading initial data",
          );
        }
        return;
      }

      if (isNullOrUndefined(form.buyerChangeInTermsInput.value)) {
        form.buyerChangeInTermsInput.value = 0;
      }

      if (isNullOrUndefined(form.buyerPriceChangeInput.value)) {
        form.buyerPriceChangeInput.value = 0;
      }

      if (isNullOrUndefined(form.supplierTaxRateInput.value)) {
        form.supplierTaxRateInput.value = 0;
      }

      if (isNullOrUndefined(form.supplierWaccInput.value)) {
        form.supplierWaccInput.value = 0;
      }

      const pIri = props.programUuid;

      if (
        !form.isManualInputMode.value &&
        StringUtils.isNullUndefinedOrEmpty(pIri)
      ) {
        throw new Error(`Program id is missing. programUuid: ${pIri}`);
      }

      const programUUID = form.isManualInputMode.value
        ? undefined
        : StringUtils.removeIRI(pIri);

      if (
        StringUtils.isNullUndefinedOrEmpty(
          form.calculationTypeDropdownOptionSelectedKey.value,
        ) ||
        !form.calculationTypeIsValid(
          form.calculationTypeDropdownOptionSelectedKey.value,
        )
      ) {
        throw new Error(
          `Calculation type is missing. calculationType: ${form.calculationTypeDropdownOptionSelectedKey.value}`,
        );
      }

      data.loadingCalculation = true;

      const params = buildCalculateDataParams({
        additionalFieldValues: form.getAdditionalFieldValues(),
        calculationType: form.calculationTypeDropdownOptionSelectedKey.value,
        changeInTerms: form.buyerChangeInTermsInput.value ?? 0,
        currency: getCurrency(),
        currencyRate: getCurrencyRate(),
        level: data.levelType,
        priceChange: form.buyerPriceChangeInput.value ?? 0,
        supplierTaxRate: form.supplierTaxRateInput.value ?? 0,
        supplierUUID: props.companyId,
        supplierWacc: form.supplierWaccInput.value ?? 0,
        isManualInputMode: form.isManualInputMode.value,
        contractualPaymentTerms:
          form.manualContractualPaymentTermsInput.value ?? 0,
        configUUID: data.spendConfigurationUuid,
        programUUID,
        spendVolumeChange: form.spendVolumeChangeInput.value,
      });

      entityCardStore.postGetCalculateData({
        ...params,
        callbackSuccess: (callbackSuccessData: CalculateDataAPIResponse) => {
          calculateDataData.value = callbackSuccessData.data;
          data.forecastVolumeApplied =
            callbackSuccessData.forecastVolumeApplied;

          if (props.potentialTheme) {
            form.freezeSpendVolumeCurrentIfNeeded();
          }

          data.loadingCalculation = false;

          if (form.isManualInputMode.value) {
            form.manualCalculateErrorMessage.value = null;
          }
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error("** (getCalculateData)", callbackErrorData);
          }

          data.loadingCalculation = false;

          if (form.isManualInputMode.value) {
            form.manualCalculateErrorMessage.value =
              translate.t("error.server400");
          }
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("** (getCalculateData)", error);
      }

      data.loadingCalculation = false;

      if (form.isManualInputMode.value) {
        form.manualCalculateErrorMessage.value = translate.t("error.server400");
      }
    }
  }

  watch(tabsDataTabSelected, () => {
    if (props.potentialTheme) {
      spendVolumeCurrentFrozen.value = null;
    }

    calculatorGetInitialDataAPIRead();
  });

  watch(calculatorValuesInitialDataIsLoading, (newValue) => {
    if (newValue === true) {
      data.loadingCalculation = true;
    }
  });

  function initCalls() {
    if (!shouldRunCalculatorNetworkCalls(useFeaturePaymentTermsvsPrice.value)) {
      return;
    }

    if (form.isManualInputMode.value) {
      initManualModeDefaults();
    } else {
      postSpendsBySupplierAndButProgram();
    }
  }

  function callDatasAPIRead() {
    if (shouldRunCalculatorNetworkCalls(useFeaturePaymentTermsvsPrice.value)) {
      getCalculateDataAPIRead();
      getCalculateTableAPIRead();
    }
  }

  return {
    getCalculateTableAPIRead,
    calculatorGetInitialDataAPIRead,
    getCalculateDataAPIRead,
    initCalls,
    callDatasAPIRead,
  };
};

export default useCalculatorApi;
