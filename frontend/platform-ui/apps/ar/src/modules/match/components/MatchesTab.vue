<template>
<div class="card">
  <div class="card-body">
    <CalculumLoadingAr v-if="loading" />

    <!--
      The empty state replaces the grid ONLY when the file has no lines at all. It used to
      replace it whenever the current page came back empty, which took the pager away with it:
      landing past the last row left the screen with nothing to click and no way back to page 1.
      A file with rows keeps its pager and shows the empty page inside the grid, which is the
      one state from which the user can still navigate.
    -->
    <NoDataAvailable v-else-if="!page.total" :title="$t('arMatch.empty')" message="" />

    <Grid
      v-else
      :data-items="page.lines"
      :columns="columns"
      :pageable="pageable"
      :resizable="true"
      :total="page.total"
      :skip="skip"
      :take="page.pageSize"
      @pagechange="onPageChange"
    >
      <template #currency="{ props }">
        <td><CustomBadge :text="props.dataItem.currency ?? '—'" variant="info" /></td>
      </template>
      <!--
        `symbolForCode(props.dataItem.currency)`, NOT `currenciesStore.selectedCurrencySymbol`
        (PR 14881 review): this row's own `volume` is denominated in ITS OWN `currency` (the badge
        to the left), unconverted - the same figure `VersionDetailResponse.totalVolume` documents
        as "currencies NOT converted". Prefixing it with the globally selected display currency's
        symbol would mislabel every line whose own currency differs from that selection.
      -->
      <template #volume="{ props }">
        <td class="text-end">{{ formatMoney(props.dataItem.volume, currenciesStore.symbolForCode(props.dataItem.currency)) }}</td>
      </template>
      <template #contractual="{ props }">
        <td class="text-end">{{ props.dataItem.contractualPaymentTermsWithoutCashDiscounts ?? '—' }}</td>
      </template>
    </Grid>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * The imported sale lines, on the Kendo grid AP uses (G-22).
 *
 * Paging stays SERVER-side — the grid's pager drives a fetch rather than slicing a local array.
 * A file has hundreds of thousands of lines, so loading them all to let the grid page them
 * would trade a working screen for a convenient one.
 *
 * Sorting is deliberately not enabled here, unlike the other tabs. The grid can only sort the
 * page it holds, which would present a sort of 25 rows as a sort of the file: an answer that
 * looks right and is not. It comes back when the API sorts (UC-FE-06).
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, CustomBadge, NoDataAvailable } from '@ada/design-system'
import { Grid } from '@progress/kendo-vue-grid'
import { fetchLines, type LinesPageResponse } from '../api'
import { pageRequestFromGridEvent, pageSizes } from '../paging'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoney } from '@/utils/moneyFormatting'

const props = defineProps<{ versionId: number }>()
const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const loading = ref(true)
const page = ref<LinesPageResponse>({ total: 0, page: 1, pageSize: 25, lines: [] })

/**
 * The grid counts rows skipped; the API counts pages. This is the conversion between them.
 *
 * Derived from the RESPONSE rather than from what was requested, and deliberately so: the pager
 * describes the rows on screen, and the rows on screen are the ones the server chose to send. If
 * the two ever disagree, showing the requested size would put the pager's arithmetic at odds with
 * the data beside it, which is the version of this bug that is hard to see.
 *
 * They can disagree, because `GetLines` clamps `pageSize` to 1..500 and echoes the clamped value.
 * Every size offered below sits inside that range, so the pager cannot reach the divergence — but
 * that invariant is two files agreeing at a distance, and adding `1000` here would break it
 * silently. The sizes live in `../paging` and `tests/Unit/matchPaging.spec.ts` pins the bound.
 */
const skip = computed(() => (page.value.page - 1) * page.value.pageSize)

const pageable = { buttonCount: 5, pageSizes, info: true }

const columns = computed(() => [
  { field: 'sourceRowNumber', title: t('arMatch.table.row'), width: '90px' },
  { field: 'buyer', title: t('arMatch.table.buyer') },
  { field: 'supplier', title: t('arMatch.table.supplier') },
  { field: 'currency', title: t('arMatch.table.currency'), cell: 'currency', width: '120px' },
  { field: 'salesTeam', title: t('arMatch.table.team'), width: '160px' },
  { field: 'volume', title: t('arMatch.table.volume'), cell: 'volume', width: '150px' },
  { field: 'actualPaymentTerms', title: t('arMatch.table.terms'), width: '130px' },
  {
    field: 'contractualPaymentTermsWithoutCashDiscounts',
    title: t('arMatch.table.contractual'),
    cell: 'contractual',
    width: '140px',
  },
  { field: 'year', title: t('arMatch.table.year'), width: '90px' },
  { field: 'commodity', title: t('arMatch.table.commodity'), width: '160px' },
  { field: 'internalId', title: t('arMatch.table.internalId'), width: '150px' },
])

async function goTo(pageNumber: number, pageSize: number): Promise<void> {
  loading.value = true
  try {
    page.value = await fetchLines(props.versionId, pageNumber, pageSize)
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

onMounted(() => goTo(1, page.value.pageSize))
</script>
