import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'
import * as AnalyzeApi from '@/modules/home/analyze/api'
// Types
interface CheckedProperties {
  allChecked: boolean
  harmonizationGroupsChecked: boolean
  financingGroupsChecked: boolean
  rulesToIncludeExcludeChecked: boolean
  rulesForHarmonizationGroupsChecked: boolean
  rulesForFinancingGroupsChecked: boolean
}

interface AnalyzeState {
  selectedProgram: any | null
  allPrograms: Array<any>
  allGroups: Array<any>
  includeExcludeArray: Array<any>
  byExclusionRules: boolean
  allFinancing: Array<any>
  setupProgram: Array<any>
  hasFinancing: boolean
  hasHarmonization: boolean
  checkedProperties: CheckedProperties
  setNoActivePrograms: boolean
  nineBoxesSelectedBoxes: Array<any>
  nineBoxesSelectedBoxesFinancing: Array<any>
  nineBoxesSelectedBoxesFinancingSCF: Array<any>
  nineBoxesSelectedBoxesVcard: Array<any>
  homeAnalyzeProgramNineBoxesSpendList: Array<any>
  homeAnalyzeProgramNineBoxesSpendListFinancing: Array<any>
  homeAnalyzeProgramNineBoxesSpendListVcard: Array<any>
  homeAnalyzeProgramNineBoxesSupplierList: Array<any>
  homeAnalyzeProgramNineBoxesSupplierListFinancing: Array<any>
  homeAnalyzeProgramNineBoxesSupplierListVcard: Array<any>
  homeAnalyzeProgramNineBoxesParentList: Array<any>
  homeAnalyzeProgramNineBoxesParentListFinancing: Array<any>
  homeAnalyzeProgramNineBoxesParentListVcard: Array<any>
  homeAnalyzeProgramWaterfallGridList: Array<any>
  homeAnalyzeProgramNineBoxesData: Array<any>
  showHarmonizationChangeModal: boolean
  harmonizationsGroupsbyProgram: Array<any> | null
  financingsGroupsbyProgram: Array<any> | null
}

async function getProgramCommodityValues(params: any) {
  const { programId, q, page, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramCommodityValues(programId, { q, page })

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramCustomColumns(params: any) {
  const { programId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramCustomColumns(programId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function renameCustomColumnValue(params: any) {
  const { programId, columnNumber, previousValue, newValue, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postRenameCustomColumnValue(programId, columnNumber, previousValue, newValue)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramCustomColumnValues(params: any) {
  const { programId, columnUuid, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramCustomColumnValues(programId, columnUuid)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

// AB#20307
async function getProgramExclusionReasons(params: any) {
  const { programId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramExclusionReasons(programId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function renameSpendFieldValue(params: any) {
  const { programId, previousValue, newValue, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postRenameSpendFieldValue(programId, previousValue, newValue)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function deleteFinancingGroup(params: any) {
  const { financingGroupId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.deleteFinancingGroup(financingGroupId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getWaterfallDataForChart(params: any) {
  const { spendFileVersion, programUUID, globalFilters, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getWaterfallDataForChart(spendFileVersion, programUUID, globalFilters)
  
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function getCustomHeaderColumnsTitle(params: any) {
  const { callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getCustomHeaderColumnsTitle()

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function deleteHarmonizationGroup(params: any) {
  const { harmonizationGroupId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.deleteHarmonizationGroup(harmonizationGroupId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getRuleFiltersPossibilities(params: any) {
  const { spendFileVersionUUID, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getRuleFiltersPossibilities(spendFileVersionUUID)
  
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }
  if (callbackError) {
    callbackError(response)
  }
}

async function getCardsDataVcardOpportunity(params: any) {
  const { filters, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getCardsDataVcardOpportunity(filters)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgram(params: any) {
  const { programId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgram(programId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramPost(params: any) {
  const { programId, globalFilter, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramPost(programId, globalFilter)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function deleteProgramUser(params: any) {
  const { programUserConfigurationId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.deleteProgramUser(programUserConfigurationId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function deleteProgramSpendConfiguration(params: any) {
  const { programSpendConfigurationId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.deleteProgramSpendConfiguration(programSpendConfigurationId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramPotentialsPost(params: any) {
  const { programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramPotentialsPost(programId, globalFilter, targetSpendFileVersionUuid, fullDisabled)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function deleteProgram(params: any) {
  const { programId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.deleteProgram(programId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramPaymentTerms(params: any) {
  const { programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramPaymentTerms(programId, globalFilter, targetSpendFileVersionUuid, fullDisabled)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramDistribution(params: any) {
  const { programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramDistribution(programId, globalFilter, targetSpendFileVersionUuid, fullDisabled)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramSpendInfo(params: any) {
  const { programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramSpendInfo(programId, globalFilter, targetSpendFileVersionUuid, fullDisabled)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getSpendsbySupplier(params: any) {
  const { supplierUUID, programUUID, disabled, level, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getSpendsbySupplier(supplierUUID, programUUID, disabled, level)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function nineBoxesDataAPIReadAll(params: {
  filters: {
    programId: string
    disabled: boolean
    globalFilter: string
    spendFileVersionId: string
    currencyRate: number
  }
  level: string
  type9boxes: string
  callbackSuccess: any
  callbackError: any
}) {
  const { filters, level, type9boxes, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.nineBoxesDataAPIReadAll({ filters, level, type9boxes })

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function patchFinancingGroup(params: any) {
  const { financingGroupId, name, periodInMonths, baseRateType, baseRate, fundingSpread, color, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.patchFinancingGroup(financingGroupId, name, periodInMonths, baseRateType, baseRate, fundingSpread, color)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function patchHarmonizationGroup(params: any) {
  const { harmonizationGroupId, name, paymentTermsWithoutCashDiscountDays, paymentTermsWithCashDiscountDays, cashDiscount, color, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.patchHarmonizationGroup(harmonizationGroupId, name, paymentTermsWithoutCashDiscountDays, paymentTermsWithCashDiscountDays, cashDiscount, color)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function patchProgramSpendConfiguration(params: any) {
  const { spendProgramConfigurationId, harmonizationGroup, financingGroup, disabled, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.patchProgramSpendConfiguration(spendProgramConfigurationId, harmonizationGroup, financingGroup, disabled)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getProgramSpendConfiguration(params: any) {
  const { programId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getProgramSpendConfiguration(programId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function patchProgramSpendConfigurations(params: any) {
  const { spendProgramConfigurations, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postProgramSpendConfigurations(spendProgramConfigurations)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function patchProgram(params: any) {
  const { programId, name, programTarget, spendFileVersion, marked, termHarmonizationEnabled, externalFinancingEnabled, cashDiscountEnabled, automateHarmonizationTerms, topLeftChart, topRightChart, bottomLeftChart, bottomRightChart, processingTotal, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.patchProgram(programId, name, programTarget, spendFileVersion, marked, termHarmonizationEnabled, externalFinancingEnabled, cashDiscountEnabled, automateHarmonizationTerms, topLeftChart, topRightChart, bottomLeftChart, bottomRightChart, processingTotal)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function patchProgramRecentlyCreated(params: any) {
  const { programId, isRecentlyCreated, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.patchProgramRecentlyCreated(programId, isRecentlyCreated)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function changeActiveStatus(params: any) {
  const { programId, active, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.changeActiveStatus(programId, active)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postUpdateHarmonizationgGroups(params: any) {
  const { program, termHarmonizationEnabled, groupsDeleted, groups, data, roundOn, automateHarmonizationTerms, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postUpdateHarmonizationgGroups(program, termHarmonizationEnabled, groupsDeleted, groups, data, roundOn, automateHarmonizationTerms)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postUpdateFinancingGroups(params: any) {
  const { program, externalFinancingEnabled, automateFinancingTerms, groupsDeleted, groups, approvalTimeSource, approvalTime, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postUpdateFinancingGroups(program, externalFinancingEnabled, automateFinancingTerms, groupsDeleted, groups, approvalTimeSource, approvalTime)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getValidateName(params: any) {
  const { programName, selectedSpendFileVersion, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getValidateName(programName, selectedSpendFileVersion)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postProgramSpendConfigurationbyGroups(params: any) {
  const { program, changed, uuids, value, filters, level, all, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postProgramSpendConfigurationbyGroups(program, changed, uuids, value, filters, level, all)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postGenerateCloneProgram(params: any) {
  const { programId, cloneProgramName, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postGenerateCloneProgram(programId, cloneProgramName)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postRecalculate(params: any) {
  const { programId, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postRecalculateProgram(programId)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function postSummarizeValues(params: any) {
  const { spendFileVersionUuid, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.postSummarizeValues(spendFileVersionUuid)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getStatsAgreed(params: any) {
  const { programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, type, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getStatsAgreed(programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, type)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

async function getStatusCardsNumber(params: any) {
  const { programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, levelOfGrid, callbackSuccess, callbackError } = params
  const response = await AnalyzeApi.getStatusCardsNumber(programId, globalFilter, targetSpendFileVersionUuid, fullDisabled, levelOfGrid)

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError(response)
  }
}

export const useAnalyzeStore = defineStore('analyze', () => {
  // State
  const selectedProgram = ref<any | null>(null)
  const allPrograms = ref<Array<any>>([])
  const allGroups = ref<Array<any>>([])
  const includeExcludeArray = ref<Array<any>>([])
  const byExclusionRules = ref<boolean>(true)
  const allFinancing = ref<Array<any>>([])
  const setupProgram = ref<Array<any>>([])
  const hasFinancing = ref<boolean>(false)
  const hasHarmonization = ref<boolean>(false)
  const checkedProperties = ref<CheckedProperties>({
    allChecked: false,
    harmonizationGroupsChecked: false,
    financingGroupsChecked: false,
    rulesToIncludeExcludeChecked: false,
    rulesForHarmonizationGroupsChecked: false,
    rulesForFinancingGroupsChecked: false
  })
  const setNoActivePrograms = ref<boolean>(false)
  const nineBoxesSelectedBoxes = ref<Array<any>>([])
  const nineBoxesSelectedBoxesFinancing = ref<Array<any>>([])
  const nineBoxesSelectedBoxesVcard = ref<Array<any>>([])
  const nineBoxesSelectedBoxesFinancingSCF = ref<Array<any>>([])

  const homeAnalyzeProgramNineBoxesSpendList = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesSpendListFinancing = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesSpendListVcard = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesSupplierList = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesSupplierListFinancing = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesSupplierListVcard = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesParentList = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesParentListFinancing = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesParentListVcard = ref<Array<any>>([])
  const homeAnalyzeProgramWaterfallGridList = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesData = ref<Array<any>>([])
  const showHarmonizationChangeModal = ref<boolean>(false)
  const harmonizationsGroupsbyProgram = ref<Array<any> | null>([])
  const financingsGroupsbyProgram = ref<Array<any> | null>([])

  const homeAnalyzeProgramNineBoxesSpendListFinancingSCF = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesSupplierListFinancingSCF = ref<Array<any>>([])
  const homeAnalyzeProgramNineBoxesParentListFinancingSCF = ref<Array<any>>([])

  const customDataPointTypes = ref<Record<string, 'number' | 'days' | 'money'>>({})

  // Getters
  const getHarmonizationsGroupsbyProgram = computed(() => harmonizationsGroupsbyProgram.value)
  const getFinancingsGroupsbyProgram = computed(() => financingsGroupsbyProgram.value)
  const getAllPrograms = computed(() => allPrograms.value)
  const getAllGroups = computed(() => allGroups.value)
  const getSelectedProgram = computed(() => selectedProgram.value)
  const getAllFinancing = computed(() => allFinancing.value)
  const getSetupProgram = computed(() => setupProgram.value)
  const getHasHarmonization = computed(() => hasHarmonization.value)
  const getHasFinancing = computed(() => hasFinancing.value)
  const getIncludeExclude = computed(() => includeExcludeArray.value)
  const getByExclusionRules = computed(() => byExclusionRules.value)
  const getCheckedAdvancedProperties = computed(() => checkedProperties.value)
  const getSetNoActiveProgramsSelected = computed(() => setNoActivePrograms.value)
  const getNineBoxesSelectedBoxes = computed(() => nineBoxesSelectedBoxes.value)
  const getNineBoxesSelectedBoxesFinancing = computed(() => nineBoxesSelectedBoxesFinancing.value)
  const getNineBoxesSelectedBoxesFinancingSCF = computed(() => nineBoxesSelectedBoxesFinancingSCF.value)
  const getNineBoxesSelectedBoxesVcard = computed(() => nineBoxesSelectedBoxesVcard.value)
  const getHomeAnalyzeProgramNineBoxesSpendList = computed(() => homeAnalyzeProgramNineBoxesSpendList.value || [])
  const getHomeAnalyzeProgramNineBoxesSpendListFinancing = computed(() => homeAnalyzeProgramNineBoxesSpendListFinancing.value || [])
  const getHomeAnalyzeProgramNineBoxesSpendListVcard = computed(() => homeAnalyzeProgramNineBoxesSpendListVcard.value || [])
  const getHomeAnalyzeProgramNineBoxesSupplierList = computed(() => homeAnalyzeProgramNineBoxesSupplierList.value || [])
  const getHomeAnalyzeProgramNineBoxesSupplierListFinancing = computed(() => homeAnalyzeProgramNineBoxesSupplierListFinancing.value || [])
  const getHomeAnalyzeProgramNineBoxesSupplierListVcard = computed(() => homeAnalyzeProgramNineBoxesSupplierListVcard.value || [])
  const getHomeAnalyzeProgramNineBoxesParentList = computed(() => homeAnalyzeProgramNineBoxesParentList.value || [])
  const getHomeAnalyzeProgramNineBoxesParentListFinancing = computed(() => homeAnalyzeProgramNineBoxesParentListFinancing.value || [])
  const getHomeAnalyzeProgramNineBoxesParentListVcard = computed(() => homeAnalyzeProgramNineBoxesParentListVcard.value || [])
  const getHomeAnalyzeProgramNineBoxesData = computed(() => homeAnalyzeProgramNineBoxesData.value || [])
  const getShowHarmonizationChangeModal = computed(() => showHarmonizationChangeModal.value)
  const getHomeAnalyzeWaterfallGridColumnsList = computed(() => homeAnalyzeProgramWaterfallGridList.value)


  const getHomeAnalyzeProgramNineBoxesSpendListFinancingSCF = computed(() => homeAnalyzeProgramNineBoxesSpendListFinancingSCF.value || [])
  const getHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF = computed(() => homeAnalyzeProgramNineBoxesSupplierListFinancingSCF.value || [])
  const getHomeAnalyzeProgramNineBoxesParentListFinancingSCF = computed(() => homeAnalyzeProgramNineBoxesParentListFinancingSCF.value || [])




  // Actions (Mutations)
  function setInitialState() {
    // Nine Boxes Data
    homeAnalyzeProgramNineBoxesSpendList.value = []
    homeAnalyzeProgramNineBoxesSpendListFinancing.value = []
    homeAnalyzeProgramNineBoxesSpendListVcard.value = []
    homeAnalyzeProgramNineBoxesSupplierList.value = []
    homeAnalyzeProgramNineBoxesSupplierListFinancing.value = []
    homeAnalyzeProgramNineBoxesSupplierListVcard.value = []
    homeAnalyzeProgramNineBoxesParentList.value = []
    homeAnalyzeProgramNineBoxesParentListFinancing.value = []
    homeAnalyzeProgramNineBoxesParentListVcard.value = []
    homeAnalyzeProgramNineBoxesData.value = []
    homeAnalyzeProgramWaterfallGridList.value = []
    nineBoxesSelectedBoxes.value = []
    nineBoxesSelectedBoxesFinancing.value = []
    nineBoxesSelectedBoxesFinancingSCF.value = []
    nineBoxesSelectedBoxesVcard.value = []

    // Programs and Groups
    selectedProgram.value = null
    allPrograms.value = []
    allGroups.value = []
    allFinancing.value = []
    setupProgram.value = []
    financingsGroupsbyProgram.value = []
    harmonizationsGroupsbyProgram.value = []

    // Rules and Filters
    includeExcludeArray.value = []
    byExclusionRules.value = true

    // UI State
    showHarmonizationChangeModal.value = false
    hasFinancing.value = false
    hasHarmonization.value = false
    setNoActivePrograms.value = false

    // Properties
    checkedProperties.value = {
      allChecked: false,
      harmonizationGroupsChecked: false,
      financingGroupsChecked: false,
      rulesToIncludeExcludeChecked: false,
      rulesForHarmonizationGroupsChecked: false,
      rulesForFinancingGroupsChecked: false
    }
  }

  function setHarmonizationsGroupsbyProgram(groups: Array<any>) {
    harmonizationsGroupsbyProgram.value = groups
  }

  function setFinancingsGroupsbyProgram(groups: Array<any>) {
    financingsGroupsbyProgram.value = groups
  }

  function setHasFinancing(hasFinancingValue: boolean) {
    hasFinancing.value = hasFinancingValue
  }

  function setHasHarmonization(hasHarmonizationValue: boolean) {
    hasHarmonization.value = hasHarmonizationValue
  }

  function setSetupProgram(setupProgramValue: any) {
    setupProgram.value = setupProgramValue
  }

  function setGroups(allGroupsValue: any) {
    allGroups.value = allGroupsValue
  }

  function setFinancing(allFinancingValue: any) {
    allFinancing.value = allFinancingValue
  }

  function setSelectedProgram(program: any | null) {
    selectedProgram.value = program
  }

  function setAllPrograms(programs: Array<any>) {
    allPrograms.value = programs
  }

  function setIncludeExclude(includeExclude: Array<any>) {
    includeExcludeArray.value = includeExclude
  }

  function setByExclusionRules(byExclusionRulesValue: boolean) {
    byExclusionRules.value = byExclusionRulesValue
  }

  function setCheckedAdvancedProperties(checkedPropertiesValue: CheckedProperties) {
    checkedProperties.value = checkedPropertiesValue
  }

  function setSetNoActiveProgramsSelected(setNoActiveProgramsSelected: boolean) {
    setNoActivePrograms.value = setNoActiveProgramsSelected
  }

  function setNineBoxesSelectedBoxes(nineBoxesSelectedBoxesValue: Array<any>) {
    nineBoxesSelectedBoxes.value = nineBoxesSelectedBoxesValue
  }

  function setNineBoxesSelectedBoxesFinancing(nineBoxesSelectedBoxesFinancingValue: Array<any>) {
    nineBoxesSelectedBoxesFinancing.value = nineBoxesSelectedBoxesFinancingValue
  }

  function setNineBoxesSelectedBoxesFinancingSCF(nineBoxesSelectedBoxesFinancingSCFValue: Array<any>) {
    nineBoxesSelectedBoxesFinancingSCF.value = nineBoxesSelectedBoxesFinancingSCFValue
  }

  function setNineBoxesSelectedBoxesVcard(nineBoxesSelectedBoxesVcardValue: Array<any>) {
    nineBoxesSelectedBoxesVcard.value = nineBoxesSelectedBoxesVcardValue
  }

  function setHomeAnalyzeProgramNineBoxesSpendList(homeAnalyzeProgramNineBoxesSpendListValue: any) {
    homeAnalyzeProgramNineBoxesSpendList.value = homeAnalyzeProgramNineBoxesSpendListValue
  }

  function setHomeAnalyzeProgramNineBoxesSpendListFinancing(homeAnalyzeProgramNineBoxesSpendListFinancingValue: any) {
    homeAnalyzeProgramNineBoxesSpendListFinancing.value = homeAnalyzeProgramNineBoxesSpendListFinancingValue
  }

  function setHomeAnalyzeProgramNineBoxesSpendListVcard(homeAnalyzeProgramNineBoxesSpendListVcardValue: any) {
    homeAnalyzeProgramNineBoxesSpendListVcard.value = homeAnalyzeProgramNineBoxesSpendListVcardValue
  }

  function setHomeAnalyzeProgramNineBoxesSupplierList(homeAnalyzeProgramNineBoxesSupplierListValue: any) {
    homeAnalyzeProgramNineBoxesSupplierList.value = homeAnalyzeProgramNineBoxesSupplierListValue
  }

  function setHomeAnalyzeProgramNineBoxesSupplierListFinancing(homeAnalyzeProgramNineBoxesSupplierListFinancingValue: any) {
    homeAnalyzeProgramNineBoxesSupplierListFinancing.value = homeAnalyzeProgramNineBoxesSupplierListFinancingValue
  }

  function setHomeAnalyzeProgramNineBoxesSupplierListVcard(homeAnalyzeProgramNineBoxesSupplierListVcardValue: any) {
    homeAnalyzeProgramNineBoxesSupplierListVcard.value = homeAnalyzeProgramNineBoxesSupplierListVcardValue
  }

  function setHomeAnalyzeProgramNineBoxesParentList(homeAnalyzeProgramNineBoxesParentListValue: any) {
    homeAnalyzeProgramNineBoxesParentList.value = homeAnalyzeProgramNineBoxesParentListValue
  }

  function setHomeAnalyzeProgramNineBoxesParentListFinancing(homeAnalyzeProgramNineBoxesParentListFinancingValue: any) {
    homeAnalyzeProgramNineBoxesParentListFinancing.value = homeAnalyzeProgramNineBoxesParentListFinancingValue
  }

  function setHomeAnalyzeProgramNineBoxesParentListVcard(homeAnalyzeProgramNineBoxesParentListVcardValue: any) {
    homeAnalyzeProgramNineBoxesParentListVcard.value = homeAnalyzeProgramNineBoxesParentListVcardValue
  }

  function setHomeAnalyzeProgramNineBoxesData(homeAnalyzeProgramNineBoxesDataValue: any) {
    homeAnalyzeProgramNineBoxesData.value = homeAnalyzeProgramNineBoxesDataValue
  }

  function setShowHarmonizationChangeModal(showHarmonizationChangeModalValue: any) {
    showHarmonizationChangeModal.value = showHarmonizationChangeModalValue
  }

  function setHomeAnalyzeWaterfallGridColumnsList(homeAnalyzeProgramWaterfallGridListValue: any) {
    homeAnalyzeProgramWaterfallGridList.value = homeAnalyzeProgramWaterfallGridListValue
  }

  function setHomeAnalyzeProgramNineBoxesSpendListFinancingSCF(homeAnalyzeProgramNineBoxesSpendListFinancingSCFValue: any) {
    homeAnalyzeProgramNineBoxesSpendListFinancingSCF.value = homeAnalyzeProgramNineBoxesSpendListFinancingSCFValue
  }

  function setHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF(homeAnalyzeProgramNineBoxesSupplierListFinancingSCFValue: any) {
    homeAnalyzeProgramNineBoxesSupplierListFinancingSCF.value = homeAnalyzeProgramNineBoxesSupplierListFinancingSCFValue
  }

  function setHomeAnalyzeProgramNineBoxesParentListFinancingSCF(homeAnalyzeProgramNineBoxesParentListFinancingSCFValue: any) {
    homeAnalyzeProgramNineBoxesParentListFinancingSCF.value = homeAnalyzeProgramNineBoxesParentListFinancingSCFValue
  }

  function setBatchUpdate(updates: {
    setFinancingsGroupsbyProgram?: Array<any>
    setHarmonizationsGroupsbyProgram?: Array<any>
    setAllPrograms?: Array<any>
    setSelectedProgram?: any | null
    setHasFinancing?: boolean
    setHasHarmonization?: boolean
    setIncludeExclude?: Array<any>
    setByExclusionRules?: boolean
  }) {
    if (updates.setFinancingsGroupsbyProgram !== undefined) {
      financingsGroupsbyProgram.value = updates.setFinancingsGroupsbyProgram
    }
    if (updates.setHarmonizationsGroupsbyProgram !== undefined) {
      harmonizationsGroupsbyProgram.value = updates.setHarmonizationsGroupsbyProgram
    }
    if (updates.setAllPrograms !== undefined) {
      allPrograms.value = updates.setAllPrograms
    }
    if (updates.setSelectedProgram !== undefined) {
      selectedProgram.value = updates.setSelectedProgram
    }
    if (updates.setHasFinancing !== undefined) {
      hasFinancing.value = updates.setHasFinancing
    }
    if (updates.setHasHarmonization !== undefined) {
      hasHarmonization.value = updates.setHasHarmonization
    }
    if (updates.setIncludeExclude !== undefined) {
      includeExcludeArray.value = updates.setIncludeExclude
    }
    if (updates.setByExclusionRules !== undefined) {
      byExclusionRules.value = updates.setByExclusionRules
    }
  }

  // API Actions - Wrapped to work with Pinia





  async function getFinancingGroups(params: any) {
    const { programId, callbackSuccess, callbackError } = params
    const response = await AnalyzeApi.getFinancingGroups(programId)

    if (response.success) {
      // Set the financing groups in the store
      if (response.data) {
        const financingGroups = response.data['hydra:member'] || []
        setFinancingsGroupsbyProgram(financingGroups)
      }
      
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'] || [])
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }






  async function fetchAllPrograms(params: any) {
    const { marked, scope, firstName, lastName, spendFileVersion, callbackSuccess, callbackError, signal } = params
    
    try {
      const response = await AnalyzeApi.getAllPrograms(marked, scope, firstName, lastName, spendFileVersion, signal)

      if (response.success) {
        setAllPrograms(response.data['hydra:member'])
        if (callbackSuccess) {
          callbackSuccess(response.data['hydra:member'])
        }
        return
      }

      if (callbackError) {
        callbackError(response)
      }
    } catch (error: any) {
      // If the request was aborted, don't call error callback
      if (error.name === 'AbortError') {
        return
      }
      
      if (callbackError) {
        callbackError(error)
      }
    }
  }






  async function getProgramTermGroups(params: any) {
    const { programId, callbackSuccess, callbackError } = params
    const response = await AnalyzeApi.getProgramTermGroups(programId)

    if (response.success) {
      // Set the harmonization groups in the store
      if (response.data) {
        const harmonizationGroups = response.data['hydra:member'] || []
        setHarmonizationsGroupsbyProgram(harmonizationGroups)
      }
      
      if (callbackSuccess) {
        callbackSuccess(response.data['hydra:member'] || [])
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }















  async function postAnalyzePrograms(params: any) {
    const { name, programTarget, spendFileVersion, callbackSuccess, callbackError } = params
    const response = await AnalyzeApi.postAnalyzePrograms(name, programTarget, spendFileVersion)

    if (response.success) {
      setSelectedProgram(response.data['hydra:member'])
      if (callbackSuccess) {
        callbackSuccess(response.data)
      }
      return
    }

    if (callbackError) {
      callbackError(response)
    }
  }







  async function loadCustomDataPointTypes(programUuid: string) {
    const response = await AnalyzeApi.getProgramCustomColumns(programUuid)
    if (response.success) {
      const map: Record<string, 'number' | 'days' | 'money'> = {}
      // Backend returns { columns: [...] }; fall back to a bare array for safety.
      const columns = response.data?.columns ?? response.data ?? []
      ;(Array.isArray(columns) ? columns : []).forEach((col: any) => {
        if (col.columnNumber && col.type && col.type !== 'text') {
          map[`customDataPoint${col.columnNumber}`] = col.type as 'number' | 'days' | 'money'
        }
      })
      customDataPointTypes.value = map
    }
  }

  return {
    // State
    selectedProgram,
    allPrograms,
    allGroups,
    includeExcludeArray,
    byExclusionRules,
    allFinancing,
    setupProgram,
    hasFinancing,
    hasHarmonization,
    checkedProperties,
    setNoActivePrograms,
    nineBoxesSelectedBoxes,
    nineBoxesSelectedBoxesFinancing,
    nineBoxesSelectedBoxesFinancingSCF,
    nineBoxesSelectedBoxesVcard,
    homeAnalyzeProgramNineBoxesSpendList,
    homeAnalyzeProgramNineBoxesSpendListFinancing,
    homeAnalyzeProgramNineBoxesSpendListVcard,
    homeAnalyzeProgramNineBoxesSupplierList,
    homeAnalyzeProgramNineBoxesSupplierListFinancing,
    homeAnalyzeProgramNineBoxesSupplierListVcard,
    homeAnalyzeProgramNineBoxesParentList,
    homeAnalyzeProgramNineBoxesParentListFinancing,
    homeAnalyzeProgramNineBoxesParentListVcard,
    homeAnalyzeProgramWaterfallGridList,
    homeAnalyzeProgramNineBoxesData,
    showHarmonizationChangeModal,
    harmonizationsGroupsbyProgram,
    financingsGroupsbyProgram,    
    homeAnalyzeProgramNineBoxesSpendListFinancingSCF,
    homeAnalyzeProgramNineBoxesSupplierListFinancingSCF,
    homeAnalyzeProgramNineBoxesParentListFinancingSCF,

    // Getters
    getHarmonizationsGroupsbyProgram,
    getFinancingsGroupsbyProgram,
    getAllPrograms,
    getAllGroups,
    getSelectedProgram,
    getAllFinancing,
    getSetupProgram,
    getHasHarmonization,
    getHasFinancing,
    getIncludeExclude,
    getByExclusionRules,
    getCheckedAdvancedProperties,
    getSetNoActiveProgramsSelected,
    getNineBoxesSelectedBoxes,
    getNineBoxesSelectedBoxesFinancing,
    getNineBoxesSelectedBoxesVcard,
    getHomeAnalyzeProgramNineBoxesSpendList,
    getHomeAnalyzeProgramNineBoxesSpendListFinancing,
    getHomeAnalyzeProgramNineBoxesSpendListVcard,
    getHomeAnalyzeProgramNineBoxesSupplierList,
    getHomeAnalyzeProgramNineBoxesSupplierListFinancing,
    getHomeAnalyzeProgramNineBoxesSupplierListVcard,
    getHomeAnalyzeProgramNineBoxesParentList,
    getHomeAnalyzeProgramNineBoxesParentListFinancing,
    getHomeAnalyzeProgramNineBoxesParentListVcard,
    getHomeAnalyzeProgramNineBoxesData,
    getShowHarmonizationChangeModal,
    getHomeAnalyzeWaterfallGridColumnsList,
    getNineBoxesSelectedBoxesFinancingSCF,
    getHomeAnalyzeProgramNineBoxesSpendListFinancingSCF,
    getHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF,
    getHomeAnalyzeProgramNineBoxesParentListFinancingSCF,

    // Actions (Mutations)
    setInitialState,
    setHarmonizationsGroupsbyProgram,
    setFinancingsGroupsbyProgram,
    setHasFinancing,
    setHasHarmonization,
    setSetupProgram,
    setGroups,
    setFinancing,
    setSelectedProgram,
    setAllPrograms,
    setIncludeExclude,
    setByExclusionRules,
    setCheckedAdvancedProperties,
    setSetNoActiveProgramsSelected,
    setNineBoxesSelectedBoxes,
    setNineBoxesSelectedBoxesFinancing,
    setNineBoxesSelectedBoxesVcard,
    setHomeAnalyzeProgramNineBoxesSpendList,
    setHomeAnalyzeProgramNineBoxesSpendListFinancing,
    setHomeAnalyzeProgramNineBoxesSpendListVcard,
    setHomeAnalyzeProgramNineBoxesSupplierList,
    setHomeAnalyzeProgramNineBoxesSupplierListFinancing,
    setHomeAnalyzeProgramNineBoxesSupplierListVcard,
    setHomeAnalyzeProgramNineBoxesParentList,
    setHomeAnalyzeProgramNineBoxesParentListFinancing,
    setHomeAnalyzeProgramNineBoxesParentListVcard,
    setHomeAnalyzeProgramNineBoxesData,
    setShowHarmonizationChangeModal,
    setHomeAnalyzeWaterfallGridColumnsList,
    setBatchUpdate,
    setNineBoxesSelectedBoxesFinancingSCF,
    setHomeAnalyzeProgramNineBoxesSpendListFinancingSCF,  
    setHomeAnalyzeProgramNineBoxesSupplierListFinancingSCF,
    setHomeAnalyzeProgramNineBoxesParentListFinancingSCF,

    // API Actions
    deleteFinancingGroup,
    getWaterfallDataForChart,
    getCustomHeaderColumnsTitle,
    deleteHarmonizationGroup,
    getRuleFiltersPossibilities,
    getFinancingGroups,
    getCardsDataVcardOpportunity,
    getProgram,
    getProgramPost,
    deleteProgramUser,
    deleteProgramSpendConfiguration,
    fetchAllPrograms,
    getProgramPotentialsPost,
    deleteProgram,
    getProgramPaymentTerms,
    getProgramDistribution,
    getProgramSpendInfo,
    getProgramTermGroups,
    getSpendsbySupplier,
    nineBoxesDataAPIReadAll,
    patchFinancingGroup,
    patchHarmonizationGroup,
    patchProgramSpendConfiguration,
    getProgramSpendConfiguration,
    patchProgramSpendConfigurations,
    patchProgram,    
    patchProgramRecentlyCreated,
    changeActiveStatus,
    postUpdateHarmonizationgGroups,
    postUpdateFinancingGroups,
    postAnalyzePrograms,
    getValidateName,    
    postProgramSpendConfigurationbyGroups,
    postGenerateCloneProgram,
    postRecalculate,
    postSummarizeValues,
    getStatsAgreed,
    getStatusCardsNumber,getProgramCommodityValues,getProgramCustomColumns,getProgramCustomColumnValues,getProgramExclusionReasons,renameSpendFieldValue,renameCustomColumnValue,
    customDataPointTypes,
    loadCustomDataPointTypes,
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-analyze',
    // Exclude allPrograms from persistence — they must be freshly loaded per SFV.
    // Stale persisted programs cause isProgramSfvConsistent to block valid calls
    // when the persisted selectedProgram doesn't match the stale program list.
    omit: ['allPrograms']
  }
}) 