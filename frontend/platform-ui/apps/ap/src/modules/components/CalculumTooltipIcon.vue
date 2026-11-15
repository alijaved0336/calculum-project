<template>
<svg class="ml-2 tooltipIcon" v-if="infoText && !advancedTooltipClass" :title="infoText" data-testid="tooltip-icon" data-toggle="tooltip" :data-placement="options.placement" viewBox="-1 -1 26 26" :class="extraMargin ? extraMargin : ''" @mouseleave="cleanupOrphanTooltips">
  <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,19a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,12,19Zm1.6-6.08a1,1,0,0,0-.6.917,1,1,0,1,1-2,0,3,3,0,0,1,1.8-2.75A2,2,0,1,0,10,9.255a1,1,0,1,1-2,0,4,4,0,1,1,5.6,3.666Z"></path>
</svg>
<ButtonIconStandard v-if="advancedTooltipClass" :uniqueIdentifier="uniqueIdentifier" :class="uniqueIdentifier" :keyPopOver="keyPopOver" :popOverBody="popOverBody" @clicked="openPopover">
  <svg class="mx-1 tooltipIcon advanced-tooltip" :title="infoText" data-testid="tooltip-icon" data-toggle="tooltip" :data-placement="options.placement" viewBox="-1 -1 26 26" @mouseleave="cleanupOrphanTooltips">
    <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,19a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,12,19Zm1.6-6.08a1,1,0,0,0-.6.917,1,1,0,1,1-2,0,3,3,0,0,1,1.8-2.75A2,2,0,1,0,10,9.255a1,1,0,1,1-2,0,4,4,0,1,1,5.6,3.666Z"></path>
  </svg>
</ButtonIconStandard>
</template>


<script lang="ts">
import { defineComponent, onBeforeUnmount } from 'vue';
import ButtonIconStandard from '@/modules/components/ButtonIconStandard.vue'
import $ from 'jquery'

export default defineComponent({
  name: 'CalculumTooltipIcon',
  components: { ButtonIconStandard }, 
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
  },
  setup(props) {
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

    function openPopover(){
      $('[data-toggle="tooltip"]').tooltip('hide')
    }

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
      openPopover,
      cleanupOrphanTooltips
    }
  }
})
</script>



<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";


.tooltipIcon {
  fill: $color-gray-400;
  width: 1rem;
  height: 1rem;
  cursor: pointer;

  &.advanced-tooltip {
    width: 1rem;
    height: 1rem;
    &:hover {
      fill: $color-primary-500;
    }
  }
}

// When showing tooltip
.tooltip-inner {
  max-width: 350px;
  min-width: 150px;
  word-wrap: break-word;
  z-index: 9999;
}

.line-break {
  white-space: pre-line;
  z-index: 97;
}


</style>
