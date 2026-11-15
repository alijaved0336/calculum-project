<template>
  <main class="d-flex align-items-center justify-content-center pt-10">
    <div class="card d-flex justify-content-between w-96 pt-10" id="contact-support-card">
      <div class="d-flex flex-column text-success-500">
        <IconCheckCircleFill class="mb-6 w-24 h-24 mx-auto" />

        <p class="border rounded-lg border-success-500 p-4 bg-success-50">
          Request Sent Successfully!
          We've received your message and will assist you shortly.
        </p>
      </div>

      <!-- Send Button -->

      <button @click="goTologinScreen" class="btn btn-primary w-unset ml-auto" type="submit">
        Back to Login
      </button>
    </div>
  </main>
</template>
  
<script lang="ts">
import IconCheckCircleFill2 from "@/resources/assets/images/icons/IconCheckCircleFill2.vue";
import { useI18n } from "vue-i18n";
import * as Routing from '@/services/router/Routing'

export default {
  name: "LoginContactSupport",
  components: {
    IconCheckCircleFill2
  },
  props: {
    errorType: {
      type: String, required: true
    },
    message: {
      type: String,
      required: false
    },
  },
  setup(props: any) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    // Page Title
    document.title = t('global.login')

    // *** Go to Login Button ***

    const goTologinScreen = () => {
      Routing.openMain()                        
    }

    // *** END Go to Login Button ***

    return {
      goTologinScreen
    }
  }
}
</script>