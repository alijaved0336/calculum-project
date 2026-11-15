// Support chat thread history — REST client for the Support Agent backend (:8002).
//
// Threads and messages are persisted server-side: the backend creates a thread on the
// first message (titled from the question) and stores every turn with its metadata
// (cited clips + document sources). This module lists past threads, loads a thread's
// messages, and deletes/renames threads. The streaming turns themselves go over the
// WebSocket in support.chat.ts.
//
//   GET    /support/threads?page=&page_size=
//   GET    /support/threads/{id}/messages
//   PATCH  /support/threads/{id}
//   DELETE /support/threads/{id}

import supportClient from '@/api/services/support.client'
import type { VideoClip, DocumentSource, AnswerSection } from '@/api/support.chat'

export interface ThreadRow {
  thread_id: string
  title: string | null
  message_count?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ThreadListPage {
  items: ThreadRow[]
  total: number
  page: number
  page_size: number
}

/** Server message shape. Assistant messages carry clips/sources in `metadata`; on load
 *  the backend re-signs the clip URLs (persisted ones expire), so they are ready to play. */
export interface StoredMessage {
  message_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: {
    sections?: AnswerSection[]
    video_clips?: VideoClip[]
    document_sources?: DocumentSource[]
    resolved?: boolean
    escalated?: boolean
  }
  created_at?: string | null
}

export interface ThreadMessages {
  thread_id: string
  title: string | null
  messages: StoredMessage[]
}

/** Most recent threads first (the backend orders by updated_at). */
export async function listThreads(page = 1, pageSize = 50): Promise<ThreadListPage> {
  const { data } = await supportClient.get('/support/threads', {
    params: { page, page_size: pageSize },
  })
  return {
    items: data.items ?? [],
    total: data.total ?? (data.items?.length ?? 0),
    page: data.page ?? page,
    page_size: data.page_size ?? pageSize,
  }
}

/** Full message history for a thread, with clip URLs freshly signed by the server. */
export async function getThreadMessages(threadId: string): Promise<ThreadMessages> {
  const { data } = await supportClient.get(`/support/threads/${threadId}/messages`)
  return { thread_id: data.thread_id, title: data.title ?? null, messages: data.messages ?? [] }
}

export async function deleteThread(threadId: string): Promise<void> {
  await supportClient.delete(`/support/threads/${threadId}`)
}

export async function renameThread(threadId: string, title: string): Promise<void> {
  await supportClient.patch(`/support/threads/${threadId}`, { title })
}
