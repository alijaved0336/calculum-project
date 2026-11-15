import { App, createApp } from 'vue';
import { memoryMonitor } from '@/utils/memoryMonitor';
import MemoryMonitor from '@/modules/components/MemoryMonitor.vue';
import pinia from '@/services/pinia/index';

interface MemoryMonitorOptions {
  enabled?: boolean;
  intervalMs?: number;
  autoStart?: boolean;
}

export default {
  install(app: App, options: MemoryMonitorOptions = {}) {
    const {
      enabled = true,
      intervalMs = 30000,
      autoStart = true
    } = options;

    if (!enabled) {
      console.log('MemoryMonitor: Plugin disabled');
      return;
    }

    // Add to global app context
    app.config.globalProperties.$memoryMonitor = memoryMonitor;

    // Add to provide/inject
    app.provide('memoryMonitor', memoryMonitor);

    // Mount MemoryMonitor component globally
    const mountMemoryMonitor = () => {
      // Create a div for the memory monitor
      const container = document.createElement('div');
      container.id = 'memory-monitor-container';
      document.body.appendChild(container);

      // Create a new Vue app instance for the MemoryMonitor
      const monitorApp = createApp(MemoryMonitor);
      
      // Share the same pinia store instance
      monitorApp.use(pinia);
      
      // Mount it
      monitorApp.mount(container);

      if (import.meta.env.DEV) {
        console.log('MemoryMonitor: Component mounted globally');
      }
    };

    // Start monitoring automatically if enabled
    if (autoStart) {
      // Wait for app to be mounted
      app.mixin({
        mounted() {
          if (this.$options.name === 'App') {
            memoryMonitor.startMonitoring(intervalMs);
            // Mount the component after App is ready
            mountMemoryMonitor();
          }
        },
        beforeUnmount() {
          if (this.$options.name === 'App') {
            memoryMonitor.stopMonitoring();
          }
        }
      });
    }

    // debug methods
    
    (window as any).__memoryMonitor = {
      start: () => memoryMonitor.startMonitoring(intervalMs),
      stop: () => memoryMonitor.stopMonitoring(),
      stats: () => memoryMonitor.getMemoryStats(),
      forceGC: () => memoryMonitor.forceGarbageCollection(),
      clearSamples: () => memoryMonitor.clearSamples()
    };

    if (import.meta.env.DEV) {
      console.log('MemoryMonitor: Plugin installed. Use window.__memoryMonitor for debugging');
    }
    
  }
}; 