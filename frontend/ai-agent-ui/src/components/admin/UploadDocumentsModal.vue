<template>
  <Teleport to="body">
    <div class="upload-docs-overlay" @click.self="close">
      <div class="upload-docs-modal">
        <!-- Head -->
        <div class="modal-head">
          <h2 class="modal-title" id="upload-title">Upload Documents</h2>
          <a-tooltip title="Close">
            <button
              class="modal-close"
              aria-label="Close"
              @click="emit('close')"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </a-tooltip>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Drop zone -->
          <div
            class="dropzone"
            :class="{ 'drag-over': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <svg
              class="up-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            >
              <path d="M12 16V5" />
              <path d="m7 10 5-5 5 5" />
              <path d="M4 19h16" />
            </svg>
            <div class="dz-title">Drag and drop files here</div>
            <div class="dz-or">or</div>
            <label class="btn-browse">
              Browse Files
              <input
                type="file"
                multiple
                hidden
                accept=".pdf,.docx,.doc,.txt"
                :disabled="uploading"
                @change="onFileChange"
              />
            </label>
            <div class="dz-hint">
              Supported: PDF, DOCX, DOC, TXT · Max 50MB per file
            </div>

            <ul v-if="files.length" class="file-list">
              <li v-for="f in files" :key="f.name">{{ f.name }}</li>
            </ul>
          </div>

          <!-- Form column -->
          <div class="form-col">
            <div class="form-group">
              <h3>Document Details</h3>
              <div class="field">
                <label for="desc">Description (optional)</label>
                <input
                  id="desc"
                  class="control"
                  type="text"
                  placeholder="Brief description of this document's purpose…"
                  v-model="description"
                  :disabled="uploading"
                />
              </div>
            </div>

            <div class="form-group">
              <h3>Playbooks</h3>
              <p class="pb-hint">
                Choose which negotiation playbooks these documents feed.
              </p>

              <div class="toggle-row">
                <span class="toggle-label">
                  <span class="pb-dot green" />
                  Term Extension
                </span>
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="pbTermExtension"
                    :disabled="uploading"
                  />
                  <span class="track" />
                  <span class="thumb" />
                </label>
              </div>

              <div class="toggle-row">
                <span class="toggle-label">
                  <span class="pb-dot blue" />
                  Term Extension + SCF
                </span>
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="pbTermScf"
                    :disabled="uploading"
                  />
                  <span class="track" />
                  <span class="thumb" />
                </label>
              </div>
            </div>

            <div class="form-group">
              <h3>Processing</h3>
              <div class="check-row">
                <label class="check">
                  <input
                    type="checkbox"
                    v-model="replaceExisting"
                    :disabled="uploading"
                  />
                  <span class="box">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3.2"
                    >
                      <path d="m5 12 5 5 9-11" />
                    </svg>
                  </span>
                  Replace existing document with same name
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Foot -->
        <div class="modal-foot">
          <span class="note">{{ footerNote }}</span>
          <button class="btn-ghost" :disabled="uploading" @click="close">
            Cancel
          </button>
          <button
            class="btn-upload"
            :disabled="!files.length || uploading"
            @click="onUpload"
          >
            {{ uploading ? "Uploading…" : "Upload" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ingestionApi } from "@/api/ingestion.api";
import type { UploadedDocInfo } from "@/api/ingestion.api";
import { useToast } from "@/composables/useToast";

const emit = defineEmits<{ close: []; uploaded: [docs: UploadedDocInfo[]] }>();
const { showToast } = useToast();

const files = ref<File[]>([]);
const description = ref("");
const pbTermExtension = ref(true);
const pbTermScf = ref(true);
const replaceExisting = ref(true);
const isDragging = ref(false);
const uploading = ref(false);

const footerNote = computed(() =>
  uploading.value
    ? `Uploading ${files.value.length} file${files.value.length === 1 ? "" : "s"}…`
    : "Files will be chunked, embedded, and indexed automatically.",
);

function close() {
  if (!uploading.value) emit("close");
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) files.value = [...input.files];
}

function onDrop(e: DragEvent) {
  if (uploading.value) return;
  isDragging.value = false;
  if (e.dataTransfer?.files) files.value = [...e.dataTransfer.files];
}

async function onUpload() {
  if (!files.value.length || uploading.value) return;
  uploading.value = true;
  const uploadedDocs: UploadedDocInfo[] = [];
  try {
    for (const file of files.value) {
      const res = await ingestionApi.uploadDocument({
        file,
        isAlreadyUploaded: replaceExisting.value,
        strategyTermExtension: pbTermExtension.value,
        strategyTermExtensionScf: pbTermScf.value,
        description: description.value,
      });
      uploadedDocs.push({
        fileId: res.data.file_id,
        filename: file.name,
        eventsUrl: res.data.events_url,
      });
    }
    showToast(
      `${files.value.length} document${files.value.length === 1 ? "" : "s"} accepted for ingestion`,
    );
    emit("uploaded", uploadedDocs);
    emit("close");
  } catch (err) {
    console.error("Failed to upload document", err);
    showToast("Failed to upload document", "error");
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
/* ── Overlay ── */
.upload-docs-overlay {
  position: fixed;
  inset: 0;
  background: rgba(100, 100, 120, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 80px 24px 24px;
}

/* ── Modal shell ── */
.upload-docs-modal {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.16);
  width: 900px;
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

/* ── Head ── */
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.modal-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
}
.modal-close:hover {
  background: var(--line-2);
  color: var(--ink);
}
.modal-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Body ── */
.modal-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* ── Drop zone ── */
.dropzone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 2px dashed var(--line);
  border-radius: 10px;
  margin: 20px 10px 20px 20px;
  padding: 32px 20px;
  text-align: center;
  background: #fff;
  transition:
    border-color 0.15s,
    background 0.15s;
  cursor: default;
}
.dropzone.drag-over {
  border-color: var(--orange);
  background: var(--orange-50);
}

.up-icon {
  width: 40px;
  height: 40px;
  color: var(--muted-2);
}

.dz-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
}

.dz-or {
  font-size: 13px;
  color: var(--muted-2);
}

.btn-browse {
  display: inline-flex;
  align-items: center;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 10px 32px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-browse:hover {
  background: var(--orange-600);
}

.dz-hint {
  font-size: 11.5px;
  color: var(--muted-2);
}

.file-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  width: 100%;
  font-size: 12px;
  color: var(--ink-2);
}
.file-list li {
  padding: 3px 8px;
  background: var(--line-2);
  border-radius: 4px;
  margin-bottom: 4px;
  text-align: left;
}

/* ── Form column ── */
.form-col {
  width: 360px;
  flex-shrink: 0;
  padding: 20px 20px 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group h3 {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 10px;
}

.pb-hint {
  font-size: 12px;
  color: var(--muted);
  margin: -6px 0 10px;
  line-height: 1.4;
}

/* Description field */
.field label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}

.control {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 13px;
  color: var(--ink);
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}
.control:focus {
  border-color: var(--orange);
}
.control::placeholder {
  color: var(--muted-2);
}

/* ── Toggle row ── */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 20px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-2);
}

.pb-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pb-dot.green {
  background: #16a34a;
}
.pb-dot.blue {
  background: #3b82f6;
}

/* Custom switch */
.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.track {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: var(--line);
  transition: background 0.15s;
  display: block;
}

.thumb {
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: left 0.15s;
  display: block;
}

.switch input:checked + .track {
  background: var(--orange);
}
.switch input:checked + .track + .thumb {
  left: 18px;
}

/* ── Custom checkbox ── */
.check-row {
  margin-top: 4px;
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
  line-height: 1.4;
}

.check input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--line);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.box svg {
  width: 10px;
  height: 10px;
  color: transparent;
}

.check input:checked + .box {
  background: var(--orange);
  border-color: var(--orange);
}
.check input:checked + .box svg {
  color: #fff;
}

/* ── Footer ── */
.modal-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px 20px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}

.note {
  flex: 1;
  font-size: 12px;
  font-style: italic;
  color: var(--muted-2);
}

.btn-ghost {
  background: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  font-family: inherit;
}
.btn-ghost:hover {
  background: var(--line-2);
}
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-upload {
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 22px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s,
    opacity 0.15s;
}
.btn-upload:hover:not(:disabled) {
  background: var(--orange-600);
}
.btn-upload:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
