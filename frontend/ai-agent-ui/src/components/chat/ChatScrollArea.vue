<template>
  <div
    class="chat-scroll"
    ref="scrollEl"
    @scroll="updateShouldStickToBottom"
    @wheel.passive="handleWheel"
    @touchstart.passive="handleTouchStart"
    @touchmove.passive="handleTouchMove"
  >
    <div
      v-if="pinnedSummaryBullets.length > 0 && !threadMessagesLoading"
      class="summary-sticky-wrap"
    >
      <div class="summary-card summary-card-pinned">
        <div class="summary-head">
          <div class="summary-title">
            <SummarySvg />
            <span>Conversation summary</span>
            <span class="summary-status summary-status-pinned">Pinned</span>
          </div>
          <a-tooltip title="Unpin summary">
            <button
              class="summary-pin-btn is-active"
              aria-label="Unpin summary"
              @click="emit('toggle-summary-pin')"
            >
              <PinSvg />
            </button>
          </a-tooltip>
        </div>
        <div class="summary-body">
          <ul>
            <li
              v-for="item in pinnedSummaryBullets"
              :key="`pinned-${item.label}`"
            >
              <b>{{ item.label }}:</b> {{ item.content }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="chat-inner">
      <div v-if="threadMessagesLoading" class="thread-load-overlay">
        <a-spin size="small" />
        <span>Loading thread…</span>
      </div>

      <div
        v-if="showSummary && !threadMessagesLoading && !isSummaryPinned"
        class="summary-card"
      >
        <div class="summary-head">
          <div class="summary-title">
            <SummarySvg />
            <span>Conversation summary</span>
            <span class="summary-status">Not pinned</span>
          </div>
          <a-tooltip title="Pin summary">
            <button
              class="summary-pin-btn"
              aria-label="Pin summary"
              @click="emit('toggle-summary-pin')"
            >
              <PinSvg />
            </button>
          </a-tooltip>
        </div>
        <div class="summary-body">
          <ul>
            <li v-for="item in parsedSummary" :key="item.label">
              <b>{{ item.label }}:</b> {{ item.content }}
            </li>
          </ul>
        </div>
      </div>

      <div
        v-if="
          messages.length === 0 &&
          !sessionLoading &&
          !showSummary &&
          !threadMessagesLoading
        "
        class="chat-empty"
      >
        <div class="empty-avatar"><img src="/logo.png?v=2" alt="Calculum" /></div>
        <p class="empty-title">
          Start your conversation
        </p>
        <p class="empty-subtitle">
          About your negotiation, payment terms, benchmarks, or supplier insights.
        </p>
        <div
          v-if="starterQuestions.length > 0"
          class="starter-questions"
          aria-label="Starter questions"
        >
          <button
            v-for="question in starterQuestions"
            :key="question"
            class="starter-question"
            type="button"
            @click="emit('follow-up', question)"
          >
            {{ question }}
          </button>
        </div>
      </div>

      <template v-for="msg in messages" :key="msg.id">
        <div v-if="msg.role === 'user'" class="msg msg-user">
          <a-tooltip title="Edit &amp; resend">
            <button
              class="msg-edit-btn"
              @click="emit('edit-prefill', msg.id, msg.message_id, msg.content)"
            >
              <EditResendSvg />
            </button>
          </a-tooltip>
          <div class="msg-bubble">{{ msg.content }}</div>
        </div>
        <BotMessageCard
          v-else
          :message="msg"
          :loading="loading"
          :visual-context="visualContext"
          :can-view-data-inputs="canViewDataInputs"
          @follow-up="emit('follow-up', $event)"
          @open-playbook="emit('open-playbook', $event)"
          @open-summary-card="emit('open-summary-card', $event)"
        />
      </template>

      <div v-if="loading" class="msg msg-bot">
        <div class="msg-avatar"><img src="/logo.png?v=2" alt="logo" /></div>
        <div class="msg-content">
          <div class="thinking">
            <Transition name="tl" mode="out-in">
              <span :key="thinkingLabel" class="thinking-text"
                >{{ thinkingLabel
                }}<span class="thinking-ellipsis"
                  ><span>.</span><span>.</span><span>.</span></span
                ></span
              >
            </Transition>
          </div>
        </div>
      </div>

      <WrapupSection
        v-if="messages.length > 0 && !loading"
        v-model:done="wrapupDone"
        @submit="(choice, comment) => emit('submit-wrapup', choice, comment)"
        @dismissed="emit('dismiss-wrapup')"
      />

      <div ref="bottomAnchor" aria-hidden="true"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  Message,
  SummaryBullet,
  MessageVisualContext,
} from "@/types/chat";
import BotMessageCard from "@/components/chat/BotMessageCard.vue";
import WrapupSection from "@/components/chat/WrapupSection.vue";
import {
  EditResendSvg,
  PinSvg,
  SummarySvg,
} from "@/components/chat/icons";

const props = defineProps<{
  messages: Message[];
  loading: boolean;
  threadMessagesLoading: boolean;
  showSummary: boolean;
  parsedSummary: SummaryBullet[];
  pinnedSummaryBullets: SummaryBullet[];
  isSummaryPinned: boolean;
  sessionLoading: boolean;
  forceScrollKey: number;
  starterQuestions: string[];
  visualContext?: MessageVisualContext | null;
  canViewDataInputs: boolean;
}>();

const wrapupDone = defineModel<boolean>("wrapupDone", { default: false });

const emit = defineEmits<{
  "follow-up": [text: string];
  "open-playbook": [playbook: import("@/types/chat").PlaybookData];
  "open-summary-card": [card: import("@/types/chat").SummaryCard];
  "edit-prefill": [
    localId: number,
    messageId: string | undefined,
    content: string,
  ];
  "submit-wrapup": [choice: "up" | "down", comment: string];
  "dismiss-wrapup": [];
  "toggle-summary-pin": [];
}>();

const THINKING_LABELS = ["Thinking", "Researching", "Analyzing", "Evaluating"];
const thinkingLabel = ref(THINKING_LABELS[0]);
let thinkingTimer: ReturnType<typeof setInterval> | null = null;

watch(
  () => props.loading,
  (active) => {
    if (active) {
      let i = 0;
      thinkingLabel.value = THINKING_LABELS[0];
      thinkingTimer = setInterval(() => {
        i = (i + 1) % THINKING_LABELS.length;
        thinkingLabel.value = THINKING_LABELS[i];
      }, 5000);
    } else {
      if (thinkingTimer) {
        clearInterval(thinkingTimer);
        thinkingTimer = null;
      }
      thinkingLabel.value = THINKING_LABELS[0];
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (thinkingTimer) clearInterval(thinkingTimer);
});

const scrollEl = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);
const shouldStickToBottom = ref(true);
const bottomThreshold = 48;
let touchStartY = 0;

function isNearBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= bottomThreshold;
}

function updateShouldStickToBottom() {
  if (!scrollEl.value) return;
  shouldStickToBottom.value = isNearBottom(scrollEl.value);
}

function setScrollToBottom() {
  if (!scrollEl.value) return;
  scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
  bottomAnchor.value?.scrollIntoView({ block: "end" });
  shouldStickToBottom.value = true;
}

function scrollToBottom() {
  shouldStickToBottom.value = true;
  nextTick(() => {
    setScrollToBottom();
    requestAnimationFrame(setScrollToBottom);
  });
}

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

watch(
  () => [
    props.loading,
    ...props.messages.map(
      (msg) => `${msg.id}:${msg.content.length}:${msg.streaming ? 1 : 0}`,
    ),
  ],
  () => {
    if (shouldStickToBottom.value) nextTick().then(scrollToBottom);
  },
);

watch(
  () => props.forceScrollKey,
  () => {
    scrollToBottom();
  },
  { flush: "post" },
);

defineExpose({ scrollToBottom });
</script>

<style scoped src="./ChatScrollArea.css"></style>
