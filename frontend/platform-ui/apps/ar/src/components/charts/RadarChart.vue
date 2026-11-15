<template>
  <Chart :style="{ minHeight: '260px' }" :transitions="false">
    <ChartSeries>
      <ChartSeriesItem
        :type="'radarArea'"
        :data-items="points"
        :field="'term'"
        :category-field="'name'"
        :color="chartFirstGroup"
        :style="{ fill: chartFirstGroup, opacity: 0.2 }"
      />
    </ChartSeries>
    <ChartValueAxis>
      <ChartValueAxisItem
        :min="0"
        :labels="{ font: '400 11px Inter' }"
        :major-grid-lines="{ visible: true, color: gridColor, width: 1 }"
        :minor-grid-lines="{ visible: false }"
      />
    </ChartValueAxis>
    <ChartCategoryAxis>
      <ChartCategoryAxisItem :labels="{ font: '600 12px Inter' }" />
    </ChartCategoryAxis>
    <ChartTooltip :render="'defaultTooltipRender'">
      <template #defaultTooltipRender="{ props }">
        {{ props.point.category }}: {{ formatDays(props.point.value) }}
      </template>
    </ChartTooltip>
  </Chart>
</template>

<script setup lang="ts">
/**
 * Ported from apps/ap/src/modules/components/charts/kendo/RadarChart.vue at commit a884931aac
 * (UC-UI-07 / AB#19236).
 *
 * Adapted, not a like-for-like port - AP's component is built for its own fixed low/medium/high
 * (0-3) scoring scale with hardcoded axis labels ("Cost of Funds", "Financing Days", ...) and a
 * hand-rolled multi-line label layout tuned to that exact label set. None of that applies here:
 * UC-UI-07's Benchmarks radar plots one axis per CONFIRMED strategy (AC-03), a set that varies
 * per buyer, against the strategy's proposed term in days - a numeric scale, not a category
 * scale. So this keeps only the Kendo wiring (`radarArea` series, category/value axes, tooltip)
 * and drops: the fixed 0-3 `ChartValueAxisItem` bounds and hidden labels (replaced with an
 * auto-scaling, visible numeric axis), the `getCategoryLabel` null/low/medium/high lookup, the
 * bespoke `getLabels`/`estimateTextWidth` manual text-measurement and positioning code (Kendo's
 * own label rendering handles a category label of any length without per-string tuning), the
 * `ChartLegend` (one series, nothing to key), and the four unused `fillColor`/`fillOpacity`
 * props collapsed to the app's own `chartFirstGroup` token. `data-items`' `field` is `term`
 * (whole days) here, not AP's `post`.
 *
 * A generic chart in `components/charts/` alongside WaterfallChart.vue/NineBoxes.vue, so - like
 * them - it depends only on shared `@/utils/*` helpers, never on a feature module: `points`'
 * shape is declared locally rather than importing `RadarPoint` from the entityCard module that
 * is this chart's only consumer today, and the tooltip's day-count formatting is inlined rather
 * than importing that module's `formatDays`. Not skipping i18n, though - like NineBoxes.vue and
 * WaterfallChart.vue in this same folder, it calls `useI18n()` itself for the one string it needs
 * (found by review: this tooltip was rendering "30 days" in a Spanish session).
 */
import { useI18n } from 'vue-i18n'
import {
  Chart,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartSeries,
  ChartSeriesItem,
  ChartTooltip,
  ChartValueAxis,
  ChartValueAxisItem,
} from '@progress/kendo-vue-charts'
import { chartFirstGroup, restColor as gridColor } from '@/utils/chartColors'

defineProps<{ points: { name: string; term: number }[] }>()

const { t } = useI18n({ useScope: 'global' })
const formatDays = (value: number) => t('arEntityCard.opportunity.days', { count: value })
</script>
