<template>
<CalculumConfirmModal v-if="isConfirmCloseModalVisible" :show="isConfirmCloseModalVisible" @hide="isConfirmCloseModalVisible = false" @discard="resetConfig" @submit="handleSave" :isModalForSetupStrategiesShowing="true" :zIndex="true"></CalculumConfirmModal>
<CalculumModal @close="handleCancel" title="Peer Group Standard 2.0" :size="'custom'" :showClose="true">
  <template #modalContent>
    <div class="supplier-card-modal-body">
      <div class="d-flex gap-5 mb-4">
        <div class="d-flex flex-column gap-2"><span class="d-block text-sm font-medium text-gray-700 mb-1">{{ $t('global.minOccurrences') }}          </span>
          <input class="form-control-thin" type="number" min="1" max="9999" v-model.number="state.config.minOccurrences"/>
        </div>
        <div class="d-flex flex-column gap-1">
          <label class="d-block text-sm font-medium text-gray-700 mb-1">Value to use in strategy</label>
          <div class="d-flex gap-2 flex-wrap">
            <button class="supplier-settings-pill" v-for="opt in VALUE_TO_USE_OPTIONS" :key="opt.value" :class="{ 'supplier-settings-pill--selected': state.config.calculationMethod === opt.value }" @click="state.config.calculationMethod = opt.value">{{ opt.label }}</button>
          </div>
        </div>
      </div>
      <div class="row mt-4 mb-4">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="text-sm font-medium text-gray-700">Combinations and Priority (Top to Bottom)</span>
            <div class="d-flex gap-2">
              <button class="btn outline-secondary-btn font-md" type="button" @click="sortByEnabledAttributes"><span>Sort by Enabled Attributes</span></button>
              <button class="btn outline-secondary-btn font-md" type="button" @click="restoreDefaults"><span>Restore to Defaults</span></button>
            </div>
          </div>
          <div class="supplier-settings-groups show-scroll">
            <div class="supplier-settings-card w-100 mb-2 gap-3" v-for="(group, index) in state.config.combinationGroups" :key="group.priorityOrder" :class="getGroupClass(index)" :draggable="dragHandleHoveredIndex === index" @dragstart="startDrag($event, index)" @dragend="onDragEnd" @drop="onDrop($event, index)" @dragenter.prevent="onDragEnter(index)" @dragleave.prevent="onDragLeave" @dragover.prevent>
              <div class="supplier-settings-card-section d-flex align-items-center">
                <div class="ml-2" @mouseenter="dragHandleHoveredIndex = index" @mouseleave="dragHandleHoveredIndex = -1">
                  <iconDragDrop class="icon_drag_drop"></iconDragDrop>
                </div>
              </div>
              <div class="supplier-settings-card-section-container d-flex gap-2">
                <div class="supplier-settings-card-section d-flex">
                  <div class="d-flex flex-column"><span class="supplier-settings-card-section-label d-block text-xs font-semibold text-gray-500">Supplier</span>
                    <div class="d-flex gap-2 mt-2">
                      <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_country }" @click="toggleCriterion(group, 'supplier_country')">Country</button>
                      <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_region }" @click="toggleCriterion(group, 'supplier_region')">Region</button>
                      <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_industry }" @click="toggleCriterion(group, 'supplier_industry')">Industry</button>
                      <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.supplier_credit_rating }" @click="toggleCriterion(group, 'supplier_credit_rating')">Credit Rating</button>
                    </div>
                  </div>
                </div>
                <div class="supplier-settings-card-section d-flex flex-column"><span class="supplier-settings-card-section-label d-block text-xs font-semibold text-gray-500">Transaction</span>
                  <div class="d-flex gap-2 mt-2">
                    <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.commodity }" @click="toggleCriterion(group, 'commodity')">Commodity</button>
                    <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_leverage }" @click="toggleCriterion(group, 'buyer_leverage')">Buyer Leverage</button>
                  </div>
                </div>
                <div class="supplier-settings-card-section d-flex flex-column">               <span class="supplier-settings-card-section-label d-block text-xs font-semibold text-gray-500">Buyer</span>
                  <div class="d-flex gap-2 mt-2">
                    <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_country }" @click="toggleCriterion(group, 'buyer_country')">Country</button>
                    <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_region }" @click="toggleCriterion(group, 'buyer_region')">Region</button>
                    <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_industry }" @click="toggleCriterion(group, 'buyer_industry')">Industry</button>
                    <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': group.buyer_credit_rating }" @click="toggleCriterion(group, 'buyer_credit_rating')">Credit Rating</button>
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
    <button class="btn outline-secondary-btn font-md mr-2" type="button" @click="handleCancel"><span>{{ $t('button.cancel') }}</span></button>
    <button class="btn-primary btn font-md mr-2" type="button" @click="handleSave" :disabled="!canSave"><span>{{ $t('global.save') }}    </span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, PropType } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import iconDragDrop from '@/resources/assets/images/icons/iconDragDrop.vue'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import iconAlertsWarningExclamationTriangle from '@/resources/assets/images/icons/iconAlertsWarningExclamationTriangle.vue'
import { VALUE_TO_USE_OPTIONS, CalculationMethod } from '@/modules/home/types'
import CalculumConfirmModal from "@/modules/components/CalculumConfirmModal.vue";
import { useToast } from "vue-toastification";
import { useI18n } from 'vue-i18n'
import { hasDuplicateGroups, groupHasAnyActiveCriterion, PG2_DEFAULT_COMBINATION_GROUPS, activeCriterionCount } from './combinationGroupUtils'

export interface SupplierCardGroup {
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

export function createDefaultSupplierCardGroup(): SupplierCardGroup {
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

interface SupplierCardModalConfig {
  minOccurrences: number
  calculationMethod: CalculationMethod
  combinationGroups: SupplierCardGroup[]
}

interface SupplierCardModalState {
  config: SupplierCardModalConfig
}


type CriterionKey = Exclude<keyof SupplierCardGroup, 'priorityOrder'>

export default defineComponent({
  name: 'PeerGroupStandardModal',
  components: { CalculumModal, iconDragDrop, iconTrash, CalculumConfirmModal, iconAlertsWarningExclamationTriangle },
  props: {
    data: { type: Object as PropType<SupplierCardModalConfig>, required: true },
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const dragHandleHoveredIndex = ref(-1)
    const draggedGroupIndex = ref<number | null>(null)
    const dragOverIndex = ref<number | null>(null)
    const dragDropFromIndex = ref(0)
    const isConfirmCloseModalVisible = ref(false)
    const toast = useToast();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const state = reactive<SupplierCardModalState>({
      config: {
        ...props.data,
        combinationGroups: props.data.combinationGroups?.length
          ? props.data.combinationGroups
          : [createDefaultSupplierCardGroup()],
      },
    })

    const initialConfigSnapshot = ref<SupplierCardModalConfig>(
      JSON.parse(JSON.stringify(state.config))
    )

    function syncGroupIndexAndOrder() {
      state.config.combinationGroups.forEach((group, i) => {        
        group.priorityOrder = i + 1
      })
    }

      const hasChanges = computed(() => {
      const primitiveKeys: (keyof SupplierCardModalConfig)[] = ['minOccurrences', 'calculationMethod']
      if (primitiveKeys.some((key) => state.config[key] !== initialConfigSnapshot.value[key])) return true
      return JSON.stringify(state.config.combinationGroups) !== JSON.stringify(initialConfigSnapshot.value.combinationGroups)
    })

    syncGroupIndexAndOrder()

    const hasDuplicates = computed(() =>
      hasDuplicateGroups(state.config.combinationGroups)
    )

    // Peer Group Standard 2.0 has no forced-identity floor like Supplier Standard 2.0 does, so an
    // all-false group is meaningless here (it would match the whole dataset unconditionally) -
    // confirmed as a real bug (2026-09-14). Every group must have at least one active criterion.
    // Also mirrors handleSave()'s duplicate check - previously missing here, so Save stayed
    // enabled with duplicate groups even though handleSave() silently blocked the actual save.
    const canSave = computed(() =>
      state.config.combinationGroups.length > 0
      && state.config.combinationGroups.every((group) => groupHasAnyActiveCriterion(group))
      && !hasDuplicates.value
    )

    // Reactive explanation for why Save is disabled, shown next to "Add Group" (WI: US-02). Zero
    // groups checked first (nothing else to report on); then an empty group - the more fundamental
    // problem for Peer Group Standard 2.0, since it has no forced-identity floor, so a group with
    // nothing selected doesn't define any peer relationship at all, not just a broad one; then
    // duplicates.
    const saveDisabledReason = computed(() => {
      if (state.config.combinationGroups.length === 0) {
        return 'No combination groups are configured. Add at least one group before you can save.'
      }
      const hasEmptyGroup = state.config.combinationGroups.some((group) => !groupHasAnyActiveCriterion(group))
      if (hasEmptyGroup) {
        return 'One or more groups have no attributes selected. Peer Group Standard 2.0 needs at least one shared attribute per group.'
      }
      if (hasDuplicates.value) {
        return 'Two of your groups have the exact same attributes selected. Each group must be a unique combination before you can save.'
      }
      return null
    })

    function toggleCriterion(group: SupplierCardGroup, key: CriterionKey) {
      if (typeof group[key] === 'boolean') {
        ;(group as Record<CriterionKey, boolean>)[key] = !group[key]
      }
    }

    function addGroup() {
      const newGroup = createDefaultSupplierCardGroup()
      state.config.combinationGroups.push(newGroup)
      syncGroupIndexAndOrder()
    }

    function removeGroup(index: number) {
      state.config.combinationGroups.splice(index, 1)
      syncGroupIndexAndOrder()
    }

    // "Restore to defaults" (WI: US-02): pure frontend action, nothing is fetched or saved here -
    // it only resets local form state. The Super Admin can still Cancel afterward with no changes
    // persisted, or Save to actually apply the reset groups.
    function restoreDefaults() {
      state.config.combinationGroups.length = 0
      PG2_DEFAULT_COMBINATION_GROUPS.forEach((g) => state.config.combinationGroups.push({ ...g }))
      syncGroupIndexAndOrder()
    }

    // "Sort by enabled attributes" (WI: US-02): one-time, opt-in suggestion - most restrictive
    // (most active criteria) first. By default the Super Admin has full manual drag-and-drop
    // control; this only runs when they click the button, and nothing persists until Save.
    function sortByEnabledAttributes() {
      state.config.combinationGroups.sort(
        (a, b) => activeCriterionCount(b) - activeCriterionCount(a)
      )
      syncGroupIndexAndOrder()
    }

    function moveInArray<T>(arr: T[], fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return
      const [item] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, item)
    }

    function startDrag(event: DragEvent, index: number) {
      if (!event.dataTransfer) return
      dragDropFromIndex.value = index
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
      const fromIndex = dragDropFromIndex.value
      moveInArray(state.config.combinationGroups, fromIndex, toIndex)
      syncGroupIndexAndOrder()
      onDragEnd()
    }

    function resetGroups() {
      const snapshot = JSON.parse(
        JSON.stringify(initialConfigSnapshot.value)
      ) as SupplierCardModalConfig
      // Clear first: canSave can now be false with a non-empty combinationGroups (a group with no
      // active criteria, PG2.0-only), so the handleSave() !canSave branch below can call this with
      // groups already present - pushing without clearing would duplicate them.
      state.config.combinationGroups.length = 0
      snapshot.combinationGroups.forEach((g) => state.config.combinationGroups.push({ ...g }))
    }

    function handleSave() {
      //- Checked first, ahead of the generic !canSave branch below: canSave now folds both of
      //- these in too (so the Save button disables for these reasons as well), but neither must
      //- reset combinationGroups the way the branch below does - the Super Admin's unsaved edits
      //- need to survive so they can find/fix the offending group themselves.
      if (hasDuplicates.value) {
        isConfirmCloseModalVisible.value = false
        toast.error(translate.t('global.groupAlreadyExists'));
        return
      }

      const hasEmptyGroup = state.config.combinationGroups.some((group) => !groupHasAnyActiveCriterion(group))
      if (hasEmptyGroup) {
        isConfirmCloseModalVisible.value = false
        toast.error(translate.t('global.groupMissingAttribute'));
        return
      }

      //- Validate before emitting save - only reachable for zero groups now, both PG2.0-specific
      //- reasons above are checked (and returned on) first.
      if (!canSave.value) {
        isConfirmCloseModalVisible.value = false
        toast.error(translate.t('global.atLeastOneGroup'));
        resetGroups()
        return
      }

      const config = JSON.parse(
        JSON.stringify(state.config)
      ) as SupplierCardModalConfig
      emit('save', config)
      emit('close')
    }

    function resetConfig() {
      const snapshot = JSON.parse(
        JSON.stringify(initialConfigSnapshot.value)
      ) as SupplierCardModalConfig
      state.config.minOccurrences = snapshot.minOccurrences
      state.config.calculationMethod = snapshot.calculationMethod
      state.config.combinationGroups.length = 0
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

    function handleCancel() {
      if (hasChanges.value) {
        isConfirmCloseModalVisible.value = true        
      } else {
        emit('close')
      }
    }

    return {
      state,
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
      hasChanges
    }
  },
})
</script>
