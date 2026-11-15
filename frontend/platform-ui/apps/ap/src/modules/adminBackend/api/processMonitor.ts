import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response';
import { getBaseApi } from '@/utils/getBaseApi';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProcessClassification = 'queued' | 'running' | 'stalled';

export type ProcessRunMode =
  | 'FULL'
  | 'UPDATE'
  | 'QUICK_UPDATE'
  | 'RECALC'
  | 'RECALC_POTENTIAL'
  | 'BUYERS_ONLY';

/**
 * Complete backend status union for the monitor (the legacy
 * SpendFile.SpendFileVersionStatus type misses several backend statuses).
 */
export type MonitorVersionStatus =
  | 'loaded'
  | 'processing'
  | 'processingTrying'
  | 'processed'
  | 'errorProcessing'
  | 'calculateClaimed'
  | 'calculating'
  | 'errorCalculating'
  | 'updateClaimed'
  | 'updating'
  | 'updatingTrying'
  | 'errorUpdating'
  | 'recalculateClaimed'
  | 'reCalculating'
  | 'errorReCalculating'
  | 'ready'
  | 'deleteClaimed'
  | 'outdated';

export interface ProcessMonitorItem {
  /** Zombie run: no activity inside the active window — hidden by default. */
  stale: boolean;
  uuid: string;
  companyId: number;
  companyName: string;
  fileName: string;
  version: number;
  versionName: string;
  status: MonitorVersionStatus;
  statusDescription: string | null;
  classification: ProcessClassification;
  runMode: ProcessRunMode | null;
  triggeredBy: { name: string; email: string } | null;
  automaticRecalculation: boolean;
  pendingRecalculateReasons: string | null;
  originalEventId: string | null;
  startingDate: string | null;
  lastReportedDate: string | null;
  cancelling: boolean;
  created: string;
}

export interface ProcessMonitorSnapshot {
  generatedAt: string;
  stalledThresholdSeconds: number;
  activeWindowHours: number;
  items: ProcessMonitorItem[];
}

/** Firestore `spendFileVersion/{uuid}` document (progress contract, WI#18023). */
export interface MonitorFirebaseDoc {
  uuid?: string;
  status?: string;
  statusDescription?: string;
  updatedAt?: unknown;
  progress?: {
    operation?: {
      name?: string;
      position?: number;
      length?: number;
      progress?: number;
      times?: { elapsed?: number; remain?: number };
    };
    global?: {
      progress?: number;
      stage?: { index?: number; count?: number; name?: string; class?: string };
      times?: {
        startedAt?: string;
        elapsed?: number;
        remain?: number;
        estimatedTotal?: number;
        endingAt?: string;
      };
      estimate?: { source?: string; calibration?: number; planRevision?: number };
    };
  };
}

// ── API ──────────────────────────────────────────────────────────────────────

export async function getSpendFileMonitorSnapshot(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + '/api/admin/process/spend-file-versions/monitor';
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function cancelSpendFileVersionProcess(
  uuid: string,
  originalEventId?: string | null
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/admin/process/spend-file-version/${uuid}/cancel`;
  try {
    response = await axios.post(url, originalEventId ? { originalEventId } : {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}
