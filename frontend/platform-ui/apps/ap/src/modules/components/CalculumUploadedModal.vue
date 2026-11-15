<template>
<CalculumModal @close="$emit('close')" :size="'md'" :showClose="true">
  <template v-slot:modalContent>
    <div class="d-flex flex-column align-items-center">
      <iconCheckCircleFill class="icon-check ml-1 mb-2"></iconCheckCircleFill>
      <h4 class="m-0">{{ $t('global.success') }}</h4>
    </div>
    <p>{{ forEMISFileText ? $t('adminBackend.adminUploadData.emisSubtitle') : $t('adminBackend.adminUploadData.modalSubtitle') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn btn-primary font-md" @click="() => $emit('close')" style="z-index: 1; width: fit-content"> <span>{{ $t('global.continue') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import iconCheckCircle from '@/resources/assets/images/icons/iconCheckCircle.vue'
import iconCheckCircleFill from '@/resources/assets/images/icons/iconCheckCircleFill.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: "CalculumUploadedModal",
  components: {
    CalculumModal,
    iconCheckCircle,
    iconCheckCircleFill,
    iconClose,
  },
  props: {
    forEMISFileText: { type: Boolean, default: false }
  },
  emits: ['close']
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

// ? - Use utility classes
.primary-color {
  background-color: $color-primary-500 !important;
  color: #fff !important;

  &:hover {
    background-color: $primary700 !important;
  }
}

// ? - Use px
.icon-check {
  width: 6em;
  height: 6em;
}

.icon-close {
  width: 11.27px;
  height: 11.24px;
  position: absolute;
  right: 10px;
  top: 10px;
}

// ? - Use utility classes
.text-border {
  border-radius: 8px;
}

.text-padding {
  padding: 1em;
}

.text-background {
  background: $color-success-50;
}
</style>
