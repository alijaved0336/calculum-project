<template>
<div class="card shadow-none">
  <CalculumLoading v-if="isLoading" block="block"></CalculumLoading>
  <div class="card-body d-flex flex-column justify-content-between" :class="isLoading ? 'bg-blur' : ''">
    <div class="row">
      <div class="col-12 d-flex flex-column"><span class="text-base font-bold">{{ title }}
          <CalculumTooltipIcon :infoText="tooltipText" :advancedTooltipClass="true" :uniqueIdentifier="'entity-ratings-financing-rate'" :keyPopOver="'entityRatingsFinancingRate'"></CalculumTooltipIcon></span><span class="mr-2text-capitalize text-gray-500" v-if="waccFinancing">{{ $te('home.homeCompanySettings.'+detailFinancialMetrics?.financingStrategyMethod) ? $t('home.homeCompanySettings.'+detailFinancialMetrics?.financingStrategyMethod) : '' }}</span></div>
    </div>
    <div class="row">
      <div class="col-12 d-flex">
        <p class="mb-1 min-h-4 mx-auto text-gray-500 text-xs">{{ bigNumberTitle }}
          <CalculumTooltipIcon :info-text="bigNumberTitleTooltip"></CalculumTooltipIcon>
        </p>
      </div>
      <div class="col-12 d-flex min-h-11">
        <p class="mb-0 mx-auto font-semibold text-gray-700 text-5xl">{{ bigNumberValue }}</p>
      </div>
    </div>
    <div class="row">
      <div class="col-xl-6">
        <div class="row">
          <div class="col-12 d-flex min-h-8">
            <p class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs" v-show="detailFinancialMetrics?.financingStrategyMethod === 'fr'">{{ numberLeftTitle }}
              <CalculumTooltipIcon :info-text="numberLeftTitleTooltip"></CalculumTooltipIcon>
            </p>
          </div>
          <div class="col-12 d-flex min-h-9">
            <p class="mb-0 mx-auto font-semibold text-gray-700 text-xl" v-show="detailFinancialMetrics?.financingStrategyMethod === 'fr'">{{ numberLeftValue }}</p>
          </div>
        </div>
      </div>
      <div class="col-xl-6">
        <div class="row">
          <div class="col-12 d-flex min-h-8">
            <p class="mb-0 min-h-4 mx-auto mt-auto text-center text-gray-500 text-xs" v-show="detailFinancialMetrics?.financingStrategyMethod === 'fr'">{{ numberRightTitle }}
              <CalculumTooltipIcon :info-text="numberRightTitleTooltip"></CalculumTooltipIcon>
            </p>
          </div>
          <div class="col-12 d-flex min-h-9">
            <p class="mb-0 mx-auto font-semibold text-gray-700 text-xl" v-show="detailFinancialMetrics?.financingStrategyMethod === 'fr'">{{ numberRightValue }}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="d-flex align-items-center justify-content-between"><span class="text-capitalize font-md font-semibold text-gray-400" v-if="detailFinancialMetrics?.financingStrategyMethod === 'fr' ? detailFinancialMetrics?.fundingCosts?.entity?.Source : detailFinancialMetrics?.wacc?.source">{{ $t('home.entityCard.source') + ': ' }} {{ detailFinancialMetrics?.financingStrategyMethod === 'fr' ? detailFinancialMetrics?.fundingCosts.entity.Source : detailFinancialMetrics?.wacc.source }}</span>
          <button class="btn-text d-flex ml-auto text-sm text-capitalize text-gray-500" @click="$emit('showModalDetails')"><span>{{ $t('home.entityCard.showDetails') }}</span>
            <InformationCircleSvg class="mr-0 icon-svg fill-current my-auto"></InformationCircleSvg>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue';
import InformationCircleSvg from '@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue'

export default defineComponent({
  name: 'BigNumberTwoCols',
  components: {
    CalculumLoading,
    CalculumTooltipIcon,
    InformationCircleSvg
  },
  emits: ['showModalDetails'],
  props: {
    bigNumberTitle: { type: String, required: false, default: '' },
    bigNumberTitleTooltip: { type: String, required: false, default: '' },
    bigNumberValue: { type: String, required: false, default: '' },
    isLoading: { type: Boolean, required: false, default: true },
    numberCenterTitle: { type: String, required: false, default: '' },
    numberCenterTitleTooltip: { type: String, required: false, default: '' },
    numberCenterValue: { type: String, required: false, default: '' },
    numberLeftTitle: { type: String, required: false, default: '' },
    numberLeftTitleTooltip: { type: String, required: false, default: '' },
    numberLeftValue: { type: String, required: false, default: '' },
    numberRightTitle: { type: String, required: false, default: '' },
    numberRightTitleTooltip: { type: String, required: false, default: '' },
    numberRightValue: { type: String, required: false, default: '' },
    title: { type: String, required: false, default: '' },
    tooltipText: { type: String, required: false, default: '' },
    waccFinancing: { type: Boolean, required: false, default: false },
    detailFinancialMetrics: { type: Object, required: true},
  },
  setup() {
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

// ? - Remove this
.icon-svg {
  height: 15px;
}
</style>