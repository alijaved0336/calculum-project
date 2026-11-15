<template>
<CalculumModal
  size="xl"
  :title="t('arCustomerCard.opportunity.target.modalTitle')"
  :close-on-overlay-click="!saving"
  @close="onCancel"
>
  <div class="target-modal">
    <!-- While the save/clear request is in flight; an OK answer closes this modal, and the loading
         with it. -->
    <CalculumLoadingAr v-if="saving" modal />

    <label class="target-modal__field">
      <input
        v-model="daysInput"
        class="form-control target-modal__input"
        type="number"
        min="0"
        max="365"
        step="1"
        :placeholder="t('global.targetPaymentTermsD')"
        :disabled="saving"
        data-testid="target-days-input"
      />      
    </label>

    <BodyText
      v-if="errorKey"
      as="div"
      variant="sm"
      class="text-danger mt-2"
      role="alert"
      data-testid="target-error"
    >
      {{ t(errorKey) }}
    </BodyText>

    <!-- Buyer / Parent level: the card's own sale-line grid, in its selectable mode - shown even for
         a single line, so the analyst always sees which lines the target lands on. -->
    <div
      v-if="activeSaleLineId === undefined"
      class="target-modal__lines mt-3"
      data-testid="target-lines"
    >
      <CheckBox
        :model-value="allSelected"
        :indeterminate="someSelected"
        :label="t('arCustomerCard.opportunity.target.selectAllLines', { count: lineTotal ?? 0 })"
        :disabled="saving"
        @update:model-value="onToggleAll"
      />
      <OpportunityListBuyers
        :selection="selection"
        :version-uuid="versionUuid"
        :buyer-id="String(partyId)"
        :role="role"
        :selectable="true"
        height="320px"
        @update:total="lineTotal = $event"
        @update:selection="onSelectionChange"
        @update:filter="gridFilter = $event"
      />
    </div>
  </div>

  <template #footer>
    <div class="d-flex justify-content-end gap-2 w-100">
      <CustomButton :text="t('global.cancel')" variant="plain" :disabled="saving" @click="onCancel" />
      <CustomButton
        :text="t('global.clear')"
        variant="default"
        :disabled="saving"
        data-testid="target-clear"
        @click="onClear"
      />
      <CustomButton
        :text="t('global.save')"
        variant="accent"
        :disabled="saving"
        data-testid="target-save"
        @click="onSave"
      />
    </div>
  </template>
</CalculumModal>
</template>

<script setup lang="ts">
/**
 * AB#20657: "Enter Target Payment Terms (Days)" - AR's port of AP's `ModalPTTarget.vue`, opened
 * from the Customer Card's Payment Terms card (`CustomerCardOpportunityTab`).
 *
 * The analyst types whole days and picks which of the party's sale lines they apply to (all, by
 * default) in the same `OpportunityListBuyers` grid the card shows, here with its "selected"
 * column on. Save stores the target, Clear removes it, both on the selected lines only; the
 * backend then recalculates the version's opportunity, so this modal only reports that the request
 * was accepted (`saved`) and the card takes over watching the recalculation.
 *
 * On the card's Sale Line tab there is nothing to pick: the target goes on that line alone.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { BodyText, CalculumLoadingAr, CheckBox, CustomButton } from '@ada/design-system'
import type { GraphqlGridFilterDescriptor } from '@ada/design-system/components/graphql-grid/types'
import CalculumModal from '@/components/CalculumModal.vue'
import { clearTargetPaymentTerms, saveTargetPaymentTerms, type PartyRole, type TargetPaymentTermsScope } from '@/api'
import { HttpError, SessionExpiredError } from '@/api/http'
import { apolloClient } from '@/services/graphql/apolloClient'
import { fetchOverviewRows, OVERVIEW_ROW_KEYS } from '@/modules/opportunity/data/overviewRows'
import OpportunityListBuyers from './OpportunityListBuyers.vue'
import {
  allLinesSelection,
  buildTargetScope,
  initialTargetInput,
  needsAllLineIds,
  noLinesSelection,
  partySaleLinesQuery,
  selectedLineCount,
  toTelerikFilter,
  validateTargetDays,
  type SaleLineSelection,
} from '../../utils/targetPaymentTerms'

const props = defineProps<{
  versionUuid: string
  partyId: number
  role?: PartyRole
  /** The card's Sale Line tab, when one is open: the target then applies to that line alone. */
  activeSaleLineId?: number
  /** The party's current raw target, pre-filled into the days field (AF-4). */
  initialTarget?: number | null
}>()

const emit = defineEmits<{
  close: []
  /** The request was accepted; `cleared` tells Clear apart from Save for the card's own message. */
  saved: [payload: { cleared: boolean }]
}>()

const { t } = useI18n({ useScope: 'global' })
const toast = useToast()

const daysInput = ref<string | number>(initialTargetInput(props.initialTarget))
const errorKey = ref<string | null>(null)
const saving = ref(false)

const selection = ref<SaleLineSelection>(allLinesSelection())
/** `null` until the grid's first page has reported the party's line count. */
const lineTotal = ref<number | null>(null)
/** The column filters applied in the lines grid - sent as the request's `telerikFilter`. */
const gridFilter = ref<GraphqlGridFilterDescriptor | undefined>(undefined)

const selectedCount = computed(() => selectedLineCount(selection.value, lineTotal.value ?? 0))
const allSelected = computed(() => selection.value.all && selection.value.ids.length === 0)
const someSelected = computed(() => !allSelected.value && selectedCount.value > 0)

function onSelectionChange(next: SaleLineSelection): void {
  selection.value = next
  errorKey.value = null
}

function onToggleAll(checked: boolean): void {
  selection.value = checked ? allLinesSelection() : noLinesSelection()
  errorKey.value = null
}

function onCancel(): void {
  if (!saving.value) {
    emit('close')
  }
}

/**
 * The party's every line id - only asked for when the selection is "all except a few" (see
 * `SaleLineSelection`), the one case where the exceptions have to be taken out of a full list.
 */
async function fetchAllLineIds(): Promise<number[]> {
  // Same filters as the grid, so the exceptions come out of the population the analyst saw.
  const query = partySaleLinesQuery(props.partyId, props.role, gridFilter.value)
  const key = OVERVIEW_ROW_KEYS.saleLines
  const page = await fetchOverviewRows(apolloClient, 'saleLines', props.versionUuid, [key], {
    skip: 0,
    take: Math.max(lineTotal.value ?? 0, 1),
    order: [{ volume: 'DESC' }],
    where: query?.where ?? null,
    customFilters: query?.customFilters ?? [],
  })
  return page.items.map((row) => Number((row as Record<string, unknown>)[key]))
}

async function resolveScope(): Promise<TargetPaymentTermsScope | null> {
  const allIds = props.activeSaleLineId === undefined && needsAllLineIds(selection.value)
    ? await fetchAllLineIds()
    : undefined
  const result = buildTargetScope({
    role: props.role,
    activeSaleLineId: props.activeSaleLineId,
    selection: selection.value,
    total: lineTotal.value ?? 0,
    allIds,
  })
  if (!result.ok) {
    errorKey.value = 'arCustomerCard.opportunity.target.noLineSelected'
    return null
  }
  // The card's Sale Line tab never shows the grid, so it has no filters of its own to send.
  const filter = props.activeSaleLineId === undefined ? gridFilter.value : undefined
  return { ...result.scope, partyId: props.partyId, telerikFilter: toTelerikFilter(filter) }
}

/** Maps a refusal onto the message the use case names for it (EF-1, EF-3, EF-4, EF-5). */
function failureKey(error: unknown, cleared: boolean): string | null {
  if (error instanceof SessionExpiredError) {
    return null
  }
  if (error instanceof HttpError) {
    if (error.status === 400) return 'arCustomerCard.opportunity.target.invalidValue'
    if (error.status === 409) return 'arCustomerCard.opportunity.target.recalculating'
    if (error.isForbidden) return 'arCustomerCard.opportunity.target.forbidden'
  }
  return cleared ? 'arCustomerCard.opportunity.target.clearError' : 'arCustomerCard.opportunity.target.saveError'
}

async function submit(request: (scope: TargetPaymentTermsScope) => Promise<void>, cleared: boolean): Promise<void> {
  saving.value = true
  try {
    const scope = await resolveScope()
    if (scope === null) return
    await request(scope)
    toast.success(t(cleared ? 'arCustomerCard.opportunity.target.cleared' : 'arCustomerCard.opportunity.target.saved'))
    emit('saved', { cleared })
  } catch (error) {
    // EF-5: the window stays open with the reason, so nothing typed is lost - told both inside it
    // and as a toast, like the success.
    errorKey.value = failureKey(error, cleared)
    if (errorKey.value) toast.error(t(errorKey.value))
  } finally {
    saving.value = false
  }
}

async function onSave(): Promise<void> {
  errorKey.value = null
  const days = validateTargetDays(daysInput.value)
  if (!days.ok) {
    errorKey.value = 'arCustomerCard.opportunity.target.invalidValue'
    return
  }
  await submit((scope) => saveTargetPaymentTerms(props.versionUuid, props.partyId, { ...scope, value: days.value }), false)
}

async function onClear(): Promise<void> {
  errorKey.value = null
  await submit((scope) => clearTargetPaymentTerms(props.versionUuid, props.partyId, scope), true)
}
</script>

<style scoped lang="scss">
.target-modal__field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.target-modal__input {
  max-width: 350px;
}

.target-modal__lines {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
