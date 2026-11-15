<template>
<CalculumDeleteModal :show="isShowConfirmModalDelete" @hide="hideDelete" @submit="saveDelete"></CalculumDeleteModal>
<CalculumRecalculationModal @recalculate-details="recalculateDetails" :forEditFinancing="false" :forEditHarmonization="true" :show="showModalRecalculate"></CalculumRecalculationModal>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="d-flex w-100">
  <div class="col-12 d-flex align-items-base"><span class="mr-4">{{ $t('home.analyze.applyTermHarmonization') }}
      <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="'popover-program-edition-harmonization'" :keyPopOver="'programEditionHarmonization'"></CalculumTooltipIcon></span>
    <label class="switch">
      <input type="checkbox" v-model="hasHarmonization" @change="changeHasHarmonization" :disabled="disabledButtonSpendFileInrecalculation"/><span class="slider round" :class="{'slider-disabled no-hover': disabledButtonSpendFileInrecalculation}"></span>
    </label>
  </div>
</div>
<div class="d-flex w-100">
  <div class="analyze-modal-harm" v-if="hasHarmonization">
    <AnalyzeTermHarmonization @backGroups="backGroups" :selectedProgramId="selectedProgramId" :dataProgram="dataProgram" :groupsForList="groupsForList" :spendFileInrecalculation="spendFileInrecalculation" @has-input-error="hasInputErrors = true" @no-input-error="hasInputErrors = false" v-if="showGroupsList"></AnalyzeTermHarmonization>
  </div>
</div>
<div class="d-flex w-100 mt-1">
  <div class="col-12 d-flex justify-content-end">
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" :disabled="changesIn || hasInputErrors || disabledSaveButton || disabledButtonSpendFileInrecalculation" @click="saveChanges"><span>{{ $t('global.save') }}</span></button>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, reactive, toRefs, onMounted, inject, computed } from 'vue'
import AnalyzeTermHarmonization from '@/modules/home/analyze/components/AnalyzeTermHarmonization.vue'
import { useAnalyzeStore } from '@/stores/analyze'
import CalclumConfirmModal from '@/modules/components/CalculumConfirmModal.vue'
import CalculumDeleteModal from '@/modules/components/CalculumDeleteModal.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import * as Routing from '@/services/router/Routing'
import { useToast } from 'vue-toastification'
import * as colorsGroups from '@/utils/ColorsGroups'
import { useI18n } from 'vue-i18n'
import * as FormatData from '@/utils/FormatData'
import useGroupsbyProgram from "@/composables/useGroupsbyProgram";
import CalculumRecalculationModal from '@/modules/components/CalculumRecalculationModal.vue'
import { StringUtils } from '@/utils'

export default defineComponent({
  name: 'HarmonizationComponent',
  components: {
    AnalyzeTermHarmonization,
    CalclumConfirmModal,
    CalculumDeleteModal,
    CalculumLoading,
    CalculumTooltipIcon,
    CalculumRecalculationModal
  },
  props: {
    gruposHarmonizacion: { type: Array, required: false, default: () => [] },
    selectedProgramId: { type: String, required: false, default: '' },
    dataProgram: { type: Object, required: false, default: () => { } },    
    saveGroupsProp: { type: Boolean, required: false },
    spendFileInrecalculation: { type: Boolean, default: false }
  },
  emits: [
    'change-continue-value-default-harmonization',
    'change-redirect-value',
    'close-loading',
    'no-redirect-for-recalculation',
    'save-changes-and-recalculate',
    'show-delete-harmonization-groups-modal',
    'show-harmonization-recalculation-modal',
    'user-made-changes'
  ],
  setup(props, { emit }) {
    const { findHarmonizationByProgram, storeHarmonizationByProgram } = useGroupsbyProgram()
    const analyzeStore = useAnalyzeStore()
    const toast = useToast()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const hasHarmonization = ref(props.dataProgram.termHarmonizationEnabled)
    const hasHarmonizationInitial = ref(props.dataProgram.termHarmonizationEnabled)
    const changesIn = ref(true)
    const initialGroups = ref<any[]>([])
    const groupsDeleted = ref<any[]>([])
    const groups = ref()
    const loading = ref(false)
    const automateGroups = ref()
    const roundingGroups = ref()
    const dataProgramGet = ref()
    const showModalRecalculation = ref()
    const roundOnInitial = ref(props.dataProgram.automateHarmonizationRoundOn)
    const recalculationInProgress = ref(false)

    type SendChangesToParentFn = (value: boolean) => void
    const sendChangesToParent = inject<SendChangesToParentFn>('sendChangesToParent')

    type resetChangesFn = () => void
    const resetChanges = inject<resetChangesFn>('resetChanges')

    interface Data {
      multiplier: number | null,
      maxNumOfGroups: number | null,
      basedOn: string | null,
      selectedDefaultColor: number,
      hasInputErrors: boolean,
      groupsForList: Array<any>,
      showGroupsList: boolean,
      isShowConfirmModalDelete: boolean,
      showModalRecalculate: boolean,
      disabledSaveButton: boolean 
    }
    
    const data = reactive<Data>({
      multiplier: 0,
      maxNumOfGroups: 0,
      basedOn: '',
      selectedDefaultColor: 0,
      hasInputErrors: false,
      groupsForList: [],
      showGroupsList: false,
      isShowConfirmModalDelete: false,
      showModalRecalculate: false,
      disabledSaveButton: false
    })

    /**
     * Get harmonization groups for update object in store
     */
    async function getProgramTermGroupsApi() {
      loading.value = true
      const params = {
        programId: props.selectedProgramId,
        callbackSuccess: (callbackSuccessData: any) => {
          loading.value = false
          storeHarmonizationByProgram(props.selectedProgramId,callbackSuccessData)
          analyzeStore.setGroups(callbackSuccessData)
          normalizeNames(callbackSuccessData)
        },
        callbackError: () => {
          loading.value = false
        }
      }
      analyzeStore.getProgramTermGroups(params)
    }

    function normalizeNames(groupsData: any) {

      //first clean the array
      for (const row of groupsData) {
        row.uuid =  StringUtils.removeIRI(row['@id'])
        row.errorharmonizationDays = ''
        delete row['@type']
        delete row.program
        row.customName = false
      }

      //sorting
      data.selectedDefaultColor = 0
      groupsData.sort((a: any, b: any) => a.paymentTermsWithoutCashDiscountDays - b.paymentTermsWithoutCashDiscountDays).forEach(function (group: any, index: any) {
        if (isNaN(group.paymentTermsWithoutCashDiscountDays) || group.paymentTermsWithoutCashDiscountDays === null || group.paymentTermsWithoutCashDiscountDays === '') {
          group.name = 'H' + (index + 1)
        } else {
          group.name = 'H' + (index + 1) + ', ' + group.paymentTermsWithoutCashDiscountDays + 'D'
        }
        group.color = getColor()
      })

      initialGroups.value = JSON.parse(JSON.stringify(groupsData))
      //Variable for the grid groups
      data.groupsForList = JSON.parse(JSON.stringify(groupsData))
      //Variable only to show the grid groups
      data.showGroupsList = true      
    }

    function getColor() {
      if (data.selectedDefaultColor < 3) {
        data.selectedDefaultColor++
      } else {
        data.selectedDefaultColor = 0
      }

      if (data.selectedDefaultColor === 1) {
        return colorsGroups.firstGroup
      }
      if (data.selectedDefaultColor === 2) {
        return colorsGroups.secondGroup
      }
      if (data.selectedDefaultColor === 3) {
        return colorsGroups.thirdGroup
      }
      if (data.selectedDefaultColor === 0) {
        return colorsGroups.fourthGroup
      }
    }
    

    function changeHasHarmonization() {
      if (hasHarmonization.value === hasHarmonizationInitial.value) {
        changesIn.value = true
      } else {
        if (hasHarmonization.value) {
          changesIn.value = true
          if (initialGroups.value.length === 0) {
            changesIn.value = false
          }
        } else {
          changesIn.value = false
          data.isShowConfirmModalDelete = true
          
        }
      }
    }

    function validateFields() {
      let validate = 0
      groups.value?.forEach(function (group: any) {
        if (isNaN(group.paymentTermsWithoutCashDiscountDays) || group.paymentTermsWithoutCashDiscountDays === null || group.paymentTermsWithoutCashDiscountDays === '') {
          validate = validate + 1
        }
      })

      if (validate === 0) {
        changesIn.value = false
      } else {
        changesIn.value = true
      }
      emit('save-changes-and-recalculate', !changesIn.value)
      sendChangesToParent?.(!changesIn.value)
      emit('user-made-changes',!changesIn.value)

    }

    function backGroups(groupsBack: any, basedOn: string, automate: boolean, groupsNumber: number, multiple: number, roundOn: string, groupsBackDeleted: any[], harmonizationLevel: string) {
      groupsDeleted.value = groupsBackDeleted || []
      groups.value = JSON.parse(JSON.stringify(groupsBack))
      roundingGroups.value = roundOn
      automateGroups.value = automate
      data.multiplier = multiple
      data.basedOn = 'A' // basedOn
      data.maxNumOfGroups = groupsNumber

      if (hasHarmonization.value && groups.value.length === 0) {
        changesIn.value = true
        return false
      }
      
      if (initialGroups.value && groups.value) {
        if (JSON.stringify(initialGroups.value) !== JSON.stringify(groups.value)) {
          validateFields()
        } else {
          if (roundOnInitial.value !== roundOn && groups.value.length > 0) {
            changesIn.value = false
            emit('save-changes-and-recalculate', !changesIn.value)
            sendChangesToParent?.(!changesIn.value)
            emit('user-made-changes',!changesIn.value)
            return false
          }
          changesIn.value = true
          emit('save-changes-and-recalculate', !changesIn.value)
          sendChangesToParent?.(!changesIn.value)
          emit('user-made-changes',!changesIn.value)
        }
      }
    }

    function postUpdateHarmonizationgGroups() {
      emit('user-made-changes',false)

      data.disabledSaveButton = true

      sendChangesToParent?.(false)
      if (resetChanges) {
        resetChanges()
      } 
      
      groups.value.forEach(function (group: any, index: number) {
        group.priority = index + 1
        group.financingRules?.forEach(function (item: any) {
          //delete item.values
          if (item.field === 'SPEND_VOLUME') {
            if (item.level !== null && item.level.length > 0) {
              if (item.level === 'spend') {
                item.level = 'SPEND'
              }
              if (item.level === 'supplier') {
                item.level = 'PROVIDER'
              }
              if (item.level === 'parent') {
                item.level = 'PARENT'
              }
            }
            if (item.filterOne !== null && item.filterOne.value !== null) {
              item.filterOne.value = FormatData.changeToUSD(item.filterOne.value)
            }
            if (item.filterTwo !== null && item.filterTwo.value !== null) {
              item.filterTwo.value = FormatData.changeToUSD(item.filterTwo.value)
            }
          }
        })
      })
      // emit('close-loading')
      const params = {
        program: props.selectedProgramId,
        termHarmonizationEnabled: hasHarmonization.value,
        groupsDeleted: groupsDeleted.value,
        groups: groups.value,
        data: data,
        roundOn: roundingGroups.value,
        automateHarmonizationTerms: automateGroups.value,
        callbackSuccess: (callbackSuccessData: any) => {          
          changesIn.value = true
          loading.value = false
          data.disabledSaveButton = false
          getProgramTermGroupsApi()
        },
        callbackError: () => {
          loading.value = false
          data.disabledSaveButton = false
          emit('close-loading', 'harmonization', false)
          toast.error(translate.t('home.analyze.errorUpdatingHarmonizationGroups'))
        }
      }
      analyzeStore.postUpdateHarmonizationgGroups(params)
    }

    function saveChanges() {
      data.showModalRecalculate = true      
    }

    function hideDelete() {      
      hasHarmonization.value = hasHarmonizationInitial.value
      data.isShowConfirmModalDelete = false
    }
    
    function saveDelete() {
      changesIn.value = false
      groupsDeleted.value = initialGroups.value
      groups.value = []
      data.isShowConfirmModalDelete = false
      postUpdateHarmonizationgGroups()
    }

    function recalculateDetails(decision: string) {
      if (decision === 'cancel') {
        data.showModalRecalculate = false
      }
      
      if (decision === 'cancelAndGoToDifferenTab') {
        data.showModalRecalculate = false
      }

      if (decision === 'continue') {
        data.showModalRecalculate = false
        postUpdateHarmonizationgGroups()
      }           
    }

 
    // *** Setup ***

    onMounted(() => {

      data.showGroupsList = false
      getProgramTermGroupsApi()        
    })

    // *** Watchers ***
    watch(() => hasHarmonization.value, () => {
      if (hasHarmonization.value === false) {
        data.hasInputErrors = false
      }
    })

    watch(() => props.saveGroupsProp, () => {      
      if (props.saveGroupsProp) {
        postUpdateHarmonizationgGroups()
      }
            
        }, { deep: true })

    const disabledButtonSpendFileInrecalculation = computed(() => {
      return props.spendFileInrecalculation
    })

    
    return {
      ...toRefs(data),
      backGroups,
      changeHasHarmonization,
      changesIn,
      dataProgramGet,
      FormatData,
      hasHarmonization,
      loading,
      recalculationInProgress,
      saveChanges,
      saveDelete,
      showModalRecalculation,
      hideDelete,
      postUpdateHarmonizationgGroups,
      recalculateDetails,
      disabledButtonSpendFileInrecalculation
    }
  }
})
</script>

<style scoped lang="scss">
.analyze-modal-harm {
  width: 100% !important;
}
</style>
