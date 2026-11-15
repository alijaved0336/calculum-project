import { ApiResponse, giveAnswer } from '@/services/api/response'
import { useAppStore } from '@/stores/app'
import axios from '@/utils/axios';
import { getUrlWithQueryParams } from '@/services/api/apiServices'
import { removeIRI } from '@/utils'
import { getBaseApi } from '@/utils/getBaseApi';
import { isProgramSfvConsistent } from '@/utils/validation/programSfvConsistency';

export async function deletePlan (
  planId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + planId
  try {
    response = await axios.delete(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'DELETE Plan ')
}

export async function deletePlanPhase (
  planPhaseId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan_phases/' +planPhaseId
  try {
    response = await axios.delete(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'DELETE Plan Phase')
}

export async function deletePlanUser (
  planUserConfigurationId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + planUserConfigurationId
  try {
    response = await axios.delete(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'DELETE PLAN USER')
}


export async function getPlanSummary (
  filters: any
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan/summary'

  const params = {
    filters
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Plan Summary Info')
}


export async function getAvailableSpends (
  filters: any
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan/available-spend'

  const params = {
    filters
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Plan Summary Info')
}


export async function getPlanPhaseSummary (
  filters: any
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan/phase/summary'

  const params = {
    filters
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Plan Phase Summary Info')
}



export async function getWaterFallPlan (
  filters: any,
  onlyPlan: boolean
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plans/phases-waterfall'

  const params = {
    filters,
    onlyPlan
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Phase Additional Info')
}


export async function patchPlan (
  planId: string,
  marked: boolean,
  target: string,
  amountType: string,
  amount: number,
  startDate: string,
  endDate: string,
  dimensionType: string,
  period: string,
  title: string,
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + planId
  const params = {
    marked: marked,
    target: target,
    amountType: amountType,
    amount: amount,
    startDate: startDate,
    endDate: endDate,
    dimensionType: dimensionType,
    period: parseInt(period, 10),
    title
  }
  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'PATCH PLAN')
}



export async function patchPlanMarkedStatus (
  planId: string,
  marked: boolean,  
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + planId
  const params = {
    marked: marked,    
  }
  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'PATCH PLAN MARKED STATUS')
}



export async function getAllPlans (
  marked: boolean,  
  spendFileVersion: string | null
): Promise<ApiResponse> {
  let response = null  
  const queryParamsMarked = [
    { value: 'true', query: 'marked=' },
    { value: spendFileVersion, query: 'program.spendFileVersion.uuid=' }
  ]
  const queryParams = [
    { value: spendFileVersion, query: 'program.spendFileVersion.uuid=' }
  ]

  let url = ''
  if (marked){
    url = getUrlWithQueryParams(getBaseApi() + '/api/plans', queryParamsMarked)
  } else {
    url = getUrlWithQueryParams(getBaseApi() + '/api/plans', queryParams)
  }  

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET ALL PLANS')
}



export async function getPlan (
  planId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + planId
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET PLAN')
}


export async function getPlanPhase (
  phaseId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + phaseId
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET PLAN PHASE')
}

export async function getPlanPhases (
  planId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + planId + '/plan_phases'
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET PLAN PHASES')
}

export async function getPlanPhaseswithGlobalFilter (
  planUUID: string,
  filters: any
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan/plan_phases'
  const params = {
    planUUID,
    filters
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET PLAN PHASES')
}



export async function postPlan (
  program: string,
  title: string,
  target: string,
  amountType: string,
  amount: number,
  startDate: string,
  endDate: string,
  marked: boolean,
  automateMultiDimensionPhases: number,
  dimensionType: string,
  period: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plans'
  const params = {
    program: program,
    title: title,
    target: target,
    amountType: amountType,
    amount: amount,
    startDate: startDate,
    endDate: endDate,
    marked: marked,
    automateMultiDimensionPhases: automateMultiDimensionPhases,
    dimensionType: dimensionType,
    period: parseInt(period, 10)
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST PLAN')
}

export async function patchPlanPhase (
  planPhaseId: string,
  industry: string,
  country: string,
  financingGroup: string,
  harmonizationGroup: string,
  number: number,
  startDate: string,
  endDate: string,
  name: string,
  type: string,
  subtypes: Array<any>,
  period: string,
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan_phases/' + planPhaseId
  const params = {
    industry: industry,
    country: country,
    financingGroup: financingGroup,
    harmonizationGroup: harmonizationGroup,
    number: number,
    startDate: startDate,
    endDate: endDate,
    type: type,
    subtypes: subtypes,
    name: name === "" ? null : name,
    period: parseInt(period, 10)
  }
  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'PATCH PLAN PHASE')
}


export async function postPlanPhase (
  planId: string,
  startDate: string,
  endDate: string,
  name: string,
  period: string,
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan_phases'
  const params = {
    plan: "/api/plans/"+planId,
    startDate: startDate,
    endDate: endDate,
    name: name === "" ? null : name,
    period: parseInt(period, 10)
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST PLAN PHASE')
}

export async function getParentbyPlanAndPhase (planId: any, phaseId: any): Promise<ApiResponse> {
  let response = null  
  const url = getBaseApi() + `/api/plans/${removeIRI(planId)}/phases/${removeIRI(phaseId)}/parents_or_suppliers`
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {   
    response = e.response
  }
  return giveAnswer(response, 'post GET Parent Plan by plan and phase')
}





export async function postSpendsByPlanAndPhase(planId: any, phaseId: any, added: any, removed: any, level: any, filters: any, all: any): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plans/edit-plan-phase'
  const params = {
    uuids: added ,
    removedUuids: removed,
    level,
    filters,
    all
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'post GET SPends by plan and phase')
}






export async function getPlansbySpendfile (
  spendFileVersion: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plans/list/' + removeIRI(spendFileVersion)
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Pland by Spend File in List Info')
}

export async function getPlansbySpendfileChilds (
  planUuid: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/plan/' + removeIRI(planUuid) + '/children'
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Pland by Spend File in List Info')
}


export async function getPlansSummaryByProgram (
  programId: string,
  globalFilter: any,
  targetSpendFileVersionUuid: any | null,
  fullDisabled: boolean,
): Promise<ApiResponse> {
  // Race-condition guard: during a company switch, a stale program/SFV pair
  // can reach this endpoint and the backend rejects it with HTTP 500.
  // See: docs/context/race-condition-company-change.md
  if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true } as ApiResponse
  }

  let response = null
  const url = getBaseApi() + '/api/plans/plans-summary'

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
    targetProgramUuid: removeIRI(programId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid),
    fullDisabled
  }
  const params = {
    filters
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Phase Additional Info')
}
