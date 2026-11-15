<template>
<div class="chart-container" v-if="hasChartData">
  <Chart :style="{ height: '520px' }">
    <ChartLegend position="bottom"></ChartLegend>
    <ChartTooltip :render="'defaultTooltipRender'">
      <template #defaultTooltipRender="{ props }">
        <div class="tooltip-content" style="padding:6px">
          <template v-if="getTooltipData(props.point?.category)"><strong>{{ getTooltipData(props.point?.category)?.date }}</strong><br/>Contract PT: {{ formatTooltipValue(getTooltipData(props.point?.category)?.contractPT) }}<br/>
            <template v-if="!hideAverageDaysPaid">Avg days paid: {{ formatTooltipValue(getTooltipData(props.point?.category)?.avgDaysPaid) }}<br/></template>PT discount: {{ formatPtDiscount(getTooltipData(props.point?.category)?.ptDiscount) }}<br/>Volume: {{ formatVolume(getTooltipData(props.point?.category)?.volume ?? 0) }}
          </template>
        </div>
      </template>
    </ChartTooltip>
    <!--  CATEGORY AXIS (one axis; crossing values [0, length] => left + right value axes)-->
    <ChartCategoryAxis>
      <ChartCategoryAxisItem :categories="categories" :major-grid-lines-visible="false" :axis-crossing-value="axisCrossingValues"></ChartCategoryAxisItem>
    </ChartCategoryAxis>
    <!--  VALUE AXES: termsAxis = left (purple), volumeAxis = right (blue) – colors match series-->
    <ChartValueAxis>
      <ChartValueAxisItem name="termsAxis" :color="termsAxisColor" :min="termsAxisMin" :max="termsAxisMax" :title="termsAxisTitle" :labels="termsAxisLabels"></ChartValueAxisItem>
      <ChartValueAxisItem name="volumeAxis" :color="volumeAxisColor" :min="volumeAxisMin" :max="volumeAxisMax" :title="volumeAxisTitle" :labels="volumeAxisLabels"></ChartValueAxisItem>
    </ChartValueAxis>
    <!--  SERIES (combo: line + column)-->
    <ChartSeries>
      <ChartSeriesItem type="line" name="Contract PT" :data-items="contractPTData" axis="termsAxis" color="#98a2b3" :line-style="'smooth'" :width="3"></ChartSeriesItem>
      <ChartSeriesItem v-if="!hideAverageDaysPaid" type="line" name="Avg Days Paid" :data-items="avgPaidData" axis="termsAxis" color="#9333EA" :line-style="'smooth'" :width="3"></ChartSeriesItem>
      <ChartSeriesItem type="column" name="Volume" :data-items="spendData" axis="volumeAxis" color="#4A6CF7" :gap="1.5"></ChartSeriesItem>
    </ChartSeries>
  </Chart>
</div>
</template>

<script lang="ts">
import {
  Chart,
  ChartLegend,
  ChartTooltip,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartSeries,
  ChartSeriesItem,
  ChartSeriesLabels,
  ChartSeriesItemTooltip,
} from "@progress/kendo-vue-charts";
import { defineComponent, computed, PropType } from "vue";
import type { PaymentTermsVolumeHistoryAPIResponse } from "@/modules/home/entityCard/types";
import { useUserStore } from "@/stores/user";

const DEFAULT_TERMS_MIN = 0;
const DEFAULT_TERMS_MAX = 60;
const DEFAULT_VOLUME_MIN = 0;
const DEFAULT_VOLUME_MAX = 30;
const DEFAULT_VOLUME_UNIT = "M";

function formatTooltipValue(value: number | null | undefined): string {
  if (value == null) return "—";
  return String(value);
}
function formatPtDiscount(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value}%`;
}
export default defineComponent({
  name: "BarLineChart",
  components: {
    Chart,
    ChartLegend,
    ChartTooltip,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartValueAxis,
    ChartValueAxisItem,
    ChartSeries,
    ChartSeriesItem,
    ChartSeriesLabels,
    ChartSeriesItemTooltip,
  },
  props: {
    chartData: {
      type: Object as PropType<PaymentTermsVolumeHistoryAPIResponse | null>,
      default: null,
    },
  },
  setup(props) {
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)

    const hasChartData = computed(
      () =>
        props.chartData != null &&
        Array.isArray(props.chartData.categories) &&
        props.chartData.categories.length > 0,
    );

    const categories = computed(() => props.chartData?.categories ?? []);

    const axisCrossingValues = computed(() => [0, categories.value.length]);

    const termsAxisColor = "#9333EA";
    const volumeAxisColor = "#4A6CF7";
    const termsAxisTitle = { text: "Payment Terms", color: termsAxisColor };
    const volumeAxisTitle = { text: "Spend Volume", color: volumeAxisColor };
    const termsAxisLabels = { color: termsAxisColor };
    const volumeAxisLabels = { color: volumeAxisColor };

    const termsAxisMin = computed(
      () => props.chartData?.meta?.termsAxisMin ?? DEFAULT_TERMS_MIN,
    );
    const termsAxisMax = computed(() => {
      const metaMax = props.chartData?.meta?.termsAxisMax ?? DEFAULT_TERMS_MAX;
      const contractPT = props.chartData?.series?.contractPaymentTerms ?? [];
      const adp = hideAverageDaysPaid.value ? [] : (props.chartData?.series?.avgDaysPaid ?? []);
      const allTermsValues = [...contractPT, ...adp].filter((v): v is number => typeof v === "number");
      const dataMax = allTermsValues.length > 0 ? Math.max(...allTermsValues) : 0;
      // Add 15% buffer so line markers never clip at the top of the chart
      return Math.ceil(Math.max(metaMax, dataMax) * 1.15);
    });
    const volumeAxisMin = computed(
      () => props.chartData?.meta?.volumeAxisMin ?? DEFAULT_VOLUME_MIN,
    );
    const volumeAxisMax = computed(() => {
      const metaMax = props.chartData?.meta?.volumeAxisMax ?? DEFAULT_VOLUME_MAX;
      const spendValues = (props.chartData?.series?.spendVolume ?? []).filter(
        (v): v is number => typeof v === "number",
      );
      const dataMax = spendValues.length > 0 ? Math.max(...spendValues) : 0;
      // Add 15% buffer so bars never clip at the top of the chart
      return Math.ceil(Math.max(metaMax, dataMax) * 1.15);
    });

    const spendData = computed(
      () => props.chartData?.series?.spendVolume ?? [],
    );
    const avgPaidData = computed(
      () => props.chartData?.series?.avgDaysPaid ?? [],
    );
    const contractPTData = computed(
      () => props.chartData?.series?.contractPaymentTerms ?? [],
    );

    const unitVolume = computed(
      () => props.chartData?.meta?.unitVolume ?? DEFAULT_VOLUME_UNIT,
    );

    interface TooltipRow {
      date: string;
      contractPT: number | null;
      avgDaysPaid: number | null;
      ptDiscount: number | null;
      volume: number;
    }

    function getTooltipData(category: string): TooltipRow | null {
      const d = props.chartData;
      if (!d?.categories?.length) return null;
      const i = d.categories.indexOf(category);
      if (i < 0) return null;
      const dateLabels = d.dateLabels ?? d.categories;
      return {
        date: dateLabels[i] ?? category,
        contractPT: d.series?.contractPaymentTerms?.[i] ?? null,
        avgDaysPaid: d.series?.avgDaysPaid?.[i] ?? null,
        ptDiscount: d.series?.ptDiscount?.[i] ?? null,
        volume: d.series?.spendVolume?.[i] ?? 0,
      };
    }

    function formatVolume(value: number): string {
      return `${value}${unitVolume.value}`;
    }
    /* For use in future user cases
    function handleBarClick(e: unknown): void {
      console.log(e);
    }
*/
    return {
      hasChartData,
      hideAverageDaysPaid,
      categories,
      axisCrossingValues,
      termsAxisColor,
      volumeAxisColor,
      termsAxisTitle,
      volumeAxisTitle,
      termsAxisLabels,
      volumeAxisLabels,
      termsAxisMin,
      termsAxisMax,
      volumeAxisMin,
      volumeAxisMax,
      spendData,
      avgPaidData,
      contractPTData,
      getTooltipData,
      formatTooltipValue,
      formatPtDiscount,
      formatVolume,
    };
  },
});
</script>

<style scoped>
.chart-container {
  width: 100%;
}

.k-chart {
  font-family: Inter, Arial, sans-serif;
}
</style>
