import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiResponse, giveAnswer } from "@/services/api/response";
import { removeIRI } from "@/utils";
import axios from "@/utils/axios";
import { getBaseApi } from '@/utils/getBaseApi';

interface Company {
  country: string | null;
  "@id": string;
  industry: string | null;
  naicsCode: string | null;
  entityName: string | null;
  region: string | null;
  selected: boolean;
}

// API Functions
async function apiGetListOfCompanies(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/compare_companies";
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET LIST OF COMPANIES, FINANCIAL DATA VIEW");
}

async function apiGetCalculatedValues(companyUuid: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/compare/find_compare_company";
  const params = {};
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET COMPANIES CALCULATED VALUES");
}

async function apiGetClusterIdForNotificationStatus(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + '/api/platform_settings/1';
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET ID FOR CLUSTER NOTIFICATION");
}

async function apiSendSavedCompany(currentCompanyUuid: string, uuid: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/companies/" + currentCompanyUuid;
  const params = {
    compareCompany: uuid
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

  return giveAnswer(response, "PATCH DATA VALUES FOR SELECTED COMPANY");
}

function getKeyValue(key: string) {
  if (key === "inventory") {
    return "INV";
  }
  if (key === "tradeReceivable") {
    return "TRADE_RECEIVABLE";
  }

  if (key === "tradePayable") {
    return "TRADE_PAYABLE";
  }

  if (key === "totalRevenue") {
    return "TOTAL_REVENUE";
  }

  if (key === "costOfGoods") {
    return "COST_OF_GOOD";
  }
}

async function apiUpdateValues(companyUuid: string, valueObj: any): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/compare/update_compare_company";
  let params = {};
  if (
    valueObj.behavior === "dpo" ||
    valueObj.behavior === "dso" ||
    valueObj.behavior === "c2c" ||
    valueObj.behavior === "dio"
  ) {
    params = {
      companyUuid: removeIRI(companyUuid),
      companyMetricalPerYear: valueObj.behavior.toUpperCase(),
      year: valueObj.year,
      value: valueObj.value
    };
  } else {
    params = {
      companyUuid: removeIRI(companyUuid),
      companyAmountPerYear: getKeyValue(valueObj.behavior),
      year: valueObj.year,
      value: valueObj.value
    };
  }

  try {
    response = await axios.post(url, params);
  } catch (e:any) {
    response = e.response;
  }
  return giveAnswer(response, "POST COMPANIES CALCULATED VALUES");
}

async function getListOfCompanies(props: any) {
  const { callbackSuccess, callbackError }: any = props;
  const response = await apiGetListOfCompanies();
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response.data);
  }
}

async function getCalculatedValues(props: any) {
  const { companyUuid, callbackSuccess, callbackError }: any = props;
  const response = await apiGetCalculatedValues(companyUuid);
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response.data);
  }
}

async function getClusterIdForNotificationStatus(props: any) {
  const { callbackSuccess, callbackError }: any = props;
  const response = await apiGetClusterIdForNotificationStatus();
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response.data);
  }
}

async function sendSavedCompany(props: any) {
  const {
    currentCompanyUuid,
    uuid,
    callbackSuccess,
    callbackError
  }: any = props;
  const response = await apiSendSavedCompany(currentCompanyUuid, uuid);
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response.data);
  }
}

async function updateValues(props: any) {
  const {
    companyUuid,
    valueObj,
    callbackSuccess,
    callbackError
  }: any = props;
  const response = await apiUpdateValues(companyUuid, valueObj);
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response.data);
  }
}

export const useFinancingDataCompaniesStore = defineStore('financingDataCompanies', () => {
  // State
  const savedCompanyObject = ref<Company | null>(null)
  const homeFinancialDataColumnsCache = ref<Array<any> | null>([])
  const homeFinancingListCompanies = ref<Array<any> | null>(null)
  const homeFinancingListCompaniesCompare = ref<Array<any> | null>(null)
  const homeFinancingListCompaniesPeers = ref<Array<any> | null>(null)

  // Getters
  function getSelectedCompany(): Company | null {
    return savedCompanyObject.value
  }

  function getHomeFinancialDataColumnsCache(): Array<any> | null {
    return homeFinancialDataColumnsCache.value
  }

  function getHomeFinancingListCompanies(): Array<any> | null {
    return homeFinancingListCompanies.value
  }

  function getHomeFinancingListCompaniesCompare(): Array<any> | null {
    return homeFinancingListCompaniesCompare.value
  }

  function getHomeFinancingListCompaniesPeers(): Array<any> | null {
    return homeFinancingListCompaniesPeers.value
  }

  // Mutations
  function setSelectedCompany(company: Company | null): void {
    savedCompanyObject.value = company
  }

  function setHomeFinancialDataColumnsCache(columns: any) {
    homeFinancialDataColumnsCache.value = columns
  }

  function setHomeFinancingListCompanies(columns: any) {
    homeFinancingListCompanies.value = columns
  }

  function setHomeFinancingListCompaniesCompare(columns: any) {
    homeFinancingListCompaniesCompare.value = columns
  }

  function setHomeFinancingListCompaniesPeers(columns: any) {
    homeFinancingListCompaniesPeers.value = columns
  }

  return {
    // State
    savedCompanyObject,
    homeFinancialDataColumnsCache,
    homeFinancingListCompanies,
    homeFinancingListCompaniesCompare,
    homeFinancingListCompaniesPeers,
    // Getters
    getSelectedCompany,
    getHomeFinancialDataColumnsCache,
    getHomeFinancingListCompanies,
    getHomeFinancingListCompaniesCompare,
    getHomeFinancingListCompaniesPeers,
    // Mutations
    setSelectedCompany,
    setHomeFinancialDataColumnsCache,
    setHomeFinancingListCompanies,
    setHomeFinancingListCompaniesCompare,
    setHomeFinancingListCompaniesPeers,
    // Actions
    getListOfCompanies,
    getCalculatedValues,
    getClusterIdForNotificationStatus,
    sendSavedCompany,
    updateValues
  }
}) 
