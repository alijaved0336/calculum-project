<template>
<main class="page page__login">
  <CalculumLoading v-if="showLoading" modal />
  <div v-if="!showLoading" class="col-12">
    <div class="row w-100 card relative">
      <div class="col-12 p-0">
        <div class="img-exposure">
          <img :src="images.backgroundLogin" alt="" class="w-100" />
        </div>
      </div>

      <div class="col-12 login p-0">
        <!--
          One section, not the four near-identical ones this replaced. The wording is looked up by
          slug and the style is chosen from a closed set, so neither is the URL's to write.
        -->
        <section class="login__body">
          <div role="alert" :class="alertClass">
            <span>{{ alertMessage }}</span>
          </div>
        </section>

        <section class="login__body">
          <div class="form-button">
            <a class="btn btn-primary" @click="goTologinScreen">
              <span>{{ $t('global.willberedirect') }} {{ counter }} {{ $t('global.seconds') }} {{ $t('global.orclickHere') }}</span>
            </a>
          </div>
        </section>

        <div class="support-section">
          <a href="https://www.calculum.ai/contact-us" class="link-support cursor-pointer mr-3">{{ $t('home.components.navbar.alerts.needHelp') }}</a>
        </div>

        <!--
          Diagnostic, and subordinate on purpose: below the action, small, monospaced, and absent
          entirely when there is nothing to show. It used to render `Error: ` with whatever the URL's
          third segment held, on every visit.
        -->
        <div v-if="providerCode" class="support-section">
          <span class="text-xxs text-gray-400">Error: <code>{{ providerCode }}</code></span>
        </div>
      </div>
    </div>

    <div class="row mt-4 justify-content-center">
      <p class="copyright">{{ $t('global.copyright') }} - {{ appVersion }}</p>
    </div>
  </div>
</main>
</template>
  
<script lang="ts">
import { computed, reactive, toRefs, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { images, fontIcons } from '@/resources/assets/assets'
import { readProviderErrorCode, resolveAlertVariant, resolveErrorMessageKey } from '@/modules/auth/errorMessages'
import { defaultLocale } from '@ada/design-system/locales/index'
import { useAppStore } from '@/stores/app'
import { translate } from '../../../utils/translation'
import { CalculumLoading } from '@ada/design-system'
import * as Routing from "@/services/router/Routing";
import { authLogin } from "@/utils/CookieSessionsFns";  

  
  export default {
    name: 'Login',
    components: { CalculumLoading },
    props: {
      errorType: {
        type: String, required: true
      },    
      message: {
        type: String,
        required: false,
        default: ""
      },    
      errorb2c: {
        type: String, required: false, default: ""
      },    
    },
    setup(props: any) {
      document.title = translate.t('global.login')
      const appStore = useAppStore()

      /**
       * Nothing the address carries reaches this screen as words (G-350, AB#19509).
       *
       * `useI18n` rather than the template's `$t`: the wording has to be CHOSEN before it is
       * rendered, and `$t('error.' + message)` did the choosing in the template with no way to
       * reject a slug. vue-i18n returns the key for a miss, so that expression printed
       * `error.<whatever was in the URL>`.
       */
      const { t, te } = useI18n({ useScope: 'global' })

      /**
       * <b>`te` is asked about the fallback locale as well, because it does not consult it itself.</b>
       * It inspects the ACTIVE locale only, while `t` honours `fallbackLocale` — so a key defined in
       * en.json and not yet in es.json rendered its English sentence to a Spanish user before this
       * change and would have silently rendered generic copy after it. `defaultLocale` is the same
       * value `utils/translation.ts` passes as `fallbackLocale`, so the two cannot disagree.
       *
       * Raised by AI review on PR 14238. Its named examples were all present in both files; the risk
       * is the next key added to one and not the other.
       */
      const hasCopyFor = (key: string) => te(key) || te(key, defaultLocale)

      const alertMessage = computed(() => t(resolveErrorMessageKey(props.message, hasCopyFor)))
      const alertClass = computed(() => `alert-${resolveAlertVariant(props.errorType)}`)

      /** Null unless the value looks like something B2C could have sent. */
      const providerCode = computed(() => readProviderErrorCode(props.errorb2c))

      const counter = ref(20)

      const showLoading = ref(false)
    
      const data = reactive({
        appVersion: appStore.getAppVersion,      
      })


      onMounted(() => {
        countdown(counter.value);
      })


      function countdown(start: number) {
        
        counter.value = start        
        if (counter.value < 1) {
          authLogin()
          return;
        }
        setTimeout(() => {
          countdown(counter.value - 1); 
        }, 1000);
      }
  
      const goTologinScreen = () => {              
        if (props.message === 'error-loginfb') {
          Routing.openRelogin()        
        } else {
          window.location.href = "/"
        }        
      }    
  
      
      return {
        ...toRefs(data),
        images,      
        fontIcons,
        goTologinScreen,
        counter,
        showLoading,
        alertMessage,
        alertClass,
        providerCode,
        DEBUG: import.meta.env.DEV
      }
    }
  }
  </script>
  
  <style scoped lang="scss">
   @import "src/resources/assets/styles/variables/colors";

  .alert-error {
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 14px;    
      line-height: 1.2;    
      margin: 1rem 0px;
      background-color: #FEF3F2;
      color: #D92D20;
      border: 1px solid #FFA3B3;
  }
  
  .alert-info {
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 14px;    
      line-height: 1.2;    
      margin: 1rem 0px;
      background: $color-blue-50 !important;
      border: 1px solid $color-blue-300 !important;
      color: $color-blue-900 !important;
  }
  
  .alert-warning {
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 14px;    
      line-height: 1.2;    
      margin: 1rem 0px;
      background: $color-warning-50 !important;
      border: 1px solid $color-warning-300 !important;
      color: $color-warning-900 !important;
  }
  
  .alert-success {
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 14px;    
      line-height: 1.2;    
      margin: 1rem 0px;
      background: $color-success-50 !important;
      border: 1px solid $color-success-200 !important;
      color: $color-success-700 !important;
  }
  
  .chevron-svg {
      width: 0.5rem;      
    }
  
    .support-section {
      text-align: center;
      margin-top: 24px;
    }
  
    .link-support {
      font-style: normal;
      font-size: 14px;
      line-height: 1.2;
      color: #667085;
    }

    .form-button {
      display: flex;
      justify-content: center;
    }

    .form-button .btn {
      height: auto;
      white-space: normal;
      text-align: center;
      line-height: 1.4;
      padding: 12px 20px;
      cursor: pointer;
    }

  </style>
  