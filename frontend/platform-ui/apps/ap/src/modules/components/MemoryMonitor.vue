<template>
  <div 
    v-if="monitorStore.getIsVisible" 
    ref="monitorElement"
    class="memory-monitor"
    :style="{ top: monitorStore.getPosition.y + 'px', left: monitorStore.getPosition.x + 'px' }"
  >
    <div 
      class="memory-monitor__header"
      @mousedown="startDrag"
    >
      <div class="memory-monitor__drag-handle">☰</div>
      <h4>Memory Monitor</h4>
      <div class="memory-monitor__controls">
        <button 
          class="memory-monitor__toggle memory-monitor__capture"
          :class="{ 'memory-monitor__capture--active': isCapturing }"
          :title="'Force capture memory snapshot'"
          @click="forceCapture"
        >
          🔄
        </button>
        <button 
          class="memory-monitor__toggle"
          :title="isMonitoring ? 'Pause monitoring' : 'Start monitoring'"
          @click="toggleMonitor"
        >
          {{ isMonitoring ? '⏸️' : '▶️' }}
        </button>
        <button 
          class="memory-monitor__close"
          :title="'Close and stop monitor'"
          @click="closeMonitor"
        >
          ✕
        </button>
      </div>
    </div>
    
    <div v-if="memoryStats" class="memory-monitor__stats">
      <div class="memory-monitor__stat">
        <span class="memory-monitor__label">Current:</span>
        <span class="memory-monitor__value">{{ memoryStats.current }}</span>
      </div>
      
      <div class="memory-monitor__stat">
        <span class="memory-monitor__label">Average:</span>
        <span class="memory-monitor__value">{{ memoryStats.average }}</span>
      </div>
      
      <div class="memory-monitor__stat">
        <span class="memory-monitor__label">Limit:</span>
        <span class="memory-monitor__value">{{ memoryStats.limit }}</span>
      </div>
      
      <div class="memory-monitor__progress">
        <div 
          class="memory-monitor__progress-bar"
          :style="{ width: `${usagePercent}%`, backgroundColor: progressColor }"
        ></div>
      </div>
      
      <div class="memory-monitor__usage">
        {{ usagePercent.toFixed(1) }}% used
      </div>
    </div>
    
    <div v-if="isLeaking" class="memory-monitor__warning">
      ⚠️ Possible memory leak detected
    </div>
    
    <div class="memory-monitor__actions">
      <button 
        class="memory-monitor__action"
        :disabled="!isGCAvailable"
        :title="isGCAvailable ? 'Force garbage collection' : 'GC not available in this browser'"
        @click="forceGC"
      >
        🗑️ {{ isGCAvailable ? 'Force GC' : 'GC N/A' }}
      </button>
      <button class="memory-monitor__action" @click="clearSamples">
        📊 Clear samples
      </button>
      <button 
        class="memory-monitor__action memory-monitor__action--primary"
        :title="showDetails ? 'Hide details' : 'Show detailed information'"
        @click="toggleDetails"
      >
        📊 {{ showDetails ? 'Hide' : 'Details' }}
      </button>
    </div>

    <!-- Enhanced Details Panel (Phase 2) -->
    <div v-if="showDetails" class="memory-monitor__details">
      <div class="memory-monitor__details-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="memory-monitor__tab"
          :class="{ 'memory-monitor__tab--active': activeTab === tab.id }"
          @click="selectTab(tab.id)"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <div class="memory-monitor__details-content">
        <!-- Chart Tab -->
        <div v-if="activeTab === 'chart'" class="memory-monitor__tab-content">
          <MemoryMonitorChart :memory-log="memoryLog" :height="150" />
        </div>

        <!-- Stores Tab -->
        <div v-if="activeTab === 'stores'" class="memory-monitor__tab-content">
          <h5>Pinia Stores (Top 10)</h5>
          <div v-if="storeStats.length === 0" class="memory-monitor__empty">
            No store data available
          </div>
          <div v-else class="memory-monitor__list">
            <div 
              v-for="store in storeStats" 
              :key="store.name"
              class="memory-monitor__list-item"
            >
              <span class="memory-monitor__list-name">{{ store.name }}</span>
              <span class="memory-monitor__list-value">{{ store.formatted }}</span>
            </div>
          </div>
        </div>

        <!-- Apollo Tab -->
        <div v-if="activeTab === 'apollo'" class="memory-monitor__tab-content">
          <h5>Apollo Cache</h5>
          <div v-if="!apolloStats" class="memory-monitor__empty">
            Apollo client not available
          </div>
          <div v-else class="memory-monitor__detail-grid">
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Cached Queries:</span>
              <span class="memory-monitor__value">{{ apolloStats.queryCount }}</span>
            </div>
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Cache Size:</span>
              <span class="memory-monitor__value">{{ apolloStats.formatted }}</span>
            </div>
          </div>
        </div>

        <!-- Storage Tab -->
        <div v-if="activeTab === 'storage'" class="memory-monitor__tab-content">
          <h5>Browser Storage</h5>
          <div class="memory-monitor__detail-grid">
            <div class="memory-monitor__detail-section">
              <strong>localStorage</strong>
              <div class="memory-monitor__detail-item">
                <span class="memory-monitor__label">Items:</span>
                <span class="memory-monitor__value">{{ storageStats.localStorage.itemCount }}</span>
              </div>
              <div class="memory-monitor__detail-item">
                <span class="memory-monitor__label">Size:</span>
                <span class="memory-monitor__value">{{ storageStats.localStorage.formatted }}</span>
              </div>
            </div>
            <div class="memory-monitor__detail-section">
              <strong>sessionStorage</strong>
              <div class="memory-monitor__detail-item">
                <span class="memory-monitor__label">Items:</span>
                <span class="memory-monitor__value">{{ storageStats.sessionStorage.itemCount }}</span>
              </div>
              <div class="memory-monitor__detail-item">
                <span class="memory-monitor__label">Size:</span>
                <span class="memory-monitor__value">{{ storageStats.sessionStorage.formatted }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Resources Tab -->
        <div v-if="activeTab === 'resources'" class="memory-monitor__tab-content">
          <h5>Loaded Resources</h5>
          <div class="memory-monitor__detail-grid">
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Total:</span>
              <span class="memory-monitor__value">{{ resourceStats.total.formatted }}</span>
            </div>
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Scripts ({{ resourceStats.scripts.count }}):</span>
              <span class="memory-monitor__value">{{ resourceStats.scripts.formatted }}</span>
            </div>
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Styles ({{ resourceStats.styles.count }}):</span>
              <span class="memory-monitor__value">{{ resourceStats.styles.formatted }}</span>
            </div>
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Images ({{ resourceStats.images.count }}):</span>
              <span class="memory-monitor__value">{{ resourceStats.images.formatted }}</span>
            </div>
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Other:</span>
              <span class="memory-monitor__value">{{ resourceStats.other.formatted }}</span>
            </div>
          </div>
        </div>

        <!-- System Tab -->
        <div v-if="activeTab === 'system'" class="memory-monitor__tab-content">
          <h5>System Information</h5>
          <p class="memory-monitor__details-note">
            ℹ️ Values are approximated by browser APIs for privacy
          </p>
          <div class="memory-monitor__detail-grid">
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Device RAM:</span>
              <span class="memory-monitor__value">
                {{ systemInfo.deviceMemory === 'Unknown' ? 'Unknown' : `~${systemInfo.deviceMemory} GB` }}
              </span>
            </div>
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">CPU Threads:</span>
              <span class="memory-monitor__value">{{ systemInfo.cpuCores }}</span>
            </div>
            <div class="memory-monitor__detail-item">
              <span class="memory-monitor__label">Platform:</span>
              <span class="memory-monitor__value">{{ systemInfo.platform }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { memoryMonitor, type SystemInfo, type MemoryInfo, type StoreStats, type ApolloStats, type StorageStats, type ResourceStats } from '@/utils/memoryMonitor';
import { useMemoryMonitorStore } from '@/stores/memoryMonitor';
import MemoryMonitorChart from './MemoryMonitorChart.vue';

interface MemoryStats {
  current: string;
  average: string;
  limit: string;
  usagePercentage: string;
}

export default defineComponent({
  name: 'MemoryMonitor',
  components: {
    MemoryMonitorChart
  },
  setup() {
    const monitorStore = useMemoryMonitorStore();
    const isMonitoring = ref(false);
    const memoryStats = ref<MemoryStats | null>(null);
    const isLeaking = ref(false);
    const updateInterval = ref<number | null>(null);
    const monitorElement = ref<HTMLElement | null>(null);
    const isGCAvailable = ref('gc' in window);
    const showDetails = ref(false);
    const systemInfo = ref<SystemInfo>(memoryMonitor.getSystemInfo());
    const isCapturing = ref(false);
    
    // Drag state
    const isDragging = ref(false);
    const dragOffset = ref({ x: 0, y: 0 });
    
    // Phase 2: Details panel tabs and data
    const activeTab = ref('chart');
    const tabs = ref([
      { id: 'chart', label: 'History', icon: '📈' },
      { id: 'stores', label: 'Stores', icon: '📦' },
      { id: 'apollo', label: 'Apollo', icon: '🚀' },
      { id: 'storage', label: 'Storage', icon: '💾' },
      { id: 'resources', label: 'Resources', icon: '📁' },
      { id: 'system', label: 'System', icon: '💻' }
    ]);
    const memoryLog = ref<MemoryInfo[]>([]);
    const storeStats = ref<StoreStats[]>([]);
    const apolloStats = ref<ApolloStats | null>(null);
    const storageStats = ref<StorageStats>({
      localStorage: { size: 0, formatted: '0 B', itemCount: 0 },
      sessionStorage: { size: 0, formatted: '0 B', itemCount: 0 }
    });
    const resourceStats = ref<ResourceStats>({
      total: { size: 0, formatted: '0 B' },
      scripts: { size: 0, formatted: '0 B', count: 0 },
      styles: { size: 0, formatted: '0 B', count: 0 },
      images: { size: 0, formatted: '0 B', count: 0 },
      other: { size: 0, formatted: '0 B' }
    });

      const usagePercent = computed(() => {
        if (!memoryStats.value) return 0;
        return parseFloat(memoryStats.value.usagePercentage.replace('%', ''));
      });

      const progressColor = computed(() => {
        const percent = usagePercent.value;
        if (percent > 80) return '#ff4444';
        if (percent > 60) return '#ffaa00';
        return '#44ff44';
      });

      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const updateStats = () => {
        memoryStats.value = memoryMonitor.getMemoryStats();
        memoryLog.value = memoryMonitor.getMemoryLog();
      };
      
      const selectTab = (tabId: string) => {
        activeTab.value = tabId;
        // Load tab-specific data on-demand
        switch (tabId) {
          case 'stores':
            storeStats.value = memoryMonitor.getStoreStats();
            break;
          case 'apollo':
            apolloStats.value = memoryMonitor.getApolloStats();
            break;
          case 'storage':
            storageStats.value = memoryMonitor.getStorageStats();
            break;
          case 'resources':
            resourceStats.value = memoryMonitor.getResourceStats();
            break;
        }
      };

      const toggleMonitor = () => {
        if (isMonitoring.value) {
          memoryMonitor.stopMonitoring();
          isMonitoring.value = false;
          if (updateInterval.value) {
            clearInterval(updateInterval.value);
            updateInterval.value = null;
          }
        } else {
          memoryMonitor.startMonitoring();
          isMonitoring.value = true;
          updateInterval.value = window.setInterval(updateStats, 1000);
        }
      };

      const forceGC = () => {
        memoryMonitor.forceGarbageCollection();
        setTimeout(updateStats, 100);
      };

      const clearSamples = () => {
        memoryMonitor.clearSamples();
        isLeaking.value = false;
      };

    const handleMemoryLeak = () => {
      isLeaking.value = true;
      setTimeout(() => {
        isLeaking.value = false;
      }, 5000);
    };

    const closeMonitor = () => {
      // Stop monitoring if running
      if (isMonitoring.value) {
        memoryMonitor.stopMonitoring();
        isMonitoring.value = false;
        if (updateInterval.value) {
          clearInterval(updateInterval.value);
          updateInterval.value = null;
        }
      }
      // Hide the monitor
      monitorStore.hide();
    };

    const startDrag = (event: MouseEvent) => {
      isDragging.value = true;
      const rect = monitorElement.value?.getBoundingClientRect();
      if (rect) {
        dragOffset.value = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
      }
      event.preventDefault();
    };

    const onDrag = (event: MouseEvent) => {
      if (!isDragging.value) return;
      
      let newX = event.clientX - dragOffset.value.x;
      let newY = event.clientY - dragOffset.value.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (monitorElement.value?.offsetWidth || 200);
      const maxY = window.innerHeight - (monitorElement.value?.offsetHeight || 300);
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      monitorStore.setPosition(newX, newY);
    };

    const stopDrag = () => {
      isDragging.value = false;
    };

    const toggleDetails = () => {
      showDetails.value = !showDetails.value;
      if (showDetails.value) {
        // Load initial tab data
        selectTab(activeTab.value);
      }
    };

    const forceCapture = () => {
      // Show visual feedback
      isCapturing.value = true;
      
      // Force immediate memory capture and add to log
      memoryMonitor.checkMemoryUsage();
      
      // Update display immediately
      updateStats();
      
      // Remove visual feedback after animation
      setTimeout(() => {
        isCapturing.value = false;
      }, 600);
    };

    // Auto-start monitoring when monitor becomes visible for the first time
    watch(() => monitorStore.getIsVisible, (newValue, oldValue) => {
      if (newValue && !oldValue && !isMonitoring.value) {
        // Monitor just became visible and monitoring is not active
        // Start monitoring automatically
        memoryMonitor.startMonitoring();
        isMonitoring.value = true;
        updateInterval.value = window.setInterval(updateStats, 1000);
      }
    });

    onMounted(() => {
      updateStats();
      window.addEventListener('memory-leak-detected', handleMemoryLeak);
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      
      // If monitor is visible on mount, start automatically
      if (monitorStore.getIsVisible && !isMonitoring.value) {
        memoryMonitor.startMonitoring();
        isMonitoring.value = true;
        updateInterval.value = window.setInterval(updateStats, 1000);
      }
    });

    onUnmounted(() => {
      window.removeEventListener('memory-leak-detected', handleMemoryLeak);
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      if (updateInterval.value) {
        clearInterval(updateInterval.value);
      }
    });

    return {
      monitorStore,
      monitorElement,
      isMonitoring,
      memoryStats,
      isLeaking,
      isGCAvailable,
      showDetails,
      systemInfo,
      isCapturing,
      usagePercent,
      progressColor,
      updateStats,
      toggleMonitor,
      forceGC,
      clearSamples,
      formatBytes,
      closeMonitor,
      startDrag,
      toggleDetails,
      forceCapture,
      // Phase 2: Details panel
      activeTab,
      tabs,
      memoryLog,
      storeStats,
      apolloStats,
      storageStats,
      resourceStats,
      selectTab
    };
  }
});
</script>

<style scoped>
.memory-monitor {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.memory-monitor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  cursor: move;
  user-select: none;
}

.memory-monitor__drag-handle {
  font-size: 14px;
  color: #999;
  margin-right: 8px;
}

.memory-monitor__header h4 {
  margin: 0;
  font-size: 14px;
  flex-grow: 1;
}

.memory-monitor__controls {
  display: flex;
  gap: 5px;
}

.memory-monitor__toggle,
.memory-monitor__close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  transition: opacity 0.2s;
}

.memory-monitor__toggle:hover,
.memory-monitor__close:hover {
  opacity: 0.7;
}

.memory-monitor__capture {
  transition: transform 0.3s ease;
}

.memory-monitor__capture--active {
  animation: spin 0.6s ease-in-out;
}

.memory-monitor__close {
  color: #ff4444;
  font-weight: bold;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.memory-monitor__stats {
  margin-bottom: 10px;
}

.memory-monitor__stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.memory-monitor__label {
  color: #ccc;
}

.memory-monitor__value {
  font-weight: bold;
}

.memory-monitor__progress {
  height: 4px;
  background: #333;
  border-radius: 2px;
  margin: 8px 0;
  overflow: hidden;
}

.memory-monitor__progress-bar {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.memory-monitor__usage {
  text-align: center;
  font-size: 11px;
  color: #ccc;
}

.memory-monitor__warning {
  background: #ff4444;
  color: white;
  padding: 5px;
  border-radius: 4px;
  text-align: center;
  margin-bottom: 10px;
  animation: pulse 1s infinite;
}

.memory-monitor__actions {
  display: flex;
  gap: 5px;
}

.memory-monitor__action {
  background: #444;
  border: none;
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  flex: 1;
}

.memory-monitor__action:hover {
  background: #666;
}

.memory-monitor__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #333;
}

.memory-monitor__action--primary {
  background: #2563eb;
  font-weight: bold;
}

.memory-monitor__action--primary:hover {
  background: #1d4ed8;
}

.memory-monitor__details {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #444;
  max-width: 420px;
}

.memory-monitor__details-tabs {
  display: flex;
  gap: 3px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  overflow-x: auto;
}

.memory-monitor__tab {
  background: #333;
  border: none;
  color: #aaa;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.memory-monitor__tab:hover {
  background: #444;
  color: #fff;
}

.memory-monitor__tab--active {
  background: #2563eb;
  color: white;
  font-weight: bold;
}

.memory-monitor__tab--active:hover {
  background: #1d4ed8;
}

.memory-monitor__details-content {
  max-height: 400px;
  overflow-y: auto;
}

.memory-monitor__details-content h5 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #fff;
  font-weight: bold;
}

.memory-monitor__tab-content {
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.memory-monitor__empty {
  color: #888;
  text-align: center;
  padding: 20px;
  font-size: 11px;
  font-style: italic;
}

.memory-monitor__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memory-monitor__list-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  background: #222;
  border-radius: 4px;
  font-size: 11px;
}

.memory-monitor__list-name {
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.memory-monitor__list-value {
  color: #10b981;
  font-weight: bold;
  margin-left: 10px;
  flex-shrink: 0;
}

.memory-monitor__detail-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-monitor__detail-section {
  background: #222;
  padding: 10px;
  border-radius: 4px;
}

.memory-monitor__detail-section strong {
  display: block;
  margin-bottom: 8px;
  color: #10b981;
  font-size: 12px;
}

.memory-monitor__detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 11px;
}

.memory-monitor__details-note {
  font-size: 9px;
  color: #888;
  margin: 5px 0 10px 0;
  font-style: italic;
  line-height: 1.3;
}

.memory-monitor__details-placeholder {
  margin-top: 15px;
  font-size: 10px;
  color: #888;
  text-align: center;
  font-style: italic;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style> 