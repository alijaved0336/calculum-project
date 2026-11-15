<template>
  <CalculumLoadingAr v-if="loadingStatus" />
  <p v-else-if="card.strategyBreakdown === null">
    {{ t('arEntityCard.opportunity.notCalculated', { status: statusLabel }) }}
  </p>
  <div v-else>
    <NoOpportunityNotice
      v-if="card.winningStrategy === null && card.noOpportunityReason !== null"
      :reason="card.noOpportunityReason"
    />

    <div class="row g-3">
      <div class="col-12 col-lg-4">
        <PaymentTermsCard
          :contractualTerm="card.contractualPaymentTermsWithoutCashDiscountsAvg"
          :actualTerm="card.actualPaymentTermsAvg"
          :recommendedTerm="card.recommendedTerm"
          :currentTerm="card.currentTerm"
        />
      </div>
      <div class="col-12 col-lg-4">
        <SupplierImpactCard
          :cashFlowImpact="card.cashFlowImpact"
          :economicProfitImpact="card.economicProfitImpact"
          :economicProfitBuyerImpact="card.economicProfitBuyerImpact"
        />
      </div>
      <div class="col-12 col-lg-4">
        <OpportunityAssessmentPanel
          :probabilityTier="card.probabilityTier"
          :probabilityScore="card.probabilityScore"
          :cashFlowImpactTier="card.cashFlowImpactTier"
          :scoreBreakdown="card.probabilityScoreBreakdown ?? []"
        />
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-12 col-lg-6">
        <StrategyBenchmarksChart :strategyBreakdown="card.strategyBreakdown" />
      </div>
      <div class="col-12 col-lg-6">
        <StrategyList :strategyBreakdown="card.strategyBreakdown" :winningStrategy="card.winningStrategy" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * UC-UI-07: the Entity Card's Opportunity tab. UC-UI-06 A1's not-calculated state is unchanged
 * from this component's original stub; everything past it is new - the four panels ADO #18923
 * names (Payment Terms, Supplier Impact, Benchmarks, Opportunity Assessment), the full strategy
 * list UC-UI-07's own basic flow requires beyond AP's four, and the A1 credit-constrained notice.
 */
import { CalculumLoadingAr } from '@ada/design-system'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchVersionStatus } from '@/api'
import { statusLabelKey } from '@/modules/match/utils/versionStatus'
import type { CustomerCardResponse } from '@/api'
import NoOpportunityNotice from '../opportunity/NoOpportunityNotice.vue'
import PaymentTermsCard from '../opportunity/PaymentTermsCard.vue'
import SupplierImpactCard from '../opportunity/SupplierImpactCard.vue'
import OpportunityAssessmentPanel from '../opportunity/OpportunityAssessmentPanel.vue'
import StrategyBenchmarksChart from '../opportunity/StrategyBenchmarksChart.vue'
import StrategyList from '../opportunity/StrategyList.vue'

const props = defineProps<{
  card: CustomerCardResponse
  versionId: number
}>()

const { t } = useI18n({ useScope: 'global' })

const loadingStatus = ref(false)
const status = ref<string | null>(null)

const statusLabel = computed(() =>
  status.value ? t(statusLabelKey(status.value), status.value) : t('arMatch.progress.notAvailable'),
)

async function loadStatusIfNeeded() {
  if (props.card.strategyBreakdown !== null) {
    // Already computed (even if empty): nothing to name, and asking the version-status endpoint
    // just to throw the answer away would be a request with no caller for its result.
    status.value = null
    return
  }

  loadingStatus.value = true
  try {
    const result = await fetchVersionStatus(props.versionId)
    status.value = result.status
  } catch {
    // Degrades to "Not available" via statusLabel's own fallback - naming the status is a nicety
    // on top of A1's real requirement (say it is not calculated), not something this tab's own
    // failure should block on.
    status.value = null
  } finally {
    loadingStatus.value = false
  }
}

// Two independent sources, not one getter returning an array: the latter constructs a fresh
// array on every re-run, and a fresh array never `===` the previous one, so the watcher would
// fire whenever `props.card` is replaced with a new object at all - even when
// strategyBreakdown/versionId's own values are unchanged - duplicating the fetch (found by code
// review; verified against a real Vue watch before fixing).
watch(
  [() => props.card.strategyBreakdown, () => props.versionId],
  loadStatusIfNeeded,
  { immediate: true },
)
</script>
