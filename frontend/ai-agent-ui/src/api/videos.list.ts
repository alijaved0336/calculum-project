// Support Videos library — backed by the Support Agent backend (:8002),
// GET /videos?q=&page=&page_size= with real server-side search + pagination.
// (Video upload itself still goes to the ingestion service; this only lists/deletes.)

import supportClient from '@/api/services/support.client'
import { rowToDisplayStatus, videoStageLabel } from '@/api/ingestion.service'
import { fmtTime } from '@/utils/transcript'
import type { VideoRow } from '@/types/ingestion'
import type { SupportVideo } from '@/data/mockVideos'

export interface VideoListPage {
  items: SupportVideo[]
  total: number
  page: number
  pageSize: number
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Backend VideoRow -> the display row (only fields the backend actually provides). */
function toSupportVideo(row: VideoRow, index: number): SupportVideo {
  const durMs = row.metadata?.duration_ms ?? 0
  const filename = row.metadata?.gcs_object?.split('/').pop() ?? `${row.video_id}.mp4`
  return {
    id: index + 1,
    videoId: row.video_id,
    title: row.title || filename,
    file: filename,
    duration: durMs ? fmtTime(durMs / 1000) : '—',
    durationSec: durMs ? durMs / 1000 : 0,
    chunks: row.chunk_count ?? 0,
    author: '',
    date: fmtDate(row.updated_at ?? row.created_at),
    status: rowToDisplayStatus(row),
    stage: videoStageLabel(row),
    error: row.error_message,
  }
}

/** Server-side paginated + searchable list of support videos. */
export async function fetchVideos(
  params: { q?: string; page?: number; pageSize?: number } = {},
): Promise<VideoListPage> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 8
  const { data } = await supportClient.get('/videos', {
    params: { q: params.q || undefined, page, page_size: pageSize },
  })
  const rows: VideoRow[] = data.items ?? []
  return {
    items: rows.map((r, i) => toSupportVideo(r, i)),
    total: data.total ?? rows.length,
    page: data.page ?? page,
    pageSize: data.page_size ?? pageSize,
  }
}

/** Remove a video from the library (DELETE /videos/{id} on the support backend). */
export async function deleteVideo(videoId: string): Promise<void> {
  await supportClient.delete(`/videos/${videoId}`)
}

/** One transcript segment (Qdrant chunk) of a video, for the segment manager. */
export interface Segment {
  id: string
  text: string
  startMs: number | null
  endMs: number | null
  chunkType: string | null
  pageNumbers: number[]
}

export interface SegmentsResult {
  videoId: string
  title: string | null
  videoUrl: string | null
  durationMs: number | null
  total: number
  segments: Segment[]
}

/** All transcript segments of a video + a signed preview URL (GET /videos/{id}/segments).
 *  Global-admin only on the backend. */
export async function listSegments(videoId: string): Promise<SegmentsResult> {
  const { data } = await supportClient.get(`/videos/${videoId}/segments`)
  const rows: any[] = Array.isArray(data.segments) ? data.segments : []
  return {
    videoId: data.video_id,
    title: data.title ?? null,
    videoUrl: data.video_url ?? null,
    durationMs: data.duration_ms ?? null,
    total: data.total ?? rows.length,
    segments: rows.map((s) => ({
      id: s.id,
      text: s.text ?? '',
      startMs: s.start_ms ?? null,
      endMs: s.end_ms ?? null,
      chunkType: s.chunk_type ?? null,
      pageNumbers: Array.isArray(s.page_numbers) ? s.page_numbers : [],
    })),
  }
}

/** Delete one transcript segment (DELETE /videos/{id}/segments/{segId}). Returns the
 *  video's authoritative remaining chunk count. Global-admin only on the backend. */
export async function deleteSegment(
  videoId: string,
  segmentId: string,
): Promise<{ deleted: boolean; chunkCount: number }> {
  const { data } = await supportClient.delete(
    `/videos/${videoId}/segments/${encodeURIComponent(segmentId)}`,
  )
  return { deleted: !!data.deleted, chunkCount: data.chunk_count ?? 0 }
}

export interface Playback {
  videoUrl: string
  durationMs: number | null
  cues: { t: number; text: string }[]
}

/** Signed video URL + transcript cues for the in-app player (GET /videos/{id}/play). */
export async function getPlayback(videoId: string): Promise<Playback> {
  const { data } = await supportClient.get(`/videos/${videoId}/play`)
  return {
    videoUrl: data.video_url,
    durationMs: data.duration_ms ?? null,
    cues: Array.isArray(data.cues) ? data.cues : [],
  }
}
