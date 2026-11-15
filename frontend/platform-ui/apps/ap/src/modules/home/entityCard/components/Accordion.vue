<template>
<div class="accordion">  
  <slot />
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
name: 'Accordion',
});
</script>

<style scoped>
.accordion {
  width: 100%;
}
</style>
