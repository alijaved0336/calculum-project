<template>
<SetupSectionCard :title="t('arSetup.harmonization.title')" :description="t('arSetup.harmonization.description')">
  <div v-if="loadError" class="alert alert-danger mb-0" role="alert">{{ t('arSetup.harmonization.loadError') }}</div>
  <div v-else-if="loading" class="text-gray-500">…</div>
  <template v-else>
    <div class="harmonization__switch">
      <ToggleSwitch
        :key="switchKey"
        :model-value="enabled"
        :disabled="locked"
        :aria-label="t('arSetup.harmonization.apply')"
        data-test="harmonization-switch"
        @update:model-value="onToggle"
      />
      <span class="harmonization__switch-label">{{ t('arSetup.harmonization.apply') }}</span>
      <TooltipButton :text="t('arSetup.harmonization.applyTooltip')" />
    </div>

    <div v-if="enabled" class="harmonization__config" data-test="harmonization-config">
      <span class="harmonization__config-title">{{ t('arSetup.harmonization.configuration') }}</span>
      <div class="harmonization__rounding">
        <CustomSelect
          :model-value="roundOnLabel"
          :data-items="roundOnLabels"
          :label="t('arSetup.harmonization.rounding')"
          :disabled="locked"
          data-test="harmonization-rounding"
          @update:model-value="onRoundOn"
        />
      </div>
      <div class="harmonization__table">
        <table>
          <thead>
            <tr>
              <th>{{ t('arSetup.harmonization.groupsHeader') }}</th>
              <th>{{ t('arSetup.harmonization.daysHeader') }}</th>
              <th class="harmonization__actions-col" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(group, index) in groups" :key="group.key" data-test="harmonization-row">
              <td><span class="harmonization__pill" :style="pillStyle(index)">{{ label(index, group.days) }}</span></td>
              <td>
                <TextInput
                  :model-value="Number.isFinite(group.days) ? group.days : ''"
                  type="number"
                  :disabled="locked"
                  :class="{ 'harmonization__input--invalid': errors.byIndex[index] }"
                  data-test="harmonization-days"
                  @change="onDaysChange(index, $event)"
                />
                <span v-if="errors.byIndex[index]" class="harmonization__error">{{ t(errors.byIndex[index]!) }}</span>
              </td>
              <td class="harmonization__actions-col">
                <CustomButton
                  :text="t('arSetup.common.delete')"
                  variant="plain"
                  icon="trash"
                  :show-label="false"
                  :disabled="locked"
                  data-test="harmonization-delete"
                  @click="removeGroup(index)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <CustomButton
        class="harmonization__add"
        :text="t('arSetup.harmonization.addGroup')"
        variant="plain"
        icon="plus"
        :disabled="locked || atGroupLimit"
        data-test="harmonization-add"
        @click="addGroup"
      />
      <div v-if="errors.general" class="harmonization__error">{{ t(errors.general) }}</div>
      <div v-else-if="atGroupLimit" class="harmonization__error" data-test="harmonization-limit">{{ t('arSetup.harmonization.maxGroups') }}</div>
    </div>

  </template>
  <template #footer>
    <SetupSectionActions :dirty="isDirty" :can-save="canSave" :busy="locked" data-test="harmonization-actions" @cancel="discard" @save="void saveConfirmation.request()" />
  </template>

  <CustomDialog
    :visible="saveConfirmation.visible.value"
    :title="t('arSetup.harmonization.saveTitle')"
    :show-logo="true"
    data-test="harmonization-save-modal"
    @close="saveConfirmation.cancel()"
  >
    <p class="harmonization__dialog-text">{{ t('arSetup.harmonization.saveBody') }}</p>
    <template #actions>
      <CustomButton :text="t('arSetup.common.continue')" variant="accent" data-test="harmonization-save-confirm" @click="saveConfirmation.confirm()" />
      <CustomButton :text="t('arSetup.common.cancel')" @click="saveConfirmation.cancel()" />
    </template>
  </CustomDialog>

  <CustomDialog
    :visible="confirmOff"
    :title="t('arSetup.harmonization.offTitle')"
    :show-logo="true"
    data-test="harmonization-off-modal"
    @close="confirmOff = false"
  >
    <p class="harmonization__dialog-text">{{ t('arSetup.harmonization.offBody', { count: savedState?.groups.length ?? 0 }) }}</p>
    <template #actions>
      <CustomButton :text="t('arSetup.harmonization.offConfirm')" variant="accent" data-test="harmonization-off-confirm" @click="turnOff" />
      <CustomButton :text="t('arSetup.common.cancel')" @click="confirmOff = false" />
    </template>
  </CustomDialog>
</SetupSectionCard>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { CustomButton, CustomDialog, CustomSelect, TextInput, ToggleSwitch, TooltipButton } from '@ada/design-system'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useContextStore } from '@/stores/context'
import { harmonizationApi, type HarmonizationResponse, type HarmonizationRoundOn } from '../api'
import { MAX_HARMONIZATION_GROUPS, harmonizationLabel, validateHarmonizationGroups } from '../utils/harmonizationRules'
import { useSetupLock } from '../composables/useSetupLock'
import { registerSetupSection } from '../composables/useSetupSections'
import { useSaveConfirmation } from '../composables/useSaveConfirmation'
import { pillStyle } from '../utils/groupPills'
import SetupSectionActions from './SetupSectionActions.vue'
import SetupSectionCard from './SetupSectionCard.vue'

const ROUND_ON: HarmonizationRoundOn[] = ['Nearest', 'Up', 'Down']

interface DraftGroup {
  key: number
  days: number
}

/**
 * AB#20733 (#20718): the company's term harmonization, below the strategies on the Payment Terms
 * Reduction tab. Port of AP's HarmonizationComponent without programs or levels: switch, rounding,
 * and the groups grid, sorted ascending and renamed "H{n}, {days}D" on every change (AC-03).
 * Turning it off asks first and deletes every group (AC-08); turning it back on pre-fills the
 * platform defaults (AC-09). Locked with the rest of Setup while the open sale file version
 * recalculates (AC-10; the lock is per version, PM decision on #20718).
 */
export default defineComponent({
  name: 'SetupHarmonizationGroups',
  components: { CustomButton, CustomDialog, CustomSelect, TextInput, ToggleSwitch, TooltipButton, SetupSectionActions, SetupSectionCard },
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const context = useContextStore()
    const lock = useSetupLock()

    const savedState = ref<HarmonizationResponse | null>(null)
    const enabled = ref(true)
    const roundOn = ref<HarmonizationRoundOn>('Nearest')
    const groups = ref<DraftGroup[]>([])
    const loading = ref(true)
    const loadError = ref(false)
    const saving = ref(false)
    const confirmOff = ref(false)
    const switchKey = ref(0)
    const toast = useToast()
    let nextKey = 1

    const locked = computed(() => lock.locked.value || saving.value || savedState.value?.isRecalculating === true)
    const days = computed(() => groups.value.map((group) => group.days))
    const errors = computed(() =>
      enabled.value ? validateHarmonizationGroups(days.value) : { byIndex: [] as (string | undefined)[], general: undefined })
    const isValid = computed(() => !errors.value.general && errors.value.byIndex.every((error) => !error))
    const isDirty = computed(() => {
      const s = savedState.value
      if (!s) return false
      return s.enabled !== enabled.value
        || s.roundOn !== roundOn.value
        || JSON.stringify(s.groups.map((g) => g.days)) !== JSON.stringify(days.value)
    })
    const canSave = computed(() => isDirty.value && isValid.value && !locked.value)
    const atGroupLimit = computed(() => enabled.value && groups.value.length >= MAX_HARMONIZATION_GROUPS)

    const toDraft = (values: number[]) => values.map((value) => ({ key: nextKey++, days: value }))
    const sortGroups = () => {
      groups.value = [...groups.value].sort((a, b) => {
        if (!Number.isFinite(a.days)) return 1
        if (!Number.isFinite(b.days)) return -1
        return a.days - b.days
      })
    }

    function reset(state: HarmonizationResponse): void {
      enabled.value = state.enabled
      roundOn.value = state.roundOn
      groups.value = toDraft(state.groups.map((g) => g.days))
    }

    async function load(): Promise<void> {
      const companyUuid = context.companyUuid
      const versionId = context.saleFileVersionId
      if (!companyUuid) return
      loading.value = true
      loadError.value = false
      try {
        const state = await harmonizationApi.fetchHarmonization(companyUuid, versionId)
        if (context.companyUuid !== companyUuid || context.saleFileVersionId !== versionId) return
        savedState.value = state
        reset(state)
      } catch (error) {
        if (error instanceof SessionExpiredError) return
        loadError.value = true
      } finally {
        loading.value = false
      }
    }

    function onDaysChange(index: number, raw: string): void {
      groups.value[index].days = raw === '' || raw === null ? Number.NaN : Number(raw)
      sortGroups()
    }

    // CustomSelect works on display strings; map them back to the API's roundOn values.
    const roundOnLabels = computed(() => ROUND_ON.map((option) => t(`arSetup.harmonization.roundOn.${option}`)))
    const roundOnLabel = computed(() => t(`arSetup.harmonization.roundOn.${roundOn.value}`))
    function onRoundOn(labelText: string): void {
      const index = roundOnLabels.value.indexOf(labelText)
      if (index >= 0) roundOn.value = ROUND_ON[index]
    }

    function addGroup(): void {
      if (atGroupLimit.value) return
      groups.value = [...groups.value, { key: nextKey++, days: Number.NaN }]
    }

    function removeGroup(index: number): void {
      groups.value = groups.value.filter((_, i) => i !== index)
    }

    function onToggle(checked: boolean): void {
      if (!checked) {
        // AC-08: a saved-on harmonization only turns off once the admin confirms; Cancel keeps it on.
        if (savedState.value?.enabled) {
          confirmOff.value = true
          // The switch stays on until the admin confirms: re-render it so Kendo drops its own toggle.
          switchKey.value += 1
        } else {
          enabled.value = false
        }
        return
      }
      enabled.value = true
      if (groups.value.length === 0) {
        // AC-09: back on with no groups pre-fills the platform defaults.
        groups.value = toDraft(savedState.value?.defaultGroups ?? [])
        roundOn.value = 'Nearest'
      }
    }

    async function submit(input: { enabled: boolean; roundOn: HarmonizationRoundOn; groups: { days: number }[] }): Promise<boolean> {
      const companyUuid = context.companyUuid
      const versionId = context.saleFileVersionId
      if (!companyUuid) return false
      saving.value = true
      try {
        const result = await harmonizationApi.saveHarmonization(companyUuid, versionId, input)
        // Saved for the company/version it was sent to; a switch meanwhile already reloaded the section.
        if (context.companyUuid !== companyUuid || context.saleFileVersionId !== versionId) return true
        savedState.value = {
          ...(savedState.value as HarmonizationResponse),
          enabled: input.enabled,
          roundOn: input.roundOn,
          groups: input.groups.map((g, i) => ({ id: i, days: g.days })),
        }
        reset(savedState.value)
        if (result.inProcess) {
          toast.success(t('arSetup.harmonization.saved'))
          lock.startAfterSave()
        }
        return true
      } catch (error) {
        if (error instanceof SessionExpiredError) return false
        const text = error instanceof HttpError && error.status === 409
          ? t('arSetup.harmonization.recalculatingRefused')
          : t('arSetup.harmonization.saveError')
        toast.error(text)
        if (error instanceof HttpError && error.status === 409) lock.startAfterSave()
        return false
      } finally {
        saving.value = false
      }
    }

    async function save(): Promise<boolean> {
      if (!canSave.value) return false
      return submit({
        enabled: enabled.value,
        roundOn: roundOn.value,
        groups: enabled.value ? [...days.value].sort((a, b) => a - b).map((value) => ({ days: value })) : [],
      })
    }

    async function turnOff(): Promise<void> {
      confirmOff.value = false
      await submit({ enabled: false, roundOn: roundOn.value, groups: [] })
    }

    function discard(): void {
      if (savedState.value) reset(savedState.value)
    }

    // UC step 16: a save recalculates every sale file of the company, so it asks first - from the
    // footer and from the unsaved-changes prompt alike.
    const saveConfirmation = useSaveConfirmation(save)
    registerSetupSection('payment-terms', { isDirty, save: saveConfirmation.request, discard })
    lock.onUnlocked(() => void load())
    // `isRecalculating` is about the version Setup is open on, so a version switch reloads it too.
    watch(() => [context.companyUuid, context.saleFileVersionId], () => void load(), { immediate: true })

    return {
      t, enabled, groups, loading, loadError, locked, errors, isDirty, canSave, atGroupLimit, saveConfirmation,
      confirmOff, switchKey, savedState, roundOnLabels, roundOnLabel, onRoundOn, onToggle, onDaysChange, addGroup,
      removeGroup, save, discard, turnOff,
      label: harmonizationLabel,
      pillStyle,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.harmonization__switch {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.harmonization__switch-label,
.harmonization__config-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-gray-900;
}

.harmonization__config {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid $color-gray-200;
}

.harmonization__rounding {
  max-width: 16rem;
}

.harmonization__table {
  overflow-x: auto;
  border: 1px solid $color-gray-200;
  border-radius: 0.625rem;

  table {
    width: 100%;
    min-width: 30rem;
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
    border-top: 1px solid $color-gray-200;
    vertical-align: middle;
  }
}

.harmonization__actions-col {
  width: 3rem;
}

.harmonization__pill {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.harmonization__error {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: $color-error-600;
}

.harmonization__input--invalid :deep(.k-input) {
  border-color: $color-error-600;
}

.harmonization__add {
  align-self: flex-start;
}

.harmonization__dialog-text {
  margin: 0;
  text-align: center;
  color: $color-gray-500;
}
</style>
