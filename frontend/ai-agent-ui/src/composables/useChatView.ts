import { computed, nextTick, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { sessionApi } from "@/api/session.api";
import { useChat } from "@/composables/useChat";
import { useChatThreads } from "@/composables/useChatThreads";
import { useAuthStore } from "@/stores/auth.store";
import { useSessionStore } from "@/stores/session.store";
import type {
  Goal,
  Message,
  MessageMetadata,
  PlaybookData,
  SummaryCard,
  Tone,
} from "@/types/chat";
import type ChatScrollArea from "@/components/chat/ChatScrollArea.vue";
import { copyToClipboard, toPlainText, visualContextFromSupplierData } from "@/utils/chatFormatters";
import { parsePlaybook } from "@/utils/playbook";
import { extractSummaryCard, normalizeSummaryCard } from "@/utils/summaryCard";

export function useChatView(goals: Goal[], recommendedTone: Tone) {
  const router = useRouter();
  const route = useRoute();
  const sessionStore = useSessionStore();
  const authStore = useAuthStore();
  let threadState!: ReturnType<typeof useChatThreads>;

  async function recoverChatSession() {
    const supplierId =
      sessionStore.supplierId ??
      (route.params.supplierId as string | undefined);
    if (!supplierId) return;

    const activeThreadId = threadState.activeThreadId.value;
    await sessionStore.startSession(supplierId);

    if (activeThreadId && sessionStore.sessionId) {
      await sessionApi.getThreadMessages(
        activeThreadId,
        sessionStore.sessionId,
      );
      sessionStore.setThreadId(activeThreadId);
    }
  }

  const chatWs = useChat(
    computed(() => sessionStore.sessionId),
    computed(() => authStore.accessToken),
    recoverChatSession,
  );

  const activeTab = ref<"activity" | "assistant">("assistant");
  const isFullscreen = ref(false);
  const copied = ref(false);
  const historyOpen = ref(false);
  const goalsModalOpen = ref(false);
  const selectedTone = ref<Tone>(recommendedTone);
  const activePlaybook = ref<PlaybookData | null>(null);
  const activeSummaryCard = ref<SummaryCard | null>(null);

  // Map API strategy IDs (snake_case) ↔ goal IDs (kebab-case)
  const strategyToGoalId: Record<string, string> = {
    term_extension: "term-extension",
    term_extension_scf: "term-extension-scf",
  };
  const goalIdToStrategy: Record<string, string> = {
    "term-extension": "term_extension",
    "term-extension-scf": "term_extension_scf",
  };

  const availableGoalIds = computed<Set<string>>(() => {
    const settings = sessionStore.sessionSettings;
    // null = settings haven't loaded yet → show all goals as a safe default
    if (!settings) return new Set(goals.map((g) => g.id));
    // empty array = admin explicitly disabled all strategies → no goals available
    return new Set(
      settings.effectiveStrategies.map((s) => strategyToGoalId[s] ?? s),
    );
  });

  const availableTones = computed<Set<Tone>>(() => {
    const tones = sessionStore.sessionSettings?.effectiveTones as
      | Tone[]
      | undefined;
    if (!tones?.length)
      return new Set<Tone>(["collaborative", "assertive", "methodical"]);
    return new Set<Tone>(tones);
  });

  const canViewDataInputs = computed(
    () => sessionStore.sessionSettings?.canViewDataInputs === true,
  );

  const defaultGoal = computed<Goal>(() => {
    return goals.find((g) => availableGoalIds.value.has(g.id)) ?? goals[0];
  });

  const selectedGoal = ref<Goal>(goals[0]);

  function toneForGoal(goal: Goal): Tone {
    const map = sessionStore.sessionSettings?.strategyToneMap;
    const strategy = goalIdToStrategy[goal.id];
    const mapped =
      map && strategy ? (map[strategy] as Tone | undefined) : undefined;

    if (mapped && availableTones.value.has(mapped)) {
      return mapped;
    }

    const effectiveTones = sessionStore.sessionSettings?.effectiveTones as
      | Tone[]
      | undefined;
    if (effectiveTones?.length) {
      return effectiveTones[0];
    }

    return recommendedTone;
  }

  // Sync goal and tone once session settings arrive.
  // Only switch the goal if the user's current selection is no longer available
  // (e.g. an admin disabled it). Preserve an explicit user selection across restarts.
  watch(
    () => sessionStore.sessionSettings,
    (settings) => {
      if (!settings) return;
      if (!availableGoalIds.value.has(selectedGoal.value.id)) {
        selectedGoal.value = defaultGoal.value;
      }
      selectedTone.value = toneForGoal(selectedGoal.value);
    },
  );

  // Update tone when user switches goal
  watch(selectedGoal, (goal) => {
    selectedTone.value = toneForGoal(goal);
  });
  const closingSession = ref(false);
  const messages = ref<Message[]>([]);
  const input = ref("");
  const loading = ref(false);
  const forceScrollKey = ref(0);
  const wrapupDone = ref(false);
  const hasSentMessage = ref(false);
  const visualContext = computed(() =>
    visualContextFromSupplierData(sessionStore.supplierData),
  );
  const pendingEdit = ref<{
    localId: number;
    messageId: string | undefined;
  } | null>(null);
  const chatScrollRef = ref<InstanceType<typeof ChatScrollArea> | null>(null);

  let nextId = 1;
  let streamingMsgId: number | null = null;
  let tokenFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingDone = false;
  let pendingDoneMetadata: MessageMetadata | undefined;
  const pendingTokenChunks: string[] = [];
  // ponytail: ignore late tokens after user stop until server sends done
  let stoppedTurn = false;

  threadState = useChatThreads(
    computed(() => route.params.supplierId as string | undefined),
    computed(() => sessionStore.sessionId),
    chatScrollRef,
    () => nextId++,
  );

  function appendStreamingText(text: string) {
    if (!text) return;

    if (streamingMsgId === null) {
      loading.value = false;
      const isError = text.startsWith("Error:");
      const msg: Message = {
        id: nextId++,
        role: "assistant",
        content: text,
        streaming: !isError,
        followups: [],
      };
      messages.value.push(msg);
      streamingMsgId = isError ? null : msg.id;
      return;
    }

    const msg = messages.value.find((item) => item.id === streamingMsgId);
    if (msg) {
      msg.content += text;
    }
  }

  function hydrateMessagePlaybook(msg: Message) {
    const playbook = parsePlaybook(msg.content);
    if (playbook && !playbook.supplierName) {
      const fromSession = visualContext.value?.supplierName;
      if (fromSession) playbook.supplierName = fromSession;
    }
    msg.playbook = playbook;
    msg.isPlaybook = Boolean(msg.metadata?.is_playbook || playbook);
    if (import.meta.env.DEV && msg.metadata?.is_playbook && !playbook) {
      console.warn(
        "Playbook response was marked by backend but could not be parsed",
        msg.content,
      );
    }
    const fromMeta = normalizeSummaryCard(msg.metadata?.summary_card ?? null);
    if (fromMeta) {
      msg.summaryCard = fromMeta;
    } else {
      const { body, card } = extractSummaryCard(msg.content);
      if (card) {
        msg.summaryCard = card;
        msg.content = body;
      }
    }
    return msg;
  }

  function hydrateMessagesPlaybooks() {
    messages.value.forEach(hydrateMessagePlaybook);
  }

  function finishStreamingMessage(metadata?: MessageMetadata) {
    loading.value = false;
    if (streamingMsgId !== null) {
      const msg = messages.value.find((item) => item.id === streamingMsgId);
      if (msg) {
        msg.streaming = false;
        msg.metadata = metadata;
        hydrateMessagePlaybook(msg);
        const base = metadata?.follow_ups?.length ? metadata.follow_ups : [];
        const hasPlaybook = base.some(f => f.toLowerCase().includes('playbook'));
        msg.followups = msg.isPlaybook || hasPlaybook ? base : [...base, 'Generate Playbook'];
        if (msg.isPlaybook && msg.playbook) {
          activePlaybook.value = msg.playbook;
        }
      }
    }
    streamingMsgId = null;
    pendingDone = false;
    pendingDoneMetadata = undefined;
  }

  function flushNextTokenChunk() {
    const chunk = pendingTokenChunks.shift();
    if (chunk) appendStreamingText(chunk);

    if (pendingTokenChunks.length > 0) {
      tokenFlushTimer = setTimeout(flushNextTokenChunk, 0);
      return;
    }

    tokenFlushTimer = null;
    if (pendingDone) finishStreamingMessage(pendingDoneMetadata);
  }

  function scheduleTokenFlush() {
    if (tokenFlushTimer === null) {
      tokenFlushTimer = setTimeout(flushNextTokenChunk, 0);
    }
  }

  function resetStreamingQueue() {
    if (tokenFlushTimer !== null) {
      clearTimeout(tokenFlushTimer);
      tokenFlushTimer = null;
    }
    pendingTokenChunks.length = 0;
    pendingDone = false;
    pendingDoneMetadata = undefined;
  }

  chatWs.onMessage((text, isDone, metadata) => {
    if (stoppedTurn) {
      if (isDone) stoppedTurn = false;
      return;
    }
    if (text) {
      pendingTokenChunks.push(text);
      scheduleTokenFlush();
    }
    if (isDone) {
      if (metadata?.thread_id) {
        sessionStore.setThreadId(metadata.thread_id);
      }
      pendingDone = true;
      pendingDoneMetadata = metadata;
      if (pendingTokenChunks.length === 0 && tokenFlushTimer === null) {
        finishStreamingMessage(metadata);
      }
    }
  });

  // ponytail: busy = thinking OR mid-stream; loading alone clears on first token
  const replyInProgress = computed(
    () => loading.value || messages.value.some((m) => m.streaming),
  );

  function stopReply() {
    if (!replyInProgress.value) return;
    stoppedTurn = true;
    chatWs.stop();
    resetStreamingQueue();
    finishStreamingMessage();
  }

  function send() {
    const text = input.value.trim();
    if (!text || replyInProgress.value || !chatWs.isConnected.value) return;

    if (pendingEdit.value) {
      const { localId, messageId } = pendingEdit.value;
      pendingEdit.value = null;
      input.value = "";
      void onSaveEdit(localId, messageId, text);
      return;
    }

    hasSentMessage.value = true;
    messages.value.push({ id: nextId++, role: "user", content: text });
    input.value = "";
    loading.value = true;
    forceScrollKey.value += 1;
    nextTick(() => chatScrollRef.value?.scrollToBottom());
    resetStreamingQueue();
    streamingMsgId = null;
    stoppedTurn = false;
    chatWs.send(text, selectedTone.value, goalIdToStrategy[selectedGoal.value.id] ?? null);
  }

  function onFollowUp(text: string) {
    input.value = text;
    send();
  }

  function openPlaybook(playbook: PlaybookData) {
    activePlaybook.value = playbook;
  }

  function openSummaryCard(card: SummaryCard) {
    activeSummaryCard.value = card;
  }

  function onEditPrefill(
    localId: number,
    messageId: string | undefined,
    content: string,
  ) {
    pendingEdit.value = { localId, messageId };
    input.value = content;
  }

  async function onSaveEdit(
    localId: number,
    messageId: string | undefined,
    content: string,
  ) {
    const msgIdx = messages.value.findIndex((msg) => msg.id === localId);
    if (msgIdx === -1) return;

    const prev = messages.value[msgIdx].content;
    messages.value[msgIdx].content = content;

    if (messageId && threadState.activeThreadId.value) {
      try {
        await sessionApi.editMessage(
          threadState.activeThreadId.value,
          messageId,
          content,
        );
      } catch {
        messages.value[msgIdx].content = prev;
        return;
      }
    }

    messages.value = messages.value.slice(0, msgIdx + 1);
    loading.value = true;
    forceScrollKey.value += 1;
    nextTick(() => chatScrollRef.value?.scrollToBottom());
    resetStreamingQueue();
    streamingMsgId = null;
    hasSentMessage.value = true;
    stoppedTurn = false;
    chatWs.send(content, selectedTone.value, goalIdToStrategy[selectedGoal.value.id] ?? null);
  }

  function submitWrapup(choice: "up" | "down", _comment: string) {
    wrapupDone.value = true;
    const threadId = threadState.activeThreadId.value ?? sessionStore.threadId;
    if (threadId) {
      void sessionApi.updateThread(threadId, { reaction: choice === 'up' });
    }
    // ponytail: delay newChat until thanks modal dismisses — immediate reset unmounts WrapupSection
  }

  function dismissWrapup() {
    void newChat();
  }

  function copyConversation() {
    const text = messages.value
      .map((msg) =>
        msg.role === "user"
          ? `You: ${msg.content}`
          : `Assistant: ${toPlainText(msg.content)}`,
      )
      .join("\n\n");

    copyToClipboard(text, () => {
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 1600);
    });
  }

  function selectGoal(goal: Goal) {
    const shouldStartFreshChat = selectedGoal.value.id !== goal.id;
    selectedGoal.value = goal;
    goalsModalOpen.value = false;
    if (shouldStartFreshChat) void newChat();
  }

  async function openHistory() {
    await saveSummaryOnClose();
    historyOpen.value = !historyOpen.value;
  }

  function resetComposerState() {
    activeTab.value = "assistant";
    historyOpen.value = false;
    messages.value = [];
    input.value = "";
    pendingEdit.value = null;
    activePlaybook.value = null;
    activeSummaryCard.value = null;
    resetStreamingQueue();
    streamingMsgId = null;
    loading.value = false;
    wrapupDone.value = false;
    threadState.resetActiveThread();
    hasSentMessage.value = false;
  }

  async function restartSession() {
    const supplierId = route.params.supplierId as string | undefined;
    if (!supplierId) return;
    sessionStore.reset();
    await sessionStore.startSession(supplierId);
  }

  async function newChat() {
    await saveSummaryOnClose();
    resetComposerState();
    await restartSession();
  }

  async function goBack() {
    await saveSummaryOnClose();
    sessionStore.reset();
    await router.push({ name: "suppliers" });
  }

  async function loadThreadMessages(threadId: string) {
    resetStreamingQueue();
    activePlaybook.value = null;
    activeSummaryCard.value = null;
    streamingMsgId = null;
    loading.value = false;
    wrapupDone.value = false;
    hasSentMessage.value = false;
    await threadState.loadThreadMessages(
      threadId,
      activeTab,
      historyOpen,
      messages,
    );
    hydrateMessagesPlaybooks();
  }

  async function openActivityThread(threadId: string) {
    resetStreamingQueue();
    activePlaybook.value = null;
    activeSummaryCard.value = null;
    streamingMsgId = null;
    loading.value = false;
    wrapupDone.value = false;
    hasSentMessage.value = false;
    await threadState.openActivityThread(
      threadId,
      activeTab,
      historyOpen,
      messages,
    );
    hydrateMessagesPlaybooks();
  }

  async function saveSummaryOnClose() {
    const sid = sessionStore.sessionId;
    if (!sid || !hasSentMessage.value) return;

    hasSentMessage.value = false;
    closingSession.value = true;
    try {
      const result = await Promise.race([
        sessionApi.generateSummary(sid),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      const data = result && "data" in result ? result.data : null;
      if (data?.title && data.thread_id) {
        const thread = threadState.threads.value.find(
          (item) => item.thread_id === data.thread_id,
        );
        if (thread) {
          thread.title = data.title;
          if (data.summary) {
            thread.latest_summary = {
              content: data.summary,
              created_at: data.created_at,
              thread_name: data.thread_name ?? null,
            };
          }
        }
      }
    } catch {
      // continue regardless
    } finally {
      closingSession.value = false;
    }
  }

  watch(activeTab, (newTab, oldTab) => {
    if (
      oldTab === "assistant" &&
      newTab !== "assistant" &&
      messages.value.length > 0
    ) {
      void saveSummaryOnClose();
    }
  });

  watch(historyOpen, (open) => {
    if (open) void threadState.loadThreads();
  });

  watch(activeTab, (newTab) => {
    if (newTab === "activity") void threadState.loadThreads();
  });

  onBeforeRouteLeave(async () => {
    resetStreamingQueue();
    chatWs.disconnect();
    await saveSummaryOnClose();
    sessionStore.reset();
  });

  onMounted(() => {
    const supplierId = route.params.supplierId as string;
    if (!supplierId) {
      void router.replace({ name: "suppliers" });
      return;
    }

    sessionStore.reset();
    void sessionStore.startSession(supplierId);
  });

  return {
    activeSummary: threadState.activeSummary,
    activeTab,
    availableGoalIds,
    availableTones,
    canViewDataInputs,
    chatScrollRef,
    chatWs,
    closingSession,
    copied,
    copyConversation,
    filteredThreads: threadState.filteredThreads,
    forceScrollKey,
    goalsModalOpen,
    goBack,
    activePlaybook,
    activeSummaryCard,
    historyOpen,
    input,
    isActiveSummaryPinned: threadState.isActiveSummaryPinned,
    isFullscreen,
    loadThreadMessages,
    loadThreads: threadState.loadThreads,
    loading,
    replyInProgress,
    messages,
    newChat,
    onEditPrefill,
    onFollowUp,
    openPlaybook,
    openSummaryCard,
    openActivityThread,
    openHistory,
    parsedSummary: threadState.parsedSummary,
    pinThread: threadState.pinThread,
    pinnedSummaryBullets: threadState.pinnedSummaryBullets,
    renameThread: threadState.renameThread,
    deleteThread: async (threadId: string) => {
      const wasActive = threadState.activeThreadId.value === threadId;
      await threadState.deleteThread(threadId);
      if (wasActive) {
        messages.value = [];
        wrapupDone.value = false;
        resetComposerState();
      }
    },
    selectGoal,
    selectedGoal,
    selectedTone,
    send,
    stopReply,
    sessionStore,
    submitWrapup,
    dismissWrapup,
    threadMessagesLoading: threadState.threadMessagesLoading,
    threadSearch: threadState.threadSearch,
    threads: threadState.threads,
    threadsLoading: threadState.threadsLoading,
    toggleSummaryPin: threadState.toggleSummaryPin,
    visualContext,
    wrapupDone,
  };
}
