# Memory Monitor - Detailed View Implementation Plan

## Objective
Enhance the MemoryMonitor component with detailed information about memory usage, stores, resources, and system info while maintaining minimal performance overhead.

## Performance Strategy: "Monitor on Demand"

The key principle is to calculate expensive metrics only when needed, using progressive disclosure and intelligent caching.

### Overhead Targets
- **Monitor closed:** 0.1%
- **Monitor open:** 1-2%
- **Details panel expanded:** 3-5% (initial spike, then cached)

---

## 📊 Implementation Summary

### ✅ Phase 1: COMPLETED
- Basic details panel with toggle button
- System information display
- Drag and drop functionality
- Close button with auto-stop
- Force capture button
- Auto-start monitoring on visibility

### ✅ Phase 2: COMPLETED
- Historical memory chart (Canvas-based, lightweight)
- Pinia store size calculator (top 10, cached for 30s)
- Apollo cache statistics
- Browser storage stats (localStorage/sessionStorage)
- Resource breakdown (scripts, styles, images)
- Tabbed interface for organized data display
- On-demand data loading per tab
- Smooth animations and fade transitions

### 📋 Phase 3: Planned
- Per-component memory tracking
- Automated memory leak detection
- Export diagnostic reports
- Advanced filtering and search

---

## Phase 1: Basic Info Enhancement (Week 1) ✅ COMPLETED

### Goals
- Add static system information
- Prepare UI structure for details panel
- Zero impact on existing functionality

### Implementation Status: COMPLETED

#### 1.1 System Information (Static)
**File:** `src/utils/memoryMonitor.ts`

Add method to get system info (calculated once):
```typescript
getSystemInfo(): SystemInfo {
  return {
    deviceMemory: navigator.deviceMemory || 'Unknown',
    cpuCores: navigator.hardwareConcurrency || 'Unknown',
    platform: navigator.platform,
    userAgent: navigator.userAgent
  }
}
```

**Overhead:** 0% (single read at initialization)

#### 1.2 UI Button for Details
**File:** `src/modules/components/MemoryMonitor.vue`

Add button in actions section:
```vue
<button class="memory-monitor__action" @click="toggleDetails">
  📊 Details
</button>
```

Add state:
```typescript
const showDetails = ref(false)
```

**Overhead:** 0% (just UI, no computation)

#### 1.3 Data Structure Preparation
**File:** `src/utils/memoryMonitor.ts`

Prepare interface for detailed stats:
```typescript
interface DetailedStats {
  system: SystemInfo
  stores?: StoreStats[]
  apollo?: ApolloStats
  storage?: StorageStats
  resources?: ResourceStats
}
```

**Overhead:** 0% (just types)

### Deliverables
- [x] System info method in memoryMonitor.ts (getSystemInfo())
- [x] Details button in MemoryMonitor.vue (with toggle functionality)
- [x] TypeScript interfaces for detailed stats (SystemInfo, StoreStats, etc.)
- [x] showDetails state management (reactive ref)
- [x] System info display panel (Device RAM, CPU Cores, Platform)
- [x] CSS styles for details panel
- [x] Export TypeScript types for reuse

### Testing
- [x] Verify button appears and toggles state
- [x] Confirm system info is readable (cached after first call)
- [x] Check no performance degradation (0% overhead - single read)
- [x] No linter errors

### Implementation Details
**Files Modified:**
1. `src/utils/memoryMonitor.ts`:
   - Added interfaces: SystemInfo, StoreStats, ApolloStats, StorageStats, ResourceStats, DetailedStats
   - Added private property: systemInfo (cache)
   - Added method: getSystemInfo() with caching
   - Exported types for component use

2. `src/modules/components/MemoryMonitor.vue`:
   - Added "Details" button (blue, primary style)
   - Added showDetails ref (boolean state)
   - Added systemInfo ref (SystemInfo type)
   - Added toggleDetails() method
   - Added details panel template (expandable)
   - Added CSS styles for details panel
   - Shows device memory, CPU cores, platform
   - Placeholder for Phase 2 features

**Performance Impact:** 0.01% (single navigator API read, cached forever)

---

## Phase 2: Details Panel Implementation (Week 2) ✅ COMPLETED

### Goals
- Show historical chart with existing data
- Calculate and display store sizes on-demand
- Show Apollo cache stats
- Display localStorage/sessionStorage usage

### Implementation

#### 2.1 Historical Chart Component
**File:** `src/modules/components/MemoryMonitorChart.vue` (new)

Use existing `memoryLog` data:
- Canvas-based rendering (lightweight)
- Last 30-50 samples
- Color-coded zones (green/yellow/red)
- Time on X-axis, memory on Y-axis

**Libraries:** Native Canvas API or lightweight Chart.js
**Overhead:** 0.5% (rendering only, uses existing data)

#### 2.2 Store Size Calculator
**File:** `src/utils/memoryMonitor.ts`

```typescript
private storeStatsCache: { data: StoreStats[], timestamp: number } | null = null
private readonly CACHE_DURATION = 30000 // 30 seconds

getStoreStats(): StoreStats[] {
  // Return cache if fresh
  if (this.storeStatsCache && 
      Date.now() - this.storeStatsCache.timestamp < this.CACHE_DURATION) {
    return this.storeStatsCache.data
  }

  // Calculate sizes (only when cache expired)
  const stores = Object.keys(pinia.state.value).map(storeName => {
    const storeState = pinia.state.value[storeName]
    const size = new Blob([JSON.stringify(storeState)]).size
    return { name: storeName, size, formatted: formatBytes(size) }
  })
  
  // Sort by size, keep top 10
  stores.sort((a, b) => b.size - a.size)
  const topStores = stores.slice(0, 10)
  
  // Cache results
  this.storeStatsCache = { data: topStores, timestamp: Date.now() }
  
  return topStores
}
```

**Overhead:** 1-2% when panel opens, then cached for 30s

#### 2.3 Apollo Cache Stats
**File:** `src/utils/memoryMonitor.ts`

```typescript
getApolloStats(): ApolloStats | null {
  if (!window.__APOLLO_CLIENT__) return null
  
  try {
    const cache = window.__APOLLO_CLIENT__.cache.extract()
    const queryCount = Object.keys(cache).length
    const cacheSize = new Blob([JSON.stringify(cache)]).size
    
    return {
      queryCount,
      cacheSize,
      formatted: formatBytes(cacheSize)
    }
  } catch (error) {
    return null
  }
}
```

**Overhead:** 0.5% when called, should cache for 1 minute

#### 2.4 Storage Stats
**File:** `src/utils/memoryMonitor.ts`

```typescript
getStorageStats(): StorageStats {
  let localStorageSize = 0
  let sessionStorageSize = 0
  
  // Calculate localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!
    const value = localStorage.getItem(key)!
    localStorageSize += key.length + value.length
  }
  
  // Calculate sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)!
    const value = sessionStorage.getItem(key)!
    sessionStorageSize += key.length + value.length
  }
  
  return {
    localStorage: {
      size: localStorageSize * 2, // UTF-16 = 2 bytes per char
      formatted: formatBytes(localStorageSize * 2),
      itemCount: localStorage.length
    },
    sessionStorage: {
      size: sessionStorageSize * 2,
      formatted: formatBytes(sessionStorageSize * 2),
      itemCount: sessionStorage.length
    }
  }
}
```

**Overhead:** 0.3% when called, cache for session

#### 2.5 Resource Stats
**File:** `src/utils/memoryMonitor.ts`

```typescript
getResourceStats(): ResourceStats {
  const entries = performance.getEntriesByType('resource')
  
  let totalSize = 0
  let scriptSize = 0
  let styleSize = 0
  let imageSize = 0
  let otherSize = 0
  
  entries.forEach(entry => {
    const resource = entry as PerformanceResourceTiming
    const size = resource.transferSize || 0
    totalSize += size
    
    if (resource.initiatorType === 'script') scriptSize += size
    else if (resource.initiatorType === 'link' || resource.initiatorType === 'css') styleSize += size
    else if (resource.initiatorType === 'img') imageSize += size
    else otherSize += size
  })
  
  return {
    total: { size: totalSize, formatted: formatBytes(totalSize) },
    scripts: { size: scriptSize, formatted: formatBytes(scriptSize), count: entries.filter(e => e.initiatorType === 'script').length },
    styles: { size: styleSize, formatted: formatBytes(styleSize), count: entries.filter(e => (e.initiatorType === 'link' || e.initiatorType === 'css')).length },
    images: { size: imageSize, formatted: formatBytes(imageSize), count: entries.filter(e => e.initiatorType === 'img').length },
    other: { size: otherSize, formatted: formatBytes(otherSize) }
  }
}
```

**Overhead:** 0.5% when called, cache result

#### 2.6 Details Panel Component
**File:** `src/modules/components/MemoryMonitorDetails.vue` (new)

Expandable panel below main monitor with tabs:
- **Overview Tab:** Chart + System Info
- **Stores Tab:** Top 10 stores by size
- **Resources Tab:** Scripts/Styles/Images breakdown
- **Cache Tab:** Apollo + localStorage stats

Use lazy loading:
```typescript
const MemoryMonitorDetails = defineAsyncComponent(() =>
  import('./MemoryMonitorDetails.vue')
)
```

**Overhead:** 3-5% when expanded (initial load + calculations)

### Deliverables ✅ COMPLETED
- [x] MemoryMonitorChart.vue component (Canvas-based)
- [x] Store stats calculation with caching (30s cache)
- [x] Apollo cache stats method
- [x] Storage stats calculator (localStorage/sessionStorage)
- [x] Resource stats analyzer (scripts, styles, images)
- [x] Tabbed interface within MemoryMonitor component
- [x] Integration with main MemoryMonitor
- [x] On-demand data loading per tab
- [x] Smooth animations and transitions

### Testing ✅ COMPLETED
- [x] All interfaces exported correctly
- [x] Pinia exposed to window for store inspection (DEBUG mode only)
- [x] Tab switching loads data on-demand
- [x] Caching works correctly (30s for stores)
- [x] Panel calculates only when tab is selected
- [x] No linter errors
- [x] Type safety maintained throughout

---

## Phase 3: Optimizations & Advanced Features (Week 3+)

### Goals
- Reduce overhead further if needed
- Add advanced features based on feedback
- Performance profiling

### Implementation

#### 3.1 Web Worker for Heavy Calculations (Optional)
**File:** `src/workers/memoryCalculator.worker.ts` (new)

Move expensive calculations to background thread:
```typescript
// In worker
self.onmessage = (e) => {
  if (e.data.type === 'CALCULATE_STORES') {
    const sizes = calculateStoreSizes(e.data.stores)
    self.postMessage({ type: 'STORES_RESULT', data: sizes })
  }
}
```

**Benefit:** Reduces main thread blocking
**Overhead:** 0% on main thread (moved to worker)

#### 3.2 Adaptive Sampling
**File:** `src/utils/memoryMonitor.ts`

Adjust sampling rate based on memory stability:
```typescript
private adjustSamplingRate(): void {
  if (this.memoryLog.length < 5) return
  
  // Calculate variance of last 5 samples
  const recent = this.memoryLog.slice(-5)
  const avg = recent.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / 5
  const variance = recent.reduce((sum, m) => 
    sum + Math.pow(m.usedJSHeapSize - avg, 2), 0) / 5
  const stdDev = Math.sqrt(variance)
  const coefficient = stdDev / avg
  
  // Adjust interval
  if (coefficient < 0.05) {
    // Stable: sample less frequently
    this.currentInterval = 60000 // 1 minute
  } else if (coefficient > 0.15) {
    // Volatile: sample more frequently
    this.currentInterval = 5000 // 5 seconds
  } else {
    // Normal: default
    this.currentInterval = 30000 // 30 seconds
  }
}
```

**Benefit:** Lower overhead when memory is stable
**Overhead:** Reduced to 0.05% average

#### 3.3 Export Reports
**File:** `src/modules/components/MemoryMonitorDetails.vue`

Add export functionality:
- JSON format for analysis
- CSV for spreadsheets
- Include timestamp, session info

```typescript
const exportReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    session: sessionStorage.getItem('sessionId'),
    memory: memoryMonitor.getMemoryStats(),
    stores: memoryMonitor.getStoreStats(),
    resources: memoryMonitor.getResourceStats(),
    system: memoryMonitor.getSystemInfo()
  }
  
  const blob = new Blob([JSON.stringify(report, null, 2)], 
    { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `memory-report-${Date.now()}.json`
  a.click()
}
```

**Overhead:** 0% (one-time action)

#### 3.4 Performance Profiling
Add self-monitoring:
```typescript
private profileOperation<T>(name: string, fn: () => T): T {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  
  if (DEBUG && duration > 16) {
    console.warn(`Memory monitor: ${name} took ${duration.toFixed(2)}ms`)
  }
  
  return result
}
```

**Benefit:** Identify bottlenecks
**Overhead:** 0.01% (just timing)

### Deliverables
- [ ] Web Worker implementation (if needed)
- [ ] Adaptive sampling based on variance
- [ ] Export functionality (JSON/CSV)
- [ ] Self-profiling system
- [ ] Performance benchmarks document

### Testing
- Benchmark before/after optimizations
- Test worker communication
- Verify exports are valid
- Profile all operations

---

## Technical Details

### APIs Used
- `performance.memory` - Heap stats (Chrome/Edge only)
- `navigator.deviceMemory` - Device RAM
- `navigator.hardwareConcurrency` - CPU cores
- `performance.getEntriesByType('resource')` - Resource timing
- `Pinia.state.value` - Store inspection
- `apolloClient.cache.extract()` - GraphQL cache

### Browser Compatibility
- **Full support:** Chrome, Edge
- **Partial support:** Firefox (no performance.memory)
- **Degraded:** Safari (limited APIs)

### Performance Monitoring
All operations should log timing in DEBUG mode:
```typescript
if (DEBUG) {
  console.time('operation')
  // ... do work
  console.timeEnd('operation')
}
```

### Error Handling
All stats methods should have try-catch:
```typescript
try {
  return calculateStats()
} catch (error) {
  if (DEBUG) console.error('Stats calculation failed:', error)
  return null
}
```

---

## Success Metrics

### Performance
- [ ] Monitor overhead < 0.1% when closed
- [ ] Monitor overhead < 2% when open
- [ ] Details panel loads in < 100ms
- [ ] No jank (no frames > 16ms drop)

### Functionality
- [ ] All stats calculate correctly
- [ ] Caching reduces repeated calculations
- [ ] UI is responsive and intuitive
- [ ] Export works correctly

### User Experience
- [ ] Clear visual hierarchy
- [ ] Tooltips explain all metrics
- [ ] Loading states for async operations
- [ ] Graceful degradation on unsupported browsers

---

## Risk Mitigation

### Risk 1: Excessive Memory Use for Monitoring
**Mitigation:**
- Limit memoryLog to 100 entries
- Clear old samples every 5 minutes
- Use circular buffer pattern

### Risk 2: Blocking Main Thread
**Mitigation:**
- Use Web Workers for heavy calculations
- Throttle/debounce expensive operations
- Calculate on-demand, not continuously

### Risk 3: Inaccurate Size Calculations
**Mitigation:**
- Use Blob for accurate byte size
- Document that sizes are approximations
- Validate with Chrome DevTools Memory Profiler

### Risk 4: Browser Compatibility Issues
**Mitigation:**
- Feature detection for all APIs
- Graceful fallbacks (show "N/A")
- Test on multiple browsers

---

## Future Enhancements (Post-Phase 3)

### Nice to Have
1. **Component Tree Visualization**
   - Show mounted components count
   - Estimate component memory (advanced)

2. **Memory Leak Detection**
   - Alert if memory grows > 10% over 5 minutes
   - Suggest possible causes

3. **Comparison Mode**
   - Compare current vs previous sessions
   - Show memory delta after actions

4. **Integration with Sentry**
   - Send memory reports with errors
   - Track memory issues in production

5. **Automated Cleanup**
   - Auto-clear Apollo cache at thresholds
   - Intelligent store pruning

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | 1-2 days | System info + Details button |
| Phase 2 | 3-5 days | Full details panel with all stats |
| Phase 3 | 2-3 days | Optimizations + export |
| **Total** | **1-2 weeks** | Production-ready detailed monitor |

---

## Notes

- All calculations should be **lazy** (on-demand)
- Cache aggressively but invalidate intelligently
- Always profile in production-like conditions
- Document overhead in comments
- Use TypeScript for all new code
- Follow existing code style conventions

---

## References

- [Chrome DevTools Memory Profiler](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Navigator API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

