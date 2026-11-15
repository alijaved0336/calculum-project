<script setup lang="ts">
import { Tooltip } from "@progress/kendo-vue-tooltip";
import BigValueLabelOnTop from "@/modules/components/BigValueLabelOnTop.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import IconHandDislike from "@/resources/assets/images/icons/IconHandDislike.vue";
import IconHandLike from "@/resources/assets/images/icons/IconHandLike.vue";
import SkeletonPill from "@/modules/home/components/skeletons/SkeletonPill.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import { isNullOrUndefined, StringUtils } from "@/utils";
import type { CalculatorEconomicProfitState } from "@/modules/home/entityCard/components/calculator/calculator-view-types";

defineProps<{
  state: CalculatorEconomicProfitState;
}>();
</script>

<template>
  <div class="col-xl-6">
    <div class="card flex-grow-1 card-right-container h-100">
      <div class="card-body d-flex flex-column">
        <div class="row">
          <div class="col-4">
            <h5 class="font-semibold text-base text-gray-600">{{ $t('home.entityCard.calculator.economicProfit') }}
              <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.economicProfit')" :advancedTooltipClass="false"></CalculumTooltipIcon>
            </h5>
          </div>
          <div class="col-8">
            <div class="d-flex align-items-center justify-content-end gap-2"><span class="font-semibold text-base">{{ `${$t('global.annualSpendVolume')} ${state.showForecastVolume ? " (F)" : "" }    ` }}
                <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.annualSpendVolume')" :advancedTooltipClass="false"></CalculumTooltipIcon></span>
              <template v-if="!state.loadingCalculation">
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="font-semibold text-base text-gray-700" :title="!state.showVolumes ? $t('global.notAvailable') : `${state.buyerAnnualVolumeThousandFormatted}`">{{ state.headerAnnualSpendVolumeFormatted }}</span></Tooltip>
              </template>
              <SkeletonRectangle v-else :size="'sm'"></SkeletonRectangle>
            </div>
          </div>
        </div>
        <div class="row flex-grow-1">
          <div class="col-12 px-4 py-auto d-flex flex-column">
            <div class="row my-auto flex-grow-1 bg-gray-50 border-gray-100 rounded-xl p-1">
              <div class="col-6 d-flex flex-column p-5 justify-content-center rounded-lg bg-white border-gray-100">
                <div class="my-auto">
                  <div class="row">
                    <div class="col">
                      <BigValueLabelOnTop class="mb-2" :is-loading="state.loadingCalculation" :label="$t('global.buyerCalculator')" :value="state.buyerEconomicProfitFormatted" :valueSize="'4xl'"></BigValueLabelOnTop>
                    </div>
                  </div>
                  <div class="row mb-2">
                    <div class="col text-center d-flex align-items-center justify-content-center"><span class="mr-2">{{ $t('home.entityCard.calculator.percentageOfSpend') }}</span><span class="font-semibold" v-if="!state.loadingCalculation">{{ state.buyerEconomicProfitAsPercentFormatted }}</span>
                      <SkeletonRectangle v-else :size="'sm'"></SkeletonRectangle>
                    </div>
                  </div>
                  <div class="row mb-4" v-if="state.loadingCalculation || !isNullOrUndefined(state.supplierEconomicStatusIsGood)">
                    <div class="col d-flex justify-content-center">
                      <div class="status-box d-flex gap-2 rounded-full px-6 py-2" v-if="!state.loadingCalculation" :class="state.buyerEconomicStatusIsGood ? 'status-box-good' : 'status-box-not-good'">
                        <IconHandLike class="w-4" v-if="state.buyerEconomicStatusIsGood"></IconHandLike>
                        <IconHandDislike class="w-4" v-else></IconHandDislike>
                        <!-- span.text-lg.font-bold {{ buyerEconomicStatusIsGood ? $t("global.good") : $t("global.notGood") }}-->
                      </div>
                      <SkeletonPill v-else :size="'lg'"></SkeletonPill>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-6 d-flex">
                    <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="$t('home.entityCard.calculator.cashFlowImpactChangesinAP')" :value="isNullOrUndefined(state.calculateDataBuyer?.cashFlowImpact) ? $t('global.notAvailable') : StringUtils.formatBigNumbers(state.calculateDataBuyer?.cashFlowImpact)"></BigValueLabelOnTop>
                  </div>
                  <div class="col-6 d-flex">
                    <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="$t('home.entityCard.calculator.costImpactChangeinDiscount')" :value="isNullOrUndefined(state.calculateDataBuyer?.costImpact) ? $t('global.notAvailable') : StringUtils.formatBigNumbers(state.calculateDataBuyer?.costImpact)"></BigValueLabelOnTop>
                  </div>
                </div>
              </div>
              <div class="col-6 d-flex flex-column p-5 justify-content-center">
                <div class="my-auto">
                  <div class="row">
                    <div class="col">
                      <BigValueLabelOnTop class="mb-2" :is-loading="state.loadingCalculation" :label="$t('global.supplier')" :value="state.supplierEconomicProfitFormatted" :valueSize="'4xl'"></BigValueLabelOnTop>
                    </div>
                  </div>
                  <div class="row mb-2">
                    <div class="col text-center d-flex align-items-center justify-content-center"><span class="mr-2">{{ $t('home.entityCard.calculator.percentageOfSpend') }}</span><span class="font-semibold" v-if="!state.loadingCalculation">{{ state.supplierEconomicProfitAsPercentFormatted }}</span>
                      <SkeletonRectangle v-else :size="'sm'"></SkeletonRectangle>
                    </div>
                  </div>
                  <div class="row mb-4" v-if="state.loadingCalculation || !isNullOrUndefined(state.supplierEconomicStatusIsGood)">
                    <div class="col d-flex justify-content-center">
                      <div class="status-box d-flex gap-2 rounded-full px-6 py-2" v-if="!state.loadingCalculation" :class="state.supplierEconomicStatusIsGood ? 'status-box-good' : 'status-box-not-good'">
                        <IconHandLike class="w-4" v-if="state.supplierEconomicStatusIsGood"></IconHandLike>
                        <IconHandDislike class="w-4" v-else></IconHandDislike>
                        <!-- span.text-lg.font-bold {{ supplierEconomicStatusIsGood ? $t("global.good") : $t("global.notGood") }}                       -->
                      </div>
                      <SkeletonPill v-else :size="'lg'"></SkeletonPill>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-6 d-flex">
                    <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="$t('home.entityCard.calculator.cashFlowImpactChangesinAP')" :value="isNullOrUndefined(state.calculateDataSupplier?.cashFlowImpact) ? $t('global.notAvailable') : StringUtils.formatBigNumbers(state.calculateDataSupplier?.cashFlowImpact)"></BigValueLabelOnTop>
                  </div>
                  <div class="col-6 d-flex">
                    <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="$t('home.entityCard.calculator.costImpactChangeinDiscount')" :value="isNullOrUndefined(state.calculateDataSupplier?.costImpact) ? $t('global.notAvailable') : StringUtils.formatBigNumbers(state.calculateDataSupplier?.costImpact)"></BigValueLabelOnTop>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.card-right-container {
  min-height: 34rem;
}

.status-box {
  &-not-good {
    background: $color-primary-75;
    color: $color-primary-700;
  }

  &-good {
    background: $color-teal-75;
    color: $color-teal-700;
  }
}
</style>
