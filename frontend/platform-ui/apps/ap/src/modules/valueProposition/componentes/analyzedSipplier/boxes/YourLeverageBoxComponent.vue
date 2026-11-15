<template>
<div class="d-flex-flex-column justify-content-between align-items-center">
  <p class="text-gray-900 text-lg font-bold mb-3">{{ title }}</p>
</div>
<div class="info-box"><span class="text-4xl font-bold">{{ valueData }}</span></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    name: 'YourLeverageBoxComponent',
    props: {
        title: { type: String, required: true },
        valueData: { type: String, required: true }
    }
})
</script>

<style scoped>
.info-box {
    font-size: 3.25rem !important;
    line-height: 3.5rem;
}
</style>