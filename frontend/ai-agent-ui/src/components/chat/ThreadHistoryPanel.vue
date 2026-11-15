<template>
  <div class="history-panel">
    <ThreadHistoryHeader @close="emit('close')" />
    <ThreadHistorySearch
      :search="search"
      @update:search="emit('update:search', $event)"
    />
    <ThreadHistoryEmptyState
      v-if="loading || filteredThreads.length === 0"
      :loading="loading"
      :search="search"
    />
    <ThreadHistoryList
      v-else
      :threads="filteredThreads"
      :search="search"
      :open-menu-id="openMenuId"
      :renaming-thread-id="renamingThreadId"
      :rename-value="renameValue"
      @toggle-menu="toggleMenu"
      @load-thread="handleThreadClick"
      @pin-thread="handlePin"
      @rename-start="handleRenameStart"
      @update:renameValue="renameValue = $event"
      @confirm-rename="confirmRename"
      @cancel-rename="cancelRename"
      @delete-thread="handleDelete"
    />
    <ThreadHistoryFooter @new-chat="emit('new-chat')" />
  </div>
</template>

<script setup lang="ts">
import type { PreviousThread } from '@/api/session.api'
import ThreadHistoryHeader from '@/components/chat/ThreadHistoryHeader.vue'
import ThreadHistorySearch from '@/components/chat/ThreadHistorySearch.vue'
import ThreadHistoryEmptyState from '@/components/chat/ThreadHistoryEmptyState.vue'
import ThreadHistoryList from '@/components/chat/ThreadHistoryList.vue'
import ThreadHistoryFooter from '@/components/chat/ThreadHistoryFooter.vue'

const props = defineProps<{
  threads: PreviousThread[]
  loading: boolean
  search: string
  filteredThreads: PreviousThread[]
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'load-thread': [threadId: string]
  'pin-thread': [threadId: string, pinned: boolean]
  'rename-thread': [threadId: string, newTitle: string]
  'delete-thread': [threadId: string]
  'new-chat': []
  close: []
}>()

const openMenuId = ref<string | null>(null)
const renamingThreadId = ref<string | null>(null)
const renameValue = ref('')
const renameOriginal = ref('')

function toggleMenu(threadId: string) {
  openMenuId.value = openMenuId.value === threadId ? null : threadId
}

function handleThreadClick(threadId: string) {
  if (openMenuId.value) {
    openMenuId.value = null
    return
  }
  if (renamingThreadId.value) return
  emit('load-thread', threadId)
}

function handlePin(threadId: string, pinned: boolean) {
  const thread = props.threads.find((item) => item.thread_id === threadId)
  if (!thread) return
  openMenuId.value = null
  emit('pin-thread', threadId, pinned)
}

async function handleRenameStart(threadId: string, currentTitle: string) {
  openMenuId.value = null
  renamingThreadId.value = threadId
  renameValue.value = currentTitle
  renameOriginal.value = currentTitle
  await nextTick()
}

function confirmRename(threadId: string) {
  if (renamingThreadId.value !== threadId) return
  const title = renameValue.value.trim()
  const original = renameOriginal.value
  renamingThreadId.value = null
  renameValue.value = ''
  renameOriginal.value = ''
  if (title && title !== original) emit('rename-thread', threadId, title)
}

function cancelRename() {
  renamingThreadId.value = null
  renameValue.value = ''
}

function handleDelete(threadId: string) {
  openMenuId.value = null
  if (!window.confirm('Delete this chat? This cannot be undone.')) return
  emit('delete-thread', threadId)
}

function onDocumentClick() {
  openMenuId.value = null
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
.history-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}
</style>
