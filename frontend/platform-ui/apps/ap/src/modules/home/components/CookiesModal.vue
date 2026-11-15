<template>
<CalculumModal :size="'md'" :showClose="cookiesOption === null ? false : true" :title="$t('global.privacyNotice')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row">
      <div class="col-12">
        <p class="text-justify">{{  $t('global.vpCookiesTextIntro') }}</p><span class="privacy-policy cursor-pointer" @click="$emit('open-privacy-policy')">{{ $t('global.privacyNotice') }}      </span>
      </div>
    </div>
    <div class="row" v-if="showCustomizeCookiePreferences">
      <div class="col-10">
        <h5 class="mt-4 text-2 font-semibold text-capitalize text-gray-600">{{ $t('global.strictlyNecessary') }}</h5>
        <p>{{ $t('global.strictlyNecessaryText') }}</p>
      </div>
      <div class="col-2 d-flex end-justify-content">
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <label class="switch mt-4" :title="$t('global.disabled')">
            <input type="checkbox" v-model="strictlyNecessary" disabled="disabled"/><span class="slider-disabled round"></span>
          </label>
        </Tooltip>
      </div>
      <div class="col-10 d-flex flex-column gap-2">
        <h5 class="mt-4 text-2 font-semibold text-capitalize text-gray-600">{{ $t('global.analyticsCookies') }}</h5><span>{{  $t('global.cookiesVPText') }}        </span>
      </div>
      <div class="col-2 d-flex end-justify-content">
        <label class="switch mt-4">
          <input type="checkbox" v-model="acceptCookies"/><span class="slider round"></span>
        </label>
      </div>
    </div>
    <div class="row mt-4">
      <div class="col-12 d-flex justify-content-between"><span class="privacy-policy cursor-pointer" @click="showCustomizeCookiePreferences =  !showCustomizeCookiePreferences">{{ !showCustomizeCookiePreferences ? $t('global.customizedCookiePreferencesShow') : $t('global.customizedCookiePreferencesHide') }}</span>
        <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="$emit('get-vp-data',acceptCookies)"> <span>{{  acceptCookies ? $t('global.acceptAllCookies') : $t('global.acceptCookies') }}</span></button>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { Tooltip } from "@progress/kendo-vue-tooltip";


export default defineComponent({
  name: 'CookiesModal',
  components: {
    CalculumModal,
    Tooltip,
  },
  props: {    
    cookiesOption: {
      type: Boolean,
      required: true
    }
  },
  emits: ['close','get-vp-data','open-privacy-policy'],
  setup(props, { emit }) {      
    const strictlyNecessary = ref(true)
    const acceptCookies = ref(props.cookiesOption === null ? true : props.cookiesOption) 
    const showCustomizeCookiePreferences = ref(false)


    return {
      strictlyNecessary,
      acceptCookies,
      showCustomizeCookiePreferences
    };
  },
});
</script>

<style lang="scss" scoped>

.privacy-policy {
    color: red;
    text-decoration: underline;
    border: unset;
  }


</style>