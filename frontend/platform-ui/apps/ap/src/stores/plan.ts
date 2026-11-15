import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'
import * as PlanApi from '@/modules/home/plan/api'
// Types
interface PlanState {
  defaultTabHome: string
  defaultPlan: string | null
  defaultPlanProgram: string | null
}

async function deletePlan(props: {
  planId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.deletePlan(planId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in deletePlan:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function deletePlanPhase(props: {
  planPhaseId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planPhaseId, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.deletePlanPhase(planPhaseId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in deletePlanPhase:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function deletePlanUser(props: {
  planUserConfigurationId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planUserConfigurationId, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.deletePlanUser(planUserConfigurationId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in deletePlanUser:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getAllPlans(props: {
  marked?: boolean
  spendFileVersion?: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { marked, spendFileVersion, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getAllPlans(marked || false, spendFileVersion || null)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'])
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getAllPlans:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlanSummary(props: {
  filters: any
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { filters, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlanSummary(filters)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlanSummary:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getAvailableSpends(props: {
  filters: any
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { filters, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getAvailableSpends(filters)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getAvailableSpends:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlanPhaseSummary(props: {
  filters: any
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { filters, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlanPhaseSummary(filters)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlanPhaseSummary:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getWaterFallPlan(props: {
  filters: any
  onlyPlan?: boolean
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { filters, onlyPlan, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getWaterFallPlan(filters, onlyPlan || false)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getWaterFallPlan:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlan(props: {
  planId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlan(planId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlan:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlanPhase(props: {
  phaseId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { phaseId, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlanPhase(phaseId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlanPhase:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlanPhases(props: {
  planId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlanPhases(planId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'])
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlanPhases:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlanPhaseswithGlobalFilter(props: {
  planUUID: string
  filters: any
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planUUID, filters, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlanPhaseswithGlobalFilter(planUUID, filters)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'])
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlanPhaseswithGlobalFilter:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function patchPlan(props: {
  planId: string
  marked?: boolean
  target?: any
  amountType?: string
  amount?: number
  startDate?: string
  endDate?: string
  dimensionType?: string
  period?: string
  title?: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, marked, target, amountType, amount, startDate, endDate, dimensionType, period, title, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.patchPlan(planId, marked || false, target || '', amountType || '', amount || 0, startDate || '', endDate || '', dimensionType || '', period || '', title || '')
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in patchPlan:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function patchPlanMarkedStatus(props: {
  planId: string,
  marked: boolean,
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, marked, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.patchPlanMarkedStatus(planId, marked)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in patchPlan:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function patchPlanPhase(props: {
  planPhaseId: string
  industry?: string
  country?: string
  financingGroup?: string
  harmonizationGroup?: string
  number?: number
  startDate?: string
  endDate?: string
  name?: string
  type?: string
  subtypes?: any
  period?: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planPhaseId, industry, country, financingGroup, harmonizationGroup, number, startDate, endDate, name, type, subtypes, period, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.patchPlanPhase(planPhaseId, industry || '', country || '', financingGroup || '', harmonizationGroup || '', number || 0, startDate || '', endDate || '', name || '', type || '', subtypes || [], period || '')
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in patchPlanPhase:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postPlan(props: {
  program: string
  title: string
  target: string
  amountType: string
  amount: number
  startDate: string
  endDate: string
  marked: boolean
  automateMultiDimensionPhases: number
  dimensionType: string
  period: number
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { program, title, target, amountType, amount, startDate, endDate, marked, automateMultiDimensionPhases, dimensionType, period, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.postPlan(program, title, target, amountType, amount, startDate, endDate, marked, automateMultiDimensionPhases, dimensionType, String(period))
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postPlan:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postPlanPhase(props: {
  planId: string
  startDate: string
  endDate: string
  name: string
  period: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, startDate, endDate, name, period, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.postPlanPhase(planId, startDate, endDate, name, period)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postPlanPhase:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getParentbyPlanAndPhase(props: {
  planId: string
  phaseId: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, phaseId, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getParentbyPlanAndPhase(planId, phaseId)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getParentbyPlanAndPhase:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function postSpendsByPlanAndPhase(props: {
  planId: string
  phaseId: string
  added: any[]
  removed: any[]
  level: string
  filters: any
  all: boolean
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planId, phaseId, added, removed, level, filters, all, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.postSpendsByPlanAndPhase(planId, phaseId, added, removed, level, filters, all)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in postSpendsByPlanAndPhase:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlansbySpendfile(props: {
  spendFileVersion: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { spendFileVersion, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlansbySpendfile(spendFileVersion)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlansbySpendfile:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlansbySpendfileChilds(props: {
  planUuid: string
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { planUuid, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlansbySpendfileChilds(planUuid)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlansbySpendfileChilds:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getPlansSummaryByProgram(props: {
  programId: string
  globalFilter: any
  targetSpendFileVersionUuid: string
  fullDisabled: boolean
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}) {
  const { programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, callbackSuccess, callbackError } = props
  try {
    const response = await PlanApi.getPlansSummaryByProgram(programId, globalFilter, targetSpendFileVersionUuid, fullDisabled || false)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else {
      if (callbackError) {
        callbackError(response)
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in getPlansSummaryByProgram:', error)
    if (callbackError) {
      callbackError(error)
    }
  }
}

export const usePlanStore = defineStore('plan', () => {
  // State
  const defaultTabHome = ref<string>('PlanCardV2')
  const defaultPlan = ref<string | null>(null)
  const defaultPlanProgram = ref<string | null>(null)

  // Getters
  const getDefaultTabHome = computed(() => defaultTabHome.value)
  const getDefaultPlan = computed(() => defaultPlan.value)
  const getDefaultPlanProgram = computed(() => defaultPlanProgram.value)

  // Mutations
  function setDefaultTabHome(tab: string) {
    defaultTabHome.value = tab
  }

  function setDefaultPlan(uuid: string | null) {
    defaultPlan.value = uuid
  }

  function setDefaultPlanProgram(uuid: string | null) {
    defaultPlanProgram.value = uuid
  }

  function setInitialState() {
    defaultTabHome.value = 'PlanCardV2'
    defaultPlan.value = null
    defaultPlanProgram.value = null
  }

  return {
    // State
    defaultTabHome,
    defaultPlan,
    defaultPlanProgram,

    // Getters
    getDefaultTabHome,
    getDefaultPlan,
    getDefaultPlanProgram,

    // Mutations
    setDefaultTabHome,
    setDefaultPlan,
    setDefaultPlanProgram,
    setInitialState,

    // Actions
    deletePlan,
    deletePlanPhase,
    deletePlanUser,
    getAllPlans,
    getPlanSummary,
    getAvailableSpends,
    getPlanPhaseSummary,
    getWaterFallPlan,
    getPlan,
    getPlanPhase,
    getPlanPhases,
    getPlanPhaseswithGlobalFilter,
    patchPlan,
    patchPlanPhase,
    postPlan,
    postPlanPhase,
    getParentbyPlanAndPhase,
    postSpendsByPlanAndPhase,
    getPlansbySpendfile,
    getPlansbySpendfileChilds,
    getPlansSummaryByProgram,
    patchPlanMarkedStatus
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-plan'
  }
})
