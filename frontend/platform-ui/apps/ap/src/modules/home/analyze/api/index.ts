import { ApiResponse, giveAnswer } from "@/services/api/response";
import { useAppStore } from "@/stores/app";
import axios from "@/utils/axios";
import { getUrlWithQueryParams } from "@/services/api/apiServices";
import { removeIRI } from "@/utils";
import { KeyValue } from "@/types";
import { getBaseApi } from "@/utils/getBaseApi";
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";
import {  mapCompanyTypeForAllLevels } from "@/utils/levelOfGrid";

export async function deleteFinancingGroup(
  financingGroupId: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + financingGroupId;

  try {
    response = await axios.delete(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "DELETE Financing Group");
}

/**
 *
 * @returns data for waterfall chart
 */

export async function getWaterfallDataForChart(
  spendFileVersion: string,
  programUUID: string,
  globalFilters: any,
): Promise<ApiResponse> {
  if (!isProgramSfvConsistent(programUUID, spendFileVersion)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;
  const url = getBaseApi() + "/api/analyze/program/waterfall-chart";
  const currencyNumberVal = useAppStore().getCurrencyAmount;
  const params = {
    filters: {
      currencyRate: currencyNumberVal,
      globalFilter: globalFilters,
      targetProgramUuid: removeIRI(programUUID),
      targetSpendFileVersionUuid: removeIRI(spendFileVersion),
      fullDisabled: false,
    },
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET WATERFALL DATA");
}

/***
 *
 * get Potential Payment Terms for Waterfall Chart
 *
 */

/**
 * get custom header titles
 * @param spendFileVersion
 * @returns
 */
export async function getCustomHeaderColumnsTitle(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/spendfile/get-custom-data-points";
  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET CUSTOM HEADERS TITLES");
}

export async function deleteHarmonizationGroup(
  harmonizationGroupId: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + harmonizationGroupId;

  try {
    response = await axios.delete(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "DELETE HARMONIZATION GROUP");
}

export async function deleteProgram(programId: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/" + removeIRI(programId);

  try {
    response = await axios.delete(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "DELETE PROGRAM");
}

export async function deleteProgramUser(
  programUserConfigurationId: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + programUserConfigurationId;

  try {
    response = await axios.delete(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "DELETE PROGRAM");
}

export async function deleteProgramSpendConfiguration(
  programSpendConfigurationId: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + programSpendConfigurationId;

  try {
    response = await axios.delete(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "DELETE PROGRAM");
}

export async function getAllPrograms(
  marked: boolean,
  scope: string,
  firstName: string | null,
  lastName: string | null,
  spendFileVersion: string | null,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  let response = null;

  const queryParams = [{ value: firstName, query: "createdBy.firstName=" }];
  const url = getUrlWithQueryParams(
    getBaseApi() +
      "/api/spend_file_versions/" +
      spendFileVersion +
      "/analyze_programs",
    queryParams,
  );

  try {
    response = await axios.get(url, {
      signal,
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET ALL PROGRAMS");
}

export async function getProgram(programId: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/" + removeIRI(programId);

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM");
}

export async function getProgramPost(
  programId: string,
  globalFilter: any,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/" + removeIRI(programId);

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
  };
  const params = {
    filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM");
}

export async function getProgramPotentialsPost(
  programId: string,
  globalFilter: any,
  targetSpendFileVersionUuid: any | null,
  fullDisabled: boolean,
): Promise<ApiResponse> {
  if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/potentials-cost";

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
    targetProgramUuid: removeIRI(programId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid),
    fullDisabled,
  };
  const params = {
    filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET Program Potentials");
}

export async function getRuleFiltersPossibilities(
  spendFileVersionUUID: string,
): Promise<ApiResponse> {
  let response = null;

  const url = getBaseApi() + "/api/rules/get-fields-data";

  const params = {
    spendFileVersionUUID: removeIRI(spendFileVersionUUID),
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET Filter Possibilities");
}

export async function getFinancingGroups(
  programId: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/analyze/programs/" +
    removeIRI(programId) +
    "/financing_groups";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET Financing groups");
}

export async function getCardsDataVcardOpportunity(
  filters: Array<any>,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/vcard/opportunity";

  const params = {
    filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET Financing groups");
}

export async function getProgramPaymentTerms(
  programId: string,
  globalFilter: any,
  targetSpendFileVersionUuid: any | null,
  fullDisabled: boolean,
): Promise<ApiResponse> {
  if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/payment-terms";

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
    targetProgramUuid: removeIRI(programId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid),
    fullDisabled,
  };
  const params = {
    filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM PAYMENT TERMS");
}
export async function getProgramDistribution(
  programId: string,
  globalFilter: any,
  targetSpendFileVersionUuid: any | null,
  fullDisabled: boolean,
): Promise<ApiResponse> {
  if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/program-distribution";

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
    targetProgramUuid: removeIRI(programId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid),
    fullDisabled,
  };
  const params = {
    filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM PAYMENT TERMS");
}

export async function getProgramSpendInfo(
  programId: string,
  globalFilter: any,
  targetSpendFileVersionUuid: any | null,
  fullDisabled: boolean,
): Promise<ApiResponse> {
  if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/spend-info";

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
    targetProgramUuid: removeIRI(programId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid),
    fullDisabled,
  };
  const params = {
    filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM PAYMENT TERMS");
}

export async function getProgramTermGroups(
  programId: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/analyze/programs/" +
    removeIRI(programId) +
    "/harmonization_groups";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM TERM GROUPS");
}

export async function getSpendsbySupplier(
  supplierUUID: string,
  programUUID: string,
  disabled: boolean,
  level: string | null,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/get_spends_by_program_and_provider";
  const params = {
    supplierUUID: supplierUUID,
    programUUID: programUUID,
    disabled: disabled,
    level: level,
    currencyRate: useAppStore().getCurrencyAmount,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response);
}

/**
 * get data for nine boxes after the level is selected
 * default level is spend
 * @param programId {string}
 * @param levelSelected {string}
 *
 */

export async function nineBoxesDataAPIReadAll({
  filters,
  level,
  type9boxes,
}: {
  filters: {
    programId: string;
    disabled: boolean;
    globalFilter: string;
    spendFileVersionId: string;
    currencyRate: number;
  };
  level: string;
  type9boxes: string;
}): Promise<ApiResponse> {
  // Initialize
  const {
    programId,
    disabled,
    globalFilter,
    spendFileVersionId,
    currencyRate,
  } = filters;

  if (!isProgramSfvConsistent(programId, spendFileVersionId)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;

  let params = null;

  let url = "";

  //Terms extension
  if (type9boxes === "cashFlow") {
    url = getBaseApi() + "/api/analyze/get-nine-boxes-terms-extension-data";
  }

  //Financing
  if (type9boxes === "financing") {
    url = getBaseApi() + "/api/analyze/get-nine-boxes-financial-data";
  }

  if (type9boxes === "scf9Box") {
    url = getBaseApi() + "/api/analyze/get-nine-boxes-scf-data";
  }

  // Vcard
  if (type9boxes === "vcard") {
    url = getBaseApi() + "/api/analyze/get-nine-boxes-vcard-data";
  }

  params = {
    filters: {
      targetProgramUuid: removeIRI(programId),
      fullDisabled: disabled,
      globalFilter,
      targetSpendFileVersionUuid: removeIRI(spendFileVersionId),
      currencyRate,
    },
    level,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "POST - Get all nine boxes data");
}

export async function patchFinancingGroup(
  financingGroupId: string,
  name: string,
  periodInMonths: number,
  baseRateType: string,
  baseRate: number,
  fundingSpread: number,
  color: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + financingGroupId;
  const params = {
    name: name,
    periodInMonths: periodInMonths,
    baseRateType: baseRateType,
    baseRate: baseRate,
    fundingSpread: fundingSpread,
    color: color,
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
  return giveAnswer(response, "PATCH Financing Group");
}

export async function patchHarmonizationGroup(
  harmonizationGroupId: string,
  name: string,
  paymentTermsWithoutCashDiscountDays: number,
  paymentTermsWithCashDiscountDays: number,
  cashDiscount: number,
  color: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + harmonizationGroupId;
  const params = {
    name: name,
    paymentTermsWithoutCashDiscountDays: paymentTermsWithoutCashDiscountDays,
    paymentTermsWithCashDiscountDays: paymentTermsWithCashDiscountDays,
    cashDiscount: cashDiscount,
    color: color,
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
  return giveAnswer(response, "PATCH HARMONIZATION GROUP");
}

export async function patchProgramRecentlyCreated(
  programId: string,
  isRecentlyCreated: boolean,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/" + removeIRI(programId);
  const params = {
    isRecentlyCreated: isRecentlyCreated,
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
  return giveAnswer(response, "PATCH PROGRAM");
}

export async function changeActiveStatus(
  programId: string,
  activeProgram: boolean,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/" + removeIRI(programId);
  const params = {
    isActive: activeProgram,
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
  return giveAnswer(response, "PATCH PROGRAM");
}

export async function patchProgram(
  programId: string,
  name: string,
  programTarget: string,
  spendFileVersion: string,
  marked: boolean,
  termHarmonizationEnabled: boolean,
  externalFinancingEnabled: boolean,
  cashDiscountEnabled: boolean,
  automateHarmonizationTerms: boolean,
  topLeftChart: string | null,
  topRightChart: string | null,
  bottomLeftChart: string | null,
  bottomRightChart: string | null,
  processingTotal: boolean,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/programs/" + removeIRI(programId);
  const params = {
    name: name,
    programTarget: programTarget,
    spendFileVersion: spendFileVersion,
    marked: marked,
    termHarmonizationEnabled: termHarmonizationEnabled,
    externalFinancingEnabled: externalFinancingEnabled,
    cashDiscountEnabled: cashDiscountEnabled,
    automateHarmonizationTerms: automateHarmonizationTerms,
    topLeftChart: topLeftChart,
    topRightChart: topRightChart,
    bottomLeftChart: bottomLeftChart,
    bottomRightChart: bottomRightChart,
    processingTotal: processingTotal,
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
  return giveAnswer(response, "PATCH PROGRAM");
}

export async function patchProgramSpendConfiguration(
  spendProgramConfigurationId: string,
  harmonizationGroup: string,
  financingGroup: string,
  disabled: boolean,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + spendProgramConfigurationId;
  const params = {
    harmonizationGroup: harmonizationGroup,
    financingGroup: financingGroup,
    disabled: disabled,
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
  return giveAnswer(response, "PATCH Program Spend Configuration");
}

export async function getProgramSpendConfiguration(
  spendProgramConfigurationId: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + spendProgramConfigurationId;

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM");
}

export async function postProgramSpendConfigurations(
  spendProgramConfigurations: [],
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/spend-configurations";
  const params = {
    configurations: spendProgramConfigurations,
  };

  try {
    response = await axios.post(url, params, {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "PATCH Program Spend Configurations");
}

export async function postAnalyzePrograms(
  name: string,
  programTarget: string,
  spendFileVersion: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/programs";
  const params = {
    name: name,
    programTarget: programTarget,
    spendFileVersion: spendFileVersion,
    approach: "proposed",
    topLeftChart: "averagePaymentTermsPerBuyingEntity",
    topRightChart: "averagePaymentTermsPerCountry",
    bottomLeftChart: "cashFlowOpportunityPerCountry",
    bottomRightChart: "cashFlowOpportunityPerBuyingEntity",
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST ANALYZE PROGRAMS");
}

export async function postUpdateHarmonizationgGroups(
  program: string,
  termHarmonizationEnabled: boolean,
  groupsDeleted: Array<any>,
  groups: Array<any>,
  data: Array<any>,
  roundOn: string,
  automateHarmonizationTerms: boolean,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/update-harmonization-program";
  const params = {
    program: program,
    termHarmonizationEnabled: termHarmonizationEnabled,
    automateHarmonizationTerms: automateHarmonizationTerms,
    groupsDeleted: groupsDeleted,
    groups: groups,
    roundOn: roundOn,
    data,
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST ANALYZE PROGRAMS");
}

export async function postUpdateFinancingGroups(
  program: string,
  externalFinancingEnabled: boolean,
  automateFinancingTerms: boolean,
  groupsDeleted: Array<any>,
  groups: Array<any>,
  approvalTimeSource: string,
  approvalTime: number,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/update-financing-program";
  const params = {
    program: program,
    externalFinancingEnabled: externalFinancingEnabled,
    automateFinancingTerms: automateFinancingTerms,
    groupsDeleted: groupsDeleted,
    groups: groups,
    approvalTimeSource: approvalTimeSource,
    approvalTime: approvalTime,
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST ANALYZE PROGRAMS");
}

export async function postProgramSpendConfigurationbyGroups(
  program: string,
  changed: Array<any>,
  uuids: Array<any>,
  value: string,
  filters: Array<any> | null,
  level: string,
  all: boolean,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/update-spend-program-configurations";
  const convertLevel = mapCompanyTypeForAllLevels(level)
  const params = {
    program,
    changed,
    uuids,
    value,
    filters,
    level: convertLevel,
    all,
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Generate harmonization group");
}

export async function spendProgramConfigurationAPIUpdate({
  filters,
  changed,
  uuids,
  level,
  all,
  entity,
  entityType,
}: {
  filters: {
    targetSpendFileVersionUuid: string;
    targetProgramUuid: string;
    currencyRate: number;
  };
  changed: KeyValue<string, number | null>;
  uuids: string[];
  level: "spends" | "suppliers" | "parents";
  all: boolean;
  entity: string;
  entityType: string;
}): Promise<ApiResponse> {
  if (
    !isProgramSfvConsistent(
      filters.targetProgramUuid,
      filters.targetSpendFileVersionUuid,
    )
  ) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;
  const url = getBaseApi() + "/api/analyze/update-spend-program-configurations";

  const convertLevel = mapCompanyTypeForAllLevels(level)

  const params = {
    filters,
    changed,
    uuids,
    level: convertLevel,
    all,
    ...(entityType === "parent" && { parentUuid: entity }),
    ...(entityType === "supplier" && { supplierUuid: entity }),
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response, "POST Spend program configuration");
}

export async function getValidateName(
  programName: string,
  selectedSpendFileVersion: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/analyze/programs?name=" +
    programName +
    "&spendFileVersion.uuid=" +
    removeIRI(selectedSpendFileVersion);

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM TERM GROUPS");
}

export async function postGenerateCloneProgram(
  programId: string,
  cloneProgramName: string,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/clone-program";
  const params = {
    program: removeIRI(programId),
    cloneName: cloneProgramName,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Clon Program");
}

export async function postRecalculateProgram(
  programId: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/analyze/programs/" +
    removeIRI(programId) +
    "/recalculate";
  const params = {};

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Clon Program");
}

export async function postSummarizeValues(
  spendFileVersionUuid: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/analyze/spend-file-version/" +
    spendFileVersionUuid +
    "/summarize";
  const params = {};

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Summarize Values");
}

/** Manage Module endpoints */

export async function getStatsAgreed(
  programId: string,
  globalFilter: any,
  targetSpendFileVersionUuid: any | null,
  fullDisabled: boolean,
  type: string,
): Promise<ApiResponse> {
  if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;

  let url = "";
  // if (type === 'stats_agreed') {
  //   url = getBaseApi() + '/api/manage/stats_agreed'
  // } else {
  //   url = getBaseApi() + '/api/manage/stats_info'
  // }
  // stats_suppliers_negotiated

  url = getBaseApi() + "/api/manage/" + type;

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
    targetProgramUuid: removeIRI(programId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid),
    fullDisabled: false
  };
  const params = {
    filters,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM PAYMENT TERMS");
}

export async function getStatusCardsNumber(
  programId: string,
  globalFilter: any,
  targetSpendFileVersionUuid: string | null,
  fullDisabled: boolean,
  levelOfGrid: string,
): Promise<ApiResponse> {
  if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
    return { success: false, code: 0, data: null, skipped: true };
  }

  let response = null;

  const url = getBaseApi() + "/api/manage/status_cards_number";

  let filters = {
    globalFilter,
    currencyRate: useAppStore().getCurrencyAmount,
    targetProgramUuid: removeIRI(programId),
    targetSpendFileVersionUuid: removeIRI(targetSpendFileVersionUuid),
    fullDisabled: false
  };
  const params = {
    filters,
    targetView: levelOfGrid,
  };

  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "GET PROGRAM PAYMENT TERMS");
}

export async function postRenameCustomColumnValue(
  programId: string,
  columnNumber: string | number,
  previousValue: string | null,
  newValue: string | null,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/update-spend-field-by-value";
  const params = {
    program: programId,
    changed: {
      key: "renameCustomColumn",
      columnNumber,
      previousValue,
      value: newValue,
    },
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Rename Custom Column Value");
}

export async function postRenameSpendFieldValue(
  programId: string,
  previousValue: string | null,
  newValue: string | null,
): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + "/api/analyze/update-spend-field-by-value";
  const params = {
    program: programId,
    changed: {
      key: "renameCommodity",
      previousValue,
      value: newValue,
    },
  };
  try {
    response = await axios.post(url, params, {});
  } catch (e: any) {
    response = e.response;
  }
  return giveAnswer(response, "POST Rename Spend Field Value");
}

export async function getProgramCommodityValues(
  programUuid: string,
  params?: { q?: string; page?: number },
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + "/api/analyze/programs/" + programUuid + "/commodity-values";

  const queryParams: Record<string, any> = {};
  if (params?.q) queryParams.q = params.q;
  if (params?.page) queryParams.page = params.page;

  try {
    response = await axios.get(url, { params: queryParams });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getProgramCustomColumns(
  programUuid: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() + "/api/analyze/programs/" + programUuid + "/custom-columns";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getProgramCustomColumnValues(
  programUuid: string,
  columnUuid: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/analyze/programs/" +
    programUuid +
    "/custom-column-values/" +
    columnUuid;

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

// AB#20307: distinct exclusion reasons already used in the program, for the Reason picker's
// "reuse an existing reason" list (BR-03).
export async function getProgramExclusionReasons(
  programUuid: string,
): Promise<ApiResponse> {
  let response = null;
  const url =
    getBaseApi() +
    "/api/analyze/programs/" +
    programUuid +
    "/exclusion-reasons";

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}
