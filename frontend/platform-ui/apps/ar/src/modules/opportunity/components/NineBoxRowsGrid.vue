<template>
<div class="nine-box-rows-grid">
  <GridExportStatus ref="exportStatus" :loading="loading" />
  <GraphqlGrid
    v-model:columns="columns"
    :items="items"
    :total="total"
    :skip="skip"
    :take="take"
    :sort="sort"
    :filter="filter"
    :sortable="{ allowUnsort: true, mode: 'single' }"
    :loading="loading"
    :pageable="pageable"
    :data-item-key="rowKey"
    :column-menu="false"
    :column-selector-default-columns="defaultColumns"
    :totals-by-columns="totalsByColumns"
    :loading-totals="loadingTotals"
    :analyze-store="analyzeStore"
    :height="height"
    :allow-export="currentUser.canExportLists"
    :export-label="t('arGridExport.exportLabel')"
    :options-label="t('arGridExport.optionsLabel')"
    @datastatechange="onDataStateChange"
    @export="onExport"
  />
</div>
</template>

<script lang="ts">
/**
 * UC-UI-04's grid under the boxes — AP's `ListsNineBoxes.vue` counterpart, scoped down: the same
 * `saleLineOverviewRows`/`buyerOverviewRows`/`parentOverviewRows` GraphQL fields
 * `OverviewList.vue` (the Opportunity List tab) already queries through `overviewRows.ts`, narrowed
 * by `nineBox: { in: selectedBoxes } }` instead of that tab's own chart-segment click.
 *
 * Two instances of this same component cover both lists below the boxes (`NineBoxOverview.vue`):
 * the box-filtered grid (`selectedBoxes`) and the Unranked section (`unranked`, `nineBox: { eq:
 * null } }`) — the latter used to be a plain 2-column Kendo `Grid` with no column catalogue of its
 * own, which looked nothing like AP's real grid once a version actually had unranked buyers in the
 * dozens (not the "a handful" this file originally assumed).
 *
 * A dedicated component rather than `OverviewList.vue` reused as-is: that one owns its own level
 * tabs and chart-selection chip, which this screen doesn't want — the boxes' own level selector
 * already exists one level up (`NineBoxOverview.vue`, shared with the box aggregate fetch so both
 * stay on the same level), and this grid has no chart to filter by. Since column parity
 * (2026-10-02) this grid has its own column list per level (`*NineBoxColumns`, AP's 9 Boxes Cash
 * Flow grid: no strategy columns), so it also keeps its own `useGridColumnPreferencesStore` cache
 * key per level (`gridKey` below) instead of sharing the List tab's.
 *
 * Column filters (AB#21102): `column-menu: false` only turns off GraphqlGrid's own header popup -
 * each column still carries Kendo's native menu (normalizeGraphqlGridColumns), whose filter lands
 * in `filter` below. It is ANDed with the box selection in the `where` and the footer's
 * `telerikFilter`, the same way OverviewList.vue ANDs its own with a chart click. Custom attribute
 * columns travel as the field's `customFilters` argument instead, as they do there. The filter is
 * reset on a level switch: each level filters its own fields.
 *
 * Footer totals (Sum / Avg Weighted) reuse `OverviewList.vue`'s own `fetchFilterSummary` call
 * against `OpportunityFiltersController` — same endpoint, same per-level allow-list, same dotted-
 * key remap — narrowed by a `telerikFilter` that means the same thing as this file's own `where`.
 * It is NOT the same JSON shape, though: the backend's Kendo filter engine for this endpoint
 * (`KendoFilterEngine.cs`) has no `in` operator, only `eq`/`neq`/`gt`/`gte`/`lt`/`lte`/`contains`/
 * `startswith`/`endswith`/`isnull`/`isnotnull` — a multi-box selection has to travel as an `or` of
 * one `eq` leaf per box rather than one `in` leaf, and Unranked as a single `isnull` leaf.
 */
import { computed, defineComponent, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import GraphqlGrid from '@ada/design-system/components/graphql-grid/Index.vue'
import {
  flattenGraphqlGridColumns,
  mergeCachedGraphqlGridColumns,
  normalizeGraphqlGridColumns,
  type GraphqlGridColumnOrGroup,
  type GraphqlGridDataState,
  type GraphqlGridFilterDescriptor,
  type GraphqlGridPageableSettings,
  type GraphqlGridSortDescriptor,
} from '@ada/design-system/components/graphql-grid/types'
import {
  flattenFilterDescriptors,
  kendoFilterToGraphqlWhere,
  kendoSortToGraphqlOrder,
  partitionFilterDescriptor,
} from '@ada/design-system/components/graphql-grid/kendoToGraphql'
import {
  getActiveColumnsArray,
  getTotalFieldsCountByTrueValue,
  getTotalFieldsPlainWeightedAvg,
  getTotalFieldsSummation,
  getTotalFieldsWeightedAvg,
} from '@ada/design-system/utils/totalColumnsUtils'
import { apolloClient } from '@/services/graphql/apolloClient'
import GridExportStatus from '@/components/GridExportStatus.vue'
import type { GridExportKind } from '@/api/gridExport'
import { buildGridExportRequest } from '@/utils/gridExportRequest'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'
import { useLoadToken } from '@/composables/useLoadToken'
import { useGridColumnPreferencesStore } from '@/stores/gridColumnPreferences'
import { useCustomAttributesStore } from '@/stores/customAttributes'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import {
  applyCustomAttributeDefinitions,
  hideUnnamedCustomAttributes,
  isCustomDataPointField,
  toCustomAttributeFilters,
} from '@/utils/customAttributeColumns'
import {
  fetchFilterSummary,
  type FilterSummaryEndpoint,
  type MatchSummaryResponse,
  type OpportunitySummaryOperations,
  type OpportunitySummaryResponse,
} from '@/api'
import {
  CLIENT_ONLY_FIELDS,
  fetchOverviewRows,
  toDisplayOverviewRow,
  visibleOverviewRowFields,
  OVERVIEW_ROW_KEYS,
  type OverviewGridLevel,
  type OverviewRow,
} from '../data/overviewRows'
import {
  buyerNineBoxColumns,
  parentNineBoxColumns,
  saleLineNineBoxColumns,
} from '../data/overviewColumns'

const COLUMN_FACTORIES: Record<OverviewGridLevel, () => ReturnType<typeof saleLineNineBoxColumns>> = {
  saleLines: saleLineNineBoxColumns,
  buyers: buyerNineBoxColumns,
  parents: parentNineBoxColumns,
}

// Column parity (2026-10-02): the 9 Boxes grid has its own column list now, so it keeps its own
// cache per level instead of sharing the List tab's. `v2` drops the snapshots saved under the old
// lists, whose cached visibility would otherwise hide the new defaults.
const gridKey = (level: OverviewGridLevel) => `opportunity-nine-box-v2-${level}`

// OverviewList.vue's own SUMMARY_LEVEL - the footer-totals route segment ('sales'), not this
// screen's own grid-level id ('saleLines'). Kept local rather than imported: it is one line, and
// importing it would couple this file to OverviewList.vue's internals for no shared behaviour.
const SUMMARY_LEVEL: Record<OverviewGridLevel, string> = {
  saleLines: 'sales',
  buyers: 'buyers',
  parents: 'parents',
}

const OPPORTUNITY_SUMMARY_ENDPOINT: Omit<FilterSummaryEndpoint, 'level'> = {
  transaction: 'filters',
  section: 'opportunity',
  operation: 'summary',
}

/**
 * The server grid each level exports as. The buyer level is the nine-box's own list (`NineBoxRows`);
 * the sale-line and parent levels read their own fields, which the server exports through the
 * Opportunity kinds - `NineBoxRows` only knows the buyer projection's columns, so a sale-line file
 * requested as one would be refused. The box selection travels in the request's `where` either way.
 */
const EXPORT_KIND: Record<OverviewGridLevel, GridExportKind> = {
  saleLines: 'OpportunitySaleLines',
  buyers: 'NineBoxRows',
  parents: 'OpportunityParents',
}

/** One Kendo filter leaf/composite, in the raw shape `KendoFilterEngine.cs` parses - not
 * `GraphqlGridFilterDescriptor` (that one is Kendo's own richer TypeScript shape, built for the
 * column-menu filter this grid doesn't have); this is the minimal JSON both this file and
 * OverviewList.vue's `telerikFilter` string actually need. */
type TelerikFilterNode =
  | { field: string; operator: string; value?: unknown }
  | { logic: 'and' | 'or'; filters: TelerikFilterNode[] }

/** The box narrowing and the column filter as one clause: whichever is present alone, both under
 * `wrap`'s AND, or `null` for neither. */
function andClauses<T>(box: T | null, column: T | null, wrap: (clauses: T[]) => T): T | null {
  const clauses = [box, column].filter((clause): clause is T => clause !== null)
  if (clauses.length === 0) return null
  return clauses.length === 1 ? clauses[0] : wrap(clauses)
}

export default defineComponent({
  name: 'NineBoxRowsGrid',
  components: { GraphqlGrid, GridExportStatus },
  props: {
    versionUuid: { type: String as PropType<string | null>, required: true },
    level: { type: String as PropType<OverviewGridLevel>, required: true },
    /** The nine-box numbers (1-9) currently selected on the grid above. Empty means nothing to
     * narrow by yet - the grid still renders (columns, footer, column picker), just with no rows,
     * rather than being replaced by a prompt: a local/sparse environment can have every box read
     * empty regardless of selection, and hiding the grid behind a "pick a box" message reads as
     * broken rather than as "there is nothing here yet". Ignored when `unranked` is set. */
    selectedBoxes: { type: Array as PropType<number[]>, default: () => [] },
    /** Rows with neither tier (UC-OPP-17 A1) instead of the boxes' own selection - mutually
     * exclusive with `selectedBoxes`. */
    unranked: { type: Boolean, default: false },
    height: { type: String, default: '420px' },
  },
  setup(props) {
    const { start, isStale } = useLoadToken()
    // Its own independent staleness counter, same reason as OverviewList.vue's startTotals/
    // isTotalsStale: the rows request and the totals request race independently, and a slow
    // totals response landing after a newer level/selection change must not overwrite it.
    const { start: startTotals, isStale: isTotalsStale } = useLoadToken()
    const preferences = useGridColumnPreferencesStore()
    const customAttributesStore = useCustomAttributesStore()
    const currenciesStore = useArCurrenciesStore()
    const currentUser = useArCurrentUserStore()
    const { t } = useI18n({ useScope: 'global' })
    const exportStatus = ref<InstanceType<typeof GridExportStatus> | null>(null)
    // The variables of the page the grid last fetched, with the level they belong to - what the
    // export is built from. Plain: nothing renders from it.
    let lastQuery: { level: OverviewGridLevel; variables: Record<string, unknown> | undefined } | null = null

    function freshColumns(forLevel: OverviewGridLevel): GraphqlGridColumnOrGroup[] {
      const fresh = applyCustomAttributeDefinitions(
        normalizeGraphqlGridColumns(COLUMN_FACTORIES[forLevel]()),
        customAttributesStore.definitions,
      )
      const cached = preferences.getColumns(gridKey(forLevel))
      return cached.length > 0
        ? hideUnnamedCustomAttributes(mergeCachedGraphqlGridColumns(fresh, cached), customAttributesStore.definitions)
        : fresh
    }

    const columns = ref<GraphqlGridColumnOrGroup[]>(freshColumns(props.level))

    // The Reset snapshot GraphqlGridColumnSelector restores to - the tenant's live custom-attribute
    // declarations applied onto the bare factory defaults, same as OverviewList.vue's own
    // defaultColumns.
    const defaultColumns = computed(() =>
      applyCustomAttributeDefinitions(
        normalizeGraphqlGridColumns(COLUMN_FACTORIES[props.level]()),
        customAttributesStore.definitions,
      ),
    )

    const rowKey = computed(() => OVERVIEW_ROW_KEYS[props.level])

    const skip = ref(0)
    const take = ref(25)
    /** AB#20611: the pager's items-per-page and "X - Y of Z items" block, off by default in
     * GraphqlGrid - same settings as OverviewList.vue. */
    const pageable: GraphqlGridPageableSettings = {
      buttonCount: 5,
      info: true,
      type: 'numeric',
      pageSizes: [10, 25, 50, 100, 150],
      previousNext: true,
    }
    const sort = ref<GraphqlGridSortDescriptor[]>([{ field: 'volume', dir: 'desc' }])
    /** The columns' own filter (AB#21102) - see this file's header comment. */
    const filter = ref<GraphqlGridFilterDescriptor | undefined>(undefined)
    /** `first`: what the level's filter input knows. `second`: the custom attribute clauses, which
     * are not fields of that input and travel as `customFilters` (a `where` naming one fails GraphQL
     * validation and blanks the whole page). */
    const splitFilter = computed(() => partitionFilterDescriptor(filter.value, isCustomDataPointField))
    const items = ref<OverviewRow[]>([])
    const total = ref(0)
    const loading = ref(false)
    // AR has no custom-data-point concept the footer needs beyond this stub - same empty map
    // OverviewList.vue's own analyzeStore passes GraphqlGrid's footer for the same reason.
    const analyzeStore = { customDataPointTypes: {} as Record<string, string> }
    const totalsByColumns = ref<MatchSummaryResponse | undefined>(undefined)
    const loadingTotals = ref(false)

    /** `null` from here means "no narrowing" - AB#20411: with nothing selected (and not the
     * Unranked instance), AP's own screen shows every row at the level rather than an empty grid,
     * so `null` now reaches the actual fetch as "no where clause" instead of being read upstream
     * as "don't fetch". The column filter, when there is one, is ANDed with the box narrowing. */
    function buildWhere(): Record<string, unknown> | null {
      let boxWhere: Record<string, unknown> | null = null
      if (props.unranked) boxWhere = { nineBox: { eq: null } }
      else if (props.selectedBoxes.length > 0) boxWhere = { nineBox: { in: props.selectedBoxes } }
      return andClauses(boxWhere, kendoFilterToGraphqlWhere(splitFilter.value.first),
        (clauses) => ({ and: clauses }))
    }

    /** The `telerikFilter` counterpart of `buildWhere()` above - same "no narrowing" `null` for
     * "nothing selected", but as an `eq`-only Kendo filter tree instead of a GraphQL `where` (see
     * this file's header comment for why `in` isn't an option here). The column filter is already a
     * Kendo tree, so it joins as-is (custom attribute clauses dropped, as OverviewList.vue does: the
     * endpoint's allow-list knows none of them). */
    function buildTelerikFilter(): TelerikFilterNode | null {
      let boxFilter: TelerikFilterNode | null = null
      if (props.unranked) {
        boxFilter = { logic: 'and', filters: [{ field: 'nineBox', operator: 'isnull' }] }
      } else if (props.selectedBoxes.length > 0) {
        boxFilter = {
          logic: 'or',
          filters: props.selectedBoxes.map((box) => ({ field: 'nineBox', operator: 'eq', value: box })),
        }
      }
      const columnFilter = splitFilter.value.first?.filters.length
        ? splitFilter.value.first as TelerikFilterNode
        : null
      return andClauses(boxFilter, columnFilter, (filters) => ({ logic: 'and', filters }))
    }

    /** Only the fields THIS grid opted a footer into (`footerCell` set on the column) - see
     * OverviewList.vue's own `buildSummaryOperations` for why gating on that, rather than on every
     * visible field totalColumnsUtils happens to recognise, is what keeps this request inside
     * Ada-Platform's per-grain summary allow-list. */
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
      if (!props.versionUuid) {
        // Same reason as loadPage()'s own early-return start() call above: without advancing the
        // totals token here too, a slower in-flight totals request for the previous selection can
        // still land and overwrite this reset.
        startTotals()
        totalsByColumns.value = undefined
        return
      }

      // AB#20411: nothing selected is no longer "don't fetch" - see buildTelerikFilter()'s own doc.
      const telerikFilter = buildTelerikFilter() ?? { logic: 'and', filters: [] }

      const token = startTotals()
      loadingTotals.value = true
      try {
        const response = await fetchFilterSummary<OpportunitySummaryOperations, OpportunitySummaryResponse>({
          endpoint: { ...OPPORTUNITY_SUMMARY_ENDPOINT, level: SUMMARY_LEVEL[props.level] },
          filters: {
            currencyRate: currenciesStore.currency,
            targetSaleFileVersionUuid: props.versionUuid,
            telerikFilter: JSON.stringify(telerikFilter),
            chartsFilter: '[]',
            searchText: '',
            fullDisabled: false,
          },
          summary: buildSummaryOperations(),
        })

        if (isTotalsStale(token)) {
          // A newer level/selection/version already owns totalsByColumns now.
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
      // A page that is loading, failed or has no version must not leave the previous page's
      // variables to be exported: the export reads only what the last SUCCESSFUL fetch sent.
      lastQuery = null
      if (!props.versionUuid) {
        // Advance the load token even on this early-return path: without it, a still-in-flight
        // request for the PREVIOUS (non-empty) selection keeps holding the "current" token, so its
        // late response passes isStale() below and overwrites this reset with stale rows.
        start()
        items.value = []
        total.value = 0
        loading.value = false
        return
      }

      // AB#20411: nothing selected is no longer "don't fetch" - see buildWhere()'s own doc.
      const where = buildWhere()

      const token = start()
      const requestedLevel = props.level
      loading.value = true
      try {
        const page = await fetchOverviewRows<OverviewRow>(
          apolloClient,
          props.level,
          props.versionUuid,
          visibleOverviewRowFields(props.level, columns.value),
          {
            skip: skip.value,
            take: take.value,
            order: kendoSortToGraphqlOrder(sort.value),
            where,
            customFilters: toCustomAttributeFilters(flattenFilterDescriptors(splitFilter.value.second)),
            currencyRate: currenciesStore.currency,
          },
        )

        if (isStale(token)) {
          // A newer level/selection/version already owns items/total/loading now.
          return
        }

        items.value = page.items.map(toDisplayOverviewRow)
        total.value = page.total
        lastQuery = { level: requestedLevel, variables: page.variables }
      } catch {
        // Same convention as Waterfall's drill-in: a failed page falls back to GraphqlGrid's own
        // empty state rather than rejecting unhandled from the watchers that fire loadPage().
        // lastQuery stays null, so there is nothing to export either.
        if (isStale(token)) return
        items.value = []
        total.value = 0
      } finally {
        if (!isStale(token)) {
          loading.value = false
        }
      }
    }

    /** The grid's "Export Excel": the last query (box selection included) and the visible columns. */
    function onExport(): void {
      if (!lastQuery || lastQuery.level !== props.level) {
        // lastQuery is cleared for the whole duration of a fetch: say why nothing happens.
        if (loading.value) exportStatus.value?.notice('arGridExport.stillLoading')
        return
      }
      const request = buildGridExportRequest({
        variables: lastQuery.variables,
        columns: columns.value,
        fileName: t(props.unranked ? 'arGridExport.fileName.nineBoxUnranked' : 'arGridExport.fileName.nineBox'),
        clientOnlyFields: CLIENT_ONLY_FIELDS[lastQuery.level],
      })
      if (!request) return
      exportStatus.value?.start(EXPORT_KIND[props.level], request, total.value)?.catch(() => undefined)
    }

    function onDataStateChange(state: GraphqlGridDataState): void {
      skip.value = state.skip ?? 0
      take.value = state.take ?? take.value
      sort.value = state.sort ?? []
      // Totals depend on the filter, not on skip/take/sort - same as OverviewList.vue.
      const filterChanged = JSON.stringify(state.filter) !== JSON.stringify(filter.value)
      filter.value = state.filter
      // A new filter is a new result set: back to its first page, as on a box (de)selection.
      if (filterChanged) skip.value = 0
      loadPage()
      if (filterChanged) fetchTotals()
    }

    // Any of these changing invalidates the current page — a level switch changes the columns AND
    // the query field entirely, a box (de)selection changes the `where`, a version change scopes
    // to a different file. Back to page 1 on every one of them, same as OverviewList.vue does for
    // its own level/filter/version changes: page 4 of the PREVIOUS selection is not a place to
    // restore anyone to.
    //
    // Set right before a level switch reassigns columns.value below, so the columns watcher just
    // beneath (which fetchTotals() also needs, for a manual column show/hide) does not ALSO
    // re-fetch totals for a change this same callback's own fetchTotals() call just fired for -
    // the same double-request OverviewList.vue's "reassigned last" comment guards against.
    let columnsRefreshedByLevelSwitch = false

    // The columns refresh happens INSIDE this same callback, before loadPage() - not a second,
    // separate watch(() => props.level, ...) - so there is no cross-watcher ordering to get
    // wrong: by the time loadPage() reads columns.value for visibleOverviewRowFields, the level's
    // own fresh/cached columns are already in place.
    watch(
      () => [props.versionUuid, props.level, props.unranked, [...props.selectedBoxes].sort().join(',')],
      (_current, previous) => {
        if (previous?.[1] !== props.level) {
          columnsRefreshedByLevelSwitch = true
          columns.value = freshColumns(props.level)
          // The previous level's filter names its own fields (`name` is not a sale-line field).
          filter.value = undefined
        }
        skip.value = 0
        loadPage()
        fetchTotals()
      },
      { immediate: true },
    )

    // #21145: the schema reloads with the company or sale file version while this grid stays
    // mounted - re-applied so a column the previous version named does not linger.
    watch(() => customAttributesStore.definitions, () => {
      columns.value = applyCustomAttributeDefinitions(columns.value, customAttributesStore.definitions)
    })

    // Persists whatever the analyst picks in GraphqlGridColumnSelector, under this grid's own key
    // per level (see this file's header comment). Also re-fetches totals for a manual
    // show/hide (footer-eligible columns just changed) - but not for the level-switch reassignment
    // above, which already fetched with the new level's columns in place (see the flag's comment).
    watch(columns, (current) => {
      preferences.setColumns(gridKey(props.level), current)
      if (columnsRefreshedByLevelSwitch) {
        columnsRefreshedByLevelSwitch = false
        return
      }
      fetchTotals()
    })

    return {
      columns,
      defaultColumns,
      rowKey,
      items,
      total,
      skip,
      take,
      pageable,
      sort,
      filter,
      loading,
      analyzeStore,
      totalsByColumns,
      loadingTotals,
      currentUser,
      exportStatus,
      t,
      onDataStateChange,
      onExport,
    }
  },
})
</script>
