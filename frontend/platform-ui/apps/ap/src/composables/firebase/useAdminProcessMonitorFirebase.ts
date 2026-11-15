import { reactive } from "vue";
import { firestore } from "./config";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import {
  ensureFirebaseSession,
  handleSnapshotError,
} from "@/composables/firebase/firebaseSession";
import type { MonitorFirebaseDoc } from "@/modules/adminBackend/api/processMonitor";

export interface MonitorLiveDoc {
  data: MonitorFirebaseDoc | null;
  receivedAt: number | null;
  liveUnavailable: boolean;
}

/** Safety valve: the monitor never opens more listeners than this. */
export const MONITOR_MAX_SUBSCRIPTIONS = 50;

/**
 * Multi-document subscription manager for the Admin Process spend-files
 * monitor: one `spendFileVersion/{uuid}` Firestore listener per listed row.
 *
 * Unlike useSpendFileFirebase (single doc routed through the subscribe store),
 * the listener map lives here — the store slot is single-subscription by
 * design and must not be reused for N docs.
 */
const useAdminProcessMonitorFirebase = () => {
  const unsubscribers = new Map<string, Unsubscribe>();
  const docsByUuid = reactive<Record<string, MonitorLiveDoc>>({});
  const maxShownProgress = reactive<Record<string, number>>({});

  // Set by teardownAll: a sync run still queued on the chain when the
  // component unmounts must not reopen listeners nobody will ever close.
  let disposed = false;

  function subscribeToDocument(uuid: string): void {
    const unsubscribe = onSnapshot(
      doc(firestore, "spendFileVersion", uuid),
      (snapshot) => {
        docsByUuid[uuid] = {
          data: snapshot.exists() ? (snapshot.data() as MonitorFirebaseDoc) : null,
          receivedAt: Date.now(),
          liveUnavailable: false
        };
      },
      (error) => {
        // Permission or transport error on ONE doc must not break the view:
        // the row degrades to snapshot/status-chip only.
        void handleSnapshotError(`monitor:${uuid}`, error);
        docsByUuid[uuid] = { data: null, receivedAt: null, liveUnavailable: true };
      }
    );
    unsubscribers.set(uuid, unsubscribe);
  }

  // Serializes sync runs: the token check awaits, and two overlapping runs
  // would otherwise mutate the listener Map concurrently.
  let syncChain: Promise<void> = Promise.resolve();

  /**
   * Reconcile the active listeners with the uuids currently listed by the
   * REST snapshot: subscribe the added ones, tear down the removed ones.
   * Calls are chained — a run never starts before the previous one finished,
   * and a failed run is logged without breaking the chain (the next snapshot
   * poll retries the reconciliation anyway).
   */
  function syncSubscriptions(uuids: string[]): Promise<void> {
    const run = async () => {
      try {
        if (disposed) return;

        const user = await ensureFirebaseSession();
        if (!user) {
          if (import.meta.env.DEV)
            console.error("** Monitor: syncSubscriptions without Firestore session");
          return;
        }
        if (disposed) return;

        const wanted = new Set(uuids.slice(0, MONITOR_MAX_SUBSCRIPTIONS));

        for (const [uuid, unsubscribe] of unsubscribers) {
          if (!wanted.has(uuid)) {
            unsubscribe();
            unsubscribers.delete(uuid);
            delete docsByUuid[uuid];
            delete maxShownProgress[uuid];
          }
        }

        for (const uuid of wanted) {
          if (!unsubscribers.has(uuid)) {
            subscribeToDocument(uuid);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV)
          console.warn("** Monitor: syncSubscriptions failed:", error);
      }
    };

    syncChain = syncChain.then(run);
    return syncChain;
  }

  /**
   * Monotonic clamp on top of the backend guarantee: never report a lower
   * global % than already shown for a uuid (protects against out-of-order
   * snapshots around resubscriptions).
   */
  function clampProgress(uuid: string, progress: number): number {
    const shown = Math.max(maxShownProgress[uuid] ?? 0, progress);
    maxShownProgress[uuid] = shown;
    return shown;
  }

  function teardownAll(): void {
    disposed = true;
    for (const unsubscribe of unsubscribers.values()) {
      unsubscribe();
    }
    unsubscribers.clear();
    for (const key of Object.keys(docsByUuid)) delete docsByUuid[key];
    for (const key of Object.keys(maxShownProgress)) delete maxShownProgress[key];
  }

  return {
    docsByUuid,
    syncSubscriptions,
    clampProgress,
    teardownAll
  };
};

export default useAdminProcessMonitorFirebase;
