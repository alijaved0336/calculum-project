<script setup lang="ts">
import NegotiationCashFlowOpportunityCard from "@/modules/home/entityCard/components/opportunity/NegotiationCashFlowOpportunityCard.vue";
import NegotiationMetricSkeleton from "@/modules/home/entityCard/components/opportunity/NegotiationMetricSkeleton.vue";
import NegotiationSpendVolumeCard from "@/modules/home/entityCard/components/opportunity/NegotiationSpendVolumeCard.vue";
import NegotiationVCardMetricsCard from "@/modules/home/entityCard/components/opportunity/NegotiationVCardMetricsCard.vue";
import type {
  NegotiationCashFlowDisplay,
  NegotiationCashFlowLoading,
  NegotiationCashFlowVCard,
} from "@/modules/home/entityCard/types";

defineProps<{
  vCard: NegotiationCashFlowVCard;
  loading: NegotiationCashFlowLoading;
  cashFlowDisplay: NegotiationCashFlowDisplay;
  programIsRecalculatingComputedValue: boolean;
  forecastProcess: boolean;
  userIsAdmin: boolean;
  useFeatureForecastVolume: boolean;
  potentialTheme: boolean;
  envName: string;
}>();

const emit = defineEmits<{
  "show-modal-forecast": [];
}>();
</script>

<template>
  <div
    v-if="vCard.hasVCard === null"
    class="col-xl-3 col-lg-3"
  >
    <NegotiationMetricSkeleton />
  </div>
  <NegotiationCashFlowOpportunityCard
    v-if="!vCard.vCardEnabled && vCard.hasVCard !== null"
    :v-card="vCard"
    :loading="loading"
    :cash-flow-display="cashFlowDisplay"
    :program-is-recalculating-computed-value="
      programIsRecalculatingComputedValue
    "
    :forecast-process="forecastProcess"
    :env-name="envName"
  >
    <NegotiationSpendVolumeCard
      :loading="loading"
      :cash-flow-display="cashFlowDisplay"
      :program-is-recalculating-computed-value="
        programIsRecalculatingComputedValue
      "
      :forecast-process="forecastProcess"
      :user-is-admin="userIsAdmin"
      :potential-theme="potentialTheme"
      @show-modal-forecast="emit('show-modal-forecast')"
    ></NegotiationSpendVolumeCard>
  </NegotiationCashFlowOpportunityCard>
  <NegotiationVCardMetricsCard
    v-if="vCard.vCardEnabled && vCard.hasVCard !== null"
    :v-card="vCard"
    :loading="loading"
    :cash-flow-display="cashFlowDisplay"
    :program-is-recalculating-computed-value="
      programIsRecalculatingComputedValue
    "
    :forecast-process="forecastProcess"
    :use-feature-forecast-volume="useFeatureForecastVolume"
    :potential-theme="potentialTheme"
    @show-modal-forecast="emit('show-modal-forecast')"
  ></NegotiationVCardMetricsCard>
  <div
    v-if="!vCard.vCardEnabled && vCard.hasVCard === null"
    class="col-xl-3 col-lg-3"
  >
    <NegotiationMetricSkeleton />
  </div>
</template>
