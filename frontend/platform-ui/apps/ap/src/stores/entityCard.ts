import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { secureStorage } from '@/services/pinia/index'
import { EntityCard } from '@/types'
import { NumberUtils } from '@/utils'
import * as Entity from '@/modules/home/entityCard/api'
import * as AnalyzeAPI from '@/modules/home/analyze/api'

async function getPaymentTermsVolumeHistory(params: any) {
  const { entityUuid, callbackSuccess, callbackError } = params
  if (!entityUuid?.trim()) {
    if (callbackError) callbackError()
    return
  }
  const response = await Entity.getPaymentTermsVolumeHistory(entityUuid)
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

async function getParentCandidates(params: any) {
  const { uuid, type, q, page, callbackSuccess, callbackError } = params;
  const response = await Entity.getParentCandidates(uuid, type, { q, page });

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getBuyersByspendFile(params: any) {
  const { spendFileVersionUUID, callbackSuccess, callbackError } = params;
  const response = await Entity.getBuyersByspendFile(spendFileVersionUUID);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data["hydra:member"])
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getPotentialRequests(params: any) {
  const { spendFileVersionUUID, callbackSuccess, callbackError } = params;
  const response = await Entity.getPotentialRequests(spendFileVersionUUID);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data["hydra:member"])
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function postNewPotentialSupplierRequest(params: any) {
  const { formData, callbackSuccess, callbackError } = params;
  const response = await Entity.postNewPotentialSupplierRequest(formData);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data["hydra:member"])
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

// Types
interface CompanyProviders {
  companies: Array<any>
}

interface CompanyProvidersPagination {
  currentPage: number
  itemsPerPage: number
}

interface SelectedSpendCardObj {
  companyId: string | null
  fromDifferentSupplier: string | null
  spendAlias: number | null
}

async function getCharacteristics(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getCharacteristics(companyId)
  
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

async function getCountryRatingInfo(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getCountryRatingInfo(companyId)
  
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

async function getCurrentAndProposedPaymentTerms(params: any) {
  const { companyId, spendId, programId, callbackSuccess, callbackError } = params
  const response = await Entity.getCurrentAndProposedPaymentTerms(companyId, spendId, programId)
  
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

async function getDataDepth(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getDataDepth(companyId)
  
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

async function getDetailFinancialMetrics(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getDetailFinancialMetrics(companyId)
  
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

async function getEntityCardIndustryCommodity(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityCardIndustryCommodity(companyId)
  
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

async function getEntityFinancingTabbyLevel(params: any) {

  const { companyId, programUUID, configUUID, level, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityFinancingTabbyLevel(companyId, programUUID, configUUID, level)
  
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

async function getEntityCardSpendInformation(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityCardSpendInformation(companyId)
  
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

async function getEntityCardSupplierDescription(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityCardSupplierDescription(companyId)
  
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

async function getEntityCardSupplierDetail(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityCardSupplierDetail(companyId)
  
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

async function getCreditScoreChart(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getCreditScoreChart(companyId)
  
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

async function getEntityCardSupplierOwnership(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityCardSupplierOwnership(companyId)
  
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

async function getIndustryRatingInfo(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getIndustryRatingInfo(companyId)
  
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

async function getLocationForSupplier(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getLocationForSupplier(companyId)
  
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

async function getPaymentTermsOpportunity(params: any) {
  const { configId, companyType, callbackSuccess, callbackError } = params
  const response = await Entity.getPaymentTermsOpportunity(configId, companyType)
  
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

async function getPotentialSavingsbyCompanyProgram(params: any) {
  const { companyId, programId, level, callbackSuccess, callbackError } = params
  const response = await Entity.getPotentialSavingsbyCompanyProgram(companyId, programId, level)
  
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

async function getRecentEntityCards(params: any) {
  const { filters,orderDirection,orderBy, callbackSuccess, callbackError } = params
  const response = await Entity.getRecentEntityCards(filters,orderDirection,orderBy)
  
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

async function getSpendInK(params: any) {
  const { companyId, spendId, programId, callbackSuccess, callbackError } = params
  
  // Validate companyId is not empty
  if (!companyId || companyId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: getSpendInK called with empty companyId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.getSpendInK(companyId, spendId, programId)
  
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

async function getSpendsBySupplier(params: any) {
  const { companyId, programId, callbackSuccess, callbackError } = params
  const response = await Entity.getSpendsBySupplier(companyId, programId)
  
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

async function getSpendsBySupplierWihtoutProgram(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getSpendsBySupplierWihtoutProgram(companyId)
  
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

async function getSupplierSpendInK(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getSupplierSpendInK(companyId)
  
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

async function getUserPrograms(params: any) {
  const { callbackSuccess, callbackError } = params
  const response = await Entity.getUserPrograms()
  
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

async function checkNotesAreRead(params: any) {
  const { uuid, callbackSuccess, callbackError } = params
  
  // Validate uuid is not empty
  if (!uuid || uuid.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: checkNotesAreRead called with empty uuid')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.checkNotesAreRead(uuid)
  
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

async function updatedNotesStatusForEntity(params: any) {
  const { userId, entityUuid, callbackSuccess, callbackError } = params
  
  // Validate userId and entityUuid are not empty
  if (!userId || userId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: updatedNotesStatusForEntity called with empty userId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  if (!entityUuid || entityUuid.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: updatedNotesStatusForEntity called with empty entityUuid')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.updatedNotesStatusForEntity(userId, entityUuid)
  
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

async function getMentionableUsers(params: any) {
  const { supplierId, callbackSuccess, callbackError } = params
  const response = await Entity.getMentionableUsers(supplierId)
  
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

async function getLogsByEntity(params: any) {
  const { supplierId, page, itemsPerPage, callbackSuccess, callbackError } = params
  const response = await Entity.getLogsByEntity(supplierId, page, itemsPerPage)
  
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

async function markLogsAsRead(params: any) {
  const { supplierId, page, itemsPerPage, callbackSuccess, callbackError } = params
  const response = await Entity.markLogsAsRead(supplierId, page, itemsPerPage)
  
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

async function postEntityCardSupplierMentions(params: {
  supplierId: string
  comment: string
  mentionUserIds: string[]
  callbackSuccess?: () => void
  callbackError?: () => void
}) {
  const { supplierId, comment, mentionUserIds, callbackSuccess, callbackError } = params
  const response = await Entity.postEntityCardSupplierMentions(supplierId, comment, mentionUserIds)
  if (response.success) {
    if (callbackSuccess) callbackSuccess()
    return
  }
  if (callbackError) callbackError()
}

async function getUserSupplierPrograms(params: any) {
  const { supplierId, callbackSuccess, callbackError } = params
  
  // Validate supplierId is not empty
  if (!supplierId || supplierId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: getUserSupplierPrograms called with empty supplierId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.getUserSupplierPrograms(supplierId)
  
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

async function deleteEntityCardNote(params: any) {
  const { noteId, callbackSuccess, callbackError } = params
  const response = await Entity.deleteEntityCardNote(noteId)
  
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

async function getSupplierCardNotes(params: any) {
  const { supplierId, callbackSuccess, callbackError } = params
  
  // Validate supplierId is not empty
  if (!supplierId || supplierId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: getSupplierCardNotes called with empty supplierId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.getSupplierCardNotes(supplierId)
  
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data["hydra:member"])
    }
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function postSpendNote(params: any) {
  const { spendId, title, comment, marked, callbackSuccess, callbackError } = params
  const response = await Entity.postSpendNote(spendId, title, comment, marked)
  
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

async function deleteSpendNote(params: any) {
  const { noteId, callbackSuccess, callbackError } = params
  const response = await Entity.deleteSpendNote(noteId)
  
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

async function patchSpendNote(params: any) {
  const { noteId, comment, callbackSuccess, callbackError } = params
  const response = await Entity.patchSpendNote(noteId, comment)
  
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

async function patchSpendUserFeedback(params: any) {
  const { spendId, feedback, programId, callbackSuccess, callbackError } = params
  const response = await Entity.patchSpendUserFeedback(spendId, feedback, programId)
  
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

async function saveAndEditAgrreedTerms(params: any) {
  const { spendsUuid, spendsTerms, all, entity, filters, sourceStatus, level, callbackSuccess, callbackError } = params
  const response = await Entity.saveAndEditAgrreedTerms(spendsUuid, spendsTerms, all, entity, filters, sourceStatus, level)
  
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

async function updateSpendForecastVolumes(params: any) {
  const { payload, callbackSuccess, callbackError } = params
  const response = await Entity.updateSpendForecastVolumes(payload)
  
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

async function deleteAgreedTerms(params: any) {
  const { spendsConfig, all, filters, entity, callbackSuccess, callbackError } = params
  const response = await Entity.deleteAgreedTerms(spendsConfig, all, filters, entity)
  
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

async function postSpendNewTerms(params: any) {
  const { 
    agreedDateOfChange,
    callbackError,
    callbackSuccess,
    cashDiscount,
    effectiveDate,
    financingGroup,
    harmonizationGroup,
    negotiatedPotentialCashFlow,
    nextReviewDate,
    phaseEndDate,
    phaseName,
    phaseNumber,
    planName,
    programEarlyPaymentTermRate,
    programId,
    programName,
    programProposedTerms,
    programTarget,
    spendId,
    termsWithCashDiscount,
    termsWithoutCashDiscount,
    vcardAccepted,
    additionalFeedback
  } = params
  
  // Validate spendId is not empty
  if (!spendId || spendId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: postSpendNewTerms called with empty spendId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.postSpendNewTerms({
    agreedDateOfChange,
    cashDiscount,
    effectiveDate,
    financingGroup,
    harmonizationGroup,
    negotiatedPotentialCashFlow,
    nextReviewDate,
    phaseEndDate,
    phaseName,
    phaseNumber,
    planName,
    programEarlyPaymentTermRate,
    programId,
    programName,
    programProposedTerms,
    programTarget,
    spendId,
    termsWithCashDiscount,
    termsWithoutCashDiscount,
    vcardAccepted,
    additionalFeedback
  })
  
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

async function getSpendNewTerms(params: any) {
  const { resultId, callbackSuccess, callbackError } = params
  
  // Validate resultId is not empty
  if (!resultId || resultId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: getSpendNewTerms called with empty resultId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.getSpendNewTerms(resultId)
  
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

async function patchSpendNewTerms(params: any) {
  const { 
    spendNewTermsId,
    spendId,
    programId,
    termsWithoutCashDiscount,
    termsWithCashDiscount,
    cashDiscount,
    agreedDateOfChange,
    effectiveDate,
    nextReviewDate,
    harmonizationGroup,
    financingGroup,
    feedbackRating,
    labels,
    programName,
    programTarget,
    programProposedTerms,
    programEarlyPaymentTermRate,
    planName,
    phaseName,
    phaseNumber,
    phaseEndDate,
    negotiatedPotentialCashFlow,
    vcardAccepted,
    additionalFeedback,
    callbackSuccess,
    callbackError
  } = params
  
  // Validate spendId is not empty
  if (!spendId || spendId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: patchSpendNewTerms called with empty spendId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.patchSpendNewTerms({
    spendNewTermsId,
    spendId,
    programId,
    termsWithoutCashDiscount,
    termsWithCashDiscount,
    cashDiscount,
    agreedDateOfChange,
    effectiveDate,
    nextReviewDate,
    harmonizationGroup,
    financingGroup,
    feedbackRating,
    labels,
    programName,
    programTarget,
    programProposedTerms,
    programEarlyPaymentTermRate,
    planName,
    phaseName,
    phaseNumber,
    phaseEndDate,
    negotiatedPotentialCashFlow,
    vcardAccepted,
    additionalFeedback
  })
  
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

async function getLastPlan(params: any) {
  const { spendUUID, programUUID, callbackSuccess, callbackError } = params
  const response = await Entity.getLastPlan(spendUUID, programUUID)
  
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

async function postSpendsBySupplierAndButProgram(params: any) {
  const { companyId, programId, callbackSuccess, callbackError } = params
  
  // Validate companyId is not empty
  if (!companyId || companyId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: postSpendsBySupplierAndButProgram called with empty companyId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.postSpendsBySupplierAndButProgram(companyId, programId)
  
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

async function postGetCalculateData(params: any) {
  const {
    additionalFields,
    calculationType,
    callbackError,
    callbackSuccess,
    changeInTerms,
    configUUID,
    contractualPaymentTerms,
    currency,
    currencyRate,
    level,
    priceChange,
    programUUID,
    spendVolume,
    supplierTaxRate,
    supplierUUID,
    supplierWacc,
    type
  } = params

  const response = await Entity.postGetCalculateData({
    additionalFields,
    calculationType,
    changeInTerms,
    configUUID,
    contractualPaymentTerms,
    currency,
    currencyRate,
    level,
    priceChange,
    programUUID,
    spendVolume,
    supplierTaxRate,
    supplierUUID,
    supplierWacc,
    type
  })
  
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

async function calculatorGetInitialData(params: any) {
  const { supplierUUID, configUUID, programUUID, level, callbackSuccess, callbackError } = params
  const response = await Entity.calculatorGetInitialDataAPIRead({ supplierUUID, configUUID, programUUID, level })
  
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

async function calculatorSaveData(params: any) {
  const { 
    supplierUUID, 
    configUUID, 
    programUUID, 
    level,
    calculatorValues,
    callbackSuccess, 
    callbackError 
  } = params
  
  const response = await Entity.calculatorSaveDataAPIUpdate({ supplierUUID, configUUID, programUUID, level, calculatorValues })
  
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

async function calculatorSaveNewScenario(
  params: any
) {
  const {
    supplierUUID, configUUID, programUUID, level, name, callbackSuccess, callbackError  }: any = params;

  const response = Entity.calculatorSaveNewScenario({supplierUUID, configUUID, programUUID, level, name, calculatorValues: params.calculatorValues});

  await response.then(response => {
    if (response.success && callbackSuccess) {
      callbackSuccess(response.data);
      
      return;
    }

    if (callbackError) {
      callbackError(response);
    }
  })
}

async function calculatorUpdateScenario(    
  params: any
) {
  const {
    scenarioId, supplierUUID, configUUID, programUUID, level, name, callbackSuccess, callbackError  }: any = params;

  const response = Entity.calculatorUpdateScenario({scenarioId, supplierUUID, configUUID, programUUID, level, name, calculatorValues: params.calculatorValues});

  await response.then(response => {
    if (response.success && callbackSuccess) {
      callbackSuccess(response.data);
      
      return;
    }

    if (callbackError) {
      callbackError(response);
    }
  })
}

async function getScenariosByConfig(props: any) {
  const { companyId, level, callbackSuccess, callbackError }: any = props;
  const response = Entity.getScenariosByConfig(companyId, level);
  await response.then(response => {
    if (response && response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data);
      }
      return;
    }

    if (callbackError) {
      callbackError();
    }
  });
}

async function deleteScenario(props: any) {
  const { scenarioId, callbackSuccess, callbackError }: any = props;
  const response = Entity.deleteScenario(scenarioId);
  await response.then(response => {
    if (response.success) {
      if (callbackSuccess) {
        callbackSuccess(response.data);
      }
      return;
    }

    if (callbackError) {
      callbackError();
    }
  });
}

async function getEntityOrSpendFileDetails(params: any) {
  const { id, type, filters, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityOrSpendFileDetails({ id, type, filters })
  
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

async function postAddNewRecentEntityCard(params: any) {
  const { companyId, targetSpendFileVersionUuid, callbackSuccess, callbackError } = params
  
  // Validate companyId is not empty
  if (!companyId || companyId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: postAddNewRecentEntityCard called with empty companyId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.postAddNewRecentEntityCard(companyId, targetSpendFileVersionUuid)
  
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

async function postDeleteNewRecentEntityCard(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  
  // Validate companyId is not empty
  if (!companyId || companyId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: postDeleteNewRecentEntityCard called with empty companyId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.postDeleteNewRecentEntityCard(companyId)
  
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

async function postElasticSearchSuppliers(params: any) {
  const { search, from, orderBy, orderDirection, filters, signal, callbackSuccess, callbackError } = params
  const response = await Entity.postElasticSearchSuppliers(search, from, orderBy, orderDirection, filters, signal)

  if (response.skipped) return

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

async function getSupplierTreeFamily(params: any) {
  const { companyId, programId, globalFilter, spendFileVersion, callbackSuccess, callbackError } = params
  
  // Validate companyId is not empty
  if (!companyId || companyId.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: getSupplierTreeFamily called with empty companyId')
    if (callbackError) {
      callbackError()
    }
    return
  }
  
  const response = await Entity.getSupplierTreeFamily(companyId, programId, globalFilter, spendFileVersion)
  
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

async function getSupplierESG(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getSupplierESG(companyId)
  
  if (response && response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data)
    }
    return
  }

  if (callbackError) {
    callbackError()
  }
}

async function getEntityCardProgress(params: any) {
  const { companyId, callbackSuccess, callbackError } = params
  const response = await Entity.getEntityCardProgress(companyId)
  
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

async function postReqDataChanges(params: any) {
  const { companyId, userMessage, spendFileVersion, callbackSuccess, callbackError } = params
  const response = await Entity.postReqDataChanges(companyId, userMessage, spendFileVersion)
  
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

async function postStatusStrategybyEntity(params: any) {
  const { strategy, companyId, programId, spendUUID, status, callbackSuccess, callbackError } = params      
  const response = await Entity.postStatusStrategybyEntity(strategy, companyId, programId, spendUUID, status)
  
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

async function getAdaBotAll(params: any) {
  const { configId, companyId, programId, cTarget, level, callbackSuccess, callbackError } = params
  const response = await Entity.getFullAdaBot(configId, companyId, programId, cTarget, level)
  
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

async function paymentTermsTargetAPIUpdate(params: any) {
  const { filters, changed, uuids, level, all, entity, entityType, callbackSuccess, callbackError } = params
  const response = await AnalyzeAPI.spendProgramConfigurationAPIUpdate({
    filters,
    level,
    changed,
    uuids,
    all,
    entity,
    entityType
  })
  
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

async function paymentTermStrategyUiSetup(params: any) {
  const { callbackSuccess, callbackError, ...data } = params
  const response = await Entity.paymentTermStrategyUiSetup(data)

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

async function allSpendNewTerms(params: { spendsTerms: any[]; callbackSuccess: any; callbackError: any }) {
  // Check if there are spendsTerms
  if (params.spendsTerms.length === 0) {
    return
  }

  const promises = []
  for (let i = 0; i < params.spendsTerms.length; i++) {
    // Validate spend new terms id is defined
    if (params.spendsTerms[i].spendNewTermsId !== null) {
      // Patch - Update spend new terms
      const promise = Entity.patchSpendNewTerms(params.spendsTerms[i])
      promises.push(promise)
    }
    // Post - Create new spend new terms
    else {
      const promise = Entity.postSpendNewTerms(params.spendsTerms[i])
      promises.push(promise)
    }
  }

  // Wait for all promises
  Promise.all(promises).then(responses => {
    for (let response of responses) {
      // Error
      if (!response.success) {
        if (params.callbackError) params.callbackError(responses)
        return
      }
    }
    // Success
    if (params.callbackSuccess) params.callbackSuccess()
  })
}

async function getNews(params: any) {
  const { moduleName, entityName, parentName, lang, max, page, callbackSuccess, callbackError } = params
  
  // Validate moduleName is provided
  if (!moduleName || moduleName.trim() === '') {
    if (import.meta.env.DEV) console.error('** Error: getNews called without moduleName')
    if (callbackError) {
      callbackError({ error: { message: 'moduleName is required' } })
    }
    return
  }
  
  const response = await Entity.searchNews(moduleName, entityName, parentName, lang, max, page)
  
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

export const useEntityCardStore = defineStore('entityCard', () => {
  // State
  const currentTab = ref<string>('cards')
  const appliedFilterOptions = ref<Array<any> | null>(null)
  const approachBoolean = ref<boolean>(false)
  const companies = ref<CompanyProviders | null>(null)
  const companyProvidersPagination = ref<CompanyProvidersPagination | null>(null)
  const entityType = ref<string | null>(null)
  const higherZIndexForEntityModal = ref<boolean>(false)
  const isModalShowing = ref<boolean>(false)
  const optionName = ref<string>('')
  const orderBy = ref<string>('')
  const orderDirection = ref<string>('')
  const querySearch = ref<string | null>(null)
  const refreshTabsValue = ref<number>(0)
  const resultsGridColumns = ref<Array<any> | null>(null)
  const searchQuery = ref<string>('')
  const selectedEntity = ref<EntityCard.SelectedEntityObj>({
    companyId: '',
    domain: '',
    spendVolume: null,
    country: '',
    negotiationStatus: null
  })
  const selectedEntityTrackingNumber = ref<number>(NumberUtils.getRandomInt())
  const refreshAfterUpdateStatusKanban = ref<number>(NumberUtils.getRandomInt())

  // US-18713: bumped ONLY when a Target or an Agreed term is saved successfully.
  // The entity card tabs live inside a <KeepAlive>, so the SCF tab is never remounted
  // when the user switches back to it and keeps showing the figures it fetched the
  // first time. This token is the "your figures are stale" signal it watches.
  // Deliberately separate from selectedEntityTrackingNumber, which also fires on
  // negotiation-status and grid group changes (AC-04: no refetch without a change).
  const scfRefreshToken = ref<number>(0)


  const selectedProgram = ref<string | null>(null)
  const selectedSpendCardObj = ref<SelectedSpendCardObj>({
    companyId: null,
    fromDifferentSupplier: null,
    spendAlias: null
  })
  const selectedTabIndex = ref<number>(0)
  const selectedTabIndexSpend = ref<{ selected: number }>({ selected: 0 })
  const entityListNegotiation = ref<Array<any> | null>(null)
  const entityListforecast = ref<Array<any> | null>(null)
  const isParentNoteBannerDismissed = ref<boolean>(false)

  // Plain (non-reactive) callback registry for the IA assistant exit signal.
  // Deliberately NOT implemented as reactive state: a ref/watch pair races
  // against the same Vue flush that unmounts the listening component (e.g.
  // when the modal closes, or when EntityCardOverview forces a remount on
  // entity change), and that race can be lost. Direct synchronous callbacks
  // are called immediately, before any subsequent render/unmount can happen.
  const assistantExitListeners = new Set<() => void>()

  // Getters
  const getEntityListNegotiation = computed(() => entityListNegotiation.value)
  const getEntityListforecast = computed(() => entityListforecast.value)
  const getRefreshTabsValue = computed(() => refreshTabsValue.value)
  const getEntityType = computed(() => entityType.value)
  const getHigherZIndexForEntityModal = computed(() => higherZIndexForEntityModal.value)
  const getSelectedTabIndexSpend = computed(() => selectedTabIndexSpend.value)
  const getSelectedSpendCardObj = computed(() => selectedSpendCardObj.value)
  const getIsModalEntityShowing = computed(() => isModalShowing.value)
  const getSelectedEntity = computed(() => selectedEntity.value)
  const getSelectedEntityTrackingNumber = computed(() => selectedEntityTrackingNumber.value)
  const getRefreshAfterUpdateStatusKanban = computed(() => refreshAfterUpdateStatusKanban.value)
  const getScfRefreshToken = computed(() => scfRefreshToken.value)

  const getQuerySearch = computed(() => querySearch.value)
  const getCompanyProvidersCurrentPage = computed(() => {
    return companyProvidersPagination.value &&
      companyProvidersPagination.value.currentPage !== 1
      ? companyProvidersPagination.value.currentPage
      : 1
  })
  const getCompanyProvidersItemsPerPage = computed(() => {
    return companyProvidersPagination.value &&
      companyProvidersPagination.value.itemsPerPage !== 50
      ? companyProvidersPagination.value.itemsPerPage
      : 50
  })
  const getApproachBoolean = computed(() => approachBoolean.value)
  const getSelectedProgram = computed(() => selectedProgram.value)
  const getResultsGridColumns = computed(() => resultsGridColumns.value)
  const getAppliedFilter = computed(() => appliedFilterOptions.value)
  const getOrderBy = computed(() => orderBy.value)
  const getOrderDirection = computed(() => orderDirection.value)
  const getsearchQuery = computed(() => searchQuery.value)
  const getOptionName = computed(() => optionName.value)
  const getSelectedTabIndex = computed(() => selectedTabIndex.value)
  const getIsParentNoteBannerDismissed = computed(() => isParentNoteBannerDismissed.value)

  // Actions (Mutations)
  function setEntityListNegotiation(list: any) {
    entityListNegotiation.value = list
  }

  function setEntityListforecast(list: any) {
    entityListforecast.value = list
  }

  function setRefreshTabsValue(refreshTabsValueValue: number) {
    refreshTabsValue.value = refreshTabsValueValue
  }

  function setEntityType(entityTypeValue: string | null) {
    entityType.value = entityTypeValue
  }

  function setHigherZIndexForEntityModal(higherZIndexForEntityModalValue: boolean) {
    higherZIndexForEntityModal.value = higherZIndexForEntityModalValue
  }

  function setSelectedSpendCardObj(selectedSpendCardObjValue: SelectedSpendCardObj) {
    selectedSpendCardObj.value = selectedSpendCardObjValue
  }

  function setIsModalEntityShowing(isModalShowingValue: boolean) {
    isModalShowing.value = isModalShowingValue

    if (!isModalShowingValue) {
      triggerAssistantExit()
    }
  }

  function setIsParentNoteBannerDismissed(value: boolean) {
    isParentNoteBannerDismissed.value = value
  }

  function onAssistantExit(callback: () => void) {
    assistantExitListeners.add(callback)
    return () => assistantExitListeners.delete(callback)
  }

  function triggerAssistantExit() {
    assistantExitListeners.forEach(callback => callback())
  }

  function setSelectedEntity(selectedEntityValue: EntityCard.SelectedEntityObj | null) {
    
    // If null, reset the state
    if (selectedEntityValue === null) {
      selectedEntity.value = {
        companyId: '',
        domain: '',
        spendVolume: null,
        country: '',
        negotiationStatus: '',
        companyTypeForTheme: 'supplier'
      }
      entityType.value = 'supplier'
      isModalShowing.value = false
      isParentNoteBannerDismissed.value = false
      triggerAssistantExit()
      return
    }

    // Validate that companyId is not empty
    if (!selectedEntityValue.companyId || selectedEntityValue.companyId.trim() === '') {
      if (import.meta.env.DEV) console.error('** Error: setSelectedEntity called with empty companyId')
      return
    }

    // Reset banner dismissed state for new entity
    isParentNoteBannerDismissed.value = false

    // Update entity state
    selectedEntity.value = selectedEntityValue
    
    // Update entity type if provided
    if (selectedEntityValue.companyTypeForTheme) {
      entityType.value = selectedEntityValue.companyTypeForTheme
    }
    
    // Ensure modal stays open when changing entity
    if (isModalShowing.value) {
      isModalShowing.value = true
    }
  }

  function setSelectedEntityTrackingNumber(selectedEntityTrackingNumberValue: number) {
    selectedEntityTrackingNumber.value = selectedEntityTrackingNumberValue
  }

  function setRefreshAfterUpdateStatusKanban(refreshAfterUpdateStatusKanbanValue: number) {
    refreshAfterUpdateStatusKanban.value = refreshAfterUpdateStatusKanbanValue
  }

  // US-18713 AC-01/AC-02: call this from the SUCCESS callback of a Target/Agreed save
  // only, never from the error path (AC-05).
  function bumpScfRefreshToken() {
    scfRefreshToken.value++
  }

  function setInitialState() {
    companies.value = null
    companyProvidersPagination.value = null
  }

  function setCompanyProvidersPagination(companyProvidersPaginationValue: CompanyProvidersPagination) {
    companyProvidersPagination.value = companyProvidersPaginationValue
  }

  function setApproachBoolean() {
    approachBoolean.value = !approachBoolean.value
  }

  function setSelectedProgram(selectedProgramValue: string | null) {
    selectedProgram.value = selectedProgramValue
  }

  function setQuerySearch(querySearchValue: any) {
    querySearch.value = querySearchValue
  }

  function setResultsGridColumns(resultsGridColumnsValue: Array<any> | null) {
    resultsGridColumns.value = resultsGridColumnsValue
  }

  function setAppliedFilter(filters: any) {
    appliedFilterOptions.value = filters
  }

  function setOrderBy(orderByValue: any) {
    orderBy.value = orderByValue
  }

  function setOrderDirection(orderDirectionValue: any) {
    orderDirection.value = orderDirectionValue
  }

  function setSearchQuery(searchQueryValue: any) {
    searchQuery.value = searchQueryValue
  }

  function setOptionName(optionNameValue: any) {
    optionName.value = optionNameValue
  }

  function setSelectedTabIndex(selectedTabIndexValue: number) {
    selectedTabIndex.value = selectedTabIndexValue
  }

  function setSelectedTabIndexSpend(selectedTabIndexSpendValue: number) {
    selectedTabIndexSpend.value.selected = selectedTabIndexSpendValue
  }

  function resetEntityCardState() {
    selectedEntity.value = {
      companyId: '',
      domain: '',
      spendVolume: null,
      country: '',
      negotiationStatus: '',
      companyTypeForTheme: 'supplier'
    }
    entityType.value = 'supplier'
    isModalShowing.value = false
    isParentNoteBannerDismissed.value = false
    selectedTabIndex.value = 0
    selectedTabIndexSpend.value = { selected: 0 }
    triggerAssistantExit()
  }

  function setBatchUpdate(updates: {
    setSelectedProgram?: string | null
    setAppliedFilter?: Array<any> | null
    setQuerySearch?: string | null
  }) {
    if (updates.setSelectedProgram !== undefined) {
      selectedProgram.value = updates.setSelectedProgram
    }
    if (updates.setAppliedFilter !== undefined) {
      appliedFilterOptions.value = updates.setAppliedFilter
    }
    if (updates.setQuerySearch !== undefined) {
      querySearch.value = updates.setQuerySearch
    }
  }

  // API Actions

  
  

  
  
  
  
  
  
  

  return {
    // State
    appliedFilterOptions,
    approachBoolean,
    companies,
    companyProvidersPagination,
    currentTab,
    entityType,
    higherZIndexForEntityModal,
    isModalShowing,
    optionName,
    orderBy,
    orderDirection,
    querySearch,
    refreshTabsValue,
    resultsGridColumns,
    searchQuery,
    selectedEntity,
    selectedEntityTrackingNumber,
    selectedProgram,
    selectedSpendCardObj,
    selectedTabIndex,
    selectedTabIndexSpend,
    entityListNegotiation,
    entityListforecast,
    isParentNoteBannerDismissed,
    refreshAfterUpdateStatusKanban,
    scfRefreshToken,

    // Getters
    getEntityListNegotiation,
    getEntityListforecast,
    getRefreshTabsValue,
    getEntityType,
    getHigherZIndexForEntityModal,
    getSelectedTabIndexSpend,
    getSelectedSpendCardObj,
    getIsModalEntityShowing,
    getSelectedEntity,
    getSelectedEntityTrackingNumber,
    getQuerySearch,
    getCompanyProvidersCurrentPage,
    getCompanyProvidersItemsPerPage,
    getApproachBoolean,
    getSelectedProgram,
    getResultsGridColumns,
    getAppliedFilter,
    getOrderBy,
    getOrderDirection,
    getsearchQuery,
    getOptionName,
    getSelectedTabIndex,
    getIsParentNoteBannerDismissed,
    getRefreshAfterUpdateStatusKanban,
    getScfRefreshToken,

    // Actions (Mutations)
    setEntityListNegotiation,
    setEntityListforecast,
    setRefreshTabsValue,
    setEntityType,
    setHigherZIndexForEntityModal,
    setSelectedSpendCardObj,
    setIsModalEntityShowing,
    setIsParentNoteBannerDismissed,
    onAssistantExit,
    triggerAssistantExit,
    setSelectedEntity,
    setSelectedEntityTrackingNumber,
    bumpScfRefreshToken,
    setInitialState,
    setCompanyProvidersPagination,
    setApproachBoolean,
    setSelectedProgram,
    setQuerySearch,
    setResultsGridColumns,
    setAppliedFilter,
    setOrderBy,
    setOrderDirection,
    setSearchQuery,
    setOptionName,
    setSelectedTabIndex,
    setSelectedTabIndexSpend,
    resetEntityCardState,
    setBatchUpdate,
    setRefreshAfterUpdateStatusKanban,

    // API Actions
    getCharacteristics,
    getCountryRatingInfo,
    getCurrentAndProposedPaymentTerms,
    getDataDepth,
    getDetailFinancialMetrics,
    getEntityCardIndustryCommodity,
    getEntityCardSpendInformation,
    getEntityCardSupplierDescription,
    getEntityCardSupplierDetail,
    getCreditScoreChart,
    getEntityCardSupplierOwnership,
    getIndustryRatingInfo,
    getLocationForSupplier,
    getPaymentTermsOpportunity,
    getPaymentTermsVolumeHistory,
    getEntityFinancingTabbyLevel,
    getPotentialSavingsbyCompanyProgram,
    getRecentEntityCards,
    getSpendInK,
    getSpendsBySupplier,
    getSpendsBySupplierWihtoutProgram,
    getSupplierSpendInK,
    getUserPrograms,
    getLogsByEntity,
    getMentionableUsers,
    postEntityCardSupplierMentions,
    markLogsAsRead,
    updateSpendForecastVolumes,
    paymentTermStrategyUiSetup,
    getBuyersByspendFile,
    postNewPotentialSupplierRequest,
    getPotentialRequests,

    //-

    checkNotesAreRead,
    updatedNotesStatusForEntity,
    getUserSupplierPrograms,
    deleteEntityCardNote,
    getSupplierCardNotes,
    postSpendNote,
    deleteSpendNote,
    patchSpendNote,
    patchSpendUserFeedback,
    getSpendNewTerms,
    saveAndEditAgrreedTerms,
    deleteAgreedTerms,
    postSpendNewTerms,
    patchSpendNewTerms,
    getLastPlan,
    postSpendsBySupplierAndButProgram,
    postGetCalculateData,
    calculatorGetInitialData,
    calculatorSaveData,
    getEntityOrSpendFileDetails,
    postAddNewRecentEntityCard,
    postDeleteNewRecentEntityCard,
    postElasticSearchSuppliers,
    getSupplierTreeFamily,
    getSupplierESG,
    getEntityCardProgress,
    postReqDataChanges,
    postStatusStrategybyEntity,
    getAdaBotAll,
    paymentTermsTargetAPIUpdate,
    allSpendNewTerms,
    calculatorSaveNewScenario,
    calculatorUpdateScenario,
    getScenariosByConfig,
    deleteScenario,
    getNews,
    getParentCandidates,
  }
}, {
  persist: {
    storage: secureStorage,
    key: 'ada-entityCard'
  }
}) 
