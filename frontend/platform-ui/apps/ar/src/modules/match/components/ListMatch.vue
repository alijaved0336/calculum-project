<template>
  <ContentBox>
    <ContentBoxBody>
      <div v-if="chartFilterChips.length" class="chart-filter-chips">
        <span v-for="chip in chartFilterChips" :key="chip.id" class="chart-filter-chip">
          {{ chip.label }}
          <button
            type="button"
            class="chart-filter-chip__remove"
            :aria-label="$t('arMatch.chartFilterChip.remove')"
            @click="$emit('remove-chart-filter-chip', chip.id)"
          >&times;</button>
        </span>
        <button type="button" class="chart-filter-chip__clear-all" @click="$emit('clear-chart-filters')">
          {{ $t('arMatch.chartFilterChip.clearAll') }}
        </button>
      </div>

      <GridExportStatus ref="exportStatus" :loading="loading" />

      <GraphqlGrid
        v-model:columns="columns"
        :items="items"
        :total="total"
        :skip="skip"
        :take="take"
        :sort="sort"
        :filter="filter"
        :loading="loading"
        :pageable="pageable"
        :height="gridHeight"
        :column-selector-default-columns="defaultColumns"
        :allow-export="currentUser.canExportMatch"
        :export-label="t('arGridExport.exportLabel')"
        :options-label="t('arGridExport.optionsLabel')"
        :totals-by-columns="totalsByColumns"
        :loading-totals="loadingTotals"
        :analyze-store="analyzeStore"
        @datastatechange="onDataStateChange"
        @export="onExport"
      />
    </ContentBoxBody>
  </ContentBox>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, watch, type PropType } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useI18n } from "vue-i18n";
import { apolloClient } from "@/services/graphql/apolloClient";
import GridExportStatus from "@/components/GridExportStatus.vue";
import { useLoadToken } from "@/composables/useLoadToken";
import { buildGridExportRequest } from "@/utils/gridExportRequest";
import { useArCurrentUserStore } from "@/stores/arCurrentUser";
import { useContextStore } from "@/stores/context";
import { useGridColumnPreferencesStore } from "@/stores/gridColumnPreferences";
import { useCustomAttributesStore } from "@/stores/customAttributes";
import { useArCurrenciesStore } from "@/stores/arCurrencies";
import { fetchFilterSummary, type MatchSummaryOperations, type MatchSummaryResponse } from "@/api";
import { ContentBox, ContentBoxBody } from "@ada/design-system";
import GraphqlGrid from "@ada/design-system/components/graphql-grid/Index.vue";
import {
  flattenGraphqlGridColumns,
  mergeCachedGraphqlGridColumns,
  normalizeGraphqlGridColumns,
  type GraphqlGridColumnOrGroup,
  type GraphqlGridDataState,
  type GraphqlGridFilterDescriptor,
  type GraphqlGridPageableSettings,
  type GraphqlGridSortDescriptor,
} from "@ada/design-system/components/graphql-grid/types";
import {
  combineFilterDescriptors,
  flattenFilterDescriptors,
  kendoFilterToGraphqlWhere,
  kendoSortToGraphqlOrder,
  partitionFilterDescriptor,
} from "@ada/design-system/components/graphql-grid/kendoToGraphql";
import {
  getActiveColumnsArray,
  getTotalFieldsCountByTrueValue,
  getTotalFieldsSummation,
  getTotalFieldsWeightedAvg,
} from "@ada/design-system/utils/totalColumnsUtils";
import { saleMatchColumnsGrid } from "../data/graphqlColumns";
import {
  applyCustomAttributeDefinitions,
  isCustomDataPointField,
  toCustomAttributeFilters,
} from "@/utils/customAttributeColumns";
import {
  fetchSaleMatchRows,
  toDisplaySaleMatchRow,
  visibleSaleMatchRowFields,
  type SaleMatchRow,
} from "../data/saleMatchRows";

// Identifies this grid's entry in useGridColumnPreferencesStore's per-grid column-visibility map -
// each grid picks its own key, so adding a new persisted grid later is just a new constant here,
// no store-shape change. `v2`: column parity (2026-10-02) changed the list, and an old snapshot
// would restore its own visibility over the new defaults.
const GRID_KEY = "sale-match-list-v2";

// Ada-Platform's MatchFiltersController (POST /api/filters/match/sales/summary).
const MATCH_SUMMARY_ENDPOINT = { transaction: "filters", section: "match", level: "sales", operation: "summary" };

export default defineComponent({
  name: "ListMatch",
  components: {
    ContentBox,
    ContentBoxBody,
    GraphqlGrid,
    GridExportStatus,
  },
  props: {
    // A Kendo CompositeFilterDescriptor built by MatchView.vue from a chart-segment click (UC-API-10 -
    // "narrowing the whole grid by clicking a segment of the Match overview's charts"), ANDed with
    // the grid's own column filter. Built against the same three fields the backend's chart
    // drill-down uses: isMatched, isExcluded, exclusionReason (see Ada-Platform's
    // SaleMatchRowFilterInputType / KendoFilterTranslator - both already allow-list them for
    // exactly this).
    chartFilter: {
      type: Object as PropType<GraphqlGridFilterDescriptor | undefined>,
      default: undefined,
    },
    // Display-only counterpart to `chartFilter`, one entry per atomic condition (e.g. the
    // "included" bucket is isMatched=true AND isExcluded=false, so it renders as two chips) - built
    // by MatchView.vue in lockstep with `chartFilter` since it already knows the human meaning of
    // each field/value pair. This component only renders and emits removal by id; it does not try
    // to reverse-engineer a label from the raw filter.
    chartFilterChips: {
      type: Array as PropType<Array<{ id: string; label: string }>>,
      default: () => [],
    },
  },
  emits: ["remove-chart-filter-chip", "clear-chart-filters"],
  setup(props) {
    const contextStore = useContextStore();
    const gridColumnPreferencesStore = useGridColumnPreferencesStore();
    const customAttributesStore = useCustomAttributesStore();
    const currenciesStore = useArCurrenciesStore();
    const { t } = useI18n({ useScope: "global" });
    const currentUser = useArCurrentUserStore();
    const exportStatus = ref<InstanceType<typeof GridExportStatus> | null>(null);
    // The GraphQL variables of the page the grid last fetched - what the export is built from.
    // Plain: nothing renders from it.
    let lastVariables: Record<string, unknown> | undefined;
    // Fetches fire from several watchers and from onDataStateChange, so two can be in flight at once:
    // only the latest one may write the page, the export variables or `loading`.
    const { start, isStale } = useLoadToken();

    // Mirrors apps/ap's OverviewList.vue getGridColumns(): only bother merging when there's
    // actually a cached snapshot for this grid, otherwise the fresh definitions are already
    // exactly what should render.
    const cachedColumns = gridColumnPreferencesStore.getColumns(GRID_KEY);
    const columns = ref<GraphqlGridColumnOrGroup[]>(
      cachedColumns.length > 0
        ? mergeCachedGraphqlGridColumns(normalizeGraphqlGridColumns(saleMatchColumnsGrid), cachedColumns)
        : normalizeGraphqlGridColumns(saleMatchColumnsGrid),
    );

    const pageable: GraphqlGridPageableSettings = {
      buttonCount: 5,
      info: true,
      type: "numeric",
      pageSizes: [10, 25, 50, 100, 150],
      previousNext: true,
    };

    const items = ref<SaleMatchRow[]>([]);
    const total = ref(0);
    const skip = ref(0);
    const take = ref(25);
    const sort = ref<GraphqlGridSortDescriptor[]>([{ field: "sourceRowNumber", dir: "asc" }]);
    const filter = ref<GraphqlGridFilterDescriptor | undefined>(undefined);
    const loading = ref(false);
    const gridHeight = ref("480px");

    // Footer totals (column parity, 2026-10-02, like AP's Match grid). Their own load token: the
    // totals and the rows race independently, and a slow totals response must not overwrite a
    // newer filter's.
    const { start: startTotals, isStale: isTotalsStale } = useLoadToken();
    const totalsByColumns = ref<MatchSummaryResponse | undefined>(undefined);
    const loadingTotals = ref(false);
    // AR has no custom-data-point types the footer needs - same stub the Opportunity grids pass.
    const analyzeStore = { customDataPointTypes: {} as Record<string, string> };

    // The snapshot GraphqlGridColumnSelector's Reset restores to. Without this,
    // GraphqlGridColumnSelector falls back to "make every column visible" (see its own
    // onReset/defaultColumns doc) instead of restoring each column's own static `hidden` default
    // (e.g. originalBuyerName's hidden: true). Kept in sync with the live custom-attribute
    // definitions so Reset doesn't blank out the "Custom Attributes" group's backend-provided
    // titles/visibility back to their generic globalColumns.ts placeholders.
    const defaultColumns = computed(() =>
      applyCustomAttributeDefinitions(normalizeGraphqlGridColumns(saleMatchColumnsGrid), customAttributesStore.definitions),
    );

    // The grid's own column filter ANDed with the chart drill-down (UC-API-10).
    const effectiveFilter = computed(() => combineFilterDescriptors(filter.value, props.chartFilter));

    // Re-applies customAttributesStore's current schema onto `columns` - Navbar.vue owns fetching
    // it (loaded before this component ever mounts, and reloaded whenever the active company or
    // sale file changes), this just reacts. Assigning `columns.value` (rather than mutating it)
    // reuses the existing watch(columns, ...) below to persist the result and refetch - the same
    // path a manual show/hide already goes through.
    function applyCustomAttributes() {
      columns.value = applyCustomAttributeDefinitions(columns.value, customAttributesStore.definitions);
    }

    // Fills the space CalculumLayout's main section leaves below the grid instead of a fixed
    // height, matching the same convention as apps/ap's list grids (e.g. ListPeers.vue) - just
    // with this component's own offset, since the header/toolbar above it isn't the same height.
    function setGridHeight() {
      const container = document.getElementById("container-main-id");
      if (!container) return;
      gridHeight.value = container.clientHeight - 115 < 350 ? "350px" : `${container.clientHeight - 115}px`;
    }

    async function loadPage() {
      const token = start();
      // A page that is loading, failed or has no version must not leave the previous page's variables
      // to be exported: the export reads only what the last SUCCESSFUL fetch sent.
      lastVariables = undefined;
      const versionUuid = contextStore.saleFileVersionUuid;
      if (!versionUuid) {
        items.value = [];
        total.value = 0;
        loading.value = false;
        return;
      }

      loading.value = true;
      try {
        // The tenant's custom attributes are NOT fields of SaleMatchRowFactFilterInput — they travel
        // as the list field's own per-ordinal argument — so their predicates come out of the filter
        // before a `where` is built from it. Sending them in the `where` is what used to fail GraphQL
        // validation and blank the whole grid rather than the one column.
        const split = partitionFilterDescriptor(effectiveFilter.value, isCustomDataPointField);

        const page = await fetchSaleMatchRows(
          apolloClient,
          versionUuid,
          visibleSaleMatchRowFields(columns.value),
          skip.value,
          take.value,
          kendoSortToGraphqlOrder(sort.value),
          kendoFilterToGraphqlWhere(split.first),
          toCustomAttributeFilters(flattenFilterDescriptors(split.second)),
          currenciesStore.currency,
        );
        // A newer load already owns items/total/lastVariables/loading now.
        if (isStale(token)) return;
        items.value = page.items.map((row) => toDisplaySaleMatchRow(row, t));
        total.value = page.total;
        lastVariables = page.variables;
      } catch {
        // Same convention as Waterfall's drill-in: a failed page must not leave the previous
        // page's rows rendered (nor reject unhandled from the watchers that fire loadPage() and
        // forget it) - fall back to GraphqlGrid's own empty state. lastVariables stays undefined,
        // so there is nothing to export either. A stale failure must change nothing: it would blank
        // the newer page while lastVariables still belongs to it.
        if (isStale(token)) return;
        items.value = [];
        total.value = 0;
      } finally {
        if (!isStale(token)) loading.value = false;
      }
    }

    /** Only the fields this grid opted a footer into (`footerCell`, graphqlColumns.ts), the same
     * gate the Opportunity grids use - the Match summary 400s the whole request over one field it
     * does not total. */
    function buildSummaryOperations(): MatchSummaryOperations {
      const flat = flattenGraphqlGridColumns(columns.value);
      const withFooter = getActiveColumnsArray(flat)
        .filter((field: string) => flat.find((column) => column.field === field)?.footerCell);
      return {
        sum: getTotalFieldsSummation(withFooter),
        "avg.weighted.ceil": getTotalFieldsWeightedAvg(withFooter),
        "count.true": getTotalFieldsCountByTrueValue(withFooter),
      };
    }

    async function fetchTotals() {
      const token = startTotals();
      const versionUuid = contextStore.saleFileVersionUuid;
      if (!versionUuid) {
        totalsByColumns.value = undefined;
        loadingTotals.value = false;
        return;
      }

      // Same split loadPage() does: a custom attribute is not a field the summary's telerikFilter
      // knows, so its clauses stay out rather than 400 the whole request.
      const split = partitionFilterDescriptor(effectiveFilter.value, isCustomDataPointField);

      loadingTotals.value = true;
      try {
        const response = await fetchFilterSummary<MatchSummaryOperations, MatchSummaryResponse>({
          endpoint: MATCH_SUMMARY_ENDPOINT,
          filters: {
            currencyRate: currenciesStore.currency,
            targetSaleFileVersionUuid: versionUuid,
            telerikFilter: JSON.stringify(split.first ?? { filters: [], logic: "and" }),
            chartsFilter: "[]",
            searchText: "",
            // true = every row, excluded ones included: saleMatchRows lists excluded lines too (the
            // chart's "Excluded" bucket drills into exactly those), so anything else would total a
            // different set of rows than the grid shows.
            fullDisabled: true,
          },
          summary: buildSummaryOperations(),
        });
        if (isTotalsStale(token)) return;
        totalsByColumns.value = response;
      } catch {
        // Same convention as loadPage(): fetchTotals() is fired and forgotten, so a failed summary
        // must not reject unhandled - the footer just shows no totals. A stale failure changes nothing.
        if (isTotalsStale(token)) return;
        totalsByColumns.value = undefined;
      } finally {
        if (!isTotalsStale(token)) {
          loadingTotals.value = false;
        }
      }
    }

    /** Rows and totals together - for everything that changes which rows match. */
    function reload() {
      loadPage();
      fetchTotals();
    }

    /** The grid's "Export Excel": the last query (chart drill-down included) and visible columns. */
    function onExport() {
      if (!lastVariables) {
        // lastVariables is cleared for the whole duration of a fetch: say why nothing happens.
        if (loading.value) exportStatus.value?.notice("arGridExport.stillLoading");
        return;
      }
      const request = buildGridExportRequest({
        variables: lastVariables,
        columns: columns.value,
        fileName: t("arGridExport.fileName.match"),
      });
      if (!request) return;
      exportStatus.value?.start("Match", request, total.value)?.catch(() => undefined);
    }

    function onDataStateChange(state: GraphqlGridDataState) {
      const filterChanged = JSON.stringify(state.filter ?? null) !== JSON.stringify(filter.value ?? null);
      skip.value = state.skip ?? 0;
      take.value = state.take ?? take.value;
      sort.value = state.sort ?? [];
      filter.value = state.filter;
      // Paging and sorting do not change the totals; a filter does.
      if (filterChanged) reload();
      else loadPage();
    }

    onMounted(() => {
      reload();
      setGridHeight();
      window.addEventListener("resize", setGridHeight);
    });
    onUnmounted(() => window.removeEventListener("resize", setGridHeight));
    watch(() => contextStore.saleFileVersionUuid, () => {
      reload();
    });
    // customAttributesStore.definitions changes whenever Navbar.vue (re)loads the schema - on
    // mount (before this component even exists, per LayoutView's session-validated gate) and on
    // every later company/sale-file switch. `immediate: true` covers the already-loaded case;
    // the reactive part covers a switch that happens while this view stays mounted.
    watch(() => customAttributesStore.definitions, applyCustomAttributes, { immediate: true });
    // Reload with the new field set when the user shows/hides a column via the column
    // selector - otherwise a newly-revealed column stays blank until the next page/sort/filter.
    // Persisted here too, so the choice survives a reload or a later visit - this also covers
    // ColumnSelector's "Reset" button, which is just another "update:columns" emit.
    watch(columns, () => {
      gridColumnPreferencesStore.setColumns(GRID_KEY, columns.value);
      // A shown/hidden column can change which footers exist, so the totals refetch too.
      reload();
    });
    // A chart-segment click (or its toggle-off) narrows/unnarrows the grid (UC-API-10) - reset to
    // page 1 same as a native column-filter change would, then refetch. Cleared first (same as
    // apps/ap's OverviewList.vue does on its own chartsFilter changes) so a stale cached
    // saleMatchRows response never renders under the new filter.
    watch(
      () => props.chartFilter,
      async () => {
        await apolloClient.clearStore();
        skip.value = 0;
        reload();
      },
      { deep: true },
    );

    // Leaving the Match route entirely (not just switching tabs within it - onBeforeRouteLeave only
    // fires on a real route change) drops the cached saleMatchRows query rather than letting it
    // outlive this screen and serve stale rows if the analyst comes back to a different version.
    onBeforeRouteLeave(() => {
      apolloClient.clearStore();
    });

    return {
      columns,
      defaultColumns,
      pageable,
      items,
      total,
      skip,
      take,
      sort,
      filter,
      loading,
      gridHeight,
      totalsByColumns,
      loadingTotals,
      analyzeStore,
      currentUser,
      exportStatus,
      t,
      onDataStateChange,
      onExport,
    };
  },
});
</script>

<style scoped>
.chart-filter-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.chart-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  border-radius: 100vmax;
  color: var(--brand-700);
  background: var(--brand-50);
  font-size: 0.8125rem;
  line-height: 1.4;
}

.chart-filter-chip__remove {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0;
}

.chart-filter-chip__clear-all {
  border: none;
  background: transparent;
  color: var(--brand-700);
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0;
}
</style>
