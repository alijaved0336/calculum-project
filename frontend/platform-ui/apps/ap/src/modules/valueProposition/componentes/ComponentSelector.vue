<template>
<div class="component-selector-container" v-if="showOptions" @click.self="$emit('close')">
  <div class="d-flex component-selector">
    <div class="d-flex component-selector-title justify-content-between"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ 'MENU ADD CONTENT' }}</span><span class="cursor-pointer" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></span></div>
    <template v-for="content in contentTypes" :key="content.id">
      <div class="d-flex flex-column component-selector-options"><span>{{ content.label }}</span>
        <ul class="d-flex flex-column component-selector-options-child">
          <li v-for="option in content.children" :key="option.type"><a @click="sendAction(option)"><span class="text-base" @click="sendAction(option)">{{ option.title }}</span></a></li>
        </ul>
      </div>
    </template>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'
import { CatalogType, ContentTypes } from '../types'

export default defineComponent({
    name: 'ComponentSelector',
    props: {
        show: { type: Boolean, default: false },
        sectionId: { type: String, default: '' },
        contentTypes: { type: Array as PropType<CatalogType[]>, default: () => [] },
    },
    emits: ['close', 'add-content'],
    setup(props, { emit }) {
        const showOptions = computed(() => props.show)
        const sendAction = (option: ContentTypes) => {
            emit('add-content', option.type)
        }
        
        return {
            showOptions, sendAction
        }
    }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
.component-selector-container {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 98;
}


.component-selector {
    position: absolute;
    top: 0;
    left: auto;
    background-color: white;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 20%;
    z-index: 99;
    height: 100vh;
    box-shadow: 0px 0px 10px 0px rgba(34, 60, 80, 0.2);

    a {
        color: #000;
        font-size: 0.75rem !important;
        line-height: 1rem;
        font-weight: 400;
    }
}


.component-selector-title {
    padding: 12px 12px;
    border-bottom: 1px solid #d1d1d1;
}

.component-selector-options {
    padding: 0px 12px;
    gap: 8px;
}
.component-selector-options-child {
    padding: 0px 12px;
    // gap: 8px;
}
</style>