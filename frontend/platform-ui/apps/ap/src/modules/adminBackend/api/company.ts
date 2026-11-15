import { CompanyAPIPlatformResponse } from "@/types";

import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from "@/services/api/response";
import { removeIRI } from "@/utils";
import * as kendoChartRelated from '@/utils/kendoChartRelated'
import { useUserStore } from '@/stores/user';
import { getBaseApi } from '@/utils/getBaseApi';

export async function createCompany(
{ name, address, country, city, zipCode, userLanguage, identificationType, identificationValue, domain, wacc, taxRate, currency, industry, revenuePercentage, annualSalesRevenueMillions, annualSpendMillions, accountsReceivablesMillions, averagePaymentTerms, averagePaymentTermsWithCustomersDays, averageTimeApproveInvoicesReceivedFromSuppliersDays, limitUsers, excludeForPeerGroupClustering, excludeForSupplierStandardGroupClustering, inactivityDays, allowedDomains }: { name: string; address: string; country: string; city: string; zipCode: string; userLanguage: string; identificationType: string; identificationValue: string; domain: string; wacc: string; taxRate: string; currency: string; industry: string; revenuePercentage: string; annualSalesRevenueMillions: string; annualSpendMillions: string; accountsReceivablesMillions: string; averagePaymentTerms: string; averagePaymentTermsWithCustomersDays: string; averageTimeApproveInvoicesReceivedFromSuppliersDays: string; limitUsers: number; excludeForPeerGroupClustering: boolean; excludeForSupplierStandardGroupClustering: boolean; inactivityDays: number; allowedDomains: string; }): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/companies";

  const params = {
    name: name,
    address: address,
    country: country,
    city: city,
    zipCode: zipCode,
    userLanguage: userLanguage,
    identificationType: identificationType,
    identificationValue: identificationValue,
    domain: domain,
    wacc: wacc,
    taxRate: taxRate,
    averagePaymentTerms: parseInt(averagePaymentTerms),
    currency: currency,
    industry: industry,
    revenuePercentage: parseInt(revenuePercentage),
    annualSalesRevenueMillions: parseInt(annualSalesRevenueMillions),
    annualSpendMillions: parseInt(annualSpendMillions),
    accountsReceivablesMillions: parseInt(accountsReceivablesMillions),
    averagePaymentTermsWithCustomersDays: parseInt(
      averagePaymentTermsWithCustomersDays
    ),
    averageTimeApproveInvoicesReceivedFromSuppliersDays: parseInt(
      averageTimeApproveInvoicesReceivedFromSuppliersDays
    ),
    limitUsers: Number(limitUsers),
    excludeForPeerGroupClustering: excludeForPeerGroupClustering,
    excludeForStandardGroupClustering: excludeForSupplierStandardGroupClustering,
    inactivityDays,
    allowedDomains
  };
  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function companyAPIUpdate(
  {companyIRI, company} : {companyIRI: string, company: Partial<CompanyAPIPlatformResponse>}
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + companyIRI;

  try {
    response = await axios.patch(url, company, {
      headers: {
        
        "Content-Type": "application/merge-patch+json"
      }
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function patchCompany(
{ idCompany, name, address, country, city, zipCode, userLanguage, identificationType, identificationValue, domain, wacc, taxRate, currency, industry, revenuePercentage, annualSalesRevenueMillions, annualSpendMillions, accountsReceivablesMillions, averagePaymentTerms, averagePaymentTermsWithCustomersDays, averageTimeApproveInvoicesReceivedFromSuppliersDays, limitUsers, excludeForPeerGroupClustering, excludeForSupplierStandardGroupClustering, inactivityDays, allowedDomains }: { idCompany: string; name?: string; address?: string; country?: string; city?: string; zipCode?: string; userLanguage?: string; identificationType?: string | null; identificationValue?: string | null; domain?: string; wacc?: number; taxRate?: number; currency?: string; industry?: string; revenuePercentage?: number; annualSalesRevenueMillions?: number; annualSpendMillions?: number; accountsReceivablesMillions?: number; averagePaymentTerms?: string; averagePaymentTermsWithCustomersDays?: string; averageTimeApproveInvoicesReceivedFromSuppliersDays?: string; limitUsers?: number; excludeForPeerGroupClustering?: boolean; excludeForSupplierStandardGroupClustering?: boolean; inactivityDays?: number | null; allowedDomains?: string }
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + idCompany;

  const params: any = {};

  // Only include fields that are defined (not undefined)
  if (name !== undefined) params.name = name;
  if (address !== undefined) params.address = address;
  if (country !== undefined) params.country = country;
  if (city !== undefined) params.city = city;
  if (zipCode !== undefined) params.zipCode = zipCode;
  if (userLanguage !== undefined) params.userLanguage = userLanguage;
  if (identificationType !== undefined) params.identificationType = identificationType;
  if (identificationValue !== undefined) params.identificationValue = identificationValue;
  if (domain !== undefined) params.domain = domain;
  if (wacc !== undefined) params.wacc = wacc;
  if (taxRate !== undefined) params.taxRate = taxRate;
  if (averagePaymentTerms !== undefined && averagePaymentTerms !== null && averagePaymentTerms !== '') {
    const parsed = parseInt(averagePaymentTerms);
    if (!isNaN(parsed)) params.averagePaymentTerms = parsed;
  }
  if (currency !== undefined) params.currency = currency;
  if (industry !== undefined) params.industry = industry;
  if (revenuePercentage !== undefined && revenuePercentage !== null) {
    const parsed = parseInt(String(revenuePercentage));
    if (!isNaN(parsed)) params.revenuePercentage = parsed;
  }
  if (annualSalesRevenueMillions !== undefined && annualSalesRevenueMillions !== null) {
    const parsed = parseInt(String(annualSalesRevenueMillions));
    if (!isNaN(parsed)) params.annualSalesRevenueMillions = parsed;
  }
  if (annualSpendMillions !== undefined && annualSpendMillions !== null) {
    const parsed = parseInt(String(annualSpendMillions));
    if (!isNaN(parsed)) params.annualSpendMillions = parsed;
  }
  if (accountsReceivablesMillions !== undefined && accountsReceivablesMillions !== null) {
    const parsed = parseInt(String(accountsReceivablesMillions));
    if (!isNaN(parsed)) params.accountsReceivablesMillions = parsed;
  }
  if (averagePaymentTermsWithCustomersDays !== undefined && averagePaymentTermsWithCustomersDays !== null && averagePaymentTermsWithCustomersDays !== '') {
    const parsed = parseInt(averagePaymentTermsWithCustomersDays);
    if (!isNaN(parsed)) params.averagePaymentTermsWithCustomersDays = parsed;
  }
  if (averageTimeApproveInvoicesReceivedFromSuppliersDays !== undefined && averageTimeApproveInvoicesReceivedFromSuppliersDays !== null && averageTimeApproveInvoicesReceivedFromSuppliersDays !== '') {
    const parsed = parseInt(averageTimeApproveInvoicesReceivedFromSuppliersDays);
    if (!isNaN(parsed)) params.averageTimeApproveInvoicesReceivedFromSuppliersDays = parsed;
  }
  if (limitUsers !== undefined && limitUsers !== null) {
    params.limitUsers = Number(limitUsers);
  }
  if (excludeForPeerGroupClustering !== undefined) params.excludeForPeerGroupClustering = excludeForPeerGroupClustering;
  if (excludeForSupplierStandardGroupClustering !== undefined) params.excludeForSupplierStandardGroupClustering = excludeForSupplierStandardGroupClustering;
  if (inactivityDays !== undefined) params.inactivityDays = inactivityDays;
  if (allowedDomains !== undefined) params.allowedDomains = allowedDomains;
  // paymentTermDays removed - this field doesn't exist in Company entity
  // The backend uses paymentCycleDays instead, which is handled separately
  try {
    response = await axios.patch(url, params, {
      headers: {
        
        "Content-Type": "application/merge-patch+json"
      }
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getCompany(companyId: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/companies/${companyId}`;

  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getCompanyTeams(companyId: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `${companyId}/teams`;

  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function updateGridUiGroup(
  uuid: string,
  name: string,
  primaryColor: string,
  companies: Array<any>,
  maxNumberOfUsers: number,
  allowedDomains: string,
  removeAdaCalculumReferences: boolean
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/ui_groups/" + uuid;
  const params = {
    name: name,
    primaryColor: primaryColor,
    companies: companies,
    maxNumberOfUsers: maxNumberOfUsers,
    allowedDomains: allowedDomains,
    removeAdaCalculumReferences: removeAdaCalculumReferences
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

  return giveAnswer(response);
}

export async function getCompanies(): Promise<ApiResponse> {
  let response = null;

  const url = getBaseApi() + "/api/companies";

  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}



export async function generateCluster(minCompanies: number, maxPeriod:number, clusterType: string): Promise<ApiResponse> {
  let response = null;
  let cluster = kendoChartRelated.getClusterTypeForQuery(clusterType);
  const url = getBaseApi() + `/api/clusters/${cluster}/${minCompanies}/${maxPeriod}`;
  
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function grantAccess(
  allCompanies: boolean,
  userId: string,
  companyId: any,
  isFromUserPanel?: boolean
): Promise<ApiResponse> {
  let response = null;
  const data = {};
  let typeOfRevoke = "";
  if (allCompanies) {
    typeOfRevoke = "all";
  } else {
    typeOfRevoke = removeIRI(companyId);
  }

  let url = ''

  if (isFromUserPanel) {
    url = getBaseApi() + `/api/users/${removeIRI(userId)}/companies/${typeOfRevoke}/grant`;
  } else {
    url = getBaseApi() + `/api/admin/users/${removeIRI(userId)}/companies/${typeOfRevoke}/grant`;
  }  

  try {
    response = await axios.post(url, data, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GRANT");
}

export async function revokeAccess(
  allCompanies: boolean,
  userId: string,
  companyId: any,
  isFromUserPanel?: boolean
): Promise<ApiResponse> {
  let response = null;
  const data = {};
  let typeOfRevoke = "";
  if (allCompanies) {
    typeOfRevoke = "all";
  } else {
    typeOfRevoke = removeIRI(companyId);
  }

  let url = ''

  if (isFromUserPanel) {
    url = getBaseApi() + `/api/users/${removeIRI(userId)}/companies/${removeIRI(typeOfRevoke)}/deny`;
  } else {
    url = getBaseApi() + `/api/admin/users/${removeIRI(userId)}/companies/${removeIRI(typeOfRevoke)}/deny`;
  }

  try {
    response = await axios.post(url, data, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "REVOKE");
}

export async function resetIdentityProvider(
  userId: string,
  companyId: string,
  isFromUserPanel?: boolean
): Promise<ApiResponse> {
  let response = null;
  const data = {};

  let url = ''
  if (isFromUserPanel) {
    url = getBaseApi() + `/api/user/${removeIRI(userId)}/company/${removeIRI(companyId)}/reset-identity-provider`;
  } else {
    url = getBaseApi() + `/api/admin/user/${removeIRI(userId)}/company/${removeIRI(companyId)}/reset-identity-provider`;
  }
  
  try {
    response = await axios.post(url, data, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "RESET IDENTITY PROVIDER");
}

export async function getLoginLogPDF(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/admin/get-users-last-activity";

  try {
    response = await axios.get(url, {
      
      responseType: "arraybuffer"
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET Users Last Activity");
}

export async function postCompanyTeam(
  teamName: string,
  companyId: string | null
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/teams";
  const params = {
    name: teamName,
    company: companyId ?? useUserStore().getUserCompanyId
  };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function patchCompanyTeam(
  teamUuid: string,
  teamName: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/teams/" + removeIRI(teamUuid);
  const params = {
    name: teamName
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

  return giveAnswer(response);
}

export async function deleteCompanyTeam(
  teamUuid: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/teams/" + removeIRI(teamUuid);

  try {
    response = await axios.delete(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function deleteCompany(companyId: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + companyId;

  try {
    response = await axios.delete(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

//get suppliers
export async function getSuppliersForDataChange(spendFileVersion: string): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/entity-card/get-entities/spend-file-version/' + spendFileVersion

  let response = null;
  
  try {
    response = await axios.get(url, {
      
    });
  } catch (e:any) {
    response = e.response;
  }

  return giveAnswer(response);
}

/**
 * Update data values
 * 
 * @param changeRequestId {string}
 * @param changeType {string}
 * @param values {any}
 * @param status {string}
 */
export async function updateDataChangeValues(
  changeRequestId: string,  
  entity: string,
  changeType: string, 
  values: any,
  status: string,
  resolutionMessage?: string
): Promise<ApiResponse> {
  let response = null;
  
  const url =
    getBaseApi() + "/api/admin/change_requests/" + removeIRI(changeRequestId);
    
  let params;

  // Normalize status to lowercase for comparison
  const normalizedStatus = status?.toLowerCase()?.trim() || '';

  if (normalizedStatus === 'solved'){
    if (changeType === "COUNTRY_CREDIT_RATING") {
      params = {   
        status,
        values: {
          creditRating: values.creditRating,
          countryCode: values.country
        },
        changeType : "COUNTRY_CREDIT_RATING"
      };
    }
  
    if (changeType === "COMPANY_CREDIT_RATING") {
      params = {
        changeType: "COMPANY_CREDIT_RATING",
        status,
        entity: '/api/spend_parsed_companies/' + entity,
        values: {
          creditRating: values.creditRating
        }
      };
    }

    if (changeType === "FUNDING_COST") {
      params = {
        changeType: 'FUNDING_COSTS',
        status,
        entity: '/api/spend_parsed_companies/' + entity,
        values: {
          fundingCost: values.fundingCost
        }
      };
    }
  
    if (changeType === "PEER_GROUP_AVERAGE") {
      params = {
        changeType: 'PEER_GROUP_AVG',
        status,
        entity: '/api/spend_parsed_companies/' + entity,
        values: {
          peerGroupAverageStrategy: values.peerGroupAverage
        }
      };
    }
    
    // If no changeType is provided, just set status to solved
    if (!changeType) {
      params = {
        status: 'solved'
      } as any;
    }
    
    // Add resolutionMessage if provided (for solved status)
    if (resolutionMessage !== undefined && resolutionMessage !== null) {
      params = params || {} as any;
      params.resolutionMessage = resolutionMessage;
    }
  } else {
    params = {
      status: 'rejected'
    } as any;
    // Add resolutionMessage if provided (for rejected status)
    if (resolutionMessage !== undefined && resolutionMessage !== null) {
      params.resolutionMessage = resolutionMessage;
    }
  }
  
  try {
    response = await axios.patch(url, params, {
      headers: {
        
        "Content-Type": "application/merge-patch+json"
      }
    });
  } catch (e:any) {
    response = e.response;
  }

  return giveAnswer(response);
}

/**
 * Get activities for a change request
 */
export async function getChangeRequestActivities(
  changeRequestId: string
): Promise<ApiResponse> {
  let response = null;
  const url = `${getBaseApi()}/api/change_request_activities`;
  
  const params = {
    'changeRequest': `/api/change_requests/${removeIRI(changeRequestId)}`,
    'order[created]': 'DESC'
  };
  
  try {
    response = await axios.get(url, { params });
  } catch (e: any) {
    if (e.response) {
      response = e.response;
    } else {
      // Handle network errors or other non-HTTP errors
      if (import.meta.env.DEV) {
        console.error('Error in getChangeRequestActivities:', e);
      }
      // Return a default error response
      response = {
        status: 500,
        data: { message: 'Network error or server unavailable' }
      };
    }
  }
  
  return giveAnswer(response);
}

/**
 * Create a new activity for a change request
 */
export async function createChangeRequestActivity(
  changeRequestId: string,
  message: string,
  activityType: 'comment' | 'information_requested'
): Promise<ApiResponse> {
  let response = null;
  const url = `${getBaseApi()}/api/admin/change_request_activities`;
  
  const params = {
    changeRequest: `/api/admin/change_requests/${removeIRI(changeRequestId)}`,
    message: message,
    activityType: activityType
  };
  
  try {
    response = await axios.post(url, params);
  } catch (e: any) {
    if (e.response) {
      response = e.response;
    } else {
      // Handle network errors or other non-HTTP errors
      if (import.meta.env.DEV) {
        console.error('Error in createChangeRequestActivity:', e);
      }
      // Return a default error response
      response = {
        status: 500,
        data: { message: 'Network error or server unavailable' }
      };
    }
  }
  
  return giveAnswer(response);
}


//for credit rating
export async function getValuesForCreditRating(): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + "/api/credit_score_references"
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}
/**
 * supplier ID 0baa530b-822d-4329-95b7-3d7a879c3d5d
EntityCardReqChanges.vue:50 spendFileVersion /api/spend_file_versions/53eb19ee-504d-41e5-bcf9-7345d56bb110
 * @param entity 
 * @param userMessage 
 * @param spendFile 
 * @param cloned 
 * @returns 
 */
export async function cloneRowRecord(
  entity: string,
  userMessage: string,
  spendFile: string,
  cloned: boolean
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/admin/change_requests";
  const params = {
    entity:  entity === '-' ? null : entity,
    userMessage: userMessage,
    spendFileVersion: spendFile,
    cloned: cloned
  };
  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function deleteItemRequest(uuid: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/admin/change_requests/" + removeIRI(uuid);
  try {
    response = await axios.delete(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getDataChangesUsers(params?: { page?: number; itemsPerPage?: number; status?: string; changeType?: string; search?: string }): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/change_requests";
  
  const queryParams: Record<string, string | number> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.itemsPerPage) queryParams.itemsPerPage = params.itemsPerPage;
  if (params?.status) queryParams.status = params.status;
  if (params?.changeType) queryParams.changeType = params.changeType;
  if (params?.search) queryParams['userMessage'] = params.search;
  
  try {
    response = await axios.get(url, {
      params: queryParams
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function cleanSelectedFile(
  id: string,
  fileType: string
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + `/api/medias/${fileType}/${removeIRI(id)}/remove`;
  const formData = {};
  try {
    response = await axios.post(url, formData, {
      headers: {
        
        //'Content-type': 'multipart/form-data'
      }
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function patchBaseRate(
  configurationID: string,
  value: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + configurationID;
  const tag = patchBaseRate.name;
  const params = {
    value
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

  return giveAnswer(response, tag);
}

export async function getCompanyEMISFiles(
  companyID: any
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/companies/${removeIRI(companyID)}/company_enhancing_files`;
  if (import.meta.env.DEV) console.log("get EMIS : ", url);
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getCompanyFiles(companyID: any): Promise<ApiResponse> {
  let response = null;

  if(import.meta.env.DEV) console.log("** companyID", companyID)
  
  const url =  companyID === 'all' ? getBaseApi() + `/api/companies/company_files` : getBaseApi() + `/api/companies/${companyID}/company_files`;
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function postBrandScoreFile(): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + "/api/brand_score/import/top_ten_million_domains";
  const formData = new FormData();
  formData.append("synchronous", "no");

  try {
    response = await axios.post(url, formData, {
      headers: {
        
        "Content-type": "multipart/form-data"
      }
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function postDenominatorScoreFile(): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + "/api/denominator/import/denominator-dei-score-files";
  const formData = new FormData();
  formData.append("synchronous", "no");

  try {
    response = await axios.post(url, formData, {
      headers: {
        
        "Content-type": "multipart/form-data"
      }
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function postRecalculateLeverages(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/admin/process/company_leverages";
  const formData = new FormData();
  try {
    response = await axios.post(url, formData, {
      headers: {
        
        "Content-type": "multipart/form-data"
      }
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function postCapitalize(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/admin/process/capitalize_countries";
  const formData = new FormData();
  try {
    response = await axios.post(url, formData, {
      
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function deleteSelectedUiGroup(
  uuid: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/ui_groups/" + uuid;
  try {
    response = await axios.delete(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function uploadUiGroupLogo(
  file: any,
  companyID: string
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + "/api/ui-groups/" + companyID + "/upload-logo";
  const formData = new FormData();
  formData.append("file", file);

  try {
    response = await axios.post(url, formData, {
      headers: {
        
        "Content-type": "multipart/form-data"
      }
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function saveCreatedUiGroup(
  name: string,
  primaryColor: string,
  companies: Array<any>,
  maxNumberOfUsers: number,
  allowedDomains: string,
  removeAdaCalculumReferences: boolean
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/ui_groups";
  const params = {
    name: name,
    primaryColor: primaryColor,
    companies: companies,
    maxNumberOfUsers: maxNumberOfUsers,
    allowedDomains: allowedDomains,
    removeAdaCalculumReferences: removeAdaCalculumReferences
  };
  try {
    response = await axios.post(url, params, {
      headers: {
        
        "Content-Type": "application/json"
      }
    });
    
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function getListOfCompaniesForFilter(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/groups/get-available-companies";
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function checkNameForUiGroup(name: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/ui_groups?name=" + name;
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function getUiGroups(section: any): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/ui_groups";
  try {
    response = await axios.get(url, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function getSpendFilesStatusCount(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/spend-file-version/count'
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function getSpendFilesByStatus(status: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/spend-file-version/status/' + status
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function syncCompaniesDataIngestion(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/company/sync-companies-to-data-ingestion'
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

export async function syncClientsDataIngestion(): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/company/sync-clients-to-data-ingestion'
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response)
}

/** Invitations */


export async function postNewInvitation(companyName: string, emails: Array<string>, invitationExpireDate: number): Promise<ApiResponse> {
  const url = getBaseApi() + '/api/invitation_file_uploaders'

  let response = null;

  const params = {
    companyName, emails, invitationExpireDate
  }
  
  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e:any) {
    response = e.response;
  }

  return giveAnswer(response);
}


export async function getAllInvitations(byUser: string): Promise<ApiResponse> {
  let url = getBaseApi()+'/api/invitation_file_uploaders'

  url += byUser ? '?createdBy.uuid='+ byUser : ''

  let response = null;
  
  try {
    response = await axios.get(url, {
      
    });
  } catch (e:any) {
    response = e.response;
  }

  return giveAnswer(response);
}


export async function getInvitationsActions(uuid: string, actionType: string): Promise<ApiResponse> {

 let url = ''

 switch(actionType) {
    case 'resend':
      url = getBaseApi() + '/api/invitation_file_uploaders/resend_invitation/' + uuid
      break;
    case 'cancel':
      url = getBaseApi() + '/api/invitation_file_uploaders/cancel_invitation/' + uuid
      break;
  }

  let response = null;

  try {
    response = await axios.get(url, {

    });
  } catch (e:any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getCompanyCommodities(
  companyId: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/commodities?company=" + removeIRI(companyId);

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function postCompanyCommodity(
  commodityName: string,
  companyId: string | null
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/commodities";
  const params = {
    name: commodityName,
    company: companyId,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function patchCompanyCommodity(
  commodityId: string,
  commodityName: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/commodities/" + removeIRI(commodityId);
  const params = {
    name: commodityName,
  };

  try {
    response = await axios.patch(url, params, {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function deleteCompanyCommodity(
  commodityId: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/commodities/" + removeIRI(commodityId);

  try {
    response = await axios.delete(url, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}
