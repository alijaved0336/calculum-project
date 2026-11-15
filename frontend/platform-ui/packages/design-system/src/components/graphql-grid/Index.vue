<script lang="ts">
import {
  computed,
  defineComponent,
  provide,
  ref,
  watch,
  type PropType,
} from "vue";
import { Grid } from "@progress/kendo-vue-grid";
import { IntlProvider } from "@progress/kendo-vue-intl";
import { Loader } from "@progress/kendo-vue-indicators";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { getter } from "@progress/kendo-vue-common";
import { getSelectedState } from "@progress/kendo-vue-data-tools";
import GraphqlGridColumnSelector from "./ColumnSelector.vue";
import GraphqlGridColumnMenu from "./ColumnMenu.vue";
import GraphqlGridExportMenu from "./ExportMenu.vue";
import GraphqlGridPager from "./Pager.vue";
import { resolvePagerPageSizes } from "./pager";
import {
  GRAPHQL_GRID_COLUMN_MENU_KEY,
  removeFieldFilter,
  upsertFieldFilter,
  type GraphqlGridColumnMenuContext,
} from "./column-menu";
import IconClearFilters from "../../assets/icons/iconClearFilters.vue";
import BooleanYesNoColumn from "../grid/custom-columns/BooleanYesNoColumn.vue";
import TextColumn from "../grid/custom-columns/TextColumn.vue";
import MoneyColumn from "../grid/custom-columns/MoneyColumn.vue";
import NoDecimalsColumn from "../grid/custom-columns/NoDecimalsColumn.vue";
import TooltipText from "../grid/custom-columns/TooltipText.vue";
import ConfidenceScoreColumn from "../grid/custom-columns/ConfidenceScoreColumn.vue";
import TooltipColumn from "../grid/custom-columns/TooltipColumn.vue";
import PercentColumn from "../grid/custom-columns/PercentColumn.vue";
import TotalsFooterColumn from "../grid/custom-columns/TotalsFooterColumn.vue";
import ProbabilityOfSuccessLabel from "../grid/custom-columns/ProbabilityOfSuccessLabel.vue";
import DateColumn from "../grid/custom-columns/DateColumn.vue";
import MoneyColumnRound from "../grid/custom-columns/MoneyColumnRound.vue";
import NineBoxColumn from "../grid/custom-columns/NineBoxColumn.vue";
import EntityLogoColumn from "../grid/custom-columns/EntityLogoColumn.vue";
import CountryFlagColumn from "../grid/custom-columns/CountryFlagColumn.vue";

import {
  GRAPHQL_GRID_DEFAULT_DATA_ITEM_KEY,
  GRAPHQL_GRID_DEFAULT_PAGEABLE,
  GRAPHQL_GRID_DEFAULT_SELECTED_FIELD,
  GRAPHQL_GRID_DEFAULT_SORTABLE,
  flattenGraphqlGridColumns,
  isGraphqlGridColumnGroup,
  visibleGraphqlGridColumns,
  type GraphqlGridAnalyzeStore,
  type GraphqlGridColumn,
  type GraphqlGridColumnOrGroup,
  type GraphqlGridDataState,
  type GraphqlGridFilterDescriptor,
  type GraphqlGridPageable,
  type GraphqlGridRow,
  type GraphqlGridSelectable,
  type GraphqlGridSelectState,
  type GraphqlGridSortDescriptor,
  type GraphqlGridSortable,
} from "./types";

/**
 * Slots GraphqlGrid already declares on the inner Kendo Grid (plus the public
 * detail wrapper). Host-provided names in this set must not be forwarded or Vue
 * warns about duplicate slots. Keep in sync with the named slot names below.
 */
const GRAPHQL_GRID_RESERVED_SLOT_NAMES = new Set([
  "default",
  "detail",
  "detailTemplate",
  "booleanYesNoColumn",
  "regulationTypeTemplate",
  "textTemplate",
  "textTemplateLeftAlign",
  "moneyTemplate",
  "decimalsTemplate",
  "supplierNameMatchListUltimateParentTooltip",
  "commodityColumn",
  "creditRatingSourceText",
  "countryCreditRatingText",
  "aggregatedLinesCountMatch",
  "clusterBuyerCountryCode",
  "confidenceScoreColumnSticky",
  "originalIdNumberMatch",
  "originalParentCompanyNameMatch",
  "addressTooltip",
  "originalAddressMatch",
  "cityMatch",
  "originalCityMatch",
  "stateMatch",
  "zipCodeMatch",
  "originalStateMatch",
  "nameMatchListTooltipSticky",
  "originalZipCodeMatch",
  "countryMatch",
  "domainMatch",
  "currencyMatch",
  "originalPaymentTermDescriptionMatch",
  "percentColumn",
  "dateColumn",
  "nineBoxColumn",
  "moneyTemplateRound",
  "TotalsBycolumnsSum",
  "TotalsBycolumnsCount",
  "TotalsBycolumnsAvgWeightedCeil",
  "TotalsBycolumnsAvgWeighted",
  "TotalsBycolumnsCountTrue",
  "ProbabilityOfSuccessLabel",
]);

/**
 * Thin Kendo Grid shell for GraphQL-backed lists.
 * Parent owns the query: pass `items`/`total`/`skip`/`take`/`sort`/`filter`,
 * react to `datastatechange` to refetch (map skip/take/sort/filter → GraphQL).
 * `autoProcessData` is forced off so Kendo does not re-sort/page the current
 * slice client-side — sorting must come from the server (or Storybook mock).
 * Selection is page-scoped by default (current `items` only).
 * Column visibility: GraphqlGridColumnSelector edits a draft and emits
 * `update:columns` — the parent owns the `columns` array.
 */
export default defineComponent({
  name: "GraphqlGrid",
  components: {
    Grid,
    IntlProvider,
    Loader,
    Tooltip,
    GraphqlGridColumnSelector,
    GraphqlGridPager,
    GraphqlGridExportMenu,
    IconClearFilters,
    BooleanYesNoColumn,
    TextColumn,
    MoneyColumn,
    NoDecimalsColumn,
    TooltipText,
    ConfidenceScoreColumn,
    TooltipColumn,
    PercentColumn,
    TotalsFooterColumn,
    ProbabilityOfSuccessLabel,
    DateColumn,
    MoneyColumnRound,
    NineBoxColumn,
    EntityLogoColumn,
    CountryFlagColumn
  },
  props: {
    items: { type: Array as PropType<GraphqlGridRow[]>, default: () => [] },
    // Flat GraphqlGridColumn[], or with GraphqlGridColumnGroup parent headers mixed in - Kendo's
    // own <Grid> renders a group's `children` as a multi-row header natively; ColumnSelector
    // flattens back to leaf columns for its own list (see types.ts).
    columns: { type: Array as PropType<GraphqlGridColumnOrGroup[]>, required: true },
    total: { type: Number, default: 0 },
    skip: { type: Number, default: 0 },
    take: { type: Number, default: 20 },
    sort: {
      type: Array as PropType<GraphqlGridSortDescriptor[]>,
      default: () => [],
    },
    /**
     * Enable Kendo sorting. Prefer `{ allowUnsort: true, mode: 'single' }`
     * so columns can cycle asc → desc → none.
     */
    sortable: {
      type: [Boolean, Object] as PropType<GraphqlGridSortable>,
      default: false,
    },
    /**
     * Show the pager under the table. `false` hides it.
     * The entire pager is also hidden when there is only one page, unless
     * `{ info: true }` is set: then it stays so the range shows the total.
     * The right block (items per page + range) is hidden by default;
     * `{ info: true }` shows it. `{ pageSizes: false }` hides only the
     * dropdown when that block is shown.
     */
    pageable: {
      type: [Boolean, Object] as PropType<GraphqlGridPageable>,
      default: true,
    },
    // DS DropdownPanel on the header "..." (sort + nested filter). Kendo's stock
    // column-menu popup stays off. Each column's "filter" type (text/numeric/boolean/date)
    // drives the filter submenu. Set a column's own columnMenu: false to opt that
    // single column out.
    columnMenu: { type: Boolean, default: true },
    filter: {
      type: Object as PropType<GraphqlGridFilterDescriptor>,
      default: undefined,
    },
    loading: { type: Boolean, default: false },
    /**
     * Grid height CSS value. `"auto"` (default) sizes the body to the current rows
     * (Kendo `scrollable="none"`); the shell stays at 100% width and wide columns scroll
     * on `.k-grid-aria-root`. Pass a fixed value (e.g. `"420px"`) for a scrollable viewport
     * via `.k-grid-content`.
     */
    height: { type: String, default: "auto" },
    /** Stable row id field (not array index). Used for selection map keys. */
    dataItemKey: {
      type: String,
      default: GRAPHQL_GRID_DEFAULT_DATA_ITEM_KEY,
    },
    /**
     * Checkbox / multi-row selection via Kendo.
     * `true` → multiple checkbox selection; or pass GridSelectableSettings.
     */
    selectable: {
      type: [Boolean, Object] as PropType<GraphqlGridSelectable>,
      default: false,
    },
    /** Boolean field Kendo uses for checkbox column / row selected state. */
    selectedField: {
      type: String,
      default: GRAPHQL_GRID_DEFAULT_SELECTED_FIELD,
    },
    /**
     * Controlled selection map (`dataItemKey` → selected).
     * Omit for internal state; still emits `update:select` / `selectionchange`.
     */
    select: {
      type: Object as PropType<GraphqlGridSelectState>,
      default: undefined,
    },
    /** Set to hide the built-in column show/hide selector above the table. */
    hideColumnSelector: { type: Boolean, default: false },
    /**
     * Shows a "⋮" options menu above the table with an "Export Excel" entry that emits `export`.
     * The grid knows nothing about who may export or how: the caller decides this flag (role,
     * feature key) and does the export on the event.
     */
    allowExport: { type: Boolean, default: false },
    /** Label of the export menu entry; the caller passes the translated text. */
    exportLabel: { type: String, default: "Export Excel" },
    /** Title/aria-label of the options trigger; the caller passes the translated text. */
    optionsLabel: { type: String, default: "Options" },
    /** Snapshot GraphqlGridColumnSelector's Reset restores to - see its own prop docs. */
    columnSelectorDefaultColumns: {
      type: Array as PropType<GraphqlGridColumnOrGroup[]>,
      default: undefined,
    },
    // The `{ sum, "avg.weighted.ceil", "count.true", totalCount, ... }` object fed to
    // TotalsFooterColumn's `dataSet` - loosely typed since callers' response shapes carry extra
    // fields (e.g. totalCount) alongside the three bucket maps. Rendered for flat and grouped
    // `columns` alike (see renderedColumns below for why grouped grids no longer hang, WI#18884).
    totalsByColumns: {
      type: Object as PropType<GraphqlGridRow>,
      default: undefined,
    },
    /** Separate from `loading` - row data and the totals footer can finish loading independently. */
    loadingTotals: { type: Boolean, default: false },
    // Host app's analyze store (AP: useAnalyzeStore(), AR: none yet - a stub `{ customDataPointTypes: {} }`
    // works since AR has no custom-data-point concept). Defaulted so consumers with no footer
    // totals don't need to pass anything.
    analyzeStore: {
      type: Object as PropType<GraphqlGridAnalyzeStore>,
      default: () => ({ customDataPointTypes: {} }),
    },
    /**
     * Master-detail rows. When true, every row gains Kendo's expand cell and an expanded row
     * renders the `detail` slot with its dataItem — the caller owns what the sub-list shows
     * (see the slot's own comment). Expansion state lives on the item's `expanded` field; the
     * default handler toggles it in place so a caller that only renders needs no wiring, and
     * `expandchange` is emitted for callers that fetch the sub-list lazily.
     */
    expandable: { type: Boolean, default: false },
    /**
     * Which rows actually have something under them. Kendo's expander column is all-or-nothing,
     * so per-row visibility is done the way AP's grids do it: rows this returns false for get a
     * class that hides their expander, and their expandchange is swallowed — the arrow neither
     * shows nor works. Omit it and every row expands.
     */
    expandableRow: {
      type: Function as PropType<((item: GraphqlGridRow) => boolean) | undefined>,
      default: undefined,
    },
    /** Per-user number-formatting locale, forwarded to TotalsFooterColumn. */
    locale: { type: String, default: "en-US" },
    /** Forwarded to EntityLogoColumn - `false` keeps its cells from opening the entity on click. */
    allowOpenEntity: { type: Boolean, default: true },
  },
  emits: [
    "datastatechange",
    "update:select",
    "selectionchange",
    "update:columns",
    "expandchange",
    "export",
  ],
  setup(props, { emit, slots }) {
    const intlLocale = "en-US";
    const forwardedSlotNames = computed(() =>
      Object.keys(slots).filter((name) => !GRAPHQL_GRID_RESERVED_SLOT_NAMES.has(name)),
    );
    const internalSelect = ref<GraphqlGridSelectState>({});

    const isSelectable = computed(() => {
      const value = props.selectable;
      if (!value) {
        return false;
      }
      if (value === true) {
        return true;
      }
      return value.enabled !== false;
    });

    const selectableSettings = computed(() => {
      if (!isSelectable.value) {
        return false;
      }
      if (props.selectable === true) {
        return {
          enabled: true,
          mode: "multiple" as const,
          drag: false,
          cell: false,
        };
      }
      return {
        enabled: true,
        mode: "multiple" as const,
        drag: false,
        cell: false,
        ...props.selectable,
      };
    });

    const selectState = computed({
      get(): GraphqlGridSelectState {
        return props.select ?? internalSelect.value;
      },
      set(next: GraphqlGridSelectState) {
        if (props.select === undefined) {
          internalSelect.value = next;
        }
        emit("update:select", next);
        emit("selectionchange", next);
      },
    });

    const idGetter = computed(() => getter(props.dataItemKey));

    watch(
      () => props.dataItemKey,
      () => {
        if (props.select === undefined) {
          internalSelect.value = {};
        }
      },
    );

    const resolvedPageable = computed(() => {
      if (props.pageable === false) {
        return false;
      }
      if (props.pageable === true) {
        return { ...GRAPHQL_GRID_DEFAULT_PAGEABLE };
      }
      return {
        ...GRAPHQL_GRID_DEFAULT_PAGEABLE,
        ...props.pageable,
      };
    });

    const resolvedSortable = computed(() => {
      if (props.sortable === false) {
        return false;
      }
      if (props.sortable === true) {
        return { ...GRAPHQL_GRID_DEFAULT_SORTABLE };
      }
      return {
        ...GRAPHQL_GRID_DEFAULT_SORTABLE,
        ...props.sortable,
      };
    });

    function emitDataState(partial: GraphqlGridDataState) {
      emit("datastatechange", {
        skip: props.skip,
        take: props.take,
        sort: props.sort,
        filter: props.filter,
        ...partial,
      });
    }

    const leafColumns = computed(() => flattenGraphqlGridColumns(props.columns));

    const columnMenuContext: GraphqlGridColumnMenuContext = {
      sort: computed(() => props.sort),
      filter: computed(() => props.filter),
      isColumnSortable(field: string) {
        if (!resolvedSortable.value) {
          return false;
        }
        const column = leafColumns.value.find((item) => item.field === field);
        return column?.sortable !== false;
      },
      allowUnsort: computed(() => {
        const sortable = resolvedSortable.value;
        if (!sortable) {
          return false;
        }
        return sortable.allowUnsort !== false;
      }),
      sortMode: computed(() => {
        const sortable = resolvedSortable.value;
        if (sortable && typeof sortable === "object" && sortable.mode === "multiple") {
          return "multiple";
        }
        return "single";
      }),
      columnFilterType(field: string) {
        const column = leafColumns.value.find((item) => item.field === field);
        return column?.filter ?? "text";
      },
      columnFilterOperators(field: string) {
        return leafColumns.value.find((item) => item.field === field)?.filterOperators;
      },
      columnCustomTooltip(field: string) {
        const value = leafColumns.value.find((item) => item.field === field)?.customTooltip;
        return typeof value === "string" && value.trim() !== "" ? value : undefined;
      },
      applySort(field: string, dir: "asc" | "desc") {
        const current = props.sort.find((item) => item.field === field);
        let nextSort: GraphqlGridSortDescriptor[];
        if (current?.dir === dir && columnMenuContext.allowUnsort.value) {
          nextSort = props.sort.filter((item) => item.field !== field);
        } else if (columnMenuContext.sortMode.value === "multiple") {
          nextSort = [
            ...props.sort.filter((item) => item.field !== field),
            { field, dir },
          ];
        } else {
          nextSort = [{ field, dir }];
        }
        emitDataState({ skip: 0, sort: nextSort });
      },
      applyFilter(field: string, operator: string, value: unknown) {
        emitDataState({
          skip: 0,
          filter: upsertFieldFilter(props.filter, {
            field,
            operator,
            value,
            ignoreCase: true,
          }),
        });
      },
      clearFilter(field: string) {
        emitDataState({
          skip: 0,
          filter: removeFieldFilter(props.filter, field),
        });
      },
    };

    provide(GRAPHQL_GRID_COLUMN_MENU_KEY, columnMenuContext);

    const areAllPageSelected = computed(() => {
      if (!isSelectable.value || props.items.length === 0) {
        return false;
      }
      const getId = idGetter.value;
      return props.items.every((item) =>
        Boolean(selectState.value[String(getId(item))]),
      );
    });

    // Kendo's own <Grid> still renders a group's header band even when every one of its
    // `children` is hidden - it only skips rendering the hidden leaf columns underneath, leaving
    // an empty, oddly-sized band with nothing under it. Dropping such groups before they ever
    // reach <Grid> (the column selector below still gets the untouched `columns`, so a hidden
    // group's columns stay toggleable) avoids that rather than fighting it with CSS.
    //
    // The same goes for hidden LEAF columns: they are dropped here too, and stay toggleable in the
    // column selector for the same reason.
    //
    // Only VISIBLE columns ever reach <Grid> (see visibleGraphqlGridColumns in types.ts): that is
    // what lets a grouped grid keep its totals footer. kendo-vue-grid@9.1.0 numbers every column's
    // `parentIndex` over the full list, hidden ones included, then drops the hidden ones and walks
    // `parentIndex` over what is left to build the footer - with a hidden column in a grouped grid
    // the indices point at the wrong columns and that walk can loop forever (WI#18884, the tab hang
    // that used to cost grouped grids their footer). With nothing hidden, nothing shifts.
    const renderedColumns = computed(() => visibleGraphqlGridColumns(props.columns));

    const gridColumns = computed(() => {
      const dataColumns = renderedColumns.value.map((column) => {
        if (
          !props.columnMenu ||
          column.columnMenu === false ||
          column.headerCell
        ) {
          return column;
        }
        return { ...column, headerCell: GraphqlGridColumnMenu };
      });

      if (!isSelectable.value) {
        return dataColumns;
      }

      const selectionColumn: GraphqlGridColumn = {
        field: props.selectedField,
        width: "52px",
        sortable: false,
        resizable: false,
        headerSelectionValue: areAllPageSelected.value,
      };
      return [selectionColumn, ...dataColumns];
    });

    const dataItems = computed(() => {
      if (!isSelectable.value) {
        return props.items;
      }
      const getId = idGetter.value;
      const field = props.selectedField;
      return props.items.map((item) => ({
        ...item,
        [field]: Boolean(selectState.value[String(getId(item))]),
      }));
    });

    function onDataStateChange(event: { data: GraphqlGridDataState }) {
      // Paging is owned by GraphqlGridPager (Kendo pageable is off). Keep the
      // current skip/take so a sort/filter event cannot reset the page size.
      //
      // filter is NOT coalesced with the previous props.filter: Kendo's datastatechange always
      // reports the grid's complete current state, so event.data.filter === undefined is Kendo
      // itself saying "no filter now" (e.g. its own native per-column Clear), never "filter wasn't
      // part of this event." A `?? props.filter` here silently re-applied the stale filter right
      // after the user cleared it - trust Kendo's own state directly.
      emitDataState({
        skip: props.skip,
        take: props.take,
        sort: event.data.sort ?? props.sort,
        filter: event.data.filter,
      });
    }

    // Kendo hands the clicked row and the direction; the default behaviour toggles the item's own
    // `expanded` field in place (the items array belongs to the caller, whose reactivity picks the
    // mutation up), and the event goes out for callers that fetch the sub-list lazily on expand.
    function onExpandChange(event: { dataItem: Record<string, unknown>; value: boolean }) {
      if (props.expandableRow && !props.expandableRow(event.dataItem as GraphqlGridRow)) {
        return;
      }
      event.dataItem.expanded = event.value;
      emit("expandchange", event);
    }

    // Kendo's row-render contract (h, trElement, defaultSlots, rowProps), the same hook AP's
    // grids use for their hideExpanded class: the tr is re-emitted with a marker class when the
    // row has nothing under it, and the scoped CSS below hides its expander cell's anchor.
    function rowRender(
      h: typeof import("vue").h,
      trElement: unknown,
      defaultSlots: unknown,
      rowProps: { class: string; dataItem: GraphqlGridRow },
    ) {
      if (props.expandableRow && !props.expandableRow(rowProps.dataItem)) {
        return h("tr", { class: `${rowProps.class} graphql-grid__row--no-detail` }, defaultSlots as never);
      }
      return trElement;
    }

    function onPageChange(skip: number) {
      emitDataState({ skip });
    }

    function onTakeChange(take: number) {
      emitDataState({ skip: 0, take });
    }

    function onSelectionChange(event: unknown) {
      const next = getSelectedState({
        event: event as never,
        selectedState: selectState.value,
        dataItemKey: props.dataItemKey,
      });
      selectState.value = next;
    }

    function onHeaderSelectionChange(event: {
      event?: { target?: { checked?: boolean } };
      dataItems?: GraphqlGridRow[];
    }) {
      const checked = Boolean(event.event?.target?.checked);
      const getId = idGetter.value;
      const next: GraphqlGridSelectState = { ...selectState.value };
      const rows = event.dataItems ?? props.items;
      for (const item of rows) {
        next[String(getId(item))] = checked;
      }
      selectState.value = next;
    }

    function onColumnsChange(nextColumns: GraphqlGridColumnOrGroup[]) {
      emit("update:columns", nextColumns);
    }

    const pagerPageSizes = computed(() =>
      resolvedPageable.value
        ? resolvePagerPageSizes(resolvedPageable.value.pageSizes)
        : [],
    );

    const showPager = computed(() => {
      if (!resolvedPageable.value || props.total <= 0) {
        return false;
      }
      // With the range block on ("1 - 7 of 7"), the total is information even when everything
      // fits on one page, so the pager stays. Without it, a single page has nothing to show.
      if (resolvedPageable.value.info) {
        return true;
      }
      return Math.ceil(props.total / Math.max(1, props.take)) > 1;
    });

    const isFilterApplied = computed(() => (props.filter?.filters?.length ?? 0) > 0);

    // Kendo's default `scrollable` mode needs a fixed height and flex-fills `.k-grid-content`
    // (empty pane when few rows). `scrollable="none"` renders one table that grows with rows.
    // Explicit px/% heights keep the default scrollable viewport.
    const isContentHeight = computed(() => {
      const value = (props.height ?? "auto").trim().toLowerCase();
      return value === "" || value === "auto";
    });

    const gridScrollable = computed(() =>
      isContentHeight.value ? "none" : undefined,
    );

    const gridStyle = computed(() =>
      isContentHeight.value ? undefined : { height: props.height },
    );

    // "filter"/"sort" are owned by the parent (same as everywhere else in this component) - the
    // reset goes out through the same "datastatechange" event a page/sort/filter change would,
    // so the parent's own handler is what actually clears them and refetches.
    function clearFilters() {
      emit("datastatechange", { skip: 0, sort: [], filter: { filters: [], logic: "and" } });
    }

    return {
      forwardedSlotNames,
      intlLocale,
      isSelectable,
      selectableSettings,
      selectState,
      resolvedPageable,
      showPager,
      resolvedSortable,
      pagerPageSizes,
      gridColumns,
      dataItems,
      isContentHeight,
      gridScrollable,
      gridStyle,
      onDataStateChange,
      onExpandChange,
      rowRender,
      onPageChange,
      onTakeChange,
      onSelectionChange,
      onHeaderSelectionChange,
      onColumnsChange,
      isFilterApplied,
      clearFilters,
    };
  },
});
</script>

<template>
  <IntlProvider :locale="intlLocale">
    <div
      class="graphql-grid"
      :class="{ 'graphql-grid--auto-height': isContentHeight }"
    >
      <!--
        Keep the Grid mounted while loading: tearing it down on every refetch
        also destroys column-menu state mid-interaction.
      -->
      <div
        v-if="loading"
        class="graphql-grid__loading-overlay"
        aria-busy="true"
      >
        <Loader
          size="medium"
          type="pulsing"
        />
      </div>
      <div
        v-if="!hideColumnSelector || isFilterApplied || allowExport"
        class="graphql-grid__toolbar-end"
      >
        <div v-if="isFilterApplied" class="graphql-grid__clear-filters-wrapper">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
            <div class="graphql-grid__clear-filters" title="Clear all filters" @click="clearFilters">
              <IconClearFilters title="Clear all filters" />
            </div>
          </Tooltip>
        </div>
        <GraphqlGridColumnSelector
          v-if="!hideColumnSelector"
          :columns="columns"
          :default-columns="columnSelectorDefaultColumns"
          @update:columns="onColumnsChange"
        />
        <GraphqlGridExportMenu
          v-if="allowExport"
          :trigger-label="optionsLabel"
          :export-label="exportLabel"
          @export="$emit('export')"
        />
      </div>
      <div class="graphql-grid__table-wrap">
        <Grid
          :style="gridStyle"
          :scrollable="gridScrollable"
          :data-items="dataItems"
          :columns="gridColumns"
          :data-item-key="dataItemKey"
          :skip="skip"
          :take="take"
          :total="total"
          :sort="sort"
          :sortable="resolvedSortable"
          :pageable="false"
          :selectable="selectableSettings"
          :selected-field="isSelectable ? selectedField : undefined"
          :select="isSelectable ? selectState : undefined"
          :column-menu="false"
          :filter="filter"
          :auto-process-data="false"
          :detail="expandable ? 'detailTemplate' : undefined"
          :expand-field="expandable ? 'expanded' : undefined"
          :row-render="expandable && expandableRow ? rowRender : undefined"
          @datastatechange="onDataStateChange"
          @selectionchange="onSelectionChange"
          @headerselectionchange="onHeaderSelectionChange"
          @expandchange="onExpandChange"
        >
          <!-- The row's expansion, rendered by the CALLER: a master-detail grid's sub-list is
               domain content (a buyer's lines, a parent's buyers), so the grid only provides the
               mechanism — Kendo's detail row — and hands the dataItem out. -->
          <template v-if="expandable" #detailTemplate="{ props }">
            <slot name="detail" :data-item="props.dataItem" />
          </template>

          <template #booleanYesNoColumn="{ props }">
            <BooleanYesNoColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <!-- AB#20905: Regulation Type, read from the `regulatoryTermsEnforced` flag with AP's labels. -->
          <template #regulationTypeTemplate="{ props }">
            <BooleanYesNoColumn
              v-if="props.rowType !== 'groupHeader'"
              :data-item="props.dataItem"
              :field="props.field"
              true-label-key="global.enforcedPromotedTerms.e"
              false-label-key="global.enforcedPromotedTerms.p"
            />
          </template>

          <template #textTemplate="{ props }">
            <TextColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <template #textTemplateLeftAlign="{ props }">
            <TextColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
              :aligment="'left'" />
          </template>

          <template #entityLogoTemplate="{ props }">
            <EntityLogoColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
              :allow-open-entity="allowOpenEntity" />
          </template>

          <template #countryFlagTemplate="{ props }">
            <CountryFlagColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <template #moneyTemplate="{ props }">
            <MoneyColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <template #decimalsTemplate="{ props }">
            <NoDecimalsColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <template #supplierNameMatchListUltimateParentTooltip="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="supplierNameMatchListUltimateParent" />
          </template>

          <template #commodityColumn="{ props }">
            <TooltipText :data-item="props.dataItem" :field="props.field" behavior="commodityMatch" />
          </template>

          <template #creditRatingSourceText="{ props }">
            <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="creditScoreSource" />
          </template>

          <template #countryCreditRatingText="{ props }">
            <TooltipColumn :data-item="props.dataItem" :field="props.field" behavior="countryCreditRating" />
          </template>

          <template #aggregatedLinesCountMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="aggregatedLinesCountMatch" />
          </template>

          <template #clusterBuyerCountryCode="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="clusterBuyerCountryCode" />
          </template>

          <template #confidenceScoreColumnSticky="{ props }">
            <ConfidenceScoreColumn :data-item="props.dataItem" :sticky="false" />
          </template>

          <template #originalIdNumberMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="originalIdNumberMatch" />
          </template>

          <template #originalParentCompanyNameMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="originalParentCompanyNameMatch" />
          </template>

          <template #addressTooltip="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="address" />
          </template>

          <template #originalAddressMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="originalAddressMatch" />
          </template>

          <template #cityMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="cityMatch" />
          </template>

          <template #originalCityMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="originalCityMatch" />
          </template>

          <template #stateMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="stateMatch" />
          </template>

          <template #zipCodeMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="zipCodeMatch" />
          </template>

          <template #originalStateMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="originalStateMatch" />
          </template>

          <template #nameMatchListTooltipSticky="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="nameMatchList" :sticky="false" />
          </template>

          <template #originalZipCodeMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="originalZipCodeMatch" />
          </template>

          <template #countryMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="countryMatch" />
          </template>

          <template #domainMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="domainMatch" />
          </template>

          <template #currencyMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="currencyMatch" />
          </template>

          <template #originalPaymentTermDescriptionMatch="{ props }">
            <TooltipText :data-item="props.dataItem" behavior="originalPaymentTermDescriptionMatch" />
          </template>

          <template #percentColumn="{ props }">
            <PercentColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <template #dateColumn="{ props }">
            <DateColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <template #nineBoxColumn="{ props }">
            <NineBoxColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
          </template>

          <template #moneyTemplateRound="{ props }">
            <MoneyColumnRound
              v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field"
              :decimals="1" />
          </template>

          <template #TotalsBycolumnsSum="{ props }">
            <TotalsFooterColumn :data-set="totalsByColumns" :field="props.field" :loading-data="loadingTotals"
              :behavior="'sum'" :analyze-store="analyzeStore" :locale="locale" />
          </template>

          <template #TotalsBycolumnsCount="{ props }">
            <TotalsFooterColumn :data-set="totalsByColumns" :field="props.field" :loading-data="loadingTotals"
              :behavior="'count'" :analyze-store="analyzeStore" :locale="locale" />
          </template>

          <template #TotalsBycolumnsAvgWeightedCeil="{ props }">
            <TotalsFooterColumn :data-set="totalsByColumns" :field="props.field" :loading-data="loadingTotals"
              :behavior="'avg.weighted.ceil'" :analyze-store="analyzeStore" :locale="locale" />
          </template>

          <template #TotalsBycolumnsAvgWeighted="{ props }">
            <TotalsFooterColumn :data-set="totalsByColumns" :field="props.field" :loading-data="loadingTotals"
              :behavior="'avg.weighted'" :analyze-store="analyzeStore" :locale="locale" />
          </template>

          <template #TotalsBycolumnsCountTrue="{ props }">
            <TotalsFooterColumn :data-set="totalsByColumns" :field="props.field" :loading-data="loadingTotals"
              :behavior="'count.true'" :analyze-store="analyzeStore" :locale="locale" />
          </template>


          <template #ProbabilityOfSuccessLabel="{ props }">
            <ProbabilityOfSuccessLabel :field="props.field" :data-item="props.dataItem"  />
          </template>

          <!-- Host cell/detail templates Kendo resolves via `column.cell === slotName`. Skip names
               already declared above so Vue does not warn about duplicate slots. -->
          <template
            v-for="name in forwardedSlotNames"
            :key="name"
            #[name]="slotProps"
          >
            <slot :name="name" v-bind="slotProps ?? {}" />
          </template>

        </Grid>
      </div>
      <GraphqlGridPager
        v-if="showPager && resolvedPageable"
        :skip="skip"
        :take="take"
        :total="total"
        :button-count="resolvedPageable.buttonCount"
        :info="resolvedPageable.info !== false"
        :page-sizes="pagerPageSizes"
        @pagechange="onPageChange"
        @takechange="onTakeChange"
      />
    </div>
  </IntlProvider>
</template>

<style lang="scss" scoped>
.graphql-grid {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;

  &__table-wrap {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
  }

  // Keep wide column sets from crushing: tables use Kendo's inline width (sum of col
  // widths, `table-layout: fixed`). Do NOT put `width: max-content` on `.k-grid` — that
  // inflated the shell to intrinsic cell text instead of column widths.
  //
  // Auto-height (`scrollable="none"`): one table under `.k-grid-aria-root`, no
  // `.k-grid-content`. Theme/Kendo sets `overflow: hidden` on `.k-grid-aria-root`, which
  // clips the wide table (scrollWidth ≫ clientWidth) with no scrollbar — and that clip
  // prevents `__table-wrap` / `.k-grid` from seeing overflow either. Scroll on aria-root.
  //
  // Fixed-height: hide header/footer horizontal scrollbars; Kendo syncs their scrollLeft
  // from `.k-grid-content`.
  :deep(.k-grid-table),
  :deep(.k-grid-header-table),
  :deep(.k-grid-footer-table) {
    min-width: max-content;
  }

  &--auto-height {
    :deep(.k-grid) {
      width: 100%;
      max-width: 100%;
      overflow: visible;
    }

    :deep(.k-grid-aria-root) {
      overflow-x: auto;
      overflow-y: visible;
    }
  }

  &:not(.graphql-grid--auto-height) {
    :deep(.k-grid-header),
    :deep(.k-grid-header-wrap),
    :deep(.k-grid-footer),
    :deep(.k-grid-footer-wrap) {
      overflow-x: hidden;
    }

    :deep(.k-grid-content) {
      overflow-x: auto;
    }
  }

  // A row `expandableRow` said no to keeps its hierarchy cell (the columns must stay aligned)
  // but loses the expander anchor inside it - the same rule AP's grids apply via hideExpanded.
  :deep(tr.graphql-grid__row--no-detail > td.k-hierarchy-cell > a) {
    display: none !important;
  }

  &__loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 10rem;
    background: color-mix(in srgb, var(--bg-surface, #fff) 72%, transparent);
  }

  &__toolbar-end {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  // Same trigger-button treatment as GraphqlGridColumnSelector's own icon button
  // (ColumnSelector.vue's __trigger) - kept visually consistent with it.
  &__clear-filters {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    min-height: 2rem;
    padding-inline: 0.45rem;
    border-radius: var(--border-radius-2);
    color: var(--color-text-interactive-button-default);
    cursor: pointer;
    transition: var(--transition-default);

    &:hover {
      background: var(--bg-page);
      color: var(--color-text-interactive-button-hover);
    }
  }
}
</style>
