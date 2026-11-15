<template>
  <span class="sme-badge-excluded">
    <SmeBadge v-bind="$attrs" />
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SmeBadge from '@/resources/assets/images/icons/smeBadge.vue';

export default defineComponent({
  name: 'SmeBadgeExcluded',
  components: { SmeBadge },
  inheritAttrs: false,
});
</script>

<style scoped>
.sme-badge-excluded {
  display: contents;
}
.sme-badge-excluded > * {
  filter: grayscale(1) brightness(1.6) opacity(0.45);
}
</style>
