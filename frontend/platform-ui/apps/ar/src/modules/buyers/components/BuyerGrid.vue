<template>
<Grid
  :data-items="sortedRows"
  :columns="columns"
  :sortable="true"
  :resizable="true"
  :sort="sort"
  :row-render="rowRender"
  @sortchange="onSortChange"
  @rowclick="onRowClick"
>
  <template #name="{ props }">
    <td>
      <div class="d-flex align-items-center gap-2">
        <BuyerLogo :name="props.dataItem.companyName" />
        <BodyText variant="sm">{{ props.dataItem.companyName ?? '—' }}</BodyText>
      </div>
    </td>
  </template>
  <template #creditRating="{ props }">
    <td><BuyerCreditRating :rating="props.dataItem.creditRating" /></td>
  </template>
  <template #creditLimit="{ props }">
    <td class="text-end">
      {{ formatMoney(props.dataItem.creditLimit, currenciesStore.selectedCurrencySymbol) }}
      <!-- @click.stop: same reasoning as BuyerCreditRating's own tooltip - this row opens the
           buyer on click, and the disclaimer trigger must not also fire that navigation. -->
      <TooltipButton
        v-if="props.dataItem.creditLimit !== null"
        @click.stop
        :text="t('arBuyers.table.tooltips.creditLimitDisclaimer')"
      />
    </td>
  </template>
  <template #paymentTerms="{ props }">
    <td class="text-end">{{ formatNumber(props.dataItem.actualPaymentTermsAvg) }}</td>
  </template>
</Grid>
</template>

<script setup lang="ts">
/**
 * The dense, sortable half of UC-UI-05. Same Kendo grid AP uses (G-22) and the same
 * `rowRender`/`rowclick` pattern `CompaniesTab.vue` and `DashboardView.vue` already
 * established in this app - see their own comments for why `trElement.props.class` is the
 * base and why the row element's props are spread rather than replaced.
 */
import { computed, ref } from 'vue'
import { BodyText, TooltipButton } from '@ada/design-system'
import { Grid } from '@progress/kendo-vue-grid'
import type { GridRowClickEvent } from '@progress/kendo-vue-grid'
import { orderBy, type SortDescriptor } from '@progress/kendo-data-query'
import { useI18n } from 'vue-i18n'
import type { BuyerRosterRow } from '../types'
import { formatNumber } from '@/modules/match/utils/format'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoney } from '@/utils/moneyFormatting'
import BuyerLogo from './BuyerLogo.vue'
import BuyerCreditRating from './BuyerCreditRating.vue'

const props = defineProps<{ rows: BuyerRosterRow[] }>()
const emit = defineEmits<{ open: [buyerId: number] }>()
const currenciesStore = useArCurrenciesStore()
const { t } = useI18n({ useScope: 'global' })

const columns = computed(() => [
  { field: 'companyName', title: t('arBuyers.table.name'), cell: 'name' },
  { field: 'country', title: t('arBuyers.table.country'), width: '110px' },
  { field: 'industry', title: t('arBuyers.table.industry'), width: '120px' },
  { field: 'parentName', title: t('arBuyers.table.parent'), width: '160px' },
  { field: 'creditRating', title: t('arBuyers.table.creditRating'), cell: 'creditRating', width: '130px' },
  { field: 'creditLimit', title: t('arBuyers.table.creditLimit'), cell: 'creditLimit', width: '140px' },
  { field: 'actualPaymentTermsAvg', title: t('arBuyers.table.paymentTerms'), cell: 'paymentTerms', width: '140px' },
])

const sort = ref<SortDescriptor[]>([{ field: 'companyName', dir: 'asc' }])
const sortedRows = computed(() => orderBy(props.rows, sort.value))

function onSortChange(event: { sort: SortDescriptor[] }): void {
  sort.value = event.sort
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Kendo's own untyped row-render signature.
function rowRender(h: any, trElement: any, defaultSlots: any) {
  const finalClass = `${trElement.props.class ?? ''} buyer-row--clickable`.trim()
  return h('tr', { ...trElement.props, class: finalClass }, defaultSlots)
}

function onRowClick(event: GridRowClickEvent) {
  emit('open', (event.dataItem as BuyerRosterRow).id)
}
</script>

<style scoped>
:deep(.buyer-row--clickable) {
  cursor: pointer;
}
</style>
