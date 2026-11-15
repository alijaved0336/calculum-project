<template>
  <ContentBox class="overview-list">
    <ContentBoxBody>
      <div class="overview-list__controls">
        <CustomTabs
          :items="levelTabs"
          :modelValue="level"
          appearance="segmented"
          @update:modelValue="onLevelChange"
        />

        <div v-if="chartChip" class="chart-filter-chips">
          <span class="chart-filter-chip">
            {{ chartChip }}
            <button
              type="button"
              class="chart-filter-chip__remove"
              :aria-label="t('arOpportunity.list.clearChartFilter')"
              @click="$emit('clear-chart-selection')"
            >&times;</button>
          </span>
        </div>
      </div>

      <GridExportStatus ref="exportStatus" :loading="loading" />

      <GraphqlGrid
        :key="level"
        v-model:columns="columns"
        :items="items"
        :total="total"
        :skip="skip"
        :take="take"
        :sort="sort"
        :filter="filter"
        :loading="loading"
        :pageable="pageable"
        :data-item-key="rowKey"
        :expandable="false"
        :height="gridHeight"
        :column-menu="false"
        :column-selector-default-columns="defaultColumns"
        :totals-by-columns="totalsByColumns"
        :loading-totals="loadingTotals"
        :analyze-store="analyzeStore"
        :allow-export="currentUser.canExportLists"
        :export-label="t('arGridExport.exportLabel')"
        :options-label="t('arGridExport.optionsLabel')"
        @datastatechange="onDataStateChange"
        @export="onExport"
      >
      </GraphqlGrid>
    </ContentBoxBody>
  </ContentBox>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, watch, type PropType } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { ContentBox, ContentBoxBody, CustomTabs } from "@ada/design-system";
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
  getTotalFieldsPlainWeightedAvg,
  getTotalFieldsSummation,
  getTotalFieldsWeightedAvg,
} from "@ada/design-system/utils/totalColumnsUtils";
import { apolloClient } from "@/services/graphql/apolloClient";
import GridExportStatus from "@/components/GridExportStatus.vue";
import type { GridExportKind } from "@/api/gridExport";
import { buildGridExportRequest } from "@/utils/gridExportRequest";
import { useArCurrentUserStore } from "@/stores/arCurrentUser";
import { useContextStore } from "@/stores/context";
import { useGridColumnPreferencesStore } from "@/stores/gridColumnPreferences";
import { useArCurrenciesStore } from "@/stores/arCurrencies";
import { useOpportunityGridLevelStore } from "@/stores/opportunityGridLevel";
import { useLoadToken } from "@/composables/useLoadToken";
import {
  applyCustomAttributeDefinitions,
  customDataPointField,
  hideUnnamedCustomAttributes,
  isCustomDataPointField,
  toCustomAttributeFilters,
} from "@/utils/customAttributeColumns";
import {
  fetchFilterSummary,
  type FilterSummaryEndpoint,
  type MatchSummaryResponse,
  type OpportunitySummaryOperations,
  type OpportunitySummaryResponse,
  type OverviewChartDimension,
} from "@/api";
import { useCustomAttributesStore } from "@/stores/customAttributes";
import {
  CLIENT_ONLY_FIELDS,
  fetchOverviewRows,
  toDisplayOverviewRow,
  visibleOverviewRowFields,
  OVERVIEW_ROW_KEYS,
  type OverviewGridLevel,
  type OverviewRow,
} from "../data/overviewRows";
import {
  buyerOverviewColumns,
  parentOverviewColumns,
  saleLineOverviewColumns,
} from "../data/overviewColumns";

/** A chart-segment click, as Overview.vue holds it: the dimension the chart grouped by, the
 * clicked group's RAW value (null for the chart's "not classified" groups) and its human label.
 * `dimensionOrdinal` is only set for `dimension: "customAttribute"` - it's the tenant attribute's
 * own identity (see OverviewMetricsCard.vue's own `dimensionOrdinal`), needed to resolve which
 * `customDataPoint{ordinal}` column a click on one of the twenty actually means. */
export interface OverviewChartSelection {
  dimension: OverviewChartDimension;
  value: string | boolean | null;
  label: string;
  dimensionOrdinal?: number;
}

const LEVELS: OverviewGridLevel[] = ["saleLines", "buyers", "parents"];

/** The export grid each level maps to, and the (translated) name its file gets. */
const EXPORT_KIND: Record<OverviewGridLevel, GridExportKind> = {
  saleLines: "OpportunitySaleLines",
  buyers: "OpportunityBuyers",
  parents: "OpportunityParents",
};

/** This grid's own level ids vs. the summary endpoint's path segment - the backend route says
 * `sales`, not `saleLines` (`OpportunityFiltersController`'s levels mirror the GraphQL grain
 * names' plural, not this screen's own tab ids). */
const SUMMARY_LEVEL: Record<OverviewGridLevel, string> = {
  saleLines: "sales",
  buyers: "buyers",
  parents: "parents",
};

const COLUMN_FACTORIES: Record<OverviewGridLevel, () => GraphqlGridColumnOrGroup[]> = {
  saleLines: saleLineOverviewColumns,
  buyers: buyerOverviewColumns,
  parents: parentOverviewColumns,
};

/**
 * The column a chart click filters, per level: the same dimensions the chart endpoint groups by,
 * so the two surfaces agree on what a segment means (the backend's filter inputs lead with
 * exactly these). At the party levels the buyer dimension maps onto the row's own name, and the
 * supplier dimension maps onto NOTHING — a party row aggregates lines across selling entities, so
 * there is no column that narrowing could honestly filter; those levels show every row while the
 * chip names the selection the line level is honoring.
 *
 * Partial for a second reason too: a dimension absent from a level narrows nothing there. The SME
 * dimension used to be mapped at all three, and is not a chart grouping any more.
 */
const CHART_FIELD: Record<OverviewGridLevel, Partial<Record<OverviewChartDimension, string>>> = {
  saleLines: {
    region: "regionName",
    country: "countryCode",
    // `geography` ("Per Geography") is `country`'s ("Per Country") byte-identical twin today -
    // see OverviewChartDimension's own comment - both still ISO codes, not names, so both filter
    // the same column until the backend actually changes what either one serves.
    geography: "countryCode",
    countryName: "countryName",
    industry: "industryName",
    buyer: "buyerName",
    supplier: "supplierName",
    currency: "currency",
    salesTeam: "salesTeam",
    commodity: "commodity",
    supplierCountry: "supplierCountryName",
    supplierRegion: "supplierRegionName",
  },
  buyers: {
    region: "regionName",
    country: "countryCode",
    geography: "countryCode",
    countryName: "countryName",
    industry: "industryName",
    buyer: "name",
    currency: "currency",
    salesTeam: "salesTeam",
    commodity: "commodity",
    supplierCountry: "supplierCountryName",
    supplierRegion: "supplierRegionName",
  },
  parents: {
    region: "regionName",
    country: "countryCode",
    geography: "countryCode",
    countryName: "countryName",
    industry: "industryName",
    buyer: "name",
    currency: "currency",
    salesTeam: "salesTeam",
    commodity: "commodity",
    supplierCountry: "supplierCountryName",
    supplierRegion: "supplierRegionName",
  },
};

/** What each level persists and restores as the user moves between tabs. */
interface LevelState {
  columns: GraphqlGridColumnOrGroup[];
  skip: number;
  take: number;
  sort: GraphqlGridSortDescriptor[];
  filter: GraphqlGridFilterDescriptor | undefined;
}

export default defineComponent({
  name: "OverviewList",
  components: {
    ContentBox,
    ContentBoxBody,
    CustomTabs,
    GraphqlGrid,
    GridExportStatus,
  },
  props: {
    /** The active chart-segment click, if any; ANDed with the grid's own column filter. */
    chartSelection: {
      type: Object as PropType<OverviewChartSelection | null>,
      default: null,
    },
  },
  emits: ["clear-chart-selection"],
  setup(props) {
    const { t } = useI18n({ useScope: "global" });
    const contextStore = useContextStore();
    const preferences = useGridColumnPreferencesStore();
    const currenciesStore = useArCurrenciesStore();
    const currentUser = useArCurrentUserStore();
    const exportStatus = ref<InstanceType<typeof GridExportStatus> | null>(null);
    // The GraphQL variables of the page the grid last fetched, with the level they belong to: the
    // export is built from exactly these, so the file holds the rows the grid is filtered and sorted
    // to. Plain (not reactive) - nothing renders from it.
    let lastQuery: { level: OverviewGridLevel; variables: Record<string, unknown> | undefined } | null = null;
    // Guards loadPage() against a slower request landing after a fresher one - a tab switch,
    // a chart-selection change or a version change can each fire a new loadPage() while the
    // previous level/filter's fetchOverviewRows is still in flight.
    const { start, isStale } = useLoadToken();
    // Same guard, its own independent counter, for fetchTotals() - the two requests race
    // independently and a slow totals response landing after a newer tab/filter change must not
    // overwrite that newer selection's totals.
    const { start: startTotals, isStale: isTotalsStale } = useLoadToken();

    // AB#20356: was local component state, reset to 'saleLines' every time App.vue's <RouterView>
    // (no <KeepAlive>) unmounts this view - now backed by the shared store so the tab survives a
    // navigate-away-and-back within the same session.
    const { overviewListLevel: level } = storeToRefs(useOpportunityGridLevelStore());

    const levelTabs = computed(() =>
      LEVELS.map((id) => ({ id, label: t(`arOpportunity.list.tabs.${id}`) })));

    // `v2`: column parity (2026-10-02) rebuilt every list, and a snapshot saved under the old list
    // would restore its own visibility over the new defaults.
    const gridKey = (forLevel: OverviewGridLevel) => `opportunity-overview-v2-${forLevel}`;

    // The version's declared attributes, applied to every level's columns: the same twenty static
    // columns on each, titled and shown per what this tenant actually filled in. Read from the
    // store rather than fetched here — Navbar.vue owns the one request, and Match's own grid reads
    // the same place, so two modules on screen do not ask the same endpoint the same question.
    const customAttributesStore = useCustomAttributesStore();

    function freshState(forLevel: OverviewGridLevel): LevelState {
      const fresh = applyCustomAttributeDefinitions(
        normalizeGraphqlGridColumns(COLUMN_FACTORIES[forLevel]()),
        customAttributesStore.definitions);
      const cached = preferences.getColumns(gridKey(forLevel));
      return {
        columns: cached.length > 0
          ? hideUnnamedCustomAttributes(mergeCachedGraphqlGridColumns(fresh, cached), customAttributesStore.definitions)
          : fresh,
        skip: 0,
        take: 25,
        sort: [{ field: "volume", dir: "desc" }],
        filter: undefined,
      };
    }

    // One state per level, built lazily and kept across tab switches, so coming back to a tab
    // restores its page, sort and filter instead of resetting the analyst's place.
    const states = new Map<OverviewGridLevel, LevelState>();
    function stateOf(forLevel: OverviewGridLevel): LevelState {
      let state = states.get(forLevel);
      if (!state) {
        state = freshState(forLevel);
        states.set(forLevel, state);
      }
      return state;
    }

    const columns = ref<GraphqlGridColumnOrGroup[]>(stateOf(level.value).columns);
    const skip = ref(0);
    const take = ref(25);
    const sort = ref<GraphqlGridSortDescriptor[]>(stateOf(level.value).sort);
    const filter = ref<GraphqlGridFilterDescriptor | undefined>(undefined);

    const items = ref<OverviewRow[]>([]);
    const total = ref(0);
    const loading = ref(false);

    const rowKey = computed(() => OVERVIEW_ROW_KEYS[level.value]);

    // The snapshot GraphqlGridColumnSelector's Reset restores to. Kept in sync with the live
    // custom-attribute definitions so Reset doesn't blank the "Custom Attributes" group's
    // tenant-provided titles/visibility back to their generic globalColumns.ts placeholders -
    // same reasoning as ListMatch.vue's own `defaultColumns`.
    const defaultColumns = computed(() =>
      applyCustomAttributeDefinitions(
        normalizeGraphqlGridColumns(COLUMN_FACTORIES[level.value]()),
        customAttributesStore.definitions));

    const pageable: GraphqlGridPageableSettings = {
      buttonCount: 5,
      info: true,
      type: "numeric",
      pageSizes: [10, 25, 50, 100, 150],
      previousNext: true,
    };

    const gridHeight = ref("480px");

    // Fills the space CalculumLayout's main section leaves below the grid instead of a fixed
    // height, same convention as ListMatch.vue (and apps/ap's list grids, e.g. ListPeers.vue) -
    // one shared height for all three levels, since it's the same GraphqlGrid instance re-keyed
    // per tab, not three grids on screen at once.
    function setGridHeight() {
      const container = document.getElementById("container-main-id");
      if (!container) return;
      const height = container.clientHeight - 210;
      gridHeight.value = height < 350 ? "350px" : `${height}px`;
    }

    /** The chart click as a Kendo filter against THIS level's field for the dimension — or no
     * narrowing at all where the level has no honest column for it (see CHART_FIELD). A tenant's
     * custom attribute has no entry in CHART_FIELD (it isn't one fixed column, it's twenty) - its
     * own `dimensionOrdinal` says which `customDataPoint{ordinal}` column the click actually means. */
    const chartFilter = computed<GraphqlGridFilterDescriptor | undefined>(() => {
      if (!props.chartSelection) return undefined;
      const { dimension, value, dimensionOrdinal } = props.chartSelection;
      let field: string | undefined;
      if (dimension === "customAttribute") {
        field = dimensionOrdinal === undefined ? undefined : customDataPointField(dimensionOrdinal);
      } else {
        field = CHART_FIELD[level.value][dimension];
      }
      if (!field) return undefined;
      return {
        logic: "and",
        filters: [{ field, operator: "eq", value }],
      };
    });

    const chartChip = computed(() => props.chartSelection?.label ?? null);

    // AB#20367: a negative Spend Volume sale line is a reason for exclusion, not real opportunity
    // data - permanently narrowed out of both the grid and its footer totals, the same way a chart
    // click narrows both (see `combineFilterDescriptors` below) rather than shown as a dismissible
    // filter chip a user could turn back off. Sale-line grain only: Buyers/Parents show each
    // party's own SUM across every one of its lines, not a per-line value this filter could apply
    // to - excluding negative lines from THAT aggregate is a backend calculation change, tracked
    // separately (AB#20367's own second requirement).
    const excludeNegativeVolume = computed<GraphqlGridFilterDescriptor | undefined>(() =>
      level.value === "saleLines"
        ? { logic: "and", filters: [{ field: "volume", operator: "gte", value: 0 }] }
        : undefined);

    const effectiveFilter = computed(() => combineFilterDescriptors(
      combineFilterDescriptors(filter.value, chartFilter.value),
      excludeNegativeVolume.value,
    ));

    // This grid's footer-totals endpoint (G-395) - a POST per active level via the shared
    // fetchFilterSummary (FilterSummaryEndpoint), answered by Ada.Ar.Api's
    // OpportunityFiltersController.
    const OPPORTUNITY_SUMMARY_ENDPOINT: Omit<FilterSummaryEndpoint, "level"> = {
      transaction: "filters",
      section: "opportunity",
      operation: "summary",
    };

    // The dotted-key shape GraphqlGrid's TotalsFooterColumn templates read
    // ("sum" / "avg.weighted.ceil" / "count.true") - the raw response from fetchFilterSummary
    // uses different (camelCase) keys and gets remapped onto this in fetchTotals().
    const totalsByColumns = ref<MatchSummaryResponse | undefined>(undefined);
    const loadingTotals = ref(false);
    // AR has no custom-data-point concept the footer needs beyond this stub - same as
    // ListMatch.vue's own analyzeStore.
    const analyzeStore = { customDataPointTypes: {} as Record<string, string> };

    /**
     * Only fields THIS grid has actually opted into a footer for (`footerCell` set on the
     * column), not every visible column the generic AP/Match-oriented field lists in
     * totalColumnsUtils happen to also name. Ada-Platform's per-grain summary allow-list 400s the
     * WHOLE request over one unlisted field, and that list is stricter than totalColumnsUtils's
     * (e.g. it refuses `outstanding`/`forecastVolume` for sum, both of which are still visible,
     * footer-less columns here) - gating on `footerCell` keeps this request to exactly the
     * columns ../data/overviewColumns.ts deliberately wired a total for.
     */
    function buildSummaryOperations(): OpportunitySummaryOperations {
      const flat = flattenGraphqlGridColumns(columns.value);
      const withFooter = getActiveColumnsArray(flat)
        .filter((field) => flat.find((column) => column.field === field)?.footerCell);
      return {
        sum: getTotalFieldsSummation(withFooter),
        weightedCeilingAverage: getTotalFieldsWeightedAvg(withFooter),
        weightedAverage: getTotalFieldsPlainWeightedAvg(withFooter),
        countTrue: getTotalFieldsCountByTrueValue(withFooter),
      };
    }

    async function fetchTotals() {
      const token = startTotals();
      const versionUuid = contextStore.saleFileVersionUuid;
      if (!versionUuid) {
        totalsByColumns.value = undefined;
        return;
      }

      // Same split loadPage() already does: custom attributes aren't a field the summary
      // endpoint's telerikFilter allow-list knows either, so their clauses are dropped rather
      // than sent as a shape the backend would 400 the whole request over.
      const split = partitionFilterDescriptor(effectiveFilter.value, isCustomDataPointField);

      loadingTotals.value = true;
      try {
        const response = await fetchFilterSummary<OpportunitySummaryOperations, OpportunitySummaryResponse>({
          endpoint: { ...OPPORTUNITY_SUMMARY_ENDPOINT, level: SUMMARY_LEVEL[level.value] },
          filters: {
            currencyRate: currenciesStore.currency,
            targetSaleFileVersionUuid: versionUuid,
            telerikFilter: JSON.stringify(split.first ?? { filters: [], logic: "and" }),
            chartsFilter: "[]",
            searchText: "",
            fullDisabled: false,
          },
          summary: buildSummaryOperations(),
        });

        if (isTotalsStale(token)) {
          // A newer level/filter/version already owns totalsByColumns now.
          return;
        }

        totalsByColumns.value = {
          sum: response.sum,
          "avg.weighted.ceil": response.weightedCeilingAverage,
          "avg.weighted": response.weightedAverage,
          "count.true": response.countTrue,
          totalCount: response.totalCount,
        };
      } finally {
        if (!isTotalsStale(token)) {
          loadingTotals.value = false;
        }
      }
    }

    async function loadPage() {
      const token = start();
      // A page that is loading, failed or has no version must not leave the previous page's variables
      // to be exported: the export reads only what the last SUCCESSFUL fetch sent.
      lastQuery = null;
      const versionUuid = contextStore.saleFileVersionUuid;
      if (!versionUuid) {
        items.value = [];
        total.value = 0;
        loading.value = false;
        return;
      }

      const fields = visibleOverviewRowFields(level.value, columns.value);
      const requestedLevel = level.value;

      loading.value = true;
      try {
        // The tenant's custom attributes are not fields of either projection's filter input — they
        // travel as the list field's own per-ordinal argument — so their predicates come out of the
        // filter before a `where` is built from it. Sending them in the `where` fails GraphQL
        // validation and blanks the whole page rather than the one column.
        const split = partitionFilterDescriptor(effectiveFilter.value, isCustomDataPointField);

        const page = await fetchOverviewRows<OverviewRow>(
          apolloClient,
          level.value,
          versionUuid,
          fields,
          {
            skip: skip.value,
            take: take.value,
            order: kendoSortToGraphqlOrder(sort.value),
            where: kendoFilterToGraphqlWhere(split.first),
            customFilters: toCustomAttributeFilters(flattenFilterDescriptors(split.second)),
            currencyRate: currenciesStore.currency,
          },
        );

        if (isStale(token)) {
          // A newer level/filter/version already owns items/total/loading now.
          return;
        }

        items.value = page.items.map(toDisplayOverviewRow);
        total.value = page.total;
        lastQuery = { level: requestedLevel, variables: page.variables };
      } catch {
        // Same convention as Waterfall's drill-in: a failed page must not leave the previous
        // page's rows rendered (nor reject unhandled from the watchers that fire loadPage() and
        // forget it) - fall back to GraphqlGrid's own empty state. lastQuery stays null, so there
        // is nothing to export either.
        if (isStale(token)) return;
        items.value = [];
        total.value = 0;
      } finally {
        if (!isStale(token)) {
          loading.value = false;
        }
      }
    }

    /** The grid's "Export Excel": this level's last query and visible columns, to the server. */
    function onExport() {
      if (!lastQuery || lastQuery.level !== level.value) {
        // lastQuery is cleared for the whole duration of a fetch: say why nothing happens.
        if (loading.value) exportStatus.value?.notice("arGridExport.stillLoading");
        return;
      }
      const request = buildGridExportRequest({
        variables: lastQuery.variables,
        columns: columns.value,
        fileName: t(`arGridExport.fileName.${level.value}`),
        clientOnlyFields: CLIENT_ONLY_FIELDS[level.value],
      });
      if (!request) return;
      exportStatus.value?.start(EXPORT_KIND[level.value], request, total.value)?.catch(() => undefined);
    }

    function onDataStateChange(state: GraphqlGridDataState) {
      skip.value = state.skip ?? 0;
      take.value = state.take ?? take.value;
      sort.value = state.sort ?? [];
      // Totals depend on the filter, not on skip/take/sort - refetching them on every page/sort
      // click would ask the endpoint the same question again for no reason.
      const filterChanged = JSON.stringify(state.filter) !== JSON.stringify(filter.value);
      filter.value = state.filter;
      const current = stateOf(level.value);
      current.skip = skip.value;
      current.take = take.value;
      current.sort = sort.value;
      current.filter = filter.value;
      loadPage();
      if (filterChanged) fetchTotals();
    }

    function onLevelChange(id: string) {
      const next = id as OverviewGridLevel;
      if (next === level.value) return;
      level.value = next;

      const state = stateOf(next);
      skip.value = state.skip;
      take.value = state.take;
      sort.value = state.sort;
      filter.value = state.filter;
      // Reassigned last: `state.columns` is always a different array reference than whatever
      // `columns` currently holds (the previous level's own), so this alone triggers the
      // watch(columns, ...) below, which persists it and calls loadPage() with skip/take/sort/
      // filter already updated above. An explicit loadPage() call here as well used to fire a
      // second, redundant request for the same page every tab switch.
      columns.value = state.columns;
    }

    /**
     * The store's current declarations, applied onto the CURRENT level's columns.
     *
     * Re-applying onto `columns` rather than a separate ref reuses the watch below to persist the
     * result and refetch — the same path a manual show/hide takes, which is also what makes the new
     * selection ask for the values.
     *
     * The other levels pick the declarations up when their state is first built, since freshState
     * applies whatever the store holds by then; a level already built before this ran is rebuilt by
     * the states.clear() a version change does anyway.
     */
    function applyCustomAttributes() {
      columns.value = applyCustomAttributeDefinitions(columns.value, customAttributesStore.definitions);
    }

    onMounted(() => {
      loadPage();
      fetchTotals();
      setGridHeight();
      window.addEventListener("resize", setGridHeight);
    });
    onUnmounted(() => window.removeEventListener("resize", setGridHeight));

    watch(() => contextStore.saleFileVersionUuid, () => {
      // A version change resets every level's page back to the start — page 4 of another
      // version's rows is not a place to restore anyone to. The declarations go with it: they are
      // per version, and another version's titles on these columns would be worse than none.
      states.clear();
      const state = stateOf(level.value);
      // take/sort/filter reset alongside skip - freshState() always seeds them fresh, and leaving
      // the refs at the PREVIOUS version's values would request the new version with the old
      // filter/sort while `states` records a LevelState that no longer matches what's on screen.
      skip.value = 0;
      take.value = state.take;
      sort.value = state.sort;
      filter.value = state.filter;
      // Reassigned last, same reason as onLevelChange: this alone triggers watch(columns, ...),
      // which calls loadPage() with everything above already updated - an explicit call here too
      // used to fire a second, redundant request every version change.
      columns.value = state.columns;
    });

    // The store's definitions change whenever Navbar.vue (re)loads the schema — on mount, before
    // this component exists, and on every later company/sale-file switch. `immediate: true` covers
    // the already-loaded case; the reactive part covers a switch made while this view stays mounted.
    watch(() => customAttributesStore.definitions, applyCustomAttributes, { immediate: true });

    watch(columns, () => {
      preferences.setColumns(gridKey(level.value), columns.value);
      stateOf(level.value).columns = columns.value;
      loadPage();
      fetchTotals();
    });

    // A chart click (or its clearing) narrows every level; reset to page 1 like a native filter
    // change. No apolloClient.clearStore() any more (this used to also run it on
    // onBeforeRouteLeave/onBeforeUnmount, both removed): fetchGraphqlGridPage already forces
    // `fetchPolicy: "network-only"`, so a stale cache hit was never possible here, and
    // clearStore() wiped the whole app-wide Apollo cache and aborted every OTHER module's (e.g.
    // Match's) in-flight watchers for no benefit to this one.
    watch(
      () => props.chartSelection,
      () => {
        skip.value = 0;
        stateOf(level.value).skip = 0;
        loadPage();
        fetchTotals();
      },
      { deep: true },
    );

    return {
      t,
      level,
      levelTabs,
      columns,
      defaultColumns,
      items,
      total,
      skip,
      take,
      sort,
      filter,
      loading,
      pageable,
      gridHeight,
      rowKey,
      chartChip,
      totalsByColumns,
      loadingTotals,
      analyzeStore,
      currentUser,
      exportStatus,
      onDataStateChange,
      onLevelChange,
      onExport,
    };
  },
});
</script>

<style scoped>
.overview-list__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.chart-filter-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
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

</style>
