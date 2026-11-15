<template>
<div ref="treeSelectRoot" :class="{ 'tree-select-container': !actualOrientationInverse, 'tree-select-container-left': actualOrientationInverse }">
  <div v-for="(level, levelIndex) in visibleLevels" :key="levelIndex" :class="{ 'tree-level': !actualOrientationInverse, 'tree-level-left': actualOrientationInverse }">
    <div class="tree-items">
      <div class="tree-item" v-for="item in level" :key="item.id" :class="{ 'selected': isSelected(item) }" @mouseenter="aboutItem(item)" @click="selectItem(item)">
        <div v-if="!actualOrientationInverse">
          <div class="item-content" v-if="hasChildren(item)"><span class="item-label">{{ item.label }}</span><span v-if="isExpanded(item)">{{ '<' }}</span><span v-else>{{ '>' }}</span></div>
          <div class="item-content-child" v-else><span class="item-label">{{ item.label }}</span></div>
        </div>
        <div v-else>
          <div class="item-content" v-if="hasChildren(item)"><span v-if="isExpanded(item)">{{ '<' }}</span><span v-else>{{ '>' }}</span><span class="item-label">{{ item.label }}</span></div>
          <div class="item-content-child-left" v-else><span class="item-label">{{ item.label }}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CalculumChevronRight from "@/modules/components/CalculumChevronRight.vue";
import CalculumChevronDown from "@/modules/components/CalculumChevronDown.vue";
import { CalculumTreeItem } from '../types';

export default defineComponent({
  name: 'CalculumTreeSelect',
  components: {
    CalculumChevronRight,
    CalculumChevronDown
  },
  props: {
    items: {
      type: Array as () => CalculumTreeItem[],
      required: true
    },
    maxExpectedWidth: {
      type: Number,
      default: 400
    }
  },
  emits: ['select', 'remove-plan'],
  setup(props, { emit }) {
    const treeSelectRoot = ref<HTMLElement | null>(null);
    const actualOrientationInverse = ref(false);

    const selectedItem = ref<CalculumTreeItem | null>(null)
    const expandedItems = ref<Set<string | number>>(new Set())
    const visibleLevels = computed(() => {
      const levels: CalculumTreeItem[][] = [props.items]
      let currentLevel = props.items

      while (currentLevel.some(item => isExpanded(item) && hasChildren(item))) {
        const nextLevel = currentLevel
          .filter(item => isExpanded(item) && hasChildren(item))
          .flatMap(item => item.children || [])

        if (nextLevel.length > 0) {
          levels.push(nextLevel)
          currentLevel = nextLevel
        } else {
          break
        }
      }

      return levels
    })

    const checkAndSetOrientation = () => {
      if (!treeSelectRoot.value) return;

      const rect = treeSelectRoot.value.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const requiredWidth = props.maxExpectedWidth;
      if ((rect.left + requiredWidth > viewportWidth) && (rect.left > requiredWidth)) {
        actualOrientationInverse.value = true;
      }
    };

    onMounted(() => {
      requestAnimationFrame(() => {
        checkAndSetOrientation();
      });
      window.addEventListener('resize', checkAndSetOrientation);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', checkAndSetOrientation);
    });

    function hasChildren(item: CalculumTreeItem): boolean {
      return Boolean(item.children?.length)
    }

    function isExpanded(item: CalculumTreeItem): boolean {

      return expandedItems.value.has(item.id)
    }

    function isSelected(item: CalculumTreeItem): boolean {

      return selectedItem.value?.id === item.id
    }

    function aboutItem(item: CalculumTreeItem) {

      if (hasChildren(item)) {
        expandedItems.value.clear();
        expandedItems.value.add(item.id);
      } else if (!hasChildren(item) && item.level === 1) {
        if (selectedItem.value && selectedItem.value.id !== item.id) {
          expandedItems.value.delete(selectedItem.value.id);
        }
        expandedItems.value.add(item.id);
      }
      selectedItem.value = item
    }
    function selectItem(item: CalculumTreeItem) {
      if (!hasChildren(item)) {
        if (item.id === 'remove-plan') {
          const emitParams = {
            key: 'removeSpendToPhases',
            value: item.id,
          }
          emit('remove-plan', emitParams)
        } else if (item.level && item.level > 1) {
          const emitParams = {
            key: 'moveSpendToPhases',
            value: item.id,

          }
          emit('select', emitParams)
        }
      }
    }
    return {
      treeSelectRoot,
      actualOrientationInverse,
      visibleLevels,
      hasChildren,
      isExpanded,
      isSelected,
      selectItem,
      aboutItem
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";

.tree-select-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  padding: 0.5rem;
}

.tree-select-container-left {
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row-reverse;
  gap: 0.5rem;
  padding: 0.5rem;
}

.tree-level {
  min-width: 120px;
  border-right: 1px solid #e0e0e0;

  &:last-child {
    border-right: none;
  }
}

.tree-level-left {
  min-width: 135px;
  border-right: 1px solid #e0e0e0;

  &:first-child {
    border-right: none;
  }
}

.tree-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: calc(8 * 1.5em);
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 0.4rem;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background-color: $scrollbar-thumb !important;

    &:hover {
      cursor: pointer !important;
    }
  }
}

.tree-item {
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
    cursor: pointer !important;
  }

  &.selected {
    background-color: #e3f2fd;
  }
}

.item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer !important;
}

.item-content-child {
  display: flex;
  align-items: start;
  padding-right: 20px;
  cursor: pointer !important;
}

.item-content-child-left {
  display: flex;
  align-items: center;
  cursor: pointer !important;
}

.item-icon {
  font-size: 0.8rem;
  color: #666;
}
</style>