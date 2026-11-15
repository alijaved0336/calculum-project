<template>
<CalculumLoading v-if="loadingCompanies || loadingCharts" :modal="true"></CalculumLoading>
<CalculumShowListCompanies v-if="showModalForCompanies" :comparePeersList="comparePeersList" @close="showModalForCompanies = !showModalForCompanies" @add-all-companies="addAllCompanies" @resetPeers="postComparePeersReset"></CalculumShowListCompanies>
<CalculumLayout :containerClass="'compare-sections'">
  <template v-slot:slotTop>
    <div class="row">
      <div class="col-12 d-flex justify-content-between">
        <div class="d-flex align-items-center justify-content-end">
          <div class="header-title text-2xl font-semibold mr-3">{{ $t('home.compare.title') }}</div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="d-flex alert-20-peers alert alert-warning-custom fade show" id="alert20Peers" v-if="showAlert20Peers"><img class="icon-svg-warning" :src="fontIcons.alertIcon"/><span>{{ 'Maximum of 20 peers allowed in the chart.' }}</span>
        <button class="close" type="button" data-dismiss="alert" aria-label="Close" @click="showAlert20Peers = !showAlert20Peers"><span aria-hidden="true">× </span></button>
      </div>
      <div class="row w-100 mb-8 center-elements-flex w-100">
        <div :class="screenWidth ? 'col-12 dropdown-options' : 'col-6 dropdown-options'">
          <div class="d-flex w-100 metrics-dropdown-section gap-1">
            <CalculumDropdownOptions :selectedChart="selectedChart" :listOptions="charts" :widthDropdownPercent="'47%'" :topTitle="$t('global.selectChart')" @selectMetricDropdown="changeMetric">                   </CalculumDropdownOptions>
            <CalculumTooltipIcon class="mt-4" :advancedTooltipClass="true" :uniqueIdentifier="'popover-compare-dropdown'" :keyPopOver="selectedChart" :key="tooltipKey">        </CalculumTooltipIcon>
            <CompareDropdownOptions :selectedChart="selectedChart" :listOptions="charts" :chartOptionsAvailable="chartOptionsAvailable" :widthDropdownPercent="'47%'" @selectMetricDropdown="changeMetric" @resetChanges="resetChartOptionsAvailable" @applyChanges="closeDropdownAndMakeActions"> </CompareDropdownOptions>
          </div>
        </div>
        <div v-if="selectedChart === 'lastDso' || selectedChart === 'lastC2c' || selectedChart === 'dpoComparison' || selectedChart === 'lastCfi' && !allYearsNotAvailable" :class="screenWidth ? 'col-12 mt-4 add-padding-sliders dropdown-options' : 'col-6 dropdown-options'">
          <div class="d-flex flex-column"><span class="select-font-text">{{ $t('home.compare.charts.selectYear') }}            </span>
            <div class="custom-range-slider-container">
              <Slider class="custom-slider default-slider" @click="onChangeSliderYear" v-model="selectedYear" :value="selectedYear" :buttons="false" :default-value="selectedYear" :min="startYearStep" :max="endYearStep" :step="stepCountForInput" :drag-handle="'tick'">
                <SliderLabel v-for="(year, index) in yearsForTheRange" :position="year.year" @click="changeYearValue(year.year)">
                  <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"> <span class="year-timeline custom_cursor_pointer" :title="year.hide ? $t('global.notAvailable') : year.year" :class="[selectedYear.toString() === year.year.toString() ? 'year-selected' : 'year']">{{ year.year }} </span></Tooltip>
                </SliderLabel>
              </Slider>
            </div>
          </div>
        </div>
        <div v-if="selectedChart === 'lastDpoYears' || selectedChart === 'lastDsoYears' || selectedChart === 'lastC2cYears' && !allYearsNotAvailable" :class="screenWidth ? 'col-12 mt-4 add-padding-sliders dropdown-options' : 'col-6 dropdown-options'">
          <div class="d-flex flex-column"><span class="select-font-text">{{ $t('home.compare.charts.selectYearRange') }}</span>
            <div class="custom-range-slider-container">
              <RangeSlider class="custom-slider default-range-slider" @change="onChangeSliderYearRange" :buttons="false" :default-value="{ start: rangeObj.start, end: rangeObj.end }" :value="{ start: rangeObj.start, end: rangeObj.end }" :min="startYearStep" :max="endYearStep" :step="stepCountForInput">
                <SliderLabel v-for="year in lastYears" :position="year">
                  <Tooltip class="ellipsis" :open-delay="100" :anchor-element="'target'" :position="'bottom'"> <span class="year-timeline" :title="year.toString()" :class="[rangeObj.start === year ? 'year-selected' : 'year', rangeObj.end === year ? 'year-selected' : 'year']">{{ year }}</span></Tooltip>
                </SliderLabel>
              </RangeSlider>
            </div>
          </div>
        </div>
        <div class="col-12 w-100 card card-no-data mt-4" v-if="!showTableFullScreen && allYearsNotAvailable">
          <div class="d-flex align-items-center justify-content-center mt-3">
            <div class="d-flex flex-column justify-content-center no-data-container">
              <h3 class="text-center">{{ $t('home.compare.charts.noDataAvailable') }} </h3>
              <p class="p-3" v-if="userIsAdmin || userIsSuperAdmin">{{ $t('home.compare.charts.noDataAvailableInfo') }}</p>
              <p class="p-3" v-else>{{ $t('home.compare.charts.noDataAvailableInfoNoAdmins') }}</p>
            </div>
          </div>
        </div>
        <div class="col-12 w-100 mt-4" v-else>
          <div class="widget">
            <VerticalBarChart v-if="!showTableFullScreen && selectedChart === 'dpoComparison' && !hideChart" chartTitle="" :xAxisTitle="'Days'" :yAxisTitle="''" :dataFirstSeries="chartData.dpoComparison.map((item: [string, number]) => item[1])" :categoriesData="chartData.dpoComparison.map((item: [string, number]) => item[0])" :isBigNumber="false" :chartType="'Days'" :selectedChart="selectedChart" :key="'dpoComparison-' + chartKey"></VerticalBarChart>
            <LineBarChart v-if="!showTableFullScreen && selectedChart === 'lastDpoYears' && chartData.lastDpoYears?.length > 0 && !allYearsNotAvailable && !hideChart" :rows="chartData.lastDpoYears" :columns="chartLineColumns" :yAxisTitle="'Days'" :key="'developmentDpo' + chartKey"></LineBarChart>
            <VerticalBarChart v-if="!showTableFullScreen && selectedChart === 'lastDso' && !hideChart" chartTitle="" :xAxisTitle="'Days'" :yAxisTitle="''" :dataFirstSeries="chartData.lastDso.map((item: [string, number]) => item[1])" :categoriesData="chartData.lastDso.map((item: [string, number]) => item[0])" :isBigNumber="false" :chartType="'Days'" :selectedChart="selectedChart" :key="'lastDso-' + chartKey"></VerticalBarChart>
            <LineBarChart v-if="!showTableFullScreen && selectedChart === 'lastDsoYears' && chartData.lastDsoYears?.length > 0 && !allYearsNotAvailable && !hideChart" :rows="chartData.lastDsoYears" :columns="chartLineColumns" :yAxisTitle="'Days'" :key="'lastDsoYears' + chartKey"></LineBarChart>
            <VerticalBarChart v-if="!showTableFullScreen && selectedChart === 'lastC2c' && !hideChart" chartTitle="" :xAxisTitle="'Days'" :yAxisTitle="''" :dataFirstSeries="chartData.lastC2c.map((item: [string, number]) => item[1])" :categoriesData="chartData.lastC2c.map((item: [string, number]) => item[0])" :isBigNumber="false" :chartType="'Days'" :selectedChart="selectedChart" :key="'lastC2c-' + chartKey"></VerticalBarChart>
            <LineBarChart v-if="!showTableFullScreen && selectedChart === 'lastC2cYears' && chartData.lastC2cYears?.length > 0 && !allYearsNotAvailable && !hideChart" :rows="chartData.lastC2cYears" :columns="chartLineColumns" :yAxisTitle="'Days'" :key="'lastC2cYears' + chartKey"></LineBarChart>
            <VerticalBarChart v-if="!showTableFullScreen && selectedChart === 'lastCfi' && !hideChart" chartTitle="" :xAxisTitle="'Cash Flow'" :yAxisTitle="''" :dataFirstSeries="chartData.cashFlowImpact.map((item: [string, number]) => item[1])" :categoriesData="chartData.cashFlowImpact.map((item: [string, number]) => item[0])" :isBigNumber="true" :chartType="'Days'" :selectedChart="selectedChart" :key="'lastCfi-' + chartKey"></VerticalBarChart>
            <CustomChartLegend v-if="showLegend" :legendItems="homeCompareLegendItems"></CustomChartLegend>
          </div>
        </div>
        <div class="col-12 w-100 mt-4" v-if="!loadingCompanies && !loadingCharts">
          <div class="widget" v-if="showGrid">
            <div class="d-flex w-100 justify-content-between align-items-center mb-2"><span class="text-base font-bold ml-4">{{ $t('global.selectCompaniesForChartData') }}</span>
              <button class="btn outline-secondary-btn font-md mr-4" v-if="isAnAdmin" style="z-index: 1; width: fit-content" @click="showModalForCompanies = !showModalForCompanies">{{ 'Edit Peers' }}</button>
            </div>
            <div class="col-12">
              <ListCompare :listOfCompaniesData="gridDataColumnsComputed" :selectedChart="selectedChart" :startYearCompareGrid="startYearCompareGrid" :endYearCompareGrid="endYearCompareGrid" :acronymChart="acronymChart" :key="gridKey" :selectable="true" @editPeers="showModalForListCompanies(false)" @resetPeers="resetSelectedCompanies" @select-row="changeCompaniesStatus" @selectAllRow="selectAllRow"></ListCompare>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">

import { RangeSlider, Slider, SliderLabel } from '@progress/kendo-vue-inputs'
import { reactive, toRefs, defineComponent, computed, ref, watch, onMounted } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'
import { fontIcons } from '@/resources/assets/assets'
import * as formatData from '@/utils/FormatData'
import { CalculumLoading, CalculumLayout } from '@ada/design-system'
import CalculumShowListCompanies from '@/modules/components/CalculumShowListCompanies.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import VerticalBarChart from '@/modules/components/charts/kendo/VerticalBarChart.vue'
import LineBarChart from '@/modules/components/charts/kendo/LineBarChart.vue'
import ListCompare from '@/modules/home/compare/components/ListCompare.vue'
import { useUser, useModuleCompare } from "@/composables";
import { ObjectUtils, StringUtils } from "@/utils";
import CalculumDropdownOptions from '@/modules/home/components/CalculumDropdownOptions.vue'
import CompareDropdownOptions from '@/modules/home/components/CompareDropdownOptions.vue'
import { CustomChartLegend } from '@ada/design-system'
import { useUserStore } from '@/stores/user'
import { useCompareStore } from '@/stores/compare'
import * as HomeRouting from "@/modules/home/HomeRouting";

export default defineComponent({
  name: 'HomeCompare',
  components: { CalculumLoading, CustomChartLegend, CalculumShowListCompanies, RangeSlider, Slider, SliderLabel, Tooltip, CalculumLayout, CalculumTooltipIcon, VerticalBarChart, LineBarChart, ListCompare, CalculumDropdownOptions, CompareDropdownOptions},
  setup() {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const userStore = useUserStore()
    const compareStore = useCompareStore()
    document.title = translate.t('home.compare.title')
    const { moduleCompareIsAvailable } = useModuleCompare()

    interface HomeCompare {
      companyName: string,
      chartKey: number,
      gridKey: number,
      charts: Array<any>,
      chartData: {
        dpoComparison: Array<[string, number]>,
        lastDpoYears: Array<any>,
        lastDso: Array<[string, number]>,
        lastDsoYears: Array<any>,
        lastC2c: Array<any>,
        lastC2cYears: Array<any>,
        lastPaymentTerms: Array<any>,
        cashFlowImpact: Array<[string, number]>
      },
      chartOptions: any,
      chartLineColumns: any,
      selectedChart: string,
      showPeriods: boolean,
      selectedStartYear: number,
      selectedEndYear: number,
      chartOptionsAvailable: any,
      showChartOptions: boolean,
      chartErrorMessage: Array<string>,
      hideChart: boolean,
      selectedTermDays: number,
      selectedSingleCompany: Array<any>,
      loading: boolean,
      optionNames: Array<any>,
      selectedYear: number,
      showTableFullScreen: boolean,
      startYearStep: number,
      endYearStep: number,
      hideSelectedYearChart: boolean,
      perCompanyHasChartInfo: boolean,
      hideSelectedChart: boolean,
      stepCountForInput: number,
      selectedStartYearRange: number,
      selectedEndYearRange: number,
      rangeObj: {
        start: number,
        end: number
      },
      yearsForTheRange: Array<any>,
      noDataAvailableForAllYears: boolean,
      rangeForYearsDefault: number,
      endYearByDefault: number,
      allYearsNotAvailable: boolean,
      currentYearsForSelectedChart: Array<any>,
      currentYearKeys: Array<any>,
      listOfCompaniesData: Array<any>,
      showModalForCompanies: boolean,
      loadingDataForGrid: boolean,
      selectedCompaniesArray: Array<any>,
      hasOwnCompanyButNoOtherCompaniesToCompare: boolean,
      loadingCharts: boolean,
      loadingCompanies: boolean,
      companiesAreAvailable: boolean,
      maximumCompaniesReached: boolean,
      maximumCompaniesReachedPaymentTerms: boolean,
      countForCompanies: number,
      storedCompanies: Array<any>,
      limitNumberOfCompanies: number,
      countForCompaniesForPaymentTerms: number,
      limitNumberOfCompaniesForPaymentTerms: number,
      lastPaymentTermsNotAvailable: boolean,
      forLastPaymentTermsValue: boolean,
      companiesAlreadySelectedForPaymentTerms: boolean
      listOfCompaniesForPaymentTerms: Array<any>,
      companySelected: boolean,
      tooltipKey: number,
      startYearCompareGrid: number,
      endYearCompareGrid: number
      comparePeersList: Array<any>,
      fullDatalastDso: Array<any>,
      fullDatalastC2c: Array<any>
      fullDatadpoComparison: Array<any>,
      fullDatalastDpoYears: Array<any>,
      fullDatalastDsoYears: Array<any>,
      fullDatalastC2cYears: Array<any>,
      fullDataCfi: Array<any>,
      acronymChart: string,
      showGrid: boolean,
      screenWidth: boolean,
      showAlert20Peers: boolean
    }

    const { userIsAdmin, userIsSuperAdmin } = useUser();


    const isAnAdmin = ref(userIsAdmin.value || userIsSuperAdmin.value)

    const homeCompare = reactive<HomeCompare>({
      companyName: userStore.getCompanyName,
      chartKey: new Date().getUTCMilliseconds(),
      gridKey: new Date().getUTCMilliseconds(),
      charts: [
        { title: translate.t('home.compare.charts.dpoComparison'), value: 'dpoComparison' },
        { title: translate.t('home.compare.charts.lastDpoYears'), value: 'lastDpoYears'},
        { title: translate.t('home.compare.charts.lastDso'), value: 'lastDso'},
        { title: translate.t('home.compare.charts.lastDsoYears'), value: 'lastDsoYears'},
        { title: translate.t('home.compare.charts.lastC2c'), value: 'lastC2c'},
        { title: translate.t('home.compare.charts.lastC2cYears'), value: 'lastC2cYears'},
        { title: translate.t('home.compare.charts.lastCfi'), value: 'lastCfi'},
      ],
      chartData: {
        dpoComparison: [],
        lastDpoYears: [],
        lastDso: [],
        lastDsoYears: [],
        lastC2c: [],
        lastC2cYears: [],
        lastPaymentTerms: [],
        cashFlowImpact: []
      },
      chartOptions: {},
      chartLineColumns: [],
      selectedChart: 'dpoComparison',
      showPeriods: false,
      selectedStartYear: getStartYear('lastDpoYears'),
      selectedEndYear: getEndYear('lastDpoYears'),
      chartOptionsAvailable: getChartOptionsAvailable(),
      showChartOptions: false,
      chartErrorMessage: [],
      hideChart: true,
      selectedTermDays: 180,
      selectedSingleCompany: [],
      loading: false,
      optionNames: ['averageRegion', 'peerGroupAverage', 'peerGroupFirstQuartile', 'peerGroupThirdQuartile', 'peerGroupMin', 'peerGroupMedian', 'peerGroupMax', 'averageIndustry', 'averageCountry'],
      selectedYear: new Date().getFullYear() - 1,
      showTableFullScreen: false,
      startYearStep: new Date().getFullYear() - 5,
      endYearStep: new Date().getFullYear() - 1,
      selectedStartYearRange: new Date().getFullYear() - 5,
      selectedEndYearRange: new Date().getFullYear() - 1,
      hideSelectedYearChart: false,
      perCompanyHasChartInfo: false,
      hideSelectedChart: false,
      stepCountForInput: 1,
      rangeObj: {
        start: getStartYearRange(),
        end: getLastYearRange()
      },
      yearsForTheRange: [],
      noDataAvailableForAllYears: false,
      rangeForYearsDefault: new Date().getFullYear() - 5,
      endYearByDefault: new Date().getFullYear() - 1,
      allYearsNotAvailable: false,
      currentYearsForSelectedChart: [],
      currentYearKeys: [],
      listOfCompaniesData: [],
      showModalForCompanies: false,
      loadingDataForGrid: true,
      selectedCompaniesArray: [],
      hasOwnCompanyButNoOtherCompaniesToCompare: false,
      loadingCharts: false,
      loadingCompanies: true,
      companiesAreAvailable: false,
      maximumCompaniesReached: false,
      maximumCompaniesReachedPaymentTerms: false,
      countForCompanies: 0,
      countForCompaniesForPaymentTerms: 0,
      storedCompanies: compareStore.getAddedCompanies,
      limitNumberOfCompanies: 20,
      limitNumberOfCompaniesForPaymentTerms: 1,
      lastPaymentTermsNotAvailable: false,
      forLastPaymentTermsValue: false,
      companiesAlreadySelectedForPaymentTerms: false,
      listOfCompaniesForPaymentTerms: [],
      companySelected: false,
      tooltipKey: new Date().getUTCMilliseconds(),
      startYearCompareGrid: new Date().getFullYear() - 5,
      endYearCompareGrid: new Date().getFullYear() - 1,
      comparePeersList: [],
      fullDatalastDso: [],
      fullDatalastC2c: [],
      fullDataCfi: [],
      fullDatadpoComparison: [],
      fullDatalastDpoYears: [],
      fullDatalastDsoYears: [],
      fullDatalastC2cYears: [],
      acronymChart: "",
      showGrid: false,
      screenWidth: false,
      showAlert20Peers: false
    })


    function setClassBasedOnWidth() {
      const screenW = window.innerWidth;

      if (screenW <= 1350) {
        homeCompare.screenWidth = true
      } else {
        homeCompare.screenWidth = false
      }
    }

    // Llama a la función cuando la página cargue
    window.onload = setClassBasedOnWidth;

    // Llama a la función cuando la ventana cambie de tamaño (opcional)
    window.onresize = setClassBasedOnWidth;



    function validateYears(data: any) {
      homeCompare.hasOwnCompanyButNoOtherCompaniesToCompare = false
      let countForNullYears = 0
      homeCompare.yearsForTheRange = []
      // let countOfValues = Object.values(data).length
      homeCompare.currentYearsForSelectedChart = Object.values(data).map((year: any) => year)

      Object.values(data).forEach(function (item: any, index: any) {
        let hideSelectedYearChart = false
        // if (!item.global.peerGroupAverage && !item.global.peerGroupFirstQuartile && !item.global.peerGroupMax && !item.global.peerGroupMedian && !item.global.peerGroupThirdQuartile) {
        // hideSelectedYearChart = true
        // countForNullYears += 1          
        // }
        homeCompare.yearsForTheRange.push({ year: getCalculatedYear() + index, hide: hideSelectedYearChart })
      })

      // if ((countOfValues) === countForNullYears) {
      //   homeCompare.allYearsNotAvailable = true
      // } else {
      homeCompare.allYearsNotAvailable = false
      // }
    }

    function getCalculatedYear() {
      return homeCompare.startYearStep
    }


    function closeDropdownAndMakeActions() {
      homeCompare.showChartOptions = false
      getDataForCharts()
    }

    function changeYearValue(year: any) {

      homeCompare.selectedYear = year
      onChangeYear()
    }

    function getStartYearRange() {
      return new Date().getFullYear() - 5
    }
    function getLastYearRange() {
      return new Date().getFullYear() - 1
    }

    onMounted(() => {
      if (!moduleCompareIsAvailable.value) {
        HomeRouting.openHome();
      }
      
      homeCompare.selectedYear = new Date().getFullYear() - 1
      getComparePeers()
      getCompareGrid()
    })


    function changeMetric(newMetric: string) {
      homeCompare.selectedChart = newMetric
      homeCompare.hideChart = true
      getCompareGrid()
    }

    function showModalForListCompanies(forLastPaymentTerms: boolean) {
      homeCompare.forLastPaymentTermsValue = false
      homeCompare.showModalForCompanies = true

    }

    function updateTheSelectedValuesInArray() {
      homeCompare.listOfCompaniesData.forEach(item1 => {
        homeCompare.storedCompanies.forEach(item2 => {
          if (StringUtils.removeIRI(item1.id) === StringUtils.removeIRI(item2.id)) {
            item1.selected = true;
          }
        })
      })

      //Print in the first position in the grid the selected companies
      homeCompare.listOfCompaniesData.sort((a, b) => {
        if (a.selected === b.selected) {
          return 0;
        } else if (a.selected) {
          return -1;
        } else {
          return 1;
        }
      });

    }



    /** new api calls */

    function addAllCompanies(companies: any) {
      homeCompare.showModalForCompanies = false
      homeCompare.hideChart = true


      const parseData: any = []
      companies.forEach(function (config: any) {
        parseData.push(config.id)
      })
      homeCompare.loadingCompanies = true
      homeCompare.loadingCharts = true

      const params = {
        companies: parseData,
        callbackSuccess: (callbackSuccessData: any) => {

          homeCompare.fullDatalastDso = []
          homeCompare.fullDatalastC2c = []
          homeCompare.fullDatadpoComparison = []
          homeCompare.fullDatalastDpoYears = []
          homeCompare.fullDatalastDsoYears = []
          homeCompare.fullDatalastC2cYears = []

          getComparePeers()
          getCompareGrid()
        },
        callbackError: () => {
          getComparePeers()
          getCompareGrid()
        }
      }
      compareStore.postComparePeers(params)
    }

    function postComparePeersReset() {

      homeCompare.loadingCompanies = true
      homeCompare.loadingCharts = true
      homeCompare.showModalForCompanies = false
      homeCompare.hideChart = true

      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.fullDatalastDso = []
          homeCompare.fullDatalastC2c = []
          homeCompare.fullDatadpoComparison = []
          homeCompare.fullDatalastDpoYears = []
          homeCompare.fullDatalastDsoYears = []
          homeCompare.fullDatalastC2cYears = []


          getComparePeers()
          getCompareGrid()
        },
        callbackError: () => {
          getComparePeers()
        }
      }
      compareStore.postComparePeersReset(params)
    }


    function getComparePeers() {
      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.comparePeersList = callbackSuccessData
        },
        callbackError: () => {
          homeCompare.comparePeersList = []
        }
      }
      compareStore.getComparePeers(params)
    }


    function getCompareGrid() {

      homeCompare.loadingCompanies = true
      const params = {
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        metric: homeCompare.selectedChart,
        companies: [],
        callbackSuccess: (callbackSuccessData: any) => {

          homeCompare.companiesAreAvailable = callbackSuccessData?.length > 0

          const parsedData: Array<any> = [];
          callbackSuccessData.forEach((node: any) => {
            const data = Object.assign({}, node);
            data.id = node.companyId
            data.name = node.name
            data.country = node.countryName
            data.entityName = node.name
            data.entityCountryName = node.countryName
            data.entityRegion = node.regionName
            data.entityCompanySize = node.companySize

            /** Nacis Industries columns : 2, 3, 4 */

            data.entityIndustryCodeNaics2 = node.naicCode2
            data.entityIndustryNameNaics2 = node.nameCode2

            data.entityIndustryCodeNaics3 = node.naicCode3
            data.entityIndustryNameNaics3 = node.nameCode3

            data.entityIndustryName = node.industryName
            data.entityIndustryCode = node.industryCode

            if (homeCompare.selectedChart === "lastCfi") {
              data.metric1 = node.metric1 ? formatData.getNumberWithDecimals(node.metric1, 1) : null
              data.metric2 = node.metric2 ? formatData.getNumberWithDecimals(node.metric2, 1) : null
              data.metric3 = node.metric3 ? formatData.getNumberWithDecimals(node.metric3, 1) : null
              data.metric4 = node.metric4 ? formatData.getNumberWithDecimals(node.metric4, 1) : null
              data.metric5 = node.metric5 ? formatData.getNumberWithDecimals(node.metric5, 1) : null
            }



            data.selected = false
            parsedData.push(data)
          });

          homeCompare.listOfCompaniesData = parsedData
          homeCompare.loadingCompanies = false

          if ((userIsAdmin.value || userIsSuperAdmin.value) && homeCompare.listOfCompaniesData?.length > 0) {
            homeCompare.showGrid = true
          }
          else if ((userIsAdmin.value || userIsSuperAdmin.value) && homeCompare.listOfCompaniesData?.length <= 0) {
            homeCompare.showGrid = true
          }
          else if ((!userIsAdmin.value && !userIsSuperAdmin.value) && homeCompare.listOfCompaniesData?.length > 0) {
            homeCompare.showGrid = true
          }
          else if ((!userIsAdmin && !userIsSuperAdmin.value) && homeCompare.listOfCompaniesData?.length <= 0) {
            homeCompare.showGrid = false
          }
          //If user change the metric and he already have companies selected set that companies in select = true
          if (homeCompare.storedCompanies?.length > 0) {
            updateTheSelectedValuesInArray()
          }

          onChangeChartType()
        },
        callbackError: () => {
          homeCompare.loadingCompanies = false

        }
      }
      compareStore.getCompareGrid(params)
    }

    /**
     * For initials graph options
    */
    interface CompanyStored {
      idCompany: string
      companies: any
    }
    let ArrayStored: CompanyStored[] = []

    /**
     * For Options dropdown companies
    */
    interface OptionsStored {
      idCompany: string
      options: any
    }
    let ArrayOptions: OptionsStored[] = []


    function getChartOptionsAvailable() {
      const staticOptions = {
        myCompany: { id: 'myCompany', translation: userStore.getCompanyName, value: true },
        peerGroupAverage: { id: 'peerGroupAverage', translation: translate.t('home.compare.chartOptions.peerGroupAverage'), value: true },
        peerGroupFirstQuartile: { id: 'peerGroupFirstQuartile', translation: translate.t('home.compare.chartOptions.peerGroupFirstQuartile'), value: true },
        peerGroupThirdQuartile: { id: 'peerGroupThirdQuartile', translation: translate.t('home.compare.chartOptions.peerGroupThirdQuartile'), value: true },
        peerGroupMin: { id: 'peerGroupMin', translation: translate.t('home.compare.chartOptions.peerGroupMin'), value: true },
        peerGroupMedian: { id: 'peerGroupMedian', translation: translate.t('home.compare.chartOptions.peerGroupMedian'), value: true },
        peerGroupMax: { id: 'peerGroupMax', translation: translate.t('home.compare.chartOptions.peerGroupMax'), value: true },
        averageIndustry: { id: 'averageIndustry', translation: translate.t('home.compare.chartOptions.averageIndustry'), value: false },
        averageCountry: { id: 'averageCountry', translation: translate.t('home.compare.chartOptions.averageCountry'), value: false },
        averageRegion: { id: 'averageRegion', translation: translate.t('home.compare.chartOptions.averageRegion'), value: false }
      }
      const InitialsOptions = compareStore.getOptionsCompanies
      const index = InitialsOptions ? InitialsOptions.findIndex((x: any) => x.idCompany === userStore.getUserCompanyId) : -1
      return index >= 0 ? InitialsOptions[index].options : staticOptions
    }


    function resetChartOptionsAvailable() {
      const staticOptions = {
        myCompany: { id: 'myCompany', translation: userStore.getCompanyName, value: true },
        peerGroupAverage: { id: 'peerGroupAverage', translation: translate.t('home.compare.chartOptions.peerGroupAverage'), value: true },
        peerGroupFirstQuartile: { id: 'peerGroupFirstQuartile', translation: translate.t('home.compare.chartOptions.peerGroupFirstQuartile'), value: true },
        peerGroupThirdQuartile: { id: 'peerGroupThirdQuartile', translation: translate.t('home.compare.chartOptions.peerGroupThirdQuartile'), value: true },
        peerGroupMin: { id: 'peerGroupMin', translation: translate.t('home.compare.chartOptions.peerGroupMin'), value: false },
        peerGroupMedian: { id: 'peerGroupMedian', translation: translate.t('home.compare.chartOptions.peerGroupMedian'), value: false },
        peerGroupMax: { id: 'peerGroupMax', translation: translate.t('home.compare.chartOptions.peerGroupMax'), value: true },
        averageIndustry: { id: 'averageIndustry', translation: translate.t('home.compare.chartOptions.averageIndustry'), value: false },
        averageCountry: { id: 'averageCountry', translation: translate.t('home.compare.chartOptions.averageCountry'), value: false },
        averageRegion: { id: 'averageRegion', translation: translate.t('home.compare.chartOptions.averageRegion'), value: false }
      }

      homeCompare.chartOptionsAvailable = staticOptions
      closeDropdownAndMakeActions()

    }

    function getStartYear(selectedChart: string): number {
      const startYear = localStorage.getItem(`${selectedChart}-selectedStartYear`)
      if (startYear) {
        return +startYear
      }
      return +(new Date().getFullYear() - 4).toString()
    }

    function getEndYear(selectedChart: string): number {
      const endYear = localStorage.getItem(`${selectedChart}-selectedEndYear`)
      if (endYear) {
        return +endYear
      }
      let year = new Date().getFullYear()

      return year
    }

    function getYear(selectedChart: string): number {
      const endYear = localStorage.getItem(`${selectedChart}-selectedYear`)
      const currentYear = (new Date().getFullYear()).toString()


      if (endYear && endYear === currentYear) {
        return +(new Date().getFullYear() - 1).toString()
      }

      if (endYear && endYear !== currentYear) {
        return +endYear
      }

      return +(new Date().getFullYear() - 1).toString()
    }

    
    const lastYears = computed(() => {
      const result = []
      const thisYear = new Date().getFullYear()

      result.push(thisYear)
      for (let i = 1; i < 6; i++) {
        result.push(thisYear - i)
      }

      return result
    })

    function getCompanyName(companyId: string) {
      let result = ''

      homeCompare.listOfCompaniesData.forEach(function (company: any) {
        if (StringUtils.removeIRI(companyId) === StringUtils.removeIRI(company.id)) {
          result = company.name
        }
      })
      return result
    }

    watch([() => homeCompare.selectedEndYearRange, () => homeCompare.selectedStartYearRange], () => {
      onChangeChartType()
    });

    function onChangeSliderYearRange(event: any): void {
      if (event.value.start !== homeCompare.rangeObj.start || event.value.end !== homeCompare.rangeObj.end) {
        homeCompare.rangeObj.start = Math.round(event.value.start)
        homeCompare.selectedStartYearRange = homeCompare.rangeObj.start

        homeCompare.rangeObj.end = Math.round(event.value.end)
        homeCompare.selectedEndYearRange = homeCompare.rangeObj.end
      }
    }

    function onChangeSliderYear(event: any): void {
      homeCompare.hideChart = true
      homeCompare.loadingCharts = true

      let previousValue = event.value
      if (!Number.isInteger(previousValue)) {
        onChangeYear()
      }
    }

    function onChangeYear() {
      onChangeChartType()
    }

    function getYearRangeChartData(chartDataObj: any, typeOfChart: string) {

      const resultArray: Array<any> = []

      chartDataObj.forEach(function (value: any, year: any) {
        const resultRowArray: Array<any> = []
        resultRowArray.push(`${typeOfChart} ` + year.toString())

        if (homeCompare.chartOptionsAvailable.myCompany.value) {
          resultRowArray.push(value.myCompany && !StringUtils.isNullUndefinedOrEmpty(value.myCompany[typeOfChart.toLowerCase()]) ? parseFloat(formatData.getNumberWithDecimals(value.myCompany[typeOfChart.toLowerCase()], 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.peerGroupAverage.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.global.peerGroupAverage) ? parseFloat(formatData.getNumberWithDecimals(value.global.peerGroupAverage, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.peerGroupFirstQuartile.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.global.peerGroupFirstQuartile) ? parseFloat(formatData.getNumberWithDecimals(value.global.peerGroupFirstQuartile, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.peerGroupThirdQuartile.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.global.peerGroupThirdQuartile) ? parseFloat(formatData.getNumberWithDecimals(value.global.peerGroupThirdQuartile, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.peerGroupMin.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.global.peerGroupMin) ? parseFloat(formatData.getNumberWithDecimals(value.global.peerGroupMin, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.peerGroupMedian.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.global.peerGroupMedian) ? parseFloat(formatData.getNumberWithDecimals(value.global.peerGroupMedian, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.peerGroupMax.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.global.peerGroupMax) ? parseFloat(formatData.getNumberWithDecimals(value.global.peerGroupMax, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.averageIndustry.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.averagePerIndustry) ? parseFloat(formatData.getNumberWithDecimals(value.averagePerIndustry, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.averageCountry.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.averagePerCountry) ? parseFloat(formatData.getNumberWithDecimals(value.averagePerCountry, 0)) : null)
        }

        if (homeCompare.chartOptionsAvailable.averageRegion.value) {
          resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(value.averagePerRegion) ? parseFloat(formatData.getNumberWithDecimals(value.averagePerRegion, 0)) : null)
        }

        let filteredListOfCompaniesData = homeCompare.listOfCompaniesData.filter((company: any) => company.selected === true);

        if (value.perCompany && value.perCompany.length > 0) {
          value.perCompany.forEach(function (company: any) {
            //Only set for the selected companies
            const findIndex = filteredListOfCompaniesData.findIndex((x: any) => StringUtils.removeIRI(x.id) === StringUtils.removeIRI(company.companyId))
            if (findIndex > -1) {
              resultRowArray.push(!StringUtils.isNullUndefinedOrEmpty(company[typeOfChart.toLowerCase()]) ? parseFloat(formatData.getNumberWithDecimals(company[typeOfChart.toLowerCase()], 0)) : null)
            }
          })
        }
        resultArray.push(resultRowArray)
      })
      return resultArray
    }

    /**
     * To set the array to be used in the chart line in homeCompare.chartLineColumns
     * 
     */


    function getColumnsYearRange() {
      const resultLineColumns: Array<any> = []
      resultLineColumns.push({ type: 'string', value: translate.t('home.compare.chartOptions.value') })
      if (homeCompare.chartOptionsAvailable.myCompany.value) {
        resultLineColumns.push({ type: 'number', value: homeCompare.companyName })
      }
      if (homeCompare.chartOptionsAvailable.peerGroupAverage.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.peerGroupAverage') })

      }
      if (homeCompare.chartOptionsAvailable.peerGroupFirstQuartile.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.peerGroupFirstQuartile') })
      }

      if (homeCompare.chartOptionsAvailable.peerGroupThirdQuartile.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.peerGroupThirdQuartile') })
      }

      if (homeCompare.chartOptionsAvailable.peerGroupMin.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.peerGroupMin') })
      }

      if (homeCompare.chartOptionsAvailable.peerGroupMedian.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.peerGroupMedian') })
      }

      if (homeCompare.chartOptionsAvailable.peerGroupMax.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.peerGroupMax') })
      }

      if (homeCompare.chartOptionsAvailable.averageIndustry.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.averageIndustry') })
      }

      if (homeCompare.chartOptionsAvailable.averageCountry.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.averageCountry') })
      }

      if (homeCompare.chartOptionsAvailable.averageRegion.value) {
        resultLineColumns.push({ type: 'number', value: translate.t('home.compare.chartOptions.averageRegion') })
      }

      homeCompare.listOfCompaniesData.forEach(function (company: any) {
        if (company.selected) {
          resultLineColumns.push({ type: 'number', value: company.name })
        }
      })
      return resultLineColumns
    }

    function validateYearChart(chartDataObj: any, typeChart: string) {

      const resultArray: Array<any> = []
      if (homeCompare.chartOptionsAvailable.myCompany.value && chartDataObj.myCompany) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.myCompany[typeChart.toLocaleLowerCase()])) {
          if (typeChart === 'last') {
            resultArray.push([homeCompare.companyName, parseFloat(chartDataObj.myCompany.paymentTerms)])
          } else {
            resultArray.push([homeCompare.companyName, parseFloat(chartDataObj.myCompany[typeChart.toLocaleLowerCase()])])
          }

        }
      }

      if (homeCompare.chartOptionsAvailable.peerGroupMin.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.global.peerGroupMin)) {
          resultArray.push([translate.t('home.compare.chartOptions.peerGroupMin'), parseFloat(chartDataObj.global.peerGroupMin)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.peerGroupMin'))
        }
      } else {
        if (typeChart === 'last') {
          homeCompare.lastPaymentTermsNotAvailable = true
        }
      }

      if (homeCompare.chartOptionsAvailable.peerGroupFirstQuartile.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.global.peerGroupFirstQuartile)) {
          resultArray.push([translate.t('home.compare.chartOptions.peerGroupFirstQuartile'), parseFloat(chartDataObj.global.peerGroupFirstQuartile)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.peerGroupFirstQuartile'))
        }
      } else {
        if (typeChart === 'last') {
          homeCompare.lastPaymentTermsNotAvailable = true
        }
      }

      if (homeCompare.chartOptionsAvailable.peerGroupAverage.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.global.peerGroupAverage)) {
          resultArray.push([translate.t('home.compare.chartOptions.peerGroupAverage'), parseFloat(chartDataObj.global.peerGroupAverage)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.peerGroupAverageData'))
        }
      } else {
        if (typeChart === 'last') {
          homeCompare.lastPaymentTermsNotAvailable = true
        }
      }

      if (homeCompare.chartOptionsAvailable.peerGroupMedian.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.global.peerGroupMedian)) {
          resultArray.push([translate.t('home.compare.chartOptions.peerGroupMedian'), parseFloat(chartDataObj.global.peerGroupMedian)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.peerGroupMedian'))
        }
      } else {
        if (typeChart === 'last') {
          homeCompare.lastPaymentTermsNotAvailable = true
        }
      }

      if (homeCompare.chartOptionsAvailable.peerGroupThirdQuartile.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.global.peerGroupThirdQuartile)) {
          resultArray.push([translate.t('home.compare.chartOptions.peerGroupThirdQuartile'), parseFloat(chartDataObj.global.peerGroupThirdQuartile)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.peerGroupThirdQuartile'))
        }
      } else {
        if (typeChart === 'last') {
          homeCompare.lastPaymentTermsNotAvailable = true
        }
      }

      if (homeCompare.chartOptionsAvailable.peerGroupMax.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.global.peerGroupMax)) {
          resultArray.push([translate.t('home.compare.chartOptions.peerGroupMax'), parseFloat(chartDataObj.global.peerGroupMax)])

        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.peerGroupMax'))
        }
      } else {
        if (typeChart === 'last') {
          homeCompare.lastPaymentTermsNotAvailable = true
        }
      }

      if (homeCompare.chartOptionsAvailable.averageIndustry.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.averagePerIndustry)) {
          resultArray.push([translate.t('home.compare.chartOptions.averageIndustry'), parseFloat(chartDataObj.averagePerIndustry)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.industryData'))
        }
      }

      if (homeCompare.chartOptionsAvailable.averageCountry.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.averagePerCountry)) {
          resultArray.push([translate.t('home.compare.chartOptions.averageCountry'), parseFloat(chartDataObj.averagePerCountry)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.countryData'))
        }
      }

      if (homeCompare.chartOptionsAvailable.averageRegion.value) {
        if (!StringUtils.isNullUndefinedOrEmpty(chartDataObj.averagePerRegion)) {
          resultArray.push([translate.t('home.compare.chartOptions.averageRegion'), parseFloat(chartDataObj.averagePerRegion)])
        } else {
          homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.regionData'))
        }
      }

      let filteredListOfCompaniesData = homeCompare.listOfCompaniesData.filter((company: any) => company.selected === true);
      if (chartDataObj.perCompany?.length > 0) {
        chartDataObj.perCompany.forEach(function (company: any) {
          //Only set for the selected companies
          const findIndex = filteredListOfCompaniesData.findIndex((x: any) => StringUtils.removeIRI(x.id) === StringUtils.removeIRI(company.companyId))
          if (findIndex > -1) {
            if (!StringUtils.isNullUndefinedOrEmpty(company[typeChart.toLowerCase()])) {

              if (typeChart === 'CFI') {
                resultArray.push([
                  getCompanyName(company.companyId),
                  company[typeChart.toLowerCase()]
                ])
              } else {
                resultArray.push([
                  getCompanyName(company.companyId),
                  parseFloat(formatData.getNumberWithDecimals(company[typeChart.toLowerCase()], 0))
                ])
              }
            }
            else {
              homeCompare.chartErrorMessage.push(translate.t('home.compare.warnings.forData') + getCompanyName(company.companyId))
            }
          }
        })
      }

      return resultArray
    }

    function nextAvailableYear() {
      homeCompare.hideSelectedYearChart = false
      if (homeCompare.selectedYear === homeCompare.startYearStep) {
        homeCompare.selectedYear = homeCompare.endYearStep
        onChangeYear()

      }
      else {
        homeCompare.selectedYear -= 1
        localStorage.setItem(`${homeCompare.selectedChart}-selectedYear`, JSON.stringify(homeCompare.selectedYear))
        onChangeYear()
      }
    }


    function setLastCfiChartData() {
      homeCompare.acronymChart = "CFI"
      let chartData
      validateYears(homeCompare.fullDataCfi)
      homeCompare.selectedYear = homeCompare.allYearsNotAvailable ? new Date().getFullYear() - 1 : homeCompare.selectedYear

      if (!homeCompare.allYearsNotAvailable) {
        chartData = Object.values(homeCompare.fullDataCfi)
        homeCompare.currentYearKeys = Object.keys(homeCompare.fullDataCfi).map((key: any) => key)
        let year = Object.keys(homeCompare.fullDataCfi).map((key: any) => key)
        const roundedYear = Math.ceil(homeCompare.selectedYear)
        chartData = chartData[year.indexOf((roundedYear).toString())]
        const resultArray = validateYearChart(chartData, 'CFI')
        if (homeCompare.hideSelectedYearChart) {
          nextAvailableYear()
        } else {
          homeCompare.chartData.cashFlowImpact = resultArray
        }
      }
      homeCompare.hideChart = false
      homeCompare.chartKey = new Date().getUTCMilliseconds()
      homeCompare.loadingCharts = false
    }

    function getLastCfiChartData() {
      homeCompare.hideSelectedYearChart = false
      homeCompare.loadingCharts = true

      if (!ObjectUtils.isEmpty(homeCompare.fullDataCfi)) {
        setLastCfiChartData()
        return
      }

      const params = {
        companies: [],
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.loading = false
          homeCompare.chartErrorMessage = []

          homeCompare.fullDataCfi = callbackSuccessData
          setLastCfiChartData()

        },
        callbackError: () => {
          homeCompare.allYearsNotAvailable = true
          homeCompare.loadingCharts = false
        }
      }

      compareStore.fetchChartLastCfiComparison(params)

      homeCompare.chartOptions = {
        height: '450',
        animation: {
          duration: 1000,
          easing: 'out',
          startup: true
        },
        legend: { position: 'none' },
        vAxes: {
          0: { title: translate.t('home.compare.chartOptions.days') }
        }
      }

      homeCompare.showPeriods = false
    }



    function setLastDpoComparisonChartData() {
      homeCompare.acronymChart = "DPO"
      let chartData
      validateYears(homeCompare.fullDatadpoComparison)
      homeCompare.selectedYear = homeCompare.allYearsNotAvailable ? new Date().getFullYear() - 1 : homeCompare.selectedYear



      if (!homeCompare.allYearsNotAvailable) {
        chartData = Object.values(homeCompare.fullDatadpoComparison)
        homeCompare.currentYearKeys = Object.keys(homeCompare.fullDatadpoComparison).map((key: any) => key)
        let year = Object.keys(homeCompare.fullDatadpoComparison).map((key: any) => key)
        const roundedYear = Math.ceil(homeCompare.selectedYear)
        chartData = chartData[year.indexOf((roundedYear).toString())]
        const resultArray = validateYearChart(chartData, 'DPO')
        if (homeCompare.hideSelectedYearChart) {
          nextAvailableYear()
        } else {
          homeCompare.chartData.dpoComparison = resultArray
        }

      }

      homeCompare.hideChart = false
      homeCompare.chartKey = new Date().getUTCMilliseconds()
      homeCompare.loadingCharts = false
    }

    function getLastDpoComparisonChartData() {
      homeCompare.hideSelectedYearChart = false
      homeCompare.loadingCharts = true

      if (!ObjectUtils.isEmpty(homeCompare.fullDatadpoComparison)) {
        setLastDpoComparisonChartData()
        return
      }

      const params = {
        companies: [],
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.loading = false
          homeCompare.chartErrorMessage = []

          homeCompare.fullDatadpoComparison = callbackSuccessData
          setLastDpoComparisonChartData()

        },
        callbackError: () => {
          homeCompare.allYearsNotAvailable = true
          homeCompare.loadingCharts = false
        }
      }

      compareStore.fetchChartLastDpoComparison(params)

      homeCompare.chartOptions = {
        height: '450',
        animation: {
          duration: 1000,
          easing: 'out',
          startup: true
        },
        legend: { position: 'none' },
        vAxes: {
          0: { title: translate.t('home.compare.chartOptions.days') }
        }
      }

      homeCompare.showPeriods = false
    }

    function setLastDpoYearsChartData() {
      homeCompare.acronymChart = "DPO"
      const chartData = new Map(Object.entries(homeCompare.fullDatalastDpoYears))
      const filteredMap = computed(() => {
        return new Map(
          Array.from(chartData.entries()).filter(([key, value]) => {
            const numericKey = Number(key);
            return numericKey >= homeCompare.selectedStartYearRange && numericKey <= homeCompare.selectedEndYearRange;
          })
        );
      });

      validateYears(homeCompare.fullDatalastDpoYears)
      homeCompare.chartData.lastDpoYears = getYearRangeChartData(filteredMap.value, 'DPO')
      homeCompare.chartLineColumns = getColumnsYearRange()
      homeCompare.hideSelectedYearChart = false
      homeCompare.loadingCharts = false
      homeCompare.hideChart = false
      homeCompare.loadingCharts = false
      homeCompare.loadingCompanies = false
      homeCompare.loadingCharts = false
      homeCompare.chartKey++

    }

    function getLastDpoYearsChartData() {
      homeCompare.loadingCharts = true
      homeCompare.allYearsNotAvailable = false

      if (!ObjectUtils.isEmpty(homeCompare.fullDatalastDpoYears)) {
        setLastDpoYearsChartData()
        return
      }

      const params = {
        companies: [],
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.loading = false
          homeCompare.fullDatalastDpoYears = callbackSuccessData
          setLastDpoYearsChartData()
        },
        callbackError: () => {
          homeCompare.allYearsNotAvailable = true
          homeCompare.loadingCharts = false
        }
      }

      compareStore.fetchChartLastDpoYears(params)

      homeCompare.chartOptions = {
        height: '450',
        animation: {
          duration: 1000,
          easing: 'out',
          startup: true
        },
        legend: { position: 'right' },
        vAxes: {
          0: { title: translate.t('home.compare.chartOptions.days') }
        }
      }

      homeCompare.showPeriods = true
    }

    function setLastC2cChartData() {
      homeCompare.acronymChart = "C2C"
      let chartData
      validateYears(homeCompare.fullDatalastC2c)
      homeCompare.selectedYear = homeCompare.allYearsNotAvailable ? new Date().getFullYear() : homeCompare.selectedYear
      if (!homeCompare.allYearsNotAvailable) {
        chartData = Object.values(homeCompare.fullDatalastC2c)
        let year = Object.keys(homeCompare.fullDatalastC2c).map((key: any) => key)
        const roundedYear = Math.ceil(homeCompare.selectedYear)
        chartData = chartData[year.indexOf((roundedYear).toString())]
        const resultArray = validateYearChart(chartData, 'C2C')
        if (homeCompare.hideSelectedYearChart) {
          nextAvailableYear()
        } else {
          homeCompare.chartData.lastC2c = resultArray
        }

      }
      homeCompare.chartKey = new Date().getUTCMilliseconds()
      homeCompare.loadingCharts = false
      homeCompare.hideChart = false
    }

    function getLastC2cChartData() {
      homeCompare.loadingCharts = true
      homeCompare.hideSelectedYearChart = false

      if (!ObjectUtils.isEmpty(homeCompare.fullDatalastC2c)) {
        setLastC2cChartData()
        return
      }

      const params = {
        companies: [],
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.loading = false
          homeCompare.chartErrorMessage = []
          homeCompare.fullDatalastC2c = callbackSuccessData
          setLastC2cChartData()
        },
        callbackError: () => {
          homeCompare.allYearsNotAvailable = true
          homeCompare.loadingCharts = false
        }
      }

      compareStore.fetchLastC2cChartData(params)

      homeCompare.chartOptions = {
        height: '450',
        animation: {
          duration: 1000,
          easing: 'out',
          startup: true
        },
        legend: { position: 'none' },
        vAxes: {
          0: { title: translate.t('home.compare.chartOptions.days') }
        }
      }

      homeCompare.showPeriods = false
    }

    function setLastC2cYearsChartData() {
      homeCompare.acronymChart = "C2C"
      const chartData = new Map(Object.entries(homeCompare.fullDatalastC2cYears))

      const filteredMap = computed(() => {
        return new Map(
          Array.from(chartData.entries()).filter(([key, value]) => {
            const numericKey = Number(key);
            return numericKey >= homeCompare.selectedStartYearRange && numericKey <= homeCompare.selectedEndYearRange;
          })
        );
      });

      validateYears(homeCompare.fullDatalastC2cYears)
      homeCompare.chartData.lastC2cYears = getYearRangeChartData(filteredMap.value, 'C2C')
      homeCompare.chartLineColumns = getColumnsYearRange()
      homeCompare.chartKey = new Date().getUTCMilliseconds()
      homeCompare.hideSelectedYearChart = false
      homeCompare.loadingCharts = false
      homeCompare.hideChart = false
    }

    function getLastC2cYearsChartData() {
      homeCompare.loadingCharts = true
      homeCompare.allYearsNotAvailable = false

      if (!ObjectUtils.isEmpty(homeCompare.fullDatalastC2cYears)) {
        setLastC2cYearsChartData()
        return
      }

      const params = {
        companies: [],
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.loading = false
          homeCompare.fullDatalastC2cYears = callbackSuccessData
          setLastC2cYearsChartData()
        },
        callbackError: () => {
          homeCompare.allYearsNotAvailable = true
          homeCompare.loadingCharts = false
        }
      }

      compareStore.fetchLastC2cYearsChartData(params)

      homeCompare.chartOptions = {
        height: '450',
        animation: {
          duration: 1000,
          easing: 'out',
          startup: true
        },
        legend: { position: 'right' },
        vAxes: {
          0: { title: translate.t('home.compare.chartOptions.days') }
        }
      }

      homeCompare.showPeriods = true
    }

    function setLastDsoChartData() {

      let chartData
      validateYears(homeCompare.fullDatalastDso)
      homeCompare.selectedYear = homeCompare.allYearsNotAvailable ? new Date().getFullYear() : homeCompare.selectedYear
      if (!homeCompare.allYearsNotAvailable) {
        chartData = Object.values(homeCompare.fullDatalastDso)
        let year = Object.keys(homeCompare.fullDatalastDso).map((key: any) => key)
        const roundedYear = Math.ceil(homeCompare.selectedYear)
        chartData = chartData[year.indexOf((roundedYear).toString())]
        const resultArray = validateYearChart(chartData, 'DSO')
        if (homeCompare.hideSelectedYearChart) {
          nextAvailableYear()
        } else {
          homeCompare.chartData.lastDso = resultArray
        }

      }

      homeCompare.chartKey = new Date().getUTCMilliseconds()
      homeCompare.hideChart = false
      homeCompare.loadingCharts = false

    }

    function getLastDsoChartData() {
      homeCompare.acronymChart = "DSO"
      homeCompare.hideSelectedYearChart = false
      homeCompare.loadingCharts = true

      if (!ObjectUtils.isEmpty(homeCompare.fullDatalastDso)) {
        setLastDsoChartData()
        return
      }

      const params = {
        companies: [],
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.loading = false
          homeCompare.chartErrorMessage = []

          homeCompare.fullDatalastDso = callbackSuccessData
          setLastDsoChartData()
        },
        callbackError: () => {
          homeCompare.allYearsNotAvailable = true
          homeCompare.loadingCharts = false
        }
      }

      compareStore.fetchLastDsoChartData(params)

      homeCompare.chartOptions = {
        height: '450',
        animation: {
          duration: 1000,
          easing: 'out',
          startup: true
        },
        legend: { position: 'none' },
        vAxes: {
          0: { title: translate.t('home.compare.chartOptions.days') }
        }
      }

      homeCompare.showPeriods = false
    }


    function setLastDsoYearsChartData() {
      homeCompare.acronymChart = "DSO"
      const chartData = new Map(Object.entries(homeCompare.fullDatalastDsoYears))

      const filteredMap = computed(() => {
        return new Map(
          Array.from(chartData.entries()).filter(([key, value]) => {
            const numericKey = Number(key);
            return numericKey >= homeCompare.selectedStartYearRange && numericKey <= homeCompare.selectedEndYearRange;
          })
        );
      });

      validateYears(homeCompare.fullDatalastDsoYears)
      homeCompare.chartData.lastDsoYears = getYearRangeChartData(filteredMap.value, 'DSO')
      homeCompare.chartLineColumns = getColumnsYearRange()
      homeCompare.chartKey = new Date().getUTCMilliseconds()
      homeCompare.hideSelectedYearChart = false
      homeCompare.loadingCharts = false
      homeCompare.hideChart = false
    }

    function getLastDsoYearsChartData() {
      homeCompare.loadingCharts = true
      homeCompare.allYearsNotAvailable = false

      if (!ObjectUtils.isEmpty(homeCompare.fullDatalastDsoYears)) {
        setLastDsoYearsChartData()
        return
      }

      const params = {
        companies: [],
        startYear: homeCompare.rangeForYearsDefault,
        endYear: homeCompare.endYearByDefault,
        callbackSuccess: (callbackSuccessData: any) => {
          homeCompare.loading = false
          homeCompare.fullDatalastDsoYears = callbackSuccessData
          setLastDsoYearsChartData()
        },
        callbackError: () => {
          homeCompare.allYearsNotAvailable = true
          homeCompare.loadingCharts = false
        }
      }

      compareStore.fetchLastDsoYearsChartData(params)

      homeCompare.chartOptions = {
        height: '450',
        animation: {
          duration: 1000,
          easing: 'out',
          startup: true
        },
        legend: { position: 'right' },
        vAxes: {
          0: { title: translate.t('home.compare.chartOptions.days') }
        }
      }

      homeCompare.showPeriods = true
    }



    function stopChartLoading() {
      homeCompare.loadingCharts = false
      homeCompare.loading = false
      homeCompare.loadingCompanies = false
      homeCompare.hideChart = false
    }

    function onChangeChartType() {
      homeCompare.chartKey = new Date().getUTCMilliseconds()
      homeCompare.loadingCharts = false
      homeCompare.tooltipKey++
      try {
        switch (homeCompare.selectedChart) {

          case 'lastCfi':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return getLastCfiChartData()

          case 'dpoComparison':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return getLastDpoComparisonChartData()

          case 'lastDpoYears':
            return getLastDpoYearsChartData()

          case 'lastDso':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return getLastDsoChartData()

          case 'lastDsoYears':
            return getLastDsoYearsChartData()

          case 'lastC2c':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return getLastC2cChartData()

          case 'lastC2cYears':
            return getLastC2cYearsChartData()
          default: homeCompare.loading = false
        }
      } catch (error) {
        console.error('Error building compare chart', error)
        stopChartLoading()
      }

    }

    /**
     * To-do change to vuex
     */

    watch(() => homeCompare.selectedStartYear, () => {
      localStorage.setItem(`${homeCompare.selectedChart}-selectedStartYear`, JSON.stringify(homeCompare.selectedStartYear))
    })

    watch(() => homeCompare.selectedEndYear, () => {
      localStorage.setItem(`${homeCompare.selectedChart}-selectedEndYear`, JSON.stringify(homeCompare.selectedEndYear))
    })

    watch(() => homeCompare.selectedYear, () => {
      homeCompare.selectedYear = Math.round(homeCompare.selectedYear)
      localStorage.setItem(`${homeCompare.selectedChart}-selectedYear`, JSON.stringify(homeCompare.selectedYear))
    })

    watch(() => homeCompare.chartOptionsAvailable, () => {
      ArrayOptions = []
      if (compareStore.getOptionsCompanies) {
        ArrayOptions = compareStore.getOptionsCompanies
        const index = ArrayOptions.findIndex(x => x.idCompany === userStore.getUserCompanyId)
        if (index >= 0) {
          ArrayOptions[index].options = homeCompare.chartOptionsAvailable
        } else {
          const company: OptionsStored = {
            idCompany: userStore.getUserCompanyId,
            options: homeCompare.chartOptionsAvailable
          }
          ArrayOptions.push(company)
        }
      } else {
        const company: OptionsStored = {
          idCompany: userStore.getUserCompanyId,
          options: homeCompare.chartOptionsAvailable
        }
        ArrayOptions.push(company)
      }
      compareStore.setOptionsCompanies(ArrayOptions)
    }, { deep: true })

    watch(() => homeCompare.listOfCompaniesData, () => {

      let itemsAdded = homeCompare.listOfCompaniesData.filter((x: any) => x.selected === true)
      homeCompare.storedCompanies = itemsAdded
      compareStore.setAddededCompanies(itemsAdded)

    }, { deep: true })


    function changeCompaniesStatus(companies: any, alldata: any) {
      let lastCompanyAdded = homeCompare.listOfCompaniesData.findIndex(x => x.companyId === companies.companyId)
      homeCompare.listOfCompaniesData[lastCompanyAdded].selected = !companies.selected

      let itemsAdded = homeCompare.listOfCompaniesData.filter((x: any) => x.selected === true);

      if (itemsAdded?.length > 20) {
        homeCompare.showAlert20Peers = true
        homeCompare.listOfCompaniesData[lastCompanyAdded].selected = false
        homeCompare.gridKey++
      } else {

        homeCompare.showAlert20Peers = false
        const el = document.getElementById('alert20Peers')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }
      getDataForCharts()
    }



    function selectAllRow(dataGrid: any, checked: boolean, dataSelected: any) {

      if (dataGrid?.length > 20) {
        homeCompare.showAlert20Peers = true
      } else {
        homeCompare.showAlert20Peers = false
      }

      if (!checked) {
        homeCompare.showAlert20Peers = false
      }

      let counter = 1
      dataGrid.forEach(function (config: any) {
        if (counter <= 20) {
          const indexSpend = homeCompare.listOfCompaniesData.findIndex(x => x.companyId === config.companyId)
          homeCompare.listOfCompaniesData[indexSpend].selected = config.selected
        }
        counter = counter + 1
      })
      getDataForCharts()
    }

    const gridDataColumnsComputed = computed(() => {
      return [...homeCompare.listOfCompaniesData].sort((a, b) => a.name.localeCompare(b.name));
    })

    function resetSelectedCompanies() {
      homeCompare.storedCompanies = []
      compareStore.setAddededCompanies([])
      homeCompare.listOfCompaniesData.forEach(function (config: any) {
        config.selected = false
      })
      homeCompare.showAlert20Peers = false
      homeCompare.gridKey++
      getDataForCharts()
    }


    function getDataForCharts() {

      try {
        switch (homeCompare.selectedChart) {
          case 'lastCfi':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return setLastCfiChartData()

          case 'dpoComparison':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return setLastDpoComparisonChartData()

          case 'lastDpoYears':
            return setLastDpoYearsChartData()

          case 'lastDso':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return setLastDsoChartData()

          case 'lastDsoYears':
            return setLastDsoYearsChartData()

          case 'lastC2c':
            homeCompare.selectedYear = getYear(homeCompare.selectedChart)
            return setLastC2cChartData()

          case 'lastC2cYears':
            return setLastC2cYearsChartData()

          default: homeCompare.loading = false
        }
      } catch (error) {
        console.error('Error building compare chart', error)
        stopChartLoading()
      }
    }

    const showLegend = computed(() => {
      return (homeCompare.selectedChart === 'dpoComparison' || homeCompare.selectedChart === 'lastDso' || homeCompare.selectedChart === 'lastC2c' || homeCompare.selectedChart === 'lastCfi') && !homeCompare.hideChart
    })

    const homeCompareLegendItems = computed(() => {
      const legendItems = [
        {
          text: homeCompare.companyName,
          color: '#344054'
        },
        {
          text: translate.t('global.globalPeerGroup'),
          color: '#2e90fa',
        },
        {
          text: translate.t('global.competitors'),
          color: '#36bffa'
        }
      ];

      // Conditionally exclude the first item if homeCompare.selectedChart === 'lastCfi'
      if (homeCompare.selectedChart === 'lastCfi') {
        return legendItems.slice(1); // Return only the second and third items
      }

      return legendItems; // Return all items
    });



    return {
      ...toRefs(homeCompare),
      addAllCompanies,
      changeCompaniesStatus,
      changeMetric,
      changeYearValue,
      closeDropdownAndMakeActions,
      fontIcons,
      gridDataColumnsComputed,
      homeCompareLegendItems,
      isAnAdmin,
      lastYears,
      onChangeChartType,
      onChangeSliderYear,
      onChangeSliderYearRange,
      onChangeYear,
      postComparePeersReset,
      resetChartOptionsAvailable,
      resetSelectedCompanies,
      selectAllRow,
      showLegend,
      showModalForListCompanies,
      userIsAdmin,
      userIsSuperAdmin,
      validateYears,
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
@import "src/resources/assets/styles/variables/typography";

.options-span {
  &:hover {
    color: $color-primary-500 !important;
  }
}

.custom-slider {
  width: 800px;
}

.custom-select-dropdown {
  border-radius: 8px;
  padding: 8px 14px;
  background-color: #fff;
  width: 100% !important;
  height: 60px;
  border: 1px solid $color-gray-300;
}

.custom-range-slider-container {
  width: 97% !important;
  height: 40px;
}

.fa-chevron-down {
  font-size: 12px;
  position: absolute;
  top: 3px;
  left: 24%;
}

.year {
  font-weight: 500;
  color: $color-gray-500;
}

.year-selected {
  font-weight: 600;
  color: $color-gray-800;
}

.select-font-text {
  font-weight: 400;
  font-size: 14px;
}

@media only screen and (max-width: 1873px) {
  .fa-chevron-down {
    left: 25%;
  }
}

@media only screen and (max-width: 1786px) {
  .fa-chevron-down {
    left: 28%;
  }
}

@media only screen and (max-width: 1600px) {
  .fa-chevron-down {
    left: 32%;
  }
}

@media only screen and (max-width: 1440px) {
  .fa-chevron-down {
    left: 35%;
  }
}

@media only screen and (max-width: 1440px) {
  .fa-chevron-down {
    left: 36%;
  }
}

@media only screen and (max-width: 1294px) {
  .fa-chevron-down {
    left: 40%;
  }
}

@media only screen and (max-width: 1120px) {
  .fa-chevron-down {
    left: 50%;
  }
}

@media only screen and (max-width: 1020px) {
  .fa-chevron-down {
    left: 53%;
  }
}

@media only screen and (max-width: 1020px) {
  .fa-chevron-down {
    left: 56%;
  }
}

.card-no-data {
  min-height: 7rem !important;
}

.center-elements-flex {
  display: flex;
  align-items: center;
}

.title-sections {
  height: 2rem;
}

.metrics-dropdown-section {
  align-items: center;
}

.custom-slider {
  width: 100% !important;
}

.add-padding-sliders {
  padding: 0 1.5rem;
}

.icon-svg-warning {
  width: 16px;
}

.alert-20-peers {
  position: fixed;
  // top: 30vh;
  z-index: 9999;
  right: 4rem;
  align-items: center;
  gap: 0.5rem;
}
</style>