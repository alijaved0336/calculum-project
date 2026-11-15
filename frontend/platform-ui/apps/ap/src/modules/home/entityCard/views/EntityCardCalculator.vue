<!--
Payment Terms vs Price
--><template>
<CalculumLoading v-if="deletingScenario" :modal="true"></CalculumLoading>
<CalculumModal v-if="showNewScenarioModalTitle" :title="'Scenario name'" :showClose="true" :size="'sm'" @close="showNewScenarioModalTitle = false">
  <template v-slot:modalContent>
    <div class="row">
      <div class="col-12">
        <div class="form-group">
          <label for="newScenarioModalTitle">
            <input class="form-control required" id="newScenarioModalTitle" :type="'text'" name="newScenarioModalTitle" v-model="newScenarioModalTitle" :placeholder="'Write the title of the new scenario'"/><span>{{ 'Scenario name' }}<sup></sup></span>
          </label>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="showNewScenarioModalTitle = false"><span>{{ $t('button.cancel') }}</span></button>
    <button class="btn btn-primary font-md w-fit mb-4" id="save-new-scenario-btn" style="z-index: 1;" @click="calculatorSaveOnClick(true)"><span v-if="!someScenarioApiRequest">{{ 'Save' }}</span><span class="spinner-border spinner-border-sm" v-if="someScenarioApiRequest" role="status" aria-hidden="true"></span></button>
  </template>
</CalculumModal>
<ModalCalculatorPTImpactOnProfit v-if="modalCalculatorPTImpactOnProfitIsShowing" :buyer-actual-days-paid-by-buyer-formatted="buyerActualDaysPaidByBuyerFormatted" :buyer-change-in-terms-input="buyerChangeInTermsInput" :buyer-change-in-terms-result-formatted="buyerChangeInTermsResultFormatted" :buyer-float-formatted="buyerFloatFormatted" :buyer-price-change-formatted="buyerPriceChangeInputFormatted" :buyer-price-change-result-formatted="buyerPriceChangeResultFormatted" :buyer-rebate-formatted="buyerRebateFormatted" :buyer-rebate-label="buyerRebateLabel" :buyer-terms-contractual="buyerTermsContractual" :loading-calculation="loadingCalculation" :supplier-actual-days-payment-received-supplier-formatted="supplierActualDaysPaymentReceivedSupplierFormatted" :supplier-cost-change-formatted="supplierCostChangeFormatted" :supplier-cost-formatted="supplierCostFormatted" :supplier-cost-label="supplierCostLabel" :supplier-cost-total-formatted="supplierCostTotalFormatted" :supplier-potential-days-financed-formatted="supplierPotentialDaysFinancedFormatted" @close="modalCalculatorPTImpactOnProfitIsShowing = false"></ModalCalculatorPTImpactOnProfit>
<div class="row" v-if="!useFeaturePaymentTermsvsPrice">
  <TeaserView :teaser="'entityCardCalculator'"></TeaserView>
</div>
<CalculatorSpendTabsBar
  :tabs="tabs"
  :selected-tab-index="selectedTabIndex"
  :show-scenarios="showScenarios"
  :is-manual-input-mode="isManualInputMode"
  :loading-spends="loadingSpends"
  :buyer-has-empty-values="buyerHasEmptyValues"
  :use-feature-payment-termsvs-price="useFeaturePaymentTermsvsPrice"
  @select-tab="entityCardNegotiationTabsOnTabSelect"
  @toggle-scenarios="showScenarios = !showScenarios"
></CalculatorSpendTabsBar>
<CalculatorEmptyState
  v-if="showTabsInfo && useFeaturePaymentTermsvsPrice"
  :buyer-tax-rate-is-empty="buyerTaxRateIsEmpty"
  :buyer-wacc-is-empty="buyerWaccIsEmpty"
></CalculatorEmptyState>
<template v-else>
  <div class="row">
    <div class="div" :class="{ 'col-10': showScenarios, 'col-12': !showScenarios }">
      <div class="row mb-3" v-if="useFeaturePaymentTermsvsPrice">
        <CalculatorInputsCard
          :state="calculatorInputsState"
          :handlers="calculatorInputsHandlers"
          @apply="calculatorApplyOnClick"
          @undo="calculatorResetToSavedOrDefaultsOnClick"
          @show-details="modalCalculatorPTImpactOnProfitIsShowing = true"
        ></CalculatorInputsCard>
        <CalculatorEconomicProfitCard
          :state="calculatorEconomicProfitState"
        ></CalculatorEconomicProfitCard>
      </div>
      <CalculatorImpactAnalysis
        v-if="useFeaturePaymentTermsvsPrice"
        :state="calculatorImpactAnalysisState"
        @select-chart="impactAnalysisOptionSelectedOnChange('chart')"
        @update:option-selected="impactAnalysisOptionSelected = $event"
        @apply="calculatorApplyOnClick"
        @supplier-tax-rate-input-changed="supplierTaxRateInputOnChange"
        @supplier-wacc-input-changed="supplierWaccInputOnChange"
      ></CalculatorImpactAnalysis>
    </div>
    <CalculatorScenariosSidebar
      v-if="showScenarios && !isManualInputMode"
      :state="calculatorScenariosSidebarState"
      @new-scenario="showNewScenarioModalTitle = true"
      @update-scenario="calculatorSaveOnClick(false, true)"
      @set-selected-scenario="fnSetSelectedScenario"
      @delete-scenario="deleteScenario"
    ></CalculatorScenariosSidebar>
  </div>
</template>
</template>

<script setup lang="ts">
import {
  computed,
  ComputedRef,
  reactive,
  ref,
  Ref,
  toRefs,
  watch,
} from "vue";

import {
  CalculateDataAPIResponse,
  CalculateDataEntity,
  CalculatorInitialDataAPIResponse,
  CalculatorValues,
} from "@/modules/home/entityCard/types";
import { EntityType, XAxisYAxis } from "@/types";
import { DataInterface } from "@/modules/home/entityCard/types/index";

import {
  FormatData,
  isNullOrUndefined,
  NumberUtils,
  StringUtils,
} from "@/utils";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import { useAppStore } from "@/stores/app";

import { useUser } from "@/composables";
import CalculatorEmptyState from "@/modules/home/entityCard/components/calculator/CalculatorEmptyState.vue";
import CalculatorEconomicProfitCard from "@/modules/home/entityCard/components/calculator/CalculatorEconomicProfitCard.vue";
import CalculatorImpactAnalysis from "@/modules/home/entityCard/components/calculator/CalculatorImpactAnalysis.vue";
import CalculatorInputsCard from "@/modules/home/entityCard/components/calculator/CalculatorInputsCard.vue";
import CalculatorScenariosSidebar from "@/modules/home/entityCard/components/calculator/CalculatorScenariosSidebar.vue";
import CalculatorSpendTabsBar from "@/modules/home/entityCard/components/calculator/CalculatorSpendTabsBar.vue";
import type {
  CalculatorEconomicProfitState,
  CalculatorImpactAnalysisOption,
  CalculatorImpactAnalysisState,
  CalculatorInputsHandlers,
  CalculatorInputsState,
  CalculatorScenariosSidebarState,
} from "@/modules/home/entityCard/components/calculator/calculator-view-types";
import ModalCalculatorPTImpactOnProfit from "@/modules/home/entityCard/components/modals/ModalCalculatorPTImpactOnProfit.vue";
import TeaserView from "@/modules/components/teaser/TeaserView.vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { CalculumLoading } from "@ada/design-system";
import useCalculatorSpendTabs from "@/modules/home/entityCard/composables/useCalculatorSpendTabs";
import useCalculatorForm, {
  type CalculatorFormCrossActions,
} from "@/modules/home/entityCard/composables/useCalculatorForm";
import useCalculatorApi from "@/modules/home/entityCard/composables/useCalculatorApi";
import useCalculatorScenarios from "@/modules/home/entityCard/composables/useCalculatorScenarios";
import {
  hasBuyerEmptyValues,
  isBuyerTaxRateEmpty,
  isBuyerWaccEmpty,
  mapCalculatorChartRows,
  shouldShowTabsInfo,
} from "@/modules/home/entityCard/utils/calculatorUtils";

defineOptions({ name: "EntityCardCalculator" });

const props = withDefaults(
  defineProps<{
    companyId: string;
    companyType: EntityType;
    country: string;
    creditData: Record<string, any>;
    entityCharacteristics: Record<string, any>;
    entityDetails: Record<string, any>;
    isLoadingEntityCard?: boolean;
    overviewTabEventUUID?: string;
    programData: Record<string, any>;
    programIsPendingRecalculation?: boolean;
    programIsRecalculating?: boolean;
    potentialTheme?: boolean;
    programTarget?: string;
    programUuid: string;
    retrieveAllSpends: Record<string, any>;
  }>(),
  {
    isLoadingEntityCard: false,
    overviewTabEventUUID: "",
    programIsPendingRecalculation: false,
    programIsRecalculating: false,
    potentialTheme: false,
    programTarget: "",
  },
);

const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
const toast = useToast();
const { useFeaturePaymentTermsvsPrice, useFeatureForecastVolume } =
  useUser();

const data = reactive<DataInterface>({
  tabsData: [],
  spendProgramConfigs: [],
  levelType: props.companyType,
  selectedTabIndex: 0,
  allSpendsTab: false,
  tabs: [],
  spendConfigurationUuid: "",
  belongtoProgram: false,
  loadingCalculation: true,
  loadingMatrix: true,
  loadingSpends: true,
  calculateTable: [],
  showNewScenarioModalTitle: false,
  newScenarioModalTitle: "",
  showScenarios: false,
  scenariosByConfig: [],
  selectedScenario: null,
  someScenarioApiRequest: true,
  deletingScenario: false,
  forecastVolumeApplied: false,
});

const {
  deletingScenario,
  loadingCalculation,
  loadingSpends,
  newScenarioModalTitle,
  selectedTabIndex,
  showNewScenarioModalTitle,
  showScenarios,
  someScenarioApiRequest,
  tabs,
} = toRefs(data);

let currencyRate: number = useAppStore().getCurrencyAmount;

let currency = useAppStore().getCurrencyTo;

const calculatorDefaultTypes: Ref<
  CalculatorInitialDataAPIResponse["data"]["defaultTypes"] | null
> = ref(null);

const calculatorSavedValues: Ref<CalculatorValues | null> = ref(null);

const calculatorValuesIsSaving: Ref<boolean> = ref(false);

const calculatorValuesInitialDataIsLoading: Ref<boolean> = ref(true);

const calculateDataData: Ref<CalculateDataAPIResponse["data"] | null> =
  ref(null);

const userInputIsDirty: Ref<boolean> = ref(false);

const cross: CalculatorFormCrossActions = {
  callDatasAPIRead: () => {},
  applySelectedScenario: () => {},
  calculatorSaveOnClick: () => {},
};

// useCalculatorSpendTabs must be constructed before useCalculatorApi
// because both watch tabsDataTabSelected and API reads spend-config uuid
// written by spend-tabs (B2 review warning).
const spendTabs = useCalculatorSpendTabs({
  data,
  props,
  translate,
});

const form = useCalculatorForm({
  data,
  props,
  translate,
  calculateDataData,
  calculatorDefaultTypes,
  calculatorSavedValues,
  calculatorValuesInitialDataIsLoading,
  userInputIsDirty,
  cross,
});

const scenarios = useCalculatorScenarios({
  data,
  props,
  translate,
  toast,
  calculateDataData,
  calculatorValuesInitialDataIsLoading,
  calculatorValuesIsSaving,
  userInputIsDirty,
  form,
});

const calculatorApi = useCalculatorApi({
  data,
  props,
  translate,
  calculateDataData,
  calculatorDefaultTypes,
  calculatorSavedValues,
  calculatorValuesInitialDataIsLoading,
  getCurrency: () => currency,
  getCurrencyRate: () => currencyRate,
  useFeaturePaymentTermsvsPrice,
  tabsDataTabSelected: spendTabs.tabsDataTabSelected,
  spendVolumeCurrentFrozen: form.spendVolumeCurrentFrozen,
  form,
  onInitialDataLoaded: () => {
    form.calculatorResetToSavedOrDefaultsOnClick();
    scenarios.getScenariosByConfig();
  },
  initManualModeDefaults: () => form.initManualModeDefaults(),
  postSpendsBySupplierAndButProgram:
    spendTabs.postSpendsBySupplierAndButProgram,
});

cross.callDatasAPIRead = calculatorApi.callDatasAPIRead;
cross.applySelectedScenario = scenarios.fnSetSelectedScenario;
cross.calculatorSaveOnClick = scenarios.calculatorSaveOnClick;

const {
  buyerChangeInTermsInput,
  calculatorApplyOnClick,
  calculatorResetToSavedOrDefaultsOnClick,
  isManualInputMode,
  supplierTaxRateInputOnChange,
  supplierWaccInputOnChange,
} = form;

const {
  calculatorSaveOnClick,
  deleteScenario,
  fnSetSelectedScenario,
} = scenarios;

const { entityCardNegotiationTabsOnTabSelect } = spendTabs;

const showTabsInfo = computed(() =>
  shouldShowTabsInfo({
    isManualInputMode: form.isManualInputMode.value,
    calculatorValuesInitialDataIsLoading:
      calculatorValuesInitialDataIsLoading.value,
    loadingCalculation: data.loadingCalculation,
    loadingSpends: data.loadingSpends,
    buyerHasEmptyValues: buyerHasEmptyValues.value,
  }),
);

const modalCalculatorPTImpactOnProfitIsShowing = ref(false);

const calculateDataBuyer: ComputedRef<CalculateDataEntity | null> =
  computed(() => {
    const buyerData = calculateDataData.value?.data?.buyer;

    if (isNullOrUndefined(buyerData)) {
      return null;
    }

    return {
      ...buyerData,
      economicProfit: NumberUtils.round(buyerData.economicProfit, {
        precision: 2,
      }),
    };
  });

const buyerAnnualVolume: ComputedRef<number | null> = computed(() => {
  const annualVolume = calculateDataBuyer.value?.annualVolume;

  if (isNullOrUndefined(annualVolume)) {
    return null;
  }

  return NumberUtils.round(annualVolume, {
    precision: 2,
  });
});

const buyerAnnualVolumeThousandFormatted: ComputedRef<string> = computed(
  () => {
    if (isNullOrUndefined(buyerAnnualVolume.value)) {
      return translate.t("global.notAvailable");
    }

    return NumberUtils.addThousandsSeparator(buyerAnnualVolume.value);
  },
);

const buyerAnnualVolumeFormatted: ComputedRef<string> = computed(() => {
  if (isNullOrUndefined(buyerAnnualVolume.value)) {
    return translate.t("global.notAvailable");
  }

  return StringUtils.formatBigNumbers(buyerAnnualVolume.value);
});

const buyerEconomicProfitFormatted: ComputedRef<string> = computed(() => {
  const economicProfit = calculateDataBuyer.value?.economicProfit;

  if (isNullOrUndefined(economicProfit)) {
    return translate.t("global.notAvailable");
  }

  return StringUtils.formatBigNumbers(economicProfit);
});

const buyerEconomicStatusIsGood: ComputedRef<boolean | null> = computed(
  () => {
    const economicProfit = calculateDataBuyer.value?.economicProfit;

    if (
      isNullOrUndefined(economicProfit) ||
      typeof economicProfit !== "number"
    ) {
      return null;
    }

    return economicProfit >= 0;
  },
);

const buyerFloatFormatted: ComputedRef<string> = computed(() =>
  isNullOrUndefined(calculateDataBuyer.value?.float)
    ? translate.t("global.notAvailable")
    : `${calculateDataBuyer.value?.float}`,
);

const buyerActualDaysPaidByBuyerFormatted: ComputedRef<string> = computed(
  () =>
    isNullOrUndefined(calculateDataBuyer.value?.actualDaysPaidByBuyer)
      ? translate.t("global.notAvailable")
      : `${calculateDataBuyer.value?.actualDaysPaidByBuyer}`,
);

const buyerEmptyValues: ComputedRef<Partial<
  CalculateDataAPIResponse["data"]["emptyValues"]
> | null> = computed(() =>
  isNullOrUndefined(calculateDataData.value?.emptyValues)
    ? null
    : calculateDataData.value?.emptyValues,
);

const buyerHasEmptyValues: ComputedRef<boolean> = computed(() =>
  hasBuyerEmptyValues(buyerEmptyValues.value),
);

const buyerTaxRateIsEmpty: ComputedRef<boolean> = computed(() =>
  isBuyerTaxRateEmpty(buyerEmptyValues.value),
);

const buyerWaccIsEmpty: ComputedRef<boolean> = computed(() =>
  isBuyerWaccEmpty(buyerEmptyValues.value),
);

const buyerTermsContractual: ComputedRef<number | null> = computed(() => {
  const terms = calculateDataBuyer.value?.contractual;

  if (isNullOrUndefined(terms)) {
    return null;
  }

  return terms;
});

const buyerChangeInTermsResultFormatted = computed(() =>
  isNullOrUndefined(calculateDataData.value?.data?.buyer?.modeledNewTerms)
    ? "0"
    : `${calculateDataData.value?.data?.buyer?.modeledNewTerms}`,
);

const buyerEconomicProfitAsPercentFormatted: ComputedRef<string> = computed(
  () =>
    isNullOrUndefined(calculateDataBuyer.value?.economicProfitAsPercent)
      ? translate.t("global.notAvailable")
      : FormatData.getNumberWithDecimals(
          (calculateDataBuyer.value?.economicProfitAsPercent ?? 0) * 100,
        ),
);

const buyerRebateFormatted: ComputedRef<string> = computed(() => {
  const rebate = calculateDataBuyer.value?.rebate;

  if (isNullOrUndefined(rebate)) {
    return translate.t("global.notAvailable");
  }

  return formatNumberAsPercentageWithDecimals(rebate);
});

const buyerRebateLabel: ComputedRef<string> = computed(() => {
  switch (form.calculationTypeDropdownOptionSelectedKey.value) {
    case "none":
      return translate.t("global.programImpact");
    case "vCard":
      return translate.t("global.rebate");
    case "scf":
      return translate.t("global.scfImpact");
    default:
      return translate.t("global.impact");
  }
});

const buyerPriceChangeInputFormatted = computed(() =>
  isNullOrUndefined(form.buyerPriceChangeInput.value)
    ? translate.t("global.notAvailable")
    : formatNumberAsPercentageWithDecimals(form.buyerPriceChangeInput.value),
);

const buyerPriceChangeResultFormatted = computed(() => {
  const totalCostChange =
    calculateDataData.value?.data?.buyer?.totalCostChange;

  if (isNullOrUndefined(totalCostChange)) {
    return translate.t("global.notAvailable");
  }

  return formatNumberAsPercentageWithDecimals(totalCostChange ?? 0);
});

const calculateDataSupplier: ComputedRef<CalculateDataEntity | null> =
  computed(() => {
    const supplierData = calculateDataData.value?.data?.supplier;

    if (isNullOrUndefined(supplierData)) {
      return null;
    }

    return {
      ...supplierData,
      economicProfit: NumberUtils.round(supplierData.economicProfit, {
        precision: 2,
      }),
    };
  });

const supplierActualDaysPaymentReceivedSupplierFormatted: ComputedRef<string> =
  computed(() =>
    isNullOrUndefined(
      calculateDataSupplier.value?.actualDaysPaymentReceivedSupplier,
    )
      ? translate.t("global.notAvailable")
      : `${calculateDataSupplier.value?.actualDaysPaymentReceivedSupplier}`,
  );

const supplierPotentialDaysFinancedFormatted: ComputedRef<string> =
  computed(() =>
    isNullOrUndefined(calculateDataSupplier.value?.potentialDaysFinanced)
      ? translate.t("global.notAvailable")
      : `${calculateDataSupplier.value?.potentialDaysFinanced}`,
  );

const supplierEconomicProfitFormatted: ComputedRef<string> = computed(
  () => {
    const economicProfit = calculateDataSupplier.value?.economicProfit;

    if (isNullOrUndefined(economicProfit)) {
      return translate.t("global.notAvailable");
    }

    return StringUtils.formatBigNumbers(economicProfit);
  },
);

const supplierEconomicProfitAsPercentFormatted: ComputedRef<string> =
  computed(() =>
    isNullOrUndefined(calculateDataSupplier.value?.economicProfitAsPercent)
      ? translate.t("global.notAvailable")
      : FormatData.getNumberWithDecimals(
          (calculateDataSupplier.value?.economicProfitAsPercent ?? 0) * 100,
        ),
  );

const supplierEconomicStatusIsGood: ComputedRef<boolean | null> = computed(
  () => {
    const economicProfit = calculateDataSupplier.value?.economicProfit;

    if (isNullOrUndefined(economicProfit)) {
      return null;
    }

    return economicProfit >= 0;
  },
);

const supplierCostFormatted: ComputedRef<string> = computed(() => {
  const cost = calculateDataSupplier.value?.supplierCost;

  if (isNullOrUndefined(cost)) {
    return translate.t("global.notAvailable");
  }

  return formatNumberAsPercentageWithDecimals(cost ?? 0);
});

const supplierCostLabel: ComputedRef<string> = computed(() => {
  switch (form.calculationTypeDropdownOptionSelectedKey.value) {
    case "vCard":
      return translate.t("global.supplierCardCost");
    case "scf":
      return translate.t("global.scfImpact");
    default:
      return translate.t("global.impact");
  }
});

const supplierCostChange: Ref<number | null> = ref(null);

const supplierCostChangeFormatted: ComputedRef<string> = computed(() => {
  if (isNullOrUndefined(supplierCostChange.value)) {
    return translate.t("global.notAvailable");
  }

  return formatNumberAsPercentageWithDecimals(
    supplierCostChange.value ?? 0,
  );
});

watch(calculateDataData, () => {
  supplierCostChange.value = form.buyerPriceChangeInput.value;
});

const supplierCostTotalFormatted: ComputedRef<string> = computed(() => {
  const totalCost = calculateDataSupplier.value?.totalCostChange;

  if (isNullOrUndefined(totalCost)) {
    return translate.t("global.notAvailable");
  }

  return formatNumberAsPercentageWithDecimals(totalCost ?? 0);
});

function ImpactAnalysisOptionIsValid(
  value: string,
): value is CalculatorImpactAnalysisOption {
  return ["chart", "matrix", "calculation"].includes(value);
}

const impactAnalysisOptionSelected: Ref<CalculatorImpactAnalysisOption> =
  ref("chart");

function impactAnalysisOptionSelectedOnChange(
  newValue: CalculatorImpactAnalysisOption,
) {
  if (!ImpactAnalysisOptionIsValid(newValue)) {
    if (import.meta.env.DEV) {
      console.error(
        "** (impactAnalysisOptionSelectedOnChange) Invalid option",
      );
    }

    return;
  }

  impactAnalysisOptionSelected.value = newValue;
}

const calculateDataPaymentTermsImpact: ComputedRef<XAxisYAxis> = computed(
  () => {
    const mapped = mapCalculatorChartRows(
      calculateDataData.value?.charts?.paymentTermsImpact,
    );

    return {
      xAxis: mapped.xAxis,
      yAxis: mapped.yAxis.map((name) =>
        translate.t(
          `home.entityCard.calculator.charts.paymentTermsImpact.${name}`,
        ),
      ),
    };
  },
);

const calculateDataEconomicProfit: ComputedRef<XAxisYAxis> = computed(
  () => {
    const mapped = mapCalculatorChartRows(
      calculateDataData.value?.charts?.economicProfit,
    );

    return {
      xAxis: mapped.xAxis,
      yAxis: mapped.yAxis.map((name) =>
        translate.t(`home.entityCard.calculator.${name}`),
      ),
    };
  },
);

const calculateDataCashFlow: ComputedRef<XAxisYAxis> = computed(() => {
  const mapped = mapCalculatorChartRows(
    calculateDataData.value?.charts?.cashFlow,
  );

  return {
    xAxis: mapped.xAxis,
    yAxis: mapped.yAxis.map((name) =>
      translate.t(`home.entityCard.calculator.${name}`),
    ),
  };
});

const calculateDataPriceImpact: ComputedRef<XAxisYAxis> = computed(() => {
  const mapped = mapCalculatorChartRows(
    calculateDataData.value?.charts?.priceImpact,
  );

  return {
    xAxis: mapped.xAxis,
    yAxis: mapped.yAxis.map((name) =>
      translate.t(`home.entityCard.calculator.${name}`),
    ),
  };
});

function formatNumberAsPercentageWithDecimals(
  number: number,
  options?: {
    maximumFractionDigits?: number;
  },
) {
  const { maximumFractionDigits } = options || {};

  let resultAsPercentage = 0;

  if (!isNullOrUndefined(number)) {
    resultAsPercentage = number * 100;
  }

  return FormatData.getNumberWithDecimals(
    resultAsPercentage,
    maximumFractionDigits,
  );
}

const showForecastVolume = computed(() => {
  return useFeatureForecastVolume.value && data.forecastVolumeApplied;
});

const showVolumes = computed(() => {
  if (
    props.potentialTheme &&
    !isNullOrUndefined(
      calculateDataData.value?.data?.buyer?.newCalculatedSpendVolume,
    )
  ) {
    return true;
  }

  return !isNullOrUndefined(buyerAnnualVolume.value);
});

const headerAnnualSpendVolumeFormatted: ComputedRef<string> = computed(
  () => {
    const backendSpendVolume =
      calculateDataData.value?.data?.buyer?.newCalculatedSpendVolume;

    if (props.potentialTheme && !isNullOrUndefined(backendSpendVolume)) {
      return StringUtils.formatBigNumbers(backendSpendVolume);
    }

    return buyerAnnualVolumeFormatted.value;
  },
);

const calculatorInputsState = computed<CalculatorInputsState>(() => ({
  isManualInputMode: form.isManualInputMode.value,
  loadingCalculation: data.loadingCalculation,
  calculatorValuesInitialDataIsLoading:
    calculatorValuesInitialDataIsLoading.value,
  calculatorValuesIsSaving: calculatorValuesIsSaving.value,
  userInputIsDirty: userInputIsDirty.value,
  potentialTheme: props.potentialTheme,
  calculationTypeDropdownIsLoading:
    form.calculationTypeDropdownIsLoading.value,
  calculationTypeDropdownOptions: form.calculationTypeDropdownOptions.value,
  calculationTypeDropdownOptionSelected:
    form.calculationTypeDropdownOptionSelected.value,
  calculationTypeDropdownOptionSelectedKey:
    form.calculationTypeDropdownOptionSelectedKey.value,
  calculatorActionsDropdownOptions: form.calculatorActionsDropdownOptions,
  buyerTermsContractual: buyerTermsContractual.value,
  buyerChangeInTerms: form.buyerChangeInTerms.value,
  buyerChangeInTermsInput: form.buyerChangeInTermsInput.value,
  buyerChangeInTermsMinMaxValues: form.buyerChangeInTermsMinMaxValues,
  buyerChangeInTermsResultFormatted: buyerChangeInTermsResultFormatted.value,
  buyerPriceChangeInput: form.buyerPriceChangeInput.value,
  buyerPriceChangeMinValue: form.buyerPriceChangeMinValue,
  buyerPriceChangeMaxValue: form.buyerPriceChangeMaxValue,
  buyerPriceChangeResultFormatted: buyerPriceChangeResultFormatted.value,
  buyerRebateFormatted: buyerRebateFormatted.value,
  buyerRebateLabel: buyerRebateLabel.value,
  spendVolumeCurrentFrozen: form.spendVolumeCurrentFrozen.value,
  spendVolumeChangeInput: form.spendVolumeChangeInput.value,
  spendVolumeNewFormatted: form.spendVolumeNewFormatted.value,
  supplierCostFormatted: supplierCostFormatted.value,
  supplierCostLabel: supplierCostLabel.value,
  supplierCostChangeFormatted: supplierCostChangeFormatted.value,
  supplierCostTotalFormatted: supplierCostTotalFormatted.value,
  supplierWaccInput: form.supplierWaccInput.value,
  supplierWaccMinMaxValues: form.supplierWaccMinMaxValues,
  supplierTaxRateInput: form.supplierTaxRateInput.value,
  supplierTaxRateMinMaxValues: form.supplierTaxRateMinMaxValues,
  vCardPaymentCycleFloat: form.vCardPaymentCycleFloat.value,
  vCardPaymentCycleFloatMinMaxValues:
    form.vCardPaymentCycleFloatMinMaxValues,
  vCardSupplierCardCost: form.vCardSupplierCardCost.value,
  vCardSupplierCardCostMinMaxValues: form.vCardSupplierCardCostMinMaxValues,
  vCardRebate: form.vCardRebate.value,
  vCardRebateMinMaxValues: form.vCardRebateMinMaxValues,
  vCardGroupNameFormatted: form.vCardGroupNameFormatted.value,
  scfEarliestDayPaid: form.scfEarliestDayPaid.value,
  scfEarliestDayPaidMinMaxValues: form.scfEarliestDayPaidMinMaxValues,
  scfFinancingRate: form.scfFinancingRate.value,
  scfFinancingRateMinMaxValues: form.scfFinancingRateMinMaxValues,
  scfRate: form.scfRate.value,
  scfRateMinMaxValues: form.scfRateMinMaxValues,
  scfGroupNameFormatted: form.scfGroupNameFormatted.value,
  manualContractualPaymentTermsInput:
    form.manualContractualPaymentTermsInput.value,
  manualFieldErrors: form.manualFieldErrors.value,
  manualHasInvalidFields: form.manualHasInvalidFields.value,
  manualCalculateErrorMessage: form.manualCalculateErrorMessage.value,
}));

const calculatorInputsHandlers: CalculatorInputsHandlers = {
  calculatorApplyOnClick: form.calculatorApplyOnClick,
  calculatorResetToSavedOrDefaultsOnClick:
    form.calculatorResetToSavedOrDefaultsOnClick,
  calculatorActionsDropdownOptionOnClick:
    form.calculatorActionsDropdownOptionOnClick,
  calculationTypeDropdownOptionSelectedOnChange:
    form.calculationTypeDropdownOptionSelectedOnChange,
  manualContractualPaymentTermsOnChange:
    form.manualContractualPaymentTermsOnChange,
  buyerChangeInTermsInputOnChange: form.buyerChangeInTermsInputOnChange,
  spendVolumeChangeInputOnChange: form.spendVolumeChangeInputOnChange,
  buyerPriceChangeInputOnChange: form.buyerPriceChangeInputOnChange,
  supplierWaccInputOnChange: form.supplierWaccInputOnChange,
  supplierTaxRateInputOnChange: form.supplierTaxRateInputOnChange,
  vCardPaymentCycleFloatOnChange: form.vCardPaymentCycleFloatOnChange,
  vCardSupplierCardCostOnChange: form.vCardSupplierCardCostOnChange,
  vCardRebateOnChange: form.vCardRebateOnChange,
  scfEarliestDayPaidOnChange: form.scfEarliestDayPaidOnChange,
  scfFinancingRateOnChange: form.scfFinancingRateOnChange,
  scfRateOnChange: form.scfRateOnChange,
};

const calculatorEconomicProfitState = computed<CalculatorEconomicProfitState>(
  () => ({
    loadingCalculation: data.loadingCalculation,
    showForecastVolume: showForecastVolume.value,
    showVolumes: showVolumes.value,
    headerAnnualSpendVolumeFormatted:
      headerAnnualSpendVolumeFormatted.value,
    buyerAnnualVolumeThousandFormatted:
      buyerAnnualVolumeThousandFormatted.value,
    buyerEconomicProfitFormatted: buyerEconomicProfitFormatted.value,
    buyerEconomicProfitAsPercentFormatted:
      buyerEconomicProfitAsPercentFormatted.value,
    buyerEconomicStatusIsGood: buyerEconomicStatusIsGood.value,
    supplierEconomicProfitFormatted: supplierEconomicProfitFormatted.value,
    supplierEconomicProfitAsPercentFormatted:
      supplierEconomicProfitAsPercentFormatted.value,
    supplierEconomicStatusIsGood: supplierEconomicStatusIsGood.value,
    calculateDataBuyer: calculateDataBuyer.value,
    calculateDataSupplier: calculateDataSupplier.value,
  }),
);

const calculatorImpactAnalysisState = computed<CalculatorImpactAnalysisState>(
  () => ({
    optionSelected: impactAnalysisOptionSelected.value,
    loadingCalculation: data.loadingCalculation,
    calculateTable: data.calculateTable,
    calculateDataPaymentTermsImpact: calculateDataPaymentTermsImpact.value,
    calculateDataEconomicProfit: calculateDataEconomicProfit.value,
    calculateDataCashFlow: calculateDataCashFlow.value,
    calculateDataPriceImpact: calculateDataPriceImpact.value,
    calculateDataBuyer: calculateDataBuyer.value,
    calculateDataSupplier: calculateDataSupplier.value,
    supplierTaxRateInput: form.supplierTaxRateInput.value,
    supplierTaxRateMinMaxValues: form.supplierTaxRateMinMaxValues,
    supplierWaccInput: form.supplierWaccInput.value,
    supplierWaccMinMaxValues: form.supplierWaccMinMaxValues,
  }),
);

const calculatorScenariosSidebarState =
  computed<CalculatorScenariosSidebarState>(() => ({
    userInputIsDirty: userInputIsDirty.value,
    selectedScenario: data.selectedScenario,
    someScenarioApiRequest: data.someScenarioApiRequest,
    scenariosByConfig: data.scenariosByConfig,
  }));

calculatorApi.initCalls();
</script>
