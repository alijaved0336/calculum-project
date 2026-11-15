
import axios from '@/utils/axios';
import { useAppStore } from '@/stores/app'
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { removeIRI } from '@/utils'
import { getBaseApi } from '@/utils/getBaseApi';

export async function getSummary(spendVersion: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/data-match/summary/' + removeIRI(spendVersion)
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET Summary of Match Overview')
}





export async function getList(spendVersion: string): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/data-match/list/' + removeIRI(spendVersion)
  try {
    response = await axios.get(url, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'GET list of Match Overview')
}


export async function deleteSpendbySpendFile(spendFileVersion: any, match: any, noMatch: any): Promise<ApiResponse> {
  let response = null
  const url = getBaseApi() + '/api/data-match/spend-file-versions/'+ removeIRI(spendFileVersion) + '/remove'
  const params = {
    //spendFileVersion: spendFileVersion,
    match: match,
    noMatch: noMatch    
  }

  try {
    response = await axios.post(url, params, {
      
    })
  } catch (e: any) {
    response = e.response
  }
  return giveAnswer(response, 'DELETE SPENDS IN MATCH LIST')
}

export async function matchDataAPIReadAll(
  spendVersion: string
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + "/api/data-match/info/" + removeIRI(spendVersion);
    const params = { currencyRate: useAppStore().getCurrencyAmount };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }
  return giveAnswer(response, "GET data matched of Match Overview");
}
