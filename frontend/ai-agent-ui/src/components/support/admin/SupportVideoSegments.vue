<script setup lang="ts">
/**
 * SupportVideoSegments — per-video segment manager (global-admin).
 * Lists every transcript segment of one video and lets the admin delete an outdated one,
 * one at a time, after previewing the moment. Deletes hit the vector store only; the
 * video/transcript files are untouched (a re-ingest would rebuild every segment).
 */
import { ref, computed, watch, type Ref } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import { listSegments, deleteSegment, type Segment } from "@/api/videos.list";
import { useSegmentPreview } from "@/composables/useSegmentPreview";
import { useToast } from "@/composables/useToast";
import { fmtTime } from "@/utils/transcript";
import type { SupportVideo } from "@/data/mockVideos";

const props = defineProps<{ video: SupportVideo | null }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated", videoId: string, chunkCount: number): void;
}>();

const { showToast } = useToast();
const videoEl = ref<HTMLVideoElement | null>(null) as Ref<HTMLVideoElement | null>;
const { activeId, preview, onLoadedMeta, handleTimeUpdate, stop } = useSegmentPreview(videoEl);

const loading = ref(false);
const errored = ref(false);
const segments = ref<Segment[]>([]);
const videoUrl = ref<string | null>(null);
const title = ref<string | null>(null);

// Delete confirm (one segment at a time).
const pendingDelete = ref<Segment | null>(null);
const confirmOpen = ref(false);
const confirmBusy = ref(false);

const total = computed(() => segments.value.length);
const isLastSegment = computed(() => total.value === 1);

const confirmMessage = computed(() => {
  const base =
    "This removes the segment from the knowledge base — the assistant can no longer surface or cite it. " +
    "Re-ingesting or editing this video's transcript would restore all segments and overwrite this. This can't be undone.";
  if (isLastSegment.value)
    return (
      "This is the video's last segment. Deleting it leaves the video with no searchable content, " +
      "so it will no longer appear in any answer — consider deleting the whole video instead. " +
      base
    );
  return base;
});

function rangeLabel(s: Segment): string {
  const start = (s.startMs ?? 0) / 1000;
  const end = s.endMs != null ? s.endMs / 1000 : start;
  return end > start ? `${fmtTime(start)}–${fmtTime(end)}` : fmtTime(start);
}

// A short heading derived from the segment's own text (first few words) — segments have no
// stored title, so this gives each row a readable label hinting what it's about.
const SNIPPET_WORDS = 8;
function snippet(s: Segment): string {
  const text = (s.text || "").replace(/\s+/g, " ").trim();
  if (!text) return "Untitled segment";
  const words = text.split(" ");
  const head = words.slice(0, SNIPPET_WORDS).join(" ");
  return words.length > SNIPPET_WORDS ? `${head}…` : head;
}
function canPreview(s: Segment): boolean {
  return !!videoUrl.value && s.startMs != null;
}
function playSegment(s: Segment) {
  if (canPreview(s)) preview(s.startMs, s.endMs, s.id);
}

async function load(videoId: string) {
  loading.value = true;
  errored.value = false;
  try {
    const res = await listSegments(videoId);
    segments.value = res.segments;
    videoUrl.value = res.videoUrl;
    title.value = res.title;
  } catch {
    errored.value = true;
    showToast("Couldn't load this video's segments.", "error");
  } finally {
    loading.value = false;
  }
}

// Load whenever a video is opened; reset when closed.
watch(
  () => props.video,
  (v) => {
    stop();
    pendingDelete.value = null;
    confirmOpen.value = false;
    if (v?.videoId) {
      title.value = v.title;
      load(v.videoId);
    } else {
      segments.value = [];
      videoUrl.value = null;
    }
  },
  { immediate: true }
);

function askDelete(s: Segment) {
  pendingDelete.value = s;
  confirmOpen.value = true;
}

async function confirmDelete() {
  const seg = pendingDelete.value;
  const videoId = props.video?.videoId;
  if (!seg || !videoId) return;
  confirmBusy.value = true;
  try {
    const { chunkCount } = await deleteSegment(videoId, seg.id);
    segments.value = segments.value.filter((s) => s.id !== seg.id);
    if (activeId.value === seg.id) stop();
    emit("updated", videoId, chunkCount);
    showToast("Segment deleted.", "success");
    confirmOpen.value = false;
    pendingDelete.value = null;
  } catch (e: any) {
    if (e?.response?.status === 404) {
      // Already gone (e.g. deleted elsewhere) — drop it from the list quietly.
      segments.value = segments.value.filter((s) => s.id !== seg.id);
      emit("updated", videoId, Math.max(0, total.value));
      showToast("That segment was already removed.", "warning");
      confirmOpen.value = false;
      pendingDelete.value = null;
    } else {
      showToast("Couldn't delete the segment. Please try again.", "error");
    }
  } finally {
    confirmBusy.value = false;
  }
}

function close() {
  stop();
  emit("close");
}
</script>

<template>
  <div v-if="video" class="overlay" @click="close">
    <div class="modal" @click.stop>
      <header class="head">
        <div class="head__text">
          <div class="title">{{ title || video.title }}</div>
          <div class="sub">{{ total }} {{ total === 1 ? "segment" : "segments" }} · manage transcript segments</div>
        </div>
        <button class="x" @click="close" aria-label="Close">×</button>
      </header>

      <!-- prominent warning: deletes are index-only and a re-ingest restores everything -->
      <div class="warn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span>Deleting a segment removes it from the knowledge base only. It does <b>not</b> edit the video or transcript files — re-ingesting this video's transcript would restore every segment.</span>
      </div>

      <div class="body" :class="{ 'body--solo': !videoUrl }">
        <!-- preview pane -->
        <div v-if="videoUrl" class="vpane">
          <video
            ref="videoEl"
            :src="videoUrl"
            controls
            preload="metadata"
            class="preview-video"
            @timeupdate="handleTimeUpdate"
            @loadedmetadata="onLoadedMeta"
          />
          <div class="vhint">Press ▶ on a segment to preview that moment.</div>
        </div>

        <!-- segment list -->
        <div class="lpane">
          <template v-if="loading">
            <div v-for="n in 6" :key="n" class="seg seg--skel">
              <div class="skel" style="height:12px;width:70px" />
              <div class="skel" style="height:11px;width:90%" />
            </div>
          </template>

          <div v-else-if="errored" class="state">
            <p>Couldn't load segments.</p>
            <button class="btn-ghost" @click="video?.videoId && load(video.videoId)">Retry</button>
          </div>

          <div v-else-if="total === 0" class="state">
            <p>No segments indexed for this video yet.</p>
          </div>

          <template v-else>
            <div v-for="s in segments" :key="s.id" class="seg" :class="{ 'seg--playing': activeId === s.id }">
              <div class="seg__main">
                <div class="seg__meta">
                  <span class="seg__time">{{ rangeLabel(s) }}</span>
                  <button
                    v-if="canPreview(s)"
                    class="seg__play"
                    :title="activeId === s.id ? 'Playing' : 'Preview this moment'"
                    @click="playSegment(s)"
                  >
                    <svg v-if="activeId === s.id" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                    <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>
                    {{ activeId === s.id ? "Playing" : "Play" }}
                  </button>
                </div>
                <div class="seg__head">{{ snippet(s) }}</div>
                <div class="seg__text">{{ s.text || "(no transcript text)" }}</div>
              </div>
              <button class="seg__del" title="Delete this segment" @click="askDelete(s)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-model="confirmOpen"
    :busy="confirmBusy"
    :title="isLastSegment ? 'Delete the last segment?' : 'Delete this segment?'"
    :message="confirmMessage"
    confirm-label="Delete segment"
    @confirm="confirmDelete"
  />
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(18,22,27,0.5); display: flex; align-items: center; justify-content: center; z-index: 55; padding: 24px; }
.modal { background: #fff; width: min(1100px, 96vw); height: min(760px, 92vh); border-radius: 16px; box-shadow: 0 24px 70px rgba(15,20,25,0.35); overflow: hidden; display: flex; flex-direction: column; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--line-2); }
.head__text { min-width: 0; }
.title { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 12.5px; color: #9aa1a9; margin-top: 2px; }
.x { border: none; background: transparent; color: #9aa1a9; font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px; }

.warn { display: flex; gap: 10px; align-items: flex-start; padding: 11px 20px; background: #fdf4e3; color: #8a5a06; border-bottom: 1px solid #f2e3c4; font-size: 12.5px; line-height: 1.5; }
.warn svg { flex-shrink: 0; margin-top: 1px; }
.warn b { color: #6f4805; }

.body { display: flex; min-height: 0; flex: 1; }
.vpane { flex: 1.3; min-width: 0; padding: 18px; display: flex; flex-direction: column; gap: 10px; background: #0e1116; }
.body--solo .lpane { border-left: none; }
.preview-video { width: 100%; flex: 1; min-height: 0; border-radius: 12px; background: #000; display: block; object-fit: contain; }
.vhint { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .5px; color: #6a7480; text-align: center; }

.lpane { flex: 1; min-width: 360px; overflow-y: auto; overflow-x: hidden; padding: 8px; border-left: 1px solid var(--line-2); }

.seg { display: flex; gap: 12px; align-items: flex-start; padding: 12px 12px; border-radius: 10px; margin: 2px 0; }
.seg:hover { background: #f6f7f8; }
.seg--playing { background: #fff4ec; box-shadow: inset 3px 0 0 var(--accent); }
.seg__main { flex: 1; min-width: 0; }
.seg__meta { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.seg__time { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #5b6470; }
.seg__head { font-size: 13.5px; font-weight: 700; color: var(--ink); margin-bottom: 3px; line-height: 1.4; word-break: break-word; }
.seg__play { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #e2e4e7; background: #fff; color: #4a5560; font-size: 11.5px; font-weight: 600; border-radius: 7px; padding: 3px 9px; cursor: pointer; font-family: inherit; }
.seg__play:hover { background: #f0f1f2; }
.seg--playing .seg__play { color: var(--accent); border-color: var(--accent); }
.seg__text { font-size: 13.5px; line-height: 1.55; color: #2b3038; word-break: break-word; }
.seg__del { flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: #b0392b; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.seg__del:hover { background: #fdecea; border-color: #f6cfca; }

.state { text-align: center; padding: 50px 16px; color: #9aa1a9; font-size: 13.5px; display: flex; flex-direction: column; gap: 14px; align-items: center; }
.btn-ghost { border: 1px solid #e0e2e5; background: #fff; color: #3a4048; padding: 8px 18px; border-radius: var(--radius-ctrl); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

.skel { background: linear-gradient(90deg, #eef0f2 25%, #f6f7f8 37%, #eef0f2 63%); background-size: 400% 100%; animation: sa-shimmer 1.4s ease infinite; border-radius: 6px; }
.seg--skel { flex-direction: column; gap: 8px; align-items: stretch; }
@keyframes sa-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
</style>
