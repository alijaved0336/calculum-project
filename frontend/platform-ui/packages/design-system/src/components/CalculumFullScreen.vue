<template>
<div class="calculum-full-screen" id="the-full-screen">
  <div class="row calculum-full-screen-title d-flex justify-content-between">
    <div class="col-3">
      <h4 v-if="!hideTitle">{{ title }}</h4>
    </div>
    <div class="col-8">
      <slot name="fullScreenHeader"></slot>
    </div>
    <div class="d-flex justify-content-end"><i v-if="!hideCloseButton" class="fa-solid fa-xmark calculum-full-screen-close" @click="close"></i></div>
  </div>
  <div class="row calculum-full-screen-content ok">
    <slot name="fullScreenContent"></slot>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'CalculumFullScreen',
  props: {
    title: { type: String, required: true },
    hideCloseButton: { type: Boolean, required: false, default: false },
    hideTitle: { type: Boolean, required: false, default: false },
  },
  emits: ['closeFullScreen'],
  setup (props, { emit }) {
    function close () {
      emit('closeFullScreen', false)
    }
    return {
      close
    }
  }
})
</script>

<style scoped lang="scss">
// $zoom-compensation matches AP's global html zoom of 0.67 (1 / 0.67 ≈ 1.4925).
// Inlined here (not imported from AP's variables) since this component is shared
// across apps that may not apply the same zoom.
$zoom-compensation: 1.4925;

html, body {
  overflow: hidden;
}
.calculum-full-screen {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1050;
  background: white;
  width: calc(100vw * #{$zoom-compensation});
  height: calc(100vh * #{$zoom-compensation});
  overflow-y: auto !important;
  overflow-x: hidden;
  .calculum-full-screen-title {
    padding: 20px;
    .calculum-full-screen-close {
      font-size: 1.125rem;
      cursor: pointer;
    }
  }
  .calculum-full-screen-content {
    overflow-y: auto;
  }
}
</style>
