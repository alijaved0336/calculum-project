<template>
  <div :id="`custom-menu-options-${groupIndex}`">
    <kbutton ref="button">
      <span
        :id="'myId-' + index"
        class="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
        @click="showMoreSettings = !showMoreSettings"
      >
        {{ $t('global.moreSettings') }}
        <CalculumChevronDown
          v-if="!showMoreSettings"
          class="chevrons"
        />
        <CalculumChevronUp
          v-if="showMoreSettings"
          class="chevrons"
        />
      </span>
    </kbutton>
    <Popup
      :anchor="'button'"
      :show="showMoreSettings"
      :popup-class="'show-more-settings'"
      class="show-more-container"
    >
      <div class="d-flex flex-column p-4">
        <span>{{ title }}</span>
        <div
          v-for="(level, index) in levels"
          :key="index"
          class="d-flex align-items-center p-1"
        >
          <input
            type="radio"
            class="radio-btn"
            :checked="levelSelected === level.key"
            @input="changeValue(level.key)"
          >
          <span
            class="ml-2 cursor-pointer ml-2 text-sm font-normal text-gray-900 "
            @click="changeValue(level.key)"
          >
            {{ level.value }}
          </span>
        </div>
      </div>
    </Popup>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive, onMounted, onUnmounted, PropType } from 'vue'
import { Popup } from '@progress/kendo-vue-popup';
import CalculumChevronDown from '@/modules/components/CalculumChevronDown.vue';
import CalculumChevronUp from '@/modules/components/CalculumChevronUp.vue';

export default defineComponent({
  name: 'PopupComonent',
  components: {
    CalculumChevronDown,
    CalculumChevronUp,
    Popup
  },
  props: {
    groupIndex: { type: Number, required: true },
    levels: { type: Array as PropType<{ key: string, value: string }[]>, required: true },
    title: { type: String, required: true },
    levelSelected: { type: String, required: true }
  },
  emits: ['change-behavior-level'],
  setup(props, { emit }) {

    interface PopupComponent {
      showMoreSettings: boolean,
      index: number
    }

    const popupData = reactive<PopupComponent>({
      showMoreSettings: false,
      index: props.groupIndex
    })


    /**
     * Change the value of the behavior level.
     *
     * @param {string} level - the new behavior level
     * @return {void} 
     */
    function changeValue(level: string) {
      emit('change-behavior-level', props.groupIndex, level)
    }

    /**
     * Returns a function that handles the menu popup event for a specific group index.
     *
     * @param {number} groupIndex - The index of the group.
     * @return {Function} - The event handler function.
     */
    function menuPopup(groupIndex: number) {

      return function (e: any) {
        if (e.target.closest(`#myId-${groupIndex}`) || e.target.closest(`custom-menu-options-${groupIndex}`)  || e.target.closest('.chevrons') ) {
          return;
        }

        if (e.target.closest(`custom-menu-options-${groupIndex}`) !== null) {
          popupData.showMoreSettings = true;
        }

        if (e.target.closest(`custom-menu-options-${groupIndex}`) === null) {
          popupData.showMoreSettings = false;

        }
      }
    }

    onMounted(() => {
      document.body.addEventListener('click', menuPopup(props.groupIndex));

    })

    onUnmounted(() => {
      document.body.addEventListener('click', menuPopup(props.groupIndex));

    })

    return {
      ...toRefs(popupData),
      changeValue,
    }
  },
})
</script>