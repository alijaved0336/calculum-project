<template>
<div style="margin-top: 60px;" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyPreferences"></div>
<CalculumLoading v-if="loadingPreferenceInfo" :modal="true"></CalculumLoading>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homePreference.confirm')" @close="showConfirmModal = false" v-if="showConfirmModal">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChanges') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="cancelNavigation()" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm" v-if="loadingPreferenceInfo" role="status" aria-hidden="true"></span><span v-else>{{ $t('button.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" @click="discardChanges()" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm" v-if="loadingPreferenceInfo" role="status" aria-hidden="true"></span><span v-else>{{ $t('global.discard') }}</span></button>
    <button class="btn btn-primary font-md" @click="savePreference()" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm" v-if="loadingPreferenceInfo" role="status" aria-hidden="true"></span><span v-else>{{ $t('global.save') }}  </span></button>
  </template>
</CalculumModal>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col-lg-3 col-xl-2 border-right">
                  <AdminMenuCompany :currentPage="'Preferences'" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyPreferences"></AdminMenuCompany>
                  <HomeMenuAccount :currentPage="'Preferences'" v-else></HomeMenuAccount>
                </div>
                <div class="col-lg-9 col-xl-10 p-5 custom_height">
                  <div class="alert alert-danger" v-if="formHasError" @click="clearErrors" role="alert" style="cursor: pointer; background-color: white; border-color: #FF2C4F;; color: #FF2C4F"><span v-if="formErrorMessage.length > 0">{{ formErrorMessage }}</span><span v-else>{{ $t('welcome.form.messageError') }}</span></div>
                  <h3 v-if="router.currentRoute.value.name === Routing.admin.adminCompanyPreferences">{{ companyName }}</h3>
                  <div class="h6 font-weight-bold">{{ $t('home.homePreference.title') }}
                    <CalculumTooltipIcon :infoText="$t('home.homePreference.titleTooltipDefault')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-preferences-preferences'" :keyPopOver="'preferencesManagePreferences'"></CalculumTooltipIcon>
                  </div>
                  <div class="h6 mt-5" v-if="router.currentRoute.value.name !== Routing.admin.adminCompanyPreferences">{{ $t('home.homeProfile.accessInformation') }}</div>
                  <div class="row mt-4" v-if="router.currentRoute.value.name !== Routing.admin.adminCompanyPreferences">
                    <div class="col-md-4 col-lg-4">
                      <div class="form-group">
                        <label for="email">
                          <input class="form-control required" id="email" type="email" name="email" :placeholder="$t('home.homeProfile.emailPlaceholder')" v-model="emailUser" disabled="disabled"/><span>{{ $t('global.email') }}<sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-md-4 col-lg-4 col-xl-4">
                      <button class="btn outline-secondary-btn btn-h-64" v-if="showChangePassword" @click="forgotPassword()"><span class="spinner-border spinner-border-sm" v-if="loadingForgotPassword" role="status" aria-hidden="true"></span><span v-else>{{ $t('home.homeProfile.buttons.changePassword') }}</span></button>
                    </div>
                  </div>
                  <div class="h6">{{ $t('home.homePreference.title2') }}</div>
                  <div class="row mt-4">
                    <div class="col-lg-4">
                      <div class="form-group">
                        <label for="language">
                          <select class="custom-select" id="language" name="language" v-model="language" v-on:change="dirty">
                            <option value="" hidden="hidden" selected="selected">{{ $t('home.homePreference.languagePlaceholder') }}</option>
                            <option value="en">{{ $t('home.homePreference.english') }}</option>
                            <option value="es">{{ $t('home.homePreference.spanish') }}</option>
                          </select><span>{{ $t('home.homePreference.language') }}<sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-4">
                      <div class="form-group">
                        <label for="timeZones">
                          <select class="custom-select" id="timeZones" v-model="timezone" v-on:change="dirty">
                            <option value="" selected="selected">{{ $t('home.homePreference.timeZonesPlaceholder') }}</option>
                            <option v-for="zone in timeZones" :value="zone">{{ zone }}</option>
                          </select><span>{{ $t('home.homePreference.timeZones') }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-4">
                      <div class="form-group">
                        <label for="currencyFormat">
                          <select class="custom-select" id="currencyFormat" :value="decimalFormatting" @input="setDecimalFormatting(($event.target as HTMLSelectElement).value)">
                            <option v-for="country in dataCountries" :value="country.code">{{ country.localizedName }}</option>
                          </select><span>{{ $t('home.homePreference.currencyFormat') }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-lg-12 col-xl-6 mt-3">
                      <div class="d-flex align-items-center">
                        <label class="mb-0 switch">
                          <input id="automatic-logout" type="checkbox" v-model="automaticLogout" @change="inactivityBoolean(automaticLogout)"/><span class="slider round"></span>
                        </label>
                        <div class="ml-4">{{ $t('home.homePreference.enableAutomaticLogout') }}</div>
                      </div>
                    </div>
                    <div class="col-lg-12 col-xl-6" :class="[!automaticLogout ? 'marginSelect' : '']">
                      <div class="form-group">
                        <label for="inactivity">
                          <select class="custom-select" id="inactivity" v-model="time" v-if="automaticLogout" v-on:change="dirty">
                            <option value="" selected="selected">{{ $t('home.homePreference.timePlaceholder') }}</option>
                            <option value="five">{{ $t('home.homePreference.timeFive') }}</option>
                            <option value="ten">{{ $t('home.homePreference.timeTen') }}</option>
                            <option value="fifteen">{{ $t('home.homePreference.timeFifteen') }}</option>
                          </select><span v-if="automaticLogout">{{ $t('home.homePreference.time') }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="h5 mt-3">{{ $t('home.homePreference.currency') }}</div>
                  <div class="row">
                    <div class="col-lg-3">
                      <div class="form-group">
                        <label for="currencyFrom">
                          <select class="custom-select" id="currencyFrom" name="currencyFrom" v-model="currencyFrom" v-on:change="dirty" disabled="disabled">
                            <option value="USD">USD</option>
                          </select><span>{{ $t('home.homePreference.from') }}<sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-3">
                      <div class="form-group">
                        <label for="currencyTo">
                          <select class="custom-select" id="currencyTo" name="currencyTo" v-model="currencyTo" @change="changeCurrencyStore(currencyTo)">
                            <option value="" hidden="hidden" selected="selected">{{ $t('home.homePreference.currencySelect') }}</option>
                            <option v-for="currency in currencyList" :value="currency">{{ currency }}</option>
                          </select><span>{{ $t('home.homePreference.to') }}<sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-lg-3">
                      <div class="d-flex">
                        <p>{{ $t('home.homePreference.from') }}  {{ currencyFrom }}</p>
                        <p class="ml-1">{{ $t('home.homePreference.to') }}  {{ currencyTo }}</p>
                      </div><span class="spinner-border spinner-border-sm" v-if="loadingPreferenceInfo" role="status" aria-hidden="true"></span>
                      <p v-else>{{ currencyAmount }}</p>
                    </div>
                    <div class="col-lg-3">
                      <div class="form-group">
                        <label>
                          <input class="form-control required" v-model="currencyDate" @change="changeDate(currencyDate)" type="date" disabled="disabled" :max="maxDate"/><span>{{ $t('home.homePreference.currencyDate') }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="h5 mt-3">{{ $t('home.homePreference.notifications') }}</div>
                  <div class="row mb-4">
                    <div class="col-4"></div>
                    <div class="col-4"><span>{{ $t('home.homePreference.EmailNotifications') }}</span></div>
                    <div class="col-4"><span>{{ $t('home.homePreference.PlatformNotifications') }}</span></div>
                  </div>
                  <div class="row border-bottom mt-2" v-for="(setting, index) in userNotificationSettings">
                    <div class="col-4 m-0">
                      <div class="d-flex"><span>{{ $t('home.homePreference.' + setting.notificationType) }}</span></div>
                    </div>
                    <div class="col-4 m-0">
                      <div class="form-checkout m-1">
                        <label :for="setting.notificationType + '.email'">
                          <input :id="setting.notificationType + '.email'" type="checkbox" :name="setting.notificationType + '.email'" v-model="setting.enabledToEmail" v-on:change="dirty"/><span class="custom"></span>
                        </label>
                      </div>
                    </div>
                    <div class="col-4 m-0">
                      <div class="form-checkout ml-4 text-center">
                        <label :for="setting.notificationType + '.platform'">
                          <input :id="setting.notificationType + '.platform'" type="checkbox" :name="setting.notificationType + '.platform'" v-model="setting.enabledToPlatform" v-on:change="dirty"/><span class="custom"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-5">
                    <div class="block-footer-buttons gap-2">
                      <button class="btn outline-secondary-btn" @click="cancelPreference()"><span class="spinner-border spinner-border-sm" v-if="loadingPreferenceInfo" role="status" aria-hidden="true"></span><span v-else>{{ $t('button.cancel') }}</span></button>
                      <button class="btn btn-primary" @click="savePreference()"><span class="spinner-border spinner-border-sm" v-if="loadingPreferenceInfo" role="status" aria-hidden="true"></span><span v-else>{{ $t('global.save') }}</span></button>
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
import HomeMenuAccount from '../components/HomeMenuAccount.vue'
import { onBeforeRouteLeave } from 'vue-router'
import { defineComponent, reactive, toRefs, watch } from 'vue'

import { useHomeStore } from '@/stores/home'
import { useWelcomeStore } from '@/stores/welcome'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { CalculumLoading, CalculumLayout } from '@ada/design-system'
import router from '@/services/router'
import DateUtils from '@/utils/DateUtils'
import AdminMenuCompany from '@/modules/adminBackend/components/AdminMenuCompany.vue'
import * as Routing from '@/services/router/Routing'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { useCompany, useUser } from '@/composables'
import { ObjectUtils, StringUtils } from '@/utils'
import { Locales } from '@ada/design-system/locales/keys'
import { UserSession } from '@/types'
import { getFlowResetPassword } from "@/utils/CookieSessionsFns"
import { useUserStore } from '@/stores/user'

// To check if there are unsaved changes
let unsavedChanges = false

// To redirect after saving or discarding changes
let wasGoingTo: any = null

export default defineComponent({
  name: 'HomePreferences',
  components: {
    CalculumLoading,
    HomeMenuAccount,
    AdminMenuCompany,
    CalculumModal,
    CalculumLayout,
    CalculumTooltipIcon
  },
  setup() {

    const homeStore = useHomeStore()
    const appStore = useAppStore()
    const userStore = useUserStore()
    const welcomeStore = useWelcomeStore()

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const { user, userIri } = useUser();

    const { companyActiveName } = useCompany();
    
    document.title = translate.t('home.homePreference.title')

    interface Preferences {
      userNotificationSettings: Array<any>,
      time: string,
      language: string,
      automaticLogout: boolean,
      email: string,
      phone: string,
      loading: boolean,
      loadingPreferenceInfo: boolean,
      formHasError: boolean,
      formErrorMessage: string,
      timeZones: Array<any>,
      timezone: string,
      dialCode: string,
      dialCodeISO: string,
      currencyFrom: string,
      currencyTo: string,
      currencyAmount: number,
      currencyDate: string,
      maxDate: string,
      currencyList: Array<any>,
      decimalFormatting: string,
      dataCountries: Array<any>,
      emailUser: string,
      loadingForgotPassword: boolean,
      companyName: string,
      showConfirmModal: boolean,
      currencyToPreview: string,
      showChangePassword: boolean
    }

    let userStateClone = ObjectUtils.cloneDeep(user.value);

    const preferences = reactive<Preferences>({
      userNotificationSettings: userStateClone.userNotificationSetting?.sort((a: any, b: any) => (a.id < b.id ? -1 : 1)),
      time: appStore.getTimeInactivity,
      language: user.value?.language ?? Locales.EN,
      automaticLogout: appStore.getInactivityBoolean,
      email: '',
      phone: '',
      loading: false,
      loadingPreferenceInfo: false,
      formHasError: false,
      formErrorMessage: '',
      timeZones: DateUtils.getTimezoneNames(),
      timezone: userStateClone.timezone,
      dialCode: (userStateClone.dialCode) ? userStateClone.dialCode : '1',
      dialCodeISO: (userStateClone.dialIsoCode) ? userStateClone.dialIsoCode : 'US',
      currencyFrom: appStore.getCurrencyFrom,
      currencyTo: appStore.getCurrencyTo,
      currencyAmount: appStore.getCurrencyAmount,
      currencyDate: appStore.getCurrencyDate,
      maxDate: DateUtils.formatYYYYMMDD(new Date()),
      currencyList: appStore.getCurrencies,
      dataCountries: appStore.getCountries,
      decimalFormatting: user.value?.decimalFormatting ?? '',
      emailUser: user.value?.email ?? '',
      loadingForgotPassword: false,
      companyName: companyActiveName.value,
      showConfirmModal: false,
      currencyToPreview: '',
      showChangePassword: userStore.getSourceAccount === 'localAccountAuthentication'
    })


    function getCountries() {
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          preferences.dataCountries = callbackSuccessData.sort((a: any, b: any) => a.localizedName.localeCompare(b.localizedName))
        },
        callbackError: () => {
          
        }
      }
      appStore.fetchCountries(params.callbackSuccess, params.callbackError)
    }

    getCountries()
    
    // Load currencies
    appStore.fetchCurrencies()

    onBeforeRouteLeave((to) => {
      if (unsavedChanges) {
        wasGoingTo = to
        preferences.showConfirmModal = true
        return false
      } else {
        return true
      }      
    })

    /**
     * Watchers
     */
    watch(
      () => appStore.getCurrencyDate,
      () => {
        // alert('Hi you Changed de proposed value now es: ' + entityCardNegotiationGraphic.approachTerms)
        preferences.currencyDate = appStore.getCurrencyDate
      }
    )

    function callbackOnChangeCountry(value: any) {
      preferences.dialCode = value.dialCode
      preferences.dialCodeISO = value.iso2
    }

    function callbackOnChangePhone(value: any) {
      preferences.phone = value
    }

    function inactivityBoolean(automatic: any) {
      appStore.setAutomaticLogout(automatic)
      dirty()
    }
    function sendTime() {
      appStore.setTimeInactivity(preferences.time)
    }
    function clearErrors() {
      preferences.formHasError = false
    }

    /**
     * Click on Save button
     */
    function savePreference() {
      preferences.showConfirmModal = false

      preferences.loadingPreferenceInfo = true
      
      sendTime()

      appStore.setCurrencyAmount(preferences.currencyAmount)

      appStore.setCurrencyTo(preferences.currencyToPreview !== '' ? preferences.currencyToPreview : appStore.getCurrencyFrom)

      const params = {
        userId: userIri.value,
        timezone: preferences.timezone,
        language: preferences.language,
        decimalFormatting: preferences.decimalFormatting,
        userNotificationSetting: preferences.userNotificationSettings,
        callbackSuccess: (callbackSuccessData: UserSession) => {
          const languageChanged = user.value?.language !== callbackSuccessData.language

          user.value = callbackSuccessData;

          preferences.loadingPreferenceInfo = false

          unsavedChanges = false;

          /**
           * Grid columns and chart options resolve their labels at import time (see
           * utils/translation.ts), so switching the locale in place leaves every already-imported
           * title in the previous language. Reload so those modules re-resolve against the
           * language we just persisted. Deferred like cancelPreference, to let the store flush.
           */
          if (languageChanged) {
            setTimeout(() => { location.reload() })
          }
        },
        callbackError: () => {
          preferences.loadingPreferenceInfo = false
        }
      }
      welcomeStore.companyUserInfo(params)
    }
    function cancelPreference() {
      preferences.loadingPreferenceInfo = true

      userStateClone = ObjectUtils.cloneDeep(user.value);

      setTimeout(() => { location.reload() })

      unsavedChanges = false
    }
    function changeCurrencyStore(currencyTo: any) {
      preferences.loadingPreferenceInfo = true
      const params = {
        currencyTo: currencyTo,
        date: preferences.currencyDate,
        callbackSuccess: (callbackSuccessData: any) => {
          if (preferences.currencyFrom === currencyTo){
            preferences.currencyToPreview = ''
            preferences.currencyAmount = 1
          } else {
            preferences.currencyToPreview = currencyTo
            preferences.currencyAmount = callbackSuccessData.result
          }
          preferences.loadingPreferenceInfo = false
        },
        callbackError: () => {
          preferences.loadingPreferenceInfo = false
        }
      }
              homeStore.changeCurrency(params)
      dirty()
    }

    function changeDate(date: any) {
      // store.commit('setCurrencyDate', date)
      changeCurrencyStore(preferences.currencyTo)
      dirty()
    }

    /**
     * Change number format
     */
    function setDecimalFormatting(value: string): void {
      // If same option as already saved it's selected return 
      // if(user.value.decimalFormatting === value)  return
      if (value.trim() === '') return
      preferences.decimalFormatting = value
      dirty()
    }

    function dirty(): void {
      unsavedChanges = true
      
    }

    function discardChanges() {
      unsavedChanges = false
      // window.$('#confirm-changes').modal('hide')
      preferences.showConfirmModal = false
      router.push(wasGoingTo.fullPath)
    }

    function cancelNavigation() {
      // window.$('#confirm-changes').modal('hide')
      preferences.showConfirmModal = false
    }

    async function forgotPassword () {
      if (preferences.loadingForgotPassword){
        return false
      } else {
        preferences.loadingForgotPassword = true
        getFlowResetPassword()
      }      
    }

    return {
      ...toRefs(preferences),
      savePreference,
      sendTime,
      clearErrors,
      inactivityBoolean,
      user,
      callbackOnChangeCountry,
      callbackOnChangePhone,
      changeCurrencyStore,      
      changeDate,
      setDecimalFormatting,
      cancelPreference,
      userNotificationSettings: preferences.userNotificationSettings,
      discardChanges,
      cancelNavigation,
      dirty,
      router,
      Routing,
      forgotPassword
    }
  }
})
</script>

<style lang="scss" scoped>
.card--full .card__body {
  margin-bottom: 0 !important;
}

.divEmail {
  width: 50%;

  @media (max-width: 1460px) {
    width: 70%;
  }
}

.divNumber {
  width: 50%;

  @media (max-width: 1460px) {
    width: 70%;
  }
}

.marginSelect {
  margin-bottom: 1.5rem;
}
</style>
