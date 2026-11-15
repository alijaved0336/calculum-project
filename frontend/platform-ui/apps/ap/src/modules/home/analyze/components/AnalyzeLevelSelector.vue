<template>
<div class="d-flex align-items-center custom-gap"><span class="custom_cursor_pointer level-tab mx-auto" @click="setSelectedLevel('spend')" :class="selectedLevel === 'spend' ? 'active ' : ''">{{ $t('global.spends')}}</span><span class="custom_cursor_pointer level-tab mx-auto" @click="setSelectedLevel('supplier')" :class="selectedLevel === 'supplier' ? 'active' : ''">{{$t('global.suppliers')}}</span><span class="custom_cursor_pointer level-tab mx-auto" @click="setSelectedLevel('parent')" :class="selectedLevel === 'parent' ? 'active' : ''">{{$t('global.ultimateParent')}} </span></div>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive } from 'vue'

export default defineComponent({
  name: "AnalyzeLevelSelector",
  props: {
    selectedLevel: { type: String, required: true }
  },
  emits: ['selectedLevelChanged'],
  setup(props, { emit }) {

    interface AnalyzeLevelSelector {
      selectedLevel: string
    }

    const data = reactive<AnalyzeLevelSelector>({
      selectedLevel: props.selectedLevel
    })

    /**
     * Set selected level
     * 
     * @param level {string}
     */
    function setSelectedLevel(level: string) {
      data.selectedLevel = level
      emit('selectedLevelChanged', level)
    }

    return {
      ...toRefs(data),
      setSelectedLevel
    }

  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

@media only screen and (min-width: 2100px) {
  .level-container {
    width: 800px;
    border: 4px solid red;
  }
}

.custom-gap {
  gap: 1rem;
}

.level-container {
  width: fit-content;
  border: 1px solid $color-gray-400;
  border-radius: 8px;
}

.label-text {
  font-size: 14px;
  font-weight: 400;
  margin-right: 16px;
}

.level-tab {
  margin: 0;
  font-size: .8rem;
  padding: .8em;
  color: $color-gray-400;
  font-weight: 400;
}

.active {
  color: $color-primary-500;
  font-weight: 600;
  border-bottom: 3px solid $color-primary-500;
}
</style>