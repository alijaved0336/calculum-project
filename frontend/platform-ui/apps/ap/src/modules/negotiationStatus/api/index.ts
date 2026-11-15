import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from "@/services/api/response";
import { getBaseApi } from '@/utils/getBaseApi';

// Types
import { NegotiationStatus } from "@/types";
import { ArrayUtils, StringUtils } from "@/utils";

export async function negotiationStatusAPIUpdate({
  spendsIds,
  negotiationStatus,
  spendFileVersionUuid,
  filters,
  all,
  level,
  planPhaseId,
  sourceStatus
}: {
  spendsIds: string[];
  negotiationStatus: NegotiationStatus;
  spendFileVersionUuid: string;
  filters: any;
  all: boolean | null;
  level: string;
  planPhaseId?: string;
  sourceStatus?: number;
}): Promise<ApiResponse> {

  let response = null;

  // Validate
  // if (ArrayUtils.isEmpty(spendsIds)) {
  //   return giveAnswer(
  //     null,
  //     "Error in negotiationStatusAPIUpdateMultiple: spendsIds is required"
  //   );
  // }

  if (StringUtils.isNullUndefinedOrEmpty(negotiationStatus)) {
    return giveAnswer(null, "Negotiation status is missing");
  }

  if (StringUtils.isNullUndefinedOrEmpty(spendFileVersionUuid)) {
    return giveAnswer(null, "SpendFileVersionUuid is missing");
  }

  // Transform ids array to comma separated string
  const uuids = spendsIds ? spendsIds.join(",") : null;

  const params = {
    uuids,
    negotiationStatus,
    spendFileVersionUuid,
    filters,
    all,
    level,
    sourceStatus,
    ...(negotiationStatus === "planned" && planPhaseId ? { planPhaseId } : {})
  };

  const url = `${getBaseApi()}/api/entity-card/negotiation-status/update`;

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }

  return giveAnswer(response, "POST - negotiation status");
}

export async function templatesAPIDelete({
  id
}: {
  id: string;
}): Promise<ApiResponse> {
  // Validate
  // Id

  // Filters

  let response = null;

  const url = getBaseApi() + "/api/global_filters_templates/" + id;

  try {
    response = await axios.delete(url, {
      
    });
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }

  return giveAnswer(response, "Delete - global filters templates");
}
