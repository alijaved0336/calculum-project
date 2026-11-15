import { useBackgroundProcesses } from "@/composables/useBackgroundProcesses";
import useGridExportFirebase, { GridExportSnapshot } from "@/composables/firebase/useGridExportFirebase";
import {
  exportDataXlsx,
  getGridExportStatus,
  getGridExportFile,
  cancelGridExport,
} from "@/modules/home/api";
import type { GridExportRequest } from "./useGridExport";

/** How often the REST status endpoint is polled when the Firestore subscription is unavailable. */
const POLL_INTERVAL_MS = 1500;
/** Stop polling (and fail the task) after this many consecutive status-poll failures. */
const MAX_POLL_FAILURES = 5;

export interface UseGridExportTaskOptions {
  t: (key: string, params?: Record<string, any>) => string;
  onError?: (error: unknown) => void;
}

interface TaskHandles {
  cancelled: boolean;
  unsubscribe: (() => void) | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  /** Set once the async job id is known, so cancellation can tell the backend to abort the worker. */
  jobId: string | null;
}

// ─── Pure helpers (kept at module scope; no composable state) ───────────────

function triggerDownload(href: string, fileName: string, revoke = false): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revoke) URL.revokeObjectURL(href);
}

/** Download an in-memory blob (synchronous export path). */
function downloadBlob(blob: Blob, fileName: string): void {
  triggerDownload(URL.createObjectURL(blob), fileName, true);
}

/**
 * Download the async export via its one-time token. Fetches the file as a blob and saves it through a
 * same-origin `blob:` URL — reliable for any content type (a cross-origin anchor renders text/csv inline
 * instead of downloading). Uses the server-set filename when present so a CSV isn't saved as `.xlsx`.
 */
async function downloadByToken(token: string, fallbackName: string): Promise<void> {
  const { blob, fileName } = await getGridExportFile(token);
  downloadBlob(blob, fileName || fallbackName);
}

/** Best-effort Excel number-format hint from the grid column metadata. */
function inferType(c: any): string | undefined {
  const cell = typeof c.cell === "string" ? c.cell.toLowerCase() : "";
  if (cell.includes("money") || cell.includes("currency")) return "currency";
  if (cell.includes("percent")) return "percent";
  if (c.filter === "numeric") return "number";
  return undefined;
}

/**
 * Build JSON-serializable column descriptors (drops Kendo/Vue render references).
 *
 * Grouped grids (the Match list) nest their data columns inside group headers that carry only a label
 * and no `field`, so the tree is flattened depth-first to keep the on-screen order. A group header is
 * never a data column itself, and hiding it hides its whole group — otherwise every column would be
 * discarded here and the server-side export would come out empty (WI#18734).
 */
function serializeColumns(columns: Array<any>, parentHidden = false): Array<any> {
  return (columns || []).flatMap((c) => {
    if (!c) return [];

    const hidden = parentHidden || c.hidden === true;

    if (Array.isArray(c.children) && c.children.length > 0) {
      return serializeColumns(c.children, hidden);
    }

    if (!c.field) return [];

    return [
      {
        field: c.field,
        title: c.title ?? c.field,
        hidden,
        type: inferType(c),
        format: typeof c.format === "string" ? c.format : undefined,
      },
    ];
  });
}

function cleanup(handles: TaskHandles): void {
  // Mark settled first so any in-flight Firestore snapshot / poll tick that fires between
  // clearInterval and the engine removing the timer is ignored (terminal transitions are idempotent).
  handles.cancelled = true;
  if (handles.unsubscribe) {
    handles.unsubscribe();
    handles.unsubscribe = null;
  }
  if (handles.pollTimer) {
    clearInterval(handles.pollTimer);
    handles.pollTimer = null;
  }
}

/**
 * Server-side Excel export as a non-blocking background task (WI#17234), modeled on
 * `useMultiplePDFExport`. Registers a `TABLE_EXPORT` entry in the bottom-right
 * `BackgroundMultiProcess` panel and:
 *  - **sync (HTTP 200)**: downloads the streamed `.xlsx` blob and completes;
 *  - **async (HTTP 202 + jobId)**: tracks progress in real time via Firestore
 *    (`useGridExportFirebase`), downloading via the one-time token when ready; if the
 *    subscription can't start it falls back to polling the REST status endpoint.
 *
 * The grid dataset is never transferred to the browser as JSON.
 */
export function useGridExportTask(options: UseGridExportTaskOptions) {
  const { t, onError } = options;
  const { addProcess, updateProcess } = useBackgroundProcesses();
  const { subscribeToGridExport } = useGridExportFirebase();

  function fail(processId: string, error: unknown): void {
    if (onError) onError(error);
    updateProcess(processId, {
      status: "failed",
      error: t("home.analyze.list.tableExportFailed"),
    });
  }

  function applySnapshot(
    processId: string,
    total: number,
    fileName: string,
    handles: TaskHandles,
    data: GridExportSnapshot,
  ): void {
    if (handles.cancelled) return;

    const tot = data.progress?.total ?? total;
    const processed = data.progress?.processed ?? 0;

    try {
      if (data.status === "ready" && data.downloadToken) {
        // Stop the subscription/poll BEFORE downloading so a duplicate 'ready' snapshot
        // (e.g. Firestore reconnection re-delivery) can't trigger a second download.
        cleanup(handles);
        updateProcess(processId, {
          progress: { current: tot, total: tot, statusText: t("home.analyze.list.tableExportDownloading") },
        });
        // The download is an async blob fetch; complete the task on success, fail on error.
        downloadByToken(data.downloadToken, fileName)
          .then(() => updateProcess(processId, { status: "completed" }))
          .catch((e) => fail(processId, e));
      } else if (data.status === "failed") {
        fail(processId, new Error(data.error || "Grid export failed"));
        cleanup(handles);
      } else {
        updateProcess(processId, {
          progress: { current: processed, total: tot, statusText: t("home.analyze.list.tableExportGenerating") },
        });
      }
    } catch (e) {
      // A throw while handling a terminal snapshot must still stop the task (and the poll timer).
      fail(processId, e);
      cleanup(handles);
    }
  }

  async function trackAsync(processId: string, jobId: string, total: number, fileName: string, handles: TaskHandles): Promise<void> {
    // Guard before the await: the user may cancel while the initial POST is still resolving, and we
    // must not open a Firestore subscription for an already-cancelled job.
    if (handles.cancelled) return;

    const onChange = (data: GridExportSnapshot) => applySnapshot(processId, total, fileName, handles, data);
    // If the subscription errors mid-session, fail the task instead of hanging in 'running'.
    const onSubscriptionError = () => {
      if (handles.cancelled) return;
      fail(processId, new Error("Grid export realtime subscription failed"));
      cleanup(handles);
    };

    const unsubscribe = await subscribeToGridExport(jobId, onChange, onSubscriptionError);
    if (handles.cancelled) {
      if (unsubscribe) unsubscribe();
      return;
    }
    if (unsubscribe) {
      handles.unsubscribe = unsubscribe;
      return;
    }

    // Fallback: poll the REST status endpoint when Firestore isn't available. Tolerate transient
    // failures but give up (and fail the task) after MAX_POLL_FAILURES so it can't poll forever.
    let failures = 0;
    let polling = false; // skip a tick if the previous request is still in flight (no overlap)
    handles.pollTimer = setInterval(async () => {
      if (handles.cancelled || polling) return;
      polling = true;
      try {
        const res = await getGridExportStatus(jobId);
        if (res.success && res.data) {
          failures = 0;
          onChange({
            status: res.data.status,
            progress: { processed: res.data.processed, total: res.data.total },
            downloadToken: res.data.downloadToken,
            error: res.data.error,
          });
          return;
        }
        failures++;
      } catch {
        failures++;
      } finally {
        polling = false;
      }
      if (failures >= MAX_POLL_FAILURES) {
        fail(processId, new Error("Grid export status polling failed repeatedly"));
        cleanup(handles);
      }
    }, POLL_INTERVAL_MS);
  }

  // `useGridExport` calls this without awaiting; it must never produce an unhandled rejection, so the
  // whole body is wrapped — any unexpected throw fails the task instead of escaping.
  async function start(request: GridExportRequest, total: number): Promise<void> {
    const fileName = `${request.title || "export"}.xlsx`;
    const handles: TaskHandles = { cancelled: false, unsubscribe: null, pollTimer: null, jobId: null };
    let processId: string | null = null;

    try {
      processId = addProcess(
        t("home.analyze.list.tableExportTitle"),
        "TABLE_EXPORT",
        total || 0,
        true,
        () => {
          cleanup(handles);
          // Tell the backend to abort the worker (no file, no notification). Best-effort: if the job id
          // isn't known yet (sync path / pre-202) or the call fails, the panel still moves to cancelled.
          if (handles.jobId) {
            cancelGridExport(handles.jobId).catch(() => undefined);
          }
          // Move the panel entry to a terminal state (cancelProcess also sets this, but be explicit
          // so the task never lingers as 'running' regardless of how cancellation is triggered).
          if (processId) updateProcess(processId, { status: "cancelled" });
        },
      );
      updateProcess(processId, {
        progress: { statusText: t("home.analyze.list.tableExportGenerating") },
      });

      const result = await exportDataXlsx(
        request.level,
        request.section ?? "program",
        request.filtersGrid,
        serializeColumns(request.columns),
        request.title || "export",
        total || 0,
      );

      if (handles.cancelled) return;

      if (result.kind === "error") {
        fail(processId, result.error);
        return;
      }

      if (result.kind === "file" && result.blob) {
        updateProcess(processId, {
          progress: { current: total, total, statusText: t("home.analyze.list.tableExportDownloading") },
        });
        downloadBlob(result.blob, fileName);
        updateProcess(processId, { status: "completed" });
        return;
      }

      if (result.kind === "job" && result.jobId) {
        // Record the job id the moment it's known (before any await) so a cancel during/after the
        // Firestore subscription setup still reaches the backend worker. The only window where cancel
        // can't propagate is before the 202 response arrives — there is no job id to send yet.
        handles.jobId = result.jobId;
        await trackAsync(processId, result.jobId, total, fileName, handles);
        return;
      }

      fail(processId, new Error("Unexpected export response"));
    } catch (e) {
      if (processId) {
        fail(processId, e);
      } else if (onError) {
        onError(e);
      }
      cleanup(handles);
    }
  }

  return { start };
}
