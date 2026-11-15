import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const refreshSession = vi.fn()

vi.mock('@/api', () => ({
  refreshSession: (...args: unknown[]) => refreshSession(...args),
}))

/**
 * The real `useSession` holds module-level state and talks to `/api/session/info`. What these tests
 * need from it is two things this composable actually uses — the expiry it schedules from, and the
 * re-read that follows a renewal — so it is stubbed to exactly those.
 */
const session = ref<{ sessionExpiresAt: number } | null>(null)
const fetchSession = vi.fn()

vi.mock('@ada/auth', () => ({
  useSession: () => ({ session, fetchSession }),
}))

import { useSessionKeepAlive } from '@/composables/useSessionKeepAlive'

/** Unix SECONDS, which is what `sessionExpiresAt` carries. */
const inSeconds = (milliseconds: number): number => Math.floor(milliseconds / 1000)

const MINUTE = 60 * 1000

/**
 * UC-ENT-08's front-end half: the keep-alive that renews the receivables session before its access
 * token expires.
 *
 * <b>Timers are faked and the clock is driven</b>, because every property here is about WHEN
 * something happens. A test that waited for real delays would take an hour to assert the one thing
 * that matters, and a test that only asserted "it called refresh" would pass against a keep-alive
 * that fires immediately and forever.
 */
describe('useSessionKeepAlive', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T12:00:00Z'))
    refreshSession.mockReset()
    refreshSession.mockResolvedValue(undefined)
    fetchSession.mockReset()
    fetchSession.mockResolvedValue(true)
    session.value = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** A session expiring `minutes` from the current fake time. */
  function signedIn(minutes: number): void {
    session.value = { sessionExpiresAt: inSeconds(Date.now() + minutes * MINUTE) }
  }

  it('renews BEFORE the token expires rather than when it has', async () => {
    signedIn(60)
    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    // One second short of the two-minute margin: nothing yet.
    await vi.advanceTimersByTimeAsync(58 * MINUTE - 1000)
    expect(refreshSession).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(refreshSession).toHaveBeenCalledTimes(1)

    keepAlive.stop()
  })

  it('arms itself when the session arrives, since nobody is signed in when the app mounts', async () => {
    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    // The route guard fetches the session on the first guarded navigation, which is after this.
    // A keep-alive that only read what was there at mount would arm nothing, forever.
    signedIn(10)
    await vi.advanceTimersByTimeAsync(8 * MINUTE)

    expect(refreshSession).toHaveBeenCalledTimes(1)

    keepAlive.stop()
  })

  it('re-arms from the NEW expiry, so one renewal is not the only one', async () => {
    signedIn(60)

    // What the server does on a successful renewal: the next read reports an hour further out.
    fetchSession.mockImplementation(async () => {
      signedIn(60)
      return true
    })

    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    await vi.advanceTimersByTimeAsync(58 * MINUTE)
    expect(refreshSession).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(58 * MINUTE)
    expect(refreshSession).toHaveBeenCalledTimes(2)

    keepAlive.stop()
  })

  it('retries a failed renewal instead of signing the analyst out', async () => {
    signedIn(60)

    // 502: B2C could not renew, or is refusing inside its grace window. The session is untouched
    // and still valid until its own expiry, so the expiry does NOT move — which is exactly the
    // shape that would spin without a floor under the delay.
    refreshSession.mockRejectedValue({ status: 502 })

    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    await vi.advanceTimersByTimeAsync(58 * MINUTE)
    expect(refreshSession).toHaveBeenCalledTimes(1)

    // Not immediately, and not never: the floor turns "due in the past" into a thirty-second
    // backoff without a retry counter to get wrong.
    await vi.advanceTimersByTimeAsync(29 * 1000)
    expect(refreshSession).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(refreshSession).toHaveBeenCalledTimes(2)

    keepAlive.stop()
  })

  it('does not hammer the endpoint when the expiry is already in the past', async () => {
    // A laptop that slept through the whole token life. The due time is an hour behind, and without
    // a floor every rejected attempt would schedule the next one for right now.
    signedIn(-60)
    refreshSession.mockRejectedValue({ status: 502 })

    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    await vi.advanceTimersByTimeAsync(5 * MINUTE)

    // Ten thirty-second slots in five minutes, and emphatically not thousands.
    expect(refreshSession).toHaveBeenCalledTimes(10)

    keepAlive.stop()
  })

  it('does not renew once per tab focus while the renewal keeps failing', async () => {
    signedIn(60)
    refreshSession.mockRejectedValue({ status: 502 })

    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    await vi.advanceTimersByTimeAsync(58 * MINUTE)
    expect(refreshSession).toHaveBeenCalledTimes(1)

    // The failed attempt left the expiry where it was, so the next one is DUE in the past and only
    // the floor is holding it back. A catch-up that compared against the due time rather than
    // against when the timer will fire would renew on every one of these — alt-tabbing during a
    // B2C outage, one request per focus, straight past the only rate limit here.
    for (let focus = 0; focus < 5; focus++) {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    }

    expect(refreshSession).toHaveBeenCalledTimes(1)

    // And the floor still expires normally afterwards.
    await vi.advanceTimersByTimeAsync(30 * 1000)
    expect(refreshSession).toHaveBeenCalledTimes(2)

    keepAlive.stop()
  })

  it('keeps going when the session re-read fails, rather than dying silently', async () => {
    signedIn(60)

    // `useSession.fetchSession` answers false rather than rejecting today; that guarantee lives in
    // another package, and the keep-alive has to survive losing it.
    fetchSession.mockRejectedValue(new Error('the session endpoint is unreachable'))

    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    await vi.advanceTimersByTimeAsync(58 * MINUTE)
    expect(refreshSession).toHaveBeenCalledTimes(1)

    // Re-armed anyway. Without the guard the rejection escapes `renew`, `schedule` never runs, and
    // the analyst is signed out an hour later by a keep-alive that stopped without saying so.
    await vi.advanceTimersByTimeAsync(30 * 1000)
    expect(refreshSession).toHaveBeenCalledTimes(2)

    keepAlive.stop()
  })

  it('does not renew against a session that is gone when the tab is focused', async () => {
    signedIn(60)
    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    // Signed out, or a re-read that found nothing. The timer is disarmed and never re-armed, and
    // the catch-up path must go with it: a renewal here answers 401 and the transport sends the tab
    // to B2C, so focusing a tab after signing out would bounce the user back into a sign-in they
    // did not ask for — and again on every focus after that.
    session.value = null
    await vi.advanceTimersByTimeAsync(0)

    vi.setSystemTime(new Date(Date.now() + 2 * 60 * MINUTE))

    for (let focus = 0; focus < 3; focus++) {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    }

    expect(refreshSession).not.toHaveBeenCalled()

    keepAlive.stop()
  })

  it('stops when the application does, leaving no timer behind', async () => {
    signedIn(60)
    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    keepAlive.stop()
    await vi.advanceTimersByTimeAsync(2 * 60 * MINUTE)

    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('catches up a tab that was throttled past its due time', async () => {
    signedIn(60)
    const keepAlive = useSessionKeepAlive()
    keepAlive.start()

    // A background tab's timer can fire late, and a suspended machine stops the clock entirely. The
    // system time moves without the timer running, which is what a wake-up looks like from here.
    vi.setSystemTime(new Date(Date.now() + 59 * MINUTE))
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)

    expect(refreshSession).toHaveBeenCalledTimes(1)

    keepAlive.stop()
  })
})
