import { ref } from 'vue'
import { fetchVersionStatus, type CalculationStatus } from '@/api'
import { HttpError, SessionExpiredError } from '@/api/http'
import { isActiveStatus } from '@/modules/match/utils/versionStatus'
import { useLoadToken } from './useLoadToken'

/**
 * UC-API-04 documents "the documented interval" without ever naming one, and defines no push
 * channel, ETag or Retry-After. Three seconds keeps a fifty-step run's progress readable
 * without turning one open tab into meaningful load on a single-row read.
 */
export const POLL_INTERVAL_MS = 3000

/**
 * Polls one sale-file version's calculation status (UC-FE-05a watching UC-API-04).
 *
 * `start(versionId)` fetches immediately, then re-fetches every `POLL_INTERVAL_MS` for as long
 * as the status is one the pipeline is still moving through - `ready`, `processed` and the
 * error states are resting places, and polling a resting place would hammer the API for an
 * answer that only a user action changes. Each next fetch is scheduled AFTER the previous one
 * lands (a timeout chain, not an interval), so a slow response never overlaps the next request.
 *
 * The owner calls `stop()` when the screen leaves; `start` on a new version implicitly cancels
 * the old one's chain, and `useLoadToken` keeps a stale in-flight response from writing over
 * the fresher version's state.
 */
export function useVersionStatusPoll() {
  const status = ref<CalculationStatus | null>(null)
  /** True until the FIRST answer for the current version lands; refreshes are silent. */
  const loading = ref(true)
  const notFound = ref(false)
  const loadError = ref(false)

  const { start: startLoad, isStale } = useLoadToken()
  let timer: ReturnType<typeof setTimeout> | undefined
  /** Set instead of the timer while the tab is hidden; `visibilitychange` resumes from it. */
  let paused: { versionId: number; token: number } | null = null

  function clearScheduled(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    paused = null
  }

  function onVisibilityChange(): void {
    if (document.visibilityState !== 'visible' || paused === null) {
      return
    }
    const resume = paused
    paused = null
    void poll(resume.versionId, resume.token)
  }

  /**
   * Flat payload; while the 50 step bodies are stubs, most ticks return a byte-identical
   * answer, and writing an identical object to the ref would re-render the view (two
   * `toLocaleString` calls and every label) for nothing every three seconds. Compared over the
   * ANSWER's own keys rather than a hand-kept field list, so a field the API grows later is
   * compared from the day it appears instead of silently never re-rendering.
   */
  function isUnchanged(next: CalculationStatus): boolean {
    const prev = status.value
    return (
      prev !== null &&
      (Object.keys(next) as (keyof CalculationStatus)[]).every((key) => prev[key] === next[key])
    )
  }

  /** Arms the next fetch while the pipeline is still moving; a hidden tab parks instead. */
  function scheduleNext(versionId: number, token: number, statusValue: string | null): void {
    if (!isActiveStatus(statusValue)) {
      return
    }
    if (document.visibilityState === 'hidden') {
      // A backgrounded tab stops asking (same policy as useSessionKeepAlive): nobody is
      // looking, and the answer resumes with one immediate fetch when somebody is again.
      paused = { versionId, token }
    } else {
      timer = setTimeout(() => {
        void poll(versionId, token)
      }, POLL_INTERVAL_MS)
    }
  }

  /**
   * Classifies a poll failure into the screen state it should produce (the same split
   * DashboardView's applyLoadFailure makes, for the same reason: the branching that tells a
   * session expiry, a missing version and a generic failure apart should not pile onto the
   * function already tracking staleness). Returns true when the page is redirecting to
   * sign-in - the caller then holds the loading state rather than flashing an error over a
   * document that is already leaving.
   */
  function applyPollFailure(cause: unknown): boolean {
    if (cause instanceof SessionExpiredError) {
      return true
    }
    if (cause instanceof HttpError && cause.status === 404) {
      notFound.value = true
    } else {
      // Transient or not, the chain stops here rather than retrying blind: the view keeps a
      // retry affordance, and an analyst mid-outage sees one honest failure instead of a
      // progress bar that silently froze.
      loadError.value = true
    }
    return false
  }

  async function poll(versionId: number, token: number): Promise<void> {
    /** Set when the http client has started the sign-in redirect, so `finally` leaves the spinner up. */
    let redirecting = false
    try {
      const result = await fetchVersionStatus(versionId)
      if (isStale(token)) {
        return
      }
      if (!isUnchanged(result)) {
        status.value = result
      }
      loadError.value = false
      scheduleNext(versionId, token, result.status)
    } catch (cause) {
      if (isStale(token)) {
        return
      }
      redirecting = applyPollFailure(cause)
    } finally {
      if (!isStale(token) && !redirecting) {
        loading.value = false
      }
    }
  }

  function start(versionId: number): void {
    clearScheduled()
    document.addEventListener('visibilitychange', onVisibilityChange)
    const token = startLoad()
    status.value = null
    loading.value = true
    notFound.value = false
    loadError.value = false
    void poll(versionId, token)
  }

  /**
   * Refetches once without resetting the screen, and re-enters the polling chain if the answer
   * is an active status - what the view calls right after a recalculation is accepted, when the
   * version has just moved back into motion. Awaitable, so a caller holding a button disabled
   * can keep it disabled until the refreshed status has actually landed.
   */
  function refresh(versionId: number): Promise<void> {
    clearScheduled()
    return poll(versionId, startLoad())
  }

  function stop(): void {
    clearScheduled()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    // Invalidate whatever is in flight so a response landing after the screen left writes nothing.
    startLoad()
  }

  return { status, loading, notFound, loadError, start, refresh, stop }
}
