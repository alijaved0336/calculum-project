import { useEntityCardStore } from '@/stores/entityCard';
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useUserStore } from '@/stores/user';
import { useSubscribeStore } from '@/stores/subscribe';
import { useCompareStore } from '@/stores/compare';
import { useHomeStore } from '@/stores/home';
import { usePlanStore } from '@/stores/plan';
import { memoryMonitor } from '@/utils/memoryMonitor';
import { useListenersCleanup } from '@/composables/useListenersCleanup';
import { useAnalyzeStore } from '@/stores/analyze';
import useFirebase from "@/composables/firebase/useFirebase";
import { SUBSCRIPTION_KEYS, closeSubscription } from "@/composables/firebase/firebaseSession";

export function useCompanyChangeOptimizer() {
  const { fnSetUnsubscribeProgram } = useFirebase();
  const entityCardStore = useEntityCardStore();
  const globalFiltersStore = useGlobalFiltersStore();
  const userStore = useUserStore();
  const subscribeStore = useSubscribeStore();
  const compareStore = useCompareStore();
  const homeStore = useHomeStore();
  const planStore = usePlanStore();
  const memoryMonitorInstance = memoryMonitor;
  const analyzeStore = useAnalyzeStore();
  const { 
    cleanupForCompanyChange, 
    cleanupAllListeners, 
    getCleanupInfo, 
    checkActiveListeners 
  } = useListenersCleanup();

  /**
   * Cleans only temporary store data, preserving user grid configurations
   * to free memory before changing company
   */
  const cleanupBeforeCompanyChange = () => {
    if (import.meta.env.DEV) console.log('🧹 Starting temporary data cleanup (preserving configurations)...');

    // Disable watchers before resetting stores to prevent stale GraphQL queries
    // (e.g. old programUuid sent alongside the new spendFileVersionUuid)
    globalFiltersStore.setDisableWatchers(true);

    // Safety fallback: re-enable watchers after 5s in case any error path skips cleanupAfterCompanyChange
    setTimeout(() => {
      if (globalFiltersStore.getDisableWatchers) {
        if (import.meta.env.DEV) console.warn('⚠️ Safety fallback: re-enabling watchers after timeout');
        globalFiltersStore.setDisableWatchers(false);
      }
    }, 5000);
    
    // Check memory before
    const memoryBefore = memoryMonitorInstance.getMemoryStats();
    if (import.meta.env.DEV && memoryBefore) {
      console.log('📊 Memory before cleanup:', memoryBefore);
    }

    // ✅ CLEAN - Temporary data that does not affect user configurations
    
    // Clean entityCard (session data)
    entityCardStore.setSelectedProgram(null);
    entityCardStore.setAppliedFilter(null);
    
    // Clean user errors using Pinia
    userStore.setBatchUpdate({
      setError403: false,
      setError410: false,
      setShowSpendNoty: false
    });
    
    // Clean compare (temporary data)
    compareStore.setAddededCompanies([]);
    
    // Clean plan (temporary data)
    planStore.setDefaultPlan(null);
    
    // Clean subscribe (temporary data)
    subscribeStore.setLastStatusDate(null);
    subscribeStore.setLastStatusPlanSubscribe(null);
    // Nulling the store slot alone dropped the handle without ever calling it,
    // leaking the plan listener across company changes.
    closeSubscription(SUBSCRIPTION_KEYS.plan);
    subscribeStore.setPlanSubscribe(null);
    subscribeStore.setSupplierStandardClusterStatus('');
    subscribeStore.setLastStatusSpendFileSubscribe(null);
    subscribeStore.setAllowActionsInModules(true)
    subscribeStore.setSetRefeshSpendFiles(null);
    
    // Clean globalFilters (temporary data)

    globalFiltersStore.setFiltersApplied({
      filters: [],
      logic: "and"
    });

    globalFiltersStore.setValuesByColumn({
      spends: [],
      suppliers: [],
      parents: [],
      potentials: []
    });
    
    // Clean analyze (temporary data)
    analyzeStore.setFinancingsGroupsbyProgram([]);
    analyzeStore.setHarmonizationsGroupsbyProgram([]);
    analyzeStore.setHasFinancing(false)
    analyzeStore.setHasHarmonization(false)
    analyzeStore.setGroups([])
    analyzeStore.setFinancing([])

    fnSetUnsubscribeProgram()
    
    // ⚠️ DO NOT CLEAN - User grid configurations
    
    
    // Clean listeners and watchers specific to company change
    const listenersCleaned = cleanupForCompanyChange();
    if (import.meta.env.DEV) console.log(`🎧 ${listenersCleaned} specific listeners cleaned`);
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Check memory after
    const memoryAfter = memoryMonitorInstance.getMemoryStats();
    if (import.meta.env.DEV && memoryAfter) {
      console.log('📊 Memory after cleanup:', memoryAfter);
      const beforeMB = parseFloat(memoryBefore?.current.split(' ')[0] || '0');
      const afterMB = parseFloat(memoryAfter?.current.split(' ')[0] || '0');
      const freed = beforeMB - afterMB;
      if (freed > 0) {
        console.log(`✅ Memory freed: ${freed.toFixed(2)} MB`);
      }
    }
    
    // Check active listeners
    const activeListeners = checkActiveListeners();
    if (import.meta.env.DEV) console.log('🔍 Active listeners state:', activeListeners);
    
    if (import.meta.env.DEV) console.log('✅ Temporary data cleanup completed (configurations preserved)');
  };

  /**
   * Cleans specific data after changing company
   */
  const cleanupAfterCompanyChange = () => {
    if (import.meta.env.DEV) console.log('🧹 Post-company change cleanup...');

    // Re-enable watchers now that the new company context is established
    globalFiltersStore.setDisableWatchers(false);
    
    // Clean Apollo cache if available
    if (window.__APOLLO_CLIENT__) {
      try {
        window.__APOLLO_CLIENT__.clearStore();
        if (import.meta.env.DEV) console.log('✅ Apollo cache cleaned');
      } catch (error) {
        if (import.meta.env.DEV) console.error('❌ Error cleaning Apollo cache:', error);
      }
    }
    
    // Check final memory
    const memoryStats = memoryMonitorInstance.getMemoryStats();
    if (import.meta.env.DEV && memoryStats) {
      console.log('📊 Final memory after change:', memoryStats);
    }
  };

  /**
   * Optimizes company change with complete cleanup
   */
  const optimizedCompanyChange = async (
    companySelectedId: string,
    changeFunction: (companyId: string, actionFromUser: boolean) => void,
    actionFromUser: boolean = true
  ) => {
    try {
      // Cleanup before change
      cleanupBeforeCompanyChange();
      
      // Execute company change
      changeFunction(companySelectedId, actionFromUser);
      
      // Cleanup after change
      setTimeout(() => {
        cleanupAfterCompanyChange();
      }, 1000);
      
    } catch (error) {
      if (import.meta.env.DEV) console.error('❌ Error in optimized company change:', error);
      throw error;
    }
  };

  /**
   * Checks for memory leaks after multiple changes
   */
  const checkMemoryLeaks = () => {
    const memoryStats = memoryMonitorInstance.getMemoryStats();
    if (memoryStats) {
      const usagePercentage = parseFloat(memoryStats.usagePercentage);
      
      if (usagePercentage > 80) {
        console.warn('⚠️ High memory usage after company changes:', memoryStats);
        return {
          hasLeak: true,
          usage: memoryStats.usagePercentage,
          recommendation: 'Consider manual memory cleanup'
        };
      }
    }
    
    return {
      hasLeak: false,
      usage: memoryStats?.usagePercentage || '0%',
      recommendation: 'Memory at normal levels'
    };
  };

  /**
   * Verifies that grid configurations are preserved correctly
   */
  const verifyGridConfigurations = () => {
    if (import.meta.env.DEV) console.log('🔍 Verifying grid configuration preservation...');
    
    const configurations = {
      categorize: {
        inter: homeStore.getHomeCategorizeGridColumnsInter?.length || 0,
        spends: homeStore.getHomeCategorizeGridColumnsSpends?.length || 0,
        suppliers: homeStore.getHomeCategorizeGridColumnsSuppliers?.length || 0,
        parents: homeStore.getHomeCategorizeGridColumnsParents?.length || 0,
        match: homeStore.getMatchColumnsLists?.length || 0
      },
      analyze: {
        list: homeStore.getHomeAnalyzeGridColumnsList?.length || 0,
        supplier: homeStore.getHomeAnalyzeGridColumnsListSupplier?.length || 0,
        parentCF: homeStore.getHomeAnalyzeGridColumnsListParentCF?.length || 0
      },
      plan: {
        spendsCF: homeStore.getHomePlanColumnOrderSpendsCF?.length || 0, 
        suppliersCF: homeStore.getHomePlanPhaseColumnOrderSuppliersCF?.length || 0,
        parentsCF: homeStore.getHomePlanPhaseColumnOrderParentsCF?.length || 0
      }
    };
    
    if (import.meta.env.DEV) {
      console.log('📊 Preserved grid configurations:', configurations);
    }
    
    // Check if there are configurations
    const totalConfigs = Object.values(configurations).reduce((total, section) => {
      return total + Object.values(section).reduce((sum, count) => sum + count, 0);
    }, 0);
    
    if (totalConfigs === 0) {
      console.warn('⚠️ No grid configurations found - verify if they were lost');
      return {
        preserved: false,
        configurations,
        message: 'No grid configurations found'
      };
    }
    
    return {
      preserved: true,
      configurations,
      message: `${totalConfigs} grid configurations preserved`
    };
  };

  return {
    cleanupBeforeCompanyChange,
    cleanupAfterCompanyChange,
    optimizedCompanyChange,
    checkMemoryLeaks,
    verifyGridConfigurations,
    cleanupAllListeners,
    getCleanupInfo,
    checkActiveListeners
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __APOLLO_CLIENT__?: any;
    gc?: () => void;
  }
} 
