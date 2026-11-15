<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import type {
  NegotiationCashFlowDisplay,
  NegotiationCashFlowLoading,
  NegotiationCashFlowVCard,
} from "@/modules/home/entityCard/types";
import { getNumberWithDecimals } from "@/utils/FormatData";

defineProps<{
  vCard: NegotiationCashFlowVCard;
  loading: NegotiationCashFlowLoading;
  cashFlowDisplay: NegotiationCashFlowDisplay;
  programIsRecalculatingComputedValue: boolean;
  forecastProcess: boolean;
  envName: string;
}>();
</script>

<template>
  <div class="col-xl-3 col-lg-3">
    <div class="card shadow-none">
      <div class="card-body d-flex flex-column">
        <div
          class="row mb-3"
          :class="{
            'training-mode-el-c-f-opp': envName === 'dev' || envName === 'test',
          }"
        >
          <div class="col-12 col-lg-12">
            <h5
              id="cf-title-card"
              class="text-base text-capitalize font-bold"
            >
              {{ $t("global.cashFlowOpportunity") }}
              <CalculumTooltipIcon
                :advanced-tooltip-class="true"
                :info-text="$t('home.entityCard.cashFlowOpportunityTooltip')"
                :key-pop-over="'programCFOpportunity'"
                :unique-identifier="'entity-cf-opps'"
              ></CalculumTooltipIcon>
            </h5>
          </div>
          <div
            v-if="cashFlowDisplay.showExistsAgreedValue === null"
            class="col-12"
          >
            <Skeleton
              v-if="
                programIsRecalculatingComputedValue || loading.potentialCashFlow
              "
              class="skeletons-bg mt-2 text-center"
              :shape="'rectangle'"
              :style="{ width: '100%', height: '36px', borderRadius: '8px' }"
            ></Skeleton
            ><span
              v-if="!programIsRecalculatingComputedValue"
              id="potentialCashFlowComputed"
              class="text-4xl font-bold"
              >{{
                cashFlowDisplay.showExistsTarget &&
                cashFlowDisplay.showExistsTargetValue
                  ? cashFlowDisplay.showExistsTargetValue
                  : cashFlowDisplay.potentialCashFlowComputed
              }}</span
            >
            <div
              v-if="
                vCard.vCardInfo.equivalentDiscount &&
                !programIsRecalculatingComputedValue
              "
              class="d-flex text-center justify-content-center equivalent-value equivalent-value-left"
            >
              <Tooltip
                :open-delay="100"
                :anchor-element="'target'"
                :position="'top'"
                ><span
                  class="font-semibold"
                  :title="`Equivalent Discount = Cash Flow × Buyer’s WACC ÷ Spend Volume.`"
                  >{{
                    `or ${getNumberWithDecimals(vCard.vCardInfo.equivalentDiscount, 2)}% Discount`
                  }}</span
                ></Tooltip
              >
            </div>
          </div>
          <div
            v-if="cashFlowDisplay.showExistsAgreedValue !== null"
            class="col-12 col-lg-12"
          >
            <div class="row">
              <div class="col-6 col-lg-6 d-flex flex-column cash-flow-items">
                <Skeleton
                  v-if="
                    programIsRecalculatingComputedValue ||
                    loading.potentialCashFlow
                  "
                  class="skeletons-bg mt-2 text-center"
                  :shape="'rectangle'"
                  :style="{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                  }"
                ></Skeleton
                ><span
                  v-if="!programIsRecalculatingComputedValue"
                  class="text-xs font-normal color-gray-500 text-center"
                  >{{
                    cashFlowDisplay.showExistsTarget ? "Target" : "Cash Flow"
                  }}</span
                ><span
                  v-if="!programIsRecalculatingComputedValue"
                  id="potentialCashFlowComputed"
                  class="text-4xl font-bold text-center"
                  >{{
                    cashFlowDisplay.showExistsTarget &&
                    cashFlowDisplay.showExistsTargetValue
                      ? cashFlowDisplay.showExistsTargetValue
                      : cashFlowDisplay.potentialCashFlowComputed
                  }}</span
                >
                <div
                  v-if="
                    vCard.vCardInfo.equivalentDiscount &&
                    !programIsRecalculatingComputedValue
                  "
                  class="d-flex text-center justify-content-center equivalent-value"
                >
                  <Tooltip
                    :open-delay="100"
                    :anchor-element="'target'"
                    :position="'top'"
                    ><span
                      class="font-semibold"
                      :title="`Equivalent Discount = Cash Flow × Buyer’s WACC ÷ Spend Volume.`"
                      >{{
                        `or ${getNumberWithDecimals(vCard.vCardInfo.equivalentDiscount, 2)}% Discount`
                      }}</span
                    ></Tooltip
                  >
                </div>
              </div>
              <div
                v-if="cashFlowDisplay.showExistsAgreedValue !== null"
                class="col-6 d-flex flex-column cash-flow-items cash-flow-items-agreed"
              >
                <Skeleton
                  v-if="programIsRecalculatingComputedValue && !forecastProcess"
                  class="skeletons-bg mt-2 text-center"
                  :shape="'rectangle'"
                  :style="{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                  }"
                ></Skeleton
                ><span
                  v-if="!programIsRecalculatingComputedValue"
                  class="text-xs font-normal color-violet-700 text-center"
                  >{{ "Agreed" }}</span
                ><span
                  v-if="!programIsRecalculatingComputedValue"
                  id="showExistsAgreedValue"
                  class="text-4xl font-bold text-center"
                  >{{ cashFlowDisplay.showExistsAgreedValue }}</span
                >
              </div>
            </div>
          </div>
        </div>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.cash-flow-items {
  padding: 0.5rem 8px;

  &-agreed {
    background: $color-violet-50;
    border: 1px solid $color-violet-100;
    border-radius: 0.25rem;
    color: $color-violet-700;
  }
}

.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 240px;
  width: 100%;
}

.card-body {
  padding: 24px;
}
</style>
