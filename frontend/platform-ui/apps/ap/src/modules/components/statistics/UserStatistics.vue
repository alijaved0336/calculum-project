<template>
  <div class="user-statistics">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" role="status"></div>
      <p class="mt-3">Loading statistics...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-danger">
      <h5>Error</h5>
      <p>{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <div class="statistics-grid">
        <!-- Overall Statistics -->
        <div class="stat-card">
          <h3>Total Users</h3>
          <div class="stat-value">{{ statistics?.total_users || 0 }}</div>
        </div>
        <div class="stat-card">
          <h3>Active Users</h3>
          <div class="stat-value">{{ statistics?.active_users || 0 }}</div>
        </div>
        <div class="stat-card">
          <h3>Monthly Active Users</h3>
          <div class="stat-value">{{ statistics?.monthly_active_users || 0 }}</div>
        </div>
        <div class="stat-card">
          <h3>Daily Active Users</h3>
          <div class="stat-value">{{ statistics?.daily_active_users || 0 }}</div>
        </div>
        <div class="stat-card">
          <h3>Calculum Users</h3>
          <div class="stat-value">{{ statistics?.calculum_users || 0 }}</div>
        </div>
        <div class="stat-card">
          <h3>Currently Connected</h3>
          <div class="stat-value">{{ statistics?.connected_users_count || 0 }}</div>
        </div>
      </div>

      <!-- Connected Users List -->
      <div class="connected-users-section">
        <h3>Connected Users</h3>
        <div class="connected-users-list">
          <table v-if="statistics?.connected_users_list?.length">
            <caption>Currently connected users</caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in statistics.connected_users_list" :key="user.email">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ formatRelativeTime(user.last_activity) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="no-users">
            No users currently connected
          </div>
        </div>
      </div>

      <!-- Last Updated -->
      <div v-if="statistics?.last_updated" class="last-updated" >
        Last updated: {{ formatRelativeTime(statistics.last_updated) }}
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { formatRelativeTime } from '../../../utils/TimeUtils';
import { getUserStatistics, UserStatistics } from '@/modules/adminBackend/api/statistics';

export default defineComponent({
  name: 'UserStatistics',
  setup() {
    const statistics = ref<UserStatistics | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const fetchStats = async () => {
      loading.value = true;
      error.value = null;

      try {
        const response = await getUserStatistics();
        if (response.success && response.data) {
          statistics.value = response.data;
        } else {
          error.value = 'Error loading user statistics';
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'An error occurred';
      } finally {
        loading.value = false;
      }
    };

    // Refresh data every 5 minutes
    let interval: number;
    onMounted(() => {
      fetchStats();
      interval = window.setInterval(fetchStats, 5 * 60 * 1000);
    });

    onUnmounted(() => {
      if (interval) {
        window.clearInterval(interval);
      }
    });

    return {
      statistics,
      loading,
      error,
      formatRelativeTime
    };
  }
});
</script>

<style scoped>
.user-statistics {
  padding: 20px;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--surface-card);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--text-color-secondary);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-color);
}

.connected-users-section {
  background: var(--surface-card);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.connected-users-section h3 {
  margin: 0 0 20px;
}

.connected-users-list table {
  width: 100%;
  border-collapse: collapse;
}

.connected-users-list th,
.connected-users-list td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--surface-border);
}

.connected-users-list th {
  font-weight: 600;
  color: var(--text-color-secondary);
}

.no-users {
  text-align: center;
  padding: 20px;
  color: var(--text-color-secondary);
}

.last-updated {
  text-align: right;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.spinner-border {
  width: 3rem;
  height: 3rem;
}
</style> 