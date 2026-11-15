<template>
<div class="card shadow-none" :class="loading ? 'bg-blur' : ''">
  <div class="card-body d-flex flex-column justify-content-between" id="entity-card-text-dashes">
    <div class="row">
      <div class="col">
        <h5 class="text-base text-capitalize font-bold">{{ title }}
          <CalculumTooltipIcon class="ml-2" :infoText="tooltipText" :advancedTooltipClass="true" :uniqueIdentifier="uniqueIdentifier" :keyPopOver="keyPopOver">  </CalculumTooltipIcon>
        </h5>
      </div>
    </div>
    <div class="row" v-if="!showValue && !showESGProvider">
      <div class="col"><span class="text-4xl font-bold" id="gradeLevelText">{{ gradeLevelText }}</span></div>
    </div>
    <div class="row" v-if="!showValue && showESGProvider">
      <div class="col-8 d-flex"><span class="my-auto text-4xl font-bold" id="gradeLevelTextESG">{{ gradeLevelText }}</span></div>
      <div class="col-4">
        <p class="text-sm text-gray-400" v-if="showESGProvider">{{ `${$t('home.entityCard.rating.providedBy')}:` }}</p><img class="logo" :src="images.investVerte" alt="Invest Verte" style="width: 9.2rem"/>
      </div>
    </div>
    <div class="row" v-if="showValue">
      <div class="col">
        <p class="text-4xl font-bold">{{ percentage }}</p>
      </div>
    </div>
    <div class="row mx-0">
      <p class="mb-1" v-if="showValue"><span class="text-lg text-gray-400">{{ $t('global.level') + ': '}}</span><span class="text-lg font-semibold" :style="`color: ${levelColorByLevel}`">{{ gradeLevelText }}</span></p>
      <LevelDashesChart id="dashes-colors" :level="level" :level-color="levelColorByLevel" :total-levels="totalLevels"></LevelDashesChart>
    </div>
    <div class="row" v-if="showDetails">
      <div class="col d-flex">
        <button class="btn-text d-flex ml-auto text-sm text-capitalize text-gray-500" type="button" @click="$emit('showModalDetails')"><span>{{ $t('home.entityCard.showDetails') }}</span>
          <InformationCircleSvg class="mr-0 icon-svg fill-current my-auto"></InformationCircleSvg>
        </button>
      </div>
    </div>
    <div class="row mb-4" v-else></div>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { images } from '@/resources/assets/assets'
import * as colorsGroups from '@/utils/ColorsGroups'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import InformationCircleSvg from '@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue'
import { LevelDashesChart } from '@ada/design-system'

export default defineComponent({
  name: 'EntityCardTextDashes',
  components: {
    CalculumTooltipIcon,
    InformationCircleSvg,
    LevelDashesChart
  },  
  props: {
    gradeLevelText: { type: String, required: true },  // e.g. "Medium"
    level: { type: Number, required: true },  // e.g. 2
    loading: { type: Boolean, required: true },  // e.g. true
    showDetails: { type: Boolean, required: false, default: false },  // e.g. false
    showValue: { type: Boolean, required: false, default: false },  // e.g. false
    showESGProvider: { type: Boolean, required: false, default: false },  // e.g. false
    source: { type: String, required: false, default: '' },  // e.g. "Internal"  // ? - Not implemented
    title: { type: String, required: true },  // e.g. "Credit Rating"
    tooltipText: { type: String, required: false, default: '' },  // e.g. "Credit Rating Tooltip"
    totalLevels: { type: Number, required: false, default: 0 },  // e.g. 3
    value: { type: Number, required: false, default: 0 },  // e.g. 0.5    ,
    uniqueIdentifier : { type: String, required: false, default: '' } ,
    keyPopOver: { type: String, required: false, default: '' }
  },
  emits: ['showModalDetails'],
  setup(props, emits) {
    /**
     * Get the color of the level based on the level number
     * 
     * ? - Move to global utils file
     */
    const levelColorByLevel = computed(() => {
      // Three levels
      switch (props.totalLevels) {
        case 3:
          switch (props.level) {
            // Level 1 of 3
            case 1:
              return colorsGroups.low
            case 2:
              return colorsGroups.medium
            case 3:
              return colorsGroups.high
            default:
              return colorsGroups.noLevel
          }

        // Three levels inverted
        // ? - Three levels inverted

        // Five levels
        case 5:
          switch (props.level) {
            case 1:
              return colorsGroups.veryLow
            case 2:
              return colorsGroups.low
            case 3:
              return colorsGroups.medium
            case 4:
              return colorsGroups.high
            case 5:
              return colorsGroups.veryHigh
            default:
              return colorsGroups.noLevel
          }

        // Five levels inverted
        // ? - Five levels inverted

        // No level
        default:
          return colorsGroups.noLevel
      }
    })

    /**
     * ? - Remove this. Pass the value formatted.
     * Format the value to percentage with 2 decimal places
     */
    const percentage = computed(() => {
      return (props.value * 100).toFixed(2) + '%'
    })

    return {
      emits,
      images,
      levelColorByLevel,
      percentage,
    }
  }
})
</script>

<style lang="scss" scoped>
// ? - Remove this
.icon-svg {
  height: 15px;
}

// ? - Remove this when all views are updated
.card {
  padding: 0;
  margin-bottom: 16px;
}

.card-body {
  padding: 24px;
}

</style>