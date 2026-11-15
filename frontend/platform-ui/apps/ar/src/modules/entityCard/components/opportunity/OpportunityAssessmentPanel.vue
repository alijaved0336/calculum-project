<template>
  <div>
    <BigNumberTwoCol
      :title="t('arEntityCard.opportunity.assessment.title')"
      :bigNumberTitle="t('arEntityCard.opportunity.assessment.priority')"
      :bigNumberValue="priorityDisplay"
      :listOfSecondaryItems="secondaryItems"
    />

    <!-- UC-UI-07's own requirement, beyond AP's AC-04: the score is explained, not only tiered
         (G-84 - the tier cutoffs were chosen by feel). -->
    <ul v-if="scoreBreakdown.length > 0" class="score-breakdown list-unstyled mt-2 mb-0">
      <li class="text-xs text-muted mb-1">{{ t('arEntityCard.opportunity.assessment.scoreBreakdownTitle') }}</li>
      <li v-for="component in scoreBreakdown" :key="component.component" class="d-flex align-items-center gap-2">
        <CustomBadge
          :text="humanizePascalCase(component.component)"
          :variant="component.isMissing ? 'warning' : 'info'"
        />
        <span class="text-xs">
          {{ component.isMissing ? t('arEntityCard.opportunity.assessment.missingComponent') : component.score }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * AC-04: Priority (the nine-box cell), Probability of Success and Cash Flow Impact tier -
 * Priority is the headline figure, the two component tiers it crosses are the comparison.
 *
 * No `nineBoxCell` prop: the backend's `"{ProbabilityTier}/{CashFlowImpactTier}"` string cannot
 * be translated without re-parsing it apart, and this component already receives both tiers
 * individually - Priority is derived from those, matching the backend's own
 * `NineBoxCell.Of`'s null-guard (both tiers present or neither) rather than duplicating a
 * pre-formatted value down two paths.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BigNumberTwoCol, CustomBadge } from '@ada/design-system'
import { humanizePascalCase } from './humanize'
import { translateTier } from './tiers'
import type { BuyerCardScoreComponentDto } from '@/api'

const props = defineProps<{
  probabilityTier: string | null
  probabilityScore: number | null
  cashFlowImpactTier: string | null
  scoreBreakdown: BuyerCardScoreComponentDto[]
}>()

const { t } = useI18n({ useScope: 'global' })
const notAvailable = computed(() => t('arMatch.progress.notAvailable'))

/**
 * UC-OPP-17 A1, mirrored client-side: null unless both tiers are present - never guessed from
 * one tier alone. Found by review, beyond the flagged formatDays bypass: both tier names are
 * translated here, the same English-bypasses-i18n class of bug as the day suffix.
 *
 * cashFlowImpactTier is translated in its masculine form (found by a second review pass): es.json's
 * tier words are adjectives, and "Nivel" (impact level) is a masculine noun where "Probabilidad"
 * is feminine - the same three words cannot correctly modify both.
 */
const priorityDisplay = computed(() => {
  if (props.probabilityTier === null || props.cashFlowImpactTier === null) {
    return notAvailable.value
  }
  return `${translateTier(props.probabilityTier, t)}/${translateTier(props.cashFlowImpactTier, t, true)}`
})

/** The weighted total beside its own tier ("High (62)") rather than the tier alone - the score
 * is the number the breakdown list below explains (G-84), so showing only the band it landed in
 * would leave that explanation with nothing to point back at. */
const probabilityDisplay = computed(() => {
  if (props.probabilityTier === null) {
    return notAvailable.value
  }
  const tier = translateTier(props.probabilityTier, t)
  return props.probabilityScore === null ? tier : `${tier} (${props.probabilityScore})`
})

const secondaryItems = computed(() => [
  { title: t('arEntityCard.opportunity.assessment.probability'), value: probabilityDisplay.value },
  {
    title: t('arEntityCard.opportunity.assessment.cashFlowImpactTier'),
    value: props.cashFlowImpactTier === null ? notAvailable.value : translateTier(props.cashFlowImpactTier, t, true),
  },
])
</script>
