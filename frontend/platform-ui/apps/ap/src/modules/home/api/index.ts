import axios from "@/utils/axios";
import { ApiResponse, giveAnswer } from "@/services/api/response";
import { useAppStore } from "@/stores/app";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { getUrlWithQueryParams } from "@/services/api/apiServices";
import { removeIRI, StringUtils  } from "@/utils";
import { getBaseApi } from "@/utils/getBaseApi";
import { readContentDispositionFilename } from "@/utils/contentDisposition";
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";
import type { BuyerLeverageLimitsRequest, NineBoxThresholdRequest } from "@/types";

/**
 * Determines the appropriate company/entity UUID filters based on the provided parameters.
 * Can return both, one, or neither: companyUuid and groupUuid are added only when they have values.
 *
 * @param companyUuid - Direct company UUID if provided
 * @param entityUuid - Entity UUID (can be supplier, parent, or generic)
 * @param companyType - Type of company ("parent" | "supplier" | "")
 * @param level - Filter level (e.g., "CompanyUserGraphQL")
 * @param groupUuid - Company UI group UUID
 * @returns Object with filter properties (companyUuid, groupUuid, parentUuid, or entityUuid) — any combination or none
 */
function determineCompanyUuidFilters(
  companyUuid: string,
  entityUuid: string,
  companyType: string,
  level: string,
  groupUuid: string
): { companyUuid?: string; parentUuid?: string; entityUuid?: string; groupUuid?: string } {
  const result: { companyUuid?: string; parentUuid?: string; entityUuid?: string; groupUuid?: string } = {}

  // Add groupUuid when provided (can be combined with companyUuid)
  if (!StringUtils.isNullUndefinedOrEmpty(groupUuid)) {
    result.groupUuid = groupUuid
  }

  // Add companyUuid when provided directly
  if (!StringUtils.isNullUndefinedOrEmpty(companyUuid)) {
    result.companyUuid = companyUuid
    return result
  }

  // Fallbacks for company/entity when no direct companyUuid
  if (level === "CompanyUserGraphQL" && !StringUtils.isNullUndefinedOrEmpty(entityUuid)) {
    result.companyUuid = entityUuid
    return result
  }
  if (companyType === "parent") {
    result.parentUuid = entityUuid
    return result
  }
  if (companyType === "supplier" || !StringUtils.isNullUndefinedOrEmpty(entityUuid)) {
    result.entityUuid = entityUuid
  }

  return result
}

export async function sendEmailForHelp(
  firstName: string,
  surname: string,
  email: string,
  subject: string,
  content: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/email/help";
  const formData = new FormData();
  formData.append("firstName", firstName);
  formData.append("surname", surname);
  formData.append("email", email);
  formData.append("subject", subject);
  formData.append("content", content);

  try {
    response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function postSpendFile(
  file: any,
  companyUUID: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/spend_files";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("companyUUID", companyUUID);
  try {
    response = await axios.post(url, formData, {
      headers: {
        "Content-type": "multipart/form-data",
      },
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getMediaFileVersion(
  versionID: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + versionID + "/download";

  try {
    response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "Content-type": "application/xlsx",
      },
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getValuesForCreditRating(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/credit_score_references/list";
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function getCompanyFinancialData(
  companyId: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + companyId + "/financial_data";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function getMaxDateSpendFileVersion(
  spendfileVersionUuii: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/spendFileVersion/" +
    spendfileVersionUuii +
    "/get_max_end_date_spend";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function deleteCompanyFinancialData(
  companyId: string,
  years: Array<string>,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + companyId + "/financial_data";

  try {
    response = await axios.delete(url, {
      data: {
        years: years,
      },
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function postCompanyFinancialData(
  companyId: string,
  financialData: Array<any>,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + companyId + "/financial_data";

  try {
    response = await axios.post(url, financialData, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

export async function changeCurrency(
  currencyTo: string,
  date: string,
): Promise<ApiResponse> {
  let response = null;

  // always convert from USD
  const params = {
    from: "USD",
    to: currencyTo,
    date: date,
  };
  const url = getBaseApi() + "/api/externals-apis/currency-layer/convert";
  try {
    if (currencyTo === "USD") {
      response = { result: 1 };
    } else {
      response = await axios.post(url, params, {});
    }
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "CHANGE CURRENCY");
}

export async function currencyList(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/externals-apis/currency-layer/list";
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "Currency List");
}

export async function currencyListDatabase(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/externals-apis/currency-layer/list/database";
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "Currency List");
}

export async function getResultAnalysisReferenceDate(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/setup/result-analysis/reference-date";
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET Result Analysis Reference Date");
}

export async function patchResultAnalysisReferenceDate(referenceDate: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/setup/result-analysis/reference-date";
  try {
    response = await axios.patch(url, { referenceDate }, {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "PATCH Result Analysis Reference Date");
}

/**
 * post reponse to save buyer standard group(s)
 * @param companyUUID
 * @param groups
 */
export async function saveBuyerStandardGroups(
  companyUUID: string,
  groups: Array<any>,
  deletedGroups: Array<any>,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/update-buyer-standard";

  const groupsSelected = groups.map((group: any, index: any) => {
    // Create a copy of the group object
    let newGroup = {
      ...group,
      buyerStandardRules: [...group.buyerStandardRules],
    };
    newGroup.priority = index + 1;

    newGroup.buyerStandardRules = newGroup.buyerStandardRules.map(
      (item: any) => {
        // Create a copy of the item object
        let newItem = { ...item };

        if (newItem.field === "SPEND_VOLUME") {
          if (newItem.level !== null && newItem.level.length > 0) {
            if (newItem.level === "spend") {
              newItem.level = "SPEND";
            }
            if (newItem.level === "supplier") {
              newItem.level = "PROVIDER";
            }
            if (newItem.level === "parent") {
              newItem.level = "PARENT";
            }
          }
        }
        if (newItem.field === "SME") {
          let smeBool = newItem.multi[0] === "true";
          if (smeBool) {
            newItem.multi = null;
            delete newItem.values;
            newItem.filterOne = {
              operator: "isEqualTo",
              value: true,
            };
          } else {
            newItem.multi = null;
            newItem.filterOne = {
              operator: "isNotEqualTo",
              value: false,
            };
            delete newItem.values;
          }
          if (newItem.level === "supplier") {
            newItem.level = "PROVIDER";
          }
        }

        return newItem;
      },
    );

    return newGroup;
  });

  const params = {
    company: companyUUID,
    groupsDeleted: deletedGroups,
    groups: groupsSelected,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST save buyer standard groups");
}

export async function getInfoVcard(company: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/vcard/setup/${removeIRI(company)}`;
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET SAVED BUYER STANDARD GROUPS");
}

export async function getInfoExcludedGroups(
  spendfileUUID: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/spend_file_versions/${removeIRI(spendfileUUID)}/payment_term_extension_exclusion_groups`;
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET SAVED BUYER STANDARD GROUPS");
}

export async function saveVCardsValues({
  company,
  vCardGroupsEnabled,
  vCardProvider,
  acceptanceTypes,
  groupsDeleted,
  groups,
  vCardDefaultEnrollment,
  vCardAllowsTermsExtension,
  vCardMinimumProbabilityOfSuccess,
}: {
  company: string;
  vCardGroupsEnabled: boolean;
  vCardProvider: string;
  acceptanceTypes: Array<any>;
  groupsDeleted: Array<any>;
  groups: Array<any>;
  vCardDefaultEnrollment: number;
  vCardAllowsTermsExtension: boolean;
  vCardMinimumProbabilityOfSuccess: number;
}): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/vcard/save-setup/${removeIRI(company)}`;

  const groupsSelected = groups.map((group: any, index: any) => {
    // Create a copy of the group object
    let newGroup = { ...group, vCardGroupRules: [...group.vCardGroupRules] };
    newGroup.priority = index + 1;

    newGroup.vCardGroupRules = newGroup.vCardGroupRules.map((item: any) => {
      // Create a copy of the item object
      let newItem = { ...item };

      if (newItem.field === "SPEND_VOLUME") {
        if (newItem.level !== null && newItem.level.length > 0) {
          if (newItem.level === "spend") {
            newItem.level = "SPEND";
          }
          if (newItem.level === "supplier") {
            newItem.level = "PROVIDER";
          }
          if (newItem.level === "parent") {
            newItem.level = "PARENT";
          }
        }
      }
      if (newItem.field === "SME") {
        let smeBool = newItem.multi[0] === "true";
        if (smeBool) {
          newItem.multi = null;
          delete newItem.values;
          newItem.filterOne = {
            operator: "isEqualTo",
            value: true,
          };
        } else {
          newItem.multi = null;
          newItem.filterOne = {
            operator: "isNotEqualTo",
            value: false,
          };
          delete newItem.values;
        }
        if (newItem.level === "supplier") {
          newItem.level = "PROVIDER";
        }
      }

      return newItem;
    });

    return newGroup;
  });

  const params = {
    company,
    vCardGroupsEnabled,
    vCardProvider,
    acceptanceTypes,
    groupsDeleted,
    groups: groupsSelected,
    vCardDefaultEnrollment,
    vCardAllowsTermsExtension,
    vCardMinimumProbabilityOfSuccess,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST save buyer standard groups");
}

export async function postInfoExcludedGroups(
  spendfileUUID: string,
  groupsDeleted: Array<any>,
  groups: Array<any>,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/payment-terms/create-update-payment-term-extension-exclusion-group`;

  const groupsSelected = groups.map((group: any, index: any) => {
    // Create a copy of the group object
    let newGroup = { ...group, groupRules: [...group.groupRules] };
    newGroup.priority = index + 1;

    newGroup.groupRules = newGroup.groupRules.map((item: any) => {
      // Create a copy of the item object
      let newItem = { ...item };

      if (newItem.field === "SPEND_VOLUME") {
        if (newItem.level !== null && newItem.level.length > 0) {
          if (newItem.level === "spend") {
            newItem.level = "SPEND";
          }
          if (newItem.level === "supplier") {
            newItem.level = "PROVIDER";
          }
          if (newItem.level === "parent") {
            newItem.level = "PARENT";
          }
        }
      }
      if (newItem.field === "SME") {
        let smeBool = newItem.multi[0] === "true";
        if (smeBool) {
          newItem.multi = null;
          delete newItem.values;
          newItem.filterOne = {
            operator: "isEqualTo",
            value: true,
          };
        } else {
          newItem.multi = null;
          newItem.filterOne = {
            operator: "isNotEqualTo",
            value: false,
          };
          delete newItem.values;
        }
        if (newItem.level === "supplier") {
          newItem.level = "PROVIDER";
        }
      }

      return newItem;
    });

    return newGroup;
  });

  const params = {
    spendFileVersions: removeIRI(spendfileUUID),
    groupsDeleted,
    groups: groupsSelected,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST save buyer standard groups");
}

/**
 * get saved buyer standard groups
 *
 */
export async function getBuyerStandardGroups(
  companyUUID: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/companies/${removeIRI(companyUUID)}/buyer_standard_groups`;
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET SAVED BUYER STANDARD GROUPS");
}

/** Get groups for metrics component */
export async function getCategoriesData(
  spendFileUUID: string,
  section: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/statistics/getCategoriesData/${removeIRI(spendFileUUID)}/${section}`;

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET METRICS GROUPS");
}

/**
 * get saved buyer standard groups
 *
 */
export async function retrieveStrategies(
  spendUUID: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/spendfile/strategies/allowed-status`;
  try {
    response = await axios.get(url, { params: { spendUUID } });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET STRATEGIES CONFIG");
}

/**
 * You can  request  get or patch
 * In Company Settings, Payment Cycle Tab,
 * send POST request to update payment cycle
 * @param paymentCycle
 * @param companyUiid
 * @returns
 */
export async function postCompanySettings(
  paymentCycle: number | null,
  financingStrategyMethod: string | null,
  companyUiid: string,
  method: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/companies/${companyUiid}`;
  const params = {
    paymentCycleDays: paymentCycle,
    financingStrategyMethod: financingStrategyMethod,
  };

  if (method.toLowerCase() === "patch") {
    try {
      response = await axios.patch(url, params, {
        headers: {
          "Content-Type": "application/merge-patch+json",
        },
      });
    } catch (e: any) {
      response = e.response;
    }
  } else {
    try {
      response = await axios.get(url, {
        headers: {},
      });
    } catch (e: any) {
      response = e.response;
    }
  }

  return giveAnswer(
    response,
    method === "get" ? "GET Payment Cycle Float" : "PATCH Payment Cycle Float",
  );
}

/**
 * WI#18968: read one spend file version. Used by the Cash Flow settings section to read the frozen
 * 9-box limits, which live on the version and change on a recalculation. Reading them from the user
 * profile in the store instead showed nothing until a full page reload: that payload is fetched once
 * per session, so a recalculation never reached it. Identity still comes from the store - the active
 * version's uuid only changes when the user switches spend file, and that path refreshes the store.
 */
export async function getSpendFileVersion(
  spendFileVersionId: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/spend_file_versions/${removeIRI(spendFileVersionId)}`;

  try {
    response = await axios.get(url);
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "GET Spend File Version");
}

/**
 * WI#19582: replaces one 9-box's limits and queues the reclassification of that box's entities.
 *
 * Answers 202, not a result: the work runs on the 9-box queue, so the caller shows "in progress" and
 * re-reads the limits when the recalculation finishes.
 */
export async function postNineBoxThresholds(
  spendFileVersionId: string,
  payload: NineBoxThresholdRequest,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/spend_file_versions/${removeIRI(spendFileVersionId)}/nine_box_thresholds`;

  try {
    response = await axios.post(url, payload);
  } catch (e: any) {
    response = e.response;
  }

  const answer = giveAnswer(response, "POST Nine Box Thresholds");

  // giveAnswer only counts 200/201/204 as success (services/api/response.ts:36-42) and this endpoint
  // answers 202 — the job is queued, not done. Without this the caller reads an accepted job as a
  // failure: it toasts an error and leaves the modal open while the recalculation is already running.
  return answer.code === 202 ? { ...answer, success: true } : answer;
}

/**
 * AB#86ak0mkx0: reads a spend file's Buyer Leverage Limits. Dedicated endpoint (not part of the
 * general SpendFileVersion read) - Super Admin/Data only, refused outright for anyone else.
 */
export async function getBuyerLeverageLimits(
  spendFileVersionId: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/spend_file_versions/${removeIRI(spendFileVersionId)}/buyer_leverage_limits`;

  try {
    response = await axios.get(url);
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "GET Buyer Leverage Limits");
}

/**
 * AB#86ak0mkx0: saves a spend file's Buyer Leverage Limits and queues a full recalculation.
 *
 * Answers 202, not a result: the recalculation runs async, so the caller shows "recalculating" and
 * re-reads the limits once it finishes.
 */
export async function postBuyerLeverageLimits(
  spendFileVersionId: string,
  payload: BuyerLeverageLimitsRequest,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    `/api/spend_file_versions/${removeIRI(spendFileVersionId)}/buyer_leverage_limits`;

  try {
    response = await axios.post(url, payload);
  } catch (e: any) {
    response = e.response;
  }

  const answer = giveAnswer(response, "POST Buyer Leverage Limits");

  // giveAnswer only counts 200/201/204 as success (services/api/response.ts:36-42) and this endpoint
  // answers 202 - the recalculation is queued, not done yet.
  return answer.code === 202 ? { ...answer, success: true } : answer;
}

export async function patchSpendFileVersionADPVisibility(
  spendFileVersionId: string,
  hideAverageDaysPaid: boolean,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/spend_file_versions/${spendFileVersionId}`;
  const params = { hideAverageDaysPaid };

  try {
    response = await axios.patch(url, params, {
      headers: { "Content-Type": "application/merge-patch+json" },
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "PATCH ADP Visibility");
}

export async function postConfigStrategies(
  spendUUID: string,
  strategies: Array<any>,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/spendfile/strategies/allowed/update`;
  const params = {
    spendUUID: spendUUID,
    strategies: strategies,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}

export async function getCappedTable(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/entity-card/strategies/cappedTerms/table`;

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}

/***
 * To get chart data based on category and metric option selected
 * will send the filter globalFilter as a string if its not null, if null
 * it will remove the property from the filter object
 */
export async function postChartData({
  spendFileUUID,
  groupName,
  optionName,
  chartType,
  programUUID,
  globalFilter,
  fullDisabled,
  place,
  view,
}: {
  spendFileUUID: string;
  groupName: string;
  optionName: string;
  chartType: string;
  programUUID: string | null;
  globalFilter: any;
  fullDisabled: boolean;
  place: string;
  view: string;
}): Promise<ApiResponse> {
  // Defense-in-depth: validate program belongs to the active SFV
  if (!isProgramSfvConsistent(programUUID, spendFileUUID)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;
  const url = getBaseApi() + "/api/statistics/get-chart-data";
  const currencyNumberVal = useAppStore().getCurrencyAmount;

  const params = programUUID
    ? {
        filters: {
          targetSpendFileVersionUuid: removeIRI(spendFileUUID),
          targetProgramUuid: removeIRI(programUUID),
          currencyRate: currencyNumberVal,
          globalFilter,
          fullDisabled,
        },
        groupName: groupName,
        optionName: optionName,
        chartType: chartType,
        place,
        view,
      }
    : {
        filters: {
          targetSpendFileVersionUuid: removeIRI(spendFileUUID),
          currencyRate: currencyNumberVal,
          globalFilter,
        },
        groupName: groupName,
        optionName: optionName,
        chartType: chartType,
        place,
        view,
      };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}

export async function exportData(
  level: string,
  filters: string | null,
  section: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/" + section + "/" + level + "/export";
  const params = {
    filters,
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}

/**
 * Result of a server-side grid Excel export request (WI#17234).
 * - `file`: the dataset was under the sync threshold; `blob` is the ready `.xlsx`.
 * - `job`:  the dataset was above the threshold; the export runs async — track `jobId`
 *           via Firestore (realtime) or {@link getGridExportStatus} (polling fallback).
 * - `error`: the request failed.
 */
export interface GridExportXlsxResult {
  kind: "file" | "job" | "error";
  blob?: Blob;
  jobId?: string;
  error?: any;
}

/**
 * Trigger the server-side `.xlsx` export. The backend streams the file directly (HTTP 200)
 * under the row threshold, or returns `202 { jobId }` and produces it asynchronously above it.
 * Because the body can be either a binary file or a small JSON envelope we always request a
 * blob and disambiguate by status code.
 */
export async function exportDataXlsx(
  level: string,
  section: string,
  filters: any,
  columns: Array<any>,
  fileName: string,
  rowCount: number,
): Promise<GridExportXlsxResult> {
  // Encode the path segments so section/level can never inject path-traversal sequences.
  const url = getBaseApi() + "/api/" + encodeURIComponent(section) + "/" + encodeURIComponent(level) + "/export/xlsx";
  const body = { filters, columns, fileName, rowCount, format: "xlsx" };
  try {
    const response = await axios.post(url, body, { responseType: "blob" });
    if (response.status === 202) {
      const text = await (response.data as Blob).text();
      const json = JSON.parse(text);
      return { kind: "job", jobId: json.jobId };
    }
    if (response.status === 200) {
      return { kind: "file", blob: response.data as Blob };
    }
    // Any other status (e.g. 4xx/5xx when the Axios instance does not throw) is not a valid file.
    return { kind: "error", error: new Error(`Unexpected export status ${response.status}`) };
  } catch (e: any) {
    return { kind: "error", error: e };
  }
}

/**
 * Poll the status of an asynchronous grid export job (fallback when the Firestore
 * realtime subscription is unavailable).
 */
export async function getGridExportStatus(jobId: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/grid-exports/" + encodeURIComponent(jobId) + "/status";
  try {
    response = await axios.get(url);
  } catch (e: any) {
    // On network errors (timeout/DNS/CORS) e.response is undefined — return an explicit failure so
    // the caller's failure counter advances instead of mis-parsing an undefined response.
    if (!e?.response) {
      return { success: false, code: 0, data: null };
    }
    response = e.response;
  }
  return giveAnswer(response, "Get Grid Export Status");
}

/** Internal: the one-time tokenized download URL for an async grid export (used by getGridExportFile). */
function getGridExportDownloadUrl(token: string): string {
  return getBaseApi() + "/api/grid-exports/download/" + encodeURIComponent(token);
}

/**
 * Fetch the tokenized grid-export file as a blob (one-time download) so it can be saved via a reliable
 * same-origin `blob:` URL — the cross-origin anchor approach fails for `text/csv` (rendered inline).
 * Returns the blob and the server-set filename from Content-Disposition (correct `.csv`/`.xlsx`).
 */
export async function getGridExportFile(token: string): Promise<{ blob: Blob; fileName?: string }> {
  const response = await axios.get(getGridExportDownloadUrl(token), { responseType: "blob" });
  return { blob: response.data as Blob, fileName: readContentDispositionFilename(response.headers) };
}

/**
 * Cancel an in-flight async grid export so the backend worker aborts (no file, no notification).
 * Best-effort: resolves to false on any failure (the FE still moves the task to a cancelled state).
 */
export async function cancelGridExport(jobId: string): Promise<boolean> {
  const url = getBaseApi() + "/api/grid-exports/" + encodeURIComponent(jobId) + "/cancel";
  try {
    await axios.post(url, {});
    return true;
  } catch {
    return false;
  }
}

export async function getDataColumnsGridFilterSelect(
  search: string,
  from: number,
  orderBy: string,
  orderDirection: string,
  filters: Array<any>,
): Promise<ApiResponse> {  
  let response = null;
  const url = getBaseApi() + "/api/filters/program/suppliers/unique/volume";

  const params = {
    search: search,
    skip: from,
    orderBy: orderBy,
    orderDirection: orderDirection,
    filters: filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Elastic Search Providers");
}

interface GetUniqueDataParams {
  level: string;
  field: string;
  currencyRate: number;
  targetProgramUuid: string | null;
  targetPlanUuid: string | null;
  targetPhaseUuid: string | null;
  section: string;
  globalFilter: any;
  activeSpendFileVersion: string | null;
  targetOperation: null;
  summaryOperation: string;
  telerikFilter: any;
  summary: any;
  fullDisabled?: boolean;
  searchingText?: string;
  companyType?: string;
  entityUuid?: string;
  companyUuid?: string;
  groupUuid?: string;
  summaryAction?: string;
  first?: number;
  after?: number;
  chartsFilter?: any;
  vCardBoxExist?: boolean;
}

export async function getUniqueData({
  level,
  field,
  currencyRate,
  targetProgramUuid,
  targetPlanUuid,
  targetPhaseUuid,
  section,
  globalFilter,
  activeSpendFileVersion,
  targetOperation,
  summaryOperation,
  telerikFilter,
  summary,
  fullDisabled,
  searchingText = "",
  companyType = "",
  entityUuid = "",
  companyUuid = "",
  groupUuid = "",
  summaryAction = "",
  first,
  after,
  chartsFilter,
  vCardBoxExist,
}:GetUniqueDataParams): Promise<ApiResponse> {
  // Defense-in-depth: validate program belongs to the active SFV
  //- This api not always get the program uuid
  if (section !== 'plan' && section !== 'analyze' && section !== 'match' && section !== 'adminBackend' && section !== 'home') {
    if (!isProgramSfvConsistent(targetProgramUuid, activeSpendFileVersion)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  }

  

  let response = null;

  let url = "";
  if (targetOperation) {
    url =
      getBaseApi() +
      "/api/filters/" +
      section +
      "/" +
      level +
      "/" +
      summaryOperation +
      "/" +
      field +
      "/" +
      targetOperation;
  } else {
    url =
      getBaseApi() +
      "/api/filters/" +
      section +
      "/" +
      level +
      "/" +
      summaryOperation +
      "/" +
      field;
  }

  if (telerikFilter && summaryOperation === "summary") {
    url =
      getBaseApi() +
      "/api/filters/" +
      section +
      "/" +
      level +
      "/" +
      summaryOperation;
  }

  interface Filter {
    currencyRate: number;
    targetProgramUuid: string | null;
    targetPlanUuid: string | null;
    targetPhaseUuid: string | null;
    globalFilter: any;
    targetSpendFileVersionUuid: string;
    telerikFilter: any;
    fullDisabled?: boolean;
    searchText: string;
    parentUuid?: string;
    entityUuid?: string;
    companyUuid?: string;
    groupUuid?: string;
    action?: string;
    first?: number;
    after?: number;
    chartsFilter?: any;
    "vCardBox:exists"?: boolean;
  }

  let filters: Filter = {
    currencyRate: currencyRate,
    targetProgramUuid,
    targetPlanUuid,
    targetPhaseUuid,
    globalFilter,
    targetSpendFileVersionUuid: removeIRI(activeSpendFileVersion),
    telerikFilter,    
    searchText: searchingText,
    action: summaryAction,
    first: first,
    after: after,
    chartsFilter: chartsFilter
  };

  if (vCardBoxExist !== undefined) {
    filters["vCardBox:exists"] = vCardBoxExist;
  }

  if (!StringUtils.isNullUndefinedOrEmpty(fullDisabled) ) {
    filters.fullDisabled = fullDisabled;
  }

  Object.assign(filters, determineCompanyUuidFilters(companyUuid, entityUuid, companyType, level, groupUuid));

  const params = {
    filters,
    summary,
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}
export async function validateGlobalFilters({
  section,
  globalFilter,
  currencyRate,
  targetSpendFileVersionUuid,
  targetProgramUuid,
}: {
  section: string;
  globalFilter: any;
  currencyRate: number;
  targetSpendFileVersionUuid: string | null;
  targetProgramUuid?: string | null | undefined;
}): Promise<ApiResponse> {
  const url = getBaseApi() + "/api/" + section + "/test_filter";

  let response = null;

  const params = {
    filters: {
      globalFilter,
      currencyRate,
      targetSpendFileVersionUuid: targetSpendFileVersionUuid
        ? removeIRI(targetSpendFileVersionUuid)
        : null,
      targetProgramUuid: targetProgramUuid || null,
    },
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e) {
    // @ts-ignore
    response = e.response;
  }
  return giveAnswer(response, "Post Global Search Results");
}

export async function exportCSV(
  collection: string,
  filters: any,
  columns: any[],
  planId: string,
  phaseId: string,
  title: string,
  level: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/export/csv";
  const currencyRate: number = useAppStore().getCurrencyAmount;
  const filters_grid = {
    telerikFilter: removeIRI(filters),
    targetPlanUuid: planId,
    targetPhaseUuid: phaseId ?? "all",
    globalFilter: removeIRI(
      JSON.stringify(useGlobalFiltersStore().getFiltersApplied),
    ),
    currencyRate,
  };

  try {
    response = await axios.post(url, {
      collection,
      filters: filters_grid,
      columns,
      level,
      section: "plan",
    });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "EXPORT CSV");
}

// =====================================
// News Configuration API
// =====================================

/**
 * Get news configuration for the current user's company
 * @returns Promise<ApiResponse> Configuration data or default values
 */
export async function getNewsConfig(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/company/news-config";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET News Config");
}

/**
 * Get news configuration optimized for query construction
 * Falls back to defaults if retrieval fails
 * @returns Promise<ApiResponse> Configuration data for building queries
 */
export async function getNewsConfigForQuery(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/company/news-config/get-terms";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET News Config for Query");
}

/**
 * Save news configuration for the current user's company
 * Requires administrator permissions
 * @param config Configuration data to save
 * @returns Promise<ApiResponse> Success or error response
 */
export async function saveNewsConfig(config: {
  generalNews: {
    keywords: string;
    selectedTerms: string[];
    additionalTerms: string;
  };
  supplierNews: {
    selectedEntities: string[];
    selectedTerms: string[];
    additionalTerms: string;
  };
}): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/company/news-config";

  try {
    response = await axios.put(url, config, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "PUT News Config");
}

/**
 * Get default news configuration values and constants
 * @returns Promise<ApiResponse> Default configuration and constants
 */
export async function getNewsConfigDefaults(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/company/news-config/defaults";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET News Config Defaults");
}