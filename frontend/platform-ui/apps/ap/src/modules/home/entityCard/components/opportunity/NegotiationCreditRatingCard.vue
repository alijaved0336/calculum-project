<script setup lang="ts">
import { computed } from "vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import EntityCardTextArc from "@/modules/home/entityCard/components/EntityCardTextArc.vue";
import InformationCircleSvg from "@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue";
import { entityCRlevelByGradeLevelText } from "@/modules/home/entityCard/utils";
import { isNullOrUndefined } from "@/utils";

const props = defineProps<{
  combined: boolean;
  useFeatureCreditRating: boolean;
  creditData: Record<string, any> | null;
  entityCharacteristics: Record<string, any>;
}>();

const emit = defineEmits<{
  "show-modal-credit-rating": [];
  "show-modal-credit-rating-and-buyer-leverage": [];
}>();

const entityCRlevelByGradeLevelTextComputed = computed(() => {
  if (isNullOrUndefined(props.creditData?.supplier)) {
    return 0;
  }

  return entityCRlevelByGradeLevelText(
    props.creditData?.supplier?.adaScoreDescription ?? "",
  );
});
</script>

<template>
  <div class="col-xl-3 col-lg-3">
    <div
      v-if="combined"
      class="card shadow-none"
    >
      <div class="card-body d-flex flex-column gap-5">
        <div class="row mb-3">
          <div class="col-12 col-lg-12">
            <h5 class="text-base text-capitalize font-bold">
              {{ $t("global.companyCreditRating") }}
              <CalculumTooltipIcon
                :info-text="$t('home.overview.overallCreditScore')"
                :advanced-tooltip-class="true"
                unique-identifier="popover-opportunity-entitycard-credit-rating"
                key-pop-over="entityOpportunityCompanyCreditRating"
              ></CalculumTooltipIcon>
            </h5>
          </div>
          <div class="col-12 col-lg-12">
            <span class="text-4xl font-bold">{{
              creditData?.supplier?.adaScoreRef ?? "N/A"
            }}</span>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-12 col-lg-12">
            <h5 class="text-base text-capitalize font-bold">
              {{ $t("global.buyerLeverageMateriality") }}
              <CalculumTooltipIcon
                :info-text="$t('home.entityCard.buyerLeverageTooltip')"
                :advanced-tooltip-class="true"
                unique-identifier="popover-opportunity-entitycard-buyer-leverage-materiality"
                key-pop-over="entityOpportunityBuyerLeverage"
              ></CalculumTooltipIcon>
            </h5>
          </div>
          <div class="col-12 col-lg-12">
            <span class="text-4xl font-bold">{{
              entityCharacteristics?.buyerLeverage?.description ?? "N/A"
            }}</span>
          </div>
        </div>
        <div class="row mt-auto">
          <div
            class="col-12 col-lg-12 d-flex align-items-center-justify-content-end"
          >
            <button
              class="btn-text d-flex ml-auto text-sm text-capitalize text-gray-500"
              type="button"
              @click="emit('show-modal-credit-rating-and-buyer-leverage')"
            >
              <span>{{ $t("home.entityCard.showDetails") }}</span>
              <InformationCircleSvg
                class="mr-0 icon-svg fill-current my-auto"
              ></InformationCircleSvg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <EntityCardTextArc
      v-else
      :grade-level-text="creditData?.supplier?.adaScoreDescription ?? ''"
      :key-pop-over="'entityOpportunityCompanyCreditRating'"
      :letter-grade="creditData?.supplier?.adaScoreRef ?? ''"
      :level="entityCRlevelByGradeLevelTextComputed"
      :loading="false"
      :source="creditData?.supplier?.source ?? ''"
      :title="$t('global.companyCreditRating')"
      :tooltip-text="$t('home.overview.overallCreditScore')"
      :unique-identifier="'popover-opportunity-entitycard-credit-rating'"
      :use-feature-credit-rating="useFeatureCreditRating"
      @show-modal-details="emit('show-modal-credit-rating')"
    ></EntityCardTextArc>
  </div>
</template>

<style lang="scss" scoped>
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 240px;
  width: 100%;
}

.card-body {
  padding: 24px;
}

.icon-svg {
  height: 15px;
}
</style>
