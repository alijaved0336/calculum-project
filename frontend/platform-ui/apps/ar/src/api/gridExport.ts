/**
 * Ada.Ar.Api's server-side grid export (`api/grid-exports`). The file is built on the server from
 * the same filter/sort the grid sent as GraphQL arguments; the browser never receives the dataset
 * as JSON. Small exports answer 200 with the file, larger ones 202 with a job to poll.
 */
import { requestRaw } from './http'

/** The grids that can be exported; the server parses these by name, case-insensitively. */
export type GridExportKind =
  | 'OpportunitySaleLines'
  | 'OpportunityBuyers'
  | 'OpportunityParents'
  | 'Match'
  | 'WaterfallSaleLines'
  | 'NineBoxRows'

/** One column by its GraphQL field name, as the user currently sees it. */
export interface GridExportColumn {
  field: string
  title: string
  hidden: boolean
}

export interface GridExportRequest {
  versionUuid: string
  /** The grid's GraphQL `where` argument, or null when unfiltered. */
  where: unknown
  /** The grid's GraphQL `order` argument, or null. */
  order: unknown
  customFilters: unknown
  customSorts: unknown
  currencyRate: number
  /** Waterfall step; `WaterfallSaleLines` only. */
  step?: string
  columns: GridExportColumn[]
  /** The download's name without extension; the server adds `.xlsx` or `.csv`. */
  fileName: string
}

export type GridExportStatusName = 'queued' | 'running' | 'ready' | 'failed' | 'cancelled'

export interface GridExportStatus {
  status: GridExportStatusName
  /** Present only while the file is ready and unclaimed. */
  downloadToken?: string
  rows?: number
  error?: string
}

export interface GridExportFile {
  blob: Blob
  /** The server-chosen name (extension included), or null when the header carried none. */
  fileName: string | null
}

export type StartGridExportResult =
  | { kind: 'file'; file: GridExportFile }
  | { kind: 'job'; jobId: string }

const BASE = '/api/grid-exports'

/**
 * Reads the file name out of a `Content-Disposition` header, preferring the RFC 5987 `filename*`
 * form (which carries non-ASCII names). Null when the header is absent or has neither.
 */
export function parseContentDispositionFileName(header: string | null): string | null {
  if (!header) {
    return null
  }

  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      // fall through to the plain form
    }
  }

  const plain = /filename\s*=\s*"?([^";]+)"?/.exec(header)
  return plain ? plain[1].trim() : null
}

async function toFile(response: Response): Promise<GridExportFile> {
  return {
    blob: await response.blob(),
    fileName: parseContentDispositionFileName(response.headers.get('Content-Disposition')),
  }
}

/**
 * Starts an export. 200 resolves with the file, 202 with the job to track. 400 (refused), 403 and
 * 409 (an export of this user's is already in flight) reject with an `HttpError`.
 */
export async function startGridExport(
  kind: GridExportKind,
  request: GridExportRequest,
  init?: RequestInit,
): Promise<StartGridExportResult> {
  const response = await requestRaw(`${BASE}/${kind}`, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: JSON.stringify(request),
  })

  if (response.status === 202) {
    const accepted = (await response.json()) as { jobId: string }
    return { kind: 'job', jobId: accepted.jobId }
  }

  return { kind: 'file', file: await toFile(response) }
}

export async function getGridExportStatus(jobId: string): Promise<GridExportStatus> {
  const response = await requestRaw(`${BASE}/${jobId}/status`)
  return (await response.json()) as GridExportStatus
}

/** Asks the server to abort the job. Resolves whether this call cancelled it (false: already over). */
export async function cancelGridExport(jobId: string): Promise<boolean> {
  const response = await requestRaw(`${BASE}/${jobId}/cancel`, { method: 'POST' })
  const body = (await response.json()) as { cancelled: boolean }
  return body.cancelled
}

/**
 * Claims the one-time download. Needs the signed-in session, so it goes through this client with
 * credentials rather than a plain link. 410 (expired or already used) rejects with an `HttpError`.
 */
export async function downloadGridExport(token: string): Promise<GridExportFile> {
  return toFile(await requestRaw(`${BASE}/download/${encodeURIComponent(token)}`))
}

