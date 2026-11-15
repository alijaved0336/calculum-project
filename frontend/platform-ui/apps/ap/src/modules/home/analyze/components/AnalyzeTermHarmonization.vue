<template>
<div class="col-12">
  <CalculumLoading v-if="loading" block="block"></CalculumLoading><span class="font-weight-bold mb-4 text-capitalize my-4">{{ $t('home.analyze.groupsConfiguration.termConfiguration') }}</span>
  <div class="row" style="overflow: hidden">
    <div class="col-4 pr-0 left-side">
      <div class="d-flex justify-content-start font-weight-bold mt-2" v-if="fromCreate"><span class="title-item d-flex">{{ $t('home.analyze.groupsConfiguration.levelHarmonization') }}
          <CalculumInfoButton class="ml-2" :infoText="$t('home.analyze.groupsConfiguration.levelHarmonizationTooltip')" :size="15"></CalculumInfoButton></span></div>
      <div class="d-flex mt-2" v-if="fromCreate">
        <div class="col"><a class="btn font-md" @click="changeLevel('spend')" :class="harmonizationLevel === 'spend' ? 'btn-levels' : 'btn-clean'">{{ $t('home.analyze.groupsConfiguration.levelBtnSpend') }}</a></div>
        <div class="col"><a class="btn font-md" @click="changeLevel('supplier')" :class="harmonizationLevel === 'supplier' ? 'btn-levels' : 'btn-clean'">{{ $t('home.analyze.groupsConfiguration.levelBtnSupplier') }}</a></div>
        <div class="col"><a class="btn font-md" @click="changeLevel('parent')" :class="harmonizationLevel === 'parent' ? 'btn-levels' : 'btn-clean'">{{ $t('global.parent') }}</a></div>
      </div>
      <div class="d-flex nt-3">
        <div class="col-12 pl-0">
          <div class="d-flex justify-content-start flex-column">
            <div class="row align-items-center my-3">
              <div class="col-6"><span class="d-flex align-items-center">{{ $t('home.analyze.groupsConfiguration.rounding') }}
                  <CalculumInfoButton class="ml-2" :infoText="$t('home.analyze.groupsConfiguration.roundingTooltip')" :size="15"></CalculumInfoButton></span></div>
              <div class="col-6">
                <select class="form-control" v-model="rounding" style="min-height: 3rem" :disabled="disabledButtonSpendFileInrecalculation" @change="sendEmit">
                  <option v-for="item in roundingTypes.sort((a, b) => a.code.localeCompare(b.code))" :value="item.key">{{ $t(`home.analyze.groupsConfiguration.${item.code}`) }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-8 f-flex flex-column right-side">
      <div class="d-flex mb-4 pl-3">
        <div class="col-12">
          <div class="row">
            <div class="col-12 h-100 groups-title-header d-flex">
              <div class="col-4 text-center d-flex justify-content-center align-items-center"><span>{{ $t('home.analyze.groupsConfiguration.harmonizationGroup') }}</span></div>
              <div class="col-6 text-center d-flex justify-content-center align-items-center"><span>{{ $t('home.analyze.groupsConfiguration.paymentTermsWithoutCashDiscount') }}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="d-flex flex-column w-100 group-list-container pl-3">
        <div class="col-12">
          <div class="row mb-2" v-for="(gr, idx) in groups">
            <div class="col-4 p-0">
              <button class="buttons_groups_analyze" :style="'background: '+gr.color+'; color: '+formatData.colorText(gr.color)+';'">{{ gr.name }}</button>
            </div>
            <div class="col-8">
              <div class="row">
                <div class="col-12 h-100 d-flex">
                  <div class="col-9 d-flex aling-items-start flex-column">
                    <input class="form-control inputNumberRight" v-model="gr.paymentTermsWithoutCashDiscountDays" @change="normalizeNames(false)" :key="idx" type="number" min="0" @input="validateValue(idx)" :disabled="disabledButtonSpendFileInrecalculation" :class="{ 'input-red-border': gr.errorharmonizationDays }"/><span class="error text-left errors-harmonization-days" v-if="gr.errorharmonizationDays">{{ gr.errorharmonizationDays }}</span>
                  </div>
                  <div class="col-3 d-flex pr-0 justify-content-center">
                    <div class="btn-action-with-icon" v-if="!automate" @click="disabledButtonSpendFileInrecalculation ? null : deleteGroup(gr)" :class="{'no-hover': disabledButtonSpendFileInrecalculation}">
                      <svg class="mt-2" viewBox="0 0 16 16" transform="matrix(1.6,0,0,1.6,0,0)" style="margin-right: 5px; margin-left: 4.5px">
                        <path d="M10,2.942a.75.75,0,0,0-.75-.75H7.562a.25.25,0,0,1-.245-.2,2.381,2.381,0,0,0-4.675,0,.251.251,0,0,1-.245.2H.75a.75.75,0,0,0,0,1.5H1a.25.25,0,0,1,.25.25v4.5a1.5,1.5,0,0,0,1.5,1.5h4.5a1.5,1.5,0,0,0,1.5-1.5v-4.5A.25.25,0,0,1,9,3.692h.25A.75.75,0,0,0,10,2.942ZM4.979,1.312A1.108,1.108,0,0,1,5.9,1.8a.254.254,0,0,1,.015.259.25.25,0,0,1-.221.133H4.269A.25.25,0,0,1,4.063,1.8,1.1,1.1,0,0,1,4.979,1.312ZM4.125,7.688a.625.625,0,0,1-1.25,0v-2.5a.625.625,0,1,1,1.25,0Zm3,0a.625.625,0,0,1-1.25,0v-2.5a.625.625,0,1,1,1.25,0Z"></path>
                      </svg><span>{{ $t('button.delete') }}</span>
                    </div>
                  </div>
                  <div class="col-3 d-flex pr-0 justify-content-center"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-4 p-0">
              <button class="btn btn-clean font-md w-100" @click="addGroup()" :disabled="disabledButtonSpendFileInrecalculation">{{ $t('home.analyze.groupsConfiguration.addGroup') }}</button>
            </div>
          </div>
          <div class="row my-4" v-if="hasErrors">
            <div class="col-12">
              <div class="error-bar"> <span>{{ $t('home.homeCompanySettings.warnings.financingError') }}    </span></div>
            </div>
          </div>
          <div class="row" :class="!fromCreate ? 'mb-5' : ''">
            <div class="col-4"><span id="scrollhere">&nbsp;</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang='ts'>
import { defineComponent, reactive, toRefs, onMounted, computed } from 'vue'
import { harmonizationDefaults } from '../data/hamonizations'
import { useAnalyzeStore } from '@/stores/analyze'
import * as colorsGroups from '@/utils/ColorsGroups'
import * as formatData from '@/utils/FormatData'
import CalculumInfoButton from '@/modules/components/CalculumInfoButton.vue'
import { CalculumLoading } from '@ada/design-system'
import { useI18n } from 'vue-i18n'
import { HarmonizationView } from '@/modules/home/analyze/types/index'

export default defineComponent({
  name: 'HarmonizationView',
  components: { CalculumInfoButton, CalculumLoading },
  props: {
    selectedProgramId: { type: String, required: false, default: '' },
    dataProgram: { type: Object, required: false, default: () => { } },
    fromCreate: { type: Boolean, required: false, default: false },
    editHarmonizationLevelText: { type: String, required: false, default: '' },
    groupsForList: { type: Array, required: false, default: () => [] },
    spendFileInrecalculation: { type: Boolean, required: false, default: false }
  },
  emits: ['backGroups', 'save-and-recalculate', 'has-input-error', 'no-input-error'],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const data = reactive<HarmonizationView>({
      activatAutomate: false,
      automate: false,
      basedOn: '',
      basedOnTypes: [{ code: 'actualPaymentTerms', key: 'A' }, { code: 'contractualPaymentTerms', key: 'C' }, { code: 'proposedPaymentTerms', key: 'P' }],
      colors: ['4c8bf5', 'FF2C4F', 'F4B400', '0F9D58'],
      editHarmonizationLevelTextValue: '',
      groups: [],
      groupsDeleted: [],
      groupsNumber: 10,
      groupsNumberValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      hasErrors: false,
      harmonizationLevel: 'spend',
      lenGroups: 0,
      loading: false,
      multiple: 15,
      multipleValues: [1, 5, 10, 15, 20],
      rounding: 'N', // N: Nearest, U: Up, D: Down
      roundingTypes: [{ code: 'toTheNearestGroup', key: 'N' }, { code: 'alwaysUp', key: 'U' }, { code: 'alwaysDown', key: 'D' }],
      selectedDefaultColor: 0
    })

    const disabledButtonSpendFileInrecalculation = computed(() => {
      return props.spendFileInrecalculation
    })

    function valueHasChanged(str: any) {
      emit('save-and-recalculate')
    }

    function changeAutomate() {
      if (props.selectedProgramId) {
        data.basedOn = props.dataProgram.automateHarmonizationBasedOn
      } else {
        if (data.activatAutomate) {
          data.basedOn = 'P'
        } else {
          data.basedOn = 'P'
          data.groups = []
        }
      }
      sendEmit()
    }

    function parseData() {
      for (const row of data.groups) {
        row.cashDiscount = parseInt(row.cashDiscount)
        row.paymentTermsWithoutCashDiscountDays = parseInt(row.paymentTermsWithoutCashDiscountDays)
        row.paymentTermsWithCashDiscountDays = parseInt(row.paymentTermsWithCashDiscountDays)
      }

      sendEmit()
    }

    function getSetup() {
      if (props.selectedProgramId) {
        /** Exists a program and the user is in edition harmonization */
        data.basedOn = props.dataProgram.automateHarmonizationBasedOn ? props.dataProgram.automateHarmonizationBasedOn : data.basedOn
        data.multiple = props.dataProgram.automateHarmonizationMultiplier ? props.dataProgram.automateHarmonizationMultiplier : data.multiple
        data.groupsNumber = props.dataProgram.automateHarmonizationNumGroups ? props.dataProgram.automateHarmonizationNumGroups : data.groupsNumber
        data.rounding = props.dataProgram.automateHarmonizationRoundOn ? props.dataProgram.automateHarmonizationRoundOn : data.rounding
        data.activatAutomate = props.dataProgram.automateHarmonizationTerms
        
        if (props.groupsForList.length === 0){
          data.groups = harmonizationDefaults
        } else {
          data.groups = [...props.groupsForList]
          normalizeNames(false)
        }
        sendEmit()
      } else {
        /** This is for the wizard creation and the user navigate one step back and return in harmonization step  */
        const dataSetup = analyzeStore.getSetupProgram as any
        
        if (dataSetup && dataSetup.termHarmonizationEnabled) {
          data.rounding = dataSetup.roundOn ? dataSetup.roundOn : data.rounding
          data.activatAutomate = dataSetup.automateHarmonizationTerms ? dataSetup.automateHarmonizationTerms : data.activatAutomate
          data.groupsNumber = dataSetup.maxNumOfGroups ? dataSetup.maxNumOfGroups : data.groupsNumber
          data.basedOn = dataSetup.basedOn ? dataSetup.basedOn : data.basedOn
          data.multiple = dataSetup.multiplier ? dataSetup.multiplier : data.multiple
          data.groups = dataSetup.harmonizationGroups ?? []
          data.selectedDefaultColor = dataSetup.harmonizationGroups ? dataSetup.harmonizationGroups.length : 0
        }
        else {
          /** This is for the wizard creation and first time the user be in harmonization screen  */
          data.groups = harmonizationDefaults
        }
        normalizeNames(false)
      }
    }

    function sendEmit() {
      emit('backGroups',
        data.groups,
        data.basedOn,
        data.activatAutomate,
        data.groupsNumber,
        data.multiple,
        data.rounding,
        data.groupsDeleted,
        data.harmonizationLevel)
    }

    function addGroup() {
      const el = document.getElementById('scrollhere')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
      normalizeNames(true)
    }

    function deleteGroup(group: any) {
      const index = data.groups.indexOf(group)
      if ('@id' in group) {
        data.groupsDeleted.push(group)
        data.groups.splice(index, 1)
      } else {
        data.groups.splice(index, 1)
      }
      if (data.groups.length <= 0) {
        data.selectedDefaultColor = 0
      }
      // sendEmit()
      normalizeNames(false)
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

    function normalizeNames(addGroup: any) {
      data.selectedDefaultColor = 0

      data.groups.sort(
        (a: any, b: any) => a.paymentTermsWithoutCashDiscountDays - b.paymentTermsWithoutCashDiscountDays
      ).forEach((group: any, index: any) => {
        if (isNaN(group.paymentTermsWithoutCashDiscountDays)
          || group.paymentTermsWithoutCashDiscountDays === null
          || group.paymentTermsWithoutCashDiscountDays === ''
        ) {
          group.name = 'H' + (index + 1)
        } else {
          group.name = 'H' + (index + 1) + ', ' + group.paymentTermsWithoutCashDiscountDays + 'D'
        }
        group.color = getColor()
      })

      if (addGroup) {
        const tempGroupValue = data.groups.length + 1

        data.groups.push({
          name: 'H' + tempGroupValue,
          customName: false,
          paymentTermsWithCashDiscountDays: '',
          paymentTermsWithoutCashDiscountDays: '',
          cashDiscount: '',
          color: getColor()
        })
      }

      parseData()
    }

    function changeLevel(level: string) {
      data.harmonizationLevel = level

      sendEmit()
    }


    /*** On Mounted */
    onMounted(() => {
      getSetup()

      data.editHarmonizationLevelTextValue = props.editHarmonizationLevelText !== '' ? props.editHarmonizationLevelText : 'spend'

      changeLevel(data.editHarmonizationLevelTextValue)
    })

    function validateValue(harmonizationGroupIndex: number) {
      const group = data.groups[harmonizationGroupIndex];

      if (
        group.paymentTermsWithoutCashDiscountDays === null ||
        group.paymentTermsWithoutCashDiscountDays === '' ||
        isNaN(group.paymentTermsWithoutCashDiscountDays) ||
        (Number(group.paymentTermsWithoutCashDiscountDays) < 0 || Number(group.paymentTermsWithoutCashDiscountDays) > 365)
      ) {
        group.errorharmonizationDays = translate.t("global.errors.harmonizationDays");
        emit('has-input-error', true);
        data.hasErrors = true;
      } else {
        // Clear the error when the input is valid
        group.errorharmonizationDays = '';
        data.hasErrors = false;
        emit('no-input-error');
      }
    }

    const harmonizationHasErrorsComputed = computed(() => {
      return !checkAndEmitNoHarmonizationInputError();
    });

    function checkAndEmitNoHarmonizationInputError() {
      const allGroupsValid = data.groups.every(group => {
        return (
          group.paymentTermsWithoutCashDiscountDays === '' ||
          isNaN(group.paymentTermsWithoutCashDiscountDays) ||
          (Number(group.paymentTermsWithoutCashDiscountDays) >= 0 && Number(group.paymentTermsWithoutCashDiscountDays) <= 365)
        );
      });

      if (allGroupsValid) {
        emit('no-input-error');
        return true;  // All inputs are valid
      } else {
        return false; // Some inputs have errors
      }
    }


    return {
      ...toRefs(data),
      addGroup,
      changeAutomate,
      changeLevel,
      deleteGroup,
      formatData,
      normalizeNames,
      sendEmit,
      harmonizationHasErrorsComputed,
      validateValue,
      valueHasChanged,
      disabledButtonSpendFileInrecalculation
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

.group-list-container {
  border-left: 1px solid $color-black;
}

input.form-control::placeholder {
  text-align: right !important;
}

.inputNumberRight {
  text-align: right;
  height: 40px !important;
}

.btn_harmonization {
  font-size: $font-button;
  text-transform: capitalize;
  border-radius: $border__radius;
  color: $button-color;
  text-align: center;
}

.analyze-term-harmonization-title-proposed {
  border: 1px solid $color-black;
  border-radius: 5px;
  min-height: 20rem;
  background: lightgrey;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analyze-term-harmonization-title-proposed p {
  font-weight: bolder;
}

.alertMessage {
  color: rgb(15, 157, 88);
  border-color: rgb(15, 157, 88);
}

@media screen and (max-width: 1440px) {

  .left-side,
  .right-side {
    flex: 0 0 100%;
    max-width: 100%;

    .group-list-container {
      border-left: none;
    }
  }
}

.harmonization-groups {
  height: 19rem !important;
  overflow-y: scroll !important;
  overflow-x: hidden !important;
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
