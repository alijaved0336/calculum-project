<template>
<ContentBox>
  <template v-slot:header-title>
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <h5 class="mb-0">{{ t('arCustomerCard.strategyResults.title') }}</h5>
      <CustomBadge
        variant="warning"
        :text="t('arCustomerCard.strategyResults.provisional')"
      />
    </div>
  </template>

  <ContentBoxBody>
    <p class="text-muted mb-3">{{ t('arCustomerCard.strategyResults.description') }}</p>

    <NoDataAvailable
      v-if="strategyBreakdown === null"
      :title="t('arCustomerCard.strategyResults.notCalculated')"
    />

    <NoDataAvailable
      v-else-if="rows.length === 0"
      :title="t('arCustomerCard.strategyResults.noStrategyApplied')"
    />

    <div v-else>
      <div
        v-for="row in rows"
        :key="row.strategy"
        class="strategy-results-row pb-3 mb-3 border-bottom"
      >
        <div class="d-flex align-items-center gap-2 mb-2">
          <CustomBadge
            v-if="row.isWinner"
            variant="success"
            :text="t('arCustomerCard.strategyResults.winner')"
          />
          <h6 class="mb-0">{{ row.displayName }}</h6>
        </div>

        <dl class="row mb-0">
          <dt class="col-6 text-muted">{{ t('arCustomerCard.strategyResults.proposedTerm') }}</dt>
          <dd class="col-6 text-end">
            <!-- A null term is the strategy declining to apply, not a zero-day term - its
                 applicabilityReason goes where the term would be. -->
            <span v-if="row.proposedTerm !== null">{{ formatDays(row.proposedTerm, t) }}</span>
            <span v-else>{{ row.applicabilityReason ?? notAvailable }}</span>
          </dd>

          <dt class="col-6 text-muted">{{ t('arCustomerCard.strategyResults.selectionOutcome') }}</dt>
          <dd class="col-6 text-end">
            <span v-if="row.selectionOutcome !== null">{{ formatSelectionOutcome(row.selectionOutcome, t) }}</span>
            <span v-else>{{ notAvailable }}</span>
          </dd>

          <template v-for="input in row.inputRows" :key="input.key">
            <dt class="col-6 text-muted">{{ input.label }}</dt>
            <dd class="col-6 text-end">{{ input.value }}</dd>
          </template>
        </dl>
      </div>
    </div>
  </ContentBoxBody>
</ContentBox>
</template>

<script setup lang="ts">
/** UC-UI-13's strategy panel on the AR Customer Card: what every strategy proposed for this
 * buyer and the distribution behind it, straight off the intermediate tables the strategy chain
 * itself wrote - never the summary facts already shown in the four boxes above. Reuses
 * `deriveStrategyRows` (the entity card's own winner rule, UC-UI-07) for which row is the winner
 * and `deriveStrategyResultRow`/`deriveInputRows` for everything else, so this component makes no
 * formatting or key-ordering decision of its own - a strategy family this front end has never
 * seen still renders end to end with no change here. */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CustomBadge, ContentBox, ContentBoxBody, NoDataAvailable } from '@ada/design-system'
import type { BuyerCardStrategyResultDto } from '@/api'
import { formatDays } from '@/modules/entityCard/components/opportunity/format'
import { deriveStrategyRows } from '@/modules/entityCard/components/opportunity/strategyRows'
import { deriveStrategyResultRow, formatSelectionOutcome, type StrategyResultRow } from '@/modules/buyers/components/customerCard/strategyInputs'

const props = defineProps<{
  strategyBreakdown: BuyerCardStrategyResultDto[] | null
  winningStrategy: string | null
}>()

const { t } = useI18n({ useScope: 'global' })

const notAvailable = computed(() => t('arCustomerCard.notAvailable'))

interface DisplayRow extends StrategyResultRow {
  /** The raw backend identifier. Doubles as the `:key` binding, but it IS also what renders as
   * the row heading (`displayName` is this value verbatim - see `deriveStrategyResultRow`'s own
   * comment for why). Global Constraint 2 forbids the front end branching on which strategy this
   * is, not displaying its name - this panel exists so an engineer can paste the identifier
   * straight into a query, which is exactly what showing it verbatim is for. */
  strategy: string
  isWinner: boolean
}

const rows = computed<DisplayRow[]>(() => {
  const breakdown = props.strategyBreakdown
  if (breakdown === null) {
    return []
  }
  // deriveStrategyRows walks the same array in the same order, so zipping by index carries no
  // risk of mismatching a row with the wrong winner flag.
  const winnerFlags = deriveStrategyRows(breakdown, props.winningStrategy)
  return breakdown.map((result, index) => ({
    strategy: result.strategy,
    isWinner: winnerFlags[index].isWinner,
    ...deriveStrategyResultRow(result),
  }))
})
</script>
