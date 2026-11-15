<script setup lang="ts">
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import IconChartForecast from "@ada/design-system/assets/icons/iconChartForecast.vue";
import IconChartForecastDown from "@ada/design-system/assets/icons/iconChartForecastDown.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import type {
  NegotiationCashFlowDisplay,
  NegotiationCashFlowLoading,
} from "@/modules/home/entityCard/types";

defineProps<{
  loading: NegotiationCashFlowLoading;
  cashFlowDisplay: NegotiationCashFlowDisplay;
  programIsRecalculatingComputedValue: boolean;
  forecastProcess: boolean;
  userIsAdmin: boolean;
  potentialTheme: boolean;
}>();

const emit = defineEmits<{
  "show-modal-forecast": [];
}>();
</script>

<template>
  <div class="row mt-4">
    <div class="col-12 d-flex gap-1">
      <h5
        id="cf-spend-volume"
        class="text-base text-capitalize font-bold"
      >
        {{
          `${$t("global.spendVolume")}${cashFlowDisplay.showForecastVolume ? " (F)" : ""}`
        }}
        <CalculumTooltipIcon
          :info-text="$t('global.spendVolumeTooltip')"
        ></CalculumTooltipIcon>
      </h5>
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
            userIsAdmin
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
    <div
      class="col-12"
      :class="{ 'text-center': cashFlowDisplay.showExistsAgreedValue }"
    >
      <Skeleton
        v-if="loading.spendVolume"
        class="skeletons-bg mt-2 text-center"
        :shape="'rectangle'"
        :style="{ width: '100%', height: '36px', borderRadius: '50px' }"
      ></Skeleton>
      <div
        v-else
        class="d-flex gap-2 align-volume-items"
      >
        <span
          id="spendVolumeComputed"
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
          :style="{ width: '100%', height: '36px', borderRadius: '50px' }"
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
            id="foreCastComputed"
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
</template>
