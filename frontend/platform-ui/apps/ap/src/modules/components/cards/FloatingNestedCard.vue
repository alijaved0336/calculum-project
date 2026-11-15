<template>
<div class="card shadow-none" :class="isLoading ? 'bg-blur' : ''">
  <div class="card-body d-flex flex-column justify-content-between">
    <div class="row">
      <div class="col">
        <h5 class="text-base text-capitalize font-bold">{{ title }}
          <CalculumTooltipIcon class="ml-2" :info-text="tooltipText" :advancedTooltipClass="advancedTooltipClass" :uniqueIdentifier="uniqueIdentifier" :keyPopOver="keyPopOver"></CalculumTooltipIcon>
        </h5>
      </div>
      <slot name="headerRightSide"></slot>
    </div>
    <div class="row">
      <div class="col-12 px-4">
        <div class="row my-auto bg-gray-50 border-gray-100 rounded-xl p-1" :class="floatingCardWrapperClasses">
          <div class="col-6 d-flex flex-column p-5 justify-content-between rounded-lg bg-white border-gray-100">
            <slot name="floatingCardContent"></slot>
          </div>
          <div class="col-6">
            <slot name="floatingCardWrapperContent"></slot>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</div>
</template>
  
<script lang='ts'>
import { defineComponent } from 'vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { CalculumLoading } from '@ada/design-system'

export default defineComponent({
  name: 'FloatingNestedCard',
  components: {
    CalculumTooltipIcon,
    CalculumLoading
  },
  props: {
    isLoading: { type: Boolean, required: false, default: false },
    title: { type: String, required: false, default: '' },
    tooltipText: { type: String, required: false, default: '' },
    floatingCardWrapperClasses: { type: String, required: false, default: '' },
    uniqueIdentifier : { type: String, required: false, default: '' } ,
    keyPopOver: { type: String, required: false, default: '' },
    advancedTooltipClass: { type: Boolean, required: false, default: false },
  }
})
</script>
<style lang="scss" scoped></style>