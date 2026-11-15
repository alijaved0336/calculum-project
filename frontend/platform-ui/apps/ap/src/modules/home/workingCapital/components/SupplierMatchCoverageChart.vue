<template>
  <div class="card shadow-none h-100">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6 class="wc-smc__title">
            {{ $t("home.workingCapital.supplierMatch.title") }}
          </h6>
          <p class="wc-smc__subtitle">{{ subtitle }}</p>
        </div>
        <Tooltip
          v-if="result.suppliersPresentOnlyInOlderFile > 0"
          :open-delay="100"
          anchor-element="target"
          position="bottom"
        >
          <button type="button" class="wc-smc__footnote" :title="footnoteTitle">
            {{ footnoteText }}
          </button>
        </Tooltip>
      </div>
      <template v-if="showSkeleton">
        <SkeletonRectangle size="full" />
      </template>
      <template v-else-if="hasError">
        <div class="wc-smc__unavailable">
          {{ $t("home.workingCapital.supplierMatch.unavailable") }}
        </div>
      </template>
      <template v-else>
        <div class="wc-smc__content">
          <div class="wc-smc__donut-side">
            <div class="position-relative wc-smc__donut-wrap">
              <Chart ref="chartRef" :style="{ height: '100%', width: '100%' }">
                <ChartLegend :visible="false" />
                <ChartArea :margin="{ top: 0, bottom: 0, left: 0, right: 0 }" />
                <ChartSeries>
                  <ChartSeriesItem
                    :type="'donut'"
                    :data-items="donutData"
                    :field="'value'"
                    :category-field="'category'"
                    :color-field="'color'"
                    :hole-size="85"
                    :labels="{ visible: false }"
                    :tooltip="{ visible: false }"
                  />
                </ChartSeries>
              </Chart>
              <div class="wc-smc__donut-center">
                <Tooltip :open-delay="100" anchor-element="target" position="bottom">
                  <button type="button" class="wc-smc__donut-center-count" :title="exactTotalAnalyzed">{{
                    centerCount
                  }}</button>
                </Tooltip>
                <span class="wc-smc__donut-center-sub">{{
                  $t("home.workingCapital.supplierMatch.suppliersAnalyzed")
                }}</span>
              </div>
            </div>
          </div>
          <!-- .wc-smc__separator -->
          <div class="wc-smc__legend-side">
            <div class="wc-legend">
              <div
                v-for="item in legendItems"
                :key="item.label"
                class="wc-legend__item"
              >
                <span
                  class="wc-legend__dot"
                  :style="{ background: item.color }"
                ></span>
                <span class="wc-legend__label">{{ item.label }}</span>
                <Tooltip :open-delay="100" anchor-element="target" position="bottom">
                  <button type="button" class="wc-legend__count" :title="item.exactCount">{{ item.formattedCount }}</button>
                </Tooltip>
                <Tooltip :open-delay="100" anchor-element="target" position="bottom">
                  <span class="wc-legend__pct" :title="`${item.pct}%`">{{ item.pct }}%</span>
                </Tooltip>

              </div>
              <div class="wc-legend__item wc-legend__total">
                <span class="wc-legend__label">{{
                  $t("home.workingCapital.supplierMatch.totalAnalyzed")
                }}</span>
                <Tooltip :open-delay="100" anchor-element="target" position="bottom">
                  <button type="button" class="wc-legend__count" :title="exactTotalAnalyzed">{{ centerCount }}</button>
                </Tooltip>
                <span class="wc-legend__pct-spacer"></span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, PropType } from "vue";
import { useI18n } from "vue-i18n";
import {
  Chart,
  ChartArea,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
} from "@progress/kendo-vue-charts";
import { exportImage, Group } from "@progress/kendo-drawing";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import type { WorkingCapitalComparisonResult } from "../types";
import { ColorsUtils } from "@/utils";
import { formatSupplierCount, formatExactCount } from "../utils/formatters";

const COLORS = {
  increased: ColorsUtils.teal[500], // #15b79e
  notIncreased: "#5262eb",
  notMatched: ColorsUtils.graycool[800], // #30374f
};

interface DonutSlice {
  value: number;
  category: string;
  color: string;
}

export default defineComponent({
  name: "SupplierMatchCoverageChart",
  components: {
    Chart,
    ChartArea,
    ChartLegend,
    ChartSeries,
    ChartSeriesItem,
    SkeletonRectangle,
    Tooltip,
  },
  props: {
    result: {
      type: Object as PropType<WorkingCapitalComparisonResult>,
      required: true,
    },
    fromLabel: { type: String, default: "" }, // month + year, e.g. "Dec 2022"
    toLabel: { type: String, default: "" }, // month + year, e.g. "Dec 2023"
    showSkeleton: { type: Boolean, default: false },
    hasError: { type: Boolean, default: false },
  },
  setup(props) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: "global" });

    // Exposed to WorkingCapitalExportPDF.vue: the generic drawDOM()-based PDF
    // capture (apps/ap/src/modules/home/workingCapital/utils/exportPdf.ts) cannot
    // faithfully reproduce this donut's SVG output (it's the only real Kendo
    // <Chart> ever run through that pipeline), so the export rasterizes it via
    // Kendo's own chart-export API instead and splices the resulting image into
    // the cloned DOM before drawDOM() runs.
    const chartRef = ref<{ chartInstance?: () => { exportVisual?: () => Group | undefined } } | null>(null);

    async function exportChartImage(): Promise<string | null> {
      const instance = chartRef.value?.chartInstance?.();
      const visual = instance?.exportVisual?.();
      return visual ? exportImage(visual) : null;
    }

    const subtitle = computed(() => {
      const range =
        props.fromLabel && props.toLabel
          ? `${props.fromLabel} → ${props.toLabel}`
          : "";
      return range
        ? `${range}, All Analyzed Suppliers`
        : "All Analyzed Suppliers";
    });

    const donutData = computed<DonutSlice[]>(() => [
      {
        value: props.result.suppliersImproved,
        category: t("home.workingCapital.supplierMatch.matchedIncreased"),
        color: COLORS.increased,
      },
      {
        value: props.result.suppliersMatchNotIncreased,
        category: t("home.workingCapital.supplierMatch.matchNotIncreased"),
        color: COLORS.notIncreased,
      },
      {
        value: props.result.suppliersNotMatched,
        category: t("home.workingCapital.supplierMatch.notMatched"),
        color: COLORS.notMatched,
      },
    ]);

    const centerCount = computed(() => formatSupplierCount(props.result.totalAnalyzed));
    const exactTotalAnalyzed = computed(() => formatExactCount(props.result.totalAnalyzed));

    // AC-02 — the count is embedded inside translated copy, not a bare span, so build
    // both an abbreviated and an exact version of the whole sentence for the tooltip.
    const footnoteText = computed(() =>
      t("home.workingCapital.supplierMatch.presentOnlyInOlderFile", {
        count: formatSupplierCount(props.result.suppliersPresentOnlyInOlderFile),
      })
    );
    const footnoteTitle = computed(() =>
      t("home.workingCapital.supplierMatch.presentOnlyInOlderFile", {
        count: formatExactCount(props.result.suppliersPresentOnlyInOlderFile),
      })
    );

    const legendItems = computed(() => {
      const total = props.result.totalAnalyzed || 1;

      // Sum-to-100 percentage method
      const raw = [
        props.result.suppliersImproved,
        props.result.suppliersMatchNotIncreased,
        props.result.suppliersNotMatched,
      ].map((c) => Number.parseFloat(((c / total) * 100).toFixed(1)));

      // Adjust last item so three values sum to exactly 100.0
      const p0 = raw[0];
      const p1 = raw[1];
      const p2 = Number.parseFloat((100 - p0 - p1).toFixed(1));

      return [
        {
          label: t("home.workingCapital.supplierMatch.matchedIncreased"),
          formattedCount: formatSupplierCount(props.result.suppliersImproved),
          exactCount: formatExactCount(props.result.suppliersImproved),
          pct: p0,
          color: COLORS.increased,
        },
        {
          label: t("home.workingCapital.supplierMatch.matchNotIncreased"),
          formattedCount: formatSupplierCount(props.result.suppliersMatchNotIncreased),
          exactCount: formatExactCount(props.result.suppliersMatchNotIncreased),
          pct: p1,
          color: COLORS.notIncreased,
        },
        {
          label: t("home.workingCapital.supplierMatch.notMatched"),
          formattedCount: formatSupplierCount(props.result.suppliersNotMatched),
          exactCount: formatExactCount(props.result.suppliersNotMatched),
          pct: p2,
          color: COLORS.notMatched,
        },
      ];
    });

    return { chartRef, exportChartImage, subtitle, donutData, centerCount, exactTotalAnalyzed, legendItems, footnoteText, footnoteTitle };
  },
});
</script>

<style scoped lang="scss">
.wc-smc {
  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #101828;
    margin-bottom: 0.125rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: #667085;
    margin-bottom: 1rem;
  }

  &__unavailable {
    font-size: 0.875rem;
    color: #667085;
    padding: 2rem 0;
    text-align: center;
  }

  &__footnote {
    // Native <button> reset — focusable by default (so the Tooltip it wraps reveals
    // on keyboard focus too, per WCAG 1.4.13), but purely a hover/focus trigger with
    // no click action, so it must look identical to the plain text it replaces.
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    font-size: 0.8125rem;
    color: #667085;
    text-align: right;
    max-width: 25rem;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    display: flex;
    min-height: 240px;
  }

  &__donut-side {
    flex: 0 0 29%;
    position: relative;
    min-height: 0;
  }

  &__legend-side {
    flex: 1;
    display: flex;
    align-items: center;
  }

  &__donut-wrap {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__donut-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    white-space: nowrap;
  }

  &__donut-center-count {
    // See .wc-smc__footnote above — native <button> reset for the same reason.
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    font-size: 2.5rem;
    font-weight: 700;
    color: #101828;
    line-height: 1.1;
  }

  &__donut-center-sub {
    font-size: 0.9375rem;
    color: #667085;
    text-align: center;
  }
}

.wc-legend {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.125rem;
    color: #344054;
    border-top: 1px solid #e4e7ec;
    padding-top: 0.5rem;
  }

  &__dot {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__label {
    flex: 1;
    font-size: 1.125rem;
  }

  // &__count/&__pct are <span>s, and both now end up nested inside the <div> that
  // Kendo's <Tooltip> renders around its slot content (not direct flex children of
  // .wc-legend__item) — `width`/`flex-shrink` have no effect on a plain inline
  // element, so each span was actually sizing to its own text's natural width
  // instead of the fixed column width below (visible as e.g. "0" landing to the
  // left of where "36"/"55" happen to sit, since 1-digit text is narrower than
  // 2-digit text). `inline-block` makes the span itself a box that honors
  // width/text-align, regardless of whether its parent is a flex item or not.
  &__count {
    // Native <button> reset — see .wc-smc__footnote above for why.
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    display: inline-block;
    font-weight: 600;
    color: #101828;
    width: 3.5rem;
    flex-shrink: 0;
    text-align: right;
    font-size: 1.125rem;
  }

  &__pct {
    display: inline-block;
    color: #667085;
    width: 3.25rem;
    flex-shrink: 0;
    text-align: right;
    font-size: 1.125rem;
    white-space: nowrap;
  }

  &__pct-spacer {
    display: inline-block;
    width: 3.25rem;
    flex-shrink: 0;
  }

  &__total {
    .wc-legend__label,
    .wc-legend__count {
      font-weight: 600;
    }
  }
}
</style>
