<script setup lang="ts">
/**
 * SupportDocumentsSection — Documents library backed by the Support backend (:8002),
 * GET /documents (server-side search + pagination). Upload goes to the ingestion
 * service (POST /ingest/document). A new upload appears as Processing, then flips to
 * Indexed on the next quiet refresh.
 */
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import SetupSectionCard from "./SetupSectionCard.vue";
import FileTypeIcon from "./FileTypeIcon.vue";
import DocumentUploadModal from "./DocumentUploadModal.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import { fetchDocuments, deleteDocument, fetchDocumentUrl } from "@/api/documents.list";
import { ingestionApi } from "@/api/ingestion.service";
import type { SupportDoc } from "@/data/supportDocuments";

const emit = defineEmits<{ (e: "count", n: number): void }>();

const PER_PAGE = 8;
// Search hits the server (GET /documents?q=), so wait until typing settles before firing.
const SEARCH_DEBOUNCE_MS = 500;

const docs = ref<SupportDoc[]>([]);
const total = ref(0);
const loading = ref(true);
const search = ref("");
const page = ref(1);
// One modal, two modes: create (Upload Document) and edit (row → Edit).
const modalOpen = ref(false);
const modalMode = ref<"create" | "edit">("create");
const editing = ref<SupportDoc | null>(null);

const openMenuId = ref<string | null>(null);
const menuPos = ref({ x: 0, y: 0 });

let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function load(quiet = false) {
  if (!quiet) loading.value = true;
  try {
    const res = await fetchDocuments({ q: search.value, page: page.value, pageSize: PER_PAGE });
    docs.value = res.items;
    total.value = res.total;
    emit("count", res.total);
  } finally {
    if (!quiet) loading.value = false;
    schedulePoll();
    watchProcessingRows();
  }
}
onMounted(load);

// Poller backstop: while any row is processing, quietly re-fetch until none remain
// (also resumes after a page reload). Per-row SSE below makes the stage update live.
let pollTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePoll() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  if (docs.value.some((d) => d.status === "processing")) {
    pollTimer = setTimeout(() => load(true), 4000);
  }
}
onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer);
  // Drop any pending debounced search so it can't fire load() after unmount.
  if (searchTimer) clearTimeout(searchTimer);
  for (const c of controllers.values()) c.abort();
});

// Per-row SSE: stream the live sub-stage (Processing → Indexing → Indexed) for each
// processing document; deduped, aborted after a cap, reconciled via load() when it ends.
const watched = new Set<string>();
const controllers = new Map<string, AbortController>();
const WATCH_TIMEOUT_MS = 6 * 60 * 1000;
const DOC_STAGE: Record<string, string> = { uploading: "Processing", processing: "Processing", upserting: "Indexing" };
function applyRow(id: string, patch: Partial<SupportDoc>) {
  const row = docs.value.find((x) => x.id === id);
  if (row) Object.assign(row, patch);
}
function watchProcessingRows() {
  for (const d of docs.value) {
    if (d.status === "processing" && !watched.has(d.id)) {
      watched.add(d.id);
      void watchDocRow(d.id);
    }
  }
}
async function watchDocRow(id: string) {
  const ctrl = new AbortController();
  controllers.set(id, ctrl);
  const cap = setTimeout(() => ctrl.abort(), WATCH_TIMEOUT_MS);
  try {
    await ingestionApi.trackDocument(id, (ev) => {
      if (ev.status === "upserted" || ev.status === "empty") applyRow(id, { status: "indexed", stage: undefined });
      else if (ev.status === "failed") applyRow(id, { status: "failed", stage: undefined });
      else applyRow(id, { stage: DOC_STAGE[ev.status] ?? "Processing" });
    }, ctrl.signal);
  } catch { /* ignore (incl. AbortError) — the poller reconciles */ } finally {
    clearTimeout(cap);
    controllers.delete(id);
    // Keep the id in `watched` so a stuck row is never re-watched (avoids a reconnect loop).
    load(true);
  }
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)));
const showEmpty = computed(() => !loading.value && total.value === 0 && !search.value.trim());
const showNoResults = computed(() => !loading.value && docs.value.length === 0 && !!search.value.trim());
const showTable = computed(() => !loading.value && docs.value.length > 0);

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; load(); }, SEARCH_DEBOUNCE_MS);
}
function prevPage() { if (page.value > 1) { page.value--; load(); } }
function nextPage() { if (page.value < pageCount.value) { page.value++; load(); } }

function statusMeta(d: SupportDoc) {
  if (d.status === "processing") return { label: d.stage || "Processing", cls: "warn", spin: true };
  if (d.status === "failed") return { label: "Failed", cls: "err" };
  return { label: "Indexed", cls: "ok" };
}

function toggleMenu(id: string, e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  openMenuId.value = openMenuId.value === id ? null : id;
  menuPos.value = { x: r.right - 172, y: r.bottom + 6 };
}
function closeMenu() { openMenuId.value = null; }

function openCreate() {
  modalMode.value = "create";
  editing.value = null;
  modalOpen.value = true;
}

function openEdit(id: string) {
  closeMenu();
  const d = docs.value.find((x) => x.id === id);
  if (!d) return;
  editing.value = d;
  modalMode.value = "edit";
  modalOpen.value = true;
}

// After an edit: reload. When the file changed the row re-indexes — drop it from
// `watched` so load() re-attaches the live SSE watcher for the fresh Processing run.
async function onDocUpdated(p: { documentId: string; reprocessing: boolean }) {
  if (p.reprocessing) watched.delete(p.documentId);
  await load(p.reprocessing);
}

// Delete flow: confirm first, then DELETE /documents/{id} (cascades to GCS + vector DB),
// keeping the dialog loading until the row is gone and the list reloaded.
const confirmOpen = ref(false);
const confirmBusy = ref(false);
const pendingDelete = ref<SupportDoc | null>(null);

function askRemove(id: string) {
  closeMenu();
  const d = docs.value.find((x) => x.id === id);
  if (!d) return;
  pendingDelete.value = d;
  confirmOpen.value = true;
}

async function confirmRemove() {
  const d = pendingDelete.value;
  if (!d) return;
  confirmBusy.value = true;
  try {
    await deleteDocument(d.id);
    await load();
    confirmOpen.value = false;
    pendingDelete.value = null;
  } finally {
    confirmBusy.value = false;
  }
}

const dlId = ref<string | null>(null);
const dlError = ref<string | null>(null);
async function onDownload(d: SupportDoc) {
  if (dlId.value) return;
  dlId.value = d.id;
  dlError.value = null;
  // Fetch the short-lived signed URL, then open it — or surface an error instead of
  // failing silently.
  try {
    const url = await fetchDocumentUrl(d.id);
    window.open(url, "_blank", "noopener");
  } catch {
    dlError.value = `Couldn't open "${d.name}" — it may have no stored file.`;
  } finally {
    dlId.value = null;
  }
}

// The modal closes as soon as the document upload is ACCEPTED (202). The server then
// parses/chunks/indexes in the background; we show the new Processing row and the poller
// flips it to Indexed when the server finishes.
async function onAccepted() {
  page.value = 1;
  search.value = "";
  await load();
}
</script>

<template>
  <SetupSectionCard
    title="Support Documents"
    description="Documents uploaded to the Support Assistant's knowledge base. Text is extracted, chunked and indexed for retrieval."
  >
    <template #icon>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4" /><path d="M9 13h6M9 17h6" stroke-linecap="round" /></svg>
    </template>

    <!-- toolbar -->
    <div class="toolbar">
      <div class="toolbar__left">
        <span class="count">{{ total }} {{ total === 1 ? "document" : "documents" }}</span>
        <div class="searchbox">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a4abb3" stroke-width="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" stroke-linecap="round" /></svg>
          <input v-model="search" @input="onSearch" placeholder="Search by name…" />
        </div>
      </div>
      <button class="btn-primary" @click="openCreate()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V5M8 9l4-4 4 4M5 19h14" /></svg>
        Upload Document
      </button>
    </div>

    <div v-if="dlError" class="dl-error" role="alert">{{ dlError }}</div>

    <div class="thead">
      <div>Document Name</div><div>Type</div><div>Chunks</div><div>Updated At</div><div>Download</div><div>Status</div>
    </div>

    <!-- loading skeletons -->
    <template v-if="loading">
      <div v-for="n in 5" :key="n" class="trow trow--skel">
        <div class="cell-name"><div class="skel" style="width:27px;height:31px;border-radius:4px" /><div class="skel" style="height:11px;width:60%" /></div>
        <div class="skel" style="height:11px;width:34px" />
        <div class="skel" style="height:11px;width:28px" />
        <div class="skel" style="height:11px;width:82px" />
        <div class="skel" style="height:16px;width:16px;border-radius:4px" />
        <div class="skel" style="height:22px;width:92px;border-radius:999px" />
      </div>
    </template>

    <template v-else-if="showTable">
      <div v-for="d in docs" :key="d.id" class="trow">
        <div class="cell-name">
          <FileTypeIcon :ext="d.type" />
          <div class="cell-name__text">
            <div class="ttl">
              {{ d.title || d.name }}
              <span class="vis-badge" :class="d.isPublic ? 'vis-badge--pub' : 'vis-badge--priv'">{{ d.isPublic ? "Public" : "Private" }}</span>
            </div>
            <div v-if="d.title" class="sub">{{ d.name }}</div>
          </div>
        </div>
        <div class="muted">{{ d.type }}</div>
        <div class="muted">{{ d.chunks === 0 ? "—" : d.chunks }}</div>
        <div class="muted">{{ d.date }}</div>
        <div class="cell-dl">
          <button class="dl-btn" title="Download document" :disabled="dlId === d.id" @click.stop="onDownload(d)">
            <svg v-if="dlId !== d.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4" /><path d="M5 21h14" /></svg>
            <span v-else class="dl-spin" />
          </button>
        </div>
        <div class="cell-status">
          <span class="pill" :class="'pill--' + statusMeta(d).cls">
            <span v-if="statusMeta(d).spin" class="pill__spin" />
            <span v-else class="pill__dot" />
            {{ statusMeta(d).label }}
          </span>
          <button class="kebab" @click.stop="toggleMenu(d.id, $event)" aria-label="Row actions">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
          </button>
        </div>
      </div>

      <div v-if="pageCount > 1" class="pager">
        <button class="btn-page" :disabled="page <= 1" @click="prevPage">‹ Prev</button>
        <span class="pager__label">Page {{ page }} of {{ pageCount }}</span>
        <button class="btn-page" :disabled="page >= pageCount" @click="nextPage">Next ›</button>
      </div>
    </template>

    <div v-else-if="showNoResults" class="empty">No documents match “{{ search }}”.</div>
    <div v-else-if="showEmpty" class="empty">No documents yet — click Upload Document to add one.</div>
  </SetupSectionCard>

  <!-- row actions menu -->
  <template v-if="openMenuId != null">
    <div class="menu-overlay" @click="closeMenu" />
    <div class="menu" :style="{ left: menuPos.x + 'px', top: menuPos.y + 'px' }">
      <button class="menu__item" @click="openEdit(openMenuId)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b6470" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
        Edit
      </button>
      <button class="menu__item menu__item--danger" @click="askRemove(openMenuId)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
        Remove from list
      </button>
    </div>
  </template>

  <DocumentUploadModal v-model="modalOpen" :mode="modalMode" :doc="editing" @accepted="onAccepted" @updated="onDocUpdated" />
  <ConfirmDialog
    v-model="confirmOpen"
    :busy="confirmBusy"
    title="Delete this document?"
    :message="pendingDelete ? `“${pendingDelete.title || pendingDelete.name}” will be permanently removed from storage and the knowledge base. This can’t be undone.` : ''"
    confirm-label="Delete document"
    @confirm="confirmRemove"
  />
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 0 26px 8px; }
.dl-error { margin: 0 26px 10px; padding: 7px 12px; font-size: 12.5px; color: #b42318; background: #fef3f2; border: 1px solid #fecdca; border-radius: 8px; }
.toolbar__left { display: flex; align-items: center; gap: 16px; }
.count { font-size: 13.5px; font-weight: 600; white-space: nowrap; }
.searchbox { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e4e7; border-radius: var(--radius-ctrl); padding: 8px 12px; width: 280px; background: #fbfbfc; }
.searchbox input { border: none; outline: none; background: transparent; font-size: 13.5px; font-family: inherit; width: 100%; color: var(--ink); }
.btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: #fff; border: none; padding: 10px 18px; border-radius: var(--radius-ctrl); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }

.thead, .trow { display: grid; grid-template-columns: minmax(220px, 1fr) 80px 90px 140px 90px 160px; align-items: center; }
.cell-dl { display: flex; }
.dl-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #e2e4e7; background: #fff; color: #5b6470; border-radius: 8px; cursor: pointer; }
.dl-btn:hover { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-ring, #ffcfa8); }
.dl-btn:disabled { cursor: default; opacity: 0.6; }
.dl-spin { width: 13px; height: 13px; border: 2px solid #e2e4e7; border-top-color: var(--accent); border-radius: 50%; animation: sa-spin 0.7s linear infinite; }
.thead { padding: 12px 26px; border-top: 1px solid var(--line-2); border-bottom: 1px solid var(--line-2); font-size: 11px; font-weight: 600; letter-spacing: 0.6px; color: #9aa1a9; text-transform: uppercase; }
.trow { padding: 15px 26px; border-bottom: 1px solid #f2f3f5; font-size: 13px; }
.muted { color: var(--muted); font-size: 13px; }
.cell-name { display: flex; align-items: center; gap: 11px; min-width: 0; }
.cell-name__text { min-width: 0; }
.cell-name__text .ttl { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vis-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; padding: 1px 7px; border-radius: 999px; margin-left: 8px; vertical-align: middle; }
.vis-badge--pub { background: var(--ok-bg); color: var(--ok); }
.vis-badge--priv { background: #eef0f2; color: #6b7280; }
.cell-name__text .sub { font-size: 11.5px; color: #9aa1a9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.cell-status { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

.skel { background: linear-gradient(90deg, #eef0f2 25%, #f6f7f8 37%, #eef0f2 63%); background-size: 900px 100%; animation: sa-shimmer 1.4s infinite linear; border-radius: 6px; }
.trow--skel { pointer-events: none; }

.pill { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; padding: 5px 12px 5px 10px; border-radius: 999px; white-space: nowrap; }
.pill--ok { background: var(--ok-bg); color: var(--ok); box-shadow: inset 0 0 0 1px rgba(26,127,60,0.14); }
.pill--warn { background: var(--warn-bg); color: var(--warn); box-shadow: inset 0 0 0 1px rgba(179,105,10,0.14); }
.pill--err { background: var(--err-bg); color: var(--err); box-shadow: inset 0 0 0 1px rgba(192,57,43,0.14); }
.pill__dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pill__spin { display: inline-block; width: 11px; height: 11px; border: 2px solid #f0cba0; border-top-color: var(--warn); border-radius: 50%; animation: sa-spin 0.7s linear infinite; }

.kebab { border: none; background: transparent; color: #b6bcc3; cursor: pointer; padding: 4px; border-radius: 6px; line-height: 0; }
.kebab:hover { background: #f2f3f5; color: #5b6470; }

.menu-overlay { position: fixed; inset: 0; z-index: 60; }
.menu { position: fixed; z-index: 61; width: 172px; background: #fff; border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 12px 34px rgba(15,20,25,0.16); padding: 6px; }
.menu__item { display: flex; align-items: center; gap: 9px; width: 100%; border: none; background: transparent; padding: 9px 10px; border-radius: 7px; font-size: 13px; font-family: inherit; color: var(--ink); cursor: pointer; }
.menu__item:hover { background: #f5f6f7; }
.menu__item--danger { color: #c0392b; }

.pager { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 16px 26px; }
.pager__label { font-size: 13px; color: var(--muted); padding: 0 6px; }
.btn-page { border: 1px solid #e2e4e7; background: #fff; color: #3a4048; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; }
.btn-page:disabled { color: #c3c8cf; cursor: default; }
.empty { padding: 36px 26px; text-align: center; color: #9aa1a9; font-size: 13px; }
</style>
