<template>
<CalculumLoading v-if="savingInProcess" :modal="true"></CalculumLoading>
<CalculumModal v-if="isModalConfirmOpen" :size="'md'" :showClose="true" :title="$t('global.confirmationRequired')" @close="isModalConfirmOpen = false">
  <template v-slot:modalContent><span>{{ $t('global.confirmationRequiredMessage') }}</span><span class="ml-1">{{  $t('global.proceed') }}</span></template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelAddCompany">           <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="addSelectedCompany(false)"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="isClearConfirmCompanyModalOpen" :size="'md'" :showClose="true" :title="$t('global.confirmationRequired')" @close="isClearConfirmCompanyModalOpen = false">
  <template v-slot:modalContent><span>{{ $t('global.areYouSure') }}</span><span class="ml-1">{{  $t('global.changesCannotBeUndone') }}</span></template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="isClearConfirmCompanyModalOpen = false">           <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="clearCompany()"><span>{{ $t('global.confirm') }}</span></button>
  </template>
</CalculumModal>
<div style="margin-top: 60px;" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyFinancial"></div>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col-lg-3 col-xl-2 border-right">
                  <AdminMenuCompany :currentPage="'FinancialData'" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyFinancial"></AdminMenuCompany>
                  <HomeMenuAccount :currentPage="'FinancialData'" v-else></HomeMenuAccount>
                </div>
                <div class="col-lg-9 col-xl-10 p-5">
                  <h3 v-if="router.currentRoute.value.name === Routing.admin.adminCompanyFinancial">{{ companyName }}</h3>
                  <div class="d-flex align-items-center">
                    <div class="d-flex align-items-center" :class="{'active': currentView !== 'default' }" @click="cancelOptionSelectedCompany">
                      <CalculumChevronLeft class="h6 cursor-pointer active" v-if="currentView !== 'default'"></CalculumChevronLeft>
                      <div class="h6 font-weight-bold" :class="{'active cursor-pointer': currentView !== 'default' }">{{ $t('home.homeFinancialData.title') }}</div>
                    </div>
                    <CalculumTooltipIcon v-if="currentView === 'default'" :infoText="$t('home.homeFinancialData.titleTooltipDefault')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-preferences-manageteam'" :keyPopOver="'preferencesFinancialData'"></CalculumTooltipIcon>
                  </div>
                  <div class="row" v-if="currentView === 'addCompany'">
                    <hr class="mb-2 mt-2"/>
                    <div class="col-12">
                      <div class="h6 font-weight-bold ml-4">{{ $t('home.analyze.table.selectYourCompany') }}</div>
                    </div>
                    <div class="col-12">
                      <div class="row" :class="{'bg-blur': loadingSearchCompaniesList}">
                        <div class="col-8 d-flex align-items-center-items">
                          <div class="input-group input-search m-1">
                            <input class="form-control" id="search" type="text" v-model="searchCompany" :placeholder="$t('home.components.navbar.searchByCompany')" @keyup.enter="setSearchText(false)"/>
                            <div class="input-group-icon" id="icon-search"><i class="fa-brands fa-sistrix cursor-pointer" @click="setSearchText(false)"></i></div>
                          </div>
                        </div>
                        <div class="col-4 d-flex d-flex align-items-center-items justify-content-end-search-buttons gap-2">
                          <button class="btn outline-secondary-btn font-md text-capitalize" :disabled="loadingSearchCompaniesList || searchCompany === ''" style="z-index: 1; width: fit-content" @click="() => setSearchText(true)">{{ $t('global.clear') }}                             </button>
                          <button class="btn btn-primary font-md text-capitalize" :disabled="loadingSearchCompaniesList || searchCompany === ''" style="z-index: 1; width: fit-content" @click="setSearchText(false)">{{ $t('button.search') }}</button>
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-12 d-flex align-items-center mt-2" v-if="searchCompany.length > 0 && listOfCompaniesToSelect.length === 0"><span>{{ $t('home.homeFinancialData.noResultsFound') }} </span></div>
                      </div>
                    </div>
                    <div class="col-12 mt-3" :class="{'bg-blur': (loadingSearchCompaniesList)}">
                      <CalculumGridGraphql @dataChange="dataChange" @select-company-entity-financing-data-view="selectCompanyEntityFinancingDataView" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" :collectionQuery="'collectionQueryCompareCompanyLists'" :defaultPageSize="filterSettings.paginationSpends.first" :enabledPagination="true" :disableBlurEfect="true" :filter="filterSettings.filterSpends" :filterable="true" :gridColumns="searchListColumns" :gridData="listOfCompaniesToSelect" :gridHeight="gridHeight" :key="keyGrid" :levelOfGrid="'entities'" :section="'compareCompany'" :showTabsLevels="false" :skip="filterSettings.paginationSpends.after" :sort="filterSettings.sortSpends" :sortable="true" :take="filterSettings.paginationSpends.first" :total="totalNumberOfEntities" :summaryOperation="'list'"></CalculumGridGraphql>
                    </div>
                    <div class="col-12 mt-3 d-flex justify-content-end gap-2">
                      <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelOptionSelectedCompany"><span>{{ $t('global.cancel') }}</span></button>
                      <button class="btn btn-primary font-md" @click="confirmSelectedCompany" :disabled="validateSelectedCompany || savingInProcess" style="z-index: 1; width: fit-content"> <span class="spinner-border spinner-border-sm" v-if="savingInProcess" role="status" aria-hidden="true"> </span><span v-else>{{ $t('button.save') }}  </span></button>
                    </div>
                  </div>
                  <div v-if="currentView === 'default'">
                    <div class="row">
                      <div class="col-12">
                        <div class="alert alert-danger" v-if="formHasError" @click="clearErrors" role="alert" style="cursor: pointer"><span>{{ formErrorMessage }}</span></div>
                      </div>
                      <div class="col-xl-12 col-12 d-flex end-justify-content row-100">
                        <div class="form-group col-xl-3 col-md-3 col-sm-3 p-0">
                          <label for="paymentTermDays">
                            <input class="form-control required" id="paymentTermDays" type="number" v-model="paymentTermDays" min="0" max="1000" :placeholder="$t('home.homeFinancialData.paymentTermsPlaceholder')" @input="checkInputError(paymentTermDays)"/><span class="d-flex align-items-center">{{ $t('home.homeFinancialData.paymentTerms') }}
                              <CalculumInfoButton class="ml-2" :infoText="$t('home.homeFinancialData.paymentTermsTooltip')" :size="15"></CalculumInfoButton><sup>*</sup></span>
                          </label>
                        </div>
                        <div class="form-group col-xl-3 col-md-3 col-sm-3 p-0">
                          <label for="wacc">
                            <input class="form-control required" id="wacc" type="number" v-model="wacc" min="0" max="100" pattern="^d*(.d{0,2})?$" :placeholder="$t('home.homeFinancialData.waccPlaceholder')" @change="validateWacc(wacc)"/><span class="d-flex align-items-center">{{ $t('home.homeFinancialData.wacc') }}
                              <CalculumInfoButton class="ml-2" :infoText="$t('home.homeFinancialData.waccTooltip')" :size="15"></CalculumInfoButton><sup>*</sup></span>
                          </label>
                        </div>
                        <div class="form-group col-xl-3 col-md-3 col-sm-3 p-0">
                          <label for="taxRate">
                            <input class="form-control required" id="taxRate" type="number" v-model="taxRate" min="0" max="100" pattern="^d*(.d{0,2})?$" :placeholder="$t('home.homeFinancialData.taxRatePlaceholder')" @change="validateTaxRate(taxRate)"/><span class="d-flex align-items-center">{{ $t('home.homeFinancialData.taxRate') }}
                              <CalculumInfoButton class="ml-2" :infoText="$t('home.homeFinancialData.taxRateTooltip')" :size="15"></CalculumInfoButton><sup>* </sup></span>
                          </label>
                        </div>
                        <div class="form-group">
                          <label for="financial-credit">
                            <select class="form-control" id="financial-credit" name="financial-credit" v-model="creditRatingSelected" @change="onChangeCreditRating(creditRatingSelected)" :disabled="creditRatingsAvailables.length === 0">
                              <option hidden="hidden" selected="selected">{{ $t('global.creditRatingSelect') }}</option>
                              <option v-for="credit in creditRatingsAvailables" :value="credit ? credit : null">{{ credit }}</option>
                            </select><span class="d-flex align-items-center">{{ $t('global.creditRating') }}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="d-flex align-items-center justify-content-end">
                        <div class="col-xl-2 col-md-4 col-sm-4 p-0">
                          <button class="btn btn-primary font-md mb-2" id="save" :disable="hasValueErrors" @click="formValidator"><span>{{ $t('global.save') }}   </span></button>
                        </div>
                      </div>
                    </div>
                    <hr class="mt-1 mb-5"/>
                    <div class="row">
                      <div class="col-12 d-flex">
                        <div class="d-flex aling-items-center gap-2 align-items-baseline">
                          <div class="h6 font-weight-bold" v-if="getMyCompanyName === null">{{ $t('home.homeFinancialData.noCompanySelected') }}</div>
                          <Tooltip v-else :open-delay="100" :anchor-element="'target'" :position="'bottom'">
                            <div class="h6 font-weight-bold">{{ getMyCompanyName }}        </div>
                          </Tooltip>
                          <button class="btn outline-secondary-btn company-btn" @click="currentView = 'addCompany'"> <span class="text-sm">{{ getButtonText}}  </span></button>
                          <button class="btn outline-secondary-btn company-btn mr-1" id="clear-company" v-if="!noCompanySelectedBoolean" @click="isClearConfirmCompanyModalOpen = true"> <span class="text-sm">{{ $t('home.homeFinancialData.clearCompany') }}</span></button>
                        </div>
                      </div>
                      <div class="col-12 mt-3">
                        <GridSkeleton v-if="gridDataIsLoading"></GridSkeleton>
                        <CalculumGrid v-if="!gridDataIsLoading" @value-changed="valueChanged" :gridData="selectedCompanyFinancialDataComputed" :gridColumns="columnsForGrid" :allowExportExcel="false" forFinancialDataViewGrid="true" :selectable="false" :sortable="true" selectableOrdering="true" :headerscontrollers="true" :rowColors="true" :reorderingColumns="false" :allowExclude="true" :enabledPagination="true" :defaultPageSize="defaultGridPageSize" :pagingSizeCustomArray="pagable" :gridHeight="'auto'" :remove-group="true" :key="keyGrid"></CalculumGrid>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs, onMounted } from "vue";
import { FilterChangeEvent } from "@/types/filterSettings";
import {
  homeFinancialDataColumns,
  selectedCompanyValuesColumns,
} from "../data/columns";
import { homeFinancingListCompanies } from "@/modules/home/views/data/homeFinancingListCompanies";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { StringUtils } from "@/utils";
import { useI18n } from "vue-i18n";

import { useHomeStore } from "@/stores/home";
import { useFinancingDataCompaniesStore } from "@/stores/financingDataCompanies";
import { useUser, useCompany } from "@/composables";
import * as cacheGrid from "@/utils/dataGridClear";
import * as formatData from "@/utils/FormatData";
import * as graphqlUtils from "@/utils/graphqlUtils";
import * as Routing from "@/services/router/Routing";
import AdminMenuCompany from "@/modules/adminBackend/components/AdminMenuCompany.vue";
import CalculumChevronLeft from "@/modules/components/CalculumChevronLeft.vue";
import CalculumDropdown from "@/modules/components/CalculumDropdown.vue";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import CalculumInfoButton from "@/modules/components/CalculumInfoButton.vue";
import { CalculumLayout, CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import GridSkeleton from "@/modules/home/components/skeletons/GridSkeleton.vue";
import HomeMenuAccount from "@/modules/home/components/HomeMenuAccount.vue";
import router from "@/services/router/index";
import { onBeforeRouteLeave } from "vue-router";
import useApolloClient from "@/services/graphql/useApolloClient";
import { useToast } from "vue-toastification";
import { useCompareCompany } from "@/composables/useCompareCompany";
import { useUserStore } from "@/stores/user";
import { useWelcomeStore } from "@/stores/welcome";

export default defineComponent({
  name: "HomeFinancialData",
  components: {
    AdminMenuCompany,
    CalculumChevronLeft,
    CalculumDropdown,
    CalculumGrid,
    CalculumGridGraphql,
    CalculumInfoButton,
    CalculumLayout,
    CalculumModal,
    CalculumTooltipIcon,
    GridSkeleton,
    HomeMenuAccount,
    CalculumLoading,
  },
  setup() {
    const homeStore = useHomeStore();
    const financingDataCompaniesStore = useFinancingDataCompaniesStore();
    const welcomeStore = useWelcomeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
    const { user, userSessionActiveCompany } = useUser();
    const toast = useToast();
    const { removeCompareCompany, updateCompareCompany } = useCompareCompany();
    document.title = translate.t("home.homeFinancialData.title");

    const userStore = useUserStore();

    interface Company {
      country: string | null;
      ["@id"]: string;
      industry: string | null;
      naicsCode: string | null;
      entityName: string | null;
      region: string | null;
      selected: boolean;
    }

    interface HomeFinancialData {
      alreadyLoadedListOfCompanies: boolean;
      clearedCompany: boolean;
      columnsForGrid: Array<any>;
      columnsGrid: Array<any>;
      companyName: string;
      currentView: string;
      defaultGridPageSize: number;
      financialData: Array<any>;
      financialDataToUpdate: any;
      formErrorMessage: string;
      formHasError: boolean;
      globalSearch: string;
      gridDataIsLoading: boolean;
      gridHeight: string;
      hasValueErrors: boolean;
      isClearConfirmCompanyModalOpen: boolean;
      isModalConfirmOpen: boolean;
      keyGrid: number;
      keysToExtract: Array<any>;
      listOfCompanies: Array<any>;
      loadingFinancialData: boolean;
      loadingSearchCompaniesList: boolean;
      noChangesMade: boolean;
      noCompanySelectedBoolean: boolean;
      pagable: Array<any>;
      paymentTermDays: number;
      savingInProcess: boolean;
      searchCompany: string;
      searchListColumns: Array<any>;
      selectedCompany: boolean;
      selectedCompanyFinancialData: Array<any>;
      selectedCompanyName: string | null;
      selectedCompanyObject: Company | null;
      showFinancialForm: boolean;
      taxRate: number;
      totalNumberOfEntities: number;
      wacc: number;
      yearsUsed: Array<any>;
      creditRatingsAvailables: Array<any>;
      creditRatingSelected: string | null;
    }

    const homeFinancialData = reactive<HomeFinancialData>({
      alreadyLoadedListOfCompanies: false,
      clearedCompany: false,
      columnsForGrid: getColumnsForGrid(),
      columnsGrid: homeFinancialDataColumns,
      companyName: userStore.getCompany?.name ?? "",
      currentView: "default",
      defaultGridPageSize: 10,
      financialData: [],
      financialDataToUpdate: null,
      formErrorMessage: "",
      formHasError: false,
      globalSearch: "",
      gridDataIsLoading: true,
      gridHeight: "auto",
      hasValueErrors: false,
      isClearConfirmCompanyModalOpen: false,
      isModalConfirmOpen: false,
      keyGrid: new Date().getUTCMilliseconds(),
      keysToExtract: [
        "DPO",
        "DIO",
        "DSO",
        "C2C",
        "COST_OF_GOOD",
        "INV",
        "TOTAL_REVENUE",
        "TRADE_PAYABLE",
        "TRADE_RECEIVABLE",
      ],
      listOfCompanies: [],
      loadingFinancialData: false,
      loadingSearchCompaniesList: true,
      noChangesMade: true,
      noCompanySelectedBoolean: false,
      pagable: [8, 10, 25, 50, 100, 150],
      paymentTermDays: userStore.getCompany?.averagePaymentTerms ?? 0,
      savingInProcess: false,
      searchCompany: "",
      searchListColumns: getColumnsForGridCompanies(),
      selectedCompany: false,
      selectedCompanyFinancialData: [],
      selectedCompanyName: "",
      selectedCompanyObject: null,
      showFinancialForm: false,
      taxRate:
        userStore.getCompany?.taxRate !== undefined &&
        userStore.getCompany?.taxRate !== null
          ? parseFloat((userStore.getCompany.taxRate * 100).toFixed(2))
          : 0,
      totalNumberOfEntities: 0,
      wacc:
        userStore.getCompany?.wacc !== undefined &&
        userStore.getCompany?.wacc !== null
          ? parseFloat((userStore.getCompany.wacc * 100).toFixed(2))
          : 0,
      yearsUsed: [],
      creditRatingsAvailables: [],
      creditRatingSelected: userStore.getCompany?.creditRating ?? null,
    });

    const getMyCompanyName = computed(() => {
      if (
        homeFinancialData.selectedCompanyName &&
        homeFinancialData.selectedCompanyName.length > 50
      ) {
        return homeFinancialData.selectedCompanyName.slice(0, 50) + "...";
      }
      return homeFinancialData.selectedCompanyName;
    });

    const selectedCompanyFinancialDataComputed = computed(() => {
      return homeFinancialData.selectedCompanyFinancialData;
    });

    let filterSettings: FilterChangeEvent = {
      //- Suppliers Grid Data
      paginationSuppliers: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterSuppliers: [],
      sortSuppliers: [
        {
          field: "name",
          dir: "asc",
        },
      ],
      //- Parents Grid Data
      paginationParents: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterParents: [],
      sortParents: [
        {
          field: "name",
          dir: "asc",
        },
      ],
      //- Spends
      paginationSpends: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterSpends: [],
      sortSpends: [
        {
          field: "entityName",
          dir: "asc",
        },
      ],
    };

    const messageError = computed(() => {
      let result = "";

      if (
        !homeFinancialData.paymentTermDays ||
        homeFinancialData.paymentTermDays < 0 ||
        homeFinancialData.paymentTermDays.toString().length === 0 ||
        homeFinancialData.paymentTermDays > 1000
      ) {
        result += translate.t("home.homeFinancialData.warnings.paymentTerms");
      }

      return result;
    });

    function apiDeleteFinancialData(year: string) {
      homeFinancialData.loadingFinancialData = true;
      const params = {
        companyId: userStore.getUserCompanyId,
        years: [year],
        callbackSuccess: () => {
          apiGetCompanyFinancialData();
        },
        callbackError: () => {
          homeFinancialData.loadingFinancialData = false;
        },
      };
      homeStore.deleteCompanyFinancialData(params);
    }

    function resetValues() {
      homeFinancialData.searchCompany = "";
      goBackToDefaultView();
    }

    function goBackToDefaultView() {
      homeFinancialData.currentView = "default";
    }

    function selectCompanyEntityFinancingDataView(entity: Company) {
      homeFinancialData.selectedCompanyObject = entity;
      homeFinancialData.selectedCompany = true;
    }

    function cancelAddCompany() {
      homeFinancialData.listOfCompanies.forEach((company: any) => {
        company.selected = false;
      });
      homeFinancialData.isModalConfirmOpen = false;
    }

    function confirmSelectedCompany() {
      /**
       * first check if previous company is already selected
       */

      let idIsNullOrUndefined =
        homeFinancialData.selectedCompanyObject?.["@id"] === null ||
        homeFinancialData.selectedCompanyObject?.["@id"] === undefined;

      if (!idIsNullOrUndefined) {
        //open modal for confirm
        homeFinancialData.isModalConfirmOpen = true;
      } else {
        addSelectedCompany(false);
      }
    }

    function addSelectedCompany(
      defaultManual: boolean = false,
      toClear: boolean = false,
    ) {
      homeFinancialData.isModalConfirmOpen = false;
      homeFinancialData.savingInProcess = true;
      const params = {
        currentCompanyUuid: StringUtils.removeIRI(
          userSessionActiveCompany.value?.["@id"],
        ),
        uuid: toClear ? null : homeFinancialData.selectedCompanyObject?.["@id"],
        callbackSuccess: () => {
          if (toClear) {
            removeCompareCompany();
            homeFinancialData.selectedCompanyName = null;
            homeFinancialData.selectedCompanyObject = null;
            homeFinancialData.clearedCompany = true;
            homeFinancialData.listOfCompanies.forEach((company: any) => {
              company.selected = false;
            });

            homeFinancialData.noCompanySelectedBoolean = true;

            financingDataCompaniesStore.setSelectedCompany(null);
          } else {
            if (homeFinancialData.selectedCompanyObject) {
              updateCompareCompany(homeFinancialData.selectedCompanyObject);
            }

            homeFinancialData.noCompanySelectedBoolean = false;
            homeFinancialData.selectedCompanyName =
              homeFinancialData.selectedCompanyObject?.entityName ?? null;
            financingDataCompaniesStore.setSelectedCompany(
              homeFinancialData.selectedCompanyObject,
            );
          }

          toast.success(translate.t("global.successSavingFinancialData"));

          getSelectedCompanyFinancialData(
            homeFinancialData.selectedCompanyObject,
          );
          homeFinancialData.currentView = "default";
          homeFinancialData.savingInProcess = false;
        },
        callbackError: () => {
          toast.error(translate.t("global.errorSavingData"));
          homeFinancialData.savingInProcess = false;
        },
      };
      financingDataCompaniesStore.sendSavedCompany(params);
    }

    async function pageChangeHandler(event: any) {
      if (event.event.value) {
        filterSettings.paginationSpends = {
          first: event.event.value,
          after: 0,
          skip: 0,
        };
      } else {
        filterSettings.paginationSpends = {
          first: event.page.take,
          after: event.page.skip,
          skip: event.page.skip,
        };
      }
      await fetchDataForGrid();
    }

    async function fetchDataForGrid() {
      let queryString = getQueryData(filterSettings);
      homeFinancialData.loadingSearchCompaniesList = true;
      try {
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.company.edges.map((edge: any) => edge.node);
        homeFinancialData.totalNumberOfEntities =
          response.data.company.totalCount;
        const parsedData: Array<any> = [];
        nodes.forEach((node: any) => {
          const data = Object.assign({}, node);
          data["@id"] = node.id.replace(
            "/compare_company_lists/",
            "/compare_companies/",
          );
          data.id = node.id.replace(
            "/compare_company_lists/",
            "/compare_companies/",
          );
          data.selected = false;
          parsedData.push(data);
        });

        homeFinancialData.listOfCompanies = parsedData;

        // Set selected flag for the currently selected company
        const selectedCompanyId =
          homeFinancialData.selectedCompanyObject?.["@id"];

        if (!homeFinancialData.noCompanySelectedBoolean) {
          const index = homeFinancialData.listOfCompanies.findIndex(
            (company) => company.id === selectedCompanyId,
          );

          if (index !== -1) {
            homeFinancialData.listOfCompanies[index].selected = true;
          }
        }
        homeFinancialData.loadingSearchCompaniesList = false;
      } catch (error) {
        toast.error(
          translate.t(
            "home.homeFinancialData.notifications.error.searchCompaniesList",
          ),
        );
        homeFinancialData.loadingSearchCompaniesList = false;
      }
    }

    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'entityName: "asc"';
      }
      return sort
        .map((descriptor) => `${descriptor.field}: "${descriptor.dir}"`)
        .join(", ");
    }

    function getQueryData(event: FilterChangeEvent): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends,
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${
        event.paginationSpends.after
          ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
          : ""
      }`;
      const graphqlQuery = `
      {
        company: collectionQueryCompareCompanyLists(
          ${graphqlFilterString ? graphqlFilterString + "," : ""} 
          ${
            homeFinancialData.globalSearch
              ? homeFinancialData.globalSearch + ","
              : ""
          } 
          order: {${graphqlOrderString}},
          ${paginationString}
          
        ) {
          totalCount          
          edges {
            cursor
            node {
              id
              entityName
              entityCountryName
              entityRegion
              entityIndustryName
              entityIndustryCode
              __typename
            }
            __typename
          }
          __typename
        }
      }
      `;
      return graphqlQuery;
    }

    function resetDefaultColumns() {
      financingDataCompaniesStore.setHomeFinancialDataColumnsCache([]);
      homeFinancialData.searchListColumns = homeFinancingListCompanies;
    }

    function apiGetCompanyFinancialData() {
      homeFinancialData.showFinancialForm = false;
      homeFinancialData.loadingFinancialData = true;
      const params = {
        companyId: userStore.getUserCompanyId,
        callbackSuccess: (callbackSuccessData: Array<any>) => {
          homeFinancialData.financialData = [];
          homeFinancialData.yearsUsed = Object.keys(callbackSuccessData);

          let counter = 0;
          homeFinancialData.yearsUsed.forEach(function (
            selectedYear: any,
            index,
          ) {
            counter++;
            const dataResult = {
              year: selectedYear,
              inventory: 0,
              tradeReceivable: 0,
              tradePayable: 0,
              totalRevenue: 0,
              costOfGoods: 0,
              showActions: false,
              id: counter,
            };

            callbackSuccessData[selectedYear].forEach(function (data: any) {
              if (data["@type"] === "Inventory")
                dataResult.inventory = data.amount;
              if (data["@type"] === "TradeReceivable")
                dataResult.tradeReceivable = data.amount;
              if (data["@type"] === "TradePayable")
                dataResult.tradePayable = data.amount;
              if (data["@type"] === "TotalRevenue")
                dataResult.totalRevenue = data.amount;
              if (data["@type"] === "CostOfGoodsSold")
                dataResult.costOfGoods = data.amount;
            });
            homeFinancialData.financialData.push(dataResult);
          });
          homeFinancialData.loadingFinancialData = false;
        },
        callbackError: () => {
          toast.error(translate.t("global.errorSavingData"));
          homeFinancialData.loadingFinancialData = false;
        },
      };
      homeStore.getCompanyFinancialData(params);
    }

    function apiGetCreditRatings() {
      const params = {
        callbackSuccess: (data: any) => {
          homeFinancialData.creditRatingsAvailables = data?.["hydra:member"] ?? [];
          if(homeFinancialData.creditRatingsAvailables.length>0){
            homeFinancialData.creditRatingsAvailables.unshift(null);
          }
        },
        callbackError: () => {},
      };
      homeStore.getValuesForCreditRating(params);
    }

    function clearCompany() {
      homeFinancialData.isClearConfirmCompanyModalOpen = false;
      addSelectedCompany(true, true);
    }

    function valueChanged(valueObj: any) {
      // Find the row to update
      const rowToUpdate = homeFinancialData.selectedCompanyFinancialData.find(
        (row: any) => row.year === valueObj.year,
      );

      if (!rowToUpdate) {
        return;
      }

      // Mapping of behavior types to their corresponding property names
      const behaviorToPropertyMap: Record<string, string> = {
        c2c: "C2CValue",
        dpo: "DPOValue",
        dso: "DSOValue",
        dio: "DIOValue",
        costOfGoods: "COST_OF_GOODValue",
        inventory: "INVValue",
        totalRevenue: "TOTAL_REVENUEValue",
        tradePayable: "TRADE_PAYABLEValue",
        tradeReceivable: "TRADE_RECEIVABLEValue",
      };

      // Get the property name for the behavior
      const propertyName = behaviorToPropertyMap[valueObj.behavior];

      if (propertyName) {
        // Update the value, converting to number or null
        rowToUpdate[propertyName] =
          valueObj.newValue === null ? null : Number(valueObj.newValue);
      }

      homeFinancialData.keyGrid++;
    }

    function apiSavePaymentTerms() {
      homeFinancialData.loadingFinancialData = true;
      const params = {
        id: userStore.getUserCompanyId,
        averagePaymentTerms: homeFinancialData.paymentTermDays,
        wacc: homeFinancialData.wacc / 100,
        taxRate: Number(homeFinancialData.taxRate / 100),
        creditRating: homeFinancialData.creditRatingSelected,
        callbackSuccess: (callbackSuccessData: any) => {
          // Merge only financial fields instead of replacing the entire activeCompany,
          // since the PATCH response doesn't include spend file data and would wipe it out.
          const company = userStore.getCompany;
          if (company) {
            company.averagePaymentTerms = callbackSuccessData.averagePaymentTerms;
            company.wacc = callbackSuccessData.wacc;
            company.taxRate = callbackSuccessData.taxRate;
            company.creditRating = callbackSuccessData.creditRating;
            company.averagePaymentTermsWithCustomersDays = callbackSuccessData.averagePaymentTermsWithCustomersDays;
          }

          homeFinancialData.paymentTermDays =
            company?.averagePaymentTerms ?? 0;

          homeFinancialData.taxRate =
            company?.taxRate !== undefined &&
            company?.taxRate !== null
              ? parseFloat((company.taxRate * 100).toFixed(2))
              : 0;

          homeFinancialData.wacc =
            company?.wacc !== undefined &&
            company?.wacc !== null
              ? parseFloat((company.wacc * 100).toFixed(2))
              : 0;
          homeFinancialData.creditRatingSelected =
            company?.creditRating ?? homeFinancialData.creditRatingSelected;
          homeFinancialData.loadingFinancialData = false;
          toast.success(translate.t("global.successSavingFinancialData"));
        },
        callbackError: () => {
          toast.error(translate.t("global.errorSavingData"));
          homeFinancialData.loadingFinancialData = false;
        },
      };
      welcomeStore.companyProfile(params);
    }

    function cancelFinancialData() {
      homeFinancialData.showFinancialForm = false;
      homeFinancialData.financialDataToUpdate = null;
    }

    function checkInputError(modelValue: any) {
      if (
        (typeof modelValue === "number" && modelValue < 0) ||
        (typeof modelValue === "string" && !modelValue) ||
        homeFinancialData.formHasError
      ) {
        homeFinancialData.formErrorMessage = messageError.value;
        homeFinancialData.hasValueErrors = true;

        if (homeFinancialData.formErrorMessage.length === 0) {
          clearErrors();
        }
      }
    }

    function validateTaxRate(taxRate: number) {
      // Ensure the input is in the expected format and within range
      if (isNaN(taxRate) || taxRate === null || taxRate < 0 || taxRate > 100) {
        toast.error("Invalid tax rate");
        homeFinancialData.hasValueErrors = true;

        // If the input is invalid, reset the tax rate
        homeFinancialData.taxRate = parseFloat(
          ((userStore.getCompany?.taxRate ?? 0) * 100).toFixed(2),
        );
        return false;
      } else {
        homeFinancialData.hasValueErrors = false;

        // Ensure valid taxRate is stored multiplied by 100 and with two decimal places
        homeFinancialData.taxRate = parseFloat(taxRate.toFixed(2));
        return true;
      }
    }

    function validateWacc(wacc: number) {
      // Ensure the input is in the expected format and within range
      if (isNaN(wacc) || wacc === null || wacc < 0 || wacc > 100) {
        toast.error("Invalid wacc");
        homeFinancialData.hasValueErrors = true;

        // If the input is invalid, reset the wacc
        homeFinancialData.wacc = parseFloat(
          ((userStore.getCompany?.wacc ?? 0) * 100).toFixed(2),
        );
        return false;
      } else {
        homeFinancialData.hasValueErrors = false;

        // Ensure valid wacc is multiplied by 100 and has two decimal places
        homeFinancialData.wacc = parseFloat(wacc.toFixed(2));
        return true;
      }
    }

    async function dataChange(filter: any, sort: any) {
      filterSettings.paginationSpends = {
        first: filterSettings.paginationSpends.first,
        after: 0,
        skip: 0,
      };
      filterSettings.filterSpends = filter;
      filterSettings.sortSpends = sort;
      await fetchDataForGrid();
    }

    function clearErrors() {
      homeFinancialData.formHasError = false;
      homeFinancialData.hasValueErrors = false;
    }

    function formValidator() {
      if (homeFinancialData === null) {
        return;
      }

      homeFinancialData.formErrorMessage = messageError.value;
      if (
        homeFinancialData.formErrorMessage ||
        homeFinancialData.loadingFinancialData
      ) {
        homeFinancialData.formHasError = true;
        return;
      }

      apiSavePaymentTerms();
    }

    function updateFinancialData(financialData: any) {
      homeFinancialData.financialDataToUpdate = financialData;
      homeFinancialData.showFinancialForm = true;
    }

    function getColumnsForGridCompanies() {
      const columns: Array<any> = [];
      homeFinancingListCompanies.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        columns.push(newConfig);
      });

      let resetcolumns = [];

      const gridCache =
        financingDataCompaniesStore.getHomeFinancingListCompanies();
      if (
        gridCache &&
        gridCache.length &&
        JSON.stringify(columns) !== JSON.stringify(gridCache)
      ) {
        resetcolumns = cacheGrid.clearCache(columns, gridCache);
      } else {
        resetcolumns = columns;
      }

      const entityName = resetcolumns.findIndex(
        (x: any) => x.field === "entityName",
      );

      if (entityName > -1) {
        resetcolumns[entityName].title = translate.t(
          "home.analyze.table.companyName",
        );
        resetcolumns[entityName].cell = "selectedCompanyFinancialDataViewName";
        resetcolumns[entityName].hidden = false;
        resetcolumns[entityName].width = "350px";
      }

      const entityCountryName = resetcolumns.findIndex(
        (x: any) => x.field === "entityCountryName",
      );
      if (entityCountryName > -1) {
        resetcolumns[entityCountryName].title = translate.t(
          "home.analyze.table.country",
        );
        resetcolumns[entityCountryName].cell =
          "selectedCompanyFinancialDataViewCountry";
        resetcolumns[entityCountryName].hidden = false;
      }

      const entityRegion = resetcolumns.findIndex(
        (x: any) => x.field === "entityRegion",
      );
      if (entityRegion > -1) {
        resetcolumns[entityRegion].title = translate.t(
          "home.analyze.table.region",
        );
        resetcolumns[entityRegion].cell =
          "selectedCompanyFinancialDataViewRegion";
        resetcolumns[entityRegion].hidden = false;
      }

      const entityIndustryName = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryName",
      );
      if (entityIndustryName > -1) {
        resetcolumns[entityIndustryName].title = translate.t(
          "home.analyze.table.industry",
        );
        resetcolumns[entityIndustryName].cell =
          "selectedCompanyFinancialDataViewIndustry";
        resetcolumns[entityIndustryName].hidden = false;
        resetcolumns[entityIndustryName].width = "350px";
      }

      const entityIndustryCode = resetcolumns.findIndex(
        (x: any) => x.field === "entityIndustryCode",
      );
      if (entityIndustryCode > -1) {
        resetcolumns[entityIndustryCode].cell =
          "selectedCompanyFinancialDataViewNaicsCode";
        resetcolumns[entityIndustryCode].hidden = false;
        resetcolumns[entityIndustryCode].title = translate.t(
          "home.analyze.table.naicsCode",
        );
      }

      financingDataCompaniesStore.setHomeFinancingListCompanies(resetcolumns);
      return resetcolumns;
    }

    function getColumnsForGrid() {
      const columns: Array<any> = [];
      selectedCompanyValuesColumns.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        columns.push(newConfig);
      });

      let resetcolumns = [];
      const gridCache =
        financingDataCompaniesStore.getHomeFinancialDataColumnsCache();
      if (
        gridCache &&
        gridCache.length &&
        JSON.stringify(columns) !== JSON.stringify(gridCache)
      ) {
        resetcolumns = cacheGrid.clearCache(columns, gridCache);
      } else {
        resetcolumns = columns;
      }

      financingDataCompaniesStore.setHomeFinancialDataColumnsCache(
        resetcolumns,
      );
      return resetcolumns;
    }

    /**
     * Get list of companies to select from
     * only one selection per company
     */
    function getListOfCompanies() {
      if (homeFinancialData.alreadyLoadedListOfCompanies) {
        return;
      }
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          homeFinancialData.alreadyLoadedListOfCompanies = true;
          homeFinancialData.listOfCompanies =
            callbackSuccessData["hydra:member"];
          homeFinancialData.listOfCompanies.forEach((company: any) => {
            return {
              id: company["@id"],
              selected: false,
              name: company.name ?? "-",
              country: company.country.localizedName ?? "-",
              region: company.country.region.name ?? "-",
              industry: company.industry.name ?? "-",
              naicsCode: company.industry.code ?? "-",
            };
          });
          homeFinancialData.loadingSearchCompaniesList = false;
        },
        callbackError: () => {
          homeFinancialData.alreadyLoadedListOfCompanies = true;
          homeFinancialData.listOfCompanies = [];
          homeFinancialData.loadingSearchCompaniesList = true;
        },
      };
      financingDataCompaniesStore.getListOfCompanies(params);
    }

    /**
     * Get the button text based on if selected company was previously selected
     */
    const getButtonText = computed(() => {
      return homeFinancialData.selectedCompanyObject === null
        ? translate.t("home.analyze.table.addCompany")
        : translate.t("home.analyze.table.editCompany");
    });

    const listOfCompaniesToSelect = computed(() => {
      return homeFinancialData.listOfCompanies;
    });

    /**
     * Sends the company uuid to receive its financial data
     *
     */
    function getSelectedCompanyFinancialData(selectedCompany: any) {
      homeFinancialData.gridDataIsLoading = true;
      const params = {
        //companyUuid: userSessionActiveCompany.value?.["@id"],
        companyUuid: homeFinancialData.noCompanySelectedBoolean
          ? userSessionActiveCompany.value?.["@id"]
          : (selectedCompany?.["@id"] ?? null),
        callbackSuccess: (callbackSuccessData: any) => {
          const extractedData: any = {};

          // Extract and normalize data
          homeFinancialData.keysToExtract.forEach((key: string) => {
            if (callbackSuccessData.hasOwnProperty(key)) {
              callbackSuccessData[key].forEach((item: any) => {
                if (!extractedData[item.year]) {
                  extractedData[item.year] = { year: item.year };
                }
                extractedData[item.year][`${key}Value`] = item.value;
                extractedData[item.year]["companyId"] =
                  selectedCompany?.["@id"];
              });
            }
          });

          // Convert to an array and sort by year
          const resultArray = Object.values(extractedData).sort(
            (a: any, b: any) => a.year - b.year,
          );

          homeFinancialData.selectedCompanyFinancialData = resultArray;
          homeFinancialData.gridDataIsLoading = false;
        },
        callbackError: () => {
          toast.error(
            translate.t(
              "home.homeFinancialData.notifications.error.fetchCalculatedValues",
            ),
          );
          homeFinancialData.selectedCompanyFinancialData = [];
          homeFinancialData.gridDataIsLoading = false;
        },
      };
      financingDataCompaniesStore.getCalculatedValues(params);
    }

    onMounted(() => {
      let userObj = user.value;
      let company = userObj?.activeCompany?.compareCompany ?? null;

      homeFinancialData.selectedCompanyName = company?.name ?? null;
      if (!company) {
        homeFinancialData.noCompanySelectedBoolean = true;
      }
      homeFinancialData.selectedCompanyObject = company;

      apiGetCompanyFinancialData();
      apiGetCreditRatings();
      getSelectedCompanyFinancialData(company);
      // call the api to get list of companies
      fetchDataForGrid();
      setGridHeight();
    });



    function setGridHeight() {
      const getSubMain = document.getElementById("container-main-id");
      if (getSubMain) {
        if (getSubMain.clientHeight - 115 < 350) {
          homeFinancialData.gridHeight = "350px";
        } else {
          homeFinancialData.gridHeight = getSubMain.clientHeight - 368 + "px";
        }
      }
    }

    const { apolloClientResetStore } = useApolloClient();

    onBeforeRouteLeave(async (to) => {
      await apolloClientResetStore();
    });

    function setSearchText(clean: boolean) {
      if (clean) {
        homeFinancialData.searchCompany = "";
      }
      filterSettings.paginationSpends = {
        first: 25,
        after: 0,
        skip: 0,
      };

      const searchText = {
        searchingText: homeFinancialData.searchCompany,
      };

      homeFinancialData.globalSearch =
        graphqlUtils.convertSearchTextToGraphQL(searchText);
      fetchDataForGrid();
    }

    const validateSelectedCompany = computed(() => {
      return StringUtils.isNullUndefinedOrEmpty(
        homeFinancialData.selectedCompanyObject?.["@id"],
      );
    });

    function cancelOptionSelectedCompany() {
      homeFinancialData.currentView = "default";
      homeFinancialData.selectedCompanyObject = null;
      homeFinancialData.globalSearch = "";
      homeFinancialData.searchCompany = "";
      homeFinancialData.keyGrid++;
    }
    const onChangeCreditRating = (value: string | null) => {
      if(!value) {
        homeFinancialData.creditRatingSelected = null;
        return;
      }
      homeFinancialData.creditRatingSelected = value;
    };
    return {
      ...toRefs(homeFinancialData),
      addSelectedCompany,
      apiDeleteFinancialData,
      apiGetCompanyFinancialData,
      CalculumInfoButton,
      cancelAddCompany,
      cancelFinancialData,
      checkInputError,
      clearCompany,
      confirmSelectedCompany,
      dataChange,
      filterSettings,
      formatData,
      formValidator,
      getButtonText,
      getListOfCompanies,
      getMyCompanyName,
      listOfCompaniesToSelect,
      pageChangeHandler,
      resetDefaultColumns,
      resetValues,
      router,
      Routing,
      selectCompanyEntityFinancingDataView,
      selectedCompanyFinancialDataComputed,
      setSearchText,
      updateFinancialData,
      validateTaxRate,
      validateWacc,
      valueChanged,
      clearErrors,
      validateSelectedCompany,
      cancelOptionSelectedCompany,onChangeCreditRating
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.btn-action-financial-data {
  border: none;
  background: $color-white;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  transition: all ease 0.3s;
  cursor: pointer;

  span {
    color: $color-black;
    font-size: 16px;
  }

  svg {
    fill: $color-black;
    margin-right: 10px;
    width: 16px;
    height: 16px;
  }

  &:hover {
    span {
      color: $color-red !important;
    }
    svg {
      fill: $color-red;
    }
  }
}

.card--full .card__body {
  margin-bottom: 0 !important;
}

.company-btn {
  padding: 0 10px;
}

.no-wrap {
  white-space: nowrap;
}

.form-group input:not(:placeholder-shown) + span {
  left: 5px;
}

.form-control,
#save {
  width: 95%;
}

.align-items-center-items {
  align-items: center;
  gap: 1rem;
}

.justify-content-end-search-buttons {
  justify-content: flex-end !important;
}
</style>
