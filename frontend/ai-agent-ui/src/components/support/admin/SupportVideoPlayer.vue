<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { fmtTime, type Cue } from "@/utils/transcript";
import { DEMO_TRANSCRIPT, type SupportVideo } from "@/data/mockVideos";

const props = defineProps<{ video: SupportVideo | null }>();
const emit = defineEmits<{ (e: "close"): void }>();

const currentTime = ref(0);
const playing = ref(false);
const duration = ref(365);
const search = ref("");
const showTranscript = ref(true);

const videoEl = ref<HTMLVideoElement | null>(null);
const txEl = ref<HTMLElement | null>(null);
let clock: number | undefined;

const hasRealVideo = computed(() => !!props.video?.url);
const cues = computed<Cue[]>(() =>
  props.video?.cues && props.video.cues.length ? props.video.cues : DEMO_TRANSCRIPT
);

watch(
  () => props.video,
  (v) => {
    clearInterval(clock);
    if (videoEl.value) { try { videoEl.value.pause(); } catch {} }
    currentTime.value = 0;
    playing.value = false;
    search.value = "";
    duration.value = v?.url ? v.durationSec || 0 : 365;
  }
);

const activeTime = computed(() => {
  let at: number | null = null;
  for (const c of cues.value) if (c.t <= currentTime.value) at = c.t;
  return at;
});
const visibleCues = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? cues.value.filter((c) => c.text.toLowerCase().includes(q)) : cues.value;
});
const progressPct = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0));

function highlight(text: string) {
  const q = search.value.trim();
  if (!q) return [{ h: false, s: text }];
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return [{ h: false, s: text }];
  return [
    { h: false, s: text.slice(0, idx) },
    { h: true, s: text.slice(idx, idx + q.length) },
    { h: false, s: text.slice(idx + q.length) },
  ];
}

/* ---- controls ---- */
function togglePlay() {
  if (hasRealVideo.value) {
    if (!videoEl.value) return;
    videoEl.value.paused ? videoEl.value.play() : videoEl.value.pause();
    return;
  }
  if (playing.value) { clearInterval(clock); playing.value = false; }
  else {
    playing.value = true;
    clearInterval(clock);
    clock = window.setInterval(() => {
      let t = currentTime.value + 0.2;
      if (t >= duration.value) { t = duration.value; clearInterval(clock); playing.value = false; }
      currentTime.value = t;
      autoScroll();
    }, 200);
  }
}
function seek(t: number) {
  const clamped = Math.max(0, Math.min(duration.value || t, t));
  if (hasRealVideo.value && videoEl.value) videoEl.value.currentTime = clamped;
  currentTime.value = clamped;
  nextTick(autoScroll);
}
function onScrub(e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  seek(((e.clientX - r.left) / r.width) * duration.value);
}
function onVideoTime(e: Event) {
  currentTime.value = (e.target as HTMLVideoElement).currentTime;
  if (playing.value) autoScroll();
}
function onVideoLoaded(e: Event) {
  const d = (e.target as HTMLVideoElement).duration;
  if (d && isFinite(d)) duration.value = d;
}

function autoScroll() {
  if (!txEl.value) return;
  const el = txEl.value.querySelector('[data-active="true"]') as HTMLElement | null;
  if (el) txEl.value.scrollTop = Math.max(0, el.offsetTop - txEl.value.clientHeight / 2 + el.clientHeight / 2);
}

function close() {
  clearInterval(clock);
  if (videoEl.value) { try { videoEl.value.pause(); } catch {} }
  emit("close");
}
</script>

<template>
  <div v-if="video" class="overlay" @click="close">
    <div class="modal" @click.stop>
      <header class="head">
        <div class="head__text">
          <div class="title">{{ video.title }}</div>
          <div class="file">{{ video.file }}</div>
        </div>
        <div class="head__actions">
          <button class="ghostbtn" @click="showTranscript = !showTranscript">
            {{ showTranscript ? "Hide transcript" : "Show transcript" }}
          </button>
          <button class="x" @click="close">×</button>
        </div>
      </header>

      <div class="body" :class="{ 'body--solo': !showTranscript }">
        <!-- video pane -->
        <div class="vpane">
          <template v-if="hasRealVideo">
            <video
              ref="videoEl"
              :src="video.url"
              controls
              preload="metadata"
              class="real-video"
              @timeupdate="onVideoTime"
              @loadedmetadata="onVideoLoaded"
              @play="playing = true"
              @pause="playing = false"
            />
            <div class="hint"><span class="hint__dot" />{{ video.file }} · click a transcript line to jump</div>
          </template>

          <template v-else>
            <div class="frame">
              <div class="frame__stripe" />
              <div class="frame__center">
                <button class="bigplay" @click="togglePlay">
                  <svg v-if="playing" width="24" height="24" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  <svg v-else width="26" height="26" viewBox="0 0 24 24" fill="#fff" style="margin-left:3px"><path d="M7 5v14l12-7z" /></svg>
                </button>
                <div class="frame__cap">support video · {{ video.file }}</div>
              </div>
              <div class="frame__badge">{{ video.title }}</div>
            </div>
            <div class="controls">
              <button class="ctrl-play" @click="togglePlay">
                <svg v-if="playing" width="15" height="15" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="#fff" style="margin-left:2px"><path d="M7 5v14l12-7z" /></svg>
              </button>
              <span class="tnum">{{ fmtTime(currentTime) }}</span>
              <div class="track" @click="onScrub">
                <div class="track__fill" :style="{ width: progressPct + '%' }" />
                <div class="track__knob" :style="{ left: progressPct + '%' }" />
              </div>
              <span class="tnum tnum--dim">{{ fmtTime(duration) }}</span>
            </div>
          </template>
        </div>

        <!-- transcript pane -->
        <div v-if="showTranscript" class="tpane">
          <div class="tpane__head">
            <div class="tpane__row">
              <span class="tpane__title">Transcript</span>
              <span class="tpane__count">{{ cues.length }} lines</span>
            </div>
            <div class="tsearch">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a4abb3" stroke-width="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" stroke-linecap="round" /></svg>
              <input v-model="search" placeholder="Search transcript…" />
            </div>
          </div>

          <div ref="txEl" class="tlist">
            <div
              v-for="(c, i) in visibleCues"
              :key="i"
              class="cue"
              :class="{ 'is-active': c.t === activeTime }"
              :data-active="c.t === activeTime ? 'true' : 'false'"
              @click="seek(c.t)"
            >
              <span class="cue__t">{{ fmtTime(c.t) }}</span>
              <span class="cue__x"><template v-for="(p, j) in highlight(c.text)" :key="j"><mark v-if="p.h">{{ p.s }}</mark><template v-else>{{ p.s }}</template></template></span>
            </div>
            <div v-if="visibleCues.length === 0" class="cue-empty">No transcript lines match “{{ search }}”.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(18,22,27,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
.modal { background: #fff; width: min(1180px, 96vw); max-width: 100%; height: min(760px, 92vh); border-radius: 16px; box-shadow: 0 24px 70px rgba(15,20,25,0.35); overflow: hidden; display: flex; flex-direction: column; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--line-2); }
.head__text { min-width: 0; flex: 1; }
.head__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.title { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file { font-size: 12.5px; color: #9aa1a9; }
.ghostbtn { border: 1px solid var(--line-2); background: #fff; color: #4a5560; font-size: 12.5px; font-weight: 500; border-radius: 8px; padding: 6px 12px; cursor: pointer; white-space: nowrap; }
.ghostbtn:hover { background: #f5f6f7; }
.x { border: none; background: transparent; color: #9aa1a9; font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px; }

.body { display: flex; min-height: 0; flex: 1; }
.vpane { flex: 1.55; min-width: 0; padding: 18px; display: flex; flex-direction: column; gap: 12px; background: #0e1116; }
.body--solo .vpane { flex: 1; }
.real-video { width: 100%; flex: 1; min-height: 0; border-radius: 12px; background: #000; display: block; object-fit: contain; }
.hint { display: flex; align-items: center; gap: 8px; font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 1px; color: #6a7480; text-transform: uppercase; }
.hint__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); }

.frame { position: relative; width: 100%; aspect-ratio: 16/9; background: #161a20; border-radius: 12px; overflow: hidden; }
.frame__stripe { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, #1b2029, #1b2029 7px, #1e242e 7px, #1e242e 14px); }
.frame__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.bigplay { width: 66px; height: 66px; border-radius: 50%; border: none; background: rgba(255,106,0,0.95); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(255,106,0,0.4); }
.frame__cap { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 1px; color: #6a7480; text-transform: uppercase; }
.frame__badge { position: absolute; left: 14px; top: 14px; font-size: 12px; color: #c7cdd4; font-weight: 500; background: rgba(0,0,0,0.35); padding: 4px 10px; border-radius: 6px; }

.controls { display: flex; align-items: center; gap: 14px; }
.ctrl-play { width: 36px; height: 36px; border-radius: 9px; border: none; background: #1e242e; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tnum { font-family: ui-monospace, monospace; font-size: 12.5px; color: #c7cdd4; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.tnum--dim { color: #6a7480; }
.track { flex: 1; height: 6px; background: #2a313c; border-radius: 999px; cursor: pointer; position: relative; }
.track__fill { position: absolute; left: 0; top: 0; height: 100%; background: var(--accent); border-radius: 999px; }
.track__knob { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }

.tpane { flex: 1; min-width: 340px; display: flex; flex-direction: column; border-left: 1px solid var(--line-2); }
.tpane__head { padding: 16px 18px 12px; }
.tpane__row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tpane__title { font-size: 14px; font-weight: 600; }
.tpane__count { font-size: 11.5px; color: #9aa1a9; }
.tsearch { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e4e7; border-radius: 9px; padding: 8px 11px; background: #fbfbfc; }
.tsearch input { border: none; outline: none; background: transparent; font-size: 13px; font-family: inherit; width: 100%; }

.tlist { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 2px 8px 14px; }
.cue { display: flex; gap: 12px; padding: 9px 12px; border-radius: 9px; cursor: pointer; align-items: flex-start; margin: 2px 0; }
.cue:hover { background: #f5f6f7; }
.cue.is-active { background: #fff4ec; box-shadow: inset 3px 0 0 var(--accent); }
.cue.is-active:hover { background: #ffeede; }
.cue__t { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; color: #a4abb3; flex-shrink: 0; padding-top: 1px; min-width: 38px; }
.cue.is-active .cue__t { color: var(--accent); }
.cue__x { font-size: 13.5px; line-height: 1.5; color: #2b3038; }
.cue__x mark { background: #ffe0a3; border-radius: 3px; padding: 0 1px; }
.cue-empty { text-align: center; padding: 40px 16px; color: #9aa1a9; font-size: 13px; }
</style>
