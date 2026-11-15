<template>
  <SetupSectionCard
    title="Documents"
    hint="Manage AI knowledge base documents"
    description="Upload and manage documents that power the AI Negotiation Agent's knowledge base. All documents are chunked, embedded, and indexed into the vector database for retrieval."
  >
    <div class="docs-toolbar">
      <span class="docs-meta">
        <strong>{{ allDocuments.length }} documents</strong>
        <span class="dot-sep">·</span>
        <strong>{{ totalChunks }} chunks indexed</strong>
      </span>
      <button class="btn-primary" @click="uploadModalOpen = true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
        >
          <path d="M12 16V5" />
          <path d="m7 10 5-5 5 5" />
          <path d="M5 19h14" />
        </svg>
        Upload Documents
      </button>
    </div>

    <div class="table-wrap">
      <table class="doc-table">
        <thead>
          <tr>
            <th class="first">Document Name</th>
            <th>Type</th>
            <th>Chunks</th>
            <th>Author</th>
            <th>Updated at</th>
            <th>Status</th>
            <th class="last"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in allDocuments" :key="doc.uuid">
            <td class="first">
              <span class="doc-name">
                <svg
                  class="icon-doc"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                >
                  <path
                    d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
                  />
                  <path d="M14 3v5h5" />
                  <path d="M9 13h6M9 17h4" />
                </svg>
                <span>{{ doc.filename }}</span>
              </span>
            </td>
            <td>
              <span class="type-tag">{{
                doc.fileType.replace(".", "").toUpperCase()
              }}</span>
            </td>
            <td class="date-cell">{{ doc.chunkCount }}</td>
            <td class="date-cell">{{ doc.uploadedBy ?? "—" }}</td>
            <td class="date-cell">
              {{ doc.updatedAt ? formatDate(doc.updatedAt) : "—" }}
            </td>
            <td>
              <span
                v-if="doc.status === 'Upserted' || doc.status === 'completed'"
                class="status-pill indexed"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1.3 14.3-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"
                  />
                </svg>
                Indexed
              </span>
              <span
                v-else-if="doc.status === 'failed'"
                class="status-pill failed"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"
                  />
                </svg>
                Failed
              </span>
              <span v-else class="status-pill processing">
                <span class="spinner" />
                {{ sseStatusLabel(doc.status) }}
              </span>
            </td>
            <td class="last">
              <a-tooltip
                :title="
                  isInFlight(doc.status)
                    ? 'Document is still processing and cannot be deleted'
                    : 'Delete document'
                "
              >
                <button
                  class="row-menu delete"
                  aria-label="Delete document"
                  :disabled="deletingUuid === doc.uuid || isInFlight(doc.status)"
                  @click="deleteConfirmDoc = doc"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5M14 11v5" />
                  </svg>
                </button>
              </a-tooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="table-foot">{{ allDocuments.length }} documents</p>

    <UploadDocumentsModal
      v-if="uploadModalOpen"
      @close="uploadModalOpen = false"
      @uploaded="onUploaded"
    />

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div
        v-if="deleteConfirmDoc"
        class="modal-backdrop"
        @click.self="deleteConfirmDoc = null"
      >
        <div
          class="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div class="modal-icon-wrap">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v5M14 11v5" />
            </svg>
          </div>
          <h3 id="delete-modal-title" class="modal-title">Delete document?</h3>
          <p class="modal-body">
            <strong>{{ deleteConfirmDoc.filename }}</strong> will be permanently
            removed from the knowledge base and all its indexed chunks will be
            deleted. This cannot be undone.
          </p>
          <div class="modal-actions">
            <button class="modal-btn cancel" @click="deleteConfirmDoc = null">
              Cancel
            </button>
            <button
              class="modal-btn danger"
              :disabled="!!deletingUuid"
              @click="confirmDelete"
            >
              <span v-if="deletingUuid" class="spinner spinner-white" />
              <span v-else>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </SetupSectionCard>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import SetupSectionCard from "@/components/admin/SetupSectionCard.vue";
import UploadDocumentsModal from "@/components/admin/UploadDocumentsModal.vue";
import { ingestionApi } from "@/api/ingestion.api";
import type { UploadedDocInfo } from "@/api/ingestion.api";
import type { KbDocument } from "@/api/settings.api";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/auth.store";

const props = defineProps<{
  documents: KbDocument[];
}>();
const emit = defineEmits<{ changed: [] }>();
const { showToast } = useToast();
const authStore = useAuthStore();

const uploadModalOpen = ref(false);
const deletingUuid = ref<string | null>(null);
const deleteConfirmDoc = ref<KbDocument | null>(null);
const pendingDocs = ref<KbDocument[]>([]);
const sseAbortControllers = ref<AbortController[]>([]);
const ingestionProgress = ref<
  Record<string, { status: string; chunkCount?: number }>
>({});

const INGESTION_BASE = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_INGESTION_API_URL || "";

const TERMINAL_KB_STATUSES = new Set([
  "Upserted",
  "completed",
  "Empty",
  "Failed",
  "failed",
  "duplicated",
]);
const activeSseFileIds = new Set<string>();

function subscribeToIngestion(fileId: string) {
  if (activeSseFileIds.has(fileId)) return;
  activeSseFileIds.add(fileId);
  const controller = new AbortController();
  sseAbortControllers.value.push(controller);
  openSseStream(
    fileId,
    `${INGESTION_BASE}/ingest/files/${fileId}/events`,
    controller,
  );
}

const SSE_STATUS_LABELS: Record<string, string> = {
  parsing: "Parsing…",
  chunking: "Chunking…",
  embedding: "Embedding…",
  indexing: "Indexing…",
};

function sseStatusLabel(status: string): string {
  return SSE_STATUS_LABELS[status] ?? "Processing…";
}

function isInFlight(status: string): boolean {
  return !TERMINAL_KB_STATUSES.has(status);
}

function applyIngestionProgress(doc: KbDocument): KbDocument {
  const live = ingestionProgress.value[doc.uuid];
  if (!live) return doc;
  return {
    ...doc,
    status: live.status,
    ...(live.chunkCount !== undefined ? { chunkCount: live.chunkCount } : {}),
  };
}

// Combined list: pending (optimistic) docs first, then API docs (excluding any already pending by UUID)
const allDocuments = computed<KbDocument[]>(() => {
  const pendingUuids = new Set(pendingDocs.value.map((d) => d.uuid));
  return [
    ...pendingDocs.value.map(applyIngestionProgress),
    ...props.documents
      .filter((d) => !pendingUuids.has(d.uuid))
      .map(applyIngestionProgress),
  ];
});

const totalChunks = computed(() =>
  allDocuments.value.reduce((sum, d) => sum + d.chunkCount, 0).toLocaleString(),
);

// Only drop pending docs once the API reports a terminal status. A refresh triggered
// by another file finishing can include in-progress docs and must not detach SSE.
watch(
  () => props.documents,
  (newDocs) => {
    pendingDocs.value = pendingDocs.value.filter((pending) => {
      const apiDoc = newDocs.find((d) => d.uuid === pending.uuid);
      if (!apiDoc || !TERMINAL_KB_STATUSES.has(apiDoc.status)) return true;
      delete ingestionProgress.value[pending.uuid];
      return false;
    });
    // Resume live status for any in-flight doc (e.g. after a page refresh),
    // which otherwise has no SSE stream and would stay stuck on "Processing".
    for (const doc of newDocs) {
      if (!TERMINAL_KB_STATUSES.has(doc.status)) subscribeToIngestion(doc.uuid);
    }
  },
  { immediate: true },
);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SseEvent = {
  file_uuid: string;
  status: string;
  progress?: number;
  chunk_count?: number;
  error?: string;
  existing_file_uuid?: string;
};

async function openSseStream(
  fileId: string,
  url: string,
  controller: AbortController,
) {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      signal: controller.signal,
    });

    if (!response.ok || !response.body) return;

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6)) as SseEvent;

          ingestionProgress.value = {
            ...ingestionProgress.value,
            [fileId]: {
              status: data.status,
              ...(data.chunk_count !== undefined
                ? { chunkCount: data.chunk_count }
                : {}),
            },
          };

          const doc = pendingDocs.value.find((d) => d.uuid === fileId);
          if (doc) {
            doc.status = data.status;
            if (data.chunk_count !== undefined)
              doc.chunkCount = data.chunk_count;
          }

          if (
            data.status === "completed" ||
            data.status === "failed" ||
            data.status === "duplicated"
          ) {
            controller.abort();
            if (data.status === "completed") {
              emit("changed");
            } else if (data.status === "duplicated") {
              // No DB row is created for a duplicate — drop the optimistic row
              // and point the user at the existing document instead.
              pendingDocs.value = pendingDocs.value.filter(
                (d) => d.uuid !== fileId,
              );
              delete ingestionProgress.value[fileId];
              showToast("Document already exists — skipped duplicate", "warning");
            } else {
              delete ingestionProgress.value[fileId];
            }
            return;
          }
        } catch {
          // ignore malformed event
        }
      }
    }
  } catch {
    // Stream ended (abort on terminal/unmount, or a network error); cleanup runs below.
  } finally {
    activeSseFileIds.delete(fileId);
    sseAbortControllers.value = sseAbortControllers.value.filter(
      (c) => c !== controller,
    );
  }
}

function onUploaded(docs: UploadedDocInfo[]) {
  for (const { fileId, filename, eventsUrl } of docs) {
    const ext = "." + (filename.split(".").pop() ?? "").toLowerCase();

    const optimisticDoc: KbDocument = {
      uuid: fileId,
      filename,
      fileType: ext,
      status: "parsing",
      isAlreadyUploaded: false,
      chunkCount: 0,
      uploadedBy: null,
      updatedAt: new Date().toISOString(),
    };
    pendingDocs.value.unshift(optimisticDoc);

    const controller = new AbortController();
    sseAbortControllers.value.push(controller);
    openSseStream(fileId, INGESTION_BASE + eventsUrl, controller);
  }
}

onUnmounted(() => {
  sseAbortControllers.value.forEach((c) => c.abort());
});

async function confirmDelete() {
  const doc = deleteConfirmDoc.value;
  if (!doc || deletingUuid.value) return;

  // Hard backstop: never delete a document that is still ingesting, even if the
  // confirm modal was somehow reached for an in-flight row.
  if (isInFlight(doc.status)) {
    showToast("Document is still processing — cannot delete yet", "error");
    deleteConfirmDoc.value = null;
    return;
  }

  deletingUuid.value = doc.uuid;
  try {
    await ingestionApi.deleteDocument(doc.uuid);
    deleteConfirmDoc.value = null;
    showToast("Document deleted");
    pendingDocs.value = pendingDocs.value.filter((d) => d.uuid !== doc.uuid);
    delete ingestionProgress.value[doc.uuid];
    emit("changed");
  } catch (err) {
    console.error("Failed to delete document", err);
    showToast("Failed to delete document", "error");
  } finally {
    deletingUuid.value = null;
  }
}
</script>

<style scoped>
/* ── Toolbar ── */
.docs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.docs-meta {
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.docs-meta strong {
  color: var(--ink-2);
  font-weight: 600;
}

.dot-sep {
  color: var(--muted-2);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  white-space: nowrap;
}

.btn-primary:hover {
  background: var(--orange-600);
}

.btn-primary svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* ── Table ── */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.doc-table thead th {
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  background: #fafafa;
  white-space: nowrap;
}

.doc-table thead th.first {
  padding-left: 16px;
}
.doc-table thead th.last {
  width: 48px;
  padding: 0;
}

.doc-table tbody td {
  padding: 16px;
  border-bottom: 1px solid var(--line-2);
  color: var(--ink-2);
  white-space: nowrap;
  vertical-align: middle;
  background: #fff;
}

.doc-table tbody td.first {
  padding-left: 16px;
}
.doc-table tbody td.last {
  padding: 0 8px 0 0;
  text-align: right;
}
.doc-table tbody tr:last-child td {
  border-bottom: none;
}

/* ── Document name ── */
.doc-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.icon-doc {
  width: 16px;
  height: 16px;
  color: var(--muted-2);
  flex-shrink: 0;
}

.doc-name a {
  color: var(--teal);
  text-decoration: none;
  font-weight: 500;
}

.doc-name a:hover {
  text-decoration: underline;
}

/* ── Type tag ── */
.type-tag {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.03em;
}

/* ── Uploader ── */
.uploader {
  color: var(--muted);
  font-size: 13px;
}

/* ── Date ── */
.date-cell {
  color: var(--muted);
}

/* ── Playbook chips ── */
.playbooks {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.pb-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--chip);
  color: var(--muted);
}

.pb-chip.on {
  background: #dcfce7;
  color: #16a34a;
}

.pb-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* ── Status pills ── */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
}

.status-pill svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.status-pill.indexed {
  background: #dcfce7;
  color: #16a34a;
}

.status-pill.processing {
  background: #fff7ed;
  color: var(--orange-600);
}

.status-pill.failed {
  background: #fee2e2;
  color: #b91c1c;
}

/* CSS spinner */
.spinner {
  width: 11px;
  height: 11px;
  border: 2px solid #fed7aa;
  border-top-color: var(--orange);
  border-radius: 50%;
  flex-shrink: 0;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Row menu ── */
.row-menu {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted-2);
  border-radius: 6px;
  cursor: pointer;
}

.row-menu:hover {
  background: var(--line-2);
  color: var(--ink);
}

.row-menu.delete:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.row-menu:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.row-menu svg {
  width: 16px;
  height: 16px;
}

/* ── Footer ── */
.table-foot {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

/* ── Delete modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-card {
  background: #fff;
  border-radius: 14px;
  padding: 32px 28px 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.modal-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b91c1c;
  margin-bottom: 4px;
}

.modal-icon-wrap svg {
  width: 22px;
  height: 22px;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.modal-body {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
  margin: 0 0 6px;
}

.modal-body strong {
  color: var(--ink-2);
  font-weight: 600;
  word-break: break-all;
}

.modal-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
}

.modal-btn {
  flex: 1;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  transition: background 0.15s;
}

.modal-btn.cancel {
  background: var(--line-2, #f3f4f6);
  color: var(--ink-2);
}

.modal-btn.cancel:hover {
  background: var(--line, #e5e7eb);
}

.modal-btn.danger {
  background: #dc2626;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.modal-btn.danger:hover:not(:disabled) {
  background: #b91c1c;
}
.modal-btn.danger:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spinner-white {
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}
</style>
