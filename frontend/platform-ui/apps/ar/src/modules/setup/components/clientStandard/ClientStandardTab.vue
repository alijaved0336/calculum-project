<template>
<SetupSectionCard :title="t('arSetup.clientStandard.title', { client: clientLabel })" :description="t('arSetup.clientStandard.help', { client: clientLabel })">
  <output v-if="clientStandardOff" class="alert alert-warning d-flex flex-wrap align-items-center gap-2 mb-0" data-test="cs-disabled-notice">
    <span>{{ t('arSetup.clientStandard.disabledNotice') }}</span>
    <CustomButton :text="t('arSetup.clientStandard.disabledLink')" variant="plain" @click="$emit('go-to-payment-terms')" />
  </output>

  <div v-if="loadError" class="alert alert-danger mb-0" role="alert">{{ t('arSetup.clientStandard.loadError') }}</div>
  <div v-else-if="loading" class="text-gray-500">…</div>
  <template v-else>
    <div class="cs-table">
      <table>
        <thead>
          <tr>
            <th class="cs-col-drag" />
            <th>{{ t('arSetup.clientStandard.headerGroup') }}</th>
            <th>{{ t('arSetup.clientStandard.headerName') }}</th>
            <th>{{ t('arSetup.clientStandard.headerDays') }}</th>
            <th>{{ t('arSetup.clientStandard.behavior') }}</th>
            <th>{{ t('arSetup.clientStandard.headerConditions') }}</th>
            <th class="cs-col-actions" />
          </tr>
        </thead>
        <template v-for="(group, index) in groups" :key="group.key">
          <tbody
            class="cs-group"
            :class="{ 'cs-group--drag-over': dragOver === index }"
            :draggable="!locked && dragHandleActive"
            data-test="cs-group"
            @dragstart="onDragStart(index)"
            @dragover.prevent="dragOver = index"
            @dragleave="dragOver = null"
            @drop.prevent="onDrop(index)"
            @dragend="onDragEnd"
          >
            <tr>
              <td class="cs-col-drag">
                <span
                  class="cs-drag"
                  :class="{ 'cs-drag--disabled': locked }"
                  aria-hidden="true"
                  @mouseenter="dragHandleActive = true"
                  @mouseleave="dragHandleActive = false"
                ><i class="fa-solid fa-bars" /></span>
              </td>
              <td><span class="cs-pill" :style="pillStyle(index)" data-test="cs-badge">{{ badge(index, group.value) }}</span></td>
              <td>
                <TextInput
                  v-model="group.value.name"
                  class="cs-name"
                  :placeholder="t('arSetup.clientStandard.namePlaceholder', { n: index + 1 })"
                  :disabled="locked"
                  :class="{ 'cs-input--invalid': errorsOf(index).name }"
                  data-test="cs-name"
                />
                <span v-if="errorsOf(index).name" class="cs-error">{{ t(errorsOf(index).name!) }}</span>
              </td>
              <td>
                <TextInput
                  :model-value="Number.isFinite(group.value.paymentTerms) ? group.value.paymentTerms : ''"
                  class="cs-days"
                  type="number"
                  :disabled="locked"
                  :class="{ 'cs-input--invalid': errorsOf(index).paymentTerms }"
                  data-test="cs-days"
                  @update:model-value="onDaysInput(index, $event)"
                />
                <span v-if="errorsOf(index).paymentTerms" class="cs-error">{{ t(errorsOf(index).paymentTerms!) }}</span>
              </td>
              <td>
                <select v-model="group.value.behavior" class="cs-behavior" :disabled="locked" data-test="cs-behavior">
                  <option v-for="behavior in BEHAVIORS" :key="behavior" :value="behavior">{{ t(`arSetup.clientStandard.behaviors.${behavior}`) }}</option>
                </select>
              </td>
              <td>
                <span v-if="group.value.rules.length === 0" class="cs-hint">{{ t('arSetup.clientStandard.noConditionsHint') }}</span>
                <button
                  v-else
                  type="button"
                  class="cs-conditions-toggle"
                  :aria-expanded="expanded.has(group.key)"
                  data-test="cs-conditions-toggle"
                  @click="toggleConditions(group.key)"
                >
                  <span class="cs-conditions-summary">{{ chipText(group.value.rules[0]) }}</span>
                  <span v-if="group.value.rules.length > 1" class="cs-more">+{{ group.value.rules.length - 1 }}</span>
                  <i class="fa-solid" :class="expanded.has(group.key) ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true" />
                </button>
              </td>
              <td class="cs-col-actions">
                <CustomButton
                  :text="t('arSetup.clientStandard.addCondition')"
                  variant="plain"
                  icon="filters"
                  :show-label="false"
                  :disabled="locked"
                  data-test="cs-add-rule"
                  @click="openRule(index, null)"
                />
                <CustomButton
                  :text="t('arSetup.common.delete')"
                  variant="plain"
                  icon="trash"
                  :show-label="false"
                  :disabled="locked"
                  data-test="cs-delete"
                  @click="deleteIndex = index"
                />
              </td>
            </tr>
            <tr v-if="expanded.has(group.key) && group.value.rules.length > 0" class="cs-conditions-row">
              <td />
              <td colspan="6">
                <ul class="cs-conditions" data-test="cs-conditions">
                  <li v-for="(rule, ruleIndex) in group.value.rules" :key="ruleIndex" class="cs-condition" data-test="cs-rule-chip">
                    <span v-if="rule.level" class="cs-level">{{ t(`arSetup.clientStandard.rule.levels.${rule.level}`) }}</span>
                    <span class="cs-condition-text">{{ chipText(rule) }}</span>
                    <CustomButton
                      :text="t('arSetup.clientStandard.rule.update')"
                      variant="plain"
                      icon="edit"
                      :show-label="false"
                      :disabled="locked"
                      data-test="cs-rule-edit"
                      @click="openRule(index, ruleIndex)"
                    />
                    <CustomButton
                      :text="t('arSetup.common.delete')"
                      variant="plain"
                      icon="cross"
                      :show-label="false"
                      :disabled="locked"
                      data-test="cs-rule-remove"
                      @click="removeRule(index, ruleIndex)"
                    />
                  </li>
                </ul>
              </td>
            </tr>
          </tbody>
        </template>
      </table>
    </div>
    <CustomButton
      class="cs-add"
      :text="t('arSetup.clientStandard.addGroup')"
      variant="plain"
      icon="plus"
      :disabled="locked"
      data-test="cs-add-group"
      @click="addGroup"
    />
    <div v-if="anyErrors" class="alert alert-danger mb-0" role="alert">{{ t('arSetup.clientStandard.errors.general') }}</div>
  </template>
  <template #footer>
    <SetupSectionActions :dirty="isDirty" :can-save="canSave" :busy="locked" data-test="cs-actions" @cancel="discard" @save="void saveConfirmation.request()" />
  </template>

  <CustomDialog :visible="deleteIndex !== null" :title="t('arSetup.common.delete')" :show-logo="true" data-test="cs-delete-modal" @close="deleteIndex = null">
    <p class="cs-dialog-text">{{ t('arSetup.clientStandard.deleteBody') }}</p>
    <template #actions>
      <CustomButton :text="t('arSetup.common.delete')" variant="accent" data-test="cs-delete-confirm" @click="removeGroup" />
      <CustomButton :text="t('arSetup.common.cancel')" @click="deleteIndex = null" />
    </template>
  </CustomDialog>

  <CustomDialog :visible="saveConfirmation.visible.value" :title="t('arSetup.clientStandard.saveTitle', { client: clientLabel })" :show-logo="true" data-test="cs-save-modal" @close="saveConfirmation.cancel()">
    <p class="cs-dialog-text">{{ t('arSetup.clientStandard.saveBody') }}</p>
    <template #actions>
      <CustomButton :text="t('arSetup.common.continue')" variant="accent" data-test="cs-save-confirm" @click="saveConfirmation.confirm()" />
      <CustomButton :text="t('arSetup.common.cancel')" @click="saveConfirmation.cancel()" />
    </template>
  </CustomDialog>

  <ClientStandardRuleModal
    v-if="ruleEditor"
    :options="ruleOptions"
    :rule="ruleEditor.rule"
    :rate="rate"
    :currency-code="currencyCode"
    @close="ruleEditor = null"
    @save="onRuleSaved"
  />
</SetupSectionCard>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { CustomButton, CustomDialog, TextInput } from '@ada/design-system'
import { HttpError, SessionExpiredError } from '@/api/http'
import { POLL_INTERVAL_MS } from '@/composables/useVersionStatusPoll'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import {
  clientStandardApi,
  setupApi,
  type ClientStandardBehavior,
  type ClientStandardGroup,
  type ClientStandardRule,
  type RuleOption,
} from '../../api'
import {
  NEW_GROUP_DAYS,
  groupBadge,
  hasErrors,
  nextGroupName,
  numericValue,
  ruleChipText,
  usdToDisplay,
  validateGroup,
} from '../../utils/clientStandardRules'
import { pillStyle } from '../../utils/groupPills'
import { MAX_UNREAD_RETRIES, useSetupLock } from '../../composables/useSetupLock'
import { registerSetupSection } from '../../composables/useSetupSections'
import { useSaveConfirmation } from '../../composables/useSaveConfirmation'
import SetupSectionActions from '../SetupSectionActions.vue'
import SetupSectionCard from '../SetupSectionCard.vue'
import ClientStandardRuleModal from './ClientStandardRuleModal.vue'

const BEHAVIORS: ClientStandardBehavior[] = ['lowLimit', 'highLimit', 'exactNumber', 'onlyReference']
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
/** The message of each refused save; anything else is the generic save error. */
const SAVE_REFUSALS: Record<number, string> = { 404: 'groupGone', 409: 'recalculatingRefused' }

interface DraftGroup {
  key: number
  value: ClientStandardGroup
}

/**
 * AB#20760 (#20746): the "{Client name} Standard" tab in the client's redesign - one table of
 * groups in priority order (drag the ≡ handle to reorder, AC-07): badge, name, days, behavior and
 * a conditions summary whose chevron unfolds every condition to edit or remove; the sliders icon
 * adds one in ClientStandardRuleModal. Add (Group{n}, 15 days, Low Limit, AC-02), delete (AC-08)
 * and one full-replace save that recalculates every sale file (AC-09), both confirmed first.
 * The lock is the company's (#20759): while any of its sale files is calculating the tab stays
 * locked and re-reads the groups until `isRecalculating` clears.
 * Replaces the old "{Company} Policy" panel (AC-12).
 */
export default defineComponent({
  name: 'ClientStandardTab',
  components: { CustomButton, CustomDialog, TextInput, SetupSectionActions, SetupSectionCard, ClientStandardRuleModal },
  emits: ['go-to-payment-terms'],
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const context = useContextStore()
    const currencies = useArCurrenciesStore()
    const lock = useSetupLock()

    const saved = ref<ClientStandardGroup[]>([])
    const groups = ref<DraftGroup[]>([])
    const tabTitle = ref<string | null>(null)
    const ruleOptions = ref<RuleOption[]>([])
    const clientStandardOff = ref(false)
    const loading = ref(true)
    const loadError = ref(false)
    const saving = ref(false)
    const companyRecalculating = ref(false)
    let companyPoll: ReturnType<typeof setTimeout> | undefined
    let companyPollFailures = 0
    let unmounted = false
    const toast = useToast()
    const deleteIndex = ref<number | null>(null)
    const ruleEditor = ref<{ groupIndex: number; ruleIndex: number | null; rule: ClientStandardRule | null } | null>(null)
    const expanded = reactive(new Set<number>())
    const dragFrom = ref<number | null>(null)
    const dragOver = ref<number | null>(null)
    const dragHandleActive = ref(false)
    let nextKey = 1

    const clientLabel = computed(() => tabTitle.value?.replace(/ Standard$/, '') ?? context.companyName ?? t('arSetup.tabs.clientStandardFallback'))
    const rate = computed(() => currencies.currency || 1)
    const currencyCode = computed(() => currencies.selectedCurrency)
    const locked = computed(() => lock.locked.value || saving.value || companyRecalculating.value)
    const draftGroups = computed(() => groups.value.map((group) => group.value))
    const errorsOf = (index: number) => validateGroup(groups.value[index].value)
    const anyErrors = computed(() => draftGroups.value.some((group) => hasErrors(validateGroup(group))))
    const isDirty = computed(() => JSON.stringify(draftGroups.value) !== JSON.stringify(saved.value))
    const canSave = computed(() => isDirty.value && !anyErrors.value && !locked.value)

    const toDraft = (list: ClientStandardGroup[]) => list.map((group) => ({ key: nextKey++, value: clone(group) }))
    const optionOf = (field: string) => ruleOptions.value.find((option) => option.field === field)
    const formatNumber = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })

    function chipText(rule: ClientStandardRule): string {
      const option = optionOf(rule.field)
      return ruleChipText(rule, option, t, (value) => {
        const number = option?.type === 'number' ? numericValue(value) : null
        if (number === null) return String(value ?? '')
        return option?.isMoney ? `${formatNumber(usdToDisplay(number, rate.value))} ${currencyCode.value}` : formatNumber(number)
      })
    }

    async function load(): Promise<void> {
      const companyUuid = context.companyUuid
      const versionId = context.saleFileVersionId
      if (!companyUuid) return
      const isStale = () => context.companyUuid !== companyUuid || context.saleFileVersionId !== versionId
      loading.value = true
      loadError.value = false
      try {
        const [response, options] = await Promise.all([
          clientStandardApi.fetchGroups(companyUuid),
          clientStandardApi.fetchRuleOptions(companyUuid, versionId),
        ])
        if (isStale()) return
        tabTitle.value = response.tabTitle
        saved.value = response.groups
        setCompanyRecalculating(response.isRecalculating)
        groups.value = toDraft(response.groups)
        ruleOptions.value = options
        expanded.clear()
      } catch (error) {
        if (error instanceof SessionExpiredError || isStale()) return
        loadError.value = true
      } finally {
        // A stale answer must not end the newer request's loading state.
        if (!isStale()) loading.value = false
      }
    }

    function stopCompanyPoll(): void {
      if (companyPoll !== undefined) clearTimeout(companyPoll)
      companyPoll = undefined
    }

    /** Locks the tab while the company calculates, re-reading the groups until it finishes. */
    function setCompanyRecalculating(value: boolean): void {
      if (!value) companyPollFailures = 0
      companyRecalculating.value = value
      stopCompanyPoll()
      if (value && !unmounted) companyPoll = setTimeout(() => void pollCompany(), POLL_INTERVAL_MS)
    }

    async function pollCompany(): Promise<void> {
      const companyUuid = context.companyUuid
      if (!companyUuid) return
      try {
        const response = await clientStandardApi.fetchGroups(companyUuid)
        if (unmounted || context.companyUuid !== companyUuid) return
        companyPollFailures = 0
        if (response.isRecalculating) setCompanyRecalculating(true)
        else {
          companyRecalculating.value = false
          void load()
        }
      } catch (error) {
        // A failed read keeps the tab locked and retries a bounded number of times (a blip cannot
        // unlock it, an outage cannot poll forever); the next load or Setup unlock reads it again.
        if (unmounted || error instanceof SessionExpiredError || context.companyUuid !== companyUuid) return
        companyPollFailures++
        if (companyPollFailures < MAX_UNREAD_RETRIES) setCompanyRecalculating(true)
        else stopCompanyPoll()
      }
    }

    /** AC-12: Client Standard turned off for this sale file → the groups are saved but not applied. */
    async function loadStrategyState(): Promise<void> {
      const versionId = context.saleFileVersionId
      if (versionId === null) return
      try {
        const response = await setupApi.fetchSetupStrategies(versionId)
        clientStandardOff.value = response.strategies.find((s) => s.key === 'clientStandard')?.allowed === false
      } catch {
        clientStandardOff.value = false
      }
    }

    function onDaysInput(index: number, raw: string): void {
      groups.value[index].value.paymentTerms = raw === '' || raw === null ? Number.NaN : Number(raw)
    }

    function toggleConditions(key: number): void {
      if (expanded.has(key)) expanded.delete(key)
      else expanded.add(key)
    }

    function addGroup(): void {
      groups.value.push({
        key: nextKey++,
        value: { name: nextGroupName(draftGroups.value), paymentTerms: NEW_GROUP_DAYS, behavior: 'lowLimit', rules: [] },
      })
    }

    function removeGroup(): void {
      if (deleteIndex.value !== null) groups.value.splice(deleteIndex.value, 1)
      deleteIndex.value = null
    }

    function onDragStart(index: number): void {
      dragFrom.value = index
    }

    function onDrop(index: number): void {
      const from = dragFrom.value
      if (from !== null && from !== index) {
        const [moved] = groups.value.splice(from, 1)
        groups.value.splice(index, 0, moved)
      }
      onDragEnd()
    }

    function onDragEnd(): void {
      dragFrom.value = null
      dragOver.value = null
    }

    function openRule(groupIndex: number, ruleIndex: number | null): void {
      const rule = ruleIndex === null ? null : clone(groups.value[groupIndex].value.rules[ruleIndex])
      ruleEditor.value = { groupIndex, ruleIndex, rule }
    }

    /** The modal hands back the rule already in USD (it converts only what it edited, AC-06). */
    function onRuleSaved(rule: ClientStandardRule): void {
      const editor = ruleEditor.value
      if (!editor) return
      const target = groups.value[editor.groupIndex]
      if (editor.ruleIndex === null) target.value.rules.push(rule)
      else target.value.rules.splice(editor.ruleIndex, 1, rule)
      expanded.add(target.key)
      ruleEditor.value = null
    }

    function removeRule(groupIndex: number, ruleIndex: number): void {
      groups.value[groupIndex].value.rules.splice(ruleIndex, 1)
    }

    async function save(): Promise<boolean> {
      const companyUuid = context.companyUuid
      if (!companyUuid || !canSave.value) return false
      saving.value = true
      try {
        const payload = draftGroups.value.map((group) => ({ ...clone(group), name: group.name.trim() }))
        const result = await clientStandardApi.saveGroups(companyUuid, payload)
        // Saved for the company it was sent to; a switch meanwhile already reloaded the tab.
        if (context.companyUuid !== companyUuid) return true
        const stored = result.groups ?? payload
        saved.value = clone(stored)
        groups.value = toDraft(stored)
        if (result.recalculationQueued) {
          toast.success(t('arSetup.clientStandard.saved'))
          lock.startAfterSave()
        }
        return true
      } catch (error) {
        if (error instanceof SessionExpiredError) return false
        const status = error instanceof HttpError ? error.status : null
        // 404: a group was deleted meanwhile (EF-5), so the tab reloads the stored set.
        const key = (status !== null && SAVE_REFUSALS[status]) || 'saveError'
        toast.error(t(`arSetup.clientStandard.${key}`))
        if (status === 409) setCompanyRecalculating(true)
        if (status === 404) void load()
        return false
      } finally {
        saving.value = false
      }
    }

    // Footer Save and the unsaved-changes prompt's Save both confirm first (AC-10).
    const saveConfirmation = useSaveConfirmation(save)

    function discard(): void {
      groups.value = toDraft(saved.value)
      expanded.clear()
    }

    registerSetupSection('client-standard', { isDirty, save: saveConfirmation.request, discard })
    lock.onUnlocked(() => {
      void load()
      void loadStrategyState()
    })
    // The rule options are per sale file version, so a version switch reloads them too.
    watch(() => [context.companyUuid, context.saleFileVersionId], () => {
      setCompanyRecalculating(false)
      void load()
    }, { immediate: true })
    onBeforeUnmount(() => {
      unmounted = true
      stopCompanyPoll()
    })
    watch(() => context.saleFileVersionId, () => void loadStrategyState(), { immediate: true })

    return {
      t, BEHAVIORS, groups, ruleOptions, clientStandardOff, loading, loadError, locked, deleteIndex,
      saveConfirmation, ruleEditor, expanded, dragOver, dragHandleActive, clientLabel, rate, currencyCode, anyErrors,
      isDirty, canSave, errorsOf, chipText, onDaysInput, toggleConditions, addGroup, removeGroup, onDragStart,
      onDrop, onDragEnd, openRule, onRuleSaved, removeRule, discard,
      badge: groupBadge,
      pillStyle,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.cs-table {
  overflow-x: auto;
  border: 1px solid $color-gray-200;
  border-radius: 0.625rem;

  table {
    width: 100%;
    min-width: 56rem;
    border-collapse: collapse;
  }

  th {
    padding: 0.625rem 0.75rem;
    background: $color-gray-50;
    font-size: 0.75rem;
    font-weight: 500;
    color: $color-gray-500;
    text-align: left;
    white-space: nowrap;
  }

  td {
    padding: 0.5rem 0.75rem;
    vertical-align: middle;
  }
}

.cs-group {
  border-top: 1px solid $color-gray-200;

  &.cs-group--drag-over {
    outline: 2px solid $color-brand-500;
    outline-offset: -2px;
  }
}

.cs-col-drag {
  width: 2.25rem;
}

.cs-col-actions {
  width: 5.5rem;
  white-space: nowrap;
}

.cs-drag {
  color: $color-gray-400;
  cursor: grab;

  &.cs-drag--disabled {
    cursor: not-allowed;
  }
}

.cs-pill {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.cs-name {
  width: 9rem;
}

.cs-days {
  width: 7rem;
}

.cs-input--invalid :deep(.k-input) {
  border-color: $color-error-600;
}

.cs-error {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: $color-error-600;
}

.cs-behavior {
  padding: 0 1.25rem 0 0;
  border: 0;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-gray-700;
}

.cs-hint {
  font-size: 0.75rem;
  color: $color-gray-500;
}

.cs-conditions-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  max-width: 22rem;
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.875rem;
  color: $color-gray-500;

  i {
    font-size: 0.6875rem;
  }
}

.cs-conditions-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $color-gray-700;
}

.cs-more {
  padding: 0 0.375rem;
  border-radius: 0.5rem;
  background: $color-gray-100;
  font-size: 0.75rem;
}

.cs-conditions-row td {
  padding-top: 0;
}

.cs-conditions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: $color-gray-50;
  list-style: none;
}

.cs-condition {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: $color-gray-700;
}

.cs-condition-text {
  flex: 1;
  min-width: 0;
}

.cs-level {
  padding: 0 0.375rem;
  border-radius: 0.375rem;
  background: $color-indigo-100;
  color: $color-indigo-700;
  font-size: 0.75rem;
  font-weight: 500;
}

.cs-add {
  align-self: flex-start;
}

.cs-dialog-text {
  margin: 0;
  text-align: center;
  color: $color-gray-500;
}
</style>
