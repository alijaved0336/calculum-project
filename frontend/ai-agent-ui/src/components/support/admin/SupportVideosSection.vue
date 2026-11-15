<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import SetupSectionCard from "./SetupSectionCard.vue";
import VideoUploadModal from "./VideoUploadModal.vue";
import SupportVideoPlayer from "./SupportVideoPlayer.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import SupportVideoSegments from "./SupportVideoSegments.vue";
import type { SupportVideo } from "@/data/mockVideos";
import { fetchVideos, deleteVideo, getPlayback } from "@/api/videos.list";
import { ingestionApi } from "@/api/ingestion.service";
import { buildVtt } from "@/utils/transcript";

const emit = defineEmits<{ (e: "count", n: number): void }>();

const PER_PAGE = 8;
// Search hits the server (GET /videos?q=), so wait until typing settles before firing.
const SEARCH_DEBOUNCE_MS = 500;

const videos = ref<SupportVideo[]>([]);
const total = ref(0);
const loading = ref(true);
const search = ref("");
const page = ref(1);

// One modal, two modes: create (Upload Video) and edit (row → Edit).
const modalOpen = ref(false);
const modalMode = ref<"create" | "edit">("create");
const editing = ref<SupportVideo | null>(null);
const playing = ref<SupportVideo | null>(null);
// Per-video segment manager (global-admin): open from the row menu.
const managing = ref<SupportVideo | null>(null);

// menu
const openMenuId = ref<number | null>(null);
const menuPos = ref({ x: 0, y: 0 });

let searchTimer: ReturnType<typeof setTimeout> | null = null;

// Server-side list from the Support backend (:8002): search + pagination are done by the API.
async function load(quiet = false) {
  if (!quiet) loading.value = true;
  try {
    const res = await fetchVideos({ q: search.value, page: page.value, pageSize: PER_PAGE });
    videos.value = res.items;
    total.value = res.total;
    emit("count", res.total);
  } finally {
    if (!quiet) loading.value = false;
    schedulePoll();
    watchProcessingRows();
  }
}
onMounted(load);

// The list owns the Processing → Indexed transition: while any row is processing,
// quietly re-fetch until none remain (also resumes after a page reload). This is the
// reliable backstop; the per-row SSE below just makes the stage update in real time.
let pollTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePoll() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  if (videos.value.some((v) => v.status === "processing")) {
    pollTimer = setTimeout(() => load(true), 4000);
  }
}
onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer);
  // Drop any pending debounced search so it can't fire load() after unmount.
  if (searchTimer) clearTimeout(searchTimer);
  for (const c of controllers.values()) c.abort();
});

// Per-row SSE: for each processing row, stream the live sub-stage (Uploading →
// Compressing → Indexing → Indexed). One stream per processing video (fine at admin scale);
// deduped, aborted after a cap so a stuck row can't linger, reconciled via load().
const watched = new Set<string>();
const controllers = new Map<string, AbortController>();
const WATCH_TIMEOUT_MS = 6 * 60 * 1000;
function applyRow(videoId: string, patch: Partial<SupportVideo>) {
  const row = videos.value.find((x) => x.videoId === videoId);
  if (row) Object.assign(row, patch);
}
const VIDEO_STAGE: Record<string, string> = {
  awaiting_upload: "Uploading", processing: "Compressing", compressing: "Compressing",
  // 'ready' = the video is already stored; the transcript is what's indexing now.
  uploading: "Processing", uploaded: "Processing", ready: "Indexing",
};
function watchProcessingRows() {
  for (const v of videos.value) {
    if (v.status === "processing" && v.videoId && !watched.has(v.videoId)) {
      watched.add(v.videoId);
      void watchVideoRow(v.videoId);
    }
  }
}
async function watchVideoRow(videoId: string) {
  const ctrl = new AbortController();
  controllers.set(videoId, ctrl);
  const cap = setTimeout(() => ctrl.abort(), WATCH_TIMEOUT_MS);
  try {
    await ingestionApi.trackVideo(videoId, (ev) => {
      if (ev.status === "failed") applyRow(videoId, { status: "failed", stage: undefined });
      else applyRow(videoId, { stage: VIDEO_STAGE[ev.status] ?? "Processing" });
    }, ctrl.signal);
    // video stored → observe transcript indexing (skip if the video failed)
    if (videos.value.find((x) => x.videoId === videoId)?.status !== "failed") {
      applyRow(videoId, { stage: "Indexing" });
      await ingestionApi.trackTranscript(videoId, (ev) => {
        if (ev.status === "upserted" || ev.status === "empty") applyRow(videoId, { status: "indexed", stage: undefined });
        else if (ev.status === "failed") applyRow(videoId, { status: "failed", stage: undefined });
        else applyRow(videoId, { stage: "Indexing" });
      }, ctrl.signal);
    }
  } catch { /* ignore (incl. AbortError) — the poller reconciles */ } finally {
    clearTimeout(cap);
    controllers.delete(videoId);
    // Keep the id in `watched` so a stuck row is never re-watched (avoids a reconnect
    // loop). The poller handles any remaining status from here.
    load(true); // reconcile with DB truth once
  }
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)));
const pageItems = computed(() => videos.value);

const showEmptyLibrary = computed(() => !loading.value && total.value === 0 && !search.value.trim());
const showNoResults = computed(
  () => !loading.value && videos.value.length === 0 && !!search.value.trim()
);
const showTable = computed(() => !loading.value && videos.value.length > 0);

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    load();
  }, SEARCH_DEBOUNCE_MS);
}
function prevPage() { if (page.value > 1) { page.value--; load(); } }
function nextPage() { if (page.value < pageCount.value) { page.value++; load(); } }

function statusMeta(v: SupportVideo) {
  if (v.status === "processing") return { label: v.stage || "Processing", cls: "warn", spin: true };
  if (v.status === "failed") return { label: "Failed", cls: "err", dot: true };
  return { label: "Indexed", cls: "ok", dot: true };
}

// Click an indexed row → fetch a signed video URL + transcript cues from the
// backend (GET /videos/{id}/play) and open the player.
const playerLoadingId = ref<string | null>(null);
async function openPlayer(v: SupportVideo) {
  if (v.status !== "indexed" || !v.videoId || playerLoadingId.value) return;
  playerLoadingId.value = v.videoId;
  try {
    const pb = await getPlayback(v.videoId);
    playing.value = {
      ...v,
      url: pb.videoUrl,
      durationSec: pb.durationMs ? pb.durationMs / 1000 : v.durationSec,
      cues: pb.cues,
    };
  } catch {
    /* keep silent; row stays as-is if playback can't be fetched */
  } finally {
    playerLoadingId.value = null;
  }
}

// row actions menu
function toggleMenu(id: number, e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  openMenuId.value = openMenuId.value === id ? null : id;
  menuPos.value = { x: r.right - 200, y: r.bottom + 6 };
}
function closeMenu() { openMenuId.value = null; }

// Failure-reason tooltip: teleported to <body> (so the card's overflow can't clip it) and
// anchored to the hovered info icon's top-right, opening upward.
const errTip = ref<{ text: string; right: number; bottom: number } | null>(null);
function showErrTip(e: Event, text: string | null | undefined) {
  if (!text) return;
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  errTip.value = { text, right: window.innerWidth - r.right, bottom: window.innerHeight - r.top + 10 };
}
function hideErrTip() { errTip.value = null; }

// Download the video's transcript as a .vtt file. Cues come from GET /videos/{id}/play
// (the same source the player uses); we serialise them client-side and save the blob.
const downloadingId = ref<number | null>(null);
async function downloadTranscript(id: number) {
  closeMenu();
  const v = videos.value.find((x) => x.id === id);
  if (!v?.videoId || downloadingId.value) return;
  downloadingId.value = id;
  try {
    const pb = await getPlayback(v.videoId);
    if (!pb.cues.length) return; // nothing indexed yet — silently no-op
    const blob = new Blob([buildVtt(pb.cues)], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (v.title || v.file || "transcript").replace(/\.[^.]+$/, "") + ".vtt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* keep silent; the row is unchanged if the transcript can't be fetched */
  } finally {
    downloadingId.value = null;
  }
}

function openCreate() {
  modalMode.value = "create";
  editing.value = null;
  modalOpen.value = true;
}

// Open the edit modal for a row (title / transcript / video file).
function openEdit(id: number) {
  closeMenu();
  const v = videos.value.find((x) => x.id === id);
  if (!v?.videoId) return;
  editing.value = v;
  modalMode.value = "edit";
  modalOpen.value = true;
}

// After an edit: reload the list. When files changed, the row re-indexes — drop it from
// `watched` so load() re-attaches the live SSE watcher for the fresh Processing run.
async function onVideoUpdated(p: { videoId: string; reprocessing: boolean }) {
  if (p.reprocessing) watched.delete(p.videoId);
  await load(p.reprocessing ? true : false);
}

// Open the per-video segment manager (only indexed videos have chunks to manage).
function openSegments(id: number) {
  closeMenu();
  const v = videos.value.find((x) => x.id === id);
  if (!v?.videoId || v.status !== "indexed") return;
  managing.value = v;
}

// A segment was deleted — patch the row's chunk count in place (no full reload / flicker).
function onSegmentsUpdated(videoId: string, chunkCount: number) {
  const row = videos.value.find((x) => x.videoId === videoId);
  if (row) row.chunks = chunkCount;
}

// Delete flow: confirm first, then DELETE /videos/{id} (cascades to GCS + vector DB on the
// backend), keeping the dialog in a loading state until the row is gone and the list reloaded.
const confirmOpen = ref(false);
const confirmBusy = ref(false);
const pendingDelete = ref<SupportVideo | null>(null);

function askRemove(id: number) {
  closeMenu();
  const v = videos.value.find((x) => x.id === id);
  if (!v?.videoId) return;
  pendingDelete.value = v;
  confirmOpen.value = true;
}

async function confirmRemove() {
  const v = pendingDelete.value;
  if (!v?.videoId) return;
  confirmBusy.value = true;
  try {
    await deleteVideo(v.videoId);
    await load();
    confirmOpen.value = false;
    pendingDelete.value = null;
  } finally {
    confirmBusy.value = false;
  }
}

// The modal closes as soon as the video upload is ACCEPTED. Show the new Processing row.
// - chained (through-API): the SERVER indexes the transcript after storing the video, so
//   we do nothing but let the poller flip the row to Indexed.
// - not chained (signed direct-to-GCS): index the transcript off-modal here.
async function onAccepted(p: { videoId: string; transcriptFile: File; title: string; cueCount: number; chained: boolean }) {
  page.value = 1;
  search.value = "";
  await load();
  if (!p.chained) runVideoPipeline(p);
}

async function runVideoPipeline(p: { videoId: string; transcriptFile: File; title: string; cueCount: number }) {
  try {
    // Wait until the video is stored (compress → store), so the transcript ingests
    // against the real gcs_object + duration.
    const final = await ingestionApi.trackVideo(p.videoId);
    if (final?.status !== "failed") {
      await ingestionApi.ingestTranscript(p.transcriptFile, p.videoId, p.title, { cueCount: p.cueCount });
    }
  } catch {
    /* ignore — the list poller reflects whatever status the server reports */
  } finally {
    load(true);
  }
}
</script>

<template>
  <SetupSectionCard
    title="Support Videos"
    description="Upload and manage support videos that power the Support Assistant. Each video is compressed, transcript-aligned, chunked and indexed so answers can link to the exact moment."
  >
    <template #icon>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></svg>
    </template>

    <!-- toolbar -->
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="count">{{ total }} {{ total === 1 ? "video" : "videos" }}</span>
        <div class="searchbox">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a4abb3" stroke-width="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" stroke-linecap="round" /></svg>
          <input v-model="search" @input="onSearch" placeholder="Search by title…" />
        </div>
      </div>
      <button class="btn-primary" @click="openCreate()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V5M8 9l4-4 4 4M5 19h14" /></svg>
        Upload Video
      </button>
    </div>

    <!-- header row -->
    <div class="thead">
      <div>Title</div><div>Chunks</div><div>Updated At</div><div>Transcript</div><div>Status</div>
    </div>

    <!-- loading skeletons -->
    <template v-if="loading">
      <div v-for="n in 6" :key="n" class="trow trow--skel">
        <div class="cell-title"><div class="skel poster-skel" /><div style="flex:1;max-width:230px"><div class="skel" style="height:11px;width:70%;margin-bottom:7px" /><div class="skel" style="height:9px;width:45%" /></div></div>
        <div class="skel" style="height:11px;width:28px" />
        <div class="skel" style="height:11px;width:82px" />
        <div class="skel" style="height:30px;width:30px;border-radius:8px" />
        <div class="skel" style="height:22px;width:96px;border-radius:999px" />
      </div>
    </template>

    <!-- empty library -->
    <div v-else-if="showEmptyLibrary" class="empty">
      <div class="empty__icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></svg>
      </div>
      <div class="empty__title">No support videos yet</div>
      <div class="empty__sub">Upload your first video and its transcript to build the assistant's knowledge base.</div>
      <button class="btn-primary" @click="openCreate()">Upload Video</button>
    </div>

    <!-- no search results -->
    <div v-else-if="showNoResults" class="empty">
      <div class="empty__icon empty__icon--muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a4abb3" stroke-width="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" stroke-linecap="round" /></svg>
      </div>
      <div class="empty__title">No videos match “{{ search }}”</div>
      <div class="empty__sub">Try a different title or clear the search.</div>
    </div>

    <!-- table -->
    <template v-else-if="showTable">
      <div
        v-for="v in pageItems"
        :key="v.id"
        class="trow"
        :class="{ 'is-clickable': v.status === 'indexed', 'is-loading': playerLoadingId === v.videoId, ['tint-' + v.status]: v.status !== 'indexed' }"
        @click="openPlayer(v)"
      >
        <div class="cell-title">
          <div class="poster" :class="{ 'is-dim': v.status !== 'indexed' }">
            <div class="poster__stripe" />
            <div v-if="playerLoadingId === v.videoId" class="poster__loading"><span class="poster__spin" /></div>
            <div v-else class="poster__play"><svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M7 5v14l12-7z" /></svg></div>
            <span class="poster__dur">{{ v.duration }}</span>
          </div>
          <div class="cell-title__text">
            <div class="ttl">{{ v.title }}</div>
            <div class="sub">{{ v.file }}</div>
          </div>
        </div>

        <div class="muted">{{ v.chunks === 0 ? "—" : v.chunks }}</div>
        <div class="muted">{{ v.date }}</div>

        <!-- transcript download -->
        <div class="cell-tx">
          <button
            class="tx-btn"
            title="Download transcript (.vtt)"
            :disabled="v.status !== 'indexed' || downloadingId === v.id"
            @click.stop="downloadTranscript(v.id)"
          >
            <svg v-if="downloadingId !== v.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4" /><path d="M5 21h14" /></svg>
            <span v-else class="tx-spin" />
          </button>
        </div>

        <!-- status -->
        <div class="cell-status">
          <div class="status-left">
            <span class="pill" :class="'pill--' + statusMeta(v).cls">
              <span v-if="statusMeta(v).spin" class="pill__spin" />
              <span v-else class="pill__dot" />
              {{ statusMeta(v).label }}
            </span>
            <!-- failure reason: hover the info icon to read why it failed -->
            <span v-if="v.status === 'failed' && v.error" class="err-info" tabindex="0"
                  aria-label="Failure reason" @click.stop
                  @mouseenter="showErrTip($event, v.error)" @mouseleave="hideErrTip"
                  @focus="showErrTip($event, v.error)" @blur="hideErrTip">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </span>
          </div>
          <button class="kebab" @click.stop="toggleMenu(v.id, $event)" aria-label="Row actions">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
          </button>
        </div>
      </div>

      <!-- pagination -->
      <div v-if="pageCount > 1" class="pager">
        <button class="btn-page" :disabled="page <= 1" @click="prevPage">‹ Prev</button>
        <span class="pager__label">Page {{ page }} of {{ pageCount }}</span>
        <button class="btn-page" :disabled="page >= pageCount" @click="nextPage">Next ›</button>
      </div>
    </template>
  </SetupSectionCard>

  <!-- row actions menu -->
  <template v-if="openMenuId != null">
    <div class="menu-overlay" @click="closeMenu" />
    <div class="menu" :style="{ left: menuPos.x + 'px', top: menuPos.y + 'px' }">
      <button class="menu__item" @click="openEdit(openMenuId)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b6470" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
        Edit
      </button>
      <button class="menu__item" @click="openSegments(openMenuId)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b6470" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Manage segments
      </button>
      <button class="menu__item menu__item--danger" @click="askRemove(openMenuId)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
        Remove from list
      </button>
    </div>
  </template>

  <!-- failure-reason tooltip (teleported so the card's overflow can't clip it) -->
  <Teleport to="body">
    <div v-if="errTip" class="vid-err-tip" :style="{ right: errTip.right + 'px', bottom: errTip.bottom + 'px' }">
      {{ errTip.text }}
    </div>
  </Teleport>

  <VideoUploadModal v-model="modalOpen" :mode="modalMode" :video="editing" @accepted="onAccepted" @updated="onVideoUpdated" />
  <SupportVideoPlayer :video="playing" @close="playing = null" />
  <SupportVideoSegments :video="managing" @close="managing = null" @updated="onSegmentsUpdated" />
  <ConfirmDialog
    v-model="confirmOpen"
    :busy="confirmBusy"
    title="Delete this video?"
    :message="pendingDelete ? `“${pendingDelete.title}” and its transcript will be permanently removed from storage and the knowledge base. This can’t be undone.` : ''"
    confirm-label="Delete video"
    @confirm="confirmRemove"
  />
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 0 26px 8px; }
.toolbar__left { display: flex; align-items: center; gap: 16px; }
.count { font-size: 13.5px; font-weight: 600; white-space: nowrap; }
.searchbox { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e4e7; border-radius: var(--radius-ctrl); padding: 8px 12px; width: 280px; background: #fbfbfc; }
.searchbox input { border: none; outline: none; background: transparent; font-size: 13.5px; font-family: inherit; width: 100%; color: var(--ink); }

.btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: #fff; border: none; padding: 10px 18px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }

.thead, .trow {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 100px 160px 110px 170px;
  align-items: center;
}
.thead { padding: 12px 26px; border-top: 1px solid var(--line-2); border-bottom: 1px solid var(--line-2); font-size: 11px; font-weight: 600; letter-spacing: 0.6px; color: #9aa1a9; text-transform: uppercase; }
.trow { padding: 13px 26px; border-bottom: 1px solid #f2f3f5; transition: background 0.12s; }
.trow.is-clickable { cursor: pointer; }
.trow.is-clickable:hover { background: #faf9f7; box-shadow: inset 3px 0 0 var(--accent); }
.trow.is-loading { cursor: wait; background: #faf9f7; }
.trow.tint-processing { background: #fffaf3; }
.trow.tint-failed { background: #fef7f6; }
.muted { color: var(--muted); font-size: 13px; }

.cell-title { display: flex; align-items: center; gap: 14px; min-width: 0; }
.cell-title__text { min-width: 0; }
.ttl { font-weight: 600; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { color: #9aa1a9; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.poster { position: relative; width: 82px; height: 47px; border-radius: 9px; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #323a47 0%, #171b22 100%); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06); }
.poster.is-dim { opacity: 0.7; }
.poster__stripe { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.035) 6px, rgba(255,255,255,0.035) 12px); }
.poster__play { position: absolute; inset: 0; margin: auto; width: 24px; height: 24px; border-radius: 50%; background: rgba(255,106,0,0.92); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
.poster__loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); }
.poster__spin { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: sa-spin 0.7s linear infinite; }
.poster__dur { position: absolute; right: 4px; bottom: 4px; background: rgba(0,0,0,0.62); color: #fff; font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; font-variant-numeric: tabular-nums; }

.tx-actions { display: flex; gap: 6px; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #e2e4e7; background: #fff; border-radius: 8px; cursor: pointer; color: var(--muted); }
.icon-btn:hover { background: var(--accent-soft); border-color: var(--accent-ring); color: var(--accent); }

.cell-status { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
.status-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.err-info { display: inline-flex; align-items: center; color: var(--err); cursor: help; outline: none; }
.err-info:hover, .err-info:focus-visible { opacity: 0.7; }
.vid-err-tip {
  position: fixed; z-index: 4000; max-width: 340px;
  background: #262b33; color: #fff; font-size: 12.5px; line-height: 1.5;
  padding: 10px 13px; border-radius: 11px; box-shadow: 0 14px 40px rgba(15, 25, 35, 0.32);
  pointer-events: none; animation: vet-in 0.12s ease-out;
}
.vid-err-tip::after {
  content: ""; position: absolute; bottom: -5px; right: 13px; width: 11px; height: 11px;
  background: inherit; transform: rotate(45deg); border-bottom-right-radius: 3px;
}
@keyframes vet-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.pill { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; padding: 5px 12px 5px 10px; border-radius: 999px; white-space: nowrap; }
.pill--ok { background: var(--ok-bg); color: var(--ok); box-shadow: inset 0 0 0 1px rgba(26,127,60,0.14); }
.pill--warn { background: var(--warn-bg); color: var(--warn); box-shadow: inset 0 0 0 1px rgba(179,105,10,0.14); }
.pill--err { background: var(--err-bg); color: var(--err); box-shadow: inset 0 0 0 1px rgba(192,57,43,0.14); }
.pill__dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pill__spin { display: inline-block; width: 11px; height: 11px; border: 2px solid #f0cba0; border-top-color: var(--warn); border-radius: 50%; animation: sa-spin 0.7s linear infinite; }
.btn-mini { border: 1px solid #e2e4e7; background: #fff; color: #3a4048; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 7px; cursor: pointer; font-family: inherit; }
.kebab { border: none; background: transparent; cursor: pointer; padding: 4px 6px; border-radius: 7px; color: #9aa1a9; line-height: 0; }
.kebab:hover { background: #f2f3f5; color: #3a4048; }
.cell-tx { display: flex; }
.tx-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #e2e4e7; background: #fff; color: #5b6470; border-radius: 8px; cursor: pointer; }
.tx-btn:hover:not(:disabled) { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-ring, #ffcfa8); }
.tx-btn:disabled { cursor: default; opacity: 0.45; }
.tx-spin { width: 13px; height: 13px; border: 2px solid #e2e4e7; border-top-color: var(--accent); border-radius: 50%; animation: sa-spin 0.7s linear infinite; }

.pager { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 16px 26px; }
.pager__label { font-size: 13px; color: var(--muted); padding: 0 6px; }
.btn-page { border: 1px solid #e2e4e7; background: #fff; color: #3a4048; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; }
.btn-page:disabled { color: #c3c8cf; cursor: default; }

.empty { padding: 60px 26px; text-align: center; }
.empty__icon { width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 14px; background: var(--accent-soft); display: flex; align-items: center; justify-content: center; }
.empty__icon--muted { width: 48px; height: 48px; border-radius: 12px; background: #f2f3f5; }
.empty__title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.empty__sub { font-size: 13.5px; color: var(--muted); margin-bottom: 20px; }

.trow--skel { padding: 15px 26px; }
.skel { background: #eef0f2; background-image: linear-gradient(90deg, #eef0f2 0px, #f6f7f8 220px, #eef0f2 440px); background-size: 900px 100%; animation: sa-shimmer 1.3s linear infinite; border-radius: 6px; }
.poster-skel { width: 82px; height: 47px; border-radius: 9px; }

.menu-overlay { position: fixed; inset: 0; z-index: 55; }
.menu { position: fixed; width: 200px; background: #fff; border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 12px 30px rgba(15,20,25,0.16); padding: 5px; z-index: 60; }
.menu__item { display: flex; align-items: center; gap: 10px; width: 100%; border: none; background: transparent; padding: 9px 11px; border-radius: 7px; font-size: 13px; font-weight: 500; color: #2b3038; cursor: pointer; font-family: inherit; text-align: left; white-space: nowrap; }
.menu__item svg { flex-shrink: 0; }
.menu__item:hover { background: #f5f6f7; }
.menu__item--danger { color: var(--err); }
.menu__item--danger:hover { background: var(--err-bg); }
</style>
