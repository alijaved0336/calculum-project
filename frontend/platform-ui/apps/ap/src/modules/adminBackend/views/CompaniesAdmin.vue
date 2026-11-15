<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>{{ $t('adminBackend.companiesAdmin.header') }}</h3>
  </section>
  <section class="page-content">
    <div class="row px-4 mb-4">
      <div class="col">
        <div id="data-fullscreen">
          <div class="d-flex align-items-center justify-content-between">
            <h3>{{ $t('adminBackend.companiesAdmin.header') }}</h3><a class="menu__link link link--icon link--special" @click="Routing.admin.openCreateCompanyAdminNewFlow()" :class="router.currentRoute.value.name === Routing.admin.createCompanyAdminNewFlow ? 'active' : ''"><span class="icon-svg icon-baggage-add"></span><span>{{ $t('adminBackend.button.createCompany') }}</span></a>
          </div>
          <CalculumLoading v-if="loadingCompanies" :modal="true"></CalculumLoading>
          <div class="row">
            <div class="col">
              <CalculumGrid @active-client-checked="activeClientOnChecked" @active-client-reset="activeClientOnReset" @companies-grid-module-checked="companiesGridModuleOnChecked" @date-selected="dateSelected" @potential-suppliers-limit-changed="potentialSuppliersLimitSelected" @refresh-companies="companiesAPIReadAll" :allowExportExcel="false" forCompaniesAdminPilotRelated="true" :enabledPagination="true" :gridColumns="columns" :defaultPageSize="pageSizeNumber" :pagingSizeCustomArray="pagable" :gridData="companies" :hideColumnSelector="true" :key="keyGrid" :showToolbar="false" :gridHeight="gridHeight"></CalculumGrid>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row px-4">
      <div class="col d-flex justify-content-end">
        <button class="btn btn-primary font-md text-capitalize" @click="buttonSaveOnClick" :disabled="buttonSaveIsDisabled" style="z-index: 1; width: fit-content">{{ $t('global.save') }}</button>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { Ref, computed, reactive, ref, toRefs, onMounted, watch } from "vue";
// Types
import {
  CompanyAPIPlatformResponse,
  CompanySettingsCompaniesGridData,
  UserRoles
} from "@/types";

import { ApiResponse } from "@/services/api/response";
import { columnsCompaniesAdmin } from "../data/columns";
import { isEqual } from "lodash";
import { isNullOrUndefined, isUndefined, DateUtils } from "@/utils";
import ObjectUtils from "@/utils/ObjectUtils";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/stores/user";
import * as CompanyAPI from "../api/company";
import * as Routing from "@/services/router/Routing";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import { CalculumLoading } from '@ada/design-system'
import {
  CompaniesGridModuleFieldName,
  getRoleFromFieldName
} from "../utils/CompaniesUtils";
import { useRouter } from 'vue-router';
import { useAdminBackendStore } from '@/stores/adminBackend'
import { FEATURE_ROLES, MODULE_ROLES } from '@/constants';
import { hasFeatureRole } from '@/utils/featureRoleUtils';
import { hasModuleRole } from '@/utils/moduleRoleUtils';
import { useToast } from "vue-toastification";

export default {
  name: "CompaniesAdmin",
  components: {
    CalculumGrid,
    CalculumLoading
  },
  setup() {
    const userStore = useUserStore();
    const adminBackendStore = useAdminBackendStore()

    const router = useRouter();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    // Page title
    document.title = translate.t("adminBackend.companiesAdmin.title");

    interface Data {
      initialLoadComplete: boolean;
      madeChangesInGrid: boolean;
      loadingCompanies: boolean;
      companies: CompanySettingsCompaniesGridData[];
      tableData: Array<any>;
      columns: Array<any>;
      keyGrid: number;
      pageSizeNumber: number;
      pagable: Array<number>;
      gridHeight: string;
    }

    const data = reactive<Data>({
      initialLoadComplete: false,
      madeChangesInGrid: false,
      loadingCompanies: true,
      companies: [],
      tableData: [],
      columns: columnsCompaniesAdmin,
      keyGrid: new Date().getUTCMilliseconds(),
      pageSizeNumber: 25,
      pagable: [8, 10, 25, 50, 100, 150],
      gridHeight: "350px"
    });

    const companiesRawData: Ref<CompanyAPIPlatformResponse[]> = ref([]);


    function setGridHeight() {
      const getSubMain = document.getElementsByClassName("main-content")[0];
      if (getSubMain) {
        if (getSubMain.clientHeight < 600) {
          data.gridHeight = "550px";
        } else {
          data.gridHeight = getSubMain.clientHeight + 200 + "px";
        }
      }
    }

    // *** Modules ***

    const companySettingsPilotDateLimitToBeSaved: Ref<{
      companyIRI: string;
      pilotTimeExpires: string;
    }[]> = ref([]);

    const companySettingsPotentialSuppliersLimitToBeSaved: Ref<{
      companyIRI: string;
      potentialSupplierRequestLimit: number | null;
    }[]> = ref([]);

    const companySettingsModuleRolesToBeSaved: Ref<{
      companyIRI: string;
      roles: UserRoles[];
      /** WI#18362. Only present when the Super Admin toggled Active Client on this company. */
      activeClient?: boolean;
      /** WI#19987. Only present when Set Auto is pending for this company. */
      activeClientMode?: "auto";
    }[]> = ref([]);

    const initialCompaniesState = ref<CompanySettingsCompaniesGridData[]>([]);

    watch(
      () => data.companies,
      (newVal,oldVal) => {       
        if(oldVal.length === 0){
          initialCompaniesState.value = ObjectUtils.cloneDeep(newVal) as CompanySettingsCompaniesGridData[];
        }else{
          const hasChanges = !isEqual(newVal, initialCompaniesState.value);
          data.madeChangesInGrid = hasChanges;
        }        
      },
      { deep: true }
    );

    function dateSelected(companyEntity: any, dateString: string) {
      const index = data.companies.findIndex(
        company => company["@id"] === companyEntity["@id"]
      );

      // If company found, modify its property and replace the entire array element to ensure reactivity
      if (index !== -1) {
        const updatedCompany = {
          ...data.companies[index],
          pilotTimeExpires: dateString
        };
        data.companies.splice(index, 1, updatedCompany);
      }

      const companyInPilotToBeSaved = companySettingsPilotDateLimitToBeSaved.value.find(
        company => company.companyIRI === companyEntity["@id"]
      );

      // Handle new company addition
      if (isUndefined(companyInPilotToBeSaved)) {
        companySettingsPilotDateLimitToBeSaved.value.push({
          companyIRI: companyEntity["@id"],
          pilotTimeExpires: dateString
        });
        data.madeChangesInGrid = true;
      } else {
        // Handle existing company update
        const index = companySettingsPilotDateLimitToBeSaved.value.findIndex(
          (entity: any) => entity.companyIRI === companyEntity["@id"]
        );

        if (index === -1) {
          if (import.meta.env.DEV)
            console.error(
              "Company should be found but wasn't, this is unexpected."
            );
        } else {
          companySettingsPilotDateLimitToBeSaved.value[
            index
          ].pilotTimeExpires = dateString;
          data.madeChangesInGrid = true;
        }
      }

      // Ensure companiesGridModuleOnChecked gets called regardless
      companiesGridModuleOnChecked({
        fieldName: "featurePilotAccountIsAvailable",
        companyIRI: companyEntity["@id"],
        checked: true
      });
    }

    /**
     * WI#18362. Queue the Active Client toggle behind the Save button, exactly like the modules
     * and features: the click only moves the row in memory, one PATCH per company goes out on
     * Save. The mode label flips to Manual right here because that is what saving will make of
     * it - the backend pins activeClientMode = 'manual' on any value change, so the mode is
     * never sent, only mirrored.
     */
    function activeClientOnChecked(
      { companyIRI, checked }: { companyIRI: string; checked: boolean }
    ): void {
      const index = data.companies.findIndex(
        company => company["@id"] === companyIRI
      );

      if (index === -1) {
        return;
      }

      data.companies.splice(index, 1, {
        ...data.companies[index],
        activeClient: checked,
        activeClientMode: "manual",
        // WI#19987: pinning by hand and handing the flag back are mutually exclusive.
        activeClientResetPending: false
      });

      const companyInRolesToBeSaved = companySettingsModuleRolesToBeSaved.value.find(
        item => item.companyIRI === companyIRI
      );

      if (companyInRolesToBeSaved) {
        companyInRolesToBeSaved.activeClient = checked;
        delete companyInRolesToBeSaved.activeClientMode;
        return;
      }

      // Not queued yet: same shape the modules build, so the save sends the current roles back
      // untouched alongside the toggle.
      companySettingsModuleRolesToBeSaved.value.push({
        companyIRI,
        roles: [...data.companies[index].roles],
        activeClient: checked
      });
    }

    /**
     * WI#19987. Queue "hand the flag back to the platform" for this company.
     *
     * A toggle, not an immediate PATCH: the button turns red to show it is pending and the mode
     * only reaches the backend on Save, alongside the rest of the grid's changes. Pressing it
     * again unqueues it. Queueing it drops any pending manual toggle for the same company, since
     * the two contradict each other.
     */
    function activeClientOnReset(
      { companyIRI }: { companyIRI: string }
    ): void {
      const index = data.companies.findIndex(
        company => company["@id"] === companyIRI
      );

      if (index === -1) {
        return;
      }

      const pending = data.companies[index].activeClientResetPending !== true;

      data.companies.splice(index, 1, {
        ...data.companies[index],
        activeClientResetPending: pending
      });

      const companyInRolesToBeSaved = companySettingsModuleRolesToBeSaved.value.find(
        item => item.companyIRI === companyIRI
      );

      if (!pending) {
        if (companyInRolesToBeSaved) {
          delete companyInRolesToBeSaved.activeClientMode;
        }
        return;
      }

      if (companyInRolesToBeSaved) {
        companyInRolesToBeSaved.activeClientMode = "auto";
        delete companyInRolesToBeSaved.activeClient;
        return;
      }

      // Not queued yet: same shape the modules build, so the save sends the current roles back
      // untouched alongside the mode.
      companySettingsModuleRolesToBeSaved.value.push({
        companyIRI,
        roles: [...data.companies[index].roles],
        activeClientMode: "auto"
      });
    }

    function potentialSuppliersLimitSelected(companyEntity: any, limit: number | null) {
      const index = data.companies.findIndex(
        company => company["@id"] === companyEntity["@id"]
      );

      if (index !== -1) {
        data.companies.splice(index, 1, {
          ...data.companies[index],
          potentialSupplierRequestLimit: limit
        });
      }

      const existing = companySettingsPotentialSuppliersLimitToBeSaved.value.find(
        item => item.companyIRI === companyEntity["@id"]
      );

      if (isUndefined(existing)) {
        companySettingsPotentialSuppliersLimitToBeSaved.value.push({
          companyIRI: companyEntity["@id"],
          potentialSupplierRequestLimit: limit
        });
      } else {
        existing.potentialSupplierRequestLimit = limit;
      }

      // Ensure the company is tracked in companySettingsModuleRolesToBeSaved so
      // buttonSaveOnClick processes it even when only the limit changed (no checkbox toggled).
      if (!companySettingsModuleRolesToBeSaved.value.some(item => item.companyIRI === companyEntity["@id"])) {
        const company = data.companies.find(c => c["@id"] === companyEntity["@id"]);
        if (company) {
          companySettingsModuleRolesToBeSaved.value.push({
            companyIRI: companyEntity["@id"],
            roles: [...company.roles]
          });
        }
      }

      data.madeChangesInGrid = true;
    }

    /**
     * Function to handle when a company grid module is checked.
     *
     * @param { fieldName, companyIRI, checked }
     * - {CompaniesGridModuleFieldName} fieldName - The field name of the company grid module.
     * - {string} companyIRI - The IRI of the company.
     * - {boolean} checked - Indicates if the module is checked.
     */
    function companiesGridModuleOnChecked({
      fieldName,
      companyIRI,
      checked
    }: {
      fieldName: CompaniesGridModuleFieldName;
      companyIRI: string;
      checked: boolean;
    }) {
      // Find company in grid using companyIRI
      const company = data.companies.find(
        company => company["@id"] === companyIRI
      );
      // Not found
      if (isUndefined(company)) {
        if (import.meta.env.DEV) console.log("Company not found");
        return;
      }
      // Update grid data
      company[fieldName] = checked;
      // Get the corresponding role for the fieldName
      const role = getRoleFromFieldName(fieldName);

      if (isUndefined(role)) {
        if (import.meta.env.DEV) console.log("Role not found");
        return;
      }

      // Find or create the company in the list of pending changes
      let companyInRolesToBeSaved = companySettingsModuleRolesToBeSaved.value.find(
        item => item.companyIRI === companyIRI
      );

      if (!companyInRolesToBeSaved) {

        companyInRolesToBeSaved = {
          companyIRI,
          roles: [...company.roles] // Start with the current roles
        };
        companySettingsModuleRolesToBeSaved.value.push(companyInRolesToBeSaved);

      }

      // Add role if checked
      if (checked) {
        if (!companyInRolesToBeSaved.roles.includes(role)) {
          companyInRolesToBeSaved.roles.push(role);
        }
      } else {
        // Remove role if unchecked
        companyInRolesToBeSaved.roles = companyInRolesToBeSaved.roles.filter(
          item => item !== role
        );

        // If FEATURE_PILOT is unchecked, remove related entry from pilot date limit array
        if (role === FEATURE_ROLES.PILOT) {
          companySettingsPilotDateLimitToBeSaved.value = companySettingsPilotDateLimitToBeSaved.value.filter(
            item => item.companyIRI !== companyIRI
          );
        }
      }

      // Update the company's roles in the main data store
      company.roles = companyInRolesToBeSaved.roles;

      // Ensure no duplicate roles (just as a safeguard)
      companyInRolesToBeSaved.roles = [
        ...new Set(companyInRolesToBeSaved.roles)
      ];
    }

    // *** END Modules ***

    // *** Actions - Save ***

    // AB#20518. Save no longer waits for a Potential Suppliers limit: an empty limit is what the
    // backend calls "no limit" (PotentialSupplierRequestDataPersister returns early on null), so
    // blocking the save here left a freshly created company unable to turn F21 on at all.
    const buttonSaveIsDisabled = computed(() => {
      return !data.madeChangesInGrid;
    });

    function buttonSaveOnClick() {


      data.loadingCompanies = true;

      let promises: Promise<ApiResponse>[] = [];

      companySettingsModuleRolesToBeSaved.value.forEach(c => {
        if (isNullOrUndefined(c) || isNullOrUndefined(c.companyIRI)) {
          if (import.meta.env.DEV) {
            console.log("c or c.companyIRI is null or undefined");
          }
          return;
        }

        // Ensure FEATURE_PILOT role is included if there’s a corresponding entry in companySettingsPilotDateLimitToBeSaved
        const pilotDateLimit = companySettingsPilotDateLimitToBeSaved.value.find(
          item => item.companyIRI === c.companyIRI
        );

        if (pilotDateLimit && !c.roles.includes(FEATURE_ROLES.PILOT)) {
          c.roles.push(FEATURE_ROLES.PILOT);
        }

        const companyToBeSaved = companiesRawData.value.find(
          item => item["@id"] === c.companyIRI
        );

        if (isUndefined(companyToBeSaved)) {
          if (import.meta.env.DEV) {
            console.log("companyToBeSaved is undefined");
          }
          return;
        }

        // Ensure unique roles
        const uniqueRoles = [...new Set(c.roles)];

        // Prepare the company data to be saved
        const companyData: any = { roles: uniqueRoles };

        // WI#18362: only when this company's Active Client was actually toggled. Sending the
        // unchanged value would be a no-op for the backend, but leaving it out keeps a
        // modules-only save from ever touching the flag.
        if (!isUndefined(c.activeClient)) {
          companyData.activeClient = c.activeClient;
        }

        // WI#19987: Set Auto was pressed for this company. The backend un-pins it and recomputes
        // the flag, and the reload below brings the recomputed value back into the grid.
        if (!isUndefined(c.activeClientMode)) {
          companyData.activeClientMode = c.activeClientMode;
        }

        // Only include potentialSupplierRequestLimit if the company has the FEATURE_POTENTIAL_SUPPLIERS role
        if (c.roles.includes(FEATURE_ROLES.POTENTIAL_SUPPLIERS)) {
          const limitEntry = companySettingsPotentialSuppliersLimitToBeSaved.value.find(
            item => item.companyIRI === c.companyIRI
          );
          if (limitEntry && limitEntry.potentialSupplierRequestLimit != null) {
            companyData.potentialSupplierRequestLimit = limitEntry.potentialSupplierRequestLimit;
          }
        }

        // Only include pilotTimeExpires if the company has the FEATURE_PILOT role
        if (c.roles.includes(FEATURE_ROLES.PILOT)) {
          const pilotDateLimit = companySettingsPilotDateLimitToBeSaved.value.find(
            item => item.companyIRI === c.companyIRI
          );

          const pilotTimeExpires = pilotDateLimit
            ? DateUtils.formatDateForTimestamp(
              new Date(pilotDateLimit.pilotTimeExpires)
            )
            : null;

          if (pilotTimeExpires) {
            if (import.meta.env.DEV) console.log("pilotTimeExpires final:", pilotTimeExpires);
            companyData.pilotTimeExpire = pilotTimeExpires;
          }
        }

        // Ensure roles reflect the actual state, including newly added roles
        const initialRoles = companyToBeSaved.roles || [];
        const rolesToBeSaved = uniqueRoles.filter(role =>
          initialRoles.includes(role)
        );

        // Add any new roles not in the initial roles
        const newRoles = uniqueRoles.filter(
          role => !initialRoles.includes(role)
        );
        rolesToBeSaved.push(...newRoles);

        companyData.roles = [...new Set(rolesToBeSaved)];

        const p = CompanyAPI.companyAPIUpdate({
          companyIRI: c.companyIRI,
          company: companyData
        });

        if (import.meta.env.DEV) {
          console.log("API Call Promise:", p);
        }

        if (isNullOrUndefined(p)) {
          return;
        }

        promises.push(p);
      });

      if (promises.length > 0) {
        Promise.all(promises).then((responses: ApiResponse[]) => {
          data.loadingCompanies = false;

          // EF-2. companyAPIUpdate resolves even when the PATCH fails - it swallows the axios
          // error and reports it through `success` - so a rejection handler would never run and
          // the responses have to be inspected instead.
          if (responses.some(response => !response?.success)) {
            revertUnsavedCompanyChanges();
            toast.error(translate.t('global.noty.errorUpdatingData'));
            return;
          }

          companySettingsModuleRolesToBeSaved.value = [];
          //Synchronize the initial state with the updated state
          initialCompaniesState.value = ObjectUtils.cloneDeep(data.companies) as CompanySettingsCompaniesGridData[];
          //Clear the madeChangesInGrid flag
          data.madeChangesInGrid = false;
          toast.success(translate.t('global.saveSuccess'));
          companiesAPIReadAll();
        }).catch(() => {
          // Nothing above is expected to throw, but a stuck spinner would leave the console
          // unusable, so the same recovery covers it.
          data.loadingCompanies = false;
          revertUnsavedCompanyChanges();
          toast.error(translate.t('global.noty.errorUpdatingData'));
        });
      } else {
        data.loadingCompanies = false;
      }
    }

    /**
     * EF-2. Put the grid back on its last saved state and drop the pending edits, so a
     * checkbox never keeps a change the server rejected. The deep watcher on data.companies
     * clears madeChangesInGrid on its own once the state matches again.
     */
    function revertUnsavedCompanyChanges() {
      data.companies = ObjectUtils.cloneDeep(initialCompaniesState.value) as CompanySettingsCompaniesGridData[];
      companySettingsModuleRolesToBeSaved.value = [];
      companySettingsPilotDateLimitToBeSaved.value = [];
      companySettingsPotentialSuppliersLimitToBeSaved.value = [];
      data.keyGrid++;
    }

    // *** END Actions - Save ***

    function onShowDeleteConfirmation(company: any) {
      company.showDeleteConfirmation = !company.showDeleteConfirmation;
    }

    function goToCompanyUsers(id: any, companyName: string) {
      router.push({
        name: Routing.admin.companyUsers,
        query: {
          id: id.replace("/api/companies/", ""),
          companyName: companyName,
          companyId: id.replace("/api/companies/", "")
        }
      })
    }

    /**
     * Parse companies data, include name, number of users, and actions columns
     *
     * @param {CompanyAPIPlatformResponse[]} companies - Companies data from the API
     * @return {CompanySettingsCompaniesGridData[]} - Parsed companies data
     */
    function parseCompanies(
      companies: CompanyAPIPlatformResponse[]
    ): CompanySettingsCompaniesGridData[] {
      return companies.map(company => {
        return {
          ...company,
          actions: true,
          featureEmailNegotiationsIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.EMAIL_NEGOTIATIONS),
          featurePilotAccountIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.PILOT),
          showDeleteConfirmation: false,
          // Add modules availability per company
          moduleAnalyzeIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.ANALYZE),
          moduleProgramIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.OPPORTUNITY),
          modulePlanIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.PLAN),
          moduleManageIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.MANAGE),
          moduleEntityCardIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.SUPPLIERS),
          moduleCompareIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.COMPARE),
          moduleOverviewIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.MATCH),
          // UC-ENT-12. Enables the receivables application for this company; every user of it can
          // then sign in to AR. The per-module set lives in AR's own store and is provisioned from
          // this flag during the B2C journey (UC-ENT-16), not here.
          moduleArIsAvailable: hasModuleRole(company.roles, MODULE_ROLES.AR),
          // Feature roles
          downloadExcelIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.DOWNLOAD_EXCEL),
          featureDownloadPdfEntityIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.DOWNLOAD_PDF_ENTITY),
          matchDowloadExcelIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.DOWNLOAD_EXCEL_MATCH),
          scfStandardStrategy: hasFeatureRole(company.roles, FEATURE_ROLES.SCF_STRATEGY),
          feature9BoxesFinancing: hasFeatureRole(company.roles, FEATURE_ROLES.NINE_BOXES_FINANCING),
          featureVCardIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.VIRTUAL_CARD),
          featurePaymentTermsvsPrice: hasFeatureRole(company.roles, FEATURE_ROLES.PAYMENT_TERMS_VS_PRICE),
          // feature pilot
          featurePilotAccount: hasFeatureRole(company.roles, FEATURE_ROLES.PILOT),
          pilotTimeExpires: company.pilotTimeExpires ?? null,
          // feature credit rating
          featureCreditRating: hasFeatureRole(company.roles, FEATURE_ROLES.CREDIT_RATING),
          // feature sme
          featureSME: hasFeatureRole(company.roles, FEATURE_ROLES.SME),
          featureValueProposition: hasFeatureRole(company.roles, FEATURE_ROLES.VALUE_PROPOSITION),
          featureLeverageDistribution: hasFeatureRole(company.roles, FEATURE_ROLES.LEVERAGE_DISTRIBUTION),
          featureEntityCardNewsletter: hasFeatureRole(company.roles, FEATURE_ROLES.ENTITY_CARD_NEWSLETTER),
          featureKeepHistoricalData: hasFeatureRole(company.roles, FEATURE_ROLES.KEEP_HISTORICAL_DATA),
          featureSupplierStandard: hasFeatureRole(company.roles, FEATURE_ROLES.SUPPLIER_STANDARD),
          featurePeerGroupStandard: hasFeatureRole(company.roles, FEATURE_ROLES.PEER_GROUP_STANDARD),
          featureSupportBot: hasFeatureRole(company.roles, FEATURE_ROLES.SUPPORT_BOT),
          featureSupplierInsightsIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.SUPPLIER_INSIGHTS),                    
          featurePotentialSuppliersIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.POTENTIAL_SUPPLIERS),
          potentialSupplierRequestLimit: company.potentialSupplierRequestLimit ?? null,
          potentialSupplierCount: company.potentialSupplierCount ?? null,
          featureForecastVolumeIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.FORECAST_VOLUME),
          featureAiBotNegotiation: hasFeatureRole(company.roles, FEATURE_ROLES.AI_BOT_NEGOTIATION),
          featureDynamicFilteredSummariesIsAvailable: hasFeatureRole(company.roles, FEATURE_ROLES.DYNAMIC_FILTERED_SUMMARIES)
        };
      });
    }

    /**
     * Get all companies data from the API.
     * Route: GET - /api/companies
     *
     * @return {void}
     */
    function companiesAPIReadAll(): void {
      // Enable loading
      data.loadingCompanies = true;

      const params = {
        callbackSuccess: (
          callbackSuccessData: /*CompanyAPIPlatformResponse[]*/ any
        ) => {

          companiesRawData.value = callbackSuccessData['hydra:member']
          data.companies = parseCompanies(
            adminBackendStore.getCompanies
          );

          // Refresh grid
          data.keyGrid++;

          // Mark the initial load as complete
          data.initialLoadComplete = true;
          // Disable loading
          data.loadingCompanies = false;
        },
        callbackError: () => {
          // Disable loading
          data.loadingCompanies = false;
        }
      };

      adminBackendStore.fetchCompanies(params);
    }

    /**
     * Update the selected company using the API. Then call whoAmI.
     *
     * @param {any} idCompany - The id of the selected company
     * @return {void}
     */
    function setCompany(idCompany: any): void {
      // Enable loading
      data.loadingCompanies = true;

      const params = {
        selectedCompany: idCompany,
        callbackSuccess: () => {
          const params = {
            callbackSuccess: () => {
              data.loadingCompanies = false;
              Routing.admin.openAdminCompanyInfo();
            },
            callbackError: () => {
              data.loadingCompanies = false;
            }
          };

          // Call whoAmI
          userStore.whoAmI(params);
        },
        callbackError: () => {
          // Disable loading
          data.loadingCompanies = false;
        }
      };

      userStore.postUserCompany(params);
    }

    // *** Setup ***
    onMounted(() => {
      companiesAPIReadAll();
      setGridHeight();
    });

    // *** END Setup ***

    return {
      ...toRefs(data),
      buttonSaveIsDisabled,
      buttonSaveOnClick,
      companiesAPIReadAll,
      activeClientOnChecked,
      activeClientOnReset,
      companiesGridModuleOnChecked,
      dateSelected,
      potentialSuppliersLimitSelected,
      goToCompanyUsers,
      onShowDeleteConfirmation,
      router,
      Routing,
      setCompany
    };
  }
};
</script>