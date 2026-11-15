<template>
<div class="row mx-0 w-100 flex-nowrap" :style="`gap: ${gap}px;`">
  <template v-if="levelColor !== noColor">
    <div class="col dash" v-for="l in totalLevels" :style="`--fill: ${l <= level ? levelColor : noColor}; height: ${strokeWidth}px;`" :id="`dash-${l}`"></div>
  </template>
  <template v-else>
    <div class="col dash" v-for="l in totalLevels" :style="`--fill: ${l <= level ? levelColorByLevel : noColor}; height: ${strokeWidth}px;`"></div>
  </template>
</div>
</template>
<script lang="ts">
import { computed, defineComponent } from 'vue'
import * as colorsGroups from '../../utils/ColorsGroups'

export default defineComponent({
  name: 'LevelDashesChart',
  props: {
    isLevelColorInverted: { type: Boolean, required: false, default: false },
    level: { type: Number, required: true },
    levelColor: { type: String, required: false, default: colorsGroups.noLevel },
    noColor: { type: String, required: false, default: colorsGroups.noLevel },
    strokeWidth: { type: Number, required: false, default: 8 },
    totalLevels: { type: Number, required: false, default: 5 },
    gap: { type: Number, required: false, default: 8 },
  },
  setup(props) {
    /**
     * Get the color of the level based on the level number
     */
    const levelColorByLevel = computed(() => {
      // Three levels
      switch (props.totalLevels) {
        case 3:
          // Normal
          if (!props.isLevelColorInverted) {
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
          } else {
            // Inverted
            switch (props.level) {
              // Level 1 of 3
              case 1:
                return colorsGroups.high
              case 2:
                return colorsGroups.medium
              case 3:
                return colorsGroups.low
              default:
                return colorsGroups.noLevel
            }
          }

        // Five levels
        case 5:
          // Normal
          if (!props.isLevelColorInverted) {
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
          } else {
            // Inverted
            switch (props.level) {
              case 1:
                return colorsGroups.veryHigh
              case 2:
                return colorsGroups.high
              case 3:
                return colorsGroups.medium
              case 4:
                return colorsGroups.low
              case 5:
                return colorsGroups.veryLow
              default:
                return colorsGroups.noLevel
            }
          }

        // No level
        default:
          return colorsGroups.noLevel
      }
    })

    return {
      levelColorByLevel
    }
  }
})
</script>

<style lang="scss" scoped>
.row {
  &:has(.dash) {
    gap: 8px;
  }

  .dash {
    background: var(--fill);
    border-radius: 6px;
    height: 10px;
  }
}
</style>
