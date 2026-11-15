<template>
<CalculumDeleteModal :show="isShowConfirmModalDelete" @hide="hideDelete" @submit="saveDelete"></CalculumDeleteModal>
<CalculumRecalculationModal @recalculate-details="recalculateDetails" :forEditFinancing="true" :forEditHarmonization="false" :show="showModalRecalculate"></CalculumRecalculationModal>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="d-flex w-100">
  <div class="col-12 flex align-items-base"><span class="mr-4">{{ $t('home.analyze.externalFinancing') }}
      <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="'popover-program-edition-financing'" :keyPopOver="'programEditionFinancing'"></CalculumTooltipIcon></span>
    <label class="switch" id="applyFinancingGroupSwitch">
      <input id="applyFinancingGroup" type="checkbox" v-model="hasFinancing" :disabled="disabledButtonSpendFileInrecalculation" @change="changeHasFinancing"/><span class="slider round" :class="{'slider-disabled no-hover': disabledButtonSpendFileInrecalculation}"></span>
    </label>
  </div>
</div>
<div class="d-flex w-100">
  <div class="analyze-modal-harm" v-if="hasFinancing">
    <AnalyzeExternalFinancing :selectedProgramId="selectedProgramId" :editedFinanceFilterObj="editedFinanceFilterObj" :dataProgram="dataProgram" :fromCreate="false" :groupsForList="groupsForList" :spendFileInrecalculation="spendFileInrecalculation" @has-input-error="hasInputErrors = true" @no-input-error="hasInputErrors = false" @removed-condition="removedCondition" @backGroups="backGroups" @showFilterRuleModal="showFilterRuleModal" @updateChosenConditionFilter="updateChosenFilter" v-if="showGroupsList"></AnalyzeExternalFinancing>
  </div>
</div>
<div class="d-flex w-100 mt-1">
  <div class="col-12 d-flex justify-content-end">
    <button class="btn btn-primary font-md" id="saveFinancingGroup" style="z-index: 1; width: fit-content" :disabled="changesIn || hasInputErrors || disabledSaveButton || disabledButtonSpendFileInrecalculation" @click="saveChanges"><span>{{ $t('global.save') }}</span></button>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs, watch, onMounted, inject, defineExpose, ref } from 'vue'
import { useAnalyzeStore } from '@/stores/analyze'
import AnalyzeExternalFinancing from '@/modules/home/analyze/components/AnalyzeExternalFinancing.vue'
import { CalculumLoading } from '@ada/design-system'
import * as Routing from '@/services/router/Routing'
import { useToast } from 'vue-toastification'
import * as formatData from '@/utils/FormatData'
import { useI18n } from 'vue-i18n'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { ProgramEdit } from '@/modules/home/analyze/types/index'
import useGroupsbyProgram from "@/composables/useGroupsbyProgram";
import { StringUtils } from '@/utils'
import CalculumDeleteModal from '@/modules/components/CalculumDeleteModal.vue'
import CalculumRecalculationModal from '@/modules/components/CalculumRecalculationModal.vue'
import { useUser } from '@/composables'


export default defineComponent({
  name: 'FinancingComponent',
  components: {
    AnalyzeExternalFinancing,
    CalculumLoading,
    CalculumDeleteModal,
    CalculumTooltipIcon,
    CalculumRecalculationModal
  },
  props: {
    selectedProgramId: { type: String, default: '' },
    dataProgram: { type: Object, required: true },
    editedFinanceFilterObj: { type: Object, required: false },
    madeChangesInFilter: { type: Boolean, required: false },
    saveGroupsProp: { type: Boolean, required: false },
    spendFileInrecalculation: { type: Boolean, required: false, default: false }  
  },
  emits: ['close', 'show-filter-modal', 'close-filter-modal', 'update-chosen-filter', 'show-recalculation-modal',  'save-changes-and-recalculate', 'change-redirect-value','user-made-changes'],
  setup(props, { emit }) {

    const { storeFinancingByProgram } = useGroupsbyProgram()

    const { updateExternalFinancing } = useUser()

    type SendChangesToParentFn = (value: boolean) => void
    const sendChangesToParent = inject<SendChangesToParentFn>('sendChangesToParent')

    type resetChangesFn = () => void
    const resetChanges = inject<resetChangesFn>('resetChanges')

    const toast = useToast()
    const analyzeStore = useAnalyzeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const programEdit = reactive<ProgramEdit>({
      addedGroups: [],
      changesIn: true,
      externalFinancingEnabled: props.dataProgram.externalFinancingEnabled,
      groups: [],
      groupsDeleted: null,
      hasFinancing: props.dataProgram.externalFinancingEnabled,
      hasFinancingInitial: props.dataProgram.externalFinancingEnabled,
      hasInputErrors: false,
      initialGroups: [],
      isRuleFilterShowing: false,
      loading: false,
      showConfirmModal: false,
      showGroupsList: false,
      groupsForList: [],
      isShowConfirmModalDelete: false,
      showModalRecalculate: false,
      disabledSaveButton: false
    })


    function changeHasFinancing() {
      if (programEdit.hasFinancing === programEdit.hasFinancingInitial) {        
        programEdit.changesIn = true
      } else {
        if (programEdit.hasFinancing) {
          programEdit.changesIn = true
        } else {
          programEdit.changesIn = false
          programEdit.isShowConfirmModalDelete = true          
        }
      }
    }

    function removedCondition() {
      programEdit.changesIn = false
    }

    
    watch(() => props.madeChangesInFilter, () => {
      if (props.madeChangesInFilter) {
        programEdit.changesIn = false
        emit('user-made-changes')
      }
    }, { deep: true })


    watch(() => programEdit.hasFinancing, () => {
      if (programEdit.hasFinancing === false) {
        programEdit.hasInputErrors = false
      }
    })

    const hasInputErrorsComputed = computed(() => {
      return programEdit.hasInputErrors
    })
    function updateChosenFilter(editObj: any) {
      emit('update-chosen-filter', editObj)
    }

    function showFilterRuleModal(group: any) {
      emit('show-filter-modal', group)
    }

    function closeRuleFilterComponent(isEditMode: boolean) {
      emit('close-filter-modal', isEditMode)
    }    

    function validateFields() {
      let validate = 0
      programEdit.groups.forEach(function (group: any) {
        
        if (
          isNaN(group.fundingSpread) ||
          group.fundingSpread === null ||
          group.fundingSpread === ''
        ) {
          validate = validate + 1
        }


        if (group.financingName === null || group.financingName === '') {
          validate = validate + 1
        }

        if (!group.isAutoBaseRate) {
          if (isNaN(group.baseRate) || 
            group.baseRate === null || 
            group.baseRate === '' ||
            group.baseRate === 0) {
            validate = validate + 1
          }
        }

      })

      if (validate === 0) {
        programEdit.changesIn = false
      } else {
        programEdit.changesIn = true
      } 
      
      sendChangesToParent?.(!programEdit.changesIn)
      emit('user-made-changes',!programEdit.changesIn)
    }
    function backGroups(groupsBack: any, groupsBackDeleted: any, deleted: boolean, componentMounted: boolean = false) {

      programEdit.groupsDeleted = groupsBackDeleted || []
      programEdit.groups = JSON.parse(JSON.stringify(groupsBack))
      programEdit.addedGroups = programEdit.groups
 
      /**
       * Clean errors
      */

      for (const row of programEdit.groups) {
          delete row.baseRatePresentation
          delete row.fundingSpreadPresentation
          delete row.errorFundingSpread
          delete row.errorFinancingName
          delete row.hasErrors
          delete row.errorBaseRate
      }

      for (const row of programEdit.initialGroups) {
          delete row.baseRatePresentation
          delete row.fundingSpreadPresentation
          delete row.errorFundingSpread
          delete row.errorFinancingName
          delete row.hasErrors
          delete row.errorBaseRate
      }

 
 
      if (deleted) {
        programEdit.changesIn = false
      }
      if (programEdit.hasFinancing !== programEdit.hasFinancingInitial && programEdit.groups.length > 0) {
        validateFields()
        return false
      }

      if (programEdit.hasFinancing && programEdit.groups.length === 0) {
        programEdit.changesIn = true
        return false
      }

      if (programEdit.initialGroups && programEdit.groups) {
        if (JSON.stringify(programEdit.initialGroups) !== JSON.stringify(programEdit.groups)) {

          if (!componentMounted) {
            validateFields()
          }          
        } else {
          sendChangesToParent?.(false)
          emit('user-made-changes',false)
          programEdit.changesIn = true
        }
      }
    }

    function sortByPriority(myarray: any) {
      myarray = myarray.sort((a: any, b: any) => a.priority - b.priority)
      return myarray
    }

    /**
     * Retrieves the financing groups for the selected program from the API.
     *
     * @return {Promise<void>} - A promise that resolves when the financing groups are successfully retrieved.
     */
    async function getFinancingGroupsApi(): Promise<void> {

      programEdit.loading = true
      const params = {
        programId: props.selectedProgramId,
        callbackSuccess: (callbackSuccessData: any) => {
          storeFinancingByProgram(props.selectedProgramId,callbackSuccessData)
          analyzeStore.setFinancing(callbackSuccessData)
          normalizeGroups(callbackSuccessData)          
          programEdit.loading = false
        },
        callbackError: (callbackErrorData: any) => {
          // Disable loading
          programEdit.loading = false

          // Log error
          if (import.meta.env.DEV) console.log('** ERROR Get Financing Groups', callbackErrorData)
        }
      }
      await analyzeStore.getFinancingGroups(params)
    }

    function postUpdateFinancingGroups() {
      
      emit('user-made-changes',false)
      sendChangesToParent?.(false)
      if (resetChanges) {
        resetChanges()
      }
       
    programEdit.disabledSaveButton = true

      programEdit.groups.forEach(function (group: any, index: number) {
        group.priority = index + 1
        group.financingRules.forEach(function (item: any) {
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
              item.filterOne.value = formatData.changeToUSD(item.filterOne.value)
            }
            if (item.filterTwo !== null && item.filterTwo.value !== null) {
              item.filterTwo.value = formatData.changeToUSD(item.filterTwo.value)
            }
          }
        })
      })

      const params = {
        program: props.selectedProgramId,
        externalFinancingEnabled: programEdit.hasFinancing,
        automateFinancingTerms: false,
        groupsDeleted: programEdit.groupsDeleted,
        groups: programEdit.groups,
        approvalTimeSource: null,
        approvalTime: null,
        callbackSuccess: (callbackSuccessData: any) => {          
          programEdit.changesIn = true
          programEdit.loading = false
          programEdit.disabledSaveButton = false
          //To update the store
          getFinancingGroupsApi()
          updateExternalFinancing(programEdit.hasFinancing)
        },
        callbackError: () => {
          programEdit.loading = false
          programEdit.disabledSaveButton = false
          emit('close', 'financing', false)
          toast.error('ERROR Updating financing groups')
        }
      }
      analyzeStore.postUpdateFinancingGroups(params)
    }

    function saveChanges() {      
      programEdit.showModalRecalculate = true      
    }

    function discardChanges() {
      programEdit.showConfirmModal = false
      programEdit.changesIn = true
      emit('close', 'financing', false)
    }

    function validateChanges() {
      programEdit.loading = false
      if (!programEdit.changesIn) {
        programEdit.showConfirmModal = true
      } else {
        programEdit.changesIn = true
        emit('close', 'financing', false)
      }
    }

    function hideDelete() {
      programEdit.changesIn = true
      programEdit.hasFinancing = true
      programEdit.isShowConfirmModalDelete = false
    }

    function saveDelete() {
      programEdit.changesIn = true
      programEdit.isShowConfirmModalDelete = false
      programEdit.groupsDeleted = programEdit.initialGroups
      programEdit.groups = []
      postUpdateFinancingGroups()
    }

    
    function normalizeGroups(groupsData: any) {
      for (const row of groupsData) {
        row.uuid = StringUtils.removeIRI(row['@id'])
        row.financingName = row.financingName ? row.financingName : ''
        row.baseRatePresentation = formatData.getNumberWithDecimals(row.baseRate, 2)
        row.fundingSpreadPresentation = formatData.getNumberWithDecimals(row.fundingSpread, 2)
        row.baseRate = row.baseRate === 0 ? null : row.baseRate
        row.modified = false
        row.errorFinancingName = ''
        row.errorBaseRate = ''
        row.errorFundingSpread = ''
        delete row['@type']
        delete row.program
      }
      programEdit.initialGroups = sortByPriority(JSON.parse(JSON.stringify(groupsData)))
      programEdit.groupsForList = JSON.parse(JSON.stringify(groupsData))
      programEdit.showGroupsList = true
    }


     function recalculateDetails(decision: string) {
        if (decision === 'cancel') {
          programEdit.showModalRecalculate = false
        }
        
        if (decision === 'cancelAndGoToDifferenTab') {
          programEdit.showModalRecalculate = false
        }

        if (decision === 'continue') {
          programEdit.showModalRecalculate = false
          postUpdateFinancingGroups()
        }           
      }

    onMounted(() => {
      getFinancingGroupsApi()
    })

    defineExpose({
      postUpdateFinancingGroups
    })

    watch(() => props.saveGroupsProp, () => {      
      if (props.saveGroupsProp) {
        postUpdateFinancingGroups()
      }
            
        }, { deep: true })

    const disabledButtonSpendFileInrecalculation = computed(() => {
      return props.spendFileInrecalculation
    })

    return {
      ...toRefs(programEdit),
      backGroups,
      changeHasFinancing,
      closeRuleFilterComponent,
      discardChanges,
      formatData,
      hasInputErrorsComputed,
      hideDelete,
      removedCondition,
      saveChanges,
      saveDelete,
      showFilterRuleModal,
      sortByPriority,
      updateChosenFilter,
      validateChanges,
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
