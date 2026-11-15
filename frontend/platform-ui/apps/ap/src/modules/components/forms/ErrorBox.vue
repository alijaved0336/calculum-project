<template>
<div class="p-2 rounded bg-error-50 border border-primary-300" :class="className">
  <p class="mb-1 text-sm text-error-600" v-for="msg in messages">{{ msg }}</p>
</div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ErrorBox',
  props: {
    messages: {
      type: Array,
      required: true,
    },
    className: {
      type: String,
    }
  },
  setup() {

  }
})
</script>