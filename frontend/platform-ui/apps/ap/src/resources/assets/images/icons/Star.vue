<template>
  <!-- Solid -->
  <svg v-if="variant === ICON_VARIANTS.solid" @click="$emit('click')" :class="classes" viewBox="0 0 44 44">
    <path
      d="m17.854 1.3914-4.8822 10.342-10.923 1.6639c-1.9589 0.2968-2.7439 2.8199-1.3234 4.2651l7.9028 8.0459-1.8692 11.366c-0.33645 2.0545 1.7346 3.5933 3.4692 2.6325l9.7719-5.3665 9.7719 5.3665c1.7346 0.953 3.8056-0.578 3.4692-2.6325l-1.8692-11.366 7.9028-8.0459c1.4206-1.4452 0.6355-3.9683-1.3233-4.2651l-10.923-1.6639-4.8822-10.342c-0.8748-1.8435-3.4093-1.867-4.2916 0z" />
  </svg>

  <!-- Regular (default) -->
  <svg v-else @click="$emit('click')" :class="classes" fill="none" viewBox="0 0 44 44">
    <path
      d="m18.968 2.9729-2e-4 3.6e-4 -4.6595 9.8707-10.407 1.5852c-2.8077 0.4255-3.8145 3.9473-1.8755 5.9203l2.8e-4 3e-4 7.554 7.6908-1.7884 10.875-1.1e-4 6e-4c-0.45317 2.7672 2.3766 5.0501 4.9093 3.6486 4e-4 -2e-4 9e-4 -5e-4 0.0014-8e-4l9.2972-5.1058 9.3002 5.1075s1e-4 0 1e-4 1e-4c2.5262 1.3877 5.362-0.8753 4.9076-3.6496l-1e-4 -6e-4 -1.7884-10.875 7.554-7.6908 3e-4 -3e-4c1.939-1.973 0.9321-5.4948-1.8755-5.9203l-10.407-1.5852-4.6595-9.8707-9e-4 -0.00178c-1.2236-2.5788-4.8215-2.6247-6.0625 0.00142z"
      fill="#F9FAFB" stroke="#EAECF0" stroke-width="1.9594" />
  </svg>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Star',
  props: {
    variant: { type: String, required: false, default: 'regular' },
    classes: { type: Array, required: false, default: [] }
  },
  emits: ['click'],
  setup() {
    const ICON_VARIANTS = {
      regular: 'regular',
      solid: 'solid'
    }

    return {
      ICON_VARIANTS,
    }
  }
})
</script>