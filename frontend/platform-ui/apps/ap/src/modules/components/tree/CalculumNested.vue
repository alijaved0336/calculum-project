<template>
<div class="tree-container">
  <div class="tree cursor-pointer" role="list">
    <CalculumNestedItem v-for="node in items" :key="node.id" :node="node" :depth="0"></CalculumNestedItem>
  </div>
</div>
</template>

<script lang="ts">
import { CalculumTreeItem } from '../types';
import CalculumNestedItem from './CalculumNestedItem.vue';
import { defineComponent, provide } from 'vue';

export default defineComponent({
  name: 'CalculumNested',
  components: {
    CalculumNestedItem
  },
  props: {
    items: {
      type: Array as () => CalculumTreeItem[],
      required: true,
      default: () => []
    }
  },
  emits: ['selected-phase','remove-plan'],
  setup(props, { emit }) {
    interface PhaseSelectionParams {
      key: string
      value: string | number
    }
    function gettingSelectedPhase(emitParamsFromCalculumTreeSelect: PhaseSelectionParams) {
      emit('selected-phase', emitParamsFromCalculumTreeSelect)
    }
    function removePlan(emitParamsFromCalculumNestedItem: any) {
      emit('remove-plan', emitParamsFromCalculumNestedItem)
    }
    provide('getDataFromCalculumNestedItem',gettingSelectedPhase)
    provide('removePlan',removePlan)
    return {
      gettingSelectedPhase,
      removePlan
    }
  }
})

</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
.tree-container {
  font-family: Arial, sans-serif;
  min-width: 250px;
  max-width: 350px;
  cursor: pointer !important;
  padding: 0.5rem;
  right: 0.5rem;
}

.tree {
  list-style-type: none;
  padding-left: 0;
  max-height: calc(8 * 1.5em);
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 0.4rem;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background-color: $scrollbar-thumb !important;
  }
}
</style>