<script setup lang="ts">
import { computed } from "vue";
import EntityCardTextDashes from "@/modules/home/entityCard/components/EntityCardTextDashes.vue";

const props = defineProps<{
  dashesId?: string;
  entityCharacteristics: Record<string, any>;
  buyerLeverage: {
    isLoading: boolean;
  };
}>();

const emit = defineEmits<{
  "show-modal-buyer-leverage": [];
}>();

const buyerLeverageMlevelByGradeLevelText = computed(() => {
  switch (props.entityCharacteristics.buyerLeverage?.description) {
    case "Low":
      return 1;
    case "Medium":
      return 2;
    case "High":
      return 3;
    default:
      return 0;
  }
});
</script>

<template>
  <div class="col-xl-3 col-lg-3">
    <EntityCardTextDashes
      :id="dashesId"
      :grade-level-text="
        entityCharacteristics.buyerLeverage?.description ?? 'N/A'
      "
      :has-advanced-tooltip="true"
      :key-pop-over="'entityOpportunityBuyerLeverage'"
      :level="buyerLeverageMlevelByGradeLevelText"
      :level-color="entityCharacteristics.buyerLeverage?.color"
      :loading="buyerLeverage.isLoading"
      :show-details="true"
      :title="$t('home.entityCard.buyerLeverageMateriality')"
      :tooltip-text="$t('home.entityCard.buyerLeverageTooltip')"
      :total-levels="3"
      :unique-identifier="'popover-opportunity-entitycard-buyer-leverage-materiality'"
      @show-modal-details="emit('show-modal-buyer-leverage')"
    ></EntityCardTextDashes>
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
</style>
