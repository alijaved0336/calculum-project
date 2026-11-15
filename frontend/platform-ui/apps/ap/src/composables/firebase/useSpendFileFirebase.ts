import { firestore } from "./config";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { useSubscribeStore } from "@/stores/subscribe";
import useShownotys from "@/modules/home/composables/showNotys";
import {
  SUBSCRIPTION_KEYS,
  closeSubscription,
  ensureFirebaseSession,
  handleSnapshotError,
  noteSubscriptionHealthy,
  openSubscription,
} from "@/composables/firebase/firebaseSession";

// A run has ended (so progress must be cleared) when the doc reaches "ready" or
// any "error*" status. Kept module-level and pure to keep the onSnapshot callback
// simple (cognitive complexity).
function isRunEndedStatus(status: unknown): boolean {
  return (
    status === "ready" ||
    (typeof status === "string" && status.startsWith("error"))
  );
}

const useSpendFileFirebase = () => {
  const { setSpendFileStatusReactivity } = useShownotys();
  const subscribeStore = useSubscribeStore();

  // The monotonic clamp lives in the store (single source of truth); here we only
  // clear it. Reset on (re)subscribe, when the run ends (ready/error), and on unsubscribe.
  function resetSpendFileProgress() {
    subscribeStore.setSpendFileProgress(null);
    subscribeStore.setSpendFileProgressRemain(null);
  }

  function applySnapshot(documentData: any) {
    // Surface the whole-pipeline recalculation % + ETA (WI#18023) into the
    // store so the navbar "Updating Data" badge can fill, show the number,
    // and expose the time remaining on hover. The store clamps the % and
    // ignores absent/non-numeric values.
    // Reset on any run-ended status (ready OR error*) so a stale % from a
    // failed run can't survive and clamp the next run's progress.
    if (isRunEndedStatus(documentData.status)) {
      resetSpendFileProgress();
    } else {
      subscribeStore.applySpendFileProgress(documentData.progress?.global?.progress);
      subscribeStore.applySpendFileProgressRemain(documentData.progress?.global?.times?.remain);
    }

    if (
      (subscribeStore.getLastStatusSpendFileSubscribe === undefined ||
        subscribeStore.getLastStatusSpendFileSubscribe === null) &&
      documentData.status === "ready"
    ) {
      //Only store the last date and allow the actions in modules
      subscribeStore.setLastStatusSpendFileSubscribe(documentData.updatedAt);
      subscribeStore.setAllowActionsInModules(true);
    } else if (subscribeStore.getLastStatusSpendFileSubscribe !== documentData.updatedAt) {
      subscribeStore.setLastStatusSpendFileSubscribe(documentData.updatedAt);
      setSpendFileStatusReactivity(documentData.status);
    }
  }

  // Registered with the session registry so a rebuilt Firebase session re-arms
  // this listener without the caller having to notice (WI#19104).
  async function startSpendFileListener(spendFileVersionId: string): Promise<Unsubscribe | null> {
    const user = await ensureFirebaseSession();
    if (!user) {
      if (import.meta.env.DEV) console.warn("** subscribeToSpendFiles without firebase session");
      return null;
    }

    // Fresh run for this subscription: drop any progress carried over.
    resetSpendFileProgress();

    const documentRef = doc(firestore, "spendFileVersion", spendFileVersionId);

    const unsubscribe = onSnapshot(
      documentRef,
      (snapshot) => {
        noteSubscriptionHealthy(SUBSCRIPTION_KEYS.spendFile);
        if (!snapshot.exists()) return;

        const documentData = snapshot.data();
        if (import.meta.env.DEV) console.log("** Spend file status subscribe ", documentData);
        applySnapshot(documentData);
      },
      (error) => {
        void handleSnapshotError(SUBSCRIPTION_KEYS.spendFile, error);
      },
    );

    subscribeStore.setSpendFileSubscribe(unsubscribe);
    return unsubscribe;
  }

  async function subscribeToSpendFiles(uuidSpendFile: Array<any>) {
    // An empty id used to reach doc(firestore, "spendFileVersion", undefined),
    // which throws "Document references must have an even number of segments"
    // as an unhandled rejection and leaves no listener at all (ADA-VUE-3D).
    const spendFileVersionId = String(uuidSpendFile?.[0] ?? "").trim();
    if (!spendFileVersionId) {
      if (import.meta.env.DEV) console.warn("** Invalid spend file version id:", uuidSpendFile);
      return null;
    }

    if (import.meta.env.DEV) console.log("** subscribeToSpendFiles id spend file", uuidSpendFile);

    await openSubscription(SUBSCRIPTION_KEYS.spendFile, () =>
      startSpendFileListener(spendFileVersionId),
    );
  }

  function fnUnsubscribeToSpendFiles() {
    if (import.meta.env.DEV) console.log("** fnUnsubscribeToSpendFiles");
    subscribeStore.setLastStatusSpendFileSubscribe(null);
    resetSpendFileProgress();
    //To set null if the user change the program
    subscribeStore.setSetRefeshSpendFiles(null);

    closeSubscription(SUBSCRIPTION_KEYS.spendFile);
    subscribeStore.setSpendFileSubscribe(null);
  }

  return {
    fnUnsubscribeToSpendFiles,
    subscribeToSpendFiles,
  };
};
export default useSpendFileFirebase;
