<template>
  <div class="skeleton-grid">
    <div v-for="i in count" :key="i" class="skeleton-card">
      <div class="skeleton-top">
        <div class="sk sk-name"></div>
        <div class="sk sk-received"></div>
      </div>
      <div class="sk sk-badge"></div>
      <div class="skeleton-fields">
        <div class="sk sk-field sk-field-1"></div>
        <div class="sk sk-field sk-field-2"></div>
        <div class="sk sk-field sk-field-3"></div>
        <div class="sk sk-field sk-field-4"></div>
      </div>
      <div class="skeleton-footer-row">
        <div class="sk sk-btn"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 4,
  },
)
</script>

<style scoped>
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}

.sk {
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 6px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 960px;
  margin: 0 auto;
}

.skeleton-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-top { display: flex; flex-direction: column; gap: 6px; }
.sk-name     { height: 15px; width: 58%; }
.sk-received { height: 11px; width: 38%; }
.sk-badge    { height: 36px; width: 36px; border-radius: 8px; }

.skeleton-fields { display: flex; flex-direction: column; gap: 8px; }
.sk-field    { height: 12px; }
.sk-field-1  { width: 100%; }
.sk-field-2  { width: 82%; }
.sk-field-3  { width: 70%; }
.sk-field-4  { width: 88%; }

.skeleton-footer-row { display: flex; justify-content: flex-end; margin-top: 4px; }
.sk-btn { height: 30px; width: 88px; border-radius: 20px; }

@media (max-width: 640px) {
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}
</style>
