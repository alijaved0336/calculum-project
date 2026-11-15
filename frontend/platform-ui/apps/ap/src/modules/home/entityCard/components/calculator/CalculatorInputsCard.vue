<script setup lang="ts">
import { NumericTextBox } from "@progress/kendo-vue-inputs";
import BigValueLabelOnTop from "@/modules/components/BigValueLabelOnTop.vue";
import CalculumDropDownButton from "@/modules/components/buttons/CalculumDropDownButton.vue";
import CalculumDropDownList from "@/modules/components/dropdown/CalculumDropDownList.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import InformationCircleSvg from "@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue";
import SkeletonPill from "@/modules/home/components/skeletons/SkeletonPill.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import { ArrayUtils, isNullOrUndefined, StringUtils } from "@/utils";
import type {
  CalculatorInputsHandlers,
  CalculatorInputsState,
} from "@/modules/home/entityCard/components/calculator/calculator-view-types";

defineProps<{
  state: CalculatorInputsState;
  handlers: CalculatorInputsHandlers;
}>();

const emit = defineEmits<{
  apply: [];
  undo: [];
  "show-details": [];
}>();
</script>

<template>
  <div class="col-xl-6">
    <div class="card card-right-container h-100">
      <div class="card-body d-flex flex-column">
        <div class="d-flex mb-4 justify-content-between">
          <h5 class="text-base font-semibold mb-4"><span class="mr-1">{{ $t('global.contractualPaymentTerms') }} </span><span class="lowercase">({{ $t('global.days') }})
              <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.contractualPaymentTermsDays')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></h5>
          <CalculumDropDownButton v-if="!state.isManualInputMode" :data-list="state.calculatorActionsDropdownOptions" @item-clicked="handlers.calculatorActionsDropdownOptionOnClick"></CalculumDropDownButton>
        </div>
        <div class="row justify-content-between mb-4 flex-grow-1">
          <div class="col-8 d-flex flex-column">
            <div class="row mb-2">
              <div class="col-12">
                <h6 class="text-sm font-semibold text-gray-600 d-flex align-items-center"><span class="mr-1">{{ $t('home.entityCard.calculator.actualPaymentTerms') }}</span>
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.actualPaymentTermsTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon>
                </h6>
              </div>
            </div>
            <div class="row mb-4 center-input-values">
              <div class="col-2">
                <BigValueLabelOnTop v-if="!state.isManualInputMode" :is-loading="state.loadingCalculation" :label="'Current'" :value="isNullOrUndefined(state.buyerTermsContractual) ? $t('global.notAvailable') : `${state.buyerTermsContractual}`" :valueSize="'3xl'"></BigValueLabelOnTop>
                <div class="d-flex flex-column flex-grow-1" v-else><span class="mb-2 min-h-4 mt-auto text-center text-gray-500 text-xs">{{ 'Current' }}</span>
                  <div class="d-flex text-center justify-content-center align-items-end">
                    <NumericTextBox :max="365" :min="0" :step="1" :style="{ width: '100px' }" :valid="!state.manualFieldErrors.contractualPaymentTerms" :value="state.manualContractualPaymentTermsInput" @change="handlers.manualContractualPaymentTermsOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                  </div>
                </div>
              </div>
              <div class="col-2">
                <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
              </div>
              <div class="col-4">
                <div class="d-flex flex-column flex-grow-1"><span class="mb-2 min-h-4 mt-auto text-center text-gray-500 text-xs">{{ $t('global.change') }}</span>
                  <div class="d-flex text-center justify-content-center align-items-end">
                    <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.buyerChangeInTerms)" :max="state.buyerChangeInTermsMinMaxValues.max" :min="state.buyerChangeInTermsMinMaxValues.min" :step="1" :style="{ width: '100px' }" :valid="!state.isManualInputMode || !state.manualFieldErrors.changeInTerms" :value="state.buyerChangeInTermsInput" @change="handlers.buyerChangeInTermsInputOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                    <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
              </div>
              <div class="col-2">
                <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
              </div>
              <div class="col-2">
                <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="'New'" :value="state.buyerChangeInTermsResultFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
              </div>
            </div>
            <div class="row mb-3" v-if="state.potentialTheme">
              <div class="col-12">
                <h6 class="text-sm font-semibold text-gray-600 d-flex align-items-center"><span class="mr-1">{{ $t('home.entityCard.calculator.spendVolume') }}</span>
                  <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.spendVolumeTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon>
                </h6>
              </div>
            </div>
            <div class="row mb-4 center-input-values" v-if="state.potentialTheme">
              <div class="col-2">
                <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="'Current'" :value="isNullOrUndefined(state.spendVolumeCurrentFrozen) ? $t('global.notAvailable') : StringUtils.formatBigNumbers(state.spendVolumeCurrentFrozen)" :valueSize="'3xl'"></BigValueLabelOnTop>
              </div>
              <div class="col-2">
                <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
              </div>
              <div class="col-4">
                <div class="d-flex flex-column flex-grow-1"><span class="mb-2 min-h-4 mt-auto text-center text-gray-500 text-xs">{{ $t('global.change') }}</span>
                  <div class="d-flex text-center justify-content-center align-items-end">
                    <NumericTextBox  v-if="!state.calculatorValuesInitialDataIsLoading" :step="1" :style="{ width: '100px' }" :value="state.spendVolumeChangeInput" @change="handlers.spendVolumeChangeInputOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                 <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
              </div>
              <div class="col-2">
                <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
              </div>
              <div class="col-2">
                <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="'New'" :value="state.spendVolumeNewFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
              </div>
            </div>
            <div class="my-auto">
              <div class="row mb-2">
                <div class="col-12">
                  <h5 class="text-base font-semibold mb-4 d-flex">{{ $t('global.priceChange') }} (%)
                    <CalculumTooltipIcon :infoText="$t('home.entityCard.calculator.priceChangeTooltip')"></CalculumTooltipIcon>
                  </h5>
                </div>
              </div>
              <div class="row">
                <div class="col-12 d-flex">
                  <div class="d-flex min-h-24 px-2 justify-content-center bg-blue-500 text-white" style="writing-mode: vertical-rl;" :class="state.calculationTypeDropdownOptionSelectedKey === 'none' ? 'rounded-tl-full-xl' : 'rounded-tl-xl'"><span class="text-xs rotate-180">{{ $t('global.buyerCalculator') }}</span></div>
                  <div class="row mx-0 flex-grow-1 py-2 px-4 justify-content-between border" :class="state.calculationTypeDropdownOptionSelectedKey === 'none' ? 'rounded-full-xl' : 'rounded-tr-xl'">
                    <div class="col-3">
                      <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="state.buyerRebateLabel" :value="state.buyerRebateFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                    <div class="col-2">
                      <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                    <div class="col-3">
                      <div class="d-flex flex-column flex-grow-1"><span class="mb-2 min-h-4 mt-auto text-center text-gray-500 text-xs">{{ $t('global.additional') }}</span>
                        <div class="d-flex text-center justify-content-center align-items-end">
                          <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.buyerPriceChangeInput)" :format="'n2'" :max="state.buyerPriceChangeMaxValue * 100" :min="state.buyerPriceChangeMinValue * 100" :style="{ width: '100px' }" :valid="!state.isManualInputMode || !state.manualFieldErrors.priceChange" :value="(state.buyerPriceChangeInput ?? 0) * 100" @change="handlers.buyerPriceChangeInputOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                          <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                        </div>
                      </div>
                    </div>
                    <div class="col-2">
                      <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                    <div class="col-2">
                      <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="'Total'" :value="state.buyerPriceChangeResultFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row" v-if="state.calculationTypeDropdownOptionSelectedKey === 'vCard' || state.calculationTypeDropdownOptionSelectedKey === 'scf'">
                <div class="col-12 d-flex">
                  <div class="d-flex min-h-24 px-2 py-4 justify-content-center bg-indigo-500 text-white rounded-bl-xl" style="writing-mode: vertical-rl;"><span class="text-xs rotate-180">{{ $t('global.supplier') }}</span></div>
                  <div class="row mx-0 flex-grow-1 py-2 px-4 justify-content-between border rounded-br-xl">
                    <div class="col-3 row-100">
                      <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="state.supplierCostLabel" :value="state.supplierCostFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                    <div class="col-2">
                      <BigValueLabelOnTop :label="''" :value="'+'" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                    <div class="col-3">
                      <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="$t('global.additional')" :value="state.supplierCostChangeFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                    <div class="col-2">
                      <BigValueLabelOnTop :label="''" :value="'='" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                    <div class="col-2">
                      <BigValueLabelOnTop :is-loading="state.loadingCalculation" :label="$t('global.total')" :value="state.supplierCostTotalFormatted" :valueSize="'3xl'"></BigValueLabelOnTop>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-4">
            <div class="d-flex flex-column flex-grow-1 rounded-lg min-h-64 py-2 px-4 ml-4 bg-gray-50">
              <div class="row mb-2" v-if="!state.isManualInputMode">
                <div class="col-12"><span class="text-sm">{{ $t('home.entityCard.calculator.calculationTypeDropdownDescription') }}</span>
                  <CalculumDropDownList class="mt-2" :current-option-selected="state.calculationTypeDropdownOptionSelected" :data-list="state.calculationTypeDropdownOptions" :disabled="isNullOrUndefined(state.calculationTypeDropdownOptionSelected) || ArrayUtils.hasOnlyOneItem(state.calculationTypeDropdownOptions ?? [])" :id="'appliedProgramDropdown'" :is-loading="state.calculationTypeDropdownIsLoading" @selected-item="handlers.calculationTypeDropdownOptionSelectedOnChange"></CalculumDropDownList>
                </div>
              </div>
              <template v-if="state.isManualInputMode">
                <div class="row mb-2">
                  <div class="col-12"><span class="mr-1 text-sm">{{ $t('home.entityCard.calculator.costOfCapitalBuyer') }}</span><span class="lowercase text-sm">(%)</span></div>
                  <div class="col-12">
                    <NumericTextBox :format="'n2'" :max="state.supplierWaccMinMaxValues.max * 100" :min="state.supplierWaccMinMaxValues.min * 100" :step="1" :style="{ width: '100px' }" :valid="!state.manualFieldErrors.supplierWacc" :value="(state.supplierWaccInput ?? 0) * 100" @change="handlers.supplierWaccInputOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12"><span class="mr-1 text-sm">{{ $t('home.entityCard.calculator.taxRate') }}</span><span class="lowercase text-sm">(%)</span></div>
                  <div class="col-12">
                    <NumericTextBox :format="'n2'" :max="state.supplierTaxRateMinMaxValues.max * 100" :min="state.supplierTaxRateMinMaxValues.min * 100" :step="1" :style="{ width: '100px' }" :valid="!state.manualFieldErrors.supplierTaxRate" :value="(state.supplierTaxRateInput ?? 0) * 100" @change="handlers.supplierTaxRateInputOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                  </div>
                </div>
              </template>
              <template v-if="state.calculationTypeDropdownOptionSelectedKey === 'vCard'">
                <div class="row mb-2">
                  <div class="col-12"><span class="mr-1 text-sm">{{ $t('home.entityCard.calculator.paymentCycleFloat') }}</span><span class="lowercase text-sm">({{ $t('global.days') }})</span></div>
                  <div class="col-12">
                    <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.vCardPaymentCycleFloat)" :min="state.vCardPaymentCycleFloatMinMaxValues.min" :step="1" :style="{ width: '100px' }" :value="state.vCardPaymentCycleFloat" @change="handlers.vCardPaymentCycleFloatOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                    <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
                <div class="row mb-2">
                  <div class="col-12"><span class="text-sm">{{ $t('global.supplierCardCost') }} (%)
                      <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.supplierCardCost')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                  <div class="col-12">
                    <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.vCardSupplierCardCost)" :format="'n2'" :max="state.vCardSupplierCardCostMinMaxValues.max * 100" :min="state.vCardSupplierCardCostMinMaxValues.min * 100" :style="{ width: '100px' }" :value="(state.vCardSupplierCardCost ?? 0) * 100" @change="handlers.vCardSupplierCardCostOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                    <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
                <div class="row mb-2">
                  <div class="col-12"><span class="text-sm">{{ $t('global.rebate') }} (%)
                      <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.rebate')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                  <div class="col-12">
                    <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.vCardRebate)" :format="'n2'" :max="state.vCardRebateMinMaxValues.max * 100" :min="state.vCardRebateMinMaxValues.min * 100" :style="{ width: '100px' }" :value="(state.vCardRebate ?? 0) * 100" @change="handlers.vCardRebateOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                    <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12"><span class="text-sm">{{ $t('home.entityCard.calculator.vCardGroup') }}
                      <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.vcardGroup')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                  <div class="col-12">
                    <div class="rounded-full bg-bluelight-200 px-3 text-center" v-if="!state.calculatorValuesInitialDataIsLoading"><span class="font-bold">{{ state.vCardGroupNameFormatted }}</span></div>
                    <SkeletonPill class="w-100" v-else :size="'sm'"></SkeletonPill>
                  </div>
                </div>
              </template>
              <template v-if="state.calculationTypeDropdownOptionSelectedKey === 'scf'">
                <div class="row mb-4">
                  <div class="col-12"><span class="text-sm">{{ $t('home.entityCard.calculator.earliestDayPaid') }}
                      <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.earliestDayPaid')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                  <div class="col-12">
                    <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.scfEarliestDayPaid)" :min="state.scfEarliestDayPaidMinMaxValues.min" :step="1" :style="{ width: '100px' }" :value="state.scfEarliestDayPaid ?? 0" @change="handlers.scfEarliestDayPaidOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                    <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
                <div class="row mb-4">
                  <div class="col-12"><span class="text-sm">{{ $t('global.supplierFinancingRate') }} (%)
                      <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.supplierFinancingRate')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                  <div class="col-12">
                    <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.scfFinancingRate)" :format="'n2'" :max="state.scfFinancingRateMinMaxValues.max * 100" :min="state.scfFinancingRateMinMaxValues.min * 100" :style="{ width: '100px' }" :value="(state.scfFinancingRate ?? 0) * 100" @change="handlers.scfFinancingRateOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                    <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
                <div class="row mb-4">
                  <div class="col-12"><span class="text-sm">{{ $t('global.rate') }} (%)
                      <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.scfRate')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                  <div class="col-12">
                    <NumericTextBox v-if="!state.calculatorValuesInitialDataIsLoading" :disabled="isNullOrUndefined(state.scfRate)" :format="'n2'" :max="state.scfRateMinMaxValues.max * 100" :min="state.scfRateMinMaxValues.min * 100" :style="{ width: '100px' }" :value="(state.scfRate ?? 0) * 100" @change="handlers.scfRateOnChange" @keydown.enter="emit('apply')"></NumericTextBox>
                    <SkeletonRectangle v-else :size="'lg'"></SkeletonRectangle>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12 mb-1"><span class="text-sm">{{ $t('home.entityCard.calculator.scfGroup') }}
                      <CalculumTooltipIcon :infoText="$t('global.entityCardCalculatorTooltips.scfGroup')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                  <div class="col-12">
                    <div class="rounded-full bg-bluelight-200 px-3 text-center" v-if="!state.calculatorValuesInitialDataIsLoading"><span class="font-bold">{{ state.scfGroupNameFormatted }}</span></div>
                    <SkeletonPill v-else :size="'lg'"></SkeletonPill>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12 d-flex justify-content-between">
            <button class="btn-text d-flex gap-2 ml-auto align-items-center text-sm text-capitalize text-gray-500" type="button" @click="emit('show-details')"><span>{{ $t('home.entityCard.showDetails') }}</span>
              <InformationCircleSvg class="w-4 icon-svg fill-current"></InformationCircleSvg>
            </button>
            <div class="d-flex gap-2 justify-content-end">
              <button class="btn outline-secondary-btn font-md w-fit" v-if="state.userInputIsDirty" @click="emit('undo')" style="z-index: 1"> <span>{{$t('global.undo')}}</span></button>
              <button class="btn btn-primary font-md w-fit" :disabled="state.loadingCalculation || state.calculatorValuesIsSaving" @click="emit('apply')" style="z-index: 1"> <span>{{$t('global.calculate')}}</span></button>
            </div>
          </div>
        </div>
        <div class="row" v-if="state.isManualInputMode && state.manualHasInvalidFields">
          <div class="col-12">
            <div class="alert alert-danger mt-2" role="alert"><span class="text-sm">{{ $t('home.entityCard.calculator.invalidValue') }}</span></div>
          </div>
        </div>
        <div class="row" v-if="state.isManualInputMode && state.manualCalculateErrorMessage">
          <div class="col-12">
            <div class="alert alert-danger mt-2" role="alert"><span class="text-sm">{{ state.manualCalculateErrorMessage }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card-right-container {
  min-height: 34rem;
}

.center-input-values{
  padding: 0px 15%;
}

.rounded-full-xl {
    border-bottom-right-radius: 0.75rem;
    border-top-right-radius: 0.75rem;
}

.rounded-tl-full-xl {
  border-bottom-left-radius: 0.75rem;
  border-top-left-radius: 0.75rem;
}
</style>
