<template>
  <div class="empty-state">
    <div class="empty-icon">🏢</div>
    <p class="empty-title">No suppliers found</p>
    <p class="empty-sub">
      {{ hasSearch ? 'No suppliers match your search.' : 'There are no suppliers available for this tenant.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hasSearch: boolean
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 10px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.empty-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.empty-sub {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}
</style>
