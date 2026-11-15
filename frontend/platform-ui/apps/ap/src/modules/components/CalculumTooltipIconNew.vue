<template>
<div class="icon-wrapper" v-if="infoText">
  <svg class="ml-2 tooltipIcon" :title="infoText" data-testid="tooltip-icon" data-toggle="tooltip" :data-placement="options.placement" viewBox="0 0 24 24" :class="extraMargin ? extraMargin : ''" @mouseleave="cleanupOrphanTooltips" :style="svgStyle">
    <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,19a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,12,19Zm1.6-6.08a1,1,0,0,0-.6.917,1,1,0,1,1-2,0,3,3,0,0,1,1.8-2.75A2,2,0,1,0,10,9.255a1,1,0,1,1-2,0,4,4,0,1,1,5.6,3.666Z"></path>
  </svg>
</div>
</template>


<script lang="ts">
import { defineComponent, onBeforeUnmount, computed, useAttrs, PropType, StyleValue } from 'vue';
import $ from 'jquery'

export default defineComponent({
  name: 'CalculumTooltipIconNew',
  components: { },
  props: {
    infoText: { type: String, required: false, default: '' },
    options: { type: Object, required: false, default: () => ({
      placement: 'auto',
      trigger: 'hover',
      container: 'body',
      offset: '0, 8',
      boundary: 'viewport',
      fallbackPlacements: ['top', 'bottom', 'right', 'left']
    }) },
    advancedTooltipClass: { type: Boolean, required: false, default: false },
    uniqueIdentifier: { type: String, required: false, default: '' },
    keyPopOver: { type: String, required: false, default: '' },
    popOverBody: { type: String, required: false, default: ''},
    extraMargin: { type: String, required: false, default: '' },
    iconStyle: { type: [String, Object, Array] as PropType<StyleValue>, required: false, default: '' },
  },
  setup(props) {
    const attrs = useAttrs()

    const svgStyle = computed<StyleValue>(() => {
      return [props.iconStyle as StyleValue, attrs.style as StyleValue]
    })

    $(() => {
      $('[data-toggle="tooltip"]').tooltip({
        placement: props.options?.placement ?? 'auto',
        trigger: props.options?.trigger ?? 'hover',
        container: props.options?.container ?? 'body',
        offset: props.options?.offset ?? '0, 8',
        boundary: props.options?.boundary ?? 'viewport',
        fallbackPlacements: props.options?.fallbackPlacements ?? ['top', 'bottom', 'right', 'left']
      })
    })

    // Disposes the tooltip when the component is going to be destroyed
    onBeforeUnmount(() => {
      $('[data-toggle="tooltip"]').tooltip('hide')
    })

    /**
     * Remove orphan tooltip elements from DOM when mouse leaves
     */
    function cleanupOrphanTooltips() {
      setTimeout(() => {
        const orphanTooltips = document.querySelectorAll('.tooltip.bs-tooltip-auto:not(.show)')
        orphanTooltips.forEach(el => el.remove())
      }, 150)
    }

    return {
      cleanupOrphanTooltips,
      svgStyle
    }
  }
})
</script>



<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";


.icon-wrapper{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    aspect-ratio: 1 / 1;
}
.tooltipIcon {
  fill: $color-gray-400;
  width: 1.5rem;
  height: 1.2rem;
  cursor: pointer;
  margin: 0 !important;

  &.advanced-tooltip {
    width: 1.5rem;
    height: 1.2rem;
    &:hover {
      fill: $color-primary-500;
    }
  }
}

</style>
