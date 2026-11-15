<template>
  <div class="history-head">
    <span class="history-head-title">Past Threads</span>
    <button class="icon" type="button" @click="emit('close')" title="Close">
      <CloseSvg />
    </button>
  </div>
</template>

<script setup lang="ts">
import { CloseSvg } from '@/components/chat/icons'

const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped>
.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  flex-shrink: 0;
}

.history-head-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}

.icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.icon:hover {
  background: #f3f4f6;
  color: #111827;
}

.icon .ico {
  width: 13px;
  height: 13px;
}
</style>
