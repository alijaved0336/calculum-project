<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homePreference.confirm')" @close="cancel" v-if="showModal">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChanges') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancel"><span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="discardChanges"><span>{{ $t('global.discard') }}</span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="saveChanges"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="row">
  <div class="col">
    <div class="card" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row" id="show-financing-groups" @click="showFinancingGroups = !showFinancingGroups">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('home.homeCompanySettings.financingGroups') }}</span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('home.homeCompanySettings.financingGroupsText') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showFinancingGroups"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showFinancingGroups"></i></div>
        </div>
        <div class="row" v-if="showFinancingGroups">
          <FinancingGroups :saveGroupsProp="saveGroups" :spendFileInrecalculation="disabledButtonSpendFileInrecalculation"></FinancingGroups>
        </div>
        <hr class="mt-2 mb-6"/>
        <div class="row" id="show-financing-rate" @click="showSupplierFinancingRate = !showSupplierFinancingRate">
          <div class="col-11 cursor-pointer"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ $t('home.homeCompanySettings.financing') }}</span>
            <p class="text-base mt-4 cursor-pointer">{{ $t('home.homeCompanySettings.financingText') }}</p>
          </div>
          <div class="col-1 cursor-pointer d-flex chevron-setup-sections"><i class="fa-solid fa-chevron-down text-3xl text-gray-300" v-if="!showSupplierFinancingRate"></i><i class="fa-solid fa-chevron-up text-3xl text-gray-300" v-if="showSupplierFinancingRate"></i></div>
        </div>
        <div class="row custom_height" v-if="showSupplierFinancingRate">
          <div class="col-12 mb-4 d-flex flex-column gap-3"><span class="text-gray-600 text-base font-semibold mt-3"> {{ $t('home.homeCompanySettings.supplierFinancingRate') }}</span><span class="text-base">{{ $t('home.homeCompanySettings.supplierFinancingRateText') }}</span></div>
          <div class="col-12 cursor-pointer d-flex disabled-button">
            <label class="rounded-checkbox">
              <input class="styled-checkbox" type="radio" :value="'fr'" v-model="optionSelected" @click="optionSelected = 'fr',setChanges" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': optionSelected !== 'fr', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;</span>
            </label>
            <h6 class="wacc-options" @click=" disabledButtonSpendFileInrecalculation ? null : optionSelected = 'fr',setChanges" :class="{'no-hover': disabledButtonSpendFileInrecalculation}"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.fr') }}</span></h6>
            <label class="rounded-checkbox">
              <input class="styled-checkbox" type="radio" :value="'at'" v-model="optionSelected" @click="optionSelected = 'at',setChanges" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': optionSelected !== 'at', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;</span>
            </label>
            <h6 class="wacc-options" @click=" disabledButtonSpendFileInrecalculation ? null : optionSelected = 'at',setChanges" :class="{'no-hover': disabledButtonSpendFileInrecalculation}"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.at') }}</span>
              <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.taxAfterWaccTooltip')" :size="15"></CalculumTooltipIcon>
            </h6>
            <label class="rounded-checkbox">
              <input class="styled-checkbox" type="radio" :value="'bt'" v-model="optionSelected" @click="optionSelected = 'bt',setChanges" :disabled="disabledButtonSpendFileInrecalculation"/><span class="checkmark-disabled" :class="{'disabled-radio': optionSelected !== 'bt', 'no-hover': disabledButtonSpendFileInrecalculation}">&nbsp;</span>
            </label>
            <h6 class="wacc-options" @click=" disabledButtonSpendFileInrecalculation ? null : optionSelected = 'bt',setChanges" :class="{'no-hover': disabledButtonSpendFileInrecalculation}"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.bt') }}</span>
              <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.taxPreWaccTooltip')" :size="15"></CalculumTooltipIcon>
            </h6>
          </div>
          <div class="row w-100">
            <div class="col-12 d-flex">
              <div class="row w-100">
                <div class="col-12 d-flex actions-buttons">
                  <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="companyData('patch')" :disabled="!withChanges || disabledButtonSpendFileInrecalculation"><span>{{ $t('global.save') }}</span></button>
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
<script lang="ts">
import { defineComponent, reactive, toRefs, watch, onMounted, computed, provide } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { onBeforeRouteLeave } from 'vue-router'
import router from '@/services/router'
import { CalculumLoading } from '@ada/design-system'
import { useHomeStore } from '@/stores/home'
import { useI18n } from 'vue-i18n'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { useCompany } from '@/composables'
import FinancingGroups from "./Financing/FinancingGroups.vue";
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/user'

export default defineComponent({
  name: 'FinancingSetup',
  components: { CalculumModal, CalculumLoading, CalculumTooltipIcon, FinancingGroups  },
  props: {
    showAlert: { type: Boolean },
    otherTab: { type: String, default: null },
    sectionDefault: { type: String, default: null },
    spendFileInrecalculation: { type: Boolean, default: false }
  },
  emits: ['send-changes', 'save-n-continue', 'discard-n-continue', 'cancel-n-continue'],
  setup(props, { emit }) {
    const homeStore = useHomeStore()
    const toast = useToast()
    const userStore = useUserStore()

    const {
      companyActiveId
    } = useCompany();

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })


    interface HomeCompanySettings {
      loading: boolean,
      withChanges: boolean,
      saveNContinue: any,
      showModal: boolean,
      optionSelected: string,
      optionSelectedOriginal: string,
      showSupplierFinancingRate: boolean,
      showFinancingGroups: boolean,
      saveGroups: boolean
    }

    const data = reactive<HomeCompanySettings>({
      loading: false,
      withChanges: false,
      saveNContinue: null,
      showModal: props.showAlert,
      optionSelected: '',
      optionSelectedOriginal: '',
      showSupplierFinancingRate: false,
      showFinancingGroups: true,
      saveGroups: false
    })

    const withChanges = computed(() => {
      return data.optionSelected !== data.optionSelectedOriginal;
    });

    const setChanges = () => {
      data.withChanges = withChanges.value;
      emit('send-changes', data.withChanges);
    };

    onBeforeRouteLeave((to) => {
      if (data.withChanges) {
        data.saveNContinue = to
        data.showModal = true
        return false
      } else {
        return true
      }
    })

    function discardChanges() {
      data.withChanges = false
      if (props.otherTab !== '') {
        emit('discard-n-continue')
      } else {
        router.push(data.saveNContinue.fullPath)
      }
    }

    function cancel() {
      data.showModal = false
      emit('cancel-n-continue')
    }

    function saveChanges() {
      data.showModal = false
      data.saveGroups = true
    }

    /**
     * Watchers
     */

    watch(() => props.showAlert, (newValue) => {
      data.showModal = newValue
    })


    provide('resetChanges', resetChanges)
    function resetChanges() {
      data.saveGroups = false
    }

    function companyData(method: string) {
      data.loading = true
      const params = {
        financingStrategyMethod: data.optionSelected,
        companyUUid: companyActiveId.value,
        method: method,
        callbackSuccess: (callbackDataResponse: any) => {
          data.loading = false
          data.optionSelected = callbackDataResponse.financingStrategyMethod
          data.optionSelectedOriginal = callbackDataResponse.financingStrategyMethod
          userStore.setFinancingStrategyMethod(callbackDataResponse.financingStrategyMethod);
          data.withChanges = false
          emit('send-changes', data.withChanges)
          if (method !== 'get') {
            toast.success(translate.t('global.successSavingFinancing'));
          }
        },
        callbackError: () => {
          data.loading = false
          toast.error(translate.t('global.errorSavingData'));
        }
      }
              homeStore.postCompanySettings(params)
    }

    const disabledButtonSpendFileInrecalculation = computed(() => {
      return props.spendFileInrecalculation
    })

    /**
     * On mounted
     */
    onMounted(() => {
      companyData('get')
    })

    return {
      ...toRefs(data),
      withChanges,
      saveChanges,
      discardChanges,
      cancel,
      router,
      setChanges,
      companyData,
      disabledButtonSpendFileInrecalculation

    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

.card {
  min-height: auto !important;

  &:hover {
    box-shadow: 0 1px 5px $shadow;
  }
}

.actions-buttons {
  flex: 1 0 auto;
  justify-content: end;
  gap: 1rem;
}
.disabled-button {
  justify-content: start;
  gap: 1.5rem;
}
</style>
