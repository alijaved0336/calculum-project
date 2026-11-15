<template>
  <td>
    <div
      v-if="isCompanySelected" class="d-flex align-items-center justify-content-center cursor-pointer"
    >
      <div class="options_by_entity circle_active align-items-center justify-content-center">
        <div class="red-dot"></div>
      </div>
    </div>
    <div
      v-else
      class="d-flex align-items-center justify-content-center cursor-pointer"
      @click="selectEntity"
    >
      <div class="options_by_entity circle_not_active cursor-pointer"></div>
    </div>
  </td>
</template>
<script lang="ts">
import { defineComponent, computed } from "vue";
export default defineComponent({
  name: "SelectedEntity",
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ["select-company-entity"],
  setup(props, { emit }) {
    const isCompanySelected = computed(() => {
      return props.dataItem.selected;
    });

    function selectEntity() {
      emit('select-company-entity', props.dataItem)
    }
    return {
      isCompanySelected,
      selectEntity
    };
  }
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

.circle_not_active {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid $modern-gray-200;
  width: 20px;
  height: 20px;
  background: $basewhite;
}

.circle_active {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid red;
  width: 20px;
  height: 20px;
  background: $basewhite;
}

.red-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: red;
}
</style>
