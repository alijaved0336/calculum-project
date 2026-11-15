import { reactive, toRefs } from "vue";
import { useGridExportTask } from "./useGridExportTask";

/**
 * Describes a single Excel export request for one of the Opportunity > List
 * grids. The component resolves columns / filters / currency; the composable
 * owns the (non-blocking) background-task UX around it.
 */
export interface GridExportRequest {
  level: string;
  title: string;
  columns: Array<any>;
  filtersGrid: any;
  /** Backend export context. Defaults to "program". */
  section?: string;
}

export interface UseGridExportOptions {
  /** Translation function (translate.t). */
  t: (key: string, params?: Record<string, any>) => string;
  /** Called when the export request / generation fails. */
  onError?: (error: unknown) => void;
  /**
   * Datasets larger than this prompt a lightweight confirmation first. Kept even
   * though the export is now non-blocking, so users don't accidentally queue huge jobs.
   */
  largeExportThreshold?: number;
  /**
   * @deprecated WI#17234 moved export generation server-side. These client-side hooks
   * (`exportData` JSON fetch, Kendo `saveExcel`, `generateFile`, `deferMs`) are no longer
   * used; they remain optional only for call-site compatibility and will be removed.
   */
  exportData?: (params: any) => void;
  saveExcel?: (opts: any) => void;
  generateFile?: (opts: { data: any; fileName: string; columns: Array<any> }) => Promise<void>;
  deferMs?: number;
  /** Injectable task runner (tests). Defaults to the real server-side background task. */
  runTask?: (request: GridExportRequest, total: number) => void;
}

/**
 * Excel export UX for the List grids (WI#17234). The file is generated **server-side** and
 * delivered as a binary download via a non-blocking background task (see {@link useGridExportTask}),
 * replacing the former blocking overlay + client-side Kendo `saveExcel` build (WI#17080 / PR #12726).
 *
 * The public surface (state refs + start/confirm/cancel/reset) is unchanged so the grid views
 * need no modifications. `loadExport` / `exportLoadingMessage` are retained for template
 * compatibility but stay inert — the export no longer blocks the UI.
 */
export function useGridExport(options: UseGridExportOptions) {
  const { t, onError, largeExportThreshold = 10000 } = options;
  const runTask = options.runTask ?? useGridExportTask({ t, onError }).start;

  const state = reactive({
    loadExport: false,
    exportLoadingMessage: "",
    showLargeExportConfirm: false,
    pendingExportCount: 0,
  });

  let pendingRequest: GridExportRequest | null = null;
  let pendingTotal = 0;

  /** Entry point. Confirms first for large datasets, otherwise launches the background task. */
  function startExport(request: GridExportRequest, total: number) {
    // Ignore re-entrant calls while a confirmation dialog is still open.
    if (state.showLargeExportConfirm) return;
    if (total > largeExportThreshold) {
      pendingRequest = request;
      pendingTotal = total;
      state.pendingExportCount = total;
      state.showLargeExportConfirm = true;
      return;
    }
    runTask(request, total);
  }

  function confirmLargeExport() {
    state.showLargeExportConfirm = false;
    const request = pendingRequest;
    const total = pendingTotal;
    pendingRequest = null;
    pendingTotal = 0;
    state.pendingExportCount = 0;
    if (request) runTask(request, total);
  }

  function cancelLargeExport() {
    state.showLargeExportConfirm = false;
    pendingRequest = null;
    pendingTotal = 0;
    state.pendingExportCount = 0;
  }

  /** Retained for template/back-compat; the background task is non-blocking so there is no overlay to clear. */
  function resetExport() {
    state.loadExport = false;
    state.exportLoadingMessage = "";
  }

  return {
    ...toRefs(state),
    startExport,
    confirmLargeExport,
    cancelLargeExport,
    resetExport,
  };
}
