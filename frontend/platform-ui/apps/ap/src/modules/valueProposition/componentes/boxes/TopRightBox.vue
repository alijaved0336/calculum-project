<template>
<div class="info-box">
  <p class="text-lg font-semibold mb-2">{{ titleShow }}</p>
  <h2 class="font-weight-bold">{{ valueDataShow }}</h2>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'

export default defineComponent({
    name: 'TopRightBox',
    props: {
        title: { type: String, required: true },
        valueData: { type: String, required: true }
    },
    setup(props) {
        const titleShow = computed(() => props.title)
        const valueDataShow = computed(() => props.valueData)
        return { titleShow, valueDataShow }
    }
})
</script>

<style scoped>
.info-box {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    text-align: center;
    margin-bottom: 20px;
    height: 180px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.info-box h2 {
    font-size: 2.5rem;
}

.info-box p {
    font-size: 0.9rem;
}
</style>