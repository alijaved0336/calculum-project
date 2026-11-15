import axios from "@/utils/axios";
import { ApiResponse, giveAnswer } from "@/services/api/response";
import { removeIRI } from "@/utils";
import { getBaseApi } from '@/utils/getBaseApi';

export async function trackingActivityDashboard(
  type: string,
  value_proposition_id: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/posthog/dashboard/" + type;
  const params = {value_proposition_id:removeIRI(value_proposition_id) };
  try {
    response = await axios.post(url, params, {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}




export async function updateActivityDashboard(  
  value_proposition_id: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/posthog/dashboard/refresh";
  const params = {value_proposition_id:removeIRI(value_proposition_id) };
  try {
    response = await axios.post(url, params, {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}
