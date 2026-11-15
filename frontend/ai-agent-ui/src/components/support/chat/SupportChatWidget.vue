<script setup lang="ts">
/**
 * SupportChatWidget — a floating, draggable support chat launcher + panel.
 *
 * Mount ONCE in your authenticated layout so it shows on every logged-in page:
 *   <SupportChatWidget />                 // real app usage (no demo backdrop)
 *   <SupportChatWidget demo-backdrop />   // standalone demo with a faux app behind it
 *
 * Views: chat (empty state + messages) · history (resume/switch/delete) · player (video, expandable).
 * Answers stream from the Support Agent backend over WebSocket (api/support.chat.ts) and
 * carry deep-linked clips: the player seeks to start_ms and stops at end_ms.
 */
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import {
  fmtTime, timeAgo, titleFrom,
  newConv, convFromThread, messagesFromStored, themeFor, clipDurationSec,
  type Conversation, type ChatMessage,
} from "@/composables/useSupportChat";
import { askSupport, type VideoClip, type DocumentSource, type AnswerSection } from "@/api/support.chat";
import { listThreads, getThreadMessages, deleteThread, type ThreadRow } from "@/api/support.threads";
import { renderMarkdown } from "@/utils/markdown";
import { fetchDocumentUrl } from "@/api/documents.list";

const props = withDefaults(defineProps<{
  accent?: string;
  startOpen?: boolean;
  showLabel?: boolean;
  demoBackdrop?: boolean;
}>(), {
  accent: "#0f9e8c",
  startOpen: false,
  showLabel: true,
  demoBackdrop: false,
});

const theme = computed(() => themeFor(props.accent));

/* ---------------- state ---------------- */
type View = "chat" | "history" | "player";
const open = ref(props.startOpen);
const view = ref<View>("chat");
const draft = ref("");
const typing = ref(false);
// True for the WHOLE in-flight turn (typing only covers the pre-first-token dots). Guards the
// composer so a mid-stream send can't cancel the current turn and orphan its thread.
const streaming = ref(false);

// The attention pulse on the launcher shows only on a user's FIRST visit; once seen it is
// remembered so it never pulses again on later loads.
const launcherPulse = ref(false);
try {
  if (!localStorage.getItem("sa-launcher-pulsed")) {
    launcherPulse.value = true;
    localStorage.setItem("sa-launcher-pulsed", "1");
  }
} catch { /* localStorage unavailable → simply skip the pulse */ }
const conversations = ref<Conversation[]>([]);
const activeId = ref("");
const anchor = reactive({ rx: 26, by: 26 });
// Full-video playback that STARTS at the cited moment. `startSec`/`endSec` bound the
// segment the answer cited (shown as a marker on the timeline); the player opens seeked
// to `startSec` but can then be scrubbed freely across the whole `duration`.
const player = reactive({
  url: "", title: "", startSec: 0, endSec: 0,
  currentTime: 0, duration: 0, playing: false, expanded: false,
  // Every moment the answer cited (parsed from its text), so the player can offer a
  // "Jump to …" button per reference and mark each on the timeline.
  segments: [] as { startSec: number; endSec: number }[],
});

const msgEl = ref<HTMLElement | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const expandedEl = ref<HTMLVideoElement | null>(null);
const shouldStickToBottom = ref(true);
const bottomThreshold = 48;
let touchStartY = 0;
/** The element currently on screen — the overlay's when expanded, otherwise the inline one. */
function activeEl(): HTMLVideoElement | null {
  return player.expanded ? expandedEl.value : videoEl.value;
}
let ask: ReturnType<typeof askSupport> | null = null;
const historyLoading = ref(false);
// Server-paginated conversation history: page 1 loads with the list; older pages load
// automatically as the user scrolls the History view to the bottom.
const HISTORY_PAGE_SIZE = 20;
const historyPage = ref(1);        // highest page fetched so far
const historyTotal = ref(0);       // total threads on the server (from the list endpoint)
const historyLoadingMore = ref(false);
// More to load while we hold fewer server threads (those with a threadId) than the total.
const hasMoreHistory = computed(
  () => conversations.value.filter((c) => c.threadId).length < historyTotal.value,
);

onMounted(() => {
  // Start on a fresh empty chat; past threads load in the background for the History view.
  const fresh = newConv();
  conversations.value = [fresh];
  activeId.value = fresh.id;
  try { const a = JSON.parse(localStorage.getItem("sa-chat-anchor") || "null"); if (a && typeof a.rx === "number") { anchor.rx = a.rx; anchor.by = a.by; } } catch {}
  void loadHistory();
});
onBeforeUnmount(() => { ask?.cancel(); detach(); });

/** Merge a page of server threads into `conversations` WITHOUT removing anything: existing
 *  threads have their title/timestamp refreshed (loaded messages preserved), local unsent chats
 *  stay, and new threads are appended. Additive so already-loaded pages survive a refresh. */
function mergeThreads(items: ThreadRow[]) {
  const updates = new Map(items.map((r) => [r.thread_id, r]));
  const known = new Set(conversations.value.map((c) => c.threadId).filter(Boolean));
  const next = conversations.value.map((c) => {
    const row = c.threadId ? updates.get(c.threadId) : undefined;
    return row ? { ...c, title: row.title || c.title, updatedAt: convFromThread(row).updatedAt } : c;
  });
  for (const row of items) {
    if (!known.has(row.thread_id)) next.push(convFromThread(row));
  }
  conversations.value = next;
}

/** Fetch the first (latest) page of persisted threads and merge it in. */
async function loadHistory() {
  historyLoading.value = true;
  try {
    const page = await listThreads(1, HISTORY_PAGE_SIZE);
    historyTotal.value = page.total;
    historyPage.value = Math.max(historyPage.value, 1);
    mergeThreads(page.items);
  } catch {
    /* offline / unauthenticated — keep whatever is in memory */
  } finally {
    historyLoading.value = false;
  }
}

/** Load the next page of older threads (called automatically on scroll-to-bottom). */
async function loadMoreHistory() {
  if (historyLoading.value || historyLoadingMore.value || !hasMoreHistory.value) return;
  historyLoadingMore.value = true;
  try {
    const next = historyPage.value + 1;
    const page = await listThreads(next, HISTORY_PAGE_SIZE);
    historyPage.value = next;
    historyTotal.value = page.total;
    mergeThreads(page.items);
  } catch {
    /* keep what we have; a later scroll retries */
  } finally {
    historyLoadingMore.value = false;
  }
}

/** Auto-load older conversations as the History list nears the bottom. */
function onHistoryScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) void loadMoreHistory();
}

/* ---------------- computed ---------------- */
const active = computed(() => conversations.value.find(c => c.id === activeId.value));
const messages = computed<ChatMessage[]>(() => active.value?.messages || []);
const isEmpty = computed(() => messages.value.length === 0);
const canSend = computed(() => !!draft.value.trim() && !streaming.value);
// The timeline spans the WHOLE video (scrub anywhere); the cited segment is drawn on
// it as a marker so the user still sees which part the answer referenced.
const progressPct = computed(() =>
  player.duration ? (player.currentTime / player.duration) * 100 : 0
);
const pctOf = (sec: number) =>
  player.duration ? Math.max(0, Math.min(100, (sec / player.duration) * 100)) : 0;
// One marker per cited moment, drawn on the full-length timeline.
const citedMarkers = computed(() =>
  player.duration
    ? player.segments.map((s) => ({
        startSec: s.startSec,
        leftPct: pctOf(s.startSec),
        widthPct: Math.max(0.8, pctOf(s.endSec) - pctOf(s.startSec)),
      }))
    : []
);

const convList = computed(() =>
  conversations.value.slice().sort((a, b) => b.updatedAt - a.updatedAt).map(c => {
    const last = c.messages[c.messages.length - 1];
    let snip: string;
    if (last) snip = (last.role === "user" ? "You: " : "") + (last.text || "");
    // A persisted thread whose messages we haven't fetched yet has content — just not
    // loaded — so don't claim it's empty; the list endpoint returns no preview text.
    else if (c.threadId && !c.loaded) snip = "Open to view conversation";
    else snip = "No messages yet";
    return {
      id: c.id, title: c.title, timeLabel: timeAgo(c.updatedAt),
      snippet: snip.length > 46 ? snip.slice(0, 46) + "…" : snip,
      active: c.id === activeId.value,
    };
  })
);

// A uniform render unit. A single-intent answer (or a user turn) is one block; a multi-intent
// answer is one block per section (each with its own heading + text + clips + docs).
interface RenderBlock { heading?: string; text?: string; clips: VideoClip[]; documents: DocumentSource[]; }
function blocksOf(m: ChatMessage): RenderBlock[] {
  const sections = m.sections;
  if (sections && sections.length) {
    const multi = sections.length > 1;   // hide the redundant heading when there's just one
    return sections
      .filter((s: AnswerSection) => s.started !== false)   // not-yet-started sections stay hidden
      .map((s: AnswerSection) => ({
        heading: multi ? s.topic : undefined,
        text: s.text,
        // a section's clips/docs appear only once its text has finished streaming (ready)
        clips: s.ready === false ? [] : (s.video_clips || []),
        documents: s.ready === false ? [] : (s.document_sources || []),
      }));
  }
  return [{ text: m.text, clips: m.clips || [], documents: m.documents || [] }];
}
// True once a message has something to show. An agent turn starts as an empty placeholder
// (streaming target); while it's empty the typing indicator stands in for it — rendering the
// placeholder too would show a second, bubble-less avatar.
function hasContent(m: ChatMessage): boolean {
  return !!(m.text || m.sections?.length || (m.clips && m.clips.length) || (m.documents && m.documents.length));
}
// Full video length for the card badge (falls back to the retrieved span if unknown).
function fullDurationLabel(c: VideoClip): string {
  if (c.duration_ms && c.duration_ms > 0) return fmtTime(c.duration_ms / 1000);
  return fmtTime(clipDurationSec(c));
}
// The moments a video is referenced at in this answer — the cited ranges that fall within the
// video's retrieved span, with OVERLAPPING ranges merged (parseSegments does that) and distinct
// ranges kept separate. Shown as "reference" chips under the single video card.
function clipRefs(c: VideoClip, text: string = ""): { startSec: number; endSec: number }[] {
  const start = (c.start_ms ?? 0) / 1000;
  const end = (c.end_ms ?? c.start_ms ?? 0) / 1000;
  const endSec = end > start ? end : start;
  return parseSegments(text || "").filter((s) => s.startSec >= start - 2 && s.startSec <= endSec + 2);
}
// The reference chips to show for a clip. Prefer the backend's authoritative per-video
// `cited_ranges` (already matched to THIS video and overlap-merged — no cross-video guessing);
// fall back to text-parsed `clipRefs` for older persisted messages that predate cited_ranges.
function clipMoments(c: VideoClip, text: string = ""): { startSec: number; endSec: number }[] {
  if (c.cited_ranges && c.cited_ranges.length) {
    return c.cited_ranges.map((r) => ({ startSec: r.start_ms / 1000, endSec: r.end_ms / 1000 }));
  }
  return clipRefs(c, text);
}
function refLabel(r: { startSec: number; endSec: number }): string {
  return r.endSec > r.startSec ? `${secToClock(r.startSec)}–${secToClock(r.endSec)}` : secToClock(r.startSec);
}
// Open a cited document (opens the original via a short-lived signed URL). The backend
// only hands the URL to viewers allowed to see the doc (public → anyone, private → admin).
const openingDoc = ref<string | null>(null);
const docError = ref<string | null>(null);
async function openDoc(documentId: string) {
  if (openingDoc.value) return;
  openingDoc.value = documentId;
  docError.value = null;
  // Fetch the short-lived signed URL, then open it. On failure (403 private / network /
  // no file) show an error instead of failing silently.
  try {
    const url = await fetchDocumentUrl(documentId);
    window.open(url, "_blank", "noopener");
  } catch {
    docError.value = "Couldn't open that document — it may be unavailable.";
  } finally {
    openingDoc.value = null;
  }
}
// The video's title/name is admin-only (feature: hide which video a clip is from from
// end users). Non-admins see a generic label.
function clipTitle(c: VideoClip): string {
  return c.title || "Support video";   // the source video's name, shown to everyone
}

// Answers cite moments inline as [MM:SS–MM:SS] (or [MM:SS]); each becomes a "Jump to …"
// button + a marker on the timeline. Handles en-dash/em-dash/hyphen and optional hours.
const SEG_RE = /\[(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[–—-]\s*(\d{1,2}:\d{2}(?::\d{2})?))?\]/g;
const MERGE_GAP = 2; // seconds — ranges within this gap are treated as one continuous range
function clockToSec(clock: string): number {
  const p = clock.split(":").map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
}
function secToClock(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function parseSegments(text: string): { startSec: number; endSec: number }[] {
  const raw: { startSec: number; endSec: number }[] = [];
  let m: RegExpExecArray | null;
  SEG_RE.lastIndex = 0;
  while ((m = SEG_RE.exec(text || ""))) {
    const startSec = clockToSec(m[1]);
    raw.push({ startSec, endSec: m[2] ? clockToSec(m[2]) : startSec });
  }
  // Merge overlapping / touching ranges so a jump button / marker never double-counts a moment.
  raw.sort((a, b) => a.startSec - b.startSec);
  const out: { startSec: number; endSec: number }[] = [];
  for (const seg of raw) {
    const last = out[out.length - 1];
    if (last && seg.startSec <= last.endSec + MERGE_GAP) last.endSec = Math.max(last.endSec, seg.endSec);
    else out.push({ ...seg });
  }
  return out;
}
// Collapse overlapping consecutive range citations in the ANSWER TEXT, e.g.
// "[17:42–18:16] and [18:11–18:46]" → "[17:42–18:46]". Only merges range citations that are
// adjacent (separated by a connector like "and"/","/"&") and whose times overlap or touch, so
// unrelated citations elsewhere are left alone.
const RANGE_RE = /\[(\d{1,2}:\d{2}(?::\d{2})?)\s*[–—-]\s*(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
const CONNECTOR_RE = /^\s*(?:,\s*)?(?:and\s+|&\s+)?\s*$/;
function mergeCitedRanges(text: string): string {
  if (!text) return text;
  const toks: { start: number; end: number; s: number; e: number }[] = [];
  let m: RegExpExecArray | null;
  RANGE_RE.lastIndex = 0;
  while ((m = RANGE_RE.exec(text))) {
    toks.push({ start: m.index, end: m.index + m[0].length, s: clockToSec(m[1]), e: clockToSec(m[2]) });
  }
  if (toks.length < 2) return text;
  const parts: string[] = [];
  let cursor = 0, i = 0;
  while (i < toks.length) {
    let j = i, e = toks[i].e;
    while (
      j + 1 < toks.length &&
      CONNECTOR_RE.test(text.slice(toks[j].end, toks[j + 1].start)) &&
      toks[j + 1].s <= e + MERGE_GAP
    ) {
      e = Math.max(e, toks[j + 1].e);
      j++;
    }
    parts.push(text.slice(cursor, toks[i].start));
    parts.push(j > i ? `[${secToClock(toks[i].s)}–${secToClock(e)}]` : text.slice(toks[i].start, toks[i].end));
    cursor = toks[j].end;
    i = j + 1;
  }
  parts.push(text.slice(cursor));
  return parts.join("");
}

/* ---------------- messaging ---------------- */
function isNearBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= bottomThreshold;
}

function updateShouldStickToBottom() {
  if (!msgEl.value) return;
  shouldStickToBottom.value = isNearBottom(msgEl.value);
}

function scrollDown() {
  if (!msgEl.value) return;
  msgEl.value.scrollTop = msgEl.value.scrollHeight;
  shouldStickToBottom.value = true;
}

function scrollToBottom() {
  shouldStickToBottom.value = true;
  nextTick(() => {
    scrollDown();
    requestAnimationFrame(scrollDown);
  });
}

watch([() => messages.value.length, typing, activeId, view], () => {
  if (shouldStickToBottom.value) nextTick().then(scrollToBottom);
});

function handleWheel(event: WheelEvent) {
  if (event.deltaY < 0) shouldStickToBottom.value = false;
}

function handleTouchStart(event: TouchEvent) {
  touchStartY = event.touches[0]?.clientY ?? 0;
}

function handleTouchMove(event: TouchEvent) {
  const nextY = event.touches[0]?.clientY ?? touchStartY;
  if (nextY > touchStartY) shouldStickToBottom.value = false;
  touchStartY = nextY;
}
// Refresh the thread list whenever the History view is opened, so freshly-created
// threads (and any renamed/updated on the server) show up.
watch(view, (v) => { if (v === "history") void loadHistory(); });

/** Patch the agent's (last) message in the conversation keyed by `id`. */
function patchAgentMessage(id: string, patch: Partial<ChatMessage>) {
  conversations.value = conversations.value.map((c) => {
    if (c.id !== id) return c;
    const msgs = c.messages.slice();
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "agent") return c;
    msgs[msgs.length - 1] = { ...last, ...patch };
    return { ...c, messages: msgs, updatedAt: Date.now() };
  });
}

/** Adopt the server thread id on the first answer, so this conversation now continues
 *  that persisted thread (and shows up in history with the server's title). */
function adoptThreadId(localId: string, threadId: string | null | undefined) {
  if (!threadId) return;
  conversations.value = conversations.value.map((c) =>
    c.id === localId ? { ...c, id: threadId, threadId, loaded: true } : c
  );
  if (activeId.value === localId) activeId.value = threadId;
}

function send(text: string) {
  const t = (text || "").trim();
  if (!t || streaming.value) return;   // one turn at a time — never cancel an in-flight turn
  const id = activeId.value;
  const conv = conversations.value.find((c) => c.id === id);
  const threadId = conv?.threadId ?? null; // continue this thread, or null to start one
  // Append the question AND an empty agent bubble that streamed tokens flow into.
  conversations.value = conversations.value.map(c =>
    c.id === id
      ? {
          ...c,
          title: c.title === "New chat" ? titleFrom(t) : c.title,
          messages: [...c.messages, { role: "user", text: t }, { role: "agent", text: "" }],
          updatedAt: Date.now(),
        }
      : c
  );
  draft.value = ""; typing.value = true; streaming.value = true; view.value = "chat"; shouldStickToBottom.value = true;

  ask?.cancel();
  let streamed = "";
  let sections: AnswerSection[] | null = null;
  // `adoptThreadId` rewrites the conversation's id to the server thread id mid-stream, so the
  // captured `id` goes stale. Track the LIVE id here and patch through it, or streamed tokens
  // (and the final patch) would target a conversation that no longer exists — dropping the
  // whole first reply until a reload.
  let convId = id;
  const pushSections = () => patchAgentMessage(convId, { sections: (sections || []).map((s) => ({ ...s })) });
  ask = askSupport(t, {
    onThread: (tid) => { adoptThreadId(convId, tid); convId = tid; },   // adopt up front so continuity survives cancel / lost `done`
    onSections: (secs) => {
      // Hold the scaffolding (topic + clips + docs) but reveal nothing yet — keep the typing
      // dots. Each section is shown text-first as it streams; its clips/docs follow once done.
      sections = secs.map((s) => ({
        topic: s.topic, text: "", video_clips: s.video_clips,
        document_sources: s.document_sources, started: false, ready: false,
      }));
    },
    onToken: (chunk, section) => {
      typing.value = false; // first token replaces the typing dots
      if (typeof section === "number" && sections && sections[section]) {
        sections[section].started = true;               // this section now shows (text-first)
        for (let k = 0; k < section; k++) sections[k].ready = true; // earlier ones done → reveal clips/docs
        sections[section].text = (sections[section].text || "") + chunk;
        pushSections();
      } else {
        streamed += chunk;
        patchAgentMessage(convId, { text: streamed });
      }
      if (shouldStickToBottom.value) scrollDown();
    },
    onDone: (meta) => {
      typing.value = false;
      if (meta.sections && meta.sections.length) {
        // authoritative sections (signed clips, gated docs); all now fully revealed
        patchAgentMessage(convId, {
          sections: meta.sections.map((s) => ({ ...s, started: true, ready: true })), text: "",
        });
      } else {
        patchAgentMessage(convId, {
          text: streamed,
          clips: meta.video_clips || [],
          documents: meta.document_sources || [],
        });
      }
      // A new chat now has a server id; the active-conversation key follows it.
      adoptThreadId(convId, meta.thread_id);
    },
    onError: (message) => {
      typing.value = false;
      if (sections) {
        // The answer streamed as sections but the socket closed before the `done` frame
        // (the server persists BEFORE `done`, so the turn is already saved — that final
        // trailer frame is just occasionally lost on Cloud Run). The section scaffolding
        // already carries the signed clips/docs, so reveal what streamed instead of leaving
        // them hidden until a reload.
        sections = sections.map((s) => (s.started ? { ...s, ready: true } : s));
        pushSections();
        return;
      }
      // Nothing streamed: keep whatever text arrived; only flag an error if none did.
      patchAgentMessage(convId, { text: streamed || message, error: !streamed });
    },
  }, threadId);
  ask.done.finally(() => { typing.value = false; streaming.value = false; });
}
function onKey(e: KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft.value); } }

/* ---- composer auto-grow: expand with content up to a max height, then scroll ---- */
const inputEl = ref<HTMLTextAreaElement | null>(null);
const INPUT_MAX_H = 120; // px — after this the textarea scrolls
function autoGrow() {
  const el = inputEl.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, INPUT_MAX_H) + "px";
}
function resetInputHeight() { nextTick(() => { if (inputEl.value) inputEl.value.style.height = "auto"; }); }
// After a send/clear, collapse the box back to one line.
watch(draft, (v) => { if (!v) resetInputHeight(); });

/* ---------------- conversations ---------------- */
function newChat() { ask?.cancel(); const nc = newConv(); conversations.value = [nc, ...conversations.value]; activeId.value = nc.id; view.value = "chat"; draft.value = ""; typing.value = false; streaming.value = false; shouldStickToBottom.value = true; }

/** Open a conversation; if it's a persisted thread we haven't loaded yet, fetch its
 *  messages (with freshly-signed clip URLs) on demand. */
async function resumeConv(id: string) {
  ask?.cancel();
  activeId.value = id;
  view.value = "chat";
  shouldStickToBottom.value = true;
  const conv = conversations.value.find((c) => c.id === id);
  if (!conv || conv.loaded || !conv.threadId) return;
  try {
    const data = await getThreadMessages(conv.threadId);
    conversations.value = conversations.value.map((c) =>
      c.id === id
        ? { ...c, title: data.title || c.title, messages: messagesFromStored(data.messages), loaded: true }
        : c
    );
    scrollToBottom();
  } catch {
    /* leave it collapsed; the row still shows and can be retried */
  }
}

async function deleteConv(id: string) {
  const conv = conversations.value.find((c) => c.id === id);
  // Best-effort server delete for persisted threads; local-only chats just drop.
  if (conv?.threadId) { try { await deleteThread(conv.threadId); } catch { /* ignore */ } }
  const rest = conversations.value.filter(c => c.id !== id);
  if (id === activeId.value) {
    if (rest.length) { conversations.value = rest; activeId.value = rest.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id; }
    else { const nc = newConv(); conversations.value = [nc]; activeId.value = nc.id; }
  } else { conversations.value = rest; }
}

/* ---------------- player (real <video>: full video, opens at the cited moment) ------- */
// Core opener: play `clip` from `startSec`; `endSec` (>0) stops there, 0 plays onward. All the
// video's referenced moments are shown as timeline markers regardless of which one was clicked.
function playAt(clip: VideoClip, startSec: number, endSec: number, segments: { startSec: number; endSec: number }[]) {
  Object.assign(player, {
    url: clip.video_url,
    title: clipTitle(clip),
    startSec,
    endSec,
    currentTime: startSec,
    duration: 0, // set on loadedmetadata
    playing: false,
    expanded: false,
    segments: segments.length ? segments : [{ startSec, endSec: endSec || startSec }],
  });
  view.value = "player";
  pendingStartSeek = true;
  // Seek once the element has the new source (loadedmetadata also re-seeks defensively).
  nextTick(() => seekTo(startSec));
}
// Card / "Watch video": open the whole video at its first referenced moment and play onward
// (no stop). `endSec` 0 disables the stop-at-end.
function openVideo(clip: VideoClip, answerText = "") {
  const refs = clipMoments(clip, answerText);
  const start = refs.length ? refs[0].startSec : (clip.start_ms ?? 0) / 1000;
  playAt(clip, start, 0, refs);
}
// A reference chip: play exactly that cited range, then stop at its end.
function openClipRange(clip: VideoClip, r: { startSec: number; endSec: number }, answerText = "") {
  playAt(clip, r.startSec, r.endSec, clipMoments(clip, answerText));
}
// True only until the cited-start seek lands, so switching to the overlay element
// mid-playback (expand) doesn't snap back to the start.
let pendingStartSeek = false;

function backToChat() {
  activeEl()?.pause();
  player.playing = false;
  player.expanded = false;
  view.value = "chat";
}

function seekTo(sec: number) {
  const el = activeEl();
  const clamped = player.duration ? Math.max(0, Math.min(player.duration, sec)) : Math.max(0, sec);
  if (el && Number.isFinite(clamped)) el.currentTime = clamped;
  player.currentTime = clamped;
}

/** On load: record the full duration and, only on a fresh open, jump to the cited moment. */
function onLoadedMeta() {
  const el = activeEl();
  if (el && Number.isFinite(el.duration)) player.duration = el.duration;
  if (pendingStartSeek) {
    pendingStartSeek = false;
    seekTo(player.startSec);
  }
}

function onTimeUpdate() {
  const el = activeEl();
  if (!el) return;
  player.currentTime = el.currentTime;
  // Stop when the clip's cited segment ends, so it plays 1:08–2:07 rather than the whole
  // video. Clear the bound afterwards so the viewer can hit play again to keep watching.
  if (player.playing && player.endSec && el.currentTime >= player.endSec) {
    el.pause();
    player.playing = false;
    player.endSec = 0;
  }
}

function onEnded() { player.playing = false; }

function togglePlay() {
  const el = activeEl();
  if (!el) return;
  if (el.paused) {
    // Reached the very end → replay from the cited moment (where it opened).
    if (player.duration && el.currentTime >= player.duration - 0.05) seekTo(player.startSec);
    void el.play().then(() => { player.playing = true; }).catch(() => { player.playing = false; });
  } else {
    el.pause();
    player.playing = false;
  }
}

/** Scrub anywhere across the whole video — forward or backward. */
function onScrub(e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  seekTo(ratio * player.duration);
}

/** Jump to a specific cited moment (used by each per-reference button). */
function jumpTo(sec: number) {
  seekTo(sec);
  const el = activeEl();
  if (el) void el.play().then(() => { player.playing = true; }).catch(() => {});
}

/** Expanding swaps to the overlay's <video>, so carry position + play state across. */
function toggleExpand() {
  const from = activeEl();
  const at = from?.currentTime ?? player.currentTime;
  const wasPlaying = !!from && !from.paused;
  from?.pause();
  player.expanded = !player.expanded;
  nextTick(() => {
    const to = activeEl();
    if (!to) return;
    to.currentTime = at;
    if (wasPlaying) void to.play().then(() => { player.playing = true; }).catch(() => {});
  });
}
function closeExpand() { if (player.expanded) toggleExpand(); }

/* ---------------- dragging (launcher + panel header) ---------------- */
let mv: ((e: PointerEvent) => void) | null = null;
let up: (() => void) | null = null;
function detach() { if (mv) window.removeEventListener("pointermove", mv); if (up) window.removeEventListener("pointerup", up); mv = up = null; }
function beginDrag(e: PointerEvent, el: HTMLElement, onClickIfStill?: () => void) {
  e.preventDefault();
  const rect = el.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  const startX = e.clientX, startY = e.clientY;
  const start = { rx: anchor.rx, by: anchor.by };
  let moved = false;
  mv = (ev: PointerEvent) => {
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    anchor.rx = Math.min(Math.max(12, window.innerWidth - w - 12), Math.max(12, start.rx - dx));
    anchor.by = Math.min(Math.max(12, window.innerHeight - h - 12), Math.max(12, start.by - dy));
  };
  up = () => { detach(); try { localStorage.setItem("sa-chat-anchor", JSON.stringify({ rx: anchor.rx, by: anchor.by })); } catch {} if (!moved && onClickIfStill) onClickIfStill(); };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
}
function startLauncherDrag(e: PointerEvent) { beginDrag(e, e.currentTarget as HTMLElement, () => { open.value = true; }); }
function startPanelDrag(e: PointerEvent) { beginDrag(e, (e.currentTarget as HTMLElement).parentElement as HTMLElement); }
</script>

<template>
  <div
    class="cw-root"
    :class="{ 'cw-root--demo': demoBackdrop }"
    :style="{ '--brand': theme.accent, '--brand-soft': theme.soft, '--brand-deep': theme.deep }"
  >
    <!-- Faux app backdrop (demo only) -->
    <div v-if="demoBackdrop" class="cw-backdrop">
      <div class="cw-bd-top"></div>
      <div class="cw-bd-side"></div>
      <div class="cw-bd-note">Your app — the Support widget floats on top, drag it anywhere</div>
    </div>

    <!-- Anchor: launcher (closed) or panel (open) -->
    <div class="cw-anchor" :style="{ right: anchor.rx + 'px', bottom: anchor.by + 'px' }">

      <!-- Launcher -->
      <div v-if="!open" class="cw-launch-wrap">
        <div class="cw-launcher" title="Chat with Support — drag to move" @pointerdown="startLauncherDrag">
          <span v-if="launcherPulse" class="cw-pulse"></span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.4-5.2a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12 2.5a8.38 8.38 0 0 1 9 9z"/></svg>
        </div>
        <div v-if="showLabel" class="cw-hint">Need help? <span>Ask the assistant</span></div>
      </div>

      <!-- Panel -->
      <div v-else class="cw-panel">
        <!-- header (drag handle) -->
        <div class="cw-header" @pointerdown="startPanelDrag">
          <div class="cw-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-2a4 4 0 0 1 4-4h1"/><path d="M21 18v-2a4 4 0 0 0-4-4h-1"/><path d="M12 12a8 8 0 0 0-8 8"/><rect x="9" y="2" width="6" height="7" rx="3"/></svg>
          </div>
          <div class="cw-htext">
            <div class="cw-title">Support Assistant</div>
            <div class="cw-status"><span class="cw-dot"></span>Online · replies instantly</div>
          </div>
          <div class="cw-hbtns">
            <button title="Chat history" @click="view = 'history'"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-8 5"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/></svg></button>
            <button title="New chat" @click="newChat"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>
            <button title="Minimize" @click="open = false"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
          </div>
        </div>

        <!-- CHAT VIEW -->
        <template v-if="view === 'chat'">
          <div ref="msgEl" class="cw-scroll cw-msgs" @scroll="updateShouldStickToBottom" @wheel.passive="handleWheel" @touchstart.passive="handleTouchStart" @touchmove.passive="handleTouchMove">
            <!-- empty -->
            <template v-if="isEmpty">
              <div class="cw-empty">
                <div class="cw-hero"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.4-5.2a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12 2.5a8.38 8.38 0 0 1 9 9z"/></svg></div>
                <div class="cw-empty-t">How can I help?</div>
                <div class="cw-empty-s">Ask me anything, and I’ll find the best answer and share relevant content to help you out.</div>
              </div>
            </template>

            <!-- messages -->
            <template v-else>
              <template v-for="(m, i) in messages" :key="i">
              <div v-if="m.role === 'user' || hasContent(m)" class="cw-row" :class="m.role === 'user' ? 'cw-row--user' : 'cw-row--agent'">
                <div v-if="m.role === 'agent'" class="cw-mini-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-2a4 4 0 0 1 4-4h1"/><path d="M21 18v-2a4 4 0 0 0-4-4h-1"/><path d="M12 12a8 8 0 0 0-8 8"/><rect x="9" y="2" width="6" height="7" rx="3"/></svg>
                </div>
                <div class="cw-col" :class="m.role === 'user' ? 'cw-col--user' : 'cw-col--agent'">
                  <template v-for="(b, bi) in blocksOf(m)" :key="bi">
                    <div v-if="b.heading" class="cw-section-head">{{ b.heading }}</div>
                    <div v-if="b.text" class="cw-bubble" :class="[m.role === 'user' ? 'cw-bubble--user' : 'cw-bubble--agent', { 'cw-bubble--err': m.error }]">
                      <div v-if="m.role === 'agent' && !m.error" class="cw-md" v-html="renderMarkdown(mergeCitedRanges(b.text || ''))"></div>
                      <template v-else>{{ b.text }}</template>
                    </div>
                    <div v-for="(c, ci) in b.clips" :key="'c' + ci" class="cw-vcard">
                      <div class="cw-poster" @click="openVideo(c, b.text)">
                        <div class="cw-play"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style="margin-left:2px"><path d="M7 5v14l12-7z"/></svg></div>
                        <span class="cw-dur">{{ fullDurationLabel(c) }}</span>
                      </div>
                      <div class="cw-vmeta">
                        <div class="cw-vhead">
                          <div class="cw-vtitle">{{ clipTitle(c) }}</div>
                          <button class="cw-watch" @click="openVideo(c, b.text)">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>Watch
                          </button>
                        </div>
                        <!-- moments this video is referenced at (backend-matched + overlap-merged) -->
                        <div v-if="clipMoments(c, b.text).length" class="cw-refs">
                          <div class="cw-refs-label">Referenced at</div>
                          <div class="cw-refs-list">
                            <button v-for="(r, ri) in clipMoments(c, b.text)" :key="'r' + ri" class="cw-ref"
                                    @click="openClipRange(c, r, b.text)">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>{{ refLabel(r) }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-if="b.documents.length" class="cw-docs">
                      <div class="cw-docs-head">Sources</div>
                      <button v-for="(d, di) in b.documents" :key="'d' + di" class="cw-doc" title="Open document" @click="openDoc(d.document_id)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                        <span class="cw-doc-title">{{ d.title || d.document_id }}</span>
                        <span v-if="d.page_numbers && d.page_numbers.length" class="cw-doc-pages">
                          p.{{ d.page_numbers.join(", ") }}
                        </span>
                        <svg class="cw-doc-open" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
              </template>
              <!-- typing -->
              <div v-if="typing" class="cw-typing">
                <div class="cw-mini-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-2a4 4 0 0 1 4-4h1"/><path d="M21 18v-2a4 4 0 0 0-4-4h-1"/><path d="M12 12a8 8 0 0 0-8 8"/><rect x="9" y="2" width="6" height="7" rx="3"/></svg></div>
                <div class="cw-typing-bubble"><span></span><span></span><span></span></div>
              </div>
            </template>
          </div>

          <!-- input -->
          <div class="cw-input">
            <div v-if="docError" class="cw-doc-error" role="alert">{{ docError }}</div>
            <div class="cw-input-box">
              <div class="cw-mode"><span class="cw-mode-dot"></span>Support</div>
              <div class="cw-input-row">
                <textarea ref="inputEl" v-model="draft" rows="1" placeholder="Ask anything…" @keydown="onKey" @input="autoGrow"></textarea>
                <button class="cw-send" :disabled="!canSend" @click="send(draft)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
              </div>
            </div>
            <div class="cw-foot">Powered by Support Assistant · answers link to source videos &amp; documents</div>
          </div>
        </template>

        <!-- HISTORY VIEW -->
        <template v-else-if="view === 'history'">
          <div class="cw-hist-head">
            <span>Your conversations</span>
            <button class="cw-newchat" @click="newChat"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>New chat</button>
          </div>
          <div class="cw-scroll cw-hist" @scroll="onHistoryScroll">
            <div v-if="historyLoading && convList.length === 0" class="cw-hist-empty">Loading your conversations…</div>
            <div v-else-if="convList.length === 0" class="cw-hist-empty">No conversations yet. Start a new chat to see it here.</div>
            <div v-for="c in convList" :key="c.id" class="cw-hist-item" :class="{ 'is-active': c.active }" @click="resumeConv(c.id)">
              <div class="cw-hist-icon" :class="{ 'is-active': c.active }">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.4-5.2a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12 2.5a8.38 8.38 0 0 1 9 9z"/></svg>
              </div>
              <div class="cw-hist-body">
                <div class="cw-hist-row"><span class="cw-hist-title">{{ c.title }}</span><span class="cw-hist-time">{{ c.timeLabel }}</span></div>
                <div class="cw-hist-snip">{{ c.snippet }}</div>
              </div>
              <button class="cw-hist-del" title="Delete" @click.stop="deleteConv(c.id)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
            </div>
            <div v-if="historyLoadingMore" class="cw-hist-more"><span class="cw-hist-spin" />Loading more…</div>
          </div>
        </template>

        <!-- PLAYER VIEW -->
        <template v-else>
          <button class="cw-back" @click="backToChat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Back to chat</button>
          <div class="cw-player">
            <div class="cw-video">
              <video
                v-show="!player.expanded"
                ref="videoEl"
                class="cw-video-el"
                :src="player.url"
                playsinline
                preload="metadata"
                @loadedmetadata="onLoadedMeta"
                @timeupdate="onTimeUpdate"
                @ended="onEnded"
                @play="player.playing = true"
                @pause="player.playing = false"
                @click="togglePlay"
              ></video>
              <button v-if="!player.playing" class="cw-bigplay" @click="togglePlay">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style="margin-left:3px"><path d="M7 5v14l12-7z"/></svg>
              </button>
              <div class="cw-video-badge">{{ player.title }}</div>
              <button class="cw-expand" title="Expand" @click="toggleExpand"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
            </div>
            <div class="cw-controls">
              <span class="cw-time">{{ fmtTime(player.currentTime) }}</span>
              <div class="cw-track" @click="onScrub">
                <div v-for="(mk, mi) in citedMarkers" :key="mi" class="cw-track-cite" :style="{ left: mk.leftPct + '%', width: mk.widthPct + '%' }" title="A part this answer referenced"></div>
                <div class="cw-track-fill" :style="{ width: progressPct + '%' }"></div>
                <div class="cw-track-knob" :style="{ left: progressPct + '%' }"></div>
              </div>
              <span class="cw-time cw-time--dim">{{ fmtTime(player.duration) }}</span>
            </div>
            <div class="cw-ptitle">{{ player.title }}</div>
            <div class="cw-psub">
              <span>Full video · {{ fmtTime(player.duration) }}</span>
            </div>
            <div v-if="citedMarkers.length" class="cw-jumps">
              <span class="cw-jumps-label">Referenced moments</span>
              <div class="cw-jumps-row">
                <button v-for="(mk, mi) in citedMarkers" :key="mi" class="cw-jump" @click="jumpTo(mk.startSec)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>
                  {{ fmtTime(mk.startSec) }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- BIG-SCREEN OVERLAY -->
    <div v-if="player.expanded" class="cw-overlay" @click="closeExpand">
      <div class="cw-overlay-card" @click.stop>
        <div class="cw-overlay-head">
          <div class="cw-overlay-title">{{ player.title }}</div>
          <button class="cw-overlay-x" @click="closeExpand"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="cw-overlay-video">
          <video
            ref="expandedEl"
            class="cw-video-el"
            :src="player.url"
            playsinline
            preload="metadata"
            @loadedmetadata="onLoadedMeta"
            @timeupdate="onTimeUpdate"
            @ended="onEnded"
            @play="player.playing = true"
            @pause="player.playing = false"
            @click="togglePlay"
          ></video>
          <button v-if="!player.playing" class="cw-bigplay cw-bigplay--lg" @click="togglePlay">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" style="margin-left:4px"><path d="M7 5v14l12-7z"/></svg>
          </button>
        </div>
        <div class="cw-controls cw-controls--lg">
          <span class="cw-time cw-time--light">{{ fmtTime(player.currentTime) }}</span>
          <div class="cw-track cw-track--dark" @click="onScrub">
            <div v-for="(mk, mi) in citedMarkers" :key="mi" class="cw-track-cite" :style="{ left: mk.leftPct + '%', width: mk.widthPct + '%' }" title="A part this answer referenced"></div>
            <div class="cw-track-fill" :style="{ width: progressPct + '%' }"></div>
            <div class="cw-track-knob" :style="{ left: progressPct + '%' }"></div>
          </div>
          <span class="cw-time cw-time--muted">{{ fmtTime(player.duration) }}</span>
        </div>
        <div v-if="citedMarkers.length" class="cw-jumps cw-jumps--lg">
          <span class="cw-jumps-label">Referenced moments</span>
          <div class="cw-jumps-row">
            <button v-for="(mk, mi) in citedMarkers" :key="mi" class="cw-jump" @click="jumpTo(mk.startSec)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>
              {{ fmtTime(mk.startSec) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cw-root { font-family: "Inter", system-ui, sans-serif; }
.cw-root--demo { position: fixed; inset: 0; overflow: hidden; background: #eef1f4; }

.cw-backdrop { position: absolute; inset: 0; pointer-events: none; user-select: none; }
.cw-bd-top { position: absolute; top: 0; left: 0; right: 0; height: 56px; background: #fff; border-bottom: 1px solid #e6e9ec; }
.cw-bd-side { position: absolute; top: 56px; left: 0; bottom: 0; width: 76px; background: #fff; border-right: 1px solid #e6e9ec; }
.cw-bd-note { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #aeb6bd; }

.cw-anchor { position: fixed; z-index: 100; }

/* launcher */
.cw-launch-wrap { display: flex; align-items: center; gap: 12px; flex-direction: row-reverse; position: relative; }
.cw-launcher { position: relative; width: 60px; height: 60px; border-radius: 50%; background: color-mix(in srgb, var(--brand) 25%, #fff); border: 1px solid var(--brand); display: flex; align-items: center; justify-content: center; cursor: grab; box-shadow: 0 12px 30px color-mix(in srgb, var(--brand) 40%, transparent); touch-action: none; }
.cw-pulse { position: absolute; inset: 0; border-radius: 50%; background: var(--brand); animation: cw-pulse 2.4s ease-out infinite; }
/* The hint is revealed only on hover of the launcher so it never occupies layout space
   or overlaps page content: absolutely positioned to the left of the round button. */
.cw-hint { position: absolute; right: calc(100% + 12px); top: 50%; transform: translateY(-50%) translateX(8px); opacity: 0; pointer-events: none; transition: opacity .18s ease, transform .18s ease; background: #fff; border: 1px solid #e6e9ec; box-shadow: 0 8px 26px rgba(15,25,35,.12); border-radius: 12px; padding: 10px 14px; font-size: 13.5px; font-weight: 500; color: #1f2328; white-space: nowrap; }
.cw-hint span { color: #8a929c; font-weight: 400; }
.cw-launch-wrap:hover .cw-hint { opacity: 1; transform: translateY(-50%) translateX(0); pointer-events: auto; }

/* panel */
/* Roomier panel, capped to the viewport so it never overflows or clips when dragged to an edge. */
.cw-panel { width: min(440px, 94vw); height: min(800px, 92vh); background: #fff; border: 1px solid #e6e9ec; border-radius: 18px; box-shadow: 0 26px 70px rgba(15,25,35,.26); display: flex; flex-direction: column; overflow: hidden; }
.cw-header { display: flex; align-items: center; gap: 11px; padding: 13px 14px 13px 15px; border-bottom: 1px solid #eef0f2; cursor: grab; touch-action: none; }
.cw-avatar { width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(140deg, var(--brand), var(--brand-deep)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cw-htext { min-width: 0; flex: 1; }
.cw-title { font-size: 14.5px; font-weight: 700; line-height: 1.15; }
.cw-status { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #8a929c; margin-top: 2px; }
.cw-dot { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.16); }
.cw-hbtns { display: flex; align-items: center; gap: 2px; }
.cw-hbtns button { border: none; background: transparent; cursor: pointer; padding: 6px; border-radius: 8px; color: #8a929c; line-height: 0; }
.cw-hbtns button:hover { background: #f2f3f5; color: #5b6470; }

.cw-scroll { overflow-y: auto; overflow-x: hidden; }
.cw-scroll::-webkit-scrollbar { width: 9px; }
.cw-scroll::-webkit-scrollbar-thumb { background: #e2e4e7; border-radius: 8px; border: 3px solid transparent; background-clip: padding-box; }
.cw-msgs { flex: 1; padding: 18px 16px 8px; }

.cw-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 22px 10px 8px; }
.cw-hero { width: 54px; height: 54px; border-radius: 15px; background: linear-gradient(140deg, var(--brand), var(--brand-deep)); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px var(--brand-soft); }
.cw-empty-t { font-size: 17px; font-weight: 700; margin-top: 16px; }
.cw-empty-s { font-size: 13px; color: #5b6470; line-height: 1.55; margin-top: 8px; max-width: 280px; }
.cw-sugs { display: flex; flex-direction: column; gap: 9px; margin-top: 20px; }
.cw-sug { text-align: left; border: 1px solid #dfe3eb; background: #fff; border-radius: 11px; padding: 12px 14px; font-size: 13px; font-weight: 600; color: #6366f1ff; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 10px; }
.cw-sug:hover,
.cw-sug:focus-visible { border-color: #6366f1ff; background: #eef2ff; color: #6366f1ff; outline: none; }
.cw-sug svg { flex-shrink: 0; color: #6366f1ff; }

.cw-row { display: flex; align-items: flex-end; margin-bottom: 12px; }
.cw-row--user { justify-content: flex-end; }
.cw-row--agent { justify-content: flex-start; }
.cw-mini-avatar { width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(140deg, var(--brand), var(--brand-deep)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 8px; align-self: flex-end; }
.cw-col { display: flex; flex-direction: column; min-width: 0; }
.cw-col--user { align-items: flex-end; max-width: 82%; }
.cw-col--agent { align-items: flex-start; max-width: calc(100% - 40px); }
.cw-bubble { font-size: 13.5px; line-height: 1.5; padding: 10px 13px; word-break: break-word; }
.cw-bubble--user { background: var(--brand); color: #fff; border-radius: 14px 14px 4px 14px; }
.cw-bubble--agent { background: #f3f5f6; color: #2b3038; border-radius: 14px 14px 14px 4px; }
/* rendered markdown inside an agent reply */
.cw-md { display: flow-root; }
.cw-md > :first-child { margin-top: 0; }
.cw-md > :last-child { margin-bottom: 0; }
.cw-md p { margin: 0 0 8px; }
.cw-md h1, .cw-md h2, .cw-md h3, .cw-md h4, .cw-md h5, .cw-md h6 { margin: 12px 0 6px; font-weight: 700; line-height: 1.3; }
.cw-md h1 { font-size: 16px; } .cw-md h2 { font-size: 15px; } .cw-md h3 { font-size: 14px; }
.cw-md h4, .cw-md h5, .cw-md h6 { font-size: 13.5px; }
.cw-md ul, .cw-md ol { margin: 6px 0 8px; padding-left: 20px; }
.cw-md li { margin: 3px 0; }
.cw-md li::marker { color: #8a929c; }
.cw-md a { color: var(--brand); font-weight: 600; text-decoration: underline; }
.cw-md strong { font-weight: 700; }
.cw-md code { background: #e6e9ec; border-radius: 4px; padding: 1px 5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.cw-md pre { background: #1f2328; color: #e8eaed; border-radius: 9px; padding: 10px 12px; overflow-x: auto; margin: 8px 0; }
.cw-md pre code { background: none; padding: 0; color: inherit; font-size: 12px; }
.cw-md blockquote { margin: 8px 0; padding: 4px 12px; border-left: 3px solid var(--brand); background: #eef0f2; border-radius: 0 8px 8px 0; color: #4b535c; }

.cw-vcard { margin-top: 8px; width: 100%; border: 1px solid #e6e9ec; border-radius: 13px; overflow: hidden; background: #fff; }
.cw-poster { position: relative; width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #323a47, #171b22); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cw-play { width: 40px; height: 40px; border-radius: 50%; background: var(--brand); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
.cw-dur { position: absolute; right: 8px; bottom: 8px; background: rgba(0,0,0,.62); color: #fff; font-size: 10.5px; font-weight: 600; padding: 2px 6px; border-radius: 5px; }
.cw-vmeta { padding: 11px 13px 13px; }
.cw-vhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cw-vtitle { font-size: 13px; font-weight: 700; color: #1f2328; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cw-watch { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; background: var(--brand-soft); color: var(--brand-deep); border: none; font-size: 11.5px; font-weight: 700; padding: 5px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.cw-watch:hover { background: color-mix(in srgb, var(--brand) 18%, #fff); }
.cw-refs { margin-top: 11px; }
.cw-refs-label { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #a4abb3; margin-bottom: 7px; }
.cw-refs-list { display: flex; flex-wrap: wrap; gap: 6px; }
.cw-ref { display: inline-flex; align-items: center; gap: 5px; background: #f4f5f7; color: #4a5361; border: 1px solid #e6e9ec; font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; padding: 4px 9px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: background .12s, border-color .12s, color .12s; }
.cw-ref svg { opacity: .7; }
.cw-ref:hover { background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 32%, transparent); color: var(--brand-deep); }
.cw-ref:hover svg { opacity: 1; }

.cw-typing { display: flex; align-items: flex-end; gap: 8px; margin: 2px 0 10px; }
.cw-typing-bubble { background: #f3f5f6; border-radius: 14px 14px 14px 4px; padding: 12px 14px; display: flex; gap: 4px; }
.cw-typing-bubble span { width: 6px; height: 6px; border-radius: 50%; background: #9aa1a9; animation: cw-bounce 1.2s infinite; }
.cw-typing-bubble span:nth-child(2) { animation-delay: .18s; }
.cw-typing-bubble span:nth-child(3) { animation-delay: .36s; }

.cw-input { padding: 10px 12px 12px; border-top: 1px solid #eef0f2; }
.cw-doc-error { margin: 0 2px 8px; padding: 6px 10px; font-size: 12px; color: #b42318; background: #fef3f2; border: 1px solid #fecdca; border-radius: 8px; }
.cw-input-box { border: 1px solid #e2e4e7; border-radius: 14px; padding: 9px 10px 9px 13px; background: #fbfbfc; }
.cw-mode { display: inline-flex; align-items: center; gap: 6px; background: var(--brand-soft); color: var(--brand); font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; margin-bottom: 7px; }
.cw-mode-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brand); }
.cw-input-row { display: flex; align-items: flex-end; gap: 8px; }
.cw-input-row textarea { flex: 1; border: none; outline: none; background: transparent; resize: none; font-family: inherit; font-size: 13.5px; color: #1f2328; max-height: 120px; overflow-y: auto; line-height: 1.45; }
.cw-send { width: 34px; height: 34px; flex-shrink: 0; border: none; border-radius: 10px; background: var(--brand); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cw-send:disabled { background: #d3d7db; cursor: default; }
.cw-foot { text-align: center; font-size: 10.5px; color: #b6bcc3; margin-top: 8px; }

/* history */
.cw-hist-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 10px 15px; }
.cw-hist-head > span { font-size: 14px; font-weight: 700; }
.cw-newchat { display: inline-flex; align-items: center; gap: 6px; background: var(--brand); color: #fff; border: none; font-size: 12.5px; font-weight: 600; padding: 7px 13px; border-radius: 9px; cursor: pointer; font-family: inherit; }
.cw-hist { flex: 1; padding: 2px 8px 14px; }
.cw-hist-empty { text-align: center; color: #98a1ad; font-size: 12.5px; padding: 28px 16px; }
.cw-hist-item { display: flex; align-items: flex-start; gap: 11px; padding: 11px 12px; border-radius: 12px; cursor: pointer; }
.cw-hist-item:hover { background: #f5f6f7; }
.cw-hist-item.is-active { background: var(--brand-soft); box-shadow: inset 3px 0 0 var(--brand); }
.cw-hist-icon { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #eef1f4; color: #8a929c; }
.cw-hist-icon.is-active { background: linear-gradient(140deg, var(--brand), var(--brand-deep)); color: #fff; }
.cw-hist-body { min-width: 0; flex: 1; }
.cw-hist-row { display: flex; align-items: center; gap: 8px; }
.cw-hist-title { font-size: 13px; font-weight: 600; color: #1f2328; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cw-hist-time { font-size: 11px; color: #a4abb3; white-space: nowrap; flex-shrink: 0; margin-left: auto; }
.cw-hist-snip { font-size: 12px; color: #8a929c; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cw-hist-del { border: none; background: transparent; cursor: pointer; color: #c3c8cf; padding: 5px; border-radius: 7px; line-height: 0; flex-shrink: 0; }
.cw-hist-del:hover { background: #fdecea; color: #c0392b; }
.cw-hist-more { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 8px; font-size: 12px; color: #98a1ad; }
.cw-hist-spin { width: 13px; height: 13px; border: 2px solid #d6dae0; border-top-color: var(--brand); border-radius: 50%; animation: cw-spin 0.7s linear infinite; }
@keyframes cw-spin { to { transform: rotate(360deg); } }

/* player */
.cw-back { display: flex; align-items: center; gap: 7px; border: none; background: transparent; cursor: pointer; padding: 11px 15px; font-size: 12.5px; font-weight: 600; color: #5b6470; font-family: inherit; }
.cw-player { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 14px 6px; }
.cw-video { position: relative; width: 100%; aspect-ratio: 16/9; background: #161a20; border-radius: 12px; overflow: hidden; }
.cw-video-stripe { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, #1b2029, #1b2029 7px, #1e242e 7px, #1e242e 14px); }
.cw-video-stripe--lg { background: repeating-linear-gradient(45deg, #1b2029, #1b2029 10px, #1e242e 10px, #1e242e 20px); }

/* real <video> fills the poster frame in both the inline player and the overlay */
.cw-video-el { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #0f1319; cursor: pointer; }

/* grounding sources under an answer */
.cw-section-head { margin: 12px 2px 4px; font-size: 12.5px; font-weight: 700; color: var(--brand, #0f9e8c); letter-spacing: .01em; }
.cw-section-head:first-child { margin-top: 2px; }
.cw-docs { margin-top: 8px; border: 1px solid #e6e9ee; border-radius: 10px; padding: 8px 10px; background: #fbfcfd; }
.cw-docs-head { font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #98a1ad; margin-bottom: 5px; }
.cw-doc { display: flex; align-items: center; gap: 6px; width: 100%; font-size: 12px; color: #4a5361; padding: 5px 8px; margin: 1px 0; border: 1px solid transparent; border-radius: 8px; background: transparent; font-family: inherit; text-align: left; cursor: pointer; }
.cw-doc:hover { background: var(--brand-soft); border-color: color-mix(in srgb, var(--brand) 30%, transparent); color: var(--brand); }
.cw-doc-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cw-doc-pages { color: #98a1ad; flex-shrink: 0; }
.cw-doc-open { margin-left: auto; flex-shrink: 0; color: #98a1ad; }
.cw-doc:hover .cw-doc-open { color: var(--brand); }

.cw-bubble--err { background: #fff2f2; color: #b4232a; border: 1px solid #f6d4d6; }
.cw-bigplay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 54px; height: 54px; border-radius: 50%; border: none; background: var(--brand); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 22px rgba(0,0,0,.35); }
.cw-video-badge { position: absolute; left: 12px; top: 12px; font-size: 11.5px; color: #c7cdd4; font-weight: 500; background: rgba(0,0,0,.35); padding: 3px 9px; border-radius: 6px; max-width: 70%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cw-expand { position: absolute; right: 10px; top: 10px; width: 30px; height: 30px; border: none; border-radius: 8px; background: rgba(0,0,0,.5); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cw-controls { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.cw-time { font-family: ui-monospace, monospace; font-size: 11.5px; color: #5b6470; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.cw-time--dim { color: #a4abb3; }
.cw-time--light { color: #c7cdd4; font-size: 13px; }
.cw-time--muted { color: #6a7480; font-size: 13px; }
.cw-track { flex: 1; height: 5px; background: #e6e8ea; border-radius: 999px; cursor: pointer; position: relative; }
.cw-track--dark { height: 6px; background: #2a313c; }
.cw-track-fill { position: absolute; left: 0; top: 0; height: 100%; width: 0; background: var(--brand); border-radius: 999px; }
.cw-track-knob { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
/* highlight the segment the answer cited, on the full-video timeline */
.cw-track-cite { position: absolute; top: 0; height: 100%; background: rgba(255,255,255,.55); border-radius: 999px; pointer-events: none; }
.cw-track--dark .cw-track-cite { background: rgba(255,255,255,.28); }
.cw-ptitle { margin-top: 14px; font-size: 14px; font-weight: 700; }
.cw-psub { font-size: 12px; color: #9aa1a9; margin-top: 2px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cw-jumps { margin-top: 12px; }
.cw-jumps-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; color: #9aa1a9; margin-bottom: 7px; }
.cw-jumps-row { display: flex; flex-wrap: wrap; gap: 7px; }
.cw-jump { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--brand); background: var(--brand-soft); color: var(--brand); font-size: 12px; font-weight: 600; cursor: pointer; padding: 5px 11px; border-radius: 999px; font-family: inherit; font-variant-numeric: tabular-nums; }
.cw-jump:hover { background: var(--brand); color: #fff; }
/* In the dark fullscreen overlay: keep the chips light (layout is set in the overlay block). */
.cw-jumps--lg .cw-jump { background: rgba(255,255,255,.08); }

/* big-screen overlay — (almost) fullscreen: the card fills the viewport and the video pane
   grows to take all the space left by the header + controls (object-fit keeps its aspect). */
.cw-overlay { position: fixed; inset: 0; background: rgba(10,14,18,.9); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.cw-overlay-card { width: 96vw; height: 94vh; background: #0e1116; border-radius: 16px; overflow: hidden; box-shadow: 0 30px 90px rgba(0,0,0,.5); display: flex; flex-direction: column; }
.cw-overlay-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; flex-shrink: 0; }
.cw-overlay-title { color: #fff; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cw-overlay-x { border: none; background: rgba(255,255,255,.1); color: #fff; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cw-overlay-video { position: relative; width: 100%; flex: 1; min-height: 0; background: #161a20; }
.cw-bigplay--lg { width: 80px; height: 80px; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
.cw-controls--lg { padding: 16px 20px; gap: 14px; margin-top: 0; flex-shrink: 0; }
/* Reference-moment chips row in the overlay: pad it off the card edges so it never touches. */
.cw-jumps--lg { margin-top: 0; padding: 0 20px 18px; flex-shrink: 0; }

@keyframes cw-pulse { 0% { transform: scale(1); opacity: .55; } 70% { transform: scale(1.9); opacity: 0; } 100% { opacity: 0; } }
@keyframes cw-bounce { 0%,80%,100% { transform: translateY(0); opacity: .4; } 40% { transform: translateY(-4px); opacity: 1; } }
</style>
