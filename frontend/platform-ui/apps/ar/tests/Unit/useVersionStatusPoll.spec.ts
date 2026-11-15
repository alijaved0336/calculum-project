import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchVersionStatus = vi.fn()

vi.mock('@/api', () => ({
  fetchVersionStatus: (...args: unknown[]) => fetchVersionStatus(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import { HttpError, SessionExpiredError } from '@/api/http'
import { POLL_INTERVAL_MS, useVersionStatusPoll } from '@/composables/useVersionStatusPoll'
import type { CalculationStatus } from '@/api'
import { statusOf } from './fixtures/calculationStatus'

/** jsdom starts every test 'visible'; a test that hides the tab restores this in its own steps. */
function setVisibility(value: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
}

/**
 * UC-FE-05a's polling half, driven from mock timing - which is also the use case's own
 * instruction, since live progress jumps 0-to-done while the 50 step bodies are stubs. Every
 * property here is about WHEN a fetch happens: while the pipeline moves, and emphatically not
 * once it has stopped.
 */
describe('useVersionStatusPoll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchVersionStatus.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('keeps polling at the interval while the status is one the pipeline moves through', async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('calculating'))
    const poll = useVersionStatusPoll()

    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)
    expect(fetchVersionStatus).toHaveBeenCalledWith(73)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(3)

    poll.stop()
  })

  it('stops once the version reaches a resting place, rather than hammering an answer only a user action changes', async () => {
    fetchVersionStatus
      .mockResolvedValueOnce(statusOf('calculating'))
      .mockResolvedValueOnce(statusOf('ready'))
    const poll = useVersionStatusPoll()

    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(2)
    expect(poll.status.value?.status).toBe('ready')

    await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(2)

    poll.stop()
  })

  it('reports a 404 as not-found and does not keep asking', async () => {
    fetchVersionStatus.mockRejectedValue(new HttpError(404, '/status', ''))
    const poll = useVersionStatusPoll()

    poll.start(999)
    await vi.advanceTimersByTimeAsync(0)

    expect(poll.notFound.value).toBe(true)
    expect(poll.loading.value).toBe(false)

    await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)

    poll.stop()
  })

  it('stops on a failure and shows it, rather than retrying blind behind a frozen bar', async () => {
    fetchVersionStatus.mockRejectedValue(new HttpError(500, '/status', ''))
    const poll = useVersionStatusPoll()

    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)

    expect(poll.loadError.value).toBe(true)
    await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)

    // The retry affordance: a fresh start() clears the failure and fetches again.
    fetchVersionStatus.mockResolvedValue(statusOf('ready'))
    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)
    expect(poll.loadError.value).toBe(false)
    expect(poll.status.value?.status).toBe('ready')

    poll.stop()
  })

  it('re-enters the chain through refresh once a recalculation puts the version back in motion', async () => {
    fetchVersionStatus.mockResolvedValueOnce(statusOf('errorCalculating', { isError: true }))
    const poll = useVersionStatusPoll()

    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)

    fetchVersionStatus
      .mockResolvedValueOnce(statusOf('reCalculating'))
      .mockResolvedValueOnce(statusOf('ready'))
    poll.refresh(73)
    await vi.advanceTimersByTimeAsync(0)
    expect(poll.status.value?.status).toBe('reCalculating')

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(poll.status.value?.status).toBe('ready')
    expect(fetchVersionStatus).toHaveBeenCalledTimes(3)

    poll.stop()
  })

  it('holds the loading state through a sign-in redirect instead of rendering a blank screen', async () => {
    // SessionExpiredError means the page is navigating away. Every state flag must stay as it
    // was: loading=false with nothing else set renders every template branch false - a blank
    // content area for the duration of the redirect.
    fetchVersionStatus.mockRejectedValue(new SessionExpiredError('/status'))
    const poll = useVersionStatusPoll()

    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)

    expect(poll.loading.value).toBe(true)
    expect(poll.notFound.value).toBe(false)
    expect(poll.loadError.value).toBe(false)

    poll.stop()
  })

  it('stops asking while the tab is hidden, and resumes with one immediate fetch when it is looked at again', async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('calculating'))
    const poll = useVersionStatusPoll()

    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)

    // The tab goes to the background. The already-armed timer fires once more; that response
    // sees the hidden tab and parks the chain instead of re-arming.
    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(2)

    // Looking again fetches immediately and the chain continues on the clock.
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(4)

    poll.stop()
  })

  it('leaves no timer behind after stop()', async () => {
    fetchVersionStatus.mockResolvedValue(statusOf('calculating'))
    const poll = useVersionStatusPoll()

    poll.start(73)
    await vi.advanceTimersByTimeAsync(0)
    poll.stop()

    await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(1)
  })

  it('never lets a stale response write over the version the screen moved to', async () => {
    let resolveFirst: (value: CalculationStatus) => void = () => {}
    fetchVersionStatus
      .mockImplementationOnce(() => new Promise<CalculationStatus>((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce(statusOf('ready', { saleFileVersionId: 74 }))
    const poll = useVersionStatusPoll()

    poll.start(73)
    poll.start(74)
    await vi.advanceTimersByTimeAsync(0)
    expect(poll.status.value?.saleFileVersionId).toBe(74)

    // The slower, older request lands last - an active status that would even re-arm the timer.
    resolveFirst(statusOf('calculating', { saleFileVersionId: 73 }))
    await vi.advanceTimersByTimeAsync(0)

    expect(poll.status.value?.saleFileVersionId).toBe(74)
    await vi.advanceTimersByTimeAsync(10 * POLL_INTERVAL_MS)
    expect(fetchVersionStatus).toHaveBeenCalledTimes(2)

    poll.stop()
  })
})
