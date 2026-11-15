<template>
<span class="text-capitalize font-weight-bold text-as-logo-circle">{{ letter }}</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    props:
    {
        letter: { type: String, required: true, default: '?' }
    }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.text-as-logo-circle {
    width: 150px;
    height: 150px;
    border-radius: 100%;
    background: $color-gray-300;
    border-width: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4.5rem;
}
</style>