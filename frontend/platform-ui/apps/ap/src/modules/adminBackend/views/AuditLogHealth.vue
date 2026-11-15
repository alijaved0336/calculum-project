<template>
<div class="audit-log-health">
  <section class="health-header">
    <div class="container-fluid">
      <div class="header-row">
        <div class="header-title">
          <h2 class="page-title">
            <svg class="icon-title" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>Audit System Health
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
  <div class="loading-container" v-if="loading && !health">
    <CalculumLoading :modal="true"></CalculumLoading>
  </div>
  <div class="error-container" v-if="error && !loading">
    <div class="error-message">
      <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <h3 class="error-title">Error Loading Health Status</h3>
      <p class="error-text">{{ error.message }}</p>
      <button class="btn-retry" @click="refetch">Try Again</button>
    </div>
  </div>
  <section class="health-content" v-if="health && !loading">
    <div class="container-fluid">
      <div class="status-card">
        <div class="status-header">
          <div class="status-indicator" :class="statusClass">
            <div class="status-dot"></div>
          </div>
          <div class="status-info">
            <h3 class="status-title">Overall Status</h3>
            <p class="status-description">{{ statusDescription }}</p>
          </div>
          <div class="status-badge" :class="statusClass">{{ health.status.toUpperCase() }}</div>
        </div>
        <div class="status-timestamp">
          <svg class="icon-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>Last checked: {{ formatTimestamp(health.timestamp) }}
        </div>
      </div>
      <div class="checks-section">
        <h3 class="checks-title">Health Checks</h3>
        <div class="checks-grid">
          <div class="check-card" v-for="(check, key) in health.checks" :key="key" :class="{ 'check-unhealthy': !check.healthy }">
            <div class="check-header">
              <div class="check-icon" :class="check.healthy ? 'icon-success' : 'icon-error'">
                <svg v-if="check.healthy" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <div class="check-name">{{ formatCheckName(key) }}</div>
              <div class="check-status" :class="check.healthy ? 'status-ok' : 'status-fail'">{{ check.healthy ? 'OK' : 'FAIL' }}</div>
            </div>
            <div class="check-message">{{ check.message }}</div>
            <div class="check-details" v-if="check.policies || check.default_retention_days || check.failed_writes">
              <div class="detail-item" v-if="check.default_retention_days"><span class="detail-label">Default Retention:</span><span class="detail-value">{{ check.default_retention_days }} days</span></div>
              <div class="detail-item" v-if="check.failed_writes !== undefined"><span class="detail-label">Failed Writes:</span><span class="detail-value">{{ check.failed_writes }}</span></div>
              <div class="detail-item" v-if="check.policies"><span class="detail-label">Policies:</span><span class="detail-value">{{ Object.keys(check.policies).length }} configured</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted } from 'vue'
import { useAuditLogHealth, type AuditLogHealth } from '@/composables/useAuditLogHealth'
import { CalculumLoading } from '@ada/design-system'
import { useToast } from 'vue-toastification'

export default defineComponent({
  name: 'AuditLogHealth',
  components: {
    CalculumLoading
  },
  setup() {
    const toast = useToast()
    const { health, loading, error, fetchHealth, isHealthy, isDegraded, isUnhealthy } = useAuditLogHealth()

    const statusClass = computed(() => {
      if (isHealthy.value) return 'status-healthy'
      if (isDegraded.value) return 'status-degraded'
      if (isUnhealthy.value) return 'status-unhealthy'
      return 'status-unknown'
    })

    const statusDescription = computed(() => {
      if (isHealthy.value) return 'All systems operational'
      if (isDegraded.value) return 'Some systems may have issues'
      if (isUnhealthy.value) return 'Critical systems are down'
      return 'Status unknown'
    })

    const formatCheckName = (key: string): string => {
      const names: Record<string, string> = {
        database: 'Database',
        queue: 'Queue Processing',
        archive: 'Archive Storage',
        retention: 'Retention Policy',
        metrics: 'Metrics'
      }
      return names[key] || key.charAt(0).toUpperCase() + key.slice(1)
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

    const refetch = async () => {
      await fetchHealth()
      if (!error.value) {
        toast.success('Health status refreshed')
      }
    }

    onMounted(() => {
      fetchHealth()
    })

    return {
      health,
      loading,
      error,
      statusClass,
      statusDescription,
      formatCheckName,
      formatTimestamp,
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
$color-bg: #f8f9fa;
$color-card: #ffffff;
$color-border: #e0e0e0;
$color-text-primary: #212529;
$color-text-secondary: #6c757d;

.audit-log-health {
  background: $color-bg;
  min-height: 100vh;
  padding-bottom: 2rem;
  font-size: 1rem;
}

.health-header {
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

.health-content {
  padding: 2rem 0;
}

.status-card {
  background: white;
  border: 1px solid $color-border;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .status-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .status-indicator {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.status-healthy {
      background: lighten($color-success, 40%);
      .status-dot {
        background: $color-success;
      }
    }

    &.status-degraded {
      background: lighten($color-warning, 40%);
      .status-dot {
        background: $color-warning;
      }
    }

    &.status-unhealthy {
      background: lighten($color-error, 40%);
      .status-dot {
        background: $color-error;
      }
    }

    .status-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }
  }

  .status-info {
    flex: 1;

    .status-title {
      font-size: 20px;
      font-weight: 700;
      color: $color-text-primary;
      margin: 0 0 0.25rem 0;
    }

    .status-description {
      color: $color-text-secondary;
      margin: 0;
    }
  }

  .status-badge {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &.status-healthy {
      background: lighten($color-success, 40%);
      color: $color-success;
    }

    &.status-degraded {
      background: lighten($color-warning, 40%);
      color: darken($color-warning, 20%);
    }

    &.status-unhealthy {
      background: lighten($color-error, 40%);
      color: $color-error;
    }
  }

  .status-timestamp {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: $color-text-secondary;
    padding-top: 1rem;
    border-top: 1px solid $color-border;

    .icon-sm {
      width: 16px;
      height: 16px;
    }
  }
}

.checks-section {
  .checks-title {
    font-size: 20px;
    font-weight: 700;
    color: $color-text-primary;
    margin-bottom: 1rem;
  }

  .checks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .check-card {
    background: white;
    border: 1px solid $color-border;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transform: translateY(-1px);
    }

    &.check-unhealthy {
      border-color: $color-error;
      background: lighten($color-error, 45%);
    }

    .check-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .check-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;

      &.icon-success {
        color: $color-success;
      }

      &.icon-error {
        color: $color-error;
      }

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .check-name {
      flex: 1;
      font-size: 16px;
      font-weight: 600;
      color: $color-text-primary;
    }

    .check-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;

      &.status-ok {
        background: lighten($color-success, 40%);
        color: $color-success;
      }

      &.status-fail {
        background: lighten($color-error, 40%);
        color: $color-error;
      }
    }

    .check-message {
      color: $color-text-secondary;
      margin-bottom: 0.5rem;
    }

    .check-details {
      padding-top: 0.5rem;
      border-top: 1px solid $color-border;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .detail-item {
        display: flex;
        justify-content: space-between;

        .detail-label {
          color: $color-text-secondary;
          font-weight: 500;
        }

        .detail-value {
          color: $color-text-primary;
          font-weight: 600;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .checks-grid {
    grid-template-columns: 1fr;
  }
}
</style>

