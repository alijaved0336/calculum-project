<template>
<div class="aiic-card">
  <div class="aiic-header">
    <div class="aiic-header-left"><span class="text-base font-semibold text-gray-600 mb-2">{{ $t('global.aggregateImpactIndex')  }}</span></div>
  </div>
  <div class="aiic-chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
    <Chart :key="seriesData?.length" :style="chartStyle" :transitions="false">
      <ChartArea :margin="chartAreaMargin" :background="'transparent'"></ChartArea>
      <ChartSeries>
        <ChartSeriesItem :type="'area'" :data-items="seriesData" :line="seriesLine" :color="'#94a3b8'" :opacity="0.15" :markers="pointPositionMarkers" :highlight="highlightHidden">         </ChartSeriesItem>
      </ChartSeries>
      <ChartCategoryAxis>
        <ChartCategoryAxisItem :categories="categories" :labels="categoryAxisLabels" :major-grid-lines="axisMajorGridLinesHidden" :minor-grid-lines="axisMinorGridLinesHidden" :line="axisLineHidden">
          <ChartCategoryAxisTitle :text="'Month'" color="#98a2b3" :font="'400 12px Inter '" :margin="20"></ChartCategoryAxisTitle>
        </ChartCategoryAxisItem>
      </ChartCategoryAxis>
      <ChartValueAxis>
        <ChartValueAxisItem :min="yAxisMin" :labels="valueAxisLabels" :major-grid-lines="valueAxisMajorGridLines" :minor-grid-lines="axisMinorGridLinesHidden" :line="axisLineHidden">
          <ChartCategoryAxisTitle :text="'Index'" color="#98a2b3" :font="'400 12px Inter '"></ChartCategoryAxisTitle>
        </ChartValueAxisItem>
      </ChartValueAxis>
      <ChartLegend :visible="false"></ChartLegend>
    </Chart>
    <template v-for="(pt, idx) in allPointsScreen" :key="idx">
      <div v-show="valueTooltip.visible" class="chart-point-dot" :style="{ top: pt.y + 'px', left: pt.x + 'px' }"></div>
    </template>
    <div v-show="valueTooltip.visible" ref="tooltipEl" class="chart-tooltip">
      <div class="chart-tooltip-category">{{ valueTooltip.category }}</div>
      <div class="chart-tooltip-value">{{ valueTooltip.formattedValue }}</div>
    </div>
    <div v-show="valueTooltip.visible" ref="markerDotEl" class="chart-marker-dot"></div>
  </div>
  <div class="aiic-memo">   <span><strong>{{ $t('global.calculationMemo') }}:&nbsp;</strong>{{ $t('global.memoDesc') }}</span></div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, ref, watch, PropType } from 'vue';
import {
  Chart,
  ChartArea,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartLegend,
  ChartCategoryAxisTitle
} from '@progress/kendo-vue-charts';
import { Text } from '@progress/kendo-drawing';
import type { TimeSeriesDataChart } from '@/modules/home/entityCard/types';

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
const chartStyle = { width: '100%', height: '100%' };
const chartAreaMargin = { top: 16, right: 8, bottom: 0, left: 0 };
const seriesLine = { style: 'smooth', width: 2.5, color: '#0f172a' };
// Kendo's built-in hover-highlight dot is a separate mechanism from <ChartTooltip>
// (which this component no longer uses) — it stays on by default even without a
// tooltip, duplicating our own custom highlight dot.
const highlightHidden = { visible: false };
const categoryAxisLabels = { font: '600 14px Inter', color: '#475467', rotation: 'auto' };
const axisMajorGridLinesHidden = { visible: false };
const axisMinorGridLinesHidden = { visible: false };
const axisLineHidden = { visible: false };
const valueAxisLabels = { font: '600 14px Inter', color: '#475467' };
const valueAxisMajorGridLines = { color: '#f1f5f9', dashType: 'solid' };

export default defineComponent({
  name: 'AggregateImpactIndexChart',
  components: {
    Chart, ChartArea, ChartSeries, ChartSeriesItem,
    ChartCategoryAxis, ChartCategoryAxisItem,
    ChartValueAxis, ChartValueAxisItem,
    ChartLegend, ChartCategoryAxisTitle
  },
  props: {
    dataSeries: { type: Array as PropType<number[][] | null>, default: () => [] },
    dataCategories: { type: Array as PropType<TimeSeriesDataChart[] | null>, default: () => [] }
  },
  setup(props) {
    const categories = computed(() => props.dataCategories?.map(res => `${res.periodName.slice(0, 3)} ${res.year}`));
    const seriesData = computed(() => props.dataSeries);
    const yAxisMin = computed(() => {
      const flat = props.dataSeries?.flat() ?? [];
      if (!flat.length) return 99.5;
      return Math.round((Math.min(...flat) - 0.5) * 10) / 10;
    });

    // Kendo's own shared-tooltip hit-testing (which category is nearest the mouse) is
    // corrupted under the app-wide zoom:0.67 — hovering one point highlights another,
    // and the last point can become unreachable. This isn't fixable by repositioning
    // Kendo's popup (as done in the sibling bar/waterfall chart fixes) since the wrong
    // DATA gets selected, not just the wrong visual position. Instead this component
    // does its own hit-testing: the series point's real SVG-local position is captured
    // (via capturePointPosition, an invisible ChartSeriesItem labels.visual callback —
    // the same e.rect mechanism already proven reliable/uncorrupted across every other
    // chart fix in this app), then on mousemove the nearest point is found by converting
    // the mouse position into that same SVG-local space via getScreenCTM() (the
    // technique already used for the Y-axis label truncation tooltip elsewhere in the
    // codebase, proven zoom-safe since it relies on the browser's own SVG transform
    // matrix, not Kendo's internal — and corrupted — coordinate math). Kendo's
    // <ChartTooltip> is removed entirely in favor of this custom tooltip + highlight dot.
    //
    // Positioning is intentionally NOT reactive: getBoundingClientRect() under this
    // app's zoom produces tiny sub-pixel differences on every call even when nothing
    // actually moved, so writing x/y into a reactive() object re-triggered a render (and
    // a full Kendo chart redraw) on every single mousemove tick. Only content that
    // genuinely changes rarely (visible flag, which point is active) is reactive; the
    // tooltip/marker DOM position is set imperatively via template refs.
    const valueTooltip = reactive({ visible: false, category: '', formattedValue: '' })
    const allPointsScreen = reactive<Array<{ x: number; y: number }>>([])
    const tooltipEl = ref<HTMLElement | null>(null)
    const markerDotEl = ref<HTMLElement | null>(null)
    // Keyed by category, not e.index — for this series Kendo's labels.visual callback
    // receives an e.index that is constant across all points, not a per-point index,
    // and it also fires more than once per point per render pass.
    let pointPositionsByCategory = new Map<string, { category: string; value: number; x: number; y: number }>()
    let pendingClearPointPositions = true

    watch([seriesData, categories], () => {
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
        pointPositionsByCategory = new Map();
        pendingClearPointPositions = false;
      }

      const invisibleMarker = new Text('', [e.rect.origin.x, e.rect.origin.y], { opacity: 0 });

      if (e.value === null || e.value === undefined) return invisibleMarker;

      pointPositionsByCategory.set(e.category, {
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
      const pointPositions = Array.from(pointPositionsByCategory.values());
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

      if (!valueTooltip.visible) {
        valueTooltip.visible = true;
        allPointsScreen.splice(
          0,
          allPointsScreen.length,
          ...pointPositions.map(p => toContainerPoint(svg, ctm, containerRect, zoomCompensation, p.x, p.y)),
        );
      }

      valueTooltip.category = nearest.category;
      valueTooltip.formattedValue = `${nearest.value}`;

      const markerPoint = toContainerPoint(svg, ctm, containerRect, zoomCompensation, nearest.x, nearest.y);

      if (markerDotEl.value) {
        markerDotEl.value.style.left = `${markerPoint.x}px`;
        markerDotEl.value.style.top = `${markerPoint.y}px`;
        markerDotEl.value.style.background = '#0f172a';
      }
      if (tooltipEl.value) {
        tooltipEl.value.style.left = `${markerPoint.x + 14}px`;
        tooltipEl.value.style.top = `${markerPoint.y - 56}px`;
      }
    }

    function handleChartMouseLeave() {
      valueTooltip.visible = false;
    }

    return {
      categories, seriesData, yAxisMin,
      valueTooltip, allPointsScreen, tooltipEl, markerDotEl, handleChartMouseMove, handleChartMouseLeave,
      chartStyle, chartAreaMargin, seriesLine, highlightHidden, pointPositionMarkers,
      categoryAxisLabels, axisMajorGridLinesHidden, axisMinorGridLinesHidden, axisLineHidden,
      valueAxisLabels, valueAxisMajorGridLines,
    };
  }
});
</script>

<style lang="scss" scoped>
.aiic-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
  padding: 20px 20px 16px;
  width: 100%;
}

.aiic-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.aiic-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}


.aiic-subtitle {
  font-size: 0.7rem;  
  font-weight: 500;
}

.aiic-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.aiic-multiple-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #4e9fba;
  text-transform: uppercase;
}

.aiic-multiple-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #ef4444;
  line-height: 1;
}

.aiic-chart-wrapper {
  width: 100%;
  aspect-ratio: 16 / 10;
  position: relative;

  :deep(.k-chart) {
    width: 100% !important;
    height: 100% !important;
  }
}

// .chart-tooltip / .chart-marker-dot / .chart-point-dot styling lives in the shared
// packages/design-system/src/styles/general/_kendo.scss (used by every custom-tooltip
// Kendo line/area chart in this app) — this wrapper's own `position: relative` above is
// all that's needed locally for them to anchor to.

.aiic-memo {
  display: flex;
  align-items: flex-start;
  gap: 8px;  
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.5;
  margin-top: 2rem;
}

</style>
