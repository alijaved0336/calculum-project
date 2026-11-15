<template>
  <div v-if="loading" class="session-status">
    <a-spin size="small" /> Starting session…
  </div>
  <div v-else-if="error" class="session-error">
    {{ error }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean
  error: string | null
}>()
</script>

<style scoped>
.session-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--muted);
  border-bottom: 1px solid var(--line-2);
  flex-shrink: 0;
}
.session-error {
  padding: 6px 12px;
  font-size: 12px;
  color: #dc2626;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  flex-shrink: 0;
}
</style>
