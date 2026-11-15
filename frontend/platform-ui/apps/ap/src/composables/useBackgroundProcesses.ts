import { ref, computed } from 'vue';

/**
 * Generates a unique ID for processes using cryptographically secure random values
 */
function generateProcessId(): string {
  // Use crypto.getRandomValues() for cryptographically secure randomness
  // Generate random bytes and convert to base36 string (similar to Math.random().toString(36).substr(2, 9))
  const randomBytes = new Uint8Array(9);
  crypto.getRandomValues(randomBytes);
  
  // Convert random bytes to base36 string
  // Each byte (0-255) converted to base36 provides sufficient entropy
  const randomString = Array.from(randomBytes)
    .map(byte => byte.toString(36))
    .join('')
    .substring(0, 9);
  
  return `process_${Date.now()}_${randomString}`;
}

// `(string & {})` keeps literal autocomplete for the known types while still accepting any string,
// without the literals being collapsed into `string` (TS S6571).
export type ProcessType = 'PDF_EXPORT' | 'ZIP_GENERATION' | 'TABLE_EXPORT' | (string & {});
export type ProcessStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ProcessProgress {
  current: number;
  total: number;
  percentage?: number;
  statusText?: string;
}

export interface BackgroundProcess {
  id: string;
  title: string;
  type: ProcessType;
  progress: ProcessProgress;
  status: ProcessStatus;
  cancelable: boolean;
  cancelFn?: () => void;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Generic composable for managing background processes
 * Implements a singleton pattern to share state between components
 * 
 * This composable manages a queue of background processes that can
 * run in parallel. Each process has its own progress, status, and
 * cancellation option.
 */

// Maximum number of processes to keep in memory to prevent memory leaks
const MAX_PROCESSES = 50;

// Maximum age for completed processes before automatic cleanup (1 hour in milliseconds)
const MAX_COMPLETED_PROCESS_AGE_MS = 60 * 60 * 1000;

const processes = ref<BackgroundProcess[]>([]);

export function useBackgroundProcesses() {
  /**
   * Cleans up old processes to prevent memory leaks
   * Removes old completed processes first, then oldest ones if necessary
   */
  function cleanupOldProcesses(): void {
    // First, remove very old completed processes (older than MAX_COMPLETED_PROCESS_AGE_MS)
    const now = Date.now();
    processes.value = processes.value.filter(p => {
      if (p.status === 'completed' || p.status === 'failed' || p.status === 'cancelled') {
        if (p.completedAt) {
          const age = now - p.completedAt.getTime();
          return age < MAX_COMPLETED_PROCESS_AGE_MS;
        }
      }
      return true;
    });

    // If still over limit, remove oldest completed processes first
    if (processes.value.length >= MAX_PROCESSES) {
      const completed = processes.value.filter(p => 
        p.status === 'completed' || p.status === 'failed' || p.status === 'cancelled'
      );
      
      if (completed.length > 0) {
        // Sort by completedAt (oldest first) and remove the oldest ones
        const sortedCompleted = [...completed].sort((a, b) => {
          const aTime = a.completedAt?.getTime() || a.createdAt.getTime();
          const bTime = b.completedAt?.getTime() || b.createdAt.getTime();
          return aTime - bTime;
        });
        
        const toRemove = sortedCompleted.slice(0, processes.value.length - MAX_PROCESSES + 1);
        const toRemoveIds = new Set(toRemove.map(p => p.id));
        processes.value = processes.value.filter(p => !toRemoveIds.has(p.id));
      }
    }

    // If still over limit (shouldn't happen often, but handle edge case),
    // remove oldest processes regardless of status
    if (processes.value.length >= MAX_PROCESSES) {
      const sorted = [...processes.value].sort((a, b) => {
        const aTime = a.completedAt?.getTime() || a.createdAt.getTime();
        const bTime = b.completedAt?.getTime() || b.createdAt.getTime();
        return aTime - bTime;
      });
      
      const toRemove = sorted.slice(0, processes.value.length - MAX_PROCESSES + 1);
      const toRemoveIds = new Set(toRemove.map(p => p.id));
      processes.value = processes.value.filter(p => !toRemoveIds.has(p.id));
    }
  }

  /**
   * Adds a new process to the queue
   * Automatically cleans up old processes before adding to prevent memory leaks
   */
  function addProcess(
    title: string,
    type: ProcessType,
    total: number,
    cancelable: boolean = true,
    cancelFn?: () => void
  ): string {
    // Clean up old processes before adding a new one to prevent memory leaks
    cleanupOldProcesses();

    const id = generateProcessId();
    const newProcess: BackgroundProcess = {
      id,
      title,
      type,
      progress: {
        current: 0,
        total,
        percentage: 0,
        statusText: 'Starting...'
      },
      status: 'running',
      cancelable,
      cancelFn,
      createdAt: new Date()
    };

    processes.value.push(newProcess);
    return id;
  }

  /**
   * Updates the progress of a process
   */
  function updateProcess(
    id: string,
    updates: {
      progress?: Partial<ProcessProgress>;
      status?: ProcessStatus;
      error?: string;
    }
  ): void {
    const process = processes.value.find(p => p.id === id);
    if (!process) {
      console.warn(`[BackgroundProcesses] Process ${id} not found`);
      return;
    }

    if (updates.progress) {
      // Calculate percentage using updated or existing values
      const current = updates.progress.current !== undefined 
        ? updates.progress.current 
        : process.progress.current;
      const total = updates.progress.total !== undefined 
        ? updates.progress.total 
        : process.progress.total;
      
      process.progress = {
        ...process.progress,
        ...updates.progress,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0
      };
    }

    if (updates.status) {
      process.status = updates.status;
      if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
        process.completedAt = new Date();
      }
    }

    if (updates.error !== undefined) {
      process.error = updates.error;
    }
  }

  /**
   * Cancels a process
   */
  function cancelProcess(id: string): void {
    const process = processes.value.find(p => p.id === id);
    if (!process) {
      console.warn(`[BackgroundProcesses] Process ${id} not found`);
      return;
    }

    if (!process.cancelable) {
      console.warn(`[BackgroundProcesses] Process ${id} is not cancelable`);
      return;
    }

    if (process.cancelFn) {
      process.cancelFn();
    }

    process.status = 'cancelled';
    process.completedAt = new Date();
  }

  /**
   * Removes a process from the queue
   */
  function removeProcess(id: string): void {
    const index = processes.value.findIndex(p => p.id === id);
    if (index !== -1) {
      processes.value.splice(index, 1);
    }
  }

  /**
   * Clears all completed processes
   * Also cleans up old processes to prevent memory leaks
   */
  function clearCompleted(): void {
    processes.value = processes.value.filter(p => 
      p.status !== 'completed' && p.status !== 'failed' && p.status !== 'cancelled'
    );
    // Also clean up very old processes as a safety measure
    cleanupOldProcesses();
  }

  /**
   * Clears all processes
   */
  function clearAll(): void {
    processes.value = [];
  }

  /**
   * Computed: Indicates if there are active processes
   */
  const hasActiveProcesses = computed(() => {
    return processes.value.some(p => p.status === 'running');
  });

  /**
   * Computed: Indicates if there are processes in the queue (active or completed)
   */
  const hasProcesses = computed(() => {
    return processes.value.length > 0;
  });

  /**
   * Computed: List of active processes
   */
  const activeProcesses = computed(() => {
    return processes.value.filter(p => p.status === 'running');
  });

  /**
   * Computed: List of completed processes
   */
  const completedProcesses = computed(() => {
    return processes.value.filter(p => 
      p.status === 'completed' || p.status === 'failed' || p.status === 'cancelled'
    );
  });

  return {
    processes,
    hasActiveProcesses,
    hasProcesses,
    activeProcesses,
    completedProcesses,
    addProcess,
    updateProcess,
    cancelProcess,
    removeProcess,
    clearCompleted,
    clearAll
  };
}

