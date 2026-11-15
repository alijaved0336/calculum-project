<template>
  <div class="skeleton-card">
    <div class="skeleton-header">
      <div class="skeleton-title" />
      <div class="skeleton-chevron" />
    </div>
    <div class="skeleton-desc" />
    <div class="skeleton-body">
      <div v-for="n in rows" :key="n" class="skeleton-row" :style="{ width: rowWidth(n) }" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ rows?: number }>()

const rowWidths = ['100%', '80%', '92%', '70%', '85%']

function rowWidth(n: number): string {
  return rowWidths[(n - 1) % rowWidths.length]
}
</script>

<style scoped>
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}

.shimmer {
  background: linear-gradient(90deg, #f0f2f5 25%, #e4e7eb 50%, #f0f2f5 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 6px;
}

.skeleton-card {
  border-bottom: 1px solid var(--line, #E5E7EB);
  padding: 24px 0;
}

.skeleton-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.skeleton-title {
  width: 160px;
  height: 16px;
  background: linear-gradient(90deg, #f0f2f5 25%, #e4e7eb 50%, #f0f2f5 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 6px;
}

.skeleton-chevron {
  width: 22px;
  height: 22px;
  background: linear-gradient(90deg, #f0f2f5 25%, #e4e7eb 50%, #f0f2f5 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 4px;
}

.skeleton-desc {
  width: 55%;
  height: 13px;
  margin-bottom: 20px;
  background: linear-gradient(90deg, #f0f2f5 25%, #e4e7eb 50%, #f0f2f5 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 6px;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-row {
  height: 40px;
  background: linear-gradient(90deg, #f0f2f5 25%, #e4e7eb 50%, #f0f2f5 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
}
</style>
