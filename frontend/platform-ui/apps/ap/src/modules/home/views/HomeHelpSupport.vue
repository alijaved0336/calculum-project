<template>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col-lg-3 col-xl-2 border-right">
                  <HomeMenuAccount :currentPage="'HelpSupport'"></HomeMenuAccount>
                </div>
                <div class="col-lg-9 col-xl-10 p-5">
                  <div class="h6 font-weight-bold">{{ $t('home.homeHelpSupport.title') }}
                    <CalculumTooltipIcon :infoText="$t('home.homeHelpSupport.titleTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-preferences-support'" :keyPopOver="'preferencesHelpNSupport'"></CalculumTooltipIcon>
                  </div>
                  <div class="alert alert-danger" v-if="formHasError" role="alert" style="cursor: pointer" @click="clearErrors"><span v-html="formErrorMessage" v-if="formErrorMessage.length > 0"></span><span v-else>{{ $t('welcome.form.messageError') }}</span></div>
                  <div class="alert alert-success" v-if="showMessageSuccess" role="alert" style="cursor: pointer;" @click="clearErrors"><span>{{ $t('home.homeHelpSupport.messageSuccess') }}</span></div>
                  <div class="row mt-4">
                    <div class="col-md-12">
                      <div class="form-group">
                        <label for="subject">
                          <input class="form-control required" id="subject" type="text" name="subject" v-model="subject" :placeholder="$t('home.homeHelpSupport.subjectPlaceholder')" @input="checkInputError(subject)"/><span>{{ $t('home.homeHelpSupport.subject') }}<sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-md-12">
                      <div class="form-group">
                        <label for="message">
                          <textarea class="form-control required" id="message" name="message" cols="30" rows="10" v-model="content" :placeholder="$t('home.homeHelpSupport.contentPlaceholder')" @input="checkInputError(content)"></textarea><span>{{ $t('home.homeHelpSupport.content') }}<sup>*</sup></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-5">
                    <div class="block-footer-buttons gap-2">
                      <button class="btn btn-primary" @click="formValidator"><span class="spinner-border spinner-border-sm" v-if="loadingUserInfo" role="status" aria-hidden="true"></span><span v-else>{{ $t('home.homeHelpSupport.send') }}</span></button>
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
import { reactive, toRefs, computed } from 'vue'
import { useHomeStore } from '@/stores/home'
import { useI18n } from 'vue-i18n'
import HomeMenuAccount from '../components/HomeMenuAccount.vue'
import * as Validator from '@/utils/validators'
import { CalculumLayout } from '@ada/design-system'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'

export default {
  name: 'HomeHelpSupport',
  components: {
    HomeMenuAccount, CalculumLayout, CalculumTooltipIcon
  },
  setup () {
    const homeStore = useHomeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    document.title = translate.t('home.homeHelpSupport.title')

    interface HelpSupport {
      firstName: string,
      surname: string,
      email: string,
      subject: string,
      content: string,
      formErrorMessage: string,
      formHasError: boolean,
      showMessageSuccess: boolean,
      loadingUserInfo: boolean
    }

    const data = reactive<HelpSupport>({
      firstName: '',
      surname: '',
      email: '',
      subject: '',
      content: '',
      formErrorMessage: '',
      formHasError: false,
      showMessageSuccess: false,
      loadingUserInfo: false
    })

    const messageError = computed(() => {
      let result = ''

      // if (!Validator.isValidString(data.firstName)) {
      //   result += translate.t('home.homeHelpSupport.firstNameIsRequired')
      // }

      // if (!Validator.isValidString(data.surname)) {
      //   result += translate.t('home.homeHelpSupport.surnameIsRequired')
      // }

      // if (!Validator.isValidEmail(data.email)) {
      //   result += translate.t('home.homeHelpSupport.emailIsRequired') + "<br />"
      // }

      if (!Validator.isValidString(data.subject)) {
        result += translate.t('home.homeHelpSupport.subjectIsRequired') + "<br />"
      }

      if (!Validator.isValidString(data.content)) {
        result += translate.t('home.homeHelpSupport.contentIsRequired') + "<br />"
      }

      return result
    })

    function apiSendEmailForHelp () {
      data.loadingUserInfo = true
      const params = {
        firstName: data.firstName,
        surname: data.surname,
        email: data.email,
        subject: data.subject,
        content: data.content,
        callbackSuccess: (callbackSuccessData: any) => {
          data.firstName = ''
          data.surname = ''
          data.email = ''
          data.subject = ''
          data.content = ''
          data.showMessageSuccess = true
          data.loadingUserInfo = false
        },
        callbackError: () => {
          data.loadingUserInfo = false
        }
      }
              homeStore.sendEmailForHelp(params)
    }

    function checkInputError (modelValue: any) {
      if (((typeof modelValue === 'number' && modelValue < 0) || (typeof modelValue === 'string' && !modelValue)) ||
        data.formHasError) {
        data.formErrorMessage = messageError.value

        if (data.formErrorMessage.length === 0) {
          clearErrors()
        }
      }
    }

    function clearErrors () {
      data.formHasError = false
      data.showMessageSuccess = false
    }

    function formValidator () {
      if (data === null) {
        return
      }

      data.formErrorMessage = messageError.value
      if (data.formErrorMessage || data.loadingUserInfo) {
        data.formHasError = true
        return
      }

      apiSendEmailForHelp()
    }

    return {
      ...toRefs(data),
      messageError,
      checkInputError,
      clearErrors,
      formValidator
    }
  }
}
</script>

<style lang="scss" scoped>

.card--full .card__body {
  margin-bottom: 0 !important;
}

// @media only screen and (min-height: 1201px){
//   .card--full{
//   height: calc(100vh - calc(100% - 25vh));
//   }
// }

// @media only screen and (min-height: 1000px) and (max-height: 1200px ){
//   .card--full{
//   height: calc(100vh - calc(100% - 20vh));
//   }
// }

// @media only screen and (min-height: 750px ) and (max-height: 999px){
//   .card--full{
//   height: calc(100vh - calc(100% - 20vh));
//   }
// }

// @media only screen and (min-height:591px) and(max-height: 749px){
//   .card--full{
//   height: calc(100vh - calc(100% - 10vh));
//   }
// }

// @media only screen and (max-height: 590px){
//   .card--full{
//    height: 100vh;
//   }
// }
</style>
