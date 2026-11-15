<template>
  <!-- The map is the only chart here dense enough to want its own full-screen view - a bar chart or
       pie already fits the card, and CalculumFullScreen (AR Match's own pattern for its BubbleMap)
       just re-renders the same GeoChart larger. -->
  <CalculumFullScreen
    v-if="mapFullScreen"
    :title="dimensionTitle ?? ''"
    @close-full-screen="closeMapFullScreen"
  >
    <template v-slot:fullScreenContent>
      <GeoChart
        ar-loader
        :data="geoChartRows"
        :value-label="measureTitle"
        height="750px"
        @on-event-click="onMapLocationClick"
      />
    </template>
  </CalculumFullScreen>

  <ContentBox class="h-100">
    <ContentBoxBody>
      <!--
        AP's Program Overview chart controls, verbatim in shape: a "Select Value" for the measure
        and a "Select Metric" for the dimension, each card fully configurable. Both lists come from
        the server's own chart catalog — AR's counterpart of AP's getCategoriesData — rather than
        from a copy kept here, because a hard-coded list and the endpoint's allow-list are two
        sources of truth for one question and the way they fail is a dropdown entry that answers 400.
      -->
      <div class="metrics-card__controls">
        <SearchableDropdown
          class="metrics-card__select"
          :items="measureOptions"
          :modelValue="measure ?? undefined"
          :label="t('global.selectValue')"
          :show-search="false"
          :show-clear-option="false"
          @update:modelValue="onMeasureChange"
        />

        <SearchableDropdown
          class="metrics-card__select"
          :items="dimensionOptions"
          :modelValue="dimensionSelection"
          :label="t('global.selectMetric')"
          :show-search="false"
          :show-clear-option="false"
          @update:modelValue="onDimensionChange"
        />
      </div>

      <!-- The design system has no standalone skeleton; components carry their own showSkeleton
           prop and a chart is not one of them. CalculumLoadingAr non-modal is what MatchView uses. -->
      <div v-if="loading" class="metrics-card__loading">
        <CalculumLoadingAr />
      </div>

      <NoDataAvailable
        v-else-if="!points.length"
        class="mt-3"
        :title="loadError ? t('arOpportunity.empty.loadError') : undefined"
      />

      <!--
        Which component draws is the active (measure, dimension) PAIRING's own `defaultType` —
        `chartType` below just reads it off the active measure's active dimension option. Sale
        Concentration's every option is `pie` (it is Sale Volume drawn as a share, so every grouping
        of it is), `country` is `world_map` under most measures, and everything else named `pie` or
        `world_map` under no measure at all is `horizontal_bar`.
      -->
      <PieChart
        v-else-if="chartType === 'pie'"
        class="mt-3"
        :items="pieItems"
        :height="pieHeight"
        :labelContent="pieLabelFor"
        @slice-click="onSliceClick"
      />

      <HorizontalBarChart
        v-else-if="chartType === 'horizontal_bar'"
        class="mt-3"
        :categories="categories"
        :series="series"
        :categoryAxisTitle="axisTitle"
        :valueAxisTitle="measureTitle"
        :valueLabelsVisible="true"
        :valueLabelsContent="labelFor"
        :valueAxisLabelsContent="axisLabelFor"
        :legendVisible="false"
        :categoryLabelMaxLength="18"
        category-axis-title-color="#98a2b3"
        :category-axis-title-font-weight="500"
        :category-axis-title-font-size="12"
        value-axis-label-color="#98a2b3"
        :value-axis-label-font-weight="700"
        :value-axis-label-rotation="'auto'"
        :height="chartHeight"
        @bar-click="onBarClick"
      />

      <!--
        The "country" dimension (and "geography", its byte-identical twin - see
        OverviewChartDimension's own comment) answers { name: "CHE", value } - an ISO3 code Google's
        GeoChart cannot draw directly (it needs alpha-2). toGeoChartRows (overviewCountryCodes.ts) resolves
        each code against a local alpha-3 -> alpha-2 table and carries the original alpha-3 through
        as the row's own `key`, so a click still narrows the list below by the same code the rest
        of this screen already keys on (see onMapLocationClick). This is AP's real Program Overview
        map (Google Charts choropleth), not AR Match's BubbleMap - a different chart entirely for a
        different use case (a value-by-country heatmap vs. real-coordinate location pins).
      -->
      <div v-else-if="chartType === 'world_map'" class="mt-3">
        <div class="metrics-card__chart-header">
          <span
            class="fa-solid fa-up-right-and-down-left-from-center text-sm chart-fullscreen-toggle"
            @click="openMapFullScreen"
          ></span>
        </div>
        <GeoChart
          ar-loader
          :data="geoChartRows"
          :value-label="measureTitle"
          height="320px"
          @on-event-click="onMapLocationClick"
        />
      </div>

      <!-- Unreached today (chartType only ever resolves to one of the three branches above),
           kept as a safe fallback rather than rendering nothing for a value none of them match. -->
      <NoDataAvailable v-else class="mt-3" />

      <!-- Only past the initial 6-bar page, and only for the list-shaped charts: a map has
           nothing to page through. -->
      <button
        v-if="canShowMore && chartType !== 'world_map'"
        type="button"
        class="metrics-card__show-more"
        @click="toggleExpanded"
      >
        {{ expanded ? t('global.showLess') : t('global.showMore') }}
        <i :class="expanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
      </button>
    </ContentBoxBody>
  </ContentBox>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalculumFullScreen,
  CalculumLoadingAr,
  ContentBox,
  ContentBoxBody,
  GeoChart,
  HorizontalBarChart,
  NoDataAvailable,
  PieChart,
  SearchableDropdown,
} from '@ada/design-system'
import type {
  OverviewChartDimension,
  OverviewChartDimensionOption,
  OverviewChartMeasure,
  OverviewChartMeasureOption,
  OverviewChartPoint,
} from '@/api'
import { formatBigNumbers, getNumberWithDecimals } from '@/utils/chartFormatting'
import { platformDataColor } from '@/utils/chartColors'
import { prependMoneySymbol } from '@/utils/moneyFormatting'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { useOverviewChartSelectionStore } from '@/stores/overviewChartSelection'
import { useOverviewChart } from '../composables/useOverviewChart'
import { useOverviewChartCatalog } from '../composables/useOverviewChartCatalog'
import { toGeoChartRows } from '../data/overviewCountryCodes'
import type { OverviewChartSelection } from './OverviewList.vue'

/**
 * How many groups a chart draws.
 *
 * A client-side cap, and an admitted one: the endpoint returns every group, so grouping by buyer on
 * a large file transfers thousands of rows to draw twenty. The axis title says so rather than
 * silently truncating — a chart that shows the top twenty and looks like it shows everything is the
 * failure worth avoiding. A `topN` parameter on the endpoint is the real fix.
 */
const MAX_GROUPS = 100

/** Bars shown before "Show more" - the chart's own fixed height (below) fits exactly this many. */
const INITIAL_VISIBLE_COUNT = 6

/**
 * Which measures abbreviate the value (X) axis's own tick labels via formatBigNumbers.
 *
 * Exactly the two money measures, `volume` and `cashFlowOpportunity`, so their axis ticks read in
 * the same `$338.2k` shape as their own bar-end labels (labelFor). Days (`actualPaymentTerms`) keep
 * plain whole-number ticks. Still a local list rather than read off the catalog's numericType: it is
 * a display judgement about axis crowding, and a new money measure must be added here explicitly.
 */
const AXIS_BIG_NUMBER_MEASURES: Set<OverviewChartMeasure> = new Set(['volume', 'cashFlowOpportunity'])

export default defineComponent({
  name: 'OverviewMetricsCard',
  components: {
    CalculumFullScreen,
    CalculumLoadingAr,
    ContentBox,
    ContentBoxBody,
    GeoChart,
    HorizontalBarChart,
    NoDataAvailable,
    PieChart,
    SearchableDropdown,
  },
  props: {
    // Null, not a spelled-out fallback: a second hard-coded default here would be a second source
    // of truth that silently wins over both the user's own remembered pick and the catalog. Left
    // for callers (this component's own tests included) that want a specific chart regardless of
    // either - the Overview screen's own two cards no longer set these, using cardIndex instead.
    defaultMeasure: { type: String as PropType<OverviewChartMeasure | null>, default: null },
    defaultDimension: { type: String as PropType<OverviewChartDimension | null>, default: null },
    // Which of the catalog's own measures this card opens on when nobody has picked anything yet
    // (props above unset, and nothing remembered in useOverviewChartSelectionStore) - a POSITION
    // in the served list, not a name, so the Overview screen's left/right cards differ (0 and 1)
    // without either naming a specific measure the way the old default-measure props did. Doubles
    // as the selection store's own per-card key, since the two coincide for every caller today.
    cardIndex: { type: Number, default: 0 },
    /** The screen's active chart selection — for the click-again-to-clear toggle. */
    selection: {
      type: Object as PropType<OverviewChartSelection | null>,
      default: null,
    },
  },
  emits: ['item-selected', 'selection-cleared'],
  setup(props, { emit }) {
    const { t, te } = useI18n()
    const currenciesStore = useArCurrenciesStore()

    const catalog = useOverviewChartCatalog()
    const selectionStore = useOverviewChartSelectionStore()
    const cardKey = String(props.cardIndex)

    // A prior USER pick for this exact card, read once at mount - before either the props above or
    // the catalog's own default get a say. Read synchronously (secureStorage backs the store, not
    // an async fetch), so it seeds the refs below before their first render rather than flashing
    // the catalog's default first.
    const remembered = props.defaultMeasure === null ? selectionStore.getSelection(cardKey) : null

    // Null until a prop, a remembered pick, or the menu arrives with its own default resolves one.
    // useOverviewChart holds its request until then, so the card never asks for a measure nobody
    // chose.
    const measure = ref<OverviewChartMeasure | null>(props.defaultMeasure ?? remembered?.measure ?? null)
    const dimension = ref<OverviewChartDimension | null>(props.defaultDimension ?? remembered?.dimension ?? null)

    /** Set only while the dimension is `customAttribute`; it is which attribute, not whether. */
    const dimensionOrdinal = ref<number | undefined>(remembered?.dimensionOrdinal)

    /** The active measure's own catalog entry - each measure carries its OWN dimension menu (with its
     * own `selected` default), not a menu shared by the whole catalog. */
    const activeMeasure = computed(() =>
      catalog.measures.value.find((option) => option.groupName === measure.value))

    const activeMeasureOptions = computed(() => activeMeasure.value?.options ?? [])

    // Adopted once each, and only where the card still has no measure/dimension of its own (no prop,
    // nothing remembered): watching rather than computing because a computed would snap the dropdowns
    // back to the default the moment anything else re-evaluated. The dimension watch is chained off
    // the measure's OWN options (rather than the raw catalog) because that is where a per-measure
    // default lives - it fires again once `measure` itself resolves from the watch below.
    //
    // The measure fallback is the card's own POSITION in the served list (cardIndex), not the
    // catalog's `selected` flag: every card asking for "the" selected measure is exactly how two
    // cards rendered side by side used to open on the same chart before this had a store at all.
    /** The measure this card opens on when it has none: its own POSITION in the served list. */
    function adoptMeasureFrom(list: OverviewChartMeasureOption[]): void {
      const fallback = list[props.cardIndex] ?? list[0]
      if (fallback === undefined) return
      measure.value = fallback.groupName
    }

    /** The grouping a measure opens on: the one its own menu marks selected, else the first. */
    function adoptDimensionFrom(options: OverviewChartDimensionOption[]): void {
      const fallback = options.find((option) => option.selected) ?? options[0]
      if (fallback === undefined) return
      dimension.value = fallback.name
      dimensionOrdinal.value = fallback.ordinal ?? undefined
    }

    /**
     * Whether a served menu still offers this exact grouping.
     *
     * The ordinal is part of the identity, not extra detail: every one of a tenant's attributes
     * travels under the same `customAttribute` key, so a name alone cannot tell two of them apart -
     * and an attribute that stopped being filled leaves a key the menu still lists under an ordinal
     * it no longer does.
     */
    function offersGrouping(
      options: OverviewChartDimensionOption[],
      name: OverviewChartDimension | null,
      ordinal: number | undefined,
    ): boolean {
      return options.some((option) =>
        option.name === name && (option.ordinal ?? undefined) === ordinal)
    }

    watch(() => catalog.measures.value, (list) => {
      if (measure.value !== null || list.length === 0) return
      adoptMeasureFrom(list)
    }, { immediate: true })
    watch(activeMeasureOptions, (options) => {
      if (dimension.value !== null || options.length === 0) return
      adoptDimensionFrom(options)
    }, { immediate: true })

    /**
     * A remembered pick the served menu no longer offers is REPLACED, not requested.
     *
     * <b>The menu is the server's, and it changes</b>: product trims the list of groupings, a tenant
     * stops filling an attribute. The two watchers above only fill a selection that is still null, so
     * a stale pick read out of the store sails straight past them - and the chart endpoint's
     * allow-list IS that same menu, so the card would answer 400 forever on a chart that used to
     * work. Nothing else can catch it: the store is per browser, so the stale key exists only on the
     * machine of whoever picked it, which is also why this cannot be fixed by a deploy.
     */
    watch(() => catalog.measures.value, (list) => {
      // Nothing picked yet - the adoption watchers above own that case, and have already run.
      if (list.length === 0 || measure.value === null) return

      if (!list.some((option) => option.groupName === measure.value)) {
        adoptMeasureFrom(list)
      }

      // Read AFTER the measure may have changed, so the grouping is validated against whichever
      // measure's menu the card ends up on: one that both measures offer survives the swap rather
      // than being reset along with it.
      if (!offersGrouping(activeMeasureOptions.value, dimension.value, dimensionOrdinal.value)) {
        adoptDimensionFrom(activeMeasureOptions.value)
      }
    })

    const { loading: chartLoading, points, loadError: chartError } = useOverviewChart(
      measure,
      dimension,
      dimensionOrdinal,
      // The menu gates the chart: see the parameter's own note, and the stale-pick guard above.
      computed(() => !catalog.loading.value))

    // The card is loading while EITHER the menu or the bars are in flight: the dropdowns cannot be
    // drawn without the first and the chart cannot without the second.
    const loading = computed(() => catalog.loading.value || chartLoading.value)
    const loadError = computed(() => catalog.loadError.value || chartError.value)

    /**
     * A menu entry's label.
     *
     * Falls back to the raw key when there is no translation for it, which is the case a served menu
     * introduces and a hard-coded one could not: a server newer than this bundle can offer a measure
     * whose i18n key was never added here, and "smeBuyers" on a dropdown is a legible bug where
     * "arOpportunity.measure.smeBuyers" is a broken screen.
     */
    const labelOf = (family: 'measure' | 'chartMetric', name: string): string => {
      const key = `arOpportunity.${family}.${name}`
      return te(key) ? t(key) : name
    }

    const measureOptions = computed(() =>
      catalog.measures.value.map((option) => ({
        value: option.groupName,
        label: option.translation ?? labelOf('measure', option.groupName),
      })))

    /** The active measure's own display title, for the X axis - the same label its own
     * measureOptions entry shows in the "Select Value" dropdown. */
    const measureTitle = computed(() => {
      if (measure.value === null) return undefined
      return activeMeasure.value?.translation ?? labelOf('measure', measure.value)
    })

    /**
     * A dropdown value that identifies the entry, which its `name` alone cannot.
     *
     * Every one of the tenant's attributes arrives as `customAttribute` — the key the request sends —
     * so the ordinal is what tells them apart. Composing it into the option's value keeps the
     * dropdown a plain list of unique strings, and `parseDimension` below is the only place that
     * knows the shape.
     */
    const dimensionValue = (option: { name: string; ordinal?: number | null }): string =>
      (option.ordinal === undefined || option.ordinal === null) ? option.name : `${option.name}:${option.ordinal}`

    const parseDimension = (value: string): { name: OverviewChartDimension; ordinal?: number } => {
      const [name, ordinal] = value.split(':')
      return {
        name: name as OverviewChartDimension,
        ordinal: ordinal === undefined ? undefined : Number(ordinal),
      }
    }

    /** What the dropdown shows as selected — the same composite its options carry, or nothing while
     * the menu is still loading. */
    const dimensionSelection = computed(() =>
      dimension.value === null
        ? undefined
        : dimensionValue({ name: dimension.value, ordinal: dimensionOrdinal.value }))

    /** The active MEASURE's active dimension entry — every dimension is scoped to the measure showing
     * it, since that is where its own `defaultType`/`selected`/`translation` come from. */
    const activeDimensionOption = computed(() => activeMeasureOptions.value.find(
      (option) => option.name === dimension.value && (option.ordinal ?? undefined) === dimensionOrdinal.value))

    const dimensionOptions = computed(() =>
      activeMeasureOptions.value.map((option) => ({
        value: dimensionValue(option),
        // A custom attribute's label is the tenant's own title, shown verbatim: it is data, not a key
        // this app can translate. A fixed column keeps its i18n key.
        label: option.translation ?? labelOf('chartMetric', option.name),
      })))

    /** Money comes from the catalog's own numericType now, so adding a money measure server-side needs
     * no matching edit here — which is what the old local MONEY_MEASURES list required. */
    const isMoney = computed(() => activeMeasure.value?.numericType === 'money')

    /** UC-UI-23: the one place `pieLabelFor`/`labelFor`/`axisLabelFor` below decide whether an
     * already-formatted number gets the selected currency's symbol - each stays gated on `isMoney`
     * itself (never a hardcoded measure name), this just keeps that gate written once.
     * `prependMoneySymbol` (not a bare concatenation) is what keeps a negative value's sign in
     * front of the symbol ("-$5.0k", not "$-5.0k"). */
    const withMoneySymbolIfApplicable = (formatted: string): string =>
      isMoney.value ? prependMoneySymbol(formatted, currenciesStore.selectedCurrencySymbol) : formatted

    /**
     * Which of the three branches renders — read straight off the active (measure, dimension) PAIR's
     * own `defaultType`, since the catalog now says so per pairing (Sale Concentration's own dimension
     * entries all arrive as `pie`, a country as `world_map`, everything else as `horizontal_bar`).
     *
     * Bars are the fallback while the catalog is still in flight, so the card draws rather than
     * blanking on a slow first request.
     */
    const chartType = computed(() => activeDimensionOption.value?.defaultType ?? 'horizontal_bar')

    /**
     * A point's own label: the group's own name, or the not-available string for the bucket whose
     * dimension is genuinely unknown — a buyer whose country never resolved to a region, a line in no
     * currency — which the endpoint keeps rather than dropping.
     *
     * <b>Nothing is translated here any more.</b> The SME grouping was the one that needed it, since
     * the endpoint answers that one as `"true"`/`"false"`/null and rendering those raw would put
     * "true" on an axis. The screen's menu no longer offers it, so the translation and the
     * `arOpportunity.sme.*` strings it read are gone with it.
     */
    const nameOf = (name: string | null): string => name ?? t('global.notAvailable')

    /** Sorted by the server already; this only takes the head and drops valueless groups. */
    const visible = computed(() =>
      points.value.filter((point) => point.value !== null).slice(0, MAX_GROUPS))

    /** Whether there is anything past the first page for "Show more" to reveal. */
    const canShowMore = computed(() => visible.value.length > INITIAL_VISIBLE_COUNT)

    const expanded = ref(false)

    // A different measure/dimension is a different set of bars - starting collapsed again avoids
    // handing the analyst a tall chart for a list that might now be shorter than the fold.
    // The ordinal is in the list because switching between two of the tenant's attributes changes
    // nothing else, and it is as different a set of bars as any other change of dimension.
    watch([measure, dimension, dimensionOrdinal], () => {
      expanded.value = false
    })

    const toggleExpanded = () => {
      expanded.value = !expanded.value
    }

    /** What actually draws: the first page, or everything up to MAX_GROUPS once expanded. */
    const displayed = computed(() =>
      expanded.value ? visible.value : visible.value.slice(0, INITIAL_VISIBLE_COUNT))

    const categories = computed(() => displayed.value.map((point) => nameOf(point.name)))

    /** Whether `point` is the screen's active chart selection, in THIS card's grouping. The ordinal
     * is part of that identity too - two different custom attributes can share a value name (e.g.
     * both offering "Yes"), and that must not read as the same selection. */
    const isSelectedPoint = (point: OverviewChartPoint) =>
      props.selection !== null
      && props.selection.dimension === dimension.value
      && props.selection.value === point.name
      && props.selection.dimensionOrdinal === dimensionOrdinal.value

    // AB#20654: the bar that is filtering the list below takes the Waterfall's Peer Group Standard
    // color, so it reads as the selected one.
    const series = computed(() => [{
      data: displayed.value.map((point) => isSelectedPoint(point)
        ? { value: point.value ?? 0, color: platformDataColor }
        : point.value ?? 0),
    }])

    /** The same bars as slices. A pie has no axis to carry the top-N note, so the cap still applies
     * through `displayed` — a pie of every buyer in a 200k-line file is unreadable either way. */
    const pieItems = computed(() => displayed.value.map((point) => ({
      category: nameOf(point.name),
      value: point.value ?? 0,
    })))

    /** Value and share, which is the whole reason this measure is a pie. formatBigNumbers because
     * concentration is money (UC-UI-23: symbol-prefixed via `isMoney`, the same gate `labelFor`
     * below uses - the pie renders only for a money measure today, but this stays gated rather
     * than assuming that never changes); the percentage comes from the component's own total. */
    const pieLabelFor = ({ value, percentage }: { value: number; percentage: number }): string =>
      `${withMoneySymbolIfApplicable(formatBigNumbers(value))} (${Math.round(percentage * 100)}%)`

    /**
     * The pie needs more room than the bars do, and not for the same reason.
     *
     * 320px was chosen to fit exactly six BARS. A pie of the same height has to fit a circle, a ring
     * of labels drawn OUTSIDE it with leader lines, and a legend of full company names that wraps to
     * two rows — so the topmost label lands off the canvas and gets clipped. Taller collapsed, taller
     * again expanded, where up to MAX_GROUPS slices each want their own label.
     */
    const pieHeight = computed(() => (expanded.value ? '560px' : '420px'))

    /**
     * Shaped for BubbleMap's own `data` prop, from `visible` rather than `displayed`: a map has no
     * "Show more" page to sit behind (see the button's own `v-if`), so every point up to MAX_GROUPS
     * plots at once instead of the 6-item cap the list-shaped charts start collapsed at.
     */
    const geoChartRows = computed(() => toGeoChartRows(visible.value))

    /** Whether the map is expanded into CalculumFullScreen — the same full-page overlay AR Match's
     * own BubbleMap uses, since a map benefits from the room a card-sized chart can't give it. */
    const mapFullScreen = ref(false)
    const openMapFullScreen = () => {
      mapFullScreen.value = true
    }
    const closeMapFullScreen = () => {
      mapFullScreen.value = false
    }

    /**
     * A fixed height fits the collapsed 6-bar page; expanding hands HorizontalBarChart no height
     * at all so it falls back to its own auto-sizing (row-count based), tall enough that up to
     * MAX_GROUPS bars don't crowd each other the way a still-320px chart would.
     */
    const chartHeight = computed(() => (expanded.value ? undefined : '320px'))

    const labelFor = ({ value }: { value: unknown }): string =>
      isMoney.value
        ? withMoneySymbolIfApplicable(formatBigNumbers(Number(value)))
        : getNumberWithDecimals(Number(value), 0)

    /** The value (X) axis's own tick labels - formatBigNumbers only for the two money measures in
     * AXIS_BIG_NUMBER_MEASURES (volume/cashFlowOpportunity), matching labelFor's bar-end labels so the
     * axis and the bars share one format. `withMoneySymbolIfApplicable` adds the currency symbol;
     * every other measure (e.g. actualPaymentTerms, days) gets plain whole numbers. */
    const axisLabelFor = ({ value }: { value: unknown }): string =>
      measure.value !== null && AXIS_BIG_NUMBER_MEASURES.has(measure.value)
        ? withMoneySymbolIfApplicable(formatBigNumbers(Number(value)))
        : getNumberWithDecimals(Number(value), 0)

    /**
     * The active dimension's own display title - a custom attribute's tenant-given title, or this
     * bundle's translated name for a fixed column, falling back to the raw key if neither exists
     * (a server newer than this bundle, same fallback labelOf uses for measures). Factored out
     * because both the Y axis title below and selectPoint's chip label need the identical answer.
     */
    const dimensionTitle = computed(() => {
      const grouping = dimension.value
      if (grouping === null) return undefined
      const key = `arOpportunity.dimension.${grouping}`
      return activeDimensionOption.value?.translation ?? (te(key) ? t(key) : grouping)
    })

    /**
     * The Y axis names what the bars are grouped by. The cap note rides alongside it, rather than
     * replacing it, only once the chart is actually truncated - naming a limit that did not bite
     * would be noise on every other chart, but losing the axis title to make room for one that did
     * would be a worse trade.
     */
    const axisTitle = computed(() => {
      if (dimensionTitle.value === undefined) return undefined
      return points.value.length > MAX_GROUPS
        ? `${dimensionTitle.value} (${t('arOpportunity.charts.topN', { count: MAX_GROUPS })})`
        : dimensionTitle.value
    })

    /**
     * A chart click narrows the three-level list below (AP's itemSelectedInCharts, UC by parity).
     * The RAW group value travels, not the display label: the grid filters by what the projection
     * stores. For every grouping the menu offers that is simply the name — the SME grouping used to be
     * the exception, stored as a boolean, and it is no longer offered.
     * Shared by every chart type's own click handler below - only how each one locates its point
     * differs (a bar/slice's index into `displayed`, a map marker's own country code in `visible`).
     */
    const selectPoint = (point: OverviewChartPoint | undefined) => {
      // A null grouping is the catalog not having answered yet — there is nothing to narrow BY, so a
      // click that landed on a chart drawn from a previous version's points selects nothing.
      const grouping = dimension.value
      if (!point || grouping === null) return

      const value: string | boolean | null = point.name

      // Clicking the already-selected point clears the narrowing, same as removing its chip.
      if (isSelectedPoint(point)) {
        emit('selection-cleared')
        return
      }

      // The chip's short label is the same dimensionTitle the Y axis shows: a custom attribute's
      // tenant-given title, or a fixed column's own key family (a different one from the dropdown's
      // "Per X"), with the same fallback for a dimension this bundle has no key for.
      emit('item-selected', {
        dimension: grouping,
        value,
        label: `${dimensionTitle.value ?? grouping}: ${nameOf(point.name)}`,
        // AB#20527: only meaningful for `customAttribute` - OverviewList.vue uses it to resolve
        // which of the twenty `customDataPoint{ordinal}` columns this click actually means.
        dimensionOrdinal: dimensionOrdinal.value,
      } satisfies OverviewChartSelection)
    }

    const onBarClick = ({ index }: { index: number }) => selectPoint(displayed.value[index])

    /** A slice click is a bar click: same index into `displayed`, same narrowing, same toggle-off. */
    const onSliceClick = ({ index }: { index: number }) => selectPoint(displayed.value[index])

    /**
     * GeoChart emits the row's own `key` - toGeoChartRows sets that to the original alpha-3 code,
     * the same value visible.value's own points carry, so the lookup below is unchanged from
     * before. `null` is new: BubbleMap's marker click never had a "clicked nothing" case, but a
     * choropleth's own click-the-same-region-again toggle does - handled directly here rather
     * than through selectPoint, which has no point to compare against for a null key.
     */
    const onMapLocationClick = (key: string | null) => {
      if (key === null) {
        if (props.selection && props.selection.dimension === dimension.value) {
          emit('selection-cleared')
        }
        return
      }
      selectPoint(visible.value.find((point) => point.name === key))
    }

    /** Remembers this card's current triple under its own key - called after every USER-driven
     * change below, never from the default-adoption watches above, so an untouched card keeps
     * opening on the catalog's own default rather than "remembering" a choice nobody made. */
    const rememberSelection = () => {
      if (measure.value === null || dimension.value === null) return
      selectionStore.setSelection(cardKey, {
        measure: measure.value,
        dimension: dimension.value,
        dimensionOrdinal: dimensionOrdinal.value,
      })
    }

    const onMeasureChange = (id: unknown) => {
      measure.value = id as OverviewChartMeasure
      rememberSelection()
    }

    const onDimensionChange = (id: unknown) => {
      // Both together, so the pair can never be half-applied: a `customAttribute` without an ordinal
      // is a 400, and an ordinal left over from a previous selection beside a fixed column is another.
      const { name, ordinal } = parseDimension(String(id))
      dimension.value = name
      dimensionOrdinal.value = ordinal
      rememberSelection()
    }

    return {
      t,
      measure,
      dimension,
      dimensionSelection,
      loading,
      loadError,
      points,
      measureOptions,
      dimensionOptions,
      categories,
      series,
      chartType,
      pieItems,
      pieHeight,
      pieLabelFor,
      geoChartRows,
      mapFullScreen,
      openMapFullScreen,
      closeMapFullScreen,
      onSliceClick,
      labelFor,
      axisLabelFor,
      axisTitle,
      measureTitle,
      dimensionTitle,
      canShowMore,
      expanded,
      chartHeight,
      toggleExpanded,
      onBarClick,
      onMapLocationClick,
      onMeasureChange,
      onDimensionChange,
    }
  },
})
</script>

<style scoped>
.metrics-card__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

/* Side by side, AP's arrangement: SearchableDropdown's own root is width:100%, so without a
   flex-basis of 0 each one claims the full row and they stack. */
.metrics-card__select {
  flex: 1 1 0;
  min-width: 12rem;
}

.metrics-card__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.metrics-card__show-more {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  width: fit-content;
  margin: 0.75rem auto 0;
  padding: 0.375rem 0.9375rem;
  border: 1px solid var(--brand-100);
  border-radius: 100vmax;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-default);
}

.metrics-card__show-more:hover {
  background: var(--brand-100);
}

.metrics-card__show-more i {
  font-size: 0.6875rem;
}

.metrics-card__chart-header {
  display: flex;
  justify-content: flex-end;
}

.chart-fullscreen-toggle {
  cursor: pointer;
  color: var(--color-text-3);
}
</style>
