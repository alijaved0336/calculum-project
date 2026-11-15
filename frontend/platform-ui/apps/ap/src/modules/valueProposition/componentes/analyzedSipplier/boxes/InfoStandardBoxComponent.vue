<template>
<div class="info-box">
  <div class="title">
    <p class="font-bold third-row">{{ title }}</p>
  </div>
  <div class="value">
    <p class="font-bold">{{ data }}</p>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs } from 'vue'

export default defineComponent({
    name: 'InfoStandardBoxComponent',
    props: {
        objData: { type: Object, required: true }
    },
    setup(props) {
        const data=reactive({
            title: props.objData.title,
            data: props.objData.data,
        })
        return {
            ...toRefs(data)        }
    }
})
</script>

<style scoped>
.info-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: -6px;
}
.third-row {
    font-size: 0.58rem;
}
</style>