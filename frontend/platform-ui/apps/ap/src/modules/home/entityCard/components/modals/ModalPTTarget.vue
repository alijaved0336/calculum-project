<template>
<CalculumModal @close="$emit('close')" :classesTitle="'normal-case'" :size="'xl'" :title="title" :showClose="true">
  <template v-slot:modalContent>
    <div class="row mb-3">
      <div class="col-12">
        <div class="row justify-content-between">
          <div class="col-6 mb-2">
            <div class="py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded" :class="'px-2.5'">
              <div class="row" :class="{ isLoadingSpendNewTerms: 'bg-blur' }">
                <div class="col-12">
                  <div class="form-group">
                    <label>
                      <input class="form-control required" v-model="inputValue" type="number" min="0"/><span>{{ $t('global.targetPaymentTermsD') }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 mt-2" v-if="!isEmpty(inputValueErrorMsg)">
            <ErrorBox :messages="[inputValueErrorMsg]"></ErrorBox>
          </div>
        </div>
      </div>
    </div>
    <CalculumLoading v-if="isLoadingGridData || loadingApi" block="block"> </CalculumLoading>
    <div class="row mb-5" v-if="!isLoadingGridData && (gridDataLocalCopy.length >= 1) && selectedTabIndex === 0">
      <div class="col-12">
        <!-- Grid expand / collapse -->
        <div class="d-flex justify-content-between align-items-center mb-2" v-if="gridDataLocalCopy.length >= 5"><span class="text-capitalize"></span>
          <p class="btn-extension" @click="gridToggleIsExpanded" v-if="!gridIsExpanded">
            <button class="btn btn-simple btn-icon link link--icon"><i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i></button>
          </p>
          <p class="btn-extension" @click="gridToggleIsExpanded" v-if="gridIsExpanded">
            <button class="btn btn-simple btn-icon link link--icon"><i class="fa-solid fa-down-left-and-up-right-to-center"></i></button>
          </p>
        </div>
        <CalculumGrid @select-all-row="handleGridRowSelectAllChanged" @select-row="handleGridRowSelectionChanged" :allowExportExcel="false" :editList="true" :enabledPagination="true" :entityCard="true" :gridColumns="columnsGrid" :girdCsvColumns="columnsGrid" :gridData="gridDataLocalCopy" :gridHeight="gridHeight" :headerscontrollers="false" :key="gridKey" :reorderingColumns="false" :rowColors="true" :selectable="true" :selectableOrdering="true" :defaultPageSize="5" :targetOperation="'ptTargetList'"></CalculumGrid>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md text-capitalize" @click="$emit('close')" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
    <button class="btn outline-secondary-btn font-md text-capitalize" @click="handleBtnClearClicked" :disabled="disabledSaveNClearButton" style="z-index: 1; width: fit-content">{{ $t('global.clear') }}</button>
    <button class="btn btn-primary font-md text-capitalize" @click="handleBtnSaveClicked" :disabled="disabledSaveNClearButton" style="z-index: 1; width: fit-content">{{ $t('global.save') }}</button>
  </template>
</CalculumModal>
</template>
  
<script lang="ts">
import { defineComponent, PropType, ref, Ref, computed } from 'vue';

import { GridColumnProps } from '@progress/kendo-vue-grid';
import { isEmpty, isNullOrUndefined } from '@/utils';
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import ErrorBox from '@/modules/components/forms/ErrorBox.vue'

// Types
import type { SpendLine } from '@/types';

export default defineComponent({
  name: 'ModalPTTarget',
  components: {
    CalculumGrid,
    CalculumLoading,
    CalculumModal,
    ErrorBox,
  },
  props: {
    columnsGrid: { type: Array as PropType<GridColumnProps[]>, default: () => [] },
    gridData: { type: Array as PropType<SpendLine[]>, default: () => [] },
    gridKey: { type: Number, default: new Date().getUTCMilliseconds() },
    isLoadingGridData: { type: Boolean, default: false },
    inputValueInitial: { type: Number, default: -1 },
    loadingApi: { type: Boolean, required: true, default: false },
    title: { type: String, default: '' },
    selectedTabIndex: { type: Number, default: 0 },
  },
  emits: [
    'btn-clear-clicked',
    'btn-save-clicked',
    'close',
    'grid-row-selection-changed',
    'input-value-changed'
  ],
  setup(props, { emit }) {
    // *** Input Value ***
    const inputValue: Ref<number | null> = ref(props.inputValueInitial === -1 ? null : props.inputValueInitial)

    // *** Grid ***

    const gridIsExpanded = ref(false)    
    const gridDataLocalCopy = ref(props.gridData)
    const gridSelectedRows: Ref<SpendLine[]> = ref([])
    const allItemsSelected: Ref<boolean> = ref(false)
    const gridHeight = computed(() => {
      if (gridDataLocalCopy.value && gridDataLocalCopy.value.length < 5) {
        return '500px';
      } 

      return 'auto';
    });

    validateNumbersofItems()
    function validateNumbersofItems(): void {
      
      gridSelectedRows.value = props.gridData
      gridSelectedRows.value.forEach(function (config: any) {        
        config.selected = true
      })     

      if (props.selectedTabIndex > 0) {
        allItemsSelected.value = false
      } else {
        allItemsSelected.value = true
      }
    }

    const disabledSaveNClearButton = computed(() => {

      if (props.selectedTabIndex > 0 ) {
        return false
      }


      return gridSelectedRows.value && gridSelectedRows.value.length === 0
    })

    /** 
     * Handle all grid rows checked 
     * 
     * @param {SpendLine[]} selectedRowsValue - The selected rows
     * @return {void}
     */
    function handleGridRowSelectAllChanged(selectedRowsValue: SpendLine[], checked: boolean): void {

      allItemsSelected.value = checked

      selectedRowsValue.forEach(function (config: any) {        
        const indexSpend = gridDataLocalCopy.value.findIndex(x => x.uuid === config.uuid)      
        gridDataLocalCopy.value[indexSpend].selected = checked
      })

      if (!checked) {
        gridSelectedRows.value = []
      } else {
        gridSelectedRows.value = gridDataLocalCopy.value
      }
    }

    /** 
     * Handle grid row checked 
     * 
     * @param {SpendLine[]} selectedRowsValue - The selected rows
     * @return {void}
     */
    function handleGridRowSelectionChanged(selectedRowsValue: any): void {
      gridSelectedRows.value = selectedRowsValue
      allItemsSelected.value = selectedRowsValue.length === gridDataLocalCopy.value.length
    }

    /**
     * Toggle the value of gridIsExpanded
     *
     * @return {void} 
     */
    function gridToggleIsExpanded(): void {
      gridIsExpanded.value = !gridIsExpanded.value
    }

    // *** END Grid ***

    // *** Buttons ***

    /**
     * Handle click on save button.
     *
     * @return {void}
     */
    function handleBtnSaveClicked(): void {
      // Validate input
      validateInput({ action: 'save' })

      // Invalid
      if (!isEmpty(inputValueErrorMsg.value)) return;

      emit('input-value-changed', inputValue.value)

      emit('grid-row-selection-changed', gridSelectedRows.value)

      emit('btn-save-clicked', allItemsSelected.value)
    }

    /**
     * Handle click on save button.
     *
     * @return {void}
     */
    function handleBtnClearClicked(): void {
      // Validate input
      validateInput({ action: 'clear' })

      // Invalid
      if (!isEmpty(inputValueErrorMsg.value)) return;

      inputValue.value = null

      emit('input-value-changed', inputValue.value)

      emit('grid-row-selection-changed', gridSelectedRows.value)

      emit('btn-clear-clicked', allItemsSelected.value)
    }

    // *** END Buttons ***

    // *** Input Validation ***

    const inputValueErrorMsg: Ref<string> = ref('')

    /**
     * Validate payment terms target modal input 
     * 
     * @return {void}
     */
    function validateInput(options?: { action: "save" | "clear"; }): void {
      
      // No spend lines selected
      if (props.selectedTabIndex === 0 && gridDataLocalCopy.value.length > 1 && gridSelectedRows.value.length === 0) {
        inputValueErrorMsg.value = "Please select at least one spend line."
        return
      }
      
      // Init
      const { action } = options || {}

      if (action === 'save') {
        // Target value is required. null or number
        // Invalid target value
        if (isNullOrUndefined(inputValue.value)) {
          // ? - Translate
          inputValueErrorMsg.value = "Please enter a target value."
          return
        }

        // Target value should be greater than 0 and less or equal to 365
        if (inputValue.value! < 0 || inputValue.value! > 365) {
          // ? - Translate
          inputValueErrorMsg.value = "Target value should be greater or equal to 0 and less or equal to 365."
          return
        }
      }

      // Valid
      inputValueErrorMsg.value = ""
    }

    // *** END Validation ***

    return {
      gridDataLocalCopy,
      gridIsExpanded,
      gridToggleIsExpanded,
      handleBtnSaveClicked,
      handleGridRowSelectAllChanged,
      handleGridRowSelectionChanged,
      inputValue,
      inputValueErrorMsg,
      isEmpty,
      handleBtnClearClicked,
      gridHeight,
      disabledSaveNClearButton
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

/*** Resets ***/
label,
.form-group {
  margin-bottom: 0;
}

/*** END Resets ***/

/*** Customizations ***/

.btn-outlined {
  padding: 0 30px;
}

.card {
  padding: 0px 15px !important;
}

/*** END Customizations ***/
</style>