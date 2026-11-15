<script lang="ts">
// True module scope, unlike `<script setup>` below - that block compiles into each instance's own
// `setup()` function body, so a `let` declared there is a fresh local re-initialized to 0 on every
// mount, not a shared counter. Two GeoChart instances mounted at once (e.g. two Program Overview
// cards both on a `world_map`-typed dimension) would otherwise both resolve to "geo-chart-0" and
// silently draw into the same DOM id - Google Charts mounts by `getElementById`, which only ever
// finds the first match, leaving every other instance's container empty. Same fix already
// established in supplier-card-slider/Index.vue's own `sliderInstanceSeq`.
let nextChartId = 0;
</script>

<script setup lang="ts">
/**
 * A world choropleth (countries colored by value) — Google Charts' `GeoChart` under the hood.
 *
 * Promoted from apps/ar/src/components/charts/GeoChart.vue (itself ported from
 * apps/ap/src/modules/components/charts/GeoChart.vue at commit d004458f63, UC-UI-00 / AB#19226),
 * which is the version to build on: `<script setup>` already, a real unmount-race fix (drawChart
 * bailing out if the component unmounted while the async script load was still pending), and a
 * debounced resize handler (AP's original rebuilds the whole chart on every unthrottled `resize`
 * event, firing many times a second during a window drag).
 *
 * Adapted further for design-system:
 * - Colors are no longer a caller-supplied `options` prop — GEO_CHART_COLORS is what both AP's and
 *   AR's ported originals already hard-override regardless of what was passed in, so exposing it as
 *   configurable would be reviving a prop that was already dead. See colors.ts.
 * - `data` is a typed `GeoChartRow[]`, not `unknown` — the component itself builds Google's
 *   `arrayToDataTable` header row (with its `{role: 'tooltip'}` column) and the NumberFormat
 *   munging AP's original needed for its own tooltip formatting is dropped entirely: every row
 *   here already carries a caller-formatted `tooltip` string, which Google's tooltip role reads
 *   directly — a caller no longer needs to know arrayToDataTable's row shape at all.
 * - Click emits the row's own `key` (defaulting to `code`), not Google's raw internal selection —
 *   the row a caller passed in is the same row it gets back, regardless of what code Google needed
 *   to draw it (AR's alpha-3 chart-catalog data needs alpha-3 back, not the alpha-2 `code` this
 *   component draws with — see overviewCountryCodes.ts's own `key` usage).
 * - `chartName` is optional now — Google draws into a specific element by id, so two instances on
 *   one page (e.g. a card and its own fullscreen view) need different ones; auto-generated when a
 *   caller doesn't need a stable one of its own.
 * - Dropped `isFull`/`renderImage`/`imageGenerated`: declared on both the AP original and the AR
 *   port, never actually passed/listened to by any real caller (confirmed by repo-wide grep) —
 *   dead API surface, not carried forward.
 * - Loading/error states added (`CalculumLoading`/`NoDataAvailable`, matching BubbleMap's own
 *   pattern) — the ported originals had none: a failed script load silently rendered nothing.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import CalculumLoading from "../CalculumLoading.vue";
import CalculumLoadingAr from "../CalculumLoadingAr.vue";
import NoDataAvailable from "../no-data-available/Index.vue";
import { loadGoogleCharts } from "./geoChartLoader";
import { GEO_CHART_COLORS } from "./colors";
import type { GeoChartRow } from "./types";

defineOptions({
  name: "GeoChart",
});

const props = withDefaults(
  defineProps<{
    chartName?: string;
    data: GeoChartRow[];
    valueLabel?: string;
    height?: string;
    fullBleedBreakpoints?: boolean;
    mapUnavailableMessage?: string;
    /** Show the AR loader artwork (`CalculumLoadingAr`) instead of the default one while loading. */
    arLoader?: boolean;
  }>(),
  {
    chartName: undefined,
    valueLabel: "Value",
    height: "450px",
    fullBleedBreakpoints: false,
    mapUnavailableMessage: "Map will be available shortly. Please refresh the page.",
    arLoader: false,
  },
);

const emit = defineEmits<{
  (e: "on-event-click", key: string | null): void;
}>();

// Stable per component instance, not per render - a computed would generate a new id every
// re-render, and Google draws into a specific element by id.
const resolvedChartName = props.chartName ?? `geo-chart-${nextChartId++}`;

const loading = ref(true);
const loadError = ref(false);
const selectedRegion = ref<string | null>(null);
let isMounted = true;
let chartInstance: unknown = null;

const selectionStyle = computed(() => ({ "--geo-chart-selection-color": GEO_CHART_COLORS.selection }));

let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

/** Debounced: resize can fire many times a second during a window drag, and rebuilding a whole
 * new google.visualization.GeoChart instance on every single event is wasted work. */
function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(drawChart, 150);
}

onMounted(async () => {
  try {
    await loadGoogleCharts();
  } catch (error) {
    if (import.meta.env.DEV) console.error("[GeoChart] Failed to load Google Charts:", error);
    loadError.value = true;
    loading.value = false;
    return;
  }

  // The component may have unmounted while the (async) script load above was still pending -
  // drawChart() would then call document.getElementById against a torn-down DOM.
  if (!isMounted) {
    return;
  }
  loading.value = false;

  // The chart's own container div is behind `v-else` (loading/error come first) - flipping
  // `loading` off here doesn't put it in the DOM until Vue's next render flushes, and
  // document.getElementById needs it there NOW, not on the next microtask queued after this one.
  // Skipping this was a real bug: Google's own internals throw "Container is not defined" when
  // handed a null element, since drawChart() ran in the same tick as the `loading` flip.
  await nextTick();
  if (!isMounted) {
    return;
  }

  // Registered only after Google Charts has actually loaded: a resize firing before that (e.g. a
  // devtools/viewport/orientation change during initial load) would otherwise debounce into a
  // drawChart() call while globalThis.google is still undefined and throw.
  if (props.fullBleedBreakpoints) {
    globalThis.addEventListener("resize", handleResize);
  }

  drawChart();
});

onBeforeUnmount(() => {
  isMounted = false;
  clearTimeout(resizeTimeout);
  globalThis.removeEventListener("resize", handleResize);
});

function drawChart() {
  if (loadError.value) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Google Charts ships no types, and `google` isn't ambiently declared (see geoChartLoader.ts's own note on why).
  const google = (globalThis as any).google;
  if (!google) return;

  // Belt-and-suspenders alongside onMounted's own nextTick wait: Google's internals throw a raw,
  // unhelpful "Container is not defined" when handed null here instead of failing gracefully.
  const container = document.getElementById(resolvedChartName);
  if (!container) return;

  const tableRows = [
    ["Region", props.valueLabel, { role: "tooltip", type: "string" }],
    ...props.data.map((row) => [row.code, row.value, row.tooltip ?? String(row.value)]),
  ];
  const keyByCode = new Map(props.data.map((row) => [row.code, row.key ?? row.code]));

  const table = google.visualization.arrayToDataTable(tableRows);
  const chart = new google.visualization.GeoChart(container);
  chartInstance = chart;

  // Listener to detect clicks on chart items
  google.visualization.events.addListener(chart, "select", () => {
    const selection = chart.getSelection();

    if (selection.length > 0) {
      const selectedRow = selection[0].row;
      if (selectedRow !== undefined && selectedRow !== null) {
        const code = table.getValue(selectedRow, 0);
        const key = keyByCode.get(code) ?? code;

        // Toggle: if already selected, deselect
        if (selectedRegion.value === key) {
          selectedRegion.value = null;
          chart.setSelection([]);
          emit("on-event-click", null);
        } else {
          selectedRegion.value = key;
          chart.setSelection([{ row: selectedRow }]);
          emit("on-event-click", key);
        }
      }
    } else if (selectedRegion.value !== null) {
      // Click outside a region - deselect
      selectedRegion.value = null;
      emit("on-event-click", null);
    }
  });

  const options = {
    region: "world",
    colorAxis: { colors: GEO_CHART_COLORS.colorAxis },
    backgroundColor: GEO_CHART_COLORS.background,
    defaultColor: GEO_CHART_COLORS.default,
    datalessRegionColor: GEO_CHART_COLORS.dataless,
    // AP's own current options always set this; every other key it passed (vAxis/legend/colorAxis)
    // never applied to a GeoChart in the first place, but this one visibly styles the tooltip box.
    tooltip: { isHtml: true },
  };

  chart.draw(table, options);

  // Restore selection if it exists (e.g. after a debounced resize rebuild)
  if (selectedRegion.value !== null) {
    for (let i = 0; i < table.getNumberOfRows(); i += 1) {
      const code = table.getValue(i, 0);
      if ((keyByCode.get(code) ?? code) === selectedRegion.value) {
        chart.setSelection([{ row: i }]);
        break;
      }
    }
  }
}
</script>

<template>
  <div
    class="geo-chart"
    :class="{ 'geo-chart--full-bleed': fullBleedBreakpoints }"
    :style="{ height: fullBleedBreakpoints ? undefined : height }"
  >
    <component :is="arLoader ? CalculumLoadingAr : CalculumLoading" v-if="loading" block />
    <NoDataAvailable v-else-if="loadError" :title="mapUnavailableMessage" />
    <div
      v-else
      :id="resolvedChartName"
      class="geo-chart__canvas"
      :class="{ 'geo-chart__canvas--selected': selectedRegion }"
      :style="selectionStyle"
    />
  </div>
</template>

<style lang="scss" scoped>
.geo-chart {
  width: 100%;
}

// AP's Program Overview exact current breakpoint sizing — preserved rather than unified with the
// `height` prop above, so migrating that one caller carries zero sizing-regression risk.
//
// Sizing lives on this OUTER wrapper (not on .geo-chart__canvas below, which always just fills
// its parent at height:100%) so there is a single source of truth for how tall the full-bleed box
// is - loading/error/chart states all get it identically, and it can never disagree with a sibling
// element that also sizes itself off the canvas. Previously the equivalent modifier sat on
// .geo-chart__canvas instead, duplicating (and able to drift out of sync with) the very similar
// window-size-driven CSS classes MetricsComponents.vue's own getGeoMetricsMapSize also applied to
// this same outer element - two independent height sources on one box, occasionally disagreeing
// and overflowing the card. Removed that caller-side duplicate (see MetricsComponents.vue).
//
// Base height matches the medium tier, not 100vh: the original JS (getGeoMetricsMapSize) fell
// through to its "medium-screen-chart" (600px) branch for any viewport that didn't explicitly
// match the large/medium/small width+height pairs below - e.g. width >=1440px but height <1024px,
// common on laptop panels. Keeping the base at 600px (not 100vh) preserves that same fallback.
.geo-chart--full-bleed {
  display: flex;
  align-items: center;
  height: 600px;

  @media screen and (max-width: 1280px) and (min-height: 720px) {
    height: 500px;
  }

  @media screen and (min-width: 1440px) and (min-height: 1024px) {
    height: 600px;
  }

  // Declared LAST and on purpose: a 1728x1117+ viewport also matches the medium query above, and
  // media queries add no specificity of their own, so whichever is declared last wins on overlap.
  // The original JS (getGeoMetricsMapSize) checked large-tier first in an if/else-if chain, so this
  // ordering preserves that same precedence - putting this query before the medium one silently
  // made it dead CSS (medium always won on large screens) until AB#20023 caught it.
  @media screen and (min-width: 1728px) and (min-height: 1117px) {
    height: 800px;
  }
}

.geo-chart__canvas {
  width: 100%;
  height: 100%;

  :deep(svg) {
    path[fill]:not([fill="#eaecf0"]) {
      cursor: pointer;
    }
  }
}

.geo-chart__canvas--selected {
  :deep(svg) {
    path[stroke-opacity="1"] {
      stroke: var(--geo-chart-selection-color) !important;
      stroke-width: 8px !important;
      filter: drop-shadow(0 0 3px var(--geo-chart-selection-color));
    }
  }
}
</style>
