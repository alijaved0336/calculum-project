// Support Assistant chat widget — data + helpers.
// Answers stream from the Support Agent (RAG) backend over WebSocket (api/support.chat.ts);
// threads + messages are persisted server-side and loaded via api/support.threads.ts.

import type { VideoClip, DocumentSource, AnswerSection } from "@/api/support.chat";
import type { ThreadRow, StoredMessage } from "@/api/support.threads";

export interface ChatMessage {
  role: "user" | "agent";
  text?: string;
  /** Per-intent answer sections (topic + its own text/clips/docs). When present the bubble
   *  renders sections instead of the flat text/clips/documents below. */
  sections?: AnswerSection[];
  /** Deep-linked video segments returned with the answer (seek start_ms → stop end_ms). */
  clips?: VideoClip[];
  /** Documents the answer was grounded in. */
  documents?: DocumentSource[];
  /** Set when the turn failed, so the bubble can render an error state. */
  error?: boolean;
}

export interface Conversation {
  /** Local id; equals threadId once the server has assigned one. */
  id: string;
  /** Server thread id — null for a brand-new chat that hasn't been sent yet. */
  threadId: string | null;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  /** True once this thread's full message history has been fetched from the server. */
  loaded?: boolean;
}

/** ISO timestamp → epoch ms (0 when absent), for sorting/relative-time display. */
function toMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Backend ThreadRow → a history entry (messages loaded lazily when opened). */
export function convFromThread(row: ThreadRow): Conversation {
  return {
    id: row.thread_id,
    threadId: row.thread_id,
    title: row.title || "New chat",
    messages: [],
    updatedAt: toMs(row.updated_at) || toMs(row.created_at) || Date.now(),
    loaded: false,
  };
}

/** Backend stored messages → the widget's bubble list (clips already re-signed on load). */
export function messagesFromStored(rows: StoredMessage[]): ChatMessage[] {
  return rows.map((m) => ({
    role: m.role === "assistant" ? "agent" : "user",
    text: m.content,
    sections: m.metadata?.sections,
    clips: m.metadata?.video_clips || [],
    documents: m.metadata?.document_sources || [],
  }));
}

/** Seconds for a clip, from the ms bounds the backend returns. */
export function clipDurationSec(clip: Pick<VideoClip, "start_ms" | "end_ms">): number {
  const start = clip.start_ms ?? 0;
  const end = clip.end_ms ?? start;
  return Math.max(0, Math.round((end - start) / 1000));
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const dd = Math.floor(h / 24);
  if (dd === 1) return "Yesterday";
  return dd + "d ago";
}

export function titleFrom(t: string): string {
  return t.length > 32 ? t.slice(0, 32) + "…" : t;
}

export function newConv(): Conversation {
  return {
    id: "c" + Date.now() + Math.round(Math.random() * 999),
    threadId: null,
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
    loaded: true, // a fresh, empty chat has nothing to fetch
  };
}

/** Accent → { soft, deep } palette. Add your brand hexes here. */
export function themeFor(accent: string): { accent: string; soft: string; deep: string } {
  const soft: Record<string, string> = { "#0f9e8c": "#e7f7f4", "#ff6a00": "#fff4ec", "#4f46e5": "#eef0fe", "#6366f1": "#eef2ff" };
  const deep: Record<string, string> = { "#0f9e8c": "#0b7d6e", "#ff6a00": "#d95c00", "#4f46e5": "#3f37c9", "#6366f1": "#4f46e5" };
  return { accent, soft: soft[accent] || "#e7f7f4", deep: deep[accent] || accent };
}
