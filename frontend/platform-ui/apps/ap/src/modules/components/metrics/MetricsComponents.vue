<template>
<div class="card-metrics">
  <div class="card-body d-flex flex-column"><span class="text-base font-semibold text-gray-700 mb-2">{{ titleSection }}</span>
    <div class="d-flex gap-2" v-if="loadingGroups && !loading">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
    </div>
    <div class="row mb-1" v-if="!loadingGroups && !loading">
      <div class="col-10 d-flex align-items-center">
        <div class="col-xl-4">
          <div class="form-group">
            <label for="select-group">
              <select class="form-control" id="select-group" v-if="metricsGroups.length > 0 && !loadingGroups" v-model="groupSelected" @change="activeGroup(groupSelected)">
                <option v-for="(metric, index) in metricsGroupsComputed" :key="index" :value="metric.groupName">{{ $t('global.metricCategories.' + metric.groupName) }}</option>
              </select><span>{{ $t('global.selectValue') }}</span>
            </label>
          </div>
        </div>
        <div class="col-xl-4">
          <div class="form-group">
            <label for="select-metric">
              <select class="form-control" id="select-metric" v-model="selectedChart" @change="setSelectedChart()">
                <option v-for="chartMetricName in chartsbyGroup" :key="chartMetricName.name" :value="chartMetricName.name" v-if="chartsbyGroup">{{ (chartMetricName.translation) ? chartMetricName.translation : $t('global.metricOptions.' + chartMetricName.name) }}</option>
              </select><span>{{ $t('global.selectMetric') }}</span>
            </label>
          </div>
        </div>
      </div>
      <div class="col-2 d-flex flex-column align-items-center" v-if="showCreditRatingComputed"><span class="text-sm">{{ companyCreditUltimateParentName }}</span><span class="text-sm">{{ $t('global.creditRating') }}</span><span class="text-xl font-bold">{{ companyCreditRating }}</span></div>
    </div>
    <div class="d-flex flex-column select-dropdown-container mt-2">
      <div class="col-xl-12 col-lg-12 d-flex flex-column justify-content-end container-metrics-charts">
        <div class="d-flex flex-column justify-content-center" v-if="loadingData" style="height: auto">
          <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '95%', height: '55px' }"></Skeleton>
          <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '85%', height: '55px' }"></Skeleton>
          <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '75%', height: '55px' }"></Skeleton>
          <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '50%', height: '55px' }"></Skeleton>
        </div>
        <div class="d-flex flex-column align-items-center justify-content-center" v-else-if="!loadingData && noDataSeriesAvailable" style="height: 550px">
          <h3 class="text-center">{{ $t('global.noDataAvailable') }}</h3><span class="text-base font-semibold text-gray-700 mb-1">{{ $t('global.noDataAvailableDescription') }}</span>
        </div>
        <HorizontalBarChart v-else-if="!loadingData && chartTypeToshow === 'horizontal_bar' && !noDataSeriesAvailable" :key="'horizontalBarChart-' + keyMetricsComponent" chartTitle="" :xAxisTitle="currentSelectedChart.xAxisTitle" :yAxisTitle="currentSelectedChart.yAxisTitle" :dataFirstSeries="dataSeries" :categoriesData="dataCategories" :isBigNumber="dataIsBigNumber" :chartType="selectedChartType" :section="section" @on-event-click="clickingOnCharts"></HorizontalBarChart>
        <VerticalBarChart v-if="!loadingData && chartTypeToshow === 'vertical_bar' && !noDataSeriesAvailable" :key="'verticalBarChart-' + keyMetricsComponent" chartTitle="" :xAxisTitle="currentSelectedChart.xAxisTitle" :yAxisTitle="currentSelectedChart.yAxisTitle" :dataFirstSeries="dataSeries" :categoriesData="dataCategories" :isBigNumber="dataIsBigNumber" :chartType="selectedChartType" :section="section" @on-event-click="clickingOnCharts"></VerticalBarChart>
        <PieChart v-else-if="!loadingData && chartTypeToshow === 'pie' && !noDataSeriesAvailable" :key="'pieChart-' + keyMetricsComponent" chartTitle="" :dataPieSeries="dataSeries" :dataPieCategories="dataCategories" :isBigNumber="dataIsBigNumber" @on-event-click="clickingOnCharts"></PieChart>
        <GeoChart class="mt-4" v-if="!loadingData && chartTypeToshow === 'world_map'" :key="'spendPerCountry-' + geoKey" chart-name="spendPerCountry" :data="geoChartRows" :full-bleed-breakpoints="true" @on-event-click="clickingOnCharts"></GeoChart>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import {
  reactive,
  toRefs,
  defineComponent,
  onMounted,
  onBeforeUnmount,
  computed,
  ComputedRef,
  watch,
  ref,
} from "vue";
import { DataInterface } from "@/modules/components/metrics/types";
import { FiltersApplied } from "@/types";
import {
  StringUtils,
  isNullOrUndefined,
  removeIRI,
  NumberUtils,
} from "@/utils";
import { useI18n } from "vue-i18n";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useHomeStore } from "@/stores/home";
import { getNumberWithDecimals } from "@/utils/FormatData";
import * as graphql from "@/utils/graphqlUtils";
import * as Iso36166 from "@/utils/ISO3166-1";
import CarouselTabsMetricGroups from "@/modules/components/metrics/CarouselTabsMetricGroups.vue";
import { GeoChart } from "@ada/design-system";
import type { GeoChartRow } from "@ada/design-system";
import HorizontalBarChart from "@/modules/components/charts/kendo/HorizontalBarChart.vue";
import VerticalBarChart from "@/modules/components/charts/kendo/VerticalBarChart.vue";

import PieChart from "@/modules/components/charts/kendo/PieChart.vue";
import useProgram from "@/modules/home/analyze/composables/useProgram";
import { useUser } from "@/composables";
import { Skeleton } from "@progress/kendo-vue-indicators";
import useSMEFeature from "@/composables/useSMEFeature";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import { useUserStore } from "@/stores/user";

export default defineComponent({
  name: "MetricsComponent",
  components: {
    CarouselTabsMetricGroups,
    GeoChart,
    HorizontalBarChart,
    PieChart,
    Skeleton,
    VerticalBarChart,
  },
  props: {
    programIDForAPI: { type: String, required: false, default: null },
    section: { type: String, required: true },
    titleSection: { type: String, default: null },
    loading: { type: Boolean, default: false },
    programInrecalculation: { type: Boolean, default: false },
    customHeightChart: { type: String, default: "auto" },
    forRenderKeyComponent: {
      type: Number,
      default: NumberUtils.getRandomInt(),
    },
    showForecastVolume:  { type: Boolean, default: false, required: false },
  },
  emits: ["item-selected"],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const userStore = useUserStore();

    const { user } = useUser();
    const { featureSMEEnabled } = useSMEFeature();
    const { featureCreditRatingEnabled } = useFeatureCreditRating();

    const someItemSelected = ref<any>(null);

    const data = reactive<DataInterface>({
      chartsbyGroup: [],
      chartTypeToshow: "",
      currentIndex: 0,
      currentSelectedChart: {
        chartTitle: "",
        xAxisTitle: "",
        yAxisTitle: "",
        dataSeries: [],
        categoriesData: [],
      },
      geoKey: new Date().getUTCMilliseconds(),
      groupSelected: "actualPaymentTerms.",
      isBigNumber: false,
      isDropdownSelected: false,
      loading: false,
      loadingChartData: true,
      loadingGroups: true,
      metricsGroups: [],
      selectedChart: "",
      showPieChart: false,
      globalFilters: { filters: [], logic: "and" },
      place: "",
      view: "",
      getCustomHeightChart: 300,
      chartsLoaded: false,
      keyMetricsComponent: NumberUtils.getRandomInt(),
      creditRating: userStore.getCompany?.creditRating,
      ultimateParentName: userStore.getCompany?.ultimateParentName ?? userStore.getCompany?.name,
    });
    const forRenderKeyComponentComputed = computed(() => {
      return props.forRenderKeyComponent;
    });
    // The parent bumps this when the sibling MetricsComponent emits item-selected, so this chart
    // drops its highlighted bar. Remounting is the only way to clear that highlight, so do it only
    // when something is actually highlighted - otherwise every chart change in the sibling made
    // this chart flicker for nothing.
    watch(
      forRenderKeyComponentComputed,
      () => {
        if (StringUtils.isNullUndefinedOrEmpty(someItemSelected.value)) return;
        someItemSelected.value = null;
        data.keyMetricsComponent++;
      },
    );
    // Resize handler to force geo chart refresh. Responsive sizing itself is owned entirely by
    // GeoChart's own fullBleedBreakpoints CSS now - no window-dimension tracking needed here.
    function handleResize() {
      data.geoKey = NumberUtils.getRandomInt();
    }

    // GeoChart (@ada/design-system) loads Google Charts itself now - this used to await
    // ensureChartsLoaded() first, which only this chart ever needed (confirmed: no other chart in
    // this file reads the 'corechart' package it loaded, and chartsLoaded was set but never read).
    onMounted(() => {
      data.globalFilters = globalFiltersStore.getFiltersApplied;
      getCategoriesData();
      // Add resize listener for geo chart
      window.addEventListener("resize", handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", handleResize);
    });

    function setCustomHeightChart(value: number) {
      data.getCustomHeightChart = value;
    }

    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return featureSMEEnabled.value;
    });

    const creditRatingFeatureEnabled = computed(() => {
      return featureCreditRatingEnabled.value;
    });

    /** calculates the length of the dataSeries array length, if empty, the no data avaiable card is displayed */
    const noDataSeriesAvailable = computed(() => {
      return data.currentSelectedChart.dataSeries.length === 0;
    });

    /**
     * GeoChart (@ada/design-system) builds its own header row now - this drops it (index 0 of
     * dataSeries, from getHeaderRowForGeoMap) and maps each remaining [name, value, tooltip] row
     * to a GeoChartRow, resolving the country name to alpha-2 the same way this always did.
     */
    const geoChartRows = computed<GeoChartRow[]>(() => {
      const [, ...rows] = data.currentSelectedChart.dataSeries;
      return rows.flatMap(([name, value, tooltip]: [string, number, string]) => {
        const code = Iso36166.getCountryCode(name);
        return code ? [{ code, value, tooltip }] : [];
      });
    });

    /**
     * computed dataSeries for the x axis or pie chart values
     */
    const dataSeries = computed(() => {
      return data.currentSelectedChart.dataSeries;
    });

    /**
     * computed dataCategories for the y axis or the label of the pie chart
     */
    const dataCategories = computed(() => {
      // SME only
      if (
        data.groupSelected === "suppliers" &&
        data.selectedChart === "perSME"
      ) {
        // Append value to the end of the the corresponding category item
        return data.currentSelectedChart.categoriesData.map(
          (i: string, idx: number) =>
            `${i} (${getNumberWithDecimals(dataSeries.value[idx], 0)})`,
        );
      }

      return data.currentSelectedChart.categoriesData;
    });

    /**
     * computed dataIsBigNumber for formatting the values in big number format in the bar chart
     */
    const dataIsBigNumber = computed(() => {
      return data.isBigNumber;
    });

    /**
     * determines if the pie chart should be shown
     */
    const showOnlyPieChart = computed(() => {
      return data.showPieChart;
    });

    /**
     * computed loadingData for loadingData from the api response regarding the charts
     */
    const loadingData = computed(() => {
      return data.loadingChartData;
    });

    const selectedChartType = computed(() => {
      return data.currentSelectedChart.xAxisTitle;
    });

    /**
     * Filter categories based on section of the ada platform
     */

    /**
     * Retrieves categories data from the server.
     *
     * @return {void}
     */
    function getCategoriesData(): void {
      // Validate
      if (isNullOrUndefined(user.value)) {
        return;
      }

      if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
        return;
      }

      if (isNullOrUndefined(props)) {
        return;
      }

      const spendFileUUID =
        props.section === "analyze"
          ? user.value.activeSpendFileVersion["@id"]
          : removeIRI(props.programIDForAPI);

      const params = {
        spendFileUUID,
        section: props.section,
        callbackSuccess: (callbackSuccessData: any) => {
          data.metricsGroups = callbackSuccessData;
          if (props.showForecastVolume === false) {
            data.metricsGroups = data.metricsGroups.filter(
              (x) =>
                x.groupName !== "forecastVolume"
            );
          }

          // Guard clause: exit early if no data
          if (!callbackSuccessData?.length) {
            data.groupSelected = "";
            data.chartsbyGroup = [];
            return;
          }

          
          // Set Default group active
          let indexGroup = data.metricsGroups.find(
            (x: any) => x.selected === true,
          );

          data.groupSelected = indexGroup ? indexGroup.groupName : data.metricsGroups[0].groupName;
          data.chartsbyGroup = indexGroup
            ? indexGroup.options
            : data.metricsGroups[0].options;

          data.chartsbyGroup = data.chartsbyGroup
            .filter((item: any) => {
              // Exclude items with name "perCreditRating" if the credit rating feature is disabled
              if (
                !creditRatingFeatureEnabled.value &&
                item.name === "perCreditRating"
              ) {
                return false;
              }

              // Exclude items with name "perSME" if the SME feature is disabled
              if (!smeFeatureEnabled.value && item.name === "perSME") {
                return false;
              }

              // Keep all other items
              return true;
            })
            .sort((a: any, b: any) => {
              return a.name.localeCompare(b.name, "en", {
                sensitivity: "base",
              });
            });

          // Set Default chart active based on props.section
          let index;
          if (props.section === "vCardSecondary") {
            index = data.chartsbyGroup.find(
              (item: any) => item.name === "perAnnualSpendBand",
            );
            // Check if index exists and set selected
            if (index) {
              index.selected = true;
            }
          } else {
            // In the else case, select the first chart as default if no chart is selected
            index = data.chartsbyGroup.find((x: any) => x.selected === true);
            //If perCreditRating was the last option selected, the "index" will be null
          }

          // Ensure a default chart is selected
          let defaultchart = index || data.chartsbyGroup[0];

          data.selectedChart = defaultchart.name;
          data.chartTypeToshow = defaultchart.defaultType;
          data.view = defaultchart.view;
          data.loadingGroups = false;

          if (data.groupSelected === "isSME") {
            clickOnCharts(null);
          }

          postCategoriesData();
        },
        callbackError: () => {},
      };

      homeStore.getCategoriesData(params);
    }

    function isBigNumberCalculate() {
      let needsBigNumber = false;
      data.currentSelectedChart.dataSeries.forEach((item: any) => {
        if (item > 1000 && chartsNeedBigNumber()) {
          needsBigNumber = true;
        }
      });

      return needsBigNumber;
    }

    function chartsNeedBigNumber() {
      const chartsNeedBigNumber = [
        "spendVolume",
        "spendConcentration",
        "cashFlowOpportunity",
        "forecastVolume"
      ];
      if (chartsNeedBigNumber.includes(data.groupSelected)) {
        return true;
      }
      const currentGroup = data.metricsGroups.find(
        (x: any) => x.groupName === data.groupSelected
      );
      if (currentGroup?.numericType === "money") {
        return true;
      }
      return false;
    }

    /**
     * returns the x axis title for the chart
     */
    function getXAxisTitle(group: string) {
      switch (group) {
        case "perBuyingEntity":
        case "perCommodity":
        case "perCountry":
        case "perCreditRating":
        case "perCurrency":
        case "perIndustry":
        case "perNineBoxes":
        case "perProcurementTeam":
        case "perRegion":
        case "perSupplierCompanySize":
        case "perAnnualSpendBand":
        case "perAcceptanceType":
          return translate.t(
            `global.metricsGrid.grouped.${data.selectedChart}.xTitle`,
          );

        case "vCardEnrollment":
        case "vCardAcceptanceProbability":
        case "vCardCashFlowGain":
        case "vCardRebate":
        case "vCardCashFlowEP":
          return translate.t(`global.metricCategories.${group}`);

        case "isSME":
          return translate.t("global.metricsGrid.sme");
        case "cashFlowOpportunity":
          return translate.t(`global.metricsGrid.${group}.xTitle`);
        case "proposedPaymentTerms":
        case "actualPaymentTerms":
          return translate.t(`global.metricsGrid.${group}.xTitle`);
        case "spendVolume":
          return translate.t(`global.metricsGrid.${group}.xTitle`);
        case "suppliers":
          return translate.t(`global.metricsGrid.${group}.xTitle`);
        default:
          return "";
      }
    }

    /**
     * returns the y axis title for the chart
     */
    function getYAxisTitle(group: string, selectedChart: string) {
      //* First find the group
      const indexGroup = data.metricsGroups.find(
        (x: any) => x.groupName === group,
      );

      //* Then find the options by selectedChart
      const indexselectedChart = indexGroup.options.find(
        (x: any) => x.name === selectedChart,
      );

      //* If the chart have the translation, return the translation
      if (indexselectedChart && indexselectedChart.translation) {
        return indexselectedChart.translation;
      }

      //* If not, return the default translation
      return translate.t(`global.metricsGrid.yTitle.${selectedChart}`);
    }

    /**
     * formats the data for the tooltip for geo map tooltip
     */
    function bigNumberFormatForGeoTooltip(value: number) {
      if (value > 1000) {
        return StringUtils.formatBigNumbers(value);
      } else {
        return value;
      }
    }

    /**
     * returns the header row for the geo map, with the tooltip feature
     */
    function getHeaderRowForGeoMap(selectedChart: string) {
      switch (selectedChart) {
        case "actualPaymentTerms":
          return [
            [
              translate.t("global.country"),
              translate.t("global.actualPaymentTerms"),
              { role: "tooltip", type: "string" },
            ],
          ];
        case "spendVolume":
          return [
            [
              translate.t("global.country"),
              translate.t("global.spendVolume"),
              { role: "tooltip", type: "string" },
            ],
          ];
        case "suppliers":
          return [
            [
              translate.t("global.country"),
              translate.t("global.suppliers"),
              { role: "tooltip", type: "string" },
            ],
          ];
        default:
          return [
            [
              translate.t("global.country"),
              translate.t("global.value"),
              { role: "tooltip", type: "string" },
            ],
          ];
      }
    }

    function currentTypeForTooltip(chartType: string) {
      switch (chartType) {
        case "actualPaymentTerms":
          return translate.t("global.actualPaymentTerms") + " : ";
        case "spendVolume":
          return translate.t("global.spendVolume") + " : ";
        case "suppliers":
          return translate.t("global.suppliers") + " : ";
        default:
          return "Value : ";
      }
    }

    /**
     * parsed the data and provides the values for the chart
     */
    function parseDataForChart(callbackSuccessData: any) {
      if (data.chartTypeToshow === "world_map") {
        data.currentSelectedChart.dataSeries = getHeaderRowForGeoMap(
          data.selectedChart,
        );
        callbackSuccessData.forEach((itemValue: any) => {
          data.currentSelectedChart.dataSeries.push([
            Iso36166.getCountryName(itemValue.name),
            itemValue.value,
            currentTypeForTooltip(data.selectedChart) +
              bigNumberFormatForGeoTooltip(itemValue.value),
          ]);
        });

        data.loadingChartData = false;
      } else {
        data.currentSelectedChart.chartTitle = "";
        data.currentSelectedChart.xAxisTitle = getXAxisTitle(
          data.groupSelected,
        );
        data.currentSelectedChart.yAxisTitle = getYAxisTitle(
          data.groupSelected,
          data.selectedChart,
        );
        /** if value is null or undefined , the value is zero */
        const currentGroup = data.metricsGroups.find(
          (x: any) => x.groupName === data.groupSelected
        );
        data.currentSelectedChart.dataSeries = callbackSuccessData.map(
          (itemValue: any) => {
            const rawValue = itemValue.value ?? 0;
            if (currentGroup?.numericType === "days") return Math.round(rawValue);
            return rawValue;
          }
        );

        data.isBigNumber = isBigNumberCalculate();
        data.currentSelectedChart.categoriesData = callbackSuccessData.map(
          (categoryValue: any) => {
            if (
              categoryValue.name !== null &&
              categoryValue.name !== undefined
            ) {
              // For boolean values (like isSME), convert to Yes/No to match grid filter format
              if (typeof categoryValue.name === "boolean") {
                return categoryValue.name ? "Yes" : "No";
              }
              return categoryValue.name;
            } else {
              /**if the category name is not available */
              return translate.t("global.notAvailable");
            }
          },
        );
        data.showPieChart = data.chartTypeToshow === "pie";
        data.loadingChartData = false;
      }
    }

    const filtersApplied: ComputedRef<FiltersApplied> = computed(
      () => globalFiltersStore.getFiltersApplied,
    );

    const filtersAppliedFormattedREST: ComputedRef<string | null> = computed(
      () => {
        return graphql.convertFiltersToREST(filtersApplied.value);
      },
    );

    const { programSelectedId } = useProgram();

    /**
     * this function gets the data for the selected option from the dropdown in Select Metric
     * for analyze, the param for spendFileUUID is activeSpendFileVersion['@id'],
     * for the program, its the programID
     */
    function postCategoriesData() {
      // Validate
      if (isNullOrUndefined(user.value)) {
        return;
      }

      if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
        return;
      }

      const spendFileUUID = user.value.activeSpendFileVersion["@id"];

      if (StringUtils.isNullUndefinedOrEmpty(spendFileUUID)) {
        return;
      }

      // Enable loading
      data.loadingChartData = true;

      const params: {
        spendFileUUID: string;
        groupName: string;
        optionName: string;
        chartType: string;
        section: string;
        programUUID: string | undefined | null;
        fullDisabled: boolean | null;
        globalFilter: string | null;
        place: string;
        view: string;
        callbackSuccess: (callbackSuccessData: any) => void;
        callbackError: () => void;
      } = {
        spendFileUUID,
        groupName: data.groupSelected,
        optionName: data.selectedChart,
        chartType: data.chartTypeToshow,
        section: props.section,
        programUUID:
          programSelectedId.value ?? user.value?.activeProgramDefaultId,
        fullDisabled: props.section === "analyze" ? null : false,
        place: props.section,
        view: data.view,
        globalFilter: filtersAppliedFormattedREST.value,
        callbackSuccess: (callbackSuccessData: any) => {
          parseDataForChart(callbackSuccessData);
        },
        callbackError: () => {
          parseDataForChart([]);
        },
      };

      homeStore.postChartData(params);
    }

    /**
     * selects the chosen chart type and displays the chart
     */
    function setSelectedChart() {
      const defaultchart = data.chartsbyGroup.find(
        (x: any) => x.name === data.selectedChart,
      );
      if (defaultchart !== null || defaultchart !== undefined) {
        data.chartTypeToshow = defaultchart.defaultType;
        data.view = defaultchart.view;
        postCategoriesData();
        clickOnCharts(null);
      }
    }

    /**
     * active group for the tab above the chart
     * default the first value of the available metric options is selected
     * when the user changes the category tab, the same selectedChart will be selected by default
     * unless the the selectedChart option is not available for the selected category
     */
    function activeGroup(group: any) {
      const indexGroup = data.metricsGroups.find(
        (x: any) => x.groupName === group,
      );

      if (!indexGroup) return;

      data.groupSelected = group;
      data.chartsbyGroup = indexGroup.options;

      const indexselectedChart = data.chartsbyGroup.find(
        (x: any) => x.name === data.selectedChart,
      );

      if (!indexselectedChart) {
        const defaultchart =
          data.chartsbyGroup.find((x: any) => x.selected === true) ||
          data.chartsbyGroup[0];

        data.selectedChart = defaultchart.name;
        data.chartTypeToshow = defaultchart.defaultType;
      } else {
        data.chartTypeToshow = indexselectedChart.defaultType;
      }

      const index = data.chartsbyGroup.findIndex(
        (x: any) => x.name === data.selectedChart,
      );
      data.view = index === -1 ? "program" : data.chartsbyGroup[index].view;

      clickOnCharts(null);
      postCategoriesData();
    }

    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid);

    const metricsGroupsComputed = computed(() => {
      let filteredGroups = data.metricsGroups;

      // If SME feature is disabled, filter out 'isSME' groupName
      if (!smeFeatureEnabled.value) {
        filteredGroups = filteredGroups.filter((x) => x.groupName !== "isSME");
      }

      if (hideAverageDaysPaid.value) {
        filteredGroups = filteredGroups.filter((x) => x.groupName !== "actualPaymentTerms");
      }

      return filteredGroups;
    });

    watch(metricsGroupsComputed, (groups) => {
      if (groups.length > 0 && !groups.some((g: any) => g.groupName === data.groupSelected)) {
        data.groupSelected = groups[0].groupName;
        activeGroup(data.groupSelected);
      }
    });

    // `section` was already unused in the body below (the fromOpportunity/fromOpportunityVcard
    // checks read props.section, this component's own prop, not the parameter) - made optional
    // because GeoChart's own on-event-click only ever sends one argument, and TS only surfaced
    // that mismatch once GeoChart moved to a properly typed emit (the untyped Options API
    // `emits: [...]` array the old local GeoChart.vue had never checked argument counts at all).
    const clickingOnCharts = (category: any | null, section?: string) => {
      const fromOpportunity =
        props.section === "program" || props.section === "programSecondary";
      const fromOpportunityVcard =
        props.section === "vCardPrimary" || props.section === "vCardSecondary";
      if (fromOpportunity || fromOpportunityVcard) {
        clickOnCharts(null);
      }
      clickOnCharts(category);
    };
    function clickOnCharts(category: any | null) {
      someItemSelected.value = category;
      if (
        data.groupSelected === "isSME" &&
        StringUtils.isNullUndefinedOrEmpty(category)
      ) {
        emit("item-selected", "suppliers", "perSME", "SME", props.section);
      } else {
        emit(
          "item-selected",
          data.groupSelected,
          data.selectedChart,
          StringUtils.extractPatternFromText(category),
          props.section,
        );
      }
    }

    function clearSelection() {
      clickOnCharts(null);
      data.keyMetricsComponent = NumberUtils.getRandomInt();
      data.geoKey = NumberUtils.getRandomInt();
    }
    const companyCreditRating = computed(() => userStore.getCompany?.creditRating);
    const companyCreditUltimateParentName = computed(() => userStore.getCompany?.ultimateParentName ?? userStore.getCompany?.name);

    const showCreditRatingComputed = computed(() => {
      const conditionByChart = data.selectedChart === "perCreditRating";
      const conditionByValue =
        companyCreditRating.value !== null &&
        companyCreditRating.value !== undefined &&
        companyCreditRating.value !== "";
      return conditionByChart && conditionByValue;
    });

    return {
      ...toRefs(data),
      someItemSelected,
      activeGroup,
      bigNumberFormatForGeoTooltip,
      companyCreditRating,
      companyCreditUltimateParentName,
      creditRatingFeatureEnabled,
      dataCategories,
      dataIsBigNumber,
      dataSeries,
      geoChartRows,
      graphql,
      isBigNumberCalculate,
      loadingData,
      metricsGroupsComputed,
      noDataSeriesAvailable,
      parseDataForChart,
      selectedChartType,
      setCustomHeightChart,
      setSelectedChart,
      showOnlyPieChart,
      smeFeatureEnabled,
      clickOnCharts,
      clickingOnCharts,
      clearSelection,
      StringUtils,
      showCreditRatingComputed,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "@/resources/assets/styles/variables/_colors.scss";

.custom-select {
  max-width: 558px !important;
  padding: 10px 0px 10px 12px;
  font-size: 16px !important;
  color: $color-gray-900 !important;
  border: none;

  option {
    &:hover {
      cursor: pointer;
    }
  }

  option:checked {
    background: $color-gray-50;
  }
}

select option {
  padding: 4em;
}

.carousel {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  overflow: hidden;
}

.carousel-container {
  display: flex;
  transition: transform 0.3s ease-in-out;
  width: 100%;
  padding: 0px 0px;
}

.carousel-track.d-flex {
  width: 100%;
}

.element-outline {
  border: 1px solid $color-gray-300;
  border-radius: 8px;

  &:hover {
    border: 1px solid $color-primary-300 !important;
    box-shadow:
      0px 0px 0px 4px #ffdfe4,
      0px 1px 2px 0px rgba(16, 24, 40, 0.05);
  }
}

.menu-combo-group {
  height: 70px;
}

.card-metrics {
  position: relative;
  border: 1px solid $color-gray-200;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  height: auto;
  flex-flow: column nowrap;
  transition: all 0.3s ease;
  box-shadow: 0 1px 5px $shadow;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
}

.clear-selection-button {
  display: flex;
  height: 50px;
}

.container-metrics-charts {
  position: relative;
}
</style>
