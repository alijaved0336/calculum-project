<script setup lang="ts">
/**
 * VideoUploadModal — create OR edit a support video (one component, two modes).
 *
 *  - mode="create" (default): title + video + transcript are all required; submits via
 *    ingestionApi.postVideo and emits `accepted`.
 *  - mode="edit": pass the `video` row. Title is prefilled and the existing video + transcript
 *    load into the preview; the video/transcript are OPTIONAL (kept unless replaced). Submits
 *    only what changed via ingestionApi.updateVideo and emits `updated`.
 *
 * Left = form, right = live preview (existing media, or the newly-picked files as you swap them).
 */
import { reactive, computed, watch, ref } from "vue";
import { parseTranscript, fmtTime, fmtSize, type Cue } from "@/utils/transcript";
import { ingestionApi } from "@/api/ingestion.service";
import { getPlayback } from "@/api/videos.list";
import type { SupportVideo } from "@/data/mockVideos";

const props = withDefaults(defineProps<{
  modelValue: boolean;
  mode?: "create" | "edit";
  video?: SupportVideo | null;
}>(), { mode: "create", video: null });

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "accepted", p: { videoId: string; transcriptFile: File; title: string; cueCount: number; chained: boolean }): void;
  (e: "updated", p: { videoId: string; reprocessing: boolean }): void;
}>();

const isEdit = computed(() => props.mode === "edit");

type Phase = "idle" | "uploading" | "processing" | "done";

const s = reactive({
  title: "",
  videoFile: null as File | null,
  videoName: "",
  videoUrl: "",          // object URL of a newly-picked video
  videoSize: 0,
  videoDuration: 0,
  transcriptFile: null as File | null,
  transcriptName: "",
  transcriptSize: 0,
  cues: [] as Cue[],     // cues of a newly-picked transcript
  errors: {} as Record<string, string | null>,
  phase: "idle" as Phase,
  progress: 0,          // byte-upload % for the video
  stage: "",            // human label driven by the backend SSE status
  dragV: false,
  dragT: false,
});

// Existing media (edit mode): signed video URL + transcript cues already indexed.
const ex = reactive({ url: "", cues: [] as Cue[], durationSec: 0, loading: false });

function reset() {
  if (s.videoUrl) URL.revokeObjectURL(s.videoUrl);
  Object.assign(s, {
    title: isEdit.value ? (props.video?.title ?? "") : "",
    videoFile: null, videoName: "", videoUrl: "", videoSize: 0, videoDuration: 0,
    transcriptFile: null, transcriptName: "", transcriptSize: 0, cues: [], errors: {}, phase: "idle", progress: 0,
    stage: "", dragV: false, dragT: false,
  });
  Object.assign(ex, { url: "", cues: [], durationSec: 0, loading: false });
}

// Pull the current video + transcript so the preview shows what's already there (edit only).
async function loadExisting() {
  if (!isEdit.value || !props.video?.videoId || props.video.status !== "indexed") return;
  ex.loading = true;
  try {
    const pb = await getPlayback(props.video.videoId);
    ex.url = pb.videoUrl;
    ex.cues = pb.cues ?? [];
    ex.durationSec = pb.durationMs ? pb.durationMs / 1000 : (props.video.durationSec ?? 0);
  } catch {
    /* keep silent — a signing/network hiccup just means no live preview */
  } finally {
    ex.loading = false;
  }
}

watch(() => props.modelValue, (open) => { if (open) { reset(); void loadExisting(); } });

// Overlay click + Cancel: blocked mid-submit (see `uploading` computed below).
function close() {
  if (s.phase === "uploading" || s.phase === "processing") return;
  emit("update:modelValue", false);
}
// The × button always closes, even mid-upload (upload continues in the background).
function forceClose() {
  emit("update:modelValue", false);
}

/* ---- video ---- */
function handleVideoFile(f: File) {
  if (!/\.mp4$/i.test(f.name) && f.type !== "video/mp4") { s.errors.video = "Video must be an .mp4 file."; return; }
  if (f.size > 5 * 1024 * 1024 * 1024) { s.errors.video = "Video exceeds the 5 GB limit."; return; }
  s.errors.video = null;
  if (s.videoUrl) URL.revokeObjectURL(s.videoUrl);
  s.videoFile = f;
  s.videoUrl = URL.createObjectURL(f);
  s.videoName = f.name;
  s.videoSize = f.size;
  s.videoDuration = 0;
}
function onPickVideo(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) handleVideoFile(f);
  (e.target as HTMLInputElement).value = "";
}
function onDropVideo(e: DragEvent) {
  e.preventDefault();
  s.dragV = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) handleVideoFile(f);
}
function onVideoMeta(e: Event) {
  const d = (e.target as HTMLVideoElement).duration;
  if (d && isFinite(d) && s.videoFile) s.videoDuration = d;
}
function removeVideo() {
  if (s.videoUrl) URL.revokeObjectURL(s.videoUrl);
  s.videoFile = null; s.videoUrl = ""; s.videoName = ""; s.videoSize = 0; s.videoDuration = 0; s.errors.video = null;
}

/* ---- transcript ---- */
function handleTranscriptFile(f: File) {
  if (!/\.(vtt|srt|json)$/i.test(f.name)) { s.errors.transcript = "Transcript must be .vtt, .srt or .json."; return; }
  const reader = new FileReader();
  reader.onload = () => {
    let cues: Cue[] = [];
    try { cues = parseTranscript(f.name, String(reader.result)); } catch { cues = []; }
    s.cues = cues;
    s.transcriptFile = f;
    s.transcriptName = f.name;
    s.transcriptSize = f.size;
    s.errors.transcript = cues.length ? null : "Could not read any cues from this file.";
  };
  reader.readAsText(f);
}
function onPickTranscript(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) handleTranscriptFile(f);
  (e.target as HTMLInputElement).value = "";
}
function onDropTranscript(e: DragEvent) {
  e.preventDefault();
  s.dragT = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) handleTranscriptFile(f);
}
function removeTranscript() {
  s.transcriptFile = null; s.transcriptName = ""; s.transcriptSize = 0; s.cues = []; s.errors.transcript = null;
}

/* ---- derived ---- */
// Preview shows the newly-picked file if there is one, otherwise the existing media.
const previewUrl = computed(() => s.videoUrl || (isEdit.value ? ex.url : ""));
const effectiveCues = computed<Cue[]>(() => (s.cues.length ? s.cues : (isEdit.value ? ex.cues : [])));
const previewCues = computed(() => effectiveCues.value.slice(0, 80));
const videoMeta = computed(() => {
  if (s.videoFile) return [fmtSize(s.videoSize), s.videoDuration ? fmtTime(s.videoDuration) : ""].filter(Boolean).join(" · ");
  if (isEdit.value && ex.durationSec) return fmtTime(ex.durationSec);
  return "";
});
const transcriptMeta = computed(() =>
  [fmtSize(s.transcriptSize), s.cues.length ? s.cues.length + " cues" : ""].filter(Boolean).join(" · ")
);
const uploading = computed(() => s.phase === "uploading" || s.phase === "processing");
const hasPreview = computed(() => !!previewUrl.value || effectiveCues.value.length > 0);

// Guard against pairing a video with a transcript it doesn't fit — e.g. replacing only
// the video with a shorter clip while keeping a longer transcript. Compares the effective
// video duration (the newly-picked video's measured length, else the existing one) against
// how far the effective transcript runs (its last cue). Tolerance covers trailing silence.
const TRANSCRIPT_FIT_TOLERANCE_SEC = 2;
const effectiveVideoDurationSec = computed(() =>
  s.videoFile ? s.videoDuration : (isEdit.value ? ex.durationSec : 0),
);
const transcriptEndSec = computed(() =>
  effectiveCues.value.length ? Math.max(...effectiveCues.value.map((c) => c.t)) : 0,
);
const durationMismatch = computed<string | null>(() => {
  const vd = effectiveVideoDurationSec.value;
  const te = transcriptEndSec.value;
  if (!vd || !te) return null; // duration not known yet, or no cues → nothing to check
  if (te > vd + TRANSCRIPT_FIT_TOLERANCE_SEC) {
    return `This video is only ${fmtTime(vd)} long, but the transcript runs to ${fmtTime(te)}. Choose a video and transcript that match.`;
  }
  return null;
});

// edit: title changed, or a file was swapped in; create: title + both files present.
const titleChanged = computed(() => s.title.trim() !== (props.video?.title ?? "").trim());
const hasEditChange = computed(() => (!!s.title.trim() && titleChanged.value) || !!s.videoFile || !!s.transcriptFile);
const disabled = computed(() => {
  if (uploading.value || s.phase === "done") return true;
  if (!s.title.trim() || !!s.errors.video || !!s.errors.transcript || !!durationMismatch.value) return true;
  return isEdit.value ? !hasEditChange.value : (!s.videoName || !s.transcriptName);
});
const btnLabel = computed(() => {
  if (isEdit.value) return s.phase === "processing" || s.phase === "uploading" ? "Saving…" : s.phase === "done" ? "Saved" : "Save changes";
  return s.phase === "processing" ? "Processing…" : s.phase === "uploading" ? "Uploading…" : s.phase === "done" ? "Done" : "Upload video";
});
// A new file (edit) or any create upload re-indexes; a title-only edit does not.
const reindexing = computed(() => !isEdit.value || !!s.videoFile || !!s.transcriptFile);

/* ---- preview transcript sync (click a line → seek the preview video) ---- */
const previewVideoEl = ref<HTMLVideoElement | null>(null);
const previewTime = ref(0);
const activeCueT = computed(() => {
  let at: number | null = null;
  for (const c of effectiveCues.value) if (c.t <= previewTime.value) at = c.t;
  return at;
});
function onPreviewTime(e: Event) { previewTime.value = (e.target as HTMLVideoElement).currentTime; }
function seekPreview(t: number) {
  previewTime.value = t;
  if (previewVideoEl.value) {
    previewVideoEl.value.currentTime = t;
    previewVideoEl.value.play().catch(() => {});
  }
}

// Determinate % only while there's a meaningful in-flight value; otherwise an animated bar.
const indeterminate = computed(
  () => s.phase === "processing" || (s.phase === "uploading" && (s.progress <= 0 || s.progress >= 100)),
);

/* ---- submit ---- */
async function submit() {
  if (disabled.value) return;
  const title = s.title.trim();

  if (isEdit.value) {
    const vid = props.video?.videoId;
    if (!vid) return;
    s.phase = "uploading"; s.progress = 0; s.errors = {};
    const onProgress = (pct: number) => { s.progress = pct; if (pct >= 100 && s.phase === "uploading") s.phase = "processing"; };
    try {
      if (s.videoFile) {
        // Replacing the video → signed direct-to-GCS (same path as create, reusing the id),
        // so large files upload browser→bucket and never time out through the API. Any new
        // transcript rides along and re-indexes after the video is stored.
        await ingestionApi.postVideo(
          s.videoFile, s.transcriptFile ?? undefined, title, s.cues.length, { onProgress }, vid,
          s.videoDuration ? Math.round(s.videoDuration * 1000) : undefined,
        );
      } else {
        // Title and/or transcript only → PATCH (transcripts are tiny, no timeout risk).
        await ingestionApi.updateVideo(vid, {
          title: titleChanged.value ? title : undefined,
          transcriptFile: s.transcriptFile ?? undefined,
          cueCount: s.transcriptFile ? s.cues.length : undefined,
        }, { onProgress });
      }
      s.phase = "done";
      emit("updated", { videoId: vid, reprocessing: reindexing.value });
      setTimeout(() => emit("update:modelValue", false), 700);
    } catch (e) {
      s.phase = "idle"; s.progress = 0;
      s.errors = { submit: e instanceof Error ? e.message : "Could not save changes. Please try again." };
    }
    return;
  }

  // create
  const errs: Record<string, string> = {};
  if (!title) errs.title = "A title is required.";
  if (!s.videoFile) errs.video = "Select an .mp4 video file.";
  if (!s.transcriptFile) errs.transcript = "Select a transcript file.";
  if (Object.keys(errs).length) { Object.assign(s.errors, errs); return; }

  s.phase = "uploading"; s.progress = 0; s.errors = {};
  try {
    const { videoId, chained } = await ingestionApi.postVideo(
      s.videoFile as File, s.transcriptFile as File, title, s.cues.length, {
        onProgress: (pct) => {
          s.progress = pct;
          if (pct >= 100 && s.phase === "uploading") s.phase = "processing";
        },
      });
    s.phase = "done";
    emit("accepted", { videoId, transcriptFile: s.transcriptFile as File, title, cueCount: s.cues.length, chained });
    s.videoUrl = ""; // ownership released to the caller
    setTimeout(() => emit("update:modelValue", false), 800);
  } catch (e) {
    s.phase = "idle"; s.progress = 0;
    s.errors = { submit: e instanceof Error ? e.message : "Upload failed. Please try again." };
  }
}
</script>

<template>
  <div v-if="modelValue" class="video-upload-overlay" @click="close">
    <div class="video-upload-modal" @click.stop>
      <header class="modal__head">
        <div v-if="isEdit">
          <h3>Edit Video</h3>
          <p>Rename the video, or replace its file or transcript. Replacing either re-indexes the video so answers stay accurate.</p>
        </div>
        <div v-else>
          <h3>Upload Support Video</h3>
          <p>Add a video and its timestamped transcript. It's compressed, chunked and indexed so the assistant can answer with the exact moment.</p>
        </div>
        <button class="x" @click="forceClose">×</button>
      </header>

      <div class="body">
        <!-- LEFT: form -->
        <div class="form">
          <label class="lbl">Title <span v-if="!isEdit" class="req">*</span></label>
          <input v-model="s.title" class="input" :class="{ 'is-err': s.errors.title }" placeholder="e.g. Setting up billing" @input="s.errors.title = null" />
          <div v-if="s.errors.title" class="err">{{ s.errors.title }}</div>

          <label class="lbl">
            {{ isEdit ? "Replace video" : "Video file" }}
            <span v-if="isEdit" class="opt">· optional</span><span v-else class="req">*</span>
          </label>
          <label
            v-if="!s.videoName"
            class="zone zone--col"
            :class="{ 'is-drag': s.dragV, 'is-err': s.errors.video }"
            @drop="onDropVideo" @dragover.prevent="s.dragV = true" @dragleave.prevent="s.dragV = false"
          >
            <div class="zone__icon zone__icon--accent"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></svg></div>
            <div class="zone__t">Drag &amp; drop your video, or <span class="link">browse</span></div>
            <div class="zone__sub">MP4 · up to 5 GB{{ isEdit ? " · keeps the current one if left empty" : "" }}</div>
            <input type="file" accept="video/mp4" hidden @change="onPickVideo" />
          </label>
          <div v-else class="filecard">
            <div class="filecard__poster"><div class="filecard__play"><svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M7 5v14l12-7z" /></svg></div></div>
            <div class="filecard__text"><div class="ttl">{{ s.videoName }}</div><div class="sub">{{ videoMeta }}</div></div>
            <button class="del" @click="removeVideo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--err)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
          </div>
          <div v-if="s.errors.video" class="err">{{ s.errors.video }}</div>

          <label class="lbl">
            {{ isEdit ? "Replace transcript" : "Transcript" }}
            <span v-if="isEdit" class="opt">· optional</span><span v-else class="req">*</span>
          </label>
          <label
            v-if="!s.transcriptName"
            class="zone zone--row"
            :class="{ 'is-drag': s.dragT, 'is-err': s.errors.transcript }"
            @drop="onDropTranscript" @dragover.prevent="s.dragT = true" @dragleave.prevent="s.dragT = false"
          >
            <div class="zone__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b6470" stroke-width="1.6" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4" /><path d="M9 13h6M9 17h6" stroke-linecap="round" /></svg></div>
            <div>
              <div class="zone__t">Drop transcript, or <span class="link">browse</span></div>
              <div class="zone__sub">.vtt · .srt · .json{{ isEdit ? " · re-indexes the video" : "" }}</div>
            </div>
            <input type="file" accept=".vtt,.srt,.json" hidden @change="onPickTranscript" />
          </label>
          <div v-else class="filecard">
            <div class="filecard__doc"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5b6470" stroke-width="1.6" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4" /><path d="M9 13h6M9 17h6" stroke-linecap="round" /></svg></div>
            <div class="filecard__text"><div class="ttl">{{ s.transcriptName }}</div><div class="sub">{{ transcriptMeta }}</div></div>
            <button class="del" @click="removeTranscript"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--err)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
          </div>
          <div v-if="s.errors.transcript" class="err">{{ s.errors.transcript }}</div>

          <div v-if="durationMismatch" class="err err--submit">{{ durationMismatch }}</div>
          <div v-if="isEdit && reindexing && s.phase === 'idle' && !durationMismatch" class="note">Replacing the video or transcript re-indexes it — the row will show Processing, then Indexed.</div>
          <div v-if="s.errors.submit" class="err err--submit">{{ s.errors.submit }}</div>
          <div class="actions">
            <button class="btn-ghost" :disabled="uploading" @click="close">Cancel</button>
            <button class="btn-primary" :disabled="disabled" @click="submit">{{ btnLabel }}</button>
          </div>
        </div>

        <!-- RIGHT: preview / progress / done -->
        <div class="preview">
          <!-- loading existing (edit) -->
          <div v-if="s.phase === 'idle' && ex.loading && !hasPreview" class="pv-center">
            <div class="ring" />
            <div class="pv-stage">Loading preview…</div>
          </div>

          <!-- empty -->
          <div v-else-if="s.phase === 'idle' && !hasPreview" class="pv-empty">
            <div class="pv-empty__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b6bcc3" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></svg></div>
            <div class="pv-empty__t">Preview appears here</div>
            <div class="pv-empty__s">{{ isEdit ? "This video isn't indexed yet, so there's nothing to preview." : "Choose a video and transcript to see the aligned preview before uploading." }}</div>
          </div>

          <!-- preview -->
          <div v-else-if="s.phase === 'idle'" class="pv-scroll">
            <div class="pv-label">{{ isEdit && !s.videoFile && !s.transcriptFile ? "Current" : "Preview" }}</div>
            <video v-if="previewUrl" ref="previewVideoEl" :src="previewUrl" controls preload="metadata" class="pv-video" @loadedmetadata="onVideoMeta" @timeupdate="onPreviewTime" />
            <div v-else class="pv-novid">Add a video to preview playback</div>
            <div class="pv-title">{{ s.title.trim() || s.videoName || "Untitled video" }}</div>
            <div class="pv-meta">{{ videoMeta }}</div>

            <div class="pv-tx-head">
              <span class="pv-tx-title">Transcript</span>
              <span class="pv-tx-badge">{{ effectiveCues.length ? effectiveCues.length + " cues aligned" : "No transcript cues yet" }}</span>
            </div>
            <div v-if="effectiveCues.length" class="pv-tx-list">
              <div v-for="(c, i) in previewCues" :key="i" class="pv-cue" :class="{ 'is-active': c.t === activeCueT }" @click="seekPreview(c.t)">
                <span class="pv-cue__t">{{ fmtTime(c.t) }}</span>
                <span class="pv-cue__x">{{ c.text }}</span>
              </div>
            </div>
            <div v-else class="pv-tx-empty">Add a transcript to see aligned cues.</div>
          </div>

          <!-- progress -->
          <div v-else-if="uploading" class="pv-center">
            <div class="ring" />
            <div class="pv-stage">{{ isEdit ? "Saving your changes…" : "Uploading your video…" }}</div>
            <div class="pv-bar-wrap">
              <div class="pv-pct">{{ indeterminate ? "" : Math.round(s.progress) + "%" }}</div>
              <div class="pv-bar"><div class="pv-bar__fill" :class="{ 'is-indet': indeterminate }" :style="indeterminate ? {} : { width: s.progress + '%' }" /></div>
            </div>
            <div class="pv-substage">{{ reindexing ? "Re-indexing continues in the library." : "Applying your changes." }}</div>
          </div>

          <!-- done -->
          <div v-else-if="s.phase === 'done'" class="pv-center">
            <div class="check"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
            <div class="pv-stage">{{ isEdit ? "Changes saved" : "Added to library" }}</div>
            <div class="pv-substage">{{ reindexing ? "The video is re-indexing. It'll show Processing, then Indexed." : "Your changes are live." }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-upload-overlay { position: fixed; inset: 0; background: rgba(18,22,27,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
.video-upload-modal { background: #fff; width: 920px; max-width: 100%; height: min(640px, 88vh); border-radius: 16px; box-shadow: 0 24px 70px rgba(15,20,25,0.32); overflow: hidden; display: flex; flex-direction: column; }
.modal__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid var(--line-2); }
.modal__head h3 { margin: 0; font-size: 18px; font-weight: 700; }
.modal__head p { margin: 5px 0 0; color: var(--muted); font-size: 12.5px; line-height: 1.5; max-width: 470px; }
.x { border: none; background: transparent; color: #9aa1a9; font-size: 22px; line-height: 1; cursor: pointer; padding: 2px; }

.body { display: flex; min-height: 0; flex: 1; }
.form { width: 50%; padding: 22px 24px; overflow-y: auto; border-right: 1px solid var(--line-2); display: flex; flex-direction: column; }
.preview { width: 50%; display: flex; flex-direction: column; background: #f7f8f9; min-width: 0; }

.lbl { display: block; font-size: 13px; font-weight: 600; margin: 18px 0 7px; }
.lbl:first-of-type { margin-top: 0; }
.req { color: var(--accent); }
.opt { color: #a4abb3; font-weight: 400; }
.input { width: 100%; border: 1px solid #d7dadf; border-radius: var(--radius-ctrl); padding: 10px 13px; font-size: 13.5px; font-family: inherit; outline: none; color: var(--ink); }
.input.is-err { border-color: #e3a79f; }
.textarea { min-height: 62px; resize: vertical; line-height: 1.5; }
.err { color: var(--err); font-size: 12px; margin-top: 6px; }
.err--submit { margin-top: 12px; }
.note { margin-top: 14px; font-size: 12px; color: var(--muted); background: var(--accent-soft); border-radius: 9px; padding: 9px 12px; line-height: 1.5; }

.zone { border: 1.5px dashed #d2d6db; border-radius: 12px; background: #fbfbfc; cursor: pointer; display: flex; }
.zone--col { flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 20px 16px; text-align: center; }
.zone--row { flex-direction: row; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 11px; }
.zone.is-drag { border-color: var(--accent); background: #fff6ef; }
.zone.is-err { border-color: #e3a79f; background: #fef7f6; }
.zone__icon { width: 34px; height: 34px; border-radius: 9px; background: #eef1f4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.zone--col .zone__icon { width: 40px; height: 40px; border-radius: 11px; }
.zone__icon--accent { background: var(--accent-soft); }
.zone__t { font-size: 13px; color: #3a4048; }
.zone__sub { font-size: 11.5px; color: #9aa1a9; }
.link { color: var(--accent); font-weight: 600; }

.filecard { display: flex; align-items: center; gap: 12px; border: 1px solid #e2e4e7; border-radius: 11px; padding: 10px 12px; background: #fff; }
.filecard__poster { position: relative; width: 58px; height: 34px; border-radius: 7px; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #323a47, #171b22); display: flex; align-items: center; justify-content: center; }
.filecard__play { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,106,0,0.92); display: flex; align-items: center; justify-content: center; }
.filecard__doc { width: 34px; height: 34px; border-radius: 8px; background: #eef1f4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.filecard__text { min-width: 0; flex: 1; }
.filecard__text .ttl { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.filecard__text .sub { font-size: 11.5px; color: #9aa1a9; }
.del { border: none; background: transparent; cursor: pointer; color: #9aa1a9; padding: 5px; border-radius: 7px; line-height: 0; }
.del:hover { background: var(--err-bg); }

.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: auto; padding-top: 24px; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { border: 1px solid #e0e2e5; background: #fff; color: #3a4048; padding: 10px 20px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-primary { border: none; padding: 10px 22px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; font-family: inherit; color: #fff; background: var(--accent); cursor: pointer; }
.btn-primary:disabled { background: #f7b989; cursor: default; }

.pv-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px; text-align: center; }
.pv-empty__icon { width: 56px; height: 56px; border-radius: 15px; background: #eef1f4; display: flex; align-items: center; justify-content: center; }
.pv-empty__t { font-size: 14px; font-weight: 600; color: var(--muted); }
.pv-empty__s { font-size: 12.5px; color: #9aa1a9; max-width: 240px; line-height: 1.5; }

.pv-scroll { flex: 1; overflow-y: auto; padding: 20px; }
.pv-label { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; color: #9aa1a9; text-transform: uppercase; margin-bottom: 12px; }
.pv-video { width: 100%; aspect-ratio: 16/9; border-radius: 12px; background: #000; display: block; }
.pv-novid { width: 100%; aspect-ratio: 16/9; border-radius: 12px; background: #eef1f4; display: flex; align-items: center; justify-content: center; font-size: 12.5px; color: #9aa1a9; }
.pv-title { margin: 14px 0 4px; font-size: 15px; font-weight: 700; word-break: break-word; }
.pv-meta { font-size: 12.5px; color: #9aa1a9; }
.pv-tx-head { display: flex; align-items: center; gap: 8px; margin: 20px 0 10px; }
.pv-tx-title { font-size: 13px; font-weight: 600; }
.pv-tx-badge { font-size: 11.5px; color: var(--ok); background: var(--ok-bg); padding: 3px 9px; border-radius: 999px; font-weight: 600; }
.pv-tx-list { background: #fff; border: 1px solid var(--line-2); border-radius: 11px; overflow: hidden; }
.pv-cue { display: flex; gap: 11px; padding: 8px 12px; border-bottom: 1px solid #f4f5f6; align-items: flex-start; cursor: pointer; }
.pv-cue:hover { background: #f5f6f7; }
.pv-cue.is-active { background: var(--accent-soft); box-shadow: inset 3px 0 0 var(--accent); }
.pv-cue__t { font-family: ui-monospace, monospace; font-size: 11.5px; font-weight: 600; color: #a4abb3; flex-shrink: 0; padding-top: 1px; min-width: 38px; }
.pv-cue.is-active .pv-cue__t { color: var(--accent); }
.pv-cue__x { font-size: 12.5px; line-height: 1.5; color: #2b3038; }
.pv-tx-empty { font-size: 12.5px; color: #9aa1a9; padding: 8px 2px; }

.pv-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 32px; text-align: center; }
.ring { width: 52px; height: 52px; border: 4px solid #ffe0c2; border-top-color: var(--accent); border-radius: 50%; animation: sa-spin 0.8s linear infinite; }
.pv-stage { font-size: 16px; font-weight: 700; }
.pv-substage { font-size: 12.5px; color: #9aa1a9; max-width: 250px; line-height: 1.5; }

.pv-bar-wrap { width: 82%; max-width: 280px; }
.pv-pct { display: flex; justify-content: flex-end; font-size: 12px; color: var(--muted); margin-bottom: 6px; font-variant-numeric: tabular-nums; min-height: 15px; }
.pv-bar { height: 8px; background: #e6e8ea; border-radius: 999px; overflow: hidden; position: relative; }
.pv-bar__fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.12s linear; }
.pv-bar__fill.is-indet { position: absolute; width: 40%; animation: sa-indet 1.15s ease-in-out infinite alternate; margin-left: 0; }
@keyframes sa-indet { 0% { margin-left: 0%; } 100% { margin-left: 60%; } }
.check { width: 58px; height: 58px; border-radius: 50%; background: var(--ok-bg); display: flex; align-items: center; justify-content: center; }
</style>
