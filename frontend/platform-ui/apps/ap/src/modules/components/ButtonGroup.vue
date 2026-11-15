<template>
  <div class="button-group mb-4">
    <button
      v-for="item in items"      
      :key="item.key"
      :class="getClassesByItemKey(item.key)"      
      type="button"
      class="button-group-item transition-colors"
      @click="setActiveItemKey(item.key)"
    >
      {{ item.value }}
    </button>
  </div>
</template>
<script lang="ts">
import {
  defineComponent,
  reactive,
  toRefs,
  watch
} from 'vue';

// Types
import type { ButtonsGroupOptions } from './types';
import type { KeyValue } from "@/types";
import type { PropType } from 'vue';

// Utils
import { StringUtils } from '@/utils';

export default defineComponent({
  name: "ButtonGroup",
  components: {},
  props: {
    items: { type: Object as PropType<KeyValue[]>, required: false, default: () => [] },
    options: {
      type: Object as PropType<Partial<ButtonsGroupOptions>>, default: () => { }
    }
  },
  emits: ["active-item-changed"],
  setup(props, { emit }) {
    interface Data {
      activeItemKey: string
    }

    const data = reactive<Data>({
      activeItemKey: props.options.activeItemKey ?? ""
    });

    /**
     * Get classes given an item key.
     *
     * @param key {string}
     */
    function getClassesByItemKey(key: string): string {
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(key)) {
        if (import.meta.env.DEV) console.error("** (getClassesByItemKey) key is null or undefined or empty.");

        return "";
      }

      // Add active item classes
      if (key === data.activeItemKey) {
        return "active";
      }

      return "";
    }

    /**
     * Set active item key
     *
     * @param key {string}
     */
    function setActiveItemKey(key: string) {
      data.activeItemKey = key;
      emit("active-item-changed", key);
    }

    watch(props, () => {
      data.activeItemKey = props.options.activeItemKey ?? ''
    })

    return {
      ...toRefs(data),
      getClassesByItemKey,
      setActiveItemKey
    };
  },
});
</script>