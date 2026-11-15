<template>
<div class="opportunity-list-buyers">
  <GraphqlGrid
    v-model:columns="columns"
    :items="items"
    :total="total"
    :skip="skip"
    :take="take"
    :sort="sort"
    :sortable="{ allowUnsort: true, mode: 'single' }"
    :loading="loading"
    :data-item-key="rowKey"
    :column-menu="selectable"
    :filter="filter"
    :column-selector-default-columns="defaultColumns"
    :height="height"
    :totals-by-columns="totalsByColumns"
    :loading-totals="loadingTotals"
    :analyze-store="analyzeStore"
    :allow-open-entity="false"
    :selectable="selectable"
    :select="selectable ? pageSelectMap : undefined"
    @update:select="onPageSelectChange"
    @datastatechange="onDataStateChange"
  />
</div>
</template>

<script setup lang="ts">
/**
 * The Customer Card's Opportunity tab, sale-line grain: this party's own sale lines (Counterparty)
 * or its whole family's rolled-up lines (Parent), through the SAME `saleLineOverviewRows` GraphQL
 * field and the same column catalogue the Opportunity module's own List tab uses
 * (`overviewRows.ts`/`overviewColumns.ts`), with this card's own list (`entityCardSaleLineColumns`,
 * column parity: AP's Supplier Card › Negotiation) — one catalogue and one query builder for this
 * grain, not a second one local to the customer card.
 *
 * Narrowed by `where`, not by a level of its own: `buyerId: { eq }` for a Counterparty (its own
 * lines only), `parentId: { eq }` for a genuine Parent (every line whose own ParentId names this
 * party — the family's lines, not any one buyer's). Both filter fields already exist on
 * `SaleLineOverviewRowFactFilterInput` for exactly this "party row expands into its own lines"
 * purpose (see `OverviewRowTypes.cs`'s own comment on `buyerId`/`parentId`). `CustomerCardOpportunityTab.vue`
 * decides WHEN this renders (its own role/active-tab rules) — this component only ever asks "whose
 * lines", never "should I show at all".
 *
 * No footer totals, unlike `OverviewList.vue`/`NineBoxRowsGrid.vue`: those total the FULL grid's
 * own filtered population against the Opportunity summary endpoint, which is the wrong question for
 * a single party's own lines carved out of a card, and nothing here asked for one.
 *
 * AB#20657: `selectable` turns the same grid into the Target modal's line picker (GraphqlGrid's own
 * "selected" checkbox column), with the selection held as a cross-page `SaleLineSelection` so
 * "every line" stays exact however many pages the party's lines span.
 * Footer totals (column parity, 2026-10-02) come from the same Opportunity summary endpoint
 * `OverviewList.vue`/`NineBoxRowsGrid.vue` use, narrowed by a `telerikFilter` that means the same
 * thing as `where` (`buyerId`/`parentId` eq), so they total exactly this party's own lines.
 */
import { computed, ref, watch, type PropType } from 'vue'
import GraphqlGrid from '@ada/design-system/components/graphql-grid/Index.vue'
import {
  flattenGraphqlGridColumns,
  mergeCachedGraphqlGridColumns,
  normalizeGraphqlGridColumns,
  type GraphqlGridColumnOrGroup,
  type GraphqlGridDataState,
  type GraphqlGridFilterDescriptor,
  type GraphqlGridSortDescriptor,
} from '@ada/design-system/components/graphql-grid/types'
import { kendoSortToGraphqlOrder } from '@ada/design-system/components/graphql-grid/kendoToGraphql'
import {
  getActiveColumnsArray,
  getTotalFieldsCountByTrueValue,
  getTotalFieldsPlainWeightedAvg,
  getTotalFieldsSummation,
  getTotalFieldsWeightedAvg,
} from '@ada/design-system/utils/totalColumnsUtils'
import { apolloClient } from '@/services/graphql/apolloClient'
import { useLoadToken } from '@/composables/useLoadToken'
import { useGridColumnPreferencesStore } from '@/stores/gridColumnPreferences'
import { useCustomAttributesStore } from '@/stores/customAttributes'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { applyCustomAttributeDefinitions, hideUnnamedCustomAttributes } from '@/utils/customAttributeColumns'
import {
  fetchFilterSummary,
  type MatchSummaryResponse,
  type OpportunitySummaryOperations,
  type OpportunitySummaryResponse,
  type PartyRole,
} from '@/api'
import {
  allLinesSelection,
  applyPageSelection,
  isLineSelected,
  partySaleLinesQuery,
  type SaleLineSelection,
} from '../../utils/targetPaymentTerms'
import {
  fetchOverviewRows,
  toDisplayOverviewRow,
  visibleOverviewRowFields,
  OVERVIEW_ROW_KEYS,
  type OverviewRow,
} from '@/modules/opportunity/data/overviewRows'
import { entityCardSaleLineColumns } from '@/modules/opportunity/data/overviewColumns'

const props = defineProps({
  versionUuid: { type: String as PropType<string | null | undefined>, default: null },
  /** The card's own party id — a real buyer's when `role` is Counterparty, a family's ultimate
   * party's when `role` is Parent. Same string the card's other tabs already carry as `buyerId`. */
  buyerId: { type: String, required: true },
  role: { type: String as PropType<PartyRole | undefined>, default: undefined },
  height: { type: String, default: '420px' },
  /** AB#20657: adds GraphqlGrid's "selected" checkbox column so the Target modal can pick which
   * lines a target applies to. Off on the card itself - only the modal turns it on. */
  selectable: { type: Boolean, default: false },
  /** With `selectable`: the cross-page selection (`v-model:selection`), see `SaleLineSelection`. */
  selection: { type: Object as PropType<SaleLineSelection>, default: () => allLinesSelection() },
})

const emit = defineEmits<{
  'update:selection': [selection: SaleLineSelection]
  /** The party's line count under the current filters - the modal's "all (n)" label and its
   * EF-2 check. */
  'update:total': [total: number]
  /** The column filters applied in the grid (only filterable while `selectable`) - the modal sends
   * them as the request's `telerikFilter`. */
  'update:filter': [filter: GraphqlGridFilterDescriptor | undefined]
}>()

const { start, isStale } = useLoadToken()
// The totals request races the rows request independently - same reason as NineBoxRowsGrid.vue.
const { start: startTotals, isStale: isTotalsStale } = useLoadToken()
const preferences = useGridColumnPreferencesStore()
const customAttributesStore = useCustomAttributesStore()
const currenciesStore = useArCurrenciesStore()

// Its own cache key: since column parity (2026-10-02) this list differs from the List tab's, so a
// shared snapshot would restore columns this card does not have. `v2` drops the old snapshots.
const GRID_KEY = 'entity-card-sale-lines-v2'

function freshColumns(): GraphqlGridColumnOrGroup[] {
  const fresh = applyCustomAttributeDefinitions(
    normalizeGraphqlGridColumns(entityCardSaleLineColumns()),
    customAttributesStore.definitions,
  )
  const cached = preferences.getColumns(GRID_KEY)
  return cached.length > 0
    ? hideUnnamedCustomAttributes(mergeCachedGraphqlGridColumns(fresh, cached), customAttributesStore.definitions)
    : fresh
}

const columns = ref<GraphqlGridColumnOrGroup[]>(freshColumns())

const defaultColumns = computed(() =>
  applyCustomAttributeDefinitions(
    normalizeGraphqlGridColumns(entityCardSaleLineColumns()),
    customAttributesStore.definitions,
  ),
)

const rowKey = OVERVIEW_ROW_KEYS.saleLines

const skip = ref(0)
const take = ref(25)
const sort = ref<GraphqlGridSortDescriptor[]>([{ field: 'volume', dir: 'desc' }])
const items = ref<OverviewRow[]>([])
const total = ref(0)
const loading = ref(false)
const filter = ref<GraphqlGridFilterDescriptor | undefined>(undefined)
// AR has no custom-data-point types the footer needs - same stub OverviewList.vue passes.
const analyzeStore = { customDataPointTypes: {} as Record<string, string> }
const totalsByColumns = ref<MatchSummaryResponse | undefined>(undefined)
const loadingTotals = ref(false)

/** `null` means "nothing to narrow by yet" (no version, or a `buyerId` this endpoint could never
 * match) — the caller reads that as "don't fetch", the same convention `NineBoxRowsGrid.vue`'s own
 * `buildWhere` uses, never as "fetch every line in the version". */
const query = computed(() => partySaleLinesQuery(props.buyerId, props.role, filter.value))

const pageIds = computed(() => items.value.map((row) => Number((row as Record<string, unknown>)[rowKey])))

/** The page on screen's slice of `selection`, in GraphqlGrid's own `select` map shape. */
const pageSelectMap = computed<Record<string, boolean>>(() =>
  Object.fromEntries(pageIds.value.map((id) => [String(id), isLineSelected(props.selection, id)])))

/** GraphqlGrid only ever reports the page it shows (a row click, or its header checkbox, which
 * covers the current page) - folded into the cross-page selection rather than replacing it. */
function onPageSelectChange(next: Record<string, unknown>): void {
  if (!props.selectable) return
  emit('update:selection', applyPageSelection(props.selection, pageIds.value, next, total.value))
}

/** `where` as the summary endpoint's Kendo filter: the same party, the same lines. */
const telerikFilter = computed(() => {
  const id = Number(props.buyerId)
  if (!Number.isFinite(id)) return null
  const field = props.role === 'Parent' ? 'parentId' : 'buyerId'
  return { logic: 'and', filters: [{ field, operator: 'eq', value: id }] }
})

/** Only the fields this list opted a footer into (`footerCell`), as NineBoxRowsGrid.vue does. */
function buildSummaryOperations(): OpportunitySummaryOperations {
  const flat = flattenGraphqlGridColumns(columns.value)
  const withFooter = getActiveColumnsArray(flat)
    .filter((field: string) => flat.find((column) => column.field === field)?.footerCell)
  return {
    sum: getTotalFieldsSummation(withFooter),
    weightedCeilingAverage: getTotalFieldsWeightedAvg(withFooter),
    weightedAverage: getTotalFieldsPlainWeightedAvg(withFooter),
    countTrue: getTotalFieldsCountByTrueValue(withFooter),
  }
}

async function fetchTotals(): Promise<void> {
  const filter = telerikFilter.value
  if (!props.versionUuid || filter === null) {
    startTotals()
    totalsByColumns.value = undefined
    loadingTotals.value = false
    return
  }

  const token = startTotals()
  loadingTotals.value = true
  try {
    const response = await fetchFilterSummary<OpportunitySummaryOperations, OpportunitySummaryResponse>({
      endpoint: { transaction: 'filters', section: 'opportunity', level: 'sales', operation: 'summary' },
      filters: {
        currencyRate: currenciesStore.currency,
        targetSaleFileVersionUuid: props.versionUuid,
        telerikFilter: JSON.stringify(filter),
        chartsFilter: '[]',
        searchText: '',
        fullDisabled: false,
      },
      summary: buildSummaryOperations(),
    })

    if (isTotalsStale(token)) {
      // A newer version/buyer/role already owns totalsByColumns now.
      return
    }

    totalsByColumns.value = {
      sum: response.sum,
      'avg.weighted.ceil': response.weightedCeilingAverage,
      'avg.weighted': response.weightedAverage,
      'count.true': response.countTrue,
      totalCount: response.totalCount,
    }
  } finally {
    if (!isTotalsStale(token)) {
      loadingTotals.value = false
    }
  }
}

async function loadPage(): Promise<void> {
  const currentQuery = query.value
  if (!props.versionUuid || currentQuery === null) {
    start()
    items.value = []
    total.value = 0
    loading.value = false
    return
  }

  const token = start()
  loading.value = true
  try {
    const page = await fetchOverviewRows<OverviewRow>(
      apolloClient,
      'saleLines',
      props.versionUuid,
      visibleOverviewRowFields('saleLines', columns.value),
      {
        skip: skip.value,
        take: take.value,
        order: kendoSortToGraphqlOrder(sort.value),
        where: currentQuery.where,
        customFilters: currentQuery.customFilters,
        currencyRate: currenciesStore.currency,
      },
    )

    if (isStale(token)) {
      // A newer version/buyer/role already owns items/total/loading now.
      return
    }

    items.value = page.items.map(toDisplayOverviewRow)
    total.value = page.total
    emit('update:total', page.total)
  } finally {
    if (!isStale(token)) {
      loading.value = false
    }
  }
}

function onDataStateChange(state: GraphqlGridDataState): void {
  skip.value = state.skip ?? 0
  take.value = state.take ?? take.value
  sort.value = state.sort ?? []
  if (JSON.stringify(state.filter) !== JSON.stringify(filter.value)) {
    filter.value = state.filter
    skip.value = 0
    emit('update:filter', state.filter)
    // A new filter is a new population: "all" now means every line it lets through, and an
    // exception picked under the old one may not even be listed any more.
    if (props.selectable) emit('update:selection', allLinesSelection())
  }
  loadPage()
}

watch(
  () => [props.versionUuid, props.buyerId, props.role],
  () => {
    skip.value = 0
    loadPage()
    fetchTotals()
  },
  { immediate: true },
)

// Not `immediate`: the initial ref already applied the store's CURRENT definitions (freshColumns()
// above), synchronously, before any watcher runs — an immediate re-application here would reassign
// `columns.value` to an equivalent-but-new array right after mount, firing the `watch(columns, ...)`
// below a second time for the same load the `versionUuid`/`buyerId`/`role` watch already just made.
// This one exists for the store changing LATER while this grid stays mounted.
watch(() => customAttributesStore.definitions, () => {
  columns.value = applyCustomAttributeDefinitions(columns.value, customAttributesStore.definitions)
})

// A shown/hidden column can change which footers exist, so the totals refetch with the rows.
watch(columns, (current) => {
  preferences.setColumns(GRID_KEY, current)
  loadPage()
  fetchTotals()
})
</script>
