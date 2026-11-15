<template>
<div class="d-flex-flex-column justify-content-between align-items-center mb-8">
  <h1 class="mb-1 font-bold text-base mb-6"><span class="text-gray-700 text-2xl cursor-pointer truncate-title font-semibold">{{ title }}</span></h1>
  <div class="text-left" v-if="totalShow !== ''"><span class="mr-2">{{ `${$t("global.total")} Analyzed` }}:</span><span class="font-bold">{{ totalShowComputed }}</span></div>
</div>
<div class="row">
  <div class="col-12">
    <Chart v-if="!ArrayUtils.isEmpty(reasonForExclusionEntities)" :key="reasonForExclusionEntitiesTracker" :style="{ height: `${reasonForExclusionEntities.length * 50}px; width: 100px` }">
      <ChartCategoryAxis :crosshair="{ visible: false }">
        <ChartCategoryAxisItem :major-grid-lines="{ visible: false }">
          <ChartCategoryAxisTitle :text="`${$t('global.metricCharts.reasonsFullScreen')} (Top ${reasonForExclusionEntities.length})`"></ChartCategoryAxisTitle>
        </ChartCategoryAxisItem>
      </ChartCategoryAxis>
      <ChartValueAxis :crosshair="{ visible: false }">
        <ChartValueAxisItem :major-grid-lines="{ visible: false }" :crosshair="{ visible: false }" :font="'600 10px Inter'" :labels="{ visible:false, visual: getCustomXAxisLabels }" :rotation="'auto'">
          <ChartCategoryAxisTitle :text="getChartAxisLabel()" :margin="25"></ChartCategoryAxisTitle>
          <ChartCategoryAxisLabels v-if="!isBigNumber" :rotation="'auto'" align="center" :margin="10" :font="'600 14px Inter'" :labels="{ content: getLabels }"></ChartCategoryAxisLabels>
        </ChartValueAxisItem>
      </ChartValueAxis>
      <ChartSeries>
        <ChartSeriesItem :category-field="'reason'" :color="chartsGetItemColorMatch('excluded')" :data-items="reasonForExclusionEntities" :field="'amount'" :labels="{ visible: true, visual: convertBigNumber }" :labels-align="'center'" :labels-position="'center'" :spacing="0.5" :type="'bar'" :rotation="'auto'"></ChartSeriesItem>
      </ChartSeries>
    </Chart>
  </div>
</div>
</template>

<script lang="ts">
import { ArrayUtils, FormatData, StringUtils } from '@/utils';
import { computed, defineComponent, PropType } from 'vue';
import {
  Chart,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartCategoryAxisTitle,
  ChartCategoryAxisLabels,
  ChartValueAxisItem,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  ChartValueAxis,
} from "@progress/kendo-vue-charts";
import { Text, Group, geometry } from "@progress/kendo-drawing";
import * as colorsGroups from "@/utils/ColorsGroups";
import { useI18n } from 'vue-i18n';
import { chartsGetItemColorMatch } from '../../components/utils/utilsCharts';
export default defineComponent({
  name: 'DataDisplayComponent',
  components: {
    Chart,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartCategoryAxisTitle,
    ChartLegend,
    ChartSeries,
    ChartSeriesItem,
    ChartValueAxis,
    ChartValueAxisItem, ChartCategoryAxisLabels
  },
  props: {
    reasonForExclusionEntities: {
      type: Array as PropType<Array<{ reason: string, amount: number }>>,
      required: true,
    },
    reasonForExclusionEntitiesTracker: {
      type: Number,
      required: true,
    }, metricSelectionMetricSelected: {
      type: String,
      required: true,
    },
    title: { type: String, required: true, default: '' },
    isBigNumber: { type: Boolean, required: false, default: false },
    totalShow: { type: String, required: true, default: '' }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    function getLabelPointPosition(
      value: number,
      strSize: number,
      origin: any,
      width: number,
    ) {
      return [
        origin.x + (width / 2 - strSize * 2.7) + 4,
        origin.y + (value >= 0 ? 0 : 5),
      ];
    }
    function convertBigNumber(e: any) {
      let val = StringUtils.formatBigNumbers(e.value, {minimumFractionDigits: 1, maximumFractionDigits: 1});
      if (e.value) {
        return new Text(`${val}`, getLabelPointPosition(e.value, val.length, e.rect.origin, e.rect.size.width), {
          font: "500 14px Inter",
          fill: {
            color: colorsGroups.color222222,
          },
        });
      } else {
        return new Text(
          "0",
          getLabelPointPosition(0, 1, e.rect.origin, e.rect.size.width),
          {
            font: "500 14px Inter",
            fill: {
              color: colorsGroups.color222222,
            },
          },
        );
      }
    }
    function getLabelPointForXAxis(
      value: number,
      strSize: number,
      origin: any,
      width: number,
    ) {
      return [
        origin.x + (width / 2 - strSize * 2.7),
        origin.y + (value >= 0 ? -5 : 5),
      ];
    }
    function getCustomXAxisLabels(e: any) {
      let myValue = Number(e.value);
      let val = StringUtils.formatBigNumbers(e.value);
      const centerX = e.rect.origin.x + 5;
      const coordinates = [centerX, e.rect.origin.y - 5]
      if (Number(e.value) >= 1000) {
        const textt = new Text(
          `${StringUtils.formatBigNumbers(myValue)}`,
          getLabelPointForXAxis(
            e.value,
            val.length,
            e.rect.origin,
            e.rect.size.width,
          ),
          {
            font: "600 14px Inter",
            fill: {
              color: colorsGroups.color222222,
            },
          },
        )
        const group = new Group();
        group.append(textt)
        group.transform(geometry.transform().rotate(90, coordinates));
        return group
      } else {
        const textt = new Text(
          `${StringUtils.formatBigNumbers(myValue)}`,
          getLabelPointForXAxis(
            e.value,
            val.length,
            e.rect.origin,
            e.rect.size.width,
          ),
          {
            font: "600 14px Inter",
            fill: {
              color: colorsGroups.color222222,
            },
          },
        )
        return textt
      }
    }
    function getChartAxisLabel() {
      return translate.t(
        `global.metricCharts.title.${props.metricSelectionMetricSelected}`,
      );
    }
    function getLabels(e: any) {
      const centerX = e.rect.origin.x - 20;
      return new Text(
        `${StringUtils.formatBigNumbers(e.value)}`,
        [centerX, e.rect.origin.y - 5],
        {
          font: "600 14px Inter",
          fill: {
            color: colorsGroups.color222222,
          },
        },
      );
    }
    const totalShowComputed = computed(() => {
      if (props.totalShow) {
        const result = props.reasonForExclusionEntities.reduce((a: any, b) => a + b.amount, 0)
        const stringU = StringUtils.formatBigNumbers(Number(result));
        return stringU
      }
      return props.totalShow
    })
    return {
      ArrayUtils, chartsGetItemColorMatch, convertBigNumber, getCustomXAxisLabels, getChartAxisLabel, getLabels, totalShowComputed
    }
  }
});
</script>

<style scoped lang="scss">
.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>