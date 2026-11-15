<template>
  <SetupSectionCard
    title="Ingestion logs"
    hint="Monitor scheduled data syncs"
    description="Recent supplier-data ingestion runs, including per-feed metrics and errors."
  >
    <div class="toolbar">
      <span>{{ total }} runs</span>
      <button class="refresh" :disabled="loading" @click="load()">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Started</th><th>Status</th><th>Completed</th><th>Duration</th><th>Details</th></tr></thead>
        <tbody>
          <tr v-if="!loading && !logs.length"><td colspan="5" class="empty">No ingestion logs yet.</td></tr>
          <tr v-for="log in logs" :key="log.uuid">
            <td>{{ formatDate(log.started_at) }}</td>
            <td><span class="status" :class="log.status.toLowerCase()">{{ log.status }}</span></td>
            <td>{{ log.completed_at ? formatDate(log.completed_at) : 'In progress' }}</td>
            <td>{{ duration(log.started_at, log.completed_at) }}</td>
            <td>
              <details><summary>View</summary><pre>{{ JSON.stringify(log.logs, null, 2) }}</pre></details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="total > pageSize" class="pagination">
      <button class="refresh" :disabled="loading || page === 1" @click="load(page - 1)">Previous</button>
      <span>Page {{ page }}</span>
      <button class="refresh" :disabled="loading || page * pageSize >= total" @click="load(page + 1)">Next</button>
    </div>
  </SetupSectionCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SetupSectionCard from '@/components/admin/SetupSectionCard.vue'
import { ingestionApi, type IngestionLog } from '@/api/ingestion.api'

const logs = ref<IngestionLog[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 25

async function load(nextPage = page.value) {
  loading.value = true
  error.value = ''
  try {
    const { data } = await ingestionApi.getLogs(pageSize, (nextPage - 1) * pageSize)
    logs.value = data.items
    total.value = data.total
    page.value = nextPage
  } catch {
    error.value = 'Could not load ingestion logs.'
  } finally {
    loading.value = false
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function duration(startedAt: string, completedAt: string | null) {
  if (!completedAt) return '—'
  const seconds = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; color: var(--muted); font-size: 13px; }
.refresh { border: 1px solid var(--line); border-radius: 7px; padding: 7px 12px; background: #fff; color: var(--ink); font: inherit; cursor: pointer; }
.refresh:disabled { cursor: wait; opacity: .65; }
.pagination { display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 14px; color: var(--muted); font-size: 13px; }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
table { width: 100%; min-width: 680px; border-collapse: collapse; font-size: 13px; }
th, td { padding: 12px 14px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
th { background: #fafafa; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
tr:last-child td { border-bottom: 0; }
.status { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e; }
.status.completed { background: #dcfce7; color: #166534; }
.status.failed { background: #fee2e2; color: #b91c1c; }
.empty, .error { color: var(--muted); text-align: center; }
.error { color: #b91c1c; }
summary { color: #4f46e5; cursor: pointer; }
pre { max-width: 400px; max-height: 220px; overflow: auto; margin: 8px 0 0; padding: 8px; border-radius: 6px; background: #f8fafc; font-size: 11px; }
</style>
