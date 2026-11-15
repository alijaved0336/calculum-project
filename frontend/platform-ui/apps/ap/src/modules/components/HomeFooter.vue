<template>
<CalculumLoading v-if="loading" :modal="true"> </CalculumLoading>
<CalculumModal :size="'md'" :showClose="true" :title="$t('global.manageCookiePreferences')" @close="showCookieModal = !showCookieModal" v-if="showCookieModal">
  <template v-slot:modalContent><span v-html="$t('global.manageCookiePreferencesBodyText')"></span><br/><a class="privacy-policy" href="../../../../Privacy_Policy_Calculum.pdf" target="_blank">{{ $t('global.privacyPolicy') }}</a>
    <div class="row mt-4">
      <div class="col-10">
        <h5 class="mt-4 text-2 font-semibold text-capitalize text-gray-600">{{ $t('global.strictlyNecessary') }}</h5>
        <p>{{ $t('global.strictlyNecessaryText') }}</p>
      </div>
      <div class="col-2">
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <label class="switch mt-4" :title="$t('global.disabled')">
            <input type="checkbox" v-model="strictlyNecessary" disabled="disabled"/><span class="slider-disabled round"></span>
          </label>
        </Tooltip>
      </div>
    </div>
    <div class="row">
      <div class="col-10">
        <h5 class="mt-4 text-2 font-semibold text-capitalize text-gray-600">{{ $t('global.analyticsCookies') }}</h5>
        <p>{{ $t('global.analyticsCookiesText') }}</p>
      </div>
      <div class="col-2">
        <label class="switch mt-4">
          <input type="checkbox" v-model="analyticsCookies" @change="changeStatus"/><span class="slider round"></span>
        </label>
      </div>
    </div>
    <div class="d-flex w-100 mt-4 container-buttons-edition">
      <button class="btn btn-primary font-md" v-if="!button" style="z-index: 1; width: fit-content" @click="saveData"> <span>{{$t('global.confirmMyChoice')}}</span></button>
    </div>
  </template>
</CalculumModal>
<div class="container-footer">
  <div class="row">
    <div class="col-6 d-flex"><a class="text-xs text-gray-500 me-4" v-if="!isNecessaryRemoveAdaReferences" href="https://www.calculum.ai" target="_blank">{{ $t('global.calculumName') }}      </a>
      <div class="text-xs text-gray-500 me-4">{{ $t('global.copyright') }}</div>
      <div class="text-xs text-gray-500">{{ appVersion }}</div>
    </div>
    <div class="col-6 d-flex links-footer">
      <div class="text-xs text-gray-500 me-4"><a class="href-link text-xs text-gray-500" id="terms-of-service" href="../../../../Calculum_Terms_of_Service.pdf" target="_blank">{{ $t('global.termsOfService') }}</a></div>
      <div class="text-xs text-gray-500 me-4"><span class="href-link text-xs text-gray-500 manage-cookie" @click="showCookieModal = !showCookieModal">{{ $t('global.manageCookie') }}</span></div>
      <div class="text-xs text-gray-500"><a class="href-link text-xs text-gray-500" id="privacy-policy" href="../../../../Privacy_Policy_Calculum.pdf" target="_blank">{{ $t('global.privacyPolicy') }}</a></div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import * as Routing from '@/services/router/Routing'
import router from '@/services/router/index'
import { fontIcons, images } from '@/resources/assets/assets'
import { reactive, toRefs, defineComponent } from 'vue'
import { useHomeStore } from '@/stores/home'
import { useAppStore } from '@/stores/app'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { CalculumLoading } from '@ada/design-system'
import useCompany from "@/composables/useCompany"

export default defineComponent({
  name: 'HomeMenu',
  components: { CalculumModal, Tooltip, CalculumLoading },
  setup() {
    const homeStore = useHomeStore()
    const appStore = useAppStore()

    
    const { isNecessaryRemoveAdaReferences } = useCompany()

    interface HomeMenuInterface {
      appVersion: string,
      showCookieModal: boolean,
      strictlyNecessary: boolean,
      analyticsCookies: boolean,
      analyticsCookiesInitial: boolean,
      button: boolean,
      loading: boolean
    }

    const data = reactive<HomeMenuInterface>({
      appVersion: appStore.getAppVersion,
      showCookieModal: false,
      strictlyNecessary: true,
              analyticsCookies: homeStore.getIsAnalyticsActive,
        analyticsCookiesInitial: homeStore.getIsAnalyticsActive,
      button: true,
      loading: false
    })

    function changeStatus(){
      if (data.analyticsCookies !== data.analyticsCookiesInitial) {
        data.button = false
      } else {
        data.button = true
      }
    }

    function saveData() {
      homeStore.setIsAnalyticsActive(data.analyticsCookies)
      data.analyticsCookiesInitial = data.analyticsCookies
      data.button = true
      data.showCookieModal = false
    }

    return {
      ...toRefs(data),
      fontIcons,
      images,
      router,
      Routing,
      BASE_URL: import.meta.env.VITE_BASE_URL,
      changeStatus,
      saveData,
      isNecessaryRemoveAdaReferences
    }
  }
})
</script>

<style lang="scss" scoped>
  @import "components/footer";
  @import "utilities/bs5-utilities";
</style>
