import { computed, ComputedRef, ref, Ref, watch } from "vue";
import type {
  CalculateDataAPIResponse,
  CalculationType,
  CalculationTypeValue,
  CalculatorInitialDataAPIResponse,
  CalculatorValues,
  DataInterface,
} from "@/modules/home/entityCard/types";
import {
  createManualCalculatorFieldErrors,
  MANUAL_CALCULATOR_DEFAULTS,
  ManualCalculatorFieldErrors,
  validateManualCalculatorFields,
} from "@/modules/home/entityCard/composables/useManualCalculatorValidation";
import {
  BUYER_CHANGE_IN_TERMS_MIN_MAX,
  BUYER_PRICE_CHANGE_MAX,
  BUYER_PRICE_CHANGE_MIN,
  type CalculatorAdditionalFieldValues,
  clampMin,
  clampNumber,
  isManualInputMode as checkIsManualInputMode,
  SCF_EARLIEST_DAY_PAID_MIN_MAX,
  SCF_FINANCING_RATE_MIN_MAX,
  SCF_RATE_MIN_MAX,
  shouldSkipCalculatorActionWhileInitialDataLoading,
  SUPPLIER_TAX_RATE_MIN_MAX,
  SUPPLIER_WACC_MIN_MAX,
  VCARD_PAYMENT_CYCLE_FLOAT_MIN_MAX,
  VCARD_REBATE_MIN_MAX,
  VCARD_SUPPLIER_CARD_COST_MIN_MAX,
} from "@/modules/home/entityCard/utils/calculatorUtils";
import { KeyValue } from "@/types";
import {
  ArrayUtils,
  isNullOrUndefined,
  NumberUtils,
  StringUtils,
} from "@/utils";

export interface UseCalculatorFormProps {
  potentialTheme: boolean;
  programUuid: string;
}

/**
 * Reverse edges from form → API / scenarios. The shell owns this object and
 * assigns the real methods after those composables exist (no `let x!`).
 */
export interface CalculatorFormCrossActions {
  callDatasAPIRead: () => void;
  applySelectedScenario: (scenario: any) => void;
  calculatorSaveOnClick: (
    withNewScenario?: boolean,
    updateScenario?: boolean,
  ) => void;
}

export interface UseCalculatorFormOptions {
  data: DataInterface;
  props: Readonly<UseCalculatorFormProps>;
  translate: { t: (key: string) => string };
  calculateDataData: Ref<CalculateDataAPIResponse["data"] | null>;
  calculatorDefaultTypes: Ref<
    CalculatorInitialDataAPIResponse["data"]["defaultTypes"] | null
  >;
  calculatorSavedValues: Ref<CalculatorValues | null>;
  calculatorValuesInitialDataIsLoading: Ref<boolean>;
  userInputIsDirty: Ref<boolean>;
  cross: CalculatorFormCrossActions;
}

enum CalculatorUserActions {
  ResetToDefaults = "resetToDefaults",
  Save = "save",
}

const useCalculatorForm = (options: UseCalculatorFormOptions) => {
  const {
    data,
    props,
    translate,
    calculateDataData,
    calculatorDefaultTypes,
    calculatorSavedValues,
    calculatorValuesInitialDataIsLoading,
    userInputIsDirty,
    cross,
  } = options;

  const isManualInputMode = computed(() =>
    checkIsManualInputMode(props.potentialTheme, props.programUuid),
  );

  const manualContractualPaymentTermsInput: Ref<number | null> = ref(null);

  const manualFieldErrors: Ref<ManualCalculatorFieldErrors> = ref(
    createManualCalculatorFieldErrors(),
  );

  const manualCalculateErrorMessage: Ref<string | null> = ref(null);

  const manualHasInvalidFields = computed(() =>
    Object.values(manualFieldErrors.value).some(Boolean),
  );

  function manualContractualPaymentTermsOnChange(e: { value: number }) {
    manualContractualPaymentTermsInput.value = e.value;

    userInputIsDirtySetTrue();
  }

  function initManualModeDefaults(): void {
    buyerChangeInTermsInput.value = MANUAL_CALCULATOR_DEFAULTS.changeInTerms;
    buyerPriceChangeInput.value = MANUAL_CALCULATOR_DEFAULTS.priceChange;
    supplierWaccInput.value = MANUAL_CALCULATOR_DEFAULTS.supplierWacc;
    supplierTaxRateInput.value = MANUAL_CALCULATOR_DEFAULTS.supplierTaxRate;
    manualContractualPaymentTermsInput.value =
      MANUAL_CALCULATOR_DEFAULTS.contractualPaymentTerms;

    freezeSpendVolumeCurrentIfNeeded();

    manualFieldErrors.value = createManualCalculatorFieldErrors();
    manualCalculateErrorMessage.value = null;

    calculatorValuesInitialDataIsLoading.value = false;
    data.loadingSpends = false;
    data.loadingCalculation = false;
    data.loadingMatrix = false;

    userInputIsDirty.value = false;
  }

  const spendVolumeChangeInput: Ref<number | null> = ref(0);
  const spendVolumeCurrentFrozen: Ref<number | null> = ref(null);

  function spendVolumeChangeInputOnChange(e: { value: number }) {
    spendVolumeChangeInput.value = e.value;

    userInputIsDirtySetTrue();
  }

  const buyerAnnualVolume: ComputedRef<number | null> = computed(() => {
    const annualVolume = calculateDataData.value?.data?.buyer?.annualVolume;

    if (isNullOrUndefined(annualVolume)) {
      return null;
    }

    return NumberUtils.round(annualVolume, {
      precision: 2,
    });
  });

  const buyerAnnualVolumeFormatted: ComputedRef<string> = computed(() => {
    if (isNullOrUndefined(buyerAnnualVolume.value)) {
      return translate.t("global.notAvailable");
    }

    return StringUtils.formatBigNumbers(buyerAnnualVolume.value);
  });

  function freezeSpendVolumeCurrentIfNeeded(): void {
    if (
      spendVolumeCurrentFrozen.value === null &&
      !isNullOrUndefined(buyerAnnualVolume.value)
    ) {
      spendVolumeCurrentFrozen.value = buyerAnnualVolume.value;
    }
  }

  const spendVolumeNewFormatted: ComputedRef<string> = computed(() => {
    const newValue =
      calculateDataData.value?.data?.buyer?.newCalculatedSpendVolume;

    return isNullOrUndefined(newValue)
      ? buyerAnnualVolumeFormatted.value
      : StringUtils.formatBigNumbers(newValue);
  });

  function getAdditionalFieldValues(): CalculatorAdditionalFieldValues {
    return {
      vCard: {
        groupName: vCardGroupName.value,
        paymentCycleFloat: vCardPaymentCycleFloat.value,
        rebate: vCardRebate.value,
        supplierCardCost: vCardSupplierCardCost.value,
      },
      scf: {
        earliestDayPaid: scfEarliestDayPaid.value,
        financingRate: scfFinancingRate.value,
        groupName: scfGroupName.value,
        scfRate: scfRate.value,
      },
    };
  }

  const calculatorActionsDropdownOptions = [
    {
      key: CalculatorUserActions.ResetToDefaults,
      text: translate.t("home.entityCard.calculator.resetToDefaults"),
    },
    {
      key: CalculatorUserActions.Save,
      text: translate.t("global.save"),
    },
  ];

  function calculatorActionsDropdownOptionOnClick(e: any): void {
    const key = e.item.key;

    if (key === CalculatorUserActions.ResetToDefaults) {
      if (props.potentialTheme) {
        spendVolumeChangeInput.value = 0;
      }

      calculatorResetToSavedOrDefaultsOnClick();
    } else if (key === CalculatorUserActions.Save) {
      cross.calculatorSaveOnClick();
    }
  }

  function calculatorResetToDefaultsOnClick(): void {
    if (isNullOrUndefined(calculatorDefaultTypes.value)) {
      if (import.meta.env.DEV) {
        console.warn(
          "** (calculatorResetToDefaultsOnClick) - calculatorDefaultTypes is missing",
        );
      }

      return;
    }

    const vCard = calculatorDefaultTypes.value.vCard;
    const sCF = calculatorDefaultTypes.value.scf;
    const none = calculatorDefaultTypes.value.none;

    if (!isNullOrUndefined(none?.changeInTerms)) {
      buyerChangeInTermsSet(none?.changeInTerms, "none");
      buyerPriceChangeSet(none?.priceChange, "none");
      supplierWaccSet(none?.supplierWacc, "none");
      supplierTaxRateSet(none?.supplierTaxRate, "none");
    }

    if (!isNullOrUndefined(sCF) && !isNullOrUndefined(sCF?.additionalFields)) {
      buyerChangeInTermsSet(sCF?.changeInTerms, "scf");
      buyerPriceChangeSet(sCF?.priceChange, "scf");
      supplierWaccSet(sCF?.supplierWacc, "scf");
      supplierTaxRateSet(sCF?.supplierTaxRate, "scf");

      if ("earliestDayPaid" in sCF.additionalFields) {
        scfEarliestDayPaidSet(sCF.additionalFields.earliestDayPaid ?? 0);
      }

      if ("financingRate" in sCF.additionalFields) {
        scfFinancingRateSet(sCF.additionalFields.financingRate ?? 0);
      }

      scfGroupNameSet(sCF.additionalFields.groupName);

      if ("scfRate" in sCF.additionalFields) {
        scfRateSet(sCF.additionalFields.scfRate ?? 0);
      }
    }

    if (
      !isNullOrUndefined(vCard) &&
      !isNullOrUndefined(vCard?.additionalFields)
    ) {
      buyerChangeInTermsSet(vCard?.changeInTerms, "vCard");
      buyerPriceChangeSet(vCard?.priceChange, "vCard");
      supplierWaccSet(vCard?.supplierWacc, "vCard");
      supplierTaxRateSet(vCard?.supplierTaxRate, "vCard");

      vCardGroupNameSet(vCard?.additionalFields?.groupName);

      if ("paymentCycleFloat" in vCard.additionalFields) {
        vCardPaymentCycleFloatSet(
          vCard.additionalFields.paymentCycleFloat ?? 0,
        );
      }

      if ("rebate" in vCard.additionalFields) {
        vCardRebateSet(vCard.additionalFields.rebate ?? 0);
      }

      if ("supplierCardCost" in vCard.additionalFields) {
        vCardSupplierCardCostSet(
          vCard.additionalFields.supplierCardCost ?? 0,
        );
      }
    }

    buyerChangeInTermsInputSet();
    buyerPriceChangeInputSet();
    supplierWaccInputSet();
    supplierTaxRateInputSet();

    userInputIsDirty.value = false;
  }

  function calculatorResetToSavedOrDefaultsOnClick() {
    if (isManualInputMode.value) {
      initManualModeDefaults();
      return;
    }

    if (!StringUtils.isNullUndefinedOrEmpty(data.selectedScenario)) {
      const findScenarioSelected = data.scenariosByConfig.find(
        (scenario) => scenario["@id"] === data.selectedScenario,
      );
      if (findScenarioSelected) {
        data.selectedScenario = null;
        cross.applySelectedScenario(findScenarioSelected);
        return;
      }
    }

    calculatorResetToDefaultsOnClick();

    const vCard = calculatorDefaultTypes.value?.vCard;
    const sCF = calculatorDefaultTypes.value?.scf;
    const none = calculatorDefaultTypes.value?.none;

    if (!isNullOrUndefined(none?.changeInTerms)) {
      calculationTypeDropdownOptionAdd({
        key: "none",
        value: calculationTypeDropdownLabelByKey("none"),
      });

      const optionSelectedValue = calculationTypeDropdownLabelByKey("none");

      if (!isNullOrUndefined(optionSelectedValue)) {
        calculationTypeDropdownOptionSelectedSet({
          key: "none",
          value: optionSelectedValue,
        });
      }
    }

    if (!isNullOrUndefined(sCF)) {
      calculationTypeDropdownOptionAdd({
        key: "scf",
        value: calculationTypeDropdownLabelByKey("scf"),
      });

      const optionSelectedValue = calculationTypeDropdownLabelByKey("scf");

      if (
        !isNullOrUndefined(sCF?.additionalFields) &&
        !isNullOrUndefined(optionSelectedValue)
      ) {
        calculationTypeDropdownOptionSelectedSet({
          key: "scf",
          value: optionSelectedValue,
        });
      }
    }

    if (!isNullOrUndefined(vCard)) {
      calculationTypeDropdownOptionAdd({
        key: "vCard",
        value: calculationTypeDropdownLabelByKey("vCard"),
      });

      const selectedValue = calculationTypeDropdownLabelByKey("vCard");

      if (
        !isNullOrUndefined(vCard?.additionalFields) &&
        !isNullOrUndefined(selectedValue)
      ) {
        calculationTypeDropdownOptionSelectedSet({
          key: "vCard",
          value: selectedValue,
        });
      }
    }

    const calculatorSavedValuesCalculationType =
      calculatorSavedValues.value?.calculationType;

    if (
      !isNullOrUndefined(calculatorSavedValues.value) &&
      !isNullOrUndefined(calculatorSavedValuesCalculationType)
    ) {
      const savedOptionSelectedValue = calculationTypeDropdownLabelByKey(
        calculatorSavedValuesCalculationType,
      );

      if (!isNullOrUndefined(savedOptionSelectedValue)) {
        calculationTypeDropdownOptionAdd({
          key: calculatorSavedValuesCalculationType,
          value: calculationTypeDropdownLabelByKey(
            calculatorSavedValuesCalculationType,
          ),
        });

        calculationTypeDropdownOptionSelectedSet({
          key: calculatorSavedValuesCalculationType,
          value: savedOptionSelectedValue,
        });
      }

      if (
        !isNullOrUndefined(calculatorSavedValues.value.additionalFields) &&
        !StringUtils.isNullUndefinedOrEmpty(
          calculatorSavedValues.value.additionalFields?.groupName,
        )
      ) {
        if (calculatorSavedValuesCalculationType === "vCard") {
          vCardGroupNameSet(
            calculatorSavedValues.value.additionalFields.groupName,
          );

          if (
            "paymentCycleFloat" in
            calculatorSavedValues.value.additionalFields
          ) {
            vCardPaymentCycleFloatSet(
              calculatorSavedValues.value.additionalFields
                .paymentCycleFloat ?? 0,
            );
          }

          if ("rebate" in calculatorSavedValues.value.additionalFields) {
            vCardRebateSet(
              calculatorSavedValues.value.additionalFields.rebate ?? 0,
            );
          }

          if (
            "supplierCardCost" in calculatorSavedValues.value.additionalFields
          ) {
            vCardSupplierCardCostSet(
              calculatorSavedValues.value.additionalFields.supplierCardCost ??
                0,
            );
          }
        } else if (calculatorSavedValuesCalculationType === "scf") {
          if (
            "earliestDayPaid" in calculatorSavedValues.value.additionalFields
          ) {
            scfEarliestDayPaidSet(
              calculatorSavedValues.value.additionalFields.earliestDayPaid ??
                0,
            );
          }

          if (
            "financingRate" in calculatorSavedValues.value.additionalFields
          ) {
            scfFinancingRateSet(
              calculatorSavedValues.value.additionalFields.financingRate ?? 0,
            );
          }

          if ("scfRate" in calculatorSavedValues.value.additionalFields) {
            scfRateSet(
              calculatorSavedValues.value.additionalFields.scfRate ?? 0,
            );
          }

          scfGroupNameSet(
            calculatorSavedValues.value.additionalFields.groupName,
          );
        }
      }

      buyerChangeInTermsSet(
        calculatorSavedValues.value.changeInTerms,
        calculatorSavedValuesCalculationType,
      );

      buyerPriceChangeSet(
        calculatorSavedValues.value.priceChange,
        calculatorSavedValuesCalculationType,
      );

      supplierWaccSet(
        calculatorSavedValues.value.supplierWacc,
        calculatorSavedValuesCalculationType,
      );

      supplierTaxRateSet(
        calculatorSavedValues.value.supplierTaxRate,
        calculatorSavedValuesCalculationType,
      );

      spendVolumeChangeInput.value =
        calculatorSavedValues.value.spendVolume ?? 0;
    }

    buyerChangeInTermsInputSet();
    buyerPriceChangeInputSet();
    supplierWaccInputSet();
    supplierTaxRateInputSet();

    cross.callDatasAPIRead();
  }

  function calculatorApplyOnClick(): void {
    if (
      shouldSkipCalculatorActionWhileInitialDataLoading(
        calculatorValuesInitialDataIsLoading.value,
      )
    ) {
      if (import.meta.env.DEV) {
        console.log("Skipping apply - calculator still loading initial data");
      }
      return;
    }

    if (isManualInputMode.value) {
      const { valid, errors } = validateManualCalculatorFields({
        supplierWacc: supplierWaccInput.value,
        supplierTaxRate: supplierTaxRateInput.value,
        contractualPaymentTerms: manualContractualPaymentTermsInput.value,
        changeInTerms: buyerChangeInTermsInput.value,
        priceChange: buyerPriceChangeInput.value,
      });

      manualFieldErrors.value = errors;

      if (!valid) {
        return;
      }

      manualCalculateErrorMessage.value = null;
    }

    cross.callDatasAPIRead();
  }

  const calculationTypeOptions: CalculationType[] = ["none", "vCard", "scf"];

  function calculationTypeDropdownLabelByKey(
    key: CalculationType,
  ): string | null {
    switch (key) {
      case "none":
        return "No Program";
      case "vCard":
        return "Vcard";
      case "scf":
        return "SCF";
      default:
        return null;
    }
  }

  const calculationTypeDropdownOptions: Ref<
    KeyValue<CalculationType, string>[]
  > = ref([]);

  const calculationTypeDropdownIsLoading: ComputedRef<boolean> = computed(
    () => {
      return (
        calculatorValuesInitialDataIsLoading.value ||
        ArrayUtils.isEmpty(calculationTypeDropdownOptions.value)
      );
    },
  );

  watch(calculatorValuesInitialDataIsLoading, (newValue) => {
    if (newValue === true) {
      calculationTypeDropdownOptions.value = [];
    }
  });

  function calculationTypeDropdownOptionAdd(
    newValue: KeyValue<CalculationType, string | null>,
  ) {
    try {
      if (
        !calculationTypeIsValid(newValue.key) ||
        isNullOrUndefined(newValue.value)
      ) {
        throw new Error(
          `Invalid calculation type. calculationType: ${newValue.key}`,
        );
      }

      const newValueValid: KeyValue<CalculationType, string> = {
        ...newValue,
      } as KeyValue<CalculationType, string>;

      if (isNullOrUndefined(calculationTypeDropdownOptions.value)) {
        calculationTypeDropdownOptions.value = [];

        calculationTypeDropdownOptions.value.push(newValueValid);

        return;
      }

      const dropdownOptionsKeys = calculationTypeDropdownOptions.value.map(
        (option) => option.key,
      );

      if (dropdownOptionsKeys.includes(newValue.key)) {
        return;
      }

      calculationTypeDropdownOptions.value.push(newValueValid);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("** (calculationTypeDropdownOptionAdd)", error);
      }
    }
  }

  const calculationTypeDropdownOptionSelected: Ref<
    KeyValue<CalculationType, string> | undefined
  > = ref();

  function calculationTypeDropdownOptionSelectedSet(
    newValue: KeyValue<CalculationType, string>,
  ) {
    const newValueKey = newValue.key;

    if (
      !isNullOrUndefined(calculationTypeDropdownOptionSelected.value) &&
      calculationTypeDropdownOptionSelected.value.key === newValueKey
    ) {
      return;
    }

    if (!calculationTypeIsValid(newValueKey)) {
      if (import.meta.env.DEV) {
        console.error(
          "** (appliedProgramDropdownOptionSelectedOnChange) Invalid option.",
          newValue,
        );
      }

      const optionSelectedValue = calculationTypeDropdownLabelByKey(
        calculationTypeOptions[0],
      );

      if (!isNullOrUndefined(optionSelectedValue)) {
        calculationTypeDropdownOptionSelected.value = {
          key: calculationTypeOptions[0],
          value: optionSelectedValue,
        };
      }

      return;
    }

    const optionSelectedValue =
      calculationTypeDropdownLabelByKey(newValueKey);

    if (isNullOrUndefined(optionSelectedValue)) {
      if (import.meta.env.DEV) {
        console.error(
          "** (appliedProgramDropdownOptionSelectedOnChange) Invalid option.",
          newValue,
        );
      }

      return;
    }

    calculationTypeDropdownOptionSelected.value = {
      key: newValueKey,
      value: optionSelectedValue,
    };
  }

  const calculationTypeDropdownOptionSelectedKey: ComputedRef<CalculationType> =
    computed(() => {
      return calculationTypeDropdownOptionSelected.value?.key || "none";
    });

  function calculationTypeDropdownOptionSelectedOnChange(
    newValue: KeyValue<CalculationType, string>,
  ) {
    calculationTypeDropdownOptionSelectedSet(newValue);

    calculatorResetToDefaultsOnClick();

    userInputIsDirtySetTrue();
  }

  function calculationTypeIsValid(value: CalculationType): boolean {
    return calculationTypeOptions.includes(value);
  }

  const buyerChangeInTerms: Ref<CalculationTypeValue> = ref({
    none: null,
    vCard: null,
    scf: null,
  });

  const buyerChangeInTermsMinMaxValues = BUYER_CHANGE_IN_TERMS_MIN_MAX;

  function buyerChangeInTermsSet(
    newValue: number | null | undefined,
    calculationType: CalculationType,
  ): void {
    if (isNullOrUndefined(newValue)) {
      return;
    }

    if (isNullOrUndefined(buyerChangeInTerms.value)) {
      buyerChangeInTerms.value = {
        none: null,
        vCard: null,
        scf: null,
      };
    }

    buyerChangeInTerms.value[calculationType] =
      buyerChangeInTermsValidValue(newValue);
  }

  function buyerChangeInTermsValidValue(newValue: number) {
    return clampNumber(
      newValue,
      buyerChangeInTermsMinMaxValues.min,
      buyerChangeInTermsMinMaxValues.max,
    );
  }

  const buyerChangeInTermsInput: Ref<number | null> = ref(null);

  function buyerChangeInTermsInputSet() {
    if (isNullOrUndefined(buyerChangeInTerms.value)) {
      return;
    }

    if (isNullOrUndefined(calculationTypeDropdownOptionSelected.value)) {
      return;
    }

    buyerChangeInTermsInput.value =
      buyerChangeInTerms.value[
        calculationTypeDropdownOptionSelectedKey.value
      ] ?? 0;
  }

  function buyerChangeInTermsInputOnChange(e: { value: number }) {
    if (isNullOrUndefined(calculationTypeDropdownOptionSelectedKey.value)) {
      return;
    }

    buyerChangeInTermsSet(
      e.value,
      calculationTypeDropdownOptionSelectedKey.value,
    );

    buyerChangeInTermsInputSet();

    userInputIsDirtySetTrue();
  }

  const buyerPriceChange: Ref<{ [T in CalculationType]: number | null }> =
    ref({
      none: null,
      vCard: null,
      scf: null,
    });

  const buyerPriceChangeMinValue = BUYER_PRICE_CHANGE_MIN;

  const buyerPriceChangeMaxValue = BUYER_PRICE_CHANGE_MAX;

  function buyerPriceChangeSet(
    newValue: number | null | undefined,
    calculationType: CalculationType,
  ): void {
    if (isNullOrUndefined(newValue)) {
      return;
    }

    if (isNullOrUndefined(buyerPriceChange.value)) {
      buyerPriceChange.value = {
        none: null,
        vCard: null,
        scf: null,
      };
    }

    buyerPriceChange.value[calculationType] =
      buyerPriceChangeValidValue(newValue);
  }

  function buyerPriceChangeValidValue(newValue: number) {
    return clampNumber(
      newValue,
      buyerPriceChangeMinValue,
      buyerPriceChangeMaxValue,
    );
  }

  const buyerPriceChangeInput: Ref<number | null> = ref(null);

  function buyerPriceChangeInputOnChange(e: { value: number }) {
    if (isNullOrUndefined(calculationTypeDropdownOptionSelectedKey.value)) {
      return;
    }

    buyerPriceChangeSet(
      e.value / 100,
      calculationTypeDropdownOptionSelectedKey.value,
    );

    buyerPriceChangeInputSet();

    userInputIsDirtySetTrue();
  }

  function buyerPriceChangeInputSet() {
    if (isNullOrUndefined(buyerPriceChange.value)) {
      return;
    }

    if (isNullOrUndefined(calculationTypeDropdownOptionSelectedKey.value)) {
      return;
    }

    buyerPriceChangeInput.value =
      buyerPriceChange.value[
        calculationTypeDropdownOptionSelectedKey.value
      ] ?? 0;
  }

  const supplierTaxRate: Ref<CalculationTypeValue> = ref({
    none: null,
    vCard: null,
    scf: null,
  });

  const supplierTaxRateMinMaxValues = SUPPLIER_TAX_RATE_MIN_MAX;

  function supplierTaxRateSet(
    newValue: number | null | undefined,
    calculationType: CalculationType,
  ) {
    if (isNullOrUndefined(newValue)) {
      return;
    }

    if (isNullOrUndefined(supplierTaxRate.value)) {
      supplierTaxRate.value = {
        none: null,
        vCard: null,
        scf: null,
      };
    }

    supplierTaxRate.value[calculationType] =
      supplierTaxRateValidValue(newValue);
  }

  function supplierTaxRateValidValue(newValue: number) {
    return clampNumber(
      newValue,
      supplierTaxRateMinMaxValues.min,
      supplierTaxRateMinMaxValues.max,
    );
  }

  function supplierTaxRateInputOnChange(e: { value: number }) {
    if (isNullOrUndefined(calculationTypeDropdownOptionSelectedKey.value)) {
      return;
    }

    supplierTaxRateSet(
      e.value / 100,
      calculationTypeDropdownOptionSelectedKey.value,
    );

    supplierTaxRateInputSet();

    userInputIsDirtySetTrue();
  }

  const supplierTaxRateInput: Ref<number | null> = ref(null);

  function supplierTaxRateInputSet() {
    if (isNullOrUndefined(supplierTaxRate.value)) {
      return;
    }

    if (isNullOrUndefined(calculationTypeDropdownOptionSelectedKey.value)) {
      return;
    }

    supplierTaxRateInput.value =
      supplierTaxRate.value[calculationTypeDropdownOptionSelectedKey.value] ??
      0;
  }

  const supplierWacc: Ref<CalculationTypeValue> = ref({
    none: null,
    vCard: null,
    scf: null,
  });

  const supplierWaccMinMaxValues = SUPPLIER_WACC_MIN_MAX;

  function supplierWaccSet(
    newValue: number | null | undefined,
    calculationType: CalculationType,
  ) {
    if (isNullOrUndefined(newValue)) {
      return;
    }

    if (isNullOrUndefined(supplierWacc.value)) {
      supplierWacc.value = {
        none: null,
        vCard: null,
        scf: null,
      };
    }

    supplierWacc.value[calculationType] = supplierWaccValidValue(newValue);
  }

  function supplierWaccValidValue(newValue: number) {
    return clampNumber(
      newValue,
      supplierWaccMinMaxValues.min,
      supplierWaccMinMaxValues.max,
    );
  }

  function supplierWaccInputOnChange(e: { value: number }): void {
    if (isNullOrUndefined(calculationTypeDropdownOptionSelectedKey.value)) {
      return;
    }

    supplierWaccSet(
      e.value / 100,
      calculationTypeDropdownOptionSelectedKey.value,
    );

    supplierWaccInputSet();

    userInputIsDirtySetTrue();
  }

  const supplierWaccInput: Ref<number | null> = ref(null);

  function supplierWaccInputSet() {
    if (isNullOrUndefined(supplierWacc.value)) {
      return;
    }

    if (isNullOrUndefined(calculationTypeDropdownOptionSelectedKey.value)) {
      return;
    }

    supplierWaccInput.value =
      supplierWacc.value[calculationTypeDropdownOptionSelectedKey.value] ?? 0;
  }

  const vCardGroupName: Ref<string | null> = ref(null);

  const vCardGroupNameFormatted: ComputedRef<string> = computed(() => {
    if (isNullOrUndefined(vCardGroupName.value) || userInputIsDirty.value) {
      return translate.t("global.custom");
    }

    return vCardGroupName.value;
  });

  function vCardGroupNameSet(newValue: string | null | undefined) {
    if (StringUtils.isNullUndefinedOrEmpty(newValue)) {
      return;
    }

    vCardGroupName.value = newValue;
  }

  const vCardPaymentCycleFloat: Ref<number | null> = ref(null);

  const vCardPaymentCycleFloatMinMaxValues = VCARD_PAYMENT_CYCLE_FLOAT_MIN_MAX;

  function vCardPaymentCycleFloatSet(newValue: number | null): void {
    vCardPaymentCycleFloat.value = clampMin(
      isNullOrUndefined(newValue) ? 0 : newValue,
      vCardPaymentCycleFloatMinMaxValues.min,
    );
  }

  function vCardPaymentCycleFloatOnChange(e: { value: number }): void {
    vCardPaymentCycleFloatSet(e.value);

    userInputIsDirtySetTrue();
  }

  const vCardRebate: Ref<number | null> = ref(null);

  const vCardRebateMinMaxValues = VCARD_REBATE_MIN_MAX;

  function vCardRebateSet(newValue: number | null): void {
    vCardRebate.value = clampNumber(
      isNullOrUndefined(newValue) ? 0 : newValue,
      vCardRebateMinMaxValues.min,
      vCardRebateMinMaxValues.max,
    );
  }

  function vCardRebateOnChange(e: { value: number }): void {
    vCardRebateSet(e.value / 100);

    userInputIsDirtySetTrue();
  }

  const vCardSupplierCardCost: Ref<number | null> = ref(null);

  const vCardSupplierCardCostMinMaxValues = VCARD_SUPPLIER_CARD_COST_MIN_MAX;

  function vCardSupplierCardCostSet(newValue: number | null): void {
    vCardSupplierCardCost.value = clampNumber(
      isNullOrUndefined(newValue) ? 0 : newValue,
      vCardSupplierCardCostMinMaxValues.min,
      vCardSupplierCardCostMinMaxValues.max,
    );
  }

  function vCardSupplierCardCostOnChange(e: { value: number }): void {
    vCardSupplierCardCostSet(e.value / 100);

    userInputIsDirtySetTrue();
  }

  const scfEarliestDayPaid: Ref<number | null> = ref(null);

  const scfEarliestDayPaidMinMaxValues = SCF_EARLIEST_DAY_PAID_MIN_MAX;

  function scfEarliestDayPaidSet(newValue: number | null): void {
    scfEarliestDayPaid.value = clampMin(
      isNullOrUndefined(newValue) ? 0 : newValue,
      scfEarliestDayPaidMinMaxValues.min,
    );
  }

  function scfEarliestDayPaidOnChange(e: { value: number }): void {
    scfEarliestDayPaidSet(e.value);

    userInputIsDirtySetTrue();
  }

  const scfFinancingRate: Ref<number | null> = ref(null);

  const scfFinancingRateMinMaxValues = SCF_FINANCING_RATE_MIN_MAX;

  function scfFinancingRateSet(newValue: number | null): void {
    scfFinancingRate.value = clampNumber(
      isNullOrUndefined(newValue) ? 0 : newValue,
      scfFinancingRateMinMaxValues.min,
      scfFinancingRateMinMaxValues.max,
    );
  }

  function scfFinancingRateOnChange(e: { value: number }): void {
    scfFinancingRateSet(e.value / 100);

    userInputIsDirtySetTrue();
  }

  const scfGroupName: Ref<string | null> = ref(null);

  const scfGroupNameFormatted = computed(() => {
    if (isNullOrUndefined(scfGroupName.value) || userInputIsDirty.value) {
      return translate.t("global.custom");
    }

    return scfGroupName.value;
  });

  function scfGroupNameSet(newValue: string | null | undefined) {
    if (StringUtils.isNullUndefinedOrEmpty(newValue)) {
      return;
    }

    scfGroupName.value = newValue;
  }

  const scfRate: Ref<number | null> = ref(null);

  const scfRateMinMaxValues = SCF_RATE_MIN_MAX;

  function scfRateSet(newValue: number | null): void {
    scfRate.value = clampNumber(
      isNullOrUndefined(newValue) ? 0 : newValue,
      scfRateMinMaxValues.min,
      scfRateMinMaxValues.max,
    );
  }

  function scfRateOnChange(e: { value: number }): void {
    scfRateSet(e.value / 100);

    userInputIsDirtySetTrue();
  }

  function userInputIsDirtySetTrue() {
    userInputIsDirty.value = true;
  }

  function ensureDefaultCalculatorInputs(): void {
    if (isNullOrUndefined(buyerChangeInTermsInput.value)) {
      buyerChangeInTermsInput.value = 0;
    }

    if (isNullOrUndefined(buyerPriceChangeInput.value)) {
      buyerPriceChangeInput.value = 0;
    }

    if (isNullOrUndefined(supplierTaxRateInput.value)) {
      supplierTaxRateInput.value = 0;
    }

    if (isNullOrUndefined(supplierWaccInput.value)) {
      supplierWaccInput.value = 0;
    }
  }

  return {
    isManualInputMode,
    manualContractualPaymentTermsInput,
    manualContractualPaymentTermsOnChange,
    manualFieldErrors,
    manualCalculateErrorMessage,
    manualHasInvalidFields,
    initManualModeDefaults,
    spendVolumeChangeInput,
    spendVolumeCurrentFrozen,
    spendVolumeChangeInputOnChange,
    freezeSpendVolumeCurrentIfNeeded,
    spendVolumeNewFormatted,
    getAdditionalFieldValues,
    calculatorActionsDropdownOptions,
    calculatorActionsDropdownOptionOnClick,
    calculatorResetToDefaultsOnClick,
    calculatorResetToSavedOrDefaultsOnClick,
    calculatorApplyOnClick,
    calculationTypeDropdownLabelByKey,
    calculationTypeDropdownIsLoading,
    calculationTypeDropdownOptions,
    calculationTypeDropdownOptionAdd,
    calculationTypeDropdownOptionSelected,
    calculationTypeDropdownOptionSelectedSet,
    calculationTypeDropdownOptionSelectedKey,
    calculationTypeDropdownOptionSelectedOnChange,
    calculationTypeIsValid,
    buyerChangeInTerms,
    buyerChangeInTermsMinMaxValues,
    buyerChangeInTermsSet,
    buyerChangeInTermsInput,
    buyerChangeInTermsInputSet,
    buyerChangeInTermsInputOnChange,
    buyerPriceChange,
    buyerPriceChangeMinValue,
    buyerPriceChangeMaxValue,
    buyerPriceChangeSet,
    buyerPriceChangeInput,
    buyerPriceChangeInputOnChange,
    buyerPriceChangeInputSet,
    supplierTaxRate,
    supplierTaxRateMinMaxValues,
    supplierTaxRateSet,
    supplierTaxRateInputOnChange,
    supplierTaxRateInput,
    supplierTaxRateInputSet,
    supplierWacc,
    supplierWaccMinMaxValues,
    supplierWaccSet,
    supplierWaccInputOnChange,
    supplierWaccInput,
    supplierWaccInputSet,
    vCardGroupName,
    vCardGroupNameFormatted,
    vCardGroupNameSet,
    vCardPaymentCycleFloat,
    vCardPaymentCycleFloatMinMaxValues,
    vCardPaymentCycleFloatSet,
    vCardPaymentCycleFloatOnChange,
    vCardRebate,
    vCardRebateMinMaxValues,
    vCardRebateSet,
    vCardRebateOnChange,
    vCardSupplierCardCost,
    vCardSupplierCardCostMinMaxValues,
    vCardSupplierCardCostSet,
    vCardSupplierCardCostOnChange,
    scfEarliestDayPaid,
    scfEarliestDayPaidMinMaxValues,
    scfEarliestDayPaidSet,
    scfEarliestDayPaidOnChange,
    scfFinancingRate,
    scfFinancingRateMinMaxValues,
    scfFinancingRateSet,
    scfFinancingRateOnChange,
    scfGroupName,
    scfGroupNameFormatted,
    scfGroupNameSet,
    scfRate,
    scfRateMinMaxValues,
    scfRateSet,
    scfRateOnChange,
    userInputIsDirtySetTrue,
    ensureDefaultCalculatorInputs,
  };
};

export default useCalculatorForm;
export type CalculatorFormApi = ReturnType<typeof useCalculatorForm>;
