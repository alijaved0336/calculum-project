import { ApiResponse, giveAnswer } from '@/services/api/response'
import { EntityType } from '@/types';
import { removeIRI, StringUtils } from '@/utils'
import { SpendNewTerms } from '../types';
import axios from '@/utils/axios';
import { useAppStore } from '@/stores/app'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { convertFiltersToREST } from '@/utils/FormatData'
import { getBaseApi } from '@/utils/getBaseApi';
import type { CommentSegment } from '@/utils/ContentEditableUtils';
import { spendFileVersion } from '@ada/design-system/data/globalColumns';


/**
 * WI#17587: the active global filter serialized as the REST `globalFilter` payload
 * (same value the Analyze grid sends). BE uses it to scope the entity card, its internal
 * spend grid, and the supplier list/popover to the filtered dataset. Returns null when
 * no filter is active, in which case BE serves the full dataset.
 */
function activeGlobalFilter(): string | null {
  return convertFiltersToREST(useGlobalFiltersStore().getFiltersApplied)
}

export async function deleteEntityCardNote(
  noteId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + noteId

  try {
    response = await axios.delete(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'DELETE Entity Card Note')
}

export async function getCharacteristics(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/characteristics'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Characteristics')
}

export async function getCountryRatingInfo(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/country-rating'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Country Rating Info')
}

export async function getCurrentAndProposedPaymentTerms(
  companyId: string,
  spendId: string,
  programId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/current-proposed-terms/' + (spendId ?? 'summarizedBy') + (programId ? ('/' + removeIRI(programId)) : '')

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Current And Proposed Payment Terms')
}

export async function getDataDepth(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/data-depth-rating'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Data Depth')
}

export async function getDetailFinancialMetrics(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/detail-financial-metrics'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Detail Financial Metrics')
}

export async function getEntityCardIndustryCommodity(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/industry-commodity'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Entity Card Industry Commodity')
}


export async function getEntityFinancingTabbyLevel(  
  companyId: string,
  programUUID: string,
  configUUID: string,
  level: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/calculate-financing-tab'

  const params = {
    currencyRate: useAppStore().getCurrencyAmount,
    currency: useAppStore().getCurrencyTo,
    programUUID: removeIRI(programUUID),
    configUUID: removeIRI(configUUID),
    level,
    globalFilter: activeGlobalFilter()
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Entity Card Financing Tab by Level')
}




export async function getEntityCardSpendInformation(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/spend-information'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Entity Card Spend Information')
}

export async function getEntityCardSupplierDescription(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/description'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Entity Card Supplier Description')
}

export async function getEntityCardSupplierDetail(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/detail'

  try {
    // Scope the Company Details "Buying Entities" to the active global filter (null when none active).
    response = await axios.get(url, {
      params: { globalFilter: activeGlobalFilter() }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Entity Card Supplier Detail')
}

export async function getCreditScoreChart(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/credit-score'
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Entity Card Supplier Detail')
}

export async function getEntityCardSupplierOwnership(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/ownership'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Entity Card Supplier Ownership')
}

export async function getIndustryRatingInfo(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/industry-rating'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Industry Rating Info')
}

export async function getLocationForSupplier(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/spend_parsed_companies/' + removeIRI(companyId)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Location for Supplier')
}

export async function getPaymentTermsOpportunity(
  configId: string,
  companyType: string
): Promise<ApiResponse> {
  let response = null;

  // Validate
  if (StringUtils.isNullUndefinedOrEmpty(configId)) {
    if (import.meta.env.DEV) {
      console.error(
        "** (getPaymentTermsOpportunity) configId is null, undefined or empty. configId: ", 
        configId
      );
    }

    return giveAnswer(response, 'ConfigId is missing')
  }

  if (StringUtils.isNullUndefinedOrEmpty(companyType)) {
    if (import.meta.env.DEV) {
      console.error(
        "** (getPaymentTermsOpportunity) companyType is null, undefined or empty. companyType: ", 
        companyType
      );
    }

    return giveAnswer(response, 'CompanyType is missing')
  }

  const url = getBaseApi() + '/api/entity-card/spend-program-configuration/' + removeIRI(configId) + '/chart/payment-terms-opportunity/'+companyType

  const params = { currencyRate: useAppStore().getCurrencyAmount };
  
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'GET Payment Terms Opportunity')
}

/**
 * Fetches payment terms volume history for the BarLineChart.
 * Route: GET api/entity-card/entity/{uuid}/payment-terms-volume-history
 */
export async function getPaymentTermsVolumeHistory(
  entityUuid: string
): Promise<ApiResponse> {
  if (StringUtils.isNullUndefinedOrEmpty(entityUuid)) {
    return giveAnswer(null, 'Entity UUID is missing for payment-terms-volume-history')
  }
  const url =
    getBaseApi() +
    '/api/entity-card/entity/' +
    removeIRI(entityUuid) +
    '/payment-terms-volume-history'
  let response = null
  try {
    // Bug#18535: BE filters the "current" point of the history by the active filter.
    // The historical rows are past agreements and stay unfiltered by design.
    response = await axios.get(url, {
      params: { globalFilter: activeGlobalFilter() }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Payment Terms Volume History')
}

export async function getPotentialSavingsbyCompanyProgram(
  companyId: string,
  programId: string,
  level: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/cashflow-or-savings-overview/' + removeIRI(programId)
  // Bug#18535: the equivalent discount is computed from the entity's spend volume, so it
  // must be scoped to the active filter like the rest of the card.
  const params = { currencyRate: useAppStore().getCurrencyAmount, level, globalFilter: activeGlobalFilter() };
  try {
    response = await axios.post(url, params, {

    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Potential Cash Flow')
}


export async function getRecentEntityCards(filters: any | null, orderDirection: string, orderBy: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/get-recent-entity-cards'

  const params = {
    filters,
    orderDirection,
    orderBy
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Recent Entity Cards')
}

/**
 * Retrieves spends by supplier for a given company and program.
 * Route: /api/entity-card/entity/{companyId}/{programId}/spends
 *
 * @param {string} companyId - The ID of the company
 * @param {string} programId - The ID of the program
 * @return {Promise<ApiResponse>} The response from the API call
 */
export async function getSpendsBySupplier(
  companyId: string,
  programId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + (programId ? ('/' + removeIRI(programId)) : '') + '/spends'

  try {
    response = await axios.get(url, {
      params: { globalFilter: activeGlobalFilter() }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Spend by Supplier')
}


export async function getSpendsBySupplierWihtoutProgram(
  companyId: string,
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/' + removeIRI(companyId) + '/spends'

  try {
    response = await axios.get(url, {
      params: { globalFilter: activeGlobalFilter() }
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Spend by Supplier')
}

/**
 * Get Entity or Spend File Details
 * Route: /api/entity-card/details/{uuid}/{type}
*/
export async function getEntityOrSpendFileDetails(params: {
  id: string,
  type: "spend" | "supplier" | "parent" | "spendFileVersion",
  filters: any
}): Promise<ApiResponse> {
  const { id, type, filters } = params

  const url = getBaseApi() + '/api/entity-card/details/' + id + '/' + type
  
  const param = {
    filters
  }

  let response = null

  try {
    response = await axios.post(url, param,  {
      
    })
  } catch (e: any) {
    response = e.response
  }
  
  return giveAnswer(response, 'GET Spend Details')
}

export async function getSpendInK(
  companyId: string,
  spendId: string,
  programId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/spend-negotiation/' + removeIRI(spendId) + '/' + removeIRI(programId)
  const params = { currencyRate: useAppStore().getCurrencyAmount };
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Spend In K')
}

export async function getSupplierSpendInK(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/chart/spend-thousands-overview'
  // Bug#18535: realValue / forecastVolume of this chart are the entity's Spend Volume.
  // BE keeps the whole-file total as the chart's 100% reference on purpose.
  const params = { currencyRate: useAppStore().getCurrencyAmount, globalFilter: activeGlobalFilter() };
  try {
    response = await axios.post(url, params, {

    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Supplier Spend In K')
}

export async function getUserPrograms(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/user-programs'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET User programs')
}



/**
 * check if notes are read
 */

export async function checkNotesAreRead(uuid:string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/entity-card/entity/${removeIRI(uuid)}/note-details`
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET STATUS of Notes inside Entity Note Modal')
}

/**
 * updates the status of the notes on entity level
 * @param userId 
 * @returns 
 */

export async function updatedNotesStatusForEntity(userId:string, entityUuid: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/users/${removeIRI(userId)}/notes-notification-read`
  const params = {
    entityUuid: removeIRI(entityUuid)
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Update Status of Read Notes inside Entity Note Modal')
}

export async function getMentionableUsers(supplierId: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() +  '/api/entity-activity-logs/' + removeIRI(supplierId) + '/mentionable-users'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Mentionable Users')
}

export async function postEntityCardSupplierMentions(
  supplierId: string,
  comment: string,
  mentionUserIds: string[]
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity_card_supplier_mentions'
  const params = {
    supplier: '/api/spend_parsed_companies/' + removeIRI(supplierId),
    comment,
    mentionUserIds
  }
  try {
    response = await axios.post(url, params, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Entity Card Supplier Mentions')
}



export async function getLogsByEntity(supplierId: string, page: number = 1, itemsPerPage: number = 20): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() +  '/api/entity-activity-logs/' + removeIRI(supplierId) + '/timeline?page=' + page + '&itemsPerPage=' + itemsPerPage

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Logs by Entity')
}


export async function markLogsAsRead(supplierId: string, page: number = 1, itemsPerPage: number = 20): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() +  '/api/entity-activity-logs/' + removeIRI(supplierId) + '/checkread?page=' + page + '&itemsPerPage=' + itemsPerPage

  const params = {}

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'MARK Logs as Read')
}


export async function getUserSupplierPrograms(supplierId: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/supplier/' + removeIRI(supplierId) + '/programs'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET User programs')
}

// **************************** SUPPLIER ******************************************

// Company New Terms


export async function patchSupplierNewTerms(
  companyNewTermsId: string,
  companyId: string,
  programId: string,
  termsWithoutCashDiscount: number,
  termsWithCashDiscount: number,
  cashDiscount: number,
  agreedDateOfChange: string,
  nextReviewDate: string,
  harmonizationGroup: string | null,
  financingGroup: string | null
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + companyNewTermsId
  const params = {
    supplier: '/api/spend_parsed_companies/' + removeIRI(companyId),
    program: '/api/analyze/programs/' + removeIRI(programId),
    harmonizationGroup: harmonizationGroup,
    financingGroup: financingGroup,
    termsWithoutCashDiscount: termsWithoutCashDiscount,
    termsWithCashDiscount: termsWithCashDiscount,
    cashDiscount: cashDiscount,
    agreedDateOfChange: agreedDateOfChange,
    nextReviewDate: nextReviewDate
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
  return giveAnswer(response, 'PATCH EntityCard-Supplier New Terms')
}


// Company Card Note

export async function getSupplierCardNotes(
  companyId: string
  // programId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity_card_supplier_notes?' + 'supplier.uuid=' + removeIRI(companyId)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET EntityCard-supplier Card Notes')
}

export async function patchSupplierCardNote(
  noteId: string,
  title: string,
  comment: string,
  marked: boolean
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + noteId
  const params = {
    title: title,
    comment: comment,
    marked: marked
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
  return giveAnswer(response, 'PATCH EntityCard-Supplier Card Note')
}


// Company Feedback

export async function patchSupplierUserFeedback(
  feedbackId: string,
  feedbackRating: number | null,
  labels: Array<any>
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + feedbackId
  const params = {
    feedbackRating,
    labels
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
  return giveAnswer(response, 'PATCH EntityCard-Supplier Feedback')
}


// **************************** SPENDS ******************************************
// Spend New Terms

export async function getSpendNewTerms(
  resultId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity_card_spend_new_terms/' + removeIRI(resultId)

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET EntityCard-Spend new terms')
}

export async function patchSpendNewTerms({
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
}: SpendNewTerms): Promise<ApiResponse> {
  let response = null;

  try {
    // Check if spendNewTermsId is a valid
    if (!spendNewTermsId) {
      throw new Error("Invalid spendNewTermsId");
    }

    // If spendNewTermsId contains the IRI, remove it
    if (spendNewTermsId.includes("/")) {
      spendNewTermsId = removeIRI(spendNewTermsId);
    }

    // Check if spendNewTermsId is a valid
    if (!spendId) {
      throw new Error("Invalid spendId");
    }

    // If spendId contains the IRI, remove it
    if (spendId.includes("/")) {
      spendId = removeIRI(spendId);
    }

    // Check if programId is defined
    if (!programId) {
      throw new Error("Invalid programId");
    }

    // If programId contains the IRI, remove it
    if (programId.includes("/")) {
      programId = removeIRI(programId);
    }
  } catch (e: any) {
    response = e.response;
    
    return giveAnswer(response, "PATCH EntityCard-Spend New Terms");
  }

  const url =
    getBaseApi() + "/api/entity_card_spend_new_terms/" + spendNewTermsId;

  const params = {
    spend: "/api/spends/" + spendId,
    program: "/api/analyze/programs/" + programId,
    harmonizationGroup,
    financingGroup,
    termsWithoutCashDiscount,
    termsWithCashDiscount,
    cashDiscount,
    agreedDateOfChange,
    effectiveDate,
    nextReviewDate,
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
    additionalFeedback
  };

  try {
    response = await axios.patch(url, params, {
      headers: {
        
        "Content-Type": "application/merge-patch+json"
      }
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "PATCH EntityCard-Spend New Terms");
}



/**
 * save and edit agreed terms
 * @param spendsConfig : Array of uuids
 * @param spendsTerms spendTerms object which contains all of the required values
 * @returns 
 */
export async function saveAndEditAgrreedTerms(spendsUuid: Array<any>, spendsTerms: any, all: boolean, entity: string, filters: any, sourceStatus?: number, level?: string): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + "/api/entity-card-results/create-updated-agree-terms-configs"
  let params = {
    spendsUuid: spendsUuid,
    values: spendsTerms,
    all,
    entity,    
    filters,
    sourceStatus,
    level
  }
  try {
    response = await axios.post(url, params, {

    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, "add or edit EntityCard-Spend Agreed Terms")
}

/**
 * WI#18553: per-field defaults for the Agreed Payment Terms modal, computed server-side from the
 * existing agreed values of the current grid selection (same selection contract as the save:
 * bounded spendsUuid OR all + filters + entity). Returns, per field, { value, mixed }.
 */
export async function getAgreedTermsDefaults(spendsUuid: Array<any>, all: boolean, entity: string, filters: any): Promise<ApiResponse> {
  let response = null

  const url = getBaseApi() + "/api/entity-card-results/agree-terms-defaults"
  let params = {
    spendsUuid: spendsUuid,
    all,
    entity,
    filters
  }
  try {
    response = await axios.post(url, params, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, "get EntityCard-Spend Agreed Terms defaults")
}



export async function updateSpendForecastVolumes(payload: any): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + "/api/analyze/update-spend-forecast-volumes"
  let params = {
    spendFileVersionUuid: removeIRI(payload.spendFileUuid),
    spends: payload.spends,
    currencyRate: useAppStore().getCurrencyAmount
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, "updateSpendForecastVolumes")
}


/**
 * when user clears the agreed terms in Entity -> Payment Terms Section
 * @param spendsConfig : string array of  uuids
 * @param all : boolean
 * @param filters : any
 * @returns 
 */
export async function deleteAgreedTerms(spendsConfig: Array<string>, all: boolean, filters: any, entity: string): Promise<ApiResponse>{
  let response = null
  
  const url = getBaseApi() + "/api/entity-card-results/clear-agree-terms-configs"
  let params = {
    spendsConfig: spendsConfig,
    all,
    filters,
    entity
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, "DELETE EntityCard-Spend Agreed Terms")
}

export async function postSpendNewTerms({
  spendId,
  programId,
  termsWithoutCashDiscount,
  termsWithCashDiscount,
  cashDiscount,
  agreedDateOfChange,
  effectiveDate,
  nextReviewDate,
  harmonizationGroup,
  feedbackRating,
  financingGroup,
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
}: SpendNewTerms): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/entity_card_spend_new_terms";

  try {
    // Check if spendId is a valid
    if (!spendId) {
      throw new Error("Invalid spendId");
    }

  } catch (e: any) {
    response = e.response;
  }

  // If spendId contains the IRI, remove it
  if (spendId.includes("/")) {
    spendId = removeIRI(spendId);
  }

  // If programId contains the IRI, remove it
  if (programId.includes("/")) {
    programId = removeIRI(programId);
  }

  const params = {
    spend: "/api/spends/" + spendId,
    program: "/api/analyze/programs/" + programId,
    harmonizationGroup: harmonizationGroup,
    financingGroup: financingGroup,
    termsWithoutCashDiscount: termsWithoutCashDiscount,
    termsWithCashDiscount: termsWithCashDiscount,
    cashDiscount: cashDiscount,
    agreedDateOfChange: agreedDateOfChange,
    effectiveDate: effectiveDate,
    nextReviewDate: nextReviewDate,
    feedbackRating: feedbackRating,
    labels: labels,
    programName: programName,
    programTarget: programTarget,
    programProposedTerms: programProposedTerms,
    programEarlyPaymentTermRate: programEarlyPaymentTermRate,
    planName: planName,
    phaseName: phaseName,
    phaseNumber: phaseNumber,
    phaseEndDate: phaseEndDate,
    negotiatedPotentialCashFlow: negotiatedPotentialCashFlow
  };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "POST EntityCard-Spend New Terms");
}

export async function getLastPlan(
  spendUUID: string,
  programUUID: string
): Promise<ApiResponse> {
  let response = null;
  const url = `${getBaseApi()}/api/entity-card-results/get-last-plan`;
  const params = {
    spend: spendUUID,
    program: removeIRI(programUUID)
  };
  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Get Last Plan");
}

/**
 * @param noteId
 * @param comment Array of segments { type: 'mention', uuid, text } | { type: 'text', text } (same format as post note content)
 */
export async function patchSpendNote(
  noteId: string,
  comment: CommentSegment[]
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity_card_supplier_notes/' + removeIRI(noteId)
  const params = {
    comment: comment
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
  return giveAnswer(response, 'PATCH EntityCard-Spend Note')
}

export async function postSpendNote(
  supplierId: string,
  title: string,
  comment: string,
  marked: boolean
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity_card_supplier_notes'
  const params = {
    supplier: '/api/spend_parsed_companies/' + removeIRI(supplierId),
    title: title,
    comment: comment,
    marked: marked
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST EntityCard-Spend Note')
}


export async function deleteSpendNote(
  noteId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity_card_supplier_notes/' + noteId
  try {
    response = await axios.delete(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'Delete NOTE')
}



export async function patchSpendUserFeedback(
  feedbackId: string,
  feedbackRating: number | null,
  labels: Array<any>
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + feedbackId
  const params = {
    feedbackRating,
    labels
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
  return giveAnswer(response, 'PATCH  EntityCard-Spend User Feedback')
}



export async function postAddNewRecentEntityCard(
  companyId: string,
  targetSpendFileVersionUuid: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/add-recent'
  const params = {
    supplier: '/api/spend_parsed_companies/' + removeIRI(companyId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid)
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Add New Recent Entity Card')
}

export async function postDeleteNewRecentEntityCard(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/remove-recent'
  const params = {
    supplier: '/api/spend_parsed_companies/' + removeIRI(companyId)
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Add New Recent Entity Card')
}


export async function postSpendsBySupplierAndButProgram(
  supplierUUID: string,
  programId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/analyze/get-spend-program-configs-by-provider'
  const params = {
    supplierUUID: supplierUUID,
    programUUID: removeIRI(programId),
    // Scope the entity-card spend tabs to the active global filter (BE returns only the spend
    // lines that pass it). Null when no filter is active -> full dataset, unchanged behaviour.
    globalFilter: activeGlobalFilter()
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST to GET Spend ProgramConfigs B yProvider')
}

// *** Calculator ***

export async function postGetCalculateData(
  params:
  {
    additionalFields: any;
    calculationType: string;
    changeInTerms: number;
    configUUID?: string;
    contractualPaymentTerms?: number;
    currency: string;
    currencyRate: number;
    level: EntityType;
    priceChange: number;
    programUUID?: string;
    spendVolume?: number;
    supplierTaxRate: number;
    supplierUUID: string;
    supplierWacc: number;
    type?: "data" | "table";
  }
): Promise<ApiResponse> {
  let response = null;

  // Validate
  if (StringUtils.isNullUndefinedOrEmpty(getBaseApi())) {
    return giveAnswer(null, 'BaseApi is not set')
  }

  if (StringUtils.isNullUndefinedOrEmpty(params.type) || !["data", "table"].includes(params.type)) {
    return giveAnswer(null, 'Type is missing or not valid')
  }

  const url = getBaseApi() + '/api/entity-card/calculator/calculate-'+ params.type

  // Remove type from params
  delete params.type;

  try {
    // Bug#18535: at entity level the calculator's base volume is the entity's Spend
    // Volume, so it must be scoped to the active filter. BE ignores it at spend level
    // (a spend line is already a single row).
    response = await axios.post(url, { ...params, globalFilter: activeGlobalFilter() }, {

    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'POST to GET Spend ProgramConfigs B yProvider')
}

export async function calculatorGetInitialDataAPIRead(params: {
  supplierUUID: string, 
  configUUID: string, 
  programUUID: string, 
  level: string,
}): Promise<ApiResponse> {
  let response = null;

  const url = getBaseApi() + '/api/entity-card/calculator/get-initial-data'

  try {
    // Bug#18535: the entity-level defaults (and forecastVolumeApplied) are derived from
    // the entity's spend volume, so they follow the active filter too.
    response = await axios.post(url, { ...params, globalFilter: activeGlobalFilter() }, {

    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}

export async function calculatorSaveDataAPIUpdate(
  params: {
    configUUID: string, 
    level: string,
    programUUID: string, 
    supplierUUID: string,
    calculatorValues: {
      calculationType: string,
      priceChange: number,
      changeInTerms: number,
      supplierTaxRate: number,
      supplierWacc: number,
      additionalFields: any
    }
  }
): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + '/api/entity-card/calculator/save-data'

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}




export async function calculatorSaveNewScenario(
  params: {
    configUUID: string, 
    level: string,
    programUUID: string, 
    supplierUUID: string,
    name: string,
    calculatorValues: {
      calculationType: string,
      priceChange: number,
      changeInTerms: number,
      supplierTaxRate: number,
      supplierWacc: number,
      additionalFields: any
    }
  }
): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + '/api/calculated_scenarios/save_scenario'

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}



export async function calculatorUpdateScenario(
  params: {
    scenarioId: string,
    configUUID: string, 
    level: string,
    programUUID: string, 
    supplierUUID: string,
    name: string,
    calculatorValues: {
      calculationType: string,
      priceChange: number,
      changeInTerms: number,
      supplierTaxRate: number,
      supplierWacc: number,
      additionalFields: any
    }
  }
): Promise<ApiResponse> {
  let response = null
  
  const url = getBaseApi() + '/api/calculated_scenarios/update_scenario/' + removeIRI(params.scenarioId)

  try {
    response = await axios.patch(url, params, {
      headers: {
        
        'Content-Type': 'application/merge-patch+json'
      }
    })
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response)
}


export async function getScenariosByConfig(
  companyId: string,
  level: string
): Promise<ApiResponse> {

 
  let response = null;
 
  const url = getBaseApi() + '/api/calculated_scenarios?config.uuid=' + removeIRI(companyId) + '&level=' + level
  
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "GET Scenarios by uuid");
}


export async function deleteScenario(
  scenarioId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + scenarioId

  try {
    response = await axios.delete(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'DELETE Scenario')
}



// *** END Calculator ***

export async function postElasticSearchSuppliers(
  search: string,
  from: number,
  orderBy: string,
  orderDirection: string,
  filters: Array<any>,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/get-entity-cards'

  const params = {
    search: search,
    skip: from,
    orderBy: orderBy,
    orderDirection: orderDirection,
    filters: filters,

  }

  try {
    response = await axios.post(url, params, { signal })
  } catch (e: any) {
    if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') {
      return { success: false, code: 0, data: null, skipped: true }
    }
    response = e.response
  }
  return giveAnswer(response, 'POST Elastic Search Providers')
}


export async function getSupplierESG(
  companyId: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/' + removeIRI(companyId) + '/ESG'

  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Supplier ESG')
}


/**
 * Returns the Family Tree with Filtered/Unfiltered Entities
 * The targetProgramUUID could be empty if there is no program
 * @param companyId 
 * @param programId 
 * @param globalFilter 
 * @param spendFileVersion 
 * @returns 
 */
export async function getSupplierTreeFamily(
  companyId: string,
  programId: string | null,
  globalFilter: any,
  spendFileVersion: string,
): Promise<ApiResponse> {
  let response = null
  const currencyNumberVal = useAppStore().getCurrencyAmount
  const url = getBaseApi() + '/api/entity-card/entity/family_tree'
  let params
  if (programId) {
    params = { 
      supplierUUID: removeIRI(companyId),
      filters: {
        targetSpendFileVersionUuid: removeIRI(spendFileVersion),
        targetProgramUuid: removeIRI(programId),
        currencyRate: currencyNumberVal,
        globalFilter: globalFilter
      }
    }
  
  } else {
    params = { 
      supplierUUID: removeIRI(companyId),
      filters: {
        targetSpendFileVersionUuid: removeIRI(spendFileVersion),
        currencyRate: currencyNumberVal,
        globalFilter: globalFilter
      }
    }
  }
  

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'get Supplier Tree Family')
}

export async function getEntityCardProgress(
  companyId: string
): Promise<ApiResponse> {
  let response = null

  try {
    response = await Promise.all([
      getDataDepth(companyId),
      getDetailFinancialMetrics(companyId),
      getCountryRatingInfo(companyId),
      getIndustryRatingInfo(companyId)
    ])
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, 'get Entity Card Progress')
}

export async function getFullAdaBot(
  configId: string,
  companyId: string,
  programId: string,
  cTarget: string,
  level: string | null,
  currency: string = useAppStore().getCurrencyTo,
  currencyRate: number = useAppStore().getCurrencyAmount
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/entity/ada-bot/all/'
  // Scope the ADA-Bot supplier snapshot to the active global filter (BE applies it only when the
  // company has FEATURE_DYNAMIC_FILTERED_SUMMARIES). Null when no filter is active -> full dataset.
  const params = { supplierUUID: companyId, configUUID: removeIRI(configId), programUUID: removeIRI(programId), cTarget: cTarget, currency, currencyRate, level: level ?? 'spend', globalFilter: activeGlobalFilter() }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Pay On Terms Strategy')
}



/**
 * Request data changes
 * 
 * @param supplierId 
 * @param title 
 * @param comment 
 * @param marked 
 * @returns 
 */
export async function postReqDataChanges(
  entity: string,
  userMessage: string,
  spendFileVersion: string
): Promise<ApiResponse> {
  let response = null;

  const url = getBaseApi() + "/api/change_requests";

  const params = {
    entity: "/api/spend_parsed_companies/" + entity,
    userMessage,
    spendFileVersion: spendFileVersion
  };

  try {
    response = await axios.post(url, params, {
      
    });

  } catch (e: any) {
    if (import.meta.env.DEV) console.error("Error when trying to post data change request", e);
  }

  return giveAnswer(response, "POST EntityCard-Spend Data Change Request");
}


/** post stargegy status by entity */
export async function postStatusStrategybyEntity(
  strategy: string, 
  companyId: string, 
  programId: string, 
  spendUUID: string,
  status: boolean
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/entity-card/${removeIRI(companyId)}/strategies/allowed/update`
  const params = { 
    // supplierUuid: removeIRI(companyId), 
    key: strategy, 
    isAllowed: status,
    activeProgram: removeIRI(programId), 
    // spendUUID: removeIRI(spendUUID)
    
  }
  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Pay On Terms Strategy')
}


// *** GNews API ***

/**
 * Search news articles for a company via backend proxy
 * Route: /api/externals-apis/gnews/search
 * 
 * @param moduleName - Module name ('entityCard' or 'home')
 * @param entityName - Entity/supplier name (optional, for entityCard)
 * @param parentName - Parent company name (optional, for entityCard)
 * @param lang - Language code (default: 'en')
 * @param max - Maximum number of articles (default: 10)
 * @param page - Page number for pagination (default: 1)
 * @returns Promise with API response containing news articles
 */
export async function searchNews(
  moduleName: string,
  entityName?: string,
  parentName?: string,
  lang: string = 'en',
  max: number = 10,
  page: number = 1
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/gnews/search'
  
  const params: any = {
    moduleName,
    lang,
    max,
    page
  }
  
  if (entityName) {
    params.entityName = entityName
  }
  
  if (parentName) {
    params.parentName = parentName
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
    if (import.meta.env.DEV) {
      console.error('Error fetching news from GNews API:', e)
    }
  }
  return giveAnswer(response, 'POST Search News (GNews)')
}

// *** END GNews API ***

/**
 * GET /api/hs_code_references
 * Returns Hydra collection of H.S. code references (code, description).
 * Uses itemsPerPage to request a large set for the selector (backend may cap it).
 */
export async function getHsCodeReferences(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/hs_code_references?itemsPerPage=5000'

  try {
    response = await axios.get(url, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET HS Code References')
}



/**
 * Route: POST /api/entity-card/entity/{uuid}/peer-group-standard-2/waterfall-preview
 * What-if waterfall for PGS2 — does not persist anything.
 */
export async function previewPeerGroupStandard2Waterfall(
  entityUuid: string,
  configuration: object,
  signal?: AbortSignal,
  spendUuid?: string | null
): Promise<ApiResponse> {
  let response = null
  let url = getBaseApi() + `/api/entity-card/entity/${removeIRI(entityUuid)}/peer-group-standard-2/waterfall-preview`

  if (spendUuid) {
    url += '?spendUuid='+spendUuid
  }

  try {
    response = await axios.post(url, { configuration }, { signal })
  } catch (e: any) {
    if (e?.code === 'ERR_CANCELED' || e?.name === 'AbortError' || e?.name === 'CanceledError') {
      throw e
    }
    response = e.response
  }
  return giveAnswer(response, 'POST SS2 Waterfall Preview')
}



/**
 * Route: POST /api/entity-card/entity/{uuid}/supplier-standard-2/waterfall-preview
 * What-if waterfall for SS2 — does not persist anything.
 */
export async function previewSupplierStandard2Waterfall(
  entityUuid: string,
  configuration: object,
  signal?: AbortSignal
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/entity-card/entity/${removeIRI(entityUuid)}/supplier-standard-2/waterfall-preview`
  try {
    response = await axios.post(url, { configuration }, { signal })
  } catch (e: any) {
    if (e?.code === 'ERR_CANCELED' || e?.name === 'AbortError' || e?.name === 'CanceledError') {
      throw e
    }
    response = e.response
  }
  return giveAnswer(response, 'POST SS2 Waterfall Preview')
}

/**
 * Route: POST /api/entity-card/entity/{uuid}/peer-group-standard-2/save
 * Persists PGS2 configuration and triggers related program recalculation.
 */
export async function savePGS22Waterfall(
  entityUuid: string,
  configuration: object  
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/entity-card/entity/${removeIRI(entityUuid)}/peer-group-standard-2/save`
  try {
    response = await axios.post(url, { configuration })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST PGS2 Waterfall Save')
}


/**
 * Route: POST /api/entity-card/entity/{uuid}/supplier-standard-2/save
 * Persists SS2 configuration and triggers related program recalculation.
 */
export async function saveSupplierStandard2Waterfall(
  entityUuid: string,
  configuration: object,
  onlyMetricWasChanged = false
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/entity-card/entity/${removeIRI(entityUuid)}/supplier-standard-2/save`
  try {
    response = await axios.post(url, { configuration, onlyMetricWasChanged })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST SS2 Waterfall Save')
}

/**
 * POST /api/externals-apis/lovelace/commodity-hs-code
 * Given supplier / buyer and commodity (free text), returns a suggested HS code.
 */
export async function postLovelaceCommodityHsCode(
  input: {
    supplierName: string;
    supplierCountry: string;
    buyerName: string;
    buyerCountry: string;
    commodity: string;
  }
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/lovelace/commodity-hs-code'

  try {
    response = await axios.post(url, { input }, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Lovelace Commodity HS Code')
}

/**
 * POST /api/externals-apis/lovelace/negotiation-insights-arguments
 * Returns negotiation insights and arguments for the supplier.
 */
export async function postLovelaceNegotiationInsightsArguments(
  input: {
    supplierName: string;
    supplierCountry: string;
    buyerIndustry: string;
    targetPaymentTerms: number;
    commodity: string;
  },
  forceRefresh = false
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/lovelace/negotiation-insights-arguments'

  try {
    response = await axios.post(url, { input, ...(forceRefresh && { forceRefresh }) }, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Lovelace Negotiation Insights & Arguments')
}

/**
 * POST /api/externals-apis/lovelace/market-share
 * Returns market share scope and companies used for the Market Share card.
 */
export async function postLovelaceMarketShare(
  input: {
    supplierName: string;
    supplierCountry: string;
    buyerIndustry: string;
    buyerCountry: string;
    commodity: string;
  },
  forceRefresh = false
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/lovelace/market-share'

  try {
    response = await axios.post(url, { input, ...(forceRefresh && { forceRefresh }) }, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Lovelace Market Share')
}

/**
 * POST /api/externals-apis/lovelace/tarifs
 * Returns tariff information, notes and strategy for the Tariffs card.
 */
export async function postLovelaceTariffs(
  input: {
    commodity: string;
    spendVolume: string;
    supplierCountry: string;
    buyerCountry: string;
  },
  forceRefresh = false
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/lovelace/tarifs'

  try {
    response = await axios.post(url, { input, ...(forceRefresh && { forceRefresh }) }, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Lovelace Tariffs')
}


//- /api/externals-apis/lovelace/category-compositions

export async function postLovelaceCategoryCompositions(
  input: {
    hsCode: string;
  },
  forceRefresh = false
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/lovelace/category-compositions'

  try {
    response = await axios.post(url, { input, ...(forceRefresh && { forceRefresh }) }, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Lovelace Category Compositions')
}


export async function paymentTermStrategyUiSetup(
  options: any
): Promise<ApiResponse> {

  const { configuuid, level, ...data } = options

  const url = getBaseApi() + 
    `/api/entity-card/spend-program-configuration/${configuuid}/payment-term-strategy-ui-setup/${level}`

  let response = null;

  try {
    response = await axios.put(url, data)
  } catch (e: any) {
    response = e.response
  }

  return giveAnswer(response, "PUT Groups y entity")
}

export async function getParentCandidates(
  uuid: string,
  type: 'program' | 'supplier',
  params?: { q?: string; page?: number },
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + `/api/parent-search/${uuid}/parent-candidates/${type}`
  const queryParams: Record<string, any> = {}
  if (params?.q) queryParams.q = params.q
  if (params?.page) queryParams.page = params.page
  try {
    response = await axios.get(url, { params: queryParams })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Parent Candidates')
}



export async function getBuyersByspendFile(
  spendFileVersionUUID: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/spend_file_versions/'+removeIRI(spendFileVersionUUID)+'/buyers'

  try {
    response = await axios.get(url, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Buyers for Potential Supplier Form Requests')
}


export async function getPotentialRequests(spendFileVersionUUID: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/potential_supplier_requests?spendFileVersion.uuid='+removeIRI(spendFileVersionUUID)

  try {
    response = await axios.get(url, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Potential Supplier Requests in User Panel')
}

interface Requests {
  name: string,
  country: string,
  estimatedAnnualSpendVolume: number,
  currency: string,
  estimateAvgPaymentTerms: number,
  buyer: string,
  commodity: string
}

export async function getPotentialSupplierCount(
  companyUuid: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/admin/companies/' + removeIRI(companyUuid) + '/potential-supplier-count'

  try {
    response = await axios.get(url, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Potential Supplier Count')
}

export async function postNewPotentialSupplierRequest(
  formData: Requests
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/potential_supplier_requests'

  const params = {
    "name": formData.name,
    "country": formData.country,
    "estimatedAnnualSpendVolume": formData.estimatedAnnualSpendVolume,
    "currency": formData.currency,
    "estimateAvgPaymentTerms": formData.estimateAvgPaymentTerms,
    "buyer": formData.buyer,
    "commodity": formData.commodity.split(',').map(s => s.trim()).filter(Boolean)
  }

  try {
    response = await axios.post(url, params, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'POST Create Potential Supplier Requests')
}

export async function getMarketInsightsCurrencies(
  uuid: string
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/entity-card/' + removeIRI(uuid) + '/market-insights/currencies'

  try {
    response = await axios.get(url, {})
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Market Insights Currencies')
}

export async function getLovelaceInterestRates(
  supplierCountryCode : string,
  forceRefresh = false
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/lovelace/interest-rates'

  try {
    response = await axios.get(url, { params: { supplierCountryCode, ...(forceRefresh && { forceRefresh }) } })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Lovelace Interest Rates')
}

export async function getLovelaceExchangeRates(
  supplierCountry: string,
  spendCurrency: string,
  forceRefresh = false
): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/externals-apis/lovelace/exchange-rates'

  try {
    response = await axios.get(url, { params: { supplierCountry, spendCurrency, ...(forceRefresh && { forceRefresh }) } })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Lovelace Exchange Rates')
}
