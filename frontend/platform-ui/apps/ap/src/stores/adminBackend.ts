import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CompanyAPIPlatformResponse } from "@/types"
import { secureStorage } from '@/services/pinia/index'

import * as CompanyEntity from '@/modules/adminBackend/api/company'
import * as ProcessMonitorApi from '@/modules/adminBackend/api/processMonitor'
import axios from '@/utils/axios'
import { giveAnswer } from '@/services/api/response'
import { StringUtils } from '@/utils'
import { postSpendNotes } from '@/modules/adminBackend/api/dataChange'
import { getBaseApi } from '@/utils/getBaseApi';

// Types
interface SpendFileStatusObject {
  iri: string
  version: number | string
  isPublic: boolean
}

interface AdminBackendState {
  isAdvancedModeSettingsApplied: boolean
  companies: CompanyAPIPlatformResponse[]
  companyName: string
  clusterColumns: Array<any>
  mySpendFileStatusObject: SpendFileStatusObject
}

/**
 * Parameters for getChangeRequestActivities function
 */
interface GetChangeRequestActivitiesParams {
  changeRequestId: string
  callbackSuccess?: (data: any[]) => void
  callbackError?: (error: any) => void
}

/**
 * Parameters for createChangeRequestActivity function
 */
interface CreateChangeRequestActivityParams {
  changeRequestId: string
  message: string
  activityType: 'comment' | 'information_requested'
  callbackSuccess?: (data: any) => void
  callbackError?: (error: any) => void
}

// API Actions - Wrapped to work with Pinia
async function updateGridUiGroup(params: any) {
  const { uuid, name, primaryColor, companies, maxNumberOfUsers, allowedDomains, removeAdaCalculumReferences, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.updateGridUiGroup(uuid, name, primaryColor, companies, maxNumberOfUsers, allowedDomains, removeAdaCalculumReferences)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response)
    }
  } else if (callbackError) {
    callbackError(response)
  }
}

async function createCompany(params: any) {
  const response = await CompanyEntity.createCompany(params)
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response)
    }
  } else if (params.callbackError) {
    params.callbackError(response)
  }
}

async function patchCompany(params: any) {
  const response = await CompanyEntity.patchCompany(params)
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response)
    }
  } else if (params.callbackError) {
    params.callbackError(response)
  }
}

async function deleteCompany(params: any) {
  const response = await CompanyEntity.deleteCompany(params.companyId)
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response)
    }
  } else if (params.callbackError) {
    params.callbackError(response)
  }
}

async function generateCluster(params: any) {
  const { minCompanies, maxPeriod, clusterType, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.generateCluster(minCompanies, maxPeriod, clusterType)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response)
    }
  } else if (callbackError) {
    callbackError(response)
  }
}

async function grantAccess(params: any) {
  const { allCompanies, userId, companyId, isFromUserPanel, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.grantAccess(allCompanies, userId, companyId, isFromUserPanel)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response)
    }
  } else if (callbackError) {
    callbackError(response)
  }
}

async function resetIdentityProvider(params: any) {
  const { userId, companyId, isFromUserPanel, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.resetIdentityProvider(userId, companyId, isFromUserPanel)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response)
    }
  } else if (callbackError) {
    callbackError(response)
  }
}

async function revokeAccess(params: any) {
  const { allCompanies, userId, companyId, isFromUserPanel, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.revokeAccess(allCompanies, userId, companyId, isFromUserPanel)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response)
    }
  } else if (callbackError) {
    callbackError(response)
  }
}

async function getLoginLogPdf(params: any) {
  const response = await CompanyEntity.getLoginLogPDF()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response)
    }
  } else if (params.callbackError) {
    params.callbackError(response)
  }
}

async function updateDataChangeValues(params: any) {
  const { changeRequestId, entity, changeType, values, status, resolutionMessage, callbackSuccess, callbackError } = params
  try {
    const response = await CompanyEntity.updateDataChangeValues(changeRequestId, entity, changeType, values, status, resolutionMessage)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else if (callbackError) {
      callbackError(response)
    }
  } catch (error) {
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getChangeRequestActivities(params: GetChangeRequestActivitiesParams) {
  const { changeRequestId, callbackSuccess, callbackError } = params
  try {
    const response = await CompanyEntity.getChangeRequestActivities(changeRequestId)
    if (response.success) {
      const activities = response.data['hydra:member'] || []
      if (callbackSuccess) {
        callbackSuccess(activities)
      }
    } else if (callbackError) {
      callbackError(response)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in getChangeRequestActivities:', error)
    }
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function createChangeRequestActivity(params: CreateChangeRequestActivityParams) {
  const { changeRequestId, message, activityType, callbackSuccess, callbackError } = params
  try {
    const response = await CompanyEntity.createChangeRequestActivity(changeRequestId, message, activityType)
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
    } else if (callbackError) {
      callbackError(response)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in createChangeRequestActivity:', error)
    }
    if (callbackError) {
      callbackError(error)
    }
  }
}

async function getValuesForCreditRating(params: any) {
  const response = await CompanyEntity.getValuesForCreditRating()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function cloneRowRecord(params: any) {
  const { entity, userMessage, spendFileVersion, cloned, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.cloneRowRecord(entity, userMessage, spendFileVersion, cloned)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function deleteItemRequest(params: any) {
  const { uuid, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.deleteItemRequest(uuid)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function getDataChangesUsers(params: any) {
  const response = await CompanyEntity.getDataChangesUsers()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function getSuppliersForDataChange(params: any) {
  const { spendFileVersion, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.getSuppliersForDataChange(spendFileVersion)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function cleanSelectedFile(params: any) {
  const { id, fileType, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.cleanSelectedFile(id, fileType)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function patchBaseRate(params: any) {
  const { configurationID, value, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.patchBaseRate(configurationID, value)
  if (response.success) {
    if (import.meta.env.DEV) console.log('Base Rate', response.data)
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError(response)
  }
}

async function postBrandScoreFile(params: any) {
  const response = await CompanyEntity.postBrandScoreFile()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function postDenominatorScoreFile(params: any) {
  const response = await CompanyEntity.postDenominatorScoreFile()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function postRecalculateLeverages(params: any) {
  const response = await CompanyEntity.postRecalculateLeverages()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function getCompanyEMISFiles(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.getCompanyEMISFiles(companyId)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function postCapitalize(params: any) {
  const response = await CompanyEntity.postCapitalize()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function getCompanyFiles(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.getCompanyFiles(companyId)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function deleteSelectedUiGroup(params: any) {
  const { uuid, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.deleteSelectedUiGroup(uuid)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response)
    }
  } else if (callbackError) {
    callbackError(response)
  }
}

async function uploadUiGroupLogo(params: any) {
  const { file, companyID, callbackSuccess, callbackError } = params
  if (import.meta.env.DEV) console.log('company ID : ', companyID)
  const response = await CompanyEntity.uploadUiGroupLogo(file, companyID)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function saveCreatedUiGroup(params: any) {
  const { name, primaryColor, companies, maxNumberOfUsers, allowedDomains, removeAdaCalculumReferences, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.saveCreatedUiGroup(name, primaryColor, companies, maxNumberOfUsers, allowedDomains, removeAdaCalculumReferences)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function getListOfCompaniesForFilter(params: any) {
  const response = await CompanyEntity.getListOfCompaniesForFilter()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function getUiGroups(params: any) {
  const { section, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.getUiGroups(section)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function checkNameForUiGroup(params: any) {
  const { name, callbackSuccess, callbackError } = params
  if (import.meta.env.DEV) console.log('inside companies, name : ', name)
  const response = await CompanyEntity.checkNameForUiGroup(name)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function getSpendFilesStatusCount(params: any) {
  const response = await CompanyEntity.getSpendFilesStatusCount()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function getSpendFilesByStatus(params: any) {
  const { status, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.getSpendFilesByStatus(status)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function getProcessMonitorSnapshot(params: any) {
  const response = await ProcessMonitorApi.getSpendFileMonitorSnapshot()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError(response.data)
  }
}

async function cancelProcessRun(params: any) {
  const { uuid, originalEventId, callbackSuccess, callbackError } = params
  const response = await ProcessMonitorApi.cancelSpendFileVersionProcess(uuid, originalEventId)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError(response.data)
  }
}

async function syncClientsDataIngestion(params: any) {
  const response = await CompanyEntity.syncClientsDataIngestion()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function syncCompaniesDataIngestion(params: any) {
  const response = await CompanyEntity.syncCompaniesDataIngestion()
  if (response.success) {
    if (params.callbackSuccess) {
      params.callbackSuccess(response.data)
    }
  } else if (params.callbackError) {
    params.callbackError()
  }
}

async function supplyChainFinanceAPIReadAll(params: any): Promise<void> {
  const { callbackSuccess, callbackError } = params
  let response = null
  const url: string = getBaseApi() + "/api/scf_file_refs"

  try {
    response = await axios.get(url, {})
  } catch (e: any) {
    response = e.response
  }

  response = giveAnswer(response)

  if (response.success && callbackSuccess) {
    callbackSuccess(response.data["hydra:member"])
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function supplyChainFinanceAPIRecalculate(params: any): Promise<void> {
  const { iri, callbackSuccess, callbackError } = params

  if (StringUtils.isNullUndefinedOrEmpty(iri)) {
    if (callbackError) {
      callbackError("iri is required")
    }
    return
  }

  const patchParams = {
    status: "calculation_claimed"
  }

  let response = null
  const url: string = getBaseApi() + iri

  try {
    response = await axios.patch(url, patchParams, {
      headers: {
        "Content-Type": "application/merge-patch+json"
      }
    })
  } catch (e: any) {
    response = e.response
  }

  response = giveAnswer(response)

  if (response.success && callbackSuccess) {
    callbackSuccess(response.data)
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function postNewInvitation(params: any) {
  const { companyName, emails, invitationExpireDate, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.postNewInvitation(companyName, emails, invitationExpireDate)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function getAllInvitations(params: any) {
  const { byUser, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.getAllInvitations(byUser)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data['hydra:member'])
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function getInvitationsActions(params: any) {
  const { uuid, actionType, callbackSuccess, callbackError } = params
  const response = await CompanyEntity.getInvitationsActions(uuid, actionType)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError()
  }
}

async function updateSpendNotes(params: any) {
  const { spendFileVersionUUID, spendFileVersionNotes, callbackSuccess, callbackError } = params
  const response = await postSpendNotes(spendFileVersionUUID, spendFileVersionNotes)
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
  } else if (callbackError) {
    callbackError(response.data)
  }
}

export const useAdminBackendStore = defineStore('adminBackend', () => {
  // State
  const isAdvancedModeSettingsApplied = ref<boolean>(false)
  const companies = ref<CompanyAPIPlatformResponse[]>([])
  const companyName = ref<string>('')
  const clusterColumns = ref<Array<any>>([])
  const mySpendFileStatusObject = ref<SpendFileStatusObject>({
    iri: '',
    version: '',
    isPublic: false
  })
  const accountType = ref<string>('')
  const uiGroupFormSelectedCompanyNames = ref<string[]>([])

  // Getters
  const getCurrentSpendFileIsPublic = computed(() => mySpendFileStatusObject.value.isPublic)
  const getAdvancedModeStatus = computed(() => isAdvancedModeSettingsApplied.value)
  const getCurrentCompanyName = computed(() => companyName.value)
  const getCompanies = computed(() => companies.value)
  const getAdminClustersColumnOrder = computed(() => clusterColumns.value)
  const getAccountType = computed(() => accountType.value)

  // Actions
  function setCurrentSpendFileIsPublic(myObject: SpendFileStatusObject) {
    mySpendFileStatusObject.value = { ...myObject }
  }

  function setAdminClustersColumnOrder(columns: Array<any> | null) {
    clusterColumns.value = columns || []
  }

  function setInitialState() {
    companies.value = []
  }

  function setCompanies(newCompanies: CompanyAPIPlatformResponse[]) {
    companies.value = newCompanies
  }

  function setCurrentCompanyName(name: string) {
    companyName.value = name
  }

  function setAdvancedModeStatus(advancedMode: boolean) {
    isAdvancedModeSettingsApplied.value = advancedMode
  }

  function setAccountType(type: string) {
    accountType.value = type
  }

  function setUiGroupFormSelectedCompanyNames(names: string[]) {
    uiGroupFormSelectedCompanyNames.value = Array.isArray(names) ? [...names] : []
  }

  async function fetchCompanies(params: any) {
    const response = await CompanyEntity.getCompanies()
    if (response.success) {
      setCompanies(response.data['hydra:member'])
      if (params.callbackSuccess) {
        params.callbackSuccess(response.data)
      }
    } else if (params.callbackError) {
      params.callbackError(response)
    }
  }

  return {
    // State
    isAdvancedModeSettingsApplied,
    companies,
    companyName,
    clusterColumns,
    mySpendFileStatusObject,
    accountType,
    uiGroupFormSelectedCompanyNames,

    // Getters
    getCurrentSpendFileIsPublic,
    getAdvancedModeStatus,
    getCurrentCompanyName,
    getCompanies,
    getAdminClustersColumnOrder,
    getAccountType,

    // Mutations
    setCurrentSpendFileIsPublic,
    setAdminClustersColumnOrder,
    setInitialState,
    setCompanies,
    setCurrentCompanyName,
    setAdvancedModeStatus,
    setAccountType,
    setUiGroupFormSelectedCompanyNames,

    // Actions
    fetchCompanies,
    updateGridUiGroup,
    createCompany,
    patchCompany,
    deleteCompany,
    generateCluster,
    grantAccess,
    resetIdentityProvider,
    revokeAccess,
    getLoginLogPdf,
    updateDataChangeValues,
    getChangeRequestActivities,
    createChangeRequestActivity,
    getValuesForCreditRating,
    cloneRowRecord,
    deleteItemRequest,
    getDataChangesUsers,
    getSuppliersForDataChange,
    cleanSelectedFile,
    patchBaseRate,
    postBrandScoreFile,
    postDenominatorScoreFile,
    postRecalculateLeverages,
    getCompanyEMISFiles,
    postCapitalize,
    getCompanyFiles,
    deleteSelectedUiGroup,
    uploadUiGroupLogo,
    saveCreatedUiGroup,
    getListOfCompaniesForFilter,
    getUiGroups,
    checkNameForUiGroup,
    getSpendFilesStatusCount,
    getSpendFilesByStatus,
    getProcessMonitorSnapshot,
    cancelProcessRun,
    syncClientsDataIngestion,
    syncCompaniesDataIngestion,
    supplyChainFinanceAPIReadAll,
    supplyChainFinanceAPIRecalculate,
    postNewInvitation,
    getAllInvitations,
    getInvitationsActions,
    updateSpendNotes
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-adminBackend'
  }
})

export type { SpendFileStatusObject, AdminBackendState }
