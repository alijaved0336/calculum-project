<template>
  <div class="history-search">
    <SearchSvg />
    <input
      v-model="localSearch"
      class="history-search-input"
      placeholder="Search past threads..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { SearchSvg } from '@/components/chat/icons'

const props = defineProps<{
  search: string
}>()

const emit = defineEmits<{
  'update:search': [value: string]
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
.history-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #9ca3af;
  flex-shrink: 0;
}

.history-search .ico {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.history-search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font: inherit;
  font-size: 12.5px;
  color: #111827;
}

.history-search-input::placeholder {
  color: #9ca3af;
}
</style>
