<template>
<SetupSectionCard :title="t('arSetup.strategies.title')" :description="t('arSetup.strategies.description')">
  <div v-if="loadError" class="alert alert-danger mb-0" role="alert">{{ t('arSetup.strategies.loadError') }}</div>
  <div v-else-if="loading" class="text-gray-500">…</div>
  <template v-else>
    <div class="strategies">
      <div v-for="(column, index) in columns" :key="index" class="strategies__column">
        <div v-for="strategy in column" :key="strategy.key" class="strategy" :data-test="`strategy-${strategy.key}`">
          <div class="strategy__row">
            <ToggleSwitch
              v-model="strategy.allowed"
              :disabled="locked || !strategy.companyAllowed"
              :aria-label="t(`arSetup.strategies.names.${strategy.key}`)"
              :data-test="`switch-${strategy.key}`"
            />
            <div class="strategy__titles">
              <span class="strategy__name">{{ t(`arSetup.strategies.names.${strategy.key}`) }}</span>
              <span v-if="subtitleOf(strategy)" class="strategy__subtitle">{{ subtitleOf(strategy) }}</span>
              <span
                v-if="strategy.key === 'payOnTerms' && strategy.allowed && contractualBasis"
                class="strategy__subtitle strategy__subtitle--warning"
                data-test="pay-on-terms-basis-badge"
              >
                {{ t('arSetup.cashFlowCalculation.payOnTermsBadge') }}
              </span>
              <span v-if="!strategy.companyAllowed" class="strategy__subtitle strategy__subtitle--warning">
                {{ t('arSetup.strategies.notAvailable', { client: clientName }) }}
              </span>
            </div>
          </div>
          <span v-if="strategy.key === 'peerGroupStandard' && peerGroupError" class="strategy__error" data-test="peer-group-error">
            {{ peerGroupError }}
          </span>
          <SetupMoreSettings
            v-if="hasMoreSettings(strategy)"
            class="strategy__more"
            :disabled="locked"
            :popup="strategy.key === 'peerGroupStandard'"
            :data-test="`more-${strategy.key}`"
            @open="peerGroupOpen = true"
          >
            <template v-if="strategy.key === 'buyerStandard'">
              <RadioButton
                v-for="metric in METRICS"
                :key="metric"
                v-model="strategy.metric"
                :value="metric"
                :name="`metric-${strategy.key}`"
                :label="t(`arSetup.strategies.metric.${metric}`)"
                :disabled="locked"
              />
              <SetupNumberField
                v-model="strategy.minOccurrences"
                :label="t('arSetup.strategies.minOccurrences')"
                :error="errors[`${strategy.key}.minOccurrences`]"
                :disabled="locked"
                data-test="buyer-min-occurrences"
              />
              <div class="strategy__pair">
                <SetupNumberField
                  v-model="strategy.minReductionDays"
                  :label="t('arSetup.strategies.minReductionDays')"
                  :error="errors[`${strategy.key}.minReductionDays`]"
                  :disabled="locked"
                  data-test="buyer-min-reduction"
                />
                <SetupNumberField
                  v-model="strategy.maxReductionDays"
                  :label="t('arSetup.strategies.maxReductionDays')"
                  :error="errors[`${strategy.key}.maxReductionDays`]"
                  :disabled="locked"
                  data-test="buyer-max-reduction"
                />
              </div>
            </template>
            <template v-else-if="strategy.key === 'regulatoryTerms'">
              <span class="strategy__group-label">{{ t('arSetup.strategies.countrySource.title') }}</span>
              <RadioButton
                v-for="source in COUNTRY_SOURCES"
                :key="source"
                v-model="strategy.regulatoryCountrySource"
                :value="source"
                name="regulatory-country"
                :label="t(`arSetup.strategies.countrySource.${source}`)"
                :disabled="locked"
              />
              <span class="strategy__group-label">{{ t('arSetup.strategies.method.title') }}</span>
              <RadioButton
                v-for="method in REGULATORY_METHODS"
                :key="method"
                v-model="strategy.regulatoryMethod"
                :value="method"
                name="regulatory-method"
                :label="t(`arSetup.strategies.method.${method}`)"
                :disabled="locked"
              />
            </template>
            <SetupParentMinSettings
              v-else-if="strategy.key === 'parentBuyerMin'"
              v-model:same-buyer-industry="strategy.sameBuyerIndustry"
              v-model:same-buyer-region="strategy.sameBuyerRegion"
              v-model:volume-percentage="strategy.volumePercentage"
              :error="errors[`${strategy.key}.volumePercentage`]"
              :disabled="locked"
            />
          </SetupMoreSettings>
        </div>
      </div>
    </div>
    <div v-if="allOff" class="alert alert-warning mb-0" role="alert">{{ t('arSetup.strategies.allOffWarning') }}</div>
    <template v-if="!allOff">
      <div v-for="warning in warnings" :key="warning" class="alert alert-warning mb-0" role="alert" data-test="strategies-warning">
        {{ warning }}
      </div>
    </template>
  </template>
  <SetupPeerGroupSettingsModal
    v-if="peerGroupOpen && peerGroup"
    :setting="peerGroup"
    :disabled="locked"
    @save="applyPeerGroup"
    @close="peerGroupOpen = false"
  />
  <template #footer>
    <SetupSectionActions :dirty="isDirty" :can-save="canSave" :busy="locked" data-test="strategies-actions" @cancel="discard" @save="save" />
  </template>
</SetupSectionCard>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useContextStore } from '@/stores/context'
import {
  cashFlowBasisApi,
  fieldErrorsFromWire,
  setupApi,
  type RegulatoryCountrySource,
  type RegulatoryMethod,
  type StrategyMetric,
  type StrategySetting,
  type WireRefusalBody,
} from '../api'
import { allStrategiesOff, validateStrategySettings } from '../utils/strategySettingsRules'
import { useSetupLock } from '../composables/useSetupLock'
import { registerSetupSection } from '../composables/useSetupSections'
import { RadioButton, ToggleSwitch } from '@ada/design-system'
import SetupMoreSettings from './SetupMoreSettings.vue'
import SetupNumberField from './SetupNumberField.vue'
import SetupParentMinSettings from './SetupParentMinSettings.vue'
import SetupPeerGroupSettingsModal, { type PeerGroupSettings } from './SetupPeerGroupSettingsModal.vue'
import SetupSectionActions from './SetupSectionActions.vue'
import SetupSectionCard from './SetupSectionCard.vue'

/** Buyer Standard's choices; Peer Group Standard's five are in its popup. */
const METRICS: StrategyMetric[] = ['AVG', 'Q3', 'Q1']
const COUNTRY_SOURCES: RegulatoryCountrySource[] = ['buyer', 'supplier', 'both']
const REGULATORY_METHODS: RegulatoryMethod[] = ['ONLY_EXCEPTIONS', 'ALL_REGULATIONS', 'NO_LIMITATION']
/** Peer Group Standard opens its settings in a popup (#20824). Client Standard has none. */
const WITH_MORE_SETTINGS = new Set(['buyerStandard', 'peerGroupStandard', 'parentBuyerMin', 'regulatoryTerms'])

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * AB#20702 (impl plan M) + #20717: the nine Receivables strategies of the selected sale file
 * version, each with its switch and, where it applies, More Settings. Saving sends the complete
 * set; a change recalculates the version and locks Setup until it is ready (FR-06..08).
 */
export default defineComponent({
  name: 'SetupStrategies',
  components: {
    RadioButton, ToggleSwitch, SetupMoreSettings, SetupNumberField, SetupParentMinSettings, SetupPeerGroupSettingsModal,
    SetupSectionActions, SetupSectionCard,
  },
  setup() {
    const { t, te } = useI18n({ useScope: 'global' })
    const context = useContextStore()
    const lock = useSetupLock()

    const saved = ref<StrategySetting[]>([])
    const draft = ref<StrategySetting[]>([])
    const loading = ref(true)
    const loadError = ref(false)
    const saving = ref(false)
    const serverErrors = ref<Record<string, string>>({})
    const toast = useToast()
    /** The save response's `warnings[]` (e.g. every strategy off), shown as the API words them. */
    const warnings = ref<string[]>([])
    /**
     * AB#20761 (impl plan P): under the Contractual cash flow basis (the default) Pay on Terms is
     * not calculated, though its switch stays on - the allowance and the basis are independent, as
     * in Payables. Read alongside the strategies so the hint follows the version and the unlock.
     */
    const contractualBasis = ref(false)

    const peerGroupOpen = ref(false)
    const peerGroup = computed(() => draft.value.find((strategy) => strategy.key === 'peerGroupStandard'))
    const clientName = computed(() => context.companyName ?? t('arSetup.tabs.clientStandardFallback'))
    const locked = computed(() => lock.locked.value || saving.value)
    const errors = computed(() => ({ ...validateStrategySettings(draft.value, saved.value), ...serverErrors.value }))
    /**
     * Peer Group's fields live in the popup, so their errors show under the strategy: the backend's
     * refusal, or a stored list the client cannot save (it keeps Save off), never a silent block.
     * The client's errors are i18n keys; the backend's messages are shown as is.
     */
    const peerGroupError = computed(() => {
      const key = Object.keys(errors.value).find((at) => at.startsWith('peerGroupStandard.'))
      if (!key) return null
      const message = errors.value[key]
      return te(message) ? t(message) : message
    })
    const isDirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value))
    const isValid = computed(() => Object.keys(validateStrategySettings(draft.value, saved.value)).length === 0)
    const canSave = computed(() => isDirty.value && isValid.value && !locked.value)
    const allOff = computed(() => draft.value.length > 0 && allStrategiesOff(draft.value))
    // Two independent columns, filled left/right in API order, so an open More settings only pushes its own column.
    const columns = computed(() => [0, 1].map((side) => draft.value.filter((_, index) => index % 2 === side)))

    function subtitleOf(strategy: StrategySetting): string | null {
      if ((strategy.key === 'buyerStandard' || strategy.key === 'peerGroupStandard') && strategy.metric) {
        return t(`arSetup.strategies.metric.${strategy.metric}`)
      }
      if (strategy.key === 'regulatoryTerms' && strategy.regulatoryMethod) return t(`arSetup.strategies.method.${strategy.regulatoryMethod}`)
      return null
    }

    const hasMoreSettings = (strategy: StrategySetting) => WITH_MORE_SETTINGS.has(strategy.key) && strategy.allowed

    /** The popup's Save: the section turns dirty and is saved with the other strategies (FR-7). */
    function applyPeerGroup(settings: PeerGroupSettings): void {
      if (!peerGroup.value) return
      Object.assign(peerGroup.value, settings)
      serverErrors.value = Object.fromEntries(Object.entries(serverErrors.value).filter(([at]) => !at.startsWith('peerGroupStandard.')))
    }

    /** A failed read hides the hint rather than failing the strategies section with it. */
    async function loadBasis(versionId: number): Promise<void> {
      try {
        const response = await cashFlowBasisApi.fetchCashFlowBasis(versionId)
        if (context.saleFileVersionId === versionId) contractualBasis.value = response.basis === 'Contractual'
      } catch {
        if (context.saleFileVersionId === versionId) contractualBasis.value = false
      }
    }

    async function load(): Promise<void> {
      const versionId = context.saleFileVersionId
      if (versionId === null) return
      void loadBasis(versionId)
      loading.value = true
      loadError.value = false
      try {
        const response = await setupApi.fetchSetupStrategies(versionId)
        if (context.saleFileVersionId !== versionId) return
        saved.value = response.strategies
        draft.value = clone(response.strategies)
        serverErrors.value = {}
      } catch (error) {
        // A previous version's failure must not cover the current one's settings.
        if (error instanceof SessionExpiredError || context.saleFileVersionId !== versionId) return
        loadError.value = true
      } finally {
        // A previous version's request must not end the current one's loading.
        if (context.saleFileVersionId === versionId) loading.value = false
      }
    }

    async function save(): Promise<boolean> {
      const versionId = context.saleFileVersionId
      if (versionId === null || !canSave.value) return false
      saving.value = true
      warnings.value = []
      serverErrors.value = {}
      try {
        const result = await setupApi.saveSetupStrategies(versionId, clone(draft.value))
        // Saved for the version it was sent to; a switch meanwhile already reloaded the section.
        if (context.saleFileVersionId !== versionId) return true
        saved.value = clone(draft.value)
        warnings.value = result.warnings ?? []
        if (result.changes > 0) {
          toast.success(t('arSetup.strategies.saved'))
          lock.startAfterSave()
        }
        return true
      } catch (error) {
        if (error instanceof SessionExpiredError) return false
        if (error instanceof HttpError && error.status === 409) {
          toast.error(t('arSetup.strategies.recalculatingRefused'))
          lock.startAfterSave()
        } else if (error instanceof HttpError && error.status === 400) {
          serverErrors.value = fieldErrorsFromWire(error.jsonBody<WireRefusalBody>())
        } else if (error instanceof HttpError && error.status === 422) {
          toast.error(t('arSetup.strategies.companyRefused', { client: clientName.value }))
        } else {
          toast.error(t('arSetup.strategies.saveError'))
        }
        return false
      } finally {
        saving.value = false
      }
    }

    function discard(): void {
      draft.value = clone(saved.value)
      serverErrors.value = {}
      peerGroupOpen.value = false
    }

    registerSetupSection('payment-terms', { isDirty, save, discard })
    lock.onUnlocked(() => void load())
    watch(() => context.saleFileVersionId, () => {
      warnings.value = []
      void load()
    }, { immediate: true })

    return {
      t, draft, columns, loading, loadError, locked, errors, isDirty, canSave, allOff, warnings, clientName, contractualBasis,
      METRICS, COUNTRY_SOURCES, REGULATORY_METHODS, subtitleOf, hasMoreSettings, save, discard,
      peerGroup, peerGroupOpen, peerGroupError, applyPeerGroup,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.strategies {
  display: flex;
  align-items: flex-start;
  gap: 3rem;
}

.strategies__column {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.strategy {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.strategy__row {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.strategy__titles {
  display: flex;
  flex-direction: column;
}

.strategy__name {
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-gray-900;
}

.strategy__subtitle {
  font-size: 0.75rem;
  color: $color-gray-500;
}

.strategy__subtitle--warning {
  color: $color-warning-700;
}

.strategy__error {
  margin-left: 2.875rem;
  font-size: 0.75rem;
  color: $color-error-600;
}

.strategy__more {
  margin-left: 2.875rem;
}

.strategy__group-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-gray-500;
}

.strategy__pair {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
