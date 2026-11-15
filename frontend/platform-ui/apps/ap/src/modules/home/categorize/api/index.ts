import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi';
import { FiltersAPIParam } from "@/types";

export async function getOverviewInfoPanels(filters: FiltersAPIParam): Promise<ApiResponse> {
  let response = null;
  
  const url = getBaseApi() + "/api/categorize/overview-info-panels";
  
  const params = {
    filters
  }

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e: any) {
    response = e.response;
  }
  
  return giveAnswer(response, "GET Overview Info Panels");
}




export async function postSpendAlias(
  spendUuid: string,
  alias: string
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/categorize/spend/alias";
  const params = {
    spendUuid,
    alias
  };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e:any) {
    response = e.response;
  }
  return giveAnswer(response, "POST UPDATE ALIAS");
}
