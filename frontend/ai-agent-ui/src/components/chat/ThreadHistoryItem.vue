<template>
  <div
    :class="[
      'thread-item',
      {
        'thread-item--active': isActive,
        'thread-item--pinned': isPinned,
      },
    ]"
    @click="emit('load-thread', thread.thread_id)"
  >
    <div class="thread-icon"><DocSvg /></div>
    <div class="thread-body">
      <div class="thread-title-row">
        <input
          v-if="isRenaming"
          ref="renameInputEl"
          class="thread-rename-input"
          :value="renameValue"
          placeholder="Enter to save · Esc to cancel"
          @input="emit('update:renameValue', ($event.target as HTMLInputElement).value)"
          @keydown.enter.stop.prevent="emit('confirm-rename', thread.thread_id)"
          @keydown.escape.stop.prevent="emit('cancel-rename')"
          @blur="emit('confirm-rename', thread.thread_id)"
          @click.stop
        />
        <span v-else class="thread-title">
          <PinSvg v-if="isPinned" class="title-pin-ico" />
          <span class="title-text">{{ thread.title }}</span>
        </span>
        <button
          class="thread-menu-btn"
          type="button"
          title="More options"
          @click.stop="emit('toggle-menu', thread.thread_id)"
        >
          <DotsSvg />
        </button>
      </div>
      <div class="thread-preview">{{ preview }}</div>
      <div class="thread-foot">
        <span class="thread-date">{{ formattedDate }}</span>
        <span v-if="tone" class="thread-tone-pill">
          <span class="thread-tone-dot" :style="{ background: tone.color }" />
          {{ tone.label }}
        </span>
      </div>
    </div>

    <div v-if="menuOpen" class="thread-menu-popup" @click.stop>
      <button class="menu-item" type="button" @click="emit('pin-thread', thread.thread_id, !isPinned)">
        <PinSvg /> {{ isPinned ? 'Unpin' : 'Pin' }}
      </button>
      <button
        class="menu-item"
        type="button"
        @click="emit('rename-start', thread.thread_id, thread.title)"
      >
        <PencilSvg /> Rename
      </button>
      <button
        class="menu-item menu-item--danger"
        type="button"
        @click="emit('delete-thread', thread.thread_id)"
      >
        <TrashSvg /> Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { PreviousThread } from '@/api/session.api'
import { threadPreview, threadTone, formatDate } from '@/utils/chatFormatters'
import {
  DocSvg,
  DotsSvg,
  PinSvg,
  PencilSvg,
  TrashSvg,
} from '@/components/chat/icons'

const props = defineProps<{
  thread: PreviousThread
  isActive: boolean
  isPinned: boolean
  isRenaming: boolean
  renameValue: string
  menuOpen: boolean
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

const renameInputEl = ref<HTMLInputElement | null>(null)

const preview = threadPreview(props.thread)
const tone = threadTone(props.thread)
const formattedDate = formatDate(props.thread.created_at)

watch(
  () => props.isRenaming,
  async (value) => {
    if (!value) return
    await nextTick()
    renameInputEl.value?.focus()
    renameInputEl.value?.select()
  },
)
</script>

<style scoped src="./ThreadHistoryItem.css"></style>
