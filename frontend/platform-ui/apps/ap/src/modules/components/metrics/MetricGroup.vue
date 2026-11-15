<template>
<div class="carousel-item-skeleton" v-if="programInrecalculation && blockTabs" :style="`flex: 0 0 ${getItemwidth}px;`">
  <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '55px' }"> </Skeleton>
</div>
<div class="carousel-item" :style="`flex: 0 0 ${getItemwidth}px;`" v-else>
  <div class="group-card cursor-pointer" @click="$emit('send-group', groupKey)" :class="{'active': active}">
    <div class="d-flex">
      <div class="group-active cursor-pointer"><span class="group-checkmark cursor-pointer" v-if="active">
          <svg class="cursor-pointer" width="10" height="10" viewbox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.33366 2.5L3.75033 7.08333L1.66699 5" stroke="white" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg></span><span class="cursor-pointer" v-else> </span></div>
    </div>
    <div class="d-flex"><span class="text-sm font-medium text-gray-700 cursor-pointer">{{ title  }}</span></div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Skeleton } from '@progress/kendo-vue-indicators';

export default defineComponent({
  name: 'MetricGroup',
  components: { Skeleton },
  props: { 
    title: { type: String, required: true },
    groupKey: { type: String, required: true },
    active: { type: Boolean, required: false, default: false },
    getItemwidth: { type: Number, required: true },
    programInrecalculation: { type: Boolean, default: false }
  },
  emits: ['send-group'],
  setup( props, { emit } ) {

    const blockTabs = computed(() => {
        const blockTab = ['proposedPaymentTerms','cashFlowOpportunity']
        if (blockTab.includes(props.groupKey) ){
          return true
        }
        return false
    })

    return {
      blockTabs
    }
  }
})
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';

.carousel-item {
  display: flex;
}

span.group-checkmark.cursor-pointer {
    display: flex;
  }

.group-card {
  display: flex;
  padding: 16px 10px;
  gap: 15px;
  flex: 1 0 0;
  border-radius: 8px;
  border: 1px solid $color-gray-200;
  background: #fff;
  
  &:hover {
    background: $color-gray-50;
  }

  &.active {
    background: $color-gray-50;
    .group-active {
      border: 1px solid $color-gray-600;
      background: $color-gray-600;      
    }
  }  
}

.group-active {
  position: relative;
  top: 0;
  right: 0;
  background-color: transparent;
  border-radius: 999px;
  border: 1px solid $color-gray-300;  
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 15px;
  font-weight: 600;

  .group-checkmark {
    path {
      stroke: #fff;
    }
  }
}

.carousel-item-skeleton.mr-2.cursor-pointer {
    cursor: not-allowed !important;
}

</style>