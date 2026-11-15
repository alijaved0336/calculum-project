<template>
  <div class="chat-scroll activity-view">
    <div class="activity-head">
      <div>
        <p class="activity-kicker">Recent sessions</p>
        <h2>Activity</h2>
      </div>
      <button class="activity-refresh" :disabled="loading" @click="emit('refresh')">
        Refresh
      </button>
    </div>

    <div class="activity-search">
      <input
        v-model="localSearch"
        type="text"
        placeholder="Search past threads..."
        class="activity-search-input"
      />
    </div>

    <div v-if="loading" class="activity-empty">
      <a-spin size="small" />
      <span>Loading threads…</span>
    </div>

    <div v-else-if="threads.length === 0" class="activity-empty">
      <p>{{ search ? 'No matching threads.' : 'No recent activity to display.' }}</p>
      <span v-if="!search">Previous conversations will appear here.</span>
    </div>

    <div v-else class="activity-list">
      <button
        v-for="thread in threads"
        :key="thread.thread_id"
        class="activity-card"
        @click="emit('open-thread', thread.thread_id)"
      >
        <div class="activity-card-head">
          <span class="activity-title">{{ thread.title }}</span>
          <span class="activity-date">{{ formatDate(thread.created_at) }}</span>
        </div>
        <div class="activity-preview">{{ threadPreview(thread) }}</div>
        <div class="activity-foot">
          <span class="activity-count">
            {{ thread.message_count }} message{{ thread.message_count !== 1 ? 's' : '' }}
          </span>
          <span v-if="threadTone(thread)" class="activity-tone-pill">
            <span class="activity-tone-dot" :style="{ background: threadTone(thread)!.color }" />
            {{ threadTone(thread)!.label }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { PreviousThread } from '@/api/session.api'
import { formatDate, threadPreview, threadTone } from '@/utils/chatFormatters'

const props = defineProps<{
  threads: PreviousThread[]
  loading: boolean
  search: string
}>()

const emit = defineEmits<{
  refresh: []
  'update:search': [value: string]
  'open-thread': [threadId: string]
}>()

// Debounce the emit so filtering doesn't re-run on every keystroke. The input is bound
// to a local ref (not the prop) so typing stays instant while the parent updates late.
const SEARCH_DEBOUNCE_MS = 300
const localSearch = ref(props.search)
let searchTimer: ReturnType<typeof setTimeout> | null = null

// Keep in sync when the parent resets/changes the search externally.
watch(
  () => props.search,
  (v) => {
    if (v !== localSearch.value) localSearch.value = v
  }
)

watch(localSearch, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('update:search', v), SEARCH_DEBOUNCE_MS)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.chat-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px 6px;
}

.activity-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 48px 16px;
  font-size: 13px;
  color: var(--muted);
}

.activity-view {
  gap: 12px;
}

.activity-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 4px 2px;
}

.activity-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--teal-700);
}

.activity-head h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
  color: var(--ink);
}

.activity-refresh {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink-2);
  border-radius: 8px;
  padding: 7px 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.activity-refresh:disabled {
  opacity: 0.6;
  cursor: progress;
}

.activity-search {
  padding: 0 2px;
}

.activity-search-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  font-size: 12.5px;
  outline: none;
}

.activity-search-input:focus {
  border-color: var(--teal);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-card {
  border: 1px solid var(--line);
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
  border-radius: 12px;
  padding: 12px 13px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.12s, transform 0.12s, box-shadow 0.12s;
}

.activity-card:hover {
  border-color: var(--teal-100);
  box-shadow: 0 6px 18px rgba(15, 20, 40, 0.06);
  transform: translateY(-1px);
}

.activity-card-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 6px;
}

.activity-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}

.activity-date {
  font-size: 11px;
  color: var(--muted);
  flex-shrink: 0;
}

.activity-preview {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-2);
}

.activity-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.activity-count {
  font-size: 11.5px;
  color: var(--muted);
}

.activity-tone-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--teal-50);
  color: var(--teal-700);
  font-size: 11px;
  font-weight: 600;
}

.activity-tone-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>
