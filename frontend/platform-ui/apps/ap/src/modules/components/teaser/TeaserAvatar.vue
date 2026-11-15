<template>
  <img
    v-if="avatar === 'manageTeaser'"
    class="mr-1"
    src="@/resources/assets/images/teaser/manage/manageTeaserAvatar.png"
    alt="Person's Avatar"
  />
  <img
    v-if="avatar === 'emailNegotiations'"
    class="mr-1"
    src="@/resources/assets/images/teaser/manage/emailNegotiationsAvatar.png"
    alt="Person's Avatar"
  />
  <img
    v-if="avatar === 'nineBoxesFinancing'"
    class="mr-1"
    src="@/resources/assets/images/teaser/nineBoxes/nineBoxesFinancingAvatar.png"
    alt="Person's Avatar"
  />
  <img
    v-if="avatar === 'entityCardCalculator'"
    class="mr-1"
    src="@/resources/assets/images/teaser/entityCard/sarah-collins-testimonial.png"
    alt="Person's Avatar"
  />
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "TeaserAvatar",
  props: {
    avatar: { type: String, required: true }
  },
  setup() {}
});
</script>
