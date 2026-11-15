import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'

interface ClusterPeerGroupObject {
  peerGroupClustersLastDate: string | null
  peerGroupClustersLastVersion: number | null
  peerGroupClustersMaxPeriod: number | null
  peerGroupClustersMinCompanies: number | null
  peerGroupClustersStatus: string | null
}

interface ClusterSupplierStandardObject {
  supplierStandardClustersLastDate: string | null
  supplierStandardClustersLastVersion: number | null
  supplierStandardClustersMaxPeriod: number | null
  supplierStandardClustersMinCompanies: number | null
  supplierStandardClustersStatus: string | null
}

export const useSubscribeStore = defineStore('subscribe', () => {
  // State
  const programSubscribe = ref<any>(null)
  const nineBoxesSubscribe = ref<any>(null)
  const refreshPrograms = ref<string>('')
  const refresh9boxes = ref<string>('')
  const authFirestoreUser = ref<any>(null)
  const lastStatusDate = ref<string | null>(null)
  const clusterPeerGroupObject = ref<ClusterPeerGroupObject>({
    peerGroupClustersLastDate: null,
    peerGroupClustersLastVersion: null,
    peerGroupClustersMaxPeriod: null,
    peerGroupClustersMinCompanies: null,
    peerGroupClustersStatus: null
  })
  const clusterSupplierStandardObject = ref<ClusterSupplierStandardObject>({
    supplierStandardClustersLastDate: null,
    supplierStandardClustersLastVersion: null,
    supplierStandardClustersMaxPeriod: null,
    supplierStandardClustersMinCompanies: null,
    supplierStandardClustersStatus: null
  })

  // Plan related getters
  const planSubscribe = ref<any>(null)
  const lastStatusPlanSubscribe = ref<string | null>(null)
  const setRefeshPlans = ref<any>(null)

  const allowActionsInModules = ref<boolean>(true)
  
  // Cluster related getters
  const clusterSubscribe = ref<any>(null)
  // Spend file related getters
  const spendFileSubscribe = ref<any>(null)
  const lastStatusSpendFileSubscribe = ref<string | null>(null)
  const setRefeshSpendFiles = ref<any>(null)
  // Whole-pipeline recalculation progress (0-100) of the active spend file,
  // read from `progress.global.progress` of the Firebase doc (WI#18023).
  // null = no live progress yet (queued / pre-progress / finished).
  const spendFileProgress = ref<number | null>(null)
  // Estimated seconds remaining (`progress.global.times.remain`), for the badge
  // hover tooltip. null = no estimate yet (cold start sanitizes it to null).
  const spendFileProgressRemain = ref<number | null>(null)
  const getSpendFileSubscribe = computed(() => spendFileSubscribe.value)
  const getLastStatusSpendFileSubscribe = computed(() => lastStatusSpendFileSubscribe.value)
  const getSetRefeshSpendFiles = computed(() => setRefeshSpendFiles.value)
  const getSpendFileProgress = computed(() => spendFileProgress.value)
  const getSpendFileProgressRemain = computed(() => spendFileProgressRemain.value)


  // Getters
  const getProgramSubscribe = computed(() => programSubscribe.value)
  const getNineBoxesSubscribe = computed(() => nineBoxesSubscribe.value)
  const getAuthFirestoreUser = computed(() => authFirestoreUser.value)
  const getLastStatusDate = computed(() => lastStatusDate.value)
  const getPlanSubscribe = computed(() => planSubscribe.value)
  const getLastStatusPlanSubscribe = computed(() => lastStatusPlanSubscribe.value)
  const getClusterSubscribe = computed(() => clusterSubscribe.value)
  const getAllowActionsInModules = computed(() => allowActionsInModules.value)
  // Supplier standard related getters
  const getSupplierStandardClustersLastDate = computed(() => 
    clusterSupplierStandardObject.value?.supplierStandardClustersLastDate ?? null
  )
  const getSupplierStandardClusterVersion = computed(() => 
    clusterSupplierStandardObject.value?.supplierStandardClustersLastVersion ?? 0
  )
  const getSupplierStandardClusterStatus = computed(() => 
    clusterSupplierStandardObject.value?.supplierStandardClustersStatus ?? null
  )

  // Peer group related getters
  const getPeerGroupClustersLastDate = computed(() => 
    clusterPeerGroupObject.value?.peerGroupClustersLastDate ?? null
  )
  const getPeerStandardClusterVersion = computed(() => 
    clusterPeerGroupObject.value?.peerGroupClustersLastVersion ?? 0
  )
  const getPeerStandardClusterStatus = computed(() => 
    clusterPeerGroupObject.value?.peerGroupClustersStatus ?? null
  )

  // Actions
  function setProgramSubscribe(subscribe: any) {
    programSubscribe.value = subscribe
  }

  function setNineBoxesSubscribe(subscribe: any) {
    nineBoxesSubscribe.value = subscribe
  }

  function setAuthFirestoreUser(user: any) {
    authFirestoreUser.value = user
  }

  function setLastStatusDate(date: string | null) {
    lastStatusDate.value = date
  }

  function setPlanSubscribe(value: any) {
    planSubscribe.value = value
  }

  function setLastStatusPlanSubscribe(value: string | null) {
    lastStatusPlanSubscribe.value = value
  }

  function setSpendFileSubscribe(value: any) {
    spendFileSubscribe.value = value
  }

  function setLastStatusSpendFileSubscribe(value: string | null) {
    lastStatusSpendFileSubscribe.value = value
  }

  function setSetRefeshSpendFiles(value: any) {
    setRefeshSpendFiles.value = value
  }

  function setSpendFileProgress(value: number | null) {
    spendFileProgress.value = value
  }

  function setSpendFileProgressRemain(value: number | null) {
    spendFileProgressRemain.value = value
  }

  // Monotonic apply: never report a lower % than already shown. The store owns the
  // clamp so it stays the single source of truth regardless of how many times the
  // composable is instantiated. Non-numbers/NaN are ignored, and the value is
  // bounded to [0, 100] so a malformed doc can't break the CSS gauge fill/label.
  function applySpendFileProgress(value: unknown) {
    if (typeof value !== 'number' || Number.isNaN(value)) return
    const bounded = Math.min(100, Math.max(0, value))
    spendFileProgress.value =
      spendFileProgress.value === null
        ? bounded
        : Math.max(spendFileProgress.value, bounded)
  }

  // Set the ETA seconds only when a real, non-negative value is present; a
  // missing/cold-start/NaN/negative value leaves the previous estimate untouched
  // (mirrors applySpendFileProgress so the tooltip never shows "~NaN"/negatives).
  function applySpendFileProgressRemain(value: unknown) {
    if (typeof value === 'number' && !Number.isNaN(value) && value >= 0) {
      spendFileProgressRemain.value = value
    }
  }

  function setAllowActionsInModules(value: boolean) {
    allowActionsInModules.value = value
  }


  function setClusterSubscribe(value: any) {
    clusterSubscribe.value = value
  }

  function setRefreshPrograms(value: string) {
    refreshPrograms.value = value
  }

  function getRefreshPrograms() {
    return refreshPrograms.value
  }

  function setRefresh9boxes(value: string) {
    refresh9boxes.value = value
  }

  function setSetRefeshPlans(value: any) {
    setRefeshPlans.value = value
  }

  // Supplier standard related actions
  function setSupplierStandardClustersLastDate(date: string) {
    clusterSupplierStandardObject.value.supplierStandardClustersLastDate = date
  }

  function setSupplierStandardClusterVersion(version: number) {
    clusterSupplierStandardObject.value.supplierStandardClustersLastVersion = version
  }

  function setSupplierStandardClusterStatus(status: string) {
    clusterSupplierStandardObject.value.supplierStandardClustersStatus = status
  }

  // Peer group related actions
  function setPeerGroupClustersLastDate(date: string) {
    clusterPeerGroupObject.value.peerGroupClustersLastDate = date
  }

  function setPeerStandardClusterVersion(version: number) {
    clusterPeerGroupObject.value.peerGroupClustersLastVersion = version
  }

  function setPeerStandardClusterStatus(status: string) {
    clusterPeerGroupObject.value.peerGroupClustersStatus = status
  }

  // Batch update function for compatibility
  function setBatchUpdate(updates: Record<string, any>) {
    Object.entries(updates).forEach(([key, value]) => {
      const property = key.replace(/^set/, '').charAt(0).toLowerCase() + key.slice(4)
      if (property in clusterSupplierStandardObject.value) {
        clusterSupplierStandardObject.value[property as keyof ClusterSupplierStandardObject] = value
      } else if (property in clusterPeerGroupObject.value) {
        clusterPeerGroupObject.value[property as keyof ClusterPeerGroupObject] = value
      } else {
        // Handle other properties
        switch (property) {
          case 'programSubscribe':
            setProgramSubscribe(value)
            break
          case 'nineBoxesSubscribe':
            setNineBoxesSubscribe(value)
            break
          case 'authFirestoreUser':
            setAuthFirestoreUser(value)
            break
          case 'lastStatusDate':
            setLastStatusDate(value)
            break
          case 'planSubscribe':
            setPlanSubscribe(value)
            break
          case 'lastStatusPlanSubscribe':
            setLastStatusPlanSubscribe(value)
            break
          case 'clusterSubscribe':
            setClusterSubscribe(value)
            break
          case 'refreshPrograms':
            setRefreshPrograms(String(value))
            break
          case 'refresh9boxes':
            setRefresh9boxes(String(value))
            break
          case 'setRefeshPlans':
            setSetRefeshPlans(value)
            break
          case 'spendFileSubscribe':
            setSpendFileSubscribe(value)
            break
          case 'lastStatusSpendFileSubscribe':
            setLastStatusSpendFileSubscribe(value)
            break
          case 'setRefeshSpendFiles':
            setSetRefeshSpendFiles(value)
            break
          case 'spendFileProgress':
            // null = reset (must pass through); numbers keep the monotonic invariant.
            if (value === null) setSpendFileProgress(null)
            else applySpendFileProgress(value)
            break
          case 'spendFileProgressRemain':
            if (value === null) setSpendFileProgressRemain(null)
            else applySpendFileProgressRemain(value)
            break
        }
      }
    })
  }

  return {
    // State
    programSubscribe,
    nineBoxesSubscribe,
    refreshPrograms,
    refresh9boxes,
    authFirestoreUser,
    lastStatusDate,
    clusterPeerGroupObject,
    clusterSupplierStandardObject,
    planSubscribe,
    lastStatusPlanSubscribe,
    setRefeshPlans,
    clusterSubscribe,
    spendFileSubscribe,
    lastStatusSpendFileSubscribe,
    setRefeshSpendFiles,
    spendFileProgress,
    spendFileProgressRemain,
    allowActionsInModules,
    // Getters
    getProgramSubscribe,
    getNineBoxesSubscribe,
    getAuthFirestoreUser,
    getLastStatusDate,
    getPlanSubscribe,
    getLastStatusPlanSubscribe,
    getClusterSubscribe,
    getSupplierStandardClustersLastDate,
    getSupplierStandardClusterVersion,
    getSupplierStandardClusterStatus,
    getPeerGroupClustersLastDate,
    getPeerStandardClusterVersion,
    getPeerStandardClusterStatus,
    getSpendFileSubscribe,
    getLastStatusSpendFileSubscribe,
    getSetRefeshSpendFiles,
    getSpendFileProgress,
    getSpendFileProgressRemain,
    getAllowActionsInModules,
    getRefreshPrograms,
    // Actions
    setProgramSubscribe,    
    setNineBoxesSubscribe,
    setAuthFirestoreUser,
    setLastStatusDate,
    setPlanSubscribe,
    setLastStatusPlanSubscribe,
    setClusterSubscribe,
    setRefreshPrograms,
    setRefresh9boxes,
    setSetRefeshPlans,
    setSupplierStandardClustersLastDate,
    setSupplierStandardClusterVersion,
    setSupplierStandardClusterStatus,
    setPeerGroupClustersLastDate,
    setPeerStandardClusterVersion,
    setPeerStandardClusterStatus,
    setBatchUpdate,
    setSpendFileSubscribe,
    setLastStatusSpendFileSubscribe,
    setSetRefeshSpendFiles,
    setSpendFileProgress,
    setSpendFileProgressRemain,
    applySpendFileProgress,
    applySpendFileProgressRemain,
    setAllowActionsInModules
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-subscribe',
    // Without a pick list the whole store was persisted, including
    // `authFirestoreUser` and the four unsubscribe slots (WI#19104).
    // Restoring those was actively harmful: a Firebase User round-trips through
    // storage as a plain truthy object, so after a reload every guard believed
    // there was a session before any sign-in had happened; and a rehydrated
    // "unsubscribe function" is just data that can never close a listener.
    // Firebase auth state now comes from onIdTokenChanged, and the unsubscribe
    // handles live in the session registry.
    pick: [
      'refreshPrograms',
      'refresh9boxes',
      'lastStatusDate',
      'clusterPeerGroupObject',
      'clusterSupplierStandardObject',
      'lastStatusPlanSubscribe',
      'setRefeshPlans',
      'lastStatusSpendFileSubscribe',
      'setRefeshSpendFiles',
      'spendFileProgress',
      'spendFileProgressRemain',
      'allowActionsInModules'
    ]
  }
})