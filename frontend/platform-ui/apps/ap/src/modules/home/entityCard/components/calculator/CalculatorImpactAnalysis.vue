<script setup lang="ts">
import AccordionPanel from "@/modules/home/entityCard/components/AccordionPanel.vue";
import Descriptions from "@/modules/home/entityCard/components/Descriptions.vue";
import MatrixTable from "@/modules/home/entityCard/components/MatrixTable.vue";
import IconCheckCircleFill from "@/resources/assets/images/icons/checkDefault.vue";
import VerticalBarChart from "@/modules/components/charts/kendo/VerticalBarChart.vue";
import { isNullOrUndefined } from "@/utils";
import type {
  CalculatorImpactAnalysisOption,
  CalculatorImpactAnalysisState,
} from "@/modules/home/entityCard/components/calculator/calculator-view-types";

defineProps<{
  state: CalculatorImpactAnalysisState;
}>();

const emit = defineEmits<{
  "select-chart": [];
  "update:option-selected": [option: CalculatorImpactAnalysisOption];
  apply: [];
  "supplier-tax-rate-input-changed": [value: any];
  "supplier-wacc-input-changed": [value: any];
}>();
</script>

<template>
  <div class="row">
    <div class="col">
      <div class="card">
        <div class="card-body">
          <div class="row">
            <div class="col">
              <h5 class="text-base font-semibold">{{ $t('global.impactAnalysis') }}</h5>
            </div>
          </div>
          <div class="row mb-4">
            <div class="col-3">
              <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="emit('select-chart')" :class="state.optionSelected === 'chart' ? 'bg-gray-100' : 'bg-white' ">
                <IconCheckCircleFill class="check-svg-small mr-3" v-if="state.optionSelected === 'chart'"></IconCheckCircleFill>
                <div class="unselected-circle-small mr-3 cursor-pointer" v-else></div>
                <div class="d-flex flex-column">
                  <div class="d-flex align-items-center"><span class="text-base font-semibold text-gray-700 cursor-pointer">{{ $t('global.charts') }}          </span></div>
                </div>
              </div>
            </div>
            <div class="col-3">
              <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" id="matrix-calculator" @click="emit('update:option-selected', 'matrix')" :class="state.optionSelected === 'matrix' ? 'bg-gray-100' : 'bg-white' ">
                <IconCheckCircleFill class="check-svg-small mr-3" v-if="state.optionSelected === 'matrix'"></IconCheckCircleFill>
                <div class="unselected-circle-small mr-3 cursor-pointer" v-if="state.optionSelected !== 'matrix'"></div>
                <div class="d-flex flex-column">
                  <div class="d-flex align-items-center"><span class="text-base font-semibold text-gray-700 cursor-pointer">{{ $t('home.entityCard.calculator.economicProfitMatrix') }}                           </span></div>
                </div>
              </div>
            </div>
            <div class="col-3">
              <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="emit('update:option-selected', 'calculation')" :class="state.optionSelected === 'calculation' ? 'bg-gray-100' : 'bg-white'">
                <IconCheckCircleFill class="check-svg-small mr-3" v-if="state.optionSelected === 'calculation'"></IconCheckCircleFill>
                <div class="unselected-circle-small mr-3 cursor-pointer" v-if="state.optionSelected !== 'calculation'"></div>
                <div class="d-flex flex-column">
                  <div class="d-flex align-items-center"><span class="text-base font-semibold text-gray-700 cursor-pointer">{{ $t('home.entityCard.calculator.calculation') }}                          </span></div>
                </div>
              </div>
            </div>
            <div class="col-3">
              <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="emit('update:option-selected', 'descriptions')" :class="state.optionSelected === 'descriptions' ? 'bg-gray-100' : 'bg-white' ">
                <IconCheckCircleFill class="check-svg-small mr-3" v-if="state.optionSelected === 'descriptions'"></IconCheckCircleFill>
                <div class="unselected-circle-small mr-3 cursor-pointer" v-if="state.optionSelected !== 'descriptions'"></div>
                <div class="d-flex flex-column">
                  <div class="d-flex align-items-center"><span class="text-base font-semibold text-gray-700 cursor-pointer">{{ $t('home.entityCard.calculator.descriptions') }}                          </span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="row" v-if="state.optionSelected === 'chart'">
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <VerticalBarChart :categoriesData="state.calculateDataPaymentTermsImpact.yAxis" :chartTitle="'Payment Terms Impact'" :chartType="''" :dataFirstSeries="state.calculateDataPaymentTermsImpact.xAxis" :is-loading="state.loadingCalculation" :xAxisTitle="'Days'" :yAxisTitle="''"></VerticalBarChart>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <VerticalBarChart :categoriesData="state.calculateDataEconomicProfit.yAxis" :chartTitle="'Economic Profit'" :chartType="''" :dataFirstSeries="state.calculateDataEconomicProfit.xAxis" :isBigNumber="true" :isLoading="state.loadingCalculation" :xAxisTitle="'Amount'" :yAxisTitle="''"></VerticalBarChart>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <VerticalBarChart :categoriesData="state.calculateDataCashFlow.yAxis" :chartTitle="'Cash Flow'" :chartType="''" :dataFirstSeries="state.calculateDataCashFlow.xAxis" :isBigNumber="true" :isLoading="state.loadingCalculation" :xAxisTitle="'Amount'" :yAxisTitle="''"></VerticalBarChart>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <VerticalBarChart :categoriesData="state.calculateDataPriceImpact.yAxis" :chartTitle="'Price Impact'" :chartType="''" :dataFirstSeries="state.calculateDataPriceImpact.xAxis" :isBigNumber="true" :isLoading="state.loadingCalculation" :xAxisTitle="'Amount'" :yAxisTitle="''"></VerticalBarChart>
                </div>
              </div>
            </div>
          </div>
          <MatrixTable v-if="state.optionSelected === 'matrix'" :calculate-table="state.calculateTable"></MatrixTable>
          <AccordionPanel v-if="state.optionSelected === 'calculation' && !isNullOrUndefined(state.calculateDataBuyer) && !isNullOrUndefined(state.calculateDataSupplier)" :calculate-data-supplier="state.calculateDataSupplier" :calculate-data="state.calculateDataBuyer" :supplier-tax-rate-min-max-values="state.supplierTaxRateMinMaxValues" :supplier-tax-rate="state.supplierTaxRateInput ?? -1" :supplier-wacc-min-max-values="state.supplierWaccMinMaxValues" :supplier-wacc="state.supplierWaccInput ?? -1" @supplier-tax-rate-input-entered="emit('apply')" @supplier-tax-rate-input-changed="emit('supplier-tax-rate-input-changed', $event)" @supplier-wacc-input-entered="emit('apply')" @supplier-wacc-input-changed="emit('supplier-wacc-input-changed', $event)"></AccordionPanel>
          <Descriptions v-if="state.optionSelected === 'descriptions'"></Descriptions>
        </div>
      </div>
    </div>
  </div>
</template>
