<template>
<ContentBox>
  <template v-slot:header-title>
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <h5 class="mb-0">{{ t('arCustomerCard.lines.title') }}</h5>
      <CustomBadge variant="warning" :text="t('arCustomerCard.lines.provisional')" />
    </div>
  </template>

  <ContentBoxBody>
    <CalculumLoadingAr v-if="loading" />

    <!--
      A failed load is NOT the empty state, and this branch has to come FIRST: a rejected request
      leaves `page` on its initial `{ total: 0, lines: [] }`, so without it a network error, a 500
      or a 403 would all render "this buyer has no sale lines" - a claim about the data, made out of
      a failure to read the data. That is the same conflation these panels exist to expose one layer
      down, and `SaleLineDetailView` already keeps the two apart.
    -->
    <NoDataAvailable v-else-if="loadError" :title="t('arCustomerCard.lines.loadError')" message="" />

    <!--
      Same rule as MatchesTab's own empty state, and the same reason: this replaces the grid ONLY
      when the buyer has no lines at all (page.total === 0), never merely because the current page
      came back empty. Collapsing the two would take the pager away from someone who paged past the
      last row, leaving them nothing to click and no way back to page 1.
    -->
    <NoDataAvailable v-else-if="!page.total" :title="t('arCustomerCard.lines.empty')" message="" />

    <Grid
      v-else
      :data-items="page.lines"
      :columns="columns"
      :pageable="pageable"
      :resizable="true"
      :total="page.total"
      :skip="skip"
      :take="page.pageSize"
      :row-render="rowRender"
      @pagechange="onPageChange"
      @rowclick="onRowClick"
    >
      <template #startDate="{ props }">
        <td>{{ formatDate(props.dataItem.startDate) }}</td>
      </template>
      <template #endDate="{ props }">
        <td>{{ formatDate(props.dataItem.endDate) }}</td>
      </template>
      <template #currency="{ props }">
        <td><CustomBadge :text="props.dataItem.currency ?? '—'" variant="info" /></td>
      </template>
      <!--
        `symbolForCode(props.dataItem.currency)`, NOT `currenciesStore.selectedCurrencySymbol`
        (PR 14881 review): this row's own `volume` is denominated in ITS OWN `currency` (the badge
        to the left), unconverted. Prefixing it with the globally selected display currency's
        symbol would mislabel every line whose own currency differs from that selection.
      -->
      <template #volume="{ props }">
        <td class="text-end">{{ formatMoney(props.dataItem.volume, currenciesStore.symbolForCode(props.dataItem.currency)) }}</td>
      </template>
      <template #contractual="{ props }">
        <td class="text-end">{{ props.dataItem.contractualPaymentTermsWithoutCashDiscounts ?? '—' }}</td>
      </template>
    </Grid>
  </ContentBoxBody>
</ContentBox>
</template>

<script setup lang="ts">
/**
 * UC-UI-13's third provisional surface on the AR Customer Card: the buyer's own sale lines, so an
 * analyst looking at the strategy panel above can ask which spends stood behind those figures. A
 * row click opens that line's own detail (below).
 *
 * Modelled on `MatchesTab`, and for the same two reasons that component's own header comment
 * gives:
 *
 * - Paging stays SERVER-side, through `fetchBuyerLines` and the shared `pageRequestFromGridEvent`.
 *   A buyer can carry thousands of lines, so loading them all to let the grid page them locally
 *   would trade a working screen for a convenient one. `skip` is derived from the page SIZE THE
 *   RESPONSE CARRIES, not the one requested - the pager describes the rows on screen, and those
 *   are the rows the server chose to send, which can differ from the request once a size is
 *   clamped (see `../../paging`'s own doc for the exact invariant this leans on).
 *
 * - Sorting stays OFF. The grid can only sort the page it holds, and a sort of 50 rows presented
 *   as a sort of the buyer's lines is an answer that looks right and is not.
 *
 * No strategy figure appears in any column here, and none should be added: a column per strategy
 * in a surface promised generic over the tables (ADR-0012) is exactly what would force this grid
 * rewritten for every further strategy family (UC-OPP-30/32/34 and beyond). To see what a
 * strategy produced for one line, open that line's own detail - the row click below opens exactly
 * that, which is why this grid needed no strategy column of its own to begin with.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, ContentBox, ContentBoxBody, CustomBadge, NoDataAvailable } from '@ada/design-system'
import { Grid } from '@progress/kendo-vue-grid'
import type { GridRowClickEvent } from '@progress/kendo-vue-grid'
import { fetchBuyerLines, type LinesPageResponse, type SaleLineRow } from '@/api'
import { pageRequestFromGridEvent, pageSizes } from '@/modules/match/paging'
import { formatDate } from '@/modules/match/utils/format'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoney } from '@/utils/moneyFormatting'
import * as MatchRouting from '@/modules/match/MatchRouting'

const props = defineProps<{ versionId: number; buyerId: number }>()
const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const loading = ref(true)
const page = ref<LinesPageResponse>({ total: 0, page: 1, pageSize: 25, lines: [] })
const loadError = ref(false)

// Same derivation, same reason, as MatchesTab's own `skip` - the pager describes the rows the
// server actually sent, not the size this component last asked for.
const skip = computed(() => (page.value.page - 1) * page.value.pageSize)

const pageable = { buttonCount: 5, pageSizes, info: true }

const columns = computed(() => [
  // The only way into a line's own detail is this grid's row click, so the id has to be visible
  // here - otherwise a reader can see the line that does not add up but cannot name it, let alone
  // build a link to it, when the row itself isn't in front of them.
  { field: 'id', title: t('arCustomerCard.lines.table.id'), width: '80px' },
  { field: 'year', title: t('arCustomerCard.lines.table.year'), width: '90px' },
  { field: 'periodInMonths', title: t('arCustomerCard.lines.table.period'), width: '110px' },
  { field: 'startDate', title: t('arCustomerCard.lines.table.startDate'), cell: 'startDate', width: '130px' },
  { field: 'endDate', title: t('arCustomerCard.lines.table.endDate'), cell: 'endDate', width: '130px' },
  { field: 'volume', title: t('arCustomerCard.lines.table.volume'), cell: 'volume', width: '150px' },
  { field: 'currency', title: t('arCustomerCard.lines.table.currency'), cell: 'currency', width: '120px' },
  { field: 'actualPaymentTerms', title: t('arCustomerCard.lines.table.actualTerm'), width: '130px' },
  {
    field: 'contractualPaymentTermsWithoutCashDiscounts',
    title: t('arCustomerCard.lines.table.contractualTerm'),
    cell: 'contractual',
    width: '150px',
  },
])

/**
 * Catches rather than letting the rejection escape. Two reasons, and neither is defensive habit:
 * the caller is `onMounted` (and a `void`ed call from the pager), so a rejection here becomes an
 * unhandled promise rejection with nothing on screen to say the load failed; and leaving `page` on
 * its initial zero-total value makes a failure indistinguishable from a buyer who genuinely has no
 * lines. `SessionExpiredError` is caught too and deliberately leaves the error state set: the page
 * is already navigating to the identity provider, and it will be gone before anyone reads it.
 *
 * `loadError` is reset on entry rather than only set on failure, which today is belt and braces:
 * the error branch replaces the grid, so there is no pager left to click and nothing can call this
 * again without a page reload - which is what the copy's "Try again" means, the same as this
 * card's own `loadError`. If a retry affordance is ever added, the reset is already correct.
 */
async function goTo(pageNumber: number, pageSize: number): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    page.value = await fetchBuyerLines(props.versionId, props.buyerId, pageNumber, pageSize)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function onPageChange(event: { page: { skip: number; take: number } }): void {
  const request = pageRequestFromGridEvent(event.page.skip, event.page.take, skip.value, page.value.pageSize)
  if (!request) {
    return
  }

  void goTo(request.page, request.pageSize)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Kendo's own untyped row-render signature (see BuyerGrid.vue's own comment).
function rowRender(h: any, trElement: any, defaultSlots: any) {
  const finalClass = `${trElement.props.class ?? ''} buyer-lines-row--clickable`.trim()
  return h('tr', { ...trElement.props, class: finalClass }, defaultSlots)
}

function onRowClick(event: GridRowClickEvent): void {
  const line = event.dataItem as SaleLineRow
  MatchRouting.openSaleLineDetail(props.versionId, props.buyerId, line.id)
}

onMounted(() => goTo(1, page.value.pageSize))
</script>

<style scoped>
:deep(.buyer-lines-row--clickable) {
  cursor: pointer;
}
</style>
