<template>
  <div style="max-width: 400px;">
    <whatYouGet v-if="hero === 'manageTeaser'" />
    <whatYouGetEmailNegotiation v-if="hero === 'emailNegotiations'" />
    <whatYouGetFinancing v-if="hero === 'nineBoxesFinancing'" />
    <whatYouGetEntityCardCalculator v-if="hero === 'entityCardCalculator'" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import whatYouGet from "@/resources/assets/images/teaser/manage/whatYouGet.vue";
import whatYouGetEmailNegotiation from "@/resources/assets/images/teaser/manage/whatYouGetEmailNegotiation.vue";
import whatYouGetFinancing from "@/resources/assets/images/teaser/nineBoxes/whatYouGetFinancing.vue";
import whatYouGetEntityCardCalculator from '@/resources/assets/images/teaser/entityCard/entityCardCalculatorTeaser.vue';

export default defineComponent({
  name: "WhatYouGetImage",
  components: {
    whatYouGet,
    whatYouGetEmailNegotiation,
    whatYouGetFinancing,
    whatYouGetEntityCardCalculator
  },
  props: {
    hero: { type: String, required: true }
  },
  setup() {}
});
</script>
