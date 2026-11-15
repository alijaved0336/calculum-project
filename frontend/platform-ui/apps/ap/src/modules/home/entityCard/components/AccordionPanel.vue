<template>
<div class="row">
  <div class="col-6">
    <h5 class="text-base font-semibold mb-4">{{ $t('global.buyerCalculator') }}</h5>
    <AccordionItem class="mb-4" :initially-open="true" :is-parent="true">
      <template #header=""><span class="text-xs font-bold text-gray-500">{{ $t('home.entityCard.calculator.capitalInvestments') }} </span></template>
      <template #body="">
        <AccordionItem :initially-open="true">
          <template #header=""><span class="text-xs font-semibold text-gray-500">{{ $t('home.entityCard.calculator.accountsPayableAP') }}</span></template>
          <template #body="">
            <div class="d-flex flex-column">
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.currentAverage') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.currentAverageTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateData.currentAverage ?? 0,1) }}</span></div>
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.proposedAverage') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.proposedAverageTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateData.proposedAverage ?? 0,1) }}</span></div>
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.changesInAP') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changesInAPTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateData.cashFlowImpact ?? 0,1) }}</span></div>
              <div class="item-line last-line total-item"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.totalChangeInCapital') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.totalChangeInCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700" id="totalChangeInCapital">{{ formatData.getNumberWithDecimals(calculateData.totalChangeInCapital ?? 0,1) }}</span></div>
            </div>
          </template>
        </AccordionItem>
        <AccordionItem :initially-open="true">
          <template #header=""><span class="text-xs font-semibold text-gray-500">{{ $t('home.entityCard.calculator.costOfCapital') }}
              <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.costOfCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></template>
          <template #body="">
            <div class="d-flex flex-column">
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.changeInCapital') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateData.totalChangeInCapital ?? 0,1) }}</span></div>
              <div class="item-line last-line h-12"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.costOfCapitalBuyer') }} (%)
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.costOfCapitalBuyerTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.converToPercentage(calculateData.wacc ?? 0 ) }}</span></div>
            </div>
          </template>
        </AccordionItem>
      </template>
      <template #footer=""><span class="text-sm font-medium text-gray-700">{{ $t('home.entityCard.calculator.changeInValueOfInvestedCapital') }}
          <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInValueOfInvestedCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-bold text-gray-700">{{ formatData.getNumberWithDecimals(calculateData.changeInValueOfInvestedCapital ?? 0, 1) }}   </span></template>
    </AccordionItem>
    <AccordionItem :initially-open="true" :is-parent="true">
      <template #header=""><span class="text-xs font-bold text-gray-500">{{ $t('home.entityCard.calculator.afterTaxOperatingProfits') }}
          <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.afterTaxOperatingProfitsTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></template>
      <template #body="">
        <AccordionItem :initially-open="true">
          <template #header=""><span class="text-xs font-semibold text-gray-500">{{ $t('home.entityCard.calculator.changeInDiscount') }}
              <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInDiscountTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></template>
          <template #body="">
            <div class="d-flex flex-column">
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.costImpactChangeinDiscount') }} </span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateData.costImpact ?? 0, 1) }}                              </span></div>
              <div class="item-line last-line h-12"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.taxRate') }} (%)
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.taxRateTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.converToPercentage(calculateData.taxRate ?? 0 ) }}</span></div>
            </div>
          </template>
        </AccordionItem>
      </template>
      <template #footer=""><span class="text-sm font-medium text-gray-700">{{ $t('home.entityCard.calculator.changeInAfterTaxOperatingProfit') }}
          <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInAfterTaxOperatingProfitTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-bold text-gray-700" id="changeInAfterTaxOperatingProfit">{{ formatData.getNumberWithDecimals(calculateData.changeInAfterTaxOperatingProfit ?? 0,1) }}   </span></template>
    </AccordionItem>
  </div>
  <div class="col-6">
    <h5 class="text-base font-semibold mb-4">{{ $t('global.supplier') }}</h5>
    <AccordionItem class="mb-4" :initially-open="true" :is-parent="true">
      <template #header=""><span class="text-xs font-bold text-gray-500">{{ $t('home.entityCard.calculator.capitalInvestments') }} </span></template>
      <template #body="">
        <AccordionItem :initially-open="true">
          <template #header=""><span class="text-xs font-semibold text-gray-500">{{ $t('home.entityCard.calculator.accountsPayableAP') }}</span></template>
          <template #body="">
            <div class="d-flex flex-column">
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.currentAverage') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.currentAverageTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateDataSupplier.currentAverage ?? 0,1) }}</span></div>
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.proposedAverage') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.proposedAverageTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateDataSupplier.proposedAverage ?? 0,1) }}</span></div>
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.changesInAP') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changesInAPTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateDataSupplier.cashFlowImpact ?? 0,1) }}</span></div>
              <div class="item-line last-line total-item"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.totalChangeInCapital') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.totalChangeInCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700" id="totalChangeInCapital-supplier">{{ formatData.getNumberWithDecimals(calculateDataSupplier.totalChangeInCapital ?? 0,1) }}</span></div>
            </div>
          </template>
        </AccordionItem>
        <AccordionItem :initially-open="true">
          <template #header=""><span class="text-xs font-semibold text-gray-500">{{ $t('home.entityCard.calculator.costOfCapital') }}
              <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.costOfCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></template>
          <template #body="">
            <div class="d-flex flex-column">
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.changeInCapital') }}
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateDataSupplier.totalChangeInCapital ?? 0, 1) }}</span></div>
              <div class="item-line last-line h-12 pr-4"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.costOfCapitalSupplier') }} (%)</span>
                <div class="d-flex gap-2 align-items-center">
                  <NumericTextBox :disabled="supplierWacc === -1" :format="'n2'" :max="supplierWaccMinMaxValues.max * 100" :min="supplierWaccMinMaxValues.min * 100" :step="1" :style="{ width: '100px' }" :value="(supplierWacc ?? 0) * 100" @change="supplierWaccInputOnChange" @keydown.enter="supplierWaccInputOnEnter"></NumericTextBox>
                </div>
              </div>
            </div>
          </template>
        </AccordionItem>
      </template>
      <template #footer=""><span class="text-sm font-medium text-gray-700">{{ $t('home.entityCard.calculator.changeInValueOfInvestedCapital') }}
          <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInValueOfInvestedCapitalTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-bold text-gray-700">{{ formatData.getNumberWithDecimals(calculateDataSupplier.changeInValueOfInvestedCapital ?? 0, 1) }}   </span></template>
    </AccordionItem>
    <AccordionItem :initially-open="true" :is-parent="true">
      <template #header=""><span class="text-xs font-bold text-gray-500">{{ $t('home.entityCard.calculator.afterTaxOperatingProfits') }}
          <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.afterTaxOperatingProfitsTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></template>
      <template #body="">
        <AccordionItem :initially-open="true">
          <template #header=""><span class="text-xs font-semibold text-gray-500">{{ $t('home.entityCard.calculator.changeInDiscount') }}
              <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInDiscountTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></template>
          <template #body="">
            <div class="d-flex flex-column">
              <div class="item-line"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.costImpactChangeinDiscount') }} </span><span class="text-sm font-semibold text-gray-700">{{ formatData.getNumberWithDecimals(calculateDataSupplier.costImpact ?? 0, 1) }}                              </span></div>
              <div class="item-line last-line h-12 pr-4"><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.taxRate') }} (%)
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.taxRateTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span>
                <div class="d-flex gap-2 align-items-center">
                  <NumericTextBox :disabled="supplierTaxRate === -1" :format="'n2'" :max="supplierTaxRateMinMaxValues.max * 100" :min="supplierTaxRateMinMaxValues.min * 100" :step="1" :style="{ width: '100px' }" :value="(supplierTaxRate ?? 0) * 100" @change="supplierTaxRateInputOnChange" @keydown.enter="supplierTaxRateInputOnEnter"></NumericTextBox>
                </div>
              </div>
            </div>
          </template>
        </AccordionItem>
      </template>
      <template #footer=""><span class="text-sm font-medium text-gray-700">{{ $t('home.entityCard.calculator.changeInAfterTaxOperatingProfit') }}
          <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.changeInAfterTaxOperatingProfitTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span><span class="text-sm font-bold text-gray-700" id="changeInAfterTaxOperatingProfit-supplier">{{ formatData.getNumberWithDecimals(calculateDataSupplier.changeInAfterTaxOperatingProfit ?? 0,1) }}   </span></template>
    </AccordionItem>
  </div>
</div>
</template>

<script lang="ts">
// Types
import { CalculateDataEntity } from "@/modules/home/entityCard/types";

import { defineComponent, PropType } from "vue";
import { isNullOrUndefined } from "@/utils";
import { NumericTextBox } from "@progress/kendo-vue-inputs";
import * as formatData from "@/utils/FormatData";
import AccordionItem from "./AccordionItem.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";

export default defineComponent({
  name: "AccordionPanel",
  components: {
    AccordionItem,
    CalculumTooltipIcon,
    NumericTextBox,
  },
  props: {
    calculateData: {
      type: Object as PropType<Partial<CalculateDataEntity>>,
      required: true,
      default: () => {},
    },
    calculateDataSupplier: {
      type: Object as PropType<Partial<CalculateDataEntity>>,
      required: true,
      default: () => {},
    },
    supplierWacc: {
      type: Number,
      required: true,
    },
    supplierWaccMinMaxValues: {
      type: Object as PropType<{
        min: number;
        max: number;
      }>,
      required: true,
    },
    supplierTaxRate: {
      type: Number,
      required: true,
    },
    supplierTaxRateMinMaxValues: {
      type: Object as PropType<{
        min: number;
        max: number;
      }>,
      required: true,
    },
  },
  emits: [
    "supplier-tax-rate-input-entered",
    "supplier-tax-rate-input-changed",
    "supplier-wacc-input-entered",
    "supplier-wacc-input-changed",
  ],
  setup(props, { emit }) {
    return {
      formatData,
      isNullOrUndefined,
      supplierWaccInputOnEnter: (value: number) => {
        emit("supplier-wacc-input-entered", value);
      },
      supplierWaccInputOnChange: (value: number) => {
        emit("supplier-wacc-input-changed", value);
      },
      supplierTaxRateInputOnEnter: (value: number) => {
        emit("supplier-tax-rate-input-entered", value);
      },
      supplierTaxRateInputOnChange: (value: number) => {
        emit("supplier-tax-rate-input-changed", value);
      },
    };
  },
});
</script>
