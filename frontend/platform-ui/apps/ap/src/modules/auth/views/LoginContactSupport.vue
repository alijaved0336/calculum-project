<template>
  <main class="d-flex align-items-center justify-content-center pt-10">
    <div class="card w-96">

      <!-- Back Button -->
      <button class="mb-6 btn-text text-left" aria-label="Back" @click="goTologinScreen">
        <CalculumChevronLeft class="mr-2" />

        <span>{{ $t('global.back') }}</span>
      </button>

      <!-- Heading -->
      <h3 aria-label="help">Help</h3>

      <form aria-label="Contact support" @submit.prevent="recaptchaHandleSubmit">
        <!-- Email -->

        <div class="mb-4">
          <label for="email"> {{ $t('global.email') }}</label>

          <input 
            id="email" v-model="email" class="border border-gray-300" type="email" name="Email Address"
            title="Please enter a valid email address"
            pattern="^[a-zA-Z0-9!#$%&amp;'+^_`{}~-]+(?:\.[a-zA-Z0-9!#$%&amp;'+^_`{}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$"
            placeholder="ada@example.com" aria-label="Email Address" />

          <!-- Form Input Validation Warning -->
          <div v-if="!StringUtils.isEmpty(inputValueErrorMsgEmail)" class="mt-2">
            <ErrorBox :messages="[inputValueErrorMsgEmail]" :class-name="'p-2'" />
          </div>
        </div>

        <!-- Message -->

        <div class="entry-item mb-4">
          <label for="message">
            {{ $t('global.describeYourIssue') }}
          </label>

          <textarea 
            id="message" v-model="issueMessage" class="w-100 border border-gray-300" name="message"
            title="Please enter a valid message" placeholder="Tell us what's what you need help with..."
            aria-label="Message"></textarea>

          <!-- Form Input Validation Warning -->
          <div v-if="!StringUtils.isEmpty(inputValueErrorMsgTextArea)" class="mt-2">
            <ErrorBox :messages="[inputValueErrorMsgTextArea]" :class-name="'p-2'" />
          </div>
        </div>

        <div class="mb-2 d-flex justify-content-center">
          <div id="recaptcha-container" style="min-height: 78px"></div>
        </div>

        <!-- Form Input Validation Warning -->
        <div v-if="!StringUtils.isEmpty(inputValueErrorMsgRecaptchaToken)" class="my-2">
          <ErrorBox :messages="[inputValueErrorMsgRecaptchaToken]" :class-name="'p-2'" />
        </div>

        <!-- Send Button -->

        <button class="g-recaptcha btn btn-primary w-unset ml-auto" type="submit">
          {{ $t('global.send') }}
        </button>
      </form>
    </div>
  </main>
</template>

<script lang="ts">
import { reactive, toRefs, onMounted, onUnmounted } from 'vue';

// Utils
import { StringUtils, isNullOrUndefined, isUndefined } from '@/utils'
import * as Validator from '@/utils/validators';
import { useI18n } from 'vue-i18n'
import * as Routing from '@/services/router/Routing'
import axios from '@/utils/axios';
import CalculumChevronLeft from '@/modules/components/CalculumChevronLeft.vue';
import ErrorBox from '@/modules/components/forms/ErrorBox.vue'
import { useToast } from 'vue-toastification';
import uuidRandom from 'uuid-random';
import { getBaseApi } from '@/utils/getBaseApi';

export default {
  name: 'LoginContactSupport',
  components: {
    ErrorBox,
    CalculumChevronLeft
  },
  props: {
    errorType: { type: String, required: true },
    message: { type: String, required: false, default: '' },
  },
  setup(props: any) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const toast = useToast()

    // Page Title
    document.title = t('global.login')

    // *** Back Button ***

    const goTologinScreen = () => {
      Routing.openMain()
    }

    // *** END Back Button ***

    // *** Form Validation ***

    const formData = reactive({
      email: '',
      issueMessage: '',
      inputValueErrorMsgEmail: '',
      inputValueErrorMsgTextArea: '',
      inputValueErrorMsgRecaptchaToken: '',
      recaptchaLoaded: false
    });

    function formDataIsValid(): boolean {
      // Validate email
      // Not empty and valid pattern
      formData.inputValueErrorMsgEmail = '';

      if (StringUtils.isEmpty(formData.email)
        || !Validator.isValidEmail(formData.email)) {
        formData.inputValueErrorMsgEmail = "Please enter a valid email address";

        return false;
      }

      // Validate message
      formData.inputValueErrorMsgTextArea = '';

      if (StringUtils.isEmpty(formData.issueMessage)) {
        formData.inputValueErrorMsgTextArea = "Please enter a message";

        return false;
      }

      return true;
    }

    // *** END Form Validation ***

    // *** Recaptcha ***

    interface Grecaptcha {
      execute: () => void;
      getPageId: () => void;
      getResponse: () => string;
      ready: (l: any) => void;
      reset: () => void;
      render: (container: string | HTMLElement, parameters: any) => number;
    }

    let recaptchaWidgetId: number | null = null;
    let isComponentMounted = false;

    // Load reCAPTCHA when component mounts
    onMounted(() => {
      isComponentMounted = true;
      
      // Define the callback function globally with error handling
      (window as any).onRecaptchaCallback = () => {
        try {
          // Only initialize if component is still mounted
          if (isComponentMounted) {
            initRecaptcha();
          }
        } catch (error) {
          // Ensure errors are Error objects, not strings
          const errorObj = error instanceof Error 
            ? error 
            : new Error(String(error));
          if (import.meta.env.DEV) console.error('Error in onRecaptchaCallback:', errorObj);
          toast.error(t("recaptcha.errorLoading"));
        }
      };
      
      loadRecaptchaScript();
    });

    // Clean up when component unmounts
    onUnmounted(() => {
      // Mark component as unmounted first to prevent any pending callbacks
      isComponentMounted = false;
      
      // Remove global callback
      delete (window as any).onRecaptchaCallback;
      
      // Clear script load timeout if still pending
      if (scriptLoadTimeout) {
        clearTimeout(scriptLoadTimeout);
        scriptLoadTimeout = null;
      }

      // Safely reset reCAPTCHA widget
      if (recaptchaWidgetId !== null && (window as any).grecaptcha) {
        try {
          // Only reset if the container still exists in the DOM
          const container = document.getElementById('recaptcha-container');
          if (container) {
            (window as any).grecaptcha.reset(recaptchaWidgetId);
          }
        } catch (error) {
          // Ignore errors during cleanup - widget may already be destroyed
          if (import.meta.env.DEV) console.warn('reCAPTCHA cleanup warning:', error);
        }
      }
      
      // Clear the widget ID
      recaptchaWidgetId = null;
    });

    let scriptLoadTimeout: ReturnType<typeof setTimeout> | null = null;

    const loadRecaptchaScript = () => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaCallback&render=explicit`;
      script.async = true;
      script.defer = true;
      
      // Handle script load error
      script.onerror = () => {
        if (import.meta.env.DEV) console.error('Failed to load reCAPTCHA script');
        toast.error(t("recaptcha.errorLoading"));
        formData.recaptchaLoaded = false;
        if (scriptLoadTimeout) {
          clearTimeout(scriptLoadTimeout);
          scriptLoadTimeout = null;
        }
      };

      document.head.appendChild(script);

      // Set a timeout to detect if script doesn't load
      scriptLoadTimeout = setTimeout(() => {
        if (!formData.recaptchaLoaded && isComponentMounted) {
          if (import.meta.env.DEV) console.error('reCAPTCHA script load timeout');
          toast.error(t("recaptcha.errorLoading"));
          formData.recaptchaLoaded = false;
          // Don't reject promises - just show error to user
        }
      }, 10000); // 10 second timeout
    };

    const initRecaptcha = async () => {
      try {
        // Clear the load timeout since script loaded successfully
        if (scriptLoadTimeout) {
          clearTimeout(scriptLoadTimeout);
          scriptLoadTimeout = null;
        }

        if ((window as any).grecaptcha) {
          // Render the reCAPTCHA widget
          recaptchaWidgetId = (window as any).grecaptcha.render('recaptcha-container', {
            sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            callback: (response: string) => {
              try {
                if (import.meta.env.DEV) console.log('reCAPTCHA response:', response);
                formData.inputValueErrorMsgRecaptchaToken = '';
              } catch (error) {
                const errorObj = error instanceof Error 
                  ? error 
                  : new Error(String(error));
                if (import.meta.env.DEV) console.error('Error in reCAPTCHA callback:', errorObj);
              }
            },
            'expired-callback': () => {
              try {
                if (import.meta.env.DEV) console.log('reCAPTCHA expired');
                formData.inputValueErrorMsgRecaptchaToken = t("recaptcha.message");
              } catch (error) {
                const errorObj = error instanceof Error 
                  ? error 
                  : new Error(String(error));
                if (import.meta.env.DEV) console.error('Error in reCAPTCHA expired-callback:', errorObj);
              }
            },
            'error-callback': () => {
              try {
                if (import.meta.env.DEV) console.error('reCAPTCHA error callback triggered');
                formData.inputValueErrorMsgRecaptchaToken = t("recaptcha.errorLoading");
              } catch (error) {
                const errorObj = error instanceof Error 
                  ? error 
                  : new Error(String(error));
                if (import.meta.env.DEV) console.error('Error in reCAPTCHA error-callback:', errorObj);
                toast.error(t("recaptcha.errorLoading"));
              }
            }
          });
          formData.recaptchaLoaded = true;
        } else {
          throw new Error('reCAPTCHA not available after script load');
        }
      } catch (error) {
        // Ensure error is always an Error object
        const errorObj = error instanceof Error 
          ? error 
          : new Error(String(error));
        if (import.meta.env.DEV) console.error("Failed to initialize reCAPTCHA:", errorObj);
        toast.error(t("recaptcha.errorLoading"));
        formData.recaptchaLoaded = false;
      }
    };

    async function recaptchaHandleSubmit(e: Event): Promise<void> {
      try {
        // Validate form
        if (!formDataIsValid()) {
          throw new Error("Validation failed");
        }

        // Wait for reCAPTCHA to load if not already loaded
        if (!formData.recaptchaLoaded) {
          toast.error(t("recaptcha.errorLoading"));
          throw new Error("reCAPTCHA not loaded");
        }

        const grecaptcha: Grecaptcha = (window as any).grecaptcha;

        if (isUndefined(grecaptcha)) {
          // Show noty
          toast.error(t("recaptcha.errorLoading"));
          throw new Error("Grecaptcha is not defined");
        }

        // Get token from recaptcha and send it to API for validation
        const token = grecaptcha.getResponse();

        // Validate recaptcha token
        formData.inputValueErrorMsgRecaptchaToken = '';

        if (StringUtils.isEmpty(token)) {
          formData.inputValueErrorMsgRecaptchaToken = t("recaptcha.message");
          throw new Error("No token received");
        }

        // Validation was successfull. Send token to API
        const params = {
          "g-recaptcha-response": token,
          "expected-action": "contact-support",
          "email": formData.email,
          "issueMessage": formData.issueMessage
        }

        const url = getBaseApi() + "/api/login/recaptcha";

        let response: any = null;        

        let headers = {
          headers: {
            'Authorization': 'Basic ' + btoa(`${import.meta.env.VITE_RECAPTCHA_BASIC_AUTH_USERNAME}:${import.meta.env.VITE_RECAPTCHA_BASIC_AUTH_PASSWORD}`),
            'Content-Type': 'application/json',
            'idk': uuidRandom()
          }
        };

        response = axios.post(
          url,
          params,
          headers
        ).catch((error: unknown) => {
          // Ensure error is always an Error object
          const errorObj = error instanceof Error 
            ? error 
            : new Error(error ? String(error) : 'Unknown error occurred');
          // Show noty
          toast.error(t("recaptcha.errorValidating"));
          // Always throw Error objects, never strings
          throw errorObj;
        })

        response = await response

        if (!isNullOrUndefined(response) && response.status === 200) {
          Routing.auth.openLoginContactSupportSuccess()
        } else {
          // Show noty
          toast.error(t("recaptcha.errorValidating"));
          throw new Error("API returned an error");
        }
      }
      catch (e: unknown) {
        // Ensure error is always an Error object for proper logging
        const errorObj = e instanceof Error 
          ? e 
          : new Error(e ? String(e) : 'Unknown error in recaptchaHandleSubmit');
        if (import.meta.env.DEV) console.error("** (recaptchaHandleSubmit)", errorObj);
        // Error is already handled in try block, just log it
      }
    }

    // *** END Recaptcha ***

    return {
      ...toRefs(formData),
      goTologinScreen,
      RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
      recaptchaHandleSubmit,
      StringUtils,
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.card {
  max-width: min(500px, 90%);

  // Hover
  .btn-text:hover {
    color: var(--color-primary-500);

    span {
      text-decoration: underline;
    }
  }
}

label {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--color-gray-700);
}

input,
textarea {
  width: 100%;
  border-radius: 8px;
  margin-top: 0.2rem;
  padding: 0.75rem 0.5rem 0.75rem 0.5rem;
  background-color: #ffffff;
  color: #475467;
}

input::placeholder {
  font-weight: 400;
  color: #667085;
}

input:hover {
  border: solid #4d5749 1px;
}
</style>