<template>
  <BigNumberTwoCol
    :title="t('arEntityCard.opportunity.supplierImpact.title')"
    :bigNumberTitle="t('arEntityCard.opportunity.supplierImpact.cashFlow')"
    :bigNumberValue="formatMoney(cashFlowImpact, currenciesStore.selectedCurrencySymbol)"
    :listOfSecondaryItems="secondaryItems"
  />
</template>

<script setup lang="ts">
/** AC-02: Cash Flow Opportunity, Economic Profit and P&L Impact - the value UC-UI-07's basic
 * flow renders beside the recommended term. Cash Flow Opportunity is the headline figure. */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BigNumberTwoCol } from '@ada/design-system'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoney } from '@/utils/moneyFormatting'

const props = defineProps<{
  cashFlowImpact: number | null
  economicProfitImpact: number | null
  /** "P&L Impact" (UC-OPP-15 step 3). Always null today - no buyer-side financing rate exists
   * anywhere in the AR domain (G-372) - and formatMoney renders that as "—", not $0. */
  economicProfitBuyerImpact: number | null
}>()

const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const secondaryItems = computed(() => [
  { title: t('arEntityCard.opportunity.supplierImpact.economicProfit'), value: formatMoney(props.economicProfitImpact, currenciesStore.selectedCurrencySymbol) },
  { title: t('arEntityCard.opportunity.supplierImpact.plImpact'), value: formatMoney(props.economicProfitBuyerImpact, currenciesStore.selectedCurrencySymbol) },
])
</script>
