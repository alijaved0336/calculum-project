import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response'
import { getBaseApi } from '@/utils/getBaseApi';
import * as kendoChartRelated from '@/utils/kendoChartRelated'

export async function getUniqueDataForClusterColumn(
  collection: string,
  field: string
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/filters/documents/uniques/${collection}/${field}`;
  try {
    response = await axios.get(url, {
      
    });
  } catch (e:any) {
    response = e.response;
  }
  return giveAnswer(response, "GET CLUSTER UNIQUE DATA");
}

export async function exportClusterData(clusterType: string): Promise<ApiResponse> {
  let response = null;
  let cluster = kendoChartRelated.getClusterType(clusterType);
  const url = getBaseApi() + `/api/export/documents/${cluster}`;

  try {
    response = await axios.get(url, {
      
    });
  } catch (e:any) {
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}
