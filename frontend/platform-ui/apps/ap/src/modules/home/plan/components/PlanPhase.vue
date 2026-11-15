<template>
<div class="w-100">
  <teleport to="body">
    <CalculumModal :size="'md'" :showClose="true" :title="$t('home.plan.programToPlan2.confirm')" @close="hideConfirmModal" :zIndex="true" v-if="showConfirmChangesModal">
      <template v-slot:modalContent>
        <p>{{ $t('home.plan.programToPlan2.confirmMessage') }}</p>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="hideConfirmModal" style="z-index: 1; width: fit-content"><span>{{ $t('button.cancel') }}</span></button>
        <button class="btn outline-secondary-btn font-md" @click="onClickCancelButton" style="z-index: 1; width: fit-content"> <span>{{ $t('button.discardChanges') }}</span></button>
        <button class="btn btn-primary font-md" @click="submitPlanPhase" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.save') }}      </span></button>
      </template>
    </CalculumModal>
    <CalculumModal :title="$t('global.noEntitiesSelected.title')" :size="'lg'" showClose="showClose" zIndex="zIndex" @close="isShowNoEntitiesSelectedModal = !isShowNoEntitiesSelectedModal" v-if="isShowNoEntitiesSelectedModal">
      <template v-slot:modalContent>
        <p class="modal_msg">{{ $t('global.noEntitiesSelected.message') }}</p>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="isShowNoEntitiesSelectedModal = !isShowNoEntitiesSelectedModal" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
        <button class="btn btn-primary font-md" :disabled="loadingSuppliers" style="z-index: 1; width: fit-content;" @click="continueWithoutEntitiesSelected"> <span>{{ $t('global.continue') }}    </span></button>
      </template>
    </CalculumModal>
    <CalculumModal :size="'xl'" :showClose="true" @close="checkCancelBTNForChanges">
      <template v-slot:modalContent>
        <div class="d-flex flex-column w-100" :class="{'mb-2': !someDateError}"><span class="text-gray-500 text-base font-semibold">{{ $t('home.plan.planPhaseSingleDimension.setupNEdit') }}
            <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="'plan-setup-n-edit'" :keyPopOver="'planSetupNEdit'"></CalculumTooltipIcon></span><span class="text-gray-500 text-2xl font-semibold">
            <div class="d-flex align-items-center"><span style="white-space: nowrap;">{{ `${$t('home.plan.planPhase.phase')} ${newPhase ? phasesCount ? phasesCount + 1 : 1 : number}` }}</span></div></span></div>
        <div class="row d-flex">
          <div class="col-xl-4 col-lg-12" v-if="newPhase || ( phaseAditional && !phaseAditional.isRest )"><span class="text-xs font-normal text-gray-400" v-if="someDateError">&nbsp;</span>
            <div class="form-group">
              <label>
                <input class="form-control change-name" v-model="phaseName" @keyup="validationName" type="text" :placeholder="$t('home.plan.addPhaseName')"/><span>{{ $t('global.name') }} </span>
              </label>
            </div>
          </div>
          <div class="col-xl-8 col-lg-12">
            <div class="row d-flex">
              <div class="col-xl-3 col-lg-6 col-md-6"><span class="text-xs font-normal text-gray-400" v-if="someDateError">{{ `Plan Start Date: ${formatData.getMonthDayAndYear(planStartDate)}`   }}</span>
                <div class="form-group">
                  <label>
                    <input class="form-control" type="date" v-model="startDate" :min="minDate" :max="maxDate" @change="normalizeDates(true)"/><span>{{ $t('home.plan.planPhase.dateFrom') }}</span>
                  </label>
                </div>
              </div>
              <div class="col-xl-3 col-lg-6 col-md-6"><span class="text-xs font-normal text-gray-400" v-if="someDateError">&nbsp;</span>
                <div class="form-group">
                  <label for="selectPeriod">
                    <select class="form-control required" id="selectPeriod" name="selectPeriod" v-model="selectPeriod" @change="changeSelectPeriod($event.target.value)">
                      <option :value="0" selected="selected">{{ $t('home.plan.programToPlan1.manual') }}</option>
                      <option v-for="period in calendarPeriods" :value="period.value">{{ period.title }}</option>
                    </select><span>{{ $t('home.plan.programToPlan1.calendarPeriod') }}</span>
                  </label>
                </div>
              </div>
              <div class="col-xl-3 col-lg-6 col-md-6"><span class="text-xs font-normal text-gray-400" v-if="someDateError">{{ `Plan End Date: ${formatData.getMonthDayAndYear(planEndDate)}`   }}</span>
                <div class="form-group">
                  <label>
                    <input class="form-control" type="date" v-model="endDate" :min="minDate" :max="maxDate" @change="normalizeDates(false)"/><span>{{ $t('home.plan.planPhase.dateTo') }}</span>
                  </label>
                </div>
              </div>
              <div class="col-xl-3 col-lg-6 col-md-6"><span class="text-xs font-normal text-gray-400" v-if="someDateError">{{ `Plan period in Days: ${planPeriod}` }}</span>
                <div class="form-group">
                  <label for="period">
                    <input class="form-control" id="period" type="text" name="period" placeholder="Enter the period in days" v-model="differenceBetweenDateInDays"/><span>{{ $t('home.plan.programToPlan1.period') }}</span>
                  </label>
                </div>
              </div>
              <div class="col-12 show-error" v-if="someDateError"><span class="error text-left errors-days">{{ $t('home.plan.errors.globalDateError') }}</span></div>
            </div>
          </div>
        </div>
        <div class="row relative">
          <CalculumLoading v-if="loadingSuppliers" :modal="true"></CalculumLoading>
          <div class="col-12" :class="{ 'bg-blur': loadingSuppliers }"><span class="mb-3" v-if="selectedGlobalItems.length === 0">{{ $t('home.plan.planPhase.youCanAddSpends') }} </span><span class="mb-3" v-else>{{ $t('home.plan.planPhase.spendsInThisPhase') }} {{ selectedGlobalItems.length }} </span>
            <PlanPhaseTable class="m-0 p-0 mt-2" :planId="planId" :phaseId="planPhaseId" :isRest="phaseAditional ? phaseAditional.isRest : null" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" @sendArraysWithDataToPhase="sendArraysWithDataToPhase"></PlanPhaseTable>
          </div>
        </div>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="checkCancelBTNForChanges" :disabled="loadingSuppliers" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }}</span></button>
        <button class="btn btn-primary font-md" @click="submitPlanPhase" :disabled="enableButton || loadingSuppliers || someDateError" style="z-index: 1; width: fit-content"> <span class="saveBtn">{{ $t('global.save') }}</span></button>
      </template>
    </CalculumModal>
  </teleport>
</div>
</template>
<script>
import { computed, defineComponent, reactive, toRefs, watch, onMounted, ref } from 'vue'

import { removeIRI } from "@/utils";
import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { usePlanStore } from '@/stores/plan'
import * as formatData from '@/utils/FormatData'
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import DateUtils from '@/utils/DateUtils'
import PlanPhaseTable from '@/modules/home/plan/components/PlanPhaseTable.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import useSpendFile from "@/composables/useSpendFile";
import { useToast } from "vue-toastification";
import useApolloClient from "@/services/graphql/useApolloClient";
import { useAppStore } from '@/stores/app'

export default defineComponent({
  name: 'PlanPhaseEdit',
  components: {
    CalculumLoading,
    CalculumModal,
    CalculumTooltipIcon,
    PlanPhaseTable,
    Tooltip
  },
  props: {
    inputEndDate: { type: String, required: false, default: '' },
    inputStartDate: { type: String, required: false, default: '' },
    maxDate: { type: String, required: true },
    minDate: { type: String, required: true },
    name: { type: String, required: false, default: null },
    newPhase: { type: Boolean, required: true },
    number: { type: Number, required: true },
    period: { type: Number, required: false, default: 0 },
    phaseAditional: { type: Object, required: true },
    phasesCount: { type: Number, required: false, default: 0 },
    planData: { type: Object, required: true },
    planId: { type: String, required: true },
    planPhaseId: { type: String, required: false, default: '' },
    recomendStartDate: { type: String, default: '' },
    showConfirmModal: { type: Boolean, defaul: false },
    upgradeable: { type: Boolean, required: true },
    programInrecalculating: { type: Boolean, required: false, default: false },
    blockPlanOptions: { type: Boolean, required: false, default: false },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false },
    vCardEnabled: { type: Boolean, required: false, default: false},
    planStartDate: { type: String, required: false, default: '' },
    planEndDate: { type: String, required: false, default: '' },
    planPeriod: { type: Number, required: false, default: 0 },
  },
  emits: [
    'getPlanData',
    'reload-phases',
    'close-modal'
  ],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const store = useGlobalFiltersStore()
    const globalFiltersStore = useGlobalFiltersStore()
    const planStore = usePlanStore()
    const toast = useToast();
    const { apolloClientResetStore, isResetting } = useApolloClient();

    let currencyRate = useAppStore().getCurrencyAmount;

    const {
      spendFileVersionActiveId
    } = useSpendFile()


    const availablePeriods = ref([
      { title: translate.t('home.plan.programToPlan1.oneWeek'), value: 7 },
      { title: translate.t('home.plan.programToPlan1.twoWeeks'), value: 14 },
      { title: translate.t('home.plan.programToPlan1.threeWeeks'), value: 21 },
      { title: translate.t('home.plan.programToPlan1.oneMonth'), value: 30 },
      { title: translate.t('home.plan.programToPlan1.twoMonths'), value: 60 },
      { title: translate.t('home.plan.programToPlan1.oneQuarter'), value: 90 },
      { title: translate.t('home.plan.programToPlan1.threeQuarters'), value: 270 },
      { title: translate.t('home.plan.programToPlan1.halfeYear'), value: 182 },
      { title: translate.t('home.plan.programToPlan1.oneYear'), value: 365 }
    ])

    const data = reactive({
      calendarPeriods: availablePeriods.value,
      clickedContinueWithoutEntitiesSelected: false,
      endDate: props.newPhase
        ? DateUtils.formatYYYYMMDD(DateUtils.addDays(props.recomendStartDate, 1))
        : props.inputStartDate?.length > 0
          ? props.inputEndDate.substr(0, 10)
          : null,
      editable: props.planPhaseId === '',
      generatedPhaseId: '',
      initialDays: 0,
      initialEndData: null,
      initialName: '',
      initialStartDate: null,
      isShowNoEntitiesSelectedModal: false,
      loadingSuppliers: false,
      phaseName: props.name ? props.name : '',
      selectPeriod: getPeriodToDropdown(),
      showConfirmChangesModal: false,
      startDate: props.newPhase
        ? props.recomendStartDate
        : props.inputStartDate?.length > 0
          ? props.inputStartDate?.substr(0, 10)
          : null,
      currentRemoved: [],
      newItems: [],
      withChanges: false,
      selectedGlobalItems: [],
      levelOfGrid: '',
      withChangesGrid: false,
      filterForPatch: [],
      allChecked: false,
      someDateError: false
    })


    function getPeriodToDropdown() {
      const getPeriod = availablePeriods.value.find((x) => x.value === props.period)
      return getPeriod ? props.period : 0
    }


    /**
     * on Mounted
     */
    onMounted(() => {

      if (!props.newPhase) {
        data.initialStartDate = data.startDate
        data.initialEndData = data.endDate
        data.initialDays = DateUtils.diffInDays(data.startDate, data.endDate)
        data.initialName = props.name ? props.name : ''
      } else {
        data.initialDays = 0
        normalizeDates(false)
      }
    })

    function normalizeDates(isChangedStartDate = false) {
      if (isChangedStartDate && data.selectPeriod) {
        data.endDate = DateUtils.formatYYYYMMDD(DateUtils.addDays(data.startDate, data.selectPeriod))
      } else {
        // Calculate the difference in days
        const daysDifference = DateUtils.diffInDays(data.startDate, data.endDate);
        //data.selectPeriod = 0
        data.selectedPeriod = daysDifference
      }
      if (data.startDate !== null && data.endDate !== null) {
        if (DateUtils.isAfter(data.startDate, data.endDate)) {
          data.endDate = data.startDate
        }
        if (data.startDate === data.endDate) {
          data.endDate = DateUtils.formatYYYYMMDD(DateUtils.addDays(data.endDate, 1))
        }
        if (data.initialStartDate != data.startDate || data.initialEndData != data.endDate) {
          data.withChanges = true
        } else {
          data.withChanges = false
        }
      }

      validatePhaseDates()
    }

    
    function validatePhaseDates() {
    
      if (props.planStartDate && data.startDate) {
        const planStart = new Date(props.planStartDate)
        const phaseStart = new Date(data.startDate)
        
        if (phaseStart < planStart) {
          data.someDateError = true
          return false
        }
      }
    
      if (props.planEndDate && data.endDate) {
        const planEnd = new Date(props.planEndDate)
        const phaseEnd = new Date(data.endDate)
        
        if (phaseEnd > planEnd) {
          data.someDateError = true
          return false
        }
      }
      data.someDateError = false
      return true
    }



    function changeSelectPeriod(days) {
      // Convert days to number to ensure proper calculation
      const daysNumber = parseInt(days, 10)
      
      if (data.startDate && daysNumber !== 0) {
        data.endDate = DateUtils.formatYYYYMMDD(DateUtils.addDays(data.startDate, daysNumber))
        if (differenceBetweenDateInDays.value === 0) {
          data.disabledButton = true
          data.withChanges = false
          return false
        }

        if (differenceBetweenDateInDays.value !== data.initialDays) {
          data.disabledButton = false
          data.withChanges = true
        } else {
          data.disabledButton = true
          data.withChanges = false
        }
      }

      validatePhaseDates()
    }


    function validationName() {
      if (data.phaseName !== data.initialName) {
        data.withChanges = true
      } else {
        data.withChanges = false
      }
    }


    const differenceBetweenDateInDays = computed(() => {
      if (!data.startDate || !data.endDate) return 0
      return DateUtils.diffInDays(data.startDate, data.endDate)
    })

    watch(differenceBetweenDateInDays, (newDifference) => {
      if (data.startDate && data.endDate) {
        data.selectedPeriod = newDifference
      }
    })


    /**
     * Create Plan Phase
     */
    function createPlanPhase() {
      if (data.startDate === null || data.endDate === null) {
        toast.error(translate.t('home.plan.planPhase.selectRange'))
        return
      }

      data.loadingSuppliers = true
      const params = {
        planId: props.planId,
        startDate: data.startDate,
        endDate: data.endDate,
        name: data.phaseName,
        period: calculateDifferenceBetweenDates(),
        callbackSuccess: (callbackSuccessData) => {
          data.clickedContinueWithoutEntitiesSelected = false          
          data.generatedPhaseId = callbackSuccessData['@id']
          postSpendConfiguration()
        },
        callbackError: (callbackErrorResponse) => {

          if (callbackErrorResponse.data.violations) {
            toast.error(callbackErrorResponse.data.violations[0].message)
          } else {
            toast.error("ERROR creating plan phase")
          }

          data.clickedContinueWithoutEntitiesSelected = false
          data.loadingSuppliers = false         
        }
      }
      planStore.postPlanPhase(params)
    }

    function showModalEdit() {
      data.newItems = []
      data.currentRemoved = []
      data.withChanges = false
      data.editable = true
    }

    async function onClickCancelButton() {
      await apolloClientResetStore();
      if (!isResetting.value) {
        emit("reload-phases");
        emit("close-modal");
        data.editable = false;
      }
    }

    function calculateDifferenceBetweenDates() {
      if (data.startDate !== null || data.endDate !== null) {
        return DateUtils.diffInDays(data.startDate, data.endDate)
      }
      else {
        return 0
      }
    }

    function patchPlanPhase() {

      if (data.startDate === null || data.endDate === null) {
        toast.error(translate.t('home.plan.planPhase.selectRange'))
        return
      }

      data.loadingSuppliers = true
      const params = {
        planPhaseId: props.planPhaseId,
        startDate: data.startDate,
        endDate: data.endDate,
        name: data.phaseName,
        period: calculateDifferenceBetweenDates(),
        callbackSuccess: (callbackSuccessData) => {          
          if (callbackSuccessData.isRest) {
            data.editable = false
            emit('getPlanData')
          } else {
            postSpendConfiguration()
          }
        },
        callbackError: (error) => {
          if (error.data.violations) {
            toast.error(error.data.violations[0].message)
          } else {
            toast.error("ERROR updating plan phase")
          }

          data.loadingSuppliers = false
          
        }
      }
      planStore.patchPlanPhase(params)
    }

    async function postSpendConfiguration() {
      await apolloClientResetStore();
      if (!isResetting.value) {
        let planPhaseId = props.planPhaseId
        if (planPhaseId.length === 0) {
          planPhaseId = data.generatedPhaseId
        }

        let filters = {
          telerikFilter: formatData.convertFiltersToREST(data.filterForPatch),
          targetPhaseUuid: removeIRI(planPhaseId),
          globalFilter: formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied),
          currencyRate,
          targetSpendFileVersionUuid: spendFileVersionActiveId.value
        }

        const params = {
          planId: props.planId,
          phaseId: removeIRI(planPhaseId),
          added: data.allChecked ? null : data.newItems,
          removed: data.allChecked ? null : data.currentRemoved,
          level: data.levelOfGrid,
          filters,
          all: data.allChecked,
          callbackSuccess: (callbackSuccessData) => {
            data.editable = false
            data.loadingSuppliers = false
            emit('getPlanData')
          },
          callbackError: () => {
            data.loadingSuppliers = false
            toast.error("ERROR updating data")
          }
        }
        planStore.postSpendsByPlanAndPhase(params)
      }
    }

    function submitPlanPhase() {
      if (data.selectedGlobalItems.length === 0) {
        data.isShowNoEntitiesSelectedModal = true
      } else {
        data.showConfirmChangesModal = false
        data.loadingSuppliers = true
        props.planPhaseId.length === 0 ? createPlanPhase() : patchPlanPhase()
      }
    }


    function checkCancelBTNForChanges() {
      if (props.planPhaseId.length === 0) {
        onClickCancelButton()
      }
      else if (!enableButton.value) {
        data.showConfirmChangesModal = true
      } else {
        onClickCancelButton()
      }
    }

    function hideConfirmModal() {
      data.showConfirmChangesModal = false
    }

    function continueWithoutEntitiesSelected() {
      data.showConfirmChangesModal = false
      data.clickedContinueWithoutEntitiesSelected = true
      data.isShowNoEntitiesSelectedModal = false
      data.loadingSuppliers = true
      props.planPhaseId.length === 0 ? createPlanPhase() : patchPlanPhase()
    }



    watch(
      () => props.inputStartDate,
      (newValue) => {
        if (newValue.length > 0) data.startDate = newValue.substr(0, 10)
      }
    )

    watch(
      () => props.inputEndDate,
      (newValue) => {
        if (newValue.length > 0) data.endDate = newValue.substr(0, 10)
      }
    )

    watch(
      () => data.phaseName,
      (newValue) => {
        if (newValue.length > 25) {
          toast.error(translate.t('home.plan.planPhase.phaseNameMaxCharacters'))
          data.phaseName = data.phaseName.slice(0, 25)
        }
      }
    )

    watch(
      () => props.showConfirmModal,
      () => {
        data.showConfirmChangesModal = props.showConfirmModal
      }
    )

    const enableButton = computed(() => {

      if (data.withChangesGrid || data.withChanges) {
        return false
      }
      return true


    })

    function sendArraysWithDataToPhase(newsItems, currentRemoved, onChanges, selected, level, filtersGrid, allSelected) {

      data.newItems = newsItems
      data.currentRemoved = currentRemoved
      data.withChangesGrid = onChanges
      data.selectedGlobalItems = selected
      data.filterForPatch = filtersGrid
      data.allChecked = allSelected
      switch (level) {
        case 0:
          data.levelOfGrid = 'spends'
          break;
        case 1:
          data.levelOfGrid = 'suppliers'
          break;
        case 2:
          data.levelOfGrid = 'parents'
          break;
      }
    }


    return {
      ...toRefs(data),      
      changeSelectPeriod,
      checkCancelBTNForChanges,
      continueWithoutEntitiesSelected,
      createPlanPhase,
      differenceBetweenDateInDays,
      enableButton,
      formatData,
      hideConfirmModal,
      normalizeDates,
      onClickCancelButton,
      postSpendConfiguration,
      sendArraysWithDataToPhase,
      showModalEdit,
      submitPlanPhase,
      validationName,
      isResetting,
    }
  }
})
</script>
<style lang="scss" scoped>
.show-error {
  margin-top: -2vh;
}
</style>