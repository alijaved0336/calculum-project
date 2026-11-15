<template>
<div class="d-flex justify-content-between">
  <div class="d-flex align-items-center justify-content-center">
    <h6 class="font-medium">Selected: {{ selectedItems.length }}</h6>
  </div>
  <div class="dropdown-edit-program-container" ref="dropdownContainer" :class="{ 'disabled': selectedItems.length === 0 }" :style="{ justifyContent: isOverflowing ? 'flex-start' : 'center' }">
    <CalculumDropdownEditProgramOption :hasHarmonization="hasHarmonization" :hasFinancing="hasFinancing" :selectedProgramId="selectedProgramId"></CalculumDropdownEditProgramOption>
  </div>
  <div class="d-flex justify-content-center">
    <button class="custom-button-excluded edit-btn font-md ml-2" id="btn-exluded-edit-mode" :size="'small'" :fill-mode="null" :rounded="null" :shape="null" @click="toggleExcludeInclude">{{ textIncludeExclude }}</button>
  </div>
</div>
</template>

<script lang="ts">
import {
  defineComponent,
  PropType,
  reactive,
  toRefs,
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { Button } from "@progress/kendo-vue-buttons";
import CalculumDropdownEditProgramOption from "@/modules/components/utils/CalculumDropdownEditProgramOption.vue";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";

export default defineComponent({
  name: "EditOptionProgram",
  components: {
    KButton: Button,
    CalculumDropdownEditProgramOption,
  },
  props: {
    selectedItems: {
      type: Array as PropType<any[]>,
      required: true,
    },
    hasHarmonization: { type: Boolean, required: false, default: false },
    hasFinancing: { type: Boolean, required: false, default: false },
    selectedProgramId: { type: String, required: true },
  },
  setup(props) {
    const gridMenuActionsStore = useGridMenuActionsStore();
    const dropdownContainer = ref<HTMLElement | null>(null);
    const isOverflowing = ref(false);

    const checkOverflow = () => {
      if (dropdownContainer.value) {
        isOverflowing.value =
          dropdownContainer.value.scrollWidth >
          dropdownContainer.value.clientWidth;
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    onMounted(() => {
      nextTick(() => {
        checkOverflow();
        if (dropdownContainer.value) {
          resizeObserver = new ResizeObserver(checkOverflow);
          resizeObserver.observe(dropdownContainer.value);
          mutationObserver = new MutationObserver(checkOverflow);
          mutationObserver.observe(dropdownContainer.value, {
            childList: true,
            subtree: true,
          });
        }
      });
    });

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    });

    const data = reactive({
      textIncludeExclude: "Show Excluded",
    });

    function toggleExcludeInclude() {
      const isHiding = data.textIncludeExclude === "Hide Excluded";
      data.textIncludeExclude = isHiding ? "Show Excluded" : "Hide Excluded";

      // Apply filter via store: "No" to hide excluded items, null to show all
      gridMenuActionsStore.setDisabledFilter(isHiding ? "No" : null);
    }
    return {
      ...toRefs(data),
      toggleExcludeInclude,
      dropdownContainer,
      isOverflowing,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
.dropdown-edit-program-container {
  display: flex;
  flex-direction: row;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap !important;
  flex-wrap: nowrap !important;
  max-width: 82%;
  width: 82%;
  justify-content: center;
  padding-bottom: 8px;

  &::-webkit-scrollbar {
    height: 0.7rem;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: $scrollbar-thumb !important;

    &:hover {
      cursor: pointer;
    }
  }
}

.disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}
.custom-button-excluded{
    position: relative;
    outline: none;
    background: #ffffff;
    padding: 0.375rem 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    color: #495057;
    white-space: nowrap;
    height: 41px;
    &:hover {
        border-color: #667085;
    }
}
</style>
