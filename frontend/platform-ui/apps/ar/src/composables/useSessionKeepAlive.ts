import { watch, type WatchStopHandle } from 'vue'
import { useSession } from '@ada/auth'
import { refreshSession } from '@/api'

/**
 * How long before the access token expires the renewal is attempted.
 *
 * **Two minutes, and the number is a trade between two failures rather than a preference.** Too
 * small and a renewal that has to be retried runs out of runway before the token dies; too large
 * and every session is renewed for most of its life, which is a request per user per few minutes
 * against B2C for nothing. Two minutes leaves room for {@link MINIMUM_DELAY_MS} to be spent four
 * times over.
 */
const RENEW_BEFORE_EXPIRY_MS = 2 * 60 * 1000

/**
 * The floor under every delay, and **the single thing that keeps this from becoming a request loop**.
 *
 * Each pass schedules from the session's own expiry, so a renewal that did not move the expiry —
 * a 502 while B2C is refusing inside its grace window, a 409 from a contended write, a session
 * already past its expiry — computes a due time in the past. Without a floor that is an immediate
 * retry, then another, for as long as the failure lasts, which is precisely when hammering the
 * identity provider is worst. With one, the same arithmetic is a thirty-second backoff and needs no
 * retry counter or failure state to produce it.
 */
const MINIMUM_DELAY_MS = 30 * 1000

/**
 * Renews the receivables session before its access token expires (UC-ENT-08).
 *
 * <b>The session has carried `sessionExpiresAt` since the first AR screen and nothing has ever read
 * it.</b> So a session survived only because navigating re-validated it: an analyst who left one
 * screen open past the token's life was signed out mid-task, and the endpoint that would have
 * prevented it (`GET /api/session/refresh-token`) had no caller in this repository at all.
 *
 * <b>Silent on purpose.</b> The use case says the front end "warns", and a renewal that works is
 * invisible by design — the point is that nothing happens. An expiry dialog is a product decision
 * nobody has made, and a warning shown two minutes before every hour would train people to dismiss
 * it. What is not silent is a session that is genuinely gone: a 401 sends the analyst to sign in,
 * which the transport already does for every other call.
 *
 * <b>One instance, at the top of the application.</b> Started from a route guard it would restart on
 * every navigation, and each restart is another timer against the same session.
 */
export function useSessionKeepAlive() {
  const { session, fetchSession } = useSession()

  let timer: ReturnType<typeof setTimeout> | undefined
  let dueAt: number | undefined
  let running = false
  let stopped = true
  let unwatch: WatchStopHandle | undefined

  /**
   * When the next attempt is due, in wall-clock milliseconds.
   *
   * `sessionExpiresAt` is **unix SECONDS**, which is the one detail worth converting in a named
   * function: the two units are indistinguishable at a glance, and a keep-alive reading
   * milliseconds renews constantly while one reading seconds as milliseconds never renews at all
   * (gap G-48 in `Ada-Platform`, which is the same mistake made one layer down).
   */
  function nextDueAt(): number | undefined {
    const expiresAt = session.value?.sessionExpiresAt

    return expiresAt === undefined ? undefined : expiresAt * 1000 - RENEW_BEFORE_EXPIRY_MS
  }

  function schedule(): void {
    clear()

    if (stopped) {
      return
    }

    const due = nextDueAt()

    if (due === undefined) {
      // No session to keep alive. Nothing is scheduled rather than a poll waiting for one to
      // appear: the watcher in `start` arms this again once there is one. `clear` above has already
      // put `dueAt` back, which is what stops the catch-up path from firing with no timer armed.
      return
    }

    const delay = Math.max(due - Date.now(), MINIMUM_DELAY_MS)

    // WHEN THE TIMER WILL ACTUALLY FIRE, not when the renewal was due, and the difference is the
    // whole floor. Raised in review of this pull request. Every case the floor governs — a failed
    // renewal that did not move the expiry, an expiry already past — has a due time in the PAST, so
    // recording that as `dueAt` left `onVisible` finding it overdue on every single
    // `visibilitychange`. Alt-tabbing during a B2C outage would then be one renewal per focus,
    // which walks straight past the only rate limit this composable has.
    dueAt = Date.now() + delay
    timer = setTimeout(renew, delay)
  }

  async function renew(): Promise<void> {
    if (running || stopped) {
      return
    }

    running = true

    try {
      await refreshSession()
    } catch (renewError) {
      // Named for the rule Sonar enforces on catch parameters (typescript:S7718).
      //
      // NOTHING IS RE-THROWN AND NOTHING IS SIGNED OUT HERE, which is the whole difference between
      // a keep-alive and a session manager. A 502 means B2C could not renew and the session is
      // untouched; a 409 means somebody else's renewal is in flight and the cookie it wrote is
      // already in this browser. Both are answered by looking at the session again below, and both
      // would be catastrophic to treat as "signed out" — that is A2's rule, which exists so an
      // identity-provider blip does not sign everybody out at once.
      //
      // A 401 is the exception and it is already handled: the transport redirects to sign in and
      // rejects, so the page is leaving and the re-arm below simply never gets a session to
      // schedule from.
      console.warn('The receivables session could not be renewed; will try again.', renewError)
    }

    try {
      // Read back rather than assumed, and it is what makes the next delay correct in every case: a
      // renewal that worked moves the expiry an hour out and the next pass is scheduled from it, and
      // one that did not leaves it where it was, which the floor turns into a retry.
      await fetchSession()
    } catch (readError) {
      // `useSession.fetchSession` catches its own failures and answers false, so this cannot fire
      // today. It is here because that guarantee belongs to another package, shared with payables:
      // if it ever stops holding, an unhandled rejection here would skip the re-arm below and the
      // keep-alive would be silently dead for the rest of the page's life — which is the exact
      // failure this composable exists to prevent, arriving through the one line that was not
      // guarded. Raised in review of this pull request.
      console.warn('The receivables session could not be re-read after a renewal.', readError)
    } finally {
      // BOTH AFTER THE RE-READ, and neither was. Releasing the guard when the renewal returned left
      // it open across `fetchSession`, so a `visibilitychange` landing in that window started a
      // second renewal — the contended write this design answers with a 409, caused by the client
      // rather than met by it. And the re-arm has to be unconditional for the reason the catch
      // above exists.
      running = false
      schedule()
    }
  }

  /**
   * Catches up a timer that slept through its due time.
   *
   * Browsers throttle `setTimeout` in background tabs, and a laptop that suspends stops the clock
   * for the whole session. Either way the tab comes back with a timer that will fire late — after
   * an expiry it was scheduled to beat — so the visible tab checks the wall clock rather than
   * trusting its own timer.
   */
  function onVisible(): void {
    if (document.visibilityState !== 'visible' || stopped || dueAt === undefined) {
      return
    }

    if (Date.now() >= dueAt) {
      void renew()
    }
  }

  /**
   * Disarms the timer AND forgets when it was going to fire, because those are one fact and the
   * second one alone is dangerous.
   *
   * <b>`dueAt` used to be cleared only by `stop`</b>, which left it set on the path where the timer
   * is disarmed and not re-armed: the session disappearing (a sign-out, or a re-read that found
   * none) makes `schedule` return before arming anything, and the stale due time was by then in the
   * past. `onVisible` then found itself overdue on the next `visibilitychange` and renewed against
   * a session that no longer exists — a 401, and the transport sends that tab to sign in. So
   * focusing the tab after signing out bounced the user back into B2C, repeatedly, since the
   * re-arm that followed left the same stale value behind. Raised in review of this pull request.
   */
  function clear(): void {
    dueAt = undefined

    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  /**
   * Idempotent: calling it again re-schedules from the session's current expiry rather than adding
   * a second timer.
   *
   * <b>It watches the session rather than requiring one to exist first.</b> The application mounts
   * before anybody is signed in — the route guard fetches the session on the first guarded
   * navigation — so a `start` that only read what was there at mount would arm nothing and never
   * arm anything. The watcher also covers the far more common case: every successful renewal
   * rewrites the expiry, and re-arming from the new one is what makes this a keep-alive rather than
   * a single renewal.
   */
  function start(): void {
    if (stopped) {
      stopped = false
      document.addEventListener('visibilitychange', onVisible)
      unwatch = watch(() => session.value?.sessionExpiresAt, schedule)
    }

    schedule()
  }

  function stop(): void {
    stopped = true
    clear()
    document.removeEventListener('visibilitychange', onVisible)
    unwatch?.()
    unwatch = undefined
  }

  return { start, stop }
}
