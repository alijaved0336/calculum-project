import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from "@/services/api/response";
import { getBaseApi } from '@/utils/getBaseApi';
import { isProgramSfvConsistent } from '@/utils/validation/programSfvConsistency';
import {
  Field,
  FiltersApplied,
  Operation,
  Section,
  TargetView
} from "@/types";



function globalFiltersFieldsIsProgramSelectedRequired(field: Field): boolean {
  switch (field) {
    case "financings":
    case "modelCashFlow":
    case "modelPaymentTerms":
    case "isVCardApplied":
    case "programApplied":
    case "box":
    case "vCardBox":
    case "financialBox":
    case "scfBox":
    case "actualPaymentTerms":
    case "currencyCode":
    case "entityCompanySize":
      return true;

    default:
      return false;
  }
}



export async function fieldAPIRead(params: {
  currencyRate: number;
  field: Field;
  globalFilter?: any;
  operation: Operation;
  section: Section;
  targetPhaseUuid?: string | null;
  targetPlanUuid?: string | null;
  targetProgramUuid?: string | null;
  targetSpendFileVersionUuid?: string | null;
  targetView: TargetView;
}): Promise<ApiResponse> {
  // Init
  const {
    currencyRate = 1,
    field,
    globalFilter,
    operation,
    section,
    targetPhaseUuid = null,
    targetPlanUuid = null,
    targetProgramUuid = null,
    targetSpendFileVersionUuid = null,
    targetView
  } = params || {};

  const isProgramSelectedRequired = globalFiltersFieldsIsProgramSelectedRequired(field);
  // Defense-in-depth: validate program belongs to the active SFV
  //Add validation for field that required the program  
  if (isProgramSelectedRequired && !isProgramSfvConsistent(targetProgramUuid, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;

  const url = `
  ${getBaseApi()}/api/filters/${section}/${targetView}/${operation}/${field}`;

  let filters = {
    currencyRate,
    globalFilter,
    targetPhaseUuid,
    targetPlanUuid,
    targetProgramUuid,
    targetSpendFileVersionUuid
  };

  try {
    response = await axios.post(
      url,
      {
        filters
      },
      {
        headers: {
          
        }
      }
    );
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}

export async function templatesAPICreate({
  userId,
  companyId,
  title,
  filters
}: {
  userId: string;
  companyId: string;
  title: string;
  filters: any;
}): Promise<ApiResponse> {
  // Validate
  // User

  // Company

  // Title

  // Filters

  let response = null;

  const url = getBaseApi() + "/api/global_filters_templates";

  const params = {
    user: userId,
    company: companyId,
    title,
    filters
  };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }

  return giveAnswer(response, "POST - Global filters template");
}

export async function templatesAPIReadAll(): Promise<ApiResponse> {
  // Validate
  // User

  // Company

  // Title

  // Filters

  let response = null;

  const url = getBaseApi() + "/api/global_filters_templates";

  try {
    response = await axios.get(url, {
      
    });
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }

  return giveAnswer(response, "Get - Global filters template (all)");
}

export async function templatesAPIUpdate({
  id,
  filters
}: {
  id: string;
  filters: FiltersApplied;
}): Promise<ApiResponse> {
  // Validate
  // Id

  // Filters

  let response = null;

  const url = getBaseApi() + "/api/global_filters_templates/" + id;

  const params = {
    filters
  };

  try {
    response = await axios.patch(url, params, {
      headers: {
        
        "Content-Type": "application/merge-patch+json"
      }
    });
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }

  return giveAnswer(response, "PATCH - global filters templates");
}

export async function globalFiltersTemplatesActiveAPIUpdate({
  id
}: {
  id: string | null;
}): Promise<ApiResponse> {
  // Validate
  // Id

  // Filters

  let response = null;

  const url = getBaseApi() + "/api/user/set_active_global_filters_saved";

  const params = {
    selectedGlobalFiltersSaved: id
  };

  try {
    response = await axios.post(url, params, {
      
    });
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }

  return giveAnswer(response, "PATCH - global filters templates");
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
