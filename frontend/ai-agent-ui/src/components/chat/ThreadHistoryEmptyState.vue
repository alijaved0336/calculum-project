<template>
  <div v-if="loading" class="history-empty">
    <a-spin size="small" />
    <span>Loading threads…</span>
  </div>
  <div v-else class="history-empty">
    <ClockSvg />
    <p>{{ search ? 'No matching threads.' : 'No past threads yet.' }}</p>
    <span v-if="!search">Previous conversations will appear here.</span>
  </div>
</template>

<script setup lang="ts">
import { ClockSvg } from '@/components/chat/icons'

defineProps<{
  loading: boolean
  search: string
}>()
</script>

<style scoped>
.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  text-align: center;
}

.history-empty .ico {
  width: 24px;
  height: 24px;
  opacity: 0.2;
  margin-bottom: 4px;
}

.history-empty p {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin: 0;
}

.history-empty span {
  font-size: 12px;
  color: #9ca3af;
}
</style>
