<template>
<section class="page-content-top">
  <h1 id="errors">Create company</h1>
</section>
<section class="page-content">
  <div class="col-12">
    <h3>{{ $t('adminBackend.createCompanyAdmin.h1') }}</h3>
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
                <input class="form-control" id="company-id-number" v-model="companyIdentificationValue" type="text" name="company-id-number" :placeholder="$t('welcomeCompanyInfo.form.numberPlaceholder')" @input="checkInputError(companyIdentificationValue)"/><span>{{ $t('welcomeCompanyInfo.form.number') }}                    </span>
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
                <input class="form-control required" id="wacc" type="number" v-model="wacc" min="0" max="100" pattern="^d*(.d{0,2})?$" :placeholder="$t('home.homeFinancialData.waccPlaceholder')" @keyup="validateWacc(wacc)"/><span>{{ $t('home.homeFinancialData.wacc') }}                    <sup>*                </sup></span>
              </label>
            </div>
          </div>
          <div class="col-2">
            <div class="form-group">
              <label for="taxRate">
                <input class="form-control required" id="taxRate" type="number" v-model="taxRate" min="0" max="100" pattern="^d*(.d{0,2})?$" :placeholder="$t('home.homeFinancialData.taxRatePlaceholder')" @keyup="validateTaxrate(taxRate)"/><span>{{ $t('home.homeFinancialData.taxRate') }}                    <sup>*                                    </sup></span>
              </label>
            </div>
          </div>
        </div>
        <div class="row w-100">
          <div class="col-4">
            <div class="d-flex flex-column"><span class="text-gray-600 text-3xl font-semibold">{{ $t('adminBackend.createCompanyAdmin.form.userLimit') }}</span><span class="text-gray-600">{{ $t('adminBackend.createCompanyAdmin.form.userLimitDescription') }}</span>
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
                      <input class="form-control required" id="limit-inactivity" v-model="inactivityDays" type="number" name="limit-inactivity" :min="minActivityLimit" :max="maxActivityLimit" :placeholder="$t('global.inactivityPlaceholder')" @change=" checkinactivityDays()"/><span>{{ $t('global.inactivity') }}</span>
                    </label><span class="error text-left errors-days" v-if="errorAapplyPasswordPolicy">{{ $t('adminBackend.createCompanyAdmin.form.limitActivityTime') }}</span>
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
                      <input class="form-control required" id="allowedDomains" v-model="allowedDomains" type="text" name="'allowedDomains'" :placeholder="$t('adminBackend.createCompanyAdmin.form.allowedDomainsDescription')"/><span>{{ $t('adminBackend.createCompanyAdmin.form.allowedDomains') }}                 </span>
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
          <div class="col-8">
            <CompanyIndustrySelector class="mb-4" @addIndustry="setIndustry"></CompanyIndustrySelector>
          </div>
          <div class="col-4 mt-2">
            <div class="form-group mt-8">
              <label>
                <select class="form-control required" v-model="revenuePercentage">
                  <option v-for="index in 100" :value="index">{{ index }}</option>
                </select><span>{{ $t('welcomeCompanyProfile.form.percentage') }}<sup>*</sup></span>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12"><span class="text-gray-600 text-base font-semibold">{{ $t('home.entityCard.rating.financialMetrics') }}</span></div>
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
          <div class="col-6">
            <div class="form-range">
              <label for="company-payment-terms-suppliers">{{ $t('welcomeCompanyProfile.paymentTerms.suppliers') }}<sup>*</sup>
                <div class="form-range-group justify-content-between">
                  <input class="slider mr-5" id="company-payment-terms-suppliers" v-model="averagePaymentTermsWithSuppliersDays" name="company-payment-terms-suppliers" type="range" min="0" max="400" oninput="this.nextElementSibling.value = this.value" @input="checkInputError(averagePaymentTermsWithSuppliersDays)"/>
                  <div class="w100 d-flex justify-content-end align-items-center">
                    <input class="form-control" id="company-payment-terms-suppliers-input" style="width: 100px;" v-model="averagePaymentTermsWithSuppliersDays" type="number" min="0" @input="checkInputError(averagePaymentTermsWithSuppliersDays)"/><span class="ml-4">{{ $t('welcomeCompanyProfile.days') }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <div class="form-range">
              <label for="company-payment-terms-customers">{{ $t('welcomeCompanyProfile.paymentTerms.customers') }}<sup>*</sup>
                <div class="form-range-group justify-content-between">
                  <input class="slider mr-5" id="company-payment-terms-customers" v-model="averagePaymentTermsWithCustomersDays" name="company-payment-terms-customers" type="range" min="0" max="400" oninput="this.nextElementSibling.value = this.value" @input="checkInputError(averagePaymentTermsWithCustomersDays)"/>
                  <div class="w100 d-flex justify-content-end align-items-center">
                    <input class="form-control" id="company-payment-terms-customers-input" style="width: 100px;" v-model="averagePaymentTermsWithCustomersDays" type="number" min="0" @input="checkInputError(averagePaymentTermsWithCustomersDays)"/><span class="ml-4">{{ $t('welcomeCompanyProfile.days') }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <div class="form-range">
              <label for="company-invoices-approve-supplier">{{ $t('welcomeCompanyProfile.paymentTerms.suppliersTime') }}<sup>*</sup>
                <div class="form-range-group justify-content-between">
                  <input class="slider mr-5" id="company-invoices-approve-supplier" v-model="averageTimeApproveInvoicesReceivedFromSuppliersDays" name="company-invoices-approve-supplier" type="range" min="0" max="400" oninput="this.nextElementSibling.value = this.value" @input="checkInputError(averageTimeApproveInvoicesReceivedFromSuppliersDays)"/>
                  <div class="w100 d-flex justify-content-end align-items-center">
                    <input class="form-control" id="company-invoices-approve-supplier-input" style="width: 100px;" v-model="averageTimeApproveInvoicesReceivedFromSuppliersDays" type="number" min="0" @input="checkInputError(averageTimeApproveInvoicesReceivedFromSuppliersDays)"/><span class="ml-4">{{ $t('welcomeCompanyProfile.days') }}</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="row justify-content-between">
          <div class="col-12 d-flex justify-content-end">
            <div class="form-button d-flex gap-2 mt-5"><a class="btn outline-secondary-btn font-md" @click="Routing.admin.openCompaniesAdmin()"><span>{{ $t('button.cancel') }}</span></a><a class="btn btn-primary" @click="validateform"><span class="spinner-border spinner-border-sm" v-if="spinnerValidation" role="status" aria-hidden="true"></span><span id="create-company-save-changes" v-else>{{ $t('global.save') }}</span></a></div>
          </div>
        </div>
      </form>
    </div>
  </div>
</section>
</template>

<script lang='ts'>
import { computed, reactive, ref, toRefs, defineComponent, onMounted, watch } from 'vue'
import { images } from '@/resources/assets/assets'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useWelcomeStore } from '@/stores/welcome'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { CreateCompanyAdmin } from '@/modules/adminBackend/types'
import * as Routing from '@/services/router/Routing'
import * as Validator from '@/utils/validators'
import { CalculumLoading } from '@ada/design-system'
import { useToast } from "vue-toastification";
import CompanyIndustrySelector from '@/modules/adminBackend/components/CompanyIndustrySelector.vue'
import { StringUtils, ObjectUtils } from "@/utils";
import { MAX_IMAGE_MB } from '@/utils/uploadLimits'


export default defineComponent({
  name: 'CreateCompanyAdminNewFlow',
  components: {
    CalculumLoading,
    CompanyIndustrySelector
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    document.title = translate.t('adminBackend.createCompanyAdmin.h1')
    const appStore = useAppStore()
    const adminBackendStore = useAdminBackendStore()
    const welcomeStore = useWelcomeStore()
    const toast = useToast()
    const file = ref(null)

    // Create computed properties for reactive data from Pinia store
    const dataCountries = computed(() => appStore.getCountries)
    const currencies = computed(() => appStore.getCurrencieswithId)
    const data = reactive<CreateCompanyAdmin>({
      accountsReceivablesMillions: 0,
      accountType: '',
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
      allowedDomains: '',
      excludeForSupplierStandardClustering: false,
      formErrorMessage: '',
      formHasError: false,
      language: 'en',
      limitUser: 0,
      loadingDataCountries: true,
      maxUsersAllowed: 1000,
      messageError: '',
      minUsersAllowed: 1,
      newIndustry: '',
      newTeam: '',
      paymentTermDays: 0,
      revenuePercentage: 1,
      showCreateTeamDialog: false,
      spinnerValidation: false,
      teams: [],
      wacc: 9,
      taxRate: 35,
      minActivityLimit: 30,
      maxActivityLimit: 180,
      inactivityDays: null,
      errorAapplyPasswordPolicy: false,
      allowedMimeTypes: [
        'image/png',
        'image/jpeg'
      ]
    })

    function getCountries() {
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          // Countries are now handled by the Pinia store
        },
        callbackError: () => {
          
        }
      }
      appStore.fetchCountries(params.callbackSuccess, params.callbackError)
    }

    getCountries()

    function validateform(){
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

      if (!Validator.isValidNumberGreaterThanZero(data.limitUser)) {
        data.messageError += "* " + translate.t('adminBackend.createCompanyAdmin.form.limitUserFieldIsRequired') + "<br />"
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
        createCompany()
      }
    }

    function createCompany() {
      const params = {
        name: data.companyName,
        address: data.companyAddress,
        country: data.companyCountry,
        city: data.companyCity,
        zipCode: data.companyZipCode,
        userLanguage: data.language,
        identificationType: data.companyIdentificationType === '' ? null : data.companyIdentificationType,
        identificationValue: data.companyIdentificationValue === '' ? null : data.companyIdentificationValue,
        domain: data.companyDomain,
        wacc: (data.wacc / 100),
        taxRate: (data.taxRate / 100),
        paymentTermDays: data.paymentTermDays,
        currency: data.currency,
        industry: data.newIndustry,
        revenuePercentage: data.revenuePercentage,
        annualSalesRevenueMillions: data.annualSalesRevenueMillions,
        annualSpendMillions: data.annualSpendMillions,
        accountsReceivablesMillions: data.accountsReceivablesMillions,
        averagePaymentTerms: data.averagePaymentTermsWithSuppliersDays,
        averagePaymentTermsWithCustomersDays: data.averagePaymentTermsWithCustomersDays,
        averageTimeApproveInvoicesReceivedFromSuppliersDays: data.averageTimeApproveInvoicesReceivedFromSuppliersDays,
        limitUsers: data.limitUser,
        excludeForPeerGroupClustering: data.excludeForPeerGroupClustering ?? false,
        excludeForStandardGroupClustering: data.excludeForSupplierStandardClustering ?? false,
        inactivityDays: data.inactivityDays,
        allowedDomains: data.allowedDomains,
        callbackSuccess: (data: any) => {
          apiAddIndustry(data.data['@id'])
        },
        callbackError: (callbackErrorData: any) => {
          toast.error(translate.t('welcomeCompanyInfo.form.nametakencompany'));
          data.spinnerValidation = false

        }
      }
      adminBackendStore.createCompany(params)
    }

    function apiAddIndustry(idCompany: any) {
      const params = {
        industry: data.newIndustry,
        revenuePercentage: data.revenuePercentage,
        company: idCompany,
        callbackSuccess: (callbackSuccessData: any) => {
          if (file.value) {
            uploadCompanyLogo(idCompany)
          } else {
            Routing.admin.openCompaniesAdmin()
          }
        },
        callbackError: () => {

        }
      }
      welcomeStore.postCompanyIndustryRelation(params)
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
          Routing.admin.openCompaniesAdmin()
        },
        callbackError: () => { data.formHasError = true }
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

    function validateTaxrate(taxrate: number) {
      if (isNaN(taxrate) || taxrate === null || taxrate < 0 || taxrate > 100) {
        toast.error(translate.t('welcomeCompanyInfo.form.taxRatewrong'));
        data.taxRate = 35
        return false
      }
    }

    function setIndustry(newIndustry: any) {
      data.newIndustry = newIndustry
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


    function checkDomains() {

      if ((data.allowedDomains === null || StringUtils.isNullUndefinedOrEmpty(data.allowedDomains))) {
        return false
      } else {
        const domainsList = StringUtils.getDomains(data.allowedDomains);
        return domainsList.some((domain: any) => !Validator.isValidDomain(domain));
      }
    }



    /**
     * watches for the change for account type
     */
    watch(() => data.accountType, () => {
      adminBackendStore.setAccountType(data.accountType)
    })

    return {
      ...toRefs(data),
      dataCountries, // Use computed property for countries
      currencies, // Use computed property for currencies
      checkInputError,
      clearErrors,
      images,
      onChangeCountry,
      onChangeLogo,
      onClickModifyLogo,
      setIndustry,
      showLogo,
      validateform,
      validateWacc,
      Routing,
      checkinactivityDays,
      validateTaxrate,
      checkDomains,
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
