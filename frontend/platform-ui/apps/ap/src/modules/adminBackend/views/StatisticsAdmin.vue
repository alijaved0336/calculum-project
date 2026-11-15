<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>| {{ $t('adminBackend.statistics.title') }}</h3>
  </section>
  <section class="page-content">
    <div class="row px-4 mb-3">
      <div class="col-12">
        <div class="memory-monitor-card d-flex justify-content-between align-items-center p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="memory-monitor-icon">🧠</div>
            <div><strong class="d-block">Memory Monitor</strong><small class="text-muted">Real-time memory tracking and analysis</small></div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div class="badge" :class="memoryMonitorStore.getIsVisible ? 'badge-success' : 'badge-secondary'">{{ memoryMonitorStore.getIsVisible ? 'Active' : 'Inactive' }}</div>
            <button class="btn btn-sm memory-monitor-btn" @click="toggleMemoryMonitor" :class="memoryMonitorStore.getIsVisible ? 'btn-danger' : 'btn-success'"><i class="fa" :class="memoryMonitorStore.getIsVisible ? 'fa-eye-slash' : 'fa-eye'"></i><span class="ml-2">{{ memoryMonitorStore.getIsVisible ? 'Hide Monitor' : 'Show Monitor' }}</span></button>
          </div>
        </div>
      </div>
    </div>
    <div class="row px-4 mb-4">
      <div class="col-12 d-flex align-items-center">
        <TabStrip @select="changeTab" :selected="selectedTabIndex" :tabs="tabs">
          <template v-slot:tab="{ props }"><span>| {{ props.title }}</span></template>
        </TabStrip>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <UserStatistics v-if="selectedTabIndex === 0"></UserStatistics>
        <QueueStatistics v-if="selectedTabIndex === 1">           </QueueStatistics>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from "vue";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";
import { useMemoryMonitorStore } from "@/stores/memoryMonitor";
import UserStatistics from "@/modules/adminBackend/views/UserStatistics.vue";
import QueueStatistics from "@/modules/adminBackend/views/QueueStatistics.vue";

export default defineComponent({
  name: "StatisticsAdmin",
  components: {
    UserStatistics,
    QueueStatistics,
    TabStrip
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const memoryMonitorStore = useMemoryMonitorStore();

    interface StatisticsAdmin {
      selectedTab: string;
      selectedTabIndex: number;
      tabs: Array<any>;
    }

    const statisticsAdmin = reactive<StatisticsAdmin>({
      selectedTab: "currencyConversionCache",
      selectedTabIndex: 0,
      tabs: [
        {
          id: "statistics-1-user-statistics",
          title: translate.t("adminBackend.statistics.tab.userStatistics")
        }, 
        {
          id: "statistics-2-queue-statistics",
          title: translate.t("adminBackend.statistics.tab.queueStatistics")
        }
      ]
    });

    function changeTab(e: { selected: number }) {
      statisticsAdmin.selectedTabIndex = e.selected;
    }

    function toggleMemoryMonitor() {
      memoryMonitorStore.toggle();
    }

    return {
      ...toRefs(statisticsAdmin),
      changeTab,
      toggleMemoryMonitor,
      memoryMonitorStore
    };
  }
});
</script>

<style lang="scss" scoped>
@import "@/resources/assets/styles/variables/_colors.scss";

.memory-monitor-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: #667eea;
  }
}

.memory-monitor-icon {
  font-size: 2rem;
  line-height: 1;
}

.badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge-success {
  background-color: #10b981;
  color: white;
  animation: pulse-badge 2s infinite;
}

.badge-secondary {
  background-color: #6c757d;
}

@keyframes pulse-badge {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 1rem;
}

.memory-monitor-btn {
  font-weight: 600;
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
  
  i {
    font-size: 0.9rem;
  }
  
  &.btn-success {
    background-color: #10b981;
    border-color: #10b981;
    color: white;
    
    &:hover {
      background-color: #059669;
      border-color: #059669;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }
  }
  
  &.btn-danger {
    background-color: #ef4444;
    border-color: #ef4444;
    color: white;
    
    &:hover {
      background-color: #dc2626;
      border-color: #dc2626;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
    }
  }
}

.ml-2 {
  margin-left: 0.5rem;
}
</style> 