import type {
  CalculateDataEntity,
  CalculationType,
  CalculationTypeValue,
} from "@/modules/home/entityCard/types";
import type { ManualCalculatorFieldErrors } from "@/modules/home/entityCard/composables/useManualCalculatorValidation";
import type { KeyValue, XAxisYAxis } from "@/types";

export type CalculatorNumericChangeEvent = { value: number };

export type CalculatorMinMax = { readonly min: number; readonly max: number };

export type CalculatorImpactAnalysisOption =
  | "chart"
  | "matrix"
  | "calculation"
  | "descriptions";

export interface CalculatorInputsState {
  isManualInputMode: boolean;
  loadingCalculation: boolean;
  calculatorValuesInitialDataIsLoading: boolean;
  calculatorValuesIsSaving: boolean;
  userInputIsDirty: boolean;
  potentialTheme: boolean;
  calculationTypeDropdownIsLoading: boolean;
  calculationTypeDropdownOptions: KeyValue<CalculationType, string>[];
  calculationTypeDropdownOptionSelected:
    | KeyValue<CalculationType, string>
    | undefined;
  calculationTypeDropdownOptionSelectedKey: CalculationType;
  calculatorActionsDropdownOptions: Array<{ key: string; text: string }>;
  buyerTermsContractual: number | null;
  buyerChangeInTerms: CalculationTypeValue | null;
  buyerChangeInTermsInput: number | null;
  buyerChangeInTermsMinMaxValues: CalculatorMinMax;
  buyerChangeInTermsResultFormatted: string;
  buyerPriceChangeInput: number | null;
  buyerPriceChangeMinValue: number;
  buyerPriceChangeMaxValue: number;
  buyerPriceChangeResultFormatted: string;
  buyerRebateFormatted: string;
  buyerRebateLabel: string;
  spendVolumeCurrentFrozen: number | null;
  spendVolumeChangeInput: number | null;
  spendVolumeNewFormatted: string;
  supplierCostFormatted: string;
  supplierCostLabel: string;
  supplierCostChangeFormatted: string;
  supplierCostTotalFormatted: string;
  supplierWaccInput: number | null;
  supplierWaccMinMaxValues: CalculatorMinMax;
  supplierTaxRateInput: number | null;
  supplierTaxRateMinMaxValues: CalculatorMinMax;
  vCardPaymentCycleFloat: number | null;
  vCardPaymentCycleFloatMinMaxValues: { min: number };
  vCardSupplierCardCost: number | null;
  vCardSupplierCardCostMinMaxValues: CalculatorMinMax;
  vCardRebate: number | null;
  vCardRebateMinMaxValues: CalculatorMinMax;
  vCardGroupNameFormatted: string;
  scfEarliestDayPaid: number | null;
  scfEarliestDayPaidMinMaxValues: { min: number };
  scfFinancingRate: number | null;
  scfFinancingRateMinMaxValues: CalculatorMinMax;
  scfRate: number | null;
  scfRateMinMaxValues: CalculatorMinMax;
  scfGroupNameFormatted: string;
  manualContractualPaymentTermsInput: number | null;
  manualFieldErrors: ManualCalculatorFieldErrors;
  manualHasInvalidFields: boolean;
  manualCalculateErrorMessage: string | null;
}

export interface CalculatorInputsHandlers {
  calculatorApplyOnClick: () => void;
  calculatorResetToSavedOrDefaultsOnClick: () => void;
  calculatorActionsDropdownOptionOnClick: (e: any) => void;
  calculationTypeDropdownOptionSelectedOnChange: (
    newValue: KeyValue<CalculationType, string>,
  ) => void;
  manualContractualPaymentTermsOnChange: (
    e: CalculatorNumericChangeEvent,
  ) => void;
  buyerChangeInTermsInputOnChange: (e: CalculatorNumericChangeEvent) => void;
  spendVolumeChangeInputOnChange: (e: CalculatorNumericChangeEvent) => void;
  buyerPriceChangeInputOnChange: (e: CalculatorNumericChangeEvent) => void;
  supplierWaccInputOnChange: (e: CalculatorNumericChangeEvent) => void;
  supplierTaxRateInputOnChange: (e: CalculatorNumericChangeEvent) => void;
  vCardPaymentCycleFloatOnChange: (e: CalculatorNumericChangeEvent) => void;
  vCardSupplierCardCostOnChange: (e: CalculatorNumericChangeEvent) => void;
  vCardRebateOnChange: (e: CalculatorNumericChangeEvent) => void;
  scfEarliestDayPaidOnChange: (e: CalculatorNumericChangeEvent) => void;
  scfFinancingRateOnChange: (e: CalculatorNumericChangeEvent) => void;
  scfRateOnChange: (e: CalculatorNumericChangeEvent) => void;
}

export interface CalculatorEconomicProfitState {
  loadingCalculation: boolean;
  showForecastVolume: boolean;
  showVolumes: boolean;
  headerAnnualSpendVolumeFormatted: string;
  buyerAnnualVolumeThousandFormatted: string;
  buyerEconomicProfitFormatted: string;
  buyerEconomicProfitAsPercentFormatted: string;
  buyerEconomicStatusIsGood: boolean | null;
  supplierEconomicProfitFormatted: string;
  supplierEconomicProfitAsPercentFormatted: string;
  supplierEconomicStatusIsGood: boolean | null;
  calculateDataBuyer: CalculateDataEntity | null;
  calculateDataSupplier: CalculateDataEntity | null;
}

export interface CalculatorImpactAnalysisState {
  optionSelected: CalculatorImpactAnalysisOption;
  loadingCalculation: boolean;
  calculateTable: Array<any>;
  calculateDataPaymentTermsImpact: XAxisYAxis;
  calculateDataEconomicProfit: XAxisYAxis;
  calculateDataCashFlow: XAxisYAxis;
  calculateDataPriceImpact: XAxisYAxis;
  calculateDataBuyer: CalculateDataEntity | null;
  calculateDataSupplier: CalculateDataEntity | null;
  supplierTaxRateInput: number | null;
  supplierTaxRateMinMaxValues: CalculatorMinMax;
  supplierWaccInput: number | null;
  supplierWaccMinMaxValues: CalculatorMinMax;
}

export interface CalculatorScenariosSidebarState {
  userInputIsDirty: boolean;
  selectedScenario: string | null;
  someScenarioApiRequest: boolean;
  scenariosByConfig: Array<any>;
}
