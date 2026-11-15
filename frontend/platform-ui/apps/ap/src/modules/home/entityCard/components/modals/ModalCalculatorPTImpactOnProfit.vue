<template>
<CalculumModal :size="'lg'" :showClose="true" :title="'Impact of Payment Terms on Economic Profit'" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="mb-4">
      <div class="row">
        <div class="col-12">
          <h5 class="text-base font-semibold mb-4"><span class="mr-1">{{ $t('global.contractualPaymentTerms') }} </span><span class="lowercase">({{ $t('global.days') }})</span></h5>
        </div>
      </div>
      <div class="row">
        <div class="col-12 d-flex">
          <div class="w-9"></div>
          <div class="d-flex flex-grow-1 px-4 py-2 justify-content-between">
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="$t('global.current')" :value="isNullOrUndefined(buyerTermsContractual) ? $t('global.notAvailable') : `${buyerTermsContractual}`" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="'Change'" :value="isNullOrUndefined(buyerChangeInTermsInput) ? $t('global.notAvailable') : `${buyerChangeInTermsInput}`" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="'New'" :value="buyerChangeInTermsResultFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mb-4">
      <div class="row">
        <div class="col-12">
          <h5 class="text-base font-semibold"><span class="mr-1">{{ $t('global.actualPaymentTerms') }}</span><span class="lowercase">({{ $t('global.days') }})</span></h5>
        </div>
      </div>
      <div class="row">
        <div class="col-12 d-flex">
          <div class="d-flex px-2 min-h-24 justify-content-center bg-blue-500 text-white rounded-tl-xl" style="writing-mode: vertical-rl;"><span class="text-sm rotate-180">{{ $t('global.buyer') }}</span></div>
          <div class="d-flex flex-grow-1 py-2 px-4 justify-content-between border rounded-tr-xl">
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="$t('global.newContract')" :value="buyerChangeInTermsResultFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="'Change in Payment Float'" :value="buyerFloatFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="'Actual Days Paid by Buyer'" :value="buyerActualDaysPaidByBuyerFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12 d-flex">
          <div class="d-flex px-2 min-h-24 justify-content-center bg-indigo-500 text-white rounded-bl-xl align-items-center" style="writing-mode: vertical-rl;"><span class="text-sm rotate-180">{{ $t('global.supplier') }}</span></div>
          <div class="d-flex flex-grow-1 py-2 px-4 justify-content-between border rounded-br-xl">
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="'New Contract'" :value="buyerChangeInTermsResultFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="'Potential Days Financed'" :value="supplierPotentialDaysFinancedFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="'Actual Days Payment Received by Supplier'" :value="supplierActualDaysPaymentReceivedSupplierFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mb-4">
      <div class="row">
        <div class="col-12">
          <h5 class="text-base font-semibold"><span class="mr-1">{{ $t('home.entityCard.calculator.priceChange') }} (%)</span></h5>
        </div>
      </div>
      <div class="row">
        <div class="col-12 d-flex">
          <div class="d-flex min-h-24 px-2 justify-content-center bg-blue-500 text-white rounded-tl-xl" style="writing-mode: vertical-rl;"><span class="text-sm rotate-180">{{ $t('global.buyer') }}</span></div>
          <div class="row flex-grow-1 mx-0 py-2 px-4 justify-content-between border rounded-tr-xl">
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="buyerRebateLabel" :value="buyerRebateFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="$t('global.additionalChange')" :value="buyerPriceChangeFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="$t('global.total')" :value="buyerPriceChangeResultFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12 d-flex">
          <div class="d-flex min-h-24 px-2 py-4 justify-content-center bg-indigo-500 text-white rounded-bl-xl" style="writing-mode: vertical-rl;"><span class="text-sm rotate-180">{{ $t('global.supplier') }}</span></div>
          <div class="row mx-0 flex-grow-1 py-2 px-4 justify-content-between border rounded-br-xl">
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="supplierCostLabel" :value="supplierCostFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="$t('global.additionalChange')" :value="supplierCostChangeFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-1 d-flex">
              <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
            <div class="col-3 d-flex">
              <BigValueLabelOnTop :is-loading="loadingCalculation" :label="$t('global.total')" :value="supplierCostTotalFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { isNullOrUndefined } from "@/utils";
import BigValueLabelOnTop from "@/modules/components/BigValueLabelOnTop.vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";

export default defineComponent({
  name: "ModalCalculatorPTImpactOnProfit",
  components: {
    BigValueLabelOnTop,
    CalculumModal,
  },
  props: {
    loadingCalculation: {
      type: Boolean,
      default: false,
    },
    //
    // Buyer
    //
    buyerActualDaysPaidByBuyerFormatted: {
      type: String,
      required: true,
    },
    buyerChangeInTermsInput: {
      type: [Number, null] as PropType<number | null>,
      required: true,
    },
    buyerChangeInTermsResultFormatted: {
      type: String,
      required: true,
    },
    buyerFloatFormatted: {
      type: String,
      required: true,
    },
    buyerPriceChangeFormatted: {
      type: String,
      required: true,
    },
    buyerPriceChangeResultFormatted: {
      type: String,
      required: true,
    },
    buyerRebateFormatted: {
      type: String,
      required: true,
    },
    buyerRebateLabel: {
      type: String,
      required: true,
    },
    buyerTermsContractual: {
      type: [Number, null] as PropType<number | null>,
      required: true,
    },
    //
    // Supplier
    //
    supplierPotentialDaysFinancedFormatted: {
      type: String,
      required: true,
    },
    supplierActualDaysPaymentReceivedSupplierFormatted: {
      type: String,
      required: true,
    },
    supplierCostChangeFormatted: {
      type: String,
      required: true,
    },
    supplierCostFormatted: {
      type: String,
      required: true,
    },
    supplierCostLabel: {
      type: String,
      required: true,
    },
    supplierCostTotalFormatted: {
      type: String,
      required: true,
    },
  },
  emits: ["close"],
  setup() {
    return {
      isNullOrUndefined,
    };
  },
});
</script>
