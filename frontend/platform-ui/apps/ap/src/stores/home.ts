import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { secureStorage } from "@/services/pinia/index";
import * as HomeApi from "@/modules/home/api/index";
import * as ClusterAPIRelated from "@/modules/home/api/clusterRelated";
import { Section } from "@/types";

// Types
interface SpendsLists {
  spends: number;
  interval: any;
  launchLogout: boolean;
}

interface BuyerStandardConditions {
  buyerStandardConditions: Array<any>;
}

async function fetchResultAnalysisReferenceDate(params: any) {
  const { callbackSuccess, callbackError } = params;
  const response = await HomeApi.getResultAnalysisReferenceDate();
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function updateResultAnalysisReferenceDate(params: any) {
  const { referenceDate, callbackSuccess, callbackError } = params;
  const response = await HomeApi.patchResultAnalysisReferenceDate(referenceDate);
  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function patchADPVisibility(params: any) {
  const { spendFileVersionId, hideAverageDaysPaid, callbackSuccess, callbackError } = params;
  const response = await HomeApi.patchSpendFileVersionADPVisibility(spendFileVersionId, hideAverageDaysPaid);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function deleteCompanyFinancialData(params: any) {
  const { companyId, years, callbackSuccess, callbackError } = params;
  const response = await HomeApi.deleteCompanyFinancialData(
    companyId,
    years,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getValuesForCreditRating(params: any) {
  const { callbackSuccess, callbackError } = params;
  const response = await HomeApi.getValuesForCreditRating();

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getCompanyFinancialData(params: any) {
  const { companyId, callbackSuccess, callbackError } = params;
  const response = await HomeApi.getCompanyFinancialData(companyId);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function postCompanyFinancialData(params: any) {
  const { companyId, financialData, callbackSuccess, callbackError } =
    params;
  const response = await HomeApi.postCompanyFinancialData(
    companyId,
    financialData,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function sendEmailForHelp(params: any) {
  const {
    firstName,
    surname,
    email,
    subject,
    content,
    callbackSuccess,
    callbackError,
  } = params;
  const response = await HomeApi.sendEmailForHelp(
    firstName,
    surname,
    email,
    subject,
    content,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError();
  }
}

async function changeCurrency(params: any) {
  const { currencyTo, date, callbackSuccess, callbackError } = params;

  if (currencyTo === "USD") {
    return callbackSuccess({ result: 1 });
  }

  const response = await HomeApi.changeCurrency(currencyTo, date);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function currencyList(params: any) {
  const { callbackSuccess, callbackError } = params;
  const response = await HomeApi.currencyListDatabase();

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getMaxDateSpendFileVersion(params: any) {
  const { selectedSpendFileVersion, callbackSuccess, callbackError } =
    params;
  const response = await HomeApi.getMaxDateSpendFileVersion(
    selectedSpendFileVersion,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function saveBuyerStandardGroups(params: any) {
  const {
    companyUUID,
    groups,
    deletedGroups,
    callbackSuccess,
    callbackError,
  } = params;
  const response = await HomeApi.saveBuyerStandardGroups(
    companyUUID,
    groups,
    deletedGroups,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getInfoVcard(params: any) {
  const { company, callbackSuccess, callbackError } = params;
  const response = await HomeApi.getInfoVcard(company);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getInfoExcludedGroups(params: any) {
  const { spendfileUUID, callbackSuccess, callbackError } = params;
  const response = await HomeApi.getInfoExcludedGroups(spendfileUUID);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data["hydra:member"]);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function postInfoExcludedGroups(params: any) {
  const {
    spendfileUUID,
    groups,
    groupsDeleted,
    callbackSuccess,
    callbackError,
  } = params;
  const response = await HomeApi.postInfoExcludedGroups(
    spendfileUUID,
    groupsDeleted,
    groups,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function retrieveStrategies(params: any) {
  const { spendUUID, callbackSuccess, callbackError } = params;
  const response = await HomeApi.retrieveStrategies(spendUUID);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getBuyerStandardGroups(params: any) {
  const { companyUUID, callbackSuccess, callbackError } = params;
  const response = await HomeApi.getBuyerStandardGroups(companyUUID);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data["hydra:member"]);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function postCompanySettings(params: any) {
  const {
    paymentCycle,
    financingStrategyMethod,
    companyUUid,
    method,
    callbackSuccess,
    callbackError,
  } = params;
  const response = await HomeApi.postCompanySettings(
    paymentCycle,
    financingStrategyMethod,
    companyUUid,
    method,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function postConfigStrategies(params: any) {
  const { spendUUID, strategies, callbackSuccess, callbackError } = params;
  const response = await HomeApi.postConfigStrategies(spendUUID, strategies);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getCappedTable(params: any) {
  const { callbackSuccess, callbackError } = params;
  const response = await HomeApi.getCappedTable();

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getCategoriesData(params: any) {
  const { spendFileUUID, section, callbackSuccess, callbackError } = params;
  const response = await HomeApi.getCategoriesData(spendFileUUID, section);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function postChartData(params: any) {
  const {
    spendFileUUID,
    groupName,
    optionName,
    chartType,
    programUUID,
    globalFilter,
    fullDisabled,
    place,
    view,
    callbackSuccess,
    callbackError,
  } = params;
  const response = await HomeApi.postChartData({
    spendFileUUID,
    groupName,
    optionName,
    chartType,
    programUUID,
    globalFilter,
    fullDisabled,
    place,
    view,
  });

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function exportClusterData(params: any) {
  const { clusterType, callbackSuccess, callbackError } = params;
  const response = await ClusterAPIRelated.exportClusterData(clusterType);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function exportData(params: any) {
  const { level, filters_grid, section, callbackSuccess, callbackError } =
    params;
  const response = await HomeApi.exportData(level, filters_grid, section);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getUniqueData(params: any) {
  const { callbackSuccess, callbackError } = params;
  const response = await HomeApi.getUniqueData(params);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getClustersUniqueData(params: any) {
  const { collection, field, callbackSuccess, callbackError } = params;
  const response = await ClusterAPIRelated.getUniqueDataForClusterColumn(
    collection,
    field,
  );

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function saveVCardsValues(params: any) {
  const {
    company,
    vCardGroupsEnabled,
    vCardProvider,
    acceptanceTypes,
    groupsDeleted,
    groups,
    vCardDefaultEnrollment,
    vCardAllowsTermsExtension,
    vCardMinimumProbabilityOfSuccess,
    callbackSuccess,
    callbackError,
  } = params;
  const response = await HomeApi.saveVCardsValues({
    company,
    vCardGroupsEnabled,
    vCardProvider,
    acceptanceTypes,
    groupsDeleted,
    groups,
    vCardDefaultEnrollment,
    vCardAllowsTermsExtension,
    vCardMinimumProbabilityOfSuccess,
  });

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function validateGlobalFilters(params: {
  section: Section;
  globalFilter: string;
  currencyRate: number;
  targetSpendFileVersionUuid: string | null;
  targetProgramUuid?: string | null | undefined;
  callbackSuccess: any;
  callbackError: any;
}) {
  const {
    section,
    globalFilter,
    currencyRate,
    targetSpendFileVersionUuid,
    targetProgramUuid,
    callbackSuccess,
    callbackError,
  } = params;
  const response = await HomeApi.validateGlobalFilters({
    section,
    globalFilter,
    currencyRate,
    targetSpendFileVersionUuid,
    targetProgramUuid,
  });

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

// News Configuration Actions
async function getNewsConfig(params: any) {
  const { callbackSuccess, callbackError } = params;
  const response = await HomeApi.getNewsConfig();

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function getNewsConfigForQuery(params: any) {
  const { callbackSuccess, callbackError } = params;
  const response = await HomeApi.getNewsConfigForQuery();

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

async function saveNewsConfig(params: any) {
  const { config, callbackSuccess, callbackError } = params;
  const response = await HomeApi.saveNewsConfig(config);

  if (response.success) {
    if (callbackSuccess) {
      callbackSuccess(response.data);
    }
    return;
  }

  if (callbackError) {
    callbackError(response);
  }
}

export const useHomeStore = defineStore(
  "home",
  () => {
    // State
    const spends = ref<any>(null);
    const interval = ref<any>(null);
    const launchLogout = ref<boolean>(false);
    const buyerStandardConditions = ref<Array<any>>([]);


    // Entity Level Tab Selected
    const entityLevelTabSelected = ref<number>(1);

    // Current Dashboard Tab — survives the page-contents remount that HomeBackend.vue's
    // v-if="!getGlobalLoading" triggers on every platform-level currency/spend-file switch
    // (HomeDashBoard.vue's own currentTab ref is destroyed and recreated on that remount;
    // this store isn't, so HomeDashBoard.vue initializes from it instead of a hardcoded default).
    const currentDashboardTab = ref<string>("Dashboard");

    // Home Categorize
    // Buyer - Geography - Supplier
    const homeCategorizeGridColumnsInter = ref<Array<any>>([]);
    // List
    // -> Spends
    const homeCategorizeGridColumnsSpends = ref<Array<any>>([]);
    // -> Suppliers
    const homeCategorizeGridColumnsSuppliers = ref<Array<any>>([]);
    const matchColumnsLists = ref<Array<any>>([]);
    // -> Parents
    const homeCategorizeGridColumnsParents = ref<Array<any>>([]);

    // Home Analyze
    // -> Cash Flow
    //    -> Show
    // Spends
    const homeAnalyzeGridColumnsList = ref<Array<any>>([]);
    // Suppliers
    const homeAnalyzeGridColumnsListSupplier = ref<Array<any>>([]);
    // Parents
    const homeAnalyzeGridColumnsListParentCF = ref<Array<any>>([]);
    // -> Cash Flow
    //    -> Edit
    // Spends
    const homeAnalyzeGridColumnsListSpendsEdit = ref<Array<any>>([]);
    // Suppliers
    const homeAnalyzeGridColumnsListSuppliersEdit = ref<Array<any>>([]);
    // Parents
    const homeAnalyzeGridColumnsListParentsEdit = ref<Array<any>>([]);

    // Home Analyze Waterfall
    const homeAnalyzeWaterfallGridColumnsList = ref<Array<any>>([]);

    //- Metrics chart lists
    const metricsChartListsSpends = ref<Array<any>>([]);
    const metricsChartListsSuppliers = ref<Array<any>>([]);
    const metricsChartListsParents = ref<Array<any>>([]);

    // Plan Phase Table
    // -> Cash Flow
    //    -> Show

    // Spends
    const homePlanColumnOrderSpendsCF = ref<Array<any>>([]);
    const homePlanColumnOrderSpendsCFEdit = ref<Array<any>>([]);

    // Suppliers
    const homePlanPhaseColumnOrderSuppliersCF = ref<Array<any>>([]);
    const homePlanPhaseColumnOrderSuppliersCFEdit = ref<Array<any>>([]);

    // Parents
    const homePlanPhaseColumnOrderParentsCF = ref<Array<any>>([]);
    const homePlanPhaseColumnOrderParentsCFEdit = ref<Array<any>>([]);
    // Summary List
    const planSummaryList = ref<Array<any>>([]);

    // Adabot
    const adabotEntityUUID = ref<string>("");
    const isPopOverActive = ref<boolean>(false);
    const isAnalyticsActive = ref<boolean>(true);
    const globalLoading = ref<boolean>(true);
    const vCardGroupsEnabled = ref<boolean>(false);
    const vCardGroups = ref<Array<any>>([]);
    const adminConsoleCatalogColumns = ref<Array<any>>([]);
    const idpsToLogin = ref<any>(null);

    // Getters
    // VCard
    const getVCardGroups = computed(() => vCardGroups.value);
    const getVCardGroupsEnabled = computed(() => vCardGroupsEnabled.value);

    // Global
    const getGlobalLoading = computed(() => globalLoading.value);
    const getIsAnalyticsActive = computed(() => isAnalyticsActive.value);
    const getIsPopOverActive = computed(() => isPopOverActive.value);

    // Entity Level Tab Selected
    const getEntityLevelTabSelected = computed(
      () => entityLevelTabSelected.value,
    );

    // Current Dashboard Tab
    const getCurrentDashboardTab = computed(() => currentDashboardTab.value);

    // Standard Conditions
    const getBuyerStandardConditions = computed(
      () => buyerStandardConditions.value,
    );
    const getSpendLists = computed(() => spends.value);

    // Home Categorize
    const getHomeCategorizeGridColumnsInter = computed(
      () => homeCategorizeGridColumnsInter.value || [],
    );
    const getHomeCategorizeGridColumnsSpends = computed(
      () => homeCategorizeGridColumnsSpends.value || [],
    );
    const getHomeCategorizeGridColumnsSuppliers = computed(
      () => homeCategorizeGridColumnsSuppliers.value || [],
    );
    const getHomeCategorizeGridColumnsParents = computed(
      () => homeCategorizeGridColumnsParents.value || [],
    );
    const getMatchColumnsLists = computed(() => matchColumnsLists.value || []);

    // Home Analyze
    const getHomeAnalyzeGridColumnsList = computed(
      () => homeAnalyzeGridColumnsList.value || [],
    );
    const getHomeAnalyzeGridColumnsListSupplier = computed(
      () => homeAnalyzeGridColumnsListSupplier.value || [],
    );
    const getHomeAnalyzeGridColumnsListParentCF = computed(
      () => homeAnalyzeGridColumnsListParentCF.value || [],
    );
    const getHomeAnalyzeGridColumnsListSpendsEdit = computed(
      () => homeAnalyzeGridColumnsListSpendsEdit.value || [],
    );
    const getHomeAnalyzeGridColumnsListSuppliersEdit = computed(
      () => homeAnalyzeGridColumnsListSuppliersEdit.value || [],
    );
    const getHomeAnalyzeGridColumnsListParentsEdit = computed(
      () => homeAnalyzeGridColumnsListParentsEdit.value || [],
    );
    // Home Analyze Waterfall
    const getHomeAnalyzeWaterfallGridColumnsList = computed(
      () => homeAnalyzeWaterfallGridColumnsList.value || [],
    );

    // Plan Table View Mode
    const getHomePlanColumnOrderSpendsCF = computed(
      () => homePlanColumnOrderSpendsCF.value || [],
    );

    const getHomePlanPhaseColumnOrderSuppliersCF = computed(
      () => homePlanPhaseColumnOrderSuppliersCF.value || [],
    );

    const getHomePlanPhaseColumnOrderParentsCF = computed(
      () => homePlanPhaseColumnOrderParentsCF.value || [],
    );

    // Plan Table Edit Mode
    const getHomePlanPhaseColumnOrderSuppliersCFEdit = computed(
      () => homePlanPhaseColumnOrderSuppliersCFEdit.value || [],
    );

    const getHomePlanColumnOrderSpendsCFEdit = computed(
      () => homePlanColumnOrderSpendsCFEdit.value || [],
    );

    const getHomePlanPhaseColumnOrderParentsCFEdit = computed(
      () => homePlanPhaseColumnOrderParentsCFEdit.value || [],
    );

    //- Metrics chart lists
    const getMetricsChartListsSpends = computed(
      () => metricsChartListsSpends.value || [],
    );
    const getMetricsChartListsSuppliers = computed(
      () => metricsChartListsSuppliers.value || [],
    );
    const getMetricsChartListsParents = computed(
      () => metricsChartListsParents.value || [],
    );

    // Summary List
    const getPlanSummaryList = computed(() => planSummaryList.value || []);

    // Adabot
    const getAdabotEntityUUID = computed(() => adabotEntityUUID.value);
    const getAdminConsoleCatalogColumns = computed(
      () => adminConsoleCatalogColumns.value || [],
    );
    const getIdpsToLogin = computed(() => idpsToLogin.value);


    // Actions (Mutations)
    function setInitialState() {
      // Reset all state to initial values
      spends.value = null;
      interval.value = null;
      launchLogout.value = false;
      buyerStandardConditions.value = [];
      entityLevelTabSelected.value = 1;

      // Home Categorize
      homeCategorizeGridColumnsInter.value = [];
      homeCategorizeGridColumnsSpends.value = [];
      homeCategorizeGridColumnsSuppliers.value = [];
      matchColumnsLists.value = [];
      homeCategorizeGridColumnsParents.value = [];

      // Home Analyze
      homeAnalyzeGridColumnsList.value = [];
      homeAnalyzeGridColumnsListSupplier.value = [];
      homeAnalyzeGridColumnsListParentCF.value = [];
      homeAnalyzeGridColumnsListSpendsEdit.value = [];
      homeAnalyzeGridColumnsListSuppliersEdit.value = [];
      homeAnalyzeGridColumnsListParentsEdit.value = [];
      // Plan Table
      homePlanColumnOrderSpendsCF.value = [];
      homePlanColumnOrderSpendsCFEdit.value = [];
      homePlanPhaseColumnOrderSuppliersCF.value = [];
      homePlanPhaseColumnOrderSuppliersCFEdit.value = [];
      homePlanPhaseColumnOrderParentsCF.value = [];
      homePlanPhaseColumnOrderParentsCFEdit.value = [];
      planSummaryList.value = [];
      // Adabot
      adabotEntityUUID.value = "";
      isPopOverActive.value = false;
      isAnalyticsActive.value = true;
      globalLoading.value = true;
      vCardGroupsEnabled.value = false;
      vCardGroups.value = [];

      
      adminConsoleCatalogColumns.value = [];
      idpsToLogin.value = null;
      metricsChartListsSpends.value = [];
      metricsChartListsSuppliers.value = [];
      metricsChartListsParents.value = [];
    }

    // VCard
    function setVCardGroups(vCardGroupsValue: any) {
      vCardGroups.value = vCardGroupsValue;
    }

    function setVCardGroupsEnabled(status: boolean) {
      vCardGroupsEnabled.value = status;
    }

    // Global
    function setGlobalLoading(status: boolean) {
      globalLoading.value = status;
    }

    function setIsAnalyticsActive(status: boolean) {
      isAnalyticsActive.value = status;
    }

    function setIsPopOverActive(status: boolean) {
      isPopOverActive.value = status;
    }

    // Entity Level Tab Selected
    function setEntityLevelTabSelected(entityLevelTabSelectedValue: number) {
      entityLevelTabSelected.value = entityLevelTabSelectedValue;
    }

    // Current Dashboard Tab
    function setCurrentDashboardTab(tab: string) {
      currentDashboardTab.value = tab;
    }

    // Standard Conditions
    function setBuyerStandardConditions(buyerStandardConditionsValue: any) {
      buyerStandardConditions.value = buyerStandardConditionsValue;
    }

    function setSpendLists(spendsValue: any) {
      spends.value = spendsValue;
    }

    // Home Categorize
    function setHomeCategorizeGridColumnsInter(
      homeCategorizeGridColumnsInterValue: any,
    ) {

      if (homeCategorizeGridColumnsInterValue && homeCategorizeGridColumnsInterValue.length > 0) {
        homeCategorizeGridColumnsInter.value = homeCategorizeGridColumnsInterValue;
      }
    }

    function setHomeCategorizeGridColumnsSpends(
      homeCategorizeGridColumnsSpendsValue: any,
    ) {
      if (homeCategorizeGridColumnsSpendsValue && homeCategorizeGridColumnsSpendsValue.length > 0) {
        homeCategorizeGridColumnsSpends.value = homeCategorizeGridColumnsSpendsValue;
      }
    }

    function setMatchColumnsLists(matchColumnsListsValue: any) {
      if (matchColumnsListsValue && matchColumnsListsValue.length > 0) {
        matchColumnsLists.value = matchColumnsListsValue;
      }
    }

    function setHomeCategorizeGridColumnsSuppliers(
      homeCategorizeGridColumnsSuppliersValue: any,
    ) {

      if (homeCategorizeGridColumnsSuppliersValue && homeCategorizeGridColumnsSuppliersValue.length > 0) {
        homeCategorizeGridColumnsSuppliers.value = homeCategorizeGridColumnsSuppliersValue;
      }
    }

    function setHomeCategorizeGridColumnsParents(
      homeCategorizeGridColumnsParentsValue: any,
    ) {
      if (homeCategorizeGridColumnsParentsValue && homeCategorizeGridColumnsParentsValue.length > 0) {
      homeCategorizeGridColumnsParents.value =
        homeCategorizeGridColumnsParentsValue;
      }    
    }

    // Home Analyze
    function setHomeAnalyzeGridColumnsList(
      homeAnalyzeGridColumnsListValue: any,
    ) {
      if (homeAnalyzeGridColumnsListValue && homeAnalyzeGridColumnsListValue.length > 0) {
        homeAnalyzeGridColumnsList.value = homeAnalyzeGridColumnsListValue;
      }
    }

    function setHomeAnalyzeGridColumnsListSupplier(
      homeAnalyzeGridColumnsListSupplierValue: any,
    ) {

      if (homeAnalyzeGridColumnsListSupplierValue && homeAnalyzeGridColumnsListSupplierValue.length > 0) {
        homeAnalyzeGridColumnsListSupplier.value = homeAnalyzeGridColumnsListSupplierValue;
      }
    }

    function setHomeAnalyzeGridColumnsListParentCF(
      homeAnalyzeGridColumnsListParentCFValue: any,
    ) {
      if (homeAnalyzeGridColumnsListParentCFValue && homeAnalyzeGridColumnsListParentCFValue.length > 0) {
      homeAnalyzeGridColumnsListParentCF.value =
        homeAnalyzeGridColumnsListParentCFValue;
      }
    }

    function setHomeAnalyzeGridColumnsListSpendsEdit(
      homeAnalyzeGridColumnsListSpendsEditValue: any,
    ) {
      if (homeAnalyzeGridColumnsListSpendsEditValue && homeAnalyzeGridColumnsListSpendsEditValue.length > 0) {
      homeAnalyzeGridColumnsListSpendsEdit.value =
        homeAnalyzeGridColumnsListSpendsEditValue;
      }
    }

    function setHomeAnalyzeGridColumnsListSuppliersEdit(
      homeAnalyzeGridColumnsListSuppliersEditValue: any,
    ) {
      if (homeAnalyzeGridColumnsListSuppliersEditValue && homeAnalyzeGridColumnsListSuppliersEditValue.length > 0) {
      homeAnalyzeGridColumnsListSuppliersEdit.value =
        homeAnalyzeGridColumnsListSuppliersEditValue;
      }
    }

    function setHomeAnalyzeGridColumnsListParentsEdit(
      homeAnalyzeGridColumnsListParentsEditValue: any,
    ) {
      if (homeAnalyzeGridColumnsListParentsEditValue && homeAnalyzeGridColumnsListParentsEditValue.length > 0) {
      homeAnalyzeGridColumnsListParentsEdit.value =
        homeAnalyzeGridColumnsListParentsEditValue;
      }
    }

    function setHomeAnalyzeWaterfallGridColumnsList(
      homeAnalyzeWaterfallGridColumnsListValue: any,
    ) {
      if (homeAnalyzeWaterfallGridColumnsListValue && homeAnalyzeWaterfallGridColumnsListValue.length > 0) {
      homeAnalyzeWaterfallGridColumnsList.value =
        homeAnalyzeWaterfallGridColumnsListValue;
      }
    }

    //- Metrics chart lists
    function setMetricsChartListsSpends(
      metricsChartListsSpendsValue: any,
    ) {
      if (metricsChartListsSpendsValue && metricsChartListsSpendsValue.length > 0) {
      metricsChartListsSpends.value = metricsChartListsSpendsValue;
      }
    }

    function setMetricsChartListsSuppliers(
      metricsChartListsSuppliersValue: any,
    ) {
      if (metricsChartListsSuppliersValue && metricsChartListsSuppliersValue.length > 0) {
      metricsChartListsSuppliers.value = metricsChartListsSuppliersValue;
      }
    }


    function setMetricsChartListsParents(
      metricsChartListsParentsValue: any,
    ) {
      if (metricsChartListsParentsValue && metricsChartListsParentsValue.length > 0) {
      metricsChartListsParents.value = metricsChartListsParentsValue;
      }
    }

    // Plan Table View Mode

    function setHomePlanPhaseColumnOrderSuppliersCF(
      homePlanPhaseColumnOrderSuppliersCFValue: any,
    ) {
      if (homePlanPhaseColumnOrderSuppliersCFValue && homePlanPhaseColumnOrderSuppliersCFValue.length > 0) {
      homePlanPhaseColumnOrderSuppliersCF.value =
        homePlanPhaseColumnOrderSuppliersCFValue;
      }
    }

    function setHomePlanPhaseColumnOrderParentsCF(
      homePlanPhaseColumnOrderParentsCFValue: any,
    ) {
      if (homePlanPhaseColumnOrderParentsCFValue && homePlanPhaseColumnOrderParentsCFValue.length > 0) {
      homePlanPhaseColumnOrderParentsCF.value =
        homePlanPhaseColumnOrderParentsCFValue;
      }
    }

    function setHomePlanColumnOrderSpendsCF(
      homePlanColumnOrderSpendsCFValue: any,
    ) {
      if (homePlanColumnOrderSpendsCFValue && homePlanColumnOrderSpendsCFValue.length > 0) {
          homePlanColumnOrderSpendsCF.value = homePlanColumnOrderSpendsCFValue;
      }
    }

    // Plan Table Edit Mode

    function setHomePlanPhaseColumnOrderSuppliersCFEdit(
      homePlanPhaseColumnOrderSuppliersCFEditValue: any,
    ) {
      if (homePlanPhaseColumnOrderSuppliersCFEditValue && homePlanPhaseColumnOrderSuppliersCFEditValue.length > 0) {
      homePlanPhaseColumnOrderSuppliersCFEdit.value =
        homePlanPhaseColumnOrderSuppliersCFEditValue;
      }
    }

    function setHomePlanPhaseColumnOrderParentsCFEdit(
      homePlanPhaseColumnOrderParentsCFEditValue: any,
    ) {
      if (homePlanPhaseColumnOrderParentsCFEditValue && homePlanPhaseColumnOrderParentsCFEditValue.length > 0) {
      homePlanPhaseColumnOrderParentsCFEdit.value =
        homePlanPhaseColumnOrderParentsCFEditValue;
      }
    }

    function setHomePlanColumnOrderSpendsCFEdit(
      homePlanColumnOrderSpendsCFEditValue: any,
    ) {
      if (homePlanColumnOrderSpendsCFEditValue && homePlanColumnOrderSpendsCFEditValue.length > 0) {
      homePlanColumnOrderSpendsCFEdit.value =
        homePlanColumnOrderSpendsCFEditValue;
      }
    }

    // Summary List
    function setPlanSummaryList(planSummaryListValue: any) {
      if (planSummaryListValue && planSummaryListValue.length > 0) {
      planSummaryList.value = planSummaryListValue;
      }
    }

    // Adabot
    function setAdabotEntityUUID(newAdabotEntityUUID: any) {
      adabotEntityUUID.value = newAdabotEntityUUID;
    }

   
    function setAdminConsoleCatalogColumns(
      adminConsoleCatalogColumnsValue: any,
    ) {
      adminConsoleCatalogColumns.value = adminConsoleCatalogColumnsValue;
    }

    function setIdpsToLogin(idpsToLoginValue: any) {
      idpsToLogin.value = idpsToLoginValue;
    }

    function clearHomeStoreData() {
      setInitialState();
    }

    return {
      // State
      spends,
      interval,
      launchLogout,
      buyerStandardConditions,
      entityLevelTabSelected,
      currentDashboardTab,
      homeCategorizeGridColumnsInter,
      homeCategorizeGridColumnsSpends,
      homeCategorizeGridColumnsSuppliers,
      matchColumnsLists,
      homeCategorizeGridColumnsParents,
      homeAnalyzeGridColumnsList,
      homeAnalyzeGridColumnsListSupplier,
      homeAnalyzeGridColumnsListParentCF,
      homeAnalyzeGridColumnsListSpendsEdit,
      homeAnalyzeGridColumnsListSuppliersEdit,
      homeAnalyzeGridColumnsListParentsEdit,
      metricsChartListsSpends,
      metricsChartListsSuppliers,
      metricsChartListsParents,
      homeAnalyzeWaterfallGridColumnsList,
      homePlanColumnOrderSpendsCF,
      homePlanColumnOrderSpendsCFEdit,
      planSummaryList,
      homePlanPhaseColumnOrderSuppliersCF,
      homePlanPhaseColumnOrderSuppliersCFEdit,
      homePlanPhaseColumnOrderParentsCF,
      homePlanPhaseColumnOrderParentsCFEdit,
      adabotEntityUUID,
      isPopOverActive,
      isAnalyticsActive,
      globalLoading,
      vCardGroupsEnabled,
      vCardGroups,
      adminConsoleCatalogColumns,
      idpsToLogin,
      // Getters
      getVCardGroups,
      getVCardGroupsEnabled,
      getGlobalLoading,
      getIsAnalyticsActive,
      getIsPopOverActive,
      getEntityLevelTabSelected,
      getCurrentDashboardTab,
      getBuyerStandardConditions,
      getSpendLists,
      getHomeCategorizeGridColumnsInter,
      getHomeCategorizeGridColumnsSpends,
      getHomeCategorizeGridColumnsSuppliers,
      getHomeCategorizeGridColumnsParents,
      getMatchColumnsLists,
      getHomeAnalyzeGridColumnsList,
      getHomeAnalyzeGridColumnsListSupplier,
      getHomeAnalyzeGridColumnsListParentCF,
      getHomeAnalyzeGridColumnsListSpendsEdit,
      getHomeAnalyzeGridColumnsListSuppliersEdit,
      getHomeAnalyzeGridColumnsListParentsEdit,
      getHomeAnalyzeWaterfallGridColumnsList,
      getHomePlanColumnOrderSpendsCF,
      getHomePlanColumnOrderSpendsCFEdit,
      getPlanSummaryList,
      getHomePlanPhaseColumnOrderSuppliersCF,
      getHomePlanPhaseColumnOrderSuppliersCFEdit,
      getHomePlanPhaseColumnOrderParentsCF,
      getHomePlanPhaseColumnOrderParentsCFEdit,
      getAdabotEntityUUID,
      getAdminConsoleCatalogColumns,
      getIdpsToLogin,
      getMetricsChartListsSpends,
      getMetricsChartListsSuppliers,
      getMetricsChartListsParents,
      // Actions (Mutations)
      setInitialState,
      setVCardGroups,
      setVCardGroupsEnabled,
      setGlobalLoading,
      setIsAnalyticsActive,
      setIsPopOverActive,
      setEntityLevelTabSelected,
      setCurrentDashboardTab,
      setBuyerStandardConditions,
      setSpendLists,
      setHomeCategorizeGridColumnsInter,
      setHomeCategorizeGridColumnsSpends,
      setMatchColumnsLists,
      setHomeCategorizeGridColumnsSuppliers,
      setHomeCategorizeGridColumnsParents,
      setHomeAnalyzeGridColumnsList,
      setHomeAnalyzeGridColumnsListSupplier,
      setHomeAnalyzeGridColumnsListParentCF,
      setHomeAnalyzeGridColumnsListSpendsEdit,
      setHomeAnalyzeGridColumnsListSuppliersEdit,
      setHomeAnalyzeGridColumnsListParentsEdit,
      setHomeAnalyzeWaterfallGridColumnsList,
      setHomePlanColumnOrderSpendsCF,
      setHomePlanColumnOrderSpendsCFEdit,
      setPlanSummaryList,
      setHomePlanPhaseColumnOrderSuppliersCF,
      setHomePlanPhaseColumnOrderSuppliersCFEdit,
      setHomePlanPhaseColumnOrderParentsCF,
      setHomePlanPhaseColumnOrderParentsCFEdit,
      setIdpsToLogin,
      setAdabotEntityUUID,      
      setAdminConsoleCatalogColumns,
      clearHomeStoreData,
      setMetricsChartListsSpends,
      setMetricsChartListsSuppliers,
      setMetricsChartListsParents,
      // API Actions
      deleteCompanyFinancialData,
      getValuesForCreditRating,
      getCompanyFinancialData,
      postCompanyFinancialData,
      sendEmailForHelp,
      changeCurrency,
      currencyList,
      getMaxDateSpendFileVersion,
      saveBuyerStandardGroups,
      getInfoVcard,
      getInfoExcludedGroups,
      postInfoExcludedGroups,
      retrieveStrategies,
      getBuyerStandardGroups,
      postCompanySettings,
      patchADPVisibility,
      postConfigStrategies,
      getCappedTable,
      getCategoriesData,
      postChartData,
      exportClusterData,
      exportData,
      getUniqueData,
      getClustersUniqueData,
      saveVCardsValues,
      validateGlobalFilters,
      // News Configuration
      getNewsConfig,
      getNewsConfigForQuery,
      saveNewsConfig,
      // Result Analysis
      fetchResultAnalysisReferenceDate,
      updateResultAnalysisReferenceDate,
    };
  },
  {
    persist: {
      storage: secureStorage,
      key: "ada-home",
      pick: [
        'entityLevelTabSelected',
        'homeCategorizeGridColumnsInter',
        'homeCategorizeGridColumnsSpends',
        'homeCategorizeGridColumnsSuppliers',
        'homeCategorizeGridColumnsParents',
        'matchColumnsLists',
        'homeAnalyzeGridColumnsList',
        'homeAnalyzeGridColumnsListSupplier',
        'homeAnalyzeGridColumnsListParentCF',
        'homeAnalyzeGridColumnsListSpendsEdit',
        'homeAnalyzeGridColumnsListSuppliersEdit',
        'homeAnalyzeGridColumnsListParentsEdit',
        'homeAnalyzeWaterfallGridColumnsList',
        'homePlanColumnOrderSpendsCF',
        'homePlanColumnOrderSpendsCFEdit',
        'homePlanPhaseColumnOrderSuppliersCF',
        'homePlanPhaseColumnOrderSuppliersCFEdit',
        'homePlanPhaseColumnOrderParentsCF',
        'homePlanPhaseColumnOrderParentsCFEdit',
        'vCardGroupsEnabled',
        'vCardGroups',
        'adminConsoleCatalogColumns',
        'idpsToLogin',
      ],
    },
  },
);
