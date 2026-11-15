import { firestore } from "./config";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ensureFirebaseSession,
  handleSnapshotError,
} from "@/composables/firebase/firebaseSession";

/**
 * Shape of the realtime grid-export document written by the backend
 * (App\Services\EventsDispatchers\GridExportEventDispatcher, collection `gridExport`).
 */
export interface GridExportSnapshot {
  status: string; // queued | generating | ready | failed
  progress?: { processed: number; total: number };
  downloadToken?: string | null;
  error?: string | null;
}

/**
 * Subscribes to the realtime progress/completion of an async grid (Opportunity List) export,
 * mirroring {@link useSpendFileFirebase}. The document lives at `gridExport/{jobId}`.
 *
 * Returns the Firestore `unsubscribe` function, or `null` when the subscription cannot start
 * (no Firebase auth yet) so the caller can fall back to REST polling.
 */
const useGridExportFirebase = () => {
  async function subscribeToGridExport(
    jobId: string,
    onChange: (data: GridExportSnapshot) => void,
    onError?: (error: unknown) => void,
  ): Promise<(() => void) | null> {
    // A one-shot job listener: deliberately not in the session registry, since
    // the export task owns its own lifecycle and falls back to REST polling.
    const user = await ensureFirebaseSession();
    if (!user) {
      if (import.meta.env.DEV) console.warn("** subscribeToGridExport without firebase session; falling back to polling");
      return null;
    }

    const documentRef = doc(firestore, "gridExport", jobId);

    return onSnapshot(
      documentRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onChange(snapshot.data() as GridExportSnapshot);
        }
      },
      (error) => {
        // Reports to Sentry; recovery is a no-op for unregistered listeners.
        void handleSnapshotError(`gridExport:${jobId}`, error);
        if (onError) onError(error);
      },
    );
  }

  return { subscribeToGridExport };
};

export default useGridExportFirebase;
