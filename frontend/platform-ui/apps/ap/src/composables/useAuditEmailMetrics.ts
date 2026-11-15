import { ref } from 'vue'
import { getAuditEmails } from '@/modules/adminBackend/api/auditEmails'

export interface EmailStatusCounts {
  sent: number
  queued: number
  failed: number
  skipped: number
}

export interface AuditEmailMetrics {
  totalEmails: number
  recentEmails24h: number
  latestStatus: EmailStatusCounts
}

export function useAuditEmailMetrics() {
  const metrics = ref<AuditEmailMetrics | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchMetrics() {
    loading.value = true
    error.value = null

    try {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Fetch all metrics in parallel using server-side status filter
      const [totalResponse, recentResponse, sentResponse, queuedResponse, failedResponse, skippedResponse] = await Promise.all([
        getAuditEmails({ page: 1 }),
        getAuditEmails({ createdAfter: yesterday.toISOString(), page: 1 }),
        getAuditEmails({ createdAfter: yesterday.toISOString(), status: 'sent', page: 1 }),
        getAuditEmails({ createdAfter: yesterday.toISOString(), status: 'queued', page: 1 }),
        getAuditEmails({ createdAfter: yesterday.toISOString(), status: 'failed', page: 1 }),
        getAuditEmails({ createdAfter: yesterday.toISOString(), status: 'skipped', page: 1 }),
      ])

      const getTotalItems = (resp: any): number => {
        if (resp.success && resp.data) {
          return resp.data['hydra:totalItems'] || resp.data['totalItems'] || 0
        }
        return 0
      }

      metrics.value = {
        totalEmails: getTotalItems(totalResponse),
        recentEmails24h: getTotalItems(recentResponse),
        latestStatus: {
          sent: getTotalItems(sentResponse),
          queued: getTotalItems(queuedResponse),
          failed: getTotalItems(failedResponse),
          skipped: getTotalItems(skippedResponse),
        },
      }
    } catch (err: any) {
      error.value = new Error(err?.message || 'Error fetching email metrics')
    } finally {
      loading.value = false
    }
  }

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
  }
}
