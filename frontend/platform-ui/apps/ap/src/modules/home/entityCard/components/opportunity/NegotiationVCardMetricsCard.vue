<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import BigValueLabelOnTop from "@/modules/components/BigValueLabelOnTop.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import IconChartForecast from "@ada/design-system/assets/icons/iconChartForecast.vue";
import IconChartForecastDown from "@ada/design-system/assets/icons/iconChartForecastDown.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import type {
  NegotiationCashFlowDisplay,
  NegotiationCashFlowLoading,
  NegotiationCashFlowVCard,
} from "@/modules/home/entityCard/types";
import { StringUtils } from "@/utils";
import { getNumberWithDecimals } from "@/utils/FormatData";

defineProps<{
  vCard: NegotiationCashFlowVCard;
  loading: NegotiationCashFlowLoading;
  cashFlowDisplay: NegotiationCashFlowDisplay;
  programIsRecalculatingComputedValue: boolean;
  forecastProcess: boolean;
  useFeatureForecastVolume: boolean;
  potentialTheme: boolean;
}>();

const emit = defineEmits<{
  "show-modal-forecast": [];
}>();
</script>

<template>
  <div class="col-xl-6 col-lg-6 card-analyze__overview">
    <div class="card">
      <div class="card-body container-data-flex">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <h5
            id="cf-title-card-small"
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
          <div class="d-flex align-items-center gap-2">
            <!-- Skeleton shown only while loading-->
            <SkeletonRectangle
              v-if="loading.isLoadingVcardInfo"
              size="sm"
            ></SkeletonRectangle>
            <!-- h5 title and value shown only if not loading-->
            <div
              v-if="!loading.isLoadingVcardInfo"
              class="d-flex align-items-center gap-2"
            >
              <h5 class="text-base text-capitalize font-bold">
                {{ $t("global.economicProfit") }}
              </h5>
              <h5 class="text-base text-capitalize font-bold">
                {{
                  vCard.vCardInfo.economicProfit
                    ? StringUtils.formatBigNumbers(
                        vCard.vCardInfo.economicProfit,
                      )
                    : "N/A"
                }}
              </h5>
            </div>
          </div>
        </div>
        <div class="d-flex container-cols-cf-rebate">
          <div
            v-if="cashFlowDisplay.showExistsAgreedValue === null"
            class="col-xl-6 col-lg-6 cash-flow-border"
          >
            <BigValueLabelOnTop
              :min-height="5"
              :is-loading="loading.isLoadingVcardInfo"
              :program-is-recalculating="
                programIsRecalculatingComputedValue && !forecastProcess
              "
              :label="$t('global.cashFlow')"
              :value="
                cashFlowDisplay.showExistsTarget &&
                cashFlowDisplay.showExistsTargetValue
                  ? cashFlowDisplay.showExistsTargetValue
                  : cashFlowDisplay.potentialCashFlowComputed
              "
              :value-size="'4xl'"
              :equivalent-discount="
                vCard.vCardInfo.equivalentDiscount
                  ? getNumberWithDecimals(
                      vCard.vCardInfo?.equivalentDiscount,
                      2,
                    )
                  : ''
              "
            ></BigValueLabelOnTop>
            <BigValueLabelOnTop
              class="mt-3"
              :min-height="5"
              :is-loading="loading.isLoadingVcardInfo"
              :label="$t('home.analyze.vCard.rebate')"
              :value="
                vCard.vCardInfo.vCardRebateFull
                  ? StringUtils.formatBigNumbers(
                      vCard.vCardInfo?.vCardRebateFull,
                    )
                  : 'N/A'
              "
              :value-size="'4xl'"
            ></BigValueLabelOnTop>
          </div>
          <div
            v-if="cashFlowDisplay.showExistsAgreedValue !== null"
            class="col-xl-6 col-lg-6 d-flex justify-content-between flex-column cash-flow-border"
          >
            <div class="row">
              <span
                v-if="cashFlowDisplay.showExistsTarget !== false"
                class="col-12 text-center text-gray-500 text-xs"
                >{{ $t("global.cashFlow") }}</span
              >
              <div class="col-6 d-flex flex-column cash-flow-items">
                <Skeleton
                  v-if="programIsRecalculatingComputedValue && !forecastProcess"
                  class="skeletons-bg mt-2 text-center"
                  :shape="'rectangle'"
                  :style="{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                  }"
                ></Skeleton>
                <BigValueLabelOnTop
                  v-else
                  class="mt-3"
                  :min-height="5"
                  :is-loading="loading.isLoadingVcardInfo"
                  :program-is-recalculating="
                    programIsRecalculatingComputedValue && !forecastProcess
                  "
                  :label="
                    cashFlowDisplay.showExistsTarget
                      ? $t('global.target')
                      : $t('global.cashFlow')
                  "
                  :value="
                    cashFlowDisplay.showExistsTarget &&
                    cashFlowDisplay.showExistsTargetValue
                      ? cashFlowDisplay.showExistsTargetValue
                      : cashFlowDisplay.potentialCashFlowComputed
                  "
                  :value-size="'4xl'"
                  :equivalent-discount="
                    vCard.vCardInfo.equivalentDiscount
                      ? getNumberWithDecimals(
                          vCard.vCardInfo?.equivalentDiscount,
                          2,
                        )
                      : ''
                  "
                ></BigValueLabelOnTop>
              </div>
              <div
                v-if="cashFlowDisplay.showExistsAgreedValue !== null"
                class="col-6 col-lg-6 d-flex flex-column cash-flow-items cash-flow-items-agreed cash-flow-items-v-card-agreed"
              >
                <Skeleton
                  v-if="programIsRecalculatingComputedValue"
                  class="skeletons-bg mt-2 text-center"
                  :shape="'rectangle'"
                  :style="{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                  }"
                ></Skeleton>
                <BigValueLabelOnTop
                  v-else
                  class="mt-3"
                  :min-height="5"
                  top-label-color="text-violet-700"
                  :is-loading="loading.isLoadingVcardInfo"
                  :program-is-recalculating="
                    programIsRecalculatingComputedValue && !forecastProcess
                  "
                  :label="$t('global.agreed')"
                  :value="cashFlowDisplay.showExistsAgreedValue"
                  :value-size="'4xl'"
                ></BigValueLabelOnTop>
              </div>
            </div>
            <div class="row">
              <div
                class="col-12 col-lg-12 d-flex align-items-center flex-column"
              >
                <BigValueLabelOnTop
                  class="mt-3"
                  :min-height="5"
                  :is-loading="loading.isLoadingVcardInfo"
                  :program-is-recalculating="
                    programIsRecalculatingComputedValue && !forecastProcess
                  "
                  :label="$t('home.analyze.vCard.rebate')"
                  :value="
                    vCard.vCardInfo.vCardRebateFull
                      ? StringUtils.formatBigNumbers(
                          vCard.vCardInfo?.vCardRebateFull,
                        )
                      : 'N/A'
                  "
                  :value-size="'4xl'"
                ></BigValueLabelOnTop>
              </div>
            </div>
          </div>
          <div
            class="col-xl-6 col-lg-6 cash-flow-no-border d-flex align-items-center flex-column justify-content-center"
          >
            <div class="d-flex align-items-center flex-column gap-2">
              <div class="d-flex align-volume-items gap-1">
                <span class="text-gray-500 text-xs">
                  {{
                    `${$t("global.spendVolume")}${cashFlowDisplay.showForecastVolume ? " (F)" : ""}`
                  }}
                </span>
                <Tooltip
                  :open-delay="50"
                  :anchor-element="'target'"
                  :position="'top'"
                >
                  <iconPencil
                    v-if="
                      !potentialTheme &&
                      !loading.spendVolume &&
                      !programIsRecalculatingComputedValue &&
                      useFeatureForecastVolume
                    "
                    class="pencil-svg spend-1 cursor-pointer"
                    :title="
                      cashFlowDisplay.foreCastComputedIfExists
                        ? 'Edit Volume Forecast'
                        : 'Add Volume Forecast'
                    "
                    @click="emit('show-modal-forecast')"
                  ></iconPencil>
                </Tooltip>
              </div>
              <Skeleton
                v-if="loading.spendVolume"
                class="skeletons-bg mt-2 text-center"
                :shape="'rectangle'"
                :style="{ width: '100%', height: '36px', borderRadius: '8px' }"
              ></Skeleton>
              <div
                v-else
                class="d-flex gap-2 align-volume-items"
              >
                <span
                  id="spendVolumeComputed-small"
                  class="text-4xl font-bold"
                  >{{
                    cashFlowDisplay.foreCastComputedIfExists
                      ? cashFlowDisplay.forecastValueComputed
                      : cashFlowDisplay.spendVolumeComputed
                  }}</span
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
                ></Skeleton>
                <div
                  v-if="
                    cashFlowDisplay.foreCastComputedIfExists &&
                    !potentialTheme &&
                    (!programIsRecalculatingComputedValue || forecastProcess)
                  "
                  class="d-flex"
                >
                  <IconChartForecast
                    v-if="cashFlowDisplay.isForeCastPositiveValue"
                    :color="'#15b79e'"
                  ></IconChartForecast>
                  <IconChartForecastDown
                    v-if="!cashFlowDisplay.isForeCastPositiveValue"
                    :color="'#ff2c4f'"
                  ></IconChartForecastDown
                  ><span
                    id="foreCastComputed-small"
                    class="text-2xl font-medium"
                    :class="
                      cashFlowDisplay.isForeCastPositiveValue
                        ? 'text-forecast'
                        : 'text-forecast-warning'
                    "
                  >
                    {{
                      `${cashFlowDisplay.foreCastPercentageComputedBigNumbers}%`
                    }}</span
                  >
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

.cash-flow-items {
  padding: 0.5rem 8px;

  &-agreed {
    background: $color-violet-50;
    border: 1px solid $color-violet-100;
    border-radius: 0.25rem;
    color: $color-violet-700;
  }

  &-v-card-agreed {
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

.container-cols-cf-rebate {
  border-radius: 8px;
  padding: 2px !important;
  background: #f9fafb !important;
  border: 1px solid #f2f4f7;
}

.cash-flow-border {
  border: 1px solid #eaecf0;
  border-radius: 8px;
  padding: 16px 8px !important;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  background: #ffffff;

  @media screen and (max-width: 1200px) {
    padding: 32px 8px !important;
  }
}

.cash-flow-no-border {
  padding: 16px 8px !important;

  @media screen and (max-width: 1200px) {
    padding: 32px 8px !important;
  }
}
</style>
