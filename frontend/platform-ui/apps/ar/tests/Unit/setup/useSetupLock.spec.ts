import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, type Ref } from 'vue'

const fetchSetupStatus = vi.fn()
vi.mock('@/modules/setup/api', () => ({
  setupApi: { fetchSetupStatus: (...args: unknown[]) => fetchSetupStatus(...args) },
}))

import { POLL_INTERVAL_MS } from '@/composables/useVersionStatusPoll'
import { MAX_UNREAD_RETRIES, createSetupLock } from '@/modules/setup/composables/useSetupLock'

const status = (locked: boolean, extra: Record<string, unknown> = {}) =>
  ({ saleFileVersionId: 73, status: locked ? 'reCalculating' : 'ready', locked, isError: false, currentStep: 2, totalSteps: 10, ...extra })

/** AB#20702 (impl plan L): one lock for every Setup section, driven by GET …/setup/status. */
describe('useSetupLock', () => {
  let lock: ReturnType<typeof createSetupLock>
  let versionId: Ref<number | null>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchSetupStatus.mockReset()
    versionId = ref(73)
    lock = createSetupLock(versionId)
  })

  afterEach(() => {
    lock.stop()
    vi.useRealTimers()
  })

  it("follows the API's own `locked` flag and its progress", async () => {
    fetchSetupStatus.mockResolvedValueOnce(status(true))
    await lock.refresh()
    expect(lock.locked.value).toBe(true)
    expect(lock.progress.value).toEqual({ currentStep: 2, totalSteps: 10 })
  })

  it('polls while locked, stops once ready, and tells the sections it unlocked', async () => {
    const unlocked = vi.fn()
    lock.onUnlocked(unlocked)
    fetchSetupStatus.mockResolvedValueOnce(status(true)).mockResolvedValueOnce(status(true)).mockResolvedValueOnce(status(false))
    await lock.refresh()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchSetupStatus).toHaveBeenCalledTimes(3)
    expect(lock.locked.value).toBe(false)
    expect(unlocked).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(fetchSetupStatus).toHaveBeenCalledTimes(3)
  })

  it('locks at once after a save, before the first status arrives', () => {
    lock.startAfterSave()
    expect(lock.locked.value).toBe(true)
  })

  it('reports a failed recalculation (EF-6)', async () => {
    fetchSetupStatus.mockResolvedValueOnce(status(false, { status: 'errorReCalculating', isError: true }))
    await lock.refresh()
    expect(lock.failed.value).toBe(true)
    expect(lock.locked.value).toBe(false)
  })

  it('parks the poll while the browser tab is hidden and resumes when it is shown', async () => {
    fetchSetupStatus.mockResolvedValue(status(true))
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await lock.refresh()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(fetchSetupStatus).toHaveBeenCalledTimes(1)

    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchSetupStatus).toHaveBeenCalledTimes(2)
    visibility.mockRestore()
  })

  it('keeps polling after a failed status request, so a blip cannot leave Setup locked', async () => {
    const unlocked = vi.fn()
    lock.onUnlocked(unlocked)
    fetchSetupStatus.mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(status(false))
    lock.startAfterSave()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(lock.locked.value).toBe(true)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchSetupStatus).toHaveBeenCalledTimes(2)
    expect(lock.locked.value).toBe(false)
    expect(unlocked).toHaveBeenCalledOnce()
  })

  it('reads the status of the new version when the sale file version changes', async () => {
    fetchSetupStatus.mockResolvedValueOnce(status(false)).mockResolvedValueOnce(status(true, { saleFileVersionId: 74 }))
    await lock.refresh()
    expect(lock.locked.value).toBe(false)
    versionId.value = 74
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchSetupStatus).toHaveBeenLastCalledWith(74)
    expect(lock.locked.value).toBe(true)
  })

  it("keeps polling the new version when its first status read fails, ignoring the old version's late answer", async () => {
    let answerOld!: (value: unknown) => void
    fetchSetupStatus
      .mockReturnValueOnce(new Promise((resolve) => { answerOld = resolve }))
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce(status(true, { saleFileVersionId: 74 }))
    const oldRead = lock.refresh()
    versionId.value = 74
    await nextTick()
    await vi.advanceTimersByTimeAsync(0)
    answerOld(status(false))
    await oldRead
    expect(lock.locked.value).toBe(false)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchSetupStatus).toHaveBeenLastCalledWith(74)
    expect(lock.locked.value).toBe(true)
  })

  it('stops retrying a status it never managed to read (a 403 or an outage) after a bounded number of reads', async () => {
    fetchSetupStatus.mockRejectedValue(new Error('403'))
    await lock.refresh()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * (MAX_UNREAD_RETRIES + 5))
    expect(fetchSetupStatus).toHaveBeenCalledTimes(MAX_UNREAD_RETRIES)
    expect(lock.locked.value).toBe(false)
  })

  it('keeps the lock claimed by a save when a status read issued before the save answers "ready"', async () => {
    let answerEarly!: (value: unknown) => void
    fetchSetupStatus
      .mockReturnValueOnce(new Promise((resolve) => { answerEarly = resolve }))
      .mockResolvedValueOnce(status(true))
    const earlyRead = lock.refresh()
    lock.startAfterSave()
    answerEarly(status(false))
    await earlyRead
    expect(lock.locked.value).toBe(true)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetchSetupStatus).toHaveBeenCalledTimes(2)
    expect(lock.locked.value).toBe(true)
  })
})
