import { Ref } from "vue";
import type {
  CalculateDataAPIResponse,
  CalculationType,
  DataInterface,
} from "@/modules/home/entityCard/types";
import type { CalculatorFormApi } from "@/modules/home/entityCard/composables/useCalculatorForm";
import {
  buildCalculatorSaveParams,
  type CalculatorSaveParams,
  shouldSkipCalculatorActionWhileInitialDataLoading,
} from "@/modules/home/entityCard/utils/calculatorUtils";
import { useEntityCardStore } from "@/stores/entityCard";
import { KeyValue } from "@/types";
import { StringUtils } from "@/utils";

export interface UseCalculatorScenariosProps {
  companyId: string;
  programUuid: string;
}

export interface UseCalculatorScenariosToast {
  success: (message: string) => void;
  error: (message: string) => void;
}

export interface UseCalculatorScenariosOptions {
  data: DataInterface;
  props: Readonly<UseCalculatorScenariosProps>;
  translate: { t: (key: string) => string };
  toast: UseCalculatorScenariosToast;
  calculateDataData: Ref<CalculateDataAPIResponse["data"] | null>;
  calculatorValuesInitialDataIsLoading: Ref<boolean>;
  calculatorValuesIsSaving: Ref<boolean>;
  userInputIsDirty: Ref<boolean>;
  form: CalculatorFormApi;
}

const useCalculatorScenarios = (options: UseCalculatorScenariosOptions) => {
  const {
    data,
    props,
    translate,
    toast,
    calculateDataData,
    calculatorValuesInitialDataIsLoading,
    calculatorValuesIsSaving,
    userInputIsDirty,
    form,
  } = options;

  const entityCardStore = useEntityCardStore();

  function validateAndPrepareSave(): string | null {
    if (
      shouldSkipCalculatorActionWhileInitialDataLoading(
        calculatorValuesInitialDataIsLoading.value,
      )
    ) {
      if (import.meta.env.DEV) {
        console.log("Skipping save - calculator still loading initial data");
      }
      return null;
    }

    const pIri = props.programUuid;

    if (StringUtils.isNullUndefinedOrEmpty(pIri)) {
      if (import.meta.env.DEV) {
        console.error(
          "** (calculatorSaveOnClick) Program id is missing. programUuid:",
          pIri,
        );
      }

      return null;
    }

    const programUUID = StringUtils.removeIRI(pIri);

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

    return programUUID;
  }

  function assembleCalculatorSaveParams(
    programUUID: string,
    withNewScenario: boolean,
  ): CalculatorSaveParams {
    return buildCalculatorSaveParams({
      additionalFieldValues: form.getAdditionalFieldValues(),
      calculationType: form.calculationTypeDropdownOptionSelectedKey.value,
      changeInTerms: form.buyerChangeInTermsInput.value ?? 0,
      priceChange: form.buyerPriceChangeInput.value ?? 0,
      supplierTaxRate: form.supplierTaxRateInput.value ?? 0,
      supplierWacc: form.supplierWaccInput.value ?? 0,
      spendVolumeChange: form.spendVolumeChangeInput.value,
      supplierUUID: props.companyId,
      configUUID: data.spendConfigurationUuid,
      programUUID,
      level: data.levelType,
      name: withNewScenario ? data.newScenarioModalTitle : "",
      scenarioId: data.selectedScenario,
    });
  }

  function saveScenarioUpdate(params: CalculatorSaveParams): void {
    const findScenarioSelected = data.scenariosByConfig.find(
      (scenario) => scenario["@id"] === data.selectedScenario,
    );

    if (findScenarioSelected) {
      params.name = findScenarioSelected.name;
    }

    data.deletingScenario = true;
    entityCardStore.calculatorUpdateScenario({
      ...params,
      callbackSuccess: () => {
        toast.success(translate.t("global.savedScenario"));
        data.deletingScenario = false;
        userInputIsDirty.value = false;

        calculatorValuesIsSaving.value = false;
        data.showNewScenarioModalTitle = false;
        data.newScenarioModalTitle = "";
        getScenariosByConfig();
      },
      callbackError: () => {
        data.deletingScenario = false;
        toast.error(translate.t("global.errorSavingData"));

        calculatorValuesIsSaving.value = false;
      },
    });
  }

  function saveNewScenario(params: CalculatorSaveParams): void {
    data.someScenarioApiRequest = true;
    entityCardStore.calculatorSaveNewScenario({
      ...params,
      callbackSuccess: (callbackSuccessData: { success: boolean }) => {
        toast.success(translate.t("global.savedScenario"));
        data.someScenarioApiRequest = false;
        userInputIsDirty.value = false;

        calculatorValuesIsSaving.value = false;
        data.showNewScenarioModalTitle = false;
        data.newScenarioModalTitle = "";
        getScenariosByConfig();
      },
      callbackError: (callbackErrorData: any) => {
        if (import.meta.env.DEV) {
          console.error("** (calculatorSaveData)", callbackErrorData);
        }
        data.someScenarioApiRequest = false;
        toast.error(translate.t("global.errorSavingData"));

        calculatorValuesIsSaving.value = false;
      },
    });
  }

  function saveCalculatorData(params: CalculatorSaveParams): void {
    entityCardStore.calculatorSaveData({
      ...params,
      callbackSuccess: (callbackSuccessData: { success: boolean }) => {
        toast.success(translate.t("global.savedScenario"));
        data.someScenarioApiRequest = false;
        userInputIsDirty.value = false;

        calculatorValuesIsSaving.value = false;
        data.showNewScenarioModalTitle = false;
        data.newScenarioModalTitle = "";
        getScenariosByConfig();
      },
      callbackError: (callbackErrorData: any) => {
        if (import.meta.env.DEV) {
          console.error("** (calculatorSaveData)", callbackErrorData);
        }
        data.someScenarioApiRequest = false;
        toast.error(translate.t("global.errorSavingData"));

        calculatorValuesIsSaving.value = false;
      },
    });
  }

  function calculatorSaveOnClick(
    withNewScenario: boolean = false,
    updateScenario: boolean = false,
  ) {
    try {
      const programUUID = validateAndPrepareSave();

      if (programUUID === null) {
        return;
      }

      form.ensureDefaultCalculatorInputs();

      calculatorValuesIsSaving.value = true;

      const params = assembleCalculatorSaveParams(programUUID, withNewScenario);

      if (updateScenario && !withNewScenario) {
        saveScenarioUpdate(params);
      } else if (withNewScenario && !updateScenario) {
        saveNewScenario(params);
      } else {
        saveCalculatorData(params);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("** (calculatorSaveOnClick)", error);
      }

      calculatorValuesIsSaving.value = false;
    }
  }

  function getScenariosByConfig() {
    data.scenariosByConfig = [];
    data.someScenarioApiRequest = true;

    const params = {
      companyId: data.spendConfigurationUuid,
      level: data.levelType,
      callbackSuccess: (callbackSuccessData: any) => {
        data.scenariosByConfig = callbackSuccessData["hydra:member"];
        data.someScenarioApiRequest = false;
        const totalItems = callbackSuccessData["hydra:totalItems"];
        data.newScenarioModalTitle = `Scenario ${totalItems + 1}`;
      },
      callbackError: () => {
        data.someScenarioApiRequest = false;
      },
    };

    entityCardStore.getScenariosByConfig(params);
  }

  function deleteScenario(id: string) {
    data.deletingScenario = true;
    const params = {
      scenarioId: id,
      callbackSuccess: (callbackSuccessData: any) => {
        if (data.selectedScenario === id) {
          data.selectedScenario = null;
          form.calculatorResetToSavedOrDefaultsOnClick();
        }
        getScenariosByConfig();
        data.deletingScenario = false;
      },
      callbackError: () => {
        toast.error(translate.t("error.server400"));
        data.deletingScenario = false;
      },
    };

    entityCardStore.deleteScenario(params);
  }

  function fnSetSelectedScenario(scenarioSelected: any) {
    try {
      if (data.selectedScenario === scenarioSelected["@id"]) {
        data.selectedScenario = null;
        form.calculatorResetToSavedOrDefaultsOnClick();
        return;
      }
      data.selectedScenario = scenarioSelected["@id"];
      calculateDataData.value = scenarioSelected.calculatedData;
      data.calculateTable = scenarioSelected.calculatedTable;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("** (fnSetSelectedScenario)", error);
      }
      toast.error(translate.t("error.server400"));
    }

    const optionSelectedValue = form.calculationTypeDropdownLabelByKey(
      scenarioSelected.calculationType,
    );

    const optionSelected: KeyValue<CalculationType, string> = {
      key: scenarioSelected.calculationType,
      value: optionSelectedValue ?? "",
    };

    form.calculationTypeDropdownOptionSelectedSet(optionSelected);

    form.supplierWaccSet(
      scenarioSelected.supplierWacc,
      scenarioSelected.calculationType,
    );
    form.supplierTaxRateSet(
      scenarioSelected.supplierTaxRate,
      scenarioSelected.calculationType,
    );

    form.supplierWaccInputSet();
    form.supplierTaxRateInputSet();

    form.buyerChangeInTermsInputOnChange({
      value: scenarioSelected.changeInTerms,
    });
    form.buyerPriceChangeSet(
      scenarioSelected.priceChange,
      scenarioSelected.calculationType,
    );
    form.buyerPriceChangeInputSet();

    form.scfEarliestDayPaidSet(scenarioSelected.earliestDayPaid);
    form.scfFinancingRateSet(scenarioSelected.financingRate);
    form.scfRateSet(scenarioSelected.scfRate);

    form.vCardPaymentCycleFloatSet(scenarioSelected.paymentCycleFloat);
    form.vCardSupplierCardCostSet(scenarioSelected.supplierCardCost);
    form.vCardRebateOnChange({ value: scenarioSelected.rebate * 100 });

    form.spendVolumeChangeInput.value =
      scenarioSelected.spendVolumeChange ?? 0;

    userInputIsDirty.value = false;
  }

  return {
    getScenariosByConfig,
    deleteScenario,
    calculatorSaveOnClick,
    fnSetSelectedScenario,
  };
};

export default useCalculatorScenarios;
