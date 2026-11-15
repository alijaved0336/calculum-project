<!-- src/modules/adminBackend/components/drawer/DrawerTabAudit.vue -->
<template>
<div class="audit-tab">
  <div class="loading-center" v-if="loading">
    <div class="spinner"></div>
  </div>
  <div class="error-banner" v-else-if="error">Could not load audit data.
    <button class="btn-link" @click="load">Try again</button>
  </div>
  <div class="empty-text" v-else-if="entries.length === 0">No audit history available.</div>
  <template v-else>
    <div class="audit-table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th style="width: 24px"></th>
            <th>Date / Time</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(entry, idx) in entries" :key="entry.activityDateTime + idx">
            <tr class="audit-row" @click="toggleRow(idx)">
              <td class="status-cell"><span class="status-dot" :class="entry.result === 'success' ? 'dot-success' : 'dot-fail'" :title="entry.result === 'success' ? 'Success' : 'Failed'"></span></td>
              <td>{{ formatDate(entry.activityDateTime) }}</td>
              <td>{{ entry.category || '—' }}</td>
            </tr>
            <tr class="detail-row" v-if="expandedRow === idx">
              <td colspan="3">
                <div class="detail-content">
                  <div class="detail-section">
                    <div class="detail-grid">
                      <div class="detail-label">Activity</div>
                      <div class="detail-value">{{ entry.activityDisplayName || '—' }}</div>
                      <div class="detail-label">Status</div>
                      <div class="detail-value">{{ entry.result === 'success' ? 'Success' : 'Failed' }}</div>
                      <div class="detail-label">IP Address</div>
                      <div class="detail-value ip-list">
                        <template v-if="parseIps(entry.ipAddress).length">
                          <span v-for="ip in parseIps(entry.ipAddress)" :key="ip" class="ip-cell">{{ ip }}</span>
                        </template>
                        <template v-else>—</template>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div class="audit-note">Showing last 20 entries from Azure B2C directory audit logs</div>
  </template>
</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserDrawer, type AuditLogEntry } from '@/composables/useUserDrawer'

const props = defineProps<{ user: { userUuid: string } }>()
const { fetchAuditLogs } = useUserDrawer()
const loading = ref(false)
const error = ref(false)
const entries = ref<AuditLogEntry[]>([])
const expandedRow = ref<number | null>(null)

function parseIps(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function toggleRow(idx: number) {
  expandedRow.value = expandedRow.value === idx ? null : idx
}

async function load() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) return
  loading.value = true; error.value = false
  try { entries.value = await fetchAuditLogs(uuid) }
  catch { error.value = true }
  finally { loading.value = false }
}

function formatDate(iso: string): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

watch(() => props.user, () => {
  entries.value = []
  expandedRow.value = null
  load()
}, { immediate: true })
</script>

<style scoped>
.audit-tab {
  font-size: 1rem;
}
.loading-center { text-align: center; padding: 16px 0; }
.spinner {
  display: inline-block; width: 14px; height: 14px; border: 2px solid #e5e7eb;
  border-top-color: #ff2c4f; border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-banner {
  padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626; display: flex; align-items: center; gap: 8px;
}
.btn-link { background: none; border: none; color: #ff2c4f; cursor: pointer; padding: 0; text-decoration: underline; }
.empty-text { color: #9ca3af; text-align: center; padding: 20px 0; }

.audit-table-wrap {
  border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 12px;
}
.audit-table { width: 100%; border-collapse: collapse; }
.audit-table th {
  background: #f9fafb; border-bottom: 1px solid #e5e7eb;
  padding: 7px 10px; text-align: left; font-weight: 600; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.audit-table td {
  padding: 8px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle;
}
.audit-table tbody tr:last-child td { border-bottom: none; }

.audit-row { cursor: pointer; }
.audit-row:hover td { background: #f9fafb; }

.status-cell { text-align: center; padding: 8px 4px 8px 10px; }
.status-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
}
.dot-success { background: #10b981; }
.dot-fail { background: #ef4444; }

.detail-row td {
  padding: 0; border-bottom: 1px solid #e5e7eb;
}
.detail-content {
  padding: 10px 14px; background: #f9fafb;
}
.detail-section { margin-bottom: 10px; }
.detail-section:last-child { margin-bottom: 0; }
.detail-grid {
  display: grid; grid-template-columns: auto 1fr; gap: 4px 12px;
}
.detail-label { font-weight: 600; color: #6b7280; text-transform: uppercase; }
.detail-value { color: #111827; }

.ip-list { display: flex; flex-direction: column; gap: 2px; }
.ip-cell { font-family: monospace; }

.audit-note { color: #9ca3af; text-align: center; padding: 20px 0 6px; }
</style>
