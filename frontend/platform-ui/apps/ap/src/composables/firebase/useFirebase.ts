import { auth, firestore } from "./config";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getIdTokenResult } from "firebase/auth";
import { useSubscribeStore } from "@/stores/subscribe";
import useShownotys from "@/modules/home/composables/showNotys";
import useClusterShowNotys from "@/modules/home/composables/showClusterNotys";
import usePlanFirebase from "@/composables/firebase/usePlanFirebase";
import useSpendFileFirebase from "@/composables/firebase/useSpendFileFirebase";
import {
  SUBSCRIPTION_KEYS,
  closeSubscription,
  ensureFirebaseSession,
  handleSnapshotError,
  hasFirebaseSession,
  noteSubscriptionHealthy,
  openSubscription,
  teardownFirebaseSession,
} from "@/composables/firebase/firebaseSession";

const useFirebase = () => {
  const { showProgramNotys } = useShownotys();
  const { showClusterStatusNotys } = useClusterShowNotys();
  const subscribeStore = useSubscribeStore();

  const loginFirebase = async () => {
    return await ensureFirebaseSession();
  };

  const logoutFirebase = async () => {
    // These were previously called through a broken default import (the module's
    // default export is the composable factory, not the unsubscribe fn), so the
    // plan and spend-file listeners were never actually torn down (WI#19104).
    fnSetUnsubscribeProgram();
    fnSetUnsubscribeClusters();
    usePlanFirebase().fnUnsubscribeToPlans();
    useSpendFileFirebase().fnUnsubscribeToSpendFiles();

    await teardownFirebaseSession();
    return true;
  };

  /**
   * Ensures there is a usable Firebase session before subscribing.
   *
   * It used to sign out and sign back in whenever the ID token was within 15
   * minutes of expiry, which killed every open listener in the app. The SDK
   * refreshes the ID token by itself, so there is nothing to pre-empt: all this
   * has to guarantee is that a session exists.
   *
   * Returns true when a session is available, false when one could not be
   * established (callers fall back to their own login flow).
   */
  const checkExpirationtoken = async (from: string) => {
    if (import.meta.env.DEV) console.log("**checkExpirationtoken from", from);

    const user = await ensureFirebaseSession();
    return user !== null;
  };

  async function startClustersListener(
    collectionName: string,
    documentId: string,
  ): Promise<Unsubscribe | null> {
    const user = await ensureFirebaseSession();
    if (!user) {
      if (import.meta.env.DEV) console.warn("** subscribeToClusters without firebase session");
      return null;
    }

    const documentRef = doc(firestore, collectionName, documentId);

    const unsubscribe = onSnapshot(
      documentRef,
      (snapshot) => {
        noteSubscriptionHealthy(SUBSCRIPTION_KEYS.clusters);
        if (!snapshot.exists()) return;

        const documentData = snapshot.data();
        subscribeStore.setPeerStandardClusterVersion(
          documentData?.peerGroupClustersLastVersion ?? null,
        );
        subscribeStore.setSupplierStandardClusterStatus(
          documentData?.supplierStandardClustersStatus ?? null,
        );
        showClusterStatusNotys(documentData);
      },
      (error) => {
        void handleSnapshotError(SUBSCRIPTION_KEYS.clusters, error);
      },
    );

    subscribeStore.setClusterSubscribe(unsubscribe);
    return unsubscribe;
  }

  async function subscribeToClusters(collectionName: string, documentId: string) {
    if (
      !collectionName ||
      !documentId ||
      typeof collectionName !== "string" ||
      typeof documentId !== "string"
    ) {
      if (import.meta.env.DEV)
        console.error(
          "*** ERROR: collectionName and documentId must be strings and are required to subscribe to a document",
        );
      return null;
    }

    await openSubscription(SUBSCRIPTION_KEYS.clusters, () =>
      startClustersListener(collectionName, documentId),
    );
  }

  async function startProgramListener(programId: string): Promise<Unsubscribe | null> {
    const user = await ensureFirebaseSession();
    if (!user) {
      if (import.meta.env.DEV) console.warn("** subscribeToPrograms without firebase session");
      return null;
    }

    const documentRef = doc(firestore, "program", programId);

    const unsubscribe = onSnapshot(
      documentRef,
      (snapshot) => {
        noteSubscriptionHealthy(SUBSCRIPTION_KEYS.program);
        if (!snapshot.exists()) return;

        const documentData = snapshot.data();
        if (import.meta.env.DEV) console.log("** Program status: ", documentData);

        if (
          (subscribeStore.getLastStatusDate === undefined ||
            subscribeStore.getLastStatusDate === null) &&
          documentData.status === "ready"
        ) {
          //Only store the last date
          subscribeStore.setLastStatusDate(documentData.updatedAt);
        } else if (subscribeStore.getLastStatusDate !== documentData.updatedAt) {
          //If the stored date is diff to the last status date
          subscribeStore.setLastStatusDate(documentData.updatedAt);
          showProgramNotys(documentData.status);
        }
      },
      (error) => {
        void handleSnapshotError(SUBSCRIPTION_KEYS.program, error);
      },
    );

    subscribeStore.setProgramSubscribe(unsubscribe);
    return unsubscribe;
  }

  async function subscribeToPrograms(uuidPrograms: Array<any>) {
    if (!Array.isArray(uuidPrograms) || !uuidPrograms.length || !uuidPrograms[0]) {
      if (import.meta.env.DEV) console.warn("** Invalid uuidPrograms:", uuidPrograms);
      return null;
    }

    const programId = String(uuidPrograms[0]).trim();
    if (!programId) {
      if (import.meta.env.DEV) console.warn("** Empty program ID");
      return null;
    }

    await openSubscription(SUBSCRIPTION_KEYS.program, () => startProgramListener(programId));
  }

  function forceLogoutFirebase() {
    subscribeStore.setAuthFirestoreUser(null);
  }

  /**
   * Verifica si el usuario está realmente autenticado en Firebase
   * @returns {Promise<boolean>} true si está autenticado, false si no
   */
  const isUserAuthenticated = async (): Promise<boolean> => {
    try {
      if (!auth.currentUser) {
        return false;
      }

      // Verificar que el token sea válido
      const tokenResult = await getIdTokenResult(auth.currentUser);
      const expirationTime = new Date(tokenResult.expirationTime);
      const currentTime = new Date();

      if (currentTime >= expirationTime) {
        if (import.meta.env.DEV) console.log("** Token expired, user not authenticated");
        return false;
      }

      if (import.meta.env.DEV) console.log("** User authenticated:", auth.currentUser.uid);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error("** Error checking authentication:", error);
      return false;
    }
  };

  /**
   * Verifica el estado completo de autenticación de Firebase
   * @returns {Promise<{isAuthenticated: boolean, userId: string | null, error: string | null}>}
   */
  const getAuthenticationStatus = async () => {
    try {
      const isAuthenticated = await isUserAuthenticated();

      return {
        isAuthenticated,
        userId: auth.currentUser?.uid || null,
        error: null,
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        userId: null,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  };

  function fnSetUnsubscribeClusters() {
    subscribeStore.setPeerStandardClusterVersion(0);
    subscribeStore.setPeerStandardClusterStatus("");

    closeSubscription(SUBSCRIPTION_KEYS.clusters);
    subscribeStore.setClusterSubscribe(null);
  }

  function fnSetUnsubscribeProgram() {
    if (import.meta.env.DEV) console.log("** fnSetUnsubscribeProgram");
    subscribeStore.setLastStatusDate(null);

    //To set null if the user change the program
    subscribeStore.setRefreshPrograms("");

    closeSubscription(SUBSCRIPTION_KEYS.program);
    subscribeStore.setProgramSubscribe(null);
  }

  return {
    fnSetUnsubscribeProgram,
    fnSetUnsubscribeClusters,
    loginFirebase,
    logoutFirebase,
    subscribeToClusters,
    subscribeToPrograms,
    forceLogoutFirebase,
    checkExpirationtoken,
    isUserAuthenticated,
    getAuthenticationStatus,
    hasFirebaseSession,
  };
};
export default useFirebase;
