import { defineStore } from 'pinia';
import { secureStorage } from '@/services/pinia/index';

interface MemoryMonitorPosition {
  x: number;
  y: number;
}

interface MemoryMonitorState {
  isVisible: boolean;
  position: MemoryMonitorPosition;
}

export const useMemoryMonitorStore = defineStore('memoryMonitor', {
  state: (): MemoryMonitorState => ({
    isVisible: false,
    position: {
      x: 20,
      y: 20
    }
  }),

  getters: {
    getIsVisible: (state): boolean => state.isVisible,
    getPosition: (state): MemoryMonitorPosition => state.position
  },

  actions: {
    show() {
      this.isVisible = true;
    },
    
    hide() {
      this.isVisible = false;
    },
    
    toggle() {
      this.isVisible = !this.isVisible;
    },
    
    setPosition(x: number, y: number) {
      this.position = { x, y };
    }
  },

  persist: {
    storage: secureStorage,
    key: 'ada-memory-monitor'
  }
});

