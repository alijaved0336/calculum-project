<template>
<Teleport to="body">
  <div v-if="hasActiveProcesses" class="background-export-progress-modal">
    <div class="modal-header d-flex justify-content-between align-items-center">
      <span class="font-weight-bold">{{ $t('button.backgroundProcesses') }}</span>
      <button type="button" class="minimize-icon" :aria-label="isMinimized ? 'Maximize' : 'Minimize'" @click="toggleMinimize">
        <i class="fa" :class="isMinimized ? 'fa-window-maximize' : 'fa-window-minimize'"></i>
      </button>
    </div>
    <div class="modal-content">
      <div v-for="process in processes" :key="process.id" class="process-item" :class="{ 'minimized': isMinimized }">
        <div class="progress-header">
          <div class="d-flex justify-content-between align-items-center mb-2"><span class="font-weight-bold">{{ process.title }}</span><span class="text-xs text-muted">{{ getStatusText(process.status) }}</span></div>
          <div v-if="!isMinimized && process.progress.statusText" class="text-sm mb-2 truncate text-ellipsis">{{ process.progress.statusText }}</div>
          <div v-if="!isMinimized && process.status === 'running'" class="d-flex justify-content-between align-items-center mb-2"><span class="text-xs">{{ process.progress.current }} / {{ process.progress.total }}</span><span class="text-xs">{{ process.progress.percentage }}%</span></div>
          <div v-if="process.status === 'running'" class="progress-wrapper" :class="{ 'with-cancel': process.cancelable }">
            <div class="progress">
              <progress class="progress-bar-native" :value="process.progress.percentage || 0" max="100" :aria-label="process.title"></progress>
            </div>
            <button v-if="process.cancelable" type="button" class="cancel-icon" :aria-label="$t('button.cancel') || 'Cancel'" @click="handleCancel(process.id)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div v-if="!isMinimized && process.error" class="text-danger text-xs mb-2">{{ process.error }}</div>
        </div>
      </div>
    </div>
  </div>
</Teleport>
</template>

<script lang="ts">
import { defineComponent, watch, ref } from 'vue';
import { useBackgroundProcesses } from '@/composables/useBackgroundProcesses';
import { useToast } from 'vue-toastification';

export default defineComponent({
  name: 'BackgroundMultiProcess',
  setup() {
    const { processes, hasActiveProcesses, cancelProcess, clearCompleted } = useBackgroundProcesses();
    const toast = useToast();
    const isMinimized = ref(false);

    const getStatusText = (status: string) => {
      const statusMap: Record<string, string> = {
        'running': 'Running',
        'completed': 'Completed',
        'failed': 'Failed',
        'cancelled': 'Cancelled'
      };
      return statusMap[status] || status;
    };

    const toggleMinimize = () => {
      isMinimized.value = !isMinimized.value;
    };

    const handleCancel = (processId: string) => {
      cancelProcess(processId);
      toast.info('Export cancelled.');
      
      // If after canceling there are no active processes, clean up completed/cancelled ones
      // Use setTimeout to ensure the state has been updated
      setTimeout(() => {
        if (!hasActiveProcesses.value) {
          clearCompleted();
        }
      }, 100);
    };

    // Clean up completed/cancelled processes when the modal hides
    // (when all processes have finished)
    watch(
      hasActiveProcesses,
      (isActive) => {
        // When it changes from true to false (all processes finished)
        if (!isActive) {
          // Clean up all completed, failed, or cancelled processes
          clearCompleted();
        }
      }
    );

    return {
      processes,
      hasActiveProcesses,
      isMinimized,
      getStatusText,
      toggleMinimize,
      handleCancel
    };
  }
});
</script>

<style scoped>
.background-export-progress-modal {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  min-width: 400px;
  max-width: 400px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 0.25rem 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
  width: 100%;
}

.modal-content {
  padding: 0.25rem 0.75rem;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.process-item {
  padding: 0.25rem 0.75rem;
  margin-bottom: 0.25rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
}

.process-item:last-child {
  margin-bottom: 0;
}

.process-item.minimized {
  padding: 0.5rem 0.75rem;
}

.progress-header {
  margin-bottom: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
}

.text-xs {
  font-size: 0.75rem;
  color: #6c757d;
}

.text-muted {
  color: #6c757d;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-wrapper.with-cancel .progress {
  flex: 1;
}

.progress {
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-native {
  width: 100%;
  height: 100%;
  display: block;
  border: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: transparent;
}

.progress-bar-native::-webkit-progress-bar {
  background-color: transparent;
}

.progress-bar-native::-webkit-progress-value {
  background-color: #007bff;
  background-image: linear-gradient(45deg, rgba(255, 255, 255, .15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .15) 50%, rgba(255, 255, 255, .15) 75%, transparent 75%, transparent);
  background-size: 1rem 1rem;
  animation: progress-bar-stripes 1s linear infinite;
  transition: width 0.3s ease;
}

.progress-bar-native::-moz-progress-bar {
  background-color: #007bff;
  background-image: linear-gradient(45deg, rgba(255, 255, 255, .15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .15) 50%, rgba(255, 255, 255, .15) 75%, transparent 75%, transparent);
  background-size: 1rem 1rem;
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  from { background-position: 1rem 0; }
  to { background-position: 0 0; }
}

.cancel-icon {
  cursor: pointer;
  padding: 0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  color: #6c757d;
  flex-shrink: 0;
  border: none;
  background: transparent;
  font: inherit;
}

.cancel-icon:hover {
  background-color: rgba(220, 53, 69, 0.1);
  color: #b02a37;
}

.cancel-icon:focus {
  outline: 2px solid #dc3545;
  outline-offset: 2px;
}

.cancel-icon i.fa {
  font-size: 0.875rem;
}

.minimize-icon {
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  border: none;
  background: transparent;
  font: inherit;
}


.minimize-icon i.fa {
  font-size: 1rem;
  color: #6c757d;
}
</style>

