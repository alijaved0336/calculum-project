<template>
  <div class="page-content-overflow2">
    <section class="page-content-top">
      <h3>| Negotiation Bot Setup</h3>
    </section>
    <section class="page-content">
      <div class="row">
        <div class="col-12 negotiation-agent-setup-container">
          <NegotiationAgentSetupWidget
            v-if="calculumAgentEnabled && userId && tenantId && agentApiBaseUrl && agentIngestionApiBaseUrl"
            :user-id="userId"
            :tenant-id="tenantId"
            :tenant-uuid="tenantId"
            :api-base-url="agentApiBaseUrl"
            :ingestion-api-base-url="agentIngestionApiBaseUrl"
          />
          <div
            v-else
            class="d-flex align-items-center justify-content-center h-100"
          >
            <span class="text-gray-500">Negotiation Bot Setup</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useUserStore } from "@/stores/user";

export default defineComponent({
  name: "NegotiationAgentSetupAdmin",
  setup() {
    const userStore = useUserStore();

    const userId = computed(() => userStore.getUser?.azureId ?? "");
    const tenantId = computed(() => userStore.getUser?.activeCompany?.tenantId ?? "");

    // NegotiationAgentSetupWidget needs both: apiBaseUrl for the main negotiation backend
    // and ingestionApiBaseUrl for document/transcript upload — a separate deployment.
    const agentApiBaseUrl = import.meta.env.VITE_AGENT_API_URL ?? "";
    const agentIngestionApiBaseUrl = import.meta.env.VITE_INGESTION_API_URL ?? "";

    // The whole calculum-ui integration is production-only; see .env's committed default.
    const calculumAgentEnabled = import.meta.env.VITE_ENABLE_CALCULUM_AGENT === "true";

    return { userId, tenantId, agentApiBaseUrl, agentIngestionApiBaseUrl, calculumAgentEnabled };
  },
});
</script>

<style scoped>
.page-content-overflow2 {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.page-content-top {
  flex: 0 0 auto;
}

.page-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.row {
  flex: 1;
  min-height: 0;
}

.negotiation-agent-setup-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 32px;
}

.negotiation-agent-setup-container > * {
  flex: 1;
  min-height: 0;
  width: 100%;
}
</style>
