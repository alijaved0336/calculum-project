<template>
  <div class="history-list">
    <ThreadHistoryItem
      v-for="(thread, idx) in sortedThreads"
      :key="thread.thread_id"
      :thread="thread"
      :is-active="idx === 0 && !search"
      :is-pinned="uiStore.isPinned(thread.thread_id)"
      :is-renaming="renamingThreadId === thread.thread_id"
      :rename-value="renameValue"
      :menu-open="openMenuId === thread.thread_id"
      @toggle-menu="onToggleMenu"
      @load-thread="onLoadThread"
      @pin-thread="onPinThread"
      @rename-start="onRenameStart"
      @update:renameValue="onRenameValue"
      @confirm-rename="onConfirmRename"
      @cancel-rename="onCancelRename"
      @delete-thread="onDeleteThread"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PreviousThread } from '@/api/session.api'
import { useUiStore } from '@/stores/ui.store'
import ThreadHistoryItem from '@/components/chat/ThreadHistoryItem.vue'

const props = defineProps<{
  threads: PreviousThread[]
  search: string
  openMenuId: string | null
  renamingThreadId: string | null
  renameValue: string
}>()

const emit = defineEmits<{
  'toggle-menu': [threadId: string]
  'load-thread': [threadId: string]
  'pin-thread': [threadId: string, pinned: boolean]
  'rename-start': [threadId: string, currentTitle: string]
  'update:renameValue': [value: string]
  'confirm-rename': [threadId: string]
  'cancel-rename': []
  'delete-thread': [threadId: string]
}>()

const uiStore = useUiStore()

const sortedThreads = computed(() =>
  [...props.threads].sort((a, b) => {
    const ap = a.pinned ? 0 : 1
    const bp = b.pinned ? 0 : 1
    return ap - bp
  }),
)

function onToggleMenu(threadId: string) {
  emit('toggle-menu', threadId)
}

function onLoadThread(threadId: string) {
  emit('load-thread', threadId)
}

function onPinThread(threadId: string, pinned: boolean) {
  emit('pin-thread', threadId, pinned)
}

function onRenameStart(threadId: string, currentTitle: string) {
  emit('rename-start', threadId, currentTitle)
}

function onRenameValue(value: string) {
  emit('update:renameValue', value)
}

function onConfirmRename(threadId: string) {
  emit('confirm-rename', threadId)
}

function onCancelRename() {
  emit('cancel-rename')
}

function onDeleteThread(threadId: string) {
  emit('delete-thread', threadId)
}
</script>

<style scoped>
.history-list {
  overflow-y: auto;
  flex: 1;
}
</style>
