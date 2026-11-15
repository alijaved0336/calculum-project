<template>
  <div class="history-footer">
    <button class="history-new-btn" type="button" @click="emit('new-chat')">
      <PlusSvg /> New conversation
    </button>
  </div>
</template>

<script setup lang="ts">
import { PlusSvg } from '@/components/chat/icons'

const emit = defineEmits<{
  'new-chat': []
}>()
</script>

<style scoped>
.history-footer {
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.history-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  transition:
    color 0.12s,
    background 0.12s;
}

.history-new-btn:hover {
  color: #111827;
  background: #f3f4f6;
}

.history-new-btn .ico {
  width: 12px;
  height: 12px;
}
</style>
