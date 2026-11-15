<template>
<SetupSectionCard :title="t('arSetup.cashFlowCalculation.title')" :description="t('arSetup.cashFlowCalculation.description')">
  <div v-if="loadError" class="alert alert-danger mb-0" role="alert">{{ t('arSetup.cashFlowCalculation.loadError') }}</div>
  <div v-else-if="loading" class="text-gray-500">…</div>
  <template v-else>
    <div class="cash-flow-basis" role="radiogroup" :aria-label="t('arSetup.cashFlowCalculation.question')">
      <span class="cash-flow-basis__question">{{ t('arSetup.cashFlowCalculation.question') }}</span>
      <div v-for="option in OPTIONS" :key="option.basis" class="cash-flow-basis__option" :data-test="`basis-${option.basis}`">
        <RadioButton
          v-model="selected"
          :value="option.basis"
          name="cash-flow-basis"
          :label="t(`arSetup.cashFlowCalculation.${option.labelKey}`)"
          :disabled="locked"
        />
        <span class="cash-flow-basis__description">{{ t(`arSetup.cashFlowCalculation.${option.labelKey}Description`) }}</span>
      </div>
    </div>

    <div v-if="stored?.basis === 'Contractual'" class="alert alert-info mb-0" role="note" data-test="pay-on-terms-note">
      {{ t('arSetup.cashFlowCalculation.payOnTermsNote') }}
    </div>

  </template>
  <template #footer>
    <SetupSectionActions :dirty="isDirty" :can-save="canSave" :busy="locked" @cancel="discard" @save="void requestSave()" />
  </template>

  <CustomDialog
    :visible="saveConfirmation.visible.value"
    :title="t('arSetup.cashFlowCalculation.confirmTitle')"
    :show-logo="true"
    data-test="basis-confirm-modal"
    @close="cancelConfirmation"
  >
    <p class="cash-flow-basis__dialog-text" data-test="basis-confirm-text">{{ confirmText }}</p>
    <template #actions>
      <CustomButton :text="t('arSetup.cashFlowCalculation.accept')" variant="accent" data-test="basis-confirm-accept" @click="saveConfirmation.confirm()" />
      <CustomButton :text="t('arSetup.common.cancel')" data-test="basis-confirm-cancel" @click="cancelConfirmation" />
    </template>
  </CustomDialog>
</SetupSectionCard>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { CustomButton, CustomDialog, RadioButton } from '@ada/design-system'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useContextStore } from '@/stores/context'
import { cashFlowBasisApi, type CashFlowBasis, type CashFlowBasisResponse } from '../api'
import { useSetupLock } from '../composables/useSetupLock'
import { registerSetupSection } from '../composables/useSetupSections'
import { useSaveConfirmation } from '../composables/useSaveConfirmation'
import SetupSectionActions from './SetupSectionActions.vue'
import SetupSectionCard from './SetupSectionCard.vue'

/** Contractual first: it is the Receivables default (unlike Payables, where Avg. Days Paid leads). */
const OPTIONS: { basis: CashFlowBasis; labelKey: 'contractual' | 'dso' }[] = [
  { basis: 'Contractual', labelKey: 'contractual' },
  { basis: 'Dso', labelKey: 'dso' },
]

/**
 * AB#20761: the Cash Flow tab's choice of basis for the selected sale file version - Contractual
 * payment terms (default) or Avg. Days Paid (DSO). Port of AP's CashFlow.vue ADP section. Every
 * change asks first, because the server records it and recalculates the whole version (FR-08/09);
 * Cancel puts the stored option back (AF-2). Locked with the rest of Setup while it recalculates.
 */
export default defineComponent({
  name: 'SetupCashFlowCalculation',
  components: { CustomButton, CustomDialog, RadioButton, SetupSectionActions, SetupSectionCard },
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const context = useContextStore()
    const lock = useSetupLock()

    const stored = ref<CashFlowBasisResponse | null>(null)
    const selected = ref<CashFlowBasis>('Contractual')
    const loading = ref(true)
    const loadError = ref(false)
    const saving = ref(false)
    const toast = useToast()

    const locked = computed(() => lock.locked.value || saving.value)
    const isDirty = computed(() => stored.value !== null && selected.value !== stored.value.basis)
    const canSave = computed(() => isDirty.value && !locked.value)
    const confirmText = computed(() => t(selected.value === 'Dso'
      ? 'arSetup.cashFlowCalculation.confirmToDso'
      : 'arSetup.cashFlowCalculation.confirmToContractual'))

    function discard(): void {
      if (stored.value) selected.value = stored.value.basis
    }

    async function load(): Promise<void> {
      const versionId = context.saleFileVersionId
      if (versionId === null) return
      loading.value = true
      loadError.value = false
      try {
        const response = await cashFlowBasisApi.fetchCashFlowBasis(versionId)
        if (context.saleFileVersionId !== versionId) return
        stored.value = response
        selected.value = response.basis
      } catch (error) {
        if (error instanceof SessionExpiredError) return
        loadError.value = true
      } finally {
        loading.value = false
      }
    }

    function refuseNoContractualTerms(): void {
      toast.error(t('arSetup.cashFlowCalculation.noContractualTermsError'))
      discard()
    }

    async function save(): Promise<boolean> {
      const versionId = context.saleFileVersionId
      if (versionId === null || !canSave.value) return false
      const basis = selected.value
      saving.value = true
      try {
        const response = await cashFlowBasisApi.saveCashFlowBasis(versionId, basis)
        // Saved for the version it was sent to; a switch meanwhile already reloaded the section.
        if (context.saleFileVersionId !== versionId) return true
        stored.value = response
        selected.value = response.basis
        toast.success(t('arSetup.cashFlowCalculation.saved'))
        lock.startAfterSave()
        return true
      } catch (error) {
        if (error instanceof SessionExpiredError) return false
        if (error instanceof HttpError && error.status === 409) {
          toast.error(t('arSetup.cashFlowCalculation.recalculatingRefused'))
          lock.startAfterSave()
        } else if (error instanceof HttpError && error.status === 422) {
          refuseNoContractualTerms()
        } else {
          toast.error(t('arSetup.cashFlowCalculation.saveError'))
        }
        return false
      } finally {
        saving.value = false
      }
    }

    const saveConfirmation = useSaveConfirmation(save)

    /**
     * EF-1: only an explicit switch from a stored Dso back to Contractual needs contractual terms;
     * a version left on the default Contractual without them is never refused (it calculates from
     * the Avg. Days Paid fallback). Checked before the dialog so the admin is not asked to confirm
     * a change that cannot happen - from the footer and from the unsaved-changes prompt alike.
     */
    function requestSave(): Promise<boolean> {
      if (!canSave.value) return Promise.resolve(false)
      if (stored.value?.basis === 'Dso' && selected.value === 'Contractual' && !stored.value.hasContractualTerms) {
        refuseNoContractualTerms()
        return Promise.resolve(false)
      }
      return saveConfirmation.request()
    }

    /** AF-2 / AC-07: cancelling the confirmation puts the stored option back. */
    function cancelConfirmation(): void {
      saveConfirmation.cancel()
      discard()
    }

    registerSetupSection('cash-flow', { isDirty, save: requestSave, discard })
    lock.onUnlocked(() => void load())
    watch(() => context.saleFileVersionId, () => {
      void load()
    }, { immediate: true })

    return {
      t, OPTIONS, stored, selected, loading, loadError, locked, isDirty, canSave, confirmText,
      saveConfirmation, requestSave, cancelConfirmation, discard,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.cash-flow-basis {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cash-flow-basis__question {
  font-size: 0.8125rem;
  color: $color-gray-500;
}

.cash-flow-basis__option {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.cash-flow-basis__description {
  // Lines the description up under the label, past the radio itself.
  padding-left: 1.5rem;
  font-size: 0.8125rem;
  color: $color-gray-500;
}

.cash-flow-basis__dialog-text {
  margin: 0;
  text-align: center;
  color: $color-gray-500;
}
</style>
