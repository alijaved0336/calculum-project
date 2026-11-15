<template>
<div class="audit-log-metrics">
  <section class="metrics-header">
    <div class="container-fluid">
      <div class="header-row">
        <div class="header-title">
          <h2 class="page-title">
            <svg class="icon-title" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>Audit Metrics
          </h2>
        </div>
        <div class="header-actions">
          <button class="btn-icon" @click="refetch" :disabled="loading" title="Refresh">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
  <div class="loading-container" v-if="loading && !metrics">
    <CalculumLoading :modal="true"></CalculumLoading>
  </div>
  <div class="error-container" v-if="error && !loading">
    <div class="error-message">
      <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <h3 class="error-title">Error Loading Metrics</h3>
      <p class="error-text">{{ error.message }}</p>
      <button class="btn-retry" @click="refetch">Try Again</button>
    </div>
  </div>
  <section class="metrics-content" v-if="metrics && !loading">
    <div class="container-fluid">
      <h3 class="section-title section-main-title">Audit Log Metrics</h3>
      <div class="overview-section">
        <h3 class="section-title">Overview</h3>
        <div class="overview-grid">
          <div class="metric-card">
            <div class="metric-icon icon-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="metric-content">
              <div class="metric-label">Total Logs</div>
              <div class="metric-value">{{ formatNumber(metrics.metrics.total_logs || 0) }}</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon icon-info">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="metric-content">
              <div class="metric-label">Recent Logs (24h)</div>
              <div class="metric-value">{{ formatNumber(metrics.metrics.recent_logs_24h || 0) }}</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon icon-warning">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="metric-content">
              <div class="metric-label">Failed Writes</div>
              <div class="metric-value">{{ formatNumber(metrics.metrics.failed_log_writes || 0) }}</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon icon-success">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <div class="metric-content">
              <div class="metric-label">Batch Latency</div>
              <div class="metric-value">{{ formatLatency(metrics.metrics.batch_processing_latency_ms || 0) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="performance-section">
        <h3 class="section-title">Performance Metrics</h3>
        <div class="performance-grid">
          <div class="performance-card">
            <div class="performance-header">
              <div class="performance-label">Logs per Minute</div>
              <div class="performance-icon icon-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="performance-value">{{ formatNumber(metrics.metrics.logs_per_minute || 0) }}</div>
            <div class="performance-unit">/min</div>
          </div>
          <div class="performance-card">
            <div class="performance-header">
              <div class="performance-label">Logs per Hour</div>
              <div class="performance-icon icon-info">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="performance-value">{{ formatNumber(metrics.metrics.logs_per_hour || 0) }}</div>
            <div class="performance-unit">/hour</div>
          </div>
        </div>
      </div>
      <div class="logs-by-level-section" v-if="metrics.metrics.logs_by_level && Object.keys(metrics.metrics.logs_by_level).length > 0">
        <h3 class="section-title">Logs by Level</h3>
        <div class="logs-level-grid">
          <div class="level-card" v-for="(count, level) in metrics.metrics.logs_by_level" :key="level" :class="`level-${level.toLowerCase()}`">
            <div class="level-header">
              <div class="level-badge" :class="`badge-${level.toLowerCase()}`">{{ level }}</div>
              <div class="level-count">{{ formatNumber(count) }}</div>
            </div>
            <div class="level-bar">
              <div class="level-bar-fill" :style="{ width: getLevelPercentage(count) + '%' }" :class="`bar-${level.toLowerCase()}`"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="health-status-section" v-if="metrics.health">
        <h3 class="section-title">System Health</h3>
        <div class="health-card" :class="metrics.health.healthy ? 'health-ok' : 'health-issues'">
          <div class="health-header">
            <div class="health-icon" :class="metrics.health.healthy ? 'icon-success' : 'icon-error'">
              <svg v-if="metrics.health.healthy" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <div class="health-info">
              <div class="health-title">{{ metrics.health.healthy ? 'System Healthy' : 'System Issues Detected' }}</div>
              <div class="health-description">{{ metrics.health.healthy ? 'All systems are operating normally' : 'Some issues have been detected' }}</div>
            </div>
          </div>
          <div class="health-issues-list" v-if="metrics.health.issues && metrics.health.issues.length > 0">
            <div class="issue-item" v-for="(issue, index) in metrics.health.issues" :key="index">
              <svg class="issue-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>{{ issue }}
            </div>
          </div>
        </div>
      </div>
      <div class="email-metrics-section">
        <h3 class="section-title">Email Metrics</h3>
        <div class="loading-container" v-if="emailLoading && !emailMetrics">
          <CalculumLoading :modal="true"></CalculumLoading>
        </div>
        <div class="email-metrics-content" v-if="emailMetrics && !emailLoading">
          <div class="overview-grid">
            <div class="metric-card">
              <div class="metric-icon icon-email">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <div class="metric-content">
                <div class="metric-label">Total Emails</div>
                <div class="metric-value">{{ formatNumber(emailMetrics.totalEmails) }}</div>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon icon-info">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div class="metric-content">
                <div class="metric-label">Recent Emails (24h)</div>
                <div class="metric-value">{{ formatNumber(emailMetrics.recentEmails24h) }}</div>
              </div>
            </div>
          </div>
          <div class="email-status-subsection">
            <h4 class="subsection-title">Status Distribution<span class="sample-badge">Last 24 hours</span></h4>
            <div class="status-cards-grid">
              <div class="status-card status-sent">
                <div class="status-card-header">
                  <div class="status-dot dot-sent"></div><span class="status-label">Sent</span>
                </div>
                <div class="status-card-value">{{ emailMetrics.latestStatus.sent }}</div>
              </div>
              <div class="status-card status-queued">
                <div class="status-card-header">
                  <div class="status-dot dot-queued"></div><span class="status-label">Queued</span>
                </div>
                <div class="status-card-value">{{ emailMetrics.latestStatus.queued }}</div>
              </div>
              <div class="status-card status-failed">
                <div class="status-card-header">
                  <div class="status-dot dot-failed"></div><span class="status-label">Failed</span>
                </div>
                <div class="status-card-value">{{ emailMetrics.latestStatus.failed }}</div>
              </div>
              <div class="status-card status-skipped">
                <div class="status-card-header">
                  <div class="status-dot dot-skipped"></div><span class="status-label">Skipped</span>
                </div>
                <div class="status-card-value">{{ emailMetrics.latestStatus.skipped }}</div>
              </div>
            </div>
            <div class="status-bar">
              <div class="status-bar-fill bar-sent" v-if="emailMetrics.latestStatus.sent > 0" :style="{ width: getEmailStatusPct('sent') + '%' }"></div>
              <div class="status-bar-fill bar-queued" v-if="emailMetrics.latestStatus.queued > 0" :style="{ width: getEmailStatusPct('queued') + '%' }"></div>
              <div class="status-bar-fill bar-failed" v-if="emailMetrics.latestStatus.failed > 0" :style="{ width: getEmailStatusPct('failed') + '%' }"></div>
              <div class="status-bar-fill bar-skipped" v-if="emailMetrics.latestStatus.skipped > 0" :style="{ width: getEmailStatusPct('skipped') + '%' }"></div>
            </div>
            <div class="status-legend">
              <div class="legend-item">
                <div class="legend-dot dot-sent"></div><span>Sent {{ getEmailStatusPct('sent') }}%</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot dot-queued"></div><span>Queued {{ getEmailStatusPct('queued') }}%</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot dot-failed"></div><span>Failed {{ getEmailStatusPct('failed') }}%</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot dot-skipped"></div><span>Skipped {{ getEmailStatusPct('skipped') }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="timestamp-section">
        <div class="timestamp">
          <svg class="icon-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>Last updated: {{ formatTimestamp(metrics.timestamp) }}
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useAuditLogMetrics } from '@/composables/useAuditLogHealth'
import { useAuditEmailMetrics } from '@/composables/useAuditEmailMetrics'
import { CalculumLoading } from '@ada/design-system'
import { useToast } from 'vue-toastification'

export default defineComponent({
  name: 'AuditLogMetrics',
  components: {
    CalculumLoading
  },
  setup() {
    const toast = useToast()
    const { metrics, loading, error, fetchMetrics } = useAuditLogMetrics()
    const {
      metrics: emailMetrics,
      loading: emailLoading,
      error: emailError,
      fetchMetrics: fetchEmailMetrics
    } = useAuditEmailMetrics()

    const formatNumber = (num: number): string => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
      }
      return num.toString()
    }

    const formatLatency = (ms: number): string => {
      if (ms < 1000) {
        return `${ms}ms`
      }
      return `${(ms / 1000).toFixed(2)}s`
    }

    const formatTimestamp = (timestamp: string): string => {
      if (!timestamp) return 'Unknown'
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    const getLevelPercentage = (count: number): number => {
      if (!metrics.value?.metrics?.logs_by_level) return 0
      const total = Object.values(metrics.value.metrics.logs_by_level).reduce((a, b) => a + b, 0)
      if (total === 0) return 0
      return (count / total) * 100
    }

    const getEmailStatusPct = (status: 'sent' | 'queued' | 'failed' | 'skipped'): string => {
      if (!emailMetrics.value) return '0'
      const s = emailMetrics.value.latestStatus
      const total = s.sent + s.queued + s.failed + s.skipped
      if (total === 0) return '0'
      return ((s[status] / total) * 100).toFixed(1)
    }

    const refetch = async () => {
      await Promise.all([fetchMetrics(), fetchEmailMetrics()])
      if (!error.value && !emailError.value) {
        toast.success('Metrics refreshed')
      }
    }

    onMounted(() => {
      fetchMetrics()
      fetchEmailMetrics()
    })

    return {
      metrics,
      loading,
      error,
      emailMetrics,
      emailLoading,
      emailError,
      formatNumber,
      formatLatency,
      formatTimestamp,
      getLevelPercentage,
      getEmailStatusPct,
      refetch
    }
  }
})
</script>

<style lang="scss" scoped>
$color-primary: #ff2c4f;
$color-success: #28a745;
$color-warning: #ffc107;
$color-error: #dc3545;
$color-info: #17a2b8;
$color-bg: #f8f9fa;
$color-card: #ffffff;
$color-border: #e0e0e0;
$color-text-primary: #212529;
$color-text-secondary: #6c757d;

.audit-log-metrics {
  background: $color-bg;
  min-height: 100vh;
  padding-bottom: 2rem;
  font-size: 1rem;
}

.metrics-header {
  background: white;
  border-bottom: 1px solid $color-border;
  padding: 1rem 0;

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }

  .header-title {
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: $color-text-primary;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .icon-title {
        width: 28px;
        height: 28px;
        color: $color-primary;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-icon {
    background: white;
    border: 1px solid $color-border;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    .icon {
      width: 20px;
      height: 20px;
      color: $color-text-primary;
    }

    &:hover:not(:disabled) {
      border-color: $color-primary;
      background: lighten($color-primary, 45%);
      transform: translateY(-1px);

      .icon {
        color: $color-primary;
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.loading-container {
  padding: 4rem 0;
}

.error-container {
  padding: 4rem 2rem;
  text-align: center;

  .error-message {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    background: white;
    border-radius: 12px;
    border: 2px solid $color-error;

    .error-icon {
      width: 64px;
      height: 64px;
      color: $color-error;
      margin-bottom: 1rem;
    }

    .error-title {
      font-size: 24px;
      font-weight: 700;
      color: $color-text-primary;
      margin-bottom: 0.5rem;
    }

    .error-text {
      font-size: 16px;
      color: $color-text-secondary;
      margin-bottom: 1.5rem;
    }

    .btn-retry {
      background: $color-primary;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: darken($color-primary, 10%);
        transform: translateY(-2px);
      }
    }
  }
}

.metrics-content {
  padding: 2rem 0;
}

.section-main-title {
  font-size: 22px;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid $color-primary;
  display: inline-block;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 1.5rem;
}

.overview-section {
  margin-bottom: 2rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: white;
  border: 1px solid $color-border;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .metric-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 24px;
      height: 24px;
    }

    &.icon-primary {
      background: lighten($color-primary, 40%);
      color: $color-primary;
    }

    &.icon-info {
      background: lighten($color-info, 40%);
      color: $color-info;
    }

    &.icon-warning {
      background: lighten($color-warning, 40%);
      color: darken($color-warning, 20%);
    }

    &.icon-success {
      background: lighten($color-success, 40%);
      color: $color-success;
    }
  }

  .metric-content {
    flex: 1;

    .metric-label {
      color: $color-text-secondary;
      margin-bottom: 0.25rem;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: $color-text-primary;
    }
  }
}

.performance-section {
  margin-bottom: 2rem;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.performance-card {
  background: white;
  border: 1px solid $color-border;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .performance-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;

    .performance-label {
      font-weight: 600;
      color: $color-text-secondary;
    }

    .performance-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 18px;
        height: 18px;
      }

      &.icon-primary {
        background: lighten($color-primary, 40%);
        color: $color-primary;
      }

      &.icon-info {
        background: lighten($color-info, 40%);
        color: $color-info;
      }
    }
  }

  .performance-value {
    font-size: 36px;
    font-weight: 700;
    color: $color-text-primary;
    line-height: 1;
  }

  .performance-unit {
    color: $color-text-secondary;
    margin-top: 0.5rem;
  }
}

.logs-by-level-section {
  margin-bottom: 2rem;
}

.logs-level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.level-card {
  background: white;
  border: 1px solid $color-border;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .level-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .level-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-weight: 700;
    text-transform: uppercase;

    &.badge-error {
      background: lighten($color-error, 40%);
      color: $color-error;
    }

    &.badge-warning {
      background: lighten($color-warning, 40%);
      color: darken($color-warning, 20%);
    }

    &.badge-info {
      background: lighten($color-info, 40%);
      color: $color-info;
    }

    &.badge-debug {
      background: lighten($color-text-secondary, 40%);
      color: $color-text-secondary;
    }
  }

  .level-count {
    font-size: 20px;
    font-weight: 700;
    color: $color-text-primary;
  }

  .level-bar {
    height: 8px;
    background: $color-bg;
    border-radius: 4px;
    overflow: hidden;

    .level-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;

      &.bar-error {
        background: $color-error;
      }

      &.bar-warning {
        background: $color-warning;
      }

      &.bar-info {
        background: $color-info;
      }

      &.bar-debug {
        background: $color-text-secondary;
      }
    }
  }
}

.health-status-section {
  margin-bottom: 2rem;
}

.health-card {
  background: white;
  border: 1px solid $color-border;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &.health-ok {
    border-color: $color-success;
  }

  &.health-issues {
    border-color: $color-error;
  }

  .health-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .health-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 24px;
      height: 24px;
    }

    &.icon-success {
      background: lighten($color-success, 40%);
      color: $color-success;
    }

    &.icon-error {
      background: lighten($color-error, 40%);
      color: $color-error;
    }
  }

  .health-info {
    flex: 1;

    .health-title {
      font-size: 18px;
      font-weight: 700;
      color: $color-text-primary;
      margin-bottom: 0.25rem;
    }

    .health-description {
      color: $color-text-secondary;
    }
  }

  .health-issues-list {
    padding-top: 1rem;
    border-top: 1px solid $color-border;

    .issue-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      color: $color-text-primary;

      .issue-icon {
        width: 20px;
        height: 20px;
        color: $color-error;
        flex-shrink: 0;
      }
    }
  }
}

.email-metrics-section {
  margin-bottom: 2rem;
  padding-top: 2rem;
  border-top: 2px solid $color-border;
}

.email-metrics-content {
  .overview-grid {
    margin-bottom: 1.5rem;
  }
}

.metric-icon {
  &.icon-email {
    background: lighten(#6f42c1, 40%);
    color: #6f42c1;
  }
}

.email-status-subsection {
  margin-top: 1.5rem;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .sample-badge {
    font-weight: 500;
    color: $color-text-secondary;
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: 12px;
    padding: 0.15rem 0.6rem;
  }
}

.status-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-card {
  background: white;
  border: 1px solid $color-border;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  .status-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .status-label {
    font-weight: 600;
    color: $color-text-secondary;
  }

  .status-card-value {
    font-size: 24px;
    font-weight: 700;
    color: $color-text-primary;
  }

  &.status-sent {
    border-left: 3px solid $color-success;
  }

  &.status-queued {
    border-left: 3px solid $color-warning;
  }

  &.status-failed {
    border-left: 3px solid $color-error;
  }

  &.status-skipped {
    border-left: 3px solid $color-text-secondary;
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.dot-sent { background: $color-success; }
  &.dot-queued { background: $color-warning; }
  &.dot-failed { background: $color-error; }
  &.dot-skipped { background: $color-text-secondary; }
}

.status-bar {
  height: 10px;
  background: $color-bg;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  margin-bottom: 0.75rem;

  .status-bar-fill {
    height: 100%;
    transition: width 0.3s ease;

    &.bar-sent { background: $color-success; }
    &.bar-queued { background: $color-warning; }
    &.bar-failed { background: $color-error; }
    &.bar-skipped { background: $color-text-secondary; }
  }
}

.status-legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: $color-text-secondary;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.dot-sent { background: $color-success; }
    &.dot-queued { background: $color-warning; }
    &.dot-failed { background: $color-error; }
    &.dot-skipped { background: $color-text-secondary; }
  }
}

.timestamp-section {
  text-align: center;
  padding: 1rem 0;

  .timestamp {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: $color-text-secondary;

    .icon-sm {
      width: 16px;
      height: 16px;
    }
  }
}

@media (max-width: 768px) {
  .overview-grid,
  .performance-grid,
  .logs-level-grid {
    grid-template-columns: 1fr;
  }
}
</style>

