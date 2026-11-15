<template>
  <div class="options-edit d-flex flex-column">
    <div class="tohide">
      <GridColumnMenuSort :column="column" :sortable="sortable" :sort="sort" @closemenu="closeMenu" />
    </div>

    <!-- Harmonization Groups -->
    <span v-if="groupsHarm.length > 0 && hasHarmonization" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @mouseenter="showhideTooltip" @mouseleave="showhideTooltip">
      {{ $t("home.analyze.harmonizationGroups") }}
      <iconArrow class="arrow float-right" />
      <div class="level_harmonization_container">
        <ul class="list-options">
          <li class="option-level-2" @click="showHarmonizationModalFn('spend', null)">
            {{ $t("home.entityCard.negotiation.harmonizationLevelSpend") }}
          </li>
          <li class="option-level-2 divider" @click="showHarmonizationModalFn('supplier', null)">
            {{ $t("home.entityCard.negotiation.harmonizationLevelSupplier") }}
          </li>
          <li class="option-level-2 divider" @click="showHarmonizationModalFn('parent', null)">
            {{ $t("home.entityCard.negotiation.harmonizationLevelParent") }}
          </li>
          <li class="d-flex justify-content-between option-level-2"
            @click="$emit('grid-add-group', null, 'harmonizationGroup', null)">
            <span class="remove_group_main cursor-pointer d-flex align-items-center">{{
              $t("home.entityCard.negotiation.removeLevel") }}</span>
            <iconTrash class="trash_icon" />
          </li>
        </ul>
      </div>
    </span>
    <!-- Move Spend between plan phases -->
    <span v-if="allowMoveBetween && modulePlanIsAvailable" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @mouseenter="showhideTooltipMoveBetween" @mouseleave="showhideTooltipMoveBetween">
      {{ $t("home.analyze.moveBetween") }}
      <iconArrow class="arrow float-right" />
      <div  v-if="showMoveBetween" class="popover-tree">
         <ul >
          <li> 
            <CalculumTreeSelect v-if="moveToPhaseData.length>0" :items="moveToPhaseData" @select="showMoveBetweenModalFn" @remove-plan="showRemovePlanModalFn"/>
           <span v-else class="popover-tree-empty-data">{{ $t('home.analyze.moveBetweenPlanPhasesEmptyList') }} </span>
           </li>
        </ul> 
      </div>
    </span>

    <!-- Vcard groups-->
    <span v-if="groupsVcard.length > 0 && hasVcard" id="set-vcard-span"
      class="option-edit tooltip-main-options options-cell" :size="'large'" :fill-mode="'outline'"
      @mouseenter="showhideTooltip" @mouseleave="showhideTooltip">
      {{ $t("global.vCardGroups") }}
      <iconArrow class="arrow float-right" />
      <div class="level_financing_container">
        <ul class="list-options">
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-1">
            <span class="term_group_title">{{
              $t("home.entityCard.negotiation.termGroup")
            }}</span>
          </li>
          <li v-for="(groupV, index) in groupsVcard" :key="groupV.vCardName"
            class="financing_group_container option-level-1">
            <button :id="'group-v-card-' + index" class="buttons_group_item" :style="'--color: ' +
              formatData.colorText(groupV.color) +
              '; color: ' +
              formatData.colorText(groupV.color) +
              '; background: ' +
              groupV.color
              " @click="$emit('grid-add-vgroup', groupV['id'])">
              {{ groupV.vCardName }}
            </button>
          </li>
          <li v-if="removeGroup"
            class="d-flex term_group_section option-level-1 justify-content-between remove-v-card-group"
            @click="$emit('grid-add-group', null, 'vCard', null)">
            <span class="remove_group_main d-flex align-items-center cursor-pointer">
              {{ $t("home.entityCard.negotiation.removeGroup") }}
            </span>
            <iconTrash class="trash_icon" />
          </li>
        </ul>
      </div>
    </span>

    <!-- Financing Groups -->
    <span v-if="groupsFinan.length > 0 && hasFinancing" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @mouseenter="showhideTooltip" @mouseleave="showhideTooltip">
      {{ $t("home.analyze.financingGroups") }}
      <iconArrow class="arrow float-right" />
      <div class="level_financing_container">
        <ul class="list-options">
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-1">
            <span class="term_group_title">{{
              $t("home.entityCard.negotiation.termGroup")
            }}</span>
          </li>
          <li v-for="groupF in groupsFinan" :key="groupF.name" class="financing_group_container option-level-1">
            <button class="buttons_group_item" :style="'--color: ' +
              formatData.colorText(groupF.color) +
              '; color: ' +
              formatData.colorText(groupF.color) +
              '; background: ' +
              groupF.color
              " @click="$emit('grid-add-group', groupF['@id'], 'financingGroup')">
              {{ groupF.name }}
            </button>
          </li>
          <li v-if="removeGroup" class="d-flex term_group_section option-level-1 justify-content-between"
            @click="$emit('grid-add-group', null, 'financingGroup', null)">
            <span class="remove_group_main d-flex align-items-center cursor-pointer">
              {{ $t("home.entityCard.negotiation.removeGroup") }}
            </span>
            <iconTrash class="trash_icon" />
          </li>
        </ul>
      </div>
    </span>

    <!-- SET TARGET BULK -->
    <span class="option-edit tooltip-main-options options-cell" :size="'large'" :fill-mode="'outline'"
      @mouseenter="showhideTooltip" @mouseleave="showhideTooltip">
      <!-- Menu Label -->
      <span id="set-target-span">{{ $t("global.setTarget") }}</span>

      <!-- Sub Menu Arrow -->
      <iconArrow class="arrow float-right" />

      <!-- Sub Menu Items -->
      <div class="target_values_container">
        <div class="row mt-2"></div>
        <label class="label-topbar ml-3" for="target">{{
          $t("global.targetEqualTo")
        }}</label>
        <ul class="list-options">
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-1">
            <div class="d-flex align-items-center">
              <input id="actualPaymentTerms-target" :key="'actualPaymentTerms'"
                v-model="setTargetTypeControllerModel.value" type="radio" :name="$t('global.setTargetOptions.actualPaymentTerms')"
                :value="'actualPaymentTerms'" class="radio-btn mr-2 cursor-pointer" @change="
                  applyTargetModelValues(
                    'actualPaymentTerms',
                    'actualPaymentTerms'
                  )
                  " />
              <span class="font-weight-500">{{
                $t("global.setTargetOptions.actualPaymentTerms")
              }}</span>
            </div>
          </li>
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-1">
            <div class="d-flex align-items-center">
              <input id="contractualPaymentTerms-target" :key="'contractualPaymentTerms'"
                v-model="setTargetTypeControllerModel.value" type="radio" name="Contractual Payment Terms"
                :value="'contractualPaymentTerms'" class="radio-btn mr-2 cursor-pointer" @change="
                  applyTargetModelValues(
                    'contractualPaymentTerms',
                    'contractualPaymentTerms'
                  )
                  " />
              <span class="font-weight-500">{{
                $t("global.setTargetOptions.contractualPaymentTerms")
              }}</span>
            </div>
          </li>
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-1">
            <div class="d-flex align-items-center">
              <input id="paymentTermsOpportunity-target" :key="'paymentTermsOpportunity'"
                v-model="setTargetTypeControllerModel.value" type="radio" name="Payment Terms Opportunity"
                :value="'paymentTermsOpportunity'" class="radio-btn mr-2 cursor-pointer" @change="
                  applyTargetModelValues(
                    'paymentTermsOpportunity',
                    'paymentTermsOpportunity'
                  )
                  " />
              <span class="font-weight-500">{{
                $t("global.setTargetOptions.paymentTermsOpportunity")
              }}</span>
            </div>
          </li>
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-1">
            <div class="d-flex flex-column">
              <div class="d-flex align-items-center">
                <input id="custom-target" key="custom" v-model="setTargetTypeControllerModel.value" type="radio"
                  name="Custom" value="Custom" class="radio-btn mr-2 cursor-pointer"
                  @change="setTargetTypeControllerModel.key = 'custom'" />
                <span class="font-weight-500">{{
                  $t("global.setTargetOptions.custom")
                }}</span>
              </div>
            </div>
          </li>
        </ul>

        <!-- Custom Target INPUT -->
        <div class="row m-0 p-0">
          <div class="col-12 d-flex flex-column">
            <div class="form-group d-flex flex-column">
              <label for="custom-input-target">
                <input id="custom-input-target" v-model="setTargetValueControllerCustomModel" class="form-control w-100"
                  :disabled="setTargetTypeControllerModel.value !== 'Custom'" type="number" min="1" max="365"
                  @keyup="validateTargetValue" />
                <span>{{ $t("global.setTargetOptions.days") }}</span>
              </label>
              <div v-if="hasCustomTargetErrors" class="p-2 mt-0 mb-0">
                <span class="error">{{ $t("global.errors.errorDays") }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- END Custom Target INPUT -->

        <!-- BUTTONS-->
        <div class="row mb-4">
          <div class="d-flex button-container-for-target justify-content-center justify-content-end mb-1">
            <button id="clear-target-bulk-btn" class="btn outline-secondary-btn font-md"
              style="z-index: 1; width: fit-content" @click="resetValueForTargetBulk()">
              {{ $t("global.clear") }}
            </button>

            <button id="save-target-bulk-btn" :disabled="setTargetTypeControllerModel.value !== 'Custom' && (setTargetTypeControllerModel.value.length === 0 && setTargetTypeControllerModel.key.length === 0) ||
              setTargetTypeControllerModel.value === 'Custom' &&
              hasCustomTargetErrors
              " class="btn btn-primary font-md" style="z-index: 1; width: fit-content;" @click="
                showModalForTargetBulk(
                  setTargetTypeControllerModel.key,
                  setTargetTypeControllerModel.value !== 'Custom' ? setTargetTypeControllerModel.value : setTargetValueControllerCustomModel
                )
                ">
              {{ $t("global.save") }}
            </button>
          </div>
        </div> <!-- END BUTTONS-->

      </div>
    </span>

    <span v-if="showAdvancedOptions" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @click="showSupplierStandardFn">
      {{ $t("global.supplierStandard") }}
    </span>

    <span v-if="showAdvancedOptions" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @click="showPeerGroupStandard">
      {{ $t("global.peerGroupStandard") }}
    </span>

    <!-- Negotiation Status (Only visible for spends level) -->
    <span v-if="levelOfGrid === 'spends'" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @mouseenter="showhideTooltip" @mouseleave="showhideTooltip">
      <!-- Menu Label -->
      <span>{{ $t("global.updateStatus") }}</span>

      <!-- Sub Menu Arrow -->
      <iconArrow class="arrow float-right" />

      <!-- Sub Menu Items -->
      <div class="level_financing_container">
        <ul class="list-options">
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-2"
            @click="negotiationStatusOnChanged('contacted')">
            <span class="term_group_title">{{ $t("global.contacted") }}</span>
          </li>
          <li class="term_group_section d-flex align-items-baseline justify-content-between option-level-2"
            @click="negotiationStatusOnChanged('planned')">
            <span class="term_group_title">{{
              $t("global.nonContacted")
            }}</span>
          </li>
        </ul>
      </div>
    </span>

    <!-- Include / Exclude -->
    <span v-if="allowExclude" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @mouseenter="showhideTooltip" @mouseleave="showhideTooltip">
      {{ $t("home.analyze.includeExclude") }}
      <iconArrow class="arrow float-right" />
      <div class="level_financing_container">
        <ul class="list-options">
          <li class="financing_group_container option-level-1">
            <button class="categoryLevelBtn include_exclude-btn" @click="$emit('grid-exclude', false)">
              <span class="checkmark mr-2" />
              {{ $t("home.analyze.analyzeHeader.include") }}
            </button>
          </li>
          <li class="financing_group_container option-level-1">
            <button class="categoryLevelBtn include_exclude-btn" @click="$emit('grid-exclude', true)">
              <span class="crossout mr-2" />
              {{ $t("home.analyze.analyzeHeader.exclude") }}
            </button>
          </li>
        </ul>
      </div>
    </span>
    <!-- End of Include / Exclude -->
    <!-- Pilot Account only show for Parent Level-->
    <span v-if="showMenuPilotOption" class="option-edit tooltip-main-options options-cell" :size="'large'"
      :fill-mode="'outline'" @mouseenter="showhideTooltip" @mouseleave="showhideTooltip">
      {{ $t("home.analyze.pilotAccount") }}
      <iconArrow class="arrow float-right" />
      <div class="level_financing_container">
        <ul class="list-options">
          <li class="financing_group_container option-level-1">
            <button class="categoryLevelBtn include_exclude-btn pilot-account"
              @click="$emit('grid-include-pilot', true)">
              <span class="checkmark mr-2" />
              {{ $t("home.analyze.analyzeHeader.include") }}
            </button>
          </li>
          <li class="financing_group_container option-level-1">
            <button class="categoryLevelBtn include_exclude-btn pilot-account"
              @click="$emit('grid-include-pilot', false)">
              <span class="crossout mr-2" />
              {{ $t("home.analyze.analyzeHeader.exclude") }}
            </button>
          </li>
        </ul>
      </div>
    </span>
    <!-- End of Pilot Account-->



    <!-- Export PDF -->
    <span v-if="levelOfGrid !== 'spends' && (levelOfGrid !== 'suppliers' || useFeatureDownloadPdfEntity)" class="option-edit tooltip-main-options options-cell" :size="'large'" :fill-mode="'outline'" @mouseenter="showhideTooltip" @mouseleave="showhideTooltip" @click="showMultipleExportModalFn">
      {{ $t('global.exportPDF' + levelOfGrid) }}
    </span>
    <!-- END Export PDF -->


  </div>
</template>

<script lang="ts">
import { PropType, defineComponent, computed, reactive, toRefs, ref, inject } from 'vue'
import { useHomeStore } from '@/stores/home'
import { useAnalyzeStore } from '@/stores/analyze';
import * as formatData from '@/utils/FormatData'
import useUser from "@/services/user/composables/useUser";
import CalculumTreeSelect from "@/modules/components/tree/CalculumTreeSelect.vue";
// Icons
import iconArrow from '@/resources/assets/images/icons/iconArrow.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'

// Kendo
import { GridColumnMenuSort } from '@progress/kendo-vue-grid';

// Types
import type { NegotiationStatus } from '@/types'
import type { SortDescriptor } from '@progress/kendo-data-query'
import type { GridColumnMenuColumnProps } from '@progress/kendo-vue-grid/dist/npm/interfaces/GridColumnMenuColumnProps'
import useCompany from "@/composables/useCompany"
import { useUserStore } from '@/stores/user'
import { useAdminBackendStore } from '@/stores/adminBackend'
import { useModulePlan } from "@/composables";


export default defineComponent({
  name: 'ColumnMenuActions',
  components: {
    GridColumnMenuSort,
    iconArrow,
    iconTrash, CalculumTreeSelect
  },
  props: {
    allowExclude: { type: Boolean, default: false },
    adjustPilotAccount: { type: Boolean, default: false },
    column: { type: Object as PropType<GridColumnMenuColumnProps>, required: true },
    hasFinancing: { type: Boolean, default: false },
    hasHarmonization: { type: Boolean, default: false },
    levelOfGrid: { type: Object as PropType<'spends' | 'suppliers' | "parents">, default: 'spends' },
    removeGroup: { type: Boolean, required: false, default: true },
    allowMoveBetween: { type: Boolean, required: false, default: false },
    removeFromPlan: { type: Boolean, required: false, default: false },
    sort: { type: Object as PropType<SortDescriptor[]>, default: [] },
    sortable: { type: Boolean },
  },
  emits: [
    'closemenu',
    'grid-add-group',
    'grid-add-vgroup',
    'grid-approach',
    'grid-exclude',
    'grid-include-pilot',
    'grid-remove-group',
    'negotiation-status-changed',
    'negotiation-status-changed',
    'show-harmonization-modal',
    'show-peer-group-standard-modal',
    'show-supplier-standard-modal',
    'show-target-clear-modal',
    'show-target-modal-emit',
    'show-move-between-modal',
    'show-multiple-export-modal',
    'show-remove-plan-modal'
  ],
  setup(props, { emit }) {
    const homeStore = useHomeStore()
    const analyzeStore = useAnalyzeStore();
    const userStore = useUserStore()
    const adminBackendStore = useAdminBackendStore()

    const { usevCardGroupsEnabled } = useCompany()
    const { userIsSuperAdmin, isPilotAccount, useFeatureDownloadPdfEntity } = useUser()

    const {
      modulePlanIsAvailable,
    } = useModulePlan();


    interface TargetValues {
      setTargetTypeControllerModel: { key: string, value: string },
      setTargetValueControllerCustomModel: number,
      hasCustomTargetErrors: boolean
    }

    const targetValues = reactive<TargetValues>({
      setTargetTypeControllerModel: { key: 'paymentTermsOpportunity', value: 'paymentTermsOpportunity' },
      setTargetValueControllerCustomModel: 1,
      hasCustomTargetErrors: false
    })

    const groupsHarm = analyzeStore.getAllGroups.length > 0 ? analyzeStore.getAllGroups : []
    const groupsFinan = analyzeStore.getAllFinancing.length > 0 ? analyzeStore.getAllFinancing : []


    /**
     *  Vcard related
     */
    const hasVcard = computed(() => {
      return usevCardGroupsEnabled.value
    })
    const groupsVcard = computed(() => {
              return homeStore.getVCardGroups.length > 0 ? homeStore.getVCardGroups : []
    })

    const isSuperAdmin = computed(() => userStore.isSuperAdmin)
    const advancedMode = computed(() => adminBackendStore.getAdvancedModeStatus)

    const userIsSuperAdminComputed = computed(() => {
      return userIsSuperAdmin.value
    })

    const showAdvancedOptions = computed(() => {
      if (isSuperAdmin.value && props.levelOfGrid === 'suppliers' && advancedMode.value) {
        return true
      }
      return false
    })

    /**
     * Check if account is pilot
     */
    const isPilotAccountComputed = computed(() => {
      return isPilotAccount()
    })

    /**
     * Show menu for pilot account
     */
    const showMenuPilotOption = computed(() => {
      return userIsSuperAdminComputed.value && isPilotAccountComputed.value && props.adjustPilotAccount && (props.levelOfGrid === 'suppliers' || props.levelOfGrid === 'parents')
    })

    const showMoveBetween = ref(false) 
    const showhideTooltipMoveBetween = (e: any) => {
      if (e.currentTarget.classList.contains('active')) {
        e.currentTarget.classList.remove('active')        
      } else {
        const options: any | null = document.querySelectorAll('.options-cell')
        for (const element of options) {
          element.classList.remove('active')
        }
        e.currentTarget.classList.add('active')
      }
      if(e.type==='mouseenter') {
        showMoveBetween.value = true
      }else if(e.type==='mouseleave') {
        showMoveBetween.value = false
      }
    }
    const showhideTooltip = (e: any) => {
      if (e.currentTarget.classList.contains('active')) {
        e.currentTarget.classList.remove('active')
            } else {
        const options: any | null = document.querySelectorAll('.options-cell')
        for (const element of options) {
          element.classList.remove('active')
        }
        e.currentTarget.classList.add('active')
      }      
    }
    /***
     * validates the input for the custom input for target value
     */
    function validateTargetValue() {
      const value = Number(targetValues.setTargetValueControllerCustomModel);

      // Check if value is NaN or not a whole number, or out of range
      if (isNaN(value) || !Number.isInteger(value) || value < 0 || value > 365) {
        targetValues.hasCustomTargetErrors = true;
      } else {
        targetValues.hasCustomTargetErrors = false;
      }
    }

    function negotiationStatusOnChanged(negotiationStatus: NegotiationStatus) {
      emit('negotiation-status-changed', negotiationStatus)
    }

    function closeMenu() {
      emit('closemenu');
    }


    function hideColumMenu() {

      //* Simulate a click and hide the "options menu"
      const editPendilClass = document.querySelector('.filter-options .k-grid-header-menu');
      if (editPendilClass && editPendilClass instanceof HTMLElement) {
        editPendilClass.click();
      }
    }



    function resetValueForTargetBulk() {
      targetValues.hasCustomTargetErrors = false
      targetValues.setTargetValueControllerCustomModel = 0
      emit('show-target-clear-modal');
      hideColumMenu()

    }

    function applyTargetModelValues(key: string, value: string) {
      targetValues.setTargetTypeControllerModel.key = key
      targetValues.setTargetTypeControllerModel.value = value
    }

    function showModalForTargetBulk(key: string, value: string | number) {
      hideColumMenu()
      // Create the object with the required properties
      const myCurentTargetValue = {
        key: key,
        value: value,
      };
      emit("show-target-modal-emit", myCurentTargetValue);
    }


    function showSupplierStandardFn() {
      hideColumMenu()
      emit('show-supplier-standard-modal')

    }

    function showPeerGroupStandard() {
      hideColumMenu()
      emit('show-peer-group-standard-modal')

    }

    function showHarmonizationModalFn(level: any, value: any) {
      hideColumMenu()
      emit('show-harmonization-modal', level, value)
    }
    function showMoveBetweenModalFn(emitParamsFromCalculumTreeSelect:any) {
      hideColumMenu()
      emit('show-move-between-modal',emitParamsFromCalculumTreeSelect)
    }

    function showMultipleExportModalFn() {
      hideColumMenu()
      emit('show-multiple-export-modal')
    }


    const moveToPhaseData = inject('moveToPhaseDatas',[])
    return {
      ...toRefs(targetValues),
      modulePlanIsAvailable,
      useFeatureDownloadPdfEntity,
      applyTargetModelValues,
      closeMenu,
      formatData,
      groupsFinan,
      groupsHarm,
      groupsVcard,
      hasVcard,
      isPilotAccountComputed,
      negotiationStatusOnChanged,
      resetValueForTargetBulk,
      showAdvancedOptions,
      showHarmonizationModalFn,
      showhideTooltip,
      showMenuPilotOption,
      showModalForTargetBulk,
      showPeerGroupStandard,
      showSupplierStandardFn,
      userIsSuperAdminComputed,
      validateTargetValue,
      showMoveBetweenModalFn, moveToPhaseData, showMoveBetween,showhideTooltipMoveBetween, showMultipleExportModalFn
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.tohide {
  height: 0.5px;
  overflow: hidden;
}

.options-edit {
  width: auto;
  height: auto;
  background: #ffffff;
  border-radius: 10px;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);

  span.option-edit {
    font-style: normal;
    font-weight: 400;
    font-size: 16px !important;
    padding: 10px 14px;
    color: $color-gray-600;

    &:hover {
      color: $color-gray-900;
      background: $color-gray-50;
    }
  }
}

.moderate-btn {
  background: $color-success-50 !important;
  color: $color-success-500 !important;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.assertive-btn {
  background: $color-rose-50 !important;
  color: $color-rose-700 !important;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.conservative-btn {
  background: $color-orange-dark-50 !important;
  color: $color-orange-700 !important;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.approach_levels {
  display: none;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  width: 225px !important;
  top: 40px !important;
  left: 1px !important;
}

.arrow {
  width: 15px;
  height: 15px;
  transform: rotate(90deg);
  margin-top: 5px;
}

.tooltip-main-options {
  width: 100% !important;
  margin: 0px 0px;
  position: relative;
}

.analize-harmonization-all {
  width: 100% !important;
  margin: 0px 0px;
}

.analize-financing-all {
  width: 100% !important;
  margin: 0px 0px;
}

.analize-exclude-all {
  width: 100% !important;
  margin: 0px 0px;
}

.analize-approach-all {
  width: 100% !important;
  margin: 0px 0px;
}

button.btn.btn-icon.link--icon {
  width: 50px;
}

.categoryLevelBtn {
  background-color: transparent !important;
  width: 100% !important;
  outline: none !important;
  border: none !important;
  font-size: 16px !important;
  color: $color-gray-600;
  display: flex !important;
}

.divider {
  border-bottom: 1px solid #eaecf0 !important;
}

li.financing_group_container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.include_exclude-btn {
  align-items: center;
}

.level_financing_container {
  display: none;
  flex-direction: column;
  width: 296px;
  height: auto;
  background: #ffffff;
  border-radius: 10px;
  position: absolute;
  left: 14.9rem !important;
  top: 0 !important;
  z-index: 96;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);
}

.popover-tree {
  position: absolute;
  flex-direction: column;
  left: 14.9rem !important;
  top: 0 !important;
  background: #ffffff;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);
  z-index: 96;
  transition: all 0.3s ease-in;
  width: max-content;
}
.popover-tree-empty-data {
  min-height: max-content;
   min-width: max-content; 
   padding: 5px;
}

.target_values_container {
  display: none;
  flex-direction: column;
  width: 296px;
  height: auto;
  background: #ffffff;
  border-radius: 10px;
  position: absolute;
  left: 14.9rem !important;
  top: -50px;
  z-index: 96;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);

  .target-title {
    margin-top: 1rem;
  }
}

.level_harmonization_container {
  display: none;
  flex-direction: column;
  width: 139px;
  height: auto;
  background: #ffffff;
  border-radius: 10px;
  position: absolute;
  top: 0 !important;
  left: 14.9rem !important;
  z-index: 96;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);
}

.term_group_section {
  padding: 10px 14px;
}

ul.list-options {
  width: 100%;
  z-index: 90;

  li.option-level-1 {
    font-style: normal;
    font-weight: 400;
    font-size: 16px;
    margin: 12px 0px;
    padding: 0px 14px;
    color: $color-gray-600;
  }

  li.option-level-2 {
    font-style: normal;
    font-weight: 400;
    font-size: 16px;
    padding: 10px 14px;
    color: $color-gray-600;

    &:hover {
      color: $color-gray-900;
      background: $color-gray-50;
    }
  }

  li:first-child {
    &:hover {
      .spend_list_options {
        display: block;
      }
    }
  }
}

li.dynamic_badge_li {
  .dynamic_badge {
    background: $color-gray-100 !important;
    color: $color-gray-700 !important;
  }

  &:hover {
    .dynamic_badge {
      color: $color-gray-700 !important;
    }
  }
}

li.harmonization_group_container,
.dynamic_badge_li {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0px !important;
}

.red_text {
  color: $color-red !important;
}

.spend_list_options {
  display: none;
  position: absolute;
  width: 296px;
  height: auto;
  background: $color-white;
  border-radius: 10px;
  top: 1px;
  left: 8.7rem;
  z-index: 99;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);
}

.trash_icon {
  color: $color-gray-700;
}

.term_group_title {
  background: transparent !important;
  color: $color-gray-700;
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
}

.remove_group {
  background: transparent !important;
  color: $color-gray-500;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.remove_group_main {
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}

span.error {
  margin-top: 5px;
  color: $color-error-500;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}

.button-container-for-target {
  gap: 1rem;
}
</style>
