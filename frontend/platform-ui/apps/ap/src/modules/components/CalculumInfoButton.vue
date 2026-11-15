<template>
<button class="btn btn-simple btn-simple--icon cursor-pointer" type="button" data-toggle="tooltip" data-placement="top" :title="infoText" :style="styles">
  <svg class="tooltip-icon-color" viewBox="0 0 24 24" :height="size" xmlns="http://www.w3.org/2000/svg" v-if="!changeIcon">
    <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,19a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,12,19Zm1.6-6.08a1,1,0,0,0-.6.917,1,1,0,1,1-2,0,3,3,0,0,1,1.8-2.75A2,2,0,1,0,10,9.255a1,1,0,1,1-2,0,4,4,0,1,1,5.6,3.666Z"></path>
  </svg>
  <svg class="tooltip-icon-color" viewBox="0 0 24 24" :height="size" xmlns="http://www.w3.org/2000/svg" v-if="changeIcon">
    <path d="M12 0.75C5.76 0.75 0.75 5.804 0.75 12C0.75 18.24 5.76 23.25 12 23.25C18.196 23.25 23.25 18.24 23.25 12C23.25 5.804 18.196 0.75 12 0.75ZM12 6.375C12.747 6.375 13.406 7.034 13.406 7.781C13.406 8.572 12.747 9.188 12 9.188C11.209 9.188 10.594 8.572 10.594 7.781C10.594 7.034 11.209 6.375 12 6.375ZM13.758 17.625H10.242C9.627 17.625 9.188 17.186 9.188 16.57C9.188 15.999 9.627 15.516 10.242 15.516H10.945V12.703H10.594C9.979 12.703 9.539 12.264 9.539 11.648C9.539 11.077 9.979 10.594 10.594 10.594H12C12.571 10.594 13.055 11.077 13.055 11.648V15.516H13.758C14.329 15.516 14.813 15.999 14.813 16.57C14.813 17.186 14.329 17.625 13.758 17.625Z"></path>
  </svg>
</button>
</template>

<script>
/**
 * !! Deprecated !!
 */

import { defineComponent, computed } from 'vue'
import $ from 'jquery'

export default defineComponent({
  name: 'CalculumInfoButton',
  props: {
    infoText: { type: String, required: true },
    size: { required: false },
    innerClass: { type: Boolean, required: false },
    changeIcon: { type: Boolean, required: false, default: false }
  },
  setup(props) {
    const styles = computed(() => {
      return {
        height: props.size + 'px',
        width: props.size + 'px'
      }
    })

    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
      $('[data-toggle="tooltip"]').on('show.bs.tooltip', function () {
        if (props.innerClass === true) {
          $($(this).data('bs.tooltip').tip).addClass('line-break')
        }
      })
    })
    return {
      styles
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.tooltip-icon-color {
  fill: $color-gray-400 !important;
}

.tooltip-inner {
  max-width: 250px;
  z-index: 97;
}

.line-break {
  white-space: pre-line;
  z-index: 97;
}
</style>
