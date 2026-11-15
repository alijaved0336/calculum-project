// Real integration with the Video & Transcript Ingestion API
// (Ingestion_Support_Endpoints_Details.md).
//
// Videos upload straight to GCS via a signed URL — the file never passes through our
// API — and the server indexes the transcript once the object lands:
//   1) POST /videos/init-upload               → { video_id, upload_url }
//   2) PUT  <signed url>                      → the browser sends the file to GCS
//   3) POST /videos/{id}/transcript           → staged; the server chains indexing
//      GET  /videos/{id}/events (SSE)          → awaiting_upload → uploaded → ready
//
// Documents are small enough to post through the API:
//   POST /ingest/document                     → 202 { job_id }
//   GET  /ingest/document/{id}/events (SSE)    → uploading → processing → upserting → upserted

import { useAuthStore } from '@/stores/auth.store'
import {
  TRANSCRIPT_TERMINAL,
  DOCUMENT_TERMINAL,
  type VideoInitUploadResponse,
  type TranscriptIngestAccepted,
  type DocumentIngestAccepted,
  type VideoRow,
  type VideoEvent,
  type TranscriptEvent,
  type DocumentEvent,
  type VideoStatus,
  type TranscriptStatus,
  type DocumentStatus,
} from '@/types/ingestion'

// Base URL of the SUPPORT ingestion service (ingestion-support-agent). This app also
// talks to the Calculum/negotiation ingestion service, which owns VITE_INGESTION_API_URL
// and exposes a different contract (/ingest/upload, /ingest/documents/{uuid}) — pointing
// support traffic at it 404s. Keep the two configured separately.
const BASE: string = import.meta.env.VITE_SUPPORT_INGESTION_API_URL || ''

function authHeader(): Record<string, string> {
  const token = useAuthStore().accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function errorMessage(status: number, body: string): string {
  try {
    const j = JSON.parse(body)
    if (typeof j.detail === 'string') return j.detail
    if (Array.isArray(j.detail)) return j.detail.map((d: { msg?: string }) => d.msg).join(', ')
  } catch {
    /* ignore */
  }
  return `Request failed (${status})`
}

/** Send a multipart body (POST/PATCH) with real byte-upload progress via XHR (fetch has none). */
function sendMultipart<T>(
  method: 'POST' | 'PATCH',
  path: string,
  form: FormData,
  onProgress?: (pct: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, BASE + path)
    const h = authHeader()
    if (h.Authorization) xhr.setRequestHeader('Authorization', h.Authorization)
    // Do NOT set Content-Type — the browser adds the multipart boundary.
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          reject(new Error('Malformed server response'))
        }
      } else {
        reject(new Error(errorMessage(xhr.status, xhr.responseText)))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(form)
  })
}

/** POST multipart with real byte-upload progress via XHR. */
function postMultipart<T>(path: string, form: FormData, onProgress?: (pct: number) => void): Promise<T> {
  return sendMultipart<T>('POST', path, form, onProgress)
}

/** POST a JSON body (used to request a signed upload URL). */
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(errorMessage(res.status, await res.text()))
  return (await res.json()) as T
}

/** PUT a file straight to a GCS signed URL with real byte-upload progress.
 *  No auth header — the signature IS the authorization; only the signed headers are sent. */
function putSignedUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    for (const [k, v] of Object.entries(headers || {})) if (v) xhr.setRequestHeader(k, v)
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload to storage failed (${xhr.status})`))
    xhr.onerror = () => reject(new Error('Network error uploading to storage'))
    xhr.send(file)
  })
}

/** Consume an SSE stream (auth header required, so fetch — not EventSource).
 *  Pass a `signal` to cancel a stream that never reaches a terminal event (e.g. a
 *  permanently-stuck row) so it can't linger as an open connection. */
async function streamSSE<E extends { status: string }>(
  path: string,
  onEvent: (e: E) => void,
  isTerminal: (status: string) => boolean,
  signal?: AbortSignal,
): Promise<E | null> {
  const res = await fetch(BASE + path, { headers: { ...authHeader() }, signal })
  if (!res.ok || !res.body) throw new Error(`Event stream failed (${res.status})`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let last: E | null = null
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      // Ignore keep-alive comment lines (starting with ':'); read the data: line.
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      const json = dataLine.slice(5).trim()
      if (!json) continue
      try {
        const ev = JSON.parse(json) as E
        last = ev
        onEvent(ev)
        if (isTerminal(ev.status)) {
          reader.cancel().catch(() => {})
          return ev
        }
      } catch {
        /* ignore malformed frame */
      }
    }
  }
  return last
}

// ── Public API ─────────────────────────────────────────────────────────────────
export const ingestionApi = {
  /** Upload the video bytes and resolve as soon as the upload is ACCEPTED.
   *  Requests a signed URL, then PUTs the file straight to GCS (browser → bucket); the
   *  file never passes through our API. Processing continues server-side once the object
   *  lands (GCS → Pub/Sub) — track it with trackVideo(). */
  async postVideo(
    file: File,
    transcriptFile: File | undefined,
    title: string | undefined,
    cueCount: number | undefined,
    handlers: { onProgress?: (pct: number) => void } = {},
    videoId?: string,
    videoDurationMs?: number,
  ): Promise<{ videoId: string; eventsUrl: string; chained: boolean }> {
    // init-upload is JSON and can't bundle the transcript, so the transcript is staged
    // separately and the SERVER indexes it once the video is stored (chained: true —
    // no second client call, and nothing is lost if the tab closes mid-upload).
    // Pass `videoId` to REPLACE an existing video's file in place (edit) — same signed
    // direct-to-GCS path, so a large replacement never routes bytes through the API.
    const init = await postJson<VideoInitUploadResponse>('/videos/init-upload', {
      filename: file.name,
      content_type: file.type || 'video/mp4',
      size_bytes: file.size,
      // The file never reaches our API, so init-upload is the only place the admin's
      // title can be persisted — omit it and the row falls back to the filename.
      title,
      // Replace mode: send the new video's measured duration so the server can reject a
      // clip too short for a kept transcript up front (independent of the async notification).
      ...(videoId
        ? {
            video_id: videoId,
            has_new_transcript: !!transcriptFile,
            ...(videoDurationMs ? { video_duration_ms: Math.round(videoDurationMs) } : {}),
          }
        : {}),
    })
    // Stage the transcript BEFORE the (much larger) video PUT: the GCS notification
    // fires as soon as the video lands, and the server needs the transcript by then.
    if (transcriptFile) {
      const tform = new FormData()
      tform.append('transcript', transcriptFile)
      if (cueCount != null) tform.append('cue_count', String(cueCount))
      await postMultipart(`/videos/${init.video_id}/transcript`, tform)
    }
    await putSignedUrl(init.upload_url, file, init.headers, handlers.onProgress)
    return { videoId: init.video_id, eventsUrl: init.events_url, chained: !!transcriptFile }
  },

  /** Track a video's server-side processing to a terminal status: `ready` once the GCS
   *  notification (and, for large files, the transcode) has completed. */
  async trackVideo(videoId: string, onEvent: (e: VideoEvent) => void = () => {}, signal?: AbortSignal): Promise<VideoEvent | null> {
    const terminal: VideoStatus[] = ['ready', 'failed']
    return streamSSE<VideoEvent>(
      `/videos/${videoId}/events`,
      onEvent,
      (s) => terminal.includes(s as VideoStatus),
      signal,
    )
  },

  /** Observe a video's transcript-indexing events (read-only; does not trigger ingestion). */
  async trackTranscript(videoId: string, onEvent: (e: TranscriptEvent) => void = () => {}, signal?: AbortSignal): Promise<TranscriptEvent | null> {
    return streamSSE<TranscriptEvent>(
      `/ingest/video/${videoId}/events`,
      onEvent,
      (s) => TRANSCRIPT_TERMINAL.includes(s as TranscriptStatus),
      signal,
    )
  },

  /** Observe a document's indexing events (read-only). */
  async trackDocument(documentId: string, onEvent: (e: DocumentEvent) => void = () => {}, signal?: AbortSignal): Promise<DocumentEvent | null> {
    return streamSSE<DocumentEvent>(
      `/ingest/document/${documentId}/events`,
      onEvent,
      (s) => DOCUMENT_TERMINAL.includes(s as DocumentStatus),
      signal,
    )
  },

  /** Step 2 — ingest the transcript for a video, then stream its status to completion. */
  async ingestTranscript(
    file: File,
    videoId: string,
    title: string | undefined,
    handlers: { onEvent?: (e: TranscriptEvent) => void; cueCount?: number } = {},
  ): Promise<TranscriptEvent | null> {
    const onEvent = handlers.onEvent ?? (() => {})
    const form = new FormData()
    form.append('transcript', file)
    form.append('video_id', videoId)
    if (title) form.append('title', title)
    await postMultipart<TranscriptIngestAccepted>('/ingest/video/transcript', form)
    return streamSSE<TranscriptEvent>(
      `/ingest/video/${videoId}/events`,
      onEvent,
      (s) => TRANSCRIPT_TERMINAL.includes(s as TranscriptStatus),
    )
  },

  /** Upload a document and resolve as soon as the server ACCEPTS it (202).
   *  Parsing/chunking/indexing then continues server-side in the background. */
  async postDocument(
    file: File,
    title: string | undefined,
    handlers: { onProgress?: (pct: number) => void } = {},
    isPublic = false,
  ): Promise<{ documentId: string }> {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    form.append('is_public', String(isPublic))
    const accepted = await postMultipart<DocumentIngestAccepted>('/ingest/document', form, handlers.onProgress)
    return { documentId: accepted.file_id }
  },

  /** Edit a video row's title and/or transcript (send only what changed). PATCH /videos/{id}.
   *  Replacing the VIDEO file goes through postVideo(..., videoId) instead (signed flow).
   *  Returns which fields changed and whether a transcript change kicked off re-indexing. */
  async updateVideo(
    videoId: string,
    changes: { title?: string; transcriptFile?: File; cueCount?: number },
    handlers: { onProgress?: (pct: number) => void } = {},
  ): Promise<{ updated: string[]; reprocessing: boolean }> {
    const form = new FormData()
    if (changes.title != null) form.append('title', changes.title)
    if (changes.transcriptFile) form.append('transcript', changes.transcriptFile)
    if (changes.cueCount != null) form.append('cue_count', String(changes.cueCount))
    const res = await sendMultipart<{ updated?: string[]; reprocessing?: boolean }>(
      'PATCH', `/videos/${videoId}`, form, handlers.onProgress,
    )
    return { updated: res.updated ?? [], reprocessing: !!res.reprocessing }
  },

  /** Edit a document row: title and/or file (send only what changed).
   *  PATCH /ingest/document/{id}. `reprocessing` is true when the file changed. */
  async updateDocument(
    documentId: string,
    changes: { title?: string; file?: File; isPublic?: boolean },
    handlers: { onProgress?: (pct: number) => void } = {},
  ): Promise<{ updated: string[]; reprocessing: boolean }> {
    const form = new FormData()
    if (changes.title != null) form.append('title', changes.title)
    if (changes.file) form.append('file', changes.file)
    if (changes.isPublic != null) form.append('is_public', String(changes.isPublic))
    const res = await sendMultipart<{ updated?: string[]; reprocessing?: boolean }>(
      'PATCH', `/ingest/document/${documentId}`, form, handlers.onProgress,
    )
    return { updated: res.updated ?? [], reprocessing: !!res.reprocessing }
  },

  /** Durable state (polling fallback / final result). */
  async getVideo(videoId: string): Promise<VideoRow> {
    const res = await fetch(`${BASE}/videos/${videoId}`, { headers: { ...authHeader() } })
    if (!res.ok) throw new Error(errorMessage(res.status, await res.text()))
    return (await res.json()) as VideoRow
  },
}

/** Map a document's backend `document_status` onto the display pill (indexed | processing | failed). */
export function docRowToDisplayStatus(documentStatus: string | null): 'indexed' | 'processing' | 'failed' {
  if (documentStatus === 'failed') return 'failed'
  if (documentStatus === 'upserted' || documentStatus === 'empty') return 'indexed'
  return 'processing'
}

/** Granular live sub-stage for a processing VIDEO row (from persisted DB status). */
export function videoStageLabel(row: Pick<VideoRow, 'video_status' | 'transcript_status'>): string | undefined {
  const ts = row.transcript_status
  if (ts === 'upserted' || ts === 'empty') return undefined // indexed
  if (ts === 'uploading' || ts === 'processing' || ts === 'upserting') return 'Indexing'
  const vs = row.video_status
  if (vs === 'compressing') return 'Compressing'
  if (vs === 'awaiting_upload') return 'Uploading'
  // 'ready' = the video is stored; what's left is transcript indexing, so show that.
  if (vs === 'ready') return 'Indexing'
  if (vs === 'uploading' || vs === 'uploaded' || vs === 'processing') return 'Processing'
  return undefined
}

/** Granular live sub-stage for a processing DOCUMENT row (from persisted DB status). */
export function docStageLabel(documentStatus: string | null): string | undefined {
  if (documentStatus === 'upserted' || documentStatus === 'empty') return undefined
  if (documentStatus === 'upserting') return 'Indexing'
  if (documentStatus === 'processing' || documentStatus === 'uploading') return 'Processing'
  return undefined
}

/**
 * Map the backend's granular video/transcript status onto the display list's
 * 3-state pill (indexed | processing | failed). Ready for when a list endpoint
 * (GET /videos) exists — the backend spec currently exposes only GET /videos/{id}.
 */
const VIDEO_IN_FLIGHT = ['awaiting_upload', 'uploading', 'compressing', 'processing']
export function rowToDisplayStatus(row: Pick<VideoRow, 'video_status' | 'transcript_status'>):
  | 'indexed'
  | 'processing'
  | 'failed' {
  if (row.video_status === 'failed' || row.transcript_status === 'failed') return 'failed'
  // A replaced video is re-compressing/storing even when the previous transcript is still
  // indexed — surface that as Processing rather than a premature Indexed.
  if (row.video_status && VIDEO_IN_FLIGHT.includes(row.video_status)) return 'processing'
  if (row.transcript_status === 'upserted' || row.transcript_status === 'empty') return 'indexed'
  return 'processing'
}
