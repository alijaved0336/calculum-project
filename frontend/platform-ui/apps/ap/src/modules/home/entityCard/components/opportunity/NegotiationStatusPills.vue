<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
import PillLabelNumberBadge from "@/modules/components/PillLabelNumberBadge.vue";
import PillLabelNumberBadgeParentSupplierLevel from "@/modules/components/PillLabelNumberBadgeParentSupplierLevel.vue";
import type {
  NegotiationHeaderLoading,
  NegotiationStatusPill,
} from "@/modules/home/entityCard/types";
import type { NegotiationStatus } from "@/types";

defineProps<{
  headerLoading: NegotiationHeaderLoading;
  statusPill: NegotiationStatusPill;
}>();

const emit = defineEmits<{
  "toggle-change-status": [status: NegotiationStatus];
  "toggle-contacted": [status: NegotiationStatus];
}>();
</script>

<template>
  <div
    v-if="!headerLoading.loadingPatchGrid"
    class="ml-10"
  >
    <template
      v-if="
        statusPill.entityCardNegotiationSpendsSpendSelected === null &&
        headerLoading.programIsRecalculatingComputedValue &&
        !headerLoading.forecastProcess
      "
    >
      <div class="contacted-skeleton">
        <Skeleton
          class="skeletons-bg mr-1"
          :shape="'rectangle'"
          :style="{
            width: '100%',
            height: '16px',
            borderRadius: '8px',
          }"
        ></Skeleton>
      </div>
    </template>
    <template
      v-if="
        statusPill.entityCardNegotiationSpendsSpendSelected === null &&
        !headerLoading.programIsRecalculatingComputedValue
      "
    >
      <div class="d-flex align-items-center">
        <span class="mr-2">{{ $t("global.status") }}</span>
        <PillLabelNumberBadgeParentSupplierLevel
          :key="statusPill.pillLabelNumberBadgeKey"
          :label-classes="statusPill.negotiationStatusPillColorClasses"
          :label="statusPill.negotiationStatusFormatted"
          :labels="statusPill.negotiationStatusCodes"
          :has-dropdown="true"
          :has-hover-style="true"
          :validate-belong-to-aplan="statusPill.validateBelongToAplan"
          :negotiation-status="statusPill.negotiationStatus"
          @toggle-change-status="emit('toggle-change-status', $event)"
        ></PillLabelNumberBadgeParentSupplierLevel>
      </div>
    </template>
    <template
      v-if="
        statusPill.entityCardNegotiationSpendsSpendSelected !== null &&
        headerLoading.programIsRecalculatingComputedValue &&
        !headerLoading.forecastProcess
      "
    >
      <div class="contacted-skeleton">
        <Skeleton
          class="skeletons-bg mr-1"
          :shape="'rectangle'"
          :style="{
            width: '100%',
            height: '16px',
            borderRadius: '8px',
          }"
        ></Skeleton>
      </div>
    </template>
    <template
      v-if="
        statusPill.entityCardNegotiationSpendsSpendSelected !== null &&
        !headerLoading.programIsRecalculatingComputedValue
      "
    >
      <div class="d-flex align-items-center">
        <span class="mr-2">{{ $t("global.status") }}</span>
        <PillLabelNumberBadge
          :key="statusPill.pillLabelNumberBadgeKey"
          :label-classes="statusPill.negotiationStatusPillColorClasses"
          :label="statusPill.negotiationStatusFormatted"
          :has-dropdown="true"
          :has-hover-style="true"
          :validate-belong-to-aplan="statusPill.validateBelongToAplan"
          :negotiation-status="statusPill.negotiationStatus"
          :show-agreed-option-in-spend-level="
            statusPill.showAgreedOptionInSpendLevel
          "
          @toggle-contacted="emit('toggle-contacted', $event)"
        ></PillLabelNumberBadge>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.contacted-skeleton {
  width: 100px;
}
</style>
