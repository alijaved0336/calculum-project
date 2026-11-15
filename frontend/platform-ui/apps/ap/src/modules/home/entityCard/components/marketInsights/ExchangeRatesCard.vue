<template>
<div class="card shadow-none p-3" :class="{ 'card--stretch': stretch }">
  <div class="card-body"><span class="text-base font-semibold text-gray-600 mb-3">{{ $t('home.entityCard.marketInsights.exchangeRates') }}</span>
    <div class="info-pills d-flex gap-4 mb-3">
      <div class="d-flex flex-column gap-2"><span class="small text-gray-600 d-block">{{ $t('home.entityCard.marketInsights.spendCurrency') }}</span>
        <div class="info-pill"><span class="pill-value">{{ spendCurrency }}</span></div>
      </div>
      <div class="d-flex flex-column gap-2"><span class="small text-gray-600 d-block">{{ `${$t('home.entityCard.marketInsights.supplierCountry')} (${$t('global.currency')})`  }}</span>
        <div class="info-pill">
          <div class="flag-country-entity-card my-auto mr-1" :style="`background-image: url('${ supplierCountryFlagUrl }') !important;`" :title="supplierCountry"></div><span class="pill-value">{{ supplierCurrency ? ` ${supplierCountry} (${supplierCurrency})` : ` ${supplierCountry}` }}</span>
        </div>
      </div>
    </div>
    <div class="stats-row d-flex align-items-end gap-6 mb-3">
      <div class="stat-item"><span class="stat-label">{{ $t('home.entityCard.marketInsights.exchangeRate') }}</span><span class="stat-value text-2xl font-bold text-gray-900">{{ formattedExchangeRate }}</span></div>
      <div class="stat-item"><span class="stat-label">{{ $t('home.entityCard.marketInsights.trend') }}</span>
        <div class="stat-value cover-trend">
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <iconChartStable v-if="data.output?.trend === 'stable'" :color="'#15b79e'" :title="data.output?.trend"></iconChartStable>
          </Tooltip>
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <IconChartForecast v-if="data.output?.trend === 'up'" :color="'#15b79e'" :title="data.output?.trend"></IconChartForecast>
          </Tooltip>
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <IconChartForecastDown v-if="data.output?.trend === 'down'" :color="'#ff2c4f'" :title="data.output?.trend"></IconChartForecastDown>
          </Tooltip>
        </div>
      </div>
      <div class="stat-item"><span class="stat-label">{{ 'MoM' }}</span><span class="stat-value" :class="changeClass(data.output?.changeMoM)">{{ formatChange(data.output?.changeMoM) }}</span></div>
      <div class="stat-item"><span class="stat-label">{{ 'YoY' }}</span><span class="stat-value" :class="changeClass(data.output?.changeYoY)">{{ formatChange(data.output?.changeYoY) }}</span></div>
    </div>
    <transition name="chart-expand">
      <div v-if="chartExpanded" class="div chart-container exchange-rate-chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
        <Chart v-if="chartData" :style="chartStyle" :chart-area="chartAreaConfig" :transitions="false">
          <ChartLegend position="bottom" orientation="horizontal"></ChartLegend>
          <ChartValueAxis>
            <ChartValueAxisItem :major-grid-lines="valueAxisMajorGridLines" :minor-grid-lines="axisMinorGridLinesHidden" :line="axisLineHidden" :min="chartAxisMin" :max="chartAxisMax" :axis-crossing-value="chartAxisMin" :labels="valueAxisLabels">
              <ChartCategoryAxisTitle :text="'Exchange Rate'" color="#98a2b3" :font="'400 12px Inter '"></ChartCategoryAxisTitle>
            </ChartValueAxisItem>
          </ChartValueAxis>
          <ChartCategoryAxis>
            <ChartCategoryAxisItem :categories="chartCategories" :major-grid-lines="axisMajorGridLinesHidden" :minor-grid-lines="axisMinorGridLinesHidden" :line="axisLineHidden" :labels="categoryAxisLabels">
              <ChartCategoryAxisTitle :text="'Month'" color="#98a2b3" :font="'400 12px Inter '" :margin="20"></ChartCategoryAxisTitle>
            </ChartCategoryAxisItem>
          </ChartCategoryAxis>
          <ChartSeries>
            <ChartSeriesItem type="line" :data-items="previousSeriesData" :field="'value'" color="#d0d5dd" :line-style="'normal'" :width="2" :markers="previousPointMarkers" :highlight="highlightHidden" name="Previous Exchange Rate"></ChartSeriesItem>
            <ChartSeriesItem type="line" :data-items="currentSeriesData" :field="'value'" color="#3b82f6" :line-style="'normal'" :width="2" :markers="currentPointMarkers" :highlight="highlightHidden" name="Current Exchange Rate">   </ChartSeriesItem>
          </ChartSeries>
        </Chart>
        <template v-for="(pt, idx) in allPointsScreen" :key="idx">
          <div v-show="valueTooltip.visible" class="chart-point-dot" :style="{ top: pt.y + 'px', left: pt.x + 'px' }"></div>
        </template>
        <div v-show="valueTooltip.visible" ref="tooltipEl" class="chart-tooltip">
          <div class="chart-tooltip-category">{{ valueTooltip.category }}</div>
          <div v-if="valueTooltip.previousValue !== null" class="chart-tooltip-row">
            <span class="chart-tooltip-dot" style="background: #d0d5dd"></span><span class="chart-tooltip-label">Previous:</span><span class="chart-tooltip-value">{{ valueTooltip.previousValue }}</span>
          </div>
          <div v-if="valueTooltip.currentValue !== null" class="chart-tooltip-row">
            <span class="chart-tooltip-dot" style="background: #3b82f6"></span><span class="chart-tooltip-label">Current:</span><span class="chart-tooltip-value">{{ valueTooltip.currentValue }}</span>
          </div>
        </div>
        <div v-show="valueTooltip.visible && valueTooltip.previousValue !== null" ref="previousMarkerDotEl" class="chart-marker-dot" style="background: #d0d5dd"></div>
        <div v-show="valueTooltip.visible && valueTooltip.currentValue !== null" ref="currentMarkerDotEl" class="chart-marker-dot" style="background: #3b82f6"></div>
      </div>
    </transition>
    <div class="suppliers-list-box d-flex flex-column gap-3" v-if="termImpactItems">
      <p class="supplier-text" v-for="(item, index) in termImpactItems" :key="index" :class="{ 'supplier-text--clamped': !chartExpanded }"> <span class="bullet-point mr-2">• </span><span>{{ item }}</span></p>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, ref, watch } from 'vue';
import type { PropType } from 'vue';

import IconChartForecast from "@ada/design-system/assets/icons/iconChartForecast.vue";
import IconChartForecastDown from "@ada/design-system/assets/icons/iconChartForecastDown.vue";
import iconChartStable from "@/resources/assets/images/icons/iconChartStable.vue";
import { Tooltip } from '@progress/kendo-vue-tooltip';
import { Text } from '@progress/kendo-drawing';

import {
  Chart,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartCategoryAxisTitle
} from '@progress/kendo-vue-charts';

/**
 * event.clientX/Y and getBoundingClientRect() report final, post-zoom screen pixels,
 * but assigning that value straight into an inline top/left gets scaled again by the
 * app-wide zoom:0.67 when the browser renders it (CSS lengths are interpreted in the
 * local, pre-render coordinate space of their zoomed ancestor). Multiplying a
 * real-pixel delta by this factor before writing it as a style value cancels that
 * out. Read dynamically instead of hardcoding 1/0.67 so it stays correct if the
 * global zoom value ever changes.
 */
function getZoomCompensation(): number {
  const zoom = Number((getComputedStyle(document.documentElement) as CSSStyleDeclaration & { zoom: string }).zoom)
  return zoom > 0 ? 1 / zoom : 1
}

// Kendo's Chart re-does an internal (expensive) full redraw whenever any of its config
// object props changes identity, even if the content is the same. These configs never
// actually change, so they're hoisted to stable module-level constants instead of
// inline object literals in the template — otherwise every mousemove (which drives the
// custom tooltip) would recreate all of them and force the whole chart to redraw on
// every pixel of cursor movement.
const chartStyle = { height: '100%' };
const chartAreaConfig = { margin: { top: 4 } };
const valueAxisMajorGridLines = { visible: true, color: '#f1f5f9' };
const axisMajorGridLinesHidden = { visible: false };
const axisMinorGridLinesHidden = { visible: false };
const axisLineHidden = { visible: false };
const valueAxisLabels = { font: '600 14px Inter', color: '#475467' };
const categoryAxisLabels = { font: '600 14px Inter', color: '#475467', rotation: 'auto' };
// Kendo's built-in hover-highlight dot on line series is a separate mechanism from
// <ChartTooltip> (which this component no longer uses) — it stays on by default even
// without a tooltip, duplicating our own custom highlight dots.
const highlightHidden = { visible: false };

export default defineComponent({
  name: 'ExchangeRatesCard',

  components: {
    Chart,
    ChartLegend,
    ChartSeries,
    ChartSeriesItem,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartValueAxis,
    ChartValueAxisItem,
    IconChartForecast,
    IconChartForecastDown,
    iconChartStable,
    Tooltip,
    ChartCategoryAxisTitle
  },
  props: {
    data: { type: Object as PropType<any>, required: true },
    spendCurrency: { type: String, default: '' },
    supplierCountry: { type: String, default: '' },
    // Already-formatted by the parent: a plain string, so a multi-currency country cannot
    // fall back to Array.toString()'s bare comma join ("Poland (EUR,PLN)").
    supplierCurrency: { type: String, default: '' },
    stretch: { type: Boolean, default: false },
    supplierCountryFlagUrl: { type: String, default: '' },
  },
  emits: ['expanded-change'],
  setup(props, { emit }) {
    const chartExpanded = ref(true);

    function toggleChart() {
      chartExpanded.value = !chartExpanded.value;
      emit('expanded-change', chartExpanded.value);
    }
    const chartData = computed(() => props.data?.output?.chart ?? null);

    const formattedExchangeRate = computed<string>(() => {
      const val = props.data?.output?.exchangeRate;
      if (val === undefined || val === null) return '—';
      return Number(val).toFixed(2);
    });

    const currentValues = computed<number[]>(() =>
      props.data?.output?.chart?.current?.map((item: { date: string; value: number }) => item.value) ?? []
    );

    const previousValues = computed<number[]>(() =>
      props.data?.output?.chart?.previous?.map((item: { date: string; value: number }) => item.value) ?? []
    );

    // Bound to ChartSeriesItem via :field="'value'" instead of a plain number[] (as
    // currentValues/previousValues above still are, for the axis-min/max calc) so that
    // e.dataItem in the markers.visual capture callback below retains an `index` —
    // needed as a per-point-unique key since chartCategories collapses multiple weekly
    // points into the same month-year label (see capturePreviousPointPosition). Index,
    // not date: previous/current compare the same relative week a year apart (e.g.
    // "2026-04-23" vs "2025-04-24"), so the two series never share a raw date value —
    // keying by date would (and did) leave one side of the tooltip unmatched. Both
    // series are rendered against the same category-axis position per index, so index
    // is also what correctly pairs previous[i] with current[i].
    const previousSeriesData = computed<{ date: string; value: number; index: number }[]>(() =>
      (props.data?.output?.chart?.previous ?? []).map((item: { date: string; value: number }, index: number) => ({ ...item, index }))
    );

    const currentSeriesData = computed<{ date: string; value: number; index: number }[]>(() =>
      (props.data?.output?.chart?.current ?? []).map((item: { date: string; value: number }, index: number) => ({ ...item, index }))
    );

    // Kendo's own shared-tooltip hit-testing (which category is nearest the mouse) is
    // corrupted under the app-wide zoom:0.67 — hovering one point highlights another,
    // and the last point can become unreachable. This isn't fixable by repositioning
    // Kendo's popup (as done in the sibling bar/waterfall chart fixes) since the wrong
    // DATA gets selected, not just the wrong visual position. Instead this component
    // does its own hit-testing: each series point's real SVG-local position is captured
    // (via capturePreviousPointPosition/captureCurrentPointPosition, invisible
    // ChartSeriesItem markers.visual callbacks — the same e.rect mechanism already proven
    // reliable/uncorrupted across every other chart fix in this app), then on mousemove
    // the nearest category is found by converting the mouse position into that same
    // SVG-local space via getScreenCTM() (the technique already used for the Y-axis
    // label truncation tooltip elsewhere in this codebase, proven zoom-safe since it
    // relies on the browser's own SVG transform matrix, not Kendo's internal — and
    // corrupted — coordinate math). Kendo's <ChartTooltip> is removed entirely in favor
    // of this custom tooltip + highlight dots (one per series, since both series can
    // have different values at the same category).
    //
    // Positioning is intentionally NOT reactive: getBoundingClientRect() under this
    // app's zoom produces tiny sub-pixel differences on every call even when nothing
    // actually moved, so writing x/y into a reactive() object re-triggered a render (and
    // a full Kendo chart redraw) on every single mousemove tick. Only content that
    // genuinely changes rarely (visible flag, which category is active) is reactive;
    // the tooltip/marker DOM position is set imperatively via template refs.
    const valueTooltip = reactive({ visible: false, category: '', previousValue: null as string | null, currentValue: null as string | null })
    const allPointsScreen = reactive<Array<{ x: number; y: number }>>([])
    const tooltipEl = ref<HTMLElement | null>(null)
    const previousMarkerDotEl = ref<HTMLElement | null>(null)
    const currentMarkerDotEl = ref<HTMLElement | null>(null)
    // Keyed by e.dataItem.index, NOT e.category: chartCategories formats each raw date
    // down to a month-year label ("Apr 26"), so weekly data has several points sharing
    // the same category string — keying by category collapsed all of them into one Map
    // entry, silently dropping every point but the last one per month (reported as
    // "only 4 markers" for 12 weekly data points spanning ~4 months). Not e.dataItem.date
    // either: previous/current compare the same relative week a year apart, so their raw
    // dates never match — keying by date left one side of the tooltip permanently empty.
    // index is unique per point AND is what pairs previous[i] with current[i].
    let previousPointsByIndex = new Map<number, { index: number; category: string; value: number; x: number; y: number }>()
    let currentPointsByIndex = new Map<number, { index: number; category: string; value: number; x: number; y: number }>()
    let pendingClearPointPositions = true

    watch([previousValues, currentValues], () => {
      pendingClearPointPositions = true;
    });

    function clearPointPositionsIfPending() {
      if (pendingClearPointPositions) {
        previousPointsByIndex = new Map();
        currentPointsByIndex = new Map();
        pendingClearPointPositions = false;
      }
    }

    /**
     * Invisible ChartSeriesItem markers.visual callback (returns an explicit invisible
     * shape — returning undefined isn't enough to suppress Kendo's own default marker)
     * used purely to capture each point's real SVG-local position. Uses `markers`, not
     * `labels`: Kendo aligns a label's rect to the TOP of the point's marker box (so it
     * doesn't overlap the line), while a marker's rect is centered exactly on the true
     * data point — using labels here made the custom dots float visibly above the
     * curve. See valueTooltip declaration above for why this capture exists at all.
     */
    function capturePreviousPointPosition(e: any) {
      clearPointPositionsIfPending();
      const invisibleMarker = new Text('', [e.rect.origin.x, e.rect.origin.y], { opacity: 0 });
      if (e.value === null || e.value === undefined) return invisibleMarker;
      previousPointsByIndex.set(e.dataItem.index, {
        index: e.dataItem.index,
        category: e.category,
        value: e.value,
        x: e.rect.origin.x + e.rect.size.width / 2,
        y: e.rect.origin.y + e.rect.size.height / 2,
      });
      return invisibleMarker;
    }

    function captureCurrentPointPosition(e: any) {
      clearPointPositionsIfPending();
      const invisibleMarker = new Text('', [e.rect.origin.x, e.rect.origin.y], { opacity: 0 });
      if (e.value === null || e.value === undefined) return invisibleMarker;
      currentPointsByIndex.set(e.dataItem.index, {
        index: e.dataItem.index,
        category: e.category,
        value: e.value,
        x: e.rect.origin.x + e.rect.size.width / 2,
        y: e.rect.origin.y + e.rect.size.height / 2,
      });
      return invisibleMarker;
    }

    // Stable references for the same reason as the module-level configs above — the
    // capture functions themselves are stable closures, but these wrapping object
    // literals must not be recreated inline in the template or Kendo will redraw on
    // every hover.
    const previousPointMarkers = { visible: true, visual: capturePreviousPointPosition };
    const currentPointMarkers = { visible: true, visual: captureCurrentPointPosition };

    /** Screen-space (container-relative) position of a single SVG-local point. */
    function toContainerPoint(svg: SVGSVGElement, ctm: DOMMatrix, containerRect: DOMRect, zoomCompensation: number, svgX: number, svgY: number) {
      const screenPt = svg.createSVGPoint();
      screenPt.x = svgX;
      screenPt.y = svgY;
      const screenP = screenPt.matrixTransform(ctm);
      return {
        x: (screenP.x - containerRect.left) * zoomCompensation,
        y: (screenP.y - containerRect.top) * zoomCompensation,
      };
    }

    function handleChartMouseMove(event: MouseEvent) {
      const el = event.currentTarget as HTMLElement;
      const svg = el.querySelector('svg') as SVGSVGElement | null;

      // Union of both series' indices — either series may be missing a point at a given
      // index, but we still want that index selectable via the other one.
      const indexPositions = new Map<number, { index: number; category: string; x: number; y: number }>();
      for (const p of currentPointsByIndex.values()) indexPositions.set(p.index, p);
      for (const p of previousPointsByIndex.values()) if (!indexPositions.has(p.index)) indexPositions.set(p.index, p);
      const candidates = Array.from(indexPositions.values());

      if (!svg || candidates.length === 0) {
        valueTooltip.visible = false;
        return;
      }

      const ctm = svg.getScreenCTM();
      if (!ctm) return;

      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(ctm.inverse());

      let nearest = candidates[0];
      let minDist = Math.abs(svgP.x - nearest.x);
      for (const p of candidates) {
        const dist = Math.abs(svgP.x - p.x);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      }

      const containerRect = el.getBoundingClientRect();
      const zoomCompensation = getZoomCompensation();

      if (!valueTooltip.visible) {
        valueTooltip.visible = true;
        const allPoints = [...currentPointsByIndex.values(), ...previousPointsByIndex.values()];
        allPointsScreen.splice(
          0,
          allPointsScreen.length,
          ...allPoints.map(p => toContainerPoint(svg, ctm, containerRect, zoomCompensation, p.x, p.y)),
        );
      }

      const previousPoint = previousPointsByIndex.get(nearest.index);
      const currentPoint = currentPointsByIndex.get(nearest.index);

      valueTooltip.category = nearest.category;
      valueTooltip.previousValue = previousPoint ? previousPoint.value.toFixed(2) : null;
      valueTooltip.currentValue = currentPoint ? currentPoint.value.toFixed(2) : null;

      if (previousMarkerDotEl.value) {
        if (previousPoint) {
          const p = toContainerPoint(svg, ctm, containerRect, zoomCompensation, previousPoint.x, previousPoint.y);
          previousMarkerDotEl.value.style.left = `${p.x}px`;
          previousMarkerDotEl.value.style.top = `${p.y}px`;
        }
      }

      let tooltipAnchor = previousPoint ?? currentPoint ?? nearest;

      if (currentMarkerDotEl.value) {
        if (currentPoint) {
          const p = toContainerPoint(svg, ctm, containerRect, zoomCompensation, currentPoint.x, currentPoint.y);
          currentMarkerDotEl.value.style.left = `${p.x}px`;
          currentMarkerDotEl.value.style.top = `${p.y}px`;
          tooltipAnchor = currentPoint;
        }
      }

      if (tooltipEl.value) {
        const anchorPoint = toContainerPoint(svg, ctm, containerRect, zoomCompensation, tooltipAnchor.x, tooltipAnchor.y);
        tooltipEl.value.style.left = `${anchorPoint.x + 14}px`;
        tooltipEl.value.style.top = `${anchorPoint.y - 70}px`;
      }
    }

    function handleChartMouseLeave() {
      valueTooltip.visible = false;
    }

    const termImpactItems = computed<string[] | null>(() => {
      const items = props.data?.output?.termImpactExchangeRate;
      return Array.isArray(items) && items.length > 0 ? items : null;
    });

    const chartCategories = computed<string[]>(() => {
      const current = props.data?.output?.chart?.current;
      const previous = props.data?.output?.chart?.previous;
      const source = current ?? previous;
      // Skip datapoints without a `date` (or null/undefined items): otherwise the
      // destructured `date` is undefined and `date.split('-')` below throws
      // "Cannot read properties of undefined (reading 'split')" (Sentry ADA-VUE-6G / WI#17408).
      return source
        ?.filter((item: { date?: string } | null | undefined): item is { date: string } => Boolean(item?.date))
        .map(({ date }: { date: string }) => {
          const [year, month] = date.split('-');
          return `${new Date(Number(year), Number(month) - 1).toLocaleString('en', { month: 'short' })} ${year.slice(2)}`;
        }) ?? [];
    });

    const chartAxisMin = computed(() => {
      const allValues = [...currentValues.value, ...previousValues.value];
      if (!allValues.length) return 0;
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      if (min === max) {
        const padding = min === 0 ? 1 : Math.abs(min) * 0.5;
        return min - padding;
      }
      return min;
    });

    const chartAxisMax = computed(() => {
      const allValues = [...currentValues.value, ...previousValues.value];
      if (!allValues.length) return 0;
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      if (min === max) {
        const padding = max === 0 ? 1 : Math.abs(max) * 0.5;
        return max + padding;
      }
      return max;
    });

    function formatChange(value: number | undefined): string {
      if (value === undefined || value === null) return '—';
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    }

    function changeClass(value: number | undefined): string {
      if (value === undefined || value === null) return '';
      return value >= 0 ? 'change-positive' : 'change-negative';
    }

    return {
      chartExpanded, chartData, formattedExchangeRate, currentValues, previousValues, previousSeriesData, currentSeriesData, chartCategories, chartAxisMin, chartAxisMax,
      formatChange, changeClass, termImpactItems, toggleChart,
      valueTooltip, allPointsScreen, tooltipEl, previousMarkerDotEl, currentMarkerDotEl,
      capturePreviousPointPosition, captureCurrentPointPosition, handleChartMouseMove, handleChartMouseLeave,
      chartStyle, chartAreaConfig, valueAxisMajorGridLines, axisMajorGridLinesHidden, axisMinorGridLinesHidden,
      axisLineHidden, valueAxisLabels, categoryAxisLabels, highlightHidden, previousPointMarkers, currentPointMarkers,
    };
  },
});
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';

.section-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $color-gray-500;
  margin-bottom: 12px;
}

.info-pills {
  .info-pill {
    display: flex;    
    background: $color-gray-100;
    border-radius: 8px;
    padding: 6px 12px;
    min-width: 100px;
    align-items: center;
    height: 50px;

    .pill-label {
      font-size: 0.7rem;
      color: $color-gray-500;
      margin-bottom: 2px;
    }

    .pill-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: $color-gray-800;
    }
  }
}

.stats-row {
  .stat-item {
    display: flex;
    flex-direction: column;

    .stat-label {
      display: flex;
      justify-content: center;
      font-size: 0.7rem;
      color: $color-gray-500;
      margin-bottom: 4px;
      
    }
  }
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  height: 40px;
  display: flex;    
  align-items: center;
  justify-content: center;

  &.change-positive { color: $color-green-600; }
  &.change-negative { color: $color-primary-600; }
}

.cover-trend {
    background: $color-gray-100;
    padding: 5px 5px;
    height: 40px;
    border-radius: 8px;
}

.trend-icon {
  &.trend-up    { color: $color-green-600; }
  &.trend-stable { color: $color-gray-400; }
  &.trend-down  { color: $color-primary-600; }
}

// .chart-tooltip / .chart-marker-dot / .chart-point-dot styling lives in the shared
// packages/design-system/src/styles/general/_kendo.scss (used by every custom-tooltip
// Kendo line/area chart in this app) — only this component's own wrapper needs
// `position: relative` for them to anchor to.
.chart-container {
  width: 100%;
  aspect-ratio: 2 / 1;
  position: relative;
}

.chart-expand-enter-active,
.chart-expand-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.chart-expand-enter-from,
.chart-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}


.suppliers-list-box {
  background: $color-gray-50;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 4px;

  .supplier-text {
    font-size: 0.875rem;
    color: $color-gray-700;
    line-height: 1.6;
    margin: 0;

    &--clamped {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
}

.card {
  min-height: 310px !important;
  margin-bottom: 8px !important;

  &--stretch {
    flex-grow: 1;
  }
}

.flag-country-entity-card {
  width: 35.8px;
  height: 35.8px;
  display: inline-block !important;
  border-radius: 50%;
  border: 1px solid $color-gray-400;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: cover !important;
}


.bullet-point {
  color: #000000;
}

</style>
