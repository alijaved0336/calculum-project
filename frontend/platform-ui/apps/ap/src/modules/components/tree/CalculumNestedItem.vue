<template>
<div class="tree-node cursor-pointer" role="listitem">
  <div class="node-content" @click="toggleExpand"><span class="toggle-icon cursor-pointer" v-if="hasChildren || (node.level && node.level <= 1)">     <img class="img-icon plan-icon mr-2" :src="fontIcons.plan" alt="plan icon"/></span><span class="toggle-icon cursor-pointer" v-else>
      <IconPlanPhase size-height="13" size-width="14"></IconPlanPhase></span><span class="node-label cursor-pointer">{{ node.label }}</span></div>
  <div class="tree-children" role="list" v-if="isExpanded && hasChildren">
    <CalculumNestedItem v-for="child in node.children" :key="child.id" :node="child" :depth="depth + 1"></CalculumNestedItem>
  </div>
</div>
</template>

<script lang="ts">
import { ref, computed, defineComponent, inject } from 'vue';
import IconPlanPhase from "@/resources/assets/images/icons/IconPlanPhase.vue";
// Icons
import { fontIcons } from "@/resources/assets/assets";
import { CalculumTreeItem } from '../types';
export default defineComponent({
  name: 'CalculumNestedItem',
  components: {
    IconPlanPhase
  },
  props: {
    node: {
      type: Object as () => CalculumTreeItem,
      required: true
    },
    depth: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const isExpanded = ref(false);
    const hasChildren = computed(() => props.node.children && props.node.children.length);
    type EventHandler = (data: any) => void
    const toggleExpand = () => {
      if (hasChildren.value) {
        isExpanded.value = !isExpanded.value;
      } else {
        selectItem(props.node);
      }
    };
    const sendToParent = inject<EventHandler>('getDataFromCalculumNestedItem')
    const removePlanToParent = inject<EventHandler>('removePlan')

    function selectItem(item: CalculumTreeItem) {
      if('remove-plan' === item.id) {
        if (removePlanToParent) {
          removePlanToParent(item)
        }
      }else if (item.level && item.level > 1) {
        const emitParams = {
          key: 'moveSpendToPhases',
          value: item.id
        }
        if (sendToParent) {
          sendToParent(emitParams)
        }
      }
    }


    return {
      isExpanded,
      hasChildren,
      toggleExpand,
      fontIcons,
      selectItem
    }
  }
})


</script>

<style scoped>
.tree-node {
  margin: 5px 5px 5px 5px;
  cursor: pointer;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 4px;
}

.node-content:hover {
  background-color: #f0f0f0;
}

.toggle-icon {
  display: inline-block;
  width: 20px;
  text-align: center;
  font-weight: bold;
}

.node-label {
  margin-left: 1px;
}

.tree-children {
  list-style-type: none;
  padding-left: 10px;
  transition: all 0.3s ease;
}

img.img-icon.plan-icon {
  width: 14px;
}
</style>
