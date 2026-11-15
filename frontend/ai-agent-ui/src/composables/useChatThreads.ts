import type { Ref } from 'vue'
import { sessionApi, type PreviousThread } from '@/api/session.api'
import type { Message, SummaryBullet } from '@/types/chat'
import { useUiStore } from '@/stores/ui.store'
import { parseBullets } from '@/utils/chatFormatters'
import { extractSummaryCard } from '@/utils/summaryCard'

type TabRef = Ref<'activity' | 'assistant'>
type MessagesRef = Ref<Message[]>

export function useChatThreads(
  supplierId: Ref<string | undefined>,
  sessionId: Ref<string | null>,
  chatScrollRef: Ref<{ scrollToBottom: () => void } | null>,
  getNextId: () => number,
) {
  const uiStore = useUiStore()
  const threads = ref<PreviousThread[]>([])
  const threadsLoading = ref(false)
  const threadSearch = ref('')
  const threadMessagesLoading = ref(false)
  const activeThreadSummary = ref<string | null>(null)
  const activeThreadId = ref<string | null>(null)
  const isThreadSummaryPinned = ref(false)

  const filteredThreads = computed(() => {
    const q = threadSearch.value.toLowerCase().trim()
    if (!q) return threads.value
    return threads.value.filter((thread) =>
      thread.title.toLowerCase().includes(q) ||
      (thread.latest_summary?.content ?? '').toLowerCase().includes(q),
    )
  })

  const activeSummary = computed(() => activeThreadSummary.value)
  const parsedSummary = computed<SummaryBullet[]>(() =>
    activeSummary.value ? parseBullets(activeSummary.value) : [],
  )
  const pinnedSummaryBullets = computed<SummaryBullet[]>(() =>
    isThreadSummaryPinned.value && activeSummary.value ? parseBullets(activeSummary.value) : [],
  )
  const isActiveSummaryPinned = computed(() => isThreadSummaryPinned.value)

  async function loadThreads() {
    if (!supplierId.value) return
    threadsLoading.value = true
    try {
      const { data } = await sessionApi.getThreads(supplierId.value)
      threads.value = data.threads
      uiStore.initFromThreads(data.threads)
    } catch {
      threads.value = []
    } finally {
      threadsLoading.value = false
    }
  }

  async function openActivityThread(threadId: string, activeTab: TabRef, historyOpen: Ref<boolean>, messages: MessagesRef) {
    activeTab.value = 'assistant'
    historyOpen.value = false
    await loadThreadMessages(threadId, activeTab, historyOpen, messages)
  }

  async function pinThread(threadId: string, pinned: boolean) {
    try {
      const { data } = pinned
        ? await sessionApi.pinThreadSummary(threadId)
        : await sessionApi.unpinThreadSummary(threadId)
      syncPinnedThread(data.thread_id, data.pinned)
      if (activeThreadId.value === data.thread_id) isThreadSummaryPinned.value = data.pinned
    } catch {
      // keep existing state on API failure
    }
  }

  function renameThread(threadId: string, newTitle: string) {
    const thread = threads.value.find((item) => item.thread_id === threadId)
    const oldTitle = thread?.title
    if (thread) thread.title = newTitle
    sessionApi.updateThread(threadId, { title: newTitle }).catch(() => {
      if (thread && oldTitle !== undefined) thread.title = oldTitle
    })
  }

  async function deleteThread(threadId: string) {
    const prev = threads.value
    threads.value = threads.value.filter((item) => item.thread_id !== threadId)
    if (activeThreadId.value === threadId) {
      resetActiveThread()
    }
    try {
      await sessionApi.deleteThread(threadId)
    } catch {
      threads.value = prev
    }
  }

  async function loadThreadMessages(
    threadId: string,
    activeTab: TabRef,
    historyOpen: Ref<boolean>,
    messages: MessagesRef,
  ) {
    historyOpen.value = false
    activeTab.value = 'assistant'
    messages.value = []
    activeThreadId.value = threadId
    activeThreadSummary.value = null
    isThreadSummaryPinned.value = false
    threadMessagesLoading.value = true

    try {
      const threadFromList = threads.value.find((item) => item.thread_id === threadId)
      const summaryPending = !threadFromList?.latest_summary && (threadFromList?.message_count ?? 0) > 0

      if (summaryPending && sessionId.value) {
        try {
          const { data: summaryData } = await sessionApi.generateSummary(sessionId.value)
          if (summaryData) {
            const content = summaryData.summary ?? null
            activeThreadSummary.value = content
            if (threadFromList) {
              threadFromList.latest_summary = content
                ? {
                    content,
                    created_at: summaryData.created_at,
                    thread_name: summaryData.thread_name ?? null,
                  }
                : null
              if (summaryData.title) threadFromList.title = summaryData.title
            }
          }
        } catch {
          // leave summary as pending
        }
      }

      const { data } = await sessionApi.getThreadMessages(threadId, sessionId.value)
      if (!activeThreadSummary.value) {
        activeThreadSummary.value = data.latest_summary?.content ?? threadFromList?.latest_summary?.content ?? null
      }
      isThreadSummaryPinned.value = data.pinned
      messages.value = data.messages.map((msg) => {
        const { body, card } = extractSummaryCard(msg.content ?? '')
        return {
          id: getNextId(),
          message_id: msg.message_id,
          role: msg.role as Message['role'],
          content: body,
          summaryCard: card,
          metadata:
            msg.source || msg.rag_sources?.length
              ? { source: msg.source ?? undefined, rag_sources: msg.rag_sources ?? undefined }
              : undefined,
        }
      })
      await nextTick()
      chatScrollRef.value?.scrollToBottom()
    } catch {
      // leave empty, user can start a new conversation
    } finally {
      threadMessagesLoading.value = false
    }
  }

  async function toggleSummaryPin() {
    if (!activeSummary.value || !activeThreadId.value) return
    try {
      const { data } = isThreadSummaryPinned.value
        ? await sessionApi.unpinThreadSummary(activeThreadId.value)
        : await sessionApi.pinThreadSummary(activeThreadId.value)
      isThreadSummaryPinned.value = data.pinned
      syncPinnedThread(data.thread_id, data.pinned)
    } catch {
      // keep UI unchanged on failure
    }
  }

  function resetActiveThread() {
    activeThreadSummary.value = null
    activeThreadId.value = null
    isThreadSummaryPinned.value = false
  }

  function syncPinnedThread(threadId: string, pinned: boolean) {
    threads.value = threads.value.map((thread) => ({
      ...thread,
      pinned: thread.thread_id === threadId ? pinned : thread.pinned,
    }))
    uiStore.syncPinnedThread(threadId, pinned)
  }

  return {
    activeSummary,
    activeThreadId,
    filteredThreads,
    isActiveSummaryPinned,
    loadThreadMessages,
    loadThreads,
    openActivityThread,
    parsedSummary,
    pinThread,
    pinnedSummaryBullets,
    renameThread,
    deleteThread,
    resetActiveThread,
    threadMessagesLoading,
    threadSearch,
    threads,
    threadsLoading,
    toggleSummaryPin,
  }
}
