<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('global.privacyNotice')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="d-flex flex-column gap-2">
      <p>{{  'Calculum is committed to protecting your privacy. This Privacy Notice explains how we use PostHog to track interactions when you access a Value Proposition shared by our Sales Team.' }}</p><span class="text-2 font-semibold text-capitalize text-gray-600">1. What Data Do We Collect?</span>
      <p>We collect:</p>
      <div class="d-flex">
        <ul>
          <li> <strong>Business Email Address </strong>- as shared previously with our Sales Team.</li>
          <li> <strong>Interaction Data </strong>- including:
            <ul>
              <li>Session entries and timestamps</li>
              <li>Duration of your visit</li>
              <li>Which modules or sections you view</li>
              <li>Time spent in each section</li>
            </ul>
          </li>
        </ul>
      </div>
      <p>This data is linked to your email to help us evaluate engagement and relevance.    </p><span class="text-2 font-semibold text-capitalize text-gray-600">2. How Is This Tracked?</span>
      <p>  We use <a href="https://posthog.com/" target="_blank" class="text-blue-500">PostHog</a> to gather this data. PostHog utilizes first-party cookies and localStorage, specifically:</p>
      <ul>
        <li> <strong>distinct_id</strong>- to track session entries and timestamps</li>
        <li> <strong>session_id</strong>- identifies individual browsing sessions</li>
        <li><strong>device_id</strong>- relates sessions back to your device/browser</li>
      </ul>
      <p>These cookies enable PostHog to record session start and end, track module/section views, and separate unique sessions. You can view PostHog&#39;s cookie policy here: first-party cookies only, no third-party tracking ( PostHog , PostHog).</p>
      <p>Should you decline consent, PostHog’s SDK is configured to opt you out, ensuring no cookies or persistent tracking is enabled ( <a href="https://posthog.com/privacy?utm_source=chatgpt.com" target="_blank" class="text-blue-500">PostHog</a>.</p><span class="text-2 font-semibold text-capitalize text-gray-600">3. Why Are These Cookies Necessary?</span>
      <p>They help us measure user engagement and identify which content resonates most. This data is used purely for improving our Value Proposition delivery and tailoring future outreach.</p><span class="text-2 font-semibold text-capitalize text-gray-600">4. How Is Your Data Protected?</span>
      <ul>
        <li>All data is handled according to our <strong>Data Protection Policy </strong>and <strong>SOC 2 Type 2 controls</strong></li>
        <li>Encryption is applied in transit and at rest</li>
        <li>Access limited to authorized personnel, for analytics purposes only</li>
      </ul><span class="text-2 font-semibold text-capitalize text-gray-600">5. How Long Do We Keep This Data?</span>
      <p>If you consent, interaction data (including cookies) is retained only for up to 30 days, unless legal or contractual obligations require otherwise. No data is reused beyond this period. If you opt out, no interaction data or cookies are retained.</p><span class="text-2 font-semibold text-capitalize text-gray-600">6. Your Rights</span>
      <p>As a prospect, you have the right to:</p>
      <ul>
        <li>Request access or correction of your data</li>
        <li>Request deletion</li>
        <li>Withdraw consent at any time</li>
      </ul>
      <p>{{ '' }}</p><span class="text-2 font-semibold text-capitalize text-gray-600">Who Can You Contact?</span>
      <p>Questions or requests? Reach out to our Data Privacy Officer at <a class="text-blue-500" href="mailto:support@calculum.ai">support@calculum.ai</a></p>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { Tooltip } from "@progress/kendo-vue-tooltip";

export default defineComponent({
  name: 'PrivacyPolicyModal',
  components: {
    CalculumModal,
    Tooltip,
  },
  props: {
  },
  emits: ['close', 'get-vp-data'],
  setup(props, { emit }) {


    return {

    };
  },
});
</script>

<style lang="scss" scoped>
h1,
h2,
h3 {
  color: #2c3e50;
}

ul {
  padding-left: 20px;
}

li {
  margin-bottom: 8px;
}

/* Asegúrate de que las listas muestren viñetas */
ul li {
  list-style-type: disc !important;
  ;
  /* Esto muestra las bolas tradicionales */
  list-style-position: inside;
  /* Para mejor alineación */
  padding-left: 1em;
  /* Espacio adecuado */
}

/* Para listas anidadas */
ul li ul li {
  list-style-type: circle !important;
  ;
  /* Estilo diferente para anidados */
}

/* Para listas ordenadas (ol) */
ol {
  list-style-type: decimal;
  padding-left: 1.5em;
}


</style>