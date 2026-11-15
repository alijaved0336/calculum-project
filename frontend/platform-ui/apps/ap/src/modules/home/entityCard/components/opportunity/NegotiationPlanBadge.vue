<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import CalculumNested from "@/modules/components/tree/CalculumNested.vue";
import NineboxesBadges from "@/modules/home/entityCard/components/NineboxesBadges.vue";
import type {
  NegotiationHeaderLoading,
  NegotiationPlanHeader,
} from "@/modules/home/entityCard/types";

defineProps<{
  headerLoading: NegotiationHeaderLoading;
  planHeader: NegotiationPlanHeader;
}>();

const emit = defineEmits<{
  "toggle-show-move-between": [];
  "update:show-move-between": [value: boolean];
  "get-data-move-between-modal": [payload: any];
  "remove-plan-from-badge": [payload: any];
}>();
</script>

<template>
  <div
    class="col-12"
    @mouseleave="emit('update:show-move-between', false)"
  >
    <div class="d-flex w-100 justify-content-end gap-1">
      <NineboxesBadges
        :key="'cashFlow' + planHeader.keyTermsStrategies"
        :info-boxes="planHeader.boxesSelected"
        :type-boxes="'cashFlow'"
      ></NineboxesBadges>
      <NineboxesBadges
        v-if="planHeader.isFinancingEnabledSCFProvider"
        :key="'financing' + planHeader.keyTermsStrategies"
        :info-boxes="planHeader.boxesSelectedFinancing"
        :type-boxes="'financing'"
      ></NineboxesBadges>
      <NineboxesBadges
        v-if="planHeader.isFinancingEnabled"
        :key="'scf9Box' + planHeader.keyTermsStrategies"
        :info-boxes="planHeader.boxesSelectedSCF"
        :type-boxes="'scf9Box'"
      ></NineboxesBadges>
      <div
        v-if="planHeader.modulePlanIsAvailable"
        class="d-flex flex-column gap-1"
      >
        <div
          v-if="
            headerLoading.programIsRecalculatingComputedValue &&
            !headerLoading.forecastProcess
          "
          class="contacted-skeleton"
        >
          <Skeleton
            class="skeletons-bg mr-1"
            :shape="'rectangle'"
            :style="{
              width: '100%',
              height: '28px',
              borderRadius: '8px',
            }"
          ></Skeleton>
        </div>
        <div
          v-else
          class="d-flex box-badges"
        >
          <img
            class="img-icon plan-icon"
            :src="planHeader.planIcon"
            alt="plan icon"
          />
          <Tooltip
            :open-delay="100"
            :anchor-element="'target'"
            :position="'top'"
            ><span
              class="data-plan-status"
              :title="planHeader.setPlanName"
              @click="emit('toggle-show-move-between')"
              >{{ `${planHeader.setPlanName}` }}</span
            ></Tooltip
          >
        </div>
        <div
          class="nested-popover-container"
          @mouseleave="emit('update:show-move-between', false)"
        >
          <CalculumNested
            v-if="
              planHeader.showMoveBetween && planHeader.planPhasesData.length > 0
            "
            class="popover-nested"
            :items="planHeader.planPhasesData"
            @selected-phase="emit('get-data-move-between-modal', $event)"
            @remove-plan="emit('remove-plan-from-badge', $event)"
          ></CalculumNested
          ><span
            v-else-if="
              planHeader.showMoveBetween &&
              planHeader.planPhasesData.length === 0
            "
            class="popover-nested"
            >{{ $t("home.analyze.moveBetweenPlanPhasesEmptyList") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
img.img-icon.plan-icon {
  width: 14px !important;
}

.contacted-skeleton {
  width: 100px;
}
</style>
