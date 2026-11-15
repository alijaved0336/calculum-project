<template>
<CustomDialog :visible="!confirming" :title="t('arSetup.peerGroup.title')" :width="960" data-test="pg-modal" @close="cancel">
  <div class="pg">
    <div class="pg__header">
      <SetupNumberField
        v-model="minOccurrences"
        :label="t('arSetup.strategies.minOccurrences')"
        :error="occurrencesError"
        :disabled="disabled"
        data-test="pg-min-occurrences"
      />
      <div class="pg__field">
        <span class="pg__label">{{ t('arSetup.peerGroup.valueToUse') }}</span>
        <div class="pg__pills" role="group" :aria-label="t('arSetup.peerGroup.valueToUse')">
          <button
            v-for="option in METRICS"
            :key="option"
            type="button"
            class="pg__pill"
            :class="{ 'pg__pill--on': metric === option }"
            :aria-pressed="metric === option"
            :disabled="disabled"
            :data-test="`pg-metric-${option}`"
            @click="metric = option"
          >
            {{ t(`arSetup.peerGroup.metric.${option}`) }}
          </button>
        </div>
      </div>
    </div>

    <div class="pg__groups-header">
      <span class="pg__label">{{ t('arSetup.peerGroup.combinations') }}</span>
      <div class="pg__buttons">
        <CustomButton :text="t('arSetup.peerGroup.sortByEnabled')" :disabled="disabled" data-test="pg-sort" @click="sort" />
        <CustomButton :text="t('arSetup.peerGroup.restoreDefaults')" :disabled="disabled || defaults.length === 0" data-test="pg-restore" @click="restore" />
      </div>
    </div>

    <div class="pg__groups">
      <div
        v-for="(group, index) in groups"
        :key="keys[index]"
        class="pg__card"
        :class="cardClass(index)"
        :draggable="!disabled && handleIndex === index"
        data-test="pg-group"
        @dragstart="onDragStart($event, index)"
        @dragenter.prevent="onDragEnter(index)"
        @dragover.prevent
        @drop.prevent="onDrop(index)"
        @dragend="onDragEnd"
      >
        <div
          class="pg__handle"
          :class="{ 'pg__handle--disabled': disabled }"
          :aria-label="t('arSetup.peerGroup.drag')"
          data-test="pg-handle"
          @mouseenter="handleIndex = index"
          @mouseleave="handleIndex = -1"
        >
          <i class="fa-solid fa-grip-vertical" aria-hidden="true" />
          <span class="pg__priority" data-test="pg-priority">{{ index + 1 }}</span>
        </div>
        <div class="pg__sections">
          <div v-for="section in SECTIONS" :key="section.id" class="pg__section" :data-test="`pg-section-${section.id}`">
            <span class="pg__section-label">{{ t(`arSetup.peerGroup.sections.${section.id}`) }}</span>
            <div class="pg__pills">
              <button
                v-for="attribute in section.attributes"
                :key="attribute"
                type="button"
                class="pg__pill"
                :class="{ 'pg__pill--on': flag(group, section.id, attribute) }"
                :aria-pressed="flag(group, section.id, attribute)"
                :disabled="disabled"
                :data-test="`pg-${section.id}-${attribute}`"
                @click="toggle(group, section.id, attribute)"
              >
                {{ t(`arSetup.peerGroup.attributes.${attribute}`) }}
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="pg__delete"
          :aria-label="t('arSetup.common.delete')"
          :disabled="disabled"
          data-test="pg-delete"
          @click="remove(index)"
        >
          <i class="fa-regular fa-trash-can" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="pg__footer-row">
      <CustomButton :text="t('arSetup.peerGroup.addGroup')" :disabled="disabled" data-test="pg-add" @click="add" />
      <span v-if="groupsError" class="pg__warning" data-test="pg-warning">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        {{ t(groupsError) }}
      </span>
    </div>
  </div>
  <template #actions>
    <CustomButton :text="t('arSetup.common.cancel')" data-test="pg-cancel" @click="cancel" />
    <CustomButton :text="t('arSetup.common.save')" variant="accent" :disabled="!canSave" data-test="pg-save" @click="save" />
  </template>
</CustomDialog>

<CustomDialog
  :visible="confirming"
  :title="t('arSetup.common.confirm')"
  :show-logo="true"
  data-test="pg-unsaved"
  @close="confirming = false"
>
  <p class="pg__confirm-text">{{ t('arSetup.unsavedChanges') }}</p>
  <template #actions>
    <CustomButton :text="t('arSetup.common.save')" variant="accent" :disabled="!canSave" data-test="pg-unsaved-save" @click="save" />
    <CustomButton :text="t('arSetup.common.discard')" data-test="pg-unsaved-discard" @click="$emit('close')" />
  </template>
</CustomDialog>
</template>

<script lang="ts">
import { computed, defineComponent, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { CustomButton, CustomDialog } from '@ada/design-system'
import {
  PARTY_ATTRIBUTES,
  TRANSACTION_ATTRIBUTES,
  type CombinationGroup,
  type StrategyMetric,
  type StrategySetting,
} from '../api'
import {
  cloneGroups,
  combinationGroupsError,
  emptyGroup,
  moveGroup,
  peerGroupOccurrencesError,
  sortByEnabledAttributes,
} from '../utils/combinationGroups'
import SetupNumberField from './SetupNumberField.vue'

/** The pills, in AP's order; 1Q / 3Q are labels of Q1 / Q3. */
const METRICS: StrategyMetric[] = ['MIN', 'AVG', 'Q1', 'Q3', 'MAX']
/** Receivables' card order: the counterparty, the transaction, then the client's own entity. */
const SECTIONS = [
  { id: 'buyer', attributes: PARTY_ATTRIBUTES },
  { id: 'transaction', attributes: TRANSACTION_ATTRIBUTES },
  { id: 'supplier', attributes: PARTY_ATTRIBUTES },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

export interface PeerGroupSettings {
  metric: StrategyMetric
  minOccurrences: number
  combinationGroups: CombinationGroup[]
}

/**
 * AB#20839 (#20824): Peer Group Standard's More Settings, as AP's `PeerGroupStandardModal.vue`
 * with Receivables' party names. Minimum Occurrences, the value to use and the combination groups,
 * edited on a copy: Save hands them to the strategies section (which saves them with the rest),
 * Cancel after a change asks Discard or Save. While Setup is locked everything but Cancel is off.
 */
export default defineComponent({
  name: 'SetupPeerGroupSettingsModal',
  components: { CustomButton, CustomDialog, SetupNumberField },
  props: {
    setting: { type: Object as PropType<StrategySetting>, required: true },
    disabled: { type: Boolean, default: false },
  },
  emits: {
    save: (_settings: PeerGroupSettings) => true,
    close: () => true,
  },
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' })

    const initial = {
      metric: props.setting.metric ?? 'Q1',
      minOccurrences: props.setting.minOccurrences ?? 30,
      combinationGroups: cloneGroups(props.setting.combinationGroups ?? []),
    }
    const metric = ref<StrategyMetric>(initial.metric)
    const minOccurrences = ref<number>(initial.minOccurrences)
    const groups = ref<CombinationGroup[]>(cloneGroups(initial.combinationGroups))
    const defaults = computed(() => props.setting.defaultCombinationGroups ?? [])

    // Stable v-for keys that follow a card through drags, deletes and sorts.
    let nextKey = 0
    const keys = ref<number[]>(groups.value.map(() => nextKey++))

    const confirming = ref(false)
    const handleIndex = ref(-1)
    const dragFrom = ref<number | null>(null)
    const dragOver = ref<number | null>(null)

    const occurrencesError = computed(() => peerGroupOccurrencesError(minOccurrences.value))
    const groupsError = computed(() => combinationGroupsError(groups.value))
    const current = computed<PeerGroupSettings>(() => ({
      metric: metric.value,
      minOccurrences: minOccurrences.value,
      combinationGroups: groups.value,
    }))
    const hasChanges = computed(() => JSON.stringify(current.value) !== JSON.stringify(initial))
    const canSave = computed(() => !props.disabled && !occurrencesError.value && !groupsError.value)

    const flag = (group: CombinationGroup, section: SectionId, attribute: string): boolean =>
      (group[section] as Record<string, boolean>)[attribute]

    function toggle(group: CombinationGroup, section: SectionId, attribute: string): void {
      const flags = group[section] as Record<string, boolean>
      flags[attribute] = !flags[attribute]
    }

    function setGroups(next: CombinationGroup[], nextKeys: number[]): void {
      groups.value = next
      keys.value = nextKeys
    }

    function add(): void {
      setGroups([...groups.value, emptyGroup()], [...keys.value, nextKey++])
    }

    function remove(index: number): void {
      setGroups(groups.value.filter((_, i) => i !== index), keys.value.filter((_, i) => i !== index))
    }

    function sort(): void {
      const order = sortByEnabledAttributes(groups.value).map((group) => groups.value.indexOf(group))
      setGroups(order.map((i) => groups.value[i]), order.map((i) => keys.value[i]))
    }

    /** Nothing is saved until Save; Cancel still brings back what was there. */
    function restore(): void {
      setGroups(cloneGroups(defaults.value), defaults.value.map(() => nextKey++))
    }

    function onDragStart(event: DragEvent, index: number): void {
      dragFrom.value = index
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(index))
      }
    }

    function onDragEnter(index: number): void {
      if (dragFrom.value !== null) dragOver.value = index
    }

    function onDrop(index: number): void {
      if (dragFrom.value !== null) {
        const from = dragFrom.value
        setGroups(moveGroup(groups.value, from, index), moveKeys(from, index))
      }
      onDragEnd()
    }

    function moveKeys(from: number, to: number): number[] {
      const moved = [...keys.value]
      const [key] = moved.splice(from, 1)
      moved.splice(to, 0, key)
      return moved
    }

    function onDragEnd(): void {
      handleIndex.value = -1
      dragFrom.value = null
      dragOver.value = null
    }

    const cardClass = (index: number) => ({
      'pg__card--handle-hover': !props.disabled && handleIndex.value === index,
      'pg__card--dragging': dragFrom.value === index,
      'pg__card--drop-target': dragOver.value === index && dragFrom.value !== index,
    })

    function save(): void {
      if (!canSave.value) return
      emit('save', { ...current.value, combinationGroups: cloneGroups(groups.value) })
      emit('close')
    }

    function cancel(): void {
      if (hasChanges.value && !props.disabled) confirming.value = true
      else emit('close')
    }

    return {
      t, METRICS, SECTIONS, metric, minOccurrences, groups, keys, defaults, confirming, handleIndex,
      occurrencesError, groupsError, canSave, flag, toggle, add, remove, sort, restore,
      onDragStart, onDragEnter, onDrop, onDragEnd, cardClass, save, cancel,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.pg {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.pg__header {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
}

.pg__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.pg__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-gray-700;
}

.pg__groups-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pg__buttons {
  display: flex;
  gap: 0.5rem;
}

.pg__groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 28rem;
  overflow-y: auto;
}

// AP's `.supplier-settings-card` / `.supplier-settings-pill` (apps/ap _general.scss), so both apps look alike.
.pg__card {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &--handle-hover {
    border-left: 5px solid $color-primary-400;
    box-shadow: -1px 12px 5px 0 rgba(16, 24, 40, 0.1);
  }

  &--dragging {
    opacity: 0.5;
  }

  &--drop-target .pg__sections {
    border-color: $color-primary-500;
    box-shadow: 0 0 0 2px rgba($color-primary-500, 0.25);
  }
}

.pg__handle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-left: 0.5rem;
  color: $color-gray-400;
  cursor: grab;

  &--disabled {
    cursor: not-allowed;
  }
}

.pg__priority {
  min-width: 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-gray-500;
}

.pg__sections {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 1rem;
  border: 1px solid $color-gray-200;
  border-radius: 10px;
}

.pg__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pg__section-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  color: $color-gray-500;
}

.pg__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pg__pill {
  padding: 0.1rem 0.75rem;
  border: 1px solid #fff;
  border-radius: 9999px;
  background-color: #f3f3f3;
  color: #bebebe;
  font-size: 0.875rem;
  font-weight: 500;

  &--on {
    background-color: #d9d2e9;
    color: #9c0bfe;
  }

  &:hover:not(:disabled) {
    background: #bfade0;
    color: #7a00e0;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.pg__delete {
  padding: 0.25rem;
  border: 0;
  background: none;
  color: $color-gray-500;

  &:disabled {
    color: $color-gray-300;
    cursor: not-allowed;
  }
}

.pg__footer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.pg__warning {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: $color-warning-700;
}

.pg__confirm-text {
  margin: 0;
}
</style>
