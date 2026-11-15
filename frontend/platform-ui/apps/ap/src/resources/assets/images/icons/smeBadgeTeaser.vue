<template>
  <span class="sme-badge-teaser">
    <SmeBadgeExcluded v-bind="$attrs" />
    <span class="sme-badge-teaser__watermark">ADD-ON</span>
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SmeBadgeExcluded from '@/resources/assets/images/icons/SmeBadgeExcluded.vue';

export default defineComponent({
  name: 'SmeBadgeTeaser',
  components: { SmeBadgeExcluded },
  inheritAttrs: false,
});
</script>

<style scoped>
.sme-badge-teaser {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sme-badge-teaser__watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-20deg);
  font-size: 1.6em;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(180, 40, 40, 0.45);
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.6);
}
</style>
