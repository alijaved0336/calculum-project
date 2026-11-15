<template>
<div class="arc-circle-container">
  <svg :width="width" :height="height">
    <path v-for="(arc, index) in arcSegments" :key="index" :d="arc.path" fill="none" :stroke="(level) > index ? `${levelColor}` : `${noColor}`" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>
  <div class="arc-circle-text-container" :class="gradeLevelTextSecondWordComputed ? 'two-words' : 'one-word'">
    <span id="arc-circle-value" class="arc-circle-text" :class="fontSizeComputed" :style="`color: ${setTextColor}`" >{{ gradeLevelTextFirstWordComputed }} <br />{{ gradeLevelTextSecondWordComputed }}</span>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, toRefs } from 'vue'
import * as colorsGroups from '@/utils/ColorsGroups'
export default defineComponent({
  name: 'CalculumArcCircle',
  props: {
    fontSize: { type: String, required: false, default: 'sm' },
    gradeLevelText: { type: String, required: true },
    height: { type: Number, default: 140 },
    lastAngleNumber: { type: Number, default: -90 },
    level: { type: Number, required: true, default: 1 },
    levelColor: { type: String, required: true },  // ? - Move implementation to this from parent component
    n: { type: Number, default: 5 },
    noColor: { type: String, required: false, default: '#EBECF0' },
    radius: { type: Number, default: 55 },
    space: { type: Number, default: 13 },
    strokeColor: { type: String, default: 'transparent' },
    strokeWidth: { type: Number, default: 7 },
    strokeTextWidth: { type: Number, required: false, default: 1 },
    width: { type: Number, default: 140 }
  },
  setup(props) {
    interface ArcCircle {
      arcSegments: Array<any>
    }

    const data = reactive<ArcCircle>({
      arcSegments: [],
    })

    const arcSegments: any = []

    function centerX() {
      return props.width / 2
    }

    function centerY() {
      return props.height / 2
    }

    function calcArc() {
      // let lastEndAngle = -180
      let lastEndAngle = -90

      for (let i = 1; i < props.n + 1; i++) {
        const startAngle = lastEndAngle + props.space
        const endAngle = startAngle + (360 - (props.n * props.space)) / props.n
        const startX = centerX() + props.radius * Math.cos(startAngle * Math.PI / 180)
        const startY = centerY() + props.radius * Math.sin(startAngle * Math.PI / 180)
        const endX = centerX() + props.radius * Math.cos(endAngle * Math.PI / 180)
        const endY = centerY() + props.radius * Math.sin(endAngle * Math.PI / 180)

        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

        const path = `M ${startX} ${startY} A ${props.radius} ${props.radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`

        data.arcSegments.push({ path })
        lastEndAngle = endAngle
      }
    }

    // Get class given font size
    const fontSizeComputed = computed(() => {
      switch (props.fontSize) {
        case 'xs':
          return 'text-xs'
        case 'sm':
          return 'text-sm'
        case 'base':
          return 'text-base'
        case 'md':
          return 'text-md'
        case 'lg':
          return 'text-lg'
        default:
          return 'text-sm'
      }
    })

    /**
     * Computed
     */

    // Get first word of grade level text
    const isGradeLevelTextTwoWordsComputed = computed(() => {
      return props.gradeLevelText.split(' ').length > 1
    })

    // Get first word of grade level text
    const gradeLevelTextFirstWordComputed = computed(() => {
      return props.gradeLevelText.split(' ')[0]
    })

    // Get second word of grade level text
    const gradeLevelTextSecondWordComputed = computed(() => {
      return props.gradeLevelText.split(' ')[1]
    })

    const setTextColor = computed(() => {
      return props.levelColor === '#EBECF0' ? colorsGroups.noLevelText : props.levelColor
    })

    // Utility function to calculate the angles of arc segments
    calcArc()

    return {
      ...toRefs(data),
      calcArc,
      centerX,
      centerY,
      colorsGroups,
      fontSizeComputed,
      gradeLevelTextFirstWordComputed,
      gradeLevelTextSecondWordComputed,
      isGradeLevelTextTwoWordsComputed,
      setTextColor
    }
  }
})
</script>

<style scoped lang="scss">


.arc-circle-container {
    position: relative;
}

.arc-circle-text-container {    
    position: absolute;
    top: 46%;    
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.two-words{
  top: 43%;
}


.arc-circle-text {
  white-space: pre-line; 
  line-height: 1.2;
  text-align: center;  
  font-weight: 400;
}




</style>
