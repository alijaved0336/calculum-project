<template>
<div class="card-metrics">
  <slot name="slotHeader"></slot>
  <div class="card-body d-flex flex-column"><span class="text-base font-semibold text-gray-700 mb-2">{{ titleSection }}</span>
    <div class="d-flex gap-2" v-if="loadingGroups && !loading">
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
      <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '55px' }"></Skeleton>
    </div>
    <div class="row mb-1 pb-4" v-if="!loadingGroups && !loading">
      <div class="col-12 d-flex align-items-center justify-content-between">
        <div class="col-auto d-flex align-items-center">
          <div class="d-flex align-items-center" v-if="metricsGroups.length > 0 && !loadingGroups">
            <button class="btn font-md text-capitalize custom-padding-btn px-2 tab-new" v-for="(metric, index) in metricsGroupsComputed" :key="index" :class="[groupSelected === metric.groupName ? 'btn-clear' : 'btn-clean', index === 0 ? 'rounded-tbr-none' : (index === metricsGroupsComputed.length - 1 ? 'rounded-tbl-none' : 'rounded-tbl-none rounded-tbr-none')]" @click="activeGroup(metric.groupName)">{{ $t('global.metricsNew.' + metric.groupName) }}</button>
          </div>
        </div>
        <div class="col-auto">
          <div class="form-group m-0">
            <label class="m-0" for="select-metric">
              <select class="form-control" id="select-metric" v-model="selectedChart" @change="setSelectedChart()">
                <option v-for="chartMetricName in chartsbyGroup" :key="chartMetricName.name" :value="chartMetricName.name" v-if="chartsbyGroup">{{ setTitles(chartMetricName.name) }}</option>
              </select><span>{{ $t('global.selectMetric') }}</span>
            </label>
          </div>
        </div>
      </div>
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
        <div class="row w-100 d-flex flex-column gap-6" v-else-if="!loadingData && chartTypeToshow === 'horizontal_bar' && !noDataSeriesAvailable">
          <div class="w-100 d-flex align-items-center justify-content-between bar gap-4">
            <div class="bar__title-wrapper">
              <div class="bar__title font-semibold text-gray-500 title">Outstanding</div>
            </div>
            <div class="bar__line">
              <div class="bar__fraction">
                <div class="bar__percent">78%</div>
              </div>
              <div class="bar__fraction bar__fraction--accent" style="width:22%">
                <div class="bar__percent">22%</div>
              </div>
            </div>
          </div>
          <div class="w-100 d-flex align-items-center justify-content-between bar gap-4">
            <div class="bar__title-wrapper">
              <div class="bar__title font-semibold text-gray-500 title"># of Suppliers</div>
            </div>
            <div class="bar__line">
              <div class="bar__fraction">
                <div class="bar__percent">56%</div>
              </div>
              <div class="bar__fraction bar__fraction--accent" style="width:44%">
                <div class="bar__percent">44%</div>
              </div>
            </div>
          </div>
          <div class="w-100 d-flex align-items-center justify-content-between bar gap-4">
            <div class="bar__title-wrapper">
              <div class="bar__title font-semibold text-gray-500 title">Overdue Payments</div>
            </div>
            <div class="bar__line">
              <div class="bar__fraction">
                <div class="bar__percent">93%</div>
              </div>
              <div class="bar__fraction bar__fraction--accent" style="width:7%">
                <div class="bar__percent">7%</div>
              </div>
            </div>
          </div>
          <div class="w-100 d-flex align-items-center justify-content-between bar gap-4">
            <div class="bar__title-wrapper">
              <div class="bar__title font-semibold text-gray-500 title">Cash Flow Opportunity</div>
            </div>
            <div class="bar__line">
              <div class="bar__fraction">
                <div class="bar__percent">88%</div>
              </div>
              <div class="bar__fraction bar__fraction--accent" style="width:31%">
                <div class="bar__percent">31%</div>
              </div>
            </div>
          </div>
        </div>
        <VerticalBarChart v-if="!loadingData && chartTypeToshow === 'vertical_bar' && !noDataSeriesAvailable" :key="'verticalBarChart-' + keyMetricsComponent" chartTitle="" :xAxisTitle="currentSelectedChart.xAxisTitle" :yAxisTitle="currentSelectedChart.yAxisTitle" :dataFirstSeries="dataSeries" :categoriesData="dataCategories" :isBigNumber="dataIsBigNumber" :chartType="selectedChartType" :section="section" @on-event-click="clickingOnCharts"></VerticalBarChart>
        <PieChart v-else-if="!loadingData && chartTypeToshow === 'pie' && !noDataSeriesAvailable" :key="'pieChart-' + keyMetricsComponent" chartTitle="" :dataPieSeries="dataSeries" :dataPieCategories="dataCategories" :isBigNumber="dataIsBigNumber" @on-event-click="clickingOnCharts"></PieChart>
        <GeoChart class="mt-4" v-if="!loadingData && chartTypeToshow === 'world_map'" :key="'spendPerCountry-' + geoKey" :chart-name="'spendPerCountry'" :data="dataSeriesCountry" :options="wordMapOptions" :forMetricsGeo="true" :class="getGeoMetricsMapSize" @on-event-click="clickingOnCharts"></GeoChart>
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
import { StringUtils, isNullOrUndefined, removeIRI, NumberUtils } from "@/utils";
import { useI18n } from "vue-i18n";
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useHomeStore } from '@/stores/home';
import { useUserStore } from '@/stores/user';
import * as formatData from "@/utils/FormatData";
import * as graphql from "@/utils/graphqlUtils";
import * as Iso36166 from "@/utils/ISO3166-1";
import CarouselTabsMetricGroups from "@/modules/components/metrics/CarouselTabsMetricGroups.vue";
import GeoChart from "@/modules/components/charts/GeoChart.vue";
import HorizontalBarChartNew from "@/modules/components/charts/kendo/HorizontalBarChartNew.vue";
import VerticalBarChart from "@/modules/components/charts/kendo/VerticalBarChart.vue";

import PieChart from "@/modules/components/charts/kendo/PieChart.vue";
import useProgram from "@/modules/home/analyze/composables/useProgram";
import { useUser } from "@/composables";
import { Skeleton } from "@progress/kendo-vue-indicators";
import useSMEFeature from "@/composables/useSMEFeature";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import { ensureChartsLoaded } from "@/utils/kendoLoader";


export default defineComponent({
  name: "MetricsComponentNew2",
  components: {
    CarouselTabsMetricGroups,
    GeoChart,
    HorizontalBarChartNew,
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
    customHeightChart: { type: String, default: 'auto' },
    forRenderKeyComponent: { type: Number, default: NumberUtils.getRandomInt() },
  },
  emits: ['item-selected'],
  setup(props, { emit }) {
    const translate = useI18n();
    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const userStore = useUserStore();

    const { user } = useUser();
    const { featureSMEEnabled } = useSMEFeature();
    const { featureCreditRatingEnabled } = useFeatureCreditRating()

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
      globalFilters: { filters: [], logic: 'and' },
      place: "",
      view: "",
      getCustomHeightChart: 300,
      chartsLoaded: false,
      keyMetricsComponent: NumberUtils.getRandomInt()
    });
    const forRenderKeyComponentComputed = computed(() => {
      return props.forRenderKeyComponent
    })
    watch(forRenderKeyComponentComputed, () => {
      data.keyMetricsComponent++
    }, { immediate: true, deep: true })
    // Reactive window dimensions for geo chart resize handling
    const windowWidth = ref(window.innerWidth);
    const windowHeight = ref(window.innerHeight);

    // Resize handler to update reactive dimensions and force geo chart refresh
    function handleResize() {
      windowWidth.value = window.innerWidth;
      windowHeight.value = window.innerHeight;
      // Update geoKey to force GeoChart re-render when screen size changes
      data.geoKey = NumberUtils.getRandomInt();
    }

    // Load charts when component mounts
    onMounted(async () => {
      await ensureChartsLoaded();
      data.chartsLoaded = true;
      data.globalFilters = globalFiltersStore.getFiltersApplied;
      getCategoriesData();
      // Add resize listener for geo chart
      window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
    });

    function setCustomHeightChart(value: number) {
      data.getCustomHeightChart = value;
    }


    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return featureSMEEnabled.value;
    })

    const creditRatingFeatureEnabled = computed(() => {
      return featureCreditRatingEnabled.value;
    })

    /** calculates the length of the dataSeries array length, if empty, the no data avaiable card is displayed */
    const noDataSeriesAvailable = computed(() => {
      return data.currentSelectedChart.dataSeries.length === 0;
    });

    const dataSeriesCountry = computed(() => {
      // Assuming your original data is stored in data.currentSelectedChart.dataSeries
      const originalData = data.currentSelectedChart.dataSeries;

      // Map over the original data and replace country names (starting from index 1) with country codes
      const modifiedData = originalData.map((series) => {
        const countryCode = Iso36166.getCountryCode(series[0]);
        return [countryCode, ...series.slice(1)];
      });

      return modifiedData;
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
          (i: string, idx: number) => `${i} (${formatData.getNumberWithDecimals(dataSeries.value[idx], 0)})`,
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
     * computed wordMapOptions for the word map
     */
    const wordMapOptions = computed(() => {
      return {
        vAxis: { title: "days" },
        legend: { position: "right" },
        colorAxis: { colors: ["#2C3645"] },
        tooltip: { isHtml: true },
      };
    });

    /** returns the class depending on the screen size for the geo map */
    const getGeoMetricsMapSize = computed(() => {
      if (windowWidth.value >= 1728 && windowHeight.value >= 1117) {
        return "large-screen-chart";
      } else if (windowWidth.value >= 1440 && windowHeight.value >= 1024) {
        return "medium-screen-chart";
      } else if (windowWidth.value <= 1280 && windowHeight.value >= 720) {
        return "small-screen-chart";
      }
      return "medium-screen-chart";
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

          // Guard clause: exit early if no data
          if (!callbackSuccessData?.length) {
            data.groupSelected = "";
            data.chartsbyGroup = [];
            return;
          }

          const blockTab = ["proposedPaymentTerms", "cashFlowOpportunity"];

          // Set Default group active
          let indexGroup = callbackSuccessData.find(
            (x: any) => x.selected === true,
          );

          data.groupSelected = indexGroup
            ? indexGroup.groupName
            : callbackSuccessData[0].groupName;

          // Validation for props.programInrecalculation
          if (
            props.programInrecalculation &&
            blockTab.includes(data.groupSelected)
          ) {
            indexGroup = null;
            data.groupSelected = callbackSuccessData[0].groupName;
          }

          data.chartsbyGroup = indexGroup
            ? indexGroup.options
            : callbackSuccessData[0].options;

          data.chartsbyGroup = data.chartsbyGroup.filter((item: any) => {
            // Exclude items with name "perCreditRating" if the credit rating feature is disabled
            if (!creditRatingFeatureEnabled.value && item.name === "perCreditRating") {
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
              return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
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
            clickOnCharts(null)
          }

          postCategoriesData();
        },
        callbackError: () => { },
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
      const chartsNeedBigNumber = ['spendVolume', 'spendConcentration', 'cashFlowOpportunity'];
      if (chartsNeedBigNumber.includes(data.groupSelected)) {
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
        return indexselectedChart.translation
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
        data.currentSelectedChart.dataSeries = callbackSuccessData.map(
          (itemValue: any) => itemValue.value ?? 0,
        );

        data.isBigNumber = isBigNumberCalculate();
        data.currentSelectedChart.categoriesData = callbackSuccessData.map(
          (categoryValue: any) => {
            if (categoryValue.name !== null && categoryValue.name !== undefined) {
              // For boolean values (like isSME), convert to Yes/No to match grid filter format
              if (typeof categoryValue.name === 'boolean') {
                return categoryValue.name ? 'Yes' : 'No';
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
        return formatData.convertFiltersToREST(filtersApplied.value);
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
        const defaultchart = data.chartsbyGroup.find(
          (x: any) => x.selected === true,
        ) || data.chartsbyGroup[0];

        data.selectedChart = defaultchart.name;
        data.chartTypeToshow = defaultchart.defaultType;
      } else {
        data.chartTypeToshow = indexselectedChart.defaultType;
      }

      const index = data.chartsbyGroup.findIndex(
        (x: any) => x.name === data.selectedChart,
      );
      data.view = index === -1 ? 'program' : data.chartsbyGroup[index].view;

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

      // If program is in recalculation, additionally filter out specific groupNames
      if (props.programInrecalculation) {
        filteredGroups = filteredGroups.filter(
          (x) =>
            x.groupName !== "proposedPaymentTerms" &&
            x.groupName !== "cashFlowOpportunity"
        );
      }

      if (hideAverageDaysPaid.value) {
        filteredGroups = filteredGroups.filter((x) => x.groupName !== "actualPaymentTerms");
      }

      return filteredGroups.slice(0, 3); // Limit to first 3 groups
    });

    watch(metricsGroupsComputed, (groups) => {
      if (groups.length > 0 && !groups.some((g: any) => g.groupName === data.groupSelected)) {
        data.groupSelected = groups[0].groupName;
        activeGroup(data.groupSelected);
      }
    });

    // Watch for changes in global filters
    watch(() => globalFiltersStore.getFiltersApplied, (newValue, oldValue) => {
      // Skip if watchers are disabled
      if (globalFiltersStore.getDisableWatchers) {
        return;
      }

      data.globalFilters = newValue;
      postCategoriesData();
    }, { deep: true, immediate: false });

    const clickingOnCharts = (category: any | null, section: string) => {
      const fromOpportunity = props.section === 'program' || props.section === 'programSecondary'
      const fromOpportunityVcard = props.section === 'vCardPrimary' || props.section === 'vCardSecondary'
      if (fromOpportunity || fromOpportunityVcard) {
        clickOnCharts(null)
      }
      clickOnCharts(category)
    }
    function clickOnCharts(category: any | null) {
      someItemSelected.value = category;
      if (data.groupSelected === 'isSME' && StringUtils.isNullUndefinedOrEmpty(category)) {
        emit('item-selected', 'suppliers', 'perSME', 'SME', props.section)
      } else {
        emit('item-selected', data.groupSelected, data.selectedChart, StringUtils.extractPatternFromText(category), props.section)
      }
    }

    function clearSelection() {
      clickOnCharts(null);
      data.keyMetricsComponent = NumberUtils.getRandomInt();
      data.geoKey = NumberUtils.getRandomInt();
    }

    function setTitles(key: any) {

      switch (key) {
        case 'perCountry':
          return 'Per Risk'
        case 'perBuyerCountry':
          return 'Per Supplier Entity Country'
        case 'perBuyerRegion':
          return 'Per Supplier Entity Region'
        case 'perBuyingEntity':
          return 'Per Supplier Entities'
        case 'perSupplierCompanySize':
          return 'Per Buyer Company Size'
        case 'perSupplierFundingCost':
          return 'Per Buyer Financing Rate'
        default:
          return translate.t(
            `global.metricOptions.${key}`,
          );
      }

    }


    return {
      ...toRefs(data),
      someItemSelected,
      activeGroup,
      bigNumberFormatForGeoTooltip,
      creditRatingFeatureEnabled,
      dataCategories,
      dataIsBigNumber,
      dataSeries,
      dataSeriesCountry,
      formatData,
      getGeoMetricsMapSize,
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
      wordMapOptions,
      clickOnCharts, clickingOnCharts,
      clearSelection,
      StringUtils,
      setTitles
    };
  },
});
</script>

<style lang="scss" scoped>
@import "@/resources/assets/styles/variables/_colors.scss";

.bar{
  &__title-wrapper{
    flex:1 0;
    min-width: 100px;
  }
  &__title{

  }
  &__line{
    flex:4 0;
    background-color: #5266eb;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    transition: all 0.3s ease;

    &:hover{
      background-color: #9900ff;

      .bar__fraction--accent{
        background-color: #8e7cc3;
      }
    }
  }

  &__fraction{
    height: 100%;
    border-radius: 8px;
    padding: 1rem;
    position: relative;
    &--accent{
      margin-left: auto;
      background-color: #0ccc80;
      transition: all 0.3s ease;
    }
  }
  &__percent{
    color: #fff;
    font-weight: 600;
  }
}

.btn-clear.px-2{
  padding-inline: 0.5rem !important;
}

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

//FOR THE GEO CHART
.large-screen-chart {
  width: 100%;
  height: 100vh;
}

.medium-screen-chart {
  width: 100%;
  height: 600px;
}

.small-screen-chart {
  width: 100%;
  height: 500px;
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
