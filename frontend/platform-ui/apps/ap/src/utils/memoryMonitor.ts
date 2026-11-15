
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export interface MemoryStats {
  current: string;
  average: string;
  limit: string;
  usagePercentage: string;
}

export interface SystemInfo {
  deviceMemory: number | string;
  cpuCores: number | string;
  platform: string;
  userAgent: string;
}

export interface StoreStats {
  name: string;
  size: number;
  formatted: string;
}

export interface ApolloStats {
  queryCount: number;
  cacheSize: number;
  formatted: string;
}

export interface StorageInfo {
  size: number;
  formatted: string;
  itemCount: number;
}

export interface StorageStats {
  localStorage: StorageInfo;
  sessionStorage: StorageInfo;
}

export interface ResourceCategory {
  size: number;
  formatted: string;
  count?: number;
}

export interface ResourceStats {
  total: ResourceCategory;
  scripts: ResourceCategory;
  styles: ResourceCategory;
  images: ResourceCategory;
  other: ResourceCategory;
}

export interface DetailedStats {
  system: SystemInfo;
  stores?: StoreStats[];
  apollo?: ApolloStats;
  storage?: StorageStats;
  resources?: ResourceStats;
}

class MemoryMonitor {
  private memoryLog: MemoryInfo[] = [];
  private readonly maxLogEntries = 100;
  private readonly warningThreshold = 0.8; // 80% of limit
  private readonly criticalThreshold = 0.9; // 90% of limit
  private isMonitoring = false;
  private monitoringInterval?: any;
  private cleanupInterval?: any;
  private systemInfo: SystemInfo | null = null;
  private storeStatsCache: { data: StoreStats[], timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor() {
    if (import.meta.env.DEV) {
      this.startMonitoring();
    }
  }

  public startMonitoring(intervalMs: number = 30000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    // Clean old logs every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanOldLogs();
    }, 300000);

    // Initial verification
    setTimeout(() => {
      this.checkMemoryUsage();
    }, 1000);
  }

  public stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.isMonitoring = false;
  }

  public checkMemoryUsage() {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryInfo: MemoryInfo = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };

        this.memoryLog.push(memoryInfo);

        // Keep only the latest logs
        if (this.memoryLog.length > this.maxLogEntries) {
          this.memoryLog = this.memoryLog.slice(-this.maxLogEntries);
        }

        // Check thresholds
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        // 🚨 NEW: Automatic cleanup at 60%
        if (usageRatio >= 0.6) {
          if (import.meta.env.DEV) {
            console.warn('🧹 Automatic cleanup: memory usage >= 60%', (usageRatio * 100).toFixed(1) + '%');
          }
          // Call the safe cleanup function
          cleanupMemory();
        }

        if (usageRatio > this.criticalThreshold) {
          console.error('🚨 CRITICAL: Very high memory usage:', {
            used: this.formatBytes(memory.usedJSHeapSize),
            limit: this.formatBytes(memory.jsHeapSizeLimit),
            percentage: (usageRatio * 100).toFixed(1) + '%'
          });
          this.suggestOptimizations();
          this.autoCleanup();
        } else if (usageRatio > this.warningThreshold) {
          console.warn('⚠️ WARNING: High memory usage:', {
            used: this.formatBytes(memory.usedJSHeapSize),
            limit: this.formatBytes(memory.jsHeapSizeLimit),
            percentage: (usageRatio * 100).toFixed(1) + '%'
          });
        }

        if (import.meta.env.DEV) {
          console.log('📊 Memory:', {
            used: this.formatBytes(memory.usedJSHeapSize),
            total: this.formatBytes(memory.totalJSHeapSize),
            limit: this.formatBytes(memory.jsHeapSizeLimit)
          });
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error in memory monitor:', error);
      }
    }
  }

  private autoCleanup() {
    if (import.meta.env.DEV) {
      console.log('🔄 Starting automatic memory cleanup...');
    }
    
    // Clear Apollo cache if available
    if (globalThis.__APOLLO_CLIENT__) {
      try {
        globalThis.__APOLLO_CLIENT__.clearStore();
        if (import.meta.env.DEV) console.log('✅ Apollo cache cleared');
      } catch (error) {
        if (import.meta.env.DEV) console.error('❌ Error clearing Apollo cache:', error);
      }
    }

    // Force garbage collection
    this.forceGarbageCollection();
  }

  private cleanOldLogs() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    this.memoryLog = this.memoryLog.filter(log => log.timestamp > fiveMinutesAgo);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private suggestOptimizations() {
    console.log('💡 Optimization suggestions:');
    console.log('1. Clear Apollo GraphQL cache');
    console.log('2. Check uncleaned event listeners');
    console.log('3. Review localStorage/sessionStorage (preserving session)');
    console.log('4. Optimize Vue components with v-memo');
    console.log('5. Use lazy loading for heavy components');
    console.log('6. Run: cleanupMemory() for manual cleanup (safe)');
    console.log('7. Run: cleanupMemoryAggressive() for complete cleanup (requires re-login)');
  }

  public getMemoryStats(): MemoryStats | null {
    if (this.memoryLog.length === 0) return null;

    const latest = this.memoryLog[this.memoryLog.length - 1];
    const average = this.memoryLog.reduce((sum, log) => sum + log.usedJSHeapSize, 0) / this.memoryLog.length;

    return {
      current: this.formatBytes(latest.usedJSHeapSize),
      average: this.formatBytes(average),
      limit: this.formatBytes(latest.jsHeapSizeLimit),
      usagePercentage: ((latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100).toFixed(1) + '%'
    };
  }

  public getMemoryHistory(): MemoryInfo[] {
    return [...this.memoryLog];
  }

  public forceGarbageCollection() {
    if ('gc' in globalThis) {
      try {
        globalThis.gc?.();
        if (import.meta.env.DEV) console.log('🗑️ Garbage collection forced');
      } catch (error) {
        if (import.meta.env.DEV) console.error('❌ Error in garbage collection:', error);
      }
    } 
  }

  public getSystemInfo(): SystemInfo {
    // Cache system info (it doesn't change)
    if (this.systemInfo) {
      return this.systemInfo;
    }

    this.systemInfo = {
      deviceMemory: (navigator as any).deviceMemory || 'Unknown',
      cpuCores: navigator.hardwareConcurrency || 'Unknown',
      platform: navigator.platform,
      userAgent: navigator.userAgent
    };

    return this.systemInfo;
  }

  public getMemoryLog(): MemoryInfo[] {
    return [...this.memoryLog]; // Return a copy to prevent external modification
  }

  public getStoreStats(): StoreStats[] {
    // Return cache if fresh
    if (this.storeStatsCache && 
        Date.now() - this.storeStatsCache.timestamp < this.CACHE_DURATION) {
      return this.storeStatsCache.data;
    }

    try {
      // Access Pinia from globalThis (injected by plugin)
      const pinia = (globalThis as any).__PINIA__;
      if (!pinia || !pinia.state || !pinia.state.value) {
        return [];
      }

      // Calculate sizes for each store
      const stores: StoreStats[] = Object.keys(pinia.state.value).map(storeName => {
        const storeState = pinia.state.value[storeName];
        const size = new Blob([JSON.stringify(storeState)]).size;
        return { 
          name: storeName, 
          size, 
          formatted: this.formatBytes(size) 
        };
      });
      
      // Sort by size (largest first), keep top 10
      stores.sort((a, b) => b.size - a.size);
      const topStores = stores.slice(0, 10);
      
      // Cache results
      this.storeStatsCache = { data: topStores, timestamp: Date.now() };
      
      return topStores;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error calculating store stats:', error);
      return [];
    }
  }

  public getApolloStats(): ApolloStats | null {
    if (!globalThis.__APOLLO_CLIENT__) return null;

    try {
      const cache = globalThis.__APOLLO_CLIENT__.cache.extract();
      const queryCount = Object.keys(cache).length;
      const cacheSize = new Blob([JSON.stringify(cache)]).size;
      
      return {
        queryCount,
        cacheSize,
        formatted: this.formatBytes(cacheSize)
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting Apollo stats:', error);
      return null;
    }
  }

  public getStorageStats(): StorageStats {
    let localStorageSize = 0;
    let sessionStorageSize = 0;
    
    try {
      // Calculate localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        const value = localStorage.getItem(key)!;
        localStorageSize += key.length + value.length;
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error reading localStorage:', error);
    }
    
    try {
      // Calculate sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)!;
        const value = sessionStorage.getItem(key)!;
        sessionStorageSize += key.length + value.length;
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error reading sessionStorage:', error);
    }
    
    return {
      localStorage: {
        size: localStorageSize * 2, // UTF-16 = 2 bytes per char
        formatted: this.formatBytes(localStorageSize * 2),
        itemCount: localStorage.length
      },
      sessionStorage: {
        size: sessionStorageSize * 2,
        formatted: this.formatBytes(sessionStorageSize * 2),
        itemCount: sessionStorage.length
      }
    };
  }

  public getResourceStats(): ResourceStats {
    try {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let totalSize = 0;
      let scriptSize = 0;
      let styleSize = 0;
      let imageSize = 0;
      let otherSize = 0;
      
      let scriptCount = 0;
      let styleCount = 0;
      let imageCount = 0;
      
      entries.forEach(entry => {
        const size = entry.transferSize || 0;
        totalSize += size;
        
        if (entry.initiatorType === 'script') {
          scriptSize += size;
          scriptCount++;
        } else if (entry.initiatorType === 'link' || entry.initiatorType === 'css') {
          styleSize += size;
          styleCount++;
        } else if (entry.initiatorType === 'img') {
          imageSize += size;
          imageCount++;
        } else {
          otherSize += size;
        }
      });
      
      return {
        total: { size: totalSize, formatted: this.formatBytes(totalSize) },
        scripts: { size: scriptSize, formatted: this.formatBytes(scriptSize), count: scriptCount },
        styles: { size: styleSize, formatted: this.formatBytes(styleSize), count: styleCount },
        images: { size: imageSize, formatted: this.formatBytes(imageSize), count: imageCount },
        other: { size: otherSize, formatted: this.formatBytes(otherSize) }
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting resource stats:', error);
      return {
        total: { size: 0, formatted: '0 B' },
        scripts: { size: 0, formatted: '0 B', count: 0 },
        styles: { size: 0, formatted: '0 B', count: 0 },
        images: { size: 0, formatted: '0 B', count: 0 },
        other: { size: 0, formatted: '0 B' }
      };
    }
  }

  public getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      logCount: this.memoryLog.length,
      warningThreshold: this.warningThreshold,
      criticalThreshold: this.criticalThreshold
    };
  }

  // Compatibility method with previous implementation
  clearSamples(): void {
    this.memoryLog = [];
    console.log('MemoryMonitor: Memory logs cleared');
  }
}

// Instancia global del monitor
export const memoryMonitor = new MemoryMonitor();

// Helper function to clean memory (preserves session data)
export const cleanupMemory = () => {
  console.log('🧹 Starting memory cleanup...');
  
  // Clear Apollo cache
  if (globalThis.__APOLLO_CLIENT__) {
    try {
      globalThis.__APOLLO_CLIENT__.clearStore();
      console.log('✅ Apollo cache cleared');
    } catch (error) {
      console.error('❌ Error clearing Apollo cache:', error);
    }
  }

  // Clean temporary localStorage (only non-essential data)
  // IMPORTANT: Preserve session and authentication data
  const keysToKeep = [
    'lastUserActivity', 
    'forceLogoutTimestamp', 
    'token',
    'auth',
    'session',    
    'login',
    'authentication',
    'jwt',
    'access_token',
    'refresh_token',
    'user',
    'app',
    'globalFilters',    
    'home',
    'analyze',
    'categorize',
    'compare',
    'entityCard',
    'overview',
    'notifications',
    'subscribe',
    'spendFiles',
    'welcome',
    'plan',
    'negotiationStatus',
    'companies',
    'valuePropositions'
  ];
  const keysToRemove: string[] = [];
  
  Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.some(keepKey => key.toLowerCase().includes(keepKey.toLowerCase()))) {
      keysToRemove.push(key);
    }
  });

  if (keysToRemove.length > 0) {
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`❌ Error removing ${key}:`, error);
      }
    });
    console.log(`✅ ${keysToRemove.length} localStorage items removed (preserving session data)`);
  } else {
    console.log('ℹ️ No non-essential data found to clean');
  }

  // Force garbage collection
  memoryMonitor.forceGarbageCollection();
  
  // Show statistics after cleanup
  setTimeout(() => {
    const stats = memoryMonitor.getMemoryStats();
    if (stats) {
      console.log('📊 Memory after cleanup:', stats);
    }
    
    // Verify that session cookies were not affected
    verifySessionCookies();
  }, 1000);
};

// Function for aggressive cleanup (ONLY use in development or debugging)
export const cleanupMemoryAggressive = () => {
  console.log('🧹🧹 Starting AGGRESSIVE memory cleanup (includes session data)...');
  
  // Clear Apollo cache
  if (globalThis.__APOLLO_CLIENT__) {
    try {
      globalThis.__APOLLO_CLIENT__.clearStore();
      console.log('✅ Apollo cache cleared');
    } catch (error) {
      console.error('❌ Error clearing Apollo cache:', error);
    }
  }

  // Clear ALL localStorage (INCLUDING session data)
  try {
    localStorage.clear();
    console.log('⚠️ ALL localStorage cleared (including session data)');
  } catch (error) {
    console.error('❌ Error clearing localStorage:', error);
  }

  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('⚠️ SessionStorage cleared');
  } catch (error) {
    console.error('❌ Error clearing sessionStorage:', error);
  }

  // Force garbage collection
  memoryMonitor.forceGarbageCollection();
  
  console.log('⚠️ WARNING: All local data has been cleared. User will need to re-authenticate.');
};

// Function to verify that session cookies are not affected
export const verifySessionCookies = () => {
  console.log('🔍 Verifying session cookies...');
  
  // Check session cookies
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  console.log('🍪 Current cookies:', cookies);
  
  // Check if there are typical session cookies
  const sessionCookies = Object.keys(cookies).filter(key => 
    key.toLowerCase().includes('session') || 
    key.toLowerCase().includes('sid') ||
    key.toLowerCase().includes('jsessionid') ||
    key.toLowerCase().includes('phpsessid')
  );
  
  if (sessionCookies.length > 0) {
    console.log('✅ Session cookies detected:', sessionCookies);
  } else {
    console.log('ℹ️ No specific session cookies detected');
  }
  
  return {
    allCookies: cookies,
    sessionCookies: sessionCookies
  };
};

// Function to verify that authentication is still working
export const verifyAuthentication = async () => {
  console.log('🔐 Verifying authentication...');
  
  try {
    // Try to make a request to verify that cookies are being sent
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      credentials: 'include', // Important: includes cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Authentication verified - cookies working correctly');
      return true;
    } else {
      console.warn('⚠️ Authentication failed - check session cookies');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying authentication:', error);
    return false;
  }
};



export default MemoryMonitor; 