<template>
  <BigNumberTwoCol
    :title="t('arEntityCard.opportunity.paymentTerms.title')"
    :bigNumberTitle="t('arEntityCard.opportunity.paymentTerms.recommended')"
    :bigNumberValue="formatDays(recommendedTerm, t)"
    :listOfSecondaryItems="secondaryItems"
  />
</template>

<script setup lang="ts">
/**
 * AC-01: the buyer's contractual, actual and recommended ("PT Opportunity") terms. Recommended
 * is the headline figure - it IS the opportunity UC-UI-07's basic flow renders first - with
 * contractual and actual as the comparison it moves from.
 *
 * `currentTerm` is not one of AC-01's three named fields, but SupplierImpactCard's dollar
 * figures beside this one are computed from it (UC-OPP-15 step 1), and it is not always equal
 * to contractualTerm or actualTerm. Shown here so the two panels' numbers reconcile rather than
 * silently disagreeing on what "the move" starts from (found by code review).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BigNumberTwoCol } from '@ada/design-system'
import { formatDays } from './format'

const props = defineProps<{
  contractualTerm: number | null
  actualTerm: number | null
  recommendedTerm: number | null
  currentTerm: number | null
}>()

const { t } = useI18n({ useScope: 'global' })

const secondaryItems = computed(() => [
  { title: t('arEntityCard.opportunity.paymentTerms.contractual'), value: formatDays(props.contractualTerm, t) },
  { title: t('arEntityCard.opportunity.paymentTerms.actual'), value: formatDays(props.actualTerm, t) },
  { title: t('arEntityCard.opportunity.paymentTerms.current'), value: formatDays(props.currentTerm, t) },
])
</script>
