<template>
<div class="calculum-modal" id="calculum-modal-container" @click.self="$emit('close')" :class="zindexComputed">
  <div class="calculum-modal-content-custom show-scroll" :class="sizeComputed + ' ' + (isPdfModal ? 'calculum-modal-content-custom-pdf-modal' : '')" data-testid="modal">
    <CalculumClose class="btn-close" v-if="showClose" @click="$emit('close')"></CalculumClose>
    <div class="row" v-if="title !== ''">
      <div class="col-12">
        <h5 class="text-2xl font-semibold text-gray-600" :class="{classesTitle: classesTitle,'text-capitalize': capitalizeTitle}">{{ title }}</h5>
      </div>
    </div>
    <div class="row show-scroll" v-if="hasContent">
      <div class="col-12 inner-modal" :style="{ height: customHeight }">
        <slot name="modalContent"></slot>
      </div>
    </div>
    <div class="row mt-2" v-if="hasButtons">
      <div class="col-12 d-flex container-buttons">
        <slot name="modalButtons"></slot>
      </div>
    </div>
    <div class="row mt-2" v-if="hasExtraContent">
      <div class="col-12">
        <slot name="modalExtraContent"></slot>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import CalculumClose from '@/modules/components/CalculumClose.vue'
export default defineComponent({
  name: 'CalculumModal',
  components: { CalculumClose },
  props: {
    customHeight: { type: String, default: '100%' },
    classesTitle: { type: String, default: '' },
    showClose: { type: Boolean, default: false },
    size: { type: String, default: 'md' },
    title: { type: String, default: '' },
    withoutNavbar: { type: Boolean, default: false },
    zIndex: { type: Boolean, default: false },
    capitalizeTitle: { type: Boolean, default: true },
    isPdfModal: { type: Boolean, default: false },
      },
  emits: ['close',] ,
  setup(props, { slots }) {
    
    const hasContent = !!slots['modalContent']
    const hasButtons = !!slots['modalButtons']
    const hasExtraContent = !!slots['modalExtraContent']


    return {
      hasContent,
      hasButtons,
      hasExtraContent,
      sizeComputed: computed(() => {
        return `calculum-modal-${props.size}`
      }),

      // For fixing z-index issue with popover
      zindexComputed: computed(() => {
        if (props.zIndex) {
          return `calculum-modal-zindex-popover`
        } else {
          return ''
        }
      }),
      slots,
      NAME: import.meta.env.VITE_NAME
    }
  }
})
</script>

<style lang="scss" scoped>
// Variables
@import '@/resources/assets/styles/variables/_colors.scss';
@import '@/resources/assets/styles/variables/_dimensions.scss';

.btn-close {
  cursor: pointer;
  font-size: 40px;
  position: absolute;
  right: 1.5rem;
  top: 1.2rem;
  z-index: 999;
}

.calculum-modal {
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  height: calc(100vh * #{$zoom-compensation});
  justify-content: center;
  left: 0;
  position: fixed;
  top: 0;
  transition: all ease 0.3s;
  width: calc(100vw * #{$zoom-compensation});
  z-index: 1060; // BS convention
  &-sm {
    width: min(400px, 95%);
  }

  &-md {
    width: min(800px, 95%);
  }

  &-lg {
    width: min(1000px, 95%);
  }


  &-lg-70 {
    width: min(70%);
  }

  &-lg-75 {
    width: min(76%);
  }

  &-xlg {
    width: min(80%);
  }

  &-xl {
    width: min(90%);
  }

  &-xl-95 {
    width: min(95%);
  }

  &-custom {
    min-width: 800px;
    width: fit-content;
  }
  
  .calculum-modal-content-custom {
    align-items: flex-start;
    background: white; //Use utility class instead.
    border-radius: 8px; // Same as cards. Use utility class instead.
    height: fit-content;
    justify-content: flex-start;
    max-height: calc(125vh * #{$zoom-compensation} - 2%);
    overflow: auto;
    padding: 1.5rem; // Same as cards. Use utility class instead.
    position: relative;
    white-space: normal;

    &-pdf-modal {
      width: 1200px !important;
      min-width: 1200px !important;
      max-width: 1200px !important;
    }
  

    p {
      font-size: 14px;
      font-weight: 400;
      line-height: 1.5;
      color: $color-gray-600;
    }

  }
}

.calculum-modal-zindex-popover {
  z-index: 1070 !important;
}

.container-buttons {
  flex: 1 0 auto;
  justify-content: end;
  gap: 1rem;
}

span.plus-circle{
  margin-right: 5px;
  display: flex;
  align-items: center;
  width: 25px;
  height: 25px;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  padding: 5px;
  color: $color-primary-500;
  font-size: 15px;
}


.inner-modal {
  padding:  16px;
}
</style>
