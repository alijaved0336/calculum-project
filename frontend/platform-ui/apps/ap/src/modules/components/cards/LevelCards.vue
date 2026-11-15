<template>
<div class="d-flex flex-column text-center justify-content-between" :class="title === 'priority' ? 'container-level-cards-priority' : 'container-level-cards'">                   <span class="text-sm font-bold">{{ $t(`global.levelCards.title.${title}`) }}
    <CalculumTooltipIcon :infoText="$t(`global.levelCards.tooltip.${title}`)">  </CalculumTooltipIcon></span><span class="font-bold" :class="level === 'null' ? 'text-base' : fontSize" :style="`color: ${levelColorByLevel}`">{{ labelByLevel }}</span></div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import * as colorsGroups from '@/utils/ColorsGroups'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'

export default defineComponent({
  name: "LevelCards",
  components: {
    CalculumTooltipIcon
  },
  props: {
    title: { type: String, required: true, default: "" },
    level: { type: String, required: true, default: "" },
    fontSize: { type: String, required: true, default: "text-base" },
  },
  setup(props: any) {


    const levelColorByLevel = computed(() => {
        switch (props.level) {
            case 'Low':
            case 'low':
                return colorsGroups.low
            case 'Medium':
            case 'medium':
                return colorsGroups.medium
            case 'High':
            case 'high':
                return colorsGroups.high
            default:
                return colorsGroups.noLevel
        }      
    })

    const labelByLevel = computed(() => {
        switch (props.level) {
            case 'Low':
            case 'low':
                return "Low"
            case 'Medium':
            case 'medium':
                return "Med"
            case 'High':
            case 'high':
                return "High"
            default:
                return "No Level"
        }      
    })


    return {
        levelColorByLevel,
        labelByLevel
      
    }
  }
}) 
</script>

<style lang="scss" scoped>

.container-level-cards {
    height: 70px;

    @media (max-width: 1408px) {
        height: 80px;
    }
}

.container-level-cards-priority {
    height: 80px;

    @media (max-width: 1408px) {
        height: 90px;
    }
}


</style>