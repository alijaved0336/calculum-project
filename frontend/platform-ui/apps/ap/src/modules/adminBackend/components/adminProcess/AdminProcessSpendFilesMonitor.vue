<template>
  <div class="mt-3">
    <!-- Cancel / Reset confirmation -->
    <CalculumModal
      v-if="pendingAction"
      :size="'md'"
      :showClose="!actionInFlight"
      :title="$t(`adminBackend.adminProcess.monitor.${pendingAction.type}ConfirmTitle`)"
      @close="closeActionModal"
    >
      <template v-slot:modalContent>
        <p>{{ $t(`adminBackend.adminProcess.monitor.${pendingAction.type}ConfirmBody`) }}</p>
        <div class="border rounded p-2 mb-3 bg-light">
          <strong class="d-block">{{ pendingAction.item.versionName }}</strong>
          <span class="text-muted">{{ pendingAction.item.companyName }}</span>
        </div>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" :disabled="actionInFlight" @click="closeActionModal">
          <span>{{ $t('adminBackend.adminProcess.monitor.keepRunning') }}</span>
        </button>
        <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="actionInFlight" @click="confirmAction">
          <span>{{ $t(`adminBackend.adminProcess.monitor.${pendingAction.type}Process`) }}</span>
        </button>
      </template>
    </CalculumModal>

    <!-- Summary + toolbar -->
    <div class="d-flex align-items-center flex-wrap monitor-gap-md mb-2">
      <div class="d-flex flex-wrap monitor-gap-sm">
        <div v-for="chip in summaryChips" :key="chip.state" class="card px-3 py-2" style="min-height:auto;height:auto">
          <div class="d-flex align-items-center monitor-gap-sm">
            <StateBadge :state="chip.state" />
            <strong class="monitor-chip-count">{{ chip.count }}</strong>
          </div>
        </div>
      </div>
      <div class="ml-auto d-flex align-items-center monitor-gap-sm">
        <span class="text-muted small" v-if="lastRefreshedAt">
          {{ $t('adminBackend.adminProcess.monitor.refreshedAt') }} {{ lastRefreshedAt }}
          · {{ $t('adminBackend.adminProcess.monitor.autoRefresh') }}
        </span>
        <ButtonIconStandard @click="refreshSnapshot" :ignorePopOver="true">
          <IconSync class="w-5"></IconSync>
        </ButtonIconStandard>
      </div>
    </div>

    <div class="alert alert-warning cursor-pointer" v-if="errorMessage" @click="errorMessage = ''">
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Zombie runs: hidden by default, reachable for cleanup -->
    <div v-if="staleCount > 0" class="small mb-2">
      <a class="cursor-pointer text-muted monitor-stale-toggle" @click="showStale = !showStale">
        {{ showStale
          ? $t('adminBackend.adminProcess.monitor.hideStale')
          : $t('adminBackend.adminProcess.monitor.showStale', { count: staleCount, days: staleDays }) }}
      </a>
    </div>

    <CalculumLoading v-if="loading && rows.length === 0" :block="true"></CalculumLoading>

    <!-- Empty state: only when there is truly nothing — if all rows are stale
         and hidden, the stale toggle above already tells the story. -->
    <div v-else-if="rows.length === 0" class="card" style="min-height:auto;height:auto">
      <div class="card-body text-center py-5 text-muted">
        {{ $t('adminBackend.adminProcess.monitor.empty') }}
      </div>
    </div>

    <!-- Rows -->
    <div v-else class="monitor-rows">
      <div v-if="truncated" class="alert alert-info py-1 mb-0">
        {{ $t('adminBackend.adminProcess.monitor.showingFirst', { max: maxSubscriptions }) }}
      </div>
      <div
        v-for="row in visibleRows"
        :key="row.item.uuid"
        class="card monitor-row"
        :class="[`monitor-row--${row.state}`, { 'monitor-row--stale': row.item.stale }]"
        style="min-height:auto;height:auto"
      >
        <div class="card-body py-2 px-3">
          <div class="d-flex align-items-center flex-wrap monitor-gap-sm">
            <strong>{{ row.item.companyName }}</strong>
            <span class="text-muted">·</span>
            <span class="text-truncate" style="max-width: 320px">{{ row.item.versionName }}</span>
            <span v-if="row.runModeLabel" class="badge bg-light text-dark border">{{ row.runModeLabel }}</span>
            <StateBadge :state="row.state" />
            <code class="text-muted small">{{ row.item.status }}</code>
            <div class="ml-auto d-flex monitor-gap-sm">
              <!-- Dead runs (stalled/stale) get Reset: cooperative cancel needs
                   a live worker, which by definition these no longer have. -->
              <button
                v-if="row.showReset"
                class="monitor-btn monitor-btn--warning"
                :title="$t('adminBackend.adminProcess.monitor.resetHint')"
                @click="pendingAction = { type: 'reset', item: row.item }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg><span>{{ $t('adminBackend.adminProcess.monitor.reset') }}</span>
              </button>
              <!-- Cancel is temporarily disabled: the cooperative cancellation
                   is not behaving correctly in the pipeline yet. -->
              <span v-else :title="$t('adminBackend.adminProcess.monitor.cancelTemporarilyDisabled')">
                <button class="monitor-btn monitor-btn--danger" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 14l4-4m0 4l-4-4m11 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg><span>{{ $t('adminBackend.adminProcess.monitor.cancel') }}</span>
                </button>
              </span>
              <span :title="$t('adminBackend.adminProcess.monitor.pauseComingSoon')">
                <button class="monitor-btn" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg><span>{{ $t('adminBackend.adminProcess.monitor.pause') }}</span>
                </button>
              </span>
            </div>
          </div>

          <div class="mt-2">
            <ProcessProgressBar
              v-if="row.showBar"
              :progress="row.progress"
              :stageName="row.stageName"
              :stageIndex="row.stageIndex"
              :stageCount="row.stageCount"
              :frozen="row.frozen"
            />
            <span v-else-if="row.state === 'queued'" class="text-muted small">
              {{ $t('adminBackend.adminProcess.monitor.waitingWorker') }}
            </span>
            <span v-else class="text-muted small">
              {{ $t('adminBackend.adminProcess.monitor.noLiveData') }}
            </span>
          </div>

          <div class="d-flex flex-wrap mt-2 small text-muted monitor-row__meta">
            <span v-if="row.startedLabel">
              <span class="monitor-row__k">{{ $t('adminBackend.adminProcess.monitor.started') }}</span>
              {{ row.startedLabel }}
            </span>
            <span v-if="row.elapsedLabel">
              <span class="monitor-row__k">{{ $t('adminBackend.adminProcess.monitor.elapsed') }}</span>
              {{ row.elapsedLabel }}
            </span>
            <span v-if="row.etaLabel">
              <span class="monitor-row__k">{{ $t('adminBackend.adminProcess.monitor.eta') }}</span>
              {{ row.etaLabel }}
            </span>
            <span v-if="row.state === 'stalled' && row.silenceLabel" class="text-warning font-weight-bold">
              <span class="monitor-row__k">{{ $t('adminBackend.adminProcess.monitor.lastUpdate') }}</span>
              {{ row.silenceLabel }}
            </span>
            <span>
              <span class="monitor-row__k">{{ $t('adminBackend.adminProcess.monitor.triggeredBy') }}</span>
              <template v-if="row.item.triggeredBy">{{ row.item.triggeredBy.email }}</template>
              <em v-else-if="row.item.automaticRecalculation">{{ $t('adminBackend.adminProcess.monitor.automatic') }}</em>
              <template v-else>—</template>
            </span>
            <span
              v-if="row.item.pendingRecalculateReasons"
              class="text-truncate monitor-row__reasons"
              :title="row.reasonsFull"
            >
              <span class="monitor-row__k">{{ $t('adminBackend.adminProcess.monitor.reasons') }}</span>
              {{ row.reasonsFull }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, onUnmounted, ref, Ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";

import IconSync from "@/resources/assets/images/icons/IconSync.vue";
import ButtonIconStandard from "@/modules/components/ButtonIconStandard.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import ProcessProgressBar from "@/modules/components/ProcessProgressBar.vue";
import StateBadge from "@/modules/components/StateBadge.vue";

import { useAdminBackendStore } from "@/stores/adminBackend";
import { useSpendFilesStore } from "@/stores/spendFiles";
import useAdminProcessMonitorFirebase, {
  MONITOR_MAX_SUBSCRIPTIONS
} from "@/composables/firebase/useAdminProcessMonitorFirebase";
import type {
  ProcessMonitorItem,
  ProcessMonitorSnapshot
} from "@/modules/adminBackend/api/processMonitor";

const SNAPSHOT_POLL_MS = 30_000;

function humanizeSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function computeElapsedSeconds(
  liveElapsed: number | undefined,
  startedIso: string | null,
  nowMs: number
): number | null {
  if (typeof liveElapsed === "number") return liveElapsed;
  if (startedIso) return (nowMs - new Date(startedIso).getTime()) / 1000;
  return null;
}

/** Last moment the backend published for this doc (server updatedAt when available). */
function lastLiveSignalMs(live: { data: any; receivedAt: number | null } | undefined): number | null {
  const updatedAt = live?.data?.updatedAt as { toMillis?: () => number } | undefined;
  if (updatedAt?.toMillis) return updatedAt.toMillis();
  return live?.receivedAt ?? null;
}

export default {
  name: "AdminProcessSpendFilesMonitor",
  components: {
    ButtonIconStandard,
    CalculumLoading,
    CalculumModal,
    IconSync,
    ProcessProgressBar,
    StateBadge
  },
  setup() {
    const translate = useI18n({ useScope: "global" });
    const adminBackendStore = useAdminBackendStore();
    const spendFilesStore = useSpendFilesStore();
    const monitorFirebase = useAdminProcessMonitorFirebase();

    const items: Ref<ProcessMonitorItem[]> = ref([]);
    const stalledThresholdSeconds = ref(300);
    const activeWindowHours = ref(48);
    const loading = ref(false);
    const errorMessage = ref("");
    const lastRefreshedAt = ref("");
    const pendingAction: Ref<{ type: "cancel" | "reset"; item: ProcessMonitorItem } | null> = ref(null);
    const actionInFlight = ref(false);
    const showStale = ref(false);
    const nowTick = ref(Date.now());

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    let refreshInFlight = false;

    function refreshSnapshot() {
      if (refreshInFlight) return;
      refreshInFlight = true;
      loading.value = true;
      Promise.resolve(
        adminBackendStore.getProcessMonitorSnapshot({
          callbackSuccess: (snapshot: ProcessMonitorSnapshot) => {
            items.value = snapshot.items ?? [];
            stalledThresholdSeconds.value = snapshot.stalledThresholdSeconds ?? 300;
            activeWindowHours.value = snapshot.activeWindowHours ?? 48;
            lastRefreshedAt.value = new Date().toLocaleTimeString();
            loading.value = false;
            refreshInFlight = false;
            monitorFirebase.syncSubscriptions(items.value.map((i) => i.uuid));
          },
          callbackError: () => {
            loading.value = false;
            refreshInFlight = false;
            errorMessage.value = translate.t("error.server400");
          }
        })
      ).catch(() => {
        // The store action failing before either callback must not leave the
        // in-flight flag stuck and kill all future polls.
        loading.value = false;
        refreshInFlight = false;
        errorMessage.value = translate.t("error.server400");
      });
    }

    function deriveState(
      item: ProcessMonitorItem,
      liveSignalMs: number | null,
      liveProgress: number | undefined,
      nowMs: number
    ): ProcessMonitorItem["classification"] | "cancelling" {
      if (item.cancelling) return "cancelling";
      // Firebase-silence upgrade: a running row whose doc stopped being
      // published inside the stalled threshold flips to stalled between polls.
      const silentTooLong =
        liveSignalMs !== null &&
        nowMs - liveSignalMs > stalledThresholdSeconds.value * 1000;
      if (item.classification === "running" && silentTooLong && (liveProgress ?? 0) < 100) {
        return "stalled";
      }
      return item.classification;
    }

    function buildEtaLabel(
      times: { remain?: number; endingAt?: string } | undefined,
      softEstimate: boolean,
      frozen: boolean
    ): string | null {
      if (frozen || typeof times?.remain !== "number") return null;
      let label = `${softEstimate ? "~" : ""}${humanizeSeconds(times.remain)}`;
      if (times.endingAt) {
        label += ` (${new Date(times.endingAt).toLocaleTimeString()})`;
      }
      return label;
    }

    function buildRow(item: ProcessMonitorItem, nowMs: number) {
      const live = monitorFirebase.docsByUuid[item.uuid];
      const globalProgress = live?.data?.progress?.global;
      const state = deriveState(item, lastLiveSignalMs(live), globalProgress?.progress, nowMs);
      const frozen = item.cancelling;

      const rawProgress = globalProgress?.progress;
      const progress =
        typeof rawProgress === "number"
          ? monitorFirebase.clampProgress(item.uuid, rawProgress)
          : null;

      const times = globalProgress?.times;
      const startedIso = times?.startedAt ?? item.startingDate;
      const elapsedSeconds = computeElapsedSeconds(times?.elapsed, startedIso, nowMs);
      const lastActivityMs = item.lastReportedDate
        ? new Date(item.lastReportedDate).getTime()
        : null;

      return {
        item,
        state,
        runModeLabel: item.runMode
          ? translate.t(`adminBackend.adminProcess.monitor.runMode.${item.runMode}`)
          : null,
        showBar: progress !== null,
        progress,
        stageName: globalProgress?.stage?.name ?? null,
        stageIndex: globalProgress?.stage?.index ?? null,
        stageCount: globalProgress?.stage?.count ?? null,
        frozen,
        etaLabel: buildEtaLabel(times, globalProgress?.estimate?.source === "defaults-blind", frozen),
        startedLabel: startedIso ? new Date(startedIso).toLocaleTimeString() : null,
        elapsedLabel:
          elapsedSeconds !== null && state !== "queued"
            ? humanizeSeconds(elapsedSeconds)
            : null,
        silenceLabel: lastActivityMs
          ? translate.t("adminBackend.adminProcess.monitor.silenceAgo", {
              ago: humanizeSeconds((nowMs - lastActivityMs) / 1000)
            })
          : null,
        reasonsFull: (item.pendingRecalculateReasons ?? "").split("|").join(" · "),
        cancellable: !item.cancelling,
        // Dead runs get Reset instead of Cancel: no live worker will ever
        // acknowledge a cooperative cancellation for them.
        showReset: item.stale || state === "stalled"
      };
    }

    const rows = computed(() => items.value.map((item) => buildRow(item, nowTick.value)));

    const visibleRows = computed(() =>
      showStale.value ? rows.value : rows.value.filter((row) => !row.item.stale)
    );

    const staleCount = computed(() => rows.value.filter((row) => row.item.stale).length);
    const staleDays = computed(() => Math.max(1, Math.round(activeWindowHours.value / 24)));

    const summaryChips = computed(() => {
      const counts: Record<string, number> = { queued: 0, running: 0, stalled: 0 };
      for (const row of rows.value) {
        if (row.item.stale) continue; // zombies don't pollute the live counters
        const key = row.state === "cancelling" ? "running" : row.state;
        if (key in counts) counts[key] += 1;
      }
      return (["queued", "running", "stalled"] as const).map((state) => ({
        state,
        count: counts[state]
      }));
    });

    const truncated = computed(() => items.value.length > MONITOR_MAX_SUBSCRIPTIONS);

    function closeActionModal() {
      // The modal must stay open while a request is in flight, so its
      // callbacks always resolve against the target the user confirmed.
      if (actionInFlight.value) return;
      pendingAction.value = null;
    }

    function releaseAction() {
      actionInFlight.value = false;
      pendingAction.value = null;
      useToast().error(translate.t("error.server400"));
    }

    function cancelRun(item: ProcessMonitorItem) {
      Promise.resolve(adminBackendStore.cancelProcessRun({
        uuid: item.uuid,
        originalEventId: item.originalEventId,
        callbackSuccess: () => {
          // Optimistic: flag the row as cancelling right away so the button
          // stays disabled during the window until the next snapshot confirms.
          const cancelled = items.value.find((i) => i.uuid === item.uuid);
          if (cancelled) cancelled.cancelling = true;
          actionInFlight.value = false;
          pendingAction.value = null;
          useToast().success(
            translate.t("adminBackend.adminProcess.monitor.cancelRequested")
          );
          refreshSnapshot();
        },
        callbackError: releaseAction
        // A store-action rejection before either callback must not leave the
        // modal stuck with the confirm button disabled forever.
      })).catch(releaseAction);
    }

    function resetRun(item: ProcessMonitorItem) {
      Promise.resolve(spendFilesStore.resetFileVersionStatus({
        filesIDs: [item.uuid],
        callbackSuccess: () => {
          // The version is READY now: drop it from the list immediately.
          items.value = items.value.filter((i) => i.uuid !== item.uuid);
          actionInFlight.value = false;
          pendingAction.value = null;
          useToast().success(translate.t("adminBackend.adminProcess.monitor.resetDone"));
          refreshSnapshot();
        },
        callbackError: releaseAction
      })).catch(releaseAction);
    }

    function confirmAction() {
      const action = pendingAction.value;
      if (!action || actionInFlight.value) return;
      actionInFlight.value = true;
      if (action.type === "cancel") {
        cancelRun(action.item);
      } else {
        resetRun(action.item);
      }
    }

    onMounted(() => {
      refreshSnapshot();
      pollTimer = setInterval(refreshSnapshot, SNAPSHOT_POLL_MS);
      tickTimer = setInterval(() => {
        nowTick.value = Date.now();
      }, 1000);
    });

    onUnmounted(() => {
      if (pollTimer) clearInterval(pollTimer);
      if (tickTimer) clearInterval(tickTimer);
      monitorFirebase.teardownAll();
    });

    return {
      actionInFlight,
      closeActionModal,
      confirmAction,
      errorMessage,
      lastRefreshedAt,
      loading,
      maxSubscriptions: MONITOR_MAX_SUBSCRIPTIONS,
      pendingAction,
      refreshSnapshot,
      rows,
      showStale,
      staleCount,
      staleDays,
      summaryChips,
      truncated,
      visibleRows
    };
  }
};
</script>

<style scoped>
/* Bootstrap here is v4: no gap-* / ms-auto / fs-* utilities — provide them scoped. */
.monitor-gap-sm {
  gap: 0.5rem;
}
.monitor-gap-md {
  gap: 1rem;
}
.monitor-chip-count {
  font-size: 1.25rem;
  line-height: 1;
}
.monitor-action-btn {
  white-space: nowrap;
}
/* Compact action buttons, same pattern as the Change Requests view (btn-action). */
.monitor-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: #fff;
  border: 1px solid #dde3ec;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.8rem;
  line-height: 1;
  color: #4d5d72;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.monitor-btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.monitor-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.monitor-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.monitor-btn--danger {
  color: #c0392b;
}
.monitor-btn--danger:hover:not(:disabled) {
  border-color: #c0392b;
  background: #fdecea;
}
.monitor-btn--warning {
  color: #9a6b00;
}
.monitor-btn--warning:hover:not(:disabled) {
  border-color: #b98900;
  background: #fbf3dd;
}
.monitor-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.monitor-row--stalled {
  border-left: 3px solid #e9a23b;
}
.monitor-row--stale {
  opacity: 0.7;
  border-left: 3px solid #adb5bd;
}
.monitor-stale-toggle {
  text-decoration: underline dotted;
}
.monitor-row__meta {
  column-gap: 1.5rem;
  row-gap: 0.25rem;
}
.monitor-row__k {
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  margin-right: 0.25rem;
}
.monitor-row__reasons {
  max-width: 340px;
  border-bottom: 1px dotted #7d8ba0;
  cursor: help;
}
</style>
