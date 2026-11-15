import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { sessionApi } from "@/api/session.api";
import type { SupplierContextData, PreviousThread, SessionSettings } from "@/api/session.api";
import { useAuthStore } from "@/stores/auth.store";

export const useSessionStore = defineStore("session", () => {
  const sessionId = ref<string | null>(null);
  const threadId = ref<string | null>(null); // populated after the first message creates a thread
  const supplierId = ref<string | null>(null);
  const supplierData = ref<SupplierContextData | null>(null);
  const previousThreads = ref<PreviousThread[]>([]);
  const sessionSettings = ref<SessionSettings | null>(null);
  const starterQuestions = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Derived: show the most recent thread's summary as opening context (if any)
  const threadSummary = computed<string | null>(
    () => previousThreads.value[0]?.latest_summary?.content ?? null,
  );

  async function startSession(nextSupplierId: string) {
    loading.value = true;
    error.value = null;
    supplierId.value = nextSupplierId;

    try {
      const authStore = useAuthStore();
      const membership = authStore.activeMembership;
      const tenantId = authStore.selectedTenantId ?? membership?.tenantId ?? null;
      const userId = membership?.userId ?? authStore.userId;

      if (!tenantId) {
        throw new Error("Select a tenant before starting a session");
      }

      const { data } = await sessionApi.start({
        tenant_id: tenantId,
        supplier_id: nextSupplierId,
        ...(userId ? { user_id: userId } : {}),
      });

      sessionId.value = data.session_id;
      threadId.value = data.thread_id ?? null;
      supplierData.value = data.data;
      previousThreads.value = data.previous_threads ?? [];
      sessionSettings.value = data.settings ?? null;
      starterQuestions.value = data.starter_questions ?? [];

      authStore.setSessionToken(data.token ?? null);
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : "Failed to start session";
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    sessionId.value = null;
    threadId.value = null;
    supplierId.value = null;
    supplierData.value = null;
    previousThreads.value = [];
    sessionSettings.value = null;
    starterQuestions.value = [];
    error.value = null;
    useAuthStore().clearSession();
  }

  function setThreadId(value: string | null) {
    threadId.value = value;
  }

  return {
    sessionId,
    threadId,
    supplierId,
    supplierData,
    previousThreads,
    sessionSettings,
    starterQuestions,
    threadSummary,
    loading,
    error,
    startSession,
    setThreadId,
    reset,
  };
});
