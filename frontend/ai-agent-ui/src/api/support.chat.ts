// Support Assistant chat — streaming client for the Support Agent backend (:8002).
//
// The backend socket is one-shot: it accepts, reads a single {message} frame, streams
// the answer, then closes. So each question opens its own connection — there is no
// persistent session to keep alive (unlike the negotiation chat in useChat.ts).
//
//   WS /support/chat?token=<jwt>
//     -> { type: 'token', data: '...' }   (repeated, as the LLM generates)
//     -> { type: 'done',  metadata: {...} } (clips / sources / resolution, then close)

import { useAuthStore } from '@/stores/auth.store'

/** A deep-linked segment of a support video: seek to start_ms, stop at end_ms. */
export interface VideoClip {
  video_id: string
  title: string | null
  start_ms: number | null
  end_ms: number | null
  duration_ms?: number | null   // full video length (for the card badge)
  video_url: string
  /** The exact moments THIS video is cited at in the answer, computed and merged by the backend
   *  (overlapping ranges already merged). Authoritative — the client no longer guesses which
   *  cited [MM:SS] belongs to which video. Absent on older persisted messages. */
  cited_ranges?: { start_ms: number; end_ms: number }[]
}

export interface DocumentSource {
  document_id: string
  title: string | null
  page_numbers?: number[]
}

/** One answer section — a sub-question's answer with its own video(s)/doc(s). A normal
 *  single-intent answer is one section; a decomposed multi-intent prompt has several. */
export interface AnswerSection {
  topic: string
  text?: string
  video_clips: VideoClip[]
  document_sources: DocumentSource[]
  /** Transient, client-only streaming flags (never sent by the server): `started` once the
   *  section's text begins, `ready` once it finishes (its clips/docs may then be revealed). */
  started?: boolean
  ready?: boolean
}

/** The `sections` init frame the server sends before section text streams. */
export interface SectionInit extends AnswerSection {
  index: number
}

export interface ChatAnswerMeta {
  sections?: AnswerSection[]
  video_clips: VideoClip[]
  document_sources: DocumentSource[]
  resolved: boolean
  sources: string[]
  escalated: boolean
  /** The server thread this answer belongs to. The backend creates the thread on the
   *  first message (titled from the question), so this is how the client learns its id. */
  thread_id?: string | null
}

export interface AskHandlers {
  /** The server thread id, sent as the FIRST frame (before any tokens). Adopt it right away so
   *  a follow-up prompt continues this thread even if the turn is cancelled or `done` is lost. */
  onThread?: (threadId: string) => void
  /** Section scaffolding (topic + clips + docs), sent once before the section texts stream. */
  onSections?: (sections: SectionInit[]) => void
  /** A streamed token; `section` is its section index (multi-intent answers). */
  onToken?: (text: string, section?: number) => void
  /** Called once with the grounding metadata when the answer completes. */
  onDone?: (meta: ChatAnswerMeta) => void
  onError?: (message: string) => void
}

const HTTP_BASE: string = import.meta.env.VITE_SUPPORT_API_URL || ''

/** ws(s):// origin for the support backend. Falls back to the page origin so a proxied
 *  deployment (empty VITE_SUPPORT_API_URL) still resolves correctly. */
function wsBase(): string {
  if (HTTP_BASE) return HTTP_BASE.replace(/^http/, 'ws').replace(/\/+$/, '')
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}`
}

const EMPTY_META: ChatAnswerMeta = {
  video_clips: [],
  document_sources: [],
  resolved: true,
  sources: [],
  escalated: false,
  thread_id: null,
}

/**
 * Ask the support agent and stream the answer.
 *
 * Pass `threadId` to continue an existing conversation; omit it (or null) and the
 * backend starts a new thread and returns its id in the `done` metadata.
 *
 * Resolves once the socket closes. Returns a `cancel()` via the handle so a caller can
 * abandon an in-flight answer (widget closed, new question) without leaking the socket.
 */
export function askSupport(
  question: string,
  handlers: AskHandlers = {},
  threadId?: string | null,
) {
  const token = useAuthStore().accessToken
  let socket: WebSocket | null = null
  let settled = false
  let opened = false

  const done = new Promise<void>((resolve) => {
    if (!token) {
      handlers.onError?.('Not authenticated')
      resolve()
      return
    }

    socket = new WebSocket(`${wsBase()}/support/chat?token=${encodeURIComponent(token)}`)

    socket.onopen = () => {
      opened = true
      // thread_id is omitted for a brand-new chat; the server then creates + names it.
      socket?.send(JSON.stringify(threadId ? { message: question, thread_id: threadId } : { message: question }))
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      let payload: {
        type?: string; data?: string; section?: number; thread_id?: string
        sections?: SectionInit[]; metadata?: Partial<ChatAnswerMeta>
      }
      try {
        payload = JSON.parse(event.data)
      } catch {
        return // ignore malformed frame
      }
      if (payload.type === 'thread') {
        if (payload.thread_id) handlers.onThread?.(payload.thread_id)
      } else if (payload.type === 'sections') {
        handlers.onSections?.(payload.sections || [])
      } else if (payload.type === 'token') {
        if (payload.data) handlers.onToken?.(payload.data, payload.section)
      } else if (payload.type === 'done') {
        settled = true
        handlers.onDone?.({ ...EMPTY_META, ...(payload.metadata || {}) })
      }
    }

    // A handshake failure fires onerror AND onclose; let onclose report it so the caller
    // only ever sees one error, and only report here for a mid-stream failure.
    socket.onerror = () => {
      if (!settled && opened) {
        settled = true
        handlers.onError?.('Connection error')
      }
    }

    // The server closes after `done`; only surface a close as an error if it arrived first.
    socket.onclose = (e) => {
      if (!settled) {
        settled = true
        // Closing before the socket ever opened means the handshake was rejected. The
        // server rejects an invalid/expired token *before* accepting, so the browser sees
        // an HTTP 403 rather than a 1008 close frame — and it deliberately hides that
        // status from JS (surfacing 1006), so an unreachable service looks identical.
        // Auth is by far the likeliest cause, so say so without asserting it outright.
        if (!opened) {
          handlers.onError?.("Couldn't reach the assistant — your session may have expired. Try signing in again.")
        } else if (e.code === 1008) {
          handlers.onError?.('Session expired — please sign in again.')
        } else {
          handlers.onError?.('Connection closed before the answer completed.')
        }
      }
      resolve()
    }
  })

  return {
    done,
    cancel() {
      settled = true // suppress the close handler's error path
      if (socket && socket.readyState !== WebSocket.CLOSED) socket.close()
    },
  }
}
