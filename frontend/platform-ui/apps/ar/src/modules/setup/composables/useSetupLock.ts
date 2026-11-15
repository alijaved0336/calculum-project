/**
 * AB#20702 (impl plan L): the Setup page's shared lock. `SetupView` creates it with
 * `provideSetupLock()`, every Setup section reads it with `useSetupLock()`, so one poll drives the
 * lock for all tabs (FR-08) and stories 2-7 reuse it unchanged.
 *
 * While the sale file version is being calculated, Setup is locked and the status is polled every
 * `POLL_INTERVAL_MS`, as a timeout chain (no overlapping requests) that parks while the tab is
 * hidden, same policy as `useVersionStatusPoll`. When it unlocks, the `onUnlocked` callbacks run so
 * each section reloads its settings (main flow step 23).
 */
import { computed, inject, onBeforeUnmount, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { POLL_INTERVAL_MS } from '@/composables/useVersionStatusPoll'
import { setupApi, type SetupStatus } from '../api'

export interface SetupLock {
  locked: Readonly<Ref<boolean>>
  failed: Readonly<Ref<boolean>>
  progress: Readonly<Ref<{ currentStep: number | null; totalSteps: number | null }>>
  /** Reads the status once, and keeps polling while locked. */
  refresh(): Promise<void>
  /** After an accepted save (202) or a refused one (409): lock at once and follow the run. */
  startAfterSave(): void
  onUnlocked(callback: () => void): void
}

const SETUP_LOCK_KEY: InjectionKey<SetupLock> = Symbol('setupLock')
/** Reads of a never-read status retried before giving up (a 403 or an outage must not poll forever). */
export const MAX_UNREAD_RETRIES = 5

export function createSetupLock(versionId: Ref<number | null>): SetupLock & { stop(): void } {
  const status = ref<SetupStatus | null>(null)
  const claimedLocally = ref(false)
  const unlockedCallbacks: (() => void)[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let parked = false
  let failedReads = 0
  // Bumped by every local claim, so a status read issued before a save cannot release it.
  let claimGeneration = 0

  // The API's own `locked` (false only for ready / errorCalculating / errorReCalculating).
  const locked = computed(() => claimedLocally.value || status.value?.locked === true)
  const failed = computed(() => status.value?.isError === true)
  const progress = computed(() => ({
    currentStep: status.value?.currentStep ?? null,
    totalSteps: status.value?.totalSteps ?? null,
  }))

  function clear(): void {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    parked = false
  }

  function schedule(): void {
    clear()
    // A version whose status was never read keeps asking (a bounded number of times): a failed first
    // read must not leave it editable.
    if (!locked.value && (status.value !== null || failedReads >= MAX_UNREAD_RETRIES)) return
    if (document.visibilityState === 'hidden') {
      parked = true
      return
    }
    timer = setTimeout(() => void refresh(), POLL_INTERVAL_MS)
  }

  async function refresh(): Promise<void> {
    const id = versionId.value
    if (id === null) return
    const generation = claimGeneration
    let next: SetupStatus
    try {
      next = await setupApi.fetchSetupStatus(id)
    } catch {
      // A failed poll keeps the last known state and tries again, so a blip cannot leave Setup locked.
      if (versionId.value === id) {
        failedReads++
        schedule()
      }
      return
    }
    // A switch already read the new version; a save since then already scheduled its own read.
    if (versionId.value !== id || generation !== claimGeneration) return
    const wasLocked = locked.value
    failedReads = 0
    status.value = next
    claimedLocally.value = false
    if (wasLocked && !locked.value) {
      unlockedCallbacks.forEach((callback) => callback())
    }
    schedule()
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible' && parked) {
      parked = false
      void refresh()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  // The lock belongs to the version: a switch drops the previous one's state and reads the new one.
  const stopVersionWatch = watch(versionId, () => {
    clear()
    status.value = null
    claimedLocally.value = false
    failedReads = 0
    void refresh()
  })

  return {
    locked,
    failed,
    progress,
    refresh,
    startAfterSave() {
      claimGeneration++
      claimedLocally.value = true
      schedule()
    },
    onUnlocked(callback) {
      unlockedCallbacks.push(callback)
    },
    stop() {
      clear()
      stopVersionWatch()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    },
  }
}

export function provideSetupLock(versionId: Ref<number | null>): SetupLock {
  const lock = createSetupLock(versionId)
  provide(SETUP_LOCK_KEY, lock)
  onBeforeUnmount(() => lock.stop())
  return lock
}

export function useSetupLock(): SetupLock {
  const lock = inject(SETUP_LOCK_KEY)
  if (!lock) {
    throw new Error('useSetupLock() needs a SetupView ancestor that called provideSetupLock()')
  }
  return lock
}
