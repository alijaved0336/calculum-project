import { computed, ComputedRef, Ref, ref, unref } from "vue";
import { useUser, useCompany } from "@/composables";
import { StringUtils } from "@/utils";
import { calculateForecastValues } from "@/utils/ForecastUtils";
import useNegotiationCashFlowLoaders, {
  type UseNegotiationCashFlowOptions as UseNegotiationCashFlowLoadersOptions,
  type UseNegotiationCashFlowProps,
} from "@/modules/home/entityCard/composables/useNegotiationCashFlowLoaders";
import type {
  NegotiationCashFlowDisplay,
  NegotiationCashFlowLoading,
  NegotiationCashFlowVCard,
  NegotiationForecastModal,
  NegotiationVCard,
} from "@/modules/home/entityCard/types";

export type { UseNegotiationCashFlowProps };

export interface UseNegotiationCashFlowOptions
  extends UseNegotiationCashFlowLoadersOptions {
  showExistsTarget: Ref<boolean>;
  showExistsTargetValue: Ref<string | null>;
  selectedTabIndex: Ref<number>;
  spendFileVersionIdActive: ComputedRef<string>;
}

const useNegotiationCashFlow = (options: UseNegotiationCashFlowOptions) => {
  const {
    props,
    spendUUID,
    showExistsTarget,
    showExistsTargetValue,
    selectedTabIndex,
    spendFileVersionIdActive,
  } = options;

  const { useFeatureVirtualCard, useFeatureForecastVolume } = useUser();
  const { usevCardGroupsEnabled } = useCompany();

  const {
    vCardInfo,
    spend,
    spendDetails,
    potentialCashFlow,
    agreedCashFlow,
    showExistsAgreedValue,
    paymentTermsDescriptions,
    loading,
    fetchCalculatedCashFlow,
    retrieveSpendInk,
    retrieveSupplierSpendInK,
    retrieveSavings,
    getEntityDetails,
    getVcardValue,
    beginCashFlowLoad,
    failVCardInfoLoad,
  } = useNegotiationCashFlowLoaders(options);

  const isModalForeCastShowing = ref(false);
  const forecastProcess = ref(false);

  const hasVCard = computed(() => {
    return vCardInfo.hasVCard;
  });

  /**
   * checks if virtual card is enabled and has at least one spend which qualifies the vcard ui
   */
  const vCardEnabled = computed(() => {
    return (
      useFeatureVirtualCard.value &&
      usevCardGroupsEnabled.value &&
      hasVCard.value
    );
  });

  // Parse potentialCashFlow to big number format
  const potentialCashFlowComputed = computed(() => {
    return StringUtils.formatBigNumbers(potentialCashFlow.realValue);
  });

  // Parse spend volume to big number format
  const spendVolumeComputed = computed(() => {
    return StringUtils.formatBigNumbers(spend.realValue);
  });

  //-Forecast values
  const forecastValues = computed(() => {
    return calculateForecastValues(spend.realValue, spend.forecastVolume);
  });

  const foreCastComputedIfExists = computed(
    () => forecastValues.value.foreCastComputedIfExists,
  );
  const forecastValueComputed = computed(
    () => forecastValues.value.forecastValueComputed,
  );
  const isForeCastPositiveValue = computed(
    () => forecastValues.value.isForeCastPositiveValue,
  );
  const foreCastPercentageComputedBigNumbers = computed(
    () => forecastValues.value.foreCastPercentageComputedBigNumbers,
  );

  //- Validate the role and the value to show the forecast
  const showForecastVolume = computed(() => {
    return useFeatureForecastVolume.value && foreCastComputedIfExists.value;
  });

  const cashFlowDisplay = computed<NegotiationCashFlowDisplay>(() => ({
    showExistsAgreedValue: showExistsAgreedValue.value,
    showExistsTarget: showExistsTarget.value,
    showExistsTargetValue: showExistsTargetValue.value,
    potentialCashFlowComputed: potentialCashFlowComputed.value,
    spendVolumeComputed: spendVolumeComputed.value,
    showForecastVolume: showForecastVolume.value,
    foreCastComputedIfExists: foreCastComputedIfExists.value,
    forecastValueComputed: forecastValueComputed.value,
    isForeCastPositiveValue: isForeCastPositiveValue.value,
    foreCastPercentageComputedBigNumbers:
      foreCastPercentageComputedBigNumbers.value,
  }));

  const vCard = computed<NegotiationCashFlowVCard>(() => ({
    vCardEnabled: vCardEnabled.value,
    hasVCard: hasVCard.value,
    vCardInfo,
  }));

  const contextVCard = computed<NegotiationVCard>(() => ({
    vCardEnabled: vCardEnabled.value,
    hasVCard: hasVCard.value,
  }));

  const cashFlowLoading = computed<NegotiationCashFlowLoading>(() => ({
    potentialCashFlow: loading.potentialCashFlow,
    spendVolume: loading.spendVolume,
    isLoadingVcardInfo: loading.isLoadingVcardInfo,
  }));

  const forecastModal = computed<NegotiationForecastModal>(() => ({
    programUuid: props.programUuid,
    companyId: props.companyId,
    companyType: props.companyType,
    selectedTabIndex: selectedTabIndex.value,
    spendFileVersionIdActive: spendFileVersionIdActive.value,
  }));

  function setForecast(value: any) {
    spend.forecastVolume = value;
  }

  function closeForecast(action: boolean) {
    isModalForeCastShowing.value = false;
    forecastProcess.value = action;
  }

  function showModalForecast() {
    isModalForeCastShowing.value = true;
    forecastProcess.value = false;
  }

  const spendSCF = (type: "onSCF" | "scfAccepted") => {
    if (unref(spendUUID) && selectedTabIndex.value > 0) {
      const selectedSpendUUID = unref(spendUUID);
      const matchingSpend = props.retrieveAllSpends.find(
        (spend: any) => spend.spendUUID === selectedSpendUUID,
      );
      const value = matchingSpend?.[type];

      if (value !== null && value !== undefined) {
        return value;
      }
      return null;
    }
  };

  // Computed property to sync onSCF from entityDetails or selected tab/spend
  const onSCF = computed(() => {
    // If a specific spend tab is selected (not "All Spends")
    const result = spendSCF("onSCF");

    if (result !== null && result !== undefined) {
      return result;
    }
    // Otherwise, use the supplier-level onSCF from entityDetails
    return props.entityDetails?.onSCF ?? null;
  });

  // Computed property for ModalResults - based on scfAccepted from entityDetails
  const scfAcceptedForModal = computed(() => {
    // If a specific spend tab is selected (not "All Spends")
    const result = spendSCF("scfAccepted");
    if (result !== null && result !== undefined) {
      return result;
    }
    // Otherwise, use the supplier-level scfAccepted from entityDetails
    return props.entityDetails?.scfAccepted ?? null;
  });

  return {
    fetchCalculatedCashFlow,
    retrieveSpendInk,
    retrieveSupplierSpendInK,
    retrieveSavings,
    getEntityDetails,
    getVcardValue,
    beginCashFlowLoad,
    failVCardInfoLoad,
    vCardInfo,
    spend,
    spendDetails,
    potentialCashFlow,
    agreedCashFlow,
    showExistsAgreedValue,
    paymentTermsDescriptions,
    loading,
    cashFlowDisplay,
    vCard,
    cashFlowVCard: vCard,
    contextVCard,
    cashFlowLoading,
    forecastModal,
    hasVCard,
    vCardEnabled,
    potentialCashFlowComputed,
    spendVolumeComputed,
    forecastProcess,
    isModalForeCastShowing,
    showModalForecast,
    closeForecast,
    setForecast,
    onSCF,
    scfAcceptedForModal,
    foreCastComputedIfExists,
    forecastValueComputed,
    isForeCastPositiveValue,
    foreCastPercentageComputedBigNumbers,
    showForecastVolume,
  };
};

export default useNegotiationCashFlow;
