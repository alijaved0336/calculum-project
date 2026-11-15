<template>
  <div class="no-opportunity-notice alert alert-warning mb-3">
    <strong>{{ t('arEntityCard.opportunity.noOpportunity.title') }}</strong>
    <p class="mb-0">{{ reason }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * UC-UI-07 A1: when the buyer is credit-constrained, the ceiling is shown as the binding
 * constraint rather than the buyer appearing to have no opportunity - UC-OPP-12 A1 ("no strategy
 * applies") and A2 ("credit-constrained") are different sentences, and `reason` is whichever one
 * the backend wrote, shown verbatim rather than pattern-matched: `noOpportunityReason` is free
 * text (UC-OPP-12's own domain comment), not a coded reason this component could branch on.
 */
import { useI18n } from 'vue-i18n'

defineProps<{ reason: string }>()

const { t } = useI18n({ useScope: 'global' })
</script>
