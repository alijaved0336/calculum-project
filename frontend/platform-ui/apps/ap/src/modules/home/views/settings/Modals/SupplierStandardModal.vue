<template>
<CalculumConfirmModal v-if="isConfirmCloseModalVisible" :show="isConfirmCloseModalVisible" @hide="isConfirmCloseModalVisible = false" @discard="resetConfig" @submit="handleSave" :isModalForSetupStrategiesShowing="true" :zIndex="true"></CalculumConfirmModal>
<CalculumModal @close="handleCancel" title="Supplier Standard 2.0" :size="'custom'" :showClose="true">
  <template #modalContent>
    <div class="supplier-standard-body">
      <div class="d-flex gap-5 mb-4">
        <div class="d-flex flex-column gap-2"><span class="d-block text-sm font-medium text-gray-700 mb-1">{{ $t('global.minOccurrences') }}          </span>
          <input class="form-control-thin" type="number" min="1" max="9999" v-model.number="supplierStandard.config.minOccurrences"/>
        </div>
        <div class="d-flex flex-column gap-2"><span class="d-block text-sm font-medium text-gray-700 mb-1">{{ $t('global.selectScope') }}</span>
          <div class="d-flex gap-2 flex-wrap">
            <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': supplierStandard.config.includeParentTerms }" @click="supplierStandard.config.includeParentTerms = !supplierStandard.config.includeParentTerms">Include Parent Terms         </button>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': supplierStandard.config.includeSisterTerms }" @click="supplierStandard.config.includeSisterTerms = !supplierStandard.config.includeSisterTerms">Include Sister Companies</button>
          </div>
          <div class="d-flex flex-column gap-2 boder-inputs" v-if="supplierStandard.config.includeSisterTerms">
            <div class="d-flex flex-column">
              <KRadioButton :name="'sisterCompanyInclusion'" :value="'include'" :checked="supplierStandard.config.sisterCompanyInclusion === 'include'" :label="`Always Include Sister Companies`" @change="handleSisterValues"></KRadioButton>
              <KRadioButton :name="'sisterCompanyInclusion'" :value="'only_if_no_match'" :checked="supplierStandard.config.sisterCompanyInclusion === 'only_if_no_match'" :label="`Only If Not Enough Occurrences`" @change="handleSisterValues"></KRadioButton>
              <KRadioButton :name="'sisterCompanyInclusion'" :value="'exclude'" :checked="supplierStandard.config.sisterCompanyInclusion === 'exclude'" :label="`Never Include Sister Companies`" @change="handleSisterValues"></KRadioButton>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column gap-2">
          <label class="d-block text-sm font-medium text-gray-700 mb-1">Adjustments</label>
          <div class="d-flex gap-2 flex-wrap">
            <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': supplierStandard.config.dsoAdjustmentEnabled }" @click="supplierStandard.config.dsoAdjustmentEnabled = !supplierStandard.config.dsoAdjustmentEnabled">DSO</button>
          </div>
          <div class="d-flex enabled-button">
            <input id="dso-fallback-enabled" class="k-checkbox k-checkbox-md k-rounded-md" type="checkbox" :checked="supplierStandard.config.dsoFallbackEnabled" @change="supplierStandard.config.dsoFallbackEnabled = !supplierStandard.config.dsoFallbackEnabled"/>
            <label for="dso-fallback-enabled" class="k-checkbox-label-regulatory text-sm">{{ 'Use DSO when nothing else is available' }}</label>
          </div>
        </div>
        <div class="d-flex flex-column gap-1">
          <label class="d-block text-sm font-medium text-gray-700 mb-1">Value to use in strategy</label>
          <div class="d-flex gap-2 flex-wrap">
            <button class="supplier-settings-pill" v-for="opt in VALUE_TO_USE_OPTIONS" :key="opt.value" :class="{ 'supplier-settings-pill--selected': supplierStandard.config.calculationMethod === opt.value }" @click="supplierStandard.config.calculationMethod = opt.value">{{ opt.label }}</button>
          </div>
        </div>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="text-sm font-medium text-gray-700">Combinations and Priority (Top to Bottom)</span>
        <div class="d-flex gap-2">
          <button class="btn outline-secondary-btn font-md" type="button" @click="sortByEnabledAttributes"><span>Sort by Enabled Attributes</span></button>
          <button class="btn outline-secondary-btn font-md" type="button" @click="restoreDefaults"><span>Restore to Defaults</span></button>
        </div>
      </div>
      <div class="supplier-settings-groups show-scroll">
        <div class="supplier-settings-card w-100 mb-2 gap-3" v-for="(group, index) in supplierStandard.config.combinationGroups" :key="group.priorityOrder" :class="getGroupClass(index)" :draggable="dragHandleHoveredIndex === index" @dragstart="startDrag($event, group, index)" @dragend="onDragEnd" @drop="onDrop($event, index)" @dragenter.prevent="onDragEnter(index)" @dragleave.prevent="onDragLeave" @dragover.prevent>
          <div class="supplier-settings-card-section d-flex align-items-center">
            <div class="ml-2" @mouseenter="dragHandleHoveredIndex = index" @mouseleave="dragHandleHoveredIndex = -1">
              <iconDragDrop class="icon_drag_drop">           </iconDragDrop>
            </div>
          </div>
          <div class="supplier-settings-card-section-container d-flex gap-2">
            <div class="supplier-settings-card-section d-flex">
              <div class="d-flex flex-column"><span class="d-block text-xs font-semibold text-gray-500 supplier-settings-card-section-label">Transaction</span>
                <div class="d-flex gap-2 mt-2">
                  <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.commodity }" @click="toggleCriterion(group, 'commodity')">Commodity</button>
                  <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_leverage }" @click="toggleCriterion(group, 'buyer_leverage')">Buyer Leverage</button>
                </div>
              </div>
            </div>
            <div class="supplier-settings-card-section d-flex flex-column"><span class="d-block text-xs font-semibold text-gray-500 supplier-settings-card-section-label">Buyer</span>
              <div class="d-flex gap-2 mt-2">
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_country }" @click="toggleCriterion(group, 'buyer_country')">Country</button>
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_region }" @click="toggleCriterion(group, 'buyer_region')">Region</button>
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_industry }" @click="toggleCriterion(group, 'buyer_industry')">Industry</button>
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_credit_rating }" @click="toggleCriterion(group, 'buyer_credit_rating')">Credit Rating              </button>
              </div>
            </div>
            <div class="supplier-settings-card-section d-flex flex-column"><span class="d-block text-xs font-semibold text-gray-500 supplier-settings-card-section-label">Supplier</span>
              <div class="d-flex gap-2 mt-2">
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_country }" @click="toggleCriterion(group, 'supplier_country')">Country</button>
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_region }" @click="toggleCriterion(group, 'supplier_region')">Region</button>
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_industry }" @click="toggleCriterion(group, 'supplier_industry')">Industry</button>
                <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_credit_rating }" @click="toggleCriterion(group, 'supplier_credit_rating')">Credit Rating</button>
              </div>
            </div>
          </div>
          <div class="supplier-settings-card-section d-flex align-items-center">
            <div class="open-options cursor-pointer">
              <iconTrash class="icons cursor-pointer icon-trash" @click="removeGroup(index)"></iconTrash>
            </div>
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <button class="btn outline-secondary-btn font-md mr-2" type="button" @click="addGroup"><span>{{ $t('home.analyze.groupsConfiguration.addGroup') }}</span></button>
        <div class="d-flex align-items-center text-warning" v-if="saveDisabledReason">
          <iconAlertsWarningExclamationTriangle class="mr-1"></iconAlertsWarningExclamationTriangle>
          <span class="text-sm">{{ saveDisabledReason }}</span>
        </div>
      </div>
    </div>
  </template>
  <template #modalButtons>
    <button class="btn outline-secondary-btn font-md mr-2" type="button" @click="handleCancel"><span>{{  $t('button.cancel') }}</span></button>
    <button class="btn-primary btn font-md mr-2" type="button" @click="handleSave" :disabled="!canSave"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, PropType } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconDragDrop from '@/resources/assets/images/icons/iconDragDrop.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import iconAlertsWarningExclamationTriangle from '@/resources/assets/images/icons/iconAlertsWarningExclamationTriangle.vue'
import { VALUE_TO_USE_OPTIONS, CalculationMethod, ScopesForSupplierStandard } from '@/modules/home/types'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import iconCheck from '@/resources/assets/images/icons/iconCheck.vue'
import {
  RadioButtonChangeEvent,
  RadioButton as KRadioButton
} from "@progress/kendo-vue-inputs";
import CalculumConfirmModal from "@/modules/components/CalculumConfirmModal.vue";
import { useToast } from "vue-toastification";
import { useI18n } from 'vue-i18n'
import { dedupeCombinationGroups, hasDuplicateGroups, SS2_DEFAULT_COMBINATION_GROUPS, activeCriterionCount } from './combinationGroupUtils'

function moveInArray<T>(arr: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return
  const [item] = arr.splice(fromIndex, 1)
  arr.splice(toIndex, 0, item)
}


interface Group {
  priorityOrder: number
  commodity: boolean
  buyer_leverage: boolean
  buyer_country: boolean
  buyer_region: boolean
  buyer_industry: boolean
  buyer_credit_rating: boolean
  supplier_country: boolean
  supplier_region: boolean
  supplier_industry: boolean
  supplier_credit_rating: boolean
}

interface SupplierStandardConfig {
  minOccurrences: number
  dsoAdjustmentEnabled: boolean
  dsoFallbackEnabled: boolean
  calculationMethod : CalculationMethod
  includeParentTerms: boolean
  includeSisterTerms: boolean
  sisterCompanyInclusion?: ScopesForSupplierStandard | null
  combinationGroups: Group[]
}

interface SupplierStandardState {
  config: SupplierStandardConfig
}

function createDefaultGroup(): Group {
  return {
    priorityOrder: 0,
    commodity: false,
    buyer_leverage: false,
    buyer_country: false,
    buyer_region: false,
    buyer_industry: false,
    buyer_credit_rating: false,
    supplier_country: false,
    supplier_region: false,
    supplier_industry: false,
    supplier_credit_rating: false
  }
}

export default defineComponent({
  name: 'SupplierStandardModal',
  components: { CalculumModal, iconDragDrop, iconTrash, Tooltip, iconCheck, KRadioButton, CalculumConfirmModal, iconAlertsWarningExclamationTriangle },
  props: {
    data: { type: Object as PropType<SupplierStandardConfig>, required: true },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const dragDropGroupIndex = ref(0)
    const dragHandleHoveredIndex = ref(-1)
    const draggedGroupIndex = ref<number | null>(null)
    const dragOverIndex = ref<number | null>(null)
    const isConfirmCloseModalVisible = ref(false)
    const toast = useToast();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const supplierStandard = reactive<SupplierStandardState>({
      config: {
        ...props.data,
        combinationGroups: props.data.combinationGroups?.length
          ? dedupeCombinationGroups(props.data.combinationGroups)
          : [createDefaultGroup()],
      },
    })



    const initialConfigSnapshot = ref<SupplierStandardConfig>(
      JSON.parse(JSON.stringify(supplierStandard.config))
    )

    function syncGroupIndexAndOrder() {
      supplierStandard.config.combinationGroups.forEach((group, i) => {
        group.priorityOrder = i + 1
      })
    }

    syncGroupIndexAndOrder()

    const hasDuplicates = computed(() =>
      hasDuplicateGroups(supplierStandard.config.combinationGroups)
    )

    // canSave must mirror the same conditions handleSave() checks (length + duplicates) - it
    // previously only checked length, so the Save button stayed enabled with duplicate groups even
    // though handleSave() silently blocked the actual save. Fixed 2026-09-14.
    const canSave = computed(() =>
      supplierStandard.config.combinationGroups.length > 0
      && !hasDuplicates.value
    )

    // Reactive explanation for why Save is disabled, shown next to "Add Group" (WI: US-02).
    // An empty *group* is exempt here - it's a valid, intentional "unrestricted" configuration for
    // Supplier Standard 2.0 (see canSave above) - so the two reasons left are zero groups at all,
    // and duplicates.
    const saveDisabledReason = computed(() => {
      if (supplierStandard.config.combinationGroups.length === 0) {
        return 'No combination groups are configured. Add at least one group before you can save.'
      }
      if (hasDuplicates.value) {
        return 'Two of your groups have the exact same attributes selected. Each group must be a unique combination before you can save.'
      }
      return null
    })

    type GroupCriterionKey = Exclude<keyof Group, 'priorityOrder'>

    function toggleCriterion(group: Group, key: GroupCriterionKey) {
      if (typeof group[key] === 'boolean') {
        ;(group as Record<GroupCriterionKey, boolean>)[key] = !group[key]
      }
    }

    function addGroup() {
      supplierStandard.config.combinationGroups.push(createDefaultGroup())
      syncGroupIndexAndOrder()
    }

    function removeGroup(index: number) {
      supplierStandard.config.combinationGroups.splice(index, 1)
      syncGroupIndexAndOrder()
    }

    // "Restore to defaults" (WI: US-02): pure frontend action, nothing is fetched or saved here -
    // it only resets local form state. The Super Admin can still Cancel afterward with no changes
    // persisted, or Save to actually apply the reset groups.
    function restoreDefaults() {
      supplierStandard.config.combinationGroups.length = 0
      SS2_DEFAULT_COMBINATION_GROUPS.forEach((g) => supplierStandard.config.combinationGroups.push({ ...g }))
      syncGroupIndexAndOrder()
    }

    // "Sort by enabled attributes" (WI: US-02): one-time, opt-in suggestion - most restrictive
    // (most active criteria) first. By default the Super Admin has full manual drag-and-drop
    // control; this only runs when they click the button, and nothing persists until Save.
    function sortByEnabledAttributes() {
      supplierStandard.config.combinationGroups.sort(
        (a, b) => activeCriterionCount(b) - activeCriterionCount(a)
      )
      syncGroupIndexAndOrder()
    }



    function startDrag(event: DragEvent, _group: Group, index: number) {
      if (!event.dataTransfer) return
      dragDropGroupIndex.value = index
      draggedGroupIndex.value = index
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.dropEffect = 'move'
      event.dataTransfer.setData('text/plain', String(index))
    }

    function onDragEnter(index: number) {
      if (draggedGroupIndex.value === null) return
      dragOverIndex.value = index
    }

    function onDragLeave() {
      dragOverIndex.value = null
    }

    function onDragEnd() {
      dragHandleHoveredIndex.value = -1
      draggedGroupIndex.value = null
      dragOverIndex.value = null
    }

    function onDrop(event: DragEvent, toIndex: number) {
      event.preventDefault()
      const fromIndex = dragDropGroupIndex.value
      moveInArray(supplierStandard.config.combinationGroups, fromIndex, toIndex)
      syncGroupIndexAndOrder()
      onDragEnd()
    }

    function resetGroups() {
      const snapshot = JSON.parse(
        JSON.stringify(initialConfigSnapshot.value)
      ) as SupplierStandardConfig
      // Clear first: canSave can now be false with a non-empty combinationGroups (duplicate
      // groups), so the handleSave() !canSave branch below can call this with groups already
      // present - pushing without clearing would duplicate them.
      supplierStandard.config.combinationGroups.length = 0
      snapshot.combinationGroups.forEach((g) => supplierStandard.config.combinationGroups.push({ ...g }))
    }

    function handleSave() {
      //- Checked first, ahead of the generic !canSave branch below: canSave now folds
      //- hasDuplicates in too (so the Save button disables for this reason as well), but
      //- duplicates must NOT reset combinationGroups the way the branch below does - the Super
      //- Admin's unsaved edits need to survive so they can find/fix the duplicate themselves.
      if (hasDuplicates.value) {
        isConfirmCloseModalVisible.value = false
        toast.error(translate.t('global.groupAlreadyExists'));
        return
      }

      //- Validate before emitting save
      if (!canSave.value) {
        isConfirmCloseModalVisible.value = false
        toast.error(translate.t('global.atLeastOneGroup'));
        resetGroups()
        return
      }

      const config = JSON.parse(
        JSON.stringify(supplierStandard.config)
      ) as SupplierStandardConfig
      emit('save', config)
      emit('close')
    }

    function resetConfig() {
      const snapshot = JSON.parse(
        JSON.stringify(initialConfigSnapshot.value)
      ) as SupplierStandardConfig
      supplierStandard.config.minOccurrences = snapshot.minOccurrences
      supplierStandard.config.dsoAdjustmentEnabled = snapshot.dsoAdjustmentEnabled
      supplierStandard.config.dsoFallbackEnabled = snapshot.dsoFallbackEnabled
      supplierStandard.config.calculationMethod = snapshot.calculationMethod
      supplierStandard.config.combinationGroups.length = 0
      supplierStandard.config.includeParentTerms = snapshot.includeParentTerms
      supplierStandard.config.includeSisterTerms = snapshot.includeSisterTerms
      supplierStandard.config.sisterCompanyInclusion = snapshot.sisterCompanyInclusion
      resetGroups()
      syncGroupIndexAndOrder()
      emit('close')
    }

    function getGroupClass(index: number) {
      return {
        'supplier-settings-card--handle-hover': dragHandleHoveredIndex.value === index,
        'supplier-settings-card--is-dragging': draggedGroupIndex.value === index,
        'supplier-settings-card--drop-target':
          dragOverIndex.value === index && draggedGroupIndex.value !== index,
      }
    }


    

    const hasChanges = computed(() => {
      const primitiveKeys: (keyof SupplierStandardConfig)[] = ['minOccurrences', 'dsoAdjustmentEnabled','dsoFallbackEnabled','calculationMethod','includeParentTerms','includeSisterTerms','sisterCompanyInclusion']
      if (primitiveKeys.some((key) => supplierStandard.config[key] !== initialConfigSnapshot.value[key])) return true
      return JSON.stringify(supplierStandard.config.combinationGroups) !== JSON.stringify(initialConfigSnapshot.value.combinationGroups)
    })

    function handleCancel() {
      if (hasChanges.value) {
        isConfirmCloseModalVisible.value = true        
      } else {
        emit('close')
      }
    }

    function handleSisterValues(
      e: RadioButtonChangeEvent,
    ) {
      const value = e.value;
      // Validate
      if (value !== "include" && value !== "only_if_no_match" && value !== "exclude") {
        return;
      }

      supplierStandard.config.sisterCompanyInclusion = value;
    }


    return {
      supplierStandard,
      VALUE_TO_USE_OPTIONS,
      dragHandleHoveredIndex,
      draggedGroupIndex,
      dragOverIndex,
      toggleCriterion,
      addGroup,
      removeGroup,
      restoreDefaults,
      sortByEnabledAttributes,
      startDrag,
      onDrop,
      onDragEnter,
      onDragLeave,
      onDragEnd,
      getGroupClass,      
      resetConfig,
      handleSave,
      canSave,
      saveDisabledReason,
      isConfirmCloseModalVisible,
      handleCancel,
      handleSisterValues
    }
  },
})
</script>
<style scoped>


.boder-inputs {
  margin-left: 20px;
  padding-left: 10px;
  border-left: 4px solid #eaecf0;
}

.enabled-button {
  gap: 15px;
  padding-left: 2px;
  margin-top: 9px;
}

.k-checkbox-label-regulatory {
  margin: 0;
  padding: 0 !important;
  display: inline-flex;
  align-items: flex-end;
}

/* KRadioButton custom colors */
:deep(.k-radio) {
  border-color: #6b7280;
  background-color: #6b7280;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

:deep(.k-radio:checked) {
  border-color: #38bdf8;
  background-color: #38bdf8;
  box-shadow: inset 0 0 0 4px #ffffff;
  background-image: none !important;
}

:deep(.k-radio:focus),
:deep(.k-radio:focus-visible) {
  outline: none;
  box-shadow: inset 0 0 0 4px #ffffff, 0 0 0 2px rgba(56, 189, 248, 0.4);
}

:deep(.k-radio-label) {
  font-size: 0.875rem;
  color: #374151;
}


</style>
