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

const usePlanFirebase = () => {
  const { setPlanStatusReactivity } = useShownotys();
  const subscribeStore = useSubscribeStore();

  // Registered with the session registry so a rebuilt Firebase session re-arms
  // this listener without the caller having to notice (WI#19104).
  async function startPlanListener(planId: string): Promise<Unsubscribe | null> {
    const user = await ensureFirebaseSession();
    if (!user) {
      if (import.meta.env.DEV) console.warn("** subscribeToPlans without firebase session");
      return null;
    }

    const documentRef = doc(firestore, "plan", planId);

    const unsubscribe = onSnapshot(
      documentRef,
      (snapshot) => {
        noteSubscriptionHealthy(SUBSCRIPTION_KEYS.plan);
        if (!snapshot.exists()) return;

        const documentData = snapshot.data();
        if (import.meta.env.DEV) console.log("** Plan status: ", documentData);

        if (
          (subscribeStore.getLastStatusPlanSubscribe === undefined ||
            subscribeStore.getLastStatusPlanSubscribe === null) &&
          documentData.status === "ready"
        ) {
          //Only store the last date
          subscribeStore.setLastStatusPlanSubscribe(documentData.updatedAt);
        }
        //If the stored date is diff to the last status date
        else if (subscribeStore.getLastStatusPlanSubscribe !== documentData.updatedAt) {
          subscribeStore.setLastStatusPlanSubscribe(documentData.updatedAt);
          setPlanStatusReactivity(documentData.status);
        }
      },
      (error) => {
        void handleSnapshotError(SUBSCRIPTION_KEYS.plan, error);
      },
    );

    subscribeStore.setPlanSubscribe(unsubscribe);
    return unsubscribe;
  }

  async function subscribeToPlans(uuidPlan: Array<any>) {
    const planId = String(uuidPlan?.[0] ?? "").trim();
    if (!planId) {
      if (import.meta.env.DEV) console.warn("** Invalid plan id:", uuidPlan);
      return null;
    }

    await openSubscription(SUBSCRIPTION_KEYS.plan, () => startPlanListener(planId));
  }

  function fnUnsubscribeToPlans() {
    if (import.meta.env.DEV) console.log("** fnUnsubscribeToPlans");

    subscribeStore.setLastStatusPlanSubscribe(null);

    //To set null if the user change the program
    subscribeStore.setSetRefeshPlans(null);

    closeSubscription(SUBSCRIPTION_KEYS.plan);
    subscribeStore.setPlanSubscribe(null);
  }

  return {
    fnUnsubscribeToPlans,
    subscribeToPlans,
  };
};
export default usePlanFirebase;
