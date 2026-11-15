<template>
<div class="page-content-overflow2">
  <section class="page-content-top pt-4 px-4">
    <div class="d-flex justify-content-between align-items-start mb-4">
      <div>
        <h5 class="mb-1">{{ $t('adminBackend.statistics.userStatistics.title') }}</h5>
        <p class="text-muted small mb-0">{{ $t('adminBackend.statistics.userStatistics.description') }}</p>
      </div>
      <div class="d-flex flex-column align-items-end gap-1">
        <div class="btn btn-primary btn-sm" @click="refreshStats" :disabled="loading"><i class="fa-solid fa-arrows-rotate text-base mr-2"></i>{{ $t('adminBackend.audit.actions.refresh') }}</div>
        <div class="text-muted small" v-if="lastUpdate" :class="{ 'bg-blur': loading }">{{ $t('adminBackend.statistics.queueStatistics.lastUpdate') }}: {{ lastUpdate }}</div>
      </div>
    </div>
  </section>
  <section class="page-content">
    <div class="row px-4">
      <!-- Loading state-->
      <div class="col-12" v-if="loading">
        <div class="text-center py-5">
          <div class="spinner-border" role="status"></div>
          <p class="mt-3">{{ $t('adminBackend.statistics.loading') }}</p>
        </div>
      </div>
      <!-- Error state-->
      <div class="col-12" v-else-if="error">
        <div class="alert alert-danger">
          <h5>{{ $t('adminBackend.statistics.errorTitle') }}</h5>
          <p>{{ error }}</p>
        </div>
      </div>
      <!-- Content-->
      <div class="col-12" v-else-if="stats">
        <!-- Key Metrics Cards-->
        <div class="row mb-4">
          <div class="col-md-4 mb-3">
            <div class="card stats-card">
              <div class="card-body text-center">
                <h2 class="text-primary mb-1">{{ stats.total_users.toLocaleString() }}</h2>
                <p class="card-text mb-0">{{ $t('adminBackend.statistics.userStatistics.metrics.totalUsers') }}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4 mb-3">
            <div class="card stats-card">
              <div class="card-body text-center">
                <h2 class="text-success mb-1">{{ stats.active_users.toLocaleString() }}</h2>
                <p class="card-text mb-0">{{ $t('adminBackend.statistics.userStatistics.metrics.activeUsers') }}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4 mb-3">
            <div class="card stats-card">
              <div class="card-body text-center">
                <h2 class="text-info mb-1">{{ stats.monthly_active_users.toLocaleString() }}</h2>
                <p class="card-text mb-0">{{ $t('adminBackend.statistics.userStatistics.metrics.monthlyActiveUsers') }}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4 mb-3">
            <div class="card stats-card">
              <div class="card-body text-center">
                <h2 class="text-warning mb-1">{{ stats.daily_active_users.toLocaleString() }}</h2>
                <p class="card-text mb-0">{{ $t('adminBackend.statistics.userStatistics.metrics.dailyActiveUsers') }}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4 mb-3">
            <div class="card stats-card">
              <div class="card-body text-center">
                <h2 class="text-danger mb-1">{{ stats.calculum_users.toLocaleString() }}</h2>
                <p class="card-text mb-0">{{ $t('adminBackend.statistics.userStatistics.metrics.calculumUsers') }}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4 mb-3">
            <div class="card stats-card">
              <div class="card-body text-center">
                <h2 class="text-primary mb-1">{{ stats.connected_users_count.toLocaleString() }}</h2>
                <p class="card-text mb-0">{{ $t('adminBackend.statistics.userStatistics.metrics.connectedUsers') }}</p>
              </div>
            </div>
          </div>
        </div>
        <!-- Connected Users Table-->
        <div class="row mt-4">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">{{ $t('adminBackend.statistics.userStatistics.connectedUsers.title') }}</h5>
              </div>
              <div class="card-body">
                <div class="table-responsive" v-if="stats.connected_users_list.length > 0">
                  <table class="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>{{ $t('adminBackend.statistics.userStatistics.connectedUsers.lastActivity') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="user in stats.connected_users_list" :key="user.email">
                        <td>{{ user.name }}</td>
                        <td>{{ user.email }}</td>
                        <td>{{ formatRelativeTime(user.last_activity) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="text-center py-4" v-else>
                  <p class="mb-0">{{ $t('adminBackend.statistics.userStatistics.connectedUsers.noUsers') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Last Updated-->
        <div class="row mt-4">
          <div class="col-12 text-right"><small class="text-muted">Last updated: {{ formatRelativeTime(stats.last_updated) }}</small></div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { formatRelativeTime } from '@/utils/TimeUtils';
import { getUserStatistics, UserStatistics } from '@/modules/adminBackend/api/statistics';

export default defineComponent({
  name: 'UserStatistics',
  setup() {
    const stats = ref<UserStatistics | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastUpdate = ref('');

    const formatLastUpdate = (timestamp: string | Date): string => {
      const date = typeof timestamp === 'string'
        ? new Date(timestamp + 'Z')
        : timestamp;

      return new Intl.DateTimeFormat(navigator.language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timeZoneName: 'short'
      }).format(date);
    };

    const fetchStats = async () => {
      loading.value = true;
      error.value = null;

      try {
        const response = await getUserStatistics();
        if (response.success && response.data) {
          stats.value = response.data;
          lastUpdate.value = formatLastUpdate(new Date());
        } else {
          error.value = 'Error loading user statistics';
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'An error occurred';
      } finally {
        loading.value = false;
      }
    };

    // Refresh data every minute
    let interval: ReturnType<typeof setInterval>;
    onMounted(() => {
      fetchStats();
      interval = globalThis.setInterval(fetchStats, 60 * 1000);
    });

    onUnmounted(() => {
      if (interval) {
        globalThis.clearInterval(interval);
      }
    });

    const refreshStats = () => {
      fetchStats();
    };

    return {
      stats,
      loading,
      error,
      lastUpdate,
      refreshStats,
      formatRelativeTime
    };
  }
});
</script>

<style lang="scss" scoped>
.stats-card {
  min-height: auto;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
}

.bg-blur {
  filter: blur(2px);
}

.table {
  th {
    font-weight: 600;
    color: var(--text-muted);
  }

  td {
    vertical-align: middle;
  }
}
</style> 