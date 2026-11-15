<template>
<div class="card shadow-none p-3" :class="{ 'card--stretch': stretch }">
  <div class="card-body"><span class="text-base font-semibold text-gray-600 mb-3">{{ $t('home.entityCard.marketInsights.interestRates') }}</span>
    <div class="info-pills d-flex gap-3 mb-3">
      <div class="d-flex flex-column gap-2"><span class="small text-gray-600 d-block">{{ `${$t('home.entityCard.marketInsights.supplierCountry')} (${$t('global.currency')})`  }}</span>
        <div class="info-pill">
          <div class="flag-country-entity-card my-auto mr-1" :style="`background-image: url('${ supplierCountryFlagUrl }') !important;`" :title="data.output?.country">       </div><span class="pill-value">{{ supplierCurrency ? ` ${data.output?.country} (${supplierCurrency})` : ` ${data.output?.country}` }}</span>
        </div>
      </div>
    </div>
    <div class="stats-row d-flex align-items-end gap-6 mb-3">
      <div class="stat-item"><span class="stat-label">{{ $t('home.entityCard.marketInsights.interestRate') }}</span><span class="stat-value text-2xl font-bold text-gray-900">{{ formattedInterestRate }}%</span></div>
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
      <div v-if="chartExpanded" class="chart-container interest-rate-chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
        <Chart v-if="hasChartData" :style="chartStyle" :chart-area="chartAreaConfig" :transitions="false">
          <ChartLegend position="bottom" orientation="horizontal"></ChartLegend>
          <ChartValueAxis>
            <ChartValueAxisItem :major-grid-lines="valueAxisMajorGridLines" :minor-grid-lines="axisMinorGridLinesHidden" :line="axisLineHidden" :min="chartAxisMin" :max="chartAxisMax" :labels="valueAxisLabels">
              <ChartCategoryAxisTitle :text="'Interest Rate'" color="#98a2b3" :font="'400 12px Inter '"></ChartCategoryAxisTitle>
            </ChartValueAxisItem>
          </ChartValueAxis>
          <ChartCategoryAxis>
            <ChartCategoryAxisItem :categories="chartDates" :major-grid-lines="axisMajorGridLinesHidden" :minor-grid-lines="axisMinorGridLinesHidden" :line="axisLineHidden" :labels="categoryAxisLabels">
              <ChartCategoryAxisTitle :text="'Month'" color="#98a2b3" :font="'400 12px Inter '" :margin="20"></ChartCategoryAxisTitle>
            </ChartCategoryAxisItem>
          </ChartCategoryAxis>
          <ChartSeries>
            <ChartSeriesItem v-if="!isChartFormat" type="line" :data-items="chartSeriesData" :field="'value'" color="#3b82f6" :line-style="'step'" :width="2" :markers="pointPositionMarkers" :highlight="highlightHidden" name="Interest Rate"></ChartSeriesItem>
            <template v-if="isChartFormat">
              <ChartSeriesItem type="line" :data-items="chartCurrentSeriesData" :field="'value'" color="#d0d5dd" :line-style="'step'" :width="2" :markers="pointPositionMarkers" :highlight="highlightHidden" name="Current">             </ChartSeriesItem>
            </template>
          </ChartSeries>
        </Chart>
        <template v-for="(pt, idx) in allPointsScreen" :key="idx">
          <div v-show="valueTooltip.visible" class="chart-point-dot" :style="{ top: pt.y + 'px', left: pt.x + 'px' }"></div>
        </template>
        <div v-show="valueTooltip.visible" ref="tooltipEl" class="chart-tooltip">
          <div class="chart-tooltip-category">{{ valueTooltip.category }}</div>
          <div class="chart-tooltip-row">
            <span class="chart-tooltip-dot" :style="{ background: valueTooltip.color }"></span><span class="chart-tooltip-value">{{ valueTooltip.formattedValue }}</span>
          </div>
        </div>
        <div v-show="valueTooltip.visible" ref="markerDotEl" class="chart-marker-dot"></div>
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
import IconChartForecast from '@ada/design-system/assets/icons/iconChartForecast.vue';
import IconChartForecastDown from '@ada/design-system/assets/icons/iconChartForecastDown.vue';
import iconChartStable from '@/resources/assets/images/icons/iconChartStable.vue';
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${MONTHS[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

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
// inline object literals in the template — otherwise every mousemove (which mutates
// valueTooltip/markerPosition to drive the custom tooltip) would recreate all of them
// and force the whole chart to redraw on every pixel of cursor movement.
const chartStyle = { height: '100%' };
const chartAreaConfig = { margin: { top: 4 } };
const valueAxisMajorGridLines = { visible: true, color: '#f1f5f9' };
const axisMajorGridLinesHidden = { visible: false };
const axisMinorGridLinesHidden = { visible: false };
const axisLineHidden = { visible: false };
const valueAxisLabels = { font: '600 14px Inter', color: '#475467', format: '{0}%' };
const categoryAxisLabels = { font: '600 14px Inter', color: '#475467', rotation: 'auto' };
// Kendo's built-in hover-highlight dot on line series is a separate mechanism from
// <ChartTooltip> (which this component no longer uses) — it stays on by default even
// without a tooltip, duplicating our own custom highlight dot.
const highlightHidden = { visible: false };

export default defineComponent({
  name: 'InterestRatesCard',

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
    // Already-formatted by the parent: a plain string, so a multi-currency country cannot
    // fall back to Array.toString()'s bare comma join ("Poland (EUR,PLN)").
    supplierCurrency: { type: String, default: '' },
    stretch: { type: Boolean, default: false },
    supplierCountryFlagUrl: { type: String, default: '' }
  },
  emits: ['expanded-change'],

  setup(props, { emit }) {
    const chartExpanded = ref(true);

    function toggleChart() {
      chartExpanded.value = !chartExpanded.value;
      emit('expanded-change', chartExpanded.value);
    }

    // Kendo's own shared-tooltip hit-testing (which category is nearest the mouse) is
    // corrupted under the app-wide zoom:0.67 — hovering point 5 highlights point 3, and
    // the last point becomes unreachable. This isn't fixable by repositioning Kendo's
    // popup (as done in the sibling bar/waterfall chart fixes) since the wrong DATA gets
    // selected, not just the wrong visual position. Instead this component does its own
    // hit-testing: each series point's real SVG-local position is captured (via
    // capturePointPosition, an invisible ChartSeriesItem markers.visual callback — the
    // same e.rect mechanism already proven reliable/uncorrupted across every other chart
    // fix in this app), then on mousemove the nearest point is found by converting the
    // mouse position into that same SVG-local space via getScreenCTM() (the technique
    // already used for the Y-axis label truncation tooltip elsewhere in this codebase,
    // proven zoom-safe since it relies on the browser's own SVG transform matrix, not
    // Kendo's internal — and corrupted — coordinate math). Kendo's <ChartTooltip> is
    // removed entirely in favor of this custom tooltip + highlight dot.
    //
    // Positioning is intentionally NOT reactive: getBoundingClientRect() under this
    // app's zoom produces tiny sub-pixel differences on every call even when nothing
    // actually moved, so writing x/y into a reactive() object re-triggered a render (and
    // a full Kendo chart redraw) on every single mousemove tick. Only content that
    // genuinely changes rarely (visible flag, which point is active) is reactive;
    // the tooltip/marker DOM position is set imperatively via template refs.
    const valueTooltip = reactive({ visible: false, category: '', formattedValue: '', color: '#3b82f6' })
    const allPointsScreen = reactive<Array<{ x: number; y: number }>>([])
    const tooltipEl = ref<HTMLElement | null>(null)
    const markerDotEl = ref<HTMLElement | null>(null)
    // Keyed by e.dataItem.date, NOT e.category: chartDates/formatDate collapses each raw
    // date down to a month-year label ("Apr 26"), so multiple points sharing a month
    // (e.g. weekly data) share the same category string — keying by category collapsed
    // all of them into one Map entry, silently dropping every point but the last one per
    // month. date is the one field guaranteed unique per point; it's available on
    // e.dataItem because chartSeriesData/chartCurrentSeriesData bind the raw
    // {date, value} objects via :field="'value'" instead of a plain number[].
    let pointPositionsByDate = new Map<string, { date: string; category: string; value: number; x: number; y: number }>()
    let pendingClearPointPositions = true

    const termImpactItems = computed<string[] | null>(() => {
      const items = props.data?.output?.termImpactInterestRate;
      return Array.isArray(items) && items.length > 0 ? items : null;
    });

    const formattedInterestRate = computed<string>(() => {
      const val = props.data?.output?.interestRate;
      if (val === undefined || val === null) return '—';
      return Number(val).toFixed(2);
    });

    const isChartFormat = computed(() => !!props.data?.output?.chart);

    const allSortedRawDates = computed<string[]>(() => {
      if (!isChartFormat.value) return [];
      const chart = props.data?.output?.chart;
      const all = [
        ...(chart?.current ?? []).map((i: { date: string }) => i.date),
        ...(chart?.previous ?? []).map((i: { date: string }) => i.date),
      ];
      return [...new Set(all)].sort();
    });

    const chartDates = computed<string[]>(() => {
      if (isChartFormat.value) return allSortedRawDates.value.map(formatDate);
      const items: { date: string }[] = props.data?.output?.historicalGraphData ?? [];
      return items.map(item => formatDate(item.date));
    });

    // Bound to ChartSeriesItem via :field="'value'" instead of a plain number[] so that
    // e.dataItem in the markers.visual capture callback below retains the raw `date` —
    // needed as a per-point-unique key since chartDates/formatDate collapses multiple
    // points sharing a month into the same label (see capturePointPosition).
    const chartSeriesData = computed<{ date: string; value: number }[]>(() => {
      if (isChartFormat.value) return [];
      const items: { date: string; value: number }[] = props.data?.output?.historicalGraphData ?? [];
      return items;
    });

    const chartCurrentSeriesData = computed<{ date: string; value: number | null }[]>(() => {
      if (!isChartFormat.value) return [];
      const map = new Map<string, number>(
        (props.data?.output?.chart?.current ?? []).map((i: { date: string; value: number }) => [i.date, i.value])
      );
      return allSortedRawDates.value.map(d => ({ date: d, value: map.get(d) ?? null }));
    });

    const chartValues = computed<number[]>(() => chartSeriesData.value.map(item => item.value));

    const chartCurrentValues = computed<(number | null)[]>(() => chartCurrentSeriesData.value.map(item => item.value));

    const chartPreviousValues = computed<(number | null)[]>(() => {
      if (!isChartFormat.value) return [];
      const map = new Map<string, number>(
        (props.data?.output?.chart?.previous ?? []).map((i: { date: string; value: number }) => [i.date, i.value])
      );
      return allSortedRawDates.value.map(d => map.get(d) ?? null);
    });

    const hasChartData = computed(() => {
      if (isChartFormat.value) return allSortedRawDates.value.length > 0;
      return chartValues.value.length > 0;
    });

    const allChartValues = computed<number[]>(() => {
      if (isChartFormat.value) {
        return [
          ...chartCurrentValues.value.filter((v): v is number => v !== null),
          ...chartPreviousValues.value.filter((v): v is number => v !== null),
        ];
      }
      return chartValues.value;
    });

    const chartAxisMin = computed(() => {
      const vals = allChartValues.value;
      if (!vals.length) return 0;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const padding = min === max ? 0.5 : (max - min) * 0.2;
      return parseFloat(Math.max(0, min - padding).toFixed(2));
    });

    const chartAxisMax = computed(() => {
      const vals = allChartValues.value;
      if (!vals.length) return 0;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const padding = min === max ? 0.5 : (max - min) * 0.2;
      return parseFloat((max + padding).toFixed(2));
    });

    watch([chartValues, chartCurrentValues], () => {
      pendingClearPointPositions = true;
    });

    /**
     * Invisible ChartSeriesItem markers.visual callback (returns an explicit invisible
     * shape — returning undefined isn't enough to suppress Kendo's own default marker)
     * used purely to capture each point's real SVG-local position. Uses `markers`, not
     * `labels`: Kendo aligns a label's rect to the TOP of the point's marker box (so it
     * doesn't overlap the line), while a marker's rect is centered exactly on the true
     * data point — using labels here made the custom dots float visibly above the
     * curve. See valueTooltip declaration above for why this capture exists at all.
     */
    function capturePointPosition(e: any) {
      if (pendingClearPointPositions) {
        pointPositionsByDate = new Map();
        pendingClearPointPositions = false;
      }

      const invisibleMarker = new Text('', [e.rect.origin.x, e.rect.origin.y], { opacity: 0 });

      if (e.value === null || e.value === undefined) return invisibleMarker;

      pointPositionsByDate.set(e.dataItem.date, {
        date: e.dataItem.date,
        category: e.category,
        value: e.value,
        x: e.rect.origin.x + e.rect.size.width / 2,
        y: e.rect.origin.y + e.rect.size.height / 2,
      });

      return invisibleMarker;
    }

    // Stable reference for the same reason as the module-level configs above —
    // capturePointPosition itself is a stable closure, but this wrapping object literal
    // must not be recreated inline in the template or Kendo will redraw on every hover.
    const pointPositionMarkers = { visible: true, visual: capturePointPosition };

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
      const pointPositions = Array.from(pointPositionsByDate.values());
      if (!svg || pointPositions.length === 0) {
        valueTooltip.visible = false;
        return;
      }

      const ctm = svg.getScreenCTM();
      if (!ctm) return;

      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(ctm.inverse());

      let nearest = pointPositions[0];
      let minDist = Math.abs(svgP.x - nearest.x);
      for (const p of pointPositions) {
        const dist = Math.abs(svgP.x - p.x);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      }

      const containerRect = el.getBoundingClientRect();
      const zoomCompensation = getZoomCompensation();
      const seriesColor = isChartFormat.value ? '#d0d5dd' : '#3b82f6';

      if (!valueTooltip.visible) {
        valueTooltip.visible = true;
        allPointsScreen.splice(
          0,
          allPointsScreen.length,
          ...pointPositions.map(p => toContainerPoint(svg, ctm, containerRect, zoomCompensation, p.x, p.y)),
        );
      }

      valueTooltip.category = nearest.category;
      valueTooltip.formattedValue = `${Number(nearest.value).toFixed(2)}%`;
      valueTooltip.color = seriesColor;

      const markerPoint = toContainerPoint(svg, ctm, containerRect, zoomCompensation, nearest.x, nearest.y);

      if (markerDotEl.value) {
        markerDotEl.value.style.left = `${markerPoint.x}px`;
        markerDotEl.value.style.top = `${markerPoint.y}px`;
        markerDotEl.value.style.background = seriesColor;
      }
      if (tooltipEl.value) {
        tooltipEl.value.style.left = `${markerPoint.x + 14}px`;
        tooltipEl.value.style.top = `${markerPoint.y - 56}px`;
      }
    }

    function handleChartMouseLeave() {
      valueTooltip.visible = false;
    }

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
      chartExpanded, formattedInterestRate, isChartFormat, chartDates, chartValues, chartCurrentValues, chartPreviousValues,
      chartSeriesData, chartCurrentSeriesData,
      hasChartData, chartAxisMin, chartAxisMax, formatChange, changeClass, termImpactItems, toggleChart,
      valueTooltip, allPointsScreen, tooltipEl, markerDotEl, capturePointPosition, handleChartMouseMove, handleChartMouseLeave,
      chartStyle, chartAreaConfig, valueAxisMajorGridLines, axisMajorGridLinesHidden, axisMinorGridLinesHidden,
      axisLineHidden, valueAxisLabels, categoryAxisLabels, highlightHidden, pointPositionMarkers,
    };
  },
});
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';

.info-pills {
  .info-pill {
    display: flex;    
    background: $color-gray-100;
    border-radius: 8px;
    padding: 6px 12px;
    min-width: 100px;
    align-items: center;
    height: 50px;

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
  padding: 5px;
  height: 40px;
  border-radius: 8px;
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

.card {
  min-height: 310px !important;
  margin-bottom: 8px !important;

  &--stretch {
    flex-grow: 1;
  }
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
