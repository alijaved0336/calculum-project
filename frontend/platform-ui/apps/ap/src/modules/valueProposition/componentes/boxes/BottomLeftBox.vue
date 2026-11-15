<template>
<div class="info-box suppliers-box">
  <p class="text-white font-medium text-base pb-3">{{ titleShow }} </p>
  <h2 class="font-weight-bold text-white">{{ valueDataShow }}</h2>
  <div class="confidence-score">
    <p class="text-white font-medium text-base mb-0">{{ confidenceScoreShow }}</p>
    <h2 class="font-weight-bold text-white">{{ levelShow }}</h2>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'

export default defineComponent({
    name: 'BottomLeftBox',
    props: {
        title: { type: String, required: true },
        valueData: { type: String, required: true },
        confidenceScore: { type: String, required: true },
        level: { type: String, required: true },
    },
    setup(props) {
        const titleShow = computed(() => props.title)
        const valueDataShow = computed(() => props.valueData)
        const confidenceScoreShow = computed(() => props.confidenceScore)
        const levelShow = computed(() => props.level)

        return { titleShow, valueDataShow,confidenceScoreShow,levelShow }
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

.suppliers-box {
  background-color: #FF2C4F;
  color: white;
  text-align: center;
}
.info-box h2 {
  font-size: 2.5rem;
}

.info-box p {
  font-size: 0.9rem;
}

.confidence-score {
  background-color: rgba(0,0,0,0.1);
  border-radius: 4px;
  padding-top: 6px;
  padding-left: 6px;
}

</style>