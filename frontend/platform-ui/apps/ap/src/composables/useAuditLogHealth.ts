import { ref, computed } from 'vue'
import axios from '@/utils/axios'
import { useToast } from 'vue-toastification'
/**
 * Health check response interface
 */
export interface AuditLogHealthCheck {
  healthy: boolean
  message: string
  [key: string]: any
}

export interface AuditLogHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database?: AuditLogHealthCheck
    queue?: AuditLogHealthCheck
    archive?: AuditLogHealthCheck
    retention?: AuditLogHealthCheck
    metrics?: AuditLogHealthCheck
  }
}

/**
 * Metrics response interface
 */
export interface AuditLogMetrics {
  metrics: {
    logs_per_minute?: number
    logs_per_hour?: number
    batch_processing_latency_ms?: number
    failed_log_writes?: number
    total_logs?: number
    recent_logs_24h?: number
    logs_by_level?: Record<string, number>
  }
  health: {
    healthy: boolean
    issues?: string[]
  }
  timestamp: string
}

/**
 * Composable to fetch audit log health status
 */
export function useAuditLogHealth() {
  const toast = useToast()
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const health = ref<AuditLogHealth | null>(null)

  const fetchHealth = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/audit-logs/health`)
      health.value = response.data

      if (import.meta.env.DEV) {
        console.log('Audit log health:', health.value)
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Error fetching audit log health'
      error.value = new Error(errorMessage)
      
      if (import.meta.env.DEV) {
        console.error('Error fetching audit log health:', err)
      }
      
      toast.error('Error fetching audit log health status')
    } finally {
      loading.value = false
    }
  }

  const isHealthy = computed(() => health.value?.status === 'healthy')
  const isDegraded = computed(() => health.value?.status === 'degraded')
  const isUnhealthy = computed(() => health.value?.status === 'unhealthy')

  return {
    health,
    loading,
    error,
    fetchHealth,
    isHealthy,
    isDegraded,
    isUnhealthy
  }
}

/**
 * Composable to fetch audit log metrics
 */
export function useAuditLogMetrics() {
  const toast = useToast()
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const metrics = ref<AuditLogMetrics | null>(null)

  const fetchMetrics = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/audit-logs/health/metrics`)
      metrics.value = response.data

      if (import.meta.env.DEV) {
        console.log('Audit log metrics:', metrics.value)
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Error fetching audit log metrics'
      error.value = new Error(errorMessage)
      
      if (import.meta.env.DEV) {
        console.error('Error fetching audit log metrics:', err)
      }
      
      toast.error('Error fetching audit log metrics')
    } finally {
      loading.value = false
    }
  }

  return {
    metrics,
    loading,
    error,
    fetchMetrics
  }
}

