import { auth } from "./config";
import { signInWithCustomToken, signOut, onIdTokenChanged, type User } from "firebase/auth";
import type { Unsubscribe } from "firebase/firestore";
import { captureException } from "@sentry/vue";
import { useSubscribeStore } from "@/stores/subscribe";

// `@/services/user/api` and `@/stores/user` are only needed to mint a session,
// and both pull in a large module graph. This module is imported from anywhere
// that opens or closes a listener, so keeping those out of its static imports
// keeps it cheap to import -- and stops an unrelated unit test from having to
// mock the whole API surface just to reach closeSubscription().
async function loadMintDependencies() {
  const [{ getFirebaseToken }, { useUserStore }] = await Promise.all([
    import("@/services/user/api"),
    import("@/stores/user"),
  ]);

  return { getFirebaseToken, useUserStore };
}

/**
 * Single owner of the Firebase session and of every live Firestore listener
 * (WI#19104).
 *
 * Why this module exists: renewal used to run inside `checkExpirationtoken`,
 * which called `signOut(auth)` and then signed back in. `signOut` drops every
 * open `onSnapshot`, and only the caller that happened to trigger the renewal
 * re-opened its own listener — so a renewal fired from, say, the Plan view
 * silently killed the navbar's spend-file listener for the rest of the session.
 *
 * Two facts shape the design:
 *  - The custom token minted by `/api/session/envent-token` only has to survive
 *    long enough to be exchanged. Once exchanged, the Firebase SDK refreshes the
 *    ID token on its own, so there is nothing to renew on a timer.
 *  - Signing in again with a custom token replaces the credential in place. It
 *    is the `signOut` that was destructive, not the sign-in.
 *
 * So: never sign out except on a real logout, keep a registry of what is
 * subscribed, and re-arm the registry whenever the session has to be rebuilt.
 */

export type SubscriptionStarter = () => Promise<Unsubscribe | null> | Unsubscribe | null;

interface SubscriptionEntry {
  start: SubscriptionStarter;
  unsubscribe: Unsubscribe | null;
}

/** Stable keys so a re-subscribe replaces a listener instead of stacking one. */
export const SUBSCRIPTION_KEYS = {
  program: "program",
  plan: "plan",
  spendFile: "spendFile",
  clusters: "clusters",
} as const;

/** Bounded so a permanently-denied document cannot spin forever. */
const MAX_RECOVERY_ATTEMPTS = 3;

/** Bounded so a dead endpoint cannot turn into a request loop. */
const MINT_MAX_ATTEMPTS = 3;
const MINT_RETRY_BASE_MS = 800;
const HTTP_UNAUTHORIZED = 401;

/** Distinguishes "mint failed, try again" from "mint failed, give up". */
const RETRY = Symbol("retry");

const subscriptions = new Map<string, SubscriptionEntry>();
const recoveryAttempts = new Map<string, number>();

let sessionPromise: Promise<User | null> | null = null;
let idTokenListenerAttached = false;
let resubscribing: Promise<void> | null = null;
let signingOutDeliberately = false;

const SENTRY_TAGS = { area: "firebase-session" };

function report(error: unknown, subscription?: string): void {
  captureException(error, {
    tags: subscription ? { ...SENTRY_TAGS, subscription } : SENTRY_TAGS,
  });
}

/**
 * Mirrors the real Firebase auth state into the store. The store value is for
 * the UI only — nothing in this module gates on it, because a stale `false`
 * there used to be a dead end that only a page reload could clear.
 */
function syncAuthState(user: User | null): void {
  try {
    useSubscribeStore().setAuthFirestoreUser(user);
  } catch (error) {
    // Pinia not active yet (very early boot). Not worth failing a sign-in over.
    report(error);
  }
}

function attachIdTokenListener(): void {
  if (idTokenListenerAttached) return;
  idTokenListenerAttached = true;

  onIdTokenChanged(auth, (user) => {
    syncAuthState(user);
    // A sign-out we did not ask for means the SDK could not keep the session
    // alive (revoked refresh token, tab suspended past the refresh window).
    // Rebuild it and put every listener back.
    if (!user && !signingOutDeliberately) {
      void recoverSession();
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function mintOnce(): Promise<User | null | typeof RETRY> {
  const { getFirebaseToken, useUserStore } = await loadMintDependencies();
  const response = await getFirebaseToken();
  const eventToken = response?.success ? response?.data?.eventToken : null;

  if (!eventToken) {
    // A 401 means the ADA session itself is gone, so no amount of retrying
    // produces a token. Anything else (5xx, network) is worth another go.
    if (response?.code === HTTP_UNAUTHORIZED) {
      report(new Error("Firebase event token refused: the ADA session is gone"));
      return null;
    }
    return RETRY;
  }

  useUserStore().setEventToken(eventToken);
  const credential = await signInWithCustomToken(auth, eventToken);
  syncAuthState(credential.user);

  return credential.user;
}

/**
 * A transient failure here used to leave realtime dark until the user happened
 * to trigger another subscription — the very symptom this module exists to
 * prevent — so a handful of bounded retries is worth the wait.
 */
async function mintSession(): Promise<User | null> {
  for (let attempt = 1; attempt <= MINT_MAX_ATTEMPTS; attempt++) {
    const lastAttempt = attempt === MINT_MAX_ATTEMPTS;

    try {
      const result = await mintOnce();
      if (result !== RETRY) return result;

      if (lastAttempt) {
        report(new Error("Firebase event token unavailable after retries"));
        return null;
      }
    } catch (error) {
      if (lastAttempt) {
        report(error);
        return null;
      }
    }

    await delay(MINT_RETRY_BASE_MS * attempt);
  }

  return null;
}

/**
 * Returns the signed-in Firebase user, signing in if there is none.
 *
 * Idempotent and safe to call from anywhere: concurrent callers share one
 * in-flight sign-in instead of racing each other into overlapping
 * sign-in/sign-out cycles.
 */
export async function ensureFirebaseSession(): Promise<User | null> {
  attachIdTokenListener();

  const current = auth.currentUser;
  if (current) return current;

  if (!sessionPromise) {
    sessionPromise = mintSession();
    void sessionPromise
      .catch(() => null)
      .finally(() => {
        sessionPromise = null;
      });
  }

  return sessionPromise;
}

async function recoverSession(): Promise<void> {
  const user = await ensureFirebaseSession();
  if (user) await resubscribeAll();
}

/**
 * Opens (or replaces) the listener registered under `key` and remembers how to
 * rebuild it. `start` must return the Firestore unsubscribe fn, or null when it
 * could not subscribe.
 */
export async function openSubscription(
  key: string,
  start: SubscriptionStarter,
): Promise<Unsubscribe | null> {
  closeSubscription(key);

  const entry: SubscriptionEntry = { start, unsubscribe: null };
  subscriptions.set(key, entry);
  const unsubscribe = (await start()) ?? null;

  // A concurrent call for the same key may have replaced this entry while
  // start() was in flight (its unsubscribe was still null, so closeSubscription
  // had nothing to call). The listener just opened would then be referenced by
  // nothing: close it instead of leaking it.
  if (subscriptions.get(key) !== entry) {
    closeOrphanListener(key, unsubscribe);
    return null;
  }

  entry.unsubscribe = unsubscribe;

  return entry.unsubscribe;
}

/** Closes a listener that lost its registry slot while it was being opened. */
function closeOrphanListener(key: string, unsubscribe: Unsubscribe | null): void {
  if (!unsubscribe) return;
  try {
    unsubscribe();
  } catch (error) {
    report(error, key);
  }
}

export function closeSubscription(key: string): void {
  const entry = subscriptions.get(key);
  if (entry?.unsubscribe) {
    try {
      entry.unsubscribe();
    } catch (error) {
      report(error, key);
    }
  }
  subscriptions.delete(key);
  recoveryAttempts.delete(key);
}

export function closeAllSubscriptions(): void {
  // Snapshot: closeSubscription deletes from the map as we go.
  const keys = [...subscriptions.keys()];
  for (const key of keys) closeSubscription(key);
}

async function restart(key: string, entry: SubscriptionEntry): Promise<void> {
  if (entry.unsubscribe) {
    try {
      entry.unsubscribe();
    } catch (error) {
      report(error, key);
    }
    entry.unsubscribe = null;
  }

  const unsubscribe = (await entry.start()) ?? null;

  // The entry may have been replaced or closed while start() was in flight
  // (openSubscription / closeSubscription on the same key). Writing into the
  // detached object would leak this listener — close it instead.
  if (subscriptions.get(key) !== entry) {
    closeOrphanListener(key, unsubscribe);
    return;
  }

  entry.unsubscribe = unsubscribe;
}

async function restartEverySubscription(): Promise<void> {
  // Snapshot the keys, then re-read each entry: a start() callback may register
  // further subscriptions, and openSubscription replaces the entry object for a
  // key rather than mutating it. Restarting the snapshot's detached object would
  // open a listener whose unsubscribe fn nothing holds any more.
  const keys = [...subscriptions.keys()];

  for (const key of keys) {
    const entry = subscriptions.get(key);
    if (!entry) continue;

    try {
      await restart(key, entry);
    } catch (error) {
      report(error, key);
    }
  }
}

/**
 * Re-arms every registered listener. Used after the session is rebuilt.
 *
 * Concurrent callers share the in-flight pass rather than being dropped, so a
 * caller that awaits this knows the re-arm has actually finished (onIdTokenChanged
 * can fire twice in quick succession during recovery).
 */
export async function resubscribeAll(): Promise<void> {
  resubscribing ??= restartEverySubscription().finally(() => {
    resubscribing = null;
  });

  return resubscribing;
}

/**
 * Shared `onSnapshot` error handler. Auth-shaped failures re-establish the
 * session and re-open that one listener; anything else is reported and left to
 * the caller. Always reports — the previous handlers only logged under
 * `import.meta.env.DEV`, so production had no signal at all.
 */
export async function handleSnapshotError(key: string, error: unknown): Promise<void> {
  report(error, key);

  const code = (error as { code?: string })?.code;
  if (code !== "permission-denied" && code !== "unauthenticated") return;

  const attempts = (recoveryAttempts.get(key) ?? 0) + 1;
  if (attempts > MAX_RECOVERY_ATTEMPTS) return;
  recoveryAttempts.set(key, attempts);

  const entry = subscriptions.get(key);
  if (!entry) return;

  const user = await ensureFirebaseSession();
  if (!user) return;

  // Re-check after the await: the subscription may have been replaced or closed
  // while the session was being re-established, and restarting the stale entry
  // would open a listener nothing holds a reference to.
  if (subscriptions.get(key) !== entry) return;

  try {
    await restart(key, entry);
  } catch (retryError) {
    report(retryError, key);
  }
}

/** A snapshot arrived, so the listener is healthy again: clear its retry budget. */
export function noteSubscriptionHealthy(key: string): void {
  recoveryAttempts.delete(key);
}

/**
 * Real logout: the only place allowed to sign out. Closes every listener first
 * so none of them observes the sign-out, and suppresses the auto-recovery that
 * `onIdTokenChanged` would otherwise trigger.
 */
export async function teardownFirebaseSession(): Promise<void> {
  signingOutDeliberately = true;
  try {
    closeAllSubscriptions();
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (error) {
    report(error);
  } finally {
    // In the finally so a failed signOut cannot leave the store advertising a
    // user the app has already torn every listener away from.
    syncAuthState(null);
    signingOutDeliberately = false;
  }
}

export function hasFirebaseSession(): boolean {
  return auth.currentUser !== null && auth.currentUser !== undefined;
}

/**
 * Test seam. Module-level state survives between tests in a file; this clears
 * it so cases stay independent. Not used by application code.
 */
export function resetFirebaseSessionState(): void {
  subscriptions.clear();
  recoveryAttempts.clear();
  sessionPromise = null;
  idTokenListenerAttached = false;
  resubscribing = null;
  signingOutDeliberately = false;
}
