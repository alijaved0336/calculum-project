<template>
<div class="py-4 px-6">
  <slot name="header"></slot>

  <KTreeView @checkchange="onCheckChange" @itemclick="onCheckChange" :dataItems="treeDataItems" :expandIcons="true"
    @expandchange="onExpandChange" :ariaMultiselectable="true" :checkboxes="true" />
</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch} from 'vue';

// Types
import type { ComputedRef, PropType, Ref,  } from 'vue'
import type { KeyValue } from '@/types';

// Kendo
import {
processTreeViewItems,
handleTreeViewCheckChange,
TreeView as KTreeView,
TreeViewExpandChangeEvent,
TreeViewCheckChangeEvent
} from '@progress/kendo-vue-treeview';

type TreeViewItem = KeyValue<string, {
  value: string, // e.g. "planName"
  items: KeyValue<string, string>[] // e.g. [{ "key": "planName - phName1", "value": "phName1" }]
}>;

export default defineComponent({
name: 'TreeView',
components: {
  KTreeView
},
props: {
  items: {
    type: Array as PropType<TreeViewItem[]>,
    required: false,
    default: () => []
  },
  checkedItemsKeys: {
    type: Array as PropType<string[]>,
    default: () => []
  }
},
emits: ['checked-items-changed'],
setup(props, { emit }) {


    /**
   * ids: Holds the ids of the expanded items
   */
   const expand: Ref<{
    ids: string[];
    idField: string;
  }> = ref({
    ids: [], // ['planName1', 'planName2'],
    idField: 'text',
  });

  // *** Tree Data ***

    const initializeExpandedItems = () => {
        const allTexts: string[] = [];
        
        props.items.forEach((item) => {
          allTexts.push(item.value.value);
        });
        
        
        props.items.forEach((item) => {
          item.value.items.forEach((child) => {
            allTexts.push(child.value);
          });
        });
        
        expand.value.ids = allTexts;
      };
    
      
      watch(() => props.items, () => {
        initializeExpandedItems();
      }, { immediate: true });

  const tree = computed(() => {
    return props.items.map((item) => {
      return {
        key: item.key,
        text: item.value.value, // e.g. "planName1"
        items: item.value.items.map((item: KeyValue<string, string>) => {
          return {
            key: item.key,
            text: item.value // e.g. "planName1 - phName1"
          }
        })
      }
    })
  })

  const treeDataItems: ComputedRef<{
    key: string,
    items: { key: string, text: string }[],
    text: string
  }[]
  > = computed(() => {
    return processTreeViewItems(tree.value, {
      // select: select.value,
      check: checkDescriptorIds.value,
      expand: expand.value,
    })
  });

  // *** END Tree Data ***



  /**
   * Function for handling the change event when expanding
   *
   * @param {TreeViewExpandChangeEvent} event - the event object triggering the change
   * @return {void}
   */
  function onExpandChange(event: TreeViewExpandChangeEvent): void {
    let ids = expand.value.ids.slice();

    const index = ids.indexOf(event.item.text);

    index === -1 ? ids.push(event.item.text) : ids.splice(index, 1);

    expand.value = {
      ids,
      idField: 'text',
    };
  }

  // *** Check Management ***

  /**
   * Input check descriptor.
   * example: ['0_1', '0_2']
   */
  const checkDescriptorIds: Ref<string[]> = ref([]);

  // Init checkDescriptorIds based on props.checkedItemsKeys
  // e.g.: ["0_0"] -> "Plan 1 - 1"

  const ids: string[] = [];

  props.checkedItemsKeys.forEach((checkedItemKey) => {
    // For each tree item
    treeDataItems.value.forEach((itemLevelZero, itemLevelZeroIdx) => {
      // If all items level one are checked, then the item level zero is checked
      const itemsLevelOneCheckedCount = itemLevelZero.items.filter((itemLevelOne) => {
        return itemLevelOne.key === checkedItemKey
      }).length;

      if (itemsLevelOneCheckedCount === itemLevelZero.items.length) {
        ids.push(`${itemLevelZeroIdx}`)
      }

      // Look for item level one with key in tree. e.g.: "Plan 1 - 1"
      itemLevelZero.items.forEach((itemLevelOne, itemLevelOneIdx) => {
        if (itemLevelOne.key !== checkedItemKey) { return; }

        ids.push(`${itemLevelZeroIdx}_${itemLevelOneIdx}`)
      })
    })
  })

  checkDescriptorIds.value = ids;

  const checkedItemsKeys = computed(() => {
    const keys: string[] = [];

    // Find key given hierarchical index. e.g.: "0_0" -> "Plan 1 - 1"
    checkDescriptorIds.value.forEach(descriptorId => {
      // 1. Single Number Case: "0" (level 0 item)
      if (descriptorId.length === 1) {
        return;
      }

      // 2. Multiple Number Case: "0_0" (level 1 item)
      const [itemLevelZeroIdxRaw, itemLevelOneIdxRaw] = descriptorId.split('_');

      // Cast indexes to numbers
      const itemLevelZeroIdx = Number(itemLevelZeroIdxRaw);
      const itemLevelOneIdx = Number(itemLevelOneIdxRaw);

      const checkedItemKey: string = treeDataItems.value[itemLevelZeroIdx].items[itemLevelOneIdx].key;

      keys.push(checkedItemKey);
    })

    return keys;
  })

  function onCheckChange(event: TreeViewCheckChangeEvent) {
    const settings = {
      singleMode: false,
      checkChildren: true,
      checkParents: true,
    };

    checkDescriptorIds.value = handleTreeViewCheckChange(
      event,
      checkDescriptorIds.value, // check descriptor that will be updated
      tree.value,
      settings
    );

    emit('checked-items-changed', checkedItemsKeys.value)
  }

  // *** End Check Management ***

  return {
    onCheckChange,
    onExpandChange,
    treeDataItems,
  };
},
})
</script>