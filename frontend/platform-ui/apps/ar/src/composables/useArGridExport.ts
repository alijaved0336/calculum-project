import { getCurrentScope, onScopeDispose, reactive, toRefs } from 'vue'
import {
  cancelGridExport,
  downloadGridExport,
  getGridExportStatus,
  startGridExport,
  type GridExportFile,
  type GridExportKind,
  type GridExportRequest,
} from '@/api/gridExport'
import { HttpError, SessionExpiredError } from '@/api/http'
import { translate } from '@/utils/translation'

/** How often the job's status is polled. */
export const POLL_INTERVAL_MS = 1500
/** The task fails after this many status polls in a row fail. */
export const MAX_POLL_FAILURES = 5
/** Above this many rows the user is asked to confirm before the export starts. */
export const LARGE_EXPORT_THRESHOLD = 10000

export type GridExportTaskStatus = 'idle' | 'running' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'notice'

/** Saves a blob through a temporary same-origin `blob:` link. */
function saveFile(file: GridExportFile, fallbackName: string): void {
  const href = URL.createObjectURL(file.blob)
  const link = document.createElement('a')
  link.href = href
  link.download = file.fileName || fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Deferred: some browsers start reading the blob only after click() returns, and revoking the
  // URL synchronously can abort that download.
  setTimeout(() => URL.revokeObjectURL(href), 0)
}

/** Session loss, or a job that is not this user's or no longer exists: retrying cannot change that. */
function isTerminalPollError(error: unknown): boolean {
  return error instanceof SessionExpiredError || (error instanceof HttpError && error.status === 404)
}

/**
 * Excel export for the AR grids, ported from AP's `useGridExport` + `useGridExportTask` without
 * the Firestore branch: AR only polls. AR has no background-process panel and no toast host, so
 * progress is exposed as reactive state (`task`) for the calling view to render, next to the large
 * export confirmation (`showLargeExportConfirm` / `pendingExportCount`).
 *
 * Flow: `startExport` confirms first above `LARGE_EXPORT_THRESHOLD` rows. The server then answers
 * 200 with the file (downloaded at once) or 202 with a job, polled every `POLL_INTERVAL_MS` until
 * `ready` (one-time download through the authenticated client), `failed`, or `cancelled`.
 */
export function useArGridExport() {
  const t = (key: string): string => translate.t(key) as string

  const state = reactive({
    showLargeExportConfirm: false,
    pendingExportCount: 0,
    task: { status: 'idle' as GridExportTaskStatus, message: '' },
  })

  let pending: { kind: GridExportKind; request: GridExportRequest } | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let jobId: string | null = null
  /** Bumped by every run and by cancel, so a stale async continuation can tell it is stale. */
  let runId = 0

  function isActive(): boolean {
    return state.task.status === 'running' || state.task.status === 'downloading'
  }

  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function setTask(status: GridExportTaskStatus, key = ''): void {
    state.task.status = status
    state.task.message = key ? t(key) : ''
  }

  function fail(message: string): void {
    stopPolling()
    state.task.status = 'failed'
    state.task.message = message
  }

  /** The server's refusal text when it sent one (400), else a message for the status (403, 409, 410). */
  function failureMessage(error: unknown): string {
    if (error instanceof HttpError) {
      if (error.status === 409) {
        return t('home.analyze.list.tableExportInProgress')
      }
      if (error.status === 403) {
        // The server's per-company export permission (derived from the session roles) refused it.
        return t('arGridExport.forbidden')
      }
      if (error.status === 410) {
        return t('home.analyze.list.tableExportExpired')
      }
      if (error.status === 400) {
        const refusal = error.jsonBody<{ error?: string }>()?.error
        if (refusal) {
          return refusal
        }
      }
    }
    return t('home.analyze.list.tableExportFailed')
  }

  /** Session loss navigates the page away; that is not a failure to report. */
  function handleError(error: unknown, thisRun: number): void {
    if (thisRun !== runId) {
      return
    }
    if (error instanceof SessionExpiredError) {
      stopPolling()
      setTask('idle')
      return
    }
    fail(failureMessage(error))
  }

  async function download(thisRun: number, fetchFile: () => Promise<GridExportFile>, fallbackName: string): Promise<void> {
    setTask('downloading', 'home.analyze.list.tableExportDownloading')
    try {
      const file = await fetchFile()
      if (thisRun !== runId) {
        return
      }
      saveFile(file, fallbackName)
      setTask('completed')
    } catch (error) {
      handleError(error, thisRun)
    }
  }

  function track(thisRun: number, id: string, fallbackName: string): void {
    let failures = 0
    let polling = false // a tick is skipped while the previous request is still in flight

    pollTimer = setInterval(async () => {
      if (polling || thisRun !== runId) {
        return
      }
      polling = true
      try {
        const status = await getGridExportStatus(id)
        if (thisRun !== runId) {
          return
        }
        failures = 0

        if (status.status === 'ready') {
          stopPolling() // before downloading, so a later tick cannot claim the token twice
          if (!status.downloadToken) {
            fail(t('home.analyze.list.tableExportExpired'))
            return
          }
          const token = status.downloadToken
          void download(thisRun, () => downloadGridExport(token), fallbackName)
        } else if (status.status === 'failed') {
          fail(status.error || t('home.analyze.list.tableExportFailed'))
        } else if (status.status === 'cancelled') {
          stopPolling()
          setTask('cancelled', 'home.analyze.list.tableExportCancelled')
        }
      } catch (error) {
        if (isTerminalPollError(error)) {
          handleError(error, thisRun)
          return
        }
        failures++
        if (failures >= MAX_POLL_FAILURES && thisRun === runId) {
          fail(t('home.analyze.list.tableExportFailed'))
        }
      } finally {
        polling = false
      }
    }, POLL_INTERVAL_MS)
  }

  async function run(kind: GridExportKind, request: GridExportRequest): Promise<void> {
    const thisRun = ++runId
    jobId = null
    stopPolling()
    setTask('running', 'home.analyze.list.tableExportGenerating')

    try {
      const result = await startGridExport(kind, request)
      if (thisRun !== runId) {
        // Cancelled (or the owner unmounted) before the 202 arrived: the server job now exists and
        // nothing else knows its id, so tell it to stop rather than leave it in flight (a later 409).
        if (result.kind === 'job') {
          cancelGridExport(result.jobId).catch(() => undefined)
        }
        return
      }

      const fallbackName = `${request.fileName || 'export'}.xlsx`
      if (result.kind === 'file') {
        setTask('downloading', 'home.analyze.list.tableExportDownloading')
        saveFile(result.file, fallbackName)
        setTask('completed')
        return
      }

      jobId = result.jobId
      track(thisRun, result.jobId, fallbackName)
    } catch (error) {
      handleError(error, thisRun)
    }
  }

  /**
   * Entry point. Above `LARGE_EXPORT_THRESHOLD` rows it only opens the confirmation
   * (`showLargeExportConfirm`); `confirmLargeExport` then runs it. Ignored while an export of this
   * grid is already running or a confirmation is open.
   *
   * @param kind Which grid, as the server names it.
   * @param request The grid's current filter, sort, columns and file name.
   * @param totalRows The grid's current row count, used only to decide whether to confirm.
   */
  async function startExport(kind: GridExportKind, request: GridExportRequest, totalRows: number): Promise<void> {
    if (state.showLargeExportConfirm || isActive()) {
      return
    }
    if (totalRows > LARGE_EXPORT_THRESHOLD) {
      pending = { kind, request }
      state.pendingExportCount = totalRows
      state.showLargeExportConfirm = true
      return
    }
    await run(kind, request)
  }

  function clearPending(): { kind: GridExportKind; request: GridExportRequest } | null {
    const taken = pending
    pending = null
    state.pendingExportCount = 0
    state.showLargeExportConfirm = false
    return taken
  }

  /** The user accepted the large-export prompt. */
  async function confirmLargeExport(): Promise<void> {
    const taken = clearPending()
    if (taken) {
      await run(taken.kind, taken.request)
    }
  }

  /** The user declined the large-export prompt. */
  function cancelLargeExport(): void {
    clearPending()
  }

  /**
   * Cancels the running export: stops polling at once and tells the server to abort the job
   * (best effort - before the 202 arrives there is no job to name yet, so the request is simply
   * abandoned and its answer ignored).
   */
  function cancelExport(): void {
    if (!isActive()) {
      return
    }
    const id = jobId
    runId++
    stopPolling()
    jobId = null
    setTask('cancelled', 'home.analyze.list.tableExportCancelled')
    if (id) {
      cancelGridExport(id).catch(() => undefined)
    }
  }

  // Leaving the page must not leave a poll timer running or a download firing on another page.
  if (getCurrentScope()) {
    onScopeDispose(cancelExport)
  }

  /**
   * Tells the user, in the status line, why an Export click did nothing (an informational message,
   * not a failure). Never replaces a running export's progress or an open confirmation.
   *
   * @param key The i18n key of the message.
   */
  function notice(key: string): void {
    if (isActive() || state.showLargeExportConfirm) {
      return
    }
    setTask('notice', key)
  }

  /** Clears a finished task (completed, failed, cancelled, notice) back to idle. */
  function dismiss(): void {
    if (!isActive()) {
      setTask('idle')
    }
  }

  /** Clears the status line only when it is an informational notice; a running, failed or completed export stays. */
  function clearNotice(): void {
    if (state.task.status === 'notice') {
      setTask('idle')
    }
  }

  return {
    ...toRefs(state),
    startExport,
    confirmLargeExport,
    cancelLargeExport,
    cancelExport,
    dismiss,
    notice,
    clearNotice,
  }
}
