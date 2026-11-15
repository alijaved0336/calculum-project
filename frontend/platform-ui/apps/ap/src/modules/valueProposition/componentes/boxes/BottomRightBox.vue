<template>
<div class="info-box opportunity-box">
  <p class="text-white font-medium text-base mb-1">{{ cashFlowTitleShow }}</p>
  <h2 class="font-weight-bold text-white">{{ cashFlowShow }}</h2>
  <div class="confidence-score">
    <p class="text-white font-medium text-base mb-1">{{ opportunityTitleShow }}</p>
  </div>
  <h2 class="font-weight-bold text-white">{{ opportunityShow }}</h2>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'

export default defineComponent({
    name: 'BottomRightBox',
    props: {
      cashFlowTitle: { type: String, required: true },
      cashFlow: { type: String, required: true },
      opportunityTitle: { type: String, required: true },
      opportunity: { type: String, required: true },
    },
    setup(props) {
        const cashFlowTitleShow = computed(() => props.cashFlowTitle)
        const cashFlowShow = computed(() => props.cashFlow)
        const opportunityTitleShow = computed(() => props.opportunityTitle)
        const opportunityShow = computed(() => props.opportunity)

        return { cashFlowTitleShow, cashFlowShow,opportunityTitleShow,opportunityShow }
    }
})
</script>

<style scoped>
.info-box {
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.opportunity-box {
  background-color: #475467;
  color: white;
}

.info-box h2 {
  font-size: 2.5rem;
}

.info-box p {
  font-size: 0.9rem;
}
.confidence-score {
  background-color: transparent;
  border-radius: 4px;
  padding-top: 6px;
  padding-left: 6px;
}
</style>