<template>
  <div class="msg msg-bot">
    <div class="msg-avatar"><img src="/logo.png?v=2" alt="logo" /></div>
    <div class="msg-content">
      <div class="agent-card">
        <button
          v-if="message.isPlaybook && message.playbook"
          class="playbook-entry"
          type="button"
          @click="emit('open-playbook', message.playbook)"
        >
          <div class="playbook-entry-copy">
            <div class="playbook-entry-kicker">Negotiation Playbook</div>
            <div class="playbook-entry-title">
              {{ message.playbook.supplierName ?? "Open playbook" }}
            </div>
          </div>
          <div class="playbook-entry-cta">Open</div>
        </button>

        <template v-else>
          <SupplierFactsCard
            v-if="message.summaryCard"
            :card="message.summaryCard"
            @expand="emit('open-summary-card', message.summaryCard)"
          />

          <div
            v-if="!message.summaryCard || bodyText.trim()"
            class="msg-summary"
            :class="{ 'msg-summary--card': message.summaryCard }"
            v-html="renderMarkdown(bodyText, visualContext)"
          />
        </template>
        <span
          v-if="message.streaming"
          class="streaming-cursor"
          aria-hidden="true"
        />

        <div
          v-show="
            !message.streaming && message.followups && message.followups.length
          "
          class="msg-followups"
        >
          <div class="cites-l">Suggested follow-ups</div>
          <div class="follow-row">
            <button
              v-for="f in message.followups"
              :key="f"
              class="follow-chip"
              :class="{ 'follow-chip--loading': pendingFollowup === f }"
              :disabled="loading"
              @click="onFollowupClick(f)"
            >
              <span class="follow-chip-label">{{ f }}</span>
              <a-spin v-if="pendingFollowup === f" size="small" />
              <ArrowRSvg v-else />
            </button>
          </div>
        </div>

      </div>

      <div class="msg-actions">
        <a-tooltip :title="copied ? 'Copied!' : 'Copy Content'">
          <button
            :class="['ghost-btn', { 'ghost-btn--copied': copied }]"
            type="button"
            @click="copyMsg"
          >
            <CheckSvg v-if="copied" />
            <CopySvg v-else />
          </button>
        </a-tooltip>
        <a-tooltip title="View Data Inputs">
          <button
            v-if="canViewDataInputs && hasSource"
            class="ghost-btn"
            type="button"
            @click="openSourceDetails"
          >
            <BookSvg />
            <span>View Data Inputs</span>
          </button>
        </a-tooltip>
      </div>
    </div>

    <div
      v-if="canViewDataInputs && detailsOpen"
      class="modal-backdrop"
      @click.self="detailsOpen = false"
    >
      <div class="details-modal">
        <div class="details-head">
          <div>
            <p class="details-title">Source details</p>
          </div>
          <a-tooltip title="Close">
            <button
              class="details-close-btn"
              type="button"
              @click="detailsOpen = false"
            >
              <CloseSvg />
            </button>
          </a-tooltip>
        </div>

        <div v-if="hasStructuredSource" class="details-section">
          <div class="details-section-title">Attributes used to compute the response message:</div>
          <div class="source-list">
            <div
              v-for="(entry, key) in sourceEntries"
              :key="key"
              class="source-item"
            >
              <div class="source-key">{{ key }}</div>
              <pre class="source-value">{{ formatValue(entry.value) }}</pre>
            </div>
          </div>
        </div>

        <div v-if="ragSources.length" class="details-section">
          <div class="details-section-title">Document references</div>
          <div class="rag-source-table">
            <div class="rag-source-header">
              <div>Extract</div>
              <div>Pages References</div>
            </div>
            <div
              v-for="(source, idx) in ragSources"
              :key="`${source.file_uuid || source.filename || ''}-${idx}`"
              class="rag-source-item"
            >
              <div class="rag-source-filename">{{ source.filename }}</div>
              <div class="rag-source-pages">
                <span
                  v-for="page in sourcePages(source.pages)"
                  :key="`${source.file_uuid || source.filename || ''}-${idx}-${page}`"
                  class="rag-page-chip"
                >
                  {{ formatPage(page) }}
                </span>
                <span v-if="!sourcePages(source.pages).length" class="rag-page-empty">No pages listed</span>
              </div>
              <pre v-if="source.text" class="rag-source-text">{{ source.text }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Message, PlaybookData, MessageVisualContext, SummaryCard } from "@/types/chat";
import {
  renderMarkdown,
  toPlainText,
  copyToClipboard,
} from "@/utils/chatFormatters";
import { extractSummaryCard } from "@/utils/summaryCard";
import SupplierFactsCard from "@/components/chat/SupplierFactsCard.vue";
import {
  ArrowRSvg,
  BookSvg,
  CheckSvg,
  CopySvg,
  CloseSvg,
} from "@/components/chat/icons";

const props = defineProps<{
  message: Message;
  loading?: boolean;
  visualContext?: MessageVisualContext | null;
  canViewDataInputs: boolean;
}>();
const emit = defineEmits<{
  "follow-up": [text: string];
  "open-playbook": [playbook: PlaybookData];
  "open-summary-card": [card: SummaryCard];
}>();

const copied = ref(false);
const detailsOpen = ref(false);
const pendingFollowup = ref<string | null>(null);

/** Saved summaries still carry this bullet; the rate now lives on the last tile. */
const bodyText = computed(() => {
  const text = props.message.content || "";
  if (!props.message.summaryCard) return text;
  return text
    .split("\n")
    .filter((line) => !line.includes("Supplier Financing Rate"))
    .join("\n")
    .trim();
});

function onFollowupClick(f: string) {
  if (props.loading) return;
  pendingFollowup.value = f;
  emit("follow-up", f);
}

watch(
  () => props.loading,
  (isLoading) => {
    if (!isLoading) pendingFollowup.value = null;
  },
);

// Ownership designations (and the rolled-up protected_flags row) stay out of Data Inputs.
const HIDDEN_SOURCE_KEYS = new Set([
  "RAG Results",
  "Protected Flags",
  "Woman Owned Business",
  "Veteran Owned Business",
  "Ethnic Minority Owned Business",
]);

const sourceEntries = computed(() => {
  const source = props.message.metadata?.source ?? {};
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !HIDDEN_SOURCE_KEYS.has(key)),
  );
});
const ragSources = computed(() => props.message.metadata?.rag_sources ?? []);
const hasStructuredSource = computed(() => Object.keys(sourceEntries.value).length > 0);
const hasSource = computed(() => hasStructuredSource.value || ragSources.value.length > 0);

function copyMsg() {
  const { body } = extractSummaryCard(bodyText.value);
  copyToClipboard(toPlainText(body), () => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1800);
  });
}

function openSourceDetails() {
  if (!props.canViewDataInputs) return;
  detailsOpen.value = true;
}

function formatValue(value: unknown) {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function formatPage(page: number) {
  return `Page ${page}`;
}

function sourcePages(pages: number[] | undefined) {
  return Array.isArray(pages) ? pages : [];
}
</script>

<style scoped>
.msg {
  display: flex;
  gap: 10px;
}
.msg-bot {
  align-items: flex-start;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--teal) 0%, var(--teal-700) 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 1px 0 rgba(99, 102, 241, 0.4) inset,
    0 2px 6px rgba(99, 102, 241, 0.2);
}
.msg-avatar .ico {
  width: 36px;
  height: 36px;
}
.msg-avatar img {
  display: block;
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.msg-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.agent-card {
  background: #fff;
  border: 1px solid var(--line);
  border-left: 3px solid var(--teal);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow:
    0 1px 2px rgba(15, 20, 40, 0.03),
    0 4px 12px rgba(15, 20, 40, 0.04);
}

.playbook-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 1px solid #cfe1ff;
  background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    transform 0.12s,
    box-shadow 0.12s;
}

.playbook-entry:hover {
  border-color: #7aa5ff;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(61, 120, 240, 0.12);
}

.playbook-entry-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  text-align: left;
}

.playbook-entry-kicker {
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3d78f0;
  font-weight: 700;
}

.playbook-entry-title {
  font-size: 14px;
  line-height: 1.25;
  color: var(--ink);
  font-weight: 700;
}

.playbook-entry-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 7px 12px;
  border: 1px solid #6366f1ff;
  background: #eef2ff;
  color: #6366f1ff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  transition: background 0.12s;
}

.playbook-entry:hover .playbook-entry-cta {
  background: #dfe4ff;
}

.msg-summary {
  font-size: 13px;
  line-height: 1.55;
  color: var(--ink);
}
.msg-summary :deep(p) {
  margin: 0 0 2px;
}
.msg-summary :deep(.md-ul) {
  margin: 4px 0 2px;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  list-style: disc;
}
.msg-summary :deep(li) {
  line-height: 1.55;
}
/* Argument bullets under the supplier summary card: the label and the
   marker are black; day counts and other figures stay the indigo strong. */
.msg-summary--card :deep(.md-ul) {
  color: #111827;
}
.msg-summary--card :deep(li) {
  color: #111827;
}
.msg-summary--card :deep(li)::marker {
  color: #111827;
}
.msg-summary--card :deep(li > strong:first-child) {
  color: #111827;
  font-weight: 700;
}
.msg-summary :deep(.md-gap) {
  height: 6px;
}
.msg-summary :deep(strong) {
  font-weight: 600;
  color: #6366f1ff;
}
.msg-summary :deep(.md-section-title) {
  margin: 10px 0 2px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ink);
}
.msg-summary :deep(.md-section-title:first-child) {
  margin-top: 0;
}
.msg-summary :deep(.md-figure) {
  color: #6366f1ff;
  font-weight: 700;
}
.msg-followups {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cites-l {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
}
.follow-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.follow-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  background: #fff;
  border: 1px solid #dfe3eb;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1ff;
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s,
    background 0.12s;
}
.follow-chip:hover:not(:disabled),
.follow-chip:focus-visible:not(:disabled) {
  background: #eef2ff;
  border-color: #6366f1ff;
  color: #6366f1ff;
  outline: none;
}
.follow-chip .ico {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: #6366f1ff;
  opacity: 0.75;
}
.follow-chip-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.follow-chip:disabled {
  cursor: default;
}
.follow-chip:disabled:not(.follow-chip--loading) {
  opacity: 0.5;
}
.follow-chip--loading {
  border-color: #6366f1ff;
  color: #6366f1ff;
  background: #eef2ff;
  cursor: progress;
}
.follow-chip--loading :deep(.ant-spin-dot) {
  font-size: 12px;
}
.follow-chip--loading :deep(.ant-spin-dot-item) {
  background-color: #6366f1ff;
}

.msg-actions {
  display: flex;
  gap: 2px;
  opacity: 0.4;
  transition: opacity 0.15s;
  padding-top: 2px;
}
.msg-bot:hover .msg-actions {
  opacity: 1;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.ghost-btn:hover {
  background: var(--chip);
  color: var(--ink);
}
.ghost-btn .ico {
  width: 12px;
  height: 12px;
}
.ghost-btn--copied {
  color: var(--teal-700) !important;
  background: var(--teal-50) !important;
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 13px;
  background: var(--teal);
  border-radius: 1px;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-start infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

.ghost-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ghost-btn:disabled:hover {
  background: transparent;
  color: var(--muted);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 40, 0.44);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 40;
}

.details-modal {
  width: min(560px, 100%);
  max-height: min(80vh, 720px);
  overflow: auto;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--line);
  box-shadow: 0 18px 50px rgba(15, 20, 40, 0.22);
  padding: 18px;
}

.details-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.details-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.details-sub {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.details-close-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
}

.details-close-btn:hover {
  background: var(--chip);
  color: var(--ink);
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.details-section + .details-section {
  margin-top: 18px;
}

.details-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.source-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.rag-source-table {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--teal-100);
  border-radius: 12px;
  background: #fff;
}

.rag-source-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  gap: 16px;
  padding: 9px 12px;
  background: var(--teal-50);
  border-bottom: 1px solid var(--teal-100);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.rag-source-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  align-items: start;
  gap: 8px 16px;
  padding: 11px 12px;
  background: #fbfffd;
}

.rag-source-item + .rag-source-item {
  border-top: 1px solid var(--teal-100);
}

.rag-source-item:hover {
  background: var(--teal-50);
}

.rag-source-filename {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.rag-source-pages {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 5px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--ink-2);
}

.rag-source-text {
  grid-column: 1 / -1;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font:
    11px/1.45 ui-monospace,
    SFMono-Regular,
    Menlo,
    Consolas,
    monospace;
  color: var(--ink-2);
  max-height: 160px;
  overflow: auto;
}

.rag-page-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--teal-100);
  background: var(--teal-50);
  color: var(--teal-700);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.rag-page-empty {
  color: var(--muted);
  font-size: 11px;
}

.source-item {
  border: 1px solid var(--teal-100);
  border-radius: 10px;
  padding: 10px;
  background: var(--teal-50);
  min-width: 0;
}

.source-key {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  word-break: break-word;
}

.source-value {
  margin: 5px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font:
    11px/1.45 ui-monospace,
    SFMono-Regular,
    Menlo,
    Consolas,
    monospace;
  color: var(--ink-2);
}

@media (max-width: 640px) {
  .source-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 440px) {
  .rag-source-header {
    display: none;
  }

  .rag-source-item {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px;
  }

  .rag-source-item + .rag-source-item {
    border-top: 1px solid var(--teal-100);
  }

  .rag-source-pages::before {
    content: 'Pages References: ';
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .source-list {
    grid-template-columns: 1fr;
  }
}
</style>
