<template>
<div class="d-flex-flex-column">
  <div class="url-class mb-4">
    <p class="text-medium font-muted mb-0">{{ 'URL' }}</p><span class="text-gray-900 text-lg font-bold">{{ valueData.url ?? '-' }}</span>
  </div>
  <div class="phone-class mb-4">
    <p class="text-medium font-muted mb-0">{{ 'Phone' }}</p><span class="text-gray-900 text-lg font-bold">{{ valueData.phone ?? '-' }}</span>
  </div>
  <div class="country-class">
    <p class="text-medium font-muted mb-0">{{ 'Country' }}</p><span class="text-gray-900 text-lg font-bold">{{ valueData.country ?? '-' }}</span>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    name: 'CompanyDetilsComponent',
    props: {
        valueData: { type: Object, required: true }
    }
})
</script>

<style scoped lang="scss">
</style>