<script setup lang="ts">
import NegotiationBuyerLeverageCard from "@/modules/home/entityCard/components/opportunity/NegotiationBuyerLeverageCard.vue";
import NegotiationCreditRatingCard from "@/modules/home/entityCard/components/opportunity/NegotiationCreditRatingCard.vue";
import NegotiationDetailsCard from "@/modules/home/entityCard/components/opportunity/NegotiationDetailsCard.vue";
import NegotiationMetricSkeleton from "@/modules/home/entityCard/components/opportunity/NegotiationMetricSkeleton.vue";
import type {
  EntityCardNegotiation,
  NegotiationVCard,
} from "@/modules/home/entityCard/types";

defineProps<{
  vCard: NegotiationVCard;
  useFeatureCreditRating: boolean;
  creditData: Record<string, any> | null;
  entityCharacteristics: Record<string, any>;
  entityDetails: Record<string, any> | null;
  spendDetails: EntityCardNegotiation["spendDetails"];
  buyerLeverage: {
    isLoading: boolean;
  };
  isLoadingEntityDetails: boolean;
  selectedTabIndex: number;
  companyType: string;
  buyingEntityCountryLabelEntity: string;
  buyingEntityCountryLabelSpend: string;
}>();

const emit = defineEmits<{
  "show-modal-buyer-leverage": [];
  "show-modal-credit-rating": [];
  "show-modal-credit-rating-and-buyer-leverage": [];
}>();
</script>

<template>
  <NegotiationBuyerLeverageCard
    v-if="!vCard.vCardEnabled && vCard.hasVCard !== null"
    dashes-id="buyer-materiality-dashes"
    :entity-characteristics="entityCharacteristics"
    :buyer-leverage="buyerLeverage"
    @show-modal-buyer-leverage="emit('show-modal-buyer-leverage')"
  ></NegotiationBuyerLeverageCard>
  <div
    v-if="vCard.hasVCard === null"
    class="col-xl-3 col-lg-3"
  >
    <NegotiationMetricSkeleton />
  </div>
  <NegotiationCreditRatingCard
    v-else-if="
      vCard.vCardEnabled && useFeatureCreditRating && vCard.hasVCard !== null
    "
    :combined="true"
    :use-feature-credit-rating="useFeatureCreditRating"
    :credit-data="creditData"
    :entity-characteristics="entityCharacteristics"
    @show-modal-credit-rating="emit('show-modal-credit-rating')"
    @show-modal-credit-rating-and-buyer-leverage="
      emit('show-modal-credit-rating-and-buyer-leverage')
    "
  ></NegotiationCreditRatingCard>
  <NegotiationBuyerLeverageCard
    v-else-if="
      vCard.vCardEnabled && !useFeatureCreditRating && vCard.hasVCard !== null
    "
    :entity-characteristics="entityCharacteristics"
    :buyer-leverage="buyerLeverage"
    @show-modal-buyer-leverage="emit('show-modal-buyer-leverage')"
  ></NegotiationBuyerLeverageCard>
  <NegotiationCreditRatingCard
    v-else
    :combined="false"
    :use-feature-credit-rating="useFeatureCreditRating"
    :credit-data="creditData"
    :entity-characteristics="entityCharacteristics"
    @show-modal-credit-rating="emit('show-modal-credit-rating')"
    @show-modal-credit-rating-and-buyer-leverage="
      emit('show-modal-credit-rating-and-buyer-leverage')
    "
  ></NegotiationCreditRatingCard>
  <NegotiationDetailsCard
    :has-v-card="vCard.hasVCard"
    :entity-details="entityDetails"
    :spend-details="spendDetails"
    :is-loading-entity-details="isLoadingEntityDetails"
    :selected-tab-index="selectedTabIndex"
    :company-type="companyType"
    :buying-entity-country-label-entity="buyingEntityCountryLabelEntity"
    :buying-entity-country-label-spend="buyingEntityCountryLabelSpend"
  ></NegotiationDetailsCard>
</template>
