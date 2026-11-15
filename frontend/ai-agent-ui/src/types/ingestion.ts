// Backend contract for the Video & Transcript Ingestion API.
// Mirrors Ingestion_Support_Endpoints_Details.md exactly.

// --- POST responses ---
export interface VideoUploadAccepted {
  video_id: string
  status: 'processing'
  events_url: string // e.g. "/videos/{id}/events"
  status_url: string // e.g. "/videos/{id}"
  ingest_hint: string
}

// --- POST /videos/init-upload (direct-to-GCS signed URL) ---
export interface VideoInitUploadResponse {
  video_id: string
  status: 'awaiting_upload'
  title: string
  upload_url: string // signed PUT URL — upload the file directly here
  method: 'PUT'
  headers: Record<string, string> // headers the PUT must send (e.g. Content-Type)
  events_url: string // e.g. "/videos/{id}/events"
  status_url: string // e.g. "/videos/{id}"
}

export interface TranscriptIngestAccepted {
  job_id: string
  file_id: string // == video_id
  status: 'pending'
  status_url: string // e.g. "/ingest/jobs/{job_id}"
}

// --- GET /videos/{id} ---
export interface VideoRow {
  video_id: string
  status: string // coarse/legacy
  media_type: 'video'
  title: string | null
  metadata: {
    gcs_object?: string
    duration_ms?: number | null
    size_bytes?: number
    original_size_bytes?: number
    transcript_format?: string
    transcript_filename?: string
    transcript_gcs_object?: string
  }
  chunk_count: number | null
  video_status: VideoStatus | null
  transcript_status: TranscriptStatus | null
  document_status: string | null
  error_message: string | null // why processing failed (shown on a Failed row)
  created_at: string | null // ISO 8601
  updated_at: string | null
}

// --- Job polling (GET /ingest/jobs/{job_id}) ---
export interface IngestJob {
  job_id: string
  file_id: string
  file_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  chunks_written: number
  error: string | null
}

// --- SSE events ---
export type VideoStatus =
  | 'awaiting_upload'
  | 'processing'
  | 'compressing'
  | 'uploading'
  | 'uploaded'
  | 'ready'
  | 'failed'
export type TranscriptStatus =
  | 'uploading'
  | 'processing'
  | 'upserting'
  | 'upserted'
  | 'empty'
  | 'failed'

export interface VideoEvent {
  phase: 'video'
  status: VideoStatus
  video_id: string
  elapsed_ms?: number
  compress_ms?: number
  upload_ms?: number
  total_ms?: number
  size_before?: number
  size_after?: number
  gcs_object?: string
  duration_ms?: number | null
  error?: string // present on "failed"
}

export interface TranscriptEvent {
  phase: 'transcript'
  status: TranscriptStatus
  video_id: string
  chunk_count?: number // present on "upserted"/"empty"
  error?: string // present on "failed"
}

// Terminal statuses (SSE stream closes on these).
export const VIDEO_TERMINAL: VideoStatus[] = ['uploaded', 'failed']
export const TRANSCRIPT_TERMINAL: TranscriptStatus[] = ['upserted', 'empty', 'failed']

// --- General documents (POST /ingest/document) ---
export interface DocumentIngestAccepted {
  job_id: string
  file_id: string // == document_id
  status: 'pending'
  status_url: string
  title?: string | null
}

export type DocumentStatus = 'uploading' | 'processing' | 'upserting' | 'upserted' | 'empty' | 'failed'

export interface DocumentEvent {
  phase: 'document'
  status: DocumentStatus
  document_id: string
  chunk_count?: number // present on "upserted"/"empty"
  error?: string // present on "failed"
}

export const DOCUMENT_TERMINAL: DocumentStatus[] = ['upserted', 'empty', 'failed']

// --- GET /documents (support backend :8002) ---
export interface DocumentRow {
  document_id: string
  status: string
  media_type: 'document'
  title: string | null
  filename: string | null
  is_public: boolean
  metadata: { filename?: string; size_bytes?: number; chunk_source?: string }
  chunk_count: number | null
  document_status: string | null
  created_at: string | null
  updated_at: string | null
}
