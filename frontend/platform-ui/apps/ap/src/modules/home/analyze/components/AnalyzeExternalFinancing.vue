<template>
<div class="col-12"><span class="font-weight-bold mb-4 text-capitalize my-4">{{ $t('home.analyze.groupsConfiguration.financingConfiguration') }}</span>
  <div class="row">
    <div class="col-12 groups-title-header custom-titles-table">
      <div class="row">
        <div class="col-3 text-center d-flex justify-content-center align-items-center"><span>{{ $t('home.analyze.groupsConfiguration.fundingSpread') }} (%)</span></div>
        <div class="col">
          <div class="row">
            <div class="col-3 text-center d-flex justify-content-center align-items-center"><span>{{ $t('home.analyze.groupsConfiguration.nameProgram') }}</span></div>
            <div class="col-3 text-center d-flex justify-content-center align-items-center"><span>{{ $t('home.analyze.groupsConfiguration.baseRate') }} (%)</span>
              <CalculumInfoButton class="ml-2" :infoText="$t('home.analyze.groupsConfiguration.baseRateTooltip')" :size="15"></CalculumInfoButton>
            </div>
            <div class="col-3 text-center d-flex justify-content-center align-items-center"><span>{{ $t('home.analyze.groupsConfiguration.spread') }} (%)</span>
              <CalculumInfoButton class="ml-2" :infoText="$t('home.analyze.groupsConfiguration.baseRateTooltip')" :size="15"></CalculumInfoButton>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-12" :class="!fromCreate ? 'financing-groups' : ''">
      <CalculumLoading v-if="loading" block="block"></CalculumLoading>
      <div class="row drag-row d-flex align-items-center mb-3" v-for="(group, FinanceGroupIndex) in groups" :class="{ 'custom_row_hover': isMouseHoveringOverDragIcon }" :draggable="isMouseHoveringOverDragIcon" @dragstart="startDrag($event, group)" @drop="onDrop($event, FinanceGroupIndex)" @dragenter.prevent @dragover.prevent>
        <div class="col-3 d-flex align-items-center">
          <div class="col-1">
            <iconDragDrop class="icon_drag_drop mr-2" @mouseover="hoveringOverIcon" @mouseleave="notHoveringOverIcon"></iconDragDrop>
          </div>
          <div class="col">
            <button class="buttons_groups_analyze" :style="'background: ' + group.color + '; color: ' + formatData.colorText(group.color) + ';'" draggable="true">{{ group.name }}</button>
          </div>
        </div>
        <div class="col">
          <div class="row">
            <div class="col-3 d-flex align-items-start flex-column">
              <input class="form-control" data-testid="fName" type="text" :maxlength="15" v-model="group.financingName" :disabled="disabledButtonSpendFileInrecalculation" @blur="normalizeNames(null, null)" @input="validateValue(FinanceGroupIndex, 'name')" placeholder="" :class="{ 'input-red-border': group.errorFinancingName }"/><span class="error text-left errors-name" v-if="group.errorFinancingName">{{ group.errorFinancingName }}</span>
            </div>
            <div class="col-3 d-flex align-items-start flex-column">
              <div class="row">
                <div class="col-lg-4">
                  <div class="form-check d-flex align-items-center" style="height: 100%;">
                    <input class="k-checkbox k-checkbox-md k-rounded-md" type="checkbox" data-testid="fAutoBaseRate" v-model="group.isAutoBaseRate" :disabled="disabledButtonSpendFileInrecalculation" @change="validateValue(FinanceGroupIndex, 'isAutoBaseRate')"/>
                    <label class="k-checkbox-label ml-1 mb-0">{{ 'Auto' }}</label>
                  </div>
                </div>
                <div class="col-lg-8">
                  <input class="form-control inputNumberRight" data-testid="fBaseRatePresentation" type="text" v-model="group.baseRatePresentation" @click="group.baseRatePresentation = group.baseRate ? parseFloat(group.baseRate).toFixed(2) : '', ($event.target as HTMLInputElement)?.select()" @blur="normalizeNames('baseRate', FinanceGroupIndex)" @input="validateValue(FinanceGroupIndex, 'baseRate')" :placeholder="group.isAutoBaseRate ? '' : '%'" :disabled="group.isAutoBaseRate || disabledButtonSpendFileInrecalculation" :class="{ 'input-red-border': group.errorBaseRate }"/>
                </div>
              </div><span class="error text-left errors-base-rate" v-if="group.errorBaseRate">{{ group.errorBaseRate }} </span><span class="error text-left errors-funding-spread" v-if="group.errorZeroValues">{{ group.errorZeroValues }}</span>
            </div>
            <div class="col-4 d-flex align-items-start gap-1">
              <div class="d-flex flex-column" :style="'width: 80%'">
                <input class="form-control mr-3 inputNumberRight" data-testid="fFundingSpreadPresentation" type="text" v-model="group.fundingSpreadPresentation" @click="group.fundingSpreadPresentation = group.fundingSpread ? parseFloat(group.fundingSpread).toFixed(2) : '', ($event.target as HTMLInputElement)?.select()" @blur="normalizeNames('fundingSpread', FinanceGroupIndex)" placeholder="%" @input="validateValue(FinanceGroupIndex, 'fundingSpread')" :disabled="disabledButtonSpendFileInrecalculation" :class="{ 'input-red-border': group.errorFundingSpread }"/><span class="error text-left errors-funding-spread" v-if="group.errorFundingSpread">{{ group.errorFundingSpread }}</span>
              </div>
            </div>
            <div class="col-2">
              <div class="d-flex align-items-center end-justify-content">
                <div class="d-flex text-sm mr-2 badge-for-recalculating-status" v-if="group.financingRules && group.financingRules.length === 0"><span class="px-2 py-1 rounded-xl truncate ml-auto rules-in-financing-groups">{{ $t('global.applyToAll') }}</span></div>
                <div class="d-flex align-items-center mr-2">
                  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                    <div class="open-options cursor-pointer button add_rule" data-testid="fAddRule" @click="disabledButtonSpendFileInrecalculation ? null : toggleRuleFilterModal(group,FinanceGroupIndex)" :title="$t('global.applyRules')">
                      <ChooseColumns :title="$t('global.applyRules')"></ChooseColumns>
                    </div>
                  </Tooltip>
                </div>
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <div class="d-flex align-items-center max-h-10 open-options cursor-pointer" v-if="!automate" :title="$t('global.deleteGroup')">
                    <iconTrash class="icons cursor-pointer icon-trash" @click="disabledButtonSpendFileInrecalculation ? null : deleteGroup(group)" :title="$t('global.deleteGroup')"></iconTrash>
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 mt-2 mb-4" v-if="group.financingRules && group.financingRules.length > 0">
          <div class="d-flex flex-row-reverse align-items-center mt-3">
            <div class="d-flex align-items-center general-container-condition" v-for="(ruleObj, index) in group['financingRules']" :key="index">
              <div class="d-flex align-items-center level-category-container" :class="BadgeRelated.computeLevelClass(ruleObj)"><span>{{ BadgeRelated.computeLevel(ruleObj) }}</span></div>
              <BadgeContainer :ruleObj="ruleObj" :index="index" @edit-item="(itemObj: any) => editConditions(itemObj, group, index, FinanceGroupIndex)" @remove-item="(itemObj: any, index: any) => removeItem(itemObj, index, group)"></BadgeContainer>
            </div>
          </div>
        </div>
      </div>
      <div class="row mt-4">
        <div class="col-4">
          <button class="btn btn-clean font-md w-100" id="addbutton" style="width: 200px" :disabled="disabledButtonSpendFileInrecalculation" @click="addGroup()">{{ $t('home.analyze.groupsConfiguration.addGroup') }}</button>
        </div>
      </div>
      <div class="row my-4" v-if="hasErrorsComputed">
        <div class="col-12">
          <div class="error-bar"><span>{{ $t('home.homeCompanySettings.warnings.financingErrorNRules') }}</span></div>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-4"><span id="scrollhere">&nbsp;</span></div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang='ts'>
import { defineComponent, reactive, toRefs, watch, onMounted, computed } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'
import * as BadgeRelated from '@/utils/BadgeRelated'
import * as colorsGroups from '@/utils/ColorsGroups'
import * as formatData from '@/utils/FormatData'
import CalculumInfoButton from '@/modules/components/CalculumInfoButton.vue'
import { CalculumLoading } from '@ada/design-system'
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import iconDragDrop from '@/resources/assets/images/icons/iconDragDrop.vue'
import { AnalyzeExternalFinancing } from '@/modules/home/analyze/types/index'
import BadgeContainer from '@/modules/components/badge/BadgeContainer.vue'
import ChooseColumns from '@ada/design-system/assets/icons/iconCustomize.vue'
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import { useAnalyzeStore } from '@/stores/analyze'

export default defineComponent({
  name: 'AnalyzeExternalFinancing',
  components: { Tooltip, BadgeContainer, iconTrash, iconClose, iconDragDrop, CalculumLoading, CalculumInfoButton, ChooseColumns },
  props: {
    availableFilters: { type: Array, required: false },
    dataProgram: { type: Object, default: false },
    editedFinanceFilterObj: { type: Object, required: false },
    fromCreate: { type: Boolean, default: true },
    selectedProgramId: { type: String, default: false },
    groupsForList: { type: Array, required: false, default: () => [] },
    spendFileInrecalculation: { type: Boolean, required: false, default: false }
  },
  emits: ['groups', 'financingPending', 'update', 'loading:update', 'backGroups', 'showFilterRuleModal', 'updateChosenConditionFilter', 'save-and-recalculate', 'removed-condition', 'has-input-error', 'no-input-error'],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const externalFinancing = reactive<AnalyzeExternalFinancing>({
      automate: false,
      baseRateTypeItems: ['LIBOR', 'EURIBOR', 'MISC'],
      baseRateTypes: [],
      colors: ['4c8bf5', 'FF2C4F', 'F4B400', '0F9D58'],
      dragDropGroupIndex: 0,
      dragToSpecificIndex: 0,
      financeGroupIndex: 0,
      groupFinanceRulesIndex: 0,
      groups: [],
      groupsDeleted: [],
      groupsNumber: 1,
      hasErrors: false,
      isGroupItemCurrentlyDragged: false,
      isModalShowing: false,
      isMouseHoveringOverDragIcon: false,
      lenGroups: 0,
      loading: false,
      selectedDefaultColor: 0
    })

    function startDrag(event: any, group: any) {
      externalFinancing.isGroupItemCurrentlyDragged = true
      event.dataTransfer.dropEffect = 'move'
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('groupFinancingName', group.name)
      externalFinancing.dragDropGroupIndex = externalFinancing.groups.indexOf(group)
    }

    const moveInArray = function (arr: any, from: any, to: any) {
      const item = arr.splice(from, 1)
      arr.splice(to, 0, item[0])
      normalizeNames(null, null)
    }

    function notHoveringOverIcon() {
      externalFinancing.isMouseHoveringOverDragIcon = false
    }

    function hoveringOverIcon() {
      externalFinancing.isMouseHoveringOverDragIcon = true
    }

    function onDrop(event: any, index: any) {
      externalFinancing.isGroupItemCurrentlyDragged = false
      externalFinancing.dragToSpecificIndex = index
      moveInArray(externalFinancing.groups, externalFinancing.dragDropGroupIndex, externalFinancing.dragToSpecificIndex)
    }

    function parseData() {
      for (const row of externalFinancing.groups) {
        row.periodInMonths = 12
      }
      emit('backGroups', externalFinancing.groups, externalFinancing.groupsDeleted)
    }


    watch(() => props.editedFinanceFilterObj, () => {
      addEditedCondtionsToFinanceGroup(props.editedFinanceFilterObj)
    })

    function editConditions(ruleObj: any, group: any, index: number, financeGroupIndex: number) {

      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }

      externalFinancing.financeGroupIndex = financeGroupIndex
      externalFinancing.groupFinanceRulesIndex = index
      emit('updateChosenConditionFilter', ruleObj)
    }

    function addEditedCondtionsToFinanceGroup(editedObj: any) {
      externalFinancing.groups[externalFinancing.financeGroupIndex].financingRules[externalFinancing.groupFinanceRulesIndex] = editedObj
      emit('backGroups', externalFinancing.groups, externalFinancing.groupsDeleted)
    }

    function addGroup() {
      let tempGroupValue = externalFinancing.groups.length + 1
      while (!searchGroupName(tempGroupValue)) {
        tempGroupValue++
      }

      externalFinancing.groups.push(
        {
          name: 'F' + tempGroupValue + ', 0%',
          financingName: '',
          baseRateType: 'EURIBOR',
          baseRate: null,
          baseRatePresentation: '',
          fundingSpread: null,
          fundingSpreadPresentation: '',
          isAutoBaseRate: true,
          color: getColor(),
          financingRules: [],
          modified: false
        }
      )

      const el = document.getElementById('scrollhere')

      if (el) { el.scrollIntoView({ behavior: 'smooth' }) }

      normalizeNames(null, null)
      validateValue(externalFinancing.groups.length - 1,'')
    }

    function removeItem(item: any, index: any, group: any) {

      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }

      externalFinancing.groups.forEach(function (item: any) {
        if (item === group) {
          group.financingRules.splice(index, 1)
        }
      })
      emit('backGroups', externalFinancing.groups, externalFinancing.groupsDeleted)
      emit('removed-condition')
      emit('backGroups', externalFinancing.groups, externalFinancing.groupsDeleted)
    }

    function sortByPriority(myarray: any) {
      myarray = myarray.sort((a: any, b: any) => a.priority - b.priority)
      return myarray
    }

    function validateGroups() {
      // Iterate through each group
      for (let FinanceGroupIndex = 0; FinanceGroupIndex < externalFinancing.groups.length; FinanceGroupIndex++) {
        // Validate each field for the current group
        validateValue(FinanceGroupIndex, 'name');
        validateValue(FinanceGroupIndex, 'baseRate');
        validateValue(FinanceGroupIndex, 'fundingSpread');
        validateValue(FinanceGroupIndex, 'isAutoBaseRate');
      }
    }

    function getSetup() {
      if (props.selectedProgramId) {

        externalFinancing.groups = [...props.groupsForList]
        validateGroups()
        emit('backGroups', externalFinancing.groups, externalFinancing.groupsDeleted, false, true)
      } else {
        const dataSetup = useAnalyzeStore().getSetupProgram as any
        if (dataSetup && dataSetup.externalFinancingEnabled && dataSetup.financingGroups) {
          externalFinancing.groups = dataSetup.financingGroups
          externalFinancing.selectedDefaultColor = dataSetup.financingGroups.length
          externalFinancing.lenGroups = dataSetup.financingGroups.length
          emit('backGroups', externalFinancing.groups)
        }
      }
    }

    function normalizeNames(field: string | null, indexGroup: number | null) {
      externalFinancing.selectedDefaultColor = 0
      externalFinancing.groups.forEach(function (group, index) {
        const name = group.financingName ? group.financingName : ''

        if (field === 'baseRate' && index === indexGroup) {
          group.baseRate = parseFloat(group.baseRatePresentation === '' ? 0 : group.baseRatePresentation)
          group.baseRate = isNaN(group.baseRate) ? 0 : group.baseRate
          group.baseRatePresentation = group.baseRate === '' ? '' : formatData.getNumberWithDecimals(group.baseRate, 2)
        }

        if (field === 'fundingSpread' && index === indexGroup) {
          group.fundingSpread = parseFloat(group.fundingSpreadPresentation === '' ? 0 : group.fundingSpreadPresentation)
          group.fundingSpread = isNaN(group.fundingSpread) ? 0 : group.fundingSpread
          group.fundingSpreadPresentation = group.fundingSpread === '' ? '' : formatData.getNumberWithDecimals(group.fundingSpread, 2)
        }

        const getsum = group.isAutoBaseRate === true ? parseFloat(group.fundingSpread).toFixed(2) : (parseFloat(group.baseRate) + parseFloat(group.fundingSpread)).toFixed(2)

        if (group.isAutoBaseRate === true && getsum === 'NaN' || getsum === null || getsum === '') {
          group.name = 'F' + (index + 1) + ', Base + ' + ' ' + name
        }
        else if (group.isAutoBaseRate === true && getsum !== 'NaN') {
          group.name = 'F' + (index + 1) + ', Base + ' + getsum + '%' + ', ' + name
        }

        else if (group.isAutoBaseRate === false && getsum === 'NaN' || getsum === null || getsum === '') {
          group.name = 'F' + (index + 1) + ', 0%' + ', ' + name
        } else {
          group.name = 'F' + (index + 1) + ', ' + getsum + '%' + ', ' + name
        }
        group.color = getColor()
      })
      parseData()
    }

    function deleteGroup(group: any) {
      const index = externalFinancing.groups.indexOf(group)

      if ('@id' in group) {
        externalFinancing.groupsDeleted.push(group)
        externalFinancing.groups.splice(index, 1)
      } else {
        externalFinancing.groups.splice(index, 1)
      }

      if (externalFinancing.groups.length <= 0) {
        externalFinancing.selectedDefaultColor = 0
      }

      normalizeNames(null, null)

      emit('backGroups', externalFinancing.groups, externalFinancing.groupsDeleted, true)
    }

    function getColor() {
      if (externalFinancing.selectedDefaultColor < 3) {
        externalFinancing.selectedDefaultColor++
      } else {
        externalFinancing.selectedDefaultColor = 0
      }

      if (externalFinancing.selectedDefaultColor === 1) {
        return colorsGroups.firstGroup
      }
      if (externalFinancing.selectedDefaultColor === 2) {
        return colorsGroups.secondGroup
      }
      if (externalFinancing.selectedDefaultColor === 3) {
        return colorsGroups.thirdGroup
      }
      if (externalFinancing.selectedDefaultColor === 0) {
        return colorsGroups.fourthGroup
      }
    }

    function searchGroupName(tempGroupValue: number) {
      const tempGroupName = 'F' + (tempGroupValue)

      let result = true

      externalFinancing.groups.forEach(function (groupData) {
        if (groupData.name.substr(0, tempGroupName.length) === tempGroupName) {
          result = false
        }
      })
      return result
    }


    function toggleRuleFilterModal(group: any, financeGroupIndex: number) {
      externalFinancing.financeGroupIndex = financeGroupIndex
      externalFinancing.groupFinanceRulesIndex = group.financingRules ? group.financingRules.length : 0
      emit('showFilterRuleModal', group)
    }


    onMounted(() => {
      getSetup()
    })

    const externalFinancingGroupsComputed = computed(() => {
      return externalFinancing.groups
    })

    const disabledButtonSpendFileInrecalculation = computed(() => {
      return props.spendFileInrecalculation
    })


    function validateValue(FinanceGroupIndex: number, fieldType: string) {
      const group = externalFinancing.groups[FinanceGroupIndex];

      if (fieldType === 'fundingSpread') {
        if (group.fundingSpreadPresentation === '') {
          group.fundingSpreadPresentation = 0
          group.fundingSpread = 0
        }
      }

      if (fieldType === 'baseRate') {
        if (group.baseRatePresentation === '') {
          group.baseRatePresentation = 0
          group.baseRate = 0
        }
      }


        if ((Number(group.fundingSpreadPresentation) === 0 && group.fundingSpreadPresentation !== "") && (Number(group.baseRatePresentation) === 0) && group.baseRatePresentation !== "") {
          group.errorZeroValues = translate.t("global.alertFinancing")        
        } else {
          delete group.errorZeroValues
        }

     
        if (group.financingName === null || group.financingName === '') {
          group.errorFinancingName = translate.t("global.errors.financingName");          
        } else {
          group.errorFinancingName = '';          
        }
      

        handleAutoBaseRateChange(FinanceGroupIndex);
        normalizeNames('isAutoBaseRate', FinanceGroupIndex)
      
        if (
          group.fundingSpreadPresentation === null ||
          group.fundingSpreadPresentation === '' ||
          isNaN(group.fundingSpreadPresentation) ||
          (Number(group.fundingSpreadPresentation) < 0 || Number(group.fundingSpreadPresentation) > 100)
        ) {
          group.errorFundingSpread = translate.t("global.errors.fundingSpread");          
        } else {
          group.errorFundingSpread = '';          
        }
      
      checkAndEmitNoInputError()
      // Set the 'modified' flag to true when the user interacts with the input
      group.modified = false;
    }


    const handleAutoBaseRateChange = (groupIndex: number) => {
      const group = externalFinancing.groups[groupIndex];

      if (group.isAutoBaseRate) {
        group.errorBaseRate = '';
        group.baseRatePresentation = '';
        group.baseRate = null;        
      } else {
        if (
          group.baseRatePresentation === null ||
          group.baseRatePresentation === '' ||
          isNaN(group.baseRatePresentation) ||
          (Number(group.baseRatePresentation) < 0 || Number(group.baseRatePresentation) > 100)
        ) {
          group.errorBaseRate = translate.t("global.errors.baseRate");
        } else {
          group.errorBaseRate = '';
          checkAndEmitNoInputError();
        }
      }
    }

    const hasErrorsComputed = computed(() => {
      return !checkAndEmitNoInputError();
    });

    function checkAndEmitNoInputError() {
      const allGroupsValid = externalFinancing.groups.every(group => {
        return (
          group.errorFinancingName === '' &&
          (group.errorBaseRate === '' || group.errorBaseRate === undefined) &&
          group.errorFundingSpread === ''
        );
      });

      if (allGroupsValid) {
        emit('no-input-error');        
        return true;  // All inputs are valid
      } else {
        emit('has-input-error');
        return false; // Some inputs have errors
      }
    }


    return {
      ...toRefs(externalFinancing),
      addEditedCondtionsToFinanceGroup,
      addGroup,
      BadgeRelated,      
      deleteGroup,
      editConditions,
      externalFinancingGroupsComputed,
      formatData,
      hasErrorsComputed,
      hoveringOverIcon,
      moveInArray,
      normalizeNames,
      notHoveringOverIcon,
      onDrop,
      removeItem,
      sortByPriority,
      startDrag,
      toggleRuleFilterModal,
      Tooltip,
      validateValue, disabledButtonSpendFileInrecalculation
    }
  }
})
</script>
<style lang='scss' scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/typography";
@import "src/resources/assets/styles/variables/globals";

input[type=number]::-webkit-textfield-decoration-container {
  flex-direction: row-reverse;
}

.btn_financing {
  font-size: $font-button;
  text-transform: capitalize;
  border-radius: $border__radius;
  color: $button-color;
  text-align: center;
}

button.add_rule {
  border-radius: 8px;
  outline: none;
  border: none;
  width: 116px;
  height: 48px;
  font-size: 1vh;
  font-weight: 500;
  background: transparent;

  &:hover {
    color: $gray500;
    background: $gray-modern-500;
  }

  .active {
    background: $gray-modern-500;
  }
}

button.delete {
  border-radius: 8px;
  height: 48px;
  width: 53px;
  border: none;
  background: transparent;

  &:hover {
    background: $gray-modern-500;
  }
}

.row {
  transition: all 0.5s ease-in-out;
}

.divider {
  height: 41px;
  width: 1px;
  border-right: 1px solid $modern-gray-200;
}

.inputNumberRight {
  text-align: right;
}

.content_financing {
  padding: 0px 0px 0px 0px;
  align-items: center;
  justify-content: center;
}

.marginColumns {
  margin-left: 120px;
}

.content_financing_title {
  border: 1px solid $color-gray-light;
  display: flex;
  align-items: center;
  margin-top: $margin__bootstrap;
  margin-bottom: $margin__bootstrap;
  text-align: center;
  font-size: $font-md;
  height: $margin * 3 - 5;
  justify-content: center;
}

.marginTitle {
  @media (max-width: 1480px) {
    padding-left: 35px;
  }
}

.marginTitle2 {
  @media (max-width: 1480px) {
    padding-left: 35px;
  }
}

.marginTitle3 {
  padding-right: 40px;

  @media (max-width: 1480px) {
    padding-right: 40px;
  }
}

.show-scroll_financing {
  overflow-x: hidden;
  min-width: 900px;

  &::-webkit-scrollbar {
    width: $margin__bootstrap;
    background-color: $body-bg;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: $scrollbar-thumb;
    border: 4px solid $body-bg;
  }

  &--x {
    overflow-x: scroll;
  }

  &--auto {
    overflow: scroll;
    height: 60vh;
  }
}

.custom-titles-table {
  margin-bottom: 10px;
  padding: 10px
}

.col-12.financing-groups {
  overflow-x: hidden !important;
}

select.form-control,
input.form-control {
  height: 40px !important;
}

.remove_icon {
  color: $gray400;
  width: 15px;
  height: 15px;

  &:hover {
    cursor: pointer;
  }
}

.trash_icon {
  height: 24px;
  width: 24px;
}

.error-bar {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--primary-300, #FFA3B3);
  background: var(--error-50, #FEF3F2);

  span {
    color: var(--error-600, #D92D20);
    font-family: "Inter var", sans-serif;
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
  }
}

.input-red-border {
  border-color: $color-error-500;
}

span.error {
  margin-top: 5px;
  color: $color-error-500;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}
</style>
