<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<section class="page-content-top">
  <h1 id="errors">Create company</h1>
</section>
<section class="page-content">
  <div class="col-12">
    <h3>{{ $t('adminBackend.createCompanyAdmin.editCompany') }}</h3>
    <div class="alert-error" v-if="messageError.length > 0"><span v-html="messageError"></span></div>
    <div class="generalForm">
      <div class="user login page"></div>
      <div class="login_body"></div>
      <form class="form form__company mt-4">
        <div class="row change-row-sm mt-4">
          <div class="col-sm-12 col-md-9">
            <div class="form-group">
              <label for="company-name">
                <input class="form-control required" id="company-name" v-model="companyName" type="text" name="company-name" :placeholder="$t('welcomeCompanyInfo.form.nameOfCompanyPlaceholder')" @input="checkInputError(companyName)"/><span>{{ $t('welcomeCompanyInfo.form.nameOfCompany') }}<sup>*</sup></span>
              </label>
            </div>
            <div class="form-group">
              <label for="company-address">
                <input class="form-control" id="company-address" v-model="companyAddress" type="text" name="company-address" :placeholder="$t('welcomeCompanyInfo.form.addressPlaceholder')" @input="checkInputError(companyAddress)"/><span>{{ $t('welcomeCompanyInfo.form.address') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-sm-12 col-md-3">
            <div class="text-center"><img class="img image-style" v-if="showLogo !== null" :src="showLogo" alt="Logo" style="width: 100px; height: auto;"/><img class="img-fluid image-style" v-else :src="images.emptyCompanyLogo" alt="Logo" style="width: 100px; height: auto;"/>
              <input class="form-control required" id="company-clearbit" type="file" accept=".jpg,.png" style="display: none" name="company-clearbit" @change="onChangeLogo"/>
              <div class="my-1"><a class="btn btn-simple btn-icon link link--icon font-md mx-auto" @click="onClickModifyLogo"><i class="fa-solid fa-pencil text-sm mr-2"></i><span>{{ $t('welcomeTeam.logo.modify') }}</span></a></div>
              <div class="label font-md">{{ $t('welcomeTeam.logo.size', { size: maxImageMb }) }}</div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-4">
            <div class="form-group">
              <label for="company-country">
                <select class="form-control required" id="company-country" v-model="companyCountry" name="company-country" @change="onChangeCountry(companyCountry)" :disabled="dataCountries.length === 0">
                  <option value="" selected="selected">{{ $t('global.selectCountry') }}</option>
                  <option v-for="country in dataCountries" :value="country['@id']">{{ country.localizedName }}</option>
                </select><span>{{ $t('global.country') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-4">
            <div class="form-group">
              <label for="company-city">
                <input class="form-control required" id="company-city" v-model="companyCity" type="text" name="company-city" :placeholder="$t('welcomeCompanyInfo.form.cityPlaceholder')" @input="checkInputError(companyCity)"/><span>{{ $t('welcomeCompanyInfo.form.city') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-4">
            <div class="form-group">
              <label for="company-zip">
                <input class="form-control required" id="company-zip" v-model="companyZipCode" type="text" name="company-zip" :placeholder="$t('welcomeCompanyInfo.form.zipCodePlaceholder')" @input="checkInputError(companyZipCode)"/><span>{{ $t('welcomeCompanyInfo.form.zipCode') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-4">
            <div class="form-group">
              <label for="language">
                <select class="custom-select" id="language" name="language">
                  <option value="en" selected="selected">{{ $t('adminBackend.createCompanyAdmin.form.english') }}</option>
                </select><span>{{ $t('adminBackend.createCompanyAdmin.form.language') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-4">
            <div class="form-group">
              <label for="currency">
                <select class="custom-select test-select" id="currency" name="currency" v-model="currency">
                  <option class="placeholder-option" value="" hidden="hidden" selected="selected" default="default">{{ $t('adminBackend.createCompanyAdmin.form.currencyPlaceholder') }}</option>
                  <option v-for="currency in currencies" :value="currency['@id']">{{ currency.code }}</option>
                </select><span>{{ $t('adminBackend.createCompanyAdmin.form.currency') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-4">
            <div class="form-group">
              <label for="company-id">
                <select class="form-control required" id="company-id" v-model="companyIdentificationType" name="company-id" @change="checkInputError(companyIdentificationType)" :disabled="dataCountriesTypeById.length === 0">
                  <option value="" selected="selected">{{ $t('welcomeCompanyInfo.form.IDPlaceholder') }}</option>
                  <option v-for="countryType in dataCountriesTypeById" :value="countryType['@id']">{{ countryType.value }}</option>
                </select><span>{{ $t('welcomeCompanyInfo.form.ID') }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-4">
            <div class="form-group">
              <label for="company-id-number">
                <input class="form-control" id="company-id-number" v-model="companyIdentificationValue" type="text" name="company-id-number" :placeholder="$t('welcomeCompanyInfo.form.numberPlaceholder')" @input="checkInputError(companyIdentificationValue)"/><span>{{ $t('welcomeCompanyInfo.form.number') }}</span>
              </label>
            </div>
          </div>
          <div class="col-4">
            <div class="form-group">
              <label for="company-website">
                <input class="form-control required" id="company-website" v-model="companyDomain" type="text" name="company-website" :placeholder="$t('welcomeCompanyInfo.form.urlPlaceholder')" @input="checkInputError(companyDomain)"/><span>{{ $t('welcomeCompanyInfo.form.url') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-2">
            <div class="form-group">
              <label for="wacc">
                <input class="form-control required" id="wacc" type="number" v-model="wacc" min="0" max="100" pattern="^d*(.d{0,2})?$" :placeholder="$t('home.homeFinancialData.waccPlaceholder')" @keyup="validateWacc(wacc)"/><span>{{ $t('home.homeFinancialData.wacc') }}                    <sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-2">
            <div class="form-group">
              <label for="taxRate">
                <input class="form-control required" id="taxRate" type="number" v-model="taxRate" min="0" max="100" pattern="^d*(.d{0,2})?$" :placeholder="$t('home.homeFinancialData.taxRatePlaceholder')" @keyup="validateTaxrate(taxRate)"/><span>{{ $t('home.homeFinancialData.taxRate') }}                    <sup>*</sup></span>
              </label>
            </div>
          </div>
        </div>
        <div class="row w-100">
          <div class="col-4">
            <div class="d-flex flex-column"><span class="text-gray-600 text-3xl font-semibold">{{ $t('adminBackend.createCompanyAdmin.form.userLimit') }}</span><span class="text-gray-600">{{ $t('adminBackend.createCompanyAdmin.form.userLimitDescription') }}  </span>
              <div class="col-12 form-group p-0 mt-2 mr-2">
                <label for="user-limit">
                  <input class="form-control required" id="limit-user" v-model="limitUser" type="number" name="limit-user" :min="minUsersAllowed" :max="maxUsersAllowed" :placeholder="$t('welcomeTeam.form.teamNew')" @input="checkInputError(limitUser)"/><span>{{ $t('adminBackend.createCompanyAdmin.form.limitUserInput') }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="col-3">
            <div class="d-flex flex-column"><span class="text-gray-600 text-3xl font-semibold">{{ $t('adminBackend.createCompanyAdmin.form.clusters') }}</span></div>
            <div class="col-12 p-0 mt-4">
              <div class="row">
                <div class="col-12">
                  <div class="d-flex align-items-center">
                    <div class="form-checkout">
                      <label>
                        <input type="checkbox" name="excludeForPeerGroupClustering" v-model="excludeForPeerGroupClustering"/><span class="custom"></span><span>{{$t('adminBackend.createCompanyAdmin.form.excludeForPeerGroupClusteringDescription')}}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-12">
                  <div class="d-flex align-items-center">
                    <div class="form-checkout">
                      <label>
                        <input type="checkbox" name="excludeForSupplierStandardClustering" v-model="excludeForSupplierStandardClustering"/><span class="custom"></span><span>{{$t('adminBackend.createCompanyAdmin.form.excludeForSupplierStandardClusteringDescription')}}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-5">
            <div class="d-flex flex-column"><span class="text-gray-600 text-3xl font-semibold">{{ $t('global.inactivityDays') }}</span></div>
            <div class="col-12 p-0 mt-4">
              <div class="row">
                <div class="col-12">
                  <div class="d-flex align-items-center"></div>
                  <div class="col-12 form-group p-0">
                    <label for="limit-inactivity">
                      <input class="form-control required" id="limit-inactivity" v-model="inactivityDays" type="number" name="limit-inactivity" :min="minActivityLimit" :max="maxActivityLimit" :placeholder="$t('global.inactivityPlaceholder')" @change="checkinactivityDays()"/><span>{{ $t('global.inactivity') }}</span>
                    </label><span class="error text-left errors-days" v-if="errorAapplyPasswordPolicy">{{ $t('adminBackend.createCompanyAdmin.form.limitActivityTime') }} </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-12">
            <div class="d-flex flex-column"><span class="text-gray-600 text-3xl font-semibold">{{ $t('adminBackend.createCompanyAdmin.form.allowedDomains') }}</span></div>
            <div class="col-12 p-0 mt-4">
              <div class="row">
                <div class="col-12">
                  <div class="d-flex align-items-center"></div>
                  <div class="col-12 form-group p-0">
                    <label for="allowedDomains">
                      <input class="form-control required" id="allowedDomains" v-model="allowedDomains" type="text" name="'allowedDomains'" :placeholder="$t('adminBackend.createCompanyAdmin.form.allowedDomainsDescription')"/><span>{{ $t('adminBackend.createCompanyAdmin.form.allowedDomains') }}          </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row mb-4">
          <div class="col-12"><span class="text-gray-600 text-3xl font-semibold">{{ $t('welcome.components.welcomeAddIndustry.h1') }}</span></div>
        </div>
        <div class="row">
          <div class="col-8" v-if="showIndustry">
            <CompanyIndustrySelector class="mb-4" @addIndustry="setIndustry"></CompanyIndustrySelector>
          </div>
          <div class="col-8" v-if="!showIndustry">
            <div class="form-group">
              <label>
                <input class="form-control" v-model="industryName" :key="industryName" type="text" disabled="disabled"/><span>{{ $t('label.industry')}}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-3" :class="showIndustry ? 'mt-2' : ''">
            <div class="form-group" :class=" showIndustry ? 'mt-8' : ''">
              <label>
                <select class="form-control required" v-model="revenuePercentage">
                  <option v-for="index in 100" :value="index">{{ index }}</option>
                </select><span>{{ $t('welcomeCompanyProfile.form.percentage') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-1" :class="showIndustry ? 'mt-8' : ''">
            <div class="d-flex justify-content-center align-items-center" style="height: 64px;">
              <CalculumEditIcon id="industry-edit" @click="apiRemoveIndustry">               </CalculumEditIcon>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12"><span class="text-gray-600 text-base font-semibold">{{ $t('home.entityCard.rating.financialMetrics') }}          </span></div>
        </div>
        <div class="row">
          <div class="col-4">
            <div class="form-group">
              <label for="company-financial-anual-sales">
                <input class="form-control" id="company-financial-anual-sales" v-model="annualSalesRevenueMillions" type="number" name="company-financial-anual-sales" :placeholder="$t('welcomeCompanyProfile.form.salesPlaceholder')" @input="checkInputError(annualSalesRevenueMillions)"/><span>{{ $t('welcomeCompanyProfile.form.sales') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-4">
            <div class="form-group">
              <label for="company-financial-anual-spend">
                <input class="form-control" id="company-financial-anual-spend" v-model="annualSpendMillions" type="number" name="company-financial-anual-spend" :placeholder="$t('welcomeCompanyProfile.form.spendPlaceholder')" @input="checkInputError(annualSpendMillions)"/><span>{{ $t('welcomeCompanyProfile.form.spend') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
          <div class="col-4">
            <div class="form-group">
              <label for="company-financial-accounts-receivables">
                <input class="form-control" id="company-financial-accounts-receivables" v-model="accountsReceivablesMillions" type="number" name="company-financial-accounts-receivables" :placeholder="$t('welcomeCompanyProfile.form.tradeReceivablesPlaceholder')" @input="checkInputError(accountsReceivablesMillions)"/><span>{{ $t('welcomeCompanyProfile.form.tradeReceivables') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-8">
            <div class="form-range">
              <label for="company-payment-terms-suppliers">{{ $t('welcomeCompanyProfile.paymentTerms.suppliers') }}<sup>*</sup>
                <div class="form-range-group justify-content-between">
                  <input class="slider mr-5" id="company-payment-terms-suppliers" v-model="averagePaymentTermsWithSuppliersDays" name="company-payment-terms-suppliers" type="range" min="0" max="400" oninput="this.nextElementSibling.value = this.value" @input="checkInputError(averagePaymentTermsWithSuppliersDays)"/>
                  <div class="w100 d-flex justify-content-end align-items-center">
                    <input class="form-control" style="width: 100px;" v-model="averagePaymentTermsWithSuppliersDays" type="number" min="0" @input="checkInputError(averagePaymentTermsWithSuppliersDays)"/><span class="ml-4">{{ $t('welcomeCompanyProfile.days') }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-8">
            <div class="form-range">
              <label for="company-payment-terms-customers">{{ $t('welcomeCompanyProfile.paymentTerms.customers') }}<sup>*</sup>
                <div class="form-range-group justify-content-between">
                  <input class="slider mr-5" id="company-payment-terms-customers" v-model="averagePaymentTermsWithCustomersDays" name="company-payment-terms-customers" type="range" min="0" max="400" oninput="this.nextElementSibling.value = this.value" @input="checkInputError(averagePaymentTermsWithCustomersDays)"/>
                  <div class="w100 d-flex justify-content-end align-items-center">
                    <input class="form-control" style="width: 100px;" v-model="averagePaymentTermsWithCustomersDays" type="number" min="0" @input="checkInputError(averagePaymentTermsWithCustomersDays)"/><span class="ml-4">{{ $t('welcomeCompanyProfile.days') }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-8">
            <div class="form-range">
              <label for="company-invoices-approve-supplier">{{ $t('welcomeCompanyProfile.paymentTerms.suppliersTime') }}<sup>*</sup>
                <div class="form-range-group justify-content-between">
                  <input class="slider mr-5" id="company-invoices-approve-supplier" v-model="averageTimeApproveInvoicesReceivedFromSuppliersDays" name="company-invoices-approve-supplier" type="range" min="0" max="400" oninput="this.nextElementSibling.value = this.value" @input="checkInputError(averageTimeApproveInvoicesReceivedFromSuppliersDays)"/>
                  <div class="w100 d-flex justify-content-end align-items-center">
                    <input class="form-control" style="width: 100px;" v-model="averageTimeApproveInvoicesReceivedFromSuppliersDays" type="number" min="0" @input="checkInputError(averageTimeApproveInvoicesReceivedFromSuppliersDays)"/><span class="ml-4">{{ $t('welcomeCompanyProfile.days') }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="row justify-content-between">
          <div class="col-12 d-flex justify-content-end">
            <div class="form-button d-flex gap-2 mt-5"><a class="btn outline-secondary-btn font-md" @click="Routing.admin.openCompaniesAdmin()"><span>{{ $t('button.cancel') }}</span></a><a class="btn btn-primary" @click="validateform"><span class="spinner-border spinner-border-sm" v-if="spinnerValidation" role="status" aria-hidden="true"></span><span id="edit-company-save-changes" v-else>{{ $t('button.update') }}</span></a></div>
          </div>
        </div>
      </form>
    </div>
  </div>
</section>
</template>

<script lang='ts'>
import { computed, reactive, ref, toRefs, defineComponent } from 'vue'
import { useAppStore } from '@/stores/app'
import { useWelcomeStore } from '@/stores/welcome'
import { useI18n } from 'vue-i18n'
import { CalculumLoading } from '@ada/design-system'
import { getMediaUrl } from '@/services/media/mediaActions'
import * as Routing from '@/services/router/Routing'
import { useToast } from "vue-toastification";
import CompanyIndustrySelector from '@/modules/adminBackend/components/CompanyIndustrySelector.vue'
import * as Validator from '@/utils/validators'
import { images, fontIcons } from '@/resources/assets/assets'
import CalculumEditIcon from '@/modules/components/icons/IconEdit.vue'
import { StringUtils, ObjectUtils } from "@/utils";
import { useAdminBackendStore } from '@/stores/adminBackend'
import { MAX_IMAGE_MB } from '@/utils/uploadLimits'

export default defineComponent({
  name: 'EditCompanyAdminNewFlow',
  components: {
    CalculumLoading,
    CompanyIndustrySelector,
    CalculumEditIcon
  },
  props: {
    idCompany: { type: String, required: true }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    document.title = translate.t('adminBackend.createCompanyAdmin.editCompany')
    const appStore = useAppStore()
    const adminBackendStore = useAdminBackendStore()
    const welcomeStore = useWelcomeStore()
    const file = ref(null)
    const toast = useToast()

    // Create computed properties for reactive data from Pinia store
    const dataCountries = computed(() => appStore.getCountries)
    const currencies = computed(() => appStore.getCurrencieswithId)


    interface DataEdit {
      accountsReceivablesMillions: number,
      annualSalesRevenueMillions: number,
      annualSpendMillions: number,
      averagePaymentTermsWithCustomersDays: string,
      averagePaymentTermsWithSuppliersDays: string,
      averageTimeApproveInvoicesReceivedFromSuppliersDays: string,
      companyAddress: string,
      companyCity: string,
      companyCountry: string,
      companyDomain: string,
      companyIdentificationType: string,
      companyIdentificationValue: string,
      companyLogoUrl: any,
      companyName: string,
      companyZipCode: string,
      currency: string,
      dataAccountTypes: Array<any>,
      dataCountriesTypeById: Array<any>,
      excludeForPeerGroupClustering: boolean,
      excludeForSupplierStandardClustering: boolean,
      formErrorMessage: string,
      formHasError: boolean,
      industryName: string,
      industryRelation: string,
      industryRemove: string | null,
      language: string,
      limitUser: number,
      loading: boolean
      loadingDataCountries: boolean,
      maxUsersAllowed: number,
      messageError: string,
      newIndustry: string | null,
      newTeam: string,
      revenuePercentage: number,
      selectedIndustries: Array<any>,
      showCreateTeamDialog: boolean,
      showIndustry: boolean,
      spinnerValidation: boolean,
      teams: Array<any>,
      wacc: number,
      taxRate: number,
      minActivityLimit: number,
      maxActivityLimit: number,
      inactivityDays: number | null,
      errorAapplyPasswordPolicy: boolean,
      allowedMimeTypes: Array<any>,
      allowedDomains: string
    }

    interface OriginalCompanyData {
      companyName: string,
      companyAddress: string,
      companyCity: string,
      companyCountry: string,
      companyZipCode: string,
      companyDomain: string,
      currency: string,
      companyIdentificationType: string | null,
      companyIdentificationValue: string | null,
      wacc: number,
      taxRate: number,
      annualSalesRevenueMillions: number,
      annualSpendMillions: number,
      accountsReceivablesMillions: number,
      averagePaymentTermsWithSuppliersDays: string,
      averagePaymentTermsWithCustomersDays: string,
      averageTimeApproveInvoicesReceivedFromSuppliersDays: string,
      limitUser: number,
      excludeForPeerGroupClustering: boolean,
      excludeForSupplierStandardClustering: boolean,
      inactivityDays: number | null,
      allowedDomains: string,
      newIndustry: string | null,
      revenuePercentage: number,
      language: string,
    }


    const data = reactive<DataEdit>({
      accountsReceivablesMillions: 0,
      annualSalesRevenueMillions: 0,
      annualSpendMillions: 0,
      averagePaymentTermsWithCustomersDays: '0',
      averagePaymentTermsWithSuppliersDays: '0',
      averageTimeApproveInvoicesReceivedFromSuppliersDays: '0',
      companyAddress: '',
      companyCity: '',
      companyCountry: '',
      companyDomain: '',
      companyIdentificationType: '',
      companyIdentificationValue: '',
      companyLogoUrl: '',
      companyName: '',
      companyZipCode: '',
      currency: '',
      dataAccountTypes: [translate.t("adminBackend.createCompanyAdmin.accountTypes.pilot"), translate.t("adminBackend.createCompanyAdmin.accountTypes.analyze"), translate.t("adminBackend.createCompanyAdmin.accountTypes.standard")],
      dataCountriesTypeById: [],
      excludeForPeerGroupClustering: false,
      excludeForSupplierStandardClustering: false,
      formErrorMessage: '',
      formHasError: false,
      industryName: '',
      industryRelation: '',
      industryRemove: null,
      language: 'en',
      limitUser: 0,
      loading: true,
      loadingDataCountries: true,
      maxUsersAllowed: 1000,
      messageError: '',
      newIndustry: '',
      newTeam: '',
      revenuePercentage: 1,
      selectedIndustries: [],
      showCreateTeamDialog: false,
      showIndustry: false,
      spinnerValidation: false,
      teams: [],
      wacc: 0,
      taxRate: 0,
      minActivityLimit: 30,
      maxActivityLimit: 180,
      inactivityDays: null,
      errorAapplyPasswordPolicy: false,
      allowedMimeTypes: [
        'image/png',
        'image/jpeg'
      ],
      allowedDomains: ''
    })

    // Store original company data for change detection
    const originalCompanyData = reactive<OriginalCompanyData>({
      companyName: '',
      companyAddress: '',
      companyCity: '',
      companyCountry: '',
      companyZipCode: '',
      companyDomain: '',
      currency: '',
      companyIdentificationType: null,
      companyIdentificationValue: null,
      wacc: 0,
      taxRate: 0,
      annualSalesRevenueMillions: 0,
      annualSpendMillions: 0,
      accountsReceivablesMillions: 0,
      averagePaymentTermsWithSuppliersDays: '0',
      averagePaymentTermsWithCustomersDays: '0',
      averageTimeApproveInvoicesReceivedFromSuppliersDays: '0',
      limitUser: 0,
      excludeForPeerGroupClustering: false,
      excludeForSupplierStandardClustering: false,
      inactivityDays: null,
      allowedDomains: '',
      newIndustry: null,
      revenuePercentage: 1,
      language: 'en',
    })


    getDataCompany()

    function getDataCompany() {
      data.loading = true
      const params = {
        companyId: '/api/companies/' + props.idCompany,
        callbackSuccess: (callbackSuccessData: any) => {
          data.companyName = callbackSuccessData.name
          data.companyAddress = callbackSuccessData.address
          data.companyCountry = callbackSuccessData.country['@id']
          data.companyCity = callbackSuccessData.city
          data.companyZipCode = callbackSuccessData.zipCode
          data.currency = callbackSuccessData.currency['@id']
          onChangeCountry(callbackSuccessData.country['@id'])
          data.companyIdentificationType = StringUtils.isNullUndefinedOrEmpty(callbackSuccessData.identificationType) ? null : callbackSuccessData.identificationType['@id']
          data.companyIdentificationValue = StringUtils.isNullUndefinedOrEmpty(callbackSuccessData.identificationValue) ? null : callbackSuccessData.identificationValue
          data.companyDomain = callbackSuccessData.domain
          data.wacc = Math.round(callbackSuccessData.wacc * 100 * 100) / 100
          data.taxRate = Math.round(callbackSuccessData.taxRate * 100 * 100) / 100
          data.annualSalesRevenueMillions = callbackSuccessData.annualSalesRevenueMillions ?? 0
          data.accountsReceivablesMillions = callbackSuccessData.accountsReceivablesMillions ?? 0
          data.annualSpendMillions = callbackSuccessData.annualSpendMillions ?? 0
          data.averagePaymentTermsWithSuppliersDays = callbackSuccessData.averagePaymentTerms ?? '0'
          data.averagePaymentTermsWithCustomersDays = callbackSuccessData.averagePaymentTermsWithCustomersDays ?? '0'
          data.averageTimeApproveInvoicesReceivedFromSuppliersDays = callbackSuccessData.averageTimeApproveInvoicesReceivedFromSuppliersDays ?? '0'
          data.selectedIndustries = callbackSuccessData.companyIndustryRelations
          data.limitUser = callbackSuccessData.limitUsers ?? 0
          data.excludeForPeerGroupClustering = callbackSuccessData.excludeForPeerGroupClustering ?? false
          data.excludeForSupplierStandardClustering = callbackSuccessData.excludeForSupplierStandardGroupClustering ?? false
          data.allowedDomains = callbackSuccessData.allowedDomains ?? ''

          data.inactivityDays = callbackSuccessData.inactivityDays ?? null

          if (callbackSuccessData.logo && callbackSuccessData.logo.publicUrl) {
            data.companyLogoUrl = getMediaUrl(callbackSuccessData.logo.publicUrl)
          }
          callbackSuccessData.companyIndustryRelations.forEach((element: any) => {
            data.newIndustry = element.industry['@id']
            data.industryName = element.industry.name
            data.revenuePercentage = element.revenuePercentage
            data.industryRelation = element['@id']
          });
          
          // Initialize original company data for change detection
          updateOriginalCompanyData()
          
          data.loading = false
        },
        callbackError: () => {
          data.loading = false
        }
      }
      welcomeStore.getCompanyData(params)
    }

    function updateOriginalCompanyData() {
      originalCompanyData.companyName = data.companyName
      originalCompanyData.companyAddress = data.companyAddress
      originalCompanyData.companyCity = data.companyCity
      originalCompanyData.companyCountry = data.companyCountry
      originalCompanyData.companyZipCode = data.companyZipCode
      originalCompanyData.companyDomain = data.companyDomain
      originalCompanyData.currency = data.currency
      originalCompanyData.companyIdentificationType = data.companyIdentificationType === '' ? null : data.companyIdentificationType
      originalCompanyData.companyIdentificationValue = data.companyIdentificationValue === '' ? null : data.companyIdentificationValue
      originalCompanyData.wacc = data.wacc
      originalCompanyData.taxRate = data.taxRate
      originalCompanyData.annualSalesRevenueMillions = data.annualSalesRevenueMillions
      originalCompanyData.annualSpendMillions = data.annualSpendMillions
      originalCompanyData.accountsReceivablesMillions = data.accountsReceivablesMillions
      originalCompanyData.averagePaymentTermsWithSuppliersDays = data.averagePaymentTermsWithSuppliersDays
      originalCompanyData.averagePaymentTermsWithCustomersDays = data.averagePaymentTermsWithCustomersDays
      originalCompanyData.averageTimeApproveInvoicesReceivedFromSuppliersDays = data.averageTimeApproveInvoicesReceivedFromSuppliersDays
      originalCompanyData.limitUser = data.limitUser
      originalCompanyData.excludeForPeerGroupClustering = data.excludeForPeerGroupClustering
      originalCompanyData.excludeForSupplierStandardClustering = data.excludeForSupplierStandardClustering
      originalCompanyData.inactivityDays = data.inactivityDays
      originalCompanyData.allowedDomains = data.allowedDomains
      originalCompanyData.newIndustry = data.newIndustry
      originalCompanyData.revenuePercentage = data.revenuePercentage
      originalCompanyData.language = data.language
    }

    function hasCompanyDataChanged(): boolean {
      // Normalize values for comparison (handle null, undefined, empty string)
      const normalizeValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return ''
        return String(value).trim()
      }

      const normalizeNumber = (value: any): number => {
        if (value === null || value === undefined || isNaN(value)) return 0
        return Number(value)
      }

      return (
        normalizeValue(data.companyName) !== normalizeValue(originalCompanyData.companyName) ||
        normalizeValue(data.companyAddress) !== normalizeValue(originalCompanyData.companyAddress) ||
        normalizeValue(data.companyCity) !== normalizeValue(originalCompanyData.companyCity) ||
        normalizeValue(data.companyCountry) !== normalizeValue(originalCompanyData.companyCountry) ||
        normalizeValue(data.companyZipCode) !== normalizeValue(originalCompanyData.companyZipCode) ||
        normalizeValue(data.companyDomain) !== normalizeValue(originalCompanyData.companyDomain) ||
        normalizeValue(data.currency) !== normalizeValue(originalCompanyData.currency) ||
        normalizeValue(data.companyIdentificationType === '' ? null : data.companyIdentificationType) !== normalizeValue(originalCompanyData.companyIdentificationType) ||
        normalizeValue(data.companyIdentificationValue === '' ? null : data.companyIdentificationValue) !== normalizeValue(originalCompanyData.companyIdentificationValue) ||
        normalizeNumber(data.wacc) !== normalizeNumber(originalCompanyData.wacc) ||
        normalizeNumber(data.taxRate) !== normalizeNumber(originalCompanyData.taxRate) ||
        normalizeNumber(data.annualSalesRevenueMillions) !== normalizeNumber(originalCompanyData.annualSalesRevenueMillions) ||
        normalizeNumber(data.annualSpendMillions) !== normalizeNumber(originalCompanyData.annualSpendMillions) ||
        normalizeNumber(data.accountsReceivablesMillions) !== normalizeNumber(originalCompanyData.accountsReceivablesMillions) ||
        normalizeValue(data.averagePaymentTermsWithSuppliersDays) !== normalizeValue(originalCompanyData.averagePaymentTermsWithSuppliersDays) ||
        normalizeValue(data.averagePaymentTermsWithCustomersDays) !== normalizeValue(originalCompanyData.averagePaymentTermsWithCustomersDays) ||
        normalizeValue(data.averageTimeApproveInvoicesReceivedFromSuppliersDays) !== normalizeValue(originalCompanyData.averageTimeApproveInvoicesReceivedFromSuppliersDays) ||
        normalizeNumber(data.limitUser) !== normalizeNumber(originalCompanyData.limitUser) ||
        data.excludeForPeerGroupClustering !== originalCompanyData.excludeForPeerGroupClustering ||
        data.excludeForSupplierStandardClustering !== originalCompanyData.excludeForSupplierStandardClustering ||
        (data.inactivityDays !== null ? normalizeNumber(data.inactivityDays) : null) !== (originalCompanyData.inactivityDays !== null ? normalizeNumber(originalCompanyData.inactivityDays) : null) ||
        normalizeValue(data.allowedDomains) !== normalizeValue(originalCompanyData.allowedDomains)
      )
    }

    function hasIndustryChanged(): boolean {
      const normalizeValue = (value: any): string | null => {
        if (value === null || value === undefined || value === '') return null
        return String(value).trim()
      }

      const normalizeNumber = (value: any): number => {
        if (value === null || value === undefined || isNaN(value)) return 0
        return Number(value)
      }

      return (
        normalizeValue(data.newIndustry) !== normalizeValue(originalCompanyData.newIndustry) ||
        normalizeNumber(data.revenuePercentage) !== normalizeNumber(originalCompanyData.revenuePercentage)
      )
    }

    function getChangedFields(): Partial<any> {
      const normalizeValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return ''
        return String(value).trim()
      }

      const normalizeNumber = (value: any): number => {
        if (value === null || value === undefined || isNaN(value)) return 0
        return Number(value)
      }

      // Helper to add field only if it changed and is not null/undefined
      const addFieldIfChanged = (changedFields: any, fieldName: string, currentValue: any, originalValue: any, transform?: (val: any) => any) => {
        const normalizedCurrent = normalizeValue(currentValue)
        const normalizedOriginal = normalizeValue(originalValue)
        if (normalizedCurrent !== normalizedOriginal) {
          // Only include if current value is not null/undefined/empty
          if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
            changedFields[fieldName] = transform ? transform(currentValue) : currentValue
          } else if (originalValue !== null && originalValue !== undefined && originalValue !== '') {
            // Original had a value, now it's null/empty - include null to clear it
            changedFields[fieldName] = null
          }
          // If both are null/empty, don't include the field
        }
      }

      // Helper for number fields
      const addNumberFieldIfChanged = (changedFields: any, fieldName: string, currentValue: any, originalValue: any, transform?: (val: any) => any) => {
        const normalizedCurrent = normalizeNumber(currentValue)
        const normalizedOriginal = normalizeNumber(originalValue)
        if (normalizedCurrent !== normalizedOriginal) {
          // Only include if current value is a valid number
          if (currentValue !== null && currentValue !== undefined && !isNaN(currentValue)) {
            changedFields[fieldName] = transform ? transform(currentValue) : currentValue
          } else if (originalValue !== null && originalValue !== undefined && !isNaN(originalValue)) {
            // Original had a value, now it's null/invalid - include null to clear it
            changedFields[fieldName] = null
          }
          // If both are null/invalid, don't include the field
        }
      }

      const changedFields: any = {}

      // Only include fields that actually changed
      addFieldIfChanged(changedFields, 'name', data.companyName, originalCompanyData.companyName)
      addFieldIfChanged(changedFields, 'address', data.companyAddress, originalCompanyData.companyAddress)
      addFieldIfChanged(changedFields, 'city', data.companyCity, originalCompanyData.companyCity)
      addFieldIfChanged(changedFields, 'country', data.companyCountry, originalCompanyData.companyCountry)
      addFieldIfChanged(changedFields, 'zipCode', data.companyZipCode, originalCompanyData.companyZipCode)
      addFieldIfChanged(changedFields, 'domain', data.companyDomain, originalCompanyData.companyDomain)
      addFieldIfChanged(changedFields, 'currency', data.currency, originalCompanyData.currency)
      
      const currentIdentificationType = data.companyIdentificationType === '' ? null : data.companyIdentificationType
      addFieldIfChanged(changedFields, 'identificationType', currentIdentificationType, originalCompanyData.companyIdentificationType)
      
      const currentIdentificationValue = data.companyIdentificationValue === '' ? null : data.companyIdentificationValue
      addFieldIfChanged(changedFields, 'identificationValue', currentIdentificationValue, originalCompanyData.companyIdentificationValue)
      
      addNumberFieldIfChanged(changedFields, 'wacc', data.wacc, originalCompanyData.wacc, (val) => val / 100)
      addNumberFieldIfChanged(changedFields, 'taxRate', data.taxRate, originalCompanyData.taxRate, (val) => val / 100)
      addNumberFieldIfChanged(changedFields, 'annualSalesRevenueMillions', data.annualSalesRevenueMillions, originalCompanyData.annualSalesRevenueMillions)
      addNumberFieldIfChanged(changedFields, 'annualSpendMillions', data.annualSpendMillions, originalCompanyData.annualSpendMillions)
      addNumberFieldIfChanged(changedFields, 'accountsReceivablesMillions', data.accountsReceivablesMillions, originalCompanyData.accountsReceivablesMillions)
      
      addFieldIfChanged(changedFields, 'averagePaymentTerms', data.averagePaymentTermsWithSuppliersDays, originalCompanyData.averagePaymentTermsWithSuppliersDays)
      addFieldIfChanged(changedFields, 'averagePaymentTermsWithCustomersDays', data.averagePaymentTermsWithCustomersDays, originalCompanyData.averagePaymentTermsWithCustomersDays)
      addFieldIfChanged(changedFields, 'averageTimeApproveInvoicesReceivedFromSuppliersDays', data.averageTimeApproveInvoicesReceivedFromSuppliersDays, originalCompanyData.averageTimeApproveInvoicesReceivedFromSuppliersDays)
      
      addNumberFieldIfChanged(changedFields, 'limitUsers', data.limitUser, originalCompanyData.limitUser)
      
      if (data.excludeForPeerGroupClustering !== originalCompanyData.excludeForPeerGroupClustering) {
        changedFields.excludeForPeerGroupClustering = data.excludeForPeerGroupClustering
      }
      if (data.excludeForSupplierStandardClustering !== originalCompanyData.excludeForSupplierStandardClustering) {
        changedFields.excludeForSupplierStandardGroupClustering = data.excludeForSupplierStandardClustering ?? false
      }
      
      const currentInactivityDays = data.inactivityDays !== null ? normalizeNumber(data.inactivityDays) : null
      const originalInactivityDays = originalCompanyData.inactivityDays !== null ? normalizeNumber(originalCompanyData.inactivityDays) : null
      if (currentInactivityDays !== originalInactivityDays) {
        // Only include if there's a meaningful change (not both null)
        if (data.inactivityDays !== null || originalCompanyData.inactivityDays !== null) {
          changedFields.inactivityDays = data.inactivityDays
        }
      }
      
      addFieldIfChanged(changedFields, 'allowedDomains', data.allowedDomains, originalCompanyData.allowedDomains)
      
      // Only include language if it actually changed
      // Note: language might not come from server, so we only include if it changed from its original value
      addFieldIfChanged(changedFields, 'userLanguage', data.language, originalCompanyData.language)
      
      // Industry and revenuePercentage are handled separately in industry flow
      // paymentTermDays removed - this field doesn't exist in Company entity

      return changedFields
    }

    function patchCompany(hasIndustryChangedValue: boolean, hasLogoChanged: boolean) {
      // Get only the fields that actually changed
      const changedFields = getChangedFields()
      
      const params = {
        idCompany: '/api/companies/' + props.idCompany,
        ...changedFields,
        callbackSuccess: (response: any) => {
          // Update original data to reflect new baseline
          updateOriginalCompanyData()
          
          // Handle industry updates if needed
          if (hasIndustryChangedValue) {
            if (data.showIndustry) {
              apiRemoveIndustryAPI(() => {
                // After industry operations, handle logo
                if (hasLogoChanged) {
                  uploadCompanyLogo('/api/companies/' + props.idCompany)
                } else {
                  toast.success(translate.t('global.successfullySaved'))
                  Routing.admin.openCompaniesAdmin()
                }
              })
            } else {
              apiUpdateIndustry(() => {
                // After industry operations, handle logo
                if (hasLogoChanged) {
                  uploadCompanyLogo('/api/companies/' + props.idCompany)
                } else {
                  toast.success(translate.t('global.successfullySaved'))
                  Routing.admin.openCompaniesAdmin()
                }
              })
            }
          } else {
            // No industry changes, just handle logo
            if (hasLogoChanged) {
              uploadCompanyLogo('/api/companies/' + props.idCompany)
            } else {
              toast.success(translate.t('global.successfullySaved'))
              Routing.admin.openCompaniesAdmin()
            }
          }
        },
        callbackError: (callbackErrorData: any) => {
          data.spinnerValidation = false
          toast.error(translate.t('error.server500'))
        }
      }
      adminBackendStore.patchCompany(params)
    }

    const showLogo = computed(() => {
      if (file.value !== null && file.value !== undefined) {
        return URL.createObjectURL(file.value)
      } else if (data.companyLogoUrl) {
        return data.companyLogoUrl
      } else {
        return null
      }
    })

    function checkInputError(modelValue: any) {
      if (((typeof modelValue === 'number' && modelValue < 0) || (typeof modelValue === 'string' && !modelValue)) || data.formHasError) {
        if (data.formErrorMessage.length === 0) {
          clearErrors()
        }
      }
    }

    function clearErrors() {
      data.formHasError = false
    }

    function onChangeCountry(countryId: string) {
      if (!countryId) {
        data.dataCountriesTypeById = []
        data.companyIdentificationType = ''
        return
      }
      data.spinnerValidation = true
      const params = {
        countryId,
        callbackSuccess: (response: any) => {
          data.spinnerValidation = false
          data.dataCountriesTypeById = response
          checkInputError(data.dataCountriesTypeById)
        },
        callbackError: () => {
          data.spinnerValidation = false
        }
      }
      appStore.fetchCountryCompanyIdTypes(countryId, params.callbackSuccess, params.callbackError)
    }

    async function onChangeLogo(event: any) {
      file.value = event.target.files[0]
      if (file.value) {
        const isValid = await ObjectUtils.validateFileType(file.value, data.allowedMimeTypes);
        if (!isValid) {
          toast.error(translate.t("global.invalidFileTypeLogo"));
          file.value = null
          return
        }
      }
    }

    function onClickModifyLogo() {
      const fileDOM: any | null = document.getElementById('company-clearbit')
      if (fileDOM !== null) {
        fileDOM.click()
      }
    }

    function uploadCompanyLogo(idCompany: string) {
      const params = {
        companyId: idCompany,
        file: file.value,
        callbackSuccess: (callbackSuccessData: any) => {
          // Clear file value after successful upload to prevent re-uploading on next save
          file.value = null
          data.spinnerValidation = false
          toast.success(translate.t('global.successfullySaved'))
          Routing.admin.openCompaniesAdmin()
        },
        callbackError: () => { 
          data.formHasError = true
          data.spinnerValidation = false
          toast.error(translate.t('error.server500'))
        }
      }
      welcomeStore.postUploadCompanyLogo(params)
    }

    function validateWacc(wacc: number) {
      if (isNaN(wacc) || wacc === null || wacc < 0 || wacc > 100) {
        toast.error(translate.t('welcomeCompanyInfo.form.waccwrong'));
        data.wacc = 0
        return false
      }
    }

    function setIndustry(newIndustry: any) {
      data.newIndustry = newIndustry
    }

    function apiRemoveIndustry() {
      //- The user click on pencil to edit the industry
      //- so, industryRemove now have a value
      data.showIndustry = true
      data.industryRemove = data.industryRelation
      data.newIndustry = null
    }

    function apiRemoveIndustryAPI(onComplete?: () => void) {
      const params = {
        companyIndustryRelationId: data.industryRemove,
        callbackSuccess: () => {
          apiAddIndustry(onComplete)
        },
        callbackError: () => {
          data.spinnerValidation = false
          toast.error(translate.t('error.server500'))
        }
      }
      welcomeStore.deleteCompanyIndustryRelation(params)
    }

    function apiAddIndustry(onComplete?: () => void) {
      const params = {
        industry: data.newIndustry,
        revenuePercentage: data.revenuePercentage,
        company: '/api/companies/' + props.idCompany,
        callbackSuccess: (callbackSuccessData: any) => {
          // Update original data to reflect new baseline
          updateOriginalCompanyData()
          if (onComplete) {
            onComplete()
          }
        },
        callbackError: () => {
          data.spinnerValidation = false
          toast.error(translate.t('error.server500'))
        }
      }
      welcomeStore.postCompanyIndustryRelation(params)
    }

    function apiUpdateIndustry(onComplete?: () => void) {
      const params = {
        id: data.industryRelation,
        revenuePercentage: data.revenuePercentage,
        callbackSuccess: (callbackSuccessData: any) => {
          // Update original data to reflect new baseline
          updateOriginalCompanyData()
          if (onComplete) {
            onComplete()
          }
        },
        callbackError: () => {
          data.spinnerValidation = false
          toast.error(translate.t('error.server500'))
        }
      }
      welcomeStore.patchCompanyIndustryRelation(params)
    }

    function validateform() {
      data.spinnerValidation = true
      data.messageError = ''
      if (!Validator.isValidString(data.companyName)) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.companyFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidString(data.companyAddress)) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.addressFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidString(data.companyCountry)) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.country') + "<br />"
      }

      if (!Validator.isValidString(data.companyCity)) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.cityFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidString(data.companyZipCode)) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.zipCodeFieldIsRequired') + "<br />"
      }

      // if (!Validator.isValidString(data.companyIdentificationType)) {
      //   data.messageError += "* "+translate.t('welcomeCompanyInfo.form.identificationTypeFieldIsRequired')+"<br />"
      // }

      // if (!Validator.isValidString(data.companyIdentificationValue)) {
      //   data.messageError += "* "+translate.t('welcomeCompanyInfo.form.identificationValueFieldIsRequired')+"<br />"
      // }

      if (!Validator.isValidString(data.companyDomain)) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.companyDomainFieldIsRequired') + "<br />"
      }

      if (isNaN(data.wacc) || data.wacc === 0 || data.wacc === null) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.wacc') + "<br />"
      }

      if (isNaN(data.taxRate) || data.taxRate === 0 || data.taxRate === null) {
        data.messageError += "* " + translate.t('welcomeCompanyInfo.form.taxRate') + "<br />"
      }


      if (StringUtils.isNullUndefinedOrEmpty(data.newIndustry)) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.industryFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidString(data.currency)) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.currencyFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidNumberGreaterThanZero(data.annualSalesRevenueMillions)) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.annualSalesRevenueFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidNumberGreaterThanZero(data.annualSpendMillions)) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.annualSpendMillionsFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidNumberGreaterThanZero(data.accountsReceivablesMillions)) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.accountsReceivablesMillionsFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidNumberGreaterThanZero(parseInt(data.averagePaymentTermsWithSuppliersDays, 10))) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.averagePaymentTermsWithSuppliersFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidNumberGreaterThanZero(parseInt(data.averagePaymentTermsWithCustomersDays, 10))) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.averagePaymentTermsWithCustomersFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidNumberGreaterEqualThanZero(parseInt(data.averageTimeApproveInvoicesReceivedFromSuppliersDays, 10))) {
        data.messageError += "* " + translate.t('welcomeCompanyProfile.form.averageTimeToApproveYourInvoicesReceivedFromSuppliersFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidString(data.currency)) {
        data.messageError += "* " + translate.t('adminBackend.createCompanyAdmin.form.currencyFieldIsRequired') + "<br />"
      }

      if (!Validator.isValidNumberLessThanSpecificMaxNumber(data.limitUser, data.maxUsersAllowed)) {
        data.messageError += "* " + translate.t('adminBackend.createCompanyAdmin.form.limitUserFieldIsGreaterThanMaxUsersAllowed') + "<br />"
      }

      if (data.inactivityDays !== null) {
        if (isNaN(data.inactivityDays) || data.inactivityDays < 15 || data.inactivityDays > 180) {
          data.messageError += "* " + translate.t('adminBackend.createCompanyAdmin.form.limitActivityTime') + "<br />"
        }
      }

      const checkdomain = checkDomains()
      if (checkdomain) {
        data.messageError += "* " + translate.t('adminBackend.createCompanyAdmin.form.allowedDomainsDescription') + "<br />"
      }

      if (data.messageError.length > 0) {
        data.spinnerValidation = false
        const el = document.getElementById('errors')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        // Check for changes before submitting
        const hasDataChanged = hasCompanyDataChanged()
        const hasIndustryChangedValue = hasIndustryChanged()
        const hasLogoChanged = file.value !== null

        // If nothing changed, show message and return
        if (!hasDataChanged && !hasIndustryChangedValue && !hasLogoChanged) {
          data.spinnerValidation = false
          toast.info(translate.t('global.noChangesToSave'))
          return
        }

        // Case 1: Only logo changed
        if (!hasDataChanged && !hasIndustryChangedValue && hasLogoChanged) {
          uploadCompanyLogo('/api/companies/' + props.idCompany)
          return
        }

        // Case 2: Company data or industry changed (with or without logo)
        patchCompany(hasIndustryChangedValue, hasLogoChanged)
      }
    }


    function checkDomains() {

      if ((data.allowedDomains === null || StringUtils.isNullUndefinedOrEmpty(data.allowedDomains))) {
        return false
      } else {
        const domainsList = StringUtils.getDomains(data.allowedDomains);
        return domainsList.some((domain: any) => !Validator.isValidDomain(domain));
      }
    }


    function checkinactivityDays() {

      data.errorAapplyPasswordPolicy = false

      if (StringUtils.isNullUndefinedOrEmpty(data.inactivityDays?.toString())) {
        data.inactivityDays = null
      }

      if (data.inactivityDays === null) {
        data.errorAapplyPasswordPolicy = false
        data.inactivityDays = null

      } else if (isNaN(data.inactivityDays) || data.inactivityDays < 15 || data.inactivityDays > 180) {
        data.errorAapplyPasswordPolicy = true

      }
    }

    function validateTaxrate(taxrate: number) {
      if (isNaN(taxrate) || taxrate === null || taxrate < 0 || taxrate > 100) {
        toast.error(translate.t('welcomeCompanyInfo.form.taxRatewrong'));
        data.taxRate = 35
        return false
      }
    }

    return {
      ...toRefs(data),
      dataCountries, // Use computed property for countries
      currencies, // Use computed property for currencies
      images,
      showLogo,
      checkInputError,
      clearErrors,
      onChangeCountry,
      onChangeLogo,
      onClickModifyLogo,
      validateform,
      validateWacc,
      setIndustry,
      apiUpdateIndustry,
      apiRemoveIndustry,
      fontIcons,
      Routing,
      checkinactivityDays,
      validateTaxrate,
      maxImageMb: MAX_IMAGE_MB
    }
  }
})
</script>

<style lang='scss' scoped>
@import "src/resources/assets/styles/variables/colors";

.alert-error {
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  line-height: 2;
  margin: 1rem 0px;
  background-color: #FEF3F2;
  color: #D92D20;
  border: 1px solid #FFA3B3;
}
</style>