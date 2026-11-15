import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const startGridExport = vi.fn()
const getGridExportStatus = vi.fn()
const cancelGridExport = vi.fn()
const downloadGridExport = vi.fn()

vi.mock('@/api/gridExport', () => ({
  startGridExport: (...args: unknown[]) => startGridExport(...args),
  getGridExportStatus: (...args: unknown[]) => getGridExportStatus(...args),
  cancelGridExport: (...args: unknown[]) => cancelGridExport(...args),
  downloadGridExport: (...args: unknown[]) => downloadGridExport(...args),
}))
vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import { HttpError } from '@/api/http'
import type { GridExportRequest } from '@/api/gridExport'
import { translate } from '@/utils/translation'
import {
  LARGE_EXPORT_THRESHOLD,
  MAX_POLL_FAILURES,
  POLL_INTERVAL_MS,
  useArGridExport,
} from '@/composables/useArGridExport'

const REQUEST: GridExportRequest = {
  versionUuid: '1653c234-9318-4707-a6c3-33f4b427126c',
  where: null,
  order: null,
  customFilters: null,
  customSorts: null,
  currencyRate: 1,
  columns: [{ field: 'name', title: 'Name', hidden: false }],
  fileName: 'sale-lines',
}

const t = (key: string) => translate.t(key) as string
const blob = () => new Blob(['x'])

describe('useArGridExport', () => {
  let saved: Array<{ download: string; href: string }>

  beforeEach(() => {
    vi.useFakeTimers()
    startGridExport.mockReset()
    getGridExportStatus.mockReset()
    cancelGridExport.mockReset().mockResolvedValue(true)
    downloadGridExport.mockReset()

    saved = []
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ download: this.download, href: this.href })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('asks for confirmation above the threshold and starts nothing until it is given', async () => {
    startGridExport.mockResolvedValue({ kind: 'file', file: { blob: blob(), fileName: 'a.xlsx' } })
    const exporter = useArGridExport()

    await exporter.startExport('OpportunitySaleLines', REQUEST, LARGE_EXPORT_THRESHOLD + 1)

    expect(exporter.showLargeExportConfirm.value).toBe(true)
    expect(exporter.pendingExportCount.value).toBe(LARGE_EXPORT_THRESHOLD + 1)
    expect(startGridExport).not.toHaveBeenCalled()

    await exporter.confirmLargeExport()

    expect(exporter.showLargeExportConfirm.value).toBe(false)
    expect(startGridExport).toHaveBeenCalledWith('OpportunitySaleLines', REQUEST)
  })

  it('does not start when the large-export prompt is declined', async () => {
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, LARGE_EXPORT_THRESHOLD + 1)
    exporter.cancelLargeExport()

    expect(exporter.showLargeExportConfirm.value).toBe(false)
    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('does not ask at the threshold itself', async () => {
    startGridExport.mockResolvedValue({ kind: 'file', file: { blob: blob(), fileName: null } })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, LARGE_EXPORT_THRESHOLD)

    expect(exporter.showLargeExportConfirm.value).toBe(false)
    expect(startGridExport).toHaveBeenCalledTimes(1)
  })

  it('downloads the blob at once on a 200, under the server-chosen name', async () => {
    startGridExport.mockResolvedValue({ kind: 'file', file: { blob: blob(), fileName: 'big.csv' } })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)

    expect(saved).toEqual([{ download: 'big.csv', href: 'blob:fake' }])
    expect(exporter.task.value.status).toBe('completed')
    expect(getGridExportStatus).not.toHaveBeenCalled()
  })

  it('falls back to the request file name when the server sent none', async () => {
    startGridExport.mockResolvedValue({ kind: 'file', file: { blob: blob(), fileName: null } })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)

    expect(saved[0].download).toBe('sale-lines.xlsx')
  })

  it('polls a 202 job every interval and downloads through the token once ready', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus
      .mockResolvedValueOnce({ status: 'queued' })
      .mockResolvedValueOnce({ status: 'running' })
      .mockResolvedValue({ status: 'ready', downloadToken: 'tok' })
    downloadGridExport.mockResolvedValue({ blob: blob(), fileName: 'done.xlsx' })
    const exporter = useArGridExport()

    await exporter.startExport('NineBoxRows', REQUEST, 10)
    expect(getGridExportStatus).not.toHaveBeenCalled()
    expect(exporter.task.value.status).toBe('running')

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(getGridExportStatus).toHaveBeenCalledTimes(1)
    expect(getGridExportStatus).toHaveBeenCalledWith('job-1')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(getGridExportStatus).toHaveBeenCalledTimes(2)
    expect(downloadGridExport).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(downloadGridExport).toHaveBeenCalledWith('tok')
    expect(saved[0].download).toBe('done.xlsx')
    expect(exporter.task.value.status).toBe('completed')

    // polling stopped: the one-time token is never claimed twice
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(getGridExportStatus).toHaveBeenCalledTimes(3)
    expect(downloadGridExport).toHaveBeenCalledTimes(1)
  })

  it('tolerates failed polls and recovers when one succeeds', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    for (let i = 0; i < MAX_POLL_FAILURES - 1; i++) {
      getGridExportStatus.mockRejectedValueOnce(new Error('net'))
    }
    getGridExportStatus.mockResolvedValueOnce({ status: 'running' })
    for (let i = 0; i < MAX_POLL_FAILURES - 1; i++) {
      getGridExportStatus.mockRejectedValueOnce(new Error('net'))
    }
    getGridExportStatus.mockResolvedValue({ status: 'running' })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * (MAX_POLL_FAILURES * 2))

    expect(exporter.task.value.status).toBe('running')
  })

  it('gives up after 5 consecutive failed polls', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockRejectedValue(new Error('net'))
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * MAX_POLL_FAILURES)

    expect(getGridExportStatus).toHaveBeenCalledTimes(MAX_POLL_FAILURES)
    expect(exporter.task.value.status).toBe('failed')
    expect(exporter.task.value.message).toBe(t('home.analyze.list.tableExportFailed'))

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(getGridExportStatus).toHaveBeenCalledTimes(MAX_POLL_FAILURES)
  })

  it('fails when the job reports failed', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockResolvedValue({ status: 'failed', error: 'boom' })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

    expect(exporter.task.value.status).toBe('failed')
  })

  it('reports an expired download (410) as such', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockResolvedValue({ status: 'ready', downloadToken: 'tok' })
    downloadGridExport.mockRejectedValue(new HttpError(410, 'p', ''))
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

    expect(exporter.task.value.status).toBe('failed')
    expect(exporter.task.value.message).toBe(t('home.analyze.list.tableExportExpired'))
  })

  it('says an export is already in progress on a 409', async () => {
    startGridExport.mockRejectedValue(new HttpError(409, 'p', '{"error":"x"}'))
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)

    expect(exporter.task.value.status).toBe('failed')
    expect(exporter.task.value.message).toBe(t('home.analyze.list.tableExportInProgress'))
  })

  it('says the user may not export on a 403', async () => {
    startGridExport.mockRejectedValue(new HttpError(403, 'p', ''))
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)

    expect(exporter.task.value.status).toBe('failed')
    expect(exporter.task.value.message).toBe("You don't have permission to export this list.")
  })

  it('revokes the blob URL only after the click has returned', async () => {
    startGridExport.mockResolvedValue({ kind: 'file', file: { blob: blob(), fileName: 'a.xlsx' } })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)

    expect(saved).toHaveLength(1)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.runOnlyPendingTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })

  it('shows the server refusal text on a 400', async () => {
    startGridExport.mockRejectedValue(new HttpError(400, 'p', '{"error":"unknown column"}'))
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)

    expect(exporter.task.value.message).toBe('unknown column')
  })

  it('cancel stops polling and calls the cancel endpoint with the job id', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockResolvedValue({ status: 'running' })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    exporter.cancelExport()

    expect(cancelGridExport).toHaveBeenCalledWith('job-1')
    expect(exporter.task.value.status).toBe('cancelled')

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(getGridExportStatus).toHaveBeenCalledTimes(1)
  })

  it('ignores a second start while an export is running', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockResolvedValue({ status: 'running' })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await exporter.startExport('Match', REQUEST, 5)

    expect(startGridExport).toHaveBeenCalledTimes(1)
  })

  it('stops polling and cancels the job when the owning scope is disposed', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockResolvedValue({ status: 'running' })
    const scope = effectScope()
    const exporter = scope.run(() => useArGridExport())!

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    scope.stop()

    expect(cancelGridExport).toHaveBeenCalledWith('job-1')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(getGridExportStatus).toHaveBeenCalledTimes(1)
  })

  it('cancels the job server-side when cancelled before the 202 arrives', async () => {
    let resolveStart!: (value: unknown) => void
    startGridExport.mockReturnValue(new Promise((resolve) => (resolveStart = resolve)))
    const exporter = useArGridExport()

    const started = exporter.startExport('Match', REQUEST, 5)
    exporter.cancelExport()
    expect(cancelGridExport).not.toHaveBeenCalled()
    resolveStart({ kind: 'job', jobId: 'late-job' })
    await started

    expect(cancelGridExport).toHaveBeenCalledWith('late-job')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2)
    expect(getGridExportStatus).not.toHaveBeenCalled()
    expect(exporter.task.value.status).toBe('cancelled')
  })

  it('fails at once on a 404 status instead of retrying', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockRejectedValue(new HttpError(404, 'p', ''))
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)

    expect(getGridExportStatus).toHaveBeenCalledTimes(1)
    expect(exporter.task.value.status).toBe('failed')
  })

  it('shows the server error text when the job fails', async () => {
    startGridExport.mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    getGridExportStatus.mockResolvedValue({ status: 'failed', error: 'too many columns' })
    const exporter = useArGridExport()

    await exporter.startExport('Match', REQUEST, 5)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

    expect(exporter.task.value.message).toBe('too many columns')
  })
})
