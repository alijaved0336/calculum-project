<template>
<div class="d-flex flex-column text-center gap-2 icons-in-home"><a class="home-icons-datas"><span class="icon-svg-sidebar" :class="icon"></span></a><span class="text-base font-bold" v-if="title">{{ title }}</span><span class="text-sm font-medium text-gray-500" v-if="message">{{ message }}</span></div>
</template>
<script>

import { defineComponent } from 'vue'
export default defineComponent({
    name: 'NoDataAvailable',
    props: {
        title: { type: String, required: false, default: 'No Data Available' },
        icon: { type: String, required: true, default: 'icon-categorize' },
        message: { type: String, required: true, default: null }    
    },
    setup( props ) {
    }
})
</script>

<style scoped>


.icons-in-home {
  align-items: center;
}

a.home-icons-datas {
    text-decoration: none;
    cursor: unset;
    border-bottom: 1px solid transparent;
    color: #667085;
    transition: all 0.3s ease;
    pointer-events: none;
    padding: 8px 8px 0px 8px;
    text-align: center;
    justify-content: center;
    background: #F2F4F7;
    border-radius: 8px;
}




</style>