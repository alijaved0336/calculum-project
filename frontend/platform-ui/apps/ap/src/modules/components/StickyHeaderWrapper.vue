<template>
<div class="sticky-header-wrapper sticky-auto">
  <slot></slot>
</div>
</template>

<script lang="ts">
import { defineComponent} from 'vue'

export default defineComponent({
  name: 'StickyHeaderWrapper',  
})
</script>