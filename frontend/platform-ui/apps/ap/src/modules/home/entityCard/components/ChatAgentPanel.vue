<template>
  <div
    style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      flex: 1;
    "
  >
    <div
      v-if="missingConfig"
      class="d-flex flex-column align-items-center justify-content-center p-4 text-center"
      style="min-height: 200px"
    >
      <i
        class="fa-solid fa-triangle-exclamation text-warning mb-2"
        style="font-size: 1.5rem"
      ></i>
      <p class="text-sm text-gray-600 mb-0">
        Agent not configured for this supplier.<br />
        <span
          v-if="!tenantId"
          class="text-xs text-gray-400"
          >Missing tenant ID.</span
        >
        <span
          v-if="!userId"
          class="text-xs text-gray-400"
          >Missing user ID.</span
        >
      </p>
    </div>
    <CalculumApp
      v-else-if="ready"
      ref="calculumAppRef"
      :user-id="userId"
      :tenant-id="tenantId"
      :supplier-id="supplierId"
      :entity-name="entityName"
      :entity-level="entityLevel"
      :spendfile-version="spendfileVersion"
      :api-base-url="apiBaseUrl"
      :ingestion-api-base-url="ingestionApiBaseUrl"
      :logo-url="logoUrl"
      font-size="16px"
      style="flex: 1; overflow: hidden"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watchEffect } from "vue";
import { useUserStore } from "@/stores/user";
import { useSpendFile } from "@/composables";
import { CalculumApp } from "calculum-ui";
import "calculum-ui/style.css";

// VITE_AGENT_API_URL: the negotiation agent backend's real URL — the widget calls it
// directly (auth rides the browser's cookie jar via withCredentials). Without it the
// widget falls back to its hardcoded production URL. Set by the CI variable group in prod.
const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL ?? "";

export default defineComponent({
  name: "ChatAgentPanel",
  components: { CalculumApp },
  props: {
    supplierId: { type: String, default: "" },
    entityName: { type: String, default: "" },
    entityLevel: { type: String, default: "supplier" },
  },
  setup(props) {
    const userStore = useUserStore();
    const { spendFileVersionActiveId } = useSpendFile();

    const userId = computed(() => userStore.getUser?.azureId ?? "");
    const tenantId = computed(
      () => userStore.getUser?.activeCompany?.tenantId ?? "",
    );

    const spendfileVersion = computed(
      () => spendFileVersionActiveId.value ?? "",
    );

    // Passed through to AppWidget so it can derive the WS URL (http→ws, https→wss).
    const apiBaseUrl = AGENT_API_URL;

    // Ingestion backend for the super-admin KB screen — same host NegotiationAgentSetupWidget uses.
    const ingestionApiBaseUrl = import.meta.env.VITE_INGESTION_API_URL ?? "";

    // Logo resolves relative to AppWidget's origin when empty; set for cross-origin embeds.
    const logoUrl = AGENT_API_URL ? `${AGENT_API_URL}/logo.png` : undefined;

    const missingConfig = computed(() => !tenantId.value || !userId.value || !AGENT_API_URL);
    const ready = computed(() => !missingConfig.value);

    // Re-exposes CalculumApp's own defineExpose() API one level up, so the parent that
    // renders <ChatAgentPanel ref="..."> (EntityCardOverview.vue / EntityCard.vue) can drive
    // the widget's header actions (New chat / History / Copy) from its own "Agent" tab
    // header, without reaching through an internal implementation-detail ref.
    // calculumAppRef is null until `ready` (CalculumApp is v-else-if="ready"), so every
    // delegate guards against that.
    const calculumAppRef = ref<InstanceType<typeof CalculumApp> | null>(null);
    const newChat = () => calculumAppRef.value?.newChat();
    const toggleHistory = () => calculumAppRef.value?.toggleHistory();
    const copyConversation = () => calculumAppRef.value?.copyConversation();
    const historyOpen = computed(() => calculumAppRef.value?.historyOpen ?? false);
    const copied = computed(() => calculumAppRef.value?.copied ?? false);
    const isConnecting = computed(() => calculumAppRef.value?.isConnecting ?? false);
    const isConnected = computed(() => calculumAppRef.value?.isConnected ?? false);
    const wsError = computed(() => calculumAppRef.value?.wsError ?? null);

    watchEffect(() => {
      if (ready.value && import.meta.env.DEV) {
        console.log("[ChatAgentPanel] props passed to CalculumApp", {
          userId: userId.value,
          tenantId: tenantId.value,
          supplierId: props.supplierId,
          entityName: props.entityName,
          entityLevel: props.entityLevel,
          spendfileVersion: spendfileVersion.value,
          apiBaseUrl,
          ingestionApiBaseUrl,
        });
      }
    });

    return {
      userId,
      tenantId,
      spendfileVersion,
      apiBaseUrl,
      ingestionApiBaseUrl,
      logoUrl,
      ready,
      missingConfig,
      calculumAppRef,
      newChat,
      toggleHistory,
      copyConversation,
      historyOpen,
      copied,
      isConnecting,
      isConnected,
      wsError,
    };
  },
});
</script>
