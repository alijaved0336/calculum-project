<template>
  <div class="negotiation-agent-setup-container">
    <SetupWidget
      v-if="calculumAgentEnabled && userId && tenantId && agentApiBaseUrl"
      :user-id="userId"
      :tenant-id="tenantId"
      :tenant-uuid="tenantId"
      :api-base-url="agentApiBaseUrl"
    />
    <div
      v-else
      class="d-flex align-items-center justify-content-center h-100"
    >
      <span class="text-gray-500">{{ $t('home.homeCompanySettings.negotiationAgentSetup.title') }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useUserStore } from "@/stores/user";

export default defineComponent({
  name: "NegotiationAgentSetup",
  props: {
    showAlert: { type: Boolean, default: false },
    otherTab: { type: String, default: "" },
    sectionDefault: { type: String, default: "" },
    spendFileInrecalculation: { type: Boolean, default: false },
  },
  emits: ["sendChanges", "cancel-n-continue", "discard-n-continue", "save-n-continue"],

  setup() {
    const userStore = useUserStore();

    const userId = computed(() => userStore.getUser?.azureId ?? "");
    const tenantId = computed(() => userStore.getUser?.activeCompany?.tenantId ?? "");

    const agentApiBaseUrl = import.meta.env.VITE_AGENT_API_URL ?? "";

    // The whole calculum-ui integration is production-only; see .env's committed default.
    const calculumAgentEnabled = import.meta.env.VITE_ENABLE_CALCULUM_AGENT === "true";

    return { userId, tenantId, agentApiBaseUrl, calculumAgentEnabled };
  },
});
</script>

<style scoped>
.negotiation-agent-setup-container {
  width: 100%;
  height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
}

.negotiation-agent-setup-container > * {
  flex: 1;
  width: 100%;
  height: 100%;
}
</style>
