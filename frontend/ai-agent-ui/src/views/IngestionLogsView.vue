<template>
  <main class="page">
    <header>
      <div>
        <p class="eyebrow">Super Admin</p>
        <h1>Ingestion logs</h1>
      </div>
      <button @click="router.push({ name: 'super-admin' })">← Back to setup</button>
    </header>
    <IngestionLogsSection />
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import IngestionLogsSection from '@/components/admin/IngestionLogsSection.vue'

const router = useRouter()
</script>

<style scoped>
.page { max-width: 1500px; min-height: 100vh; margin: 0 auto; padding: 42px 36px 48px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
h1 { margin: 2px 0 0; font-size: 26px; color: var(--ink); }
.eyebrow { margin: 0; color: var(--muted); font-size: 13px; font-weight: 600; }
button { border: 1px solid #d1d5db; border-radius: 999px; padding: 8px 16px; background: #fff; color: #374151; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
button:hover { background: #f3f4f6; }
</style>
