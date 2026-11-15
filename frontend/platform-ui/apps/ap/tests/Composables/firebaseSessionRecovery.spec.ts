import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ─── Module mocks ───────────────────────────────────────────────────────────
// Declared via vi.hoisted so the fns exist when vitest hoists the vi.mock
// factories and can be referenced directly (see useGridExportTask.spec.ts for
// why we avoid `(...args) => fn(...args)` forwarders).
const {
  signInWithCustomToken,
  signOut,
  getIdTokenResult,
  onIdTokenChanged,
  onSnapshot,
  doc,
  getFirebaseToken,
  setEventToken,
  captureException,
  authStub,
  FAKE_USER,
} = vi.hoisted(() => {
  const fakeUser = { uid: 'uid-1' }
  return {
    signInWithCustomToken: vi.fn(),
    signOut: vi.fn(),
    getIdTokenResult: vi.fn(),
    onIdTokenChanged: vi.fn(),
    onSnapshot: vi.fn(),
    doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
    getFirebaseToken: vi.fn(),
    setEventToken: vi.fn(),
    captureException: vi.fn(),
    // Mutable stand-in for the Firebase Auth singleton: tests flip currentUser
    // to simulate a lost session.
    authStub: { currentUser: fakeUser as unknown } as { currentUser: unknown },
    FAKE_USER: fakeUser,
  }
})

vi.mock('@/composables/firebase/config', () => ({
  auth: authStub,
  firestore: {},
  storage: {},
  appFirebase: {},
}))

vi.mock('firebase/auth', () => ({ signInWithCustomToken, signOut, getIdTokenResult, onIdTokenChanged }))
vi.mock('firebase/firestore', () => ({ doc, onSnapshot }))
vi.mock('@/services/user/api', () => ({ getFirebaseToken }))
vi.mock('@sentry/vue', () => ({ captureException }))

// The real store is used (it is the coordination point under test); only its
// encrypted-storage dependency is stubbed so the module graph stays light.
vi.mock('@/services/pinia/index', () => ({ secureStorage: {}, default: {} }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ setEventToken, getEventToken: 'custom-token' }),
}))
vi.mock('@/modules/home/composables/showNotys', () => ({
  default: () => ({
    showProgramNotys: vi.fn(),
    setPlanStatusReactivity: vi.fn(),
    setSpendFileStatusReactivity: vi.fn(),
  }),
}))
vi.mock('@/modules/home/composables/showClusterNotys', () => ({
  default: () => ({ showClusterStatusNotys: vi.fn() }),
}))

import useFirebase from '@/composables/firebase/useFirebase'
import usePlanFirebase from '@/composables/firebase/usePlanFirebase'
import useSpendFileFirebase from '@/composables/firebase/useSpendFileFirebase'
import {
  ensureFirebaseSession,
  openSubscription,
  resetFirebaseSessionState,
  resubscribeAll,
} from '@/composables/firebase/firebaseSession'
import { useSubscribeStore } from '@/stores/subscribe'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Makes getIdTokenResult report a token expiring `minutes` from now. */
function tokenExpiresIn(minutes: number) {
  getIdTokenResult.mockResolvedValue({
    expirationTime: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
  })
}

/** Every onSnapshot call gets its own unsubscribe spy, in call order. */
function unsubscribeSpies() {
  const spies: ReturnType<typeof vi.fn>[] = []
  onSnapshot.mockImplementation(() => {
    const spy = vi.fn()
    spies.push(spy)
    return spy
  })
  return spies
}

function docPathsPassedToOnSnapshot(): string[] {
  return doc.mock.results.map((result) => (result.value as { path: string }).path)
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  // Module-level registry survives between cases in a file; clear it so each
  // case starts with nothing subscribed.
  resetFirebaseSessionState()
  authStub.currentUser = FAKE_USER
  getFirebaseToken.mockResolvedValue({ success: true, data: { eventToken: 'custom-token' } })
  signInWithCustomToken.mockImplementation(async () => {
    authStub.currentUser = FAKE_USER
    return { user: FAKE_USER }
  })
  signOut.mockImplementation(async () => {
    authStub.currentUser = null
  })
})

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Firebase session renewal (WI#19104)', () => {
  it('does not sign out of Firebase when renewing a still-valid session', async () => {
    // 45-55 min into an ID token's life the old code entered its destructive
    // branch: signOut() killed every live listener in the app.
    tokenExpiresIn(10)
    const subscribeStore = useSubscribeStore()
    subscribeStore.setAuthFirestoreUser(FAKE_USER)
    unsubscribeSpies()

    await usePlanFirebase().subscribeToPlans(['plan-1'])

    expect(signOut).not.toHaveBeenCalled()
  })

  it('keeps the spend-file listener alive when another module triggers a renewal', async () => {
    // The reported symptom: the navbar "Updating Data" badge dies because a
    // renewal triggered from the Plan view tore the whole Firebase session down.
    const subscribeStore = useSubscribeStore()
    subscribeStore.setAuthFirestoreUser(FAKE_USER)
    const spies = unsubscribeSpies()

    tokenExpiresIn(50)
    await useSpendFileFirebase().subscribeToSpendFiles(['sf-1'])
    expect(docPathsPassedToOnSnapshot()).toContain('spendFileVersion/sf-1')

    // Now slide into the renewal window and subscribe from a different module.
    tokenExpiresIn(10)
    await usePlanFirebase().subscribeToPlans(['plan-1'])

    // The spend-file listener must not have been torn down.
    expect(spies[0]).not.toHaveBeenCalled()
    expect(subscribeStore.getSpendFileSubscribe).not.toBeNull()
  })

  it('re-arms every registered listener after the session is re-established', async () => {
    const subscribeStore = useSubscribeStore()
    subscribeStore.setAuthFirestoreUser(FAKE_USER)
    unsubscribeSpies()

    tokenExpiresIn(50)
    await useSpendFileFirebase().subscribeToSpendFiles(['sf-1'])
    await usePlanFirebase().subscribeToPlans(['plan-1'])
    onSnapshot.mockClear()
    doc.mockClear()

    // Session is lost (e.g. the tab was suspended past the refresh window).
    authStub.currentUser = null
    await resubscribeAll()

    const paths = docPathsPassedToOnSnapshot()
    expect(paths).toContain('spendFileVersion/sf-1')
    expect(paths).toContain('plan/plan-1')
  })

  it('actually tears down the plan and spend-file listeners on explicit logout', async () => {
    // Regression: logoutFirebase imported the composable factories instead of
    // their unsubscribe fns, so these two teardowns were silent no-ops.
    const subscribeStore = useSubscribeStore()
    subscribeStore.setAuthFirestoreUser(FAKE_USER)
    const spies = unsubscribeSpies()

    tokenExpiresIn(50)
    await useSpendFileFirebase().subscribeToSpendFiles(['sf-1'])
    await usePlanFirebase().subscribeToPlans(['plan-1'])

    await useFirebase().logoutFirebase()

    expect(spies[0]).toHaveBeenCalled()
    expect(spies[1]).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalled()
  })

  it('retries a transient event-token failure instead of going dark', async () => {
    // Losing the mint on mount used to leave realtime dead until the user
    // happened to trigger another subscription.
    vi.useFakeTimers()
    authStub.currentUser = null
    getFirebaseToken
      .mockResolvedValueOnce({ success: false, code: 503, data: null })
      .mockResolvedValueOnce({ success: false, code: 503, data: null })
      .mockResolvedValueOnce({ success: true, data: { eventToken: 'custom-token' } })

    const pending = ensureFirebaseSession()
    await vi.runAllTimersAsync()

    expect(await pending).toBe(FAKE_USER)
    expect(getFirebaseToken).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })

  it('does not retry when the endpoint says the ADA session is gone', async () => {
    // A 401 means no amount of retrying produces a token.
    authStub.currentUser = null
    getFirebaseToken.mockResolvedValue({ success: false, code: 401, data: null })

    expect(await ensureFirebaseSession()).toBeNull()
    expect(getFirebaseToken).toHaveBeenCalledTimes(1)
  })

  it('closes the superseded listener when two opens for the same key race', async () => {
    // While the first start() is in flight its entry has no unsubscribe yet, so
    // a concurrent open for the same key drops it from the registry without
    // closing anything; when the late start() resolves, its listener must be
    // closed instead of staying open with nothing referencing it.
    const firstUnsubscribe = vi.fn()
    const secondUnsubscribe = vi.fn()
    let releaseFirst!: () => void
    const firstStart = () =>
      new Promise<() => void>((resolve) => {
        releaseFirst = () => resolve(firstUnsubscribe)
      })

    const racePending = openSubscription('race-key', firstStart)
    await openSubscription('race-key', async () => secondUnsubscribe)

    releaseFirst()
    await racePending

    // The loser's listener must have been closed, and the winner's kept.
    expect(firstUnsubscribe).toHaveBeenCalled()
    expect(secondUnsubscribe).not.toHaveBeenCalled()
  })

  it('does not open a listener when the document id is missing', async () => {
    // Sentry ADA-VUE-3D: doc(firestore, "spendFileVersion") threw an unhandled
    // FirebaseError and the listener was never created.
    const subscribeStore = useSubscribeStore()
    subscribeStore.setAuthFirestoreUser(FAKE_USER)
    unsubscribeSpies()
    tokenExpiresIn(50)

    await useSpendFileFirebase().subscribeToSpendFiles([undefined as unknown as string])

    expect(onSnapshot).not.toHaveBeenCalled()
  })
})
