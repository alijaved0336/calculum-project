<template>
<div style="margin-top: 60px;" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyInfo"></div>
<CalculumLoading v-if="loadingDataCountries" :modal="true"></CalculumLoading>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col-lg-3 col-xl-2 border-right">
                  <AdminMenuCompany :currentPage="'CompanyInfo'" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyInfo"></AdminMenuCompany>
                  <HomeMenuAccount :currentPage="'CompanyInfo'" v-else>                 </HomeMenuAccount>
                </div>
                <div class="col-lg-9 col-xl-10 p-5">
                  <div class="h6 font-weight-bold">{{ $t('home.homeCompanyInfo.title') }}
                    <CalculumTooltipIcon :infoText="$t('home.homeCompanyInfo.titleTooltipDefault')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-preferences-manageteam'" :keyPopOver="'preferencesCompanyInfo'"></CalculumTooltipIcon>
                  </div>
                  <div class="alert alert-danger" v-if="formHasError" @click="clearErrors" role="alert" style="cursor: pointer"><span v-if="formErrorMessage.length > 0">{{ formErrorMessage }}</span><span v-else>{{ $t('welcome.form.messageError') }}</span></div>
                  <div class="row w-100 mt-4">
                    <div class="col-lg-5 col-xl-5">
                      <div class="form-group">
                        <label for="tenant-id">
                          <input class="form-control" id="tenant-id" v-model="tenantId" type="text" name="tenant-id" disabled="disabled" readonly="readonly"/><span class="d-flex align-items-center">{{ $t('home.homeCompanyInfo.tenantId') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.tenantIdTooltip')" :size="15"></CalculumInfoButton><i class="fa-regular fa-copy ml-2" @click="copyTenantIdToClipboard" data-toggle="tooltip" data-placement="top" :title="$t('global.copy')" style="cursor: pointer; font-size: 16px;"></i></span>
                        </label>
                      </div>
                      <div class="form-group">
                        <label for="company-name">
                          <input class="form-control required" id="company-name" v-model="companyName" type="text" name="company-name" :placeholder="$t('home.homeCompanyInfo.companyNamePlaceholder')" @input="checkInputError(companyName)"/><span class="d-flex align-items-center">  {{ $t('home.homeCompanyInfo.companyName') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.companyNameTooltip')" :size="15"></CalculumInfoButton><sup>*</sup></span>
                        </label>
                      </div>
                      <div class="form-group">
                        <label for="company-address">
                          <input class="form-control" id="company-address" v-model="companyAddress" type="text" name="company-address" :placeholder="$t('home.homeCompanyInfo.companyAddressPlaceholder')" @input="checkInputError(companyAddress)"/><span class="d-flex align-items-center">{{ $t('home.homeCompanyInfo.companyAddress') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.companyAddressTooltip')" :size="15"></CalculumInfoButton><sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-5 col-xl-5">
                      <div class="logo-container-div">
                        <div class="label font-md">{{ $t('home.homeCompanyInfo.logoSize', { size: maxImageMb }) }}</div>
                        <div class="logo-container"><img class="img image-style" v-if="showLogo !== null" :src="showLogo" alt="Logo" style="width:125px; height: auto;"/><img class="img-fluid image-style" v-else :src="images.emptyCompanyLogo" alt="Logo" style="width:125px; height: auto;"/>
                          <input class="form-control required" id="company-clearbit" type="file" accept=".jpg,.png,.jpeg" style="display: none" name="company-clearbit" @change="onChangeLogo"/>
                        </div>
                      </div>
                    </div>
                    <div class="col-lg-2 col-xl-2 logo-container-button">
                      <button class="btn btn-file-actions font-md ml-4" @click="onClickModifyLogo">                       <span>{{ $t('home.homeCompanyInfo.logoUpdate') }}</span></button>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-lg-5 col-xl-5">
                      <div class="form-group">
                        <label for="company-country">
                          <select class="form-control required" id="company-country" name="company-country" v-model="companyCountry" @change="onChangeCountry(companyCountry)" :disabled="dataCountries.length === 0">
                            <option hidden="hidden" selected="selected">{{ $t('global.countrySelect') }}</option>
                            <option v-for="country in dataCountries" :value="country && country['@id'] ? country['@id'] : ''">{{ country.localizedName }}</option>
                          </select><span class="d-flex align-items-center">{{ $t('global.country') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('global.countryTooltip')" :size="15"></CalculumInfoButton><sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-5 col-xl-5">
                      <div class="form-group">
                        <label for="company-city">
                          <input class="form-control required" id="company-city" v-model="companyCity" type="text" name="company-city" :placeholder="$t('home.homeCompanyInfo.companyCityPlaceholder')" @input="checkInputError(companyCity)"/><span class="d-flex align-items-center">{{ $t('home.homeCompanyInfo.companyCity') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.companyCityTooltip')" :size="15"></CalculumInfoButton><sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-2 col-xl-2">
                      <div class="form-group">
                        <label for="company-zip">
                          <input class="form-control required" id="company-zip" v-model="companyZipCode" type="text" name="company-zip" :placeholder="$t('home.homeCompanyInfo.companyZipCodePlaceholder')" @input="checkInputError(companyZipCode)"/><span class="d-flex align-items-center">{{ $t('home.homeCompanyInfo.companyZipCode') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.companyZipCodeTooltip')" :size="15"></CalculumInfoButton><sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-lg-5 col-xl-5">
                      <div class="form-group">
                        <label for="company-id">
                          <select class="form-control" id="company-id" v-model="companyIdentificationType" name="company-id" :disabled="dataCountriesTypeById.length === 0">
                            <option hidden="hidden" selected="selected" disabled="disabled" :value="null">{{ $t('home.homeCompanyInfo.companyIdentificationTypeSelect') }}</option>
                            <option v-for="countryType in dataCountriesTypeById" :value="countryType['@id']">{{ countryType.value }}</option>
                          </select><span class="d-flex align-items-center">{{ $t('home.homeCompanyInfo.companyIdentificationType') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.companyIdentificationTypeTooltip')" :size="15"></CalculumInfoButton></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-5 col-xl-5">
                      <div class="form-group">
                        <label for="company-id-number">
                          <input class="form-control" id="company-id-number" v-model="companyIdentificationValue" type="text" name="company-id-number" :placeholder="$t('home.homeCompanyInfo.companyIdentificationValuePlaceholder')"/><span class="d-flex align-items-center">{{ $t('home.homeCompanyInfo.companyIdentificationValue') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.companyIdentificationValueTooltip')" :size="15"></CalculumInfoButton></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-2 col-xl-2">
                      <div class="form-group">
                        <label for="company-website">
                          <input class="form-control required" id="company-website" v-model="companyDomain" type="text" name="company-website" :placeholder="$t('home.homeCompanyInfo.companyDomainPlaceholder')" @input="checkInputError(companyDomain)"/><span class="d-flex align-items-center">{{ $t('home.homeCompanyInfo.companyDomain') }}
                            <CalculumInfoButton class="ml-2" :infoText="$t('home.homeCompanyInfo.companyDomainTooltip')" :size="15"></CalculumInfoButton><sup>*                </sup></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-5 end-justify-content">
                    <button class="btn btn-primary font-md mr-2" @click="formValidator" :disabled="!hasChanges"><span class="spinner-border spinner-border-sm" v-if="loadingCompanyInfo" role="status" aria-hidden="true"></span><span v-else>{{ $t('global.save') }}</span></button>
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
import HomeMenuAccount from '../components/HomeMenuAccount.vue'
import AdminMenuCompany from '@/modules/adminBackend/components/AdminMenuCompany.vue'
import { reactive, toRefs, ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useWelcomeStore } from '@/stores/welcome'
import * as Validator from '@/utils/validators'
import { fontIcons, images } from '@/resources/assets/assets'
import { useI18n } from 'vue-i18n'
import { getMediaUrl } from '@/services/media/mediaActions'
import CalculumInfoButton from '@/modules/components/CalculumInfoButton.vue'
import { CalculumLoading, CalculumLayout } from '@ada/design-system'
import router from '@/services/router/index'
import * as Routing from '@/services/router/Routing'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { useCompany } from '@/composables'
import { UserSession } from '@/types'
import { ObjectUtils, stringEmptyNullOrUndefinedtoNull } from "@/utils";
import { useToast } from "vue-toastification";
import { useUserStore } from '@/stores/user'
import { MAX_IMAGE_MB } from '@/utils/uploadLimits'

export default {
  name: 'HomeCompanyInfo',
  components: {
    HomeMenuAccount,
    AdminMenuCompany,
    CalculumInfoButton,
    CalculumLoading,
    CalculumLayout,
    CalculumTooltipIcon
  },
  setup() {
    const appStore = useAppStore()
    const toast = useToast()
    const welcomeStore = useWelcomeStore()
    const { companyActive, companyActiveName } = useCompany();

    const file = ref(null)

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    document.title = translate.t('home.homeCompanyInfo.title')

    interface HomeCompanyInfo {
      loadingDataCountries: boolean,
      dataCountriesTypeById: Array<any>, // Dynamic value when change country
      companyAddress: string,
      companyCity: string,
      companyIdentificationType: string | null,
      companyLogoUrl: any,
      companyName: string,
      companyCountry: string,
      companyDomain: string,
      companyIdentificationValue: string | null, // Identification number
      companyZipCode: string,
      formHasError: boolean,
      formErrorMessage: string,
      loadingCompanyInfo: boolean,
      selectedCurrency: string,
      allowedMimeTypes: Array<any>,
      tenantId: string | null,
    }

    interface OriginalCompanyData {
      companyName: string,
      companyAddress: string,
      companyCity: string,
      companyCountry: string,
      companyZipCode: string,
      companyDomain: string,
      selectedCurrency: string,
      companyIdentificationType: string | null,
      companyIdentificationValue: string | null,
    }

    const userStore = useUserStore()
    const data = reactive<HomeCompanyInfo>({
      loadingDataCountries: true,
      dataCountriesTypeById: [], // Dynamic value when change country
      companyAddress: companyActive.value?.address ?? '',
      companyCity: companyActive.value?.city ?? '',
      companyIdentificationType: companyActive.value?.identificationType ? companyActive.value?.identificationType['@id'] : null,
      companyLogoUrl: companyActive.value?.logo && companyActive.value?.logo.publicUrl ? getMediaUrl(companyActive.value.logo.publicUrl) : '',
      companyName: companyActiveName.value,
      companyCountry: companyActive.value?.country['@id'] ?? '',
      companyDomain: companyActive.value?.domain ?? '',
      companyIdentificationValue: companyActive.value?.identificationValue ?? null, // Identification number
      companyZipCode: companyActive.value?.zipCode ?? '',
      formHasError: false,
      formErrorMessage: '',
      loadingCompanyInfo: false,
      selectedCurrency: companyActive.value?.currency['@id'] ?? '',
      allowedMimeTypes: [
        'image/png',
        'image/jpeg'
      ],
      tenantId: companyActive.value?.tenantId ?? null
    })

    // Store original company data for change detection
    const originalCompanyData = reactive<OriginalCompanyData>({
      companyName: companyActiveName.value,
      companyAddress: companyActive.value?.address ?? '',
      companyCity: companyActive.value?.city ?? '',
      companyCountry: companyActive.value?.country['@id'] ?? '',
      companyZipCode: companyActive.value?.zipCode ?? '',
      companyDomain: companyActive.value?.domain ?? '',
      selectedCurrency: companyActive.value?.currency['@id'] ?? '',
      companyIdentificationType: companyActive.value?.identificationType ? companyActive.value?.identificationType['@id'] : null,
      companyIdentificationValue: companyActive.value?.identificationValue ?? null,
    })

    // Create a computed property to reactively get countries from the store
    const dataCountries = computed(() => appStore.getCountries)

    // Create a computed property to reactively get currencies from the store
    const currencies = computed(() => appStore.currencies ?? [])

    // Computed property to detect if any field has changed
    const hasChanges = computed(() => {
      // Check if logo file has changed
      const hasLogoFile = file.value !== null && file.value !== undefined
      
      // Check if company data has changed
      const hasDataChanged = hasCompanyDataChanged()

      return hasDataChanged || hasLogoFile
    })

    const messageError = computed(() => {
      let result = ''

      if (!Validator.isValidString(data.companyName)) {
        result += translate.t('welcomeCompanyInfo.form.companyFieldIsRequired')
      }

      if (!Validator.isValidString(data.companyAddress)) {
        result += translate.t('welcomeCompanyInfo.form.addressFieldIsRequired')
      }

      if (!Validator.isValidString(data.companyCountry)) {
        result += translate.t('global.countryFieldIsRequired')
      }

      if (!Validator.isValidString(data.companyCity)) {
        result += translate.t('welcomeCompanyInfo.form.cityFieldIsRequired')
      }

      if (!Validator.isValidString(data.companyZipCode)) {
        result += translate.t('welcomeCompanyInfo.form.zipCodeFieldIsRequired')
      }

      if (!Validator.isValidString(data.companyDomain)) {
        result += translate.t('welcomeCompanyInfo.form.companyDomainFieldIsRequired')
      }

      return result
    })

    apiGetCountries()
    apiGetCurrencies()

    function apiGetCountries() {
      const params = {
        callbackSuccess: () => {
          data.loadingDataCountries = false
          if (companyActive.value?.country !== undefined) {
            onChangeCountry(companyActive.value.country['@id'])
          }
        },
        callbackError: () => {
          data.loadingDataCountries = false
          toast.error(translate.t('error.server500'));
        }
      }
      appStore.fetchCountries(params.callbackSuccess, params.callbackError)
    }

    function apiGetCurrencies() {
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          // Currencies are now handled by the Pinia store
          // No need to set loadingDataCountries = false here since it's handled by countries fetch
        },
        callbackError: () => {
          toast.error(translate.t('error.server500'));
        }
      }
      appStore.fetchCurrencies(params.callbackSuccess, params.callbackError)
    }

    function apiGetCountriesCompanyById(countryId: string, callbackSuccess: any) {
      const params = {
        countryId,
        callbackSuccess
      }
      appStore.fetchCountryCompanyIdTypes(countryId, callbackSuccess)
    }

    function checkInputError(modelValue: any) {
      if (((typeof modelValue === 'number' && modelValue < 0) || (typeof modelValue === 'string' && !modelValue)) ||
        data.formHasError) {
        data.formErrorMessage = messageError.value

        if (data.formErrorMessage.length === 0) {
          clearErrors()
        }
      }
    }

    function clearErrors() {
      data.formHasError = false
    }

    function formValidator() {
      if (data === null) {
        return
      }

      data.formErrorMessage = messageError.value
      if (data.formErrorMessage || data.loadingCompanyInfo) {
        data.formHasError = true
        return
      }

      onClickSubmit()
    }

    function onChangeCountry(countryId: string) {
      if (!countryId) {
        data.dataCountriesTypeById = []
        data.companyIdentificationType = ''
        return
      }

      apiGetCountriesCompanyById(
        countryId,
        (response: any) => {
          data.dataCountriesTypeById = response
          checkInputError(data.dataCountriesTypeById)
        }
      )
    }

    async function onChangeLogo(event: any) {
      file.value = event.target.files[0]

      if (file.value) {
        const isValid = await ObjectUtils.validateFileType(file.value, data.allowedMimeTypes);
        if (!isValid) {
          toast.error(translate.t('global.invalidFileType'));
          file.value = null
          return
        }
      }
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

    function onClickModifyLogo() {
      const fileDOM: any | null = document.getElementById('company-clearbit')
      if (fileDOM !== null) {
        fileDOM.click()
      }
    }

    function hasCompanyDataChanged(): boolean {
      // Normalize values for comparison (handle null, undefined, empty string)
      const normalizeValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return ''
        return String(value).trim()
      }

      return (
        normalizeValue(data.companyName) !== normalizeValue(originalCompanyData.companyName) ||
        normalizeValue(data.companyAddress) !== normalizeValue(originalCompanyData.companyAddress) ||
        normalizeValue(data.companyCity) !== normalizeValue(originalCompanyData.companyCity) ||
        normalizeValue(data.companyCountry) !== normalizeValue(originalCompanyData.companyCountry) ||
        normalizeValue(data.companyZipCode) !== normalizeValue(originalCompanyData.companyZipCode) ||
        normalizeValue(data.companyDomain) !== normalizeValue(originalCompanyData.companyDomain) ||
        normalizeValue(data.selectedCurrency) !== normalizeValue(originalCompanyData.selectedCurrency) ||
        normalizeValue(data.companyIdentificationType) !== normalizeValue(originalCompanyData.companyIdentificationType) ||
        normalizeValue(data.companyIdentificationValue) !== normalizeValue(originalCompanyData.companyIdentificationValue)
      )
    }

    function getChangedFields(): Partial<any> {
      const normalizeValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return ''
        return String(value).trim()
      }

      const changedFields: any = {}

      // Only include fields that actually changed
      if (normalizeValue(data.companyName) !== normalizeValue(originalCompanyData.companyName)) {
        changedFields.name = data.companyName
      }
      if (normalizeValue(data.companyAddress) !== normalizeValue(originalCompanyData.companyAddress)) {
        changedFields.address = data.companyAddress
      }
      if (normalizeValue(data.companyCity) !== normalizeValue(originalCompanyData.companyCity)) {
        changedFields.city = data.companyCity
      }
      if (normalizeValue(data.companyCountry) !== normalizeValue(originalCompanyData.companyCountry)) {
        changedFields.country = data.companyCountry
      }
      if (normalizeValue(data.companyZipCode) !== normalizeValue(originalCompanyData.companyZipCode)) {
        changedFields.zipCode = data.companyZipCode
      }
      if (normalizeValue(data.companyDomain) !== normalizeValue(originalCompanyData.companyDomain)) {
        changedFields.domain = data.companyDomain
      }
      if (normalizeValue(data.selectedCurrency) !== normalizeValue(originalCompanyData.selectedCurrency)) {
        changedFields.currency = data.selectedCurrency
      }
      if (normalizeValue(data.companyIdentificationType) !== normalizeValue(originalCompanyData.companyIdentificationType)) {
        changedFields.identificationType = data.companyIdentificationType
      }
      if (normalizeValue(data.companyIdentificationValue) !== normalizeValue(originalCompanyData.companyIdentificationValue)) {
        changedFields.identificationValue = stringEmptyNullOrUndefinedtoNull(data.companyIdentificationValue)
      }

      return changedFields
    }

    function updateOriginalCompanyData() {
      originalCompanyData.companyName = data.companyName
      originalCompanyData.companyAddress = data.companyAddress
      originalCompanyData.companyCity = data.companyCity
      originalCompanyData.companyCountry = data.companyCountry
      originalCompanyData.companyZipCode = data.companyZipCode
      originalCompanyData.companyDomain = data.companyDomain
      originalCompanyData.selectedCurrency = data.selectedCurrency
      originalCompanyData.companyIdentificationType = data.companyIdentificationType
      originalCompanyData.companyIdentificationValue = data.companyIdentificationValue
    }

    function onClickSubmit() {
      const hasDataChanged = hasCompanyDataChanged()
      const hasLogoChanged = file.value !== null

      // If nothing changed, show message and return
      if (!hasDataChanged && !hasLogoChanged) {
        toast.info(translate.t('global.noChangesToSave'))
        return
      }

      data.loadingCompanyInfo = true

      // Case 1: Only logo changed
      if (!hasDataChanged && hasLogoChanged) {
        uploadCompanyLogo()
        return
      }

      // Case 2: Company data changed (with or without logo)
      // Get only the fields that actually changed
      const changedFields = getChangedFields()
      
      const params = {
        id: userStore.getUserCompanyId,
        ...changedFields,
        callbackSuccess: (callbackSuccessData: UserSession["activeCompany"]) => {
          // Update active company
          companyActive.value = callbackSuccessData
          
          // Update original data to reflect new baseline
          updateOriginalCompanyData()

          // If logo also changed, upload it
          if (hasLogoChanged) {
            uploadCompanyLogo()
          } else {
            data.loadingCompanyInfo = false
            toast.success(translate.t('global.successfullySaved'))
          }
        },
        callbackError: () => {
          data.loadingCompanyInfo = false
          data.formHasError = true
          toast.error(translate.t('error.server500'))
        }
      }
      welcomeStore.companyInfo(params)
    }

    function uploadCompanyLogo() {
      const params = {
        companyId: userStore.getUserCompanyId,
        file: file.value,
        callbackSuccess: (callbackSuccessData: any) => {
          userStore.setCompanyLogo(callbackSuccessData)
          // Clear file value after successful upload to prevent re-uploading on next save
          file.value = null
          data.loadingCompanyInfo = false
          toast.success(translate.t('global.successfullySaved'))
        },
        callbackError: () => { 
          data.formHasError = true
          data.loadingCompanyInfo = false
          toast.error(translate.t('error.server500'))
        }
      }
      welcomeStore.postUploadCompanyLogo(params)
    }

    async function copyTenantIdToClipboard() {
      if (!data.tenantId) {
        return
      }

      try {
        await navigator.clipboard.writeText(data.tenantId)
        toast.success(translate.t('global.copiedToClipboard'))
      } catch (error) {
        toast.error(translate.t('error.copyToClipboard'))
      }
    }

    return {
      ...toRefs(data),
      dataCountries, // Use the computed property instead of the reactive data property
      currencies, // Use the computed property for currencies
      file,
      fontIcons,
      images,
      showLogo,
      hasChanges,
      checkInputError,
      clearErrors,
      formValidator,
      onChangeCountry,
      onChangeLogo,
      onClickModifyLogo,
      onClickSubmit,
      copyTenantIdToClipboard,
      router,
      Routing,
      maxImageMb: MAX_IMAGE_MB
    }
  }
}
</script>

<style lang="scss" scoped>
.card--full .card__body {
  margin-bottom: 0 !important;
}

.company-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

// Consistent spacing for all rows

.grid-item.tenant-id {
  grid-column: 1;
  grid-row: 1;
}

.grid-item.company-name {
  grid-column: 2;
  grid-row: 1;
}

.grid-item.address {
  grid-column: 1 / 3;
  grid-row: 2;
}

.grid-item.logo {
  grid-column: 3;
  grid-row: 1 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%; 
}


.logo-container-div {  
  border: 1px solid #eaecf0; 
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 1rem;    
  box-shadow: 0 1px 5px rgba(0, 0, 0, .1);
  margin-left: 0.5rem;
  height: 90%;
}

// Responsive behavior
@media (max-width: 576px) {
  .company-info-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
  }
  
  .grid-item.tenant-id {
    grid-column: 1;
    grid-row: 1;
  }
  
  .grid-item.company-name {
    grid-column: 1;
    grid-row: 2;
  }
  
  .grid-item.address {
    grid-column: 1;
    grid-row: 3;
  }
  
  .grid-item.logo {
    grid-column: 1;
    grid-row: 4;
  }
}

// Tablet behavior - maintain horizontal layout (including iPad Pro)
@media (min-width: 577px) and (max-width: 1024px) {
  .company-info-grid {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 0.4rem;
  }
  
  .grid-item.tenant-id {
    grid-column: 1;
    grid-row: 1;
  }
  
  .grid-item.company-name {
    grid-column: 2;
    grid-row: 1;
  }
  
  .grid-item.address {
    grid-column: 1 / 3;
    grid-row: 2;
  }
  
  .grid-item.logo {
    grid-column: 3;
    grid-row: 1 / 3;
  }
}

// iPad Pro specific adjustments
@media (min-width: 834px) and (max-width: 1024px) {
  .company-info-grid {
    gap: 0.5rem;
  }
}

.logo-container-button {
    display: flex;
    align-content: end;
    flex-wrap: wrap;
    margin-bottom: 25px;
}



// // .custom_height{
// //   height: 40vh !important;
// // }
// @media only screen and (min-height: 1201px){
//   .card--full{
//   // height: 50vh !important;
//   height: calc(100vh - 35vh);
//   }
// }

// @media only screen and (min-height: 1000px) and (max-height: 1200px ){
//   .card--full{
//   // height: 65vh !important;
//   height: calc(100vh - 25vh);
//   }
// }

// @media only screen and (min-height:591px) and(max-height: 999px){
//   .card--full{
//   // height: 100vh !important;
//   height: calc(100vh - 5vh);
//   }
// }

// @media only screen and (max-height: 590px){
//   .card--full{
//    height: calc(100vh - 5vh);
//   }
// }
// @media only screen and (min-height: 1201px){
//   .card--full{
//   height: calc(100vh - 50vh);
//   }
// }

// @media only screen and (min-height: 1000px) and (max-height: 1200px ){
//   .card--full{
//   height: calc(100vh - 35vh);
//   }
// }

// @media only screen and (min-height: 750px ) and (max-height: 999px){
//   .card--full{
//   height: calc(100vh - calc(100% - 5vh));
//   }
// }

// @media only screen and (min-height:591px) and(max-height: 749px){
//   .card--full{
//   height: calc(100vh - 5vh);
//   }
// }

// @media only screen and (max-height: 590px){
//   .card--full{
//    height: 100vh;
//   }
// }</style>
