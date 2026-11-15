<script setup lang="ts">
/**
 * DocumentUploadModal — create OR edit a support document (one component, two modes).
 *
 *  - mode="create" (default): title + file required; submits via ingestionApi.postDocument
 *    and emits `accepted`.
 *  - mode="edit": pass the `doc` row. Title is prefilled and the current file shows in the
 *    preview; the file is OPTIONAL (kept unless replaced). Submits only what changed via
 *    ingestionApi.updateDocument and emits `updated`.
 *
 * Left = form, right = preview (the current file, or the newly-picked one).
 */
import { reactive, computed, watch } from "vue";
import { fmtSize } from "@/utils/transcript";
import { ingestionApi } from "@/api/ingestion.service";
import type { SupportDoc } from "@/data/supportDocuments";

const props = withDefaults(defineProps<{
  modelValue: boolean;
  mode?: "create" | "edit";
  doc?: SupportDoc | null;
}>(), { mode: "create", doc: null });

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "accepted", payload: { documentId: string; title: string; fileName: string; fileSize: number }): void;
  (e: "updated", p: { documentId: string; reprocessing: boolean }): void;
}>();

const isEdit = computed(() => props.mode === "edit");

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

const s = reactive({
  title: "",
  file: null as File | null,
  docName: "",
  docSize: 0,
  isPublic: false, // private by default
  errors: {} as Record<string, string | null>,
  phase: "idle" as Phase,
  progress: 0,
  dragD: false,
});

function reset() {
  Object.assign(s, {
    title: isEdit.value ? (props.doc?.title ?? props.doc?.name ?? "") : "",
    file: null, docName: "", docSize: 0,
    isPublic: isEdit.value ? !!props.doc?.isPublic : false,
    errors: {}, phase: "idle", progress: 0, dragD: false,
  });
}
watch(() => props.modelValue, (open) => { if (open) reset(); });

const uploading = computed(() => s.phase === "uploading" || s.phase === "processing");
// Overlay click + Cancel are blocked mid-upload; the × always closes.
function close() {
  if (uploading.value) return;
  emit("update:modelValue", false);
}
function forceClose() { emit("update:modelValue", false); }
function overlayClose() { if (!uploading.value) close(); }

/* ---- file ---- */
function handleFile(f: File) {
  if (!/\.(pdf|docx|doc|txt|md)$/i.test(f.name)) { s.errors.doc = "Document must be .pdf, .docx, .doc, .txt or .md."; return; }
  if (f.size > 100 * 1024 * 1024) { s.errors.doc = "Document exceeds the 100 MB limit."; return; }
  s.errors.doc = null; s.file = f; s.docName = f.name; s.docSize = f.size;
}
function onPick(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); (e.target as HTMLInputElement).value = ""; }
function onDrop(e: DragEvent) { e.preventDefault(); s.dragD = false; const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); }
function removeDoc() { if (uploading.value) return; s.file = null; s.docName = ""; s.docSize = 0; s.errors.doc = null; }

/* ---- derived ---- */
const baseTitle = computed(() => (props.doc?.title ?? props.doc?.name ?? "").trim());
const titleChanged = computed(() => s.title.trim() !== baseTitle.value);
const visibilityChanged = computed(() => isEdit.value && s.isPublic !== !!props.doc?.isPublic);
const hasEditChange = computed(() => (!!s.title.trim() && titleChanged.value) || !!s.file || visibilityChanged.value);
const disabled = computed(() => {
  if (uploading.value || s.phase === "done") return true;
  if (!s.title.trim() || !!s.errors.doc) return true;
  return isEdit.value ? !hasEditChange.value : !s.docName;
});
const btnLabel = computed(() => {
  if (isEdit.value) return uploading.value ? "Saving…" : s.phase === "done" ? "Saved" : "Save changes";
  return uploading.value ? "Uploading…" : s.phase === "done" ? "Done" : "Upload document";
});
const newExt = computed(() => (s.docName.split(".").pop() || "").toUpperCase());
// Preview: the newly-picked file if any, else (edit) the current document.
const previewName = computed(() => s.docName || (isEdit.value ? (props.doc?.name ?? "") : ""));
const previewExt = computed(() => s.docName ? newExt.value : (isEdit.value ? (props.doc?.type ?? "") : ""));
const previewMeta = computed(() => {
  if (s.docName) return [fmtSize(s.docSize), newExt.value].filter(Boolean).join(" · ");
  if (isEdit.value && props.doc) return [props.doc.type, props.doc.chunks ? props.doc.chunks + " chunks" : ""].filter(Boolean).join(" · ");
  return "";
});
const hasPreview = computed(() => !!previewName.value);
const reindexing = computed(() => !isEdit.value || !!s.file);

const indeterminate = computed(
  () => s.phase === "processing" || (s.phase === "uploading" && (s.progress <= 0 || s.progress >= 100)),
);

/* ---- submit ---- */
async function submit() {
  if (disabled.value) return;
  const title = s.title.trim();

  if (isEdit.value) {
    if (!props.doc?.id) return;
    s.phase = "uploading"; s.progress = 0; s.errors = {};
    try {
      const { reprocessing } = await ingestionApi.updateDocument(
        props.doc.id,
        {
          title: titleChanged.value ? title : undefined,
          file: s.file ?? undefined,
          isPublic: visibilityChanged.value ? s.isPublic : undefined,
        },
        { onProgress: (pct) => { s.progress = pct; if (pct >= 100 && s.phase === "uploading") s.phase = "processing"; } },
      );
      s.phase = "done";
      emit("updated", { documentId: props.doc.id, reprocessing });
      setTimeout(() => emit("update:modelValue", false), 700);
    } catch (e) {
      s.phase = "error";
      s.errors.submit = e instanceof Error ? e.message : "Could not save changes. Please try again.";
    }
    return;
  }

  // create
  if (!s.file) { s.errors.doc = "Select a document file."; return; }
  s.phase = "uploading"; s.progress = 0; s.errors = {};
  try {
    const { documentId } = await ingestionApi.postDocument(s.file, title, {
      onProgress: (pct) => {
        s.progress = pct;
        if (pct >= 100 && s.phase === "uploading") s.phase = "processing";
      },
    }, s.isPublic);
    s.phase = "done";
    emit("accepted", { documentId, title, fileName: s.docName, fileSize: s.docSize });
    setTimeout(() => emit("update:modelValue", false), 800);
  } catch (e) {
    s.phase = "error";
    s.errors.submit = e instanceof Error ? e.message : "Upload failed. Please try again.";
  }
}
</script>

<template>
  <div v-if="modelValue" class="doc-upload-overlay" @click="overlayClose">
    <div class="doc-upload-modal" @click.stop>
      <header class="head">
        <div v-if="isEdit">
          <h3>Edit Document</h3>
          <p>Rename the document, or replace its file. Replacing the file re-indexes it so answers stay accurate.</p>
        </div>
        <div v-else>
          <h3>Upload Document</h3>
          <p>Add a document to the Support Assistant's knowledge base. Text is extracted, chunked and indexed so the assistant can answer from it.</p>
        </div>
        <button class="x" @click="forceClose">×</button>
      </header>

      <div class="body">
        <!-- LEFT: form -->
        <div class="form">
          <label class="lbl">Title <span v-if="!isEdit" class="req">*</span></label>
          <input v-model="s.title" class="input" :class="{ 'is-err': s.errors.title }" placeholder="e.g. Refund policy FAQ" @input="s.errors.title = null" />
          <div v-if="s.errors.title" class="err">{{ s.errors.title }}</div>

          <label class="lbl">
            {{ isEdit ? "Replace file" : "Document file" }}
            <span v-if="isEdit" class="opt">· optional</span><span v-else class="req">*</span>
          </label>
          <label v-if="!s.docName" class="zone zone--col" :class="{ 'is-drag': s.dragD, 'is-err': s.errors.doc }"
            @drop="onDrop" @dragover.prevent="s.dragD = true" @dragleave.prevent="s.dragD = false">
            <div class="zone__icon zone__icon--accent"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.7" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M9 13h6M9 17h6" stroke-linecap="round"/></svg></div>
            <div class="zone__t">Drag &amp; drop your document, or <span class="link">browse</span></div>
            <div class="zone__sub">.pdf · .docx · .doc · .txt · .md{{ isEdit ? " · keeps the current one if left empty" : "" }}</div>
            <input type="file" accept=".pdf,.docx,.doc,.txt,.md" hidden @change="onPick" />
          </label>
          <div v-else class="filecard">
            <div class="filecard__doc filecard__doc--accent"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/></svg></div>
            <div class="filecard__text"><div class="ttl">{{ s.docName }}</div><div class="sub">{{ [fmtSize(s.docSize), newExt].filter(Boolean).join(" · ") }}</div></div>
            <button class="del" :disabled="uploading" @click="removeDoc"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--err)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
          </div>
          <div v-if="s.errors.doc" class="err">{{ s.errors.doc }}</div>

          <label class="lbl">Visibility</label>
          <div class="vis">
            <button type="button" class="vis-opt" :class="{ 'is-on': !s.isPublic }" @click="s.isPublic = false">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              Private
            </button>
            <button type="button" class="vis-opt" :class="{ 'is-on': s.isPublic }" @click="s.isPublic = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
              Public
            </button>
          </div>
          <div class="vis-hint">{{ s.isPublic ? "Cited in answers for all users." : "Cited only for global admins; still used to inform answers." }}</div>

          <div v-if="isEdit && reindexing && s.phase === 'idle'" class="note">Replacing the file re-indexes it — the row will show Processing, then Indexed.</div>
          <div v-if="s.errors.submit" class="err err--submit">{{ s.errors.submit }}</div>

          <div class="actions">
            <button class="btn-ghost" :disabled="uploading" @click="close">Cancel</button>
            <button class="btn-primary" :disabled="disabled" @click="submit">{{ btnLabel }}</button>
          </div>
        </div>

        <!-- RIGHT: preview / progress / done / error -->
        <div class="preview">
          <div v-if="s.phase === 'idle' && !hasPreview" class="pv-empty">
            <div class="pv-empty__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b6bcc3" stroke-width="1.5" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/></svg></div>
            <div class="pv-empty__t">Preview appears here</div>
            <div class="pv-empty__s">Choose a document to see its details.</div>
          </div>

          <div v-else-if="s.phase === 'idle'" class="pv-scroll">
            <div class="pv-label">{{ isEdit && !s.file ? "Current" : "Preview" }}</div>
            <div class="pv-doccard">
              <div class="pv-doccard__icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M9 13h6M9 17h6" stroke-linecap="round"/></svg></div>
              <div><div class="pv-doccard__name">{{ previewName }}</div><div class="pv-doccard__meta">{{ previewMeta }}</div></div>
            </div>
            <div class="pv-title">{{ s.title.trim() || previewName }}</div>
            <div class="pv-meta">{{ previewExt }}</div>
          </div>

          <div v-else-if="uploading" class="pv-center">
            <div class="ring" />
            <div class="pv-stage">{{ isEdit ? "Saving your changes…" : "Uploading your document…" }}</div>
            <div class="pv-bar-wrap">
              <div class="pv-pct">{{ indeterminate ? "" : Math.round(s.progress) + "%" }}</div>
              <div class="pv-bar"><div class="pv-bar__fill" :class="{ 'is-indet': indeterminate }" :style="indeterminate ? {} : { width: s.progress + '%' }" /></div>
              <div class="pv-bar__sub">{{ reindexing ? "Re-indexing continues in the library." : "Applying your changes." }}</div>
            </div>
          </div>

          <div v-else-if="s.phase === 'done'" class="pv-center">
            <div class="check"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
            <div class="pv-stage">{{ isEdit ? "Changes saved" : "Added to library" }}</div>
            <div class="pv-substage">{{ reindexing ? "The document is re-indexing. It'll show Processing, then Indexed." : "Your changes are live." }}</div>
          </div>

          <div v-else-if="s.phase === 'error'" class="pv-center">
            <div class="fail"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--err)" stroke-width="1.8"><circle cx="12" cy="12" r="9.2"/><path d="M12 8v5" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="0.6" fill="var(--err)"/></svg></div>
            <div class="pv-stage">{{ isEdit ? "Couldn't save" : "Ingestion failed" }}</div>
            <div class="pv-substage">{{ s.errors.submit || "Something went wrong. Your file is still attached — you can retry." }}</div>
            <button class="btn-primary" @click="submit">Try again</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-upload-overlay { position: fixed; inset: 0; background: rgba(18,22,27,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
.doc-upload-modal { background: #fff; width: 920px; max-width: 100%; height: min(560px, 88vh); border-radius: 16px; box-shadow: 0 24px 70px rgba(15,20,25,0.32); overflow: hidden; display: flex; flex-direction: column; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 20px 24px 14px; border-bottom: 1px solid var(--line-2); }
.head h3 { margin: 0; font-size: 18px; font-weight: 700; }
.head p { margin: 5px 0 0; color: var(--muted); font-size: 12.5px; line-height: 1.5; max-width: 470px; }
.x { border: none; background: transparent; color: #9aa1a9; font-size: 22px; line-height: 1; cursor: pointer; padding: 2px; }

.body { display: flex; min-height: 0; flex: 1; }
.form { width: 50%; padding: 20px 24px 22px; overflow-y: auto; border-right: 1px solid var(--line-2); display: flex; flex-direction: column; }
.preview { width: 50%; display: flex; flex-direction: column; background: #f7f8f9; min-width: 0; }

.lbl { display: block; font-size: 13px; font-weight: 600; margin: 18px 0 7px; }
.lbl:first-of-type { margin-top: 0; }
.req { color: var(--accent); }
.opt { color: #a4abb3; font-weight: 400; }
.input { width: 100%; border: 1px solid #d7dadf; border-radius: var(--radius-ctrl); padding: 10px 13px; font-size: 13.5px; font-family: inherit; outline: none; color: var(--ink); }
.input.is-err { border-color: #e3a79f; }
.err { color: var(--err); font-size: 12px; margin-top: 6px; }
.err--submit { margin-top: 12px; }
.note { margin-top: 14px; font-size: 12px; color: var(--muted); background: var(--accent-soft); border-radius: 9px; padding: 9px 12px; line-height: 1.5; }
.vis { display: flex; gap: 8px; }
.vis-opt { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #d7dadf; background: #fff; color: #5b6470; padding: 9px 12px; border-radius: var(--radius-ctrl); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.vis-opt.is-on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.vis-hint { font-size: 11.5px; color: #9aa1a9; margin-top: 6px; line-height: 1.45; }

.zone { border: 1.5px dashed #d2d6db; border-radius: 12px; background: #fbfbfc; cursor: pointer; display: flex; }
.zone--col { flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 24px 16px; text-align: center; }
.zone.is-drag { border-color: var(--accent); background: #fff6ef; }
.zone.is-err { border-color: #e3a79f; background: #fef7f6; }
.zone__icon { width: 40px; height: 40px; border-radius: 11px; background: #eef1f4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.zone__icon--accent { background: var(--accent-soft); }
.zone__t { font-size: 13px; color: #3a4048; }
.zone__sub { font-size: 11.5px; color: #9aa1a9; }
.link { color: var(--accent); font-weight: 600; }

.filecard { display: flex; align-items: center; gap: 12px; border: 1px solid #e2e4e7; border-radius: 11px; padding: 10px 12px; background: #fff; }
.filecard__doc { width: 34px; height: 34px; border-radius: 8px; background: #eef1f4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.filecard__doc--accent { background: var(--accent-soft); }
.filecard__text { min-width: 0; flex: 1; }
.filecard__text .ttl { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.filecard__text .sub { font-size: 11.5px; color: #9aa1a9; }
.del { border: none; background: transparent; cursor: pointer; color: #9aa1a9; padding: 5px; border-radius: 7px; line-height: 0; }
.del:hover { background: var(--err-bg); }
.del:disabled { cursor: default; opacity: 0.5; }

.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: auto; padding-top: 24px; }
.btn-ghost { border: 1px solid #e0e2e5; background: #fff; color: #3a4048; padding: 10px 20px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-ghost:disabled { color: #c3c8cf; cursor: default; }
.btn-primary { border: none; padding: 10px 22px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; font-family: inherit; color: #fff; background: var(--accent); cursor: pointer; }
.btn-primary:disabled { background: #f7b989; cursor: default; }

.pv-empty, .pv-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; padding: 32px; text-align: center; }
.pv-empty__icon { width: 56px; height: 56px; border-radius: 15px; background: #eef1f4; display: flex; align-items: center; justify-content: center; }
.pv-empty__t { font-size: 14px; font-weight: 600; color: var(--muted); }
.pv-empty__s { font-size: 12.5px; color: #9aa1a9; max-width: 240px; line-height: 1.5; }

.pv-scroll { flex: 1; overflow-y: auto; padding: 20px; }
.pv-label { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; color: #9aa1a9; text-transform: uppercase; margin-bottom: 12px; }
.pv-doccard { width: 100%; border-radius: 12px; background: #fff; border: 1px solid var(--line-2); padding: 22px; display: flex; align-items: center; gap: 14px; }
.pv-doccard__icon { width: 46px; height: 46px; border-radius: 12px; background: var(--accent-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pv-doccard__name { font-size: 13.5px; font-weight: 600; word-break: break-word; }
.pv-doccard__meta { font-size: 12px; color: #9aa1a9; margin-top: 2px; }
.pv-title { margin: 14px 0 4px; font-size: 15px; font-weight: 700; word-break: break-word; }
.pv-meta { font-size: 12.5px; color: #9aa1a9; }

.ring { width: 52px; height: 52px; border: 4px solid #ffe0c2; border-top-color: var(--accent); border-radius: 50%; animation: sa-spin 0.8s linear infinite; }
.pv-bar-wrap { width: 82%; max-width: 280px; }
.pv-pct { display: flex; justify-content: flex-end; font-size: 12px; color: var(--muted); margin-bottom: 6px; font-variant-numeric: tabular-nums; min-height: 15px; }
.pv-bar { height: 8px; background: #e6e8ea; border-radius: 999px; overflow: hidden; position: relative; }
.pv-bar__fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.12s linear; }
.pv-bar__fill.is-indet { position: absolute; width: 40%; animation: sa-indet 1.15s ease-in-out infinite alternate; margin-left: 0; }
.pv-bar__sub { font-size: 11.5px; color: #9aa1a9; margin-top: 8px; text-align: center; }
.pv-stage { font-size: 16px; font-weight: 700; }
.pv-substage { font-size: 12.5px; color: #9aa1a9; max-width: 260px; line-height: 1.5; }
.check { width: 58px; height: 58px; border-radius: 50%; background: var(--ok-bg); display: flex; align-items: center; justify-content: center; }
.fail { width: 58px; height: 58px; border-radius: 50%; background: var(--err-bg); display: flex; align-items: center; justify-content: center; }

@keyframes sa-indet { 0% { margin-left: 0%; } 100% { margin-left: 60%; } }
</style>
