<template>
  <div class="page-content-overflow2">
    <section class="page-content-top">
      <h3>| {{ $t('adminBackend.button.supportBotSetup') }}</h3>
    </section>
    <section class="page-content">
      <div class="row">
        <div class="col-12 support-bot-setup-container">
          <SupportAgentSetupWidget
            v-if="calculumAgentEnabled && userId && tenantId && supportApiBaseUrl"
            :user-id="userId"
            :tenant-id="tenantId"
            :support-api-base-url="supportApiBaseUrl"
            :ingestion-api-base-url="supportIngestionApiBaseUrl"
          />
          <div
            v-else
            class="d-flex align-items-center justify-content-center h-100"
          >
            <span class="text-gray-500">{{ $t('adminBackend.button.supportBotSetup') }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted } from "vue";
import { useUserStore } from "@/stores/user";

export default defineComponent({
  name: "SupportBotSetupAdmin",
  setup() {
    const userStore = useUserStore();

    const userId = computed(() => userStore.getUser?.azureId ?? "");
    const tenantId = computed(() => userStore.getUser?.activeCompany?.tenantId ?? "");

    // supportApiBaseUrl drives SupportAgentSetupWidget's support.client (the query client
    // used for GET/DELETE on documents/videos — list, delete, download, segments, play),
    // same query/core host SupportBotWidget gets. ingestionApiBaseUrl drives the separate
    // upload/ingestion calls (document/video upload + SSE tracking).
    const supportApiBaseUrl = import.meta.env.VITE_SUPPORT_API_URL ?? "";
    const supportIngestionApiBaseUrl = import.meta.env.VITE_SUPPORT_INGESTION_API_URL ?? "";

    // The whole calculum-ui integration is production-only; see .env's committed default.
    const calculumAgentEnabled = import.meta.env.VITE_ENABLE_CALCULUM_AGENT === "true";

    const onDocumentClickCapture = (e: MouseEvent) => {
      const kebab = (e.target as HTMLElement | null)?.closest?.(".kebab");
      const row = kebab?.closest(".trow");
      if (!row?.parentElement) return;
      const rows = Array.from(row.parentElement.children).filter((el) =>
        el.classList.contains("trow"),
      );
      const rowIndex = Math.max(0, rows.indexOf(row));
      document.documentElement.style.setProperty("--calculum-menu-row-index", String(rowIndex));
    };

    onMounted(() => {
      document.addEventListener("click", onDocumentClickCapture, true);
    });

    onUnmounted(() => {
      document.removeEventListener("click", onDocumentClickCapture, true);
    });

    return { userId, tenantId, supportApiBaseUrl, supportIngestionApiBaseUrl, calculumAgentEnabled };
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

.support-bot-setup-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.support-bot-setup-container > * {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.support-bot-setup-container :deep(div:has(> .subtabs)) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.support-bot-setup-container :deep(.subtabs) {
  flex: 0 0 auto;
}

.support-bot-setup-container :deep(.subtabs) ~ div {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* The Videos and Documents tabs (SupportVideosSection / SupportDocumentsSection) don't
   necessarily nest .card at the same depth, so pass flex sizing through every wrapper
   that contains a .card anywhere inside it, however deep, rather than assuming one fixed
   level of nesting. */
.support-bot-setup-container :deep(div:has(.card)) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.support-bot-setup-container :deep(.card) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.support-bot-setup-container :deep(.card__body) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
