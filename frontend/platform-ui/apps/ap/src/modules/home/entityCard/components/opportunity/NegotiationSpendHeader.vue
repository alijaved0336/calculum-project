<script setup lang="ts">
import NegotiationNoProgramWarning from "@/modules/home/entityCard/components/opportunity/NegotiationNoProgramWarning.vue";
import NegotiationPlanBadge from "@/modules/home/entityCard/components/opportunity/NegotiationPlanBadge.vue";
import NegotiationSpendTabs from "@/modules/home/entityCard/components/opportunity/NegotiationSpendTabs.vue";
import NegotiationStatusPills from "@/modules/home/entityCard/components/opportunity/NegotiationStatusPills.vue";
import type {
  NegotiationHeaderLoading,
  NegotiationPlanHeader,
  NegotiationStatusPill,
} from "@/modules/home/entityCard/types";
import type { NegotiationStatus } from "@/types";

defineProps<{
  tabs: any[];
  selectedTabIndex: number;
  companyType: string;
  belongtoProgram: boolean;
  headerLoading: NegotiationHeaderLoading;
  statusPill: NegotiationStatusPill;
  planHeader: NegotiationPlanHeader;
}>();

const emit = defineEmits<{
  select: [event: any];
  "toggle-change-status": [status: NegotiationStatus];
  "toggle-contacted": [status: NegotiationStatus];
  "toggle-show-move-between": [];
  "update:show-move-between": [value: boolean];
  "get-data-move-between-modal": [payload: any];
  "remove-plan-from-badge": [payload: any];
}>();
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div
        v-if="!headerLoading.isLoadingEntityCard"
        class="row mb-1"
      >
        <div class="col-12 d-flex align-items-center justify-content-between">
          <NegotiationSpendTabs
            :tabs="tabs"
            :selected-tab-index="selectedTabIndex"
            :company-type="companyType"
            :header-loading="headerLoading"
            @select="emit('select', $event)"
          ></NegotiationSpendTabs>
          <NegotiationStatusPills
            :header-loading="headerLoading"
            :status-pill="statusPill"
            @toggle-change-status="emit('toggle-change-status', $event)"
            @toggle-contacted="emit('toggle-contacted', $event)"
          ></NegotiationStatusPills>
        </div>
      </div>
      <NegotiationNoProgramWarning
        v-if="!belongtoProgram"
      ></NegotiationNoProgramWarning>
      <div
        v-if="
          belongtoProgram && !headerLoading.programIsRecalculatingComputedValue
        "
        class="row mb-2"
      >
        <NegotiationPlanBadge
          :header-loading="headerLoading"
          :plan-header="planHeader"
          @toggle-show-move-between="emit('toggle-show-move-between')"
          @update:show-move-between="emit('update:show-move-between', $event)"
          @get-data-move-between-modal="
            emit('get-data-move-between-modal', $event)
          "
          @remove-plan-from-badge="emit('remove-plan-from-badge', $event)"
        ></NegotiationPlanBadge>
      </div>
    </div>
  </div>
</template>
